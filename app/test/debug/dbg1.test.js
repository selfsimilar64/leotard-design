import { it } from 'vitest';
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { Surface, toSP } from '../../src/body/surface.js';
import { evaluateCurve } from '../../src/curves/evaluate.js';
import { buildArrangement } from '../../src/garment/arrangement.js';
const R = 0.1;
const g = mergeVertices(new THREE.IcosahedronGeometry(R, 20).deleteAttribute('normal').deleteAttribute('uv'));
const S = new Surface(g.index.array, g.attributes.position.array);
const at = (x, y, z) => toSP(S.closest(new THREE.Vector3(x, y, z).normalize().multiplyScalar(R)));
const ring = (id, axis, n = 12, tilt = 0) => {
	const dirs = [];
	for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); dirs.push(axis === 'y' ? [c, tilt, s] : axis === 'x' ? [tilt, c, s] : [c, s, tilt]); }
	const e = evaluateCurve({ id, closed: true, points: dirs.map((d) => ({ sp: at(...d) })) }, S);
	return { id, sps: e.sps, closed: true };
};
it('dbg', () => {
	const arr = buildArrangement(S, [ring('a', 'y'), ring('b', 'x')]);
	const seen = new Map();
	for (let t = 0; t < arr.tris.length / 3; t++) for (let e = 0; e < 3; e++) {
		const a = arr.tris[t * 3 + e], b = arr.tris[t * 3 + (e + 1) % 3], k = a + '_' + b;
		if (seen.has(k)) {
			const t2 = seen.get(k);
			console.log('dup', k, 'tri', t, 'face', arr.triFace[t], [...arr.tris.slice(t * 3, t * 3 + 3)], 'tri', t2, 'face', arr.triFace[t2], [...arr.tris.slice(t2 * 3, t2 * 3 + 3)]);
			const f = arr.triFace[t];
			const list = arr.faceTris.get(f);
			console.log('face', f, 'tris', list?.map((x) => [...arr.tris.slice(x * 3, x * 3 + 3)]));
			for (const v of [a, b]) if (v >= S.V) { const kk = v - S.V; console.log('v', v, 'host', arr.hostF[kk], [...arr.hostB.slice(kk * 3, kk * 3 + 3)]); }
			console.log('segs in face', arr.segments.filter((s) => (s.a === a || s.a === b || s.b === a || s.b === b)));
			break;
		}
		seen.set(k, t);
	}
	console.log('warn', arr.warn, 'cells', arr.cells.length);
});
