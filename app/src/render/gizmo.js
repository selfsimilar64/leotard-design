// The handles of the chosen stone pattern, lying on the body: a ring with a knob to move it, one to turn
// it and one to scale it, and the two ends of its gradient. They live in the overlay's group, so they
// hide with the editing lines (H) and in captures. On a pair, the mirror image's handles show dimmer and
// work too. What they do: ui/tools.js. Where they go: stones/pattern.js patternHandles.
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { patternHandles } from '../stones/pattern.js';
import { mirrorFast } from '../stones/cloth.js';

const LIFT = 0.0055;   // above the cloth: over all but the tallest stones
const HIT_PX = 17;

function knobTexture(kind) {
	const S = 128, c = document.createElement('canvas');
	c.width = c.height = S;
	const x = c.getContext('2d'), m = S / 2;
	x.beginPath(); x.arc(m, m, S * 0.44, 0, Math.PI * 2);
	x.fillStyle = kind === 'gb' ? '#1c1a17' : '#ffffff'; x.fill();
	x.lineWidth = S * 0.05; x.strokeStyle = kind === 'gb' ? '#ffffff' : '#1c1a17'; x.stroke();
	const ink = '#1c1a17';
	x.strokeStyle = ink; x.fillStyle = ink; x.lineWidth = S * 0.058; x.lineCap = 'round'; x.lineJoin = 'round';
	const head = (hx, hy, a, r = S * 0.1) => { x.beginPath(); x.moveTo(hx, hy); x.lineTo(hx - r * Math.cos(a - 0.6), hy - r * Math.sin(a - 0.6)); x.moveTo(hx, hy); x.lineTo(hx - r * Math.cos(a + 0.6), hy - r * Math.sin(a + 0.6)); x.stroke(); };
	const R = S * 0.27;
	if (kind === 'move') {
		x.beginPath(); x.moveTo(m - R, m); x.lineTo(m + R, m); x.moveTo(m, m - R); x.lineTo(m, m + R); x.stroke();
		head(m + R, m, 0); head(m - R, m, Math.PI); head(m, m + R, Math.PI / 2); head(m, m - R, -Math.PI / 2);
	} else if (kind === 'rotate') {
		const r = S * 0.22;
		x.beginPath(); x.arc(m, m, r, -Math.PI * 0.85, Math.PI * 0.45); x.stroke();
		head(m + r * Math.cos(Math.PI * 0.45), m + r * Math.sin(Math.PI * 0.45), Math.PI * 0.95);
	} else if (kind === 'scale') {
		const d = R * 0.74;
		x.beginPath(); x.moveTo(m - d, m + d); x.lineTo(m + d, m - d); x.stroke();
		head(m + d, m - d, -Math.PI / 4); head(m - d, m + d, Math.PI * 0.75);
	} else if (kind === 'ga') { x.beginPath(); x.arc(m, m, S * 0.15, 0, Math.PI * 2); x.fill(); }
	else if (kind === 'gb') { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(m, m, S * 0.13, 0, Math.PI * 2); x.fill(); }
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}

export class PatternGizmo {
	constructor(engine) {
		this.engine = engine; this.overlay = engine.overlay;
		this.group = new THREE.Group();
		this.group.renderOrder = 14;
		this.overlay.group.add(this.group);
		this.knobs = [];     // { kind, mirrored, sp, at: Vector3, u, v: its place on the flat piece }
		this.objects = [];
		this.textures = new Map();
		this.mats = new Map();
		this.hot = null;
	}

	material(kind, dim, hot) {
		const key = kind + (dim ? ':dim' : '') + (hot ? ':hot' : '');
		let m = this.mats.get(key);
		if (!m) {
			let t = this.textures.get(kind);
			if (!t) this.textures.set(kind, t = knobTexture(kind));
			const size = (kind === 'move' ? 32 : 28) * (hot ? 1.2 : 1) * (dim ? 0.8 : 1);
			m = new THREE.PointsMaterial({ size, sizeAttenuation: false, map: t, transparent: true, opacity: dim ? 0.6 : 1, depthTest: true, depthWrite: false, alphaTest: 0.05, toneMapped: false });
			this.mats.set(key, m);
		}
		return m;
	}

	clear() {
		for (const o of this.objects) { this.group.remove(o); o.geometry.dispose(); }
		this.objects = []; this.knobs = [];
	}

	// Which sides of the body the group's stones show on: its own piece, and/or the mirror image.
	sidesOf(gen, cloth, cx) {
		const own = !gen.mirror || gen.mirror !== 'only', both = gen.mirror === 'both' || cloth.paired || gen.params?.symmetric;
		if (gen.side) { const left = cx >= 0; return (gen.side === 'left') === left ? [false] : [true]; }
		if (!own) return [true];
		return both ? [false, true] : [false];
	}

	// gen: a pattern group, or null to take the handles away.
	show(gen) {
		this.clear();
		this.gen = gen;
		if (!gen) return;
		const engine = this.engine, cloth = engine.clothOf(gen.on?.panel), piece = cloth?.piece;
		if (!piece) return;
		this.piece = piece;
		const H = patternHandles(gen, piece), surf = engine.surf, v = new THREE.Vector3();
		const centre = piece.spAt((piece.x0 + piece.x1) / 2, (piece.y0 + piece.y1) / 2), cx = centre ? surf.pos(centre).x : 0;
		for (const mirrored of this.sidesOf(gen, cloth, cx)) {
			const mir = (sp) => (mirrored ? mirrorFast(surf, sp) : sp);
			// lines only where they lie on the piece; past its edge there is nothing to draw on
			const draw = (pos, width) => {
				if (pos.length < 6) return;
				for (const [colour, w, order] of [[0x1c1a17, width + 1.6, 14], [0xffffff, width, 15]]) {
					const g = new LineGeometry();
					g.setPositions(pos);
					const l = new Line2(g, this.overlay.material(colour, w, false));
					l.renderOrder = order;
					l.frustumCulled = false;
					this.group.add(l);
					this.objects.push(l);
				}
			};
			for (const line of H.lines) {
				let pos = [];
				for (const [u, w] of line.pts) {
					const q = piece.find(u, w);
					if (q < 0) { draw(pos, line.width); pos = []; continue; }
					this.overlay.place(mir(piece.spOf(q)), v, LIFT);
					pos.push(v.x, v.y, v.z);
				}
				draw(pos, line.width);
			}
			for (const k of H.knobs) {
				const on = piece.spOnPiece(k.u, k.v), sp = on && mir(on);
				if (!sp) continue;
				const at = this.overlay.place(sp, new THREE.Vector3(), LIFT), g = new THREE.BufferGeometry();
				g.setAttribute('position', new THREE.Float32BufferAttribute([at.x, at.y, at.z], 3));
				const o = new THREE.Points(g, this.material(k.kind, mirrored, this.hot === k.kind));
				o.renderOrder = 16;
				o.frustumCulled = false;
				this.group.add(o);
				this.objects.push(o);
				const uv = piece.uvOf(on) ?? [k.u, k.v];
				this.knobs.push({ kind: k.kind, mirrored, sp, at, u: uv[0], v: uv[1] });
			}
		}
	}

	setHot(kind) {
		if (kind === this.hot) return;
		this.hot = kind;
		this.show(this.gen);
	}

	// The handle under a screen point, nearest first, unless the body is in front of it.
	hit(x, y) {
		if (!this.knobs.length || !this.overlay.group.visible) return null;
		const engine = this.engine, vp = engine.viewport, el = vp.renderer.domElement, v = new THREE.Vector3();
		let best = null, bd = HIT_PX;
		for (const k of this.knobs) {
			v.copy(k.at).applyMatrix4(vp.world.matrixWorld).project(vp.camera);
			if (v.z > 1) continue;
			const d = Math.hypot((v.x + 1) / 2 * el.clientWidth - x, (1 - v.y) / 2 * el.clientHeight - y);
			if (d < bd) { bd = d; best = k; }
		}
		if (!best) return null;
		const surf = engine.pickAt(x, y), dist = v.copy(best.at).applyMatrix4(vp.world.matrixWorld).distanceTo(vp.camera.position);
		if (surf?.sp && surf.distance < dist - 0.03) return null;
		// the far side of a tube of cloth, showing just past its edge: what lies in front is somewhere else on the piece
		const uv = surf?.sp && this.piece?.uvOf(best.mirrored ? mirrorFast(engine.surf, surf.sp) : surf.sp);
		return uv && Math.hypot(uv[0] - best.u, uv[1] - best.v) > 0.05 ? null : best;
	}
}
