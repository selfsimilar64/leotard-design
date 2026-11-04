// A fitted garment on the body (garment/fitted.js): the fit solver's pieces drawn in place of the app's own.
// Each point of a fitted piece is a host triangle and weights on the body's surface, the same coordinates the app's
// own pieces use, so it follows every body and pose as they do: carried. Where WebGPU is available it is then re-fitted on the
// body as it now is (fit/refit.js on a case built live by fit/fitted-case.js), and drawn where the re-fit settled it. The design's
// panels lend their materials by name; the app's own pieces and edge finishes stay in the document, hidden.
// Grew out of the dev viewer, dev/wrap-eval.js (show, cover, finish): change one, look at the other.
import * as THREE from 'three';
import { TRIMS, resample, smoothLoop, buildGeometry } from '../garment/trim.js';
import { fittedOf } from '../garment/fitted.js';
import { Refit, DEFAULTS } from '../fit/refit.js';
import { buildCase, garmentArrays } from '../fit/fitted-case.js';

const HIDDEN = new THREE.MeshBasicMaterial({ visible: false });

// The designer's settings (ui/Shell.jsx Fabric fit, kept with the display settings).
export const FIT_DEFAULTS = {
	refit: true,              // re-fit on the GPU after every body or pose change (off: the carried fit only)
	steps: DEFAULTS.maxSteps, // the re-fit's length: speed against accuracy (about 2 ms a step on the GTX 1650)
	mu: DEFAULTS.mu,          // friction against the skin
	lift: 0.0012,             // m the fabric is drawn off the surface it was fitted to (the dev viewer's 1.2 mm), on top of the
	// fabric material's own 1.2 mm: a fitted mesh's flat 7 mm triangles dip under a curved body between their points
	// (knowledge/engineering/app/refit-in-the-app.md, owner's first look)
};

export class FittedView {
	constructor(engine) {
		this.engine = engine;
		this.key = null;        // the fitted garment asked for
		this.data = null;       // its loaded file
		this.garment = null;    // its part of a re-fit case (fitted-case.js garmentArrays)
		this.near = null;       // per whole-garment point, its neighbours (an opening's inward direction)
		this.meshes = [];       // one per piece half
		this.edges = null;      // the finished openings
		this.on = null;         // body vertices under its fabric (the cover hook)
		this.solved = null;     // the last re-fit's points, on the body as it was when it ran
		this.options = { ...FIT_DEFAULTS };
		this.status = { state: 'off' }; // for the settings panel: off | carried | fitting | fitted | error
		this.onStatus = null;
		this.device = null;
		this.running = false; this.again = false; this.gen = 0;
		engine.coverHooks.push((C) => { if (this.on) for (const v of this.on) C[v] = 1; });
		engine.body.onGarment.push(() => this.place());
	}

	get active() { return !!this.data; }
	get view() { return this.engine.layers.get('L0')?.view ?? null; }

	setStatus(s) { this.status = s; this.onStatus?.(s); }

	// The designer's fit settings: a change to the re-fit runs it again; the lift only redraws.
	setOptions(o) {
		const before = this.options;
		this.options = { ...before, ...o };
		if (!this.active) return;
		if (o.refit !== undefined && o.refit !== before.refit || o.steps !== undefined && o.steps !== before.steps || o.mu !== undefined && o.mu !== before.mu) this.place();
		else this.show();
	}

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
		if (data.case) {
			this.garment = garmentArrays(data);
			const n = data.case.n, T = data.case.tris, near = Array.from({ length: n }, () => new Set());
			for (let t = 0; t < T.length; t += 3) for (let k = 0; k < 3; k++) { near[T[t + k]].add(T[t + (k + 1) % 3]); near[T[t + k]].add(T[t + (k + 2) % 3]); }
			this.near = near.map((s) => [...s]);
		}
		this.build();
		this.engine.updateCover(doc); // the body lifts and slides where this fabric is
		this.place();
		this.dress(doc);
		this.engine.drawOverlay(doc); // the drawn lines go with the drawn pieces
		this.onLoaded?.(); // the flat view lays out its pieces
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
			mesh.cid = c.cid ? Int32Array.from(c.cid) : null;
			view.group.add(mesh);
			this.meshes.push(mesh);
		}
	}

	// The body changed (a new body, pose or cover): draw the fit carried onto it at once, then re-fit it there.
	place() {
		if (!this.active) return;
		this.solved = null;
		this.show();
		if (this.options.refit && this.data.case) this.refit();
		else this.setStatus({ state: 'carried', note: this.data.case ? null : 'This garment file has no re-fit data' });
	}

	// Every attribute from the body's arrays; positions where the re-fit settled each point, or carried by surface coordinates, then
	// lifted off the garment surface by options.lift (the garment surface already holds the body's own lift: aLift is zeroed).
	show() {
		const view = this.view;
		if (!view) return;
		const man = this.engine.body, G = man.garmentPos, X = this.solved, lift = this.options.lift;
		for (const mesh of this.meshes) {
			if (mesh.parent !== view.group) view.group.add(mesh); // the layer's view was rebuilt
			view.interpolate({ mesh, hosts: mesh.hosts });
			const geo = mesh.geometry, P = geo.attributes.position.array, N = geo.attributes.normal.array, hi = mesh.hosts.i, hw = mesh.hosts.w, n = hw.length / 3;
			for (let l = 0; l < n; l++) for (let k = 0; k < 3; k++) {
				let v;
				if (X && mesh.cid) v = X[3 * mesh.cid[l] + k];
				else { v = 0; for (let j = 0; j < 3; j++) v += hw[l * 3 + j] * G[hi[l * 3 + j] * 3 + k]; }
				P[l * 3 + k] = v + N[l * 3 + k] * lift;
			}
			geo.attributes.aLift.array.fill(0);
			geo.attributes.aLift.needsUpdate = geo.attributes.position.needsUpdate = true;
			geo.computeBoundingSphere();
		}
		this.finish();
		this.quiet();
	}

	async refit() {
		if (this.running) { this.again = true; return; }
		this.running = true;
		try {
			do {
				this.again = false;
				const gen = this.gen; // clear() moves it on: a garment taken away meanwhile is not drawn
				this.setStatus({ state: 'fitting' });
				this.device ||= await Refit.device();
				const man = this.engine.body, t0 = performance.now();
				const data = buildCase(this.data, this.garment, man.garmentPos, man.idx, man.wArm, this.cache ??= {});
				const r = new Refit(this.device, data, { maxSteps: this.options.steps, mu: this.options.mu, tol: 0 });
				const built = performance.now() - t0;
				// no early stop (the step count is the lever), so no reading back every window: all but the last window in one run,
				// then the last window, whose average is what is drawn (the shoulder's chatter hidden), as the tuning page shows it
				const steps = this.options.steps, W = r.settings.window, tRun = performance.now();
				if (steps > W) { r.settings.window = steps - W; await r.run({ steps: steps - W }); r.settings.window = W; }
				const res = await r.run({ steps });
				const X = await r.positions(steps > W);
				r.destroy();
				if (this.again || gen !== this.gen || !this.active) continue; // the body changed meanwhile: run again on the new one
				this.solved = X;
				this.show();
				this.setStatus({ state: 'fitted', steps: res.steps, seconds: (performance.now() - tRun) / 1000, setup: built / 1000 });
			} while (this.again && this.active);
		} catch (e) {
			console.error('re-fit', e);
			this.setStatus({ state: 'error', note: e.message });
		} finally {
			this.running = false;
		}
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
		this.gen++; // any re-fit under way is for the garment going
		for (const m of this.meshes) { m.parent?.remove(m); m.geometry.dispose(); }
		this.meshes = [];
		if (this.edges) { this.edges.parent?.remove(this.edges); this.edges.geometry.dispose(); this.edges = null; }
		this.data = null; this.garment = null; this.near = null; this.solved = null; this.cache = null;
		this.setStatus({ state: 'off' });
		const covered = !!this.on;
		this.on = null;
		if (view) for (const c of view.cells) c.mesh.visible = true;
		for (const L of e.layers.values()) L.rims.group.visible = true;
		e.wrinkleZones().N[0].w = 1; // the crotch zone (setWrinklePose sets only the armpits)
		e.setWrinklePose(doc.body.pose);
		if (covered) e.updateCover(doc);
		if (covered) e.drawOverlay(doc);
	}

	// The openings finished as the app finishes its own (render/rims.js): turned elastic in the front panel's look, along the
	// garment's own edge points (re-fitted, or carried by their hosts), with the body's normal there.
	finish() {
		const e = this.engine, view = this.view, doc = e.app?.doc;
		if (this.edges) { this.edges.parent?.remove(this.edges); this.edges.geometry.dispose(); this.edges = null; }
		if (!doc || !view || !this.data?.openings?.length) return;
		const L = e.layers.get('L0'), man = e.body, G = man.garmentPos, GN = man.aGNormal.array, X = this.solved;
		const at = (I, W, i, out) => { out.set(0, 0, 0); for (let j = 0; j < 3; j++) { const v = I[i * 3 + j] * 3, w = W[i * 3 + j]; out.x += w * G[v]; out.y += w * G[v + 1]; out.z += w * G[v + 2]; } return out; };
		const nrm = (I, W, i) => { const o = new THREE.Vector3(); for (let j = 0; j < 3; j++) { const v = I[i * 3 + j] * 3, w = W[i * 3 + j]; o.x += w * GN[v]; o.y += w * GN[v + 1]; o.z += w * GN[v + 2]; } return o.normalize(); };
		const pt = (i) => new THREE.Vector3(X[3 * i], X[3 * i + 1], X[3 * i + 2]);
		const built = [];
		for (const o of this.data.openings) {
			const n = o.hostW.length / 3, recs = [], solved = X && o.ids && this.near;
			for (let i = 0; i < n; i++) {
				const nn = nrm(o.hostI, o.hostW, i);
				let p, inside;
				if (solved) {
					p = pt(o.ids[i]);
					inside = new THREE.Vector3();
					for (const j of this.near[o.ids[i]]) inside.add(pt(j));
					inside.divideScalar(this.near[o.ids[i]].length).sub(p);
				} else {
					p = at(o.hostI, o.hostW, i, new THREE.Vector3());
					inside = at(o.inI, o.inW, i, new THREE.Vector3()).sub(p);
				}
				inside.addScaledVector(nn, -inside.dot(nn)).normalize();
				recs.push({ p, n: nn, inside, kappa: 0, ref: p.clone(), keep: 1, sleeve: 0 });
			}
			const { pts, length } = resample(recs), m = pts.length, P = pts.map((a) => a.p), Nn = pts.map((a) => a.n), In = pts.map((a) => a.inside);
			smoothLoop(P, 3, 2, true); smoothLoop(Nn, 4, 2, true); smoothLoop(In, 4, 1, true);
			const frames = [], scale = [];
			for (let i = 0; i < m; i++) {
				const nn = Nn[i].normalize(), t = P[(i + 1) % m].clone().sub(P[(i - 1 + m) % m]).normalize(), d = new THREE.Vector3().crossVectors(nn, t).normalize();
				if (d.dot(In[i]) < 0) d.negate();
				frames.push({ p: P[i].addScaledVector(nn, this.options.lift), n: nn, d, kap: 0 });
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
