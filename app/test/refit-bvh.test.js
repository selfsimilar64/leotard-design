// The re-fit's body tree (src/fit/bvh.js): its closest point equals a brute-force search over every triangle.
import { describe, expect, it } from 'vitest';
import { buildBVH, closestOnTriangle, closestPoint } from '../src/fit/bvh.js';

function sphere(rings, segs) {
	const P = [], T = [];
	for (let r = 0; r <= rings; r++) {
		const th = (Math.PI * r) / rings;
		for (let s = 0; s < segs; s++) {
			const ph = (2 * Math.PI * s) / segs;
			P.push(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph) * 0.6);
		}
	}
	for (let r = 0; r < rings; r++) {
		for (let s = 0; s < segs; s++) {
			const a = r * segs + s, b = r * segs + ((s + 1) % segs), c = a + segs, d = b + segs;
			T.push(a, c, b, b, c, d);
		}
	}
	return { P: new Float32Array(P), T: new Int32Array(T) };
}

function brute(P, T, p) {
	let best = Infinity;
	for (let t = 0; t < T.length / 3; t++) {
		const v = (k) => [P[T[3 * t + k] * 3], P[T[3 * t + k] * 3 + 1], P[T[3 * t + k] * 3 + 2]];
		const A = v(0), B = v(1), C = v(2), w = closestOnTriangle(p, A, B, C);
		const q = [0, 1, 2].map((k) => w[0] * A[k] + w[1] * B[k] + w[2] * C[k]);
		best = Math.min(best, Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]));
	}
	return best;
}

describe('re-fit body tree', () => {
	const { P, T } = sphere(24, 40);
	const bvh = buildBVH(P, T);
	it('finds the closest point a brute-force search finds', () => {
		let seed = 7;
		const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 3 - 1.5;
		for (let k = 0; k < 300; k++) {
			const p = [rnd(), rnd(), rnd()];
			expect(closestPoint(bvh, P, T, p).dist).toBeCloseTo(brute(P, T, p), 6);
		}
	});
	it('builds the same tree every time', () => {
		const again = buildBVH(P, T);
		expect(Array.from(again.box)).toEqual(Array.from(bvh.box));
		expect(Array.from(again.link)).toEqual(Array.from(bvh.link));
		expect(Array.from(again.order)).toEqual(Array.from(bvh.order));
	});
	it('weights sum to one and stay inside the triangle', () => {
		const w = closestOnTriangle([0.3, 0.2, 1], [0, 0, 0], [1, 0, 0], [0, 1, 0]);
		expect(w[0] + w[1] + w[2]).toBeCloseTo(1, 9);
		expect(Math.min(...w)).toBeGreaterThanOrEqual(0);
	});
});
