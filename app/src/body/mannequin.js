// Mannequin bodies and garment regions.
//
// The bodies are MakeHuman meshes baked by pipeline/build_mannequins.py: four ages, all the same
// mesh with different vertex positions, so vertex i is the same anatomical point on every body.
// That is what makes the leotard fit every size: the garment is designed once on the reference
// body (REF, the young adult) and every region field below is evaluated on the reference
// position of each vertex (attribute aRef), then carried to whichever body is shown.
//
// The leotard is not separate geometry. It is the same surface, pushed out in the vertex shader
// by a per-vertex "lift" (stretch fabric bridging the body's hollows, see computeLift) plus the
// fabric thickness, with "region fields" deciding where fabric exists (see regions()). The fields
// are stored per vertex (aCover / aZone) and thresholded per pixel in fabric.js; stones.js reads
// the same per-vertex values through surface points so stones only land on fabric.
import * as THREE from 'three';
import { regions } from '../garment/legacy-regions.js';
import { applyPose, isRest } from './pose.js';

const abs = Math.abs, min = Math.min, max = Math.max, sq = Math.sqrt;
const clamp = (x, a, b) => min(max(x, a), b);
const mix = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export const REF = 'young';
const BASE = (import.meta.env?.BASE_URL ?? '/') + 'mannequins/';

// Stretch fabric spans hollows instead of following them (gluteal cleft, under and between the
// bust, spine groove, crotch, the front of the armpit). LIFT_MAX caps the span; LIFT_ITER sets how
// far a bridge can reach (Jacobi diffusion: roughly sqrt(iterations) edges, ~6 mm each).
const LIFT_MAX = 0.03, LIFT_ITER = 220;

// Dress form cuts, in reference-body metres: neck 2.2 cm above the neck base (just under the
// opening left by the egg head), legs at mid-thigh (swimwear-style "3/4" form, so the leotard's
// leg openings show), arms just below the armpit.
const FORM = { neck: 0.022, thigh: 0.13, armT: 0.1 };

// ---------------------------------------------------------------------------------------------

// Keys of the loaded bodies, for validating body.set (commands-core.js).
export const bodyKeys = [];

// Optional extra bodies on the same mesh, kept out of git: Daz 3D Genesis 9 shapes built from the
// owner's licensed Daz library by pipeline/build_daz_bodies.py. Missing folder = no extra bodies.
const EXTRA = '../mannequins-daz/';

// get(file, 'json' | 'arrayBuffer') can be replaced (tests read the files from disk).
export async function loadMannequins(onProgress, get = fetchFile) {
	const manifest = await get('manifest.json', 'json');
	const shared = await get('shared.bin', 'arrayBuffer');
	let extra = null;
	try { extra = await get(EXTRA + 'manifest.json', 'json'); } catch { /* no extra bodies */ }
	if (extra?.vertices !== manifest.vertices) extra = null;
	const list = [...manifest.bodies, ...(extra?.bodies ?? []).map((b) => ({ ...b, file: EXTRA + b.file }))];
	const bodies = {};
	await Promise.all(list.map(async (b) => {
		bodies[b.key] = { ...b, pos: new Float32Array(await get(b.file, 'arrayBuffer')) };
		onProgress?.(b.key);
	}));
	bodyKeys.splice(0, bodyKeys.length, ...list.map((b) => b.key));
	return new Mannequin({ ...manifest, bodies: list }, shared, bodies);
}

async function fetchFile(f, kind) { const r = await fetch(BASE + f); if (!r.ok) throw new Error(`${f}: ${r.status}`); return r[kind](); }

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _n = new THREE.Vector3();

class Mannequin {
	constructor(manifest, shared, bodies) {
		const N = this.vertices = manifest.vertices, I = manifest.indices;
		this.bodies = bodies;
		this.keys = manifest.bodies.map((b) => b.key);
		const idx = this.idx = new Uint32Array(shared, 0, I);
		const pw = this.parts = new Uint8Array(shared, I * 4, N * 8); // body-part weights, 8 per vertex (body/pose.js skins with them)
		this.triangles = I / 3;

		// Part weights (0..1): arm = upper arm + forearm + hand, the side of the armhole seam.
		this.wArm = new Float32Array(N); this.wHead = new Float32Array(N); this.wLeg = new Float32Array(N);
		for (let i = 0; i < N; i++) {
			this.wArm[i] = min((pw[i * 8 + 1] + pw[i * 8 + 2] + pw[i * 8 + 6]) / 255, 1);
			this.wLeg[i] = min((pw[i * 8 + 3] + pw[i * 8 + 4]) / 255, 1);
			this.wHead[i] = pw[i * 8 + 5] / 255;
		}

		// Vertex adjacency (CSR), for the lift solve.
		const deg = new Uint32Array(N + 1), pairs = new Set();
		for (let t = 0; t < I; t += 3) for (let e = 0; e < 3; e++) {
			const a = idx[t + e], b = idx[t + (e + 1) % 3];
			const k = a < b ? a * N + b : b * N + a;
			if (!pairs.has(k)) { pairs.add(k); deg[a + 1]++; deg[b + 1]++; }
		}
		for (let i = 0; i < N; i++) deg[i + 1] += deg[i];
		const nbr = new Uint32Array(deg[N]), fill = deg.slice(0, N);
		for (const k of pairs) { const a = Math.floor(k / N), b = k - a * N; nbr[fill[a]++] = b; nbr[fill[b]++] = a; }
		this.adjStart = deg; this.adj = nbr;

		this.ref = bodies[REF].pos;
		this.refLm = bodies[REF].landmarks;
		this.buildRefFields();
		this.buildFrontRaster();

		const g = this.geometry = new THREE.BufferGeometry();
		g.setIndex(new THREE.BufferAttribute(idx, 1));
		const attr = (name, size, data = new Float32Array(N * size)) => { const a = new THREE.BufferAttribute(data, size); g.setAttribute(name, a); return a; };
		this.aPos = attr('position', 3); this.aNrm = attr('normal', 3); this.aTan = attr('tangent', 4);
		this.aAO = attr('aAO', 1); this.aCover = attr('aCover', 1); this.aZone = attr('aZone', 2);
		this.aLift = attr('aLift', 1); this.aGNormal = attr('aGNormal', 3);
		attr('aRef', 3, this.ref);
		attr('aKeep', 1, this.keep);
		attr('aForm', 2, this.form);
		this.triArea = new Float32Array(this.triangles);
		this.cdf = new Float32Array(this.triangles);
		this.key = null;
	}

	// -------------------------------------------------------------------------------------------
	// Static per-vertex fields on the reference body.

	buildRefFields() {
		const N = this.vertices, R = this.ref, L = this.refLm;
		// Mid-plane (front/back) and half-width per 1 cm slice of the torso: "front vs back" for the
		// region fields and the side seam.
		const slices = new Map();
		for (let i = 0; i < N; i++) {
			if (this.wArm[i] > 0.15 || this.wHead[i] > 0.5) continue;
			const k = Math.round(R[i * 3 + 1] * 100), s = slices.get(k) ?? [9, -9];
			s[0] = min(s[0], R[i * 3 + 2]); s[1] = max(s[1], R[i * 3 + 2]); slices.set(k, s);
		}
		const zMid = (y) => {
			const k = Math.round(y * 100);
			for (let d = 0; d < 40; d++) { const s = slices.get(k - d) ?? slices.get(k + d); if (s) return (s[0] + s[1]) / 2; }
			return 0;
		};

		// Arm polyline (left side; the right is its mirror).
		const SH = L.shoulder_l, EL = L.elbow_l, WR = L.wrist_l;
		const L1 = Math.hypot(EL[0] - SH[0], EL[1] - SH[1], EL[2] - SH[2]), L2 = Math.hypot(WR[0] - EL[0], WR[1] - EL[1], WR[2] - EL[2]);
		this.arm = { SH, EL, WR, L1, L2 };
		const proj = (p, a, b, hi) => {
			const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], px = p[0] - a[0], py = p[1] - a[1], pz = p[2] - a[2];
			const t = clamp((px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz), 0, hi);
			const dx = px - bx * t, dy = py - by * t, dz = pz - bz * t;
			return [t, dx * dx + dy * dy + dz * dz];
		};

		const crotchY = this.crotchY = this.refCrotch();
		// Headless cut: just under the open edge the egg head sits on (its lowest point, the throat),
		// so mock necks and halter straps keep their neck.
		const edgeUse = new Map();
		for (let t = 0; t < this.idx.length; t += 3) for (let e = 0; e < 3; e++) {
			const a = this.idx[t + e], b = this.idx[t + (e + 1) % 3], k = a < b ? a * N + b : b * N + a;
			edgeUse.set(k, (edgeUse.get(k) ?? 0) + 1);
		}
		let holeY = L.head_base[1];
		for (const [k, c] of edgeUse) {
			if (c !== 1) continue;
			const a = Math.floor(k / N);
			if (this.wHead[a] < 0.5 && R[a * 3 + 1] > L.neck_base[1]) holeY = min(holeY, R[a * 3 + 1]);
		}
		const headlessY = holeY - 0.006;
		this.armT = new Float32Array(N);
		this.armF = new Float32Array(N);
		this.keep = new Float32Array(N);
		this.keepHeadless = new Float32Array(N); // the neck cut alone (form 'headless')
		this.form = new Float32Array(N * 2);
		const p = [0, 0, 0];
		for (let i = 0; i < N; i++) {
			const x = R[i * 3], y = R[i * 3 + 1], z = R[i * 3 + 2];
			p[0] = abs(x); p[1] = y; p[2] = z;
			const [t1, d1] = proj(p, SH, EL, 1), [t2, d2] = proj(p, EL, WR, 1.6);
			const t = d1 < d2 ? (t1 * L1) / (L1 + L2) : (L1 + t2 * L2) / (L1 + L2);
			this.armT[i] = t;

			// Dress-form keep field (> 0 = kept): neck, mid-thigh and upper-arm cuts.
			const fNeck = L.neck_base[1] + FORM.neck - y;
			const fLeg = y - (crotchY - FORM.thigh);
			const fArm = mix(1, (FORM.armT - t) * (L1 + L2), smoothstep(0.3, 0.6, this.wArm[i]));
			this.keep[i] = this.wHead[i] > 0.5 ? -1 : min(fNeck, fLeg, fArm);
			this.keepHeadless[i] = this.wHead[i] > 0.5 ? -1 : headlessY - y;

			// Dress-form style tape fields: x = side-seam distance (z from the mid-plane), y = princess
			// line distance (|x| from a line through mid-shoulder and the bust point, waisted below).
			const zr = z - zMid(y);
			this.form[i * 2] = zr;
			const bustX = 0.075, waistY = 1.04;
			const px = y > 1.168 ? mix(bustX, 0.072, smoothstep(1.168, 1.33, y)) : mix(0.055, bustX, smoothstep(waistY, 1.168, y)) + (y < waistY ? (waistY - y) * 0.25 : 0);
			this.form[i * 2 + 1] = abs(x) - px;
		}
		this.zMid = zMid;
		this.keepTorso = this.keep.slice();

		// Armhole seam: where the arm's skinning weight crosses one half. Divided by the weight's
		// local gradient so the field reads as metres from the seam (what the tank's armhole offset
		// and the sleeve blends expect).
		const S = this.adjStart, A = this.adj, grad = new Float32Array(N);
		for (let i = 0; i < N; i++) {
			let g = 0;
			for (let k = S[i]; k < S[i + 1]; k++) {
				const j = A[k], d = Math.hypot(R[j * 3] - R[i * 3], R[j * 3 + 1] - R[i * 3 + 1], R[j * 3 + 2] - R[i * 3 + 2]);
				if (d > 1e-6) g += abs(this.wArm[j] - this.wArm[i]) / d;
			}
			grad[i] = g / max(S[i + 1] - S[i], 1);
		}
		for (let it = 0; it < 6; it++) { // smooth the gradient so the offset line does not wobble
			const g2 = grad.slice();
			for (let i = 0; i < N; i++) { let s2 = g2[i]; for (let k = S[i]; k < S[i + 1]; k++) s2 += g2[A[k]]; grad[i] = s2 / (S[i + 1] - S[i] + 1); }
		}
		for (let i = 0; i < N; i++) this.armF[i] = clamp((this.wArm[i] - 0.5) / max(grad[i], 6), -0.08, 0.08);
		this.formLines = { waist: 1.04, bust: 1.168, hip: crotchY + 0.06, neck: L.neck_base[1] + 0.005 };
	}

	refCrotch() {
		const R = this.ref; let c = 9;
		for (let i = 0; i < this.vertices; i++) {
			const y = R[i * 3 + 1];
			if (abs(R[i * 3]) < 0.006 && y > 0.3 && y < 1.1 && this.wHead[i] < 0.5 && this.wArm[i] < 0.5) c = min(c, y);
		}
		return c;
	}

	// Garment regions on every vertex (the style changes; the body does not matter). The regions
	// decide where fabric can bridge (see computeLift), so the garment surface is rebuilt too.
	setStyle(style) {
		const styleKey = style.sleeves + '|' + style.back;
		if (styleKey === this.styleKey) return;
		this.styleKey = styleKey;
		const R = this.ref, out = [0, 0, 0], v = {}, cover = this.aCover.array, zone = this.aZone.array;
		for (let i = 0; i < this.vertices; i++) {
			v.x = R[i * 3]; v.y = R[i * 3 + 1]; v.z = R[i * 3 + 2]; v.zr = this.form[i * 2];
			v.arm = this.armF[i]; v.armT = this.armT[i]; v.head = this.wHead[i];
			regions(v, style, out);
			cover[i] = out[0]; zone[i * 2] = out[1]; zone[i * 2 + 1] = out[2];
		}
		this.aCover.needsUpdate = true; this.aZone.needsUpdate = true;
		if (this.key) this.updateGarment();
	}

	// Cover field from a cut garment (render/garment.js): +1 on fabric, -1 on bare skin. The lift
	// is warm-started from the previous solution, which is close when only some lines moved.
	setCover(cover) {
		this.aCover.array.set(cover);
		this.aCover.needsUpdate = true;
		this.styleKey = null;
		if (this.key) this.updateGarment(true);
	}

	// -------------------------------------------------------------------------------------------
	// Switching bodies: positions, normals, the fabric's lift over hollows, AO, sampling tables.

	// pose: a preset name or { left, right } (body/pose.js); the rest pose when absent.
	setBody(key, pose = this.pose) {
		const N = this.vertices, idx = this.idx, src = this.bodies[key].pos;
		this.key = key; this.body = this.bodies[key];
		this.pose = pose ?? null; this.poseKey = JSON.stringify(pose ?? 'a-pose');
		const P = this.aPos.array; P.set(src);
		if (pose && !isRest(pose)) {
			// where hands go is measured on the rest body: crotch height, waist height, front of the belly
			const L = this.body.landmarks, crotchY = this.measureCrotch().y;
			let frontZ = 0;
			for (let i = 0; i < N; i++) if (abs(P[i * 3]) < 0.03 && abs(P[i * 3 + 1] - L.waist[1]) < 0.04 && this.wArm[i] < 0.1) frontZ = max(frontZ, P[i * 3 + 2]);
			applyPose(P, this.parts, this.body, pose, { crotchY, waistY: L.waist[1], frontZ });
		}
		const Nn = this.aNrm.array;
		vertexNormals(P, idx, Nn);

		const T = this.aTan.array, up = new THREE.Vector3(0, 1, 0), t = new THREE.Vector3(), nv = new THREE.Vector3();
		for (let i = 0; i < N; i++) {
			// Tangent runs horizontally around the body: the direction of greatest stretch, and the
			// axis shiny tricot smears its highlight along.
			nv.fromArray(Nn, i * 3);
			t.crossVectors(up, nv);
			if (t.lengthSq() < 1e-4) t.set(1, 0, 0);
			t.normalize().toArray(T, i * 4); T[i * 4 + 3] = 1;
		}
		for (const a of [this.aPos, this.aNrm, this.aTan]) a.needsUpdate = true;
		this.geometry.computeBoundingSphere();
		this.geometry.computeBoundingBox();
		this.crotch = this.measureCrotch();
		this.contact = this.contactOcclusion(P, Nn); // depends on the body and pose only
		this.updateGarment();
	}

	// The garment surface on the current body and style: the fabric's lift over hollows, its
	// normals, AO, and the sampling table stones are scattered with.
	updateGarment(warm = false) {
		const N = this.vertices, idx = this.idx, P = this.aPos.array, Nn = this.aNrm.array;
		const h = warm && this.liftBody === this.key ? this.computeLift(P, Nn, undefined, 40, this.aLift.array) : this.computeLift(P, Nn);
		this.liftBody = this.key;
		this.aLift.array.set(h);
		// Garment surface normals: normals of the lifted surface (flat across the bridges).
		const G = new Float32Array(N * 3);
		for (let i = 0; i < N * 3; i++) G[i] = P[i] + Nn[i] * h[(i / 3) | 0];
		vertexNormals(G, idx, this.aGNormal.array);
		this.garmentPos = G;

		const ao = this.aAO.array;
		// Ambient occlusion from how deep the vertex sits under the fabric bridge: crevices
		// (armpit, between the legs, under the bust) are exactly where the lift is large.
		for (let i = 0; i < N; i++) ao[i] = clamp(1 - h[i] * 16, 0.4, 1);
		if (this.contact) for (let i = 0; i < N; i++) ao[i] *= this.contact[i];

		// Area-weighted sampling table on the garment surface.
		let total = 0;
		for (let f = 0; f < this.triangles; f++) {
			_a.fromArray(G, idx[f * 3] * 3); _b.fromArray(G, idx[f * 3 + 1] * 3).sub(_a); _c.fromArray(G, idx[f * 3 + 2] * 3).sub(_a);
			const ar = _b.cross(_c).length() * 0.5;
			this.triArea[f] = ar; total += ar; this.cdf[f] = total;
		}
		this.area = total;

		for (const a of [this.aAO, this.aLift, this.aGNormal]) a.needsUpdate = true;
		for (const fn of this.onGarment ?? []) fn();
	}

	// Outward-only membrane: h_i = clamp(mean_j <P_j + h_j N_j - P_i, N_i>, 0, LIFT_MAX). On convex
	// skin the neighbours lie below the tangent plane, so h stays 0 and the fabric hugs the body;
	// in a hollow they lie above it, and the fabric spans across. Circumferential curvature wins
	// at the waist, so the leotard still follows the waist in.
	// Only fabric bridges: bare skin (cover <= 0) is pinned at 0, which also pins every opening to
	// the body the way its elastic does. Without this the "fabric" spanned from the shoulder strap
	// towards the bare neck hollow and floated ~1 cm off the shoulder.
	// cover: per-vertex field (> 0 = fabric); iter / warm: fewer iterations from a previous solution.
	computeLift(P, Nn, C = this.aCover.array, iter = LIFT_ITER, warm = null) {
		const N = this.vertices, S = this.adjStart, A = this.adj;
		let h = warm ? Float32Array.from(warm) : new Float32Array(N), h2 = new Float32Array(N);
		const fixed = new Uint8Array(N);
		for (let i = 0; i < N; i++) fixed[i] = this.wHead[i] > 0.5 || this.armT[i] > 1 || C[i] <= 0 ? 1 : 0;
		for (let i = 0; i < N; i++) if (fixed[i]) h[i] = 0;
		for (let it = 0; it < iter; it++) {
			for (let i = 0; i < N; i++) {
				if (fixed[i]) { h2[i] = 0; continue; }
				const px = P[i * 3], py = P[i * 3 + 1], pz = P[i * 3 + 2], nx = Nn[i * 3], ny = Nn[i * 3 + 1], nz = Nn[i * 3 + 2];
				let s = 0;
				for (let k = S[i]; k < S[i + 1]; k++) {
					const j = A[k], hj = h[j];
					s += (P[j * 3] + Nn[j * 3] * hj - px) * nx + (P[j * 3 + 1] + Nn[j * 3 + 1] * hj - py) * ny + (P[j * 3 + 2] + Nn[j * 3 + 2] * hj - pz) * nz;
				}
				h2[i] = clamp(s / (S[i + 1] - S[i]), 0, LIFT_MAX);
			}
			[h, h2] = [h2, h];
		}
		return h;
	}

	// Contact shadow between an arm and the torso (a posed arm resting against the side, a hand on
	// the hip): each torso vertex is darkened by the nearest arm vertex in front of it within R,
	// and each arm vertex by the nearest torso vertex in front of it. Grid of R-sized cells.
	contactOcclusion(P, Nn, R = 0.045) {
		const N = this.vertices, ao = new Float32Array(N).fill(1), grid = new Map(), key = (x, y, z) => ((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) | 0;
		const isArm = (i) => this.wArm[i] > 0.6, isTorso = (i) => this.wArm[i] < 0.15 && this.wHead[i] < 0.5 && this.wLeg[i] < 0.5;
		for (let i = 0; i < N; i++) {
			if (!isArm(i) && !isTorso(i)) continue;
			const k = key(Math.floor(P[i * 3] / R), Math.floor(P[i * 3 + 1] / R), Math.floor(P[i * 3 + 2] / R));
			let b = grid.get(k); if (!b) grid.set(k, b = []); b.push(i);
		}
		for (let i = 0; i < N; i++) {
			const arm = isArm(i);
			if (!arm && !isTorso(i)) continue;
			const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], gx = Math.floor(x / R), gy = Math.floor(y / R), gz = Math.floor(z / R);
			let best = R;
			for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
				const b = grid.get(key(gx + dx, gy + dy, gz + dz));
				if (b) for (const j of b) {
					if (isArm(j) === arm) continue;
					const ex = P[j * 3] - x, ey = P[j * 3 + 1] - y, ez = P[j * 3 + 2] - z;
					if (ex * Nn[i * 3] + ey * Nn[i * 3 + 1] + ez * Nn[i * 3 + 2] <= 0) continue; // behind this surface
					const d = Math.hypot(ex, ey, ez);
					if (d < best) best = d;
				}
			}
			if (best < R) { const o = (1 - best / R) ** 2; ao[i] *= 1 - 0.55 * o; }
		}
		return ao;
	}

	measureCrotch() {
		const P = this.aPos.array; let best = 9, bi = 0;
		for (let i = 0; i < this.vertices; i++) {
			if (abs(this.ref[i * 3]) < 0.006 && this.ref[i * 3 + 1] > 0.3 && this.ref[i * 3 + 1] < 1.1 && this.wHead[i] < 0.5 && this.wArm[i] < 0.5 && P[i * 3 + 1] < best) { best = P[i * 3 + 1]; bi = i; }
		}
		return new THREE.Vector3().fromArray(P, bi * 3);
	}

	// Landmark on the current body, mirrored for the right side when side = -1.
	landmark(name, side = 1) { const l = this.body.landmarks[name]; return new THREE.Vector3(l[0] * side, l[1], l[2]); }

	// -------------------------------------------------------------------------------------------
	// Surface points: { f: triangle, b0, b1, b2 }. Found on the reference body, then evaluated on
	// whichever body is current, on the garment surface (lift included, thickness not).

	point(sp, out = {}) {
		const idx = this.idx, i0 = idx[sp.f * 3], i1 = idx[sp.f * 3 + 1], i2 = idx[sp.f * 3 + 2], G = this.garmentPos, GN = this.aGNormal.array;
		const p = out.p ?? new THREE.Vector3(), n = out.n ?? new THREE.Vector3();
		for (let c = 0; c < 3; c++) {
			p.setComponent(c, sp.b0 * G[i0 * 3 + c] + sp.b1 * G[i1 * 3 + c] + sp.b2 * G[i2 * 3 + c]);
			n.setComponent(c, sp.b0 * GN[i0 * 3 + c] + sp.b1 * GN[i1 * 3 + c] + sp.b2 * GN[i2 * 3 + c]);
		}
		n.normalize();
		const C = this.aCover.array, K = this.keep;
		out.p = p; out.n = n;
		out.cover = sp.b0 * C[i0] + sp.b1 * C[i1] + sp.b2 * C[i2];
		out.keep = sp.b0 * K[i0] + sp.b1 * K[i1] + sp.b2 * K[i2];
		out.refY = sp.b0 * this.ref[i0 * 3 + 1] + sp.b1 * this.ref[i1 * 3 + 1] + sp.b2 * this.ref[i2 * 3 + 1];
		return out;
	}

	// Front (or back) orthographic raster of the reference torso: which triangles cover each 4 mm
	// cell. Arms and head are left out, so "project onto the front" always lands on the torso.
	buildFrontRaster() {
		const R = this.ref, idx = this.idx, C = 0.004, x0 = -0.32, y0 = 0.45, nx = 160, ny = 280;
		const lists = Array.from({ length: nx * ny }, () => []);
		for (let f = 0; f < this.triangles; f++) {
			const i0 = idx[f * 3], i1 = idx[f * 3 + 1], i2 = idx[f * 3 + 2];
			if (this.wArm[i0] + this.wArm[i1] + this.wArm[i2] > 1.5 || this.wHead[i0] > 0.5) continue;
			const xs = [R[i0 * 3], R[i1 * 3], R[i2 * 3]], ys = [R[i0 * 3 + 1], R[i1 * 3 + 1], R[i2 * 3 + 1]];
			const ia = Math.floor((min(...xs) - x0) / C), ib = Math.floor((max(...xs) - x0) / C);
			const ja = Math.floor((min(...ys) - y0) / C), jb = Math.floor((max(...ys) - y0) / C);
			for (let j = max(ja, 0); j <= min(jb, ny - 1); j++) for (let i = max(ia, 0); i <= min(ib, nx - 1); i++) lists[i + j * nx].push(f);
		}
		this.raster = { C, x0, y0, nx, ny, lists };
	}

	// Project a reference-frontal-plane point (x, y) onto the front (or back) of the torso.
	projectFront(x, y, back = false) {
		const { C, x0, y0, nx, ny, lists } = this.raster, R = this.ref, idx = this.idx;
		const i = Math.floor((x - x0) / C), j = Math.floor((y - y0) / C);
		if (i < 0 || j < 0 || i >= nx || j >= ny) return null;
		let best = null, bz = back ? 9 : -9;
		for (const f of lists[i + j * nx]) {
			const a = idx[f * 3] * 3, b = idx[f * 3 + 1] * 3, c = idx[f * 3 + 2] * 3;
			const ax = R[a], ay = R[a + 1], bx = R[b], by = R[b + 1], cx = R[c], cy = R[c + 1];
			const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
			if (abs(d) < 1e-12) continue;
			const b0 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d, b1 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d, b2 = 1 - b0 - b1;
			if (b0 < -1e-6 || b1 < -1e-6 || b2 < -1e-6) continue;
			const z = b0 * R[a + 2] + b1 * R[b + 2] + b2 * R[c + 2];
			if (back ? z < bz : z > bz) { bz = z; best = { f, b0, b1, b2 }; }
		}
		return best;
	}

	// The ring around the arm where armT = t (a cuff), as surface points ordered around the arm.
	armRing(side, t) {
		const R = this.ref, idx = this.idx, T = this.armT, pts = [], seen = new Set();
		const { SH, EL, WR, L1, L2 } = this.arm, s = t * (L1 + L2);
		const a = s < L1 ? SH : EL, b = s < L1 ? EL : WR, u = s < L1 ? s / L1 : (s - L1) / L2;
		const c = new THREE.Vector3(mix(a[0], b[0], u) * side, mix(a[1], b[1], u), mix(a[2], b[2], u));
		const axis = new THREE.Vector3((b[0] - a[0]) * side, b[1] - a[1], b[2] - a[2]).normalize();
		const e1 = new THREE.Vector3(0, 0, 1).cross(axis).normalize(), e2 = axis.clone().cross(e1), q = new THREE.Vector3();
		for (let f = 0; f < this.triangles; f++) {
			const v = [idx[f * 3], idx[f * 3 + 1], idx[f * 3 + 2]];
			if (v.some((i) => this.wArm[i] < 0.5 || R[i * 3] * side <= 0)) continue;
			for (let e = 0; e < 3; e++) {
				const i = v[e], j = v[(e + 1) % 3], di = T[i] - t, dj = T[j] - t;
				if ((di < 0) === (dj < 0)) continue;
				const key = i < j ? i * this.vertices + j : j * this.vertices + i;
				if (seen.has(key)) continue;
				seen.add(key);
				const w = di / (di - dj), sp = { f, b0: 0, b1: 0, b2: 0 };
				sp['b' + e] = 1 - w; sp['b' + (e + 1) % 3] = w;
				q.set(mix(R[i * 3], R[j * 3], w), mix(R[i * 3 + 1], R[j * 3 + 1], w), mix(R[i * 3 + 2], R[j * 3 + 2], w)).sub(c);
				sp.ang = Math.atan2(q.dot(e2), q.dot(e1));
				pts.push(sp);
			}
		}
		pts.sort((p, q2) => p.ang - q2.ang);
		if (pts.length) pts.push(pts[0]);
		return pts;
	}

	// Area-weighted random point on the garment surface. Returns the region cover there.
	sample(rand, out) {
		const r = rand() * this.area, cdf = this.cdf;
		let l = 0, hgh = this.triangles - 1;
		while (l < hgh) { const m = (l + hgh) >> 1; if (cdf[m] < r) l = m + 1; else hgh = m; }
		let u = rand(), w = rand();
		if (u + w > 1) { u = 1 - u; w = 1 - w; }
		return this.point({ f: l, b0: 1 - u - w, b1: u, b2: w }, out);
	}

	// -------------------------------------------------------------------------------------------
	// The zero line of a per-vertex field as closed loops of edge crossings { i, j, w }: the point
	// is mix(vertex i, vertex j, w). Same linear interpolation as the per-pixel discard, so
	// anything built on a loop meets the cut exactly. Used for the dress-form cut (cutLoops) and
	// the garment's openings (edgeLoops, for the finished edges in trim.js).
	contour(F) {
		const idx = this.idx, N = this.vertices;
		const crossing = new Map(), next = new Map();
		const edgeKey = (i, j) => {
			const key = i < j ? i * N + j : j * N + i;
			if (!crossing.has(key)) crossing.set(key, { i, j, w: F[i] / (F[i] - F[j]) });
			return key;
		};
		for (let f = 0; f < this.triangles; f++) {
			const v = [idx[f * 3], idx[f * 3 + 1], idx[f * 3 + 2]], cross = [];
			for (let e = 0; e < 3; e++) {
				const i = v[e], j = v[(e + 1) % 3];
				if ((F[i] < 0) !== (F[j] < 0)) cross.push(edgeKey(i, j));
			}
			if (cross.length === 2) for (const [a, b] of [cross, [cross[1], cross[0]]]) { const l = next.get(a); if (l) l.push(b); else next.set(a, [b]); }
		}
		// Every crossing point joins exactly two segments: walk them, never stepping back.
		const loops = [], used = new Set();
		for (const start of next.keys()) {
			if (used.has(start)) continue;
			const loop = [];
			let k = start, prev = -1;
			while (k !== undefined && !used.has(k)) {
				used.add(k); loop.push(crossing.get(k));
				const nb = next.get(k), n = nb[0] !== prev ? nb[0] : nb[1];
				prev = k; k = n;
			}
			if (loop.length > 8) loops.push(loop);
		}
		return loops;
	}

	// Which cut the keep field describes: the dress form's (neck, upper arms, mid-thigh) or the neck
	// alone (the full body without its head). Swapped in place: aKeep and the garment share the array.
	setCut(form) {
		this.keep.set(form === 'headless' ? this.keepHeadless : this.keepTorso);
		this.geometry.getAttribute('aKeep').needsUpdate = true;
	}

	// Dress form: the boundary loops of the keep field on the current body, for the end caps.
	cutLoops() {
		const P = this.aPos.array;
		return this.contour(this.keep).map((loop) => loop.map(({ i, j, w }) =>
			new THREE.Vector3(mix(P[i * 3], P[j * 3], w), mix(P[i * 3 + 1], P[j * 3 + 1], w), mix(P[i * 3 + 2], P[j * 3 + 2], w))));
	}

	// Garment openings (neck, armholes, legs, cuffs, strap edges) on the garment surface, with what
	// trim.js needs to build the finished edge: the surface normal, a vector pointing into the
	// fabric, the surface's curvature across the edge, and the reference-body attributes.
	edgeLoops() {
		const G = this.garmentPos, GN = this.aGNormal.array, C = this.aCover.array, R = this.ref, K = this.keep, Z = this.aZone.array;
		const at = (A, i, j, w) => new THREE.Vector3(mix(A[i * 3], A[j * 3], w), mix(A[i * 3 + 1], A[j * 3 + 1], w), mix(A[i * 3 + 2], A[j * 3 + 2], w));
		return this.contour(C).map((loop) => loop.map(({ i, j, w }) => {
			const p = at(G, i, j, w), inV = C[i] > 0 ? i : j;
			const e = new THREE.Vector3(G[j * 3] - G[i * 3], G[j * 3 + 1] - G[i * 3 + 1], G[j * 3 + 2] - G[i * 3 + 2]);
			const dn = new THREE.Vector3(GN[j * 3] - GN[i * 3], GN[j * 3 + 1] - GN[i * 3 + 1], GN[j * 3 + 2] - GN[i * 3 + 2]);
			return {
				p, n: at(GN, i, j, w).normalize(),
				inside: new THREE.Vector3(G[inV * 3], G[inV * 3 + 1], G[inV * 3 + 2]).sub(p),
				kappa: dn.dot(e) / Math.max(e.lengthSq(), 1e-10), // normal curvature along the crossed edge (1/m, > 0 convex)
				ref: at(R, i, j, w), keep: mix(K[i], K[j], w), sleeve: mix(Z[i * 2], Z[j * 2], w),
			};
		}));
	}
}

export function vertexNormals(P, idx, out) {
	out.fill(0);
	for (let f = 0; f < idx.length; f += 3) {
		const a = idx[f] * 3, b = idx[f + 1] * 3, c = idx[f + 2] * 3;
		_a.fromArray(P, a); _b.fromArray(P, b).sub(_a); _c.fromArray(P, c).sub(_a);
		_n.crossVectors(_b, _c); // area-weighted
		for (const o of [a, b, c]) { out[o] += _n.x; out[o + 1] += _n.y; out[o + 2] += _n.z; }
	}
	for (let i = 0; i < out.length; i += 3) {
		const l = Math.hypot(out[i], out[i + 1], out[i + 2]) || 1;
		out[i] /= l; out[i + 1] /= l; out[i + 2] /= l;
	}
}
