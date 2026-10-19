// Block library: starting garments, each just a set of editable curves (necklines, armholes or
// sleeve seams and cuffs, leg lines) and panel seeds. Lines come from scalar fields on the
// reference body (the same family as the POC's regions), traced as zero contours and resampled
// into a few smooth control points, so every block line is an ordinary curve the designer drags.
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

export const BLOCK_OPTIONS = {
	neck: ['crew', 'scoop', 'v', 'high', 'boat'],
	back: ['crew', 'scoop', 'low', 'v', 'keyhole', 'open'],
	sleeves: ['tank', 'cap', 'short', 'three-quarter', 'long'],
	leg: ['standard', 'high'],
};
export const DEFAULT_BLOCK = { neck: 'scoop', back: 'scoop', sleeves: 'long', leg: 'high' };

// Opening fields: negative inside the opening, positive on the fabric. Reference-body metres.
function frontNeck(x, y, kind) {
	switch (kind) {
		case 'crew': return ellOut(x, y, 0, 1.405, 0.074, 0.062);
		case 'v': return max(vOut(x, y, 1.265, 1.75), ellOut(x, y, 0, 1.43, 0.075, 0.08));
		case 'high': return null; // a ring round the neck, see neckField
		case 'boat': return ellOut(x, y, 0, 1.43, 0.13, 0.085);
		default: return ellOut(x, y, 0, 1.422, 0.085, 0.14); // scoop (the POC's)
	}
}
function backNeck(x, y, kind) {
	switch (kind) {
		case 'crew': return ellOut(x, y, 0, 1.42, 0.074, 0.07);
		case 'low': return ellOut(x, y, 0, 1.40, 0.105, 0.29);
		case 'v': return max(vOut(x, y, 1.17, 2.3), ellOut(x, y, 0, 1.43, 0.08, 0.08));
		case 'keyhole': return min(ellOut(x, y, 0, 1.442, 0.066, 0.085), ellOut(x, y, 0, 1.232, 0.04, 0.075));
		case 'open': return min(ellOut(x, y, 0, 1.422, 0.085, 0.12), ellOut(x, y, 0, 1.187, 0.098, 0.15));
		default: return ellOut(x, y, 0, 1.422, 0.085, 0.21); // scoop
	}
}
const SLEEVE_END = { cap: 0.09, short: 0.24, 'three-quarter': 0.7, long: 0.95 };

function fields(man, opts) {
	const N = man.vertices, R = man.ref;
	const neck = new Float32Array(N), leg = new Float32Array(N), arm = new Float32Array(N), cuff = new Float32Array(N), seam = new Float32Array(N);
	const slope = opts.leg === 'standard' ? 0.95 : 1.5;
	for (let i = 0; i < N; i++) {
		const x = R[i * 3], y = R[i * 3 + 1], ax = abs(x), zr = man.form[i * 2], a = man.armF[i], armT = man.armT[i];
		const front = smoothstep(-0.03, 0.015, zr);
		// a high neck is a ring round the neck below the chin (the head's skin weights start
		// there): lower at the front, open everything above it
		const fN = opts.neck === 'high' ? mix(1.395, 1.372, front) - y : frontNeck(x, y, opts.neck);
		// with a high neck the back opening (if any) stays its own opening below the neck ring
		const bN = opts.neck === 'high' ? min(mix(1.395, 1.372, front) - y, opts.back === 'crew' ? 1 : max(backNeck(x, y, opts.back), y - 1.3)) : backNeck(x, y, opts.back);
		neck[i] = man.wHead[i] > 0.5 ? -1 : min(mix(bN, fN, front), NECK_TOP - y);
		const yFront = 0.765 + slope * max(ax - 0.03, 0);
		const yBack = 0.765 + (opts.leg === 'standard' ? 0.15 : 0.195) * Math.pow(min(ax / 0.16, 1.3), 2.3);
		leg[i] = mix((y - mix(yBack, yFront, smoothstep(-0.02, 0.035, zr))) * 0.6, 1, smoothstep(0, 0.02, a));
		arm[i] = -a - 0.018;                 // tank armhole, 1.8 cm into the torso from the arm seam
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
export function makeBlock(man, surf, opts = {}, stack = [{ fabric: 'mystique', colour: '#2b1d6e', second: 'Tone-on-tone' }]) {
	opts = { ...DEFAULT_BLOCK, ...Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined)) };
	for (const k of Object.keys(BLOCK_OPTIONS)) if (!BLOCK_OPTIONS[k].includes(opts[k])) throw new Error(`${k} must be one of: ${BLOCK_OPTIONS[k].join(', ')}`);
	const F = fields(man, opts), curves = [], panels = [];
	const add = (key, c) => { c.key = key; curves.push(c); return c; };
	// neckline (and a back keyhole when there is one): symmetric loops across the mid-plane
	const neckLoops = loopsOf(man, surf, F.neck).sort((a, b) => centroid(surf, b).y - centroid(surf, a).y);
	neckLoops.forEach((l, i) => add(i === 0 ? 'neck' : 'keyhole' + i, curveOf(surf, l, 'edge', 'none', 0.025, i === 0 ? 'Neckline' : 'Back opening')));
	// leg lines: one per leg; keep the wearer's left (x > 0) and mirror it
	const leg = loopsOf(man, surf, F.leg).filter((l) => centroid(surf, l).x > 0.02)[0];
	add('leg', curveOf(surf, leg, 'edge', 'both', 0.03, 'Leg line'));
	const left = (loops) => loops.filter((l) => centroid(surf, l).x > 0.05);
	const tank = opts.sleeves === 'tank';
	if (tank) add('arm', curveOf(surf, left(loopsOf(man, surf, F.arm))[0], 'edge', 'both', 0.025, 'Armhole'));
	else {
		add('arm', curveOf(surf, left(loopsOf(man, surf, F.seam))[0], 'seam', 'both', 0.025, 'Sleeve seam'));
		add('cuff', curveOf(surf, left(loopsOf(man, surf, F.cuff))[0], 'edge', 'both', 0.02, 'Cuff'));
	}

	// --- construction seams: shoulder, side, crotch and underarm, so every piece lies flat ------
	const ev = new Map(curves.map((c) => [c.key, evaluateCurve(c, surf)]));
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
	const armpit = attach('arm', (p) => (p.x < 0.02 ? Infinity : p.y + abs(p.z - man.zMid(p.y)) * 0.5));
	const hip = attach('leg', (p) => (p.x < 0.05 ? Infinity : abs(p.z - man.zMid(p.y)) - p.y * 0.05));
	const sides = [];
	for (let y = armpit.p.y - 0.045; y > hip.p.y + 0.03; y -= 0.035) sides.push(pt(sideAt(y)));
	seam('side', 'Side seam', [armpit, ...sides, hip]);

	// shoulder seam: from the neckline at the side to the armhole at the top of the shoulder
	const neckSide = attach('neck', (p) => (p.x < 0.02 ? Infinity : abs(p.z - man.zMid(p.y)) + abs(p.x - 0.07) * 0.2));
	const shoulderTop = attach('arm', (p) => (p.x < 0.02 ? Infinity : -p.y + abs(p.z - man.zMid(p.y)) * 0.5));
	const mid = neckSide.p.clone().lerp(shoulderTop.p, 0.5);
	let mi = -1, md = Infinity;
	for (let i = 0; i < N; i++) { if (R[i * 3] < 0.02 || man.wHead[i] > 0.3) continue; const d = vpos(i).distanceTo(mid) + abs(zr(i)); if (d < md) { md = d; mi = i; } }
	seam('shoulder', 'Shoulder seam', [neckSide, pt(mi), shoulderTop]);

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

	// seeds low on the torso, below every neckline and back opening the blocks offer
	panels.push({ name: 'Front', seed: toSP(man.projectFront(0, 0.95, false)), mirror: 'none', stack: structuredClone(stack) });
	panels.push({ name: 'Back', seed: toSP(man.projectFront(0, 0.9, true)), mirror: 'none', stack: structuredClone(stack) });
	if (!tank) {
		// a point half way down the sleeve, on the outside of the left arm (mirrored for the right)
		const { SH, EL, L1, L2 } = man.arm, t = (SLEEVE_END[opts.sleeves] * (L1 + L2)) / 2 / L1;
		const c = new THREE.Vector3(mix(SH[0], EL[0], min(t, 1)), mix(SH[1], EL[1], min(t, 1)), mix(SH[2], EL[2], min(t, 1)));
		const seed = surf.closest(c.add(new THREE.Vector3(0.1, 0, 0)));
		panels.push({ name: 'Sleeve', seed: toSP(seed), mirror: 'both', stack: structuredClone(stack) });
	}
	return { curves, panels };
}

function mirrorSPLocal(surf, sp) {
	const p = surf.pos(fromSP(sp));
	p.x = -p.x;
	return surf.closest(p);
}
