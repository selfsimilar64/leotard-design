// The stone engine: any pattern's geometry (stones/geometry.js: points, joints, free lines, runs between stops, copies of
// a cell) laid as candidate stones, in flat arrays so that tens of thousands can be laid out inside a frame. Geometry is in
// the pattern's own space (metres, before its placement); what lands here is on the flat cloth, through the pattern's
// map. So a line's stones are spaced by what they measure on the cloth, whatever the scale, stretch or twist, and each
// stone is as far from the next as their two real sizes ask. Each candidate carries:
//   X, Y   its place on the flat cloth
//   rank   0..1: it is kept while the density there is above this, so thinning is stable
//   angle  which way a shaped stone points, on the cloth
//   t      how far along the pattern it is, 0..1 (rings outwards, along a spiral arm)
//   k      the pattern's own size for it, a factor of the crystal's size (a tapering ray, a bubble)
//   d      its real diameter, a size that can be bought (metres)
//   cat    which family it belongs to (a ring, an arm, a colour of a checker)
//   pri    which comes first when two want the same place: 0 for what the design hangs on (a centre, a
//          corner, a crossing), then coarser before finer; line stones after, fill last
// Two ways of laying a line:
//   a free line   one stone every step, carrying on until the line ends
//   a run         between two stops (corners, joints, crossings): the stones of each stretch are a whole number, evenly
//                 spaced, and a stop can have its own stone
// Every kind of item is laid on its own (a point, a run, a copy of a cell): the shape of the GPU engine's steps (Phase 3 of
// knowledge/product/roadmap/webgpu-and-stone-engine-plan.md); this is their CPU twin: stones/gpu-lay.js lays the same on the GPU
// (a change to one is a change to the other).
// Spec: knowledge/engineering/architecture/procedural-stone-patterns.md.
import { frac, hash2 } from './fields.js';
import { SS } from './library.js';
import { G_POINT, G_KEY, G_LINE, G_RUN, G_STAMP, G_SOURCE, POINT_W, KEY_W, VERT_W, LINE_W, RUN_W, STAMP_W, SOURCE_W, SOURCES, PRI_LINE, placeHash } from './geometry.js';

export const MAX_CANDIDATES = 150000;
// Where a place's cell starts (Candidates.fresh's 0.2 mm cells, a stop's chance, a stone's stray): 1/pi of a cell off the round
// numbers, which layouts use (and the binary fractions fractal curves land on), so that one place read twice, or by the float32 GPU
// twin (stones/gpu-lay.js OFF), does not fall either side of a cell's edge.
export const OFF = 0.3183098861837907;
const GOLD = 0.6180339887498949;

// The sizes stones come in (metres), ascending.
export const SIZES = Object.values(SS).map((d) => d / 1000).sort((a, b) => a - b);
const SMALLEST = SIZES[0], BIGGEST = SIZES[SIZES.length - 1];
export function realSize(d) {
	if (d <= SMALLEST) return SMALLEST;
	if (d >= BIGGEST) return BIGGEST;
	let lo = 0, hi = SIZES.length - 1;
	while (lo < hi) { const m = (lo + hi) >> 1; if (SIZES[m] < d) lo = m + 1; else hi = m; }
	return d - SIZES[lo - 1] < SIZES[lo] - d ? SIZES[lo - 1] : SIZES[lo];
}

const EVERYWHERE = { x0: -1e3, x1: 1e3, y0: -1e3, y1: 1e3, r: 1e3 };
const _q = { x: 0, y: 0 };

export class Candidates {
	constructor(cap = 2048) {
		this.alloc(cap); this.n = 0; this.keys = new Set();
		this.RU = new Float64Array(512); this.RV = new Float64Array(512); this.RS = new Float64Array(512); this.RK = new Float32Array(512); this.RT = new Float32Array(512);
		this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0; this.bend = null; this.h = -1;
	}
	alloc(cap) {
		const grow = (a, T) => { const b = new T(cap); if (a) b.set(a); return b; };
		this.X = grow(this.X, Float32Array); this.Y = grow(this.Y, Float32Array); this.R = grow(this.R, Float32Array); this.A = grow(this.A, Float32Array);
		this.T = grow(this.T, Float32Array); this.K = grow(this.K, Float32Array); this.D = grow(this.D, Float64Array); this.C = grow(this.C, Uint8Array); this.P = grow(this.P, Uint8Array);
		this.cap = cap;
	}

	// box: the part of the pattern's space the piece covers { x0, y0, x1, y1, r }. pitch: centre-to-centre
	// distance of the crystal's stones along a line, in the pattern's space. seed: the group's. o (optional):
	//   map { a, b, c, d, e, f, bend }  pattern space to flat cloth; none: they are the same
	//   clip                            the flat piece's box: nothing outside it is worth keeping
	//   d0, gap                         the crystal's real size (metres), and stones' spacing as a factor of it
	//   diam(u, v, k, t, cat, rank)     a stone's real size where modifiers change it; none: d0 x k
	//   fine                            the smallest size this pattern can ask for, as a factor of d0
	//   angles                          stones have a direction that matters
	//   jitter                          how far each stone strays (metres)
	reset(box, pitch, seed = 1, edgeAt = null, o = {}) {
		this.n = 0; this.truncated = false; this.box = box; this.pitch = Math.max(pitch, 1e-4); this.seed = seed; this.edgeAt = edgeAt;
		this.t = 0; this.k = 1; this.cat = 0; this.jk = 1; this.jpri = 0; this.unit = -1; this.h = -1;
		this.gap = o.gap ?? 1; this.d0 = o.d0 ?? this.pitch / this.gap; this.d1 = realSize(this.d0); this.fine = o.fine ?? 1; this.diam = o.diam ?? null; this.angles = !!o.angles; this.jitter = o.jitter ?? 0;
		const m = o.map;
		this.a = m?.a ?? 1; this.b = m?.b ?? 0; this.c = m?.c ?? 0; this.d = m?.d ?? 1; this.e = m?.e ?? 0; this.f = m?.f ?? 0; this.bend = m?.bend ?? null;
		const cl = o.clip;
		this.cx0 = cl?.x0 ?? -Infinity; this.cx1 = cl?.x1 ?? Infinity; this.cy0 = cl?.y0 ?? -Infinity; this.cy1 = cl?.y1 ?? Infinity;
		this.keys.clear(); this.maxD = 0; this.minP = 255; this.maxP = 0; this.minK = Infinity; this.maxK = 0;
		this.rn = 0; this.open = false;
		return this;
	}

	// the pattern's space to the cloth, left in this.mu, this.mv
	place(x, y) {
		if (this.bend) { this.bend(x, y, _q); x = _q.x; y = _q.y; }
		this.mu = this.a * x + this.b * y + this.e; this.mv = this.c * x + this.d * y + this.f;
	}
	// a real diameter: the crystal's size x the pattern's own, through the modifiers
	// (the rank as kept, float32: the GPU twin, stones/gpu-lay.js sizeOf, has no other)
	sizeOf(u, v, k, t, cat, rank) { return this.diam ? this.diam(u, v, k, t, cat, Math.fround(rank)) : k === 1 ? this.d1 : realSize(this.d0 * k); }

	push(u, v, rank, angle, t, k, cat, pri, d) {
		if (u < this.cx0 || u > this.cx1 || v < this.cy0 || v > this.cy1) return;
		const n = this.n;
		if (n >= this.cap) {
			if (n >= MAX_CANDIDATES) { this.truncated = true; return; }
			this.alloc(Math.min(this.cap * 2, MAX_CANDIDATES));
		}
		// its own stray: by its place (its 0.5 mm cell, off the round numbers: OFF), so the GPU twin (stones/gpu-lay.js push),
		// which works in float32, finds the same
		if (this.jitter) { const q1 = Math.floor(u * 2000 + OFF), q2 = Math.floor(v * 2000 + OFF); u += this.jitter * (hash2(q1, q2, this.seed * 4 + 1) - 0.5) * 2; v += this.jitter * (hash2(q1, q2, this.seed * 4 + 2) - 0.5) * 2; }
		this.X[n] = u; this.Y[n] = v; this.R[n] = rank; this.A[n] = angle; this.T[n] = t; this.K[n] = k; this.D[n] = d; this.C[n] = cat; this.P[n] = pri;
		if (d > this.maxD) this.maxD = d;
		if (pri < this.minP) this.minP = pri;
		if (pri > this.maxP) this.maxP = pri;
		if (k < this.minK) this.minK = k;
		if (k > this.maxK) this.maxK = k;
		this.n = n + 1;
	}

	// which way a direction in the pattern's space runs on the cloth, at (x, y)
	angleAt(x, y, a) {
		if (!this.angles) return a;
		const ca = Math.cos(a), sa = Math.sin(a);
		if (this.bend) {
			const e = 0.0005, u = this.mu, v = this.mv;
			this.place(x + ca * e, y + sa * e);
			const out = Math.atan2(this.mv - v, this.mu - u);
			this.mu = u; this.mv = v;
			return out;
		}
		return Math.atan2(this.c * ca + this.d * sa, this.a * ca + this.b * sa);
	}

	// --- the engine ------------------------------------------------------------------------------------
	// Lay a geometry (stones/geometry.js), item by item in its order.
	lay(G) {
		this.stamps = null;
		const K = G.kind, I = G.idx;
		for (let i = 0; i < G.items; i++) {
			const j = I[i];
			switch (K[i]) {
				case G_POINT: this.layPoint(G, j, 0, 0); break;
				case G_KEY: this.layKey(G, j, 0, 0); break;
				case G_LINE: this.layLine(G, j, 0, 0); break;
				case G_RUN: this.layRunOf(G, j, 0, 0); break;
				case G_STAMP: this.layStamp(G, j); break;
				case G_SOURCE: this.laySource(G, j); break;
				default: throw new Error('Bad geometry');
			}
		}
		if (G.truncated) this.truncated = true;
		return this;
	}

	// Points by formula: the source's kernel lays each (stones/geometry.js SOURCES).
	laySource(G, i) {
		const S = G.Sr, o = i * SOURCE_W, kernel = SOURCES[S[o]];
		if (!kernel) throw new Error('No point source ' + S[o]);
		kernel(this, S.subarray(o + 7, o + 12), { x0: S[o + 1], x1: S[o + 2], y0: S[o + 3], y1: S[o + 4] }, S[o + 5], S[o + 6]);
	}
	// One point of a source, at (x, y) in the pattern's space (as an added stone: its unit, if set, is what it thins by).
	layAt(x, y, rank, angle, t, k, cat, pri, unit) {
		this.place(x, y);
		const u = this.mu, v = this.mv;
		if (u < this.cx0 || u > this.cx1 || v < this.cy0 || v > this.cy1) return;
		this.push(u, v, unit >= 0 ? unit : rank, this.angleAt(x, y, angle), t, k, cat, pri, this.sizeOf(u, v, k, t, cat, rank));
	}

	// A copy's rank (stamp mode, this.h >= 0): the cell's own rank R moved by the copy's chance h, as the copies of a cell
	// always were; the copy's unit if it has one. What the design hangs on keeps the first 40% of the range.
	stampRank(R, pri) {
		if (this.su >= 0) return this.su;
		R = Math.fround(R);
		return pri < PRI_LINE ? frac(R * 2.5 + this.h) * 0.4 : frac(R + this.h);
	}

	// One stone, at (x, y) + (ox, oy) in the pattern's space.
	layPoint(G, i, ox, oy) {
		const A = G.Pt, o = i * POINT_W, x = A[o] + ox, y = A[o + 1] + oy, unit = A[o + 8];
		if (this.h >= 0) this.cellPlace(A[o], A[o + 1], x, y); else this.place(x, y);
		const u = this.mu, v = this.mv;
		if (u < this.cx0 || u > this.cx1 || v < this.cy0 || v > this.cy1) return;
		const pri = A[o + 7], k = A[o + 5];
		let rank = A[o + 2], t = A[o + 4], cat = A[o + 6], kept = unit >= 0 ? unit : rank;
		if (this.h >= 0) {
			kept = rank = this.stampRank(kept, pri); t = this.st; cat += this.sc;
			if (pri < PRI_LINE && !this.fresh(u, v)) return;
		}
		this.push(u, v, kept, this.angleAt(x, y, A[o + 3]), t, k, cat, pri, this.sizeOf(u, v, k, t, cat, rank));
	}
	// A place of a cell (xt, yt) in a copy (x, y: the same in the pattern's space) on the cloth, as a plain copy has it: the
	// copy's origin plus the cell's place (stampFast), so that a joint shared with the next copy is found to be the same one.
	cellPlace(xt, yt, x, y) {
		if (this.bend) { this.place(x, y); return; }
		this.mu = this.su0 + Math.fround(this.a * xt + this.b * yt + 0); this.mv = this.sv0 + Math.fround(this.c * xt + this.d * yt + 0);
	}
	// a place on the cloth not yet taken by a stone the design hangs on (and now it is)
	// (its 0.2 mm cell, off the round numbers (OFF): a joint on a round number, as layouts put them, read in two copies as 0.11249999
	// and 0.11250000, fell either side of a rounding at 0.1125; the same on the GPU: stones/gpu-lay.js placeKey)
	fresh(u, v) {
		if (this.open) return true; // (a cell laid once for its copies: each copy takes its places where it lies, stampFast)
		const id = Math.floor(u * 5000 + OFF) * 2097152 + Math.floor(v * 5000 + OFF);
		if (this.keys.has(id)) return false;
		this.keys.add(id);
		return true;
	}
	// A stone the design hangs on; the same place twice is one stone.
	layKey(G, i, ox, oy) {
		const A = G.Ky, o = i * KEY_W, x = A[o] + ox, y = A[o + 1] + oy;
		if (this.h >= 0) this.cellPlace(A[o], A[o + 1], x, y); else this.place(x, y);
		const u = this.mu, v = this.mv, pri = A[o + 6], k = A[o + 4];
		let rank = A[o + 7], t = A[o + 3], cat = A[o + 5];
		if (this.h >= 0) { rank = this.stampRank(rank, pri); t = this.st; cat += this.sc; if (pri >= PRI_LINE) { this.push(u, v, rank, this.angleAt(x, y, A[o + 2]), t, k, cat, pri, this.sizeOf(u, v, k, t, cat, rank)); return; } }
		if (!this.fresh(u, v)) return;
		this.push(u, v, rank, this.angleAt(x, y, A[o + 2]), t, k, cat, pri, this.sizeOf(u, v, k, t, cat, rank));
	}

	// --- a free line ---------------------------------------------------------------------------------
	layLine(G, l, ox, oy) {
		const L = G.Ln, V = G.Vx, o = l * LINE_W, v0 = L[o], nv = L[o + 1];
		let p = v0 * VERT_W;
		const x = V[p] + ox, y = V[p + 1] + oy;
		this.vertState(V, p);
		this.place(x, y);
		this.px = x; this.py = y; this.pu = this.mu; this.pv = this.mv; this.pk = this.k;
		this.lineHash = L[o + 2]; this.j = 0;
		this.rest = (this.gap * this.sizeOf(this.pu, this.pv, this.k, this.t, this.cat, 0.5)) / 2;
		for (let i = 1; i < nv; i++) {
			p = (v0 + i) * VERT_W;
			this.vertState(V, p);
			this.lineTo(V[p] + ox, V[p + 1] + oy);
		}
	}
	vertState(V, p) {
		this.k = V[p + 2]; this.t = V[p + 3]; this.cat = V[p + 4]; this.unit = V[p + 5];
		if (this.h >= 0) { this.t = this.st; this.cat += this.sc; }
	}
	// To a point of the line. A bent pattern's straight step is a curve on the cloth, so it is walked in pieces.
	lineTo(x, y) {
		if (this.bend) {
			const x0 = this.px, y0 = this.py, dx = x - x0, dy = y - y0, n = Math.min(64, Math.ceil(Math.hypot(dx, dy) / (this.pitch * 2)));
			if (n > 1) {
				const k1 = this.k, k0 = this.pk;
				for (let i = 1; i < n; i++) { this.k = k0 + ((k1 - k0) * i) / n; this.lineStep(x0 + (dx * i) / n, y0 + (dy * i) / n); }
				this.k = k1;
				this.lineStep(x, y);
				return;
			}
		}
		this.lineStep(x, y);
	}
	lineRank() {
		const R = this.unit >= 0 ? this.unit : frac(this.j * GOLD + this.lineHash);
		return this.h >= 0 ? this.stampRank(R, PRI_LINE) : R;
	}
	lineStep(x, y) {
		this.place(x, y);
		const u = this.mu, v = this.mv;
		const du = u - this.pu, dv = v - this.pv, len = Math.sqrt(du * du + dv * dv);
		const pu = this.pu, pv = this.pv, k0 = this.pk, k1 = this.k;
		this.px = x; this.py = y; this.pu = u; this.pv = v; this.pk = k1;
		if (len < 1e-9) return;
		// a stretch wholly off the piece: only keep the pen's place
		if ((pu < this.cx0 && u < this.cx0) || (pu > this.cx1 && u > this.cx1) || (pv < this.cy0 && v < this.cy0) || (pv > this.cy1 && v > this.cy1)) {
			const left = this.rest - len;
			if (left > 0) { this.rest = left; return; }
			const p = this.gap * realSize(this.d0 * k1), c = Math.floor(-left / p) + 1;
			this.j += c; this.rest = p * c + left;
			return;
		}
		const ux = du / len, uy = dv / len, a = Math.atan2(uy, ux), gap = this.gap, t = this.t, cat = this.cat, varies = !!this.diam || k0 !== k1;
		let s = this.rest;
		while (s <= len) {
			const f = s / len, su = pu + ux * s, sv = pv + uy * s, k = k0 + (k1 - k0) * f, rank = this.lineRank();
			const d = this.sizeOf(su, sv, k, t, cat, rank);
			this.push(su, sv, rank, a, t, k, cat, PRI_LINE, d);
			this.j++;
			if (varies) {
				// the next stone's size where it would land: the two share the distance between them
				const g = gap * d, kn = k0 + (k1 - k0) * Math.min(1, (s + g) / len);
				s += (g + gap * this.sizeOf(su + ux * g, sv + uy * g, kn, t, cat, rank)) / 2;
			} else s += gap * d;
		}
		this.rest = s - len;
	}

	// --- a run between stops ---------------------------------------------------------------------------
	// The run's vertices on the cloth (with (ox, oy) added in the pattern's space), then its stones.
	layRunOf(G, r, ox, oy) {
		const R = G.Rn, V = G.Vx, o = r * RUN_W, v0 = R[o], nv = R[o + 1], stamp = this.h >= 0;
		let p = v0 * VERT_W, x = V[p] + ox, y = V[p + 1] + oy, k = V[p + 2];
		this.rn = 0;
		this.k = k; this.t = stamp ? this.st : V[p + 3];
		this.place(x, y); this.runTo(this.mu, this.mv);
		for (let i = 1; i < nv; i++) {
			p = (v0 + i) * VERT_W;
			const x1 = V[p] + ox, y1 = V[p + 1] + oy, k1 = V[p + 2];
			if (!stamp) this.t = V[p + 3];
			if (this.bend) {
				// a bent pattern's straight step is a curve on the cloth: walked in pieces
				const dx = x1 - x, dy = y1 - y, n = Math.min(64, Math.ceil(Math.hypot(dx, dy) / (this.pitch * 2)));
				for (let s = 1; s < n; s++) { this.k = k + ((k1 - k) * s) / n; this.place(x + (dx * s) / n, y + (dy * s) / n); this.runTo(this.mu, this.mv); }
			}
			this.k = k1; this.place(x1, y1); this.runTo(this.mu, this.mv);
			x = x1; y = y1; k = k1;
		}
		if (stamp) { const a = v0 * VERT_W, b = (v0 + nv - 1) * VERT_W; this.tax = V[a]; this.tay = V[a + 1]; this.tbx = V[b]; this.tby = V[b + 1]; }
		this.keyA = R[o + 3] === 1; this.jkA = R[o + 4]; this.jpA = R[o + 5]; this.jk = R[o + 7]; this.jpri = R[o + 8];
		this.cat = R[o + 10] + (stamp ? this.sc : 0); this.unit = R[o + 11]; this.lineHash = R[o + 2]; this.j = 0; this.runN = 0;
		this.layRun(R[o + 6] === 1, R[o + 9] === 1);
	}
	runTo(u, v) {
		const n = this.rn;
		if (n >= this.RU.length) {
			const g = (a) => { const b = new a.constructor(a.length * 2); b.set(a); return b; };
			this.RU = g(this.RU); this.RV = g(this.RV); this.RS = g(this.RS); this.RK = g(this.RK); this.RT = g(this.RT);
		}
		this.RU[n] = u; this.RV[n] = v; this.RK[n] = this.k; this.RT[n] = this.t;
		if (n) { const du = u - this.RU[n - 1], dv = v - this.RV[n - 1]; this.RS[n] = this.RS[n - 1] + Math.sqrt(du * du + dv * dv); } else this.RS[0] = 0;
		this.rn = n + 1;
	}

	// The run's stones: a whole number between its stops, spread to fill the stretch exactly. They are never
	// closer than their sizes ask, so a stop is never crowded. closed: the run is a loop with a stone where it
	// meets itself.
	layRun(keyB, closed) {
		const n = this.rn, RS = this.RS, RK = this.RK;
		if (n < 2) { if (this.keyA && n === 1) this.stopStone(0, this.jkA, this.jpA); return; }
		const L = RS[n - 1], gap = this.gap, keyA = this.keyA;
		if (!(L >= 1e-7)) { if (keyA && L === L) this.stopStone(0, this.jkA, this.jpA); return; }
		const Da = keyA ? this.stopSize(0, this.jkA) : 0, Db = keyB ? this.stopSize(n - 1, this.jk) : 0;
		if (keyA) this.stopStone(0, this.jkA, this.jpA);
		if (keyB) this.stopStone(n - 1, this.jk, this.jpri);
		let same = !this.diam;
		for (let i = 1; same && i < n; i++) if (RK[i] !== RK[0]) same = false;
		if (same) {
			// all one size: how many fit is a sum
			const k = RK[0], d = k === 1 ? this.d1 : realSize(this.d0 * k), step = gap * d;
			const g0 = closed && !keyA ? 0 : keyA ? (gap * (Da + d)) / 2 : step / 2, gm = closed ? (keyA ? (gap * (d + Da)) / 2 : step) : keyB ? (gap * (d + Db)) / 2 : step / 2;
			const room = L - g0 - gm;
			if (room < -1e-7) return;
			const m = 1 + Math.floor((room + 1e-7) / step), f = L / (g0 + (m - 1) * step + gm);
			for (let q = 0, i = 0; q < m; q++) {
				const p = Math.min((g0 + q * step) * f, L);
				while (i < n - 2 && RS[i + 1] < p) i++;
				this.runStone(p, i, d);
			}
			return;
		}
		// sizes that change along it: walk it stone by stone at the sizes it asks for
		const plan = this.plan ??= [];
		plan.length = 0;
		this.ri = 0;
		let s = 0, prev = Da, sum = 0;
		const first = closed && !keyA ? this.runSize(0, this.runRank(0)) : 0;
		if (closed && !keyA) { plan.push(0); prev = first; }
		for (let guard = 0; guard < 20000; guard++) {
			const q = plan.length, rank = this.runRank(q), guess = this.runSize(s + (gap * (prev || this.runSize(s, rank))) / 2, rank), d = this.runSize(s + (gap * (prev + guess)) / 2, rank);
			const next = s + (prev ? (gap * (prev + d)) / 2 : (gap * d) / 2), end = closed ? Da || first : Db;
			if (!(next + (gap * (d + end)) / 2 <= L + 1e-7)) { sum = q ? s + (gap * (prev + end)) / 2 : 0; break; }
			plan.push(next); s = next; prev = d;
		}
		if (!plan.length) return;
		const f = sum > 0 ? L / sum : 1;
		for (let q = 0, i = 0; q < plan.length; q++) {
			const p = Math.min(plan[q] * f, L);
			while (i < n - 2 && RS[i + 1] < p) i++;
			this.runStone(p, i, 0, q);
		}
	}
	// the rank of the run's q-th stone
	runRank(q) {
		const R = this.unit >= 0 ? this.unit : frac((this.j + q) * GOLD + this.lineHash);
		return this.h >= 0 ? this.stampRank(R, PRI_LINE) : R;
	}
	// the stone's size wanted at distance s along the run, for a stone of this rank
	runSize(s, rank) {
		const RS = this.RS, n = this.rn, L = RS[n - 1], p = s < L ? s : L;
		let i = this.ri;
		while (i < n - 2 && RS[i + 1] < p) i++;
		while (i > 0 && RS[i] > p) i--;
		this.ri = i;
		const w = (p - RS[i]) / (RS[i + 1] - RS[i] || 1), RK = this.RK, RU = this.RU, RV = this.RV;
		return this.sizeOf(RU[i] + (RU[i + 1] - RU[i]) * w, RV[i] + (RV[i + 1] - RV[i]) * w, RK[i] + (RK[i + 1] - RK[i]) * w, this.RT[i], this.cat, rank);
	}
	// a stone at distance p along the run, on its stretch i; d: its size if known
	runStone(p, i, d, q = this.runN++) {
		const RS = this.RS, RU = this.RU, RV = this.RV, RK = this.RK, RT = this.RT, du = RU[i + 1] - RU[i], dv = RV[i + 1] - RV[i], w = (p - RS[i]) / (RS[i + 1] - RS[i] || 1);
		const u = RU[i] + du * w, v = RV[i] + dv * w, k = RK[i] + (RK[i + 1] - RK[i]) * w, t = RT[i] + (RT[i + 1] - RT[i]) * w, rank = this.runRank(q);
		this.push(u, v, rank, this.angles ? Math.atan2(dv, du) : 0, t, k, this.cat, PRI_LINE, d || this.sizeOf(u, v, k, t, this.cat, rank));
	}
	stopSize(c, k) { return this.sizeOf(this.RU[c], this.RV[c], k, this.RT[c], this.cat, 0.2); }
	stopStone(c, k, pri) {
		let u = this.RU[c], v = this.RV[c];
		if (this.h >= 0 && !this.bend) { this.cellPlace(c ? this.tbx : this.tax, c ? this.tby : this.tay, 0, 0); u = this.mu; v = this.mv; }
		if (!this.fresh(u, v)) return;
		const m = c ? c - 1 : 0;
		let rank;
		if (this.unit >= 0) rank = this.unit;
		else if (this.h >= 0) {
			// the stop's place in the cell, through the map's linear part, as a plain copy has it (not the copy's place less
			// its origin: a stop on a round number of hash cells would round the other way)
			const x = c ? this.tbx : this.tax, y = c ? this.tby : this.tay;
			rank = hash2(Math.floor((this.a * x + this.b * y + 0) * 5000 + OFF), Math.floor((this.c * x + this.d * y + 0) * 5000 + OFF), 11) * 0.4;
		} else rank = hash2(Math.floor(u * 5000 + OFF), Math.floor(v * 5000 + OFF), 11) * 0.4; // (fresh's cell, off the round numbers: OFF)
		if (this.h >= 0) rank = this.stampRank(rank, pri);
		this.push(u, v, rank, Math.atan2(this.RV[m + 1] - this.RV[m], this.RU[m + 1] - this.RU[m]), this.RT[c], k, this.cat, pri, this.sizeOf(u, v, k, this.RT[c], this.cat, rank));
	}

	// --- copies of a cell --------------------------------------------------------------------------------
	// A copy of a template (stones/geometry.js stamped). Where nothing changes from place to place, the template is laid
	// once, about its origin, and each copy is its stones moved: a few array writes a stone. Under a distortion or a
	// modifier on size, which change from place to place, each copy's items are laid where it lies (the template's runs,
	// points and joints, moved), with the same ranks a plain copy gets, so a size modifier changes sizes and spacing, not
	// which stones a density keeps.
	layStamp(G, s) {
		const S = G.St, o = s * STAMP_W, T = G.templates[S[o]], x = S[o + 1], y = S[o + 2], t = S[o + 3], cat = S[o + 4], unit = S[o + 5];
		if (!this.bend && !this.diam) { this.stampFast(T, x, y, t, cat, unit); return; }
		this.place(x, y);
		const u0 = this.mu, v0 = this.mv;
		if (!this.bend) {
			const reach = T.reach * (Math.abs(this.a) + Math.abs(this.b) + Math.abs(this.c) + Math.abs(this.d)) + this.d0 * 4;
			if (u0 + reach < this.cx0 || u0 - reach > this.cx1 || v0 + reach < this.cy0 || v0 - reach > this.cy1) return;
		}
		this.h = unit >= 0 ? 0 : placeHash(x, y); this.su = unit; this.st = t; this.sc = cat; this.su0 = u0; this.sv0 = v0;
		const K = T.kind, I = T.idx;
		for (let i = 0; i < T.items; i++) {
			const j = I[i];
			switch (K[i]) {
				case G_POINT: this.layPoint(T, j, x, y); break;
				case G_KEY: this.layKey(T, j, x, y); break;
				case G_LINE: this.layLine(T, j, x, y); break;
				case G_RUN: this.layRunOf(T, j, x, y); break;
				default: throw new Error('A cell inside a cell');
			}
		}
		this.h = -1;
	}
	// the template's stones about its origin, through the map's linear part: once per lay
	stampStones(T) {
		this.stamps ??= new Map();
		let c = this.stamps.get(T);
		if (c) return c;
		const S = (this.sub ??= new Candidates(256));
		S.reset(EVERYWHERE, this.pitch, this.seed, null, { map: { a: this.a, b: this.b, c: this.c, d: this.d, e: 0, f: 0 }, d0: this.d0, gap: this.gap, fine: this.fine, angles: this.angles });
		S.open = true;
		S.lay(T);
		const n = S.n;
		c = { n, X: S.X.slice(0, n), Y: S.Y.slice(0, n), R: S.R.slice(0, n), A: S.A.slice(0, n), K: S.K.slice(0, n), D: S.D.slice(0, n), C: S.C.slice(0, n), P: S.P.slice(0, n), reach: 0 };
		for (let i = 0; i < n; i++) c.reach = Math.max(c.reach, Math.abs(c.X[i]), Math.abs(c.Y[i]));
		this.stamps.set(T, c);
		return c;
	}
	stampFast(T, x, y, t, cat, unit) {
		const { n, X, Y, R, A, K, D, C, P, reach } = this.stampStones(T);
		this.place(x, y);
		const u0 = this.mu, v0 = this.mv;
		if (u0 + reach < this.cx0 || u0 - reach > this.cx1 || v0 + reach < this.cy0 || v0 - reach > this.cy1) return;
		const h = unit >= 0 ? 0 : placeHash(x, y);
		for (let i = 0; i < n; i++) {
			const u = u0 + X[i], v = v0 + Y[i], pri = P[i];
			if (u < this.cx0 || u > this.cx1 || v < this.cy0 || v > this.cy1) continue;
			if (pri < PRI_LINE && !this.fresh(u, v)) continue;
			this.push(u, v, unit >= 0 ? unit : pri < PRI_LINE ? frac(R[i] * 2.5 + h) * 0.4 : frac(R[i] + h), A[i], t, K[i], C[i] + cat, pri, D[i]);
		}
	}
}
