// The printed designs as the gallery shows them: named presets by family, each a design (prints/designs.js) with some
// settings. stones/layouts.js GALLERY puts them beside the crystal layouts. A preset names no colours: its ground is the
// fabric's own and its accents shades of the fabric (prints/ink.js), until the designer chooses.
import { PREFIX } from './designs.js';

// an item: a design and its settings; more: what else the pattern starts with (how its crystals follow it)
const it = (key, label, design, params = {}, more = null) => ({ key: 'p-' + key, label, layout: PREFIX + design, params: { ...params, ...(more ?? {}) } });

export const PRINT_GALLERY = [
	{
		title: 'Mandalas', items: [
			it('m-lotus', 'Lotus mandala', 'mandala'),
			it('m-sun', 'Sun mandala', 'mandala', { style: 'sun', folds: 12, drawn: 'alt' }),
			it('m-lace', 'Lace mandala', 'mandala', { style: 'lace', folds: 12, rings: 6, line: 0.0007 }),
			it('m-temple', 'Temple mandala', 'mandala', { style: 'temple', folds: 8, rings: 7, drawn: 'filled' }),
			it('m-dahlia', 'Dahlia', 'mandala', { style: 'bloom', folds: 12, rings: 6, grow: 1.1, drawn: 'alt', pointed: 0.45, detail: 0.4 }),
			it('m-henna', 'Henna mandala', 'mandala', { folds: 16, rings: 8, detail: 1, line: 0.0006, dsize: 0.1 }),
			it('m-stencil', 'Stencil mandala', 'mandala', { drawn: 'solid', folds: 10, detail: 0.6, line: 0.0012 }),
			it('m-wild', 'Shuffled mandala', 'mandala', { style: 'wild', rings: 6 }),
			it('lotus', 'Lotus', 'lotus'),
			it('lotus-star', 'Star flower', 'lotus', { petals: 5, layers: 4, depth: 0.8, sharp: 0.4 }),
		],
	},
	{
		title: 'Motifs', items: [
			it('stars', 'Stars', 'motifs'),
			it('hearts', 'Hearts', 'motifs', { motif: 'heart' }),
			it('flowers', 'Flowers', 'motifs', { motif: 'flower', points: 6, inner: 0.35 }),
			it('moons', 'Moons', 'motifs', { motif: 'moon', toss: 0.3 }),
		],
	},
	{
		title: 'Shapes', items: [
			it('blend-wave', 'Wavy steps', 'steps'),
			it('burst-star', 'Star burst', 'burst', { dsize: 0.07 }),
			it('burst-diamond', 'Diamond steps', 'burst', { form: 'diamond' }),
			it('burst-polygon', 'Facet steps', 'burst', { form: 'polygon', sides: 6 }),
			it('scales', 'Scales', 'scales'),
			it('seigaiha', 'Sea waves', 'scales', { dsize: 0.045, arcs: 4 }),
			it('peacock', 'Peacock', 'scales', { dsize: 0.05, tall: 0.6, arcs: 4, tones: 'two' }),
			it('circles', 'Interlocking circles', 'circles'),
			it('cubes', 'Tumbling blocks', 'cubes'),
			it('dunes', 'Layered waves', 'dunes'),
			it('hills', 'Hills', 'dunes', { rough: 0.9, amp: 0.02, wave: 0.2, arcs: 3, tones: 'two' }),
			it('julia', 'Julia set', 'julia'),
		],
	},
];
