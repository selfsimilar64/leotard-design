// Fabric swatch thumbnails for the pickers: a rippled square of cloth (17 cm) over a skin-toned
// backing (so sheer fabrics read as sheer), drawn with the real fabric shader under the current
// light rig's environment plus a key light, into a float target and tone-mapped on the CPU
// (same Khronos PBR Neutral curve as the viewport). Turning frames (the cloth rocking a few
// degrees) show sparkle and colour shift when the pointer rests on a swatch. Cached per look.
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
