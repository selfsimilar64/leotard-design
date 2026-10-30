// Viewport tools: what a pointer does in the 3D view for the active tool. Every edit is a
// command (app.exec), so tools add nothing the scripting surface lacks.
//   move    left-drag orbits; a click (no drag) selects what is under it (a stone or its group, a
//           line, a strap, a logo, a piece), and a mouse or pencil hovering shows what that would
//           be; over a control point of the selected line the drag moves that point instead (it
//           slides on the body; one undo step); Alt-click a line to add a point; C toggles
//           corner/smooth on the last point touched; Delete removes it (or the line)
//   pen     click to place points (Shift = corner); click the first point to close; click on
//           another line to end there (the end stays attached); Enter or double-click finishes;
//           Esc cancels
//   strap   like the pen, but the line becomes a strap
//   stones, single, erase   stone generators, one stone, the eraser (options in the panel)
//   pattern a click on a piece lays the pattern chosen in the panel; in Select, a chosen pattern's
//           handles (render/gizmo.js) move, turn and scale it and set its gradient, live
//   decal   click the body to place a logo or lettering (options in the panel), or to move the
//           one being moved (toolOptions.moveDecal)
//   eyedrop (from the piece's match-colour button) while looking through a reference photo, click the photo
//           where the piece is: its colour is matched to it under the rig
// In every tool but move, right-drag orbits, middle-drag pans and the wheel zooms (two fingers on a
// touch screen).
import * as THREE from 'three';
import { signal } from '@preact/signals';
import { tool, selection, notify, hideOverlay, edit, stonesRun } from './state.js';
import { fromSP, toSP } from '../body/surface.js';
import { evaluateCurve } from '../curves/evaluate.js';
import { mirrorSP } from '../curves/points.js';
import { panelAt } from '../garment/build.js';
import { symmetryOn } from '../doc/symmetry.js';
import { sizeOf } from '../stones/library.js';
import { viewTo } from './camera.js';
import { GALLERY_ITEMS } from '../stones/layouts.js';
import { mirrorFast } from '../stones/cloth.js';
import { patternParams, minScale } from '../stones/pattern.js';

// Mirror on: a part this close to the centre is one part, not a pair (metres).
const CENTRE = 0.006;
// Mirror on: control points of a line across the centre this close to each other's mirror image
// move together (metres).
const MATE = 0.008;

export const toolOptions = signal({
	penRole: 'seam', strapWidth: 0.01,
	swatch: { fabric: 'mystique', colour: '#2b1d6e', second: 'Tone-on-tone' },
	stone: { stone: 'Crystal AB', size: 'ss12', shape: 'round', rows: 1, offset: 0.004, gap: 1.15, fill: 'random', eraseR: 0.004 },
	decal: { text: 'Name', font: 'Segoe Script', size: 0.08, look: 'print', colour: '#ffffff', rotate: 0 },
	pattern: 'fade-linear', // the gallery's entry a click lays (stones/layouts.js)
});

const tenth = (v) => Math.round(v * 1e4) / 1e4; // of a millimetre
const HANDLE_CURSOR = { move: 'move', rotate: 'grab', scale: 'nwse-resize', ga: 'crosshair', gb: 'crosshair' };

export class ToolController {
	constructor(app, engine) {
		this.app = app; this.engine = engine;
		this.el = engine.viewport.renderer.domElement;
		this.pen = null;      // { points: [{ sp, kind, on? }] }
		this.drag = null;     // { curve, i, mirrored, gesture }
		this.active = null;   // { curve, i } last control point touched
		this.gestureN = 0;
		const el = this.el;
		el.addEventListener('pointerdown', (e) => this.down(e));
		el.addEventListener('pointermove', (e) => this.move(e));
		el.addEventListener('pointerup', (e) => this.up(e));
		el.addEventListener('pointerleave', () => this.clearHover());
		// a double click (or tap) finishes a line; in Select it fits the leotard in view
		el.addEventListener('dblclick', (e) => { if (tool.value === 'pen' || tool.value === 'strap') { e.preventDefault(); this.finishPen(); } else if (tool.value === 'move') viewTo('fit'); });
		el.addEventListener('contextmenu', (e) => e.preventDefault());
		window.addEventListener('keydown', (e) => this.key(e));
		tool.subscribe((t) => this.onTool(t));
		selection.subscribe(() => this.refreshOverlay());
		// a piece glows briefly as it is chosen
		let last = null;
		selection.subscribe((s) => { if (s?.kind === 'panels' && s.id !== last) this.flashPiece(s); last = s?.id ?? null; });
		hideOverlay.subscribe(() => this.refreshOverlay());
		app.onChange((touched) => {
			if (touched.has('symmetry')) { this.refreshOverlay(); this.previewPen(null); }
			if (touched.has('stones') || touched.has('curves') || touched.has('panels')) this.refreshHandles();
		});
		engine.onStones = () => { stonesRun.value++; this.refreshHandles(); }; // (also when a piece's flat shape arrives)
	}

	get mirrorOn() { return symmetryOn(this.app.doc); }

	// A chosen piece glows; with Mirror off, a paired piece glows only on the side an edit will change.
	flashPiece(s) {
		const p = this.app.doc.panels.find((x) => x.id === s.id);
		if (p?.mirror === 'both' && !this.mirrorOn && this.engine.g) {
			const sp = fromSP(p.seed);
			if (this.engine.flashCell(s.side === 'm' ? mirrorSP(sp, this.engine.surf) : sp, p.layer ?? 'L0')) return;
		}
		this.engine.flashPanel(s.id);
	}

	onTool(t) {
		const c = this.engine.viewport.controls;
		c.mouseButtons = t === 'move'
			? { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
			: { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
		// on a touch screen one finger turns the view in Select; in the other tools it draws or
		// places, and two fingers turn and zoom
		c.touches = t === 'move' ? { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN } : { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE };
		c.enabled = true;
		if (t !== 'pen' && t !== 'strap') this.cancelPen();
		if (t === 'pattern' && selection.value?.kind === 'stones') selection.value = null;
		this.clearHover();
		if (t !== 'decal' && toolOptions.value.moveDecal) toolOptions.value = { ...toolOptions.value, moveDecal: null };
		this.el.style.cursor = t === 'move' ? 'grab' : t === 'pen' || t === 'strap' || t === 'eyedrop' || t === 'pattern' ? 'crosshair' : 'default';
		this.engine.overlay.setCursor(null);
		this.refreshOverlay();
	}

	refreshOverlay() {
		const sel = selection.value, on = this.mirrorOn;
		// drawing needs to see the line, so the pen and strap tools show the overlay even when hidden
		this.engine.setUI({ selected: sel?.kind === 'curves' ? sel.id : null, showPoints: ['move', 'pen', 'strap'].includes(tool.value),
			hidden: hideOverlay.value && !['pen', 'strap'].includes(tool.value),
			// Mirror off: only the side an edit will change is highlighted
			selectedSide: on || sel?.kind !== 'curves' ? null : sel.side ?? 'own',
			// the centre line shows while working symmetrically: placing anything, or a line chosen
			centre: on && (tool.value !== 'move' || sel?.kind === 'curves') });
		this.refreshHandles();
	}

	// A chosen pattern's handles, in Select.
	refreshHandles() {
		const sel = selection.value, gen = sel?.kind === 'stones' && tool.value === 'move' ? this.app.doc.stones.find((g) => g.id === sel.id && g.kind === 'pattern') : null;
		this.engine.gizmo.show(gen ?? null);
	}

	// The flat-cloth point under the pointer for a handle being dragged: on the piece, directly; off it
	// (over another piece, past the body), carried on from the last good point. A tube of cloth is cut
	// along a seam, so crossing that seam would land on the far side of the flat piece: a point nowhere
	// near where the pointer is heading counts as off the piece too.
	clothPointer(x, y, d) {
		const surf = this.engine.surf, h = this.engine.pickAt(x, y);
		let uv = null;
		if (h?.sp) uv = d.piece.uvOf(d.mirrored ? mirrorFast(surf, h.sp) : h.sp);
		if (uv && Math.hypot(uv[0] - d.lastUv[0], uv[1] - d.lastUv[1]) > 0.02) {
			const p = this.carryOn(x, y, d);
			if (Math.hypot(uv[0] - p[0], uv[1] - p[1]) > 0.015) uv = null;
		}
		if (uv) { d.lastUv = uv; d.lastXY = [x, y]; return uv; }
		return this.carryOn(x, y, d);
	}
	// From the last good point, by how the cloth looks on the screen there.
	carryOn(x, y, d) {
		const engine = this.engine, surf = engine.surf;
		const at = (u, v) => { const sp = d.piece.spAt(u, v); return engine.toScreen(d.mirrored ? mirrorFast(surf, sp) : sp); };
		const e = 0.01, [u0, v0] = d.lastUv, o = at(u0, v0), a = at(u0 + e, v0), b = at(u0, v0 + e);
		const j00 = (a.x - o.x) / e, j10 = (a.y - o.y) / e, j01 = (b.x - o.x) / e, j11 = (b.y - o.y) / e, det = j00 * j11 - j01 * j10;
		if (Math.abs(det) < 1e-3) return d.lastUv;
		const dx = x - d.lastXY[0], dy = y - d.lastXY[1];
		return [u0 + (j11 * dx - j01 * dy) / det, v0 + (j00 * dy - j10 * dx) / det];
	}

	startHandle(k, e) {
		const sel = selection.value, gen = this.app.doc.stones.find((g) => g.id === sel?.id), piece = gen && this.engine.clothOf(gen.on?.panel)?.piece;
		if (!piece) return false;
		const P = patternParams(gen, piece);
		const d = this.hdrag = { kind: k.kind, mirrored: k.mirrored, id: gen.id, piece, gesture: 'pattern' + (++this.gestureN), x: P.x, y: P.y, rotate: P.rotate, scale: P.scale, minScale: Math.max(0.1, minScale(P)), ga: P.ga, gb: P.gb };
		// the drag starts at the handle's own place, whatever lies under the pointer; moves are relative to the grab
		const s = this.engine.toScreen(k.sp), [x, y] = this.xy(e);
		d.lastUv = [k.u, k.v]; d.lastXY = [s.x, s.y];
		[d.u0, d.v0] = this.clothPointer(x, y, d);
		this.engine.viewport.controls.enabled = false;
		this.el.setPointerCapture(e.pointerId);
		return true;
	}

	dragHandle(x, y, e) {
		const d = this.hdrag, uv = this.clothPointer(x, y, d), p = d.piece, m = 0.05, params = {};
		const ang = (u, v) => Math.atan2(v - d.y, u - d.x);
		switch (d.kind) {
			case 'move': // from where it was grabbed, kept where its handle can still be reached
				params.x = tenth(Math.max(p.x0 - m, Math.min(p.x1 + m, d.x + uv[0] - d.u0)));
				params.y = tenth(Math.max(p.y0 - m, Math.min(p.y1 + m, d.y + uv[1] - d.v0)));
				break;
			case 'rotate': {
				let a = d.rotate + ((ang(uv[0], uv[1]) - ang(d.u0, d.v0)) * 180) / Math.PI;
				a = ((a + 180) % 360 + 360) % 360 - 180;
				params.rotate = e.shiftKey ? Math.round(a / 15) * 15 : Math.round(a * 10) / 10;
				break;
			}
			case 'scale': {
				const r0 = Math.hypot(d.u0 - d.x, d.v0 - d.y) || 1e-3;
				params.scale = Math.round(Math.max(d.minScale, Math.min(8, (d.scale * Math.hypot(uv[0] - d.x, uv[1] - d.y)) / r0)) * 1000) / 1000;
				break;
			}
			// from where they were grabbed: a handle held at the piece's edge may stand for a point past it
			case 'ga': params.ga = [tenth(d.ga[0] + uv[0] - d.u0), tenth(d.ga[1] + uv[1] - d.v0)]; params.gb = d.gb; break;
			case 'gb': params.gb = [tenth(d.gb[0] + uv[0] - d.u0), tenth(d.gb[1] + uv[1] - d.v0)]; params.ga = d.ga; break;
		}
		this.runEdit({ op: 'stones.set', id: d.id, params, gesture: d.gesture }, d.mirrored ? 'm' : undefined);
		// Mirror off: the first move split the group from its pair; the drag carries on with this side's
		const now = selection.value?.id;
		if (now && now !== d.id) d.id = now;
	}

	placePattern(h) {
		const item = GALLERY_ITEMS.get(toolOptions.value.pattern) ?? GALLERY_ITEMS.get('fade-linear'), st = toolOptions.value.stone;
		const id = this.run({ op: 'stones.add', kind: 'pattern', on: { panel: h.panel }, stone: st.stone, shape: st.shape, ...this.pieceSymmetry(h), ...(h.layer && h.layer !== 'L0' ? { layer: h.layer } : {}), name: item.label, params: this.patternAt(h, item) });
		if (id) { selection.value = { kind: 'stones', id }; tool.value = 'move'; }
	}
	// A new pattern's parameters: its gallery entry, the crystal chosen in the panel, centred where it was clicked.
	patternAt(h, item) {
		const st = toolOptions.value.stone, piece = this.engine.clothOf(h.panel)?.piece, uv = piece?.uvOf(h.sp), P = { layout: item.layout, preset: item.key, size: st.size, gap: Math.max(st.gap, 1.05), ...item.params };
		if (uv) {
			P.x = tenth(uv[0]); P.y = tenth(uv[1]);
			// a gradient that grows from a point grows from here
			if (['radial', 'oval', 'diamond', 'square', 'angular', 'spiral', 'ripple'].includes(P.gradient)) { P.ga = [P.x, P.y]; P.gb = [P.x, P.y - Math.min(0.14, (piece.y1 - piece.y0) * 0.4)]; }
		}
		return P;
	}

	xy(e) { const r = this.el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }

	run(cmd) { try { return this.app.exec(cmd); } catch (err) { notify(err.message, 'error'); return undefined; } }
	// an edit of something already on the leotard: follows the Mirror toggle (doc/symmetry.js)
	runEdit(cmd, side) { try { return edit(this.app, cmd, side); } catch (err) { notify(err.message, 'error'); return undefined; } }

	// Mirror on, a line that is not a pair (a neckline across the centre): the control point that is
	// point i's mirror image, and whether point i sits on the centre.
	mateOf(c, i) {
		if (!this.mirrorOn || c.mirror === 'both' || c.twin) return { mate: -1, centre: false };
		const e = this.engine.g?.evaluated.get(c.id), surf = this.engine.surf;
		if (!e) return { mate: -1, centre: false };
		const at = (k) => surf.pos(e.sps[e.ctrlIndex[k]]), p = at(i);
		if (Math.abs(p.x) < MATE / 2) return { mate: -1, centre: this.crosses(c.points.map((q) => ({ sp: fromSP(q.sp) }))) };
		const m = p.clone().setX(-p.x);
		let mate = -1, bd = MATE;
		e.ctrlIndex.forEach((_, k) => { if (k === i) return; const d = at(k).distanceTo(m); if (d < bd) { bd = d; mate = k; } });
		return { mate, centre: false };
	}
	// the same point held to the centre of the body
	onCentre(sp) { const surf = this.engine.surf, p = surf.pos(sp), q = surf.closest(p.setX(0)); return { f: q.f, b0: q.b0, b1: q.b1, b2: q.b2 }; }

	// does a set of points reach or cross the centre front/back? then it is one part, not a pair
	crosses(points) {
		const xs = points.map((p) => this.engine.surf.pos(p.sp).x);
		return xs.some((x) => Math.abs(x) < CENTRE) || (xs.some((x) => x > 0) && xs.some((x) => x < 0));
	}

	// control point of the selected curve (or its mirror image) under the cursor
	pointAt(x, y) {
		const sel = selection.value;
		if (sel?.kind !== 'curves' || !this.engine.g) return null;
		let best = null, bd = 10;
		for (const mirrored of [false, true]) {
			const e = this.engine.g.evaluated.get(sel.id + (mirrored ? '~m' : ''));
			if (!e) continue;
			e.ctrlIndex.forEach((si, i) => {
				const s = this.engine.toScreen(e.sps[si]);
				const d = Math.hypot(s.x - x, s.y - y);
				if (!s.behind && d < bd) { bd = d; best = { curve: sel.id, i, mirrored }; }
			});
		}
		return best;
	}

	down(e) {
		if (e.button !== 0) return;
		const t = tool.value, [x, y] = this.xy(e);
		if (t === 'move') {
			const k = this.engine.gizmo.hit(x, y);
			if (k && this.startHandle(k, e)) return;
			// over a control point of the selected line (the orbit controls were switched off on
			// hover, see move): drag it; otherwise remember the press: a click selects on release
			const p = this.pointAt(x, y);
			if (p) {
				const c = this.app.doc.curves.find((x) => x.id === p.curve);
				this.drag = { ...p, ...this.mateOf(c, p.i), gesture: 'drag' + (++this.gestureN) };
				this.active = { curve: p.curve, i: p.i };
				if (!this.mirrorOn && c.mirror === 'both') selection.value = { kind: 'curves', id: p.curve, side: p.mirrored ? 'm' : undefined };
				this.el.setPointerCapture(e.pointerId);
			} else this.press = { x, y, t: performance.now(), alt: e.altKey };
			return;
		}
		if (t === 'pen' || t === 'strap') { this.penClick(x, y, e.shiftKey); return; }
		if (t === 'eyedrop') { this.eyedrop(x, y); return; }
		if (t === 'decal') {
			const h = this.engine.pickAt(x, y);
			if (!h?.sp) return;
			// a placed logo being moved (its page's Move), or a new one
			const mv = toolOptions.value.moveDecal;
			if (mv) {
				toolOptions.value = { ...toolOptions.value, moveDecal: null };
				this.runEdit({ op: 'decal.set', id: mv, at: { sp: toSP(h.sp) }, layer: h.layer ?? 'L0' });
				selection.value = { kind: 'decals', id: mv }; tool.value = 'move';
				return;
			}
			// lettering on the centre is one piece; anywhere else Mirror places its pair too
			const d = toolOptions.value.decal, mirror = this.mirrorOn && Math.abs(this.engine.surf.pos(h.sp).x) > (d.size ?? 0.08) / 2 ? 'both' : 'none';
			const id = this.run({ op: 'decal.add', at: { sp: toSP(h.sp) }, ...d, layer: h.layer ?? 'L0', mirror });
			if (id) { selection.value = { kind: 'decals', id }; tool.value = 'move'; }
			return;
		}
		if (t === 'pattern') {
			const h = this.engine.pickAt(x, y);
			if (h?.panel) this.placePattern(h); else notify('Click a piece of the leotard', 'info');
			return;
		}
		if (t === 'stones' || t === 'single' || t === 'erase') {
			const st = toolOptions.value.stone, h = this.engine.pickAt(x, y);
			if (t === 'stones') {
				// a line under the cursor gets rows along it; otherwise the panel gets a fill
				const c = this.engine.curveAt(x, y, 8);
				let id;
				if (c) id = this.run({ op: 'stones.add', kind: 'row', on: { curve: c.curve }, stone: st.stone, shape: st.shape, ...this.lineSymmetry(c), params: { size: st.size, rows: st.rows, offset: st.offset, gap: st.gap } });
				else if (h?.panel) id = this.run({ op: 'stones.add', kind: 'pattern', on: { panel: h.panel }, stone: st.stone, shape: st.shape, ...this.pieceSymmetry(h), ...(h.layer && h.layer !== 'L0' ? { layer: h.layer } : {}), name: st.fill === 'contour' ? 'Rings along the edge' : 'Pavé', params: st.fill === 'contour' ? { layout: 'edgelines', preset: 'edge-rings', size: st.size, gap: st.gap, spacing: sizeOf(st.size) * 1.25 * Math.max(st.gap / 1.15, 1) } : { layout: 'scatter', preset: 'scatter', size: st.size, gap: st.gap } });
				if (id) selection.value = { kind: 'stones', id };
				return;
			}
			if (!h?.sp) return;
			const on = this.mirrorOn, sp = toSP(h.sp);
			if (t === 'single') {
				const across = Math.abs(this.engine.surf.pos(h.sp).x) < CENTRE; // on the centre: one stone
				this.run({ op: 'stone.place', at: { sp }, size: st.size, stone: st.stone, shape: st.shape, mirror: on && !across ? 'both' : 'none' });
			} else {
				// erasing is by place, so a mirrored group stays one group with a matching gap
				const at = { sp }, cmd = { op: 'stones.erase', at, r: st.eraseR };
				this.run(on ? [cmd, { ...cmd, at: { mirror: at } }] : cmd);
			}
			return;
		}
	}

	// What a new row of stones on a line does with the other side.
	lineSymmetry(hit) {
		const c = this.app.doc.curves.find((x) => x.id === hit.curve), e = this.engine.g?.evaluated.get(hit.key);
		if (c.mirror === 'both') {
			if (this.mirrorOn) return {}; // a row follows both sides of its line
			return { side: this.engine.surf.pos(e.sps[hit.sample]).x >= 0 ? 'left' : 'right' };
		}
		// a line split from its pair is on its own; a single line off to one side gets a mirrored row
		const pts = c.points.map((p) => ({ sp: fromSP(p.sp) }));
		return this.mirrorOn && !c.twin && !this.crosses(pts) ? { mirror: 'both' } : {};
	}
	// What a new fill of a piece does with the other side.
	pieceSymmetry(h) {
		const p = this.app.doc.panels.find((x) => x.id === h.panel), surf = this.engine.surf;
		if (p.mirror === 'both') return this.mirrorOn ? {} : { side: surf.pos(h.sp).x >= 0 ? 'left' : 'right' };
		if (!this.mirrorOn || p.twin) return {};
		// a piece across the centre fills as one; a single piece off to one side gets a mirrored fill
		const g = this.engine.layers.get(h.layer ?? 'L0')?.g;
		return g && panelAt(g, this.app.doc, surf, mirrorSP(h.sp, surf)) === p.id ? {} : { mirror: 'both' };
	}

	async eyedrop(x, y) {
		const vp = this.engine.viewport, ph = vp.photo, o = toolOptions.value.eyedrop;
		if (!ph || !o) { notify('Look through a reference photo first (app.lookThrough), then click the piece on the photo'); return; }
		const r = this.el.getBoundingClientRect(), c = ph.cam.crop ?? [0, 0, ...ph.size];
		const px = [c[0] + (x / r.width) * (c[2] - c[0]), c[1] + (y / r.height) * (c[3] - c[1])];
		try {
			const m = await this.app.matchColour({ panel: o.panel, ref: this.app.looking, px, layer: o.layer ?? 0 });
			notify(m.note ?? `Colour ${m.colour} (photo ${m.photo}${m.rendered ? ', matched under the lights' : ''})`, m.note ? 'error' : undefined);
		} catch (err) { notify(err.message, 'error'); }
		tool.value = 'move';
		selection.value = { kind: 'panels', id: o.panel };
	}

	cellAt(sp) { const g = this.engine.g; if (!g) return -1; const t = locateIn(g, this.engine.surf, sp); return t >= 0 ? g.arr.cellOf[t] : -1; }
	cellOf(p) { return this.engine.g?.seeds.find((s) => s.panel === p.id)?.cell ?? -1; }

	move(e) {
		const [x, y] = this.xy(e);
		if (this.hdrag) { this.dragHandle(x, y, e); return; }
		if (this.drag) {
			const h = this.engine.pickAt(x, y);
			if (!h?.sp) return;
			const d = this.drag, g = d.gesture, surf = this.engine.surf;
			const c = this.app.doc.curves.find((q) => q.id === d.curve);
			if (!this.mirrorOn && c.mirror === 'both') {
				// the first move splits the pair; the drag carries on with this side's own line
				const before = selection.value?.id;
				this.runEdit({ op: 'curve.movePoint', id: d.curve, i: d.i, to: { sp: toSP(h.sp) }, gesture: g }, d.mirrored ? 'm' : undefined);
				const now = selection.value?.id;
				if (now !== before) d.curve = now;
				if (this.active) this.active.curve = d.curve;
				d.mirrored = false;
				return;
			}
			const sp = d.centre ? this.onCentre(h.sp) : d.mirrored ? mirrorSP(h.sp, surf) : h.sp;
			const cmds = [{ op: 'curve.movePoint', id: d.curve, i: d.i, to: { sp: toSP(sp) }, gesture: g }];
			if (d.mate >= 0) cmds.push({ op: 'curve.movePoint', id: d.curve, i: d.mate, to: { sp: toSP(mirrorSP(sp, surf)) }, gesture: g });
			this.run(cmds.length > 1 ? cmds : cmds[0]);
			return;
		}
		if ((tool.value === 'pen' || tool.value === 'strap') && this.pen) {
			const h = this.engine.pickAt(x, y);
			if (h?.sp) this.previewPen(h.sp);
		}
		if (['single', 'erase', 'decal'].includes(tool.value)) {
			// where the mirrored copy will land
			const h = this.mirrorOn ? this.engine.pickAt(x, y) : null;
			this.engine.overlay.setCursor(h?.sp ? mirrorSP(h.sp, this.engine.surf) : null);
		}
		if (tool.value === 'move' && !this.press) {
			// the orbit controls act on the same pointer events before this tool does: switch them
			// off while the pointer is over a control point, so the press drags the point
			const knob = e.buttons ? null : this.engine.gizmo.hit(x, y), over = !!knob || !!this.pointAt(x, y);
			this.engine.gizmo.setHot(knob?.kind ?? null);
			this.engine.viewport.controls.enabled = !over;
			this.el.style.cursor = knob ? HANDLE_CURSOR[knob.kind] : over ? 'move' : 'grab';
			if (over || e.buttons || e.pointerType === 'touch') this.clearHover();
			else this.queueHover(x, y);
		} else if (this.press && Math.hypot(x - this.press.x, y - this.press.y) >= 5) this.clearHover(); // turning the view
	}

	// At most once a frame: the picks are not free.
	queueHover(x, y) {
		this.hoverAt = [x, y];
		this.hoverFrame ??= requestAnimationFrame(() => {
			this.hoverFrame = null;
			if (!this.hoverAt) return;
			const hit = this.engine.hitAt(...this.hoverAt);
			this.engine.setHover(hit);
			this.el.style.cursor = hit ? 'pointer' : 'grab';
		});
	}
	clearHover() {
		this.hoverAt = null;
		this.engine.setHover(null);
	}

	up(e) {
		if (this.hdrag) {
			this.hdrag = null;
			this.app.endGesture();
			this.engine.viewport.controls.enabled = true;
			try { this.el.releasePointerCapture(e.pointerId); } catch { /* already released */ }
			return;
		}
		// move: a click that did not turn the view picks the line or the piece under it (or
		// clears the choice); Alt-click on the selected line adds a point there
		const pr = this.press;
		this.press = null;
		if (pr && tool.value === 'move' && e.button === 0) {
			const [x, y] = this.xy(e);
			if (Math.hypot(x - pr.x, y - pr.y) < 5 && performance.now() - pr.t < 500) {
				const c = this.engine.curveAt(x, y);
				if (c && pr.alt && selection.value?.id === c.curve) this.insertPoint(c);
				else {
					const h = this.engine.hitAt(x, y), side = h?.kind === 'curves' ? h.mirrored : h?.kind === 'panels' ? this.pieceSide(h) : h?.kind === 'stones' ? this.stoneSide(h) : false;
					selection.value = h ? { kind: h.kind, id: h.id, ...(side ? { side: 'm' } : {}) } : null;
					if (h?.kind === 'curves') this.active = null;
				}
			}
		}
		if (this.drag) { this.drag = null; this.app.endGesture(); this.engine.viewport.controls.enabled = true; try { this.el.releasePointerCapture(e.pointerId); } catch { /* already released */ } }
	}

	// was this paired piece clicked on the side away from its seed (its mirror image)?
	pieceSide(h) {
		const p = this.app.doc.panels.find((x) => x.id === h.id), surf = this.engine.surf;
		return p?.mirror === 'both' && surf.pos(fromSP(p.seed)).x * surf.pos(h.sp).x < 0;
	}
	// was this stone of a paired group clicked on the side a split would put in the other record?
	// (doc/symmetry.js splitStones: the mirror image of a mirrored group; the wearer's right of a
	// group on a paired line or piece)
	stoneSide(h) {
		const g = this.app.doc.stones.find((x) => x.id === h.id);
		if (!g || !h.stone) return !!h.stone?.mirrored;
		return g.mirror === 'both' ? !!h.stone.mirrored : this.engine.surf.pos(h.stone.sp).x < 0;
	}

	key(e) {
		if (e.target.closest?.('input, select, textarea')) return;
		const k = e.key;
		if (tool.value === 'pen' || tool.value === 'strap') {
			if (k === 'Enter') { this.finishPen(); e.preventDefault(); }
			else if (k === 'Escape') this.cancelPen();
			else if (k === 'Backspace' && this.pen?.points.length) { this.pen.points.pop(); this.previewPen(null); e.preventDefault(); }
			return;
		}
		const sel = selection.value;
		if ((k === 'Delete' || k === 'Backspace') && sel?.kind === 'curves') {
			e.preventDefault();
			if (this.active && this.active.curve === sel.id) {
				const c = this.app.doc.curves.find((x) => x.id === sel.id), { mate } = this.mateOf(c, this.active.i), i = this.active.i;
				// a point and its mirror image go together, the later one first; a line keeps two points
				if (mate >= 0 && c.points.length > 3) this.run([Math.max(i, mate), Math.min(i, mate)].map((k) => ({ op: 'curve.removePoint', id: sel.id, i: k })));
				else this.runEdit({ op: 'curve.removePoint', id: sel.id, i });
				this.active = null;
			} else { this.runEdit({ op: 'curve.remove', id: sel.id }); selection.value = null; }
		}
		if ((k === 'c' || k === 'C') && this.active && sel?.kind === 'curves') {
			const c = this.app.doc.curves.find((x) => x.id === this.active.curve);
			const pt = c?.points[this.active.i];
			if (pt) {
				const kind = pt.kind === 'corner' ? 'smooth' : 'corner', { mate } = this.mateOf(c, this.active.i);
				this.runEdit({ op: 'curve.setKind', id: c.id, i: this.active.i, kind });
				if (mate >= 0) this.runEdit({ op: 'curve.setKind', id: c.id, i: mate, kind });
			}
		}
	}

	insertPoint(hit) {
		const e = this.engine.g.evaluated.get(hit.key), surf = this.engine.surf;
		const c = this.app.doc.curves.find((x) => x.id === hit.curve);
		// insert before the first control point that comes after this sample
		const before = (sample) => { const k = e.ctrlIndex.findIndex((si) => si > sample); return k < 0 ? e.ctrlIndex.length : k; };
		const i = before(hit.sample), off = !this.mirrorOn && c.mirror === 'both';
		const sp = hit.mirrored && !off ? mirrorSP(e.sps[hit.sample], surf) : e.sps[hit.sample];
		// Mirror on, a line across the centre: the same point on its other half
		if (this.mirrorOn && c.mirror !== 'both' && !c.twin && this.crosses(c.points.map((q) => ({ sp: fromSP(q.sp) })))) {
			const m = surf.pos(e.sps[hit.sample]), target = m.clone().setX(-m.x);
			let bs = -1, bd = Infinity;
			e.pts.forEach((q, s) => { const d = q.distanceToSquared(target); if (d < bd) { bd = d; bs = s; } });
			const j = before(bs);
			if (j !== i && Math.abs(m.x) > CENTRE) {
				const first = j > i ? { k: j, s: e.sps[bs] } : { k: i, s: sp }, second = j > i ? { k: i, s: sp } : { k: j, s: e.sps[bs] };
				this.run([first, second].map(({ k, s }) => ({ op: 'curve.insertPoint', id: hit.curve, i: k, at: { sp: toSP(s) } })));
				this.active = { curve: hit.curve, i: j > i ? i : i + 1 };
				return;
			}
		}
		this.runEdit({ op: 'curve.insertPoint', id: hit.curve, i, at: { sp: toSP(sp) } }, off && hit.mirrored ? 'm' : undefined);
		this.active = { curve: selection.value?.id ?? hit.curve, i };
	}

	// --- pen -----------------------------------------------------------------------------------
	penClick(x, y, corner) {
		const g = this.engine.g;
		const onCurve = this.engine.curveAt(x, y, 8);
		const h = this.engine.pickAt(x, y);
		if (!h?.sp && !onCurve) return;
		this.pen ??= { points: [] };
		const pts = this.pen.points;
		// close on the first point
		if (pts.length >= 3) {
			const s0 = this.engine.toScreen(pts[0].sp);
			if (Math.hypot(s0.x - x, s0.y - y) < 10) { this.finishPen(true); return; }
		}
		if (onCurve) {
			const e = g.evaluated.get(onCurve.key);
			const sp = e.sps[onCurve.sample];
			pts.push({ sp, kind: 'corner', on: { curve: onCurve.curve, t: onCurve.t, ...(onCurve.mirrored ? { mirror: true } : {}) } });
			if (pts.length >= 2) { this.finishPen(); return; }
		} else pts.push({ sp: h.sp, kind: corner ? 'corner' : 'smooth' });
		this.previewPen(null);
	}

	previewPen(cursorSp) {
		if (!this.pen) { this.engine.overlay.setPreview(null); return; }
		const pts = this.pen.points.map((p) => ({ sp: toSP(p.sp), kind: p.kind }));
		if (cursorSp) { pts.push({ sp: toSP(cursorSp), kind: 'smooth' }); this.penCursor = cursorSp; }
		else if (this.penCursor) pts.push({ sp: toSP(this.penCursor), kind: 'smooth' });
		const surf = this.engine.surf, curve = { points: pts, closed: false };
		if (pts.length < 2) { this.engine.overlay.setPreview(null); return; }
		// the mirrored copy shows as it is drawn, and disappears when the line reaches the centre
		const both = this.penMirror(pts.map((p) => ({ sp: fromSP(p.sp) }))) === 'both';
		this.engine.overlay.setPreview(evaluateCurve(curve, surf), both ? evaluateCurve(curve, surf, { mirror: (sp) => mirrorSP(sp, surf) }) : null);
	}

	// Mirror on: a line off to one side is drawn on both; a line reaching the centre stays one line.
	penMirror(points) { return this.mirrorOn && !this.crosses(points) ? 'both' : 'none'; }

	finishPen(closed = false) {
		const pen = this.pen;
		this.cancelPen();
		if (!pen || pen.points.length < 2) return;
		const opt = toolOptions.value, mirror = this.penMirror(pen.points);
		if (tool.value === 'strap') {
			const sw = opt.swatch;
			const sid = this.run({ op: 'strap.add', width: opt.strapWidth, mirror, fabric: sw.fabric, colour: sw.colour, second: sw.second,
				points: pen.points.map((p) => (p.on ? { at: { sp: toSP(p.sp) }, kind: p.kind, on: p.on } : { at: { sp: toSP(p.sp) }, kind: p.kind })) });
			if (sid) notify('Strap added');
			return;
		}
		const id = this.run({
			op: 'curve.add', role: opt.penRole, closed, mirror,
			points: pen.points.map((p) => (p.on ? { at: { sp: toSP(p.sp) }, kind: p.kind, on: p.on } : { at: { sp: toSP(p.sp) }, kind: p.kind })),
		});
		if (id) { selection.value = { kind: 'curves', id }; notify(`Line drawn (${mirror === 'both' ? 'mirrored' : 'one side'})`); }
	}

	cancelPen() { this.pen = null; this.penCursor = null; this.engine.overlay.setPreview(null); }
}

import { locate } from '../garment/arrangement.js';
function locateIn(g, surf, sp) { return locate(g.arr, surf, sp); }
