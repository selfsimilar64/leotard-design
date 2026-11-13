// Viewport tools: what a pointer does in the 3D view for the active tool. Every edit is a
// command (app.exec), so tools add nothing the scripting surface lacks.
//   move    left-drag orbits; a click (no drag) selects what is under it (a stone or its group, a
//           line, a strap, a logo, a piece), and a mouse or pencil hovering shows what that would
//           be; over a control point of the selected line the drag moves that point instead (it
//           slides on the body; one undo step); Alt-click a line to add a point; C toggles
//           corner/smooth on the last point touched; Delete removes it (or the line)
//   pen     click to place points (a press shows where, lifting places it; Shift = corner); click the
//           first point to close; click on another line to end there (the end stays attached);
//           Enter or double-click finishes; Esc cancels
//   strap   like the pen, but the line becomes a strap
//   overlay like the pen, but a line from one line to another waits, cutting nothing: the areas such
//           lines enclose tint, and a click on one makes the overlay piece
//           (knowledge/engineering/ux/one-drawing-grammar.md)
//   stones, single, erase   stone generators, one stone, the eraser (options in the Sparkle card)
//   pattern a click on a piece lays the pattern chosen in the Sparkle card; in Select, a chosen pattern's
//           handles (render/gizmo.js, stones/handles.js) change it and its modifiers, live
//   decal   click the body to place a logo or lettering (options in its card), or to move the
//           one being moved (toolOptions.moveDecal)
//   eyedrop (from the piece's match-colour button) while looking through a reference photo, click the photo
//           where the piece is: its colour is matched to it under the rig
// In every tool but move, right-drag orbits, middle-drag pans and the wheel zooms (two fingers on a
// touch screen).
import * as THREE from 'three';
import { signal } from '@preact/signals';
import { drawnLines, tool, selection, notify, hideOverlay, showHandles, patternFocus, edit, stonesRun, printsRun, prefs } from './state.js';
import { fromSP, toSP } from '../body/surface.js';
import { evaluateCurve } from '../curves/evaluate.js';
import { mirrorSP } from '../curves/points.js';
import { panelAt } from '../garment/build.js';
import { symmetryOn } from '../doc/symmetry.js';
import { sizeOf } from '../stones/library.js';
import { viewTo, flyTo } from './camera.js';
import { GALLERY_ITEMS, LAYOUTS, layoutDefaults } from '../stones/layouts.js';
import { mirrorFast } from '../stones/cloth.js';
import { presetMods } from '../stones/modifiers.js';
import { patternParams } from '../stones/pattern.js';
import { isDesign } from '../prints/designs.js';

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

export class ToolController {
	constructor(app, engine) {
		this.app = app; this.engine = engine;
		this.el = engine.viewport.renderer.domElement;
		this.pen = null;      // { points: [{ sp, kind, on? }] }
		this.penPress = null; // { id, corner }: a press that places a point when it lifts
		this.fingers = new Set(); // touch pointers down: a second one turns the view, so it cancels the press
		this.strokes = [];    // the overlay tool's finished lines: [{ raw: pen points, mirror }], waiting for an area to be picked
		this.regions = null;  // what they enclose: { g, base, picks, focus } (refreshRegions)
		this.drag = null;     // { curve, i, mirrored, gesture }
		this.active = null;   // { curve, i } last control point touched
		this.gestureN = 0;
		const el = this.el;
		el.addEventListener('pointerdown', (e) => this.down(e));
		el.addEventListener('pointermove', (e) => this.move(e));
		el.addEventListener('pointerup', (e) => this.up(e));
		el.addEventListener('pointercancel', (e) => { this.fingers.delete(e.pointerId); this.penPress = null; });
		el.addEventListener('pointerleave', () => { this.clearHover(); this.leaveDrawing(); });
		// a double click (or tap) finishes a line; in Select it fits the leotard in view (not the end of a double click that picked an area)
		el.addEventListener('dblclick', (e) => { if (isDrawing()) { e.preventDefault(); this.finishPen(); } else if (tool.value === 'move' && performance.now() - (this.pickedAt ?? -1e9) > 700) viewTo('fit'); });
		el.addEventListener('contextmenu', (e) => e.preventDefault());
		window.addEventListener('keydown', (e) => this.key(e));
		tool.subscribe((t) => this.onTool(t));
		selection.subscribe(() => this.refreshOverlay());
		// a pattern chosen from the list, on the far side of the body: the view turns to it, so its handles can be seen
		selection.subscribe((s) => { if (s?.kind === 'stones') this.faceChosen(s.id); });
		// a piece glows briefly as it is chosen
		let last = null;
		selection.subscribe((s) => { if (s?.kind === 'panels' && s.id !== last) this.flashPiece(s); last = s?.id ?? null; });
		hideOverlay.subscribe(() => this.refreshOverlay());
		app.onChange((touched) => {
			if (touched.has('symmetry')) {
				this.refreshOverlay(); this.previewPen(null);
				for (const s of this.strokes) s.mirror = this.penMirror(s.raw);
				this.refreshRegions();
			}
			if (touched.has('stones') || touched.has('curves') || touched.has('panels')) this.refreshHandles();
			if ((touched.has('curves') || touched.has('panels')) && this.strokes.length && !this.picking) this.refreshRegions();
		});
		engine.onStones = () => { stonesRun.value++; this.refreshHandles(); }; // (also when a piece's flat shape arrives)
		engine.prints.onDrawn = () => { printsRun.value++; };
		engine.gizmo.onGrab = (k, e) => this.startHandle(k, e);
		engine.gizmo.onPick = (id) => { patternFocus.value = id; };
		patternFocus.subscribe(() => this.refreshHandles());
		showHandles.subscribe(() => this.refreshHandles());
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
		if (!isDrawing()) this.cancelPen();
		else if (t !== 'overlay' && this.strokes.length) { this.strokes = []; this.refreshRegions(); }
		if (t === 'pattern' && selection.value?.kind === 'stones') selection.value = null;
		this.clearHover();
		if (t !== 'decal' && toolOptions.value.moveDecal) toolOptions.value = { ...toolOptions.value, moveDecal: null };
		this.el.style.cursor = t === 'move' ? 'grab' : isDrawing() || t === 'eyedrop' || t === 'pattern' ? 'crosshair' : 'default';
		this.engine.overlay.setCursor(null);
		this.refreshOverlay();
	}

	refreshOverlay() {
		const sel = selection.value, on = this.mirrorOn;
		// drawing needs to see the line, so the pen and strap tools show the overlay even when hidden
		this.engine.setUI({ selected: sel?.kind === 'curves' ? sel.id : null, showPoints: tool.value === 'move' || isDrawing(),
			hidden: hideOverlay.value && !isDrawing(),
			// Mirror off: only the side an edit will change is highlighted
			selectedSide: on || sel?.kind !== 'curves' ? null : sel.side ?? 'own',
			// the centre line shows while working symmetrically: placing anything, or a line chosen
			centre: on && (tool.value !== 'move' || sel?.kind === 'curves') });
		this.refreshHandles();
	}

	faceChosen(id) {
		const gen = this.app.doc.stones.find((g) => g.id === id && g.kind === 'pattern'), cloth = gen && this.engine.clothOf(gen.on?.panel), piece = cloth?.piece, vp = this.engine.viewport;
		if (!piece || !prefs.value.followCamera || vp.photo) return;
		const P = patternParams(gen, piece), own = piece.spOnPiece(P.x, P.y);
		if (!own) return;
		const at = new THREE.Vector3(), n = new THREE.Vector3(), sides = [own];
		if (cloth.paired || gen.mirror === 'both' || P.symmetric) sides.push(mirrorFast(this.engine.surf, own));
		for (const sp of sides) {
			this.engine.overlay.placeWithNormal(sp, at, n, 0);
			at.applyMatrix4(vp.world.matrixWorld);
			if (n.dot(vp.camera.position.clone().sub(at).normalize()) > 0.2) return;
		}
		const t = vp.controls.target, d = vp.camera.position.distanceTo(t), dir = n.setY(0.06).normalize();
		flyTo({ position: [t.x + dir.x * d, t.y + dir.y * d, t.z + dir.z * d], target: t.toArray() });
	}

	// A chosen pattern's handles, in Select.
	refreshHandles() {
		const sel = selection.value, gen = showHandles.value && sel?.kind === 'stones' && tool.value === 'move' ? this.app.doc.stones.find((g) => g.id === sel.id && g.kind === 'pattern') : null;
		this.engine.gizmo.show(gen ?? null, patternFocus.value);
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
		const d = this.hdrag = { knob: k, mirrored: k.mirrored, id: gen.id, piece, gesture: 'pattern' + (++this.gestureN) };
		// the drag starts at the handle's own place, whatever lies under the pointer; moves are relative to the grab
		const [x, y] = this.xy(e);
		d.lastUv = [k.uGrab, k.vGrab]; d.lastXY = [k.px ?? x, k.py ?? y];
		// a handle follows the pointer on its flat sheet; only what moves the middle of a shape, which lies on the cloth, goes by the cloth
		if (k.icon !== 'move' && k.sheet) { d.map = this.engine.gizmo.dragMap(k); d.x0 = x; d.y0 = y; d.u0 = k.u; d.v0 = k.v; }
		else [d.u0, d.v0] = this.clothPointer(x, y, d);
		this.engine.viewport.controls.enabled = false;
		this.el.setPointerCapture(e.pointerId);
		this.engine.gizmo.hold(k.key, k.read?.(patternParams(gen, piece)) ?? '');
		return true;
	}

	dragHandle(x, y, e) {
		const d = this.hdrag, uv = d.map ? [d.u0 + d.map[0] * (x - d.x0) + d.map[1] * (y - d.y0), d.v0 + d.map[2] * (x - d.x0) + d.map[3] * (y - d.y0)] : this.clothPointer(x, y, d), params = d.knob.drag({ u: uv[0], v: uv[1], u0: d.u0, v0: d.v0, shift: e.shiftKey, alt: e.altKey });
		this.runEdit({ op: 'stones.set', id: d.id, params, gesture: d.gesture }, d.mirrored ? 'm' : undefined);
		// Mirror off: the first move split the group from its pair; the drag carries on with this side's
		const now = selection.value?.id;
		if (now && now !== d.id) d.id = now;
		const gen = this.app.doc.stones.find((g) => g.id === d.id);
		if (gen) this.engine.gizmo.hold(d.knob.key, d.knob.read?.(patternParams(gen, d.piece)) ?? '');
	}

	// as: what it is made as (prints/designs.js madeAs), unless the preset is made a way of its own; none: a layout of lines and dots as crystals, and a design of colour
	// as both, print and crystals on it, since it is laid with the crystals' tool (a piece's own Print face lays it as print).
	placePattern(h, as = null) {
		const item = GALLERY_ITEMS.get(toolOptions.value.pattern) ?? GALLERY_ITEMS.get('fade-linear'), st = toolOptions.value.stone, made = item.params?.as ?? as ?? (isDesign(item.layout) ? 'both' : null);
		const id = this.run({ op: 'stones.add', kind: 'pattern', on: { panel: h.panel }, stone: st.stone, shape: st.shape, ...this.pieceSymmetry(h), ...(h.layer && h.layer !== 'L0' ? { layer: h.layer } : {}), name: item.label, params: { ...this.patternAt(h, item), ...(made ? { as: made } : {}) } });
		if (id) { selection.value = { kind: 'stones', id }; tool.value = 'move'; }
		return id;
	}
	// A new pattern's parameters: its preset, the crystal chosen in the Sparkle card. It lies in the middle of the piece
	// (a pattern that fills the piece, a gradient), or, for a design of its own size, where it was clicked.
	patternAt(h, item) {
		const st = toolOptions.value.stone, piece = this.engine.clothOf(h.panel)?.piece, uv = piece?.uvOf(h.sp), layout = LAYOUTS[item.layout];
		const P = { layout: item.layout, preset: item.key, size: st.size, gap: Math.max(st.gap, 1.05), ...layoutDefaults(item.layout), ...item.params, mods: presetMods(item) };
		if (uv && layout.own && !item.mods) {
			// (drawn to the piece's middle line, for a design meant to sit on it)
			const mid = (piece.x0 + piece.x1) / 2;
			P.x = Math.abs(uv[0] - mid) < 0.02 ? tenth(mid) : tenth(uv[0]); P.y = tenth(uv[1]);
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
		if (!this.mirrorOn || c.twin) return { mate: -1, centre: false };
		const e = this.engine.g?.evaluated.get(c.id), surf = this.engine.surf;
		if (!e) return { mate: -1, centre: false };
		const at = (k) => surf.pos(e.sps[e.ctrlIndex[k]]), p = at(i);
		if (c.mirror === 'both') return { mate: -1, centre: Math.abs(p.x) < CENTRE }; // where a line meets its mirror image, it stays
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
		if (e.pointerType === 'touch') { this.fingers.add(e.pointerId); if (this.fingers.size > 1) this.penPress = null; }
		if (e.button !== 0) return;
		const t = tool.value, [x, y] = this.xy(e);
		if (t === 'move') {
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
		// a press shows where the point will land or which area is meant, a slide adjusts it, lifting acts (up)
		if (isDrawing()) { if (this.fingers.size <= 1) { this.penPress = { id: e.pointerId, corner: e.shiftKey }; this.drawHover(x, y); } return; }
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
			const d = this.drag, g = d.gesture, surf = this.engine.surf;
			const c = this.app.doc.curves.find((q) => q.id === d.curve), held = c.points[d.i]?.on ? this.slideEnd(c, d, x, y) : null;
			const h = held ? null : this.engine.pickAt(x, y);
			if (!held && !h?.sp) return;
			if (!this.mirrorOn && c.mirror === 'both') {
				// the first move splits the pair; the drag carries on with this side's own line
				const before = selection.value?.id;
				this.runEdit({ op: 'curve.movePoint', id: d.curve, i: d.i, to: { sp: toSP(held?.sp ?? h.sp) }, ...(held ? { on: held.on } : {}), gesture: g }, d.mirrored ? 'm' : undefined);
				const now = selection.value?.id;
				if (now !== before) d.curve = now;
				if (this.active) this.active.curve = d.curve;
				d.mirrored = false;
				return;
			}
			const sp = held ? (d.mirrored ? mirrorSP(held.sp, surf) : held.sp) : d.centre ? this.onCentre(h.sp) : d.mirrored ? mirrorSP(h.sp, surf) : h.sp;
			const cmds = [{ op: 'curve.movePoint', id: d.curve, i: d.i, to: { sp: toSP(sp) }, ...(held ? { on: d.mirrored ? this.mirrorOnLine(held) : held.on } : {}), gesture: g }];
			if (d.mate >= 0) cmds.push({ op: 'curve.movePoint', id: d.curve, i: d.mate, to: { sp: toSP(mirrorSP(sp, surf)) }, gesture: g });
			this.run(cmds.length > 1 ? cmds : cmds[0]);
			return;
		}
		if (isDrawing()) this.queueDraw(x, y);
		if (['single', 'erase', 'decal'].includes(tool.value)) {
			// where the mirrored copy will land
			const h = this.mirrorOn ? this.engine.pickAt(x, y) : null;
			this.engine.overlay.setCursor(h?.sp ? mirrorSP(h.sp, this.engine.surf) : null);
		}
		if (tool.value === 'move' && !this.press) {
			// the orbit controls act on the same pointer events before this tool does: switch them
			// off while the pointer is over a control point, so the press drags the point
			const over = !!this.pointAt(x, y);
			this.engine.viewport.controls.enabled = !over;
			this.el.style.cursor = over ? 'move' : 'grab';
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
		this.fingers.delete(e.pointerId);
		const pp = this.penPress;
		if (pp?.id === e.pointerId) { this.penPress = null; const [x, y] = this.xy(e); this.penClick(x, y, pp.corner); return; }
		if (this.hdrag) {
			this.hdrag = null;
			this.engine.gizmo.hold(null);
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
		if (isDrawing()) {
			if (k === 'Enter') { this.finishPen(); e.preventDefault(); }
			else if (k === 'Escape') this.cancelPen();
			else if (k === 'Backspace') { this.undoLine(); e.preventDefault(); }
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
	// A lift (see down). The overlay tool with lines drawn and none under way: on a line it starts
	// another, in an area it picks that area. Anywhere else it adds a point.
	penClick(x, y, corner) {
		const overlay = tool.value === 'overlay', snap = this.snapAt(x, y);
		if (!snap) return;
		if (overlay && !this.pen && this.regions && !snap.on) { this.pickRegion(snap.sp); return; }
		if (this.regions) this.previewRegion(null);
		this.pen ??= { points: [] };
		const pts = this.pen.points, last = pts[pts.length - 1];
		if (last) {
			// (the second click of a double click, which finishes the line)
			const s = this.engine.toScreen(last.sp), n = this.engine.toScreen(snap.sp);
			if (Math.hypot(s.x - n.x, s.y - n.y) < 3) return;
		}
		// close on the first point
		if (pts.length >= 3) {
			const s0 = this.engine.toScreen(pts[0].sp);
			if (Math.hypot(s0.x - x, s0.y - y) < 10) { this.finishPen(true); return; }
		}
		if (snap.on) {
			pts.push({ sp: snap.sp, kind: 'corner', on: snap.on });
			// an overlay's line begun on a line ends on the next it meets, and waits for an area to be
			// picked; one begun in the open goes on past lines it meets; any other line ends there
			if (pts.length >= 2 && overlay) { if (pts[0].on) { this.addStroke(); return; } } else if (pts.length >= 2) { this.finishPen(); return; }
		} else pts.push({ sp: snap.sp, kind: corner ? 'corner' : 'smooth' });
		this.previewPen(null);
	}

	// Where a point placed at a screen position lands: { sp, on? (attached to a line), centre? }, or null
	// off the body. Mirror on, one near the centre goes on it, so the line meets its mirror image there.
	snapAt(x, y) {
		const engine = this.engine, doc = this.app.doc, lines = this.regions?.g.evaluated ?? engine.evaluated;
		// an overlay's lines enclose an area only with what cuts the shell, or with each other
		const only = tool.value === 'overlay' ? (e) => CUTTING.has(e.role) && (isStroke(e.curve) || (doc.curves.find((c) => c.id === e.curve)?.layer ?? 'L0') === 'L0') : null;
		const hit = engine.curveAt(x, y, 8, { lines, only });
		if (hit) {
			const e = lines.get(hit.key), i = this.mirrorOn ? this.centreSample(e, hit.sample, x, y) : hit.sample;
			return { sp: e.sps[i], on: { curve: hit.curve, t: e.s[i] / Math.max(e.s[e.s.length - 1], 1e-9), ...(hit.mirrored ? { mirror: true } : {}) } };
		}
		const h = engine.pickAt(x, y);
		if (!h?.sp) return null;
		if (!this.mirrorOn) return { sp: h.sp };
		const c = this.onCentre(h.sp), s = engine.toScreen(c);
		return Math.abs(engine.surf.pos(h.sp).x) < CENTRE || Math.hypot(s.x - x, s.y - y) < 8 ? { sp: c, centre: true } : { sp: h.sp };
	}
	// The sample of a line at the centre of the body, if the pointer is that close to it.
	centreSample(e, i, x, y) {
		let best = i;
		for (let k = Math.max(0, i - 16), n = Math.min(e.pts.length - 1, i + 16); k <= n; k++) if (Math.abs(e.pts[k].x) < Math.abs(e.pts[best].x)) best = k;
		if (Math.abs(e.pts[best].x) > 0.0015) return i;
		const s = this.engine.toScreen(e.sps[best]);
		return Math.abs(e.pts[i].x) < CENTRE || Math.hypot(s.x - x, s.y - y) < 8 ? best : i;
	}

	// An attached end being dragged follows its line under the pointer, and moves to another line it
	// comes near. It never lets go. -> { sp, on }, on the side being dragged.
	slideEnd(c, d, x, y) {
		const engine = this.engine, lines = engine.evaluated, on0 = c.points[d.i].on;
		const other = engine.curveAt(x, y, 8, { only: (e) => e.curve !== c.id && CUTTING.has(e.role) });
		let e, i = 0;
		if (other) { e = lines.get(other.key); i = other.sample; }
		else {
			const flip = on0.mirror ? !d.mirrored : d.mirrored;
			e = lines.get(on0.curve + (flip ? '~m' : '')) ?? lines.get(on0.curve);
			if (!e) return null;
			let bd = Infinity;
			for (let k = 0; k < e.sps.length; k += 2) { const s = engine.toScreen(e.sps[k]); if (s.behind) continue; const q = Math.hypot(s.x - x, s.y - y); if (q < bd) { bd = q; i = k; } }
		}
		if (this.mirrorOn) i = this.centreSample(e, i, x, y);
		return { sp: e.sps[i], on: { curve: e.curve, t: e.s[i] / Math.max(e.s[e.s.length - 1], 1e-9), ...(e.mirrored ? { mirror: true } : {}) } };
	}
	// The attachment of the mirror image of a point on a line (a line with no mirror image of its own
	// is symmetric: the nearest place on it).
	mirrorOnLine({ sp, on }) {
		const lines = this.engine.evaluated, surf = this.engine.surf;
		if (lines.has(on.curve + '~m')) return { curve: on.curve, t: on.t, ...(on.mirror ? {} : { mirror: true }) };
		const e = lines.get(on.curve), p = surf.pos(mirrorSP(sp, surf));
		let b = 0, bd = Infinity;
		e.pts.forEach((q, i) => { const d = q.distanceToSquared(p); if (d < bd) { bd = d; b = i; } });
		return { curve: on.curve, t: e.s[b] / Math.max(e.s[e.s.length - 1], 1e-9) };
	}

	// At most once a frame: the picks are not free.
	queueDraw(x, y) {
		this.drawAt = [x, y];
		this.drawFrame ??= requestAnimationFrame(() => {
			this.drawFrame = null;
			if (this.drawAt && isDrawing()) this.drawHover(...this.drawAt);
		});
	}
	// What a press or hover shows: the area a click would pick, or the line so far and a dot where the next point would attach.
	drawHover(x, y) {
		const snap = this.snapAt(x, y), overlay = this.engine.overlay;
		if (this.regions && !this.pen && !snap?.on) { overlay.setCursor(null); this.previewRegion(snap?.sp ?? null); return; }
		if (this.regions) this.previewRegion(null);
		overlay.setCursor(snap?.on || snap?.centre ? snap.sp : null);
		if (this.pen && snap) this.previewPen(snap.sp);
	}
	leaveDrawing() {
		this.drawAt = null;
		if (!isDrawing()) return;
		this.engine.overlay.setCursor(null);
		if (this.regions) this.previewRegion(null);
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

	// Mirror on: a line is drawn on both sides unless it really is one part. A line that only touches the
	// centre meets its own mirror image there.
	penMirror(points) { return this.mirrorOn && !this.straddles(points) ? 'both' : 'none'; }
	// has points clearly on both sides of the centre, or lies along it
	straddles(points) {
		const off = points.map((p) => this.engine.surf.pos(p.sp).x).filter((x) => Math.abs(x) >= CENTRE);
		return !off.length || (off.some((x) => x > 0) && off.some((x) => x < 0));
	}

	// The overlay tool: a line from one line to another waits here, cutting nothing, and the tool stays
	// on. The areas the lines enclose tint, the one under the pointer and its mirror image more
	// strongly, and a click on one makes the piece, with the existing seams round it as edges.
	strokePoints(points) { return points.map((p) => (p.on ? { at: { sp: toSP(p.sp) }, kind: p.kind, on: p.on } : { at: { sp: toSP(p.sp) }, kind: p.kind })); }
	addStroke() {
		const pen = this.pen;
		this.clearLine();
		this.strokes.push({ raw: pen.points, mirror: this.penMirror(pen.points) });
		this.refreshRegions();
	}
	undoLine() {
		if (this.pen?.points.length) {
			this.pen.points.pop();
			if (this.pen.points.length) this.previewPen(null); else this.clearLine();
		} else if (this.strokes.pop()) this.refreshRegions();
	}
	refreshRegions() {
		const engine = this.engine, overlay = engine.overlay, doc = this.app.doc, surf = engine.surf;
		if (!this.strokes.length) {
			this.regions = null;
			drawnLines.value = null;
			overlay.setDrawn(null); overlay.setRegions(null);
			if (!this.pen) overlay.setPreview(null);
			return;
		}
		const drawn = this.strokes.map((s) => ({ mirror: s.mirror, points: s.raw.map((p) => ({ sp: toSP(p.sp), kind: p.kind, ...(p.on ? { on: p.on } : {}) })) }));
		const g = strokeRegions(doc, surf, drawn, engine.evaluated), base = buildGarment(doc, surf, { prev: engine.g, layer: 'L0' }), picks = pickableRegions(g, base, doc, surf, drawn);
		this.regions = { g, base, picks, focus: -1 };
		drawnLines.value = { lines: drawn.length, areas: picks.size };
		overlay.setDrawn(drawn.flatMap((_, i) => [g.evaluated.get(strokeId(i)), g.evaluated.get(strokeId(i) + '~m')]).filter(Boolean));
		overlay.setRegions([...picks].map(([cell, r]) => ({ cell, hue: r.hue, sps: engine.cellSps(g.arr, cell) })));
	}
	cellOfRegion(sp) { const { g } = this.regions, t = sp ? locate(g.arr, this.engine.surf, sp) : -1; return t >= 0 ? g.arr.cellOf[t] : -1; }
	previewRegion(sp) {
		const r = this.regions, surf = this.engine.surf, overlay = this.engine.overlay, c = this.cellOfRegion(sp), pick = r.picks.get(c), focus = pick ? c : -1;
		if (focus === r.focus) return;
		r.focus = focus;
		const m = pick?.mirror ?? -1;
		overlay.focusRegions(pick ? [c, ...(m >= 0 ? [m] : [])] : []);
		overlay.setPreview(pick ? cellOutline(r.g.arr, surf, c) : null, m >= 0 ? cellOutline(r.g.arr, surf, m) : null);
	}
	pickRegion(sp) {
		const r = this.regions, c = this.cellOfRegion(sp), pick = r.picks.get(c);
		if (!pick) { notify(whyNotPickable(r.g, r.base, this.app.doc, this.engine.surf, c), 'info'); return; }
		this.picking = true;
		const pid = this.run({ op: 'overlay.add', at: { sp: toSP(sp) }, strokes: this.strokes.map((s) => ({ mirror: s.mirror, points: this.strokePoints(s.raw) })) });
		this.picking = false;
		if (!pid) return; // refused, with its reason shown: choose again
		this.cancelPen();
		this.pickedAt = performance.now();
		tool.value = 'move';
		selection.value = { kind: 'panels', id: pid };
		notify(pick.mirror >= 0 ? 'Overlay piece added on both sides: choose its material' : 'Overlay piece added: choose its material');
	}

	finishPen(closed = false) {
		const pen = this.pen, overlay = tool.value === 'overlay';
		// among lines already drawn, this one too has to end on a line
		if (overlay && this.regions && pen && !closed) {
			if (pen.points.length < 2) this.clearLine();
			else if (pen.points[pen.points.length - 1].on) this.addStroke();
			else notify('End this line on a seam or edge', 'info');
			return;
		}
		this.clearLine();
		if (!pen || pen.points.length < 2) return;
		const opt = toolOptions.value, mirror = this.penMirror(pen.points);
		if (overlay) {
			if (pen.points[0].on && pen.points[pen.points.length - 1].on && !closed) { this.pen = pen; this.addStroke(); return; }
			if (pen.points.length < 3) { notify('An overlay piece needs at least three points', 'error'); return; }
			const pid = this.run({ op: 'overlay.add', mirror, points: this.strokePoints(pen.points) });
			if (pid) { tool.value = 'move'; selection.value = { kind: 'panels', id: pid }; notify(mirror === 'both' ? 'Overlay piece added on both sides: choose its material' : 'Overlay piece added: choose its material'); }
			return;
		}
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

	clearLine() { this.pen = null; this.penCursor = null; this.engine.overlay.setPreview(null); }
	cancelPen() { this.clearLine(); this.penPress = null; this.strokes = []; this.refreshRegions(); }
}

import { CUTTING, buildGarment, cellOutline, isStroke, pickableRegions, strokeId, strokeRegions, whyNotPickable } from '../garment/build.js';

const isDrawing = () => tool.value === 'pen' || tool.value === 'strap' || tool.value === 'overlay';

import { locate } from '../garment/arrangement.js';
function locateIn(g, surf, sp) { return locate(g.arr, surf, sp); }
