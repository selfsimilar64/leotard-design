// Turns the design document into the 3D scene. The document is the only input: sync(doc,
// touched) rebuilds whatever depends on the sections a command touched (see doc/store.js).
import * as THREE from 'three';
import { createFabricMaterial } from '../materials/fabric.js';
import { fullBodyStand, dressFormStand } from './stand.js';
import { MANNEQUIN_FINISHES } from './presets.js';
import { LegacyGarment } from '../garment/legacy.js';

export class Engine {
	constructor(viewport, body) {
		this.viewport = viewport; this.body = body;
		const scene = viewport.scene;
		this.skin = createFabricMaterial(3);
		this.skinMesh = new THREE.Mesh(body.geometry, this.skin);
		this.skinMesh.frustumCulled = false; // the geometry's positions change when the body is swapped
		scene.add(this.skinMesh);
		this.capMaterial = new THREE.MeshPhysicalMaterial();
		this.stand = null;
		this.legacy = new LegacyGarment(scene, body);
		this.timing = { mannequin: 0 };
		this.bodyKey = null;
		viewport.onFrame.add(() => this.legacy.frame(viewport.keyDir));
	}

	stoneCount() { return this.legacy.visible === false ? 0 : this.legacy.stones.count; }

	get fabricMaterials() { return [this.skin, ...this.legacy.materials]; }

	sync(doc, touched, why) {
		const all = why === 'load' || !this.synced;
		const t = (k) => all || touched.has(k);
		if (t('scene')) this.viewport.applyScene(doc.scene);
		// Style before the first body: the garment surface needs the regions, and setStyle skips the
		// rebuild until a body is set, so the lift solve (~0.7 s) runs once at start-up.
		if (all && doc.legacy && !this.body.key) this.body.setStyle(doc.legacy);
		if (t('body')) this.applyBody(doc.body, all);
		if (t('legacy')) {
			if (doc.legacy) { this.legacy.setVisible(true); this.legacy.apply(doc.legacy); }
			else this.legacy.setVisible(false);
		}
		this.synced = true;
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
		this.legacy.onBodyChanged();
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
