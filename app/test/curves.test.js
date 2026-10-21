// Curve sampling (curves/evaluate.js on body/reference.js surface.open): a line through the armpit
// must not put samples on the arm, or they fly off with it in a pose (owner's screenshots,
// 2026-10-21: spikes from the armhole up the arm on several moodboard designs).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll } from 'vitest';
import { loadBody } from './helpers.js';
import { evaluateAll } from '../src/garment/build.js';
import { applyStencil } from '../src/body/subdivide.js';
import { migrate } from '../src/doc/schema.js';

const DESIGNS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../designs');

let B;
beforeAll(async () => { B = await loadBody(); }, 120000);

describe('curve sampling', () => {
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
});
