// Flat and 3D side by side (knowledge/product/roadmap/flat-and-3d-exploration-plan.md, stage 4). Open /wrap.html on the
// dev server. Artwork lives on one canvas per cut piece, in the piece's own millimetres; the 3D garment wears those canvases
// and the export prints them, so all three show the same pixels. Reads a solve from pipeline/wrap_block.py.
//   window.link.evaluate(): the stage's measurements, into captures/wrap-link-eval.json
import * as THREE from 'three';
import { jsPDF } from 'jspdf';
import * as wrap from './wrap-eval.js';
import { FlatLink } from './flat-link.js';
import { pieceOutlines, offsetPolygon, signedArea } from '../garment/pattern.js';

const FILE = 'wrap-XS-high-cuff-resolved';
const PX_PER_MM = 2.5, MARGIN = 0.012, CLOTH = '#e9e6dd', STONE_GAP = 0.008, STONE = 0.0033;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const link = window.link = {};
let flat, sheets = new Map(), meshes = [], tool = 'look', hoverDot, stones, stoneList = [], strokes = [], view3d, flatCv, flatScale = 1;

// ---- pieces -----------------------------------------------------------------------------------------------------------

// A cut piece: its canvas, and its flat outline (a front's two halves joined at the fold, so one piece).
function buildSheets(cells) {
	sheets = new Map();
	for (const piece of [...new Set(cells.map((c) => c.piece))]) {
		const own = cells.filter((c) => c.piece === piece);
		let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
		for (const c of own) for (let i = 0; i < c.uv.length; i += 2) { u0 = Math.min(u0, c.uv[i]); u1 = Math.max(u1, c.uv[i]); v0 = Math.min(v0, c.uv[i + 1]); v1 = Math.max(v1, c.uv[i + 1]); }
		u0 -= MARGIN; v0 -= MARGIN; u1 += MARGIN; v1 += MARGIN;
		const cv = document.createElement('canvas');
		cv.width = Math.ceil((u1 - u0) * 1000 * PX_PER_MM); cv.height = Math.ceil((v1 - v0) * 1000 * PX_PER_MM);
		// the sheet is a whole number of pixels, so that a millimetre is exactly PX_PER_MM on it, in the 3D and in the print
		u1 = u0 + cv.width / PX_PER_MM / 1000; v0 = v1 - cv.height / PX_PER_MM / 1000;
		const x = cv.getContext('2d', { willReadFrequently: true });
		const texture = new THREE.CanvasTexture(cv);
		texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
		const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.62, metalness: 0, side: THREE.DoubleSide });
		sheets.set(piece, { piece, cv, x, texture, material, u0, v0, u1, v1, outline: outlineOf(own), w: u1 - u0, h: v1 - v0 });
	}
	clearArt();
}
function outlineOf(own) {
	// a mirrored half has the same ids as its partner, so only points on the fold become one; a sleeve is one cell and keeps its slit
	const index = new Map(), uv = [], I = [];
	for (const c of own) {
		const local = c.wid.map((w, v) => {
			const key = own.length > 1 && Math.abs(c.uv[v * 2]) < 0.0015 ? `${w}` : `${c.half}:${v}`;
			if (!index.has(key)) { index.set(key, uv.length / 2); uv.push(c.uv[v * 2], c.uv[v * 2 + 1]); }
			return index.get(key);
		});
		for (const v of c.I) I.push(local[v]);
	}
	return pieceOutlines(I, uv)[0].map(([u, v]) => [u, v]);
}
const toPx = (s, u, v) => [(u - s.u0) * 1000 * PX_PER_MM, (s.v1 - v) * 1000 * PX_PER_MM];
const refresh = () => { for (const s of sheets.values()) s.texture.needsUpdate = true; drawFlat(); };

function clearArt() {
	for (const s of sheets.values()) { s.x.fillStyle = CLOTH; s.x.fillRect(0, 0, s.cv.width, s.cv.height); }
	strokes = []; stoneList = [];
	placeStones();
	refresh();
}

// A grid at true size on every piece, 50 mm squares from its own origin.
function paintGrid() {
	for (const s of sheets.values()) {
		const { x } = s;
		x.strokeStyle = '#1b1b1b'; x.lineWidth = 2;
		x.beginPath();
		for (let u = Math.ceil(s.u0 / 0.05) * 0.05; u < s.u1; u += 0.05) { const [a] = toPx(s, u, 0); x.moveTo(a, 0); x.lineTo(a, s.cv.height); }
		for (let v = Math.ceil(s.v0 / 0.05) * 0.05; v < s.v1; v += 0.05) { const [, b] = toPx(s, 0, v); x.moveTo(0, b); x.lineTo(s.cv.width, b); }
		x.stroke();
	}
	refresh();
}

function paintStroke(st, colour = '#b3122c') {
	const s = sheets.get(st.piece);
	s.x.strokeStyle = colour; s.x.lineWidth = 3 * PX_PER_MM; s.x.lineCap = 'round'; s.x.lineJoin = 'round';
	s.x.beginPath();
	st.points.forEach(([u, v], i) => { const [a, b] = toPx(s, u, v); if (i) s.x.lineTo(a, b); else s.x.moveTo(a, b); });
	s.x.stroke();
}

// Stones are fixed to the flat cloth at an even spacing, so on the body they spread where the cloth stretches, as real ones do.
function addStones(st) {
	let carry = 0;
	const P = st.points;
	for (let i = 1; i < P.length; i++) {
		const L = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
		while (carry < L) {
			const t = L ? carry / L : 0;
			stoneList.push({ piece: st.piece, u: P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, v: P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t });
			carry += STONE_GAP;
		}
		carry -= L;
	}
}
function placeStones() {
	if (stones) { view3d.remove(stones); stones.geometry.dispose(); stones.material.dispose(); stones = null; }
	const on = stoneList.map((q) => flat?.toBody(q.piece, q.u, q.v)).filter(Boolean);
	if (on.length) {
		stones = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(STONE / 2, 1), new THREE.MeshStandardMaterial({ color: '#f4f7ff', metalness: 0.9, roughness: 0.12 }), on.length);
		const m = new THREE.Matrix4();
		on.forEach((q, i) => stones.setMatrixAt(i, m.makeTranslation(q.p[0], q.p[1], q.p[2])));
		stones.frustumCulled = false;
		view3d.add(stones);
	}
	for (const s of sheets.values()) {
		s.x.fillStyle = '#3a4a78';
		for (const q of stoneList) if (q.piece === s.piece) { const [a, b] = toPx(s, q.u, q.v); s.x.beginPath(); s.x.arc(a, b, (STONE / 2) * 1000 * PX_PER_MM, 0, 7); s.x.fill(); }
	}
}

// A design laid on the body as seen from this camera: the flat pieces get whatever shape makes it read straight on the body,
// each seam's two sides carrying matching artwork. What a printer would need for a motif across seams.
function motif() {
	const c = document.createElement('canvas'), S = 1024, x = c.getContext('2d');
	c.width = c.height = S;
	const g = x.createRadialGradient(S / 2, S / 2, 40, S / 2, S / 2, S / 2);
	g.addColorStop(0, '#f7c12f'); g.addColorStop(0.55, '#d62f5b'); g.addColorStop(1, '#2a1b6e');
	x.fillStyle = g;
	x.beginPath();
	for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2, r = (i % 2 ? 0.26 : 0.5) * S; x.lineTo(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r); }
	x.closePath(); x.fill();
	x.strokeStyle = '#fff'; x.lineWidth = 12;
	for (const r of [0.14, 0.2]) { x.beginPath(); x.arc(S / 2, S / 2, r * S, 0, 7); x.stroke(); }
	return c;
}
function project(design = motif(), size = 0.8) {
	const cam = wrap.camera(), W = design.width, H = design.height, src = design.getContext('2d').getImageData(0, 0, W, H).data;
	const v = new THREE.Vector3(), towards = new THREE.Vector3();
	cam.getWorldPosition(towards);
	const images = new Map([...sheets.values()].map((s) => [s.piece, s.x.getImageData(0, 0, s.cv.width, s.cv.height)]));
	// where the design sits: in the middle of the view, scaled to `size` of its height
	flat.cells.forEach((c, ci) => {
		const s = sheets.get(c.piece), im = images.get(c.piece), P = c.P, U = c.uv;
		const ndc = new Float32Array(c.P.length / 3 * 2), front = new Uint8Array(c.I.length / 3);
		for (let i = 0; i < ndc.length / 2; i++) { v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).project(cam); ndc[i * 2] = v.x; ndc[i * 2 + 1] = v.y; }
		for (let t = 0; t < c.I.length; t += 3) {
			const [a, b, d] = [c.I[t], c.I[t + 1], c.I[t + 2]];
			const area = (ndc[b * 2] - ndc[a * 2]) * (ndc[d * 2 + 1] - ndc[a * 2 + 1]) - (ndc[d * 2] - ndc[a * 2]) * (ndc[b * 2 + 1] - ndc[a * 2 + 1]);
			if (area <= 0) continue; // faces away
			const [xa, ya] = toPx(s, U[a * 2], U[a * 2 + 1]), [xb, yb] = toPx(s, U[b * 2], U[b * 2 + 1]), [xd, yd] = toPx(s, U[d * 2], U[d * 2 + 1]);
			const den = (yb - yd) * (xa - xd) + (xd - xb) * (ya - yd);
			if (Math.abs(den) < 1e-9) continue;
			for (let py = Math.floor(Math.min(ya, yb, yd)); py <= Math.ceil(Math.max(ya, yb, yd)); py++) for (let px = Math.floor(Math.min(xa, xb, xd)); px <= Math.ceil(Math.max(xa, xb, xd)); px++) {
				const w1 = ((yb - yd) * (px - xd) + (xd - xb) * (py - yd)) / den, w2 = ((yd - ya) * (px - xd) + (xa - xd) * (py - yd)) / den, w3 = 1 - w1 - w2;
				if (w1 < -0.02 || w2 < -0.02 || w3 < -0.02) continue;
				const nx = w1 * ndc[a * 2] + w2 * ndc[b * 2] + w3 * ndc[d * 2], ny = w1 * ndc[a * 2 + 1] + w2 * ndc[b * 2 + 1] + w3 * ndc[d * 2 + 1];
				const mx = ((nx * cam.aspect / size + 1) / 2) * W | 0, my = ((1 - ny / size) / 2) * H | 0;
				if (mx < 0 || my < 0 || mx >= W || my >= H) continue;
				const k = (my * W + mx) * 4, al = src[k + 3] / 255;
				if (!al) continue;
				const o = (py * im.width + px) * 4;
				if (o < 0 || o >= im.data.length) continue;
				for (let q = 0; q < 3; q++) im.data[o + q] = src[k + q] * al + im.data[o + q] * (1 - al);
			}
		}
	});
	for (const s of sheets.values()) s.x.putImageData(images.get(s.piece), 0, 0);
	refresh();
}

// ---- the 3D side --------------------------------------------------------------------------------------------------------

async function showOn3D() {
	const r = await wrap.show(FILE, 'print', { onSkin: true, material: (c) => sheets.get(c.piece)?.material ?? new THREE.MeshBasicMaterial() });
	meshes = r.meshes;
	return r;
}
function bindMeshes(cells) {
	// each mesh's flat coordinates, as a fraction of its piece's canvas, and the link's own view of its place
	meshes.forEach((m, i) => {
		const c = cells[i], s = sheets.get(c.piece), n = c.uv.length / 2, uv = new Float32Array(n * 2);
		for (let k = 0; k < n; k++) { uv[k * 2] = (c.uv[k * 2] - s.u0) / s.w; uv[k * 2 + 1] = (c.uv[k * 2 + 1] - s.v0) / s.h; }
		m.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
		c.P = m.geometry.attributes.position.array;
		m.userData.index = i;
	});
}
const ray = new THREE.Raycaster();
function hit3D(e) {
	const el = wrap.canvas(), r = el.getBoundingClientRect();
	ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), wrap.camera());
	const h = ray.intersectObjects(meshes, false)[0];
	if (!h) return null;
	const c = meshes[meshes.indexOf(h.object)], i = c.userData.index, I = c.geometry.index.array, t = h.faceIndex * 3;
	const b = new THREE.Vector3();
	THREE.Triangle.getBarycoord(h.point, ...[0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(c.geometry.attributes.position, I[t + k])), b);
	return flat.flatOf(i, t, [b.x, b.y, b.z]);
}
function showDot3D(p) {
	if (!hoverDot) {
		hoverDot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 16, 12), new THREE.MeshBasicMaterial({ color: '#00d1ff', depthTest: false }));
		hoverDot.renderOrder = 10;
		view3d.add(hoverDot);
	}
	hoverDot.visible = !!p;
	if (p) hoverDot.position.set(p[0], p[1], p[2]);
}

// ---- the flat side -------------------------------------------------------------------------------------------------------

let layout = [], flatDot = null, liveStroke = null;
function layoutPieces(W, H) {
	const list = [...sheets.values()], gap = 0.03, total = list.reduce((a, s) => a + s.w + gap, -gap), tall = Math.max(...list.map((s) => s.h));
	flatScale = Math.min(W / total, H / tall);
	let x = (W - total * flatScale) / 2;
	layout = list.map((s) => { const at = { s, x, y: (H - s.h * flatScale) / 2 }; x += (s.w + gap) * flatScale; return at; });
}
function drawFlat() {
	if (!flatCv) return;
	const r = flatCv.getBoundingClientRect(), dpr = devicePixelRatio;
	if (flatCv.width !== Math.round(r.width * dpr)) { flatCv.width = Math.round(r.width * dpr); flatCv.height = Math.round(r.height * dpr); }
	layoutPieces(r.width, r.height);
	const x = flatCv.getContext('2d');
	x.setTransform(dpr, 0, 0, dpr, 0, 0);
	x.fillStyle = '#2b2d33'; x.fillRect(0, 0, r.width, r.height);
	for (const { s, x: ox, y: oy } of layout) {
		const pts = s.outline.map(([u, v]) => [ox + (u - s.u0) * flatScale, oy + (s.v1 - v) * flatScale]);
		x.save(); x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.clip();
		x.drawImage(s.cv, ox, oy, s.w * flatScale, s.h * flatScale);
		x.restore();
		x.strokeStyle = '#ffffff'; x.lineWidth = 1;
		x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.stroke();
		x.fillStyle = '#c9ccd3'; x.font = '12px sans-serif'; x.fillText(s.piece, ox + 4, oy + 12);
		if (flatDot?.piece === s.piece) { x.fillStyle = '#00d1ff'; x.beginPath(); x.arc(ox + (flatDot.u - s.u0) * flatScale, oy + (s.v1 - flatDot.v) * flatScale, 5, 0, 7); x.fill(); }
	}
}
function hitFlat(e) {
	const r = flatCv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
	for (const { s, x, y } of layout) {
		const u = s.u0 + (px - x) / flatScale, v = s.v1 - (py - y) / flatScale;
		if (u < s.u0 || u > s.u1 || v < s.v0 || v > s.v1) continue;
		const on = flat.toBody(s.piece, u, v);
		if (on) return { piece: s.piece, u, v, cell: on.cell, tri: on.tri, w: on.w, p: on.p };
	}
	return null;
}

// ---- tools ----------------------------------------------------------------------------------------------------------------

function finishLine(points) {
	if (points.length < 2) return;
	for (const st of flat.strokes(points)) {
		if (st.points.length < 2) continue;
		strokes.push({ piece: st.piece, points: st.points, kind: tool });
		if (tool === 'stones') addStones(st); else paintStroke(st);
	}
	placeStones();
	refresh();
}
function wire() {
	const el = wrap.canvas();
	const drawing = () => tool === 'line' || tool === 'stones';
	el.addEventListener('pointerdown', (e) => {
		if (!drawing()) return;
		const q = hit3D(e);
		liveStroke = q ? [q] : [];
		e.stopImmediatePropagation();
	}, true);
	window.addEventListener('pointermove', (e) => {
		if (e.target === el) {
			const q = hit3D(e);
			flatDot = q;
			if (liveStroke && q) {
				liveStroke.push(q);
				const n = liveStroke.length, a = liveStroke[n - 2] ?? q;
				if (a.piece === q.piece) paintStroke({ piece: q.piece, points: [[a.u, a.v], [q.u, q.v]] }, tool === 'stones' ? '#8a93b5' : '#b3122c');
				sheets.get(q.piece).texture.needsUpdate = true;
			}
			showDot3D(null);
			drawFlat();
		} else if (e.target === flatCv) {
			const q = hitFlat(e);
			flatDot = q;
			showDot3D(q?.p ?? null);
			if (liveStroke && q && liveStroke[0].piece === q.piece) {
				liveStroke.push(q);
				const a = liveStroke[liveStroke.length - 2];
				paintStroke({ piece: q.piece, points: [[a.u, a.v], [q.u, q.v]] }, tool === 'stones' ? '#8a93b5' : '#b3122c');
				sheets.get(q.piece).texture.needsUpdate = true;
			}
			drawFlat();
		}
	});
	flatCv.addEventListener('pointerdown', (e) => { if (drawing()) { const q = hitFlat(e); if (q) liveStroke = [q]; } });
	window.addEventListener('pointerup', () => {
		if (!liveStroke) return;
		const line = liveStroke;
		liveStroke = null;
		finishLine(line);
	});
}

// ---- export ---------------------------------------------------------------------------------------------------------------

// One page a piece, at true size: the same canvas the 3D wears, the sewing line, a 6 mm cut line and a 50 mm check square.
function exportPDF() {
	let doc = null;
	const SA = 6, ROOM = 20;
	for (const s of sheets.values()) {
		const wmm = s.w * 1000, hmm = s.h * 1000, W = wmm + 2 * ROOM, H = hmm + 2 * ROOM + 60;
		const o = W > H ? 'l' : 'p';
		if (doc) doc.addPage([W, H], o); else doc = new jsPDF({ unit: 'mm', format: [W, H], orientation: o, compress: true });
		doc.addImage(s.cv.toDataURL('image/png'), 'PNG', ROOM, ROOM, wmm, hmm);
		let line = s.outline.map(([u, v]) => [ROOM + (u - s.u0) * 1000, ROOM + (s.v1 - v) * 1000]);
		if (signedArea(line) < 0) line = line.reverse();
		const poly = (pts) => { doc.lines(pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]), pts[0][0], pts[0][1], [1, 1], 'S', true); };
		doc.setDrawColor(0); doc.setLineWidth(0.25); doc.setLineDashPattern([2, 1.2], 0);
		poly(line);
		doc.setLineDashPattern([], 0);
		poly(offsetPolygon(line, SA));
		doc.setFontSize(10);
		doc.text(`${s.piece}, ${FILE}. Print at 100%. Solid: cut (${SA} mm allowance). Dashed: sewing line. Square: 50 mm.`, ROOM, H - 8, { maxWidth: W - 2 * ROOM - 60 });
		doc.rect(W - ROOM - 50, H - 55, 50, 50);
	}
	return doc;
}
async function savePDF() {
	const r = await fetch('/__fs/exports/flat-and-3d.pdf', { method: 'POST', body: exportPDF().output('blob') });
	return r.ok ? 'exports/flat-and-3d.pdf' : 'failed';
}

// ---- panel ----------------------------------------------------------------------------------------------------------------

function buildPanel() {
	const box = document.createElement('div');
	Object.assign(box.style, { position: 'fixed', inset: '0', zIndex: 1000, background: '#1f2025', display: 'flex', flexDirection: 'column', font: '13px sans-serif', color: '#eee' });
	const bar = document.createElement('div');
	Object.assign(bar.style, { display: 'flex', gap: '6px', padding: '6px 8px', alignItems: 'center', flexWrap: 'wrap' });
	const panes = document.createElement('div');
	Object.assign(panes.style, { flex: '1', display: 'flex', minHeight: 0 });
	const left = wrap.container();
	Object.assign(left.style, { position: 'relative', flex: '1 1 50%', width: '50%', height: '100%', inset: 'auto' });
	panes.append(left);
	flatCv = document.createElement('canvas');
	Object.assign(flatCv.style, { flex: '1 1 50%', width: '50%', height: '100%', minWidth: 0, touchAction: 'none' });
	panes.append(flatCv);
	const buttons = {};
	const setTool = (t) => { tool = t; for (const k of ['look', 'line', 'stones']) buttons[k].style.outline = k === t ? '2px solid #00d1ff' : ''; wrap.controls().enabled = t === 'look'; }; // only Look turns the view
	const btn = (key, label, fn) => { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; Object.assign(b.style, { padding: '4px 9px', color: '#111', background: '#e8e8ea', border: '1px solid #888', borderRadius: '4px', font: '13px sans-serif', cursor: 'pointer' }); buttons[key] = b; bar.append(b); };
	btn('look', 'Look', () => setTool('look'));
	btn('line', 'Draw line', () => setTool('line'));
	btn('stones', 'Draw stones', () => setTool('stones'));
	btn('grid', '50 mm grid', paintGrid);
	btn('project', 'Project design from this view', () => project());
	btn('file', 'Project an image...', () => {
		const f = document.createElement('input');
		f.type = 'file'; f.accept = 'image/*';
		f.onchange = async () => { const b = await createImageBitmap(f.files[0]), S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const k = Math.min(S / b.width, S / b.height); c.getContext('2d').drawImage(b, (S - b.width * k) / 2, (S - b.height * k) / 2, b.width * k, b.height * k); project(c); };
		f.click();
	});
	btn('clear', 'Clear', clearArt);
	const pose = document.createElement('select');
	for (const p of ['a-pose', 'standing', 'passe', 'lunge-arms-up', 'stag-jump', 'back-arched']) pose.add(new Option(p, p));
	pose.onchange = () => setPose(pose.value);
	bar.append(pose);
	btn('pdf', 'Export true-size PDF', async () => { buttons.pdf.textContent = 'Saved: ' + await savePDF(); });
	box.append(bar, panes);
	document.body.append(box);
	setTool('look');
	new ResizeObserver(drawFlat).observe(flatCv);
}

async function setPose(pose) {
	wrap.hide();
	window.app.exec({ op: 'body.set', pose });
	await wait(1800);
	const r = await showOn3D();
	bindMeshes(r.cells);
	flat.cells = r.cells;
	flat.place();
	placeStones();
	refresh();
}

async function boot() {
	while (!window.app?.engine?.body?.bodies) await wait(200);
	await wait(1500);
	await wrap.start('high', 'long', '#e9e6dd');
	window.app.exec({ op: 'body.set', finish: 'Athlete skin, light' });
	view3d = wrap.scene();
	const data = await (await fetch(`/__fs/captures/${FILE}.json`)).json();
	buildSheets(data.cells);
	const r = await showOn3D();
	bindMeshes(r.cells);
	flat = new FlatLink(r.cells);
	buildPanel();
	Object.defineProperty(window.app.engine.overlay.group, 'visible', { get: () => false, set() {} }); // the app's editing lines belong to its own pieces
	wire();
	refresh();
	Object.assign(link, { flat: () => flat, sheets: () => sheets, paintGrid, project, clearArt, setPose, savePDF, evaluate, drawRing, paintRing: (y) => { for (const st of drawRing(y)) if (st.points.length > 1) paintStroke(st); refresh(); }, ready: true });
}

// ---- the stage's measurements --------------------------------------------------------------------------------------------

// A line round the waist as a designer might draw it: from inside the body straight out at each angle.
function drawRing(y = 1.03, step = 1) {
	const hits = [];
	const dir = new THREE.Vector3(), from = new THREE.Vector3(0, y, 0);
	for (let a = 0; a <= 360; a += step) {
		dir.set(Math.cos((a * Math.PI) / 180), 0, Math.sin((a * Math.PI) / 180));
		ray.set(from, dir);
		const h = ray.intersectObjects(meshes, false)[0];
		if (!h) continue;
		const I = h.object.geometry.index.array, t = h.faceIndex * 3, b = new THREE.Vector3();
		THREE.Triangle.getBarycoord(h.point, ...[0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(h.object.geometry.attributes.position, I[t + k])), b);
		hits.push(flat.flatOf(h.object.userData.index, t, [b.x, b.y, b.z]));
	}
	return flat.strokes(hits);
}
async function evaluate() {
	const out = { poses: {} };
	for (const pose of ['a-pose', 'standing', 'lunge-arms-up', 'stag-jump', 'back-arched']) {
		await setPose(pose);
		const gaps = flat.seamGaps();
		const errs = [], offs = [];
		let other = 0, n = 0;
		for (const s of sheets.values()) for (let k = 0; k < 500; k++) {
			const u = s.u0 + s.w * Math.random(), v = s.v0 + s.h * Math.random(), on = flat.toBody(s.piece, u, v);
			if (!on) continue;
			n++;
			const back = flat.toFlat(on.p);
			if (back.piece !== s.piece) { other++; offs.push(back.off * 1000); continue; }
			errs.push(Math.hypot(back.u - u, back.v - v) * 1000);
		}
		errs.sort((a, b) => a - b);
		const pc = (q) => +(errs[Math.floor(q * (errs.length - 1))] ?? 0).toFixed(3);
		out.poses[pose] = { seamMaxMm: +(gaps.max * 1000).toFixed(3), seamPairs: gaps.pairs, roundTrip: { samples: n, medianMm: pc(0.5), p99Mm: pc(0.99), maxMm: pc(1), share05: +(errs.filter((e) => e < 0.5).length / errs.length).toFixed(4), landedOnOtherPiece: other } };
	}
	await setPose('a-pose');
	const ring = drawRing();
	out.ring = {
		strokes: ring.map((s) => ({ piece: s.piece, points: s.points.length })),
		seamJumpsMm: ring.slice(0, -1).map((s, i) => (s.seamEnd && ring[i + 1].seamStart ? +(Math.hypot(...s.seamEnd.map((v, k) => v - ring[i + 1].seamStart[k])) * 1000).toFixed(3) : null)),
		// how far the crossing lies from the line itself: its height against the ring's, which is level by construction
		crossingHeightMm: ring.slice(0, -1).map((s) => (s.seamEnd ? +((s.seamEnd[1] - 1.03) * 1000).toFixed(2) : null)),
	};
	out.sheets = [...sheets.values()].map((s) => ({ piece: s.piece, px: [s.cv.width, s.cv.height], mm: [+(s.w * 1000).toFixed(2), +(s.h * 1000).toFixed(2)], perimeterMm: +(s.outline.reduce((L, p, i) => { const q = s.outline[(i + 1) % s.outline.length]; return L + Math.hypot(p[0] - q[0], p[1] - q[1]); }, 0) * 1000).toFixed(1) }));
	await fetch('/__fs/captures/wrap-link-eval.json', { method: 'POST', body: JSON.stringify(out, null, 1) });
	return out;
}

boot();
