// Stone arrangements from fields and rules: lines of equal value of a field (contour maps, Chladni
// figures, wave interference), or the field itself as a halftone of stones; flow lines, the edge of the
// piece, curves grown by rules (Hilbert, dragon, Gosper), fractal dusts and circle packings. A fractal's
// sizes come from the fractal: what appears early is big, what each generation adds smaller, down to what
// its spaces leave room for. See stones/layouts-lattice.js for what a layout is.
import { TAU, hash2, rankOf1, rankOf2, fbm, noise2, clamp01 } from './fields.js';
import { mm, num, ratio, deg, pct, opt, when, along, radius, point, lattice } from './layouts-lattice.js';

// Lines of equal value of f over the box (marching squares), chained and laid out with the pen.
// levels: the values; step: grid size (metres); kOfLevel: each line's own size.
const scratch = { val: new Float32Array(0), link: new Int32Array(0), px: new Float32Array(0), py: new Float32Array(0), mark: new Uint8Array(0) };
function isolines(E, f, levels, step, kOfLevel = null) {
	step = Math.max(step, Math.sqrt(((E.box.x1 - E.box.x0) * (E.box.y1 - E.box.y0)) / 90000));
	const anchorReach = E.pitch * 6;
	// its grid on whole steps from the pattern's origin: a line drawn on it does not change with the box
	const B = { x0: Math.floor(E.box.x0 / step) * step, y0: Math.floor(E.box.y0 / step) * step, x1: E.box.x1, y1: E.box.y1 };
	const nx = Math.ceil((B.x1 - B.x0) / step) + 2, ny = Math.ceil((B.y1 - B.y0) / step) + 2, N = nx * ny, ids = 2 * N;
	if (scratch.val.length < N) { scratch.val = new Float32Array(N); scratch.link = new Int32Array(ids * 2); scratch.px = new Float32Array(ids); scratch.py = new Float32Array(ids); scratch.mark = new Uint8Array(ids); }
	const { val, link, px, py, mark } = scratch;
	for (let j = 0, q = 0; j < ny; j++) for (let i = 0; i < nx; i++, q++) val[q] = f(B.x0 + i * step, B.y0 + j * step);
	const touched = [];
	levels.forEach((lev, li) => {
		touched.length = 0;
		// grid edge ids: horizontal from node (i, j) = q, vertical = N + q
		const cross = (id, q0, q1, x0, y0, dx, dy) => {
			if (mark[id] === 0) {
				const t = (lev - val[q0]) / (val[q1] - val[q0]);
				px[id] = x0 + dx * t; py[id] = y0 + dy * t;
				mark[id] = 1; link[id * 2] = -1; link[id * 2 + 1] = -1; touched.push(id);
			}
		};
		const join = (a, b) => { if (link[a * 2] < 0) link[a * 2] = b; else link[a * 2 + 1] = b; if (link[b * 2] < 0) link[b * 2] = a; else link[b * 2 + 1] = a; };
		for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
			const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
			const m = (val[a] > lev ? 1 : 0) | (val[b] > lev ? 2 : 0) | (val[c] > lev ? 4 : 0) | (val[d] > lev ? 8 : 0);
			if (m === 0 || m === 15) continue;
			const x = B.x0 + i * step, y = B.y0 + j * step;
			const bot = a, top = c, lef = N + a, rig = N + b;
			if (((m & 1) !== 0) !== ((m & 2) !== 0)) cross(bot, a, b, x, y, step, 0);
			if (((m & 4) !== 0) !== ((m & 8) !== 0)) cross(top, c, d, x, y + step, step, 0);
			if (((m & 1) !== 0) !== ((m & 4) !== 0)) cross(lef, a, c, x, y, 0, step);
			if (((m & 2) !== 0) !== ((m & 8) !== 0)) cross(rig, b, d, x + step, y, 0, step);
			switch (m) {
				case 1: case 14: join(bot, lef); break;
				case 2: case 13: join(bot, rig); break;
				case 4: case 11: join(top, lef); break;
				case 8: case 7: join(top, rig); break;
				case 3: case 12: join(lef, rig); break;
				case 5: case 10: join(bot, top); break;
				case 6: if ((val[a] + val[b] + val[c] + val[d]) / 4 > lev) { join(bot, lef); join(top, rig); } else { join(bot, rig); join(top, lef); } break;
				case 9: if ((val[a] + val[b] + val[c] + val[d]) / 4 > lev) { join(bot, rig); join(top, lef); } else { join(bot, lef); join(top, rig); } break;
			}
		}
		E.cat = li % 16; E.t = levels.length > 1 ? li / (levels.length - 1) : 0;
		if (kOfLevel) E.k = kOfLevel(li);
		// walk: open lines from their ends, then the closed ones
		const line = [];
		const walk = (start, closed) => {
			line.length = 0;
			mark[start] = 2;
			let cur = start;
			for (;;) {
				line.push(px[cur], py[cur]);
				const n0 = link[cur * 2], n1 = link[cur * 2 + 1], nxt = n0 >= 0 && mark[n0] === 1 ? n0 : n1 >= 0 && mark[n1] === 1 ? n1 : -1;
				if (nxt < 0) break;
				mark[nxt] = 2;
				cur = nxt;
			}
			layLine(E, line, closed, anchorReach);
		};
		for (const id of touched) if (mark[id] === 1 && link[id * 2 + 1] < 0) walk(id, false);
		for (const id of touched) if (mark[id] === 1) walk(id, true);
		for (const id of touched) mark[id] = 0;
	});
	E.k = 1;
}

// A line laid in stretches between anchors, so its stones lie the same however far along it was begun: as a pattern
// moves, a line that the box cuts off elsewhere keeps them. An anchor is a place on it whose number (from where it is)
// beats every other within `reach` along the line, which only its own stretch of the line decides. line: [x, y...]
function layLine(E, line, closed, reach) {
	const n = line.length / 2;
	if (n < 2) return;
	const h = new Float64Array(n), len = new Float64Array(n);
	for (let i = 0; i < n; i++) {
		const j = (i + 1) % n;
		h[i] = hash2(Math.round(line[i * 2] * 2e4), Math.round(line[i * 2 + 1] * 2e4), 91);
		len[i] = Math.hypot(line[j * 2] - line[i * 2], line[j * 2 + 1] - line[i * 2 + 1]);
	}
	const isAnchor = (i) => {
		for (let d = 0, j = i, k = 0; k < n; k++) { // forwards
			if (!closed && j >= n - 1) break;
			d += len[j]; j = (j + 1) % n;
			if (d > reach) break;
			if (h[j] > h[i]) return false;
		}
		for (let d = 0, j = i, k = 0; k < n; k++) { // backwards
			if (!closed && j <= 0) break;
			j = (j - 1 + n) % n; d += len[j];
			if (d > reach) break;
			if (h[j] > h[i]) return false;
		}
		return true;
	};
	let first = 0;
	if (closed) {
		first = -1;
		for (let i = 0; i < n && first < 0; i++) if (isAnchor(i)) first = i;
		if (first < 0) first = 0;
	}
	E.begin(line[first * 2], line[first * 2 + 1], false);
	const steps = closed ? n : n - 1;
	for (let s = 1; s <= steps; s++) {
		const i = (first + s) % n;
		E.to(line[i * 2], line[i * 2 + 1]);
		if (s < steps && isAnchor(i)) E.corner(false);
	}
	E.end(false);
}

// The field itself as a halftone: a lattice of stones, each as big as the field is strong there. f: -1..1.
function halftone(E, f, P) {
	const s = P.dots, kMin = 0.35, kMax = 1.7, cut = P.cut;
	lattice(E.box, s, 0, s / 2, s * 0.8660254, (i, j, x, y) => {
		const w = f(x, y), v = Math.abs(w);
		if (v < cut) return;
		E.add(x, y, rankOf2(i, j), 0, v, kMin + (kMax - kMin) * Math.pow(clamp01((v - cut) / (1 - cut)), 0.8), w > 0 ? 0 : 1);
	});
}
const DRAW = opt('draw', 'Drawn as', 'lines', [['lines', 'Lines'], ['halftone', 'Halftone']]);
const halftonePoints = (P) => P.draw === 'halftone'; // (a halftone has no lines, so no spacing along them)
const isHalftone = (P) => P.draw === 'halftone', isLines = (P) => P.draw !== 'halftone';
const DOTS = [when(mm('dots', 'Between stones', 0.007, 0.003, 0.03), isHalftone), when(pct('cut', 'Leave out below', 0.12, 0, 0.8), isHalftone)];

// --- curves grown by rules ----------------------------------------------------------------------------
export const CURVES = {
	hilbert: { label: 'Hilbert curve', axiom: 'A', rules: { A: '+BF-AFA-FB+', B: '-AF+BFB+FA-' }, angle: 90, most: 7, order: 5 },
	moore: { label: 'Moore curve', axiom: 'LFL+F+LFL', rules: { L: '-RF+LFL+FR-', R: '+LF-RFR-FL+' }, angle: 90, most: 6, order: 4 },
	peano: { label: 'Peano curve', axiom: 'X', rules: { X: 'XFYFX+F+YFXFY-F-XFYFX', Y: 'YFXFY-F-XFYFX+F+YFXFY' }, angle: 90, most: 4, order: 3 },
	gosper: { label: 'Gosper flake', axiom: 'A', rules: { A: 'A-B--B+A++AA+B-', B: '+A-BB--B-A++A+B' }, draw: 'AB', angle: 60, most: 5, order: 3 },
	dragon: { label: 'Dragon curve', axiom: 'F', rules: { F: 'F+G', G: 'F-G' }, draw: 'FG', angle: 90, most: 14, order: 10 },
	levy: { label: 'Lévy curve', axiom: 'F', rules: { F: '+F--F+' }, angle: 45, most: 14, order: 10 },
	koch: { label: 'Koch snowflake', axiom: 'F--F--F', rules: { F: 'F+F--F+F' }, angle: 60, most: 6, order: 4 },
	arrowhead: { label: 'Sierpiński arrowhead', axiom: 'A', rules: { A: 'B-A-B', B: 'A+B+A' }, draw: 'AB', angle: 60, most: 8, order: 6 },
	terdragon: { label: 'Terdragon', axiom: 'F', rules: { F: 'F+F-F' }, angle: 120, most: 8, order: 6 },
	square: { label: 'Square curve', axiom: 'F+XF+F+XF', rules: { X: 'XF-F+F-XF+F+XF-F+F-X' }, angle: 90, most: 5, order: 3 },
};
const curveCache = new Map();
// The curve as points, centred, its longer side 1, and each point's generation: which round of the rules
// made the turn there (0 the first; 255 no turn at all). -> { pts: [x, y...], gen, most, unit: a step's length }
export function curveData(name, order) {
	const C = CURVES[name] ?? CURVES.hilbert, n = Math.min(Math.max(1, order | 0), C.most), key = name + ':' + n;
	let got = curveCache.get(key);
	if (got) return got;
	let s = Array.from(C.axiom), g = s.map(() => 0);
	for (let i = 0; i < n; i++) {
		const out = [], og = [];
		s.forEach((ch, q) => {
			const r = C.rules[ch];
			if (!r) { out.push(ch); og.push(g[q]); return; }
			for (const c of r) { out.push(c); og.push(i + 1); }
		});
		s = out; g = og;
		if (s.length > 4e6) break;
	}
	const draw = C.draw ?? 'F', a = (C.angle * Math.PI) / 180, whole = Math.round(360 / C.angle), list = [0, 0], gens = [255];
	let x = 0, y = 0, th = 0, net = 0, low = 255;
	s.forEach((ch, q) => {
		if (ch === '+' || ch === '-') { const d = ch === '+' ? 1 : -1; th += d * a; net += d; if (g[q] < low) low = g[q]; }
		else if (draw.includes(ch)) {
			gens[gens.length - 1] = net % whole ? low : 255;
			x += Math.cos(th); y += Math.sin(th); list.push(x, y); gens.push(255);
			net = 0; low = 255;
		}
	});
	let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
	for (let i = 0; i < list.length; i += 2) { x0 = Math.min(x0, list[i]); x1 = Math.max(x1, list[i]); y0 = Math.min(y0, list[i + 1]); y1 = Math.max(y1, list[i + 1]); }
	const k = 1 / Math.max(x1 - x0, y1 - y0, 1e-9), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, pts = new Float32Array(list.length);
	for (let i = 0; i < list.length; i += 2) { pts[i] = (list[i] - cx) * k; pts[i + 1] = (list[i + 1] - cy) * k; }
	got = { pts, gen: Uint8Array.from(gens), most: n, unit: k };
	curveCache.set(key, got);
	return got;
}
export const curvePoints = (name, order) => curveData(name, order).pts;

// --- dusts and packings ---------------------------------------------------------------------------------
const dustCache = new Map();
export const DUSTS = {
	carpet: { label: 'Sierpiński carpet', cells: 3, keep: (i, j) => !(i === 1 && j === 1), most: 5, order: 4 },
	vicsek: { label: 'Vicsek cross', cells: 3, keep: (i, j) => i === 1 || j === 1, most: 5, order: 4 },
	saltire: { label: 'Vicsek saltire', cells: 3, keep: (i, j) => (i + j) % 2 === 0, most: 5, order: 4 },
	cantor: { label: 'Cantor dust', cells: 3, keep: (i, j) => i !== 1 && j !== 1, most: 6, order: 4 },
	box: { label: 'Box fractal', cells: 4, keep: (i, j) => (i === 0 || i === 3 || j === 0 || j === 3) && !((i === 1 || i === 2) && (j === 1 || j === 2)), most: 4, order: 3 },
};
// The middle of every cell of every round of the rule, coarsest first (the same place only once), in the
// unit square about its middle: [x, y, level...].
function dustPoints(name, order) {
	const D = DUSTS[name] ?? DUSTS.carpet, n = Math.min(Math.max(1, order | 0), D.most), key = name + ':' + n;
	let pts = dustCache.get(key);
	if (pts) return pts;
	const levels = Array.from({ length: n + 1 }, () => []), seen = new Set();
	const go = (x, y, s, k) => {
		const cx = x + s / 2 - 0.5, cy = y + s / 2 - 0.5, id = Math.round(cx * 1e6) * 4e6 + Math.round(cy * 1e6);
		if (!seen.has(id)) { seen.add(id); levels[k].push(cx, cy, k); }
		if (k === n) return;
		const c = s / D.cells;
		for (let j = 0; j < D.cells; j++) for (let i = 0; i < D.cells; i++) if (D.keep(i, j)) go(x + i * c, y + j * c, c, k + 1);
	};
	go(0, 0, 1, 0);
	pts = Float32Array.from(levels.flat());
	dustCache.set(key, pts);
	return pts;
}

// Circles of an Apollonian gasket in the unit disc, by generation: [x, y, r, gen]. Each new circle comes
// from the three it touches and the one on their other side (Descartes' rule, reflected).
let gasket = null;
function apollonian() {
	if (gasket) return gasket;
	const out = [], r0 = 2 * Math.sqrt(3) - 3, d = 1 - r0;
	const C = [0, 1, 2].map((k) => { const a = Math.PI / 2 + (k * TAU) / 3; return { k: 1 / r0, x: d * Math.cos(a), y: d * Math.sin(a) }; });
	const O = { k: -1, x: 0, y: 0 };
	for (const c of C) out.push([c.x, c.y, 1 / c.k, 0]);
	const refl = (a, b, c, old) => {
		const k = 2 * (a.k + b.k + c.k) - old.k, x = (2 * (a.k * a.x + b.k * b.x + c.k * c.x) - old.k * old.x) / k, y = (2 * (a.k * a.y + b.k * b.y + c.k * c.y) - old.k * old.y) / k;
		return { k, x, y };
	};
	const go = (a, b, c, old, gen) => {
		const n = refl(a, b, c, old), r = 1 / n.k;
		if (r < 0.006 || gen > 12) return;
		out.push([n.x, n.y, r, gen]);
		go(a, b, n, c, gen + 1); go(a, c, n, b, gen + 1); go(b, c, n, a, gen + 1);
	};
	go(C[0], C[1], C[2], O, 1);
	go(O, C[0], C[1], C[2], 1); go(O, C[1], C[2], C[0], 1); go(O, C[0], C[2], C[1], 1);
	out.sort((p, q) => q[2] - p[2]); // biggest first
	return (gasket = out);
}
// a circle: its outline of stones when it is big enough for one, else one stone its own size
function circleStones(E, x, y, r, rank, ringFrom, pri = 6) {
	if (r > ringFrom) E.arc(x, y, r);
	else E.add(x, y, rank, hash2(Math.round(x * 1e4), Math.round(y * 1e4)) * TAU, E.t, Math.max(0.35, Math.min(3.5, (2 * r) / (E.d0 * E.gap))), E.cat, pri);
}
// A square a grip draws round a fractal.
const squareOf = (e) => [[[-e / 2, -e / 2], [e / 2, -e / 2], [e / 2, e / 2], [-e / 2, e / 2], [-e / 2, -e / 2]]];
// How much detail a fractal can have: as much as its rule can grow (curveData, dustPoints), whatever the pattern's size.
const curveDetail = (P) => (CURVES[P.curve] ?? CURVES.hilbert).most;
const dustDetail = (P) => (DUSTS[P.dust] ?? DUSTS.carpet).most;
const SQUARE_GRIP = point((P) => [P.extent / 2, P.extent / 2], (P, x, y) => ({ extent: Math.max(Math.abs(x), Math.abs(y)) * 2 }), 'Size', (P) => squareOf(P.extent));

export const CURVE_LAYOUTS = {
	// --- fields -----------------------------------------------------------------------------------
	contours: {
		label: 'Contour map',
		heavy: true, random: true,
		params: [mm('spacing', 'Feature size', 0.08, 0.02, 0.3), num('bands', 'Lines', 9, 2, 30), num('sharp', 'Detail', 3, 1, 5), pct('grow', 'Bigger towards the peaks', 0.4, -1, 1.5)],
		grips: [radius('spacing', 'Feature size')],
		make(P, E) {
			const s = E.seed, L = P.spacing, oct = P.sharp, levels = Array.from({ length: P.bands }, (_, k) => -0.72 + (1.44 * (k + 0.5)) / P.bands);
			isolines(E, (x, y) => fbm(x / L, y / L, s, oct), levels, Math.max(E.pitch, L / 24), (li) => Math.max(0.3, 1 + P.grow * (li / Math.max(1, P.bands - 1) - 0.4)));
		},
	},
	chladni: {
		label: 'Chladni figure',
		heavy: true, points: halftonePoints,
		params: [mm('spacing', 'Plate size', 0.16, 0.04, 0.5), num('modeN', 'Mode n', 3, 1, 12), num('modeM', 'Mode m', 5, 1, 12), ratio('mode', 'Blend', -1, -1, 1), DRAW, when(ratio('level', 'Nodal level', 0, -0.8, 0.8), isLines), ...DOTS],
		grips: [radius('spacing', 'Plate size')],
		make(P, E) {
			const L = P.spacing, n = P.modeN * Math.PI, m = P.modeM * Math.PI, b = P.mode, f = (x, y) => { const X = x / L, Y = y / L; return Math.cos(n * X) * Math.cos(m * Y) + b * Math.cos(m * X) * Math.cos(n * Y); };
			if (isHalftone(P)) halftone(E, (x, y) => f(x, y) / (1 + Math.abs(b)), P);
			else isolines(E, f, [P.level], Math.max(E.pitch, L / (6 * Math.max(P.modeN, P.modeM))));
		},
	},
	waveforms: {
		label: 'Wave interference',
		heavy: true, points: halftonePoints,
		params: [num('fold', 'Waves', 5, 2, 12), mm('spacing', 'Wavelength', 0.04, 0.012, 0.15), deg('phase', 'Phase', 0), DRAW, when(num('bands', 'Lines', 1, 1, 7), isLines), ...DOTS],
		grips: [along('spacing', [1, 0], 'Wavelength')],
		make(P, E) {
			const F = P.fold, k = TAU / P.spacing, ph = (P.phase * Math.PI) / 180, dirs = Array.from({ length: F }, (_, j) => [Math.cos((j * Math.PI) / F), Math.sin((j * Math.PI) / F), j * ph]);
			const f = (x, y) => { let s = 0; for (let j = 0; j < F; j++) { const d = dirs[j]; s += Math.cos(k * (x * d[0] + y * d[1]) + d[2]); } return s; };
			if (isHalftone(P)) { halftone(E, (x, y) => f(x, y) / F, P); return; }
			const levels = Array.from({ length: P.bands }, (_, l) => (P.bands > 1 ? (-0.6 + (1.2 * l) / (P.bands - 1)) * F * 0.5 : 0));
			isolines(E, f, levels, Math.max(E.pitch, P.spacing / 12));
		},
	},
	labyrinth: {
		label: 'Labyrinth',
		heavy: true, random: true, points: halftonePoints,
		params: [mm('spacing', 'Width', 0.03, 0.01, 0.12), DRAW, ...DOTS],
		grips: [along('spacing', [1, 0], 'Width')],
		make(P, E) {
			const seed = E.seed, N = 14, k = TAU / P.spacing, dirs = Array.from({ length: N }, (_, j) => { const a = hash2(j, 1, seed) * TAU; return [Math.cos(a), Math.sin(a), hash2(j, 2, seed) * TAU]; });
			const f = (x, y) => { let s = 0; for (let j = 0; j < N; j++) { const d = dirs[j]; s += Math.cos(k * (x * d[0] + y * d[1]) + d[2]); } return s; };
			if (isHalftone(P)) halftone(E, (x, y) => Math.max(-1, Math.min(1, f(x, y) / 5)), P);
			else isolines(E, f, [0], Math.max(E.pitch, P.spacing / 10));
		},
	},
	ripples: {
		label: 'Two ripples',
		heavy: true, points: halftonePoints,
		params: [mm('spacing', 'Wavelength', 0.028, 0.008, 0.12), mm('apart', 'Centres apart', 0.1, 0, 0.4, 0.0005), DRAW, when(num('bands', 'Lines', 1, 1, 5), isLines), ...DOTS],
		grips: [along('spacing', [0, 1], 'Wavelength'), point((P) => [P.apart / 2, 0], (P, x) => ({ apart: Math.abs(x) * 2 }), 'Centres apart')],
		make(P, E) {
			const k = TAU / P.spacing, a = P.apart / 2, f = (x, y) => Math.sin(k * Math.hypot(x - a, y)) + Math.sin(k * Math.hypot(x + a, y));
			if (isHalftone(P)) { halftone(E, (x, y) => f(x, y) / 2, P); return; }
			const levels = Array.from({ length: P.bands }, (_, l) => (P.bands > 1 ? -1 + (2 * (l + 0.5)) / P.bands : 0));
			isolines(E, f, levels, Math.max(E.pitch, P.spacing / 10));
		},
	},
	flow: {
		label: 'Flow lines',
		heavy: true, random: true,
		params: [mm('spacing', 'Between lines', 0.016, 0.005, 0.06), mm('swirl', 'Swirl size', 0.09, 0.02, 0.3), ratio('curl', 'Curl', 1.4, 0.2, 4, 0.05), mm('length', 'Longest line', 0.3, 0.03, 1, 0.005), pct('swell', 'Swell in the middle', 0.6, 0, 1.5)],
		grips: [along('spacing', [1, 0], 'Between lines'), radius('swirl', 'Swirl size', { angle: Math.PI / 2 })],
		make(P, E) {
			const B = E.box, s = P.spacing, seed = E.seed, L = P.swirl, cell = s * 0.9, step = Math.min(E.pitch * 0.7, s / 2), ci0 = Math.floor(B.x0 / cell), cj0 = Math.floor(B.y0 / cell);
			const nx = Math.ceil((B.x1 - B.x0) / cell) + 2, ny = Math.ceil((B.y1 - B.y0) / cell) + 2;
			if (nx * ny > 400000) return;
			const used = new Uint8Array(nx * ny), angle = (x, y) => noise2(x / L, y / L, seed) * TAU * P.curl, at = (x, y) => { const i = Math.floor(x / cell) - ci0, j = Math.floor(y / cell) - cj0; return i < 0 || j < 0 || i >= nx || j >= ny ? -1 : j * nx + i; };
			// in an order that belongs to the cells, not to the box: the same lines however the box lies
			const seeds = [];
			for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) seeds.push([hash2(i + ci0, j + cj0, seed + 3), j * nx + i]);
			seeds.sort((a, b) => a[0] - b[0]);
			let lineNo = 0;
			const most = Math.ceil(P.length / step / 2);
			for (const [, q] of seeds) {
				if (used[q]) continue;
				const x0 = (q % nx + ci0 + 0.5) * cell, y0 = (Math.floor(q / nx) + cj0 + 0.5) * cell, line = [];
				for (const dir of [1, -1]) {
					let x = x0, y = y0, own = [];
					for (let k = 0; k < most; k++) {
						const a = angle(x, y);
						x += Math.cos(a) * step * dir; y += Math.sin(a) * step * dir;
						const c = at(x, y);
						if (c < 0 || (used[c] && c !== q && !own.includes(c) && !line.some((p) => p[2] === c))) break;
						own.push(c);
						if (own.length > 12) own.shift();
						line.push([x, y, c, dir]);
					}
				}
				if (line.length < 6) continue;
				const back = line.filter((p) => p[3] < 0).reverse(), front = line.filter((p) => p[3] > 0), all = [...back, [x0, y0, q, 0], ...front], n = all.length - 1;
				E.cat = lineNo % 8; E.t = hash2(lineNo, 5, seed);
				lineNo++;
				// a calligrapher's line: thin at its ends, full in the middle
				const kOf = (i) => Math.max(0.3, 1 + P.swell * (Math.sin((Math.PI * i) / n) - 0.5));
				E.k = kOf(0);
				E.begin(all[0][0], all[0][1], false);
				for (let k = 1; k <= n; k++) { E.k = kOf(k); E.to(all[k][0], all[k][1]); used[all[k][2]] = 1; }
				E.end(false);
			}
			E.k = 1;
		},
	},
	edgelines: {
		label: 'Rings along the edge',
		flat: true,
		params: [mm('spacing', 'Between rings', 0.009, 0.003, 0.05), mm('inset', 'First ring in', 0.006, 0.001, 0.05), { ...num('ringsOf', 'Rings (0: all)', 0, 0, 100), maxOf: (P, piece) => Math.ceil((piece ? Math.min(piece.x1 - piece.x0, piece.y1 - piece.y0) / 2 : 0.2) / P.spacing) }, pct('graded', 'Smaller inwards', 0, 0, 0.8)],
		make(P, E) {
			const B = E.box, far = Math.hypot(B.x1 - B.x0, B.y1 - B.y0) / 2, levels = [], kOf = [], most = P.ringsOf || 12;
			let d = P.inset;
			for (let l = 0; d < far && (!P.ringsOf || levels.length < P.ringsOf) && levels.length < 120; l++) {
				const k = Math.max(0.3, 1 - P.graded * Math.min(1, l / most));
				levels.push(d); kOf.push(k);
				d += P.spacing * k;
			}
			if (E.edgeAt && levels.length) isolines(E, E.edgeAt, levels, 0.003, (li) => kOf[li]);
		},
	},

	// --- curves grown by rules ------------------------------------------------------------------------
	grown: {
		label: 'Grown curve', own: true,
		params: [opt('curve', 'Curve', 'hilbert', Object.entries(CURVES).map(([k, c]) => [k, c.label])), mm('extent', 'Size', 0.2, 0.03, 0.8, 0.0005), { ...num('order', 'Detail', 5, 1, 14), maxOf: curveDetail }, pct('falloff', 'Each generation smaller', 0.25, 0, 0.7)],
		grips: [SQUARE_GRIP],
		make(P, E) {
			const { pts, gen, most, unit } = curveData(P.curve, P.order), s = P.extent, n = pts.length / 2, q = 1 - P.falloff;
			// a stone at each turn, the bigger the earlier its generation; the line's own no bigger than a step has room for
			const line = Math.min(1, Math.max(0.3, (s * unit) / E.pitch)), kOfGen = (g) => Math.max(0.3, Math.pow(q, g));
			const stop = (i) => { const g = gen[i]; E.jk = g === 255 ? line : kOfGen(g); E.jpri = g === 255 ? 150 : Math.min(g, 100); };
			E.k = Math.min(line, kOfGen(most));
			E.t = 0;
			stop(0);
			E.begin(pts[0] * s, pts[1] * s, true);
			for (let i = 1; i < n; i++) {
				E.t = i / n;
				E.to(pts[i * 2] * s, pts[i * 2 + 1] * s);
				if (gen[i] !== 255 && i < n - 1) { stop(i); E.corner(true); }
			}
			stop(n - 1);
			E.end(true);
			E.k = 1; E.jpri = 0;
		},
	},
	dust: {
		points: true,
		label: 'Fractal dust', own: true,
		params: [opt('dust', 'Rule', 'carpet', Object.entries(DUSTS).map(([k, d]) => [k, d.label])), mm('extent', 'Size', 0.2, 0.03, 0.8, 0.0005), { ...num('order', 'Detail', 4, 1, 6), maxOf: dustDetail }, pct('falloff', 'Each generation smaller', 0.38, 0, 0.8)],
		grips: [SQUARE_GRIP],
		make(P, E) {
			const pts = dustPoints(P.dust, P.order), s = P.extent, q = 1 - P.falloff, top = Math.max(1, pts[pts.length - 1]);
			for (let i = 0; i < pts.length; i += 3) {
				const x = pts[i], y = pts[i + 1], l = pts[i + 2];
				// (the first of the generations thin last)
				E.key(x * s, y * s, 0, Math.hypot(x, y) * 1.41, Math.pow(q, l), i & 3, Math.min(l, 100), rankOf1(i / 3) * (0.25 + (0.75 * l) / top));
			}
		},
	},
	gasket: {
		label: 'Apollonian gasket', own: true,
		params: [mm('extent', 'Size', 0.12, 0.02, 0.5, 0.0005), { ...mm('ringFrom', 'Outline circles over', 0.01, 0.002, 0.1), maxOf: (P) => P.extent * 0.25 }],
		grips: [radius('extent', 'Size')],
		make(P, E) {
			const R = P.extent;
			for (const [x, y, r, g] of apollonian()) {
				E.cat = Math.min(g, 15); E.t = Math.min(g / 8, 1);
				circleStones(E, x * R, y * R, r * R, rankOf1(g * 13 + Math.round(r * 9973)), P.ringFrom, Math.min(g, 100));
			}
		},
	},
	bubbles: {
		label: 'Bubbles',
		heavy: true, random: true,
		params: [mm('radius', 'Biggest', 0.022, 0.005, 0.08), pct('small', 'Smallest', 0.15, 0.02, 1), { ...mm('ringFrom', 'Outline circles over', 0.007, 0.002, 0.08), maxOf: (P) => P.radius }, pct('fillOf', 'Coverage', 0.8, 0.2, 1)],
		grips: [radius('radius', 'Biggest')],
		make(P, E) {
			// (over a fixed stretch of the pattern's own space, not the box: its bubbles stay where they are as it moves)
			const seed = E.seed, DOMAIN = 1.2, mean = P.radius * (0.3 + P.small * 0.7), tries = Math.min(40000, Math.round(((DOMAIN * DOMAIN) / (mean * mean)) * 6));
			const cell = P.radius * 2.2, grid = new Map(), keyOf = (i, j) => i * 100000 + j, list = [];
			for (let k = 0; k < tries; k++) {
				// biggest first
				const f = 1 - k / tries, r = P.radius * (P.small + (1 - P.small) * f * f * f), x = (hash2(k, 1, seed) - 0.5) * DOMAIN, y = (hash2(k, 2, seed) - 0.5) * DOMAIN;
				const ci = Math.floor(x / cell), cj = Math.floor(y / cell);
				let ok = hash2(k, 3, seed) < P.fillOf;
				for (let j = -1; j <= 1 && ok; j++) for (let i = -1; i <= 1 && ok; i++) for (const q of grid.get(keyOf(ci + i, cj + j)) ?? []) if (Math.hypot(q[0] - x, q[1] - y) < q[2] + r + E.pitch * 0.55) { ok = false; break; }
				if (!ok) continue;
				const key = keyOf(ci, cj), c = [x, y, r];
				if (!grid.has(key)) grid.set(key, []);
				grid.get(key).push(c);
				list.push(c);
			}
			list.forEach(([x, y, r], i) => { E.cat = i & 3; E.t = r / P.radius; circleStones(E, x, y, r, rankOf1(i), P.ringFrom); });
		},
	},
};
