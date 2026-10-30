// Checking stone patterns by eye and by clock, from the console of a tab nobody is working in (it opens its
// own design). window.patternEval.sheet(): every preset on a square of cloth, as one picture in captures/.
// patternEval.lay(params, more): a pattern on a piece of a plain leotard, chosen, its handles showing.
// patternEval.drag(id, dx, dy): a handle dragged, through the real pointer path. patternEval.timing(): what one
// frame of a drag costs. Spec: knowledge/engineering/architecture/procedural-stone-patterns.md.
import { GALLERY_ITEMS, layoutDefaults } from '../stones/layouts.js';
import { patternStones } from '../stones/pattern.js';
import { newModifier } from '../stones/modifiers.js';

// the app's own copy of its state (after an edit the dev server serves it under another address)
const state = () => import(performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('ui/state.js')));
const flat = (h) => {
	const piece = { x0: -h, x1: h, y0: -h, y1: h, w1: 0, w2: 0, edgeAt: (u, v) => Math.min(h - Math.abs(u), h - Math.abs(v)), find: (u, v) => { piece.u = u; piece.v = v; return 0; }, posOf: (q, o) => { o.x = 0; o.y = 0; o.z = 0; return o; }, spOf: () => ({ u: piece.u, v: piece.v }), angleOf: (q, a) => a };
	return piece;
};

export const patternEval = {
	// items: which presets (default all); cell: pixels each; window: metres each shows; light: stones dark on light
	async sheet({ file = 'pattern-presets.png', items = [...GALLERY_ITEMS.keys()], cell = 150, window: win = 0.2, cols = 12, size = 'ss12', gap = 1.15 } = {}) {
		const h = win / 2, k = cell / win, rows = Math.ceil(items.length / cols), cv = document.createElement('canvas'), x = cv.getContext('2d'), errors = [];
		cv.width = cols * (cell + 6); cv.height = rows * (cell + 22);
		x.fillStyle = '#e6e5e0'; x.fillRect(0, 0, cv.width, cv.height); x.font = '11px sans-serif';
		items.forEach((key, i) => {
			const it = GALLERY_ITEMS.get(key), px = (i % cols) * (cell + 6), py = Math.floor(i / cols) * (cell + 22);
			try {
				const mods = (it.mods ?? []).map((m, j) => newModifier(m.on, m.shape, m, 'm' + j));
				const stones = patternStones({ id: 't', seed: 7, stone: 'Crystal', params: { layout: it.layout, x: 0, y: 0, size, gap, ...layoutDefaults(it.layout), ...it.params, mods } }, flat(h));
				x.save(); x.beginPath(); x.rect(px, py, cell, cell); x.clip();
				x.fillStyle = '#f5f4f0'; x.fillRect(px, py, cell, cell); x.fillStyle = '#2b2722'; x.beginPath();
				for (const s of stones) { const r = Math.max(0.55, (s.size / 2) * k * 0.9), a = px + (s.sp.u + h) * k, b = py + (h - s.sp.v) * k; x.moveTo(a + r, b); x.arc(a, b, r, 0, Math.PI * 2); }
				x.fill(); x.restore();
				x.fillStyle = '#333'; x.fillText(it.label.slice(0, 24) + ' ' + stones.length, px + 2, py + cell + 13);
			} catch (e) { errors.push(key + ': ' + e.message); }
		});
		const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
		await fetch('/__fs/captures/' + file, { method: 'POST', body: blob });
		return { file, errors };
	},

	// A plain leotard in the mannequin stance, once; then this pattern on its front, chosen.
	async lay(params, more = {}, focus = 'frame', panelName = 'Front') {
		const app = window.app, { selection, patternFocus, tab } = await state();
		if (!this.ready) { app.new('Pattern eval'); app.exec({ op: 'body.set', pose: 'a-pose' }); await new Promise((r) => setTimeout(r, 2500)); this.ready = true; }
		for (const g of [...app.doc.stones]) app.exec({ op: 'stones.remove', id: g.id });
		const panel = app.doc.panels.find((p) => p.name === panelName) ?? app.doc.panels[0];
		const id = app.exec({ op: 'stones.add', kind: 'pattern', on: { panel: panel.id }, stone: 'Crystal AB', shape: 'round', params: { size: 'ss12', gap: 1.15, ...params }, ...more });
		tab.value = 'sparkle';
		selection.value = { kind: 'stones', id };
		patternFocus.value = focus;
		await new Promise((r) => setTimeout(r, 900));
		app.engine.viewport.frame();
		return id;
	},
	// a preset, as it would be laid
	async preset(key, focus = 'frame', extra = {}) {
		const it = GALLERY_ITEMS.get(key), mods = (it.mods ?? []).map((m, j) => newModifier(m.on, m.shape, { ...m, preset: true }, 'm' + (j + 1)));
		return this.lay({ layout: it.layout, preset: key, ...layoutDefaults(it.layout), ...it.params, mods, ...extra }, { name: it.label }, focus);
	},

	// A handle dragged by real pointer events on its own element and the view: by (dx, dy) pixels, in steps.
	async drag(id, dx, dy, steps = 10, opts = {}) {
		const { selection } = await state(), engine = window.app.engine, gz = engine.gizmo, k = gz.knobs.find((q) => q.key === id || q.id === id), el = gz.knobEls.get(k?.key), canvas = engine.viewport.renderer.domElement, r = canvas.getBoundingClientRect();
		if (!k) throw new Error('No handle ' + id + ': ' + gz.knobs.map((q) => q.key).join(', '));
		const x0 = k.sx + r.left, y0 = k.sy + r.top, pointerId = 7, ev = (type, x, y) => new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId, pointerType: 'mouse', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: x, clientY: y, ...opts });
		canvas.setPointerCapture = () => {}; canvas.releasePointerCapture = () => {};
		el.dispatchEvent(ev('pointerdown', x0, y0));
		// (a frame by hand: a hidden pane draws none)
		for (let i = 1; i <= steps; i++) { canvas.dispatchEvent(ev('pointermove', x0 + (dx * i) / steps, y0 + (dy * i) / steps)); engine.viewport.frame(); await new Promise((f) => setTimeout(f, 0)); }
		canvas.dispatchEvent(ev('pointerup', x0 + dx, y0 + dy));
		delete canvas.setPointerCapture; delete canvas.releasePointerCapture;
		engine.viewport.frame();
		return window.app.doc.stones.find((g) => g.id === selection.value?.id)?.params;
	},

	// The view with the handles over it, as a picture in captures/ (they are not part of the 3D view's own captures).
	async shot(file = 'handles.png', { zoom = 2 } = {}) {
		const engine = window.app.engine, vp = engine.viewport, c = vp.renderer.domElement, w = c.clientWidth, h = c.clientHeight, gz = engine.gizmo;
		gz.dirty = true; gz.frame();
		const blob = await window.app.withoutOverlay(() => vp.capture(w * zoom, h * zoom));
		gz.dirty = true; gz.frame();
		const img = await createImageBitmap(blob), cv = document.createElement('canvas'), x = cv.getContext('2d');
		cv.width = w * zoom; cv.height = h * zoom;
		x.drawImage(img, 0, 0);
		const svg = gz.svg.cloneNode(true), from = gz.svg.querySelectorAll('*'), to = svg.querySelectorAll('*');
		from.forEach((el, i) => { const s = getComputedStyle(el); for (const k of ['fill', 'stroke', 'stroke-width', 'opacity', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'display']) to[i].style.setProperty(k, s.getPropertyValue(k)); if (el.classList?.contains('gz-disc')) to[i].setAttribute('r', el.getAttribute('r')); });
		svg.querySelectorAll('.gz-hit, title').forEach((e) => e.remove());
		svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); svg.setAttribute('width', w * zoom); svg.setAttribute('height', h * zoom); svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
		const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
		await new Promise((res, rej) => { const im = new Image(); im.onload = () => { x.drawImage(im, 0, 0); res(); }; im.onerror = rej; im.src = url; });
		const out = await new Promise((r) => cv.toBlob(r, 'image/png'));
		await fetch('/__fs/captures/' + file, { method: 'POST', body: out });
		return { file, knobs: gz.knobs.map((k) => k.key) };
	},

	// Warm: what running the group and laying its stones costs for one frame of a drag, ms.
	async timing(params = 'x', n = 30) {
		const { selection } = await state(), app = window.app, g = app.doc.stones.find((q) => q.id === selection.value?.id), times = [], v0 = g.params[params] ?? 0;
		for (let i = 0; i < n; i++) {
			const t0 = performance.now();
			app.exec({ op: 'stones.set', id: g.id, params: { [params]: v0 + (i % 2 ? 0.0011 : 0) }, gesture: 'timing' });
			app.engine.stonesDirty = false; app.engine.syncStones(app.doc, new Set(['stones']));
			times.push(performance.now() - t0);
		}
		app.endGesture();
		app.undo();
		times.sort((a, b) => a - b);
		return { stones: app.engine.stoneRun.stones.length, median: +times[n >> 1].toFixed(2), p90: +times[Math.floor(n * 0.9)].toFixed(2) };
	},
};
window.patternEval = patternEval;
