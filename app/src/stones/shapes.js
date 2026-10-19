// Stone geometry: faceted flat-back crystals for every outline (round, oval, navette, pear, drop,
// heart, square, baguette, triangle, star), half pearls, spangles, holographic dots and nailheads.
// Unit size: the outline spans 1 across (x) and `aspect` along (y); height along +z.
import * as THREE from 'three';
import { SHAPES } from './library.js';

// Outline of a shape as points (counter-clockwise), unit width.
export function outline(shape, n = 32) {
	const a = SHAPES[shape]?.aspect ?? 1, pts = [];
	const P = (x, y) => pts.push(new THREE.Vector2(x, y));
	switch (shape) {
		case 'navette': { // a lens: two circular arcs (radius R) meeting in points at y = +-a/2
			const R = (a * a) / 4 + 0.25, half = n / 2;
			for (let i = 0; i < half; i++) { const y = -a / 2 + (a * i) / half; P(Math.sqrt(Math.max(R * R - y * y, 0)) - (R - 0.5), y); }
			for (let i = 0; i < half; i++) { const y = a / 2 - (a * i) / half; P(-(Math.sqrt(Math.max(R * R - y * y, 0)) - (R - 0.5)), y); }
			return pts;
		}
		case 'pear': case 'drop': {
			for (let i = 0; i < n; i++) {
				const t = (i / n) * Math.PI * 2, x = 0.5 * Math.cos(t);
				const y = Math.sin(t) >= 0 ? (a - 0.5) * Math.sin(t) ** (shape === 'drop' ? 0.75 : 0.9) : 0.5 * Math.sin(t);
				P(x * (Math.sin(t) >= 0 ? 1 - 0.85 * Math.sin(t) ** 3 : 1), y - (a - 1) / 2);
			}
			return pts;
		}
		case 'heart': {
			for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; P((16 * Math.sin(t) ** 3) / 34, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 34 + 0.05); }
			return pts.reverse();
		}
		case 'square': return [P(-0.5, -0.5), P(0.5, -0.5), P(0.5, 0.5), P(-0.5, 0.5)] && pts;
		case 'baguette': return [P(-0.5, -a / 2), P(0.5, -a / 2), P(0.5, a / 2), P(-0.5, a / 2)] && pts;
		case 'triangle': { for (let i = 0; i < 3; i++) { const t = Math.PI / 2 + (i / 3) * Math.PI * 2; P(0.55 * Math.cos(t), 0.55 * Math.sin(t) - 0.1); } return pts; }
		case 'star': { for (let i = 0; i < 10; i++) { const t = Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 0.22 : 0.52; P(r * Math.cos(t), r * Math.sin(t)); } return pts; }
		default: { for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; P(0.5 * Math.cos(t), (a / 2) * Math.sin(t)); } return pts; }
	}
}

// A faceted flat-back: the girdle at the outline (z = 0), a table (scaled outline) at height h,
// facets between them alternating so neighbouring facets look at different parts of the room.
export function facetedGeometry(shape) {
	const deep = SHAPES[shape]?.deep;
	const out = outline(shape, shape === 'round' || shape === 'rivoli' ? 16 : 24);
	const n = out.length, H = deep ? 0.62 : 0.4, T = deep ? 0.25 : 0.55, tris = [];
	const g = out.map((p) => new THREE.Vector3(p.x, p.y, 0));
	const t = out.map((p) => new THREE.Vector3(p.x * T, p.y * T, H));
	const mid = new THREE.Vector3(0, 0, H * (deep ? 1.15 : 1));
	// crown: break each girdle edge into a kite with a mid-height vertex, for facet contrast
	for (let i = 0; i < n; i++) {
		const j = (i + 1) % n, gi = g[i], gj = g[j], ti = t[i], tj = t[j];
		const m = gi.clone().add(gj).multiplyScalar(0.5).lerp(ti.clone().add(tj).multiplyScalar(0.5), 0.45);
		m.z += H * 0.08;
		tris.push([gi, gj, m], [gj, tj, m], [tj, ti, m], [ti, gi, m]);
		tris.push([mid, ti, tj]); // table (pointed for a rivoli)
	}
	return flatFaces(tris);
}

function flatFaces(tris) {
	const pos = [], nrm = [];
	const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), nn = new THREE.Vector3();
	for (const tr of tris) {
		a.copy(tr[0]); b.copy(tr[1]); c.copy(tr[2]);
		nn.subVectors(b, a).cross(c.clone().sub(a));
		if (nn.lengthSq() < 1e-14) continue;
		nn.normalize();
		if (nn.z < 0) { nn.negate(); const tmp = b.clone(); b.copy(c); c.copy(tmp); }
		pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
		for (let i = 0; i < 3; i++) nrm.push(nn.x, nn.y, nn.z);
	}
	const geo = new THREE.BufferGeometry();
	geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
	return geo;
}

export function pearlGeometry() {
	const g = new THREE.SphereGeometry(0.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
	g.rotateX(Math.PI / 2); // dome towards +z
	g.scale(1, 1, 0.9);
	return g;
}
export function discGeometry(thick = 0.04, n = 16) {
	const pts = [];
	for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; pts.push([new THREE.Vector3(0, 0, thick), new THREE.Vector3(0.5 * Math.cos(t), 0.5 * Math.sin(t), thick), new THREE.Vector3(0.5 * Math.cos(t + Math.PI * 2 / n), 0.5 * Math.sin(t + Math.PI * 2 / n), thick)]); }
	return flatFaces(pts);
}
export function nailheadGeometry() {
	const g = new THREE.SphereGeometry(0.5, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2.6);
	g.rotateX(Math.PI / 2);
	g.translate(0, 0, -0.5 * Math.cos(Math.PI / 2.6));
	g.scale(1, 1, 0.8);
	return g;
}
