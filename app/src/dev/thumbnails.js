// Renders the interface's tile pictures into public/thumbs/<group>/ and the designs' into
// designs/thumbs/, through the dev file bridge. Run from the app's console in a tab nobody is
// designing in (each group opens its own design, and the autosave follows it; port 5176 keeps its
// own autosave):
//   const t = await import('/src/dev/thumbnails.js'); await t.all();      // or t.designs(), t.blocks(), ...
// Every picture shows designs on one body: the headless mannequin in matte white plastic in the
// mannequin stance, lit by the white loft studio over a plain backdrop the colour of the panel's
// tiles (render/pictures.js PICTURE_SCENE, shared with app.save). Each is a close-up of what it shows:
//   designs, starts  front and back side by side (a landscape diptych, 720 x 450), from the
//                    neckline to just under the crotch
//   blocks           every shape option, close up on its element (square); the leg cuts at
//                    three-quarter, from under the crotch to over the hip
//   materials        every app fabric and scanned fabric filling the frame: a sheet pinched and
//                    twisted, seen from above, lit like a product photo (materials/swatches.js
//                    swirlThumb; scans' renders stay with the licensed scans in
//                    assets/textures/vmod/thumbs/cloth)
//   bodies           every age and build, the whole figure, all at one scale (square)
//   poses            every pose, the whole figure (square)
//   environments     every studio: the torso in a shiny leotard, the studio's room behind (square)
//   mannequin        every mannequin finish: the shoulder, neck and upper arm close up (square)
import { RIGS, MANNEQUIN, MANNEQUIN_MATERIALS, SCENE } from '../render/presets.js';
import { PICTURE_SCENE, framed, shot as shotOf, putJpeg, diptych, lightsTurned } from '../render/pictures.js';
import { catalogue } from '../body/mannequin.js';
import { BLOCK_OPTIONS } from '../garment/blocks.js';
import { STARTS } from '../garment/starts.js';
import { thumbName } from '../ui/kit.jsx';
import { FABRIC_KEYS } from '../ui/FabricTab.jsx';
import { baseFabricFor } from '../materials/textures.js';
import { swirlThumb } from '../materials/swatches.js';
import { studioEnvironment, PRODUCT_ROOM } from '../render/studio.js';

// The running app (instance.js sets window.app). Not imported: after a hot reload a console import
// of instance.js can resolve to a fresh module and build a second, engine-less App.
const app = new Proxy({}, { get: (_, k) => (typeof window.app[k] === 'function' ? window.app[k].bind(window.app) : window.app[k]) });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const STUDIO = PICTURE_SCENE;
const BODY = { size: 'young', form: MANNEQUIN.form, finish: MANNEQUIN.finish, colour: null, pose: 'a-pose' };
// the leotard the figure pictures wear: the plain tank in one royal blue
const PLAIN = { neck: 'crew', back: 'crew', sleeves: 'tank', strap: 'tank', leg: 'high', yoke: 'none', waist: 'none', armhole: 'set-in', fabric: 'matte', colour: '#1b3fb5' };

// the view's own lens again after a group (the pictures use their own)
const lens = () => app.engine.viewport.setCamera({ fov: SCENE.camera.fov });

// until the bodies' files, any HDRI and every piece's pattern have arrived
async function settle(ms = 900) {
	const e = app.engine;
	await e.figureReady;
	const r = RIGS[app.doc.scene.rig];
	if (r?.hdri) await e.viewport.hdri(r.hdri);
	await e.whenFlat();
	await wait(ms);
}
function setStage(body = {}, scene = {}) {
	app.exec([{ op: 'body.set', ...BODY, ...body }, { op: 'scene.set', ...STUDIO, ...scene }]);
}
function plainTank(extra = {}) {
	app.new('Thumbnails');
	app.exec({ op: 'block.apply', ...PLAIN, ...extra });
}

const shot = (view, w, h) => shotOf(app, view, w, h), put = putJpeg;
const tile = (group, key) => `/__fs/thumbs/${group}/${thumbName(key)}.jpg`;
// a garment-surface landmark on the body as shown, [x, y, z]
const L = (k) => app.store.ctx.landmarkPos(k);

// --- designs and starting points: front and back --------------------------------------------------

// the leotard on show, front and back (render/pictures.js diptych): url gets a 720 x 450 JPEG
const diptychTo = async (url) => putJpeg(url, await diptych(app));

export async function designs(only = null) {
	for (const f of only ?? await app.designs()) {
		await app.open(f);
		setStage();
		await settle(1400);
		await diptychTo(`/__fs/designs/thumbs/${encodeURIComponent(f)}.jpg`);
	}
	lens();
}

export async function starts(only = null) {
	app.new('Thumbnails');
	setStage();
	for (const st of STARTS) {
		if (only && !only.includes(st.key)) continue;
		app.exec({ op: 'start.apply', key: st.key });
		await settle(1100);
		await diptychTo(tile('starts', st.key));
	}
	lens();
}

// --- shape elements: each a close-up of its element ---------------------------------------------------

const VIEWS = {
	neck: () => { const c = L('cf-neck'); return framed([0, c[1] - 0.06, c[2] - 0.035], [0, 0.34, 1], 0.3); },
	back: () => { const c = L('cb-neck'); return framed([0, c[1] - 0.17, c[2] + 0.03], [0, 0.16, -1], 0.42); },
	sleeves: () => { const s = L('shoulder-l'); return framed([s[0] + 0.035, s[1] - 0.21, s[2] + 0.02], [0.95, 0.1, 0.7], 0.6); },
	armhole: () => { const s = L('shoulder-l'); return framed([s[0] - 0.02, s[1] - 0.06, s[2] + 0.02], [0.72, 0.28, 0.9], 0.3); },
	strap: () => { const s = L('shoulder-l'); return framed([0, s[1] - 0.035, 0.0], [0, 0.42, 1], 0.36); },
	// from just under the crotch to just over the hip bone, at three-quarter
	leg: () => { const hp = L('hip-l'), c = app.engine.body.crotch, bottom = c.y - 0.06, top = hp[1] + 0.14; return framed([hp[0] * 0.45, (top + bottom) / 2, 0.035], [0.82, 0.05, 0.62], top - bottom); },
	yoke: () => { const b = L('bust-l'); return framed([0, b[1] + 0.06, 0.03], [0, 0.18, 1], 0.32); },
	waist: () => { const n = L('navel'); return framed([0, n[1] + 0.025, n[2] - 0.05], [0, 0.1, 1], 0.38); },
};

export async function blocks(only = null) { // only: tile names to render ('strap-thin', ...), else all
	plainTank();
	setStage();
	await settle();
	for (const [group, opts] of Object.entries(BLOCK_OPTIONS)) {
		for (const o of opts) {
			if (o === 'wide' || (only && !only.includes(group + '-' + o))) continue; // the tank before straps has no tile
			// the plain tank in one colour, so each tile shows only its own element; armholes on long sleeves
			app.exec({ op: 'block.apply', ...PLAIN, ...(group === 'armhole' ? { sleeves: 'long' } : {}), [group]: o });
			if (group === 'yoke' && o !== 'none') { const y = app.doc.panels.find((p) => p.block === 'yoke'); if (y) app.exec({ op: 'panel.set', id: y.id, fabric: 'mesh', sheer: 0.35 }); }
			if (group === 'waist' && o !== 'none') { const l = app.doc.panels.find((p) => p.block === 'lower'); if (l) app.exec({ op: 'panel.set', id: l.id, fabric: 'wet', colour: '#16205c' }); }
			await settle(500);
			// a back from behind, lit from behind
			const pic = () => shot(VIEWS[group](), 320, 320);
			await put(tile('blocks', group + '-' + o), await (group === 'back' ? lightsTurned(app, Math.PI, pic) : pic()));
		}
	}
	lens();
}

// --- the figure: age and build, poses, finishes ------------------------------------------------------------

export async function bodies() {
	plainTank();
	// one scale for every body (the tallest fills the tile), so heights compare
	let tallest = 0;
	for (const b of catalogue.bodies) tallest = Math.max(tallest, app.engine.body.bodies[b.key]?.stature ?? 1.7);
	const h = tallest + 0.12;
	for (const b of catalogue.bodies) {
		setStage({ size: b.key });
		await settle(1000);
		await put(tile('bodies', b.key), await shot(framed([0, h / 2 - 0.03, 0], [0.22, 0.04, 1], h, 22), 320, 320));
	}
	setStage(); lens();
}

export async function poses(only = null) {
	plainTank();
	for (const p of catalogue.poses) {
		if (only && !only.includes(p.key)) continue;
		setStage({ pose: p.key });
		await settle(1200);
		const bb = app.engine.body.geometry.boundingBox;
		const c = [(bb.min.x + bb.max.x) / 2, (bb.min.y + bb.max.y) / 2, (bb.min.z + bb.max.z) / 2];
		const h = Math.max(bb.max.y - bb.min.y, bb.max.x - bb.min.x, bb.max.z - bb.min.z) * 1.08 + 0.12;
		await put(tile('poses', p.key), await shot(framed(c, [0.42, 0.1, 1], h, 22), 320, 320));
	}
	setStage(); lens();
}

export async function mannequin() {
	plainTank();
	for (const [k] of MANNEQUIN_MATERIALS) {
		setStage({ finish: k });
		await settle(700);
		// the bare shoulder and upper arm beside the strap: the finish itself, a little leotard for scale
		const s = L('shoulder-l');
		await put(tile('mannequin', k), await shot(framed([s[0] + 0.035, s[1] - 0.09, s[2] + 0.03], [0.85, 0.25, 1], 0.2), 240, 240));
	}
	setStage(); lens();
}

export async function environments(only = null) { // only: rig names to render, else all
	plainTank({ fabric: 'shiny', colour: '#1b3fb5' });
	for (const k of only ?? Object.keys(RIGS)) {
		setStage({}, { rig: k, backdrop: 'room' });
		await settle(1200);
		const man = app.engine.body, top = man.body.landmarks.neck_base[1] + 0.12, bottom = man.crotch.y - 0.12;
		await put(tile('environments', k), await shot(framed([0, (top + bottom) / 2, 0], [0.5, 0.06, 1], (top - bottom) * 1.05, 28), 320, 320));
	}
	setStage(); lens();
}

// --- materials: the sheet pinched and twisted ----------------------------------------------------------------

// The colour each app fabric's tile shows it in (a fabric takes any colour; these show it well):
// [colour, second, colour2 (Duotone satin: its cross threads)], and how much larger than life its
// texture is drawn so its structure reads at tile size.
export const MATERIAL_COLOURS = {
	matte: ['#1b3fb5'], shiny: ['#b3122e'], wet: ['#0c0c10'], satin: ['#1a2350'], satinduo: ['#5b2a86', 'Tone-on-tone', '#0b7d7a'], mystique: ['#5b2a86'], opalmystique: ['#f2f0f4', 'White'], hologram: ['#16205c', 'Silver'],
	foil: ['#e6bf58'], glitter: ['#ff4f8b'], hologlitter: ['#c8ccd8'], velvet: ['#6b0f22'],
	crushed: ['#0b7d55'], pearl: ['#f4f4f2'], mesh: ['#0c0c10'], glittermesh: ['#0c0c10', 'Silver'], ombre: ['#ff4f8b'],
	ombremystique: ['#5b2a86'], liquidholo: ['#e8e6f0'], oilslick: ['#16205c'], duochrome: ['#0b7d7a'], chrome: ['#c8ccd8'],
	glitterfoil: ['#e6bf58'], illusion: ['#d2a48a'],
};
const ZOOM = { mesh: 2, illusion: 2, glittermesh: 1.6, glitter: 1.5, hologlitter: 1.5, glitterfoil: 1.4, mystique: 1.4, opalmystique: 1.4, hologram: 1.4, matte: 1.6, shiny: 1.4, crushed: 1.2 };

// Lit as a product photo: the softbox studio's reflection room (render/studio.js PRODUCT_ROOM: dim walls round
// bright softboxes), so glossy fabric shows bright streaks against dark ones, as in a shop's photo.
// Mirror-like fabrics need a busy room to mirror instead: the white loft's photograph (ROOM).
let softboxEnv = null;
const ROOM = { chrome: 3.2, oilslick: 3.2, liquidholo: 3.2, pearl: 3.2 };
export async function materials(only = null, { envTurn = 0.6 } = {}) { // only: fabric keys to render ('mystique', ...), else all and the scans
	const e = app.engine, vp = e.viewport, renderer = vp.renderer;
	softboxEnv ??= vp.pmrem.fromScene(studioEnvironment(PRODUCT_ROOM), 0.01).texture;
	const loft = (await vp.hdri(RIGS['White loft studio'].hdri)).env;
	for (const k of only ?? FABRIC_KEYS) { // the fabrics the material grid offers
		const [colour, second, colour2] = MATERIAL_COLOURS[k] ?? ['#888888'];
		const room = k in ROOM;
		await put(`/__fs/thumbs/materials/${thumbName(k)}.jpg`, await swirlThumb(renderer, room ? loft : softboxEnv, { fabric: k, colour, second, colour2 }, { zoom: ZOOM[k] ?? 1, envTurn: room ? ROOM[k] : envTurn }));
	}
	if (only) return;
	for (const f of await e.textures.list()) {
		const set = await e.textures.get(f.id);
		await put(`/__fs/scanthumbs/${f.id}.jpg`, await swirlThumb(renderer, softboxEnv, { fabric: baseFabricFor(f), colour: '#ffffff', texture: set, texMode: 'original' }, { zoom: 1.3, envTurn }));
	}
}

// Every group; the design open before is put back at the end, and the camera's lens.
export async function all() {
	const keep = app.json(), file = app.file, cam = app.engine.viewport.getCamera();
	try {
		for (const fn of [blocks, starts, materials, bodies, poses, mannequin, environments, designs]) { console.log('thumbnails:', fn.name); await fn(); }
	} finally {
		app.load(keep); app.file = file;
		app.engine.viewport.setCamera(cam);
	}
}
