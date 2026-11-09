// The shader tour: every option a designer can reach that could ask for a shader variant, stepped through on real designs,
// listing each step that compiled a program the start had not (knowledge/engineering/app/startup-and-slow-changes.md). The
// start's warm-up (render/warmup.js) is its twin: when the tour finds a step that compiles, the warm-up is missing a case.
// Run in the test tab only (port 5176: it opens designs and changes them):
//   const T = await import('/src/dev/shader-tour.js'); window.__tour = T.shaderTour(); then read window.__tourLog
// -> { steps, compiled: [[step, n]], total }. Each step: the change, then frames until nothing is held (prepare compiles what
// is shown), then the programs three holds that it did not before.
import { FABRICS } from '../materials/fabric.js';
import { RIGS, MANNEQUIN_MATERIALS } from '../render/presets.js';
import { FITTED } from '../garment/fitted.js';

const state = async () => {
	const u = performance.getEntriesByType('resource').map((r) => r.name).find((n) => /ui\/state\.js/.test(n));
	return import(u.replace(location.origin, ''));
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CUTS = ['round', 'rivoli', 'oval', 'navette', 'pear', 'drop', 'heart', 'square', 'baguette', 'triangle', 'star', 'pearl', 'spangle', 'holo-dot', 'nailhead'];
const LOOKS = ['print', 'foil', 'holo', 'glitter', 'flock', 'gather', 'ruche', 'twist'];
const GLARES = ['plain', 'star', 'star6', 'arena'];

export async function shaderTour({ designs = ['b6-six-strap-fan', 'b12-lace-over-hologram'], quick = false } = {}) {
	const app = window.app, e = app.engine, v = e.viewport, r = v.renderer, S = await state();
	const log = window.__tourLog = { steps: 0, compiled: [], total: 0, done: false, at: '' };
	const known = new Set(r.info.programs);
	// a frame of the page's own (a hidden pane draws none), until nothing is held: what is shown is compiled
	const settle = async () => {
		for (let i = 0; i < 4; i++) { v.frame(); await sleep(30); }
		await e.settled(60000);
		for (let i = 0; i < 3; i++) { v.frame(); await sleep(30); }
		v.render();
	};
	const step = async (label, fn) => {
		log.at = label;
		try { await fn(); } catch (err) { log.compiled.push([label, 'error: ' + err.message]); return; }
		await settle();
		const fresh = r.info.programs.filter((p) => !known.has(p));
		for (const p of fresh) known.add(p);
		log.steps++;
		if (fresh.length) { log.compiled.push([label, fresh.length]); log.total += fresh.length; }
	};
	const run = (cmd) => app.exec(cmd);
	const display = () => v.display;
	const setDisplay = (patch) => v.applyDisplay({ ...display(), ...patch });

	for (const name of designs) {
		await step(`open ${name}`, () => app.open(name));
		const doc = () => app.doc;
		for (const f of Object.keys(FABRICS)) {
			if (f === 'checker') continue;
			await step(`${name}: every material ${f}`, () => run(doc().materials.map((m) => ({ op: 'material.set', id: m.id, fabric: f }))));
			if (quick) break;
		}
		await step(`${name}: reopened`, () => app.open(name));
		const pat = doc().stones.find((g) => g.kind === 'pattern') ?? doc().stones[0];
		if (pat) for (const c of CUTS) await step(`${name}: stones ${c}`, () => run({ op: 'stones.set', id: pat.id, shape: c }));
		if (pat) for (const st of ['Gold', 'Crystal AB', 'Jet']) await step(`${name}: stone ${st}`, () => run({ op: 'stones.set', id: pat.id, stone: st }));
		const dec = doc().decals[0];
		if (dec) for (const l of LOOKS) await step(`${name}: lettering ${l}`, () => run({ op: 'decal.set', id: dec.id, look: l }));
		if (pat) await step(`${name}: pattern chosen (handles)`, async () => { S.selection.value = { kind: 'stones', id: pat.id }; });
		const line = doc().curves[0];
		if (line) await step(`${name}: line chosen`, async () => { S.selection.value = { kind: 'curves', id: line.id }; });
		await step(`${name}: nothing chosen`, async () => { S.selection.value = null; });
	}
	for (const rig of Object.keys(RIGS)) {
		await step(`studio ${rig}`, async () => { run({ op: 'scene.set', rig }); await v.envReady; });
		if (RIGS[rig].hdri && !quick) await step(`studio ${rig}, room backdrop`, async () => { run({ op: 'scene.set', backdrop: 'room' }); });
		await step(`studio ${rig}, plain backdrop`, async () => { run({ op: 'scene.set', backdrop: 'plain' }); });
		for (const shadows of ['off', 'soft', 'sharp']) await step(`studio ${rig}, shadows ${shadows}`, () => setDisplay({ shadows }));
		if (quick) break;
	}
	for (const g of GLARES) await step(`glare ${g}`, () => run({ op: 'scene.set', glare: g }));
	for (const k of ['bloom', 'ao', 'skin']) { await step(`${k} off`, () => setDisplay({ [k]: false })); await step(`${k} on`, () => setDisplay({ [k]: true })); }
	for (const [finish] of MANNEQUIN_MATERIALS) await step(`mannequin ${finish}`, () => run({ op: 'body.set', finish }));
	await step('mannequin hidden', async () => { S.hideMannequin.value = true; });
	await step('mannequin shown', async () => { S.hideMannequin.value = false; });
	await step('pose stag-jump', () => run({ op: 'body.set', pose: 'stag-jump' }));
	await step('body child', () => run({ op: 'body.set', size: 'child' }));
	for (const f of FITTED) {
		await step(`fitted ${f.key}`, () => run({ op: 'fitted.set', key: f.key }));
		if (quick) break;
	}
	await step('fitted: every material shiny', () => run(app.doc.materials.map((m) => ({ op: 'material.set', id: m.id, fabric: 'shiny' }))));
	await step('drawn again', () => run({ op: 'fitted.set', key: null }));
	log.done = true; log.at = '';
	return log;
}
