// The design sheet (prints.html): every printed preset drawn by its own shader on a square of cloth, without the app
// round it, for writing and checking designs. ?family=Mandalas shows one family, ?px=320 bigger pictures, ?soft=0..1 or
// ?as=lines (the crystal layouts as line art) other views. window.printReport: { compiled, failed: [{ key, log }], ms }.
import { printEngine } from '../prints/engine.js';
import { printPicture, itemGen } from '../prints/picture.js';
import { GALLERY } from '../stones/layouts.js';

const q = new URLSearchParams(location.search), px = +(q.get('px') ?? 200), family = q.get('family'), soft = q.get('soft'), lines = q.get('as') === 'lines';
const eng = printEngine(), root = document.getElementById('sheet');
const t0 = performance.now();
const failed = await eng.prepare();
const compiled = performance.now() - t0;
const times = [];
for (const g of GALLERY) {
	if (g.kind !== (lines ? 'stones' : 'print') || (family && g.title !== family)) continue;
	const h = document.createElement('h2');
	h.textContent = g.title;
	root.append(h);
	const row = document.createElement('div');
	row.className = 'row';
	root.append(row);
	for (const item of g.items) {
		const cell = document.createElement('figure'), cv = document.createElement('canvas'), cap = document.createElement('figcaption');
		cv.width = cv.height = px;
		cap.textContent = item.label;
		cell.append(cv, cap);
		row.append(cell);
		try {
			const more = { ...(lines ? { as: 'print' } : {}), ...(soft !== null ? { ink: { ...(item.params?.ink ?? {}), soft: +soft } } : {}) };
			const t = performance.now(), img = printPicture(itemGen(item, undefined, more), px);
			eng.gl.finish();
			times.push([item.key, +(performance.now() - t).toFixed(1)]);
			if (img) cv.getContext('2d').putImageData(img, 0, 0); else cap.textContent += ' (no picture)';
		} catch (e) { cap.textContent += ' ✗ ' + e.message; console.error(item.key, e); }
	}
}
window.printReport = { compiled: +compiled.toFixed(0), failed: eng.failed.map((f) => ({ key: f.key, log: f.log.slice(0, 600) })), slowest: times.sort((a, b) => b[1] - a[1]).slice(0, 8), count: times.length, failedCount: failed };
document.title = `Prints: ${times.length} drawn, ${eng.failed.length} failed`;
