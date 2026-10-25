// Block library: starting garments, each just a set of editable curves (necklines, armholes or
// sleeve seams and cuffs, leg lines) and panel seeds. Lines come from scalar fields on the
// reference body (the same family as the POC's regions), traced as zero contours and resampled
// into a few smooth control points, so every block line is an ordinary curve the designer drags.
// The fields are written in the design frame (man.design: the earlier MakeHuman mannequin's
// coordinates, body/mannequin.js), where every number below was measured.
import * as THREE from 'three';
import { toSP, fromSP } from '../body/surface.js';
import { evaluateCurve } from '../curves/evaluate.js';

const { min, max, abs, sqrt, hypot } = Math;
const clamp = (x, a, b) => min(max(x, a), b);
const mix = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ellOut = (x, y, cx, cy, rx, ry) => (sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2) - 1) * min(rx, ry);
// V opening above y = yV + k |x|, as a field positive in the fabric (metres, roughly)
const vOut = (x, y, yV, k) => (yV + k * abs(x) - y) / sqrt(1 + k * k);

const NECK_TOP = 1.47;

// The elements of a leotard a designer picks one at a time (ui/Inspector.jsx Shape pane). Each
// option is a set of block lines and panels; block.set swaps only the lines of one element.
export const BLOCK_OPTIONS = {
	neck: ['crew', 'scoop', 'v', 'high', 'boat', 'square'],
	back: ['crew', 'scoop', 'low', 'v', 'keyhole', 'open', 'square'],
	sleeves: ['tank', 'cap', 'short', 'three-quarter', 'long'],
	// sleeveless only: the shoulder strap the neckline, back and armhole all start from (STRAPS).
	// 'wide' is the tank before straps existed (about 11 cm), kept for designs saved without one.
	strap: ['tank', 'narrow', 'thin', 'racer', 'wide'],
	leg: ['standard', 'high', 'competition'],
	armhole: ['set-in', 'raglan'],
	// front top: a yoke seam across the chest (a mesh yoke in most moodboard designs)
	yoke: ['none', 'sweetheart', 'v', 'straight', 'round'],
	// front lower: a waist seam from side seam to side seam across the front
	waist: ['none', 'straight', 'v', 'peak'],
};
export const DEFAULT_BLOCK = { neck: 'scoop', back: 'scoop', sleeves: 'long', leg: 'high', armhole: 'set-in', yoke: 'none', waist: 'none', strap: 'tank' };
// The block a document was made with: a design saved before straps existed has the wide strap.
export const blockOf = (doc) => ({ ...DEFAULT_BLOCK, ...(doc.meta.block ? { strap: 'wide' } : {}), ...(doc.meta.block ?? {}) });

// Which necklines and backs each strap allows (sleeveless only). Thin and narrow straps leave no
// fabric across the shoulders, so a crew, high or boat neck (or a closed back) cannot sit between
// them; a racer cut comes in so far that only a crew or high neck and a closed back keep a strap.
const STRAP_ALLOWS = {
	narrow: { neck: ['square', 'scoop', 'v'], back: ['square', 'scoop', 'low', 'v', 'open'] },
	thin: { neck: ['square', 'scoop', 'v'], back: ['square', 'scoop', 'low', 'v', 'open'] },
	racer: { neck: ['crew', 'high'], back: ['crew', 'keyhole'] },
};
// What a strap change turns a neckline or back it does not allow into.
const STRAP_FALLBACK = { narrow: { neck: 'square', back: 'scoop' }, thin: { neck: 'square', back: 'scoop' }, racer: { neck: 'crew', back: 'crew' } };
export function blockAllows(opts, key, option) {
	const a = opts.sleeves === 'tank' ? STRAP_ALLOWS[opts.strap]?.[key] : null;
	return !a || a.includes(option);
}
// The options with any neckline or back the strap does not allow replaced (keys in `keep` are
// the ones asked for: those are not replaced, and a conflict there is an error).
export function fitToStrap(opts, keep = []) {
	const out = { ...opts };
	for (const k of ['neck', 'back']) {
		if (blockAllows(out, k, out[k])) continue;
		if (keep.includes(k)) throw new Error(`A ${out[k]} ${k === 'neck' ? 'neckline' : 'back'} does not go with ${out.strap} straps (it can be: ${STRAP_ALLOWS[out.strap][k].join(', ')})`);
		out[k] = STRAP_FALLBACK[out.strap][k];
	}
	return out;
}

// Which block lines (keys) and panels each element owns: changing the element regenerates these
// and leaves every other line as it is. Construction seams that end on an element's line are
// regenerated with it (their attachments would otherwise land at a different point along the
// new line).
export const ELEMENT_CURVES = {
	neck: ['neck', 'keyhole1', 'keyhole2', 'shoulder', 'ragF', 'ragB'],
	back: ['neck', 'keyhole1', 'keyhole2', 'shoulder', 'ragF', 'ragB'],
	sleeves: ['arm', 'cuff', 'underarm', 'shoulder', 'ragF', 'ragB', 'side', 'yoke'],
	armhole: ['arm', 'cuff', 'underarm', 'shoulder', 'ragF', 'ragB', 'side', 'yoke'],
	leg: ['leg', 'side', 'crotch'],
	yoke: ['yoke'],
	waist: ['waist'],
	strap: ['neck', 'keyhole1', 'keyhole2', 'arm', 'shoulder', 'side', 'yoke'],
};
export const ELEMENT_PANELS = { sleeves: ['sleeve'], armhole: ['sleeve'], yoke: ['yoke'], waist: ['lower', 'front'] };
// Designs saved before lines carried their block key: the key from the line's or panel's name.
const KEY_OF_NAME = {
	Neckline: 'neck', 'Back opening': 'keyhole1', 'Leg line': 'leg', Armhole: 'arm', 'Sleeve seam': 'arm', Cuff: 'cuff', 'Side seam': 'side', 'Shoulder seam': 'shoulder',
	'Crotch seam': 'crotch', 'Underarm seam': 'underarm', 'Raglan seam (front)': 'ragF', 'Raglan seam (back)': 'ragB', 'Yoke seam': 'yoke', 'Waist seam': 'waist',
	Front: 'front', Back: 'back', Sleeve: 'sleeve', Yoke: 'yoke', 'Lower front': 'lower',
};
export const blockKeyOf = (o) => o.block ?? KEY_OF_NAME[o.name] ?? null;

// Opening fields: negative inside the opening, positive on the fabric. Reference-body metres.
// Shoulder straps (sleeveless only), design frame: the strap's inner and outer edge across the
// top of the shoulder (|x|; the neck's side is at about 0.06, the shoulder point at 0.178), and
// where the armhole leaves the strap's outer edge: down the strap to yF (front, back), then out
// to the armhole at 1/c metres across per metre down (a large c runs straight across, as on a
// camisole). The neckline and back run between the inner edges, the armhole from the outer edge,
// so a neckline or back change never moves the strap. Racer: no band; the armhole is cut in
// along xr(y) = x0 + b t + q t^2, t = max(1.34 - y, 0), front and back (the back bows in towards
// the spine between the shoulder blades), and the neckline keeps the strap.
const STRAPS = {
	tank: { xi: 0.085, xo: 0.13, yF: [1.30, 1.30], c: [0.55, 0.55] },
	narrow: { xi: 0.108, xo: 0.138, yF: [1.27, 1.26], c: [0.5, 0.5], band: true },
	thin: { xi: 0.104, xo: 0.116, yF: [1.255, 1.25], c: [0.15, 0.2], band: true },
	racer: { racer: { front: [0.10, 0.29, 0.73], back: [0.10, -1.2, 10] } },
	wide: {},
};
const smin = (a, b, k) => { const h = clamp(0.5 + (b - a) / (2 * k), 0, 1); return mix(b, a, h) - k * h * (1 - h); };
// between narrow or thin straps: an edge from the centre front (back) up to the strap's inner edge
// as a field, clipped to the strap (`d` at the centre, `e` at the strap, a curve or a straight V)
const between = (ax, y, xi, d, e, v) => max((v ? mix(d, e, ax / xi) : d + (e - d) * (ax / xi) ** 2) - y, ax - xi);
function frontNeck(x, y, kind, S) {
	const ax = abs(x);
	if (S.band) switch (kind) {
		case 'square': return between(ax, y, S.xi, 1.26, 1.26);
		case 'v': return between(ax, y, S.xi, 1.18, 1.29, true);
		default: return between(ax, y, S.xi, 1.22, 1.28); // scoop
	}
	switch (kind) {
		case 'crew': return ellOut(x, y, 0, 1.405, 0.074, 0.062);
		// the V clipped by an oval reaching down past its point (a small oval kept the V a crew)
		case 'v': return max(vOut(x, y, 1.265, 1.75), ellOut(x, y, 0, 1.43, 0.08, 0.18));
		case 'high': return null; // a ring round the neck, see neckField
		case 'boat': return ellOut(x, y, 0, 1.43, 0.13, 0.085);
		case 'square': return between(ax, y, 0.085, 1.28, 1.28);
		default: return ellOut(x, y, 0, 1.422, 0.085, 0.14); // scoop (the POC's)
	}
}
function backNeck(x, y, kind, S) {
	const ax = abs(x);
	if (S.band) switch (kind) {
		case 'square': return between(ax, y, S.xi, 1.25, 1.25);
		case 'low': return between(ax, y, S.xi, 1.10, 1.25);
		case 'v': return between(ax, y, S.xi, 1.10, 1.28, true);
		case 'open': return between(ax, y, S.xi, 1.02, 1.24);
		default: return between(ax, y, S.xi, 1.19, 1.27); // scoop
	}
	switch (kind) {
		case 'crew': return ellOut(x, y, 0, 1.42, 0.074, 0.07);
		case 'low': return ellOut(x, y, 0, 1.40, 0.105, 0.29);
		case 'v': return max(vOut(x, y, 1.17, 2.3), ellOut(x, y, 0, 1.43, 0.085, 0.27));
		case 'keyhole': return min(ellOut(x, y, 0, 1.442, 0.066, 0.085), ellOut(x, y, 0, 1.232, 0.04, 0.075));
		case 'open': return min(ellOut(x, y, 0, 1.422, 0.085, 0.12), ellOut(x, y, 0, 1.187, 0.098, 0.15));
		case 'square': return between(ax, y, 0.085, 1.26, 1.26);
		default: return ellOut(x, y, 0, 1.422, 0.085, 0.21); // scoop
	}
}
// The armhole beyond the strap's outer edge (negative inside), front or back; null: none.
function strapCut(ax, y, S, back) {
	if (S.racer) { const [x0, b, q] = S.racer[back ? 'back' : 'front'], t = max(1.34 - y, 0); return x0 + b * t + q * t * t - ax; }
	if (S.xo === undefined) return null;
	const k = back ? 1 : 0;
	return S.xo + S.c[k] * max(S.yF[k] - y, 0) - ax;
}
const SLEEVE_END = { cap: 0.09, short: 0.24, 'three-quarter': 0.7, long: 0.95 };

function fields(man, opts) {
	const N = man.vertices, R = man.design, S = opts.sleeves === 'tank' ? STRAPS[opts.strap] : STRAPS.wide;
	const neck = new Float32Array(N), leg = new Float32Array(N), arm = new Float32Array(N), cuff = new Float32Array(N), seam = new Float32Array(N);
	// Leg cuts, by where the opening peaks at the side (reference body, crotch at 0.765): standard
	// ~0.893 (12.8 cm above the crotch), high ~0.926 (16 cm), competition ~0.976 (21 cm): 1 cm under
	// the hip bone. Competition dress codes keep the leg opening below the hip bone (iliac crest);
	// the crest line sits at about L4, at or just below the navel (navel 0.996 on the reference
	// body), taken here as navel - 1 cm (owner, 2026-10-20: "a typical competition cut").
	const LEG = { standard: [0.95, 0.15], high: [1.5, 0.195], competition: [2.3, 0.34] };
	const [slope, backRise] = LEG[opts.leg];
	for (let i = 0; i < N; i++) {
		const x = R[i * 3], y = R[i * 3 + 1], ax = abs(x), zr = man.form[i * 2], a = man.armF[i], armT = man.armT[i];
		const front = smoothstep(-0.03, 0.015, zr);
		// a high neck is a ring round the neck below the chin (the head's skin weights start
		// there): lower at the front, open everything above it
		const fN = opts.neck === 'high' ? mix(1.395, 1.372, front) - y : frontNeck(x, y, opts.neck, S);
		// with a high neck the back opening (if any) stays its own opening below the neck ring
		const bN = opts.neck === 'high' ? min(mix(1.395, 1.372, front) - y, opts.back === 'crew' ? 1 : max(backNeck(x, y, opts.back, S), y - 1.3)) : backNeck(x, y, opts.back, S);
		neck[i] = man.wHead[i] > 0.5 ? -1 : min(mix(bN, fN, front), NECK_TOP - y);
		const yFront = 0.765 + slope * max(ax - 0.03, 0);
		const yBack = 0.765 + backRise * Math.pow(min(ax / 0.16, 1.3), 2.3);
		leg[i] = mix((y - mix(yBack, yFront, smoothstep(-0.02, 0.035, zr))) * 0.6, 1, smoothstep(0, 0.02, a));
		arm[i] = -a - 0.018;                 // tank armhole, 1.8 cm into the torso from the arm seam
		const cf = strapCut(ax, y, S, false);
		if (cf !== null) arm[i] = smin(arm[i], mix(strapCut(ax, y, S, true), cf, front), 0.012); // cut in to the strap
		seam[i] = -a;                        // the arm's own seam (sleeve set-in line)
		cuff[i] = mix(1, (SLEEVE_END[opts.sleeves] ?? 0.95) - armT, smoothstep(0, 0.02, a)); // sleeve end
	}
	return { neck, leg, arm, cuff, seam };
}

// Zero contour of a per-vertex field as closed loops of surface points.
function loopsOf(man, surf, F) {
	return man.contour(F).map((loop) => loop.map(({ i, j, w }) => {
		let f = -1, k0 = -1, k1 = -1;
		for (let q = surf.vfStart[i]; q < surf.vfStart[i + 1] && f < 0; q++) {
			const g = surf.vf[q], c = [surf.idx[g * 3], surf.idx[g * 3 + 1], surf.idx[g * 3 + 2]];
			const a = c.indexOf(i), b = c.indexOf(j);
			if (a >= 0 && b >= 0) { f = g; k0 = a; k1 = b; }
		}
		const bc = [0, 0, 0]; bc[k0] = 1 - w; bc[k1] = w;
		return { f, b0: bc[0], b1: bc[1], b2: bc[2] };
	}));
}

// Resample a loop to control points about `spacing` apart along the reference garment surface.
function controlsFor(surf, loop, spacing = 0.03, minN = 8) {
	const P = loop.map((sp) => surf.pos(sp)), n = P.length, cum = [0];
	for (let i = 1; i <= n; i++) cum.push(cum[i - 1] + P[i - 1].distanceTo(P[i % n]));
	const L = cum[n], m = max(minN, Math.round(L / spacing)), out = [];
	let s = 0;
	for (let k = 0; k < m; k++) {
		const d = (k / m) * L;
		while (cum[s + 1] < d) s++;
		out.push(loop[(cum[s + 1] - d < d - cum[s] ? s + 1 : s) % n]);
	}
	return out;
}
const centroid = (surf, loop) => loop.reduce((a, sp) => a.add(surf.pos(sp)), new THREE.Vector3()).divideScalar(loop.length);
const curveOf = (surf, loop, role, mirror, spacing, name) => ({ name, role, closed: true, mirror, shape: { mod: 'none', amp: 0, period: 0 }, points: controlsFor(surf, loop, spacing).map((sp) => ({ sp: toSP(sp), kind: 'smooth' })) });

// -> { curves: [{ key, name, role, closed, mirror, shape, points }], panels: [{ name, seed, mirror, stack }] }
// Curve points may be attached to other block curves ({ on: { curve: key, t, mirror? } }); the
// command that inserts the block maps keys to curve ids.
// Memoised per (man, surf) and arguments: block.set builds the current block and the next one on
// every change (~0.1 s each), and the current one is usually the last change's next. Everything a
// block reads is the reference body's (design frame, arm, surface). Callers get their own copies.
const blockCache = new WeakMap(), BLOCK_CACHE = 16;
export function makeBlock(man, surf, opts = {}, stack) {
	const key = JSON.stringify([opts, stack ?? null]);
	let bySurf = blockCache.get(man);
	if (!bySurf) blockCache.set(man, (bySurf = new WeakMap()));
	let memo = bySurf.get(surf);
	if (!memo) bySurf.set(surf, (memo = new Map()));
	let b = memo.get(key);
	if (!b) {
		b = buildBlock(man, surf, opts, stack);
		memo.set(key, b);
		if (memo.size > BLOCK_CACHE) memo.delete(memo.keys().next().value);
	}
	// (copied by hand: curve points carry THREE.Vector3 positions, p, that structuredClone would flatten)
	const pt = (q) => { const o = { ...q }; if (q.sp) o.sp = structuredClone(q.sp); if (q.on) o.on = structuredClone(q.on); if (q.p) o.p = q.p.clone(); return o; };
	return { curves: b.curves.map((c) => ({ ...c, ...(c.shape ? { shape: { ...c.shape } } : {}), points: c.points.map(pt) })), panels: b.panels.map((q) => ({ ...q, seed: structuredClone(q.seed), stack: structuredClone(q.stack) })), fabric: b.fabric };
}
function buildBlock(man, surf, opts = {}, stack = [{ fabric: 'mystique', colour: '#2b1d6e', second: 'Tone-on-tone' }]) {
	opts = { ...DEFAULT_BLOCK, ...Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined)) };
	for (const k of Object.keys(BLOCK_OPTIONS)) if (!BLOCK_OPTIONS[k].includes(opts[k])) throw new Error(`${k} must be one of: ${BLOCK_OPTIONS[k].join(', ')}`);
	opts = fitToStrap(opts);
	const F = fields(man, opts), curves = [], panels = [];
	const add = (key, c) => { c.key = key; curves.push(c); return c; };
	// neckline (and a back keyhole when there is one): symmetric loops across the mid-plane
	const neckLoops = loopsOf(man, surf, F.neck).sort((a, b) => centroid(surf, b).y - centroid(surf, a).y);
	neckLoops.forEach((l, i) => add(i === 0 ? 'neck' : 'keyhole' + i, curveOf(surf, l, 'edge', 'none', 0.025, i === 0 ? 'Neckline' : 'Back opening')));
	// leg lines: one per leg; keep the wearer's left (x > 0) and mirror it
	const leg = loopsOf(man, surf, F.leg).filter((l) => centroid(surf, l).x > 0.02)[0];
	add('leg', curveOf(surf, leg, 'edge', 'both', 0.03, 'Leg line'));
	const left = (loops) => loops.filter((l) => centroid(surf, l).x > 0.05);
	const tank = opts.sleeves === 'tank', raglan = !tank && opts.armhole === 'raglan';
	let setIn = null; // a raglan block still finds its armpit on the set-in line, which it does not keep
	if (tank) add('arm', curveOf(surf, left(loopsOf(man, surf, F.arm))[0], 'edge', 'both', 0.025, 'Armhole'));
	else {
		setIn = curveOf(surf, left(loopsOf(man, surf, F.seam))[0], 'seam', 'both', 0.025, 'Sleeve seam');
		if (!raglan) add('arm', setIn);
		add('cuff', curveOf(surf, left(loopsOf(man, surf, F.cuff))[0], 'edge', 'both', 0.02, 'Cuff'));
	}

	// --- construction seams: shoulder, side, crotch and underarm, so every piece lies flat ------
	const ev = new Map(curves.map((c) => [c.key, evaluateCurve(c, surf)]));
	if (raglan) ev.set('arm', evaluateCurve(setIn, surf));
	const R = man.ref, N = man.vertices, zr = (i) => man.form[i * 2];
	const vsp = (i) => { const f = surf.vf[surf.vfStart[i]], c = [surf.idx[f * 3], surf.idx[f * 3 + 1], surf.idx[f * 3 + 2]]; return { f, b0: c[0] === i ? 1 : 0, b1: c[1] === i ? 1 : 0, b2: c[2] === i ? 1 : 0 }; };
	const vpos = (i) => new THREE.Vector3(R[i * 3], R[i * 3 + 1], R[i * 3 + 2]);
	// attach to the sample of a block curve that best satisfies score(p) (lowest wins)
	const attach = (key, score) => {
		const e = ev.get(key);
		let bi = 0, bs = Infinity;
		e.pts.forEach((p, i) => { const s = score(p); if (s < bs) { bs = s; bi = i; } });
		return { sp: toSP(e.sps[bi]), on: { curve: key, t: e.s[bi] / Math.max(e.s[e.s.length - 1], 1e-9) }, kind: 'smooth', p: e.pts[bi] };
	};
	// the torso vertex on the side seam line (zr = 0) at height y, on the left side
	const sideAt = (y, xMin = 0.03) => {
		let bi = -1, bs = Infinity;
		for (let i = 0; i < N; i++) {
			if (man.wArm[i] > 0.2 || man.wHead[i] > 0.3 || R[i * 3] < xMin) continue;
			const s = abs(zr(i)) + abs(R[i * 3 + 1] - y) * 2;
			if (s < bs) { bs = s; bi = i; }
		}
		return bi;
	};
	const pt = (i) => ({ sp: toSP(vsp(i)), kind: 'smooth' });
	const seam = (key, name, points, mirror = 'both') => add(key, { name, role: 'seam', closed: false, mirror, shape: { mod: 'none', amp: 0, period: 0 }, points: points.map(({ p, ...rest }) => rest) });

	// side seam: from the armpit (lowest point of the armhole on the left) down to the leg line at the hip
	let armpit = attach('arm', (p) => (p.x < 0.02 ? Infinity : p.y + abs(p.z - man.zMid(p.y)) * 0.5));
	if (raglan) {
		// raglan: two seams from the neckline diagonally to the armpit, front and back, instead of
		// the set-in line and the shoulder seam; the sleeve piece runs up to the neck
		const { on, ...free } = armpit, rag = (key, name, back) => {
			const side = (p) => (back ? man.zMid(p.y) - p.z : p.z - man.zMid(p.y));
			const neckPt = attach('neck', (p) => (p.x < 0.02 || side(p) < 0 ? Infinity : abs(p.x - 0.07) - side(p) * 0.2));
			const crease = attach('arm', (p) => (p.x < 0.02 ? Infinity : abs(p.y - (free.p.y + 0.06)) * 3 - side(p)));
			const midP = surf.closest(neckPt.p.clone().lerp(crease.p, 0.5));
			const strip = ({ on: _, p, ...r }) => r;
			seam(key, name, [neckPt, { sp: toSP(midP), kind: 'smooth' }, strip(crease), strip(free)].map((q) => ({ p: null, ...q })));
		};
		rag('ragF', 'Raglan seam (front)', false);
		armpit = { ...free, on: { curve: 'ragF', t: 1 } };
		rag('ragB', 'Raglan seam (back)', true);
		curves[curves.length - 1].points[3] = { sp: armpit.sp, on: armpit.on, kind: 'smooth' };
	}
	const hip = attach('leg', (p) => (p.x < 0.05 ? Infinity : abs(p.z - man.zMid(p.y)) - p.y * 0.05));
	const sides = [];
	for (let y = armpit.p.y - 0.045; y > hip.p.y + 0.03; y -= 0.035) sides.push(pt(sideAt(y)));
	seam('side', 'Side seam', [armpit, ...sides, hip]);

	// shoulder seam: from the neckline at the side to the armhole at the top of the shoulder
	if (!raglan) {
		const neckSide = attach('neck', (p) => (p.x < 0.02 ? Infinity : abs(p.z - man.zMid(p.y)) + abs(p.x - 0.07) * 0.2));
		const shoulderTop = attach('arm', (p) => (p.x < 0.02 ? Infinity : -p.y + abs(p.z - man.zMid(p.y)) * 0.5));
		const mid = neckSide.p.clone().lerp(shoulderTop.p, 0.5);
		let mi = -1, md = Infinity;
		for (let i = 0; i < N; i++) { if (R[i * 3] < 0.02 || man.wHead[i] > 0.3) continue; const d = vpos(i).distanceTo(mid) + abs(zr(i)); if (d < md) { md = d; mi = i; } }
		seam('shoulder', 'Shoulder seam', [neckSide, pt(mi), shoulderTop]);
	}

	// crotch seam: across the gusset, joining the two leg lines where front meets back
	const crotchL = attach('leg', (p) => (p.x < 0 ? Infinity : abs(p.z - man.zMid(p.y)) * 2 + p.y));
	let ci = -1, cd = Infinity;
	for (let i = 0; i < N; i++) { if (man.wHead[i] > 0.3 || man.wArm[i] > 0.2) continue; const d = abs(R[i * 3]) + abs(zr(i)) + abs(R[i * 3 + 1] - man.crotchY) * 0.5; if (d < cd) { cd = d; ci = i; } }
	const crotchR = { ...crotchL, on: { ...crotchL.on, mirror: true }, sp: toSP(mirrorSPLocal(surf, crotchL.sp)) };
	seam('crotch', 'Crotch seam', [crotchL, pt(ci), crotchR], 'none');

	// underarm seam: along the inside of the sleeve, from the armpit to the cuff
	if (!tank) {
		const { SH, EL, WR, L1, L2 } = man.arm, end = SLEEVE_END[opts.sleeves];
		const axisAt = (t) => { const s = t * (L1 + L2), a = s < L1 ? SH : EL, b = s < L1 ? EL : WR, u = s < L1 ? s / L1 : (s - L1) / L2; return { c: new THREE.Vector3(mix(a[0], b[0], u), mix(a[1], b[1], u), mix(a[2], b[2], u)), dir: new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize() }; };
		const inner = (t) => {
			const { c, dir } = axisAt(t), inward = new THREE.Vector3(-1, 0, 0).addScaledVector(dir, dir.x).normalize();
			let bi = -1, bs = -Infinity;
			for (let i = 0; i < N; i++) {
				if (man.wArm[i] < 0.5 || R[i * 3] < 0.05 || abs(man.armT[i] - t) > 0.02) continue;
				const s = vpos(i).sub(c).dot(inward);
				if (s > bs) { bs = s; bi = i; }
			}
			return bi;
		};
		const cuffIn = attach('cuff', (p) => -p.clone().sub(axisAt(end).c).dot(new THREE.Vector3(-1, 0, 0)));
		const pts = [];
		for (let t = 0.2; t < end - 0.06; t += 0.12) { const i = inner(t); if (i >= 0) pts.push(pt(i)); }
		seam('underarm', 'Underarm seam', [armpit, ...pts, cuffIn]);
	}

	// --- front elements: a yoke seam across the chest, a waist seam across the front -------------
	// Open lines in the design frame (metres), their ends attached to the armhole / sleeve or raglan
	// seam (yoke) or the side seam (waist); the right end on the mirror image of that line.
	ev.set('side', evaluateCurve(curves.find((c) => c.key === 'side'), surf));
	const frontSP = (x, y) => { const r = man.projectFront(x, y, false); if (!r) throw new Error(`No torso at front [${x}, ${y}]`); return r; };
	// the torso's front at (x, y), or nearer the centre where the torso is narrower than x
	const frontPos = (x, y) => { let r = null; for (let k = 0; !r && k < 4; k++) r = man.projectFront(x - k * 0.02, y, false); return surf.pos(r ?? frontSP(0, y)); };
	const across = (key, name, onKey, shape) => {
		// shape: { end: y at the ends (|x| = 0.125 / 0.12), mid: [x, y], centre: y, corner }
		const xe = onKey === 'side' ? 0.12 : 0.125, target = frontPos(xe, shape.end);
		if (!ev.has(onKey)) ev.set(onKey, evaluateCurve(curves.find((c) => c.key === onKey), surf));
		const end = attach(onKey, (p) => p.distanceToSquared(target));
		const endR = { sp: toSP(mirrorSPLocal(surf, end.sp)), on: { ...end.on, mirror: true }, kind: 'smooth' };
		const [mx, my] = shape.mid;
		const pts = [
			{ sp: end.sp, on: end.on, kind: 'smooth' },
			{ sp: toSP(frontSP(mx, my)), kind: 'smooth' },
			{ sp: toSP(frontSP(0, shape.centre)), kind: shape.corner ? 'corner' : 'smooth' },
			{ sp: toSP(frontSP(-mx, my)), kind: 'smooth' },
			endR,
		];
		add(key, { name, role: 'seam', closed: false, mirror: 'none', shape: { mod: 'none', amp: 0, period: 0 }, points: pts });
	};
	const YOKES = {
		sweetheart: { end: 1.19, mid: [0.07, 1.255], centre: 1.215, corner: true },
		v: { end: 1.27, mid: [0.065, 1.22], centre: 1.17, corner: true },
		straight: { end: 1.22, mid: [0.07, 1.22], centre: 1.22 },
		round: { end: 1.25, mid: [0.07, 1.215], centre: 1.195 },
	};
	const WAISTS = {
		straight: { end: 1.04, mid: [0.06, 1.04], centre: 1.04 },
		v: { end: 1.06, mid: [0.06, 1.03], centre: 0.995, corner: true },
		peak: { end: 1.02, mid: [0.06, 1.055], centre: 1.095, corner: true },
	};
	// the yoke seam stays at least 3.5 cm below the neckline (a square neck between narrow or thin
	// straps sits as low as the yokes' own heights); the yoke piece is seeded between the two
	const S = tank ? STRAPS[opts.strap] : STRAPS.wide;
	const neckY = (x) => { if (opts.neck === 'high') return 1.372; let y = NECK_TOP; while (y > 1 && frontNeck(x, y, opts.neck, S) < 0) y -= 0.002; return y; };
	let yoke = null;
	if (opts.yoke !== 'none') {
		const sh = YOKES[opts.yoke], [mx, my] = sh.mid, dy = min(0, neckY(0) - 0.035 - sh.centre, neckY(mx) - 0.035 - my);
		yoke = { ...sh, end: sh.end + dy, mid: [mx, my + dy], centre: sh.centre + dy };
		across('yoke', 'Yoke seam', raglan ? 'ragF' : 'arm', yoke);
	}
	if (opts.waist !== 'none') across('waist', 'Waist seam', 'side', WAISTS[opts.waist]);

	// panel seeds: the front between the yoke and waist seams (or the whole front), the yoke above
	// and the lower front below them, the back low down (below every back opening), the sleeves
	const panel = (key, name, seed, mirror = 'none') => panels.push({ key, name, seed: toSP(seed), mirror, stack: structuredClone(stack) });
	panel('front', 'Front', frontSP(0.07, 1.12));
	if (yoke) panel('yoke', 'Yoke', frontSP(yoke.mid[0], min((yoke.mid[1] + neckY(yoke.mid[0])) / 2, 1.3)));
	if (opts.waist !== 'none') panel('lower', 'Lower front', frontSP(0, 0.95));
	panel('back', 'Back', man.projectFront(0, 0.9, true));
	if (!tank) {
		// a point half way down the sleeve, on the outside of the left arm (mirrored for the right)
		const { SH, EL, L1, L2 } = man.arm, t = (SLEEVE_END[opts.sleeves] * (L1 + L2)) / 2 / L1;
		const c = new THREE.Vector3(mix(SH[0], EL[0], min(t, 1)), mix(SH[1], EL[1], min(t, 1)), mix(SH[2], EL[2], min(t, 1)));
		panel('sleeve', 'Sleeve', surf.closest(c.add(new THREE.Vector3(0.1, 0, 0))), 'both');
	}
	return { curves, panels, fabric: fabricTester(man, surf, F, tank) };
}

// Where the block has fabric: a test of a surface point against the block's opening fields (the
// neck and back openings, the leg openings, the armholes or cuffs). Used by block.set to tell a
// cell the new block opens from one the designer cut.
function fabricTester(man, surf, F, tank) {
	const end = tank ? F.arm : F.cuff, idx = surf.idx;
	const at = (A, i0, i1, i2, sp) => A[i0] * sp.b0 + A[i1] * sp.b1 + A[i2] * sp.b2;
	return (sp) => {
		const i0 = idx[sp.f * 3], i1 = idx[sp.f * 3 + 1], i2 = idx[sp.f * 3 + 2];
		return min(at(F.neck, i0, i1, i2, sp), at(F.leg, i0, i1, i2, sp), at(end, i0, i1, i2, sp)) > 0;
	};
}
// The fabric test alone (no lines): for the block the design was made with.
export function blockFabric(man, surf, opts = {}) {
	opts = fitToStrap({ ...DEFAULT_BLOCK, ...Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined)) });
	return fabricTester(man, surf, fields(man, opts), opts.sleeves === 'tank');
}

function mirrorSPLocal(surf, sp) {
	const p = surf.pos(fromSP(sp));
	p.x = -p.x;
	return surf.closest(p);
}
