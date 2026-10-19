// Small hardware on the garment: clear plastic hooks (strap junctions), metal hook-and-bar closures,
// zip pulls. Each sits at a surface point, lies flat on the fabric and turns by `angle` from the
// body's horizontal. Plain meshes: a dozen at most per design.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mirrorSP } from '../curves/points.js';
import { fromSP } from '../body/surface.js';

const MATS = {
	clear: new THREE.MeshPhysicalMaterial({ color: 0xf4f6f8, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.38, clearcoat: 1, clearcoatRoughness: 0.05 }),
	metal: new THREE.MeshPhysicalMaterial({ color: 0xd9dce2, roughness: 0.18, metalness: 1 }),
};

function part(kind) {
	const g = new THREE.Group();
	if (kind === 'clear-hook') {
		const plate = new THREE.Mesh(new RoundedBoxGeometry(0.014, 0.007, 0.0016, 2, 0.0012), MATS.clear);
		const hook = new THREE.Mesh(new THREE.TorusGeometry(0.0028, 0.0007, 8, 16, Math.PI), MATS.clear);
		hook.position.set(0.006, 0, 0.0012); hook.rotation.z = -Math.PI / 2;
		g.add(plate, hook);
	} else if (kind === 'hook-and-bar') {
		const bar = new THREE.Mesh(new RoundedBoxGeometry(0.012, 0.0025, 0.0011, 2, 0.0004), MATS.metal);
		const hook = new THREE.Mesh(new THREE.TorusGeometry(0.0022, 0.0006, 8, 16, Math.PI * 1.2), MATS.metal);
		hook.position.set(0, -0.004, 0.0009);
		g.add(bar, hook);
	} else {
		const tab = new THREE.Mesh(new RoundedBoxGeometry(0.004, 0.011, 0.001, 2, 0.0004), MATS.metal);
		tab.position.y = -0.006;
		const slider = new THREE.Mesh(new RoundedBoxGeometry(0.005, 0.004, 0.0022, 2, 0.0006), MATS.metal);
		g.add(tab, slider);
	}
	return g;
}

export class HardwareView {
	constructor(scene, man, surf) {
		this.man = man; this.surf = surf;
		this.group = new THREE.Group();
		scene.add(this.group);
	}

	build(doc) {
		for (const c of [...this.group.children]) { this.group.remove(c); c.traverse((o) => o.geometry?.dispose()); }
		const man = this.man;
		if (!man.garmentPos) return;
		const G = man.garmentPos, N = man.aGNormal.array, T = man.aTan.array, idx = man.idx;
		const at = (sp, A, k) => { const v = new THREE.Vector3(); const b = [sp.b0, sp.b1, sp.b2]; for (let j = 0; j < 3; j++) { const i = idx[sp.f * 3 + j] * k; v.x += b[j] * A[i]; v.y += b[j] * A[i + 1]; v.z += b[j] * A[i + 2]; } return v; };
		for (const h of doc.hardware) {
			const sps = [fromSP(h.at)];
			if (h.mirror === 'both') sps.push(mirrorSP(sps[0], this.surf));
			sps.forEach((sp, k) => {
				const p = at(sp, G, 3), n = at(sp, N, 3).normalize(), t0 = at(sp, T, 4);
				const t = t0.sub(n.clone().multiplyScalar(t0.dot(n))).normalize().applyAxisAngle(n, (k ? -1 : 1) * (h.angle ?? 0));
				const b = n.clone().cross(t);
				const obj = part(h.kind);
				obj.matrix.makeBasis(t, b, n).setPosition(p.addScaledVector(n, 0.0028));
				obj.matrixAutoUpdate = false;
				obj.userData = { hardware: h.id };
				this.group.add(obj);
			});
		}
	}

	setVisible(v) { this.group.visible = v; }
}
