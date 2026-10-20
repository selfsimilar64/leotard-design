// Display hardware around the mannequin, rebuilt whenever the body or presentation changes.
//
// Full body: the retail-mannequin fitting, a round tempered-glass base (40.6 cm across, 35 cm
// for the child; 8 mm thick) with a chrome rod rising behind the heel into the back of the calf.
// Dress form: a "3/4" swimwear-style form cut at the neck, upper arms and mid-thigh, with flat end
// caps, a turned wooden neck cap, a pole up into the crotch and a five-leg caster base.
// Sizes from research_notes/mannequins_and_leotard_fit.md (neck cap and base are estimates).
import * as THREE from 'three';

const chrome = new THREE.MeshPhysicalMaterial({ color: 0xd8dbe0, metalness: 1, roughness: 0.16 });
const blackMetal = new THREE.MeshPhysicalMaterial({ color: 0x1c1c20, metalness: 0.6, roughness: 0.35, clearcoat: 0.6 });
const wood = new THREE.MeshPhysicalMaterial({ color: 0x7a4a26, roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.2 });
const glass = new THREE.MeshPhysicalMaterial({ color: 0xa9c4c0, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.32, clearcoat: 1, depthWrite: false });
const glassEdge = new THREE.MeshPhysicalMaterial({ color: 0x5f8a84, roughness: 0.08, transparent: true, opacity: 0.75 });

const cyl = (r0, r1, h, mat, seg = 40) => new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat);
const at = (mesh, x, y, z) => { mesh.position.set(x, y, z); return mesh; };
function rod(a, b, r, mat) {
	const d = new THREE.Vector3().subVectors(b, a), m = cyl(r, r, d.length(), mat, 20);
	m.position.copy(a).addScaledVector(d, 0.5);
	m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
	return m;
}

// Point on the back of the right calf (x < 0 is the wearer's right), from the current mesh.
function calfBack(body) {
	const P = body.aPos.array, knee = body.landmark('knee_l', -1), ankle = body.landmark('ankle_l', -1);
	const y = THREE.MathUtils.lerp(ankle.y, knee.y, 0.55), x = THREE.MathUtils.lerp(ankle.x, knee.x, 0.55);
	let z = 0, best = 9;
	for (let i = 0; i < body.vertices; i++) {
		if (Math.abs(P[i * 3 + 1] - y) > 0.008 || Math.abs(P[i * 3] - x) > 0.035 || body.wLeg[i] < 0.5) continue;
		if (P[i * 3 + 2] < best) { best = P[i * 3 + 2]; z = best; }
	}
	return new THREE.Vector3(x, y, z);
}

export function fullBodyStand(body) {
	const g = new THREE.Group(), r = body.body.stature < 1.4 ? 0.175 : 0.203, t = 0.008;
	const plate = cyl(r, r, t, glass, 96);
	plate.position.y = -t / 2;
	plate.renderOrder = 2; // after the opaque scene: it is see-through
	g.add(plate);
	const edge = new THREE.Mesh(new THREE.TorusGeometry(r, t / 2, 8, 96), glassEdge);
	edge.rotation.x = Math.PI / 2; edge.position.y = -t / 2; edge.renderOrder = 2;
	g.add(edge);
	const c = calfBack(body), foot = new THREE.Vector3(c.x, 0, c.z - 0.03);
	const bend = new THREE.Vector3(c.x, c.y, c.z - 0.03);
	g.add(rod(foot, bend, 0.006, chrome), rod(bend, new THREE.Vector3(c.x, c.y, c.z + 0.045), 0.006, chrome));
	g.add(at(cyl(0.016, 0.02, 0.012, chrome), foot.x, 0.006, foot.z));
	return g;
}

// Fan-triangulated cap over one cut loop.
function capGeometry(loop) {
	const c = loop.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(loop.length);
	const pos = [c.x, c.y, c.z];
	for (const p of loop) pos.push(p.x, p.y, p.z);
	const idx = [];
	for (let i = 0; i < loop.length; i++) idx.push(0, 1 + i, 1 + (i + 1) % loop.length);
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setIndex(idx);
	g.computeVertexNormals();
	return { geometry: g, centre: c };
}

export function dressFormStand(body, capMaterial) {
	const g = new THREE.Group();
	neckCaps(body, capMaterial, g);
	// Pole from the crotch to the caster base, with a height-adjust collar.
	const c = body.crotch, footY = 0.075;
	g.add(rod(new THREE.Vector3(0, footY, c.z), new THREE.Vector3(0, c.y + 0.02, c.z), 0.0125, chrome));
	g.add(at(cyl(0.022, 0.022, 0.05, blackMetal), 0, footY + (c.y - footY) * 0.45, c.z));
	g.add(at(cyl(0.035, 0.045, 0.06, blackMetal), 0, footY, c.z));
	for (let k = 0; k < 5; k++) {
		const a = k / 5 * Math.PI * 2 + Math.PI / 10, end = new THREE.Vector3(Math.sin(a) * 0.27, 0.05, c.z + Math.cos(a) * 0.27);
		g.add(rod(new THREE.Vector3(0, footY, c.z), end, 0.011, blackMetal));
		const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), blackMetal);
		wheel.position.set(end.x, 0.022, end.z);
		g.add(wheel);
	}
	return g;
}

// Flat caps over every cut loop of the body's keep field, and on the highest (the neck) a turned
// wooden disc and knob.
function neckCaps(body, capMaterial, g) {
	const loops = body.cutLoops().map((l) => ({ loop: l, ...capGeometry(l) }));
	loops.sort((a, b) => b.centre.y - a.centre.y);
	for (const L of loops) {
		const m = new THREE.Mesh(L.geometry, capMaterial);
		m.material.side = THREE.DoubleSide;
		g.add(m);
	}
	// Neck cap: the highest loop. A turned wooden disc a little wider than the neck, and a knob.
	const neck = loops[0];
	if (neck) {
		const rad = neck.loop.reduce((a, p) => a + Math.hypot(p.x - neck.centre.x, p.z - neck.centre.z), 0) / neck.loop.length;
		const top = neck.loop.reduce((a, p) => Math.max(a, p.y), -9);
		const disc = cyl(rad * 1.12, rad * 1.18, 0.022, wood, 48);
		disc.position.set(neck.centre.x, top + 0.009, neck.centre.z);
		const knob = new THREE.Mesh(new THREE.SphereGeometry(0.014, 24, 16), wood);
		knob.position.set(neck.centre.x, top + 0.028, neck.centre.z);
		g.add(disc, knob);
	}
}
