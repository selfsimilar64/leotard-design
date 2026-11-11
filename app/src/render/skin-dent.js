// The skin pressed in under a fitted garment (fit realism plan stage 6, a soft body: knowledge/engineering/app/fit-realism-plan.md).
// With a soft body the re-fit lets fabric sink into the skin where the flesh gives (fit/refit-wgsl.js surface_at, body/mannequin.js
// soft); drawn as it is the skin would show through. So the skin is drawn pressed in by the fabric's depth: each fabric point's depth
// under the skin goes to its nearest skin vertex, is spread to the vertices between (the skin is finer than the fabric) and softened,
// and the skin shown (the mannequin's, and the realistic skin's: render/figure.js setDent) is moved in along its normals by it.
// Display only: the body the fit stands on (Mannequin.aPos) is never changed. No bulge beside the elastic (the plan's first step).
import * as THREE from 'three';
import { vertexNormals } from '../body/mannequin.js';

const CELL = 0.01;     // m, the grid the nearest skin vertex is found in
const MAX_DENT = 0.01; // m, deepest drawn
const FILL = 2;        // passes that give each skin vertex the deepest of its neighbours' (fills between the fabric's points)
const SOFTEN = 3;      // passes that average with the neighbours (the flesh round a dent eases back up)

// Per skin vertex how far in to draw it (m): X the fit's points, Q and N the skin's positions and normals it stood on.
export function dentOf(man, X, Q = man.aPos.array, N = man.aNrm.array) {
	const nv = man.vertices, grid = new Map(), key = (a, b, c) => `${a},${b},${c}`;
	for (let v = 0; v < nv; v++) {
		const k = key(Math.floor(Q[3 * v] / CELL), Math.floor(Q[3 * v + 1] / CELL), Math.floor(Q[3 * v + 2] / CELL));
		let list = grid.get(k);
		if (!list) grid.set(k, (list = []));
		list.push(v);
	}
	const dent = new Float32Array(nv);
	for (let i = 0; i < X.length / 3; i++) {
		const x = X[3 * i], y = X[3 * i + 1], z = X[3 * i + 2], cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), cz = Math.floor(z / CELL);
		let best = Infinity, bv = -1;
		for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
			const list = grid.get(key(cx + a, cy + b, cz + c));
			if (list) for (const v of list) { const d = (Q[3 * v] - x) ** 2 + (Q[3 * v + 1] - y) ** 2 + (Q[3 * v + 2] - z) ** 2; if (d < best) { best = d; bv = v; } }
		}
		if (bv < 0) continue;
		const depth = -((x - Q[3 * bv]) * N[3 * bv] + (y - Q[3 * bv + 1]) * N[3 * bv + 1] + (z - Q[3 * bv + 2]) * N[3 * bv + 2]);
		if (depth > dent[bv]) dent[bv] = Math.min(depth, MAX_DENT);
	}
	const S = man.adjStart, A = man.adj;
	for (let p = 0; p < FILL + SOFTEN; p++) {
		const d0 = dent.slice();
		for (let v = 0; v < nv; v++) {
			let m = d0[v], s = d0[v];
			for (let k = S[v]; k < S[v + 1]; k++) { m = Math.max(m, d0[A[k]]); s += d0[A[k]]; }
			dent[v] = p < FILL ? m : s / (S[v + 1] - S[v] + 1);
		}
	}
	return dent;
}

// The skin shown, pressed in: the mannequin's mesh takes positions and normals of its own while a dent is drawn (its usual ones are
// the body's own arrays, which the fit and everything else read), and the realistic skin is told the same (render/figure.js).
export class SkinDent {
	constructor(engine) { this.engine = engine; this.own = null; this.shared = null; }

	// dent: per skin vertex (dentOf), or null for the skin as it is
	set(dent) {
		const e = this.engine, man = e.body, g = e.skinMesh?.geometry;
		e.figure?.setDent?.(dent ? this.moved(dent) : null);
		if (!g) return;
		if (!dent) {
			if (this.own) { g.setAttribute('position', this.shared.pos); g.setAttribute('normal', this.shared.nrm); this.own = null; }
			return;
		}
		const n = man.vertices * 3;
		if (!this.own || this.own.pos.array.length !== n) {
			this.shared = { pos: g.attributes.position, nrm: g.attributes.normal };
			this.own = { pos: new THREE.BufferAttribute(new Float32Array(n), 3), nrm: new THREE.BufferAttribute(new Float32Array(n), 3) };
			g.setAttribute('position', this.own.pos); g.setAttribute('normal', this.own.nrm);
		}
		const Q = man.aPos.array, N = man.aNrm.array, P = this.own.pos.array;
		for (let v = 0; v < man.vertices; v++) for (let k = 0; k < 3; k++) P[3 * v + k] = Q[3 * v + k] - N[3 * v + k] * dent[v];
		vertexNormals(P, man.idx, this.own.nrm.array);
		this.own.pos.needsUpdate = this.own.nrm.needsUpdate = true;
	}

	// per skin vertex the move (x, y, z), for the realistic skin built on the same vertices (its first subdivision level)
	moved(dent) {
		const man = this.engine.body, N = man.aNrm.array, D = new Float32Array(man.vertices * 3);
		for (let v = 0; v < man.vertices; v++) for (let k = 0; k < 3; k++) D[3 * v + k] = -N[3 * v + k] * dent[v];
		return D;
	}
}
