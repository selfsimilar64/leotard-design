// Every fabric the app offers, compiled in the background once the start is done, so a fabric picked later draws at
// once instead of compiling then (render/viewport.js prepare: a variant of the fabric shader is 4-10 s on a cold
// shader cache, knowledge/engineering/app/startup-and-slow-changes.md). The browser keeps compiled shaders on disk, so
// on a warm cache this pass takes well under a second; a cold one (the first start after the fabric shader or the
// browser changed) takes about a minute, out of the way.
//
// A shader variant depends on the fabric's features (sheen, clearcoat, anisotropy, iridescence, sheer, satin's
// switches: materials/fabric.js applyFabric), on the mesh it is drawn on (its geometry's attributes, its side, whether it
// takes shadows) and on the scene (the studio's environment and lights, the shadow setting). So: one host per kind of
// fabric mesh on show (a piece, an edge, a strap), every fabric applied to a copy of its material, each compiled as the
// scene pass draws (into its target, as prepare does), one at a time so a compile the designer is waiting for is never
// queued behind a dozen. Fabrics that share a variant share three's program: only new variants cost anything. The
// materials are kept, which keeps their programs in three's cache: a piece switched to that fabric reuses one. Run again
// after a studio change (main.jsx): its lighting makes new variants.
import * as THREE from 'three';
import { createFabricMaterial, applyFabric, FABRICS } from '../materials/fabric.js';

const SKIP = new Set(['checker']); // the UV checker, a debug fabric
const SKIN = 3; // createFabricMaterial's zone for the body's own skin, which is not a fabric
let warm = [], run = 0;

// onProgress({ done, total, waiting }): waiting is true while a new variant compiles. -> a Promise, resolved when every
// variant is ready (or a newer run took over).
export async function prewarmFabrics(engine, onProgress = () => {}) {
	const v = engine.viewport, r = v.renderer, me = ++run;
	if (v.webgpu || !v.scenePass?.target) return;
	const hosts = new Map();
	v.scene.traverseVisible((o) => {
		const u = o.material?.userData?.u;
		if (!o.isMesh || Array.isArray(o.material) || !u?.uZone || u.uZone.value === SKIN) return;
		const key = [u.uZone.value, o.material.side, Object.keys(o.geometry.attributes).sort().join()].join('|');
		if (!hosts.has(key)) hosts.set(key, o);
	});
	const held = [], jobs = [];
	for (const host of hosts.values()) for (const key of Object.keys(FABRICS)) if (!SKIP.has(key)) jobs.push([host, key]);
	let done = 0;
	for (const [host, key] of jobs) {
		if (me !== run) break; // a newer run (a studio change) has taken over
		while (v.compiling) await v.compiling; // what the designer is waiting for goes first
		const m = createFabricMaterial(host.material.userData.u.uZone.value);
		m.side = host.material.side;
		applyFabric(m, key, '#808080', 'Tone-on-tone');
		const mesh = new THREE.Mesh(host.geometry, m);
		mesh.castShadow = mesh.receiveShadow = !m.transparent; // as render/garment.js applyMaterials sets a piece's
		r.setRenderTarget(v.scenePass.target);
		r.compile(mesh, v.camera, v.scene);
		r.setRenderTarget(null);
		held.push(m);
		const program = r.properties.get(m).currentProgram;
		if (program && !program.isReady()) {
			onProgress({ done, total: jobs.length, waiting: true });
			while (!program.isReady()) await new Promise((res) => setTimeout(res, 50));
		}
		onProgress({ done: ++done, total: jobs.length, waiting: false });
		await new Promise((res) => setTimeout(res, 0)); // (a breath for the page between compiles)
	}
	// the last run's variants (the last studio's) are released once this one's are held; a run overtaken releases its own
	if (me !== run) { for (const m of held) m.dispose(); return; }
	for (const m of warm) m.dispose();
	warm = held;
}
