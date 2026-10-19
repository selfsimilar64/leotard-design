// Point specs: the ways a command can name a point on the body, all resolved to a surface point
// { f, b0, b1, b2 } on the canonical mesh:
//   { sp: { f, b: [b1, b2] } }        exact surface point
//   { p: [x, y, z] }                  reference-body position (metres, y up, +z front) -> closest point
//   { front: [x, y] } / { back: [x, y] }   frontal-plane position on the front or back of the torso
//   { lm: 'shoulder_l', d: [dx, dy, dz] }  a rig landmark (+ offset) -> closest point, or a skin
//                                     landmark such as 'navel', 'waist-l', 'bust-l' (body/landmarks.js)
//   { curve: 'c3', t: 0.25 }          a point along an evaluated curve (0..1 of its length)
//   { mirror: <spec> }                the mirror image (x -> -x) of another spec
//   { photo: { ref: 'r1', px: [x, y], part?: torso|arm|any } }  the body under a pixel of a
//                                     reference photo (solved camera); torso hits win over arms by default
// The context gives the reference surface, the mannequin and the evaluated curves.
import * as THREE from 'three';
import { fromSP } from '../body/surface.js';
import { rayThrough } from '../render/camera-solve.js';

const _v = new THREE.Vector3();

export function resolvePoint(spec, ctx) {
	if (!spec || typeof spec !== 'object') throw new Error('A point is an object such as { front: [x, y] } or { p: [x, y, z] }');
	const S = ctx.surf;
	if (spec.sp) return fromSP(spec.sp);
	if (spec.p) { const r = S.closest(_v.fromArray(spec.p)); if (!r) throw new Error('point off the body'); return strip(r); }
	if (spec.front || spec.back) {
		const [x, y] = spec.front ?? spec.back;
		const r = ctx.man.projectFront(x, y, !!spec.back);
		if (!r) throw new Error(`No torso at ${spec.front ? 'front' : 'back'} [${x}, ${y}]`);
		return { f: r.f, b0: r.b0, b1: r.b1, b2: r.b2 };
	}
	if (spec.lm) {
		const l = ctx.man.refLm[spec.lm];
		// surface landmarks (body/landmarks.js: navel, waist-l, bust-l, cf-neck, ...) are points on the skin
		const s = !l && ctx.landmarks?.[spec.lm];
		if (s) {
			if (!spec.d) return { f: s.f, b0: s.b0, b1: s.b1, b2: s.b2 };
			const p = S.pos(s), d = spec.d;
			return strip(S.closest(_v.set(p.x + d[0], p.y + d[1], p.z + d[2])));
		}
		if (!l) throw new Error(`No landmark ${spec.lm}. Landmarks: ${[...Object.keys(ctx.man.refLm), ...Object.keys(ctx.landmarks ?? {})].join(', ')}`);
		const d = spec.d ?? [0, 0, 0];
		return strip(S.closest(_v.set(l[0] + d[0], l[1] + d[1], l[2] + d[2])));
	}
	if (spec.curve) {
		const c = ctx.evaluated?.get(spec.curve);
		if (!c) throw new Error(`No curve ${spec.curve}`);
		return pointAlong(c, spec.t ?? 0);
	}
	if (spec.mirror) return mirrorSP(resolvePoint(spec.mirror, ctx), S);
	if (spec.photo) {
		const { ref, px } = spec.photo;
		const r = ctx.doc?.reference.find((x) => x.id === ref);
		if (!r) throw new Error('No reference photo ' + ref);
		if (!r.camera) throw new Error('Solve the camera of ' + ref + ' first (reference.solve)');
		const part = spec.photo.part ?? 'torso';
		let hit = ctx.pickRay(rayThrough(r.camera, px), part);
		// a point on the photographed silhouette can fall just off the mannequin: step inwards
		const c = r.camera.crop ?? [0, 0, ...r.size], cx = (c[0] + c[2]) / 2;
		for (let k = 1; !hit && k <= 8; k++) hit = ctx.pickRay(rayThrough(r.camera, [px[0] + Math.sign(cx - px[0]) * 2 * k, px[1]]), part);
		if (!hit) throw new Error('Pixel [' + px.join(', ') + '] of ' + ref + ' is not on the body');
		return strip(hit);
	}
	throw new Error(`Unknown point spec ${JSON.stringify(spec)}`);
}

const strip = (r) => ({ f: r.f, b0: r.b0, b1: r.b1, b2: r.b2 });

// Point at fraction t of an evaluated curve's length (surface point of the nearest sample).
export function pointAlong(c, t) {
	const L = c.s[c.s.length - 1], target = THREE.MathUtils.clamp(t, 0, 1) * L;
	let i = 0;
	while (i < c.s.length - 1 && c.s[i + 1] < target) i++;
	return { ...c.sps[Math.min(i + (c.s[i + 1] - target < target - c.s[i] ? 1 : 0), c.sps.length - 1)] };
}

// Mirror image of a surface point across the body's mid-plane (x = 0). The body is symmetric, so
// the closest point to the mirrored position is the mirrored surface point.
const mirrorCache = new WeakMap();
export function mirrorSP(sp, S) {
	let cache = mirrorCache.get(S);
	if (!cache) mirrorCache.set(S, cache = new Map());
	const key = sp.f + ':' + sp.b0.toFixed(6) + ':' + sp.b1.toFixed(6);
	let m = cache.get(key);
	if (!m) {
		const p = S.pos(sp, _v);
		p.x = -p.x;
		m = strip(S.closest(p));
		if (cache.size > 200000) cache.clear();
		cache.set(key, m);
	}
	return { ...m };
}
