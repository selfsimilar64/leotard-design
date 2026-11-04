// The fabric's own per-vertex inputs, packed four to an attribute. With three.js's own (position, normal, tangent, uv) a
// fabric program must stay within 16 vertex attributes (WebGL on the GTX 1650 here, and WebGPU's default limit); thirteen
// separate ones put shiny (anisotropy and a scan normal map) over it: "Too many attributes (aSeam)", nothing drawn
// (2026-11-04). Packed: 8, so 12 in all.
// Twins, kept in step by test/fabric-attributes.test.js: materials/fabric.js PARS_VERTEX and BEGIN_VERTEX read these names,
// sizes and slots; render/highlight.js maskMaterial reads keep. Written by every geometry drawn with a fabric material:
// body/mannequin.js (from its own unpacked arrays: aCover, aAO, aZone, keep, form stay plain for the CPU solvers),
// render/engine.js (the skin pieces' own keep), render/garment.js, render/fitted.js, render/straps.js, garment/trim.js,
// materials/swatches.js, dev/drape-eval.js, dev/wrap-eval.js.
import * as THREE from 'three';

export const FABRIC_ATTRIBUTES = { aCoverZone: 4, aKeepForm: 4, aFold: 4, aLift: 3, aGNormal: 3, aRef: 3, aUV: 2, aRim: 2 };

// The channels inside the packed attributes: [attribute, first component, components].
//  cover: > 0 on fabric (a lining: the shell's cover); ao: ambient occlusion; zone: the garment-zone fields (body/mannequin.js);
//  keep: < 0 cut away (dress form, neck); form: the dress-form tape fields; grad: panels, 0..1 along the colour gradient;
//  fold: the fit's folds (twice-the-angle x, y and height, metres: pipeline/wrap_block.py); seam: panels, metres to the nearest seam.
export const FABRIC_SLOTS = {
	cover: ['aCoverZone', 0, 1], ao: ['aCoverZone', 1, 1], zone: ['aCoverZone', 2, 2],
	keep: ['aKeepForm', 0, 1], form: ['aKeepForm', 1, 2], grad: ['aKeepForm', 3, 1],
	fold: ['aFold', 0, 3], seam: ['aFold', 3, 1],
};

// Every fabric attribute on a geometry of n vertices, zeroed.
export function addFabricAttributes(geo, n) {
	for (const [name, size] of Object.entries(FABRIC_ATTRIBUTES)) geo.setAttribute(name, new THREE.BufferAttribute(new Float32Array(n * size), size));
}

// Writes one channel (FABRIC_SLOTS) of a geometry's packed attribute from an array with that many components per vertex, or
// one number for every vertex. Adds the packed attribute, zeroed, if the geometry has none yet (a missing attribute reads as
// (0, 0, 0, 1) in the shader, so a missing seam would read 1, not 0). -> the attribute
export function setFabricSlot(geo, slot, src) {
	const [name, o, k] = FABRIC_SLOTS[slot], size = FABRIC_ATTRIBUTES[name];
	let A = geo.getAttribute(name);
	if (!A) geo.setAttribute(name, (A = new THREE.BufferAttribute(new Float32Array(geo.getAttribute('position').count * size), size)));
	const D = A.array, n = A.count;
	if (typeof src === 'number') { for (let i = 0; i < n; i++) for (let q = 0; q < k; q++) D[i * size + o + q] = src; }
	else for (let i = 0; i < n; i++) for (let q = 0; q < k; q++) D[i * size + o + q] = src[i * k + q];
	A.needsUpdate = true;
	return A;
}
