// Turns the design document into the 3D scene. The document is the only input: sync(doc,
// touched) rebuilds whatever depends on the sections a command touched (see doc/store.js).
import * as THREE from 'three';
import { createFabricMaterial } from '../materials/fabric.js';
import { setFabricSlot } from '../materials/fabric-attributes.js';
import { fullBodyStand, dressFormStand, cutCaps } from './stand.js';
import { MANNEQUIN_FINISHES, REALISTIC_SKIN } from './presets.js';
import { DecalSet } from './decals.js';
import { surfaceLandmarks } from '../body/landmarks.js';
import { poseSpec } from '../body/pose.js';
import { LegacyGarment } from '../garment/legacy.js';
import { GarmentView, sameSign } from './garment.js';
import { buildGarment, evaluateAll, panelAt } from '../garment/build.js';
import { Surface } from '../body/surface.js';
import { Overlay } from './overlay.js';
import { HoverHighlight } from './highlight.js';
import { PatternGizmo } from './gizmo.js';
import { Rims } from './rims.js';
import { TextureLibrary } from '../materials/textures.js';
import { StrapView } from './straps.js';
import { HardwareView } from './hardware.js';
import { StoneView } from '../stones/view.js';
import { gpuKeepOn } from '../stones/gpu-view.js';
import { runStones } from '../stones/generators.js';
import { ClothPiece } from '../stones/cloth.js';
import { locate, baryOfVertexInFace } from '../garment/arrangement.js';
import { TRIMS } from '../garment/trim.js';
import { FigureView, finishSurface } from './figure.js';
import { markSkin } from './postfx.js';
import { FittedView } from './fitted.js';

const BEHIND = 0.006; // m: picks count this far behind the surface hit (what sits on the fabric)
const _v = new THREE.Vector3();

export class Engine {
	// ref: the reference garment surface (body/reference.js), where curves live
	constructor(viewport, body, ref) {
		this.viewport = viewport; this.body = body; this.ref = ref; this.surf = ref.surface;
		const scene = viewport.world; // the body and garment (scaled together when matching a photo)
		// The mannequin's skin in two pieces split along the head's border (the head bone's skin weight
		// at one half, per pixel: each piece discards the other's side through its own keep field), so
		// the body and the mannequin head take their own finishes; the body's can also be the
		// person's realistic skin (render/figure.js) under any head.
		this.skin = createFabricMaterial(3);
		this.headSkin = createFabricMaterial(3);
		// cut bodies (dress form, no head) are open tubes under their caps: show the inside, not the background
		this.skin.side = this.headSkin.side = THREE.DoubleSide;
		// the body's own geometry plus closed eyes for the mannequin head (body.eyeCaps, left out when
		// the figure draws the eyeballs in its finish: applyBody): same attributes
		const caps = body.eyeCaps(), ix = new Uint32Array(body.idx.length + caps.length);
		ix.set(body.idx); ix.set(caps, body.idx.length);
		const piece = (mat) => {
			// each piece its own keep (packed with the form: materials/fabric-attributes.js), the rest shared with the body
			const g = new THREE.BufferGeometry(), keep = new THREE.BufferAttribute(new Float32Array(body.vertices * 4), 4);
			for (const [k, a] of Object.entries(body.geometry.attributes)) g.setAttribute(k, k === 'aKeepForm' ? keep : a);
			setFabricSlot(g, 'form', body.form);
			g.setIndex(new THREE.BufferAttribute(ix, 1));
			const m = new THREE.Mesh(g, mat);
			m.frustumCulled = false; // the geometry's positions change when the body is swapped
			m.castShadow = m.receiveShadow = true; // arms shade the torso
			m.userData.keep = keep;
			scene.add(m);
			return m;
		};
		this.skinMesh = piece(this.skin);
		this.headMesh = piece(this.headSkin);
		this.capMaterial = new THREE.MeshPhysicalMaterial();
		this.stand = null;
		this.figure = new FigureView(scene, viewport.renderer); // head type 'person': a real person instead of the mannequin's skin
		this.legacy = new LegacyGarment(scene, body);
		this.textures = new TextureLibrary(viewport.renderer);
		this.layers = new Map(); // layer id -> { layer, g, view: GarmentView, rims: Rims }
		this.straps = new StrapView(scene, body, this.textures);
		this.hardware = new HardwareView(scene, body, this.surf);
		this.stoneView = new StoneView(scene, body);
		this.stoneView.renderer = viewport.renderer; // (the GPU's patterns: stones/gpu-view.js)
		this.stoneRun = { stones: [], errors: [], dropped: 0 };
		this.stoneCache = { gens: new Map() };  // per group, what the last run made (stones/generators.js)
		this.patternCache = new Map();          // per pattern, its heavy candidates between frames
		this.stonePending = new Set();          // patterns waiting for their piece's flat shape
		this.stoneGeoRev = 0;
		this.coverHooks = [(cover) => this.straps.markCover(cover)];
		this.overlay = new Overlay(scene, body);
		this.ui = { selected: null, hover: null, showPoints: false, hidden: false }; // overlay state from the UI
		this.highlight = new HoverHighlight(viewport, this.overlay.group, () => this.overlay.group.visible);
		this.gizmo = new PatternGizmo(this);
		this.hover = null; // what the pointer is over in Select: { kind, id, stone? } (setHover)
		this.timing = { mannequin: 0, garment: null };
		this.bodyKey = null;
		this.g = null;          // the shell layer's build (tools and picking use it)
		this.evaluated = null;  // every layer's evaluated curves
		this.geoSig = null;
		// a drag edits a stone group many times a frame's worth of pointer events: run it once, here (onTick: also while the 3D pane is
		// hidden, the pattern view alone on screen, whose handles wait on it: ui/FlatStones.jsx)
		viewport.onTick.add(() => {
			if (this.stonesDirty && this.app) { this.stonesDirty = false; this.syncStones(this.app.doc, this.stonesLive ? new Set(['stones']) : null); this.stonesLive = false; this.onStones?.(); }
		});
		viewport.onFrame.add(() => {
			this.legacy.frame(viewport.keyDir);
			for (const L of this.layers.values()) { L.view.frame(viewport.keyDir); L.rims.frame(viewport.keyDir); }
			this.straps.frame(viewport.keyDir);
			this.gizmo.frame();
		});
		// picking surface: the garment surface of the body on show (same canonical faces as everywhere)
		this.pick = null;
		body.onGarment = [() => { if (this.pick) this.pick.update(body.garmentPos); else this.pick = new Surface(body.idx, body.garmentPos); this.gizmo?.again(); }];
		this.raycaster = new THREE.Raycaster();
		this.fitted = new FittedView(this); // a fitted garment in place of the drawn pieces (doc.meta.fitted)
		this.stoneView.fitAt = (fit, P, N) => this.fitted.frameAt(fit, P, N); // its stones sit on its fabric
	}

	// What is under a screen point: the garment surface point, the panel there, and (for the
	// selected curve) a control point within reach. x, y in CSS pixels relative to the canvas.
	pickAt(x, y) {
		if (!this.pick) return null;
		const vp = this.viewport, el = vp.renderer.domElement, w = el.clientWidth, h = el.clientHeight;
		const ndc = new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1);
		this.raycaster.setFromCamera(ndc, vp.camera);
		// into the body's own space (undo a photo's proportion scaling)
		vp.world.updateMatrixWorld();
		const ray = this.raycaster.ray.clone().applyMatrix4(vp.world.matrixWorld.clone().invert());
		ray.direction.normalize();
		this.lastRay = ray;
		const hit = this.pick.raycast(ray);
		const out = { x, y, sp: hit ? { f: hit.f, b0: hit.b0, b1: hit.b1, b2: hit.b2 } : null, point: hit?.point ?? null, distance: hit?.distance ?? Infinity };
		if (out.sp && this.app) {
			// the outermost layer with a (not cut out) panel here
			for (const L of [...this.layers.values()].sort((a, b) => (b.layer.z ?? 0) - (a.layer.z ?? 0))) {
				const id = panelAt(L.g, this.app.doc, this.surf, out.sp);
				if (id && !this.app.doc.panels.find((p) => p.id === id)?.removed) { out.panel = id; out.layer = L.layer.id; break; }
				if (id && !out.panel) { out.panel = id; out.layer = L.layer.id; }
			}
		}
		return out;
	}

	// Screen position (CSS pixels) of a surface point on the current garment, and its depth.
	toScreen(sp) {
		const vp = this.viewport, el = vp.renderer.domElement, p = this.overlay.place(sp, new THREE.Vector3()).applyMatrix4(vp.world.matrixWorld);
		const d = p.distanceTo(vp.camera.position);
		p.project(vp.camera);
		return { x: (p.x + 1) / 2 * el.clientWidth, y: (1 - p.y) / 2 * el.clientHeight, d, behind: p.z > 1 };
	}

	// Nearest curve (by screen distance) within `px` pixels of (x, y), not hidden behind the body.
	// lines: the evaluated curves to look at (default all); only(e): which of them count.
	curveAt(x, y, px = 7, { lines = this.evaluated, only = null } = {}) {
		if (!lines) return null;
		const surfHit = this.pickAt(x, y);
		let best = null, bd = px;
		for (const [key, e] of lines) {
			if (only && !only(e)) continue;
			for (let i = 0; i < e.sps.length; i += 2) {
				const s = this.toScreen(e.sps[i]);
				if (s.behind) continue;
				const d = Math.hypot(s.x - x, s.y - y);
				if (d < bd && s.d < (surfHit?.distance ?? Infinity) + 0.01) { bd = d; best = { key, curve: e.curve, mirrored: e.mirrored, sample: i, t: e.s[i] / Math.max(e.s[e.s.length - 1], 1e-9) }; }
			}
		}
		return best;
	}

	// What a click in Select would choose at a screen point, front to back: a stone directly under
	// it, a strap, a line near it, a logo, the piece. -> { kind, id, stone? } or null
	hitAt(x, y) {
		const h = this.pickAt(x, y);
		if (!h) return null;
		const stone = this.stoneAt(h.distance, this.viewport.renderer.domElement.clientHeight);
		if (stone) return { kind: stone.gen === 'placed' ? 'placed' : 'stones', id: stone.gen === 'placed' ? stone.id : stone.gen, stone };
		// a strap before the line it runs along (that line lies under it), unless the line is the one
		// being edited; the line's list in the Shape tab reaches it otherwise
		const strap = this.raycaster.intersectObjects(this.straps.meshes.filter((m) => m.userData.strap), false)[0];
		const sid = strap && strap.distance < h.distance + BEHIND ? strap.object.userData.strap : null;
		const c = this.curveAt(x, y);
		const onPath = c && (this.ui.selected === c.curve ? null : this.app.doc.straps.find((s) => s.path === c.curve));
		if (c && !sid && !onPath) return { kind: 'curves', id: c.curve, mirrored: c.mirrored };
		if (sid || onPath) { if (c && this.ui.selected === c.curve) return { kind: 'curves', id: c.curve, mirrored: c.mirrored }; return { kind: 'straps', id: sid ?? onPath.id }; }
		if (h.sp && this.decals) { const d = this.decals.at(this.surf.pos(h.sp)); if (d) return { kind: 'decals', id: d.id }; }
		if (!h.panel) return null;
		// Mirror off: a click chooses one side of a paired piece, so the hover shows that cell only
		const off = this.app.doc.symmetry === false && this.app.doc.panels.find((p) => p.id === h.panel)?.mirror === 'both';
		const g = off ? this.layers.get(h.layer)?.g : null, t = g ? locate(g.arr, this.surf, h.sp) : -1;
		return { kind: 'panels', id: h.panel, sp: h.sp, layer: h.layer, cell: t >= 0 ? g.arr.cellOf[t] : null };
	}

	// The stone on the last pickAt's ray, not behind the surface it hit: within its own radius, or
	// a few pixels for one too small to aim at.
	stoneAt(surfaceDistance, height) {
		const ray = this.lastRay, stones = this.stoneView.stones;
		if (!ray || !stones.length) return null;
		this.stoneView.ensurePlaced();
		const perPx = 2 / (this.viewport.camera.projectionMatrix.elements[5] * height), v = _v;
		let best = null, bd = 1;
		for (const s of stones) {
			if (!s.at) continue;
			v.subVectors(s.at, ray.origin);
			const t = v.dot(ray.direction);
			if (t <= 0 || t > surfaceDistance + BEHIND) continue;
			const r = Math.max(s.size / 2, 3 * perPx * t), d = (v.lengthSq() - t * t) / (r * r); // 1 at its rim
			if (d < bd) { bd = d; best = s; }
		}
		return best;
	}

	// Show what the pointer is over (null: nothing). Lines thicken; everything else: render/highlight.js
	setHover(hit) {
		const key = (o) => (o ? o.kind + ':' + o.id + ':' + (o.cell ?? '') : '');
		const same = key(hit) === key(this.hover);
		if (same && hit?.stone === this.hover?.stone) return;
		this.hover = hit;
		if (!same || hit?.kind !== 'stones') this.showHover();
		else this.highlight.setStones(this.hoverStones(hit), hit.stone);
	}

	// A paired part's other half is chosen with it while the Mirror toggle is on (doc/symmetry.js).
	hoverIds(list, id) {
		const doc = this.app.doc, o = doc[list]?.find((x) => x.id === id);
		return o?.pair && doc.symmetry !== false ? [id, o.pair] : [id];
	}

	hoverStones(hit) {
		this.stoneView.ensurePlaced();
		if (hit.kind === 'placed') return this.stoneView.stones.filter((s) => s.gen === 'placed' && s.id === hit.id);
		const ids = this.hoverIds('stones', hit.id), doc = this.app.doc;
		const list = this.stoneView.stones.filter((s) => ids.includes(s.gen));
		// Mirror off: a click chooses one half of a mirrored group
		if (doc.symmetry === false && hit.stone && doc.stones.find((g) => g.id === hit.id)?.mirror === 'both') return list.filter((s) => !!s.mirrored === !!hit.stone.mirrored);
		return list;
	}

	// Draws this.hover (again after a change to the design: the meshes and stones are new).
	showHover() {
		const hit = this.hover, parts = [];
		const hoverLine = hit?.kind === 'curves' ? hit.id : null;
		if (hoverLine !== this.ui.hover) this.setUI({ hover: hoverLine });
		if (hit?.kind === 'panels') { for (const L of this.layers.values()) for (const c of L.view.cells) if (c.panelId === hit.id && (hit.cell == null || (L.layer.id === hit.layer && c.cell === hit.cell))) parts.push({ mesh: c.mesh }); }
		if (hit?.kind === 'straps') for (const mesh of this.straps.meshes) if (mesh.userData.strap === hit.id) parts.push({ mesh });
		if (hit?.kind === 'decals') for (const id of this.hoverIds('decals', hit.id)) {
			const d = this.decals?.boxOf(id), L = d && this.layers.get(d.layer);
			if (L) for (const c of L.view.cells) parts.push({ mesh: c.mesh, box: d.box });
		}
		this.highlight.setParts(parts);
		const stones = hit?.kind === 'stones' || hit?.kind === 'placed' ? this.hoverStones(hit) : [];
		this.highlight.setStones(stones, stones.includes(hit?.stone) ? hit.stone : null);
	}

	stoneCount() { return this.legacyMode ? this.legacy.stones.count : this.stoneView.count; }

	get fabricMaterials() { return [this.skin, this.headSkin, ...this.legacy.materials, ...[...this.layers.values()].flatMap((L) => [...L.view.materials.values()])]; }
	get garment() { return this.layers.get('L0')?.view ?? null; }
	get views() { return [...this.layers.values()].map((L) => L.view); }
	whenFlat() { return Promise.all(this.views.map((v) => v.whenFlat())); }

	sync(doc, touched, why) {
		const all = why === 'load' || !this.synced;
		const t = (k) => all || touched.has(k);
		if (t('scene')) this.viewport.applyScene(doc.scene);
		const legacy = !!doc.legacy;
		if (legacy !== this.legacyMode) {
			// switching garment model: the other model's cover field must be rebuilt
			this.legacyMode = legacy;
			this.legacy.state = null; this.body.styleKey = null; this.geoSig = null;
			this.legacy.setVisible(legacy);
			for (const L of this.layers.values()) { L.view.setVisible(!legacy); L.rims.setVisible(!legacy); }
			this.straps.setVisible(!legacy); this.hardware.setVisible(!legacy); this.stoneView.setVisible(!legacy);
		}
		if (legacy) {
			// Style before the first body: the garment surface needs the regions, and setStyle skips the
			// rebuild until a body is set, so the lift solve (~0.7 s) runs once at start-up.
			if (!this.body.key) this.body.setStyle(doc.legacy);
			if (t('body')) this.applyBody(doc.body, all);
			if (t('legacy') || !this.legacy.state) this.legacy.apply(doc.legacy);
		} else if (why === 'gesture' && !all) {
			// mid-drag: only the dragged lines move; the garment is re-cut when the gesture ends
			if (touched.has('curves')) this.drawOverlay(doc, evaluateAll(doc, this.surf, null, this.evaluated));
			if (touched.has('panels')) for (const v of this.views) v.applyMaterials(doc);
			// a stone group's slider or handle: redrawn in this frame
			if (touched.has('stones')) { this.stonesDirty = true; this.stonesLive = true; }
			// the mannequin's colour picker: a finish change only (same body key: no re-fit)
			if (touched.has('body')) this.applyBody(doc.body, false);
		} else {
			if (t('curves') || t('panels') || t('layers') || t('trims') || this.geoSig === null) this.syncGarment(doc);
			else if (t('straps')) this.syncStraps(doc);
			if (t('hardware') || t('curves') || t('panels')) this.hardware.build(doc);
			if (t('stones') || t('placed') || t('curves') || t('panels') || t('straps') || t('trims') || t('layers')) { this.syncStones(doc, all ? null : touched); this.stonesDirty = false; this.onStones?.(); } // (the flat view paints them: ui/FlatView.jsx Stack)
			if (t('decals') || t('layers') || t('curves') || t('panels')) this.syncDecals(doc);
			if (t('body')) this.applyBody(doc.body, all);
			this.fitted.sync(doc);
		}
		if (!legacy && why !== 'gesture') this.drawOverlay(doc);
		if (this.hover && why !== 'gesture') this.showHover();
		this.synced = true;
	}

	drawOverlay(doc, evaluated = this.evaluated) {
		this.overlay.surf = this.surf;
		this.overlay.setVisible(!doc.legacy && !this.ui.hidden && !this.fitted?.active); // a fitted garment has none of the drawn lines...
		this.fitted?.setLinesVisible(!doc.legacy && !this.ui.hidden); // ...it draws its own seams and edges
		if (evaluated) this.overlay.setCurves(evaluated, doc, this.ui);
		this.lastEvaluated = evaluated;
		this.gizmo?.again();
	}
	setUI(ui) { Object.assign(this.ui, ui); if (this.lastEvaluated && this.app) this.drawOverlay(this.app.doc, this.lastEvaluated); }

	// Rebuild the cut garment (every layer) when its geometry inputs changed; otherwise only its
	// materials and edge finishes.
	syncGarment(doc) {
		const sig = JSON.stringify([doc.curves, doc.panels.map((p) => [p.id, p.seed, p.removed, p.mirror, p.layer]), doc.layers]);
		const trimSig = JSON.stringify([doc.trims, doc.panels.map((p) => p.stack?.[0])]);
		if (sig !== this.geoSig) {
			const t0 = performance.now(), scene = this.viewport.world;
			const curveSig = JSON.stringify(doc.curves);
			const evaluated = this.pending?.curveSig === curveSig ? this.pending.evaluated : evaluateAll(doc, this.surf, null, this.evaluated);
			const keep = new Set(doc.layers.map((l) => l.id));
			for (const [id, L] of this.layers) if (!keep.has(id)) { L.view.dispose(); L.rims.dispose(); scene.remove(L.view.group); scene.remove(L.rims.group); this.layers.delete(id); }
			for (const layer of doc.layers) {
				let L = this.layers.get(layer.id);
				if (!L) {
					L = { layer, view: new GarmentView(scene, this.body, layer), rims: new Rims(scene, this.body, this.textures), g: null };
					L.view.textures = this.textures;
					L.view.wrinkles = this.wrinkleZones();
					L.view.doubleSided = !!this.bodyHidden;
					L.view.onFlat = () => { if (this.stonePending.size) this.stonesDirty = true; };
					this.layers.set(layer.id, L);
				}
				L.layer = layer; L.view.layer = layer; L.rims.kind = layer.kind; L.rims.layerId = layer.id; L.rims.bounds = new Set(layer.bounds ?? []);
				const prev = layer.id === 'L0' && this.pending?.curveSig === curveSig ? this.pending : L.g;
				L.g = buildGarment(doc, this.surf, { prev, layer: layer.id, evaluated });
				L.view.setGarment(L.g, doc);
			}
			// linings show only where the shell has fabric
			const shell = this.layers.get('L0')?.view;
			for (const L of this.layers.values()) if ((L.layer.z ?? 0) < 0) L.view.setClip(shell?.cover ?? null);
			this.pending = null;
			this.evaluated = evaluated;
			this.g = this.layers.get('L0')?.g ?? null;
			this.straps.prepare(doc, evaluated, this.surf);
			this.updateCover(doc);
			for (const L of this.layers.values()) L.rims.build(L.g, doc, L.view.garmentCells, this.evaluated, layerLift(L.layer));
			this.straps.build(doc, this.fabricCover);
			this.geoSig = sig; this.trimSig = trimSig;
			this.timing.garment = { ...(this.g?.ms ?? {}), total: performance.now() - t0, warn: this.g?.arr.warn.length ?? 0 };
		} else {
			for (const v of this.views) v.applyMaterials(doc);
			if (trimSig !== this.trimSig) { this.trimSig = trimSig; for (const L of this.layers.values()) L.rims.build(L.g, doc, L.view.garmentCells, this.evaluated, layerLift(L.layer)); }
			this.syncStraps(doc);
		}
	}

	// Tension wrinkle zones on the reference body (shared by every panel material): the crotch,
	// folds fanning up the front, and each armpit, folds fanning over the side; an arm raised
	// pulls its armpit smooth.
	wrinkleZones() {
		if (!this.wrinkles) {
			const lm = surfaceLandmarks(this.body, this.surf), P = (k) => this.surf.pos(lm[k]);
			const c = P('crotch'), ul = P('underarm-l'), ur = P('underarm-r');
			this.wrinkles = {
				Z: [new THREE.Vector4(c.x, c.y + 0.015, c.z, 0.12), new THREE.Vector4(ul.x, ul.y - 0.01, 0.0, 0.08), new THREE.Vector4(ur.x, ur.y - 0.01, 0.0, 0.08)],
				N: [new THREE.Vector4(0, 0, 1, 1), new THREE.Vector4(1, 0, 0, 1), new THREE.Vector4(-1, 0, 0, 1)],
			};
		}
		return this.wrinkles;
	}
	setWrinklePose(pose) {
		const p = poseSpec(pose), W = this.wrinkleZones();
		// (a Daz pose's arms are not presets: its armpits keep their folds)
		W.N[1].w = p.left === 'up' ? 0.3 : 1; W.N[2].w = p.right === 'up' ? 0.3 : 1;
		if (this.fitted?.active) for (const n of W.N) n.w = 0; // a fitted garment's folds come from its fit
	}

	// Logos and lettering: every layer's views get that layer's decal atlas and boxes.
	syncDecals(doc) {
		if (!this.decals) { this.decals = new DecalSet(); this.decals.onChange = () => this.app && this.syncDecals(this.app.doc); }
		this.decals.build(doc, this.surf);
		for (const [id, L] of this.layers) L.view.setDecals(this.decals.forLayer(id));
	}

	// Straps alone changed (or the garment did): new grids, cover (they bridge hollows like fabric), meshes.
	syncStraps(doc) {
		this.straps.prepare(doc, this.evaluated, this.surf);
		this.updateCover(doc);
		this.straps.build(doc, this.fabricCover);
	}

	// The fabric lift solve sees every layer's fabric (and strap footprints, via coverHooks); it
	// only re-runs when where-fabric-is changes, then every layer re-reads the lifted surface.
	updateCover(doc) {
		const V = this.body.vertices, cover = new Float32Array(V).fill(-1);
		for (const L of this.layers.values()) { const c = L.view.cover; if (c) for (let i = 0; i < V; i++) if (c[i] > 0) cover[i] = 1; }
		this.fabricCover = Float32Array.from(cover); // fabric only (straps lie on it or on skin)
		for (const fn of this.coverHooks ?? []) fn(cover, doc);
		if (!this.cover || !sameSign(this.cover, cover)) {
			this.cover = cover;
			this.body.setCover(cover);
			for (const v of this.views) v.refresh();
		}
	}

	// Mannequin finishes: the body's (or the realistic skin, drawn by the figure; the caps and the
	// dress form then take the plain skin tone) and the mannequin head's. colour ('#rrggbb', the
	// body's colour) recolours the mannequin finishes, not the realistic skin.
	applyFinish(name, headName = name, colour) {
		const real = name === REALISTIC_SKIN;
		const tint = (f) => (colour && !real ? { ...f, colour } : f);
		const f = tint(MANNEQUIN_FINISHES[real ? 'Skin tone' : name] ?? MANNEQUIN_FINISHES['Matte white fibreglass']);
		const hf = MANNEQUIN_FINISHES[headName] ? tint(MANNEQUIN_FINISHES[headName]) : f;
		setFinish(this.skin, f); setFinish(this.headSkin, hf);
		this.figure.setLook(hf); // the mannequin head's hair (head part 'hair')
		const cm = this.capMaterial;
		finishSurface(cm, f);
		cm.needsUpdate = true;
	}

	// The garment sliding over a posed body (body/slide.js): on/off and { shrink, grip }; re-solves
	// where the fabric sits on the body shown and rebuilds everything that sits on it.
	// lift: { taut, max, reach }, how the fabric bridges hollows (Man.computeLift).
	setSlide(on, opt, lift) {
		const b = this.body;
		b.slide = on; b.slideOpt = { ...b.slideOpt, ...opt };
		if (lift) b.liftOpt = { ...b.liftOpt, ...lift };
		if (!this.app || !b.key) return;
		b.key = null;
		this.applyBody(this.app.doc.body, true, false);
	}

	// Which body, pose, head and expression, full figure or dress form, its finish, its stand.
	// wait: false applies at once, without waiting for the person's files (see below)
	applyBody(b, force, wait = true) {
		const head = b.head ?? 'mannequin', pose = b.pose ?? 'a-pose', poseKey = JSON.stringify(pose);
		const key = JSON.stringify([b.size, b.form, head, pose, b.finish === REALISTIC_SKIN]);
		// what the figure draws: its head (a person's), its skin below the head (realistic skin), or both
		const torso = b.form === 'torso', person = head === 'person' && !torso, real = b.finish === REALISTIC_SKIN && !torso;
		// (or, on the mannequin head, its eyeballs and hair in the head's finish)
		const sculpt = !torso && !real && head === 'mannequin';
		const part = person && real ? 'all' : person ? 'head' : real ? 'body' : sculpt ? (b.mannequinHair ? 'hair' : 'eyes') : null;
		// A new body or pose with the person on show first waits for the person's files: then the
		// body, the garment and the person change in the same frame. (The garment used to move at
		// once while the person stood in the old pose for a second or two, bare where the leotard was.)
		const entry = this.body.bodies[b.size], fig = [entry, poseSpec(pose).daz ?? 'a-pose', b.expression];
		// (Not the first body: there is nothing on show to keep.)
		if (wait && part && entry && this.bodyKey !== null && (force || key !== this.bodyKey) && !this.figure.ready(...fig)) {
			const want = this.pendingBody = b, go = (ok) => {
				if (this.pendingBody === want) { this.pendingBody = null; this.applyBody(want, force, ok); }
				return this.figureReady;
			};
			this.figureReady = this.figure.prefetch(...fig).then(() => go(true), (e) => { console.error('figure', e); return go(false); });
			return;
		}
		this.pendingBody = null;
		this.applyFinish(b.finish, b.headFinish, b.colour);
		const figure = () => (this.figureReady = this.figure.show(part ? {
			man: this.body, body: this.body.body, cage: this.body.cage, poseKey: this.body.body.daz ?? 'a-pose', shape: this.body.key + '|' + this.body.poseKey,
			expression: b.expression, hair: b.hair, part, keep: this.body.keep, cut: this.body.formKind + '|' + this.body.head,
		} : null));
		// an expression, a hair or a skin tone only changes the person
		if (!force && key === this.bodyKey) { figure(); return; }
		// a new size or form reframes the camera; a new pose, head or expression keeps it
		const shape = b.size + '|' + b.form, reframe = this.bodyKey !== null && this.shapeKey !== shape;
		this.bodyKey = key; this.shapeKey = shape;
		const t = performance.now(), body = this.body, scene = this.viewport.world;
		body.setCut(b.form, head); // before setBody: the mannequin head is shaped there
		if (body.key !== b.size || body.poseKey !== poseKey || !body.key || body.headKey !== body.head) body.setBody(b.size, pose);
		this.setWrinklePose(pose);
		body.clip = torso || body.headless;
		const fl = body.formLines;
		for (const m of this.fabricMaterials) {
			m.userData.u.uClip.value = body.clip ? 1 : 0;
			m.userData.u.uTapeY.value.set(fl.waist, fl.bust, fl.hip, fl.neck);
		}
		// the two skin pieces always clip: the body's cut, and each other's side of the head's border
		const K = body.keep, H = body.wHead, kb = this.skinMesh.userData.keep, kh = this.headMesh.userData.keep;
		for (let i = 0; i < body.vertices; i++) { kb.array[i * 4] = Math.min(K[i], 0.5 - H[i]); kh.array[i * 4] = Math.min(K[i], H[i] - 0.5); } // keep: aKeepForm.x
		kb.needsUpdate = kh.needsUpdate = true;
		for (const m of [this.skin, this.headSkin]) m.userData.u.uClip.value = 1;
		if (this.stand) { scene.remove(this.stand); this.stand.traverse((o) => o.geometry?.dispose()); }
		// the person stands on their own; a Daz pose (leaps, kneeling) has no stand either
		const daz = !!body.body.daz;
		this.stand = torso ? dressFormStand(body, this.capMaterial) : new THREE.Group();
		if (!torso && body.headless) this.stand.add(cutCaps(body, this.capMaterial));
		if (!torso && !person && !daz) this.stand.add(fullBodyStand(body));
		scene.add(this.stand);
		this.shown = { skin: !real, head: !torso && head === 'mannequin', blob: !daz };
		this.applyHidden();
		// the closed lids (body.eyeCaps, after the body's triangles) only where no eyeballs are drawn
		this.headMesh.geometry.setDrawRange(0, sculpt ? body.idx.length : Infinity);
		figure();
		const s = torso ? 0.9 : 0.75, blob = this.viewport.blob;
		blob.scale.set(s, s, 1); blob.position.z = torso ? body.crotch.z : 0;
		this.timing.mannequin = performance.now() - t;
		if (this.legacyMode) this.legacy.onBodyChanged();
		else {
			for (const v of this.views) v.refresh();
			if (this.app) { this.drawOverlay(this.app.doc); for (const L of this.layers.values()) L.rims.build(L.g, this.app.doc, L.view.garmentCells, this.evaluated, layerLift(L.layer)); this.straps.build(this.app.doc, this.fabricCover); this.hardware.build(this.app.doc); this.stoneView.build(); }
		}
		if (reframe) this.frameCamera(b.form);
	}

	// The mannequin hidden (the view bar's switch, ui/state.js hideMannequin; not part of the
	// design): the leotard floats in the studio, drawn from inside too (GarmentView.setDoubleSided),
	// with no stand, cut caps or contact shadow under it. The key's shadow on the floor stays.
	setBodyHidden(v) {
		this.bodyHidden = !!v;
		this.applyHidden();
		for (const L of this.layers.values()) L.view.setDoubleSided(this.bodyHidden);
	}
	flashPanel(id) { for (const L of this.layers.values()) L.view.flash(id); }
	// Glow on just the cell under a surface point (one side of a paired piece). -> false if none.
	flashCell(sp, layer = 'L0') {
		const g = this.layers.get(layer)?.g;
		if (!g) return false;
		const arr = g.arr, t = locate(arr, this.surf, sp);
		if (t < 0) return false;
		this.overlay.flashCell(this.cellSps(arr, arr.cellOf[t]));
		return true;
	}
	// A cell as surface points, three per triangle.
	cellSps(arr, cell) {
		const sps = [];
		for (const tri of arr.cells[cell].tris) {
			const f = arr.triFace[tri];
			for (let k = 0; k < 3; k++) { const b = baryOfVertexInFace(arr, this.surf, arr.tris[tri * 3 + k], f); sps.push({ f, b0: b[0], b1: b[1], b2: b[2] }); }
		}
		return sps;
	}
	applyHidden() {
		const s = this.shown ?? { skin: true, head: false, blob: true }, h = !!this.bodyHidden;
		this.skinMesh.visible = s.skin && !h;
		this.headMesh.visible = s.head && !h;
		if (this.stand) this.stand.visible = !h;
		this.viewport.blob.visible = s.blob && !h;
	}

	// Fit the leotard area (mid-thigh to the top of the head, or the whole dress form) in view,
	// keeping the current orbit direction. A Daz pose (leaps, kneeling) is framed whole.
	frameCamera(form = 'full') {
		const body = this.body, b = body.body, torso = form === 'torso', cam = this.viewport.camera, controls = this.viewport.controls;
		const bb = body.geometry.boundingBox;
		let top = torso ? b.landmarks.neck_base[1] + 0.09 : bb.max.y + 0.03;
		let bottom = torso ? body.crotch.y - 0.2 : body.crotch.y - 0.33;
		if (b.daz && !torso) { top = bb.max.y + 0.03; bottom = bb.min.y - 0.03; }
		const span = top - bottom, centre = new THREE.Vector3(b.daz ? (bb.min.x + bb.max.x) / 2 : 0, (top + bottom) / 2, b.daz ? (bb.min.z + bb.max.z) / 2 : 0);
		const fov = THREE.MathUtils.degToRad(cam.fov), fit = Math.max(span, (b.daz ? bb.max.x - bb.min.x : span * 0.62) / cam.aspect);
		const dist = fit / 2 / Math.tan(fov / 2) * 1.12;
		const dir = cam.position.clone().sub(controls.target).normalize();
		controls.target.copy(centre);
		cam.position.copy(centre).addScaledVector(dir, dist);
	}
}

// A mannequin finish (render/presets.js) on a skin piece's material.
function setFinish(m, f) {
	const u = m.userData.u;
	finishSurface(m, f);
	u.uKnit.value = f.knit ?? 0;
	u.uTape.value = f.tape ? 1 : 0;
	u.uSkin.value = f.skin ?? 0;
	markSkin(m, !!f.skin); // the athlete-skin finishes take the subsurface scattering pass
	m.needsUpdate = true;
}

// Extra height of a layer's finishes above the shell's (overlays sit 0.9 mm per step higher).
function layerLift(layer) { const z = layer?.z ?? 0; return z > 0 ? 0.0009 * z : 0; }

// --- stones --------------------------------------------------------------------------------------

// A panel as flat cloth (stones/cloth.js): its own piece (the one its seed lies in), or that it is still
// being flattened. paired: its other cell is the mirror image, carried by the same record.
Engine.prototype.clothOf = function (panelId) {
	const p = this.app.doc.panels.find((x) => x.id === panelId), L = p && this.layers.get(p.layer ?? 'L0');
	if (!L?.g) return null;
	// a fitted garment on show: its own piece of that panel's name (stones/fitted-cloth.js)
	if (this.fitted?.active) { const piece = this.fitted.clothFor(panelId); return piece ? { piece, pending: false, paired: piece.paired } : null; }
	const seeds = L.g.seeds.filter((s) => s.panel === panelId && s.cell >= 0), rec = seeds.length ? L.view.cells.find((c) => c.cell === seeds[0].cell && c.panelId === panelId) : null;
	if (!rec) return null;
	if (!rec.hasUV) return { piece: null, pending: true };
	rec.cloth ??= new ClothPiece(L.g.arr, this.surf, rec.cell, rec.piece, rec.uv);
	return { piece: rec.cloth, pending: false, paired: seeds.length > 1 && seeds[1].cell !== seeds[0].cell && L.view.cells.some((c) => c.cell === seeds[1].cell && c.panelId === panelId) };
};

// One cell of a layer as flat cloth (the flat view's stones and pattern handles: ui/FlatView.jsx), cached on its record as clothOf
// caches it; null until the cell is flattened.
Engine.prototype.clothOfCell = function (layerId, cell, panelId) {
	const L = this.layers.get(layerId ?? 'L0'), rec = L?.view.cells.find((c) => c.cell === cell && c.panelId === panelId);
	if (!rec?.hasUV || !L.g) return null;
	return (rec.cloth ??= new ClothPiece(L.g.arr, this.surf, rec.cell, rec.piece, rec.uv));
};

// touched: the sections a change touched (null: anything may have). Placement reads the stones, the
// lines, where the panels are (not their fabric or colour), the straps, trims and layers, all on the
// reference surface (no pose). What those last ones build is kept until one of them changes; a group
// runs again only when its own record changes (stones/generators.js runStones).
Engine.prototype.syncStones = function (doc, touched = null) {
	if (!this.g) return;
	if (!touched || !this.stoneGeo || touched.has('curves') || touched.has('panels') || touched.has('straps') || touched.has('trims') || touched.has('layers')) {
		const geo = JSON.stringify([doc.curves, doc.panels.map((p) => [p.id, p.seed, p.removed, p.mirror, p.layer]), doc.straps, doc.trims, doc.layers]);
		if (geo !== this.stoneGeo) {
			this.stoneGeo = geo; this.stoneGeoRev++;
			this.stoneEdge = this.edgeKeepOut(doc);
		}
	}
	const t0 = performance.now();
	const layerZ = new Map(doc.layers.map((l) => [l.id, l.z ?? 0])), edge = this.stoneEdge;
	const ctx = this.stoneCtx ??= {
		surf: this.surf, man: this.body, landmarks: this.app?.store.ctx.landmarks, // man: point specs such as { front: [x, y] }
		garment: (layer = 'L0') => this.layers.get(layer)?.g ?? this.g,
		strapHeight: (s) => 0.0009 + 0.0013 * (s.layer ?? 0) + 0.0019 * Math.min(s.width / 0.01, 1.4),
		cloth: (id) => this.clothOf(id), pending: this.stonePending, patternCache: this.patternCache,
		packs: true, // patterns are placed on the GPU (stones/gpu-view.js), their records made when asked for
		peaks: true, // a pattern's stones kept apart by the parallel rule (stones/peaks.js): the look (owner, 2026-11-04)
		mirrorFit: (fit) => this.fitted.mirrorFit(fit),
		// on fabric (any layer's panel that is not cut out) and clear of finished opening edges
		isFabric: (sp, p, size, keepOut) => {
			const d = ctx.doc;
			let on = false;
			for (const L of this.layers.values()) {
				const t = locate(L.g.arr, this.surf, sp);
				if (t < 0) continue;
				const pi = L.g.cellPanel[L.g.arr.cellOf[t]];
				if (pi >= 0 && !d.panels[pi].removed) { on = true; break; }
			}
			return on && ctx.edge(p, keepOut) > size / 2;
		},
	};
	// a fitted garment's own openings keep stones off its elastic, not the drawn pieces'
	ctx.doc = doc; ctx.evaluated = this.evaluated; ctx.edge = this.fitted?.active ? this.fitted.edgeKeepOut() : edge; ctx.geoRev = this.stoneGeoRev;
	ctx.placedSame = !!touched && !touched.has('placed');
	// on the WebGPU view a pattern is kept by the GPU (stones/gpu-keep.js): moving, turning, thinning it costs the CPU nothing a stone
	ctx.gpuKeep = gpuKeepOn(this.stoneView.renderer);
	const was = this.stoneRun;
	this.stoneRun = runStones(doc, ctx, this.stoneCache);
	if (this.stoneRun === was) return;
	const run = this.stoneRun;
	this.stoneView.set(run.records ?? run.stones, (s) => (s.layer ? 0.0009 * Math.max(layerZ.get(s.layer) ?? 0, 0) : 0), run.packs ?? [], run.records ? run : null);
	this.timing.stones = { ms: performance.now() - t0, count: run.count ?? run.stones.length, dropped: run.dropped, errors: run.errors };
};

// Distance from a reference position to the nearest finished opening edge, minus that edge's
// keep-out (elastic 1 cm + 1.5 mm, binding 8 mm + 1.5 mm, raw 2 mm): stones stay off the elastic.
Engine.prototype.edgeKeepOut = function (doc) {
	const L0 = this.layers.get('L0');
	const loops = L0?.rims?.loops ?? [];
	const arr = this.g.arr, VP = arr.VP, cell = 0.02, grid = new Map();
	const keyOf = (i, j, k) => (i + 512) * 1048576 + (j + 512) * 1024 + (k + 512);
	for (const loop of loops) {
		let keep = TRIMS.elastic.width + 0.0015;
		const main = loop.curves.find(Boolean)?.replace(/~m$/, '');
		const t = main && doc.trims.find((x) => x.on.includes(main));
		if (t) keep = t.kind === 'none' ? 0.002 : TRIMS[t.kind] ? (t.width ?? TRIMS[t.kind].width) + 0.0015 : keep;
		for (const v of loop.verts) {
			const x = VP[v * 3], y = VP[v * 3 + 1], z = VP[v * 3 + 2], k = keyOf(Math.floor(x / cell), Math.floor(y / cell), Math.floor(z / cell));
			let l = grid.get(k);
			if (!l) grid.set(k, l = []);
			l.push(x, y, z, keep);
		}
	}
	// override: a generator's own keep-out (metres) instead of the edge finish's
	return (p, override) => {
		let best = Infinity;
		const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell), cz = Math.floor(p.z / cell);
		for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
			const l = grid.get(keyOf(cx + i, cy + j, cz + k));
			if (!l) continue;
			for (let q = 0; q < l.length; q += 4) {
				const d = Math.hypot(p.x - l[q], p.y - l[q + 1], p.z - l[q + 2]) - (override ?? l[q + 3]);
				if (d < best) best = d;
			}
		}
		return best;
	};
};
