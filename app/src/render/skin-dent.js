// The skin pressed in under a fitted garment, and shaded where it is (fit realism plan stage 6, a soft body:
// knowledge/engineering/app/fit-realism-plan.md). With a soft body the re-fit lets fabric sink into the skin where the flesh gives
// (fit/refit-wgsl.js surface_at, body/mannequin.js soft); drawn as it is the skin would show through. So the skin is drawn pressed in:
//  - a dip under every fabric point that presses in, a smooth round bump of its depth (zero slope at DIP_R): deepest under the
//    elastic, the flesh back at the surface within about a centimetre each side, as soft tissue does (the skin is the largest of the
//    bumps' blend, then lightly smoothed). Two earlier versions were jagged or flat: the depth spread and averaged then cut at
//    the fabric's edge vertex by vertex (a stepped rim, a flat floor), and before that the nearest point's depth then the deepest
//    neighbour's (blotches);
//  - just outside an opening the flesh rises (BULGE of the depth there, peaking about a centimetre out, smooth), what the elastic
//    pushes in goes somewhere;
//  - the skin never rises above the fabric drawn over it: within HOLD_R of a fit point it is pushed in at least as far as that point
//    sits under (or rises at most as far as it floats over) the skin it stood on, less a margin; the elastic was lost under the skin at
//    the seat and the cleft, where the bulge or the smoothing rose over it;
//  - the skin moves along normals smoothed over a few centimetres, so the two sides of a crease (the cleft) move together instead of
//    into each other (along their own normals they pinched into a ridge);
//  - the skin is darkened where fabric and the pressed-in skin overhang it (contact occlusion, worked out here once per fit from the
//    geometry: per skin vertex the share of its upper hemisphere within REACH that fabric or skin covers, a horizon estimate from point
//    samples), on top of each skin's own occlusion: the mannequin's ao slot (materials/fabric.js AO_FRAGMENT: ambient light, a third of
//    direct) and the realistic skin's aOcc (render/figure.js). The shadow map and the screen's GTAO cannot see a groove a few mm deep.
// Display only: the body the fit stands on (Mannequin.aPos) is never changed.
import * as THREE from 'three';
import { vertexNormals } from '../body/mannequin.js';
import { setFabricSlot } from '../materials/fabric-attributes.js';

const CELL = 0.01;       // m, the grid skin vertices and fabric points are found in
const DIP_R = 0.012;     // m, how far a pressing point's dip reaches (the flesh back at the surface)
const HOLD_R = 0.006;    // m, how near a fit point the skin is kept under it
const HOLD_MARGIN = 0.0008; // m, the skin kept that much under the fabric as drawn (LIFT off its fit): held only where the dip would
// not keep it there anyway (held at the fit itself, the discs round each point scalloped the groove)
const MAX_DENT = 0.03;   // m, deepest drawn (a guard; the fit's own depths are what is drawn)
const NORMAL_PASSES = 12; // smoothing of the directions the skin moves along (about 1.5 cm)
const BULGE = 0.35;      // how much of an opening's depth rises just outside it
const BULGE_R = 0.022;   // m, the rise's reach from the opening (its peak about a centimetre out)
const OCC_PASSES = 4;    // smoothing of the contact occlusion (a per-vertex estimate from point samples is noisy)
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
	const nv = man.vertices, np = X.length / 3, near = gridOf(Q, nv), bump = (d, r) => (1 - (d / r) ** 2) ** 2;
	const depthOf = (i) => -contacts[4 * i + 3]; // how far point i sits under the skin it stood on (negative: over it)
	// the dips blended: the bump-weighted mean of the depths times the bumps' sum (at most 1): along a row of points (an elastic) the
	// sum is about even, so the groove is too (the largest single bump scalloped between points 7 mm apart, about 16% deep)
	const dsum = new Float32Array(nv), bsum = new Float32Array(nv), hold = new Float32Array(nv).fill(-Infinity), touched = new Uint8Array(nv);
	for (let i = 0; i < np; i++) {
		const cx = contacts[4 * i], cy = contacts[4 * i + 1], cz = contacts[4 * i + 2], depth = Math.min(depthOf(i), MAX_DENT);
		if (depth > 0) near(cx, cy, cz, DIP_R, (v, d) => { const b = bump(d, DIP_R); dsum[v] += depth * b; bsum[v] += b; touched[v] = 1; });
		near(cx, cy, cz, HOLD_R, (v) => { const h = depth - LIFT + HOLD_MARGIN; if (h > hold[v]) hold[v] = h; touched[v] = 1; });
	}
	const dip = Float32Array.from(bsum, (b, v) => (b > 0 ? (dsum[v] / b) * Math.min(1, b) : 0));
	// the rise outside each opening: its depth there, a bump of BULGE_R, weighted from nothing at the edge to all of it a centimetre out
	// (which side from the edge point's inward direction)
	const rise = new Float32Array(nv);
	for (const [i, inward] of edges) {
		const depth = Math.min(depthOf(i), MAX_DENT);
		if (!(depth > 0)) continue;
		const l = Math.hypot(inward[0], inward[1], inward[2]) || 1, cx = contacts[4 * i], cy = contacts[4 * i + 1], cz = contacts[4 * i + 2];
		near(cx, cy, cz, BULGE_R, (v, d) => {
			const out = -((Q[3 * v] - cx) * inward[0] + (Q[3 * v + 1] - cy) * inward[1] + (Q[3 * v + 2] - cz) * inward[2]) / l;
			const w = out <= 0 ? 0 : out >= 0.01 ? 1 : (out / 0.01) ** 2 * (3 - 2 * out / 0.01);
			const u = BULGE * depth * bump(d, BULGE_R) * w;
			if (u > rise[v]) rise[v] = u;
			touched[v] = 1;
		});
	}
	// the vertices worked on: those reached, and a ring round them for the smoothing
	const S = man.adjStart, A = man.adj, inSet = touched.slice();
	for (let p = 0; p < NORMAL_PASSES + 2; p++) {
		const f0 = inSet.slice();
		for (let v = 0; v < nv; v++) if (!f0[v]) for (let k = S[v]; k < S[v + 1]; k++) if (f0[A[k]]) { inSet[v] = 1; break; }
	}
	const list = [];
	for (let v = 0; v < nv; v++) if (inSet[v]) list.push(v);
	const move = new Float32Array(nv); // inward, m (negative: outward)
	for (let v = 0; v < nv; v++) move[v] = dip[v] - rise[v];
	smooth(move, man, 3, list);
	for (let v = 0; v < nv; v++) if (move[v] < hold[v]) move[v] = hold[v]; // never over the fabric
	smooth(move, man, 1, list);
	for (let v = 0; v < nv; v++) if (move[v] < hold[v]) move[v] = hold[v];
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
	smooth(occ, man, OCC_PASSES, list);
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
