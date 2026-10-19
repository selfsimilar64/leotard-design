import { describe, it, expect, beforeAll } from 'vitest';
import { flatten } from '../src/garment/flatten.js';
import { loadBody } from './helpers.js';
import { makeBlock } from '../src/garment/blocks.js';
import { buildGarment } from '../src/garment/build.js';
import { newDocument } from '../src/doc/schema.js';
import { cellPiece } from '../src/garment/pieces.js';

// grid of n x n quads mapped through f(u, v) -> [x, y, z]
function grid(n, f) {
	const P = [], I = [];
	for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) P.push(...f(i / n, j / n));
	for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
		const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1;
		I.push(a, b, d, a, d, c);
	}
	return { P: Float32Array.from(P), I: Uint32Array.from(I) };
}
const signedArea = (uv, I) => { let s = 0; for (let t = 0; t < I.length / 3; t++) { const a = I[t * 3], b = I[t * 3 + 1], c = I[t * 3 + 2]; s += ((uv[b * 2] - uv[a * 2]) * (uv[c * 2 + 1] - uv[a * 2 + 1]) - (uv[c * 2] - uv[a * 2]) * (uv[b * 2 + 1] - uv[a * 2 + 1])) / 2; } return s; };

describe('flatten', () => {
	it('a flat square stays an exact square, upright', () => {
		// square in the x-y plane facing +z, 0.2 m wide
		const { P, I } = grid(20, (u, v) => [u * 0.2, v * 0.2, 0]);
		const r = flatten(P, I);
		expect(r.distortion.max).toBeLessThan(1e-4);
		// +y (up) maps to +v: the top edge has larger v
		expect(r.uv[(20 * 21 + 10) * 2 + 1]).toBeGreaterThan(r.uv[10 * 2 + 1]);
		expect(signedArea(r.uv, I)).toBeCloseTo(0.04, 5);
	});
	it('a cylinder patch unrolls without stretch', () => {
		const R = 0.1;
		const { P, I } = grid(30, (u, v) => [R * Math.sin(u * 2), v * 0.25, R * Math.cos(u * 2)]);
		const r = flatten(P, I);
		expect(r.distortion.mean).toBeLessThan(0.002);
		expect(signedArea(r.uv, I)).toBeGreaterThan(0); // outside facing up
	});
	it('a sphere cap flattens with bounded distortion', () => {
		const R = 0.1;
		const { P, I } = grid(30, (u, v) => { const a = (u - 0.5) * 1.2, b = (v - 0.5) * 1.2; return [R * Math.sin(a) * Math.cos(b), R * Math.sin(b), R * Math.cos(a) * Math.cos(b)]; });
		const r = flatten(P, I);
		expect(r.distortion.mean).toBeLessThan(0.05);
	});
});

describe('flatten body panels', () => {
	let B;
	beforeAll(async () => { B = await loadBody(); }, 60000);
	it('the default block\'s body and sleeve panels flatten with low distortion', () => {
		const d = newDocument('t');
		const blk = makeBlock(B.man, B.surf, {});
		d.curves = blk.curves.map(({ key, ...c }) => ({ id: key, layer: 'L0', ...c }));
		d.panels = blk.panels.map((p, i) => ({ id: 'p' + (i + 1), layer: 'L0', ...p }));
		const g = buildGarment(d, B.surf);
		for (const s of g.seeds) {
			const m = cellPiece(g.arr, s.cell);
			const t0 = performance.now();
			const r = flatten(m.P, m.I);
			const ms = performance.now() - t0;
			console.log(s.panel, 'cell', s.cell, 'verts', m.P.length / 3, 'slit', m.cut.length, 'iter', r.iterations, 'stretch', JSON.stringify(r.stretch), 'ms', ms.toFixed(0));
			expect(r.stretch.mean).toBeLessThan(0.09);
			expect(r.stretch.flipped).toBeLessThan(0.002);
			expect(signedArea(r.uv, m.I)).toBeGreaterThan(0);
		}
	});
});
