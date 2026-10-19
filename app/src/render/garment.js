// Draws a cut garment (garment/build.js): one mesh per panel cell, built from the arrangement's
// triangles. Every panel vertex is a surface point on the canonical mesh, so its attributes are
// interpolated from the mannequin's per-vertex arrays (skin position and normal, fabric lift,
// garment normal, AO, reference position) and the same fabric shader as the POC draws it
// (zone 5: no region discards, cloth-space UVs). Changing body only re-interpolates.
import * as THREE from 'three';
import { createFabricMaterial, applyFabric } from '../materials/fabric.js';

export class GarmentView {
	constructor(scene, man) {
		this.scene = scene; this.man = man;
		this.group = new THREE.Group();
		scene.add(this.group);
		this.cells = [];          // { cell, panelId, mesh, hosts: { i: Uint32Array(n*3), w: Float32Array(n*3) } }
		this.materials = new Map(); // panel id -> material
		this.g = null;
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

	setGarment(g, doc, uvs = null) {
		this.dispose();
		this.g = g;
		const man = this.man, arr = g.arr, V = man.vertices, idx = man.idx;
		const { cover, garment } = this.coverFor(g, doc);
		man.setCover(cover);
		const map = new Int32Array(arr.nV).fill(-1);
		for (let c = 0; c < arr.cells.length; c++) {
			if (!garment[c]) continue;
			const panel = doc.panels[g.cellPanel[c]];
			const tris = arr.cells[c].tris, index = new Uint32Array(tris.length * 3), verts = [];
			for (let q = 0; q < tris.length; q++) for (let k = 0; k < 3; k++) {
				const v = arr.tris[tris[q] * 3 + k];
				let l = map[v];
				if (l < 0) { l = map[v] = verts.length; verts.push(v); }
				index[q * 3 + k] = l;
			}
			for (const v of verts) map[v] = -1;
			const n = verts.length, hi = new Uint32Array(n * 3), hw = new Float32Array(n * 3);
			for (let l = 0; l < n; l++) {
				const v = verts[l];
				if (v < V) { hi[l * 3] = hi[l * 3 + 1] = hi[l * 3 + 2] = v; hw[l * 3] = 1; continue; }
				const k = v - V, f = arr.hostF[k];
				for (let j = 0; j < 3; j++) { hi[l * 3 + j] = idx[f * 3 + j]; hw[l * 3 + j] = arr.hostB[k * 3 + j]; }
			}
			const local = verts;
			const geo = new THREE.BufferGeometry();
			const A = (name, size) => geo.setAttribute(name, new THREE.BufferAttribute(new Float32Array(n * size), size));
			A('position', 3); A('normal', 3); A('aLift', 1); A('aGNormal', 3); A('aAO', 1); A('aRef', 3); A('aKeep', 1); A('aForm', 2); A('aZone', 2); A('aUV', 2);
			geo.setAttribute('aCover', new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
			geo.setIndex(new THREE.BufferAttribute(index, 1));
			const uv = uvs?.get(c);
			if (uv) geo.attributes.aUV.array.set(uv.uv.length === n * 2 ? uv.uv : uv.uv.subarray(0, n * 2));
			const mesh = new THREE.Mesh(geo, this.material(panel.id));
			mesh.renderOrder = -1;
			mesh.frustumCulled = false;
			mesh.userData = { cell: c, panel: panel.id };
			this.group.add(mesh);
			const rec = { cell: c, panelId: panel.id, mesh, hosts: { i: hi, w: hw }, local };
			this.cells.push(rec);
			this.interpolate(rec);
		}
		this.applyMaterials(doc);
	}

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
			const hasUV = this.cells.some((c) => c.panelId === p.id && c.hasUV);
			m.userData.u.uUV.value = hasUV ? 1 : 0;
		}
	}

	// Re-interpolate every attribute from the mannequin's current arrays (after a body change).
	refresh() { for (const c of this.cells) this.interpolate(c); }

	interpolate(rec) {
		const man = this.man, geo = rec.mesh.geometry, { i: hi, w: hw } = rec.hosts, n = hw.length / 3;
		const src = [
			[man.aPos.array, geo.attributes.position, 3], [man.aNrm.array, geo.attributes.normal, 3], [man.aLift.array, geo.attributes.aLift, 1],
			[man.aGNormal.array, geo.attributes.aGNormal, 3], [man.aAO.array, geo.attributes.aAO, 1], [man.ref, geo.attributes.aRef, 3],
			[man.keep, geo.attributes.aKeep, 1], [man.form, geo.attributes.aForm, 2],
		];
		for (const [S, attr, k] of src) {
			const D = attr.array;
			for (let l = 0; l < n; l++) for (let c = 0; c < k; c++) {
				D[l * k + c] = hw[l * 3] * S[hi[l * 3] * k + c] + hw[l * 3 + 1] * S[hi[l * 3 + 1] * k + c] + hw[l * 3 + 2] * S[hi[l * 3 + 2] * k + c];
			}
			attr.needsUpdate = true;
		}
		// interpolated normals are shorter than 1 inside a triangle
		for (const attr of [geo.attributes.normal, geo.attributes.aGNormal]) {
			const D = attr.array;
			for (let l = 0; l < n; l++) { const x = D[l * 3], y = D[l * 3 + 1], z = D[l * 3 + 2], L = Math.hypot(x, y, z) || 1; D[l * 3] = x / L; D[l * 3 + 1] = y / L; D[l * 3 + 2] = z / L; }
		}
		geo.computeBoundingSphere();
	}

	setVisible(v) { this.group.visible = v; }
	frame(keyDir) { for (const m of this.materials.values()) m.userData.u.uHoloDirW.value.copy(keyDir); }
}
