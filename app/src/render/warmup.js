// Every shader the app can draw with, compiled at the start behind the curtain (main.jsx reveal), so nothing compiles
// once the designer is working: no new fabric, finish, crystal, effect or view ever waits for a shader (owner,
// 2026-11-09). The browser keeps compiled shaders on disk, so this is long only on the first start after a shader or the
// browser changed; on other starts each shader is set up again from that cache (~0.06-0.12 s a fabric variant since each
// fabric holds only its own code, 2026-11-09). knowledge/engineering/app/startup-and-slow-changes.md.
//
// What makes a variant (three's program key): a material's features (sheen, clearcoat, anisotropy, iridescence, sheer,
// the fabric's own effects: materials/fabric.js fabricDefines, the satin's switches, one side or both), the mesh's
// (instanced, vertex colours, tangents) and the scene's (lights,
// environment, shadows). The scene's are fixed: one kind of lighting (the photographed studios share one set; the softbox
// studios were removed for this), and shadows off draws no shadow without changing a shader (render/viewport.js
// applyDisplay). So each family here is compiled once, on a stand-in mesh carrying the attributes that matter.
// The shader tour (dev/shader-tour.js) is the check: a step of it that compiles means a case is missing here.
//
// Compiled into the scene pass's target, as Viewport.prepare does (a variant drawn into a target differs from one
// drawn to the screen), one at a time (the GPU process compiles one at a time anyway), each waited for before the next.
import * as THREE from 'three';
import { createFabricMaterial, applyFabric, FABRICS } from '../materials/fabric.js';
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
function jobs(engine, scans) {
	const v = engine.viewport, view = engine.stoneView, out = [], g = standIn();
	const mesh = (m) => new THREE.Mesh(g, m);
	// the scene as it is, hidden parts too (the studio room's dome, the floor that shows shadows, a stand, the overlays)
	out.push(['the scene', () => [v.scene]]);
	// every fabric, on one side (the mannequin shown) and on both (hidden: the leotard is drawn from inside too,
	// render/garment.js setDoubleSided); a sheer scan makes its base fabric sheer (materials/fabric.js applyTexture)
	for (const key of Object.keys(FABRICS)) {
		if (SKIP.has(key)) continue;
		out.push([`fabric ${key}`, () => [THREE.FrontSide, THREE.DoubleSide].flatMap((side) => {
			const make = (sheerScan) => {
				const m = createFabricMaterial(5);
				m.side = side;
				applyFabric(m, key, '#808080', 'Tone-on-tone');
				if (sheerScan) { m.transparent = true; m.alphaToCoverage = false; m.depthWrite = true; }
				return mesh(m);
			};
			return scans && SCAN_BASES.has(key) ? [make(false), make(true)] : [make(false)];
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

// onProgress({ done, total, label }). -> a Promise, resolved when every shader is ready (or after maxMs, whatever is left).
export async function warmUp(engine, onProgress = () => {}, maxMs = 15 * 60 * 1000) {
	const v = engine.viewport, r = v.renderer, cam = v.camera, t0 = performance.now();
	if (v.webgpu || !v.scenePass?.target) return;
	const list = jobs(engine, (await engine.textures?.list().catch(() => []))?.length > 0);
	let done = 0;
	for (const [label, build] of list) {
		onProgress({ done, total: list.length + 1, label });
		performance.mark?.('warm-up: ' + label); // (each job in the browser's performance timeline, as the curtain's steps)
		const objects = build(), mats = new Set();
		r.setRenderTarget(v.scenePass.target);
		for (const o of objects) for (const m of r.compile(o, cam, v.scene)) mats.add(m);
		r.setRenderTarget(null);
		const waiting = () => [...mats].some((m) => r.properties.get(m).currentProgram?.isReady() === false);
		while (waiting() && performance.now() - t0 < maxMs) await new Promise((res) => setTimeout(res, 25));
		held.push(...objects.filter((o) => o !== v.scene));
		done++;
	}
	onProgress({ done, total: list.length + 1, label: 'effects' });
	performance.mark?.('warm-up: effects');
	drawEffects(engine);
	performance.mark?.('warm-up: done');
	onProgress({ done: list.length + 1, total: list.length + 1, label: '' });
}
