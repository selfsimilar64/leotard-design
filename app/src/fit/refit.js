// The re-fit on the GPU (WebGPU): today's local/global method with push-only contact and friction, from a start the app already
// holds (a pose: the standing fit placed by surface coordinates; an edit: the standing fit of the uncut design). Kernels in
// refit-wgsl.js; twin of pipeline/race (gpu.py, solvers.local_global). Case data from pipeline/race/export_app.py for now.
//
// Stop rule (owner, 2026-11-03): a few points at the shoulder chatter step to step without going anywhere, so "every point has
// stopped" never comes. Every `window` steps each point's average position over the window is compared with the last window's;
// the fit is done when the chosen statistic of that drift (max, or a percentile) is under `tol`. The averaged positions are also
// what the page can show, which hides the chatter.

import { buildBVH } from './bvh.js';
import { WGSL, WG, RED, BLOCK, PARAMS, FPARAMS } from './refit-wgsl.js';

export const DEFAULTS = {
	cgIters: 10,  // conjugate-gradient iterations per step (the race: 10)
	damp: 0.05,  // step regulariser (wrap_block.DAMP)
	mu: 0.4,  // friction (gpu.MU)
	stick: 0.001,  // m of give before sliding (gpu.STICK)
	grip: 1.0,  // how far each step moves friction's held contact force to the new one (gpu.Problem.grip)
	window: 10,  // steps per averaging window
	tol: 0.05e-3,  // m: window-average drift under which a point counts as settled
	stat: 'max',  // 'max', or a percentile such as 99.9
	maxSteps: 750,  // never more than this many steps
};
const { SUM, PREV, DRIFT } = BLOCK, NBLOCK = 10;

export async function loadCase(base) {
	const head = await (await fetch(base + '.json')).json();
	const buf = await (await fetch(base + '.bin')).arrayBuffer();
	const arrays = {};
	for (const a of head.arrays) arrays[a.name] = a.type === 'i32' ? new Int32Array(buf, a.offset, a.length) : new Float32Array(buf, a.offset, a.length);
	return { head, arrays };
}

// Group 0..len-1 by key, stable, as gpu.csr: start offsets (n + 1) and members in key order.
function csr(keys, n) {
	const count = new Int32Array(n + 1);
	for (const k of keys) count[k + 1]++;
	for (let i = 0; i < n; i++) count[i + 1] += count[i];
	const fill = count.slice(0, n), order = new Int32Array(keys.length);
	for (let i = 0; i < keys.length; i++) order[fill[keys[i]]++] = i;
	return { start: count, order };
}

// The constant part of the global matrix (solvers.pd_tri_matrix_k, pd_spring_k), as scalar rows: per triangle area * b_a . b_b,
// per span k on the ends and -k across. Summed in float64 from the float32 inputs.
function constantMatrix(n, tris, Dinv, area, si, sj, k) {
	const rows = Array.from({ length: n }, () => new Map());
	const add = (i, j, w) => rows[i].set(j, (rows[i].get(j) || 0) + w);
	const nt = area.length;
	for (let t = 0; t < nt; t++) {
		const b = [[-(Dinv[4 * t] + Dinv[4 * t + 2]), -(Dinv[4 * t + 1] + Dinv[4 * t + 3])], [Dinv[4 * t], Dinv[4 * t + 1]], [Dinv[4 * t + 2], Dinv[4 * t + 3]]];
		for (let a = 0; a < 3; a++) for (let c = 0; c < 3; c++) add(tris[3 * t + a], tris[3 * t + c], area[t] * (b[a][0] * b[c][0] + b[a][1] * b[c][1]));
	}
	for (let s = 0; s < si.length; s++) {
		add(si[s], si[s], k[s]); add(sj[s], sj[s], k[s]); add(si[s], sj[s], -k[s]); add(sj[s], si[s], -k[s]);
	}
	const ptr = new Int32Array(n + 1), cols = [], vals = [], lii = new Float32Array(n);
	for (let i = 0; i < n; i++) {
		const keys = [...rows[i].keys()].sort((p, q) => p - q);
		for (const j of keys) { cols.push(j); vals.push(rows[i].get(j)); if (j === i) lii[i] = rows[i].get(j); }
		ptr[i + 1] = cols.length;
	}
	return { ptr, cols: Int32Array.from(cols), vals: Float32Array.from(vals), lii };
}

function concat(Type, parts) {
	const offsets = {};
	let len = 0;
	for (const [name, a] of parts) { offsets[name] = len; len += a.length; }
	const out = new Type(len);
	for (const [name, a] of parts) out.set(a, offsets[name]);
	return { out, offsets };
}

export class Refit {
	static async device() {
		if (!navigator.gpu) throw new Error('WebGPU is not available in this browser');
		const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }) || await navigator.gpu.requestAdapter();
		if (!adapter) throw new Error('no WebGPU adapter');
		return adapter.requestDevice({ requiredLimits: { maxStorageBuffersPerShaderStage: Math.min(10, adapter.limits.maxStorageBuffersPerShaderStage), maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize, maxBufferSize: adapter.limits.maxBufferSize } });
	}

	constructor(device, data, settings = {}) {
		this.device = device;
		this.head = data.head;
		this.settings = { ...DEFAULTS, ...settings };
		const A = data.arrays, h = data.head;
		const n = this.n = h.n, nt = h.nt, ns = h.ns;
		this.data = data;
		// gather lists, as gpu.Problem
		const vt = csr(A.tris, n);
		const ends = new Int32Array(2 * ns), signed = new Int32Array(2 * ns);
		ends.set(A.sj, 0); ends.set(A.si, ns);
		for (let s = 0; s < ns; s++) { signed[s] = s; signed[ns + s] = -s - 1; }
		const vs = csr(ends, n);
		const vsSrc = Int32Array.from(vs.order, (o) => signed[o]);
		const M = this.matrix = constantMatrix(n, A.tris, A.Dinv, A.area, A.si, A.sj, A.k);
		const topo = concat(Int32Array, [['tri', A.tris], ['sleeve', A.sleeve], ['vts', vt.start], ['vtc', vt.order], ['vss', vs.start], ['vsc', vsSrc],
			['si', A.si], ['sj', A.sj], ['cp', M.ptr], ['cc', M.cols]]);
		const kon = concat(Float32Array, [['dinv', A.Dinv], ['area', A.area], ['facing', A.facing], ['rest', A.rest_len], ['k', A.k], ['cv', M.vals], ['lii', M.lii]]);
		// the body: per part its tree, faces in one list (torso then arm), per part per vertex pseudo-normals
		const m = h.body_points;
		const vec4 = (src, count, w) => { const o = new Float32Array(count * 4); for (let i = 0; i < count; i++) { o[4 * i] = src[3 * i]; o[4 * i + 1] = src[3 * i + 1]; o[4 * i + 2] = src[3 * i + 2]; o[4 * i + 3] = w ? w[i] : 0; } return o; };
		const parts = ['torso', 'arm'].map((p) => ({ tris: A[p + '_tris'], fn: A[p + '_fn'], en: A[p + '_en'], eb: A[p + '_eb'], vn: A[p + '_vn'], vb: A[p + '_vb'] }));
		const bvhs = parts.map((p) => buildBVH(A.body, p.tris));
		const nf = parts.map((p) => p.tris.length / 3);
		const faceI = new Int32Array((nf[0] + nf[1]) * 4), faceN = new Float32Array((nf[0] + nf[1]) * 16);
		let f = 0;
		for (const p of parts) {
			for (let t = 0; t < p.tris.length / 3; t++, f++) {
				faceI.set([p.tris[3 * t], p.tris[3 * t + 1], p.tris[3 * t + 2], p.eb[3 * t] | (p.eb[3 * t + 1] << 1) | (p.eb[3 * t + 2] << 2)], 4 * f);
				faceN.set([p.fn[3 * t], p.fn[3 * t + 1], p.fn[3 * t + 2], 0], 16 * f);
				for (let k = 0; k < 3; k++) faceN.set([p.en[9 * t + 3 * k], p.en[9 * t + 3 * k + 1], p.en[9 * t + 3 * k + 2], 0], 16 * f + 4 + 4 * k);
			}
		}
		const bodyI = concat(Int32Array, [['order0', bvhs[0].order], ['order1', bvhs[1].order], ['link0', bvhs[0].link], ['link1', bvhs[1].link], ['fi', faceI]]);
		const bodyF = concat(Float32Array, [['node0', bvhs[0].box], ['node1', bvhs[1].box], ['fn', faceN],
			['vn0', vec4(parts[0].vn, m, parts[0].vb)], ['vn1', vec4(parts[1].vn, m, parts[1].vb)], ['pts', vec4(A.body, m)]]);
		const q = (o) => o / 4;  // vec4 index
		this.nwg = Math.ceil(n / WG);
		this.p = {
			n, nt, ns, nwg: this.nwg,
			off_tri: topo.offsets.tri, off_sleeve: topo.offsets.sleeve, off_vts: topo.offsets.vts, off_vtc: topo.offsets.vtc,
			off_vss: topo.offsets.vss, off_vsc: topo.offsets.vsc, off_si: topo.offsets.si, off_sj: topo.offsets.sj,
			off_cp: topo.offsets.cp, off_cc: topo.offsets.cc, off_dinv: kon.offsets.dinv, off_area: kon.offsets.area,
			off_facing: kon.offsets.facing, off_rest: kon.offsets.rest, off_k: kon.offsets.k, off_cv: kon.offsets.cv,
			off_lii: kon.offsets.lii, node0: q(bodyF.offsets.node0), node1: q(bodyF.offsets.node1), order0: bodyI.offsets.order0,
			order1: bodyI.offsets.order1, face0: 0, face1: nf[0], off_fn: q(bodyF.offsets.fn),
			vn0: q(bodyF.offsets.vn0), vn1: q(bodyF.offsets.vn1), off_pts: q(bodyF.offsets.pts), off_fi: bodyI.offsets.fi,
			link0: bodyI.offsets.link0, link1: bodyI.offsets.link1, pad0: 0, pad1: 0,
			plane: h.plane, hold: h.hold, gather: h.gather, turn: h.turn,
		};
		const S = GPUBufferUsage.STORAGE, D = GPUBufferUsage.COPY_DST, C = GPUBufferUsage.COPY_SRC;
		const make = (data, usage = S | D | C) => {
			const b = device.createBuffer({ size: Math.max(16, Math.ceil(data.byteLength / 16) * 16), usage });
			device.queue.writeBuffer(b, 0, data);
			return b;
		};
		this.uniform = device.createBuffer({ size: (PARAMS.length + FPARAMS.length) * 4, usage: GPUBufferUsage.UNIFORM | D });
		this.buf = {
			topo: make(topo.out), kon: make(kon.out), bodyI: make(bodyI.out), bodyF: make(bodyF.out),
			v: make(new Float32Array(NBLOCK * n * 4)), pt: make(new Float32Array(3 * n * 4)),
			loc: make(new Float32Array((3 * nt + ns) * 4)), red: make(new Float32Array(1024 + 16)),
		};
		this.stage = device.createBuffer({ size: n * 16, usage: GPUBufferUsage.MAP_READ | D });
		const module = device.createShaderModule({ code: WGSL });
		const entries = Array.from({ length: 9 }, (_, i) => ({ binding: i, visibility: GPUShaderStage.COMPUTE, buffer: { type: i === 0 ? 'uniform' : 'storage' } }));
		const layout = device.createBindGroupLayout({ entries });
		this.bind = device.createBindGroup({ layout, entries: [this.uniform, this.buf.topo, this.buf.kon, this.buf.v, this.buf.pt, this.buf.loc, this.buf.red, this.buf.bodyI, this.buf.bodyF].map((b, i) => ({ binding: i, resource: { buffer: b } })) });
		const pl = device.createPipelineLayout({ bindGroupLayouts: [layout] });
		this.pipe = {};
		for (const e of ['query', 'tri', 'spring', 'rhs', 'cg_init', 'cg_ap', 'cg_update', 'cg_dir', 'finish_rz0', 'finish_alpha', 'finish_beta', 'window_add', 'window_end']) {
			this.pipe[e] = device.createComputePipeline({ layout: pl, compute: { module, entryPoint: e } });
		}
		this.setSettings(this.settings);
		this.reset();
	}

	setSettings(s) {
		this.settings = { ...this.settings, ...s };
		const u = new ArrayBuffer((PARAMS.length + FPARAMS.length) * 4);
		const ui = new Uint32Array(u), uf = new Float32Array(u);
		PARAMS.forEach((k, i) => { ui[i] = this.p[k]; });
		const fv = { ...this.p, damp: this.settings.damp, mu: this.settings.mu, stick: this.settings.stick, grip: this.settings.grip };
		FPARAMS.forEach((k, i) => { uf[PARAMS.length + i] = fv[k]; });
		this.device.queue.writeBuffer(this.uniform, 0, u);
	}

	// Back to the start: positions, friction's anchor and held forces, the windows.
	reset(start = this.data.arrays.start) {
		const n = this.n, v4 = new Float32Array(n * 4);
		for (let i = 0; i < n; i++) v4.set([start[3 * i], start[3 * i + 1], start[3 * i + 2], 0], 4 * i);
		const q = this.device.queue;
		q.writeBuffer(this.buf.v, BLOCK.X * n * 16, v4);
		q.writeBuffer(this.buf.v, BLOCK.A * n * 16, v4);
		q.writeBuffer(this.buf.v, PREV * n * 16, v4);
		q.writeBuffer(this.buf.v, SUM * n * 16, new Float32Array(n * 4));
		q.writeBuffer(this.buf.pt, 0, new Float32Array(3 * n * 4));
		q.writeBuffer(this.buf.red, RED.FRESH * 4, new Float32Array([1]));
		this.steps = 0;
	}

	// Encode `count` steps (and the window bookkeeping) into one submission.
	encode(count) {
		const enc = this.device.createCommandEncoder();
		const pass = enc.beginComputePass();
		pass.setBindGroup(0, this.bind);
		const run = (name, groups) => { pass.setPipeline(this.pipe[name]); pass.dispatchWorkgroups(groups); };
		const gn = this.nwg, gt = Math.ceil(this.head.nt / WG), gs = Math.ceil(this.head.ns / WG);
		for (let s = 0; s < count; s++) {
			run('query', gn); run('tri', gt); run('spring', gs); run('rhs', gn);
			run('cg_init', gn); run('finish_rz0', 1);
			for (let k = 0; k < this.settings.cgIters; k++) {
				run('cg_ap', gn); run('finish_alpha', 1); run('cg_update', gn); run('finish_beta', 1); run('cg_dir', gn);
			}
			run('window_add', gn);
		}
		pass.end();
		return enc;
	}

	async read(block) {
		const enc = this.device.createCommandEncoder();
		enc.copyBufferToBuffer(this.buf.v, block * this.n * 16, this.stage, 0, this.n * 16);
		this.device.queue.submit([enc.finish()]);
		await this.stage.mapAsync(GPUMapMode.READ);
		const v4 = new Float32Array(this.stage.getMappedRange().slice(0));
		this.stage.unmap();
		return v4;
	}

	// Run to the stop rule (or maxSteps, or exactly `steps` if given). Returns per window: steps, seconds, the drift statistic.
	async run({ steps = null, onWindow = null } = {}) {
		const s = this.settings, W = s.window;
		const log = [];
		const t0 = performance.now();
		let done = false;
		while (!done) {
			const left = steps != null ? steps - this.steps : s.maxSteps - this.steps;
			if (left <= 0) break;
			const count = Math.min(W, left);
			const enc = this.encode(count);
			const end = this.device.createCommandEncoder();
			const pass = end.beginComputePass();
			pass.setBindGroup(0, this.bind);
			pass.setPipeline(this.pipe.window_end);
			this.device.queue.writeBuffer(this.buf.red, RED.INV_WINDOW * 4, new Float32Array([1 / count]));
			pass.dispatchWorkgroups(this.nwg);
			pass.end();
			this.device.queue.submit([enc.finish(), end.finish()]);
			this.steps += count;
			const drift = await this.read(DRIFT);
			const d = new Float32Array(this.n);
			for (let i = 0; i < this.n; i++) d[i] = drift[4 * i];
			const stat = statistic(d, s.stat);
			const entry = { steps: this.steps, seconds: (performance.now() - t0) / 1000, drift: stat, over: d.filter((x) => x > s.tol).length };
			log.push(entry);
			onWindow?.(entry);
			if (steps == null && count === W && this.steps > W && stat < s.tol) done = true;  // two windows at least: the first has nothing to compare with
		}
		return { log, seconds: (performance.now() - t0) / 1000, steps: this.steps };
	}

	// mm each point's average moved over the last window
	async drift() {
		const v4 = await this.read(DRIFT);
		return Float32Array.from({ length: this.n }, (_, i) => 1000 * v4[4 * i]);
	}

	async positions(averaged = false) {
		const v4 = await this.read(averaged ? PREV : BLOCK.X);
		const x = new Float32Array(this.n * 3);
		for (let i = 0; i < this.n; i++) { x[3 * i] = v4[4 * i]; x[3 * i + 1] = v4[4 * i + 1]; x[3 * i + 2] = v4[4 * i + 2]; }
		return x;
	}
}

function statistic(d, stat) {
	if (stat === 'max') { let m = 0; for (const x of d) m = Math.max(m, x); return m; }
	const s = Float32Array.from(d).sort();
	return s[Math.min(s.length - 1, Math.floor((Number(stat) / 100) * s.length))];
}
