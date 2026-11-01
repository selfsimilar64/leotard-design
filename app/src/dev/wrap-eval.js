// Looking at a flat block wrapped onto the body (knowledge/product/roadmap/flat-and-3d-exploration-plan.md,
// stage 3), from the console of a tab nobody is working in: it opens its own design.
//   const w = await import('/src/dev/wrap-eval.js');
//   await w.exportSeed();                     // what pipeline/wrap_block.py starts from
//   await w.show('wrap-XS-block', 'fabric');  // the solve's output on the body: 'fabric', 'grid' or 'stretch'
//   w.hide();                                 // back to the app's own build
// Each point of the wrapped pieces is a host triangle and weights on the body's surface, the same coordinates
// the app's own pieces use, so GarmentView places them and they follow the body and pose.
import * as THREE from 'three';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const post = (file, body) => fetch('/__fs/captures/' + file, { method: 'POST', body });

export async function start(leg = 'high', sleeves = 'long', colour = '#c9c6bd') {
	const app = window.app;
	app.new('Wrap eval');
	app.exec({ op: 'body.set', size: 'young', pose: 'a-pose' });
	await wait(2500);
	app.exec({ op: 'block.apply', neck: 'crew', back: 'crew', sleeves, leg, armhole: 'set-in', yoke: 'none', waist: 'none', colour });
	await wait(2500);
	await app.engine.whenFlat();
}

export async function exportSeed() {
	await start();
	const app = window.app, e = app.engine, surf = e.surf, man = e.body;
	const name = (id) => { const b = id.replace(/~m$/, ''); return (app.doc.curves.find((c) => c.id === b)?.name ?? b) + (id.endsWith('~m') ? '~m' : ''); };
	const pieces = [];
	for (const v of e.views) for (const c of v.cells) {
		const panel = app.doc.panels.find((p) => p.id === c.panelId), arr = v.g.arr, I = c.piece.I, uv = c.mesh.geometry.attributes.aUV.array, verts = c.piece.verts, n = uv.length / 2;
		const count = new Map(), dir = new Map();
		for (let t = 0; t < I.length / 3; t++) for (let k = 0; k < 3; k++) { const a = I[t * 3 + k], b = I[t * 3 + (k + 1) % 3], q = a < b ? a * n + b : b * n + a; count.set(q, (count.get(q) ?? 0) + 1); dir.set(q, [a, b]); }
		const next = new Map();
		for (const [q, x] of count) if (x === 1) { const [a, b] = dir.get(q); next.set(a, b); }
		const s = next.keys().next().value, loop = [];
		let u = s;
		do { const w = next.get(u), cs = arr.constraint.get(arr.ekey(verts[u], verts[w])); loop.push([u, cs ? [...cs].map(name).sort().join('+') : '']); u = w; } while (u !== s);
		pieces.push({ panel: panel.name, mirror: panel.mirror, I: [...I], P: [...c.piece.P].map((x) => +x.toFixed(5)), uv: [...uv].map((x) => +x.toFixed(5)), loop });
	}
	await post('wrap-seed.json', JSON.stringify({ pieces }));
	await post('wrap-body.json', JSON.stringify({ P: [...surf.P].map((x) => +x.toFixed(5)), idx: [...surf.idx], wArm: [...man.wArm].map((x) => +x.toFixed(3)), crotchY: man.crotchY, refLm: man.refLm }));
}

let added = [], flat = null, hook = null;

// The body lifts and slides its surface where fabric is: tell it where this block's fabric is, or skin shows through past
// the app's own pieces (the engine's cover hooks are how straps do the same).
function cover(engine, cells) {
	uncover(engine);
	const on = new Set(cells.flatMap((c) => c.hostI));
	hook = (C) => { for (const v of on) C[v] = 1; };
	(engine.coverHooks ??= []).push(hook);
	engine.updateCover(window.app.doc);
}
function uncover(engine) {
	if (!hook) return;
	engine.coverHooks.splice(engine.coverHooks.indexOf(hook), 1);
	hook = null;
	engine.updateCover(window.app.doc);
}

export function hide() {
	const view = window.app.engine.views[0];
	for (const m of added) { view.group.remove(m); m.geometry.dispose(); }
	added = [];
	for (const c of view.cells) c.mesh.visible = true;
	hideRims(window.app.engine, false);
	uncover(window.app.engine);
	window.app.engine.viewport.frame();
}

// The app's own finished edges belong to its own pieces and would float over the block.
function hideRims(engine, hidden) {
	for (const L of engine.layers.values()) L.rims.group.visible = !hidden;
}

function grid() {
	const c = document.createElement('canvas');
	c.width = c.height = 512;
	const x = c.getContext('2d');
	x.fillStyle = '#efece4'; x.fillRect(0, 0, 512, 512);
	x.strokeStyle = '#3a3a3a'; x.lineWidth = 3;
	for (let i = 0; i <= 512; i += 102.4) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 512); x.moveTo(0, i); x.lineTo(512, i); x.stroke(); }
	x.strokeStyle = '#b02a2a'; x.lineWidth = 7;
	x.beginPath(); x.moveTo(0, 0); x.lineTo(0, 512); x.moveTo(0, 0); x.lineTo(512, 0); x.stroke();
	const t = new THREE.CanvasTexture(c);
	t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
	return t;
}

// Colour by how far the cloth is stretched at each point: white at the flat size, red at 50% larger, blue where compressed.
function stretchColours(geo) {
	const P = geo.attributes.position.array, U = geo.attributes.aUV.array, I = geo.index.array, n = P.length / 3;
	const sum = new Float32Array(n), cnt = new Float32Array(n);
	for (let t = 0; t < I.length; t += 3) {
		const [a, b, c] = [I[t], I[t + 1], I[t + 2]];
		const area3 = new THREE.Vector3(P[b * 3] - P[a * 3], P[b * 3 + 1] - P[a * 3 + 1], P[b * 3 + 2] - P[a * 3 + 2]).cross(new THREE.Vector3(P[c * 3] - P[a * 3], P[c * 3 + 1] - P[a * 3 + 1], P[c * 3 + 2] - P[a * 3 + 2])).length() / 2;
		const area2 = Math.abs((U[b * 2] - U[a * 2]) * (U[c * 2 + 1] - U[a * 2 + 1]) - (U[c * 2] - U[a * 2]) * (U[b * 2 + 1] - U[a * 2 + 1])) / 2;
		const s = area3 / Math.max(area2, 1e-9);
		for (const v of [a, b, c]) { sum[v] += s; cnt[v]++; }
	}
	const C = new Float32Array(n * 3);
	for (let i = 0; i < n; i++) {
		const s = sum[i] / Math.max(cnt[i], 1), up = THREE.MathUtils.clamp((s - 1) / 0.6, 0, 1), down = THREE.MathUtils.clamp((1 - s) / 0.3, 0, 1);
		C[i * 3] = 1 - down; C[i * 3 + 1] = 1 - up - down * 0.6; C[i * 3 + 2] = 1 - up;
	}
	geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
}

// mode: 'fabric' (the block on the app's own material), 'grid' (a 10 cm square grid drawn on the flat piece, red at its
// origin) or 'stretch' (area stretch). The block's pieces take the place of the app's own, which stay in the document.
// opts.onSkin: place the block by the body's own current arrays, as the app's pieces are, so it follows the pose; it then
// sits on the skin wherever the app's own pieces don't cover.
export async function show(file, mode = 'fabric', opts = {}) {
	const app = window.app, view = app.engine.views[0];
	hide();
	const data = await (await fetch('/__fs/captures/' + file + '.json')).json();
	const panels = new Map(app.doc.panels.map((p) => [p.name, p.id]));
	flat ??= grid();
	if (opts.onSkin) cover(app.engine, data.cells);
	const area = { pieces: {} };
	for (const c of data.cells) {
		const n = c.hostW.length / 3, geo = new THREE.BufferGeometry();
		const A = (name, size) => geo.setAttribute(name, new THREE.BufferAttribute(new Float32Array(n * size), size));
		A('position', 3); A('normal', 3); A('tangent', 4); A('aLift', 3); A('aGNormal', 3); A('aAO', 1); A('aRef', 3); A('aKeep', 1); A('aForm', 2); A('aZone', 2); A('aUV', 2); A('aGrad', 1);
		geo.setAttribute('aSeam', new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
		geo.setAttribute('aCover', new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
		geo.setIndex(new THREE.BufferAttribute(Uint32Array.from(c.I), 1));
		geo.attributes.aUV.array.set(c.uv);
		const uv = new Float32Array(n * 2);
		for (let i = 0; i < n * 2; i++) uv[i] = c.uv[i] * 2; // one tile of the grid is half a metre
		geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
		const material = mode === 'fabric' ? view.material(panels.get(c.name) ?? panels.get('Front'))
			: mode === 'grid' ? new THREE.MeshStandardMaterial({ map: flat, roughness: 0.7, side: THREE.DoubleSide })
				: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide });
		const mesh = new THREE.Mesh(geo, material);
		mesh.frustumCulled = false;
		mesh.userData.name = c.name;
		view.interpolate({ mesh, hosts: { i: Uint32Array.from(c.hostI), w: Float32Array.from(c.hostW) } });
		// on the garment surface, clear of the skin: this block covers more than the app's own pieces, whose
		// cover is all the body has lifted for (standing body only; a pose would need the lift solved for this block)
		const Pos = geo.attributes.position.array, Nrm = geo.attributes.normal.array, G = app.engine.surf.P, hi = c.hostI, hw = c.hostW;
		for (let l = 0; l < n; l++) for (let k = 0; k < 3; k++) {
			let v = Pos[l * 3 + k];
			if (!opts.onSkin) { v = 0; for (let j = 0; j < 3; j++) v += hw[l * 3 + j] * G[hi[l * 3 + j] * 3 + k]; }
			Pos[l * 3 + k] = v + Nrm[l * 3 + k] * 0.0012;
		}
		if (mode === 'stretch') stretchColours(geo);
		view.group.add(mesh);
		added.push(mesh);
	}
	for (const c of view.cells) c.mesh.visible = false;
	hideRims(app.engine, true);
	app.engine.viewport.frame();
	return { cells: data.cells.length, mode };
}

export async function shoot(name, view = 'front', opts = {}) { return window.app.capture(name, { view, width: 900, height: 1100, ...opts }); }

// How far the wrapped cloth is from its flat size where it now lies, per piece: across and along the flat piece's axes
// (1 = its flat size), and the share of triangles turned over. Reads what show() last placed.
export function strain() {
	const out = {};
	for (const m of added) {
		const P = m.geometry.attributes.position.array, U = m.geometry.attributes.aUV.array, I = m.geometry.index.array, across = [], along = [];
		for (let t = 0; t < I.length; t += 3) {
			const [a, b, c] = [I[t], I[t + 1], I[t + 2]];
			const du1 = U[b * 2] - U[a * 2], dv1 = U[b * 2 + 1] - U[a * 2 + 1], du2 = U[c * 2] - U[a * 2], dv2 = U[c * 2 + 1] - U[a * 2 + 1], det = du1 * dv2 - du2 * dv1;
			if (Math.abs(det) < 1e-10) continue;
			const e1 = [0, 1, 2].map((k) => P[b * 3 + k] - P[a * 3 + k]), e2 = [0, 1, 2].map((k) => P[c * 3 + k] - P[a * 3 + k]);
			const fu = e1.map((v, k) => (v * dv2 - e2[k] * dv1) / det), fv = e1.map((v, k) => (e2[k] * du1 - v * du2) / det);
			across.push(Math.hypot(...fu)); along.push(Math.hypot(...fv));
		}
		const pc = (A, q) => { const s = [...A].sort((x, y) => x - y); return +s[Math.floor(q * (s.length - 1))].toFixed(2); };
		const key = m.userData.name;
		if (out[key]) continue; // the mirrored half reads the same
		out[key] = { across: [pc(across, 0.02), pc(across, 0.5), pc(across, 0.98)], along: [pc(along, 0.02), pc(along, 0.5), pc(along, 0.98)] };
	}
	return out;
}
