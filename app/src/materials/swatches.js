// Fabric swatch thumbnails for the pickers: a rippled square of cloth (17 cm) over a skin-toned
// backing (so sheer fabrics read as sheer), drawn with the real fabric shader under the current
// light rig's environment plus a key light, into a float target and tone-mapped on the CPU
// (same Khronos PBR Neutral curve as the viewport). Turning frames (the cloth rocking a few
// degrees) show sparkle and colour shift when the pointer rests on a swatch. Cached per look.
// (Used by app.swatchSheet. The material grid's tiles are pre-rendered: swirlThumb below.)
import * as THREE from 'three';
import { createFabricMaterial, applyFabric, applyTexture, texScaleOf } from './fabric.js';

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
	const k = texScaleOf({ fabric: look.fabric, texture: look.texture?.id });
	applyFabric(m, look.fabric, look.colour ?? '#888888', look.second ?? 'Tone-on-tone', look.colour2 ?? null, k);
	m.userData.u.uUV.value = 1;
	applyTexture(m, look.texture ?? null, { scale: k, recolour: look.texMode === 'recolour', colour: look.colour });
	const env = viewport.scene.environment, out = [];
	for (let i = 0; i < frames; i++) out.push(draw(r, env, frames === 1 ? 0.15 : 0.15 + 0.35 * Math.sin((i / frames) * Math.PI * 2)));
	cache.set(key, out);
	return out;
}

// --- picker tiles: a close-up of a pinched, twisted sheet ---------------------------------------------
// The material grid's tiles (ui/FabricTab.jsx MaterialGrid) are pre-rendered by src/dev/thumbnails.js
// (materials) with swirlThumb: as fabric shops photograph a swatch, a flat sheet pinched at its
// centre and twisted, so folds spiral in towards the pinch, seen from above (the camera pitched
// down) and so close that the fabric fills the whole picture and its texture shows. The folds turn
// the fabric through every angle to the lights, so sheen, foil, iridescence, sparkle and sheerness
// all show; a sheer fabric shows the table under it.

const SW = 0.34; // the sheet, metres square (wider than any view of it)
// height of the sheet at (x, y), metres: the pinched centre raised, and folds that spiral in to it
// (not all alike: each fold its own height, the spiral wavering a little)
function swirlHeight(x, y) {
	const r = Math.hypot(x, y), th = Math.atan2(y, x);
	const N = 6, phase = N * th + 5.2 * Math.log(Math.max(r, 0.002) / 0.02) + 0.55 * Math.sin(2 * th + 18 * r);
	const ridge = 0.5 - 0.5 * Math.cos(phase);                                  // 0 in a valley, 1 on a fold
	const fold = ridge * ridge * (3 - 2 * ridge);                               // rounder crests, wider valleys
	const grow = Math.min(r / 0.018, 1), amp = 0.0105 * grow * grow * (3 - 2 * grow) * Math.exp(-r / 0.085) * (0.78 + 0.22 * Math.sin(th * 1.0 + 0.9) * Math.cos(th * 2.0 - 0.3));
	const lift = 0.017 * Math.exp(-((r / 0.026) ** 2));                          // the pinched centre, raised
	const lay = 0.0008 * (1 + Math.sin(x * 23 + 0.7) * Math.cos(y * 17 - 0.4)); // the rest of the sheet lies loosely
	return lift + amp * fold + lay;
}

// The sheet as rings round the pinch (denser towards it, where the folds crowd together) out to
// the square's corners.
function swirlCloth() {
	const nr = 240, na = 900, R = SW * 0.72, pos = [], nrm = [], tan = [], uv = [], ref = [], idx = [], e = 1e-4;
	pos.push(0, 0, swirlHeight(0, 0)); nrm.push(0, 0, 1); tan.push(1, 0, 0, 1); uv.push(0, 0); ref.push(0, 1.07, 0);
	for (let i = 1; i <= nr; i++) {
		const r = R * (i / nr) ** 1.7;
		for (let j = 0; j < na; j++) {
			const a = (j / na) * Math.PI * 2, x = r * Math.cos(a), y = r * Math.sin(a), z = swirlHeight(x, y);
			const dx = (swirlHeight(x + e, y) - swirlHeight(x - e, y)) / (2 * e), dy = (swirlHeight(x, y + e) - swirlHeight(x, y - e)) / (2 * e);
			const L = Math.hypot(dx, dy, 1), T = Math.hypot(1, dx);
			pos.push(x, y, z); nrm.push(-dx / L, -dy / L, 1 / L); tan.push(1 / T, 0, dx / T, 1);
			uv.push(x, y); // cloth space in metres: the fabric's own scale
			ref.push(x, 1.07 + y * 4, z);
		}
	}
	const at = (i, j) => (i === 0 ? 0 : 1 + (i - 1) * na + (j % na));
	for (let j = 0; j < na; j++) idx.push(0, at(1, j), at(1, j + 1));
	for (let i = 1; i < nr; i++) for (let j = 0; j < na; j++) { const a = at(i, j), b = at(i, j + 1), c = at(i + 1, j), d = at(i + 1, j + 1); idx.push(a, c, b, b, c, d); }
	const g = new THREE.BufferGeometry(), N = pos.length / 3;
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

// The view: from above and in front of the pinch, pitched down 52 degrees, about 6.5 cm across
// at the pinch, which sits a little up and left of the middle. Lights: the studio's environment
// for reflections, a key from the upper left that rakes across the folds, a rim from behind for
// sheen on the crests, and a small light by the lens for the glints of foil and glitter.
let swirlRig = null;
function swirlSetup(renderer, px, ss) {
	if (swirlRig?.px === px && swirlRig.ss === ss) return swirlRig;
	swirlRig?.target.dispose();
	let r = swirlRig;
	if (!r) {
		// the sheet is built in x, y with z up; laid on a table that stands y up as the studio rooms do
		// (every shader then reads the room the right way up)
		const scene = new THREE.Scene(), table = new THREE.Group(), material = createFabricMaterial(5);
		table.rotation.x = -Math.PI / 2; scene.add(table);
		material.userData.u.uOffset.value = 0; material.userData.u.uGarment.value = 0;
		const mesh = new THREE.Mesh(swirlCloth(), material);
		table.add(mesh);
		const board = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xf2f0eb, roughness: 0.92 }));
		board.position.z = -0.002; table.add(board);
		const key = new THREE.PointLight(0xfff8f0, 0.22, 0, 2); key.position.set(-0.16, 0.12, 0.2); table.add(key);
		const rim = new THREE.PointLight(0xf4f7ff, 0.12, 0, 2); rim.position.set(0.12, 0.26, 0.09); table.add(rim);
		const camera = new THREE.PerspectiveCamera(26, 1, 0.005, 3);
		const glint = new THREE.PointLight(0xffffff, 0.06, 0, 2); table.add(glint);
		const at = new THREE.Vector3(0.006, -0.004, 0.006), pitch = THREE.MathUtils.degToRad(52), turn = THREE.MathUtils.degToRad(-18), d = 0.145;
		const eye = new THREE.Vector3(at.x + Math.sin(turn) * Math.cos(pitch) * d, at.y - Math.cos(turn) * Math.cos(pitch) * d, at.z + Math.sin(pitch) * d);
		glint.position.copy(eye).add(new THREE.Vector3(0.03, 0.02, 0.02));
		table.updateMatrixWorld(true);
		camera.position.copy(table.localToWorld(eye.clone()));
		camera.lookAt(table.localToWorld(at.clone()));
		r = { scene, mesh, material, camera };
	}
	r.px = px; r.ss = ss;
	r.target = new THREE.WebGLRenderTarget(px * ss, px * ss, { type: THREE.FloatType, samples: 0 });
	r.buf = new Float32Array(px * ss * px * ss * 4);
	return (swirlRig = r);
}

// A material tile of a look { fabric, colour, second, colour2, texture: a loaded set (materials/
// textures.js) or null, texMode }: a px-square canvas, lit by env (the studio's environment) and
// the swirl's own lights, tone-mapped as the viewport. zoom: the fabric's texture drawn larger than
// life (its structure, below a millimetre, would be lost at tile size); envTurn: the room turned
// round the table (radians).
export function swirlThumb(renderer, env, look, { px = 384, ss = 3, zoom = 1, envTurn = 0 } = {}) {
	const r = swirlSetup(renderer, px, ss), m = r.material, u = m.userData.u;
	const k = texScaleOf({ fabric: look.fabric, texture: look.texture?.id }) * zoom; // at its default texture size
	applyFabric(m, look.fabric, look.colour ?? '#888888', look.second ?? 'Tone-on-tone', look.colour2 ?? null, k);
	u.uUV.value = 1;
	applyTexture(m, look.texture ?? null, { scale: k, recolour: look.texMode === 'recolour', colour: look.colour });
	if (look.sheer !== undefined && u.uMesh.value > 0.5) u.uHoleR.value = Math.sqrt(Math.sqrt(Math.min(Math.max(look.sheer, 0), 0.95)) / 3.6276);
	m.side = THREE.DoubleSide;
	r.scene.environment = env;
	r.scene.environmentRotation.set(0, envTurn, 0);
	const prev = renderer.getRenderTarget();
	renderer.setRenderTarget(r.target);
	renderer.setClearColor(0x000000, 0);
	renderer.clear();
	renderer.render(r.scene, r.camera);
	renderer.readRenderTargetPixels(r.target, 0, 0, px * ss, px * ss, r.buf);
	renderer.setRenderTarget(prev);
	const W = px * ss, img = new ImageData(px, px), c = [0, 0, 0], acc = [0, 0, 0], buf = r.buf;
	for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) {
		// each sample tone-mapped, then averaged (so a glint stays a glint)
		acc[0] = acc[1] = acc[2] = 0;
		for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) {
			const q = (((px - 1 - y) * ss + j) * W + x * ss + i) * 4, a = Math.max(buf[q + 3], 1e-4);
			for (let kk = 0; kk < 3; kk++) c[kk] = buf[q + kk] / Math.min(a, 1);
			neutral(c);
			for (let kk = 0; kk < 3; kk++) acc[kk] += srgb(c[kk]);
		}
		const o = (y * px + x) * 4;
		for (let kk = 0; kk < 3; kk++) img.data[o + kk] = Math.round(acc[kk] / (ss * ss));
		img.data[o + 3] = 255;
	}
	const cv = document.createElement('canvas'); cv.width = cv.height = px;
	cv.getContext('2d').putImageData(img, 0, 0);
	return cv;
}
