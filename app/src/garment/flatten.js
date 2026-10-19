import { rcm, EnvelopeCholesky } from './sparse.js';

// Per-panel flattening: least-squares conformal maps (LSCM, Lévy et al. 2002) solved by
// Jacobi-preconditioned conjugate gradients on the normal equations, started from the panel's
// projection onto its best-fit plane (body panels are close to developable, so it converges in a
// few hundred iterations). The result is rescaled so the flat area equals the 3D area and rotated
// so the body's vertical runs up the piece (the grain line). UVs are in metres: cloth space for
// every fabric pattern and texture, and the shape of the flat pattern piece.
// Spec: knowledge/engineering/architecture/editor-architecture.md, item 4.

// P: Float32Array xyz per vertex, I: Uint32Array triangle indices.
// -> { uv: Float32Array(2n), iterations, residual, areaRatio, distortion }
export function flatten(P, I, { maxIter = 0, tol = 1e-7, up = [0, 1, 0], arapIter = 30 } = {}) {
	const n = P.length / 3, nt = I.length / 3;
	if (n < 3 || nt < 1) return { uv: new Float32Array(n * 2), iterations: 0 };

	// --- initial guess: projection onto the best-fit plane (PCA), with axis 1 nearest `up` --------
	let cx = 0, cy = 0, cz = 0;
	for (let i = 0; i < n; i++) { cx += P[i * 3]; cy += P[i * 3 + 1]; cz += P[i * 3 + 2]; }
	cx /= n; cy /= n; cz /= n;
	const C = [0, 0, 0, 0, 0, 0]; // xx xy xz yy yz zz
	for (let i = 0; i < n; i++) {
		const x = P[i * 3] - cx, y = P[i * 3 + 1] - cy, z = P[i * 3 + 2] - cz;
		C[0] += x * x; C[1] += x * y; C[2] += x * z; C[3] += y * y; C[4] += y * z; C[5] += z * z;
	}
	const normal = smallestEigenvector(C);
	// in-plane axes: e2 = up projected into the plane, e1 = e2 x normal
	let e2 = sub(up, scale(normal, dot(up, normal)));
	if (len(e2) < 1e-6) e2 = sub([0, 0, 1], scale(normal, normal[2]));
	e2 = norm(e2);
	const e1 = norm(cross(e2, normal));
	const x0 = new Float64Array(2 * n);
	for (let i = 0; i < n; i++) {
		const d = [P[i * 3] - cx, P[i * 3 + 1] - cy, P[i * 3 + 2] - cz];
		x0[i] = dot(d, e1); x0[n + i] = dot(d, e2);
	}
	// Body pieces wrap round a limb or the torso: when the piece fits a cylinder about its long
	// axis, start from the cylinder unrolled (nearly isometric), not the squashed projection.
	const unrolled = cylinderUnroll(P, n, C, [cx, cy, cz]);
	if (unrolled) x0.set(unrolled);

	// --- per-triangle LSCM coefficients -----------------------------------------------------------
	// row pair per triangle: sum_j (a_j u_j - b_j v_j) / d and sum_j (b_j u_j + a_j v_j) / d
	const A = new Float64Array(nt * 3), B = new Float64Array(nt * 3), LX = new Float64Array(nt * 3), LY = new Float64Array(nt * 3);
	let area3 = 0;
	for (let t = 0; t < nt; t++) {
		const i0 = I[t * 3], i1 = I[t * 3 + 1], i2 = I[t * 3 + 2];
		const p0 = [P[i0 * 3], P[i0 * 3 + 1], P[i0 * 3 + 2]], p1 = [P[i1 * 3], P[i1 * 3 + 1], P[i1 * 3 + 2]], p2 = [P[i2 * 3], P[i2 * 3 + 1], P[i2 * 3 + 2]];
		const ex = sub(p1, p0), l01 = len(ex), ux = scale(ex, 1 / (l01 || 1)), e02 = sub(p2, p0);
		const nn = cross(ex, e02), ar = len(nn) / 2;
		area3 += ar;
		const vy = norm(cross(nn, ux));
		// local 2D: p0 = (0,0), p1 = (l01, 0), p2 = (e02.ux, e02.vy)
		const xs = [0, l01, dot(e02, ux)], ys = [0, 0, dot(e02, vy)];
		for (let j = 0; j < 3; j++) { LX[t * 3 + j] = xs[j]; LY[t * 3 + j] = ys[j]; }
		const d = Math.sqrt(Math.max(2 * ar, 1e-20));
		for (let j = 0; j < 3; j++) {
			const j1 = (j + 1) % 3, j2 = (j + 2) % 3;
			A[t * 3 + j] = (xs[j2] - xs[j1]) / d;
			B[t * 3 + j] = (ys[j2] - ys[j1]) / d;
		}
	}

	// --- pins: two vertices far apart along the initial layout's long axis ------------------------
	let pa = 0, pb = 0, lo = Infinity, hi = -Infinity;
	for (let i = 0; i < n; i++) { const s = x0[n + i] + 0.37 * x0[i]; if (s < lo) { lo = s; pa = i; } if (s > hi) { hi = s; pb = i; } }
	const fixed = new Uint8Array(2 * n);
	fixed[pa] = fixed[n + pa] = fixed[pb] = fixed[n + pb] = 1;

	// y = A x (2 rows per triangle), x = A^T y
	const y = new Float64Array(2 * nt);
	const mulA = (x, out) => {
		for (let t = 0; t < nt; t++) {
			let r1 = 0, r2 = 0;
			for (let j = 0; j < 3; j++) {
				const v = I[t * 3 + j], a = A[t * 3 + j], b = B[t * 3 + j], u = x[v], w = x[n + v];
				r1 += a * u - b * w; r2 += b * u + a * w;
			}
			out[2 * t] = r1; out[2 * t + 1] = r2;
		}
	};
	const mulAT = (yy, out) => {
		out.fill(0);
		for (let t = 0; t < nt; t++) {
			const r1 = yy[2 * t], r2 = yy[2 * t + 1];
			for (let j = 0; j < 3; j++) {
				const v = I[t * 3 + j], a = A[t * 3 + j], b = B[t * 3 + j];
				out[v] += a * r1 + b * r2; out[n + v] += -b * r1 + a * r2;
			}
		}
	};
	const normalOp = (x, out) => { mulA(x, y); mulAT(y, out); for (let i = 0; i < 2 * n; i++) if (fixed[i]) out[i] = 0; };
	// Jacobi preconditioner: diagonal of A^T A
	const diag = new Float64Array(2 * n);
	for (let t = 0; t < nt; t++) for (let j = 0; j < 3; j++) {
		const v = I[t * 3 + j], a = A[t * 3 + j], b = B[t * 3 + j];
		diag[v] += a * a + b * b; diag[n + v] += a * a + b * b;
	}
	for (let i = 0; i < 2 * n; i++) diag[i] = fixed[i] || diag[i] < 1e-20 ? 1 : 1 / diag[i];

	// CG on A^T A x = 0 with the pinned values held at their initial positions
	const x = Float64Array.from(x0), r = new Float64Array(2 * n), z = new Float64Array(2 * n), p = new Float64Array(2 * n), Ap = new Float64Array(2 * n);
	normalOp(x, r);
	for (let i = 0; i < 2 * n; i++) r[i] = fixed[i] ? 0 : -r[i];
	for (let i = 0; i < 2 * n; i++) { z[i] = r[i] * diag[i]; p[i] = z[i]; }
	let rz = dotN(r, z), r0 = Math.sqrt(dotN(r, r)) || 1, it = 0, res = 1;
	for (; it < maxIter; it++) {
		normalOp(p, Ap);
		const pAp = dotN(p, Ap);
		if (pAp <= 0) break;
		const alpha = rz / pAp;
		for (let i = 0; i < 2 * n; i++) { x[i] += alpha * p[i]; r[i] -= alpha * Ap[i]; }
		res = Math.sqrt(dotN(r, r)) / r0;
		if (res < tol) break;
		for (let i = 0; i < 2 * n; i++) z[i] = r[i] * diag[i];
		const rz2 = dotN(r, z), beta = rz2 / rz;
		rz = rz2;
		for (let i = 0; i < 2 * n; i++) p[i] = z[i] + beta * p[i];
	}

	// --- ARAP: from the conformal layout towards an isometric one (lengths, not only angles) ------
	if (arapIter > 0) {
		let a2 = 0;
		for (let t = 0; t < nt; t++) {
			const i0 = I[t * 3], i1 = I[t * 3 + 1], i2 = I[t * 3 + 2];
			a2 += ((x[i1] - x[i0]) * (x[n + i2] - x[n + i0]) - (x[i2] - x[i0]) * (x[n + i1] - x[n + i0])) / 2;
		}
		const s0 = Math.sqrt(area3 / Math.max(Math.abs(a2), 1e-20));
		for (let i = 0; i < 2 * n; i++) x[i] *= s0;
		// work in the orientation where triangles are counter-clockwise
		if (a2 < 0) for (let i = 0; i < n; i++) x[i] = -x[i];
		arap(I, n, nt, LX, LY, x, arapIter);
		if (a2 < 0) for (let i = 0; i < n; i++) x[i] = -x[i];
	}

	// --- scale to the 3D area, rotate the grain to the body's vertical ------------------------------
	let area2 = 0;
	for (let t = 0; t < nt; t++) {
		const i0 = I[t * 3], i1 = I[t * 3 + 1], i2 = I[t * 3 + 2];
		area2 += ((x[i1] - x[i0]) * (x[n + i2] - x[n + i0]) - (x[i2] - x[i0]) * (x[n + i1] - x[n + i0])) / 2;
	}
	// a clockwise layout is the piece seen from the wrong side: mirror it so the outside faces up
	const flip = area2 < 0 ? -1 : 1;
	const s = Math.sqrt(area3 / Math.max(Math.abs(area2), 1e-20));
	let mu = 0, mv = 0, mh = 0;
	for (let i = 0; i < n; i++) { mu += x[i]; mv += x[n + i]; mh += dot([P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], up); }
	mu /= n; mv /= n; mh /= n;
	const U = new Float64Array(n), W = new Float64Array(n);
	for (let i = 0; i < n; i++) { U[i] = (x[i] - mu) * s * flip; W[i] = (x[n + i] - mv) * s; }
	// direction of the body's vertical in the flat: least squares of height over (u, v)
	let suu = 0, suv = 0, svv = 0, suh = 0, svh = 0;
	for (let i = 0; i < n; i++) {
		const u = U[i], v = W[i], h = dot([P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], up) - mh;
		suu += u * u; suv += u * v; svv += v * v; suh += u * h; svh += v * h;
	}
	const det = suu * svv - suv * suv;
	let gu = 0, gv = 1;
	if (Math.abs(det) > 1e-20) { gu = (svv * suh - suv * svh) / det; gv = (suu * svh - suv * suh) / det; }
	const ang = Math.atan2(gu, gv); // rotating by this takes (gu, gv) onto +v
	const cs = Math.cos(ang), sn = Math.sin(ang);
	const uv = new Float32Array(2 * n);
	for (let i = 0; i < n; i++) { uv[2 * i] = cs * U[i] - sn * W[i]; uv[2 * i + 1] = sn * U[i] + cs * W[i]; }
	return { uv, iterations: it, residual: res, area3, distortion: distortionOf(P, I, uv), stretch: stretchOf(P, I, uv) };
}

// As-rigid-as-possible refinement (Liu et al. 2008 local/global, cotangent weights): each
// triangle's best rotation onto its 3D shape (local), then the layout that best fits all of them
// (global: one Laplacian, factored once by envelope Cholesky, solved twice per iteration).
// x: Float64Array(2n) u then v, counter-clockwise; refined in place.
function arap(I, n, nt, LX, LY, x, iters) {
	// half-cotangent weight of each triangle edge (edge k is opposite corner k)
	const W = new Float64Array(nt * 3);
	for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) {
		const a = t * 3 + k, b = t * 3 + (k + 1) % 3, c = t * 3 + (k + 2) % 3;
		const ux = LX[b] - LX[a], uy = LY[b] - LY[a], vx = LX[c] - LX[a], vy = LY[c] - LY[a];
		const cr = Math.abs(ux * vy - uy * vx), dt = ux * vx + uy * vy;
		W[a] = Math.max(0.5 * dt / Math.max(cr, 1e-20), 1e-3); // clamp obtuse (negative) weights
	}
	const nb = Array.from({ length: n }, () => new Map()), diag = new Float64Array(n);
	for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) {
		const i = I[t * 3 + (k + 1) % 3], j = I[t * 3 + (k + 2) % 3], w = W[t * 3 + k];
		nb[i].set(j, (nb[i].get(j) ?? 0) + w); nb[j].set(i, (nb[j].get(i) ?? 0) + w);
		diag[i] += w; diag[j] += w;
	}
	// L + eps I: SPD without pinning (the right-hand side has no translation component)
	let md = 0;
	for (let i = 0; i < n; i++) md += diag[i];
	const eps = (md / n) * 1e-7;
	const rows = nb.map((m, i) => [[i, diag[i] + eps], ...[...m].map(([j, w]) => [j, -w])]);
	const chol = new EnvelopeCholesky(n, rows, rcm(nb.map((m) => [...m.keys()])));
	const bu = new Float64Array(n), bv = new Float64Array(n), u = x.subarray(0, n), v = x.subarray(n, 2 * n);
	for (let it = 0; it < iters; it++) {
		bu.fill(0); bv.fill(0);
		for (let t = 0; t < nt; t++) {
			// local step: rotation taking the triangle's 3D shape onto its current layout
			let s00 = 0, s01 = 0, s10 = 0, s11 = 0;
			for (let k = 0; k < 3; k++) {
				const a = (k + 1) % 3, b = (k + 2) % 3, ia = I[t * 3 + a], ib = I[t * 3 + b], w = W[t * 3 + k];
				const ex = LX[t * 3 + a] - LX[t * 3 + b], ey = LY[t * 3 + a] - LY[t * 3 + b];
				const fx = u[ia] - u[ib], fy = v[ia] - v[ib];
				s00 += w * fx * ex; s01 += w * fx * ey; s10 += w * fy * ex; s11 += w * fy * ey;
			}
			const th = Math.atan2(s10 - s01, s00 + s11), c = Math.cos(th), sn = Math.sin(th);
			for (let k = 0; k < 3; k++) {
				const a = (k + 1) % 3, b = (k + 2) % 3, ia = I[t * 3 + a], ib = I[t * 3 + b], w = W[t * 3 + k];
				const ex = LX[t * 3 + a] - LX[t * 3 + b], ey = LY[t * 3 + a] - LY[t * 3 + b];
				const rx = c * ex - sn * ey, ry = sn * ex + c * ey;
				bu[ia] += w * rx; bv[ia] += w * ry; bu[ib] -= w * rx; bv[ib] -= w * ry;
			}
		}
		// keep the layout where it was (eps * x pulls towards the previous position)
		for (let i = 0; i < n; i++) { bu[i] += eps * u[i]; bv[i] += eps * v[i]; }
		chol.solve(bu, u); chol.solve(bv, v);
	}
}

// Unroll about the best-fit cylinder whose axis is the piece's long direction (Kasa circle fit
// of the cross-section). Returns u (around) and v (along) in metres, or null when the piece is
// nearly flat or not round enough for the fit to help.
function cylinderUnroll(P, n, C, c) {
	const axis = largestEigenvector(C);
	const b1 = norm(cross(axis, Math.abs(axis[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0])), b2 = cross(axis, b1);
	const X = new Float64Array(n), Y = new Float64Array(n);
	const M = [0, 0, 0, 0, 0, 0], r = [0, 0, 0]; // normal equations of the circle fit (sym 3x3)
	let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
	for (let i = 0; i < n; i++) {
		const d = [P[i * 3] - c[0], P[i * 3 + 1] - c[1], P[i * 3 + 2] - c[2]];
		const x = dot(d, b1), y = dot(d, b2), q = x * x + y * y;
		X[i] = x; Y[i] = y;
		xmin = Math.min(xmin, x); xmax = Math.max(xmax, x); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y);
		M[0] += x * x; M[1] += x * y; M[2] += x; M[3] += y * y; M[4] += y; M[5] += 1;
		r[0] -= q * x; r[1] -= q * y; r[2] -= q;
	}
	const inv = invert3([[M[0], M[1], M[2]], [M[1], M[3], M[4]], [M[2], M[4], M[5]]]);
	const D = inv[0][0] * r[0] + inv[0][1] * r[1] + inv[0][2] * r[2];
	const E = inv[1][0] * r[0] + inv[1][1] * r[1] + inv[1][2] * r[2];
	const F = inv[2][0] * r[0] + inv[2][1] * r[1] + inv[2][2] * r[2];
	const ccx = -D / 2, ccy = -E / 2, R2 = ccx * ccx + ccy * ccy - F;
	const ext = Math.hypot(xmax - xmin, ymax - ymin);
	if (!(R2 > 0)) return null;
	const R = Math.sqrt(R2);
	if (R > 3 * ext || R < 0.01) return null;
	// mean angle, then angles relative to it (the piece never wraps the full circle)
	let sx = 0, sy = 0;
	for (let i = 0; i < n; i++) { const a = Math.atan2(Y[i] - ccy, X[i] - ccx); sx += Math.cos(a); sy += Math.sin(a); }
	const am = Math.atan2(sy, sx), out = new Float64Array(2 * n);
	for (let i = 0; i < n; i++) {
		let a = Math.atan2(Y[i] - ccy, X[i] - ccx) - am;
		a = Math.atan2(Math.sin(a), Math.cos(a));
		out[i] = R * a;
		out[n + i] = dot([P[i * 3] - c[0], P[i * 3 + 1] - c[1], P[i * 3 + 2] - c[2]], axis);
	}
	return out;
}

function largestEigenvector(C) {
	const M = [[C[0], C[1], C[2]], [C[1], C[3], C[4]], [C[2], C[4], C[5]]];
	let v = [0.31, 0.83, 0.47];
	for (let k = 0; k < 60; k++) v = norm([M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]]);
	return v;
}

// Area-weighted stretch of a flattening: per triangle the singular values s1 >= s2 of the map
// from the 3D triangle to its flat copy; mean = area-weighted mean of max(s1 - 1, 1 - s2),
// p95 = the 95th percentile by area, flipped = area share of inverted triangles.
export function stretchOf(P, I, uv) {
	const nt = I.length / 3, rows = [];
	let total = 0, flipped = 0;
	for (let t = 0; t < nt; t++) {
		const i0 = I[t * 3], i1 = I[t * 3 + 1], i2 = I[t * 3 + 2];
		const e1 = [P[i1 * 3] - P[i0 * 3], P[i1 * 3 + 1] - P[i0 * 3 + 1], P[i1 * 3 + 2] - P[i0 * 3 + 2]];
		const e2 = [P[i2 * 3] - P[i0 * 3], P[i2 * 3 + 1] - P[i0 * 3 + 1], P[i2 * 3 + 2] - P[i0 * 3 + 2]];
		const l1 = len(e1), nn = cross(e1, e2), ar = len(nn) / 2;
		if (ar < 1e-12 || l1 < 1e-9) continue;
		const ex = scale(e1, 1 / l1), ey = norm(cross(nn, ex));
		const x1 = l1, x2 = dot(e2, ex), y2 = dot(e2, ey);
		const u1 = uv[i1 * 2] - uv[i0 * 2], v1 = uv[i1 * 2 + 1] - uv[i0 * 2 + 1], u2 = uv[i2 * 2] - uv[i0 * 2], v2 = uv[i2 * 2 + 1] - uv[i0 * 2 + 1];
		// J maps local (x, y) to (u, v): columns from the two edges
		const det = x1 * y2;
		const a = (u1 * y2) / det, b = (u2 * x1 - u1 * x2) / det, c = (v1 * y2) / det, d = (v2 * x1 - v1 * x2) / det;
		const E = (a * a + c * c + b * b + d * d) / 2, D = a * d - b * c, disc = Math.sqrt(Math.max(E * E - D * D, 0));
		const s1 = Math.sqrt(E + disc), s2 = Math.sqrt(Math.max(E - disc, 0));
		if (D < 0) flipped += ar;
		rows.push([Math.max(s1 - 1, 1 - s2), ar]);
		total += ar;
	}
	rows.sort((p, q) => p[0] - q[0]);
	let acc = 0, mean = 0, p95 = 0;
	for (const [d, ar] of rows) { mean += d * ar; acc += ar; if (!p95 && acc >= 0.95 * total) p95 = d; }
	return { mean: mean / (total || 1), p95, flipped: flipped / (total || 1) };
}

// Mean and max relative edge-length error of a flattening (0 = isometric).
export function distortionOf(P, I, uv) {
	let sum = 0, mx = 0, cnt = 0;
	for (let t = 0; t < I.length / 3; t++) for (let e = 0; e < 3; e++) {
		const a = I[t * 3 + e], b = I[t * 3 + (e + 1) % 3];
		const l3 = Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]);
		if (l3 < 1e-9) continue;
		const l2 = Math.hypot(uv[a * 2] - uv[b * 2], uv[a * 2 + 1] - uv[b * 2 + 1]);
		const d = Math.abs(l2 - l3) / l3;
		sum += d; mx = Math.max(mx, d); cnt++;
	}
	return { mean: cnt ? sum / cnt : 0, max: mx };
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
function dotN(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }

// Eigenvector of the smallest eigenvalue of a symmetric 3x3 (packed xx xy xz yy yz zz), by
// inverse power iteration on (C + eps I).
function smallestEigenvector(C) {
	const tr = C[0] + C[3] + C[5], eps = tr * 1e-9 + 1e-30;
	const M = [[C[0] + eps, C[1], C[2]], [C[1], C[3] + eps, C[4]], [C[2], C[4], C[5] + eps]];
	const inv = invert3(M);
	let v = [0.3, 0.5, 0.8];
	for (let k = 0; k < 40; k++) {
		v = norm([inv[0][0] * v[0] + inv[0][1] * v[1] + inv[0][2] * v[2], inv[1][0] * v[0] + inv[1][1] * v[1] + inv[1][2] * v[2], inv[2][0] * v[0] + inv[2][1] * v[1] + inv[2][2] * v[2]]);
	}
	return v;
}
function invert3(m) {
	const [a, b, c] = m[0], [d, e, f] = m[1], [g, h, i] = m[2];
	const A = e * i - f * h, B = -(d * i - f * g), Cc = d * h - e * g, det = a * A + b * B + c * Cc || 1e-30;
	return [[A / det, -(b * i - c * h) / det, (b * f - c * e) / det], [B / det, (a * i - c * g) / det, -(a * f - c * d) / det], [Cc / det, -(a * h - b * g) / det, (a * e - b * d) / det]];
}
