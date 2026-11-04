// A fitted garment on the body (garment/fitted.js): the fit solver's pieces drawn in place of the app's own.
// Each point of a fitted piece is a host triangle and weights on the body's surface, the same coordinates the app's
// own pieces use, so it is placed by GarmentView.interpolate and follows every body and pose as they do. The design's
// panels lend their materials by name; the app's own pieces and edge finishes stay in the document, hidden.
// Grew out of the dev viewer, dev/wrap-eval.js (show, cover, finish): change one, look at the other.
import * as THREE from 'three';
import { TRIMS, resample, smoothLoop, buildGeometry } from '../garment/trim.js';
import { fittedOf } from '../garment/fitted.js';

const HIDDEN = new THREE.MeshBasicMaterial({ visible: false });

export class FittedView {
	constructor(engine) {
		this.engine = engine;
		this.key = null;        // the fitted garment asked for
		this.data = null;       // its loaded file
		this.meshes = [];       // one per piece half
		this.edges = null;      // the finished openings
		this.on = null;         // body vertices under its fabric (the cover hook)
		engine.coverHooks.push((C) => { if (this.on) for (const v of this.on) C[v] = 1; });
		engine.body.onGarment.push(() => this.place());
	}

	get active() { return !!this.data; }
	get view() { return this.engine.layers.get('L0')?.view ?? null; }

	// After every document change the engine has applied.
	sync(doc) {
		const f = fittedOf(doc), key = f?.key ?? null;
		if (key !== this.key) {
			this.key = key;
			this.clear(doc);
			if (f) this.load(f, doc);
			return;
		}
		if (this.active) this.dress(doc);
	}

	async load(f, doc) {
		const want = this.key, url = import.meta.env.BASE_URL + 'fitted/' + f.file + '.json';
		let data;
		try { data = await (await fetch(url)).json(); } catch (e) { console.error('fitted garment', url, e); return; }
		if (this.key !== want) return; // asked for another meanwhile
		this.data = data;
		this.on = new Set(data.cells.flatMap((c) => c.hostI));
		this.build();
		this.engine.updateCover(doc); // the body lifts and slides where this fabric is; place() follows from onGarment
		this.place();
		this.dress(doc);
	}

	build() {
		const view = this.view;
		for (const c of this.data.cells) {
			const n = c.hostW.length / 3, geo = new THREE.BufferGeometry();
			const A = (name, size) => geo.setAttribute(name, new THREE.BufferAttribute(new Float32Array(n * size), size));
			A('position', 3); A('normal', 3); A('tangent', 4); A('aLift', 3); A('aFold', 3); A('aGNormal', 3); A('aAO', 1); A('aRef', 3); A('aKeep', 1); A('aForm', 2); A('aZone', 2); A('aUV', 2); A('aGrad', 1);
			geo.setAttribute('aSeam', new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
			geo.setAttribute('aCover', new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
			geo.setIndex(new THREE.BufferAttribute(Uint32Array.from(c.I), 1));
			geo.attributes.aUV.array.set(c.uv); // flat metres: the cloth's weave and prints follow the pattern piece
			if (c.fold) geo.attributes.aFold.array.set(c.fold); // the fit's own folds (pipeline/wrap_block.py)
			const mesh = new THREE.Mesh(geo, HIDDEN); // dress() gives it its panel's material
			mesh.frustumCulled = false;
			mesh.userData = { fitted: c.name, piece: c.piece };
			mesh.hosts = { i: Uint32Array.from(c.hostI), w: Float32Array.from(c.hostW) };
			view.group.add(mesh);
			this.meshes.push(mesh);
		}
	}

	// On the body as it now is: positions, normals, lift and the rest from the body's arrays, then the finished edges.
	place() {
		if (!this.active) return;
		const view = this.view;
		if (!view) return;
		for (const mesh of this.meshes) {
			if (mesh.parent !== view.group) view.group.add(mesh); // the layer's view was rebuilt
			view.interpolate({ mesh, hosts: mesh.hosts });
		}
		this.finish();
		this.quiet();
	}

	// The design's materials on the fitted pieces, and the app's own pieces and edges out of sight.
	dress(doc) {
		const view = this.view;
		if (!view) return;
		const L0 = doc.panels.filter((p) => (p.layer ?? 'L0') === 'L0' && !p.removed);
		const byName = new Map(L0.map((p) => [p.name, p]));
		const front = byName.get('Front') ?? L0[0];
		for (const mesh of this.meshes) {
			const p = byName.get(mesh.userData.fitted) ?? front;
			if (p) mesh.material = view.material(p.id);
			if (mesh.parent !== view.group) view.group.add(mesh);
		}
		this.finish();
		this.quiet();
	}

	// What the fitted garment replaces: the app's own pieces and their edge finishes, and the app's fixed wrinkle zones
	// (its folds come from the fit). Kept up after every rebuild, body change and pose.
	quiet() {
		const e = this.engine;
		for (const L of e.layers.values()) {
			if (L.layer.id === 'L0') for (const c of L.view.cells) c.mesh.visible = false;
			L.rims.group.visible = false;
		}
		for (const n of e.wrinkleZones().N) n.w = 0;
	}

	clear(doc) {
		const view = this.view, e = this.engine;
		for (const m of this.meshes) { m.parent?.remove(m); m.geometry.dispose(); }
		this.meshes = [];
		if (this.edges) { this.edges.parent?.remove(this.edges); this.edges.geometry.dispose(); this.edges = null; }
		this.data = null;
		const covered = !!this.on;
		this.on = null;
		if (view) for (const c of view.cells) c.mesh.visible = true;
		for (const L of e.layers.values()) L.rims.group.visible = true;
		e.wrinkleZones().N[0].w = 1; // the crotch zone (setWrinklePose sets only the armpits)
		e.setWrinklePose(doc.body.pose);
		if (covered) e.updateCover(doc);
	}

	// The openings finished as the app finishes its own (render/rims.js): turned elastic in the front panel's look, along
	// the loops the fit exported, on the body's current garment surface.
	finish() {
		const e = this.engine, view = this.view, doc = e.app?.doc;
		if (this.edges) { this.edges.parent?.remove(this.edges); this.edges.geometry.dispose(); this.edges = null; }
		if (!doc || !view || !this.data?.openings?.length) return;
		const L = e.layers.get('L0'), man = e.body, G = man.garmentPos, GN = man.aGNormal.array;
		const at = (I, W, i, out) => { out.set(0, 0, 0); for (let j = 0; j < 3; j++) { const v = I[i * 3 + j] * 3, w = W[i * 3 + j]; out.x += w * G[v]; out.y += w * G[v + 1]; out.z += w * G[v + 2]; } return out; };
		const nrm = (I, W, i) => { const o = new THREE.Vector3(); for (let j = 0; j < 3; j++) { const v = I[i * 3 + j] * 3, w = W[i * 3 + j]; o.x += w * GN[v]; o.y += w * GN[v + 1]; o.z += w * GN[v + 2]; } return o.normalize(); };
		const built = [];
		for (const o of this.data.openings) {
			const n = o.hostW.length / 3, recs = [];
			for (let i = 0; i < n; i++) {
				const p = at(o.hostI, o.hostW, i, new THREE.Vector3()), q = at(o.inI, o.inW, i, new THREE.Vector3()), nn = nrm(o.hostI, o.hostW, i);
				const inside = q.sub(p); inside.addScaledVector(nn, -inside.dot(nn)).normalize();
				recs.push({ p, n: nn, inside, kappa: 0, ref: p.clone(), keep: 1, sleeve: 0 });
			}
			const { pts, length } = resample(recs), m = pts.length, P = pts.map((a) => a.p), Nn = pts.map((a) => a.n), In = pts.map((a) => a.inside);
			smoothLoop(P, 3, 2, true); smoothLoop(Nn, 4, 2, true); smoothLoop(In, 4, 1, true);
			const frames = [], scale = [];
			for (let i = 0; i < m; i++) {
				const nn = Nn[i].normalize(), t = P[(i + 1) % m].clone().sub(P[(i - 1 + m) % m]).normalize(), d = new THREE.Vector3().crossVectors(nn, t).normalize();
				if (d.dot(In[i]) < 0) d.negate();
				frames.push({ p: P[i].addScaledVector(nn, 0.0012), n: nn, d, kap: 0 });
				scale.push(1);
			}
			built.push({ frames, scale, pts, length });
		}
		const L0 = doc.panels.filter((p) => (p.layer ?? 'L0') === 'L0' && !p.removed);
		const s = (L0.find((p) => p.name === 'Front') ?? L0[0])?.stack?.[0];
		if (!s) return;
		this.edges = new THREE.Mesh(buildGeometry(built, TRIMS.elastic.profile), L.rims.material({ kind: 'elastic', fabric: s.fabric, colour: s.colour, second: s.second ?? 'Tone-on-tone' }));
		this.edges.renderOrder = -4;
		this.edges.frustumCulled = false;
		view.group.add(this.edges);
	}
}
