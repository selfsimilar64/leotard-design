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
import { buildGarment, evaluateAll, inheritPanels, strokeId } from '../src/garment/build.js';
import { locate } from '../src/garment/arrangement.js';
import { TRIMS, trimAtWidth } from '../src/garment/trim.js';
import { cleanOutline, offsetEdges, outlineCorners, smoothRun } from '../src/garment/pattern.js';
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
	// a line from the waist seam (nearest x) up to the armhole (nearest [xTop, yTop]), on either side
	function edge(s, x, xTop, yTop, sign = 1) {
		const ev = evaluateAll(s.doc, surf, null, null), named = (n) => s.doc.curves.find((c) => c.name === n);
		const end = (c, px, py) => {
			let best = null, bd = Infinity;
			for (const key of [c.id, c.id + '~m']) { const e = ev.get(key); if (e) e.pts.forEach((p, i) => { const d = (p.x - px) ** 2 + (p.y - py) ** 2 + (p.z < 0 ? 1 : 0); if (d < bd) { bd = d; best = { at: { sp: toSP(e.sps[i]) }, kind: 'corner', on: { curve: c.id, t: e.s[i] / e.length, ...(key.endsWith('~m') ? { mirror: true } : {}) } }; } }); }
			return best;
		};
		return [end(named('Waist seam'), sign * x, 1.065), end(named('Armhole'), sign * xTop, yTop)];
	}
	const covers = (s, id, xs, y) => { const p = s.doc.panels.find((q) => q.id === id), g = buildGarment(s.doc, surf, { layer: p.layer }), cells = new Set(g.seeds.filter((q) => q.panel === id).map((q) => q.cell)); return xs.filter((x) => { const h = hit(x, y), t = h ? locate(g.arr, surf, h) : -1; return t >= 0 && cells.has(g.arr.cellOf[t]); }); };
	const XS = [-14, -12, -10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10, 12, 14].map((x) => x / 100);

	it('takes any side with fabric, not only the side a piece\'s seed falls on', () => {
		for (const x of [0.1, -0.1, 0]) {
			const s = open(), id = s.exec({ op: 'overlay.add', mirror: 'both', points: stroke(s), at: { sp: toSP(hit(x, 1.12)) } });
			expect(id).toBeTruthy();
			expect(buildGarment(s.doc, surf, { layer: s.doc.panels.find((p) => p.id === id).layer }).seeds.some((q) => q.cell >= 0)).toBe(true);
		}
	});
	it('is a mirror image whatever the click: a click close to the line cannot land across it', () => {
		for (const x of [0.042, 0.06, 0.1]) {
			const s = open(), id = s.exec({ op: 'overlay.add', mirror: 'both', points: stroke(s), at: { sp: toSP(hit(x, 1.12)) } });
			const on = covers(s, id, XS, 1.12), other = on.filter((v) => !on.includes(-v));
			expect(other.length).toBeLessThanOrEqual(1); // (a sample right on the line can fall either way)
			expect(on.some((v) => v > 0) && on.some((v) => v < 0)).toBe(true);
			expect(s.doc.panels.find((p) => p.id === id).mirror).toBe('both');
		}
	});
	it('is one piece, not a pair, when the area lies across the centre', () => {
		const s = open(), id = s.exec({ op: 'overlay.add', mirror: 'both', points: stroke(s), at: { sp: toSP(hit(0, 1.12)) } });
		const p = s.doc.panels.find((q) => q.id === id);
		expect(p.mirror).toBe('none');
		expect(covers(s, id, XS, 1.12)).toContain(0);
	});
	it('makes a plate from two drawn lines and the seams between them, in one step', () => {
		const s = open(), before = s.doc.curves.length;
		const id = s.exec({ op: 'overlay.add', at: { sp: toSP(hit(0.07, 1.12)) }, strokes: [{ mirror: 'both', points: edge(s, 0.03, 0.11, 1.29) }, { mirror: 'both', points: edge(s, 0.09, 0.132, 1.243) }], name: 'Plate' });
		const p = s.doc.panels.find((q) => q.id === id), layer = s.doc.layers.find((l) => l.id === p.layer), own = s.doc.curves.filter((c) => c.layer === p.layer);
		expect(own.length).toBe(2);
		expect(s.doc.curves.length).toBe(before + 2);
		expect(layer.bounds).toContain(s.doc.curves.find((c) => c.name === 'Waist seam').id);
		expect(layer.bounds).toContain(s.doc.curves.find((c) => c.name === 'Armhole').id);
		expect(p.mirror).toBe('both');
		const on = covers(s, id, XS, 1.12);
		expect(on).toContain(0.06); expect(on).toContain(-0.06);
		expect(on).not.toContain(0); expect(on).not.toContain(0.12);
		// both drawn lines are stitched, by one finish; the seams are not
		const t = s.doc.trims.find((x) => x.on.includes(own[0].id));
		expect(t.kind).toBe('zigzag');
		expect(t.on).toContain(own[1].id);
		expectInSync(s.doc);
		// it goes with either of its lines, and takes the other with it
		s.exec({ op: 'curve.remove', id: own[1].id });
		expect(s.doc.panels.some((q) => q.id === id)).toBe(false);
		expect(s.doc.curves.length).toBe(before);
		expect(s.doc.layers.some((l) => l.id === p.layer)).toBe(false);
	});
	it('with Mirror off, one line and one side only', () => {
		const s = open(), id = s.exec({ op: 'overlay.add', at: { sp: toSP(hit(0.1, 1.12)) }, strokes: [{ mirror: 'none', points: edge(s, 0.03, 0.11, 1.29) }] });
		const p = s.doc.panels.find((q) => q.id === id), on = covers(s, id, XS, 1.12);
		expect(p.mirror).toBe('none');
		expect(on.some((v) => v > 0)).toBe(true);
		expect(on.some((v) => v < 0)).toBe(false);
	});
	it('keeps only the drawn lines round the area; a line ending on a dropped one stays where it is', () => {
		const s = open(), a = edge(s, 0.03, 0.11, 1.29), b = edge(s, 0.09, 0.132, 1.243), far = edge(s, 0.01, 0.101, 1.319);
		const id = s.exec({ op: 'overlay.add', at: { sp: toSP(hit(0.07, 1.12)) }, strokes: [{ mirror: 'both', points: far }, { mirror: 'both', points: a }, { mirror: 'both', points: b }] });
		expect(s.doc.curves.filter((c) => c.layer === s.doc.panels.find((p) => p.id === id).layer).length).toBe(2);
	});
	it('lets a line end on an earlier one: three lines make a triangle', () => {
		const s = open(), a = edge(s, 0.03, 0.11, 1.29);
		// from the waist seam, up to the first line
		const ev = evaluateAll({ ...s.doc, curves: [...s.doc.curves, { id: strokeId(0), layer: '__', role: 'edge', closed: false, mirror: 'both', shape: { mod: 'none', amp: 0, period: 0 }, points: a.map((p) => ({ sp: p.at.sp, kind: p.kind, on: p.on })) }] }, surf, null, null).get(strokeId(0));
		const mid = Math.floor(ev.sps.length / 2), b = [edge(s, 0.09, 0.132, 1.243)[0], { at: { sp: toSP(ev.sps[mid]) }, kind: 'corner', on: { curve: strokeId(0), t: ev.s[mid] / ev.length } }];
		const id = s.exec({ op: 'overlay.add', at: { sp: toSP(hit(0.06, 1.1)) }, strokes: [{ mirror: 'both', points: a }, { mirror: 'both', points: b }] });
		const own = s.doc.curves.filter((c) => c.layer === s.doc.panels.find((p) => p.id === id).layer);
		expect(own.length).toBe(2);
		expect(own[1].points[1].on.curve).toBe(own[0].id);
	});
	it('a line touching the centre meets its mirror image there', () => {
		const s = open(), line = edge(s, 0, 0.11, 1.28);
		expect(Math.abs(surf.pos(fromSP(line[0].at.sp)).x)).toBeLessThan(0.002);
		const id = s.exec({ op: 'overlay.add', mirror: 'both', points: line, at: { sp: toSP(hit(0, 1.15)) } });
		const on = covers(s, id, XS, 1.15);
		expect(on).toContain(0);
		expect(on.filter((v) => !on.includes(-v)).length).toBeLessThanOrEqual(1);
		// on each side of that V, one of a pair
		const s2 = open(), id2 = s2.exec({ op: 'overlay.add', mirror: 'both', points: edge(s2, 0, 0.11, 1.28), at: { sp: toSP(hit(0.1, 1.08)) } });
		expect(s2.doc.panels.find((p) => p.id === id2).mirror).toBe('both');
		expect(covers(s2, id2, XS, 1.08)).not.toContain(0);
	});
	it('has its own material, so choosing its fabric cannot change the piece under it', () => {
		const s = open(), front = s.doc.panels.find((p) => p.name === 'Front'), colour = front.stack[0].colour, id = s.exec({ op: 'overlay.add', mirror: 'both', points: stroke(s), at: { sp: toSP(hit(0.1, 1.12)) } });
		const p = s.doc.panels.find((q) => q.id === id);
		expect(p.stack[0].material).not.toBe(front.stack[0].material);
		expect(p.stack[0].fabric).toBe(front.stack[0].fabric);
		s.exec({ op: 'panel.set', id, colour: '#00ff00' });
		expect(s.doc.panels.find((q) => q.id === front.id).stack[0].colour).toBe(colour);
		expectInSync(s.doc);
	});
	it('drops the material made for it if another is chosen, or it is deleted, unless it was changed', () => {
		const s = open(), front = s.doc.panels.find((p) => p.name === 'Front'), n = s.doc.materials.length;
		const a = s.exec({ op: 'overlay.add', mirror: 'both', points: stroke(s), at: { sp: toSP(hit(0.1, 1.12)) } });
		expect(s.doc.materials.length).toBe(n + 1);
		s.exec({ op: 'panel.material', id: a, material: front.stack[0].material });
		expect(s.doc.materials.length).toBe(n);
		s.exec({ op: 'overlay.remove', id: a });
		const b = s.exec({ op: 'overlay.add', mirror: 'both', points: stroke(s), at: { sp: toSP(hit(0.1, 1.12)) } });
		s.exec({ op: 'overlay.remove', id: b });
		expect(s.doc.materials.length).toBe(n);
		const c = s.exec({ op: 'overlay.add', mirror: 'both', points: stroke(s), at: { sp: toSP(hit(0.1, 1.12)) } });
		s.exec({ op: 'panel.set', id: c, colour: '#00ff00' });
		s.exec({ op: 'overlay.remove', id: c });
		expect(s.doc.materials.length).toBe(n + 1);
	});
	it('an attached end moves along its line, and to another line, which the piece then runs up to', () => {
		const s = open(), id = s.exec({ op: 'overlay.add', mirror: 'both', points: stroke(s), at: { sp: toSP(hit(0.1, 1.12)) } });
		const p = s.doc.panels.find((q) => q.id === id), line = s.doc.curves.find((c) => c.id === p.outline), waist = s.doc.curves.find((c) => c.name === 'Waist seam'), ev = evaluateAll(s.doc, surf, null, null);
		const at = (t) => { const e = ev.get(waist.id), i = Math.round(t * (e.sps.length - 1)); return { sp: e.sps[i], t: e.s[i] / e.length }; };
		const next = at(line.points[0].on.t + 0.02);
		s.exec({ op: 'curve.movePoint', id: line.id, i: 0, to: { sp: toSP(next.sp) }, on: { curve: waist.id, t: next.t } });
		expect(s.doc.curves.find((c) => c.id === line.id).points[0].on.t).toBeCloseTo(next.t, 5);
		const side = s.doc.curves.find((c) => c.name === 'Side seam');
		s.exec({ op: 'curve.movePoint', id: line.id, i: 0, to: { sp: toSP(ev.get(side.id).sps[3]) }, on: { curve: side.id, t: 0.1 } });
		expect(s.doc.layers.find((l) => l.id === p.layer).bounds).toContain(side.id);
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

describe('clean pattern outlines', () => {
	const line = (f, a, b, step = 0.7) => { const out = []; for (let x = a; x <= b; x += step) out.push([x, f(x)]); return out; };
	const devFrom = (poly, f) => Math.max(...poly.map(([x, y]) => Math.abs(y - f(x))));
	it('takes a flattening\'s bump out of a line and keeps its ends and its shape', () => {
		const shape = (x) => 40 * Math.sin(x / 80), bump = (x) => 1.5 * Math.exp(-(((x - 120) / 3) ** 2));
		const run = smoothRun(line((x) => shape(x) + bump(x), 0, 240));
		expect(run[0][0]).toBeCloseTo(0, 6); expect(run[0][1]).toBeCloseTo(shape(0) + bump(0), 6);
		expect(run[run.length - 1][1]).toBeCloseTo(shape(239.4) + bump(239.4), 3);
		expect(devFrom(run, shape)).toBeLessThan(0.75); // from 1.5 mm, and no longer a kink:
		const turn = (p, i, k = 5) => { const a = p[i - k], b = p[i], c = p[i + k]; return Math.abs(Math.atan2((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]), (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]))); };
		const raw = line((x) => shape(x) + bump(x), 0, 240, 1), most = (p) => { let m = 0; for (let i = 5; i < p.length - 5; i++) m = Math.max(m, turn(p, i)); return m; };
		expect(most(raw)).toBeGreaterThan(0.5);
		expect(most(run)).toBeLessThan(0.2);
	});
	it('leaves a tight real curve within half a millimetre', () => {
		const R = 15, arc = []; for (let t = 0; t <= Math.PI; t += 0.05) arc.push([R * Math.cos(t), R * Math.sin(t)]);
		const run = smoothRun(arc);
		expect(Math.max(...run.map(([x, y]) => Math.abs(Math.hypot(x, y) - R)))).toBeLessThan(0.5);
	});
	it('keeps corners exactly where they are, and smooths each side of them', () => {
		// a square of 100 mm with a bump on its top edge
		const sq = [...line((x) => 1.5 * Math.exp(-(((x - 50) / 3) ** 2)), 0, 100), ...line((y) => 100 - y, 0, 100).map(([y, x]) => [100 + 0 * x, y]).reverse()];
		const n = sq.length, corners = [0, line((x) => 0, 0, 100).length - 1];
		const out = cleanOutline(sq, corners);
		for (const c of corners) expect(out.some((p) => Math.hypot(p[0] - sq[c][0], p[1] - sq[c][1]) < 1e-6)).toBe(true);
		const top = out.filter((p) => p[1] < 50 && p[0] > 5 && p[0] < 95);
		expect(Math.max(...top.map((p) => Math.abs(p[1])))).toBeLessThan(0.75);
		expect(n).toBeGreaterThan(8);
	});
	it('smooths a loop with no corner, with no mark where it is opened', () => {
		const R = 50, loop = []; for (let i = 0; i < 400; i++) { const t = (i / 400) * Math.PI * 2, r = R + (i === 7 ? 1.2 : 0); loop.push([r * Math.cos(t), r * Math.sin(t)]); }
		const out = cleanOutline(loop, []);
		const dev = out.map(([x, y]) => Math.abs(Math.hypot(x, y) - R));
		expect(Math.max(...dev)).toBeLessThan(0.3);
		const gap = Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]);
		expect(gap).toBeLessThan(2);
		expect(out.length).toBeGreaterThan(280);
	});
	it('finds a corner where the line changes and where the line itself turns, not at a bend', () => {
		// on the body: a long gentle arc in metres, with a sharp corner, then another line
		const P = [], loop = [], names = [];
		const add = (x, y, z, name) => { loop.push([x, y, P.length / 3]); P.push(x, y, z); names.push(name); };
		for (let i = 0; i < 100; i++) { const t = i / 100; add(Math.sin(t) * 0.1, Math.cos(t) * 0.1, 0, 'a'); }
		const k = loop.length;
		for (let i = 0; i < 100; i++) { const t = 1 + i / 100; add(Math.sin(t) * 0.1 - i * 0.0015, Math.cos(t) * 0.1 + i * 0.0015, 0, 'a'); }
		const j = loop.length;
		for (let i = 0; i < 50; i++) add(-0.1 - i * 0.001, 0.2 - i * 0.004, 0, 'b');
		const c = outlineCorners(loop, (i) => names[i], Float32Array.from(P));
		expect(c).toContain(j);
		expect(c.filter((i) => i > 20 && i < 80)).toEqual([]); // the gentle arc
		expect(c.filter((i) => Math.abs(i - k) < 6).length).toBe(1); // the sharp corner, once
		expect(k).toBe(100);
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
