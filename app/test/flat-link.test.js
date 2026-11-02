import { describe, it, expect } from 'vitest';
import { FlatLink } from '../src/dev/flat-link.js';

// A tube of radius R: a front and a back, each half its round, sewn at both sides. Flat size is the tube's own, stretched.
const R = 0.1, H = 0.3, N = 40, M = 30, STRETCH = 1.2;
function half(piece, start) {
	const uv = [], P = [], I = [], wid = [];
	const W = Math.PI * R / STRETCH;
	for (let j = 0; j <= M; j++) for (let i = 0; i <= N; i++) {
		uv.push((i / N) * W, (j / M) * H);
		const a = start + (i / N) * Math.PI;
		P.push(R * Math.cos(a), (j / M) * H, R * Math.sin(a));
		// the two pieces share a welded id down each side
		const side = i === 0 ? (start === 0 ? 'A' : 'B') : i === N ? (start === 0 ? 'B' : 'A') : null;
		wid.push(side ? (side === 'A' ? 1e6 : 2e6) + j : (start === 0 ? 0 : 1e5) + j * (N + 1) + i);
	}
	for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
		const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
		I.push(a, b, d, a, d, c);
	}
	return { piece, half: 0, uv, P, I, wid };
}
const make = () => new FlatLink([half('front', 0), half('back', Math.PI)]);

describe('flat link', () => {
	it('finds the seams and they are closed', () => {
		const g = make().seamGaps();
		expect(g.pairs).toBe(2 * (M + 1));
		expect(g.max).toBeLessThan(1e-9);
	});

	it('takes a flat point to the body and back within half a millimetre', () => {
		const L = make(), W = Math.PI * R / STRETCH;
		for (const piece of ['front', 'back']) for (let k = 0; k < 200; k++) {
			const u = 0.02 * W + 0.96 * W * ((k * 37 % 200) / 200), v = 0.02 * H + 0.96 * H * ((k * 91 % 200) / 200);
			const on = L.toBody(piece, u, v), back = L.toFlat(on.p);
			expect(back.piece).toBe(piece);
			expect(Math.hypot(back.u - u, back.v - v) * 1000).toBeLessThan(0.5);
		}
	});

	it('finds nothing off the piece', () => {
		expect(make().toBody('front', -0.05, 0.1)).toBeNull();
	});

	it('carries a line over a seam with no break on the body', () => {
		const L = make(), points = [];
		for (let k = -6; k <= 6; k++) {
			const a = k * 0.05, p = [R * Math.cos(a), 0.15, R * Math.sin(a)];
			points.push(L.toFlat(p));
		}
		const s = L.strokes(points);
		expect(s.map((x) => x.piece)).toEqual(['back', 'front']);
		expect(Math.hypot(...s[0].seamEnd.map((v, i) => v - s[1].seamStart[i]))).toBeLessThan(1e-9);
		// each side of the seam meets it at the same height
		expect(Math.abs(s[0].points.at(-1)[1] - s[1].points[0][1])).toBeLessThan(0.006);
	});
});
