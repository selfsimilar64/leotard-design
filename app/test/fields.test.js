// Per-vertex drawing fields (garment/fields.js): distance to seams, gradients along a direction.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadBody } from './helpers.js';
import { makeBlock } from '../src/garment/blocks.js';
import { buildGarment } from '../src/garment/build.js';
import { cellPiece } from '../src/garment/pieces.js';
import { seamKeys, seamDistance, gradientField, refOf } from '../src/garment/fields.js';
import { newDocument } from '../src/doc/schema.js';

let B, g, doc;
beforeAll(async () => {
	B = await loadBody();
	doc = newDocument('t');
	const blk = makeBlock(B.man, B.surf, { neck: 'crew', sleeves: 'long' });
	doc.curves = blk.curves.map(({ key, ...c }) => ({ id: key, layer: 'L0', ...c }));
	doc.panels = blk.panels.map((p, i) => ({ id: 'p' + (i + 1), layer: 'L0', ...p }));
	g = buildGarment(doc, B.surf);
}, 60000);

describe('seam distance', () => {
	it('is zero on the side seam, grows away from it, and is capped', () => {
		const garment = new Uint8Array(g.arr.cells.length).fill(1);
		const roles = new Map(doc.curves.map((c) => [c.id, c.role]));
		const keys = seamKeys(g.arr, garment, (id) => roles.get(id.replace(/~m$/, '')));
		expect(keys.size).toBeGreaterThan(100);
		// no edge line (neckline, leg line, cuff) is a seam unless fabric is on both sides
		const front = g.seeds[0].cell, piece = cellPiece(g.arr, front);
		const d = seamDistance(g.arr, B.man, front, piece.verts, keys, 0.012);
		let zeros = 0, max = 0;
		for (const v of d) { if (v < 1e-6) zeros++; max = Math.max(max, v); }
		expect(zeros).toBeGreaterThan(20);           // the vertices on the side and shoulder seams
		expect(max).toBeCloseTo(0.012, 6);            // capped far from seams
		// a vertex 5 mm or so from the seam reads about 5 mm: check against brute force
		const p = [0, 0, 0], q = [0, 0, 0], segs = [];
		for (const t of g.arr.cells[front].tris) for (let e = 0; e < 3; e++) {
			const a = g.arr.tris[t * 3 + e], b = g.arr.tris[t * 3 + (e + 1) % 3], nV = g.arr.nV;
			if (keys.has(a < b ? a * nV + b : b * nV + a)) segs.push([[...refOf(g.arr, B.man, a, p)], [...refOf(g.arr, B.man, b, q)]]);
		}
		const brute = (pt) => Math.min(0.012, ...segs.map(([A, Bq]) => {
			const u = [Bq[0] - A[0], Bq[1] - A[1], Bq[2] - A[2]], w = [pt[0] - A[0], pt[1] - A[1], pt[2] - A[2]], L = u[0] ** 2 + u[1] ** 2 + u[2] ** 2;
			const t = L > 0 ? Math.max(0, Math.min(1, (w[0] * u[0] + w[1] * u[1] + w[2] * u[2]) / L)) : 0;
			return Math.hypot(w[0] - t * u[0], w[1] - t * u[1], w[2] - t * u[2]);
		}));
		for (let l = 0; l < piece.verts.length; l += 97) expect(d[l]).toBeCloseTo(brute(refOf(g.arr, B.man, piece.verts[l], [0, 0, 0])), 6);
	});
});

describe('gradient field', () => {
	it('runs 0 to 1 between start and end along an axis', () => {
		const ref = new Float32Array([0, 1.25, 0, 0, 1.05, 0, 0, 0.85, 0]);
		const f = gradientField(ref, { axis: [0, 1, 0], start: 1.25, end: 0.85 });
		expect([...f].map((v) => +v.toFixed(3))).toEqual([0, 0.5, 1]);
	});
	it('measures distance from a line', () => {
		const pts = [{ x: 0, y: 1, z: 0 }, { x: 0.1, y: 1, z: 0 }];
		const f = gradientField(new Float32Array([0.05, 1.05, 0, 0.05, 1.2, 0]), { pts, start: 0, end: 0.2 });
		expect(f[0]).toBeCloseTo(Math.hypot(0.05, 0.05) / 0.2, 5); // to the nearest sample (real lines are sampled every 1.5 mm)
		expect(f[1]).toBeGreaterThan(f[0]);
	});
});
