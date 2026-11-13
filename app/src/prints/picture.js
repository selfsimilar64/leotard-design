// A pattern's print as a small picture on a square of cloth: the gallery's tiles (ui/PatternCard.jsx) and the design
// sheet (dev/print-gallery.js), drawn by the print's own shaders (prints/engine.js).
import { printEngine } from './engine.js';
import { designLayer, strokeLayer, inkOf, hexToLinear, mat3 } from './ink.js';
import { designOf, isDesign } from './designs.js';
import { layoutDefaults, LAYOUTS } from '../stones/layouts.js';
import { patternParams, patternStrokes } from '../stones/pattern.js';
import { newModifier } from '../stones/modifiers.js';

export const WINDOW = 0.15; // metres of cloth a picture shows

// A square of cloth with nothing of the body in it, as stones/pattern.js asks of a piece.
export function flatSquare(h) {
	const zero = { x: 0, y: 0, z: 0 }, n = 65, er = (2 * h) / (n - 1), S = new Float32Array(n * n);
	for (let j = 0, o = 0; j < n; j++) for (let i = 0; i < n; i++, o++) S[o] = Math.min(h - Math.abs(-h + i * er), h - Math.abs(-h + j * er));
	const piece = {
		x0: -h, x1: h, y0: -h, y1: h, w1: 0, w2: 0,
		edgeAt: (u, v) => Math.min(h - Math.abs(u), h - Math.abs(v)),
		find: (u, v) => { piece.u = u; piece.v = v; return 0; }, posOf: (q, out) => { out.x = 0; out.y = 0; out.z = 0; return zero; }, spOf: () => ({ u: piece.u, v: piece.v }), angleOf: (q, a) => a,
		roomRaster: { S, ex: n, ey: n, er, dx0: -h, dy0: -h },
	};
	return piece;
}

// A gallery item as a group on that square: a design of its own size drawn to fit the picture.
export function itemGen(item, h = WINDOW / 2, more = {}) {
	const D = designOf(item.layout), P0 = { ...layoutDefaults(item.layout), ...item.params };
	let reach = D?.reach?.(P0) ?? 0;
	if (!D) { const grip = LAYOUTS[item.layout].grips?.find((g) => g.type === 'radius' || g.title === 'Size'); reach = grip?.key ? P0[grip.key] * (grip.half ? 0.5 : 1) * (grip.unit?.(P0) ?? 1) : P0.extent ? P0.extent / 2 : 0; }
	const mods = (item.mods ?? []).map((m, i) => newModifier(m.on, m.shape, m, 'm' + i));
	return { id: 'pic:' + item.key, seed: 7, stone: 'Crystal', params: { layout: item.layout, x: 0, y: 0, scale: reach > h * 0.95 ? (h * 0.95) / reach : 1, ...P0, mods, ...more } };
}

// The print of a group on a square, as ImageData (px x px), or null without a GPU. cloth: the cloth's colour under it.
export function printPicture(gen, px, { cloth = '#26221e', window = WINDOW, cache = null } = {}) {
	const eng = printEngine();
	if (!eng) return null;
	const h = window / 2, piece = flatSquare(h), P = patternParams(gen, piece), base = hexToLinear(cloth), k = window / px;
	let layer;
	if (isDesign(P.layout)) layer = designLayer(gen, P, { base });
	else { const ink = inkOf(P); layer = strokeLayer(gen, P, patternStrokes(gen, piece, { cache, dot: ink.dot, width: ink.width }), { base }); }
	return eng.picture({ W: px, H: px, pixToCloth: mat3(k, 0, 0, k, -h, -h), base, layers: [layer], room: piece.roomRaster });
}
