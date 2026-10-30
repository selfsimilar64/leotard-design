// The stone arrangements a pattern can use, and the gallery the Sparkle tab shows: named presets, each an
// arrangement with some settings and sometimes modifiers. See
// knowledge/engineering/architecture/procedural-stone-patterns.md.
import { LATTICE_LAYOUTS, TILES } from './layouts-lattice.js';
import { RADIAL_LAYOUTS } from './layouts-radial.js';
import { TILING_LAYOUTS, WALLPAPER_GROUPS, STAR_TILINGS } from './layouts-tiling.js';
import { CURVE_LAYOUTS, CURVES, DUSTS } from './layouts-curves.js';

export const LAYOUTS = { ...LATTICE_LAYOUTS, ...RADIAL_LAYOUTS, ...TILING_LAYOUTS, ...CURVE_LAYOUTS };
export const LAYOUT_KINDS = Object.keys(LAYOUTS);

// A layout's parameters with its defaults under what the group has set.
export function layoutDefaults(name) {
	const L = LAYOUTS[name], d = {};
	for (const p of L?.params ?? []) d[p.k] = p.d;
	return d;
}

// A fade: stones thinning from one side of a shape to the other.
const fade = (shape, more = {}) => ({ mods: [{ on: 'density', shape, ...more }] });
const sized = (shape, from, to, more = {}) => ({ mods: [{ on: 'size', shape, from, to, ...more }] });
const entries = (obj, layout, key) => Object.entries(obj).map(([k, v]) => ({ key: layout + '-' + k, label: v.label, layout, params: { [key]: k } }));
const big = 'ss20', med = 'ss12';

// { title, items: [{ key, label, layout, params?, mods?, hint? }] }: params the arrangement's own and the
// crystal's size; mods its modifiers (without places: they start as they do for the piece).
export const GALLERY = [
	{
		title: 'Gradients', items: [
			{ key: 'fade-linear', label: 'Linear fade', layout: 'scatter', ...fade('linear') },
			{ key: 'fade-reflected', label: 'Fade both ways', layout: 'scatter', ...fade('reflected') },
			{ key: 'fade-radial', label: 'Radial fade', layout: 'scatter', ...fade('radial') },
			{ key: 'fade-oval', label: 'Oval fade', layout: 'scatter', ...fade('oval') },
			{ key: 'fade-diamond', label: 'Diamond fade', layout: 'scatter', ...fade('diamond') },
			{ key: 'fade-sweep', label: 'Sweep', layout: 'scatter', ...fade('sweep') },
			{ key: 'fade-spiral', label: 'Spiral fade', layout: 'scatter', ...fade('spiral') },
			{ key: 'fade-waves', label: 'Soft bands', layout: 'scatter', ...fade('waves') },
			{ key: 'fade-clouds', label: 'Clouds', layout: 'scatter', ...fade('clouds') },
			{ key: 'fade-edge', label: 'Fade from the edge', layout: 'scatter', ...fade('edge') },
			{ key: 'halftone', label: 'Halftone', layout: 'hex', params: { spacing: 0.009, size: big }, ...sized('linear', 1, 0.3) },
			{ key: 'halftone-radial', label: 'Radial halftone', layout: 'hex', params: { spacing: 0.009, size: big }, ...sized('radial', 1, 0.3) },
			{ key: 'dither', label: 'Ordered dither', layout: 'grid', params: { spacing: 0.006 }, ...fade('linear') },
		],
	},
	{
		title: 'Scatter', items: [
			{ key: 'scatter', label: 'Pavé', layout: 'scatter' },
			{ key: 'scatter-mixed', label: 'Mixed sizes', layout: 'scatter', params: { variety: 0.65 } },
			{ key: 'scatter-pebbles', label: 'Pebbles', layout: 'scatter', params: { variety: 1, size: 'ss16' } },
			{ key: 'scatter-sparse', label: 'Starry', layout: 'scatter', params: { variety: 0.5 }, mods: [{ on: 'density', shape: 'clouds', from: 0.5, to: 0.04 }] },
			{ key: 'clusters', label: 'Clusters', layout: 'clusters' },
			{ key: 'meteors', label: 'Meteor shower', layout: 'meteors' },
			{ key: 'stardust', label: 'Stardust', layout: 'stardust' },
			{ key: 'galaxy', label: 'Galaxy', layout: 'galaxy' },
		],
	},
	{
		title: 'Lattices', items: [
			{ key: 'grid', label: 'Grid', layout: 'grid' },
			{ key: 'hex', label: 'Hexagonal', layout: 'hex' },
			{ key: 'hex-jewels', label: 'Jewelled hex', layout: 'hex', params: { spacing: 0.009, accent: 2, size: 'ss8' } },
			{ key: 'grid-checker', label: 'Two-size check', layout: 'grid', params: { spacing: 0.008, accent: 2, size: 'ss8' } },
			{ key: 'brick', label: 'Brick', layout: 'brick' },
			{ key: 'diamonds', label: 'Diamond grid', layout: 'diamonds' },
			{ key: 'trellis', label: 'Trellis', layout: 'trellis' },
			{ key: 'trellis-3', label: 'Triple trellis', layout: 'trellis', params: { families: 3, skew: 30 } },
			{ key: 'polka-heart', label: 'Hearts', layout: 'motifs', params: { motif: 'heart' } },
			{ key: 'polka-star', label: 'Stars', layout: 'motifs', params: { motif: 'star', nodeSize: 1.5 } },
			{ key: 'polka-flower', label: 'Flowers', layout: 'motifs', params: { motif: 'flower', centre: 2 } },
			{ key: 'polka-dot', label: 'Polka dots', layout: 'motifs', params: { motif: 'circle', motifFill: 'fill', spacing: 0.04, motifSize: 0.022 } },
		],
	},
	{
		title: 'Lines', items: [
			{ key: 'stripes', label: 'Stripes', layout: 'stripes' },
			{ key: 'pinstripes', label: 'Banded stripes', layout: 'stripes', params: { lines: 3, spacing: 0.03, graded: 0.45 } },
			{ key: 'beads', label: 'Strung beads', layout: 'stripes', params: { spacing: 0.018, swell: 0.65, swellL: 0.05, size: 'ss14' } },
			{ key: 'waves', label: 'Waves', layout: 'waves' },
			{ key: 'wave-crests', label: 'Cresting waves', layout: 'waves', params: { swell: 0.6, spacing: 0.018, size: 'ss14' } },
			{ key: 'wave-drift', label: 'Drifting waves', layout: 'waves', params: { shift: 14 } },
			{ key: 'chevrons', label: 'Chevrons', layout: 'chevrons', params: { nodeSize: 1.5 } },
			{ key: 'ogee', label: 'Ogee', layout: 'ogee' },
			{ key: 'plaid', label: 'Plaid', layout: 'plaid' },
			{ key: 'scales', label: 'Fish scales', layout: 'scales' },
			{ key: 'circles', label: 'Interlocking circles', layout: 'circles', params: { nodeSize: 1.5 } },
			{ key: 'flower-of-life', label: 'Flower of life', layout: 'circles', params: { cells: 'hex', overlap: 1, nodeSize: 1.3 } },
			{ key: 'truchet', label: 'Truchet maze', layout: 'truchet' },
			{ key: 'tenprint', label: 'Random diagonals', layout: 'tenprint' },
			{ key: 'edge-rings', label: 'Rings along the edge', layout: 'edgelines' },
			{ key: 'edge-graded', label: 'Graded border', layout: 'edgelines', params: { spacing: 0.012, graded: 0.7, ringsOf: 8, size: 'ss20' } },
		],
	},
	{
		title: 'Tilings', items: [
			...entries(TILES, 'tile', 'tile').map((e) => ({ ...e, params: { ...e.params, nodeSize: 1.3 } })),
			{ key: 'penrose', label: 'Penrose', layout: 'quasicrystal', params: { fold: 5 } },
			{ key: 'penrose-stars', label: 'Penrose stars', layout: 'quasicrystal', params: { fold: 5, draw: 'vertices', valence: 1, spacing: 0.013, size: 'ss8' } },
			{ key: 'quasi-7', label: 'Seven-fold', layout: 'quasicrystal', params: { fold: 7 } },
			{ key: 'ammann', label: 'Ammann', layout: 'quasicrystal', params: { fold: 8 } },
			{ key: 'quasi-12', label: 'Twelve-fold', layout: 'quasicrystal', params: { fold: 12 } },
			...entries(STAR_TILINGS, 'stars', 'tiling').map((e) => ({ ...e, label: 'Stars: ' + e.label.toLowerCase() })),
			{ key: 'voronoi', label: 'Stained glass', layout: 'voronoi' },
			{ key: 'voronoi-gems', label: 'Cloisonné', layout: 'voronoi', params: { gem: 0.55, spacing: 0.024 } },
		],
	},
	{ title: 'Symmetry', items: entries(WALLPAPER_GROUPS, 'wallpaper', 'group').map((e) => ({ ...e, hint: `${e.label}: wallpaper group ${e.params.group}` })) },
	{
		title: 'Spirals', items: [
			{ key: 'phyllotaxis', label: 'Sunflower', layout: 'phyllotaxis' },
			{ key: 'phyllotaxis-grow', label: 'Growing sunflower', layout: 'phyllotaxis', params: { grow: 1.2, spacing: 0.005, size: 'ss8' } },
			{ key: 'phyllotaxis-prime', label: 'Prime sunflower', layout: 'phyllotaxis', params: { numbers: 'prime', spacing: 0.0035 } },
			{ key: 'phyllotaxis-fib', label: 'Sunflower spokes', layout: 'phyllotaxis', params: { numbers: 'fib', spacing: 0.0035 } },
			{ key: 'phyllotaxis-off', label: 'Off-golden', layout: 'phyllotaxis', params: { divergence: 137.0 } },
			{ key: 'sacks', label: 'Prime spiral', layout: 'sacks' },
			{ key: 'sacks-twin', label: 'Twin-prime spiral', layout: 'sacks', params: { numbers: 'twin', spacing: 0.0028 } },
			{ key: 'ulam', label: 'Ulam primes', layout: 'ulam' },
			{ key: 'spiral', label: 'Spiral', layout: 'spiral' },
			{ key: 'spiral-grow', label: 'Opening spiral', layout: 'spiral', params: { grow: 1.5, spacing: 0.018, arms: 2, size: 'ss8' } },
			{ key: 'spiral-arms', label: 'Many arms', layout: 'spiral', params: { arms: 8, spacing: 0.01 } },
			{ key: 'fermat', label: 'Fermat', layout: 'spiral', params: { arms: 2, power: 0.5, spacing: 0.02 } },
			{ key: 'nautilus', label: 'Nautilus', layout: 'nautilus' },
		],
	},
	{
		title: 'Radial', items: [
			{ key: 'rings', label: 'Rings', layout: 'rings' },
			{ key: 'rings-spokes', label: 'Polar grid', layout: 'rings', params: { spacing: 0.02, spokes: 16 } },
			{ key: 'rings-web', label: 'Spider web', layout: 'rings', params: { spacing: 0.016, spokes: 12, ringTurn: 8, size: 'ss8' } },
			{ key: 'rings-grow', label: 'Growing rings', layout: 'rings', params: { spacing: 0.009, grow: 1, size: 'ss8' } },
			{ key: 'sunburst', label: 'Sunburst', layout: 'sunburst' },
			{ key: 'mandala', label: 'Rosette', layout: 'mandala' },
			{ key: 'rose', label: 'Rose', layout: 'rose' },
			{ key: 'rose-woven', label: 'Woven rose', layout: 'rose', params: { petalsN: 7, petalsD: 3 } },
			{ key: 'guilloche', label: 'Guilloché', layout: 'guilloche' },
			{ key: 'cardioid', label: 'Cardioid', layout: 'stringart', params: { times: 2, nails: 72, size: 'ss5' } },
			{ key: 'nephroid', label: 'String art', layout: 'stringart', params: { times: 7, nails: 90, size: 'ss5' } },
			{ key: 'whirl', label: 'Whirl', layout: 'whirl' },
		],
	},
	{
		title: 'Fields', items: [
			{ key: 'contours', label: 'Contour map', layout: 'contours' },
			{ key: 'chladni', label: 'Chladni figure', layout: 'chladni' },
			{ key: 'chladni-2', label: 'Chladni, other mode', layout: 'chladni', params: { modeN: 2, modeM: 7, mode: 1 } },
			{ key: 'chladni-dots', label: 'Chladni halftone', layout: 'chladni', params: { draw: 'halftone', size: med } },
			{ key: 'quasi-waves', label: 'Five waves', layout: 'waveforms' },
			{ key: 'seven-waves', label: 'Seven waves', layout: 'waveforms', params: { fold: 7, bands: 3 } },
			{ key: 'wave-dots', label: 'Five-wave halftone', layout: 'waveforms', params: { draw: 'halftone', size: med } },
			{ key: 'labyrinth', label: 'Labyrinth', layout: 'labyrinth' },
			{ key: 'ripples', label: 'Two ripples', layout: 'ripples' },
			{ key: 'ripple-dots', label: 'Ripple halftone', layout: 'ripples', params: { draw: 'halftone', size: med } },
			{ key: 'flow', label: 'Flow lines', layout: 'flow' },
		],
	},
	{
		title: 'Fractals', items: [
			...entries(CURVES, 'grown', 'curve').map((e) => ({ ...e, params: { ...e.params, order: CURVES[e.params.curve].order } })),
			...entries(DUSTS, 'dust', 'dust').map((e) => ({ ...e, params: { ...e.params, order: DUSTS[e.params.dust].order, size: 'ss30' } })),
			{ key: 'gasket', label: 'Apollonian gasket', layout: 'gasket' },
			{ key: 'bubbles', label: 'Bubbles', layout: 'bubbles' },
		],
	},
];
export const GALLERY_ITEMS = new Map(GALLERY.flatMap((g) => g.items.map((it) => [it.key, it])));
