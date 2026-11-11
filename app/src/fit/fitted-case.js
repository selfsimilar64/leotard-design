// A re-fit case built in the app from a fitted garment (garment/fitted.js) and the body as it now is, for fit/refit.js: what
// pipeline/race/export_app.py writes for the race's cases, made here from the live body instead of a Python export.
//   garment: the fitted file's `case` (pipeline/wrap_block.py export: the whole garment joined at the fold, rest shape, elastic)
//   start:   every point placed by its surface coordinates (the cells' hosts) on the body's current garment surface, as the app shows
//            a carried fit; the re-fit then settles it on that surface
//   body:    the garment surface (lift included) split into torso and arm parts with pseudo-normals, as gpu.Problem / gpu.part_geometry
// Twins: gpu.part_geometry (pipeline/race/gpu.py), export_app.main (the arrays and their meaning), HOLD and TURN in gpu.py.

const HOLD = 1.0e-4;  // gpu.HOLD: slack fabric is held to the body this weakly (contact only pushes)
const TURN = 0.3;     // gpu.TURN: inside-out charge fully on past asin(0.3)

// Face normals, angle-weighted vertex pseudo-normals, per face the normal of the edge opposite each corner (the faces beside it,
// summed), which edges and vertices are open: gpu.part_geometry.
// The edges' pairing depends only on the triangles (topo: per face corner the index of the edge opposite it, how many faces share
// each edge); it is the slow part, so the app makes it once per body mesh (edgeTopology) and passes it in.
export function edgeTopology(t, m) {
	const nf = t.length / 3, ids = new Map(), edge = new Int32Array(nf * 3), counts = [];
	for (let f = 0; f < nf; f++) for (let k = 0; k < 3; k++) {
		const i = t[3 * f + (k + 1) % 3], j = t[3 * f + (k + 2) % 3], key = i < j ? i * m + j : j * m + i;
		let e = ids.get(key);
		if (e === undefined) { e = counts.length; ids.set(key, e); counts.push(0); }
		counts[e]++;
		edge[3 * f + k] = e;
	}
	return { edge, count: Int32Array.from(counts) };
}

export function partGeometry(P, t, topo = edgeTopology(t, P.length / 3)) {
	const nf = t.length / 3, m = P.length / 3;
	const fn = new Float32Array(nf * 3), vn = new Float64Array(m * 3);
	const unit = (a, i) => { const L = Math.hypot(a[i], a[i + 1], a[i + 2]) + 1e-30; a[i] /= L; a[i + 1] /= L; a[i + 2] /= L; };
	for (let f = 0; f < nf; f++) {
		const a = t[3 * f] * 3, b = t[3 * f + 1] * 3, c = t[3 * f + 2] * 3;
		const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], wx = P[c] - P[a], wy = P[c + 1] - P[a + 1], wz = P[c + 2] - P[a + 2];
		fn[3 * f] = uy * wz - uz * wy; fn[3 * f + 1] = uz * wx - ux * wz; fn[3 * f + 2] = ux * wy - uy * wx;
		unit(fn, 3 * f);
		for (let k = 0; k < 3; k++) {
			const o = t[3 * f + k] * 3, p = t[3 * f + (k + 1) % 3] * 3, q = t[3 * f + (k + 2) % 3] * 3;
			let ax = P[p] - P[o], ay = P[p + 1] - P[o + 1], az = P[p + 2] - P[o + 2], bx = P[q] - P[o], by = P[q + 1] - P[o + 1], bz = P[q + 2] - P[o + 2];
			const la = Math.hypot(ax, ay, az) + 1e-30, lb = Math.hypot(bx, by, bz) + 1e-30;
			const angle = Math.acos(Math.min(1, Math.max(-1, (ax * bx + ay * by + az * bz) / (la * lb))));
			vn[o] += angle * fn[3 * f]; vn[o + 1] += angle * fn[3 * f + 1]; vn[o + 2] += angle * fn[3 * f + 2];
		}
	}
	// edges: the one opposite corner k runs between corners k+1 and k+2; its normal is the sum over the faces beside it
	const { edge, count } = topo, sum = new Float64Array(count.length * 3);
	for (let f = 0; f < nf; f++) for (let k = 0; k < 3; k++) {
		const e = 3 * edge[3 * f + k];
		sum[e] += fn[3 * f]; sum[e + 1] += fn[3 * f + 1]; sum[e + 2] += fn[3 * f + 2];
	}
	const en = new Float32Array(nf * 9), eb = new Int32Array(nf * 3), vb = new Int32Array(m);
	for (let f = 0; f < nf; f++) for (let k = 0; k < 3; k++) {
		const e = edge[3 * f + k], L = Math.hypot(sum[3 * e], sum[3 * e + 1], sum[3 * e + 2]) + 1e-30;
		en[9 * f + 3 * k] = sum[3 * e] / L; en[9 * f + 3 * k + 1] = sum[3 * e + 1] / L; en[9 * f + 3 * k + 2] = sum[3 * e + 2] / L;
		if (count[e] === 1) { eb[3 * f + k] = 1; vb[t[3 * f + (k + 1) % 3]] = 1; vb[t[3 * f + (k + 2) % 3]] = 1; }
	}
	const vnf = new Float32Array(m * 3);
	for (let v = 0; v < m; v++) { const L = Math.hypot(vn[3 * v], vn[3 * v + 1], vn[3 * v + 2]) + 1e-30; vnf[3 * v] = vn[3 * v] / L; vnf[3 * v + 1] = vn[3 * v + 1] / L; vnf[3 * v + 2] = vn[3 * v + 2] / L; }
	return { fn, en, eb, vn: vnf, vb };
}

// Where every point of the whole garment sits now: its cells' hosts on the surface Q, averaged where a point is in two cells (a seam).
export function startOf(data, Q) {
	const n = data.case.n, X = new Float64Array(n * 3), seen = new Float32Array(n);
	for (const c of data.cells) {
		const hi = c.hostI, hw = c.hostW, cid = c.cid;
		for (let l = 0; l < cid.length; l++) {
			const i = cid[l];
			for (let j = 0; j < 3; j++) { const v = hi[3 * l + j] * 3, w = hw[3 * l + j]; X[3 * i] += w * Q[v]; X[3 * i + 1] += w * Q[v + 1]; X[3 * i + 2] += w * Q[v + 2]; }
			seen[i]++;
		}
	}
	const out = new Float32Array(n * 3);
	for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) out[3 * i + k] = X[3 * i + k] / Math.max(1, seen[i]);
	return out;
}

// The garment's part of a case: depends only on the fitted file and its size, so it is made once per garment and size.
// size (meta.fitSize): the pattern made wider (x, across the grain) and longer (y, along it) by these factors before the re-fit, as
// a pattern maker grades a block: every piece's flat rest shape, and each elastic span's rest length by its own direction.
export function garmentArrays(data, size = { width: 1, length: 1 }) {
	const c = data.case, nt = c.tris.length / 3, sx = size.width ?? 1, sy = size.length ?? 1;
	const R = sx === 1 && sy === 1 ? c.rest : Float64Array.from(c.rest, (v, i) => v * (i % 2 ? sy : sx));
	const Dinv = new Float32Array(nt * 4), area = new Float32Array(nt);
	for (let t = 0; t < nt; t++) {
		// Dm's columns are the rest edges from corner 0: [[e1x, e2x], [e1y, e2y]]; Dinv row-major, as export_app
		const e1x = R[6 * t + 2] - R[6 * t], e1y = R[6 * t + 3] - R[6 * t + 1], e2x = R[6 * t + 4] - R[6 * t], e2y = R[6 * t + 5] - R[6 * t + 1];
		const det = e1x * e2y - e2x * e1y;
		Dinv[4 * t] = e2y / det; Dinv[4 * t + 1] = -e2x / det; Dinv[4 * t + 2] = -e1y / det; Dinv[4 * t + 3] = e1x / det;
		area[t] = 0.5 * Math.abs(det);
	}
	return {
		tris: Int32Array.from(c.tris), Dinv, area, facing: Float32Array.from(c.facing), si: Int32Array.from(c.si), sj: Int32Array.from(c.sj),
		rest_len: sx === 1 && sy === 1 ? Float32Array.from(c.rest_len) : spanLengths(c, sx, sy), k: Float32Array.from(c.k), sleeve: Int32Array.from(c.sleeve),
		// points put in place by hand when dressing (a strap: pipeline/wrap_block.py export, case.placed), which keep their friction
		// through a frictionless phase (fit/refit.js reset); null for a garment without
		placed: c.placed ? Uint8Array.from(c.placed) : null,
	};
}

// Elastic spans' rest lengths with the pattern scaled: each by its direction on the flat piece (the flat edge of a triangle holding both
// ends; a span with no such edge, by the mean of the two factors).
function spanLengths(c, sx, sy) {
	const T = c.tris, R = c.rest, n = c.n, flat = new Map();
	for (let t = 0; t < T.length / 3; t++) for (let k = 0; k < 3; k++) {
		const a = T[3 * t + k], b = T[3 * t + (k + 1) % 3], key = a < b ? a * n + b : b * n + a;
		if (!flat.has(key)) flat.set(key, [R[6 * t + 2 * ((k + 1) % 3)] - R[6 * t + 2 * k], R[6 * t + 2 * ((k + 1) % 3) + 1] - R[6 * t + 2 * k + 1]]);
	}
	return Float32Array.from(c.rest_len, (L, s) => {
		const a = c.si[s], b = c.sj[s], d = flat.get(a < b ? a * n + b : b * n + a);
		if (!d) return L * (sx + sy) / 2;
		const len = Math.hypot(d[0], d[1]) || 1;
		return L * Math.hypot(d[0] * sx, d[1] * sy) / len;
	});
}

// A case for Refit: the garment (garmentArrays), the start, and the body's garment surface Q on the canonical faces idx, split by
// how much of each vertex is arm (wArm) as gpu.Problem: torso where every corner is under 0.5 arm, arm where every corner is over 0.15.
// cache: kept by the caller between re-fits on the same garment and body mesh (the parts' faces and edge pairing; Refit keeps its
// own matrix and trees in the same object).
// physics: { press, bend, jam } of the fit realism plan's stage 2 (squeeze resistance, bending stiffness, the squeeze taken up free;
// press 0 and bend 0: the physics before it) and { kink, firm, snug } of its stage 3 (the elastic as a band, its firmness, how short it
// is cut; 0, 1 and 1: before it; Refit makes the spans, refit.js elasticSprings), as gpu.Problem's.
export function buildCase(data, garment, Q, idx, wArm, cache = {}, physics = {}) {
	const c = data.case, arrays = { ...garment, start: startOf(data, Q), body: Float32Array.from(Q) };
	const parts = [];
	cache.parts ??= [['torso', (w) => w < 0.5], ['arm', (w) => w > 0.15]].map(([label, keep]) => {
		const t = [];
		for (let f = 0; f < idx.length; f += 3) if (keep(wArm[idx[f]]) && keep(wArm[idx[f + 1]]) && keep(wArm[idx[f + 2]])) t.push(idx[f], idx[f + 1], idx[f + 2]);
		const ti = Int32Array.from(t);
		return { label, ti, topo: edgeTopology(ti, Q.length / 3) };
	});
	for (const { label, ti, topo } of cache.parts) {
		const g = partGeometry(arrays.body, ti, topo);
		arrays[label + '_tris'] = ti; arrays[label + '_fn'] = g.fn; arrays[label + '_en'] = g.en; arrays[label + '_eb'] = g.eb; arrays[label + '_vn'] = g.vn; arrays[label + '_vb'] = g.vb;
		parts.push(ti.length / 3);
	}
	const head = { n: c.n, nt: c.tris.length / 3, ns: c.si.length, body_points: Q.length / 3, part_faces: parts, plane: c.plane, gather: c.gather, hold: HOLD, turn: TURN,
		press: physics.press ?? 0, bend: physics.bend ?? 0, jam: physics.jam ?? 1, kink: physics.kink ?? 0, firm: physics.firm ?? 1, snug: physics.snug ?? 1 };
	return { head, arrays, cache };
}
