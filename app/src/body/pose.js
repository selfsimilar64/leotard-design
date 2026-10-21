// Poses. Every pose is baked by Daz Studio on every body type (pipeline/daz/bodies.py), with
// Genesis 9's joint correctives, so the shoulders, armpits and hip creases deform as Daz poses them:
//  - arm poses: each arm in one of ARMS ('rest' is the mannequin's A-pose), baked one arm at a time
//    and added to the A-pose (body/mannequin.js cageOf), so every left/right combination works.
//    Named combinations in POSES ('hands-on-hips', ...): the poses photos are matched with.
//  - Daz poses: whole-body gymnastics poses (standing, leaps, passé, ...), the keys of the bodies'
//    manifest (pipeline/daz/bodies.py POSES), set by loadMannequins.
// A pose is a name (POSES or a Daz pose) or { left, right } with each arm an ARMS name. (Before
// Genesis 9 an arm could also be { upper, fore } directions; arm poses are now baked, so only the
// presets exist.)

export const ARMS = ['rest', 'down', 'front', 'thigh', 'hip', 'up'];

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

// Labels for the pose picker (arm poses; Daz poses carry their own from the manifest).
export const POSE_LABELS = {
	'a-pose': 'Mannequin stance (A-pose)', 'arms-down': 'Arms down', 'hands-in-front': 'Hands in front', 'hands-on-hips': 'Hands on hips',
	'hands-on-thighs': 'Hands on thighs', 'left-hand-on-hip': 'Left hand on hip', 'right-hand-on-hip': 'Right hand on hip',
	'left-arm-up': 'Left arm up', 'right-arm-up': 'Right arm up',
};

export const DAZ_POSES = [];
export function setDazPoses(keys) { DAZ_POSES.splice(0, DAZ_POSES.length, ...keys); }

// Normalise a pose to { left, right } of ARMS names, or { daz: key }; throws a readable error.
export function poseSpec(pose) {
	if (pose == null) return POSES['a-pose'];
	if (typeof pose === 'string') {
		if (POSES[pose]) return POSES[pose];
		if (DAZ_POSES.includes(pose)) return { daz: pose };
		throw new Error(`pose must be one of: ${[...Object.keys(POSES), ...DAZ_POSES].join(', ')}, or { left, right } with arms ${ARMS.join('|')}`);
	}
	const out = {};
	for (const side of ['left', 'right']) {
		const a = pose[side] ?? 'rest';
		if (!ARMS.includes(a)) throw new Error(`${side} arm must be one of: ${ARMS.join(', ')}`);
		out[side] = a;
	}
	return out;
}
export const isRest = (pose) => { const p = poseSpec(pose); return p.left === 'rest' && p.right === 'rest'; };
