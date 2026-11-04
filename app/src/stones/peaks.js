// Stones kept apart by a parallel rule: an experiment against letting a pattern's stones overlap (owner, 2026-11-04: compare
// it, visually and for speed, with the overlapping stones and with the one-by-one check before them). Each candidate stands
// somewhere in an order (the one the old check went in: the stones a design hangs on first, a scatter's big ones before its
// small); two candidates closer than their sizes allow conflict. A kept candidate is one no kept candidate above it conflicts
// with. Found in rounds, every candidate at once in each (as a shader would: a candidate is in once all above it that it
// conflicts with are out, out once one of them is in); the rounds end with the same stones the one-by-one check keeps.
// What a candidate conflicts with depends only on the candidates, so it is worked out when they are drawn, not on a move.
import { SIZES } from './candidates.js';

// how close two stones of one pattern may lie, as a share of touching (the old check's): measured on the flat cloth
const FLAT_CLEAR = 0.92;

const graphs = new WeakMap(); // per candidate set (its GX array): the conflicts

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
	if (dart && (minK !== maxK || varied)) {
		const idx = (d) => { let q = 0; while (q < SIZES.length - 1 && SIZES[q] < d - 1e-7) q++; return SIZES.length - 1 - q; };
		const by = new Int32Array(SIZES.length + 2);
		for (let i = 0; i < n; i++) by[idx(D[i]) + 1]++;
		for (let q = 1; q < by.length; q++) by[q] += by[q - 1];
		for (let i = 0; i < n; i++) order[by[idx(D[i])]++] = i;
	} else if (minP !== maxP) {
		const by = new Int32Array(258);
		for (let i = 0; i < n; i++) by[PR[i] + 1]++;
		for (let q = 1; q < 258; q++) by[q] += by[q - 1];
		for (let i = 0; i < n; i++) order[by[PR[i]]++] = i;
	} else for (let i = 0; i < n; i++) order[i] = i;
	const pos = new Int32Array(n);
	for (let o = 0; o < n; o++) pos[order[o]] = o;
	// neighbours by a grid of cells as big as the biggest reach
	let maxD = 0;
	for (let i = 0; i < n; i++) maxD = Math.max(maxD, D[i]);
	const cell = Math.max(maxD * clear, 1e-4), cells = new Map(), key = (a, b) => a * 1048576 + b;
	for (let i = 0; i < n; i++) {
		const k = key(Math.floor(GX[i] / cell), Math.floor(GY[i] / cell));
		let l = cells.get(k);
		if (!l) cells.set(k, (l = []));
		l.push(i);
	}
	const start = new Int32Array(n + 1), list = [];
	for (let i = 0; i < n; i++) {
		start[i] = list.length;
		const x = GX[i], y = GY[i], cx = Math.floor(x / cell), cy = Math.floor(y / cell), d = D[i], p = pos[i];
		for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
			const l = cells.get(key(cx + a, cy + b));
			if (!l) continue;
			for (const j of l) {
				if (pos[j] >= p) continue;
				const dx = GX[j] - x, dy = GY[j] - y, c = ((D[j] + d) / 2) * clear;
				if (dx * dx + dy * dy < c * c) list.push(j);
			}
		}
	}
	start[n] = list.length;
	g = { n, order, start, list: Int32Array.from(list) };
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
