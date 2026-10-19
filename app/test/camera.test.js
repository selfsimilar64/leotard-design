import { describe, it, expect, beforeAll } from 'vitest';
import * as THREE from 'three';
import { solveCamera, projectWith, rayThrough } from '../src/render/camera-solve.js';
import { surfaceLandmarks } from '../src/body/landmarks.js';
import { loadBody } from './helpers.js';

let B, LM;
beforeAll(async () => { B = await loadBody(); LM = surfaceLandmarks(B.man, B.surf); }, 60000);

function synth(pos, target, fov, size, names, noise = 0) {
	const cam = new THREE.PerspectiveCamera(fov, size[0] / size[1], 0.01, 10);
	cam.position.set(...pos); cam.lookAt(new THREE.Vector3(...target)); cam.updateMatrixWorld();
	return names.map((n) => {
		const X = B.surf.pos(LM[n]);
		const p = X.clone().project(cam);
		const u = [(p.x + 1) / 2 * size[0] + (Math.random() - 0.5) * noise, (1 - p.y) / 2 * size[1] + (Math.random() - 0.5) * noise];
		return { X: X.toArray(), u, name: n };
	});
}

describe('camera solve', () => {
	it('finds every landmark on the body', () => {
		for (const [k, sp] of Object.entries(LM)) expect(sp.f, k).toBeGreaterThanOrEqual(0);
		// left and right are mirror images
		const l = B.surf.pos(LM['waist-l']), r = B.surf.pos(LM['waist-r']);
		expect(l.x).toBeGreaterThan(0.05);
		expect(Math.abs(l.x + r.x)).toBeLessThan(0.01);
	});
	it('recovers a front three-quarter camera from 8 pins', () => {
		const names = ['cf-neck', 'shoulder-l', 'shoulder-r', 'bust-l', 'waist-l', 'waist-r', 'navel', 'crotch'];
		const pins = synth([0.6, 1.2, 2.2], [0, 1.05, 0], 32, [900, 1200], names, 0);
		const cam = solveCamera(pins, [900, 1200]);
		expect(cam.error).toBeLessThan(0.5);
		expect(Math.abs(cam.fov - 32)).toBeLessThan(1.5); // the lens prior pulls a little towards 28
		expect(new THREE.Vector3(...cam.position).distanceTo(new THREE.Vector3(0.6, 1.2, 2.2))).toBeLessThan(0.08); // the lens prior trades a little distance for focal length
	});
	it('recovers a back view with pixel noise, and rays land on the pinned points', () => {
		const names = ['cb-neck', 'shoulder-l', 'shoulder-r', 'cb-waist', 'waist-l', 'waist-r', 'hip-l', 'hip-r'];
		const pins = synth([-0.3, 1.3, -2.0], [0, 1.0, 0], 24, [1000, 1400], names, 2);
		const cam = solveCamera(pins, [1000, 1400]);
		expect(cam.error).toBeLessThan(2);
		for (const p of pins) {
			const back = projectWith(cam, p.X);
			expect(Math.hypot(back[0] - p.u[0], back[1] - p.u[1])).toBeLessThan(4);
			// rays through the centre-line pins land on them (side pins can be hidden by the arms)
			if (!p.name.startsWith('cb')) continue;
			const ray = rayThrough(cam, p.u), hit = B.surf.bvh.raycastFirst(ray, THREE.DoubleSide);
			expect(hit.point.distanceTo(new THREE.Vector3(...p.X))).toBeLessThan(0.01);
		}
	});
});
