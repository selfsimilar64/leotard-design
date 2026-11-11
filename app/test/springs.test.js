// The elastic's spans are made twice (fit realism plan stage 3): energy.springs (pipeline/race/energy.py, the Python twin the re-fit
// is checked against) and elasticSprings (src/fit/refit.js, the app). Same spans in the same order, same rests and stiffnesses. The
// fixture is energy.springs' output on a race case's elastic with kink 2, firm 1.5 and snug 0.9.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { elasticSprings } from '../src/fit/refit.js';

const F = JSON.parse(readFileSync(new URL('./fixtures/springs.json', import.meta.url)));

describe('elastic springs (refit.js elasticSprings against energy.springs)', () => {
	const S = elasticSprings(Int32Array.from(F.el_si), Int32Array.from(F.el_sj), Float32Array.from(F.el_rest), Float32Array.from(F.el_k), F.kink, F.firm, F.snug);
	it('makes the same spans in the same order', () => {
		expect(S.npull).toBe(F.npull);
		expect(Array.from(S.si)).toEqual(F.si);
		expect(Array.from(S.sj)).toEqual(F.sj);
		expect(S.si.length).toBeGreaterThan(F.npull);
	});
	it('gives the same rests and stiffnesses (to float32)', () => {
		let worst = 0;
		for (let s = 0; s < F.rest.length; s++) {
			worst = Math.max(worst, Math.abs(S.rest[s] - F.rest[s]) / F.rest[s], Math.abs(S.k[s] - F.k[s]) / F.k[s]);
		}
		expect(worst).toBeLessThan(1e-6);
	});
	it('is the elastic unchanged with kink 0 and firm 1', () => {
		const P = elasticSprings(Int32Array.from(F.el_si), Int32Array.from(F.el_sj), Float32Array.from(F.el_rest), Float32Array.from(F.el_k));
		expect(P.si.length).toBe(F.npull);
		expect(Array.from(P.k)).toEqual(Array.from(Float32Array.from(F.el_k)));
	});
});
