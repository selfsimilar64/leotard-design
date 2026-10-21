// Turns the design document into the 3D scene. The document is the only input: sync(doc,
// touched) rebuilds whatever depends on the sections a command touched (see doc/store.js).
import * as THREE from 'three';
import { createFabricMaterial } from '../materials/fabric.js';
import { fullBodyStand, dressFormStand, cutCaps } from './stand.js';
import { MANNEQUIN_FINISHES, REALISTIC_SKIN } from './presets.js';
import { DecalSet } from './decals.js';
import { surfaceLandmarks } from '../body/landmarks.js';
import { poseSpec } from '../body/pose.js';
import { LegacyGarment } from '../garment/legacy.js';
import { GarmentView, sameSign } from './garment.js';
import { buildGarment, evaluateAll, panelAt } from '../garment/build.js';
import { Surface } from '../body/surface.js';
import { Overlay } from './overlay.js';
import { Rims } from './rims.js';
import { TextureLibrary } from '../materials/textures.js';
import { StrapView } from './straps.js';
import { HardwareView } from './hardware.js';
import { StoneView } from '../stones/view.js';
import { runStones } from '../stones/generators.js';
import { locate } from '../garment/arrangement.js';
import { TRIMS } from '../garment/trim.js';
import { FigureView } from './figure.js';
import { markSkin } from './postfx.js';

export class Engine {
	// ref: the reference garment surface (body/reference.js), where curves live
	constructor(viewport, body, ref) {
		this.viewport = viewport; this.body = body; this.ref = ref; this.surf = ref.surface;
		const scene = viewport.world; // the body and garment (scaled together when matching a photo)
		// The mannequin's skin in two pieces split along the head's border (the head bone's skin weight
		// at one half, per pixel: each piece discards the other's side through its own keep field), so
		// the body and the mannequin head take their own finishes; the body's can also be the
		// person's realistic skin (render/figure.js) under any head.
		this.skin = createFabricMaterial(3);
		this.headSkin = createFabricMaterial(3);
		// cut bodies (dress form, no head) are open tubes under their caps: show the inside, not the background
		this.skin.side = this.headSkin.side = THREE.DoubleSide;
		// the body's own geometry plus closed eyes for the mannequin head (body.eyeCaps): same attributes
		const caps = body.eyeCaps(), ix = new Uint32Array(body.idx.length + caps.length);
		ix.set(body.idx); ix.set(caps, body.idx.length);
		const piece = (mat) => {
			const g = new THREE.BufferGeometry(), keep = new THREE.BufferAttribute(new Float32Array(body.vertices), 1);
			for (const [k, a] of Object.entries(body.geometry.attributes)) g.setAttribute(k, k === 'aKeep' ? keep : a);
			g.setIndex(new THREE.BufferAttribute(ix, 1));
			const m = new THREE.Mesh(g, mat);
			m.frustumCulled = false; // the geometry's positions change when the body is swapped
			m.castShadow = m.receiveShadow = true; // arms shade the torso
			m.userData.keep = keep;
			scene.add(m);
			return m;
		};
		this.skinMesh = piece(this.skin);
		this.headMesh = piece(this.headSkin);
		this.capMaterial = new THREE.MeshPhysicalMaterial();
		this.stand = null;
		this.figure = new FigureView(scene, viewport.renderer); // head type 'person': a real person instead of the mannequin's skin
		this.legacy = new LegacyGarment(scene, body);
		this.textures = new TextureLibrary(viewport.renderer);
		this.layers = new Map(); // layer id -> { layer, g, view: GarmentView, rims: Rims }
		this.straps = new StrapView(scene, body, this.textures);
		this.hardware = new HardwareView(scene, body, this.surf);
		this.stoneView = new StoneView(scene, body);
		this.stoneRun = { stones: [], errors: [], dropped: 0 };
		this.coverHooks = [(cover) => this.straps.markCover(cover)];
		this.overlay = new Overlay(scene, body);
		this.ui = { selected: null, hover: null, showPoints: false }; // overlay state from the UI
		this.timing = { mannequin: 0, garment: null };
		this.bodyKey = null;
		this.g = null;          // the shell layer's build (tools and picking use it)
		this.evaluated = null;  // every layer's evaluated curves
		this.geoSig = null;
		viewport.onFrame.add(() => {
			this.legacy.frame(viewport.keyDir);
			for (const L of this.layers.values()) { L.view.frame(viewport.keyDir); L.rims.frame(viewport.keyDir); }
			this.straps.frame(viewport.keyDir);
		});
		// picking surface: the garment surface of the body on show (same canonical faces as everywhere)
		this.pick = null;
		body.onGarment = [() => { if (this.pick) this.pick.update(body.garmentPos); else this.pick = new Surface(body.idx, body.garmentPos); }];
		this.raycaster = new THREE.Raycaster();
	}

	// What is under a screen point: the garment surface point, the panel there, and (for the
	// selected curve) a control point within reach. x, y in CSS pixels relative to the canvas.
	pickAt(x, y) {
		if (!this.pick) return null;
		const vp = this.viewport, el = vp.renderer.domElement, w = el.clientWidth, h = el.clientHeight;
		const ndc = new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1);
		this.raycaster.setFromCamera(ndc, vp.camera);
		// into the body's own space (undo a photo's proportion scaling)
		vp.world.updateMatrixWorld();
		const ray = this.raycaster.ray.clone().applyMatrix4(vp.world.matrixWorld.clone().invert());
		ray.direction.normalize();
		const hit = this.pick.raycast(ray);
		const out = { x, y, sp: hit ? { f: hit.f, b0: hit.b0, b1: hit.b1, b2: hit.b2 } : null, point: hit?.point ?? null, distance: hit?.distance ?? Infinity };
		if (out.sp && this.app) {
			// the outermost layer with a (not cut out) panel here
			for (const L of [...this.layers.values()].sort((a, b) => (b.layer.z ?? 0) - (a.layer.z ?? 0))) {
				const id = panelAt(L.g, this.app.doc, this.surf, out.sp);
				if (id && !this.app.doc.panels.find((p) => p.id === id)?.removed) { out.panel = id; out.layer = L.layer.id; break; }
				if (id && !out.panel) { out.panel = id; out.layer = L.layer.id; }
			}
		}
		return out;
	}

	// Screen position (CSS pixels) of a surface point on the current garment, and its depth.
	toScreen(sp) {
		const vp = this.viewport, el = vp.renderer.domElement, p = this.overlay.place(sp, new THREE.Vector3()).applyMatrix4(vp.world.matrixWorld);
		const d = p.distanceTo(vp.camera.position);
		p.project(vp.camera);
		return { x: (p.x + 1) / 2 * el.clientWidth, y: (1 - p.y) / 2 * el.clientHeight, d, behind: p.z > 1 };
	}

	// Nearest curve (by screen distance) within `px` pixels of (x, y), not hidden behind the body.
	curveAt(x, y, px = 7) {
		if (!this.evaluated) return null;
		const surfHit = this.pickAt(x, y);
		let best = null, bd = px;
		for (const [key, e] of this.evaluated) {
			for (let i = 0; i < e.sps.length; i += 2) {
				const s = this.toScreen(e.sps[i]);
				if (s.behind) continue;
				const d = Math.hypot(s.x - x, s.y - y);
				if (d < bd && s.d < (surfHit?.distance ?? Infinity) + 0.01) { bd = d; best = { key, curve: e.curve, mirrored: e.mirrored, sample: i, t: e.s[i] / Math.max(e.s[e.s.length - 1], 1e-9) }; }
			}
		}
		return best;
	}

	stoneCount() { return this.legacyMode ? this.legacy.stones.count : this.stoneView.count; }

	get fabricMaterials() { return [this.skin, this.headSkin, ...this.legacy.materials, ...[...this.layers.values()].flatMap((L) => [...L.view.materials.values()])]; }
	get garment() { return this.layers.get('L0')?.view ?? null; }
	get views() { return [...this.layers.values()].map((L) => L.view); }
	whenFlat() { return Promise.all(this.views.map((v) => v.whenFlat())); }

	sync(doc, touched, why) {
		const all = why === 'load' || !this.synced;
		const t = (k) => all || touched.has(k);
		if (t('scene')) this.viewport.applyScene(doc.scene);
		const legacy = !!doc.legacy;
		if (legacy !== this.legacyMode) {
			// switching garment model: the other model's cover field must be rebuilt
			this.legacyMode = legacy;
			this.legacy.state = null; this.body.styleKey = null; this.geoSig = null;
			this.legacy.setVisible(legacy);
			for (const L of this.layers.values()) { L.view.setVisible(!legacy); L.rims.setVisible(!legacy); }
			this.straps.setVisible(!legacy); this.hardware.setVisible(!legacy); this.stoneView.setVisible(!legacy);
		}
		if (legacy) {
			// Style before the first body: the garment surface needs the regions, and setStyle skips the
			// rebuild until a body is set, so the lift solve (~0.7 s) runs once at start-up.
			if (!this.body.key) this.body.setStyle(doc.legacy);
			if (t('body')) this.applyBody(doc.body, all);
			if (t('legacy') || !this.legacy.state) this.legacy.apply(doc.legacy);
		} else if (why === 'gesture' && !all) {
			// mid-drag: only the dragged lines move; the garment is re-cut when the gesture ends
			if (touched.has('curves')) this.drawOverlay(doc, evaluateAll(doc, this.surf, null, this.evaluated));
			if (touched.has('panels')) for (const v of this.views) v.applyMaterials(doc);
		} else {
			if (t('curves') || t('panels') || t('layers') || t('trims') || this.geoSig === null) this.syncGarment(doc);
			else if (t('straps')) this.syncStraps(doc);
			if (t('hardware') || t('curves') || t('panels')) this.hardware.build(doc);
			if (t('stones') || t('placed') || t('curves') || t('panels') || t('straps') || t('trims') || t('layers')) this.syncStones(doc);
			if (t('decals') || t('layers') || t('curves') || t('panels')) this.syncDecals(doc);
			if (t('body')) this.applyBody(doc.body, all);
		}
		if (!legacy && why !== 'gesture') this.drawOverlay(doc);
		this.synced = true;
	}

	drawOverlay(doc, evaluated = this.evaluated) {
		this.overlay.setVisible(!doc.legacy);
		if (evaluated) this.overlay.setCurves(evaluated, doc, this.ui);
		this.lastEvaluated = evaluated;
	}
	setUI(ui) { Object.assign(this.ui, ui); if (this.lastEvaluated && this.app) this.drawOverlay(this.app.doc, this.lastEvaluated); }

	// Rebuild the cut garment (every layer) when its geometry inputs changed; otherwise only its
	// materials and edge finishes.
	syncGarment(doc) {
		const sig = JSON.stringify([doc.curves, doc.panels.map((p) => [p.id, p.seed, p.removed, p.mirror, p.layer]), doc.layers]);
		const trimSig = JSON.stringify([doc.trims, doc.panels.map((p) => p.stack?.[0])]);
		if (sig !== this.geoSig) {
			const t0 = performance.now(), scene = this.viewport.world;
			const curveSig = JSON.stringify(doc.curves);
			const evaluated = this.pending?.curveSig === curveSig ? this.pending.evaluated : evaluateAll(doc, this.surf, null, this.evaluated);
			const keep = new Set(doc.layers.map((l) => l.id));
			for (const [id, L] of this.layers) if (!keep.has(id)) { L.view.dispose(); L.rims.dispose(); scene.remove(L.view.group); scene.remove(L.rims.group); this.layers.delete(id); }
			for (const layer of doc.layers) {
				let L = this.layers.get(layer.id);
				if (!L) {
					L = { layer, view: new GarmentView(scene, this.body, layer), rims: new Rims(scene, this.body), g: null };
					L.view.textures = this.textures;
					L.view.wrinkles = this.wrinkleZones();
					this.layers.set(layer.id, L);
				}
				L.layer = layer; L.view.layer = layer; L.rims.kind = layer.kind; L.rims.layerId = layer.id;
				const prev = layer.id === 'L0' && this.pending?.curveSig === curveSig ? this.pending : L.g;
				L.g = buildGarment(doc, this.surf, { prev, layer: layer.id, evaluated });
				L.view.setGarment(L.g, doc);
			}
			// linings show only where the shell has fabric
			const shell = this.layers.get('L0')?.view;
			for (const L of this.layers.values()) if ((L.layer.z ?? 0) < 0) L.view.setClip(shell?.cover ?? null);
			this.pending = null;
			this.evaluated = evaluated;
			this.g = this.layers.get('L0')?.g ?? null;
			this.straps.prepare(doc, evaluated, this.surf);
			this.updateCover(doc);
			for (const L of this.layers.values()) L.rims.build(L.g, doc, L.view.garmentCells, this.evaluated, layerLift(L.layer));
			this.straps.build(doc, this.fabricCover);
			this.geoSig = sig; this.trimSig = trimSig;
			this.timing.garment = { ...(this.g?.ms ?? {}), total: performance.now() - t0, warn: this.g?.arr.warn.length ?? 0 };
		} else {
			for (const v of this.views) v.applyMaterials(doc);
			if (trimSig !== this.trimSig) { this.trimSig = trimSig; for (const L of this.layers.values()) L.rims.build(L.g, doc, L.view.garmentCells, this.evaluated, layerLift(L.layer)); }
			this.syncStraps(doc);
		}
	}

	// Tension wrinkle zones on the reference body (shared by every panel material): the crotch,
	// folds fanning up the front, and each armpit, folds fanning over the side; an arm raised
	// pulls its armpit smooth.
	wrinkleZones() {
		if (!this.wrinkles) {
			const lm = surfaceLandmarks(this.body, this.surf), P = (k) => this.surf.pos(lm[k]);
			const c = P('crotch'), ul = P('underarm-l'), ur = P('underarm-r');
			this.wrinkles = {
				Z: [new THREE.Vector4(c.x, c.y + 0.015, c.z, 0.12), new THREE.Vector4(ul.x, ul.y - 0.01, 0.0, 0.08), new THREE.Vector4(ur.x, ur.y - 0.01, 0.0, 0.08)],
				N: [new THREE.Vector4(0, 0, 1, 1), new THREE.Vector4(1, 0, 0, 1), new THREE.Vector4(-1, 0, 0, 1)],
			};
		}
		return this.wrinkles;
	}
	setWrinklePose(pose) {
		const p = poseSpec(pose), W = this.wrinkleZones();
		// (a Daz pose's arms are not presets: its armpits keep their folds)
		W.N[1].w = p.left === 'up' ? 0.3 : 1; W.N[2].w = p.right === 'up' ? 0.3 : 1;
	}

	// Logos and lettering: every layer's views get that layer's decal atlas and boxes.
	syncDecals(doc) {
		if (!this.decals) { this.decals = new DecalSet(); this.decals.onChange = () => this.app && this.syncDecals(this.app.doc); }
		this.decals.build(doc, this.surf);
		for (const [id, L] of this.layers) L.view.setDecals(this.decals.forLayer(id));
	}

	// Straps alone changed (or the garment did): new grids, cover (they bridge hollows like fabric), meshes.
	syncStraps(doc) {
		this.straps.prepare(doc, this.evaluated, this.surf);
		this.updateCover(doc);
		this.straps.build(doc, this.fabricCover);
	}

	// The fabric lift solve sees every layer's fabric (and strap footprints, via coverHooks); it
	// only re-runs when where-fabric-is changes, then every layer re-reads the lifted surface.
	updateCover(doc) {
		const V = this.body.vertices, cover = new Float32Array(V).fill(-1);
		for (const L of this.layers.values()) { const c = L.view.cover; if (c) for (let i = 0; i < V; i++) if (c[i] > 0) cover[i] = 1; }
		this.fabricCover = Float32Array.from(cover); // fabric only (straps lie on it or on skin)
		for (const fn of this.coverHooks ?? []) fn(cover, doc);
		if (!this.cover || !sameSign(this.cover, cover)) {
			this.cover = cover;
			this.body.setCover(cover);
			for (const v of this.views) v.refresh();
		}
	}

	// Mannequin finishes: the body's (or the realistic skin, drawn by the figure; the caps and the
	// dress form then take the plain skin tone) and the mannequin head's.
	applyFinish(name, headName = name) {
		const real = name === REALISTIC_SKIN;
		const f = MANNEQUIN_FINISHES[real ? 'Skin tone' : name] ?? MANNEQUIN_FINISHES['Matte white fibreglass'];
		setFinish(this.skin, f); setFinish(this.headSkin, MANNEQUIN_FINISHES[headName] ?? f);
		const cm = this.capMaterial;
		cm.color.set(f.colour); cm.roughness = f.roughness; cm.clearcoat = f.clearcoat ?? 0; cm.sheen = f.sheen ?? 0;
		cm.needsUpdate = true;
	}

	// Which body, pose, head and expression, full figure or dress form, its finish, its stand.
	applyBody(b, force) {
		this.applyFinish(b.finish, b.headFinish);
		const head = b.head ?? 'mannequin', pose = b.pose ?? 'a-pose', poseKey = JSON.stringify(pose);
		const key = JSON.stringify([b.size, b.form, head, pose, b.finish === REALISTIC_SKIN]);
		// what the figure draws: its head (a person's), its skin below the head (realistic skin), or both
		const torso = b.form === 'torso', person = head === 'person' && !torso, real = b.finish === REALISTIC_SKIN && !torso;
		const part = person && real ? 'all' : person ? 'head' : real ? 'body' : null;
		const figure = () => (this.figureReady = this.figure.show(part ? {
			man: this.body, body: this.body.body, cage: this.body.cage, poseKey: this.body.body.daz ?? 'a-pose', shape: this.body.key + '|' + this.body.poseKey,
			expression: b.expression, part, keep: this.body.keep, cut: this.body.formKind + '|' + this.body.head,
		} : null));
		// an expression only changes the person's face
		if (!force && key === this.bodyKey) { figure(); return; }
		// a new size or form reframes the camera; a new pose, head or expression keeps it
		const shape = b.size + '|' + b.form, reframe = this.bodyKey !== null && this.shapeKey !== shape;
		this.bodyKey = key; this.shapeKey = shape;
		const t = performance.now(), body = this.body, scene = this.viewport.world;
		body.setCut(b.form, head); // before setBody: the mannequin head is shaped there
		if (body.key !== b.size || body.poseKey !== poseKey || !body.key || body.headKey !== body.head) body.setBody(b.size, pose);
		this.setWrinklePose(pose);
		body.clip = torso || body.headless;
		const fl = body.formLines;
		for (const m of this.fabricMaterials) {
			m.userData.u.uClip.value = body.clip ? 1 : 0;
			m.userData.u.uTapeY.value.set(fl.waist, fl.bust, fl.hip, fl.neck);
		}
		// the two skin pieces always clip: the body's cut, and each other's side of the head's border
		const K = body.keep, H = body.wHead, kb = this.skinMesh.userData.keep, kh = this.headMesh.userData.keep;
		for (let i = 0; i < body.vertices; i++) { kb.array[i] = Math.min(K[i], 0.5 - H[i]); kh.array[i] = Math.min(K[i], H[i] - 0.5); }
		kb.needsUpdate = kh.needsUpdate = true;
		for (const m of [this.skin, this.headSkin]) m.userData.u.uClip.value = 1;
		if (this.stand) { scene.remove(this.stand); this.stand.traverse((o) => o.geometry?.dispose()); }
		// the person stands on their own; a Daz pose (leaps, kneeling) has no stand either
		const daz = !!body.body.daz;
		this.stand = torso ? dressFormStand(body, this.capMaterial) : new THREE.Group();
		if (!torso && body.headless) this.stand.add(cutCaps(body, this.capMaterial));
		if (!torso && !person && !daz) this.stand.add(fullBodyStand(body));
		scene.add(this.stand);
		this.skinMesh.visible = !real;
		this.headMesh.visible = !torso && head === 'mannequin';
		figure();
		const s = torso ? 0.9 : 0.75, blob = this.viewport.blob;
		blob.scale.set(s, s, 1); blob.position.z = torso ? body.crotch.z : 0;
		blob.visible = !daz;
		this.timing.mannequin = performance.now() - t;
		if (this.legacyMode) this.legacy.onBodyChanged();
		else {
			for (const v of this.views) v.refresh();
			if (this.app) { this.drawOverlay(this.app.doc); for (const L of this.layers.values()) L.rims.build(L.g, this.app.doc, L.view.garmentCells, this.evaluated, layerLift(L.layer)); this.straps.build(this.app.doc, this.fabricCover); this.hardware.build(this.app.doc); this.stoneView.build(); }
		}
		if (reframe) this.frameCamera(b.form);
	}

	// Fit the leotard area (mid-thigh to the top of the head, or the whole dress form) in view,
	// keeping the current orbit direction. A Daz pose (leaps, kneeling) is framed whole.
	frameCamera(form = 'full') {
		const body = this.body, b = body.body, torso = form === 'torso', cam = this.viewport.camera, controls = this.viewport.controls;
		const bb = body.geometry.boundingBox;
		let top = torso ? b.landmarks.neck_base[1] + 0.09 : bb.max.y + 0.03;
		let bottom = torso ? body.crotch.y - 0.2 : body.crotch.y - 0.33;
		if (b.daz && !torso) { top = bb.max.y + 0.03; bottom = bb.min.y - 0.03; }
		const span = top - bottom, centre = new THREE.Vector3(b.daz ? (bb.min.x + bb.max.x) / 2 : 0, (top + bottom) / 2, b.daz ? (bb.min.z + bb.max.z) / 2 : 0);
		const fov = THREE.MathUtils.degToRad(cam.fov), fit = Math.max(span, (b.daz ? bb.max.x - bb.min.x : span * 0.62) / cam.aspect);
		const dist = fit / 2 / Math.tan(fov / 2) * 1.12;
		const dir = cam.position.clone().sub(controls.target).normalize();
		controls.target.copy(centre);
		cam.position.copy(centre).addScaledVector(dir, dist);
	}
}

// A mannequin finish (render/presets.js) on a skin piece's material.
function setFinish(m, f) {
	const u = m.userData.u;
	m.color.set(f.colour); m.roughness = f.roughness;
	m.clearcoat = f.clearcoat ?? 0; m.clearcoatRoughness = f.clearcoatRoughness ?? 0;
	m.sheen = f.sheen ?? 0; m.sheenRoughness = 0.7; m.sheenColor.set(0xffffff);
	u.uKnit.value = f.knit ?? 0;
	u.uTape.value = f.tape ? 1 : 0;
	u.uSkin.value = f.skin ?? 0;
	markSkin(m, !!f.skin); // the athlete-skin finishes take the subsurface scattering pass
	m.needsUpdate = true;
}

// Extra height of a layer's finishes above the shell's (overlays sit 0.9 mm per step higher).
function layerLift(layer) { const z = layer?.z ?? 0; return z > 0 ? 0.0009 * z : 0; }

// --- stones --------------------------------------------------------------------------------------
Engine.prototype.syncStones = function (doc) {
	if (!this.g) return;
	const t0 = performance.now();
	const edge = this.edgeKeepOut(doc);
	const layerZ = new Map(doc.layers.map((l) => [l.id, l.z ?? 0]));
	const ctx = {
		surf: this.surf, man: this.body, doc, evaluated: this.evaluated, landmarks: this.app?.store.ctx.landmarks, // man: point specs such as { front: [x, y] }
		garment: (layer = 'L0') => this.layers.get(layer)?.g ?? this.g,
		strapHeight: (s) => 0.0009 + 0.0013 * (s.layer ?? 0) + 0.0019 * Math.min(s.width / 0.01, 1.4),
		// on fabric (any layer's panel that is not cut out) and clear of finished opening edges
		isFabric: (sp, p, size, keepOut) => {
			let on = false;
			for (const L of this.layers.values()) {
				const t = locate(L.g.arr, this.surf, sp);
				if (t < 0) continue;
				const pi = L.g.cellPanel[L.g.arr.cellOf[t]];
				if (pi >= 0 && !doc.panels[pi].removed) { on = true; break; }
			}
			return on && edge(p, keepOut) > size / 2;
		},
	};
	this.stoneRun = runStones(doc, ctx);
	this.stoneView.set(this.stoneRun.stones, (s) => (s.layer ? 0.0009 * Math.max(layerZ.get(s.layer) ?? 0, 0) : 0));
	this.timing.stones = { ms: performance.now() - t0, count: this.stoneRun.stones.length, dropped: this.stoneRun.dropped, errors: this.stoneRun.errors };
};

// Distance from a reference position to the nearest finished opening edge, minus that edge's
// keep-out (elastic 1 cm + 1.5 mm, binding 8 mm + 1.5 mm, raw 2 mm): stones stay off the elastic.
Engine.prototype.edgeKeepOut = function (doc) {
	const L0 = this.layers.get('L0');
	const loops = L0?.rims?.loops ?? [];
	const arr = this.g.arr, VP = arr.VP, cell = 0.02, grid = new Map();
	for (const loop of loops) {
		let keep = TRIMS.elastic.width + 0.0015;
		const main = loop.curves.find(Boolean)?.replace(/~m$/, '');
		const t = main && doc.trims.find((x) => x.on.includes(main));
		if (t) keep = t.kind === 'none' ? 0.002 : t.kind === 'binding' ? TRIMS.binding.width + 0.0015 : keep;
		for (const v of loop.verts) {
			const x = VP[v * 3], y = VP[v * 3 + 1], z = VP[v * 3 + 2], k = Math.floor(x / cell) + ',' + Math.floor(y / cell) + ',' + Math.floor(z / cell);
			if (!grid.has(k)) grid.set(k, []);
			grid.get(k).push([x, y, z, keep]);
		}
	}
	// override: a generator's own keep-out (metres) instead of the edge finish's
	return (p, override) => {
		let best = Infinity;
		const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell), cz = Math.floor(p.z / cell);
		for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
			for (const q of grid.get((cx + i) + ',' + (cy + j) + ',' + (cz + k)) ?? []) best = Math.min(best, Math.hypot(p.x - q[0], p.y - q[1], p.z - q[2]) - (override ?? q[3]));
		}
		return best;
	};
};
