// Stone spacing: the one-by-one check before 2026-11-04 (old), overlapping stones (current), the parallel rule (peaks).
// Same flat piece, same presets. Writes stones.json (per preset and version: u, v, size) and metrics.json.
// Run: node compare.mjs <current app/src/stones dir> <old app/src/stones dir> <out dir>
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const [, , curDir, oldDir, outDir] = process.argv;
const imp = (dir, f) => import(pathToFileURL(join(dir, f)).href);
const cur = { P: await imp(curDir, 'pattern.js'), L: await imp(curDir, 'layouts.js'), M: await imp(curDir, 'modifiers.js') };
const old = { P: await imp(oldDir, 'pattern.js'), L: await imp(oldDir, 'layouts.js'), M: await imp(oldDir, 'modifiers.js') };

// A flat rectangle of cloth, as the tests make it: a stone's place comes back as its sp.
function flatPiece(w = 0.4, h = 0.6) {
	const piece = {
		x0: -w / 2, x1: w / 2, y0: -h / 2, y1: h / 2, w1: 0, w2: 0,
		edgeAt: (u, v) => Math.min(w / 2 - Math.abs(u), h / 2 - Math.abs(v)),
		find: (u, v) => { piece.u = u; piece.v = v; return 0; },
		posOf: (q, o) => { o.x = piece.u; o.y = piece.v; o.z = 0; return o; },
		spOf: () => ({ u: piece.u, v: piece.v }),
		angleOf: (q, a) => a,
	};
	return piece;
}

const KEYS = (process.env.KEYS ?? 'flower-of-life,circles,scales,trellis,trellis-3,plaid,ogee,chevrons,waves,wave-crests,truchet,tile-honeycomb,tile-trihex,tile-cairo,tile-greekkey,stars-hex,wallpaper-p6m,polka-star,rings-spokes,mandala,rose,guilloche,sunburst,brick,scatter-mixed').split(',');
const presetParams = (S, it) => ({ layout: it.layout, preset: it.key, ...S.L.layoutDefaults(it.layout), ...it.params, mods: (it.mods ?? []).map((m, i) => S.M.newModifier(m.on, m.shape, m, 'm' + i)) });
const genOf = (params) => ({ id: 'g', seed: 3, stone: 'Crystal', shape: 'round', params: { size: 'ss12', gap: 1.15, x: 0, y: 0, ...params } });

// how many pairs overlap (closer than 0.92 of touching, the old check's line) and the worst (1: as close as touching allows)
function overlaps(list) {
	const cell = 0.006, grid = new Map(), key = (a, b) => a * 100000 + b;
	for (let i = 0; i < list.length; i++) { const s = list[i], k = key(Math.floor(s.u / cell), Math.floor(s.v / cell)); (grid.get(k) ?? grid.set(k, []).get(k)).push(i); }
	let pairs = 0, worst = Infinity;
	for (let i = 0; i < list.length; i++) {
		const s = list[i], cx = Math.floor(s.u / cell), cy = Math.floor(s.v / cell);
		for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) for (const j of grid.get(key(cx + a, cy + b)) ?? []) {
			if (j <= i) continue;
			const o = list[j], r = Math.hypot(o.u - s.u, o.v - s.v) / ((o.size + s.size) / 2);
			if (r < worst) worst = r;
			if (r < 0.92) pairs++;
		}
	}
	return { pairs, worst: +worst.toFixed(3) };
}

const time = (fn, n = 5) => { fn(); const t0 = performance.now(); for (let i = 0; i < n; i++) fn(); return +((performance.now() - t0) / n).toFixed(2); };

const stones = {}, metrics = [];
for (const key of KEYS) {
	const itC = cur.L.GALLERY_ITEMS.get(key), itO = old.L.GALLERY_ITEMS.get(key);
	if (!itC || !itO) { console.log('skip', key); continue; }
	const pc = presetParams(cur, itC), po = presetParams(old, itO), piece = flatPiece(), pieceO = flatPiece();
	const as = (l) => l.map((s) => ({ u: s.sp.u, v: s.sp.v, size: s.size }));
	const vOld = as(old.P.patternStones(genOf(po), pieceO));
	const vCur = as(cur.P.patternStones(genOf(pc), piece));
	const cache = new Map();
	const kp = cur.P.keepPattern(genOf(pc), piece, { peaks: true, parallel: true, cache });
	const vPk = as(cur.P.patternStones(genOf(pc), piece, { peaks: true, cache }));
	// the same stones, rounds or not
	const seq = cur.P.keepPattern(genOf(pc), piece, { peaks: true, cache });
	stones[key] = { old: vOld, current: vCur, peaks: vPk };
	// time: one change of the arrangement (drawn afresh) and one move (drawn already), per version
	const moved = (p, k) => ({ ...p, x: 0.001 * k });
	let k = 0;
	const m = {
		key, layout: itC.layout,
		count: { old: vOld.length, current: vCur.length, peaks: vPk.length },
		overlaps: { old: overlaps(vOld), current: overlaps(vCur), peaks: overlaps(vPk) },
		rounds: kp.rounds, sameAsSequential: seq.n === kp.n,
		msDraw: {
			old: time(() => old.P.patternStones(genOf({ ...po, spacing: (po.spacing ?? 0.03) * (1 + 0.001 * ++k) }), flatPiece())),
			current: time(() => cur.P.keepPattern(genOf({ ...pc, spacing: (pc.spacing ?? 0.03) * (1 + 0.001 * ++k) }), piece, { cache: new Map() })),
			peaks: time(() => cur.P.keepPattern(genOf({ ...pc, spacing: (pc.spacing ?? 0.03) * (1 + 0.001 * ++k) }), piece, { cache: new Map(), peaks: true })),
		},
		msMove: {
			old: time(() => old.P.patternStones(genOf(moved(po, ++k)), flatPiece())),
			current: (() => { const c = new Map(); return time(() => cur.P.keepPattern(genOf(moved(pc, ++k)), piece, { cache: c })); })(),
			peaks: (() => { const c = new Map(); return time(() => cur.P.keepPattern(genOf(moved(pc, ++k)), piece, { cache: c, peaks: true })); })(),
			peaksRounds: (() => { const c = new Map(); return time(() => cur.P.keepPattern(genOf(moved(pc, ++k)), piece, { cache: c, peaks: true, parallel: true })); })(),
		},
	};
	metrics.push(m);
	console.log(JSON.stringify(m));
}
writeFileSync(join(outDir, 'stones.json'), JSON.stringify(stones));
writeFileSync(join(outDir, 'metrics.json'), JSON.stringify(metrics, null, 1));
