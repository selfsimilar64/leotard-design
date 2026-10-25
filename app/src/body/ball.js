// The rolling-ball fit (experiment, 2026-10-25): where taut fabric sits over the body's folds. A
// ball of radius R rolled over the skin cannot drop into a fold narrower than itself; the fabric
// lies on the surface the ball traces (a morphological closing of the body). On convex skin that is
// the skin itself; across a fold (the gluteal cleft, the crotch) it is an arc from one side to the
// other, flatter the bigger the ball. The membrane lift (Man.computeLift) cannot do this: the
// cleft is two convex cheeks meeting in a slot, whose walls face each other, so lifting along the
// normal moves them sideways and never across (measured: 0 mm of lift over a 25-50 mm cleft).
//
// 1. Ball centres: every skin point plus its normal times R, kept where the ball touches no other
//    skin of the same part (cached per body, pose and R: they do not depend on the garment).
// 2. Each fabric vertex whose own ball is blocked moves to the nearest point of the nearest free
//    ball: G = c + (P - c) * R / |P - c|.
// 3. The move fades in over PIN from each opening (elastic holds it to the body), then is
//    smoothed over the fabric with bare skin held at 0, so the arcs from neighbouring balls blend.
// 4. The moved vertices are relaxed on the garment surface (untangling the two walls of a fold).
// Parts: the arms are separate from the trunk (torso and legs), or a ball too big for the gap
// between arm and side would web the torso's fabric to the arm; the head is no obstacle.

const TOL = 0.0005; // m: a ball this close to the skin still counts as resting on it
const SNAP = 0.002; // m: fabric this close to a free ball stays where it is
const SMOOTH = 8; // smoothing passes over the displacement (25 pulled the bridge back into the cleft)
const RELAX = 10; // untangling passes (step 4); 40 pulled fabric inside the cheeks
const PIN = 0.03; // m from an opening over which the fabric lets go of the skin

const key = (x, y, z) => ((x + 1024) * 2048 + (y + 1024)) * 2048 + (z + 1024);
const cellOf = (v, s) => Math.floor(v / s);

function gridOf(X, ids, s) {
	const g = new Map();
	for (const i of ids) {
		const k = key(cellOf(X[i * 3], s), cellOf(X[i * 3 + 1], s), cellOf(X[i * 3 + 2], s));
		let b = g.get(k); if (!b) g.set(k, b = []); b.push(i);
	}
	return g;
}

// Calls fn(j) for every point of grid g in the cells overlapping the sphere (x, y, z, r); stops
// when fn returns true.
function near(g, s, x, y, z, r, fn) {
	const x0 = cellOf(x - r, s), x1 = cellOf(x + r, s), y0 = cellOf(y - r, s), y1 = cellOf(y + r, s), z0 = cellOf(z - r, s), z1 = cellOf(z + r, s);
	for (let a = x0; a <= x1; a++) for (let b = y0; b <= y1; b++) for (let c = z0; c <= z1; c++) {
		const l = g.get(key(a, b, c));
		if (l) for (const j of l) if (fn(j)) return;
	}
}

// Part of each vertex: 0 trunk (torso, legs), 1 / 2 the arms, -1 the head. Per mesh, cached.
function groupsOf(man) {
	if (man._ballGroups) return man._ballGroups;
	const N = man.vertices, g = new Int8Array(N);
	for (let i = 0; i < N; i++) g[i] = man.wHead[i] > 0.5 ? -1 : man.wArm[i] > 0.5 ? (man.ref[i * 3] > 0 ? 1 : 2) : 0;
	return (man._ballGroups = g);
}

// The free balls on skin S (normals SN): { C: centres, grids: per part, of the free ones }.
function centresOf(man, S, SN, R) {
	const N = man.vertices, group = groupsOf(man), s = R / 2, C = new Float32Array(N * 3);
	const ids = [[], [], []];
	for (let i = 0; i < N; i++) if (group[i] >= 0) ids[group[i]].push(i);
	const skin = ids.map((l) => gridOf(S, l, s)), free = [[], [], []], lim = (R - TOL) ** 2;
	for (let i = 0; i < N; i++) {
		const g = group[i];
		if (g < 0) continue;
		const x = S[i * 3] + SN[i * 3] * R, y = S[i * 3 + 1] + SN[i * 3 + 1] * R, z = S[i * 3 + 2] + SN[i * 3 + 2] * R;
		C[i * 3] = x; C[i * 3 + 1] = y; C[i * 3 + 2] = z;
		let blocked = false;
		near(skin[g], s, x, y, z, R, (j) => {
			const dx = S[j * 3] - x, dy = S[j * 3 + 1] - y, dz = S[j * 3 + 2] - z;
			return (blocked = dx * dx + dy * dy + dz * dz < lim);
		});
		if (!blocked) free[g].push(i);
	}
	return { C, free: free.map((l) => new Set(l)), grids: free.map((l) => gridOf(C, l, s)), s };
}

// Displacement (N x 3) from the fabric's place P (normals PN) to the ball's surface, for the
// fabric vertices (cover > 0). S / SN: the skin (the obstacle); R: the ball's radius (m); cache: an
// object kept by the caller between calls on the same body, pose and R.
export function rollingBall(man, P, PN, S, SN, cover, R, cache) {
	const N = man.vertices, group = groupsOf(man), D = new Float32Array(N * 3);
	if (!(R > 0)) return D;
	if (cache.R !== R || cache.S !== S) Object.assign(cache, { R, S, ...centresOf(man, S, SN, R) });
	const { C, free, grids, s } = cache, fabric = new Uint8Array(N);
	for (let i = 0; i < N; i++) {
		const g = group[i];
		if (g < 0 || cover[i] <= 0) continue;
		fabric[i] = 1;
		const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
		// own ball free and still touching: the fabric lies on the skin here
		if (free[g].has(i)) {
			const dx = x - C[i * 3], dy = y - C[i * 3 + 1], dz = z - C[i * 3 + 2];
			if (dx * dx + dy * dy + dz * dz <= (R + TOL) ** 2) continue;
		}
		// the nearest free ball: search a shell that grows until one is found
		let best = Infinity, bj = -1;
		for (let r = R + 0.02; bj < 0 && r < R + 0.2; r *= 1.6) {
			near(grids[g], s, x, y, z, r, (j) => {
				const dx = x - C[j * 3], dy = y - C[j * 3 + 1], dz = z - C[j * 3 + 2], d = dx * dx + dy * dy + dz * dz;
				if (d < best && d <= r * r) { best = d; bj = j; }
			});
		}
		if (bj < 0) continue;
		const d = Math.sqrt(best);
		// inside or on a free ball: already clear of the fold. SNAP, not TOL: in a pose the fabric
		// has slid off its own skin point, and the millimetre moves that left everywhere were
		// shrunk into the body by the untangling (skin through the back and shoulders, split leap).
		if (d <= R + SNAP) continue;
		const f = R / d - 1;
		D[i * 3] = (x - C[bj * 3]) * f; D[i * 3 + 1] = (y - C[bj * 3 + 1]) * f; D[i * 3 + 2] = (z - C[bj * 3 + 2]) * f;
	}
	// Openings hold to the body as their elastic does: the move fades in over PIN metres from bare
	// skin (distance along the mesh). Without it the crotch gusset, a few cm between the leg
	// openings, was pushed out below the leg line into a crumpled bulge.
	const St = man.adjStart, A = man.adj, dist = new Float32Array(N).fill(Infinity), queue = [];
	for (let i = 0; i < N; i++) if (fabric[i]) for (let e = St[i]; e < St[i + 1]; e++) if (!fabric[A[e]] && group[A[e]] >= 0) { dist[i] = 0; queue.push(i); break; }
	for (let q = 0; q < queue.length; q++) {
		const i = queue[q];
		if (dist[i] > PIN) continue;
		for (let e = St[i]; e < St[i + 1]; e++) {
			const j = A[e];
			if (!fabric[j]) continue;
			const d = dist[i] + Math.hypot(S[i * 3] - S[j * 3], S[i * 3 + 1] - S[j * 3 + 1], S[i * 3 + 2] - S[j * 3 + 2]);
			if (d < dist[j]) { dist[j] = d; queue.push(j); }
		}
	}
	for (let i = 0; i < N; i++) if (dist[i] < PIN) { const t = dist[i] / PIN, w = t * t * (3 - 2 * t); D[i * 3] *= w; D[i * 3 + 1] *= w; D[i * 3 + 2] *= w; }
	// blend over the fabric, bare skin held at 0
	let a = D, b = new Float32Array(N * 3);
	for (let it = 0; it < SMOOTH; it++) {
		for (let i = 0; i < N; i++) {
			if (!fabric[i]) continue;
			let sx = 0, sy = 0, sz = 0;
			for (let e = St[i]; e < St[i + 1]; e++) { const j = A[e]; sx += a[j * 3]; sy += a[j * 3 + 1]; sz += a[j * 3 + 2]; }
			const n = St[i + 1] - St[i];
			b[i * 3] = 0.5 * a[i * 3] + 0.5 * sx / n; b[i * 3 + 1] = 0.5 * a[i * 3 + 1] + 0.5 * sy / n; b[i * 3 + 2] = 0.5 * a[i * 3 + 2] + 0.5 * sz / n;
		}
		[a, b] = [b, a];
	}
	// Untangle: vertices from the two walls of a fold land on the same arc and can cross (folded
	// triangles, measured ~300 on the gluteal cleft and crotch at R 5-10 cm). The moved vertices
	// relax towards their neighbours' mean on the garment surface; the rest hold them in place.
	// Never inwards of where the fabric was (PN, its normal): averaging shrinks a convex surface.
	const moved = [];
	for (let i = 0; i < N; i++) if (fabric[i] && Math.abs(a[i * 3]) + Math.abs(a[i * 3 + 1]) + Math.abs(a[i * 3 + 2]) > 0.0005) moved.push(i);
	const G = new Float32Array(N * 3), G2 = new Float32Array(N * 3);
	for (let i = 0; i < N * 3; i++) G[i] = P[i] + a[i];
	for (let it = 0; it < RELAX; it++) {
		for (const i of moved) {
			let sx = 0, sy = 0, sz = 0;
			for (let e = St[i]; e < St[i + 1]; e++) { const j = A[e]; sx += G[j * 3]; sy += G[j * 3 + 1]; sz += G[j * 3 + 2]; }
			const n = St[i + 1] - St[i];
			G2[i * 3] = sx / n; G2[i * 3 + 1] = sy / n; G2[i * 3 + 2] = sz / n;
		}
		for (const i of moved) {
			const dx = G2[i * 3] - P[i * 3], dy = G2[i * 3 + 1] - P[i * 3 + 1], dz = G2[i * 3 + 2] - P[i * 3 + 2];
			const o = Math.min(dx * PN[i * 3] + dy * PN[i * 3 + 1] + dz * PN[i * 3 + 2], 0);
			G[i * 3] = G2[i * 3] - PN[i * 3] * o; G[i * 3 + 1] = G2[i * 3 + 1] - PN[i * 3 + 1] * o; G[i * 3 + 2] = G2[i * 3 + 2] - PN[i * 3 + 2] * o;
		}
	}
	for (const i of moved) for (let k = 0; k < 3; k++) a[i * 3 + k] = G[i * 3 + k] - P[i * 3 + k];
	return a;
}
