// The 3D view: renderer, camera and orbit, environment, light rig, floor, post-processing,
// frame loop, benchmark and capture. Ported from poc-threejs/src/main.js (same settings, so the
// POC's looks render the same); the garment and body are added by the engine (render/engine.js).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { GroundedSkybox } from 'three/addons/objects/GroundedSkybox.js';
import { SCENE, RIGS } from './presets.js';
import { studioEnvironment, cyclorama } from './studio.js';
import { GlarePass, GLARE_SIZE, GLARE_STRENGTH } from './glare.js';
import { ScenePass, SkinPass, AOPass } from './postfx.js';

const _size = new THREE.Vector2(), _Y = new THREE.Vector3(0, 1, 0);

// HDRI studios: the plain backdrop's default colour, and the default radius of the room's dome
// (metres; it must stay inside the camera's far plane, 40 m)
export const BACKDROP_COLOUR = '#d9d8d4', ROOM_SIZE = 14;

// Brightest direction of an equirectangular HDR image ({ width, height, data } of RGBA half floats
// or floats, top row first): the luminance x solid-angle weighted mean direction of its brightest
// 0.5% above the horizon (a sunlit patch of floor is bright but lights nothing from below), in
// three.js's equirectangular convention (u = atan2(z, x) / 2pi + 0.5).
function keyDirection({ width: W, height: H, data }) {
	const half = data instanceof Uint16Array, f = half ? THREE.DataUtils.fromHalfFloat : (v) => v;
	const step = Math.max(1, Math.round(W / 512)), E = [], dirs = [];
	for (let y = step / 2; y < H / 2; y += step) {
		const th = (0.5 - (y + 0.5) / H) * Math.PI, ct = Math.cos(th), st = Math.sin(th);
		for (let x = step / 2; x < W; x += step) {
			const o = (Math.floor(y) * W + Math.floor(x)) * 4, ph = ((x + 0.5) / W - 0.5) * 2 * Math.PI;
			E.push((0.2126 * f(data[o]) + 0.7152 * f(data[o + 1]) + 0.0722 * f(data[o + 2])) * ct);
			dirs.push(ct * Math.cos(ph), st, ct * Math.sin(ph));
		}
	}
	const thr = Float32Array.from(E).sort()[Math.floor(E.length * 0.995)], k = new THREE.Vector3();
	E.forEach((e, i) => { if (e >= thr) k.x += dirs[i * 3] * e, k.y += dirs[i * 3 + 1] * e, k.z += dirs[i * 3 + 2] * e; });
	return k.normalize();
}

export class Viewport {
	constructor(container) {
		this.container = container;
		// HDR, 4x MSAA, bloom, Khronos PBR Neutral tone mapping (keeps fabric colours true)
		const renderer = this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
		renderer.toneMapping = THREE.NeutralToneMapping;
		// soft shadows from the studio key (variance shadow maps blur into a softbox-like penumbra)
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.VSMShadowMap;
		renderer.info.autoReset = false;
		container.appendChild(renderer.domElement);
		renderer.domElement.style.display = 'block';

		const scene = this.scene = new THREE.Scene();
		// everything of the body and garment lives in `world`: a reference photo's proportion
		// correction scales it about a pivot (three.js cameras cannot carry a scale)
		this.world = new THREE.Group();
		scene.add(this.world);
		const camera = this.camera = new THREE.PerspectiveCamera(SCENE.camera.fov, 1, 0.01, 40);
		camera.position.fromArray(SCENE.camera.position);
		const controls = this.controls = new OrbitControls(camera, renderer.domElement);
		controls.target.fromArray(SCENE.camera.target);
		controls.enableDamping = true;
		controls.zoomToCursor = true;
		controls.minDistance = 0.03;
		controls.maxDistance = 6;
		// dynamic resolution (realism upgrade R11): while the view moves and frames run late, render
		// at down to 70%; full resolution again as soon as it is still
		this.dynScale = this.wantScale = 1; this.moving = false; this.stillAt = 0;
		controls.addEventListener('start', () => { this.moving = true; });
		controls.addEventListener('end', () => { this.moving = false; this.stillAt = performance.now(); });

		const pmrem = this.pmrem = new THREE.PMREMGenerator(renderer);
		this.envs = new Map(); // rig name -> PMREM texture (studio rigs reflect their own softboxes)
		this.roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
		scene.environment = this.roomEnv;
		scene.background = scene.environment;
		scene.backgroundBlurriness = 0.7;

		// the scene is drawn multisampled into its own target (with depth and stencil); the composer's
		// buffers are plain (render/postfx.js ScenePass)
		const composer = this.composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false }));
		this.scenePass = new ScenePass(scene, camera);
		composer.addPass(this.scenePass);
		this.skinPass = new SkinPass(camera, this.scenePass); // subsurface scattering of skin
		composer.addPass(this.skinPass);
		this.aoPass = new AOPass(scene, camera, this.scenePass.depthTexture); // contact and fold occlusion
		composer.addPass(this.aoPass);
		this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.18, 0.1, 1.6);
		composer.addPass(this.bloom);
		this.glare = new GlarePass(); // star-filter streaks (scene.glare), off for 'plain'
		composer.addPass(this.glare);
		composer.addPass(new OutputPass());

		// Eight point lights, re-aimed per preset (see RIGS in presets.js).
		this.rig = new THREE.Group();
		scene.add(this.rig);
		this.lights = Array.from({ length: 8 }, () => { const l = new THREE.PointLight(0xffffff, 0, 0, 2); this.rig.add(l); return l; });
		// Softboxes of the photo-studio rigs (created on first use: the LTC tables are 130 kB)
		this.areas = [];
		// The shadowing part of a studio key: area lights cannot cast shadows in three.js, so part
		// of the key's light comes from this directional light instead (rig.shadow).
		const sun = this.sun = new THREE.DirectionalLight(0xffffff, 0);
		sun.visible = false; sun.castShadow = true;
		sun.shadow.mapSize.set(1024, 1024);
		Object.assign(sun.shadow.camera, { left: -0.9, right: 0.9, top: 1.0, bottom: -1.05, near: 0.5, far: 9 });
		sun.shadow.radius = 9; sun.shadow.blurSamples = 16; sun.shadow.bias = -0.0004;
		this.world.add(sun); this.world.add(sun.target);

		// Dark studio floor with a soft contact shadow under the stand.
		const floor = this.floor = new THREE.Mesh(new THREE.CircleGeometry(4, 96), new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.85 }));
		floor.rotation.x = -Math.PI / 2; floor.position.y = -0.0085;
		this.world.add(floor);
		const c = document.createElement('canvas'); c.width = c.height = 128;
		const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
		gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
		x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
		const blob = this.blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
		blob.rotation.x = -Math.PI / 2; blob.position.y = -0.0082;
		this.world.add(blob);
		this.cyc = cyclorama();
		this.cyc.visible = false;
		this.world.add(this.cyc);
		// HDRI studios (rig.hdri): loaded once each; the room drawn as a skybox with a ground, and a
		// floor that shows only shadows (the key's) laid on that ground
		this.hdris = new Map(); // file -> Promise<{ tex, env, key: Vector3, sky }>
		this.hdriOn = null;     // the HDRI studio on show
		const catcher = this.catcher = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.ShadowMaterial({ opacity: 0.32 }));
		catcher.rotation.x = -Math.PI / 2; catcher.position.y = -0.0085; catcher.receiveShadow = true; catcher.visible = false;
		this.world.add(catcher);

		this.settings = { rig: 'Arena (ring of small lights)', rotateLights: false, exposure: 1, bloom: 0.18, envRotation: 0, renderScale: 1, dynamicRes: true };
		this.onFrame = new Set();
		this.onResize = new Set();
		this.stats = { fps: 0, cpuMs: 0, triangles: 0, width: 0, height: 0 };
		this.timer = new THREE.Timer();
		this.keyDir = new THREE.Vector3();
		this._frames = 0; this._acc = 0; this._cpu = 0;

		// Resizing the canvas clears it. The observer runs after the frame was drawn and before the
		// page is painted, so it draws again at once: otherwise that frame showed black (the flicker
		// the owner saw while orbiting, when dynamic resolution changed the size twice a second).
		new ResizeObserver(() => { if (this.resize() && this.container.clientWidth) this.render(); }).observe(container);
		this.resize();
		renderer.setAnimationLoop(() => this.frame());
	}

	// Fits the canvas to its pane (or to a reference photo's crop) at the current resolution.
	// Returns whether the drawing buffer changed (and so was cleared).
	resize() {
		let w = Math.max(this.container.clientWidth, 1), h = Math.max(this.container.clientHeight, 1);
		if (w < 8 || h < 8) return; // pane hidden: keep the last size
		const el = this.renderer.domElement;
		if (this.photo) {
			// letterbox the canvas to the photo crop's aspect, the photo crop laid exactly over it
			const c = this.photo.cam.crop ?? [0, 0, ...this.photo.size], cw = c[2] - c[0], ch = c[3] - c[1], a = cw / ch;
			const fw = Math.min(w, h * a), fh = fw / a, left = (w - fw) / 2, top = (h - fh) / 2, k = fw / cw;
			w = Math.round(fw); h = Math.round(fh);
			Object.assign(el.style, { position: 'absolute', left: left + 'px', top: top + 'px' });
			Object.assign(this.photoWrap.style, { left: left + 'px', top: top + 'px', width: w + 'px', height: h + 'px' });
			Object.assign(this.photoImg.style, { left: -c[0] * k + 'px', top: -c[1] * k + 'px', width: this.photo.size[0] * k + 'px', height: this.photo.size[1] * k + 'px' });
		} else Object.assign(el.style, { position: '', left: '', top: '' });
		const pr = Math.min(window.devicePixelRatio, 2) * this.settings.renderScale * this.dynScale;
		if (this.renderer.getPixelRatio() === pr && this.renderer.getSize(_size).x === w && _size.y === h) return false; // same size: do not clear
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
		this.renderer.setPixelRatio(pr);
		this.renderer.setSize(w, h);
		this.composer.setPixelRatio(pr);
		this.composer.setSize(w, h);
		this.bloom.setSize(w * pr / 2, h * pr / 2); // glow is blurry by nature: half resolution is invisible and 4x cheaper
		for (const fn of this.onResize ?? []) fn(w, h);
		return true;
	}

	applyScene(s) {
		Object.assign(this.settings, s);
		const r = RIGS[this.settings.rig] ?? RIGS['Arena (ring of small lights)'];
		// Unused lights are hidden, not dimmed: every visible light is paid for on every pixel.
		r.lights.forEach((d, i) => { const l = this.lights[i]; l.position.fromArray(d.p); l.intensity = d.cd; l.color.set(d.c); l.visible = d.cd > 0; });
		this.scene.environmentIntensity = r.env;
		this.scene.backgroundIntensity = r.bg;
		const areas = r.areas ?? [];
		if (areas.length && !this.areas.length) {
			RectAreaLightUniformsLib.init();
			for (let i = 0; i < 4; i++) { const l = new THREE.RectAreaLight(0xffffff, 0, 1, 1); l.visible = false; this.scene.add(l); this.areas.push(l); }
		}
		this.areas.forEach((l, i) => {
			const a = areas[i];
			l.visible = !!a;
			if (!a) return;
			l.position.fromArray(a.p); l.width = a.s[0]; l.height = a.s[1]; l.intensity = a.L; l.color.set(a.c ?? 0xffffff);
			l.lookAt(new THREE.Vector3().fromArray(a.at ?? [0, 1, 0]));
		});
		const sh = r.shadow, sun = this.sun;
		sun.visible = !!sh;
		if (sh) {
			sun.target.position.set(0, 1.0, 0);
			sun.position.fromArray(sh.from).sub(sun.target.position).normalize().multiplyScalar(4).add(sun.target.position);
			sun.intensity = sh.E; sun.color.set(sh.c ?? 0xffffff);
			sun.shadow.camera.updateProjectionMatrix();
		}
		this.glare.setPreset(this.settings.glare ?? 'plain', { size: this.settings.glareSize ?? GLARE_SIZE, strength: this.settings.glareStrength ?? GLARE_STRENGTH });
		this.rigFixed = !!r.fixed;
		this.showHdri(null);
		if (r.hdri) {
			// until the studio has loaded, the last environment stays on show
			const want = this.settings.rig;
			this.cyc.visible = false; this.floor.visible = false;
			this.hdri(r.hdri).then((h) => { if (this.settings.rig === want) this.showHdri(r, h); }, (e) => console.error('hdri', e));
			this.bloomK = r.bloomK ?? 1;
			this.rig.rotation.y = 0;
			return;
		}
		this.bloomK = r.bloomK ?? 1;
		if (r.fixed) this.rig.rotation.y = 0;
		let env = this.envs.get(this.settings.rig);
		if (!env) {
			env = r.room ? this.pmrem.fromScene(studioEnvironment(r), 0.01).texture : this.roomEnv;
			this.envs.set(this.settings.rig, env);
		}
		this.scene.environment = env;
		// a backdrop rig shows its seamless paper; the others the blurred room and the dark floor
		const bd = r.backdrop != null;
		this.cyc.visible = bd; this.floor.visible = !bd;
		if (bd) {
			this.cyc.material.color.set(r.backdrop);
			this.cyc.material.emissive.set(r.backdrop).multiplyScalar(r.glow ?? 0);
			this.scene.background = this.cyc.material.color.clone();
		}
		else this.scene.background = env;
	}

	// An HDRI studio: its equirectangular image (the skybox), the lighting prefiltered from it, and
	// its key direction: the luminance-weighted mean direction of its brightest 0.5% of solid angle
	// (the window or the softbox).
	hdri(file) {
		let p = this.hdris.get(file);
		if (!p) {
			p = new HDRLoader().loadAsync('/hdri/' + file).then((tex) => {
				tex.mapping = THREE.EquirectangularReflectionMapping;
				return { tex, env: this.pmrem.fromEquirectangular(tex).texture, key: keyDirection(tex.image) };
			});
			p.catch(() => this.hdris.delete(file));
			this.hdris.set(file, p);
		}
		return p;
	}

	// Shows an HDRI studio (rig r, loaded h), or takes it away (null). Behind the figure
	// (scene.backdrop): 'plain', a flat colour (backdropColour), the HDRI only lighting; or 'room',
	// the photographed room as a grounded skybox: a dome of radius roomSize whose lower part is
	// flattened into the floor, as seen from a camera roomHeight above it. Where the flattening
	// meets the walls the photo is stretched; the two numbers move that seam.
	showHdri(r, h) {
		const was = this.hdriOn, s = this.settings;
		this.catcher.visible = !!r;
		if (was?.sky) was.sky.visible = false;
		if (!r) { this.hdriOn = null; return; }
		const height = s.roomHeight ?? r.height, radius = s.roomSize ?? ROOM_SIZE, k = height + '|' + radius;
		if (h.skyKey !== k) { // one dome per studio, rebuilt when its shape changes
			if (h.sky) { h.sky.removeFromParent(); h.sky.geometry.dispose(); h.sky.material.dispose(); }
			h.sky = new GroundedSkybox(h.tex, height, radius); h.skyKey = k;
		}
		const sky = h.sky;
		this.hdriOn = { r, h, sky };
		sky.position.y = height - 0.0085; // its ground on the floor the figure stands on
		const room = s.backdrop === 'room';
		sky.visible = room;
		if (!sky.parent) this.scene.add(sky);
		this.scene.environment = h.env;
		this.scene.background = room ? null : new THREE.Color(s.backdropColour ?? BACKDROP_COLOUR);
		this.sun.visible = r.sun > 0; this.sun.intensity = r.sun;
		// glints: at the key, and a small one beside the camera (what the crystals face)
		this.lights.forEach((l, i) => { l.visible = i < 2; l.intensity = i === 0 ? r.glint : r.glint * 0.4; l.color.set(0xffffff); });
		this.placeHdriLights();
	}

	// The key's shadow and glints follow the room as it turns (envRotation).
	placeHdriLights() {
		const o = this.hdriOn;
		if (!o) return;
		const a = this.settings.envRotation + (o.r.turn ?? 0), k = o.h.key.clone().applyAxisAngle(_Y, a);
		o.sky.rotation.y = a;
		this.scene.environmentRotation.y = this.scene.backgroundRotation.y = a;
		const t = this.sun.target.position.set(0, 1.0, 0);
		this.sun.position.copy(k).multiplyScalar(4).add(t);
		this.lights[0].position.copy(k).multiplyScalar(3).add(t);
		this.lights[1].position.set(0.4, 1.4, 3.2);
	}

	// Display settings (render/display.js): resolution, anti-aliasing samples, shadow map, glow and
	// dynamic resolution.
	applyDisplay(d) {
		this.display = d;
		this.settings.renderScale = d.resolution;
		this.settings.dynamicRes = d.dynamicRes;
		if (!d.dynamicRes) this.wantScale = 1;
		this.scenePass.setSamples(d.msaa);
		const sun = this.sun, size = d.shadows === 'sharp' ? 2048 : 1024;
		sun.castShadow = d.shadows !== 'off';
		if (sun.shadow.mapSize.x !== size) { sun.shadow.mapSize.set(size, size); sun.shadow.map?.dispose(); sun.shadow.map = null; }
		this.bloom.enabled = d.bloom;
		this.skinPass.enabled = this.scenePass.keepSkinMark = d.skin;
		this.aoPass.enabled = d.ao;
		if (this.resize() && this.container.clientWidth) this.render();
	}

	frame() {
		this.timer.update();
		const dt = this.timer.getDelta(), start = performance.now(), s = this.settings;
		if (!this.container.clientWidth) return; // pane not laid out yet
		if (s.rotateLights && !this.photo && !this.rigFixed) this.rig.rotation.y += dt * SCENE.lightSpin;
		if (this.hdriOn) this.placeHdriLights();
		else this.scene.environmentRotation.y = this.scene.backgroundRotation.y = s.envRotation + this.rig.rotation.y * SCENE.envFollow;
		this.renderer.toneMappingExposure = s.exposure;
		this.bloom.strength = s.bloom * (this.bloomK ?? 1);
		this.lights[0].getWorldPosition(this.keyDir).sub(this.controls.target).normalize();
		for (const fn of this.onFrame) fn(dt);
		if (!this.photo) this.controls.update();
		// a dynamic-resolution step takes effect before this frame is drawn (resizing clears the
		// canvas: done after drawing, the cleared canvas was shown, a black flash)
		if (this.wantScale !== this.dynScale) { this.dynScale = this.wantScale; this.resize(); }
		this.render();
		this._cpu += performance.now() - start;
		this._frames++; this._acc += dt;
		if (this._acc >= 0.5) {
			const sz = this.renderer.getDrawingBufferSize(new THREE.Vector2());
			Object.assign(this.stats, { fps: this._frames / this._acc, cpuMs: this._cpu / this._frames, triangles: this.renderer.info.render.triangles, width: sz.x, height: sz.y, scale: this.dynScale });
			this._frames = 0; this._acc = 0; this._cpu = 0;
			if (s.dynamicRes && this.moving && this.stats.fps < 52 && this.dynScale > 0.7) this.wantScale = Math.max(0.7, this.dynScale - 0.1);
		}
		if (this.dynScale < 1 && !this.moving && performance.now() - this.stillAt > 350) this.wantScale = 1;
	}

	render() {
		this.renderer.info.reset();
		this.composer.render();
	}

	// Renders frames back to back and waits for the GPU each time, so the number is the true cost
	// of a frame, not the display's refresh interval. Same method as the POC's "Measure frame cost".
	// size: { width, height } renders at that fixed size (the gates are measured at 1792x1344)
	benchmark(n = 60, size = null) {
		const gl = this.renderer.getContext(), px = new Uint8Array(4), cam = this.camera, aspect = cam.aspect;
		if (size) {
			const { width, height } = size;
			this.renderer.setPixelRatio(1); this.renderer.setSize(width, height, false);
			this.composer.setPixelRatio(1); this.composer.setSize(width, height);
			this.bloom.setSize(width / 2, height / 2);
			cam.aspect = width / height; cam.updateProjectionMatrix();
		}
		const run = () => { for (let i = 0; i < n; i++) { this.rig.rotation.y += 0.01; this.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } };
		const r0 = this.rig.rotation.y;
		run(); // warm up: compiles any shader variant not yet seen
		const t = performance.now(); run();
		const ms = (performance.now() - t) / n;
		if (this.rigFixed) this.rig.rotation.y = r0; // studio lights stay where they were
		if (size) { cam.aspect = aspect; this.resize(); }
		return ms;
	}

	// The current view as a PNG blob at a fixed size (independent of the pane, which may be hidden),
	// rendered fresh so it does not need preserveDrawingBuffer.
	capture(width = this.photo ? this.photo.size[0] : 1600, height = this.photo ? this.photo.size[1] : 1200) {
		const r = this.renderer, cam = this.camera, aspect = cam.aspect;
		r.setPixelRatio(1); r.setSize(width, height, false);
		this.composer.setPixelRatio(1); this.composer.setSize(width, height);
		this.bloom.setSize(width / 2, height / 2);
		cam.aspect = width / height; cam.updateProjectionMatrix();
		for (const fn of this.onResize) fn(width, height);
		this.render();
		return new Promise((resolve) => r.domElement.toBlob((b) => { cam.aspect = aspect; this.resize(); resolve(b); }, 'image/png'));
	}

	// Render once at a fixed size and read back the (2r+1)-pixel square around (x, y) (pixels from
	// the top left), as sRGB bytes: how a panel's colour comes out under the rig, to match a photo.
	samplePatch(x, y, width, height, r = 4) {
		const R = this.renderer, cam = this.camera, aspect = cam.aspect, n = 2 * r + 1, buf = new Uint8Array(n * n * 4);
		R.setPixelRatio(1); R.setSize(width, height, false);
		this.composer.setPixelRatio(1); this.composer.setSize(width, height);
		this.bloom.setSize(width / 2, height / 2);
		cam.aspect = width / height; cam.updateProjectionMatrix();
		for (const fn of this.onResize) fn(width, height);
		this.render();
		const gl = R.getContext();
		gl.readPixels(Math.round(x) - r, height - 1 - Math.round(y) - r, n, n, gl.RGBA, gl.UNSIGNED_BYTE, buf); // GL rows run bottom up
		cam.aspect = aspect; this.resize();
		return buf;
	}

	// Look through a reference photo's solved camera, the photo over the view at `opacity`
	// (p = { url, size: [w, h], cam: { position, quaternion, fov }, opacity, mode: over|under|off }), or leave it (null).
	setPhoto(p) {
		if (!this.photoImg) {
			const wrap = this.photoWrap = document.createElement('div');
			Object.assign(wrap.style, { position: 'absolute', pointerEvents: 'none', display: 'none', zIndex: 1, overflow: 'hidden' });
			const img = this.photoImg = document.createElement('img');
			Object.assign(img.style, { position: 'absolute', maxWidth: 'none' });
			wrap.appendChild(img);
			this.container.appendChild(wrap);
		}
		const img = this.photoImg, wrap = this.photoWrap, cam = this.camera;
		if (!p) {
			if (this.photo) {
				this.photo = null; wrap.style.display = 'none';
				this.world.matrix.identity(); this.world.matrixWorldNeedsUpdate = true;
				cam.fov = this.savedFov ?? cam.fov; cam.near = 0.01; cam.far = 40; cam.updateProjectionMatrix();
				this.controls.enabled = true; if (this.savedView) this.setCamera(this.savedView); this.resize();
			}
			return;
		}
		if (!this.photo) { this.savedView = this.getCamera(); this.savedFov = cam.fov; }
		this.photo = p;
		if (img.getAttribute('src') !== p.url) img.src = p.url;
		wrap.style.display = p.mode === 'off' ? 'none' : 'block';
		img.style.opacity = String(p.opacity ?? 0.5);
		// the solved camera sees the body scaled by the photo's proportion correction about a pivot
		const c = p.cam, S = new THREE.Vector3(c.scale?.[0] ?? 1, c.scale?.[1] ?? 1, c.scale?.[0] ?? 1), C = new THREE.Vector3(...(c.pivot ?? [0, 0, 0]));
		this.world.matrixAutoUpdate = false;
		this.world.matrix.makeTranslation(C.x, C.y, C.z).multiply(new THREE.Matrix4().makeScale(S.x, S.y, S.z)).multiply(new THREE.Matrix4().makeTranslation(-C.x, -C.y, -C.z));
		this.world.matrixWorldNeedsUpdate = true;
		const pos = new THREE.Vector3(...c.position);
		cam.position.copy(pos);
		cam.quaternion.fromArray(c.quaternion);
		cam.fov = c.fov;
		cam.far = Math.max(40, pos.length() * 2); cam.near = Math.max(0.01, pos.length() * 0.002);
		cam.updateMatrixWorld(true);
		this.controls.enabled = false;
		this.resize();
	}

	setCamera({ position, target, fov }) {
		if (fov) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
		if (target) this.controls.target.fromArray(target);
		if (position) this.camera.position.fromArray(position);
		this.controls.update();
	}
	getCamera() {
		return { position: this.camera.position.toArray(), target: this.controls.target.toArray(), fov: this.camera.fov };
	}
}
