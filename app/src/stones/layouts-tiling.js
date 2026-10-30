// Stone arrangements by symmetry: the 17 wallpaper groups, quasicrystal tilings (Penrose and its
// relatives), star-and-strap tilings, and Voronoi cells. See stones/layouts-lattice.js for what a
// layout is.
import { TAU, hash2, rankOf1 } from './fields.js';
import { mm, num, deg, pct, opt, lattice } from './layouts-lattice.js';

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

// The motif a group repeats, in units of the cell, as stones [x, y, angle]. Line motifs lay one stone
// every `pitch` (pitch also in cells).
function motifStones(P, pitch, seed) {
	const out = [], sz = P.motifSize, kind = P.motif;
	const stroke = (fn, steps = 40) => {
		let [px, py] = fn(0), rest = pitch / 2;
		for (let i = 1; i <= steps; i++) {
			const [x, y] = fn(i / steps), dx = x - px, dy = y - py, l = Math.hypot(dx, dy);
			let s = rest;
			while (s <= l) { out.push([px + (dx / l) * s, py + (dy / l) * s, Math.atan2(dy, dx)]); s += pitch; }
			rest = s - l; px = x; py = y;
		}
	};
	if (kind === 'dot') out.push([0, 0, 0]);
	else if (kind === 'petal') { stroke((t) => [t * sz, Math.sin(t * Math.PI) * sz * 0.28]); stroke((t) => [t * sz, -Math.sin(t * Math.PI) * sz * 0.28]); }
	else if (kind === 'comma') stroke((t) => { const a = t * 4.4, r = sz * (0.12 + 0.88 * t); return [r * Math.cos(a), r * Math.sin(a)]; }, 60);
	else if (kind === 'arrow') { stroke((t) => [t * sz, 0]); stroke((t) => [sz - t * sz * 0.4, t * sz * 0.4]); stroke((t) => [sz - t * sz * 0.4, -t * sz * 0.4]); }
	else if (kind === 'ring') stroke((t) => [sz * 0.5 * Math.cos(t * TAU), sz * 0.5 * Math.sin(t * TAU)], 48);
	else if (kind === 'leaf') { stroke((t) => [t * sz, 0]); for (const sgn of [1, -1]) stroke((t) => [t * sz, sgn * Math.sin(t * Math.PI) * sz * 0.34 * (1 - t * 0.4)]); }
	else { // seeds: a few stones of the seed's choosing
		const n = Math.max(1, Math.round(P.motifCount ?? 5));
		for (let i = 0; i < n; i++) out.push([(hash2(i, 1, seed) - 0.5) * sz, (hash2(i, 2, seed) - 0.5) * sz, hash2(i, 3, seed) * TAU]);
	}
	const a = (P.motifTurn * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), ox = P.motifX, oy = P.motifY;
	return out.map(([x, y, an]) => [ox + c * x - s * y, oy + s * x + c * y, an + a]);
}

// --- quasicrystals: de Bruijn's multigrid ------------------------------------------------------------
function multigrid(P, E) {
	const fold = P.fold, F = fold % 2 ? fold : fold / 2, s = P.spacing, r = E.box.r;
	const ex = [], ey = [], gam = [];
	let sum = 0;
	for (let j = 0; j < F; j++) { const a = (TAU * j) / fold; ex.push(Math.cos(a)); ey.push(Math.sin(a)); const g = (hash2(j, 11, E.seed) - 0.5) * (P.phase ?? 1); gam.push(g); sum += g; }
	for (let j = 0; j < F; j++) gam[j] -= sum / F; // sums to zero: a true Penrose tiling at 5
	const K = Math.ceil((2 * r) / (F * s)) + 2, seen = new Set(), edges = P.draw === 'edges', K_ = new Float64Array(F);
	const vertexKey = (x, y) => Math.round(x * 2000) * 1e7 + Math.round(y * 2000);
	const emit = (x, y, cat) => { const key = vertexKey(x, y); if (seen.has(key)) return; seen.add(key); E.add(x * s, y * s, rankOf1(Math.abs(key) % 100003), 0, Math.hypot(x, y) * s / r, 1, cat); };
	const emitEdge = (x0, y0, x1, y1, cat) => { const key = vertexKey((x0 + x1) / 2, (y0 + y1) / 2); if (seen.has(key)) return; seen.add(key); E.cat = cat; E.t = Math.hypot(x0, y0) * s / r; E.seg(x0 * s, y0 * s, x1 * s, y1 * s); };
	const lim = (r / s) * 1.2;
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
			if (edges) { emitEdge(vx, vy, x1, y1, cat); emitEdge(vx, vy, x2, y2, cat); emitEdge(x1, y1, x3, y3, cat); emitEdge(x2, y2, x3, y3, cat); }
			else { emit(vx, vy, cat); emit(x1, y1, cat); emit(x2, y2, cat); emit(x3, y3, cat); }
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
	lattice(B, ax, ay, bx, by, (i, j, x, y) => {
		E.t = Math.hypot(x, y) / E.box.r;
		for (const q of struts) { E.cat = q[4] === T.polys[0][0] ? 0 : 1; E.seg(x + q[0] * s, y + q[1] * s, x + q[2] * s, y + q[3] * s); }
	});
}

// --- Voronoi cells ------------------------------------------------------------------------------------
function voronoi(P, E) {
	const s = P.spacing, seed = E.seed, J = P.jitterCells, B = E.box;
	const site = (i, j) => [(i + 0.5 + (hash2(i, j, seed) - 0.5) * J) * s, (j + 0.5 + (hash2(i, j, seed + 1) - 0.5) * J) * s];
	const i0 = Math.floor(B.x0 / s) - 1, i1 = Math.floor(B.x1 / s) + 1, j0 = Math.floor(B.y0 / s) - 1, j1 = Math.floor(B.y1 / s) + 1;
	if ((i1 - i0) * (j1 - j0) > 8000) return;
	for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
		const [cx, cy] = site(i, j), big = s * 4;
		// the cell: a big square clipped by the bisector with each near site; each edge remembers whose
		let poly = [[cx - big, cy - big, -1], [cx + big, cy - big, -1], [cx + big, cy + big, -1], [cx - big, cy + big, -1]];
		for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
			if (!di && !dj) continue;
			const id = (i + di) * 65536 + (j + dj), [ox, oy] = site(i + di, j + dj), nx = ox - cx, ny = oy - cy, mx = (ox + cx) / 2, my = (oy + cy) / 2, out = [];
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
		E.t = Math.hypot(cx, cy) / B.r; E.cat = (i & 1) + 2 * (j & 1);
		for (let k = 0; k < poly.length; k++) {
			const a = poly[k], b = poly[(k + 1) % poly.length];
			if (a[2] > me) E.seg(a[0], a[1], b[0], b[1]);
		}
	}
}

export const TILING_LAYOUTS = {
	wallpaper: {
		label: 'Wallpaper group',
		params: [
			opt('group', 'Symmetry', 'p6m', Object.entries(WALLPAPER_GROUPS).map(([k, g]) => [k, g.label + ' · ' + k])),
			mm('spacing', 'Cell size', 0.06, 0.012, 0.16),
			opt('motif', 'Motif', 'petal', [['petal', 'Petal'], ['leaf', 'Leaf'], ['comma', 'Comma'], ['arrow', 'Arrow'], ['ring', 'Ring'], ['dot', 'Dot'], ['seeds', 'Random']]),
			num('motifSize', 'Motif size', 0.36, 0.05, 0.9, 0.01, 'x'), num('motifX', 'Motif across', 0.18, -0.5, 0.5, 0.005, 'x'), num('motifY', 'Motif up', 0.08, -0.5, 0.5, 0.005, 'x'),
			deg('motifTurn', 'Motif turn', 20), num('motifCount', 'Random stones', 5, 1, 20),
		],
		make(P, E) {
			const G = wallpaperOps(P.group), L = P.spacing, stones = motifStones(P, E.pitch / L, E.seed);
			const placed = G.ops.map((o) => stones.map(([x, y, an]) => {
				const dx = Math.cos(an), dy = Math.sin(an);
				return [(o.a * x + o.b * y + o.e) * L, (o.c * x + o.d * y + o.f) * L, Math.atan2(o.c * dx + o.d * dy, o.a * dx + o.b * dy)];
			}));
			const m = L * 1.8, B = { ...E.box, x0: E.box.x0 - m, x1: E.box.x1 + m, y0: E.box.y0 - m, y1: E.box.y1 + m };
			lattice(B, G.a[0] * L, G.a[1] * L, G.b[0] * L, G.b[1] * L, (i, j, x, y) => {
				const t = Math.hypot(x, y) / E.box.r;
				placed.forEach((list, q) => { for (let k = 0; k < list.length; k++) { const s = list[k]; E.add(x + s[0], y + s[1], rankOf1(i * 37 + j * 101 + k * 7 + q), s[2], t, 1, q); } });
			});
		},
	},
	quasicrystal: {
		label: 'Quasicrystal',
		heavy: true,
		params: [num('fold', 'Fold', 5, 5, 16), mm('spacing', 'Tile size', 0.016, 0.005, 0.06), opt('draw', 'Stones on', 'edges', [['edges', 'Edges'], ['vertices', 'Corners']]), num('phase', 'Variation', 1, 0, 3, 0.01, 'x')],
		make: multigrid,
	},
	stars: {
		label: 'Star and strap',
		params: [opt('tiling', 'Built on', 'hex', Object.entries(STAR_TILINGS).map(([k, t]) => [k, t.label])), mm('spacing', 'Size', 0.03, 0.008, 0.1), num('contact', 'Star sharpness', 62, 20, 85, 0.5, 'deg')],
		make: stars,
	},
	voronoi: {
		label: 'Stained glass',
		heavy: true,
		params: [mm('spacing', 'Cell size', 0.028, 0.008, 0.1), pct('jitterCells', 'Irregular', 0.85)],
		make: voronoi,
	},
};
