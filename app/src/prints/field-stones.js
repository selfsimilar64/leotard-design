// Crystals that follow a printed design: the arrangement (make) of every design in prints/designs.js. The design's band
// coordinate (prints/glsl.js inkOf: colours meet at its whole numbers and a half) is drawn by the print's own shader over
// the box, read back once a drawing, and the crystals come from it one of three ways:
//   edges  rows along the lines where two colours meet (stones/layouts-curves.js isolines)
//   fill   scattered over the colours chosen
//   tone   a lattice, each crystal as big as the design's value there (a halftone)
// So crystals lie on the print exactly, whatever the design: it is the same shader. They are drawn in the frame's own
// space (the layout's `local`: stones/pattern.js patternCandidates), where the print's map and distortions are already in
// the picture. Without a GPU (the tests' Node) nothing is laid.
// Spec: knowledge/engineering/architecture/printed-patterns.md.
import { printEngine } from './engine.js';
import { designLayer, inkOf, bandsOf, stopAt, mat3 } from './ink.js';
import { isolines } from '../stones/layouts-curves.js';
import { overTile, lattice, TILE_R } from '../stones/layouts-lattice.js';
import { rankOf2, frac, clamp01 } from '../stones/fields.js';
import { roomRaster } from '../stones/pattern.js';

export const GEM_MODES = [['edges', 'Along the edges', 'Rows of crystals where two colours meet'], ['fill', 'Filling colours', 'Crystals scattered over the colours you choose'], ['tone', 'Sized by tone', 'A lattice of crystals, bigger where the design is stronger']];
export const GEM_DEFAULTS = { mode: 'edges', every: 1, on: null, dots: 0.007, small: 0.35, big: 1.7, cut: 0 };
export const gemsOf = (P) => ({ ...GEM_DEFAULTS, ...(P.gems ?? {}) });
// Which colours a fill covers: those chosen, or to begin with the first that is printed.
export function fillsOn(P) {
	const stops = inkOf(P).stops, on = gemsOf(P).on, first = Math.max(0, stops.findIndex(Boolean));
	return stops.map((_, i) => (on ? !!on[i] : i === first));
}

const MOST = 640;

export function fieldStones(P, G) {
	const eng = printEngine();
	if (!eng) return;
	const gems = gemsOf(P), ink = inkOf(P), { N, cyc } = bandsOf(ink), B = G.box;
	// a grid on whole steps from the frame's origin (a step a power of two of half a millimetre), so a drawing asked for over
	// a slightly different box reads the same values at the same places and its crystals do not crawl
	let step = Math.max(G.pitch * 0.5, 0.0005, Math.max(B.x1 - B.x0, B.y1 - B.y0) / MOST);
	step = 0.0005 * 2 ** Math.ceil(Math.log2(step / 0.0005) - 1e-9);
	const x0 = Math.floor(B.x0 / step) * step - step, y0 = Math.floor(B.y0 / step) * step - step, W = Math.ceil((B.x1 - x0) / step) + 3, H = Math.ceil((B.y1 - y0) / step) + 3;
	const L = designLayer({ seed: G.seed }, P, { local: true });
	const R = eng.raster(L, W, H, mat3(step, 0, 0, step, x0 - step / 2, y0 - step / 2), L.edge && G.piece ? roomRaster(G.piece) : null);
	if (!R) return;
	const at = (x, y, ch) => {
		let fx = (x - x0) / step, fy = (y - y0) / step;
		fx = fx < 0 ? 0 : fx > W - 1.001 ? W - 1.001 : fx; fy = fy < 0 ? 0 : fy > H - 1.001 ? H - 1.001 : fy;
		const i = Math.floor(fx), j = Math.floor(fy), a = fx - i, b = fy - j, q = (j * W + i) * 4 + ch;
		return (R[q] * (1 - a) + R[q + 4] * a) * (1 - b) + (R[q + W * 4] * (1 - a) + R[q + W * 4 + 4] * a) * b;
	};
	const here = (x, y) => at(x, y, 2) > 0.5;
	if (gems.mode === 'fill') {
		const on = fillsOn(P);
		overTile(B, (G.d0 * G.gap * G.fine) / TILE_R, G.seed, (x, y, k, rank) => {
			if (!here(x, y)) return;
			const i = stopAt(at(x, y, 0), N, cyc, ink.reverse);
			if (on[i]) G.add(x, y, rank, 0, N > 1 ? i / (N - 1) : 0, 1, i);
		});
		return;
	}
	if (gems.mode === 'tone') {
		const s = Math.max(gems.dots, G.d0 * 0.6);
		lattice(B, s, 0, s / 2, s * 0.8660254, (i, j, x, y) => {
			if (!here(x, y)) return;
			const e = at(x, y, 0), v = cyc ? frac((e + 0.5) / N) : clamp01((e + 0.5) / N);
			if (v < gems.cut) return;
			G.add(x, y, rankOf2(i, j), 0, v, gems.small + (gems.big - gems.small) * v, stopAt(e, N, cyc, ink.reverse));
		});
		return;
	}
	// the edges: where the band coordinate passes a whole number and a half
	let lo = 0, hi = N - 2;
	if (cyc) {
		lo = Infinity; hi = -Infinity;
		for (let q = 0; q < R.length; q += 4) { if (R[q + 2] < 0.5) continue; const e = R[q]; if (e < lo) lo = e; if (e > hi) hi = e; }
		lo = Math.ceil(lo - 0.5); hi = Math.min(Math.floor(hi - 0.5), lo + 63);
	}
	const levels = [], every = Math.max(1, Math.round(gems.every));
	for (let k = lo; k <= hi; k++) if ((((k % every) + every) % every) === 0) levels.push(k + 0.5);
	if (levels.length) isolines(G, (x, y) => at(x, y, 0), levels, step, null, here);
}
