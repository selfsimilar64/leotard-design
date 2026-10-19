// Debug views: every arrangement cell in its own colour (garment and openings alike).
import * as THREE from 'three';
import { vertexPos } from '../garment/arrangement.js';

export function showCells(engine, on = true) {
	const scene = engine.viewport.world;
	if (engine._cellDebug) { scene.remove(engine._cellDebug); engine._cellDebug.traverse((o) => o.geometry?.dispose()); engine._cellDebug = null; }
	if (!on || !engine.g) return null;
	const arr = engine.g.arr, man = engine.body, G = man.garmentPos, N = man.aGNormal.array, idx = man.idx, V = man.vertices;
	const pos = new Float32Array(arr.tris.length * 3), col = new Float32Array(arr.tris.length * 3);
	const c = new THREE.Color(), p = new THREE.Vector3();
	const place = (v) => {
		if (v < V) return p.set(G[v * 3] + N[v * 3] * 0.003, G[v * 3 + 1] + N[v * 3 + 1] * 0.003, G[v * 3 + 2] + N[v * 3 + 2] * 0.003);
		const k = v - V, f = arr.hostF[k];
		p.set(0, 0, 0);
		for (let j = 0; j < 3; j++) { const i = idx[f * 3 + j], w = arr.hostB[k * 3 + j]; p.x += w * (G[i * 3] + N[i * 3] * 0.003); p.y += w * (G[i * 3 + 1] + N[i * 3 + 1] * 0.003); p.z += w * (G[i * 3 + 2] + N[i * 3 + 2] * 0.003); }
		return p;
	};
	for (let t = 0; t < arr.tris.length / 3; t++) {
		c.setHSL((arr.cellOf[t] * 0.618) % 1, 0.75, 0.5);
		for (let k = 0; k < 3; k++) { place(arr.tris[t * 3 + k]).toArray(pos, (t * 3 + k) * 3); c.toArray(col, (t * 3 + k) * 3); }
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	g.setAttribute('color', new THREE.BufferAttribute(col, 3));
	g.computeVertexNormals();
	const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true }));
	mesh.frustumCulled = false;
	scene.add(mesh);
	engine._cellDebug = mesh;
	return arr.cells.map((cl) => ({ id: cl.id, tris: cl.tris.length, area: +cl.area.toFixed(4), hue: +((cl.id * 0.618) % 1).toFixed(3), panel: engine.g.cellPanel[cl.id] }));
}
