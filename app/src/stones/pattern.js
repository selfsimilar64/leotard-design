// A stone pattern: a procedure laid on the flat cloth of one piece, cheap enough to re-run every
// frame of a drag. Its record is { kind: 'pattern', on: { panel }, params, ... }:
//   layout, the arrangement (stones/layouts.js) and its parameters
//   x, y, rotate (degrees), scale, flip: where it lies on the flat piece (metres, origin at the
//     piece's middle). Stones never scale: scaling moves them apart, or draws more of the lines
//   gradient, ga, gb, gpower, greverse: the gradient (stones/fields.js) and what it drives:
//     densityFrom/To; size to sizeTo; colourRamp along it
//   twist, bulge, waveA, warp, jitter...: distortions; size, sizeB, mix, gap, margin, keepOut
//   turn: which way shaped stones point; sizeBy, colourBy: follow the pattern instead of the gradient
// The pipeline per candidate, cheapest test first: distort, place on the cloth, density against its
// rank (so a stone kept at 40% is kept at 60%), the piece's edge, its triangle on the body. Nothing
// here searches the body.
// Spec: knowledge/engineering/architecture/procedural-stone-patterns.md.
import { LAYOUTS, layoutDefaults } from './layouts.js';
import { Candidates } from './candidates.js';
import { gradientField, distortion, distortionReach, hash2 } from './fields.js';
import { sizeOf, SHAPES, SS } from './library.js';

// the sizes stones come in (metres), ascending: a size gradient steps through what can be bought
const SIZES = Object.values(SS).map((d) => d / 1000).sort((a, b) => a - b);
function realSize(d) {
	let lo = 0, hi = SIZES.length - 1;
	while (lo < hi) { const m = (lo + hi) >> 1; if (SIZES[m] < d) lo = m + 1; else hi = m; }
	return lo > 0 && d - SIZES[lo - 1] < SIZES[lo] - d ? SIZES[lo - 1] : SIZES[lo];
}

// how far from an opening edge a stone can be and still need the elastic's keep-out checked
const NEAR_EDGE = 0.03;

const scratch = new Candidates(20000);
const DART_HASH = 4096, dartHead = new Int32Array(DART_HASH);
let dartNext = new Int32Array(0), dartU = new Float32Array(0), dartV = new Float32Array(0), dartD = new Float32Array(0);

// The record's parameters over its layout's defaults, and the gradient's handles (default: across the
// piece, top to bottom, or from its middle).
export function patternParams(gen, piece = null) {
	const P = gen.params ?? {}, name = LAYOUTS[P.layout] ? P.layout : 'scatter', out = { ...layoutDefaults(name), x: 0, y: 0, rotate: 0, scale: 1, ...P, layout: name };
	if (piece && (!out.ga || !out.gb)) { const g = defaultGradient(out.gradient, piece); out.ga ??= g.ga; out.gb ??= g.gb; }
	return out;
}
export function defaultGradient(shape, piece) {
	const cx = (piece.x0 + piece.x1) / 2, cy = (piece.y0 + piece.y1) / 2, h = piece.y1 - piece.y0, w = piece.x1 - piece.x0, m = Math.min(w, h);
	// the top and bottom of the cloth itself, down its middle (a neckline may dip below the piece's top),
	// a little in: where a handle can be seen and grabbed (a front's very bottom curves away between the legs)
	let top = piece.y1, low = piece.y0;
	if (piece.find) {
		while (top > cy && piece.find(cx, top) < 0) top -= 0.003;
		while (low < cy && piece.find(cx, low) < 0) low += 0.003;
		top -= h * 0.03; low += h * 0.1;
	}
	if (shape === 'linear' || shape === 'reflected') return shape === 'linear' ? { ga: [cx, top], gb: [cx, low] } : { ga: [cx, cy], gb: [cx, low] };
	if (shape === 'waves' || shape === 'stripes') return { ga: [cx, cy], gb: [cx, cy - 0.05] };
	if (shape === 'ripple' || shape === 'checks') return { ga: [cx, cy], gb: [cx + 0.04, cy] };
	if (shape === 'clouds') return { ga: [cx, cy], gb: [cx + 0.08, cy] };
	if (shape === 'edge') return { ga: [cx, cy], gb: [cx + m * 0.25, cy] };
	return { ga: [cx, cy], gb: [cx, cy - h * 0.35] };
}

// A pattern scales down only as far as its stones have room: below this its rows would lie on each other
// (and a pattern scaled to nothing would ask for millions of stones).
export function minScale(P) {
	const d = sizeOf(P.size ?? 'ss12');
	return P.spacing ? Math.max(0.02, d / P.spacing) : 0.02;
}

// The pattern's own space seen from the flat cloth, as a box round the whole piece.
function boxOver(P, piece, s, cos, sin, flip) {
	let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, r = 0;
	for (const [u, v] of [[piece.x0, piece.y0], [piece.x1, piece.y0], [piece.x0, piece.y1], [piece.x1, piece.y1]]) {
		const du = u - P.x, dv = v - P.y, x = ((cos * du + sin * dv) / s) * flip, y = (-sin * du + cos * dv) / s;
		x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); r = Math.max(r, Math.hypot(x, y));
	}
	const m = distortionReach(P, r) / s;
	return { x0: x0 - m, x1: x1 + m, y0: y0 - m, y1: y1 + m, r: r + m };
}

// What the candidates depend on, for the layouts worth keeping between frames (heavy): moving or
// turning the pattern reuses them while the box stays inside what was made.
function candidateKey(P, layout, pitch, seed) {
	let k = P.layout + ':' + seed + ':' + pitch.toFixed(7);
	for (const p of layout.params) k += ':' + P[p.k];
	return k;
}

function candidatesFor(gen, layout, P, box, pitch, piece, cache) {
	const seed = gen.seed ?? 1, edge = layout.flat ? (u, v) => piece.edgeAt(u, v) : null;
	if (!layout.heavy || !cache) { layout.make(P, scratch.reset(box, pitch, seed, edge)); return scratch; }
	let c = cache.get(gen.id);
	const key = candidateKey(P, layout, pitch, seed);
	if (c?.key === key && box.x0 >= c.box.x0 && box.x1 <= c.box.x1 && box.y0 >= c.box.y0 && box.y1 <= c.box.y1) return c.E;
	// made a little wider than needed, so the next few frames of a drag find it there
	const mx = (box.x1 - box.x0) * 0.2, my = (box.y1 - box.y0) * 0.2, wide = { x0: box.x0 - mx, x1: box.x1 + mx, y0: box.y0 - my, y1: box.y1 + my, r: box.r * 1.3 };
	const E = c?.E ?? new Candidates(8192);
	layout.make(P, E.reset(wide, pitch, seed, edge));
	cache.set(gen.id, { key, box: wide, E });
	return E;
}

// A colour picker from the record: by a value 0..1 (a ramp, dithered between its stops so an ombré has
// no hard line), by family, or by chance (a palette).
function colourPicker(gen, P) {
	const ramp = gen.colourRamp?.length > 1 ? gen.colourRamp : null, pal = gen.palette?.length ? gen.palette : null, single = gen.stone ?? 'Crystal AB';
	if (ramp) {
		const n = ramp.length;
		if (P.colourBy === 'family') return (t, a, cat) => ramp[cat % n];
		return (t, along, cat, h) => { const v = (P.colourBy === 'along' ? along : t) * (n - 1) + h - 0.5; return ramp[v < 0 ? 0 : v >= n - 1 ? n - 1 : Math.round(v)]; };
	}
	if (pal) {
		const total = pal.reduce((a, p) => a + (p.weight ?? 1), 0);
		return (t, a, cat, h) => { let r = h * total; for (const p of pal) { r -= p.weight ?? 1; if (r <= 0) return p.stone; } return pal[pal.length - 1].stone; };
	}
	return () => single;
}

const _q = { x: 0, y: 0 }, _p3 = { x: 0, y: 0, z: 0 };

// ctx: { cloth(panelId) -> { piece, pending, paired } | null, edge(p, keepOut) }; cache: Map (the group's
// candidates between frames). -> stones on the body (the piece's own side; the caller mirrors)
export function runPattern(gen, ctx, cache = null) {
	const panel = ctx.doc.panels.find((p) => p.id === gen.on?.panel);
	if (!panel) throw new Error('No panel ' + gen.on?.panel);
	if (panel.removed) return [];
	const cloth = ctx.cloth?.(panel.id), piece = cloth?.piece;
	if (!piece) { if (cloth?.pending) ctx.pending?.add(gen.id); return []; }

	const P = patternParams(gen, piece), layout = LAYOUTS[P.layout], flat = !!layout.flat, seed = gen.seed ?? 1;
	const rot = flat ? 0 : (P.rotate * Math.PI) / 180, cos = Math.cos(rot), sin = Math.sin(rot), s = flat ? 1 : Math.max(P.scale, minScale(P)), flip = !flat && P.flip ? -1 : 1, tx = flat ? 0 : P.x, ty = flat ? 0 : P.y;
	const d0 = sizeOf(P.size ?? 'ss12'), gap = P.gap ?? 1.2, dB = P.sizeB ? sizeOf(P.sizeB) : d0, dTo = P.sizeTo ? sizeOf(P.sizeTo) : d0;
	const pitch = (d0 * gap) / s, box = flat ? { x0: piece.x0, x1: piece.x1, y0: piece.y0, y1: piece.y1, r: Math.hypot(piece.x1 - piece.x0, piece.y1 - piece.y0) / 2 } : boxOver(P, piece, s, cos, sin, flip);
	const E = candidatesFor(gen, layout, P, box, pitch, piece, cache), n = E.n, X = E.X, Y = E.Y, R = E.R, A = E.A, T = E.T, K = E.K, C = E.C;

	const grad = gradientField(P, (u, v) => piece.edgeAt(u, v));
	const dFrom = P.densityFrom ?? 1, dTo2 = P.densityTo ?? 1, thin = dFrom < 1 || dTo2 < 1;
	const bend = flat ? null : distortion(P, seed), margin = P.margin ?? 0, keepOut = P.keepOut;
	const pick = colourPicker(gen, P), shape = gen.shape ?? 'round', isRound = (SHAPES[shape]?.aspect ?? 1) === 1 && shape !== 'heart' && shape !== 'triangle' && shape !== 'star' && shape !== 'square';
	const mixed = layout.mixed && P.sizeB, grading = dTo !== d0, sizeAlong = P.sizeBy === 'along', turn = ((P.stoneTurn ?? 0) * Math.PI) / 180, upright = P.turn === 'fixed';
	const layer = gen.layer ?? null, id = gen.id, out = [], maxD = Math.max(d0, dB, dTo);

	// dart layouts: each candidate is kept clear of those accepted before it (a hash of cells on the cloth)
	const dart = !!layout.dart, cell = maxD * gap * 1.01, HASH = DART_HASH, head = dartHead;
	if (dart) {
		head.fill(-1);
		if (dartNext.length < n) { const cap = Math.ceil(n * 1.5); dartNext = new Int32Array(cap); dartU = new Float32Array(cap); dartV = new Float32Array(cap); dartD = new Float32Array(cap); }
	}
	const next = dartNext, DU = dartU, DV = dartV, DD = dartD;
	let nd = 0;

	const x0 = piece.x0, x1 = piece.x1, y0 = piece.y0, y1 = piece.y1;
	for (let i = 0; i < n; i++) {
		let x = X[i], y = Y[i];
		if (bend) { bend(x, y, i, _q); x = _q.x; y = _q.y; }
		const fx = x * s * flip, fy = y * s, u = tx + cos * fx - sin * fy, v = ty + sin * fx + cos * fy;
		if (u < x0 || u > x1 || v < y0 || v > y1) continue;
		const t = grad ? grad(u, v) : 0;
		if (thin && R[i] >= dFrom + (dTo2 - dFrom) * t) continue;
		const cat = C[i];
		let d = mixed && cat === 1 ? dB : d0;
		if (grading) { const g = sizeAlong ? T[i] : t; d = d0 + (dTo - d0) * g; }
		if (K[i] !== 1) d *= K[i];
		if (grading || K[i] !== 1) d = realSize(d);
		const clear = piece.edgeAt(u, v);
		if (clear < d / 2 + margin) continue;
		if (dart) {
			const cu = Math.floor(u / cell), cv = Math.floor(v / cell);
			let ok = true;
			for (let b = -1; b <= 1 && ok; b++) for (let a = -1; a <= 1 && ok; a++) {
				for (let k = head[((cu + a) * 73856093 ^ (cv + b) * 19349663) & (HASH - 1)]; k >= 0; k = next[k]) {
					const du = DU[k] - u, dv = DV[k] - v, m = ((DD[k] + d) / 2) * gap;
					if (du * du + dv * dv < m * m) { ok = false; break; }
				}
			}
			if (!ok) continue;
			const hk = (cu * 73856093 ^ cv * 19349663) & (HASH - 1);
			DU[nd] = u; DV[nd] = v; DD[nd] = d; next[nd] = head[hk]; head[hk] = nd; nd++;
		}
		const q = piece.find(u, v);
		if (q < 0) continue;
		const w1 = piece.w1, w2 = piece.w2;
		piece.posOf(q, _p3, w1, w2);
		// finished opening edges: the trim's keep-out (or the group's own), as for every other stone
		if (clear < NEAR_EDGE + (keepOut ?? 0) && ctx.edge && ctx.edge(_p3, keepOut) <= d / 2) continue;
		const h = hash2(i, 13, seed);
		let angle;
		if (isRound) angle = h * Math.PI;
		else {
			let a = upright ? 0 : A[i];
			// bent: which way the line runs now
			if (bend && !upright) {
				const e = 0.0005, ca = Math.cos(a), sa = Math.sin(a);
				bend(X[i] + ca * e, Y[i] + sa * e, i, _q);
				a = Math.atan2(_q.y - y, _q.x - x);
			}
			if (flip < 0) a = Math.PI - a;
			angle = piece.angleOf(q, a + rot + turn);
		}
		out.push({ sp: piece.spOf(q, w1, w2), size: d, stone: pick(t, T[i], cat, h), angle, lift: 0, shape, gen: id, layer, x: _p3.x, y: _p3.y, z: _p3.z, r: h, fab: true });
	}
	return out;
}

// Where a pattern's handles lie on the flat piece: knobs [{ kind: move | scale | rotate | ga | gb, u, v }]
// and lines [{ pts: [[u, v]...], width }]. The ring is the pattern's size on the cloth, within reason.
export const HANDLE_RADIUS = 0.05;
export function patternHandles(gen, piece) {
	const P = patternParams(gen, piece), knobs = [], lines = [], layout = LAYOUTS[P.layout];
	const ring = (cx, cy, r, width) => { const pts = []; for (let i = 0; i <= 72; i++) { const a = (i / 72) * Math.PI * 2; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } lines.push({ pts, width }); };
	if (!layout.flat) {
		const W = piece.x1 - piece.x0, H = piece.y1 - piece.y0, r = Math.min(Math.max(HANDLE_RADIUS * P.scale, 0.03), Math.min(W, H) * 0.45), a = (P.rotate * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
		ring(P.x, P.y, r, 1.4);
		knobs.push({ kind: 'move', u: P.x, v: P.y }, { kind: 'scale', u: P.x + r * c, v: P.y + r * s }, { kind: 'rotate', u: P.x - r * s, v: P.y + r * c });
	}
	if ((P.gradient ?? 'none') !== 'none' && P.ga && P.gb) {
		const [ax, ay] = P.ga, [bx, by] = P.gb, seg = [];
		for (let i = 0; i <= 12; i++) seg.push([ax + ((bx - ax) * i) / 12, ay + ((by - ay) * i) / 12]);
		lines.push({ pts: seg, width: 1.8 });
		if (['radial', 'ripple', 'angular', 'spiral'].includes(P.gradient)) ring(ax, ay, Math.hypot(bx - ax, by - ay), 1);
		knobs.push({ kind: 'ga', u: ax, v: ay }, { kind: 'gb', u: bx, v: by });
	}
	return { knobs, lines };
}

// What a pattern's mirror half needs flipped when its two halves live on two pieces (doc/symmetry.js):
// the second piece's flat is the first's mirror image. whole: all of a group's parameters; otherwise
// a change to some of them, which leaves the flip alone unless it is the change.
export function flipPatternParams(p, whole = false) {
	const out = { ...p };
	if (typeof out.x === 'number') out.x = -out.x;
	if (typeof out.rotate === 'number') out.rotate = -out.rotate;
	if (whole || 'flip' in p) out.flip = !p.flip;
	if (out.ga) out.ga = [-out.ga[0], out.ga[1]];
	if (out.gb) out.gb = [-out.gb[0], out.gb[1]];
	return out;
}
