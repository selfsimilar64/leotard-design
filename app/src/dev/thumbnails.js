// Renders the side panel's tile pictures (ui/Inspector.jsx) into public/thumbs/<group>/ and the
// designs' into designs/thumbs/, through the dev file bridge. Run from the app's console:
//   const t = await import('/src/dev/thumbnails.js'); await t.all();      // or t.designs(), t.bodies(), ...
// It changes the open design; the design open before is put back at the end. Groups:
//   appearance  realistic and mannequin, full length
//   bodies      every age and build (realistic), full length
//   poses       every pose (realistic, young adult), full length
//   expressions the realistic face in each expression, close up
//   environments every lighting rig / HDRI studio, with the starter design
//   blocks      every starting-shape option on the mannequin
//   materials   every app fabric (public/thumbs/materials) and scanned fabric (assets/textures/vmod/
//               thumbs/cloth: renders of licensed scans stay with them) on a twisted strip of cloth
//   designs     every design in designs/, as it is saved (its own lighting), in the realistic look
import { app } from '../instance.js';
import { STARTER } from '../app.js';
import { RIGS, APPEARANCES } from '../render/presets.js';
import { catalogue } from '../body/mannequin.js';
import { BLOCK_OPTIONS, DEFAULT_BLOCK } from '../garment/blocks.js';
import { thumbName } from '../ui/Inspector.jsx';
import { FABRICS } from '../materials/fabric.js';
import { baseFabricFor } from '../materials/textures.js';
import { clothThumb } from '../materials/swatches.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const put = (group, key, opts) => app.thumbnail(`/__fs/thumbs/${group}/${thumbName(key)}.jpg`, opts);
const REAL = { ...APPEARANCES.realistic, expression: 'neutral' };

// until the figure, its textures and any HDRI have arrived
async function settle(ms = 1200) {
	const e = app.engine;
	await e.figureReady;
	const r = RIGS[app.doc.scene.rig];
	if (r?.hdri) await e.viewport.hdri(r.hdri);
	await wait(ms);
}

// A full-length camera for the body on show (front, a little to the right).
function fullLength(turn = 0.18) {
	const e = app.engine, bb = e.body.geometry.boundingBox, b = e.body.body;
	const top = bb.max.y + 0.03, bottom = Math.min(bb.min.y, 0) - 0.02, cy = (top + bottom) / 2;
	const cx = b.daz ? (bb.min.x + bb.max.x) / 2 : 0, cz = b.daz ? (bb.min.z + bb.max.z) / 2 : 0;
	const fov = 30, aspect = 240 / 300, span = Math.max(top - bottom, (bb.max.x - bb.min.x + 0.1) / aspect);
	const d = span / 2 / Math.tan((fov / 2) * Math.PI / 180) * 0.98;
	return { position: [cx + Math.sin(turn) * d, cy + 0.05, cz + Math.cos(turn) * d], target: [cx, cy, cz], fov };
}

async function prepare(body, scene = { rig: 'White seamless (photo studio)', envRotation: 0, exposure: 1 }) {
	await app.open(STARTER, body);
	app.exec({ op: 'scene.set', ...scene });
	await settle();
}

export async function appearance() {
	for (const k of Object.keys(APPEARANCES)) {
		await prepare({ ...REAL, ...APPEARANCES[k], size: 'young', pose: 'a-pose' });
		await put('appearance', k, { view: fullLength() });
	}
}

export async function bodies() {
	for (const b of catalogue.bodies) {
		await prepare({ ...REAL, size: b.key, pose: 'arms-down' });
		await put('bodies', b.key, { view: fullLength() });
	}
}

export async function poses() {
	const keys = catalogue.poses.map((p) => p.key); // the picker's: the A-pose and the Daz poses
	for (const k of keys) {
		await prepare({ ...REAL, size: 'young', pose: k });
		await put('poses', k, { view: fullLength(0.3) });
	}
}

export async function expressions() {
	for (const x of catalogue.expressions) {
		await prepare({ ...REAL, size: 'young', pose: 'a-pose', expression: x.key });
		await wait(600);
		const eyes = app.engine.figure.eyes(), c = eyes ? eyes.l.clone().add(eyes.r).multiplyScalar(0.5) : null;
		const t = c ? [c.x, c.y - 0.035, c.z] : [0, 1.5, 0];
		await put('expressions', x.key, { width: 192, height: 192, view: { position: [t[0] + 0.05, t[1] + 0.01, t[2] + 0.55], target: t, fov: 22 } });
	}
}

export async function environments() {
	for (const k of Object.keys(RIGS)) {
		await prepare({ ...REAL, size: 'young', pose: 'arms-down' }, { rig: k, envRotation: 0, exposure: 1 });
		await wait(800);
		await put('environments', k, { view: fullLength(0.35) });
	}
}

export async function blocks() {
	app.new('Blocks');
	app.exec({ op: 'body.set', ...APPEARANCES.mannequin, size: 'young', pose: 'arms-down' });
	app.exec({ op: 'scene.set', rig: 'White seamless (photo studio)', envRotation: 0, exposure: 1 });
	await settle();
	const e = app.engine, lm = e.body.body.landmarks;
	for (const [group, opts] of Object.entries(BLOCK_OPTIONS)) {
		for (const o of opts) {
			app.exec({ op: 'block.apply', ...DEFAULT_BLOCK, [group]: o });
			await wait(500);
			// the torso, from the back for the back's shapes, legs to mid-thigh for the leg cuts
			const back = group === 'back', cy = group === 'leg' ? lm.pelvis[1] - 0.02 : lm.chest[1] - 0.02, d = group === 'leg' ? 1.25 : 1.15;
			const side = group === 'sleeves' || group === 'armhole' ? 0.45 : 0.12;
			await put('blocks', group + '-' + o, { width: 192, height: 192, view: { position: [Math.sin(side) * d * (back ? -1 : 1), cy + 0.08, Math.cos(side) * d * (back ? -1 : 1)], target: [0, cy, 0], fov: 30 } });
		}
	}
}

// The colour each app fabric's tile shows it in (a fabric takes any colour; these show it well):
// [colour, second, colour2 (lace: the motifs')].
export const MATERIAL_COLOURS = {
	matte: ['#1b3fb5'], shiny: ['#b3122e'], wet: ['#0c0c10'], mystique: ['#5b2a86'], hologram: ['#16205c', 'Silver'],
	shattered: ['#c8ccd8'], foil: ['#e6bf58'], glitter: ['#ff4f8b'], hologlitter: ['#c8ccd8'], velvet: ['#6b0f22'],
	crushed: ['#0b7d55'], pearl: ['#f4f4f2'], mesh: ['#0c0c10'], glittermesh: ['#f6b6c8'], ombre: ['#ff4f8b'],
	ombremystique: ['#5b2a86'], liquidholo: ['#e8e6f0'], oilslick: ['#16205c'], duochrome: ['#0b7d7a'], chrome: ['#c8ccd8'],
	glitterfoil: ['#e6bf58'], lace: ['#16205c', 'Tone-on-tone', '#c9b8ee'], illusion: ['#d2a48a'],
};
const putCanvas = async (url, cv) => {
	const r = await fetch(url, { method: 'PUT', body: await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.9)) });
	if (!r.ok) throw new Error(`${url}: ${r.status}`);
};

export async function materials() {
	app.exec({ op: 'scene.set', rig: 'White seamless (photo studio)', envRotation: 0, exposure: 1 });
	await settle(300);
	const e = app.engine, renderer = e.viewport.renderer, env = e.viewport.scene.environment;
	for (const k of Object.keys(FABRICS)) {
		if (k === 'checker') continue;
		const [colour, second, colour2] = MATERIAL_COLOURS[k] ?? ['#888888'];
		await putCanvas(`/__fs/thumbs/materials/${thumbName(k)}.jpg`, clothThumb(renderer, env, { fabric: k, colour, second, colour2 }));
	}
	for (const f of await e.textures.list()) {
		const set = await e.textures.get(f.id);
		await putCanvas(`/__fs/scanthumbs/${f.id}.jpg`, clothThumb(renderer, env, { fabric: baseFabricFor(f), colour: '#ffffff', texture: set, texMode: 'original' }));
	}
}

export async function designs() {
	const files = await app.designs();
	for (const f of files) {
		await app.open(f, REAL);
		await settle(1500);
		await app.thumbnail(`/__fs/designs/thumbs/${encodeURIComponent(f)}.jpg`, { view: 'front' });
	}
}

export async function all() {
	const keep = app.json(), file = app.file;
	try {
		for (const fn of [appearance, bodies, poses, expressions, environments, blocks, materials, designs]) { console.log('thumbnails:', fn.name); await fn(); }
	} finally {
		app.load(keep); app.file = file;
	}
}
