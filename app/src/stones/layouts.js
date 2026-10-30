// The stone arrangements a pattern can use, and the gallery the Sparkle tab shows: named starting
// points, each an arrangement with some settings (and sometimes a gradient). See
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

const G = (gradient, more = {}) => ({ gradient, densityFrom: 1, densityTo: 0, ...more });
const entries = (obj, layout, key) => Object.entries(obj).map(([k, v]) => ({ key: layout + '-' + k, label: v.label, layout, params: { [key]: k } }));

// { title, items: [{ key, label, layout, params?, hint? }] }
export const GALLERY = [
	{
		title: 'Gradients', items: [
			{ key: 'fade-linear', label: 'Linear fade', layout: 'scatter', params: G('linear') },
			{ key: 'fade-reflected', label: 'Fade both ways', layout: 'scatter', params: G('reflected') },
			{ key: 'fade-radial', label: 'Radial fade', layout: 'scatter', params: G('radial') },
			{ key: 'fade-oval', label: 'Oval fade', layout: 'scatter', params: G('oval') },
			{ key: 'fade-diamond', label: 'Diamond fade', layout: 'scatter', params: G('diamond') },
			{ key: 'fade-sweep', label: 'Sweep', layout: 'scatter', params: G('angular') },
			{ key: 'fade-spiral', label: 'Spiral fade', layout: 'scatter', params: G('spiral') },
			{ key: 'fade-waves', label: 'Soft bands', layout: 'scatter', params: G('waves') },
			{ key: 'fade-clouds', label: 'Clouds', layout: 'scatter', params: G('clouds') },
			{ key: 'fade-edge', label: 'Fade from the edge', layout: 'scatter', params: G('edge') },
			{ key: 'halftone', label: 'Halftone', layout: 'hex', params: { spacing: 0.009, gradient: 'linear', densityFrom: 1, densityTo: 1, size: 'ss20', sizeTo: 'ss5' } },
			{ key: 'halftone-radial', label: 'Radial halftone', layout: 'hex', params: { spacing: 0.009, gradient: 'radial', densityFrom: 1, densityTo: 1, size: 'ss20', sizeTo: 'ss5' } },
			{ key: 'dither', label: 'Ordered dither', layout: 'grid', params: { spacing: 0.006, gradient: 'linear', densityFrom: 1, densityTo: 0 } },
		],
	},
	{
		title: 'Scatter', items: [
			{ key: 'scatter', label: 'Pavé', layout: 'scatter' },
			{ key: 'scatter-mixed', label: 'Mixed sizes', layout: 'scatter', params: { sizeB: 'ss20', mix: 0.3 } },
			{ key: 'scatter-sparse', label: 'Starry', layout: 'scatter', params: { gradient: 'clouds', densityFrom: 0.5, densityTo: 0.04 } },
			{ key: 'clusters', label: 'Clusters', layout: 'clusters', params: { sizeB: 'ss16', mix: 0.25 } },
			{ key: 'meteors', label: 'Meteor shower', layout: 'meteors' },
			{ key: 'stardust', label: 'Stardust', layout: 'stardust', params: { sizeB: 'ss20', mix: 0.15 } },
			{ key: 'galaxy', label: 'Galaxy', layout: 'galaxy', params: { sizeB: 'ss16', mix: 0.15 } },
		],
	},
	{
		title: 'Lattices', items: [
			{ key: 'grid', label: 'Grid', layout: 'grid' },
			{ key: 'hex', label: 'Hexagonal', layout: 'hex' },
			{ key: 'brick', label: 'Brick', layout: 'brick' },
			{ key: 'diamonds', label: 'Diamond grid', layout: 'diamonds' },
			{ key: 'trellis', label: 'Trellis', layout: 'trellis' },
			{ key: 'trellis-3', label: 'Triple trellis', layout: 'trellis', params: { families: 3, skew: 30 } },
			{ key: 'polka-heart', label: 'Hearts', layout: 'motifs', params: { motif: 'heart' } },
			{ key: 'polka-star', label: 'Stars', layout: 'motifs', params: { motif: 'star' } },
			{ key: 'polka-flower', label: 'Flowers', layout: 'motifs', params: { motif: 'flower' } },
			{ key: 'polka-dot', label: 'Polka dots', layout: 'motifs', params: { motif: 'circle', motifFill: 'fill', spacing: 0.04, motifSize: 0.022 } },
		],
	},
	{
		title: 'Lines', items: [
			{ key: 'stripes', label: 'Stripes', layout: 'stripes' },
			{ key: 'pinstripes', label: 'Banded stripes', layout: 'stripes', params: { lines: 3, spacing: 0.03 } },
			{ key: 'waves', label: 'Waves', layout: 'waves' },
			{ key: 'wave-drift', label: 'Drifting waves', layout: 'waves', params: { shift: 14 } },
			{ key: 'chevrons', label: 'Chevrons', layout: 'chevrons' },
			{ key: 'ogee', label: 'Ogee', layout: 'ogee' },
			{ key: 'plaid', label: 'Plaid', layout: 'plaid' },
			{ key: 'scales', label: 'Fish scales', layout: 'scales' },
			{ key: 'circles', label: 'Interlocking circles', layout: 'circles' },
			{ key: 'flower-of-life', label: 'Flower of life', layout: 'circles', params: { cells: 'hex', overlap: 1 } },
			{ key: 'truchet', label: 'Truchet maze', layout: 'truchet' },
			{ key: 'tenprint', label: 'Random diagonals', layout: 'tenprint' },
			{ key: 'edge-rings', label: 'Rings along the edge', layout: 'edgelines' },
		],
	},
	{
		title: 'Tilings', items: [
			...entries(TILES, 'tile', 'tile'),
			{ key: 'penrose', label: 'Penrose', layout: 'quasicrystal', params: { fold: 5 } },
			{ key: 'quasi-7', label: 'Seven-fold', layout: 'quasicrystal', params: { fold: 7 } },
			{ key: 'ammann', label: 'Ammann', layout: 'quasicrystal', params: { fold: 8 } },
			{ key: 'quasi-12', label: 'Twelve-fold', layout: 'quasicrystal', params: { fold: 12 } },
			...entries(STAR_TILINGS, 'stars', 'tiling').map((e) => ({ ...e, label: 'Stars: ' + e.label.toLowerCase() })),
			{ key: 'voronoi', label: 'Stained glass', layout: 'voronoi' },
		],
	},
	{ title: 'Symmetry', items: entries(WALLPAPER_GROUPS, 'wallpaper', 'group').map((e) => ({ ...e, hint: `${e.label}: wallpaper group ${e.params.group}` })) },
	{
		title: 'Spirals', items: [
			{ key: 'phyllotaxis', label: 'Sunflower', layout: 'phyllotaxis' },
			{ key: 'phyllotaxis-grow', label: 'Growing sunflower', layout: 'phyllotaxis', params: { grow: 1.2, spacing: 0.008 } },
			{ key: 'phyllotaxis-prime', label: 'Prime sunflower', layout: 'phyllotaxis', params: { numbers: 'prime', count: 16000, spacing: 0.0035 } },
			{ key: 'phyllotaxis-fib', label: 'Sunflower spokes', layout: 'phyllotaxis', params: { numbers: 'fib', count: 16000, spacing: 0.0035 } },
			{ key: 'phyllotaxis-off', label: 'Off-golden', layout: 'phyllotaxis', params: { divergence: 137.0 } },
			{ key: 'sacks', label: 'Prime spiral', layout: 'sacks' },
			{ key: 'ulam', label: 'Ulam primes', layout: 'ulam' },
			{ key: 'spiral', label: 'Spiral', layout: 'spiral' },
			{ key: 'spiral-arms', label: 'Many arms', layout: 'spiral', params: { arms: 8, spacing: 0.01 } },
			{ key: 'fermat', label: 'Fermat', layout: 'spiral', params: { arms: 2, power: 0.5, spacing: 0.02 } },
			{ key: 'nautilus', label: 'Nautilus', layout: 'nautilus' },
		],
	},
	{
		title: 'Radial', items: [
			{ key: 'rings', label: 'Rings', layout: 'rings' },
			{ key: 'sunburst', label: 'Sunburst', layout: 'sunburst' },
			{ key: 'mandala', label: 'Rosette', layout: 'mandala' },
			{ key: 'rose', label: 'Rose', layout: 'rose' },
			{ key: 'rose-woven', label: 'Woven rose', layout: 'rose', params: { petalsN: 7, petalsD: 3 } },
			{ key: 'guilloche', label: 'Guilloché', layout: 'guilloche' },
			{ key: 'cardioid', label: 'Cardioid', layout: 'stringart', params: { times: 2 } },
			{ key: 'nephroid', label: 'String art', layout: 'stringart', params: { times: 7, nails: 90 } },
			{ key: 'whirl', label: 'Whirl', layout: 'whirl' },
		],
	},
	{
		title: 'Fields', items: [
			{ key: 'contours', label: 'Contour map', layout: 'contours' },
			{ key: 'chladni', label: 'Chladni figure', layout: 'chladni' },
			{ key: 'chladni-2', label: 'Chladni, other mode', layout: 'chladni', params: { modeN: 2, modeM: 7, mode: 1 } },
			{ key: 'quasi-waves', label: 'Five waves', layout: 'waveforms' },
			{ key: 'seven-waves', label: 'Seven waves', layout: 'waveforms', params: { fold: 7, bands: 3 } },
			{ key: 'labyrinth', label: 'Labyrinth', layout: 'labyrinth' },
			{ key: 'ripples', label: 'Two ripples', layout: 'ripples' },
			{ key: 'flow', label: 'Flow lines', layout: 'flow' },
		],
	},
	{
		title: 'Fractals', items: [
			...entries(CURVES, 'grown', 'curve').map((e) => ({ ...e, params: { ...e.params, order: CURVES[e.params.curve].order } })),
			...entries(DUSTS, 'dust', 'dust').map((e) => ({ ...e, params: { ...e.params, order: DUSTS[e.params.dust].order } })),
			{ key: 'gasket', label: 'Apollonian gasket', layout: 'gasket' },
			{ key: 'bubbles', label: 'Bubbles', layout: 'bubbles' },
		],
	},
];
export const GALLERY_ITEMS = new Map(GALLERY.flatMap((g) => g.items.map((it) => [it.key, it])));
