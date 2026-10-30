// A stone pattern: a procedure laid on the flat cloth of one piece, cheap enough to re-run every
// frame of a drag. Its record is { kind: 'pattern', on: { panel }, params, ... }:
//   layout, preset: the arrangement (stones/layouts.js), its parameters, the gallery entry it started from
//   x, y, rotate (degrees), scale, flip: where the whole of it lies on the flat piece, its frame: the
//     arrangement and its modifiers move, turn and scale together
//   px, py, pturn, pscale, sx, sy: the arrangement's plane inside its frame, last in the panel: this shifts
//     the crystals under the modifiers, which stay
//   mods: the modifiers on density, size and colour (stones/modifiers.js)
//   size, gap, density: the crystal and how close and how many; stone, shape on the record
//   twist, bulge, waveA, warp...: distortions; jitter: each stone's stray; margin, keepOut
//   turn, stoneTurn: which way shaped stones point
// Stones never scale: scaling moves them apart, or draws more of the lines. The pipeline: a layout draws
// through the pattern's map, so what arrives is on the cloth and evenly spaced there. Then per candidate,
// what the design hangs on first (stones/candidates.js pri), cheapest test first: density against its rank
// (so a stone kept at 40% is kept at 60%), the piece's edge, clear of the pattern's other stones on the
// flat cloth, its triangle on the body. Nothing here searches the body.
// Spec: knowledge/engineering/architecture/procedural-stone-patterns.md.
import { LAYOUTS, GALLERY_ITEMS, layoutDefaults } from './layouts.js';
import { Candidates, Drawing, SIZES } from './candidates.js';
import { distortion, distortionReach, frac } from './fields.js';
import { compileMods, modsFromOld, modWithGeometry, presetMods, sizeRange } from './modifiers.js';
import { sizeOf, SHAPES } from './library.js';

// how far from an opening edge a stone can be and still need the elastic's keep-out checked
const NEAR_EDGE = 0.03;
// how close two stones of one pattern may lie, as a share of touching: they are placed flat, so this is
// measured on the flat cloth, whatever the body does to it afterwards
const FLAT_CLEAR = 0.92;

const scratch = new Candidates(20000);
let cellHead = new Int32Array(0), bigHead = new Int32Array(0), hashNext = new Int32Array(0), hashU = new Float32Array(0), hashV = new Float32Array(0), hashD = new Float32Array(0), order = new Int32Array(0);

export const FRAME_DEFAULTS = { rotate: 0, scale: 1, flip: false };
export const PLANE_DEFAULTS = { px: 0, py: 0, pturn: 0, pscale: 1, sx: 1, sy: 1 };

// The piece's middle: where a new pattern starts.
export function pieceMiddle(piece) { return piece ? [(piece.x0 + piece.x1) / 2, (piece.y0 + piece.y1) / 2] : [0, 0]; }

// The frame from the record: flat cloth = (x, y) + R(rotate) (F S lx, S ly)
export function frameOf(P) {
	const a = ((P.rotate ?? 0) * Math.PI) / 180;
	return { x: P.x ?? 0, y: P.y ?? 0, c: Math.cos(a), s: Math.sin(a), S: Math.max(P.scale ?? 1, 1e-3), F: P.flip ? -1 : 1 };
}
export const frameToCloth = (f, lx, ly) => { const x = lx * f.S * f.F, y = ly * f.S; return [f.x + f.c * x - f.s * y, f.y + f.s * x + f.c * y]; };
export const clothToFrame = (f, u, v) => { const du = u - f.x, dv = v - f.y; return [((f.c * du + f.s * dv) / f.S) * f.F, (f.c * dv - f.s * du) / f.S]; };

// The record's parameters over its layout's defaults, the frame on the piece's middle unless placed, and its
// modifiers (a record from before modifiers: its one gradient as modifiers).
export function patternParams(gen, piece = null) {
	const P0 = gen.params ?? {}, name = LAYOUTS[P0.layout] ? P0.layout : 'scatter', [cx, cy] = pieceMiddle(piece);
	const out = { ...layoutDefaults(name), ...FRAME_DEFAULTS, ...PLANE_DEFAULTS, ...P0, layout: name };
	out.x ??= cx; out.y ??= cy;
	if (!out.mods) {
		const f = frameOf(out);
		out.mods = modsFromOld(P0, gen, (u, v) => clothToFrame(f, u, v), sizeOf);
	}
	out.mods = out.mods.map((m) => modWithGeometry(m, piece));
	return out;
}

// What choosing a preset does to a group's parameters, as a change to them (undefined: gone). Every setting of
// the arrangement becomes the preset's own, so nothing lies over from the last one. What stays is where the
// pattern lies, its crystal (unless the last preset chose that size, or this one does), and the modifiers added
// by hand; those that came with a preset go with it. ownSize: the crystal's size to go back to.
const KEPT_BY_PRESET = ['x', 'y', 'rotate', 'flip', 'symmetric', 'size', 'gap', 'density', 'margin', 'keepOut', 'turn', 'stoneTurn'];
export function presetPatch(params, key, ownSize = 'ss12') {
	const it = GALLERY_ITEMS.get(key), patch = {}, last = GALLERY_ITEMS.get(params?.preset);
	for (const k of Object.keys(params ?? {})) patch[k] = undefined;
	for (const k of KEPT_BY_PRESET) if (params?.[k] !== undefined) patch[k] = params[k];
	if (last?.params?.size && last.params.size === params?.size) patch.size = ownSize;
	const own = (params?.mods ?? []).filter((m) => !m.preset);
	return Object.assign(patch, { layout: it.layout, preset: key, ...layoutDefaults(it.layout), ...it.params, mods: [...presetMods(it, own), ...own] });
}

// The arrangement's own space on the flat cloth: frame after plane. -> { a, b, c, d, e, f, sc: its scale,
// bend }; the scale kept where stones have room (minScale).
export function patternMap(P, bend = null) {
	const f = frameOf(P), ps0 = Math.max(P.pscale ?? 1, 1e-3), sx = P.sx ?? 1, sy = P.sy ?? 1, mean = Math.sqrt(sx * sy);
	const least = minScale(P), ps = f.S * ps0 * mean < least ? least / (f.S * mean) : ps0;
	const t = ((P.pturn ?? 0) * Math.PI) / 180, pc = ps * Math.cos(t), ss = ps * Math.sin(t), px = P.px ?? 0, py = P.py ?? 0, S = f.S, F = f.F, c = f.c, s = f.s;
	return {
		a: (c * S * F * pc - s * S * ss) * sx, b: (-c * S * F * ss - s * S * pc) * sy,
		c: (s * S * F * pc + c * S * ss) * sx, d: (-s * S * F * ss + c * S * pc) * sy,
		e: f.x + c * S * F * px - s * S * py, f: f.y + s * S * F * px + c * S * py,
		sc: S * ps * mean, bend,
	};
}
// A point of the flat cloth in the arrangement's own space (without its distortions).
export function clothToPattern(m, u, v) {
	const det = m.a * m.d - m.b * m.c || 1e-12, du = u - m.e, dv = v - m.f;
	return [(m.d * du - m.b * dv) / det, (m.a * dv - m.c * du) / det];
}

// A pattern scales down only as far as its stones have room: below this its rows would lie on each other
// (and a pattern scaled to nothing would ask for millions of stones).
export function minScale(P) {
	const d = sizeOf(P.size ?? 'ss12');
	return P.spacing ? Math.max(0.02, d / P.spacing) : 0.02;
}

// The arrangement's space seen from the flat cloth, as a box round the whole piece.
function boxOver(P, piece, m) {
	let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, r = 0;
	for (const [u, v] of [[piece.x0, piece.y0], [piece.x1, piece.y0], [piece.x0, piece.y1], [piece.x1, piece.y1]]) {
		const [x, y] = clothToPattern(m, u, v);
		x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); r = Math.max(r, Math.hypot(x, y));
	}
	const reach = distortionReach(P, r) / m.sc;
	return { x0: x0 - reach, x1: x1 + reach, y0: y0 - reach, y1: y1 + reach, r: r + reach };
}

// What a layout's drawing depends on, for those worth keeping between frames (heavy): moving or turning the
// pattern replays it while the box stays inside what was drawn.
function drawingKey(P, layout, pitch, seed, d0) {
	let k = P.layout + ':' + seed + ':' + pitch.toFixed(7) + ':' + d0;
	for (const p of layout.params) k += ':' + P[p.k];
	return k;
}
// A box round this one, on round numbers, so that a line drawn in it does not change as the pattern moves.
function anchoredBox(b, A = 0.1) {
	const x0 = Math.floor(b.x0 / A) * A - A, x1 = Math.ceil(b.x1 / A) * A + A, y0 = Math.floor(b.y0 / A) * A - A, y1 = Math.ceil(b.y1 / A) * A + A;
	return { x0, x1, y0, y1, r: Math.max(Math.hypot(x0, y0), Math.hypot(x1, y0), Math.hypot(x0, y1), Math.hypot(x1, y1)) };
}

const noCache = new Map();
function drawInto(gen, layout, P, E, box, pitch, seed, edge, opts, cache) {
	if (!layout.heavy) { layout.make(P, E); E.finish(); return; }
	cache ??= noCache;
	let c = cache.get(gen.id);
	const key = drawingKey(P, layout, pitch, seed, opts.d0);
	if (c?.key !== key || box.x0 < c.box.x0 || box.x1 > c.box.x1 || box.y0 < c.box.y0 || box.y1 > c.box.y1) {
		const wide = anchoredBox(box), D = c?.D ?? new Drawing();
		D.reset(wide, pitch, seed, edge, opts);
		layout.make(P, D);
		cache.set(gen.id, c = { key, box: wide, D });
	}
	c.D.replay(E);
}

// A colour picker when there are no colour modifiers: one colour, or by chance (a palette).
function plainColour(gen) {
	const pal = gen.palette?.length ? gen.palette : null, single = gen.stone ?? 'Crystal AB';
	if (!pal) return () => single;
	const total = pal.reduce((a, p) => a + (p.weight ?? 1), 0);
	return (u, v, k, t, cat, rank) => { let r = frac(rank * 61.803398875 + 0.137) * total; for (const p of pal) { r -= p.weight ?? 1; if (r <= 0) return p.stone; } return pal[pal.length - 1].stone; };
}

// Between two sold sizes, some of each, so a size gradient has no hard line. h: this stone's own chance.
function ditherSize(d, h) {
	if (d <= SIZES[0]) return SIZES[0];
	const last = SIZES.length - 1;
	if (d >= SIZES[last]) return SIZES[last];
	let lo = 0, hi = last;
	while (hi - lo > 1) { const m = (lo + hi) >> 1; if (SIZES[m] <= d) lo = m; else hi = m; }
	return h < (d - SIZES[lo]) / (SIZES[hi] - SIZES[lo]) ? SIZES[hi] : SIZES[lo];
}

const _p3 = { x: 0, y: 0, z: 0 };

// How far a flat point lies from the nearest finished opening edge, past its keep-out: a raster over the piece, made once
// for each state of the edges. Good to KEEP_SURE of the exact answer: only a stone closer than that to the line asks.
const KEEP_CELL = 0.006, KEEP_SURE = 0.005;
function keepGrid(piece, edge, u, v) {
	let G = piece.keepRaster;
	if (G?.edge !== edge) {
		const nx = Math.ceil((piece.x1 - piece.x0) / KEEP_CELL) + 2, ny = Math.ceil((piece.y1 - piece.y0) / KEEP_CELL) + 2, D = new Float32Array(nx * ny), p = { x: 0, y: 0, z: 0 };
		for (let j = 0, o = 0; j < ny; j++) for (let i = 0; i < nx; i++, o++) {
			const q = piece.find(piece.x0 + i * KEEP_CELL, piece.y0 + j * KEEP_CELL);
			if (q < 0) { D[o] = NaN; continue; }
			piece.posOf(q, p, piece.w1, piece.w2);
			D[o] = Math.min(edge(p), 0.05);
		}
		G = piece.keepRaster = { edge, nx, ny, D };
	}
	// (a node off the piece knows nothing, NaN: the stone is close to an edge of some kind, so it asks)
	const fx = (u - piece.x0) / KEEP_CELL, fy = (v - piece.y0) / KEEP_CELL, i = fx | 0, j = fy | 0, o = j * G.nx + i, D = G.D, w = fx - i, h = fy - j;
	return (D[o] * (1 - w) + D[o + 1] * w) * (1 - h) + (D[o + G.nx] * (1 - w) + D[o + G.nx + 1] * w) * h;
}

// The stones of a pattern on a piece. opts: { cache: Map (the group's drawing between frames), edge(p, keepOut) }.
// -> stones on the body (the piece's own side; the caller mirrors)
export function patternStones(gen, piece, opts = {}) {
	const P = patternParams(gen, piece), layout = LAYOUTS[P.layout], flat = !!layout.flat, seed = gen.seed ?? 1;
	const d0 = sizeOf(P.size ?? 'ss12'), gap = P.gap ?? 1.2, frame = frameOf(P), edgeAt = (u, v) => piece.edgeAt(u, v);
	const mods = compileMods(P.mods, frame, edgeAt, gen.stone ?? 'Crystal AB');
	const shape = gen.shape ?? 'round', isRound = (SHAPES[shape]?.aspect ?? 1) === 1 && shape !== 'heart' && shape !== 'triangle' && shape !== 'star' && shape !== 'square';
	const m = flat ? { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, sc: 1, bend: null } : patternMap(P, distortion(P, seed));
	const box = flat ? { x0: piece.x0, x1: piece.x1, y0: piece.y0, y1: piece.y1, r: Math.hypot(piece.x1 - piece.x0, piece.y1 - piece.y0) / 2 } : boxOver(P, piece, m);
	const pitch = (d0 * gap) / m.sc, dart = !!layout.dart, [modLo] = sizeRange(P.mods);
	const fine = Math.min(1, Math.max(0.25, modLo * (layout.fine?.(P) ?? 1)));
	// sizes that vary with place: the modifier's answer, some of each of the sizes it falls between
	const diam = mods.size ? (u, v, k, t, cat, rank) => ditherSize(d0 * k * mods.size(u, v, k, t, cat, rank), frac(rank * 97.13 + 0.71)) : null;
	const E = scratch.reset(box, pitch, seed, flat ? edgeAt : null, { map: m, clip: piece, d0, gap, diam, fine, angles: !isRound, jitter: P.jitter ?? 0 });
	drawInto(gen, layout, P, E, box, pitch, seed, flat ? edgeAt : null, { d0, gap, fine }, opts.cache);
	const n = E.n, X = E.X, Y = E.Y, R = E.R, A = E.A, T = E.T, K = E.K, C = E.C, D = E.D, PR = E.P;

	// what the design hangs on first, then coarser before finer; a scatter's big stones claim their room first
	if (order.length < n) order = new Int32Array(Math.ceil(n * 1.5));
	const ord = order;
	if (dart && E.minK !== E.maxK || dart && diam) {
		const by = new Int32Array(SIZES.length + 2), idx = (d) => { let q = 0; while (q < SIZES.length - 1 && SIZES[q] < d - 1e-7) q++; return SIZES.length - 1 - q; };
		for (let i = 0; i < n; i++) by[idx(D[i]) + 1]++;
		for (let q = 1; q < by.length; q++) by[q] += by[q - 1];
		for (let i = 0; i < n; i++) ord[by[idx(D[i])]++] = i;
	} else if (E.minP !== E.maxP) {
		const by = new Int32Array(258);
		for (let i = 0; i < n; i++) by[PR[i] + 1]++;
		for (let q = 1; q < 258; q++) by[q] += by[q - 1];
		for (let i = 0; i < n; i++) ord[by[PR[i]]++] = i;
	} else for (let i = 0; i < n; i++) ord[i] = i;

	// each stone against those before it, on the flat cloth: a grid of cells the size of an ordinary stone, and for the
	// few much bigger ones a coarser one of their own, so that one big stone does not make every search long
	const clear = dart ? gap : FLAT_CLEAR, roomy = Math.max(clear, 1) * 1.01, usual = Math.min(E.maxD, d0 * 1.35), cell = Math.max(usual * roomy, 1e-3), bigCell = Math.max(E.maxD * roomy, 1e-3);
	const gx0 = piece.x0 - cell, gy0 = piece.y0 - cell, gw = Math.ceil((piece.x1 - gx0) / cell) + 3, gh = Math.ceil((piece.y1 - gy0) / cell) + 3, bx0 = piece.x0 - bigCell, by0 = piece.y0 - bigCell, bw = Math.ceil((piece.x1 - bx0) / bigCell) + 3, bh = Math.ceil((piece.y1 - by0) / bigCell) + 3;
	if (cellHead.length < gw * gh) cellHead = new Int32Array(gw * gh);
	if (bigHead.length < bw * bh) bigHead = new Int32Array(bw * bh);
	const head = cellHead, big = bigHead;
	head.fill(-1, 0, gw * gh); big.fill(-1, 0, bw * bh);
	if (hashNext.length < n) { const cap = Math.ceil(n * 1.5); hashNext = new Int32Array(cap); hashU = new Float32Array(cap); hashV = new Float32Array(cap); hashD = new Float32Array(cap); }
	const next = hashNext, HU = hashU, HV = hashV, HD = hashD;
	let nh = 0, anyBig = false;

	const overall = P.density ?? 1, margin = P.margin ?? 0, keepOut = P.keepOut, edge = opts.edge;
	const density = mods.density, colour = mods.colour ?? plainColour(gen), layer = gen.layer ?? null, id = gen.id, out = [];
	const turn = ((P.stoneTurn ?? 0) * Math.PI) / 180, upright = P.turn === 'fixed', upAngle = ((P.rotate ?? 0) * Math.PI) / 180;
	// a scatter's finest candidates are denser than its stones can be: a density means a share of what fits here
	const crowded = dart && fine < 1, meanK = layout.meanK?.(P) ?? 1;
	for (let o = 0; o < n; o++) {
		const i = ord[o], u = X[i], v = Y[i], k = K[i], t = T[i], cat = C[i], rank = R[i], d = D[i];
		let dens = overall;
		if (density) dens *= density(u, v, k, t, cat, rank);
		if (crowded && dens < 1) {
			const share = fine / ((d / (d0 * k)) * meanK), crowd = share < 1 ? share * share : 1;
			dens = dens * crowd + (1 - crowd) * Math.pow(dens, 10);
		}
		if (rank >= dens) continue;
		const room = piece.edgeAt(u, v);
		if (room < d / 2 + margin) continue;
		const q = piece.find(u, v);
		if (q < 0) continue;
		const w1 = piece.w1, w2 = piece.w2;
		const cu = Math.floor((u - gx0) / cell), cv = Math.floor((v - gy0) / cell), span = d <= usual ? 1 : Math.ceil((((usual + d) / 2) * clear) / cell);
		const j0 = cv - span < 0 ? 0 : cv - span, j1 = cv + span >= gh ? gh - 1 : cv + span, i0 = cu - span < 0 ? 0 : cu - span, i1 = cu + span >= gw ? gw - 1 : cu + span;
		let ok = true;
		for (let b = j0; b <= j1 && ok; b++) for (let a = i0; a <= i1 && ok; a++) {
			for (let e = head[b * gw + a]; e >= 0; e = next[e]) {
				const du = HU[e] - u, dv = HV[e] - v, c = ((HD[e] + d) / 2) * clear;
				if (du * du + dv * dv < c * c) { ok = false; break; }
			}
		}
		if (ok && anyBig) {
			const bu = Math.floor((u - bx0) / bigCell), bv = Math.floor((v - by0) / bigCell);
			for (let b = bv - 1; b <= bv + 1 && ok; b++) for (let a = bu - 1; a <= bu + 1 && ok; a++) {
				for (let e = big[b * bw + a]; e >= 0; e = next[e]) {
					const du = HU[e] - u, dv = HV[e] - v, c = ((HD[e] + d) / 2) * clear;
					if (du * du + dv * dv < c * c) { ok = false; break; }
				}
			}
		}
		if (!ok) continue;
		piece.posOf(q, _p3, w1, w2);
		// finished opening edges: the trim's keep-out (or the group's own), as for every other stone
		if (edge && room < NEAR_EDGE + (keepOut ?? 0)) {
			// (a raster kept with the piece answers most of them; the exact search only close to the line)
			const near = keepOut === undefined ? keepGrid(piece, edge, u, v) : NaN, sure = near > d / 2 + KEEP_SURE || near < d / 2 - KEEP_SURE;
			if (sure ? near < d / 2 : edge(_p3, keepOut) <= d / 2) continue;
		}
		HU[nh] = u; HV[nh] = v; HD[nh] = d;
		if (d <= usual) { const hk = cv * gw + cu; next[nh] = head[hk]; head[hk] = nh; }
		else { const hk = Math.floor((v - by0) / bigCell) * bw + Math.floor((u - bx0) / bigCell); next[nh] = big[hk]; big[hk] = nh; anyBig = true; }
		nh++;
		const h = frac(rank * 61.803398875 + 0.137);
		const angle = isRound ? h * Math.PI : piece.angleOf(q, (upright ? upAngle : A[i]) + turn);
		out.push({ sp: piece.spOf(q, w1, w2), size: d, stone: colour(u, v, k, t, cat, rank), angle, lift: 0, shape, gen: id, layer, x: _p3.x, y: _p3.y, z: _p3.z, r: h, fab: true });
	}
	return out;
}

// ctx: { cloth(panelId) -> { piece, pending, paired } | null, edge(p, keepOut) }; cache: Map (the group's
// drawing between frames).
export function runPattern(gen, ctx, cache = null) {
	const panel = ctx.doc.panels.find((p) => p.id === gen.on?.panel);
	if (!panel) throw new Error('No panel ' + gen.on?.panel);
	if (panel.removed) return [];
	const cloth = ctx.cloth?.(panel.id), piece = cloth?.piece;
	if (!piece) { if (cloth?.pending) ctx.pending?.add(gen.id); return []; }
	return patternStones(gen, piece, { cache, edge: ctx.edge });
}

// What a pattern's mirror half needs flipped when its two halves live on two pieces (doc/symmetry.js):
// the second piece's flat is the first's mirror image. The plane and the modifiers lie in the frame, so they
// flip with it. whole: all of a group's parameters; otherwise a change to some of them, which leaves the
// flip alone unless it is the change.
export function flipPatternParams(p, whole = false) {
	const out = { ...p };
	if (typeof out.x === 'number') out.x = -out.x;
	if (typeof out.rotate === 'number') out.rotate = -out.rotate;
	if (whole || 'flip' in p) out.flip = !p.flip;
	return out;
}

