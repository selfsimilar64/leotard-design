// The skin pressed in under a fitted garment, and shaded where it is (fit realism plan stage 6, a soft body:
// knowledge/engineering/app/fit-realism-plan.md). With a soft body the re-fit lets fabric sink into the skin where the flesh gives
// (fit/refit-wgsl.js surface_at, body/mannequin.js soft); drawn as it is the skin would show through. So the skin is drawn pressed in:
//  - under the fabric, to the fabric's own depth: each skin vertex reads it off the fabric triangle it lies under (the triangle's
//    corners at its points' contacts on the skin, facing the skin's way; the depth linear across it), then smoothed (the triangles'
//    facets). Continuous, so nothing point by point: three earlier versions drew a bump or disc per fit point (7-8 mm apart) and
//    showed teeth, blotches or stripes along the elastic in the body's normals (owner, 2026-11-11);
//  - along each opening a groove of a set cross-section: the elastic's depth at the edge, smooth walls rising W_IN inside (wider where
//    it is deeper: SLOPE times the depth) and the shape's `out` outside (its recovery: at least outSlope times the depth), and the flesh
//    rising past it (rise of the depth, over riseW), what the elastic pushes in goes somewhere. The fabric's own depth falls off within
//    one row inside the elastic, a groove one skin vertex wide that smoothing halved (the skin level with the fabric: the elastic lost
//    under it); blended along the edge. Outside the edge only the groove: the fabric's depth (smoothed, normalised by its coverage)
//    reaches about 15 mm onto bare skin, where it hid the recovery's width (the sweep of 2026-11-11), so it is faded out over SIDE_W
//    across the edge line;
//  - the skin never rises above the fabric drawn over it: held at least to the fabric's depth (smoothed) less LIFT, plus a margin;
//  - the skin moves along normals smoothed over a few centimetres, so the two sides of a crease (the cleft) move together instead of
//    into each other (along their own normals they pinched into a ridge), and no more than ROOM of the way to skin facing it across a
//    fold (deep in the crotch at give 5000 the two sides crossed into a lump);
//  - the skin is darkened where fabric and the pressed-in skin overhang it (contact occlusion, worked out here once per fit from the
//    geometry: per skin vertex the share of its upper hemisphere within REACH that fabric or skin covers, a horizon estimate from point
//    samples), on top of each skin's own occlusion: the mannequin's ao slot (materials/fabric.js AO_FRAGMENT: ambient light, a third of
//    direct) and the realistic skin's aOcc (render/figure.js). The shadow map and the screen's GTAO cannot see a groove a few mm deep.
// Display only: the body the fit stands on (Mannequin.aPos) is never changed.
import * as THREE from 'three';
import { vertexNormals } from '../body/mannequin.js';
import { setFabricSlot } from '../materials/fabric-attributes.js';

const CELL = 0.01;       // m, the grid skin vertices and fabric points are found in
const COVER_TOL = 0.003; // m, how near a fabric triangle a skin vertex lies to be under it
const COVER_BAR = 0.02;  // how far outside a triangle (in its barycentric coordinates) still counts: the seams between triangles
const MAX_TRI = 0.02;    // m, a fabric triangle with a longer side between its contacts is not lying on the skin (a hollow bridged)
const FACING = 0.5;      // a skin vertex under a triangle faces its way at least this much (not the skin across a fold)
const SMOOTH = 3;        // smoothing of the fabric's depth under it (its triangles' facets)
const W_IN = 0.012;      // m, the groove's wall inside an opening (under the fabric)
const SLOPE = 1.5;       // that wall at least this many times the depth wide (a deeper press spreads wider; at give 5000, 2 cm deep in
// 1.2 cm walls, the skin's triangles crumpled)
const SIDE_W = 0.002;    // m, across an opening's edge line, the fabric's own depth faded out over this either side (outside: the groove)
const EDGE_W = 0.01;     // m, along an opening, how far each edge point's cross-section is blended with its neighbours'
const HOLD_MARGIN = 0.0008; // m, the skin kept that much under the fabric as drawn (LIFT off its fit)
const MAX_DENT = 0.03;   // m, deepest drawn (a guard; the fit's own depths are what is drawn)
const NORMAL_PASSES = 12; // smoothing of the directions the skin moves along (about 1.5 cm)
const ROOM = 0.5;        // the skin moved at most this share of the way to skin facing it across a fold
const OCC_PASSES = 4;    // smoothing of the contact occlusion (a per-vertex estimate from point samples is noisy)
const REACH = 0.015;     // m, the occlusion's reach
const LIFT = 0.0024;     // m, the fabric drawn off its fit (render/fitted.js options.lift and the fabric material's own)
// The finished edge drawn over each opening (render/fitted.js finish: garment/trim.js TRIMS.elastic swept along the opening's points,
// lifted render/fitted.js options.lift; the rims' material adds none): BAND_W across, into the fabric (its profile's widest, 11.2 mm),
// its lowest at RIM_CLEAR over the edge points' fit (the lift and the rolled lip's 0.2 mm). The skin is kept under it too: the fabric's
// own depth climbs inward under the band where the fit's next row sits shallower, and the skin following it covered the band's half
// (owner, 2026-11-11: "the elastic bands disappear").
const BAND_W = 0.0112;
const RIM_CLEAR = 0.0012 + 0.0002;
const BAND_MARGIN = 0.0015; // m, the skin kept that much under the band (hidden by it; only its outer lip meets the skin)
const COS_MIN = 0.7;     // the skin moves along smoothed normals: its move is lengthened by 1 / (smoothed . own normal), to this at most
const OCC_MIN = 0.35;
// The groove's shape outside an opening and the shading, set by the designer (Settings, Pressed skin: render/display.js dent*, passed as
// render/fitted.js options.dent; trials 2026-11-11, being chosen by eye): out, the wall outside (m: how far out the skin is back up);
// outSlope, that wall at least this many times the depth (0: the same everywhere; a narrow wall where the elastic presses 12 mm deep
// is a cliff the body's 4-6 mm mesh draws lumpy); rise, how much of the depth the flesh rises just outside it; riseW, the rise's reach
// (m, its peak at half of it); shade, the contact occlusion's strength. Defaults: the middle of the rear sweep (2-12 mm walls), 6 mm
// clean in passe and the lunge; the rise and shading as before.
export const DENT_DEFAULTS = { out: 0.006, outSlope: 0, rise: 0.35, riseW: 0.011, shade: 1.4 };
// The narrowest wall outside drawn (m): the body's mesh is 4-6 mm between vertices at the leg line, so a narrower wall cannot be drawn
// and the smoothing that keeps it from facetting lifted the skin at the edge over the band and the fabric (owner's 1 mm, 2026-11-11:
// the skin at the edge pressed 1-4 mm where the fit sank the fabric 6-8 mm). The Settings bar starts here (ui/Studio.jsx PressedSkin).
export const MIN_WALL = 0.004;

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

// The skin drawn under a soft-body fit: { P, N (positions and normals pressed in), occ (per vertex, 0-1), move }. contacts: per fit
// point (closest skin point xyz, signed depth: refit.js contacts); X: the fit's points; edges: Map of the fit points on the garment's
// openings to their inward direction (unit, into the fabric, across the edge: render/fitted.js openingsInward); tris: the fit's
// triangles (points' indices); shape: DENT_DEFAULTS' fields; Q, N: the skin they stood on.
export function pressedSkin(man, contacts, X, edges, tris, shape = DENT_DEFAULTS, Q = man.aPos.array, N = man.aNrm.array) {
	const { out: OUT, outSlope: OUT_SLOPE, rise: RISE, riseW: RISE_W, shade: OCC } = { ...DENT_DEFAULTS, ...shape };
	const nv = man.vertices, np = X.length / 3, near = gridOf(Q, nv), bump = (d, r) => (d >= r ? 0 : (1 - (d / r) ** 2) ** 2);
	const C = (i, k) => contacts[4 * i + k], depthOf = (i) => Math.min(-contacts[4 * i + 3], MAX_DENT); // under the skin (< 0: over)
	// each fit point's nearest skin vertex (at its contact): which way the skin faces there (the garment's halves wind opposite ways)
	const host = new Int32Array(np).fill(-1);
	for (let i = 0; i < np; i++) { let best = Infinity; near(C(i, 0), C(i, 1), C(i, 2), CELL, (v, d) => { if (d < best) { best = d; host[i] = v; } }); }
	const facing = (i, x, y, z) => (host[i] < 0 ? 0 : N[3 * host[i]] * x + N[3 * host[i] + 1] * y + N[3 * host[i] + 2] * z);
	// under the fabric: the depth of the triangle each skin vertex lies under (the nearest within COVER_TOL), linear across it
	const under = new Float32Array(nv), gap = new Float32Array(nv).fill(Infinity), touched = new Uint8Array(nv);
	for (let t = 0; t < tris.length; t += 3) {
		const a = tris[t], b = tris[t + 1], c = tris[t + 2], ax = C(a, 0), ay = C(a, 1), az = C(a, 2);
		const ux = C(b, 0) - ax, uy = C(b, 1) - ay, uz = C(b, 2) - az, wx = C(c, 0) - ax, wy = C(c, 1) - ay, wz = C(c, 2) - az;
		const uu = ux * ux + uy * uy + uz * uz, ww = wx * wx + wy * wy + wz * wz, uw = ux * wx + uy * wy + uz * wz, den = uu * ww - uw * uw;
		const vv = (ux - wx) ** 2 + (uy - wy) ** 2 + (uz - wz) ** 2;
		if (den < 1e-14 || Math.max(uu, ww, vv) > MAX_TRI * MAX_TRI) continue; // collapsed, or bridging a hollow
		let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
		const nl = Math.hypot(nx, ny, nz), sgn = facing(a, nx, ny, nz) + facing(b, nx, ny, nz) + facing(c, nx, ny, nz) < 0 ? -1 : 1;
		nx *= sgn / nl; ny *= sgn / nl; nz *= sgn / nl;
		const mx = ax + (ux + wx) / 3, my = ay + (uy + wy) / 3, mz = az + (uz + wz) / 3, far2 = (x, y, z) => (x - mx) ** 2 + (y - my) ** 2 + (z - mz) ** 2;
		const r = Math.sqrt(Math.max(far2(ax, ay, az), far2(C(b, 0), C(b, 1), C(b, 2)), far2(C(c, 0), C(c, 1), C(c, 2)))) + COVER_TOL;
		const da = depthOf(a), db = depthOf(b), dc = depthOf(c);
		near(mx, my, mz, r, (v) => {
			const px = Q[3 * v] - ax, py = Q[3 * v + 1] - ay, pz = Q[3 * v + 2] - az, h = Math.abs(px * nx + py * ny + pz * nz);
			if (h >= COVER_TOL || h >= gap[v] || N[3 * v] * nx + N[3 * v + 1] * ny + N[3 * v + 2] * nz < FACING) return;
			const pu = px * ux + py * uy + pz * uz, pw = px * wx + py * wy + pz * wz, s = (ww * pu - uw * pw) / den, q = (uu * pw - uw * pu) / den;
			if (s < -COVER_BAR || q < -COVER_BAR || s + q > 1 + COVER_BAR) return;
			gap[v] = h; under[v] = (1 - s - q) * da + s * db + q * dc; touched[v] = 1;
		});
	}
	// the groove along each opening: each edge point's cross-section (out: across the edge, < 0 inside), blended with its neighbours'
	// by how far along the edge they are
	const grooveS = new Float32Array(nv), grooveW = new Float32Array(nv), grooveO = new Float32Array(nv);
	const bandS = new Float32Array(nv), bandW = new Float32Array(nv); // the edge's depth under the drawn band, blended the same way
	for (const [i, inward] of edges) {
		const depth = Math.max(depthOf(i), 0), cx = C(i, 0), cy = C(i, 1), cz = C(i, 2);
		const wIn = Math.max(W_IN, SLOPE * depth), wOut = Math.max(OUT, OUT_SLOPE * depth, MIN_WALL), wRise = Math.max(RISE_W, 0.0005);
		near(cx, cy, cz, Math.max(wRise, wIn, BAND_W + MIN_WALL) + EDGE_W, (v, d) => {
			const out = -((Q[3 * v] - cx) * inward[0] + (Q[3 * v + 1] - cy) * inward[1] + (Q[3 * v + 2] - cz) * inward[2]);
			const w = bump(Math.sqrt(Math.max(d * d - out * out, 0)), EDGE_W);
			if (!(w > 0)) return;
			// (one skin vertex, 4 mm, past the band's inner end: the skin's triangle reaching under it is straight between its vertices)
			if (out >= -BAND_W - MIN_WALL && out <= SIDE_W) { bandS[v] += w * depth; bandW[v] += w; touched[v] = 1; }
			if (out < -wIn) return;
			let p;
			if (out < 0) { const g = -out / wIn; p = 1 - g * g * (3 - 2 * g); }
			else { const g = Math.min(out / wOut, 1), u = Math.min(out / wRise, 1); p = 1 - g * g * (3 - 2 * g) - RISE * 16 * u * u * (1 - u) * (1 - u); }
			grooveS[v] += w * depth * p; grooveW[v] += w; grooveO[v] += w * out; touched[v] = 1;
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
	// the fabric's depth smoothed, and how much of the smoothing came from under it (cov): the depth itself (inner / cov) where the
	// groove is, the groove's alone outside the edge line (si: by the weighted distance across the edge; the form the 2026-11-11 sweep
	// was judged on)
	const inner = new Float32Array(nv), cov = new Float32Array(nv);
	for (let v = 0; v < nv; v++) if (gap[v] < Infinity) { inner[v] = Math.max(under[v], 0); cov[v] = 1; }
	smooth(inner, man, SMOOTH, list); smooth(cov, man, SMOOTH, list);
	const move = new Float32Array(nv); // inward, m (negative: outward)
	for (let v = 0; v < nv; v++) {
		if (!(grooveW[v] > 0)) { move[v] = inner[v]; continue; }
		const g = grooveS[v] / grooveW[v], c = cov[v], m = c > 1e-6 ? inner[v] / c : 0;
		const t = Math.min(Math.max((grooveO[v] / grooveW[v] + SIDE_W) / (2 * SIDE_W), 0), 1), si = 1 - t * t * (3 - 2 * t);
		move[v] = si * Math.max(g, m) + (1 - si) * g;
	}
	smooth(move, man, 1, list);
	// never over the fabric, nor over the band drawn on the opening
	const hold = smooth(Float32Array.from(under), man, 1, list);
	for (let v = 0; v < nv; v++) hold[v] = gap[v] < Infinity ? hold[v] - LIFT + HOLD_MARGIN : -Infinity;
	// under the band: from the deeper of the edge's depth and the fabric's own there (the band bends with the fabric across: a concave
	// fabric takes it below the edge's level), with BAND_MARGIN (at 0.8 mm the skin still showed through it in a few places)
	for (let v = 0; v < nv; v++) if (bandW[v] > 0) hold[v] = Math.max(hold[v], Math.max(bandS[v] / bandW[v], gap[v] < Infinity ? under[v] : 0) - RIM_CLEAR + BAND_MARGIN);
	for (let v = 0; v < nv; v++) if (move[v] < hold[v]) move[v] = hold[v];
	// along normals smoothed over the area (a crease's two sides move together), as far as reaches the depth along the skin's own normal
	const M = smooth(Float32Array.from(N), man, NORMAL_PASSES, list, 3);
	for (const v of list) {
		const l = Math.hypot(M[3 * v], M[3 * v + 1], M[3 * v + 2]) || 1;
		for (let k = 0; k < 3; k++) M[3 * v + k] /= l;
		move[v] /= Math.max(M[3 * v] * N[3 * v] + M[3 * v + 1] * N[3 * v + 1] + M[3 * v + 2] * N[3 * v + 2], COS_MIN);
	}
	// room in a fold: no more than ROOM of the way to skin facing it (its normal against this one's) ahead of where it moves; the
	// limit as a factor, smoothed so it leaves no edge
	const fac = new Float32Array(nv).fill(1);
	let limited = 0;
	for (const v of list) {
		const m = move[v];
		if (Math.abs(m) < 0.001) continue;
		const sg = -Math.sign(m), dx = sg * M[3 * v], dy = sg * M[3 * v + 1], dz = sg * M[3 * v + 2], nx = N[3 * v], ny = N[3 * v + 1], nz = N[3 * v + 2];
		let room = Infinity;
		near(Q[3 * v], Q[3 * v + 1], Q[3 * v + 2], Math.abs(m) / ROOM + 0.002, (p, d) => {
			if (d < 1e-6 || N[3 * p] * nx + N[3 * p + 1] * ny + N[3 * p + 2] * nz > 0) return; // the same sheet
			if ((Q[3 * p] - Q[3 * v]) * dx + (Q[3 * p + 1] - Q[3 * v + 1]) * dy + (Q[3 * p + 2] - Q[3 * v + 2]) * dz > 0 && d < room) room = d;
		});
		if (ROOM * room < Math.abs(m)) { fac[v] = (ROOM * room) / Math.abs(m); limited++; }
	}
	if (limited) { smooth(fac, man, 3, list); for (const v of list) move[v] *= fac[v]; }
	const P = new Float32Array(nv * 3), Nd = new Float32Array(nv * 3);
	for (let v = 0; v < nv; v++) for (let k = 0; k < 3; k++) P[3 * v + k] = Q[3 * v + k] - M[3 * v + k] * move[v];
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
