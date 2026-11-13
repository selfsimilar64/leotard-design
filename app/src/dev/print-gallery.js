// The design sheet (prints.html): every printed preset drawn by its own shader on a square of cloth, without the app
// round it, for writing and checking designs. ?family=Mandalas shows one family, ?px=320 bigger pictures, ?cloth=rrggbb
// another fabric, ?as=lines the crystal layouts as line art. window.printReport: { compiled, failed: [{ key, log }], ms }.
import { printEngine } from '../prints/engine.js';
import { printPicture, itemGen } from '../prints/picture.js';
import { GALLERY } from '../stones/layouts.js';

const q = new URLSearchParams(location.search), px = +(q.get('px') ?? 200), family = q.get('family'), cloth = '#' + (q.get('cloth') ?? '26221e'), lines = q.get('as') === 'lines';
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
			const more = lines ? { as: 'print' } : {};
			const t = performance.now(), img = printPicture(itemGen(item, undefined, more), px, { cloth });
			eng.gl.finish();
			times.push([item.key, +(performance.now() - t).toFixed(1)]);
			if (img) cv.getContext('2d').putImageData(img, 0, 0); else cap.textContent += ' (no picture)';
		} catch (e) { cap.textContent += ' ✗ ' + e.message; console.error(item.key, e); }
	}
}
window.printReport = { compiled: +compiled.toFixed(0), failed: eng.failed.map((f) => ({ key: f.key, log: f.log.slice(0, 600) })), slowest: times.sort((a, b) => b[1] - a[1]).slice(0, 8), count: times.length, failedCount: failed };
document.title = `Prints: ${times.length} drawn, ${eng.failed.length} failed`;

// The whole sheet as one picture: captures/<name>.png (the dev server's file bridge, vite.config.js). cols: tiles a row.
window.saveSheet = async (name = 'print-designs', cols = 12) => {
	const tiles = [...root.querySelectorAll('figure')].map((f) => ({ cv: f.querySelector('canvas'), label: f.querySelector('figcaption').textContent, family: f.parentNode.previousElementSibling?.textContent }));
	const gap = 10, cap = 16, head = 30, w = px + gap, out = document.createElement('canvas'), rowsOf = new Map();
	for (const t of tiles) rowsOf.set(t.family, [...(rowsOf.get(t.family) ?? []), t]);
	let H = gap;
	for (const list of rowsOf.values()) H += head + Math.ceil(list.length / cols) * (px + cap + gap);
	out.width = gap + cols * w; out.height = H;
	const x = out.getContext('2d');
	x.fillStyle = '#171513'; x.fillRect(0, 0, out.width, out.height);
	let y = gap;
	for (const [family, list] of rowsOf) {
		x.fillStyle = '#e9e4dc'; x.font = '600 15px system-ui, sans-serif'; x.fillText(family, gap, y + 18);
		y += head;
		list.forEach((t, i) => {
			const cx = gap + (i % cols) * w, cy = y + Math.floor(i / cols) * (px + cap + gap);
			x.drawImage(t.cv, cx, cy);
			x.fillStyle = '#b5ada1'; x.font = '11px system-ui, sans-serif'; x.fillText(t.label.slice(0, Math.floor(px / 6.2)), cx, cy + px + 12);
		});
		y += Math.ceil(list.length / cols) * (px + cap + gap);
	}
	const blob = await new Promise((r) => out.toBlob(r, 'image/png')), res = await fetch('/__fs/captures/' + name + '.png', { method: 'POST', body: blob });
	return res.ok ? 'captures/' + name + '.png' : 'failed';
};
