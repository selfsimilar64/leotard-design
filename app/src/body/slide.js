// The garment sliding over the posed body (experiment, 2026-10-21).
//
// Every body and pose is the same mesh, so until now the leotard was painted on the skin: each
// garment point sat on the same skin vertex in every pose. Daz's skinning stretches the skin very
// unevenly at the joints (up to 2.6x around the leg openings in the low lunge), and the painted
// leotard went with it: the leg opening dragged down the inner thigh, seams warped at the armpit.
// A real leotard is its own layer: it keeps its rest size, spreads the stretch, and the skin moves
// under it.
//
// This solves where the fabric settles: positions X on or outside the posed body that are as close
// as possible to the fabric's rest shape (the body's A-pose), as-rigid-as-possible (Sorkine & Alexa
// 2007: per-vertex rotations, then one sparse solve), with
//  - one-sided contact: the body pushes the fabric out but never pulls it in. Fabric resting on the
//    skin is held there by a stiff spring along the surface normal only, so it slides freely along
//    it (the surface-embedded cloth of Montes et al. 2020); fabric that tension lifts off the skin
//    (over a crease, across the gluteal cleft) stays off it and bridges. Held on the skin
//    everywhere, as until 2026-10-23, the fabric piled onto every crease a pose pinches shut, its
//    triangles turned over, and the trims along the leg openings broke into flaps;
//  - "grip" (friction against the skin): a weak spring back to the skin point it was painted on;
//  - the head, hands and lower legs pinned to the skin (the garment never reaches them).
// Each outer iteration finds each point's nearest skin by walking from its previous face (and, off
// the skin, checks every skin face nearby, so fabric lifted off the groin cannot end inside the
// thigh pressed against it). Result: per canonical vertex, where the fabric there sits; the garment
// (render/garment.js), straps, stones and the curves' overlay read these instead of the skin.
// Knowledge: engineering/app/garment-sliding.md.
import { Surface } from './surface.js';

// cg 20 (was 40 until 2026-10-24): a third less time, sub-millimetre change (the next outer
// iteration re-solves from where the last one stopped). warmIters: outer iterations when starting
// from a previous solve on the same body and pose (opt.warm).
export const SLIDE = { iters: 30, warmIters: 5, cg: 20, grip: 0.002, stiff: 60, shrink: 0.75 };

// Vertices the fabric may slide on (1) or that stay with the skin (0): the head, the hands, the
// legs from 15 cm below the crotch (on the reference body) are pinned.
export function slideDomain(man) {
	if (man._slideFree) return man._slideFree;
	const N = man.vertices, R = man.ref, free = new Uint8Array(N), cut = man.crotchY - 0.15;
	for (let i = 0; i < N; i++) {
		const head = man.wHead[i] > 0.5, hand = man.wArm[i] > 0.5 && man.armT[i] > 0.9, shin = man.wLeg[i] > 0.5 && R[i * 3 + 1] < cut;
		free[i] = head || hand || shin ? 0 : 1;
	}
	return (man._slideFree = free);
}

function topology(man) {
	if (man._slideTopo) return man._slideTopo;
	const t = { idx: man.idx, F: man.idx.length / 3, V: man.vertices };
	Surface.prototype.buildAdjacency.call(t);
	return (man._slideTopo = t);
}

// rest: the body's A-pose (canonical mesh positions); P, Nn: the posed body and its normals.
// -> { pos, nrm, face, bary, q, w, off, ms }: pos / nrm per vertex (pinned ones are P / Nn), the
// surface point (face, barycentrics) each vertex's fabric sits on, and the solver's own state
// (rotations, contact weights).
// opt.warm: a previous result on the same body and pose (another cover: a garment edit). The solve
// starts from where that fabric settled, its contact and rotations, and runs warmIters outer
// iterations instead of iters.
export function slideGarment(man, rest, P, Nn, opt = {}) {
	const o = { ...SLIDE, ...opt }, t0 = performance.now();
	const N = man.vertices, S = man.adjStart, A = man.adj, idx = man.idx, topo = topology(man);
	// opt.free: a garment's own vertices; its openings are free edges (no pull from the bare skin
	// beyond them). Otherwise the design-independent domain, pinned to the skin at its border.
	const free = o.free ?? slideDomain(man), open = !!o.free, sh = o.shrink ?? 1;
	const deg = new Float32Array(N);
	for (let i = 0; i < N; i++) if (free[i]) { let d = 0; for (let e = S[i]; e < S[i + 1]; e++) if (!open || free[A[e]]) d++; deg[i] = d; }
	const W0 = o.warm ?? null, iters = W0 ? o.warmIters : o.iters;
	const X = Float32Array.from(W0?.pos ?? P), T = Float32Array.from(W0?.pos ?? P), n = Float32Array.from(W0?.nrm ?? Nn);
	const face = W0 ? Int32Array.from(W0.face) : new Int32Array(N), bary = W0 ? Float32Array.from(W0.bary) : new Float32Array(N * 3);
	if (!W0) for (let i = 0; i < N; i++) {
		const f = topo.vf[topo.vfStart[i]];
		face[i] = f;
		for (let k = 0; k < 3; k++) bary[i * 3 + k] = idx[f * 3 + k] === i ? 1 : 0;
	}
	// the free vertices (L), numbered compactly (cid): the solve's vectors hold only them, and each
	// one's free neighbours are listed by compact number (NB from nbStart), in adjacency order.
	// The arithmetic and its order are as over the whole mesh (same results), without the per-
	// vertex skips over pinned vertices and with the solve's memory contiguous (2026-10-24: about
	// half the time).
	let nf = 0;
	for (let i = 0; i < N; i++) if (free[i]) nf++;
	const L = new Int32Array(nf), cid = new Int32Array(N).fill(-1);
	for (let i = 0, c = 0; i < N; i++) if (free[i]) { L[c] = i; cid[i] = c++; }
	// warm: vertices pinned now sit on the skin, whatever the previous cover did with them
	if (W0) for (let i = 0; i < N; i++) if (!free[i]) for (let k = i * 3; k < i * 3 + 3; k++) { X[k] = T[k] = P[k]; n[k] = Nn[k]; }
	const nbStart = new Int32Array(nf + 1);
	for (let c = 0; c < nf; c++) { const i = L[c]; let k = 0; for (let e = S[i]; e < S[i + 1]; e++) if (free[A[e]]) k++; nbStart[c + 1] = nbStart[c] + k; }
	const NB = new Int32Array(nbStart[nf]);
	for (let c = 0, k = 0; c < nf; c++) { const i = L[c]; for (let e = S[i]; e < S[i + 1]; e++) if (free[A[e]]) NB[k++] = cid[A[e]]; }
	const q = W0 ? Float32Array.from(W0.q) : new Float32Array(N * 4); // per-vertex rotation (quaternion x y z w), warm-started
	for (let c = 0; c < nf; c++) { const i4 = L[c] * 4; if (!W0 || !(q[i4] || q[i4 + 1] || q[i4 + 2] || q[i4 + 3])) { q[i4] = q[i4 + 1] = q[i4 + 2] = 0; q[i4 + 3] = 1; } }
	const Rm = new Float32Array(N * 9);
	for (let i = 0; i < N; i++) { Rm[i * 9] = Rm[i * 9 + 4] = Rm[i * 9 + 8] = 1; }
	const n3 = nf * 3, B = new Float32Array(n3), r = new Float32Array(n3), z = new Float32Array(n3), p = new Float32Array(n3), Ap = new Float32Array(n3), x = new Float32Array(n3);
	const s = o.stiff, g = o.grip, stats = { off: 0 }, grid = skinGrid(P, idx, topo.F), a = new Float64Array(9);
	// contact: the surface spring's weight per vertex, s where the fabric rests on the skin, 0 where
	// tension has lifted it off (it starts painted on the skin, all in contact; warm: as it ended)
	const w = W0 ? Float32Array.from(W0.w) : new Float32Array(N).fill(s);

	const sys = { nf, L, deg, g, n, w, nbStart, NB }; // the system matvec and precond solve
	const dotF = (a, b) => dot3(a, b, n3);

	for (let it = 0; it < iters; it++) {
		// local: each free vertex's best rotation from rest edges to current edges
		for (let c = 0; c < nf; c++) {
			const i = L[c], i3 = i * 3;
			a.fill(0);
			for (let e = S[i]; e < S[i + 1]; e++) {
				if (open && !free[A[e]]) continue;
				const j3 = A[e] * 3;
				const cx = X[i3] - X[j3], cy = X[i3 + 1] - X[j3 + 1], cz = X[i3 + 2] - X[j3 + 2];
				const rx = rest[i3] - rest[j3], ry = rest[i3 + 1] - rest[j3 + 1], rz = rest[i3 + 2] - rest[j3 + 2];
				a[0] += cx * rx; a[1] += cx * ry; a[2] += cx * rz;
				a[3] += cy * rx; a[4] += cy * ry; a[5] += cy * rz;
				a[6] += cz * rx; a[7] += cz * ry; a[8] += cz * rz;
			}
			extractRotation(a, q, i * 4, Rm, i * 9);
		}
		// right-hand side: rotated rest edges, pinned neighbours, grip, surface
		for (let c = 0; c < nf; c++) {
			const i = L[c], i3 = i * 3, i9 = i * 9, c3 = c * 3, nx = n[i3], ny = n[i3 + 1], nz = n[i3 + 2];
			let bx = 0, by = 0, bz = 0;
			for (let e = S[i]; e < S[i + 1]; e++) {
				const j = A[e], j3 = j * 3, fj = free[j], j9 = fj ? j * 9 : i9;
				if (open && !fj) continue;
				const rx = sh * (rest[i3] - rest[j3]), ry = sh * (rest[i3 + 1] - rest[j3 + 1]), rz = sh * (rest[i3 + 2] - rest[j3 + 2]);
				bx += 0.5 * ((Rm[i9] + Rm[j9]) * rx + (Rm[i9 + 1] + Rm[j9 + 1]) * ry + (Rm[i9 + 2] + Rm[j9 + 2]) * rz);
				by += 0.5 * ((Rm[i9 + 3] + Rm[j9 + 3]) * rx + (Rm[i9 + 4] + Rm[j9 + 4]) * ry + (Rm[i9 + 5] + Rm[j9 + 5]) * rz);
				bz += 0.5 * ((Rm[i9 + 6] + Rm[j9 + 6]) * rx + (Rm[i9 + 7] + Rm[j9 + 7]) * ry + (Rm[i9 + 8] + Rm[j9 + 8]) * rz);
				if (!fj) { bx += P[j3]; by += P[j3 + 1]; bz += P[j3 + 2]; }
			}
			const sn = w[i] * (nx * T[i3] + ny * T[i3 + 1] + nz * T[i3 + 2]);
			B[c3] = bx + g * P[i3] + sn * nx; B[c3 + 1] = by + g * P[i3 + 1] + sn * ny; B[c3 + 2] = bz + g * P[i3 + 2] + sn * nz;
		}
		// global: preconditioned conjugate gradients from the current X (gathered into x, scattered back)
		for (let c = 0; c < nf; c++) { const i3 = L[c] * 3, c3 = c * 3; x[c3] = X[i3]; x[c3 + 1] = X[i3 + 1]; x[c3 + 2] = X[i3 + 2]; }
		matvec(sys, x, Ap);
		for (let m = 0; m < n3; m++) r[m] = B[m] - Ap[m];
		precond(sys, r, z); p.set(z);
		let rz = dotF(r, z);
		for (let c = 0; c < o.cg && rz > 1e-14; c++) {
			matvec(sys, p, Ap);
			const alpha = rz / dotF(p, Ap);
			for (let m = 0; m < n3; m++) { x[m] += alpha * p[m]; r[m] -= alpha * Ap[m]; }
			precond(sys, r, z);
			const rz2 = dotF(r, z), beta = rz2 / rz;
			rz = rz2;
			for (let m = 0; m < n3; m++) p[m] = z[m] + beta * p[m];
		}
		for (let c = 0; c < nf; c++) { const i3 = L[c] * 3, c3 = c * 3; X[i3] = x[c3]; X[i3 + 1] = x[c3 + 1]; X[i3 + 2] = x[c3 + 2]; }
		// contact: the nearest skin point (walk from the previous face); a point inside the body goes
		// back onto it and rests there, one outside stays where it is, off the skin
		let off = 0;
		for (let c = 0; c < nf; c++) off += contact(L[c], X, P, Nn, idx, topo.faceAdj, face, bary, T, n, w, s, grid);
		stats.off = off;
	}
	return { pos: T, nrm: n, face, bary, q, w, off: stats.off, ms: performance.now() - t0 };
}

// The solve's kernels, at module level (not closures made per solve) so the engine's optimised
// code carries over from one solve to the next; as closures every solve started unoptimised and
// its first outer iteration took ~0.5 s. s: { nf, L, deg, g, n, w, nbStart, NB } (slideGarment).
// y = M x on the free vertices (compact): (deg + g) x_i + w_i n (n . x_i) - sum of free neighbours
function matvec(s, x, y) {
	const { nf, L, deg, g, n, w, nbStart, NB } = s;
	for (let c = 0; c < nf; c++) {
		const i = L[c], d = deg[i] + g, i3 = i * 3, c3 = c * 3, nx = n[i3], ny = n[i3 + 1], nz = n[i3 + 2];
		const dot = w[i] * (nx * x[c3] + ny * x[c3 + 1] + nz * x[c3 + 2]);
		let ax = d * x[c3] + dot * nx, ay = d * x[c3 + 1] + dot * ny, az = d * x[c3 + 2] + dot * nz;
		for (let e = nbStart[c], e1 = nbStart[c + 1]; e < e1; e++) { const j3 = NB[e] * 3; ax -= x[j3]; ay -= x[j3 + 1]; az -= x[j3 + 2]; }
		y[c3] = ax; y[c3 + 1] = ay; y[c3 + 2] = az;
	}
}
// block-Jacobi preconditioner: (a I + w n n^T)^-1 v = (v - w / (a + w) n (n . v)) / a
function precond(s, v, out) {
	const { nf, L, deg, g, n, w } = s;
	for (let c = 0; c < nf; c++) {
		const i = L[c], a = deg[i] + g, i3 = i * 3, c3 = c * 3, nx = n[i3], ny = n[i3 + 1], nz = n[i3 + 2];
		const k = (w[i] / (a + w[i])) * (nx * v[c3] + ny * v[c3 + 1] + nz * v[c3 + 2]);
		out[c3] = (v[c3] - k * nx) / a; out[c3 + 1] = (v[c3 + 1] - k * ny) / a; out[c3 + 2] = (v[c3 + 2] - k * nz) / a;
	}
}
function dot3(a, b, n3) { let d = 0; for (let c3 = 0; c3 < n3; c3 += 3) d += a[c3] * b[c3] + a[c3 + 1] * b[c3 + 1] + a[c3 + 2] * b[c3 + 2]; return d; }

const bar = [0, 0, 0], recent = new Int32Array(8).fill(-1);
// -> 1 when the point is off the skin
function contact(i, X, P, Nn, idx, adj, face, bary, T, n, w, s, grid) {
	const i3 = i * 3, px = X[i3], py = X[i3 + 1], pz = X[i3 + 2];
	let f = face[i], over = false;
	for (let it = 0; it < 60; it++) {
		baryIn(f, px, py, pz, P, idx);
		let k = 0;
		if (bar[1] < bar[k]) k = 1;
		if (bar[2] < bar[k]) k = 2;
		if (bar[k] >= -1e-7) break;
		const g = adj[f * 3 + (k + 1) % 3];
		if (g < 0) break;
		// going round in a circle: over a crease, each side's plane pointing across to the other
		if (recent.includes(g)) { over = true; break; }
		recent[it & 7] = f;
		f = g;
	}
	recent.fill(-1);
	let b0 = Math.max(bar[0], 0), b1 = Math.max(bar[1], 0), b2 = Math.max(bar[2], 0);
	const sum = b0 + b1 + b2 || 1; b0 /= sum; b1 /= sum; b2 /= sum;
	face[i] = f; bary[i3] = b0; bary[i3 + 1] = b1; bary[i3 + 2] = b2;
	const a = idx[f * 3] * 3, b = idx[f * 3 + 1] * 3, c = idx[f * 3 + 2] * 3;
	let nx = b0 * Nn[a] + b1 * Nn[b] + b2 * Nn[c], ny = b0 * Nn[a + 1] + b1 * Nn[b + 1] + b2 * Nn[c + 1], nz = b0 * Nn[a + 2] + b1 * Nn[b + 2] + b2 * Nn[c + 2];
	const L = Math.hypot(nx, ny, nz) || 1;
	nx /= L; ny /= L; nz /= L;
	n[i3] = nx; n[i3 + 1] = ny; n[i3 + 2] = nz;
	const sx = b0 * P[a] + b1 * P[b] + b2 * P[c], sy = b0 * P[a + 1] + b1 * P[b + 1] + b2 * P[c + 1], sz = b0 * P[a + 2] + b1 * P[b + 2] + b2 * P[c + 2];
	if (over || (px - sx) * nx + (py - sy) * ny + (pz - sz) * nz > OFF) {
		// off the skin it walked on, but a pose can press another part against it (the thigh on
		// the groin): inside the body's nearest skin anywhere, it goes onto that skin instead
		const hit = insideBody(px, py, pz, P, idx, grid);
		if (hit < 0) { T[i3] = px; T[i3 + 1] = py; T[i3 + 2] = pz; w[i] = 0; return 1; }
		face[i] = f = hit; b0 = cb[0]; b1 = cb[1]; b2 = cb[2];
		bary[i3] = b0; bary[i3 + 1] = b1; bary[i3 + 2] = b2;
		const a2 = idx[f * 3] * 3, b2i = idx[f * 3 + 1] * 3, c2 = idx[f * 3 + 2] * 3;
		for (let k = 0; k < 3; k++) {
			T[i3 + k] = X[i3 + k] = b0 * P[a2 + k] + b1 * P[b2i + k] + b2 * P[c2 + k];
			n[i3 + k] = b0 * Nn[a2 + k] + b1 * Nn[b2i + k] + b2 * Nn[c2 + k];
		}
		const L2 = Math.hypot(n[i3], n[i3 + 1], n[i3 + 2]) || 1;
		n[i3] /= L2; n[i3 + 1] /= L2; n[i3 + 2] /= L2;
		w[i] = s;
		return 0;
	}
	T[i3] = X[i3] = sx; T[i3 + 1] = X[i3 + 1] = sy; T[i3 + 2] = X[i3 + 2] = sz; w[i] = s;
	return 0;
}
const OFF = 1e-4; // further out than this from the skin counts as lifted off

// The posed skin's faces bucketed in CELL-sized cells (each face in every cell its box touches).
const CELL = 0.02;
function skinGrid(P, idx, F) {
	const cells = new Map();
	for (let f = 0; f < F; f++) {
		const a = idx[f * 3] * 3, b = idx[f * 3 + 1] * 3, c = idx[f * 3 + 2] * 3, lo = [0, 0, 0], hi = [0, 0, 0];
		for (let k = 0; k < 3; k++) { lo[k] = Math.floor(Math.min(P[a + k], P[b + k], P[c + k]) / CELL); hi[k] = Math.floor(Math.max(P[a + k], P[b + k], P[c + k]) / CELL); }
		for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) {
			const key = cellKey(x, y, z), l = cells.get(key);
			if (l) l.push(f); else cells.set(key, [f]);
		}
	}
	return cells;
}
const cellKey = (x, y, z) => (x + 512) + (y + 512) * 1024 + (z + 512) * 1048576;

// The face of the nearest skin within CELL of p, when p is inside the body there (behind that
// face), with its barycentrics in cb; else -1.
const cb = [0, 0, 0], tb = [0, 0, 0];
function insideBody(px, py, pz, P, idx, grid) {
	const cx = Math.floor(px / CELL), cy = Math.floor(py / CELL), cz = Math.floor(pz / CELL);
	let best = CELL * CELL, bf = -1;
	for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 1; y <= cy + 1; y++) for (let z = cz - 1; z <= cz + 1; z++) {
		const l = grid.get(cellKey(x, y, z));
		if (l) for (const f of l) {
			const d = closestOnFace(f, px, py, pz, P, idx);
			if (d < best) { best = d; bf = f; cb[0] = tb[0]; cb[1] = tb[1]; cb[2] = tb[2]; }
		}
	}
	if (bf < 0) return -1;
	const a = idx[bf * 3] * 3, b = idx[bf * 3 + 1] * 3, c = idx[bf * 3 + 2] * 3;
	const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
	const qx = px - (cb[0] * P[a] + cb[1] * P[b] + cb[2] * P[c]), qy = py - (cb[0] * P[a + 1] + cb[1] * P[b + 1] + cb[2] * P[c + 1]), qz = pz - (cb[0] * P[a + 2] + cb[1] * P[b + 2] + cb[2] * P[c + 2]);
	return qx * (uy * vz - uz * vy) + qy * (uz * vx - ux * vz) + qz * (ux * vy - uy * vx) < 0 ? bf : -1;
}

// Squared distance from p to face f's nearest point, its barycentrics in tb (Ericson 2005, 5.1.5).
function closestOnFace(f, px, py, pz, P, idx) {
	const a = idx[f * 3] * 3, b = idx[f * 3 + 1] * 3, c = idx[f * 3 + 2] * 3;
	const abx = P[b] - P[a], aby = P[b + 1] - P[a + 1], abz = P[b + 2] - P[a + 2], acx = P[c] - P[a], acy = P[c + 1] - P[a + 1], acz = P[c + 2] - P[a + 2];
	const apx = px - P[a], apy = py - P[a + 1], apz = pz - P[a + 2];
	const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
	let u, v, t;
	if (d1 <= 0 && d2 <= 0) { u = 1; v = 0; t = 0; }
	else {
		const bpx = px - P[b], bpy = py - P[b + 1], bpz = pz - P[b + 2];
		const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
		const cpx = px - P[c], cpy = py - P[c + 1], cpz = pz - P[c + 2];
		const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
		const vc = d1 * d4 - d3 * d2, vb = d5 * d2 - d1 * d6, va = d3 * d6 - d5 * d4;
		if (d3 >= 0 && d4 <= d3) { u = 0; v = 1; t = 0; }
		else if (d6 >= 0 && d5 <= d6) { u = 0; v = 0; t = 1; }
		else if (vc <= 0 && d1 >= 0 && d3 <= 0) { const s1 = d1 / (d1 - d3); u = 1 - s1; v = s1; t = 0; }
		else if (vb <= 0 && d2 >= 0 && d6 <= 0) { const s2 = d2 / (d2 - d6); u = 1 - s2; v = 0; t = s2; }
		else if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const s3 = (d4 - d3) / ((d4 - d3) + (d5 - d6)); u = 0; v = 1 - s3; t = s3; }
		else { const den = 1 / (va + vb + vc); v = vb * den; t = vc * den; u = 1 - v - t; }
	}
	tb[0] = u; tb[1] = v; tb[2] = t;
	const qx = px - (u * P[a] + v * P[b] + t * P[c]), qy = py - (u * P[a + 1] + v * P[b + 1] + t * P[c + 1]), qz = pz - (u * P[a + 2] + v * P[b + 2] + t * P[c + 2]);
	return qx * qx + qy * qy + qz * qz;
}
function baryIn(f, px, py, pz, P, idx) {
	const a = idx[f * 3] * 3, b = idx[f * 3 + 1] * 3, c = idx[f * 3 + 2] * 3;
	const v0x = P[b] - P[a], v0y = P[b + 1] - P[a + 1], v0z = P[b + 2] - P[a + 2];
	const v1x = P[c] - P[a], v1y = P[c + 1] - P[a + 1], v1z = P[c + 2] - P[a + 2];
	const v2x = px - P[a], v2y = py - P[a + 1], v2z = pz - P[a + 2];
	const d00 = v0x * v0x + v0y * v0y + v0z * v0z, d01 = v0x * v1x + v0y * v1y + v0z * v1z, d11 = v1x * v1x + v1y * v1y + v1z * v1z;
	const d20 = v2x * v0x + v2y * v0y + v2z * v0z, d21 = v2x * v1x + v2y * v1y + v2z * v1z, den = d00 * d11 - d01 * d01 || 1e-20;
	const v = (d11 * d20 - d01 * d21) / den, w = (d00 * d21 - d01 * d20) / den;
	bar[0] = 1 - v - w; bar[1] = v; bar[2] = w;
}

// Rotation part of a 3x3 matrix (row-major), Müller et al. 2016 ("A robust method to extract the
// rotational part of deformations"), warm-started from the quaternion in q[qo..qo+3]; writes the
// rotation matrix to R[ro..ro+8].
function extractRotation(a, q, qo, R, ro) {
	let x = q[qo], y = q[qo + 1], z = q[qo + 2], w = q[qo + 3];
	for (let it = 0; it < 4; it++) {
		const m = quatMat(x, y, z, w);
		// columns of R and of a: omega = sum_c r_c x a_c / |sum_c r_c . a_c|
		let ox = 0, oy = 0, oz = 0, d = 0;
		for (let c = 0; c < 3; c++) {
			const rx = m[c], ry = m[3 + c], rz = m[6 + c], ax = a[c], ay = a[3 + c], az = a[6 + c];
			ox += ry * az - rz * ay; oy += rz * ax - rx * az; oz += rx * ay - ry * ax; d += rx * ax + ry * ay + rz * az;
		}
		const k = 1 / (Math.abs(d) + 1e-9);
		ox *= k; oy *= k; oz *= k;
		const ang = Math.hypot(ox, oy, oz);
		if (ang < 1e-9) break;
		const h = ang / 2, sn = Math.sin(h) / ang, qx = ox * sn, qy = oy * sn, qz = oz * sn, qw = Math.cos(h);
		// q = dq * q
		const nx = qw * x + qx * w + qy * z - qz * y, ny = qw * y - qx * z + qy * w + qz * x, nz = qw * z + qx * y - qy * x + qz * w, nw = qw * w - qx * x - qy * y - qz * z;
		const L = Math.hypot(nx, ny, nz, nw);
		x = nx / L; y = ny / L; z = nz / L; w = nw / L;
	}
	q[qo] = x; q[qo + 1] = y; q[qo + 2] = z; q[qo + 3] = w;
	const m = quatMat(x, y, z, w);
	for (let k = 0; k < 9; k++) R[ro + k] = m[k];
}
const _m = new Float64Array(9);
function quatMat(x, y, z, w) {
	_m[0] = 1 - 2 * (y * y + z * z); _m[1] = 2 * (x * y - z * w); _m[2] = 2 * (x * z + y * w);
	_m[3] = 2 * (x * y + z * w); _m[4] = 1 - 2 * (x * x + z * z); _m[5] = 2 * (y * z - x * w);
	_m[6] = 2 * (x * z - y * w); _m[7] = 2 * (y * z + x * w); _m[8] = 1 - 2 * (x * x + y * y);
	return _m;
}
