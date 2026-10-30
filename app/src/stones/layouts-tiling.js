// Stone arrangements by symmetry: the 17 wallpaper groups, quasicrystal tilings (Penrose and its
// relatives), star-and-strap tilings, and Voronoi cells. See stones/layouts-lattice.js for what a
// layout is.
import { TAU, hash2, rankOf1 } from './fields.js';
import { mm, num, ratio, stoneRatio, deg, pct, opt, when, along, point, lattice, farT, varied } from './layouts-lattice.js';

const S3 = Math.sqrt(3);

// --- wallpaper groups ------------------------------------------------------------------------------
// Each group: its lattice, and its operations in fractional coordinates as the International Tables
// write them; a centred group repeats them shifted by half a cell.
const LATTICES = { oblique: [[1, 0], [0.32, 0.92]], rect: [[1, 0], [0, 0.72]], square: [[1, 0], [0, 1]], hex: [[1, 0], [-0.5, S3 / 2]] };
const P3 = ['x,y', '-y,x-y', 'y-x,-x'], P6 = ['x,y', 'x-y,x', '-y,x-y', '-x,-y', 'y-x,-x', 'y,y-x'], P4 = ['x,y', '-y,x', '-x,-y', 'y,-x'];
export const WALLPAPER_GROUPS = {
	p1: { lat: 'oblique', ops: ['x,y'], label: 'Drift' },
	p2: { lat: 'oblique', ops: ['x,y', '-x,-y'], label: 'Half turns' },
	pm: { lat: 'rect', ops: ['x,y', '-x,y'], label: 'Mirror rows' },
	pg: { lat: 'rect', ops: ['x,y', '-x,1/2+y'], label: 'Glide steps' },
	cm: { lat: 'rect', centred: true, ops: ['x,y', '-x,y'], label: 'Staggered mirrors' },
	pmm: { lat: 'rect', ops: ['x,y', '-x,-y', '-x,y', 'x,-y'], label: 'Two mirrors' },
	pmg: { lat: 'rect', ops: ['x,y', '-x,-y', '1/2-x,y', '1/2+x,-y'], label: 'Mirror and glide' },
	pgg: { lat: 'rect', ops: ['x,y', '-x,-y', '1/2-x,1/2+y', '1/2+x,1/2-y'], label: 'Two glides' },
	cmm: { lat: 'rect', centred: true, ops: ['x,y', '-x,-y', '-x,y', 'x,-y'], label: 'Staggered two mirrors' },
	p4: { lat: 'square', ops: P4, label: 'Pinwheel' },
	p4m: { lat: 'square', ops: [...P4, '-x,y', 'x,-y', 'y,x', '-y,-x'], label: 'Square kaleidoscope' },
	p4g: { lat: 'square', ops: [...P4, '1/2-x,1/2+y', '1/2+x,1/2-y', '1/2+y,1/2+x', '1/2-y,1/2-x'], label: 'Square weave' },
	p3: { lat: 'hex', ops: P3, label: 'Three turns' },
	p3m1: { lat: 'hex', ops: [...P3, '-y,-x', 'y-x,y', 'x,x-y'], label: 'Triangle kaleidoscope' },
	p31m: { lat: 'hex', ops: [...P3, 'y,x', 'x-y,-y', '-x,y-x'], label: 'Triangle weave' },
	p6: { lat: 'hex', ops: P6, label: 'Six turns' },
	p6m: { lat: 'hex', ops: [...P6, '-y,-x', 'x-y,-y', 'x,x-y', 'y,x', 'y-x,y', '-x,y-x'], label: 'Snowflake' },
};
// 'x-y' -> [cx, cy, c]
function parseTerm(s) {
	let cx = 0, cy = 0, c = 0;
	for (const m of s.matchAll(/([+-]?)(\d+\/\d+|[xy])/g)) {
		const sign = m[1] === '-' ? -1 : 1, t = m[2];
		if (t === 'x') cx += sign; else if (t === 'y') cy += sign;
		else { const [a, b] = t.split('/'); c += (sign * +a) / +b; }
	}
	return [cx, cy, c];
}
// A group as affine maps of the plane: [{ a, b, c, d, e, f, flip }], x' = a x + b y + e, y' = c x + d y + f
// (cell size 1), and its two lattice vectors.
const compiled = new Map();
export function wallpaperOps(name) {
	let G = compiled.get(name);
	if (G) return G;
	const g = WALLPAPER_GROUPS[name] ?? WALLPAPER_GROUPS.p6m, [A, B] = LATTICES[g.lat], det = A[0] * B[1] - A[1] * B[0];
	const toFrac = [B[1] / det, -B[0] / det, -A[1] / det, A[0] / det]; // cartesian -> fractional
	const shifts = g.centred ? [[0, 0], [0.5, 0.5]] : [[0, 0]], ops = [];
	for (const [sx, sy] of shifts) for (const s of g.ops) {
		const [t1, t2] = s.split(','), [c1, c2, c3] = parseTerm(t1), [d1, d2, d3] = parseTerm(t2);
		// cartesian linear part: basis * op * inverse basis
		const m00 = c1 * toFrac[0] + c2 * toFrac[2], m01 = c1 * toFrac[1] + c2 * toFrac[3], m10 = d1 * toFrac[0] + d2 * toFrac[2], m11 = d1 * toFrac[1] + d2 * toFrac[3];
		ops.push({
			a: A[0] * m00 + B[0] * m10, b: A[0] * m01 + B[0] * m11, c: A[1] * m00 + B[1] * m10, d: A[1] * m01 + B[1] * m11,
			e: A[0] * (c3 + sx) + B[0] * (d3 + sy), f: A[1] * (c3 + sx) + B[1] * (d3 + sy),
		});
	}
	G = { ops, a: A, b: B };
	compiled.set(name, G);
	return G;
}

// The motif a group repeats, in units of the cell: strokes (each a list of points, its stones laid as a
// run with a stone at each end) and single stones [x, y, angle, k].
function motifShape(P, seed) {
	const sz = P.motifSize, kind = P.motif, strokes = [], dots = [];
	const stroke = (fn, steps = 12) => { const pts = []; for (let i = 0; i <= steps; i++) pts.push(fn(i / steps)); strokes.push(pts); };
	if (kind === 'dot') dots.push([0, 0, 0, 1]);
	else if (kind === 'petal') { stroke((t) => [t * sz, Math.sin(t * Math.PI) * sz * 0.28]); stroke((t) => [t * sz, -Math.sin(t * Math.PI) * sz * 0.28]); }
	else if (kind === 'comma') stroke((t) => { const a = t * 4.4, r = sz * (0.12 + 0.88 * t); return [r * Math.cos(a), r * Math.sin(a)]; }, 20);
	else if (kind === 'arrow') { stroke((t) => [t * sz, 0], 2); stroke((t) => [sz - t * sz * 0.4, t * sz * 0.4], 2); stroke((t) => [sz - t * sz * 0.4, -t * sz * 0.4], 2); }
	else if (kind === 'ring') { const pts = []; for (let i = 0; i <= 24; i++) pts.push([sz * 0.5 * Math.cos((i / 24) * TAU), sz * 0.5 * Math.sin((i / 24) * TAU)]); strokes.push(pts); strokes[0].closed = true; }
	else if (kind === 'leaf') { stroke((t) => [t * sz, 0], 2); for (const sgn of [1, -1]) stroke((t) => [t * sz, sgn * Math.sin(t * Math.PI) * sz * 0.34 * (1 - t * 0.4)]); }
	else { // seeds: a few stones of the seed's choosing, their sizes too
		const n = Math.max(1, Math.round(P.motifCount ?? 5));
		for (let i = 0; i < n; i++) dots.push([(hash2(i, 1, seed) - 0.5) * sz, (hash2(i, 2, seed) - 0.5) * sz, hash2(i, 3, seed) * TAU, varied(hash2(i, 4, seed), 0.7)]);
	}
	const a = (P.motifTurn * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), ox = P.motifX, oy = P.motifY, place = ([x, y]) => [ox + c * x - s * y, oy + s * x + c * y];
	return {
		strokes: strokes.map((pts) => { const q = pts.map(place); q.closed = pts.closed; return q; }),
		dots: dots.map(([x, y, an, k]) => { const [u, v] = place([x, y]); return [u, v, an + a, k]; }),
	};
}

// --- quasicrystals: de Bruijn's multigrid ------------------------------------------------------------
function multigrid(P, E) {
	const fold = P.fold, F = fold % 2 ? fold : fold / 2, s = P.spacing, r = E.box.r;
	const ex = [], ey = [], gam = [];
	let sum = 0;
	// (no variation at all lines every grid up through one point, which no rhombs can tile)
	for (let j = 0; j < F; j++) { const a = (TAU * j) / fold; ex.push(Math.cos(a)); ey.push(Math.sin(a)); const g = (hash2(j, 11, E.seed) - 0.5) * Math.max(P.phase ?? 1, 0.02); gam.push(g); sum += g; }
	for (let j = 0; j < F; j++) gam[j] -= sum / F; // sums to zero: a true Penrose tiling at 5
	const K = Math.ceil((2 * r) / (F * s)) + 2, K_ = new Float64Array(F), lim = (r / s) * 1.2;
	const vertexKey = (x, y) => Math.round(x * 2000) * 1e7 + Math.round(y * 2000);
	// the rhombs: every corner counts how many meet there, every edge once
	const corners = new Map(), edges = new Map();
	const corner = (x, y, cat) => { const key = vertexKey(x, y), c = corners.get(key); if (c) c[2]++; else corners.set(key, [x, y, 1, cat]); return key; };
	const edge = (a, b, x0, y0, x1, y1, cat) => { const key = vertexKey((x0 + x1) / 2, (y0 + y1) / 2); if (!edges.has(key)) edges.set(key, [a, b, cat]); };
	for (let j = 0; j < F; j++) for (let l = j + 1; l < F; l++) {
		const det = ex[j] * ey[l] - ey[j] * ex[l];
		if (Math.abs(det) < 1e-6) continue;
		for (let kj = -K; kj <= K; kj++) for (let kl = -K; kl <= K; kl++) {
			const a = kj + gam[j], b = kl + gam[l], px = (a * ey[l] - b * ey[j]) / det, py = (b * ex[j] - a * ex[l]) / det;
			let vx = 0, vy = 0;
			for (let i = 0; i < F; i++) {
				const ki = i === j ? kj : i === l ? kl : Math.ceil(px * ex[i] + py * ey[i] - gam[i]);
				K_[i] = ki; vx += ki * ex[i]; vy += ki * ey[i];
			}
			if (Math.abs(vx) > lim || Math.abs(vy) > lim) continue;
			// either side of a grid line, K is k or k + 1 (K = ceil(x.e - gamma)): the four corners of the rhomb
			const cat = l - j, x1 = vx + ex[j], y1 = vy + ey[j], x2 = vx + ex[l], y2 = vy + ey[l], x3 = x1 + ex[l], y3 = y1 + ey[l];
			const c0 = corner(vx, vy, cat), c1 = corner(x1, y1, cat), c2 = corner(x2, y2, cat), c3 = corner(x3, y3, cat);
			edge(c0, c1, vx, vy, x1, y1, cat); edge(c0, c2, vx, vy, x2, y2, cat); edge(c1, c3, x1, y1, x3, y3, cat); edge(c2, c3, x2, y2, x3, y3, cat);
		}
	}
	// a corner where many rhombs meet (the middle of a star) is a bigger stone, by how many
	const kOf = (c) => 1 + P.valence * Math.max(0, c[2] - 3) * 0.32;
	const alone = P.draw !== 'edges'; // (corners and nothing else thin over the whole range, the stars of them last)
	for (const c of corners.values()) E.key(c[0] * s, c[1] * s, 0, Math.hypot(c[0], c[1]) * (s / 0.35), kOf(c), c[3], Math.max(0, 12 - c[2]), alone ? hash2(Math.round(c[0] * 1e3), Math.round(c[1] * 1e3), 3) * Math.max(0.3, 1.3 - c[2] * 0.1) : -1);
	if (P.draw === 'edges') {
		for (const [a, b, cat] of edges.values()) {
			const p = corners.get(a), q = corners.get(b);
			E.cat = cat; E.t = Math.hypot(p[0], p[1]) * (s / 0.35);
			// (their stones are already there: the run only needs to know how big, to keep clear of them)
			E.jk = kOf(p);
			E.seg(p[0] * s, p[1] * s, q[0] * s, q[1] * s, true, true, kOf(q));
		}
	}
}

// --- star-and-strap (Hankin's polygons in contact) -----------------------------------------------------
// The regular polygons of a cell, side 1: [n, circumradius, cx, cy, rotation].
const H8 = 1 + Math.SQRT2, R8 = 1 / (2 * Math.sin(Math.PI / 8)), A12 = 1 / (2 * Math.tan(Math.PI / 12)), R12 = 1 / (2 * Math.sin(Math.PI / 12)), RT = 1 / S3;
export const STAR_TILINGS = {
	hex: { label: 'Hexagons', a: [S3, 0], b: [S3 / 2, 1.5], polys: [[6, 1, 0, 0, Math.PI / 2]] },
	square: { label: 'Squares', a: [1, 0], b: [0, 1], polys: [[4, Math.SQRT1_2, 0, 0, Math.PI / 4]] },
	octagon: { label: 'Octagons', a: [H8, 0], b: [0, H8], polys: [[8, R8, 0, 0, Math.PI / 8], [4, Math.SQRT1_2, H8 / 2, H8 / 2, 0]] },
	trihex: { label: 'Hexagons + triangles', a: [2, 0], b: [1, S3], polys: [[6, 1, 0, 0, 0], [3, RT, 1, RT, Math.PI / 6], [3, RT, 1, -RT, Math.PI / 2]] },
	dodeca: { label: 'Dodecagons', a: [2 * A12, 0], b: [A12, S3 * A12], polys: [[12, R12, 0, 0, Math.PI / 12], [3, RT, A12, A12 / S3, Math.PI / 6], [3, RT, A12, -A12 / S3, -Math.PI / 6]] },
};
function stars(P, E) {
	const T = STAR_TILINGS[P.tiling] ?? STAR_TILINGS.hex, s = P.spacing, th = (P.contact * Math.PI) / 180;
	// one star's struts, in cell units: from an edge's middle to where it meets its neighbour's strut
	const struts = [];
	for (const [n, R, cx, cy, rot] of T.polys) {
		const V = Array.from({ length: n }, (_, k) => [cx + R * Math.cos(rot + (k * TAU) / n), cy + R * Math.sin(rot + (k * TAU) / n)]);
		const mids = V.map((v, k) => { const w = V[(k + 1) % n]; return [(v[0] + w[0]) / 2, (v[1] + w[1]) / 2, w[0] - v[0], w[1] - v[1]]; });
		for (let k = 0; k < n; k++) {
			const m = mids[k], o = mids[(k + 1) % n], l = Math.hypot(m[2], m[3]), ux = m[2] / l, uy = m[3] / l, nx = -uy, ny = ux;
			const dx = Math.cos(th) * ux + Math.sin(th) * nx, dy = Math.cos(th) * uy + Math.sin(th) * ny;
			const l2 = Math.hypot(o[2], o[3]), vx = o[2] / l2, vy = o[3] / l2, n2x = -vy, n2y = vx;
			const ex = -Math.cos(th) * vx + Math.sin(th) * n2x, ey = -Math.cos(th) * vy + Math.sin(th) * n2y;
			const det = dx * -ey + ex * dy, rx = o[0] - m[0], ry = o[1] - m[1], t = det ? (rx * -ey + ex * ry) / det : 0;
			const X = m[0] + dx * t, Y = m[1] + dy * t;
			struts.push([m[0], m[1], X, Y, n], [X, Y, o[0], o[1], n]);
		}
	}
	const ax = T.a[0] * s, ay = T.a[1] * s, bx = T.b[0] * s, by = T.b[1] * s, m = s * 3, B = { ...E.box, x0: E.box.x0 - m, x1: E.box.x1 + m, y0: E.box.y0 - m, y1: E.box.y1 + m };
	const star = E.stamped((C, x, y) => {
		for (let q = 0; q < struts.length; q += 2) {
			const a = struts[q], b = struts[q + 1];
			C.cat = a[4] === T.polys[0][0] ? 0 : 1;
			// the star's point in the middle of two struts is the stone that draws the eye; the strut's far ends meet the next star
			C.jk = P.nodeSize; C.jpri = 0;
			C.begin(x + a[2] * s, y + a[3] * s, true);
			C.to(x + a[0] * s, y + a[1] * s);
			C.jk = P.waist; C.jpri = 1;
			C.end(true);
			C.jk = P.nodeSize; C.jpri = 0;
			C.begin(x + b[0] * s, y + b[1] * s, true);
			C.to(x + b[2] * s, y + b[3] * s);
			C.jk = P.waist; C.jpri = 1;
			C.end(true);
		}
	});
	lattice(B, ax, ay, bx, by, (i, j, x, y) => { E.t = farT(x, y); E.cat = 0; star(x, y); });
	E.jpri = 0;
}

// --- Voronoi cells ------------------------------------------------------------------------------------
function voronoi(P, E) {
	const s = P.spacing, seed = E.seed, J = P.jitterCells, B = E.box;
	const site = (i, j) => [(i + 0.5 + (hash2(i, j, seed) - 0.5) * J) * s, (j + 0.5 + (hash2(i, j, seed + 1) - 0.5) * J) * s];
	const i0 = Math.floor(B.x0 / s) - 1, i1 = Math.floor(B.x1 / s) + 1, j0 = Math.floor(B.y0 / s) - 1, j1 = Math.floor(B.y1 / s) + 1;
	if ((i1 - i0) * (j1 - j0) > 8000) return;
	E.jk = P.nodeSize;
	for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
		const [cx, cy] = site(i, j), big = s * 4;
		let inr = big;
		// the cell: a big square clipped by the bisector with each near site; each edge remembers whose
		let poly = [[cx - big, cy - big, -1], [cx + big, cy - big, -1], [cx + big, cy + big, -1], [cx - big, cy + big, -1]];
		for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
			if (!di && !dj) continue;
			const id = (i + di) * 65536 + (j + dj), [ox, oy] = site(i + di, j + dj), nx = ox - cx, ny = oy - cy, mx = (ox + cx) / 2, my = (oy + cy) / 2, out = [];
			inr = Math.min(inr, Math.hypot(nx, ny) / 2);
			for (let k = 0; k < poly.length; k++) {
				const a = poly[k], b = poly[(k + 1) % poly.length], da = (a[0] - mx) * nx + (a[1] - my) * ny, db = (b[0] - mx) * nx + (b[1] - my) * ny;
				if (da <= 0) out.push(a);
				if ((da < 0) !== (db < 0) && da !== db) {
					const t = da / (da - db), q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0];
					// from here to the next point: the new edge if we are leaving the half-plane, else a's
					q[2] = da < 0 ? id : a[2];
					out.push(q);
				}
			}
			poly = out;
			if (poly.length < 3) break;
		}
		const me = i * 65536 + j;
		E.t = farT(cx, cy); E.cat = (i & 1) + 2 * (j & 1);
		for (let k = 0; k < poly.length; k++) {
			const a = poly[k], b = poly[(k + 1) % poly.length];
			if (a[2] > me) E.seg(a[0], a[1], b[0], b[1]);
		}
		// a gem in the cell, as big as the cell has room for
		if (P.gem > 0) E.key(cx, cy, 0, E.t, Math.max(0.3, (P.gem * 2 * inr) / (E.d0 * E.gap)), E.cat, 3);
	}
}

export const TILING_LAYOUTS = {
	wallpaper: {
		label: 'Wallpaper group', random: (P) => P.motif === 'seeds',
		params: [
			opt('group', 'Symmetry', 'p6m', Object.entries(WALLPAPER_GROUPS).map(([k, g]) => [k, g.label + ' · ' + k])),
			mm('spacing', 'Cell size', 0.06, 0.012, 0.16),
			opt('motif', 'Motif', 'petal', [['petal', 'Petal'], ['leaf', 'Leaf'], ['comma', 'Comma'], ['arrow', 'Arrow'], ['ring', 'Ring'], ['dot', 'Dot'], ['seeds', 'Random']]),
			when(ratio('motifSize', 'Motif size', 0.36, 0.05, 0.9), (P) => P.motif !== 'dot'), ratio('motifX', 'Motif across', 0.18, -0.5, 0.5, 0.005), ratio('motifY', 'Motif up', 0.08, -0.5, 0.5, 0.005),
			when(deg('motifTurn', 'Motif turn', 20), (P) => P.motif !== 'dot'), when(num('motifCount', 'Random stones', 5, 1, 20), (P) => P.motif === 'seeds'),
			when(pct('taper', 'Taper along the motif', 0.45, -1, 0.85), (P) => P.motif !== 'dot' && P.motif !== 'seeds' && P.motif !== 'ring'),
			when(stoneRatio('nodeSize', 'Stones at its ends', 1.25, 1, 3.5), (P) => P.motif !== 'dot' && P.motif !== 'seeds' && P.motif !== 'ring'),
			when(stoneRatio('dotSize', 'Dot size', 1.5, 0.4, 4), (P) => P.motif === 'dot'),
		],
		grips: [
			along('spacing', [1, 0], 'Cell size'),
			// the motif itself: where it sits in its cell
			point((P) => [P.motifX * P.spacing, P.motifY * P.spacing], (P, x, y) => ({ motifX: Math.max(-0.5, Math.min(0.5, x / P.spacing)), motifY: Math.max(-0.5, Math.min(0.5, y / P.spacing)) }), 'Motif: drag it about in its cell'),
		],
		make(P, E) {
			const G = wallpaperOps(P.group), L = P.spacing, M = motifShape(P, E.seed), kEnd = Math.max(0.15, 1 - (P.taper ?? 0)), kDot = P.motif === 'dot' ? P.dotSize : 1;
			// the motif under each operation, in metres from its cell
			const placed = G.ops.map((o) => {
				const map = ([x, y]) => [(o.a * x + o.b * y + o.e) * L, (o.c * x + o.d * y + o.f) * L];
				const flat = (a) => { const dx = Math.cos(a), dy = Math.sin(a); return Math.atan2(o.c * dx + o.d * dy, o.a * dx + o.b * dy); };
				return { strokes: M.strokes.map((pts) => { const q = pts.map(map); q.closed = pts.closed; return q; }), dots: M.dots.map(([x, y, an, k]) => { const [u, v] = map([x, y]); return [u, v, flat(an), k * kDot]; }) };
			});
			const m = L * 1.8, B = { ...E.box, x0: E.box.x0 - m, x1: E.box.x1 + m, y0: E.box.y0 - m, y1: E.box.y1 + m };
			E.jk = P.nodeSize;
			// the motif under one operation; each comes and goes whole, as a density thins it
			const stamps = placed.map(({ strokes, dots }) => E.stamped((T, x, y) => {
				for (const s of dots) T.add(x + s[0], y + s[1], T.unit, s[2], T.t, s[3]);
				for (const pts of strokes) {
					const n = pts.length - 1;
					T.k = 1; T.jk = P.nodeSize;
					T.begin(x + pts[0][0], y + pts[0][1], !pts.closed);
					if (pts.closed) { for (let v = 1; v <= n; v++) T.to(x + pts[v][0], y + pts[v][1]); T.end(false, true); continue; }
					for (let v = 1; v <= n; v++) { T.k = 1 + (kEnd - 1) * (v / n); T.to(x + pts[v][0], y + pts[v][1]); }
					T.jk = P.nodeSize * kEnd;
					T.end(true);
				}
			}));
			lattice(B, G.a[0] * L, G.a[1] * L, G.b[0] * L, G.b[1] * L, (i, j, x, y) => {
				E.t = farT(x, y);
				for (let q = 0; q < stamps.length; q++) { E.cat = q; E.unit = rankOf1(i * 37 + j * 101 + q * 7); stamps[q](x, y); }
			});
			E.k = 1; E.unit = -1; E.jk = P.nodeSize;
		},
	},
	quasicrystal: {
		label: 'Quasicrystal',
		heavy: true, random: true, points: (P) => P.draw !== 'edges',
		params: [num('fold', 'Fold', 5, 5, 16), mm('spacing', 'Tile size', 0.016, 0.005, 0.06), opt('draw', 'Stones on', 'edges', [['edges', 'Edges'], ['vertices', 'Corners']]), num('phase', 'Variation', 1, 0, 3, 0.01, 'x'), pct('valence', 'Bigger where more meet', 0.4, 0, 1.5)],
		grips: [along('spacing', [1, 0], 'Tile size')],
		make: multigrid,
	},
	stars: {
		label: 'Star and strap',
		params: [opt('tiling', 'Built on', 'hex', Object.entries(STAR_TILINGS).map(([k, t]) => [k, t.label])), mm('spacing', 'Size', 0.03, 0.008, 0.1), num('contact', 'Star sharpness', 62, 20, 85, 0.5, 'deg'), stoneRatio('nodeSize', 'Stones at the points', 1.5, 1, 4), stoneRatio('waist', 'Stones where stars meet', 1, 1, 3)],
		grips: [along('spacing', [1, 0], 'Size')],
		make: stars,
	},
	voronoi: {
		label: 'Stained glass',
		heavy: true, random: true,
		params: [mm('spacing', 'Cell size', 0.028, 0.008, 0.1), pct('jitterCells', 'Irregular', 0.85), stoneRatio('nodeSize', 'Stones at the joints', 1.15, 1, 3.5), pct('gem', 'Gem in each cell', 0, 0, 0.9)],
		grips: [along('spacing', [1, 0], 'Cell size')],
		make: voronoi,
	},
};
