// A triangle surface with the canonical body topology (same index list for every body, size and
// pose), so a surface point { f, b0, b1, b2 } (face + barycentrics) means the same anatomical spot
// everywhere. Gives closest-point and ray queries through a BVH, face adjacency for walking across
// the mesh, and barycentric helpers. Used for the reference garment surface curves are drawn on,
// and for picking on whatever body is shown.
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

const _p = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
const _tri = new THREE.Triangle(), _bary = new THREE.Vector3();

export class Surface {
	// idx: Uint32Array (shared, not modified); P: Float32Array xyz (copied)
	constructor(idx, P) {
		this.idx = idx;
		this.F = idx.length / 3;
		this.V = P.length / 3;
		this.P = Float32Array.from(P);
		const g = this.geometry = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.BufferAttribute(this.P, 3));
		g.setIndex(new THREE.BufferAttribute(Uint32Array.from(idx), 1));
		// indirect: the BVH keeps its own triangle order, so face ids stay the canonical ones.
		this.bvh = new MeshBVH(g, { indirect: true, targetLeafSize: 8 });
		this.buildAdjacency();
	}

	update(P) { this.P.set(P); this.geometry.attributes.position.needsUpdate = true; this.bvh.refit(); this.faceAreas = null; }

	buildAdjacency() {
		const { idx, F, V } = this;
		// faceAdj[f * 3 + e]: face across edge e of face f (edge e runs from corner e to corner e + 1), -1 at a border.
		const adj = this.faceAdj = new Int32Array(F * 3).fill(-1);
		const map = new Map();
		for (let f = 0; f < F; f++) for (let e = 0; e < 3; e++) {
			const a = idx[f * 3 + e], b = idx[f * 3 + (e + 1) % 3], k = a < b ? a * V + b : b * V + a;
			const o = map.get(k);
			if (o === undefined) map.set(k, f * 3 + e);
			else { adj[f * 3 + e] = (o / 3) | 0; adj[o] = f; map.delete(k); }
		}
		// vertex -> faces (CSR)
		const cnt = new Uint32Array(V + 1);
		for (let i = 0; i < F * 3; i++) cnt[idx[i] + 1]++;
		for (let v = 0; v < V; v++) cnt[v + 1] += cnt[v];
		const vf = new Uint32Array(F * 3), fill = cnt.slice(0, V);
		for (let f = 0; f < F; f++) for (let e = 0; e < 3; e++) vf[fill[idx[f * 3 + e]]++] = f;
		this.vfStart = cnt; this.vf = vf;
	}

	vertex(i, out = new THREE.Vector3()) { return out.fromArray(this.P, i * 3); }
	corners(f, a = _a, b = _b, c = _c) {
		const idx = this.idx;
		return [a.fromArray(this.P, idx[f * 3] * 3), b.fromArray(this.P, idx[f * 3 + 1] * 3), c.fromArray(this.P, idx[f * 3 + 2] * 3)];
	}

	// Position of a surface point { f, b0, b1, b2 } (or { f, b: [b1, b2] }).
	pos(sp, out = new THREE.Vector3()) {
		const idx = this.idx, P = this.P, f = sp.f;
		const [b0, b1, b2] = bary3(sp);
		const i0 = idx[f * 3] * 3, i1 = idx[f * 3 + 1] * 3, i2 = idx[f * 3 + 2] * 3;
		return out.set(b0 * P[i0] + b1 * P[i1] + b2 * P[i2], b0 * P[i0 + 1] + b1 * P[i1 + 1] + b2 * P[i2 + 1], b0 * P[i0 + 2] + b1 * P[i1 + 2] + b2 * P[i2 + 2]);
	}

	faceNormal(f, out = new THREE.Vector3()) {
		const [a, b, c] = this.corners(f);
		return out.subVectors(b, a).cross(_p.subVectors(c, a)).normalize();
	}

	// Barycentrics of p (projected onto face f's plane; may lie outside the triangle).
	baryOf(f, p, out = {}) {
		const [a, b, c] = this.corners(f);
		_tri.set(a, b, c).getBarycoord(p, _bary);
		out.f = f; out.b0 = _bary.x; out.b1 = _bary.y; out.b2 = _bary.z;
		return out;
	}

	closest(p, out = {}) {
		const hit = this.bvh.closestPointToPoint(p);
		if (!hit) return null;
		const f = hit.faceIndex;
		this.baryOf(f, hit.point, out);
		clampBary(out);
		out.dist = hit.distance;
		return out;
	}

	// Closest point on faces near a given face (breadth-first over `rings` rings of neighbours):
	// keeps a projection on the same sheet of the body (torso, not the arm next to it).
	closestNear(p, f0, rings = 3, out = {}) {
		let best = Infinity, seen = new Set([f0]), frontier = [f0], bf = -1;
		const tmp = {};
		for (let r = 0; r <= rings; r++) {
			const next = [];
			for (const f of frontier) {
				this.baryOf(f, p, tmp); clampBary(tmp);
				const q = this.pos(tmp, _p), d = q.distanceToSquared(p);
				if (d < best) { best = d; bf = f; out.f = f; out.b0 = tmp.b0; out.b1 = tmp.b1; out.b2 = tmp.b2; }
				if (r < rings) for (let e = 0; e < 3; e++) { const g = this.faceAdj[f * 3 + e]; if (g >= 0 && !seen.has(g)) { seen.add(g); next.push(g); } }
			}
			frontier = next;
		}
		out.dist = Math.sqrt(best);
		return bf >= 0 ? out : null;
	}

	raycast(ray, out = {}) {
		const hit = this.bvh.raycastFirst(ray, THREE.DoubleSide);
		if (!hit) return null;
		this.baryOf(hit.faceIndex, hit.point, out);
		clampBary(out);
		out.point = hit.point.clone();
		out.distance = hit.distance;
		return out;
	}
}

// Barycentrics as three numbers from either form.
export function bary3(sp) {
	if (sp.b0 !== undefined) return [sp.b0, sp.b1, sp.b2];
	const b1 = sp.b[0], b2 = sp.b[1];
	return [1 - b1 - b2, b1, b2];
}
// The document's compact form: { f, b: [b1, b2] } rounded to 1e-6.
export function toSP(s) {
	const r = (x) => Math.round(x * 1e6) / 1e6;
	return { f: s.f, b: [r(s.b1), r(s.b2)] };
}
export function fromSP(sp) { const [b0, b1, b2] = bary3(sp); return { f: sp.f, b0, b1, b2 }; }

function clampBary(o) {
	let b0 = Math.max(o.b0, 0), b1 = Math.max(o.b1, 0), b2 = Math.max(o.b2, 0);
	const s = b0 + b1 + b2 || 1;
	o.b0 = b0 / s; o.b1 = b1 / s; o.b2 = b2 / s;
}
