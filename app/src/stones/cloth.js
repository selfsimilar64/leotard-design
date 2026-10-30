// A piece of the garment as flat cloth: where a point of the flat piece lies on the body, and back.
// Stones are pressed on flat pieces before the garment is sewn, and a piece's flat shape (its UVs,
// garment/flatten.js, near-isometric, in metres, grain up +v, origin at its middle) is the one space
// where a lattice stays a lattice, wrapped round the side of the body or not. A query is a lookup in a
// grid, so tens of thousands can be answered in a frame. Spec:
// knowledge/engineering/architecture/procedural-stone-patterns.md.
import * as THREE from 'three';
import { locate, baryOfVertexInFace } from '../garment/arrangement.js';

const _p = new THREE.Vector3();

export class ClothPiece {
	// arr: the arrangement; cell: the cell; piece: its pattern piece (garment/pieces.js); uv: Float32Array(2n)
	constructor(arr, surf, cell, piece, uv) {
		this.arr = arr; this.surf = surf; this.cell = cell; this.piece = piece; this.uv = uv;
		const tris = this.tris = arr.cells[cell].tris, n = this.n = tris.length, I = piece.I, P = piece.P;
		this.face = new Int32Array(n);
		this.bary = new Float32Array(n * 9);
		this.inv = new Float64Array(n * 6);   // u0, v0, then the inverse of the triangle's edge matrix
		this.jac = new Float32Array(n * 4);   // flat directions -> the surface frame stones turn in
		let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, area = 0;
		const idx = surf.idx, SP = surf.P;
		for (let q = 0; q < n; q++) {
			const t = tris[q], f = arr.triFace[t];
			this.face[q] = f;
			for (let k = 0; k < 3; k++) { const b = baryOfVertexInFace(arr, surf, arr.tris[t * 3 + k], f); this.bary[q * 9 + k * 3] = b[0]; this.bary[q * 9 + k * 3 + 1] = b[1]; this.bary[q * 9 + k * 3 + 2] = b[2]; }
			const i0 = I[q * 3], i1 = I[q * 3 + 1], i2 = I[q * 3 + 2];
			const u0 = uv[i0 * 2], v0 = uv[i0 * 2 + 1], du1 = uv[i1 * 2] - u0, dv1 = uv[i1 * 2 + 1] - v0, du2 = uv[i2 * 2] - u0, dv2 = uv[i2 * 2 + 1] - v0, det = du1 * dv2 - du2 * dv1;
			x0 = Math.min(x0, u0, u0 + du1, u0 + du2); x1 = Math.max(x1, u0, u0 + du1, u0 + du2);
			y0 = Math.min(y0, v0, v0 + dv1, v0 + dv2); y1 = Math.max(y1, v0, v0 + dv1, v0 + dv2);
			area += Math.abs(det) / 2;
			const o = q * 6;
			if (Math.abs(det) < 1e-14) { this.inv[o] = NaN; continue; }
			this.inv[o] = u0; this.inv[o + 1] = v0; this.inv[o + 2] = dv2 / det; this.inv[o + 3] = -du2 / det; this.inv[o + 4] = -dv1 / det; this.inv[o + 5] = du1 / det;
			// the surface directions of flat +u and +v, in the frame stones turn in (generators.js angleAt)
			const ex = P[i1 * 3] - P[i0 * 3], ey = P[i1 * 3 + 1] - P[i0 * 3 + 1], ez = P[i1 * 3 + 2] - P[i0 * 3 + 2], gx = P[i2 * 3] - P[i0 * 3], gy = P[i2 * 3 + 1] - P[i0 * 3 + 1], gz = P[i2 * 3 + 2] - P[i0 * 3 + 2];
			const tux = (dv2 * ex - dv1 * gx) / det, tuy = (dv2 * ey - dv1 * gy) / det, tuz = (dv2 * ez - dv1 * gz) / det;
			const tvx = (du1 * gx - du2 * ex) / det, tvy = (du1 * gy - du2 * ey) / det, tvz = (du1 * gz - du2 * ez) / det;
			const a = idx[f * 3] * 3, b = idx[f * 3 + 1] * 3, c = idx[f * 3 + 2] * 3;
			const ax = SP[b] - SP[a], ay = SP[b + 1] - SP[a + 1], az = SP[b + 2] - SP[a + 2], bx = SP[c] - SP[a], by = SP[c + 1] - SP[a + 1], bz = SP[c + 2] - SP[a + 2];
			let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
			const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
			// t0 = (0, 1, 0) x n, b0 = n x t0
			let t0x = nz, t0y = 0, t0z = -nx;
			const tl = Math.hypot(t0x, t0z);
			if (tl < 1e-6) { t0x = 1; t0z = 0; } else { t0x /= tl; t0z /= tl; }
			const b0x = ny * t0z - nz * t0y, b0y = nz * t0x - nx * t0z, b0z = nx * t0y - ny * t0x;
			const j = q * 4;
			this.jac[j] = tux * t0x + tuy * t0y + tuz * t0z; this.jac[j + 1] = tvx * t0x + tvy * t0y + tvz * t0z;
			this.jac[j + 2] = tux * b0x + tuy * b0y + tuz * b0z; this.jac[j + 3] = tvx * b0x + tvy * b0y + tvz * b0z;
		}
		this.x0 = x0; this.x1 = x1; this.y0 = y0; this.y1 = y1; this.area = area;
		this.buildGrid(n ? Math.sqrt(area / n) * 1.5 : 1);
	}

	buildGrid(cw) {
		const { n, inv, piece: { I }, uv, x0, y0, x1, y1 } = this;
		cw = Math.max(cw, Math.max(x1 - x0, y1 - y0) / 1024, 1e-4);
		const nx = this.nx = Math.max(1, Math.ceil((x1 - x0) / cw)), ny = this.ny = Math.max(1, Math.ceil((y1 - y0) / cw));
		this.cw = cw;
		const start = this.start = new Int32Array(nx * ny + 1);
		const each = (q, fn) => {
			if (Number.isNaN(inv[q * 6])) return;
			let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
			for (let k = 0; k < 3; k++) { const v = I[q * 3 + k] * 2; a = Math.min(a, uv[v]); b = Math.max(b, uv[v]); c = Math.min(c, uv[v + 1]); d = Math.max(d, uv[v + 1]); }
			const i0 = Math.max(0, Math.floor((a - x0) / cw)), i1 = Math.min(nx - 1, Math.floor((b - x0) / cw)), j0 = Math.max(0, Math.floor((c - y0) / cw)), j1 = Math.min(ny - 1, Math.floor((d - y0) / cw));
			for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) fn(j * nx + i);
		};
		for (let q = 0; q < n; q++) each(q, (c) => { start[c + 1]++; });
		for (let c = 0; c < nx * ny; c++) start[c + 1] += start[c];
		const list = this.list = new Int32Array(start[nx * ny]), fill = start.slice(0, nx * ny);
		for (let q = 0; q < n; q++) each(q, (c) => { list[fill[c]++] = q; });
	}

	// The triangle under flat point (u, v), or -1; its weights in this.w1, this.w2.
	find(u, v) {
		const i = Math.floor((u - this.x0) / this.cw), j = Math.floor((v - this.y0) / this.cw);
		if (i < 0 || j < 0 || i >= this.nx || j >= this.ny) return -1;
		const c = j * this.nx + i, { start, list, inv } = this;
		for (let k = start[c], e = start[c + 1]; k < e; k++) {
			const q = list[k], o = q * 6, du = u - inv[o], dv = v - inv[o + 1], w1 = inv[o + 2] * du + inv[o + 3] * dv;
			if (w1 < -1e-5) continue;
			const w2 = inv[o + 4] * du + inv[o + 5] * dv;
			if (w2 < -1e-5 || w1 + w2 > 1 + 1e-5) continue;
			this.w1 = w1; this.w2 = w2;
			return q;
		}
		return -1;
	}
	// The surface point of triangle q at the weights find left. -> { f, b0, b1, b2 }
	spOf(q, w1 = this.w1, w2 = this.w2) {
		const B = this.bary, o = q * 9, w0 = 1 - w1 - w2;
		return { f: this.face[q], b0: w0 * B[o] + w1 * B[o + 3] + w2 * B[o + 6], b1: w0 * B[o + 1] + w1 * B[o + 4] + w2 * B[o + 7], b2: w0 * B[o + 2] + w1 * B[o + 5] + w2 * B[o + 8] };
	}
	// Its reference position, written to out.
	posOf(q, out, w1 = this.w1, w2 = this.w2) {
		const I = this.piece.I, P = this.piece.P, w0 = 1 - w1 - w2, a = I[q * 3] * 3, b = I[q * 3 + 1] * 3, c = I[q * 3 + 2] * 3;
		out.x = w0 * P[a] + w1 * P[b] + w2 * P[c]; out.y = w0 * P[a + 1] + w1 * P[b + 1] + w2 * P[c + 1]; out.z = w0 * P[a + 2] + w1 * P[b + 2] + w2 * P[c + 2];
		return out;
	}
	// A direction on the flat piece (radians) as a stone's angle on the body.
	angleOf(q, a) {
		const J = this.jac, j = q * 4, c = Math.cos(a), s = Math.sin(a);
		return Math.atan2(J[j + 2] * c + J[j + 3] * s, J[j] * c + J[j + 1] * s);
	}

	// A flat point as a surface point. Off the piece (a handle hanging over its edge): the nearest
	// triangle carried on in its own plane, so the point still has a place to be drawn.
	spAt(u, v) {
		let q = this.find(u, v);
		if (q >= 0) return this.spOf(q);
		q = this.nearest(u, v);
		if (q < 0) return null;
		const o = q * 6, du = u - this.inv[o], dv = v - this.inv[o + 1];
		return this.spOf(q, this.inv[o + 2] * du + this.inv[o + 3] * dv, this.inv[o + 4] * du + this.inv[o + 5] * dv);
	}
	// A flat point kept on the piece: itself, or the nearest place on the nearest triangle (a handle
	// whose point lies past the piece's edge, to stay where it can be seen and grabbed).
	spOnPiece(u, v) {
		let q = this.find(u, v);
		if (q >= 0) return this.spOf(q);
		q = this.nearest(u, v);
		if (q < 0) return null;
		const o = q * 6, du = u - this.inv[o], dv = v - this.inv[o + 1];
		let w1 = this.inv[o + 2] * du + this.inv[o + 3] * dv, w2 = this.inv[o + 4] * du + this.inv[o + 5] * dv, w0 = 1 - w1 - w2;
		w0 = Math.max(w0, 0); w1 = Math.max(w1, 0); w2 = Math.max(w2, 0);
		const s = w0 + w1 + w2 || 1;
		return this.spOf(q, w1 / s, w2 / s);
	}
	nearest(u, v) {
		const { nx, ny, cw, x0, y0, start, list, inv, piece: { I }, uv } = this;
		const ci = Math.max(0, Math.min(nx - 1, Math.floor((u - x0) / cw))), cj = Math.max(0, Math.min(ny - 1, Math.floor((v - y0) / cw)));
		let best = -1, bd = Infinity;
		for (let r = 0, most = Math.max(nx, ny); r <= most; r++) {
			if (best >= 0 && (r - 1) * cw > Math.sqrt(bd)) break;
			for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) {
				if ((Math.abs(i - ci) !== r && Math.abs(j - cj) !== r) || i < 0 || j < 0 || i >= nx || j >= ny) continue;
				for (let k = start[j * nx + i], e = start[j * nx + i + 1]; k < e; k++) {
					const q = list[k];
					if (Number.isNaN(inv[q * 6])) continue;
					const mx = (uv[I[q * 3] * 2] + uv[I[q * 3 + 1] * 2] + uv[I[q * 3 + 2] * 2]) / 3 - u, my = (uv[I[q * 3] * 2 + 1] + uv[I[q * 3 + 1] * 2 + 1] + uv[I[q * 3 + 2] * 2 + 1]) / 3 - v, d = mx * mx + my * my;
					if (d < bd) { bd = d; best = q; }
				}
			}
		}
		return best;
	}
	// A surface point as a flat point, or null when it is not on this piece. -> [u, v]
	uvOf(sp) {
		const t = locate(this.arr, this.surf, sp);
		if (t < 0 || this.arr.cellOf[t] !== this.cell) return null;
		if (!this.triIndex) { this.triIndex = new Map(); for (let q = 0; q < this.n; q++) this.triIndex.set(this.tris[q], q); }
		const q = this.triIndex.get(t);
		if (q === undefined) return null;
		const I = this.piece.I, P = this.piece.P, p = this.surf.pos(sp), a = I[q * 3], b = I[q * 3 + 1], c = I[q * 3 + 2];
		const e1 = [P[b * 3] - P[a * 3], P[b * 3 + 1] - P[a * 3 + 1], P[b * 3 + 2] - P[a * 3 + 2]], e2 = [P[c * 3] - P[a * 3], P[c * 3 + 1] - P[a * 3 + 1], P[c * 3 + 2] - P[a * 3 + 2]], d = [p.x - P[a * 3], p.y - P[a * 3 + 1], p.z - P[a * 3 + 2]];
		const dot = (x, y) => x[0] * y[0] + x[1] * y[1] + x[2] * y[2], d00 = dot(e1, e1), d01 = dot(e1, e2), d11 = dot(e2, e2), d20 = dot(d, e1), d21 = dot(d, e2), den = d00 * d11 - d01 * d01 || 1e-20;
		const w1 = (d11 * d20 - d01 * d21) / den, w2 = (d00 * d21 - d01 * d20) / den, w0 = 1 - w1 - w2, uv = this.uv;
		return [w0 * uv[a * 2] + w1 * uv[b * 2] + w2 * uv[c * 2], w0 * uv[a * 2 + 1] + w1 * uv[b * 2 + 1] + w2 * uv[c * 2 + 1]];
	}

	// Distance on the flat cloth to the piece's nearest edge (seams and openings alike), metres. A raster
	// holding, per node, the exact distance to the closest boundary edge (found by sweeping the closest
	// edge across the raster), read bilinearly; built when first asked for.
	edgeAt(u, v) {
		if (!this.D) this.buildEdges();
		const { D, ex, ey, er, dx0, dy0 } = this;
		let fx = (u - dx0) / er, fy = (v - dy0) / er;
		fx = fx < 0 ? 0 : fx > ex - 1.001 ? ex - 1.001 : fx; fy = fy < 0 ? 0 : fy > ey - 1.001 ? ey - 1.001 : fy;
		const i = Math.floor(fx), j = Math.floor(fy), a = fx - i, b = fy - j, q = j * ex + i;
		return (D[q] * (1 - a) + D[q + 1] * a) * (1 - b) + (D[q + ex] * (1 - a) + D[q + ex + 1] * a) * b;
	}
	buildEdges() {
		const { n, piece: { I }, uv } = this, nv = uv.length / 2, once = new Map();
		for (let q = 0; q < n; q++) for (let k = 0; k < 3; k++) {
			const a = I[q * 3 + k], b = I[q * 3 + (k + 1) % 3], key = a < b ? a * nv + b : b * nv + a;
			once.set(key, (once.get(key) ?? 0) + 1);
		}
		const seg = [];
		for (const [key, c] of once) if (c === 1) { const a = Math.floor(key / nv), b = key % nv; seg.push(uv[a * 2], uv[a * 2 + 1], uv[b * 2], uv[b * 2 + 1]); }
		const S = this.edgeSegs = Float32Array.from(seg), ns = S.length / 4, er = this.er = Math.max(0.003, Math.max(this.x1 - this.x0, this.y1 - this.y0) / 400);
		const m = er * 4, dx0 = this.dx0 = this.x0 - m, dy0 = this.dy0 = this.y0 - m, ex = this.ex = Math.ceil((this.x1 - this.x0 + 2 * m) / er) + 2, ey = this.ey = Math.ceil((this.y1 - this.y0 + 2 * m) / er) + 2;
		const D = this.D = new Float32Array(ex * ey).fill(Infinity), near = new Int32Array(ex * ey).fill(-1);
		const dist = (s, x, y) => {
			const o = s * 4, ax = S[o], ay = S[o + 1], bx = S[o + 2] - ax, by = S[o + 3] - ay, l2 = bx * bx + by * by;
			let t = l2 ? ((x - ax) * bx + (y - ay) * by) / l2 : 0;
			t = t < 0 ? 0 : t > 1 ? 1 : t;
			return Math.hypot(x - ax - bx * t, y - ay - by * t);
		};
		const offer = (q, s) => { const x = dx0 + (q % ex) * er, y = dy0 + Math.floor(q / ex) * er, d = dist(s, x, y); if (d < D[q]) { D[q] = d; near[q] = s; } };
		// seeds: the nodes round each boundary edge
		for (let s = 0; s < ns; s++) {
			const o = s * 4, steps = Math.ceil(Math.hypot(S[o + 2] - S[o], S[o + 3] - S[o + 1]) / er) + 1;
			for (let k = 0; k <= steps; k++) {
				const x = S[o] + ((S[o + 2] - S[o]) * k) / steps, y = S[o + 1] + ((S[o + 3] - S[o + 1]) * k) / steps, i = Math.round((x - dx0) / er), j = Math.round((y - dy0) / er);
				if (i >= 0 && j >= 0 && i < ex && j < ey) offer(j * ex + i, s);
			}
		}
		// two sweeps pass each node's closest edge on to its neighbours
		const pass = (q, ...nbr) => { for (const p of nbr) if (near[p] >= 0 && near[p] !== near[q]) offer(q, near[p]); };
		for (let j = 1; j < ey - 1; j++) {
			for (let i = 1; i < ex - 1; i++) { const q = j * ex + i; pass(q, q - 1, q - ex, q - ex - 1, q - ex + 1); }
			for (let i = ex - 2; i >= 1; i--) { const q = j * ex + i; pass(q, q + 1); }
		}
		for (let j = ey - 2; j >= 1; j--) {
			for (let i = ex - 2; i >= 1; i--) { const q = j * ex + i; pass(q, q + 1, q + ex, q + ex + 1, q + ex - 1); }
			for (let i = 1; i < ex - 1; i++) { const q = j * ex + i; pass(q, q - 1); }
		}
		for (let q = 0; q < D.length; q++) if (D[q] === Infinity) D[q] = 0;
	}
}

// The mirror image of many surface points in a hurry. The same answer as curves/points.js mirrorSP
// (keep the two in step: test/patterns.test.js holds them together), without searching the whole body
// for each: the mirrored point is near the mirror face of its face, or of a neighbouring face.
const mirrorFaces = new WeakMap();
export function mirrorFast(S, sp) {
	let M = mirrorFaces.get(S);
	if (!M) mirrorFaces.set(S, M = new Int32Array(S.F).fill(-1));
	const idx = S.idx, P = S.P, f = sp.f;
	const i0 = idx[f * 3] * 3, i1 = idx[f * 3 + 1] * 3, i2 = idx[f * 3 + 2] * 3, b0 = sp.b0, b1 = sp.b1, b2 = sp.b2;
	const x = -(b0 * P[i0] + b1 * P[i1] + b2 * P[i2]), y = b0 * P[i0 + 1] + b1 * P[i1 + 1] + b2 * P[i2 + 1], z = b0 * P[i0 + 2] + b1 * P[i1 + 2] + b2 * P[i2 + 2];
	let g = M[f];
	if (g < 0) for (let e = 0; e < 3 && g < 0; e++) { const n = S.faceAdj[f * 3 + e]; if (n >= 0) g = M[n]; }
	const out = { f: -1, b0: 0, b1: 0, b2: 0 };
	if (g >= 0) {
		// walk from there towards the point, across the edge opposite the most negative corner
		for (let step = 0; step < 12; step++) {
			const a = idx[g * 3] * 3, b = idx[g * 3 + 1] * 3, c = idx[g * 3 + 2] * 3;
			const e1x = P[b] - P[a], e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2], e2x = P[c] - P[a], e2y = P[c + 1] - P[a + 1], e2z = P[c + 2] - P[a + 2], dx = x - P[a], dy = y - P[a + 1], dz = z - P[a + 2];
			const d00 = e1x * e1x + e1y * e1y + e1z * e1z, d01 = e1x * e2x + e1y * e2y + e1z * e2z, d11 = e2x * e2x + e2y * e2y + e2z * e2z, d20 = dx * e1x + dy * e1y + dz * e1z, d21 = dx * e2x + dy * e2y + dz * e2z, den = d00 * d11 - d01 * d01 || 1e-30;
			const w1 = (d11 * d20 - d01 * d21) / den, w2 = (d00 * d21 - d01 * d20) / den, w0 = 1 - w1 - w2;
			const worst = w0 < w1 ? (w0 < w2 ? 0 : 2) : (w1 < w2 ? 1 : 2), low = worst === 0 ? w0 : worst === 1 ? w1 : w2;
			if (low >= -1e-3) {
				const c0 = w0 < 0 ? 0 : w0, c1 = w1 < 0 ? 0 : w1, c2 = w2 < 0 ? 0 : w2, s = c0 + c1 + c2 || 1;
				M[f] = g;
				out.f = g; out.b0 = c0 / s; out.b1 = c1 / s; out.b2 = c2 / s;
				return out;
			}
			// edge e runs from corner e to corner e + 1, so the edge opposite corner k is k + 1
			const next = S.faceAdj[g * 3 + (worst + 1) % 3];
			if (next < 0) break;
			g = next;
		}
	}
	const r = S.closest(_p.set(x, y, z), out);
	M[f] = r.f;
	return { f: r.f, b0: r.b0, b1: r.b1, b2: r.b2 };
}
