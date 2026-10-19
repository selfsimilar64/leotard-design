// Surface landmarks on the reference body: points that can be pinned on a photograph (the notch of
// the neck, shoulder tips, bust points, waist and hip sides, navel, crotch, back neck and waist,
// elbows, wrists, knees). Each is a surface point on the canonical mesh, so it is the same
// anatomical spot on every body. Used to solve a photo's camera (render/camera-solve.js).
import * as THREE from 'three';

const { abs } = Math;

// -> { name: { f, b0, b1, b2 } }
export function surfaceLandmarks(man, surf) {
	const R = man.ref, N = man.vertices, L = man.refLm, fl = man.formLines;
	const torso = (i) => man.wArm[i] < 0.2 && man.wHead[i] < 0.3 && man.wLeg[i] < 0.6;
	const best = (score, ok = () => true) => {
		let bi = -1, bs = Infinity;
		for (let i = 0; i < N; i++) { if (!ok(i)) continue; const s = score(R[i * 3], R[i * 3 + 1], R[i * 3 + 2], i); if (s < bs) { bs = s; bi = i; } }
		return bi;
	};
	const at = (i) => surf.closest(new THREE.Vector3(R[i * 3], R[i * 3 + 1], R[i * 3 + 2]));
	const near = (p) => surf.closest(new THREE.Vector3(...p));
	const out = {};
	const both = (name, fn) => { out[name + '-l'] = fn(1); out[name + '-r'] = fn(-1); };
	const nb = L.neck_base, SH = L.shoulder_l, EL = L.elbow_l, WR = L.wrist_l, KN = L.knee_l;
	out['cf-neck'] = at(best((x, y, z) => abs(x) * 4 - z + abs(y - (nb[1] - 0.015)) * 3, torso));
	out['cb-neck'] = at(best((x, y, z) => abs(x) * 4 + z + abs(y - (nb[1] + 0.01)) * 3, torso));
	out['navel'] = at(best((x, y, z) => abs(x) * 4 - z + abs(y - (fl.waist - 0.045)) * 3, torso));
	out['cb-waist'] = at(best((x, y, z) => abs(x) * 4 + z + abs(y - fl.waist) * 3, torso));
	out['crotch'] = at(best((x, y) => abs(x) * 6 + y, (i) => man.wHead[i] < 0.3 && man.wArm[i] < 0.2 && R[i * 3 + 1] > 0.5));
	both('shoulder', (s) => near([SH[0] * s + 0.012 * s, SH[1] + 0.07, SH[2]]));
	both('bust', (s) => at(best((x, y, z) => -z + abs(y - fl.bust) * 0.6, (i) => torso(i) && R[i * 3] * s > 0.04 && R[i * 3] * s < 0.13)));
	both('waist', (s) => at(best((x, y) => -x * s + abs(y - fl.waist) * 4, torso)));
	// hip: the widest point of the hips, between the waist and the crotch (where a photo shows it)
	const hipY = man.crotchY + (fl.waist - man.crotchY) * 0.38;
	both('hip', (s) => at(best((x, y) => -x * s + abs(y - hipY) * 4, (i) => man.wHead[i] < 0.3 && man.wArm[i] < 0.2)));
	// under the arm: the side of the ribcage just below the armpit (the back or front silhouette there)
	both('underarm', (s) => at(best((x, y) => -x * s + abs(y - (fl.bust + 0.06)) * 4, torso)));
	both('elbow', (s) => near([EL[0] * s + 0.03 * s, EL[1], EL[2] - 0.02]));
	both('wrist', (s) => near([WR[0] * s + 0.025 * s, WR[1], WR[2]]));
	both('knee', (s) => near([KN[0] * s, KN[1], KN[2] + 0.06]));
	for (const k of Object.keys(out)) { const o = out[k]; out[k] = { f: o.f, b0: o.b0, b1: o.b1, b2: o.b2 }; }
	return out;
}

export const LANDMARK_HELP = {
	'cf-neck': 'notch at the front base of the neck', 'cb-neck': 'centre back at the base of the neck', navel: 'navel',
	'cb-waist': 'centre back at the waist', crotch: 'crotch point', 'shoulder-l': "wearer's left shoulder tip",
	'bust-l': "wearer's left bust point", 'underarm-l': "wearer's left side of the ribcage just below the armpit", 'waist-l': "wearer's left waist (side)", 'hip-l': "wearer's left hip (side, widest)",
	'elbow-l': "wearer's left elbow (outside)", 'wrist-l': "wearer's left wrist", 'knee-l': "wearer's left knee (front)",
};
