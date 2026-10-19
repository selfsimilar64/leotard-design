import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { Surface, toSP } from '../src/body/surface.js';
import { evaluateCurve } from '../src/curves/evaluate.js';
import { buildArrangement, locate, vertexPos } from '../src/garment/arrangement.js';

// Closed test surface: an icosphere of radius R with ~5 mm edges, like the body mesh.
const R = 0.1;
function sphere(detail = 20) {
	const g = mergeVertices(new THREE.IcosahedronGeometry(R, detail).deleteAttribute('normal').deleteAttribute('uv'));
	return new Surface(g.index.array, g.attributes.position.array);
}
const S = sphere();
const at = (x, y, z) => { const p = new THREE.Vector3(x, y, z).normalize().multiplyScalar(R); return toSP(S.closest(p)); };
// a curve through points given as directions
const curve = (id, dirs, closed = false, extra = {}) => {
	const c = { id, closed, points: dirs.map((d) => ({ sp: at(...d), kind: 'smooth' })), ...extra };
	const e = evaluateCurve(c, S);
	return { id, sps: e.sps, closed: e.closed, eval: e };
};
const ring = (id, axis, n = 12, tilt = 0) => {
	const dirs = [];
	for (let i = 0; i < n; i++) {
		const a = (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
		dirs.push(axis === 'y' ? [c, tilt, s] : axis === 'x' ? [tilt, c, s] : [c, s, tilt]);
	}
	return curve(id, dirs, true);
};

function checkMesh(arr) {
	// closed 2-manifold: every edge used by exactly two triangles, consistently oriented
	const edges = new Map();
	for (let t = 0; t < arr.tris.length / 3; t++) for (let e = 0; e < 3; e++) {
		const a = arr.tris[t * 3 + e], b = arr.tris[t * 3 + (e + 1) % 3];
		const k = a + '_' + b;
		expect(edges.has(k), `directed edge ${k} used twice`).toBe(false);
		edges.set(k, t);
	}
	for (const k of edges.keys()) { const [a, b] = k.split('_'); expect(edges.has(b + '_' + a), `edge ${k} has no twin`).toBe(true); }
	// area preserved
	let area = 0;
	const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
	for (let t = 0; t < arr.tris.length / 3; t++) {
		vertexPos(S, arr.tris[t * 3], arr.hostF, arr.hostB, A); vertexPos(S, arr.tris[t * 3 + 1], arr.hostF, arr.hostB, B); vertexPos(S, arr.tris[t * 3 + 2], arr.hostF, arr.hostB, C);
		const a = B.sub(A).cross(C.sub(A)).length() / 2;
		expect(a).toBeGreaterThanOrEqual(0);
		area += a;
	}
	let area0 = 0;
	for (let f = 0; f < S.F; f++) { const [a, b, c] = S.corners(f); area0 += b.clone().sub(a).cross(c.clone().sub(a)).length() / 2; }
	expect(area).toBeCloseTo(area0, 8);
	expect(arr.warn).toEqual([]);
}

describe('arrangement', () => {
	it('no curves: the mesh is one cell', () => {
		const arr = buildArrangement(S, []);
		expect(arr.cells.length).toBe(1);
		expect(arr.tris.length).toBe(S.idx.length);
		checkMesh(arr);
	});
	it('a closed ring splits the sphere in two', () => {
		const arr = buildArrangement(S, [ring('eq', 'y', 12, 0.3)]);
		checkMesh(arr);
		expect(arr.cells.length).toBe(2);
		const top = arr.cellOf[locate(arr, S, S.closest(new THREE.Vector3(0, R, 0)))];
		const bot = arr.cellOf[locate(arr, S, S.closest(new THREE.Vector3(0, -R, 0)))];
		expect(top).not.toBe(bot);
	});
	it('two crossing rings make four cells', () => {
		const arr = buildArrangement(S, [ring('a', 'y'), ring('b', 'x')]);
		checkMesh(arr);
		expect(arr.cells.length).toBe(4);
	});
	it('three rings in general position make eight cells', () => {
		const arr = buildArrangement(S, [ring('a', 'y', 16, 0.05), ring('b', 'x', 16, -0.07), ring('c', 'z', 16, 0.11)]);
		checkMesh(arr);
		expect(arr.cells.length).toBe(8);
	});
	it('a chord ending on a ring adds a cell; a dangling line adds none', () => {
		const eq = ring('eq', 'y');
		// chord over the top from one side of the ring to the other, ending exactly on ring samples
		const s0 = eq.sps[0], s1 = eq.sps[Math.floor(eq.sps.length / 2)];
		const chord = { id: 'ch', closed: false, points: [{ sp: toSP(s0) }, { sp: at(0, 1, 0.2) }, { sp: toSP(s1) }] };
		const e = evaluateCurve(chord, S);
		const dangling = curve('dg', [[0.3, -1, 0.2], [0.5, -1, -0.3]]);
		const arr = buildArrangement(S, [eq, { id: 'ch', sps: e.sps, closed: false }, dangling]);
		checkMesh(arr);
		expect(arr.cells.length).toBe(3);
		expect(arr.loose.length).toBeGreaterThan(0);
	});
	it('coincident curves (a mirrored copy on top of the original) behave as one', () => {
		const a = ring('a', 'y', 12, 0.2), b = ring('b', 'y', 12, 0.2);
		const arr = buildArrangement(S, [a, b]);
		checkMesh(arr);
		expect(arr.cells.length).toBe(2);
	});
	it('a curve through mesh vertices still cuts cleanly', () => {
		// control points exactly on the mesh vertices nearest a tilted ring
		const vs = Array.from({ length: 12 }, (_, i) => {
			const d = new THREE.Vector3(Math.cos(i / 12 * 6.283), 0.15, Math.sin(i / 12 * 6.283)).normalize().multiplyScalar(R);
			let best = 0, bd = Infinity;
			for (let v = 0; v < S.V; v++) { const q = S.vertex(v).distanceTo(d); if (q < bd) { bd = q; best = v; } }
			return best;
		});
		const c = { id: 'v', closed: true, points: vs.map((v) => { const p = S.vertex(v); return { sp: toSP(S.closest(p)) }; }) };
		const e = evaluateCurve(c, S);
		const arr = buildArrangement(S, [{ id: 'v', sps: e.sps, closed: true }]);
		checkMesh(arr);
		expect(arr.cells.length).toBe(2);
	});
	it('a zigzag ring cuts with every tooth', () => {
		const c = { id: 'z', closed: true, points: Array.from({ length: 12 }, (_, i) => ({ sp: at(Math.cos(i / 12 * 6.283), 0.1, Math.sin(i / 12 * 6.283)) })), shape: { mod: 'zigzag', amp: 0.002, period: 0.008 } };
		const e = evaluateCurve(c, S);
		const arr = buildArrangement(S, [{ id: 'z', sps: e.sps, closed: true }]);
		checkMesh(arr);
		expect(arr.cells.length).toBe(2);
		// the cut is longer than the plain ring (the teeth are really there)
		expect(e.length).toBeGreaterThan(2 * Math.PI * R * 0.99 * 1.15);
	});
	it('runs fast enough to re-cut on release', () => {
		const curves = [ring('a', 'y', 16, 0.05), ring('b', 'x', 16, -0.07), ring('c', 'z', 16, 0.11), ring('d', 'y', 16, 0.5), ring('e', 'y', 16, -0.5)];
		const arr = buildArrangement(S, curves);
		checkMesh(arr);
		expect(arr.ms).toBeLessThan(400);
	});
});
