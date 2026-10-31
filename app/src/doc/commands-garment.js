// Garment commands: blocks, curves (the lines on the body) and panels (what fills them).
// Points are given as point specs (curves/points.js) and stored as surface points.
import { defineCommand } from './store.js';
import { resolvePoint } from '../curves/points.js';
import { toSP } from '../body/surface.js';
import { makeBlock, blockFabric, blockKeyOf, blockOf, fitToStrap, BLOCK_OPTIONS, DEFAULT_BLOCK, ELEMENT_CURVES, ELEMENT_PANELS } from '../garment/blocks.js';
import { FABRICS, SECOND } from '../materials/fabric.js';
import { STARTS } from '../garment/starts.js';
import { STROKE, buildGarment, cellLines, cellSeed, evaluateAll, panelAt, strokeRegions } from '../garment/build.js';
import { locate } from '../garment/arrangement.js';
import { LOOK, lookOf, setLook, assign, usage, freshName } from './materials.js';
import { projectNear, evaluateCurve } from '../curves/evaluate.js';
import { mirrorSP } from '../curves/points.js';
import { fromSP } from '../body/surface.js';

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

const blockOpts = (a) => Object.fromEntries(Object.keys(BLOCK_OPTIONS).map((k) => [k, a[k]]));
const BLOCK_NAMES = new Set(['Neckline', 'Back opening', 'Leg line', 'Armhole', 'Sleeve seam', 'Cuff', 'Side seam', 'Shoulder seam', 'Crotch seam', 'Underarm seam', 'Raglan seam (front)', 'Raglan seam (back)', 'Yoke seam', 'Waist seam']);
const optsList = Object.entries(BLOCK_OPTIONS).map(([k, v]) => `${k}?: ${v.join('|')}`).join(', ');

// The whole garment from a block (every line and panel of the shell replaced); lines and panels
// carry their block key so block.set can later swap one element.
defineCommand('block.apply', {
	label: 'Start from block', args: `{ ${optsList}, fabric?, colour?, second? }`,
	run(tx, a) {
		const ctx = ctxOf(tx);
		const stack = [{ fabric: a.fabric ?? 'mystique', colour: a.colour ?? '#2b1d6e', second: a.second ?? 'Tone-on-tone' }];
		const opts = fitToStrap({ ...DEFAULT_BLOCK, ...Object.fromEntries(Object.entries(blockOpts(a)).filter(([, v]) => v !== undefined)) });
		const blk = makeBlock(ctx.man, ctx.surf, opts, stack);
		tx.set('legacy', null);
		for (const c of tx.doc.curves.filter((c) => (c.layer ?? 'L0') === 'L0').map((c) => c.id)) tx.remove('curves', c);
		for (const p of tx.doc.panels.filter((p) => (p.layer ?? 'L0') === 'L0').map((p) => p.id)) tx.remove('panels', p);
		const ids = new Map();
		for (const c of blk.curves) ids.set(c.key, tx.newId('c'));
		for (const { key, ...c } of blk.curves) {
			c.points = c.points.map((p) => (p.on ? { ...p, on: { ...p.on, curve: ids.get(p.on.curve) } } : p));
			tx.insert('curves', { id: ids.get(key), layer: 'L0', block: key, ...c });
		}
		for (const { key, ...p } of blk.panels) tx.insert('panels', { id: tx.newId('p'), layer: 'L0', block: key, mirror: 'none', ...p });
		tx.set('meta/block', opts);
	},
});

// A starting point (garment/starts.js): the block, then the pieces' materials and the stones,
// as one undo step. Only the leotard changes.
defineCommand('start.apply', {
	label: 'Start from', args: `{ key: ${STARTS.map((s) => s.key).join('|')} }`,
	run(tx, a) {
		const st = STARTS.find((s) => s.key === a.key);
		if (!st) throw new Error('key must be one of: ' + STARTS.map((s) => s.key).join(', '));
		tx.exec({ op: 'block.apply', ...st.block, ...st.fabric });
		for (const o of ['materials', 'stones', 'placed', 'straps', 'trims', 'bands', 'decals', 'details', 'hardware']) for (const x of tx.doc[o].slice()) tx.remove(o, x.id);
		for (const l of tx.doc.layers.slice()) if (l.id !== 'L0') tx.exec({ op: 'layer.remove', id: l.id });
		const panelOf = (key) => tx.doc.panels.find((p) => p.block === key)?.id, curveOf = (key) => tx.doc.curves.find((c) => c.block === key)?.id;
		for (const [key, patch] of Object.entries(st.panels ?? {})) { const id = panelOf(key); if (id) tx.exec({ op: 'panel.set', id, ...patch }); }
		for (const g of st.stones ?? []) {
			const on = g.on?.panel ? { panel: panelOf(g.on.panel) } : g.on?.curve ? { curve: curveOf(g.on.curve) } : undefined;
			const params = g.params?.from?.curve ? { ...g.params, from: { curve: curveOf(g.params.from.curve) } } : g.params;
			if ((on && !Object.values(on)[0]) || (g.params?.from?.curve && !params.from.curve)) continue;
			tx.exec({ op: 'stones.add', ...g, on, params });
		}
		tx.set('meta/start', st.key);
	},
});

// --- changing one element of the shape ---------------------------------------------------------------
// block.set { neck: 'v' } regenerates only the lines the neckline owns (ELEMENT_CURVES) and keeps
// everything else: the other block lines as the designer left them, drawn lines (re-attached by
// position where they end on a replaced line), panels and their materials (by id, so stones and
// gradients on them survive), stones, straps, trims. Cells the new block opens (a keyhole) lose
// their panel; cells it covers (a smaller neck) take their neighbour's fabric. What had to go is
// returned, so the panel can ask first (exec with { dryRun: true }).

// Drop a block line and what hung on it. The impact lists what the designer added and loses:
// stones and straps on the line, drawn lines that ended on it (kept, but no longer attached).
function removeCurve(tx, c, impact, doomed = new Set([c.id])) {
	dropOverlaysOn(tx, c.id, impact);
	for (const t of tx.doc.trims) if (t.on.includes(c.id)) { const keep = t.on.filter((x) => x !== c.id); if (keep.length) tx.set(['trims', t.id, 'on'], keep); else tx.remove('trims', t.id); }
	for (const g of tx.doc.stones.slice()) if (g.on?.curve === c.id || g.params?.from?.curve === c.id) { impact.stones.push(g.name || g.kind); tx.remove('stones', g.id); }
	for (const s of tx.doc.straps.slice()) if (s.path === c.id) { impact.straps.push(s.id); tx.remove('straps', s.id); }
	for (const o of tx.doc.curves) if (!doomed.has(o.id)) o.points.forEach((p, i) => { if (p.on?.curve === c.id) { if (!impact.lines.includes(o.name || o.id)) impact.lines.push(o.name || o.id); tx.set(['curves', o.id, 'points', String(i), 'on'], undefined); } });
	tx.remove('curves', c.id);
}
// An overlay piece cannot outlive a line its shape depends on: its own outline, or a seam it runs up to.
function dropOverlaysOn(tx, id, impact) {
	for (const p of tx.doc.panels.slice()) {
		if (!p.outline || !tx.doc.panels.includes(p)) continue;
		if (p.outline !== id && !tx.doc.layers.find((l) => l.id === p.layer)?.bounds?.includes(id)) continue;
		for (const g of tx.doc.stones.slice()) if (g.on?.panel === p.id) { impact?.stones.push(g.name || g.kind); tx.remove('stones', g.id); }
		impact?.pieces.push(p.name || p.id);
		tx.exec({ op: 'overlay.remove', id: p.id });
	}
}
// Drop a panel and its stones; a piece the designer made (not the block's) is reported.
function removePanel(tx, p, impact) {
	for (const g of tx.doc.stones.slice()) if (g.on?.panel === p.id) { impact.stones.push(g.name || g.kind); tx.remove('stones', g.id); }
	if (!blockKeyOf(p)) impact.pieces.push(p.name || p.id);
	tx.remove('panels', p.id);
}
// Points of other lines attached to `old` move to the nearest place on its replacement, by position.
function reattach(tx, old, replacement, surf) {
	let e = null, em = null;
	const evalOf = (mirror) => evaluateCurve(replacement, surf, { mirror: mirror ? (sp) => mirrorSP(sp, surf) : null });
	const tOf = (c, pos) => { let bi = 0, bd = Infinity; c.pts.forEach((q, i) => { const d = q.distanceToSquared(pos); if (d < bd) { bd = d; bi = i; } }); return c.s[bi] / Math.max(c.s[c.s.length - 1], 1e-9); };
	for (const o of tx.doc.curves) {
		if (o.id === old.id) continue;
		o.points.forEach((p, i) => {
			if (p.on?.curve !== old.id || !p.sp) return;
			e ??= evalOf(false);
			let pos = surf.pos(fromSP(p.sp)), c = e;
			if (p.on.mirror) { if (replacement.mirror === 'both') c = em ??= evalOf(true); else pos = surf.pos(mirrorSP(fromSP(p.sp), surf)); }
			tx.set(['curves', o.id, 'points', String(i), 'on', 't'], tOf(c, pos));
		});
	}
}

defineCommand('block.set', {
	label: 'Change shape', args: `{ ${optsList} } (one or more elements; the rest of the design is kept)`,
	run(tx, a) {
		const ctx = ctxOf(tx), { man, surf } = ctx;
		const cur = blockOf(tx.doc);
		const asked = Object.keys(BLOCK_OPTIONS).filter((k) => a[k] !== undefined);
		for (const k of asked) oneOf(k, a[k], BLOCK_OPTIONS[k]);
		// a strap that does not allow the neckline or back changes them too (an asked-for one that
		// does not go with the strap is an error)
		const next = fitToStrap({ ...cur, ...Object.fromEntries(asked.map((k) => [k, a[k]])) }, asked);
		const changed = Object.keys(BLOCK_OPTIONS).filter((k) => next[k] !== cur[k]);
		const impact = { lines: [], pieces: [], stones: [], straps: [] };
		if (!changed.length) return impact;
		const L0 = (o) => (o.layer ?? 'L0') === 'L0';
		if (!tx.doc.curves.some(L0)) { tx.exec({ op: 'block.apply', ...next }); return impact; } // nothing to keep yet
		tx.noInherit = true;
		const panels0 = tx.doc.panels.filter((p) => L0(p));
		const front = panels0.find((p) => blockKeyOf(p) === 'front' && !p.removed) ?? panels0.find((p) => !p.removed);
		const stack = front?.stack?.length ? structuredClone(front.stack) : undefined;
		const blk = makeBlock(man, surf, next, stack), oldBlk = makeBlock(man, surf, cur), wasFabric = blockFabric(man, surf, cur);
		const prevG = ctx.garment('L0');

		// 1. lines of the changed elements: replaced in place (same id), added, or removed
		const keys = new Set(changed.flatMap((k) => ELEMENT_CURVES[k]));
		const byKey = new Map();
		for (const c of tx.doc.curves) if (L0(c)) { const k = blockKeyOf(c); if (k && !byKey.has(k)) byKey.set(k, c); }
		const ids = new Map([...byKey].map(([k, c]) => [k, c.id]));
		for (const c of blk.curves) if (keys.has(c.key) && !ids.has(c.key)) ids.set(c.key, tx.newId('c'));
		const mapOn = (pts) => pts.map((p) => (p.on ? { ...p, on: { ...p.on, curve: ids.get(p.on.curve) ?? p.on.curve } } : p));
		for (const { key, ...c } of blk.curves) {
			if (!keys.has(key)) continue;
			const old = byKey.get(key), pts = mapOn(c.points);
			if (!old) { tx.insert('curves', { id: ids.get(key), layer: 'L0', block: key, ...c, points: pts }); continue; }
			reattach(tx, old, { ...old, points: pts, closed: c.closed, mirror: c.mirror }, surf);
			tx.set(['curves', old.id, 'points'], pts);
			if (old.role !== c.role) tx.set(['curves', old.id, 'role'], c.role);
			if (!!old.closed !== !!c.closed) tx.set(['curves', old.id, 'closed'], c.closed);
			if ((old.mirror ?? 'none') !== c.mirror) tx.set(['curves', old.id, 'mirror'], c.mirror);
			if (old.twin) { tx.set(['curves', old.id, 'twin'], undefined); tx.set(['curves', old.id, 'name'], c.name); } // one line again: no "(left)"
			if (old.name !== c.name && BLOCK_NAMES.has(old.name)) tx.set(['curves', old.id, 'name'], c.name); // an armhole that becomes a sleeve seam
			if (!old.block) tx.set(['curves', old.id, 'block'], key);
		}
		const have = new Set(blk.curves.map((c) => c.key));
		const doomed = oldBlk.curves.map(({ key }) => byKey.get(key)).filter((c) => c && keys.has(blockKeyOf(c)) && !have.has(blockKeyOf(c)));
		// a block line split into two sides (doc/symmetry.js): the new option replaces both
		for (const c of tx.doc.curves) if (L0(c) && keys.has(blockKeyOf(c)) && byKey.has(blockKeyOf(c)) && byKey.get(blockKeyOf(c)) !== c && !doomed.includes(c)) doomed.push(c);
		const doomedIds = new Set(doomed.map((c) => c.id));
		for (const c of doomed) removeCurve(tx, c, impact, doomedIds);

		// 2. the block panels the changed elements own: re-seated (same id) or added
		const pkeys = new Set(changed.flatMap((k) => ELEMENT_PANELS[k] ?? []));
		const pByKey = new Map();
		for (const p of panels0) { const k = blockKeyOf(p); if (k && !pByKey.has(k)) pByKey.set(k, p); }
		for (const p of blk.panels) {
			if (!pkeys.has(p.key)) continue;
			const old = pByKey.get(p.key);
			if (old) {
				tx.set(['panels', old.id, 'seed'], p.seed); if (!old.block) tx.set(['panels', old.id, 'block'], p.key);
				// a block piece split into two sides (doc/symmetry.js) is one again
				if (old.twin) { tx.set(['panels', old.id, 'twin'], undefined); tx.set(['panels', old.id, 'mirror'], p.mirror); tx.set(['panels', old.id, 'name'], p.name); }
				for (const q of panels0) if (q !== old && blockKeyOf(q) === p.key) removePanel(tx, q, impact);
				continue;
			}
			// a new yoke is mesh in the front's colour, as most moodboard yokes are
			const st = p.key === 'yoke' ? [{ fabric: 'mesh', colour: p.stack[0]?.colour ?? '#888888', second: 'Tone-on-tone', sheer: 0.3 }] : p.stack;
			tx.insert('panels', { id: tx.newId('p'), layer: 'L0', block: p.key, name: p.name, seed: p.seed, mirror: p.mirror, stack: st });
		}

		// 3. every cell of the re-cut shell: opened by the block, covered by it, or claimed by a panel
		const evaluated = evaluateAll(tx.doc, surf, null, ctx.evaluated);
		const g = buildGarment(tx.doc, surf, { layer: 'L0', evaluated });
		ctx.prebuilt?.(g); // the engine re-cuts on this arrangement (the curves are final here) instead of building it again
		const panels = tx.doc.panels.slice(), byId = new Map(panels.map((p) => [p.id, p]));
		const claimed = new Set();
		for (const s of g.seeds) if (s.cell >= 0 && g.panelIds[g.cellPanel[s.cell]] === s.panel) claimed.add(s.panel);
		const orphans = new Set(panels.filter((p) => L0(p) && !p.removed && !claimed.has(p.id)).map((p) => p.id));
		for (let c = 0; c < g.arr.cells.length; c++) {
			const sp = cellSeed(g.arr, surf, c), pi = g.cellPanel[c], p = pi >= 0 ? byId.get(g.panelIds[pi]) : null;
			const now = blk.fabric(sp), before = wasFabric(sp);
			if (!now) { if (before && p && !p.removed) orphans.add(p.id); continue; } // opened by the block (a kept opening keeps its panel)
			if (p) continue;
			// fabric without a panel: the panel that was here is re-seated, a split piece is copied,
			// a newly covered cell takes its biggest neighbour's fabric
			const from = prevG ? panelAt(prevG, tx.doc, surf, sp) : null, src = from ? byId.get(from) : null;
			if (src && !src.removed && orphans.has(src.id)) { tx.set(['panels', src.id, 'seed'], toSP(sp)); orphans.delete(src.id); claimed.add(src.id); continue; }
			let copy = src && !src.removed ? src : null;
			if (!copy) {
				let bl = 0;
				for (const [n, l] of g.arr.cellAdj[c]) { const q = g.cellPanel[n] >= 0 ? byId.get(g.panelIds[g.cellPanel[n]]) : null; if (q && !q.removed && l > bl) { bl = l; copy = q; } }
			}
			tx.insert('panels', { id: tx.newId('p'), layer: 'L0', name: copy?.name ?? 'Piece', seed: toSP(sp), mirror: 'none', stack: structuredClone(copy?.stack ?? stack ?? [{ fabric: 'matte', colour: '#888888', second: 'Tone-on-tone' }]) });
		}
		for (const id of orphans) removePanel(tx, byId.get(id), impact);
		tx.set('meta/block', next);
		return impact;
	},
});

defineCommand('curve.add', {
	label: 'Draw line', args: '{ points: [spec | { at: spec, kind: smooth|corner }], role?: seam|edge|print|guide|strap-path|trim-path, closed?, mirror?: none|both, shape?: { mod, amp, period }, name?, layer? }',
	run(tx, a) {
		if (!Array.isArray(a.points) || a.points.length < 2) throw new Error('A line needs at least two points');
		const role = a.role ?? 'seam';
		oneOf('role', role, ROLES);
		if (a.layer && !tx.doc.layers.some((l) => l.id === a.layer)) throw new Error('No layer ' + a.layer);
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
	run(tx, a) {
		findCurve(tx, a.id);
		dropOverlaysOn(tx, a.id);
		if (tx.doc.curves.some((c) => c.id === a.id)) tx.remove('curves', a.id);
	},
});

// --- panels ------------------------------------------------------------------------------------

function setStackFields(tx, p, a, layer = 0) {
	if (a.fabric !== undefined) oneOf('fabric', a.fabric, Object.keys(FABRICS));
	if (a.second !== undefined) oneOf('second', a.second, SECOND);
	const base = ['panels', p.id, 'stack', String(layer)];
	if (!p.stack[layer]) tx.insert(['panels', p.id, 'stack'], { fabric: 'matte', colour: '#888888', second: 'Tone-on-tone' }, layer);
	if (a.texMode !== undefined) oneOf('texMode', a.texMode, ['original', 'recolour']);
	if (a.ombre && !a.ombre.colour) throw new Error('ombre needs a colour: { colour, curve | axis: [x, y, z], start, end } (metres)');
	if (a.ombre?.curve && !tx.doc.curves.some((c) => c.id === a.ombre.curve)) throw new Error('ombre: no line ' + a.ombre.curve);
	if (a.print && !a.print.src) throw new Error('print needs src (an image URL) and size [w, h] in metres');
	// a new fabric or scan starts at its own default texture size (materials/fabric.js texScaleOf)
	const cur = p.stack[layer], resetScale = cur && a.texScale === undefined && ((a.fabric !== undefined && a.fabric !== cur.fabric) || (a.texture !== undefined && (a.texture ?? undefined) !== cur.texture));
	// what the fabric is belongs to its material, so it reaches everything cut from that material;
	// grain, gradient and print are this piece's own (doc/materials.js)
	if (cur?.material && tx.doc.materials.some((m) => m.id === cur.material)) {
		setLook(tx, cur.material, { ...a, ...(resetScale ? { texScale: null } : {}) });
		for (const k of ['grain', 'print', 'ombre']) if (a[k] !== undefined) tx.set([...base, k], a[k] === null ? undefined : a[k]);
		return;
	}
	if (resetScale) tx.set([...base, 'texScale'], undefined);
	for (const k of [...LOOK, 'grain', 'print', 'ombre']) if (a[k] !== undefined) tx.set([...base, k], a[k] === null ? undefined : a[k]);
}

// --- materials ---------------------------------------------------------------------------------
// The fabrics a design is cut from: doc/materials.js.

defineCommand('material.add', {
	label: 'New material', args: '{ from?: materialId (copies it), name?, fabric?, colour?, second?, ... }',
	run(tx, a) {
		const src = a.from ? tx.doc.materials.find((m) => m.id === a.from) : null;
		if (a.from && !src) throw new Error('No material ' + a.from);
		const look = { fabric: 'matte', colour: '#888888', second: 'Tone-on-tone', ...lookOf(src), ...lookOf(a) };
		oneOf('fabric', look.fabric, Object.keys(FABRICS));
		const id = tx.newId('m');
		tx.insert('materials', { id, name: freshName(tx.doc, a.name ?? src?.name ?? FABRICS[look.fabric].label.replace(/ \(.*\)$/, '')), ...look });
		return id;
	},
});

defineCommand('material.set', {
	label: 'Change material', args: '{ id, name?, fabric?, colour?, second?, colour2?, ... } (reaches every piece, strap and finish cut from it)',
	run(tx, a) {
		if (!tx.doc.materials.some((m) => m.id === a.id)) throw new Error('No material ' + a.id);
		if (a.fabric !== undefined) oneOf('fabric', a.fabric, Object.keys(FABRICS));
		if (a.second !== undefined) oneOf('second', a.second, SECOND);
		if (a.name !== undefined) tx.set(['materials', a.id, 'name'], a.name);
		setLook(tx, a.id, a);
	},
});

defineCommand('material.remove', {
	label: 'Delete material', args: '{ id } (only one nothing is cut from)',
	run(tx, a) {
		const u = usage(tx.doc).get(a.id);
		if (!u) throw new Error('No material ' + a.id);
		if (u.all) throw new Error('This material is still in use');
		tx.remove('materials', a.id);
	},
});

defineCommand('panel.material', {
	label: 'Change material', args: '{ id, material }',
	run(tx, a) { const p = findPanel(tx, a); assign(tx, ['panels', p.id, 'stack', '0'], a.material); return p.id; },
});

defineCommand('panel.separate', {
	label: 'Separate material', args: '{ id } (this piece gets its own copy of its material)',
	run(tx, a) {
		const p = findPanel(tx, a), m = tx.exec({ op: 'material.add', from: p.stack[0].material });
		assign(tx, ['panels', p.id, 'stack', '0'], m);
		return m;
	},
});

defineCommand('strap.material', {
	label: 'Change material', args: '{ id, material }',
	run(tx, a) { if (!tx.doc.straps.some((s) => s.id === a.id)) throw new Error('No strap ' + a.id); assign(tx, ['straps', a.id, 'fabric'], a.material); },
});

defineCommand('strap.separate', {
	label: 'Separate material', args: '{ id } (this strap gets its own copy of its material)',
	run(tx, a) {
		const s = tx.doc.straps.find((x) => x.id === a.id);
		if (!s) throw new Error('No strap ' + a.id);
		const m = tx.exec({ op: 'material.add', from: s.fabric.material });
		assign(tx, ['straps', a.id, 'fabric'], m);
		return m;
	},
});

defineCommand('panel.set', {
	label: 'Change panel', args: '{ id | at: spec, fabric?, colour?, second?, colour2? (hex: foil, ombre end, duochrome shift), effect? (0..2: hologram / film / duochrome strength), rainbow? (0.2..3: how fast hologram or opal colours change with the angle, 1 = the fabric default), satin?: { gs?, gv?, kd?, eta? } | null (Satin (thread model): highlight width and colour glow width in degrees, milkiness 0..1, refractive index; unset = the default (owner settings); colour2 or second dyes the cross threads),sheer? (0..0.95: share seen through a mesh or lace net), grain?, ombre?: { colour, curve | axis, start, end } | null, print?: { src, size: [w, h] m, offset } | null, texture? (scan id or null), texMode?: original|recolour, texScale?, texNormal?, masks?: [colours], name?, layer? (0 = outer) }',
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
	label: 'Fill area', args: '{ at: spec, fabric?, colour?, second?, mirror?: none|both, name?, layer? (layer id: a lining or overlay shape) }',
	run(tx, a) {
		const sp = toSP(resolvePoint(a.at, ctxOf(tx)));
		const layer = a.layer ?? 'L0';
		if (!tx.doc.layers.some((l) => l.id === layer)) throw new Error('No layer ' + layer);
		const id = tx.newId('p');
		tx.insert('panels', { id, layer, name: a.name ?? '', seed: sp, mirror: a.mirror ?? 'none', stack: [{ fabric: a.fabric ?? 'matte', colour: a.colour ?? '#888888', second: a.second ?? 'Tone-on-tone' }] });
		return id;
	},
});

// --- edge finishes -------------------------------------------------------------------------------

defineCommand('trim.set', {
	label: 'Edge finish', args: '{ on: curveId | [curveIds], kind: elastic|binding (edges)|piping|tape (seams)|zigzag (a narrow stitched edge: an appliqué edge)|none, width? (m), material? | fabric?: { fabric, colour, second, ... } }',
	run(tx, a) {
		const on = Array.isArray(a.on) ? a.on : [a.on];
		for (const id of on) findCurve(tx, id);
		oneOf('kind', a.kind, ['elastic', 'binding', 'piping', 'tape', 'zigzag', 'none']);
		if (a.fabric?.fabric) oneOf('fabric', a.fabric.fabric, Object.keys(FABRICS));
		if (a.width !== undefined && !(a.width >= 0.0005 && a.width <= 0.04)) throw new Error('Finish width is in metres, between 0.0005 and 0.04');
		const mat = a.material ? tx.doc.materials.find((m) => m.id === a.material) : null;
		if (a.material && !mat) throw new Error('No material ' + a.material);
		const look = mat ? { ...lookOf(mat), material: mat.id } : a.fabric ? { fabric: 'matte', colour: '#ffffff', second: 'Tone-on-tone', ...lookOf(a.fabric), ...(a.fabric.material ? { material: a.fabric.material } : {}) } : null;
		// one finish per curve: drop the curves from other trims first
		for (const t of tx.doc.trims) {
			const keep = t.on.filter((c) => !on.includes(c));
			if (keep.length !== t.on.length) { if (keep.length) tx.set(['trims', t.id, 'on'], keep); else tx.remove('trims', t.id); }
		}
		const id = tx.newId('t');
		tx.insert('trims', { id, on, kind: a.kind, ...(a.width !== undefined ? { width: a.width } : {}), ...(look ? { fabric: look } : {}) });
		return id;
	},
});

// --- overlays --------------------------------------------------------------------------------------
// A piece cut to shape and stitched on top of the fabric under it (appliqué), which stays whole: the
// way a line that is no seam is really made (knowledge/domain/construction/applique-and-overlays.md).
// The export gives it its own cut piece with no seam allowance and a placement line on the piece
// below (garment/pattern.js). panel.outline names its line.
//
// With `at`, points is a line from one existing line to another and `at` picks the side: the piece
// fills that region, as a seam drawn there would have made it. Where its edge runs along those lines it
// is caught in them when sewn, so it gets no stitched edge and the pattern adds an allowance to catch.
// Such a piece has a layer of its own, whose `bounds` are those lines: they would slice any other overlay
// sharing the layer (garment/build.js buildGarment). It sits at the height of the other overlays.

defineCommand('overlay.add', {
	label: 'Add overlay piece', args: '{ points: [spec | { at, kind, on }] (closed outline: 3 or more; with at: a line whose two ends lie on other lines), at?: spec (the side to fill), mirror?: none|both, material?, name?, edge?: finish kind (default zigzag), width? (m, default 2 mm) }',
	run(tx, a) {
		if (a.at) return addRegionOverlay(tx, a);
		if (!Array.isArray(a.points) || a.points.length < 3) throw new Error('An overlay piece needs at least three points');
		const surf = ctxOf(tx).surf, mirror = a.mirror ?? 'both';
		const layer = tx.doc.layers.find((l) => l.kind === 'overlay' && !l.bounds)?.id ?? tx.exec({ op: 'layer.add', kind: 'overlay', name: 'Appliqué' });
		const curve = tx.exec({ op: 'curve.add', role: 'edge', closed: true, mirror, layer, name: (a.name || 'Overlay') + ' edge', points: a.points });
		const evaluated = evaluateAll(tx.doc, surf, null, ctxOf(tx).evaluated), g = buildGarment(tx.doc, surf, { layer, evaluated });
		// the new shape is the smallest cell no piece of this layer has claimed (the rest of the body is the largest)
		let cell = -1;
		for (let c = 0; c < g.arr.cells.length; c++) if (g.cellPanel[c] < 0 && g.arr.cells[c].area > 1e-4 && (cell < 0 || g.arr.cells[c].area < g.arr.cells[cell].area)) cell = c;
		if (cell < 0) throw new Error('This outline does not enclose a shape: place the points further apart');
		const seed = cellSeed(g.arr, surf, cell);
		// it starts in the fabric of the piece it lies on; choose its own material afterwards
		const L0 = ctxOf(tx).garment?.('L0') ?? buildGarment(tx.doc, surf, { layer: 'L0', evaluated }), under = tx.doc.panels.find((p) => p.id === panelAt(L0, tx.doc, surf, seed));
		const mat = a.material ? tx.doc.materials.find((m) => m.id === a.material) : null;
		if (a.material && !mat) throw new Error('No material ' + a.material);
		const look = mat ? { ...lookOf(mat), material: mat.id } : { fabric: 'matte', colour: '#888888', second: 'Tone-on-tone', ...lookOf(under?.stack?.[0]), ...(under?.stack?.[0]?.material ? { material: under.stack[0].material } : {}) };
		const id = tx.newId('p');
		tx.insert('panels', { id, layer, name: a.name ?? 'Overlay', seed: toSP(seed), mirror, outline: curve, stack: [look] });
		tx.exec({ op: 'trim.set', on: curve, kind: a.edge ?? 'zigzag', ...(a.width !== undefined ? { width: a.width } : {}) });
		tx.noInherit = true; // this command settled its own piece
		return id;
	},
});

function addRegionOverlay(tx, a) {
	if (!Array.isArray(a.points) || a.points.length < 2) throw new Error('Draw a line from one seam or edge to another');
	if (!a.points[0].on || !a.points[a.points.length - 1].on) throw new Error('An overlay line must start and end on an existing line');
	const ctx = ctxOf(tx), surf = ctx.surf, mirror = a.mirror ?? 'both', at = resolvePoint(a.at, ctx);
	const pts = a.points.map((p) => controlPoint(tx, p));
	const g = strokeRegions(tx.doc, surf, pts, mirror, ctx.evaluated), t = locate(g.arr, surf, at), cell = t >= 0 ? g.arr.cellOf[t] : -1;
	const under = cell >= 0 && g.cellPanel[cell] >= 0 ? tx.doc.panels[g.cellPanel[cell]] : null;
	if (!under || under.removed) throw new Error('Choose a side that has fabric');
	const lines = cellLines(g.arr, cell);
	if (!lines.delete(STROKE)) throw new Error('This line does not divide the fabric: end it on a line that closes the shape');
	// only shell lines: a line of another layer does not divide the shell
	const bounds = [...lines].filter((id) => (tx.doc.curves.find((c) => c.id === id)?.layer ?? 'L0') === 'L0');
	const mat = a.material ? tx.doc.materials.find((m) => m.id === a.material) : null;
	if (a.material && !mat) throw new Error('No material ' + a.material);
	const look = mat ? { ...lookOf(mat), material: mat.id } : { ...lookOf(under.stack[0]), ...(under.stack[0].material ? { material: under.stack[0].material } : {}) };
	const layer = tx.newId('L'), z = tx.doc.layers.find((l) => l.kind === 'overlay')?.z ?? 1;
	tx.insert('layers', { id: layer, kind: 'overlay', z, name: 'Appliqué', bounds });
	const curve = tx.newId('c');
	tx.insert('curves', { id: curve, layer, role: 'edge', name: (a.name || 'Overlay') + ' edge', closed: false, mirror, shape: { mod: 'none', amp: 0, period: 0 }, points: pts });
	const id = tx.newId('p');
	tx.insert('panels', { id, layer, name: a.name ?? 'Overlay', seed: toSP(at), mirror, outline: curve, stack: [look] });
	tx.exec({ op: 'trim.set', on: curve, kind: a.edge ?? 'zigzag', ...(a.width !== undefined ? { width: a.width } : {}) });
	tx.noInherit = true; // this command settled its own piece
	return id;
}

defineCommand('overlay.remove', {
	label: 'Delete overlay piece', args: '{ id } (the piece and its outline)',
	run(tx, a) {
		const p = findPanel(tx, a);
		if (!p.outline) throw new Error('Not an overlay piece');
		for (const t of tx.doc.trims) if (t.on.includes(p.outline)) { const keep = t.on.filter((x) => x !== p.outline); if (keep.length) tx.set(['trims', t.id, 'on'], keep); else tx.remove('trims', t.id); }
		const layer = tx.doc.layers.find((l) => l.id === p.layer);
		tx.remove('panels', p.id);
		if (tx.doc.curves.some((c) => c.id === p.outline)) tx.remove('curves', p.outline);
		if (layer?.bounds) tx.exec({ op: 'layer.remove', id: layer.id });
		tx.noInherit = true;
	},
});

// --- layers ----------------------------------------------------------------------------------------
// The shell (L0) is the garment itself; overlays are pieces drawn over it (lace wrap pieces, sashes,
// appliqué), linings are shapes seen through sheer panels (a bandeau under mesh). Each layer is cut
// by its own lines (curve.add with layer) and filled by its own panels (panel.add with layer).

defineCommand('layer.add', {
	label: 'Add layer', args: '{ kind: overlay|lining, name? }',
	run(tx, a) {
		oneOf('kind', a.kind, ['overlay', 'lining']);
		const zs = tx.doc.layers.map((l) => l.z ?? 0);
		const z = a.kind === 'overlay' ? Math.max(0, ...zs) + 1 : Math.min(0, ...zs) - 1;
		const id = tx.newId('L');
		tx.insert('layers', { id, kind: a.kind, z, name: a.name ?? (a.kind === 'overlay' ? 'Overlay' : 'Lining') });
		return id;
	},
});

defineCommand('layer.remove', {
	label: 'Remove layer', args: '{ id } (its lines and panels go with it)',
	run(tx, a) {
		if (a.id === 'L0') throw new Error('The shell layer cannot be removed');
		if (!tx.doc.layers.some((l) => l.id === a.id)) throw new Error('No layer ' + a.id);
		for (const c of tx.doc.curves.filter((c) => c.layer === a.id).map((c) => c.id)) tx.remove('curves', c);
		for (const p of tx.doc.panels.filter((p) => p.layer === a.id).map((p) => p.id)) tx.remove('panels', p);
		tx.remove('layers', a.id);
	},
});

// --- straps ------------------------------------------------------------------------------------------
// A strap is a path line (role strap-path; mirrored by default) plus a width and a fabric. Draw it
// from edge to edge (or across an opening); where it leaves the garment it lies on the skin.

defineCommand('strap.add', {
	label: 'Add strap', args: '{ path: curveId | points: [spec | { at, kind, on }], width? (m, default 0.01), fabric?, colour?, second?, texture?, edge?: elastic|binding|none, mirror?: both|none, layer? (stacking order) }',
	run(tx, a) {
		let path = a.path;
		if (!path) {
			if (!Array.isArray(a.points) || a.points.length < 2) throw new Error('A strap needs a path line or at least two points');
			path = tx.exec({ op: 'curve.add', role: 'strap-path', points: a.points, mirror: a.mirror ?? 'both', name: a.name ?? 'Strap' });
		} else findCurve(tx, path);
		const width = a.width ?? 0.01;
		if (!(width > 0.002 && width < 0.08)) throw new Error('Strap width is in metres, between 0.002 and 0.08');
		if (a.fabric !== undefined) oneOf('fabric', a.fabric, Object.keys(FABRICS));
		const id = tx.newId('s');
		tx.insert('straps', {
			id, path, width, edge: a.edge ?? 'elastic', layer: a.layer ?? tx.doc.straps.length,
			fabric: { fabric: a.fabric ?? 'matte', colour: a.colour ?? '#222222', second: a.second ?? 'Tone-on-tone', ...(a.texture ? { texture: a.texture } : {}) },
		});
		return id;
	},
});

defineCommand('strap.set', {
	label: 'Change strap', args: '{ id, width?, fabric?, colour?, second?, texture?, edge?, layer? }',
	run(tx, a) {
		const s = tx.doc.straps.find((x) => x.id === a.id);
		if (!s) throw new Error('No strap ' + a.id);
		if (a.width !== undefined) tx.set(['straps', a.id, 'width'], a.width);
		if (a.edge !== undefined) { oneOf('edge', a.edge, ['elastic', 'binding', 'none']); tx.set(['straps', a.id, 'edge'], a.edge); }
		if (a.layer !== undefined) tx.set(['straps', a.id, 'layer'], a.layer);
		if (a.fabric !== undefined) oneOf('fabric', a.fabric, Object.keys(FABRICS));
		if (s.fabric?.material && tx.doc.materials.some((m) => m.id === s.fabric.material)) setLook(tx, s.fabric.material, a);
		else for (const k of LOOK) if (a[k] !== undefined) tx.set(['straps', a.id, 'fabric', k], a[k] === null ? undefined : a[k]);
	},
});

defineCommand('strap.remove', {
	label: 'Delete strap', args: '{ id } (its path line goes too when nothing else uses it)',
	run(tx, a) {
		const s = tx.doc.straps.find((x) => x.id === a.id);
		if (!s) throw new Error('No strap ' + a.id);
		tx.remove('straps', a.id);
		const c = tx.doc.curves.find((x) => x.id === s.path);
		if (c && c.role === 'strap-path' && !tx.doc.straps.some((x) => x.path === s.path)) tx.remove('curves', s.path);
	},
});

// --- bands ---------------------------------------------------------------------------------------------
// A band is a panel along an edge: a mock neck or stand collar above a neckline, a cuff below a
// sleeve end. The edge becomes the band's seam and a new edge is drawn `height` further into the
// opening; the strip between them is the band panel (its own fabric).

defineCommand('band.add', {
	label: 'Add band', args: '{ on: edgeCurveId, height? (m; 0.035 neck, 0.02 cuff), fabric?, colour?, second?, name? }',
	run(tx, a) {
		const c = findCurve(tx, a.on);
		if (c.role !== 'edge') throw new Error('A band goes on an edge line (an opening), not a ' + c.role);
		const ctx = ctxOf(tx), surf = ctx.surf, ev = ctx.evaluated?.get(c.id), g = ctx.garment(c.layer ?? 'L0');
		if (!ev || !g) throw new Error('The garment is not built yet');
		const h = a.height ?? (c.name === 'Cuff' ? 0.02 : 0.035);
		const isFabric = (sp) => { const id = panelAt(g, tx.doc, surf, sp); const p = id && tx.doc.panels.find((x) => x.id === id); return !!p && !p.removed; };
		const offset = (si, dist) => {
			const n = ev.pts.length, p = ev.pts[si], t = ev.pts[Math.min(si + 1, n - 1)].clone().sub(ev.pts[Math.max(si - 1, 0)]).normalize();
			const nn = surf.faceNormal(ev.sps[si].f), m = nn.clone().cross(t).normalize();
			const probe = surf.closest(p.clone().addScaledVector(m, 0.004));
			const sign = probe && isFabric(probe) ? -1 : 1; // go into the opening
			return projectNear(surf, p.clone().addScaledVector(m, sign * dist), ev.sps[si].f, {});
		};
		const pts = ev.ctrlIndex.map((si) => ({ sp: toSP(offset(si, h)), kind: 'smooth' }));
		const id = tx.newId('c');
		tx.insert('curves', { id, layer: c.layer ?? 'L0', role: 'edge', name: (c.name || 'Edge') + ' band', closed: c.closed, mirror: c.mirror ?? 'none', shape: { mod: 'none', amp: 0, period: 0 }, points: pts });
		tx.set(['curves', c.id, 'role'], 'seam');
		const seed = toSP(offset(ev.ctrlIndex[0], h / 2));
		const pid = tx.newId('p');
		tx.insert('panels', { id: pid, layer: c.layer ?? 'L0', name: a.name ?? 'Band', seed, mirror: c.mirror === 'both' ? 'both' : 'none', stack: [{ fabric: a.fabric ?? 'matte', colour: a.colour ?? '#222222', second: a.second ?? 'Tone-on-tone' }] });
		// the old edge's finish moves to the band's new edge
		for (const t of tx.doc.trims) if (t.on.includes(c.id)) tx.set(['trims', t.id, 'on'], t.on.map((x) => (x === c.id ? id : x)));
		return { curve: id, panel: pid };
	},
});

// --- hardware ------------------------------------------------------------------------------------------

defineCommand('hardware.add', {
	label: 'Add hardware', args: '{ kind: clear-hook|hook-and-bar|zip-pull, at: spec, angle? (radians from the body horizontal), mirror?: none|both }',
	run(tx, a) {
		oneOf('kind', a.kind, ['clear-hook', 'hook-and-bar', 'zip-pull']);
		const id = tx.newId('h');
		tx.insert('hardware', { id, kind: a.kind, at: toSP(resolvePoint(a.at, ctxOf(tx))), angle: a.angle ?? 0, mirror: a.mirror ?? 'none' });
		return id;
	},
});

defineCommand('hardware.remove', {
	label: 'Delete hardware', args: '{ id }',
	run(tx, a) { if (!tx.doc.hardware.some((h) => h.id === a.id)) throw new Error('No hardware ' + a.id); tx.remove('hardware', a.id); },
});
