import { it } from 'vitest';
import { loadBody } from '../helpers.js';
import { makeBlock } from '../../src/garment/blocks.js';
import { buildGarment } from '../../src/garment/build.js';
import { newDocument } from '../../src/doc/schema.js';
it('perf', async () => {
	const B = await loadBody();
	const d = newDocument('t');
	const blk = makeBlock(B.man, B.surf, {});
	d.curves = blk.curves.map(({ key, ...c }) => ({ id: key, layer: 'L0', ...c }));
	d.panels = blk.panels.map((p, i) => ({ id: 'p' + (i + 1), layer: 'L0', ...p }));
	for (let k = 0; k < 3; k++) {
		const g = buildGarment(d, B.surf);
		console.log(JSON.stringify(g.ms), JSON.stringify(g.arr.phases));
	}
});
