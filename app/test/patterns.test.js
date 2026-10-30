// Stone patterns (stones/pattern.js, knowledge/engineering/architecture/procedural-stone-patterns.md):
// the arrangements in isolation, the flat-cloth map on a real garment, and what makes live editing
// possible: a group re-runs alone, and thinning never moves the stones that stay.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadBody } from './helpers.js';
import { LAYOUTS, LAYOUT_KINDS, layoutDefaults, GALLERY, GALLERY_ITEMS } from '../src/stones/layouts.js';
import { Candidates } from '../src/stones/candidates.js';
import { blueTile, TILE_R, TILES } from '../src/stones/layouts-lattice.js';
import { wallpaperOps, WALLPAPER_GROUPS } from '../src/stones/layouts-tiling.js';
import { curvePoints, CURVES } from '../src/stones/layouts-curves.js';
import { GRADIENT_KINDS, gradientField, distortion } from '../src/stones/fields.js';
import { ClothPiece, mirrorFast } from '../src/stones/cloth.js';
import { runPattern, patternParams, patternHandles, flipPatternParams, minScale } from '../src/stones/pattern.js';
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
	const E = new Candidates(1024).reset(BOX, pitch, seed, (u, v) => Math.min(0.15 - Math.abs(u), 0.2 - Math.abs(v)));
	LAYOUTS[name].make({ ...layoutDefaults(name), ...extra }, E);
	return E;
};

describe('arrangements', () => {
	for (const name of LAYOUT_KINDS) {
		it(`${name}: stones on the piece, repeatable, in budget`, () => {
			const t0 = performance.now(), E = candidatesOf(name), ms = performance.now() - t0;
			expect(E.n, name).toBeGreaterThan(5);
			expect(E.truncated, name).toBe(false);
			for (let i = 0; i < E.n; i++) {
				expect(Number.isFinite(E.X[i]) && Number.isFinite(E.Y[i]) && Number.isFinite(E.A[i]) && E.K[i] > 0).toBe(true);
				expect(E.R[i] >= 0 && E.R[i] <= 1, `${name} rank ${E.R[i]}`).toBe(true);
			}
			const F = candidatesOf(name);
			expect(F.n).toBe(E.n);
			expect(Array.from(F.X.subarray(0, 50))).toEqual(Array.from(E.X.subarray(0, 50)));
			expect(ms, name).toBeLessThan(400); // the slowest are kept between frames (heavy)
		});
	}

	it('every gallery entry names a real arrangement, with parameters it knows', () => {
		const known = new Set(['gradient', 'densityFrom', 'densityTo', 'size', 'sizeTo', 'sizeB', 'mix']);
		for (const g of GALLERY) for (const it of g.items) {
			expect(LAYOUTS[it.layout], it.key).toBeDefined();
			const own = new Set(LAYOUTS[it.layout].params.map((p) => p.k));
			for (const k of Object.keys(it.params ?? {})) expect(own.has(k) || known.has(k), `${it.key}.${k}`).toBe(true);
		}
		expect(GALLERY_ITEMS.size).toBeGreaterThan(80);
		expect(GALLERY.reduce((a, g) => a + g.items.length, 0), 'gallery keys are unique').toBe(GALLERY_ITEMS.size);
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

	it('every gradient shape stays in 0..1, and reverses', () => {
		for (const gradient of GRADIENT_KINDS) {
			const P = { gradient, ga: [0, 0], gb: [0, -0.1] }, f = gradientField(P, () => 0.03), r = gradientField({ ...P, greverse: true }, () => 0.03);
			if (gradient === 'none') { expect(f).toBeNull(); continue; }
			for (let i = 0; i < 300; i++) {
				const u = Math.sin(i * 12.9) * 0.2, v = Math.cos(i * 78.2) * 0.2, t = f(u, v);
				expect(t >= 0 && t <= 1, gradient).toBe(true);
				expect(Math.abs(r(u, v) - (1 - t)), gradient).toBeLessThan(1e-9);
			}
		}
	});

	it('distortions only act when asked, and a stone keeps its own jitter', () => {
		expect(distortion({}, 1)).toBeNull();
		const d = distortion({ jitter: 0.002 }, 1), a = {}, b = {};
		d(0.01, 0.02, 7, a); d(0.01, 0.02, 7, b);
		expect(a).toEqual(b);
		expect(Math.hypot(a.x - 0.01, a.y - 0.02)).toBeLessThan(0.003);
	});
});

describe('handles', () => {
	const piece = { x0: -0.1, x1: 0.1, y0: -0.2, y1: 0.2 };
	it('a pattern has its three; a gradient adds its two ends', () => {
		const plain = patternHandles({ params: { layout: 'hex', x: 0.01, y: 0.02, rotate: 90 } }, piece);
		expect(plain.knobs.map((k) => k.kind)).toEqual(['move', 'scale', 'rotate']);
		expect(plain.knobs[0]).toEqual({ kind: 'move', u: 0.01, v: 0.02 });
		// turned a quarter: the scale knob, on the pattern's own x, points up the cloth
		expect(plain.knobs[1].u).toBeCloseTo(0.01, 6);
		expect(plain.knobs[1].v).toBeGreaterThan(0.02);
		const faded = patternHandles({ params: { layout: 'scatter', gradient: 'radial', ga: [0, 0], gb: [0, -0.1] } }, piece);
		expect(faded.knobs.map((k) => k.kind)).toEqual(['move', 'scale', 'rotate', 'ga', 'gb']);
		expect(faded.lines).toHaveLength(3); // the ring, the gradient's line, its radius
	});
	it('a pattern tied to the piece (rings along the edge) has no move, turn or scale', () => {
		expect(patternHandles({ params: { layout: 'edgelines' } }, piece).knobs).toHaveLength(0);
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
		const a = runPattern(gen({ layout: 'phyllotaxis', count: 200, spacing: 0.006 }), ctx);
		const b = runPattern(gen({ layout: 'phyllotaxis', count: 200, spacing: 0.006, x: 0.02, y: -0.03 }), ctx);
		const ua = piece.uvOf(a[0].sp), ub = piece.uvOf(b[0].sp);
		expect(Math.hypot(ub[0] - ua[0] - 0.02, ub[1] - ua[1] + 0.03)).toBeLessThan(1e-3);
	});

	it('scaling does not scale stones; a line pattern keeps its pitch', () => {
		const P = { layout: 'stripes', spacing: 0.02, gap: 1.2 }, a = runPattern(gen(P), ctx), b = runPattern(gen({ ...P, scale: 2 }), ctx);
		expect(new Set(a.map((s) => s.size)).size).toBe(1);
		expect(b[0].size).toBe(a[0].size);
		const pitch = (list) => { const near = []; for (let i = 0; i < list.length; i += 9) { let best = Infinity; for (let j = 0; j < list.length; j++) if (i !== j) best = Math.min(best, Math.hypot(list[i].x - list[j].x, list[i].y - list[j].y, list[i].z - list[j].z)); near.push(best); } near.sort((x, y) => x - y); return near[near.length >> 1]; };
		expect(Math.abs(pitch(b) - pitch(a)) / pitch(a)).toBeLessThan(0.1);
		expect(b.length).toBeLessThan(a.length * 0.7); // half the stripes
	});

	it('a density gradient thins, it does not reshuffle: what stays stays exactly where it was', () => {
		// a lattice: no stone can be pushed out by a neighbour, so the sets nest exactly
		const P = { layout: 'hex', spacing: 0.008, gradient: 'linear', densityFrom: 1, densityTo: 0.6 };
		const a = runPattern(gen(P), ctx), b = runPattern(gen({ ...P, densityTo: 0.2 }), ctx);
		expect(b.length).toBeLessThan(a.length);
		expect(b.length).toBeGreaterThan(a.length * 0.3);
		const key = (s) => s.sp.f + ':' + s.sp.b0.toFixed(5);
		const had = new Set(a.map(key));
		for (const s of b) expect(had.has(key(s))).toBe(true);
	});

	it('a scatter gradient: nudging the handle keeps nearly every stone', () => {
		const P = { layout: 'scatter', gradient: 'linear', densityFrom: 1, densityTo: 0 }, g0 = patternParams(gen(P), piece);
		const a = runPattern(gen({ ...P, ga: g0.ga, gb: g0.gb }), ctx), b = runPattern(gen({ ...P, ga: [g0.ga[0], g0.ga[1] + 0.004], gb: g0.gb }), ctx);
		const key = (s) => s.sp.f + ':' + s.sp.b0.toFixed(5), had = new Set(a.map(key));
		const same = b.filter((s) => had.has(key(s))).length;
		expect(a.length).toBeGreaterThan(300);
		expect(same / b.length).toBeGreaterThan(0.85);
	});

	it('a size gradient only uses sizes that exist', () => {
		const pts = runPattern(gen({ layout: 'hex', spacing: 0.011, gradient: 'radial', size: 'ss20', sizeTo: 'ss5' }), ctx), sizes = new Set(pts.map((s) => Math.round(s.size * 1e5) / 100));
		expect(sizes.size).toBeGreaterThan(3);
		for (const d of sizes) expect([1.4, 1.6, 1.8, 2, 2.4, 2.8, 3.1, 3.5, 3.9, 4.7, 5.3, 6.4, 7.2, 8.5, 11.1]).toContain(d);
	});

	it('a colour ramp lands along the gradient', () => {
		const pts = runPattern(gen({ layout: 'hex', spacing: 0.01, gradient: 'linear' }, { colourRamp: ['Sapphire', 'Ruby'] }), ctx).sort((a, b) => b.y - a.y), n = Math.floor(pts.length * 0.12), top = pts.slice(0, n), low = pts.slice(-n);
		const share = (l) => l.filter((s) => s.stone === 'Sapphire').length / l.length;
		expect(share(top)).toBeGreaterThan(0.8);
		expect(share(low)).toBeLessThan(0.25);
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
		for (const b of big) for (const s of st) if (s !== b) expect(Math.hypot(b.x - s.x, b.y - s.y, b.z - s.z)).toBeGreaterThanOrEqual(((b.size + s.size) / 2) * 0.92 - 1e-6);
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
		const d = { ...doc, stones: [gen({ layout: 'phyllotaxis', count: 500, x: 0.03, symmetric: true }, { id: 'a' })], placed: [] }, st = runStones(d, { ...ctx, doc: d }).stones;
		expect(st.some((s) => s.x > 0.02) && st.some((s) => s.x < -0.02)).toBe(true);
		const left = st.filter((s) => s.x > 0.005), right = st.filter((s) => s.x < -0.005);
		expect(Math.abs(left.length - right.length)).toBeLessThan(left.length * 0.08);
	});

	it('on a paired piece: the mirror image too, and one side when the pair is split', () => {
		const paired = (id) => ({ ...ctx.cloth(id), paired: true });
		const d = { ...doc, stones: [gen({ layout: 'hex', spacing: 0.02 }, { id: 'a' })], placed: [] };
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
		const p = { layout: 'hex', x: 0.02, rotate: 30, ga: [0.01, 0.1], gb: [0.02, -0.1] }, f = flipPatternParams(p, true);
		expect(f).toEqual({ layout: 'hex', x: -0.02, rotate: -30, flip: true, ga: [-0.01, 0.1], gb: [-0.02, -0.1] });
		expect(flipPatternParams(f, true).flip).toBe(false);
		expect(flipPatternParams({ layout: 'grid' }).flip).toBeUndefined(); // a change of layout is not a flip
	});

	it('the commands check what they are given', () => {
		const s = new DocumentStore(newDocument('t'));
		s.ctx = { man: B.man, surf: B.surf, landmarks: {}, get doc() { return s.doc; } };
		expect(() => s.exec({ op: 'stones.add', kind: 'pattern', on: { panel: 'p1' }, params: { layout: 'nope' } })).toThrow(/Unknown pattern layout/);
		expect(() => s.exec({ op: 'stones.add', kind: 'pattern', params: { layout: 'hex' } })).toThrow(/on a piece/);
		expect(() => s.exec({ op: 'stones.add', kind: 'pattern', on: { panel: 'p1' }, params: { layout: 'hex', gradient: 'nope' } })).toThrow(/Unknown gradient/);
		const id = s.exec({ op: 'stones.add', kind: 'pattern', on: { panel: 'p1' }, params: { layout: 'hex', spacing: 0.01 } });
		s.exec({ op: 'stones.set', id, params: { x: 0.01 }, gesture: 'g' });
		s.exec({ op: 'stones.set', id, params: { x: 0.02 }, gesture: 'g' });
		expect(s.undoStack).toHaveLength(2); // a drag is one undo step
		expect(s.doc.stones[0].params.x).toBe(0.02);
		expect(s.doc.stones[0].params.spacing).toBe(0.01);
	});

	it('every arrangement runs on a real piece', () => {
		for (const name of LAYOUT_KINDS) {
			const pts = runPattern(gen({ layout: name }, { id: 'x' + name }), ctx);
			expect(pts.length, name).toBeGreaterThan(0);
		}
	});

	it('one drag frame is quick: a dense pattern, end to end', () => {
		const P = { layout: 'hex', spacing: 0.0045, size: 'ss10', gradient: 'linear', densityFrom: 1, densityTo: 0.2 };
		runPattern(gen(P), ctx);
		const t0 = performance.now();
		let count = 0;
		for (let k = 0; k < 10; k++) count = runPattern(gen({ ...P, x: k * 0.001 }), ctx).length;
		const ms = (performance.now() - t0) / 10;
		expect(count).toBeGreaterThan(1500);
		expect(ms).toBeLessThan(25);
	});
});
