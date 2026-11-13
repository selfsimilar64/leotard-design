// Printed patterns, the parts that need no GPU: the designs' own settings and shader text, the gallery, the ink (colours,
// softness, how they run) as the shaders are given it, the wallpaper groups, a crystal layout's lines as ink, and how
// a pattern that is made as print behaves in the stone engine. The shaders themselves are compiled and drawn by
// dev/print-gallery.js (prints.html) in the app: Node has no WebGL.
import { describe, it, expect } from 'vitest';
import { DESIGNS, WALLPAPER, PREFIX, designOf, isDesign, madeAs, laysStones, printsInk, definesOf, designFloats } from '../src/prints/designs.js';
import { PRINT_GALLERY } from '../src/prints/gallery.js';
import { INK_DEFAULTS, inkOf, inkBase, packStops, packMods, bandsOf, stopAt, rampCss, gammaOf, clothToDesign, clothToFrame, designLayer, hexToLinear, linearToOklab } from '../src/prints/ink.js';
import { strokesOf } from '../src/prints/strokes.js';
import { fieldStones, gemsOf, fillsOn } from '../src/prints/field-stones.js';
import { MAX_STOPS, MAX_MODS, fieldFragment } from '../src/prints/glsl.js';
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
		expect(Object.keys(DESIGNS).length).toBeGreaterThan(40);
		for (const [key, D] of Object.entries(DESIGNS)) {
			expect(D.label, key).toBeTruthy();
			expect(D.glsl, key).toMatch(/float field\(vec2 p\)/);
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
		expect(() => fieldStones({ layout: PREFIX + 'stripes', ...layoutDefaults(PREFIX + 'stripes') }, G)).not.toThrow();
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
	it('every preset names a design, sets only its settings, and has colours that are colours', () => {
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
			expect(ink.stops.length, item.key).toBeGreaterThan(0);
			expect(ink.stops.length, item.key).toBeLessThanOrEqual(MAX_STOPS);
			expect(ink.stops.some(Boolean), item.key + ': something is printed').toBe(true);
			for (const c of ink.stops) if (c !== null) expect(c, item.key).toMatch(HEX);
			expect(['once', 'repeat', 'mirror'], item.key).toContain(ink.wrap);
			if (item.params?.as) expect(['stones', 'print', 'both'], item.key).toContain(item.params.as);
			// a design that goes round a middle repeats its colours a whole number of times, or it has a seam
			if (D.angular) expect(Number.isInteger(ink.repeat), item.key + ': whole repeats').toBe(true);
		}
		expect(n).toBeGreaterThan(140);
		expect(new Set(PRINT_GALLERY.flatMap((g) => g.items.map((i) => i.key))).size).toBe(n);
		// beside the crystal layouts in the one gallery, each family of one kind
		expect(GALLERY.filter((g) => g.kind === 'print').length).toBe(PRINT_GALLERY.length);
		expect(GALLERY.every((g) => g.kind === 'print' || g.kind === 'stones')).toBe(true);
		expect(GALLERY_ITEMS.get('p-mandala').layout).toBe(PREFIX + 'mandala');
	});
});

describe('made as crystals, print or both', () => {
	it('a record from before prints is crystals; a design starts as print', () => {
		expect(madeAs({ layout: 'scatter' })).toBe('stones');
		expect(madeAs({})).toBe('stones');
		expect(madeAs({ layout: PREFIX + 'blend' })).toBe('print');
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
		const both = runPattern(gen({ as: 'both' }), ctx), inked = runPattern(gen({ as: 'both', ink: { stops: ['#ff0000', null], soft: 1, width: 0.004 } }), ctx);
		expect(inked.map((s) => [s.fu, s.fv])).toEqual(both.map((s) => [s.fu, s.fv]));
		// (and the candidates are not drawn again for it: the same arrays)
		const cache = new Map(), a = patternCandidates(gen({ as: 'both' }), piece, cache), b = patternCandidates(gen({ as: 'both', ink: { stops: ['#00ff00', null] } }), piece, cache);
		expect(b.GX).toBe(a.GX);
	});

	it('a preset keeps colours chosen by hand, and takes the new preset\'s when they were the last one\'s own', () => {
		const first = presetPatch({}, 'p-blend'), own = first.ink.stops;
		expect(own).toEqual(GALLERY_ITEMS.get('p-blend').params.ink.stops);
		expect(presetPatch(first, 'p-stripes').ink.stops).toEqual(GALLERY_ITEMS.get('p-stripes').params.ink.stops);
		const mine = ['#123456', '#abcdef'], next = presetPatch({ ...first, ink: { ...first.ink, stops: mine } }, 'p-stripes');
		expect(next.ink.stops).toEqual(mine);
		expect(next.layout).toBe(PREFIX + 'stripes');
		// what it is made as is the designer's, unless the preset is made a way of its own
		expect(presetPatch({ ...first, as: 'both' }, 'p-stripes').as).toBe('both');
	});
});

describe('ink', () => {
	it('a design\'s ink over the defaults, its own settings over both', () => {
		expect(inkBase(PREFIX + 'blend').soft).toBe(1);
		expect(inkBase('grid').stops).toEqual(['#e6bf58', null]); // (a drawn layout: one line colour on the cloth's own)
		const ink = inkOf({ layout: PREFIX + 'blend', ink: { soft: 0.25 } });
		expect(ink.soft).toBe(0.25);
		expect(ink.stops).toEqual(INK_DEFAULTS.stops);
		expect(inkOf({ layout: 'grid', ink: { stops: Array(12).fill('#ffffff') } }).stops.length).toBe(MAX_STOPS);
	});

	it('colours as the shader blends them: the cloth\'s own takes its neighbour\'s colour at no cover', () => {
		const p = packStops({ stops: ['#ff0000', null, '#0000ff'], reverse: false });
		expect(p.n).toBe(3);
		expect([...p.data.slice(4, 7)]).toEqual([...p.data.slice(0, 3)]); // the bare stop: the red before it
		expect([p.data[3], p.data[7], p.data[11]]).toEqual([1, 0, 1]);
		const r = packStops({ stops: ['#ff0000', null, '#0000ff'], reverse: true });
		expect([...r.data.slice(0, 3)]).toEqual([...p.data.slice(8, 11)]);
		expect(packStops({ stops: [null, null] }).any).toBe(false);
		// OKLab: white is L 1 with no colour, black 0
		const w = linearToOklab(hexToLinear('#ffffff')), k = linearToOklab(hexToLinear('#000000'));
		expect(w[0]).toBeCloseTo(1, 3); expect(Math.hypot(w[1], w[2])).toBeLessThan(1e-3); expect(k[0]).toBeCloseTo(0, 5);
		expect(gammaOf(0)).toBe(1); expect(gammaOf(1)).toBeCloseTo(0.25); expect(gammaOf(-1)).toBeCloseTo(4);
	});

	it('hard edges split the design evenly; full softness is one blend from end to end', () => {
		const hard = bandsOf({ stops: ['a', 'b', 'c', 'd'], soft: 0, wrap: 'once' }), soft = bandsOf({ stops: ['a', 'b', 'c', 'd'], soft: 1, wrap: 'once' });
		// colours meet halfway between stops i and i + 1: at a + (i + 0.5) d
		expect([0, 1, 2].map((i) => hard.a + (i + 0.5) * hard.d)).toEqual([0.25, 0.5, 0.75]);
		expect(soft.a).toBeCloseTo(0); expect(soft.a + 3 * soft.d).toBeCloseTo(1); // first stop at 0, last at 1
		const cyc = bandsOf({ stops: ['a', 'b', 'c'], soft: 1, wrap: 'repeat' });
		expect(cyc.cyc).toBe(true); expect(cyc.d).toBeCloseTo(1 / 3);
		// the stop that owns a band coordinate
		expect([-0.4, 0.4, 0.6, 2.4, 2.6, 9].map((e) => stopAt(e, 3, false))).toEqual([0, 0, 1, 2, 2, 2]);
		expect([-0.6, 2.6, 3.4, 4.6].map((e) => stopAt(e, 3, true))).toEqual([2, 0, 0, 2]);
		expect(stopAt(0, 3, false, true)).toBe(2);
		expect(rampCss({ stops: ['#000000', '#ffffff'], soft: 0, wrap: 'once' })).toMatch(/^linear-gradient/);
		expect(rampCss({ stops: ['#123456'], soft: 0, wrap: 'once' })).toBe('#123456');
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
		const piece = flatSquare(0.1), P = patternParams({ params: { layout: PREFIX + 'stripes', x: 0.02, y: -0.03, rotate: 37, scale: 1.7, flip: true, px: 0.01, py: 0.004, pturn: 20, pscale: 0.8, sx: 1.3, sy: 0.7 } }, piece);
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
		expect(L.design).toBe('stripes'); expect(L.n).toBe(inkOf(P).stops.length);
	});
});

describe('wallpaper groups', () => {
	const ORDER = { p1: 1, p2: 2, pm: 2, pg: 2, cm: 4, pmm: 4, pmg: 4, pgg: 4, cmm: 8, p4: 4, p4m: 8, p4g: 8, p3: 3, p3m1: 6, p31m: 6, p6: 6, p6m: 12 };
	// (matrices as columns: m = [m00, m10, m01, m11])
	const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3]];
	const apply = (m, t) => [m[0] * t[0] + m[2] * t[1], m[1] * t[0] + m[3] * t[1]];
	const frac = (x) => { const f = x - Math.floor(x + 1e-9); return Math.abs(f - 1) < 1e-9 ? 0 : f; };
	it('all seventeen, each closed: one operation after another is again one of the group, up to the lattice', () => {
		expect(Object.keys(WALLPAPER).sort()).toEqual(Object.keys(ORDER).sort());
		for (const [name, G] of Object.entries(WALLPAPER)) {
			expect(G.ops.length, name).toBe(ORDER[name]);
			const key = (o) => o.m.join() + '|' + o.t.map((x) => frac(x).toFixed(4)).join(), keys = new Set(G.ops.map(key));
			expect(keys.size, name + ': no operation twice').toBe(G.ops.length);
			for (const a of G.ops) for (const b of G.ops) {
				const at = apply(a.m, b.t), c = { m: mul(a.m, b.m), t: [at[0] + a.t[0], at[1] + a.t[1]] };
				expect(keys.has(key(c)), `${name}: ${key(a)} after ${key(b)}`).toBe(true);
			}
			// and every operation keeps lengths in the cell's own metric (an isometry of the lattice)
			const [ax, ay, bx, by] = G.basis, len = (u, v) => Math.hypot(u * ax + v * bx, u * ay + v * by);
			for (const o of G.ops) for (const [u, v] of [[1, 0], [0, 1], [1, 1]]) { const w = apply(o.m, [u, v]); expect(len(w[0], w[1]), name).toBeCloseTo(len(u, v), 5); }
		}
	});
	it('packs its operations and waves for the shader, a new design a seed', () => {
		const pack = DESIGNS.wallpaper.pack, P = { group: 'p4m', waves: 3, fine: 2 }, V = pack(P, 5);
		expect(V.length).toBe(160);
		expect(V[0]).toBe(8); expect(V[1]).toBe(3);
		expect([...V.slice(8, 12)]).toEqual([1, 0, 0, 1]); // the first operation: nothing
		const waves = (W) => [0, 1, 2].map((k) => [...W.slice((26 + k) * 4, (26 + k) * 4 + 2)]);
		for (const [n, m] of waves(V)) { expect(Number.isInteger(n) && Number.isInteger(m)).toBe(true); expect(n || m).toBeTruthy(); }
		expect(new Set(waves(V).map(String)).size).toBe(3);
		expect([...pack(P, 6)]).not.toEqual([...V]);
		expect([...pack(P, 5)]).toEqual([...V]);
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
	it('their settings: along the edges to begin with; a fill over the first colour that is printed', () => {
		expect(gemsOf({}).mode).toBe('edges');
		expect(gemsOf({ gems: { mode: 'tone', dots: 0.01 } })).toMatchObject({ mode: 'tone', dots: 0.01, small: 0.35 });
		expect(fillsOn({ layout: PREFIX + 'dots', ink: { stops: [null, '#ffffff', '#000000'] } })).toEqual([false, true, false]);
		expect(fillsOn({ layout: PREFIX + 'dots', ink: { stops: ['#ffffff', '#000000'] }, gems: { on: [false, true] } })).toEqual([false, true]);
	});
});
