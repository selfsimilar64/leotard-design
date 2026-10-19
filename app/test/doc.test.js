import { describe, it, expect } from 'vitest';
import { DocumentStore, defineCommand } from '../src/doc/store.js';
import { newDocument } from '../src/doc/schema.js';
import { getAt, applyPrim } from '../src/doc/paths.js';

defineCommand('test.addCurve', {
	label: 'Add curve',
	run(tx, { points }) { const id = tx.newId('c'); tx.insert('curves', { id, role: 'seam', points }); return id; },
});
defineCommand('test.move', {
	label: 'Move point',
	run(tx, { curve, i, sp }) { tx.set(['curves', curve, 'points', String(i)], sp); },
});
defineCommand('test.fail', {
	label: 'Fails halfway',
	run(tx) { tx.set('meta/name', 'changed'); throw new Error('refused'); },
});

const fresh = () => new DocumentStore(newDocument('t'));

describe('paths', () => {
	it('resolves ids and indices', () => {
		const d = { curves: [{ id: 'c1', points: [10, 20] }, { id: 'c2', points: [] }] };
		expect(getAt(d, 'curves/c1/points/1')).toBe(20);
		expect(getAt(d, ['curves', 'c2'])).toEqual({ id: 'c2', points: [] });
		expect(getAt(d, 'curves/c9')).toBeUndefined();
	});
	it('every primitive has an exact inverse', () => {
		const d = { a: { b: 1 }, list: [{ id: 'x' }, { id: 'y' }] };
		const before = structuredClone(d);
		const prims = [
			{ op: 'set', path: 'a/b', value: 2 },
			{ op: 'set', path: 'a/c', value: { deep: [1] } },
			{ op: 'insert', path: 'list', item: { id: 'z' }, index: 1 },
			{ op: 'remove', path: 'list', key: 'x' },
			{ op: 'set', path: 'a/b', value: undefined },
		];
		const inv = prims.map((p) => applyPrim(d, p));
		expect(d).toEqual({ a: { c: { deep: [1] } }, list: [{ id: 'z' }, { id: 'y' }] });
		for (let i = inv.length - 1; i >= 0; i--) applyPrim(d, inv[i]);
		expect(d).toEqual(before);
	});
});

describe('store', () => {
	it('exec, undo, redo round-trip', () => {
		const s = fresh(), before = s.snapshot();
		const id = s.exec({ op: 'test.addCurve', points: [1, 2, 3] });
		expect(id).toBe('c1');
		s.exec({ op: 'test.move', curve: id, i: 1, sp: 9 });
		const after = s.snapshot();
		expect(s.undo()).toBe('Move point');
		expect(s.undo()).toBe('Add curve');
		expect(s.snapshot()).toEqual(before);
		s.redo(); s.redo();
		expect(s.snapshot()).toEqual(after);
	});
	it('a list of commands is one undo step', () => {
		const s = fresh(), before = s.snapshot();
		s.exec([{ op: 'test.addCurve', points: [1] }, { op: 'test.addCurve', points: [2] }]);
		expect(s.doc.curves.map((c) => c.id)).toEqual(['c1', 'c2']);
		s.undo();
		expect(s.snapshot()).toEqual(before);
	});
	it('a failing command changes nothing', () => {
		const s = fresh(), before = s.snapshot();
		expect(() => s.exec({ op: 'test.fail' })).toThrow('refused');
		expect(s.snapshot()).toEqual(before);
		expect(s.undoStack.length).toBe(0);
	});
	it('a gesture coalesces into one entry that undoes to the start', () => {
		const s = fresh();
		const id = s.exec({ op: 'test.addCurve', points: [0, 0] });
		const mid = s.snapshot();
		for (let k = 1; k <= 20; k++) s.exec({ op: 'test.move', curve: id, i: 0, sp: k, gesture: 'g1' });
		expect(s.undoStack.length).toBe(2);
		expect(s.doc.curves[0].points[0]).toBe(20);
		s.undo();
		expect(s.snapshot()).toEqual(mid);
		s.redo();
		expect(s.doc.curves[0].points[0]).toBe(20);
	});
	it('the id counter follows undo', () => {
		const s = fresh();
		s.exec({ op: 'test.addCurve', points: [] });
		s.undo();
		expect(s.exec({ op: 'test.addCurve', points: [] })).toBe('c1'); // the counter was undone with the curve
		expect(s.exec({ op: 'test.addCurve', points: [] })).toBe('c2');
	});
	it('unknown commands are refused with a hint', () => {
		expect(() => fresh().exec({ op: 'nope' })).toThrow(/app.commands/);
	});
	it('load replaces the document and clears history', () => {
		const s = fresh();
		s.exec({ op: 'test.addCurve', points: [] });
		const saved = JSON.parse(JSON.stringify(s.doc));
		const t = fresh();
		t.load(saved);
		expect(t.doc.curves.length).toBe(1);
		expect(t.undoStack.length).toBe(0);
	});
});
