// A stone pattern: a procedure laid on the flat cloth of one piece, cheap enough to re-run every
// frame of a drag. Its record is { kind: 'pattern', on: { panel }, params, ... }:
//   layout, preset: the arrangement (stones/layouts.js), its parameters, the gallery entry it started from
//   x, y, rotate (degrees), scale, flip: where the whole of it lies on the flat piece, its frame: the
//     arrangement and its modifiers move, turn and scale together
//   px, py, pturn, pscale, sx, sy: the arrangement's plane inside its frame (the card's Place, the crystals under it): this shifts
//     the crystals under the modifiers, which stay
//   mods: the modifiers on density, size and colour (stones/modifiers.js)
//   size, gap, density: the crystal and how close and how many; stone, shape on the record
//   twist, bulge, waveA, warp...: distortions; jitter: each stone's stray; margin, keepOut
//   turn, stoneTurn: which way shaped stones point
// Stones never scale: scaling moves them apart, or draws more of the lines. The pipeline: a layout draws
// through the pattern's map, so what arrives is on the cloth and evenly spaced there. Then per candidate,
// what the design hangs on first (stones/candidates.js pri), cheapest test first: density against its rank
// (so a stone kept at 40% is kept at 60%), the piece's edge, its triangle on the body, the openings' keep-out.
// Each stone on its own: stones may overlap (patternStones). Nothing here searches the body.
// Spec: knowledge/engineering/architecture/procedural-stone-patterns.md.
import { LAYOUTS, GALLERY_ITEMS, layoutDefaults } from './layouts.js';
import { Candidates, SIZES, realSize } from './candidates.js';
import { Geometry, PRI_LINE } from './geometry.js';
import { distortion, distortionReach, frac } from './fields.js';
import { layData, variantReady } from './gpu-lay.js';
import { modsBuffer } from './gpu-wgsl.js';
import { compileMods, modsFromOld, modWithGeometry, presetMods, sizeRange } from './modifiers.js';
import { sizeOf, SHAPES } from './library.js';
import { conflictsOf, aliveOf, resolvePeaks, blocked, FLAT_CLEAR } from './peaks.js';
import { laysStones, isDesign } from '../prints/designs.js';
import { inkBase, inkOf } from '../prints/ink.js';
import { strokesOf } from '../prints/strokes.js';

// how far from an opening edge a stone can be and still need the elastic's keep-out checked
const NEAR_EDGE = 0.03;

const scratch = new Candidates(20000), scratchGeometry = new Geometry();

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
const KEPT_BY_PRESET = ['x', 'y', 'rotate', 'flip', 'symmetric', 'size', 'gap', 'density', 'margin', 'keepOut', 'turn', 'stoneTurn', 'as'];
export function presetPatch(params, key, ownSize = 'ss12') {
	const it = GALLERY_ITEMS.get(key), patch = {}, last = GALLERY_ITEMS.get(params?.preset);
	for (const k of Object.keys(params ?? {})) patch[k] = undefined;
	for (const k of KEPT_BY_PRESET) if (params?.[k] !== undefined) patch[k] = params[k];
	if (last?.params?.size && last.params.size === params?.size) patch.size = ownSize;
	const own = (params?.mods ?? []).filter((m) => !m.preset);
	// the print's colours stay when they were chosen by hand (they are not the last preset's own); how they run is the new preset's
	const lastStops = last ? last.params?.ink?.stops ?? inkBase(last.layout).stops : null, mine = params?.ink?.stops;
	const ownStops = mine && JSON.stringify(mine) !== JSON.stringify(lastStops) ? mine : null;
	const ink = it.params?.ink || ownStops ? { ...(it.params?.ink ?? {}), ...(ownStops ? { stops: ownStops } : {}) } : undefined;
	return Object.assign(patch, { layout: it.layout, preset: key, ...layoutDefaults(it.layout), ...it.params, ink, mods: [...presetMods(it, own), ...own] });
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
	// a twist turns each ring of the pattern by its own angle: what lands on the piece comes from anywhere on the circle
	// through the piece's furthest corner
	if (P.twist) { x0 = y0 = -r; x1 = y1 = r; }
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

// A layout's geometry (stones/geometry.js) over the box: drawn afresh, or, for those worth keeping between frames (heavy),
// kept on a wider box and reused while the pattern's arrangement is the same and the box stays inside it.
const noCache = new Map();
function geometryOf(gen, layout, P, box, pitch, seed, edge, opts, cache) {
	if (!layout.heavy) { const G = scratchGeometry.reset(box, pitch, seed, edge, opts); layout.make(P, G); G.finish(); return G; }
	cache ??= noCache;
	let c = cache.get(gen.id);
	const key = drawingKey(P, layout, pitch, seed, opts.d0) + ':' + opts.angles;
	if (c?.key !== key || box.x0 < c.box.x0 || box.x1 > c.box.x1 || box.y0 < c.box.y0 || box.y1 > c.box.y1) {
		const wide = anchoredBox(box), G = c?.G ?? new Geometry();
		G.reset(wide, pitch, seed, edge, opts);
		layout.make(P, G);
		G.finish();
		cache.set(gen.id, c = { key, box: wide, G });
	}
	return c.G;
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

// Two rasters over a piece's flat cloth, read bilinearly, so that whether a stone is kept is a few lookups (on the CPU, and
// the same on the GPU later: knowledge/engineering/architecture/gpu-stone-placement.md), never a search of the body.
// Room: the distance to the piece's edge (ClothPiece.edgeAt's raster), less than nothing off the piece.
export function roomRaster(piece) {
	let G = piece.roomRaster;
	if (G) return G;
	piece.edgeAt(piece.x0, piece.y0); // (a ClothPiece builds its raster when first asked: this one's nodes, then)
	const own = !!piece.D, er = own ? piece.er : Math.max(0.003, Math.max(piece.x1 - piece.x0, piece.y1 - piece.y0) / 400);
	const dx0 = own ? piece.dx0 : piece.x0 - 4 * er, dy0 = own ? piece.dy0 : piece.y0 - 4 * er;
	const ex = own ? piece.ex : Math.ceil((piece.x1 - piece.x0) / er) + 10, ey = own ? piece.ey : Math.ceil((piece.y1 - piece.y0) / er) + 10, S = new Float32Array(ex * ey);
	for (let j = 0, o = 0; j < ey; j++) for (let i = 0; i < ex; i++, o++) {
		const u = dx0 + i * er, v = dy0 + j * er, e = own ? piece.D[o] : piece.edgeAt(u, v);
		S[o] = piece.find(u, v) >= 0 ? e : -Math.abs(e);
	}
	return (piece.roomRaster = { S, ex, ey, er, dx0, dy0 });
}
function roomAt(G, u, v) {
	let fx = (u - G.dx0) / G.er, fy = (v - G.dy0) / G.er;
	fx = fx < 0 ? 0 : fx > G.ex - 1.001 ? G.ex - 1.001 : fx; fy = fy < 0 ? 0 : fy > G.ey - 1.001 ? G.ey - 1.001 : fy;
	const i = Math.floor(fx), j = Math.floor(fy), a = fx - i, b = fy - j, q = j * G.ex + i, S = G.S, ex = G.ex;
	return (S[q] * (1 - a) + S[q + 1] * a) * (1 - b) + (S[q + ex] * (1 - a) + S[q + ex + 1] * a) * b;
}
// Keep-out: per node, the distance from its place on the body to the nearest finished opening less that opening's keep-out
// (K, the trim's), and the bare distance (B, for a group's own keepOut), as edge(p, keepOut) answers (render/engine.js
// edgeKeepOut); 5 cm at most. A node off the piece takes its place on the nearest triangle carried on in its plane. Made once
// for each state of the edges; only near the piece's edge (further in, nothing is near an opening).
const KEEP_CELL = 0.0025, KEEP_FAR = 0.05;
function keepRaster(piece, edge) {
	let G = piece.keepRaster;
	if (G?.edge === edge) return G;
	const R = roomRaster(piece), x0 = piece.x0 - KEEP_CELL, y0 = piece.y0 - KEEP_CELL;
	const nx = Math.ceil((piece.x1 - x0) / KEEP_CELL) + 3, ny = Math.ceil((piece.y1 - y0) / KEEP_CELL) + 3, K = new Float32Array(nx * ny), B = new Float32Array(nx * ny), p = { x: 0, y: 0, z: 0 };
	for (let j = 0, o = 0; j < ny; j++) for (let i = 0; i < nx; i++, o++) {
		const u = x0 + i * KEEP_CELL, v = y0 + j * KEEP_CELL;
		if (roomAt(R, u, v) > NEAR_EDGE + KEEP_FAR) { K[o] = B[o] = KEEP_FAR; continue; }
		let q = piece.find(u, v), w1 = piece.w1, w2 = piece.w2;
		if (q < 0) {
			q = piece.nearest?.(u, v) ?? -1;
			if (q < 0) { K[o] = B[o] = KEEP_FAR; continue; }
			const I = piece.inv, c = q * 6, du = u - I[c], dv = v - I[c + 1];
			w1 = I[c + 2] * du + I[c + 3] * dv; w2 = I[c + 4] * du + I[c + 5] * dv;
		}
		piece.posOf(q, p, w1, w2);
		K[o] = Math.min(edge(p), KEEP_FAR); B[o] = Math.min(edge(p, 0), KEEP_FAR);
	}
	return (piece.keepRaster = { edge, nx, ny, x0, y0, K, B });
}
function keepAt(G, A, u, v) {
	let fx = (u - G.x0) / KEEP_CELL, fy = (v - G.y0) / KEEP_CELL;
	fx = fx < 0 ? 0 : fx > G.nx - 1.001 ? G.nx - 1.001 : fx; fy = fy < 0 ? 0 : fy > G.ny - 1.001 ? G.ny - 1.001 : fy;
	const i = Math.floor(fx), j = Math.floor(fy), a = fx - i, b = fy - j, q = j * G.nx + i, nx = G.nx;
	return (A[q] * (1 - a) + A[q + 1] * a) * (1 - b) + (A[q + nx] * (1 - a) + A[q + nx + 1] * a) * b;
}

// A pattern's frame split in two: its rigid part (where it lies, its turn, its flip) and the rest (its scale, the plane, the
// distortion). Candidates are drawn in the frame's own space with the rest only, so moving, turning or flipping the pattern
// moves them without drawing them again: lines walked at the stones' spacing stay so (a rigid move keeps distances), and the
// modifiers' fields read the frame's own coordinates (stones/modifiers.js compileMods), which the rigid part leaves alone,
// except a field of the piece's edge. On the cloth: (x, y) + R(rotate) (F gx, gy). A flat layout (drawn on the cloth against
// the piece) has none. Design: knowledge/engineering/architecture/gpu-stone-placement.md.
export function rigidOf(P, flat) {
	if (flat) return { x: 0, y: 0, c: 1, s: 0, F: 1, a: 0 };
	const f = frameOf(P);
	return { x: f.x, y: f.y, c: f.c, s: f.s, F: f.F, a: ((P.rotate ?? 0) * Math.PI) / 180 };
}
// What a rigid move leaves alone in a pattern's parameters: the key of its drawn candidates.
const RIGID = new Set(['x', 'y', 'rotate', 'flip', 'density', 'margin', 'keepOut', 'stoneTurn', 'turn']);
// (what it is made as and its ink draw nothing of the crystals; except, where the crystals follow a printed design, how the
// ink's colours fall on it: prints/field-stones.js)
const INK_BANDS = ['soft', 'repeat', 'wrap', 'shift', 'balance', 'reverse', 'spread', 'wobble', 'wobbleL'];
function candidateKey(P, isRound, seed) {
	const sizeMods = (P.mods ?? []).filter((m) => !m.off && m.on === 'size'), byEdge = sizeMods.some((m) => m.shape === 'edge');
	const kept = {};
	for (const k of Object.keys(P)) if (k !== 'mods' && k !== 'ink' && k !== 'as' && (byEdge || !RIGID.has(k))) kept[k] = P[k];
	let bands = null;
	if (isDesign(P.layout)) { const ink = inkOf(P); bands = [ink.stops.map((c) => !!c), ...INK_BANDS.map((k) => ink[k])]; }
	return JSON.stringify([kept, sizeMods, isRound, seed, bands]);
}

// What must be drawn: the piece seen from the frame's own space (rigidOf).
function neededBox(piece, rigid) {
	const need = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
	for (const [u, v] of [[piece.x0, piece.y0], [piece.x1, piece.y0], [piece.x0, piece.y1], [piece.x1, piece.y1]]) {
		const du = u - rigid.x, dv = v - rigid.y, gx = (rigid.c * du + rigid.s * dv) * rigid.F, gy = rigid.c * dv - rigid.s * du;
		need.x0 = Math.min(need.x0, gx); need.x1 = Math.max(need.x1, gx); need.y0 = Math.min(need.y0, gy); need.y1 = Math.max(need.y1, gy);
	}
	return need;
}
const inside = (a, b) => a.x0 >= b.x0 && a.x1 <= b.x1 && a.y0 >= b.y0 && a.y1 <= b.y1;
// What is drawn: what must be, with a few millimetres round it when the arrangement itself changed (a slider of it, say: the
// next step will be the same; a heavy layout 2 cm); reached past by a turn (last: the drawing of the same arrangement, with the
// turn it was drawn at, rot): the circle round the frame's origin that holds the piece whichever way it turns, and 5 cm more, so
// a turn draws again once; by a move: what must be drawn and 5 cm more round it. Shared by patternCandidates and the GPU's
// scatter (scatterOnGpu).
function drawnBox(piece, rigid, need, layout, last, P) {
	if (last && last.rot === P.rotate) return anchoredBox({ x0: need.x0 - 0.05, x1: need.x1 + 0.05, y0: need.y0 - 0.05, y1: need.y1 + 0.05 }, 0.02);
	if (last) {
		let rho = 0;
		for (const [u, v] of [[piece.x0, piece.y0], [piece.x1, piece.y0], [piece.x0, piece.y1], [piece.x1, piece.y1]]) rho = Math.max(rho, Math.hypot(u - rigid.x, v - rigid.y));
		return anchoredBox({ x0: -rho - 0.05, x1: rho + 0.05, y0: -rho - 0.05, y1: rho + 0.05 }, 0.02);
	}
	return anchoredBox(need, layout.heavy ? 0.02 : 0.004);
}

// A pattern's candidate stones in its frame's own space (rigidOf), drawn again only when something other than the rigid part
// changes. -> { n, GX, GY, GA (direction), R (rank), K, T, C (family), D (diameter, size modifiers applied), rigid, P, d0,
// fine, dart, isRound, flat }. cache: the group's Map (the heavy layouts' drawing is kept there too).
export function patternCandidates(gen, piece, cache = null) {
	const P = patternParams(gen, piece), layout = LAYOUTS[P.layout], flat = !!layout.flat, seed = gen.seed ?? 1;
	const d0 = sizeOf(P.size ?? 'ss12'), gap = P.gap ?? 1.2, rigid = rigidOf(P, flat);
	const shape = gen.shape ?? 'round', isRound = (SHAPES[shape]?.aspect ?? 1) === 1 && shape !== 'heart' && shape !== 'triangle' && shape !== 'star' && shape !== 'square';
	const dart = !!layout.dart, [modLo] = sizeRange(P.mods), fine = Math.min(1, Math.max(0.25, modLo * (layout.fine?.(P) ?? 1)));
	// what must be drawn: the piece seen from the frame's own space (a flat layout: the piece itself); what is drawn: that
	// with a few millimetres round it when the arrangement itself changed (a slider of it, say: the next step will be the
	// same; a heavy layout, whose pen's moves are kept on their own wider box, 2 to 4 cm), reused while a move or a turn
	// stays inside
	const need = flat ? null : neededBox(piece, rigid);
	const key = candidateKey(P, isRound, seed);
	const c = cache?.get(gen.id + '#cand');
	if (c?.key === key && (flat || inside(need, c.local))) return { ...c.out, rigid, P };
	// (own: an arrangement drawn in the frame's own space, its map already in what it draws: the crystals that follow a printed
	// design, prints/field-stones.js)
	const own = !!layout.local;
	const m = flat || own ? { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, sc: 1, bend: null } : patternMap({ ...P, x: 0, y: 0, rotate: 0, flip: false }, distortion(P, seed));
	const local = flat ? null : drawnBox(piece, rigid, need, layout, c?.key === key ? c : null, P);
	const box = flat ? { x0: piece.x0, x1: piece.x1, y0: piece.y0, y1: piece.y1, r: Math.hypot(piece.x1 - piece.x0, piece.y1 - piece.y0) / 2 } : own ? { ...local } : boxOver(P, local, m);
	const pitch = (d0 * gap) / m.sc;
	// sizes that vary with place: the modifier's answer, some of each of the sizes it falls between; read in the frame's own
	// space (a field of the piece's edge asks the cloth there, so its key holds the rigid part too)
	const edgeAt = (u, v) => piece.edgeAt(u, v);
	const edgeLocal = flat ? edgeAt : (gx, gy) => piece.edgeAt(rigid.x + rigid.c * rigid.F * gx - rigid.s * gy, rigid.y + rigid.s * rigid.F * gx + rigid.c * gy);
	const S = flat ? 1 : frameOf(P).S, sizeMods = compileMods(P.mods, { x: 0, y: 0, c: 1, s: 0, S, F: 1 }, edgeLocal, gen.stone ?? 'Crystal AB').size;
	const diam = sizeMods ? (u, v, k, t, cat, rank) => ditherSize(d0 * k * sizeMods(u, v, k, t, cat, rank), frac(rank * 97.13 + 0.71)) : null;
	const E = scratch.reset(box, pitch, seed, flat ? edgeAt : null, { map: m, clip: flat ? piece : local, d0, gap, diam, fine, angles: !isRound, jitter: P.jitter ?? 0 });
	E.lay(geometryOf(gen, layout, P, box, pitch, seed, flat ? edgeAt : null, { d0, gap, fine, angles: !isRound, piece }, cache));
	const n = E.n, cut = (a) => a.slice(0, n);
	const out = { n, GX: cut(E.X), GY: cut(E.Y), GA: cut(E.A), R: cut(E.R), K: cut(E.K), T: cut(E.T), C: cut(E.C), D: cut(E.D), PR: cut(E.P), rigid, P, d0, gap, fine, dart, isRound, flat, varied: !!sizeMods };
	cache?.set(gen.id + '#cand', { key, local, rot: P.rotate, out });
	return out;
}

// Which of a pattern's candidates are kept, and how: packed arrays, nothing per stone allocated. opts: { cache, edge(p, keepOut) }.
// -> { n (kept), I (candidate index), U, V (on the cloth), A (direction on the cloth, the stone's turn applied), D (diameter),
// H (the stone's own random), stone (crystal names), Cd (the candidates) }.
// Each candidate passes or not on its own (density, room on the piece, the openings' keep-out), then the parallel rule
// (stones/peaks.js) keeps the stones apart: decided from the candidates alone, so what is shown during a drag is the design
// itself (owner, 2026-11-04: knowledge/decisions/2026-11-04-pattern-stones-kept-apart.md). opts.peaks: false lets them overlap
// (the superseded 2026-11-04 decision; tests and comparisons). On the WebGPU view a pattern is kept by its GPU twin,
// stones/gpu-keep.js (fed by patternGpu below); a change to the tests here is a change there. opts.blockers: the stones of patterns before this one on the
// piece (stones/peaks.js blockersOf), which this one's stones keep clear of. Before, each stone was checked against those kept before it,
// and the piece and the keep-out asked the body.
const kept = { I: new Int32Array(0), U: new Float64Array(0), V: new Float64Array(0), A: new Float64Array(0), D: new Float64Array(0), H: new Float64Array(0), stone: [] };
export function keepPattern(gen, piece, opts = {}) {
	const Cd = patternCandidates(gen, piece, opts.cache), { n, GX, GY, GA, R, K, T, C, D, P, d0, fine, dart, isRound } = Cd, rg = Cd.rigid;
	// the parallel rule (stones/peaks.js), unless opts.peaks is false: every candidate decided first, then each conflict
	// resolved by the candidates' standing; the stones the CPU path kept apart one by one, before 2026-11-04
	const peaks = opts.peaks !== false ? conflictsOf(Cd) : null, alive = peaks ? aliveOf(n) : null;
	const frame = frameOf(P), edgeAt = (u, v) => piece.edgeAt(u, v);
	const mods = compileMods(P.mods, frame, edgeAt, gen.stone ?? 'Crystal AB');
	const overall = P.density ?? 1, margin = P.margin ?? 0, keepOut = P.keepOut, edge = opts.edge;
	const density = mods.density, colour = mods.colour ?? plainColour(gen);
	const turn = ((P.stoneTurn ?? 0) * Math.PI) / 180, upright = P.turn === 'fixed', upAngle = ((P.rotate ?? 0) * Math.PI) / 180;
	const rx = rg.x, ry = rg.y, rc = rg.c, rs = rg.s, rF = rg.F, ra = rg.a;
	const B = opts.blockers ?? null, room = roomRaster(piece), keep = edge ? keepRaster(piece, edge) : null, KA = keep ? (keepOut === undefined ? keep.K : keep.B) : null, less = keepOut ?? 0;
	if (kept.I.length < n) { const cap = Math.ceil(n * 1.5); kept.I = new Int32Array(cap); kept.U = new Float64Array(cap); kept.V = new Float64Array(cap); kept.A = new Float64Array(cap); kept.D = new Float64Array(cap); kept.H = new Float64Array(cap); }
	const { I, U, V, A, D: KD, H } = kept, names = [];
	let m = 0;
	for (let i = 0; i < n; i++) {
		const gx = GX[i], gy = GY[i], u = rx + rc * rF * gx - rs * gy, v = ry + rs * rF * gx + rc * gy, k = K[i], t = T[i], cat = C[i], rank = R[i], d = D[i];
		let dens = overall;
		if (density) dens *= density(u, v, k, t, cat, rank);
		// a scatter's candidates are a blue-noise tile in ranked order whose first points lie furthest apart (stones/layouts-lattice.js
		// blueTile), spaced for its smallest stones: a bigger stone keeps the first share of them, those spaced for its own size. So
		// stones of one size keep their room by how they are made, not by checking each other (big among small may overlap).
		if (dart && !peaks) { const f = (d0 * fine) / d; if (f < 1) dens *= f * f; }
		if (rank >= dens) continue;
		const r = roomAt(room, u, v);
		if (r < d / 2 + margin) continue;
		// finished opening edges: the trim's keep-out (or the group's own), as for every other stone
		if (KA && r < NEAR_EDGE + less && keepAt(keep, KA, u, v) - less < d / 2) continue;
		// clear of the patterns before it on this piece
		if (B && blocked(B, u, v, d)) continue;
		if (peaks) { alive[i] = 1; continue; }
		const h = frac(rank * 61.803398875 + 0.137);
		I[m] = i; U[m] = u; V[m] = v; KD[m] = d; H[m] = h;
		// (its direction on the cloth: the frame's own, turned and mirrored with the frame; a round stone's spin is its own)
		A[m] = isRound ? NaN : (upright ? upAngle : ra + (rF < 0 ? Math.PI - GA[i] : GA[i])) + turn;
		names.push(colour(u, v, k, t, cat, rank));
		m++;
	}
	if (peaks) {
		const won = resolvePeaks(peaks, alive, opts.parallel);
		for (let i = 0; i < n; i++) {
			if (!won[i]) continue;
			const gx = GX[i], gy = GY[i], u = rx + rc * rF * gx - rs * gy, v = ry + rs * rF * gx + rc * gy, rank = R[i];
			I[m] = i; U[m] = u; V[m] = v; KD[m] = D[i]; H[m] = frac(rank * 61.803398875 + 0.137);
			A[m] = isRound ? NaN : (upright ? upAngle : ra + (rF < 0 ? Math.PI - GA[i] : GA[i])) + turn;
			names.push(colour(u, v, K[i], T[i], C[i], rank));
			m++;
		}
		return { n: m, I, U, V, A, D: KD, H, stone: names, Cd, rounds: resolvePeaks.rounds };
	}
	return { n: m, I, U, V, A, D: KD, H, stone: names, Cd };
}

// The stones of a pattern on a piece, as records. opts: { cache: Map (the group's drawing between frames), edge(p, keepOut) }.
// -> stones on the body (the piece's own side; the caller mirrors)
export function patternStones(gen, piece, opts = {}) { return packRecords(gen, piece, keepPattern(gen, piece, opts)); }
// The records of a kept set (keepPattern, or a pack's copy of one: packPattern).
export function packRecords(gen, piece, k) {
	const { U, V, A, D, H, stone } = k, shape = gen.shape ?? 'round', layer = gen.layer ?? null, id = gen.id, out = [];
	for (let j = 0; j < k.n; j++) {
		const u = U[j], v = V[j];
		// its triangle; one kept by the room raster just past the piece's last triangle takes that one, carried on
		let q = piece.find(u, v), w1 = piece.w1, w2 = piece.w2;
		if (q < 0) {
			q = piece.nearest?.(u, v) ?? -1;
			if (q < 0) continue;
			const I = piece.inv, c = q * 6, du = u - I[c], dv = v - I[c + 1];
			w1 = I[c + 2] * du + I[c + 3] * dv; w2 = I[c + 4] * du + I[c + 5] * dv;
		}
		piece.posOf(q, _p3, w1, w2);
		const angle = Number.isNaN(A[j]) ? H[j] * Math.PI : piece.angleOf(q, A[j]);
		// fit: where on a fitted garment's fabric (stones/fitted-cloth.js), drawn there rather than on the body under it
		// flat, fu, fv: the piece it was laid on and where on its flat cloth, so the flat view draws it without finding it again
		// from its surface point (ui/FlatStones.jsx stonesFor; a mirrored copy keeps them: stones/generators.js mirrored)
		out.push({ sp: piece.spOf(q, w1, w2), fit: piece.fitOf?.(q, w1, w2), size: D[j], stone: stone[j], angle, lift: 0, shape, gen: id, layer, x: _p3.x, y: _p3.y, z: _p3.z, r: H[j], fab: true, flat: piece, fu: u, fv: v });
	}
	return out;
}

// Where each node of a piece's room raster (roomRaster: the same grid) lies on the body, and where its mirror image does
// (mirrorPos(sp) -> { x, y, z }), as packRecords and stones/generators.js stonesOfGroup place a stone there: what a group made
// symmetric, cut to one side or erased is cut by on the GPU (stones/gpu-keep.js FILTER, read bilinearly). Made once a piece.
// -> Float32Array: x, y, z a node, then the mirror's
export function posRasters(piece, mirrorPos) {
	if (piece.posRasters) return piece.posRasters;
	const R = roomRaster(piece), n = R.ex * R.ey, out = new Float32Array(n * 6), p = { x: 0, y: 0, z: 0 };
	for (let j = 0, o = 0; j < R.ey; j++) for (let i = 0; i < R.ex; i++, o++) {
		const u = R.dx0 + i * R.er, v = R.dy0 + j * R.er;
		let q = piece.find(u, v), w1 = piece.w1, w2 = piece.w2;
		if (q < 0) {
			q = piece.nearest?.(u, v) ?? -1;
			if (q < 0) continue;
			const I = piece.inv, c = q * 6, du = u - I[c], dv = v - I[c + 1];
			w1 = I[c + 2] * du + I[c + 3] * dv; w2 = I[c + 4] * du + I[c + 5] * dv;
		}
		piece.posOf(q, p, w1, w2);
		out[o * 3] = p.x; out[o * 3 + 1] = p.y; out[o * 3 + 2] = p.z;
		const m = mirrorPos(piece.spOf(q, w1, w2));
		out[(n + o) * 3] = m.x; out[(n + o) * 3 + 1] = m.y; out[(n + o) * 3 + 2] = m.z;
	}
	return (piece.posRasters = out);
}

// A crystal arrangement's drawing as what prints (prints/strokes.js): its lines as short stretches in the frame's own space, with
// the frame's rigid part beside them (toCloth, columns first), drawn again only when something other than the rigid part changes;
// and its single crystals as dots where they are kept (in the cloth's space: they are the kept stones themselves, so a
// printed dot lies under its crystal). opts: { cache, edge, dot: a dot's size as a factor of its crystal's, width: the line's }.
// -> { segs, nSegs, toCloth, dots, nDots }
export function patternStrokes(gen, piece, opts = {}) {
	const P = patternParams(gen, piece), layout = LAYOUTS[P.layout], flat = !!layout.flat, seed = gen.seed ?? 1, cache = opts.cache;
	const d0 = sizeOf(P.size ?? 'ss12'), gap = P.gap ?? 1.2, rigid = rigidOf(P, flat);
	const need = flat ? null : neededBox(piece, rigid), key = candidateKey(P, true, seed);
	let c = cache?.get(gen.id + '#strokes');
	if (!(c?.key === key && (flat || inside(need, c.local)))) {
		const m = flat ? { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, sc: 1, bend: null } : patternMap({ ...P, x: 0, y: 0, rotate: 0, flip: false }, distortion(P, seed));
		const local = flat ? null : drawnBox(piece, rigid, need, layout, c?.key === key ? c : null, P);
		const box = flat ? { x0: piece.x0, x1: piece.x1, y0: piece.y0, y1: piece.y1, r: Math.hypot(piece.x1 - piece.x0, piece.y1 - piece.y0) / 2 } : boxOver(P, local, m);
		const pitch = (d0 * gap) / m.sc, edgeAt = (u, v) => piece.edgeAt(u, v);
		const G = geometryOf(gen, layout, P, box, pitch, seed, flat ? edgeAt : null, { d0, gap, fine: 1, angles: false, piece }, cache);
		c = { key, local, rot: P.rotate, out: strokesOf(G, m, flat ? piece : local) };
		cache?.set(gen.id + '#strokes', c);
	}
	// the dots: every kept crystal that is not one of a line's own (a joint, a lattice's, a scatter's)
	const dotK = opts.dot ?? 0, half = (opts.width ?? 0.002) / 2;
	let dots = null, nDots = 0;
	if (dotK > 0) {
		const k = keepPattern(gen, piece, { cache, edge: opts.edge }), PR = k.Cd.PR;
		dots = new Float32Array(Math.max(k.n, 1) * 5);
		for (let j = 0; j < k.n; j++) {
			if (PR[k.I[j]] === PRI_LINE) continue;
			const o = nDots++ * 5;
			dots[o] = dots[o + 2] = k.U[j]; dots[o + 1] = dots[o + 3] = k.V[j]; dots[o + 4] = Math.max((k.D[j] * dotK) / 2 - half, 0);
		}
	}
	return { ...c.out, toCloth: new Float32Array([rigid.c * rigid.F, rigid.s * rigid.F, 0, -rigid.s, rigid.c, 0, rigid.x, rigid.y, 1]), dots, nDots };
}

// ctx: { cloth(panelId) -> { piece, pending, paired } | null, edge(p, keepOut) }; cache: Map (the group's
// drawing between frames).
export function runPattern(gen, ctx, cache = null, blockers = null) {
	const panel = ctx.doc.panels.find((p) => p.id === gen.on?.panel);
	if (!panel) throw new Error('No panel ' + gen.on?.panel);
	if (panel.removed || !laysStones(gen.params)) return []; // (a pattern made only as print lays no crystals)
	const cloth = ctx.cloth?.(panel.id), piece = cloth?.piece;
	if (!piece) { if (cloth?.pending) ctx.pending?.add(gen.id); return []; }
	return patternStones(gen, piece, { cache, edge: ctx.edge, peaks: ctx.peaks, blockers });
}
// A pattern's kept stones as packed arrays of its own (keepPattern's are reused), for the GPU to place
// (stones/gpu-view.js); null when there are none to place. -> { piece, k: { n, U, V, A, D, H, stone } }
export function packPattern(gen, ctx, cache = null, blockers = null) {
	const panel = ctx.doc.panels.find((p) => p.id === gen.on?.panel);
	if (!panel) throw new Error('No panel ' + gen.on?.panel);
	if (panel.removed || !laysStones(gen.params)) return null;
	const cloth = ctx.cloth?.(panel.id), piece = cloth?.piece;
	if (!piece) { if (cloth?.pending) ctx.pending?.add(gen.id); return null; }
	const own = () => { const k = keepPattern(gen, piece, { cache, edge: ctx.edge, peaks: ctx.peaks, blockers: blockers?.grid ?? null }), n = k.n; return { n, U: k.U.slice(0, n), V: k.V.slice(0, n), A: k.A.slice(0, n), D: k.D.slice(0, n), H: k.H.slice(0, n), stone: k.stone }; };
	// kept on the GPU where it can be (ctx.gpuKeep: the WebGPU view): the CPU's kept set only when something asks for it; the patterns
	// before it on its piece (blockers: stones/generators.js blockersFrom) kept clear of there too (stones/gpu-keep.js BLOCK)
	const gpu = ctx.gpuKeep && ctx.peaks !== false ? patternGpu(gen, piece, { cache, edge: ctx.edge }) : null;
	if (gpu) { gpu.blockers = blockers; let k = null; return { piece, gpu, get k() { return (k ??= own()); } }; }
	return { piece, k: own() };
}

// A pattern's share of the GPU's lay and keep (stones/gpu-lay.js, stones/gpu-keep.js: the twins of patternCandidates and keepPattern
// above; a change to one is a change to the other). -> {
//   lay: the geometry packed for the GPU and how it is laid (stones/gpu-lay.js layData; one object while the candidates stay: a
//        new one when the arrangement, its size modifiers or the drawn box change), with the standing rule's dart, clear, varied
//   mods: the modifiers and crystals as the GPU reads them (stones/gpu-wgsl.js modsBuffer; a new object when any changes), names
//   frame: this frame's values: the rigid part, density, margin, keep-out, turns, the frame the modifiers lie in
//   room (roomRaster), D (the piece's edge distance raster), edges (the openings' keep-out raster: { A, nx, ny, x0, y0, cell }, or null)
// } The GPU keeper (stones/gpu-view.js PackView) hangs its GpuKeep on it as .keeper. Null where the GPU cannot lay it (more than four
// million candidate slots). opts: { cache, edge }.
export function patternGpu(gen, piece, opts = {}) {
	const P = patternParams(gen, piece), layout = LAYOUTS[P.layout], flat = !!layout.flat, seed = gen.seed ?? 1, cache = opts.cache;
	const d0 = sizeOf(P.size ?? 'ss12'), gap = P.gap ?? 1.2, rigid = rigidOf(P, flat);
	const shape = gen.shape ?? 'round', isRound = (SHAPES[shape]?.aspect ?? 1) === 1 && shape !== 'heart' && shape !== 'triangle' && shape !== 'star' && shape !== 'square';
	const [modLo] = sizeRange(P.mods), fine = Math.min(1, Math.max(0.25, modLo * (layout.fine?.(P) ?? 1)));
	// the same box as patternCandidates draws (kept under its own name: the CPU twin keeps its own)
	const need = flat ? null : neededBox(piece, rigid), key = candidateKey(P, isRound, seed), c = cache?.get(gen.id + '#gpucand');
	let lay = c?.key === key && (flat || inside(need, c.local)) ? c.lay : null;
	if (!lay) {
		const own = !!layout.local; // (as patternCandidates: drawn in the frame's own space)
		const m = flat || own ? { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, sc: 1, bend: null } : patternMap({ ...P, x: 0, y: 0, rotate: 0, flip: false }, distortion(P, seed));
		const local = flat ? null : drawnBox(piece, rigid, need, layout, c?.key === key ? c : null, P);
		const box = flat ? { x0: piece.x0, x1: piece.x1, y0: piece.y0, y1: piece.y1, r: Math.hypot(piece.x1 - piece.x0, piece.y1 - piece.y0) / 2 } : own ? { ...local } : boxOver(P, local, m);
		const pitch = (d0 * gap) / m.sc, edgeAt = (u, v) => piece.edgeAt(u, v), diam = (P.mods ?? []).some((q) => !q.off && q.on === 'size');
		const G = geometryOf(gen, layout, P, box, pitch, seed, flat ? edgeAt : null, { d0, gap, fine, angles: !isRound, piece }, cache);
		const bend = flat || !m.bend ? null : { twist: P.twist ?? 0, bulge: P.bulge ?? 0, R2: (P.bulgeR ?? 0.08) ** 2, waveA: P.waveA ?? 0, waveL: P.waveL ?? 0.06, warp: P.warp ?? 0, warpL: P.warpL ?? 0.08, seed };
		const data = layData(G, { map: m, bend, clip: flat ? piece : local, pitch, d0, d1: realSize(d0), gap, fine, angles: !isRound, jitter: P.jitter ?? 0, seed, diam, S: flat ? 1 : frameOf(P).S, rigid, flat });
		if (data.estSlots > 4e6) return null;
		lay = { ...data, dart: !!layout.dart, clear: layout.dart ? gap : FLAT_CLEAR, varied: diam };
		cache?.set(gen.id + '#gpucand', { key, local, rot: P.rotate, lay });
	}
	// (its kind of geometry's kernels still compiling: the CPU twin keeps it meanwhile)
	if (!variantReady(lay.variant)) return null;
	// the modifiers and crystals (index 0 the group's own)
	const msig = JSON.stringify([P.mods, gen.stone, gen.palette]);
	let mods = cache?.get(gen.id + '#gpumods');
	if (mods?.sig !== msig) {
		const names = [gen.stone ?? 'Crystal AB'];
		mods = { sig: msig, data: modsBuffer(P.mods, names, gen.palette, SIZES), names };
		cache?.set(gen.id + '#gpumods', mods);
	}
	const keepOut = P.keepOut, edge = opts.edge, keep = edge ? keepRaster(piece, edge) : null, room = roomRaster(piece);
	const turn = ((P.stoneTurn ?? 0) * Math.PI) / 180, upright = P.turn === 'fixed', f = frameOf(P);
	return {
		lay, mods, room, D: piece.D ?? null, piece,
		edges: keep ? { A: keepOut === undefined ? keep.K : keep.B, nx: keep.nx, ny: keep.ny, x0: keep.x0, y0: keep.y0, cell: KEEP_CELL } : null,
		frame: {
			rx: rigid.x, ry: rigid.y, rc: rigid.c, rs: rigid.s, rF: rigid.F, ra: rigid.a, overall: P.density ?? 1, margin: P.margin ?? 0, less: keepOut ?? 0,
			turn, upAngle: ((P.rotate ?? 0) * Math.PI) / 180, nearEdge: NEAR_EDGE, flags: (upright ? 2 : 0) | (isRound ? 4 : 0),
			fx: f.x, fy: f.y, fc: f.c, fs: f.s, fS: f.S, fF: f.F,
		},
	};
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

