import { describe, it, expect, beforeAll } from 'vitest';
import { loadBody } from './helpers.js';
import { makeBlock, BLOCK_OPTIONS } from '../src/garment/blocks.js';
import { buildGarment } from '../src/garment/build.js';
import { newDocument } from '../src/doc/schema.js';
import { fromSP } from '../src/body/surface.js';

let B;
beforeAll(async () => { B = await loadBody(); }, 60000);

function docFor(opts) {
	const d = newDocument('t');
	const blk = makeBlock(B.man, B.surf, opts);
	d.curves = blk.curves.map(({ key, ...c }) => ({ id: key, layer: 'L0', ...c }));
	d.panels = blk.panels.map((p, i) => ({ id: 'p' + (i + 1), layer: 'L0', ...p }));
	return d;
}

describe('blocks on the body', () => {
	it('default block (scoop, long sleeves, high leg) cuts into front, back and sleeves', () => {
		const d = docFor({});
		const g = buildGarment(d, B.surf);
		expect(g.arr.warn).toEqual([]);
		expect(g.seeds.every((s) => s.cell >= 0)).toBe(true);
		const [front, back, sleeveL, sleeveR] = g.seeds.map((s) => g.arr.cells[s.cell]);
		expect(new Set(g.seeds.map((s) => s.cell)).size).toBe(4);
		// sleeves mirror each other; front and back are each roughly a quarter square metre
		expect(Math.abs(sleeveL.area - sleeveR.area) / sleeveL.area).toBeLessThan(0.02);
		for (const c of [front, back]) { expect(c.area).toBeGreaterThan(0.12); expect(c.area).toBeLessThan(0.3); }
		console.log('ms', g.ms, 'cells', g.arr.cells.map((c) => +c.area.toFixed(4)));
	});
	it('raglan sleeves run up to the neckline (no shoulder seam) and keep four pieces', () => {
		for (const neck of ['high', 'crew', 'scoop']) {
			const g = buildGarment(docFor({ armhole: 'raglan', neck }), B.surf), names = g.seeds.map((s) => s.panel);
			expect(g.arr.warn, neck).toEqual([]);
			expect(new Set(g.seeds.map((s) => s.cell)).size, neck).toBe(4);
			const set = buildGarment(docFor({ neck }), B.surf);
			// the raglan sleeve takes the shoulder: larger than the set-in sleeve, front smaller
			const area = (gg, i) => gg.arr.cells[gg.seeds[i].cell].area;
			expect(area(g, 2), neck).toBeGreaterThan(area(set, 2) * 1.08);
			expect(area(g, 0), neck).toBeLessThan(area(set, 0));
			expect(names.length).toBe(4);
		}
	});
	it('V necklines reach their point (front about 1.27 m, back about 1.17 m on the reference body)', () => {
		const lowest = (opts, back) => {
			const neck = makeBlock(B.man, B.surf, opts).curves.find((c) => c.key === 'neck');
			let y = Infinity;
			for (const pt of neck.points) { const p = B.surf.pos(fromSP(pt.sp)); if ((p.z < 0.0) === back && Math.abs(p.x) < 0.03) y = Math.min(y, p.y); }
			return y;
		};
		expect(lowest({ neck: 'v' }, false)).toBeLessThan(1.31);
		expect(lowest({ back: 'v' }, true)).toBeLessThan(1.22);
		expect(lowest({ neck: 'crew' }, false)).toBeGreaterThan(1.32);
	});
	it('every block option builds a closed, warning-free arrangement', () => {
		for (const [k, vals] of Object.entries(BLOCK_OPTIONS)) for (const v of vals) {
			const g = buildGarment(docFor({ [k]: v }), B.surf);
			expect(g.arr.warn, `${k}=${v}`).toEqual([]);
			expect(g.seeds.every((s) => s.cell >= 0), `${k}=${v}`).toBe(true);
			// the front and back seeds sit in the body panels, not in an opening
			for (const s of g.seeds.slice(0, 2)) expect(g.arr.cells[s.cell].area, `${k}=${v} ${s.panel}`).toBeGreaterThan(0.08);
		}
	});
});
