// Bounding-volume tree over a body part's triangles, for the re-fit's closest-point query on the GPU (refit-wgsl.js, surface_at).
// Per node: `box` 8 floats (min xyz, 0, max xyz, 0) and `link` 2 ints. Inner node: link = (left child, right child). Leaf:
// link = (-(first + 1), count) into `order`. Built once per pose; the body does not move during a re-fit. Replaces Warp's wp.Mesh
// query in pipeline/race/gpu.py (surface_at); the tie-breaks differ but the closest distance is the same.

const LEAF = 4;

export function buildBVH(points, tris) {
	const nt = tris.length / 3;
	const cen = new Float32Array(nt * 3), lo = new Float32Array(nt * 3), hi = new Float32Array(nt * 3);
	for (let t = 0; t < nt; t++) {
		for (let k = 0; k < 3; k++) {
			let mn = Infinity, mx = -Infinity;
			for (let c = 0; c < 3; c++) {
				const v = points[tris[t * 3 + c] * 3 + k];
				mn = Math.min(mn, v); mx = Math.max(mx, v);
			}
			lo[t * 3 + k] = mn; hi[t * 3 + k] = mx; cen[t * 3 + k] = 0.5 * (mn + mx);
		}
	}
	const order = new Int32Array(nt);
	for (let t = 0; t < nt; t++) order[t] = t;
	const box = [], link = [];
	function build(first, count) {
		const id = link.length / 2;
		box.push(0, 0, 0, 0, 0, 0, 0, 0);
		link.push(0, 0);
		const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
		const cmn = [Infinity, Infinity, Infinity], cmx = [-Infinity, -Infinity, -Infinity];
		for (let i = first; i < first + count; i++) {
			const t = order[i];
			for (let k = 0; k < 3; k++) {
				mn[k] = Math.min(mn[k], lo[t * 3 + k]); mx[k] = Math.max(mx[k], hi[t * 3 + k]);
				cmn[k] = Math.min(cmn[k], cen[t * 3 + k]); cmx[k] = Math.max(cmx[k], cen[t * 3 + k]);
			}
		}
		box.splice(id * 8, 8, mn[0], mn[1], mn[2], 0, mx[0], mx[1], mx[2], 0);
		if (count <= LEAF) {
			link[id * 2] = -(first + 1); link[id * 2 + 1] = count;
			return id;
		}
		const ext = [cmx[0] - cmn[0], cmx[1] - cmn[1], cmx[2] - cmn[2]];
		const axis = ext[0] > ext[1] ? (ext[0] > ext[2] ? 0 : 2) : (ext[1] > ext[2] ? 1 : 2);
		const part = order.subarray(first, first + count);
		part.sort((p, q) => cen[p * 3 + axis] - cen[q * 3 + axis] || p - q);  // ties by index: the same tree every time
		const half = count >> 1;
		const l = build(first, half), r = build(first + half, count - half);
		link[id * 2] = l; link[id * 2 + 1] = r;
		return id;
	}
	build(0, nt);
	return { box: new Float32Array(box), link: new Int32Array(link), order };
}

// The same tree on moved points (the next pose of the same body mesh): only the boxes are recomputed, bottom-up, in one pass. A
// child's id is always above its parent's (build numbers nodes as it enters them), so a pass from the last node back meets every
// child before its parent. The answers are the same as a rebuilt tree's (a box still bounds its triangles); a pose far from the
// one the tree was built on only makes the walk visit more boxes. In place; returns the tree.
export function refitBVH(bvh, points, tris) {
	const { box, link, order } = bvh, nodes = link.length / 2;
	for (let id = nodes - 1; id >= 0; id--) {
		const a = link[id * 2], b = link[id * 2 + 1], o = id * 8;
		let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
		if (a < 0) {
			for (let i = -a - 1; i < -a - 1 + b; i++) {
				const t = order[i];
				for (let c = 0; c < 3; c++) {
					const v = tris[t * 3 + c] * 3, x = points[v], y = points[v + 1], z = points[v + 2];
					if (x < x0) x0 = x; if (y < y0) y0 = y; if (z < z0) z0 = z; if (x > x1) x1 = x; if (y > y1) y1 = y; if (z > z1) z1 = z;
				}
			}
		} else {
			for (const c of [a, b]) {
				const q = c * 8;
				x0 = Math.min(x0, box[q]); y0 = Math.min(y0, box[q + 1]); z0 = Math.min(z0, box[q + 2]);
				x1 = Math.max(x1, box[q + 4]); y1 = Math.max(y1, box[q + 5]); z1 = Math.max(z1, box[q + 6]);
			}
		}
		box[o] = x0; box[o + 1] = y0; box[o + 2] = z0; box[o + 4] = x1; box[o + 5] = y1; box[o + 6] = z1;
	}
	return bvh;
}

// Closest point on triangle abc to p (Ericson, Real-Time Collision Detection 5.1.5): its barycentric weights.
export function closestOnTriangle(p, a, b, c) {
	const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
	const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
	const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
	const d1 = dot(ab, ap), d2 = dot(ac, ap);
	if (d1 <= 0 && d2 <= 0) return [1, 0, 0];
	const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
	if (d3 >= 0 && d4 <= d3) return [0, 1, 0];
	const vc = d1 * d4 - d3 * d2;
	if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return [1 - v, v, 0]; }
	const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
	if (d6 >= 0 && d5 <= d6) return [0, 0, 1];
	const vb = d5 * d2 - d1 * d6;
	if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return [1 - w, 0, w]; }
	const va = d3 * d6 - d5 * d4;
	if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return [0, 1 - w, w]; }
	const denom = 1 / (va + vb + vc), v = vb * denom, w = vc * denom;
	return [1 - v - w, v, w];
}

// CPU closest point through the tree (tests; the GPU walks the same tree in refit-wgsl.js).
export function closestPoint(bvh, points, tris, p) {
	const { box, link, order } = bvh;
	const P = (i) => [points[i * 3], points[i * 3 + 1], points[i * 3 + 2]];
	let best = Infinity, face = -1, bary = null;
	const stack = [0];
	while (stack.length) {
		const id = stack.pop();
		let dd = 0;
		for (let k = 0; k < 3; k++) {
			const v = Math.max(box[id * 8 + k] - p[k], 0, p[k] - box[id * 8 + 4 + k]);
			dd += v * v;
		}
		if (dd >= best) continue;
		const a = link[id * 2], b = link[id * 2 + 1];
		if (a < 0) {
			for (let i = -a - 1; i < -a - 1 + b; i++) {
				const t = order[i];
				const A = P(tris[t * 3]), B = P(tris[t * 3 + 1]), C = P(tris[t * 3 + 2]);
				const w = closestOnTriangle(p, A, B, C);
				const q = [0, 1, 2].map((k) => w[0] * A[k] + w[1] * B[k] + w[2] * C[k]);
				const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2;
				if (d < best) { best = d; face = t; bary = w; }
			}
		} else {
			stack.push(a, b);
		}
	}
	return { face, bary, dist: Math.sqrt(best) };
}
