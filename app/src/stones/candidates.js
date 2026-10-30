// The candidates of a stone pattern: where stones may go, as flat arrays so that tens of thousands can
// be laid out inside a frame. A layout draws in the pattern's own space (metres, before its placement);
// what lands here is already on the flat cloth, through the pattern's map. So a line's stones are spaced
// by what they measure on the cloth, whatever the scale, stretch or twist, and each stone is as far from
// the next as their two real sizes ask. Each candidate carries:
//   X, Y   its place on the flat cloth
//   rank   0..1: it is kept while the density there is above this, so thinning is stable
//   angle  which way a shaped stone points, on the cloth
//   t      how far along the pattern it is, 0..1 (rings outwards, along a spiral arm)
//   k      the pattern's own size for it, a factor of the crystal's size (a tapering ray, a bubble)
//   d      its real diameter, a size that can be bought (metres)
//   cat    which family it belongs to (a ring, an arm, a colour of a checker)
//   pri    which comes first when two want the same place: 0 for what the design hangs on (a centre, a
//          corner, a crossing), then coarser before finer; line stones after, fill last
// The pen has two ways of laying a line:
//   move, to         a free line: one stone every step, carrying on until the line ends
//   begin, to, corner, end   a run between two stops (corners, joints, crossings): the stones of each
//                    stretch are a whole number, evenly spaced, and a stop can have its own stone
// Spec: knowledge/engineering/architecture/procedural-stone-patterns.md.
import { TAU, frac, hash2 } from './fields.js';
import { SS } from './library.js';

export const MAX_CANDIDATES = 150000;
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
// What a place in the pattern's space stands for: the same place keeps the same chance.
const placeHash = (x, y) => hash2(Math.round(x * 5000), Math.round(y * 5000), 11);

const PRI_LINE = 200, PRI_FILL = 240;
const EVERYWHERE = { x0: -1e3, x1: 1e3, y0: -1e3, y1: 1e3, r: 1e3 };
const _q = { x: 0, y: 0 };

export class Candidates {
	constructor(cap = 2048) {
		this.alloc(cap); this.n = 0; this.keys = new Set();
		this.RU = new Float64Array(512); this.RV = new Float64Array(512); this.RS = new Float64Array(512); this.RK = new Float32Array(512); this.RT = new Float32Array(512);
		this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0; this.bend = null;
	}
	alloc(cap) {
		const grow = (a, T) => { const b = new T(cap); if (a) b.set(a); return b; };
		this.X = grow(this.X, Float32Array); this.Y = grow(this.Y, Float32Array); this.R = grow(this.R, Float32Array); this.A = grow(this.A, Float32Array);
		this.T = grow(this.T, Float32Array); this.K = grow(this.K, Float32Array); this.D = grow(this.D, Float64Array); this.C = grow(this.C, Uint8Array); this.P = grow(this.P, Uint8Array);
		this.cap = cap;
	}

	// box: the part of the pattern's space the piece covers { x0, y0, x1, y1, r }. pitch: centre-to-centre
	// distance of the crystal's stones along a line, in the pattern's space (how fine a layout need draw).
	// edgeAt: distance to the piece's edge (flat layouts), seed: the group's. o (optional):
	//   map { a, b, c, d, e, f, bend }  pattern space to flat cloth; none: they are the same
	//   clip                            the flat piece's box: nothing outside it is worth keeping
	//   d0, gap                         the crystal's real size (metres), and stones' spacing as a factor of it
	//   diam(u, v, k, t, cat, rank)     a stone's real size where modifiers change it; none: d0 x k
	//   fine                            the smallest size this pattern can ask for, as a factor of d0
	//   angles                          stones have a direction that matters
	//   jitter                          how far each stone strays (metres)
	reset(box, pitch, seed = 1, edgeAt = null, o = {}) {
		this.n = 0; this.truncated = false; this.box = box; this.pitch = Math.max(pitch, 1e-4); this.seed = seed; this.edgeAt = edgeAt;
		this.x0 = box.x0; this.x1 = box.x1; this.y0 = box.y0; this.y1 = box.y1;
		this.t = 0; this.k = 1; this.cat = 0; this.jk = 1; this.jpri = 0; this.unit = -1;
		this.gap = o.gap ?? 1; this.d0 = o.d0 ?? this.pitch / this.gap; this.d1 = realSize(this.d0); this.fine = o.fine ?? 1; this.diam = o.diam ?? null; this.angles = !!o.angles; this.jitter = o.jitter ?? 0;
		const m = o.map;
		this.a = m?.a ?? 1; this.b = m?.b ?? 0; this.c = m?.c ?? 0; this.d = m?.d ?? 1; this.e = m?.e ?? 0; this.f = m?.f ?? 0; this.bend = m?.bend ?? null;
		const cl = o.clip;
		this.cx0 = cl?.x0 ?? -Infinity; this.cx1 = cl?.x1 ?? Infinity; this.cy0 = cl?.y0 ?? -Infinity; this.cy1 = cl?.y1 ?? Infinity;
		this.keys.clear(); this.maxD = 0; this.minP = 255; this.maxP = 0; this.minK = Infinity; this.maxK = 0;
		this.inRun = false; this.rn = 0;
		return this;
	}

	// the pattern's space to the cloth, left in this.mu, this.mv
	place(x, y) {
		if (this.bend) { this.bend(x, y, _q); x = _q.x; y = _q.y; }
		this.mu = this.a * x + this.b * y + this.e; this.mv = this.c * x + this.d * y + this.f;
	}
	// a real diameter: the crystal's size x the pattern's own, through the modifiers
	sizeOf(u, v, k, t, cat, rank) { return this.diam ? this.diam(u, v, k, t, cat, rank) : k === 1 ? this.d1 : realSize(this.d0 * k); }

	push(u, v, rank, angle, t, k, cat, pri, d) {
		if (u < this.cx0 || u > this.cx1 || v < this.cy0 || v > this.cy1) return;
		const n = this.n;
		if (n >= this.cap) {
			if (n >= MAX_CANDIDATES) { this.truncated = true; return; }
			this.alloc(Math.min(this.cap * 2, MAX_CANDIDATES));
		}
		if (this.jitter) { const q = Math.floor(rank * 1e7); u += this.jitter * (hash2(q, 1, this.seed) - 0.5) * 2; v += this.jitter * (hash2(q, 2, this.seed) - 0.5) * 2; }
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

	// One stone in the pattern's space.
	add(x, y, rank = 0.5, angle = 0, t = this.t, k = this.k, cat = this.cat, pri = PRI_FILL) {
		if (x < this.x0 || x > this.x1 || y < this.y0 || y > this.y1) return;
		this.place(x, y);
		const u = this.mu, v = this.mv;
		if (u < this.cx0 || u > this.cx1 || v < this.cy0 || v > this.cy1) return;
		this.push(u, v, this.unit >= 0 ? this.unit : rank, this.angleAt(x, y, angle), t, k, cat, pri, this.sizeOf(u, v, k, t, cat, rank));
	}
	// A stone the design hangs on: first in line for its place, and kept longest as a density thins it (unless
	// given a rank: a pattern of nothing else thins over the whole range). The same place asked for twice (a
	// joint of several lines) is one stone.
	key(x, y, angle = 0, t = this.t, k = this.jk, cat = this.cat, pri = this.jpri, rank0 = -1) {
		if (x < this.x0 - 0.002 || x > this.x1 + 0.002 || y < this.y0 - 0.002 || y > this.y1 + 0.002) return;
		this.place(x, y);
		const u = this.mu, v = this.mv, id = Math.round(u * 5000) * 2097152 + Math.round(v * 5000);
		if (this.keys.has(id)) return;
		this.keys.add(id);
		const rank = this.unit >= 0 ? this.unit : rank0 >= 0 ? rank0 : placeHash(x, y) * 0.4;
		this.push(u, v, rank, this.angleAt(x, y, angle), t, k, cat, pri, this.sizeOf(u, v, k, t, cat, rank));
	}

	// --- a free line ---------------------------------------------------------------------------------
	move(x, y) {
		this.finish();
		this.place(x, y);
		this.px = x; this.py = y; this.pu = this.mu; this.pv = this.mv; this.pk = this.k;
		this.lineHash = placeHash(x, y); this.j = 0;
		this.rest = (this.gap * this.sizeOf(this.pu, this.pv, this.k, this.t, this.cat, 0.5)) / 2;
		return this;
	}
	// To a point of the line. A bent pattern's straight step is a curve on the cloth, so it is walked in pieces.
	to(x, y) {
		if (this.bend) {
			const x0 = this.px, y0 = this.py, dx = x - x0, dy = y - y0, n = Math.min(64, Math.ceil(Math.hypot(dx, dy) / (this.pitch * 2)));
			if (n > 1) {
				const k1 = this.k, k0 = this.pk;
				for (let i = 1; i < n; i++) { this.k = k0 + ((k1 - k0) * i) / n; this.step(x0 + (dx * i) / n, y0 + (dy * i) / n); }
				this.k = k1;
				this.step(x, y);
				return this;
			}
		}
		this.step(x, y);
		return this;
	}
	step(x, y) {
		this.place(x, y);
		const u = this.mu, v = this.mv;
		if (this.inRun) { this.runTo(u, v); this.px = x; this.py = y; this.pk = this.k; return; }
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
			const f = s / len, su = pu + ux * s, sv = pv + uy * s, k = k0 + (k1 - k0) * f, rank = this.unit >= 0 ? this.unit : frac(this.j * GOLD + this.lineHash);
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
	// begin(x, y, key): a run starts here; key: with a stone of its own (this.jk its size). Then to(), and
	// corner() or end().
	begin(x, y, key = true) {
		this.finish();
		this.place(x, y);
		this.inRun = true; this.px = x; this.py = y; this.pk = this.k;
		this.lineHash = placeHash(x, y); this.j = 0; this.runN = 0;
		this.rn = 0; this.runTo(this.mu, this.mv);
		this.keyA = key; this.jkA = this.jk; this.jpA = this.jpri;
		return this;
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
	// a stop part of the way along: the stretch so far is laid out, and the next starts here
	corner(key = true) {
		if (!this.inRun) return this;
		const x = this.px, y = this.py, k = this.k;
		this.layRun(key, false);
		this.place(x, y);
		this.rn = 0; this.runTo(this.mu, this.mv);
		this.keyA = key; this.jkA = this.jk; this.jpA = this.jpri;
		this.lineHash = placeHash(x, y); this.j = 0; this.runN = 0; this.k = k;
		return this;
	}
	end(key = true, closed = false) {
		if (this.inRun) { this.layRun(key, closed); this.inRun = false; this.rn = 0; }
		return this;
	}
	finish() { if (this.inRun) this.end(false); }

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
		const first = closed && !keyA ? this.runSize(0, 0) : 0;
		if (closed && !keyA) { plan.push(0); prev = first; }
		for (let guard = 0; guard < 20000; guard++) {
			const q = plan.length, guess = this.runSize(s + (gap * (prev || this.runSize(s, q))) / 2, q), d = this.runSize(s + (gap * (prev + guess)) / 2, q);
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
	runRank(q) { return this.unit >= 0 ? this.unit : frac((this.j + q) * GOLD + this.lineHash); }
	// the stone's size wanted at distance s along the run, for its q-th stone
	runSize(s, q) {
		const RS = this.RS, n = this.rn, L = RS[n - 1], p = s < L ? s : L;
		let i = this.ri;
		while (i < n - 2 && RS[i + 1] < p) i++;
		while (i > 0 && RS[i] > p) i--;
		this.ri = i;
		const w = (p - RS[i]) / (RS[i + 1] - RS[i] || 1), RK = this.RK, RU = this.RU, RV = this.RV;
		return this.sizeOf(RU[i] + (RU[i + 1] - RU[i]) * w, RV[i] + (RV[i + 1] - RV[i]) * w, RK[i] + (RK[i + 1] - RK[i]) * w, this.RT[i], this.cat, this.runRank(q));
	}
	// a stone at distance p along the run, on its stretch i; d: its size if known
	runStone(p, i, d, q = this.runN++) {
		const RS = this.RS, RU = this.RU, RV = this.RV, RK = this.RK, RT = this.RT, du = RU[i + 1] - RU[i], dv = RV[i + 1] - RV[i], w = (p - RS[i]) / (RS[i + 1] - RS[i] || 1);
		const u = RU[i] + du * w, v = RV[i] + dv * w, k = RK[i] + (RK[i + 1] - RK[i]) * w, t = RT[i] + (RT[i + 1] - RT[i]) * w, rank = this.runRank(q);
		this.push(u, v, rank, this.angles ? Math.atan2(dv, du) : 0, t, k, this.cat, PRI_LINE, d || this.sizeOf(u, v, k, t, this.cat, rank));
	}
	stopSize(c, k) { return this.sizeOf(this.RU[c], this.RV[c], k, this.RT[c], this.cat, 0.2); }
	stopStone(c, k, pri) {
		const u = this.RU[c], v = this.RV[c], id = Math.round(u * 5000) * 2097152 + Math.round(v * 5000);
		if (this.keys.has(id)) return;
		this.keys.add(id);
		const m = c ? c - 1 : 0, rank = this.unit >= 0 ? this.unit : hash2(Math.round(u * 5000), Math.round(v * 5000), 11) * 0.4;
		this.push(u, v, rank, Math.atan2(this.RV[m + 1] - this.RV[m], this.RU[m + 1] - this.RU[m]), this.RT[c], k, this.cat, pri, this.sizeOf(u, v, k, this.RT[c], this.cat, rank));
	}

	// Many copies of one drawing (a tile, a motif in its cell): drawn once as places about its origin, then stamped
	// down wherever it goes, for a few array writes a stone. draw(T, x, y) draws on T at (x, y). Not under a distortion
	// or a modifier on size, which change from place to place: then each copy is drawn. E.t and E.cat apply to a copy as
	// it is stamped, added to what it drew; its stones thin by E.unit if set, or by a chance of their own.
	stamped(draw) {
		if (this.bend || this.diam) return (x, y) => draw(this, x, y);
		const S = (this.sub ??= new Candidates(256));
		S.reset(EVERYWHERE, this.pitch, this.seed, null, { map: { a: this.a, b: this.b, c: this.c, d: this.d, e: 0, f: 0 }, d0: this.d0, gap: this.gap, fine: this.fine, angles: this.angles });
		S.k = this.k; S.jk = this.jk; S.jpri = this.jpri;
		draw(S, 0, 0);
		S.finish();
		const n = S.n, X = S.X.slice(0, n), Y = S.Y.slice(0, n), R = S.R.slice(0, n), A = S.A.slice(0, n), K = S.K.slice(0, n), D = S.D.slice(0, n), C = S.C.slice(0, n), P = S.P.slice(0, n);
		let reach = 0;
		for (let i = 0; i < n; i++) reach = Math.max(reach, Math.abs(X[i]), Math.abs(Y[i]));
		return (x, y) => {
			this.place(x, y);
			const u0 = this.mu, v0 = this.mv;
			if (u0 + reach < this.cx0 || u0 - reach > this.cx1 || v0 + reach < this.cy0 || v0 - reach > this.cy1) return;
			const unit = this.unit, h = unit >= 0 ? 0 : placeHash(x, y), t = this.t, cat = this.cat;
			for (let i = 0; i < n; i++) {
				const u = u0 + X[i], v = v0 + Y[i], pri = P[i];
				if (u < this.cx0 || u > this.cx1 || v < this.cy0 || v > this.cy1) continue;
				if (pri < PRI_LINE) {
					const id = Math.round(u * 5000) * 2097152 + Math.round(v * 5000);
					if (this.keys.has(id)) continue;
					this.keys.add(id);
				}
				this.push(u, v, unit >= 0 ? unit : pri < PRI_LINE ? frac(R[i] * 2.5 + h) * 0.4 : frac(R[i] + h), A[i], t, K[i], C[i] + cat, pri, D[i]);
			}
		};
	}

	// A straight piece between two stops: seg(x0, y0, x1, y1, keys).
	seg(x0, y0, x1, y1, keyA = true, keyB = true, jkB = -1) {
		const dx = x1 - x0, dy = y1 - y0, m = Math.sqrt(dx * dx + dy * dy);
		if (m < 1e-9 || (x0 < this.x0 - m && x1 < this.x0 - m) || (x0 > this.x1 + m && x1 > this.x1 + m) || (y0 < this.y0 - m && y1 < this.y0 - m) || (y0 > this.y1 + m && y1 > this.y1 + m)) return this;
		this.begin(x0, y0, keyA);
		this.to(x1, y1);
		if (jkB >= 0) this.jk = jkB;
		this.end(keyB);
		return this;
	}
	// A circle or part of one. stops: angles along it (ascending, within a0..a1) that have a stone of their
	// own, with a whole number of stones between; none: a whole circle is one closed run from a0, a part
	// of one runs between its ends with no stones of their own.
	arc(cx, cy, r, a0 = 0, a1 = TAU, stops = null) {
		if (r <= 0) return this;
		const b = this.box, m = r + this.pitch;
		if (cx + m < b.x0 || cx - m > b.x1 || cy + m < b.y0 || cy - m > b.y1) return this;
		const whole = Math.abs(a1 - a0) >= TAU - 1e-6;
		const stepA = Math.min(0.21, (2 * this.pitch) / r);
		const lay = (from, to, keyA, keyB, closed) => {
			const n = Math.max(2, Math.ceil(Math.abs(to - from) / stepA));
			this.begin(cx + r * Math.cos(from), cy + r * Math.sin(from), keyA);
			for (let i = 1; i <= n; i++) { const a = from + ((to - from) * i) / n; this.to(cx + r * Math.cos(a), cy + r * Math.sin(a)); }
			this.end(keyB, closed);
		};
		if (stops?.length) {
			if (whole) for (let i = 0; i < stops.length; i++) lay(stops[i], i + 1 < stops.length ? stops[i + 1] : stops[0] + TAU, true, true, false);
			else {
				const list = stops;
				for (let i = 0; i + 1 < list.length; i++) lay(list[i], list[i + 1], true, true, false);
			}
			return this;
		}
		if (whole) lay(a0, a0 + TAU, false, false, true);
		else lay(a0, a1, false, false, false);
		return this;
	}
	// A closed or open polyline of straight bits; where it turns sharply there is a stone. pts: [[x, y]...]
	poly(pts, closed = false, sharp = 0.5) {
		const n = pts.length;
		if (n < 2) return this;
		const turnAt = (i) => {
			const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
			let t = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]);
			t = ((t + Math.PI) % TAU + TAU) % TAU - Math.PI;
			return Math.abs(t);
		};
		let first = 0, corners = 0;
		if (closed) for (let i = 0; i < n; i++) if (turnAt(i) > sharp) { if (!corners) first = i; corners++; }
		if (closed && !corners) {
			this.begin(pts[0][0], pts[0][1], false);
			for (let i = 1; i <= n; i++) this.to(pts[i % n][0], pts[i % n][1]);
			this.end(false, true);
			return this;
		}
		this.begin(pts[first][0], pts[first][1], true);
		const last = closed ? n : n - 1;
		for (let s = 1; s <= last; s++) {
			const i = (first + s) % n;
			this.to(pts[i][0], pts[i][1]);
			if (closed ? s < n && turnAt(i) > sharp : s < last && turnAt(i) > sharp) this.corner(true);
		}
		this.end(true);
		return this;
	}
	// Steps that keep a curve smooth at this pitch, for a curve about `length` metres long.
	stepsFor(length, most = 6000) { return Math.min(most, Math.max(16, Math.ceil((length / this.pitch) * 3))); }
}

// A drawing kept between frames: the pen's moves for a layout too dear to draw every frame (lines of a field,
// a packing of circles). Replaying it lays the stones again for wherever the pattern now lies, at what
// they now measure on the cloth; the moves are the same, so moving a pattern moves its stones rigidly.
const OP_STATE = 0, OP_ADD = 1, OP_KEY = 2, OP_MOVE = 3, OP_TO = 4, OP_BEGIN = 5, OP_CORNER = 6, OP_END = 7, OP_SEG = 8, OP_ARC = 9;
export class Drawing {
	constructor() { this.ops = new Float64Array(4096); this.n = 0; }
	reset(box, pitch, seed, edgeAt, o = {}) {
		this.n = 0; this.box = box; this.pitch = Math.max(pitch, 1e-4); this.seed = seed; this.edgeAt = edgeAt; this.truncated = false;
		this.gap = o.gap ?? 1; this.d0 = o.d0 ?? this.pitch / this.gap; this.fine = o.fine ?? 1;
		this.t = 0; this.k = 1; this.cat = 0; this.jk = 1; this.jpri = 0; this.unit = -1;
		this.st = [0, 1, 0, 1, 0, -1];
		return this;
	}
	room(m) {
		if (this.n + m > this.ops.length) { const b = new Float64Array(this.ops.length * 2); b.set(this.ops); this.ops = b; }
	}
	sync() {
		const s = this.st;
		if (s[0] !== this.t || s[1] !== this.k || s[2] !== this.cat || s[3] !== this.jk || s[4] !== this.jpri || s[5] !== this.unit) {
			s[0] = this.t; s[1] = this.k; s[2] = this.cat; s[3] = this.jk; s[4] = this.jpri; s[5] = this.unit;
			this.put(OP_STATE, ...s);
		}
	}
	put(...a) { this.room(a.length); for (const v of a) this.ops[this.n++] = v; }
	add(x, y, rank = 0.5, angle = 0, t = this.t, k = this.k, cat = this.cat, pri = PRI_FILL) { this.sync(); this.put(OP_ADD, x, y, rank, angle, t, k, cat, pri); }
	key(x, y, angle = 0, t = this.t, k = this.jk, cat = this.cat, pri = this.jpri, rank0 = -1) { this.sync(); this.put(OP_KEY, x, y, angle, t, k, cat, pri, rank0); }
	move(x, y) { this.sync(); this.put(OP_MOVE, x, y); return this; }
	to(x, y) { this.sync(); this.put(OP_TO, x, y); return this; }
	begin(x, y, key = true) { this.sync(); this.put(OP_BEGIN, x, y, key ? 1 : 0); return this; }
	corner(key = true) { this.sync(); this.put(OP_CORNER, key ? 1 : 0); return this; }
	end(key = true, closed = false) { this.sync(); this.put(OP_END, key ? 1 : 0, closed ? 1 : 0); return this; }
	seg(x0, y0, x1, y1, a = true, b = true, jkB = -1) { this.sync(); this.put(OP_SEG, x0, y0, x1, y1, a ? 1 : 0, b ? 1 : 0, jkB); return this; }
	arc(cx, cy, r, a0 = 0, a1 = TAU) { this.sync(); this.put(OP_ARC, cx, cy, r, a0, a1); return this; }
	poly(pts, closed = false, sharp = 0.5) { return Candidates.prototype.poly.call(this, pts, closed, sharp); }
	stamped(draw) { return (x, y) => draw(this, x, y); }
	stepsFor(length, most = 6000) { return Candidates.prototype.stepsFor.call(this, length, most); }
	replay(E) {
		const o = this.ops, n = this.n;
		for (let i = 0; i < n;) {
			switch (o[i]) {
				case OP_STATE: E.t = o[i + 1]; E.k = o[i + 2]; E.cat = o[i + 3]; E.jk = o[i + 4]; E.jpri = o[i + 5]; E.unit = o[i + 6]; i += 7; break;
				case OP_ADD: E.add(o[i + 1], o[i + 2], o[i + 3], o[i + 4], o[i + 5], o[i + 6], o[i + 7], o[i + 8]); i += 9; break;
				case OP_KEY: E.key(o[i + 1], o[i + 2], o[i + 3], o[i + 4], o[i + 5], o[i + 6], o[i + 7], o[i + 8]); i += 9; break;
				case OP_MOVE: E.move(o[i + 1], o[i + 2]); i += 3; break;
				case OP_TO: E.to(o[i + 1], o[i + 2]); i += 3; break;
				case OP_BEGIN: E.begin(o[i + 1], o[i + 2], !!o[i + 3]); i += 4; break;
				case OP_CORNER: E.corner(!!o[i + 1]); i += 2; break;
				case OP_END: E.end(!!o[i + 1], !!o[i + 2]); i += 3; break;
				case OP_SEG: E.seg(o[i + 1], o[i + 2], o[i + 3], o[i + 4], !!o[i + 5], !!o[i + 6], o[i + 7]); i += 8; break;
				case OP_ARC: E.arc(o[i + 1], o[i + 2], o[i + 3], o[i + 4], o[i + 5]); i += 6; break;
				default: throw new Error('Bad drawing');
			}
		}
		E.finish();
	}
}
