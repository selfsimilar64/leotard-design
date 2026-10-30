// The Mirror toggle (doc.symmetry, default on) and paired parts. Every edit the interface makes runs
// through sym.edit: with Mirror on it reaches both sides of a pair; with Mirror off, an edit of one
// paired part first splits the pair into two independent parts, in the same undo step. The toggle
// itself changes nothing already on the leotard. Scripts calling the plain commands are unaffected.
//
// What a pair is, by kind:
//   curves, panels   one record with mirror: 'both' (its other side is derived, curve id + '~m')
//   straps           paired through their path line
//   stones           mirror: 'both'; or following a paired line or piece (no `side`); or two records
//                    linked by `pair` (the two halves of a group whose line or piece was split)
//   decals           two records linked by `pair`
// Split curves and panels keep `twin`: not a pair, only where the mirror image of something attached
// to one now lives (garment/build.js evaluateAll, stones/generators.js scatter).
// Spec: knowledge/engineering/architecture/mirror-toggle.md.
import { defineCommand } from './store.js';
import { mirrorSP } from '../curves/points.js';
import { fromSP, toSP } from '../body/surface.js';
import { flipPatternParams } from '../stones/pattern.js';

export const symmetryOn = (doc) => doc.symmetry !== false;

// op -> [list, the argument naming the part]
const TARGETS = {
	'curve.set': ['curves', 'id'], 'curve.points': ['curves', 'id'], 'curve.movePoint': ['curves', 'id'], 'curve.insertPoint': ['curves', 'id'],
	'curve.removePoint': ['curves', 'id'], 'curve.setKind': ['curves', 'id'], 'curve.remove': ['curves', 'id'], 'trim.set': ['curves', 'on'], 'band.add': ['curves', 'on'],
	'panel.set': ['panels', 'id'], 'panel.cut': ['panels', 'id'], 'panel.restore': ['panels', 'id'],
	'strap.set': ['straps', 'id'], 'strap.remove': ['straps', 'id'],
	'stones.set': ['stones', 'id'], 'stones.remove': ['stones', 'id'], 'stones.release': ['stones', 'id'],
	'decal.set': ['decals', 'id'], 'decal.remove': ['decals', 'id'],
};
export function targetOf(cmd) {
	const t = TARGETS[cmd.op];
	if (!t || typeof cmd[t[1]] !== 'string') return null;
	return { list: t[0], key: t[1], id: cmd[t[1]] };
}
// a new name is not a change to the leotard: it never splits a pair
const onlyRenames = (cmd, key) => Object.keys(cmd).every((k) => k === 'op' || k === key || k === 'name' || k === 'gesture');

const curveOf = (doc, id) => doc.curves.find((c) => c.id === id);
const panelOf = (doc, id) => doc.panels.find((p) => p.id === id);
function stonesHostPaired(doc, g) {
	if (g.side || g.followMirror === false) return false;
	if (g.on?.curve) return curveOf(doc, g.on.curve)?.mirror === 'both';
	if (g.on?.panel) return panelOf(doc, g.on.panel)?.mirror === 'both';
	if (g.on?.strap) return curveOf(doc, doc.straps.find((s) => s.id === g.on.strap)?.path)?.mirror === 'both';
	return false;
}
export function isPaired(doc, list, id) {
	const o = doc[list].find((x) => x.id === id);
	if (!o) return false;
	if (list === 'curves' || list === 'panels') return o.mirror === 'both';
	if (list === 'straps') return curveOf(doc, o.path)?.mirror === 'both';
	if (list === 'stones') return !!(o.pair && doc.stones.some((x) => x.id === o.pair)) || o.mirror === 'both' || stonesHostPaired(doc, o);
	if (list === 'decals') return !!(o.pair && doc.decals.some((x) => x.id === o.pair));
	return false;
}

// --- splitting ------------------------------------------------------------------------------------

// wearer's left is +x
const sideOfX = (x) => (x >= 0 ? 'left' : 'right');
const otherSide = (s) => (s === 'left' ? 'right' : 'left');
const SIDE_WORD = { left: 'left', right: 'right' };
const named = (name, side) => (name ? `${name} (${SIDE_WORD[side]})` : name);
// a row or fringe on the mirror image runs the other way round: its offset and side change sign
// (a pattern's own place, turn and gradient too: stones/pattern.js)
function flipParams(p, whole = false) {
	if (!p) return p;
	const out = flipPatternParams(p, whole);
	if (typeof out.offset === 'number') out.offset = -out.offset;
	if (out.side === 'left' || out.side === 'right') out.side = otherSide(out.side);
	return out;
}

// Stones on a part that has just been split: a group on one side goes with that side's part; a
// group on both becomes two halves that stay linked (the group itself was not edited).
function splitHosted(tx, match, on2, side2) {
	for (const g of tx.doc.stones.slice()) {
		if (!match(g) || g.followMirror === false) continue;
		if (g.side) {
			if (g.side === side2) tx.set(['stones', g.id, 'on'], on2);
			tx.set(['stones', g.id, 'side'], undefined);
			continue;
		}
		const id = tx.newId('g');
		tx.insert('stones', { ...structuredClone(g), id, on: on2, mirror: 'none', pair: g.id, params: flipParams(g.params, g.kind === 'pattern') });
		tx.set(['stones', g.id, 'mirror'], 'none');
		tx.set(['stones', g.id, 'pair'], id);
	}
}

function splitCurve(tx, c) {
	const surf = tx.ctx.surf;
	const x = c.points.reduce((a, p) => a + surf.pos(fromSP(p.sp)).x, 0);
	const side = sideOfX(x), side2 = otherSide(side), id = tx.newId('c');
	const points = c.points.map((p) => {
		const q = { ...structuredClone(p), sp: toSP(mirrorSP(fromSP(p.sp), surf)) };
		if (p.on) { q.on = { ...p.on }; if (p.on.mirror) delete q.on.mirror; else q.on.mirror = true; }
		return q;
	});
	tx.insert('curves', { ...structuredClone(c), id, mirror: 'none', name: named(c.name, side2), twin: c.id, points });
	tx.set(['curves', c.id, 'mirror'], 'none');
	tx.set(['curves', c.id, 'twin'], id);
	if (c.name) tx.set(['curves', c.id, 'name'], named(c.name, side));
	for (const t of tx.doc.trims) if (t.on.includes(c.id)) tx.set(['trims', t.id, 'on'], [...t.on, id]);
	for (const s of tx.doc.straps.slice()) {
		if (s.path !== c.id) continue;
		const sid = tx.newId('s');
		tx.insert('straps', { ...structuredClone(s), id: sid, path: id });
		splitHosted(tx, (g) => g.on?.strap === s.id, { strap: sid }, side2);
	}
	splitHosted(tx, (g) => g.on?.curve === c.id, { curve: id }, side2);
	return id;
}

function splitPanel(tx, p) {
	const surf = tx.ctx.surf, side = sideOfX(surf.pos(fromSP(p.seed)).x), side2 = otherSide(side), id = tx.newId('p');
	tx.insert('panels', { ...structuredClone(p), id, mirror: 'none', name: named(p.name, side2), twin: p.id, seed: toSP(mirrorSP(fromSP(p.seed), surf)) });
	tx.set(['panels', p.id, 'mirror'], 'none');
	tx.set(['panels', p.id, 'twin'], id);
	if (p.name) tx.set(['panels', p.id, 'name'], named(p.name, side));
	splitHosted(tx, (g) => g.on?.panel === p.id, { panel: id }, side2);
	return id;
}

function splitStones(tx, g) {
	if (g.pair && tx.doc.stones.some((x) => x.id === g.pair)) {
		const other = g.pair;
		tx.set(['stones', g.id, 'pair'], undefined);
		tx.set(['stones', other, 'pair'], undefined);
		return other;
	}
	const id = tx.newId('g'), mirrored = g.mirror === 'both';
	// the group's own stones stay with this record; the rest become their own group. Generated on a
	// paired line or piece: the wearer's left stays here. Generated once and mirrored: the mirror image.
	tx.insert('stones', { ...structuredClone(g), id, ...(mirrored ? { mirror: 'only' } : { side: 'right' }) });
	if (mirrored) tx.set(['stones', g.id, 'mirror'], 'none');
	else tx.set(['stones', g.id, 'side'], 'left');
	return id;
}

function splitDecal(tx, d) {
	tx.set(['decals', d.id, 'pair'], undefined);
	tx.set(['decals', d.pair, 'pair'], undefined);
	return d.pair;
}

// Splits a pair: the record keeps the side it stored; the id of the other side's record is returned.
function split(tx, list, id) {
	const o = tx.doc[list].find((x) => x.id === id);
	if (list === 'curves') return splitCurve(tx, o);
	if (list === 'panels') return splitPanel(tx, o);
	if (list === 'stones') return splitStones(tx, o);
	if (list === 'decals') return splitDecal(tx, o);
	if (list === 'straps') { // through its path line: this strap's twin is the copy on the new line
		const path2 = splitCurve(tx, curveOf(tx.doc, o.path));
		return tx.doc.straps.find((s) => s.path === path2)?.id;
	}
	throw new Error('Cannot split ' + list);
}

// --- the other half of a linked pair ----------------------------------------------------------------

function partnerCmd(tx, cmd, t) {
	if (t.list !== 'stones' && t.list !== 'decals') return null;
	const o = tx.doc[t.list].find((x) => x.id === t.id);
	if (!o?.pair || !tx.doc[t.list].some((x) => x.id === o.pair)) return null;
	const { name, ...rest } = cmd, out = { ...rest, id: o.pair };
	if (cmd.params) out.params = flipParams(cmd.params);
	if (cmd.rotate !== undefined) out.rotate = -cmd.rotate;
	if (cmd.at) out.at = { mirror: cmd.at };
	return out;
}

// { cmd, side?: 'm' (the edit is of the mirror image), gesture? } -> { result, id, split }
// id: the part the edit landed on (the mirror image's own record, once split).
defineCommand('sym.edit', {
	label: 'Edit', args: '{ cmd, side?: "m" }',
	run(tx, a) {
		const t = targetOf(a.cmd);
		if (!t) return { result: tx.exec(a.cmd), id: null, split: false };
		if (symmetryOn(tx.doc) || onlyRenames(a.cmd, t.key) || !isPaired(tx.doc, t.list, t.id)) {
			const partner = symmetryOn(tx.doc) ? partnerCmd(tx, a.cmd, t) : null;
			const result = tx.exec(a.cmd);
			if (partner) tx.exec(partner);
			return { result, id: t.id, split: false };
		}
		const other = split(tx, t.list, t.id), id = a.side === 'm' && other ? other : t.id;
		return { result: tx.exec({ ...a.cmd, [t.key]: id }), id, split: true };
	},
});
