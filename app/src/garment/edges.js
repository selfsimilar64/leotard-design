// Edges of the cut garment: the boundary loops between fabric and openings (where finished
// edges go) and the seam polylines between two panels (for seam rendering, piping and stone
// rows). Built from the arrangement, so they follow the cut exactly.

// garment: Uint8Array per cell (1 = fabric). -> loops: [{ verts: [arrangement vertex], curves: [curve key per edge], closed }]
// Each loop runs with the fabric on its left seen from outside (counter-clockwise round an opening's fabric side).
export function openingLoops(arr, garment) {
	const nV = arr.nV, next = new Map(), edgeCurve = new Map();
	// directed boundary edges: edges of fabric triangles whose twin is not in a fabric triangle
	const seen = new Map();
	for (let c = 0; c < arr.cells.length; c++) {
		if (!garment[c]) continue;
		for (const t of arr.cells[c].tris) for (let e = 0; e < 3; e++) {
			const a = arr.tris[t * 3 + e], b = arr.tris[t * 3 + (e + 1) % 3];
			const k = a < b ? a * nV + b : b * nV + a;
			if (seen.has(k)) seen.delete(k); else seen.set(k, [a, b, c, arr.tris[t * 3 + (e + 2) % 3]]);
		}
	}
	const info = new Map();
	for (const [k, [a, b, c, third]] of seen) {
		next.set(a, b);
		const cs = arr.constraint.get(k);
		info.set(a, { curve: cs ? [...cs][0] : null, cell: c, third });
	}
	const loops = [], used = new Set();
	for (const start of next.keys()) {
		if (used.has(start)) continue;
		const verts = [], curves = [], cells = [], thirds = [];
		let v = start, guard = 0;
		while (!used.has(v) && next.has(v) && guard++ < 200000) {
			used.add(v); verts.push(v);
			const i = info.get(v);
			curves.push(i.curve); cells.push(i.cell); thirds.push(i.third);
			v = next.get(v);
		}
		if (verts.length >= 3) loops.push({ verts, curves, cells, thirds, closed: v === start });
	}
	return loops;
}

// Seams: constraint edges with fabric on both sides, chained into polylines per curve.
export function seamLines(arr, garment, cellPanel) {
	const nV = arr.nV, owner = new Map();
	for (let c = 0; c < arr.cells.length; c++) {
		if (!garment[c]) continue;
		for (const t of arr.cells[c].tris) for (let e = 0; e < 3; e++) {
			const a = arr.tris[t * 3 + e], b = arr.tris[t * 3 + (e + 1) % 3];
			const k = a < b ? a * nV + b : b * nV + a;
			if (!arr.constraint.has(k)) continue;
			const o = owner.get(k);
			if (o) o.cells.push(c); else owner.set(k, { a, b, cells: [c] });
		}
	}
	const edges = [];
	for (const [k, o] of owner) if (o.cells.length === 2) edges.push({ a: o.a, b: o.b, curve: [...arr.constraint.get(k)][0], panels: o.cells.map((c) => cellPanel[c]) });
	return edges;
}
