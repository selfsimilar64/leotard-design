// Fit realism plan, stage 1 step 1 (knowledge/engineering/app/fit-realism-plan.md): why the re-fit does not span hollows on the
// bare skin. Runs fit/refit.js on the open fitted garment against the bare skin and against today's bridged garment surface
// (membrane + seat sheet), one factor at a time, and measures how far the fabric stays off the hollows the bridged fit spans.
// Opens its own design: run it in a tab and port nobody designs in (the autosave follows the open design).
//   const p = await import('/src/dev/bridge-probe.js'); await p.setup(); const r = await p.all(); p.table(r)
//   p.show(X)  draws a probe's points in place of the app's re-fit (p.show(null): back to the app's own); p.capture(tag) pictures
import * as THREE from 'three';
import { Refit } from '../fit/refit.js';
import { buildCase, startOf, garmentArrays } from '../fit/fitted-case.js';
import { Surface } from '../body/surface.js';
import { framed, lightsTurned } from '../render/pictures.js';

const app = () => window.app;
const ROWS = [0.02, 0.04, 0.06, 0.10, 0.14]; // m above the crotch: the rows fabric-bridging-hollows.md measured the seat at

export async function setup({ size = 'young', pose = 'standing', key = 'hybrid-6-high' } = {}) {
	const a = app();
	a.new('Bridge probe');
	a.exec({ op: 'body.set', size, pose });
	a.exec({ op: 'fitted.set', key });
	await a.engine.settled();
	for (const p of a.doc.panels) a.exec({ op: 'panel.set', id: p.id, colour: '#e8e4dc' }); // light, so the seat's shading shows
	await a.engine.settled();
	return a.engine.fitted.status;
}

// Per fabric point a value carried from the body's vertices (one number per vertex), as startOf carries positions.
function perPoint(data, f, m) {
	const Q = new Float32Array(m * 3);
	for (let v = 0; v < m; v++) Q[3 * v] = f(v);
	const o = startOf(data, Q), out = new Float32Array(o.length / 3);
	for (let i = 0; i < out.length; i++) out[i] = o[3 * i];
	return out;
}

// What the measures need, made once per body: the skin as a surface, each fabric point's place on the reference body and its region,
// the seat's view direction.
function context() {
	const e = app().engine, man = e.body, fv = e.fitted, data = fv.data, m = man.vertices;
	const P = Float32Array.from(man.aPos.array), G = Float32Array.from(man.garmentPos);
	const skin = new Surface(man.idx, P);
	const rx = perPoint(data, (v) => man.ref[3 * v], m), ry = perPoint(data, (v) => man.ref[3 * v + 1], m);
	const back = perPoint(data, (v) => (man.form[2 * v] < 0 ? 1 : 0), m);
	const cy = man.crotchY, n = data.case.n, region = new Array(n);
	const lm = man.bodies[app().doc.body.size]?.landmarks ?? {};
	const navelY = lm.navel?.[1] ?? cy + 0.2; // (the bodies' landmarks are joints, no navel: these regions only group stretch figures;
	// heights() finds the navel from the bridged lift)
	for (let i = 0; i < n; i++) {
		const x = Math.abs(rx[i]), y = ry[i] - cy, b = back[i] > 0.5;
		region[i] = b && x < 0.16 && y > -0.03 && y < 0.25 ? 'seat'
			: b && x < 0.04 && y >= 0.25 && y < 0.6 ? 'spine'
				: !b && x < 0.05 && Math.abs(ry[i] - navelY) < 0.05 ? 'navel'
					: 'other';
	}
	// into the body at the seat: minus the mean skin normal of the back seat region (as body/seat.js frames it)
	const N = man.aNrm.array, d = [0, 0, 0];
	for (let v = 0; v < m; v++) {
		const y = man.ref[3 * v + 1] - cy;
		if (man.form[2 * v] < 0 && Math.abs(man.ref[3 * v]) < 0.16 && y > 0 && y < 0.2 && man.wArm[v] < 0.5 && man.wHead[v] < 0.5) for (let k = 0; k < 3; k++) d[k] -= N[3 * v + k];
	}
	const L = Math.hypot(...d);
	return { e, man, fv, data, P, G, skin, rx, ry, back, region, cy, d: d.map((x) => x / L), navelY };
}

let ctx = null;

// One re-fit: body 'skin' or 'bridged', start 'skin' or 'bridged', steps, friction mu, hold, pattern size (width, length), elastic
// (scales the springs' k), gather (the free squeeze's floor), free (frictionless steps first), thick. -> { X: its points, seconds, garment }
export async function fit({ body = 'skin', start = body, steps = 150, mu = 0.4, hold = null, width = 1, length = 1, elastic = 1, gather = null, free = 0, thick = 0 } = {}) {
	ctx ??= context();
	const { fv, data, P, G, man } = ctx;
	// thick: the fabric's thickness in contact, emulated by the skin pushed out along its normals (the plan's step 4 would do it in
	// the query instead); slits narrower than twice it close
	const N = man.aNrm.array, Q = body === 'skin' ? (thick ? Float32Array.from(P, (x, i) => x + thick * N[i]) : P) : G, S = start === 'skin' ? P : G;
	let garment = width === 1 && length === 1 ? fv.garment : garmentArrays(data, { width, length });
	if (elastic !== 1) garment = { ...garment, k: Float32Array.from(garment.k, (k) => k * elastic) };
	const c = buildCase(data, garment, Q, man.idx, man.wArm, {});
	c.arrays.start = startOf(data, S);
	if (hold != null) c.head.hold = hold;
	if (gather != null) c.head.gather = gather; // the floor of the squeeze that costs nothing (the case's 0.5; 1: none is free)
	const r = new Refit(fv.device ??= await Refit.device(), c, { maxSteps: steps, mu, tol: 0 });
	const t0 = performance.now();
	if (free) { // the plan's two phases (stage 1 step 3): frictionless first, then friction anchored where phase A left the fabric
		r.setSettings({ mu: 0 });
		await r.run({ steps: free });
		r.reset(await r.positions(false));
		r.setSettings({ mu });
	}
	await r.run({ steps });
	const X = await r.positions(steps > r.settings.window);
	r.destroy();
	return { X, seconds: (performance.now() - t0) / 1000, garment };
}

// Signed distance of every point from the bare skin (m; negative inside), by the closest point and the skin's normal there.
function gapsOf(X) {
	const { skin } = ctx, n = X.length / 3, out = new Float32Array(n), p = new THREE.Vector3(), q = new THREE.Vector3(), nn = new THREE.Vector3(), sp = {};
	for (let i = 0; i < n; i++) {
		p.set(X[3 * i], X[3 * i + 1], X[3 * i + 2]);
		const h = skin.closest(p, sp);
		if (!h) { out[i] = NaN; continue; }
		skin.pos(sp, q); skin.normalAt(sp, nn);
		out[i] = Math.sign(p.sub(q).dot(nn) || 1) * h.dist;
	}
	return out;
}

// Per triangle the two stretches of the fabric (singular values of the deformation gradient against the rest shape at its size).
function stretches(X, garment) {
	const T = garment.tris, D = garment.Dinv, nt = T.length / 3, s1 = new Float32Array(nt), s2 = new Float32Array(nt);
	for (let t = 0; t < nt; t++) {
		const a = 3 * T[3 * t], b = 3 * T[3 * t + 1], c = 3 * T[3 * t + 2];
		const e1 = [X[b] - X[a], X[b + 1] - X[a + 1], X[b + 2] - X[a + 2]], e2 = [X[c] - X[a], X[c + 1] - X[a + 1], X[c + 2] - X[a + 2]];
		const f0 = e1.map((v, k) => v * D[4 * t] + e2[k] * D[4 * t + 2]), f1 = e1.map((v, k) => v * D[4 * t + 1] + e2[k] * D[4 * t + 3]);
		const A = f0[0] ** 2 + f0[1] ** 2 + f0[2] ** 2, B = f0[0] * f1[0] + f0[1] * f1[1] + f0[2] * f1[2], C = f1[0] ** 2 + f1[1] ** 2 + f1[2] ** 2;
		const h = 0.5 * (A - C), disc = Math.sqrt(h * h + B * B);
		s1[t] = Math.sqrt(0.5 * (A + C) + disc); s2[t] = Math.sqrt(Math.max(0.5 * (A + C) - disc, 0));
	}
	return { s1, s2 };
}

const median = (a) => { if (!a.length) return NaN; const s = Float64Array.from(a).sort(); return s[Math.floor(s.length / 2)]; };

// Measures at fixed places on the body (fabric that slides cannot move them): over each vertex, the nearest layer of fabric along a
// direction (the vertex normal, or the seat's view direction), among the points within 6 mm of that line. -> m, or null
function fabricGrid(X) {
	const cell = 0.01, grid = new Map(), key = (a, b, c) => a + ',' + b + ',' + c;
	for (let i = 0; i < X.length / 3; i++) {
		const k = key(Math.floor(X[3 * i] / cell), Math.floor(X[3 * i + 1] / cell), Math.floor(X[3 * i + 2] / cell));
		let l = grid.get(k); if (!l) grid.set(k, (l = [])); l.push(i);
	}
	return (p, dir) => {
		let best = null;
		const cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell), cz = Math.floor(p[2] / cell);
		for (let a = -6; a <= 6; a++) for (let b = -6; b <= 6; b++) for (let c = -6; c <= 6; c++) {
			const l = grid.get(key(cx + a, cy + b, cz + c));
			if (l) for (const i of l) {
				const dx = X[3 * i] - p[0], dy = X[3 * i + 1] - p[1], dz = X[3 * i + 2] - p[2], h = dx * dir[0] + dy * dir[1] + dz * dir[2];
				if (h < -0.002 || h > 0.06 || Math.hypot(dx - h * dir[0], dy - h * dir[1], dz - h * dir[2]) > 0.006) continue;
				if (best === null || h < best) best = h;
			}
		}
		return best;
	};
}

// Body-located: per region, over the vertices today's bridged surface lifts more than 3 mm, the fabric's mean height against that lift
// (kept: 1 spans as the bridged surface does); per seat row the fabric's dip at the midline against the cheek tops, along the seat's view.
export function heights(X) {
	ctx ??= context();
	const { man, P, G, cy, d } = ctx, N = man.aNrm.array, over = fabricGrid(X), R = {};
	const lm = { navel: null };
	let nl = 0;
	for (let v = 0; v < man.vertices; v++) { // the navel: the front midline's deepest hollow between 10 and 35 cm above the crotch
		const x = Math.abs(man.ref[3 * v]), y = man.ref[3 * v + 1] - cy;
		if (man.form[2 * v] < 0 || x > 0.02 || y < 0.1 || y > 0.35 || man.wArm[v] > 0.5) continue;
		const L = Math.hypot(G[3 * v] - P[3 * v], G[3 * v + 1] - P[3 * v + 1], G[3 * v + 2] - P[3 * v + 2]);
		if (L > nl) { nl = L; lm.navel = man.ref[3 * v + 1]; }
	}
	for (let v = 0; v < man.vertices; v++) {
		if (man.wArm[v] > 0.5 || man.wHead[v] > 0.5) continue;
		const L = Math.hypot(G[3 * v] - P[3 * v], G[3 * v + 1] - P[3 * v + 1], G[3 * v + 2] - P[3 * v + 2]);
		if (L < 0.003) continue;
		const x = Math.abs(man.ref[3 * v]), y = man.ref[3 * v + 1] - cy, b = man.form[2 * v] < 0;
		const r = b && x < 0.16 && y > -0.03 && y < 0.25 ? 'seat' : b && x < 0.04 && y >= 0.25 && y < 0.6 ? 'spine'
			: !b && x < 0.03 && lm.navel != null && Math.abs(man.ref[3 * v + 1] - lm.navel) < 0.03 ? 'navel' : 'other';
		const h = over([P[3 * v], P[3 * v + 1], P[3 * v + 2]], [N[3 * v], N[3 * v + 1], N[3 * v + 2]]);
		const o = (R[r] ??= { lift: 0, fabric: 0, n: 0 });
		if (h === null) continue;
		o.lift += L; o.fabric += Math.max(h, 0); o.n++;
	}
	for (const k in R) { const o = R[k]; R[k] = { liftMm: +(1000 * o.lift / o.n).toFixed(1), fabricMm: +(1000 * o.fabric / o.n).toFixed(1), kept: +(o.fabric / o.lift).toFixed(2), n: o.n }; }
	const dips = ROWS.map((h) => sectionDip(X, h)), skinDips = ROWS.map((h) => sectionDip(P, h));
	return { regions: R, seat: dips, skinSeat: skinDips };
}

// The seat's dip in a horizontal cross-section through the groove's floor at height h above the crotch (mm): the outermost layer
// (skin or fabric) seen along the seat's view direction, its depth at the floor against the chord between ±CHORD to either side.
const CHORD = 0.024;
function sectionDip(A, h) {
	const { man, P, cy, d } = ctx, s = [d[2], 0, -d[0]], ls = Math.hypot(...s);
	for (let k = 0; k < 3; k++) s[k] /= ls;
	const dot = (B, i, u) => B[3 * i] * u[0] + B[3 * i + 1] * u[1] + B[3 * i + 2] * u[2];
	let fv = -1, fz = -Infinity;
	for (let v = 0; v < man.vertices; v++) {
		if (man.form[2 * v] >= 0 || Math.abs(man.ref[3 * v + 1] - cy - h) > 0.006 || Math.abs(man.ref[3 * v]) > 0.01 || man.wArm[v] > 0.5) continue;
		const z = dot(P, v, d);
		if (z > fz) { fz = z; fv = v; }
	}
	if (fv < 0) return null;
	const y0 = P[3 * fv + 1], x0 = dot(P, fv, s), at = (x) => {
		let best = Infinity;
		for (let i = 0; i < A.length / 3; i++) {
			if (Math.abs(A[3 * i + 1] - y0) > 0.002 || Math.abs(dot(A, i, s) - x0 - x) > 0.003) continue;
			const z = dot(A, i, d) - fz;
			if (z > -0.04 && z < 0.01) best = Math.min(best, z);
		}
		return best;
	};
	const c = at(0), l = at(-CHORD), r = at(CHORD);
	return Number.isFinite(c + l + r) ? Math.round(1000 * (c - (l + r) / 2)) : null;
}

// Everything measured about one fit, against a reference fit's gaps (the bridged re-fit): per region the fabric's mean gap off the skin
// over the points the reference spans (> 3 mm), the share of that span kept, stretch medians, slack shares; points inside the skin.
export function measure(X, garment, refGap = null) {
	ctx ??= context();
	const g = gapsOf(X), { region } = ctx, n = g.length, R = {};
	const { s1, s2 } = stretches(X, garment), T = garment.tris;
	for (const name of ['seat', 'spine', 'navel', 'other']) {
		let sg = 0, sr = 0, cnt = 0;
		for (let i = 0; i < n; i++) if (region[i] === name && (!refGap || refGap[i] > 0.003)) { sg += g[i]; sr += refGap ? refGap[i] : 0; cnt++; }
		const t1 = [], t2 = [];
		for (let t = 0; t < s1.length; t++) {
			const i = T[3 * t];
			if (region[i] === name && (!refGap || refGap[i] > 0.003)) { t1.push(s1[t]); t2.push(s2[t]); }
		}
		R[name] = {
			points: cnt, gapMm: +(1000 * sg / Math.max(cnt, 1)).toFixed(1), kept: refGap ? +(sg / Math.max(sr, 1e-9)).toFixed(2) : null,
			s1: +median(t1).toFixed(3), s2: +median(t2).toFixed(3),
			slackBoth: +(t1.filter((v) => v < 1).length / Math.max(t1.length, 1)).toFixed(2), slackOne: +(t2.filter((v) => v < 1).length / Math.max(t2.length, 1)).toFixed(2),
		};
	}
	let inside = 0, deep = 0;
	for (const v of g) { if (v < -0.001) inside++; deep = Math.min(deep, v); }
	return { regions: R, inside, deepestInsideMm: +(1000 * deep).toFixed(1), gap: g };
}

export const VARIANTS = [
	['bridged (today)', { body: 'bridged' }],
	['skin', { body: 'skin' }],
	['skin, start bridged', { body: 'skin', start: 'bridged' }],
	['skin, mu 0', { body: 'skin', mu: 0 }],
	['skin, hold 0', { body: 'skin', hold: 0 }],
	['skin, start bridged, mu 0, hold 0', { body: 'skin', start: 'bridged', mu: 0, hold: 0 }],
	['skin, 750 steps', { body: 'skin', steps: 750 }],
	['skin, start bridged, 750 steps', { body: 'skin', start: 'bridged', steps: 750 }],
	['skin, pattern 8% narrower', { body: 'skin', width: 0.92 }],
	['skin, start bridged, pattern 8% narrower', { body: 'skin', start: 'bridged', width: 0.92 }],
];
// what pulls the lower seat into the cleft: the elastic, the pattern's length
export const TENSION = [
	['skin, no elastic', { body: 'skin', elastic: 0 }],
	['skin, pattern 5% longer', { body: 'skin', length: 1.05 }],
	['skin, pattern 10% longer', { body: 'skin', length: 1.1 }],
	['skin, 8% narrower, 10% longer', { body: 'skin', width: 0.92, length: 1.1 }],
	['skin, 10% longer, no elastic', { body: 'skin', length: 1.1, elastic: 0 }],
];
// squeezing fabric costs something (gather above 0.5): the free gathering lets fabric fall into a slot by shrinking across it
export const SQUEEZE = [
	['skin, gather 0.8', { body: 'skin', gather: 0.8 }],
	['skin, gather 0.9', { body: 'skin', gather: 0.9 }],
	['skin, gather 1', { body: 'skin', gather: 1 }],
	['skin, gather 1, 750 steps', { body: 'skin', gather: 1, steps: 750 }],
	['bridged, gather 1', { body: 'bridged', gather: 1 }],
];
// friction: how much of the seat it holds in, and the plan's two phases
export const FRICTION = [
	['skin, mu 0, 750 steps', { body: 'skin', mu: 0, steps: 750 }],
	['skin, mu 0.2', { body: 'skin', mu: 0.2 }],
	['skin, 150 free then 150 with friction', { body: 'skin', free: 150 }],
	['skin, start bridged, 150 free then 150 with friction', { body: 'skin', start: 'bridged', free: 150 }],
];
// the fabric's thickness in contact closing the slit at the bottom of the groove
export const THICK = [
	['skin, 1 mm thick', { body: 'skin', thick: 0.001 }],
	['skin, 2 mm thick', { body: 'skin', thick: 0.002 }],
	['skin, 3 mm thick', { body: 'skin', thick: 0.003 }],
	['skin, 2 mm thick, two phases', { body: 'skin', thick: 0.002, free: 150 }],
	['skin, 3 mm thick, two phases', { body: 'skin', thick: 0.003, free: 150 }],
];

export const runs = {};
export async function all(list = VARIANTS) {
	ctx = context();
	const ref = await fit(VARIANTS[0][1]), refM = measure(ref.X, ref.garment);
	const out = [];
	for (const [name, v] of list) {
		const f = name === VARIANTS[0][0] ? ref : await fit(v);
		runs[name] = f.X;
		const m = measure(f.X, f.garment, refM.gap), h = heights(f.X);
		delete m.gap;
		out.push({ name, seconds: +f.seconds.toFixed(2), ...m, body: h.regions, seatBody: h.seat });
		out.skinSeat = h.skinSeat;
	}
	out.refRegions = refM.regions;
	return out;
}

// One line per fit: the seat's midline dip per row and each region's share of the bridged lift kept (both at fixed places on the
// body), then per region the fabric's median stretches (main / other) and the share of triangles slack in the other direction.
export function table(rows) {
	const lines = [`seat dip: the outermost layer at the groove's floor below the chord ±${CHORD * 1000} mm, mm at ${ROWS.map((r) => Math.round(r * 100)).join('/')} cm above the crotch; the skin's own: ${rows.skinSeat.join('/')}`];
	for (const r of rows) {
		const kept = (k) => (r.body[k] ? `${r.body[k].fabricMm}/${r.body[k].liftMm} mm (${r.body[k].kept})` : '-');
		const s = (k) => `${r.regions[k].s1}/${r.regions[k].s2} slack ${r.regions[k].slackOne}`;
		lines.push(`${r.name}: seat dip ${r.seatBody.join('/')} | kept: seat ${kept('seat')}, spine ${kept('spine')}, navel ${kept('navel')} | stretch: seat ${s('seat')}, spine ${s('spine')} | inside ${r.inside} (${r.deepestInsideMm} mm) | ${r.seconds} s`);
	}
	return lines.join('\n');
}

// Draw a probe's points as the app's fitted garment (the app's own re-fit result is put back by show(null)). Lit by its own shape,
// as render/fitted.js show() lights every re-fit since 2026-11-10 (the captures' "own shading" rows were made before that, by a copy
// of it here).
export function show(X) {
	const fv = app().engine.fitted;
	if (X) { fv._probeKeep ??= fv.solved; fv.solved = X; } else if (fv._probeKeep !== undefined) { fv.solved = fv._probeKeep; delete fv._probeKeep; }
	fv.show();
}

// Pictures for the comparison: views of the seat from behind and low behind, the small of the back, the front waist.
// The posed body need not face +z: framed from the seat (c: its skin's centre, posed; b: out of the back there, the body's side s).
export const VIEWS = {
	seat: ({ c, b, up }) => framed(c.map((x, i) => x + 0.04 * up[i]), b.map((x, i) => x + 0.1 * up[i]), 0.36),
	'seat-low': ({ c, b, up }) => framed(c.map((x, i) => x - 0.03 * up[i]), b.map((x, i) => x - 0.5 * up[i]), 0.3),
	'back-waist': ({ c, b, up, s }) => framed(c.map((x, i) => x + 0.27 * up[i]), b.map((x, i) => x + 0.05 * up[i] + 0.15 * s[i]), 0.36),
	front: ({ c, b, up, s }) => framed(c.map((x, i) => x + 0.2 * up[i] - 0.2 * b[i]), b.map((x, i) => -x + 0.05 * up[i] + 0.2 * s[i]), 0.4),
};
function seatFrame() {
	const man = app().engine.body, P = man.aPos.array, N = man.aNrm.array, cy = man.crotchY, c = [0, 0, 0], b = [0, 0, 0];
	let k = 0;
	for (let v = 0; v < man.vertices; v++) {
		const y = man.ref[3 * v + 1] - cy;
		if (man.form[2 * v] >= 0 || Math.abs(man.ref[3 * v]) > 0.12 || y < 0.03 || y > 0.15 || man.wArm[v] > 0.5) continue;
		for (let j = 0; j < 3; j++) { c[j] += P[3 * v + j]; b[j] += N[3 * v + j]; }
		k++;
	}
	const L = Math.hypot(...b), bb = b.map((x) => x / L), up = [0, 1, 0], s = [up[1] * bb[2] - up[2] * bb[1], up[2] * bb[0] - up[0] * bb[2], up[0] * bb[1] - up[1] * bb[0]];
	return { c: c.map((x) => x / k), b: bb, up, s };
}
export async function capture(tag, views = Object.keys(VIEWS)) {
	const a = app(), vp = a.engine.viewport, f = seatFrame(), cam = vp.getCamera(), out = [];
	try {
		for (const v of views) {
			const back = v !== 'front';
			await lightsTurned(a, back ? Math.PI : 0, async () => {
				vp.setCamera(VIEWS[v](f));
				await new Promise((r) => setTimeout(r, 700));
				const blob = await a.withoutOverlay(() => vp.capture(900, 900));
				const url = `/__fs/captures/bridge-probe/${tag}-${v}.png`;
				await fetch(url, { method: 'POST', body: blob });
				out.push(url);
			});
		}
	} finally { vp.setCamera(cam); }
	return out;
}
