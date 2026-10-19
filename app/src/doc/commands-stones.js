// Stone commands: live generators (they re-run when the lines and panels they follow change),
// single stones, the eraser, and releasing a generator into single stones for hand finishing.
import { defineCommand } from './store.js';
import { resolvePoint } from '../curves/points.js';
import { toSP } from '../body/surface.js';
import { sizeOf, parseStone, SHAPES } from '../stones/library.js';
import { GENERATOR_KINDS } from '../stones/generators.js';

function gen(tx, id) {
	const g = tx.doc.stones.find((x) => x.id === id);
	if (!g) throw new Error('No stone generator ' + id + '. Generators: ' + (tx.doc.stones.map((x) => x.id).join(', ') || 'none'));
	return g;
}
function checkStones(a) {
	for (const n of [a.stone, ...(a.palette ?? []).map((p) => p.stone), ...(a.colourRamp ?? []), a.nodeStone, a.fillStone].filter(Boolean)) parseStone(n);
	if (a.shape && !SHAPES[a.shape]) throw new Error('Unknown stone shape ' + a.shape + '. Shapes: ' + Object.keys(SHAPES).join(', '));
	const p = a.params ?? {};
	for (const s of [p.size, ...(p.sizes ?? []).map((x) => (typeof x === 'object' ? x.size : x)), p.sizeFrom, p.sizeTo, p.stoneSize, p.fillSize, p.nodeSize, ...(p.sizeRamp ?? [])].filter((x) => x !== undefined)) sizeOf(s);
}

defineCommand('stones.add', {
	label: 'Add stones', args: '{ kind: row|fill|scatter|rays|motif|lattice|cluster, on?: { curve | strap | panel }, at?: spec, params: {...}, stone?: name | palette?: [{ stone, weight }], colourRamp?: [names], shape?: round|navette|pear|..., mirror?: none|both, seed?, name? }',
	run(tx, a) {
		if (!GENERATOR_KINDS.includes(a.kind)) throw new Error('kind must be one of: ' + GENERATOR_KINDS.join(', '));
		checkStones(a);
		const at = a.at ? toSP(resolvePoint(a.at, tx.ctx)) : undefined;
		const id = tx.newId('g');
		tx.insert('stones', {
			id, kind: a.kind, name: a.name ?? '', on: a.on ?? null, ...(at ? { at: { sp: at } } : {}),
			params: a.params ?? {}, stone: a.stone ?? (a.palette ? undefined : 'Crystal AB'), palette: a.palette ?? null, colourRamp: a.colourRamp ?? null,
			shape: a.shape ?? 'round', mirror: a.mirror ?? 'none', seed: a.seed ?? (tx.doc.stones.length * 7919 + 13), ...(a.layer ? { layer: a.layer } : {}),
			...(a.nodeStone ? { nodeStone: a.nodeStone } : {}), ...(a.fillStone ? { fillStone: a.fillStone } : {}),
		});
		return id;
	},
});

defineCommand('stones.set', {
	label: 'Change stones', args: '{ id, params?: {...merged}, stone?, palette?, colourRamp?, shape?, mirror?, seed?, on?, at?, hidden?, name? }',
	run(tx, a) {
		const g = gen(tx, a.id);
		checkStones({ ...g, ...a, params: { ...g.params, ...(a.params ?? {}) } });
		if (a.params) tx.set(['stones', a.id, 'params'], { ...g.params, ...a.params });
		for (const k of ['stone', 'palette', 'colourRamp', 'shape', 'mirror', 'seed', 'on', 'hidden', 'name', 'nodeStone', 'fillStone']) if (a[k] !== undefined) tx.set(['stones', a.id, k], a[k]);
		if (a.at) tx.set(['stones', a.id, 'at'], { sp: toSP(resolvePoint(a.at, tx.ctx)) });
	},
});

defineCommand('stones.remove', {
	label: 'Delete stones', args: '{ id }',
	run(tx, a) { gen(tx, a.id); tx.remove('stones', a.id); },
});

// The eraser: stones of every generator within r of the point are dropped (marks stay editable).
defineCommand('stones.erase', {
	label: 'Erase stones', args: '{ at: spec, r? (m, default 0.004), id? (one generator only) }',
	run(tx, a) {
		const sp = toSP(resolvePoint(a.at, tx.ctx)), r = a.r ?? 0.004;
		const targets = a.id ? [gen(tx, a.id)] : tx.doc.stones;
		for (const g of targets) tx.set(['stones', g.id, 'erase'], [...(g.erase ?? []), { sp, r }]);
		for (const p of tx.doc.placed.filter((p) => tx.ctx.surf.pos(fromSPc(p.sp)).distanceTo(tx.ctx.surf.pos(fromSPc(sp))) < r)) tx.remove('placed', p.id);
	},
});
const fromSPc = (sp) => ({ f: sp.f, b0: 1 - sp.b[0] - sp.b[1], b1: sp.b[0], b2: sp.b[1] });

defineCommand('stone.place', {
	label: 'Place stone', args: '{ at: spec, size?: ss16, stone?: name, shape?, angle? (radians), mirror?: none|both }',
	run(tx, a) {
		parseStone(a.stone ?? 'Crystal AB'); sizeOf(a.size ?? 'ss16');
		const sp = toSP(resolvePoint(a.at, tx.ctx)), ids = [];
		const add = (s) => { const id = tx.newId('x'); tx.insert('placed', { id, sp: s, size: a.size ?? 'ss16', stone: a.stone ?? 'Crystal AB', shape: a.shape ?? 'round', angle: a.angle ?? 0 }); ids.push(id); };
		add(sp);
		if (a.mirror === 'both') add(toSP(resolvePoint({ mirror: { sp } }, tx.ctx)));
		return ids.length === 1 ? ids[0] : ids;
	},
});

defineCommand('stone.remove', {
	label: 'Delete stone', args: '{ id }',
	run(tx, a) { if (!tx.doc.placed.some((p) => p.id === a.id)) throw new Error('No stone ' + a.id); tx.remove('placed', a.id); },
});

// Freeze a generator into single stones (they no longer follow line edits).
defineCommand('stones.release', {
	label: 'Release to stones', args: '{ id }',
	run(tx, a) {
		gen(tx, a.id);
		const list = tx.ctx.stonesOf?.(a.id) ?? [];
		for (const s of list) tx.insert('placed', { id: tx.newId('x'), sp: toSP(s.sp), size: s.size, stone: s.stone, shape: s.shape, angle: s.angle, ...(s.lift ? { lift: s.lift } : {}) });
		tx.remove('stones', a.id);
		return list.length;
	},
});
