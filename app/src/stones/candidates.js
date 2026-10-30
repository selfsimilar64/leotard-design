// The candidates of a stone pattern: where stones may go, in the pattern's own space (metres, origin
// at the pattern's centre, before its move, turn and scale), as flat arrays so that tens of thousands
// can be laid out inside a frame. Each candidate carries:
//   rank   0..1: it is kept while the density there is above this, so thinning is stable
//   angle  which way a shaped stone points
//   t      how far along the pattern it is, 0..1 (rings outwards, along a spiral arm)
//   k      a size factor (a tapering ray, a bubble)
//   cat    which family it belongs to (a ring, an arm, a colour of a checker)
// Also the pen: lines laid out with one stone every `pitch`, wherever the pattern goes, so stones stay
// the same distance apart whatever the pattern's scale.
import { TAU, rankOf1 } from './fields.js';

export const MAX_CANDIDATES = 150000;

export class Candidates {
	constructor(cap = 2048) { this.alloc(cap); this.n = 0; }
	alloc(cap) {
		const grow = (a, T) => { const b = new T(cap); if (a) b.set(a); return b; };
		this.X = grow(this.X, Float32Array); this.Y = grow(this.Y, Float32Array); this.R = grow(this.R, Float32Array); this.A = grow(this.A, Float32Array);
		this.T = grow(this.T, Float32Array); this.K = grow(this.K, Float32Array); this.C = grow(this.C, Uint8Array);
		this.cap = cap;
	}

	// box: the part of the pattern's space the piece covers { x0, y0, x1, y1, r }. pitch: centre-to-
	// centre distance of stones along a line, in the pattern's space. edgeAt: distance to the piece's
	// edge (flat layouts), seed: the group's.
	reset(box, pitch, seed = 1, edgeAt = null) {
		this.n = 0; this.truncated = false; this.box = box; this.pitch = Math.max(pitch, 1e-4); this.seed = seed; this.edgeAt = edgeAt;
		this.x0 = box.x0; this.x1 = box.x1; this.y0 = box.y0; this.y1 = box.y1;
		this.t = 0; this.k = 1; this.cat = 0; this.strokes = 0; this.stones = 0;
		return this;
	}

	add(x, y, rank = 0.5, angle = 0, t = this.t, k = this.k, cat = this.cat) {
		if (x < this.x0 || x > this.x1 || y < this.y0 || y > this.y1) return;
		let n = this.n;
		if (n >= this.cap) {
			if (n >= MAX_CANDIDATES) { this.truncated = true; return; }
			this.alloc(Math.min(this.cap * 2, MAX_CANDIDATES));
		}
		this.X[n] = x; this.Y[n] = y; this.R[n] = rank; this.A[n] = angle; this.T[n] = t; this.K[n] = k; this.C[n] = cat;
		this.n = n + 1;
	}

	// --- the pen ---------------------------------------------------------------------------------
	// A free line: move, then draw through points; one stone every pitch along it.
	move(x, y) { this.px = x; this.py = y; this.rest = this.pitch * 0.5; this.strokes++; return this; }
	to(x, y) {
		const dx = x - this.px, dy = y - this.py, len = Math.hypot(dx, dy);
		if (len < 1e-9) return this;
		// a stretch wholly off the piece: only keep the pen's place
		const m = Math.max(Math.abs(dx), Math.abs(dy));
		if ((this.px < this.x0 - m && x < this.x0 - m) || (this.px > this.x1 + m && x > this.x1 + m) || (this.py < this.y0 - m && y < this.y0 - m) || (this.py > this.y1 + m && y > this.y1 + m)) {
			const left = this.rest - len, p = this.pitch;
			this.rest = left > 0 ? left : p - ((-left) % p);
			this.px = x; this.py = y;
			return this;
		}
		const ux = dx / len, uy = dy / len, a = Math.atan2(uy, ux);
		let s = this.rest;
		while (s <= len) { this.add(this.px + ux * s, this.py + uy * s, rankOf1(this.stones++ + this.strokes * 7), a); s += this.pitch; }
		this.rest = s - len;
		this.px = x; this.py = y;
		return this;
	}
	// A straight piece of a tiling: a whole number of stones, centred, none on its ends (the joints).
	seg(x0, y0, x1, y1) {
		const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
		if (len < 1e-9) return this;
		const m = len;
		if ((x0 < this.x0 - m && x1 < this.x0 - m) || (x0 > this.x1 + m && x1 > this.x1 + m) || (y0 < this.y0 - m && y1 < this.y0 - m) || (y0 > this.y1 + m && y1 > this.y1 + m)) return this;
		const n = Math.max(1, Math.round(len / this.pitch)), a = Math.atan2(dy, dx);
		for (let i = 0; i < n; i++) { const f = (i + 0.5) / n; this.add(x0 + dx * f, y0 + dy * f, rankOf1(this.stones++), a); }
		return this;
	}
	// A circle or part of one: a whole number of stones.
	arc(cx, cy, r, a0 = 0, a1 = TAU) {
		if (r <= 0) return this;
		const b = this.box, m = r + this.pitch;
		if (cx + m < b.x0 || cx - m > b.x1 || cy + m < b.y0 || cy - m > b.y1) return this;
		const whole = Math.abs(a1 - a0) >= TAU - 1e-6, n = Math.max(whole ? 3 : 1, Math.round((r * Math.abs(a1 - a0)) / this.pitch));
		for (let i = 0; i < n; i++) {
			const a = a0 + (a1 - a0) * (whole ? i / n : (i + 0.5) / n);
			this.add(cx + r * Math.cos(a), cy + r * Math.sin(a), rankOf1(this.stones++), a + Math.PI / 2);
		}
		return this;
	}
	// Steps that keep a curve smooth at this pitch, for a curve about `length` metres long.
	stepsFor(length, most = 6000) { return Math.min(most, Math.max(16, Math.ceil((length / this.pitch) * 3))); }
}
