// The handles of the chosen stone pattern, drawn over the view in their own layer of the page: always on top
// of the crystals and the light, sharp at any resolution, and big enough for a finger. What they are comes from
// stones/handles.js. They are regular shapes on flat sheets, not laid over the body: a sheet touches the cloth at its
// middle and lies along it there, so a circle is an ellipse from an angle. A box's sheet also turns about the way
// it runs, to face the view. Each frame only what moved is projected onto the screen, and a sheet that
// faces away from the camera does not show. On a pair, the mirror image's handles show dimmer and work too.
// What dragging them does: ui/tools.js. They take no part in the lines' H; ui/state.js showHandles hides them.
import * as THREE from 'three';
import { patternHandles } from '../stones/handles.js';
import { mirrorFast } from '../stones/cloth.js';

const NS = 'http://www.w3.org/2000/svg';
const LIFT = 0.0012;
const REACH = 0.012;       // how far along the cloth a sheet takes its lie from
const AWAY = -0.25;        // how far past edge-on a sheet still shows
// the drawings on the knobs, about the origin in a 24 unit box
const GLYPHS = {
	move: 'M0-9v18M-9 0h18M0-9l-3 3M0-9l3 3M0 9l-3-3M0 9l3-3M-9 0l3-3M-9 0l3 3M9 0l-3-3M9 0l-3 3',
	turn: 'M-6.5-3.5A7.5 7.5 0 1 1-5 5.6M-6.5-3.5l-1.3 3.6M-6.5-3.5l3.7.4',
	scale: 'M-6 6L6-6M6-6H1.5M6-6v4.5M-6 6h4.5M-6 6v-4.5',
	stretch: 'M-8 0H8M8 0L4.5-3.2M8 0L4.5 3.2M-8 0l3.5-3.2M-8 0l3.5 3.2',
	point: 'M0-4.5a4.5 4.5 0 1 0 .01 0',
	dot: '',
};
export const TONES = { frame: '#ffffff', grip: '#ffffff', plane: '#b7f26d', density: '#6fd3ff', size: '#ffc14d', colour: '#ff8ac2' };

const el = (name, attrs = {}) => { const e = document.createElementNS(NS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

export class PatternGizmo {
	constructor(engine) {
		this.engine = engine; this.overlay = engine.overlay;
		const vp = engine.viewport;
		this.svg = el('svg', { class: 'gizmo', 'aria-hidden': 'true' });
		vp.container.style.position = vp.container.style.position || 'relative';
		vp.container.appendChild(this.svg);
		this.lineGroup = el('g'); this.knobGroup = el('g');
		this.svg.append(this.lineGroup, this.knobGroup);
		this.readout = document.createElement('div');
		this.readout.className = 'gz-readout';
		vp.container.appendChild(this.readout);
		this.paths = new Map();    // style -> { casing, core, d }
		this.knobEls = new Map();  // id -> element
		this.lines = [];           // { style, n, P: Float32Array(n * 6), mirrored }
		this.knobs = [];           // { id, ..., mirrored, sp, at: Vector3, nx, ny, nz, dirAt?: Vector3, u, v }
		this.gen = null; this.focus = 'frame'; this.stale = false;
		this.onGrab = null; this.onPick = null;
		this.sig = ''; this.pxPerM = 0;
	}

	// How big a metre of cloth is on the screen, about where the pattern lies.
	scale() {
		const vp = this.engine.viewport, h = vp.renderer.domElement.clientHeight || 600, d = vp.camera.position.distanceTo(vp.controls.target) || 1;
		return h / (2 * Math.tan((vp.camera.fov * Math.PI) / 360) * d);
	}

	// Which sides of the body the group's stones show on: its own piece, and/or the mirror image.
	sidesOf(gen, cloth, cx) {
		const own = !gen.mirror || gen.mirror !== 'only', both = gen.mirror === 'both' || cloth.paired || gen.params?.symmetric;
		if (gen.side) { const left = cx >= 0; return (gen.side === 'left') === left ? [false] : [true]; }
		if (!own) return [true];
		return both ? [false, true] : [false];
	}

	// gen: a pattern group, or null to take the handles away. focus: what is being worked on (stones/handles.js).
	// Laid out when the next frame is drawn, however many times it was asked for by then.
	show(gen, focus = this.focus) { this.gen = gen; this.focus = focus; this.stale = true; }
	again() { if (this.gen) this.stale = true; }
	build() {
		this.stale = false;
		const gen = this.gen, focus = this.focus;
		this.lines = []; this.knobs = []; this.sheets = null;
		const engine = this.engine, cloth = gen ? engine.clothOf(gen.on?.panel) : null, piece = cloth?.piece;
		this.piece = piece ?? null;
		this.dirty = true;
		if (!piece) { this.syncKnobs(); return; }
		const pxPerM = this.pxPerM = this.scale(), H = patternHandles(gen, piece, { focus, pxPerM }), surf = engine.surf;
		this.params = H.P;
		const centre = piece.spAt((piece.x0 + piece.x1) / 2, (piece.y0 + piece.y1) / 2), cx = centre ? surf.pos(centre).x : 0, v = new THREE.Vector3(), n = new THREE.Vector3();
		const put = (sp, mirrored, out, o) => {
			const s = mirrored ? mirrorFast(surf, sp) : sp;
			this.overlay.placeWithNormal(s, v, n, LIFT);
			out[o] = v.x; out[o + 1] = v.y; out[o + 2] = v.z; out[o + 3] = n.x; out[o + 4] = n.y; out[o + 5] = n.z;
			return s;
		};
		this.sheets = new Map();
		for (const mirrored of this.sidesOf(gen, cloth, cx)) {
			for (const line of H.lines) {
				if (!line.cloth) {
					const sheet = this.sheetOf(piece, line.at, line.pivot, mirrored), N = line.pts.length, Q = new Float32Array(N * 2);
					for (let i = 0; i < N; i++) { Q[i * 2] = line.pts[i][0] - sheet.u; Q[i * 2 + 1] = line.pts[i][1] - sheet.v; }
					this.lines.push({ tone: line.tone, width: line.width, faint: !!line.faint, dash: !!line.dash, pairs: !!line.pairs, mirrored, n: N, Q, sheet });
					continue;
				}
				// (past the piece's edge there is nothing to draw on)
				const N = line.pts.length, P = new Float32Array(N * 6), off = new Uint8Array(N);
				for (let i = 0; i < N; i++) {
					const [a, b] = line.pts[i], q = piece.find(a, b);
					if (q < 0) { off[i] = 1; continue; }
					put(piece.spOf(q), mirrored, P, i * 6);
				}
				this.lines.push({ tone: line.tone, width: line.width, faint: !!line.faint, dash: !!line.dash, pairs: !!line.pairs, mirrored, n: N, P, off });
			}
			for (const k of H.knobs) {
				if (!k.cloth) {
					const sheet = this.sheetOf(piece, k.at, k.pivot, mirrored), on = piece.spOnPiece(k.u, k.v), uv = (on && piece.uvOf(on)) ?? [k.u, k.v];
					this.knobs.push({ ...k, key: k.id + (mirrored ? '~m' : ''), mirrored, sheet, du: k.u - sheet.u, dv: k.v - sheet.v, uGrab: uv[0], vGrab: uv[1] });
					continue;
				}
				const on = piece.spOnPiece(k.u, k.v);
				if (!on) continue;
				const P = new Float32Array(12), sp = put(on, mirrored, P, 0), uv = piece.uvOf(on) ?? [k.u, k.v];
				// a second point, to see which way the knob's direction runs on the screen
				if (k.dir !== undefined) { const e = 0.01, q = piece.spAt(uv[0] + e * Math.cos(k.dir), uv[1] + e * Math.sin(k.dir)); if (q) put(q, mirrored, P, 6); else P[6] = NaN; } else P[6] = NaN;
				this.knobs.push({ ...k, key: k.id + (mirrored ? '~m' : ''), mirrored, sp, P, uGrab: uv[0], vGrab: uv[1] });
			}
		}
		this.syncKnobs();
	}

	// The sheet a shape is drawn on: where its middle meets the piece, and the cloth's two ways there as they run in
	// the body (a metre of cloth is a metre on the sheet). A middle off the piece: from the nearest place on it.
	sheetOf(piece, at, pivot, mirrored) {
		const key = `${at[0]},${at[1]},${pivot},${mirrored}`;
		let sheet = this.sheets.get(key);
		if (sheet) return sheet;
		const on = piece.spOnPiece(at[0], at[1]), [u, v] = (on && piece.uvOf(on)) ?? at, surf = this.engine.surf, O = new THREE.Vector3(), N = new THREE.Vector3(), p = new THREE.Vector3(), n = new THREE.Vector3();
		this.overlay.placeWithNormal(on, O, N, LIFT);
		const way = (du, dv) => {
			const out = new THREE.Vector3();
			for (const sg of [1, -1]) {
				const q = piece.spAt(u + sg * du * REACH, v + sg * dv * REACH);
				if (!q) continue;
				this.overlay.placeWithNormal(q, p, n, LIFT);
				// (across the seam of a tube the flat piece's neighbour is on the far side of it)
				if (p.distanceTo(O) < REACH * 2) out.addScaledVector(p.sub(O), sg);
			}
			return out.addScaledVector(N, -out.dot(N));
		};
		const Eu = way(1, 0), Ev = way(0, 1);
		if (Eu.lengthSq() < 1e-10) Eu.crossVectors(Ev, N);
		Eu.normalize();
		Ev.addScaledVector(Eu, -Ev.dot(Eu));
		if (Ev.lengthSq() < 1e-10) Ev.crossVectors(N, Eu);
		Ev.normalize();
		if (mirrored) {
			this.overlay.placeWithNormal(mirrorFast(surf, on), O, n, LIFT);
			for (const e of [Eu, Ev, N]) e.x = -e.x;
		}
		sheet = { u, v, O, N, Eu, Ev, Bu: Eu.clone(), Bv: Ev.clone(), pivot, shows: true };
		this.sheets.set(key, sheet);
		return sheet;
	}
	// A sheet as the view now has it: whether it shows, and for a box, turned about its length to face the view.
	aim(sheet, cx, cy, cz) {
		const O = sheet.O, vx = cx - O.x, vy = cy - O.y, vz = cz - O.z, len = Math.hypot(vx, vy, vz) || 1, N = sheet.N;
		sheet.shows = (N.x * vx + N.y * vy + N.z * vz) / len > AWAY;
		if (sheet.pivot === undefined) return;
		const ca = Math.cos(sheet.pivot), sa = Math.sin(sheet.pivot), E = sheet.Eu, F = sheet.Ev;
		const ax = ca * E.x + sa * F.x, ay = ca * E.y + sa * F.y, az = ca * E.z + sa * F.z, bx = ca * F.x - sa * E.x, by = ca * F.y - sa * E.y, bz = ca * F.z - sa * E.z;
		let px = ay * vz - az * vy, py = az * vx - ax * vz, pz = ax * vy - ay * vx, l = Math.hypot(px, py, pz);
		// (looking straight down its length it has no way to turn: it stays as it lies)
		if (l < 1e-3 * len) { px = bx; py = by; pz = bz; l = 1; } else if (px * bx + py * by + pz * bz < 0) l = -l;
		px /= l; py /= l; pz /= l;
		sheet.Bu.set(ca * ax - sa * px, ca * ay - sa * py, ca * az - sa * pz);
		sheet.Bv.set(sa * ax + ca * px, sa * ay + ca * py, sa * az + ca * pz);
	}
	// A drag on a sheet: from pixels moved to cloth moved, as the sheet lay on the screen when it was grabbed. Edge-on, a
	// way that hardly shows on the screen is one the pointer hardly moves.
	dragMap(k) {
		const s = k.sheet;
		if (!s) return null;
		const vp = this.engine.viewport, cam = vp.camera, w = vp.renderer.domElement.clientWidth, h = vp.renderer.domElement.clientHeight, a = new THREE.Vector3(), M = vp.world.matrixWorld;
		const at = (B) => { a.copy(s.O).addScaledVector(s.Bu, k.du).addScaledVector(s.Bv, k.dv); if (B) a.addScaledVector(B, 0.01); a.applyMatrix4(M).project(cam); return [(a.x * 0.5 + 0.5) * w, (0.5 - a.y * 0.5) * h]; };
		const o = at(), e = at(s.Bu), f = at(s.Bv), j00 = (e[0] - o[0]) / 0.01, j10 = (e[1] - o[1]) / 0.01, j01 = (f[0] - o[0]) / 0.01, j11 = (f[1] - o[1]) / 0.01;
		const a00 = j00 * j00 + j10 * j10, a01 = j00 * j01 + j10 * j11, a11 = j01 * j01 + j11 * j11, soft = 4e-4 * (a00 + a11) + 1e-9, p = a00 + soft, q = a11 + soft, det = p * q - a01 * a01;
		return [(q * j00 - a01 * j01) / det, (q * j10 - a01 * j11) / det, (p * j01 - a01 * j00) / det, (p * j11 - a01 * j10) / det];
	}

	// One element per knob, kept for as long as it is there.
	syncKnobs() {
		const want = new Set(this.knobs.map((k) => k.key));
		for (const [key, e] of this.knobEls) if (!want.has(key)) { e.remove(); this.knobEls.delete(key); }
		for (const k of this.knobs) {
			let e = this.knobEls.get(k.key);
			if (!e) {
				e = el('g', { class: 'gz-knob' });
				const hit = el('circle', { class: 'gz-hit', r: 22 }), disc = el('circle', { class: 'gz-disc' }), glyph = el('path', { class: 'gz-glyph' }), title = el('title');
				e.append(hit, disc, glyph, title);
				e._glyph = glyph; e._disc = disc; e._title = title;
				e.addEventListener('pointerdown', (ev) => {
					if (ev.button !== 0) return;
					ev.preventDefault(); ev.stopPropagation();
					const now = this.knobs.find((q) => q.key === e._key);
					if (!now) return;
					if (now.pick) this.onPick?.(now.pick); else this.onGrab?.(now, ev);
				});
				// the wheel still zooms over a knob
				e.addEventListener('wheel', (ev) => { this.engine.viewport.renderer.domElement.dispatchEvent(new WheelEvent('wheel', ev)); ev.preventDefault(); }, { passive: false });
				this.knobGroup.appendChild(e);
				this.knobEls.set(k.key, e);
			}
			e._key = k.key;
			e.setAttribute('class', `gz-knob tone-${k.tone} icon-${k.icon} ${k.big ? 'big' : ''} ${k.small ? 'small' : ''} ${k.mirrored ? 'mirrored' : ''} ${this.grabbed === k.key ? 'grabbed' : ''}`);
			e.style.cursor = k.cursor ?? 'pointer';
			e._disc.setAttribute('r', k.small ? 7 : k.big ? 15 : 12);
			e._glyph.setAttribute('d', GLYPHS[k.icon] ?? '');
			e.style.setProperty('--tone', TONES[k.tone] ?? '#fff');
			e._title.textContent = k.title ?? '';
		}
	}

	// The lines' styles: a dark casing under a light core, so they read on any cloth.
	pathFor(line) {
		const style = `${line.tone}:${line.width}:${line.faint ? 1 : 0}:${line.dash ? 1 : 0}:${line.mirrored ? 1 : 0}`;
		let p = this.paths.get(style);
		if (!p) {
			const dash = line.dash ? '5 4' : null, attrs = (w, col, op) => ({ fill: 'none', stroke: col, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: op * (line.mirrored ? 0.6 : 1), ...(dash ? { 'stroke-dasharray': dash } : {}) });
			p = { casing: el('path', attrs(line.width + 2, '#0c0b0a', line.faint ? 0.3 : 0.55)), core: el('path', attrs(line.width, TONES[line.tone] ?? '#fff', line.faint ? 0.75 : 1)), d: [] };
			this.lineGroup.append(p.casing, p.core);
			this.paths.set(style, p);
		}
		return p;
	}

	// Project what is there onto the screen; nothing to do while nothing has changed.
	frame() {
		if (this.stale) this.build();
		const engine = this.engine, vp = engine.viewport, cam = vp.camera, canvas = vp.renderer.domElement, w = canvas.clientWidth, h = canvas.clientHeight;
		const me = cam.matrixWorld.elements, sig = `${me[12]},${me[13]},${me[14]},${me[0]},${me[5]},${me[10]},${w},${h},${vp.world.matrixWorld.elements[0]}`;
		if (sig === this.sig && !this.dirty) return;
		this.sig = sig;
		// zoomed well in or out: lay the knobs out again for it
		if (this.gen && !this.grabbed && this.pxPerM) { const s = this.scale(); if (s > this.pxPerM * 1.25 || s < this.pxPerM / 1.25) this.build(); }
		this.dirty = false;
		cam.updateMatrixWorld();
		vp.world.updateMatrixWorld();
		const M = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).multiply(vp.world.matrixWorld).elements, W = vp.world.matrixWorld.elements;
		const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
		if (this.sheets) for (const sheet of this.sheets.values()) this.aim(sheet, (cx - W[12]) / W[0], (cy - W[13]) / W[5], (cz - W[14]) / W[10]);
		const project = (x, y, z, out) => {
			const iw = 1 / (M[3] * x + M[7] * y + M[11] * z + M[15]);
			out[0] = ((M[0] * x + M[4] * y + M[8] * z + M[12]) * iw * 0.5 + 0.5) * w;
			out[1] = (0.5 - (M[1] * x + M[5] * y + M[9] * z + M[13]) * iw * 0.5) * h;
			out[2] = iw > 0 ? 1 : 0;
		};
		const facing = (P, o) => {
			const x = W[0] * P[o] + W[12], y = W[5] * P[o + 1] + W[13], z = W[10] * P[o + 2] + W[14];
			return P[o + 3] * (cx - x) + P[o + 4] * (cy - y) + P[o + 5] * (cz - z) > -0.012;
		};
		for (const p of this.paths.values()) p.d.length = 0;
		const s = [0, 0, 0];
		for (const L of this.lines) {
			const p = this.pathFor(L), P = L.P;
			let open = false;
			if (L.sheet) {
				const { O, Bu, Bv, shows } = L.sheet, Q = L.Q;
				if (shows) for (let i = 0; i < L.n; i++) {
					const a = Q[i * 2], b = Q[i * 2 + 1];
					project(O.x + a * Bu.x + b * Bv.x, O.y + a * Bu.y + b * Bv.y, O.z + a * Bu.z + b * Bv.z, s);
					if (!s[2]) { open = false; continue; }
					p.d.push((open ? 'L' : 'M') + s[0].toFixed(1) + ' ' + s[1].toFixed(1));
					open = true;
				}
				continue;
			}
			for (let i = 0; i < L.n; i++) {
				const o = i * 6;
				if (L.pairs && i % 2 === 0) open = false;
				if (L.off[i] || !facing(P, o)) { open = false; continue; }
				project(P[o], P[o + 1], P[o + 2], s);
				if (!s[2]) { open = false; continue; }
				p.d.push((open ? 'L' : 'M') + s[0].toFixed(1) + ' ' + s[1].toFixed(1));
				open = true;
			}
		}
		for (const p of this.paths.values()) { const d = p.d.join(''); p.casing.setAttribute('d', d); p.core.setAttribute('d', d); }
		const t = [0, 0, 0], on = [];
		for (const k of this.knobs) {
			const e = this.knobEls.get(k.key);
			if (!e) continue;
			if (k.sheet) {
				const { O, Bu, Bv, shows } = k.sheet, a = k.du, b = k.dv;
				project(O.x + a * Bu.x + b * Bv.x, O.y + a * Bu.y + b * Bv.y, O.z + a * Bu.z + b * Bv.z, s);
				if (!s[2] || (!shows && this.grabbed !== k.key)) { e.style.display = 'none'; continue; }
				e.style.display = '';
				k.px = k.sx = s[0]; k.py = k.sy = s[1];
				k.rot = 0;
				if (k.dir !== undefined) {
					const a2 = a + 0.01 * Math.cos(k.dir), b2 = b + 0.01 * Math.sin(k.dir);
					project(O.x + a2 * Bu.x + b2 * Bv.x, O.y + a2 * Bu.y + b2 * Bv.y, O.z + a2 * Bu.z + b2 * Bv.z, t);
					if (t[2]) k.rot = (Math.atan2(t[1] - s[1], t[0] - s[0]) * 180) / Math.PI;
				}
				on.push(k);
				continue;
			}
			const P = k.P;
			project(P[0], P[1], P[2], s);
			// a held knob stays; the far side of the body has none to grab
			if (!s[2] || (!facing(P, 0) && this.grabbed !== k.key)) { e.style.display = 'none'; continue; }
			e.style.display = '';
			k.px = k.sx = s[0]; k.py = k.sy = s[1];
			k.rot = 0;
			if (!Number.isNaN(P[6])) { project(P[6], P[7], P[8], t); if (t[2]) k.rot = (Math.atan2(t[1] - s[1], t[0] - s[0]) * 180) / Math.PI; }
			on.push(k);
		}
		// knobs that would lie on each other are eased apart, the small ones most; a drag still starts from a knob's true place
		const reach = (k) => (k.small ? 9 : k.big ? 17 : 14);
		for (let pass = 0; pass < 4; pass++) for (let i = 0; i < on.length; i++) for (let j = i + 1; j < on.length; j++) {
			const a = on[i], b = on[j];
			let dx = b.sx - a.sx, dy = b.sy - a.sy, d = Math.hypot(dx, dy);
			const want = reach(a) + reach(b) + 3;
			if (d >= want) continue;
			if (d < 0.01) { dx = Math.cos(i + j); dy = Math.sin(i + j); d = 1; }
			const push = (want - d) / d, wa = a.big ? 0.15 : b.big ? 0.85 : 0.5;
			a.sx -= dx * push * wa; a.sy -= dy * push * wa;
			b.sx += dx * push * (1 - wa); b.sy += dy * push * (1 - wa);
		}
		for (const k of on) {
			const e = this.knobEls.get(k.key);
			e.setAttribute('transform', `translate(${k.sx.toFixed(1)} ${k.sy.toFixed(1)})`);
			e._glyph.setAttribute('transform', `rotate(${k.rot.toFixed(1)})`);
		}
		if (this.grabbed) { const k = this.knobs.find((q) => q.key === this.grabbed); if (k?.sx !== undefined) { this.readout.style.left = k.sx + 'px'; this.readout.style.top = k.sy + 'px'; } }
	}

	// While a knob is held: which, and what it now reads.
	hold(key, text = '') {
		this.grabbed = key;
		this.readout.textContent = text;
		this.readout.classList.toggle('on', !!key && !!text);
		for (const [k, e] of this.knobEls) e.classList.toggle('grabbed', k === key);
		this.dirty = true;
	}
}
