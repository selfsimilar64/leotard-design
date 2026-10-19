// Flattens pattern pieces off the main thread (garment/flattener.js sends the jobs).
import { flatten } from './flatten.js';

self.onmessage = (e) => {
	const { id, P, I } = e.data;
	try {
		const r = flatten(P, I);
		self.postMessage({ id, uv: r.uv, stretch: r.stretch }, [r.uv.buffer]);
	} catch (err) {
		self.postMessage({ id, error: String(err) });
	}
};
