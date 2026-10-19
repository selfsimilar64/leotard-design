// Sparse symmetric positive-definite solves for small meshes (a few thousand unknowns): reverse
// Cuthill-McKee ordering to shrink the band, then an envelope (skyline) Cholesky factorisation,
// factored once and reused for many right-hand sides (ARAP's global step).

// adj: array of neighbour lists (graph of the matrix). -> permutation perm[newIndex] = oldIndex
export function rcm(adj) {
	const n = adj.length, perm = [], seen = new Uint8Array(n), deg = adj.map((l) => l.length);
	while (perm.length < n) {
		// start from an unvisited vertex of minimum degree (a pseudo-peripheral start)
		let s = -1;
		for (let i = 0; i < n; i++) if (!seen[i] && (s < 0 || deg[i] < deg[s])) s = i;
		const queue = [s];
		seen[s] = 1;
		for (let q = 0; q < queue.length; q++) {
			const v = queue[q];
			perm.push(v);
			const nb = adj[v].filter((w) => !seen[w]).sort((a, b) => deg[a] - deg[b]);
			for (const w of nb) { seen[w] = 1; queue.push(w); }
		}
	}
	return perm.reverse();
}

// Envelope Cholesky of an SPD matrix given as rows of (col, value) pairs in the ORIGINAL numbering,
// with a permutation. Rows must contain the diagonal and be symmetric.
export class EnvelopeCholesky {
	constructor(n, rows, perm) {
		this.n = n; this.perm = perm;
		const inv = new Int32Array(n);
		for (let i = 0; i < n; i++) inv[perm[i]] = i;
		this.inv = inv;
		// first column of each permuted row's envelope
		const first = new Int32Array(n);
		for (let i = 0; i < n; i++) {
			let f = i;
			for (const [c] of rows[perm[i]]) { const j = inv[c]; if (j < f) f = j; }
			first[i] = f;
		}
		const start = new Int32Array(n + 1);
		for (let i = 0; i < n; i++) start[i + 1] = start[i] + (i - first[i] + 1);
		const L = new Float64Array(start[n]);
		for (let i = 0; i < n; i++) for (const [c, v] of rows[perm[i]]) { const j = inv[c]; if (j <= i) L[start[i] + (j - first[i])] += v; }
		// factor in place: row by row, L[i][j] for first[i] <= j <= i
		for (let i = 0; i < n; i++) {
			const fi = first[i], si = start[i];
			for (let j = fi; j < i; j++) {
				const fj = first[j], sj = start[j], k0 = Math.max(fi, fj);
				let s = L[si + (j - fi)];
				for (let k = k0; k < j; k++) s -= L[si + (k - fi)] * L[sj + (k - fj)];
				L[si + (j - fi)] = s / L[sj + (j - fj)];
			}
			let d = L[si + (i - fi)];
			for (let k = fi; k < i; k++) { const x = L[si + (k - fi)]; d -= x * x; }
			if (!(d > 0)) d = 1e-30; // numerically singular: keep going (the caller pins a vertex)
			L[si + (i - fi)] = Math.sqrt(d);
		}
		this.first = first; this.start = start; this.L = L;
		this.y = new Float64Array(n);
	}
	get size() { return this.L.length; }

	// Solve A x = b (b and x in the original numbering).
	solve(b, x = new Float64Array(this.n)) {
		const { n, perm, first, start, L, y } = this;
		for (let i = 0; i < n; i++) {
			const fi = first[i], si = start[i];
			let s = b[perm[i]];
			for (let k = fi; k < i; k++) s -= L[si + (k - fi)] * y[k];
			y[i] = s / L[si + (i - fi)];
		}
		// back substitution with L^T: column-oriented over rows
		for (let i = n - 1; i >= 0; i--) {
			const fi = first[i], si = start[i];
			y[i] /= L[si + (i - fi)];
			const yi = y[i];
			for (let k = fi; k < i; k++) y[k] -= L[si + (k - fi)] * yi;
		}
		for (let i = 0; i < n; i++) x[perm[i]] = y[i];
		return x;
	}
}
