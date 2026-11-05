// A pattern's stones laid, kept and written on the GPU (WebGPU compute on the renderer's device): Phase 3 of
// knowledge/product/roadmap/webgpu-and-stone-engine-plan.md. The CPU twin is stones/pattern.js keepPattern (with
// stones/candidates.js Candidates.lay and stones/peaks.js resolvePeaks); a change to one is a change to the other.
//
// The CPU describes the pattern's geometry (a layout's make, only when the arrangement changes) and packs it with the numbers a
// move does not change (stones/pattern.js patternGpu, stones/gpu-lay.js layData); its modifiers and crystals as a small table
// (stones/gpu-wgsl.js modsBuffer). When the geometry is new the GPU lays it (stones/gpu-lay.js: candidates in the CPU's order, a
// slot of size 0 where the CPU lays none), then works out the standing rule and the neighbour grid from the candidates themselves
// (RULE, GRIDP, KEYS; GCOUNT, GSCAN, GPUT). Each run, one candidate per invocation:
//   keep   its place on the cloth (the pattern's rigid part), the density modifiers, room on the piece (the room raster), the
//          openings' keep-out (the keep raster): alive (0) with its colour (the colour modifiers' pick, in the state's upper
//          bits), or out (2)
//   round  the parallel rule, in place, its conflicts found in the grid (those above it closer than their sizes allow, as
//          stones/peaks.js conflictsOf): a candidate is in (1) once every candidate above it that it conflicts with is out,
//          out once one of them is in (a state, once decided, never changes, so reading a fresher one only settles sooner);
//          rounds are dispatched indirectly and a one-thread step after each stops the rest once nothing is undecided; an
//          empty round still costs (about 45 us a group on a GTX 1650), so a run dispatches as many as its candidates last
//          needed, twice over and two more (all 48 the first time); a run whose budget runs out writes nothing (the last
//          finished stones stay on show, GATE) and is followed by one with every round as soon as its count is read back
//   write  the instance data the stone material reads (stones/stones-node.js placedNode: aStone, aColour, aFinish), straight
//          into three's vertex buffers, for the pattern's own side and its mirrored one, packed: each kept stone takes the
//          next slot by an atomic count, which is the side's indirect draw's instance count (slot order changes from frame to
//          frame, which drawing does not mind; lists come from the CPU twin)
// Nothing is read back per frame except a few counts (mapAsync, not waited for). Buffers too small for what the GPU laid (the
// CPU only bounds them) show nothing new: the counts read back say how big, and the pattern is laid again.
import { WGSL_COMMON, WGSL_MODS } from './gpu-wgsl.js';
import { layKit, layUniform, workWords, W_HEAD } from './gpu-lay.js';

const WG = 64, MAX_ROUNDS = 48, MAX_SLOTS = 4000000;
export const GPU_FLAGS = { keep: 1, upright: 2, round: 4, crystal: 8 };
// The keep's uniform block: 40 words (WGSL struct U below).
const U_WORDS = 40;

const HEAD = /* wgsl */ `
struct U {
	rx: f32, ry: f32, rc: f32, rs: f32,
	rF: f32, ra: f32, overall: f32, margin: f32,
	less: f32, turn: f32, upAngle: f32, nearEdge: f32,
	dx0: f32, dy0: f32, er: f32, kcell: f32,
	kx0: f32, ky0: f32, full: f32, clear: f32,
	ex: u32, ey: u32, knx: u32, kny: u32,
	n: u32, groups: u32, flags: u32, side: u32,
	fx: f32, fy: f32, fc: f32, fs: f32,
	fS: f32, fF: f32, oD: u32, oK: u32,
	dart: u32, varied: u32, ncellCap: u32, outCap: u32,
}
@group(0) @binding(0) var<uniform> u: U;
${WGSL_COMMON}
`;
// the neighbour grid and the standing rule (GRIDP writes them into work[16..23])
const GRID_OF = /* wgsl */ `
fn gx0() -> f32 { return bitcast<f32>(work[16]); }
fn gy0() -> f32 { return bitcast<f32>(work[17]); }
fn gcell() -> f32 { return bitcast<f32>(work[18]); }
fn cellXY(x: f32, y: f32) -> vec2u {
	return vec2u(min(u32(max(floor((x - gx0()) / gcell()), 0.0)), work[19] - 1u), min(u32(max(floor((y - gy0()) / gcell()), 0.0)), work[20] - 1u));
}`;

// stones/pattern.js roomAt, keepAt, and ClothPiece.edgeAt, bilinear over their rasters (one buffer: room, edge, keep-out)
const RASTERS = /* wgsl */ `
fn rasAt(o: u32, nx: u32, ny: u32, x0: f32, y0: f32, cell: f32, px: f32, py: f32) -> f32 {
	let fx = clamp((px - x0) / cell, 0.0, f32(nx) - 1.001); let fy = clamp((py - y0) / cell, 0.0, f32(ny) - 1.001);
	let i = u32(floor(fx)); let j = u32(floor(fy)); let a = fx - floor(fx); let b = fy - floor(fy); let q = o + j * nx + i;
	return (ras[q] * (1.0 - a) + ras[q + 1u] * a) * (1.0 - b) + (ras[q + nx] * (1.0 - a) + ras[q + nx + 1u] * a) * b;
}
fn roomAt(px: f32, py: f32) -> f32 { return rasAt(0u, u.ex, u.ey, u.dx0, u.dy0, u.er, px, py); }
fn edgeD(px: f32, py: f32) -> f32 { return rasAt(u.oD, u.ex, u.ey, u.dx0, u.dy0, u.er, px, py); }
fn keepAt(px: f32, py: f32) -> f32 { return rasAt(u.oK, u.knx, u.kny, u.kx0, u.ky0, u.kcell, px, py); }
`;
const KEEP = HEAD + /* wgsl */ `
@group(0) @binding(1) var<storage, read> cand: array<vec4f>;
@group(0) @binding(2) var<storage, read> aux: array<vec4f>;
@group(0) @binding(3) var<storage, read> ras: array<f32>;
@group(0) @binding(4) var<storage, read> mods: array<vec4f>;
@group(0) @binding(5) var<storage, read_write> state: array<atomic<u32>>;
${RASTERS}
${WGSL_MODS}
@compute @workgroup_size(${WG}) fn main(@builtin(global_invocation_id) g: vec3u) {
	let i = g.x;
	if (i >= u.n) { return; }
	let c = cand[i];
	if (c.w <= 0.0) { atomicStore(&state[i], 2u); return; }
	let a = aux[i];
	let pu = u.rx + u.rc * u.rF * c.x - u.rs * c.y; let pv = u.ry + u.rs * u.rF * c.x + u.rc * c.y;
	// what the modifiers read (stones/modifiers.js compileMods' at: the frame's own place, from the cloth)
	var C: ModAt;
	let du = pu - u.fx; let dv = pv - u.fy;
	C.lx = ((u.fc * du + u.fs * dv) / u.fS) * u.fF; C.ly = (u.fc * dv - u.fs * du) / u.fS; C.u = pu; C.v = pv;
	C.at = a.y; C.cat = f32(bitcast<u32>(a.w) & 0xffu); C.kk = a.z; C.h = ownH(a.x);
	var dens = u.overall;
	if (mods[0].x > 0.0) { dens *= modDensity(C); }
	var s = 2u;
	if (a.x < dens) {
		let r = roomAt(pu, pv);
		if (r >= c.w * 0.5 + u.margin) {
			if ((u.flags & 1u) == 0u || r >= u.nearEdge + u.less || keepAt(pu, pv) - u.less >= c.w * 0.5) { s = 0u; }
		}
	}
	// (alive: its colour in the upper bits, which the rounds leave alone)
	if (s == 0u) { atomicStore(&state[i], modColour(C) << 2u); } else { atomicStore(&state[i], 2u); }
}`;

// The candidates' extremes (k, P, place, the biggest), per workgroup then into work[4..13]
const RULE = HEAD + /* wgsl */ `
@group(0) @binding(1) var<storage, read> cand: array<vec4f>;
@group(0) @binding(2) var<storage, read> aux: array<vec4f>;
@group(0) @binding(3) var<storage, read_write> work: array<atomic<u32>>;
var<workgroup> R: array<atomic<u32>, 10>;
// a float as a number that orders as the floats do
fn ord(x: f32) -> u32 { let b = bitcast<u32>(x); return select(b | 0x80000000u, ~b, (b & 0x80000000u) != 0u); }
@compute @workgroup_size(${WG}) fn main(@builtin(global_invocation_id) g: vec3u, @builtin(local_invocation_index) li: u32) {
	if (li == 0u) { for (var q = 0u; q < 10u; q += 2u) { atomicStore(&R[q], select(0xffffffffu, 0u, q == 8u)); atomicStore(&R[q + 1u], 0u); } }
	workgroupBarrier();
	let i = g.x;
	if (i < u.n) {
		let c = cand[i];
		if (c.w > 0.0) {
			let a = aux[i]; let pri = (bitcast<u32>(a.w) >> 8u) & 0xffu;
			atomicMin(&R[0], ord(a.z)); atomicMax(&R[1], ord(a.z)); atomicMin(&R[2], pri); atomicMax(&R[3], pri);
			atomicMin(&R[4], ord(c.x)); atomicMax(&R[5], ord(c.x)); atomicMin(&R[6], ord(c.y)); atomicMax(&R[7], ord(c.y));
			atomicMax(&R[8], ord(c.w)); atomicAdd(&R[9], 1u);
		}
	}
	workgroupBarrier();
	if (li == 0u && atomicLoad(&R[9]) > 0u) {
		for (var q = 0u; q < 8u; q += 2u) { atomicMin(&work[4u + q], atomicLoad(&R[q])); atomicMax(&work[5u + q], atomicLoad(&R[q + 1u])); }
		atomicMax(&work[12], atomicLoad(&R[8])); atomicAdd(&work[13], atomicLoad(&R[9]));
	}
}`;
// The grid over the candidates (stones/pattern.js's, before stage 3: cells as wide as two of the biggest may come together, x
// clear, at most so many cells) and the rule (stones/peaks.js ruleOf: a scatter of mixed sizes by size, else by P if it differs)
const GRIDP = HEAD + /* wgsl */ `
@group(0) @binding(1) var<storage, read_write> work: array<u32>;
fn deord(o: u32) -> f32 { return bitcast<f32>(select(~o, o & 0x7fffffffu, (o & 0x80000000u) != 0u)); }
@compute @workgroup_size(1) fn main() {
	let n = work[13];
	var x0 = 0.0; var x1 = 1.0; var y0 = 0.0; var y1 = 1.0; var maxD = 0.0;
	if (n > 0u) { x0 = deord(work[8]); x1 = deord(work[9]); y0 = deord(work[10]); y1 = deord(work[11]); maxD = deord(work[12]); }
	var cell = max(maxD * u.clear * 1.0001, 1e-4);
	let area = (x1 - x0) * (y1 - y0); let most = f32(u.ncellCap);
	if (area / (cell * cell) > most) { cell = sqrt(area / most); }
	var nx = 1u; var ny = 1u;
	for (var guard = 0u; guard < 200u; guard++) {
		nx = u32(floor((x1 - x0) / cell)) + 1u; ny = u32(floor((y1 - y0) / cell)) + 1u;
		if (nx * ny <= u.ncellCap) { break; }
		cell *= 1.05;
	}
	let mixed = u.dart != 0u && n > 0u && (work[4] != work[5] || u.varied != 0u);
	let byP = n > 0u && work[6] != work[7];
	work[16] = bitcast<u32>(x0); work[17] = bitcast<u32>(y0); work[18] = bitcast<u32>(cell);
	work[19] = nx; work[20] = ny; work[21] = nx * ny; work[22] = select(0u, 1u, mixed); work[23] = select(0u, 1u, byP);
}`;
// Each candidate's standing (stones/peaks.js standingKeys): its class in the rule, then its slot (the CPU's order)
const KEYS = HEAD + /* wgsl */ `
@group(0) @binding(1) var<storage, read> cand: array<vec4f>;
@group(0) @binding(2) var<storage, read> aux: array<vec4f>;
@group(0) @binding(3) var<storage, read> work: array<u32>;
@group(0) @binding(4) var<storage, read> mods: array<vec4f>;
@group(0) @binding(5) var<storage, read_write> key: array<u32>;
fn edgeD(px: f32, py: f32) -> f32 { return 0.0; }
${WGSL_MODS}
@compute @workgroup_size(${WG}) fn main(@builtin(global_invocation_id) g: vec3u) {
	let i = g.x;
	if (i >= u.n) { return; }
	var cls = 0u;
	if (work[22] != 0u) { cls = sizeClass(cand[i].w); } else if (work[23] != 0u) { cls = (bitcast<u32>(aux[i].w) >> 8u) & 0xffu; }
	key[i] = (cls << 22u) | i;
}`;

// The candidates' neighbour grid: cells at least as wide as two of the biggest stones may come together, so a candidate's
// conflicts are in the 3 x 3 cells round its own. Built when the candidates change: count per cell, a prefix sum, each
// candidate put in its cell's run (in any order: a round looks at all of them).
const GCOUNT = HEAD + /* wgsl */ `
@group(0) @binding(1) var<storage, read> cand: array<vec4f>;
@group(0) @binding(2) var<storage, read_write> cnt: array<atomic<u32>>;
@group(0) @binding(3) var<storage, read_write> off: array<u32>;
@group(0) @binding(4) var<storage, read> work: array<u32>;
${GRID_OF}
@compute @workgroup_size(${WG}) fn main(@builtin(global_invocation_id) g: vec3u) {
	let i = g.x;
	if (i >= u.n) { return; }
	if (cand[i].w <= 0.0) { return; }
	let c = cellXY(cand[i].x, cand[i].y);
	off[i] = atomicAdd(&cnt[c.y * work[19] + c.x], 1u);
}`;
// one workgroup: each thread sums its stretch of cells, thread 0 runs the 256 sums, each thread writes its stretch's starts
const GSCAN = HEAD + /* wgsl */ `
@group(0) @binding(1) var<storage, read> cnt: array<u32>;
@group(0) @binding(2) var<storage, read_write> start: array<u32>;
@group(0) @binding(3) var<storage, read> work: array<u32>;
var<workgroup> part: array<u32, 256>;
@compute @workgroup_size(256) fn main(@builtin(local_invocation_id) l: vec3u) {
	if (u.n == 0u) { return; } // (and a layout 'auto' keeps binding 0 only where it is read)
	let t = l.x; let N = work[21]; let per = (N + 255u) / 256u; let a = min(t * per, N); let b = min(a + per, N);
	var s = 0u;
	for (var c = a; c < b; c++) { s += cnt[c]; }
	part[t] = s;
	workgroupBarrier();
	if (t == 0u) { var acc = 0u; for (var k = 0u; k < 256u; k++) { let v = part[k]; part[k] = acc; acc += v; } start[N] = acc; }
	workgroupBarrier();
	var acc = part[t];
	for (var c = a; c < b; c++) { start[c] = acc; acc += cnt[c]; }
}`;
const GPUT = HEAD + /* wgsl */ `
@group(0) @binding(1) var<storage, read> cand: array<vec4f>;
@group(0) @binding(2) var<storage, read> start: array<u32>;
@group(0) @binding(3) var<storage, read> off: array<u32>;
@group(0) @binding(4) var<storage, read_write> items: array<u32>;
@group(0) @binding(5) var<storage, read> work: array<u32>;
${GRID_OF}
@compute @workgroup_size(${WG}) fn main(@builtin(global_invocation_id) g: vec3u) {
	let i = g.x;
	if (i >= u.n) { return; }
	if (cand[i].w <= 0.0) { return; }
	let c = cellXY(cand[i].x, cand[i].y);
	items[start[c.y * work[19] + c.x] + off[i]] = i;
}`;

// A round: the candidates above this one (a smaller standing key: stones/peaks.js conflictsOf's order) closer than their two
// sizes allow (x clear), found in the grid
const ROUND = HEAD + /* wgsl */ `
@group(0) @binding(1) var<storage, read> cand: array<vec4f>;
@group(0) @binding(2) var<storage, read> key: array<u32>;
@group(0) @binding(3) var<storage, read> start: array<u32>;
@group(0) @binding(4) var<storage, read> items: array<u32>;
@group(0) @binding(5) var<storage, read_write> state: array<atomic<u32>>;
@group(0) @binding(6) var<storage, read_write> ctl: array<atomic<u32>>;
@group(0) @binding(7) var<storage, read> work: array<u32>;
${GRID_OF}
@compute @workgroup_size(${WG}) fn main(@builtin(global_invocation_id) g: vec3u) {
	let i = g.x;
	if (i >= u.n) { return; }
	if ((atomicLoad(&state[i]) & 3u) != 0u) { return; }
	let c = cand[i]; let ki = key[i]; let q = cellXY(c.x, c.y); let nx = work[19]; let ny = work[20];
	var s = 1u;
	for (var dy = -1; dy <= 1 && s != 2u; dy++) {
		let cy = i32(q.y) + dy;
		if (cy < 0 || cy >= i32(ny)) { continue; }
		for (var dx = -1; dx <= 1 && s != 2u; dx++) {
			let cx = i32(q.x) + dx;
			if (cx < 0 || cx >= i32(nx)) { continue; }
			let k = u32(cy) * nx + u32(cx);
			for (var e = start[k]; e < start[k + 1u]; e++) {
				let j = items[e];
				if (key[j] >= ki) { continue; }
				let o = cand[j]; let ddx = o.x - c.x; let ddy = o.y - c.y; let r = (o.w + c.w) * 0.5 * u.clear;
				if (ddx * ddx + ddy * ddy >= r * r) { continue; }
				let b = atomicLoad(&state[j]) & 3u;
				if (b == 1u) { s = 2u; break; }
				if (b == 0u) { s = 0u; }
			}
		}
	}
	if (s != 0u) { atomicOr(&state[i], s); } else { atomicAdd(&ctl[0], 1u); }
}`;

// after each round: the next one only if something is still undecided (ctl: 0 open, 1 rounds, 2 unused, 3 open after the last)
const NEXT = HEAD + /* wgsl */ `
@group(0) @binding(1) var<storage, read_write> ctl: array<atomic<u32>>;
@group(0) @binding(2) var<storage, read_write> disp: array<u32>;
@compute @workgroup_size(1) fn main() {
	let open = atomicExchange(&ctl[0], 0u);
	atomicStore(&ctl[3], open);
	if (open > 0u) { atomicAdd(&ctl[1], 1u); disp[0] = u.groups; } else { disp[0] = 0u; }
	disp[1] = 1u; disp[2] = 1u;
}`;

// before the writes: only a run whose rounds all settled (and whose candidates all fitted their buffers) writes its stones (its
// side's count starts again from 0, and word 5 of the indirect buffer says so); otherwise nothing is written, so the last
// finished stones stay on show until the run that follows (GpuKeep.readCount)
const GATE = HEAD + /* wgsl */ `
@group(0) @binding(1) var<storage, read_write> ctl: array<atomic<u32>>;
@group(0) @binding(2) var<storage, read_write> ind: array<atomic<u32>>;
@group(0) @binding(3) var<storage, read> work: array<u32>;
@compute @workgroup_size(1) fn main() {
	if (u.n == 0u) { return; } // (and a layout 'auto' keeps binding 0 only where it is read)
	if (work[1] == 0u && (atomicLoad(&ctl[3]) == 0u || u.full > 0.5)) { atomicStore(&ind[1], 0u); atomicStore(&ind[5], 1u); } else { atomicStore(&ind[5], 0u); }
}`;

// stones/gpu-view.js PackView.fill's twin: a kept candidate's aStone (u, v, angle or a round stone's spin, diameter; less than
// nothing for a round stone), aColour and aFinish, for the side u.side (0 own, 1 mirrored)
const WRITE = HEAD + /* wgsl */ `
@group(0) @binding(1) var<storage, read> cand: array<vec4f>;
@group(0) @binding(2) var<storage, read> aux: array<vec4f>;
@group(0) @binding(3) var<storage, read_write> state: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read> pal: array<vec4f>;
@group(0) @binding(5) var<storage, read_write> oS: array<vec4f>;
@group(0) @binding(6) var<storage, read_write> oC: array<vec4f>;
@group(0) @binding(7) var<storage, read_write> oF: array<vec4f>;
@group(0) @binding(8) var<storage, read_write> ind: array<atomic<u32>>;
@compute @workgroup_size(${WG}) fn main(@builtin(global_invocation_id) g: vec3u) {
	let i = g.x;
	if (i >= u.n) { return; }
	let sv = atomicLoad(&state[i]);
	if (atomicLoad(&ind[5]) == 0u || (sv & 3u) != 1u) { return; }
	// packed: the kept stones in the first slots, the draw's instance count (the indirect draw's word 1) counting them
	let o = atomicAdd(&ind[1], 1u);
	if (o >= u.outCap) { return; }
	let c = cand[i]; let a = aux[i]; let mir = u.side == 1u;
	let pu = u.rx + u.rc * u.rF * c.x - u.rs * c.y; let pv = u.ry + u.rs * u.rF * c.x + u.rc * c.y;
	let h = ownH(a.x);
	let r = select(h, fract(h * 7.13 + 0.37), mir);
	var ang = 0.0; var d = c.w;
	if ((u.flags & 4u) != 0u) { ang = select(h * PI, PI - h * PI, mir); d = -d; }
	else { ang = select(u.ra + select(c.z, PI - c.z, u.rF < 0.0), u.upAngle, (u.flags & 2u) != 0u) + u.turn; }
	oS[o] = vec4f(pu, pv, ang, d);
	let p = sv >> 2u; let f0 = pal[2u * p]; let f1 = pal[2u * p + 1u];
	var k = 1.0;
	if ((u.flags & 8u) != 0u) { k = 0.88 + 0.12 * fract(r * 31.7); }
	oC[o] = vec4f(f0.xyz * k, 0.0);
	oF[o] = vec4f(f0.w, f1.x, f1.y, r);
}`;

const kits = new WeakMap(); // per device: the pipelines
function kitOf(device) {
	let k = kits.get(device);
	if (k) return k;
	const make = (code) => device.createComputePipeline({ layout: 'auto', compute: { module: device.createShaderModule({ code }), entryPoint: 'main' } });
	k = { lay: layKit(device), keep: make(KEEP), rule: make(RULE), gridp: make(GRIDP), keys: make(KEYS), gcount: make(GCOUNT), gscan: make(GSCAN), gput: make(GPUT), round: make(ROUND), next: make(NEXT), gate: make(GATE), write: make(WRITE) };
	kits.set(device, k);
	return k;
}

// (read where WebGPU is: the tests import this module in Node, where these names do not exist)
const BU = globalThis.GPUBufferUsage ?? {}, ST = BU.STORAGE, DST = BU.COPY_DST, SRC = BU.COPY_SRC;
const nextPow2 = (n) => 2 ** Math.ceil(Math.log2(Math.max(2, n)));

// One pattern's GPU state: its geometry and the candidates laid from it, its modifiers, its rasters, its control buffers.
export class GpuKeep {
	constructor(device) {
		this.device = device;
		this.kit = kitOf(device);
		this.u = new ArrayBuffer(U_WORDS * 4);
		this.uf = new Float32Array(this.u); this.ui = new Uint32Array(this.u);
		this.ubuf = [0, 1].map(() => device.createBuffer({ size: U_WORDS * 4, usage: BU.UNIFORM | DST }));
		this.lbuf = null;
		this.ctl = device.createBuffer({ size: 16, usage: ST | DST | SRC });
		this.disp = device.createBuffer({ size: 16, usage: ST | DST | BU.INDIRECT });
		this.stage = device.createBuffer({ size: 48, usage: BU.MAP_READ | DST });
		this.staging = false;
		this.count = 0; this.rounds = 0; this.unsettled = 0; this.laid = 0;
		this.lay = null; this.mods = null; this.rasters = null;
		this.cap = 0; this.vcap = 0;
		this.binds = null;
		this.b = {};
	}

	// A buffer of at least this many bytes under this name, kept and grown (a new one only when it grows: the bind groups go
	// with it), data written in if given.
	fit(name, bytes, data = null, usage = ST | DST) {
		const b = this.b;
		if (!b[name] || b[name].size < bytes) {
			b[name]?.destroy();
			b[name] = this.device.createBuffer({ size: Math.max(16, Math.ceil((bytes * 1.25) / 16) * 16), usage });
			this.binds = null;
		}
		if (data?.byteLength) this.device.queue.writeBuffer(b[name], 0, data);
		return b[name];
	}

	// lay: stones/pattern.js patternGpu's (a new object when the geometry or how it is laid changes): { geo, uni, nItems, estSlots,
	// estVerts, srcSlots, joints, dart, clear, varied }. Sizes the candidate buffers (this.cap: what the instance buffers must hold).
	setLay(lay) {
		if (lay === this.lay) return;
		this.lay = lay;
		this.cap = Math.min(MAX_SLOTS, Math.max(this.lastLaid?.slots ?? 0, lay.estSlots, 64));
		this.vcap = Math.max(lay.estVerts, 16);
		this.layDirty = true;
		this.need = null; // (how many rounds these candidates need: not known yet)
	}
	// mods: { data (stones/gpu-wgsl.js modsBuffer), names, palette } (a new object when the modifiers or the crystals change)
	setMods(mods) {
		if (mods === this.mods) return;
		this.fit('mods', mods.data.byteLength, mods.data);
		this.fit('pal', mods.palette.byteLength, mods.palette);
		this.mods = mods;
	}
	// room: stones/pattern.js roomRaster; D: the piece's edge distance raster (ClothPiece.edgeAt's, the room raster's grid);
	// keep: { A (the K or B raster), nx, ny, x0, y0, cell } or null
	setRasters(room, D, keep) {
		const A = keep?.A ?? null, r = this.rasters;
		if (r && r.room === room && r.D === D && r.A === A) return;
		const n = room.S.length, all = new Float32Array(2 * n + (A ? A.length : 4));
		all.set(room.S); all.set(D ?? room.S.map(Math.abs), n);
		if (A) all.set(A, 2 * n);
		this.fit('ras', all.byteLength, all);
		this.rasters = { room, D, A, oD: n, oK: 2 * n };
		this.layDirty ||= !!this.lay?.varied; // (a size modifier from the edge reads it)
	}

	// The buffers a lay needs, sized for this.cap slots and this.vcap run vertices.
	sizeLay() {
		const L = this.lay, cap = this.cap, ncell = Math.min(1000000, 2 * cap + 16);
		this.fit('geo', L.geo.byteLength, L.geo);
		this.fit('work', workWords(L.nItems, this.vcap) * 4, null, ST | DST | SRC);
		this.fit('cand', cap * 16, null, ST | DST | SRC); this.fit('aux', cap * 16, null, ST | DST | SRC); this.fit('dkey', cap * 4, null, ST); this.fit('key', cap * 4, null, ST);
		this.fit('state', cap * 4, null, ST | SRC); this.fit('off', cap * 4, null, ST); this.fit('items', cap * 4, null, ST);
		this.fit('cnt', ncell * 4, null, ST | DST); this.fit('start', (ncell + 1) * 4, null, ST);
		this.tsize = L.joints ? nextPow2(cap * 2) : 2;
		this.fit('tab', this.tsize * 8, null, ST | DST);
		this.ncell = ncell;
		this.lbuf ??= this.device.createBuffer({ size: L.uni.byteLength, usage: BU.UNIFORM | DST });
		const R = this.rasters;
		this.device.queue.writeBuffer(this.lbuf, 0, layUniform(L.uni.slice(0), { cap, vcap: this.vcap, tmask: this.tsize - 1, room: R.room, oD: R.oD }));
		// work's head: counts 0; the extremes ready for their min and max
		const head = new Uint32Array(W_HEAD);
		for (const q of [4, 6, 8, 10]) head[q] = 0xffffffff;
		this.device.queue.writeBuffer(this.b.work, 0, head);
	}

	// The bind groups (made again when a buffer changes). out: [{ stone, colour, finish, ind, indexCount }] own side then mirrored:
	// the instance attributes' GPUBuffers, the side's indirect draw buffer (drawIndexedIndirect's five words; drawIndirect's
	// four when its geometry has no index), how many indices (or vertices) a stone draws.
	bindsFor(out) {
		const same = (o, q) => o.stone === q.stone && o.colour === q.colour && o.finish === q.finish && o.ind === q.ind;
		if (this.binds && this.binds.out.length === out.length && this.binds.out.every((o, i) => same(o, out[i]))) return this.binds;
		const d = this.device, k = this.kit, b = this.b, L = k.lay;
		const group = (pipe, list) => d.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: list.map((buffer, binding) => ({ binding, resource: { buffer } })) });
		const lg = d.createBindGroup({ layout: L.lay, entries: [this.lbuf, b.geo, b.mods, b.ras, b.work, b.cand, b.aux, b.dkey].map((buffer, binding) => ({ binding, resource: { buffer } })) });
		this.binds = {
			out: out.map((o) => ({ ...o })),
			lay: lg,
			scan: d.createBindGroup({ layout: L.scanL, entries: [{ binding: 0, resource: { buffer: this.lbuf } }, { binding: 4, resource: { buffer: b.work } }] }),
			dedup: d.createBindGroup({ layout: L.ded, entries: [this.lbuf, b.aux, b.dkey, b.tab, b.cand].map((buffer, binding) => ({ binding, resource: { buffer } })) }),
			rule: group(k.rule, [this.ubuf[0], b.cand, b.aux, b.work]),
			gridp: group(k.gridp, [this.ubuf[0], b.work]),
			keys: group(k.keys, [this.ubuf[0], b.cand, b.aux, b.work, b.mods, b.key]),
			keep: group(k.keep, [this.ubuf[0], b.cand, b.aux, b.ras, b.mods, b.state]),
			gcount: group(k.gcount, [this.ubuf[0], b.cand, b.cnt, b.off, b.work]),
			gscan: group(k.gscan, [this.ubuf[0], b.cnt, b.start, b.work]),
			gput: group(k.gput, [this.ubuf[0], b.cand, b.start, b.off, b.items, b.work]),
			round: group(k.round, [this.ubuf[0], b.cand, b.key, b.start, b.items, b.state, this.ctl, b.work]),
			next: group(k.next, [this.ubuf[0], this.ctl, this.disp]),
			gate: out.map((o) => group(k.gate, [this.ubuf[0], this.ctl, o.ind, b.work])),
			write: out.map((o, s) => group(k.write, [this.ubuf[s], b.cand, b.aux, b.state, b.pal, o.stone, o.colour, o.finish, o.ind])),
		};
		return this.binds;
	}

	// One frame's keep: p the per-frame values (stones/pattern.js patternGpu .frame), the rasters' sizes from setRasters;
	// out: the sides to write, each holding this.cap stones (outCap). Submitted on the device's queue before the frame that draws
	// them.
	run(p, out, outCap = this.cap) {
		const L = this.lay, n = this.cap, groups = Math.ceil(n / WG), f = this.uf, I = this.ui, R = this.rasters, room = R.room, K = p.edges;
		const lay = this.layDirty;
		if (lay) this.sizeLay();
		f[0] = p.rx; f[1] = p.ry; f[2] = p.rc; f[3] = p.rs; f[4] = p.rF; f[5] = p.ra; f[6] = p.overall; f[7] = p.margin;
		f[8] = p.less; f[9] = p.turn; f[10] = p.upAngle; f[11] = p.nearEdge;
		f[12] = room.dx0; f[13] = room.dy0; f[14] = room.er; f[15] = K?.cell ?? 1; f[16] = K?.x0 ?? 0; f[17] = K?.y0 ?? 0; f[19] = L.clear;
		I[20] = room.ex; I[21] = room.ey; I[22] = K?.nx ?? 2; I[23] = K?.ny ?? 2;
		I[24] = n; I[25] = groups; I[26] = p.flags | (K ? GPU_FLAGS.keep : 0);
		f[28] = p.fx; f[29] = p.fy; f[30] = p.fc; f[31] = p.fs; f[32] = p.fS; f[33] = p.fF; I[34] = R.oD; I[35] = R.oK;
		I[36] = L.dart ? 1 : 0; I[37] = L.varied ? 1 : 0; I[38] = this.ncell; I[39] = outCap;
		// rounds: as many as this candidate set last needed, twice over and two more; all of them the first time, and after a run
		// that did not settle
		const rounds = GpuKeep.maxRounds ?? (this.need == null ? MAX_ROUNDS : Math.min(MAX_ROUNDS, this.need * 2 + 2));
		this.budget = rounds; f[18] = rounds >= MAX_ROUNDS ? 1 : 0; // (a run with every round writes what settled, whatever)
		const q = this.device.queue;
		for (let s = 0; s < out.length; s++) { I[27] = s; q.writeBuffer(this.ubuf[s], 0, this.u); }
		q.writeBuffer(this.ctl, 0, new Uint32Array(4));
		// each side's draw: its stone's indices (its instance count is the gate's and the write kernel's to set)
		for (const o of out) q.writeBuffer(o.ind, 0, new Uint32Array([o.indexCount]));
		q.writeBuffer(this.disp, 0, new Uint32Array([groups, 1, 1, 0]));
		const B = this.bindsFor(out), k = this.kit, enc = this.device.createCommandEncoder({ label: 'stone keep' }), b = this.b;
		if (lay) { enc.clearBuffer(b.cand, 0, n * 16); enc.clearBuffer(b.aux, 0, n * 16); enc.clearBuffer(b.cnt, 0, this.ncell * 4); if (L.joints) enc.clearBuffer(b.tab, 0, this.tsize * 8); }
		// (GpuKeep.timing: the pass's own GPU time, by timestamp queries, in this.gpuMs: dev/stone-stress.js)
		const ts = GpuKeep.timing && this.device.features.has('timestamp-query');
		if (ts && !this.tq) { this.tq = this.device.createQuerySet({ type: 'timestamp', count: 2 }); this.tqBuf = this.device.createBuffer({ size: 16, usage: BU.QUERY_RESOLVE | SRC }); this.tqRead = this.device.createBuffer({ size: 16, usage: BU.MAP_READ | DST }); }
		const pass = enc.beginComputePass(ts ? { timestampWrites: { querySet: this.tq, beginningOfPassWriteIndex: 0, endOfPassWriteIndex: 1 } } : undefined);
		const go = (pipe, bg, x) => { pass.setPipeline(pipe); pass.setBindGroup(0, bg); pass.dispatchWorkgroups(x); };
		if (lay) {
			// the candidates, when the geometry is new (stones/gpu-lay.js): the runs' vertices, the slots, the joints taken once
			const li = Math.max(1, Math.ceil(L.nItems / 64)), KL = k.lay, V = KL.variant(L.variant);
			if (!V) throw new Error('The lay kernels for ' + L.variant + ' are not compiled yet (stones/gpu-lay.js variantReady)');
			go(V.ivcount, B.lay, li); go(KL.vscan, B.scan, 1); go(V.ivert, B.lay, li);
			// (the slots counted with one row of workgroups, laid with two)
			go(V.islot, B.lay, li); go(KL.sscan, B.scan, 1); pass.setPipeline(V.islot); pass.setBindGroup(0, B.lay); pass.dispatchWorkgroups(li, 2);
			if (L.srcSlots) go(V.semit, B.lay, Math.ceil(L.srcSlots / 64));
			if (L.joints) { go(KL.dedup1, B.dedup, groups); go(KL.dedup2, B.dedup, groups); }
			// the standing rule and the neighbour grid
			go(k.rule, B.rule, groups); go(k.gridp, B.gridp, 1); go(k.keys, B.keys, groups);
			go(k.gcount, B.gcount, groups); go(k.gscan, B.gscan, 1); go(k.gput, B.gput, groups);
			this.layDirty = false;
		}
		go(k.keep, B.keep, groups);
		for (let r = 0; r < rounds; r++) {
			pass.setPipeline(k.round); pass.setBindGroup(0, B.round); pass.dispatchWorkgroupsIndirect(this.disp, 0);
			go(k.next, B.next, 1);
		}
		pass.setPipeline(k.gate);
		for (let s = 0; s < out.length; s++) { pass.setBindGroup(0, B.gate[s]); pass.dispatchWorkgroups(1); }
		for (let s = 0; s < out.length; s++) go(k.write, B.write[s], groups);
		pass.end();
		const read = ts && !this.tqBusy;
		if (read) { enc.resolveQuerySet(this.tq, 0, 2, this.tqBuf, 0); enc.copyBufferToBuffer(this.tqBuf, 0, this.tqRead, 0, 16); }
		q.submit([enc.finish()]);
		if (read) {
			this.tqBusy = true;
			this.tqRead.mapAsync(GPUMapMode.READ).then(() => { const t = new BigUint64Array(this.tqRead.getMappedRange().slice(0)); this.tqRead.unmap(); this.gpuMs = Number(t[1] - t[0]) / 1e6; this.tqBusy = false; }, () => { this.tqBusy = false; });
		}
		this.last = { p, out, outCap }; // (for timing it again: dev/stone-stress.js)
		this.lastInd = out[0]?.ind ?? null;
		this.readCount();
	}
	// The counts, read back when the GPU gets to it (not waited for). A run while a read is under way is read after it, so the
	// last counts read are always the last run's.
	readCount() {
		if (this.staging) { this.stale = true; return; }
		this.stale = false;
		const enc = this.device.createCommandEncoder({ label: 'stone keep count' });
		enc.copyBufferToBuffer(this.ctl, 0, this.stage, 0, 16);
		if (this.lastInd) enc.copyBufferToBuffer(this.lastInd, 4, this.stage, 16, 4);
		enc.copyBufferToBuffer(this.b.work, 0, this.stage, 32, 16);
		this.device.queue.submit([enc.finish()]);
		const sides = !!this.lastInd;
		this.staging = true;
		this.stage.mapAsync(GPUMapMode.READ).then(() => {
			const c = new Uint32Array(this.stage.getMappedRange().slice(0));
			this.stage.unmap();
			this.staging = false;
			const over = c[9] !== 0;
			if (!over) { this.count = sides ? Math.min(c[4], this.last?.outCap ?? Infinity) : 0; this.rounds = c[1] + 1; this.unsettled = c[3]; }
			this.laid = c[8];
			if (!this.gone && !this.stale) {
				if (over) {
					// buffers too small for what was laid: bigger, and laid again (by whoever draws them: again())
					this.lastLaid = { slots: c[8] };
					this.cap = Math.min(MAX_SLOTS, Math.max(Math.ceil(c[8] * 1.25), this.cap));
					this.vcap = Math.max(Math.ceil(c[10] * 1.25), this.vcap);
					this.layDirty = true;
					this.again?.();
				} else if (this.unsettled) {
					// the last run's budget ran out: that run again with every round (all 48 not enough: what settled is shown, the rest
					// is not, and it is not run again; never seen: 22 at most over every preset, dev/gpu-keep-check.js)
					this.need = null;
					if (this.last && this.budget < MAX_ROUNDS && GpuKeep.maxRounds == null) { if (this.again) this.again(); else this.run(this.last.p, this.last.out, this.last.outCap); }
				} else this.need = this.rounds;
			}
			if (this.stale && !this.gone) this.readCount();
			this.onCount?.(this);
		}, () => { this.staging = false; });
	}

	// For checks (the twin test): each slot's state after the last run (low two bits: 1 kept) and the candidates. -> { state, cand, aux }
	async readState() {
		const n = this.cap, d = this.device, read = async (buf, bytes) => {
			const s = d.createBuffer({ size: Math.max(16, bytes), usage: BU.MAP_READ | DST }), enc = d.createCommandEncoder();
			enc.copyBufferToBuffer(buf, 0, s, 0, bytes);
			d.queue.submit([enc.finish()]);
			await s.mapAsync(GPUMapMode.READ);
			const out = s.getMappedRange().slice(0, bytes);
			s.unmap(); s.destroy();
			return out;
		};
		return { state: new Uint32Array(await read(this.b.state, n * 4)), cand: new Float32Array(await read(this.b.cand, n * 16)), aux: new Float32Array(await read(this.b.aux, n * 16)), work: new Uint32Array(await read(this.b.work, 128)) };
	}

	dispose() {
		this.gone = true;
		this.drop(...Object.values(this.b), this.ctl, this.disp, this.lbuf, ...this.ubuf);
		if (!this.staging) this.stage.destroy();
	}
	drop(...bs) { for (const b of bs) b?.destroy(); }
}
// (the kernels' sources, for checks: compile times, errors)
export const KEEP_SOURCES = { KEEP, RULE, GRIDP, KEYS, GCOUNT, GSCAN, GPUT, ROUND, NEXT, GATE, WRITE };
