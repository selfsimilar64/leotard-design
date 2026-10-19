// Flattening service: pattern pieces are flattened in a worker and cached by their geometry
// signature, so moving one line only re-flattens the pieces it changed. Falls back to the main
// thread where workers are unavailable (tests).
import { flatten } from './flatten.js';

export class Flattener {
	constructor() {
		this.cache = new Map();   // signature -> { uv, stretch }
		this.pending = new Map(); // signature -> Promise
		this.jobs = new Map();
		this.seq = 0;
		try {
			this.worker = new Worker(new URL('./flatten.worker.js', import.meta.url), { type: 'module' });
			this.worker.onmessage = (e) => { const j = this.jobs.get(e.data.id); this.jobs.delete(e.data.id); if (j) (e.data.error ? j.reject(new Error(e.data.error)) : j.resolve(e.data)); };
		} catch { this.worker = null; }
	}

	get(sig) { return this.cache.get(sig) ?? null; }

	// piece: { P, I } -> Promise<{ uv, stretch }>
	request(sig, piece) {
		if (this.cache.has(sig)) return Promise.resolve(this.cache.get(sig));
		if (this.pending.has(sig)) return this.pending.get(sig);
		let p;
		if (this.worker) {
			const id = ++this.seq;
			p = new Promise((resolve, reject) => this.jobs.set(id, { resolve, reject }));
			// copies: the piece stays usable on this side
			this.worker.postMessage({ id, P: Float32Array.from(piece.P), I: Uint32Array.from(piece.I) });
		} else {
			p = Promise.resolve(flatten(piece.P, piece.I));
		}
		p = p.then((r) => {
			const v = { uv: r.uv, stretch: r.stretch };
			this.cache.set(sig, v); this.pending.delete(sig);
			if (this.cache.size > 400) this.cache.delete(this.cache.keys().next().value);
			return v;
		}, (e) => { this.pending.delete(sig); throw e; });
		this.pending.set(sig, p);
		return p;
	}
}
