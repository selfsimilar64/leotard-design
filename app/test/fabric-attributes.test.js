// The fabric's packed vertex inputs (materials/fabric-attributes.js) and the fabric shader that reads them
// (materials/fabric.js PARS_VERTEX, BEGIN_VERTEX) are twins: this keeps them in step.
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { FABRIC_ATTRIBUTES, FABRIC_SLOTS, addFabricAttributes, setFabricSlot } from '../src/materials/fabric-attributes.js';

const SRC = fs.readFileSync(path.resolve('src/materials/fabric.js'), 'utf8');
const block = (name) => SRC.slice(SRC.indexOf(`const ${name} = /* glsl */\``), SRC.indexOf('`;', SRC.indexOf(`const ${name} = /* glsl */\``)));
const SIZE = { float: 1, vec2: 2, vec3: 3, vec4: 4 };

describe('fabric vertex attributes', () => {
	it('the shader declares exactly the packed set, at its sizes, within 16 with three.js\'s own four', () => {
		const declared = Object.fromEntries([...block('PARS_VERTEX').matchAll(/^attribute (float|vec[234]) (\w+);/gm)].map((m) => [m[2], SIZE[m[1]]]));
		expect(declared).toEqual(FABRIC_ATTRIBUTES);
		expect(Object.keys(declared).length + 4).toBeLessThanOrEqual(16); // position, normal, tangent, uv
	});
	it('each varying reads its own slot', () => {
		const v = block('BEGIN_VERTEX'), sw = 'xyzw';
		const want = { vCover: 'cover', vZone: 'zone', vKeep: 'keep', vForm: 'form', vGrad: 'grad', vFold: 'fold', vSeam: 'seam' };
		for (const [varying, slot] of Object.entries(want)) {
			const [a, o, k] = FABRIC_SLOTS[slot];
			expect(v, varying).toContain(`${varying} = ${a}.${sw.slice(o, o + k)};`);
		}
		const [a, o] = FABRIC_SLOTS.ao;
		expect(v).toContain(`vAO = mix( ${a}.${sw[o]}, 1. - ( 1. - ${a}.${sw[o]} ) * .3, uGarment );`);
	});
	it('a slot is written without touching its neighbours', () => {
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
		addFabricAttributes(g, 3);
		setFabricSlot(g, 'zone', [1, 2, 3, 4, 5, 6]);
		setFabricSlot(g, 'cover', 7);
		setFabricSlot(g, 'ao', Float32Array.of(0.1, 0.2, 0.3));
		expect([...g.attributes.aCoverZone.array].map((x) => +x.toFixed(3))).toEqual([7, 0.1, 1, 2, 7, 0.2, 3, 4, 7, 0.3, 5, 6]);
		const h = new THREE.BufferGeometry();
		h.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
		setFabricSlot(h, 'seam', [0.5, 0.25]); // added when missing, zeroed
		expect([...h.attributes.aFold.array]).toEqual([0, 0, 0, 0.5, 0, 0, 0, 0.25]);
	});
});
