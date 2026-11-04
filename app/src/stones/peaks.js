// Stones kept apart by a parallel rule: the look of every pattern since 2026-11-04 (owner, after comparing it with
// overlapping stones and with the one-by-one check before them: knowledge/decisions/2026-11-04-pattern-stones-kept-apart.md). Each candidate stands
// somewhere in an order (the one the old check went in: the stones a design hangs on first, a scatter's big ones before its
// small); two candidates closer than their sizes allow conflict. A kept candidate is one no kept candidate above it conflicts
// with. Found in rounds, every candidate at once in each (as a shader would: a candidate is in once all above it that it
// conflicts with are out, out once one of them is in); the rounds end with the same stones the one-by-one check keeps.
// What a candidate conflicts with depends only on the candidates, so it is worked out when they are drawn, not on a move.
import { SIZES } from './candidates.js';

// how close two stones of one pattern may lie, as a share of touching (the old check's): measured on the flat cloth
const FLAT_CLEAR = 0.92;

const graphs = new WeakMap(); // per candidate set (its GX array): the conflicts

// a stone size's class: its place among the sold sizes, biggest first (the order a mixed scatter is decided in)
const sizeClass = (d) => { let q = 0; while (q < SIZES.length - 1 && SIZES[q] < d - 1e-7) q++; return SIZES.length - 1 - q; };

// A counting-sort grid of some candidates (ids): cells as big as the reach between two of their biggest, or, where the
// candidates are sparser than that (one size of a mixed scatter), as big as holds about one of them. -> { x0, y0, cell, nx, ny, first (CSR by cell), items, and their x, y, d, order (pos) in cell order; maxD }
function gridOf(ids, GX, GY, D, pos, clear) {
	const m = ids.length;
	let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, maxD = 0;
	for (let e = 0; e < m; e++) {
		const i = ids[e], x = GX[i], y = GY[i];
		if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (D[i] > maxD) maxD = D[i];
	}
	const cell = Math.max(maxD * clear, Math.sqrt(((x1 - x0) * (y1 - y0)) / m), 1e-4);
	const nx = Math.floor((x1 - x0) / cell) + 1, ny = Math.floor((y1 - y0) / cell) + 1;
	const first = new Int32Array(nx * ny + 1), items = new Int32Array(m), at = new Int32Array(m);
	for (let e = 0; e < m; e++) { const i = ids[e], k = Math.floor((GY[i] - y0) / cell) * nx + Math.floor((GX[i] - x0) / cell); at[e] = k; first[k + 1]++; }
	for (let k = 0; k < nx * ny; k++) first[k + 1] += first[k];
	const put = first.slice(0, nx * ny);
	const x = new Float64Array(m), y = new Float64Array(m), d = new Float64Array(m), p = new Int32Array(m);
	for (let e = 0; e < m; e++) { const q = put[at[e]]++, i = ids[e]; items[q] = i; x[q] = GX[i]; y[q] = GY[i]; d[q] = D[i]; p[q] = pos[i]; }
	return { x0, y0, cell, nx, ny, first, items, x, y, d, p, maxD };
}

// The conflicts of a candidate set (stones/pattern.js patternCandidates' output): for each candidate, those above it in the
// order that it conflicts with. -> { n, order (candidates, first first), start, list (CSR: list[start[i]..start[i+1]]) }
export function conflictsOf(Cd) {
	let g = graphs.get(Cd.GX);
	if (g) return g;
	const { n, GX, GY, D, PR, K, dart, gap, varied } = Cd, clear = dart ? gap : FLAT_CLEAR;
	// the order: a scatter by size, biggest first; otherwise by what the design hangs on (P), then as drawn
	const order = new Int32Array(n);
	let minK = Infinity, maxK = -Infinity, minP = Infinity, maxP = -Infinity;
	for (let i = 0; i < n; i++) { minK = Math.min(minK, K[i]); maxK = Math.max(maxK, K[i]); minP = Math.min(minP, PR[i]); maxP = Math.max(maxP, PR[i]); }
	const mixed = dart && (minK !== maxK || varied), cls = mixed ? new Int32Array(n) : null;
	if (mixed) {
		for (let i = 0; i < n; i++) cls[i] = sizeClass(D[i]);
		const by = new Int32Array(SIZES.length + 2);
		for (let i = 0; i < n; i++) by[cls[i] + 1]++;
		for (let q = 1; q < by.length; q++) by[q] += by[q - 1];
		for (let i = 0; i < n; i++) order[by[cls[i]]++] = i;
	} else if (minP !== maxP) {
		const by = new Int32Array(258);
		for (let i = 0; i < n; i++) by[PR[i] + 1]++;
		for (let q = 1; q < 258; q++) by[q] += by[q - 1];
		for (let i = 0; i < n; i++) order[by[PR[i]]++] = i;
	} else for (let i = 0; i < n; i++) order[i] = i;
	const pos = new Int32Array(n);
	for (let o = 0; o < n; o++) pos[order[o]] = o;
	// neighbours: counting-sort grids in typed arrays, one per size class when a scatter mixes sizes (one grid with cells as big
	// as the biggest reach made every small stone search cells full of small stones beyond its own reach: 38 ms on
	// scatter-mixed). Each candidate searches only the cells within its reach of that class's biggest stone. The CPU twin of the
	// GPU spatial hash the stone engine is to use (knowledge: product/roadmap/webgpu-and-stone-engine-plan.md, Phase 3).
	const nc = mixed ? SIZES.length : 1, of = new Int32Array(nc + 1), members = new Int32Array(n);
	for (let i = 0; i < n; i++) of[(mixed ? cls[i] : 0) + 1]++;
	for (let c = 0; c < nc; c++) of[c + 1] += of[c];
	const put = of.slice(0, nc);
	for (let i = 0; i < n; i++) members[put[mixed ? cls[i] : 0]++] = i;
	const grids = [];
	for (let c = 0; c < nc; c++) if (of[c + 1] > of[c]) grids.push({ ...gridOf(members.subarray(of[c], of[c + 1]), GX, GY, D, pos, clear), c });
	const start = new Int32Array(n + 1);
	let list = new Int32Array(Math.max(64, n * 4)), m = 0;
	for (let i = 0; i < n; i++) {
		start[i] = m;
		const x = GX[i], y = GY[i], d = D[i], p = pos[i];
		for (const G of grids) {
			if (mixed && G.c > cls[i]) break; // smaller stones come later in the order: none is above this one
			const r = ((d + G.maxD) / 2) * clear, { x0, y0, cell, nx, first, items, x: gx, y: gy, d: gd, p: gp } = G;
			const ax = Math.max(0, Math.floor((x - r - x0) / cell)), bx = Math.min(nx - 1, Math.floor((x + r - x0) / cell));
			const ay = Math.max(0, Math.floor((y - r - y0) / cell)), by = Math.min(G.ny - 1, Math.floor((y + r - y0) / cell));
			for (let cy = ay; cy <= by; cy++) for (let cx = ax; cx <= bx; cx++) {
				const k = cy * nx + cx;
				for (let e = first[k]; e < first[k + 1]; e++) {
					if (gp[e] >= p) continue;
					const dx = gx[e] - x, dy = gy[e] - y, c = ((gd[e] + d) / 2) * clear;
					if (dx * dx + dy * dy >= c * c) continue;
					if (m === list.length) { const L = new Int32Array(m * 2); L.set(list); list = L; }
					list[m++] = items[e];
				}
			}
		}
	}
	start[n] = m;
	g = { n, order, start, list: list.slice(0, m) };
	graphs.set(Cd.GX, g);
	return g;
}

let aliveBuf = new Uint8Array(0), wonBuf = new Uint8Array(0), nextBuf = new Uint8Array(0);
// A cleared flag per candidate: 1 for those the keep test passed (stones/pattern.js keepPattern).
export function aliveOf(n) {
	if (aliveBuf.length < n) aliveBuf = new Uint8Array(Math.ceil(n * 1.5));
	aliveBuf.fill(0, 0, n);
	return aliveBuf;
}

// Which alive candidates are kept. parallel: in rounds, each candidate decided from the last round's states only (the
// shader's way; resolvePeaks.rounds says how many); otherwise down the order once (the same stones).
export function resolvePeaks(g, alive, parallel = false) {
	const { n, order, start, list } = g;
	if (wonBuf.length < n) { wonBuf = new Uint8Array(Math.ceil(n * 1.5)); nextBuf = new Uint8Array(wonBuf.length); }
	const won = wonBuf;
	if (!parallel) {
		for (let o = 0; o < n; o++) {
			const i = order[o];
			let w = alive[i];
			for (let e = start[i]; w && e < start[i + 1]; e++) if (won[list[e]]) w = 0;
			won[i] = w;
		}
		resolvePeaks.rounds = 0;
		return won;
	}
	// states: 0 undecided, 1 in, 2 out
	let S = won, N = nextBuf, rounds = 0, open = 0;
	for (let i = 0; i < n; i++) { S[i] = alive[i] ? 0 : 2; if (alive[i]) open++; }
	while (open) {
		rounds++;
		open = 0;
		for (let i = 0; i < n; i++) {
			if (S[i]) { N[i] = S[i]; continue; }
			let s = 1;
			for (let e = start[i]; e < start[i + 1]; e++) { const b = S[list[e]]; if (b === 1) { s = 2; break; } if (b === 0) s = 0; }
			N[i] = s;
			if (!s) open++;
		}
		const t = S; S = N; N = t;
	}
	for (let i = 0; i < n; i++) S[i] = S[i] === 1 ? 1 : 0;
	if (S !== wonBuf) { wonBuf.set(S.subarray(0, n)); }
	resolvePeaks.rounds = rounds;
	return wonBuf;
}
resolvePeaks.rounds = 0;
