// Draws a cut garment (garment/build.js): one mesh per panel cell, built from the arrangement's
// triangles. Every panel vertex is a surface point on the canonical mesh, so its attributes are
// interpolated from the mannequin's per-vertex arrays (skin position and normal, fabric lift,
// garment normal, AO, reference position) and the same fabric shader as the POC draws it
// (zone 5: no region discards, cloth-space UVs). Changing body only re-interpolates.
import * as THREE from 'three';
import { createFabricMaterial, applyFabric, applyTexture } from '../materials/fabric.js';
import { cellPiece, cellSignature } from '../garment/pieces.js';
import { Flattener } from '../garment/flattener.js';
import { seamKeys, seamDistance, gradientField } from '../garment/fields.js';

// Print images by source (moodboard/, designs/, references/ or any URL the dev bridge serves).
const prints = new Map();
function printTexture(src) {
	let t = prints.get(src);
	if (!t) {
		t = new THREE.TextureLoader().load(src);
		t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
		prints.set(src, t);
	}
	return t;
}

export function sameSign(a, b) { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if ((a[i] > 0) !== (b[i] > 0)) return false; return true; }

export class GarmentView {
	// layer: { id, kind, z } from the document (z orders layers: shell 0, overlays above, linings below)
	constructor(scene, man, layer = { id: 'L0', kind: 'shell', z: 0 }) {
		this.scene = scene; this.man = man; this.layer = layer;
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
		const roles = new Map(doc.curves.map((c) => [c.id, c.role]));
		const seams = seamKeys(arr, garment, (id) => roles.get(id.replace(/~m$/, '')));
		this.cover = cover; // the engine merges every layer's cover into the lift solve
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
			A('position', 3); A('normal', 3); A('tangent', 4); A('aLift', 1); A('aGNormal', 3); A('aAO', 1); A('aRef', 3); A('aKeep', 1); A('aForm', 2); A('aZone', 2); A('aUV', 2); A('aGrad', 1);
			geo.setAttribute('aSeam', new THREE.BufferAttribute(seamDistance(arr, man, c, verts, seams), 1));
			geo.setAttribute('aCover', new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
			geo.setIndex(new THREE.BufferAttribute(piece.I, 1));
			const mesh = new THREE.Mesh(geo, this.material(panel.id));
			mesh.renderOrder = -1 - Math.max(this.layer.z ?? 0, 0); // outer layers first: what they hide fails the depth test
			mesh.frustumCulled = false;
			mesh.userData = { cell: c, panel: panel.id };
			this.group.add(mesh);
			const sig = cellSignature(arr, c);
			const rec = { cell: c, panelId: panel.id, mesh, hosts: { i: hi, w: hw }, piece, sig, hasUV: false };
			this.cells.push(rec);
			this.interpolate(rec);
			if (this.clip) this.fillClip(rec);
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
		if (!m) {
			m = createFabricMaterial(5);
			// overlays sit 0.9 mm per step above the shell, linings 0.5 mm below it
			const z = this.layer.z ?? 0;
			m.userData.u.uOffset.value = z >= 0 ? 0.0012 + 0.0009 * z : 0.0007;
			m.userData.u.uSeam.value = 1; // panels carry aSeam
			m.userData.u.uClipShell.value = z < 0 ? 1 : 0; // linings: aCover is the shell's cover (setClip)
			this.materials.set(id, m);
		}
		return m;
	}

	applyMaterials(doc) {
		for (const p of doc.panels) {
			if (p.removed || !p.stack?.length) continue;
			const s = p.stack[0], m = this.material(p.id), u = m.userData.u;
			applyFabric(m, s.fabric, s.colour, s.second ?? 'Tone-on-tone', s.colour2 ?? null);
			// effect strength: how strongly a hologram, film or duochrome shows (1 = the fabric's own)
			if (s.effect !== undefined && s.effect !== 1) { const e = s.effect; u.uFilmTint.value *= e; u.uHolo.value = Math.min(u.uHolo.value * e, 1); u.uDuo.value *= e; m.iridescence = Math.min(m.iridescence * e, 1); }
			// sheerness of a mesh or lace net: the share of skin (or lining) seen through it, face on
			// (light crosses the net twice, so the open share is its square root; materials/fabric.js)
			if (s.sheer !== undefined && u.uMesh.value > 0.5) u.uHoleR.value = Math.sqrt(Math.sqrt(Math.min(Math.max(s.sheer, 0), 0.95)) / 3.6276);
			u.uGrain.value = s.grain ?? 0;
			// a gradient along a line or a direction: { colour, curve | axis, start, end } (metres)
			if (s.ombre) { u.uOmbre.value = 2; u.uOmbreColor.value.set(s.ombre.colour ?? '#000000'); }
			this.gradient(p.id, s.ombre);
			// a sublimation print tiled in pattern space: { src, size: [w, h] m, offset }
			if (s.print?.src) {
				u.uPrint.value = 1; u.tPrint.value = printTexture(s.print.src);
				u.uPrintSize.value.fromArray(s.print.size ?? [0.2, 0.2]); u.uPrintOffset.value.fromArray(s.print.offset ?? [0, 0]);
			} else u.uPrint.value = 0;
			this.applyDecals(m);
			if (this.wrinkles) { u.uWrinkle.value = this.wrinkles.Z; u.uWrinkleN.value = this.wrinkles.N; }
			if (s.texture && this.textures) {
				const opts = { scale: s.texScale ?? 1, recolour: s.texMode === 'recolour', colour: s.colour, masks: s.masks, normal: s.texNormal };
				this.textures.get(s.texture).then((set) => applyTexture(m, set, opts), (e) => console.warn('texture', s.texture, e.message));
			} else applyTexture(m, null);
			// opaque panels take shadows (and so cast them: variance shadow maps); sheer ones do
			// neither, so a lining under lace or mesh is not blacked out by it
			for (const c of this.cells) if (c.panelId === p.id) c.mesh.castShadow = c.mesh.receiveShadow = !m.transparent;
		}
		this.updateUVFlags();
	}

	// Fill aGrad on a panel's cells for its gradient (none: leave zeros). Cached per spec.
	gradient(id, spec) {
		const key = spec ? JSON.stringify([spec.curve, spec.axis, spec.start, spec.end]) : '';
		for (const c of this.cells) {
			if (c.panelId !== id || c.gradKey === key) continue;
			c.gradKey = key;
			const A = c.mesh.geometry.attributes.aGrad;
			if (!spec) { A.array.fill(0); A.needsUpdate = true; continue; }
			const ev = this.g?.evaluated, pts = spec.curve ? [...(ev?.get(spec.curve)?.pts ?? []), ...(ev?.get(spec.curve + '~m')?.pts ?? [])] : null;
			A.array.set(gradientField(c.mesh.geometry.attributes.aRef.array, { pts, axis: spec.axis ?? (spec.curve ? null : [0, -1, 0]), start: spec.start ?? 0, end: spec.end ?? 0.2 }));
			A.needsUpdate = true;
		}
	}

	// Logos and lettering (render/decals.js): every panel of the layer shows the layer's decals.
	setDecals(d) { this.decals = d; for (const m of this.materials.values()) this.applyDecals(m); }
	applyDecals(m) {
		const u = m.userData.u, d = this.decals;
		u.uDecals.value = d?.count ?? 0;
		if (!d?.count) return;
		u.tDecal.value = d.texture; u.uDecalM.value = d.M; u.uDecalRect.value = d.rect; u.uDecalLook.value = d.look; u.uDecalCol.value = d.colour;
	}

	// A lining is clipped to where the shell has fabric: the shell's per-vertex cover (+1 fabric,
	// -1 opening) interpolated into aCover; the shader discards below zero.
	setClip(cover) {
		this.clip = cover;
		for (const c of this.cells) this.fillClip(c);
	}
	fillClip(rec) {
		const A = rec.mesh.geometry.attributes.aCover, C = this.clip, { i: hi, w: hw } = rec.hosts, n = hw.length / 3;
		if (!C) { A.array.fill(1); A.needsUpdate = true; return; }
		for (let l = 0; l < n; l++) A.array[l] = hw[l * 3] * C[hi[l * 3]] + hw[l * 3 + 1] * C[hi[l * 3 + 1]] + hw[l * 3 + 2] * C[hi[l * 3 + 2]];
		A.needsUpdate = true;
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
		// tangent round the body (the stretch direction anisotropic shine follows), as the POC's
		lerp1(man.aTan.array, A.tangent, 4);
		const T = A.tangent.array;
		for (let l = 0; l < n; l++) { const x = T[l * 4], y = T[l * 4 + 1], z = T[l * 4 + 2], L = Math.hypot(x, y, z) || 1; T[l * 4] = x / L; T[l * 4 + 1] = y / L; T[l * 4 + 2] = z / L; T[l * 4 + 3] = 1; }
		geo.computeBoundingSphere();
	}

	setVisible(v) { this.group.visible = v; }
	frame(keyDir) { for (const m of this.materials.values()) m.userData.u.uHoloDirW.value.copy(keyDir); }
}
