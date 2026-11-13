// A crystal arrangement's drawing as what prints: every line and run of its geometry (stones/geometry.js) as short
// straight stretches on the cloth, mapped as the stone engine maps them (stones/candidates.js place: the distortion, then
// the pattern's map), so a printed line lies exactly under the crystals laid along it. Single stones are not here: a
// print's dots are the kept crystals themselves (stones/pattern.js patternDots).
// -> { segs: Float32Array (x0, y0, x1, y1, inset a stretch), nSegs }, in the frame's own space.
import { G_LINE, G_RUN, G_STAMP, VERT_W, LINE_W, RUN_W, STAMP_W } from '../stones/geometry.js';

const MOST = 600000, BEND_STEP = 0.0015;
const _q = { x: 0, y: 0 };

// m: { a, b, c, d, e, f, sc, bend } (stones/pattern.js patternMap); clip: the box worth drawing, in that space; reach: how far
// past it a line still shows.
export function strokesOf(G, m, clip, reach = 0.01) {
	let segs = new Float32Array(4096 * 5), n = 0, truncated = false;
	const x0 = clip.x0 - reach, x1 = clip.x1 + reach, y0 = clip.y0 - reach, y1 = clip.y1 + reach, bend = m.bend;
	const place = (x, y) => { if (bend) { bend(x, y, _q); x = _q.x; y = _q.y; } _q.x = m.a * x + m.b * y + m.e; _q.y = m.c * x + m.d * y + m.f; };
	const push = (ax, ay, bx, by) => {
		if ((ax < x0 && bx < x0) || (ax > x1 && bx > x1) || (ay < y0 && by < y0) || (ay > y1 && by > y1)) return;
		if (n >= MOST) { truncated = true; return; }
		if ((n + 1) * 5 > segs.length) { const g = new Float32Array(Math.min(segs.length * 2, MOST * 5)); g.set(segs); segs = g; }
		const o = n * 5;
		segs[o] = ax; segs[o + 1] = ay; segs[o + 2] = bx; segs[o + 3] = by; segs[o + 4] = 0;
		n++;
	};
	// a chain of a geometry's vertices, moved by (ox, oy) in the pattern's space
	const chain = (T, v0, count, ox, oy) => {
		const V = T.Vx;
		let px = V[v0 * VERT_W] + ox, py = V[v0 * VERT_W + 1] + oy;
		place(px, py);
		let cu = _q.x, cv = _q.y;
		for (let i = 1; i < count; i++) {
			const o = (v0 + i) * VERT_W, x = V[o] + ox, y = V[o + 1] + oy;
			// a bent line is drawn in steps short enough to curve
			const parts = bend ? Math.min(64, Math.max(1, Math.ceil((Math.hypot(x - px, y - py) * m.sc) / BEND_STEP))) : 1;
			for (let k = 1; k <= parts; k++) {
				place(px + ((x - px) * k) / parts, py + ((y - py) * k) / parts);
				push(cu, cv, _q.x, _q.y);
				cu = _q.x; cv = _q.y;
			}
			px = x; py = y;
		}
	};
	const walk = (T, ox, oy, depth) => {
		for (let i = 0; i < T.items && !truncated; i++) {
			const j = T.idx[i];
			switch (T.kind[i]) {
				case G_LINE: chain(T, T.Ln[j * LINE_W], T.Ln[j * LINE_W + 1], ox, oy); break;
				case G_RUN: chain(T, T.Rn[j * RUN_W], T.Rn[j * RUN_W + 1], ox, oy); break;
				case G_STAMP: if (depth < 2) { const o = j * STAMP_W, S = T.St; walk(T.templates[S[o]], ox + S[o + 1], oy + S[o + 2], depth + 1); } break;
				default: break;
			}
		}
	};
	walk(G, 0, 0, 0);
	return { segs, nSegs: n, truncated };
}
