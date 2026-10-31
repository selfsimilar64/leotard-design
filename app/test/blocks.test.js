// Block elements (garment/blocks.js, doc/commands-garment.js block.set): changing one element keeps
// the rest of the design; the new front elements (yoke, waist) cut the front into pieces.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadBody } from './helpers.js';
import { makeBlock, blockFabric, blockOf } from '../src/garment/blocks.js';
import { evaluateCurve } from '../src/curves/evaluate.js';
import { buildGarment, panelAt } from '../src/garment/build.js';
import { DocumentStore } from '../src/doc/store.js';
import { newDocument } from '../src/doc/schema.js';
import { fromSP } from '../src/body/surface.js';
import '../src/doc/commands-garment.js';
import '../src/doc/commands-stones.js';
import { STARTS } from '../src/garment/starts.js';

let B;
beforeAll(async () => { B = await loadBody(); }, 60000);

function store() {
	const s = new DocumentStore(newDocument('t'));
	s.ctx = { man: B.man, surf: B.surf, landmarks: {}, garment: () => null, get evaluated() { return undefined; }, get doc() { return s.doc; } };
	return s;
}
const byName = (doc, name) => doc.curves.find((c) => c.name === name);
const panel = (doc, name) => doc.panels.find((p) => p.name === name);
const build = (doc) => buildGarment(doc, B.surf, { layer: 'L0' });
// the panel under a design-frame front point
const under = (g, doc, x, y, back = false) => panelAt(g, doc, B.surf, B.man.projectFront(x, y, back));

describe('front elements', () => {
	it('a yoke and a waist seam cut the front into three pieces', () => {
		const blk = makeBlock(B.man, B.surf, { sleeves: 'tank', neck: 'crew', back: 'crew', leg: 'standard', yoke: 'sweetheart', waist: 'straight' });
		expect(blk.curves.map((c) => c.key)).toEqual(expect.arrayContaining(['yoke', 'waist']));
		expect(blk.panels.map((p) => p.key)).toEqual(['front', 'yoke', 'lower', 'back']);
		const doc = newDocument('t');
		doc.curves = blk.curves.map(({ key, ...c }) => ({ id: key, layer: 'L0', ...c }));
		doc.panels = blk.panels.map(({ key, ...p }) => ({ id: key, layer: 'L0', ...p }));
		const g = build(doc);
		expect(under(g, doc, 0.05, 1.3)).toBe('yoke');
		expect(under(g, doc, 0.05, 1.12)).toBe('front');
		expect(under(g, doc, 0, 0.95)).toBe('lower');
		expect(under(g, doc, 0, 0.9, true)).toBe('back');
		// the yoke seam's ends sit on the armhole, its centre dips at the sternum
		const yoke = doc.curves.find((c) => c.id === 'yoke');
		expect(yoke.points[0].on.curve).toBe('arm');
		expect(yoke.points[4].on).toEqual(expect.objectContaining({ curve: 'arm', mirror: true }));
		expect(yoke.points[2].kind).toBe('corner');
	});
	it('the fabric test follows the openings', () => {
		const fab = blockFabric(B.man, B.surf, { sleeves: 'tank', neck: 'crew', back: 'keyhole', leg: 'standard' });
		expect(fab(B.man.projectFront(0, 1.0, false))).toBe(true);
		expect(fab(B.man.projectFront(0, 1.44, false))).toBe(false); // in the neck opening
		expect(fab(B.man.projectFront(0, 1.232, true))).toBe(false); // in the keyhole
		expect(fab(B.man.projectFront(0, 1.1, true))).toBe(true);
	});
});

describe('block.set changes one element and keeps the rest', () => {
	it('opens a keyhole, adds and removes sleeves, keeps panel ids and stones', () => {
		const s = store();
		s.exec({ op: 'block.apply', neck: 'crew', back: 'crew', sleeves: 'tank', leg: 'standard', fabric: 'matte', colour: '#112233' });
		const front = panel(s.doc, 'Front').id, back = panel(s.doc, 'Back').id, neck = byName(s.doc, 'Neckline').id, leg = byName(s.doc, 'Leg line').id;
		const n0 = s.doc.curves.length;
		s.exec({ op: 'panel.separate', id: back }); // the block's pieces start in one material
		s.exec({ op: 'panel.set', id: back, colour: '#aa0000' });
		const row = s.exec({ op: 'stones.add', kind: 'row', on: { curve: neck }, params: { size: 'ss10', rows: 1, offset: 0.004, gap: 1.2 } });

		// back: a keyhole appears as an opening (no panel inside), nothing else changes
		let impact = s.exec({ op: 'block.set', back: 'keyhole' });
		expect(impact).toEqual({ lines: [], pieces: [], stones: [], straps: [] });
		expect(s.doc.curves.length).toBe(n0 + 1);
		expect(byName(s.doc, 'Back opening')).toBeTruthy();
		expect(byName(s.doc, 'Neckline').id).toBe(neck);
		expect(panel(s.doc, 'Back').id).toBe(back);
		expect(panel(s.doc, 'Back').stack[0].colour).toBe('#aa0000');
		let g = build(s.doc);
		expect(under(g, s.doc, 0, 1.232, true)).toBe(null);
		expect(under(g, s.doc, 0, 1.1, true)).toBe(back);
		expect(s.doc.stones.find((x) => x.id === row).on.curve).toBe(neck);
		expect(s.doc.meta.block.back).toBe('keyhole');

		// sleeves: a sleeve piece arrives in the front's fabric; the leg line is untouched
		const legPts = JSON.stringify(byName(s.doc, 'Leg line').points);
		s.exec({ op: 'block.set', sleeves: 'long' });
		expect(panel(s.doc, 'Sleeve')).toBeTruthy();
		expect(panel(s.doc, 'Sleeve').stack[0].colour).toBe('#112233');
		expect(byName(s.doc, 'Cuff')).toBeTruthy();
		expect(byName(s.doc, 'Sleeve seam').role).toBe('seam');
		expect(JSON.stringify(byName(s.doc, 'Leg line').points)).toBe(legPts);
		expect(byName(s.doc, 'Leg line').id).toBe(leg);
		expect(panel(s.doc, 'Front').id).toBe(front);
		g = build(s.doc);
		expect(under(g, s.doc, 0, 1.0)).toBe(front);

		// back to a tank: the sleeve piece goes and is reported; the keyhole stays
		impact = s.exec({ op: 'block.set', sleeves: 'tank' });
		expect(impact).toEqual({ lines: [], pieces: [], stones: [], straps: [] }); // the block's own pieces go quietly
		expect(panel(s.doc, 'Sleeve')).toBeUndefined();
		expect(byName(s.doc, 'Cuff')).toBeUndefined();
		expect(byName(s.doc, 'Armhole').role).toBe('edge');
		expect(byName(s.doc, 'Back opening')).toBeTruthy();

		// the keyhole closes
		impact = s.exec({ op: 'block.set', back: 'crew' });
		expect(impact.lines).toEqual([]);
		expect(s.doc.curves.length).toBe(n0);
		g = build(s.doc);
		expect(under(g, s.doc, 0, 1.232, true)).toBe(back);

		// undo brings the keyhole back in one step
		s.undo();
		expect(byName(s.doc, 'Back opening')).toBeTruthy();
	});

	it('a waist seam splits the front and a drawn line re-attaches to a new neckline', () => {
		const s = store();
		s.exec({ op: 'block.apply', neck: 'crew', back: 'crew', sleeves: 'tank', leg: 'standard', fabric: 'matte', colour: '#112233' });
		const front = panel(s.doc, 'Front').id, neck = byName(s.doc, 'Neckline').id;
		s.exec({ op: 'panel.set', id: front, ombre: { colour: '#000000', axis: [0, 1, 0], start: 1.25, end: 0.85 } });
		// a drawn line from the neckline down the front
		const t0 = 0.3;
		const line = s.exec({ op: 'curve.add', role: 'seam', mirror: 'both', points: [{ at: { front: [0.05, 1.36] }, on: { curve: neck, t: t0 } }, { front: [0.06, 1.0] }] });
		const anchor = fromSP(s.doc.curves.find((c) => c.id === line).points[0].sp);

		s.exec({ op: 'block.set', waist: 'straight' });
		expect(panel(s.doc, 'Front').id).toBe(front);
		expect(panel(s.doc, 'Lower front')).toBeTruthy();
		expect(panel(s.doc, 'Lower front').stack[0].ombre).toBeTruthy(); // copies the front's look
		let g = build(s.doc);
		expect(under(g, s.doc, 0.03, 1.12)).toBe(front);
		expect(under(g, s.doc, 0.03, 0.95)).toBe(panel(s.doc, 'Lower front').id);

		s.exec({ op: 'block.set', neck: 'v' });
		expect(byName(s.doc, 'Neckline').id).toBe(neck);
		const pt = s.doc.curves.find((c) => c.id === line).points[0];
		expect(pt.on.curve).toBe(neck);
		expect(pt.on.t).not.toBe(t0); // re-attached where the old anchor is nearest on the new V
		// the shoulder seam still ends on the (new) neckline and the armhole
		const sh = byName(s.doc, 'Shoulder seam');
		expect(sh.points[0].on.curve).toBe(neck);
		expect(sh.points[2].on.curve).toBe(byName(s.doc, 'Armhole').id);
		expect(B.surf.pos(anchor).y).toBeGreaterThan(1.2);

		s.exec({ op: 'stones.add', kind: 'row', on: { curve: byName(s.doc, 'Waist seam').id }, params: { size: 'ss10', rows: 1, offset: 0.004, gap: 1.2 } });
		const impact = s.exec({ op: 'block.set', waist: 'none' });
		expect(impact).toEqual({ lines: [], pieces: [], stones: ['row'], straps: [] });
		expect(panel(s.doc, 'Lower front')).toBeUndefined();
		g = build(s.doc);
		expect(under(g, s.doc, 0.03, 0.95)).toBe(front);
	});

	it('a dry run reports without changing anything', () => {
		const s = store();
		s.exec({ op: 'block.apply', neck: 'crew', back: 'keyhole', sleeves: 'long', leg: 'standard' });
		s.exec({ op: 'strap.add', points: [{ front: [0.05, 1.3] }, { back: [0.05, 1.3] }], width: 0.01 });
		s.exec({ op: 'stones.add', kind: 'fill', on: { panel: panel(s.doc, 'Sleeve').id }, params: { size: 'ss8', pattern: 'random', gap: 2 }, name: 'Sleeve sparkle' });
		s.exec({ op: 'panel.add', at: { back: [0, 1.232] }, name: 'Keyhole mesh', fabric: 'mesh' });
		const before = s.snapshot(), n = s.undoStack.length;
		const impact = s.exec({ op: 'block.set', sleeves: 'tank', back: 'crew' }, { dryRun: true });
		expect(impact.stones).toEqual(['Sleeve sparkle']);
		expect(impact.pieces).toEqual(['Keyhole mesh']);
		expect(s.snapshot()).toEqual(before);
		expect(s.undoStack.length).toBe(n);
	});
});

describe('shoulder straps', () => {
	// the strap's width across the top of the shoulder: the shoulder seam from the neckline to the armhole
	const strapWidth = (opts) => {
		const c = makeBlock(B.man, B.surf, { sleeves: 'tank', leg: 'high', ...opts }).curves.find((x) => x.key === 'shoulder');
		const e = evaluateCurve(c, B.surf);
		let L = 0;
		for (let i = 1; i < e.pts.length; i++) L += e.pts[i].distanceTo(e.pts[i - 1]);
		return L;
	};
	it('each strap has its width whatever the neckline (the photos: about 1, 3 and 5 cm)', () => {
		const w = (strap, neck, back) => strapWidth({ strap, neck, back });
		expect(w('wide', 'crew', 'crew')).toBeGreaterThan(0.11); // the tank before straps
		for (const [neck, back] of [['square', 'scoop'], ['v', 'open'], ['scoop', 'square']]) {
			expect(w('thin', neck, back)).toBeGreaterThan(0.008);
			expect(w('thin', neck, back)).toBeLessThan(0.02);
			expect(w('narrow', neck, back)).toBeGreaterThan(0.025);
			expect(w('narrow', neck, back)).toBeLessThan(0.04);
		}
		expect(w('thin', 'square', 'scoop')).toBeCloseTo(w('thin', 'v', 'open'), 2); // the neckline does not move the strap
		expect(w('tank', 'square', 'square')).toBeGreaterThan(0.04);
		expect(w('tank', 'square', 'square')).toBeLessThan(0.065);
		expect(w('racer', 'crew', 'crew')).toBeLessThan(0.05);
	});
	it('a strap change turns a neckline it cannot hold into one it can; asking for one is an error', () => {
		const s = store();
		s.exec({ op: 'start.apply', key: 'plain-tank' });
		const front = panel(s.doc, 'Front').id, arm = byName(s.doc, 'Armhole').id;
		s.exec({ op: 'block.set', strap: 'thin' });
		expect(s.doc.meta.block).toEqual(expect.objectContaining({ strap: 'thin', neck: 'square', back: 'scoop' }));
		expect(panel(s.doc, 'Front').id).toBe(front);
		expect(byName(s.doc, 'Armhole').id).toBe(arm);
		expect(() => s.exec({ op: 'block.set', neck: 'crew' })).toThrow(/does not go with thin straps/);
		s.exec({ op: 'block.set', neck: 'v' });
		expect(s.doc.meta.block.neck).toBe('v');
		// sleeves allow any neckline; back to a tank, the thin strap brings its neckline back
		s.exec({ op: 'block.set', sleeves: 'long' });
		s.exec({ op: 'block.set', neck: 'crew' });
		s.exec({ op: 'block.set', sleeves: 'tank' });
		expect(s.doc.meta.block).toEqual(expect.objectContaining({ strap: 'thin', neck: 'square' }));
		const g = build(s.doc);
		expect(under(g, s.doc, 0, 1.0)).toBe(front);
	});
	it('a design saved before straps keeps its wide tank', () => {
		expect(blockOf({ meta: { block: { sleeves: 'tank', neck: 'crew' } } }).strap).toBe('wide');
		expect(blockOf({ meta: {} }).strap).toBe('tank');
	});
});

describe('starting points', () => {
	it('every start applies as one undo step and changes only the leotard', () => {
		for (const st of STARTS) {
			const s = store();
			const body = JSON.stringify(s.doc.body), n = s.undoStack.length;
			s.exec({ op: 'start.apply', key: st.key });
			expect(s.undoStack.length).toBe(n + 1);
			expect(JSON.stringify(s.doc.body)).toBe(body);
			expect(s.doc.meta.start).toBe(st.key);
			expect(s.doc.meta.block).toEqual(expect.objectContaining(st.block));
			for (const key of Object.keys(st.panels ?? {})) expect(s.doc.panels.find((p) => p.block === key), st.key + ' ' + key).toBeTruthy();
			expect(s.doc.stones.length).toBe((st.stones ?? []).length);
			const g = build(s.doc);
			expect(g.arr.cells.length).toBeGreaterThan(3);
		}
	});
});
