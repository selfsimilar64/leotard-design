// The renderer baseline: a fixed set of captures and frame timings to compare one renderer against another (WebGL now,
// WebGPU later: knowledge/product/roadmap/webgpu-and-stone-engine-plan.md, Phase 0.2 and the Phase 1 gates). Written to
// captures/baseline-<tag>/<group>/<name>.png with captures/baseline-<tag>/manifest.json (settings, timings, machine).
// Run from the console of a test copy of the app, never in a tab someone is designing in (it opens designs and starting
// points, and the autosave follows):
//   const b = await import('/src/dev/baseline.js'); await b.all('webgl');          // or b.fabrics('webgl'), b.designs(...), ...
// Groups:
//   fabrics   every fabric in FABRICS on the plain tank, material-eval's comparison setup (dev/material-eval.js): torso,
//             near and macro, bloom off
//   designs   the starting points and the three Procedural Gem Test designs in their own body, pose and studio: front,
//             three-quarter and back of the whole figure; drawn and, for designs not already fitted, on the fitted
//             textbook leotard (re-fitted in their pose)
//   stones    stone families and coatings close up: one pattern group each on the plain tank's front
//   studios   every studio preset (RIGS), the torso at three-quarter in a shiny leotard
//   post      the post effects one at a time (MSAA 4x, skin, contact shadows, bloom, glare), then all, at one framing
// Each picture also times the 3D frame at 1792 x 1344 (frameTimes: Viewport.benchmark's 60 frames, and their GPU time from
// timer queries), unless the page is hidden (a hidden pane's timings are throttled: recorded as null).
import * as THREE from 'three';
import { RIGS } from '../render/presets.js';
import { framed } from '../render/pictures.js';
import { STARTS } from '../garment/starts.js';
import { prepare, views, SETUP } from './material-eval.js';

// The running app (instance.js sets window.app); not imported, as dev/material-eval.js explains.
const app = new Proxy({}, { get: (_, k) => (typeof window.app[k] === 'function' ? window.app[k].bind(window.app) : window.app[k]) });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const COLOUR = '#0f3b37';           // the fabrics' colour (the owner's comparison green)
export const BENCH = { frames: 60, width: 1792, height: 1344 };
export const GEM_TESTS = ['Procedural Gem Test 1', 'Procedural Gem Test 2', 'Procedural Gem Test 3'];
export const FITTED_KEY = 'armstrong-6';
// [shape, stone]: every render family (crystal, pearl, spangle, holo dot, nailhead) and coating (none, AB, shimmer,
// metallic, opal)
export const STONES = [['round', 'Crystal'], ['round', 'Crystal AB'], ['round', 'Sapphire Shimmer'], ['round', 'Jet Hematite'], ['round', 'Pacific Opal'],
	['navette', 'Siam AB'], ['pearl', 'White Opal'], ['spangle', 'Silver'], ['holo-dot', 'Crystal AB'], ['nailhead', 'Gold']];
// post effects off, then one at a time, then all (display settings: render/display.js; glare: scene.glare)
export const POST = [
	['none', {}], ['msaa4', { msaa: 4 }], ['skin', { skin: true }], ['ao', { ao: true }], ['bloom', { bloom: true }], ['glare', {}, 'star'],
	['all', { msaa: 4, skin: true, ao: true, bloom: true }, 'star'],
];

let run = null; // { tag, manifest }
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// The run's manifest: the one on disk for this tag if there is one (a group taken again replaces its own shots), else new.
async function begin(tag) {
	if (run?.tag === tag) return run;
	const old = await fetch(`/__fs/captures/baseline-${tag}/manifest.json`).then((r) => (r.ok ? r.json() : null), () => null);
	const gl = app.engine.viewport.renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
	run = { tag, manifest: {
		tag, at: new Date().toISOString(), three: THREE.REVISION, renderer: app.engine.viewport.renderer.constructor.name,
		gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
		devicePixelRatio: window.devicePixelRatio, display: { ...app.engine.viewport.display }, bench: BENCH, colour: COLOUR, shots: old?.shots ?? [],
	} };
	return run;
}

async function save() {
	const r = await fetch(`/__fs/captures/baseline-${run.tag}/manifest.json`, { method: 'POST', body: JSON.stringify(run.manifest, null, 1) });
	if (!r.ok) throw new Error('manifest: ' + r.status);
}

// Until the bodies, any HDRI, every piece's flat shape and (a fitted garment) its re-fit are in.
async function settle(ms = 1200) {
	const e = app.engine;
	await e.figureReady;
	const rig = RIGS[app.doc.scene.rig];
	if (rig?.hdri) await e.viewport.hdri(rig.hdri);
	await e.whenFlat();
	// stones are laid on the 3D view's ticks, which stop while the pane is hidden: lay them now (the ticks run only what is due)
	for (let k = 0; k < 3; k++) { for (const fn of e.viewport.onTick) fn(0); await wait(100); }
	if (app.doc.meta.fitted) { // the re-fit starts a moment after the change; the view holds its last frame meanwhile
		const t0 = performance.now(), state = () => e.fitted.status.state;
		while (state() !== 'fitting' && performance.now() - t0 < 2500) await wait(100);
		while ((state() === 'fitting' || e.viewport.holds.size) && performance.now() - t0 < 30000) await wait(200);
	}
	await wait(ms);
}

// The 3D frame at BENCH size. frameMs: Viewport.benchmark (each frame waited for by a one-pixel read, so GPU included; other
// tabs drawing on the same GPU move it a lot: 10-39 ms within one minute on 2026-11-04). gpuMs: the median GPU time of the
// same frames from timer queries (EXT_disjoint_timer_query_webgl2), the number to set against the WebGPU port's timestamp
// queries. Both null on a hidden page; gpuMs null without the timer or when the GPU reports a disjoint run.
async function frameTimes() {
	const vp = app.engine.viewport;
	if (document.hidden) return { frameMs: null, gpuMs: null };
	const gl = vp.renderer.getContext(), ext = gl.getExtension?.('EXT_disjoint_timer_query_webgl2'), qs = [];
	if (ext) vp.render = function () { // each frame of the benchmark in a query (an own property over the prototype's render)
		const q = gl.createQuery();
		gl.beginQuery(ext.TIME_ELAPSED_EXT, q); Object.getPrototypeOf(this).render.call(this); gl.endQuery(ext.TIME_ELAPSED_EXT);
		qs.push(q);
	};
	let frameMs;
	try { frameMs = vp.benchmark(BENCH.frames, { width: BENCH.width, height: BENCH.height }); } finally { delete vp.render; }
	let gpuMs = null;
	if (qs.length) {
		const t0 = performance.now(), ready = (q) => gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE);
		while (!ready(qs[qs.length - 1]) && performance.now() - t0 < 3000) await wait(16);
		const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
		const ts = qs.slice(qs.length / 2).filter(ready).map((q) => gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6).sort((a, b) => a - b); // after the warm-up half
		if (!disjoint && ts.length) gpuMs = ts[ts.length >> 1];
		for (const q of qs) gl.deleteQuery(q);
	}
	return { frameMs: +frameMs.toFixed(2), gpuMs: gpuMs === null ? null : +gpuMs.toFixed(2) };
}

// One picture: the camera at view, w x h, bloom as the scene has it unless noBloom; then the frame timing.
async function shot(group, name, view, [w, h], extra = {}, noBloom = false) {
	const vp = app.engine.viewport, cam = vp.getCamera();
	vp.setCamera(view);
	await wait(700);
	const strength = vp.bloom.strength;
	if (noBloom) vp.bloom.strength = 0;
	const blob = await app.withoutOverlay(() => vp.capture(w, h));
	const url = `/__fs/captures/baseline-${run.tag}/${group}/${name}.png`;
	const r = await fetch(url, { method: 'POST', body: blob });
	if (!r.ok) throw new Error(`${url}: ${r.status}`);
	const hidden = document.hidden, times = await frameTimes();
	vp.bloom.strength = strength;
	vp.setCamera(cam);
	const s = app.doc.scene, b = app.doc.body;
	run.manifest.shots = run.manifest.shots.filter((x) => x.file !== `${group}/${name}.png`);
	run.manifest.shots.push({ group, name, file: `${group}/${name}.png`, size: [w, h], camera: view, ...times, hidden,
		design: app.doc.meta.name ?? null, fitted: app.doc.meta.fitted ?? null, body: { size: b.size, pose: b.pose, finish: b.finish },
		scene: { rig: s.rig, envRotation: s.envRotation, exposure: s.exposure, bloom: noBloom ? 0 : s.bloom, glare: s.glare ?? 'plain' }, ...extra });
	return url;
}

// The whole figure from the front, three-quarter and back (world directions; a pose may turn the torso).
function figureViews() {
	const bb = app.engine.body.geometry.boundingBox;
	const c = [(bb.min.x + bb.max.x) / 2, (bb.min.y + bb.max.y) / 2, (bb.min.z + bb.max.z) / 2];
	const h = Math.max(bb.max.y - bb.min.y, bb.max.x - bb.min.x) * 1.06 + 0.1;
	return { front: framed(c, [0, 0.08, 1], h, 24), threequarter: framed(c, [0.72, 0.08, 0.7], h, 24), back: framed(c, [0, 0.08, -1], h, 24) };
}

async function designShots(name) {
	const V = figureViews();
	for (const [k, v] of Object.entries(V)) await shot('designs', `${slug(name)}-${app.doc.meta.fitted ? 'fitted' : 'drawn'}-${k}`, v, [900, 1200]);
}

export async function fabrics(tag = 'webgl', only = null) {
	await begin(tag);
	const url = performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /\/src\/materials\/fabric\.js/.test(n)).pop();
	const F = (await import(/* @vite-ignore */ url ?? '/src/materials/fabric.js')).FABRICS;
	for (const f of only ?? Object.keys(F)) {
		await prepare(f, COLOUR);
		const V = views();
		for (const d of ['torso', 'near', 'macro']) await shot('fabrics', `${f}-${d}`, V[d], V[d].size, { fabric: f, distance: d }, true);
	}
	await save();
}

export async function designs(tag = 'webgl', only = null) {
	await begin(tag);
	for (const st of STARTS) {
		if (only && !only.includes(st.key)) continue;
		app.new('Baseline');
		app.exec({ op: 'start.apply', key: st.key });
		await settle();
		await designShots('start-' + st.key);
		if (!app.doc.meta.fitted) { app.exec({ op: 'fitted.set', key: FITTED_KEY }); await settle(); await designShots('start-' + st.key); }
	}
	for (const name of GEM_TESTS) {
		if (only && !only.includes(name)) continue;
		await app.open(name);
		await settle(1800);
		await designShots(name);
		app.exec({ op: 'fitted.set', key: FITTED_KEY });
		await settle(1800);
		await designShots(name);
	}
	await save();
}

export async function stones(tag = 'webgl') {
	await begin(tag);
	for (const [shape, stone] of STONES) {
		await prepare('matte', '#2b2d42');
		for (const g of [...app.doc.stones]) app.exec({ op: 'stones.remove', id: g.id });
		const front = app.doc.panels.find((p) => /front/i.test(p.name ?? '')) ?? app.doc.panels[0];
		app.exec({ op: 'stones.add', kind: 'pattern', on: { panel: front.id }, stone, shape, params: { layout: 'hex', spacing: 0.011, size: 'ss16', x: 0, y: 0 } });
		await settle(1500);
		const V = views();
		for (const d of ['near', 'macro']) await shot('stones', `${shape}-${slug(stone)}-${d}`, V[d], V[d].size, { stone, shape, distance: d }, true);
	}
	await save();
}

export async function studios(tag = 'webgl', only = null) {
	await begin(tag);
	await prepare('shiny', '#1b3fb5');
	for (const rig of only ?? Object.keys(RIGS)) {
		app.exec({ op: 'scene.set', rig, envRotation: 0, backdrop: 'room' });
		await settle(1500);
		const V = views();
		await shot('studios', slug(rig), V.full, [900, 1100], { rig });
	}
	// back to the plain backdrop: a design saved without one keeps whatever the view last had (the room, after this group)
	app.exec({ op: 'scene.set', ...SETUP, backdrop: 'plain' });
	await save();
}

export async function post(tag = 'webgl') {
	await begin(tag);
	const vp = app.engine.viewport, saved = { ...vp.display };
	await prepare('mystique', '#1b3fb5');
	app.exec({ op: 'body.set', finish: 'Athlete skin, light' }); // the skin pass only shows on skin
	app.exec({ op: 'scene.set', bloom: 0.18 });
	await settle(1500);
	const off = { msaa: 0, skin: false, ao: false, bloom: false };
	try {
		for (const [name, on, glare] of POST) {
			vp.applyDisplay({ ...saved, ...off, ...on });
			app.exec({ op: 'scene.set', glare: glare ?? 'plain' });
			await wait(600);
			const V = views();
			await shot('post', name, V.torso, V.torso.size, { post: { ...off, ...on, glare: glare ?? 'plain' } });
		}
	} finally { vp.applyDisplay(saved); app.exec({ op: 'scene.set', glare: 'plain' }); }
	await save();
}

export async function all(tag = 'webgl') {
	run = null;
	await fetch(`/__fs/captures/baseline-${tag}/manifest.json`, { method: 'POST', body: JSON.stringify({ shots: [] }) }); // a fresh set
	await fabrics(tag); await stones(tag); await studios(tag); await post(tag); await designs(tag);
	return run.manifest.shots.length;
}
