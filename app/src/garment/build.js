// From the document's curves and panel seeds to the cut garment: evaluate every curve (and its
// mirror image), snap curve ends onto the curves they end on, build the arrangement, and give
// each cell its panel. Pure data, no three.js scene objects (render/garment.js draws the result).
import { evaluateCurve } from '../curves/evaluate.js';
import { mirrorSP, pointAlong } from '../curves/points.js';
import { fromSP, toSP } from '../body/surface.js';
import { buildArrangement, locate, baryOfVertexInFace } from './arrangement.js';
import { openingLoops } from './edges.js';
import { cellSignature } from './pieces.js';

// Curve roles that cut the garment into cells. Guides, strap and trim paths do not.
export const CUTTING = new Set(['seam', 'edge', 'print']);
const SNAP = 0.003;
const SLIVER = 0.0003; // m2 (3 cm2)

// -> Map(key -> evaluated) where key is the curve id, or id + '~m' for its mirror image.
// Curves attached to other curves are evaluated after them (and re-evaluated when they change).
// layer null: every layer's curves (lines may attach to lines on other layers).
export function evaluateAll(doc, surf, layer = null, cache = null) {
	const out = new Map();
	const mfn = (sp) => mirrorSP(sp, surf);
	const curves = doc.curves.filter((c) => layer === null || (c.layer ?? 'L0') === layer);
	const byId = new Map(curves.map((c) => [c.id, c]));
	// a line that was split from its pair (doc/symmetry.js): its twin stands in for its mirror image
	const twinOf = (id) => { const t = byId.get(id)?.twin; return t && byId.has(t) ? t : null; };
	const deps = (c) => c.points.filter((p) => p.on && byId.has(p.on.curve) && p.on.curve !== c.id).flatMap((p) => { const t = twinOf(p.on.curve); return t && t !== c.id ? [p.on.curve, t] : [p.on.curve]; });
	// depth-first topological order; a dependency cycle just drops the attachment
	const order = [], state = new Map();
	const visit = (c) => {
		if (state.get(c.id) === 2) return;
		if (state.get(c.id) === 1) return;
		state.set(c.id, 1);
		for (const d of deps(c)) visit(byId.get(d));
		state.set(c.id, 2); order.push(c);
	};
	for (const c of curves) visit(c);
	for (const c of order) {
		const depSig = deps(c).map((d) => (out.get(d)?.sig ?? '') + (out.get(d + '~m')?.sig ?? '')).join('|');
		const sig = JSON.stringify([c.points, c.closed, c.shape]) + depSig;
		const resolveOn = (on, mirrored) => {
			// the mirror image of an attached point sits on the mirror image of its curve; a curve with
			// no mirror image (a symmetric loop such as a neckline) is its own: take the sample of it
			// nearest the mirrored point
			const flip = on.mirror ? !mirrored : mirrored;
			const tgt = out.get(on.curve + (flip ? '~m' : ''));
			if (tgt && tgt.sps.length) return pointAlong(tgt, on.t ?? 0);
			const tw = flip && twinOf(on.curve) ? out.get(twinOf(on.curve)) : null;
			if (tw && tw.sps.length) return pointAlong(tw, on.t ?? 0);
			const own = out.get(on.curve);
			if (!own || !own.sps.length) return null;
			const sp = pointAlong(own, on.t ?? 0);
			return flip ? nearestSample(own, surf.pos(mirrorSP(sp, surf))) : sp;
		};
		const get = (key, mirror) => {
			const hit = cache?.get(key);
			if (hit && hit.sig === sig) return hit;
			const e = evaluateCurve(c, surf, { mirror: mirror ? mfn : null, resolveOn });
			e.sig = sig; e.curve = c.id; e.role = c.role; e.mirrored = mirror;
			return e;
		};
		out.set(c.id, get(c.id, false));
		if (c.mirror === 'both') out.set(c.id + '~m', get(c.id + '~m', true));
	}
	return out;
}

// The sample of an evaluated curve nearest a position.
export function nearestSample(e, p) {
	let bi = 0, bd = Infinity;
	for (let i = 0; i < e.pts.length; i++) { const d = e.pts[i].distanceToSquared(p); if (d < bd) { bd = d; bi = i; } }
	return { ...e.sps[bi] };
}

// Ends of open curves that stop within SNAP of another curve are moved exactly onto it, so the
// curve meets it (a T-junction) instead of stopping short or overshooting.
function snapEnds(list, surf) {
	for (const e of list) {
		if (e.closed || e.pts.length < 2) continue;
		for (const end of [0, e.pts.length - 1]) {
			const p = e.pts[end];
			let best = SNAP, hit = null;
			for (const o of list) {
				if (o === e) continue;
				for (let i = 0; i < o.pts.length; i++) {
					const d = o.pts[i].distanceTo(p);
					if (d < best) { best = d; hit = o.sps[i]; }
				}
			}
			if (hit) { e.sps[end] = { ...hit }; e.pts[end] = surf.pos(hit); }
		}
	}
}

// prev: an earlier build; when the curves are unchanged its evaluation and arrangement are reused
// and only the panel seeds are re-located.
// layer: which layer's lines cut this garment; evaluated: a shared evaluation of all curves.
// A layer's `bounds` are lines of the shell that also cut it: the seams an overlay piece runs up to
// (overlay.add). alsoCut: more line ids, for a line still being drawn (strokeRegions).
export function buildGarment(doc, surf, { prev = null, layer = 'L0', evaluated: shared = null, alsoCut = null } = {}) {
	const t0 = performance.now();
	const curveSig = JSON.stringify(doc.curves);
	let evaluated, arr, tEval = t0;
	const bounds = doc.layers?.find((l) => l.id === layer)?.bounds;
	if (prev && !alsoCut && prev.curveSig === curveSig && prev.layer === layer && JSON.stringify(prev.bounds) === JSON.stringify(bounds)) ({ evaluated, arr } = prev);
	else {
		evaluated = shared ?? evaluateAll(doc, surf, null, prev?.evaluated);
		const ofLayer = new Set([...doc.curves.filter((c) => (c.layer ?? 'L0') === layer).map((c) => c.id), ...(bounds ?? []), ...(alsoCut ?? [])]);
		const cutting = [...evaluated.entries()].filter(([, e]) => ofLayer.has(e.curve) && CUTTING.has(e.role) && e.sps.length > 1);
		// snapping edits the polylines: work on copies so cached evaluations stay pristine
		const list = cutting.map(([key, e]) => ({ key, id: key, sps: e.sps.slice(), pts: e.pts.slice(), closed: e.closed }));
		snapEnds(list, surf);
		tEval = performance.now();
		arr = buildArrangement(surf, list.map((l) => ({ id: l.key, sps: l.sps, closed: l.closed })));
	}
	// panels: each seed (and its mirror image) claims the cell it lands in; first claim wins
	const cellPanel = new Int32Array(arr.cells.length).fill(-1);
	const seeds = [], panelIds = doc.panels.map((p) => p.id);
	doc.panels.forEach((p, pi) => {
		if ((p.layer ?? 'L0') !== layer) return;
		const sps = [fromSP(p.seed)];
		if (p.mirror === 'both') sps.push(mirrorSP(sps[0], surf));
		for (const sp of sps) {
			const t = locate(arr, surf, sp);
			const cell = t >= 0 ? arr.cellOf[t] : -1;
			seeds.push({ panel: p.id, cell });
			if (cell >= 0 && cellPanel[cell] < 0) cellPanel[cell] = pi;
		}
	});
	// slivers: a cell of a few square centimetres that no seed claims (lines meeting at a shallow
	// angle) joins the neighbour it shares most boundary with, instead of becoming a hole
	for (let c = 0; c < arr.cells.length; c++) {
		if (cellPanel[c] >= 0 || arr.cells[c].area > SLIVER) continue;
		let best = -1, bl = 0;
		for (const [n, l] of arr.cellAdj[c]) if (l > bl && arr.cells[n].area > SLIVER) { bl = l; best = n; }
		if (best >= 0) cellPanel[c] = cellPanel[best];
	}
	return {
		evaluated, arr, cellPanel, seeds, curveSig, panelIds, layer, bounds,
		ms: { eval: tEval - t0, arrangement: prev?.arr === arr ? 0 : arr.ms, total: performance.now() - t0 },
	};
}

// A surface point inside a cell: the centroid of its largest triangle.
export function cellSeed(arr, surf, cell) {
	let best = -1, ba = -1;
	const VP = arr.VP;
	for (const t of arr.cells[cell].tris) {
		const a = arr.tris[t * 3] * 3, b = arr.tris[t * 3 + 1] * 3, c = arr.tris[t * 3 + 2] * 3;
		const ux = VP[b] - VP[a], uy = VP[b + 1] - VP[a + 1], uz = VP[b + 2] - VP[a + 2], vx = VP[c] - VP[a], vy = VP[c + 1] - VP[a + 1], vz = VP[c + 2] - VP[a + 2];
		const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx, ar = x * x + y * y + z * z;
		if (ar > ba) { ba = ar; best = t; }
	}
	const f = arr.triFace[best], b = [0, 0, 0];
	for (let k = 0; k < 3; k++) { const q = baryOfVertexInFace(arr, surf, arr.tris[best * 3 + k], f); for (let j = 0; j < 3; j++) b[j] += q[j] / 3; }
	return { f, b0: b[0], b1: b[1], b2: b[2] };
}

// Cells that belong to no panel but were fabric in the previous build (a new line split a panel):
// returns new panels to add, each inheriting the stack of the panel it was cut from. A cell and
// its mirror image become one panel with mirror 'both'. When the panel that was cut kept the mirror
// image of the new cell (its seed lay inside one of two mirrored shapes), it becomes the pair:
// { pair: panelId } (owner, 2026-10-31: the Front's seed is on the wearer's left, so its two new
// chest pieces came out unlinked). New pieces get a name of their own: the pattern lists them by name.
export function inheritPanels(g, prev, doc, surf) {
	if (!prev) return [];
	const out = [], claimed = new Set(), names = new Set(doc.panels.map((p) => p.name));
	const nameOf = (base) => { if (!base || !names.has(base)) { names.add(base); return base; } for (let i = 2; ; i++) if (!names.has(`${base} ${i}`)) { names.add(`${base} ${i}`); return `${base} ${i}`; } };
	// cells that were already openings stay openings: skip them by their (unchanged) shape
	const prevOpen = new Set();
	for (let c = 0; c < prev.arr.cells.length; c++) if (prev.cellPanel[c] < 0) prevOpen.add(cellSignature(prev.arr, c));
	for (let c = 0; c < g.arr.cells.length; c++) {
		if (g.cellPanel[c] >= 0 || claimed.has(c)) continue;
		if (prevOpen.has(cellSignature(g.arr, c))) continue;
		const seed = cellSeed(g.arr, surf, c);
		const from = panelAt(prev, doc, surf, seed);
		const src = from && doc.panels.find((p) => p.id === from);
		if (!src || src.removed) continue;
		claimed.add(c);
		const m = mirrorSP(seed, surf), mt = locate(g.arr, surf, m), mc = mt >= 0 ? g.arr.cellOf[mt] : -1;
		const both = mc >= 0 && mc !== c && g.cellPanel[mc] < 0 && !claimed.has(mc);
		if (both) claimed.add(mc);
		if (mc >= 0 && mc !== c && src.mirror !== 'both' && g.panelIds[g.cellPanel[mc]] === src.id) { out.push({ pair: src.id }); continue; }
		out.push({ seed: toSP(seed), mirror: both ? 'both' : 'none', stack: structuredClone(src.stack), from: src.id, name: nameOf(src.name) });
	}
	return out;
}

// The regions lines from one line to another make on the shell, as seams would: the shell cut by its
// own lines and these. strokes: [{ points, mirror }], not in the document yet; a line may end on one
// drawn before it (on.curve: strokeId(i)).
export const STROKE = '__stroke';
export const strokeId = (i) => STROKE + i;
export const isStroke = (id) => id.startsWith(STROKE);
const strokeIndex = (id) => +id.slice(STROKE.length);
export function strokeRegions(doc, surf, strokes, cache = null) {
	const curves = strokes.map(({ points, mirror }, i) => ({ id: strokeId(i), layer: '__', role: 'edge', name: '', closed: false, mirror, shape: { mod: 'none', amp: 0, period: 0 }, points }));
	const d = { ...doc, curves: [...doc.curves, ...curves] };
	return buildGarment(d, surf, { layer: 'L0', evaluated: evaluateAll(d, surf, null, cache), alsoCut: curves.map((c) => c.id) });
}

// What can be picked among those regions: fabric the shell had there before the lines were drawn
// (base: the shell's build; a new region holds no piece's seed, and must not need one), with a drawn
// line among its edges. A region's pair is found from a point well inside it, so a click close to a
// line cannot land on the wrong side, and only where every line drawn round it has its mirror image.
// -> Map(cell -> { panel: the piece it was cut from, lines, seed, mirror: the pair's cell or -1, hue })
export function pickableRegions(g, base, doc, surf, strokes) {
	const arr = g.arr, out = new Map();
	for (let c = 0; c < arr.cells.length; c++) {
		if (arr.cells[c].area <= SLIVER) continue;
		const lines = cellLines(arr, c);
		if (![...lines].some(isStroke)) continue;
		const seed = cellSeed(arr, surf, c), under = fabricAt(base, doc, surf, seed);
		if (under) out.set(c, { panel: under.id, lines, seed, mirror: -1, hue: -1 });
	}
	for (const [c, r] of out) {
		if ([...r.lines].some((id) => isStroke(id) && strokes[strokeIndex(id)].mirror !== 'both')) continue;
		const t = locate(arr, surf, mirrorSP(r.seed, surf)), m = t >= 0 ? arr.cellOf[t] : -1;
		if (m !== c && out.has(m)) r.mirror = m;
	}
	// neighbours differ, so the areas can be told apart; a pair matches
	for (const [c, r] of out) {
		if (r.hue >= 0) continue;
		const near = new Set([...arr.cellAdj[c].keys()].map((n) => out.get(n)?.hue));
		for (r.hue = 0; near.has(r.hue); r.hue++);
		if (r.mirror >= 0) out.get(r.mirror).hue = r.hue;
	}
	return out;
}
const fabricAt = (base, doc, surf, sp) => { const p = doc.panels.find((x) => x.id === panelAt(base, doc, surf, sp)); return p && !p.removed ? p : null; };

// Why a region cannot be picked, for the person clicking it.
export function whyNotPickable(g, base, doc, surf, cell) {
	if (cell < 0) return 'Click an area of the leotard';
	return fabricAt(base, doc, surf, cellSeed(g.arr, surf, cell)) ? 'Click an area next to a line you drew' : 'There is no fabric here';
}

// The lines an overlay piece owns: its layer's where it has one of its own, else its outline.
export function overlayLines(doc, p) {
	if (doc.layers.find((l) => l.id === p.layer)?.bounds) return doc.curves.filter((c) => c.layer === p.layer).map((c) => c.id);
	return p.outline ? [p.outline] : [];
}

// The lines round a cell (ids of the curves, without the mirror mark). An edge inside the cell, with
// the cell on both sides (a line that stops short), is not one of them.
export function cellLines(arr, cell) {
	const seen = new Map(), out = new Set();
	for (const t of arr.cells[cell].tris) for (let e = 0; e < 3; e++) {
		const k = arr.ekey(arr.tris[t * 3 + e], arr.tris[t * 3 + (e + 1) % 3]);
		if (!arr.softEdges?.has(k) && arr.constraint.has(k)) seen.set(k, (seen.get(k) ?? 0) + 1);
	}
	for (const [k, n] of seen) if (n === 1) for (const id of arr.constraint.get(k)) out.add(id.replace(/~m$/, ''));
	return out;
}

// A cell's outline as a closed run of surface points, to draw it while it is being chosen.
export function cellOutline(arr, surf, cell) {
	const mask = new Uint8Array(arr.cells.length);
	mask[cell] = 1;
	const loop = openingLoops(arr, mask).sort((a, b) => b.verts.length - a.verts.length)[0];
	if (!loop) return null;
	const sps = loop.verts.map((v) => {
		if (v >= surf.V) { const k = v - surf.V; return { f: arr.hostF[k], b0: arr.hostB[k * 3], b1: arr.hostB[k * 3 + 1], b2: arr.hostB[k * 3 + 2] }; }
		const f = surf.vf[surf.vfStart[v]], c = [0, 1, 2].find((j) => surf.idx[f * 3 + j] === v);
		return { f, b0: c === 0 ? 1 : 0, b1: c === 1 ? 1 : 0, b2: c === 2 ? 1 : 0 };
	});
	sps.push(sps[0]);
	return { sps };
}

// The panel id a surface point falls in, in a built garment (or null).
export function panelAt(g, doc, surf, sp) {
	const t = locate(g.arr, surf, sp);
	if (t < 0) return null;
	const pi = g.cellPanel[g.arr.cellOf[t]];
	return pi >= 0 ? g.panelIds[pi] : null;
}
