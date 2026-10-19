// (The cut garment's rims, render/rims.js, reuse TRIMS, resample, smoothLoop and buildGeometry.)
// Finished edges: the raised rim every real leotard opening has (neck, armholes, legs, cuffs,
// strap edges). Openings are finished with ~1 cm elastic turned under and coverstitched, or
// wrapped in a binding strip (knowledge/domain/construction/edge-finishing-elastic-and-binding.md).
//
// The rim is its own geometry: a profile swept along each opening of the garment surface
// (body.edgeLoops(), the zero line of the cover field). The fabric's own cut is pulled back under
// the rim (uTrimInset in fabric.js), which also hides the jagged steps of the per-vertex cut.
// The rim is drawn with the same fabric materials (zone 4), plus topstitching.
import * as THREE from 'three';
import { createFabricMaterial, applyFabric } from '../materials/fabric.js';

// Profiles: [u, v, ao] with u = metres in from the finished edge across the surface, v = metres
// above the garment surface (the fabric itself sits at 1.2 mm), ao = contact darkening where the
// rim rolls under against the skin. Each profile ends just below the fabric, under its pulled-back
// cut, so there is never a gap. rows = topstitch rows (metres from the edge).
export const TRIMS = {
	elastic: {
		label: 'Turned elastic (self fabric)', width: 0.010, rows: [0.0085, 0.0045],
		profile: [[0.0006, 0.0002, 0.55], [0, 0.001, 0.75], [0.0005, 0.0019, 0.9], [0.0014, 0.0024, 1], [0.003, 0.0025, 1], [0.0075, 0.0023, 1], [0.0092, 0.0019, 1], [0.01, 0.0014, 0.95], [0.0112, 0.001, 0.9]],
	},
	// a corded piping straddling a seam (u runs either side of the seam line)
	piping: {
		label: 'Piping (corded, on a seam)', width: 0.0028, rows: [0, 0],
		profile: [[-0.0016, 0.0001, 0.6], [-0.0013, 0.0009, 0.85], [-0.0007, 0.0016, 1], [0, 0.0019, 1], [0.0007, 0.0016, 1], [0.0013, 0.0009, 0.85], [0.0016, 0.0001, 0.6]],
	},
	binding: {
		label: 'Binding (contrast strip)', width: 0.008, rows: [0.0064, 0],
		profile: [[0.0005, 0.0002, 0.55], [0, 0.0011, 0.75], [0.0005, 0.0021, 0.9], [0.0015, 0.0027, 1], [0.0065, 0.0027, 1], [0.0077, 0.0021, 1], [0.008, 0.0015, 0.85], [0.0086, 0.001, 0.8]],
	},
};
const INSET = 0.004; // fabric cut pulled back under the rim (must stay inside every profile's width)
const STEP = 0.0015; // sample spacing along an edge

// Smooth a closed loop of numbers or vectors with a box filter of +-r samples, `passes` times.
export function smoothLoop(a, r, passes, isVec) {
	const n = a.length;
	for (let p = 0; p < passes; p++) {
		const src = isVec ? a.map((v) => v.clone()) : a.slice();
		for (let i = 0; i < n; i++) {
			if (isVec) { a[i].set(0, 0, 0); for (let k = -r; k <= r; k++) a[i].add(src[(i + k + n) % n]); a[i].multiplyScalar(1 / (2 * r + 1)); }
			else { let s = 0; for (let k = -r; k <= r; k++) s += src[(i + k + n) % n]; a[i] = s / (2 * r + 1); }
		}
	}
}

// Resample a closed loop of edge records at a fixed spacing, interpolating every attribute.
export function resample(loop) {
	const n = loop.length, cum = [0];
	for (let i = 1; i <= n; i++) cum.push(cum[i - 1] + loop[i - 1].p.distanceTo(loop[i % n].p));
	const total = cum[n], m = Math.max(Math.round(total / STEP), 8), out = [];
	let s = 0;
	for (let k = 0; k < m; k++) {
		const d = (k / m) * total;
		while (cum[s + 1] < d) s++;
		const a = loop[s], b = loop[(s + 1) % n], t = (d - cum[s]) / Math.max(cum[s + 1] - cum[s], 1e-9);
		out.push({
			p: a.p.clone().lerp(b.p, t), n: a.n.clone().lerp(b.n, t), inside: a.inside.clone().lerp(b.inside, t), ref: a.ref.clone().lerp(b.ref, t),
			kappa: a.kappa + (b.kappa - a.kappa) * t, keep: a.keep + (b.keep - a.keep) * t, sleeve: a.sleeve + (b.sleeve - a.sleeve) * t,
		});
	}
	return { pts: out, length: total };
}

// Cover field near a point, from the garment-surface vertices around it (inverse-distance
// weighted). Used to find how wide the fabric is beside an edge, so a rim on a narrow strap
// narrows instead of overlapping the rim on its other edge.
class CoverLookup {
	constructor(body) {
		const G = body.garmentPos, C = body.aCover.array, cell = this.cell = 0.006, map = this.map = new Map();
		this.G = G; this.C = C;
		for (let i = 0; i < body.vertices; i++) {
			const k = this.key(Math.floor(G[i * 3] / cell), Math.floor(G[i * 3 + 1] / cell), Math.floor(G[i * 3 + 2] / cell));
			const l = map.get(k); if (l) l.push(i); else map.set(k, [i]);
		}
	}
	key(i, j, k) { return (i + 1024) + (j + 1024) * 2048 + (k + 1024) * 4194304; }
	at(q) {
		const { cell, map, G, C } = this, ci = Math.floor(q.x / cell), cj = Math.floor(q.y / cell), ck = Math.floor(q.z / cell);
		let sw = 0, s = 0;
		for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) for (let k = ck - 1; k <= ck + 1; k++) {
			const l = map.get(this.key(i, j, k));
			if (l) for (const v of l) {
				const d2 = (G[v * 3] - q.x) ** 2 + (G[v * 3 + 1] - q.y) ** 2 + (G[v * 3 + 2] - q.z) ** 2;
				if (d2 > cell * cell) continue;
				const w = 1 / (d2 + 1e-6); sw += w; s += w * C[v];
			}
		}
		return sw ? s / sw : null;
	}
}

export class Trim {
	constructor(scene) {
		this.materials = [createFabricMaterial(4), createFabricMaterial(4)]; // [body openings, sleeve cuffs]
		this.meshes = this.materials.map((m) => {
			const mesh = new THREE.Mesh(new THREE.BufferGeometry(), m);
			mesh.renderOrder = -4; // outermost layer: drawn first, so the fabric under it fails the depth test
			mesh.frustumCulled = false;
			scene.add(mesh);
			return mesh;
		});
		this.finish = 'elastic';
	}

	get keepOut() { return TRIMS[this.finish].width + 0.0015; } // stones stay off the elastic (a standard maker rule)

	// Fabric on each rim: the zone's own fabric for turned elastic, the binding fabric for binding.
	applyFabrics(state) {
		const t = state.trim, f = TRIMS[t.finish];
		const zones = t.finish === 'binding' ? [t, t] : [state.body, state.sleeve];
		this.materials.forEach((m, i) => {
			const z = zones[i];
			applyFabric(m, z.fabric, z.colour, z.second);
			const u = m.userData.u;
			u.uRows.value.set(f.rows[0], f.rows[1]);
			u.uThread.value.set(z.colour).multiplyScalar(0.8); // thread matched to the fabric, a shade darker
		});
	}

	// Rebuild the rims for the current body and style. layers = the fabric layer meshes, whose cut
	// is pulled back under the rim.
	build(body, state, layers) {
		this.finish = state.trim.finish;
		const T = TRIMS[this.finish], prof = T.profile, W = T.width, long = state.sleeves === 'long';
		for (const l of layers) { l.material.userData.u.uTrimInset.value = INSET; l.material.userData.u.uTrimWidth.value = W; }
		const lookup = new CoverLookup(body), groups = [[], []];
		for (const raw of body.edgeLoops()) {
			const { pts, length } = resample(raw);
			const n = pts.length;
			const P = pts.map((p) => p.p), Nn = pts.map((p) => p.n), In = pts.map((p) => p.inside), K = pts.map((p) => p.kappa);
			smoothLoop(P, 3, 2, true); smoothLoop(Nn, 4, 2, true); smoothLoop(In, 4, 1, true); smoothLoop(K, 8, 2, false);
			const frames = [], scale = [], q = new THREE.Vector3();
			for (let i = 0; i < n; i++) {
				const nn = Nn[i].normalize(), t = P[(i + 1) % n].clone().sub(P[(i - 1 + n) % n]).normalize();
				const d = new THREE.Vector3().crossVectors(nn, t).normalize();
				if (d.dot(In[i]) < 0) d.negate();
				const kap = THREE.MathUtils.clamp(K[i], -30, 30);
				frames.push({ p: P[i], n: nn, d, kap });
				// Width available beside the edge: walk inward until the cover field peaks (the middle
				// of a strap) or turns back down.
				let best = -1, peakU = W;
				for (let u = 0.001; u <= W + 0.001; u += 0.001) {
					const c = lookup.at(q.copy(P[i]).addScaledVector(d, u).addScaledVector(nn, -kap * u * u / 2));
					if (c === null) break;
					if (c < best - 0.0004) { peakU = u - 0.001; break; }
					best = Math.max(best, c);
				}
				scale.push(THREE.MathUtils.clamp(peakU / W, 0.35, 1));
			}
			smoothLoop(scale, 6, 2, false);
			const sleeve = long && pts.reduce((s, p) => s + (p.sleeve > 0 ? 1 : 0), 0) > n / 2;
			groups[sleeve ? 1 : 0].push({ frames, scale, pts, length });
		}
		groups.forEach((loops, gi) => {
			const old = this.meshes[gi].geometry;
			this.meshes[gi].geometry = buildGeometry(loops, prof);
			old.dispose();
		});
	}
}

export function buildGeometry(loops, prof) {
	const M = prof.length;
	// Profile normals in the (u, v) plane, from the profile's own tangent.
	const pn = prof.map((_, k) => {
		const a = prof[Math.max(k - 1, 0)], b = prof[Math.min(k + 1, M - 1)], du = b[0] - a[0], dv = b[1] - a[1], l = Math.hypot(du, dv);
		return [-dv / l, du / l];
	});
	let V = 0;
	for (const l of loops) V += l.frames.length * M;
	const pos = new Float32Array(V * 3), nrm = new Float32Array(V * 3), ref = new Float32Array(V * 3), rim = new Float32Array(V * 2);
	const keep = new Float32Array(V), ao = new Float32Array(V), cover = new Float32Array(V).fill(1), index = [];
	const tan = new Float32Array(V * 4); // along the edge: anisotropic fabrics need a tangent frame
	const v = new THREE.Vector3(), nv = new THREE.Vector3();
	let base = 0;
	for (const { frames, scale, pts, length, open } of loops) {
		const n = frames.length;
		for (let i = 0; i < n; i++) {
			const { p, n: sn, d, kap } = frames[i], s = scale[i], along = (i / n) * length;
			for (let k = 0; k < M; k++) {
				const o = base + i * M + k, u = prof[k][0] * s;
				v.copy(p).addScaledVector(d, u).addScaledVector(sn, prof[k][1] - kap * u * u / 2);
				v.toArray(pos, o * 3);
				nv.copy(d).multiplyScalar(pn[k][0]).addScaledVector(sn, pn[k][1]).normalize().toArray(nrm, o * 3);
				pts[i].ref.toArray(ref, o * 3);
				rim[o * 2] = prof[k][0]; rim[o * 2 + 1] = along;
				const tv = nv.clone().crossVectors(d, sn).normalize();
				tan[o * 4] = tv.x; tan[o * 4 + 1] = tv.y; tan[o * 4 + 2] = tv.z; tan[o * 4 + 3] = 1;
				keep[o] = pts[i].keep; ao[o] = prof[k][2];
			}
		}
		// Winding: the triangle (i, k) -> (i, k+1) -> (i+1, k) faces along the profile normal
		// when the loop runs one way; flip the whole loop if it runs the other.
		const a = new THREE.Vector3().fromArray(pos, (base + 1) * 3), b = new THREE.Vector3().fromArray(pos, (base + 2) * 3), c = new THREE.Vector3().fromArray(pos, (base + M + 1) * 3);
		const face = b.clone().sub(a).cross(c.clone().sub(a)), flip = face.dot(new THREE.Vector3().fromArray(nrm, (base + 1) * 3)) < 0;
		for (let i = 0; i < (open ? n - 1 : n); i++) for (let k = 0; k < M - 1; k++) {
			const i0 = base + i * M + k, i1 = base + ((i + 1) % n) * M + k;
			if (flip) index.push(i0, i1, i0 + 1, i0 + 1, i1, i1 + 1);
			else index.push(i0, i0 + 1, i1, i0 + 1, i1 + 1, i1);
		}
		base += n * M;
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
	g.setAttribute('aRef', new THREE.BufferAttribute(ref, 3));
	g.setAttribute('aRim', new THREE.BufferAttribute(rim, 2));
	g.setAttribute('aKeep', new THREE.BufferAttribute(keep, 1));
	g.setAttribute('aAO', new THREE.BufferAttribute(ao, 1));
	g.setAttribute('aCover', new THREE.BufferAttribute(cover, 1));
	g.setAttribute('tangent', new THREE.BufferAttribute(tan, 4));
	g.setIndex(index);
	return g;
}
