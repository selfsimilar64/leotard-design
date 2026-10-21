// Core commands: raw edits, document metadata, body, scene, and the first-generation garment.
import { defineCommand } from './store.js';
import { RIGS, MANNEQUIN_FINISHES, REALISTIC_SKIN, APPEARANCES } from '../render/presets.js';
import { FABRICS, SECOND } from '../materials/fabric.js';
import { PATTERNS, FINISHES } from '../stones/stones.js';
import { TRIMS } from '../garment/trim.js';
import { poseSpec, POSES, ARMS, DAZ_POSES } from '../body/pose.js';
import { bodyKeys, catalogue, HEADS } from '../body/mannequin.js';
import { GLARE } from '../render/glare.js';

const SIZES = ['child-6', 'child', 'teen', 'older-teen', 'petite', 'young', 'adult', 'broad'];

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
	get args() {
		return `{ appearance?: ${Object.keys(APPEARANCES).join('|')} (sets form, head and finish), size?: ${(bodyKeys.length ? bodyKeys : SIZES).join('|')}, form?: full|torso, head?: ${HEADS.join('|')}, finish? (body: a mannequin finish or '${REALISTIC_SKIN}'), headFinish? (the mannequin head's), expression?: ${(catalogue.expressions.map((e) => e.key).join('|')) || 'neutral|...'}, `
			+ `pose?: ${[...Object.keys(POSES), ...DAZ_POSES].join('|')} | { left, right } (arms: ${ARMS.join('|')}) }`;
	},
	run(tx, a) {
		// 'headless' (before head types) = the full body with no head
		if (a.form === 'headless') a = { ...a, form: 'full', head: a.head ?? 'none' };
		if (a.appearance !== undefined) { oneOf('appearance', a.appearance, Object.keys(APPEARANCES)); const { appearance, ...rest } = a; a = { ...rest, ...APPEARANCES[appearance] }; }
		setFields(tx, 'body', a, {
			size: (v) => oneOf('size', v, bodyKeys.length ? bodyKeys : SIZES),
			form: (v) => oneOf('form', v, ['full', 'torso']),
			head: (v) => oneOf('head', v, HEADS),
			expression: (v) => { if (catalogue.expressions.length) oneOf('expression', v, catalogue.expressions.map((e) => e.key)); },
			finish: (v) => oneOf('finish', v, [...Object.keys(MANNEQUIN_FINISHES), REALISTIC_SKIN]),
			headFinish: (v) => oneOf('headFinish', v, Object.keys(MANNEQUIN_FINISHES)),
			pose: (v) => { poseSpec(v); },
		});
	},
});

defineCommand('scene.set', {
	label: 'Change lighting', args: '{ rig?, exposure?, bloom?, envRotation?, rotateLights?, glare?: plain|star|star6|arena, glareSize?: 0.2-2.5, glareStrength?: 0-2, backdrop?: room|plain, backdropColour?, roomHeight?, roomSize? }',
	run(tx, a) {
		setFields(tx, 'scene', a, {
			rig: (v) => oneOf('rig', v, Object.keys(RIGS)),
			exposure: num('exposure', 0.05, 5), bloom: num('bloom', 0, 3), envRotation: num('envRotation', -100, 100),
			rotateLights: (v) => { if (typeof v !== 'boolean') throw new Error('rotateLights must be true or false'); },
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
