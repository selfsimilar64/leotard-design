// Fabric swatch thumbnails for the pickers: a rippled square of cloth (17 cm) over a skin-toned
// backing (so sheer fabrics read as sheer), drawn with the real fabric shader under the current
// light rig's environment plus a key light, into a float target and tone-mapped on the CPU
// (same Khronos PBR Neutral curve as the viewport). Turning frames (the cloth rocking a few
// degrees) show sparkle and colour shift when the pointer rests on a swatch. Cached per look.
// (Used by app.swatchSheet. The material picker's tiles are pre-rendered: clothThumb below.)
import * as THREE from 'three';
import { createFabricMaterial, applyFabric, applyTexture } from './fabric.js';

const PX = 96, SS = 2, SIZE = 0.17;
let rig = null;
const cache = new Map();

function cloth() {
	const n = 64, pos = [], nrm = [], uv = [], idx = [];
	const h = (x, y) => 0.006 * Math.sin(x * 52 + 0.6) * (0.7 + 0.3 * Math.cos(y * 31)) + 0.003 * Math.sin(y * 70 + x * 20);
	for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
		const x = (i / n - 0.5) * SIZE, y = (j / n - 0.5) * SIZE, e = 1e-4;
		const dx = (h(x + e, y) - h(x - e, y)) / (2 * e), dy = (h(x, y + e) - h(x, y - e)) / (2 * e), L = Math.hypot(dx, dy, 1);
		pos.push(x, y, h(x, y)); nrm.push(-dx / L, -dy / L, 1 / L); uv.push(x, y);
	}
	for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i; idx.push(a, a + 1, a + n + 1, a + 1, a + n + 2, a + n + 1); }
	const g = new THREE.BufferGeometry(), N = (n + 1) * (n + 1);
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
	g.setAttribute('aGNormal', new THREE.Float32BufferAttribute(nrm, 3));
	g.setAttribute('aUV', new THREE.Float32BufferAttribute(uv, 2));
	// reference heights spanning the POC ombre's fade, so ombre fabrics show their gradient
	g.setAttribute('aRef', new THREE.Float32BufferAttribute(pos.map((v, k) => (k % 3 === 1 ? 1.07 + v * 4 : v)), 3));
	g.setAttribute('aAO', new THREE.Float32BufferAttribute(new Float32Array(N).fill(1), 1));
	g.setAttribute('aCover', new THREE.Float32BufferAttribute(new Float32Array(N).fill(1), 1));
	g.setAttribute('aKeep', new THREE.Float32BufferAttribute(new Float32Array(N).fill(1), 1));
	g.setAttribute('tangent', new THREE.Float32BufferAttribute(Array.from({ length: N }, () => [1, 0, 0, 1]).flat(), 4));
	g.setIndex(idx);
	return g;
}

function setup(renderer) {
	if (rig) return rig;
	const scene = new THREE.Scene(), geo = cloth();
	const material = createFabricMaterial(5);
	material.userData.u.uOffset.value = 0; material.userData.u.uGarment.value = 0;
	const mesh = new THREE.Mesh(geo, material);
	scene.add(mesh);
	const skin = new THREE.Mesh(new THREE.PlaneGeometry(SIZE * 1.4, SIZE * 1.4), new THREE.MeshStandardMaterial({ color: 0xd2a084, roughness: 0.55 }));
	skin.position.z = -0.012; scene.add(skin);
	const key = new THREE.PointLight(0xffffff, 0.7, 0, 2); key.position.set(-0.25, 0.3, 0.45); scene.add(key);
	const glint = new THREE.PointLight(0xffffff, 0.35, 0, 2); glint.position.set(0.3, 0.1, 0.4); scene.add(glint);
	const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 5);
	camera.position.set(0, -0.035, 0.165); camera.lookAt(0, 0, 0);
	const target = new THREE.WebGLRenderTarget(PX * SS, PX * SS, { type: THREE.FloatType });
	return (rig = { renderer, scene, mesh, material, camera, target, buf: new Float32Array(PX * SS * PX * SS * 4) });
}

// Khronos PBR Neutral, then sRGB encoding (the viewport's OutputPass does the same on the GPU).
function neutral(c) {
	const start = 0.76, desat = 0.15, x = Math.min(c[0], c[1], c[2]), off = x < 0.08 ? x - 6.25 * x * x : 0.04;
	for (let k = 0; k < 3; k++) c[k] -= off;
	const peak = Math.max(c[0], c[1], c[2]);
	if (peak < start) return c;
	const d = 1 - start, np = 1 - d * d / (peak + d - start), g = 1 - 1 / (desat * (peak - np) + 1);
	for (let k = 0; k < 3; k++) c[k] = c[k] * (np / peak) * (1 - g) + np * g;
	return c;
}
const srgb = (v) => Math.round(255 * Math.min(1, Math.max(0, v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)));

function draw(r, env, angle) {
	const { renderer, scene, mesh, camera, target, buf } = r;
	scene.environment = env;
	mesh.rotation.set(-0.2, angle, 0);
	const prev = renderer.getRenderTarget();
	renderer.setRenderTarget(target);
	renderer.setClearColor(0x000000, 0);
	renderer.clear();
	renderer.render(scene, camera);
	renderer.readRenderTargetPixels(target, 0, 0, PX * SS, PX * SS, buf);
	renderer.setRenderTarget(prev);
	const W = PX * SS, img = new ImageData(PX, PX), c = [0, 0, 0];
	for (let y = 0; y < PX; y++) for (let x = 0; x < PX; x++) {
		c[0] = c[1] = c[2] = 0;
		for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) { const o = (((PX - 1 - y) * SS + j) * W + x * SS + i) * 4; c[0] += buf[o]; c[1] += buf[o + 1]; c[2] += buf[o + 2]; }
		for (let k = 0; k < 3; k++) c[k] /= SS * SS;
		neutral(c);
		const o = (y * PX + x) * 4;
		img.data[o] = srgb(c[0]); img.data[o + 1] = srgb(c[1]); img.data[o + 2] = srgb(c[2]); img.data[o + 3] = 255;
	}
	const cv = document.createElement('canvas'); cv.width = cv.height = PX;
	cv.getContext('2d').putImageData(img, 0, 0);
	return cv.toDataURL('image/png');
}

// Thumbnail(s) of a look: { fabric, colour, second, colour2, texture (a loaded set) }.
// frames: 1 for the still, more for the rocking loop. Returns data URLs.
export function swatch(viewport, look, frames = 1) {
	const key = JSON.stringify([look.fabric, look.colour, look.second, look.colour2, look.texture?.id, frames, viewport.settings.rig]);
	const hit = cache.get(key);
	if (hit) return hit;
	const r = setup(viewport.renderer), m = r.material;
	applyFabric(m, look.fabric, look.colour ?? '#888888', look.second ?? 'Tone-on-tone', look.colour2 ?? null);
	m.userData.u.uUV.value = 1;
	applyTexture(m, look.texture ?? null, { recolour: look.texMode === 'recolour', colour: look.colour });
	const env = viewport.scene.environment, out = [];
	for (let i = 0; i < frames; i++) out.push(draw(r, env, frames === 1 ? 0.15 : 0.15 + 0.35 * Math.sin((i / frames) * Math.PI * 2)));
	cache.set(key, out);
	return out;
}

// --- picker tiles: a twisted strip of cloth ------------------------------------------------------
// The material picker's tiles (ui/FabricPicker.jsx) are pre-rendered by src/dev/thumbnails.js
// (materials) with clothThumb: a piece of cloth 24 x 17 cm, twisted a third of a turn along its length,
// gathered in the middle and softly pleated, so a tile shows the fabric face on, edge on and from
// behind (sheen, iridescence, sheerness and sparkle all change with the angle), on a plain backdrop.

const CL = 0.24, CW = 0.17;
// position of the strip at s (0..1 along) and t (-0.5..0.5 across), metres
function strip(s, t, out) {
	const th = (s - 0.5) * Math.PI * 0.65;                       // the twist
	const w = CW * (1 - 0.45 * Math.sin(Math.PI * s) ** 2);      // gathered in the middle
	const g = 0.007 * Math.sin(2 * Math.PI * (2.2 * t + 0.9 * s)) * Math.sin(Math.PI * s) ** 0.7; // folds of the gathering
	const cy = 0.018 * Math.sin(Math.PI * s * 2), cz = -0.035 * Math.cos(Math.PI * (s - 0.5)); // the strip's own curve
	const ct = Math.cos(th), st = Math.sin(th);
	return out.set((s - 0.5) * CL, cy + t * w * ct - g * st, cz + t * w * st + g * ct);
}

function twistedCloth() {
	const nu = 140, nv = 56, pos = [], nrm = [], tan = [], uv = [], ref = [], idx = [];
	const p = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), n = new THREE.Vector3(), e = 1e-4;
	for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
		const s = i / nu, t = j / nv - 0.5;
		strip(s, t, p);
		a.copy(strip(s + e, t, a)).sub(strip(s - e, t, n)).normalize();
		b.copy(strip(s, t + e, b)).sub(strip(s, t - e, n));
		n.crossVectors(a, b).normalize();
		pos.push(p.x, p.y, p.z); nrm.push(n.x, n.y, n.z); tan.push(a.x, a.y, a.z, 1);
		uv.push(s * CL, t * CW);
		ref.push(p.x, 1.07 + p.y * 4, p.z); // reference heights spanning the POC ombre's fade (see cloth())
	}
	for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const k = j * (nu + 1) + i; idx.push(k, k + 1, k + nu + 1, k + 1, k + nu + 2, k + nu + 1); }
	const g = new THREE.BufferGeometry(), N = (nu + 1) * (nv + 1);
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
	g.setAttribute('aGNormal', new THREE.Float32BufferAttribute(nrm, 3));
	g.setAttribute('tangent', new THREE.Float32BufferAttribute(tan, 4));
	g.setAttribute('aUV', new THREE.Float32BufferAttribute(uv, 2));
	g.setAttribute('aRef', new THREE.Float32BufferAttribute(ref, 3));
	g.setAttribute('aAO', new THREE.Float32BufferAttribute(new Float32Array(N).fill(1), 1));
	g.setAttribute('aCover', new THREE.Float32BufferAttribute(new Float32Array(N).fill(1), 1));
	g.setAttribute('aKeep', new THREE.Float32BufferAttribute(new Float32Array(N).fill(1), 1));
	g.setIndex(idx);
	return g;
}

let thumbRig = null;
function thumbSetup(renderer, w, h, ss) {
	if (thumbRig?.w === w && thumbRig.h === h && thumbRig.ss === ss) return thumbRig;
	thumbRig?.target.dispose();
	const scene = thumbRig?.scene ?? new THREE.Scene();
	let mesh = thumbRig?.mesh, material = thumbRig?.material;
	if (!mesh) {
		material = createFabricMaterial(5);
		material.side = THREE.DoubleSide;
		material.userData.u.uOffset.value = 0; material.userData.u.uGarment.value = 0;
		mesh = new THREE.Mesh(twistedCloth(), material);
		mesh.rotation.set(0.45, -0.2, 0.9); // the piece runs from lower left to upper right
		scene.add(mesh);
		const key = new THREE.PointLight(0xffffff, 1.6, 0, 2); key.position.set(-0.3, 0.35, 0.55); scene.add(key);
		const glint = new THREE.PointLight(0xffffff, 0.6, 0, 2); glint.position.set(0.25, -0.1, 0.5); scene.add(glint);
	}
	// centred, and framed to fill the tile
	const box = new THREE.Box3().setFromObject(mesh, true), size = box.getSize(new THREE.Vector3());
	mesh.position.sub(box.getCenter(new THREE.Vector3()));
	const camera = thumbRig?.camera ?? new THREE.PerspectiveCamera(30, 1, 0.01, 5), half = Math.tan((30 / 2) * Math.PI / 180);
	camera.aspect = w / h;
	camera.position.set(0, 0, size.z / 4 + Math.max(size.y, size.x / camera.aspect) / 2 / half / 0.96); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
	const target = new THREE.WebGLRenderTarget(w * ss, h * ss, { type: THREE.FloatType, samples: 0 });
	return (thumbRig = { w, h, ss, scene, mesh, material, camera, target, buf: new Float32Array(w * ss * h * ss * 4) });
}

// A picker tile of a look { fabric, colour, second, colour2, texture: a loaded set (materials/
// textures.js) or null, texMode } on the twisted strip: a w x h canvas, lit by env (the studio
// rig's environment) and two small lights, tone-mapped as the viewport, over `backdrop`.
export function clothThumb(renderer, env, look, { w = 192, h = 240, ss = 3, backdrop = '#e4e3e0' } = {}) {
	const r = thumbSetup(renderer, w, h, ss), m = r.material, u = m.userData.u;
	applyFabric(m, look.fabric, look.colour ?? '#888888', look.second ?? 'Tone-on-tone', look.colour2 ?? null);
	u.uUV.value = 1;
	applyTexture(m, look.texture ?? null, { recolour: look.texMode === 'recolour', colour: look.colour });
	m.side = THREE.DoubleSide;
	r.scene.environment = env;
	const prev = renderer.getRenderTarget();
	renderer.setRenderTarget(r.target);
	renderer.setClearColor(0x000000, 0);
	renderer.clear();
	renderer.render(r.scene, r.camera);
	renderer.readRenderTargetPixels(r.target, 0, 0, w * ss, h * ss, r.buf);
	renderer.setRenderTarget(prev);
	const bs = new THREE.Color(backdrop).convertLinearToSRGB(), BS = [bs.r, bs.g, bs.b].map((v) => 255 * v); // Color stores linear
	const W = w * ss, img = new ImageData(w, h), c = [0, 0, 0], acc = [0, 0, 0], buf = r.buf;
	for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
		// each sample un-premultiplied, tone-mapped and laid over the backdrop, then averaged (so a
		// glint stays a glint)
		acc[0] = acc[1] = acc[2] = 0;
		for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) {
			const q = (((h - 1 - y) * ss + j) * W + x * ss + i) * 4, a = Math.min(Math.max(buf[q + 3], 0), 1);
			if (a < 1e-4) { for (let k = 0; k < 3; k++) acc[k] += BS[k]; continue; }
			for (let k = 0; k < 3; k++) c[k] = buf[q + k] / a;
			neutral(c);
			for (let k = 0; k < 3; k++) acc[k] += srgb(c[k]) * a + BS[k] * (1 - a);
		}
		const o = (y * w + x) * 4;
		for (let k = 0; k < 3; k++) img.data[o + k] = Math.round(acc[k] / (ss * ss));
		img.data[o + 3] = 255;
	}
	const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
	cv.getContext('2d').putImageData(img, 0, 0);
	return cv;
}
