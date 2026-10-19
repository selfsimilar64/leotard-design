// Draws a cut garment (garment/build.js): one mesh per panel cell, built from the arrangement's
// triangles. Every panel vertex is a surface point on the canonical mesh, so its attributes are
// interpolated from the mannequin's per-vertex arrays (skin position and normal, fabric lift,
// garment normal, AO, reference position) and the same fabric shader as the POC draws it
// (zone 5: no region discards, cloth-space UVs). Changing body only re-interpolates.
import * as THREE from 'three';
import { createFabricMaterial, applyFabric, applyTexture } from '../materials/fabric.js';
import { cellPiece, cellSignature } from '../garment/pieces.js';
import { Flattener } from '../garment/flattener.js';

function sameSign(a, b) { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if ((a[i] > 0) !== (b[i] > 0)) return false; return true; }

export class GarmentView {
	constructor(scene, man) {
		this.scene = scene; this.man = man;
		this.group = new THREE.Group();
		scene.add(this.group);
		this.cells = [];          // { cell, panelId, mesh, hosts: { i: Uint32Array(n*3), w: Float32Array(n*3) } }
		this.materials = new Map(); // panel id -> material
		this.g = null;
		this.flattener = new Flattener();
	}

	dispose() {
		for (const c of this.cells) { this.group.remove(c.mesh); c.mesh.geometry.dispose(); }
		this.cells = [];
	}

	// Garment cells (cells that belong to a panel that is not removed) and the canonical cover field.
	coverFor(g, doc) {
		const man = this.man, arr = g.arr, V = man.vertices, cover = new Float32Array(V).fill(-1);
		const garment = new Uint8Array(arr.cells.length);
		for (let c = 0; c < arr.cells.length; c++) { const pi = g.cellPanel[c]; garment[c] = pi >= 0 && !doc.panels[pi].removed ? 1 : 0; }
		for (let t = 0; t < arr.tris.length / 3; t++) {
			if (!garment[arr.cellOf[t]]) continue;
			for (let k = 0; k < 3; k++) { const v = arr.tris[t * 3 + k]; if (v < V) cover[v] = 1; }
		}
		return { cover, garment };
	}

	setGarment(g, doc) {
		this.dispose();
		this.g = g;
		const man = this.man, arr = g.arr, V = man.vertices, idx = man.idx;
		const { cover, garment } = this.coverFor(g, doc);
		this.garmentCells = garment;
		// the lift only depends on where fabric is: moving a seam inside the garment keeps it
		if (!this.cover || !sameSign(this.cover, cover)) { man.setCover(cover); this.cover = cover; }
		const gen = this.gen = (this.gen ?? 0) + 1;
		for (let c = 0; c < arr.cells.length; c++) {
			if (!garment[c]) continue;
			const panel = doc.panels[g.cellPanel[c]];
			// the cell opened up into a pattern piece (vertices repeat along slits), so UVs can tear
			const piece = cellPiece(arr, c), verts = piece.verts, n = verts.length;
			const hi = new Uint32Array(n * 3), hw = new Float32Array(n * 3);
			for (let l = 0; l < n; l++) {
				const v = verts[l];
				if (v < V) { hi[l * 3] = hi[l * 3 + 1] = hi[l * 3 + 2] = v; hw[l * 3] = 1; continue; }
				const k = v - V, f = arr.hostF[k];
				for (let j = 0; j < 3; j++) { hi[l * 3 + j] = idx[f * 3 + j]; hw[l * 3 + j] = arr.hostB[k * 3 + j]; }
			}
			const geo = new THREE.BufferGeometry();
			const A = (name, size) => geo.setAttribute(name, new THREE.BufferAttribute(new Float32Array(n * size), size));
			A('position', 3); A('normal', 3); A('aLift', 1); A('aGNormal', 3); A('aAO', 1); A('aRef', 3); A('aKeep', 1); A('aForm', 2); A('aZone', 2); A('aUV', 2);
			geo.setAttribute('aCover', new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
			geo.setIndex(new THREE.BufferAttribute(piece.I, 1));
			const mesh = new THREE.Mesh(geo, this.material(panel.id));
			mesh.renderOrder = -1;
			mesh.frustumCulled = false;
			mesh.userData = { cell: c, panel: panel.id };
			this.group.add(mesh);
			const sig = cellSignature(arr, c);
			const rec = { cell: c, panelId: panel.id, mesh, hosts: { i: hi, w: hw }, piece, sig, hasUV: false };
			this.cells.push(rec);
			this.interpolate(rec);
			const done = (r) => {
				if (this.gen !== gen) return;
				geo.attributes.aUV.array.set(r.uv); geo.attributes.aUV.needsUpdate = true;
				rec.hasUV = true; rec.stretch = r.stretch;
				this.updateUVFlags();
			};
			const hit = this.flattener.get(sig);
			if (hit) done(hit); else this.flattener.request(sig, piece).then(done, (e) => console.warn('flatten failed', e));
		}
		this.applyMaterials(doc);
	}

	// A panel draws in cloth space once all its cells have UVs (tri-planar until then).
	updateUVFlags() {
		for (const [id, m] of this.materials) {
			const cs = this.cells.filter((c) => c.panelId === id);
			m.userData.u.uUV.value = cs.length && cs.every((c) => c.hasUV) ? 1 : 0;
		}
	}

	// Resolves when every current piece has its UVs (for captures and tests).
	whenFlat() { return Promise.all(this.cells.map((c) => this.flattener.request(c.sig, c.piece))); }

	material(id) {
		let m = this.materials.get(id);
		if (!m) { m = createFabricMaterial(5); this.materials.set(id, m); }
		return m;
	}

	applyMaterials(doc) {
		for (const p of doc.panels) {
			if (p.removed || !p.stack?.length) continue;
			const s = p.stack[0], m = this.material(p.id);
			applyFabric(m, s.fabric, s.colour, s.second ?? 'Tone-on-tone');
			m.userData.u.uGrain.value = s.grain ?? 0;
			if (s.texture && this.textures) {
				const opts = { scale: s.texScale ?? 1, recolour: s.texMode === 'recolour', colour: s.colour, masks: s.masks, normal: s.texNormal };
				this.textures.get(s.texture).then((set) => applyTexture(m, set, opts), (e) => console.warn('texture', s.texture, e.message));
			} else applyTexture(m, null);
		}
		this.updateUVFlags();
	}

	// Re-interpolate every attribute from the mannequin's current arrays (after a body change).
	refresh() { for (const c of this.cells) this.interpolate(c); }

	interpolate(rec) {
		const man = this.man, geo = rec.mesh.geometry, { i: hi, w: hw } = rec.hosts, n = hw.length / 3;
		const lerp3 = (S, attr, normalise) => {
			const D = attr.array;
			for (let l = 0; l < n; l++) {
				const a = hi[l * 3] * 3, b = hi[l * 3 + 1] * 3, c = hi[l * 3 + 2] * 3, wa = hw[l * 3], wb = hw[l * 3 + 1], wc = hw[l * 3 + 2];
				let x = wa * S[a] + wb * S[b] + wc * S[c], y = wa * S[a + 1] + wb * S[b + 1] + wc * S[c + 1], z = wa * S[a + 2] + wb * S[b + 2] + wc * S[c + 2];
				if (normalise) { const L = Math.hypot(x, y, z) || 1; x /= L; y /= L; z /= L; } // interpolated normals are short inside a triangle
				D[l * 3] = x; D[l * 3 + 1] = y; D[l * 3 + 2] = z;
			}
			attr.needsUpdate = true;
		};
		const lerp1 = (S, attr, k = 1) => {
			const D = attr.array;
			for (let l = 0; l < n; l++) {
				const a = hi[l * 3] * k, b = hi[l * 3 + 1] * k, c = hi[l * 3 + 2] * k, wa = hw[l * 3], wb = hw[l * 3 + 1], wc = hw[l * 3 + 2];
				for (let q = 0; q < k; q++) D[l * k + q] = wa * S[a + q] + wb * S[b + q] + wc * S[c + q];
			}
			attr.needsUpdate = true;
		};
		const A = geo.attributes;
		lerp3(man.aPos.array, A.position, false); lerp3(man.aNrm.array, A.normal, true); lerp3(man.aGNormal.array, A.aGNormal, true);
		lerp3(man.ref, A.aRef, false); lerp1(man.aLift.array, A.aLift); lerp1(man.aAO.array, A.aAO); lerp1(man.keep, A.aKeep); lerp1(man.form, A.aForm, 2);
		geo.computeBoundingSphere();
	}

	setVisible(v) { this.group.visible = v; }
	frame(keyDir) { for (const m of this.materials.values()) m.userData.u.uHoloDirW.value.copy(keyDir); }
}
