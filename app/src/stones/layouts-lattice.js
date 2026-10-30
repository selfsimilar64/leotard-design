// Stone arrangements: scatters, lattices, lines and repeating tiles. Each has its parameters (what the
// panel shows, with their defaults), its grips (its own handles on the body, stones/handles.js) and
// make(P, E): lay candidates in E (stones/candidates.js) over E.box, in the pattern's own space. What the
// design hangs on (a corner, a crossing, a joint) has a stone of its own, and the line between two such stops
// holds a whole number of stones. The pattern's own sizes (a bigger stone at a crossing, a swelling line) are
// E.k and the joints' E.jk. dart: candidates may collide, so they are accepted in turn, biggest first, each
// kept clear of those before it (stones/pattern.js); random: the seed matters (the panel offers Reshuffle);
// points: single stones, no lines, so the spacing of stones along a line means nothing here; own: a design of
// its own size, laid where it is clicked (the rest fill the piece from its middle). Everything is anchored to the
// pattern's own origin: moving a pattern moves its stones rigidly.
// Spec: knowledge/engineering/architecture/procedural-stone-patterns.md.
import { TAU, frac, hash2, rankOf2, clamp01 } from './fields.js';
import { motifOutline, insidePoly, distPoly } from './motifs.js';
import { SS, sizeOf } from './library.js';

// parameters as the panel shows them: f: mm | deg | n | x (a ratio) | pct. log: a slider that gives small
// values as much room as big ones. hidden: only a preset sets it. when(P): only shown when it does something.
export const mm = (k, l, d, min, max, step = 0.0001) => ({ k, l, d, min, max, step, f: 'mm', log: min > 0 && max / min >= 6 });
export const num = (k, l, d, min, max, step = 1, f = 'n') => ({ k, l, d, min, max, step, f });
export const ratio = (k, l, d, min, max, step = 0.01) => ({ k, l, d, min, max, step, f: 'x' });
export const deg = (k, l, d, min = -180, max = 180, step = 1) => ({ k, l, d, min, max, step, f: 'deg' });
export const pct = (k, l, d, min = 0, max = 1, step = 0.01) => ({ k, l, d, min, max, step, f: 'pct' });
export const opt = (k, l, d, options) => ({ k, l, d, options });
export const hidden = (k, d) => ({ k, d, hidden: true });
export const when = (spec, fn) => ({ ...spec, when: fn });
// A stone's own size, as a factor of the crystal's: no further than the biggest stone there is. maxOf(P, piece): the
// end of a slider where past that it would do nothing.
const BIGGEST_STONE = Math.max(...Object.values(SS)) / 1000;
export const stoneRatio = (k, l, d, min, max, step = 0.05) => ({ ...ratio(k, l, d, min, max, step), maxOf: (P) => Math.min(max, Math.max(d, BIGGEST_STONE / sizeOf(P.size ?? 'ss12'))) });
// How far a pattern of this frame reaches on a piece: half its diagonal, in the pattern's own space.
export const reachOn = (P, piece) => (piece ? Math.hypot(piece.x1 - piece.x0, piece.y1 - piece.y0) / 2 : 0.36) / Math.max((P.scale ?? 1) * (P.pscale ?? 1), 0.05);

// Grips: a layout's own handles. along: a knob out along a direction, as many units of the value away as it
// takes to be easy to grab; radius: a knob on the circle the value draws; point: anything else.
export const along = (key, dir, title, unit = null) => ({ type: 'along', key, dir, title, unit });
export const radius = (key, title, opts = {}) => ({ type: 'radius', key, title, ...opts });
export const point = (at, set, title, lines = null) => ({ type: 'point', at, set, title, lines });

// `t` measured from the pattern's middle: it does not change as the pattern moves
const FAR = 0.35;
export const farT = (x, y) => { const t = Math.sqrt(x * x + y * y) / FAR; return t > 1 ? 1 : t; };
export const farLine = (c) => clamp01(0.5 + c / (2 * FAR));

// Every point i a + j b inside the box. fn(i, j, x, y)
export function lattice(B, ax, ay, bx, by, fn) {
	const det = ax * by - ay * bx;
	if (Math.abs(det) < 1e-12) return;
	let i0 = Infinity, i1 = -Infinity, j0 = Infinity, j1 = -Infinity;
	for (const [x, y] of [[B.x0, B.y0], [B.x1, B.y0], [B.x0, B.y1], [B.x1, B.y1]]) {
		const i = (x * by - y * bx) / det, j = (y * ax - x * ay) / det;
		i0 = Math.min(i0, i); i1 = Math.max(i1, i); j0 = Math.min(j0, j); j1 = Math.max(j1, j);
	}
	i0 = Math.floor(i0) - 1; i1 = Math.ceil(i1) + 1; j0 = Math.floor(j0) - 1; j1 = Math.ceil(j1) + 1;
	if ((i1 - i0) * (j1 - j0) > 600000) return;
	for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) fn(i, j, i * ax + j * bx, i * ay + j * by);
}
const grown = (B, m) => ({ ...B, x0: B.x0 - m, x1: B.x1 + m, y0: B.y0 - m, y1: B.y1 + m });

// ---------------------------------------------------------------------------------------------
// Scatter. A tile of points on the torus, built by dart throwing at ever smaller radii: each radius
// adds points to those already there, so any first share of the tile is evenly spread, and rank
// (a point's place in the tile) can thin it. Built once.

export const TILE_R = 0.0125; // the closest two points of the whole tile (unit tile)
let tile = null;
export function blueTile() {
	if (tile) return tile;
	let s = 12345;
	const rnd = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
	const G = 80, cells = Array.from({ length: G * G }, () => []), X = [], Y = [];
	for (let level = 8; level >= 0; level--) {
		const r = TILE_R * Math.SQRT2 ** level, r2 = r * r, reach = Math.ceil(r * G), tries = Math.ceil(16 / r2);
		for (let k = 0; k < tries; k++) {
			const x = rnd(), y = rnd(), cx = Math.floor(x * G), cy = Math.floor(y * G);
			let ok = true;
			for (let j = -reach; j <= reach && ok; j++) for (let i = -reach; i <= reach && ok; i++) {
				for (const q of cells[((cy + j + G) % G) * G + ((cx + i + G) % G)]) {
					let dx = Math.abs(x - X[q]), dy = Math.abs(y - Y[q]);
					if (dx > 0.5) dx = 1 - dx;
					if (dy > 0.5) dy = 1 - dy;
					if (dx * dx + dy * dy < r2) { ok = false; break; }
				}
			}
			if (ok) { cells[cy * G + cx].push(X.length); X.push(x); Y.push(y); }
		}
	}
	return (tile = { X: Float32Array.from(X), Y: Float32Array.from(Y), n: X.length });
}
// fn(x, y, i, rank) for the tile repeated over the box, one tile L wide; the seed shifts and turns it.
export function overTile(B, L, seed, fn) {
	const T = blueTile(), ox = hash2(seed, 1), oy = hash2(seed, 2), sw = hash2(seed, 3) < 0.5, fx = hash2(seed, 4) < 0.5, fy = hash2(seed, 5) < 0.5;
	const i0 = Math.floor(B.x0 / L), i1 = Math.floor(B.x1 / L), j0 = Math.floor(B.y0 / L), j1 = Math.floor(B.y1 / L);
	for (let k = 0; k < T.n; k++) {
		let a = frac(T.X[k] + ox), b = frac(T.Y[k] + oy);
		if (sw) { const t = a; a = b; b = t; }
		if (fx) a = 1 - a;
		if (fy) b = 1 - b;
		for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
			const x = (i + a) * L, y = (j + b) * L;
			if (x >= B.x0 && x <= B.x1 && y >= B.y0 && y <= B.y1) fn(x, y, k, k / T.n, i, j);
		}
	}
}
// A stone's own size in a mix: most a little under the crystal's size, a few well over it. h: its chance;
// v: how varied, 0..1.
export const SMALLEST_VARIED = (v) => 1 - 0.4 * v;
export const varied = (h, v) => (v > 0 ? SMALLEST_VARIED(v) + h * h * h * v * 2.6 : 1);

// ---------------------------------------------------------------------------------------------
// Repeating tiles: the edges of one cell, in units of `spacing`, with the cell's two lattice vectors.
const S3 = Math.sqrt(3), H3 = S3 / 2, W8 = 1 + Math.SQRT2, CH = (Math.sqrt(28) - 2) / 6; // CH: half a bridge of the Cairo tiling, all edges equal
const chain = (pts) => pts.slice(1).map((p, i) => [pts[i][0], pts[i][1], p[0], p[1]]);
export const TILES = {
	windowpane: { label: 'Windowpane', a: [1, 0], b: [0, 1], segs: [[0, 0, 1, 0], [0, 0, 0, 1]] },
	triangles: { label: 'Triangles', a: [1, 0], b: [0.5, H3], segs: [[0, 0, 1, 0], [0, 0, 0.5, H3], [1, 0, 0.5, H3]] },
	honeycomb: { label: 'Honeycomb', a: [S3, 0], b: [H3, 1.5], segs: [[0, 0, 0, 1], [0, 0, -H3, -0.5], [0, 0, H3, -0.5]] },
	trihex: { label: 'Star of David', a: [2, 0], b: [1, S3], segs: [[0, 0, 2, 0], [0, 0, 1, S3], [1, 0, 0, S3]] },
	rhombille: { label: 'Tumbling blocks', a: [S3, 0], b: [H3, 1.5], segs: [[0, 0, 0, 1], [0, 0, -H3, -0.5], [0, 0, H3, -0.5], [H3, 0.5, 0, 0], [H3, 0.5, S3, 0], [H3, 0.5, H3, 1.5]] },
	cairo: {
		label: 'Cairo pentagons', a: [2, 2], b: [2, -2],
		// square cells 2 wide: a bridge in each, across or up by turns, each end joined to its two corners
		segs: [[-CH, 0, CH, 0], [CH, 0, 1, 1], [CH, 0, 1, -1], [-CH, 0, -1, 1], [-CH, 0, -1, -1], [2, -CH, 2, CH], [2, CH, 1, 1], [2, CH, 3, 1], [2, -CH, 1, -1], [2, -CH, 3, -1]],
	},
	octagons: {
		label: 'Octagons and squares', a: [W8, 0], b: [0, W8],
		segs: [[-0.5, W8 / 2, 0.5, W8 / 2], [W8 / 2, -0.5, W8 / 2, 0.5], [0.5, W8 / 2, W8 / 2, 0.5], [W8 / 2, -0.5, 0.5, -W8 / 2], [-0.5, -W8 / 2, -W8 / 2, -0.5], [-W8 / 2, 0.5, -0.5, W8 / 2]],
	},
	harlequin: { label: 'Harlequin', a: [1.2, 0], b: [0.6, 1], segs: [[0, 0, 0.6, 1], [0, 0, -0.6, 1]] },
	basket: {
		label: 'Basket weave', a: [1, 1], b: [1, -1],
		segs: [[0.1, 0.25, 0.9, 0.25], [0.1, 0.75, 0.9, 0.75], [1.25, 0.1, 1.25, 0.9], [1.75, 0.1, 1.75, 0.9]],
	},
	herringbone: { label: 'Herringbone', a: [2, 0], b: [0, 0.55], segs: [[0.08, 0.08, 0.92, 0.92], [1.08, 0.92, 1.92, 0.08]] },
	greekkey: { label: 'Greek key', a: [5, 0], b: [0, 6], segs: chain([[0, 0], [0, 4], [4, 4], [4, 1], [2, 1], [2, 2], [3, 2], [3, 3], [1, 3], [1, 0], [5, 0]]) },
};

// Parallel lines x = k * spacing + shape(y, k), `lines` rows to a line. Each line is cut at whole periods of
// its shape, so its stones sit the same way in every period, in step with the next line, wherever the
// pattern lies. kAt(y, k): the line's own size there.
function ribbons(E, P, shape, o = {}) {
	const B = E.box, r = B.r, s = P.spacing, K = Math.ceil(r / s) + 1, n = P.lines ?? 1, period = o.period ?? E.pitch * 32, steps = o.steps ?? 1, reach = o.reach ?? 0, kAt = o.kAt ?? null;
	// the rows of a line: smaller outwards when graded, each its stones' width from the last
	const mid = (n - 1) / 2, kr = Array.from({ length: n }, (_, l) => 1 - (P.graded ?? 0) * (mid ? Math.abs(l - mid) / mid : 0)), off = [0];
	for (let l = 1; l < n; l++) off.push(off[l - 1] + ((kr[l - 1] + kr[l]) / 2) * E.pitch * 1.15);
	const centre = off[n - 1] / 2;
	const m0 = Math.floor(B.y0 / period) - 1, m1 = Math.ceil(B.y1 / period) + 1, wide = reach + off[n - 1];
	for (let k = -K; k <= K; k++) {
		const c = k * s;
		if (c + wide < B.x0 || c - wide > B.x1) continue;
		E.cat = ((k % 16) + 16) % 16; E.t = farLine(c);
		for (let l = 0; l < n; l++) {
			const x0 = c + off[l] - centre;
			for (let m = m0; m < m1; m++) {
				const y0 = m * period;
				E.k = kr[l] * (kAt ? kAt(y0, k) : 1);
				E.begin(x0 + shape(y0, k), y0, false);
				for (let i = 1; i <= steps; i++) {
					const y = y0 + (period * i) / steps;
					E.k = kr[l] * (kAt ? kAt(y, k) : 1);
					E.to(x0 + shape(y, k), y);
				}
				E.end(false);
			}
		}
	}
	E.k = 1;
}
// A line's own size along it: a swell of this strength and length.
const swellAt = (P) => (P.swell > 0 ? (y) => 1 + P.swell * Math.sin((TAU * y) / P.swellL) : null);
const SWELL = [pct('swell', 'Swell along the line', 0), when(mm('swellL', 'Swell length', 0.06, 0.012, 0.3), (P) => P.swell > 0)];
const GRADED = when(pct('graded', 'Outer rows smaller', 0, 0, 0.8), (P) => P.lines > 1);
// A joint's size, the same in all that have joints.
const NODE = (l = 'Stones at the joints', d = 1) => stoneRatio('nodeSize', l, d, 1, 3.5);

// Stops along a line of a family of parallel lines, where other families cross it: ts ascending. Lines lie
// o + t dir; the others are given by their normal and spacing.
function crossings(ox, oy, dx, dy, others, s, reach) {
	const ts = [];
	for (const [nx, ny] of others) {
		const cross = dx * nx + dy * ny;
		if (Math.abs(cross) < 1e-6) continue;
		const off = ox * nx + oy * ny, a = (off - reach * Math.abs(cross)) / s, b = (off + reach * Math.abs(cross)) / s;
		for (let m = Math.ceil(a); m <= Math.floor(b); m++) ts.push((m * s - off) / cross);
	}
	ts.sort((p, q) => p - q);
	const out = [];
	for (const t of ts) if (!out.length || t - out[out.length - 1] > 1e-5) out.push(t);
	return out;
}

export const LATTICE_LAYOUTS = {
	// --- scatters ---------------------------------------------------------------------------------
	scatter: {
		label: 'Scatter', dart: true, random: true,
		fine: (P) => SMALLEST_VARIED(P.variety), meanK: (P) => 1 + 0.25 * P.variety,
		params: [pct('variety', 'Variety of sizes', 0)],
		make(P, E) {
			// (a tile of a fixed size in its own space, so that scaling the pattern spreads its stones apart)
			const v = P.variety, seed = E.seed, turned = E.angles;
			overTile(E.box, (E.d0 * E.gap * E.fine) / TILE_R, seed, (x, y, k, rank) => E.add(x, y, rank, turned ? hash2(k, 8, seed) * TAU : 0, farT(x, y), v > 0 ? varied(hash2(k, 7, seed), v) : 1));
		},
	},
	clusters: {
		label: 'Clusters', dart: true, random: true,
		fine: (P) => SMALLEST_VARIED(P.variety), meanK: (P) => 1 + 0.25 * P.variety,
		params: [mm('spacing', 'Between clusters', 0.05, 0.015, 0.15), mm('radius', 'Cluster size', 0.014, 0.004, 0.05), num('count', 'Stones in each', 22, 3, 80), pct('heart', 'Bigger in the middle', 0.5), pct('variety', 'Variety of sizes', 0.2)],
		grips: [along('spacing', [1, 0], 'Between clusters'), radius('radius', 'Cluster size')],
		make(P, E) {
			const seed = E.seed, m = P.radius, B = grown(E.box, m), v = P.variety;
			// only the tile's first sixteenth: points four times further apart than all of it
			overTile(B, P.spacing / (TILE_R * 4), seed, (x, y, k, rank, i, j) => {
				if (rank > 1 / 16) return;
				const id = k + i * 7919 + j * 104729;
				E.cat = id & 3;
				for (let c = 0; c < P.count; c++) {
					const a = hash2(id, c * 2, seed) * TAU, f = c ? Math.sqrt(hash2(id, c * 2 + 1, seed)) : 0, g = 1 - f;
					E.add(x + P.radius * f * Math.cos(a), y + P.radius * f * Math.sin(a), Math.min(0.999, rank * 16 * 0.5 + (c / P.count) * 0.5), hash2(id, c, seed + 1) * TAU, f, varied(hash2(id, c, seed + 2), v) * (1 + P.heart * 2.2 * g * g));
				}
			});
		},
	},
	meteors: {
		label: 'Meteor shower', random: true,
		params: [mm('spacing', 'Between streaks', 0.03, 0.01, 0.1), mm('length', 'Streak length', 0.05, 0.01, 0.2), pct('taper', 'Taper', 0.6), stoneRatio('nodeSize', 'Head stone', 1.6, 1, 3.5)],
		grips: [along('spacing', [1, 0], 'Between streaks'), along('length', [0, -1], 'Streak length')],
		make(P, E) {
			const seed = E.seed, m = P.length * 1.5, B = grown(E.box, m);
			overTile(B, P.spacing / (TILE_R * 4), seed, (x, y, k, rank, i, j) => {
				if (rank > 1 / 16) return;
				const id = k + i * 7919 + j * 104729, len = P.length * (0.5 + hash2(id, 1, seed));
				E.cat = id & 3; E.t = farT(x, y); E.unit = rank * 16; E.jk = P.nodeSize; E.k = 1;
				E.begin(x, y, true);
				E.k = 1 - P.taper;
				E.to(x, y - len);
				E.end(false);
			});
			E.unit = -1; E.k = 1;
		},
	},

	// --- lattices of single stones -----------------------------------------------------------------
	grid: {
		points: true,
		label: 'Grid',
		params: [mm('spacing', 'Spacing', 0.01, 0.003, 0.06), ratio('aspect', 'Row height', 1, 0.3, 3, 0.05), stoneRatio('accent', 'Every other stone', 1, 0.4, 3)],
		grips: [along('spacing', [1, 0], 'Spacing'), along('aspect', [0, 1], 'Row height', (P) => P.spacing)],
		make(P, E) { lattice(E.box, P.spacing, 0, 0, P.spacing * P.aspect, (i, j, x, y) => accented(E, x, y, rankOf2(i, j), (i + j) & 1, P.accent, (i + j) & 1)); },
	},
	hex: {
		points: true,
		label: 'Hexagonal',
		params: [mm('spacing', 'Spacing', 0.01, 0.003, 0.06), ratio('aspect', 'Row height', 1, 0.3, 3, 0.05), stoneRatio('accent', 'Every third stone', 1, 0.4, 3)],
		grips: [along('spacing', [1, 0], 'Spacing'), along('aspect', [0, 1], 'Row height', (P) => P.spacing * H3)],
		make(P, E) { const s = P.spacing; lattice(E.box, s, 0, s / 2, s * H3 * P.aspect, (i, j, x, y) => { const c = ((i - j) % 3 + 3) % 3; accented(E, x, y, rankOf2(i, j), c === 0 ? 1 : 0, P.accent, c); }); },
	},
	brick: {
		points: true,
		label: 'Brick',
		params: [mm('spacing', 'Along the rows', 0.012, 0.003, 0.06), mm('rowGap', 'Between rows', 0.008, 0.003, 0.06), pct('shift', 'Row shift', 0.5), stoneRatio('accent', 'Every other row', 1, 0.4, 3)],
		grips: [along('spacing', [1, 0], 'Along the rows'), along('rowGap', [0, 1], 'Between rows')],
		make(P, E) { lattice(E.box, P.spacing, 0, P.spacing * P.shift, P.rowGap, (i, j, x, y) => accented(E, x, y, rankOf2(i, j), j & 1, P.accent, j & 1)); },
	},
	diamonds: {
		points: true,
		label: 'Diamond grid',
		params: [mm('spacing', 'Width', 0.014, 0.004, 0.06), ratio('aspect', 'Height', 1.6, 0.4, 4, 0.05), stoneRatio('accent', 'Every other stone', 1, 0.4, 3)],
		grips: [along('spacing', [1, 0], 'Width', () => 0.5), along('aspect', [0, 1], 'Height', (P) => P.spacing / 2)],
		make(P, E) { const w = P.spacing / 2, h = (P.spacing * P.aspect) / 2; lattice(E.box, w, h, w, -h, (i, j, x, y) => accented(E, x, y, rankOf2(i, j), (i + j) & 1, P.accent, (i & 1) + 2 * (j & 1))); },
	},
	motifs: {
		label: 'Repeating motif',
		params: [
			opt('motif', 'Motif', 'heart', [['heart', 'Heart'], ['star', 'Star'], ['diamond', 'Diamond'], ['flower', 'Flower'], ['circle', 'Circle']]),
			mm('spacing', 'Spacing', 0.05, 0.015, 0.15), mm('motifSize', 'Motif size', 0.032, 0.008, 0.12),
			opt('cells', 'Laid out', 'hex', [['hex', 'Staggered'], ['square', 'In rows']]), when(deg('motifTurn', 'Turn each', 0), (P) => P.motif !== 'circle'), opt('motifFill', 'Inside', 'empty', [['empty', 'Outline'], ['fill', 'Filled']]),
			when(NODE('Stones at its corners'), (P) => P.motif !== 'circle' && P.motif !== 'flower'), stoneRatio('centre', 'Stone in its middle', 0, 0, 4),
		],
		grips: [along('spacing', [1, 0], 'Spacing'), radius('motifSize', 'Motif size', { half: true, angle: Math.PI / 2 })],
		make(P, E) {
			const R = P.motifSize / 2, a = (P.motifTurn * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), out = motifOutline(P.motif);
			const pts = out.map(([x, y]) => [(x * c - y * s) * R, (x * s + y * c) * R]);
			const inner = [];
			if (P.motifFill === 'fill') {
				const st = E.pitch / R;
				for (let y = -1.2; y <= 1.2; y += st * H3) for (let x = -1.2 + ((Math.round(y / (st * H3)) & 1) ? st / 2 : 0); x <= 1.2; x += st) {
					if (insidePoly([x, y], out) && distPoly([x, y], out) > st * 0.55) inner.push([(x * c - y * s) * R, (x * s + y * c) * R]);
				}
			}
			const B = grown(E.box, R * 1.3), sp = P.spacing, here = [];
			E.jk = P.nodeSize;
			const motif = E.stamped((T, x, y) => {
				if (P.centre > 0) T.key(x, y, 0, T.t, P.centre, T.cat, 0);
				here.length = 0;
				for (const q of pts) here.push([x + q[0], y + q[1]]);
				T.poly(here, true);
				for (const q of inner) T.add(x + q[0], y + q[1], T.unit, 0);
			});
			const place = (i, j, x, y) => {
				E.cat = (i + j) & 1; E.t = farT(x, y);
				// a whole motif comes and goes together
				E.unit = rankOf2(i, j);
				motif(x, y);
			};
			if (P.cells === 'hex') lattice(B, sp, 0, sp / 2, sp * H3, place); else lattice(B, sp, 0, 0, sp, place);
			E.unit = -1;
		},
	},

	// --- lines ------------------------------------------------------------------------------------
	stripes: {
		label: 'Stripes',
		params: [mm('spacing', 'Between stripes', 0.016, 0.004, 0.08), num('lines', 'Rows in a stripe', 1, 1, 6), GRADED, ...SWELL],
		grips: [along('spacing', [1, 0], 'Between stripes')],
		make(P, E) { ribbons(E, P, () => 0, { period: P.swell > 0 ? P.swellL : undefined, steps: P.swell > 0 ? 8 : 1, kAt: swellAt(P) }); },
	},
	waves: {
		label: 'Waves',
		params: [mm('spacing', 'Between lines', 0.016, 0.004, 0.08), mm('amp', 'Height', 0.008, 0.001, 0.05), mm('period', 'Length', 0.05, 0.01, 0.2), deg('shift', 'Line to line', 0), num('lines', 'Rows in a line', 1, 1, 4), GRADED, pct('swell', 'Bigger on the crests', 0)],
		grips: [along('spacing', [1, 0], 'Between lines'), along('period', [0, 1], 'Length'), point((P) => [P.amp, P.period * 0.25], (P, x) => ({ amp: Math.abs(x) }), 'Height')],
		make(P, E) {
			const sh = (P.shift * Math.PI) / 180, ph = (y, k) => (TAU * y) / P.period + k * sh;
			ribbons(E, P, (y, k) => P.amp * Math.sin(ph(y, k)), { period: P.period, steps: 24, reach: P.amp, kAt: P.swell > 0 ? (y, k) => 1 + P.swell * Math.sin(ph(y, k)) : null });
		},
	},
	chevrons: {
		label: 'Chevrons',
		params: [mm('spacing', 'Between lines', 0.02, 0.004, 0.08), mm('amp', 'Depth', 0.012, 0.001, 0.05), mm('period', 'Width', 0.05, 0.01, 0.2), num('lines', 'Rows in a line', 1, 1, 4), GRADED, NODE('Stones at the points')],
		grips: [along('spacing', [1, 0], 'Between lines'), along('period', [0, 1], 'Width'), point((P) => [P.amp, P.period / 2], (P, x) => ({ amp: Math.abs(x) }), 'Depth')],
		make(P, E) {
			const B = E.box, K = Math.ceil(B.r / P.spacing) + 1, half = P.period / 2, n = P.lines, mid = (n - 1) / 2, m0 = Math.floor(B.y0 / half) - 1, m1 = Math.ceil(B.y1 / half) + 1;
			E.jk = P.nodeSize;
			for (let k = -K; k <= K; k++) for (let l = 0; l < n; l++) {
				const c = k * P.spacing + (l - mid) * E.pitch * 1.15, kr = 1 - P.graded * (mid ? Math.abs(l - mid) / mid : 0);
				if (c + P.amp < B.x0 - E.pitch * 2 || c - P.amp > B.x1 + E.pitch * 2) continue;
				E.cat = ((k % 16) + 16) % 16; E.t = farLine(c); E.k = kr; E.jk = P.nodeSize * kr;
				for (let m = m0; m < m1; m++) {
					const s0 = m & 1 ? 1 : -1;
					E.seg(c + s0 * P.amp, m * half, c - s0 * P.amp, (m + 1) * half);
				}
			}
			E.k = 1;
		},
	},
	ogee: {
		label: 'Ogee',
		params: [mm('spacing', 'Width', 0.03, 0.008, 0.1), ratio('stretch', 'Height', 1.6, 0.5, 4, 0.05), NODE('Stones where they touch', 1.3)],
		grips: [along('spacing', [1, 0], 'Width'), along('stretch', [0, 1], 'Height', (P) => P.spacing * 2)],
		make(P, E) {
			const B = E.box, A = P.spacing / 2, L = P.spacing * P.stretch * 2, K = Math.ceil(B.r / P.spacing) + 1, half = L / 2, m0 = Math.floor(B.y0 / half) - 1, m1 = Math.ceil(B.y1 / half) + 1, steps = 14;
			E.jk = P.nodeSize; E.k = 1;
			for (let k = -K; k <= K; k++) {
				const sgn = k & 1 ? 1 : -1, c = k * P.spacing;
				if (c + A < B.x0 - E.pitch * 2 || c - A > B.x1 + E.pitch * 2) continue;
				E.cat = k & 1; E.t = farLine(c);
				// from one touching point to the next: the extremes of the sine
				for (let m = m0; m < m1; m++) {
					const y0 = L / 4 + m * half;
					E.begin(c + sgn * A * Math.sin((TAU * y0) / L), y0, true);
					for (let i = 1; i <= steps; i++) { const y = y0 + (half * i) / steps; E.to(c + sgn * A * Math.sin((TAU * y) / L), y); }
					E.end(true);
				}
			}
		},
	},
	trellis: {
		label: 'Trellis',
		params: [mm('spacing', 'Spacing', 0.03, 0.006, 0.12), num('families', 'Directions', 2, 2, 6), deg('skew', 'Angle', 45, 5, 85), NODE('Stones at the crossings', 1.4)],
		grips: [along('spacing', [0, 1], 'Spacing', (P) => 1 / (2 * Math.cos((P.skew * Math.PI) / 180)))],
		make(P, E) {
			const r = E.box.r, s = P.spacing, F = P.families, a0 = (P.skew * Math.PI) / 180, K = Math.ceil(r / s) + 1, reach = r + s * 2;
			const dirs = Array.from({ length: F }, (_, f) => { const a = F === 2 ? (f ? Math.PI - a0 : a0) : a0 + (f * Math.PI) / F; return [Math.cos(a), Math.sin(a)]; }), normals = dirs.map(([c, n]) => [-n, c]);
			E.jk = P.nodeSize;
			dirs.forEach(([cx, sx], f) => {
				const others = normals.filter((_, g) => g !== f);
				E.cat = f;
				for (let k = -K; k <= K; k++) {
					const ox = -sx * k * s, oy = cx * k * s, ts = crossings(ox, oy, cx, sx, others, s, reach);
					E.t = farLine(k * s);
					for (let q = 0; q + 1 < ts.length; q++) E.seg(ox + cx * ts[q], oy + sx * ts[q], ox + cx * ts[q + 1], oy + sx * ts[q + 1]);
				}
			});
		},
	},
	plaid: {
		label: 'Plaid',
		params: [mm('spacing', 'Size', 0.05, 0.015, 0.15), opt('sett', 'Sett', 'tartan', [['tartan', 'Tartan'], ['madras', 'Madras'], ['windowpane', 'Fine']]), NODE('Stones at the crossings')],
		grips: [along('spacing', [1, 0], 'Size')],
		make(P, E) {
			const SETT = { tartan: [0, 0.08, 0.16, 0.5, 0.58], madras: [0, 0.1, 0.2, 0.3, 0.62, 0.72], windowpane: [0, 0.5] }[P.sett] ?? [0, 0.5], s = P.spacing, B = E.box;
			// the lines over the box, each way; every crossing of one with the other has its stone
			const linesIn = (a, b) => { const out = []; for (let k = Math.floor(a / s) - 1; k * s <= b + s; k++) SETT.forEach((f, l) => { const c = (k + f) * s; out.push([c, l]); }); return out; };
			const xs = linesIn(B.x0, B.x1), ys = linesIn(B.y0, B.y1);
			E.jk = P.nodeSize;
			for (const [c, l] of xs) {
				if (c < B.x0 - s || c > B.x1 + s) continue;
				E.cat = l; E.t = farLine(c);
				for (let q = 0; q + 1 < ys.length; q++) E.seg(c, ys[q][0], c, ys[q + 1][0]);
			}
			for (const [c, l] of ys) {
				if (c < B.y0 - s || c > B.y1 + s) continue;
				E.cat = l; E.t = farLine(c);
				for (let q = 0; q + 1 < xs.length; q++) E.seg(xs[q][0], c, xs[q + 1][0], c);
			}
		},
	},
	circles: {
		label: 'Interlocking circles',
		params: [mm('spacing', 'Spacing', 0.03, 0.008, 0.12), ratio('overlap', 'Circle size', 0.71, 0.3, 1.5), opt('cells', 'Laid out', 'square', [['square', 'In rows'], ['hex', 'Staggered']]), NODE('Stones at the crossings')],
		grips: [along('spacing', [1, 0], 'Spacing'), radius('overlap', 'Circle size', { unit: (P) => P.spacing, angle: Math.PI / 2 })],
		make(P, E) {
			const s = P.spacing, r = s * P.overlap, B = grown(E.box, r), hex = P.cells === 'hex', ax = s, ay = 0, bx = hex ? s / 2 : 0, by = hex ? s * H3 : s;
			// where a circle meets its neighbours, the same for all of them: a stone there, and a whole number between
			const stops = [];
			for (let j = -5; j <= 5; j++) for (let i = -5; i <= 5; i++) {
				const dx = i * ax + j * bx, dy = i * ay + j * by, D = Math.hypot(dx, dy);
				if (D < 1e-9 || D > 2 * r + 1e-9) continue;
				const base = Math.atan2(dy, dx), h = Math.acos(Math.min(1, D / (2 * r)));
				stops.push(((base + h) % TAU + TAU) % TAU, ((base - h) % TAU + TAU) % TAU);
			}
			stops.sort((a, b) => a - b);
			const uniq = [];
			for (const a of stops) if (!uniq.length || a - uniq[uniq.length - 1] > 1e-4) uniq.push(a);
			if (uniq.length > 1 && uniq[0] + TAU - uniq[uniq.length - 1] < 1e-4) uniq.pop();
			E.jk = P.nodeSize;
			const circle = E.stamped((T, x, y) => T.arc(x, y, r, 0, TAU, uniq.length ? uniq : null));
			lattice(B, ax, ay, bx, by, (i, j, x, y) => { E.cat = (i + j) & 1; E.t = farT(x, y); circle(x, y); });
		},
	},
	scales: {
		label: 'Fish scales',
		params: [mm('spacing', 'Width', 0.03, 0.008, 0.1), num('layers', 'Arcs in each', 2, 1, 5), when(pct('graded', 'Inner arcs smaller', 0.3, 0, 0.8), (P) => P.layers > 1), NODE('Stones where they meet', 1.2)],
		grips: [along('spacing', [1, 0], 'Width')],
		make(P, E) {
			const s = P.spacing, r = s / 2, B = grown(E.box, r);
			const scale = E.stamped((T, x, y) => {
				for (let l = 0; l < P.layers; l++) {
					const f = l / P.layers;
					T.cat = l; T.k = 1 - P.graded * f; T.jk = P.nodeSize * T.k;
					T.arc(x, y, r * (1 - f), 0, Math.PI, [0, Math.PI / 2, Math.PI]);
				}
			});
			lattice(B, s, 0, s / 2, s / 2, (i, j, x, y) => { E.t = farT(x, y); E.cat = 0; scale(x, y); });
			E.k = 1;
		},
	},
	truchet: {
		label: 'Truchet maze', random: true,
		params: [mm('spacing', 'Tile size', 0.024, 0.008, 0.08), NODE('Stones where they join')],
		grips: [along('spacing', [1, 0], 'Tile size')],
		make(P, E) {
			const s = P.spacing, seed = E.seed;
			E.jk = P.nodeSize;
			const one = E.stamped((T, x, y) => { T.arc(x, y, s / 2, 0, Math.PI / 2, [0, Math.PI / 2]); T.arc(x + s, y + s, s / 2, Math.PI, Math.PI * 1.5, [Math.PI, Math.PI * 1.5]); });
			const other = E.stamped((T, x, y) => { T.arc(x + s, y, s / 2, Math.PI / 2, Math.PI, [Math.PI / 2, Math.PI]); T.arc(x, y + s, s / 2, Math.PI * 1.5, TAU, [Math.PI * 1.5, TAU]); });
			lattice(E.box, s, 0, 0, s, (i, j, x, y) => {
				E.cat = (i + j) & 1; E.t = farT(x, y);
				if (hash2(i, j, seed) < 0.5) one(x, y); else other(x, y);
			});
		},
	},
	tenprint: {
		label: 'Random diagonals', random: true,
		params: [mm('spacing', 'Tile size', 0.018, 0.006, 0.08), NODE()],
		grips: [along('spacing', [1, 0], 'Tile size')],
		make(P, E) {
			const s = P.spacing, seed = E.seed;
			E.jk = P.nodeSize;
			const rising = E.stamped((T, x, y) => T.seg(x, y, x + s, y + s)), falling = E.stamped((T, x, y) => T.seg(x + s, y, x, y + s));
			lattice(E.box, s, 0, 0, s, (i, j, x, y) => {
				const up = hash2(i, j, seed) < 0.5;
				E.cat = up ? 1 : 0; E.t = farT(x, y);
				if (up) rising(x, y); else falling(x, y);
			});
		},
	},
	tile: {
		label: 'Tiling',
		params: [
			opt('tile', 'Tile', 'honeycomb', Object.entries(TILES).map(([k, t]) => [k, t.label])),
			mm('spacing', 'Size', 0.02, 0.004, 0.08), NODE(),
		],
		grips: [along('spacing', [1, 0], 'Size')],
		make(P, E) {
			const t = TILES[P.tile] ?? TILES.honeycomb, s = P.spacing, ax = t.a[0] * s, ay = t.a[1] * s, bx = t.b[0] * s, by = t.b[1] * s, B = grown(E.box, s * 6);
			E.jk = P.nodeSize;
			const cell = E.stamped((T, x, y) => t.segs.forEach((g, q) => { T.cat = q; T.seg(x + g[0] * s, y + g[1] * s, x + g[2] * s, y + g[3] * s); }));
			lattice(B, ax, ay, bx, by, (i, j, x, y) => { E.t = farT(x, y); E.cat = 0; cell(x, y); });
		},
	},
};

// A lattice stone, a family of them another size: bigger ones come first and thin last.
function accented(E, x, y, rank, fam, accent, cat) {
	const t = farT(x, y);
	if (fam && accent > 1) E.key(x, y, 0, t, accent, cat, 1);
	else E.add(x, y, rank, 0, t, fam ? accent : 1, cat);
}
