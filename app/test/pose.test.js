// Posing (body/pose.js): dual-quaternion skinning of the arms on the baked part weights.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadBody } from './helpers.js';
import { applyPose, poseSpec, POSES } from '../src/body/pose.js';

let B;
beforeAll(async () => { B = await loadBody(); }, 60000);

const near = (P, p) => { let bi = 0, bd = Infinity; for (let i = 0; i < P.length / 3; i++) { const d = Math.hypot(P[i * 3] - p[0], P[i * 3 + 1] - p[1], P[i * 3 + 2] - p[2]); if (d < bd) { bd = d; bi = i; } } return bi; };

describe('poses', () => {
	it('leaves the torso where it was and keeps the arm rigid along its bones', () => {
		const body = B.man.bodies.young, rest = body.pos, L = body.landmarks;
		const P = Float32Array.from(rest);
		applyPose(P, B.man.parts, body, 'hands-on-hips', { crotchY: 0.79, waistY: L.waist[1], frontZ: 0.11 });
		let torsoMoved = 0, torso = 0;
		for (let i = 0; i < P.length / 3; i++) {
			const w = (B.man.parts[i * 8] + B.man.parts[i * 8 + 1] + B.man.parts[i * 8 + 2] + B.man.parts[i * 8 + 6]) / 255;
			if (w > 0) continue;
			torso++;
			if (Math.hypot(P[i * 3] - rest[i * 3], P[i * 3 + 1] - rest[i * 3 + 1], P[i * 3 + 2] - rest[i * 3 + 2]) > 1e-6) torsoMoved++;
		}
		expect(torso).toBeGreaterThan(10000);
		expect(torsoMoved).toBe(0);
		// a vertex mid-forearm and one at the wrist move rigidly together (joints blend; bones do not)
		const mid = L.elbow_l.map((v, k) => (v + L.wrist_l[k]) / 2), e = near(rest, mid), w = near(rest, L.wrist_l);
		const len = (A, a, b) => Math.hypot(A[a * 3] - A[b * 3], A[a * 3 + 1] - A[b * 3 + 1], A[a * 3 + 2] - A[b * 3 + 2]);
		expect(len(P, e, w)).toBeCloseTo(len(rest, e, w), 3);
		// the wrist now sits by the waist, not down by the thigh
		expect(Math.abs(P[w * 3 + 1] - L.waist[1])).toBeLessThan(0.08);
		expect(rest[w * 3 + 1]).toBeLessThan(L.waist[1] - 0.1);
	});
	it('the rest pose is the identity and bad poses explain themselves', () => {
		const body = B.man.bodies.young, P = Float32Array.from(body.pos);
		applyPose(P, B.man.parts, body, 'a-pose', { crotchY: 0.79, waistY: 0.98, frontZ: 0.11 });
		expect(P).toEqual(body.pos);
		for (const k of Object.keys(POSES)) expect(() => poseSpec(k)).not.toThrow();
		expect(() => poseSpec('cartwheel')).toThrow(/pose must be one of/);
		expect(() => poseSpec({ left: 'wave' })).toThrow(/left arm must be one of/);
	});
});
