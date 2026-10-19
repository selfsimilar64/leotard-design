// From the document's curves and panel seeds to the cut garment: evaluate every curve (and its
// mirror image), snap curve ends onto the curves they end on, build the arrangement, and give
// each cell its panel. Pure data, no three.js scene objects (render/garment.js draws the result).
import * as THREE from 'three';
import { evaluateCurve } from '../curves/evaluate.js';
import { mirrorSP, pointAlong } from '../curves/points.js';
import { fromSP, toSP } from '../body/surface.js';
import { buildArrangement, locate, vertexPos, baryOfVertexInFace } from './arrangement.js';

// Curve roles that cut the garment into cells. Guides, strap and trim paths do not.
export const CUTTING = new Set(['seam', 'edge', 'print']);
const SNAP = 0.003;
const SLIVER = 0.0003; // m2 (3 cm2)

// -> Map(key -> evaluated) where key is the curve id, or id + '~m' for its mirror image.
// Curves attached to other curves are evaluated after them (and re-evaluated when they change).
export function evaluateAll(doc, surf, layer = 'L0', cache = null) {
	const out = new Map();
	const mfn = (sp) => mirrorSP(sp, surf);
	const curves = doc.curves.filter((c) => (c.layer ?? 'L0') === layer);
	const byId = new Map(curves.map((c) => [c.id, c]));
	const deps = (c) => c.points.filter((p) => p.on && byId.has(p.on.curve) && p.on.curve !== c.id).map((p) => p.on.curve);
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
export function buildGarment(doc, surf, { prev = null } = {}) {
	const t0 = performance.now();
	const curveSig = JSON.stringify(doc.curves);
	let evaluated, arr, tEval = t0;
	if (prev && prev.curveSig === curveSig) ({ evaluated, arr } = prev);
	else {
		evaluated = evaluateAll(doc, surf, 'L0', prev?.evaluated);
		const cutting = [...evaluated.entries()].filter(([, e]) => CUTTING.has(e.role) && e.sps.length > 1);
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
		if ((p.layer ?? 'L0') !== 'L0') return;
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
		evaluated, arr, cellPanel, seeds, curveSig, panelIds,
		ms: { eval: tEval - t0, arrangement: prev?.arr === arr ? 0 : arr.ms, total: performance.now() - t0 },
	};
}

// A surface point inside a cell: the centroid of its largest triangle.
export function cellSeed(arr, surf, cell) {
	let best = -1, ba = -1;
	const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
	for (const t of arr.cells[cell].tris) {
		vertexPos(surf, arr.tris[t * 3], arr.hostF, arr.hostB, A); vertexPos(surf, arr.tris[t * 3 + 1], arr.hostF, arr.hostB, B); vertexPos(surf, arr.tris[t * 3 + 2], arr.hostF, arr.hostB, C);
		const a = B.sub(A).cross(C.sub(A)).lengthSq();
		if (a > ba) { ba = a; best = t; }
	}
	const f = arr.triFace[best], b = [0, 0, 0];
	for (let k = 0; k < 3; k++) { const q = baryOfVertexInFace(arr, surf, arr.tris[best * 3 + k], f); for (let j = 0; j < 3; j++) b[j] += q[j] / 3; }
	return { f, b0: b[0], b1: b[1], b2: b[2] };
}

// Cells that belong to no panel but were fabric in the previous build (a new line split a panel):
// returns new panels to add, each inheriting the stack of the panel it was cut from. A cell and
// its mirror image become one panel with mirror 'both'.
export function inheritPanels(g, prev, doc, surf) {
	if (!prev) return [];
	const out = [], claimed = new Set();
	for (let c = 0; c < g.arr.cells.length; c++) {
		if (g.cellPanel[c] >= 0 || claimed.has(c)) continue;
		const seed = cellSeed(g.arr, surf, c);
		const from = panelAt(prev, doc, surf, seed);
		const src = from && doc.panels.find((p) => p.id === from);
		if (!src || src.removed) continue;
		claimed.add(c);
		const m = mirrorSP(seed, surf), mt = locate(g.arr, surf, m), mc = mt >= 0 ? g.arr.cellOf[mt] : -1;
		const both = mc >= 0 && mc !== c && g.cellPanel[mc] < 0 && !claimed.has(mc);
		if (both) claimed.add(mc);
		out.push({ seed: toSP(seed), mirror: both ? 'both' : 'none', stack: structuredClone(src.stack), from: src.id, name: src.name });
	}
	return out;
}

// The panel id a surface point falls in, in a built garment (or null).
export function panelAt(g, doc, surf, sp) {
	const t = locate(g.arr, surf, sp);
	if (t < 0) return null;
	const pi = g.cellPanel[g.arr.cellOf[t]];
	return pi >= 0 ? g.panelIds[pi] : null;
}
