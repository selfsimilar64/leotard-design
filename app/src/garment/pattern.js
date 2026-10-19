// Pattern pieces from the flattened garment: one outline per piece in millimetres, with the
// grain line, name and cutting note, scaled for the fabric's negative ease and grown by the seam
// allowance. Feeds the flat-piece view and the printable PDF (export/pdf.js).
// Decision: knowledge/decisions/2026-10-15-printable-pdf-patterns.md.

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
		while (!used.has(v) && next.has(v) && guard++ < 100000) { used.add(v); loop.push([uv[v * 2], uv[v * 2 + 1]]); v = next.get(v); }
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
function normOut(a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dy / l, -dx / l]; }

export function signedArea(poly) { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }

// garmentView: render/garment.js GarmentView (cells with piece + uv), doc: the design.
// -> [{ key, panelId, name, colour, cut: 'Cut 1' | 'Cut 2 (mirror pair)', stitch: [[x, y] mm], cutLine, grain: { at, angle }, size: [w, h] }]
export function patternPieces(garmentView, doc, opts = {}) {
	const o = { ...PATTERN_DEFAULTS, ...(doc.meta.pattern ?? {}), ...opts };
	const out = [], seenMirror = new Set();
	for (const c of garmentView.cells) {
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
		const cutLine = offsetPolygon(stitch, o.seamAllowance * 1000);
		let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
		for (const [x, y] of cutLine) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
		const shift = ([x, y]) => [x - x0, y - y0];
		const s = panel.stack?.[0] ?? {};
		out.push({
			key: c.sig, panelId: panel.id, name: panel.name || panel.id, colour: s.colour ?? '#888888', fabric: s.fabric,
			cut: panel.mirror === 'both' ? 'Cut 2 (a mirrored pair)' : 'Cut 1',
			stitch: stitch.map(shift), cutLine: cutLine.map(shift), size: [x1 - x0, y1 - y0],
			grain: { at: [(x1 - x0) / 2, (y1 - y0) / 2], angle: -(s.grain ?? 0) },
			stretch: c.stretch,
		});
	}
	return { pieces: out, settings: o };
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
