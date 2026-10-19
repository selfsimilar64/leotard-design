// Garment commands: blocks, curves (the lines on the body) and panels (what fills them).
// Points are given as point specs (curves/points.js) and stored as surface points.
import { defineCommand } from './store.js';
import { resolvePoint } from '../curves/points.js';
import { toSP } from '../body/surface.js';
import { makeBlock, BLOCK_OPTIONS } from '../garment/blocks.js';
import { FABRICS, SECOND } from '../materials/fabric.js';
import { panelAt } from '../garment/build.js';

const ROLES = ['seam', 'edge', 'print', 'guide', 'strap-path', 'trim-path'];
const MIRRORS = ['none', 'both'];
const SHAPES = ['none', 'scallop', 'zigzag', 'wave'];

function ctxOf(tx) {
	if (!tx.ctx) throw new Error('The body is still loading');
	return tx.ctx;
}
function oneOf(name, v, list) { if (!list.includes(v)) throw new Error(`${name} must be one of: ${list.join(', ')} (got ${JSON.stringify(v)})`); }

// A control point from { at: spec, kind, on? } or a bare spec. on: { curve, t, mirror? } attaches
// the point to another line (it then follows that line); the position is still stored as a fallback.
function controlPoint(tx, pt) {
	const bare = !pt.at && !pt.sp && !pt.p && !pt.front && !pt.back && !pt.lm && !pt.curve && !pt.mirror;
	const spec = pt.at ?? (pt.on && bare ? { curve: pt.on.curve, t: pt.on.t } : pt);
	const kind = pt.kind ?? 'smooth';
	oneOf('point kind', kind, ['smooth', 'corner']);
	const out = { sp: toSP(resolvePoint(spec, ctxOf(tx))), kind };
	if (pt.on) {
		if (!tx.doc.curves.some((c) => c.id === pt.on.curve)) throw new Error('Cannot attach to ' + pt.on.curve + ': no such line');
		out.on = { curve: pt.on.curve, t: Math.min(Math.max(+pt.on.t || 0, 0), 1), ...(pt.on.mirror ? { mirror: true } : {}) };
	}
	return out;
}

function findCurve(tx, id) {
	const c = tx.doc.curves.find((x) => x.id === id);
	if (!c) throw new Error(`No curve ${id}. Curves: ${tx.doc.curves.map((x) => x.id).join(', ') || 'none'}`);
	return c;
}

// Panel by id, or the panel under a point spec.
function findPanel(tx, a) {
	if (a.id) {
		const p = tx.doc.panels.find((x) => x.id === a.id);
		if (!p) throw new Error(`No panel ${a.id}`);
		return p;
	}
	if (a.at) {
		const ctx = ctxOf(tx), g = ctx.garment();
		const sp = resolvePoint(a.at, ctx), id = g && panelAt(g, tx.doc, ctx.surf, sp);
		const p = id && tx.doc.panels.find((x) => x.id === id);
		if (!p) throw new Error('No panel at that point');
		return p;
	}
	throw new Error('Name the panel by id or by a point: { id } or { at: { front: [x, y] } }');
}

defineCommand('block.apply', {
	label: 'Start from block', args: `{ neck?: ${BLOCK_OPTIONS.neck.join('|')}, back?: ${BLOCK_OPTIONS.back.join('|')}, sleeves?: ${BLOCK_OPTIONS.sleeves.join('|')}, leg?: ${BLOCK_OPTIONS.leg.join('|')}, fabric?, colour?, second? }`,
	run(tx, a) {
		const ctx = ctxOf(tx);
		const stack = [{ fabric: a.fabric ?? 'mystique', colour: a.colour ?? '#2b1d6e', second: a.second ?? 'Tone-on-tone' }];
		const blk = makeBlock(ctx.man, ctx.surf, { neck: a.neck, back: a.back, sleeves: a.sleeves, leg: a.leg }, stack);
		tx.set('legacy', null);
		for (const c of tx.doc.curves.filter((c) => (c.layer ?? 'L0') === 'L0').map((c) => c.id)) tx.remove('curves', c);
		for (const p of tx.doc.panels.filter((p) => (p.layer ?? 'L0') === 'L0').map((p) => p.id)) tx.remove('panels', p);
		const ids = new Map();
		for (const c of blk.curves) ids.set(c.key, tx.newId('c'));
		for (const { key, ...c } of blk.curves) {
			c.points = c.points.map((p) => (p.on ? { ...p, on: { ...p.on, curve: ids.get(p.on.curve) } } : p));
			tx.insert('curves', { id: ids.get(key), layer: 'L0', ...c });
		}
		for (const p of blk.panels) tx.insert('panels', { id: tx.newId('p'), layer: 'L0', mirror: 'none', ...p });
		tx.set('meta/block', { neck: a.neck, back: a.back, sleeves: a.sleeves, leg: a.leg });
	},
});

defineCommand('curve.add', {
	label: 'Draw line', args: '{ points: [spec | { at: spec, kind: smooth|corner }], role?: seam|edge|print|guide|strap-path|trim-path, closed?, mirror?: none|both, shape?: { mod, amp, period }, name?, layer? }',
	run(tx, a) {
		if (!Array.isArray(a.points) || a.points.length < 2) throw new Error('A line needs at least two points');
		const role = a.role ?? 'seam';
		oneOf('role', role, ROLES);
		const mirror = a.mirror ?? 'both';
		oneOf('mirror', mirror, MIRRORS);
		if (a.shape) oneOf('shape.mod', a.shape.mod, SHAPES);
		const id = tx.newId('c');
		tx.insert('curves', {
			id, layer: a.layer ?? 'L0', role, name: a.name ?? '', closed: !!a.closed, mirror,
			shape: a.shape ?? { mod: 'none', amp: 0, period: 0 },
			points: a.points.map((p) => controlPoint(tx, p)),
		});
		return id;
	},
});

defineCommand('curve.set', {
	label: 'Change line', args: '{ id, role?, closed?, mirror?, shape?, name? }',
	run(tx, a) {
		findCurve(tx, a.id);
		if (a.role !== undefined) { oneOf('role', a.role, ROLES); tx.set(['curves', a.id, 'role'], a.role); }
		if (a.mirror !== undefined) { oneOf('mirror', a.mirror, MIRRORS); tx.set(['curves', a.id, 'mirror'], a.mirror); }
		if (a.closed !== undefined) tx.set(['curves', a.id, 'closed'], !!a.closed);
		if (a.name !== undefined) tx.set(['curves', a.id, 'name'], a.name);
		if (a.shape !== undefined) { oneOf('shape.mod', a.shape.mod, SHAPES); tx.set(['curves', a.id, 'shape'], { mod: a.shape.mod, amp: a.shape.amp ?? 0, period: a.shape.period ?? 0.01 }); }
	},
});

defineCommand('curve.points', {
	label: 'Redraw line', args: '{ id, points: [spec | { at, kind }] }',
	run(tx, a) {
		findCurve(tx, a.id);
		if (!Array.isArray(a.points) || a.points.length < 2) throw new Error('A line needs at least two points');
		tx.set(['curves', a.id, 'points'], a.points.map((p) => controlPoint(tx, p)));
	},
});

defineCommand('curve.movePoint', {
	label: 'Move point', args: '{ id, i, to: spec, gesture? }',
	run(tx, a) {
		const c = findCurve(tx, a.id);
		if (!(a.i >= 0 && a.i < c.points.length)) throw new Error(`Point index ${a.i} out of range (0-${c.points.length - 1})`);
		tx.set(['curves', a.id, 'points', String(a.i), 'sp'], toSP(resolvePoint(a.to, ctxOf(tx))));
	},
});

defineCommand('curve.insertPoint', {
	label: 'Add point', args: '{ id, i (insert before this index), at: spec, kind? }',
	run(tx, a) {
		const c = findCurve(tx, a.id);
		const i = Math.max(0, Math.min(a.i ?? c.points.length, c.points.length));
		tx.insert(['curves', a.id, 'points'], controlPoint(tx, { at: a.at, kind: a.kind }), i);
	},
});

defineCommand('curve.removePoint', {
	label: 'Delete point', args: '{ id, i }',
	run(tx, a) {
		const c = findCurve(tx, a.id);
		if (c.points.length <= 2) throw new Error('A line keeps at least two points (delete the line instead)');
		tx.remove(['curves', a.id, 'points'], String(a.i));
	},
});

defineCommand('curve.setKind', {
	label: 'Corner / smooth', args: '{ id, i, kind: smooth|corner }',
	run(tx, a) { findCurve(tx, a.id); oneOf('kind', a.kind, ['smooth', 'corner']); tx.set(['curves', a.id, 'points', String(a.i), 'kind'], a.kind); },
});

defineCommand('curve.remove', {
	label: 'Delete line', args: '{ id }',
	run(tx, a) { findCurve(tx, a.id); tx.remove('curves', a.id); },
});

// --- panels ------------------------------------------------------------------------------------

function setStackFields(tx, p, a, layer = 0) {
	if (a.fabric !== undefined) oneOf('fabric', a.fabric, Object.keys(FABRICS));
	if (a.second !== undefined) oneOf('second', a.second, SECOND);
	const base = ['panels', p.id, 'stack', String(layer)];
	if (!p.stack[layer]) tx.insert(['panels', p.id, 'stack'], { fabric: 'matte', colour: '#888888', second: 'Tone-on-tone' }, layer);
	for (const k of ['fabric', 'colour', 'second', 'grain', 'print', 'texture']) if (a[k] !== undefined) tx.set([...base, k], a[k]);
}

defineCommand('panel.set', {
	label: 'Change panel', args: '{ id | at: spec, fabric?, colour?, second?, grain?, texture?, name?, layer? (0 = outer) }',
	run(tx, a) {
		const p = findPanel(tx, a);
		setStackFields(tx, p, a, a.layer ?? 0);
		if (a.name !== undefined) tx.set(['panels', p.id, 'name'], a.name);
		return p.id;
	},
});

defineCommand('panel.cut', {
	label: 'Cut out', args: '{ id | at: spec }',
	run(tx, a) { const p = findPanel(tx, a); tx.set(['panels', p.id, 'removed'], true); return p.id; },
});

defineCommand('panel.restore', {
	label: 'Fill opening', args: '{ id }',
	run(tx, a) { const p = findPanel(tx, a); tx.set(['panels', p.id, 'removed'], false); return p.id; },
});

defineCommand('panel.add', {
	label: 'Fill area', args: '{ at: spec, fabric?, colour?, second?, mirror?: none|both, name? }',
	run(tx, a) {
		const sp = toSP(resolvePoint(a.at, ctxOf(tx)));
		const id = tx.newId('p');
		tx.insert('panels', { id, layer: 'L0', name: a.name ?? '', seed: sp, mirror: a.mirror ?? 'none', stack: [{ fabric: a.fabric ?? 'matte', colour: a.colour ?? '#888888', second: a.second ?? 'Tone-on-tone' }] });
		return id;
	},
});

// --- edge finishes -------------------------------------------------------------------------------

defineCommand('trim.set', {
	label: 'Edge finish', args: '{ on: curveId | [curveIds], kind: elastic|binding|none, fabric?: { fabric, colour, second } }',
	run(tx, a) {
		const on = Array.isArray(a.on) ? a.on : [a.on];
		for (const id of on) findCurve(tx, id);
		oneOf('kind', a.kind, ['elastic', 'binding', 'none']);
		if (a.fabric?.fabric) oneOf('fabric', a.fabric.fabric, Object.keys(FABRICS));
		// one finish per curve: drop the curves from other trims first
		for (const t of tx.doc.trims) {
			const keep = t.on.filter((c) => !on.includes(c));
			if (keep.length !== t.on.length) { if (keep.length) tx.set(['trims', t.id, 'on'], keep); else tx.remove('trims', t.id); }
		}
		const id = tx.newId('t');
		tx.insert('trims', { id, on, kind: a.kind, ...(a.fabric ? { fabric: { fabric: a.fabric.fabric ?? 'matte', colour: a.fabric.colour ?? '#ffffff', second: a.fabric.second ?? 'Tone-on-tone' } } : {}) });
		return id;
	},
});
