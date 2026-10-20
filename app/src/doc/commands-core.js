// Core commands: raw edits, document metadata, body, scene, and the POC-style looks.
import { defineCommand } from './store.js';
import { legacyFromLook } from '../garment/legacy.js';
import { LOOKS, RIGS, MANNEQUIN_FINISHES } from '../render/presets.js';
import { FABRICS, SECOND } from '../materials/fabric.js';
import { PATTERNS, FINISHES } from '../stones/stones.js';
import { TRIMS } from '../garment/trim.js';
import { poseSpec } from '../body/pose.js';
import { bodyKeys } from '../body/mannequin.js';
import { GLARE } from '../render/glare.js';

const SIZES = ['child', 'teen', 'young', 'adult'];

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
	label: 'Change body', args: '{ size?: child|teen|young|adult (plus daz-petite|daz-young|daz-adult|daz-broad when built), form?: full|headless|torso, finish?, pose?: a-pose|arms-down|hands-in-front|hands-on-hips|hands-on-thighs|left-hand-on-hip|right-hand-on-hip|left-arm-up|right-arm-up | { left, right } (arms: rest|down|front|thigh|hip|up) }',
	run(tx, a) {
		setFields(tx, 'body', a, {
			size: (v) => oneOf('size', v, bodyKeys.length ? bodyKeys : SIZES),
			form: (v) => oneOf('form', v, ['full', 'headless', 'torso']),
			finish: (v) => oneOf('finish', v, Object.keys(MANNEQUIN_FINISHES)),
			pose: (v) => { poseSpec(v); },
		});
	},
});

defineCommand('scene.set', {
	label: 'Change lighting', args: '{ rig?, exposure?, bloom?, envRotation?, rotateLights?, glare?: plain|star|star6|arena }',
	run(tx, a) {
		setFields(tx, 'scene', a, {
			rig: (v) => oneOf('rig', v, Object.keys(RIGS)),
			exposure: num('exposure', 0.05, 5), bloom: num('bloom', 0, 3), envRotation: num('envRotation', -100, 100),
			rotateLights: (v) => { if (typeof v !== 'boolean') throw new Error('rotateLights must be true or false'); },
			glare: (v) => oneOf('glare', v, Object.keys(GLARE)),
		});
	},
});

// --- POC looks (legacy garment) -----------------------------------------------------------------

defineCommand('legacy.look', {
	label: 'Apply POC look', args: `{ name: ${Object.keys(LOOKS).map((k) => JSON.stringify(k)).join(' | ')} }`,
	run(tx, { name }) { tx.set('legacy', legacyFromLook(name)); },
});
defineCommand('legacy.clear', {
	label: 'Remove POC garment',
	run(tx) { tx.set('legacy', null); },
});
defineCommand('legacy.set', {
	label: 'Edit POC garment', args: '{ sleeves?, back?, pattern?, finish?, zone?: body|accent|sleeve, fabric?, colour?, second?, trim?: {...} }',
	run(tx, a) {
		if (!tx.get('legacy')) throw new Error('This design has no POC garment (use legacy.look first)');
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
