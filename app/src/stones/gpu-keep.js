// A pattern's stones kept and written on the GPU (WebGPU compute on the renderer's device): Phase 3 of
// knowledge/product/roadmap/webgpu-and-stone-engine-plan.md, first stage. The CPU twin is stones/pattern.js keepPattern (with
// stones/peaks.js resolvePeaks); a change to one is a change to the other.
//
// The CPU draws the candidates (only when the arrangement changes, not on a move or a thinning) and, per candidate, what a
// move leaves alone: its place in the pattern's rigid frame, direction, diameter, rank, its standing in the parallel rule's
// order, the density modifiers' factor and the colour modifiers' pick (both read the frame's own coordinates, which a rigid
// move does not change: stones/pattern.js patternGpu). When those change the GPU puts the candidates in a neighbour grid
// (GCOUNT, GSCAN, GPUT: stage 2; the CPU's conflict lists are made only for the CPU twin). Each run the GPU then does, one
// candidate per invocation:
//   keep   its place on the cloth (the rigid part), density, room on the piece (the room raster), the openings' keep-out
//          (the keep raster): alive (0) or out (2)
//   round  the parallel rule, in place, its conflicts found in the grid (those above it closer than their sizes allow, as
//          stones/peaks.js conflictsOf): a candidate is in (1) once every candidate above it that it conflicts with is out,
//          out once one of them is in (a state, once decided, never changes, so reading a fresher one only settles sooner);
//          rounds are dispatched indirectly and a one-thread step after each stops the rest once nothing is undecided; an
//          empty round still costs (about 45 us a group on a GTX 1650), so a run dispatches as many as its candidates last
//          needed, twice over and two more (all 48 the first time); a run whose budget runs out writes nothing (the last
//          finished stones stay on show, GATE) and is followed by one with every round as soon as its count is read back
//   write  the instance data the stone material reads (stones/stones-node.js placedNode: aStone, aColour, aFinish), straight
//          into three's vertex buffers, for the pattern's own side and its mirrored one, packed: each kept stone takes the
//          next slot by an atomic count, which is the side's indirect draw's instance count (plan Phase 3 step 3's
//          compaction; slot order changes from frame to frame, which drawing does not mind; lists come from the CPU twin)
// Nothing is read back per frame except the count (a few numbers, mapAsync without waiting).

const WG = 64, MAX_ROUNDS = 48;
export const GPU_FLAGS = { keep: 1, upright: 2, round: 4, crystal: 8 };
// The uniform block: 36 words (WGSL struct U below).
const U_WORDS = 36;

const HEAD = /* wgsl */ `
struct U {
	rx: f32, ry: f32, rc: f32, rs: f32,
	rF: f32, ra: f32, overall: f32, margin: f32,
	less: f32, turn: f32, upAngle: f32, nearEdge: f32,
	dx0: f32, dy0: f32, er: f32, kcell: f32,
	kx0: f32, ky0: f32, full: f32, pad1: f32,
	ex: u32, ey: u32, knx: u32, kny: u32,
	n: u32, groups: u32, flags: u32, side: u32,
	gx0: f32, gy0: f32, gcell: f32, clear: f32,
	gnx: u32, gny: u32, ncell: u32, pad2: u32,
}
@group(0) @binding(0) var<uniform> u: U;
const PI = 3.141592653589793;
`;

// stones/pattern.js roomAt and keepAt, bilinear over their rasters
const KEEP = HEAD + /* wgsl */ `
@group(0) @binding(1) var<storage, read> cand: array<vec4f>;
@group(0) @binding(2) var<storage, read> aux: array<vec4f>;
@group(0) @binding(3) var<storage, read> room: array<f32>;
@group(0) @binding(4) var<storage, read> keepR: array<f32>;
@group(0) @binding(5) var<storage, read_write> state: array<atomic<u32>>;
fn roomAt(px: f32, py: f32) -> f32 {
	let fx = clamp((px - u.dx0) / u.er, 0.0, f32(u.ex) - 1.001); let fy = clamp((py - u.dy0) / u.er, 0.0, f32(u.ey) - 1.001);
	let i = u32(floor(fx)); let j = u32(floor(fy)); let a = fx - floor(fx); let b = fy - floor(fy); let q = j * u.ex + i;
	return (room[q] * (1.0 - a) + room[q + 1u] * a) * (1.0 - b) + (room[q + u.ex] * (1.0 - a) + room[q + u.ex + 1u] * a) * b;
}
fn keepAt(px: f32, py: f32) -> f32 {
	let fx = clamp((px - u.kx0) / u.kcell, 0.0, f32(u.knx) - 1.001); let fy = clamp((py - u.ky0) / u.kcell, 0.0, f32(u.kny) - 1.001);
	let i = u32(floor(fx)); let j = u32(floor(fy)); let a = fx - floor(fx); let b = fy - floor(fy); let q = j * u.knx + i;
	return (keepR[q] * (1.0 - a) + keepR[q + 1u] * a) * (1.0 - b) + (keepR[q + u.knx] * (1.0 - a) + keepR[q + u.knx + 1u] * a) * b;
}
@compute @workgroup_size(${WG}) fn main(@builtin(global_invocation_id) g: vec3u) {
	let i = g.x;
	if (i >= u.n) { return; }
	let c = cand[i]; let a = aux[i];
	let pu = u.rx + u.rc * u.rF * c.x - u.rs * c.y; let pv = u.ry + u.rs * u.rF * c.x + u.rc * c.y;
	var s = 2u;
	if (c.w > 0.0 && a.x < u.overall * a.y) {
		let r = roomAt(pu, pv);
		if (r >= c.w * 0.5 + u.margin) {
			if ((u.flags & 1u) == 0u || r >= u.nearEdge + u.less || keepAt(pu, pv) - u.less >= c.w * 0.5) { s = 0u; }
		}
	}
	atomicStore(&state[i], s);
}`;

// A scatter's candidates drawn on the GPU (stage 2: stones/pattern.js scatterOnGpu): every (tile point, tile row, tile column)
// slot in the CPU's order, SGEN marks those that land in the drawn box and on the cloth's drawn region, SSCAN numbers them (an
// exclusive prefix sum: the CPU's candidate index), SPUT writes them. Slots that land nowhere leave a candidate of size 0
// (the candidate buffer is cleared first), which the other kernels pass over.
const GHEAD = /* wgsl */ `
struct G {
	L: f32, bx0: f32, bx1: f32, by0: f32,
	by1: f32, ma: f32, mb: f32, mc: f32,
	md: f32, me: f32, mf: f32, cx0: f32,
	cx1: f32, cy0: f32, cy1: f32, pad: f32,
	i0: i32, j0: i32, nti: u32, ntj: u32,
	tn: u32, slots: u32, angles: u32, mixed: u32,
}
@group(0) @binding(0) var<uniform> g: G;
@group(0) @binding(1) var<storage, read> tab: array<vec4f>;
// where slot s lands on the cloth, or a negative w when outside the drawn box or region; its tile point in k
fn slotAt(s: u32) -> vec4f {
	let per = g.nti * g.ntj; let k = s / per; let r = s % per; let j = r / g.nti; let i = r % g.nti;
	let t = tab[2u * k];
	let x = (f32(g.i0 + i32(i)) + t.x) * g.L; let y = (f32(g.j0 + i32(j)) + t.y) * g.L;
	if (x < g.bx0 || x > g.bx1 || y < g.by0 || y > g.by1) { return vec4f(0.0, 0.0, f32(k), -1.0); }
	let u = g.ma * x + g.mb * y + g.me; let v = g.mc * x + g.md * y + g.mf;
	if (u < g.cx0 || u > g.cx1 || v < g.cy0 || v > g.cy1) { return vec4f(0.0, 0.0, f32(k), -1.0); }
	return vec4f(u, v, f32(k), 1.0);
}`;
const SGEN = GHEAD + /* wgsl */ `
@group(0) @binding(2) var<storage, read_write> flag: array<u32>;
@compute @workgroup_size(${WG}) fn main(@builtin(global_invocation_id) id: vec3u) {
	let s = id.x;
	if (s >= g.slots) { return; }
	flag[s] = select(0u, 1u, slotAt(s).w > 0.0);
}`;
const SSCAN = /* wgsl */ `
struct G { L: f32, bx0: f32, bx1: f32, by0: f32, by1: f32, ma: f32, mb: f32, mc: f32, md: f32, me: f32, mf: f32, cx0: f32, cx1: f32, cy0: f32, cy1: f32, pad: f32, i0: i32, j0: i32, nti: u32, ntj: u32, tn: u32, slots: u32, angles: u32, mixed: u32, }
@group(0) @binding(0) var<uniform> g: G;
@group(0) @binding(1) var<storage, read> flag: array<u32>;
@group(0) @binding(2) var<storage, read_write> scan: array<u32>;
var<workgroup> part: array<u32, 256>;
@compute @workgroup_size(256) fn main(@builtin(local_invocation_id) l: vec3u) {
	let t = l.x; let N = g.slots; let per = (N + 255u) / 256u; let a = min(t * per, N); let b = min(a + per, N);
	var s = 0u;
	for (var c = a; c < b; c++) { s += flag[c]; }
	part[t] = s;
	workgroupBarrier();
	if (t == 0u) { var acc = 0u; for (var k = 0u; k < 256u; k++) { let v = part[k]; part[k] = acc; acc += v; } scan[N] = acc; }
	workgroupBarrier();
	var acc = part[t];
	for (var c = a; c < b; c++) { scan[c] = acc; acc += flag[c]; }
}`;
// (the tile point's: 0 its place in the tile, direction, diameter; 1 rank, chance, size class, colour)
const SPUT = GHEAD + /* wgsl */ `
@group(0) @binding(2) var<storage, read> flag: array<u32>;
@group(0) @binding(3) var<storage, read> scan: array<u32>;
@group(0) @binding(4) var<storage, read_write> cand: array<vec4f>;
@group(0) @binding(5) var<storage, read_write> aux: array<vec4f>;
@group(0) @binding(6) var<storage, read_write> key: array<u32>;
@compute @workgroup_size(${WG}) fn main(@builtin(global_invocation_id) id: vec3u) {
	let s = id.x;
	if (s >= g.slots || flag[s] == 0u) { return; }
	let p = slotAt(s); let k = u32(p.z); let t0 = tab[2u * k]; let t1 = tab[2u * k + 1u]; let o = scan[s];
	var a = t0.z;
	if (g.angles != 0u) { a = atan2(g.mc * cos(t0.z) + g.md * sin(t0.z), g.ma * cos(t0.z) + g.mb * sin(t0.z)); }
	cand[o] = vec4f(p.x, p.y, a, t0.w);
	aux[o] = vec4f(t1.x, 1.0, t1.y, t1.w);
	key[o] = select(0u, u32(t1.z), g.mixed != 0u) * 262144u + o;
}`;

// The candidates' neighbour grid (stage 2: the CPU's conflict lists, stones/peaks.js conflictsOf, no longer made for the GPU):
// cells at least as wide as two of the biggest stones may come together (u.gcell >= maxD x clear), so a candidate's conflicts
// are in the 3 x 3 cells round its own. Built when the candidates change: count per cell, a prefix sum, each candidate put in
// its cell's run (in any order: a round looks at all of them).
const CELL_OF = /* wgsl */ `
fn cellXY(x: f32, y: f32) -> vec2u {
	return vec2u(min(u32(max(floor((x - u.gx0) / u.gcell), 0.0)), u.gnx - 1u), min(u32(max(floor((y - u.gy0) / u.gcell), 0.0)), u.gny - 1u));
}`;
const GCOUNT = HEAD + CELL_OF + /* wgsl */ `
@group(0) @binding(1) var<storage, read> cand: array<vec4f>;
@group(0) @binding(2) var<storage, read_write> cnt: array<atomic<u32>>;
@group(0) @binding(3) var<storage, read_write> off: array<u32>;
@compute @workgroup_size(${WG}) fn main(@builtin(global_invocation_id) g: vec3u) {
	let i = g.x;
	if (i >= u.n) { return; }
	if (cand[i].w <= 0.0) { return; } // (a slot that landed nowhere)
	let c = cellXY(cand[i].x, cand[i].y);
	off[i] = atomicAdd(&cnt[c.y * u.gnx + c.x], 1u);
}`;
// one workgroup: each thread sums its stretch of cells, thread 0 runs the 256 sums, each thread writes its stretch's starts
const GSCAN = HEAD + /* wgsl */ `
@group(0) @binding(1) var<storage, read> cnt: array<u32>;
@group(0) @binding(2) var<storage, read_write> start: array<u32>;
var<workgroup> part: array<u32, 256>;
@compute @workgroup_size(256) fn main(@builtin(local_invocation_id) l: vec3u) {
	let t = l.x; let N = u.ncell; let per = (N + 255u) / 256u; let a = min(t * per, N); let b = min(a + per, N);
	var s = 0u;
	for (var c = a; c < b; c++) { s += cnt[c]; }
	part[t] = s;
	workgroupBarrier();
	if (t == 0u) { var acc = 0u; for (var k = 0u; k < 256u; k++) { let v = part[k]; part[k] = acc; acc += v; } start[N] = acc; }
	workgroupBarrier();
	var acc = part[t];
	for (var c = a; c < b; c++) { start[c] = acc; acc += cnt[c]; }
}`;
const GPUT = HEAD + CELL_OF + /* wgsl */ `
@group(0) @binding(1) var<storage, read> cand: array<vec4f>;
@group(0) @binding(2) var<storage, read> start: array<u32>;
@group(0) @binding(3) var<storage, read> off: array<u32>;
@group(0) @binding(4) var<storage, read_write> items: array<u32>;
@compute @workgroup_size(${WG}) fn main(@builtin(global_invocation_id) g: vec3u) {
	let i = g.x;
	if (i >= u.n) { return; }
	if (cand[i].w <= 0.0) { return; }
	let c = cellXY(cand[i].x, cand[i].y);
	items[start[c.y * u.gnx + c.x] + off[i]] = i;
}`;

// A round: the candidates above this one (a smaller standing key: stones/peaks.js conflictsOf's order) closer than their two
// sizes allow (x clear), found in the grid
const ROUND = HEAD + CELL_OF + /* wgsl */ `
@group(0) @binding(1) var<storage, read> cand: array<vec4f>;
@group(0) @binding(2) var<storage, read> key: array<u32>;
@group(0) @binding(3) var<storage, read> start: array<u32>;
@group(0) @binding(4) var<storage, read> items: array<u32>;
@group(0) @binding(5) var<storage, read_write> state: array<atomic<u32>>;
@group(0) @binding(6) var<storage, read_write> ctl: array<atomic<u32>>;
@compute @workgroup_size(${WG}) fn main(@builtin(global_invocation_id) g: vec3u) {
	let i = g.x;
	if (i >= u.n) { return; }
	if (atomicLoad(&state[i]) != 0u) { return; }
	let c = cand[i]; let ki = key[i]; let q = cellXY(c.x, c.y);
	var s = 1u;
	for (var dy = -1; dy <= 1 && s != 2u; dy++) {
		let cy = i32(q.y) + dy;
		if (cy < 0 || cy >= i32(u.gny)) { continue; }
		for (var dx = -1; dx <= 1 && s != 2u; dx++) {
			let cx = i32(q.x) + dx;
			if (cx < 0 || cx >= i32(u.gnx)) { continue; }
			let k = u32(cy) * u.gnx + u32(cx);
			for (var e = start[k]; e < start[k + 1u]; e++) {
				let j = items[e];
				if (key[j] >= ki) { continue; }
				let o = cand[j]; let ddx = o.x - c.x; let ddy = o.y - c.y; let r = (o.w + c.w) * 0.5 * u.clear;
				if (ddx * ddx + ddy * ddy >= r * r) { continue; }
				let b = atomicLoad(&state[j]);
				if (b == 1u) { s = 2u; break; }
				if (b == 0u) { s = 0u; }
			}
		}
	}
	if (s != 0u) { atomicStore(&state[i], s); } else { atomicAdd(&ctl[0], 1u); }
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

// stones/gpu-view.js PackView.fill's twin: a kept candidate's aStone (u, v, angle or a round stone's spin, diameter; less than
// nothing for a round stone), aColour and aFinish, for the side u.side (0 own, 1 mirrored)
// before the writes: only a run whose rounds all settled writes its stones (its side's count starts again from 0, and word 5
// of the indirect buffer says so); one whose round budget ran out writes nothing, so the last finished stones stay on show
// until the run with every round (GpuKeep.readCount) follows
const GATE = HEAD + /* wgsl */ `
@group(0) @binding(1) var<storage, read_write> ctl: array<atomic<u32>>;
@group(0) @binding(2) var<storage, read_write> ind: array<atomic<u32>>;
@compute @workgroup_size(1) fn main() {
	if (u.n == 0u) { return; } // (and a layout 'auto' keeps binding 0 only where it is read)
	if (atomicLoad(&ctl[3]) == 0u || u.full > 0.5) { atomicStore(&ind[1], 0u); atomicStore(&ind[5], 1u); } else { atomicStore(&ind[5], 0u); }
}`;

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
	if (atomicLoad(&ind[5]) == 0u || atomicLoad(&state[i]) != 1u) { return; }
	// packed: the kept stones in the first slots, the draw's instance count (the indirect draw's word 1) counting them
	let o = atomicAdd(&ind[1], 1u);
	let c = cand[i]; let a = aux[i]; let mir = u.side == 1u;
	let pu = u.rx + u.rc * u.rF * c.x - u.rs * c.y; let pv = u.ry + u.rs * u.rF * c.x + u.rc * c.y;
	let h = a.z;
	let r = select(h, fract(h * 7.13 + 0.37), mir);
	var ang = 0.0; var d = c.w;
	if ((u.flags & 4u) != 0u) { ang = select(h * PI, PI - h * PI, mir); d = -d; }
	else { ang = select(u.ra + select(c.z, PI - c.z, u.rF < 0.0), u.upAngle, (u.flags & 2u) != 0u) + u.turn; }
	oS[o] = vec4f(pu, pv, ang, d);
	let p = u32(a.w); let f0 = pal[2u * p]; let f1 = pal[2u * p + 1u];
	var k = 1.0;
	if ((u.flags & 8u) != 0u) { k = 0.88 + 0.12 * fract(r * 31.7); }
	oC[o] = vec4f(f0.xyz * k, 0.0);
	oF[o] = vec4f(f0.w, f1.x, f1.y, r);
}`;

const kits = new WeakMap(); // per device: the four pipelines
function kitOf(device) {
	let k = kits.get(device);
	if (k) return k;
	const make = (code) => device.createComputePipeline({ layout: 'auto', compute: { module: device.createShaderModule({ code }), entryPoint: 'main' } });
	k = { sgen: make(SGEN), sscan: make(SSCAN), sput: make(SPUT), gcount: make(GCOUNT), gscan: make(GSCAN), gput: make(GPUT), keep: make(KEEP), round: make(ROUND), next: make(NEXT), gate: make(GATE), write: make(WRITE) };
	kits.set(device, k);
	return k;
}

// (read where WebGPU is: the tests import this module in Node, where these names do not exist)
const BU = globalThis.GPUBufferUsage ?? {}, ST = BU.STORAGE, DST = BU.COPY_DST, SRC = BU.COPY_SRC;

// One pattern's GPU state: its candidates' buffers (when they change), its rasters (when they change), its control buffers.
export class GpuKeep {
	constructor(device) {
		this.device = device;
		this.kit = kitOf(device);
		this.u = new ArrayBuffer(U_WORDS * 4);
		this.uf = new Float32Array(this.u); this.ui = new Uint32Array(this.u);
		this.ubuf = [0, 1].map(() => device.createBuffer({ size: U_WORDS * 4, usage: BU.UNIFORM | DST }));
		this.ctl = device.createBuffer({ size: 16, usage: ST | DST | SRC });
		this.disp = device.createBuffer({ size: 16, usage: ST | DST | BU.INDIRECT });
		this.stage = device.createBuffer({ size: 32, usage: BU.MAP_READ | DST });
		this.staging = false;
		this.count = 0; this.rounds = 0; this.unsettled = 0;
		this.statics = null; this.room = null; this.keepA = null;
		this.binds = null;
	}

	buffer(data, usage = ST | DST) {
		const b = this.device.createBuffer({ size: Math.max(16, Math.ceil(data.byteLength / 16) * 16), usage });
		if (data.byteLength) this.device.queue.writeBuffer(b, 0, data);
		return b;
	}
	drop(...bs) { for (const b of bs) b?.destroy(); }

	// A buffer of at least this many bytes under this name, kept and grown (a new one only when it grows: the bind groups go
	// with it), data written in if given.
	fit(name, bytes, data = null, usage = ST | DST) {
		const b = this.b ??= {};
		if (!b[name] || b[name].size < bytes) {
			b[name]?.destroy();
			b[name] = this.device.createBuffer({ size: Math.max(16, Math.ceil((bytes * 1.25) / 16) * 16), usage });
			this.binds = null;
		}
		if (data?.byteLength) this.device.queue.writeBuffer(b[name], 0, data);
		return b[name];
	}

	// st: { n, cand: Float32Array(4n) gx gy ga d, aux: Float32Array(4n) rank densMod h colour, key: Uint32Array(n) standing,
	// grid: { x0, y0, cell, nx, ny, clear }, palette: Float32Array(8 x colours) } (a new object when any of it changes)
	// A scatter the GPU draws (st.gen: stones/pattern.js scatterOnGpu): its tile table and the tiles' range instead of cand, aux
	// and key, which the GPU writes; n is then its slots (an upper bound: those that land nowhere are of size 0).
	setStatics(st) {
		if (st === this.statics) return;
		const n = st.n, cells = st.grid.nx * st.grid.ny;
		if (st.gen) {
			const G = st.gen, m = G.map;
			if (this.table !== G.table) { this.fit('tab', G.table.byteLength, G.table); this.table = G.table; }
			this.fit('cand', n * 16); this.fit('aux', n * 16); this.fit('key', n * 4); this.fit('flag', n * 4); this.fit('scan', (n + 1) * 4);
			const gf = new Float32Array(24), gi = new Int32Array(gf.buffer), gu = new Uint32Array(gf.buffer);
			gf.set([G.L, G.box.x0, G.box.x1, G.box.y0, G.box.y1, m.a, m.b, m.c, m.d, m.e, m.f, G.clip.x0, G.clip.x1, G.clip.y0, G.clip.y1, 0]);
			gi[16] = G.i0; gi[17] = G.j0; gu[18] = G.nti; gu[19] = G.ntj; gu[20] = G.tn; gu[21] = G.slots; gu[22] = G.angles ? 1 : 0; gu[23] = G.mixed ? 1 : 0;
			this.gbuf ??= this.device.createBuffer({ size: 96, usage: BU.UNIFORM | DST });
			this.device.queue.writeBuffer(this.gbuf, 0, gf);
			this.genDirty = true;
		} else { this.fit('cand', n * 16, st.cand); this.fit('aux', n * 16, st.aux); this.fit('key', n * 4, st.key); }
		this.fit('pal', st.palette.byteLength, st.palette);
		this.fit('state', n * 4, null, ST | SRC); this.fit('off', n * 4, null, ST); this.fit('items', n * 4, null, ST);
		this.fit('cnt', cells * 4, null, ST | DST); this.fit('start', (cells + 1) * 4, null, ST);
		this.statics = st;
		this.gridDirty = true; // (made again on the next run)
		this.need = null; // (how many rounds these candidates need: not known yet)
	}
	// room: stones/pattern.js roomRaster; keep: { A (the K or B raster), nx, ny, x0, y0, cell } or null
	setRasters(room, keep) {
		const b = this.b;
		if (room !== this.room) { this.drop(b.room); b.room = this.buffer(room.S); this.room = room; this.binds = null; }
		const A = keep?.A ?? null;
		if (A !== this.keepA || !b.keep) { this.drop(b.keep); b.keep = this.buffer(A ?? new Float32Array(4)); this.keepA = A; this.binds = null; }
	}

	// The bind groups (made again when a buffer changes). out: [{ stone, colour, finish, ind, indexCount }] own side then mirrored:
	// the instance attributes' GPUBuffers, the side's indirect draw buffer (drawIndexedIndirect's five words; drawIndirect's
	// four when its geometry has no index), how many indices (or vertices) a stone draws.
	bindsFor(out) {
		const same = (o, q) => o.stone === q.stone && o.colour === q.colour && o.finish === q.finish && o.ind === q.ind;
		if (this.binds && this.binds.out.length === out.length && this.binds.out.every((o, i) => same(o, out[i]))) return this.binds;
		const d = this.device, k = this.kit, b = this.b;
		const group = (pipe, list) => d.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: list.map((buffer, binding) => ({ binding, resource: { buffer } })) });
		this.binds = {
			out: out.map((o) => ({ ...o })),
			keep: group(k.keep, [this.ubuf[0], b.cand, b.aux, b.room, b.keep, b.state]),
			...(b.tab && this.gbuf ? {
				sgen: group(k.sgen, [this.gbuf, b.tab, b.flag]),
				sscan: group(k.sscan, [this.gbuf, b.flag, b.scan]),
				sput: group(k.sput, [this.gbuf, b.tab, b.flag, b.scan, b.cand, b.aux, b.key]),
			} : {}),
			gcount: group(k.gcount, [this.ubuf[0], b.cand, b.cnt, b.off]),
			gscan: group(k.gscan, [this.ubuf[0], b.cnt, b.start]),
			gput: group(k.gput, [this.ubuf[0], b.cand, b.start, b.off, b.items]),
			round: group(k.round, [this.ubuf[0], b.cand, b.key, b.start, b.items, b.state, this.ctl]),
			next: group(k.next, [this.ubuf[0], this.ctl, this.disp]),
			gate: out.map((o) => group(k.gate, [this.ubuf[0], this.ctl, o.ind])),
			write: out.map((o, s) => group(k.write, [this.ubuf[s], b.cand, b.aux, b.state, b.pal, o.stone, o.colour, o.finish, o.ind])),
		};
		return this.binds;
	}

	// One frame's keep: p the per-frame values (stones/pattern.js patternGpu .frame), the rasters' sizes from setRasters;
	// out: the sides to write. Submitted on the device's queue before the frame that draws them.
	run(p, out) {
		const st = this.statics, n = st.n, groups = Math.ceil(n / WG), f = this.uf, I = this.ui, R = this.room, K = p.edges;
		f[0] = p.rx; f[1] = p.ry; f[2] = p.rc; f[3] = p.rs; f[4] = p.rF; f[5] = p.ra; f[6] = p.overall; f[7] = p.margin;
		f[8] = p.less; f[9] = p.turn; f[10] = p.upAngle; f[11] = p.nearEdge;
		f[12] = R.dx0; f[13] = R.dy0; f[14] = R.er; f[15] = K?.cell ?? 1; f[16] = K?.x0 ?? 0; f[17] = K?.y0 ?? 0;
		I[20] = R.ex; I[21] = R.ey; I[22] = K?.nx ?? 2; I[23] = K?.ny ?? 2;
		I[24] = n; I[25] = groups; I[26] = p.flags | (K ? GPU_FLAGS.keep : 0);
		const G = st.grid, cells = G.nx * G.ny;
		f[28] = G.x0; f[29] = G.y0; f[30] = G.cell; f[31] = G.clear; I[32] = G.nx; I[33] = G.ny; I[34] = cells;
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
		const B = this.bindsFor(out), k = this.kit, enc = this.device.createCommandEncoder({ label: 'stone keep' }), grid = this.gridDirty && n > 0;
		if (grid) enc.clearBuffer(this.b.cnt, 0, cells * 4);
		const make = this.genDirty && st.gen && n > 0;
		if (make) enc.clearBuffer(this.b.cand, 0, n * 16);
		// (GpuKeep.timing: the pass's own GPU time, by timestamp queries, in this.gpuMs: dev/stone-stress.js)
		const ts = GpuKeep.timing && this.device.features.has('timestamp-query');
		if (ts && !this.tq) { this.tq = this.device.createQuerySet({ type: 'timestamp', count: 2 }); this.tqBuf = this.device.createBuffer({ size: 16, usage: BU.QUERY_RESOLVE | SRC }); this.tqRead = this.device.createBuffer({ size: 16, usage: BU.MAP_READ | DST }); }
		const pass = enc.beginComputePass(ts ? { timestampWrites: { querySet: this.tq, beginningOfPassWriteIndex: 0, endOfPassWriteIndex: 1 } } : undefined);
		if (n) {
			// a scatter's candidates, when they are new
			if (make) {
				pass.setPipeline(k.sgen); pass.setBindGroup(0, B.sgen); pass.dispatchWorkgroups(groups);
				pass.setPipeline(k.sscan); pass.setBindGroup(0, B.sscan); pass.dispatchWorkgroups(1);
				pass.setPipeline(k.sput); pass.setBindGroup(0, B.sput); pass.dispatchWorkgroups(groups);
				this.genDirty = false;
			}
			// the neighbour grid, when the candidates are new
			if (grid) {
				pass.setPipeline(k.gcount); pass.setBindGroup(0, B.gcount); pass.dispatchWorkgroups(groups);
				pass.setPipeline(k.gscan); pass.setBindGroup(0, B.gscan); pass.dispatchWorkgroups(1);
				pass.setPipeline(k.gput); pass.setBindGroup(0, B.gput); pass.dispatchWorkgroups(groups);
				this.gridDirty = false;
			}
			pass.setPipeline(k.keep); pass.setBindGroup(0, B.keep); pass.dispatchWorkgroups(groups);
			for (let r = 0; r < rounds; r++) {
				pass.setPipeline(k.round); pass.setBindGroup(0, B.round); pass.dispatchWorkgroupsIndirect(this.disp, 0);
				pass.setPipeline(k.next); pass.setBindGroup(0, B.next); pass.dispatchWorkgroups(1);
			}
			pass.setPipeline(k.gate);
			for (let s = 0; s < out.length; s++) { pass.setBindGroup(0, B.gate[s]); pass.dispatchWorkgroups(1); }
			pass.setPipeline(k.write);
			for (let s = 0; s < out.length; s++) { pass.setBindGroup(0, B.write[s]); pass.dispatchWorkgroups(groups); }
		}
		pass.end();
		const read = ts && !this.tqBusy;
		if (read) { enc.resolveQuerySet(this.tq, 0, 2, this.tqBuf, 0); enc.copyBufferToBuffer(this.tqBuf, 0, this.tqRead, 0, 16); }
		q.submit([enc.finish()]);
		if (read) {
			this.tqBusy = true;
			this.tqRead.mapAsync(GPUMapMode.READ).then(() => { const t = new BigUint64Array(this.tqRead.getMappedRange().slice(0)); this.tqRead.unmap(); this.gpuMs = Number(t[1] - t[0]) / 1e6; this.tqBusy = false; }, () => { this.tqBusy = false; });
		}
		this.last = { p, out }; // (for timing it again: dev/stone-stress.js)
		this.lastInd = out[0]?.ind ?? null;
		this.readCount();
	}
	// The count, read back when the GPU gets to it (not waited for). A run while a read is under way is read after it, so the
	// last count read is always the last run's.
	readCount() {
		if (this.staging) { this.stale = true; return; }
		this.stale = false;
		const enc = this.device.createCommandEncoder({ label: 'stone keep count' });
		enc.copyBufferToBuffer(this.ctl, 0, this.stage, 0, 16);
		if (this.lastInd) enc.copyBufferToBuffer(this.lastInd, 4, this.stage, 16, 4);
		this.device.queue.submit([enc.finish()]);
		const sides = !!this.lastInd;
		this.staging = true;
		this.stage.mapAsync(GPUMapMode.READ).then(() => {
			const c = new Uint32Array(this.stage.getMappedRange().slice(0));
			this.stage.unmap();
			this.count = sides ? c[4] : 0; this.rounds = c[1] + 1; this.unsettled = c[3];
			this.staging = false;
			if (!this.gone && !this.stale) {
				// the last run's: what its candidates need, or, if its budget ran out, that run again with every round
				// (all 48 not enough: what settled is shown, the rest is not, and it is not run again; never seen: 22 at most over
				// every preset, dev/gpu-keep-check.js)
				if (this.unsettled) { this.need = null; if (this.last && this.budget < MAX_ROUNDS && GpuKeep.maxRounds == null) this.run(this.last.p, this.last.out); } else this.need = this.rounds;
			}
			if (this.stale && !this.gone) this.readCount();
			this.onCount?.(this);
		}, () => { this.staging = false; });
	}

	// For checks (the twin test): each candidate's state after the last run, 1 kept. -> Uint32Array(n)
	async readState() {
		const n = this.statics.n, d = this.device, s = d.createBuffer({ size: Math.max(16, n * 4), usage: BU.MAP_READ | DST }), enc = d.createCommandEncoder();
		enc.copyBufferToBuffer(this.b.state, 0, s, 0, n * 4);
		d.queue.submit([enc.finish()]);
		await s.mapAsync(GPUMapMode.READ);
		const out = new Uint32Array(s.getMappedRange().slice(0, n * 4));
		s.unmap(); s.destroy();
		return out;
	}

	dispose() {
		this.gone = true;
		const b = this.b ?? {};
		this.drop(...Object.values(b), this.ctl, this.disp, ...this.ubuf);
		if (!this.staging) this.stage.destroy();
	}
}
