// Pattern pieces from the flattened garment: one outline per piece in millimetres, with the
// grain line, name and cutting note, scaled for the fabric's negative ease and grown by the seam
// allowance. Feeds the flat-piece view and the printable PDF (export/pdf.js).
// Decision: knowledge/decisions/2026-10-15-printable-pdf-patterns.md. A piece on an overlay layer is
// appliqué: cut with no seam allowance, with a placement line on the piece it is sewn onto
// (knowledge/domain/construction/applique-and-overlays.md).
import { locate } from './arrangement.js';
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

// Smooth the small steps of a flattened outline while keeping its real corners (junctions of
// seams, where the outline turns by more than about 35 degrees over a few millimetres).
export function smoothOutline(poly, passes = 4) {
	const n = poly.length;
	if (n < 8) return poly;
	const turn = (i, k = 3) => {
		const a = poly[(i - k + n) % n], b = poly[i], c = poly[(i + k) % n];
		const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]];
		return Math.abs(Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]));
	};
	const corner = poly.map((_, i) => turn(i) > 0.6);
	let p = poly.map((q) => q.slice());
	for (let it = 0; it < passes; it++) {
		const q = p.map((x) => x.slice());
		for (let i = 0; i < n; i++) {
			if (corner[i]) continue;
			const a = p[(i - 1 + n) % n], b = p[(i + 1) % n];
			q[i] = [(a[0] + 2 * p[i][0] + b[0]) / 4, (a[1] + 2 * p[i][1] + b[1]) / 4];
		}
		p = q;
	}
	return p;
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
		let stitch = loops[0].map(([u, v]) => [u * 1000 * (1 + o.easeAcross), v * 1000 * (1 + o.easeAlong)]);
		if (signedArea(stitch) < 0) stitch.reverse();
		stitch = simplify(smoothOutline(stitch), 0.3);
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
		const lines = [panel?.outline, panel?.mirror === 'both' ? panel.outline + '~m' : null].map((k) => k && shell.g.evaluated?.get(k)).filter(Boolean);
		for (const e of lines) {
			let run = null, at = null;
			// (a sample or two where the line ends on a seam can land on the far side of it: not sewn there)
			const stop = () => { if (run?.length > 3) { at.placement.push(run); if (!over.sewnOn.includes(at.name)) over.sewnOn.push(at.name); } run = null; };
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
