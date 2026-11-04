// A fitted garment's piece as flat cloth (garment/fitted.js, render/fitted.js): what stones/cloth.js ClothPiece is for a drawn piece,
// so stone patterns (stones/pattern.js) and their handles (stones/handles.js) work on a fitted garment unchanged. Its flat shape is
// the drafted pattern piece itself (the fitted file's cells: uv in metres, triangles), the front and back each one whole piece (the
// two halves joined at the fold), a sleeve one of the pair. Origin at the mean of its points and grain up +v, as a drawn piece's.
// Each stone it lays also carries `fit`: the whole-garment points of its fitted triangle and its weights, so the stone view draws it
// on the fitted fabric as the re-fit placed it (render/fitted.js frameAt), not on the body under it.
// The reference shape (posOf, edge keep-out, angles) is each point carried by its surface coordinates onto the reference surface.
import * as THREE from 'three';
import { ClothPiece } from './cloth.js';

const _p = new THREE.Vector3();

export class FittedCloth {
	// data: the fitted file; cells: the cells (data.cells entries) that make this piece; surf: the reference surface (engine.surf)
	constructor(data, cells, surf, key) {
		this.surf = surf; this.cell = key; this.data = data;
		const nv = cells.reduce((s, c) => s + c.uv.length / 2, 0), nt = cells.reduce((s, c) => s + c.I.length / 3, 0);
		const uv = this.uv = new Float32Array(nv * 2), I = new Uint32Array(nt * 3), P = new Float32Array(nv * 3), cid = this.cid = new Int32Array(nv);
		let vo = 0, to = 0;
		const SP = surf.P;
		for (const c of cells) {
			const m = c.uv.length / 2;
			uv.set(c.uv, vo * 2);
			for (let t = 0; t < c.I.length; t++) I[to * 3 + t] = c.I[t] + vo;
			for (let l = 0; l < m; l++) {
				cid[vo + l] = c.cid[l];
				for (let k = 0; k < 3; k++) { let x = 0; for (let j = 0; j < 3; j++) x += c.hostW[l * 3 + j] * SP[c.hostI[l * 3 + j] * 3 + k]; P[(vo + l) * 3 + k] = x; }
			}
			vo += m; to += c.I.length / 3;
		}
		// origin at the mean of its points, as garment/flatten.js lays a drawn piece
		let mu = 0, mv = 0;
		for (let l = 0; l < nv; l++) { mu += uv[l * 2]; mv += uv[l * 2 + 1]; }
		mu /= nv || 1; mv /= nv || 1;
		for (let l = 0; l < nv; l++) { uv[l * 2] -= mu; uv[l * 2 + 1] -= mv; }
		this.shift = [mu, mv]; // flat metres of the fitted file's own frame at this piece's origin
		this.piece = { I, P };
		this.n = nt;
		// per triangle: flat inverse and the flat-to-surface-frame Jacobian (ClothPiece's, with the triangle's own normal)
		this.inv = new Float64Array(nt * 6); this.jac = new Float32Array(nt * 4);
		let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, area = 0;
		for (let q = 0; q < nt; q++) {
			const i0 = I[q * 3], i1 = I[q * 3 + 1], i2 = I[q * 3 + 2];
			const u0 = uv[i0 * 2], v0 = uv[i0 * 2 + 1], du1 = uv[i1 * 2] - u0, dv1 = uv[i1 * 2 + 1] - v0, du2 = uv[i2 * 2] - u0, dv2 = uv[i2 * 2 + 1] - v0, det = du1 * dv2 - du2 * dv1;
			x0 = Math.min(x0, u0, u0 + du1, u0 + du2); x1 = Math.max(x1, u0, u0 + du1, u0 + du2);
			y0 = Math.min(y0, v0, v0 + dv1, v0 + dv2); y1 = Math.max(y1, v0, v0 + dv1, v0 + dv2);
			area += Math.abs(det) / 2;
			const o = q * 6;
			if (Math.abs(det) < 1e-14) { this.inv[o] = NaN; continue; }
			this.inv[o] = u0; this.inv[o + 1] = v0; this.inv[o + 2] = dv2 / det; this.inv[o + 3] = -du2 / det; this.inv[o + 4] = -dv1 / det; this.inv[o + 5] = du1 / det;
			const ex = P[i1 * 3] - P[i0 * 3], ey = P[i1 * 3 + 1] - P[i0 * 3 + 1], ez = P[i1 * 3 + 2] - P[i0 * 3 + 2], gx = P[i2 * 3] - P[i0 * 3], gy = P[i2 * 3 + 1] - P[i0 * 3 + 1], gz = P[i2 * 3 + 2] - P[i0 * 3 + 2];
			const tux = (dv2 * ex - dv1 * gx) / det, tuy = (dv2 * ey - dv1 * gy) / det, tuz = (dv2 * ez - dv1 * gz) / det;
			const tvx = (du1 * gx - du2 * ex) / det, tvy = (du1 * gy - du2 * ey) / det, tvz = (du1 * gz - du2 * ez) / det;
			let nx = ey * gz - ez * gy, ny = ez * gx - ex * gz, nz = ex * gy - ey * gx;
			const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
			if (det < 0) { nx = -nx; ny = -ny; nz = -nz; } // the outward side whichever way the flat piece is wound
			let t0x = nz, t0z = -nx;
			const tl = Math.hypot(t0x, t0z);
			if (tl < 1e-6) { t0x = 1; t0z = 0; } else { t0x /= tl; t0z /= tl; }
			const b0x = ny * t0z, b0y = nz * t0x - nx * t0z, b0z = -ny * t0x, j = q * 4;
			this.jac[j] = tux * t0x + tuz * t0z; this.jac[j + 1] = tvx * t0x + tvz * t0z;
			this.jac[j + 2] = tux * b0x + tuy * b0y + tuz * b0z; this.jac[j + 3] = tvx * b0x + tvy * b0y + tvz * b0z;
		}
		this.x0 = x0; this.x1 = x1; this.y0 = y0; this.y1 = y1; this.area = area;
		this.buildGrid(nt ? Math.sqrt(area / nt) * 1.5 : 1);
		this.idsAt = new Map(); // whole-garment point -> this piece's point (for a stone's flat place)
		for (let l = 0; l < nv; l++) if (!this.idsAt.has(cid[l])) this.idsAt.set(cid[l], l);
	}

	// The surface point at triangle q's weights: the reference position's nearest point on the reference surface.
	spOf(q, w1 = this.w1, w2 = this.w2) {
		const r = this.surf.closest(this.posOf(q, _p, w1, w2), {});
		return { f: r.f, b0: r.b0, b1: r.b1, b2: r.b2 };
	}

	// Where on the fitted garment: its triangle's whole-garment points and weights (render/fitted.js frameAt).
	fitOf(q, w1 = this.w1, w2 = this.w2) {
		const I = this.piece.I, cid = this.cid;
		return { a: cid[I[q * 3]], b: cid[I[q * 3 + 1]], c: cid[I[q * 3 + 2]], w0: 1 - w1 - w2, w1, w2 };
	}

	// A stone's flat place from its fit, or null when it is not on this piece.
	uvOfFit(fit) {
		const A = this.idsAt.get(fit.a), B = this.idsAt.get(fit.b), C = this.idsAt.get(fit.c), uv = this.uv;
		if (A === undefined || B === undefined || C === undefined) return null;
		return [fit.w0 * uv[A * 2] + fit.w1 * uv[B * 2] + fit.w2 * uv[C * 2], fit.w0 * uv[A * 2 + 1] + fit.w1 * uv[B * 2 + 1] + fit.w2 * uv[C * 2 + 1]];
	}

	// A surface point as a flat point (the 3D handles' pointer): the triangle whose reference shape lies nearest, by a grid of
	// triangle middles, its weights by projection; null when the point is not near this piece.
	uvOf(sp) {
		if (!this.near3) this.buildNear3();
		const p = this.surf.pos(sp), { g3, c3 } = this, k = (x) => Math.floor(x / c3);
		let best = -1, bd = Infinity;
		for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let l = -1; l <= 1; l++) {
			for (const q of g3.get(`${k(p.x) + i},${k(p.y) + j},${k(p.z) + l}`) ?? []) {
				const m = this.mid3, d = (m[q * 3] - p.x) ** 2 + (m[q * 3 + 1] - p.y) ** 2 + (m[q * 3 + 2] - p.z) ** 2;
				if (d < bd) { bd = d; best = q; }
			}
		}
		if (best < 0 || bd > (2 * c3) ** 2) return null;
		const I = this.piece.I, P = this.piece.P, a = I[best * 3], b = I[best * 3 + 1], c = I[best * 3 + 2];
		const e1 = [P[b * 3] - P[a * 3], P[b * 3 + 1] - P[a * 3 + 1], P[b * 3 + 2] - P[a * 3 + 2]], e2 = [P[c * 3] - P[a * 3], P[c * 3 + 1] - P[a * 3 + 1], P[c * 3 + 2] - P[a * 3 + 2]], d = [p.x - P[a * 3], p.y - P[a * 3 + 1], p.z - P[a * 3 + 2]];
		const dot = (x, y) => x[0] * y[0] + x[1] * y[1] + x[2] * y[2], d00 = dot(e1, e1), d01 = dot(e1, e2), d11 = dot(e2, e2), d20 = dot(d, e1), d21 = dot(d, e2), den = d00 * d11 - d01 * d01 || 1e-20;
		const w1 = (d11 * d20 - d01 * d21) / den, w2 = (d00 * d21 - d01 * d20) / den, w0 = 1 - w1 - w2, uv = this.uv;
		return [w0 * uv[a * 2] + w1 * uv[b * 2] + w2 * uv[c * 2], w0 * uv[a * 2 + 1] + w1 * uv[b * 2 + 1] + w2 * uv[c * 2 + 1]];
	}
	buildNear3() {
		const I = this.piece.I, P = this.piece.P, n = this.n, mid = this.mid3 = new Float32Array(n * 3), c3 = this.c3 = 0.02, g = this.g3 = new Map();
		for (let q = 0; q < n; q++) {
			for (let k = 0; k < 3; k++) mid[q * 3 + k] = (P[I[q * 3] * 3 + k] + P[I[q * 3 + 1] * 3 + k] + P[I[q * 3 + 2] * 3 + k]) / 3;
			const key = `${Math.floor(mid[q * 3] / c3)},${Math.floor(mid[q * 3 + 1] / c3)},${Math.floor(mid[q * 3 + 2] / c3)}`;
			let l = g.get(key); if (!l) g.set(key, (l = [])); l.push(q);
		}
		this.near3 = true;
	}
}

// What a ClothPiece answers from its flat shape alone works the same here (they read inv, jac, uv, piece.I/P, the grid).
for (const k of ['buildGrid', 'find', 'posOf', 'angleOf', 'spAt', 'spOnPiece', 'nearest', 'edgeAt', 'buildEdges']) FittedCloth.prototype[k] = ClothPiece.prototype[k];
