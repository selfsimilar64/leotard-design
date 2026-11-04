// Looking at a flat block wrapped onto the body (knowledge/product/roadmap/flat-and-3d-exploration-plan.md,
// stage 3), from the console of a tab nobody is working in: it opens its own design.
//   const w = await import('/src/dev/wrap-eval.js');
//   await w.exportSeed();                     // what pipeline/wrap_block.py starts from
//   await w.show('wrap-XS-block', 'fabric');  // the solve's output on the body: 'fabric', 'grid' or 'stretch'
//   w.hide();                                 // back to the app's own build
// Each point of the wrapped pieces is a host triangle and weights on the body's surface, the same coordinates
// the app's own pieces use, so GarmentView places them and they follow the body and pose.
// The app's own fitted garments (render/fitted.js) are this show/cover/finish grown up: change one, look at the other.
import * as THREE from 'three';
import { TRIMS, resample, smoothLoop, buildGeometry } from '../garment/trim.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const post = (file, body) => fetch('/__fs/captures/' + file, { method: 'POST', body });

export async function start(leg = 'high', sleeves = 'long', colour = '#c9c6bd', size = 'young') {
	const app = window.app;
	app.new('Wrap eval');
	app.exec({ op: 'body.set', size, pose: 'a-pose' });
	await wait(2500);
	app.exec({ op: 'block.apply', neck: 'crew', back: 'crew', sleeves, leg, armhole: 'set-in', yoke: 'none', waist: 'none', colour });
	await wait(2500);
	await app.engine.whenFlat();
}

export async function exportSeed(size = 'young', suffix = '') {
	await start('high', 'long', '#c9c6bd', size);
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
		pieces.push({ panel: panel.name, mirror: panel.mirror, I: [...I], P: [...c.mesh.geometry.attributes.position.array].map((x) => +x.toFixed(5)), uv: [...uv].map((x) => +x.toFixed(5)), loop });
	}
	// the surface of this body: the garment's own, where one is on, so that fabric still bridges its hollows
	const G = man.garmentPos ?? surf.P, lm = man.bodies[size].landmarks;
	await post(`wrap-seed${suffix}.json`, JSON.stringify({ pieces }));
	await post(`wrap-body${suffix}.json`, JSON.stringify({ P: [...G].map((x) => +x.toFixed(5)), idx: [...surf.idx], wArm: [...man.wArm].map((x) => +x.toFixed(3)), refLm: lm }));
	return measureBody(G, man, lm);
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
	const zones = window.app.engine.wrinkleZones().N;
	zones[0].w = 1;
	window.app.engine.setWrinklePose(window.app.doc.body.pose);
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
// The block is placed by the body's own current arrays, as the app's pieces are, so it follows the pose, with the body told where the
// block's fabric is: a pose only slides and lifts what is covered, so a block reaching past the app's own cut went jagged at its edge.
export async function show(file, mode = 'fabric', opts = {}) {
	const app = window.app, view = app.engine.views[0];
	hide();
	const data = await (await fetch('/__fs/captures/' + file + '.json')).json();
	const panels = new Map(app.doc.panels.map((p) => [p.name, p.id]));
	flat ??= grid();
	cover(app.engine, data.cells);
	const area = { pieces: {} };
	for (const c of data.cells) {
		const n = c.hostW.length / 3, geo = new THREE.BufferGeometry();
		const A = (name, size) => geo.setAttribute(name, new THREE.BufferAttribute(new Float32Array(n * size), size));
		A('position', 3); A('normal', 3); A('tangent', 4); A('aLift', 3); A('aFold', 3); A('aGNormal', 3); A('aAO', 1); A('aRef', 3); A('aKeep', 1); A('aForm', 2); A('aZone', 2); A('aUV', 2); A('aGrad', 1);
		geo.setAttribute('aSeam', new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
		geo.setAttribute('aCover', new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
		geo.setIndex(new THREE.BufferAttribute(Uint32Array.from(c.I), 1));
		geo.attributes.aUV.array.set(c.uv);
		const uv = new Float32Array(n * 2);
		for (let i = 0; i < n * 2; i++) uv[i] = c.uv[i] * 2; // one tile of the grid is half a metre
		geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
		const material = opts.material ? opts.material(c) : mode === 'fabric' ? view.material(panels.get(c.name) ?? panels.get('Front'))
			: mode === 'grid' ? new THREE.MeshStandardMaterial({ map: flat, roughness: 0.7, side: THREE.DoubleSide })
				: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide });
		const mesh = new THREE.Mesh(geo, material);
		mesh.frustumCulled = false;
		mesh.userData.name = c.name;
		mesh.userData.cell = c;
		view.interpolate({ mesh, hosts: { i: Uint32Array.from(c.hostI), w: Float32Array.from(c.hostW) } });
		// on the garment surface, clear of the skin
		const Pos = geo.attributes.position.array, Nrm = geo.attributes.normal.array, G = app.engine.body.garmentPos, hi = c.hostI, hw = c.hostW;
		for (let l = 0; l < n; l++) for (let k = 0; k < 3; k++) {
			let v = 0;
			for (let j = 0; j < 3; j++) v += hw[l * 3 + j] * G[hi[l * 3 + j] * 3 + k];
			Pos[l * 3 + k] = v + Nrm[l * 3 + k] * 0.0012;
		}
		// the garment surface already holds the lift: the fabric shader would add it again (materials/fabric.js)
		if (mode === 'fabric' && !opts.material) {
			geo.attributes.aLift.array.fill(0);
			if (c.fold) geo.attributes.aFold.array.set(c.fold); // the settled standing fit's (pipeline/wrap_block.py folds): a carried-over fit's strain in a pose is not fit to draw folds from
		}
		if (mode === 'stretch') stretchColours(geo);
		view.group.add(mesh);
		added.push(mesh);
	}
	if (mode === 'fabric' && !opts.material && !opts.bare) finish(data, view);
	// its folds come from the fit (aFold), not the app's fixed zones
	for (const n of app.engine.wrinkleZones().N) n.w = 0;
	for (const c of view.cells) c.mesh.visible = false;
	hideRims(app.engine, true);
	app.engine.viewport.frame();
	return { cells: data.cells, meshes: added, mode };
}

// A pose's garment surface, solved for this block's own cover, for pipeline/pose_resolve.py.
export async function exportPose(file, pose, key = 'young') {
	window.app.exec({ op: 'body.set', size: key, pose });
	await wait(3000);
	await show(file, 'fabric');
	await wait(3000);
	await post(`wrap-pose-${key}-${pose}.json`, JSON.stringify({ P: [...window.app.engine.body.garmentPos].map((x) => +x.toFixed(5)) }));
}

export async function shoot(name, view = 'front', opts = {}) { return window.app.capture(name, { view, width: 900, height: 1100, ...opts }); }

// How far the wrapped cloth is from its flat size where it now lies, per piece: across and along the flat piece's axes
// (1 = its flat size), and the share of triangles turned over. Reads what show() last placed.
export function strain() {
	const out = {};
	for (const m of added) {
		if (!m.userData.cell) continue; // a finished edge, not a piece
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

// The block's openings finished as the app finishes its own (render/rims.js builds these from the app's cut): turned elastic in the
// fabric's own look, along the loops pipeline/wrap_block.py exports, on the body's current garment surface (so in a pose too).
function finish(data, view) {
	const app = window.app, G = app.engine.body.garmentPos, L = app.engine.layers.values().next().value, prof = TRIMS.elastic.profile, built = [];
	const at = (I, W, i, out) => { out.set(0, 0, 0); for (let j = 0; j < 3; j++) { const v = I[i * 3 + j] * 3, w = W[i * 3 + j]; out.x += w * G[v]; out.y += w * G[v + 1]; out.z += w * G[v + 2]; } return out; };
	const man = app.engine.body, GN = man.aGNormal.array;
	const nrm = (I, W, i) => { const o = new THREE.Vector3(); for (let j = 0; j < 3; j++) { const v = I[i * 3 + j] * 3, w = W[i * 3 + j]; o.x += w * GN[v]; o.y += w * GN[v + 1]; o.z += w * GN[v + 2]; } return o.normalize(); };
	for (const o of data.openings ?? []) {
		const n = o.hostW.length / 3, recs = [];
		for (let i = 0; i < n; i++) {
			const p = at(o.hostI, o.hostW, i, new THREE.Vector3()), q = at(o.inI, o.inW, i, new THREE.Vector3()), nn = nrm(o.hostI, o.hostW, i);
			const inside = q.sub(p); inside.addScaledVector(nn, -inside.dot(nn)).normalize();
			recs.push({ p, n: nn, inside, kappa: 0, ref: p.clone(), keep: 1, sleeve: 0 });
		}
		const { pts, length } = resample(recs), m = pts.length, P = pts.map((a) => a.p), Nn = pts.map((a) => a.n), In = pts.map((a) => a.inside);
		smoothLoop(P, 3, 2, true); smoothLoop(Nn, 4, 2, true); smoothLoop(In, 4, 1, true);
		const frames = [], scale = [];
		for (let i = 0; i < m; i++) {
			const nn = Nn[i].normalize(), t = P[(i + 1) % m].clone().sub(P[(i - 1 + m) % m]).normalize(), d = new THREE.Vector3().crossVectors(nn, t).normalize();
			if (d.dot(In[i]) < 0) d.negate();
			frames.push({ p: P[i].addScaledVector(nn, 0.0012), n: nn, d, kap: 0 });
			scale.push(1);
		}
		built.push({ frames, scale, pts, length });
	}
	if (!built.length) return;
	const panel = app.doc.panels.find((p) => p.name === 'Front'), s = panel.stack[0];
	const mesh = new THREE.Mesh(buildGeometry(built, prof), L.rims.material({ kind: 'elastic', fabric: s.fabric, colour: s.colour, second: s.second ?? 'Tone-on-tone' }));
	mesh.renderOrder = -4;
	mesh.frustumCulled = false;
	view.group.add(mesh);
	added.push(mesh);
}

// What the side-by-side view (dev/wrap-link.js) needs of the app.
export const camera = () => window.app.engine.viewport.camera;
export const canvas = () => window.app.engine.viewport.renderer.domElement;
export const controls = () => window.app.engine.viewport.controls;
export const container = () => window.app.engine.viewport.container;
export const scene = () => window.app.engine.viewport.scene;


// Tape measures of a body's garment surface, millimetres, for pipeline/draft_block.py: girths as a tape lies (the hull of a
// level slice of the torso), lengths along the centre lines and the side.
export function measureBody(G, man, lm) {
	const idx = man.idx, wArm = man.wArm, wHead = man.wHead, N = man.vertices;
	const slicePts = (axis, value, keep) => {
		const out = [];
		for (let t = 0; t < idx.length; t += 3) {
			const v = [idx[t], idx[t + 1], idx[t + 2]];
			if (!keep(v)) continue;
			const hits = [];
			for (let k = 0; k < 3; k++) {
				const a = v[k] * 3, b = v[(k + 1) % 3] * 3, da = G[a + axis] - value, db = G[b + axis] - value;
				if ((da < 0) !== (db < 0)) { const u = da / (da - db); hits.push([G[a] + (G[b] - G[a]) * u, G[a + 1] + (G[b + 1] - G[a + 1]) * u, G[a + 2] + (G[b + 2] - G[a + 2]) * u]); }
			}
			if (hits.length === 2) out.push(hits);
		}
		return out;
	};
	const hull = (pts) => {
		const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), L = [], U = [];
		for (const q of p) { while (L.length > 1 && cr(L[L.length - 2], L[L.length - 1], q) <= 0) L.pop(); L.push(q); }
		for (const q of p.reverse()) { while (U.length > 1 && cr(U[U.length - 2], U[U.length - 1], q) <= 0) U.pop(); U.push(q); }
		const h = L.slice(0, -1).concat(U.slice(0, -1));
		return h.reduce((s, a, i) => s + Math.hypot(a[0] - h[(i + 1) % h.length][0], a[1] - h[(i + 1) % h.length][1]), 0);
	};
	const torso = (v) => v.every((i) => wArm[i] < 0.3 && wHead[i] < 0.5);
	const girth = (y) => { const s = slicePts(1, y, torso).flat().map((q) => [q[0], q[2]]); return s.length > 8 ? hull(s) : 0; };
	const widthAt = (y) => { const s = slicePts(1, y, torso).flat(); return s.length ? Math.max(...s.map((q) => q[0])) : 0; };
	// the centre line: x = 0, walked by height on each side
	const centre = slicePts(0, 0, (v) => v.every((i) => wHead[i] < 0.5 && wArm[i] < 0.3)).flat().map((q) => [q[1], q[2]]);
	const crotch = Math.min(...centre.map((q) => q[0]));
	const zMid = (a) => a.reduce((s, q) => s + q[1], 0) / a.length;
	const mid = zMid(centre);
	const line = (front) => centre.filter((q) => (q[1] > mid) === front || q[0] < crotch + 0.012).sort((a, b) => a[0] - b[0]);
	const smoothArc = (pts, top) => {
		// a running arc over height bands, so the mesh's own zigzag adds nothing
		let s = 0, last = null;
		for (let y = crotch; y <= top; y += 0.008) {
			const band = pts.filter((q) => Math.abs(q[0] - y) < 0.006);
			if (!band.length) continue;
			const c = [y, band.reduce((a, q) => a + q[1], 0) / band.length];
			if (last) s += Math.hypot(c[0] - last[0], c[1] - last[1]);
			last = c;
		}
		return s;
	};
	const F = line(true), B = line(false), neck = lm.neck_base[1], sh = lm.shoulder_l;
	const waistY = (() => { let best = lm.waist[1], least = 1e9; for (let y = lm.pelvis[1] + 0.03; y < lm.chest[1]; y += 0.004) { const g = girth(y); if (g && g < least) { least = g; best = y; } } return best; })();
	const hipY = (() => { let best = crotch + 0.045 * lm.head_top[1], most = 0; for (let y = crotch + 0.045 * lm.head_top[1]; y < waistY - 0.03; y += 0.004) { const g = girth(y); if (g > most) { most = g; best = y; } } return best; })();
	let armpit = sh[1], pts = [];
	for (let i = 0; i < N; i++) if (wArm[i] > 0.4 && wArm[i] < 0.6 && G[i * 3] > 0.03) { armpit = Math.min(armpit, G[i * 3 + 1]); }
	const bustY = (() => { let best = lm.chest[1], most = 0; for (let i = 0; i < N; i++) { const y = G[i * 3 + 1]; if (y > waistY + 0.45 * (armpit - waistY) && y < armpit && wArm[i] < 0.2 && G[i * 3 + 2] > most) { most = G[i * 3 + 2]; best = y; } } return best; })();
	const neckGirth = (() => { const s = slicePts(1, neck + 0.012, (v) => v.every((i) => wArm[i] < 0.1)).flat().map((q) => [q[0], q[2]]); return hull(s); })();
	const neckW = (() => { const s = slicePts(1, neck + 0.012, (v) => v.every((i) => wArm[i] < 0.1)).flat(); return Math.max(...s.map((q) => q[0])); })();
	const highAt = (x) => { let y = -1; for (let i = 0; i < N; i++) if (Math.abs(G[i * 3] - x) < 0.006 && Math.abs(G[i * 3 + 2] - sh[2]) < 0.02 && wHead[i] < 0.3) y = Math.max(y, G[i * 3 + 1]); return y; };
	const tip = sh[0] * 1.08;
	// round the arm: slices square to it are done on a point cloud between two planes
	const arm = [lm.wrist_l[0] - sh[0], lm.wrist_l[1] - sh[1], lm.wrist_l[2] - sh[2]], armLen = Math.hypot(...arm), ax = arm.map((v) => v / armLen);
	const uAxis = [ax[1], -ax[0], 0], uL = Math.hypot(...uAxis), u = uAxis.map((v) => v / uL), w = [ax[1] * u[2] - ax[2] * u[1], ax[2] * u[0] - ax[0] * u[2], ax[0] * u[1] - ax[1] * u[0]];
	const armGirth = (t) => {
		const q = [];
		for (let i = 0; i < N; i++) {
			if (wArm[i] < 0.6 || G[i * 3] < 0) continue;
			const d = [G[i * 3] - sh[0], G[i * 3 + 1] - sh[1], G[i * 3 + 2] - sh[2]], along = d[0] * ax[0] + d[1] * ax[1] + d[2] * ax[2];
			if (Math.abs(along - t * armLen) < 0.006) q.push([d[0] * u[0] + d[1] * u[1] + d[2] * u[2], d[0] * w[0] + d[1] * w[1] + d[2] * w[2]]);
		}
		return q.length > 6 ? hull(q) : 0;
	};
	const mm = (v) => +(v * 1000).toFixed(1);
	const elbow = lm.elbow_l, dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
	return {
		height: mm(lm.head_top[1]), bust: mm(girth(bustY)), waist: mm(girth(waistY)), hip: mm(girth(hipY)), neck: mm(neckGirth), neckHalfWidth: mm(neckW), shoulderX: mm(tip),
		shoulderDrop: mm(highAt(neckW) - highAt(tip)), bustHalfWidth: mm(widthAt(bustY)),
		front: { neck: mm(smoothArc(F, neck)), armpit: mm(smoothArc(F, armpit)) }, back: { neck: mm(smoothArc(B, neck)), armpit: mm(smoothArc(B, armpit)) },
		side: { bust: mm(armpit - bustY), waist: mm(armpit - waistY), hip: mm(armpit - hipY), crotch: mm(armpit - crotch) },
		armLength: mm(dist(sh, elbow) + dist(elbow, lm.wrist_l)), bicep: mm(armGirth(0.28)), forearm: mm(armGirth(0.62)), wrist: mm(armGirth(0.97)),
		levels: { crotch: +crotch.toFixed(4), hip: +hipY.toFixed(4), waist: +waistY.toFixed(4), bust: +bustY.toFixed(4), armpit: +armpit.toFixed(4), neck: +neck.toFixed(4) },
	};
}

// Export every body's surface, seed and measurements.
export async function exportBodies(keys = ['young', 'adult', 'older-teen', 'teen', 'child', 'child-6']) {
	const out = {};
	for (const k of keys) out[k] = await exportSeed(k, '-' + k);
	await post('wrap-measures.json', JSON.stringify(out, null, 1));
	return out;
}
