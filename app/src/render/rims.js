// Finished edges of the cut garment: the POC's swept rim profiles (garment/trim.js: TRIMS,
// resample, smoothLoop, buildGeometry) run along every opening loop of the arrangement
// (garment/edges.js). The finish of a loop comes from the document's trims (the trim naming one
// of the loop's curves), else turned self-fabric elastic. Rebuilt when the cut or the body changes.
import * as THREE from 'three';
import { createFabricMaterial, applyFabric } from '../materials/fabric.js';
import { TRIMS, resample, smoothLoop, buildGeometry } from '../garment/trim.js';
import { openingLoops } from '../garment/edges.js';

export class Rims {
	constructor(scene, man) {
		this.man = man;
		this.group = new THREE.Group();
		scene.add(this.group);
		this.meshes = [];
		this.materials = new Map(); // key -> material
		this.loops = [];
		this.keepOut = TRIMS.elastic.width + 0.0015;
	}

	dispose() { for (const m of this.meshes) { this.group.remove(m); m.geometry.dispose(); } this.meshes = []; }

	// Finish for a loop: the trim record naming the loop's main curve, else self elastic.
	finishOf(doc, loop, panel) {
		const counts = new Map();
		for (const c of loop.curves) if (c) { const id = c.replace(/~m$/, ''); counts.set(id, (counts.get(id) ?? 0) + 1); }
		const main = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
		const t = main && doc.trims.find((x) => x.on?.includes(main));
		const s = panel?.stack?.[0] ?? { fabric: 'matte', colour: '#888888', second: 'Tone-on-tone' };
		// overlay pieces (lace, appliqué) and linings are raw-edged unless a finish is set
		if (!t && this.kind && this.kind !== 'shell') return null;
		if (!t) return { kind: 'elastic', fabric: s.fabric, colour: s.colour, second: s.second ?? 'Tone-on-tone' };
		if (t.kind === 'none') return null;
		const f = t.kind === 'binding' && t.fabric ? t.fabric : s;
		return { kind: TRIMS[t.kind] ? t.kind : 'elastic', fabric: f.fabric ?? s.fabric, colour: f.colour ?? s.colour, second: f.second ?? 'Tone-on-tone' };
	}

	build(g, doc, garment, evaluated = null, lift = 0) {
		this.dispose();
		if (!g || !this.man.garmentPos) return; // the body is not set yet: applyBody rebuilds us
		this.lift = lift;
		const man = this.man, arr = g.arr, V = man.vertices, idx = man.idx;
		const G = man.garmentPos, GN = man.aGNormal.array, R = man.ref, K = man.keep;
		const at = (A, v, out) => {
			if (v < V) return out.set(A[v * 3], A[v * 3 + 1], A[v * 3 + 2]);
			const k = v - V, f = arr.hostF[k];
			out.set(0, 0, 0);
			for (let j = 0; j < 3; j++) { const i = idx[f * 3 + j], w = arr.hostB[k * 3 + j]; out.x += w * A[i * 3]; out.y += w * A[i * 3 + 1]; out.z += w * A[i * 3 + 2]; }
			return out;
		};
		const at1 = (A, v) => { if (v < V) return A[v]; const k = v - V, f = arr.hostF[k]; let s = 0; for (let j = 0; j < 3; j++) s += arr.hostB[k * 3 + j] * A[idx[f * 3 + j]]; return s; };
		this.loops = openingLoops(arr, garment).filter((l) => l.closed);
		const groups = new Map(); // finish key -> { finish, loops: [] }
		for (const loop of this.loops) {
			const panel = doc.panels[g.cellPanel[loop.cells[0]]];
			const fin = this.finishOf(doc, loop, panel);
			if (!fin) continue;
			// edge records as the POC's body.edgeLoops() gives them
			const n = loop.verts.length, recs = [];
			for (let i = 0; i < n; i++) {
				const v = loop.verts[i], p = at(G, v, new THREE.Vector3()), nn = at(GN, v, new THREE.Vector3()).normalize();
				const t = at(G, loop.verts[(i + 1) % n], new THREE.Vector3()).sub(at(G, loop.verts[(i - 1 + n) % n], new THREE.Vector3()));
				const inside = new THREE.Vector3().crossVectors(nn, t).normalize(); // fabric is on the loop's left
				const c = loop.thirds[i], pc = at(G, c, new THREE.Vector3()), nc = at(GN, c, new THREE.Vector3()).normalize();
				const d = pc.clone().sub(p).dot(inside);
				const kappa = d > 1e-4 ? nc.clone().sub(nn).dot(inside) / d : 0;
				recs.push({ p, n: nn, inside, kappa, ref: at(R, v, new THREE.Vector3()), keep: at1(K, v), sleeve: 0 });
			}
			const key = JSON.stringify(fin);
			let gr = groups.get(key);
			if (!gr) groups.set(key, gr = { fin, loops: [] });
			gr.loops.push(recs);
		}
		// piping (corded) or tape (flat) along a seam line, on this layer's seams
		if (evaluated) for (const t of doc.trims.filter((x) => x.kind === 'piping' || x.kind === 'tape')) {
			for (const id of t.on) {
				const c = doc.curves.find((x) => x.id === id);
				if (!c || (c.layer ?? 'L0') !== (this.layerId ?? 'L0')) continue;
				for (const key of [id, id + '~m']) {
					const e = evaluated.get(key);
					if (!e || e.sps.length < 3) continue;
					const recs = [], n = e.sps.length, V2 = new THREE.Vector3();
					const atSp = (A, sp, out) => { out.set(0, 0, 0); const b = [sp.b0, sp.b1, sp.b2]; for (let j = 0; j < 3; j++) { const i = idx[sp.f * 3 + j]; out.x += b[j] * A[i * 3]; out.y += b[j] * A[i * 3 + 1]; out.z += b[j] * A[i * 3 + 2]; } return out; };
					for (let i = 0; i < n; i++) {
						const sp = e.sps[i], p = atSp(G, sp, new THREE.Vector3()), nn = atSp(GN, sp, new THREE.Vector3()).normalize();
						const tt = atSp(G, e.sps[Math.min(i + 1, n - 1)], V2.clone()).sub(atSp(G, e.sps[Math.max(i - 1, 0)], new THREE.Vector3()));
						const inside = new THREE.Vector3().crossVectors(nn, tt).normalize();
						recs.push({ p, n: nn, inside, kappa: 0, ref: atSp(R, sp, new THREE.Vector3()), keep: 1, sleeve: 0 });
					}
					const fin = { kind: t.kind, fabric: t.fabric?.fabric ?? 'satin', colour: t.fabric?.colour ?? '#ffffff', second: t.fabric?.second ?? 'Tone-on-tone' };
					const key2 = JSON.stringify(fin);
					let gr = groups.get(key2);
					if (!gr) groups.set(key2, gr = { fin, loops: [] });
					recs.open = !e.closed;
					gr.loops.push(recs);
				}
			}
		}
		for (const { fin, loops } of groups.values()) {
			const T = TRIMS[fin.kind], prof = T.profile, built = [];
			for (const raw of loops) {
				if (raw.open) { built.push(openRun(raw)); continue; }
				const { pts, length } = resample(raw);
				const n = pts.length;
				const P = pts.map((p) => p.p), Nn = pts.map((p) => p.n), In = pts.map((p) => p.inside), Kp = pts.map((p) => p.kappa);
				smoothLoop(P, 3, 2, true); smoothLoop(Nn, 4, 2, true); smoothLoop(In, 4, 1, true); smoothLoop(Kp, 8, 2, false);
				const frames = [], scale = [];
				for (let i = 0; i < n; i++) {
					const nn = Nn[i].normalize(), t = P[(i + 1) % n].clone().sub(P[(i - 1 + n) % n]).normalize();
					const d = new THREE.Vector3().crossVectors(nn, t).normalize();
					if (d.dot(In[i]) < 0) d.negate();
					frames.push({ p: P[i], n: nn, d, kap: THREE.MathUtils.clamp(Kp[i], -30, 30) });
					scale.push(1);
				}
				built.push({ frames, scale, pts, length });
			}
			for (const b of built) if (this.lift) for (const f of b.frames) f.p.addScaledVector(f.n, this.lift);
			const mat = this.material(fin);
			// cut like the body (dress form, headless neck): the engine sets body.clip before rebuilding us
			mat.userData.u.uClip.value = this.man.clip ? 1 : 0;
			const mesh = new THREE.Mesh(buildGeometry(built, prof), mat);
			mesh.renderOrder = -4; // outermost layer: drawn first, so the fabric under it fails the depth test
			mesh.frustumCulled = false;
			this.group.add(mesh);
			this.meshes.push(mesh);
		}
	}

	material(fin) {
		const key = JSON.stringify(fin);
		let m = this.materials.get(key);
		if (!m) {
			m = createFabricMaterial(4);
			applyFabric(m, fin.fabric, fin.colour, fin.second);
			const T = TRIMS[fin.kind];
			m.userData.u.uRows.value.set(T.rows[0], T.rows[1]);
			m.userData.u.uThread.value.set(fin.colour).multiplyScalar(0.8); // thread matched to the fabric, a shade darker
			this.materials.set(key, m);
		}
		return m;
	}

	setVisible(v) { this.group.visible = v; }
	frame(keyDir) { for (const m of this.materials.values()) m.userData.u.uHoloDirW.value.copy(keyDir); }
}

// An open run (piping along a seam that ends on other lines): frames without wrapping round.
function openRun(recs) {
	const n = recs.length, frames = [], scale = [];
	let length = 0;
	for (let i = 0; i < n; i++) {
		const r = recs[i], t = recs[Math.min(i + 1, n - 1)].p.clone().sub(recs[Math.max(i - 1, 0)].p).normalize();
		const d = new THREE.Vector3().crossVectors(r.n, t).normalize();
		frames.push({ p: r.p.clone(), n: r.n, d, kap: 0 });
		scale.push(1);
		if (i) length += r.p.distanceTo(recs[i - 1].p);
	}
	return { frames, scale, pts: recs, length, open: true };
}
