// Editing overlay: the document's curves drawn as screen-space lines just above the garment on the
// current body, their control points, and hover / selection highlights. Curve positions come from
// their surface points, so the overlay follows any body.
import * as THREE from 'three';
import { Line2, lineMaterial } from './lines.js'; // (WebGL or WebGPU lines)
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

export const ROLE_COLOURS = { seam: 0xffd166, edge: 0x4cc9f0, print: 0xf72585, guide: 0x9aa0ad, 'strap-path': 0xff9f1c, 'trim-path': 0x80ffdb };
const LIFT = 0.0022; // above the garment surface (fabric sits at 1.2 mm)
const TINTS = [0x4cc9f0, 0xffd166, 0xf78fb3, 0x7bed9f, 0xb79cff, 0xff9f6e];
const TINT_ALPHA = 0.2, FOCUS_ALPHA = 0.45;

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
			m = lineMaterial({ color: colour, linewidth: width, worldUnits: false, dashed, dashSize: 0.006, gapSize: 0.004, depthTest: true, transparent: true, opacity: 0.95 }, this.resolution);
			this.materials.set(key, m);
		}
		return m;
	}

	setResolution(w, h) { this.resolution.set(w, h); }

	// Position of a surface point on the current garment surface, lifted along the normal.
	place(sp, out, lift = LIFT) {
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
		return out.set(out.x + nx / l * lift, out.y + ny / l * lift, out.z + nz / l * lift);
	}

	// The same, with the surface's normal there (the stone handles' test of what faces the camera).
	placeWithNormal(sp, out, normal, lift = LIFT) {
		const man = this.man, G = man.garmentPos, N = man.aGNormal.array, idx = man.idx, f = sp.f;
		const b0 = sp.b0, b1 = sp.b1, b2 = sp.b2, i0 = idx[f * 3] * 3, i1 = idx[f * 3 + 1] * 3, i2 = idx[f * 3 + 2] * 3;
		let nx = b0 * N[i0] + b1 * N[i1] + b2 * N[i2], ny = b0 * N[i0 + 1] + b1 * N[i1 + 1] + b2 * N[i2 + 1], nz = b0 * N[i0 + 2] + b1 * N[i1 + 2] + b2 * N[i2 + 2];
		const l = Math.hypot(nx, ny, nz) || 1;
		nx /= l; ny /= l; nz /= l;
		normal.set(nx, ny, nz);
		return out.set(b0 * G[i0] + b1 * G[i1] + b2 * G[i2] + nx * lift, b0 * G[i0 + 1] + b1 * G[i1 + 1] + b2 * G[i2 + 1] + ny * lift, b0 * G[i0 + 2] + b1 * G[i1 + 2] + b2 * G[i2 + 2] + nz * lift);
	}

	// evaluated: Map(key -> { sps, closed, role, curve }); sel: selected curve id; hover: hovered id
	// selectedSide: Mirror off, the one side of a paired line an edit will change ('own' | 'm');
	// centre: draw the body's centre line
	setCurves(evaluated, doc, { selected = null, hover = null, showPoints = false, selectedSide = null, centre = false } = {}) {
		this.setCentre(centre);
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
			const isSel = e.curve === selected && (!selectedSide || !!e.mirrored === (selectedSide === 'm')), isHover = e.curve === hover;
			const colour = isSel ? 0xffffff : ROLE_COLOURS[e.role] ?? 0xffffff;
			const line = new Line2(g, this.material(colour, isSel ? 3.2 : isHover ? 2.6 : 1.6, e.role === 'guide'));
			if (e.role === 'guide') line.computeLineDistances();
			line.renderOrder = 10;
			line.userData = { key, curve: e.curve };
			this.group.add(line);
			this.lines.set(key, line);
		}
		const cur = showPoints && selected ? doc.curves.find((c) => c.id === selected) : null;
		this.setPoints(cur, cur ? [evaluated.get(selected), evaluated.get(selected + '~m')].filter(Boolean) : []);
	}

	// Pen preview: the curve being drawn (evaluated), drawn bright and dashed; its mirrored copy
	// (Mirror on), the same but thinner.
	setPreview(e, mirrored = null) {
		for (const l of this.previews ?? []) { this.group.remove(l); l.geometry.dispose(); }
		this.previews = [];
		const v = new THREE.Vector3();
		for (const [c, width] of [[e, 2.4], [mirrored, 1.6]]) {
			if (!c || c.sps.length < 2) continue;
			const pos = [];
			for (const sp of c.sps) { this.place(sp, v); pos.push(v.x, v.y, v.z); }
			const g = new LineGeometry();
			g.setPositions(pos);
			const l = new Line2(g, this.material(0xffffff, width, true));
			l.computeLineDistances();
			l.renderOrder = 12;
			this.group.add(l);
			this.previews.push(l);
		}
	}

	// Lines drawn with the overlay tool, waiting for an area to be picked (evaluated curves).
	setDrawn(list) {
		for (const l of this.drawn ?? []) { this.group.remove(l); l.geometry.dispose(); }
		this.drawn = [];
		const v = new THREE.Vector3();
		for (const c of list ?? []) {
			const pos = [];
			for (const sp of c.sps) { this.place(sp, v); pos.push(v.x, v.y, v.z); }
			const g = new LineGeometry();
			g.setPositions(pos);
			const l = new Line2(g, this.material(0xffffff, 2.2, true));
			l.computeLineDistances();
			l.renderOrder = 12;
			this.group.add(l);
			this.drawn.push(l);
		}
	}

	// The areas the overlay tool can pick, each a faint tint: cells: [{ cell, hue, sps: surface points,
	// three per triangle }]. focusRegions lights some of them (the one under the pointer and its pair).
	setRegions(cells) {
		if (this.regions) { this.group.remove(this.regions.mesh); this.regions.mesh.geometry.dispose(); this.regions.mesh.material.dispose(); this.regions = null; }
		if (!cells?.length) return;
		const n = cells.reduce((a, c) => a + c.sps.length, 0), pos = new Float32Array(n * 3), col = new Float32Array(n * 4), v = new THREE.Vector3(), tint = new THREE.Color(), ranges = new Map();
		let o = 0;
		for (const c of cells) {
			tint.setHex(TINTS[c.hue % TINTS.length]);
			ranges.set(c.cell, [o, o + c.sps.length, tint.r, tint.g, tint.b]);
			for (const sp of c.sps) {
				this.place(sp, v);
				pos.set([v.x, v.y, v.z], o * 3);
				col.set([tint.r, tint.g, tint.b, TINT_ALPHA], o * 4);
				o++;
			}
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
		g.setAttribute('color', new THREE.BufferAttribute(col, 4));
		const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide })); // (render/warmup.js compiles a stand-in of this material at the start: change both)
		mesh.renderOrder = 9;
		this.group.add(mesh);
		this.regions = { mesh, ranges, lit: [] };
	}
	focusRegions(cells) {
		const r = this.regions;
		if (!r) return;
		const col = r.mesh.geometry.attributes.color, paint = (cell, on) => {
			const q = r.ranges.get(cell);
			if (!q) return;
			for (let i = q[0]; i < q[1]; i++) col.setXYZW(i, on ? 1 : q[2], on ? 1 : q[3], on ? 1 : q[4], on ? FOCUS_ALPHA : TINT_ALPHA);
		};
		for (const c of r.lit) paint(c, false);
		for (const c of cells) paint(c, true);
		r.lit = cells;
		col.needsUpdate = true;
	}

	// A dot: where a point placed under the pointer will attach, or where a stone or lettering gets its
	// mirrored copy (Mirror on).
	setCursor(sp) {
		if (this.cursor) { this.group.remove(this.cursor); this.cursor.geometry.dispose(); this.cursor = null; }
		if (!sp) return;
		const v = this.place(sp, new THREE.Vector3()), g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute([v.x, v.y, v.z], 3));
		g.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1], 3));
		this.cursor = new THREE.Points(g, this.pointMat);
		this.cursor.renderOrder = 12;
		this.group.add(this.cursor);
	}

	// The body's centre line (x = 0 on the reference surface, placed on the body as shown): faint,
	// so it reads as a guide and not as a seam. The crossing is found once, then only re-placed.
	setCentre(on) {
		if (this.centre) { this.group.remove(this.centre); this.centre.geometry.dispose(); this.centre = null; }
		if (!on || !this.surf || !this.man.garmentPos) return;
		if (!this.centreSps) {
			const S = this.surf, idx = S.idx, P = S.P, out = [];
			for (let f = 0; f < S.F; f++) {
				const b = [[], [], []], xs = [0, 1, 2].map((k) => P[idx[f * 3 + k] * 3]), cut = [];
				for (let k = 0; k < 3; k++) {
					const n = (k + 1) % 3;
					if ((xs[k] < 0) === (xs[n] < 0)) continue;
					const t = xs[k] / (xs[k] - xs[n]), q = [0, 0, 0];
					q[k] = 1 - t; q[n] = t;
					cut.push({ f, b0: q[0], b1: q[1], b2: q[2] });
				}
				b.length = 0;
				if (cut.length === 2) out.push(cut[0], cut[1]);
			}
			this.centreSps = out;
		}
		const pos = [], v = new THREE.Vector3();
		for (const sp of this.centreSps) { this.place(sp, v); pos.push(v.x, v.y, v.z); }
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
		this.centreMat ??= new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 }); // (render/warmup.js compiles a stand-in of this material at the start: change both)
		this.centre = new THREE.LineSegments(g, this.centreMat);
		this.centre.renderOrder = 9;
		this.group.add(this.centre);
	}

	// One piece of a paired part glows and fades (Mirror off: the side an edit will change).
	// cellSps: surface points, three per triangle.
	flashCell(cellSps) {
		if (this.glow) { this.group.remove(this.glow); this.glow.geometry.dispose(); this.glow.material.dispose(); }
		const pos = new Float32Array(cellSps.length * 3), v = new THREE.Vector3();
		cellSps.forEach((sp, i) => { this.place(sp, v); pos.set([v.x, v.y, v.z], i * 3); });
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
		const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthTest: false, side: THREE.DoubleSide }); // (render/warmup.js compiles a stand-in of this material at the start: change both)
		const glow = this.glow = new THREE.Mesh(g, m);
		glow.renderOrder = 9;
		this.group.add(glow);
		const t0 = performance.now();
		const step = () => {
			if (this.glow !== glow) return;
			const k = Math.min((performance.now() - t0) / 650, 1);
			m.opacity = 0.35 * (1 - k) * (1 - k);
			if (k < 1) requestAnimationFrame(step);
			else { this.group.remove(glow); g.dispose(); m.dispose(); this.glow = null; }
		};
		requestAnimationFrame(step);
	}

	// Control points of the selected curve (and of its mirror image, dimmed).
	setPoints(curve, evals) {
		if (this.points) { this.group.remove(this.points); this.points.geometry.dispose(); this.points = null; }
		if (!curve || !evals.length) return;
		const pos = [], col = [], v = new THREE.Vector3();
		evals.forEach((e, k) => e.ctrlIndex.forEach((si, i) => {
			this.place(e.sps[si], v); pos.push(v.x, v.y, v.z);
			const corner = curve.points[i]?.kind === 'corner', on = !!curve.points[i]?.on, dim = k > 0 ? 0.6 : 1;
			col.push(...(corner ? [1, 0.55, 0.2] : on ? [0.3, 1, 0.5] : [1, 1, 1]).map((c) => c * dim));
		}));
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
		g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
		this.points = new THREE.Points(g, this.pointMat);
		this.points.renderOrder = 11;
		this.group.add(this.points);
	}

	setVisible(v) { this.visible = v; this.group.visible = v; }
}
