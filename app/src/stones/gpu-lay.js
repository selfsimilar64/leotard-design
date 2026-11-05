// A pattern's geometry laid as candidate stones on the GPU (WebGPU compute on the renderer's device): the GPU twin of
// stones/candidates.js Candidates.lay, every kind of item (points, joints, free lines, runs between stops, copies of a cell, and
// points by formula), Phase 3 of knowledge/product/roadmap/webgpu-and-stone-engine-plan.md. A change to one is a change to the
// other. The CPU describes the geometry (a layout's make: stones/geometry.js) and packs it here (layData); the GPU, one item per
// invocation, counts each item's stones, numbers them by a prefix sum (the CPU's order: item by item, each in its own order) and
// lays them into the candidate buffers stones/gpu-keep.js keeps from. A candidate the CPU would not lay at all (off the drawn
// box, a joint already taken) is a slot of size 0, so nothing is moved up and the slots' order is the CPU's.
//
// Buffers (one bind group, explicit layout): L the lay's uniform (LAY_FIELDS), geo the geometry (u32; floats as their bits),
// mods (stones/gpu-wgsl.js modsBuffer: the size modifiers and the sold sizes), ras the piece's rasters (its edge distance for a
// modifier "From the edge"), work (counts, prefix sums, the runs' vertices on the cloth), cand (x, y in the pattern's frame, its
// direction, its diameter: 0 none), aux (rank, t, k, cat | pri << 8 | joint << 16), dkey (a joint's place, for "the same place
// twice is one stone").
import { G_POINT, G_KEY, G_LINE, G_RUN, G_STAMP, G_SOURCE, POINT_W, KEY_W, VERT_W, LINE_W, RUN_W, STAMP_W, PRI_LINE, placeHash } from './geometry.js';
import { SIZES, Candidates, OFF } from './candidates.js';
import { blueTile, SCATTER_SOURCE } from './layouts-lattice.js';
import { hash2 } from './fields.js';
import { WGSL_COMMON, WGSL_MODS } from './gpu-wgsl.js';

// The lay's uniform, word by word (f: f32, i: i32, u: u32); the WGSL struct is made from it.
const LAY_FIELDS = [
	'a f', 'b f', 'c f', 'd f', 'e f', 'f f', 'cx0 f', 'cx1 f', 'cy0 f', 'cy1 f', 'pitch f', 'd0 f', 'd1 f', 'gap f', 'fine f', 'jitter f',
	'S f', 'rx f', 'ry f', 'rc f', 'rs f', 'rF f', 'twist f', 'bulge f', 'R2 f', 'waveA f', 'waveL f', 'warp f', 'warpL f', 'er f', 'dx0 f', 'dy0 f',
	'flags u', 'seed i', 'bseed i', 'nItems u', 'cap u', 'vcap u', 'ex u', 'ey u', 'oD u', 'oItems u', 'oPt u', 'oKy u', 'oVx u', 'oLn u', 'oRn u', 'oSt u',
	'oTpl u', 'oTile u', 'tileN u', 'wV u', 'wS u', 'wVerts u', 'srcItem u', 'srcSlots u', 'sL f', 'si0 i', 'sj0 i', 'snti u', 'sntj u', 'sseed i', 'svar f', 'sturn u',
	'scat f', 'sunit f', 'sox f', 'soy f', 'sflip u', 'sbx0 f', 'sbx1 f', 'sby0 f', 'sby1 f', 'tmask u', 'pad0 u', 'pad1 u',
].map((s) => s.split(' '));
export const LAY_WORDS = Math.ceil(LAY_FIELDS.length / 4) * 4;
const AT = Object.fromEntries(LAY_FIELDS.map(([k, t], i) => [k, [i, t]]));
const LAY_STRUCT = `struct Lay {\n${LAY_FIELDS.map(([k, t]) => `\t${k}: ${t}32,`).join('\n')}\n${Array.from({ length: LAY_WORDS - LAY_FIELDS.length }, (_, i) => `\tpadx${i}: u32,`).join('\n')}\n}`;
export const LAY_FLAGS = { angles: 1, bend: 2, diam: 4 };
// work's head (u32 words): 0 slots laid, 1 overflow (a buffer too small: the run shows nothing new and is laid again bigger), 2 run
// vertices; 4..13 the candidates' extremes (stones/gpu-keep.js RULE); 16..23 the neighbour grid and the standing rule (GRIDP)
export const W_HEAD = 32;
const TPL_W = 12, TSTONE_W = 8;

const HEAD = /* wgsl */ `
${LAY_STRUCT}
@group(0) @binding(0) var<uniform> L: Lay;
@group(0) @binding(1) var<storage, read> geo: array<u32>;
@group(0) @binding(2) var<storage, read> mods: array<vec4f>;
@group(0) @binding(3) var<storage, read> ras: array<f32>;
@group(0) @binding(4) var<storage, read_write> work: array<u32>;
@group(0) @binding(5) var<storage, read_write> cand: array<vec4f>;
@group(0) @binding(6) var<storage, read_write> aux: array<vec4f>;
@group(0) @binding(7) var<storage, read_write> dkey: array<u32>;
${WGSL_COMMON}
// the piece's edge distance (ClothPiece.edgeAt's raster, read as it reads it)
fn edgeD(u: f32, v: f32) -> f32 {
	let fx = clamp((u - L.dx0) / L.er, 0.0, f32(L.ex) - 1.001); let fy = clamp((v - L.dy0) / L.er, 0.0, f32(L.ey) - 1.001);
	let i = u32(floor(fx)); let j = u32(floor(fy)); let a = fx - floor(fx); let b = fy - floor(fy); let q = L.oD + j * L.ex + i;
	return (ras[q] * (1.0 - a) + ras[q + 1u] * a) * (1.0 - b) + (ras[q + L.ex] * (1.0 - a) + ras[q + L.ex + 1u] * a) * b;
}
${WGSL_MODS}
const PRI_LINE = ${PRI_LINE}.0;
const OFF = ${OFF}; // (stones/candidates.js OFF: where a place's cell starts)
fn gf(i: u32) -> f32 { return bitcast<f32>(geo[i]); }
fn hash2x(i: i32, j: i32, s: i32) -> f32 { return f32(hashU(i, j, s)) * (1.0 / 4294967296.0); }

// the state stones/candidates.js keeps on the instance while it lays
var<private> emitting: bool;
var<private> cur: u32;
var<private> sb: u32;
var<private> mu: f32;
var<private> mv: f32;
var<private> sh: f32 = -1.0;
var<private> shx: u32;
var<private> su: f32;
var<private> st: f32;
var<private> sc: f32;
var<private> su0: f32;
var<private> sv0: f32;
var<private> t_: f32;
var<private> k_: f32;
var<private> cat_: f32;
var<private> unit_: f32;
var<private> px: f32;
var<private> py: f32;
var<private> pu: f32;
var<private> pv: f32;
var<private> pk: f32;
var<private> lh: u32;
var<private> jj: u32;
var<private> rest: f32;
var<private> vb: u32;
var<private> rn: u32;
var<private> ri: u32;
var<private> ie: u32;
var<private> runN: u32;
var<private> keyA: bool;
var<private> jkA: f32;
var<private> jpA: f32;
var<private> jkB: f32;
var<private> jpB: f32;
var<private> tax: f32;
var<private> tay: f32;
var<private> tbx: f32;
var<private> tby: f32;
var<private> planSum: f32;

// which kinds of item this variant lays (1 point, 2 joint, 4 line, 8 run, 16 copies, 32 points by formula), whether sizes follow
// modifiers (DIAM) and whether the pattern is bent (BEND): code for what a pattern does not use is left out of its pipelines
// (the D3D shader compiler took 15 to 20 s for one kernel holding everything)
override KINDS: u32 = 63u;
override DIAM: bool = false;
override BEND: bool = false;
fn has(kind: u32) -> bool { return (KINDS & (1u << kind)) != 0u; }

// stones/fields.js distortion
fn bend(x0: f32, y0: f32) -> vec2f {
	var x = x0; var y = y0;
	if (L.warp != 0.0) { let nx = x / L.warpL; let ny = y / L.warpL; x += L.warp * fbm(nx, ny, L.bseed + 3, 2); y += L.warp * fbm(nx + 5.2, ny + 1.3, L.bseed + 5, 2); }
	if (L.waveA != 0.0) { let ox = x; x += L.waveA * sin((TAU * y) / L.waveL); y += L.waveA * 0.5 * sin((TAU * ox) / L.waveL); }
	if (L.bulge != 0.0 || L.twist != 0.0) {
		let r2 = x * x + y * y;
		if (L.bulge != 0.0) { let g = 1.0 + L.bulge * exp(-r2 / L.R2); x *= g; y *= g; }
		if (L.twist != 0.0) { let a = (L.twist * sqrt(r2)) / 0.1; let c = cos(a); let s = sin(a); let ox = x; x = c * ox - s * y; y = s * ox + c * y; }
	}
	return vec2f(x, y);
}
// Candidates.place
fn place(x0: f32, y0: f32) {
	var x = x0; var y = y0;
	if (BEND) { let q = bend(x, y); x = q.x; y = q.y; }
	mu = L.a * x + L.b * y + L.e; mv = L.c * x + L.d * y + L.f;
}
// Candidates.place, or in a copy (stamp mode) Candidates.cellPlace: the copy's place plus the cell's (x0, y0)
fn placeIn(x0: f32, y0: f32, x: f32, y: f32) {
	if (sh >= 0.0 && !BEND) { mu = su0 + (L.a * x0 + L.b * y0); mv = sv0 + (L.c * x0 + L.d * y0); } else { place(x, y); }
}
// Candidates.angleAt
fn angleAt(x: f32, y: f32, a: f32) -> f32 {
	if ((L.flags & 1u) == 0u) { return a; }
	let ca = cos(a); let sa = sin(a);
	if (BEND) {
		let u = mu; let v = mv;
		place(x + ca * 0.0005, y + sa * 0.0005);
		let out = atan2(mv - v, mu - u);
		mu = u; mv = v;
		return out;
	}
	return atan2(L.c * ca + L.d * sa, L.a * ca + L.b * sa);
}
// Candidates.sizeOf (with the modifiers on size: stones/pattern.js patternCandidates' diam)
fn sizeOf(u: f32, v: f32, k: f32, t: f32, cat: f32, rank: f32) -> f32 {
	if (DIAM) {
		var C: ModAt;
		C.lx = u / L.S; C.ly = v / L.S;
		C.u = L.rx + L.rc * L.rF * u - L.rs * v; C.v = L.ry + L.rs * L.rF * u + L.rc * v;
		C.at = t; C.cat = cat; C.kk = k; C.h = ownH(rank);
		return ditherSize(L.d0 * k * modSize(C), ditherH(rank));
	}
	if (k == 1.0) { return L.d1; }
	return realSize(L.d0 * k);
}
// Candidates.stampRank
fn stampRank(R: f32, pri: f32) -> f32 {
	if (su >= 0.0) { return su; }
	let r = ffx(R);
	if (pri < PRI_LINE) { return fxf(r * 2u + (r >> 1u) + shx) * 0.4; }
	return fxf(r + shx);
}
// (Candidates.fresh's cell: 0.2 mm, off the round numbers: OFF)
fn placeKey(u: f32, v: f32) -> u32 { return (bitcast<u32>(i32(floor(u * 5000.0 + OFF)) + 32768) & 0xffffu) | ((bitcast<u32>(i32(floor(v * 5000.0 + OFF)) + 32768) & 0xffffu) << 16u); }
// Candidates.push: the next slot of this item (counted, or written). joint: 1 a stone the design hangs on, whose place is taken
// even when it is off the drawn box; 2 one taken only when on it (stones/candidates.js fresh). Off the drawn box: a slot of size 0
fn push(u0: f32, v0: f32, rank: f32, angle: f32, t: f32, k: f32, cat: f32, pri: f32, d: f32, joint: u32) {
	let s = cur; cur++;
	if (!emitting) { return; }
	let i = sb + s;
	if (i >= L.cap) { work[1] = 1u; return; }
	let off = u0 < L.cx0 || u0 > L.cx1 || v0 < L.cy0 || v0 > L.cy1;
	var j = joint;
	if (off && j == 2u) { j = 0u; }
	if (j != 0u) { dkey[i] = placeKey(u0, v0); }
	aux[i] = vec4f(rank, t, k, bitcast<f32>((u32(cat) & 0xffu) | ((u32(pri) & 0xffu) << 8u) | (select(0u, 1u, j != 0u) << 16u)));
	if (off) { cand[i] = vec4f(u0, v0, angle, 0.0); return; }
	var u = u0; var v = v0;
	// a stone's own stray: by its place (its 0.5 mm cell, off the round numbers: OFF), the same on the CPU (Candidates.push)
	if (L.jitter > 0.0) {
		let q1 = i32(floor(u0 * 2000.0 + OFF)); let q2 = i32(floor(v0 * 2000.0 + OFF));
		u += L.jitter * (hash2(q1, q2, L.seed * 4 + 1) - 0.5) * 2.0; v += L.jitter * (hash2(q1, q2, L.seed * 4 + 2) - 0.5) * 2.0;
	}
	cand[i] = vec4f(u, v, angle, d);
}

struct Tb { pt: u32, ky: u32, vx: u32, ln: u32, rn: u32 }
fn topTb() -> Tb { return Tb(L.oPt, L.oKy, L.oVx, L.oLn, L.oRn); }
fn tplTb(id: u32) -> Tb { let o = L.oTpl + id * ${TPL_W}u; return Tb(geo[o + 2u], geo[o + 3u], geo[o + 4u], geo[o + 5u], geo[o + 6u]); }

// Candidates.layPoint (off the drawn box: a slot of size 0, where the CPU lays nothing)
fn layPoint(tb: Tb, i: u32, ox: f32, oy: f32) {
	let o = tb.pt + i * ${POINT_W}u; let x0 = gf(o); let y0 = gf(o + 1u); let x = x0 + ox; let y = y0 + oy; let unit = gf(o + 8u);
	placeIn(x0, y0, x, y);
	let u = mu; let v = mv; let off = u < L.cx0 || u > L.cx1 || v < L.cy0 || v > L.cy1;
	let pri = gf(o + 7u); let k = gf(o + 5u);
	var rank = gf(o + 2u); var t = gf(o + 4u); var cat = gf(o + 6u); var kept = select(rank, unit, unit >= 0.0); var joint = 0u;
	if (sh >= 0.0) { kept = stampRank(kept, pri); rank = kept; t = st; cat += sc; if (pri < PRI_LINE) { joint = 2u; } }
	var a = 0.0; var d = 0.0;
	if (!off) { a = angleAt(x, y, gf(o + 3u)); d = sizeOf(u, v, k, t, cat, rank); }
	push(u, v, kept, a, t, k, cat, pri, d, joint);
}
// Candidates.layKey
fn layKey(tb: Tb, i: u32, ox: f32, oy: f32) {
	let o = tb.ky + i * ${KEY_W}u; let x0 = gf(o); let y0 = gf(o + 1u); let x = x0 + ox; let y = y0 + oy;
	placeIn(x0, y0, x, y);
	let u = mu; let v = mv; let pri = gf(o + 6u); let k = gf(o + 4u);
	var rank = gf(o + 7u); var t = gf(o + 3u); var cat = gf(o + 5u); var joint = 1u;
	if (sh >= 0.0) { rank = stampRank(rank, pri); t = st; cat += sc; if (pri >= PRI_LINE) { joint = 0u; } }
	let a = angleAt(x, y, gf(o + 2u));
	push(u, v, rank, a, t, k, cat, pri, sizeOf(u, v, k, t, cat, rank), joint);
}

// --- a free line (Candidates.layLine, vertState, lineTo, lineRank, lineStep) --------------------------------------------
fn vertState(tb: Tb, p: u32) {
	let o = tb.vx + p * ${VERT_W}u;
	k_ = gf(o + 2u); t_ = gf(o + 3u); cat_ = gf(o + 4u); unit_ = gf(o + 5u);
	if (sh >= 0.0) { t_ = st; cat_ += sc; }
}
fn lineRank() -> f32 {
	var R = unit_;
	if (unit_ < 0.0) { R = fxf(goldFx(jj) + lh); }
	if (sh >= 0.0) { return stampRank(R, PRI_LINE); }
	return R;
}
fn lineStep(x: f32, y: f32) {
	place(x, y);
	let u = mu; let v = mv; let du = u - pu; let dv = v - pv; let len = sqrt(du * du + dv * dv);
	let pu0 = pu; let pv0 = pv; let k0 = pk; let k1 = k_;
	px = x; py = y; pu = u; pv = v; pk = k1;
	if (len < 1e-9) { return; }
	if ((pu0 < L.cx0 && u < L.cx0) || (pu0 > L.cx1 && u > L.cx1) || (pv0 < L.cy0 && v < L.cy0) || (pv0 > L.cy1 && v > L.cy1)) {
		let left = rest - len;
		if (left > 0.0) { rest = left; return; }
		let p = L.gap * realSize(L.d0 * k1); let c = floor(-left / p) + 1.0;
		jj += u32(c); rest = p * c + left;
		return;
	}
	let ux = du / len; let uy = dv / len; let a = atan2(uy, ux); let gap = L.gap; let t = t_; let cat = cat_;
	let varies = DIAM || k0 != k1;
	var s = rest;
	for (var guard = 0u; guard < 200000u; guard++) {
		if (!(s <= len)) { break; }
		let f = s / len; let su_ = pu0 + ux * s; let sv_ = pv0 + uy * s; let k = k0 + (k1 - k0) * f; let rank = lineRank();
		// this stone's size; where sizes vary, the next one's where it would land: the two share the distance between them
		var d = 0.0;
		for (var w = 0u; w < 2u; w++) {
			let g = gap * d; let kn = k0 + (k1 - k0) * min(1.0, (s + g) / len);
			let z = sizeOf(select(su_, su_ + ux * g, w == 1u), select(sv_, sv_ + uy * g, w == 1u), select(k, kn, w == 1u), t, cat, rank);
			if (w == 0u) { d = z; if (!varies) { s += gap * d; break; } } else { s += (g + gap * z) / 2.0; }
		}
		push(su_, sv_, rank, a, t, k, cat, PRI_LINE, d, 0u);
		jj++;
	}
	rest = s - len;
}
// a bent pattern's straight step is a curve on the cloth: walked in pieces
fn lineTo(x: f32, y: f32) {
	let x0 = px; let y0 = py; let dx = x - x0; let dy = y - y0; let k1 = k_; let k0 = pk;
	var n = 1u;
	if (BEND) { let m = min(64u, u32(ceil(length(vec2f(dx, dy)) / (L.pitch * 2.0)))); if (m > 1u) { n = m; } }
	for (var i = 1u; i <= n; i++) {
		let last = i == n;
		k_ = select(k0 + ((k1 - k0) * f32(i)) / f32(n), k1, last);
		lineStep(select(x0 + (dx * f32(i)) / f32(n), x, last), select(y0 + (dy * f32(i)) / f32(n), y, last));
	}
}
fn layLine(tb: Tb, l: u32, ox: f32, oy: f32) {
	let o = tb.ln + l * ${LINE_W}u; let v0 = geo[o]; let nv = geo[o + 1u];
	let p0 = tb.vx + v0 * ${VERT_W}u; let x = gf(p0) + ox; let y = gf(p0 + 1u) + oy;
	vertState(tb, v0);
	place(x, y);
	px = x; py = y; pu = mu; pv = mv; pk = k_;
	lh = geo[o + 2u]; jj = 0u;
	rest = (L.gap * sizeOf(pu, pv, k_, t_, cat_, 0.5)) / 2.0;
	for (var i = 1u; i < nv; i++) {
		let p = tb.vx + (v0 + i) * ${VERT_W}u;
		vertState(tb, v0 + i);
		lineTo(gf(p) + ox, gf(p + 1u) + oy);
	}
}

// --- a run between stops (Candidates.layRunOf, runTo, layRun, runRank, runSize, runStone, stopSize, stopStone) -----------
// its vertices on the cloth, in work from vb: u, v, distance along, k, t
fn RU(i: u32) -> f32 { return bitcast<f32>(work[L.wVerts + (vb + i) * 5u]); }
fn RV(i: u32) -> f32 { return bitcast<f32>(work[L.wVerts + (vb + i) * 5u + 1u]); }
fn RS(i: u32) -> f32 { return bitcast<f32>(work[L.wVerts + (vb + i) * 5u + 2u]); }
fn RK(i: u32) -> f32 { return bitcast<f32>(work[L.wVerts + (vb + i) * 5u + 3u]); }
fn RT(i: u32) -> f32 { return bitcast<f32>(work[L.wVerts + (vb + i) * 5u + 4u]); }
// how many vertices a run has on the cloth (a bent pattern's straight step walked in pieces)
fn subSteps(tb: Tb, p: u32) -> u32 {
	let a = tb.vx + (p - 1u) * ${VERT_W}u; let b = tb.vx + p * ${VERT_W}u;
	return min(64u, u32(ceil(length(vec2f(gf(b) - gf(a), gf(b + 1u) - gf(a + 1u))) / (L.pitch * 2.0))));
}
fn runVertCount(tb: Tb, r: u32) -> u32 {
	let o = tb.rn + r * ${RUN_W}u; let v0 = geo[o]; let nv = geo[o + 1u];
	if (!BEND) { return nv; }
	var c = 1u;
	for (var i = 1u; i < nv; i++) { c += max(subSteps(tb, v0 + i), 1u); }
	return c;
}
fn runTo(u: f32, v: f32, k: f32, t: f32) {
	if (vb + rn >= L.vcap) { work[1] = 1u; return; }
	var s = 0.0;
	if (rn > 0u) { let du = u - RU(rn - 1u); let dv = v - RV(rn - 1u); s = RS(rn - 1u) + sqrt(du * du + dv * dv); }
	let w = L.wVerts + (vb + rn) * 5u;
	work[w] = bitcast<u32>(u); work[w + 1u] = bitcast<u32>(v); work[w + 2u] = bitcast<u32>(s); work[w + 3u] = bitcast<u32>(k); work[w + 4u] = bitcast<u32>(t);
	rn++;
}
fn runVerts(tb: Tb, r: u32, ox: f32, oy: f32) {
	let o = tb.rn + r * ${RUN_W}u; let v0 = geo[o]; let nv = geo[o + 1u]; let stamp = sh >= 0.0;
	var x = 0.0; var y = 0.0; var k = 0.0; var tc = st;
	rn = 0u;
	for (var i = 0u; i < nv; i++) {
		let p = tb.vx + (v0 + i) * ${VERT_W}u;
		let x1 = gf(p) + ox; let y1 = gf(p + 1u) + oy; let k1 = gf(p + 2u);
		if (!stamp) { tc = gf(p + 3u); }
		var n = 1u;
		if (BEND && i > 0u) { n = max(subSteps(tb, v0 + i), 1u); }
		for (var s = 1u; s <= n; s++) {
			var xs = x1; var ys = y1; var ks = k1;
			if (s < n) { xs = x + ((x1 - x) * f32(s)) / f32(n); ys = y + ((y1 - y) * f32(s)) / f32(n); ks = k + ((k1 - k) * f32(s)) / f32(n); }
			place(xs, ys); runTo(mu, mv, ks, tc);
		}
		x = x1; y = y1; k = k1;
	}
}
fn runRank(q: u32) -> f32 {
	var R = unit_;
	if (unit_ < 0.0) { R = fxf(goldFx(jj + q) + lh); }
	if (sh >= 0.0) { return stampRank(R, PRI_LINE); }
	return R;
}
fn runSize(s: f32, rank: f32) -> f32 {
	let n = rn; let Lr = RS(n - 1u); let p = select(Lr, s, s < Lr);
	var i = ri;
	loop { if (!(i < n - 2u && RS(i + 1u) < p)) { break; } i++; }
	loop { if (!(i > 0u && RS(i) > p)) { break; } i--; }
	ri = i;
	var den = RS(i + 1u) - RS(i); if (den == 0.0) { den = 1.0; }
	let w = (p - RS(i)) / den;
	return sizeOf(RU(i) + (RU(i + 1u) - RU(i)) * w, RV(i) + (RV(i + 1u) - RV(i)) * w, RK(i) + (RK(i + 1u) - RK(i)) * w, RT(i), cat_, rank);
}
// a stone at distance p along the run, on its stretch i (its size: sizeOf, which for a run of one size is that size)
fn runStone(p: f32, i: u32, q: u32) {
	let du = RU(i + 1u) - RU(i); let dv = RV(i + 1u) - RV(i);
	var den = RS(i + 1u) - RS(i); if (den == 0.0) { den = 1.0; }
	let w = (p - RS(i)) / den;
	let u = RU(i) + du * w; let v = RV(i) + dv * w; let k = RK(i) + (RK(i + 1u) - RK(i)) * w; let t = RT(i) + (RT(i + 1u) - RT(i)) * w;
	let rank = runRank(q);
	push(u, v, rank, select(0.0, atan2(dv, du), (L.flags & 1u) != 0u), t, k, cat_, PRI_LINE, sizeOf(u, v, k, t, cat_, rank), 0u);
}
fn stopSize(c: u32, k: f32) -> f32 { return sizeOf(RU(c), RV(c), k, RT(c), cat_, 0.2); }
fn stopStone(c: u32, k: f32, pri: f32) {
	let stamp = sh >= 0.0; let tx = select(tax, tbx, c != 0u); let ty = select(tay, tby, c != 0u);
	var u = RU(c); var v = RV(c);
	if (stamp && !BEND) { u = su0 + (L.a * tx + L.b * ty); v = sv0 + (L.c * tx + L.d * ty); }
	let m = select(0u, c - 1u, c != 0u);
	var rank = unit_;
	if (unit_ < 0.0) {
		var hu = i32(floor(u * 5000.0 + OFF)); var hv = i32(floor(v * 5000.0 + OFF));
		if (stamp) { hu = i32(floor((L.a * tx + L.b * ty) * 5000.0 + OFF)); hv = i32(floor((L.c * tx + L.d * ty) * 5000.0 + OFF)); }
		rank = hash2x(hu, hv, 11) * 0.4;
	}
	if (stamp) { rank = stampRank(rank, pri); }
	push(u, v, rank, atan2(RV(m + 1u) - RV(m), RU(m + 1u) - RU(m)), RT(c), k, cat_, pri, sizeOf(u, v, k, RT(c), cat_, rank), 1u);
}
// The run's stones (Candidates.layRun's two ways in one walk): a run of one size (same) has m stones at g0 + q step, spread by
// f; one whose sizes change along it is walked stone by stone at the sizes it asks for (each stone's size asked where it would
// land, twice; a closed loop's first stone first), its places spread by f (lay: laid; otherwise counted, and the stretch they
// take left in planSum)
fn planWalk(closed: bool, Da: f32, Db: f32, f: f32, lay: bool, same: bool, g0: f32, step: f32, m: u32) -> u32 {
	let Lr = RS(rn - 1u); let gap = L.gap;
	ri = 0u; ie = 0u; planSum = 0.0;
	var s = 0.0; var prev = Da; var count = 0u; var first = 0.0; var tries = 0u;
	var phase = select(1u, 0u, closed && !keyA && !same);
	var rank = 0.0; var pv0 = 0.0; var guess = 0.0;
	for (var guard = 0u; guard < 2000000u; guard++) {
		var at = -1.0;
		if (same) {
			if (count >= m) { break; }
			at = g0 + f32(count) * step;
		} else {
			if (phase == 1u) {
				if (tries >= 20000u) { break; }
				tries++;
				rank = runRank(count);
				if (prev != 0.0) { pv0 = prev; phase = 2u; }
			} else if (phase == 0u) { rank = runRank(0u); }
			var wh = s;
			if (phase == 2u) { wh = s + (gap * pv0) / 2.0; }
			if (phase == 3u) { wh = s + (gap * (prev + guess)) / 2.0; }
			let z = runSize(wh, rank);
			if (phase == 0u) { first = z; prev = z; at = 0.0; phase = 1u; }
			else if (phase == 1u) { pv0 = z; phase = 2u; continue; }
			else if (phase == 2u) { guess = z; phase = 3u; continue; }
			else {
				let nx = s + select((gap * z) / 2.0, (gap * (prev + z)) / 2.0, prev != 0.0);
				var end = Db;
				if (closed) { end = Da; if (end == 0.0) { end = first; } }
				if (!(nx + (gap * (z + end)) / 2.0 <= Lr + 1e-7)) { planSum = select(0.0, s + (gap * (prev + end)) / 2.0, count != 0u); break; }
				at = nx; s = nx; prev = z; phase = 1u;
			}
		}
		if (lay) {
			let p = min(at * f, Lr);
			loop { if (!(ie < rn - 2u && RS(ie + 1u) < p)) { break; } ie++; }
			runStone(p, ie, count);
		}
		count++;
	}
	return count;
}
fn layRun(keyB: bool, closed: bool) {
	let n = rn;
	// the stops' own stones (none but the first when the run is too short to have a stretch)
	var Lr = 0.0; var early = true; var stops = 0u;
	if (n < 2u) { if (keyA && n == 1u) { stops = 1u; } }
	else {
		Lr = RS(n - 1u);
		if (!(Lr >= 1e-7)) { if (keyA && (bitcast<u32>(Lr) & 0x7fffffffu) <= 0x7f800000u) { stops = 1u; } }
		else { early = false; stops = select(0u, 1u, keyA) | select(0u, 2u, keyB); }
	}
	var Da = 0.0; var Db = 0.0;
	for (var e = 0u; e < 2u; e++) {
		if (early || ((stops >> e) & 1u) == 0u) { continue; }
		let z = stopSize(select(0u, n - 1u, e == 1u), select(jkA, jkB, e == 1u));
		if (e == 0u) { Da = z; } else { Db = z; }
	}
	for (var e = 0u; e < 2u; e++) {
		if (((stops >> e) & 1u) == 0u) { continue; }
		stopStone(select(0u, n - 1u, e == 1u), select(jkA, jkB, e == 1u), select(jpA, jpB, e == 1u));
	}
	if (early) { return; }
	let gap = L.gap;
	var same = !DIAM;
	for (var i = 1u; same && i < n; i++) { if (RK(i) != RK(0u)) { same = false; } }
	var m = 0u; var f = 1.0; var g0 = 0.0; var step = 0.0;
	if (same) {
		// all one size: how many fit is a sum
		let k = RK(0u); let d = select(realSize(L.d0 * k), L.d1, k == 1.0);
		step = gap * d;
		g0 = select(select(step / 2.0, (gap * (Da + d)) / 2.0, keyA), 0.0, closed && !keyA);
		let gm = select(select(step / 2.0, (gap * (d + Db)) / 2.0, keyB), select(step, (gap * (d + Da)) / 2.0, keyA), closed);
		let room = Lr - g0 - gm;
		if (room < -1e-7) { return; }
		m = min(1u + u32(floor((room + 1e-7) / step)), 1000000u); f = Lr / (g0 + f32(m - 1u) * step + gm);
	}
	// one size: laid at once; sizes that change: walked once to count them and the stretch they take, once to lay them
	var cnt = m;
	for (var ps = select(0u, 1u, same); ps < 2u; ps++) {
		let lay = ps == 1u;
		if (lay) {
			if (!emitting) { cur += cnt; break; }
			if (cnt == 0u) { break; }
			if (!same && planSum > 0.0) { f = Lr / planSum; }
		}
		let c = planWalk(closed, Da, Db, f, lay, same, g0, step, m);
		if (!lay) { cnt = c; }
	}
}
fn layRunOf(tb: Tb, r: u32) {
	let o = tb.rn + r * ${RUN_W}u; let v0 = geo[o]; let nv = geo[o + 1u]; let stamp = sh >= 0.0;
	rn = runVertCount(tb, r);
	if (stamp) { let a = tb.vx + v0 * ${VERT_W}u; let b = tb.vx + (v0 + nv - 1u) * ${VERT_W}u; tax = gf(a); tay = gf(a + 1u); tbx = gf(b); tby = gf(b + 1u); }
	keyA = gf(o + 3u) == 1.0; jkA = gf(o + 4u); jpA = gf(o + 5u); jkB = gf(o + 7u); jpB = gf(o + 8u);
	cat_ = gf(o + 10u) + select(0.0, sc, stamp); unit_ = gf(o + 11u); lh = geo[o + 2u]; jj = 0u; runN = 0u;
	layRun(gf(o + 6u) == 1.0, gf(o + 9u) == 1.0);
}

// --- copies of a cell (Candidates.layStamp, stampFast) ------------------------------------------------------------------
fn stampFast(T: u32, x: f32, y: f32, t: f32, cat: f32, unit: f32, hx0: u32) {
	place(x, y);
	let u0 = mu; let v0 = mv; let reach = bitcast<f32>(geo[T + 10u]); let os = geo[T + 7u]; let n = geo[T + 8u];
	if (u0 + reach < L.cx0 || u0 - reach > L.cx1 || v0 + reach < L.cy0 || v0 - reach > L.cy1) { return; }
	let hx = select(hx0, 0u, unit >= 0.0);
	for (var i = 0u; i < n; i++) {
		let p = os + i * ${TSTONE_W}u; let pri = gf(p + 7u);
		var rank = unit;
		if (unit < 0.0) { let r = ffx(gf(p + 2u)); rank = select(fxf(r + hx), fxf(r * 2u + (r >> 1u) + hx) * 0.4, pri < PRI_LINE); }
		push(u0 + gf(p), v0 + gf(p + 1u), rank, gf(p + 3u), t, gf(p + 4u), gf(p + 6u) + cat, pri, gf(p + 5u), select(0u, 2u, pri < PRI_LINE));
	}
}
// one of a geometry's items (a template's, inside a copy)
fn layOne(kind: u32, tb: Tb, j: u32, ox: f32, oy: f32) {
	switch (kind) {
		case ${G_POINT}u: { if (has(${G_POINT}u)) { layPoint(tb, j, ox, oy); } }
		case ${G_KEY}u: { if (has(${G_KEY}u)) { layKey(tb, j, ox, oy); } }
		case ${G_LINE}u: { if (has(${G_LINE}u)) { layLine(tb, j, ox, oy); } }
		case ${G_RUN}u: { if (has(${G_RUN}u)) { layRunOf(tb, j); } }
		default: {}
	}
}
// one item of the geometry, counted or laid: a copy of a cell is its template's items where it lies (under a distortion or a size
// modifier), or the template's stones moved (stampFast)
fn layItem(it: u32) {
	let kind = geo[L.oItems + it * 2u]; let j = geo[L.oItems + it * 2u + 1u];
	sh = -1.0;
	if (kind == ${G_SOURCE}u) { cur += L.srcSlots; return; } // (its slots: SEMIT)
	var n = 1u; var io = L.oItems + it * 2u; var tb = topTb(); var ox = 0.0; var oy = 0.0;
	if (kind == ${G_STAMP}u) {
		if (!has(${G_STAMP}u)) { return; }
		let o = L.oSt + j * 7u; let id = geo[o]; let x = gf(o + 1u); let y = gf(o + 2u); let t = gf(o + 3u); let cat = gf(o + 4u); let unit = gf(o + 5u);
		let T = L.oTpl + id * ${TPL_W}u;
		if (!DIAM && !BEND) { stampFast(T, x, y, t, cat, unit, geo[o + 6u]); return; }
		place(x, y);
		let u0 = mu; let v0 = mv;
		if (!BEND) {
			let reach = bitcast<f32>(geo[T + 9u]) * (abs(L.a) + abs(L.b) + abs(L.c) + abs(L.d)) + L.d0 * 4.0;
			if (u0 + reach < L.cx0 || u0 - reach > L.cx1 || v0 + reach < L.cy0 || v0 - reach > L.cy1) { return; }
		}
		sh = 0.0; shx = select(geo[o + 6u], 0u, unit >= 0.0); su = unit; st = t; sc = cat; su0 = u0; sv0 = v0;
		n = geo[T + 1u]; io = geo[T]; tb = tplTb(id); ox = x; oy = y;
	}
	var vbc = work[L.wV + it];
	for (var q = 0u; q < n; q++) {
		let kq = geo[io + q * 2u]; let jq = geo[io + q * 2u + 1u];
		if (kq == ${G_RUN}u) { vb = vbc; if (sh >= 0.0) { vbc += runVertCount(tb, jq); } }
		layOne(kq, tb, jq, ox, oy);
	}
	sh = -1.0;
}
`;

// each item's run vertices (a run's, or a copy's runs' under a distortion or size modifier), for the prefix sum
const IVCOUNT = HEAD + /* wgsl */ `
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) g: vec3u) {
	let it = g.x;
	if (it >= L.nItems) { return; }
	let kind = geo[L.oItems + it * 2u]; let j = geo[L.oItems + it * 2u + 1u];
	var c = 0u;
	if (kind == ${G_RUN}u) { c = runVertCount(topTb(), j); }
	if (kind == ${G_STAMP}u && (DIAM || BEND)) {
		let id = geo[L.oSt + j * 7u]; let T = L.oTpl + id * ${TPL_W}u; let tb = tplTb(id); let io = geo[T];
		for (var q = 0u; q < geo[T + 1u]; q++) { if (geo[io + q * 2u] == ${G_RUN}u) { c += runVertCount(tb, geo[io + q * 2u + 1u]); } }
	}
	work[L.wV + it] = c;
}`;
// the runs' vertices on the cloth
const IVERT = HEAD + /* wgsl */ `
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) g: vec3u) {
	let it = g.x;
	if (it >= L.nItems) { return; }
	let kind = geo[L.oItems + it * 2u]; let j = geo[L.oItems + it * 2u + 1u];
	sh = -1.0;
	var n = 0u; var io = L.oItems + it * 2u; var tb = topTb(); var ox = 0.0; var oy = 0.0;
	if (kind == ${G_RUN}u) { n = 1u; }
	if (kind == ${G_STAMP}u && (DIAM || BEND)) {
		let o = L.oSt + j * 7u; let id = geo[o]; let T = L.oTpl + id * ${TPL_W}u;
		sh = 0.0; st = gf(o + 3u); n = geo[T + 1u]; io = geo[T]; tb = tplTb(id); ox = gf(o + 1u); oy = gf(o + 2u);
	}
	var vbc = work[L.wV + it];
	for (var q = 0u; q < n; q++) {
		if (geo[io + q * 2u] != ${G_RUN}u) { continue; }
		let r = geo[io + q * 2u + 1u];
		vb = vbc; runVerts(tb, r, ox, oy); vbc += runVertCount(tb, r);
	}
}`;
// each item's slots: counted (a dispatch one workgroup deep), then laid (two deep: the second row lays)
const ISLOT = HEAD + /* wgsl */ `
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) g: vec3u, @builtin(num_workgroups) nw: vec3u) {
	let it = g.x;
	if (it >= L.nItems) { return; }
	emitting = nw.y == 2u;
	if (emitting && g.y == 0u) { return; }
	cur = 0u;
	if (emitting) { sb = work[L.wS + it]; if (geo[L.oItems + it * 2u] == ${G_SOURCE}u) { return; } }
	layItem(it);
	if (!emitting) { work[L.wS + it] = cur; }
}`;
// a scatter's points (layouts-lattice.js SCATTER_SOURCE, overTile): slot s = (tile point, row, column), in the CPU's order
const SEMIT = HEAD + /* wgsl */ `
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) g: vec3u) {
	let s = g.x;
	if (s >= L.srcSlots) { return; }
	emitting = true; cur = 0u; sb = work[L.wS + L.srcItem] + s; sh = -1.0;
	let per = L.snti * L.sntj; let k = s / per; let r = s % per; let j = r / L.snti; let i = r % L.snti;
	var a = fract(gf(L.oTile + k) + L.sox); var b = fract(gf(L.oTile + L.tileN + k) + L.soy);
	if ((L.sflip & 1u) != 0u) { let t = a; a = b; b = t; }
	if ((L.sflip & 2u) != 0u) { a = 1.0 - a; }
	if ((L.sflip & 4u) != 0u) { b = 1.0 - b; }
	let x = (f32(L.si0 + i32(i)) + a) * L.sL; let y = (f32(L.sj0 + i32(j)) + b) * L.sL;
	if (x < L.sbx0 || x > L.sbx1 || y < L.sby0 || y > L.sby1) { return; }
	let rank = gf(L.oTile + 2u * L.tileN + k);
	var ang = 0.0;
	if (L.sturn != 0u) { ang = hash2(i32(k), 8, L.sseed) * TAU; }
	let t = min(1.0, length(vec2f(x, y)) / 0.35);
	var kk = 1.0;
	if (L.svar > 0.0) { let h = hash2(i32(k), 7, L.sseed); kk = 1.0 - 0.4 * L.svar + h * h * h * L.svar * 2.6; }
	place(x, y);
	let u = mu; let v = mv;
	if (u < L.cx0 || u > L.cx1 || v < L.cy0 || v > L.cy1) { return; }
	push(u, v, select(rank, L.sunit, L.sunit >= 0.0), angleAt(x, y, ang), t, kk, L.scat, 240.0, sizeOf(u, v, kk, t, L.scat, rank), 0u);
}`;

// an exclusive prefix sum over the items' counts in place (one workgroup: each thread sums its stretch, thread 0 the 256
// sums), the total after them; WHICH 0 the run vertices, 1 the slots
const SCAN = /* wgsl */ `
${LAY_STRUCT}
@group(0) @binding(0) var<uniform> L: Lay;
@group(0) @binding(4) var<storage, read_write> work: array<u32>;
override WHICH: u32 = 0u;
var<workgroup> part: array<u32, 256>;
@compute @workgroup_size(256) fn main(@builtin(local_invocation_id) l: vec3u) {
	let off = select(L.wV, L.wS, WHICH == 1u); let N = L.nItems; let t = l.x; let per = (N + 255u) / 256u; let a = min(t * per, N); let b = min(a + per, N);
	var s = 0u;
	for (var c = a; c < b; c++) { s += work[off + c]; }
	part[t] = s;
	workgroupBarrier();
	if (t == 0u) {
		var acc = 0u;
		for (var k = 0u; k < 256u; k++) { let v = part[k]; part[k] = acc; acc += v; }
		work[off + N] = acc;
		if (WHICH == 1u) { work[0] = acc; if (acc > L.cap) { work[1] = 1u; } } else { work[2] = acc; if (acc > L.vcap) { work[1] = 1u; } }
	}
	workgroupBarrier();
	var acc = part[t];
	for (var c = a; c < b; c++) { let v = work[off + c]; work[off + c] = acc; acc += v; }
}`;

// "The same place twice is one stone" (Candidates.fresh): each joint's place in a hash table keeping the first slot to ask
// (DEDUP1), then every other joint there is taken out (DEDUP2)
const DHEAD = /* wgsl */ `
${LAY_STRUCT}
@group(0) @binding(0) var<uniform> L: Lay;
@group(0) @binding(1) var<storage, read> aux: array<vec4f>;
@group(0) @binding(2) var<storage, read> dkey: array<u32>;
@group(0) @binding(3) var<storage, read_write> tab: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read_write> cand: array<vec4f>;
${WGSL_COMMON}
fn joint(i: u32) -> bool { return ((bitcast<u32>(aux[i].w) >> 16u) & 1u) != 0u; }
`;
const DEDUP1 = DHEAD + /* wgsl */ `
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) g: vec3u) {
	let i = g.x;
	if (i >= L.cap || !joint(i)) { return; }
	let key = dkey[i];
	var h = hashU(bitcast<i32>(key), 0, 77) & L.tmask;
	for (var guard = 0u; guard < 100000u; guard++) {
		let r = atomicCompareExchangeWeak(&tab[2u * h], 0u, key);
		if (r.exchanged || r.old_value == key) { atomicMax(&tab[2u * h + 1u], ~i); return; }
		if (r.old_value != 0u) { h = (h + 1u) & L.tmask; }
	}
}`;
const DEDUP2 = DHEAD + /* wgsl */ `
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) g: vec3u) {
	let i = g.x;
	if (i >= L.cap || !joint(i)) { return; }
	let key = dkey[i];
	var h = hashU(bitcast<i32>(key), 0, 77) & L.tmask;
	for (var guard = 0u; guard < 100000u; guard++) {
		if (atomicLoad(&tab[2u * h]) == key) { if (~atomicLoad(&tab[2u * h + 1u]) != i) { cand[i].w = 0.0; } return; }
		h = (h + 1u) & L.tmask;
	}
}`;

const kits = new WeakMap();
// The lay's pipelines on a device (explicit layouts: every kernel sees the same bindings): the prefix sums and the joints' table
// at once; the laying kernels per variant (variant()), compiled in the background when first asked for.
export function layKit(device) {
	let k = kits.get(device);
	if (k) return k;
	const C = GPUShaderStage.COMPUTE, ro = { type: 'read-only-storage' }, rw = { type: 'storage' };
	const lay = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: C, buffer: { type: 'uniform' } }, ...[ro, ro, ro, rw, rw, rw, rw].map((buffer, i) => ({ binding: i + 1, visibility: C, buffer }))] });
	const ded = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: C, buffer: { type: 'uniform' } }, ...[ro, ro, rw, rw].map((buffer, i) => ({ binding: i + 1, visibility: C, buffer }))] });
	const scanL = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: C, buffer: { type: 'uniform' } }, { binding: 4, visibility: C, buffer: rw }] });
	const desc = (code, bgl, constants) => ({ layout: device.createPipelineLayout({ bindGroupLayouts: [bgl] }), compute: { module: device.createShaderModule({ code }), entryPoint: 'main', constants } });
	const variants = new Map(), busy = new Map();
	k = {
		lay, ded, scanL,
		vscan: device.createComputePipeline(desc(SCAN, scanL, { WHICH: 0 })), sscan: device.createComputePipeline(desc(SCAN, scanL, { WHICH: 1 })),
		dedup1: device.createComputePipeline(desc(DEDUP1, ded)), dedup2: device.createComputePipeline(desc(DEDUP2, ded)),
		// the laying kernels for a variant (layData's variant: which kinds of item, size modifiers, a distortion), or null while they
		// compile (onReady(key) then)
		variant(key) {
			const v = variants.get(key);
			if (v) return v;
			if (!busy.has(key)) busy.set(key, k.compile(key));
			return null;
		},
		async compile(key) {
			if (variants.has(key)) return variants.get(key);
			if (busy.has(key) && busy.get(key) !== true) return busy.get(key);
			const [kinds, diam, bend] = key.split('|').map(Number), constants = { KINDS: kinds, DIAM: diam ? 1 : 0, BEND: bend ? 1 : 0 }; // (layData's variant)
			const make = (code) => device.createComputePipelineAsync(desc(code, lay, constants));
			const p = Promise.all([make(IVCOUNT), make(IVERT), make(ISLOT), kinds & (1 << G_SOURCE) ? make(SEMIT) : null]).then(([ivcount, ivert, islot, semit]) => {
				const v = { ivcount, ivert, islot, semit };
				variants.set(key, v); busy.delete(key);
				layKit.onReady?.(key);
				return v;
			});
			busy.set(key, p);
			return p;
		},
	};
	kits.set(device, k);
	return k;
}

// Whether a variant's kernels are ready on the device the GPU keep uses (layReady.device, set by the engine): if not, they are
// compiled in the background (layKit.onReady when done) and the pattern is kept by the CPU twin meanwhile.
export const layReady = { device: null };
export function variantReady(key) { const d = layReady.device; return !!d && !!layKit(d).variant(key); }
// the commonest variants, compiled ahead (a scatter; any other geometry), each well under a second on a GTX 1650 (with size
// modifiers or a distortion 1.5 to 3 s, compiled when first asked for)
export function layWarm(device) { const k = layKit(device); k.variant('32|0|0'); k.variant('63|0|0'); }

// ---------------------------------------------------------------------------------------------------------------------
// The CPU's share: a geometry (stones/geometry.js, finished) and how the pattern lays it, packed for the GPU. o: { map (a..f,
// sc, bend), bend: the distortion's numbers { twist, bulge, R2, waveA, waveL, warp, warpL, seed } or null, clip, pitch, d0, gap,
// fine, angles, jitter, seed, diam (size modifiers on), S (the frame's scale), rigid, flat }. -> { geo: Uint32Array, uni:
// ArrayBuffer (the lay's uniform, LAY_FIELDS; cap, vcap, tmask, offsets into work and the edge raster filled in by the keeper),
// nItems, estSlots, estVerts, srcSlots, joints (some candidate may be a joint: the dedupe runs) }
const fix32 = (x) => Math.round((x - Math.floor(x)) * 4294967296) >>> 0;
export function layData(G, o) {
	const parts = [], put = (arr) => { const at = size; parts.push(arr); size += arr.length; return at; };
	let size = 0;
	const f32 = (n) => { const b = new Float32Array(n); return { f: b, u: new Uint32Array(b.buffer) }; };
	// a geometry's tables: items, points, joints, vertices, lines (vertex range, hash), runs (range, hash, the rest)
	const tables = (T) => {
		const it = new Uint32Array(T.items * 2);
		for (let i = 0; i < T.items; i++) { it[i * 2] = T.kind[i]; it[i * 2 + 1] = T.idx[i]; }
		const ln = new Uint32Array(T.nl * LINE_W);
		for (let i = 0; i < T.nl; i++) { const q = i * LINE_W; ln[q] = T.Ln[q]; ln[q + 1] = T.Ln[q + 1]; ln[q + 2] = fix32(T.Ln[q + 2]); }
		const rn = f32(T.nr * RUN_W);
		for (let i = 0; i < T.nr; i++) {
			const q = i * RUN_W;
			for (let c = 3; c < RUN_W; c++) rn.f[q + c] = T.Rn[q + c];
			rn.u[q] = T.Rn[q]; rn.u[q + 1] = T.Rn[q + 1]; rn.u[q + 2] = fix32(T.Rn[q + 2]);
		}
		return {
			items: put(it), pt: put(new Uint32Array(Float32Array.from(T.Pt.subarray(0, T.np * POINT_W)).buffer)), ky: put(new Uint32Array(Float32Array.from(T.Ky.subarray(0, T.nk * KEY_W)).buffer)),
			vx: put(new Uint32Array(Float32Array.from(T.Vx.subarray(0, T.nv * VERT_W)).buffer)), ln: put(ln), rn: put(rn.u),
		};
	};
	const top = tables(G);
	// copies of a cell: id, x, y, t, cat, unit, its chance (placeHash) as 32 bits
	const sr = f32(G.ns * 7);
	for (let i = 0; i < G.ns; i++) {
		const q = i * STAMP_W, w = i * 7;
		sr.u[w] = G.St[q]; sr.f[w + 1] = G.St[q + 1]; sr.f[w + 2] = G.St[q + 2]; sr.f[w + 3] = G.St[q + 3]; sr.f[w + 4] = G.St[q + 4]; sr.f[w + 5] = G.St[q + 5];
		sr.u[w + 6] = fix32(placeHash(G.St[q + 1], G.St[q + 2]));
	}
	const oSt = put(sr.u);
	// the cells: their tables, and (laid alike everywhere: no distortion, no size modifier) their stones about the origin, as
	// Candidates.stampStones lays them
	const fast = !o.bend && !o.diam, m = o.map, dir = f32(Math.max(1, G.templates.length) * TPL_W), tStones = [];
	const sub = fast && G.templates.length ? new Candidates(256) : null;
	G.templates.forEach((T, id) => {
		const t = tables(T), w = id * TPL_W;
		dir.u.set([t.items, T.items, t.pt, t.ky, t.vx, t.ln, t.rn], w);
		dir.f[w + 9] = T.reach;
		if (sub) {
			sub.reset({ x0: -1e3, x1: 1e3, y0: -1e3, y1: 1e3, r: 1e3 }, o.pitch, o.seed, null, { map: { a: m.a, b: m.b, c: m.c, d: m.d, e: 0, f: 0 }, d0: o.d0, gap: o.gap, fine: o.fine, angles: o.angles });
			sub.open = true; sub.lay(T); // (a cell laid once: each copy takes its places where it lies, as Candidates.stampStones)
			const n = sub.n, S = f32(n * TSTONE_W);
			let reach = 0;
			for (let i = 0; i < n; i++) {
				S.f.set([sub.X[i], sub.Y[i], sub.R[i], sub.A[i], sub.K[i], sub.D[i], sub.C[i], sub.P[i]], i * TSTONE_W);
				reach = Math.max(reach, Math.abs(sub.X[i]), Math.abs(sub.Y[i]));
			}
			dir.u[w + 7] = put(S.u); dir.u[w + 8] = n; dir.f[w + 10] = reach;
			tStones.push(n);
		}
	});
	const oTpl = put(dir.u);
	// a scatter: the blue-noise tile (x, y, its rank as the CPU keeps it) and its range over the box (layouts-lattice.js overTile)
	let src = null, oTile = 0, tileN = 0;
	for (let i = 0; i < G.items; i++) if (G.kind[i] === G_SOURCE) {
		const q = G.idx[i] * 12, S = G.Sr;
		if (src || S[q] !== SCATTER_SOURCE) throw new Error('A geometry the GPU cannot lay: point source ' + S[q]);
		const L = S[q + 7], seed = S[q + 8], box = { x0: S[q + 1], x1: S[q + 2], y0: S[q + 3], y1: S[q + 4] };
		const i0 = Math.floor(box.x0 / L), j0 = Math.floor(box.y0 / L), nti = Math.floor(box.x1 / L) - i0 + 1, ntj = Math.floor(box.y1 / L) - j0 + 1;
		src = { item: i, L, seed, v: S[q + 9], turned: S[q + 10] === 1, cat: S[q + 5], unit: S[q + 6], box, i0, j0, nti, ntj };
	}
	if (src) {
		const T = blueTile(), tl = new Float32Array(T.n * 3);
		tl.set(T.X); tl.set(T.Y, T.n);
		for (let k = 0; k < T.n; k++) tl[2 * T.n + k] = k / T.n;
		oTile = put(new Uint32Array(tl.buffer)); tileN = T.n;
		src.slots = T.n * src.nti * src.ntj;
	}
	const geo = new Uint32Array(Math.max(4, size));
	let at = 0;
	for (const p of parts) { geo.set(p, at); at += p.length; }

	// how many slots and run vertices (bounds: the GPU counts them exactly, and asks for more if these were too few)
	const norm = Math.hypot(m.a, m.b, m.c, m.d) * (o.bend ? 2 : 1), step = o.gap * SIZES[0], lenOf = (T, v0, nv) => { let s = 0; for (let i = 1; i < nv; i++) s += Math.hypot(T.Vx[(v0 + i) * VERT_W] - T.Vx[(v0 + i - 1) * VERT_W], T.Vx[(v0 + i) * VERT_W + 1] - T.Vx[(v0 + i - 1) * VERT_W + 1]); return s; };
	const vertsOf = (T, v0, nv) => { if (!o.bend) return nv; let c = 1; for (let i = 1; i < nv; i++) c += Math.max(1, Math.min(64, Math.ceil(Math.hypot(T.Vx[(v0 + i) * VERT_W] - T.Vx[(v0 + i - 1) * VERT_W], T.Vx[(v0 + i) * VERT_W + 1] - T.Vx[(v0 + i - 1) * VERT_W + 1]) / (o.pitch * 2)))); return c; };
	const itemEst = (T, kind, j) => {
		if (kind === G_POINT || kind === G_KEY) return [1, 0];
		if (kind === G_LINE) return [Math.ceil((lenOf(T, T.Ln[j * LINE_W], T.Ln[j * LINE_W + 1]) * norm) / step) + 2, 0];
		if (kind === G_RUN) { const v0 = T.Rn[j * RUN_W], nv = T.Rn[j * RUN_W + 1]; return [Math.ceil((lenOf(T, v0, nv) * norm) / step) + 4, vertsOf(T, v0, nv)]; }
		return [0, 0];
	};
	const tplEst = G.templates.map((T, id) => {
		if (fast) return [tStones[id], 0];
		let s = 0, v = 0;
		for (let i = 0; i < T.items; i++) { const [a, b] = itemEst(T, T.kind[i], T.idx[i]); s += a; v += b; }
		return [s, v];
	});
	let estSlots = 0, estVerts = 0, joints = G.nk > 0;
	for (let i = 0; i < G.items; i++) {
		const kind = G.kind[i], j = G.idx[i];
		if (kind === G_STAMP) { const e = tplEst[G.St[j * STAMP_W]]; estSlots += e[0]; estVerts += e[1]; joints = true; continue; }
		if (kind === G_SOURCE) { estSlots += src.slots; continue; }
		if (kind === G_RUN) joints = true;
		const [a, b] = itemEst(G, kind, j); estSlots += a; estVerts += b;
	}

	const uni = new ArrayBuffer(LAY_WORDS * 4), F = new Float32Array(uni), U = new Uint32Array(uni), I = new Int32Array(uni);
	const set = (k, v) => { const [i, t] = AT[k]; if (t === 'f') F[i] = v; else if (t === 'i') I[i] = v; else U[i] = v >>> 0; };
	const b = o.bend, cl = o.clip, rg = o.rigid;
	set('a', m.a); set('b', m.b); set('c', m.c); set('d', m.d); set('e', m.e); set('f', m.f);
	set('cx0', cl.x0); set('cx1', cl.x1); set('cy0', cl.y0); set('cy1', cl.y1);
	set('pitch', Math.max(o.pitch, 1e-4)); set('d0', o.d0); set('d1', o.d1); set('gap', o.gap); set('fine', o.fine); set('jitter', o.jitter ?? 0); set('S', o.S);
	set('rx', rg.x); set('ry', rg.y); set('rc', rg.c); set('rs', rg.s); set('rF', rg.F);
	if (b) { set('twist', b.twist); set('bulge', b.bulge); set('R2', b.R2); set('waveA', b.waveA); set('waveL', b.waveL); set('warp', b.warp); set('warpL', b.warpL); set('bseed', b.seed); }
	set('flags', (o.angles ? LAY_FLAGS.angles : 0) | (b ? LAY_FLAGS.bend : 0) | (o.diam ? LAY_FLAGS.diam : 0));
	set('seed', o.seed); set('nItems', G.items);
	set('oItems', top.items); set('oPt', top.pt); set('oKy', top.ky); set('oVx', top.vx); set('oLn', top.ln); set('oRn', top.rn); set('oSt', oSt); set('oTpl', oTpl); set('oTile', oTile); set('tileN', tileN);
	set('wV', W_HEAD); set('wS', W_HEAD + G.items + 1); set('wVerts', W_HEAD + 2 * (G.items + 1));
	if (src) {
		set('srcItem', src.item); set('srcSlots', src.slots); set('sL', src.L); set('si0', src.i0); set('sj0', src.j0); set('snti', src.nti); set('sntj', src.ntj);
		set('sseed', src.seed); set('svar', src.v); set('sturn', src.turned ? 1 : 0); set('scat', src.cat); set('sunit', src.unit);
		set('sox', hash2(src.seed, 1)); set('soy', hash2(src.seed, 2)); set('sflip', (hash2(src.seed, 3) < 0.5 ? 1 : 0) | (hash2(src.seed, 4) < 0.5 ? 2 : 0) | (hash2(src.seed, 5) < 0.5 ? 4 : 0));
		set('sbx0', src.box.x0); set('sbx1', src.box.x1); set('sby0', src.box.y0); set('sby1', src.box.y1);
	}
	// the kernels' variant (layKit's variant): a scatter alone, or any geometry; with size modifiers; with a distortion (eight in
	// all, the commonest two compiled when the GPU keep starts: layWarm)
	let kinds = 0;
	for (let i = 0; i < G.items; i++) kinds |= 1 << G.kind[i];
	const variant = (kinds === 1 << G_SOURCE ? 32 : 63) + '|' + (o.diam ? 1 : 0) + '|' + (o.bend ? 1 : 0);
	return { geo, uni, nItems: G.items, estSlots: Math.ceil(estSlots * 1.02) + 64, estVerts: Math.ceil(estVerts * 1.02) + 16, srcSlots: src?.slots ?? 0, joints, variant };
}
// fills in what the keeper decides: its buffers' sizes, the work buffer's layout, the edge raster's place
export function layUniform(uni, { cap, vcap, tmask, room, oD }) {
	const F = new Float32Array(uni), U = new Uint32Array(uni), set = (k, v) => { const [i, t] = AT[k]; if (t === 'f') F[i] = v; else U[i] = v >>> 0; };
	set('cap', cap); set('vcap', vcap); set('tmask', tmask); set('oD', oD);
	set('er', room.er); set('dx0', room.dx0); set('dy0', room.dy0); set('ex', room.ex); set('ey', room.ey);
	return uni;
}
export const workWords = (nItems, vcap) => W_HEAD + 2 * (nItems + 1) + vcap * 5;
// (the kernels' sources, for checks: compile times, errors)
export const LAY_SOURCES = { IVCOUNT, IVERT, ISLOT, SEMIT, SCAN, DEDUP1, DEDUP2 };
