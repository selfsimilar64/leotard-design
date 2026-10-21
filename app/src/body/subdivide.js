// Catmull-Clark subdivision as a sparse matrix ("stencil"): new positions = S * old positions.
// Genesis 9's base cage subdivided once is the app's canonical mesh; the person's skin is subdivided
// once more for rendering (render/figure.js). Twin of pipeline/g9.py cc_stencil, which builds the
// same mesh for the pipeline (part weights, triangles, the design migration map): the vertex order
// and the rules must stay identical (test/subdivide.test.js checks the triangles against
// topology.bin, which the Python side wrote).
//
// Mixed polygons; open boundaries keep a cubic B-spline (boundary vertices with other than two
// boundary edges stay put). New vertex order: old vertices, edge points (edges sorted by
// (min id, max id)), face points. Quads per polygon corner: corner, edge(cur, next), face point,
// edge(prev, cur).

// sizes: polygon sizes; ids: flat vertex ids. Returns { rows: Uint32Array(n + 1), cols, w, n, quads }.
export function ccStencil(nV, sizes, ids) {
	const nF = sizes.length, start = new Uint32Array(nF + 1);
	for (let f = 0; f < nF; f++) start[f + 1] = start[f] + sizes[f];
	const nC = start[nF], K = nV + 1;
	// edges: unique (min, max) pairs in sorted order, and each corner's edge (cur -> next)
	const keys = new Float64Array(nC);
	for (let f = 0; f < nF; f++) for (let c = start[f]; c < start[f + 1]; c++) {
		const a = ids[c], b = ids[c + 1 < start[f + 1] ? c + 1 : start[f]];
		keys[c] = Math.min(a, b) * K + Math.max(a, b);
	}
	const sorted = Float64Array.from(keys).sort();
	let nE = 0;
	for (let i = 0; i < nC; i++) if (i === 0 || sorted[i] !== sorted[i - 1]) sorted[nE++] = sorted[i];
	const ekeys = sorted.subarray(0, nE);
	const find = (k) => { let lo = 0, hi = nE - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (ekeys[m] < k) lo = m + 1; else hi = m; } return lo; };
	const cornerEdge = new Uint32Array(nC), ecount = new Uint32Array(nE), ef = new Int32Array(nE * 2).fill(-1);
	const fidOf = new Uint32Array(nC);
	for (let f = 0; f < nF; f++) for (let c = start[f]; c < start[f + 1]; c++) {
		const e = cornerEdge[c] = find(keys[c]);
		fidOf[c] = f;
		if (ecount[e] < 2) ef[e * 2 + ecount[e]] = f;
		ecount[e]++;
	}
	const ea = new Uint32Array(nE), eb = new Uint32Array(nE);
	for (let e = 0; e < nE; e++) { ea[e] = Math.floor(ekeys[e] / K); eb[e] = ekeys[e] - ea[e] * K; }
	// per vertex: corners (faces) and edges
	const nf = new Uint32Array(nV), val = new Uint32Array(nV), bcnt = new Uint32Array(nV);
	for (let c = 0; c < nC; c++) nf[ids[c]]++;
	for (let e = 0; e < nE; e++) { val[ea[e]]++; val[eb[e]]++; if (ecount[e] !== 2) { bcnt[ea[e]]++; bcnt[eb[e]]++; } }
	const vfS = new Uint32Array(nV + 1), veS = new Uint32Array(nV + 1);
	for (let v = 0; v < nV; v++) { vfS[v + 1] = vfS[v] + nf[v]; veS[v + 1] = veS[v] + val[v]; }
	const vf = new Uint32Array(nC), ve = new Uint32Array(nE * 2), fillF = vfS.slice(0, nV), fillE = veS.slice(0, nV);
	for (let c = 0; c < nC; c++) vf[fillF[ids[c]]++] = fidOf[c];
	for (let e = 0; e < nE; e++) { ve[fillE[ea[e]]++] = e; ve[fillE[eb[e]]++] = e; }

	const n = nV + nE + nF, rows = new Uint32Array(n + 1);
	const cols = [], w = [];
	const push = (c, x) => { cols.push(c); w.push(x); };
	const facePoint = (f, s) => { const k = sizes[f]; for (let c = start[f]; c < start[f + 1]; c++) push(ids[c], s / k); };
	// vertex points
	for (let v = 0; v < nV; v++) {
		if (bcnt[v] > 0) { // on a boundary
			if (bcnt[v] === 2) {
				push(v, 0.75);
				for (let k = veS[v]; k < veS[v + 1]; k++) { const e = ve[k]; if (ecount[e] !== 2) push(ea[e] === v ? eb[e] : ea[e], 0.125); }
			} else push(v, 1);
		} else {
			const m = Math.max(val[v], 3);
			for (let k = vfS[v]; k < vfS[v + 1]; k++) facePoint(vf[k], 1 / m / Math.max(nf[v], 1));
			const r = 2 / m / Math.max(val[v], 1) * 0.5;
			for (let k = veS[v]; k < veS[v + 1]; k++) { const e = ve[k]; push(ea[e], r); push(eb[e], r); }
			push(v, (m - 3) / m);
		}
		rows[v + 1] = cols.length;
	}
	// edge points
	for (let e = 0; e < nE; e++) {
		if (ecount[e] === 2) { push(ea[e], 0.25); push(eb[e], 0.25); facePoint(ef[e * 2], 0.25); facePoint(ef[e * 2 + 1], 0.25); }
		else { push(ea[e], 0.5); push(eb[e], 0.5); }
		rows[nV + e + 1] = cols.length;
	}
	// face points
	for (let f = 0; f < nF; f++) { facePoint(f, 1); rows[nV + nE + f + 1] = cols.length; }

	const quads = new Uint32Array(nC * 4);
	for (let f = 0; f < nF; f++) for (let c = start[f]; c < start[f + 1]; c++) {
		const p = c > start[f] ? c - 1 : start[f + 1] - 1;
		quads.set([ids[c], nV + cornerEdge[c], nV + nE + f, nV + cornerEdge[p]], c * 4);
	}
	return { rows, cols: Uint32Array.from(cols), w: Float32Array.from(w), n, quads };
}

// out = S * src, `dim` floats per vertex.
export function applyStencil(S, src, out = new Float32Array(S.n * 3), dim = 3) {
	const { rows, cols, w, n } = S;
	for (let i = 0; i < n; i++) {
		let x = 0, y = 0, z = 0;
		for (let k = rows[i]; k < rows[i + 1]; k++) {
			const j = cols[k] * dim, a = w[k];
			x += a * src[j]; if (dim > 1) { y += a * src[j + 1]; z += a * src[j + 2]; }
		}
		out[i * dim] = x; if (dim > 1) { out[i * dim + 1] = y; out[i * dim + 2] = z; }
	}
	return out;
}

// Triangles of quads in pipeline order: every quad's (0, 1, 2), then every quad's (0, 2, 3).
export function quadTriangles(quads) {
	const q = quads.length / 4, T = new Uint32Array(q * 6);
	for (let i = 0; i < q; i++) {
		T[i * 3] = quads[i * 4]; T[i * 3 + 1] = quads[i * 4 + 1]; T[i * 3 + 2] = quads[i * 4 + 2];
		const o = (q + i) * 3;
		T[o] = quads[i * 4]; T[o + 1] = quads[i * 4 + 2]; T[o + 2] = quads[i * 4 + 3];
	}
	return T;
}

// Polygons of a topology record ({ sizes, ids } offsets in a buffer).
export function readPolys(buf, rec) {
	return { sizes: new Uint8Array(buf, rec.sizes.offset, rec.sizes.count), ids: new Uint32Array(buf, rec.ids.offset, rec.ids.count) };
}
