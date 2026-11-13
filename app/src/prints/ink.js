// A pattern's print: what it is made as (crystals, print, or both), the colours of its three flat sections, and all of
// it as what the print shaders read (prints/glsl.js, prints/engine.js). Pure: nothing here needs the GPU, so it is what
// the tests and the card's own pictures read too.
//   params.as    'stones' | 'print' | 'both': a crystal arrangement starts as crystals, a printed design as print
//   params.ink   { ground, accent, accent2: each section's colour, one of
//                    null       the fabric's own: nothing printed there
//                    'auto'     a shade of the fabric's colour that stands out from it (autoShade)
//                    a number   a shade of the fabric's colour: that much lighter (+) or darker (-), in OKLab lightness
//                    '#rrggbb'  a colour
//                  width: a drawn arrangement's line (metres), dot: its dots, as a factor of the crystal they sit under,
//                  wobble, wobbleL: the design's edges made to wander (how far, and the size of the wander, metres) }
// The ground starts as the fabric's own and the accents as shades of it; nothing blends into anything.
// Spec: knowledge/engineering/architecture/printed-patterns.md.
import { frameOf, patternMap } from '../stones/pattern.js';
import { designFloats, designOf, isDesign, AS, madeAs, printsInk, laysStones, PREFIX } from './designs.js';
export { isDesign, AS, madeAs, printsInk, laysStones };
import { MAX_MODS } from './glsl.js';

export const SECTIONS = ['ground', 'accent', 'accent2'];
export const INK_DEFAULTS = { ground: null, accent: 'auto', accent2: 'auto', width: 0.002, dot: 1.5, wobble: 0, wobbleL: 0.03 };

// The ink a pattern starts with, before its own settings: the design's over the defaults.
export const inkBase = (layout) => ({ ...INK_DEFAULTS, ...(designOf(layout)?.ink ?? {}) });
export function inkOf(P) {
	const own = P.ink ?? {}, ink = { ...inkBase(P.layout), ...own };
	// (a record of the first prints, colours along a ramp: its first two printed colours are the accents)
	if (Array.isArray(own.stops) && own.accent === undefined) { const c = own.stops.filter(Boolean); if (c[0]) ink.accent = c[0]; if (c[1]) ink.accent2 = c[1]; }
	return ink;
}
// Whether the pattern has a second accent to colour (a drawn arrangement prints in one).
export const hasTwo = (P) => !!designOf(P.layout)?.two?.(P);

// --- colour ---------------------------------------------------------------------------------------------
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4), toSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
export function hexToLinear(hex) {
	const h = /^#?([0-9a-f]{6})$/i.exec(hex ?? '')?.[1] ?? '888888';
	return [0, 2, 4].map((i) => toLinear(parseInt(h.slice(i, i + 2), 16) / 255));
}
export const linearToHex = (c) => '#' + c.map((v) => Math.round(toSrgb(Math.max(0, Math.min(1, v))) * 255).toString(16).padStart(2, '0')).join('');
export function linearToOklab([r, g, b]) {
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
export function oklabToLinear([L, a, b]) {
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
// The shade a section takes of itself: lighter on a dark fabric, darker on a light one, the second accent further than the
// first. L: the fabric's OKLab lightness; k: the section (0 the ground, 1, 2 the accents).
export const autoShade = (L, k) => (L < 0.6 ? 1 : -1) * (k === 2 ? 0.36 : k === 1 ? 0.2 : 0.1);
// A section's colour on a fabric of the colour base (linear), linear; null: the fabric's own.
export function sectionColour(v, k, base) {
	if (v === null || v === undefined) return null;
	if (typeof v === 'string' && v !== 'auto') return hexToLinear(v);
	const lab = linearToOklab(base), d = typeof v === 'number' ? v : autoShade(lab[0], k);
	return oklabToLinear([Math.max(0.04, Math.min(0.985, lab[0] + d)), lab[1], lab[2]]).map((c) => Math.max(0, Math.min(1, c)));
}
// The same as a CSS colour for the card (cloth: the fabric's, '#rrggbb'); null: the fabric's own.
export const sectionCss = (v, k, cloth) => { const c = sectionColour(v, k, hexToLinear(cloth)); return c ? linearToHex(c) : null; };
// The three sections as the shader mixes them: linear colour times cover, and cover. any: something is printed.
export function packCols(ink, base) {
	const data = new Float32Array(12);
	let any = false;
	SECTIONS.forEach((key, k) => { const c = sectionColour(ink[key], k, base); if (c) { data.set([c[0], c[1], c[2], 1], k * 4); any = true; } });
	return { data, any };
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

// What the print shaders need of a pattern, whatever paints it (a design's shader, or the distance to a drawn
// arrangement): its sections' colours, how much ink where. P: stones/pattern.js patternParams. local: in the frame's own
// space (the crystals that follow a design are laid there: stones/pattern.js rigidOf), as if the pattern lay unturned on
// the origin. base: the fabric's colour, linear (what a shade is a shade of).
export function inkUniforms(P, { local = false, base = [0.5, 0.5, 0.5], sym = null } = {}) {
	const ink = inkOf(P), cols = packCols(ink, base), Pl = local ? { ...P, x: 0, y: 0, rotate: 0, flip: false } : P, f = frameOf(Pl), mods = packMods(P.mods);
	return { cols: cols.data, any: cols.any, base, sym: sym ?? [0, 0, 1], clothToFrame: clothToFrame(f), mods, wob: [Math.max(ink.wobble ?? 0, 0), Math.max(ink.wobbleL ?? 0.03, 1e-4)] };
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
// A drawn arrangement as a layer: the distance to its lines and dots (prints/strokes.js, prints/engine.js), in the
// accent as wide as the line. strokes: { segs, dots, toCloth } of prints/strokes.js.
export function strokeLayer(gen, P, strokes, opts = {}) {
	const u = inkUniforms(P, opts), w = Math.max(inkOf(P).width ?? 0.002, 0.0002);
	// (a layout of dots alone: its density modifiers have thinned the dots already, so they do not fade the ink as well)
	return { kind: 'strokes', strokes, width: w, reach: w / 2, ...u, wob: [0, 1], ...(strokes.nSegs ? {} : { mods: { n: 0 } }) };
}
