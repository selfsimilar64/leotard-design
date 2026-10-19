// Reference photos: import a photo, pin body landmarks on it, solve its camera, then trace on it
// (point specs { photo: { ref, px } } land on the body through the solved camera).
// Roadmap P6; camera model in render/camera-solve.js.
import { defineCommand } from './store.js';
import { solveCamera } from '../render/camera-solve.js';
import { LANDMARK_HELP } from '../body/landmarks.js';

function ref(tx, id) {
	const r = tx.doc.reference.find((x) => x.id === id);
	if (!r) throw new Error('No reference photo ' + id + '. References: ' + (tx.doc.reference.map((x) => x.id).join(', ') || 'none'));
	return r;
}

defineCommand('reference.add', {
	label: 'Add reference photo', args: '{ src (url, e.g. /moodboard/<file> or /__fs/references/<file>), size: [w, h] px, crop?: [x0, y0, x1, y1] (this view\'s part of a collage), name?, view?: front|back|side|other }',
	run(tx, a) {
		if (!a.src || !Array.isArray(a.size)) throw new Error('reference.add needs src and size [w, h] (app.addReference(src) reads the size for you)');
		const id = tx.newId('r');
		tx.insert('reference', { id, name: a.name ?? a.src.split('/').pop(), src: a.src, size: a.size, crop: a.crop ?? null, view: a.view ?? 'front', pins: [], camera: null, opacity: 0.5 });
		return id;
	},
});

defineCommand('reference.pin', {
	label: 'Pin landmark', args: '{ id, lm: landmark name, px: [x, y] image pixels }',
	run(tx, a) {
		const r = ref(tx, a.id), lms = tx.ctx?.landmarks;
		if (!lms?.[a.lm]) throw new Error('Unknown landmark ' + a.lm + '. Landmarks: ' + Object.keys(lms ?? {}).join(', '));
		if (!Array.isArray(a.px) || a.px.length !== 2) throw new Error('px is [x, y] in image pixels');
		const pins = r.pins.filter((p) => p.lm !== a.lm).concat([{ lm: a.lm, px: a.px.map(Number) }]);
		tx.set(['reference', a.id, 'pins'], pins);
	},
});

defineCommand('reference.unpin', {
	label: 'Remove pin', args: '{ id, lm }',
	run(tx, a) { const r = ref(tx, a.id); tx.set(['reference', a.id, 'pins'], r.pins.filter((p) => p.lm !== a.lm)); },
});

// Solve the photo's camera on the body as it is now (size and pose): re-solve after changing them.
defineCommand('reference.solve', {
	label: 'Solve photo camera', args: '{ id }',
	run(tx, a) {
		const r = ref(tx, a.id), ctx = tx.ctx;
		if (!ctx?.landmarkPos) throw new Error('The body is still loading');
		const pins = r.pins.map((p) => ({ X: ctx.landmarkPos(p.lm), u: p.px }));
		const cam = solveCamera(pins, r.size, { crop: r.crop, fitScale: a.fitScale ?? true });
		tx.set(['reference', a.id, 'camera'], { position: cam.position, quaternion: cam.quaternion, fov: cam.fov, f: cam.f, size: cam.size, crop: cam.crop, scale: cam.scale, pivot: cam.pivot, error: +cam.error.toFixed(2), errors: cam.errors.map((e) => +e.toFixed(1)), body: ctx.bodyKey?.() ?? null });
		return { error: +cam.error.toFixed(2), fov: +cam.fov.toFixed(1), scale: cam.scale.map((s) => +s.toFixed(3)), errors: Object.fromEntries(r.pins.map((p, i) => [p.lm, +cam.errors[i].toFixed(1)])) };
	},
});

defineCommand('reference.set', {
	label: 'Change reference', args: '{ id, opacity?, name?, view? }',
	run(tx, a) {
		ref(tx, a.id);
		for (const k of ['opacity', 'name', 'view']) if (a[k] !== undefined) tx.set(['reference', a.id, k], a[k]);
	},
});

defineCommand('reference.remove', {
	label: 'Remove reference', args: '{ id }',
	run(tx, a) { ref(tx, a.id); tx.remove('reference', a.id); },
});

export { LANDMARK_HELP };
