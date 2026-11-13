// Crystals that follow a printed design: the arrangement (make) of every design in prints/designs.js, which is how a
// printed design and its crystals are a pair. The design's sections are drawn by the print's own shader over the box as
// distances to their edges (prints/glsl.js gInk, gTwo), read back once a drawing, and the crystals come from them one of
// two ways:
//   edges  rows along the edges of the sections (stones/layouts-curves.js isolines): every edge, only the outline of
//          what is printed in an accent, or only the second accent's
//   fill   scattered over the sections chosen
// So crystals lie on the print exactly, whatever the design: it is the same shader. They are drawn in the frame's own
// space (the layout's `local`: stones/pattern.js patternCandidates), where the print's map and distortions are already in
// the picture. Without a GPU (the tests' Node) nothing is laid.
// Spec: knowledge/engineering/architecture/printed-patterns.md.
import { printEngine } from './engine.js';
import { designLayer, mat3 } from './ink.js';
import { isolines } from '../stones/layouts-curves.js';
import { overTile, TILE_R } from '../stones/layouts-lattice.js';
import { roomRaster } from '../stones/pattern.js';

export const GEM_MODES = [['edges', 'Along the edges', 'Rows of crystals along the edges of the print\'s shapes'], ['fill', 'Filling sections', 'Crystals scattered over the sections you choose']];
export const GEM_EDGES = [['all', 'Every edge'], ['outer', 'Outlines', null, 'Only where the print meets the background'], ['inner', 'Second accent', null, 'Only round the second accent']];
export const GEM_DEFAULTS = { mode: 'edges', edges: 'all', on: [false, true, false] };
export const gemsOf = (P) => { const g = { ...GEM_DEFAULTS, ...(P.gems ?? {}) }; if (!GEM_MODES.some((m) => m[0] === g.mode)) g.mode = 'edges'; return g; };
// Which sections a fill covers (the ground, the accent, the second accent): those chosen, or to begin with the accent.
export function fillsOn(P) {
	const on = gemsOf(P).on;
	return [0, 1, 2].map((k) => !!(Array.isArray(on) ? on[k] : GEM_DEFAULTS.on[k]));
}

const MOST = 640;

export function fieldStones(P, G) {
	const eng = printEngine();
	if (!eng) return;
	const gems = gemsOf(P), B = G.box;
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
			const i = at(x, y, 0) >= 0 ? 0 : at(x, y, 1) < 0 ? 2 : 1;
			if (on[i]) G.add(x, y, rank, 0, i / 2, 1, i);
		});
		return;
	}
	// the edges: where a distance passes nought. Where the second accent meets the ground both do: that edge is the outline's.
	if (gems.edges !== 'inner') isolines(G, (x, y) => at(x, y, 0), [0], step, null, here);
	if (gems.edges !== 'outer') isolines(G, (x, y) => at(x, y, 1), [0], step, null, gems.edges === 'inner' ? here : (x, y) => here(x, y) && at(x, y, 0) < -G.pitch * 0.6);
}
