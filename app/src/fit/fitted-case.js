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

// The elastic's width across an opening (m): a leotard's openings are finished with about 1 cm of elastic turned under
// (garment/trim.js TRIMS.elastic, 10 mm). The file's elastic spans (pipeline/wrap_block.py export) run along the edge row of points
// only, so the whole band's pull sat on one row: with a soft body that row sank a groove one row wide (4-13 mm deep at give 2000)
// and the fabric one row in (7 mm) climbed steeply out of it over the drawn band, burying its inner half (owner, 2026-11-11: "the
// elastic bands disappear"). Real elastic is the firm part of the band and presses in across its width, the fabric rising past it.
export const ELASTIC_W = 0.01;

// The case's elastic spread over its width (elasticBand): the rows of points within `width` of each opening (row 0 the file's edge
// spans, row r the points next to row r-1, at the flat distance in of their triangles' height over the row before), each row's spans
// (mesh edges with both ends in it) taking the elastic's stiffness by the share of the width the row stands for (halfway to the rows
// either side), its rest length the row's flat length times the elastic's own ratio (rest over flat) where the row came from. The
// stiffness per length (k x the span's flat length) is the elastic's; the total pull is the file's. width 0: the file's spans as they
// are. App only: pipeline fits (wrap_block, the race's energy.springs and gpu.Problem) keep the edge-row elastic.
export function elasticBand(c, width = ELASTIC_W) {
	if (!(width > 0)) return { si: c.si, sj: c.sj, rest_len: c.rest_len, k: c.k, bandRow: null };
	const n = c.n, T = c.tris, R = c.rest, nt = T.length / 3, key = (a, b) => (a < b ? a * n + b : b * n + a);
	const flat = new Map(), nbr = Array.from({ length: n }, () => new Set());
	for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) {
		const a = T[3 * t + k], b = T[3 * t + (k + 1) % 3];
		nbr[a].add(b); nbr[b].add(a);
		const kk = key(a, b);
		if (!flat.has(kk)) flat.set(kk, Math.hypot(R[6 * t + 2 * ((k + 1) % 3)] - R[6 * t + 2 * k], R[6 * t + 2 * ((k + 1) % 3) + 1] - R[6 * t + 2 * k + 1]));
	}
	// per point: its row, flat distance in, and the elastic's ratio and stiffness per length where it came from
	const row = new Int32Array(n).fill(-1), dist = new Float64Array(n), ratio = new Float64Array(n), kl = new Float64Array(n), cnt = new Float64Array(n);
	for (let s = 0; s < c.si.length; s++) {
		const L = flat.get(key(c.si[s], c.sj[s])) ?? c.rest_len[s];
		for (const p of [c.si[s], c.sj[s]]) { row[p] = 0; ratio[p] += c.rest_len[s] / L; kl[p] += c.k[s] * L; cnt[p]++; }
	}
	let members = [];
	for (let p = 0; p < n; p++) if (row[p] === 0) { ratio[p] /= cnt[p]; kl[p] /= cnt[p]; members.push(p); }
	const rows = [{ members, d: 0 }];
	// rows in until one starts (halfway from the row before) past the width: its distance bounds the last row inside
	for (let r = 1; (rows[r - 1].d + (rows[r - 2]?.d ?? -rows[r - 1].d)) / 2 < width && members.length; r++) {
		const next = [];
		for (const q of members) for (const p of nbr[q]) if (row[p] === -1) { row[p] = r; dist[p] = Infinity; next.push(p); }
		for (const p of next) {
			let m = 0;
			for (const q of nbr[p]) if (row[q] === r - 1) { ratio[p] += ratio[q]; kl[p] += kl[q]; m++; }
			ratio[p] /= m; kl[p] /= m;
		}
		// distance in: over each triangle with two corners in the row before, the third's height over their edge, flat
		for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) {
			const p = T[3 * t + k], a = T[3 * t + (k + 1) % 3], b = T[3 * t + (k + 2) % 3];
			if (row[p] !== r || row[a] !== r - 1 || row[b] !== r - 1) continue;
			const ax = R[6 * t + 2 * ((k + 1) % 3)], ay = R[6 * t + 2 * ((k + 1) % 3) + 1], bx = R[6 * t + 2 * ((k + 2) % 3)], by = R[6 * t + 2 * ((k + 2) % 3) + 1];
			const h = Math.abs((bx - ax) * (R[6 * t + 2 * k + 1] - ay) - (by - ay) * (R[6 * t + 2 * k] - ax)) / (Math.hypot(bx - ax, by - ay) || 1);
			dist[p] = Math.min(dist[p], (dist[a] + dist[b]) / 2 + h);
		}
		const known = next.filter((p) => dist[p] < Infinity), d = known.reduce((s, p) => s + dist[p], 0) / (known.length || 1);
		for (const p of next) if (!(dist[p] < Infinity)) dist[p] = d;
		members = next;
		rows.push({ members, d });
	}
	// each row's share of the width: halfway to its neighbours, within [0, width]
	// bandRow: per point its row in the band (0 the edge), -1 off it: the band's own bending across its width (refit.js constantMatrix)
	const si = [], sj = [], rest = [], kk = [], bandRow = new Int8Array(n).fill(-1);
	for (let r = 0; r < rows.length; r++) {
		const lo = r === 0 ? 0 : (rows[r - 1].d + rows[r].d) / 2, hi = r + 1 < rows.length ? (rows[r].d + rows[r + 1].d) / 2 : width;
		const w = Math.max(0, Math.min(hi, width) - lo) / width;
		if (!(w > 0)) continue;
		for (const p of rows[r].members) bandRow[p] = r;
		if (r === 0) { for (let s = 0; s < c.si.length; s++) { si.push(c.si[s]); sj.push(c.sj[s]); rest.push(c.rest_len[s]); kk.push(c.k[s] * w); } continue; }
		const inRow = new Set(rows[r].members);
		for (const a of rows[r].members) for (const b of nbr[a]) {
			if (b <= a || !inRow.has(b)) continue;
			const L = flat.get(key(a, b));
			si.push(a); sj.push(b); rest.push(L * (ratio[a] + ratio[b]) / 2); kk.push((kl[a] + kl[b]) / 2 / L * w);
		}
	}
	return { si: Int32Array.from(si), sj: Int32Array.from(sj), rest_len: Float32Array.from(rest), k: Float32Array.from(kk), bandRow };
}

// A fit made on body points Qs (D: its points) anchored to the skin right under it, to be carried by the body's motion (carriedStart):
// per point the closest point of the skin (face, barycentric weights) and its height over it along the face's normal, a sleeve's points
// on the arm's faces and the rest on the torso's (every corner's arm weight over 0.15 / under 0.5: the re-fit's parts, buildCase), so
// a sleeve lying against the side standing is not anchored to the torso. The file's hosts (startOf) are where the pattern was first put
// on: dressing standing slides sleeve points 4-6 cm from them, across the elbow for some, and carried by those hosts (as offsets, even
// turned with the hosts' triangle) the stag jump's and passe's sleeves started 1100-1500 of 7136 triangles inside out, which the fit
// kept (owner, 2026-11-11: "the sleeve fit breaks"). idx: the body's faces; wArm: per body vertex.
export function skinHosts(data, Qs, idx, wArm, D) {
	const n = data.case.n, sleeve = data.case.sleeve, nv = Qs.length / 3, nf = idx.length / 3;
	const vf = Array.from({ length: nv }, () => []); // each vertex's faces, by part (0 torso, 1 arm)
	const part = (f, k) => (k ? [0, 1, 2].every((j) => wArm[idx[3 * f + j]] > 0.15) : [0, 1, 2].every((j) => wArm[idx[3 * f + j]] < 0.5));
	const inPart = [new Uint8Array(nf), new Uint8Array(nf)];
	for (let f = 0; f < nf; f++) for (let k = 0; k < 2; k++) if (part(f, k)) { inPart[k][f] = 1; for (let j = 0; j < 3; j++) vf[idx[3 * f + j]].push(f); }
	// vertices hashed (1 cm cells) per part: those on a face of it
	const cell = 0.01, grids = [new Map(), new Map()], key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
	for (let v = 0; v < nv; v++) for (let k = 0; k < 2; k++) if (vf[v].some((f) => inPart[k][f])) { const kk = key(Qs[3 * v], Qs[3 * v + 1], Qs[3 * v + 2]); (grids[k].get(kk) ?? grids[k].set(kk, []).get(kk)).push(v); }
	const face = new Int32Array(n), bary = new Float32Array(n * 3), h = new Float32Array(n);
	const p = [0, 0, 0];
	for (let i = 0; i < n; i++) {
		const k = sleeve[i] ? 1 : 0, g = grids[k];
		for (let j = 0; j < 3; j++) p[j] = D[3 * i + j];
		// the nearest vertex of the part (growing rings of cells until one is found)
		let best = Infinity, bv = -1;
		const cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell), cz = Math.floor(p[2] / cell);
		for (let r = 1; r <= 8 && bv < 0; r *= 2) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) for (let c = -r; c <= r; c++) for (const v of g.get(`${cx + a},${cy + b},${cz + c}`) ?? []) {
			const d = (Qs[3 * v] - p[0]) ** 2 + (Qs[3 * v + 1] - p[1]) ** 2 + (Qs[3 * v + 2] - p[2]) ** 2;
			if (d < best) { best = d; bv = v; }
		}
		face[i] = -1;
		if (bv < 0) continue;
		// the closest point on the faces round it and round its neighbours on those faces
		const cand = new Set();
		for (const f of vf[bv]) if (inPart[k][f]) { cand.add(f); for (let j = 0; j < 3; j++) for (const f2 of vf[idx[3 * f + j]]) if (inPart[k][f2]) cand.add(f2); }
		let bd = Infinity;
		for (const f of cand) {
			const q = closestOnTri(p, Qs, idx[3 * f], idx[3 * f + 1], idx[3 * f + 2]);
			if (q.d2 < bd) { bd = q.d2; face[i] = f; bary[3 * i] = q.w0; bary[3 * i + 1] = q.w1; bary[3 * i + 2] = q.w2; h[i] = q.h; }
		}
	}
	return { face, bary, h, idx };
}

// The skin-anchored fit (skinHosts) carried onto body points Q: each point on its face, at its weights, its height along the face's
// normal now. D: the fit itself, for a point that found no face.
export function carriedStart(H, Q, D) {
	const { face, bary, h, idx } = H, n = face.length, X = Float32Array.from(D);
	for (let i = 0; i < n; i++) {
		const f = face[i];
		if (f < 0) continue;
		const a = 3 * idx[3 * f], b = 3 * idx[3 * f + 1], c = 3 * idx[3 * f + 2], nn = triNormal(Q, a, b, c);
		for (let k = 0; k < 3; k++) X[3 * i + k] = bary[3 * i] * Q[a + k] + bary[3 * i + 1] * Q[b + k] + bary[3 * i + 2] * Q[c + k] + h[i] * nn[k];
	}
	return X;
}

const triNormal = (P, a, b, c) => {
	const u = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], w = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
	const nn = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], l = Math.hypot(...nn) || 1;
	return nn.map((x) => x / l);
};

// The closest point of triangle (a, b, c) (vertex indices into P) to p: its weights, squared distance, and p's height over the
// triangle's plane along its normal (Ericson, Real-Time Collision Detection 5.1.5).
function closestOnTri(p, P, ia, ib, ic) {
	const a = [P[3 * ia], P[3 * ia + 1], P[3 * ia + 2]], b = [P[3 * ib], P[3 * ib + 1], P[3 * ib + 2]], c = [P[3 * ic], P[3 * ic + 1], P[3 * ic + 2]];
	const sub = (x, y) => [x[0] - y[0], x[1] - y[1], x[2] - y[2]], dot = (x, y) => x[0] * y[0] + x[1] * y[1] + x[2] * y[2];
	const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
	let w0, w1, w2;
	const d1 = dot(ab, ap), d2 = dot(ac, ap), bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp), cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
	const vc = d1 * d4 - d3 * d2, vb = d5 * d2 - d1 * d6, va = d3 * d6 - d5 * d4;
	if (d1 <= 0 && d2 <= 0) [w0, w1, w2] = [1, 0, 0];
	else if (d3 >= 0 && d4 <= d3) [w0, w1, w2] = [0, 1, 0];
	else if (d6 >= 0 && d5 <= d6) [w0, w1, w2] = [0, 0, 1];
	else if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); [w0, w1, w2] = [1 - v, v, 0]; }
	else if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); [w0, w1, w2] = [1 - w, 0, w]; }
	else if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); [w0, w1, w2] = [0, 1 - w, w]; }
	else { const den = 1 / (va + vb + vc), v = vb * den, w = vc * den; [w0, w1, w2] = [1 - v - w, v, w]; }
	const q = [0, 1, 2].map((k) => w0 * a[k] + w1 * b[k] + w2 * c[k]), nn = triNormal(P, 3 * ia, 3 * ib, 3 * ic), dq = sub(p, q);
	return { w0, w1, w2, d2: dot(dq, dq), h: dot(sub(p, q), nn) };
}

// The garment's part of a case: depends only on the fitted file and its size, so it is made once per garment and size.
// size (meta.fitSize): the pattern made wider (x, across the grain) and longer (y, along it) by these factors before the re-fit, as
// a pattern maker grades a block: every piece's flat rest shape, and each elastic span's rest length by its own direction.
// band: the elastic's width (elasticBand; 0: the file's edge-row spans, as the pipeline's fits).
export function garmentArrays(data, size = { width: 1, length: 1 }, band = ELASTIC_W) {
	const c = { ...data.case, ...elasticBand(data.case, band) }, nt = c.tris.length / 3, sx = size.width ?? 1, sy = size.length ?? 1;
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
		bandRow: c.bandRow, // per point its row in the elastic band, -1 off it (elasticBand): refit.js constantMatrix bandBend
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
	const head = { n: c.n, nt: c.tris.length / 3, ns: garment.si.length, body_points: Q.length / 3, part_faces: parts, plane: c.plane, gather: c.gather, hold: HOLD, turn: TURN,
		press: physics.press ?? 0, bend: physics.bend ?? 0, jam: physics.jam ?? 1, kink: physics.kink ?? 0, firm: physics.firm ?? 1, snug: physics.snug ?? 1, bandBend: physics.bandBend ?? 0 };
	return { head, arrays, cache };
}
