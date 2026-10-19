// The application object: document store + engine + persistence, and the scripting surface
// exposed as window.app. Everything a designer can do in the UI is a command here, so a script or
// an agent drives the app with exactly the designer's tools:
//   app.exec({ op: 'body.set', size: 'teen' })     run a command (or a list, as one undo step)
//   app.undo() / app.redo()
//   app.doc                                         the design (read it; change it only by exec)
//   app.commands()                                  every command with its arguments
//   app.save(name) / app.open(name) / app.new()     designs/<name>.json (dev server)
//   app.capture(name, { view })                     captures/<name>.png
//   app.view(name | { position, target, fov })      named cameras: front, back, left, right, three-quarter
//   app.benchmark()                                 true GPU cost of a frame, ms
import * as THREE from 'three';
import { DocumentStore, commandList } from './doc/store.js';
import { newDocument } from './doc/schema.js';
import './doc/commands-core.js';
import './doc/commands-garment.js';
import './doc/commands-reference.js';
import './doc/commands-stones.js';
import './doc/commands-decals.js';
import { surfaceLandmarks } from './body/landmarks.js';
import { resolvePoint } from './curves/points.js';
import { defineCommand } from './doc/store.js';
import { legacyFromLook } from './garment/legacy.js';
import { buildGarment, inheritPanels, evaluateAll } from './garment/build.js';
import { showCells } from './render/debug.js';
import { patternPieces } from './garment/pattern.js';
import { patternPDF } from './export/pdf.js';
import { FABRICS } from './materials/fabric.js';
import { swatch } from './materials/swatches.js';

// Ends a drag: touches the curves so the garment is re-cut and new cells get their panels, inside
// the drag's own history entry.
defineCommand('garment.settle', { label: 'Re-cut', run(tx) { tx.touched.add('curves'); } });

const AUTOSAVE = 'leotard.autosave.v1';

export const VIEWS = {
	front: { dir: [0, 0, 1] }, back: { dir: [0, 0, -1] }, left: { dir: [1, 0, 0] }, right: { dir: [-1, 0, 0] },
	'three-quarter': { dir: [0.55, 0.1, 0.83] }, 'back-three-quarter': { dir: [-0.55, 0.1, -0.83] },
};

export function defaultDocument() {
	const d = newDocument('Ruby mystique');
	d.legacy = legacyFromLook('Ruby mystique');
	return d;
}

export class App {
	constructor() {
		let store;
		try { store = new DocumentStore(loadAutosave() ?? defaultDocument()); } catch { store = new DocumentStore(defaultDocument()); }
		this.store = store;
		this.listeners = new Set();
		this.store.onChange((touched, why) => {
			this.engine?.sync(this.doc, touched, why);
			this.scheduleAutosave();
			for (const fn of this.listeners) fn(touched, why);
		});
	}

	attach(engine) {
		this.engine = engine;
		engine.app = this;
		const app = this, landmarks = surfaceLandmarks(engine.body, engine.surf);
		this.store.ctx = {
			man: engine.body, surf: engine.surf, landmarks,
			garment: (layer = 'L0') => engine.layers.get(layer)?.g ?? engine.g,
			get evaluated() { return engine.evaluated; },
			get doc() { return app.doc; },
			// on the body as shown (size, pose, lift): what a photo's camera sees
			// photo rays: the first hit on the torso or legs, unless the point is meant for an arm
			// (the mannequin's arms can stand where the photographed arms are not)
			pickRay: (ray, part = 'torso') => {
				const pk = engine.pick;
				if (!pk) return null;
				if (part === 'any') return pk.raycast(ray);
				const hits = pk.bvh.raycast(ray, 2).sort((a, b) => a.distance - b.distance), man = engine.body, idx = man.idx;
				const armOf = (f) => (man.wArm[idx[f * 3]] + man.wArm[idx[f * 3 + 1]] + man.wArm[idx[f * 3 + 2]]) / 3;
				const hit = hits.find((h) => (part === 'arm' ? armOf(h.faceIndex) > 0.5 : armOf(h.faceIndex) < 0.5)) ?? hits[0];
				if (!hit) return null;
				const out = pk.baryOf(hit.faceIndex, hit.point, {});
				const s = Math.max(out.b0, 0) + Math.max(out.b1, 0) + Math.max(out.b2, 0) || 1;
				return { f: out.f, b0: Math.max(out.b0, 0) / s, b1: Math.max(out.b1, 0) / s, b2: Math.max(out.b2, 0) / s };
			},
			landmarkPos: (lm) => engine.pick.pos(landmarks[lm]).toArray(),
			bodyKey: () => engine.bodyKey,
			stonesOf: (gen) => engine.stoneRun.stones.filter((s) => s.gen === gen),
		};
		this.store.hooks.push((tx, touched) => this.inheritHook(tx, touched));
		engine.viewport.onResize.add((w, h) => engine.overlay.setResolution(w, h));
		engine.overlay.setResolution(engine.viewport.container.clientWidth, engine.viewport.container.clientHeight);
		engine.sync(this.doc, new Set(Object.keys(this.doc)), 'load');
		engine.frameCamera(this.doc.body.form);
	}

	// When lines change, cells cut from a panel become panels of their own (same fabric), in the
	// same undo step. Skipped mid-drag; the drag's settle command runs it once at the end.
	inheritHook(tx, touched) {
		const e = this.engine;
		if (!e || !touched.has('curves') || tx.doc.legacy || this._inGesture) return;
		const evaluated = evaluateAll(tx.doc, e.surf, null, e.evaluated);
		for (const layer of tx.doc.layers) {
			const prev = e.layers.get(layer.id)?.g;
			if (!prev) continue;
			const g = buildGarment(tx.doc, e.surf, { prev, layer: layer.id, evaluated });
			const add = inheritPanels(g, prev, tx.doc, e.surf);
			for (const p of add) tx.insert('panels', { id: tx.newId('p'), layer: layer.id, name: p.name ?? '', seed: p.seed, mirror: p.mirror, stack: p.stack });
			if (layer.id === 'L0') e.pending = g; // same curves: the engine re-locates the seeds on this arrangement
		}
	}

	get doc() { return this.store.doc; }
	get revision() { return this.store.revision; }
	onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

	exec(cmd, opts) {
		const first = Array.isArray(cmd) ? cmd[0] : cmd;
		this._inGesture = !!first?.gesture;
		if (first?.gesture) this._gesture = first.gesture;
		try { return this.store.exec(cmd, opts); } finally { this._inGesture = false; }
	}
	undo() { return this.store.undo(); }
	redo() { return this.store.redo(); }
	endGesture() {
		const g = this._gesture;
		this._gesture = null;
		const top = this.store.undoStack[this.store.undoStack.length - 1];
		if (g && top?.gesture === g && top.touched.includes('curves')) this.store.exec({ op: 'garment.settle', gesture: g }, { settle: true });
		this.store.endGesture();
	}
	commands() { return commandList(); }
	history() { return { undo: this.store.undoStack.map((e) => e.label), redo: this.store.redoStack.map((e) => e.label).reverse() }; }

	new(name = 'Untitled') { this.store.load(newDocument(name)); }
	load(doc) { this.store.load(typeof doc === 'string' ? JSON.parse(doc) : doc); }
	json() { return JSON.stringify(this.doc, null, 1); }

	async save(name = this.doc.meta.name || 'design') {
		const file = safeName(name) + '.json';
		const r = await fetch('/__fs/designs/' + file, { method: 'PUT', body: this.json() }).catch(() => null);
		if (!r || !r.ok) { download(file, new Blob([this.json()], { type: 'application/json' })); return 'downloaded ' + file; }
		return 'designs/' + file;
	}
	async open(name) {
		const r = await fetch('/__fs/designs/' + safeName(name) + '.json');
		if (!r.ok) throw new Error(`No saved design "${name}"`);
		this.load(await r.json());
		this.engine?.frameCamera(this.doc.body.form);
		return this.doc.meta.name;
	}
	async designs() { const r = await fetch('/__fs/designs/'); return r.ok ? (await r.json()).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)) : []; }

	scheduleAutosave() {
		clearTimeout(this._autosave);
		this._autosave = setTimeout(() => { try { localStorage.setItem(AUTOSAVE, JSON.stringify(this.doc)); } catch { /* storage full or blocked: the design is still in memory */ } }, 400);
	}

	// --- view, capture, measurement -----------------------------------------------------------

	view(v) {
		const vp = this.engine.viewport;
		if (typeof v === 'string') {
			const preset = VIEWS[v];
			if (!preset) throw new Error(`Views: ${Object.keys(VIEWS).join(', ')}`);
			const t = vp.controls.target, d = vp.camera.position.distanceTo(t), [x, y, z] = preset.dir, l = Math.hypot(x, y, z);
			vp.setCamera({ position: [t.x + x / l * d, t.y + y / l * d, t.z + z / l * d] });
		} else vp.setCamera(v);
		return vp.getCamera();
	}

	// opts: { view, width, height, overlay: true to keep the editing lines }
	async capture(name, opts = {}) {
		if (opts.view) this.view(opts.view);
		const blob = await this.withoutOverlay(() => this.engine.viewport.capture(opts.width ?? 1600, opts.height ?? 1200), opts.overlay);
		const file = safeName(name) + '.png';
		const r = await fetch('/__fs/captures/' + file, { method: 'POST', body: blob }).catch(() => null);
		if (!r || !r.ok) { download(file, blob); return 'downloaded ' + file; }
		return 'captures/' + file;
	}

	// Contact sheet of fabric swatches (every fabric, or `fabrics`) in one colour: captures/<name>.png
	async swatchSheet(name = 'swatches', { colour = '#2a6fd6', second = 'Tone-on-tone', colour2 = null, fabrics = Object.keys(FABRICS), cols = 6 } = {}) {
		const P = 96, rows = Math.ceil(fabrics.length / cols), cv = document.createElement('canvas');
		cv.width = cols * (P + 8) + 8; cv.height = rows * (P + 24) + 8;
		const x = cv.getContext('2d');
		x.fillStyle = '#1b1b1f'; x.fillRect(0, 0, cv.width, cv.height);
		x.font = '10px sans-serif'; x.fillStyle = '#ddd';
		for (let i = 0; i < fabrics.length; i++) {
			const [url] = swatch(this.engine.viewport, { fabric: fabrics[i], colour, second, colour2 });
			const img = await loadImage(url), cx = 8 + (i % cols) * (P + 8), cy = 8 + Math.floor(i / cols) * (P + 24);
			x.drawImage(img, cx, cy);
			x.fillText(FABRICS[fabrics[i]].label.slice(0, 18), cx, cy + P + 13);
		}
		const blob = await new Promise((r) => cv.toBlob(r, 'image/png')), file = safeName(name) + '.png';
		const r = await fetch('/__fs/captures/' + file, { method: 'POST', body: blob }).catch(() => null);
		return r?.ok ? 'captures/' + file : 'failed';
	}

	// A photo (or a crop of it) beside a render from a chosen view, same height: captures/<name>.png.
	// No camera solve needed: for judging fabrics and colour, not alignment (use compare for that).
	async sideBySide(name, { src, crop = null, view = null, height = 1200 } = {}) {
		const photo = await loadImage(src), c = crop ?? [0, 0, photo.naturalWidth, photo.naturalHeight];
		const pw = c[2] - c[0], ph = c[3] - c[1], w = Math.round(height * pw / ph);
		if (view) this.view(view);
		const blob = await this.withoutOverlay(() => this.engine.viewport.capture(w, height));
		const render = await loadImage(URL.createObjectURL(blob)), cv = document.createElement('canvas');
		cv.width = w * 2; cv.height = height;
		const x = cv.getContext('2d');
		x.drawImage(photo, c[0], c[1], pw, ph, 0, 0, w, height);
		x.drawImage(render, w, 0, w, height);
		const out = await new Promise((res) => cv.toBlob(res, 'image/png')), file = safeName(name) + '.png';
		await fetch('/__fs/captures/' + file, { method: 'POST', body: out });
		return 'captures/' + file;
	}

	// Run fn with the editing overlay (lines, control points) hidden, unless keep.
	async withoutOverlay(fn, keep = false) {
		const o = this.engine.overlay, was = o.group.visible;
		if (!keep) o.group.visible = false;
		try { return await fn(); } finally { o.group.visible = was; }
	}

	// Pattern pieces of the current garment (mm), once every piece is flattened.
	async pattern(opts) {
		await this.engine.whenFlat();
		return patternPieces(this.engine.views, this.doc, opts);
	}
	// Printable full-scale PDF of the pattern: exports/<name>.pdf (dev server) or a download.
	async exportPattern(name = (this.doc.meta.name || 'design') + ' pattern') {
		const pdf = patternPDF(await this.pattern(), { name: this.doc.meta.name });
		const blob = pdf.output('blob'), file = safeName(name) + '.pdf';
		const r = await fetch('/__fs/exports/' + file, { method: 'POST', body: blob }).catch(() => null);
		if (!r || !r.ok) { download(file, blob); return 'downloaded ' + file; }
		return 'exports/' + file;
	}

	// --- reference photos -------------------------------------------------------------------------

	// Add a photo (reads its size): src is a url such as /moodboard/<file>.
	async addReference(src, opts = {}) {
		const img = await loadImage(src);
		return this.exec({ op: 'reference.add', src, size: [img.naturalWidth, img.naturalHeight], ...opts });
	}
	landmarks() { return Object.keys(this.store.ctx.landmarks); }

	// Where a point spec falls on a line (or its mirror image): { curve, t, mirror? } ready to use
	// as an attachment ({ on: ... }) so a new line ends exactly on it. distance in metres.
	nearestOn(curveId, spec) {
		const ctx = this.store.ctx, sp = resolvePoint(spec, ctx), p = ctx.surf.pos(sp);
		let best = null;
		for (const [key, mirror] of [[curveId, false], [curveId + '~m', true]]) {
			const e = this.engine.evaluated?.get(key);
			if (!e) continue;
			e.pts.forEach((q, i) => { const d = q.distanceTo(p); if (!best || d < best.distance) best = { curve: curveId, t: e.s[i] / Math.max(e.s[e.s.length - 1], 1e-9), ...(mirror ? { mirror: true } : {}), distance: d }; });
		}
		if (!best) throw new Error('No line ' + curveId);
		return best;
	}
	curveByName(name) { return this.doc.curves.find((c) => c.name === name)?.id ?? null; }
	// Look through a solved reference photo (or leave it with null): mode over|under|off, opacity 0..1.
	lookThrough(id, { opacity, mode = 'over' } = {}) {
		const vp = this.engine.viewport;
		if (!id) { vp.setPhoto(null); this.looking = null; return; }
		const r = this.doc.reference.find((x) => x.id === id);
		if (!r?.camera) throw new Error('Solve the camera of ' + id + ' first');
		vp.setPhoto({ url: r.src, size: r.size, cam: r.camera, opacity: opacity ?? r.opacity ?? 0.5, mode });
		this.lookOpts = { opacity, mode };
		this.looking = id;
	}
	// Side-by-side sheet at the photo's camera: photo | render | 50% blend -> captures/<name>.png
	async compare(id, name = 'compare-' + id, { blend = 0.5 } = {}) {
		const r = this.doc.reference.find((x) => x.id === id);
		if (!r?.camera) throw new Error('Solve the camera of ' + id + ' first');
		const was = this.looking, wasOpts = this.lookOpts;
		this.lookThrough(id, { mode: 'off' });
		const cr = r.camera.crop ?? [0, 0, r.size[0], r.size[1]], w = cr[2] - cr[0], h = cr[3] - cr[1];
		const blob = await this.withoutOverlay(() => this.engine.viewport.capture(w, h));
		if (was) this.lookThrough(was, wasOpts); else this.lookThrough(null);
		const [photo, render] = await Promise.all([loadImage(r.src), loadImage(URL.createObjectURL(blob))]);
		const c = document.createElement('canvas');
		c.width = w * 3; c.height = h;
		const x = c.getContext('2d');
		x.drawImage(photo, cr[0], cr[1], w, h, 0, 0, w, h); x.drawImage(render, w, 0, w, h);
		x.drawImage(render, 2 * w, 0, w, h); x.globalAlpha = blend; x.drawImage(photo, cr[0], cr[1], w, h, 2 * w, 0, w, h); x.globalAlpha = 1;
		const out = await new Promise((res) => c.toBlob(res, 'image/png'));
		const file = safeName(name) + '.png';
		await fetch('/__fs/captures/' + file, { method: 'POST', body: out });
		return 'captures/' + file;
	}

	// Colour of a reference photo around pixel px (median of a (2r+1)-pixel square), '#rrggbb'.
	async pickColour(id, px, r = 4) {
		const R = this.doc.reference.find((x) => x.id === id);
		if (!R) throw new Error('No reference photo ' + id);
		return '#' + srgbColour(median(await photoPatch(R.src, px, r))).getHexString();
	}

	// Give a panel the colour that renders like the photo at px under the current rig, seen through
	// the photo's solved camera. Per channel (linear light) the render is close to a straight line
	// in the panel's colour, render = k * colour + b (b: highlights and sparkle that do not follow
	// the colour), so two renders fit it and a third checks; one more step refines. If the panel is
	// not what the camera sees there, its colour is left as it was and `note` says so. If the colour would have to be
	// brighter than white (or darker than black), it is clamped and `note` says to change the
	// lights or exposure instead. One undo step.
	async matchColour({ panel, ref, px, layer = 0, r = 4, iterations = 3 }) {
		const R = this.doc.reference.find((x) => x.id === ref);
		if (!R?.camera) throw new Error('Solve the camera of ' + ref + ' first');
		if (!this.doc.panels.some((p) => p.id === panel)) throw new Error('No panel ' + panel);
		const target = srgbColour(median(await photoPatch(R.src, px, r)));
		const crop = R.camera.crop ?? [0, 0, ...R.size], w = crop[2] - crop[0], h = crop[3] - crop[1];
		const was = this.looking, wasOpts = this.lookOpts, overlay = this.engine.overlay, ov = overlay.group?.visible ?? true;
		const gesture = 'match-colour-' + Date.now();
		const set = (c) => this.exec({ op: 'panel.set', id: panel, layer, colour: '#' + c.getHexString(), gesture });
		const render = () => srgbColour(median(this.engine.viewport.samplePatch(px[0] - crop[0], px[1] - crop[1], w, h, r)));
		this.lookThrough(ref, { mode: 'off' });
		overlay.setVisible(false);
		const P = this.doc.panels.find((p) => p.id === panel), original = P.stack?.[layer]?.colour ?? '#888888';
		let c = target.clone(), seen = null, note = null;
		const K = ['r', 'g', 'b'];
		try {
			// fit render = k * colour + b from two renders, per channel
			let c0 = c.clone().multiplyScalar(0.5);
			set(c); let r1 = render();
			set(c0); let r0 = render();
			const sum = (x) => x.r + x.g + x.b;
			const follows = sum(r1) - sum(r0) > 0.1 * sum(r1) && sum(r1) > 1e-4;
			if (follows) for (let i = 0; i < Math.max(1, iterations - 1); i++) {
				const next = c.clone();
				for (const k of K) {
					const kk = (r1[k] - r0[k]) / Math.max(c[k] - c0[k], 1e-6), b = r1[k] - kk * c[k];
					let v = kk > 1e-5 ? (target[k] - b) / kk : c[k];
					if (v > 1) { note = 'The lights are too dark for this colour: even white renders darker than the photo. Pick a brighter light rig or raise the exposure, then match again.'; v = 1; }
					if (v < 0.0005) { note = 'The lights are too bright for this colour: even black renders lighter than the photo. Pick a darker rig or lower the exposure, then match again.'; v = 0.0005; }
					next[k] = v;
				}
				c0 = c; r0 = r1; c = next;
				set(c); r1 = render();
			}
			seen = follows ? r1 : null;
			if (follows) set(c);
			else {
				c = new THREE.Color(original);
				set(c);
				note = 'That spot of the photo does not show this panel (or something covers it there): click inside the panel, away from stones and straps.';
			}
		} finally {
			overlay.setVisible(ov);
			if (was) this.lookThrough(was, wasOpts); else this.lookThrough(null);
			this.endGesture();
		}
		return { colour: '#' + c.getHexString(), photo: '#' + target.getHexString(), rendered: seen ? '#' + seen.getHexString() : null, ...(note ? { note } : {}) };
	}

	get debug() { return { cells: (on = true) => showCells(this.engine, on) }; }

	// ms per frame; { width, height } for a fixed size (gates: 1792x1344)
	benchmark(n = 60, size = null) { return +this.engine.viewport.benchmark(n, size).toFixed(2); }
	stats() { return { ...this.engine.viewport.stats, ...this.engine.timing, legacy: this.engine.legacy.timing }; }
	// stone counts by size (mm) and colour, and generator problems
	stoneStats() { return { ...this.engine.stoneView.stats(), dropped: this.engine.stoneRun.dropped, errors: this.engine.stoneRun.errors }; }
}

function loadAutosave() {
	try { const s = localStorage.getItem(AUTOSAVE); return s ? JSON.parse(s) : null; } catch { return null; }
}
const safeName = (n) => String(n).replace(/[^\w\- .]+/g, '_').trim() || 'design';
function download(file, blob) {
	const a = document.createElement('a');
	a.href = URL.createObjectURL(blob); a.download = file; a.click();
	setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Pixels of a photo around px: Uint8ClampedArray RGBA of the (2r+1)-pixel square.
const photoCanvases = new Map();
async function photoPatch(src, px, r) {
	let cv = photoCanvases.get(src);
	if (!cv) {
		const img = await loadImage(src);
		cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
		cv.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0);
		photoCanvases.set(src, cv);
	}
	return cv.getContext('2d', { willReadFrequently: true }).getImageData(Math.round(px[0]) - r, Math.round(px[1]) - r, 2 * r + 1, 2 * r + 1).data;
}
// Per-channel median of RGBA bytes (sparkle and stones in the patch do not drag it).
function median(d) {
	const ch = [[], [], []];
	for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) ch[k].push(d[i + k]);
	return ch.map((a) => a.sort((x, y) => x - y)[a.length >> 1]);
}
// sRGB bytes to a three.js colour (linear inside)
const srgbColour = ([r, g, b]) => new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);

function loadImage(src) {
	return new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error('Cannot load ' + src)); i.src = src; });
}
