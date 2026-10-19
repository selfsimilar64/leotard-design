import { it } from 'vitest';
import { loadBody } from '../helpers.js';
import { makeBlock } from '../../src/garment/blocks.js';
import { buildGarment } from '../../src/garment/build.js';
import { newDocument } from '../../src/doc/schema.js';
import { cellPiece } from '../../src/garment/pieces.js';
import { flatten } from '../../src/garment/flatten.js';
it('prof', { timeout: 60000 }, async () => {
	const B = await loadBody();
	const d = newDocument('t');
	const blk = makeBlock(B.man, B.surf, {});
	d.curves = blk.curves.map(({ key, ...c }) => ({ id: key, layer: 'L0', ...c }));
	d.panels = blk.panels.map((p, i) => ({ id: 'p' + (i + 1), layer: 'L0', ...p }));
	const g = buildGarment(d, B.surf);
	const c = g.seeds[0].cell;
	let t0 = performance.now();
	const m = cellPiece(g.arr, c);
	console.log('piece', (performance.now() - t0).toFixed(0));
	for (const opt of [{ arapIter: 0 }, { arapIter: 10 }, { arapIter: 30 }, { arapIter: 80 }, { arapIter: 30, maxIter: 300 }]) {
		t0 = performance.now();
		const r = flatten(m.P, m.I, opt);
		console.log(JSON.stringify(opt), 'ms', (performance.now() - t0).toFixed(0), 'res', r.residual.toExponential(1), JSON.stringify(r.stretch));
	}
});
