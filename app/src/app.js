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
import { legacyFromLook } from './garment/legacy.js';

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
		engine.sync(this.doc, new Set(Object.keys(this.doc)), 'load');
		engine.frameCamera(this.doc.body.form);
	}

	get doc() { return this.store.doc; }
	get revision() { return this.store.revision; }
	onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

	exec(cmd, opts) { return this.store.exec(cmd, opts); }
	undo() { return this.store.undo(); }
	redo() { return this.store.redo(); }
	endGesture() { this.store.endGesture(); }
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
		const blob = await this.engine.viewport.capture();
		const file = safeName(name) + '.png';
		const r = await fetch('/__fs/captures/' + file, { method: 'POST', body: blob }).catch(() => null);
		if (!r || !r.ok) { download(file, blob); return 'downloaded ' + file; }
		return 'captures/' + file;
	}

	benchmark(n = 60) { return +this.engine.viewport.benchmark(n).toFixed(2); }
	stats() { return { ...this.engine.viewport.stats, ...this.engine.timing, legacy: this.engine.legacy.timing }; }
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
