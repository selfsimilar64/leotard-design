// Draws straps (garment/straps.js grids) on the current body: a ribbon with rolled edges and
// topstitching, in the strap's fabric with cloth-space UVs along the strap, plus a soft contact
// shadow on whatever it lies on (fabric or skin). Straps stack by their layer number where they cross.
import * as THREE from 'three';
import { createFabricMaterial, applyFabric, applyTexture } from '../materials/fabric.js';
import { strapGrid, markGrid, ACROSS, STRAP_PROFILE } from '../garment/straps.js';

const FABRIC = 0.0012, ABOVE = 0.0009, STACK = 0.0013;

export class StrapView {
	constructor(scene, man, textures) {
		this.man = man; this.textures = textures;
		this.group = new THREE.Group();
		scene.add(this.group);
		this.grids = new Map();     // key -> { sig, grid }
		this.meshes = [];
		this.materials = new Map(); // strap id -> material
		this.shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, vertexColors: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
	}

	// Grids for every strap path (and its mirror image), recomputed only when a path or width changes.
	prepare(doc, evaluated, surf) {
		const live = new Set();
		for (const s of doc.straps) for (const key of [s.path, s.path + '~m']) {
			const e = evaluated?.get(key);
			if (!e) continue;
			const k = s.id + '|' + key, sig = e.sig + '|' + s.width;
			live.add(k);
			const hit = this.grids.get(k);
			if (!hit || hit.sig !== sig) this.grids.set(k, { sig, grid: strapGrid(e, surf, s.width), strap: s.id });
			else hit.strap = s.id;
		}
		for (const k of [...this.grids.keys()]) if (!live.has(k)) this.grids.delete(k);
	}

	markCover(cover) { for (const { grid } of this.grids.values()) if (grid) markGrid(grid, this.man.idx, cover); }

	dispose() { for (const m of this.meshes) { this.group.remove(m); m.geometry.dispose(); } this.meshes = []; }

	// fabricCover: per canonical vertex, > 0 where a garment layer has fabric (the strap lies on it)
	build(doc, fabricCover) {
		this.dispose();
		const man = this.man;
		if (!man.garmentPos) return;
		const P = man.aPos.array, N = man.aGNormal.array, L = man.aLift.array, idx = man.idx;
		const at = (sp, A, k = 3, out = []) => { for (let c = 0; c < k; c++) { let v = 0; for (let j = 0; j < 3; j++) v += [sp.b0, sp.b1, sp.b2][j] * A[idx[sp.f * 3 + j] * k + c]; out[c] = v; } return out; };
		const order = new Map(doc.straps.map((s, i) => [s.id, s.layer ?? i]));
		for (const [, { grid, strap: sid }] of this.grids) {
			const s = doc.straps.find((x) => x.id === sid);
			if (!grid || !s) continue;
			const rows = grid.rows, nr = rows.length, nc = ACROSS.length, w = grid.width;
			const pos = new Float32Array(nr * nc * 3), uv = new Float32Array(nr * nc * 2), rim = new Float32Array(nr * nc * 2), ao = new Float32Array(nr * nc), ref = new Float32Array(nr * nc * 3);
			const spos = new Float32Array(nr * nc * 3), scol = new Float32Array(nr * nc * 4);
			const base = FABRIC + ABOVE + STACK * (order.get(sid) ?? 0);
			for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) {
				const sp = rows[r][c], o = r * nc + c;
				const p = at(sp, P), n = at(sp, N), lift = at(sp, L, 1)[0], nl = Math.hypot(n[0], n[1], n[2]) || 1;
				const h = lift + base + STRAP_PROFILE[c] * Math.min(w / 0.01, 1.4);
				for (let k = 0; k < 3; k++) pos[o * 3 + k] = p[k] + (n[k] / nl) * h;
				uv[o * 2] = ACROSS[c] * w; uv[o * 2 + 1] = grid.along[r];
				rim[o * 2] = (0.5 - Math.abs(ACROSS[c])) * w; rim[o * 2 + 1] = grid.along[r];
				ao[o] = c === 0 || c === nc - 1 ? 0.75 : 1;
				const rp = at(sp, man.ref); ref.set(rp, o * 3);
				// contact shadow on the fabric or skin beneath, spread a little wider than the strap
				const onFabric = fabricCover ? at(sp, fabricCover, 1)[0] > 0 : true;
				const sh = onFabric ? lift + FABRIC + 0.0003 : 0.0003;
				for (let k = 0; k < 3; k++) spos[o * 3 + k] = p[k] + (n[k] / nl) * sh;
				scol[o * 4 + 3] = c === 0 || c === nc - 1 ? 0 : 0.32;
			}
			// spread the shadow's outer samples outwards in the tangent plane
			for (let r = 0; r < nr; r++) for (const c of [0, nc - 1]) {
				const o = r * nc + c, m = r * nc + ((nc - 1) >> 1);
				for (let k = 0; k < 3; k++) spos[o * 3 + k] = spos[m * 3 + k] + (spos[o * 3 + k] - spos[m * 3 + k]) * 1.6;
			}
			const index = [];
			for (let r = 0; r + 1 < nr; r++) for (let c = 0; c + 1 < nc; c++) {
				const a = r * nc + c, b = a + 1, d = a + nc, e = d + 1;
				index.push(a, d, b, b, d, e);
			}
			const g = new THREE.BufferGeometry();
			g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
			g.setAttribute('aUV', new THREE.BufferAttribute(uv, 2));
			g.setAttribute('aRim', new THREE.BufferAttribute(rim, 2));
			g.setAttribute('aAO', new THREE.BufferAttribute(ao, 1));
			g.setAttribute('aRef', new THREE.BufferAttribute(ref, 3));
			g.setAttribute('aCover', new THREE.BufferAttribute(new Float32Array(nr * nc).fill(1), 1));
			g.setIndex(index);
			g.computeVertexNormals();
			// orient: the ribbon's normals must face away from the body
			const nn = g.attributes.normal.array, mid = ((nr >> 1) * nc + (nc >> 1));
			const bodyN = at(rows[nr >> 1][(nc - 1) >> 1], N);
			if (nn[mid * 3] * bodyN[0] + nn[mid * 3 + 1] * bodyN[1] + nn[mid * 3 + 2] * bodyN[2] < 0) {
				for (let i = 0; i < index.length; i += 3) [index[i + 1], index[i + 2]] = [index[i + 2], index[i + 1]];
				g.setIndex(index); g.computeVertexNormals();
			}
			g.setAttribute('aGNormal', g.attributes.normal);
			const tan = new Float32Array(nr * nc * 4);
			for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) {
				const o = r * nc + c, o2 = Math.min(r + 1, nr - 1) * nc + c, o1 = Math.max(r - 1, 0) * nc + c;
				const tx = pos[o2 * 3] - pos[o1 * 3], ty = pos[o2 * 3 + 1] - pos[o1 * 3 + 1], tz = pos[o2 * 3 + 2] - pos[o1 * 3 + 2], l = Math.hypot(tx, ty, tz) || 1;
				tan[o * 4] = tx / l; tan[o * 4 + 1] = ty / l; tan[o * 4 + 2] = tz / l; tan[o * 4 + 3] = 1;
			}
			g.setAttribute('tangent', new THREE.BufferAttribute(tan, 4));
			const mesh = new THREE.Mesh(g, this.material(s));
			mesh.renderOrder = -6; mesh.frustumCulled = false;
			mesh.userData = { strap: sid };
			this.group.add(mesh); this.meshes.push(mesh);

			const sg = new THREE.BufferGeometry();
			sg.setAttribute('position', new THREE.BufferAttribute(spos, 3));
			sg.setAttribute('color', new THREE.BufferAttribute(scol, 4));
			sg.setIndex(index);
			const shadow = new THREE.Mesh(sg, this.shadowMat);
			shadow.renderOrder = 5; shadow.frustumCulled = false;
			this.group.add(shadow); this.meshes.push(shadow);
		}
	}

	material(s) {
		let m = this.materials.get(s.id);
		if (!m) {
			m = createFabricMaterial(4);
			m.userData.u.uOffset.value = 0; m.userData.u.uGarment.value = 0; m.userData.u.uUV.value = 1;
			this.materials.set(s.id, m);
		}
		const f = s.fabric ?? {};
		applyFabric(m, f.fabric ?? 'matte', f.colour ?? '#222222', f.second ?? 'Tone-on-tone');
		m.userData.u.uUV.value = 1;
		m.userData.u.uRows.value.set(s.edge === 'none' ? 0 : 0.0016, 0);
		m.userData.u.uThread.value.set(f.colour ?? '#222222').multiplyScalar(0.8);
		if (f.texture && this.textures) this.textures.get(f.texture).then((set) => applyTexture(m, set, { recolour: f.texMode === 'recolour', colour: f.colour }));
		else applyTexture(m, null);
		return m;
	}

	setVisible(v) { this.group.visible = v; }
	frame(keyDir) { for (const m of this.materials.values()) m.userData.u.uHoloDirW.value.copy(keyDir); }
}
