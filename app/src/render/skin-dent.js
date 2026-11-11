// The skin pressed in under a fitted garment, and shaded where it is (fit realism plan stage 6, a soft body:
// knowledge/engineering/app/fit-realism-plan.md). With a soft body the re-fit lets fabric sink into the skin where the flesh gives
// (fit/refit-wgsl.js surface_at, body/mannequin.js soft); drawn as it is the skin would show through. So the skin is drawn pressed in:
//  - each fabric point's contact as the fit's last query left it (its closest skin point and its depth there: refit.js contacts) is
//    spread over the skin round that point with a smooth falloff, points not pressing counting as no depth, so the dent is even along
//    an elastic and fades where the fabric stops pressing (the first version, depth to the nearest skin vertex then the deepest
//    neighbour's, left blotches and plateaus);
//  - the skin moves in along normals smoothed over a few centimetres, so the two sides of a crease (the cleft) move together instead of
//    into each other (along their own normals they pinched into a ridge);
//  - just outside the fabric the flesh rises a little (BULGE): what is pushed in under an elastic edge goes somewhere;
//  - the skin is darkened where fabric and the pressed-in skin overhang it (contact occlusion, worked out here once per fit from the
//    geometry: per skin vertex the share of its upper hemisphere within REACH that fabric or skin covers, a horizon estimate from point
//    samples), on top of each skin's own occlusion: the mannequin's ao slot (materials/fabric.js AO_FRAGMENT: ambient light, a third of
//    direct) and the realistic skin's aOcc (render/figure.js). The shadow map and the screen's GTAO cannot see a groove a few mm deep.
// Display only: the body the fit stands on (Mannequin.aPos) is never changed.
import * as THREE from 'three';
import { vertexNormals } from '../body/mannequin.js';
import { setFabricSlot } from '../materials/fabric-attributes.js';

const CELL = 0.01;       // m, the grid skin vertices and fabric points are found in
const SPREAD = 0.014;    // m, how far round its contact a fabric point's depth reaches (about twice the fit's spacing: at 8 mm the groove along an elastic scalloped between its points)
const COVER = 0.012;     // m, a skin vertex this near a fit point (on the fabric's side of an opening) lies under the fabric
const MAX_DENT = 0.03;   // m, deepest drawn (a guard; the fit's own depths are what is drawn)
const NORMAL_PASSES = 12; // smoothing of the directions the skin moves along (about 1.5 cm)
const BULGE = 0.5;       // how much of the nearby depth rises just outside the fabric
const BULGE_PASSES = 10; // its reach (about 1.5 cm)
const REACH = 0.015;     // m, the occlusion's reach
const LIFT = 0.0024;     // m, the fabric drawn off its fit (render/fitted.js options.lift and the fabric material's own)
const OCC = 1.4;         // occlusion strength (TUNABLE, by eye)
const OCC_MIN = 0.35;

// A spatial hash of points P (xyz), of the members listed (all of them by default): (x, y, z, r, fn) calls fn(index, distance) for every
// member within r. Cells keyed by a hashed integer (a collision only merges two cells: the distance test still holds).
const key = (a, b, c) => ((a * 73856093) ^ (b * 19349663) ^ (c * 83492791)) | 0;
function gridOf(P, count, cell = CELL, members = null) {
	const grid = new Map(), add = (v) => {
		const k = key(Math.floor(P[3 * v] / cell), Math.floor(P[3 * v + 1] / cell), Math.floor(P[3 * v + 2] / cell));
		const list = grid.get(k);
		if (list) list.push(v); else grid.set(k, [v]);
	};
	if (members) for (const v of members) add(v); else for (let v = 0; v < count; v++) add(v);
	return (x, y, z, r, fn) => {
		const n = Math.ceil(r / cell), cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell), r2 = r * r;
		for (let a = -n; a <= n; a++) for (let b = -n; b <= n; b++) for (let c = -n; c <= n; c++) {
			const list = grid.get(key(cx + a, cy + b, cz + c));
			if (list) for (const v of list) {
				const dx = P[3 * v] - x, dy = P[3 * v + 1] - y, dz = P[3 * v + 2] - z, d2 = dx * dx + dy * dy + dz * dz;
				if (d2 < r2) fn(v, Math.sqrt(d2));
			}
		}
	};
}

// Averaging with the neighbours, `passes` times, over the vertices listed (only), each `dim` values wide.
function smooth(f, man, passes, list, dim = 1) {
	const S = man.adjStart, A = man.adj;
	for (let p = 0; p < passes; p++) {
		const f0 = f.slice();
		for (const v of list) for (let c = 0; c < dim; c++) {
			let s = f0[dim * v + c];
			for (let k = S[v]; k < S[v + 1]; k++) s += f0[dim * A[k] + c];
			f[dim * v + c] = s / (S[v + 1] - S[v] + 1);
		}
	}
	return f;
}

// The skin drawn under a soft-body fit: { P, N (positions and normals pressed in), occ (per vertex, 0-1) }. contacts: per fit point
// (closest skin point xyz, signed depth: refit.js contacts); X: the fit's points; edges: Map of the fit points on the garment's openings
// to their inward direction (into the fabric, any length): the dent stops at the fabric's edge (spread from the contacts it reached
// a centimetre past it, a groove on bare skin below the leg line), and the occlusion is worked out only round the openings (the skin
// under the fabric does not show); Q, N: the skin they stood on.
export function pressedSkin(man, contacts, X, edges, Q = man.aPos.array, N = man.aNrm.array) {
	const nv = man.vertices, np = X.length / 3, near = gridOf(Q, nv);
	// depth spread from each contact, weighted, points not pressing counting as none
	const acc = new Float64Array(nv), wsum = new Float64Array(nv);
	for (let i = 0; i < np; i++) {
		const depth = Math.min(Math.max(-contacts[4 * i + 3], 0), MAX_DENT);
		near(contacts[4 * i], contacts[4 * i + 1], contacts[4 * i + 2], SPREAD, (v, d) => { const w = (1 - d / SPREAD) ** 2; acc[v] += w * depth; wsum[v] += w; });
	}
	// covered: the fabric lies over it: its nearest fit point within COVER, and if that is on an opening, on the fabric's side of it
	const dent = new Float32Array(nv), under = new Uint8Array(nv), fabricAt = gridOf(X, np);
	for (let v = 0; v < nv; v++) {
		if (!(wsum[v] > 0)) continue;
		let bi = -1, best = Infinity;
		fabricAt(Q[3 * v], Q[3 * v + 1], Q[3 * v + 2], COVER, (i, d) => { if (d < best) { best = d; bi = i; } });
		if (bi < 0) continue;
		const inward = edges.get(bi);
		if (inward && (Q[3 * v] - X[3 * bi]) * inward[0] + (Q[3 * v + 1] - X[3 * bi + 1]) * inward[1] + (Q[3 * v + 2] - X[3 * bi + 2]) * inward[2] < 0) continue;
		under[v] = 1; dent[v] = acc[v] / wsum[v];
	}
	// the vertices worked on: under the fabric and a few cm round it (each pass reaches about one edge further)
	const S = man.adjStart, A = man.adj, inSet = under.slice();
	for (let p = 0; p < Math.max(BULGE_PASSES, NORMAL_PASSES) + 2; p++) {
		const f0 = inSet.slice();
		for (let v = 0; v < nv; v++) if (!f0[v]) for (let k = S[v]; k < S[v + 1]; k++) if (f0[A[k]]) { inSet[v] = 1; break; }
	}
	const list = [];
	for (let v = 0; v < nv; v++) if (inSet[v]) list.push(v);
	smooth(dent, man, 5, list);
	for (let v = 0; v < nv; v++) if (!under[v]) dent[v] = 0; // smoothing carried it past the edge: not there
	smooth(dent, man, 1, list); // a ring's softening at the edge
	// the flesh beside it rises: outside the fabric, a share of the depth nearby
	const wide = smooth(dent.slice(), man, BULGE_PASSES, list);
	const move = new Float32Array(nv); // inward, m (negative: outward)
	for (let v = 0; v < nv; v++) move[v] = under[v] ? dent[v] : -BULGE * wide[v];
	// along normals smoothed over the area (a crease's two sides move together)
	const M = smooth(Float32Array.from(N), man, NORMAL_PASSES, list, 3);
	const P = new Float32Array(nv * 3), Nd = new Float32Array(nv * 3);
	for (let v = 0; v < nv; v++) {
		const l = Math.hypot(M[3 * v], M[3 * v + 1], M[3 * v + 2]) || 1;
		for (let k = 0; k < 3; k++) P[3 * v + k] = Q[3 * v + k] - (M[3 * v + k] / l) * move[v];
	}
	vertexNormals(P, man.idx, Nd);
	// contact occlusion: near the fabric, the share of each skin vertex's upper hemisphere (within REACH) that the fabric (as drawn,
	// lifted off its fit) or the pressed-in skin covers; elsewhere none
	const F = new Float32Array(np * 3);
	for (let i = 0; i < np; i++) {
		// lifted along the skin's direction at its contact (the fabric's own normals are what show() uses; this is close enough here)
		let bv = -1, best = Infinity;
		near(contacts[4 * i], contacts[4 * i + 1], contacts[4 * i + 2], CELL, (v, d) => { if (d < best) { best = d; bv = v; } });
		for (let k = 0; k < 3; k++) F[3 * i + k] = X[3 * i + k] + (bv >= 0 ? Nd[3 * bv + k] : 0) * LIFT;
	}
	const fabricNear = gridOf(F, np, REACH), skinNear = gridOf(P, nv, REACH, list), occ = new Float32Array(nv).fill(1);
	// the skin round the openings (within twice REACH of an opening's point): where the fabric's edge and the groove beside it show
	const round = new Uint8Array(nv);
	for (const i of edges.keys()) skinNear(F[3 * i], F[3 * i + 1], F[3 * i + 2], 2 * REACH, (v) => { round[v] = 1; });
	for (let v = 0; v < nv; v++) {
		if (!round[v]) continue;
		const px = P[3 * v], py = P[3 * v + 1], pz = P[3 * v + 2], nx = Nd[3 * v], ny = Nd[3 * v + 1], nz = Nd[3 * v + 2];
		let cover = 0, total = 0;
		const sample = (Arr) => (j, d) => {
			if (d < 1e-5) return;
			const h = (Arr[3 * j] - px) * nx + (Arr[3 * j + 1] - py) * ny + (Arr[3 * j + 2] - pz) * nz, w = 1 - d / REACH;
			cover += w * Math.max(h / d, 0); total += w;
		};
		fabricNear(px, py, pz, REACH, sample(F));
		skinNear(px, py, pz, REACH, sample(P));
		if (total > 0) occ[v] = Math.max(OCC_MIN, 1 - OCC * cover / total);
	}
	return { P, N: Nd, occ, move };
}

// The skin shown, pressed in and shaded: the mannequin's mesh takes positions and normals of its own while pressed (its usual ones are
// the body's own arrays, which the fit and everything else read) and its occlusion slot the body's own times this; the realistic skin
// is told the same (render/figure.js setDent).
export class SkinDent {
	constructor(engine) { this.engine = engine; this.own = null; this.shared = null; }

	// skin: pressedSkin's, or null for the skin as it is
	set(skin) {
		const e = this.engine, man = e.body, g = e.skinMesh?.geometry;
		e.figure?.setDent?.(skin ? this.moved(skin) : null, skin?.occ ?? null);
		if (!g) return;
		if (!skin) {
			if (this.own) {
				g.setAttribute('position', this.shared.pos); g.setAttribute('normal', this.shared.nrm); this.own = null;
				setFabricSlot(man.geometry, 'ao', man.aAO.array);
			}
			return;
		}
		const n = man.vertices * 3;
		if (!this.own || this.own.pos.array.length !== n) {
			this.shared = { pos: g.attributes.position, nrm: g.attributes.normal };
			this.own = { pos: new THREE.BufferAttribute(new Float32Array(n), 3), nrm: new THREE.BufferAttribute(new Float32Array(n), 3) };
			g.setAttribute('position', this.own.pos); g.setAttribute('normal', this.own.nrm);
		}
		this.own.pos.array.set(skin.P); this.own.nrm.array.set(skin.N);
		this.own.pos.needsUpdate = this.own.nrm.needsUpdate = true;
		const ao = man.aAO.array;
		setFabricSlot(man.geometry, 'ao', Float32Array.from(ao, (a, v) => a * skin.occ[v]));
	}

	// per skin vertex the move (x, y, z), for the realistic skin built on the same vertices (its first subdivision level)
	moved(skin) {
		const Q = this.engine.body.aPos.array;
		return Float32Array.from(skin.P, (p, j) => p - Q[j]);
	}
}
