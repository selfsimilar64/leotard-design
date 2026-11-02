// The one map between a block's flat pieces and the body (knowledge/product/roadmap/flat-and-3d-exploration-plan.md,
// stage 4): any flat point to its 3D place, any 3D place back to its flat point, and a drawn line carried over a seam.
// Plain arrays only, so it can be tested without a browser (test/flat-link.test.js).
//
// cells: [{ piece, half, uv: [u, v...] metres, I: [triangle indices], wid: [welded id per point], P: [x, y, z...] }]
// A piece may be several cells (a front is two halves joined at its fold). Two points of the same half with the same
// wid are sewn together; on a fold the halves share a wid.

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// A closest-point query needs only triangles near the point: hash them by cell of a coarse grid.
class Hash {
	constructor(size) { this.size = size; this.map = new Map(); }
	key(x, y, z = 0) { return `${Math.floor(x / this.size)},${Math.floor(y / this.size)},${Math.floor(z / this.size)}`; }
	add(lo, hi, item) {
		const f = (v) => Math.floor(v / this.size);
		for (let x = f(lo[0]); x <= f(hi[0]); x++) for (let y = f(lo[1]); y <= f(hi[1]); y++) for (let z = f(lo[2] ?? 0); z <= f(hi[2] ?? 0); z++) {
			const k = `${x},${y},${z}`;
			let list = this.map.get(k);
			if (!list) this.map.set(k, list = []);
			list.push(item);
		}
	}
	near(p, r = 1) {
		const f = (v) => Math.floor(v / this.size), out = [], cz = f(p[2] ?? 0), rz = p.length > 2 ? r : 0;
		for (let x = f(p[0]) - r; x <= f(p[0]) + r; x++) for (let y = f(p[1]) - r; y <= f(p[1]) + r; y++) for (let z = cz - rz; z <= cz + rz; z++) {
			const l = this.map.get(`${x},${y},${z}`);
			if (l) out.push(l);
		}
		return out;
	}
}

// Weights of the closest point on a triangle to p, and its distance.
function closestOnTriangle(p, a, b, c) {
	const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
	const d1 = dot(ab, ap), d2 = dot(ac, ap);
	if (d1 <= 0 && d2 <= 0) return [1, 0, 0];
	const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
	if (d3 >= 0 && d4 <= d3) return [0, 1, 0];
	const vc = d1 * d4 - d3 * d2;
	if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return [1 - v, v, 0]; }
	const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
	if (d6 >= 0 && d5 <= d6) return [0, 0, 1];
	const vb = d5 * d2 - d1 * d6;
	if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return [1 - w, 0, w]; }
	const va = d3 * d6 - d5 * d4;
	if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / (d4 - d3 + d5 - d6); return [0, 1 - w, w]; }
	const den = 1 / (va + vb + vc);
	return [1 - vb * den - vc * den, vb * den, vc * den];
}

export class FlatLink {
	constructor(cells) {
		this.cells = cells;
		this.pieces = [...new Set(cells.map((c) => c.piece))];
		// flat lookup, per piece
		this.flat = new Map(this.pieces.map((p) => [p, new Hash(0.02)]));
		cells.forEach((c, ci) => {
			for (let t = 0; t < c.I.length; t += 3) {
				const us = [0, 1, 2].map((k) => c.uv[c.I[t + k] * 2]), vs = [0, 1, 2].map((k) => c.uv[c.I[t + k] * 2 + 1]);
				this.flat.get(c.piece).add([Math.min(...us), Math.min(...vs)], [Math.max(...us), Math.max(...vs)], [ci, t]);
			}
		});
		this.seams = this.findSeams();
		this.place();
	}

	// Points sewn together: same half and same welded id, on another piece or apart on the same one (a sleeve's two sides).
	findSeams() {
		const byId = new Map(), out = [];
		this.cells.forEach((c, ci) => c.wid.forEach((w, v) => {
			const k = `${c.half}:${w}`;
			if (!byId.has(k)) byId.set(k, []);
			byId.get(k).push([ci, v]);
		}));
		for (const list of byId.values()) {
			if (list.length < 2) continue;
			for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) out.push({ a: { cell: list[i][0], v: list[i][1] }, b: { cell: list[j][0], v: list[j][1] } });
		}
		return out;
	}

	// (Re)read the 3D places, after a pose or body change.
	place() {
		this.space = new Hash(0.03);
		this.cells.forEach((c, ci) => {
			for (let t = 0; t < c.I.length; t += 3) {
				const q = [0, 1, 2].map((k) => this.pos(ci, c.I[t + k]));
				const lo = [0, 1, 2].map((a) => Math.min(q[0][a], q[1][a], q[2][a])), hi = [0, 1, 2].map((a) => Math.max(q[0][a], q[1][a], q[2][a]));
				this.space.add(lo, hi, [ci, t]);
			}
		});
	}

	pos(ci, v) { const P = this.cells[ci].P; return [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]]; }
	uv(ci, v) { const U = this.cells[ci].uv; return [U[v * 2], U[v * 2 + 1]]; }

	// A flat point of a piece -> { cell, tri, w, p: its 3D place }, or null off the piece.
	toBody(piece, u, v) {
		let best = null, least = -1e-4;
		for (const list of this.flat.get(piece).near([u, v], 0)) for (const [ci, t] of list) {
			const c = this.cells[ci], [a, b, d] = [c.I[t], c.I[t + 1], c.I[t + 2]];
			const x1 = c.uv[a * 2], y1 = c.uv[a * 2 + 1], x2 = c.uv[b * 2], y2 = c.uv[b * 2 + 1], x3 = c.uv[d * 2], y3 = c.uv[d * 2 + 1];
			const den = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
			if (Math.abs(den) < 1e-14) continue;
			const w1 = ((y2 - y3) * (u - x3) + (x3 - x2) * (v - y3)) / den, w2 = ((y3 - y1) * (u - x3) + (x1 - x3) * (v - y3)) / den, w = [w1, w2, 1 - w1 - w2], m = Math.min(...w);
			if (m >= least) { least = m; best = { cell: ci, tri: t, w }; }
		}
		if (!best) return null;
		best.p = this.at(best.cell, best.tri, best.w);
		return best;
	}

	at(ci, t, w) {
		const I = this.cells[ci].I, q = [0, 1, 2].map((k) => this.pos(ci, I[t + k]));
		return [0, 1, 2].map((a) => w[0] * q[0][a] + w[1] * q[1][a] + w[2] * q[2][a]);
	}

	// A hit on a known triangle (from a ray) -> its flat point.
	flatOf(ci, t, w) {
		const c = this.cells[ci], U = [0, 1, 2].map((k) => this.uv(ci, c.I[t + k]));
		return { piece: c.piece, u: w[0] * U[0][0] + w[1] * U[1][0] + w[2] * U[2][0], v: w[0] * U[0][1] + w[1] * U[1][1] + w[2] * U[2][1], cell: ci, tri: t, w };
	}

	// Any 3D point -> the flat point closest to it, and how far off it was.
	toFlat(p) {
		let best = null, bd = Infinity;
		const seen = new Set();
		for (const list of this.space.near(p)) for (const item of list) {
			const key = item[0] * 1e7 + item[1];
			if (seen.has(key)) continue;
			seen.add(key);
			const [ci, t] = item, I = this.cells[ci].I, a = this.pos(ci, I[t]), b = this.pos(ci, I[t + 1]), c = this.pos(ci, I[t + 2]);
			const w = closestOnTriangle(p, a, b, c), q = [0, 1, 2].map((k) => w[0] * a[k] + w[1] * b[k] + w[2] * c[k]), d = dist3(p, q);
			if (d < bd) { bd = d; best = { ci, t, w }; }
		}
		return best ? { ...this.flatOf(best.ci, best.t, best.w), off: bd } : null;
	}

	// Where a line going from a point on one piece to a point on another crosses: the sewn pair nearest its middle.
	crossing(from, to) {
		const pa = this.at(from.cell, from.tri, from.w), pb = this.at(to.cell, to.tri, to.w), mid = [0, 1, 2].map((k) => (pa[k] + pb[k]) / 2);
		// the two nearest sewn pairs are the stretch of seam it crosses; the crossing lies between them
		const near = [];
		for (const s of this.seams) {
			const A = this.cells[s.a.cell].piece, B = this.cells[s.b.cell].piece;
			let x = null;
			if (A === from.piece && B === to.piece) x = [s.a, s.b];
			else if (B === from.piece && A === to.piece) x = [s.b, s.a];
			if (x) near.push({ x, d: dist3(this.pos(x[0].cell, x[0].v), mid) });
		}
		if (!near.length) return null;
		near.sort((p, q) => p.d - q.d);
		const [a, b] = near[0].x, next = near[1] && dist3(this.pos(a.cell, a.v), this.pos(near[1].x[0].cell, near[1].x[0].v)) < 0.02 ? near[1].x : null;
		let t = 0;
		if (next) {
			const pa = this.pos(a.cell, a.v), along = sub(this.pos(next[0].cell, next[0].v), pa);
			t = Math.max(0, Math.min(1, dot(sub(mid, pa), along) / (dot(along, along) || 1)));
		}
		const mix = (p, q) => p.map((v, i) => v + (q[i] - v) * t);
		const end = (e, f) => ({ uv: next ? mix(this.uv(e.cell, e.v), this.uv(f.cell, f.v)) : this.uv(e.cell, e.v), p: next ? mix(this.pos(e.cell, e.v), this.pos(f.cell, f.v)) : this.pos(e.cell, e.v) });
		return { from: { piece: from.piece, ...end(a, next?.[0]) }, to: { piece: to.piece, ...end(b, next?.[1]) } };
	}

	// A line of flat points in order, as drawn on the body -> one stroke per stretch on a piece, each carried to the seam it
	// crosses. A crossing with no seam between (the line left the garment, or jumped) just ends the stroke.
	strokes(points) {
		const out = [];
		let cur = null;
		for (const q of points) {
			if (cur && cur.piece === q.piece) { cur.points.push([q.u, q.v]); cur.last = q; continue; }
			const x = cur ? this.crossing(cur.last, q) : null;
			if (cur && x && dist3(x.from.p, this.at(q.cell, q.tri, q.w)) < 0.05) {
				cur.points.push(x.from.uv);
				cur.seamEnd = x.from.p;
				out.push(cur);
				cur = { piece: q.piece, points: [x.to.uv, [q.u, q.v]], seamStart: x.to.p };
			} else {
				if (cur) out.push(cur);
				cur = { piece: q.piece, points: [[q.u, q.v]] };
			}
			cur.last = q;
		}
		if (cur) out.push(cur);
		return out;
	}

	// How far apart in 3D sewn points now are, in metres: every sewn pair.
	seamGaps() {
		let most = 0, sum = 0;
		for (const s of this.seams) { const d = dist3(this.pos(s.a.cell, s.a.v), this.pos(s.b.cell, s.b.v)); most = Math.max(most, d); sum += d; }
		return { pairs: this.seams.length, mean: sum / (this.seams.length || 1), max: most };
	}
}
