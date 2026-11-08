// fit/folds.js foldsOf is the twin of pipeline/wrap_block.py folds_of: this checks it against the Python's answer on a synthetic,
// unevenly squeezed mesh (fixtures/folds-twin.json, made once by running folds_of on it; remake it if folds_of changes).
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { foldsOf } from '../src/fit/folds.js';

const F = JSON.parse(fs.readFileSync(path.resolve('test/fixtures/folds-twin.json'), 'utf8'));

describe('fold heights (twin of wrap_block.folds_of)', () => {
	it('match the pipeline point for point', () => {
		const got = foldsOf(Float32Array.from(F.q), Float32Array.from(F.uv), Int32Array.from(F.tri));
		let worst = 0;
		for (let i = 0; i < got.length; i++) worst = Math.max(worst, Math.abs(got[i] - F.folds[i]));
		expect(Math.max(...F.folds)).toBeGreaterThan(0.002); // the mesh does gather
		expect(worst).toBeLessThan(2e-6); // metres; float32 inputs
	});
});
