// The GPU stone engine against its CPU twin (Phase 3 step 7 of knowledge/product/roadmap/webgpu-and-stone-engine-plan.md): for
// every gallery preset, on a real piece of the design on show, moved, turned, flipped, thinned, faded, sized, bent and strayed,
// the stones stones/gpu-lay.js lays and stones/gpu-keep.js keeps against those stones/pattern.js keepPattern keeps: where each is
// (matched by place both ways: the GPU numbers its own candidates), and which crystal it is. Run in the test tab on the WebGPU
// view (http://localhost:5176/?renderer=webgpu), in its console or by the browser tool:
//   const { gpuKeepCheck } = await import('/src/dev/gpu-keep-check.js'); await gpuKeepCheck()
// -> { cases, worst: [...], summary }. Opens nothing and changes no design: it reads the design's piece and edges.
import { GALLERY_ITEMS, layoutDefaults } from '../stones/layouts.js';
import { newModifier } from '../stones/modifiers.js';
import { keepPattern, patternGpu } from '../stones/pattern.js';
import { GpuKeep } from '../stones/gpu-keep.js';
import { layKit, layReady } from '../stones/gpu-lay.js';

export const VARIANTS = {
	plain: {},
	moved: { x: 0.013, y: -0.021, rotate: 33 },
	flipped: { flip: true, rotate: -70, stoneTurn: 20 },
	thinned: { density: 0.55, margin: 0.002 },
	faded: { mods: [{ on: 'density', shape: 'radial' }, { on: 'colour', shape: 'linear', stops: ['Crystal AB', 'Sapphire', 'Jet'] }] },
	edged: { mods: [{ on: 'density', shape: 'edge', from: 0.2, to: 1 }, { on: 'colour', shape: 'clouds', stops: [null, 'Siam'] }] },
	sized: { mods: [{ on: 'size', shape: 'linear', from: 1, to: 0.6 }] },
	bent: { twist: 1.2, waveA: 0.004 },
	strayed: { jitter: 0.0015, rotate: 12 },
};

export async function gpuKeepCheck({ panel = null, keys = null, variants = null, shape = 'round' } = {}) {
	const app = window.app, e = app.engine, device = e.stoneView.renderer?.backend?.device;
	if (!device) throw new Error('No WebGPU device: open the page with ?renderer=webgpu');
	const P = panel ?? app.doc.panels.find((p) => !p.removed && e.clothOf(p.id)?.piece)?.id, piece = e.clothOf(P)?.piece, edge = e.stoneCtx?.edge;
	if (!piece) throw new Error('No flattened piece');
	// every variant of the lay kernels compiled first (the app compiles them when first asked for and keeps a pattern on the CPU twin
	// meanwhile)
	layReady.device ??= device;
	for (const v of ['32|0|0', '63|0|0', '32|1|0', '63|1|0', '32|0|1', '63|0|1', '32|1|1', '63|1|1']) await layKit(device).compile(v);
	const K = new GpuKeep(device), out = ['stone', 'colour', 'finish'].map(() => null), cache = new Map();
	const ind = device.createBuffer({ size: 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.INDIRECT });
	let cap = 0;
	const results = [];
	for (const it of GALLERY_ITEMS.values()) {
		if (keys && !keys.includes(it.key)) continue;
		for (const [vn, v] of Object.entries(VARIANTS)) {
			if (variants && !variants.includes(vn)) continue;
			const mods = [...(it.mods ?? []), ...(v.mods ?? [])].map((m, i) => newModifier(m.on, m.shape, m, 'm' + i));
			const gen = { id: 'chk', seed: 7, stone: 'Crystal AB', shape, on: { panel: P }, params: { layout: it.layout, preset: it.key, ...layoutDefaults(it.layout), ...it.params, ...v, mods } };
			const t0 = performance.now(), G = patternGpu(gen, piece, { cache, edge }), tCpuShare = performance.now() - t0;
			if (!G) { results.push({ key: it.key, v: vn, skipped: true }); continue; }
			const cpu = keepPattern(gen, piece, { cache, edge, peaks: true });
			// (a palette whose red is the crystal's index: the colour the GPU wrote says which crystal it chose)
			G.mods.palette = new Float32Array(Math.max(1, G.mods.names.length) * 8);
			G.mods.names.forEach((_, i) => { G.mods.palette[i * 8] = i; });
			K.setLay(G.lay); K.setMods(G.mods); K.setRasters(G.room, G.D, G.edges);
			if (K.cap > cap) {
				cap = Math.ceil(K.cap * 1.25);
				out.forEach((b) => b?.destroy());
				for (let i = 0; i < 3; i++) out[i] = device.createBuffer({ size: cap * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
			}
			let tries = 0, laid = null;
			for (;;) {
				K.run({ ...G.frame, edges: G.edges, flags: G.frame.flags }, [{ stone: out[0], colour: out[1], finish: out[2], ind, indexCount: 1 }], cap);
				laid = (await K.readState()).work;
				if (!laid[1] || ++tries > 3) break;
				// (too small: the keeper grows its buffers as the read-back count would)
				K.cap = Math.min(4e6, Math.ceil(laid[0] * 1.25)); K.vcap = Math.ceil(laid[2] * 1.25) + 16; K.layDirty = true;
				if (K.cap > cap) { cap = Math.ceil(K.cap * 1.25); out.forEach((b) => b?.destroy()); for (let i = 0; i < 3; i++) out[i] = device.createBuffer({ size: cap * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC }); }
			}
			const ctl = new Uint32Array((await readF32(device, K.ctl, 4)).buffer);
			const drawn = new Uint32Array((await readF32(device, ind, 4)).buffer)[1], S = await readF32(device, out[0], Math.max(4, drawn * 4)), Cc = await readF32(device, out[1], Math.max(4, drawn * 4));
			// kept by both, by one only (matched by place within a hundredth of a millimetre, float32 against float64), and of those
			// kept by both, how many differ in crystal
			const cellOf = (x, y) => Math.floor(x * 1e4) * 100003 + Math.floor(y * 1e4);
			const index = (n, X, Y) => { const at = new Map(); for (let j = 0; j < n; j++) { const c = cellOf(X(j), Y(j)); (at.get(c) ?? at.set(c, []).get(c)).push(j); } return at; };
			const near = (at, X, Y, x, y) => {
				const cx = Math.floor(x * 1e4), cy = Math.floor(y * 1e4);
				for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const j of at.get((cx + a) * 100003 + cy + b) ?? []) if (Math.hypot(X(j) - x, Y(j) - y) < 1e-5) return j;
				return -1;
			};
			const gX = (j) => S[j * 4], gY = (j) => S[j * 4 + 1], cX = (j) => cpu.U[j], cY = (j) => cpu.V[j];
			const gAt = index(drawn, gX, gY), cAt = index(cpu.n, cX, cY);
			let both = 0, onlyCpu = 0, onlyGpu = 0, colour = 0, size = 0;
			for (let j = 0; j < cpu.n; j++) {
				const g = near(gAt, gX, gY, cX(j), cY(j));
				if (g < 0) { onlyCpu++; continue; }
				both++;
				if (Math.round(Cc[g * 4]) !== G.mods.names.indexOf(cpu.stone[j])) colour++;
				if (Math.abs(Math.abs(S[g * 4 + 3]) - cpu.D[j]) > 1e-6) size++;
			}
			for (let j = 0; j < drawn; j++) if (near(cAt, cX, cY, gX(j), gY(j)) < 0) onlyGpu++;
			results.push({ key: it.key, v: vn, slots: laid[0], cpu: cpu.n, drawn, both, onlyCpu, onlyGpu, colour, size, rounds: ctl[1] + 1, unsettled: ctl[3], cpuShareMs: +tCpuShare.toFixed(2) });
		}
	}
	K.dispose(); out.forEach((b) => b?.destroy()); ind.destroy();
	const done = results.filter((r) => !r.skipped), diff = (r) => r.onlyCpu + r.onlyGpu + r.colour + r.size;
	const worst = [...done].sort((a, b) => diff(b) / Math.max(1, b.cpu) - diff(a) / Math.max(1, a.cpu)).slice(0, 16);
	const byVariant = {};
	for (const r of done) { const b = (byVariant[r.v] ??= { cases: 0, exact: 0, stones: 0, mismatched: 0 }); b.cases++; b.stones += r.cpu; b.mismatched += diff(r); if (!diff(r) && r.drawn === r.cpu) b.exact++; }
	return {
		cases: results.length, skipped: results.length - done.length,
		summary: { exact: done.filter((r) => !diff(r) && r.drawn === r.cpu).length, miscounted: done.filter((r) => r.drawn !== r.cpu).length, differ: done.filter((r) => diff(r)).length, stones: done.reduce((a, r) => a + r.cpu, 0), mismatched: done.reduce((a, r) => a + r.onlyCpu + r.onlyGpu, 0), colour: done.reduce((a, r) => a + r.colour, 0), size: done.reduce((a, r) => a + r.size, 0), unsettled: done.filter((r) => r.unsettled).length, maxRounds: Math.max(...done.map((r) => r.rounds)) },
		byVariant, worst,
	};
}

// The design on show, end to end: for every pattern the GPU keeps, each side's stones as the GPU wrote them (its own buffers: what the
// 3D and flat views draw) against the CPU twin's records of the same pack (stones/generators.js packOfGroup records: kept clear of
// the patterns before it on its piece, made symmetric, cut to one side, erased), matched by place on the flat cloth.
//   const { gpuPackCheck } = await import('/src/dev/gpu-keep-check.js'); await gpuPackCheck()
export async function gpuPackCheck() {
	const e = window.app.engine, pv = e.stoneView.packView, be = e.stoneView.renderer.backend, device = be.device;
	await device.queue.onSubmittedWorkDone();
	await new Promise((r) => setTimeout(r, 300));
	const out = [];
	for (const pk of e.stoneRun.packs ?? []) {
		if (!pk.gpu) { out.push({ gen: pk.gen, gpu: false }); continue; }
		const recs = pk.records(), row = { gen: pk.gen, filter: !!pk.filter, blockers: pk.gpu.blockers?.lists.length ?? 0 };
		for (const [side, mir] of [['own', false], ['mirror', true]]) {
			const S = pv.sides.get(pk.gen + '|' + side);
			const cpu = recs.filter((s) => !!s.mirrored === mir);
			if (!S) { row[side] = { cpu: cpu.length, gpu: null }; continue; }
			const n = new Uint32Array((await readF32(device, be.get(S.ind).buffer, 4)).buffer)[1], A = await readF32(device, be.get(S.geo.attributes.aStone).buffer, Math.max(4, n * 4));
			const at = new Map(), cell = (x, y) => Math.floor(x * 1e4) * 100003 + Math.floor(y * 1e4);
			for (let j = 0; j < n; j++) { const c = cell(A[j * 4], A[j * 4 + 1]); (at.get(c) ?? at.set(c, []).get(c)).push(j); }
			let both = 0;
			for (const s of cpu) {
				const cx = Math.floor(s.fu * 1e4), cy = Math.floor(s.fv * 1e4);
				let hit = false;
				for (let a = -1; a <= 1 && !hit; a++) for (let b = -1; b <= 1 && !hit; b++) for (const j of at.get((cx + a) * 100003 + cy + b) ?? []) if (Math.hypot(A[j * 4] - s.fu, A[j * 4 + 1] - s.fv) < 1e-5) { hit = true; break; }
				if (hit) both++;
			}
			row[side] = { cpu: cpu.length, gpu: n, both };
		}
		out.push(row);
	}
	return out;
}

async function readF32(device, buf, count) {
	const s = device.createBuffer({ size: Math.max(16, count * 4), usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST }), enc = device.createCommandEncoder();
	enc.copyBufferToBuffer(buf, 0, s, 0, count * 4);
	device.queue.submit([enc.finish()]);
	await s.mapAsync(GPUMapMode.READ);
	const a = new Float32Array(s.getMappedRange().slice(0, count * 4));
	s.unmap(); s.destroy();
	return a;
}
