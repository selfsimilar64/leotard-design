// Surface splines: a curve's control points are surface points; the curve is a centripetal
// curvature-continuous spline through their positions on the reference garment surface, sampled every
// STEP metres and projected back onto that surface, with optional shape modifiers (scallop,
// zigzag, wave) applied across the curve. Corner points break the tangent. The result is a dense
// polyline of surface points, which is what the arrangement cuts the garment with and what stone
// rows and trims follow. Spec: knowledge/engineering/architecture/editor-architecture.md, item 1.
import * as THREE from 'three';
import { fromSP } from '../body/surface.js';

export const STEP = 0.0015;
const COARSE = 0.01, MAX_DROP = 0.06;

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

// Project a spline sample onto the surface along the surface's smooth normal. The closest point on
// a faceted surface collapses onto the creases between facets (about 5 mm apart on the torso), which
// turns a smooth spline into a line that steps from crease to crease: the wobble the owner saw in
// drawn seams (2026-10-31). Moves the closest point sideways until p lies straight above it.
function projectSmooth(surf, p, f0, out) {
	projectNear(surf, p, f0, out);
	const start = { f: out.f, b0: out.b0, b1: out.b1, b2: out.b2 };
	for (let it = 0; it < 4; it++) {
		surf.pos(out, _q);
		surf.normalAt(out, _n);
		_t.subVectors(p, _q).addScaledVector(_n, -_n.dot(_tmpD.subVectors(p, _q)));
		if (_t.lengthSq() < 1e-10) break;
		walkTo(surf, _q.add(_t), out.f, out);
	}
	// a fold (the armpit, the groin): the smooth normal does not hold there, keep the closest point
	if (surf.pos(out, _q).distanceTo(surf.pos(start, _m)) > 0.004) Object.assign(out, start);
	return out;
}
const _tmpD = new THREE.Vector3();

// A spline sample a long way off the surface (over a hollow, through the chest): along dir, the nearer
// of the two ways, instead of the closest point, which can jump across a hollow. dir blends the
// normals at the span's two ends: the local normal tilts on the slope of the bust and would push the
// line sideways. Falls back to the closest point when nothing is hit.
function dropOnto(surf, p, dir, f, out) {
	_n.copy(dir);
	let best = null;
	for (const sign of [1, -1]) {
		_ray.origin.copy(p); _ray.direction.copy(_n).multiplyScalar(sign);
		const hit = surf.raycast(_ray, {});
		if (hit && hit.distance < MAX_DROP && (!best || hit.distance < best.distance)) best = hit;
	}
	if (best) { out.f = best.f; out.b0 = best.b0; out.b1 = best.b1; out.b2 = best.b2; return out; }
	return projectNear(surf, p, f, out);
}
const _ray = new THREE.Ray();

// Tangents of a curvature-continuous (C2) spline through a run of points, one per point, on
// centripetal knots. Catmull-Rom's bend jumps at every control point, which shows as lumps wherever
// the clicks are unevenly spaced (owner, 2026-10-31). Gauss-Seidel: the system is diagonally dominant.
function runTangents(ps, closed) {
	const n = ps.length, segs = closed ? n : n - 1, dt = [];
	for (let i = 0; i < segs; i++) dt.push(Math.max(ps[i].distanceTo(ps[(i + 1) % n]) ** 0.5, 1e-4));
	const m = ps.map(() => new THREE.Vector3()), rhs = [], v = new THREE.Vector3();
	const chord = (i) => ps[(i + 1) % n].clone().sub(ps[i]).multiplyScalar(1 / dt[i]); // i < segs
	for (let i = 0; i < n; i++) {
		if (!closed && i === 0) rhs.push(chord(0).multiplyScalar(3));
		else if (!closed && i === n - 1) rhs.push(chord(n - 2).multiplyScalar(3));
		else { const a = (i - 1 + n) % n; rhs.push(chord(a).multiplyScalar(3 * dt[i]).addScaledVector(chord(i), 3 * dt[a])); }
	}
	for (let it = 0; it < 60; it++) for (let i = 0; i < n; i++) {
		if (!closed && i === 0) m[0].copy(v.copy(rhs[0]).addScaledVector(m[1], -1)).multiplyScalar(0.5);
		else if (!closed && i === n - 1) m[i].copy(v.copy(rhs[i]).addScaledVector(m[i - 1], -1)).multiplyScalar(0.5);
		else { const a = (i - 1 + n) % n; m[i].copy(v.copy(rhs[i]).addScaledVector(m[a], -dt[i]).addScaledVector(m[(i + 1) % n], -dt[a])).multiplyScalar(1 / (2 * (dt[a] + dt[i]))); }
	}
	return { m, dt };
}

// Cubic Hermite on [0, 1]; h is the knot span the tangents are per.
function hermite(A, B, mA, mB, h, t, out) {
	const t2 = t * t, t3 = t2 * t;
	return out.copy(A).multiplyScalar(2 * t3 - 3 * t2 + 1).addScaledVector(mA, (t3 - 2 * t2 + t) * h).addScaledVector(B, -2 * t3 + 3 * t2).addScaledVector(mB, (t3 - t2) * h);
}

// One segment of the spline per pair of neighbouring control points: [{ a, b, ma, mb, h }]. A corner
// point breaks the line into runs, each its own spline.
function splineSegments(cps, closed) {
	const n = cps.length, segs = closed ? n : n - 1, out = new Array(segs);
	const corners = [];
	for (let i = 0; i < n; i++) if (cps[i].corner) corners.push(i);
	const runs = [];
	if (closed && !corners.length) runs.push({ from: 0, count: n, loop: true });
	else if (closed) corners.forEach((c, k) => runs.push({ from: c, count: ((corners[(k + 1) % corners.length] - c - 1 + n) % n) + 2 }));
	else {
		const stops = [0, ...corners.filter((c) => c > 0 && c < n - 1), n - 1];
		for (let k = 0; k + 1 < stops.length; k++) runs.push({ from: stops[k], count: stops[k + 1] - stops[k] + 1 });
	}
	for (const r of runs) {
		const idx = Array.from({ length: r.count }, (_, k) => (r.from + k) % n), { m, dt } = runTangents(idx.map((i) => cps[i].p), !!r.loop);
		for (let k = 0; k < (r.loop ? r.count : r.count - 1); k++) {
			const i = idx[k], q = (k + 1) % r.count;
			out[i] = { a: cps[i].p, b: cps[idx[q]].p, ma: m[k], mb: m[q], h: dt[k] };
		}
	}
	return out;
}

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
	const segs = closed ? n : n - 1, S = splineSegments(cps, closed);
	const proj = {}, q = new THREE.Vector3();
	let face = cps[0].sp.f;
	for (let i = 0; i < segs; i++) {
		const A = cps[i], sg = S[i];
		let len = 0, prev = A.p.clone();
		for (let k = 1; k <= 12; k++) { hermite(sg.a, sg.b, sg.ma, sg.mb, sg.h, k / 12, q); len += q.distanceTo(prev); prev.copy(q); }
		// First a coarse pass, about every centimetre: how far the spline stands off the body here (it
		// runs through the chest and over the hollow above the bust). The offsets, interpolated, carry
		// the fine samples onto the body without moving them sideways.
		const coarse = Math.max(1, Math.ceil(len / COARSE)), off = [new THREE.Vector3()];
		const nA = surf.normalAt(A.sp), nB = surf.normalAt(cps[(i + 1) % n].sp), dir = new THREE.Vector3();
		face = A.sp.f;
		for (let k = 1; k < coarse; k++) {
			hermite(sg.a, sg.b, sg.ma, sg.mb, sg.h, k / coarse, _p);
			dropOnto(surf, _p, dir.copy(nA).lerp(nB, k / coarse).normalize(), face, proj);
			face = proj.f;
			off.push(surf.pos(proj).sub(_p));
		}
		off.push(new THREE.Vector3());
		const m = Math.max(1, Math.ceil(len / step));
		out.ctrlIndex.push(out.sps.length);
		out.sps.push({ ...A.sp }); out.pts.push(A.p.clone());
		face = A.sp.f;
		for (let k = 1; k < m; k++) {
			const t = k / m, c = t * coarse, c0 = Math.min(Math.floor(c), coarse - 1), w = c - c0;
			hermite(sg.a, sg.b, sg.ma, sg.mb, sg.h, t, _p);
			_p.addScaledVector(off[c0], 1 - w).addScaledVector(off[c0 + 1], w);
			projectSmooth(surf, _p, face, proj);
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
