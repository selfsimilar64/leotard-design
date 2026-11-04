// The flat view's stones and stone-pattern handles (ui/FlatView.jsx, the Look appearance): the same design as the 3D view, edited
// either way. Each stone the engine laid (engine.stoneRun) is drawn on the flat piece it lies on, by its surface point mapped into
// the piece's flat cloth (stones/cloth.js uvOf) and from there into the pattern's millimetres (garment/pattern.js patternPieces:
// mm = uv * 1000 * (1 + ease) - origin). A chosen stone pattern shows the handles the 3D view shows (stones/handles.js
// patternHandles, in flat cloth metres already), and a drag sends the same edit the 3D handles do (stones.set through the Mirror
// toggle), so both views follow it. Twin of the 3D side: ui/tools.js startHandle / dragHandle, render/gizmo.js.
// Stones are painted on a canvas over the pieces (paintStones), not drawn as svg shapes: see paintStones for why.
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
	for (const s of run.records ?? run.stones ?? []) {
		if (s.flat) continue; // a pattern's stone: drawn by the piece it was laid on (stonesFor)
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

const colours = new Map(), colourOf = (name) => { let c = colours.get(name); if (!c) colours.set(name, (c = parseStone(name).colour)); return c; };
const placedOn = new WeakMap(); // per run, per piece key: the stones drawn on it

// The stones on a piece, in the svg's units (mm): this piece's own, and a mirrored pair's other piece's mirrored onto it (twin).
// Worked out once per engine run (a run is a new object) and piece place.
export function stonesFor(p) {
	const e = app.engine;
	if (!e || p.cell === undefined) return [];
	// a fitted garment's piece: its own cloth (stones/fitted-cloth.js), its stones found by their fitted triangle
	const cloth = p.fitted ? e.fitted.clothFor(p.panelId) : e.clothOfCell(p.layer, p.cell, p.panelId);
	if (!cloth || cloth.cell !== p.cell) return [];
	const run = e.stoneRun;
	let cache = placedOn.get(run);
	if (!cache) placedOn.set(run, (cache = new Map()));
	const key = p.key + '|' + p.at.join();
	let list = cache.get(key);
	if (list) return list;
	const F = frameOf(p);
	list = [];
	const at = (s, uv, twin) => { const [X, Y] = F.toSvg(uv[0], uv[1]); list.push({ X, Y, r: (s.size * 1000) / 2, colour: colourOf(s.stone), gen: s.gen, id: s.id, twin }); };
	// a pattern's stones laid on this very piece carry their flat place (stones/pattern.js patternStones: flat, fu, fv); the mirrored
	// copy of a pair carries its original's, drawn as the other cut. Finding thousands of stones again from their surface points
	// cost as much as laying them, on every step of a drag. A pattern the GPU places (a pack: stones/generators.js packOfGroup)
	// has them packed: its own side, and its mirrored side as the other cut.
	const records = run.records ?? run.stones ?? [];
	for (const s of records) if (s.flat === cloth) at(s, [s.fu, s.fv], !!s.mirrored);
	for (const pk of run.packs ?? []) {
		if (pk.piece !== cloth) continue;
		const k = pk.k;
		for (const twin of [pk.own ? false : null, pk.mirrored ? true : null]) {
			if (twin === null) continue;
			for (let j = 0; j < k.n; j++) { const [X, Y] = F.toSvg(k.U[j], k.V[j]); list.push({ X, Y, r: (k.D[j] * 1000) / 2, colour: colourOf(k.stone[j]), gen: pk.gen, twin }); }
		}
	}
	if (p.fitted) {
		// (a mirrored pack on another piece, the other sleeve of a pair, lands here by its fitted triangles: its records)
		const others = (run.packs ?? []).filter((pk) => pk.mirrored && pk.piece !== cloth).flatMap((pk) => pk.records());
		for (const s of others.length ? records.concat(others) : records) {
			if (!s.fit || s.flat === cloth) continue;
			const own = cloth.uvOfFit(s.fit);
			if (own) { at(s, own, false); continue; }
			const other = e.fitted.mirrorFit(s.fit), uv = other && cloth.uvOfFit(other); // on the other sleeve of the pair
			if (uv) at(s, uv, true);
		}
	} else {
		const cells = stonesByCell(e), put = (s, sp, twin) => { const uv = cloth.uvOf(sp); if (uv) at(s, uv, twin); }; // (pattern stones are not in cells)
		for (const s of cells.get(p.layer + '|' + p.cell) ?? []) put(s, s.sp, false);
		// a mirrored pair is one pattern piece cut twice: the other cell's stones, mirrored onto this one, drawn dashed
		for (const c of e.layers.get(p.layer)?.view.cells ?? []) {
			if (c.panelId !== p.panelId || c.cell === p.cell) continue;
			for (const s of cells.get(p.layer + '|' + c.cell) ?? []) put(s, mirrorFast(e.surf, s.sp), true);
		}
	}
	cache.set(key, list);
	return list;
}

// The stones of every piece painted on a canvas laid exactly over the pieces' svg (the same viewBox, read through the svg's own
// screen transform), drawn as the 3D view draws its stones: one draw on the GPU (WebGL), each stone a point whose disc, outline
// and shine the shader shades. Drawn by the browser instead, 14 000 stones cost 30-55 ms a step (as svg shapes, as canvas
// circles, or as copies of a stone's picture: measured with the canvas flushed), which made a 2D drag on a pattern slower than
// the same drag in 3D. Painted again whenever stones are laid or the selection changes (ui/FlatView.jsx Stack).
export function paintStones(canvas, svg, pieces) {
	if (!canvas || !svg) return;
	const r = canvas.getBoundingClientRect(), dpr = devicePixelRatio || 1, w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
	if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
	const G = glOf(canvas), M = svg.getScreenCTM();
	if (!G) return;
	const { gl } = G;
	gl.viewport(0, 0, w, h);
	gl.clearColor(0, 0, 0, 0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	if (!M) return;
	// the svg's units (mm) to the canvas's pixels; the pieces are never turned, so a uniform scale and a shift
	const k = M.a * dpr, tx = (M.e - r.left) * dpr, ty = (M.f - r.top) * dpr, maxR = G.maxSize / 2 - 2;
	const sel = selection.value, isOn = (s) => !!sel && ((sel.kind === 'stones' && sel.id === s.gen) || (sel.kind === 'placed' && sel.id === s.id));
	let n = 0;
	for (const p of pieces) n += stonesFor(p).length;
	if (!n) return;
	// per stone: x, y (canvas pixels), radius, outline width (pixels), r, g, b, look (1: the pair's other cut, 2: chosen)
	const A = G.data.length >= n * 8 ? G.data : (G.data = new Float32Array(n * 8 * 1.5));
	let i = 0;
	const onW = 0.5 * k; // a chosen group's outline: half a millimetre
	for (const p of pieces) for (const s of stonesFor(p)) {
		const R = Math.min(s.r * k, maxR), on = isOn(s), c = rgbOf(s.colour);
		A[i++] = s.X * k + tx; A[i++] = s.Y * k + ty; A[i++] = R; A[i++] = on ? onW : Math.max(0.5, R * 0.12);
		A[i++] = c[0]; A[i++] = c[1]; A[i++] = c[2]; A[i++] = (s.twin ? 1 : 0) + (on ? 2 : 0);
	}
	gl.useProgram(G.prog);
	gl.uniform2f(G.uSize, w, h);
	gl.bindVertexArray(G.vao);
	gl.bindBuffer(gl.ARRAY_BUFFER, G.buf);
	gl.bufferData(gl.ARRAY_BUFFER, A.subarray(0, n * 8), gl.DYNAMIC_DRAW);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
	gl.drawArrays(gl.POINTS, 0, n);
}

const rgbs = new Map();
function rgbOf(hex) {
	let c = rgbs.get(hex);
	if (!c) { const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '')?.[1] ?? '999999'; c = [0, 2, 4].map((j) => parseInt(m.slice(j, j + 2), 16) / 255); rgbs.set(hex, c); }
	return c;
}

// The painter of one canvas: its WebGL context, program and buffer (kept on the canvas).
const VS = `#version 300 es
in vec2 aPos; in vec2 aRW; in vec3 aCol; in float aLook;
uniform vec2 uSize;
out vec3 vCol; out float vR; out float vW; out float vLook; out float vHalf;
void main() {
	vCol = aCol; vR = aRW.x; vW = aRW.y; vLook = aLook;
	vHalf = ceil(aRW.x + aRW.y + 1.0);
	gl_PointSize = 2.0 * vHalf;
	gl_Position = vec4(aPos.x / uSize.x * 2.0 - 1.0, 1.0 - aPos.y / uSize.y * 2.0, 0.0, 1.0);
}`;
// As the stones were drawn before: the crystal's colour, a thin dark outline (dashed and faded on the pair's other cut, darker and
// wider when chosen), and a white shine up and to the left. Edges are smoothed over a pixel.
const FS = `#version 300 es
precision highp float;
in vec3 vCol; in float vR; in float vW; in float vLook; in float vHalf;
out vec4 o;
void main() {
	vec2 p = (gl_PointCoord - 0.5) * 2.0 * vHalf;
	float d = length(p);
	bool twin = mod(vLook, 2.0) > 0.5, on = vLook > 1.5;
	float fill = clamp(vR - d + 0.5, 0.0, 1.0);
	float line = clamp(vW * 0.5 - abs(d - vR) + 0.5, 0.0, 1.0);
	if (twin && mod(atan(p.y, p.x) * vR, vR * 0.85) > vR * 0.5) line = 0.0;
	vec4 c = vec4(vCol, 1.0) * fill;
	vec4 ln = on ? vec4(0.122, 0.114, 0.102, 1.0) : vec4(0.078, 0.071, 0.059, 1.0) * 0.55;
	c = ln * line + c * (1.0 - ln.a * line);
	float sh = clamp(vR * 0.32 - length(p + vR * 0.3) + 0.5, 0.0, 1.0) * 0.75 * fill;
	c = vec4(1.0) * sh + c * (1.0 - sh);
	o = c * (twin ? 0.7 : 1.0);
}`;
function glOf(canvas) {
	if (canvas._stones) return canvas._stones;
	const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false });
	if (!gl) return null;
	const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
	const prog = gl.createProgram();
	gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
	if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
	const vao = gl.createVertexArray(), buf = gl.createBuffer();
	gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
	const at = (name, size, off) => { const l = gl.getAttribLocation(prog, name); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 32, off * 4); };
	at('aPos', 2, 0); at('aRW', 2, 2); at('aCol', 3, 4); at('aLook', 1, 7);
	return (canvas._stones = { gl, prog, vao, buf, uSize: gl.getUniformLocation(prog, 'uSize'), maxSize: gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1], data: new Float32Array(0) });
}

// The stone under the pointer on piece p, chosen (its group, or the placed stone); false when there is none under it.
export function pickStone(p, ev) {
	const svg = ev.currentTarget.ownerSVGElement ?? ev.currentTarget, pt = svg.createSVGPoint();
	pt.x = ev.clientX; pt.y = ev.clientY;
	const q = pt.matrixTransform(svg.getScreenCTM().inverse());
	let best = null, bd = Infinity;
	for (const s of stonesFor(p)) { const d = (s.X - q.x) ** 2 + (s.Y - q.y) ** 2; if (d < bd) { bd = d; best = s; } }
	if (!best || Math.sqrt(bd) > best.r * 1.6 + 1) return false;
	selection.value = best.gen === 'placed' ? { kind: 'placed', id: best.id } : { kind: 'stones', id: best.gen };
	return true;
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
	// Every move is applied as it comes, as the 3D handles do (ui/tools.js dragHandle): during a gesture an edit only marks the
	// stones to be laid in the next frame, so it is cheap, and holding moves back for a frame only made the handle lag the pointer.
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
