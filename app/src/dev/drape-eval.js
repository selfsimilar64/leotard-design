// Fabric close-ups on a swirled piece of cloth, for comparing against swatch photos (fabric shops
// photograph a square of cloth twisted into a swirl from above). The cloth is drawn by the real
// fabric shader in the open viewport (its studio, glint lights, tone mapping; bloom off), with
// everything else in the scene hidden for the shot. Run from the app's console:
//   const d = await import('/src/dev/drape-eval.js');
//   await d.shoot('mystique', { colour: '#4a0f22', colour2: '#22c4c8' }, 'two-tone');
// writes captures/drape-eval/<fabric>-<tag>-<view>.png. Views: swatch (about 20 cm across, as the
// shop photos) and close (about 6 cm, where single dots show).
import * as THREE from 'three';
import { RIGS } from '../render/presets.js';
import { setFabricSlot } from '../materials/fabric-attributes.js';

const app = new Proxy({}, { get: (_, k) => (typeof window.app[k] === 'function' ? window.app[k].bind(window.app) : window.app[k]) });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const SETUP = { rig: 'White loft studio', envRotation: 170 * Math.PI / 180, exposure: 1 };

// Height of the cloth (metres) at (x, z) on the floor: folds spiralling out of a centre gathered
// up into a soft peak, fading towards the edges, plus a slow lean so the flat parts face many ways.
const R = 0.2;
function height(x, z) {
	const r = Math.hypot(x, z), th = Math.atan2(z, x);
	const swirl = 0.02 * Math.sin(6 * th + 34 * r) * (r / (r + 0.02)) * Math.exp(-r / 0.2);
	const folds = 0.008 * Math.sin(3 * th - 55 * r + 1.3) * (r / (r + 0.04));
	const peak = 0.03 * Math.exp(-(r * r) / 0.002);
	const lean = 0.012 * Math.sin(9 * x + 2) * Math.cos(7 * z - 1);
	return swirl + folds + peak + lean;
}

function drape(relief = 1) {
	const n = 360, pos = [], nrm = [], uv = [], tan = [], idx = [], e = 1e-4;
	for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
		const x = (i / n - 0.5) * 2 * R, z = (j / n - 0.5) * 2 * R;
		const dx = relief * (height(x + e, z) - height(x - e, z)) / (2 * e), dz = relief * (height(x, z + e) - height(x, z - e)) / (2 * e), L = Math.hypot(dx, 1, dz);
		pos.push(x, relief * height(x, z), z); nrm.push(-dx / L, 1 / L, -dz / L); uv.push(x, z);
		const T = Math.hypot(1, dx); tan.push(1 / T, dx / T, 0, 1); // along x: anisotropic fabrics need a tangent (they shaded black without one)
	}
	for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i; idx.push(a, a + n + 1, a + 1, a + 1, a + n + 1, a + n + 2); }
	const g = new THREE.BufferGeometry(), N = (n + 1) * (n + 1);
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
	g.setAttribute('aGNormal', new THREE.Float32BufferAttribute(nrm, 3));
	g.setAttribute('aUV', new THREE.Float32BufferAttribute(uv, 2));
	g.setAttribute('tangent', new THREE.Float32BufferAttribute(tan, 4));
	g.setAttribute('aRef', new THREE.Float32BufferAttribute(pos, 3));
	setFabricSlot(g, 'ao', 1); setFabricSlot(g, 'cover', 1); setFabricSlot(g, 'keep', 1);
	g.setIndex(idx);
	return g;
}

// The fabric shader as the app's own copy (after an edit, a console import of fabric.js is a
// separate module; see material-eval.js).
async function fabricModule() {
	const url = performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /\/src\/materials\/fabric\.js/.test(n)).pop();
	return import(/* @vite-ignore */ url ?? '/src/materials/fabric.js');
}

// face 'front': the cloth stands upright at chest height facing the room's front (+z), as a
// leotard's front does, and reflects what a garment would (the dimmer, camera side of the room);
// the camera looks at it a little from above. face 'up': laid flat on a table at waist height and
// seen from above, it mirrors the loft's bright ceiling: the high-key look of shop photos taken on
// a light table (the holographic foils).
const AT = [0, 1.1, 0];
const VIEWS = {
	swatch: { position: [0.02, 0.2, 0.47], fov: 26, size: [1000, 1000] },
	close: { position: [0.03, 0.06, 0.15], at: [0.03, 0, 0], fov: 26, size: [1000, 1000] },
	// face on, beside the gathered centre, at the scale of the shop close-up (about 12 px between dots);
	// use with a low relief so the folds do not stretch the cloth's flat-mapped pattern
	macro: { position: [-0.09, -0.07, 0.18], at: [-0.09, -0.07, 0], fov: 26, size: [1000, 1000] },
};
// a view's offsets from the cloth (x across, y up the cloth, z out of its face) placed in the room
function place(v, face) {
	const o = v.position, t = v.at ?? [0, 0, 0], h = AT[1] - 0.3;
	const at = face === 'up' ? (p) => [p[0], h + p[2], -p[1]] : (p) => [p[0] + AT[0], p[1] + AT[1], p[2] + AT[2]];
	return { position: at(o), target: at(t), fov: v.fov };
}

// colour: a hex colour or { colour, colour2, second }; tweak: fabric fields for this shot only
// relief: the folds' height (1 = the swirl; low for macro views: the pattern is mapped flat, so steep
// folds stretch it)
export async function shoot(fabric, colour, tag, views = ['swatch', 'close'], tweak = null, face = 'front', relief = 1) {
	const fm = await fabricModule(), F = fm.FABRICS, saved = { ...F[fabric] };
	if (tweak) Object.assign(F[fabric], tweak);
	const look = typeof colour === 'string' ? { colour } : colour;
	const vp = app.engine.viewport, hidden = [], out = [];
	app.exec({ op: 'scene.set', ...SETUP, backdrop: 'plain' });
	await vp.hdri(RIGS[SETUP.rig].hdri);
	await wait(500);
	const m = fm.createFabricMaterial(5);
	m.side = THREE.DoubleSide;
	m.userData.u.uOffset.value = 0; m.userData.u.uGarment.value = 0;
	fm.applyFabric(m, fabric, look.colour, look.second ?? 'Tone-on-tone', look.colour2 ?? null, fm.texScaleOf({ fabric }));
	m.userData.u.uUV.value = 1;
	const mesh = new THREE.Mesh(drape(relief), m);
	if (face === 'up') mesh.position.set(0, AT[1] - 0.3, 0); // flat, at table height
	else { mesh.rotation.x = Math.PI / 2; mesh.position.fromArray(AT); } // its up (+y) to the front (+z)
	vp.scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isLine) && o.visible) { hidden.push(o); o.visible = false; } });
	if (vp.hdriOn?.sky) vp.hdriOn.sky.visible = vp.settings.backdrop === 'room';
	vp.scene.add(mesh);
	const cam = vp.getCamera(), bloom = vp.bloom.strength;
	try {
		for (const v of views) {
			const s = VIEWS[v];
			vp.setCamera(place(s, face));
			await wait(600);
			vp.bloom.strength = 0;
			const blob = await app.withoutOverlay(() => vp.capture(s.size[0], s.size[1]));
			const url = `/__fs/captures/drape-eval/${fabric}-${tag}-${v}.png`;
			const r = await fetch(url, { method: 'POST', body: blob });
			if (!r.ok) throw new Error(`${url}: ${r.status}`);
			out.push(url);
		}
	} finally {
		vp.bloom.strength = bloom;
		vp.scene.remove(mesh); mesh.geometry.dispose(); m.dispose();
		for (const o of hidden) o.visible = true;
		vp.setCamera(cam);
		for (const k of Object.keys(F[fabric])) delete F[fabric][k]; Object.assign(F[fabric], saved);
	}
	return out;
}
