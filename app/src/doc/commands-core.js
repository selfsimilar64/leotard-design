// Core commands: raw edits, document metadata, body, scene, and the first-generation garment.
import { defineCommand } from './store.js';
import { RIGS, MANNEQUIN_FINISHES, REALISTIC_SKIN } from '../render/presets.js';
import { FABRICS, SECOND } from '../materials/fabric.js';
import { PATTERNS, FINISHES } from '../stones/stones.js';
import { TRIMS } from '../garment/trim.js';
import { poseSpec, POSES, ARMS, DAZ_POSES } from '../body/pose.js';
import { bodyKeys } from '../body/mannequin.js';
import { GLARE } from '../render/glare.js';

const SIZES = ['child-6', 'child', 'teen', 'older-teen', 'young', 'adult'];

function oneOf(name, v, list) {
	if (!list.includes(v)) throw new Error(`${name} must be one of: ${list.join(', ')} (got ${JSON.stringify(v)})`);
}
// Set each given key of `args` under `base`, checking it against `allowed` (key -> check fn).
function setFields(tx, base, args, allowed) {
	let n = 0;
	for (const [k, check] of Object.entries(allowed)) {
		if (args[k] === undefined) continue;
		check?.(args[k]);
		tx.set([base, k], args[k]);
		n++;
	}
	if (!n) throw new Error(`Nothing to set. Fields: ${Object.keys(allowed).join(', ')}`);
}
const num = (name, lo, hi) => (v) => { if (typeof v !== 'number' || v < lo || v > hi) throw new Error(`${name} must be a number from ${lo} to ${hi}`); };

defineCommand('doc.set', {
	label: 'Edit', args: '{ path, value }',
	run(tx, { path, value }) { tx.set(path, value); },
});
defineCommand('doc.insert', {
	label: 'Add', args: '{ path, item, index? }',
	run(tx, { path, item, index }) { tx.insert(path, item, index); },
});
defineCommand('doc.remove', {
	label: 'Delete', args: '{ path, key }',
	run(tx, { path, key }) { tx.remove(path, key); },
});

defineCommand('meta.set', {
	label: 'Rename design', args: '{ name?, author?, notes? }',
	run(tx, a) { setFields(tx, 'meta', a, { name: null, author: null, notes: null }); },
});

defineCommand('body.set', {
	label: 'Change body',
	// The body is always the headless mannequin (owner, 2026-10-29): no realistic person, no head,
	// so no appearance, head, expression or hair to set (doc/migrate-g9.js opens older designs so).
	get args() {
		return `{ size?: ${(bodyKeys.length ? bodyKeys : SIZES).join('|')}, form?: full|torso, finish? (a mannequin finish: ${[...Object.keys(MANNEQUIN_FINISHES), REALISTIC_SKIN].join(', ')}), colour?: '#rrggbb' | null (the mannequin finish's colour; null: the finish's own), `
			+ `pose?: ${[...Object.keys(POSES), ...DAZ_POSES].join('|')} | { left, right } (arms: ${ARMS.join('|')}) }`;
	},
	run(tx, a) {
		// 'headless' (before head types) = the full body with no head
		if (a.form === 'headless') a = { ...a, form: 'full' };
		for (const k of ['appearance', 'head', 'headFinish', 'expression', 'hair', 'mannequinHair']) if (a[k] !== undefined) throw new Error(`body.set: ${k} is no longer offered (the body is always the headless mannequin)`);
		setFields(tx, 'body', a, {
			size: (v) => oneOf('size', v, bodyKeys.length ? bodyKeys : SIZES),
			form: (v) => oneOf('form', v, ['full', 'torso']),
			// or the realistic skin (render/figure.js part 'body', no head; brought back 2026-11-11 to judge the soft body against)
			finish: (v) => oneOf('finish', v, [...Object.keys(MANNEQUIN_FINISHES), REALISTIC_SKIN]),
			colour: (v) => { if (v !== null && !/^#[0-9a-f]{6}$/i.test(v)) throw new Error('colour must be a colour like #e9e7e2, or null'); },
			pose: (v) => { poseSpec(v); },
		});
		// the body's finish is the cut caps' and the (unused) head's too
		if (a.finish !== undefined) tx.set('body/headFinish', a.finish);
	},
});

defineCommand('scene.set', {
	label: 'Change lighting', args: '{ rig?, exposure?, bloom?, envRotation?, glare?: plain|star|star6|arena, glareSize?: 0.2-2.5, glareStrength?: 0-2, backdrop?: room|plain, backdropColour?, roomHeight?, roomSize? }',
	run(tx, a) {
		setFields(tx, 'scene', a, {
			rig: (v) => oneOf('rig', v, Object.keys(RIGS)),
			exposure: num('exposure', 0.05, 5), bloom: num('bloom', 0, 3), envRotation: num('envRotation', -100, 100),
			glare: (v) => oneOf('glare', v, Object.keys(GLARE)),
			glareSize: num('glareSize', 0.2, 2.5), glareStrength: num('glareStrength', 0, 2),
			backdrop: (v) => oneOf('backdrop', v, ['plain', 'room']),
			backdropColour: (v) => { if (!/^#[0-9a-f]{6}$/i.test(v)) throw new Error('backdropColour must be a colour like #d9d8d4'); },
			roomHeight: num('roomHeight', 0.3, 6), roomSize: num('roomSize', 3, 35),
		});
	},
});

// --- first-generation garment (legacy section of older design files) ---------------------------

defineCommand('legacy.clear', {
	label: 'Remove garment',
	run(tx) { tx.set('legacy', null); },
});
defineCommand('legacy.set', {
	label: 'Edit garment', args: '{ sleeves?, back?, pattern?, finish?, zone?: body|accent|sleeve, fabric?, colour?, second?, trim?: {...} }',
	run(tx, a) {
		if (!tx.get('legacy')) throw new Error('This design has no first-generation garment');
		if (a.sleeves !== undefined) { oneOf('sleeves', a.sleeves, ['long', 'tank']); tx.set('legacy/sleeves', a.sleeves); }
		if (a.back !== undefined) { oneOf('back', a.back, ['scoop', 'keyhole', 'strappy']); tx.set('legacy/back', a.back); }
		if (a.pattern !== undefined) { oneOf('pattern', a.pattern, Object.keys(PATTERNS)); tx.set('legacy/pattern', a.pattern); }
		if (a.finish !== undefined) { oneOf('finish', a.finish, Object.keys(FINISHES)); tx.set('legacy/finish', a.finish); }
		if (a.zone !== undefined) {
			oneOf('zone', a.zone, ['body', 'accent', 'sleeve']);
			if (a.fabric !== undefined) { oneOf('fabric', a.fabric, Object.keys(FABRICS)); tx.set(['legacy', 'zones', a.zone, 'fabric'], a.fabric); }
			if (a.colour !== undefined) tx.set(['legacy', 'zones', a.zone, 'colour'], a.colour);
			if (a.second !== undefined) { oneOf('second', a.second, SECOND); tx.set(['legacy', 'zones', a.zone, 'second'], a.second); }
		}
		if (a.trim) {
			if (a.trim.finish !== undefined) oneOf('trim.finish', a.trim.finish, Object.keys(TRIMS));
			for (const k of ['finish', 'fabric', 'colour', 'second']) if (a.trim[k] !== undefined) tx.set(['legacy', 'trim', k], a.trim[k]);
		}
	},
});
