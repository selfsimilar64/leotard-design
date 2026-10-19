// Decal commands: logos and lettering placed on the garment (render/decals.js draws them).
import { defineCommand } from './store.js';
import { resolvePoint } from '../curves/points.js';
import { toSP } from '../body/surface.js';
import { DECAL_LOOKS } from '../render/decals.js';

const FIELDS = ['text', 'font', 'weight', 'src', 'size', 'aspect', 'rotate', 'colour', 'look', 'rough', 'layer', 'name', 'hidden'];

function check(a, doc) {
	if (a.look && !(a.look in DECAL_LOOKS)) throw new Error('look must be one of: ' + Object.keys(DECAL_LOOKS).join(', '));
	if (a.layer && !doc.layers.some((l) => l.id === a.layer)) throw new Error('No layer ' + a.layer);
	if (a.size !== undefined && !(a.size > 0.005 && a.size < 0.6)) throw new Error('size is the width in metres (0.005 to 0.6)');
}

defineCommand('decal.add', {
	label: 'Add logo, lettering or stamp', args: '{ at: point spec, text? (\\n for lines) | src? (image URL), font?, weight?, size?: width m (0.08), aspect? (stamps: height / width), rotate?: degrees, colour?, look?: print|foil|holo|glitter|flock | gather|ruche|twist (surface stamps: folds, no art), rough?, layer?, name? }',
	run(tx, a) {
		if (!a.at) throw new Error('decal.add needs at: a point on the body');
		const stamp = ['gather', 'ruche', 'twist'].includes(a.look);
		if (!a.text && !a.src && !stamp) throw new Error('decal.add needs text or src (or a stamp look: gather, ruche, twist)');
		check(a, tx.doc);
		const id = tx.newId('d');
		const d = { id, at: { sp: toSP(resolvePoint(a.at, tx.ctx)) }, size: 0.08, rotate: 0, colour: '#ffffff', look: 'print', layer: 'L0' };
		for (const k of FIELDS) if (a[k] !== undefined) d[k] = a[k];
		tx.insert('decals', d);
		return id;
	},
});

defineCommand('decal.set', {
	label: 'Change logo or lettering', args: '{ id, at?, text?, src?, font?, weight?, size?, rotate?, colour?, look?, rough?, layer?, name?, hidden? }',
	run(tx, a) {
		if (!tx.doc.decals.some((d) => d.id === a.id)) throw new Error('No decal ' + a.id);
		check(a, tx.doc);
		if (a.at) tx.set(['decals', a.id, 'at'], { sp: toSP(resolvePoint(a.at, tx.ctx)) });
		for (const k of FIELDS) if (a[k] !== undefined) tx.set(['decals', a.id, k], a[k]);
	},
});

defineCommand('decal.remove', {
	label: 'Remove logo or lettering', args: '{ id }',
	run(tx, a) {
		if (!tx.doc.decals.some((d) => d.id === a.id)) throw new Error('No decal ' + a.id);
		tx.remove('decals', a.id);
	},
});
