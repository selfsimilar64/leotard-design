// Turns the design document into the 3D scene. The document is the only input: sync(doc,
// touched) rebuilds whatever depends on the sections a command touched (see doc/store.js).
import * as THREE from 'three';
import { createFabricMaterial } from '../materials/fabric.js';
import { fullBodyStand, dressFormStand } from './stand.js';
import { MANNEQUIN_FINISHES } from './presets.js';
import { LegacyGarment } from '../garment/legacy.js';
import { GarmentView } from './garment.js';
import { buildGarment, evaluateAll, panelAt } from '../garment/build.js';
import { Surface } from '../body/surface.js';
import { Overlay } from './overlay.js';
import { Rims } from './rims.js';
import { TextureLibrary } from '../materials/textures.js';

export class Engine {
	// ref: the reference garment surface (body/reference.js), where curves live
	constructor(viewport, body, ref) {
		this.viewport = viewport; this.body = body; this.ref = ref; this.surf = ref.surface;
		const scene = viewport.scene;
		this.skin = createFabricMaterial(3);
		// the mannequin's neck is an open tube under the egg head: show its inside, not the background
		this.skin.side = THREE.DoubleSide;
		this.skinMesh = new THREE.Mesh(body.geometry, this.skin);
		this.skinMesh.frustumCulled = false; // the geometry's positions change when the body is swapped
		scene.add(this.skinMesh);
		this.capMaterial = new THREE.MeshPhysicalMaterial();
		this.stand = null;
		this.legacy = new LegacyGarment(scene, body);
		this.garment = new GarmentView(scene, body);
		this.textures = new TextureLibrary(viewport.renderer);
		this.garment.textures = this.textures;
		this.overlay = new Overlay(scene, body);
		this.rims = new Rims(scene, body);
		this.ui = { selected: null, hover: null, showPoints: false }; // overlay state from the UI
		this.timing = { mannequin: 0, garment: null };
		this.bodyKey = null;
		this.g = null;
		this.geoSig = null;
		viewport.onFrame.add(() => { this.legacy.frame(viewport.keyDir); this.garment.frame(viewport.keyDir); this.rims.frame(viewport.keyDir); });
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
		const hit = this.pick.raycast(this.raycaster.ray);
		const out = { x, y, sp: hit ? { f: hit.f, b0: hit.b0, b1: hit.b1, b2: hit.b2 } : null, point: hit?.point ?? null, distance: hit?.distance ?? Infinity };
		if (out.sp && this.g && this.app) out.panel = panelAt(this.g, this.app.doc, this.surf, out.sp);
		return out;
	}

	// Screen position (CSS pixels) of a surface point on the current garment, and its depth.
	toScreen(sp) {
		const vp = this.viewport, el = vp.renderer.domElement, p = this.overlay.place(sp, new THREE.Vector3());
		const d = p.distanceTo(vp.camera.position);
		p.project(vp.camera);
		return { x: (p.x + 1) / 2 * el.clientWidth, y: (1 - p.y) / 2 * el.clientHeight, d, behind: p.z > 1 };
	}

	// Nearest curve (by screen distance) within `px` pixels of (x, y), not hidden behind the body.
	curveAt(x, y, px = 7) {
		if (!this.g) return null;
		const surfHit = this.pickAt(x, y);
		let best = null, bd = px;
		for (const [key, e] of this.g.evaluated) {
			for (let i = 0; i < e.sps.length; i += 2) {
				const s = this.toScreen(e.sps[i]);
				if (s.behind) continue;
				const d = Math.hypot(s.x - x, s.y - y);
				if (d < bd && s.d < (surfHit?.distance ?? Infinity) + 0.01) { bd = d; best = { key, curve: e.curve, mirrored: e.mirrored, sample: i, t: e.s[i] / Math.max(e.s[e.s.length - 1], 1e-9) }; }
			}
		}
		return best;
	}

	stoneCount() { return this.legacy.visible === false ? 0 : this.legacy.stones.count; }

	get fabricMaterials() { return [this.skin, ...this.legacy.materials, ...this.garment.materials.values()]; }

	sync(doc, touched, why) {
		const all = why === 'load' || !this.synced;
		const t = (k) => all || touched.has(k);
		if (t('scene')) this.viewport.applyScene(doc.scene);
		const legacy = !!doc.legacy;
		if (legacy !== this.legacyMode) {
			// switching garment model: the other model's cover field must be rebuilt
			this.legacyMode = legacy;
			this.legacy.state = null; this.body.styleKey = null; this.geoSig = null;
			this.legacy.setVisible(legacy); this.garment.setVisible(!legacy); this.rims.setVisible(!legacy);
		}
		if (legacy) {
			// Style before the first body: the garment surface needs the regions, and setStyle skips the
			// rebuild until a body is set, so the lift solve (~0.7 s) runs once at start-up.
			if (!this.body.key) this.body.setStyle(doc.legacy);
			if (t('body')) this.applyBody(doc.body, all);
			if (t('legacy') || !this.legacy.state) this.legacy.apply(doc.legacy);
		} else if (why === 'gesture' && !all) {
			// mid-drag: only the dragged lines move; the garment is re-cut when the gesture ends
			if (touched.has('curves')) this.drawOverlay(doc, evaluateAll(doc, this.surf, 'L0', this.g?.evaluated));
			if (touched.has('panels')) this.garment.applyMaterials(doc);
		} else {
			if (t('curves') || t('panels') || t('layers') || t('trims') || this.geoSig === null) this.syncGarment(doc);
			if (t('body')) this.applyBody(doc.body, all);
		}
		if (!legacy && why !== 'gesture') this.drawOverlay(doc);
		this.synced = true;
	}

	drawOverlay(doc, evaluated = this.g?.evaluated) {
		this.overlay.setVisible(!doc.legacy);
		if (evaluated) this.overlay.setCurves(evaluated, doc, this.ui);
		this.lastEvaluated = evaluated;
	}
	setUI(ui) { Object.assign(this.ui, ui); if (this.lastEvaluated && this.app) this.drawOverlay(this.app.doc, this.lastEvaluated); }

	// Rebuild the cut garment when its geometry inputs changed; otherwise only its materials.
	syncGarment(doc) {
		const sig = JSON.stringify([doc.curves, doc.panels.map((p) => [p.id, p.seed, p.removed, p.mirror, p.layer])]);
		if (sig !== this.geoSig) {
			const t0 = performance.now();
			const prev = this.pending?.curveSig === JSON.stringify(doc.curves) ? this.pending : this.g;
			this.g = buildGarment(doc, this.surf, { prev });
			this.pending = null;
			const t1 = performance.now();
			this.garment.setGarment(this.g, doc);
			this.rims.build(this.g, doc, this.garment.garmentCells);
			this.geoSig = sig;
			this.trimSig = JSON.stringify([doc.trims, doc.panels.map((p) => p.stack?.[0])]);
			this.timing.garment = { ...this.g.ms, meshes: performance.now() - t1, total: performance.now() - t0, warn: this.g.arr.warn.length };
		} else {
			this.garment.applyMaterials(doc);
			const ts = JSON.stringify([doc.trims, doc.panels.map((p) => p.stack?.[0])]);
			if (ts !== this.trimSig) { this.trimSig = ts; this.rims.build(this.g, doc, this.garment.garmentCells); }
		}
	}

	applyFinish(name) {
		const f = MANNEQUIN_FINISHES[name] ?? MANNEQUIN_FINISHES['Matte white fibreglass'], skin = this.skin, u = skin.userData.u;
		skin.color.set(f.colour); skin.roughness = f.roughness;
		skin.clearcoat = f.clearcoat ?? 0; skin.clearcoatRoughness = f.clearcoatRoughness ?? 0;
		skin.sheen = f.sheen ?? 0; skin.sheenRoughness = 0.7; skin.sheenColor.set(0xffffff);
		u.uKnit.value = f.knit ?? 0;
		u.uTape.value = f.tape ? 1 : 0;
		skin.needsUpdate = true;
		const cm = this.capMaterial;
		cm.color.set(f.colour); cm.roughness = f.roughness; cm.clearcoat = f.clearcoat ?? 0; cm.sheen = f.sheen ?? 0;
		cm.needsUpdate = true;
	}

	// Which body, full figure or dress form, its finish, its stand.
	applyBody(b, force) {
		this.applyFinish(b.finish);
		const key = b.size + '|' + b.form;
		if (!force && key === this.bodyKey) return;
		const reframe = this.bodyKey !== null;
		this.bodyKey = key;
		const t = performance.now(), body = this.body, scene = this.viewport.scene;
		if (body.key !== b.size || !body.key) body.setBody(b.size);
		const torso = b.form === 'torso';
		body.clip = torso;
		const fl = body.formLines;
		for (const m of this.fabricMaterials) {
			m.userData.u.uClip.value = torso ? 1 : 0;
			m.userData.u.uTapeY.value.set(fl.waist, fl.bust, fl.hip, fl.neck);
		}
		if (this.stand) { scene.remove(this.stand); this.stand.traverse((o) => o.geometry?.dispose()); }
		this.stand = torso ? dressFormStand(body, this.capMaterial) : fullBodyStand(body);
		scene.add(this.stand);
		const s = torso ? 0.9 : 0.75, blob = this.viewport.blob;
		blob.scale.set(s, s, 1); blob.position.z = torso ? body.crotch.z : 0;
		this.timing.mannequin = performance.now() - t;
		if (this.legacyMode) this.legacy.onBodyChanged();
		else { this.garment.refresh(); if (this.app) { this.drawOverlay(this.app.doc); this.rims.build(this.g, this.app.doc, this.garment.garmentCells); } }
		if (reframe) this.frameCamera(b.form);
	}

	// Fit the leotard area (mid-thigh to the head, or the whole dress form) in view, keeping the
	// current orbit direction.
	frameCamera(form = 'full') {
		const body = this.body, b = body.body, torso = form === 'torso', cam = this.viewport.camera, controls = this.viewport.controls;
		const top = torso ? b.landmarks.neck_base[1] + 0.09 : b.stature + 0.03;
		const bottom = torso ? body.crotch.y - 0.2 : body.crotch.y - 0.33;
		const span = top - bottom, centre = new THREE.Vector3(0, (top + bottom) / 2, 0);
		const fov = THREE.MathUtils.degToRad(cam.fov), fit = Math.max(span, span * 0.62 / cam.aspect);
		const dist = fit / 2 / Math.tan(fov / 2) * 1.12;
		const dir = cam.position.clone().sub(controls.target).normalize();
		controls.target.copy(centre);
		cam.position.copy(centre).addScaledVector(dir, dist);
	}
}
