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
import { DocumentStore, commandList } from './doc/store.js';
import { newDocument } from './doc/schema.js';
import './doc/commands-core.js';
import './doc/commands-garment.js';
import './doc/commands-reference.js';
import './doc/commands-stones.js';
import { surfaceLandmarks } from './body/landmarks.js';
import { resolvePoint } from './curves/points.js';
import { defineCommand } from './doc/store.js';
import { legacyFromLook } from './garment/legacy.js';
import { buildGarment, inheritPanels, evaluateAll } from './garment/build.js';
import { showCells } from './render/debug.js';
import { patternPieces } from './garment/pattern.js';
import { patternPDF } from './export/pdf.js';

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

	async capture(name, opts = {}) {
		if (opts.view) this.view(opts.view);
		const blob = await this.engine.viewport.capture(opts.width ?? 1600, opts.height ?? 1200);
		const file = safeName(name) + '.png';
		const r = await fetch('/__fs/captures/' + file, { method: 'POST', body: blob }).catch(() => null);
		if (!r || !r.ok) { download(file, blob); return 'downloaded ' + file; }
		return 'captures/' + file;
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
		const blob = await this.engine.viewport.capture(w, h);
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

	get debug() { return { cells: (on = true) => showCells(this.engine, on) }; }

	benchmark(n = 60) { return +this.engine.viewport.benchmark(n).toFixed(2); }
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

function loadImage(src) {
	return new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error('Cannot load ' + src)); i.src = src; });
}
