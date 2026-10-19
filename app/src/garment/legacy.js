// POC-style garment: the three region-field zones (body, sleeves, accent) drawn on the shared
// body geometry, the POC's finished edges and stone patterns. Drives documents whose `legacy`
// section is set (the POC's six looks), so they render exactly as in poc-threejs/src/main.js.
import * as THREE from 'three';
import { createFabricMaterial, applyFabric } from '../materials/fabric.js';
import { Stones, PATTERNS } from '../stones/stones.js';
import { Trim } from './trim.js';
import { LOOKS } from '../render/presets.js';

export const ZONES = ['body', 'sleeve', 'accent'];

// A POC look as the document's legacy section.
export function legacyFromLook(name) {
	const l = LOOKS[name];
	if (!l) throw new Error(`No look "${name}". Looks: ${Object.keys(LOOKS).join(', ')}`);
	const zone = ([fabric, colour, second]) => ({ fabric, colour, second });
	return {
		look: name, sleeves: l.sleeves, back: l.back, pattern: l.pattern, finish: l.finish,
		zones: { body: zone(l.body), accent: zone(l.accent), sleeve: zone(l.sleeve) },
		trim: { finish: 'elastic', fabric: 'mystique', colour: '#c9ccd6', second: 'Silver' },
	};
}

export class LegacyGarment {
	constructor(scene, body) {
		this.scene = scene; this.body = body;
		this.layers = ZONES.map((_, i) => {
			const mesh = new THREE.Mesh(body.geometry, createFabricMaterial(i));
			mesh.renderOrder = [-1, -2, -3][i]; // front-most layer first: accent, sleeves, body, then skin (0)
			mesh.frustumCulled = false;
			scene.add(mesh);
			return mesh;
		});
		this.stones = new Stones(scene);
		this.trim = new Trim(scene);
		this.timing = { trim: 0, stones: 0 };
		this.state = null;
	}

	get materials() { return [...this.layers.map((l) => l.material), ...this.trim.materials]; }

	setVisible(v) {
		for (const l of this.layers) l.visible = v && (l !== this.layers[1] || this.state?.sleeves === 'long');
		for (const m of this.trim.meshes) m.visible = v;
		if (this.stones.mesh) this.stones.mesh.visible = v;
		if (v) this.trim.meshes[1].visible = this.state?.sleeves === 'long';
		this.visible = v;
	}

	// Full update from the legacy section (cheap parts only re-run when their inputs change).
	apply(L) {
		const prev = this.state, s = this.state = structuredClone(L);
		const st = { sleeves: s.sleeves, back: s.back, trim: s.trim, body: s.zones.body, accent: s.zones.accent, sleeve: s.zones.sleeve };
		const styleChanged = !prev || prev.sleeves !== s.sleeves || prev.back !== s.back || prev.trim.finish !== s.trim.finish;
		ZONES.forEach((z, i) => applyFabric(this.layers[i].material, s.zones[z].fabric, s.zones[z].colour, s.zones[z].second));
		if (styleChanged) {
			this.body.setStyle(st);
			const long = s.sleeves === 'long';
			this.layers[1].visible = long;
			this.layers[0].material.userData.u.uSleeveSplit.value = long ? 1 : 0;
			this.rebuildTrim();
		}
		this.trim.applyFabrics(st);
		const stonesChanged = styleChanged || prev.pattern !== s.pattern || prev.finish !== s.finish || prev.zones.body.colour !== s.zones.body.colour;
		if (stonesChanged) this.rebuildStones();
	}

	// Finished edges follow the garment's openings, so they are rebuilt with the body or the style.
	rebuildTrim() {
		if (!this.state) return;
		const t = performance.now(), s = this.state;
		this.trim.build(this.body, { sleeves: s.sleeves, trim: s.trim }, this.layers);
		this.body.edgeKeepOut = this.trim.keepOut;
		this.trim.meshes[1].visible = s.sleeves === 'long';
		this.timing.trim = performance.now() - t;
	}
	rebuildStones() {
		if (!this.state) return;
		const t = performance.now(), s = this.state;
		this.stones.set(PATTERNS[s.pattern](this.body, { sleeves: s.sleeves }), s.finish, s.zones.body.colour);
		if (this.stones.mesh) this.stones.mesh.visible = this.visible !== false;
		this.timing.stones = performance.now() - t;
	}

	onBodyChanged() { this.rebuildTrim(); this.rebuildStones(); }

	frame(keyDir) { for (const l of this.layers) l.material.userData.u.uHoloDirW.value.copy(keyDir); }
}
