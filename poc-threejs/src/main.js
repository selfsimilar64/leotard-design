import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import GUI from 'three/addons/libs/lil-gui.module.min.js';
import { loadMannequins } from './body.js';
import { fullBodyStand, dressFormStand } from './stand.js';
import { createFabricMaterial, applyFabric, FABRICS, SECOND } from './fabric.js';
import { Stones, PATTERNS, FINISHES } from './stones.js';
import { Trim, TRIMS } from './trim.js';
import { SCENE, RIGS, LOOKS, MANNEQUIN_FINISHES } from './presets.js';

const hud = document.getElementById('hud');

// --- renderer: HDR, 4x MSAA, bloom, Khronos PBR Neutral tone mapping (keeps fabric colours true)
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.info.autoReset = false;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(SCENE.camera.fov, window.innerWidth / window.innerHeight, 0.01, 40);
camera.position.fromArray(SCENE.camera.position);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.fromArray(SCENE.camera.target);
controls.enableDamping = true;
controls.zoomToCursor = true;
controls.minDistance = 0.03;
controls.maxDistance = 6;

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
scene.background = scene.environment;
scene.backgroundBlurriness = 0.7;

const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, target);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.18, 0.1, 1.6);
composer.addPass(bloom);
composer.addPass(new OutputPass());
function resize() {
	const w = window.innerWidth, h = window.innerHeight, pr = Math.min(window.devicePixelRatio, 2) * state.renderScale;
	camera.aspect = w / h;
	camera.updateProjectionMatrix();
	renderer.setPixelRatio(pr);
	renderer.setSize(w, h);
	composer.setPixelRatio(pr);
	composer.setSize(w, h);
	bloom.setSize(w * pr / 2, h * pr / 2); // glow is blurry by nature: half resolution is invisible and 4x cheaper
}

// --- lights: eight point lights, re-aimed per preset (see RIGS in presets.js)
const rig = new THREE.Group();
scene.add(rig);
const lights = Array.from({ length: 8 }, () => { const l = new THREE.PointLight(0xffffff, 0, 0, 2); rig.add(l); return l; });

// --- floor: a dark studio floor with a soft contact shadow under the stand
const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 96), new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.85 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -0.0085;
scene.add(floor);
const shadowTex = (() => {
	const c = document.createElement('canvas'); c.width = c.height = 128;
	const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
	gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
	x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
	return new THREE.CanvasTexture(c);
})();
const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
blob.rotation.x = -Math.PI / 2; blob.position.y = -0.0082;
scene.add(blob);

// --- body and garment layers (one shared geometry, see body.js / fabric.js)
const t0 = performance.now();
const body = await loadMannequins();
const buildMs = performance.now() - t0;
const skin = createFabricMaterial(3);
const skinMesh = new THREE.Mesh(body.geometry, skin);
skinMesh.frustumCulled = false; // the geometry's positions change when the body is swapped
scene.add(skinMesh);
const capMaterial = new THREE.MeshPhysicalMaterial();
let stand = null;
const ZONES = ['body', 'sleeve', 'accent'];
const layers = ZONES.map((_, i) => {
	const mesh = new THREE.Mesh(body.geometry, createFabricMaterial(i));
	mesh.renderOrder = [-1, -2, -3][i]; // front-most layer first: accent, sleeves, body, then skin (0)
	mesh.frustumCulled = false;
	scene.add(mesh);
	return mesh;
});
const stones = new Stones(scene);
const trim = new Trim(scene);

// --- state
const state = {
	form: 'full', size: 'young', mannequin: 'Matte white fibreglass',
	look: 'Ruby mystique', sleeves: 'long', back: 'scoop',
	body: { fabric: 'mystique', colour: '#b3122e', second: 'Tone-on-tone' },
	accent: { fabric: 'hologram', colour: '#d8dbe6', second: 'Silver' },
	sleeve: { fabric: 'mesh', colour: '#b3122e', second: 'Tone-on-tone' },
	trim: { finish: 'elastic', fabric: 'mystique', colour: '#c9ccd6', second: 'Silver' }, // fabric/colour used by binding only
	pattern: 'Showpiece (edges + swoosh + cascade)', finish: 'Crystal AB',
	rig: 'Arena (ring of small lights)', rotateLights: true, exposure: 1, bloom: 0.18, envRotation: 0, renderScale: 1,
};

function applyFabrics() {
	ZONES.forEach((z, i) => applyFabric(layers[i].material, state[z].fabric, state[z].colour, state[z].second));
	trim.applyFabrics(state);
}
let stoneMs = 0, trimMs = 0;
// Finished edges follow the garment's openings, so they are rebuilt with the body or the style.
function applyTrim() {
	const t = performance.now();
	trim.build(body, state, layers);
	body.edgeKeepOut = trim.keepOut;
	trim.meshes[1].visible = state.sleeves === 'long';
	trimMs = performance.now() - t;
}
function applyStones() {
	const t = performance.now();
	stones.set(PATTERNS[state.pattern](body, state), state.finish, state.body.colour);
	stoneMs = performance.now() - t;
}
function applyStyle() {
	body.setStyle(state);
	const long = state.sleeves === 'long';
	layers[1].visible = long;
	layers[0].material.userData.u.uSleeveSplit.value = long ? 1 : 0;
	applyTrim();
	applyStones();
}
function applyRig() {
	const r = RIGS[state.rig];
	// Unused lights are hidden, not dimmed: every visible light is paid for on every pixel.
	r.lights.forEach((d, i) => { lights[i].position.fromArray(d.p); lights[i].intensity = d.cd; lights[i].color.set(d.c); lights[i].visible = d.cd > 0; });
	scene.environmentIntensity = r.env;
	scene.backgroundIntensity = r.bg;
}
// Mannequin: which body, full figure or dress form, its finish, its stand, and the camera framing.
function applyMannequinFinish() {
	const f = MANNEQUIN_FINISHES[state.mannequin], u = skin.userData.u;
	skin.color.set(f.colour); skin.roughness = f.roughness;
	skin.clearcoat = f.clearcoat ?? 0; skin.clearcoatRoughness = f.clearcoatRoughness ?? 0;
	skin.sheen = f.sheen ?? 0; skin.sheenRoughness = 0.7; skin.sheenColor.set(0xffffff);
	u.uKnit.value = f.knit ?? 0;
	u.uTape.value = f.tape ? 1 : 0;
	skin.needsUpdate = true;
	capMaterial.color.set(f.colour); capMaterial.roughness = f.roughness; capMaterial.clearcoat = f.clearcoat ?? 0; capMaterial.sheen = f.sheen ?? 0;
	capMaterial.needsUpdate = true;
}
let mannequinMs = 0;
function applyMannequin(reframe = true) {
	const t = performance.now();
	body.setBody(state.size);
	const torso = state.form === 'torso';
	body.clip = torso;
	for (const m of [skin, ...layers.map((l) => l.material), ...trim.materials]) {
		m.userData.u.uClip.value = torso ? 1 : 0;
		const fl = body.formLines;
		m.userData.u.uTapeY.value.set(fl.waist, fl.bust, fl.hip, fl.neck);
	}
	if (stand) { scene.remove(stand); stand.traverse((o) => o.geometry?.dispose()); }
	stand = torso ? dressFormStand(body, capMaterial) : fullBodyStand(body);
	scene.add(stand);
	const s = torso ? 0.9 : 0.75;
	blob.scale.set(s, s, 1); blob.position.z = torso ? body.crotch.z : 0;
	mannequinMs = performance.now() - t;
	applyTrim();
	applyStones();
	if (reframe) frameCamera();
}
// Fit the leotard area (mid-thigh to the head, or the whole dress form) in view, keeping the
// current orbit direction.
function frameCamera() {
	const b = body.body, torso = state.form === 'torso';
	const top = torso ? b.landmarks.neck_base[1] + 0.09 : b.stature + 0.03;
	const bottom = torso ? body.crotch.y - 0.2 : body.crotch.y - 0.33;
	const span = top - bottom, centre = new THREE.Vector3(0, (top + bottom) / 2, 0);
	const fov = THREE.MathUtils.degToRad(camera.fov), fit = Math.max(span, span * 0.62 / camera.aspect);
	const dist = fit / 2 / Math.tan(fov / 2) * 1.12;
	const dir = camera.position.clone().sub(controls.target).normalize();
	controls.target.copy(centre);
	camera.position.copy(centre).addScaledVector(dir, dist);
}

function applyLook(name) {
	const l = LOOKS[name];
	state.sleeves = l.sleeves; state.back = l.back; state.pattern = l.pattern; state.finish = l.finish;
	for (const z of ZONES) [state[z].fabric, state[z].colour, state[z].second] = l[z];
	applyFabrics(); applyStyle();
	gui.controllersRecursive().forEach((c) => c.updateDisplay());
}

// --- controls
const fabricOptions = Object.fromEntries(Object.entries(FABRICS).map(([k, f]) => [f.label, k]));
const gui = new GUI({ title: 'Leotard POC (three.js)', width: 310 });
gui.add(state, 'look', Object.keys(LOOKS)).name('Quick look').onChange(applyLook);
const fm = gui.addFolder('Mannequin');
fm.add(state, 'form', { 'Full-body mannequin': 'full', 'Dress form (torso)': 'torso' }).name('Style').onChange(() => {
	state.mannequin = state.form === 'torso' ? 'Linen dress form' : 'Matte white fibreglass';
	applyMannequinFinish(); applyMannequin(); fm.controllersRecursive().forEach((c) => c.updateDisplay());
});
const sizes = Object.fromEntries(body.keys.map((k) => [body.bodies[k].label + ' \u00b7 ' + Math.round(body.bodies[k].stature * 100) + ' cm', k]));
fm.add(state, 'size', sizes).name('Body').onChange(() => applyMannequin());
fm.add(state, 'mannequin', Object.keys(MANNEQUIN_FINISHES)).name('Finish').onChange(applyMannequinFinish);
const fd = gui.addFolder('Design');
fd.add(state, 'sleeves', { 'Long sleeve': 'long', 'Tank': 'tank' }).name('Sleeves').onChange(applyStyle);
fd.add(state, 'back', { 'Scoop': 'scoop', 'Keyhole': 'keyhole', 'Open with crossed straps': 'strappy' }).name('Back').onChange(applyStyle);
fd.add(state.trim, 'finish', Object.fromEntries(Object.entries(TRIMS).map(([k, t]) => [t.label, k]))).name('Edge finish').onChange(() => { applyTrim(); applyFabrics(); applyStones(); });
for (const [z, title] of [['body', 'Body fabric'], ['accent', 'Accent panel'], ['sleeve', 'Sleeves']]) {
	const f = gui.addFolder(title);
	f.add(state[z], 'fabric', fabricOptions).name('Material').onChange(applyFabrics);
	f.addColor(state[z], 'colour').name('Colour').onChange(() => { applyFabrics(); if (z === 'body' && FINISHES[state.finish].tint === 'body') applyStones(); });
	f.add(state[z], 'second', SECOND).name('Foil / second colour').onChange(applyFabrics);
}
const fb = gui.addFolder('Binding (when edge finish is binding)');
fb.add(state.trim, 'fabric', fabricOptions).name('Material').onChange(applyFabrics);
fb.addColor(state.trim, 'colour').name('Colour').onChange(applyFabrics);
fb.add(state.trim, 'second', SECOND).name('Foil / second colour').onChange(applyFabrics);
fb.close();
const fs = gui.addFolder('Crystals and sequins');
fs.add(state, 'pattern', Object.keys(PATTERNS)).name('Pattern').onChange(applyStones);
fs.add(state, 'finish', Object.keys(FINISHES)).name('Type').onChange(applyStones);
const fl = gui.addFolder('Lighting');
fl.add(state, 'rig', Object.keys(RIGS)).name('Preset').onChange(applyRig);
fl.add(state, 'rotateLights').name('Rotate lights');
fl.add(state, 'envRotation', 0, Math.PI * 2, 0.01).name('Turn environment');
fl.add(state, 'exposure', 0.3, 2.5, 0.01).name('Exposure');
fl.add(state, 'bloom', 0, 1.2, 0.01).name('Sparkle glow');
const fp = gui.addFolder('Performance');
fp.add(state, 'renderScale', 0.5, 1, 0.05).name('Render scale').onChange(resize);
fp.add({ benchmark }, 'benchmark').name('Measure frame cost');

// Style before body: the garment surface needs the regions, and setStyle skips the rebuild until a
// body is set, so the lift solve (~0.7 s) runs once at start-up.
applyMannequinFinish(); applyFabrics(); body.setStyle(state); applyMannequin(false); applyStyle(); applyRig(); resize(); frameCamera();

// --- frame loop
const timer = new THREE.Timer();
const keyDir = new THREE.Vector3();
let frames = 0, acc = 0, fps = 0, cpuMs = 0, benchText = '';
function frame() {
	timer.update();
	const dt = timer.getDelta(), start = performance.now();
	if (!window.innerWidth) return; // pane not laid out yet
	if (state.rotateLights) rig.rotation.y += dt * SCENE.lightSpin;
	scene.environmentRotation.y = scene.backgroundRotation.y = state.envRotation + rig.rotation.y * SCENE.envFollow;
	renderer.toneMappingExposure = state.exposure;
	bloom.strength = state.bloom;
	lights[0].getWorldPosition(keyDir).sub(controls.target).normalize();
	for (const l of layers) l.material.userData.u.uHoloDirW.value.copy(keyDir);
	controls.update();
	renderer.info.reset();
	composer.render();
	cpuMs += performance.now() - start;
	frames++; acc += dt;
	if (acc >= 0.5) {
		fps = frames / acc;
		const s = renderer.getDrawingBufferSize(new THREE.Vector2());
		hud.textContent = `${fps.toFixed(0)} fps   ${(cpuMs / frames).toFixed(1)} ms CPU/frame   ${stones.count.toLocaleString()} stones`
			+ `   ${(renderer.info.render.triangles / 1e6).toFixed(2)}M triangles   ${s.x}×${s.y}${benchText}`;
		frames = 0; acc = 0; cpuMs = 0;
	}
}
renderer.setAnimationLoop(frame);

// Renders frames back to back and waits for the GPU each time, so the number is the true cost
// of a frame, not the display's refresh interval.
function benchmark(n = 60) {
	const gl = renderer.getContext(), px = new Uint8Array(4);
	const run = () => { for (let i = 0; i < n; i++) { rig.rotation.y += 0.01; renderer.info.reset(); composer.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } };
	run(); // warm up: compiles any shader variant not yet seen
	const t = performance.now(); run();
	const ms = (performance.now() - t) / n;
	benchText = `   |   measured ${ms.toFixed(2)} ms/frame (${(1000 / ms).toFixed(0)} fps headroom)`;
	return ms;
}

window.addEventListener('resize', resize);

// Handles for poking at the scene from the console.
window.poc = { composer, bloom, layers, skin, state, scene, camera, controls, renderer, body, stones, trim, applyTrim, get trimMs() { return trimMs; }, stand: () => stand, applyLook, applyFabrics, applyStones, applyStyle, applyRig, applyMannequin, applyMannequinFinish, frameCamera, benchmark, gui, buildMs, get stoneMs() { return stoneMs; }, get mannequinMs() { return mannequinMs; }, get fps() { return fps; } };
