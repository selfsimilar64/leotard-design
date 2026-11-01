// Stone patterns (stones/pattern.js, knowledge/engineering/architecture/procedural-stone-patterns.md):
// the arrangements in isolation, every control of every preset, the flat-cloth map on a real garment, and
// what makes live editing possible: a group re-runs alone, moving a pattern moves its stones rigidly, and
// thinning never moves the stones that stay.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadBody } from './helpers.js';
import { LAYOUTS, LAYOUT_KINDS, layoutDefaults, GALLERY, GALLERY_ITEMS } from '../src/stones/layouts.js';
import { Candidates, Drawing, SIZES } from '../src/stones/candidates.js';
import { blueTile, TILE_R, TILES } from '../src/stones/layouts-lattice.js';
import { wallpaperOps, WALLPAPER_GROUPS } from '../src/stones/layouts-tiling.js';
import { curvePoints, curveData, CURVES } from '../src/stones/layouts-curves.js';
import { distortion } from '../src/stones/fields.js';
import { MOD_SHAPES, compileMods, modGeometry, newModifier, sizeRange } from '../src/stones/modifiers.js';
import { ClothPiece, mirrorFast } from '../src/stones/cloth.js';
import { runPattern, patternStones, patternParams, patternMap, presetPatch, flipPatternParams, minScale, frameOf, frameToCloth, clothToFrame } from '../src/stones/pattern.js';
import { patternHandles } from '../src/stones/handles.js';
import { runStones } from '../src/stones/generators.js';
import { buildGarment } from '../src/garment/build.js';
import { cellPiece } from '../src/garment/pieces.js';
import { flatten } from '../src/garment/flatten.js';
import { mirrorSP } from '../src/curves/points.js';
import { DocumentStore } from '../src/doc/store.js';
import { newDocument } from '../src/doc/schema.js';
import '../src/doc/commands-garment.js';
import '../src/doc/commands-stones.js';
import '../src/doc/symmetry.js';

const BOX = { x0: -0.15, x1: 0.15, y0: -0.2, y1: 0.2, r: 0.25 };
const candidatesOf = (name, extra = {}, pitch = 0.004, seed = 3) => {
	const E = new Candidates(1024).reset(BOX, pitch, seed, (u, v) => Math.min(0.15 - Math.abs(u), 0.2 - Math.abs(v)), { d0: pitch / 1.15, gap: 1.15 });
	LAYOUTS[name].make({ ...layoutDefaults(name), ...extra }, E);
	E.finish();
	return E;
};

// A flat rectangle of cloth, for what does not need a body: the place of a stone comes back as its sp.
function flatPiece(w = 0.4, h = 0.6) {
	const piece = {
		x0: -w / 2, x1: w / 2, y0: -h / 2, y1: h / 2, w1: 0, w2: 0,
		edgeAt: (u, v) => Math.min(w / 2 - Math.abs(u), h / 2 - Math.abs(v)),
		find: (u, v) => { piece.u = u; piece.v = v; return 0; },
		posOf: (q, o) => { o.x = piece.u; o.y = piece.v; o.z = 0; return o; },
		spOf: () => ({ u: piece.u, v: piece.v }),
		angleOf: (q, a) => a,
	};
	return piece;
}
const FLAT = flatPiece(), SMALL = flatPiece(0.2, 0.2);
const stonesOf = (params, more = {}, piece = FLAT, opts = {}) => patternStones({ id: 'g', seed: 3, stone: 'Crystal', shape: 'round', params: { size: 'ss12', gap: 1.15, ...params }, ...more }, piece, opts);
const presetParams = (it) => ({ layout: it.layout, preset: it.key, ...layoutDefaults(it.layout), ...it.params, mods: (it.mods ?? []).map((m, i) => newModifier(m.on, m.shape, m, 'm' + i)) });
// what a set of stones looks like, to a twentieth of a millimetre, as one number whatever their order: whether two
// differ is whether a control did anything
const stoneIds = new Map();
const look = (list) => {
	let sum = list.length;
	for (const s of list) {
		let id = stoneIds.get(s.stone);
		if (id === undefined) stoneIds.set(s.stone, id = stoneIds.size + 1);
		let x = Math.imul(Math.round(s.sp.u * 2e4), 73856093) ^ Math.imul(Math.round(s.sp.v * 2e4), 19349663) ^ Math.imul(Math.round(s.size * 1e5), 83492791) ^ Math.imul(id, 2654435761);
		x = Math.imul(x ^ (x >>> 13), 0x5bd1e995);
		sum = (sum + ((x ^ (x >>> 15)) >>> 0)) % 281474976710597;
	}
	return sum;
};

describe('arrangements', () => {
	for (const name of LAYOUT_KINDS) {
		it(`${name}: stones on the piece, repeatable, in budget`, () => {
			const t0 = performance.now(), E = candidatesOf(name), ms = performance.now() - t0;
			expect(E.n, name).toBeGreaterThan(5);
			expect(E.truncated, name).toBe(false);
			for (let i = 0; i < E.n; i++) {
				expect(Number.isFinite(E.X[i]) && Number.isFinite(E.Y[i]) && Number.isFinite(E.A[i]) && E.K[i] > 0 && E.D[i] > 0).toBe(true);
				expect(E.R[i] >= 0 && E.R[i] <= 1, `${name} rank ${E.R[i]}`).toBe(true);
			}
			const F = candidatesOf(name);
			expect(F.n).toBe(E.n);
			expect(Array.from(F.X.subarray(0, 50))).toEqual(Array.from(E.X.subarray(0, 50)));
			expect(ms, name).toBeLessThan(400); // the slowest are kept between frames (heavy)
		});
	}

	it('every gallery entry names a real arrangement, with parameters it knows', () => {
		const known = new Set(['size']);
		for (const g of GALLERY) for (const it of g.items) {
			expect(LAYOUTS[it.layout], it.key).toBeDefined();
			const own = new Set(LAYOUTS[it.layout].params.map((p) => p.k));
			for (const k of Object.keys(it.params ?? {})) expect(own.has(k) || known.has(k), `${it.key}.${k}`).toBe(true);
			for (const m of it.mods ?? []) expect(MOD_SHAPES[m.shape], `${it.key} ${m.shape}`).toBeDefined();
		}
		expect(GALLERY_ITEMS.size).toBeGreaterThan(120);
		expect(GALLERY.reduce((a, g) => a + g.items.length, 0), 'gallery keys are unique').toBe(GALLERY_ITEMS.size);
	});

	it('every preset lays stones, in budget, all of sizes that exist', { timeout: 60000 }, () => {
		for (const it of GALLERY_ITEMS.values()) {
			const list = stonesOf(presetParams(it));
			expect(list.length, it.key).toBeGreaterThan(5);
			expect(list.length, it.key).toBeLessThan(60000);
			for (const s of list) expect(SIZES.includes(s.size), `${it.key} ${s.size}`).toBe(true);
		}
	});

	it('the spirals have no Keep control: what they keep is the preset', () => {
		for (const name of ['phyllotaxis', 'sacks', 'ulam']) {
			const spec = LAYOUTS[name].params.find((p) => p.k === 'numbers');
			expect(spec.hidden, name).toBe(true);
			expect(spec.options, name).toBeUndefined();
		}
		expect(GALLERY_ITEMS.get('phyllotaxis-prime').params.numbers).toBe('prime');
		// a prime preset really keeps fewer than the plain one
		expect(stonesOf(presetParams(GALLERY_ITEMS.get('phyllotaxis-prime'))).length).toBeLessThan(stonesOf({ ...presetParams(GALLERY_ITEMS.get('phyllotaxis')), spacing: 0.0035 }).length * 0.4);
	});

	it('the scatter tile: every prefix evenly spread, nothing too close', () => {
		const T = blueTile();
		expect(T.n).toBeGreaterThan(3000);
		const closest = (n) => {
			let best = Infinity;
			for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) {
				let dx = Math.abs(T.X[i] - T.X[j]), dy = Math.abs(T.Y[i] - T.Y[j]);
				if (dx > 0.5) dx = 1 - dx;
				if (dy > 0.5) dy = 1 - dy;
				best = Math.min(best, Math.hypot(dx, dy));
			}
			return best;
		};
		expect(closest(T.n)).toBeGreaterThanOrEqual(TILE_R * 0.99);
		// the first tenth of the points is as well spread as a tenth of the points can be
		expect(closest(Math.floor(T.n / 10))).toBeGreaterThan(TILE_R * 2);
	});

	it('all 17 wallpaper groups are rigid motions that map the pattern onto itself', () => {
		expect(Object.keys(WALLPAPER_GROUPS)).toHaveLength(17);
		for (const name of Object.keys(WALLPAPER_GROUPS)) {
			const G = wallpaperOps(name), lat = (x, y) => {
				// is (x, y) a lattice vector?
				const det = G.a[0] * G.b[1] - G.a[1] * G.b[0], i = (x * G.b[1] - y * G.b[0]) / det, j = (y * G.a[0] - x * G.a[1]) / det;
				return Math.abs(i - Math.round(i)) < 1e-6 && Math.abs(j - Math.round(j)) < 1e-6;
			};
			for (const o of G.ops) {
				expect(Math.abs(o.a * o.a + o.c * o.c - 1), name).toBeLessThan(1e-6);
				expect(Math.abs(o.a * o.b + o.c * o.d), name).toBeLessThan(1e-6);
				expect(Math.abs(Math.abs(o.a * o.d - o.b * o.c) - 1), name).toBeLessThan(1e-6);
			}
			// closed: an op after an op is an op of the group, up to a lattice vector
			const x = 0.123, y = 0.237;
			for (const p of G.ops) for (const q of G.ops) {
				const m = q.a * x + q.b * y + q.e, n = q.c * x + q.d * y + q.f, X = p.a * m + p.b * n + p.e, Y = p.c * m + p.d * n + p.f;
				expect(G.ops.some((o) => lat(X - (o.a * x + o.b * y + o.e), Y - (o.c * x + o.d * y + o.f))), `${name} not closed`).toBe(true);
			}
		}
	});

	it('all 17 groups differ by what they are made of', () => {
		const orders = Object.fromEntries(Object.keys(WALLPAPER_GROUPS).map((k) => [k, wallpaperOps(k).ops.length]));
		expect(orders).toEqual({ p1: 1, p2: 2, pm: 2, pg: 2, cm: 4, pmm: 4, pmg: 4, pgg: 4, cmm: 8, p4: 4, p4m: 8, p4g: 8, p3: 3, p3m1: 6, p31m: 6, p6: 6, p6m: 12 });
	});

	it('a Penrose tiling is a tiling: rhombs that fit, corners never closer than the thin rhomb allows', () => {
		const s = 0.016, E = candidatesOf('quasicrystal', { fold: 5, spacing: s, draw: 'vertices' }), pts = [];
		for (let i = 0; i < E.n; i++) pts.push([E.X[i], E.Y[i]]);
		expect(pts.length).toBeGreaterThan(200);
		let closest = Infinity;
		const counts = new Map();
		for (const [x, y] of pts) {
			let n = 0;
			for (const [u, v] of pts) {
				const d = Math.hypot(u - x, v - y);
				if (d > 1e-9) { closest = Math.min(closest, d); if (Math.abs(d - s) < s * 0.01) n++; }
			}
			if (Math.abs(x) < 0.08 && Math.abs(y) < 0.1) counts.set(n, (counts.get(n) ?? 0) + 1);
		}
		// the short diagonal of the thin rhomb: 2 sin 18 degrees of an edge
		expect(closest / s).toBeGreaterThan(0.6);
		// every inner corner has between 3 and 7 neighbours one edge away, as Penrose vertices do
		for (const k of counts.keys()) expect(k, [...counts.entries()].join(' ')).toBeGreaterThanOrEqual(3);
		for (const k of counts.keys()) expect(k).toBeLessThanOrEqual(7);
	});

	it('the tiles and curves are all there', () => {
		for (const k of Object.keys(TILES)) expect(candidatesOf('tile', { tile: k }).n, k).toBeGreaterThan(5);
		for (const k of Object.keys(CURVES)) expect(curvePoints(k, CURVES[k].order).length, k).toBeGreaterThan(20);
		for (const fold of [5, 7, 8, 12]) for (const draw of ['edges', 'vertices']) expect(candidatesOf('quasicrystal', { fold, draw }).n).toBeGreaterThan(50);
		for (const tiling of ['hex', 'square', 'octagon', 'trihex', 'dodeca']) expect(candidatesOf('stars', { tiling }).n, tiling).toBeGreaterThan(50);
	});

	it('distortions only act when asked', () => {
		expect(distortion({}, 1)).toBeNull();
		const d = distortion({ warp: 0.01 }, 1), a = {}, b = {};
		d(0.01, 0.02, a); d(0.01, 0.02, b);
		expect(a).toEqual(b);
		expect(Math.hypot(a.x - 0.01, a.y - 0.02)).toBeLessThan(0.02);
	});

	it('a drawing kept between frames lays the same stones as drawing afresh', () => {
		for (const name of LAYOUT_KINDS.filter((k) => LAYOUTS[k].heavy)) {
			const P = { layout: name, x: 0.01, y: -0.02, rotate: 20 }, plain = stonesOf(P), cached = stonesOf(P, {}, FLAT, { cache: new Map() });
			expect(cached.length, name).toBeGreaterThan(0);
			// (its box is wider and on round numbers, so what the lines start from may differ at the very edge)
			expect(Math.abs(cached.length - plain.length) / plain.length, name).toBeLessThan(0.12);
		}
		expect(new Drawing().reset(BOX, 0.004, 1, null)).toBeInstanceOf(Drawing);
	});
});

// ---------------------------------------------------------------------------------------------
// What the crystals' places hang on: a stone at each corner, centre and crossing, a whole number between.
describe('the stones a design hangs on', () => {
	const near = (list, u, v, tol = 0.0004) => list.some((s) => Math.hypot(s.sp.u - u, s.sp.v - v) < tol);

	it('a tiling has a stone on every joint, whatever the stones\' size', () => {
		for (const size of ['ss6', 'ss12', 'ss20']) {
			const s = 0.03, t = TILES.honeycomb, list = stonesOf({ layout: 'tile', tile: 'honeycomb', spacing: s, nodeSize: 1, size });
			for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) {
				const x = (i * t.a[0] + j * t.b[0]) * s, y = (i * t.a[1] + j * t.b[1]) * s;
				for (const [a, b] of [[0, 0], [0, 1]]) if (Math.abs(x + a * s) < 0.18 && Math.abs(y + b * s) < 0.28) expect(near(list, x + a * s, y + b * s), `${size} ${i},${j} ${a},${b}`).toBe(true);
			}
		}
	});
	it('a line between joints: even, and never closer than its stones ask', () => {
		const s = 0.03, list = stonesOf({ layout: 'tile', tile: 'honeycomb', spacing: s, nodeSize: 1, size: 'ss12', gap: 1.05 });
		const d = list[0].size;
		for (const a of list.slice(0, 300)) {
			let best = Infinity;
			for (const b of list) if (a !== b) best = Math.min(best, Math.hypot(a.sp.u - b.sp.u, a.sp.v - b.sp.v));
			expect(best).toBeGreaterThan(d * 0.92);
			expect(best).toBeLessThan(d * 1.8);
		}
	});
	it('the middle of rings and rosettes is never lost', () => {
		for (const [layout, more] of [['rings', { spacing: 0.004 }], ['rings', { spacing: 0.02, spokes: 12 }], ['mandala', { spacing: 0.006 }], ['rose', {}]]) {
			expect(near(stonesOf({ layout, x: 0, y: 0, ...more }), 0, 0), layout).toBe(true);
		}
	});
	it('a big stone in the middle wins over the line stones round it', () => {
		const list = stonesOf({ layout: 'rings', x: 0, y: 0, spacing: 0.005, centre: 3, size: 'ss12' }), mid = list.find((s) => Math.hypot(s.sp.u, s.sp.v) < 1e-4);
		expect(mid.size).toBeGreaterThan(0.008);
	});
	it('a star has a stone on all five points and in its five notches', () => {
		const R = 0.03, list = stonesOf({ layout: 'motifs', motif: 'star', motifSize: R * 2, spacing: 0.3, motifTurn: 0, cells: 'square', x: 0, y: 0 });
		for (let k = 0; k < 10; k++) { const r = k % 2 ? 0.42 * R : R, a = Math.PI / 2 + (k * Math.PI) / 5; expect(near(list, r * Math.cos(a), r * Math.sin(a), 0.0006), 'corner ' + k).toBe(true); }
	});
	it('the flower of life: a stone on every crossing, and regular: every circle alike', () => {
		const s = 0.03, list = stonesOf({ layout: 'circles', cells: 'hex', overlap: 1, spacing: s, nodeSize: 1, x: 0, y: 0, size: 'ss8' });
		// where circles round the neighbouring centres cross
		for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6, r = k % 2 ? s * Math.sqrt(3) : s; expect(near(list, r * Math.cos(a), r * Math.sin(a), 0.0005), 'crossing ' + k).toBe(true); }
		// the pattern's own symmetry survives: a half turn about a centre maps stones onto stones
		let missed = 0, seen = 0;
		for (const a of list) { if (Math.hypot(a.sp.u, a.sp.v) > 0.1) continue; seen++; if (!near(list, -a.sp.u, -a.sp.v, 0.0012)) missed++; }
		expect(seen).toBeGreaterThan(100);
		expect(missed / seen).toBeLessThan(0.02);
	});
	it('a trellis has a stone on every crossing, of the size asked', () => {
		const s = 0.03, list = stonesOf({ layout: 'trellis', spacing: s, nodeSize: 2, skew: 45, x: 0, y: 0, size: 'ss8' }), step = s / Math.SQRT2 / Math.SQRT1_2 / Math.SQRT2;
		const big = list.filter((a) => a.size > 0.004);
		expect(big.length).toBeGreaterThan(50);
		expect(near(big, 0, 0)).toBe(true);
		expect(near(big, s * Math.SQRT2, 0, 0.0006) || near(big, step, step, 0.0006)).toBe(true);
	});
	it('chevrons and hilbert curves turn on a stone', () => {
		const ch = stonesOf({ layout: 'chevrons', spacing: 0.04, amp: 0.012, period: 0.05, nodeSize: 1, x: 0, y: 0 });
		for (let m = -3; m <= 3; m++) expect(near(ch, (m & 1 ? 1 : -1) * 0.012, m * 0.025, 0.0005), 'corner ' + m).toBe(true);
		const { pts, gen } = curveData('hilbert', 3), H = stonesOf({ layout: 'grown', curve: 'hilbert', order: 3, extent: 0.2, x: 0, y: 0, size: 'ss8' });
		for (let i = 1; i < gen.length - 1; i++) if (gen[i] !== 255) expect(near(H, pts[i * 2] * 0.2, pts[i * 2 + 1] * 0.2, 0.0005), 'turn ' + i).toBe(true);
	});
	it('what a design hangs on is the last to thin out', () => {
		const P = { layout: 'tile', tile: 'honeycomb', spacing: 0.04, nodeSize: 1, x: 0, y: 0, size: 'ss8' }, all = stonesOf(P), half = stonesOf({ ...P, density: 0.45 });
		expect(half.length).toBeLessThan(all.length * 0.75);
		// joints all stay
		const t = TILES.honeycomb, s = 0.04;
		for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
			const x = (i * t.a[0] + j * t.b[0]) * s, y = (i * t.a[1] + j * t.b[1]) * s;
			if (FLAT.edgeAt(x, y) > 0.005) expect(near(half, x, y, 0.0005), `${i},${j}`).toBe(true);
		}
	});
	it('a line\'s stones keep their spacing under a twist: they are spaced on the cloth', () => {
		const P = { layout: 'stripes', spacing: 0.03, gap: 1.2, size: 'ss12', x: 0, y: 0 }, list = stonesOf({ ...P, bulge: 1.5, bulgeR: 0.08 }), d = list[0].size, gaps = [];
		for (const a of list) {
			let best = Infinity;
			for (const b of list) if (a !== b) best = Math.min(best, Math.hypot(a.sp.u - b.sp.u, a.sp.v - b.sp.v));
			gaps.push(best);
		}
		gaps.sort((a, b) => a - b);
		expect(gaps[Math.floor(gaps.length * 0.02)]).toBeGreaterThan(d * 1.05);
		expect(gaps[Math.floor(gaps.length * 0.98)]).toBeLessThan(d * 1.6);
	});
	it('stones scale apart, never in size; a stretched line keeps its pitch too', () => {
		const P = { layout: 'stripes', spacing: 0.02, gap: 1.2 }, a = stonesOf(P), b = stonesOf({ ...P, scale: 2 }), c = stonesOf({ ...P, sx: 0.5, sy: 2.5 });
		expect(new Set(a.map((s) => s.size)).size).toBe(1);
		expect(b[0].size).toBe(a[0].size);
		const pitch = (list) => { const near2 = []; for (let i = 0; i < list.length; i += 9) { let best = Infinity; for (let j = 0; j < list.length; j++) if (i !== j) best = Math.min(best, Math.hypot(list[i].sp.u - list[j].sp.u, list[i].sp.v - list[j].sp.v)); near2.push(best); } near2.sort((x, y) => x - y); return near2[near2.length >> 1]; };
		expect(Math.abs(pitch(b) - pitch(a)) / pitch(a)).toBeLessThan(0.05);
		expect(Math.abs(pitch(c) - pitch(a)) / pitch(a)).toBeLessThan(0.05);
	});
});

// ---------------------------------------------------------------------------------------------
// Moving a pattern as a whole moves its stones rigidly: none crawls along its line, none blinks.
describe('a pattern moves as one', () => {
	// (a fade from the piece's edge belongs to the piece, not to where the pattern is)
	const cases = [...GALLERY_ITEMS.values()].filter((it) => !LAYOUTS[it.layout].flat && !it.mods?.some((m) => m.shape === 'edge'));
	const rigid = (it, dx, dy, opts) => {
		const P = { ...presetParams(it), x: 0, y: 0 }, a = stonesOf(P, {}, SMALL, opts()), b = stonesOf({ ...P, x: dx, y: dy }, {}, SMALL, opts());
		// away from the piece's edges, each stone has its partner, the same distance off
		const cell = 0.002, grid = new Map(), key = (u, v) => Math.floor(u / cell) + ':' + Math.floor(v / cell);
		for (const s of b) { const k = key(s.sp.u, s.sp.v); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(s); }
		let seen = 0, found = 0;
		for (const s of a) {
			const u = s.sp.u + dx, v = s.sp.v + dy;
			if (SMALL.edgeAt(u, v) < 0.03 || SMALL.edgeAt(s.sp.u, s.sp.v) < 0.03) continue;
			seen++;
			let ok = false;
			for (let j = -1; j <= 1 && !ok; j++) for (let i = -1; i <= 1 && !ok; i++) for (const o of grid.get(key(u + i * cell, v + j * cell)) ?? []) if (Math.hypot(o.sp.u - u, o.sp.v - v) < 0.0002 && o.size === s.size) { ok = true; break; }
			if (ok) found++;
		}
		return { seen, found };
	};
	it('every preset, moved a little', { timeout: 120000 }, () => {
		const bad = [];
		for (const it of cases) {
			const { seen, found } = rigid(it, 0.0137, -0.0091, () => (LAYOUTS[it.layout].heavy ? { cache: new Map() } : {}));
			if (seen < 5) continue;
			if (found / seen < 0.97) bad.push(`${it.key} ${found}/${seen}`);
		}
		expect(bad).toEqual([]);
	});
	it('a modifier goes with it: a radial fade is centred where the pattern is put', () => {
		const P = { layout: 'hex', spacing: 0.008, mods: [{ id: 'm', on: 'density', shape: 'radial', from: 1, to: 0, clip: true, w: 0.05, h: 0.05 }] };
		const centre = (list) => { let u = 0, v = 0; for (const s of list) { u += s.sp.u; v += s.sp.v; } return [u / list.length, v / list.length]; };
		const a = centre(stonesOf({ ...P, x: 0, y: 0 })), b = centre(stonesOf({ ...P, x: 0.07, y: 0.11 }));
		expect(Math.hypot(a[0], a[1])).toBeLessThan(0.004);
		expect(Math.hypot(b[0] - 0.07, b[1] - 0.11)).toBeLessThan(0.004);
		// and it turns and scales with it
		const box = { layout: 'hex', spacing: 0.008, x: 0, y: 0, mods: [{ id: 'm', on: 'density', shape: 'linear', from: 1, to: 1, clip: true, a: 0, w: 0.2, h: 0.05 }] };
		const spread = (list) => { let mu = 0, mv = 0; for (const s of list) { mu = Math.max(mu, Math.abs(s.sp.u)); mv = Math.max(mv, Math.abs(s.sp.v)); } return [mu, mv]; };
		const [w0, h0] = spread(stonesOf(box)), [w1, h1] = spread(stonesOf({ ...box, rotate: 90 })), [w2, h2] = spread(stonesOf({ ...box, scale: 0.5 }));
		expect(w0).toBeGreaterThan(h0 * 3);
		expect(h1).toBeGreaterThan(w1 * 3);
		expect(Math.abs(w2 - w0 * 0.5)).toBeLessThan(0.01);
		expect(h2).toBeLessThan(h0 * 0.7);
	});
	it('pattern positioning shifts the crystals only: the modifier stays', () => {
		const P = { layout: 'hex', spacing: 0.01, x: 0, y: 0, mods: [{ id: 'm', on: 'density', shape: 'radial', from: 1, to: 1, clip: true, w: 0.08, h: 0.08 }] };
		const a = stonesOf(P), b = stonesOf({ ...P, px: 0.0033, py: 0.0017 });
		expect(look(a)).not.toBe(look(b));
		for (const s of b) expect(Math.hypot(s.sp.u, s.sp.v)).toBeLessThanOrEqual(0.08);
		// a stone's place moved by exactly that, under a mask that did not
		const free = { ...P, mods: [] }, c = stonesOf(free), e = stonesOf({ ...free, px: 0.004, py: 0 }), has = new Set(e.map((s) => Math.round(s.sp.u * 1e4) + ':' + Math.round(s.sp.v * 1e4)));
		let hit = 0;
		for (const s of c) if (has.has(Math.round((s.sp.u + 0.004) * 1e4) + ':' + Math.round(s.sp.v * 1e4))) hit++;
		expect(hit / c.length).toBeGreaterThan(0.9);
	});
	it('the frame maths: there and back', () => {
		const f = frameOf({ x: 0.03, y: -0.02, rotate: 33, scale: 1.7, flip: true }), [u, v] = frameToCloth(f, 0.011, -0.05), [a, b] = clothToFrame(f, u, v);
		expect(a).toBeCloseTo(0.011, 9);
		expect(b).toBeCloseTo(-0.05, 9);
	});
});

// ---------------------------------------------------------------------------------------------
// Every control does something.
describe('no dead controls', () => {
	// (a value the slider can have: on its step)
	const onStep = (s, v) => (s.step ? Math.round(v / s.step) * s.step : v);
	const samples = (s) => {
		if (s.options) return s.options.map(([v]) => v);
		const max = s.max;
		return [s.min, onStep(s, s.min + (max - s.min) * 0.5), max];
	};
	// how a preset's own params may hide a control is its `when`
	const visible = (s, P) => !s.hidden && (!s.when || s.when(P));
	// (each arrangement in every state of what it shows: thousands of pipelines, so no more than that)
	const seen = new Set(), states = [];
	for (const it of GALLERY_ITEMS.values()) {
		const P = presetParams(it), sig = it.layout + ':' + LAYOUTS[it.layout].params.filter((s) => visible(s, P)).map((s) => s.k).join() + ':' + (it.mods?.length ?? 0);
		if (!seen.has(sig)) { seen.add(sig); states.push(it); }
	}
	// (on a small piece: there are thousands of these to try. A control whose effect lies further out than that
	// would be a dead one here, so what reaches far is judged on the bigger piece)
	const quick = (P, more) => look(stonesOf(P, more, SMALL));
	const wide = (P, more) => look(stonesOf(P, more, FLAT));
	it('every slider and choice of every arrangement changes its stones', { timeout: 280000 }, () => {
		const dead = [];
		for (const it of states) {
			const layout = LAYOUTS[it.layout], P = { ...presetParams(it), x: 0, y: 0 }, base = quick(P);
			let wideBase = null;
			for (const s of layout.params) {
				if (!visible(s, P)) continue;
				const max = s.maxOf ? s.maxOf(P, FLAT) : s.max;
				const vals = s.options ? s.options.map(([v]) => v) : samples({ ...s, max });
				if (vals.some((v) => v !== P[s.k] && quick({ ...P, [s.k]: v }) !== base)) continue;
				wideBase ??= wide(P);
				if (!vals.some((v) => v !== P[s.k] && wide({ ...P, [s.k]: v }) !== wideBase)) dead.push(`${it.key}.${s.k}`);
			}
		}
		expect(dead).toEqual([]);
	});
	it('no part of a slider\'s range is dead: from one end to the other it keeps changing things', { timeout: 280000 }, () => {
		// (the values at both ends of the upper half must differ: a slider may not stop working half way)
		const dead = [];
		for (const it of states) {
			const layout = LAYOUTS[it.layout], P = { ...presetParams(it), x: 0, y: 0 };
			for (const s of layout.params) {
				if (!visible(s, P) || s.options) continue;
				const max = s.maxOf ? s.maxOf(P, FLAT) : s.max, lo = onStep(s, s.min + (max - s.min) * 0.72);
				if (max <= s.min) continue;
				// (a fractal's top detail is free to be finer than its stones can show at the preset's size: it is judged where they can)
				if (s.k === 'order') { const big = { ...P, extent: 0.8, size: 'ss3' }; if (wide({ ...big, order: lo }) === wide({ ...big, order: max })) dead.push(`${it.key}.${s.k}`); continue; }
				if (quick({ ...P, [s.k]: lo }) === quick({ ...P, [s.k]: max }) && wide({ ...P, [s.k]: lo }) === wide({ ...P, [s.k]: max })) dead.push(`${it.key}.${s.k}`);
			}
		}
		expect(dead).toEqual([]);
	});
	it('the crystal\'s and the placing\'s controls work on every kind of arrangement', { timeout: 280000 }, () => {
		const dead = [];
		for (const it of states) {
			const layout = LAYOUTS[it.layout], P = { ...presetParams(it), x: 0, y: 0 }, base = quick(P);
			const tries = { size: ['ss5', 'ss30'], density: [0.3], margin: [0.04] };
			if (!(typeof layout.points === 'function' ? layout.points(P) : layout.points)) tries.gap = [1.8];
			if (!layout.flat) Object.assign(tries, { x: [0.0317], y: [0.0283], rotate: [31], scale: [1.6], px: [0.0171], py: [0.0171], pturn: [31], pscale: [1.6], sx: [1.5], sy: [1.5], twist: [2], bulge: [1], waveA: [0.01], warp: [0.02], jitter: [0.003] });
			for (const [k, vals] of Object.entries(tries)) if (!vals.some((v) => quick({ ...P, [k]: v }) !== base)) dead.push(`${it.key}.${k}`);
		}
		expect(dead).toEqual([]);
	});
	it('the density slider works over all its range', { timeout: 120000 }, () => {
		const dead = [];
		for (const it of states) {
			const P = { ...presetParams(it), x: 0, y: 0 }, n = (density) => stonesOf({ ...P, density }, {}, SMALL).length, a = n(1), b = n(0.75), c = n(0.5), d = n(0.25);
			if (!(a > b && b > c && c > d)) dead.push(`${it.key} ${a} ${b} ${c} ${d}`);
		}
		expect(dead).toEqual([]);
	});
	it('a preset\'s Reshuffle is only offered where the seed does something', { timeout: 120000 }, () => {
		const wrong = [];
		for (const it of GALLERY_ITEMS.values()) {
			const layout = LAYOUTS[it.layout], P = { ...presetParams(it), x: 0, y: 0 }, a = quick(P, { seed: 3 }), b = quick(P, { seed: 1234 }), random = typeof layout.random === 'function' ? layout.random(P) : !!layout.random;
			if (random !== (a !== b)) wrong.push(`${it.key} offered ${random}, differs ${a !== b}`);
		}
		expect(wrong).toEqual([]);
	});
	it('every control of every modifier does something', { timeout: 120000 }, () => {
		const dead = [], base = { layout: 'hex', spacing: 0.006, x: 0, y: 0, size: 'ss8' };
		for (const on of ['density', 'size', 'colour']) for (const shape of Object.keys(MOD_SHAPES)) {
			if (shape === 'bysize' && on === 'size') continue;
			const m0 = newModifier(on, shape, { ...modGeometry(shape, FLAT), ...(on === 'size' ? { from: 1.8, to: 0.6 } : {}), ...(on === 'density' ? { from: 0.9, to: 0.1 } : {}), ...(on === 'colour' ? { stops: ['Ruby', 'Sapphire'] } : {}) }, 'm');
			const layoutP = shape === 'bysize' ? { layout: 'hex', spacing: 0.01, accent: 2, x: 0, y: 0 } : base;
			const run = (patch) => look(stonesOf({ ...layoutP, mods: [{ ...m0, ...patch }] }));
			const was = run({});
			if (was === look(stonesOf({ ...layoutP, mods: [] }))) dead.push(`${on}.${shape} itself`);
			// what the panel offers for this modifier, as ui/PatternPanel.jsx ModCard does
			const tries = {}, cls = MOD_SHAPES[shape].cls, g = m0;
			if (shape !== 'family' && shape !== 'random' && shape !== 'stripes' && shape !== 'checks') tries.power = { power: 3 };
			if (shape !== 'family' && shape !== 'random') tries.reverse = { reverse: true };
			if (on !== 'colour') Object.assign(tries, { from: { from: 0.4 }, to: { to: 0.8 } });
			else if (!['family', 'random', 'stripes', 'checks'].includes(shape)) tries.mix = { mix: 0 };
			if (cls !== 'follow' && !(shape === 'sweep' && !g.clip)) tries.w = { w: (g.w ?? 0.1) * 1.37, h: (g.h ?? 0.1) * 1.37 };
			if (cls === 'round' || (cls === 'box' && g.clip)) tries.h = { h: (g.h ?? 0.1) * 0.6 };
			// along it and across it, as far as each means something
			if (cls !== 'follow' && cls !== 'edge') {
				const a = ((g.a ?? 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
				tries.along = { x: 0.0237 * c, y: 0.0237 * s };
				if (!(shape === 'waves' || shape === 'stripes' || (cls === 'box' && !g.clip))) tries.across = { x: -0.0173 * s, y: 0.0173 * c };
			}
			if (cls !== 'follow' && cls !== 'edge' && cls !== 'ring' && !MOD_SHAPES[shape].turnless) tries.a = { a: (g.a ?? 0) + 33 };
			if (shape === 'clouds') tries.seed = { seed: 77 };
			for (const [k, patch] of Object.entries(tries)) if (run(patch) === was) dead.push(`${on}.${shape}.${k}`);
			// a box's bounds matter once they are inside the piece
			if (MOD_SHAPES[shape].bounds) {
				const small = { w: (g.w ?? 0.1) * 0.6, h: (g.h ?? 0.1) * 0.6 };
				if (run({ ...small, clip: true }) === run({ ...small, clip: false })) dead.push(`${on}.${shape}.clip`);
			}
		}
		expect(dead).toEqual([]);
	});
});

// ---------------------------------------------------------------------------------------------
describe('modifiers', () => {
	const at = (mods, u, v, k = 1, t = 0, cat = 0, rank = 0.3) => compileMods(mods, null, () => 0.02, 'Crystal');
	const F = { x: 0, y: 0, c: 1, s: 0, S: 1, F: 1 };
	const lin = (more) => ({ id: 'a', on: 'density', shape: 'linear', x: 0, y: 0, a: 0, w: 0.2, h: 0.2, from: 1, to: 0, ...more });
	it('a linear ramp runs from its start to its end, and is cut off outside its box', () => {
		const d = compileMods([lin({ clip: true })], F, null, 'Crystal').density;
		expect(d(-0.1, 0, 1, 0, 0, 0.3)).toBeCloseTo(1, 5);
		expect(d(0, 0, 1, 0, 0, 0.3)).toBeCloseTo(0.5, 5);
		expect(d(0.1, 0, 1, 0, 0, 0.3)).toBeCloseTo(0, 5);
		expect(d(0, 0.11, 1, 0, 0, 0.3)).toBe(0);    // past its side
		expect(d(-0.12, 0, 1, 0, 0, 0.3)).toBe(0);   // before its start
		const open = compileMods([lin({ clip: false })], F, null, 'Crystal').density;
		expect(open(-0.12, 0.3, 1, 0, 0, 0.3)).toBe(1);  // not cut off: it holds its start
	});
	it('a soft edge fades the bounds', () => {
		const d = compileMods([lin({ clip: true, to: 1, feather: 0.02 })], F, null, 'Crystal').density;
		expect(d(0, 0.095, 1, 0, 0, 0.3)).toBeCloseTo(0.25, 5);
		expect(d(0, 0.05, 1, 0, 0, 0.3)).toBe(1);
	});
	it('stack on the same thing: multiply, or add', () => {
		const a = lin({ id: 'a', to: 0.5 }), b = { id: 'b', on: 'density', shape: 'radial', x: 0, y: 0, w: 0.1, h: 0.1, from: 0.5, to: 0.5 };
		const mul = compileMods([a, b], F, null, 'Crystal').density, add = compileMods([a, { ...b, blend: 'add' }], F, null, 'Crystal').density;
		expect(mul(-0.1, 0, 1, 0, 0, 0.3)).toBeCloseTo(0.5, 5);
		expect(add(-0.1, 0, 1, 0, 0, 0.3)).toBeCloseTo(1, 5);
		// a linear gradient on size plus a radial gradient on size
		const s1 = { id: 'x', on: 'size', shape: 'linear', x: 0, y: 0, a: 0, w: 0.2, h: 0.2, from: 1, to: 2 }, s2 = { id: 'y', on: 'size', shape: 'radial', x: 0, y: 0, w: 0.1, h: 0.1, from: 1.5, to: 1 };
		const g = compileMods([s1, s2], F, null, 'Crystal').size;
		expect(g(0, 0, 1, 0, 0, 0.3)).toBeCloseTo(1.5 * 1.5, 5);
		expect(g(0.1, 0, 1, 0, 0, 0.3)).toBeCloseTo(2 * 1, 5);
	});
	it('size modifiers: only sizes that exist; the base size still counts', () => {
		const P = { layout: 'hex', spacing: 0.012, x: 0, y: 0, mods: [{ id: 's', on: 'size', shape: 'radial', w: 0.2, h: 0.2, from: 1.8, to: 0.5 }] };
		const a = stonesOf({ ...P, size: 'ss12' }), b = stonesOf({ ...P, size: 'ss20' }), mean = (l) => l.reduce((m, s) => m + s.size, 0) / l.length;
		expect(new Set(a.map((s) => s.size)).size).toBeGreaterThan(3);
		for (const s of a) expect(SIZES).toContain(s.size);
		expect(mean(b)).toBeGreaterThan(mean(a) * 1.25);
	});
	it('a size gradient changes the spacing of a line with it, so it stays packed', () => {
		const P = { layout: 'stripes', spacing: 0.04, gap: 1.1, x: 0, y: 0, size: 'ss12', mods: [{ id: 's', on: 'size', shape: 'linear', a: 90, w: 0.5, h: 0.5, from: 0.5, to: 2.2 }] };
		const list = stonesOf(P).filter((s) => Math.abs(s.sp.u) < 0.005).sort((a, b) => a.sp.v - b.sp.v);
		expect(list.length).toBeGreaterThan(20);
		for (let i = 1; i < list.length; i++) {
			const gap = list[i].sp.v - list[i - 1].sp.v, want = (list[i].size + list[i - 1].size) / 2;
			expect(gap).toBeGreaterThan(want * 0.92);
			expect(gap).toBeLessThan(want * 1.6);
		}
	});
	it('a scatter under a size modifier packs to the local size, biggest first', () => {
		const P = { layout: 'scatter', x: 0, y: 0, size: 'ss12', gap: 1.1, mods: [{ id: 's', on: 'size', shape: 'linear', a: 90, w: 0.5, h: 0.5, from: 0.5, to: 2 }] };
		const list = stonesOf(P), top = list.filter((s) => s.sp.v > 0.1), low = list.filter((s) => s.sp.v < -0.1);
		expect(low.length).toBeGreaterThan(top.length * 3);
		for (const a of list.slice(0, 500)) for (const b of list) if (a !== b) expect(Math.hypot(a.sp.u - b.sp.u, a.sp.v - b.sp.v)).toBeGreaterThanOrEqual(((a.size + b.size) / 2) * 1.1 - 1e-6);
		expect(sizeRange(P.mods)).toEqual([0.5, 2]);
	});
	it('a density on a scatter thins it as asked, whatever its sizes', () => {
		for (const more of [{}, { variety: 0.8 }]) {
			const P = { layout: 'scatter', x: 0, y: 0, size: 'ss12', ...more }, all = stonesOf(P).length, half = stonesOf({ ...P, density: 0.5 }).length;
			expect(half / all, JSON.stringify(more)).toBeGreaterThan(0.35);
			expect(half / all, JSON.stringify(more)).toBeLessThan(0.7);
		}
	});
	it('colour: a ramp along its field, keeping the crystal\'s own where a stop is empty, later ones over earlier', () => {
		const P = { layout: 'hex', spacing: 0.01, x: 0, y: 0 }, top = (l) => l.filter((s) => s.sp.v > 0.2), low = (l) => l.filter((s) => s.sp.v < -0.2), share = (l, c) => l.filter((s) => s.stone === c).length / l.length;
		const ramp = [{ id: 'c', on: 'colour', shape: 'linear', a: -90, w: 0.6, h: 0.4, stops: ['Sapphire', 'Ruby'] }], a = stonesOf({ ...P, mods: ramp });
		expect(share(top(a), 'Sapphire')).toBeGreaterThan(0.8);
		expect(share(low(a), 'Ruby')).toBeGreaterThan(0.8);
		const own = stonesOf({ ...P, mods: [{ ...ramp[0], stops: [null, 'Ruby'] }] });
		expect(share(top(own), 'Crystal')).toBeGreaterThan(0.8);
		const over = stonesOf({ ...P, mods: [{ ...ramp[0], stops: ['Sapphire', 'Sapphire'] }, { id: 'd', on: 'colour', shape: 'radial', w: 0.05, h: 0.05, stops: ['Ruby', 'Ruby'], clip: true }] });
		expect(over.filter((s) => Math.hypot(s.sp.u, s.sp.v) < 0.04).every((s) => s.stone === 'Ruby')).toBe(true);
		expect(over.filter((s) => Math.hypot(s.sp.u, s.sp.v) > 0.07).every((s) => s.stone === 'Sapphire')).toBe(true);
		// by family: each ring its own colour
		const fam = stonesOf({ layout: 'rings', x: 0, y: 0, spacing: 0.03, mods: [{ id: 'f', on: 'colour', shape: 'family', stops: ['Ruby', 'Sapphire'] }] });
		expect(new Set(fam.map((s) => s.stone)).size).toBe(2);
	});
	it('off means off', () => {
		const P = { layout: 'hex', spacing: 0.01, x: 0, y: 0 };
		expect(look(stonesOf({ ...P, mods: [{ ...lin({ clip: true }), off: true }] }))).toBe(look(stonesOf({ ...P, mods: [] })));
	});
	it('a record from before modifiers keeps its gradient, its size and its colours', () => {
		const old = { layout: 'hex', spacing: 0.01, x: 0, y: 0, gradient: 'radial', ga: [0.02, 0.03], gb: [0.02, -0.07], densityFrom: 1, densityTo: 0, sizeTo: 'ss6', sizeBy: 'along', size: 'ss12' };
		const P = patternParams({ params: old, colourRamp: ['Ruby', 'Sapphire'] }, FLAT);
		expect(P.mods.map((m) => m.on)).toEqual(['density', 'size', 'colour']);
		const d = P.mods[0];
		expect([d.shape, d.x, d.y]).toEqual(['radial', 0.02, 0.03]);
		expect(d.w).toBeCloseTo(0.1, 6);
		expect(P.mods[1].shape).toBe('along');
		expect(P.mods[1].to).toBeCloseTo(2 / 3.1, 3);
		// a saved test of a pattern with nothing but left-overs of other arrangements still runs
		const junk = { layout: 'circles', preset: 'flower-of-life', grow: 0.2, arms: 1, power: 0.5, group: 'pgg', gradient: 'none', densityFrom: 1, densityTo: 0.16, gpower: 5, sizeTo: 'ss3', sizeBy: 'along', x: 0, y: 0.04, scale: 0.61, spacing: 0.037, size: 'ss4', gap: 1 };
		expect(stonesOf(junk).length).toBeGreaterThan(50);
	});
	it('a preset leaves nothing of the last one, and keeps what is the crystal\'s and where it lies', () => {
		const P0 = { ...presetPatch({ x: 0.02, y: 0.03, size: 'ss8', gap: 1.4 }, 'phyllotaxis-prime'), grow: 2, spacing: 0.02 };
		expect(P0.numbers).toBe('prime');
		const P1 = { ...P0, ...presetPatch(P0, 'phyllotaxis') };
		expect(P1.numbers).toBe('all');
		expect(P1.grow).toBe(0);
		expect(P1.spacing).toBe(0.006);
		expect([P1.x, P1.y, P1.size, P1.gap]).toEqual([0.02, 0.03, 'ss8', 1.4]);
		// a slider of another arrangement is gone altogether
		const P2 = { ...P1, ...presetPatch(P1, 'hex') };
		expect(P2.divergence).toBeUndefined();
		expect(P2.spacing).toBe(0.01);
		// a modifier of the preset goes with it; one added by hand stays
		const P3 = { ...presetPatch({}, 'fade-linear') };
		expect(P3.mods.map((m) => [m.shape, m.preset])).toEqual([['linear', true]]);
		const own = newModifier('colour', 'radial', {}, 'mine'), P4 = presetPatch({ ...P3, mods: [...P3.mods, own] }, 'grid');
		expect(P4.mods.map((m) => m.id)).toEqual(['mine']);
		// the size a preset chose goes with it too
		const P5 = { size: 'ss8', ...presetPatch({ size: 'ss8' }, 'dust-carpet') };
		expect(P5.size).toBe('ss30');
		expect(presetPatch(P5, 'grid', 'ss8').size).toBe('ss8');
	});
});

// ---------------------------------------------------------------------------------------------
describe('handles', () => {
	const piece = flatPiece(0.2, 0.4);
	const ids = (H) => H.knobs.map((k) => k.id);
	const grab = (k, u, v, more = {}) => k.drag({ u0: k.u, v0: k.v, u, v, shift: false, alt: false, ...more });
	const of = (params, focus = 'frame') => patternHandles({ params }, piece, { focus, pxPerM: 1000 });

	it('a pattern has a dial; moving, turning and scaling it take the modifiers along', () => {
		const H = of({ layout: 'hex', x: 0.01, y: 0.02, rotate: 90 });
		expect(ids(H).slice(0, 3)).toEqual(['frame-move', 'frame-turn', 'frame-scale']);
		const move = H.knobs[0], turn = H.knobs[1], scale = H.knobs[2];
		expect([move.u, move.v]).toEqual([0.01, 0.02]);
		// turned a quarter: its top points the cloth's way of its left
		expect(turn.u).toBeLessThan(0.01);
		expect(turn.v).toBeCloseTo(0.02, 6);
		const p = grab(move, 0.05, -0.03);
		expect(p.x).toBeCloseTo(0.05, 4);
		expect(p.y).toBeCloseTo(-0.03, 4);
		const q = turn.drag({ u0: 0.01, v0: 0.1, u: 0.09, v: 0.02, shift: false, alt: false });
		expect(q.rotate).toBeCloseTo(0, 1);
		const s = scale.drag({ u0: 0.06, v0: 0.02, u: 0.11, v: 0.02, shift: false, alt: false });
		expect(s.scale).toBeCloseTo(2, 2);
	});
	it('a move is drawn to the piece\'s middle line, unless Alt', () => {
		const H = of({ layout: 'hex', x: 0.05, y: 0 }), m = H.knobs[0];
		expect(m.drag({ u0: 0.05, v0: 0, u: 0.002, v: 0, shift: false, alt: false }).x).toBe(0);
		expect(m.drag({ u0: 0.05, v0: 0, u: 0.002, v: 0, shift: false, alt: true }).x).toBeCloseTo(0.002, 4);
	});
	it('a turn snaps to 15 degrees with Shift', () => {
		const t = of({ layout: 'hex', x: 0, y: 0 }).knobs[1];
		expect(Math.abs(t.drag({ u0: t.u, v0: t.v, u: 0.05, v: 0.051, shift: true, alt: false }).rotate % 15)).toBe(0);
	});
	it('an arrangement has handles of its own, and they do what they say', () => {
		const H = of({ layout: 'hex', spacing: 0.01, x: 0, y: 0 }), k = H.knobs.find((q) => q.id === 'grip-0');
		// far enough out to grab, as a whole number of spacings
		expect(Math.hypot(k.u, k.v)).toBeGreaterThanOrEqual(0.05);
		expect(k.u / 0.01 % 1).toBeCloseTo(0, 6);
		const n = Math.round(k.u / 0.01), p = grab(k, k.u + 0.01 * n, k.v);
		expect(p.spacing).toBeCloseTo(0.02, 3);
		// clamped to what its slider allows
		expect(grab(k, k.u + 5, k.v).spacing).toBe(0.06);
		// a rosette's size is a real circle
		const R = of({ layout: 'rose', radius: 0.08, x: 0, y: 0 }), g = R.knobs.find((q) => q.id === 'grip-0');
		expect(g.u).toBeCloseTo(0.08, 6);
		expect(grab(g, 0.05, 0).radius).toBeCloseTo(0.05, 3);
		// the motif in its cell
		const W = of({ layout: 'wallpaper', spacing: 0.1, motifX: 0.1, motifY: 0.2, x: 0, y: 0 }), w = W.knobs.find((q) => q.title.startsWith('Motif'));
		expect([w.u, w.v]).toEqual([expect.closeTo(0.01, 6), expect.closeTo(0.02, 6)]);
		const mp = grab(w, 0.03, 0.02);
		expect(mp.motifX).toBeCloseTo(0.3, 3);
		// every layout's grips run, and their knobs are finite
		for (const name of LAYOUT_KINDS) for (const q of of({ layout: name, x: 0, y: 0 }).knobs) {
			expect(Number.isFinite(q.u) && Number.isFinite(q.v), `${name} ${q.id}`).toBe(true);
			const patch = q.drag?.({ u0: q.u, v0: q.v, u: q.u + 0.01, v: q.v + 0.005, shift: false, alt: false });
			if (patch) for (const [key, v] of Object.entries(patch)) expect(key === 'mods' || (typeof v === 'number' && Number.isFinite(v)), `${name} ${q.id} ${key}`).toBe(true);
		}
	});
	it('a pattern tied to the piece (rings along the edge) has no dial', () => {
		expect(of({ layout: 'edgelines' }).knobs).toHaveLength(0);
	});
	it('each class of modifier has its own handles', () => {
		const withMod = (shape, more = {}) => of({ layout: 'scatter', x: 0, y: 0, mods: [{ id: 'm', on: 'density', shape, ...more }] }, 'm');
		const linear = withMod('linear', { clip: true });
		expect(ids(linear).sort()).toEqual(['mod-end', 'mod-move', 'mod-side-a', 'mod-side-b', 'mod-start', 'mod-turn', 'pick-frame'].sort());
		// its bounds are drawn: a closed box, an arrow for its direction
		expect(linear.lines.length).toBeGreaterThanOrEqual(3);
		// a regular shape, wherever the piece's edge is, on a sheet at its middle that turns about its length
		const wide = withMod('linear', { clip: true, x: 0, y: 0, a: 0, w: 2, h: 0.1 }), box = wide.lines[0].pts, xs = box.map((q) => q[0]);
		expect([Math.min(...xs), Math.max(...xs)]).toEqual([expect.closeTo(-1, 6), expect.closeTo(1, 6)]);
		expect(box[0]).toEqual(box[box.length - 1]);
		expect(wide.lines[0].at).toEqual([expect.closeTo(0, 6), expect.closeTo(0, 6)]);
		expect(wide.lines[0].pivot).toBeCloseTo(0, 6);
		expect(withMod('radial').lines[0].pivot).toBeUndefined();
		const rim = withMod('radial', { x: 0, y: 0, w: 5 }).lines[0].pts;
		for (const q of rim) expect(Math.hypot(q[0], q[1])).toBeCloseTo(5, 6);
		expect(withMod('edge').lines.every((l) => l.cloth)).toBe(true);
		const open = withMod('linear', { clip: false });
		expect(ids(open)).not.toContain('mod-side-a');
		expect(ids(withMod('radial')).sort()).toEqual(['mod-move', 'mod-radius', 'pick-frame']);
		expect(ids(withMod('oval')).sort()).toEqual(['mod-h', 'mod-move', 'mod-turn', 'mod-w', 'pick-frame']);
		expect(ids(withMod('diamond')).sort()).toEqual(['mod-h', 'mod-move', 'mod-turn', 'mod-w', 'pick-frame']);
		expect(ids(withMod('waves')).sort()).toEqual(['mod-move', 'mod-period', 'pick-frame']);
		expect(ids(withMod('edge'))).toContain('mod-depth');
		// something that follows the pattern has no place on the piece: the whole pattern's handles stay
		expect(ids(withMod('random'))).toEqual(['frame-move', 'frame-turn', 'frame-scale']);
	});
	it('dragging an end of a box moves that end alone; a side the same; a turn about its middle', () => {
		const m = { id: 'm', on: 'density', shape: 'linear', x: 0, y: 0, a: 0, w: 0.2, h: 0.1, clip: true }, H = of({ layout: 'scatter', x: 0, y: 0, mods: [m] }, 'm');
		const get = (id) => H.knobs.find((q) => q.id === id), after = (patch) => patch.mods[0];
		const end = get('mod-end');
		expect([end.u, end.v]).toEqual([expect.closeTo(0.1, 6), expect.closeTo(0, 6)]);
		const e = after(grab(end, 0.14, 0.03));
		expect(e.w).toBeCloseTo(0.24, 4);
		expect(e.x - e.w / 2).toBeCloseTo(-0.1, 4); // the start stayed
		const s = after(grab(get('mod-start'), -0.05, 0));
		expect(s.w).toBeCloseTo(0.15, 4);
		expect(s.x + s.w / 2).toBeCloseTo(0.1, 4);  // the end stayed
		const side = after(grab(get('mod-side-a'), 0, 0.07));
		expect(side.h).toBeCloseTo(0.12, 4);
		expect(side.y - side.h / 2).toBeCloseTo(-0.05, 4);
		const turned = after(get('mod-turn').drag({ u0: 0.1, v0: 0, u: 0, v: 0.1, shift: false, alt: false }));
		expect(turned.a).toBeCloseTo(90, 1);
		const moved = after(grab(get('mod-move'), 0.02, 0.01));
		expect([moved.x, moved.y]).toEqual([expect.closeTo(0.02, 4), expect.closeTo(0.01, 4)]);
	});
	it('a modifier\'s handles work the same in a frame that is moved, turned, flipped and scaled', () => {
		const m = { id: 'm', on: 'density', shape: 'linear', x: 0.01, y: 0, a: 0, w: 0.1, h: 0.1, clip: true }, P = { layout: 'scatter', x: 0.02, y: 0.01, rotate: 30, scale: 2, flip: true, mods: [m] }, H = of(P, 'm');
		const end = H.knobs.find((q) => q.id === 'mod-end'), f = frameOf(P), [u, v] = frameToCloth(f, 0.06, 0);
		expect(end.u).toBeCloseTo(u, 6);
		expect(end.v).toBeCloseTo(v, 6);
		// out along its own axis by a centimetre of frame: the box is a centimetre longer
		const [u2, v2] = frameToCloth(f, 0.07, 0), e = end.drag({ u0: end.u, v0: end.v, u: u2, v: v2, shift: false, alt: false }).mods[0];
		expect(e.w).toBeCloseTo(0.11, 4);
		// the mask follows what the record says: a stone at that end is in, just past it is out
		const d = compileMods([{ ...e }], f, null, 'Crystal').density;
		const [ua, va] = frameToCloth(f, e.x + e.w / 2 - 0.002, 0), [ub, vb] = frameToCloth(f, e.x + e.w / 2 + 0.002, 0);
		expect(d(ua, va, 1, 0, 0, 0.3)).toBeGreaterThanOrEqual(0);
		expect(d(ub, vb, 1, 0, 0, 0.3)).toBe(0);
	});
	it('the other modifiers show faintly, with a dot to pick them by; the plane has its own', () => {
		const P = { layout: 'scatter', x: 0, y: 0, mods: [{ id: 'a', on: 'density', shape: 'radial', w: 0.05, h: 0.05 }, { id: 'b', on: 'size', shape: 'linear', w: 0.1, h: 0.1 }] };
		const H = of(P, 'a');
		expect(H.knobs.find((k) => k.id === 'pick-b').pick).toBe('b');
		expect(H.lines.some((l) => l.faint && l.tone === 'size')).toBe(true);
		const plain = of(P, 'frame');
		expect(plain.knobs.filter((k) => k.pick).map((k) => k.pick)).toEqual(['a', 'b']);
		const plane = of({ layout: 'hex', x: 0.01, y: 0, px: 0.02 }, 'plane');
		expect(ids(plane)).toEqual(['plane-move', 'plane-turn', 'plane-scale', 'plane-stretch']);
		expect(plane.knobs[0].u).toBeCloseTo(0.03, 6);
		expect(plane.knobs[0].drag({ u0: 0.03, v0: 0, u: 0.04, v: 0.01, shift: false, alt: false })).toEqual({ px: expect.closeTo(0.03, 4), py: expect.closeTo(0.01, 4) });
	});
	it('scaling stops where its stones touch', () => {
		const P = { layout: 'hex', spacing: 0.01, size: 'ss12', x: 0, y: 0 }, H = of(P), scale = H.knobs[2];
		expect(scale.drag({ u0: 0.06, v0: 0, u: 0.0001, v: 0, shift: false, alt: false }).scale).toBeCloseTo(minScale(P), 2);
		expect(patternMap({ ...P, scale: 0.001 }).sc).toBeCloseTo(minScale(P), 5);
	});
});

describe('on a garment', () => {
	let B, doc, g, piece, ctx;
	const clothed = new Map();
	beforeAll(async () => {
		B = await loadBody();
		const s = new DocumentStore(newDocument('t'));
		s.ctx = { man: B.man, surf: B.surf, landmarks: {}, garment: () => null, get evaluated() { return undefined; }, get doc() { return s.doc; } };
		s.exec({ op: 'start.apply', key: 'plain-tank' });
		doc = s.doc;
		g = buildGarment(doc, B.surf, { layer: 'L0' });
		const of = (id) => {
			if (clothed.has(id)) return clothed.get(id);
			const seeds = g.seeds.filter((x) => x.panel === id && x.cell >= 0), c = seeds[0].cell, pc = cellPiece(g.arr, c), f = flatten(pc.P, pc.I);
			const r = { piece: new ClothPiece(g.arr, B.surf, c, pc, f.uv), pending: false, paired: seeds.length > 1 && seeds[1].cell !== c };
			clothed.set(id, r);
			return r;
		};
		const front = doc.panels.find((p) => p.name === 'Front') ?? doc.panels[0];
		doc.front = front.id;
		piece = of(front.id).piece;
		ctx = { surf: B.surf, doc, cloth: of, pending: new Set(), patternCache: new Map(), geoRev: 1 };
	}, 120000);

	const gen = (params, extra = {}) => ({ id: 'g1', kind: 'pattern', on: { panel: doc.front }, stone: 'Crystal', shape: 'round', seed: 5, params: { size: 'ss12', ...params }, ...extra });

	it('a flat point and its place on the body are the same point both ways', () => {
		let hits = 0;
		for (let i = 0; i < 400; i++) {
			const u = piece.x0 + (piece.x1 - piece.x0) * ((i * 0.61803) % 1), v = piece.y0 + (piece.y1 - piece.y0) * ((i * 0.75487) % 1), q = piece.find(u, v);
			if (q < 0) continue;
			hits++;
			const sp = piece.spOf(q);
			expect(sp.f).toBe(piece.face[q]);
			expect(Math.abs(sp.b0 + sp.b1 + sp.b2 - 1)).toBeLessThan(1e-4);
			const p = piece.posOf(q, {}), s = B.surf.pos(sp);
			expect(Math.hypot(p.x - s.x, p.y - s.y, p.z - s.z)).toBeLessThan(1e-3);
			const back = piece.uvOf(sp);
			expect(back).not.toBeNull();
			expect(Math.hypot(back[0] - u, back[1] - v)).toBeLessThan(5e-4);
		}
		expect(hits).toBeGreaterThan(100);
	});

	it('the flat distance to the edge is right, inside the piece', () => {
		let checked = 0;
		const S = (piece.edgeAt(0, 0), piece.edgeSegs);
		for (let i = 0; i < 150; i++) {
			const u = piece.x0 + (piece.x1 - piece.x0) * ((i * 0.37) % 1), v = piece.y0 + (piece.y1 - piece.y0) * ((i * 0.71) % 1);
			if (piece.find(u, v) < 0) continue;
			let best = Infinity;
			for (let o = 0; o < S.length; o += 4) {
				const bx = S[o + 2] - S[o], by = S[o + 3] - S[o + 1], l2 = bx * bx + by * by || 1e-12;
				let t = ((u - S[o]) * bx + (v - S[o + 1]) * by) / l2;
				t = t < 0 ? 0 : t > 1 ? 1 : t;
				best = Math.min(best, Math.hypot(u - S[o] - bx * t, v - S[o + 1] - by * t));
			}
			expect(Math.abs(piece.edgeAt(u, v) - best)).toBeLessThan(0.0025);
			checked++;
		}
		expect(checked).toBeGreaterThan(30);
	});

	it('the fast mirror agrees with the exact one', () => {
		const pts = runPattern(gen({ layout: 'hex', spacing: 0.02 }), ctx);
		expect(pts.length).toBeGreaterThan(100);
		let worst = 0;
		for (const s of pts) {
			const a = B.surf.pos(mirrorFast(B.surf, s.sp)), b = B.surf.pos(mirrorSP(s.sp, B.surf));
			worst = Math.max(worst, a.distanceTo(b));
		}
		expect(worst).toBeLessThan(0.0006);
	});

	it('stones stay inside the piece and clear of its edge, each at a real place', () => {
		const pts = runPattern(gen({ layout: 'hex', spacing: 0.01 }), ctx);
		expect(pts.length).toBeGreaterThan(200);
		for (const s of pts) {
			const uv = piece.uvOf(s.sp);
			expect(uv).not.toBeNull();
			expect(piece.edgeAt(uv[0], uv[1])).toBeGreaterThan(s.size / 2 - 0.0008);
			const p = B.surf.pos(s.sp);
			expect(Math.hypot(p.x - s.x, p.y - s.y, p.z - s.z)).toBeLessThan(1e-3);
		}
	});

	it('a lattice keeps its spacing on the body (the cloth is near-isometric)', () => {
		const sp = 0.012, pts = runPattern(gen({ layout: 'hex', spacing: sp }), ctx), near = [];
		for (let i = 0; i < pts.length; i += 7) {
			let best = Infinity;
			for (let j = 0; j < pts.length; j++) if (i !== j) best = Math.min(best, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y, pts[i].z - pts[j].z));
			near.push(best);
		}
		near.sort((a, b) => a - b);
		expect(Math.abs(near[near.length >> 1] - sp) / sp).toBeLessThan(0.12);
	});

	it('moving a pattern moves its stones, on the cloth', () => {
		const a = runPattern(gen({ layout: 'phyllotaxis', extent: 0.08, spacing: 0.006, x: 0, y: 0 }), ctx);
		const b = runPattern(gen({ layout: 'phyllotaxis', extent: 0.08, spacing: 0.006, x: 0.02, y: -0.03 }), ctx);
		const ua = piece.uvOf(a[0].sp), ub = piece.uvOf(b[0].sp);
		expect(Math.hypot(ub[0] - ua[0] - 0.02, ub[1] - ua[1] + 0.03)).toBeLessThan(1e-3);
	});

	it('touching stones on a line are all kept, where the body lies tighter than the flat cloth', () => {
		// (the flat map shrinks by up to 15% in places: judged on the body, every other stone would go)
		const P = gen({ layout: 'stripes', spacing: 0.012, gap: 1.0, size: 'ss8' }, { id: 'lines' });
		const own = runPattern(P, ctx), d = { ...doc, stones: [P], placed: [] }, kept = runStones(d, { ...ctx, doc: d }).stones;
		expect(own.length).toBeGreaterThan(500);
		expect(kept.length).toBe(own.length);
	});

	it('a density thins, it does not reshuffle: what stays stays exactly where it was', () => {
		// a lattice: no stone can be pushed out by a neighbour, so the sets nest exactly
		const mod = (to) => [{ id: 'm', on: 'density', shape: 'linear', from: 1, to }];
		const a = runPattern(gen({ layout: 'hex', spacing: 0.008, mods: mod(0.6) }), ctx), b = runPattern(gen({ layout: 'hex', spacing: 0.008, mods: mod(0.2) }), ctx);
		expect(b.length).toBeLessThan(a.length);
		expect(b.length).toBeGreaterThan(a.length * 0.3);
		const key = (s) => s.sp.f + ':' + s.sp.b0.toFixed(5);
		const had = new Set(a.map(key));
		for (const s of b) expect(had.has(key(s))).toBe(true);
	});

	it('a scatter fade: nudging its box keeps nearly every stone', () => {
		const mod = (y) => [{ id: 'm', on: 'density', shape: 'linear', x: 0, y, a: -90, w: 0.5, h: 0.6, from: 1, to: 0 }];
		const a = runPattern(gen({ layout: 'scatter', mods: mod(0) }), ctx), b = runPattern(gen({ layout: 'scatter', mods: mod(0.004) }), ctx);
		const key = (s) => s.sp.f + ':' + s.sp.b0.toFixed(5), had = new Set(a.map(key));
		const same = b.filter((s) => had.has(key(s))).length;
		expect(a.length).toBeGreaterThan(300);
		expect(same / b.length).toBeGreaterThan(0.85);
	});

	it('a group re-runs alone: others keep their very stones', () => {
		const d = { ...doc, stones: [gen({ layout: 'hex', spacing: 0.02 }, { id: 'a' }), gen({ layout: 'grid', spacing: 0.02 }, { id: 'b' })], placed: [] }, c2 = { ...ctx, doc: d }, cache = { gens: new Map() };
		const r1 = runStones(d, c2, cache), firstB = r1.stones.find((s) => s.gen === 'b');
		expect(firstB).toBeDefined();
		d.stones[0].params = { ...d.stones[0].params, x: 0.01 };
		const r2 = runStones(d, c2, cache);
		expect(r2.stones.includes(firstB)).toBe(true);
		expect(r2.stones.filter((s) => s.gen === 'a').length).toBeGreaterThan(0);
		expect(runStones(d, c2, cache)).toBe(r2); // nothing changed: nothing done
	});

	it('stones of any sizes keep apart, however big the biggest', () => {
		const P = { layout: 'grid', spacing: 0.005, size: 'ss5' };
		const d = { ...doc, stones: [gen({ layout: 'grid', spacing: 0.03, size: 'ss48' }, { id: 'big' }), gen(P, { id: 'small' })], placed: [] };
		const st = runStones(d, { ...ctx, doc: d }).stones, big = st.filter((s) => s.gen === 'big');
		expect(big.length).toBeGreaterThan(10);
		expect(st.length).toBeGreaterThan(big.length + 100);
		// the big ones were laid first: a small one kept is clear of them, though its own reach is short
		for (const b of big) for (const s of st) if (s !== b && s.gen !== b.gen) expect(Math.hypot(b.x - s.x, b.y - s.y, b.z - s.z)).toBeGreaterThanOrEqual(((b.size + s.size) / 2) * 0.92 - 1e-6);
	});

	it('the cached run and the plain run agree', () => {
		const d = { ...doc, stones: [gen({ layout: 'hex', spacing: 0.015 }, { id: 'a' })], placed: [] }, c2 = { ...ctx, doc: d };
		expect(runStones(d, c2, { gens: new Map() }).stones.length).toBe(runStones(d, c2).stones.length);
	});

	it('a piece not yet flattened waits, and says so', () => {
		const pending = new Set(), d = { ...doc, stones: [gen({ layout: 'hex' }, { id: 'w' })], placed: [] }, cache = { gens: new Map() };
		const waiting = { ...ctx, doc: d, pending, cloth: () => ({ piece: null, pending: true }) };
		expect(runStones(d, waiting, cache).stones).toHaveLength(0);
		expect(pending.has('w')).toBe(true);
		const ready = { ...ctx, doc: d, pending };
		expect(runStones(d, ready, cache).stones.length).toBeGreaterThan(0);
		expect(pending.has('w')).toBe(false);
	});

	it('symmetric: the two halves are mirror images', () => {
		const d = { ...doc, stones: [gen({ layout: 'phyllotaxis', extent: 0.12, x: 0.03, y: 0, symmetric: true }, { id: 'a' })], placed: [] }, st = runStones(d, { ...ctx, doc: d }).stones;
		expect(st.some((s) => s.x > 0.02) && st.some((s) => s.x < -0.02)).toBe(true);
		const left = st.filter((s) => s.x > 0.005), right = st.filter((s) => s.x < -0.005);
		expect(Math.abs(left.length - right.length)).toBeLessThan(left.length * 0.08);
	});

	it('on a paired piece: the mirror image too, and one side when the pair is split', () => {
		const paired = (id) => ({ ...ctx.cloth(id), paired: true });
		// off the middle: this piece is really symmetric, so a lattice centred on it would land on itself
		const d = { ...doc, stones: [gen({ layout: 'hex', spacing: 0.02, x: 0.005 }, { id: 'a' })], placed: [] };
		const both = runStones(d, { ...ctx, doc: d, cloth: paired }).stones;
		expect(both.some((s) => s.mirrored)).toBe(true);
		for (const s of both.filter((x) => x.mirrored).slice(0, 40)) {
			const p = B.surf.pos(s.sp);
			expect(Math.hypot(p.x - s.x, p.y - s.y, p.z - s.z)).toBeLessThan(1e-3);
		}
		d.stones[0].side = 'left';
		const left = runStones(d, { ...ctx, doc: d, cloth: paired }).stones;
		expect(left.length).toBeGreaterThan(0);
		expect(left.every((s) => s.x >= 0)).toBe(true);
	});

	it('a pattern stops shrinking where its stones would touch', () => {
		const P = { layout: 'hex', spacing: 0.01, size: 'ss12' };
		expect(minScale(P)).toBeCloseTo(0.31, 2);
		const small = runPattern(gen({ ...P, scale: 0.01 }), ctx), least = runPattern(gen({ ...P, scale: minScale(P) }), ctx);
		expect(small.length).toBe(least.length);
	});

	it('flipping a pattern for its other half leaves it its own mirror image', () => {
		const m = [{ id: 'm', on: 'density', shape: 'linear', x: 0.01, y: 0.02, a: 10 }], p = { layout: 'hex', x: 0.02, rotate: 30, mods: m }, f = flipPatternParams(p, true);
		expect(f).toEqual({ layout: 'hex', x: -0.02, rotate: -30, flip: true, mods: m });
		expect(flipPatternParams(f, true).flip).toBe(false);
		expect(flipPatternParams({ layout: 'grid' }).flip).toBeUndefined(); // a change of layout is not a flip
		// and its mirror half really is the mirror image, modifier and all
		const piece2 = FLAT, a = stonesOf({ layout: 'hex', spacing: 0.01, x: 0.05, y: 0.02, rotate: 25, mods: [{ id: 'm', on: 'density', shape: 'radial', x: 0.02, y: 0, w: 0.04, h: 0.04, from: 1, to: 1, clip: true }] }, {}, piece2);
		const b = stonesOf({ size: 'ss12', gap: 1.15, ...flipPatternParams({ layout: 'hex', spacing: 0.01, x: 0.05, y: 0.02, rotate: 25, mods: [{ id: 'm', on: 'density', shape: 'radial', x: 0.02, y: 0, w: 0.04, h: 0.04, from: 1, to: 1, clip: true }] }, true) }, {}, piece2);
		expect(a.length).toBe(b.length);
		const keys = new Set(b.map((s) => Math.round(s.sp.u * 2000) + ':' + Math.round(s.sp.v * 2000)));
		let hit = 0;
		for (const s of a) if (keys.has(Math.round(-s.sp.u * 2000) + ':' + Math.round(s.sp.v * 2000))) hit++;
		expect(hit / a.length).toBeGreaterThan(0.98);
	});

	it('the commands check what they are given', () => {
		const s = new DocumentStore(newDocument('t'));
		s.ctx = { man: B.man, surf: B.surf, landmarks: {}, get doc() { return s.doc; } };
		expect(() => s.exec({ op: 'stones.add', kind: 'pattern', on: { panel: 'p1' }, params: { layout: 'nope' } })).toThrow(/Unknown pattern layout/);
		expect(() => s.exec({ op: 'stones.add', kind: 'pattern', params: { layout: 'hex' } })).toThrow(/on a piece/);
		expect(() => s.exec({ op: 'stones.add', kind: 'pattern', on: { panel: 'p1' }, params: { layout: 'hex', mods: [{ id: 'm', on: 'nope', shape: 'linear' }] } })).toThrow(/modifier acts on/);
		expect(() => s.exec({ op: 'stones.add', kind: 'pattern', on: { panel: 'p1' }, params: { layout: 'hex', mods: [{ id: 'm', on: 'size', shape: 'nope' }] } })).toThrow(/Unknown modifier shape/);
		expect(() => s.exec({ op: 'stones.add', kind: 'pattern', on: { panel: 'p1' }, params: { layout: 'hex', mods: [{ id: 'm', on: 'colour', shape: 'linear', stops: ['Nope'] }] } })).toThrow(/Unknown stone colour/);
		const id = s.exec({ op: 'stones.add', kind: 'pattern', on: { panel: 'p1' }, params: { layout: 'hex', spacing: 0.01, grow: 1 } });
		s.exec({ op: 'stones.set', id, params: { x: 0.01 }, gesture: 'g' });
		s.exec({ op: 'stones.set', id, params: { x: 0.02 }, gesture: 'g' });
		expect(s.undoStack).toHaveLength(2); // a drag is one undo step
		expect(s.doc.stones[0].params.x).toBe(0.02);
		expect(s.doc.stones[0].params.spacing).toBe(0.01);
		s.exec({ op: 'stones.set', id, params: { grow: undefined } });
		expect('grow' in s.doc.stones[0].params).toBe(false); // undefined removes it
	});

	it('every arrangement runs on a real piece', () => {
		for (const name of LAYOUT_KINDS) {
			const pts = runPattern(gen({ layout: name }, { id: 'x' + name }), ctx);
			expect(pts.length, name).toBeGreaterThan(0);
		}
	});

	it('one drag frame is quick: a dense pattern, end to end', () => {
		const P = { layout: 'hex', spacing: 0.0045, size: 'ss10', mods: [{ id: 'm', on: 'density', shape: 'linear', from: 1, to: 0.2 }] };
		runPattern(gen(P), ctx);
		const t0 = performance.now();
		let count = 0;
		for (let k = 0; k < 10; k++) count = runPattern(gen({ ...P, x: k * 0.001, y: 0 }), ctx).length;
		const ms = (performance.now() - t0) / 10;
		expect(count).toBeGreaterThan(1500);
		expect(ms).toBeLessThan(25);
	});
});
