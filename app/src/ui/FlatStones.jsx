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
import { TRIMS } from '../garment/trim.js';

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
	// a fitted garment's piece: its own cloth (stones/fitted-cloth.js), its stones found by their fitted triangle
	const cloth = p.fitted ? e.fitted.clothFor(p.panelId) : e.clothOfCell(p.layer, p.cell, p.panelId);
	if (!cloth || cloth.cell !== p.cell) return null;
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
		if (p.fitted) {
			const at = (s, uv, twin) => { const [X, Y] = F.toSvg(uv[0], uv[1]); list.push({ X, Y, r: (s.size * 1000) / 2, colour: parseStone(s.stone).colour, gen: s.gen, id: s.id, twin }); };
			for (const s of run.stones ?? []) {
				if (!s.fit) continue;
				const own = cloth.uvOfFit(s.fit);
				if (own) { at(s, own, false); continue; }
				const other = e.fitted.mirrorFit(s.fit), uv = other && cloth.uvOfFit(other); // on the other sleeve of the pair
				if (uv) at(s, uv, true);
			}
			cache.set(p.key + '|' + p.at.join(), list);
		}
		const cells = p.fitted ? new Map() : stonesByCell(e);
		for (const s of cells.get(p.layer + '|' + p.cell) ?? []) put(s, s.sp, false);
		// a mirrored pair is one pattern piece cut twice: the other cell's stones, mirrored onto this one, drawn dashed
		const L = p.fitted ? null : e.layers.get(p.layer);
		for (const c of L?.view.cells ?? []) {
			if (c.panelId !== p.panelId || c.cell === p.cell) continue;
			for (const s of cells.get(p.layer + '|' + c.cell) ?? []) put(s, mirrorFast(e.surf, s.sp), true);
		}
		cache.set(p.key + '|' + p.at.join(), list);
	}
	const sel = selection.value, isOn = (s) => !!sel && ((sel.kind === 'stones' && sel.id === s.gen) || (sel.kind === 'placed' && sel.id === s.id));
	// A few paths, one per colour and kind (this piece's, the pair's, the chosen group's), not two circles a stone: a drag on a
	// pattern redraws a handful of nodes instead of thousands (13 000 nodes took about 55 ms a redraw). Picking is by the pointer.
	// (built once per laid stones and selection: other edits redraw the view without rebuilding thousands of path pieces)
	const selKey = sel ? sel.kind + ':' + sel.id : '';
	if (list.paths?.selKey !== selKey) {
		const f2 = (x) => Math.round(x * 100) / 100, circ = (x, y, r) => `M${f2(x - r)} ${f2(y)}a${f2(r)} ${f2(r)} 0 1 0 ${f2(2 * r)} 0a${f2(r)} ${f2(r)} 0 1 0 ${f2(-2 * r)} 0`;
		const groups = new Map(), shine = [];
		for (const s of list) {
			const on = isOn(s), k = s.colour + (s.twin ? '|t' : '|o') + (on ? '|on' : '');
			let g = groups.get(k);
			if (!g) groups.set(k, (g = { colour: s.colour, twin: s.twin, on, d: [], r: s.r }));
			g.d.push(circ(s.X, s.Y, s.r));
			shine.push(circ(s.X - s.r * 0.3, s.Y - s.r * 0.3, s.r * 0.32));
		}
		for (const g of groups.values()) g.d = g.d.join('');
		list.paths = { selKey, groups: [...groups.values()], shine: shine.join('') };
	}
	const { groups, shine } = list.paths;
	const choose = (ev) => {
		ev.stopPropagation();
		const svg = ev.currentTarget.ownerSVGElement, pt = svg.createSVGPoint();
		pt.x = ev.clientX; pt.y = ev.clientY;
		const q = pt.matrixTransform(svg.getScreenCTM().inverse());
		let best = null, bd = Infinity;
		for (const s of list) { const d = (s.X - q.x) ** 2 + (s.Y - q.y) ** 2; if (d < bd) { bd = d; best = s; } }
		if (!best || Math.sqrt(bd) > best.r * 1.6 + 1) return;
		selection.value = best.gen === 'placed' ? { kind: 'placed', id: best.id } : { kind: 'stones', id: best.gen };
	};
	return (
		<g class="flat-stones" onClick={choose}>
			{groups.map((g) => (
				<path key={g.colour + g.twin + g.on} class={`flat-stone ${g.on ? 'on' : ''} ${g.twin ? 'twin' : ''}`} d={g.d} fill={g.colour}
					stroke={g.on ? '#1f1d1a' : 'rgba(20, 18, 15, 0.55)'} stroke-width={g.on ? 0.5 : Math.max(0.12, g.r * 0.12)}
					stroke-dasharray={g.twin ? `${g.r * 0.5} ${g.r * 0.35}` : undefined} opacity={g.twin ? 0.7 : 1}>
					<title>{g.twin ? 'Stones on the other piece of the pair' : 'Stones on this piece'}</title>
				</path>
			))}
			<path d={shine} fill="rgba(255, 255, 255, 0.75)" pointer-events="none" />
		</g>
	);
}

// A fitted piece's finished openings (neck, legs, wrists) as the band of elastic turned in along them, as the 3D view draws it:
// stones keep clear of it (render/fitted.js edgeKeepOut), so without it the Look showed a bare strip. Inside the piece only.
export function OpeningBands({ p, pts, colour }) {
	const e = app.engine;
	if (!p.fitted || !e?.fitted?.data) return null;
	const cloth = e.fitted.clothFor(p.panelId);
	if (!cloth || cloth.cell !== p.cell) return null;
	const F = frameOf(p), runs = [];
	for (const o of e.fitted.data.openings ?? []) {
		let run = [];
		const n = o.ids?.length ?? 0;
		for (let i = 0; i <= n; i++) {
			const l = i < n ? cloth.idsAt.get(o.ids[i % n]) : undefined;
			if (l === undefined) { if (run.length > 1) runs.push(run); run = []; continue; }
			run.push(F.toSvg(cloth.uv[l * 2], cloth.uv[l * 2 + 1]));
		}
	}
	if (!runs.length) return null;
	const id = `band-${p.key}`, w = TRIMS.elastic.width * 1000;
	// a shade that reads on the fabric: darker on a light colour, lighter on a dark one
	const hex = /^#?([0-9a-f]{6})$/i.exec(colour ?? '')?.[1], lum = hex ? (0.2126 * parseInt(hex.slice(0, 2), 16) + 0.7152 * parseInt(hex.slice(2, 4), 16) + 0.0722 * parseInt(hex.slice(4, 6), 16)) / 255 : 0.5;
	const shade = lum < 0.35 ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.22)';
	return (
		<g pointer-events="none">
			<clipPath id={id}><polygon points={pts} /></clipPath>
			<g clip-path={`url(#${id})`}>
				{runs.map((r, i) => <polyline key={i} points={r.map((q) => q.join(',')).join(' ')} fill="none" stroke={colour} stroke-width={2 * w} stroke-linejoin="round" />)}
				{runs.map((r, i) => <polyline key={'s' + i} points={r.map((q) => q.join(',')).join(' ')} fill="none" stroke={shade} stroke-width={2 * w} stroke-linejoin="round" />)}
			</g>
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
	// A pointer sends many moves a frame and each edit lays the stones again (about 30 ms on a 3 000-stone pattern): only the latest
	// move of a frame is applied, and the last one always when the pointer lets go.
	const apply = () => {
		const d = drag.current;
		if (!d?.next) return;
		const { u, v, shift, alt } = d.next;
		d.next = null;
		const params = d.k.drag({ u: d.u0 + (u - d.gu), v: d.v0 + (v - d.gv), u0: d.u0, v0: d.v0, shift, alt });
		edit(app, { op: 'stones.set', id: d.id, params, gesture: d.gesture });
		const now = selection.value?.id;
		if (now && now !== d.id) d.id = now; // Mirror off: the first move split the pair; carry on with this side
	};
	const move = (ev) => {
		const d = drag.current;
		if (!d) return;
		const [u, v] = svgPoint(ev);
		d.next = { u, v, shift: ev.shiftKey, alt: ev.altKey };
		if (!d.frame) d.frame = requestAnimationFrame(() => { if (drag.current === d) { d.frame = 0; apply(); } });
	};
	const up = () => {
		const d = drag.current;
		if (!d) return;
		if (d.frame) cancelAnimationFrame(d.frame);
		apply();
		drag.current = null;
		app.endGesture();
	};
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
