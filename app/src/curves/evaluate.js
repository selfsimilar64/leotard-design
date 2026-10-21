// Surface splines: a curve's control points are surface points; the curve is a centripetal
// Catmull-Rom spline through their positions on the reference garment surface, sampled every
// STEP metres and projected back onto that surface, with optional shape modifiers (scallop,
// zigzag, wave) applied across the curve. Corner points break the tangent. The result is a dense
// polyline of surface points, which is what the arrangement cuts the garment with and what stone
// rows and trims follow. Spec: knowledge/engineering/architecture/editor-architecture.md, item 1.
import * as THREE from 'three';
import { fromSP } from '../body/surface.js';

export const STEP = 0.0015;

const _p = new THREE.Vector3(), _q = new THREE.Vector3(), _n = new THREE.Vector3(), _t = new THREE.Vector3(), _m = new THREE.Vector3();

// Walk from face f0 towards the point on the surface closest to p: step across the edge whose
// barycentric is most negative until p projects inside the face. Stays on the same sheet of the
// body (a torso curve never jumps to the arm), unlike a global closest-point query.
export function walkTo(surf, p, f0, out = {}) {
	let f = f0;
	for (let it = 0; it < 40; it++) {
		surf.baryOf(f, p, out);
		const b = [out.b0, out.b1, out.b2];
		let k = 0;
		if (b[1] < b[k]) k = 1;
		if (b[2] < b[k]) k = 2;
		if (b[k] >= -1e-9) break;
		// the edge opposite corner k is edge (k + 1) % 3
		const g = surf.faceAdj[f * 3 + (k + 1) % 3];
		if (g < 0) break;
		f = g;
	}
	clamp(out);
	return out;
}
function clamp(o) {
	let b0 = Math.max(o.b0, 0), b1 = Math.max(o.b1, 0), b2 = Math.max(o.b2, 0);
	const s = b0 + b1 + b2 || 1;
	o.b0 = b0 / s; o.b1 = b1 / s; o.b2 = b2 / s;
}

// Project p onto the surface near face f0 (walk), falling back to the global closest point when
// the walk ends far away (it can stall in a fold).
export function projectNear(surf, p, f0, out = {}) {
	if (f0 >= 0) {
		walkTo(surf, p, f0, out);
		const d = surf.pos(out, _q).distanceTo(p);
		if (d < 0.004) { out.dist = d; return out; }
	}
	return surf.closest(p, out);
}

function catmull(P0, P1, P2, P3, t, out) {
	const a = 0.5;
	const d01 = Math.max(P0.distanceTo(P1) ** a, 1e-6), d12 = Math.max(P1.distanceTo(P2) ** a, 1e-6), d23 = Math.max(P2.distanceTo(P3) ** a, 1e-6);
	const t0 = 0, t1 = d01, t2 = t1 + d12, t3 = t2 + d23, u = t1 + (t2 - t1) * t;
	const L = (A, B, ta, tb, x) => _tmp(A, B, (x - ta) / (tb - ta));
	const A1 = L(P0, P1, t0, t1, u), A2 = L(P1, P2, t1, t2, u), A3 = L(P2, P3, t2, t3, u);
	const B1 = A1.clone().lerp(A2, (u - t0) / (t2 - t0)), B2 = A2.clone().lerp(A3, (u - t1) / (t3 - t1));
	return out.copy(B1).lerp(B2, (u - t1) / (t2 - t1));
}
const _tmp = (A, B, w) => A.clone().lerp(B, w);

// Control point positions and kinds for a curve, with mirroring applied. A point attached to
// another curve ({ on: { curve, t } }) sits exactly on that curve's polyline (resolveOn), so
// the two meet in a clean junction and the point follows when that curve moves.
export function controlPoints(curve, surf, mirrorFn, resolveOn) {
	return curve.points.map((pt) => {
		let sp = pt.on && resolveOn ? resolveOn(pt.on, !!mirrorFn) : null;
		if (!sp) { sp = fromSP(pt.sp); if (mirrorFn) sp = mirrorFn(sp); }
		return { sp, p: surf.pos(sp), corner: pt.kind === 'corner' };
	});
}

// -> { sps: [{ f, b0, b1, b2 }], pts: Vector3[], s: number[] (arc length), closed, ctrlIndex: sample index of each control point }
// Sampled on surf.open when there is one (the reference body with its arms raised,
// body/reference.js), so no sample of a line through the armpit lands on the arm; the samples are
// then placed on surf itself.
export function evaluateCurve(curve, surf, { mirror = null, step = STEP, resolveOn = null } = {}) {
	const out = sampleCurve(curve, surf.open ?? surf, mirror, step, resolveOn);
	if (surf.open) { out.pts = out.sps.map((sp) => surf.pos(sp)); arcLength(out); }
	return out;
}

function sampleCurve(curve, surf, mirror, step, resolveOn) {
	const cps = controlPoints(curve, surf, mirror, resolveOn), n = cps.length, closed = !!curve.closed && n >= 3;
	const out = { sps: [], pts: [], s: [], closed, ctrlIndex: [] };
	if (n === 0) return out;
	if (n === 1) { out.sps.push(cps[0].sp); out.pts.push(cps[0].p.clone()); out.s.push(0); out.ctrlIndex.push(0); return out; }
	const segs = closed ? n : n - 1, P = (i) => cps[((i % n) + n) % n];
	const phantomBefore = (i) => { // P_{i-1}, or a reflection when i starts the curve or is a corner
		if ((!closed && i === 0) || P(i).corner) return P(i).p.clone().multiplyScalar(2).sub(P(i + 1).p);
		return P(i - 1).p;
	};
	const phantomAfter = (j) => { // P_{j+1}
		if ((!closed && j === n - 1) || P(j).corner) return P(j).p.clone().multiplyScalar(2).sub(P(j - 1).p);
		return P(j + 1).p;
	};
	let face = cps[0].sp.f;
	const proj = {};
	for (let i = 0; i < segs; i++) {
		const A = P(i), B = P(i + 1), P0 = phantomBefore(i), P3 = phantomAfter(i + 1);
		let len = 0, prev = A.p.clone();
		for (let k = 1; k <= 12; k++) { const q = catmull(P0, A.p, B.p, P3, k / 12, new THREE.Vector3()); len += q.distanceTo(prev); prev = q; }
		const m = Math.max(1, Math.ceil(len / step));
		out.ctrlIndex.push(out.sps.length);
		out.sps.push({ ...A.sp }); out.pts.push(A.p.clone());
		face = A.sp.f;
		for (let k = 1; k < m; k++) {
			catmull(P0, A.p, B.p, P3, k / m, _p);
			projectNear(surf, _p, face, proj);
			face = proj.f;
			out.sps.push({ f: proj.f, b0: proj.b0, b1: proj.b1, b2: proj.b2 });
			out.pts.push(surf.pos(proj));
		}
	}
	if (!closed) { const L = cps[n - 1]; out.ctrlIndex.push(out.sps.length); out.sps.push({ ...L.sp }); out.pts.push(L.p.clone()); }
	arcLength(out);
	if (curve.shape && curve.shape.mod && curve.shape.mod !== 'none' && curve.shape.amp) applyShape(out, curve.shape, surf);
	return out;
}

function arcLength(c) {
	c.s = [0];
	for (let i = 1; i < c.pts.length; i++) c.s.push(c.s[i - 1] + c.pts[i].distanceTo(c.pts[i - 1]));
	c.length = c.s[c.s.length - 1] + (c.closed && c.pts.length > 1 ? c.pts[c.pts.length - 1].distanceTo(c.pts[0]) : 0);
}

// Shape modifiers: displace across the curve (in the surface, to the curve's left) by a periodic
// profile of arc length. amp < 0 puts scallops on the other side.
export function shapeOffset(mod, s, amp, period) {
	const x = s / period;
	if (mod === 'wave') return amp * Math.sin(2 * Math.PI * x);
	if (mod === 'zigzag') return amp * (4 * Math.abs(x - Math.floor(x + 0.5)) - 1); // triangle wave in [-amp, amp]
	if (mod === 'scallop') return amp * Math.abs(Math.sin(Math.PI * x));
	return 0;
}

function applyShape(c, shape, surf) {
	const n = c.pts.length, period = Math.max(shape.period || 0.01, 0.002);
	// whole periods along the curve, so a closed curve's pattern meets itself
	const P = c.closed ? c.length / Math.max(Math.round(c.length / period), 1) : period;
	const sps = [], pts = [], proj = {};
	for (let i = 0; i < n; i++) {
		const a = c.pts[Math.max(i - 1, 0)], b = c.pts[Math.min(i + 1, n - 1)];
		_t.subVectors(c.closed && i === 0 ? c.pts[1] : b, c.closed && i === 0 ? c.pts[n - 1] : a).normalize();
		surf.faceNormal(c.sps[i].f, _n);
		_m.crossVectors(_n, _t).normalize();
		const d = shapeOffset(shape.mod, c.s[i], shape.amp, P);
		_p.copy(c.pts[i]).addScaledVector(_m, d);
		projectNear(surf, _p, c.sps[i].f, proj);
		sps.push({ f: proj.f, b0: proj.b0, b1: proj.b1, b2: proj.b2 });
		pts.push(surf.pos(proj));
	}
	c.sps = sps; c.pts = pts;
	arcLength(c);
}
