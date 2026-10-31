// Curve sampling (curves/evaluate.js on body/reference.js surface.open): a line through the armpit
// must not put samples on the arm, or they fly off with it in a pose (owner's screenshots,
// 2026-10-21: spikes from the armhole up the arm on several moodboard designs).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll } from 'vitest';
import { loadBody } from './helpers.js';
import * as THREE from 'three';
import { evaluateAll } from '../src/garment/build.js';
import { evaluateCurve } from '../src/curves/evaluate.js';
import { toSP } from '../src/body/surface.js';
import { applyStencil } from '../src/body/subdivide.js';
import { migrate } from '../src/doc/schema.js';

const DESIGNS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../designs');

let B;
beforeAll(async () => { B = await loadBody(); }, 120000);

// Sideways bending of a line within the surface (its geodesic curvature, 1/m): turning towards the
// body's normal is the body's own shape and does not count.
function bends(e, surf, win = 4) {
	const k = [], pts = e.pts, x = new THREE.Vector3();
	for (let i = win; i < pts.length - win; i++) {
		const a = pts[i].clone().sub(pts[i - win]).normalize(), b = pts[i + win].clone().sub(pts[i]).normalize();
		k.push(x.crossVectors(a, b).dot(surf.normalAt(e.sps[i])) / (pts[i + win].distanceTo(pts[i - win]) / 2));
	}
	let flips = 0, vary = 0;
	for (let i = 1; i < k.length; i++) { if (k[i] * k[i - 1] < 0) flips++; vary += Math.abs(k[i] - k[i - 1]); }
	return { flips, peak: Math.max(...k.map(Math.abs)), vary };
}

describe('curve sampling', () => {
	// Owner, 2026-10-31: drawn seams were irregular. Clicks as a hand makes them (seen from the front,
	// about 2 mm off the intended line) along the bowed edge of a chest piece.
	it('a line clicked along a bow stays a smooth bow', () => {
		const down = new THREE.Vector3(0, 0, -1);
		for (const n of [4, 6, 10]) {
			const points = [];
			for (let i = 0; i < n; i++) {
				const t = i / (n - 1), j = 0.002;
				const o = new THREE.Vector3(0.03 + 0.09 * Math.sin(Math.PI * t) + j * Math.sin(i * 12.9898), 1.33 - 0.2 * t + j * Math.sin(i * 78.233), 0.4);
				points.push({ sp: toSP(B.surf.raycast(new THREE.Ray(o, down), {})), kind: 'smooth' });
			}
			const e = evaluateCurve({ points, closed: false }, B.surf), r = bends(e, B.surf);
			expect(r.flips).toBeLessThanOrEqual(8); // Catmull-Rom with closest-point projection: 15, 25 and 7
			expect(r.vary).toBeLessThan(300); // and 500, 433 and 338
			expect(Math.max(...e.pts.slice(1).map((p, i) => p.distanceTo(e.pts[i])))).toBeLessThan(0.003); // no jump across a hollow
		}
	});
	it('the reference surface has an arms-raised twin to sample on', () => {
		expect(B.surf.open).toBeTruthy();
		expect(B.surf.open.F).toBe(B.surf.F);
	});
	it('no line of the moodboard designs jumps when the arms move', () => {
		const man = B.man, P = applyStencil(man.stencil, man.cageOf(man.bodies.young, 'arms-outstretched')), idx = man.idx;
		const pos = (sp, o) => {
			const b1 = sp.b1 ?? sp.b?.[0], b2 = sp.b2 ?? sp.b?.[1], b0 = sp.b0 ?? 1 - b1 - b2;
			for (let k = 0; k < 3; k++) o[k] = b0 * P[idx[sp.f * 3] * 3 + k] + b1 * P[idx[sp.f * 3 + 1] * 3 + k] + b2 * P[idx[sp.f * 3 + 2] * 3 + k];
			return o;
		};
		const bad = [];
		for (const f of fs.readdirSync(DESIGNS).filter((x) => /^b\d+-.*\.json$/.test(x))) {
			const doc = JSON.parse(fs.readFileSync(path.join(DESIGNS, f), 'utf8'));
			migrate(doc);
			for (const [key, c] of evaluateAll(doc, B.surf, null, null)) {
				const a = [0, 0, 0], b = [0, 0, 0];
				let worst = 0;
				for (let i = 1; i < c.sps.length; i++) { pos(c.sps[i - 1], a); pos(c.sps[i], b); worst = Math.max(worst, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])); }
				// before the fix: 6-25 cm at the armpit; the 2 cm crotch seam stretches to 4 cm between spread legs
				if (worst > 0.05) bad.push(`${f} ${key}: ${(worst * 100).toFixed(1)} cm`);
			}
		}
		expect(bad).toEqual([]);
	});
	it('no point of a sleeveless design is stored on the arm', () => {
		// a point traced against the inner arm in the A-pose (it lies on the side of the chest) is
		// part of the arm: in a pose the outline runs up the arm to it (owner's screenshot,
		// 2026-10-21: B5's upper back opening; B12's lining edge had the same)
		const man = B.man, idx = man.idx, bad = [];
		for (const f of fs.readdirSync(DESIGNS).filter((x) => /^b\d+-.*\.json$/.test(x))) {
			const doc = JSON.parse(fs.readFileSync(path.join(DESIGNS, f), 'utf8'));
			if (doc.meta?.block?.sleeves !== 'tank') continue;
			for (const c of doc.curves) c.points.forEach((pt, i) => {
				const w = Math.max(...[0, 1, 2].map((k) => man.wArm[idx[pt.sp.f * 3 + k]]));
				if (w > 0.8) bad.push(`${f} ${c.id} (${c.name}) point ${i}: arm weight ${w.toFixed(2)}`);
			});
		}
		expect(bad).toEqual([]);
	});
});
