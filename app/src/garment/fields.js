// Per-vertex fields for drawing panels (render/garment.js reads them into attributes):
//  - distance to the nearest seam, for the seam groove and ridge and the doubled mesh over the
//    allowance (fabric shader, uSeam);
//  - position along a colour gradient that follows a line or a direction (uOmbre = 2).
// Both are measured on the reference body (aRef), so they land the same on every body size.

// Seam edges of a layer: constraint edges with garment on both sides whose line is a seam or an
// edge line (print lines change colour without stitching; merged slivers have no seam).
// Returns a Set of edge keys (same formula as the arrangement's ekey).
export function seamKeys(arr, garment, roleOf) {
	const nV = arr.nV, seen = new Map(), keys = new Set();
	for (let c = 0; c < arr.cells.length; c++) {
		if (!garment[c]) continue;
		for (const t of arr.cells[c].tris) for (let e = 0; e < 3; e++) {
			const a = arr.tris[t * 3 + e], b = arr.tris[t * 3 + (e + 1) % 3];
			const k = a < b ? a * nV + b : b * nV + a;
			if (!arr.constraint.has(k) || arr.softEdges?.has(k)) continue;
			const n = (seen.get(k) ?? 0) + 1;
			seen.set(k, n);
			if (n === 2 && [...arr.constraint.get(k)].some((id) => { const r = roleOf(id); return r === 'seam' || r === 'edge'; })) keys.add(k);
		}
	}
	return keys;
}

// Reference-body position of an arrangement vertex (canonical vertex or a point inside a face).
export function refOf(arr, man, v, out) {
	const V = man.vertices, R = man.ref;
	if (v < V) { out[0] = R[v * 3]; out[1] = R[v * 3 + 1]; out[2] = R[v * 3 + 2]; return out; }
	const k = v - V, f = arr.hostF[k], idx = man.idx;
	out[0] = out[1] = out[2] = 0;
	for (let j = 0; j < 3; j++) { const w = arr.hostB[k * 3 + j], i = idx[f * 3 + j] * 3; out[0] += w * R[i]; out[1] += w * R[i + 1]; out[2] += w * R[i + 2]; }
	return out;
}

// Distance from each of a cell's piece vertices to the seams on the cell's boundary (metres,
// capped at `cap`). Segments are bucketed by midpoint in a grid of cap-sized cells, so each
// vertex only tests the segments of its 27 neighbouring buckets.
export function seamDistance(arr, man, cell, verts, keys, cap = 0.012) {
	const nV = arr.nV, segs = [], p = [0, 0, 0], q = [0, 0, 0];
	for (const t of arr.cells[cell].tris) for (let e = 0; e < 3; e++) {
		const a = arr.tris[t * 3 + e], b = arr.tris[t * 3 + (e + 1) % 3];
		if (!keys.has(a < b ? a * nV + b : b * nV + a)) continue;
		refOf(arr, man, a, p); refOf(arr, man, b, q);
		segs.push(p[0], p[1], p[2], q[0], q[1], q[2]);
	}
	const n = verts.length, out = new Float32Array(n).fill(cap);
	if (!segs.length) return out;
	const G = cap + 0.002, grid = new Map(), cellKey = (x, y, z) => ((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) | 0;
	for (let s = 0; s < segs.length; s += 6) {
		const k = cellKey(Math.floor((segs[s] + segs[s + 3]) / 2 / G), Math.floor((segs[s + 1] + segs[s + 4]) / 2 / G), Math.floor((segs[s + 2] + segs[s + 5]) / 2 / G));
		let b = grid.get(k); if (!b) grid.set(k, b = []); b.push(s);
	}
	for (let l = 0; l < n; l++) {
		refOf(arr, man, verts[l], p);
		const ix = Math.floor(p[0] / G), iy = Math.floor(p[1] / G), iz = Math.floor(p[2] / G);
		let best = cap * cap;
		for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
			const b = grid.get(cellKey(ix + dx, iy + dy, iz + dz));
			if (b) for (const s of b) { const d = segDist2(p, segs, s); if (d < best) best = d; }
		}
		out[l] = Math.sqrt(best);
	}
	return out;
}

function segDist2(p, S, s) {
	const ax = S[s], ay = S[s + 1], az = S[s + 2], ux = S[s + 3] - ax, uy = S[s + 4] - ay, uz = S[s + 5] - az;
	const wx = p[0] - ax, wy = p[1] - ay, wz = p[2] - az, L = ux * ux + uy * uy + uz * uz;
	const t = L > 0 ? Math.max(0, Math.min(1, (wx * ux + wy * uy + wz * uz) / L)) : 0;
	const dx = wx - t * ux, dy = wy - t * uy, dz = wz - t * uz;
	return dx * dx + dy * dy + dz * dz;
}

// Gradient parameter per vertex: 0 at `start`, 1 at `end` (metres), measured as the distance from
// a line's samples (pts: [{x,y,z}], both mirror halves) or along a direction (axis).
// ref: Float32Array of reference positions (xyz per vertex).
export function gradientField(ref, { pts = null, axis = null, start = 0, end = 0.2 }) {
	const n = ref.length / 3, out = new Float32Array(n), span = end - start || 1e-6;
	if (axis) {
		const L = Math.hypot(...axis) || 1, ax = axis[0] / L, ay = axis[1] / L, az = axis[2] / L;
		for (let i = 0; i < n; i++) out[i] = (ref[i * 3] * ax + ref[i * 3 + 1] * ay + ref[i * 3 + 2] * az - start) / span;
		return out;
	}
	if (!pts?.length) return out;
	const P = new Float32Array(pts.length * 3);
	pts.forEach((v, j) => { P[j * 3] = v.x; P[j * 3 + 1] = v.y; P[j * 3 + 2] = v.z; });
	for (let i = 0; i < n; i++) {
		const x = ref[i * 3], y = ref[i * 3 + 1], z = ref[i * 3 + 2];
		let best = Infinity;
		for (let j = 0; j < P.length; j += 3) { const dx = P[j] - x, dy = P[j + 1] - y, dz = P[j + 2] - z, d = dx * dx + dy * dy + dz * dz; if (d < best) best = d; }
		out[i] = (Math.sqrt(best) - start) / span;
	}
	return out;
}
