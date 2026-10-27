// Material realism checks: one fabric on a plain tank, in the owner's comparison setup (White loft
// studio, room turned 160-180 degrees, arms outstretched, the headless mannequin), captured at three
// distances into captures/material-eval/<name>-<distance>.png for side-by-side checks against
// photos of the real fabric. Run from the app's console:
//   const m = await import('/src/dev/material-eval.js'); await m.shoot('matte', '#0f3b37', 'base');
// It replaces the open design. Distances: torso (the GK product-photo framing, ~1.25 m), near (a
// hand's width of the stomach, ~40 cm) and macro (~15 cm, where the knit is visible).
import { RIGS } from '../render/presets.js';

// The running app (instance.js sets window.app). Not imported: after a hot reload a console import
// of instance.js can resolve to a fresh module and build a second, engine-less App.
const app = new Proxy({}, { get: (_, k) => (typeof window.app[k] === 'function' ? window.app[k].bind(window.app) : window.app[k]) });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const SETUP = { rig: 'White loft studio', envRotation: 170 * Math.PI / 180, exposure: 1 }; // the panel shows degrees; the document keeps radians
export const BODY = { form: 'full', head: 'none', finish: 'Matte white fibreglass', size: 'young', pose: 'arms-outstretched' };

// Camera spots facing the torso (poses turn it, so the front is taken from the posed sternum, not
// the room), turned a little to the viewer's right as in the comparison photos.
function views() {
	const man = app.engine.body, R = man.ref, P = man.gPos ?? man.aPos.array, Nn = man.gNrm ?? man.aNrm.array;
	let s = -1;
	for (let i = 0; i < R.length / 3; i++) {
		if (Math.abs(R[i * 3]) > 0.012 || R[i * 3 + 1] < 1.05 || R[i * 3 + 1] > 1.12) continue;
		if (s < 0 || R[i * 3 + 2] > R[s * 3 + 2]) s = i;
	}
	const p = [P[s * 3], P[s * 3 + 1], P[s * 3 + 2]], h = Math.hypot(Nn[s * 3], Nn[s * 3 + 2]) || 1;
	const a = Math.atan2(Nn[s * 3] / h, Nn[s * 3 + 2] / h); // the chest's heading round the vertical
	const at = (dist, turn, dy, depth) => {
		const b = a + turn, t = [p[0] - Math.sin(a) * depth, p[1] + dy, p[2] - Math.cos(a) * depth];
		return { position: [t[0] + Math.sin(b) * dist, t[1] + 0.02, t[2] + Math.cos(b) * dist], target: t, fov: 30 };
	};
	return {
		full: { ...at(3.2, 0.2, -0.15, 0.1), size: [774, 940] }, // the whole figure, where sparkle should blend into a shimmer
		torso: { ...at(1.35, 0.2, 0.0, 0.1), size: [774, 940] },
		near: { ...at(0.45, 0.15, -0.08, 0.02), size: [900, 700] },
		macro: { ...at(0.17, 0.1, -0.1, 0), size: [900, 700] },
		micro: { ...at(0.06, 0.1, -0.1, 0), size: [900, 700] }, // the yarn itself, as a swatch photo shows it
	};
}

// colour: a hex colour, or panel fields, e.g. { colour, texture: 'TX-00001482', texMode: 'recolour' }
export async function prepare(fabric, colour) {
	const fields = typeof colour === 'string' ? { colour } : colour;
	app.exec({ op: 'body.set', ...BODY });
	await app.engine.figureReady;
	app.exec({ op: 'start.apply', key: 'plain-tank' });
	for (const p of app.doc.panels) app.exec({ op: 'panel.set', id: p.id, fabric, ombre: null, ...fields });
	const scan = fields.texture ?? (await appFabrics())[fabric]?.scan?.id; // its own or the fabric's default
	if (scan) await app.engine.textures.get(scan);
	app.exec({ op: 'scene.set', ...SETUP });
	await app.engine.figureReady;
	if (RIGS[SETUP.rig].hdri) await app.engine.viewport.hdri(RIGS[SETUP.rig].hdri); // light-only rigs have none
	await wait(1500);
}

// The FABRICS table the running app uses: after an edit, the app's copy of fabric.js carries a
// hot-reload timestamp, and a plain console import would load a separate copy.
async function appFabrics() {
	const url = performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /\/src\/materials\/fabric\.js/.test(n)).pop();
	return (await import(/* @vite-ignore */ url ?? '/src/materials/fabric.js')).FABRICS;
}

// tag: a label for this round (e.g. 'base', 'v2'); distances: a subset of torso | near | macro;
// tweak: fabric fields to try for this round only (e.g. { sheen: 0 }), put back afterwards;
// bloom: true keeps the scene's bloom (to show the view as the app draws it)
export async function shoot(fabric, colour, tag, distances = ['torso', 'near', 'macro'], tweak = null, bloom = false) {
	const F = await appFabrics(), saved = { ...F[fabric] };
	if (tweak) Object.assign(F[fabric], tweak);
	try { return await capture(fabric, colour, tag, distances, bloom); } finally { for (const k of Object.keys(F[fabric])) delete F[fabric][k]; Object.assign(F[fabric], saved); }
}

// Sparkle check: the same views with the lights turned round the figure by each of `turns` (degrees),
// written as <fabric>-<tag>-t<turn>-<distance>.png. Glints should come and go between turns; a
// pattern that stays put is a texture, not sparkle. HDRI rigs turn the room (envRotation) and swing
// the small glint light beside the camera round the figure (the loft's key glint sits behind the
// figure, so only that one can flash towards the camera); light-only rigs turn their light ring.
export async function sweep(fabric, colour, tag, turns = [0, 3, 6], distances = ['torso', 'near', 'macro'], tweak = null) {
	const F = await appFabrics(), saved = { ...F[fabric] };
	if (tweak) Object.assign(F[fabric], tweak);
	const vp = app.engine.viewport, out = [], place = vp.placeHdriLights, Y = { x: 0, y: 1, z: 0 };
	try {
		await prepare(fabric, colour);
		const env = vp.settings.envRotation, ring = vp.rig.rotation.y, a = Math.PI / 180;
		for (const t of turns) {
			if (vp.hdriOn) {
				vp.settings.envRotation = env + t * a;
				vp.placeHdriLights = function () { place.call(this); this.lights[1].position.applyAxisAngle(Y, t * a); }; // runs every frame
				vp.placeHdriLights(); // and now: a hidden pane runs no frames
			} else vp.rig.rotation.y = ring + t * a;
			out.push(...await shots(fabric, `${tag}-t${t}`, distances, false));
		}
		vp.settings.envRotation = env; vp.rig.rotation.y = ring;
	} finally {
		delete vp.placeHdriLights; // back to the prototype's
		for (const k of Object.keys(F[fabric])) delete F[fabric][k]; Object.assign(F[fabric], saved);
	}
	return out;
}

// Bloom is off in these captures: the loft HDRI's walls are bright enough that even its low setting
// lays a pale veil over dark fabric (a dark green lost a third of its saturation, 2026-10-24), and a
// product photo has none. Its strength is set each animation frame, so it is zeroed per render.
async function capture(fabric, colour, tag, distances, bloom) {
	await prepare(fabric, colour);
	return shots(fabric, tag, distances, bloom);
}

async function shots(fabric, tag, distances, bloom) {
	const vp = app.engine.viewport, cam = vp.getCamera(), V = views(), out = [];
	for (const d of distances) {
		const v = V[d];
		vp.setCamera({ position: v.position, target: v.target, fov: v.fov });
		await wait(800);
		const strength = vp.bloom.strength;
		vp.bloom.strength = bloom ? vp.settings.bloom * (vp.bloomK ?? 1) : 0;
		const blob = await app.withoutOverlay(() => vp.capture(v.size[0], v.size[1]));
		vp.bloom.strength = strength;
		const url = `/__fs/captures/material-eval/${fabric}-${tag}-${d}.png`;
		const r = await fetch(url, { method: 'POST', body: blob });
		if (!r.ok) throw new Error(`${url}: ${r.status}`);
		out.push(url);
	}
	vp.setCamera(cam);
	return out;
}
