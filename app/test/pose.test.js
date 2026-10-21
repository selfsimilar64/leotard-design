// Poses (body/pose.js, body/mannequin.js cageOf): baked by Daz Studio per body; arm poses are each
// arm's change added to the A-pose.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadBody } from './helpers.js';
import { poseSpec, POSES, DAZ_POSES } from '../src/body/pose.js';
import { applyStencil } from '../src/body/subdivide.js';

let B;
beforeAll(async () => { B = await loadBody(); }, 120000);

describe('poses', () => {
	it('an arm pose moves its arm and leaves the torso where it was', () => {
		const man = B.man, body = man.bodies.young, L = body.landmarks;
		const rest = man.restOf(body), P = applyStencil(man.stencil, man.cageOf(body, 'hands-on-hips'));
		let torsoMoved = 0, torso = 0;
		for (let i = 0; i < man.vertices; i++) {
			if (man.wArm[i] > 0 || man.parts[i * 8] > 0 || man.wHead[i] > 0 || man.wLeg[i] > 0.5) continue;
			if (Math.abs(man.ref[i * 3]) > 0.06) continue; // the middle of the torso (the shoulders' correctives reach the chest's sides)
			torso++;
			if (Math.hypot(P[i * 3] - rest[i * 3], P[i * 3 + 1] - rest[i * 3 + 1], P[i * 3 + 2] - rest[i * 3 + 2]) > 0.002) torsoMoved++;
		}
		expect(torso).toBeGreaterThan(2000);
		expect(torsoMoved / torso).toBeLessThan(0.01);
		// the wrist now sits by the waist, not down by the thigh
		const near = (A, p) => { let bi = 0, bd = Infinity; for (let i = 0; i < A.length / 3; i++) { const d = Math.hypot(A[i * 3] - p[0], A[i * 3 + 1] - p[1], A[i * 3 + 2] - p[2]); if (d < bd) { bd = d; bi = i; } } return bi; };
		const w = near(rest, L.wrist_l);
		expect(Math.abs(P[w * 3 + 1] - L.waist[1])).toBeLessThan(0.1);
		expect(rest[w * 3 + 1]).toBeLessThan(L.waist[1] - 0.1);
	});
	it('left and right arm poses combine: each side matches its own bake', () => {
		const man = B.man, body = man.bodies.young, A = body.cages['a-pose'];
		const C = man.cageOf(body, { left: 'hip', right: 'up' }), Lh = body.armCages['l-hip'], Ru = body.armCages['r-up'];
		let worst = 0;
		for (let v = 0; v < A.length / 3; v++) {
			const src = A[v * 3] > 0.05 ? Lh : A[v * 3] < -0.05 ? Ru : null;
			if (src) for (let k = 0; k < 3; k++) worst = Math.max(worst, Math.abs(C[v * 3 + k] - src[v * 3 + k]));
		}
		expect(worst).toBeLessThan(0.002);
	});
	it('the A-pose is the rest and every pose name resolves; bad poses explain themselves', () => {
		const man = B.man, body = man.bodies.young;
		expect(man.cageOf(body, 'a-pose')).toBe(body.cages['a-pose']);
		expect(DAZ_POSES.length).toBeGreaterThan(3);
		for (const k of [...Object.keys(POSES), ...DAZ_POSES]) for (const b of man.keys) expect(() => man.cageOf(man.bodies[b], k), `${b} ${k}`).not.toThrow();
		expect(poseSpec(DAZ_POSES[0])).toEqual({ daz: DAZ_POSES[0] });
		expect(() => poseSpec('moonwalk')).toThrow(/pose must be one of/);
		expect(() => poseSpec({ left: 'wave' })).toThrow(/left arm must be one of/);
	});
});
