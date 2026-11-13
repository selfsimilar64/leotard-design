// Printed patterns, the parts that need no GPU: the designs' own settings and shader text, the gallery, the ink (three
// flat sections: the fabric's own, a shade of it, or a colour) as the shaders are given it, a crystal layout's lines as
// ink, and how a pattern that is made as print behaves in the stone engine. The shaders themselves are compiled and drawn by
// dev/print-gallery.js (prints.html) in the app: Node has no WebGL.
import { describe, it, expect } from 'vitest';
import { DESIGNS, PREFIX, designOf, isDesign, madeAs, laysStones, printsInk, definesOf, designFloats } from '../src/prints/designs.js';
import { PRINT_GALLERY } from '../src/prints/gallery.js';
import { INK_DEFAULTS, SECTIONS, inkOf, inkBase, hasTwo, packCols, packMods, sectionColour, sectionCss, autoShade, clothToDesign, clothToFrame, designLayer, hexToLinear, linearToOklab, oklabToLinear } from '../src/prints/ink.js';
import { strokesOf } from '../src/prints/strokes.js';
import { fieldStones, gemsOf, fillsOn } from '../src/prints/field-stones.js';
import { MAX_MODS, fieldFragment } from '../src/prints/glsl.js';
import { LAYOUTS, GALLERY, GALLERY_ITEMS, layoutDefaults } from '../src/stones/layouts.js';
import { MOD_SHAPES, isSpatial } from '../src/stones/modifiers.js';
import { Geometry } from '../src/stones/geometry.js';
import { patternParams, patternMap, frameOf, clothToFrame as frameLocal, presetPatch, runPattern, patternStrokes, patternCandidates } from '../src/stones/pattern.js';
import { flatSquare } from '../src/prints/picture.js';

// what a pattern's record keeps for itself: a design's setting of the same name would be read as the pattern's
const RESERVED = ['layout', 'preset', 'x', 'y', 'rotate', 'scale', 'flip', 'symmetric', 'px', 'py', 'pturn', 'pscale', 'sx', 'sy', 'mods', 'size', 'gap', 'density', 'twist', 'bulge', 'bulgeR', 'waveA', 'waveL', 'warp', 'warpL', 'jitter', 'margin', 'keepOut', 'turn', 'stoneTurn', 'as', 'ink', 'gems'];
const HEX = /^#[0-9a-f]{6}$/i;

describe('printed designs', () => {
	it('each design has settings of its own names, every one of which its shader reads', () => {
		expect(Object.keys(DESIGNS).length).toBeGreaterThanOrEqual(9);
		for (const [key, D] of Object.entries(DESIGNS)) {
			expect(D.label, key).toBeTruthy();
			expect(D.glsl, key).toMatch(/void design\(vec2 p\)/);
			// (flat sections only: a design paints, it has no colours or blends of its own)
			expect(D.glsl, key).toMatch(/\b(paint|bands|rimBands|gInk)\b/);
			expect(D.ink?.soft, key).toBeUndefined();
			expect(D.params.length, key).toBeLessThanOrEqual(16);
			const keys = D.params.map((p) => p.k);
			expect(new Set(keys).size, key + ': a setting twice').toBe(keys.length);
			for (const p of D.params) {
				expect(RESERVED, `${key}.${p.k} is one of a pattern's own names`).not.toContain(p.k);
				expect(p.d, `${key}.${p.k} default`).toBeDefined();
				if (p.options) expect(p.options.map((o) => o[0]), `${key}.${p.k}`).toContain(p.d);
				else { expect(p.d, `${key}.${p.k}`).toBeGreaterThanOrEqual(p.min); expect(p.d, `${key}.${p.k}`).toBeLessThanOrEqual(p.max); }
				// (a setting no code reads would be a control that does nothing)
				const read = new RegExp(`\\bP_${p.k}\\b`).test(D.glsl) || (D.pack && new RegExp(`P\\.${p.k}\\b`).test(D.pack.toString()));
				expect(read, `${key}.${p.k} is read by its shader`).toBe(true);
			}
			// and the shader reads nothing that is not a setting
			for (const m of D.glsl.matchAll(/\bP_(\w+)/g)) expect(keys, `${key}: P_${m[1]}`).toContain(m[1]);
			for (const g of D.grips ?? []) if (g.key) expect(keys, `${key}: grip ${g.key}`).toContain(g.key);
			// balanced, as far as a count can tell
			const src = fieldFragment(D.glsl, definesOf(D));
			for (const [a, b] of [['{', '}'], ['(', ')'], ['[', ']']]) expect(src.split(a).length, `${key}: ${a}${b}`).toBe(src.split(b).length);
		}
	});

	it('is a layout under its own name, with crystals that follow it', () => {
		for (const key of Object.keys(DESIGNS)) {
			const L = LAYOUTS[PREFIX + key];
			expect(L, key).toBeDefined();
			expect(L.design && L.local, key).toBe(true);
			expect(designOf(PREFIX + key), key).toBe(DESIGNS[key]);
		}
		expect(isDesign('mandala')).toBe(false); // (the crystal layout of the same name)
		expect(isDesign(PREFIX + 'mandala')).toBe(true);
		// without a GPU nothing is laid, and nothing breaks
		const G = new Geometry().reset({ x0: -0.05, x1: 0.05, y0: -0.05, y1: 0.05, r: 0.08 }, 0.004, 1, null, { d0: 0.003, gap: 1.2 });
		expect(() => fieldStones({ layout: PREFIX + 'steps', ...layoutDefaults(PREFIX + 'steps') }, G)).not.toThrow();
		expect(G.items).toBe(0);
	});

	it('a setting as the shader takes it: a number, or a choice by its place in the list', () => {
		const D = DESIGNS.burst, f = designFloats(D, { dsize: 0.2, form: 'star', sides: 7 });
		expect(f[D.params.findIndex((p) => p.k === 'dsize')]).toBeCloseTo(0.2);
		expect(f[D.params.findIndex((p) => p.k === 'form')]).toBe(4);
		expect(f[D.params.findIndex((p) => p.k === 'sides')]).toBe(7);
		expect(definesOf(D)).toContain('#define P_dsize uD[0]');
	});
});

describe('the print gallery', () => {
	it('every preset names a design, sets only its settings, and names no colours: its accents are shades of the fabric', () => {
		let n = 0;
		for (const g of PRINT_GALLERY) for (const item of g.items) {
			n++;
			const D = designOf(item.layout);
			expect(D, item.key).toBeTruthy();
			const own = new Set(D.params.map((p) => p.k));
			for (const [k, v] of Object.entries(item.params ?? {})) {
				if (k === 'ink' || k === 'as' || k === 'gems') continue;
				expect(own.has(k), `${item.key}: ${k}`).toBe(true);
				const spec = D.params.find((p) => p.k === k);
				if (spec.options) expect(spec.options.map((o) => o[0]), `${item.key}.${k}`).toContain(v);
				else { expect(v, `${item.key}.${k}`).toBeGreaterThanOrEqual(spec.min); expect(v, `${item.key}.${k}`).toBeLessThanOrEqual(spec.max); }
			}
			const ink = inkOf({ layout: item.layout, ...item.params });
			expect(ink.ground, item.key).toBe(null);
			expect(ink.accent, item.key).toBe('auto');
			expect(ink.accent2, item.key).toBe('auto');
			if (item.params?.as) expect(['stones', 'print', 'both'], item.key).toContain(item.params.as);
		}
		expect(n).toBeGreaterThan(20);
		expect(new Set(PRINT_GALLERY.flatMap((g) => g.items.map((i) => i.key))).size).toBe(n);
		// beside the crystal layouts in the one gallery, no family's name twice
		expect(GALLERY.filter((g) => g.kind === 'print').length).toBe(PRINT_GALLERY.length);
		expect(new Set(GALLERY.map((g) => g.title)).size).toBe(GALLERY.length);
		expect(GALLERY_ITEMS.get('p-m-lotus').layout).toBe(PREFIX + 'mandala');
		// the ones kept by name
		for (const label of ['Wavy steps', 'Star burst', 'Diamond steps', 'Facet steps', 'Scales', 'Sea waves', 'Peacock', 'Interlocking circles', 'Lotus', 'Star flower', 'Tumbling blocks', 'Stars', 'Hearts', 'Flowers', 'Moons', 'Layered waves', 'Hills', 'Julia set']) expect(PRINT_GALLERY.some((g) => g.items.some((i) => i.label === label)), label).toBe(true);
	});
	it('every crystal preset that prints names no ramp of colours', () => {
		for (const item of GALLERY_ITEMS.values()) expect(item.params?.ink?.stops, item.key).toBeUndefined();
	});
});

describe('made as crystals, print or both', () => {
	it('a record from before prints is crystals; a design starts as print', () => {
		expect(madeAs({ layout: 'scatter' })).toBe('stones');
		expect(madeAs({})).toBe('stones');
		expect(madeAs({ layout: PREFIX + 'steps' })).toBe('print');
		expect(madeAs({ layout: 'scatter', as: 'both' })).toBe('both');
		expect(madeAs({ layout: 'scatter', as: 'nonsense' })).toBe('stones');
		expect(laysStones({ layout: 'grid', as: 'print' })).toBe(false);
		expect(printsInk({ layout: 'grid', as: 'both' })).toBe(true);
	});

	const piece = flatSquare(0.06), ctx = { doc: { panels: [{ id: 'p1' }] }, cloth: () => ({ piece }), peaks: true };
	const gen = (params) => ({ id: 'g', kind: 'pattern', seed: 5, stone: 'Crystal', on: { panel: 'p1' }, params: { layout: 'grid', x: 0, y: 0, ...layoutDefaults('grid'), ...params } });

	it('a layout made only as print lays no crystals, and its ink changes none of them', () => {
		expect(runPattern(gen({}), ctx).length).toBeGreaterThan(50);
		expect(runPattern(gen({ as: 'print' }), ctx)).toEqual([]);
		const both = runPattern(gen({ as: 'both' }), ctx), inked = runPattern(gen({ as: 'both', ink: { accent: '#ff0000', width: 0.004 } }), ctx);
		expect(inked.map((s) => [s.fu, s.fv])).toEqual(both.map((s) => [s.fu, s.fv]));
		// (and the candidates are not drawn again for it: the same arrays)
		const cache = new Map(), a = patternCandidates(gen({ as: 'both' }), piece, cache), b = patternCandidates(gen({ as: 'both', ink: { accent: '#00ff00' } }), piece, cache);
		expect(b.GX).toBe(a.GX);
	});

	it('a preset keeps a section\'s colour chosen by hand, and takes the new preset\'s when it was the last one\'s own', () => {
		const first = presetPatch({}, 'mandala-gilt');
		expect(first.ink.accent).toBe('#e6bf58');
		expect(presetPatch(first, 'p-stars').ink).toBeUndefined(); // (the gold was the rosette's own: the stars start from the fabric)
		const next = presetPatch({ ...first, ink: { ...first.ink, accent: '#123456', accent2: null } }, 'p-stars');
		expect(next.ink).toEqual({ accent: '#123456', accent2: null });
		expect(next.layout).toBe(PREFIX + 'motifs');
		// what it is made as is the designer's, unless the preset is made a way of its own
		expect(presetPatch({ ...first, as: 'both' }, 'p-stars').as).toBe('both');
	});

	it('a record of a design that is gone goes on under what it became, or as plain crystals', () => {
		const piece2 = flatSquare(0.06);
		expect(patternParams({ params: { layout: PREFIX + 'blend' } }, piece2).layout).toBe(PREFIX + 'steps');
		expect(patternParams({ params: { layout: PREFIX + 'tiles' } }, piece2).layout).toBe(PREFIX + 'cubes');
		expect(patternParams({ params: { layout: PREFIX + 'galaxy' } }, piece2).layout).toBe('scatter');
	});
});

describe('ink', () => {
	it('three sections: the ground the fabric\'s own, the accents shades of the fabric, until chosen', () => {
		expect(SECTIONS).toEqual(['ground', 'accent', 'accent2']);
		expect(inkBase('grid')).toMatchObject({ ground: null, accent: 'auto', accent2: 'auto' });
		expect(inkOf({ layout: PREFIX + 'steps', ink: { accent: '#ff0000' } })).toMatchObject({ ground: null, accent: '#ff0000', accent2: 'auto' });
		expect(INK_DEFAULTS.soft).toBeUndefined(); // (nothing blends)
		// a record of the first prints: its first two printed colours
		expect(inkOf({ layout: 'grid', ink: { stops: [null, '#111111', '#222222', '#333333'] } })).toMatchObject({ accent: '#111111', accent2: '#222222' });
		// a second accent only where the design has one
		expect(hasTwo({ layout: 'grid' })).toBe(false);
		expect(hasTwo({ layout: PREFIX + 'steps', tones: 'one' })).toBe(false);
		expect(hasTwo({ layout: PREFIX + 'steps', tones: 'two' })).toBe(true);
		expect(hasTwo({ layout: PREFIX + 'mandala' })).toBe(true);
	});

	it('a shade of the fabric stands out from it: lighter on a dark fabric, darker on a light one, the second further', () => {
		for (const hex of ['#000000', '#26221e', '#b3122e', '#1b3fb5', '#888888', '#ffd166', '#ffffff']) {
			const base = hexToLinear(hex), L = linearToOklab(base)[0], a = linearToOklab(sectionColour('auto', 1, base))[0], b = linearToOklab(sectionColour('auto', 2, base))[0];
			expect(Math.abs(a - L), hex).toBeGreaterThan(0.12);
			expect(Math.abs(b - L), hex).toBeGreaterThan(Math.abs(a - L));
			expect(Math.sign(a - L), hex).toBe(L < 0.6 ? 1 : -1);
			expect(autoShade(L, 2) / autoShade(L, 1)).toBeGreaterThan(1);
		}
		// a number is the shade itself; a colour is itself; null prints nothing
		const base = hexToLinear('#808080');
		expect(linearToOklab(sectionColour(0.2, 1, base))[0] - linearToOklab(base)[0]).toBeCloseTo(0.2, 2);
		expect(linearToOklab(sectionColour(-0.2, 1, base))[0] - linearToOklab(base)[0]).toBeCloseTo(-0.2, 2);
		expect(sectionColour('#ff0000', 1, base)).toEqual(hexToLinear('#ff0000'));
		expect(sectionColour(null, 1, base)).toBe(null);
		expect(sectionCss('#12ab34', 2, '#000000')).toBe('#12ab34');
		expect(sectionCss(null, 0, '#000000')).toBe(null);
		expect(sectionCss(0, 1, '#4080c0')).toBe('#4080c0');
		// OKLab there and back; white is L 1 with no colour, black 0
		const c = hexToLinear('#3a7bd5'), back = oklabToLinear(linearToOklab(c));
		back.forEach((v, i) => expect(v).toBeCloseTo(c[i], 5));
		const w = linearToOklab(hexToLinear('#ffffff')), k = linearToOklab(hexToLinear('#000000'));
		expect(w[0]).toBeCloseTo(1, 3); expect(Math.hypot(w[1], w[2])).toBeLessThan(1e-3); expect(k[0]).toBeCloseTo(0, 5);
	});

	it('the sections as the shader mixes them: a colour and its cover, nothing where the fabric shows', () => {
		const p = packCols({ ground: null, accent: '#ff0000', accent2: 'auto' }, hexToLinear('#000000'));
		expect([...p.data.slice(0, 4)]).toEqual([0, 0, 0, 0]);
		expect([...p.data.slice(4, 8)]).toEqual([1, 0, 0, 1]);
		expect(p.data[11]).toBe(1); expect(p.data[8]).toBeGreaterThan(0.02);
		expect(p.any).toBe(true);
		expect(packCols({ ground: null, accent: null, accent2: null }, [0, 0, 0]).any).toBe(false);
	});

	it('density modifiers as how much ink where, every spatial shape known to the shader', () => {
		const spatial = Object.keys(MOD_SHAPES).filter(isSpatial);
		for (const shape of spatial) {
			const m = packMods([{ on: 'density', shape, x: 0.01, y: 0.02, a: 90, w: 0.1, h: 0.05, from: 1, to: 0.2, clip: true, reverse: true, blend: 'add', feather: 0.01 }]);
			expect(m.n, shape).toBe(1);
			expect(m.B[0]).toBeCloseTo(0.1); expect(m.B[3]).toBeCloseTo(0.2); expect(m.C[2]).toBe(7);
		}
		expect(packMods([{ on: 'density', shape: 'edge' }]).edge).toBe(true);
		// what follows the crystals, a size or a colour, or is switched off, is no ink
		expect(packMods([{ on: 'density', shape: 'random' }, { on: 'size', shape: 'linear' }, { on: 'colour', shape: 'radial' }, { on: 'density', shape: 'linear', off: true }]).n).toBe(0);
		expect(packMods(Array(9).fill({ on: 'density', shape: 'linear' })).n).toBe(MAX_MODS);
	});

	it('the cloth to the design\'s own space is the pattern\'s map, backwards', () => {
		const piece = flatSquare(0.1), P = patternParams({ params: { layout: PREFIX + 'steps', x: 0.02, y: -0.03, rotate: 37, scale: 1.7, flip: true, px: 0.01, py: 0.004, pturn: 20, pscale: 0.8, sx: 1.3, sy: 0.7 } }, piece);
		const M = patternMap(P), m = clothToDesign(M), at = (mat, x, y) => [mat[0] * x + mat[3] * y + mat[6], mat[1] * x + mat[4] * y + mat[7]];
		for (const [x, y] of [[0, 0], [0.03, -0.02], [-0.07, 0.05]]) {
			const u = M.a * x + M.b * y + M.e, v = M.c * x + M.d * y + M.f, back = at(m, u, v);
			expect(back[0]).toBeCloseTo(x, 6); expect(back[1]).toBeCloseTo(y, 6);
			const f = frameOf(P), want = frameLocal(f, u, v), got = at(clothToFrame(f), u, v);
			expect(got[0]).toBeCloseTo(want[0], 6); expect(got[1]).toBeCloseTo(want[1], 6);
		}
		// a layer made local lies unturned on the origin (the crystals that follow it are drawn there)
		const L = designLayer({ seed: 3 }, P, { local: true }), o = at(L.clothToDesign, 0, 0), Ml = patternMap({ ...P, x: 0, y: 0, rotate: 0, flip: false });
		expect(Ml.a * o[0] + Ml.b * o[1] + Ml.e).toBeCloseTo(0, 6);
		expect(L.design).toBe('steps'); expect(L.cols.length).toBe(12);
	});
});

describe('a crystal layout as ink', () => {
	it('its lines as stretches on the cloth, mapped as the stones are, each copy of a cell drawn', () => {
		const G = new Geometry().reset({ x0: -1, x1: 1, y0: -1, y1: 1, r: 2 }, 0.004, 1, null, {});
		G.seg(0, 0, 0.01, 0);
		const stamp = G.stamped((T) => { T.seg(0, 0, 0, 0.005); });
		stamp(0.02, 0); stamp(0.04, 0);
		G.add(0.5, 0.5); // (a single stone: no line)
		G.finish();
		const m = { a: 2, b: 0, c: 0, d: 2, e: 0.1, f: -0.1, sc: 2, bend: null }, S = strokesOf(G, m, { x0: -5, x1: 5, y0: -5, y1: 5 });
		expect(S.nSegs).toBe(3);
		const seg = (i) => [...S.segs.slice(i * 5, i * 5 + 4)].map((v) => +v.toFixed(5));
		expect(seg(0)).toEqual([0.1, -0.1, 0.12, -0.1]);
		expect(seg(1)).toEqual([0.14, -0.1, 0.14, -0.09]);
		expect(seg(2)).toEqual([0.18, -0.1, 0.18, -0.09]);
		// nothing outside the box worth drawing; a bent line in steps short enough to curve
		expect(strokesOf(G, m, { x0: 1, x1: 2, y0: 1, y1: 2 }, 0.01).nSegs).toBe(0);
		const bent = strokesOf(G, { ...m, bend: (x, y, o) => { o.x = x; o.y = y + x * x; } }, { x0: -5, x1: 5, y0: -5, y1: 5 });
		expect(bent.nSegs).toBeGreaterThan(3);
	});

	it('a pattern\'s strokes: lines in the frame\'s own space, dots where its crystals are kept', () => {
		const piece = flatSquare(0.06), cache = new Map();
		const g = (layout, more = {}) => ({ id: 'g', kind: 'pattern', seed: 5, stone: 'Crystal', params: { layout, x: 0, y: 0, as: 'print', ...layoutDefaults(layout), ...more } });
		const lines = patternStrokes(g('stripes'), piece, { cache, dot: 1.5, width: 0.002 });
		expect(lines.nSegs).toBeGreaterThan(3);
		expect(lines.nDots).toBe(0); // (a line's own stones are not dots)
		[1, 0, 0, 0, 1, 0, 0, 0, 1].forEach((v, i) => expect(lines.toCloth[i]).toBeCloseTo(v, 9));
		// moving the pattern draws nothing again: the same strokes, another place
		const moved = patternStrokes(g('stripes', { x: 0.003, rotate: 90 }), piece, { cache, dot: 0, width: 0.002 });
		expect(moved.segs).toBe(lines.segs);
		expect(moved.toCloth[6]).toBeCloseTo(0.003); expect(moved.toCloth[0]).toBeCloseTo(0, 6); expect(moved.toCloth[1]).toBeCloseTo(1, 6);
		const dots = patternStrokes(g('grid'), piece, { cache: new Map(), dot: 2, width: 0.002 });
		expect(dots.nSegs).toBe(0);
		expect(dots.nDots).toBeGreaterThan(50);
		expect(dots.dots[4]).toBeGreaterThan(0); // a dot twice its crystal's size reaches past the line's half width
		expect(patternStrokes(g('grid'), piece, { cache: new Map(), dot: 0 }).nDots).toBe(0);
	});
});

describe('crystals that follow a print', () => {
	it('their settings: along every edge to begin with; a fill over the accent', () => {
		expect(gemsOf({})).toMatchObject({ mode: 'edges', edges: 'all' });
		expect(gemsOf({ gems: { mode: 'tone' } }).mode).toBe('edges'); // (a way of the first prints that is gone)
		expect(fillsOn({ layout: PREFIX + 'motifs' })).toEqual([false, true, false]);
		expect(fillsOn({ layout: PREFIX + 'motifs', gems: { on: [true, false, true] } })).toEqual([true, false, true]);
	});
});
