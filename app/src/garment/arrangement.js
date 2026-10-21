// Curve arrangement: insert every seam and edge polyline into a copy of the canonical mesh by
// splitting the triangles it crosses, then flood-fill the triangles into cells bounded by the
// inserted edges. Each cell becomes a panel (or an opening). Every new vertex is itself a surface
// point on the canonical mesh, so the cut mesh follows the body through every size and pose.
// Spec: knowledge/engineering/architecture/editor-architecture.md, item 3.
//
// Steps: (A) walk each polyline across the mesh, emitting per-face segments between points that
// are a canonical vertex, a point on a mesh edge, or a point inside a face; (B) merge points closer
// than EPS within each face; (C) split segments at their intersections; (D) prune dangling chains
// (lines that end in the middle of a panel do not cut anything); (E) triangulate each touched face
// as the planar subdivision of its boundary and segments; (F) label cells.
import * as THREE from 'three';

const EPS_V = 0.0003;   // a crossing this close to a mesh vertex snaps to it (metres)
const EPS = 0.00015;    // points this close merge into one
const EPS_SEG = 0.00005; // a point this close to a segment lies on it
const SLIVER = 0.00015; // m2: cells smaller than this (1.5 cm2) join a neighbour

// Point kinds
const VTX = 0, EDGE = 1, IN = 2;

class Points {
	constructor(surf) {
		this.surf = surf;
		this.kind = []; this.a = []; this.b = []; this.t = []; this.f = []; this.bc = []; this.pos = [];
		this.vmap = new Map(); this.emap = new Map(); // edge key -> [{ t, id }]
	}
	_new(kind, pos) { const id = this.kind.length; this.kind.push(kind); this.pos.push(pos); this.a.push(-1); this.b.push(-1); this.t.push(0); this.f.push(-1); this.bc.push(null); return id; }
	vertex(v) {
		let id = this.vmap.get(v);
		if (id === undefined) { id = this._new(VTX, this.surf.vertex(v)); this.a[id] = v; this.vmap.set(v, id); }
		return id;
	}
	// point on canonical edge (a, b) at t along a -> b
	edge(a, b, t) {
		if (a > b) { [a, b] = [b, a]; t = 1 - t; }
		const S = this.surf, len = S.vertex(a).distanceTo(S.vertex(b, _v));
		if (t * len < EPS_V) return this.vertex(a);
		if ((1 - t) * len < EPS_V) return this.vertex(b);
		const key = a * S.V + b;
		let list = this.emap.get(key);
		if (!list) this.emap.set(key, list = []);
		for (const e of list) if (Math.abs(e.t - t) * len < EPS * 1.5) return e.id;
		const pos = S.vertex(a).lerp(S.vertex(b, _v), t);
		const id = this._new(EDGE, pos);
		this.a[id] = a; this.b[id] = b; this.t[id] = t;
		list.push({ t, id });
		return id;
	}
	inner(f, b0, b1, b2) {
		const id = this._new(IN, this.surf.pos({ f, b0, b1, b2 }));
		this.f[id] = f; this.bc[id] = [b0, b1, b2];
		return id;
	}
	// Barycentrics of point id in face f (it must touch f).
	baryIn(id, f) {
		const idx = this.surf.idx, c = [idx[f * 3], idx[f * 3 + 1], idx[f * 3 + 2]], k = this.kind[id];
		if (k === VTX) return c.map((v) => (v === this.a[id] ? 1 : 0));
		if (k === EDGE) return c.map((v) => (v === this.a[id] ? 1 - this.t[id] : v === this.b[id] ? this.t[id] : 0));
		if (this.f[id] === f) return this.bc[id];
		return null;
	}
	touches(id, f) {
		const idx = this.surf.idx, k = this.kind[id];
		if (k === IN) return this.f[id] === f;
		const has = (v) => idx[f * 3] === v || idx[f * 3 + 1] === v || idx[f * 3 + 2] === v;
		return k === VTX ? has(this.a[id]) : has(this.a[id]) && has(this.b[id]);
	}
}
const _v = new THREE.Vector3(), _w = new THREE.Vector3();

// Classify a surface sample: vertex, edge or inside point.
function pointFor(P, surf, s) {
	const idx = surf.idx, f = s.f, b = [s.b0, s.b1, s.b2], c = [idx[f * 3], idx[f * 3 + 1], idx[f * 3 + 2]];
	const pos = surf.pos(s, _w);
	for (let i = 0; i < 3; i++) if (surf.vertex(c[i], _v).distanceTo(pos) < EPS_V) return P.vertex(c[i]);
	// distance to each edge (edge e: corner e -> e + 1; the barycentric of the opposite corner is 0 on it)
	for (let e = 0; e < 3; e++) {
		const o = (e + 2) % 3;
		if (b[o] < 0.02) {
			const A = surf.vertex(c[e]), B = surf.vertex(c[(e + 1) % 3], _v);
			const AB = B.clone().sub(A), t = THREE.MathUtils.clamp(pos.clone().sub(A).dot(AB) / AB.lengthSq(), 0, 1);
			if (A.clone().addScaledVector(AB, t).distanceTo(pos) < EPS_SEG) return P.edge(c[e], c[(e + 1) % 3], t);
		}
	}
	return P.inner(f, b[0], b[1], b[2]);
}

// The faces a point touches (one for inside points, two for edge points, a fan for vertices).
function facesOf(P, surf, id) {
	const k = P.kind[id];
	if (k === IN) return [P.f[id]];
	const v = P.a[id], out = [];
	for (let i = surf.vfStart[v]; i < surf.vfStart[v + 1]; i++) { const f = surf.vf[i]; if (P.touches(id, f)) out.push(f); }
	return out;
}

// (A) Walk from point `from` to point `to` across the mesh; push { f, p, q, c } segments.
function walk(P, surf, from, to, curve, segs, warn) {
	const target = P.pos[to], tau = {};
	const tf = new Set(facesOf(P, surf, to));
	let cur = from, prevFace = -1;
	for (let guard = 0; guard < 200; guard++) {
		if (cur === to) return;
		const curFaces = facesOf(P, surf, cur);
		// arrived: cur and target share a face
		const common = curFaces.find((f) => tf.has(f));
		if (common !== undefined) { segs.push({ f: common, p: cur, q: to, c: curve }); return; }
		// choose the face to cross: the one the direction to the target enters
		let best = null, bestScore = -Infinity;
		for (const f of curFaces) {
			if (f === prevFace && curFaces.length > 1) continue;
			const beta = P.baryIn(cur, f);
			surf.baryOf(f, target, tau);
			const t = [tau.b0, tau.b1, tau.b2], d = [t[0] - beta[0], t[1] - beta[1], t[2] - beta[2]];
			// components that are 0 at cur must not decrease (else the ray leaves the face at once)
			let score = Infinity;
			for (let i = 0; i < 3; i++) if (beta[i] < 1e-9) score = Math.min(score, d[i]);
			if (score === Infinity) score = 1;
			if (score > bestScore) { bestScore = score; best = { f, beta, t }; }
		}
		if (!best) { warn.push(`walk: no face from point ${cur}`); return; }
		const { f, beta, t } = best;
		// exit: smallest lambda in (0, 1] where a component that decreases reaches 0
		let lam = Infinity, k = -1;
		for (let i = 0; i < 3; i++) {
			if (t[i] < beta[i] - 1e-12 && beta[i] > 1e-9) { const l = beta[i] / (beta[i] - t[i]); if (l < lam) { lam = l; k = i; } }
		}
		if (k < 0 || lam >= 1) {
			// the target projects inside this face but is not on it (curvature): go to it via the
			// nearest shared feature of this face and a target face
			let sh = null;
			for (const g of tf) { const x = sharedFeature(P, surf, f, g, target); if (x !== null && (sh === null || P.kind[x] === EDGE)) sh = x; }
			if (sh === null || sh === cur) { edgePath(P, surf, cur, to, curve, segs, warn); return; }
			segs.push({ f, p: cur, q: sh, c: curve });
			prevFace = f; cur = sh;
			continue;
		}
		const e = [beta[0] + lam * (t[0] - beta[0]), beta[1] + lam * (t[1] - beta[1]), beta[2] + lam * (t[2] - beta[2])];
		const idx = surf.idx, c = [idx[f * 3], idx[f * 3 + 1], idx[f * 3 + 2]];
		// exit edge is opposite corner k: corners (k + 1) % 3 -> (k + 2) % 3
		const a = (k + 1) % 3, b = (k + 2) % 3, s = e[a] + e[b];
		const x = P.edge(c[a], c[b], s > 0 ? e[b] / s : 0.5);
		if (x !== cur) segs.push({ f, p: cur, q: x, c: curve });
		prevFace = f;
		if (x === cur) {
			// stuck on a vertex or edge point: step to the face across that edge
			const g = surf.faceAdj[f * 3 + a];
			if (g < 0) { warn.push('walk: hit border'); return; }
			prevFace = f;
		}
		cur = x;
	}
	edgePath(P, surf, cur, to, curve, segs, warn);
}

// Fallback when the straight walk fails (a fold, a sliver): go to a corner of the current face,
// follow mesh edges (shortest path) to a corner of a face the target touches, then to the target.
function edgePath(P, surf, from, to, curve, segs, warn) {
	const fromFaces = facesOf(P, surf, from), toFaces = facesOf(P, surf, to), idx = surf.idx;
	const corners = (fs) => { const s = new Set(); for (const f of fs) for (let k = 0; k < 3; k++) s.add(idx[f * 3 + k]); return s; };
	const src = corners(fromFaces), dst = corners(toFaces);
	// Dijkstra over vertices, from every corner of the start faces (cost: distance from `from`)
	const dist = new Map(), prev = new Map(), heap = [];
	const push = (v, d) => { heap.push([d, v]); heap.sort((a, b) => a[0] - b[0]); };
	for (const v of src) { const d = surf.vertex(v).distanceTo(P.pos[from]); dist.set(v, d); push(v, d); }
	let end = -1;
	const vf = surf.vf, vs = surf.vfStart;
	for (let guard = 0; heap.length && guard < 4000; guard++) {
		const [d, v] = heap.shift();
		if (d > dist.get(v)) continue;
		if (dst.has(v)) { end = v; break; }
		for (let q = vs[v]; q < vs[v + 1]; q++) {
			const f = vf[q];
			for (let k = 0; k < 3; k++) {
				const w = idx[f * 3 + k];
				if (w === v) continue;
				const nd = d + surf.vertex(v).distanceTo(surf.vertex(w, _v));
				if (nd < (dist.get(w) ?? Infinity)) { dist.set(w, nd); prev.set(w, v); push(w, nd); }
			}
		}
	}
	if (end < 0) { warn.push(`walk: no path between ${from} and ${to}`); return; }
	const path = [end];
	while (prev.has(path[path.length - 1])) path.push(prev.get(path[path.length - 1]));
	path.reverse();
	const ids = path.map((v) => P.vertex(v));
	const faceWith = (a, b) => { for (const f of facesOf(P, surf, a)) if (P.touches(b, f)) return f; return -1; };
	const chain = [from, ...ids, to];
	for (let i = 0; i + 1 < chain.length; i++) {
		if (chain[i] === chain[i + 1]) continue;
		const f = faceWith(chain[i], chain[i + 1]);
		if (f < 0) { warn.push('walk: edge path broke'); return; }
		segs.push({ f, p: chain[i], q: chain[i + 1], c: curve });
	}
}

// A point shared by faces f and g (edge or vertex) nearest to p, as a point id.
function sharedFeature(P, surf, f, g, p) {
	const idx = surf.idx, A = [idx[f * 3], idx[f * 3 + 1], idx[f * 3 + 2]], B = new Set([idx[g * 3], idx[g * 3 + 1], idx[g * 3 + 2]]);
	const sh = A.filter((v) => B.has(v));
	if (sh.length === 2) {
		const a = surf.vertex(sh[0]), b = surf.vertex(sh[1], _v), ab = b.clone().sub(a);
		const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1);
		return P.edge(sh[0], sh[1], t);
	}
	if (sh.length === 1) return P.vertex(sh[0]);
	return null;
}

// --- union-find --------------------------------------------------------------------------------
class UF {
	constructor(n) { this.p = new Int32Array(n).map((_, i) => i); }
	find(x) { while (this.p[x] !== x) { this.p[x] = this.p[this.p[x]]; x = this.p[x]; } return x; }
	union(a, b) { a = this.find(a); b = this.find(b); if (a !== b) this.p[b] = a; return a; }
}

// Local 2D frame of face f: corner 0 at the origin, corner 1 on +x.
function frame(surf, f) {
	const [A, B, C] = surf.corners(f, new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3());
	const ab = B.clone().sub(A), ac = C.clone().sub(A), lab = ab.length(), ex = ab.clone().divideScalar(lab);
	const cx = ac.dot(ex), cy = Math.sqrt(Math.max(ac.lengthSq() - cx * cx, 1e-24));
	return { c: [[0, 0], [lab, 0], [cx, cy]], to2d: (b) => [b[1] * lab + b[2] * cx, b[2] * cy] };
}

function segIntersect(p1, p2, q1, q2) {
	const rx = p2[0] - p1[0], ry = p2[1] - p1[1], sx = q2[0] - q1[0], sy = q2[1] - q1[1];
	const den = rx * sy - ry * sx;
	if (Math.abs(den) < 1e-18) return null;
	const qpx = q1[0] - p1[0], qpy = q1[1] - p1[1];
	const t = (qpx * sy - qpy * sx) / den, u = (qpx * ry - qpy * rx) / den;
	return { t, u, x: [p1[0] + t * rx, p1[1] + t * ry] };
}
function distToSeg(p, a, b) {
	const bx = b[0] - a[0], by = b[1] - a[1], l2 = bx * bx + by * by;
	const t = l2 > 0 ? THREE.MathUtils.clamp(((p[0] - a[0]) * bx + (p[1] - a[1]) * by) / l2, 0, 1) : 0;
	return { d: Math.hypot(p[0] - a[0] - bx * t, p[1] - a[1] - by * t), t };
}

// curves: [{ id, sps: [{ f, b0, b1, b2 }], closed }]
export function buildArrangement(surf, curves) {
	const t0 = performance.now();
	const P = new Points(surf), warn = [];
	let segs = [];
	// (A)
	for (const cv of curves) {
		if (cv.sps.length < 2) continue;
		const ids = cv.sps.map((s) => pointFor(P, surf, s));
		const n = ids.length, m = cv.closed ? n : n - 1;
		for (let i = 0; i < m; i++) walk(P, surf, ids[i], ids[(i + 1) % n], cv.id, segs, warn);
	}
	const tA = performance.now();
	// (B) merge points closer than EPS inside each face; rank: vertex > edge > inside
	const uf = new UF(P.kind.length);
	const byFace = new Map();
	const touch = (f, id) => { let s = byFace.get(f); if (!s) byFace.set(f, s = new Set()); s.add(id); };
	for (const s of segs) { touch(s.f, s.p); touch(s.f, s.q); }
	for (const [f, set] of byFace) {
		const ids = [...set];
		for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
			if (P.pos[ids[i]].distanceTo(P.pos[ids[j]]) < EPS) {
				const a = uf.find(ids[i]), b = uf.find(ids[j]);
				if (a === b) continue;
				// keep the more constrained representative; never merge two different vertices, nor two
				// points on different edges (a line clipping a triangle's corner crosses two edges a hair
				// apart: merging them would leave the segments on either side without a common face)
				if (P.kind[a] === VTX && P.kind[b] === VTX) continue;
				if (P.kind[a] === EDGE && P.kind[b] === EDGE && (P.a[a] !== P.a[b] || P.b[a] !== P.b[b])) continue;
				if (P.kind[a] <= P.kind[b]) uf.p[b] = a; else uf.p[a] = b;
			}
		}
	}
	const rep = (id) => uf.find(id);
	// rewrite, drop zero-length, dedupe per face (curve ids merged)
	const segMap = new Map();
	for (const s of segs) {
		let p = rep(s.p), q = rep(s.q);
		if (p === q) continue;
		// the merged representative must still touch the face; else re-home the segment
		let f = s.f;
		if (!P.touches(p, f) || !P.touches(q, f)) {
			const fs = facesOf(P, surf, p).filter((g) => P.touches(q, g));
			if (!fs.length) { warn.push(`merge: segment lost its face (${s.p}:${P.kind[s.p]}->${p}:${P.kind[p]}, ${s.q}:${P.kind[s.q]}->${q}:${P.kind[q]}, f ${s.f}, d ${P.pos[p].distanceTo(P.pos[q]).toExponential(2)})`); continue; }
			f = fs[0];
		}
		if (p > q) [p, q] = [q, p];
		const key = f + ':' + p + ':' + q;
		const o = segMap.get(key);
		if (o) o.c.add(s.c); else segMap.set(key, { f, p, q, c: new Set([s.c]) });
	}
	// segments that lie along a face edge are shared by both faces: keep one copy (canonical face = min)
	segs = [...segMap.values()];

	const tB = performance.now();
	// (C) intersections inside each face
	const faceSegs = new Map();
	for (const s of segs) { let l = faceSegs.get(s.f); if (!l) faceSegs.set(s.f, l = []); l.push(s); }
	const frames = new Map();
	const fr = (f) => { let x = frames.get(f); if (!x) frames.set(f, x = frame(surf, f)); return x; };
	const xy = (id, f) => fr(f).to2d(P.baryIn(id, f));
	const out = [];
	for (const [f, list] of faceSegs) {
		let work = list.slice();
		let changed = true, rounds = 0;
		while (changed && rounds++ < 50) {
			changed = false;
			outer: for (let i = 0; i < work.length; i++) for (let j = i + 1; j < work.length; j++) {
				const A = work[i], B = work[j];
				const pts = [A.p, A.q, B.p, B.q];
				if (A.p === B.p || A.p === B.q || A.q === B.p || A.q === B.q) {
					// sharing an endpoint: only collinear overlap matters (ignored)
					continue;
				}
				const a1 = xy(A.p, f), a2 = xy(A.q, f), b1 = xy(B.p, f), b2 = xy(B.q, f);
				// T-junctions: an endpoint of one lying on the other
				for (const [S, T, e1, e2, tp] of [[A, B, a1, a2, [B.p, b1]], [A, B, a1, a2, [B.q, b2]], [B, A, b1, b2, [A.p, a1]], [B, A, b1, b2, [A.q, a2]]]) {
					const r = distToSeg(tp[1], e1, e2);
					if (r.d < EPS_SEG * 3 && r.t > 1e-6 && r.t < 1 - 1e-6) {
						work.splice(work.indexOf(S), 1, { f, p: S.p, q: tp[0], c: S.c }, { f, p: tp[0], q: S.q, c: S.c });
						changed = true; break outer;
					}
				}
				const r = segIntersect(a1, a2, b1, b2);
				if (!r || r.t <= 1e-9 || r.t >= 1 - 1e-9 || r.u <= 1e-9 || r.u >= 1 - 1e-9) continue;
				// snap to an endpoint if close
				let X = -1;
				for (const id of pts) { const q = xy(id, f); if (Math.hypot(q[0] - r.x[0], q[1] - r.x[1]) < EPS) { X = id; break; } }
				if (X < 0) {
					const tri = fr(f).c, b = barycentric2(r.x, tri);
					X = P.inner(f, b[0], b[1], b[2]);
				}
				const rep2 = [];
				for (const S of [A, B]) {
					if (S.p === X || S.q === X) { rep2.push(S); continue; }
					rep2.push({ f, p: S.p, q: X, c: S.c }, { f, p: X, q: S.q, c: S.c });
				}
				work = work.filter((s) => s !== A && s !== B).concat(rep2);
				changed = true; break outer;
			}
		}
		if (rounds >= 50) warn.push(`intersect: face ${f} did not settle`);
		out.push(...work);
	}
	segs = out;

	const tC = performance.now();
	// (D) prune dangling chains
	const deg = new Map(), adjS = new Map();
	const inc = (id, s) => { deg.set(id, (deg.get(id) ?? 0) + 1); let l = adjS.get(id); if (!l) adjS.set(id, l = []); l.push(s); };
	for (const s of segs) { inc(s.p, s); inc(s.q, s); }
	const dead = new Set(), stack = [...deg.keys()].filter((id) => deg.get(id) === 1);
	while (stack.length) {
		const id = stack.pop();
		if (deg.get(id) !== 1) continue;
		const s = adjS.get(id).find((x) => !dead.has(x));
		if (!s) continue;
		dead.add(s);
		for (const e of [s.p, s.q]) { deg.set(e, deg.get(e) - 1); if (deg.get(e) === 1) stack.push(e); }
	}
	const loose = segs.filter((s) => dead.has(s));
	segs = segs.filter((s) => !dead.has(s));

	// vertices: canonical ones keep their index; used edge/inside points are appended
	const vid = new Map();
	let nV = surf.V;
	const hostF = [], hostB = [];
	const vIndex = (id) => {
		if (P.kind[id] === VTX) return P.a[id];
		let v = vid.get(id);
		if (v === undefined) {
			v = nV++; vid.set(id, v);
			const f = P.kind[id] === IN ? P.f[id] : facesOf(P, surf, id)[0];
			hostF.push(f); hostB.push(...P.baryIn(id, f));
		}
		return v;
	};
	for (const s of segs) { vIndex(s.p); vIndex(s.q); }

	const tD = performance.now();
	// (E) triangulate touched faces
	const touched = new Map(); // f -> { pts: Set, segs: [] }
	const tf = (f) => { let x = touched.get(f); if (!x) touched.set(f, x = { pts: new Set(), segs: [] }); return x; };
	for (const s of segs) { const x = tf(s.f); x.segs.push(s); x.pts.add(s.p); x.pts.add(s.q); }
	// edge points also split the boundary of the face on the other side of their edge
	for (const id of vid.keys()) if (P.kind[id] === EDGE) for (const f of facesOf(P, surf, id)) tf(f).pts.add(id);

	const idx = surf.idx, F = surf.F, NK = nV;
	const tris = [], triFace = [], constraint = new Map(); // edge key -> Set(curve ids)
	const ekey = (a, b) => (a < b ? a * NK + b : b * NK + a);
	const onC = new Uint8Array(nV); // vertices at the end of some constraint edge
	const addC = (a, b, cs) => { const k = ekey(a, b); let s = constraint.get(k); if (!s) constraint.set(k, s = new Set()); for (const c of cs) s.add(c); onC[a] = onC[b] = 1; };
	const faceTris = new Map(); // f -> [tri indices] for split faces, for locate()
	const faceTri0 = new Int32Array(F).fill(-1); // f -> its own triangle when not split
	for (let f = 0; f < F; f++) {
		const T = touched.get(f);
		if (!T) { faceTri0[f] = triFace.length; tris.push(idx[f * 3], idx[f * 3 + 1], idx[f * 3 + 2]); triFace.push(f); continue; }
		const res = triangulateFace(P, surf, f, T, fr(f), vIndex, addC, warn);
		const list = [];
		for (const t of res) { list.push(triFace.length); tris.push(t[0], t[1], t[2]); triFace.push(f); }
		faceTris.set(f, list);
	}
	// fixed lines of the surface (the head's border, body/reference.js): constraints of no curve
	const B = surf.barrier;
	if (B) for (let k = 0; k < B.length; k += 2) addC(B[k], B[k + 1], []);

	const tE = performance.now();
	// (F) cells: flood fill across edges that are not constraints. Untouched faces join through the
	// canonical adjacency; split faces through a local edge map.
	const nT = triFace.length, tuf = new UF(nT), fa = surf.faceAdj;
	const across = []; // (tri, tri, va, vb) quads for constraint edges: which cells border which
	for (let f = 0; f < F; f++) {
		const t = faceTri0[f];
		if (t < 0) continue;
		for (let e = 0; e < 3; e++) {
			const g = fa[f * 3 + e];
			if (g < 0 || g < f || faceTri0[g] < 0) continue;
			const a = idx[f * 3 + e], b = idx[f * 3 + (e + 1) % 3];
			if (!(onC[a] && onC[b] && constraint.has(ekey(a, b)))) tuf.union(t, faceTri0[g]);
			else across.push(t, faceTri0[g], a, b);
		}
	}
	const emap = new Map();
	const addEdge = (a, b, t) => {
		const k = ekey(a, b), o = emap.get(k);
		if (o === undefined) emap.set(k, t);
		else { if (!constraint.has(k)) tuf.union(o, t); else across.push(o, t, a, b); emap.delete(k); }
	};
	for (const [f, list] of faceTris) {
		for (const t of list) for (let e = 0; e < 3; e++) addEdge(tris[t * 3 + e], tris[t * 3 + (e + 1) % 3], t);
		for (let e = 0; e < 3; e++) {
			const g = fa[f * 3 + e];
			if (g >= 0 && faceTri0[g] >= 0) addEdge(idx[f * 3 + e], idx[f * 3 + (e + 1) % 3], faceTri0[g]);
		}
	}
	if (emap.size) warn.push(`cells: ${emap.size} unmatched edges`);
	// vertex positions on the reference surface, for areas (and for whoever needs them later)
	const VP = new Float32Array(nV * 3);
	VP.set(surf.P);
	for (let k = 0; k < nV - surf.V; k++) {
		const f = hostF[k], b0 = hostB[k * 3], b1 = hostB[k * 3 + 1], b2 = hostB[k * 3 + 2];
		const i0 = idx[f * 3] * 3, i1 = idx[f * 3 + 1] * 3, i2 = idx[f * 3 + 2] * 3, o = (surf.V + k) * 3;
		for (let c = 0; c < 3; c++) VP[o + c] = b0 * surf.P[i0 + c] + b1 * surf.P[i1 + c] + b2 * surf.P[i2 + c];
	}
	const cellOf = new Int32Array(nT), rootCell = new Int32Array(nT).fill(-1), cells = [];
	const fArea = surf.faceAreas ??= faceAreas(surf);
	const counts = [];
	for (let t = 0; t < nT; t++) {
		const r = tuf.find(t);
		let c = rootCell[r];
		if (c < 0) { c = rootCell[r] = cells.length; cells.push({ id: c, tris: null, area: 0 }); counts.push(0); }
		cellOf[t] = c; counts[c]++;
		const f = triFace[t];
		if (faceTri0[f] === t) { cells[c].area += fArea[f]; continue; }
		const a = tris[t * 3] * 3, b = tris[t * 3 + 1] * 3, d = tris[t * 3 + 2] * 3;
		const ux = VP[b] - VP[a], uy = VP[b + 1] - VP[a + 1], uz = VP[b + 2] - VP[a + 2], vx = VP[d] - VP[a], vy = VP[d + 1] - VP[a + 1], vz = VP[d + 2] - VP[a + 2];
		cells[c].area += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
	}
	for (let c = 0; c < cells.length; c++) cells[c].tris = new Int32Array(counts[c]);
	const fill = new Int32Array(cells.length);
	for (let t = 0; t < nT; t++) { const c = cellOf[t]; cells[c].tris[fill[c]++] = t; }

	// cell adjacency: shared boundary length between neighbouring cells
	const adjacency = () => {
		const adj = cells.map(() => new Map());
		for (let q = 0; q < across.length; q += 4) {
			const c1 = cellOf[across[q]], c2 = cellOf[across[q + 1]];
			if (c1 === c2) continue;
			const a = across[q + 2] * 3, b = across[q + 3] * 3;
			const l = Math.hypot(VP[a] - VP[b], VP[a + 1] - VP[b + 1], VP[a + 2] - VP[b + 2]);
			adj[c1].set(c2, (adj[c1].get(c2) ?? 0) + l);
			adj[c2].set(c1, (adj[c2].get(c1) ?? 0) + l);
		}
		return adj;
	};
	let cellAdj = adjacency();
	// Slivers: lines meeting at a shallow angle (several seams leaving one junction) can enclose a
	// cell of a square centimetre or so; it joins the neighbour it shares most boundary with, so
	// pattern pieces have clean outlines and no pin-hole openings appear.
	const merge = cells.map((_, i) => i);
	const root = (c) => { while (merge[c] !== c) c = merge[c] = merge[merge[c]]; return c; };
	let merged = 0;
	for (const c of cells) {
		if (c.area > SLIVER) continue;
		let best = -1, bl = 0;
		for (const [n, l] of cellAdj[c.id]) if (l > bl && cells[n].area > SLIVER) { bl = l; best = n; }
		if (best >= 0) { merge[c.id] = root(best); merged++; }
	}
	const softEdges = new Set(); // constraint edges now inside a merged cell: not seams of the piece
	if (merged) {
		for (let q = 0; q < across.length; q += 4) {
			const c1 = cellOf[across[q]], c2 = cellOf[across[q + 1]];
			if (c1 !== c2 && root(c1) === root(c2)) softEdges.add(ekey(across[q + 2], across[q + 3]));
		}
		const remap = new Int32Array(cells.length).fill(-1), next = [];
		for (const c of cells) { const r = root(c.id); if (remap[r] < 0) { remap[r] = next.length; next.push({ id: next.length, tris: [], area: 0 }); } }
		for (const c of cells) { const n = next[remap[root(c.id)]]; n.area += c.area; for (const t of c.tris) n.tris.push(t); }
		for (let t = 0; t < nT; t++) cellOf[t] = remap[root(cellOf[t])];
		for (const n of next) n.tris = Int32Array.from(n.tris);
		cells.length = 0; cells.push(...next);
		cellAdj = adjacency();
	}

	return {
		cellAdj, softEdges,
		nV, hostF: Int32Array.from(hostF), hostB: Float32Array.from(hostB), baseV: surf.V, VP, ekey,
		tris: Uint32Array.from(tris), triFace: Int32Array.from(triFace), cellOf, cells,
		constraint, faceTris, faceTri0, loose, warn, ms: performance.now() - t0,
		phases: { walk: tA - t0, merge: tB - tA, intersect: tC - tB, prune: tD - tC, triangulate: tE - tD, cells: performance.now() - tE, touched: touched.size },
		segments: segs.map((s) => ({ a: vIndex(s.p), b: vIndex(s.q), c: [...s.c] })),
	};
}

function faceAreas(surf) {
	const A = new Float64Array(surf.F), P = surf.P, idx = surf.idx;
	for (let f = 0; f < surf.F; f++) {
		const a = idx[f * 3] * 3, b = idx[f * 3 + 1] * 3, d = idx[f * 3 + 2] * 3;
		const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[d] - P[a], vy = P[d + 1] - P[a + 1], vz = P[d + 2] - P[a + 2];
		A[f] = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
	}
	return A;
}

function vertexPos(surf, v, hostF, hostB, out = new THREE.Vector3()) {
	if (v < surf.V) return surf.vertex(v, out);
	const k = v - surf.V;
	return surf.pos({ f: hostF[k], b0: hostB[k * 3], b1: hostB[k * 3 + 1], b2: hostB[k * 3 + 2] }, out);
}

function barycentric2(p, tri) {
	const [a, b, c] = tri;
	const v0x = b[0] - a[0], v0y = b[1] - a[1], v1x = c[0] - a[0], v1y = c[1] - a[1], v2x = p[0] - a[0], v2y = p[1] - a[1];
	const d00 = v0x * v0x + v0y * v0y, d01 = v0x * v1x + v0y * v1y, d11 = v1x * v1x + v1y * v1y, d20 = v2x * v0x + v2y * v0y, d21 = v2x * v1x + v2y * v1y;
	const den = d00 * d11 - d01 * d01, v = (d11 * d20 - d01 * d21) / den, w = (d00 * d21 - d01 * d20) / den;
	return [1 - v - w, v, w];
}

// Planar subdivision of one face: its boundary (split at edge points) plus the segments inside it.
// Returns triangles as triples of arrangement vertex indices, wound like the original face.
// Works on local indices (points of this face) with numeric keys; most faces have under 10 points.
function triangulateFace(P, surf, f, T, fr, vIndex, addC, warn) {
	const idx = surf.idx;
	const ids = [], X = [], Y = [], local = new Map();
	const node = (id) => {
		let l = local.get(id);
		if (l === undefined) { l = ids.length; local.set(id, l); ids.push(id); const q = fr.to2d(P.baryIn(id, f)); X.push(q[0]); Y.push(q[1]); }
		return l;
	};
	const cornerL = [0, 1, 2].map((k) => node(P.vertex(idx[f * 3 + k])));
	// points on each side (edge e runs from corner e to corner e + 1), sorted along it
	const onSide = [[], [], []];
	for (const id of T.pts) {
		if (P.kind[id] === VTX) continue;
		const b = P.baryIn(id, f);
		for (let e = 0; e < 3; e++) if (b[(e + 2) % 3] < 1e-9) { onSide[e].push([b[(e + 1) % 3], id]); break; }
	}
	const K = 4096;
	const edges = new Map(); // lo * K + hi -> Set(curve ids) for constraints, null otherwise
	const addE = (a, b, c) => {
		if (a === b) return;
		const k = a < b ? a * K + b : b * K + a;
		const e = edges.get(k);
		if (e === undefined) edges.set(k, c ? new Set(c) : null);
		else if (c) { const s2 = e ?? new Set(); for (const x of c) s2.add(x); edges.set(k, s2); }
	};
	const sides = [];
	for (let e = 0; e < 3; e++) {
		onSide[e].sort((p, q) => p[0] - q[0]);
		const chain = [cornerL[e]];
		for (const [, id] of onSide[e]) chain.push(node(id));
		chain.push(cornerL[(e + 1) % 3]);
		sides.push(chain);
		for (let k = 0; k + 1 < chain.length; k++) addE(chain[k], chain[k + 1], null);
	}
	for (const sg of T.segs) {
		const a = node(sg.p), b = node(sg.q);
		// a segment along a side constrains the side's sub-edges between its ends
		let along = false;
		for (let e = 0; e < 3 && !along; e++) {
			const i = sides[e].indexOf(a), j = sides[e].indexOf(b);
			if (i >= 0 && j >= 0) { along = true; const lo = Math.min(i, j), hi = Math.max(i, j); for (let k = lo; k < hi; k++) addE(sides[e][k], sides[e][k + 1], sg.c); }
		}
		if (!along) addE(a, b, sg.c);
	}
	const n = ids.length, out = Array.from({ length: n }, () => []);
	for (const [k, c] of edges) {
		const a = Math.floor(k / K), b = k % K;
		out[a].push(b); out[b].push(a);
		if (c) addC(vIndex(ids[a]), vIndex(ids[b]), c);
	}
	for (let a = 0; a < n; a++) {
		if (out[a].length < 2) continue;
		const ang = out[a].map((b) => Math.atan2(Y[b] - Y[a], X[b] - X[a]));
		const order = out[a].map((_, i) => i).sort((p, q) => ang[p] - ang[q]);
		out[a] = order.map((i) => out[a][i]);
	}
	// faces: next(u -> w) = the outgoing edge at w just clockwise of w -> u
	const used = new Set(), cycles = [];
	for (let a = 0; a < n; a++) for (const b0 of out[a]) {
		if (used.has(a * K + b0)) continue;
		const cyc = [];
		let u = a, w = b0, guard = 0;
		while (!used.has(u * K + w) && guard++ < 10000) {
			used.add(u * K + w); cyc.push(u);
			const W = out[w], i = W.indexOf(u), nx = W[(i - 1 + W.length) % W.length];
			u = w; w = nx;
		}
		cycles.push(cyc);
	}
	const area = (cyc) => { let s2 = 0; for (let i = 0; i < cyc.length; i++) { const p = cyc[i], q = cyc[(i + 1) % cyc.length]; s2 += X[p] * Y[q] - X[q] * Y[p]; } return s2 / 2; };
	const pos = [], neg = [];
	for (const c of cycles) { const a = area(c); (a > 0 ? pos : neg).push({ c, a }); }
	// the outer face is the most negative; other negative cycles are holes in a positive cycle
	neg.sort((x, y) => x.a - y.a);
	const holes = neg.slice(1);
	const result = [];
	const V2 = (l) => new THREE.Vector2(X[l], Y[l]);
	for (const { c } of pos) {
		const contour = c.map(V2);
		const myHoles = [], holeIds = [];
		for (const h of holes) {
			if (h.assigned || !pointInPoly([X[h.c[0]], Y[h.c[0]]], contour)) continue;
			h.assigned = true;
			myHoles.push(h.c.map(V2));
			holeIds.push(h.c);
		}
		const L = holeIds.length ? [...c, ...holeIds.flat()] : c;
		let tri;
		if (c.length === 3 && !myHoles.length) tri = [[0, 1, 2]];
		else if (!myHoles.length) tri = earClip(contour);
		else tri = THREE.ShapeUtils.triangulateShape(contour, myHoles).filter((t) => {
			const all = [contour, ...myHoles].flat(), a = all[t[0]], b = all[t[1]], cc = all[t[2]];
			return Math.abs((b.x - a.x) * (cc.y - a.y) - (b.y - a.y) * (cc.x - a.x)) > 1e-16;
		});
		if (!tri.length) warn.push(`triangulate: face ${f} cycle of ${c.length} gave no triangles`);
		for (const t of tri) {
			const a = L[t[0]], b = L[t[1]], cc = L[t[2]];
			const s2 = (X[b] - X[a]) * (Y[cc] - Y[a]) - (Y[b] - Y[a]) * (X[cc] - X[a]);
			result.push(s2 >= 0 ? [vIndex(ids[a]), vIndex(ids[b]), vIndex(ids[cc])] : [vIndex(ids[a]), vIndex(ids[cc]), vIndex(ids[b])]);
		}
	}
	return result;
}

// Ear clipping for a simple CCW polygon that may have collinear points along its sides (edge
// points on a triangle's boundary): a collinear vertex is never an ear, so it always ends up as a
// corner of a real triangle and the mesh stays conforming. Picks the best-shaped ear first.
function earClip(poly) {
	const n = poly.length, idx = [...Array(n).keys()], out = [];
	const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
	const len2 = (a, b) => (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
	let guard = 0;
	while (idx.length > 3 && guard++ < 10000) {
		let best = -1, bestQ = -Infinity;
		for (let i = 0; i < idx.length; i++) {
			const a = poly[idx[(i - 1 + idx.length) % idx.length]], b = poly[idx[i]], c = poly[idx[(i + 1) % idx.length]];
			const cr = cross(a, b, c);
			if (cr <= 1e-12 * Math.max(len2(a, b), len2(b, c))) continue; // reflex or collinear
			let inside = false;
			for (let j = 0; j < idx.length && !inside; j++) {
				const k = idx[j];
				if (k === idx[i] || k === idx[(i - 1 + idx.length) % idx.length] || k === idx[(i + 1) % idx.length]) continue;
				const p = poly[k];
				// inside or on the boundary of the candidate ear (a vertex on its diagonal blocks it too)
				if (cross(a, b, p) >= -1e-14 && cross(b, c, p) >= -1e-14 && cross(c, a, p) >= -1e-14) inside = true;
			}
			if (inside) continue;
			const q = cr / (len2(a, b) + len2(b, c) + len2(c, a)); // shape quality (0 for slivers)
			if (q > bestQ) { bestQ = q; best = i; }
		}
		if (best < 0) break;
		out.push([idx[(best - 1 + idx.length) % idx.length], idx[best], idx[(best + 1) % idx.length]]);
		idx.splice(best, 1);
	}
	if (idx.length === 3) {
		const [a, b, c] = idx.map((k) => poly[k]);
		if (Math.abs(cross(a, b, c)) > 0) out.push([...idx]);
	} else if (idx.length > 3) {
		// could not find an ear (numerically degenerate polygon): fall back to earcut for the rest
		const rest = idx.map((k) => poly[k]);
		for (const t of THREE.ShapeUtils.triangulateShape(rest, [])) out.push(t.map((k) => idx[k]));
	}
	return out;
}


function pointInPoly(p, poly) {
	let inside = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const a = poly[i], b = poly[j];
		if ((a.y > p[1]) !== (b.y > p[1]) && p[0] < ((b.x - a.x) * (p[1] - a.y)) / (b.y - a.y) + a.x) inside = !inside;
	}
	return inside;
}

// Which arrangement triangle contains surface point sp ({ f, b0, b1, b2 })?
export function locate(arr, surf, sp) {
	const list = arr.faceTris.get(sp.f);
	if (!list) return arr.faceTri0[sp.f];
	const fr = frame(surf, sp.f), p = fr.to2d([sp.b0, sp.b1, sp.b2]);
	let best = -1, bestD = Infinity;
	for (const t of list) {
		const pts = [0, 1, 2].map((k) => fr.to2d(baryOfVertexInFace(arr, surf, arr.tris[t * 3 + k], sp.f)));
		const b = barycentric2(p, pts), d = -Math.min(b[0], b[1], b[2]);
		if (d < bestD) { bestD = d; best = t; }
	}
	return best;
}
export function baryOfVertexInFace(arr, surf, v, f) {
	const idx = surf.idx;
	if (v < surf.V) return [idx[f * 3] === v ? 1 : 0, idx[f * 3 + 1] === v ? 1 : 0, idx[f * 3 + 2] === v ? 1 : 0];
	const k = v - surf.V, hf = arr.hostF[k], hb = [arr.hostB[k * 3], arr.hostB[k * 3 + 1], arr.hostB[k * 3 + 2]];
	if (hf === f) return hb;
	// edge point hosted in the neighbouring face: map through the shared corners
	const hc = [idx[hf * 3], idx[hf * 3 + 1], idx[hf * 3 + 2]], out = [0, 0, 0];
	for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (idx[f * 3 + i] === hc[j]) out[i] = hb[j];
	return out;
}
export { vertexPos };
