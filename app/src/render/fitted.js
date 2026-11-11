// A fitted garment on the body (garment/fitted.js): the fit solver's pieces drawn in place of the app's own.
// Each point of a fitted piece is a host triangle and weights on the body's surface, the same coordinates the app's
// own pieces use, so it follows every body and pose as they do: carried. Where WebGPU is available it is then re-fitted on the
// body as it now is (fit/refit.js on a case built live by fit/fitted-case.js), and drawn where the re-fit settled it. The design's
// panels lend their materials by name; the app's own pieces and edge finishes stay in the document, hidden.
// Grew out of the dev viewer, dev/wrap-eval.js (show, cover, finish): change one, look at the other.
import * as THREE from 'three';
import { TRIMS, resample, smoothLoop, buildGeometry } from '../garment/trim.js';
import { fittedOf, fitSizeOf, fittedTrimOf } from '../garment/fitted.js';
import { addFabricAttributes, setFabricSlot } from '../materials/fabric-attributes.js';
import { applyFabric, bindScan, texScaleOf, fabricSide } from '../materials/fabric.js';
import { Refit, DEFAULTS } from '../fit/refit.js';
import { buildCase, garmentArrays, startOf } from '../fit/fitted-case.js';
import { foldsOf, foldPasses } from '../fit/folds.js';
import { LineSegments2 } from './lines.js'; // (WebGL or WebGPU lines)
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { ROLE_COLOURS } from './overlay.js';
import { FittedCloth } from '../stones/fitted-cloth.js';
import { TRIMS as EDGE_TRIMS } from '../garment/trim.js';

const LINE_LIFT = 0.0022; // m over where the fabric is fitted, on top of its lift: render/overlay.js LIFT (the fabric material adds 1.2 mm itself)

const HIDDEN = new THREE.MeshBasicMaterial({ visible: false });
const HOLD_MAX_MS = 8000; // the longest the view waits for a re-fit before drawing what it has
const SEAM_CAP = 0.012;   // m: as garment/fields.js seamDistance, the shader only cares within this of a seam

// Sewn edges of the whole garment: the two triangles beside the edge sit apart in the flat pattern (at the fold, where the halves join
// mirrored, they keep the same flat place: not a seam). Twin: export_app.seam_edges (pipeline/race). Keys a * n + b, a < b.
function seamKeys(c) {
	const n = c.n, T = c.tris, R = c.rest, where = new Map(), keys = new Set();
	for (let t = 0; t < T.length / 3; t++) for (let k = 0; k < 3; k++) {
		const a = T[3 * t + k], b = T[3 * t + (k + 1) % 3], key = a < b ? a * n + b : b * n + a;
		const ra = [R[6 * t + 2 * k], R[6 * t + 2 * k + 1]], rb = [R[6 * t + 2 * ((k + 1) % 3)], R[6 * t + 2 * ((k + 1) % 3) + 1]];
		const flat = a < b ? [ra, rb] : [rb, ra], seen = where.get(key);
		if (!seen) { where.set(key, flat); continue; }
		where.delete(key);
		if (Math.max(Math.abs(seen[0][0] - flat[0][0]), Math.abs(seen[0][1] - flat[0][1]), Math.abs(seen[1][0] - flat[1][0]), Math.abs(seen[1][1] - flat[1][1])) > 1e-6) keys.add(key);
	}
	return keys;
}

// Per point of a cell, metres (flat, on the pattern piece) to its nearest seam edge, capped: the shader's seam (aFold.w).
function cellSeams(c, keys, n) {
	const I = c.I, U = c.uv, cid = c.cid, m = U.length / 2, segs = [];
	for (let t = 0; t < I.length; t += 3) for (let k = 0; k < 3; k++) {
		const a = I[t + k], b = I[t + (k + 1) % 3], A = cid[a], B = cid[b];
		if (keys.has(A < B ? A * n + B : B * n + A)) segs.push(U[2 * a], U[2 * a + 1], U[2 * b], U[2 * b + 1]);
	}
	const out = new Float32Array(m).fill(SEAM_CAP);
	for (let l = 0; l < m; l++) {
		const px = U[2 * l], py = U[2 * l + 1];
		let best = SEAM_CAP * SEAM_CAP;
		for (let s = 0; s < segs.length; s += 4) {
			const ax = segs[s], ay = segs[s + 1], dx = segs[s + 2] - ax, dy = segs[s + 3] - ay, L = dx * dx + dy * dy;
			const u = L > 0 ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / L)) : 0, ex = ax + u * dx - px, ey = ay + u * dy - py;
			const d = ex * ex + ey * ey;
			if (d < best) best = d;
		}
		out[l] = Math.sqrt(best);
	}
	return out;
}

// The designer's settings (ui/Studio.jsx Fabric fit, kept with the display settings).
export const FIT_DEFAULTS = {
	refit: true,              // re-fit on the GPU after every body or pose change (off: the carried fit only)
	steps: DEFAULTS.maxSteps, // the re-fit's length: speed against accuracy (about 2 ms a step on the GTX 1650)
	mu: DEFAULTS.mu,          // friction against the skin
	lift: 0.0012,             // m the fabric is drawn off the surface it was fitted to (the dev viewer's 1.2 mm), on top of the
	// fabric material's own 1.2 mm: a fitted mesh's flat 7 mm triangles dip under a curved body between their points
	// (knowledge/engineering/app/refit-in-the-app.md, owner's first look)
	body: 'skin',             // what the re-fit stands on: 'skin', the bare skin, settled FREE_STEPS without friction before `steps`
	// with it (owner chose this look, 2026-11-10: knowledge/engineering/app/hollows-on-bare-skin-diagnosis.md); 'bridged', the older
	// fit, on the drawn garment's surface (the skin plus the membrane's lift and the seat sheet), kept to go back to. No control
	// offers it (Settings' Fabric fit face has no room: owner, 2026-11-10, "at least in the backend"): the display setting fitBody
	// (render/display.js, dev only) or app.engine.fitted.setOptions({ body: 'bridged' })
	press: 0,                 // fit realism plan stage 2, a trial (no control; app.engine.fitted.setOptions, dev/fit-stills.js): how much
	bend: 0,                  // squeezing the fabric costs against stretching it (0: free), and its bending stiffness over its stretch
	// modulus (m^2; 0: none). Twins: gpu.Problem press and bend (pipeline/race), energy.py
	jam: 1,                   // squeezing is free down to this share of the length (the knit's loops and wrinkles finer than the mesh take
	// it up), costs press beyond (owner, 2026-11-11: taut in most places, folds only where there is considerable extra fabric)
	kink: 0,                  // fit realism plan stage 3, a trial (no control): the elastic as a band that will not shorten along its line
	firm: 3,                  // (push-only spans between second neighbours, this times the elastic's stiffness; 0: none), and the
	// elastic's firmness (its stiffness times this). refit.js elasticSprings; twins energy.springs, gpu.Problem kink and firm.
	// firm 3 (owner, 2026-11-11, by eye from 1-4x stills: the band holds each opening where it belongs against the fabric's pull);
	// the estimate puts real elastic at 1-2x, 3-4x at the stiff end: knowledge/engineering/app/elastic-firmness-estimate.md
	snug: 1,                  // the elastic's length against what each opening is cut with (wrap_block.ELASTIC, design_*.ELASTIC): below 1
	// it is cut shorter and holds tighter (a trial, no control; 2026-11-11)
	slip: 50,                 // in a pose, steps without friction before the rest (no control): how far the garment may slide from where
	// dressing standing put it (fit realism plan stage 5 step 1, "fabric slip in poses"; owner, 2026-11-11: the shorter pattern rode up
	// the seat in the lunge). Leg openings' mean height on the body above the crotch, young, 88% length, standing 91-97 mm: lunge with
	// arms up 97-98 at 0 and 50, 103-106 at 150 (as free); back arch 90/102 at 0 (one side pulled up, diagonal folds), 95/100 at 50
	// (looks as before). 50: little ride-up and no lopsided pull
	folds: false,             // the fold waves the fabric shader paints from the fit's squeeze (fit/folds.js foldsOf). Off (owner,
	// 2026-11-11: "causing more issues than anything"; the arched back's seat covered in ripples where the posed mannequin's skin is
	// shortened and pinched, and where knit pulled long only narrows): knowledge/decisions/2026-11-11-fold-shading-off.md. No control
	mesh: 7,                  // mm between the garment's points. Finer (5, 3.5) is a dev-only trial: those fits are made by
	// `WRAP_STEP=5 python pipeline/wrap_block.py --drafted <block> young` into app/captures and served at /fitted-local/
	// (knowledge/engineering/app/fit-mesh-resolution-trial.md); a garment without one shows its 7 mm fit and says so
};
export const FIT_MESHES = [7, 5, 3.5];
// Steps without friction before a re-fit on the bare skin (fit realism plan stage 1 step 3): the fabric finds its tension balance and
// leaves the hollows the start put it in, then friction is anchored where it settled. 150: the seat as the owner chose it (dev/bridge-probe.js).
const FREE_STEPS = 150;
// The pose a fitted garment is put on in (fit realism plan stage 5 step 2): every other pose is fitted from this pose's fit, carried by
// the body's motion, not from the file's (owner, 2026-11-11). On the bare skin only; a body without it fits each pose from the file's.
const DRESS_POSE = 'standing';

// The finer fit's file for a garment entry (garment/fitted.js): wrap_block's names with its STEP_TAG before the cut,
// e.g. hybrid-6-block -> wrap-hybrid-6-s5-block, wrap-XS-high-resolved -> wrap-XS-s3p5-high-resolved.
const fineFile = (f, mm) => 'wrap-' + f.file.replace(/^wrap-/, '').replace(/-(block|high-resolved)$/, `-s${String(mm).replace('.', 'p')}-$1`);

export class FittedView {
	constructor(engine) {
		this.engine = engine;
		this.key = null;        // the fitted garment asked for
		this.size = { width: 1, length: 1 }; // its pattern's size (meta.fitSize, garment/fitted.js fitSizeOf): the re-fit's rest shape
		this.data = null;       // its loaded file
		this.garment = null;    // its part of a re-fit case (fitted-case.js garmentArrays)
		this.near = null;       // per whole-garment point, its neighbours (an opening's inward direction)
		this.meshes = [];       // one per piece half
		this.edges = null;      // the finished openings
		this.lines = null;      // its seams and edges as overlay lines (setLinesVisible: the lines button)
		this.linesOn = true;
		this.pairs = null;      // { seam, edge }: whole-garment point pairs the lines join
		this.cloths = new Map(); // panel id -> its piece as flat cloth for stones (stones/fitted-cloth.js), or null
		this.twin = null;       // whole-garment point -> its mirror point (the other half, the other sleeve)
		this.shownP = null; this.shownN = null; // per whole-garment point, where it is drawn (lift included) and its normal
		this.on = null;         // body vertices under its fabric (the cover hook)
		this.solved = null;     // the last re-fit's points, on the body as it was when it ran
		this.options = { ...FIT_DEFAULTS };
		this.status = { state: 'off' }; // for the settings panel: off | carried | fitting | fitted | error
		this.listeners = new Set(); // told of every status change (the busy note, the settings panel: main.jsx)
		this.device = null;
		this.running = false; this.again = false; this.gen = 0;
		engine.coverHooks.push((C) => { if (this.on) for (const v of this.on) C[v] = 1; });
		engine.body.onGarment.push(() => this.place());
	}

	get active() { return !!this.data; }
	get view() { return this.engine.layers.get('L0')?.view ?? null; }

	setStatus(s) { this.status = s; for (const fn of this.listeners) fn(s); }

	// While a re-fit for a new body or pose runs, the view keeps its last frame: the garment is only ever shown fitted (owner,
	// 2026-11-04: never the carried, unfitted state). Let go when the fit is drawn, or fails, or after HOLD_MAX_MS whatever happens.
	hold(on) {
		const holds = this.engine.viewport.holds;
		clearTimeout(this.holdTimer);
		if (!on) { holds.delete(this); return; }
		holds.add(this);
		this.holdTimer = setTimeout(() => holds.delete(this), HOLD_MAX_MS);
	}

	// The designer's fit settings: a change to the re-fit runs it again; the lift only redraws.
	setOptions(o) {
		const before = this.options;
		this.options = { ...before, ...o };
		if (!this.active) return;
		const changed = (k) => o[k] !== undefined && o[k] !== before[k];
		if (changed('mesh')) { this.reload(); return; } // another file: loaded and re-fitted afresh
		if (changed('refit') && !this.options.refit) { this.solved = null; this.show(); this.setStatus({ state: 'carried' }); }
		else if ((changed('refit') || changed('steps') || changed('mu') || changed('body') || changed('press') || changed('bend') || changed('jam') || changed('kink') || changed('firm') || changed('snug') || changed('slip')) && this.data.case) this.refit(); // the body is the same: the current fit stays until the new one is in
		else this.show();
	}

	// After every document change the engine has applied.
	sync(doc) {
		const f = fittedOf(doc), key = f?.key ?? null;
		const size = fitSizeOf(doc), resized = size.width !== this.size.width || size.length !== this.size.length;
		this.size = size;
		if (key !== this.key) {
			this.key = key;
			this.clear(doc);
			if (f) this.load(f, doc);
			return;
		}
		if (!this.active) return;
		if (resized && this.data.case) {
			this.garment = garmentArrays(this.data, size);
			if (this.cache) delete this.cache.matrix; // made from the rest shape (fit/refit.js); the body's parts and trees stay
			this.place(); // re-fit at the new size, the view held until it is in
		}
		this.dress(doc);
	}

	// The same garment from another file (the mesh setting), the view held on its last frame so the drawn pieces never flash
	// between the two (owner: only finished fits are shown).
	async reload() {
		const doc = this.engine.app?.doc, f = fittedOf(doc);
		if (!f || f.key !== this.key) return;
		this.clear(doc);
		this.hold(true);
		await this.load(f, doc);
		if (!(this.options.refit && this.data?.case)) this.hold(false); // else the re-fit lets go once drawn
	}

	async load(f, doc) {
		const want = this.key, url = import.meta.env.BASE_URL + (f.local ? 'fitted-local/' : 'fitted/') + f.file + '.json'; // local: dev-only, garment/fitted.js
		const mm = this.options.mesh, fine = mm !== 7 && import.meta.env.DEV ? import.meta.env.BASE_URL + 'fitted-local/' + fineFile(f, mm) + '.json' : null;
		let data, got = 7;
		this.loading = true; // (render/engine.js settled: the interface says it is working until the garment is in)
		try {
			if (fine) { const r = await fetch(fine); if (r.ok) { data = await r.json(); got = mm; } }
			data ??= await (await fetch(url)).json();
		} catch (e) { console.error('fitted garment', url, e); return; } finally { if (this.key === want) this.loading = false; }
		if (this.key !== want) return; // asked for another meanwhile
		this.meshMm = got; // folds smooth over the same distance at any spacing (fit/folds.js foldPasses)
		this.meshNote = fine && got !== mm ? `This garment has no ${mm} mm fit yet: showing its 7 mm fit.` : null;
		this.data = data;
		this.on = new Set(data.cells.flatMap((c) => c.hostI));
		if (data.case) {
			this.garment = garmentArrays(data, this.size);
			const n = data.case.n, T = data.case.tris, near = Array.from({ length: n }, () => new Set());
			for (let t = 0; t < T.length; t += 3) for (let k = 0; k < 3; k++) { near[T[t + k]].add(T[t + (k + 1) % 3]); near[T[t + k]].add(T[t + (k + 2) % 3]); }
			this.near = near.map((s) => [...s]);
		}
		if (data.case) {
			// mirror points: the two halves (and the two sleeves) are the same cells point for point
			const twin = this.twin = new Int32Array(data.case.n).map((_, i) => i);
			const byPiece = new Map();
			for (const c of data.cells) { const l = byPiece.get(c.piece) ?? []; l[c.half] = c; byPiece.set(c.piece, l); }
			for (const [, [h0, h1]] of byPiece) if (h0?.cid && h1?.cid) for (let l = 0; l < h0.cid.length; l++) { twin[h0.cid[l]] = h1.cid[l]; twin[h1.cid[l]] = h0.cid[l]; }
		}
		this.build();
		this.restone();
		this.engine.updateCover(doc); // the body lifts and slides where this fabric is
		this.place();
		this.dress(doc);
		this.engine.drawOverlay(doc); // the drawn lines go with the drawn pieces
		this.onLoaded?.(); // the flat view lays out its pieces
	}

	build() {
		const view = this.view, keys = this.data.case ? seamKeys(this.data.case) : null;
		if (keys) {
			const n = this.data.case.n, edge = [];
			for (const o of this.data.openings) if (o.ids) for (let i = 0; i < o.ids.length - (o.open ? 1 : 0); i++) edge.push(o.ids[i], o.ids[(i + 1) % o.ids.length]);
			this.pairs = { seam: [...keys].flatMap((k) => [Math.floor(k / n), k % n]), edge };
		}
		for (const c of this.data.cells) {
			const n = c.hostW.length / 3, geo = new THREE.BufferGeometry();
			const A = (name, size) => geo.setAttribute(name, new THREE.BufferAttribute(new Float32Array(n * size), size));
			A('position', 3); A('normal', 3); A('tangent', 4); addFabricAttributes(geo, n);
			// metres to the nearest seam: the shader's groove and ridge (render/garment.js does the same from the drawn arrangement)
			setFabricSlot(geo, 'seam', keys && c.cid ? cellSeams(c, keys, this.data.case.n) : SEAM_CAP);
			setFabricSlot(geo, 'cover', 1);
			geo.setIndex(new THREE.BufferAttribute(Uint32Array.from(c.I), 1));
			geo.attributes.aUV.array.set(c.uv); // flat metres: the cloth's weave and prints follow the pattern piece
			if (c.fold && this.options.folds) setFabricSlot(geo, 'fold', c.fold); // the fit's own folds (pipeline/wrap_block.py)
			const mesh = new THREE.Mesh(geo, HIDDEN); // dress() gives it its panel's material
			mesh.frustumCulled = false;
			mesh.userData = { fitted: c.name, piece: c.piece, cell: c };
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
		if (this.options.refit && this.data.case) { this.hold(true); this.refit(); return; } // shown once fitted (hold)
		this.show();
		this.setStatus({ state: 'carried', note: this.data.case ? null : 'This garment file has no re-fit data' });
	}

	// Every attribute from the body's arrays; positions where the re-fit settled each point, or carried by surface coordinates, then
	// lifted off the garment surface by options.lift (the garment surface already holds the body's own lift: aLift is zeroed).
	// A re-fitted garment is lit by its own shape: its normal and aGNormal (what the fabric shader shades with) from its solved points,
	// not the body's under it, which showed the navel and spine groove through fabric that spans them
	// (knowledge/engineering/app/hollows-on-bare-skin-diagnosis.md). The carried fit keeps the body's: it lies on that surface.
	show() {
		const view = this.view;
		if (!view) return;
		const man = this.engine.body, G = man.garmentPos, X = this.solved, lift = this.options.lift;
		const own = X && this.data.case ? this.ownNormals(X) : null;
		for (const mesh of this.meshes) {
			if (mesh.parent !== view.group) view.group.add(mesh); // the layer's view was rebuilt
			view.interpolate({ mesh, hosts: mesh.hosts });
			const geo = mesh.geometry, P = geo.attributes.position.array, N = geo.attributes.normal.array, hi = mesh.hosts.i, hw = mesh.hosts.w, n = hw.length / 3;
			if (own && mesh.cid) {
				const GN = geo.attributes.aGNormal.array;
				for (let l = 0; l < n; l++) {
					const i = 3 * mesh.cid[l];
					if (own[i] === 0 && own[i + 1] === 0 && own[i + 2] === 0) continue; // no area round it: the body's stays
					for (let k = 0; k < 3; k++) N[l * 3 + k] = GN[l * 3 + k] = own[i + k];
				}
				geo.attributes.normal.needsUpdate = geo.attributes.aGNormal.needsUpdate = true;
			}
			for (let l = 0; l < n; l++) for (let k = 0; k < 3; k++) {
				let v;
				if (X && mesh.cid) v = X[3 * mesh.cid[l] + k];
				else { v = 0; for (let j = 0; j < 3; j++) v += hw[l * 3 + j] * G[hi[l * 3 + j] * 3 + k]; }
				P[l * 3 + k] = v + N[l * 3 + k] * lift;
			}
			geo.attributes.aLift.array.fill(0);
			// folds from the fit shown: the re-fit's own (fit/folds.js, at the pattern's size), else the file's (the fit it was made with)
			const c = mesh.userData.cell;
			if (!this.options.folds) setFabricSlot(geo, 'fold', 0);
			else if (X && mesh.cid) {
				const q = new Float32Array(n * 3), sx = this.size.width, sy = this.size.length;
				for (let l = 0; l < n; l++) for (let k = 0; k < 3; k++) q[3 * l + k] = X[3 * mesh.cid[l] + k];
				setFabricSlot(geo, 'fold', foldsOf(q, Float32Array.from(c.uv, (v, i) => v * (i % 2 ? sy : sx)), c.I, foldPasses(this.meshMm)));
			} else if (c.fold) setFabricSlot(geo, 'fold', c.fold);
			else setFabricSlot(geo, 'fold', 0);
			geo.attributes.aLift.needsUpdate = geo.attributes.position.needsUpdate = true;
			geo.computeBoundingSphere();
			// where each whole-garment point is drawn, for the stones on it (frameAt)
			if (mesh.cid) {
				const n0 = this.data.case?.n ?? 0;
				if (!this.shownP || this.shownP.length !== n0 * 3) { this.shownP = new Float32Array(n0 * 3); this.shownN = new Float32Array(n0 * 3); }
				for (let l = 0; l < n; l++) { const i = mesh.cid[l] * 3; for (let k = 0; k < 3; k++) { this.shownP[i + k] = P[l * 3 + k]; this.shownN[i + k] = N[l * 3 + k]; } }
			}
		}
		this.engine.stoneView.build(); // its stones follow the fabric
		this.finish();
		this.drawLines();
		this.quiet();
	}

	// Per whole-garment point the unit normal of its solved shape: its triangles' area-weighted normals, each turned out by the case's
	// facing sign (+1 where the winding faces away from the body; the halves are mirrored), as the tuning page lifts its view
	// (dev/refit-lab.js paint). Zero where no triangle has area.
	ownNormals(X) {
		const c = this.data.case, T = c.tris, F = c.facing, out = new Float32Array(c.n * 3);
		for (let t = 0; t < T.length / 3; t++) {
			const a = 3 * T[3 * t], b = 3 * T[3 * t + 1], d = 3 * T[3 * t + 2];
			const ux = X[b] - X[a], uy = X[b + 1] - X[a + 1], uz = X[b + 2] - X[a + 2], vx = X[d] - X[a], vy = X[d + 1] - X[a + 1], vz = X[d + 2] - X[a + 2];
			const nx = (uy * vz - uz * vy) * F[t], ny = (uz * vx - ux * vz) * F[t], nz = (ux * vy - uy * vx) * F[t];
			for (const p of [a, b, d]) { out[p] += nx; out[p + 1] += ny; out[p + 2] += nz; }
		}
		for (let i = 0; i < out.length; i += 3) {
			const L = Math.hypot(out[i], out[i + 1], out[i + 2]);
			if (L > 0) { out[i] /= L; out[i + 1] /= L; out[i + 2] /= L; }
		}
		return out;
	}

	// The garment's seams (yellow) and edges (blue), as the overlay draws a drawn design's, at its points as now shown.
	drawLines() {
		if (this.lines) { this.lines.parent?.remove(this.lines); for (const l of this.lines.children) l.geometry.dispose(); this.lines = null; }
		if (!this.pairs) return;
		const man = this.engine.body, X = this.solved ?? startOf(this.data, man.garmentPos), N = startOf(this.data, man.aGNormal.array), lift = this.options.lift + LINE_LIFT;
		const at = (i, out, o) => { const L = Math.hypot(N[3 * i], N[3 * i + 1], N[3 * i + 2]) || 1; for (let k = 0; k < 3; k++) out[o + k] = X[3 * i + k] + N[3 * i + k] / L * lift; };
		this.lines = new THREE.Group();
		this.lines.renderOrder = 10;
		for (const [kind, colour] of [['seam', ROLE_COLOURS.seam], ['edge', ROLE_COLOURS.edge]]) {
			const P = this.pairs[kind], pos = new Float32Array(P.length * 3);
			for (let j = 0; j < P.length; j++) at(P[j], pos, 3 * j);
			const g = new LineSegmentsGeometry();
			g.setPositions(pos);
			const line = new LineSegments2(g, this.engine.overlay.material(colour, 1.6));
			line.frustumCulled = false;
			line.renderOrder = 10;
			this.lines.add(line);
		}
		this.lines.visible = this.linesOn;
		this.engine.overlay.group.parent.add(this.lines);
	}

	setLinesVisible(v) { this.linesOn = v; if (this.lines) this.lines.visible = v; }

	// --- stones on the fitted garment -------------------------------------------------------------------------------------

	// The piece of a panel as flat cloth: the fitted piece of that panel's name (Front, Back: both halves as one piece; Sleeve: one
	// of the pair, the other carried by the group's mirror). null when the garment has no piece of that name.
	clothFor(panelId) {
		if (!this.active || !this.data.case) return null;
		if (this.cloths.has(panelId)) return this.cloths.get(panelId);
		const name = this.engine.app?.doc.panels.find((p) => p.id === panelId)?.name;
		const cells = this.data.cells.filter((c) => c.name === name && c.cid && (c.name !== 'Sleeve' || c.half === 0));
		const piece = cells.length ? new FittedCloth(this.data, cells, this.engine.surf, 'fit:' + panelId) : null;
		if (piece) piece.paired = name === 'Sleeve';
		this.cloths.set(panelId, piece);
		return piece;
	}

	// A stone's place on the fabric as drawn now: position (lift included) and normal into P and N; false if it cannot say.
	frameAt(fit, P, N) {
		const S = this.shownP, M = this.shownN;
		if (!this.active || !S) return false;
		const a = fit.a * 3, b = fit.b * 3, c = fit.c * 3;
		if (c + 2 >= S.length) return false;
		for (let k = 0; k < 3; k++) { P[k] = fit.w0 * S[a + k] + fit.w1 * S[b + k] + fit.w2 * S[c + k]; N[k] = fit.w0 * M[a + k] + fit.w1 * M[b + k] + fit.w2 * M[c + k]; }
		const L = Math.hypot(N[0], N[1], N[2]) || 1;
		N[0] /= L; N[1] /= L; N[2] /= L;
		return true;
	}

	// The same weights on the mirror points (a stone pattern's mirrored half).
	mirrorFit(fit) {
		const t = this.twin;
		if (!t) return undefined;
		return { ...fit, a: t[fit.a], b: t[fit.b], c: t[fit.c] };
	}

	// Distance from a reference position to the nearest of this garment's finished openings, less the elastic's keep-out
	// (render/engine.js edgeKeepOut does the same for the drawn pieces' rims). Built once per garment.
	edgeKeepOut() {
		if (this.keepOut) return this.keepOut;
		const SP = this.engine.surf.P, cell = 0.02, grid = new Map(), keep = EDGE_TRIMS.elastic.width + 0.0015;
		const keyOf = (i, j, k) => `${i},${j},${k}`;
		for (const o of this.data?.openings ?? []) {
			for (let i = 0; i < o.hostW.length / 3; i++) {
				let x = 0, y = 0, z = 0;
				for (let j = 0; j < 3; j++) { const v = o.hostI[i * 3 + j] * 3, w = o.hostW[i * 3 + j]; x += w * SP[v]; y += w * SP[v + 1]; z += w * SP[v + 2]; }
				const key = keyOf(Math.floor(x / cell), Math.floor(y / cell), Math.floor(z / cell));
				let l = grid.get(key); if (!l) grid.set(key, (l = [])); l.push(x, y, z);
			}
		}
		this.keepOut = (p, override) => {
			let best = Infinity;
			const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell), cz = Math.floor(p.z / cell);
			for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
				const l = grid.get(keyOf(cx + i, cy + j, cz + k));
				if (l) for (let q = 0; q < l.length; q += 3) best = Math.min(best, Math.hypot(p.x - l[q], p.y - l[q + 1], p.z - l[q + 2]) - (override ?? keep));
			}
			return best;
		};
		return this.keepOut;
	}

	// Stones lay again: their pieces changed (a fitted garment came or went).
	restone() {
		const e = this.engine;
		e.stoneGeoRev++; e.patternCache?.clear(); e.stoneCache = { gens: new Map() }; e.stonePending?.clear?.();
		e.stonesDirty = true;
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
				const man = this.engine.body, t0 = performance.now(), skin = this.options.body === 'skin';
				// the body it stands on: the bare skin, or the drawn garment's surface
				const Q = skin ? man.aPos.array : man.garmentPos;
				// on the skin in a pose: dressed standing first (kept while design, size, body and settings stay), then that fit carried
				// into the pose by the body's motion (each point by its host's move: fitted-case.js startOf's hosts) and fitted there
				// with friction from the start (options.slip steps without), so the garment stays where it was put unless pulled off it
				const dressAt = skin && man.poseKey !== JSON.stringify(DRESS_POSE) ? DRESS_POSE : null;
				let start = null, dressSteps = 0, dressSec = 0;
				if (dressAt) {
					// the standing fit depends on the body, the pattern's size and mesh, and every fit setting it ran with (dev scripts set
					// options directly, so the key, not setOptions, decides)
					const o = this.options, key = JSON.stringify([man.key, man.head, this.size, this.meshMm, o.steps, o.mu, o.press, o.bend, o.jam, o.kink, o.firm, o.snug]);
					if (this.dressed?.key !== key || this.dressed.data !== this.data) {
						let Qs = null;
						try { Qs = man.positionsIn(dressAt); } catch { /* the body lacks the pose: fitted from the file's start */ }
						if (Qs) {
							const d = await this.fitOn(Qs, null, FREE_STEPS);
							this.dressed = { key, data: this.data, X: d.X, base: startOf(this.data, Qs) };
							dressSteps = d.steps; dressSec = d.seconds;
						}
					}
					if (this.dressed?.key === key && this.dressed.data === this.data) {
						const now = startOf(this.data, Q), { X: D, base } = this.dressed;
						start = Float32Array.from(now, (v, i) => v + D[i] - base[i]);
					}
				}
				const fit = await this.fitOn(Q, start, start ? this.options.slip : skin ? FREE_STEPS : 0);
				if (this.again || gen !== this.gen || !this.active) continue; // the body changed meanwhile: run again on the new one
				this.solved = fit.X;
				this.show();
				this.hold(false);
				this.setStatus({ state: 'fitted', steps: dressSteps + fit.steps, seconds: dressSec + fit.seconds, setup: (performance.now() - t0) / 1000 - dressSec - fit.seconds, dressed: !!start });
			} while (this.again && this.active);
		} catch (e) {
			console.error('re-fit', e);
			this.show(); // what can be shown: the carried fit
			this.setStatus({ state: 'error', note: e.message });
		} finally {
			this.running = false;
			if (!this.running && !this.again) this.hold(false);
		}
	}

	// One re-fit on body points Q from start (null: the file's, fitted-case.js startOf): `free` steps without friction, read back once,
	// then options.steps with friction anchored where it settled (reset: anchor and held forces anew). -> { X, steps, seconds }
	async fitOn(Q, start, free) {
		const man = this.engine.body;
		const data = buildCase(this.data, this.garment, Q, man.idx, man.wArm, this.cache ??= {},
			{ press: this.options.press, bend: this.options.bend, jam: this.options.jam, kink: this.options.kink, firm: this.options.firm, snug: this.options.snug });
		if (start) data.arrays.start = start;
		const r = new Refit(this.device, data, { maxSteps: this.options.steps, mu: this.options.mu, tol: 0 });
		const steps = this.options.steps, W = r.settings.window, t = performance.now();
		if (free) {
			r.setSettings({ mu: 0 }); r.settings.window = free;
			await r.run({ steps: free });
			r.reset(await r.positions(false));
			r.setSettings({ mu: this.options.mu }); r.settings.window = W;
		}
		// no early stop (the step count is the lever), so no reading back every window: all but the last window in one run,
		// then the last window, whose average is what is drawn (the shoulder's chatter hidden), as the tuning page shows it
		if (steps > W) { r.settings.window = steps - W; await r.run({ steps: steps - W }); r.settings.window = W; }
		const res = await r.run({ steps });
		const X = await r.positions(steps > W);
		r.destroy();
		return { X, steps: free + res.steps, seconds: (performance.now() - t) / 1000 };
	}

	// The design's materials on the fitted pieces, and the app's own pieces and edges out of sight.
	dress(doc) {
		const view = this.view;
		if (!view) return;
		const L0 = doc.panels.filter((p) => (p.layer ?? 'L0') === 'L0' && !p.removed);
		const byName = new Map(L0.map((p) => [p.name, p]));
		const front = byName.get('Front') ?? L0[0];
		for (const mesh of this.meshes) {
			// a strap (pipeline/design_strappy.py) is the binding carried on: the binding's look, not a panel's
			const p = byName.get(mesh.userData.fitted) ?? front;
			if (mesh.userData.fitted === 'Strap') mesh.material = this.trimMaterial(doc);
			else if (p) mesh.material = view.material(p.id);
			if (mesh.parent !== view.group) view.group.add(mesh);
		}
		this.finish();
		this.quiet();
	}

	// The design's binding look (garment/fitted.js fittedTrimOf) as a fabric for the straps, made as a panel's is (render/garment.js).
	trimMaterial(doc) {
		const view = this.view, t = fittedTrimOf(doc), m = view.material('fitted:trim'), u = m.userData.u;
		applyFabric(m, t.fabric, t.colour, t.second ?? 'Tone-on-tone', t.colour2 ?? null, texScaleOf(t), t.satin);
		bindScan(m, t, view.textures);
		fabricSide(m, view.doubleSided);
		u.uUV.value = 1; // its cells carry their flat metres (aUV)
		return m;
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
		this.hold(false);
		for (const m of this.meshes) { m.parent?.remove(m); m.geometry.dispose(); }
		this.meshes = [];
		if (this.edges) { this.edges.parent?.remove(this.edges); for (const m of this.edges.children) m.geometry.dispose(); this.edges = null; }
		if (this.lines) { this.lines.parent?.remove(this.lines); for (const l of this.lines.children) l.geometry.dispose(); this.lines = null; }
		this.data = null; this.garment = null; this.near = null; this.solved = null; this.cache = null; this.pairs = null;
		this.cloths.clear(); this.twin = null; this.shownP = this.shownN = null; this.keepOut = null;
		this.restone();
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
		if (this.edges) { this.edges.parent?.remove(this.edges); for (const m of this.edges.children) m.geometry.dispose(); this.edges = null; }
		if (!doc || !view || !this.data?.openings?.length) return;
		const L = e.layers.get('L0'), man = e.body, G = man.garmentPos, GN = man.aGNormal.array, X = this.solved;
		const at = (I, W, i, out) => { out.set(0, 0, 0); for (let j = 0; j < 3; j++) { const v = I[i * 3 + j] * 3, w = W[i * 3 + j]; out.x += w * G[v]; out.y += w * G[v + 1]; out.z += w * G[v + 2]; } return out; };
		const nrm = (I, W, i) => { const o = new THREE.Vector3(); for (let j = 0; j < 3; j++) { const v = I[i * 3 + j] * 3, w = W[i * 3 + j]; o.x += w * GN[v]; o.y += w * GN[v + 1]; o.z += w * GN[v + 2]; } return o.normalize(); };
		const pt = (i) => new THREE.Vector3(X[3 * i], X[3 * i + 1], X[3 * i + 2]);
		const built = [];
		for (const o of this.data.openings) {
			if (o.finish === 'none') { built.push(null); continue; } // an opening with no finish of its own (a strap's edge: the strap is the binding)
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
			// an open run (o.open: a binding from strap to strap, pipeline/wrap_block.py export) is resampled and smoothed without wrapping
			const open = !!o.open, sm = open ? smoothOpen : smoothLoop;
			const { pts, length } = open ? resampleOpen(recs) : resample(recs), m = pts.length, P = pts.map((a) => a.p), Nn = pts.map((a) => a.n), In = pts.map((a) => a.inside);
			sm(P, 3, 2, true); sm(Nn, 4, 2, true); sm(In, 4, 1, true);
			const frames = [], scale = [];
			const near = (i) => (open ? Math.min(Math.max(i, 0), m - 1) : (i + m) % m);
			for (let i = 0; i < m; i++) {
				const nn = Nn[i].normalize(), t = P[near(i + 1)].clone().sub(P[near(i - 1)]).normalize(), d = new THREE.Vector3().crossVectors(nn, t).normalize();
				if (d.dot(In[i]) < 0) d.negate();
				frames.push({ p: P[i].addScaledVector(nn, this.options.lift), n: nn, d, kap: 0 });
				scale.push(1);
			}
			built.push({ frames, scale, pts, length, open });
		}
		const L0 = doc.panels.filter((p) => (p.layer ?? 'L0') === 'L0' && !p.removed);
		const s = (L0.find((p) => p.name === 'Front') ?? L0[0])?.stack?.[0];
		if (!s) return;
		// openings the file marks bound (pipeline/wrap_block.py export, a design's) take the binding in the design's binding look; the
		// rest turned elastic in the front's. One mesh per kind, kept together as this.edges.
		const t = fittedTrimOf(doc), bound = this.data.openings.map((o) => o.finish === 'binding');
		this.edges = new THREE.Group();
		for (const kind of ['elastic', 'binding']) {
			const these = built.filter((b, i) => b && bound[i] === (kind === 'binding'));
			if (!these.length) continue;
			const look = kind === 'binding' ? t : s;
			const mesh = new THREE.Mesh(buildGeometry(these, TRIMS[kind].profile), L.rims.material({ kind, fabric: look.fabric, colour: look.colour, second: look.second ?? 'Tone-on-tone' }));
			mesh.renderOrder = -4;
			mesh.frustumCulled = false;
			this.edges.add(mesh);
		}
		view.group.add(this.edges);
	}
}

// An open run of edge records (an opening's o.open) at the rims' spacing, its ends kept: garment/trim.js resample and smoothLoop wrap
// round a closed loop.
function resampleOpen(recs, step = 0.0015) {
	const n = recs.length, cum = [0];
	for (let i = 1; i < n; i++) cum.push(cum[i - 1] + recs[i].p.distanceTo(recs[i - 1].p));
	const total = cum[n - 1], m = Math.max(Math.round(total / step), 2) + 1, out = [];
	let s = 0;
	for (let k = 0; k < m; k++) {
		const d = (k / (m - 1)) * total;
		while (s < n - 2 && cum[s + 1] < d) s++;
		const a = recs[s], b = recs[s + 1], t = Math.min(Math.max((d - cum[s]) / Math.max(cum[s + 1] - cum[s], 1e-9), 0), 1);
		out.push({ p: a.p.clone().lerp(b.p, t), n: a.n.clone().lerp(b.n, t), inside: a.inside.clone().lerp(b.inside, t), ref: a.ref.clone().lerp(b.ref, t), keep: 1 });
	}
	return { pts: out, length: total };
}
function smoothOpen(a, r, passes) {
	const n = a.length;
	for (let p = 0; p < passes; p++) {
		const src = a.map((v) => v.clone());
		for (let i = 1; i < n - 1; i++) {
			a[i].set(0, 0, 0);
			for (let k = -r; k <= r; k++) a[i].add(src[Math.min(Math.max(i + k, 0), n - 1)]);
			a[i].multiplyScalar(1 / (2 * r + 1));
		}
	}
}
