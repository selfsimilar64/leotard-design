// A pattern's stones kept and written on the GPU (WebGPU compute on the renderer's device): Phase 3 of
// knowledge/product/roadmap/webgpu-and-stone-engine-plan.md, first stage. The CPU twin is stones/pattern.js keepPattern (with
// stones/peaks.js resolvePeaks); a change to one is a change to the other.
//
// The CPU draws the candidates and their conflict lists (only when the arrangement changes, not on a move or a thinning) and,
// per candidate, what a move leaves alone: its place in the pattern's rigid frame, direction, diameter, rank, the density
// modifiers' factor and the colour modifiers' pick (both read the frame's own coordinates, which a rigid move does not change:
// stones/pattern.js patternGpu). Each frame the GPU then does, one candidate per invocation:
//   keep   its place on the cloth (the rigid part), density, room on the piece (the room raster), the openings' keep-out
//          (the keep raster): alive (0) or out (2)
//   round  the parallel rule, in place: a candidate is in (1) once every candidate above it that it conflicts with is out,
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
// The uniform block: 28 words (WGSL struct U below).
const U_WORDS = 28;

const HEAD = /* wgsl */ `
struct U {
	rx: f32, ry: f32, rc: f32, rs: f32,
	rF: f32, ra: f32, overall: f32, margin: f32,
	less: f32, turn: f32, upAngle: f32, nearEdge: f32,
	dx0: f32, dy0: f32, er: f32, kcell: f32,
	kx0: f32, ky0: f32, full: f32, pad1: f32,
	ex: u32, ey: u32, knx: u32, kny: u32,
	n: u32, groups: u32, flags: u32, side: u32,
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
	if (a.x < u.overall * a.y) {
		let r = roomAt(pu, pv);
		if (r >= c.w * 0.5 + u.margin) {
			if ((u.flags & 1u) == 0u || r >= u.nearEdge + u.less || keepAt(pu, pv) - u.less >= c.w * 0.5) { s = 0u; }
		}
	}
	atomicStore(&state[i], s);
}`;

const ROUND = HEAD + /* wgsl */ `
@group(0) @binding(1) var<storage, read> start: array<u32>;
@group(0) @binding(2) var<storage, read> list: array<u32>;
@group(0) @binding(3) var<storage, read_write> state: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read_write> ctl: array<atomic<u32>>;
@compute @workgroup_size(${WG}) fn main(@builtin(global_invocation_id) g: vec3u) {
	let i = g.x;
	if (i >= u.n) { return; }
	if (atomicLoad(&state[i]) != 0u) { return; }
	var s = 1u;
	for (var e = start[i]; e < start[i + 1u]; e++) {
		let b = atomicLoad(&state[list[e]]);
		if (b == 1u) { s = 2u; break; }
		if (b == 0u) { s = 0u; }
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
	k = { keep: make(KEEP), round: make(ROUND), next: make(NEXT), gate: make(GATE), write: make(WRITE) };
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

	// st: { n, cand: Float32Array(4n) gx gy ga d, aux: Float32Array(4n) rank densMod h colour, start: Uint32Array(n + 1),
	// list: Uint32Array, palette: Float32Array(8 x colours) } (a new object when any of it changes)
	setStatics(st) {
		if (st === this.statics) return;
		const b = this.b ??= {};
		this.drop(b.cand, b.aux, b.start, b.list, b.state, b.pal);
		b.cand = this.buffer(st.cand); b.aux = this.buffer(st.aux); b.start = this.buffer(st.start); b.list = this.buffer(st.list);
		b.pal = this.buffer(st.palette);
		b.state = this.device.createBuffer({ size: Math.max(16, st.n * 4), usage: ST | SRC });
		this.statics = st;
		this.binds = null;
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
			round: group(k.round, [this.ubuf[0], b.start, b.list, b.state, this.ctl]),
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
		const B = this.bindsFor(out), k = this.kit, enc = this.device.createCommandEncoder({ label: 'stone keep' }), pass = enc.beginComputePass();
		if (n) {
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
		q.submit([enc.finish()]);
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
		this.drop(b.cand, b.aux, b.start, b.list, b.state, b.pal, b.room, b.keep, this.ctl, this.disp, ...this.ubuf);
		if (!this.staging) this.stage.destroy();
	}
}
