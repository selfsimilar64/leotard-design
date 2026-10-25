// The garment sliding over the posed body (body/slide.js): one-sided contact. On a synthetic
// V-shaped crease (a flat rest sheet, posed as z = a |x|), tensioned fabric used to be held on the
// skin and pile onto the crease line, its triangles turning over (the folded leg openings of the
// low lunge); it now bridges the crease and never goes inside the body.
import { describe, it, expect } from 'vitest';
import { slideGarment } from '../src/body/slide.js';

function crease(nx = 21, ny = 11, half = 0.05, a = 1.5) {
	const V = nx * ny, rest = new Float32Array(V * 3), P = new Float32Array(V * 3), Nn = new Float32Array(V * 3), free = new Uint8Array(V);
	for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
		const v = j * nx + i, x = -half + (2 * half * i) / (nx - 1), y = (0.05 * j) / (ny - 1);
		rest[v * 3] = x; rest[v * 3 + 1] = y;
		P[v * 3] = x; P[v * 3 + 1] = y; P[v * 3 + 2] = a * Math.abs(x);
		const sx = x === 0 ? 0 : -Math.sign(x) * a, l = Math.hypot(sx, 1);
		Nn[v * 3] = sx / l; Nn[v * 3 + 2] = 1 / l;
		free[v] = i > 0 && j > 0 && i < nx - 1 && j < ny - 1 ? 1 : 0; // the border pinned to the skin
	}
	const tris = [];
	for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
		const v = j * nx + i;
		tris.push(v, v + 1, v + nx + 1, v, v + nx + 1, v + nx); // counter-clockwise seen from +z: normals up
	}
	const idx = Uint32Array.from(tris), nb = Array.from({ length: V }, () => new Set());
	for (let t = 0; t < tris.length; t += 3) for (let e = 0; e < 3; e++) { const p = tris[t + e], q = tris[t + (e + 1) % 3]; nb[p].add(q); nb[q].add(p); }
	const adjStart = new Uint32Array(V + 1), adj = [];
	for (let v = 0; v < V; v++) { adj.push(...nb[v]); adjStart[v + 1] = adj.length; }
	// slideDomain(man) returns _slideFree when set: the design-independent domain, border pinned
	const man = { vertices: V, idx, adjStart, adj: Uint32Array.from(adj), _slideFree: free };
	return { man, rest, P, Nn, idx, free, a };
}

describe('garment sliding', () => {
	it('tensioned fabric bridges a crease: never inside the body, never folded', () => {
		const { man, rest, P, Nn, idx, free, a } = crease();
		const res = slideGarment(man, rest, P, Nn, { shrink: 0.7, grip: 0 });
		const T = res.pos;
		let below = 0, lifted = 0;
		for (let v = 0; v < man.vertices; v++) {
			const h = T[v * 3 + 2] - a * Math.abs(T[v * 3]); // height above the posed skin
			if (h < -1e-4) below++;
			if (free[v] && h > 0.002) lifted++;
		}
		expect(below).toBe(0);
		expect(lifted).toBeGreaterThan(0);
		// every fabric triangle still faces out of the body (up), none turned over
		let folded = 0;
		for (let t = 0; t < idx.length; t += 3) {
			const [p, q, r] = [idx[t] * 3, idx[t + 1] * 3, idx[t + 2] * 3];
			const ux = T[q] - T[p], uy = T[q + 1] - T[p + 1], vx = T[r] - T[p], vy = T[r + 1] - T[p + 1];
			if (ux * vy - uy * vx <= 0) folded++;
		}
		expect(folded).toBe(0);
	});

	it('a warm start from the last solve is no further from the settled fabric than a fresh solve', () => {
		const { man, rest, P, Nn, free, a } = crease();
		const opt = { shrink: 0.7, grip: 0, free };
		const cold = slideGarment(man, rest, P, Nn, opt);
		const warm = slideGarment(man, rest, P, Nn, { ...opt, warm: cold });
		const settled = slideGarment(man, rest, P, Nn, { ...opt, iters: 200, cg: 80 });
		const worst = (r) => { let d = 0; for (let k = 0; k < r.pos.length; k += 3) d = Math.max(d, Math.hypot(r.pos[k] - settled.pos[k], r.pos[k + 1] - settled.pos[k + 1], r.pos[k + 2] - settled.pos[k + 2])); return d; };
		expect(worst(warm)).toBeLessThanOrEqual(worst(cold) + 1e-6);
		let below = 0;
		for (let v = 0; v < man.vertices; v++) if (warm.pos[v * 3 + 2] - a * Math.abs(warm.pos[v * 3]) < -1e-4) below++;
		expect(below).toBe(0);
	});
});
