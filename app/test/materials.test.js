// The construction model (owner, 2026-10-31): every part is cut from a named material; an overlay
// piece is appliqué on a whole base piece, and the pattern says so; mirrored pieces stay paired.
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import * as THREE from 'three';
import { DocumentStore } from '../src/doc/store.js';
import { newDocument, migrate } from '../src/doc/schema.js';
import '../src/doc/commands-garment.js';
import '../src/doc/commands-stones.js';
import '../src/doc/commands-decals.js';
import '../src/doc/symmetry.js';
import { LOOK, lookHolders, usage, parseHex } from '../src/doc/materials.js';
import { buildGarment, evaluateAll, inheritPanels } from '../src/garment/build.js';
import { TRIMS, trimAtWidth } from '../src/garment/trim.js';
import { offsetEdges } from '../src/garment/pattern.js';
import { toSP, fromSP } from '../src/body/surface.js';
import { loadBody } from './helpers.js';

let surf, man;
beforeAll(async () => { ({ surf, man } = await loadBody()); }, 120000);

const DESIGN = path.resolve('designs/Untitled.json');
// a plain leotard, every piece in one fabric
function store() {
	const s = new DocumentStore(newDocument('t'));
	s.ctx = { surf, man, landmarks: {}, get doc() { return s.doc; } };
	s.exec({ op: 'block.apply', neck: 'crew', back: 'crew', sleeves: 'long', leg: 'standard', fabric: 'matte', colour: '#112233' });
	return s;
}
const hit = (x, y) => surf.raycast(new THREE.Ray(new THREE.Vector3(x, y, 0.4), new THREE.Vector3(0, 0, -1)), {});
const outline = (pts) => pts.map(([x, y]) => ({ at: { sp: toSP(hit(x, y)) }, kind: 'smooth' }));
const plate = () => outline([[0.03, 1.27], [0.1, 1.24], [0.11, 1.14], [0.03, 1.08]]);

// every look equals its material: the invariant the renderer and the pattern rely on
function expectInSync(doc) {
	for (const [, look] of lookHolders(doc)) {
		const m = doc.materials.find((x) => x.id === look.material);
		expect(m, 'a look with no material').toBeTruthy();
		for (const k of LOOK) expect(look[k]).toEqual(m[k]);
	}
}

describe('materials', () => {
	it('a design from before materials: identical looks become one material', () => {
		const d = JSON.parse(fs.readFileSync(DESIGN, 'utf8'));
		delete d.materials;
		const looks = new Set(d.panels.map((p) => JSON.stringify([p.stack[0].fabric, p.stack[0].colour])));
		const doc = migrate(d);
		expect(doc.materials.length).toBe(looks.size);
		expectInSync(doc);
		expect(new Set(doc.materials.map((m) => m.name)).size).toBe(doc.materials.length);
	});
	it('changing one piece changes everything cut from the same material, as one undo step', () => {
		const s = store(), p = s.doc.panels[0], id = p.stack[0].material, n = usage(s.doc).get(id).piece;
		expect(n).toBeGreaterThan(1);
		const steps = s.undoStack.length;
		s.exec({ op: 'panel.set', id: p.id, colour: '#c58fa6' });
		expect(s.doc.panels.filter((q) => q.stack[0].colour === '#c58fa6').length).toBe(n);
		expect(s.doc.materials.find((m) => m.id === id).colour).toBe('#c58fa6');
		expectInSync(s.doc);
		expect(s.undoStack.length).toBe(steps + 1);
		s.undo();
		expect(s.doc.panels.some((q) => q.stack[0].colour === '#c58fa6')).toBe(false);
		expectInSync(s.doc);
	});
	it('grain, gradient and print stay the piece\'s own', () => {
		const s = store(), [a, b] = s.doc.panels;
		s.exec({ op: 'panel.set', id: a.id, grain: 0.5 });
		expect(a.stack[0].grain).toBe(0.5);
		expect(b.stack[0].grain).toBeUndefined();
	});
	it('a separated piece no longer follows the others; a new piece joins by being assigned', () => {
		const s = store(), [a, b] = s.doc.panels, was = a.stack[0].material;
		const own = s.exec({ op: 'panel.separate', id: a.id });
		expect(own).not.toBe(was);
		s.exec({ op: 'panel.set', id: a.id, colour: '#123456' });
		expect(b.stack[0].colour).not.toBe('#123456');
		s.exec({ op: 'panel.material', id: a.id, material: was });
		expect(a.stack[0].colour).toBe(b.stack[0].colour);
		expectInSync(s.doc);
	});
	it('a finish takes the whole look of its material, and a material in use cannot be deleted', () => {
		const s = store(), c = s.doc.curves.find((x) => x.role === 'seam'), m = s.exec({ op: 'material.add', fabric: 'satinduo', colour: '#223344', colour2: '#aabbcc', name: 'Duo' });
		s.exec({ op: 'trim.set', on: c.id, kind: 'piping', material: m, width: 0.004 });
		const t = s.doc.trims.find((x) => x.on.includes(c.id));
		expect(t.fabric.colour2).toBe('#aabbcc');
		expect(t.width).toBe(0.004);
		expect(() => s.exec({ op: 'material.remove', id: m })).toThrow();
		s.exec({ op: 'material.set', id: m, colour: '#010203' });
		expect(s.doc.trims.find((x) => x.on.includes(c.id)).fabric.colour).toBe('#010203');
		expectInSync(s.doc);
	});
	it('Mirror off: a new colour on one side of a pair is that side\'s own', () => {
		const s = store(), p = s.doc.panels.find((x) => x.mirror === 'both');
		s.doc.symmetry = false;
		const before = p.stack[0].colour;
		const r = s.exec({ op: 'sym.edit', cmd: { op: 'panel.set', id: p.id, colour: '#0a0b0c' } });
		expect(r.split).toBe(true);
		const other = s.doc.panels.find((x) => x.id === s.doc.panels.find((q) => q.id === r.id).twin);
		expect(s.doc.panels.find((q) => q.id === r.id).stack[0].colour).toBe('#0a0b0c');
		expect(other.stack[0].colour).toBe(before);
		expectInSync(s.doc);
	});
});

describe('finish widths', () => {
	it('a chosen width scales the finish across the edge', () => {
		const T = trimAtWidth('binding', TRIMS.binding.width / 2);
		expect(T.width).toBeCloseTo(TRIMS.binding.width / 2);
		expect(T.profile[4][0]).toBeCloseTo(TRIMS.binding.profile[4][0] / 2);
		expect(T.profile[4][1]).toBe(TRIMS.binding.profile[4][1]); // flat cloth keeps its height
		expect(trimAtWidth('piping', TRIMS.piping.width * 2).profile[3][1]).toBeCloseTo(TRIMS.piping.profile[3][1] * 2); // a cord is round
		expect(trimAtWidth('elastic')).toBe(TRIMS.elastic);
	});
});

describe('overlay pieces (appliqué)', () => {
	it('leaves the fabric under it whole, on both sides, with a thin stitched edge', () => {
		const s = store(), before = buildGarment(s.doc, surf, { layer: 'L0' }).arr.cells.length;
		const id = s.exec({ op: 'overlay.add', mirror: 'both', points: plate(), name: 'Chest plate' });
		const p = s.doc.panels.find((x) => x.id === id), layer = s.doc.layers.find((l) => l.id === p.layer);
		expect(layer.kind).toBe('overlay');
		expect(p.mirror).toBe('both');
		expect(buildGarment(s.doc, surf, { layer: 'L0' }).arr.cells.length).toBe(before); // the base is not cut
		const g = buildGarment(s.doc, surf, { layer: p.layer });
		const cells = new Set(g.seeds.filter((x) => x.panel === id).map((x) => x.cell));
		expect(cells.size).toBe(2); // one on each side
		for (const c of cells) expect(g.arr.cells[c].area).toBeLessThan(0.03);
		const t = s.doc.trims.find((x) => x.on.includes(p.outline));
		expect(t.kind).toBe('zigzag');
		expectInSync(s.doc);
	});
	it('a second overlay in the same layer finds its own shape; deleting takes its outline and finish', () => {
		const s = store(), a = s.exec({ op: 'overlay.add', mirror: 'both', points: plate() });
		const b = s.exec({ op: 'overlay.add', mirror: 'none', points: outline([[-0.03, 1.02], [0.03, 1.02], [0.03, 0.96], [-0.03, 0.96]]), name: 'Centre' });
		const g = buildGarment(s.doc, surf, { layer: s.doc.panels.find((x) => x.id === a).layer });
		const cellsOf = (id) => new Set(g.seeds.filter((x) => x.panel === id).map((x) => x.cell));
		expect([...cellsOf(a)].some((c) => cellsOf(b).has(c))).toBe(false);
		const line = s.doc.panels.find((x) => x.id === b).outline;
		s.exec({ op: 'overlay.remove', id: b });
		expect(s.doc.panels.some((x) => x.id === b)).toBe(false);
		expect(s.doc.curves.some((c) => c.id === line)).toBe(false);
		expect(s.doc.trims.some((t) => t.on.includes(line))).toBe(false);
	});
});

describe('overlay pieces that use existing seams', () => {
	// from the waist seam up to the armhole, on the wearer's left: the piece is what lies outside the line
	function stroke(s) {
		const ev = evaluateAll(s.doc, surf, null, null), named = (n) => s.doc.curves.find((c) => c.name === n);
		const near = (c, x, y) => { const e = ev.get(c.id); let b = 0, bd = Infinity; e.pts.forEach((p, i) => { const d = (p.x - x) ** 2 + (p.y - y) ** 2 + (p.z < 0 ? 1 : 0); if (d < bd) { bd = d; b = i; } }); return { i: b, e, t: e.s[b] / e.length }; };
		const end = (c, x, y) => { const n = near(c, x, y); return { at: { sp: toSP(n.e.sps[n.i]) }, kind: 'corner', on: { curve: c.id, t: n.t } }; };
		return [end(named('Waist seam'), 0.03, 1.0), { at: { sp: toSP(hit(0.05, 1.15)) }, kind: 'smooth' }, end(named('Armhole') ?? named('Raglan seam (front)'), 0.11, 1.28)];
	}
	const open = () => { const s = store(); s.exec({ op: 'block.apply', neck: 'high', back: 'crew', sleeves: 'tank', strap: 'racer', leg: 'high', waist: 'straight', fabric: 'wet', colour: '#b98aa2' }); return s; };

	it('fills the chosen side, on both sides of the body, bounded by the lines the side touches', () => {
		const s = open(), before = buildGarment(s.doc, surf, { layer: 'L0' }).arr.cells.length;
		const id = s.exec({ op: 'overlay.add', mirror: 'both', points: stroke(s), at: { sp: toSP(hit(0.1, 1.12)) }, name: 'Plate' });
		const p = s.doc.panels.find((x) => x.id === id), layer = s.doc.layers.find((l) => l.id === p.layer);
		expect(layer.bounds.length).toBeGreaterThan(1);
		expect(layer.bounds).toContain(s.doc.curves.find((c) => c.name === 'Waist seam').id);
		expect(buildGarment(s.doc, surf, { layer: 'L0' }).arr.cells.length).toBe(before); // the base stays whole
		const g = buildGarment(s.doc, surf, { layer: p.layer }), cells = new Set(g.seeds.filter((x) => x.panel === id).map((x) => x.cell));
		expect(cells.size).toBe(2);
		for (const c of cells) { expect(g.arr.cells[c].area).toBeGreaterThan(0.002); expect(g.arr.cells[c].area).toBeLessThan(0.04); }
		expectInSync(s.doc);
	});
	it('refuses an opening, and a line that does not divide the fabric', () => {
		const s = open();
		expect(() => s.exec({ op: 'overlay.add', mirror: 'both', points: stroke(s), at: { sp: toSP(surf.closest(new THREE.Vector3(0.0, 1.5, 0.05), {})) } })).toThrow();
	});
	it('goes with the seam it depends on, and when its own line is deleted', () => {
		const s = open(), id = s.exec({ op: 'overlay.add', mirror: 'both', points: stroke(s), at: { sp: toSP(hit(0.1, 1.12)) } });
		const line = s.doc.panels.find((x) => x.id === id).outline, layers = s.doc.layers.length;
		s.exec({ op: 'curve.remove', id: line });
		expect(s.doc.panels.some((x) => x.id === id)).toBe(false);
		expect(s.doc.layers.length).toBe(layers - 1);
		s.undo();
		const waist = s.doc.curves.find((c) => c.name === 'Waist seam').id;
		s.exec({ op: 'curve.remove', id: waist });
		expect(s.doc.panels.some((x) => x.id === id)).toBe(false);
	});
	it('two such pieces do not slice each other', () => {
		const s = open(), a = s.exec({ op: 'overlay.add', mirror: 'both', points: stroke(s), at: { sp: toSP(hit(0.1, 1.12)) } });
		const b = s.exec({ op: 'overlay.add', mirror: 'none', points: outline([[-0.03, 0.98], [0.03, 0.98], [0.03, 0.9], [-0.03, 0.9]]), name: 'Centre' });
		const pb = s.doc.panels.find((x) => x.id === b), pa = s.doc.panels.find((x) => x.id === a);
		expect(pb.layer).not.toBe(pa.layer); // the bounded piece's layer is its own
	});
});

describe('edge allowances per stretch', () => {
	it('offsets each edge by its own distance, none where it has none', () => {
		const square = [[0, 0], [100, 0], [100, 100], [0, 100]];
		const out = offsetEdges(square, [6, 0, 0, 0]); // only the bottom edge grows
		expect(out[0]).toEqual([0, -6]);
		expect(out[1]).toEqual([100, -6]);
		expect(out[2]).toEqual([100, 100]);
		expect(out[3]).toEqual([0, 100]);
	});
});

describe('pairing', () => {
	it('a mirrored shape round the seed of the piece it cuts pairs its two sides', () => {
		const s = store(), front = s.doc.panels.find((p) => p.name === 'Front');
		expect(surf.pos(fromSP(front.seed)).x).toBeGreaterThan(0.05); // the case: the seed is off-centre
		const prev = buildGarment(s.doc, surf, { layer: 'L0' });
		s.exec({ op: 'curve.add', role: 'seam', closed: true, mirror: 'both', points: outline([[0.03, 1.27], [0.115, 1.24], [0.115, 1.1], [0.03, 1.05]]) });
		const g = buildGarment(s.doc, surf, { prev, layer: 'L0', evaluated: evaluateAll(s.doc, surf, null, null) });
		const add = inheritPanels(g, prev, s.doc, surf);
		expect(add.filter((p) => p.pair)).toEqual([{ pair: front.id }]);
		const rest = add.filter((p) => !p.pair);
		expect(rest).toHaveLength(1); // what is left of the front
		expect(rest[0].name).toBe('Front 2'); // named apart: the pattern lists pieces by name
	});
});

describe('colour codes', () => {
	it('reads the ways a code is written, and refuses what is none', () => {
		expect(parseHex('#C58FA6')).toBe('#c58fa6');
		expect(parseHex('c58fa6')).toBe('#c58fa6');
		expect(parseHex(' #abc ')).toBe('#aabbcc');
		for (const bad of ['', '#12', '#12345', 'mauve', '#gggggg']) expect(parseHex(bad)).toBeNull();
	});
});
