import { describe, it, expect, beforeAll } from 'vitest';
import { DocumentStore } from '../src/doc/store.js';
import { newDocument } from '../src/doc/schema.js';
import '../src/doc/commands-garment.js';
import '../src/doc/commands-stones.js';
import '../src/doc/commands-decals.js';
import { isPaired } from '../src/doc/symmetry.js';
import { evaluateAll } from '../src/garment/build.js';
import { fromSP } from '../src/body/surface.js';
import { loadBody } from './helpers.js';

let surf, man;
beforeAll(async () => { ({ surf, man } = await loadBody()); });

function store() {
	const s = new DocumentStore(newDocument('t'));
	s.ctx = { surf, man, landmarks: {}, get doc() { return s.doc; } };
	return s;
}
const line = (s, extra = {}) => s.exec({ op: 'curve.add', mirror: 'both', points: [{ p: [0.06, 1.2, 0.09] }, { p: [0.09, 1.1, 0.08] }], ...extra });
const edit = (s, cmd, side) => s.exec({ op: 'sym.edit', cmd, side });
const xOf = (sp) => surf.pos(fromSP(sp)).x;

describe('the Mirror toggle', () => {
	it('defaults to on, also for designs saved before it existed', () => {
		expect(newDocument().symmetry).toBe(true);
		const d = newDocument(); delete d.symmetry;
		expect(new DocumentStore(d).doc.symmetry).toBe(true);
	});

	it('Mirror on: an edit of a pair keeps the pair', () => {
		const s = store(), id = line(s);
		edit(s, { op: 'curve.set', id, shape: { mod: 'wave', amp: 0.002, period: 0.01 } });
		expect(s.doc.curves).toHaveLength(1);
		expect(isPaired(s.doc, 'curves', id)).toBe(true);
	});

	it('Mirror off: an edit splits the pair, as one undo step, and undo restores it', () => {
		const s = store(), id = line(s);
		s.doc.symmetry = false;
		const before = JSON.stringify(s.doc.curves), steps = s.undoStack.length;
		const r = edit(s, { op: 'curve.set', id, shape: { mod: 'wave', amp: 0.002, period: 0.01 } });
		expect(r.split).toBe(true);
		expect(s.doc.curves).toHaveLength(2);
		expect(s.doc.curves.map((c) => c.mirror)).toEqual(['none', 'none']);
		expect(s.doc.curves[0].shape.mod).toBe('wave');
		expect(s.doc.curves[1].shape.mod).toBe('none'); // the other side is untouched
		expect(Math.sign(xOf(s.doc.curves[1].points[0].sp))).toBe(-Math.sign(xOf(s.doc.curves[0].points[0].sp)));
		expect(s.undoStack.length).toBe(steps + 1);
		s.undo();
		expect(JSON.stringify(s.doc.curves)).toBe(before);
	});

	it('Mirror off: an edit of the mirror image lands on the new record', () => {
		const s = store(), id = line(s);
		s.doc.symmetry = false;
		const r = edit(s, { op: 'curve.set', id, shape: { mod: 'wave', amp: 0.002, period: 0.01 } }, 'm');
		expect(r.id).not.toBe(id);
		expect(s.doc.curves.find((c) => c.id === r.id).shape.mod).toBe('wave');
		expect(s.doc.curves.find((c) => c.id === id).shape.mod).toBe('none');
	});

	it('a rename never splits', () => {
		const s = store(), id = line(s);
		s.doc.symmetry = false;
		edit(s, { op: 'curve.set', id, name: 'Mine' });
		expect(s.doc.curves).toHaveLength(1);
		expect(s.doc.curves[0].mirror).toBe('both');
	});

	it('a pair stays a pair through one-sided edits of other parts', () => {
		const s = store(), a = line(s), b = line(s, { points: [{ p: [0.06, 1.0, 0.09] }, { p: [0.09, 0.95, 0.08] }] });
		s.doc.symmetry = false;
		edit(s, { op: 'curve.set', id: a, closed: false, shape: { mod: 'wave', amp: 0.002, period: 0.01 } });
		expect(isPaired(s.doc, 'curves', b)).toBe(true);
	});

	it('toggling back on does not re-pair what was split', () => {
		const s = store(), id = line(s);
		s.doc.symmetry = false;
		edit(s, { op: 'curve.set', id, shape: { mod: 'wave', amp: 0.002, period: 0.01 } });
		s.doc.symmetry = true;
		edit(s, { op: 'curve.set', id, shape: { mod: 'scallop', amp: 0.002, period: 0.01 } });
		expect(s.doc.curves.map((c) => c.shape.mod)).toEqual(['scallop', 'none']);
	});

	it('a line attached to a split line keeps both its ends where they were', () => {
		const s = store(), id = line(s);
		const end = { at: { p: [0.09, 1.1, 0.08] }, on: { curve: id, t: 1 } };
		const b = s.exec({ op: 'curve.add', mirror: 'both', points: [{ p: [0.13, 1.0, 0.05] }, end] });
		const was = evaluateAll(s.doc, surf).get(b + '~m').pts.at(-1).clone();
		s.doc.symmetry = false;
		edit(s, { op: 'curve.set', id, role: 'seam', shape: { mod: 'none', amp: 0, period: 0 } }); // a plain edit: nothing moves
		const now = evaluateAll(s.doc, surf).get(b + '~m').pts.at(-1);
		expect(now.distanceTo(was)).toBeLessThan(0.003);
	});

	it('a row on a split line becomes two linked halves, offsets mirrored', () => {
		const s = store(), id = line(s);
		const g = s.exec({ op: 'stones.add', kind: 'row', on: { curve: id }, params: { size: 'ss12', offset: 0.004 } });
		s.doc.symmetry = false;
		const r = edit(s, { op: 'curve.set', id, shape: { mod: 'wave', amp: 0.002, period: 0.01 } });
		expect(s.doc.stones).toHaveLength(2);
		const other = s.doc.stones.find((x) => x.id !== g);
		expect(other.on.curve).not.toBe(id);
		expect(other.params.offset).toBe(-0.004);
		expect(other.pair).toBe(g);
		expect(r.split).toBe(true);
		// Mirror on: the halves still change together
		s.doc.symmetry = true;
		edit(s, { op: 'stones.set', id: g, params: { size: 'ss16', offset: 0.006 } });
		expect(other.params.size).toBe('ss16');
		expect(s.doc.stones.find((x) => x.id === other.id).params.offset).toBe(-0.006);
	});

	it('Mirror off: an edit of one linked half unlinks them', () => {
		const s = store(), id = line(s);
		const g = s.exec({ op: 'stones.add', kind: 'row', on: { curve: id }, params: { size: 'ss12' } });
		s.doc.symmetry = false;
		edit(s, { op: 'curve.set', id, shape: { mod: 'wave', amp: 0.002, period: 0.01 } });
		edit(s, { op: 'stones.set', id: g, params: { size: 'ss20' } });
		expect(s.doc.stones.map((x) => x.pair)).toEqual([undefined, undefined]);
		expect(s.doc.stones.find((x) => x.id !== g).params.size).toBe('ss12');
	});

	it('a mirrored decal stays readable and moves as a pair', () => {
		const s = store();
		const id = s.exec({ op: 'decal.add', at: { p: [0.08, 1.1, 0.08] }, text: 'Ann', rotate: 20, mirror: 'both' });
		const [a, b] = s.doc.decals;
		expect(a.id).toBe(id); expect(b.pair).toBe(id); expect(b.text).toBe('Ann'); expect(b.rotate).toBe(-20);
		edit(s, { op: 'decal.set', id, rotate: 30 });
		expect(s.doc.decals[1].rotate).toBe(-30);
		edit(s, { op: 'decal.remove', id });
		expect(s.doc.decals).toHaveLength(0);
	});
});
