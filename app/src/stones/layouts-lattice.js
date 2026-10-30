// Stone arrangements: scatters, lattices, lines and repeating tiles. Each has its parameters (what the
// panel shows, with their defaults) and make(P, E): lay candidates in E (stones/candidates.js) over
// E.box, in the pattern's own space. dart: candidates may collide, so they are accepted in turn, each
// kept clear of those before it (stones/pattern.js). points: single stones, no lines, so the spacing of
// stones along a line means nothing here. Spec:
// knowledge/engineering/architecture/procedural-stone-patterns.md.
import { TAU, frac, hash2, rankOf1, rankOf2 } from './fields.js';
import { motifOutline, insidePoly, distPoly } from './motifs.js';

// parameters as the panel shows them: f: mm | deg | n | x (a ratio) | pct
export const mm = (k, l, d, min, max, step = 0.0005) => ({ k, l, d, min, max, step, f: 'mm' });
export const num = (k, l, d, min, max, step = 1, f = 'n') => ({ k, l, d, min, max, step, f });
export const deg = (k, l, d, min = -180, max = 180, step = 1) => ({ k, l, d, min, max, step, f: 'deg' });
export const pct = (k, l, d, min = 0, max = 1, step = 0.01) => ({ k, l, d, min, max, step, f: 'pct' });
export const opt = (k, l, d, options) => ({ k, l, d, options });

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
function tileNodes(t) {
	if (t.nodes) return t.nodes;
	const det = t.a[0] * t.b[1] - t.a[1] * t.b[0], seen = new Map();
	for (const s of t.segs) for (const [x, y] of [[s[0], s[1]], [s[2], s[3]]]) {
		const i = frac((x * t.b[1] - y * t.b[0]) / det + 1e-6), j = frac((y * t.a[0] - x * t.a[1]) / det + 1e-6);
		seen.set(Math.round(i * 1000) + ':' + Math.round(j * 1000), [i * t.a[0] + j * t.b[0], i * t.a[1] + j * t.b[1]]);
	}
	return (t.nodes = [...seen.values()]);
}

// Vertical lines x = k * spacing (+ shape(y, k)); `lines` of them to a stripe, `inner` apart.
function ribbons(E, P, shape, step) {
	const r = E.box.r, s = P.spacing, K = Math.ceil(r / s) + 1, n = P.lines ?? 1, inner = (P.inner ?? 0) || E.pitch * 1.15;
	step = Math.min(step ?? E.pitch / 2, E.pitch / 2);
	for (let k = -K; k <= K; k++) {
		E.cat = ((k % 16) + 16) % 16; E.t = (k + K) / (2 * K);
		for (let l = 0; l < n; l++) {
			const x0 = k * s + (l - (n - 1) / 2) * inner;
			E.move(x0 + shape(-r, k), -r);
			for (let y = -r + step; y <= r; y += step) E.to(x0 + shape(y, k), y);
		}
	}
}

export const LATTICE_LAYOUTS = {
	// --- scatters ---------------------------------------------------------------------------------
	scatter: {
		label: 'Scatter', dart: true, mixed: true,
		params: [],
		make(P, E) {
			const mix = P.sizeB ? P.mix ?? 0.3 : 0, L = (E.pitch / TILE_R), seed = E.seed;
			// the bigger stones go first: they claim their room, the small ones fill round them
			if (mix > 0) overTile(E.box, L, seed, (x, y, k, rank) => { if (hash2(k, 7, seed) < mix) E.add(x, y, rank, hash2(k, 8, seed) * TAU, 0, 1, 1); });
			overTile(E.box, L, seed, (x, y, k, rank) => { if (hash2(k, 7, seed) >= mix) E.add(x, y, rank, hash2(k, 8, seed) * TAU, 0, 1, 0); });
		},
	},
	clusters: {
		label: 'Clusters', dart: true, mixed: true,
		params: [mm('spacing', 'Between clusters', 0.05, 0.015, 0.15), mm('radius', 'Cluster size', 0.014, 0.004, 0.05), num('count', 'Stones in each', 22, 3, 80)],
		make(P, E) {
			const seed = E.seed, m = P.radius, B = { ...E.box, x0: E.box.x0 - m, x1: E.box.x1 + m, y0: E.box.y0 - m, y1: E.box.y1 + m };
			// only the tile's first sixteenth: points four times further apart than all of it
			overTile(B, P.spacing / (TILE_R * 4), seed, (x, y, k, rank, i, j) => {
				if (rank > 1 / 16) return;
				const id = k + i * 7919 + j * 104729;
				E.cat = id & 3;
				for (let c = 0; c < P.count; c++) {
					const a = hash2(id, c * 2, seed) * TAU, r = P.radius * Math.sqrt(hash2(id, c * 2 + 1, seed));
					E.add(x + r * Math.cos(a), y + r * Math.sin(a), Math.min(0.999, rank * 16 * 0.5 + (c / P.count) * 0.5), hash2(id, c, seed + 1) * TAU, r / P.radius, 1, hash2(id, c, seed + 2) < 0.3 ? 1 : 0);
				}
			});
		},
	},
	meteors: {
		label: 'Meteor shower',
		params: [mm('spacing', 'Between streaks', 0.03, 0.01, 0.1), mm('length', 'Streak length', 0.05, 0.01, 0.2), pct('taper', 'Taper', 0.6)],
		make(P, E) {
			const seed = E.seed, m = P.length, B = { ...E.box, x0: E.box.x0 - m, x1: E.box.x1 + m, y0: E.box.y0 - m, y1: E.box.y1 + m };
			overTile(B, P.spacing / (TILE_R * 4), seed, (x, y, k, rank, i, j) => {
				if (rank > 1 / 16) return;
				const id = k + i * 7919 + j * 104729, len = P.length * (0.5 + hash2(id, 1, seed)), n = Math.max(2, Math.round(len / E.pitch));
				for (let c = 0; c < n; c++) E.add(x, y - c * E.pitch, rank * 16, Math.PI / 2, c / n, 1 - P.taper * (c / n));
			});
		},
	},

	// --- lattices of single stones -----------------------------------------------------------------
	grid: {
		points: true,
		label: 'Grid',
		params: [mm('spacing', 'Spacing', 0.01, 0.003, 0.06), num('aspect', 'Row height', 1, 0.3, 3, 0.05, 'x')],
		make(P, E) { const B = E.box; lattice(B, P.spacing, 0, 0, P.spacing * P.aspect, (i, j, x, y) => E.add(x, y, rankOf2(i, j), 0, Math.hypot(x, y) / B.r, 1, (i + j) & 1)); },
	},
	hex: {
		points: true,
		label: 'Hexagonal',
		params: [mm('spacing', 'Spacing', 0.01, 0.003, 0.06), num('aspect', 'Row height', 1, 0.3, 3, 0.05, 'x')],
		make(P, E) { const B = E.box, s = P.spacing; lattice(B, s, 0, s / 2, s * H3 * P.aspect, (i, j, x, y) => E.add(x, y, rankOf2(i, j), 0, Math.hypot(x, y) / B.r, 1, ((i - j) % 3 + 3) % 3)); },
	},
	brick: {
		points: true,
		label: 'Brick',
		params: [mm('spacing', 'Along the rows', 0.012, 0.003, 0.06), mm('rowGap', 'Between rows', 0.008, 0.003, 0.06), pct('shift', 'Row shift', 0.5)],
		make(P, E) { const B = E.box; lattice(B, P.spacing, 0, P.spacing * P.shift, P.rowGap, (i, j, x, y) => E.add(x, y, rankOf2(i, j), 0, Math.hypot(x, y) / B.r, 1, j & 1)); },
	},
	diamonds: {
		points: true,
		label: 'Diamond grid',
		params: [mm('spacing', 'Width', 0.014, 0.004, 0.06), num('aspect', 'Height', 1.6, 0.4, 4, 0.05, 'x')],
		make(P, E) { const B = E.box, w = P.spacing / 2, h = (P.spacing * P.aspect) / 2; lattice(B, w, h, w, -h, (i, j, x, y) => E.add(x, y, rankOf2(i, j), 0, Math.hypot(x, y) / B.r, 1, (i & 1) + 2 * (j & 1))); },
	},
	motifs: {
		label: 'Repeating motif',
		params: [
			opt('motif', 'Motif', 'heart', [['heart', 'Heart'], ['star', 'Star'], ['diamond', 'Diamond'], ['flower', 'Flower'], ['circle', 'Circle']]),
			mm('spacing', 'Spacing', 0.05, 0.015, 0.15), mm('motifSize', 'Motif size', 0.032, 0.008, 0.12),
			opt('cells', 'Laid out', 'hex', [['hex', 'Staggered'], ['square', 'In rows']]), deg('motifTurn', 'Turn each', 0), opt('motifFill', 'Inside', 'empty', [['empty', 'Outline'], ['fill', 'Filled']]),
		],
		make(P, E) {
			const R = P.motifSize / 2, a = (P.motifTurn * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), out = motifOutline(P.motif);
			const pts = out.map(([x, y]) => [(x * c - y * s) * R, (x * s + y * c) * R]);
			const inner = [];
			if (P.motifFill === 'fill') {
				const st = E.pitch / R;
				for (let y = -1.2; y <= 1.2; y += st * H3) for (let x = -1.2 + ((Math.round(y / (st * H3)) & 1) ? st / 2 : 0); x <= 1.2; x += st) {
					if (insidePoly([x, y], out) && distPoly([x, y], out) > st * 0.7) inner.push([(x * c - y * s) * R, (x * s + y * c) * R]);
				}
			}
			const B = { ...E.box, x0: E.box.x0 - R, x1: E.box.x1 + R, y0: E.box.y0 - R, y1: E.box.y1 + R }, sp = P.spacing;
			const place = (i, j, x, y) => {
				E.cat = (i + j) & 1; E.t = Math.hypot(x, y) / B.r;
				const rank = rankOf2(i, j);
				E.move(x + pts[0][0], y + pts[0][1]);
				for (let k = 1; k <= pts.length; k++) E.to(x + pts[k % pts.length][0], y + pts[k % pts.length][1]);
				for (const q of inner) E.add(x + q[0], y + q[1], rank, 0);
			};
			if (P.cells === 'hex') lattice(B, sp, 0, sp / 2, sp * H3, place); else lattice(B, sp, 0, 0, sp, place);
		},
	},

	// --- lines ------------------------------------------------------------------------------------
	stripes: {
		label: 'Stripes',
		params: [mm('spacing', 'Between stripes', 0.016, 0.004, 0.08), num('lines', 'Rows in a stripe', 1, 1, 6)],
		make(P, E) { ribbons(E, P, () => 0, E.pitch * 2); },
	},
	waves: {
		label: 'Waves',
		params: [mm('spacing', 'Between lines', 0.016, 0.004, 0.08), mm('amp', 'Height', 0.008, 0.001, 0.05), mm('period', 'Length', 0.05, 0.01, 0.2), deg('shift', 'Line to line', 0), num('lines', 'Rows in a line', 1, 1, 4)],
		make(P, E) { const sh = (P.shift * Math.PI) / 180; ribbons(E, P, (y, k) => P.amp * Math.sin((TAU * y) / P.period + k * sh)); },
	},
	chevrons: {
		label: 'Chevrons',
		params: [mm('spacing', 'Between lines', 0.02, 0.004, 0.08), mm('amp', 'Depth', 0.012, 0.001, 0.05), mm('period', 'Width', 0.05, 0.01, 0.2), num('lines', 'Rows in a line', 1, 1, 4)],
		make(P, E) { ribbons(E, P, (y) => { const f = frac(y / P.period); return P.amp * (f < 0.5 ? 4 * f - 1 : 3 - 4 * f); }); },
	},
	ogee: {
		label: 'Ogee',
		params: [mm('spacing', 'Width', 0.03, 0.008, 0.1), num('stretch', 'Height', 1.6, 0.5, 4, 0.05, 'x')],
		make(P, E) { const A = P.spacing / 2, L = P.spacing * P.stretch * 2; ribbons(E, { ...P, lines: 1 }, (y, k) => (k & 1 ? 1 : -1) * A * Math.sin((TAU * y) / L)); },
	},
	trellis: {
		label: 'Trellis',
		params: [mm('spacing', 'Spacing', 0.03, 0.006, 0.12), num('families', 'Directions', 2, 2, 6), deg('skew', 'Angle', 45, 5, 85), num('nodeSize', 'Stones at crossings', 0, 0, 3, 0.1, 'x')],
		make(P, E) {
			const r = E.box.r, s = P.spacing, F = P.families, a0 = (P.skew * Math.PI) / 180, K = Math.ceil(r / s) + 1;
			for (let f = 0; f < F; f++) {
				const a = F === 2 ? (f ? Math.PI - a0 : a0) : a0 + (f * Math.PI) / F, cx = Math.cos(a), sx = Math.sin(a);
				E.cat = f;
				for (let k = -K; k <= K; k++) {
					const ox = -sx * k * s, oy = cx * k * s;
					E.t = (k + K) / (2 * K);
					E.move(ox - cx * r, oy - sx * r).to(ox + cx * r, oy + sx * r);
				}
			}
			if (F === 2 && P.nodeSize > 0) {
				// the crossings of the two families: a lattice of their own
				const a = a0, d = Math.sin(2 * a) || 1, ux = (Math.cos(a) * s) / d, uy = (Math.sin(a) * s) / d;
				lattice(E.box, ux, uy, -ux, uy, (i, j, x, y) => E.add(x, y, rankOf2(i, j), 0, 0, P.nodeSize, 8));
			}
		},
	},
	plaid: {
		label: 'Plaid',
		params: [mm('spacing', 'Size', 0.05, 0.015, 0.15), opt('sett', 'Sett', 'tartan', [['tartan', 'Tartan'], ['madras', 'Madras'], ['windowpane', 'Fine']])],
		make(P, E) {
			const SETT = { tartan: [0, 0.08, 0.16, 0.5, 0.58], madras: [0, 0.1, 0.2, 0.3, 0.62, 0.72], windowpane: [0, 0.5] }[P.sett] ?? [0, 0.5];
			const r = E.box.r, s = P.spacing, K = Math.ceil(r / s) + 1;
			for (let k = -K; k <= K; k++) SETT.forEach((f, l) => {
				const c = (k + f) * s;
				E.cat = l; E.t = (k + K) / (2 * K);
				E.move(c, -r).to(c, r);
				E.move(-r, c).to(r, c);
			});
		},
	},
	circles: {
		label: 'Interlocking circles',
		params: [mm('spacing', 'Spacing', 0.03, 0.008, 0.12), num('overlap', 'Circle size', 0.71, 0.3, 1.5, 0.01, 'x'), opt('cells', 'Laid out', 'square', [['square', 'In rows'], ['hex', 'Staggered']])],
		make(P, E) {
			const s = P.spacing, r = s * P.overlap, B = { ...E.box, x0: E.box.x0 - r, x1: E.box.x1 + r, y0: E.box.y0 - r, y1: E.box.y1 + r };
			const place = (i, j, x, y) => { E.cat = (i + j) & 1; E.t = Math.hypot(x, y) / E.box.r; E.arc(x, y, r); };
			if (P.cells === 'hex') lattice(B, s, 0, s / 2, s * H3, place); else lattice(B, s, 0, 0, s, place);
		},
	},
	scales: {
		label: 'Fish scales',
		params: [mm('spacing', 'Width', 0.03, 0.008, 0.1), num('layers', 'Arcs in each', 2, 1, 5)],
		make(P, E) {
			const s = P.spacing, r = s / 2, B = { ...E.box, x0: E.box.x0 - r, x1: E.box.x1 + r, y0: E.box.y0 - r, y1: E.box.y1 + r };
			lattice(B, s, 0, s / 2, s / 2, (i, j, x, y) => {
				E.t = Math.hypot(x, y) / E.box.r;
				for (let l = 0; l < P.layers; l++) { E.cat = l; E.arc(x, y, r * (1 - l / P.layers), 0, Math.PI); }
			});
		},
	},
	truchet: {
		label: 'Truchet maze',
		params: [mm('spacing', 'Tile size', 0.024, 0.008, 0.08)],
		make(P, E) {
			const s = P.spacing, seed = E.seed;
			lattice(E.box, s, 0, 0, s, (i, j, x, y) => {
				E.cat = (i + j) & 1; E.t = Math.hypot(x, y) / E.box.r;
				if (hash2(i, j, seed) < 0.5) { E.arc(x, y, s / 2, 0, Math.PI / 2); E.arc(x + s, y + s, s / 2, Math.PI, Math.PI * 1.5); }
				else { E.arc(x + s, y, s / 2, Math.PI / 2, Math.PI); E.arc(x, y + s, s / 2, Math.PI * 1.5, TAU); }
			});
		},
	},
	tenprint: {
		label: 'Random diagonals',
		params: [mm('spacing', 'Tile size', 0.018, 0.006, 0.08)],
		make(P, E) {
			const s = P.spacing, seed = E.seed;
			lattice(E.box, s, 0, 0, s, (i, j, x, y) => {
				const up = hash2(i, j, seed) < 0.5;
				E.cat = up ? 1 : 0; E.t = Math.hypot(x, y) / E.box.r;
				if (up) E.seg(x, y, x + s, y + s); else E.seg(x + s, y, x, y + s);
			});
		},
	},
	tile: {
		label: 'Tiling',
		params: [
			opt('tile', 'Tile', 'honeycomb', Object.entries(TILES).map(([k, t]) => [k, t.label])),
			mm('spacing', 'Size', 0.02, 0.004, 0.08), num('nodeSize', 'Stones at the joints', 0, 0, 3, 0.1, 'x'),
		],
		make(P, E) {
			const t = TILES[P.tile] ?? TILES.honeycomb, s = P.spacing, ax = t.a[0] * s, ay = t.a[1] * s, bx = t.b[0] * s, by = t.b[1] * s, m = s * 6;
			const B = { ...E.box, x0: E.box.x0 - m, x1: E.box.x1 + m, y0: E.box.y0 - m, y1: E.box.y1 + m }, nodes = P.nodeSize > 0 ? tileNodes(t) : null;
			lattice(B, ax, ay, bx, by, (i, j, x, y) => {
				E.t = Math.hypot(x, y) / E.box.r;
				t.segs.forEach((g, q) => { E.cat = q; E.seg(x + g[0] * s, y + g[1] * s, x + g[2] * s, y + g[3] * s); });
				if (nodes) for (const n of nodes) E.add(x + n[0] * s, y + n[1] * s, rankOf1(i * 31 + j), 0, E.t, P.nodeSize, 8);
			});
		},
	},
};
