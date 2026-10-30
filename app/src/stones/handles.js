// A chosen pattern's handles, as they lie on its flat piece: what each is for, where it goes, and what
// dragging it does. Which ones show depends on what is being worked on (the focus):
//   frame     the whole pattern: a dial to move, turn and scale it, and the handles of its own arrangement
//             (its spacing, its size, the motif in its cell: the layouts' grips)
//   plane     the arrangement's plane inside the frame (the panel's Pattern positioning)
//   a modifier's id   that modifier: a box with its ends and sides for a linear one, a circle for a radial one,
//             a repeat length for waves...; the others show as faint outlines with a dot to pick them by
// Nothing here knows about the screen but how big a pixel is (pxPerM), so that handles stay far enough apart to
// grab. render/gizmo.js draws them over the view, ui/tools.js calls drag().
// A knob: { id, icon, tone, u, v, dir?, title, cursor, drag({ u, v, u0, v0, shift, alt }) -> params, read(params) -> text, pick?: focus }
// A line: { pts: [[u, v]...], tone, width, faint?, dash? }
import { LAYOUTS } from './layouts.js';
import { patternParams, patternMap, frameOf, frameToCloth, clothToFrame, clothToPattern, minScale, pieceMiddle } from './pattern.js';
import { MOD_SHAPES, isSpatial, modBounds } from './modifiers.js';

const tenth = (v) => Math.round(v * 1e4) / 1e4; // of a millimetre
const STEP = 0.006; // how finely a line is laid on the cloth
const DIAL_PX = 74, DIAL_MIN_PX = 46, LEVER_PX = 56, OUTSIDE_PX = 38;

export const FORMAT = {
	mm: (v) => (v * 1000).toFixed(Math.abs(v) < 0.02 ? 1 : 0) + ' mm',
	deg: (v) => (Math.abs(v) < 10 && v % 1 ? v.toFixed(2) : v.toFixed(v % 1 ? 1 : 0)) + '°',
	n: (v) => (v % 1 ? v.toFixed(2) : String(v)),
	x: (v) => v.toFixed(2) + '×',
	pct: (v) => Math.round(v * 100) + '%',
};

const line = (pts, tone, opts = {}) => ({ pts, tone, width: 1.6, ...opts });
// a straight stretch of the cloth, finely enough to lie on it
function along2(a, b) {
	const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / STEP)), out = [];
	for (let i = 0; i <= n; i++) out.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
	return out;
}
// a path through points, each stretch finely
const through = (pts) => pts.slice(1).flatMap((p, i) => along2(pts[i], p));
const loop = (fn, n = 96) => { const out = []; for (let i = 0; i <= n; i++) out.push(fn((i / n) * Math.PI * 2)); return out; };
const angle = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
const wrap = (a) => ((a + 180) % 360 + 360) % 360 - 180;
const snapTurn = (a, shift) => (shift ? Math.round(a / 15) * 15 : Math.round(a * 10) / 10);

function clampSpec(spec, v, P, piece) {
	if (!spec || spec.options) return v;
	const max = spec.maxOf ? Math.min(spec.max, spec.maxOf(P, piece)) : spec.max;
	v = Math.max(spec.min, Math.min(max, v));
	return spec.step ? +(Math.round(v / spec.step) * spec.step).toFixed(6) : v;
}
const specOf = (layout, key) => layout.params.find((p) => p.k === key);
const readOf = (layout, key, title) => (p) => { const s = specOf(layout, key), v = p[key]; return v === undefined ? title : `${title}  ${(FORMAT[s?.f] ?? FORMAT.n)(v)}`; };

// --- the whole pattern ------------------------------------------------------------------------------
function frameHandles(P, piece, pxPerM, out) {
	// the dial keeps to the piece as far as it can and still be grabbed
	const f = frameOf(P), dial = Math.max(DIAL_MIN_PX, Math.min(DIAL_PX, 0.36 * Math.min(piece.x1 - piece.x0, piece.y1 - piece.y0) * pxPerM)) / pxPerM, c = [f.x, f.y], [cx, cy] = pieceMiddle(piece), least = minScale(P) / Math.max((P.pscale ?? 1) * Math.sqrt((P.sx ?? 1) * (P.sy ?? 1)), 1e-3);
	const at = (a) => [f.x + dial * Math.cos(a), f.y + dial * Math.sin(a)], up = ((P.rotate ?? 0) * Math.PI) / 180 + Math.PI / 2, diag = up + Math.PI * 0.75;
	out.lines.push(line(loop((a) => [c[0] + dial * Math.cos(a), c[1] + dial * Math.sin(a)]), 'frame', { faint: true, width: 1.2 }));
	out.knobs.push({
		id: 'frame-move', icon: 'move', tone: 'frame', u: f.x, v: f.y, big: true, title: 'Move the whole pattern', cursor: 'move',
		drag: (s) => {
			let x = f.x + s.u - s.u0, y = f.y + s.v - s.v0;
			// it stays where its handle can be reached, and is drawn to the piece's middle line
			x = Math.max(piece.x0 - 0.05, Math.min(piece.x1 + 0.05, x)); y = Math.max(piece.y0 - 0.05, Math.min(piece.y1 + 0.05, y));
			if (!s.alt && Math.abs(x - cx) < 0.003) x = cx;
			return { x: tenth(x), y: tenth(y) };
		},
		read: (p) => `Across ${FORMAT.mm(p.x - cx)}  Up ${FORMAT.mm(p.y - cy)}`,
	});
	const a0 = at(up), s0 = at(diag);
	out.knobs.push({
		id: 'frame-turn', icon: 'turn', tone: 'frame', u: a0[0], v: a0[1], title: 'Turn the whole pattern (Shift: 15° steps)', cursor: 'grab',
		drag: (s) => ({ rotate: snapTurn(wrap((P.rotate ?? 0) + ((angle(c, [s.u, s.v]) - angle(c, [s.u0, s.v0])) * 180) / Math.PI), s.shift) }),
		read: (p) => `Turn ${FORMAT.deg(p.rotate)}`,
	});
	out.knobs.push({
		id: 'frame-scale', icon: 'scale', tone: 'frame', u: s0[0], v: s0[1], title: 'Scale the whole pattern. Crystals keep their size', cursor: 'nwse-resize',
		drag: (s) => {
			const r0 = Math.hypot(s.u0 - c[0], s.v0 - c[1]) || 1e-3;
			return { scale: Math.round(Math.max(least, Math.min(8, ((P.scale ?? 1) * Math.hypot(s.u - c[0], s.v - c[1])) / r0)) * 1000) / 1000 };
		},
		read: (p) => `Scale ${FORMAT.x(p.scale)}`,
	});
}

// --- what is the arrangement's own -----------------------------------------------------------------
// Each is a place in the arrangement's space, mapped onto the cloth; a drag brings the pointer back into
// that space and asks the grip what value that means.
function gripHandles(P, layout, piece, pxPerM, out) {
	const grips = layout.grips ?? [];
	if (!grips.length) return;
	const M = patternMap(P), toCloth = (x, y) => [M.a * x + M.b * y + M.e, M.c * x + M.d * y + M.f], lever = LEVER_PX / pxPerM;
	const grabbed = (s, at) => { const [x0, y0] = clothToPattern(M, s.u0, s.v0), [x1, y1] = clothToPattern(M, s.u, s.v); return [at[0] + x1 - x0, at[1] + y1 - y0]; };
	const patch = (o) => { for (const k of Object.keys(o)) o[k] = clampSpec(specOf(layout, k), o[k], P, piece); return o; };
	grips.forEach((g, gi) => {
		if (g.when && !g.when(P)) return;
		const id = 'grip-' + gi;
		if (g.type === 'along') {
			const dl = Math.hypot(g.dir[0], g.dir[1]), dx = g.dir[0] / dl, dy = g.dir[1] / dl, unit = g.unit ? g.unit(P) : 1, each = P[g.key] * unit;
			// as many of them out as it takes to be easy to grab: a drag then moves all of them
			const n = Math.max(1, Math.ceil(lever / Math.max(each * M.sc, 1e-5))), at = [dx * each * n, dy * each * n], cloth = toCloth(at[0], at[1]);
			out.lines.push(line(along2(toCloth(0, 0), cloth), 'frame', { faint: true, width: 1.2 }));
			// a tick at each one, so that what moves can be counted
			if (n > 1 && n <= 12) for (let k = 1; k < n; k++) { const q = toCloth(dx * each * k, dy * each * k), w = 3.5 / pxPerM, a = Math.atan2(cloth[1] - q[1], cloth[0] - q[0]) + Math.PI / 2; out.lines.push(line([[q[0] - w * Math.cos(a), q[1] - w * Math.sin(a)], [q[0] + w * Math.cos(a), q[1] + w * Math.sin(a)]], 'frame', { faint: true, width: 1.2 })); }
			out.knobs.push({
				id, icon: 'stretch', tone: 'grip', u: cloth[0], v: cloth[1], dir: Math.atan2(M.c * dx + M.d * dy, M.a * dx + M.b * dy), title: g.title, cursor: 'ew-resize',
				drag: (s) => { const p = grabbed(s, at); return patch({ [g.key]: (p[0] * dx + p[1] * dy) / (unit * n) }); },
				read: readOf(layout, g.key, g.title),
			});
		} else if (g.type === 'radius') {
			const unit = g.unit ? g.unit(P) : 1, half = g.half ? 0.5 : 1, R = P[g.key] * unit * half, a = g.angle ?? 0, at = [R * Math.cos(a), R * Math.sin(a)], cloth = toCloth(at[0], at[1]);
			out.lines.push(line(loop((t) => toCloth(R * Math.cos(t), R * Math.sin(t))), 'frame', { faint: true, width: 1.2 }));
			out.knobs.push({
				id, icon: 'stretch', tone: 'grip', u: cloth[0], v: cloth[1], dir: Math.atan2(M.c * Math.cos(a) + M.d * Math.sin(a), M.a * Math.cos(a) + M.b * Math.sin(a)), title: g.title, cursor: 'ew-resize',
				drag: (s) => { const p = grabbed(s, at); return patch({ [g.key]: Math.hypot(p[0], p[1]) / (unit * half) }); },
				read: readOf(layout, g.key, g.title),
			});
		} else {
			const at = g.at(P), cloth = toCloth(at[0], at[1]);
			for (const pts of g.lines?.(P) ?? []) out.lines.push(line(through(pts.map((q) => toCloth(q[0], q[1]))), 'frame', { faint: true, width: 1.2 }));
			out.knobs.push({
				id, icon: 'point', tone: 'grip', u: cloth[0], v: cloth[1], title: g.title, cursor: 'move',
				drag: (s) => { const p = grabbed(s, at); return patch(g.set(P, p[0], p[1])); },
				read: (p) => { const key = Object.keys(g.set(P, at[0], at[1]))[0]; return readOf(layout, key, g.title)(p); },
			});
		}
	});
}

// --- the arrangement's plane inside the frame ---------------------------------------------------------
function planeHandles(P, pxPerM, out) {
	const f = frameOf(P), px = P.px ?? 0, py = P.py ?? 0, ps = P.pscale ?? 1, pt = P.pturn ?? 0, c = frameToCloth(f, px, py), r = DIAL_PX / pxPerM, rl = r / f.S, a = (pt * Math.PI) / 180;
	const pt2 = (lx, ly) => frameToCloth(f, px + lx * Math.cos(a) - ly * Math.sin(a), py + lx * Math.sin(a) + ly * Math.cos(a)), local = (u, v) => clothToFrame(f, u, v);
	out.lines.push(line(through([pt2(-rl, -rl), pt2(rl, -rl), pt2(rl, rl), pt2(-rl, rl), pt2(-rl, -rl)]), 'plane', { dash: true, width: 1.4 }));
	out.knobs.push({
		id: 'plane-move', icon: 'move', tone: 'plane', u: c[0], v: c[1], big: true, title: 'Shift the crystals under the pattern: its modifiers stay', cursor: 'move',
		drag: (s) => { const [a0, b0] = local(s.u0, s.v0), [a1, b1] = local(s.u, s.v); return { px: tenth(px + a1 - a0), py: tenth(py + b1 - b0) }; },
		read: (p) => `Shift ${FORMAT.mm(p.px)}, ${FORMAT.mm(p.py)}`,
	});
	const top = pt2(0, rl), corner = pt2(rl, rl), side = pt2(rl, 0);
	out.knobs.push({
		id: 'plane-turn', icon: 'turn', tone: 'plane', u: top[0], v: top[1], title: 'Turn the crystals under the pattern (Shift: 15° steps)', cursor: 'grab',
		drag: (s) => { const o = f.F; return { pturn: snapTurn(wrap(pt + (o * (angle(c, [s.u, s.v]) - angle(c, [s.u0, s.v0])) * 180) / Math.PI), s.shift) }; },
		read: (p) => `Turn ${FORMAT.deg(p.pturn)}`,
	});
	out.knobs.push({
		id: 'plane-scale', icon: 'scale', tone: 'plane', u: corner[0], v: corner[1], title: 'Scale the crystals under the pattern', cursor: 'nwse-resize',
		drag: (s) => { const r0 = Math.hypot(s.u0 - c[0], s.v0 - c[1]) || 1e-3; return { pscale: Math.round(Math.max(0.05, Math.min(8, (ps * Math.hypot(s.u - c[0], s.v - c[1])) / r0)) * 1000) / 1000 }; },
		read: (p) => `Scale ${FORMAT.x(p.pscale)}`,
	});
	out.knobs.push({
		id: 'plane-stretch', icon: 'stretch', tone: 'plane', u: side[0], v: side[1], dir: angle(c, side), title: 'Stretch the crystals across', cursor: 'ew-resize',
		drag: (s) => { const r0 = Math.hypot(s.u0 - c[0], s.v0 - c[1]) || 1e-3; return { sx: Math.round(Math.max(0.2, Math.min(5, ((P.sx ?? 1) * Math.hypot(s.u - c[0], s.v - c[1])) / r0)) * 100) / 100 }; },
		read: (p) => `Stretch ${FORMAT.x(p.sx)}`,
	});
}

// --- a modifier ------------------------------------------------------------------------------------------
// The modifier's points, in the frame, and a drag's pointer in the frame.
function modFrame(P, m) {
	const f = frameOf(P), a = ((m.a ?? 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), ox = m.x ?? 0, oy = m.y ?? 0;
	return { f, a, c, s, ox, oy, at: (ax, ay) => frameToCloth(f, ox + ax * c - ay * s, oy + ax * s + ay * c), toMod: (u, v) => { const [lx, ly] = clothToFrame(f, u, v), dx = lx - ox, dy = ly - oy; return [dx * c + dy * s, dy * c - dx * s]; }, local: (u, v) => clothToFrame(f, u, v) };
}
// The outline of a modifier, as lines on the cloth. What has bounds shows them as they lie on the piece: where
// they run past its edge, they follow the edge, so what shows is the shape the crystals fill.
function modOutline(m, F, piece, tone, faint) {
	const w = m.w ?? 0.1, cls = MOD_SHAPES[m.shape]?.cls, opts = { faint, width: faint ? 1.2 : 1.8 };
	if (cls === 'box' && !m.clip) {
		// not cut off at its sides: only its two ends
		const hw = w / 2, hh = (m.h ?? w) / 2, c = [F.at(-hw, -hh), F.at(hw, -hh), F.at(hw, hh), F.at(-hw, hh)];
		return [line(through([c[0], c[3]]), tone, opts), line(through([c[1], c[2]]), tone, opts)];
	}
	if (MOD_SHAPES[m.shape]?.bounds) return [contour(piece, modBounds(m, F.f, null), tone, opts)];
	if (m.shape === 'ripple' || m.shape === 'clouds' || m.shape === 'spiral') return [line(loop((t) => F.at(w * Math.cos(t), w * Math.sin(t))), tone, { ...opts, dash: true })];
	if (m.shape === 'checks') return [line(through([F.at(0, 0), F.at(w, 0), F.at(w, w), F.at(0, w), F.at(0, 0)]), tone, opts)];
	if (m.shape === 'waves' || m.shape === 'stripes') {
		const L = 0.05 / F.f.S;
		return [0, 1].map((n) => line(through([F.at(n * w, -L), F.at(n * w, L)]), tone, opts));
	}
	return [];
}
// The piece as a grid of how far in from its edge each node is (below 0: off the piece). Kept with the piece.
const GRID = 0.006;
function pieceGrid(piece) {
	if (piece.handleGrid) return piece.handleGrid;
	const nx = Math.ceil((piece.x1 - piece.x0) / GRID) + 2, ny = Math.ceil((piece.y1 - piece.y0) / GRID) + 2, inside = new Float32Array(nx * ny);
	for (let j = 0, q = 0; j < ny; j++) for (let i = 0; i < nx; i++, q++) {
		const u = piece.x0 - GRID / 2 + i * GRID, v = piece.y0 - GRID / 2 + j * GRID, e = piece.edgeAt(u, v);
		inside[q] = piece.find(u, v) >= 0 ? e : -Math.max(e, 0.001);
	}
	return (piece.handleGrid = { nx, ny, inside, x0: piece.x0 - GRID / 2, y0: piece.y0 - GRID / 2, val: new Float32Array(nx * ny) });
}
// The line where a value falls through zero on the piece, as pairs of points. hug: the piece's edge counts as
// well, so that it closes round what lies on the piece; otherwise only where it runs inside the piece.
function contour(piece, value, tone, opts, hug = true) {
	const G = pieceGrid(piece), { nx, ny, inside, val, x0, y0 } = G, pts = [], clear = 0.0015;
	for (let j = 0, q = 0; j < ny; j++) for (let i = 0; i < nx; i++, q++) {
		const v = value(x0 + i * GRID, y0 + j * GRID), e = inside[q];
		val[q] = hug ? Math.min(v, e - clear) : v;
	}
	const cross = (a, b, xa, ya, xb, yb) => { const t = a / (a - b); return [xa + (xb - xa) * t, ya + (yb - ya) * t]; };
	for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
		const q = j * nx + i, a = val[q], b = val[q + 1], c = val[q + nx], d = val[q + nx + 1];
		if ((a > 0) === (b > 0) && (a > 0) === (c > 0) && (a > 0) === (d > 0)) continue;
		if (!hug && (inside[q] < 0 || inside[q + 1] < 0 || inside[q + nx] < 0 || inside[q + nx + 1] < 0)) continue;
		const x = x0 + i * GRID, y = y0 + j * GRID, here = [];
		if ((a > 0) !== (b > 0)) here.push(cross(a, b, x, y, x + GRID, y));
		if ((c > 0) !== (d > 0)) here.push(cross(c, d, x, y + GRID, x + GRID, y + GRID));
		if ((a > 0) !== (c > 0)) here.push(cross(a, c, x, y, x, y + GRID));
		if ((b > 0) !== (d > 0)) here.push(cross(b, d, x + GRID, y, x + GRID, y + GRID));
		if (here.length === 2) pts.push(here[0], here[1]);
		else if (here.length === 4) pts.push(here[0], here[2], here[1], here[3]);
	}
	return line(pts, tone, { ...opts, pairs: true });
}

// The modifier as a whole as the record's list with this one changed.
const setMod = (P, m, patch) => ({ mods: P.mods.map((x) => (x.id === m.id ? { ...x, ...patch } : x)) });
const clampLen = (v, S = 1) => Math.max(0.004 / S, Math.min(2 / S, v));

function modHandles(P, m, piece, pxPerM, out) {
	const cls = MOD_SHAPES[m.shape]?.cls, tone = m.on, F = modFrame(P, m), w = m.w ?? 0.1, h = m.h ?? w, S = F.f.S, outside = OUTSIDE_PX / pxPerM / S, set = (patch) => setMod(P, m, patch), name = MOD_SHAPES[m.shape]?.label ?? '';
	if (cls === 'follow') return;
	if (cls === 'edge') {
		const edge = (u, v) => piece.edgeAt(u, v);
		out.lines.push(contour(piece, (u, v) => edge(u, v) - w * S, tone, { width: 1.8 }, false));
		// on the line, below the piece's middle
		const [cx, cy] = pieceMiddle(piece);
		let v = cy;
		for (let k = 0; k < 400 && v > piece.y0; k++, v -= 0.002) if (piece.edgeAt(cx, v) <= w * S) break;
		out.knobs.push({
			id: 'mod-depth', icon: 'stretch', tone, u: cx, v, dir: Math.PI / 2, title: 'How far in from the edge', cursor: 'ns-resize',
			drag: (s) => set({ w: tenth(Math.max(0.004, w + (piece.edgeAt(s.u, s.v) - piece.edgeAt(s.u0, s.v0)) / S)) }),
			read: (p) => `From the edge ${FORMAT.mm((p.mods.find((x) => x.id === m.id) ?? m).w)}`,
		});
		return;
	}
	out.lines.push(...modOutline(m, F, piece, tone, false));
	const c = F.at(0, 0), readMod = (k, title) => (p) => { const q = p.mods.find((x) => x.id === m.id) ?? m; return `${title} ${FORMAT.mm(q[k] * S)}`; };
	out.knobs.push({
		id: 'mod-move', icon: 'move', tone, u: c[0], v: c[1], big: true, title: `Move this ${name.toLowerCase()} on the piece`, cursor: 'move',
		drag: (s) => { const [a0, b0] = F.local(s.u0, s.v0), [a1, b1] = F.local(s.u, s.v); return set({ x: tenth(F.ox + a1 - a0), y: tenth(F.oy + b1 - b0) }); },
		read: () => name,
	});
	const turner = (at) => ({
		id: 'mod-turn', icon: 'turn', tone, u: at[0], v: at[1], title: 'Turn it (Shift: 15° steps)', cursor: 'grab',
		drag: (s) => { const [a0, b0] = F.local(s.u0, s.v0), [a1, b1] = F.local(s.u, s.v), o = [F.ox, F.oy]; return set({ a: snapTurn(wrap((m.a ?? 0) + ((angle(o, [a1, b1]) - angle(o, [a0, b0])) * 180) / Math.PI), s.shift) }); },
		read: (p) => `Turn ${FORMAT.deg((p.mods.find((x) => x.id === m.id) ?? m).a)}`,
	});
	if (cls === 'box') {
		const hw = w / 2, hh = h / 2, end = F.at(hw, 0), start = F.at(-hw, 0);
		// which way it runs: an arrow from its start to its end
		out.lines.push(line(along2(start, end), tone, { width: 1.4, faint: true }));
		const tip = F.at(hw - 0.015 / S, 0.008 / S), tip2 = F.at(hw - 0.015 / S, -0.008 / S);
		out.lines.push(line([tip, end, tip2], tone, { width: 1.8 }));
		// an end or side moves alone: the opposite one stays where it is
		const edgeKnob = (id, at, axis, sgn, key, title, icon = 'stretch') => ({
			id, icon, tone, u: at[0], v: at[1], dir: Math.atan2(at[1] - c[1], at[0] - c[0]), title, cursor: 'ew-resize',
			drag: (s) => {
				const [a0, b0] = F.toMod(s.u0, s.v0), [a1, b1] = F.toMod(s.u, s.v), d = (axis === 0 ? a1 - a0 : b1 - b0) * sgn, old = key === 'w' ? w : h, len = clampLen(old + d, S), mv = ((len - old) / 2) * sgn;
				const cx = F.ox + (axis === 0 ? mv * F.c : -mv * F.s), cy = F.oy + (axis === 0 ? mv * F.s : mv * F.c);
				return set(s.alt ? { [key]: tenth(clampLen(old + 2 * d, S)) } : { [key]: tenth(len), x: tenth(cx), y: tenth(cy) });
			},
			read: readMod(key, title),
		});
		out.knobs.push(edgeKnob('mod-start', start, 0, -1, 'w', 'Where it starts'), edgeKnob('mod-end', end, 0, 1, 'w', 'Where it ends'));
		if (m.clip) out.knobs.push(edgeKnob('mod-side-a', F.at(0, hh), 1, 1, 'h', 'Its width'), edgeKnob('mod-side-b', F.at(0, -hh), 1, -1, 'h', 'Its width'));
		out.knobs.push(turner(F.at(hw + outside, 0)));
		return;
	}
	if (cls === 'ring' || cls === 'dial') {
		const at = F.at(w, 0);
		out.lines.push(line(along2(c, at), tone, { width: 1.2, faint: true }));
		out.knobs.push({
			id: 'mod-radius', icon: cls === 'dial' ? 'turn' : 'stretch', tone, u: at[0], v: at[1], dir: Math.atan2(at[1] - c[1], at[0] - c[0]), title: cls === 'dial' ? 'Its size, and where it starts' : 'Its radius', cursor: 'ew-resize',
			drag: (s) => {
				const [a0, b0] = F.toMod(s.u0, s.v0), [a1, b1] = F.toMod(s.u, s.v), px = w + a1 - a0, py = b1 - b0, r = clampLen(Math.hypot(px, py), S);
				return set(cls === 'dial' ? { w: tenth(r), h: tenth(r), a: snapTurn(wrap((m.a ?? 0) + (Math.atan2(py, px) * 180) / Math.PI), s.shift) } : { w: tenth(r), h: tenth(r) });
			},
			read: readMod('w', 'Radius'),
		});
		return;
	}
	if (cls === 'round') {
		const aw = F.at(w, 0), ah = F.at(0, h), radial = (id, at, key, axis, title) => ({
			id, icon: 'stretch', tone, u: at[0], v: at[1], dir: Math.atan2(at[1] - c[1], at[0] - c[0]), title, cursor: 'ew-resize',
			drag: (s) => {
				const [a0, b0] = F.toMod(s.u0, s.v0), [a1, b1] = F.toMod(s.u, s.v), old = key === 'w' ? w : h, v = tenth(clampLen(old + (axis === 0 ? a1 - a0 : b1 - b0), S));
				return set(s.shift ? { w: v, h: v } : { [key]: v });
			},
			read: readMod(key, title),
		});
		out.knobs.push(radial('mod-w', aw, 'w', 0, 'Its length (Shift: keep it round)'), radial('mod-h', ah, 'h', 1, 'Its width (Shift: keep it round)'), turner(F.at(-w - outside * 0.2, 0)));
		return;
	}
	// a repeat, or a size that goes with its own direction: one handle for both, far enough out to grab
	const turnless = !!MOD_SHAPES[m.shape]?.turnless, n = Math.max(1, Math.ceil((LEVER_PX / pxPerM) / Math.max(w * S, 1e-4))), at = F.at(w * n, 0);
	out.lines.push(line(along2(c, at), tone, { width: 1.4, faint: true }));
	if (n > 1 && n <= 12) for (let k = 1; k < n; k++) { const q = F.at(w * k, 0.004 / S), q2 = F.at(w * k, -0.004 / S); out.lines.push(line([q, q2], tone, { width: 1.2 })); }
	out.knobs.push({
		id: 'mod-period', icon: turnless ? 'stretch' : 'turn', tone, u: at[0], v: at[1], dir: Math.atan2(at[1] - c[1], at[0] - c[0]), title: turnless ? 'How wide each repeat is' : 'How wide each repeat is, and which way it runs', cursor: 'ew-resize',
		drag: (s) => {
			const [a0, b0] = F.toMod(s.u0, s.v0), [a1, b1] = F.toMod(s.u, s.v), px = w * n + a1 - a0, py = b1 - b0, len = clampLen(Math.hypot(px, py) / n, S);
			return set(turnless ? { w: tenth(len), h: tenth(len) } : { w: tenth(len), h: tenth(len), a: snapTurn(wrap((m.a ?? 0) + (Math.atan2(py, px) * 180) / Math.PI), s.shift) });
		},
		read: readMod('w', 'Each repeat'),
	});
}

// Every handle of a pattern, for what is being worked on.
export function patternHandles(gen, piece, { focus = 'frame', pxPerM = 700 } = {}) {
	const P = patternParams(gen, piece), layout = LAYOUTS[P.layout], out = { knobs: [], lines: [], P };
	const mods = P.mods ?? [], active = mods.find((m) => m.id === focus && !m.off && isSpatial(m.shape));
	// what lies under what is being worked on: the other modifiers, faintly, with a dot to pick them by
	for (const m of mods) {
		if (m.off || !isSpatial(m.shape) || m === active) continue;
		const F = modFrame(P, m);
		if (MOD_SHAPES[m.shape]?.cls !== 'edge') out.lines.push(...modOutline(m, F, piece, m.on, true));
		const c = MOD_SHAPES[m.shape]?.cls === 'edge' ? pieceMiddle(piece) : F.at(0, 0);
		out.knobs.push({ id: 'pick-' + m.id, icon: 'dot', tone: m.on, u: c[0], v: c[1], small: true, title: `Work on this ${(MOD_SHAPES[m.shape]?.label ?? '').toLowerCase()}`, cursor: 'pointer', pick: m.id });
	}
	if (focus === 'plane' && !layout.flat) planeHandles(P, pxPerM, out);
	else if (active) {
		modHandles(P, active, piece, pxPerM, out);
		// the whole pattern can still be picked up
		if (!layout.flat) { const f = frameOf(P); out.knobs.push({ id: 'pick-frame', icon: 'dot', tone: 'frame', u: f.x, v: f.y, small: true, title: 'Work on the whole pattern', cursor: 'pointer', pick: 'frame' }); }
	} else if (!layout.flat) {
		frameHandles(P, piece, pxPerM, out);
		gripHandles(P, layout, piece, pxPerM, out);
	}
	return out;
}
