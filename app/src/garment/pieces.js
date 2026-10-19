// A cell of the arrangement as a pattern piece: its own small mesh, opened up into a disk so it
// can be flattened. Seams that run inside the cell (an underarm seam closing a sleeve tube, a dart)
// become slits: their vertices are split, one copy per side. If the piece is still not a disk
// (a band right round the body), it is cut along the shortest path between its boundary loops.
// The renderer (render/garment.js) and the flattener use the same piece, so UVs line up.

// -> { verts: arrangement vertex id per local vertex (repeats along slits), I, P, cut: [[a, b]] }
export function cellPiece(arr, cell) {
	// local mesh, vertices shared
	const tris = arr.cells[cell].tris, map = new Map(), I = new Uint32Array(tris.length * 3), verts = [];
	for (let q = 0; q < tris.length; q++) for (let k = 0; k < 3; k++) {
		const v = arr.tris[tris[q] * 3 + k];
		let l = map.get(v);
		if (l === undefined) { l = verts.length; map.set(v, l); verts.push(v); }
		I[q * 3 + k] = l;
	}
	const n = verts.length, nt = tris.length;
	const ek = (a, b) => (a < b ? a * n + b : b * n + a);
	// edge -> incident local triangles
	const edgeTris = new Map();
	for (let t = 0; t < nt; t++) for (let e = 0; e < 3; e++) {
		const k = ek(I[t * 3 + e], I[t * 3 + (e + 1) % 3]);
		const l = edgeTris.get(k);
		if (l) l.push(t); else edgeTris.set(k, [t]);
	}
	// slits: constraint edges with the cell on both sides
	const cut = new Set();
	for (const [k, ts] of edgeTris) {
		if (ts.length !== 2) continue;
		const a = Math.floor(k / n), b = k % n;
		if (arr.constraint.has(arr.ekey(verts[a], verts[b]))) cut.add(k);
	}
	// boundary loops after slitting (boundary = edges with one triangle, or cut)
	const isOpen = (k) => cut.has(k) || edgeTris.get(k).length === 1;
	let loops = boundaryLoops(n, I, nt, isOpen, ek);
	const P = new Float32Array(n * 3);
	for (let l = 0; l < n; l++) { const v = verts[l] * 3; P[l * 3] = arr.VP[v]; P[l * 3 + 1] = arr.VP[v + 1]; P[l * 3 + 2] = arr.VP[v + 2]; }
	// join extra boundary loops by shortest paths until one remains
	let guard = 0;
	while (loops.length > 1 && guard++ < 20) {
		const path = shortestBetween(n, I, nt, P, loops[0], new Set(loops.slice(1).flat()), ek, isOpen);
		if (!path) break;
		for (let i = 0; i + 1 < path.length; i++) cut.add(ek(path[i], path[i + 1]));
		loops = boundaryLoops(n, I, nt, isOpen, ek);
	}
	return splitAlong({ verts, I, P, n, nt, cut, ek, edgeTris });
}

// Boundary loops as lists of vertices (a vertex may appear in more than one loop along a slit).
function boundaryLoops(n, I, nt, isOpen, ek) {
	// count open edges per vertex and union vertices joined by open edges; each component is a loop
	const parent = Int32Array.from({ length: n }, (_, i) => i);
	const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
	const onB = new Uint8Array(n);
	const seen = new Set();
	for (let t = 0; t < nt; t++) for (let e = 0; e < 3; e++) {
		const a = I[t * 3 + e], b = I[t * 3 + (e + 1) % 3], k = ek(a, b);
		if (seen.has(k)) continue;
		seen.add(k);
		if (!isOpen(k)) continue;
		onB[a] = onB[b] = 1;
		parent[find(a)] = find(b);
	}
	const groups = new Map();
	for (let v = 0; v < n; v++) if (onB[v]) { const r = find(v); const g = groups.get(r); if (g) g.push(v); else groups.set(r, [v]); }
	return [...groups.values()];
}

// Dijkstra from the vertices of one loop to the nearest vertex of another, through the interior.
function shortestBetween(n, I, nt, P, from, targets, ek, isOpen) {
	const adj = Array.from({ length: n }, () => []);
	for (let t = 0; t < nt; t++) for (let e = 0; e < 3; e++) {
		const a = I[t * 3 + e], b = I[t * 3 + (e + 1) % 3];
		if (isOpen(ek(a, b))) continue; // never walk along an existing boundary
		adj[a].push(b);
	}
	const dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), heap = new Heap();
	for (const v of from) { dist[v] = 0; heap.push(0, v); }
	const fromSet = new Set(from);
	while (heap.size) {
		const [d, v] = heap.pop();
		if (d > dist[v]) continue;
		if (targets.has(v) && !fromSet.has(v)) {
			const path = [v];
			while (prev[path[path.length - 1]] >= 0) path.push(prev[path[path.length - 1]]);
			return path;
		}
		for (const w of adj[v]) {
			const nd = d + Math.hypot(P[v * 3] - P[w * 3], P[v * 3 + 1] - P[w * 3 + 1], P[v * 3 + 2] - P[w * 3 + 2]);
			if (nd < dist[w]) { dist[w] = nd; prev[w] = v; heap.push(nd, w); }
		}
	}
	return null;
}

// Give every vertex one copy per group of its triangles that stay connected without crossing a cut.
function splitAlong({ verts, I, P, n, nt, cut, ek, edgeTris }) {
	// vertex -> incident triangles
	const vt = Array.from({ length: n }, () => []);
	for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) vt[I[t * 3 + k]].push(t);
	const outVerts = [], outP = [], I2 = new Uint32Array(I.length);
	const corner = (t, v) => (I[t * 3] === v ? 0 : I[t * 3 + 1] === v ? 1 : 2);
	for (let v = 0; v < n; v++) {
		const ts = vt[v];
		// union triangles around v that share an uncut edge (v, w)
		const par = ts.map((_, i) => i);
		const find = (x) => { while (par[x] !== x) x = par[x] = par[par[x]]; return x; };
		const byEdge = new Map();
		ts.forEach((t, i) => {
			for (let e = 0; e < 3; e++) {
				const a = I[t * 3 + e], b = I[t * 3 + (e + 1) % 3];
				if (a !== v && b !== v) continue;
				const k = ek(a, b);
				if (cut.has(k)) continue;
				const o = byEdge.get(k);
				if (o === undefined) byEdge.set(k, i); else par[find(o)] = find(i);
			}
		});
		const copy = new Map();
		ts.forEach((t, i) => {
			const r = find(i);
			let nv = copy.get(r);
			if (nv === undefined) { nv = outVerts.length; copy.set(r, nv); outVerts.push(verts[v]); outP.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); }
			I2[t * 3 + corner(t, v)] = nv;
		});
	}
	const cuts = [...cut].map((k) => [verts[Math.floor(k / n)], verts[k % n]]);
	return { verts: outVerts, I: I2, P: Float32Array.from(outP), cut: cuts };
}

class Heap {
	constructor() { this.k = []; this.v = []; }
	get size() { return this.k.length; }
	push(k, v) {
		const K = this.k, V = this.v;
		let i = K.length; K.push(k); V.push(v);
		while (i > 0) { const p = (i - 1) >> 1; if (K[p] <= K[i]) break; [K[p], K[i]] = [K[i], K[p]]; [V[p], V[i]] = [V[i], V[p]]; i = p; }
	}
	pop() {
		const K = this.k, V = this.v, top = [K[0], V[0]], lk = K.pop(), lv = V.pop();
		if (K.length) {
			K[0] = lk; V[0] = lv;
			let i = 0;
			for (;;) {
				const l = 2 * i + 1, r = l + 1;
				let m = i;
				if (l < K.length && K[l] < K[m]) m = l;
				if (r < K.length && K[r] < K[m]) m = r;
				if (m === i) break;
				[K[m], K[i]] = [K[i], K[m]]; [V[m], V[i]] = [V[i], V[m]]; i = m;
			}
		}
		return top;
	}
}

// A signature of a cell's geometry: equal signatures mean the same piece (its flattening can be reused).
export function cellSignature(arr, cell) {
	const tris = arr.cells[cell].tris;
	let h1 = tris.length, h2 = 0;
	for (const t of tris) {
		const a = arr.tris[t * 3] * 3;
		h1 = (h1 * 31 + arr.triFace[t]) % 2147483647;
		h2 += arr.VP[a] * 1000.123 + arr.VP[a + 1] * 7.77 + arr.VP[a + 2] * 3.1;
	}
	return h1 + ':' + h2.toFixed(5);
}
