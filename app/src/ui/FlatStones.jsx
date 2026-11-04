// The flat view's stones and stone-pattern handles (ui/FlatView.jsx, the Look appearance): the same design as the 3D view, edited
// either way. Each stone the engine laid (engine.stoneRun) is drawn on the flat piece it lies on, by its surface point mapped into
// the piece's flat cloth (stones/cloth.js uvOf) and from there into the pattern's millimetres (garment/pattern.js patternPieces:
// mm = uv * 1000 * (1 + ease) - origin). A chosen stone pattern shows the handles the 3D view shows (stones/handles.js
// patternHandles, in flat cloth metres already), and a drag sends the same edit the 3D handles do (stones.set through the Mirror
// toggle), so both views follow it. Twin of the 3D side: ui/tools.js startHandle / dragHandle, render/gizmo.js.
import { useRef } from 'preact/hooks';
import { app } from '../instance.js';
import { selection, patternFocus, stonesRun, edit } from './state.js';
import { locate } from '../garment/arrangement.js';
import { parseStone } from '../stones/library.js';
import { patternHandles } from '../stones/handles.js';
import { mirrorFast } from '../stones/cloth.js';
import { TONES } from '../render/gizmo.js';

// Stones by the cell they lie on, once per engine run (a run is a new object).
const byCell = new WeakMap();
function stonesByCell(engine) {
	const run = engine.stoneRun;
	let m = byCell.get(run);
	if (m) return m;
	m = new Map();
	for (const s of run.stones ?? []) {
		const L = engine.layers.get(s.layer ?? 'L0');
		if (!L?.g) continue;
		const t = locate(L.g.arr, engine.surf, s.sp);
		if (t < 0) continue;
		const key = (s.layer ?? 'L0') + '|' + L.g.arr.cellOf[t];
		let list = m.get(key);
		if (!list) m.set(key, (list = []));
		list.push(s);
	}
	byCell.set(run, m);
	return m;
}

// A piece's flat frame: flat metres <-> the svg's units (mm, y down), for a piece laid at p.at.
export function frameOf(p) {
	const [ax, ay] = p.easeUV ?? [0, 0], [x0, y0] = p.origin ?? [0, 0], [ox, oy] = p.at, H = p.size[1];
	const kx = 1000 * (1 + ax), ky = 1000 * (1 + ay);
	return {
		kx, ky,
		toSvg: (u, v) => [ox + u * kx - x0, oy + H - (v * ky - y0)],
		toUV: (X, Y) => [(X - ox + x0) / kx, (oy + H - Y + y0) / ky],
	};
}

const placedOn = new WeakMap(); // per run, per piece key: the stones drawn on it
export function StonesOn({ p }) {
	stonesRun.value; // laid again during a drag: drawn again
	const e = app.engine;
	if (!e || p.cell === undefined) return null;
	const cloth = e.clothOfCell(p.layer, p.cell, p.panelId);
	if (!cloth) return null;
	const run = e.stoneRun;
	let cache = placedOn.get(run);
	if (!cache) placedOn.set(run, (cache = new Map()));
	let list = cache.get(p.key + '|' + p.at.join());
	if (!list) {
		const F = frameOf(p);
		list = [];
		const put = (s, sp, twin) => {
			const uv = cloth.uvOf(sp);
			if (!uv) return;
			const [X, Y] = F.toSvg(uv[0], uv[1]);
			list.push({ X, Y, r: (s.size * 1000) / 2, colour: parseStone(s.stone).colour, gen: s.gen, id: s.id, twin });
		};
		const cells = stonesByCell(e);
		for (const s of cells.get(p.layer + '|' + p.cell) ?? []) put(s, s.sp, false);
		// a mirrored pair is one pattern piece cut twice: the other cell's stones, mirrored onto this one, drawn dashed
		const L = e.layers.get(p.layer);
		for (const c of L?.view.cells ?? []) {
			if (c.panelId !== p.panelId || c.cell === p.cell) continue;
			for (const s of cells.get(p.layer + '|' + c.cell) ?? []) put(s, mirrorFast(e.surf, s.sp), true);
		}
		cache.set(p.key + '|' + p.at.join(), list);
	}
	const sel = selection.value;
	const choose = (s) => (ev) => { ev.stopPropagation(); selection.value = s.gen === 'placed' ? { kind: 'placed', id: s.id } : { kind: 'stones', id: s.gen }; };
	return (
		<g class="flat-stones">
			{list.map((s, i) => {
				const on = sel && ((sel.kind === 'stones' && sel.id === s.gen) || (sel.kind === 'placed' && sel.id === s.id));
				return (
					<g key={i} class={`flat-stone ${on ? 'on' : ''} ${s.twin ? 'twin' : ''}`} onClick={choose(s)}>
						<title>{s.twin ? 'On the other piece of the pair' : 'On this piece'}</title>
						<circle cx={s.X} cy={s.Y} r={s.r} fill={s.colour} stroke="rgba(20, 18, 15, 0.55)" stroke-width={Math.max(0.12, s.r * 0.12)} stroke-dasharray={s.twin ? `${s.r * 0.5} ${s.r * 0.35}` : undefined} opacity={s.twin ? 0.7 : 1} />
						<circle cx={s.X - s.r * 0.3} cy={s.Y - s.r * 0.3} r={s.r * 0.32} fill="rgba(255, 255, 255, 0.75)" />
					</g>
				);
			})}
		</g>
	);
}

// The chosen stone pattern's handles on its piece, when it is a pattern on this piece's panel (the 3D view's, in flat).
export function PatternHandlesOn({ p }) {
	stonesRun.value;
	const drag = useRef(null);
	const e = app.engine, sel = selection.value;
	if (!e || sel?.kind !== 'stones' || p.cell === undefined) return null;
	const gen = app.doc.stones.find((g) => g.id === sel.id);
	if (gen?.kind !== 'pattern' || gen.on?.panel !== p.panelId) return null;
	const piece = e.clothOf(gen.on.panel)?.piece;
	// the pattern's own cloth must be the piece shown (patternPieces shows the seed's cell): otherwise its params are in another frame
	if (!piece || piece.cell !== p.cell) return null;
	// pxPerM sizes on-screen distances in the handles (a grip's reach): about a screen pixel per mm of the flat view
	const F = frameOf(p), H = patternHandles(gen, piece, { focus: patternFocus.value, pxPerM: F.kx });
	const svgPoint = (ev) => {
		const svg = ev.currentTarget.ownerSVGElement ?? ev.currentTarget, pt = svg.createSVGPoint();
		pt.x = ev.clientX; pt.y = ev.clientY;
		const q = pt.matrixTransform(svg.getScreenCTM().inverse());
		return F.toUV(q.x, q.y);
	};
	const down = (k) => (ev) => {
		ev.stopPropagation();
		if (k.pick && !k.drag) { patternFocus.value = k.pick; return; }
		if (!k.drag) return;
		try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* a pointer the page cannot hold (synthetic): the drag still follows it over the knob */ }
		const [u, v] = svgPoint(ev);
		drag.current = { k, id: gen.id, u0: k.u, v0: k.v, gu: u, gv: v, gesture: 'pattern2d' + Date.now() };
	};
	const move = (ev) => {
		const d = drag.current;
		if (!d) return;
		const [u, v] = svgPoint(ev), params = d.k.drag({ u: d.u0 + (u - d.gu), v: d.v0 + (v - d.gv), u0: d.u0, v0: d.v0, shift: ev.shiftKey, alt: ev.altKey });
		edit(app, { op: 'stones.set', id: d.id, params, gesture: d.gesture });
		const now = selection.value?.id;
		if (now && now !== d.id) d.id = now; // Mirror off: the first move split the pair; carry on with this side
	};
	const up = () => { if (drag.current) { drag.current = null; app.endGesture(); } };
	const colour = (t) => TONES[t] ?? '#ffffff';
	return (
		<g class="flat-handles">
			{H.lines.map((l, i) => {
				const pts = l.pts.map(([u, v]) => F.toSvg(u, v));
				const style = { stroke: colour(l.tone), 'stroke-width': (l.width ?? 1.4) * 0.6, fill: 'none', opacity: l.faint ? 0.45 : 0.95, 'stroke-dasharray': l.dash ? '3 2' : undefined };
				if (l.pairs) return <g key={i}>{pts.reduce((acc, q, j) => (j % 2 ? [...acc, <line key={j} x1={pts[j - 1][0]} y1={pts[j - 1][1]} x2={q[0]} y2={q[1]} {...style} />] : acc), [])}</g>;
				return <polyline key={i} points={pts.map((q) => q.join(',')).join(' ')} {...style} />;
			})}
			{H.knobs.map((k) => {
				const [X, Y] = F.toSvg(k.u, k.v), r = k.small ? 2.6 : k.big ? 5 : 3.8;
				return (
					<g key={k.id} class={`flat-knob icon-${k.icon}`} style={{ cursor: k.cursor ?? 'grab' }} onPointerDown={down(k)} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
						<title>{k.title}</title>
						<circle cx={X} cy={Y} r={r + 3} fill="transparent" />
						<circle cx={X} cy={Y} r={r} fill={k.icon === 'move' || k.icon === 'dot' ? colour(k.tone) : 'rgba(20, 18, 15, 0.85)'} stroke={colour(k.tone)} stroke-width="1" />
						{k.icon === 'turn' ? <circle cx={X} cy={Y} r={r * 0.45} fill="none" stroke={colour(k.tone)} stroke-width="0.8" /> : null}
						{k.icon === 'scale' || k.icon === 'stretch' ? <rect x={X - r * 0.4} y={Y - r * 0.4} width={r * 0.8} height={r * 0.8} fill={colour(k.tone)} transform={k.dir !== undefined ? `rotate(${(-k.dir * 180) / Math.PI} ${X} ${Y})` : undefined} /> : null}
					</g>
				);
			})}
		</g>
	);
}
