// Poses: the mannequin's arms moved from the rest (A) pose so photos with arms down, hands on hips,
// hands in front or an arm raised can be matched. The baked part weights (upper arm, forearm,
// hand, shoulder; manifest.parts) skin each vertex to rigid transforms at the shoulder and elbow
// joints (the body's landmarks), blended with dual quaternions (no candy-wrapper collapse at the
// elbow the way linear blending gives). Everything else (garment, lift, stones, picking, the photo
// camera solve) reads the posed positions, so it all follows.
//
// A pose is a preset name (POSES) or { left, right } with each arm a preset name (ARMS) or
// { upper: [x, y, z], fore: [x, y, z] | { to: [x, y, z] } } for the left arm (x > 0 is the
// wearer's left; the right arm mirrors x). Directions and targets are in body metres, relative to
// the body's own landmarks via the preset functions below.
import * as THREE from 'three';

const PART = { shoulder: 0, upper: 1, fore: 2, hand: 6 };

// Arm presets for the left arm, from the body's rest landmarks (b: { S, E, W, crotchY, waistY,
// frontZ, headTop }); upper: direction of the upper arm; fore: direction, or { to } a point the
// forearm points at (the hand reaches towards it).
export const ARMS = {
	rest: null,
	down: () => ({ upper: [0.12, -1, 0.03], fore: [0.1, -1, 0.06] }),
	front: (b) => ({ upper: [0.06, -1, 0.16], fore: { to: [0.035, b.crotchY + 0.02, b.frontZ + 0.11] } }),
	thigh: (b) => ({ upper: [0.14, -1, 0.12], fore: { to: [0.11, b.crotchY - 0.06, b.frontZ + 0.05] } }),
	hip: (b) => ({ upper: [0.68, -0.6, -0.32], fore: { to: [b.S[0] * 0.98, b.waistY - 0.04, 0.0] } }),
	up: (b) => ({ upper: [0.32, 1, -0.06], fore: { to: [0.02, b.headTop + 0.02, -0.04] } }),
};

export const POSES = {
	'a-pose': { left: 'rest', right: 'rest' },
	'arms-down': { left: 'down', right: 'down' },
	'hands-in-front': { left: 'front', right: 'front' },
	'hands-on-hips': { left: 'hip', right: 'hip' },
	'hands-on-thighs': { left: 'thigh', right: 'thigh' },
	'left-hand-on-hip': { left: 'hip', right: 'down' },
	'right-hand-on-hip': { left: 'down', right: 'hip' },
	'left-arm-up': { left: 'up', right: 'down' },
	'right-arm-up': { left: 'down', right: 'up' },
};

// Normalise a pose (name or object) to { left, right } of preset names or explicit arms; throws
// a readable error on anything unknown.
export function poseSpec(pose) {
	if (pose == null) return POSES['a-pose'];
	if (typeof pose === 'string') {
		const p = POSES[pose];
		if (!p) throw new Error(`pose must be one of: ${Object.keys(POSES).join(', ')}, or { left, right } with arms ${Object.keys(ARMS).join('|')}`);
		return p;
	}
	const out = {};
	for (const side of ['left', 'right']) {
		const a = pose[side] ?? 'rest';
		if (typeof a === 'string' && !(a in ARMS)) throw new Error(`${side} arm must be one of: ${Object.keys(ARMS).join(', ')} or { upper, fore }`);
		if (typeof a === 'object' && (!Array.isArray(a.upper) || !a.fore)) throw new Error(`${side} arm needs upper: [x, y, z] and fore: [x, y, z] or { to: [x, y, z] }`);
		out[side] = a;
	}
	return out;
}
export const isRest = (pose) => { const p = poseSpec(pose); return p.left === 'rest' && p.right === 'rest'; };

// Rigid transform as a dual quaternion [rx, ry, rz, rw, dx, dy, dz, dw] from rotation q, pivot c:
// p' = q (p - c) + c.
function dq(q, c) {
	const t = new THREE.Vector3().copy(c).sub(c.clone().applyQuaternion(q)); // translation
	// dual = 0.5 * (0, t) * q
	const dx = 0.5 * (t.x * q.w + t.y * q.z - t.z * q.y), dy = 0.5 * (-t.x * q.z + t.y * q.w + t.z * q.x);
	const dz = 0.5 * (t.x * q.y - t.y * q.x + t.z * q.w), dw = -0.5 * (t.x * q.x + t.y * q.y + t.z * q.z);
	return [q.x, q.y, q.z, q.w, dx, dy, dz, dw];
}
// Compose: first a (rotation qa about ca), then rotation qb about cb, as one transform.
function chain(qa, ca, qb, cb) {
	// p' = qb (qa (p - ca) + ca - cb) + cb = (qb qa) p + qb (ca - qa ca - cb) + cb
	const q = qb.clone().multiply(qa);
	const t = ca.clone().sub(ca.clone().applyQuaternion(qa)).sub(cb).applyQuaternion(qb).add(cb);
	// express as rotation q about a pivot c with c - q c = t: solve via the translation directly
	const dx = 0.5 * (t.x * q.w + t.y * q.z - t.z * q.y), dy = 0.5 * (-t.x * q.z + t.y * q.w + t.z * q.x);
	const dz = 0.5 * (t.x * q.y - t.y * q.x + t.z * q.w), dw = -0.5 * (t.x * q.x + t.y * q.y + t.z * q.z);
	return [q.x, q.y, q.z, q.w, dx, dy, dz, dw];
}

// The arm's transforms (shoulder, upper arm, forearm, hand) for one side (s = 1 left, -1 right).
function armTransforms(arm, b, s) {
	if (!arm || arm === 'rest') return null;
	const spec = typeof arm === 'string' ? ARMS[arm](b) : arm;
	const mir = (v) => new THREE.Vector3(v[0] * s, v[1], v[2]);
	const S = mir(b.S), E = mir(b.E), W = mir(b.W);
	const d1 = mir(spec.upper).normalize();
	const R1 = new THREE.Quaternion().setFromUnitVectors(E.clone().sub(S).normalize(), d1);
	const E2 = E.clone().sub(S).applyQuaternion(R1).add(S);
	const f1 = W.clone().sub(E).normalize().applyQuaternion(R1);
	const d2 = Array.isArray(spec.fore) ? mir(spec.fore).normalize() : mir(spec.fore.to).sub(E2).normalize();
	const R2 = new THREE.Quaternion().setFromUnitVectors(f1, d2);
	const half = new THREE.Quaternion().slerp(R1, 0.5);
	const upper = dq(R1, S), fore = chain(R1, S, R2, E2);
	return { [PART.shoulder]: dq(half, S), [PART.upper]: upper, [PART.fore]: fore, [PART.hand]: fore };
}

// Pose the rest positions P (Float32Array, xyz per vertex; changed in place).
// parts: Uint8Array of 8 weights (0..255) per vertex; body: { landmarks } of the body shown;
// geo: { crotchY, waistY, frontZ } measured on the rest body.
export function applyPose(P, parts, body, pose, geo) {
	const p = poseSpec(pose), L = body.landmarks;
	const b = { S: L.shoulder_l, E: L.elbow_l, W: L.wrist_l, headTop: L.head_top[1], ...geo };
	const T = { 1: armTransforms(p.left, b, 1), [-1]: armTransforms(p.right, b, -1) };
	const n = P.length / 3, ID = [0, 0, 0, 1, 0, 0, 0, 0];
	const acc = new Float64Array(8);
	for (let i = 0; i < n; i++) {
		const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
		const side = T[x >= 0 ? 1 : -1];
		if (!side) continue;
		let wsum = 0;
		acc.fill(0);
		let ref = null;
		for (const k of [PART.shoulder, PART.upper, PART.fore, PART.hand]) {
			const w = parts[i * 8 + k] / 255;
			if (w <= 0) continue;
			const d = side[k];
			if (!ref) ref = d;
			const sg = d[0] * ref[0] + d[1] * ref[1] + d[2] * ref[2] + d[3] * ref[3] < 0 ? -w : w;
			for (let j = 0; j < 8; j++) acc[j] += d[j] * sg;
			wsum += w;
		}
		if (wsum <= 0) continue;
		// the rest of the weight stays on the torso (identity)
		const w0 = Math.max(0, 1 - wsum), sg0 = ref[3] < 0 ? -w0 : w0;
		for (let j = 0; j < 8; j++) acc[j] += ID[j] * sg0;
		const len = Math.hypot(acc[0], acc[1], acc[2], acc[3]);
		const rx = acc[0] / len, ry = acc[1] / len, rz = acc[2] / len, rw = acc[3] / len;
		const dx = acc[4] / len, dy = acc[5] / len, dz = acc[6] / len, dw = acc[7] / len;
		// translation t = 2 * dual * conj(real)
		const tx = 2 * (-dw * rx + dx * rw - dy * rz + dz * ry);
		const ty = 2 * (-dw * ry + dx * rz + dy * rw - dz * rx);
		const tz = 2 * (-dw * rz - dx * ry + dy * rx + dz * rw);
		// rotate (x, y, z) by the real part
		const ix = rw * x + ry * z - rz * y, iy = rw * y + rz * x - rx * z, iz = rw * z + rx * y - ry * x, iw = -rx * x - ry * y - rz * z;
		P[i * 3] = ix * rw + iw * -rx + iy * -rz - iz * -ry + tx;
		P[i * 3 + 1] = iy * rw + iw * -ry + iz * -rx - ix * -rz + ty;
		P[i * 3 + 2] = iz * rw + iw * -rz + ix * -ry - iy * -rx + tz;
	}
	return P;
}
