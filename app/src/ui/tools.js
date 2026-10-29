// Viewport tools: what a pointer does in the 3D view for the active tool. Every edit is a
// command (app.exec), so tools add nothing the scripting surface lacks.
//   move    left-drag orbits; a click (no drag) selects the line or the piece under it; over a
//           control point of the selected line the drag moves that point instead (it slides on
//           the body; one undo step); Alt-click a line to add a point; C toggles corner/smooth
//           on the last point touched; Delete removes it (or the line)
//   pen     click to place points (Shift = corner); click the first point to close; click on
//           another line to end there (the end stays attached); Enter or double-click finishes;
//           Esc cancels
//   strap   like the pen, but the line becomes a strap
//   stones, single, erase   stone generators, one stone, the eraser (options in the panel)
//   decal   click the body to place a logo or lettering (options in the panel), or to move the
//           one being moved (toolOptions.moveDecal)
//   eyedrop (from the piece's match-colour button) while looking through a reference photo, click the photo
//           where the piece is: its colour is matched to it under the rig
// In every tool but move, right-drag orbits, middle-drag pans and the wheel zooms (two fingers on a
// touch screen).
import * as THREE from 'three';
import { signal } from '@preact/signals';
import { tool, selection, notify, hideOverlay } from './state.js';
import { toSP } from '../body/surface.js';
import { evaluateCurve } from '../curves/evaluate.js';
import { mirrorSP } from '../curves/points.js';
import { viewTo } from './camera.js';

export const toolOptions = signal({
	penRole: 'seam', penMirror: 'auto', strapWidth: 0.01,
	swatch: { fabric: 'mystique', colour: '#2b1d6e', second: 'Tone-on-tone' },
	stone: { stone: 'Crystal AB', size: 'ss12', shape: 'round', rows: 1, offset: 0.004, gap: 1.15, fill: 'random', eraseR: 0.004 },
	decal: { text: 'Name', font: 'Segoe Script', size: 0.08, look: 'print', colour: '#ffffff', rotate: 0 },
});

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
		// a double click (or tap) finishes a line; in Select it fits the leotard in view
		el.addEventListener('dblclick', (e) => { if (tool.value === 'pen' || tool.value === 'strap') { e.preventDefault(); this.finishPen(); } else if (tool.value === 'move') viewTo('fit'); });
		el.addEventListener('contextmenu', (e) => e.preventDefault());
		window.addEventListener('keydown', (e) => this.key(e));
		tool.subscribe((t) => this.onTool(t));
		selection.subscribe(() => this.refreshOverlay());
		// a piece glows briefly as it is chosen
		let last = null;
		selection.subscribe((s) => { if (s?.kind === 'panels' && s.id !== last) engine.flashPanel(s.id); last = s?.id ?? null; });
		hideOverlay.subscribe(() => this.refreshOverlay());
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
		if (t !== 'decal' && toolOptions.value.moveDecal) toolOptions.value = { ...toolOptions.value, moveDecal: null };
		this.el.style.cursor = t === 'move' ? 'grab' : t === 'pen' || t === 'strap' || t === 'eyedrop' ? 'crosshair' : 'default';
		this.refreshOverlay();
	}

	refreshOverlay() {
		const sel = selection.value;
		// drawing needs to see the line, so the pen and strap tools show the overlay even when hidden
		this.engine.setUI({ selected: sel?.kind === 'curves' ? sel.id : null, showPoints: ['move', 'pen', 'strap'].includes(tool.value),
			hidden: hideOverlay.value && !['pen', 'strap'].includes(tool.value) });
	}

	xy(e) { const r = this.el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }

	run(cmd) { try { return this.app.exec(cmd); } catch (err) { notify(err.message, 'error'); return undefined; } }

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
			// over a control point of the selected line (the orbit controls were switched off on
			// hover, see move): drag it; otherwise remember the press: a click selects on release
			const p = this.pointAt(x, y);
			if (p) {
				this.drag = { ...p, gesture: 'drag' + (++this.gestureN) };
				this.active = { curve: p.curve, i: p.i };
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
				this.run({ op: 'decal.set', id: mv, at: { sp: toSP(h.sp) }, layer: h.layer ?? 'L0' });
				selection.value = { kind: 'decals', id: mv }; tool.value = 'move';
				return;
			}
			const d = toolOptions.value.decal, id = this.run({ op: 'decal.add', at: { sp: toSP(h.sp) }, ...d, layer: h.layer ?? 'L0' });
			if (id) { selection.value = { kind: 'decals', id }; tool.value = 'move'; }
			return;
		}
		if (t === 'stones' || t === 'single' || t === 'erase') {
			const st = toolOptions.value.stone, h = this.engine.pickAt(x, y);
			if (t === 'stones') {
				// a line under the cursor gets rows along it; otherwise the panel gets a fill
				const c = this.engine.curveAt(x, y, 8);
				let id;
				if (c) id = this.run({ op: 'stones.add', kind: 'row', on: { curve: c.curve }, stone: st.stone, shape: st.shape, params: { size: st.size, rows: st.rows, offset: st.offset, gap: st.gap } });
				else if (h?.panel) id = this.run({ op: 'stones.add', kind: 'fill', on: { panel: h.panel }, stone: st.stone, shape: st.shape, params: { size: st.size, pattern: st.fill, gap: st.gap } });
				if (id) selection.value = { kind: 'stones', id };
				return;
			}
			if (!h?.sp) return;
			if (t === 'single') this.run({ op: 'stone.place', at: { sp: toSP(h.sp) }, size: st.size, stone: st.stone, shape: st.shape });
			else this.run({ op: 'stones.erase', at: { sp: toSP(h.sp) }, r: st.eraseR });
			return;
		}
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
		if (this.drag) {
			const h = this.engine.pickAt(x, y);
			if (!h?.sp) return;
			const sp = this.drag.mirrored ? mirrorSP(h.sp, this.engine.surf) : h.sp;
			this.run({ op: 'curve.movePoint', id: this.drag.curve, i: this.drag.i, to: { sp: toSP(sp) }, gesture: this.drag.gesture });
			return;
		}
		if ((tool.value === 'pen' || tool.value === 'strap') && this.pen) {
			const h = this.engine.pickAt(x, y);
			if (h?.sp) this.previewPen(h.sp);
		}
		if (tool.value === 'move' && !this.press) {
			// the orbit controls act on the same pointer events before this tool does: switch them
			// off while the pointer is over a control point, so the press drags the point
			const over = !!this.pointAt(x, y);
			this.engine.viewport.controls.enabled = !over;
			this.el.style.cursor = over ? 'move' : 'grab';
		}
	}

	up(e) {
		// move: a click that did not turn the view picks the line or the piece under it (or
		// clears the choice); Alt-click on the selected line adds a point there
		const pr = this.press;
		this.press = null;
		if (pr && tool.value === 'move' && e.button === 0) {
			const [x, y] = this.xy(e);
			if (Math.hypot(x - pr.x, y - pr.y) < 5 && performance.now() - pr.t < 500) {
				const c = this.engine.curveAt(x, y);
				if (c && pr.alt && selection.value?.id === c.curve) this.insertPoint(c);
				else if (c) { selection.value = { kind: 'curves', id: c.curve }; this.active = null; }
				else { const h = this.engine.pickAt(x, y); selection.value = h?.panel ? { kind: 'panels', id: h.panel } : null; }
			}
		}
		if (this.drag) { this.drag = null; this.app.endGesture(); this.engine.viewport.controls.enabled = true; try { this.el.releasePointerCapture(e.pointerId); } catch { /* already released */ } }
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
			if (this.active && this.active.curve === sel.id) { this.run({ op: 'curve.removePoint', id: sel.id, i: this.active.i }); this.active = null; }
			else { this.run({ op: 'curve.remove', id: sel.id }); selection.value = null; }
		}
		if ((k === 'c' || k === 'C') && this.active && sel?.kind === 'curves') {
			const c = this.app.doc.curves.find((x) => x.id === this.active.curve);
			const pt = c?.points[this.active.i];
			if (pt) this.run({ op: 'curve.setKind', id: c.id, i: this.active.i, kind: pt.kind === 'corner' ? 'smooth' : 'corner' });
		}
	}

	insertPoint(hit) {
		const e = this.engine.g.evaluated.get(hit.key);
		// insert before the first control point that comes after this sample
		let i = e.ctrlIndex.findIndex((si) => si > hit.sample);
		if (i < 0) i = e.ctrlIndex.length;
		const sp = hit.mirrored ? mirrorSP(e.sps[hit.sample], this.engine.surf) : e.sps[hit.sample];
		this.run({ op: 'curve.insertPoint', id: hit.curve, i, at: { sp: toSP(sp) } });
		this.active = { curve: hit.curve, i };
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
		if (cursorSp) pts.push({ sp: toSP(cursorSp), kind: 'smooth' });
		this.engine.overlay.setPreview(pts.length >= 2 ? evaluateCurve({ points: pts, closed: false }, this.engine.surf) : null);
	}

	finishPen(closed = false) {
		const pen = this.pen;
		this.cancelPen();
		if (!pen || pen.points.length < 2) return;
		const opt = toolOptions.value;
		// a line that crosses the centre front/back is drawn whole; one off to a side is mirrored
		const crosses = pen.points.some((p) => Math.abs(this.engine.surf.pos(p.sp).x) < 0.006);
		const mirror = opt.penMirror === 'auto' ? (crosses ? 'none' : 'both') : opt.penMirror;
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

	cancelPen() { this.pen = null; this.engine.overlay.setPreview(null); }
}

import { locate } from '../garment/arrangement.js';
function locateIn(g, surf, sp) { return locate(g.arr, surf, sp); }
