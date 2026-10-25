// The taut sheet over the seat (experiment, 2026-10-25): where stretch fabric sits across the
// gluteal cleft. Neither lift spans it: the membrane lift (Man.computeLift) gives 0 mm there,
// because the cleft is two convex cheeks meeting in a slot whose walls face each other, and the
// rolling ball (body/ball.js) left a crevice and artifacts from a ball of about 90 mm up. The slide
// (body/slide.js) keeps the fabric's shape (as-rigid-as-possible), so it keeps the fold too.
//
// Here the fabric over the seat is a membrane under tension with no bending stiffness, at rest
// (the shape a cloth simulation settles to), solved as seen from behind: a height field u over a
// grid across the seat, the depth of the fabric along the view direction d. At rest a tensioned
// membrane with nothing pressing on it satisfies Tx u_xx + Ty u_yy = 0, and it cannot go inside the
// body: u <= s, s the depth of the skin seen from behind (an obstacle problem, projected SOR).
// Seen from behind the cleft's walls have no width, so the sheet has no extra material to fold
// away: this is the "fabric in the cleft is much shorter than the skin" of the plan. The sheet is
// held on the skin wherever the skin seen there is bare (the leg openings: their elastic) and along
// the body's outline, and rests on the cheeks where it touches them.
// Tension across (Tx, left to right) against along (Ty, up the seat): with equal tension the sheet
// must sag where it spans a gap over a rounded seat (u_xx = -u_yy: a saddle), a groove down the
// lower cleft; a leotard is stretched far harder around the hips than up the seat, which pulls it
// straight across. ky = Ty / Tx.
// The seat's fabric then moves along d onto the sheet: vertices the sheet covers (their cell has
// it off the skin, and they are the skin seen there) move onto it; vertices clearly elsewhere (the
// sheet rests on them, or they are far behind the skin seen: the front of the body) keep their
// lift; the rest (hidden a little: deep in the bottom of the cleft, the start of the gusset, skin
// under a cheek, the openings' edges) are interpolated between the two over the mesh, so the seat
// blends into the gusset instead of crumpling where one row moved 5 cm and the next not at all.
// The view frame comes from the posed seat itself (its mean normal, left to right), so it follows
// the pelvis in a pose. Knowledge: engineering/geometry/fabric-bridging-hollows.md.

const CELL = 0.0025; // m: grid spacing
const ITERS = 600, OMEGA = 1.8; // projected SOR passes and over-relaxation
const LIFTED = 0.0005; // m: sheet this far off the skin counts as spanning
// Visibility: a vertex at most VISIBLE behind the skin seen in its cell is that skin; one more than
// HIDDEN behind it is elsewhere (the front of the body is 15-25 cm behind the seat). The bottom of
// the cleft is up to 10 cm deep and reaches forward of the side seam: leaving those walls out (the
// region was the back half) left a pocket there.
const VISIBLE = 0.005, HIDDEN = 0.1;
const MAX_MOVE = 0.12; // m: no vertex moves further onto the sheet
const BLEND = 200; // Gauss-Seidel passes interpolating the in-between vertices
const STEEP = 1; // sheet slope (depth over width) above which vertices are blended, not landed on it

// The seat on the reference body, from 3 cm below the crotch to 25 cm above it, within 16 cm of the
// midline: back = the back half (sets the view frame and the grid), all = the whole trunk there (may
// move, see VISIBLE). Per mesh, cached.
function seatRegion(man) {
	if (man._seat) return man._seat;
	const N = man.vertices, R = man.ref, cy = man.crotchY, back = [], all = [];
	for (let i = 0; i < N; i++) {
		if (man.wHead[i] > 0.5 || man.wArm[i] > 0.5) continue;
		const x = R[i * 3], y = R[i * 3 + 1];
		if (!(Math.abs(x) < 0.16 && y > cy - 0.03 && y < cy + 0.25)) continue;
		all.push(i);
		if (man.form[i * 2] < 0) back.push(i);
	}
	return (man._seat = { back: Int32Array.from(back), all: Int32Array.from(all) });
}

// P: where the fabric is (slid in a pose); S / SN: the skin and its normals (the obstacle); cover:
// > 0 on fabric; D: the lift so far (N x 3, membrane or ball), rewritten in place over the seat;
// ky: tension along the seat over tension across it (0..1). -> { moved, blended: counts, normal,
// weight: per vertex, the sheet's normal for shading the moved fabric (weight 0: not moved),
// aoDepth: per vertex, the depth for AO where the seat changed the lift (-1 elsewhere), ms }.
export function seatSheet(man, P, S, SN, cover, D, ky) {
	const t0 = performance.now(), N = man.vertices, idx = man.idx, { back: region, all } = seatRegion(man);
	// view frame: d into the body (minus the seat's mean normal), e1 left to right, e2 = d x e1
	let dx = 0, dy = 0, dz = 0, lx = 0, ly = 0, lz = 0, rx = 0, ry = 0, rz = 0, nl = 0, nr = 0;
	for (const i of region) {
		dx -= SN[i * 3]; dy -= SN[i * 3 + 1]; dz -= SN[i * 3 + 2];
		if (man.ref[i * 3] > 0) { rx += S[i * 3]; ry += S[i * 3 + 1]; rz += S[i * 3 + 2]; nr++; } else { lx += S[i * 3]; ly += S[i * 3 + 1]; lz += S[i * 3 + 2]; nl++; }
	}
	const d = norm([dx, dy, dz]), e1 = norm(orth([rx / nr - lx / nl, ry / nr - ly / nl, rz / nr - lz / nl], d)), e2 = cross(d, e1);
	const A = (i, X) => X[i * 3] * e1[0] + X[i * 3 + 1] * e1[1] + X[i * 3 + 2] * e1[2];
	const B = (i, X) => X[i * 3] * e2[0] + X[i * 3 + 1] * e2[1] + X[i * 3 + 2] * e2[2];
	const Z = (i, X) => X[i * 3] * d[0] + X[i * 3 + 1] * d[1] + X[i * 3 + 2] * d[2];
	// the grid: the seat's extent seen from behind plus 2 cm
	let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
	for (const i of region) { const a = A(i, S), b = B(i, S); a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
	a0 -= 0.02; b0 -= 0.02; a1 += 0.02; b1 += 0.02;
	const W = Math.ceil((a1 - a0) / CELL) + 1, H = Math.ceil((b1 - b0) / CELL) + 1, M = W * H;
	// the skin seen from behind: depth s, and whether it is fabric
	const s = new Float32Array(M).fill(Infinity), cov = new Float32Array(M);
	const pa = [0, 0, 0], pb = [0, 0, 0], pz = [0, 0, 0], pc = [0, 0, 0];
	for (let f = 0, F = idx.length / 3; f < F; f++) {
		let skip = false;
		for (let k = 0; k < 3; k++) {
			const i = idx[f * 3 + k];
			if (man.wHead[i] > 0.5 || man.wArm[i] > 0.5) { skip = true; break; }
			pa[k] = (A(i, S) - a0) / CELL; pb[k] = (B(i, S) - b0) / CELL; pz[k] = Z(i, S); pc[k] = cover[i];
		}
		if (skip) continue;
		const x0 = Math.max(Math.ceil(Math.min(pa[0], pa[1], pa[2])), 0), x1 = Math.min(Math.floor(Math.max(pa[0], pa[1], pa[2])), W - 1);
		const y0 = Math.max(Math.ceil(Math.min(pb[0], pb[1], pb[2])), 0), y1 = Math.min(Math.floor(Math.max(pb[0], pb[1], pb[2])), H - 1);
		if (x0 > x1 || y0 > y1) continue;
		const den = (pb[1] - pb[2]) * (pa[0] - pa[2]) + (pa[2] - pa[1]) * (pb[0] - pb[2]);
		if (Math.abs(den) < 1e-12) continue;
		for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
			const w0 = ((pb[1] - pb[2]) * (x - pa[2]) + (pa[2] - pa[1]) * (y - pb[2])) / den, w1 = ((pb[2] - pb[0]) * (x - pa[2]) + (pa[0] - pa[2]) * (y - pb[2])) / den, w2 = 1 - w0 - w1;
			if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
			const z = w0 * pz[0] + w1 * pz[1] + w2 * pz[2], c = y * W + x;
			if (z < s[c]) { s[c] = z; cov[c] = w0 * pc[0] + w1 * pc[1] + w2 * pc[2]; }
		}
	}
	// the sheet: free over fabric, held on the skin elsewhere (bare skin: the openings' elastic),
	// absent off the body. Held too: the grid's border, and the body's outline (cells next to one off
	// the body: the hips turning away, the gap between the legs). Free at the outline, with no
	// neighbour beyond it, the sheet floated off there (up to 8 cm behind the crotch) and dragged the
	// seat's lower edge back into spikes or a ledge. (A facing test, held where the skin seen turns
	// from the view, also held the cleft's own walls, which face sideways: dimples in the sheet.)
	const free = new Uint8Array(M), u = Float32Array.from(s);
	for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
		const c = y * W + x;
		if (s[c] < Infinity && cov[c] > 0 && s[c - 1] < Infinity && s[c + 1] < Infinity && s[c - W] < Infinity && s[c + W] < Infinity) free[c] = 1;
	}
	for (let it = 0; it < ITERS; it++) {
		for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
			const c = y * W + x;
			if (!free[c]) continue;
			const sum = u[c - 1] + u[c + 1] + ky * (u[c - W] + u[c + W]), n = 2 + 2 * ky;
			u[c] = Math.min(u[c] + OMEGA * (sum / n - u[c]), s[c]);
		}
	}
	// The seat's fabric onto the sheet. cls: 1 = on the sheet (target set), 2 = keeps its lift,
	// 3 = interpolated (the hidden-a-little fabric, and bare skin next to fabric: the triangles across
	// an opening's edge, whose elastic lifts with the fabric).
	const St = man.adjStart, Adj = man.adj, cls = new Uint8Array(N), T = Float32Array.from(D);
	// For shading, per moved vertex: the sheet's own normal and its span over the skin (the AO depth),
	// with a weight (the fade). The cleft's walls (up to 10 cm of fabric at the bottom of a deep cleft)
	// land on a strip a few mm wide; normals of those crushed triangles shade as a crumpled streak.
	// (Spreading the landed vertices over the sheet instead folded the fabric: 2026-10-25.)
	const NS = new Float32Array(N * 3), WS = new Float32Array(N), AOD = new Float32Array(N).fill(-1);
	const AOT = new Float32Array(N); // the AO depth as interpolated (off the seat: the lift's length)
	for (let i = 0; i < N; i++) AOT[i] = Math.hypot(D[i * 3], D[i * 3 + 1], D[i * 3 + 2]);
	// the sheet and the skin seen at (a, b): bilinear over the four cells, those on the body only
	let su = 0, ss = 0, ua = 0, ub = 0;
	const sample = (a, b) => {
		const gx = (a - a0) / CELL, gy = (b - b0) / CELL, x = Math.floor(gx), y = Math.floor(gy);
		if (x < 0 || y < 0 || x >= W - 1 || y >= H - 1) return false;
		const fx = gx - x, fy = gy - y;
		let sw = 0; su = 0; ss = 0;
		for (const [cx, cy, w] of [[x, y, (1 - fx) * (1 - fy)], [x + 1, y, fx * (1 - fy)], [x, y + 1, (1 - fx) * fy], [x + 1, y + 1, fx * fy]]) {
			const c = cy * W + cx;
			if (s[c] === Infinity || w <= 0) continue;
			su += u[c] * w; ss += s[c] * w; sw += w;
		}
		if (!sw) return false;
		su /= sw; ss /= sw;
		// the sheet's slope (central differences, cells on the body only)
		const c = y * W + x, sl = (p, q) => (s[p] < Infinity && s[q] < Infinity ? (u[q] - u[p]) / (2 * CELL) : 0);
		ua = x > 0 && x < W - 2 ? sl(c - 1, c + 1) : 0; ub = y > 0 && y < H - 2 ? sl(c - W, c + W) : 0;
		return true;
	};
	const mid = [];
	let moved = 0;
	for (const i of all) {
		if (cover[i] <= 0) {
			for (let e = St[i]; e < St[i + 1]; e++) if (cover[Adj[e]] > 0) { cls[i] = 3; break; }
			continue;
		}
		cls[i] = 2;
		if (!sample(A(i, P), B(i, P))) continue;
		const z = Z(i, P), behind = z - ss;
		if (behind > HIDDEN) continue;
		if (behind > VISIBLE) { cls[i] = 3; continue; }
		if (ss - su <= LIFTED || z - su <= 0 || z - su > MAX_MOVE) continue;
		// where the sheet is steep (down to its held edge at the bottom of the cleft) it is no surface to
		// land on: neighbours a millimetre apart got moves 2 cm apart (crumpled fabric). Blended there.
		if (ua * ua + ub * ub > STEEP * STEEP) { cls[i] = 3; continue; }
		// faded out towards the region's top and sides: the sheet also spans the spine's groove, and a
		// move stopping dead at the region's edge left a step across the small of the back
		const ry = man.ref[i * 3 + 1] - man.crotchY, rx = Math.abs(man.ref[i * 3]);
		const fade = (1 - smooth(0.15, 0.25, ry)) * (1 - smooth(0.11, 0.16, rx)), m = z - su;
		for (let k = 0; k < 3; k++) T[i * 3 + k] = D[i * 3 + k] + fade * (-d[k] * m - D[i * 3 + k]);
		// outward normal of the sheet a e1 + b e2 + u d: -d + u_a e1 + u_b e2
		const nx = -d[0] + ua * e1[0] + ub * e2[0], ny = -d[1] + ua * e1[1] + ub * e2[1], nz = -d[2] + ua * e1[2] + ub * e2[2], l = Math.hypot(nx, ny, nz);
		NS[i * 3] = nx / l; NS[i * 3 + 1] = ny / l; NS[i * 3 + 2] = nz / l;
		AOT[i] += fade * (ss - su - AOT[i]); WS[i] = fade;
		cls[i] = 1; moved++;
	}
	for (const i of all) if (cls[i] === 3) mid.push(i);
	// interpolate: each in-between vertex the mean of its neighbours' displacement and AO depth
	// (Gauss-Seidel)
	for (let it = 0; it < BLEND; it++) for (const i of mid) {
		let sx = 0, sy = 0, sz = 0, sa = 0;
		const n = St[i + 1] - St[i];
		for (let e = St[i]; e < St[i + 1]; e++) { const j = Adj[e]; sx += T[j * 3]; sy += T[j * 3 + 1]; sz += T[j * 3 + 2]; sa += AOT[j]; }
		T[i * 3] = sx / n; T[i * 3 + 1] = sy / n; T[i * 3 + 2] = sz / n; AOT[i] = sa / n;
	}
	for (const i of all) if (cls[i] === 1 || cls[i] === 3) { for (let k = 0; k < 3; k++) D[i * 3 + k] = T[i * 3 + k]; AOD[i] = AOT[i]; }
	return { moved, blended: mid.length, normal: NS, aoDepth: AOD, weight: WS, ms: performance.now() - t0 };
}

function smooth(a, b, x) { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); }
function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
function orth(v, n) { const k = v[0] * n[0] + v[1] * n[1] + v[2] * n[2]; return [v[0] - k * n[0], v[1] - k * n[1], v[2] - k * n[2]]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
