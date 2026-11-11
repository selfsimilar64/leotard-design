// Bending's hinges are made twice: energy.hinges (pipeline/race/energy.py, the Python twin the re-fit is checked against) and
// hingesOf (src/fit/refit.js, the app). Same points in the same order, same weights. The fixture is energy.hinges' output on 600
// triangles of a race case (fit realism plan stage 2).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { hingesOf } from '../src/fit/refit.js';

const F = JSON.parse(readFileSync(new URL('./fixtures/hinges.json', import.meta.url)));

describe('bending hinges (refit.js hingesOf against energy.hinges)', () => {
	const H = hingesOf(Int32Array.from(F.tris), Float32Array.from(F.Dinv), Float32Array.from(F.area));
	it('finds the same hinges in the same order', () => {
		expect(H.ids.length).toBe(F.ids.length);
		expect(Array.from(H.ids)).toEqual(F.ids);
	});
	it('gives the same weights (to float32 inputs)', () => {
		let worstK = 0, worstC = 0;
		for (let i = 0; i < F.K.length; i++) worstK = Math.max(worstK, Math.abs(H.K[i] - F.K[i]) / (Math.abs(F.K[i]) + 1));
		for (let i = 0; i < F.c.length; i++) worstC = Math.max(worstC, Math.abs(H.c[i] - F.c[i]) / F.c[i]);
		expect(worstK).toBeLessThan(1e-4);
		expect(worstC).toBeLessThan(1e-5);
	});
});
