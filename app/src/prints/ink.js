// A pattern's print: what it is made as (crystals, print, or both), the colours of its ink and how they run along the
// design, and all of it as what the print shaders read (prints/glsl.js, prints/engine.js). Pure: nothing here needs the
// GPU, so it is what the tests and the card's own pictures read too.
//   params.as    'stones' | 'print' | 'both': a crystal arrangement starts as crystals, a printed design as print
//   params.ink   { stops: colours along the design ('#rrggbb', or null: the cloth's own, nothing printed there),
//                  soft: 0 (hard edges) .. 1 (one smooth blend), repeat: times the colours go round, wrap: once | repeat |
//                  mirror (there and back), shift: the colours slid along, balance: -1..1 (more of the first or the last),
//                  reverse, strength: 0..1 how much ink, tint: the ink dyes the cloth's colour instead of covering it,
//                  width: a drawn arrangement's line (metres), dot: its dots, as a factor of the crystal they sit under }
// Spec: knowledge/engineering/architecture/printed-patterns.md.
import { frameOf, patternMap } from '../stones/pattern.js';
import { designFloats, designOf, isDesign, AS, madeAs, printsInk, laysStones, PREFIX } from './designs.js';
export { isDesign, AS, madeAs, printsInk, laysStones };
import { MAX_STOPS, MAX_MODS } from './glsl.js';

export const INK_DEFAULTS = { stops: ['#16205c', '#1b3fb5', '#8cc6ec', '#f4f4f2'], soft: 0, repeat: 1, wrap: 'once', shift: 0, balance: 0, reverse: false, strength: 1, tint: false, width: 0.002, dot: 1.5 };
// a drawn arrangement prints as a line of one colour on the cloth's own
const LINE_INK = { stops: ['#e6bf58', null], soft: 0.25 };
export const WRAPS = { once: 0, repeat: 1, mirror: 2 };

// The ink a pattern starts with, before its own settings: the design's, or a line's.
export const inkBase = (layout) => ({ ...INK_DEFAULTS, ...(isDesign(layout) ? designOf(layout).ink : LINE_INK) });
export function inkOf(P) {
	const ink = { ...inkBase(P.layout), ...(P.ink ?? {}) };
	ink.stops = (ink.stops?.length ? ink.stops : INK_DEFAULTS.stops).slice(0, MAX_STOPS);
	return ink;
}

// --- colour ---------------------------------------------------------------------------------------------
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export function hexToLinear(hex) {
	const h = /^#?([0-9a-f]{6})$/i.exec(hex ?? '')?.[1] ?? '888888';
	return [0, 2, 4].map((i) => toLinear(parseInt(h.slice(i, i + 2), 16) / 255));
}
export function linearToOklab([r, g, b]) {
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
// The colours as the shader blends them: OKLab (an even blend, no muddy middle) and how much each covers. A stop that
// is the cloth's own takes its neighbour's colour at no cover, so the ink fades out without changing hue.
export function packStops(ink) {
	const stops = ink.reverse ? [...ink.stops].reverse() : ink.stops, n = stops.length, data = new Float32Array(MAX_STOPS * 4);
	for (let i = 0; i < n; i++) {
		let hex = stops[i];
		for (let d = 1; !hex && d < n; d++) hex = stops[i - d] ?? stops[i + d] ?? null;
		data.set([...linearToOklab(hexToLinear(hex ?? '#888888')), stops[i] ? 1 : 0], i * 4);
	}
	return { data, n, any: stops.some(Boolean) };
}
export const gammaOf = (balance) => 2 ** (-2 * Math.max(-1, Math.min(1, balance ?? 0)));

// How a value along the design falls on the colours: the twin of prints/glsl.js inkOf, for what follows a print without
// drawing it. -> { a, d }: stop i sits at a + i d (colours meet halfway between); cyc: the colours go round.
export function bandsOf(ink) {
	const N = ink.stops.length, cyc = ink.wrap === 'repeat', sp = ink.soft * (ink.spread ?? 1);
	return { N, cyc, a: cyc ? 0.5 / N : 0.5 / N + (0 - 0.5 / N) * sp, d: cyc ? 1 / N : 1 / N + (1 / Math.max(N - 1, 1) - 1 / N) * sp };
}
// The colour at band coordinate e (prints/glsl.js: the shader's `u`), as the index of the stop that owns it.
export function stopAt(e, N, cyc, reverse = false) {
	let i = Math.round(e);
	i = cyc ? ((i % N) + N) % N : Math.max(0, Math.min(N - 1, i));
	return reverse ? N - 1 - i : i;
}

// The colours as a CSS picture of the ramp, soft or hard as the print is (the card's bar).
export function rampCss(ink, cloth = '#8a8a8a') {
	const stops = ink.reverse ? [...ink.stops].reverse() : ink.stops, n = stops.length, col = (s) => s ?? cloth, parts = [];
	if (n < 2) return col(stops[0]);
	const { a, d, cyc } = bandsOf(ink), s = Math.max(ink.soft, 0.001), pc = (t) => (Math.max(0, Math.min(1, t)) * 100).toFixed(2) + '%';
	// stop i holds from the end of the blend before it to the start of the blend after it
	for (let i = cyc ? -1 : 0; i < (cyc ? n + 1 : n); i++) {
		const c = col(stops[((i % n) + n) % n]), mid = a + i * d, from = mid - d / 2 + (s * d) / 2, to = mid + d / 2 - (s * d) / 2;
		parts.push(`${c} ${pc(i === 0 && !cyc ? 0 : from)}`, `${c} ${pc(i === n - 1 && !cyc ? 1 : to)}`);
	}
	return `linear-gradient(90deg, ${parts.join(', ')})`;
}

// --- a pattern as a layer of print ----------------------------------------------------------------------------
const MOD_SHAPE_IDS = { linear: 0, reflected: 1, radial: 2, oval: 3, diamond: 4, square: 5, sweep: 6, spiral: 7, waves: 8, ripple: 9, stripes: 10, checks: 11, clouds: 12, edge: 13 };
// The pattern's density modifiers as how much ink where (those that follow the crystals themselves mean nothing to ink).
export function packMods(mods) {
	const A = new Float32Array(MAX_MODS * 4), B = new Float32Array(MAX_MODS * 4), C = new Float32Array(MAX_MODS * 4), D = new Float32Array(MAX_MODS * 4);
	let n = 0, edge = false;
	for (const m of mods ?? []) {
		if (m.off || m.on !== 'density' || MOD_SHAPE_IDS[m.shape] === undefined || n >= MAX_MODS) continue;
		const a = ((m.a ?? 0) * Math.PI) / 180, o = n * 4;
		A.set([m.x ?? 0, m.y ?? 0, Math.cos(a), Math.sin(a)], o);
		B.set([m.w ?? 0.1, m.h ?? m.w ?? 0.1, m.from ?? 1, m.to ?? 0], o);
		C.set([MOD_SHAPE_IDS[m.shape], m.power ?? 1, (m.clip ? 1 : 0) | (m.reverse ? 2 : 0) | (m.blend === 'add' ? 4 : 0), Math.max(m.feather ?? 0, 0)], o);
		D.set([m.seed ?? 0, 0, 0, 0], o);
		if (m.shape === 'edge') edge = true;
		n++;
	}
	return { n, A, B, C, D, edge };
}

// 3 x 3 matrices as WebGL takes them (columns first).
export const mat3 = (a, b, c, d, e, f) => new Float32Array([a, c, 0, b, d, 0, e, f, 1]); // (x, y) -> (a x + b y + e, c x + d y + f)
// the flat cloth -> the arrangement's own space: the inverse of stones/pattern.js patternMap
export function clothToDesign(M) {
	const det = M.a * M.d - M.b * M.c || 1e-12, ia = M.d / det, ib = -M.b / det, ic = -M.c / det, id = M.a / det;
	return mat3(ia, ib, ic, id, -(ia * M.e + ib * M.f), -(ic * M.e + id * M.f));
}
// the flat cloth -> the frame the modifiers lie in (stones/pattern.js clothToFrame)
export function clothToFrame(f) {
	const a = (f.c * f.F) / f.S, b = (f.s * f.F) / f.S, c = -f.s / f.S, d = f.c / f.S;
	return mat3(a, b, c, d, -(a * f.x + b * f.y), -(c * f.x + d * f.y));
}

const seedPair = (seed) => [((seed * 0.6180339887) % 1) * 97 + 1.3, ((seed * 0.7548776662) % 1) * 89 + 2.7];

// What the print shaders need of a pattern, whatever draws its value (a design's field, or the distance to a drawn
// arrangement): its colours, how they run, how much ink where. P: stones/pattern.js patternParams. local: in the frame's
// own space (the crystals that follow a design are laid there: stones/pattern.js rigidOf), as if the pattern lay unturned
// on the origin.
export function inkUniforms(P, { local = false, base = [0.5, 0.5, 0.5], sym = null } = {}) {
	const ink = inkOf(P), stops = packStops(ink), Pl = local ? { ...P, x: 0, y: 0, rotate: 0, flip: false } : P, f = frameOf(Pl), mods = packMods(P.mods);
	return {
		stops: stops.data, n: stops.n, any: stops.any,
		ink: [ink.soft, Math.max(ink.repeat ?? 1, 0.01), ink.shift ?? 0, gammaOf(ink.balance)],
		ink2: [WRAPS[ink.wrap] ?? 0, ink.spread ?? 1, Math.max(0, Math.min(1, ink.strength ?? 1)), ink.tint ? 1 : 0],
		base, sym: sym ?? [0, 0, 1], clothToFrame: clothToFrame(f), mods,
	};
}

// A printed design as a layer: its shader's settings and where its own space lies on the cloth.
export function designLayer(gen, P, opts = {}) {
	const D = designOf(P.layout), seed = gen.seed ?? 1, Pl = opts.local ? { ...P, x: 0, y: 0, rotate: 0, flip: false } : P;
	const M = D.flat ? { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, sc: 1 } : patternMap(Pl);
	return {
		kind: 'design', design: P.layout.slice(PREFIX.length), D: designFloats(D, P), V: D.pack?.(P, seed) ?? null, seed: seedPair(seed),
		clothToDesign: clothToDesign(M), sc: M.sc,
		bend0: D.flat ? [0, 0, 1, 0] : [P.twist ?? 0, P.bulge ?? 0, (P.bulgeR ?? 0.08) ** 2, P.waveA ?? 0],
		bend1: D.flat ? [1, 0, 1, 0] : [P.waveL ?? 0.06, P.warp ?? 0, P.warpL ?? 0.08, seed % 100000],
		edge: D.flat || /edgeDist/.test(D.glsl),
		...inkUniforms(P, opts),
	};
}
// A drawn arrangement as a layer: the distance to its lines and dots (prints/strokes.js, prints/engine.js), along the
// colours with the first as wide as the line. strokes: { segs, dots, toCloth } of prints/strokes.js.
export function strokeLayer(gen, P, strokes, opts = {}) {
	const u = inkUniforms(P, opts), ink = inkOf(P), w = Math.max(ink.width ?? 0.002, 0.0002);
	// each colour a band half the line's width, out from the line's middle; the last goes on for ever
	return { kind: 'strokes', strokes, width: w, reach: (u.n * w) / 2, ...u, ink2: [u.ink2[0], 0, u.ink2[2], u.ink2[3]] };
}
