// Stone generators: the trade's placements (rows along a line, fills, gradient scatters, contour
// rings coloured by depth, rays and fans, motifs, lattices, clusters) as live procedures over the
// design. Each returns stones { sp, angle, size (m), shape, stone (colour name), lift (m) } laid out
// on the reference garment surface, so a seam edit re-flows the stones that follow it.
// Spec: knowledge/engineering/architecture/design-document-model.md (stones), tool T9.
import * as THREE from 'three';
import { sizeOf, SHAPES } from './library.js';
import { projectNear } from '../curves/evaluate.js';
import { mirrorSP, resolvePoint } from '../curves/points.js';
import { locate } from '../garment/arrangement.js';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3(), _t = new THREE.Vector3();

export function rng(seed) { // mulberry32
	let s = seed | 0;
	return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------------------------------------------------------------------------------------------
// Paths: polylines of { p (reference position), sp } on the reference surface.

// The polyline of an evaluated curve offset across it by `offset` metres (+ = left of the curve's
// direction seen from outside), projected back onto the surface.
export function offsetPath(e, offset, surf) {
	const n = e.pts.length, out = [];
	for (let i = 0; i < n; i++) {
		const p = e.pts[i];
		if (!offset) { out.push({ p: p.clone(), sp: e.sps[i] }); continue; }
		const a = e.pts[Math.max(i - 1, 0)], b = e.pts[Math.min(i + 1, n - 1)];
		_t.subVectors(b, a).normalize();
		surf.faceNormal(e.sps[i].f, _n);
		const m = _a.crossVectors(_n, _t).normalize();
		const q = projectNear(surf, p.clone().addScaledVector(m, offset), e.sps[i].f, {});
		out.push({ p: surf.pos(q), sp: { f: q.f, b0: q.b0, b1: q.b1, b2: q.b2 } });
	}
	if (e.closed && out.length) out.push({ ...out[0] });
	return out;
}

// Place stones along a path. sizeAt(u) gives the diameter at fraction u of the length; spacing is
// (d_prev + d_next) / 2 * gap between centres. -> [{ sp, p, u, tangent }]
export function alongPath(path, sizeAt, gap, surf, { start = 0, end = 1 } = {}) {
	const cum = [0];
	for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + path[i].p.distanceTo(path[i - 1].p));
	const L = cum[cum.length - 1];
	if (L <= 0) return [];
	const out = [];
	let s = start * L + sizeAt(start) / 2, seg = 0;
	while (s <= end * L - sizeAt(end) / 2 * 0.5) {
		while (seg < path.length - 2 && cum[seg + 1] < s) seg++;
		const a = path[seg], b = path[seg + 1], w = (s - cum[seg]) / Math.max(cum[seg + 1] - cum[seg], 1e-9);
		const p = a.p.clone().lerp(b.p, w);
		const q = projectNear(surf, p, (w < 0.5 ? a : b).sp.f, {});
		out.push({ sp: { f: q.f, b0: q.b0, b1: q.b1, b2: q.b2 }, p: surf.pos(q), u: s / L, tangent: b.p.clone().sub(a.p).normalize() });
		const d = sizeAt(s / L);
		s += d * gap;
	}
	return out;
}

// ---------------------------------------------------------------------------------------------
// Regions: cells of a layer's arrangement (a panel, or the inside of a closed line).

// -> { tris: [arrangement triangle ids], arr, cells: Set, area, sample(rand), contains(sp) }
export function panelRegion(ctx, panelId) {
	const p = ctx.doc.panels.find((x) => x.id === panelId);
	if (!p) throw new Error('No panel ' + panelId);
	const g = ctx.garment(p.layer ?? 'L0');
	const pi = ctx.doc.panels.indexOf(p);
	const cells = new Set();
	for (let c = 0; c < g.arr.cells.length; c++) if (g.cellPanel[c] === pi) cells.add(c);
	return regionOf(ctx, g, cells);
}
function regionOf(ctx, g, cells) {
	const arr = g.arr, tris = [];
	for (const c of cells) for (const t of arr.cells[c].tris) tris.push(t);
	const VP = arr.VP, cdf = new Float64Array(tris.length);
	let area = 0;
	tris.forEach((t, i) => {
		const a = arr.tris[t * 3] * 3, b = arr.tris[t * 3 + 1] * 3, c = arr.tris[t * 3 + 2] * 3;
		_a.set(VP[b] - VP[a], VP[b + 1] - VP[a + 1], VP[b + 2] - VP[a + 2]); _b.set(VP[c] - VP[a], VP[c + 1] - VP[a + 1], VP[c + 2] - VP[a + 2]);
		area += _a.cross(_b).length() / 2; cdf[i] = area;
	});
	const surf = ctx.surf;
	return {
		tris, arr, g, cells, area,
		sample(rand) {
			const r = rand() * area;
			let lo = 0, hi = tris.length - 1;
			while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < r) lo = m + 1; else hi = m; }
			const t = tris[lo];
			let u = rand(), v = rand();
			if (u + v > 1) { u = 1 - u; v = 1 - v; }
			const a = arr.tris[t * 3] * 3, b = arr.tris[t * 3 + 1] * 3, c = arr.tris[t * 3 + 2] * 3;
			const p = new THREE.Vector3(VP[a] + u * (VP[b] - VP[a]) + v * (VP[c] - VP[a]), VP[a + 1] + u * (VP[b + 1] - VP[a + 1]) + v * (VP[c + 1] - VP[a + 1]), VP[a + 2] + u * (VP[b + 2] - VP[a + 2]) + v * (VP[c + 2] - VP[a + 2]));
			const q = projectNear(surf, p, arr.triFace[t], {});
			return { sp: { f: q.f, b0: q.b0, b1: q.b1, b2: q.b2 }, p };
		},
		contains(sp) { const t = locate(arr, surf, sp); return t >= 0 && cells.has(arr.cellOf[t]); },
	};
}

// Distance (geodesic along mesh edges) from a region's boundary for every arrangement vertex in it.
function boundaryDistance(region) {
	const { arr, tris, cells } = region, VP = arr.VP, nV = arr.nV;
	const inRegion = new Uint8Array(nV), count = new Map(), adj = new Map();
	const key = (a, b) => (a < b ? a * nV + b : b * nV + a);
	for (const t of tris) for (let e = 0; e < 3; e++) {
		const a = arr.tris[t * 3 + e], b = arr.tris[t * 3 + (e + 1) % 3];
		inRegion[a] = inRegion[b] = 1;
		const k = key(a, b); count.set(k, (count.get(k) ?? 0) + 1);
		if (!adj.has(a)) adj.set(a, []); adj.get(a).push(b);
		if (!adj.has(b)) adj.set(b, []); adj.get(b).push(a);
	}
	const dist = new Map(), heap = [];
	for (const [k, c] of count) if (c === 1) for (const v of [Math.floor(k / nV), k % nV]) { if (!dist.has(v)) { dist.set(v, 0); heap.push([0, v]); } }
	heap.sort((x, y) => x[0] - y[0]);
	const len = (a, b) => Math.hypot(VP[a * 3] - VP[b * 3], VP[a * 3 + 1] - VP[b * 3 + 1], VP[a * 3 + 2] - VP[b * 3 + 2]);
	// simple Dijkstra with a binary-insertion queue (regions are a few thousand vertices)
	while (heap.length) {
		const [d, v] = heap.shift();
		if (d > (dist.get(v) ?? Infinity)) continue;
		for (const w of adj.get(v) ?? []) {
			const nd = d + len(v, w);
			if (nd < (dist.get(w) ?? Infinity)) {
				dist.set(w, nd);
				let lo = 0, hi = heap.length;
				while (lo < hi) { const m = (lo + hi) >> 1; if (heap[m][0] < nd) lo = m + 1; else hi = m; }
				heap.splice(lo, 0, [nd, w]);
			}
		}
	}
	return dist;
}

// Iso-lines of the boundary distance at `level` as polylines of reference positions.
function isoLines(region, dist, level) {
	const { arr, tris } = region, VP = arr.VP, segs = [];
	const P = (v) => new THREE.Vector3(VP[v * 3], VP[v * 3 + 1], VP[v * 3 + 2]);
	for (const t of tris) {
		const vs = [arr.tris[t * 3], arr.tris[t * 3 + 1], arr.tris[t * 3 + 2]], ds = vs.map((v) => dist.get(v) ?? 0);
		const pts = [];
		for (let e = 0; e < 3; e++) {
			const a = e, b = (e + 1) % 3;
			if ((ds[a] < level) !== (ds[b] < level)) { const w = (level - ds[a]) / (ds[b] - ds[a]); pts.push(P(vs[a]).lerp(P(vs[b]), w)); }
		}
		if (pts.length === 2) segs.push(pts);
	}
	return chain(segs);
}
function chain(segs) {
	const key = (p) => p.x.toFixed(5) + ',' + p.y.toFixed(5) + ',' + p.z.toFixed(5);
	const ends = new Map();
	segs.forEach((s, i) => { for (const k of [key(s[0]), key(s[1])]) { const l = ends.get(k); if (l) l.push(i); else ends.set(k, [i]); } });
	const used = new Set(), out = [];
	for (let i = 0; i < segs.length; i++) {
		if (used.has(i)) continue;
		used.add(i);
		const line = [segs[i][0], segs[i][1]];
		for (const dir of [1, 0]) {
			for (;;) {
				const endP = dir ? line[line.length - 1] : line[0], k = key(endP);
				const nxt = (ends.get(k) ?? []).find((j) => !used.has(j));
				if (nxt === undefined) break;
				used.add(nxt);
				const s = segs[nxt], other = key(s[0]) === k ? s[1] : s[0];
				if (dir) line.push(other); else line.unshift(other);
			}
		}
		out.push(line);
	}
	return out;
}

// ---------------------------------------------------------------------------------------------

// Stone spec from a generator: a palette [{ stone, weight }] or a single stone name.
function picker(gen, rand) {
	const pal = gen.palette?.length ? gen.palette : [{ stone: gen.stone ?? 'Crystal AB', weight: 1 }];
	const total = pal.reduce((a, p) => a + (p.weight ?? 1), 0);
	return () => { let r = rand() * total; for (const p of pal) { r -= p.weight ?? 1; if (r <= 0) return p.stone; } return pal[pal.length - 1].stone; };
}
// Ramp over [0, 1]: [a, b, c...] interpolated (sizes) or stepped (colours).
function ramp(list, u) { if (!list?.length) return null; const i = Math.min(list.length - 1, Math.floor(u * list.length)); return list[i]; }
function lerpSize(from, to, u) { return sizeOf(from) + (sizeOf(to) - sizeOf(from)) * u; }

// Angle of a direction in the surface frame at sp: 0 along the body's horizontal tangent.
function angleAt(ctx, sp, dir) {
	const n = ctx.surf.faceNormal(sp.f, new THREE.Vector3());
	const t0 = new THREE.Vector3(0, 1, 0).cross(n).normalize(); // around the body
	if (t0.lengthSq() < 1e-6) t0.set(1, 0, 0);
	const b0 = n.clone().cross(t0);
	return Math.atan2(dir.dot(b0), dir.dot(t0));
}

// A straight walk on the body from sp: each step goes in dir(p, n) (a direction, re-projected into
// the tangent plane), so the line follows the surface. -> path [{ p, sp }]
function march(ctx, sp, dir, L, step = 0.0015) {
	const path = [];
	let f = sp.f, prev = ctx.surf.pos(sp);
	path.push({ p: prev.clone(), sp: { f: sp.f, b0: sp.b0, b1: sp.b1, b2: sp.b2 } });
	for (let s = step; s <= L + 1e-9; s += step) {
		const n = ctx.surf.faceNormal(f, new THREE.Vector3()), d = dir(prev, n).clone();
		d.sub(n.clone().multiplyScalar(d.dot(n)));
		if (d.lengthSq() < 1e-12) break;
		const q = projectNear(ctx.surf, prev.clone().addScaledVector(d.normalize(), step), f, {});
		const p = ctx.surf.pos(q);
		path.push({ p, sp: { f: q.f, b0: q.b0, b1: q.b1, b2: q.b2 } });
		prev = p; f = q.f;
	}
	return path;
}

// Text as a mask: canvas pixels of the glyphs (white on transparent), for lettering in stones.
function textMask(text, font, weight) {
	const lines = String(text).split('\n'), px = 200, cv = document.createElement('canvas'), x = cv.getContext('2d');
	const css = `${weight ?? 'normal'} ${px}px ${font ? JSON.stringify(font) + ', ' : ''}cursive`;
	x.font = css;
	const w = Math.ceil(Math.max(...lines.map((l) => x.measureText(l).width))) + 40, lh = px * 1.2;
	cv.width = w; cv.height = Math.ceil(lh * lines.length + 40);
	x.font = css; x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.textAlign = 'center';
	lines.forEach((l, k) => x.fillText(l, w / 2, 20 + lh * (k + 0.5)));
	const d = x.getImageData(0, 0, cv.width, cv.height).data;
	return { w: cv.width, h: cv.height, px, a: (i, j) => (i < 0 || j < 0 || i >= cv.width || j >= cv.height ? 0 : d[(j * cv.width + i) * 4 + 3]) };
}

const GENERATORS = {
	// rows along a line (or a strap's middle): offset, several rows, graded sizes, ramps
	row(gen, ctx, rand) {
		const P = gen.params ?? {}, out = [], pick = picker(gen, rand);
		const sources = [];
		if (gen.on?.strap) {
			const s = ctx.doc.straps.find((x) => x.id === gen.on.strap);
			if (!s) throw new Error('No strap ' + gen.on.strap);
			for (const key of [s.path, s.path + '~m']) { const e = ctx.evaluated.get(key); if (e) sources.push({ e, lift: (ctx.strapHeight?.(s) ?? 0.004) }); }
		} else {
			const id = gen.on?.curve;
			if (!id) throw new Error('A row needs on: { curve } or on: { strap }');
			const own = ctx.evaluated.get(id);
			if (!own) throw new Error('No line ' + id);
			sources.push({ e: own, lift: 0 });
			const twin = ctx.evaluated.get(id + '~m');
			if (twin && gen.followMirror !== false) sources.push({ e: twin, lift: 0, mirrored: true });
		}
		const rows = P.rows ?? 1, sizes = (P.sizes ?? [P.size ?? 'ss16']).map(sizeOf), gap = P.gap ?? 1.15;
		const sides = P.side === 'both' ? [1, -1] : [P.side === 'right' ? -1 : 1];
		for (const src of sources) for (const sd of sides) for (let r = 0; r < rows; r++) {
			const d0 = sizes[r % sizes.length];
			let off = (P.offset ?? 0) + r * (P.rowGap ?? d0 * 1.2);
			if (src.mirrored) off = -off; // the mirror image runs the other way round
			const path = offsetPath(src.e, off * sd, ctx.surf);
			const sizeAt = P.sizeRamp ? (u) => lerpSize(P.sizeRamp[0], P.sizeRamp[1], u) : () => d0;
			const pts = alongPath(path, sizeAt, gap, ctx.surf, { start: P.t?.[0] ?? 0, end: P.t?.[1] ?? 1 });
			const shift = P.stagger && r % 2 ? 0.5 : 0;
			pts.forEach((q, i) => {
				if (shift && i === pts.length - 1) return;
				out.push({ sp: q.sp, size: sizeAt(q.u), stone: ramp(gen.colourRamp, q.u) ?? pick(), angle: angleAt(ctx, q.sp, q.tangent), lift: src.lift, u: q.u });
			});
		}
		return out;
	},

	// fill a panel: random pave (dart throwing) or contour rings parallel to the edge
	fill(gen, ctx, rand) {
		const P = gen.params ?? {}, pick = picker(gen, rand);
		const region = panelRegion(ctx, gen.on?.panel);
		if ((P.pattern ?? 'random') === 'contour') {
			const dist = boundaryDistance(region), out = [];
			const size = sizeOf(P.size ?? 'ss12'), rowGap = P.rowGap ?? size * 1.25, start = P.inset ?? size * 0.9;
			let maxD = 0; for (const d of dist.values()) maxD = Math.max(maxD, d);
			for (let k = 0, lev = start; lev < maxD; k++, lev += rowGap) {
				const colour = ramp(gen.colourRamp, maxD > start ? (lev - start) / (maxD - start) : 0);
				for (const line of isoLines(region, dist, lev)) {
					const path = line.map((p) => { const q = ctx.surf.closest(p); return { p, sp: { f: q.f, b0: q.b0, b1: q.b1, b2: q.b2 } }; });
					for (const q of alongPath(path, () => size, P.gap ?? 1.15, ctx.surf)) out.push({ sp: q.sp, size, stone: colour ?? pick(), angle: angleAt(ctx, q.sp, q.tangent), lift: 0 });
				}
				if (k > 400) break;
			}
			return out;
		}
		const sizes = (P.sizes ?? [{ size: P.size ?? 'ss12', weight: 1 }]).map((s) => (typeof s === 'object' ? { d: sizeOf(s.size), w: s.weight ?? 1 } : { d: sizeOf(s), w: 1 }));
		const tw = sizes.reduce((a, s) => a + s.w, 0);
		const sizePick = () => { let r = rand() * tw; for (const s of sizes) { r -= s.w; if (r <= 0) return s.d; } return sizes[0].d; };
		const density = P.density ?? 1;
		return dart(region, rand, Math.round((region.area / (Math.max(...sizes.map((s) => s.d)) ** 2)) * 4 * density) + 50, P.gap ?? 1.12, (q) => (rand() < density ? sizePick() : 0), pick, ctx);
	},

	// scatter whose density fades with distance from a line (a neckline, an edge, a seam) or a point
	scatter(gen, ctx, rand) {
		const P = gen.params ?? {}, pick = picker(gen, rand);
		const region = panelRegion(ctx, gen.on?.panel);
		let distTo;
		if (P.from?.curve) {
			const paths = [ctx.evaluated.get(P.from.curve), ctx.evaluated.get(P.from.curve + '~m')].filter(Boolean);
			const pts = paths.flatMap((e) => e.pts.filter((_, i) => i % 3 === 0));
			distTo = (p) => { let d = Infinity; for (const q of pts) d = Math.min(d, q.distanceToSquared(p)); return Math.sqrt(d); };
		} else if (P.from) {
			const c = ctx.surf.pos(resolvePoint(P.from, ctx));
			distTo = (p) => p.distanceTo(c);
		} else throw new Error('A scatter needs params.from: { curve } or a point');
		const near = P.near ?? 1, far = P.far ?? 0, span = P.distance ?? 0.15;
		const sizes = (P.sizes ?? [{ size: 'ss16', weight: 1 }, { size: 'ss10', weight: 2 }]).map((s) => (typeof s === 'object' ? { d: sizeOf(s.size), w: s.weight ?? 1 } : { d: sizeOf(s), w: 1 }));
		const tw = sizes.reduce((a, s) => a + s.w, 0);
		const maxD = Math.max(...sizes.map((s) => s.d));
		return dart(region, rand, Math.round((region.area / maxD ** 2) * 5) + 50, P.gap ?? 1.2, (q) => {
			const u = Math.min(distTo(q.p) / span, 1), rho = near + (far - near) * (P.curve === 'linear' ? u : u * u * (3 - 2 * u));
			if (rand() > rho) return 0;
			let r = rand() * tw; for (const s of sizes) { r -= s.w; if (r <= 0) return s.d; } return sizes[0].d;
		}, pick, ctx);
	},

	// rays from a point: count, lengths (cycled), sizes graded from the centre outwards
	rays(gen, ctx, rand) {
		const P = gen.params ?? {}, pick = picker(gen, rand), out = [];
		const csp = resolvePoint(gen.at, ctx), c = ctx.surf.pos(csp), n = ctx.surf.faceNormal(csp.f, new THREE.Vector3());
		const t0 = new THREE.Vector3(0, 1, 0).cross(n).normalize(), b0 = n.clone().cross(t0);
		const count = P.count ?? 24, lens = P.lengths ?? [P.length ?? 0.1], a0 = P.angle ?? 0, spread = P.spread ?? Math.PI * 2;
		const from = P.sizeFrom ?? 'ss20', to = P.sizeTo ?? 'ss6', start = P.start ?? 0.006;
		if (P.centre !== false) out.push({ sp: csp, size: sizeOf(P.centreSize ?? from), stone: pick(), angle: 0, lift: 0 });
		for (let k = 0; k < count; k++) {
			const ang = a0 + (spread >= Math.PI * 2 - 1e-6 ? (k / count) * spread : (k / Math.max(count - 1, 1)) * spread - spread / 2);
			const dir = t0.clone().multiplyScalar(Math.cos(ang)).addScaledVector(b0, Math.sin(ang));
			const L = lens[k % lens.length], path = [];
			let f = csp.f, prev = c.clone();
			for (let s = 0; s <= L; s += 0.0015) {
				// march in the tangent plane of the previous point, re-projected (a straight line on the body)
				const q = projectNear(ctx.surf, prev.clone().addScaledVector(dir, s === 0 ? 0 : 0.0015), f, {});
				const p = ctx.surf.pos(q);
				const nn = ctx.surf.faceNormal(q.f, new THREE.Vector3());
				dir.sub(nn.clone().multiplyScalar(dir.dot(nn))).normalize();
				path.push({ p, sp: { f: q.f, b0: q.b0, b1: q.b1, b2: q.b2 } });
				prev = p; f = q.f;
			}
			const sizeAt = (u) => lerpSize(from, to, u);
			for (const q of alongPath(path, sizeAt, P.gap ?? 1.25, ctx.surf, { start: start / Math.max(L, 1e-6) })) out.push({ sp: q.sp, size: sizeAt(q.u), stone: ramp(gen.colourRamp, q.u) ?? pick(), angle: angleAt(ctx, q.sp, q.tangent), lift: 0 });
		}
		return out;
	},

	// a motif (circle, heart, star, diamond, flower, or an SVG-like polyline in millimetres) laid on
	// the body around a point: its outline as a row of stones, optionally filled
	motif(gen, ctx, rand) {
		const P = gen.params ?? {}, pick = picker(gen, rand), out = [];
		const csp = resolvePoint(gen.at, ctx), c = ctx.surf.pos(csp), n = ctx.surf.faceNormal(csp.f, new THREE.Vector3());
		const t0 = new THREE.Vector3(0, 1, 0).cross(n).normalize(), b0 = n.clone().cross(t0);
		const R = (P.size ?? 0.05) / 2, rot = P.angle ?? 0;
		const shape2d = motifOutline(P.shape ?? 'heart', P.points);
		const to3 = ([x, y]) => {
			const xr = (x * Math.cos(rot) - y * Math.sin(rot)) * R, yr = (x * Math.sin(rot) + y * Math.cos(rot)) * R;
			const q = projectNear(ctx.surf, c.clone().addScaledVector(t0, xr).addScaledVector(b0, yr), csp.f, {});
			return { p: ctx.surf.pos(q), sp: { f: q.f, b0: q.b0, b1: q.b1, b2: q.b2 } };
		};
		const size = sizeOf(P.stoneSize ?? 'ss10');
		if ((P.mode ?? 'outline') !== 'fill') {
			const path = [...shape2d, shape2d[0]].map(to3);
			for (const q of alongPath(path, () => size, P.gap ?? 1.15, ctx.surf)) out.push({ sp: q.sp, size, stone: pick(), angle: angleAt(ctx, q.sp, q.tangent), lift: 0 });
		}
		if ((P.mode ?? 'outline') !== 'outline') {
			const fillSize = sizeOf(P.fillSize ?? P.stoneSize ?? 'ss8');
			const step = fillSize * (P.gap ?? 1.15) / R, inset = (P.mode === 'both' ? size * 1.1 : fillSize * 0.5) / R;
			for (let y = -1.2; y <= 1.2; y += step * 0.866) for (let x = -1.2 + ((Math.round(y / (step * 0.866)) & 1) ? step / 2 : 0); x <= 1.2; x += step) {
				if (!insidePoly([x, y], shape2d) || distPoly([x, y], shape2d) < inset) continue;
				const q = to3([x, y]);
				out.push({ sp: q.sp, size: fillSize, stone: gen.fillStone ?? pick(), angle: 0, lift: 0 });
			}
		}
		return out;
	},

	// fringe: strands of stones hanging from a line (a waistband fringe, crystal rain): one strand
	// every `spacing` metres along the line, `lengths` cycled (or random between min and max),
	// sizes graded from `sizeFrom` at the line to `sizeTo` at the tip; `direction` 'down' (straight
	// down the body) or 'away' (square off the line, on `side`)
	fringe(gen, ctx, rand) {
		const P = gen.params ?? {}, pick = picker(gen, rand), out = [];
		const id = gen.on?.curve;
		if (!id) throw new Error('A fringe needs on: { curve }');
		const srcs = [ctx.evaluated.get(id), gen.followMirror !== false ? ctx.evaluated.get(id + '~m') : null].filter(Boolean);
		if (!srcs.length) throw new Error('No line ' + id);
		const spacing = P.spacing ?? 0.008, lens = P.lengths ?? [0.02, 0.035], from = P.sizeFrom ?? P.size ?? 'ss10', to = P.sizeTo ?? P.size ?? 'ss6';
		const down = new THREE.Vector3(0, -1, 0), side = P.side === 'right' ? -1 : 1;
		srcs.forEach((e, si) => {
			const starts = alongPath(offsetPath(e, P.offset ?? 0, ctx.surf), () => spacing, 1, ctx.surf, { start: P.t?.[0] ?? 0, end: P.t?.[1] ?? 1 });
			starts.forEach((s0, k) => {
				const L = P.random ? (P.min ?? 0.02) + rand() * ((P.max ?? 0.08) - (P.min ?? 0.02)) : lens[k % lens.length];
				const away = (p, n) => n.clone().cross(s0.tangent).multiplyScalar(si ? -side : side);
				const path = march(ctx, s0.sp, P.direction === 'away' ? away : () => down, L);
				const sizeAt = (u) => lerpSize(from, to, u);
				for (const q of alongPath(path, sizeAt, P.gap ?? 1.3, ctx.surf)) out.push({ sp: q.sp, size: sizeAt(q.u), stone: ramp(gen.colourRamp, q.u) ?? pick(), angle: angleAt(ctx, q.sp, q.tangent), lift: 0 });
			});
		});
		return out;
	},

	// lettering: text in any installed font laid out in stones around a point: `mode` 'fill' (the
	// strokes filled, which gives a single line of stones for a thin script), 'outline' or 'both';
	// `height` is the letter height in metres
	lettering(gen, ctx, rand) {
		const P = gen.params ?? {}, pick = picker(gen, rand), out = [];
		if (typeof document === 'undefined') throw new Error('Lettering needs a browser (fonts)');
		const csp = resolvePoint(gen.at, ctx), c = ctx.surf.pos(csp), n = ctx.surf.faceNormal(csp.f, new THREE.Vector3());
		const t0 = new THREE.Vector3(0, 1, 0).cross(n).normalize(), b0 = n.clone().cross(t0);
		const M = textMask(P.text ?? 'Name', P.font, P.weight), k = (P.height ?? 0.03) / M.px, rot = P.angle ?? 0;
		const size = sizeOf(P.stoneSize ?? 'ss6'), gapPx = (size * (P.gap ?? 1.2)) / k;
		const to3 = (i, j) => {
			const x = (i - M.w / 2) * k, y = (M.h / 2 - j) * k;
			const xr = x * Math.cos(rot) - y * Math.sin(rot), yr = x * Math.sin(rot) + y * Math.cos(rot);
			const q = projectNear(ctx.surf, c.clone().addScaledVector(t0, xr).addScaledVector(b0, yr), csp.f, {});
			return { f: q.f, b0: q.b0, b1: q.b1, b2: q.b2 };
		};
		// candidate pixels (inside the strokes, or on their edge), shuffled, then kept a stone apart
		const mode = P.mode ?? 'fill', cand = [], st = Math.max(1, Math.floor(gapPx / 4));
		for (let j = 0; j < M.h; j += st) for (let i = 0; i < M.w; i += st) {
			const inside = M.a(i, j) > 127;
			if (!inside) continue;
			const edge = M.a(i - st, j) <= 127 || M.a(i + st, j) <= 127 || M.a(i, j - st) <= 127 || M.a(i, j + st) <= 127;
			if (mode === 'fill' || (mode === 'outline' && edge) || mode === 'both') cand.push([i, j, edge]);
		}
		for (let i = cand.length - 1; i > 0; i--) { const r = Math.floor(rand() * (i + 1)); [cand[i], cand[r]] = [cand[r], cand[i]]; }
		if (mode === 'both') cand.sort((a, b) => b[2] - a[2]); // the outline first, then the inside
		const kept = [], cell = gapPx, grid = new Map();
		for (const [i, j] of cand) {
			const gx = Math.floor(i / cell), gy = Math.floor(j / cell);
			let ok = true;
			for (let dx = -1; dx <= 1 && ok; dx++) for (let dy = -1; dy <= 1 && ok; dy++) for (const [a, b] of grid.get((gx + dx) + ',' + (gy + dy)) ?? []) if (Math.hypot(a - i, b - j) < gapPx) { ok = false; break; }
			if (!ok) continue;
			const key = gx + ',' + gy; if (!grid.has(key)) grid.set(key, []); grid.get(key).push([i, j]);
			kept.push([i, j]);
		}
		for (const [i, j] of kept) out.push({ sp: to3(i, j), size, stone: pick(), angle: 0, lift: 0 });
		return out;
	},

	// lattice / trellis: two families of parallel lines (diamonds) across a panel, stones along the
	// lines and (optionally) a bigger stone at each node
	lattice(gen, ctx, rand) {
		const P = gen.params ?? {}, pick = picker(gen, rand), out = [];
		const region = panelRegion(ctx, gen.on?.panel);
		// best-fit plane of the panel: lines are straight in it, projected onto the body
		const pts = []; for (let i = 0; i < 600; i++) pts.push(region.sample(rand).p);
		const c = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(pts.length);
		const nrm = pts.reduce((a, p) => a.add(ctx.surf.faceNormal(ctx.surf.closest(p).f, new THREE.Vector3())), new THREE.Vector3()).normalize();
		const ex = new THREE.Vector3(0, 1, 0).cross(nrm).normalize(), ey = nrm.clone().cross(ex);
		let rmax = 0; for (const p of pts) rmax = Math.max(rmax, p.distanceTo(c));
		const spacing = P.spacing ?? 0.04, size = sizeOf(P.size ?? 'ss8'), ang = P.angle ?? Math.PI / 4;
		for (const a of [ang, Math.PI - ang]) {
			const d = ex.clone().multiplyScalar(Math.cos(a)).addScaledVector(ey, Math.sin(a)), o = ex.clone().multiplyScalar(-Math.sin(a)).addScaledVector(ey, Math.cos(a));
			for (let k = -Math.ceil(rmax / spacing); k <= Math.ceil(rmax / spacing); k++) {
				const base = c.clone().addScaledVector(o, k * spacing), path = [];
				let f = ctx.surf.closest(c).f;
				for (let s = -rmax; s <= rmax; s += 0.002) { const q = projectNear(ctx.surf, base.clone().addScaledVector(d, s), f, {}); f = q.f; path.push({ p: ctx.surf.pos(q), sp: { f: q.f, b0: q.b0, b1: q.b1, b2: q.b2 } }); }
				for (const q of alongPath(path, () => size, P.gap ?? 1.3, ctx.surf)) if (region.contains(q.sp)) out.push({ sp: q.sp, size, stone: pick(), angle: angleAt(ctx, q.sp, q.tangent), lift: 0 });
			}
		}
		if (P.nodeSize) {
			const nd = sizeOf(P.nodeSize);
			const d1 = ex.clone().multiplyScalar(Math.cos(ang)).addScaledVector(ey, Math.sin(ang)), d2 = ex.clone().multiplyScalar(Math.cos(Math.PI - ang)).addScaledVector(ey, Math.sin(Math.PI - ang));
			const o1 = ex.clone().multiplyScalar(-Math.sin(ang)).addScaledVector(ey, Math.cos(ang)), o2 = ex.clone().multiplyScalar(-Math.sin(Math.PI - ang)).addScaledVector(ey, Math.cos(Math.PI - ang));
			const K = Math.ceil(rmax / spacing) + 1;
			for (let i = -K; i <= K; i++) for (let j = -K; j <= K; j++) {
				// intersection of line i (family 1) and line j (family 2) in the plane
				const A = [[d1.dot(ex), -d2.dot(ex)], [d1.dot(ey), -d2.dot(ey)]];
				const p1 = o1.clone().multiplyScalar(i * spacing), p2 = o2.clone().multiplyScalar(j * spacing), r = p2.clone().sub(p1);
				const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
				if (Math.abs(det) < 1e-9) continue;
				const rx = r.dot(ex), ry = r.dot(ey), s1 = (rx * A[1][1] - A[0][1] * ry) / det;
				const p = c.clone().add(p1).addScaledVector(d1, s1);
				if (p.distanceTo(c) > rmax) continue;
				const q = ctx.surf.closest(p), sp = { f: q.f, b0: q.b0, b1: q.b1, b2: q.b2 };
				if (region.contains(sp)) out.push({ sp, size: nd, stone: gen.nodeStone ?? pick(), angle: 0, lift: 0, node: true });
			}
		}
		return out;
	},

	// a tight random cluster around a point
	cluster(gen, ctx, rand) {
		const P = gen.params ?? {}, pick = picker(gen, rand), out = [];
		const csp = resolvePoint(gen.at, ctx), c = ctx.surf.pos(csp), n = ctx.surf.faceNormal(csp.f, new THREE.Vector3());
		const t0 = new THREE.Vector3(0, 1, 0).cross(n).normalize(), b0 = n.clone().cross(t0);
		const R = P.radius ?? 0.015, sizes = (P.sizes ?? ['ss20', 'ss12', 'ss8']).map(sizeOf), placed = [];
		for (let k = 0; k < (P.count ?? 20) * 30 && placed.length < (P.count ?? 20); k++) {
			const r = R * Math.sqrt(rand()), a = rand() * Math.PI * 2, d = sizes[Math.floor(rand() * sizes.length)];
			const q = projectNear(ctx.surf, c.clone().addScaledVector(t0, r * Math.cos(a)).addScaledVector(b0, r * Math.sin(a)), csp.f, {});
			const p = ctx.surf.pos(q);
			if (placed.some((s) => s.p.distanceTo(p) < (s.d + d) / 2 * 1.08)) continue;
			placed.push({ p, d });
			out.push({ sp: { f: q.f, b0: q.b0, b1: q.b1, b2: q.b2 }, size: d, stone: pick(), angle: rand() * Math.PI, lift: 0 });
		}
		return out;
	},
};

// Dart throwing in a region with per-candidate sizes (0 rejects), no two stones closer than their
// radii times gap.
function dart(region, rand, candidates, gap, sizeFor, pick, ctx) {
	const out = [], cell = 0.01, grid = new Map();
	const key = (p) => Math.floor(p.x / cell) + ',' + Math.floor(p.y / cell) + ',' + Math.floor(p.z / cell);
	for (let k = 0; k < candidates; k++) {
		const q = region.sample(rand), d = sizeFor(q);
		if (!d) continue;
		const p = q.p, cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell), cz = Math.floor(p.z / cell);
		let ok = true;
		for (let i = -1; i <= 1 && ok; i++) for (let j = -1; j <= 1 && ok; j++) for (let l = -1; l <= 1 && ok; l++) {
			for (const s of grid.get((cx + i) + ',' + (cy + j) + ',' + (cz + l)) ?? []) if (s.p.distanceTo(p) < ((s.d + d) / 2) * gap) { ok = false; break; }
		}
		if (!ok) continue;
		const s = { p, d };
		const kk = key(p);
		if (!grid.has(kk)) grid.set(kk, []);
		grid.get(kk).push(s);
		out.push({ sp: q.sp, size: d, stone: pick(), angle: rand() * Math.PI, lift: 0 });
	}
	return out;
}

// Unit motif outlines (about [-1, 1]).
export function motifOutline(shape, points) {
	if (points?.length) return points;
	const out = [], N = 72;
	for (let i = 0; i < N; i++) {
		const t = (i / N) * Math.PI * 2;
		switch (shape) {
			case 'circle': out.push([Math.cos(t), Math.sin(t)]); break;
			case 'star': { const r = i % 12 < 6 ? 1 - (Math.abs((i % 12) - 3) / 3) * 0.55 : 0.45 + (Math.abs((i % 12) - 9) / 3) * 0.55; const k = Math.floor(i / 12) * 2 + (i % 12 < 6 ? 0 : 1); void k; out.push([r * Math.cos(t), r * Math.sin(t)]); break; }
			case 'diamond': out.push([Math.cos(t) * 0.7 * (Math.abs(Math.cos(t)) + Math.abs(Math.sin(t))) ** -1 * 1.4, Math.sin(t) * (Math.abs(Math.cos(t)) + Math.abs(Math.sin(t))) ** -1]); break;
			case 'flower': { const r = 0.6 + 0.4 * Math.cos(5 * t); out.push([r * Math.cos(t), r * Math.sin(t)]); break; }
			default: out.push([(16 * Math.sin(t) ** 3) / 17, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17]); // heart
		}
	}
	return out;
}
function insidePoly(p, poly) {
	let inside = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const a = poly[i], b = poly[j];
		if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
	}
	return inside;
}
function distPoly(p, poly) {
	let d = Infinity;
	for (let i = 0; i < poly.length; i++) {
		const a = poly[i], b = poly[(i + 1) % poly.length], bx = b[0] - a[0], by = b[1] - a[1], l2 = bx * bx + by * by;
		const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * bx + (p[1] - a[1]) * by) / l2)) : 0;
		d = Math.min(d, Math.hypot(p[0] - a[0] - bx * t, p[1] - a[1] - by * t));
	}
	return d;
}

// ---------------------------------------------------------------------------------------------
// Run every generator (plus single stones), mirror them, keep them on fabric and apart.
// ctx: { surf, doc, evaluated, garment(layer), landmarks, isFabric(sp) }
export function runStones(doc, ctx) {
	const all = [], errors = [];
	const sp3 = (sp) => ctx.surf.pos(sp);
	for (const gen of doc.stones) {
		if (gen.hidden) continue;
		const fn = GENERATORS[gen.kind];
		if (!fn) { errors.push(gen.id + ': unknown kind ' + gen.kind); continue; }
		let list;
		try { list = fn(gen, ctx, rng(gen.seed ?? 1)); } catch (e) { errors.push(gen.id + ': ' + e.message); continue; }
		const shape = gen.shape ?? 'round', keepOut = gen.params?.keepOut;
		for (const s of list) { s.gen = gen.id; s.shape = s.shape ?? shape; s.layer = gen.layer ?? null; if (keepOut !== undefined) s.keepOut = keepOut; }
		if (gen.mirror === 'both') {
			const m = list.map((s) => ({ ...s, sp: mirrorSP(s.sp, ctx.surf), angle: Math.PI - s.angle, mirrored: true }));
			list = list.concat(m);
		}
		// eraser marks
		if (gen.erase?.length) {
			const marks = gen.erase.map((e) => ({ p: sp3(e.sp ? { f: e.sp.f, b0: 1 - e.sp.b[0] - e.sp.b[1], b1: e.sp.b[0], b2: e.sp.b[1] } : e), r: e.r ?? 0.005 }));
			list = list.filter((s) => { const p = sp3(s.sp); return !marks.some((m) => p.distanceTo(m.p) < m.r); });
		}
		all.push(...list);
	}
	for (const pl of doc.placed) all.push({ sp: { f: pl.sp.f, b0: 1 - pl.sp.b[0] - pl.sp.b[1], b1: pl.sp.b[0], b2: pl.sp.b[1] }, size: sizeOf(pl.size ?? 'ss16'), shape: pl.shape ?? 'round', stone: pl.stone ?? 'Crystal AB', angle: pl.angle ?? 0, lift: pl.lift ?? 0, gen: 'placed', id: pl.id });
	// keep stones on fabric (or on their strap), off opening edges, and apart from earlier ones
	const kept = [], grid = new Map(), cell = 0.01;
	for (const s of all) {
		const p = sp3(s.sp);
		if (!s.lift && ctx.isFabric && !ctx.isFabric(s.sp, p, s.size, s.keepOut)) continue;
		const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell), cz = Math.floor(p.z / cell);
		let ok = true;
		for (let i = -1; i <= 1 && ok; i++) for (let j = -1; j <= 1 && ok; j++) for (let l = -1; l <= 1 && ok; l++) {
			for (const o of grid.get((cx + i) + ',' + (cy + j) + ',' + (cz + l)) ?? []) if (o.lift === s.lift && o.p.distanceTo(p) < ((o.size + s.size) / 2) * 0.92) { ok = false; break; }
		}
		if (!ok) continue;
		const k = cx + ',' + cy + ',' + cz;
		if (!grid.has(k)) grid.set(k, []);
		grid.get(k).push({ p, size: s.size, lift: s.lift });
		kept.push(s);
	}
	return { stones: kept, errors, dropped: all.length - kept.length };
}

export const GENERATOR_KINDS = Object.keys(GENERATORS);
export { SHAPES };
