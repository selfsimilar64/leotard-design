// Pattern pieces from the flattened garment: one outline per piece in millimetres, with the
// grain line, name and cutting note, scaled for the fabric's negative ease and grown by the seam
// allowance. Feeds the flat-piece view and the printable PDF (export/pdf.js).
// Decision: knowledge/decisions/2026-10-15-printable-pdf-patterns.md. A piece on an overlay layer is
// appliqué: cut with no seam allowance, with a placement line on the piece it is sewn onto
// (knowledge/domain/construction/applique-and-overlays.md).
import { locate } from './arrangement.js';
import { overlayLines } from './build.js';
import { fromSP } from '../body/surface.js';

export const PATTERN_DEFAULTS = { easeAcross: -0.1, easeAlong: -0.05, seamAllowance: 0.006 };

// Boundary loops of a piece in UV space (edges used by one triangle), longest first.
export function pieceOutlines(I, uv) {
	const count = new Map(), dir = new Map();
	const n = uv.length / 2;
	for (let t = 0; t < I.length / 3; t++) for (let e = 0; e < 3; e++) {
		const a = I[t * 3 + e], b = I[t * 3 + (e + 1) % 3], k = a < b ? a * n + b : b * n + a;
		count.set(k, (count.get(k) ?? 0) + 1);
		dir.set(k, [a, b]);
	}
	const next = new Map();
	for (const [k, c] of count) if (c === 1) { const [a, b] = dir.get(k); next.set(a, b); }
	const loops = [], used = new Set();
	for (const s of next.keys()) {
		if (used.has(s)) continue;
		const loop = [];
		let v = s, guard = 0;
		while (!used.has(v) && next.has(v) && guard++ < 100000) { used.add(v); loop.push([uv[v * 2], uv[v * 2 + 1], v]); v = next.get(v); }
		if (loop.length >= 3) loops.push(loop);
	}
	const len = (l) => l.reduce((s, p, i) => s + Math.hypot(p[0] - l[(i + 1) % l.length][0], p[1] - l[(i + 1) % l.length][1]), 0);
	return loops.sort((a, b) => len(b) - len(a));
}

// Douglas-Peucker on a closed polygon (tolerance in the polygon's units).
export function simplify(poly, tol) {
	if (poly.length < 4) return poly;
	const dp = (pts) => {
		if (pts.length < 3) return pts;
		const [a, b] = [pts[0], pts[pts.length - 1]];
		let mx = -1, mi = 0;
		for (let i = 1; i < pts.length - 1; i++) {
			const d = distSeg(pts[i], a, b);
			if (d > mx) { mx = d; mi = i; }
		}
		if (mx <= tol) return [a, b];
		const l = dp(pts.slice(0, mi + 1)), r = dp(pts.slice(mi));
		return [...l.slice(0, -1), ...r];
	};
	// split at the point farthest from the first
	let far = 0, fd = -1;
	poly.forEach((p, i) => { const d = Math.hypot(p[0] - poly[0][0], p[1] - poly[0][1]); if (d > fd) { fd = d; far = i; } });
	const A = dp(poly.slice(0, far + 1)), B = dp([...poly.slice(far), poly[0]]);
	return [...A.slice(0, -1), ...B.slice(0, -1)];
}
function distSeg(p, a, b) {
	const bx = b[0] - a[0], by = b[1] - a[1], l2 = bx * bx + by * by;
	const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * bx + (p[1] - a[1]) * by) / l2)) : 0;
	return Math.hypot(p[0] - a[0] - bx * t, p[1] - a[1] - by * t);
}

// A line on the body is smooth between its corners, but its flat shape is not: the body cannot lie
// flat without stretch, and the stretch changes from triangle to triangle, leaving bumps of a millimetre
// or two over a few millimetres of edge. Those are not the design, and a cut piece must not have them.
//
// A polyline with both ends held, smoothed: resampled every millimetre, then a smoothing spline (least
// squares with a penalty on its second differences), then the same again on what that took away, which
// gives back the real curves. A wave 10 mm long keeps 1% of its height, 20 mm 18%, 40 mm 86%, 50 mm 96%
// (a curve of 8 mm radius loses 0.3 mm) and 100 mm almost all of it.
const SPLINE = 1000;
export function smoothRun(pts, lambda = SPLINE) {
	const s = [0];
	for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
	const L = s[s.length - 1], n = Math.round(L) + 1;
	if (n < 6) return pts;
	const X = new Float64Array(n), Y = new Float64Array(n);
	for (let i = 0, j = 0; i < n; i++) {
		const d = (i / (n - 1)) * L;
		while (j < pts.length - 2 && s[j + 1] < d) j++;
		const t = (d - s[j]) / Math.max(s[j + 1] - s[j], 1e-9);
		X[i] = pts[j][0] + (pts[j + 1][0] - pts[j][0]) * t; Y[i] = pts[j][1] + (pts[j + 1][1] - pts[j][1]) * t;
	}
	// (W + lambda D'D) q = W p, where W is 1 and very heavy at the two ends: LDL' of a five-band matrix
	const hold = 1e6 * (1 + lambda), d = new Float64Array(n), e = new Float64Array(n), f = new Float64Array(n);
	for (let i = 0; i < n; i++) {
		const a0 = (i === 0 || i === n - 1 ? hold + lambda : 1 + lambda * (i === 1 || i === n - 2 ? 5 : 6));
		const a1 = lambda * (i === 0 || i === n - 2 ? -2 : -4), a2 = lambda;
		const e1 = i > 0 ? e[i - 1] : 0, d1 = i > 0 ? d[i - 1] : 0, f1 = i > 0 ? f[i - 1] : 0, f2 = i > 1 ? f[i - 2] : 0, d2 = i > 1 ? d[i - 2] : 0;
		d[i] = a0 - e1 * e1 * d1 - f2 * f2 * d2;
		e[i] = (a1 - f1 * e1 * d1) / d[i];
		f[i] = a2 / d[i];
	}
	const solve = (A) => {
		const y = new Float64Array(n), z = new Float64Array(n);
		for (let i = 0; i < n; i++) y[i] = (i === 0 || i === n - 1 ? hold : 1) * A[i] - (i > 0 ? e[i - 1] * y[i - 1] : 0) - (i > 1 ? f[i - 2] * y[i - 2] : 0);
		for (let i = n - 1; i >= 0; i--) z[i] = y[i] / d[i] - (i < n - 1 ? e[i] * z[i + 1] : 0) - (i < n - 2 ? f[i] * z[i + 2] : 0);
		return z;
	};
	const twice = (A) => { const a = solve(A), b = solve(A.map((v, i) => v - a[i])); return a.map((v, i) => v + b[i]); };
	const qx = twice(X), qy = twice(Y), out = [];
	for (let i = 0; i < n; i++) out.push([qx[i], qy[i]]);
	out[0] = [pts[0][0], pts[0][1]]; out[n - 1] = [pts[pts.length - 1][0], pts[pts.length - 1][1]];
	return out;
}

// A closed outline smoothed between its corners (indices into poly, which stay exactly where they are).
export function cleanOutline(poly, corners) {
	const n = poly.length;
	if (n < 8) return poly;
	const piece = (a, count) => { const r = []; for (let k = 0; k <= count; k++) r.push(poly[(a + k) % n]); return r; };
	if (!corners.length) {
		// no corner at all: a third of it either side, so the place the loop is opened leaves no mark
		const length = (r) => { let L = 0; for (let i = 1; i < r.length; i++) L += Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]); return L; };
		const pad = Math.floor(n / 3), run = piece(n - pad, 2 * pad + n), smooth = smoothRun(run), step = length(run) / (smooth.length - 1);
		return smooth.slice(Math.round(length(piece(n - pad, pad)) / step), Math.round(length(piece(n - pad, pad + n)) / step));
	}
	const out = [], list = [...corners].sort((a, b) => a - b);
	list.forEach((c, i) => {
		const to = list[(i + 1) % list.length], count = (to - c + n) % n || n;
		out.push(...smoothRun(piece(c, count)).slice(0, -1));
	});
	return out;
}

// Where a flattened outline really has a corner: where it passes from one line to another, or where it
// turns sharply on the body itself (the flat shape's own bumps turn as sharply, so it cannot say).
// loop: [u, v, vertex]; lineOf(i): what edge i -> i + 1 lies on; P: the piece's 3D positions, metres.
export function outlineCorners(loop, lineOf, P, reach = 0.004, sharp = 0.6) {
	const n = loop.length, at = (i) => { const v = loop[i][2] * 3; return [P[v], P[v + 1], P[v + 2]]; };
	const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
	const out = new Set(), turn = new Float64Array(n);
	for (let i = 0; i < n; i++) {
		if (lineOf(i) !== lineOf((i - 1 + n) % n)) out.add(i);
		const c = at(i);
		let a = (i - 1 + n) % n, b = (i + 1) % n;
		for (let k = 0; k < n / 3 && dist(at(a), c) < reach; k++) a = (a - 1 + n) % n;
		for (let k = 0; k < n / 3 && dist(at(b), c) < reach; k++) b = (b + 1) % n;
		const p = at(a), q = at(b), u = [c[0] - p[0], c[1] - p[1], c[2] - p[2]], v = [q[0] - c[0], q[1] - c[1], q[2] - c[2]];
		const dot = u[0] * v[0] + u[1] * v[1] + u[2] * v[2], lu = Math.hypot(...u), lv = Math.hypot(...v);
		turn[i] = lu && lv ? Math.acos(Math.max(-1, Math.min(1, dot / (lu * lv)))) : 0;
	}
	// a sharp stretch counts once, at its sharpest
	for (let i = 0; i < n; i++) {
		if (turn[i] <= sharp || turn[(i - 1 + n) % n] > sharp) continue;
		let best = i;
		for (let j = i, k = 0; turn[j] > sharp && k < n; j = (j + 1) % n, k++) if (turn[j] > turn[best]) best = j;
		out.add(best);
	}
	return [...out];
}

// Offset a counter-clockwise polygon outward by d (mitred, with a miter limit).
export function offsetPolygon(poly, d) {
	const n = poly.length, out = [];
	for (let i = 0; i < n; i++) {
		const p = poly[(i - 1 + n) % n], c = poly[i], q = poly[(i + 1) % n];
		const n1 = normOut(p, c), n2 = normOut(c, q);
		let mx = n1[0] + n2[0], my = n1[1] + n2[1];
		const ml = Math.hypot(mx, my) || 1;
		mx /= ml; my /= ml;
		const cos = mx * n1[0] + my * n1[1];
		const k = d / Math.max(cos, 0.35); // miter limit
		out.push([c[0] + mx * k, c[1] + my * k]);
	}
	return out;
}
// The same with its own distance per edge: edgeD[i] for the edge from point i to point i + 1. A corner
// is where the two offset edges meet, limited so a sharp tip does not run away.
export function offsetEdges(poly, edgeD) {
	const n = poly.length;
	return poly.map((c, i) => {
		const h = (i - 1 + n) % n, n0 = normOut(poly[h], c), n1 = normOut(c, poly[(i + 1) % n]), d0 = edgeD[h], d1 = edgeD[i];
		const det = n0[0] * n1[1] - n0[1] * n1[0], most = Math.max(d0, d1);
		let x, y;
		if (Math.abs(det) < 0.05) { x = n1[0] * d1 + n0[0] * (d0 - d1) * 0.5; y = n1[1] * d1 + n0[1] * (d0 - d1) * 0.5; }
		else { x = (d0 * n1[1] - d1 * n0[1]) / det; y = (d1 * n0[0] - d0 * n1[0]) / det; }
		const L = Math.hypot(x, y), k = L > most * 2.5 && L > 0 ? most * 2.5 / L : 1;
		return [c[0] + x * k, c[1] + y * k];
	});
}
function normOut(a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dy / l, -dx / l]; }

export function signedArea(poly) { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }

// garmentView: render/garment.js GarmentView (cells with piece + uv), doc: the design.
// -> { pieces: [{ key, panelId, name, colour, material, construction: 'pieced' | 'appliqué' | 'lining', sewnOn: [names], placement: [polylines mm],
//      cut: 'Cut 1' | 'Cut 2 (a mirrored pair)', stitch: [[x, y] mm], cutLine, grain: { at, angle }, size: [w, h] }], fabrics: [names], finishes: [{ kind, width, length, material }], settings }
// opts.surf: the reference surface, needed for placement lines.
export function patternPieces(views, doc, opts = {}) {
	const o = { ...PATTERN_DEFAULTS, ...(doc.meta.pattern ?? {}), ...opts };
	const out = [], seenMirror = new Set(), viewList = Array.isArray(views) ? views : [views];
	const overlayLayers = new Set(doc.layers.filter((l) => l.kind === 'overlay').map((l) => l.id));
	const arrOf = new Map(viewList.flatMap((v) => v.cells.map((c) => [c, v.g?.arr])));
	for (const c of viewList.flatMap((v) => v.cells)) {
		if (!c.hasUV) continue;
		const panel = doc.panels.find((p) => p.id === c.panelId);
		if (!panel) continue;
		const uv = c.mesh.geometry.attributes.aUV.array;
		const loops = pieceOutlines(c.piece.I, uv);
		if (!loops.length) continue;
		if (c.piece.P.length / 3 < 12) continue; // a speck, not a piece
		const arr = arrOf.get(c), loop = loops[0], verts = c.piece.verts, lineOf = (i) => { const cs = arr?.constraint.get(arr.ekey(verts[loop[i][2]], verts[loop[(i + 1) % loop.length][2]])); return cs ? [...cs].sort().join() : ''; };
		let stitch = cleanOutline(loop.map(([u, v]) => [u * 1000 * (1 + o.easeAcross), v * 1000 * (1 + o.easeAlong)]), outlineCorners(loop, lineOf, c.piece.P));
		if (signedArea(stitch) < 0) stitch.reverse();
		stitch = simplify(stitch, 0.3);
		// a mirrored panel is one pattern piece cut twice (the second cell is its mirror image)
		if (panel.mirror === 'both') { if (seenMirror.has(panel.id)) continue; seenMirror.add(panel.id); }
		const applique = overlayLayers.has(panel.layer);
		const bounds = applique ? doc.layers.find((l) => l.id === panel.layer)?.bounds : null;
		const held = bounds?.length ? caughtEdges(loops[0], stitch, c, arrOf.get(c), bounds, o) : null;
		const cutLine = applique ? (held ? offsetEdges(stitch, held.map((h) => (h ? o.seamAllowance * 1000 : 0))) : stitch) : offsetPolygon(stitch, o.seamAllowance * 1000);
		let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
		for (const [x, y] of cutLine) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
		const shift = ([x, y]) => [x - x0, y - y0];
		const s = panel.stack?.[0] ?? {};
		out.push({
			rec: c, shift, ease: o,
			key: c.sig, panelId: panel.id, name: panel.name || panel.id, colour: s.colour ?? '#888888', fabric: s.fabric, material: doc.materials?.find((m) => m.id === s.material)?.name ?? s.fabric,
			caught: held ? caughtRuns(stitch, held).map((r) => r.map(shift)) : [],
			caughtIn: held ? bounds.map((id) => doc.curves.find((x) => x.id === id)?.name).filter(Boolean) : [],
			construction: applique ? 'appliqué' : doc.layers.find((l) => l.id === panel.layer)?.kind === 'lining' ? 'lining' : 'pieced', sewnOn: [], placement: [],
			cut: panel.mirror === 'both' ? 'Cut 2 (a mirrored pair)' : 'Cut 1',
			stitch: stitch.map(shift), cutLine: cutLine.map(shift), size: [x1 - x0, y1 - y0],
			grain: { at: [(x1 - x0) / 2, (y1 - y0) / 2], angle: -(s.grain ?? 0) },
			stretch: c.stretch,
		});
	}
	if (o.surf) placements(out, viewList, doc, o.surf);
	const fabrics = [...new Set(out.map((p) => p.material))];
	const evaluated = viewList[0]?.g?.evaluated;
	const finishes = doc.trims.filter((t) => t.kind !== 'none' && evaluated && t.on.some((id) => evaluated.has(id))).map((t) => ({
		kind: t.kind, width: t.width ?? null, material: doc.materials?.find((m) => m.id === t.fabric?.material)?.name ?? null,
		length: t.on.reduce((L, id) => L + (evaluated.get(id)?.length ?? 0) + (evaluated.get(id + '~m')?.length ?? 0), 0) * 1000,
	}));
	for (const p of out) { delete p.rec; delete p.shift; delete p.ease; }
	return { pieces: out, fabrics, finishes, settings: o };
}

// For each edge of a piece's cleaned-up outline: does it run along one of the lines it is caught in?
// Read from the flat outline's own edges, each knowing which lines it lies on, by nearest point.
function caughtEdges(raw, stitch, c, arr, bounds, o) {
	if (!arr) return null;
	const n = raw.length, on = new Set(bounds), verts = c.piece.verts, toMm = (p) => [p[0] * 1000 * (1 + o.easeAcross), p[1] * 1000 * (1 + o.easeAlong)];
	const mm = raw.map(toMm), flag = raw.map((p, i) => {
		const cs = arr.constraint.get(arr.ekey(verts[p[2]], verts[raw[(i + 1) % n][2]]));
		return !!cs && [...cs].some((id) => on.has(id.replace(/~m$/, '')));
	});
	const nearest = (q) => { let b = 0, bd = Infinity; mm.forEach((p, i) => { const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (d < bd) { bd = d; b = i; } }); return b; };
	// the middle of each cleaned-up edge says which it is, so a corner cannot flip its neighbour
	return stitch.map((p, i) => { const q = stitch[(i + 1) % stitch.length]; return flag[nearest([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2])]; });
}

// The caught stretches of an outline, as polylines.
function caughtRuns(poly, held) {
	const n = poly.length, start = held.findIndex((h, i) => h && !held[(i - 1 + n) % n]);
	if (start < 0) return held.every(Boolean) ? [[...poly, poly[0]]] : [];
	const runs = [];
	let run = null;
	for (let k = 0; k < n; k++) {
		const i = (start + k) % n;
		if (held[i]) { run ??= [poly[i]]; run.push(poly[(i + 1) % n]); } else if (run) { runs.push(run); run = null; }
	}
	if (run) runs.push(run);
	return runs;
}

// Each overlay piece's outline, on the flat shape of the pieces it lies on: where to lay it when
// sewing. A mirrored outline's other half falls on the mirrored cut of the same piece, or on the
// other half of a piece cut once.
function placements(pieces, views, doc, surf) {
	const shell = views.find((v) => (v.layer?.id ?? 'L0') === 'L0');
	if (!shell?.g) return;
	const arr = shell.g.arr, byPiece = new Map();
	for (const p of pieces) byPiece.set(p.rec, p);
	const triAt = new Map(); // arrangement triangle -> [the shell's cell record, index in its triangles]
	for (const r of shell.cells) arr.cells[r.cell].tris.forEach((t, q) => triAt.set(t, [r, q]));
	for (const over of pieces) {
		if (over.construction !== 'appliqué') continue;
		const panel = doc.panels.find((p) => p.id === over.panelId);
		const lines = (panel ? overlayLines(doc, panel) : []).flatMap((id) => [id, id + '~m']).map((k) => shell.g.evaluated?.get(k)).filter(Boolean);
		for (const e of lines) {
			let run = null, at = null;
			// (a sample or two where the line ends on a seam can land on the far side of it: not sewn there)
			const stop = () => { if (run?.length > 3) { at.placement.push(smoothRun(run)); if (!over.sewnOn.includes(at.name)) over.sewnOn.push(at.name); } run = null; };
			for (const sp of [...e.sps, ...(e.closed ? [e.sps[0]] : [])]) {
				const t = locate(arr, surf, sp), hit = t >= 0 ? triAt.get(t) : null, base = hit ? byPiece.get(hit[0]) : null;
				if (!base?.rec.hasUV || base.construction !== 'pieced') { stop(); at = null; continue; }
				if (at !== base) { stop(); at = base; }
				(run ??= []).push(flatPoint(arr, surf, base, hit[1], t, fromSP(sp)));
			}
			stop();
		}
	}
}

// A surface point in a shell triangle -> its place on the flat piece, in the piece's millimetres.
function flatPoint(arr, surf, base, q, t, sp) {
	const P = surf.pos(sp), V = arr.VP, I = base.rec.piece.I, uv = base.rec.mesh.geometry.attributes.aUV.array;
	const c = [0, 1, 2].map((k) => { const v = arr.tris[t * 3 + k] * 3; return [V[v], V[v + 1], V[v + 2]]; });
	const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
	const e0 = sub(c[1], c[0]), e1 = sub(c[2], c[0]), e2 = sub([P.x, P.y, P.z], c[0]);
	const d00 = dot(e0, e0), d01 = dot(e0, e1), d11 = dot(e1, e1), d20 = dot(e2, e0), d21 = dot(e2, e1), den = d00 * d11 - d01 * d01 || 1;
	const b1 = (d11 * d20 - d01 * d21) / den, b2 = (d00 * d21 - d01 * d20) / den, b = [1 - b1 - b2, b1, b2];
	let u = 0, v = 0;
	for (let k = 0; k < 3; k++) { const l = I[q * 3 + k]; u += b[k] * uv[l * 2]; v += b[k] * uv[l * 2 + 1]; }
	return base.shift([u * 1000 * (1 + base.ease.easeAcross), v * 1000 * (1 + base.ease.easeAlong)]);
}

// Shelf layout of pieces (mm) in rows no wider than maxWidth; gap between pieces.
export function layoutPieces(pieces, maxWidth = 560, gap = 18) {
	const placed = [];
	let x = 0, y = 0, rowH = 0, W = 0;
	for (const p of pieces.slice().sort((a, b) => b.size[1] - a.size[1])) {
		if (x > 0 && x + p.size[0] > maxWidth) { x = 0; y += rowH + gap; rowH = 0; }
		placed.push({ ...p, at: [x, y] });
		x += p.size[0] + gap; rowH = Math.max(rowH, p.size[1]); W = Math.max(W, x - gap);
	}
	return { placed, size: [W, y + rowH] };
}
