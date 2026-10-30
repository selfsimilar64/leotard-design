// Stone arrangements from fields and rules: lines of equal value of a field (contour maps, Chladni
// figures, wave interference), flow lines, the edge of the piece, curves grown by rules (Hilbert,
// dragon, Gosper), fractal dusts and circle packings. See stones/layouts-lattice.js for what a layout is.
import { TAU, hash2, rankOf1, fbm, noise2 } from './fields.js';
import { mm, num, deg, pct, opt } from './layouts-lattice.js';

// Lines of equal value of f over the box (marching squares), chained and laid out with the pen.
// levels: the values; step: grid size (metres).
const scratch = { val: new Float32Array(0), link: new Int32Array(0), px: new Float32Array(0), py: new Float32Array(0), mark: new Uint8Array(0) };
function isolines(E, f, levels, step) {
	const B = E.box;
	step = Math.max(step, Math.sqrt(((B.x1 - B.x0) * (B.y1 - B.y0)) / 90000));
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
		// walk: open lines from their ends, then the closed ones
		const walk = (start) => {
			E.move(px[start], py[start]);
			mark[start] = 2;
			let cur = start;
			for (;;) {
				const n0 = link[cur * 2], n1 = link[cur * 2 + 1], nxt = n0 >= 0 && mark[n0] === 1 ? n0 : n1 >= 0 && mark[n1] === 1 ? n1 : -1;
				if (nxt < 0) break;
				E.to(px[nxt], py[nxt]);
				mark[nxt] = 2;
				cur = nxt;
			}
		};
		for (const id of touched) if (mark[id] === 1 && link[id * 2 + 1] < 0) walk(id);
		for (const id of touched) if (mark[id] === 1) walk(id);
		for (const id of touched) mark[id] = 0;
	});
}

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
// The curve as points, centred, its longer side 1.
export function curvePoints(name, order) {
	const C = CURVES[name] ?? CURVES.hilbert, n = Math.min(Math.max(1, order | 0), C.most), key = name + ':' + n;
	let pts = curveCache.get(key);
	if (pts) return pts;
	let s = C.axiom;
	for (let i = 0; i < n; i++) {
		let out = '';
		for (const ch of s) out += C.rules[ch] ?? ch;
		s = out;
		if (s.length > 4e6) break;
	}
	const draw = C.draw ?? 'F', a = (C.angle * Math.PI) / 180, list = [0, 0];
	let x = 0, y = 0, th = 0;
	for (const ch of s) {
		if (ch === '+') th += a;
		else if (ch === '-') th -= a;
		else if (draw.includes(ch)) { x += Math.cos(th); y += Math.sin(th); list.push(x, y); }
	}
	let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
	for (let i = 0; i < list.length; i += 2) { x0 = Math.min(x0, list[i]); x1 = Math.max(x1, list[i]); y0 = Math.min(y0, list[i + 1]); y1 = Math.max(y1, list[i + 1]); }
	const k = 1 / Math.max(x1 - x0, y1 - y0, 1e-9), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
	pts = new Float32Array(list.length);
	for (let i = 0; i < list.length; i += 2) { pts[i] = (list[i] - cx) * k; pts[i + 1] = (list[i + 1] - cy) * k; }
	curveCache.set(key, pts);
	return pts;
}

// --- dusts and packings ---------------------------------------------------------------------------------
const dustCache = new Map();
export const DUSTS = {
	carpet: { label: 'Sierpiński carpet', cells: 3, keep: (i, j) => !(i === 1 && j === 1), most: 5, order: 4 },
	vicsek: { label: 'Vicsek cross', cells: 3, keep: (i, j) => i === 1 || j === 1, most: 5, order: 4 },
	saltire: { label: 'Vicsek saltire', cells: 3, keep: (i, j) => (i + j) % 2 === 0, most: 5, order: 4 },
	cantor: { label: 'Cantor dust', cells: 3, keep: (i, j) => i !== 1 && j !== 1, most: 6, order: 4 },
	box: { label: 'Box fractal', cells: 4, keep: (i, j) => (i === 0 || i === 3 || j === 0 || j === 3) && !((i === 1 || i === 2) && (j === 1 || j === 2)), most: 4, order: 3 },
};
function dustPoints(name, order) {
	const D = DUSTS[name] ?? DUSTS.carpet, n = Math.min(Math.max(1, order | 0), D.most), key = name + ':' + n;
	let pts = dustCache.get(key);
	if (pts) return pts;
	pts = [];
	const go = (x, y, s, k) => {
		if (k === 0) { pts.push(x + s / 2 - 0.5, y + s / 2 - 0.5); return; }
		const c = s / D.cells;
		for (let j = 0; j < D.cells; j++) for (let i = 0; i < D.cells; i++) if (D.keep(i, j)) go(x + i * c, y + j * c, c, k - 1);
	};
	go(0, 0, 1, n);
	pts = Float32Array.from(pts);
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
	return (gasket = out);
}
// a circle: its outline of stones when it is big enough for one, else one stone its own size
function circleStones(E, x, y, r, rank, ringFrom) {
	if (r > ringFrom) E.arc(x, y, r);
	else E.add(x, y, rank, hash2(Math.round(x * 1e4), Math.round(y * 1e4)) * TAU, E.t, Math.max(0.35, Math.min(3.5, (2 * r) / E.pitch)));
}

export const CURVE_LAYOUTS = {
	// --- fields -----------------------------------------------------------------------------------
	contours: {
		label: 'Contour map',
		heavy: true,
		params: [mm('spacing', 'Feature size', 0.08, 0.02, 0.3), num('bands', 'Lines', 9, 2, 30), num('sharp', 'Detail', 3, 1, 5)],
		make(P, E) {
			const s = E.seed, L = P.spacing, oct = P.sharp, levels = Array.from({ length: P.bands }, (_, k) => -0.72 + (1.44 * (k + 0.5)) / P.bands);
			isolines(E, (x, y) => fbm(x / L, y / L, s, oct), levels, Math.max(E.pitch, L / 24));
		},
	},
	chladni: {
		label: 'Chladni figure',
		heavy: true,
		params: [mm('spacing', 'Plate size', 0.16, 0.04, 0.5), num('modeN', 'Mode n', 3, 1, 12), num('modeM', 'Mode m', 5, 1, 12), num('mode', 'Blend', -1, -1, 1, 0.01, 'x'), num('level', 'Nodal level', 0, -0.8, 0.8, 0.01, 'x')],
		make(P, E) {
			const L = P.spacing, n = P.modeN * Math.PI, m = P.modeM * Math.PI, b = P.mode;
			isolines(E, (x, y) => { const X = x / L, Y = y / L; return Math.cos(n * X) * Math.cos(m * Y) + b * Math.cos(m * X) * Math.cos(n * Y); }, [P.level], Math.max(E.pitch, L / (6 * Math.max(P.modeN, P.modeM))));
		},
	},
	waveforms: {
		label: 'Wave interference',
		heavy: true,
		params: [num('fold', 'Waves', 5, 2, 12), mm('spacing', 'Wavelength', 0.04, 0.012, 0.15), deg('phase', 'Phase', 0), num('bands', 'Lines', 1, 1, 7)],
		make(P, E) {
			const F = P.fold, k = TAU / P.spacing, ph = (P.phase * Math.PI) / 180, dirs = Array.from({ length: F }, (_, j) => [Math.cos((j * Math.PI) / F), Math.sin((j * Math.PI) / F), j * ph]);
			const levels = Array.from({ length: P.bands }, (_, l) => (P.bands > 1 ? (-0.6 + (1.2 * l) / (P.bands - 1)) * F * 0.5 : 0));
			isolines(E, (x, y) => { let s = 0; for (let j = 0; j < F; j++) { const d = dirs[j]; s += Math.cos(k * (x * d[0] + y * d[1]) + d[2]); } return s; }, levels, Math.max(E.pitch, P.spacing / 12));
		},
	},
	labyrinth: {
		label: 'Labyrinth',
		heavy: true,
		params: [mm('spacing', 'Width', 0.03, 0.01, 0.12)],
		make(P, E) {
			const seed = E.seed, N = 14, k = TAU / P.spacing, dirs = Array.from({ length: N }, (_, j) => { const a = hash2(j, 1, seed) * TAU; return [Math.cos(a), Math.sin(a), hash2(j, 2, seed) * TAU]; });
			isolines(E, (x, y) => { let s = 0; for (let j = 0; j < N; j++) { const d = dirs[j]; s += Math.cos(k * (x * d[0] + y * d[1]) + d[2]); } return s; }, [0], Math.max(E.pitch, P.spacing / 10));
		},
	},
	ripples: {
		label: 'Two ripples',
		heavy: true,
		params: [mm('spacing', 'Wavelength', 0.028, 0.008, 0.12), mm('apart', 'Centres apart', 0.1, 0, 0.4), num('bands', 'Lines', 1, 1, 5)],
		make(P, E) {
			const k = TAU / P.spacing, a = P.apart / 2, levels = Array.from({ length: P.bands }, (_, l) => (P.bands > 1 ? -1 + (2 * (l + 0.5)) / P.bands : 0));
			isolines(E, (x, y) => Math.sin(k * Math.hypot(x - a, y)) + Math.sin(k * Math.hypot(x + a, y)), levels, Math.max(E.pitch, P.spacing / 10));
		},
	},
	flow: {
		label: 'Flow lines',
		heavy: true,
		params: [mm('spacing', 'Between lines', 0.016, 0.005, 0.06), mm('swirl', 'Swirl size', 0.09, 0.02, 0.3), num('curl', 'Curl', 1.4, 0.2, 4, 0.05, 'x'), mm('length', 'Longest line', 0.3, 0.03, 1, 0.005)],
		make(P, E) {
			const B = E.box, s = P.spacing, seed = E.seed, L = P.swirl, cell = s * 0.9, step = Math.min(E.pitch * 0.7, s / 2);
			const nx = Math.ceil((B.x1 - B.x0) / cell) + 1, ny = Math.ceil((B.y1 - B.y0) / cell) + 1;
			if (nx * ny > 400000) return;
			const used = new Uint8Array(nx * ny), angle = (x, y) => noise2(x / L, y / L, seed) * TAU * P.curl, at = (x, y) => { const i = Math.floor((x - B.x0) / cell), j = Math.floor((y - B.y0) / cell); return i < 0 || j < 0 || i >= nx || j >= ny ? -1 : j * nx + i; };
			const seeds = [];
			for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) seeds.push(j * nx + i);
			seeds.sort((a, b) => hash2(a, 3, seed) - hash2(b, 3, seed));
			let lineNo = 0;
			const most = Math.ceil(P.length / step / 2);
			for (const q of seeds) {
				if (used[q]) continue;
				const x0 = B.x0 + (q % nx + 0.5) * cell, y0 = B.y0 + (Math.floor(q / nx) + 0.5) * cell, line = [];
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
				const back = line.filter((p) => p[3] < 0).reverse(), front = line.filter((p) => p[3] > 0), all = [...back, [x0, y0, q, 0], ...front];
				E.cat = lineNo % 8; E.t = (hash2(lineNo, 5, seed));
				lineNo++;
				E.move(all[0][0], all[0][1]);
				for (let k = 1; k < all.length; k++) { E.to(all[k][0], all[k][1]); used[all[k][2]] = 1; }
			}
		},
	},
	edgelines: {
		label: 'Rings along the edge',
		flat: true,
		params: [mm('spacing', 'Between rings', 0.009, 0.003, 0.05), mm('inset', 'First ring in', 0.006, 0.001, 0.05), num('ringsOf', 'Rings (0: all)', 0, 0, 40)],
		make(P, E) {
			const B = E.box, far = Math.hypot(B.x1 - B.x0, B.y1 - B.y0) / 2, levels = [];
			for (let d = P.inset; d < far && (!P.ringsOf || levels.length < P.ringsOf) && levels.length < 120; d += P.spacing) levels.push(d);
			if (E.edgeAt && levels.length) isolines(E, E.edgeAt, levels, 0.003);
		},
	},

	// --- curves grown by rules ------------------------------------------------------------------------
	grown: {
		label: 'Grown curve',
		params: [opt('curve', 'Curve', 'hilbert', Object.entries(CURVES).map(([k, c]) => [k, c.label])), mm('extent', 'Size', 0.2, 0.03, 0.8, 0.002), num('order', 'Detail', 5, 1, 14)],
		make(P, E) {
			const pts = curvePoints(P.curve, P.order), s = P.extent, n = pts.length / 2;
			E.move(pts[0] * s, pts[1] * s);
			for (let i = 1; i < n; i++) { E.t = i / n; E.to(pts[i * 2] * s, pts[i * 2 + 1] * s); }
		},
	},
	dust: {
		points: true,
		label: 'Fractal dust',
		params: [opt('dust', 'Rule', 'carpet', Object.entries(DUSTS).map(([k, d]) => [k, d.label])), mm('extent', 'Size', 0.2, 0.03, 0.8, 0.002), num('order', 'Detail', 4, 1, 6)],
		make(P, E) {
			const pts = dustPoints(P.dust, P.order), s = P.extent, n = pts.length / 2;
			for (let i = 0; i < n; i++) { const x = pts[i * 2], y = pts[i * 2 + 1]; E.add(x * s, y * s, rankOf1(i), 0, Math.hypot(x, y) * 1.41, 1, i & 3); }
		},
	},
	gasket: {
		label: 'Apollonian gasket',
		params: [mm('extent', 'Size', 0.12, 0.02, 0.5, 0.002), mm('ringFrom', 'Outline circles over', 0.01, 0.002, 0.05)],
		make(P, E) {
			const R = P.extent;
			for (const [x, y, r, g] of apollonian()) {
				E.cat = Math.min(g, 15); E.t = Math.min(g / 8, 1);
				circleStones(E, x * R, y * R, r * R, rankOf1(g * 13 + Math.round(r * 9973)), P.ringFrom);
			}
		},
	},
	bubbles: {
		label: 'Bubbles',
		heavy: true,
		params: [mm('radius', 'Biggest', 0.022, 0.005, 0.08), pct('small', 'Smallest', 0.15, 0.02, 1), mm('ringFrom', 'Outline circles over', 0.007, 0.002, 0.05), pct('fillOf', 'Coverage', 0.8, 0.2, 1)],
		make(P, E) {
			const B = E.box, seed = E.seed, area = (B.x1 - B.x0) * (B.y1 - B.y0), mean = P.radius * (0.3 + P.small * 0.7), tries = Math.min(9000, Math.round((area / (mean * mean)) * 6));
			const cell = P.radius * 2.2, grid = new Map(), keyOf = (i, j) => i * 100000 + j, list = [];
			for (let k = 0; k < tries; k++) {
				// biggest first
				const f = 1 - k / tries, r = P.radius * (P.small + (1 - P.small) * f * f * f), x = B.x0 + hash2(k, 1, seed) * (B.x1 - B.x0), y = B.y0 + hash2(k, 2, seed) * (B.y1 - B.y0);
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
