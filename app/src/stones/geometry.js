// A stone pattern's geometry: what a layout draws, as data, before any stone is laid. The layouts draw with the same
// pen calls as before (add, key, move/to, begin/to/corner/end, seg, arc, poly, stamped), in the pattern's own space;
// nothing here knows the pattern's map, its sizes or the piece. One stone engine (stones/candidates.js Candidates.lay)
// turns any geometry into candidates. Phase 2 of knowledge/product/roadmap/webgpu-and-stone-engine-plan.md; design:
// knowledge/engineering/architecture/stone-pattern-engine.md (and the geometry note it links).
//
// What it holds, in drawing order (items: kind + index; the order is the candidates' order, which the parallel rule's ties
// and the joints' "first one wins" go by):
//   POINT  one stone: x, y, rank (as given; sizes dither by it), angle, t, k, cat, pri, unit (the rank it is kept by, if set)
//   KEY    a stone the design hangs on: x, y, angle, t, k, cat, pri, rank; the same place twice is one stone (on the cloth)
//   LINE   a free line (move, to...): stones every step from its start until it ends; vertices of their own
//   RUN    a run between two stops (begin, to..., corner or end): a whole number of stones fills it; either stop may have a
//          stone of its own (keyA, jkA, jpA; keyB, jkB, jpB); closed: a loop with a stone where it meets itself
//   STAMP  one copy of a cell (stamped): its template (a geometry of its own, drawn once about its origin) at x, y, with
//          the copy's t, cat (added to the cell's own) and unit; the copies' stones are the cell's moved, so a lattice of
//          cells costs a few array writes a stone (under a size modifier or a distortion, each copy's runs are laid where
//          it lies, the cell still drawn once)
//   SOURCE points by formula (a scatter's blue-noise tile over the box): a kernel and its arguments, expanded by index
// Vertices (of lines and runs): x, y, k, t, and for lines the cat and unit each step is laid with.
// Every number in Float64Array tables with a fixed stride, so the engine's steps read typed arrays (the CPU twin of the
// GPU engine: Phase 3).
import { TAU, hash2 } from './fields.js';

export const PRI_LINE = 200, PRI_FILL = 240;
// What a place in the pattern's space stands for: the same place keeps the same chance.
export const placeHash = (x, y) => hash2(Math.round(x * 5000), Math.round(y * 5000), 11);

export const G_POINT = 0, G_KEY = 1, G_LINE = 2, G_RUN = 3, G_STAMP = 4, G_SOURCE = 5;
export const POINT_W = 9, KEY_W = 8, VERT_W = 6, LINE_W = 3, RUN_W = 12, STAMP_W = 6, SOURCE_W = 12;
// Points by formula (SOURCE items: kernel, box x0 x1 y0 y1, cat, unit, five arguments): a kernel lays its points by index
// (E.layAt for each, in a fixed order), so a source of a hundred thousand stones is one item, made per point where it is
// laid (by the GPU in Phase 3). Kernels are registered by the layout module that owns them: SOURCES[id] =
// (E, args, box, cat, unit) => ...
export const SOURCES = [];
const EVERYWHERE = { x0: -1e3, x1: 1e3, y0: -1e3, y1: 1e3, r: 1e3 };

const grown = (a, need) => {
	if (need <= a.length) return a;
	const b = new a.constructor(Math.max(need, a.length * 2));
	b.set(a);
	return b;
};

export class Geometry {
	// cap: room for this many of each to start with (they grow)
	constructor(cap = 1024) {
		this.kind = new Uint8Array(cap); this.idx = new Int32Array(cap);
		this.Pt = new Float64Array(cap * POINT_W); this.Ky = new Float64Array(cap * KEY_W); this.Vx = new Float64Array(cap * 4 * VERT_W);
		this.Ln = new Float64Array(cap * LINE_W); this.Rn = new Float64Array(cap * RUN_W); this.St = new Float64Array(cap * STAMP_W);
		this.Sr = new Float64Array(8 * SOURCE_W);
		this.templates = [];
		this.reset(EVERYWHERE, 0.004, 1);
	}

	// box: the part of the pattern's space worth drawing { x0, y0, x1, y1, r }; pitch: centre-to-centre distance of the
	// crystal's stones along a line, in the pattern's space; seed: the group's; edgeAt: distance to the piece's edge (flat
	// layouts). o: d0, gap (the crystal's real size and the stones' spacing as a factor of it), fine (the smallest size this
	// pattern asks for, as a factor of d0), angles (stones have a direction that matters).
	reset(box, pitch, seed = 1, edgeAt = null, o = {}) {
		this.items = 0; this.np = 0; this.nk = 0; this.nv = 0; this.nl = 0; this.nr = 0; this.ns = 0; this.nsr = 0; this.templates.length = 0;
		this.box = box; this.pitch = Math.max(pitch, 1e-4); this.seed = seed; this.edgeAt = edgeAt; this.truncated = false;
		this.gap = o.gap ?? 1; this.d0 = o.d0 ?? this.pitch / this.gap; this.fine = o.fine ?? 1; this.angles = !!o.angles;
		this.t = 0; this.k = 1; this.cat = 0; this.jk = 1; this.jpri = 0; this.unit = -1;
		this.inRun = false; this.inLine = false;
		return this;
	}

	item(kind, i) {
		const n = this.items;
		if (n >= this.kind.length) { this.kind = grown(this.kind, n + 1); this.idx = grown(this.idx, n + 1); }
		this.kind[n] = kind; this.idx[n] = i; this.items = n + 1;
	}
	vert(x, y) {
		const o = this.nv * VERT_W;
		if (o + VERT_W > this.Vx.length) this.Vx = grown(this.Vx, o + VERT_W);
		const V = this.Vx;
		V[o] = x; V[o + 1] = y; V[o + 2] = this.k; V[o + 3] = this.t; V[o + 4] = this.cat; V[o + 5] = this.unit;
		this.nv++;
		this.px = x; this.py = y;
	}

	// --- single stones ---------------------------------------------------------------------------------
	add(x, y, rank = 0.5, angle = 0, t = this.t, k = this.k, cat = this.cat, pri = PRI_FILL) {
		const b = this.box;
		if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1) return;
		const o = this.np * POINT_W;
		if (o + POINT_W > this.Pt.length) this.Pt = grown(this.Pt, o + POINT_W);
		const A = this.Pt;
		A[o] = x; A[o + 1] = y; A[o + 2] = rank; A[o + 3] = angle; A[o + 4] = t; A[o + 5] = k; A[o + 6] = cat; A[o + 7] = pri; A[o + 8] = this.unit;
		this.item(G_POINT, this.np++);
	}
	// A stone the design hangs on: first in line for its place, and kept longest as a density thins it (unless given a rank:
	// a pattern of nothing else thins over the whole range). The same place asked for twice (a joint of several lines) is
	// one stone: the engine keeps the first.
	key(x, y, angle = 0, t = this.t, k = this.jk, cat = this.cat, pri = this.jpri, rank0 = -1) {
		const b = this.box;
		if (x < b.x0 - 0.002 || x > b.x1 + 0.002 || y < b.y0 - 0.002 || y > b.y1 + 0.002) return;
		const o = this.nk * KEY_W;
		if (o + KEY_W > this.Ky.length) this.Ky = grown(this.Ky, o + KEY_W);
		const A = this.Ky;
		A[o] = x; A[o + 1] = y; A[o + 2] = angle; A[o + 3] = t; A[o + 4] = k; A[o + 5] = cat; A[o + 6] = pri;
		A[o + 7] = this.unit >= 0 ? this.unit : rank0 >= 0 ? rank0 : placeHash(x, y) * 0.4;
		this.item(G_KEY, this.nk++);
	}

	// Points by formula over the box: kernel (an id in SOURCES), args (up to five numbers); the stones take this cat and
	// unit, and pri PRI_FILL unless the kernel says otherwise.
	source(kernel, args) {
		const o = this.nsr * SOURCE_W;
		if (o + SOURCE_W > this.Sr.length) this.Sr = grown(this.Sr, o + SOURCE_W);
		const S = this.Sr, b = this.box;
		S.fill(0, o, o + SOURCE_W);
		S[o] = kernel; S[o + 1] = b.x0; S[o + 2] = b.x1; S[o + 3] = b.y0; S[o + 4] = b.y1; S[o + 5] = this.cat; S[o + 6] = this.unit;
		for (let i = 0; i < Math.min(5, args.length); i++) S[o + 7 + i] = args[i];
		this.item(G_SOURCE, this.nsr++);
	}

	// --- a free line -------------------------------------------------------------------------------------
	move(x, y) {
		this.finish();
		this.inLine = true; this.lv0 = this.nv;
		this.vert(x, y);
		return this;
	}
	// To a point of the line (or of the run under way).
	to(x, y) {
		if (this.inRun || this.inLine) this.vert(x, y);
		return this;
	}
	closeLine() {
		this.inLine = false;
		const o = this.nl * LINE_W;
		if (o + LINE_W > this.Ln.length) this.Ln = grown(this.Ln, o + LINE_W);
		const V = this.Vx, v0 = this.lv0;
		this.Ln[o] = v0; this.Ln[o + 1] = this.nv - v0; this.Ln[o + 2] = placeHash(V[v0 * VERT_W], V[v0 * VERT_W + 1]);
		this.item(G_LINE, this.nl++);
	}

	// --- a run between stops -----------------------------------------------------------------------------
	// begin(x, y, key): a run starts here; key: with a stone of its own (this.jk its size). Then to(), and corner() or end().
	begin(x, y, key = true) {
		this.finish();
		this.inRun = true;
		this.openRun(x, y, key);
		return this;
	}
	openRun(x, y, key) {
		this.rv0 = this.nv; this.keyA = key; this.jkA = this.jk; this.jpA = this.jpri;
		this.vert(x, y);
	}
	closeRun(keyB, closed) {
		const o = this.nr * RUN_W;
		if (o + RUN_W > this.Rn.length) this.Rn = grown(this.Rn, o + RUN_W);
		const R = this.Rn, V = this.Vx, v0 = this.rv0;
		R[o] = v0; R[o + 1] = this.nv - v0; R[o + 2] = placeHash(V[v0 * VERT_W], V[v0 * VERT_W + 1]);
		R[o + 3] = this.keyA ? 1 : 0; R[o + 4] = this.jkA; R[o + 5] = this.jpA;
		R[o + 6] = keyB ? 1 : 0; R[o + 7] = this.jk; R[o + 8] = this.jpri;
		R[o + 9] = closed ? 1 : 0; R[o + 10] = this.cat; R[o + 11] = this.unit;
		this.item(G_RUN, this.nr++);
	}
	// a stop part of the way along: the stretch so far is one run, and the next starts here
	corner(key = true) {
		if (!this.inRun) return this;
		const x = this.px, y = this.py;
		this.closeRun(key, false);
		this.openRun(x, y, key);
		return this;
	}
	end(key = true, closed = false) {
		if (this.inRun) { this.closeRun(key, closed); this.inRun = false; }
		return this;
	}
	finish() {
		if (this.inRun) this.end(false);
		if (this.inLine) this.closeLine();
	}

	// Many copies of one drawing (a tile, a motif in its cell): drawn once about its origin as a template, then each copy is
	// an item. draw(T, x, y) draws on T at (x, y). A copy's stones take its t, its cat added to the template's, and thin by
	// its unit if set, or by a chance of their own (the template's, moved by the copy's place).
	stamped(draw) {
		const T = new Geometry(32).reset(EVERYWHERE, this.pitch, this.seed, null, { d0: this.d0, gap: this.gap, fine: this.fine, angles: this.angles });
		T.k = this.k; T.jk = this.jk; T.jpri = this.jpri;
		draw(T, 0, 0);
		T.finish();
		T.reach = T.extent();
		const id = this.templates.push(T) - 1;
		return (x, y) => {
			const o = this.ns * STAMP_W;
			if (o + STAMP_W > this.St.length) this.St = grown(this.St, o + STAMP_W);
			const S = this.St;
			S[o] = id; S[o + 1] = x; S[o + 2] = y; S[o + 3] = this.t; S[o + 4] = this.cat; S[o + 5] = this.unit;
			this.item(G_STAMP, this.ns++);
		};
	}
	// how far its geometry reaches from its origin, in its own space
	extent() {
		let r = 0;
		for (let i = 0; i < this.np; i++) r = Math.max(r, Math.abs(this.Pt[i * POINT_W]), Math.abs(this.Pt[i * POINT_W + 1]));
		for (let i = 0; i < this.nk; i++) r = Math.max(r, Math.abs(this.Ky[i * KEY_W]), Math.abs(this.Ky[i * KEY_W + 1]));
		for (let i = 0; i < this.nv; i++) r = Math.max(r, Math.abs(this.Vx[i * VERT_W]), Math.abs(this.Vx[i * VERT_W + 1]));
		return r;
	}

	// --- shapes made of runs (as the pen drew them: the engine sees only their runs) -------------------
	// A straight piece between two stops: seg(x0, y0, x1, y1, keys).
	seg(x0, y0, x1, y1, keyA = true, keyB = true, jkB = -1) {
		const dx = x1 - x0, dy = y1 - y0, m = Math.sqrt(dx * dx + dy * dy), b = this.box;
		if (m < 1e-9 || (x0 < b.x0 - m && x1 < b.x0 - m) || (x0 > b.x1 + m && x1 > b.x1 + m) || (y0 < b.y0 - m && y1 < b.y0 - m) || (y0 > b.y1 + m && y1 > b.y1 + m)) return this;
		this.begin(x0, y0, keyA);
		this.to(x1, y1);
		if (jkB >= 0) this.jk = jkB;
		this.end(keyB);
		return this;
	}
	// A circle or part of one. stops: angles along it (ascending, within a0..a1) that have a stone of their own, with a whole
	// number of stones between; none: a whole circle is one closed run from a0, a part of one runs between its ends with no
	// stones of their own.
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
			else for (let i = 0; i + 1 < stops.length; i++) lay(stops[i], stops[i + 1], true, true, false);
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
