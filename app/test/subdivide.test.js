// The app's subdivision (body/subdivide.js) against the pipeline's (pipeline/g9.py cc_stencil): the
// two are twins and must give the same canonical mesh.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ccStencil, applyStencil, quadTriangles, readPolys } from '../src/body/subdivide.js';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/g9');
const read = (f) => { const b = fs.readFileSync(path.join(DIR, f)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };

describe('subdivision', () => {
	it('matches the pipeline: same triangles, same positions of the reference body', () => {
		const m = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8')), topo = read('topology.bin');
		const { sizes, ids } = readPolys(topo, m.topology.cage);
		const S = ccStencil(m.cage, sizes, ids);
		expect(S.n).toBe(m.vertices);
		expect(Array.from(quadTriangles(S.quads))).toEqual(Array.from(new Uint32Array(topo, m.topology.index.offset, m.topology.index.count)));
		const ref = m.bodies.find((b) => b.key === m.ref), P = applyStencil(S, new Float32Array(read(ref.poses['a-pose'].file)));
		const Q = new Float32Array(topo, m.topology.check.offset, m.topology.check.count);
		let worst = 0;
		for (let i = 0; i < P.length; i++) worst = Math.max(worst, Math.abs(P[i] - Q[i]));
		expect(worst).toBeLessThan(1e-5);
	});
});
