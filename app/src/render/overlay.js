// Editing overlay: the document's curves drawn as screen-space lines just above the garment on the
// current body, their control points, and hover / selection highlights. Curve positions come from
// their surface points, so the overlay follows any body.
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

export const ROLE_COLOURS = { seam: 0xffd166, edge: 0x4cc9f0, print: 0xf72585, guide: 0x9aa0ad, 'strap-path': 0xff9f1c, 'trim-path': 0x80ffdb };
const LIFT = 0.0022; // above the garment surface (fabric sits at 1.2 mm)

export class Overlay {
	constructor(scene, man) {
		this.man = man;
		this.group = new THREE.Group();
		this.group.renderOrder = 10;
		scene.add(this.group);
		this.lines = new Map(); // key -> Line2
		this.materials = new Map();
		this.points = null;
		this.visible = true;
		this.resolution = new THREE.Vector2(1, 1);
		const tex = (() => {
			const c = document.createElement('canvas'); c.width = c.height = 64;
			const x = c.getContext('2d');
			x.beginPath(); x.arc(32, 32, 26, 0, Math.PI * 2); x.fillStyle = '#fff'; x.fill(); x.lineWidth = 8; x.strokeStyle = '#222'; x.stroke();
			return new THREE.CanvasTexture(c);
		})();
		this.pointMat = new THREE.PointsMaterial({ size: 11, sizeAttenuation: false, map: tex, vertexColors: true, transparent: true, depthTest: false, alphaTest: 0.3 });
	}

	material(colour, width, dashed = false) {
		const key = colour + ':' + width + ':' + dashed;
		let m = this.materials.get(key);
		if (!m) {
			m = new LineMaterial({ color: colour, linewidth: width, worldUnits: false, dashed, dashSize: 0.006, gapSize: 0.004, depthTest: true, transparent: true, opacity: 0.95 });
			m.resolution = this.resolution;
			this.materials.set(key, m);
		}
		return m;
	}

	setResolution(w, h) { this.resolution.set(w, h); }

	// Position of a surface point on the current garment surface, lifted along the normal.
	place(sp, out) {
		const man = this.man, G = man.garmentPos, N = man.aGNormal.array, idx = man.idx, f = sp.f;
		const b = [sp.b0, sp.b1, sp.b2];
		out.set(0, 0, 0);
		let nx = 0, ny = 0, nz = 0;
		for (let k = 0; k < 3; k++) {
			const v = idx[f * 3 + k] * 3;
			out.x += b[k] * G[v]; out.y += b[k] * G[v + 1]; out.z += b[k] * G[v + 2];
			nx += b[k] * N[v]; ny += b[k] * N[v + 1]; nz += b[k] * N[v + 2];
		}
		const l = Math.hypot(nx, ny, nz) || 1;
		return out.set(out.x + nx / l * LIFT, out.y + ny / l * LIFT, out.z + nz / l * LIFT);
	}

	// evaluated: Map(key -> { sps, closed, role, curve }); sel: selected curve id; hover: hovered id
	setCurves(evaluated, doc, { selected = null, hover = null, showPoints = false } = {}) {
		for (const l of this.lines.values()) { this.group.remove(l); l.geometry.dispose(); }
		this.lines.clear();
		if (!this.man.garmentPos) return;
		const v = new THREE.Vector3();
		for (const [key, e] of evaluated) {
			if (e.sps.length < 2) continue;
			const pos = [];
			for (const sp of e.sps) { this.place(sp, v); pos.push(v.x, v.y, v.z); }
			if (e.closed) pos.push(pos[0], pos[1], pos[2]);
			const g = new LineGeometry();
			g.setPositions(pos);
			const isSel = e.curve === selected, isHover = e.curve === hover;
			const colour = isSel ? 0xffffff : ROLE_COLOURS[e.role] ?? 0xffffff;
			const line = new Line2(g, this.material(colour, isSel ? 3.2 : isHover ? 2.6 : 1.6, e.role === 'guide'));
			if (e.role === 'guide') line.computeLineDistances();
			line.renderOrder = 10;
			line.userData = { key, curve: e.curve };
			this.group.add(line);
			this.lines.set(key, line);
		}
		this.setPoints(showPoints && selected ? doc.curves.find((c) => c.id === selected) : null, evaluated.get(selected));
	}

	// Control points of the selected curve (and of its mirror image, dimmed).
	setPoints(curve, e) {
		if (this.points) { this.group.remove(this.points); this.points.geometry.dispose(); this.points = null; }
		if (!curve || !e) return;
		const pos = [], col = [], v = new THREE.Vector3();
		e.ctrlIndex.forEach((si, i) => {
			this.place(e.sps[si], v); pos.push(v.x, v.y, v.z);
			const corner = curve.points[i]?.kind === 'corner';
			col.push(...(corner ? [1, 0.55, 0.2] : [1, 1, 1]));
		});
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
		g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
		this.points = new THREE.Points(g, this.pointMat);
		this.points.renderOrder = 11;
		this.group.add(this.points);
	}

	setVisible(v) { this.visible = v; this.group.visible = v; }
}
