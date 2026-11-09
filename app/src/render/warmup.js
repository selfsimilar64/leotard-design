// Every shader the app can draw with, compiled at the start behind the curtain (main.jsx reveal), so nothing compiles
// once the designer is working: no new fabric, finish, crystal, effect or view ever waits for a shader (owner,
// 2026-11-09). The browser keeps compiled shaders on disk, so this is long only on the first start after a shader or the
// browser changed; on other starts each shader is set up again from that cache (~0.06-0.12 s a fabric variant since each
// fabric holds only its own code, 2026-11-09). knowledge/engineering/app/startup-and-slow-changes.md.
//
// What makes a variant (three's program key): a material's features (sheen, clearcoat, anisotropy, iridescence, sheer,
// the fabric's own effects: materials/fabric.js fabricDefines, the satin's switches, one side or both: fabricSide), the mesh's
// (instanced, vertex colours, tangents) and the scene's (lights,
// environment, shadows). The scene's are fixed: one kind of lighting (the photographed studios share one set; the softbox
// studios were removed for this), and shadows off draws no shadow without changing a shader (render/viewport.js
// applyDisplay). So each family here is compiled once, on a stand-in mesh carrying the attributes that matter.
// The shader tour (dev/shader-tour.js) is the check: a step of it that compiles means a case is missing here.
//
// Compiled into the scene pass's target, as Viewport.prepare does (a variant drawn into a target differs from one
// drawn to the screen); the GPU process compiles one at a time anyway.
//
// In two parts: the fabrics and the mannequin's finishes need only the studio's lighting, so they start as soon as it is
// lit, beside the bodies' loading and the design (warmEarly, from main.jsx start); the rest needs the engine and the
// design and follows (warmUp, from main.jsx reveal, which waits for the first part), one job at a time, each waited for.
import * as THREE from 'three';
import { createFabricMaterial, applyFabric, fabricSide, FABRICS } from '../materials/fabric.js';
import { TextureLibrary } from '../materials/textures.js';
import { MANNEQUIN_FINISHES } from './presets.js';
import { setFinish } from './engine.js';
import { finishSurface } from './figure.js';
import { MATS as HARDWARE } from './hardware.js';
import { STAND_MATERIALS } from './stand.js';
import { LineSegments2 } from './lines.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { placed, Atlas } from '../stones/gpu-view.js';
import { SHAPES } from '../stones/library.js';
import { GLARE_SIZE, GLARE_STRENGTH } from './glare.js';

const SKIP = new Set(['checker']); // the UV checker, a debug fabric
const SKIN = 3; // createFabricMaterial's zone of the mannequin's skin
// Scanned fabrics sit on Matte or Shiny (materials/textures.js baseFabricFor); a sheer scan makes that fabric sheer.
const SCAN_BASES = new Set(['matte', 'shiny']);
// What was compiled, kept: three keeps a program only while a material uses it, so the stand-ins stay, and a piece
// switched to that fabric later reuses the program at once.
const held = [];

// A stand-in mesh's geometry: one point with the standard attributes the real meshes have (the custom ones, aLift and
// the like, never change a shader). Tangents: a piece's anisotropic shine reads them.
function standIn() {
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
	g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 0, 1]), 3));
	g.setAttribute('tangent', new THREE.BufferAttribute(new Float32Array([1, 0, 0, 1]), 4));
	return g;
}

// A stand-in with positions only, as the overlay's meshes and lines are (a mesh without normals is another variant).
function bare() {
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
	return g;
}

// The jobs: [label, () => [Object3D, ...]] in the order they run; each builds what it compiles (and keeps nothing).
// The first part's: what needs only the lit studio (every fabric, the mannequin's finishes). opt.scans: whether there are
// scanned fabrics (known once the jobs run).
function earlyJobs(opt) {
	const out = [], g = standIn();
	const mesh = (m) => new THREE.Mesh(g, m);
	// every fabric, with its inside hidden (the mannequin shown) and shown (hidden: the leotard is drawn from inside too,
	// render/garment.js setDoubleSided), sides as materials/fabric.js fabricSide gives them: one program for an opaque fabric,
	// a see-through one's one-sided and two-sided; a sheer scan makes its base fabric sheer (materials/fabric.js applyTexture)
	for (const key of Object.keys(FABRICS)) {
		if (SKIP.has(key)) continue;
		out.push([`fabric ${key}`, () => (opt.scans && SCAN_BASES.has(key) ? [false, true] : [false]).flatMap((sheerScan) => {
			const make = (inside) => {
				const m = createFabricMaterial(5);
				applyFabric(m, key, '#808080', 'Tone-on-tone');
				if (sheerScan) { m.transparent = true; m.alphaToCoverage = false; m.depthWrite = true; }
				fabricSide(m, inside);
				return m;
			};
			const out = make(false), ins = make(true);
			return (ins.side === out.side ? [out] : [out, ins]).map(mesh);
		})]);
	}
	// the mannequin's finishes (its skin is the fabric shader, both sides: render/engine.js), and the caps of a cut body:
	// every finish a design can name, not only those the picker offers (saved designs carry the athlete skins, which
	// mark the skin for its scattering pass: render/postfx.js markSkin)
	for (const [name, f] of Object.entries(MANNEQUIN_FINISHES)) {
		out.push([`mannequin ${name}`, () => {
			const m = createFabricMaterial(SKIN);
			m.side = THREE.DoubleSide;
			setFinish(m, f);
			const cap = new THREE.MeshPhysicalMaterial();
			cap.side = THREE.DoubleSide; // (as render/stand.js cutCaps and neckCaps set the caps' material)
			finishSurface(cap, f);
			return [mesh(m), mesh(cap)];
		}]);
	}
	return out;
}

// The second part's: what needs the engine and the design.
function jobs(engine) {
	const v = engine.viewport, view = engine.stoneView, out = [], g = standIn();
	const mesh = (m) => new THREE.Mesh(g, m);
	// the scene as it is, hidden parts too (the studio room's dome, the floor that shows shadows, a stand, the overlays)
	out.push(['the scene', () => [v.scene]]);
	// the crystals, each family two ways: laid on the CPU (instanced: stones/view.js meshFor) and placed by the GPU from a
	// piece's atlas (stones/gpu-view.js PackView.side), with the atlas's own drawing
	const shapeOf = (fam) => Object.keys(SHAPES).find((k) => (SHAPES[k].family ?? 'crystal') === fam);
	for (const fam of ['crystal', ...Object.keys(view.mats)]) {
		const shape = shapeOf(fam);
		if (!shape) continue;
		out.push([`crystals ${fam}`, () => {
			const base = view.geometry(shape), mat = () => (fam === 'crystal' ? view.newCrystal() : view.mats[fam].clone());
			const ig = base.clone();
			ig.setAttribute('aFinish', new THREE.InstancedBufferAttribute(new Float32Array(4), 4));
			const im = new THREE.InstancedMesh(ig, fam === 'crystal' ? view.crystal : view.mats[fam], 1);
			im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(3), 3);
			const pg = new THREE.InstancedBufferGeometry();
			pg.index = base.index;
			for (const [n, a] of Object.entries(base.attributes)) pg.setAttribute(n, a);
			const atlas = new Atlas(v.renderer);
			const pm = new THREE.Mesh(pg, placed(mat(), { ...atlas.uniforms, uAspect: { value: SHAPES[shape]?.aspect ?? 1 } }));
			return [im, pm, atlas.mesh];
		}]);
	}
	// hardware, stands, lines and points (seams and edges, dashed guides), the overlay's own
	out.push(['hardware and stands', () => [...Object.values(HARDWARE), ...STAND_MATERIALS].map(mesh)]);
	out.push(['lines', () => {
		const lg = new LineSegmentsGeometry().setPositions([0, 0, 0, 0, 0, 1]);
		return [false, true].map((dashed) => new LineSegments2(lg, engine.overlay.material('#ffffff', 2, dashed)));
	}]);
	// what editing shows: the overlay tool's areas (render/overlay.js setRegions: colours with alpha), the mirror's centre
	// line and a flashed piece (overlay.js), the rings round hovered crystals (render/highlight.js setStones)
	out.push(['editing', () => {
		const rg = bare();
		rg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(4), 4));
		const ring = bare();
		ring.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(1), 1));
		ring.setAttribute('aStrong', new THREE.BufferAttribute(new Float32Array(1), 1));
		return [
			new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide })),
			new THREE.LineSegments(bare(), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })),
			new THREE.Mesh(bare(), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthTest: false, side: THREE.DoubleSide })),
			new THREE.Points(ring, engine.highlight.ringMat),
		];
	}]);
	return out;
}

// What the picture's effects compile when first drawn (glow, contact shadows, skin, crystal glare, a hovered part's
// outline: render/highlight.js): one frame drawn with all of them on, behind the curtain, then everything as it was.
function drawEffects(engine) {
	const v = engine.viewport, d = v.display, s = v.settings;
	let piece = null;
	for (const L of engine.layers.values()) piece ??= L.view.cells.find((c) => c.mesh)?.mesh;
	v.applyDisplay({ ...d, bloom: true, ao: true, skin: true });
	v.glare.setPreset('star', {});
	if (piece) engine.highlight.setParts([{ mesh: piece }]);
	v.render();
	if (piece) {
		// (a hovered part's outline material is made anew for each hover and freed after: one is kept, so its program stays)
		const scene = engine.highlight.pass.scene, kept = [...scene.children];
		scene.remove(...kept);
		held.push(...kept);
		engine.highlight.setParts([]);
	}
	v.glare.setPreset(s.glare ?? 'plain', { size: s.glareSize ?? GLARE_SIZE, strength: s.glareStrength ?? GLARE_STRENGTH });
	v.applyDisplay(d);
}

// How long a program may take to say it is ready before it is asked outright (isReady). One read from the browser's shader
// cache is ready in ~0.06-0.12 s.
const NUDGE_MS = 250;

// Whether a job's programs are ready. three asks KHR_parallel_shader_compile's
// COMPLETION_STATUS_KHR, which never waits; here (Chrome 152, ANGLE/D3D11) it kept answering "not yet" for ~2.46 s after a
// program had linked, on about half the warm starts, one program each time, a different one (measured 2026-11-09: the GPU
// process meanwhile answered another context's reads at once, and LINK_STATUS asked of the waiting program returned true at
// once, after which it read ready). So a program not ready after NUDGE_MS is asked LINK_STATUS, which waits for the link: on
// a genuine compile (the first start after an update) that holds the page for what is left of it, the curtain's motion
// being CSS and carrying on.
// -> whether every material's program is ready; nudge: those not yet are asked LINK_STATUS first.
function isReady(r, mats, nudge) {
	const gl = r.getContext();
	let all = true;
	for (const m of mats) {
		const p = r.properties.get(m).currentProgram;
		if (!p || p.isReady()) continue;
		if (nudge) gl.getProgramParameter(p.program, gl.LINK_STATUS);
		all &&= p.isReady();
	}
	return all;
}

const tick = () => new Promise((res) => setTimeout(res, 25));

// Starts compiling a job: its objects' materials into the scene pass's target, kept (held). -> the materials.
function compile(v, build) {
	const r = v.renderer, objects = build(), mats = new Set();
	r.setRenderTarget(v.scenePass.target);
	for (const o of objects) for (const m of r.compile(o, v.camera, v.scene)) mats.add(m);
	r.setRenderTarget(null);
	held.push(...objects.filter((o) => o !== v.scene));
	return mats;
}

// Waits for sent jobs (their materials, in the order sent, which is the order they compile in), asking outright (isReady's
// nudge) once they have had `after` ms; the page is let go between any that held it (a genuine compile). step() as jobs end.
async function settle(v, jobs, step, deadline, after = NUDGE_MS) {
	const t0 = performance.now();
	while (jobs.length && performance.now() < deadline) {
		const t = performance.now(), nudge = t - t0 >= after;
		while (jobs.length && isReady(v.renderer, jobs[0], nudge) && performance.now() - t < 50) { jobs.shift(); step(); }
		if (jobs.length) await tick();
	}
}

let early = null; // the first part, once started: { promise, done, total, step, want }

// The first part (earlyJobs), started as soon as the studio is lit (viewport.envReady), beside the bodies' loading: its
// lights and environment are what every fabric variant is compiled for, and the engine's showing the design's studio
// again changes neither (one kind of lighting, above).
// Every job is sent at once, not one after another: the GPU process compiles what it was sent in turn while the
// page builds the bodies, the engine and the design (one long task, which nothing could be sent beside). Nothing is asked
// of them until warmUp waits for them (want): every question is a round trip to the GPU process that holds the page, and a
// nudge (isReady) holds it for every compile queued ahead. Measured 2026-11-09 (B12, warm): sent 0.3 s of the page's time,
// ready before the design was in; the curtain lifted at 8.5-8.8 s, against 9.1-9.4 s sending them at once only after the
// design and ~10.4 s or more one job after another.
export function warmEarly(v, maxMs = 15 * 60 * 1000) {
	if (early || v.webgpu || !v.scenePass?.target) return;
	const deadline = performance.now() + maxMs, opt = { scans: false }, list = earlyJobs(opt);
	const e = early = { done: 0, total: list.length, step: () => {} };
	const wanted = new Promise((res) => { e.want = res; });
	e.promise = (async () => {
		const [scans] = await Promise.all([new TextureLibrary(v.renderer).list().catch(() => []), v.envReady]);
		opt.scans = scans.length > 0;
		performance.mark?.('warm-up: fabrics and finishes');
		const jobs = list.map(([, build]) => compile(v, build));
		await wanted;
		await settle(v, jobs, () => { e.done++; e.step(); }, deadline, 0); // (they have had the bodies' and the design's time)
	})().catch((err) => console.error('warm-up', err));
}

// The rest, once the design is in, after the first part (started here if it was not). onProgress({ done, total }) over
// both parts. -> a Promise, resolved when every shader is ready (or after maxMs, whatever is left).
export async function warmUp(engine, onProgress = () => {}, maxMs = 15 * 60 * 1000) {
	const v = engine.viewport, deadline = performance.now() + maxMs;
	if (v.webgpu || !v.scenePass?.target) return;
	warmEarly(v, maxMs);
	const list = jobs(engine), total = early.total + list.length + 1;
	let done = early.done;
	const step = () => onProgress({ done, total });
	early.step = () => { done = early.done; step(); };
	step();
	// sent at once too, queued behind the first part's (measured 2026-11-09, B12 warm: 0.9 s one job after another)
	performance.mark?.('warm-up: the rest');
	const sent = list.map(([, build]) => compile(v, build));
	early.want();
	await early.promise;
	performance.mark?.('warm-up: fabrics and finishes ready');
	done = early.total;
	await settle(v, sent, () => { done++; step(); }, deadline);
	performance.mark?.('warm-up: effects');
	drawEffects(engine);
	performance.mark?.('warm-up: done');
	onProgress({ done: total, total });
}
