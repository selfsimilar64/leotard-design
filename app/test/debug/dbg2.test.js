import { it } from 'vitest';
import { loadBody } from '../helpers.js';
import { makeBlock } from '../../src/garment/blocks.js';
import { buildGarment } from '../../src/garment/build.js';
import { newDocument } from '../../src/doc/schema.js';
it('dbg', async () => {
	const B = await loadBody();
	for (const opts of [{}, { sleeves: 'tank' }]) {
		const d = newDocument('t');
		const blk = makeBlock(B.man, B.surf, opts);
		d.curves = blk.curves.map(({ key, ...c }) => ({ id: key, layer: 'L0', ...c }));
		d.panels = blk.panels.map((p, i) => ({ id: 'p' + (i + 1), layer: 'L0', ...p }));
		const g = buildGarment(d, B.surf);
		console.log(JSON.stringify(opts), 'warn', g.arr.warn, 'loose', g.arr.loose.length, 'cells', g.arr.cells.map((c) => [c.tris.length, +c.area.toFixed(4)]), 'seeds', JSON.stringify(g.seeds), JSON.stringify(g.ms));
	}
});
