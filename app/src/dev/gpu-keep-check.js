// The GPU keep against its CPU twin (Phase 3 step 7 of knowledge/product/roadmap/webgpu-and-stone-engine-plan.md): for every
// gallery preset, on a real piece of the design on show, moved, turned, flipped and thinned, the stones stones/gpu-keep.js keeps
// against those stones/pattern.js keepPattern keeps, and where it writes them. Run in the test tab on the WebGPU view
// (http://localhost:5176/?renderer=webgpu), in its console or by the browser tool:
//   const { gpuKeepCheck } = await import('/src/dev/gpu-keep-check.js'); await gpuKeepCheck()
// -> { cases, worst: [...], summary }. Opens nothing and changes no design: it reads the design's piece and edges.
import { GALLERY_ITEMS, layoutDefaults } from '../stones/layouts.js';
import { newModifier } from '../stones/modifiers.js';
import { keepPattern, patternGpu } from '../stones/pattern.js';
import { GpuKeep, GPU_FLAGS } from '../stones/gpu-keep.js';

const VARIANTS = {
	plain: {},
	moved: { x: 0.013, y: -0.021, rotate: 33 },
	flipped: { flip: true, rotate: -70, stoneTurn: 20 },
	thinned: { density: 0.55, margin: 0.002 },
	faded: { mods: [{ on: 'density', shape: 'radial' }, { on: 'colour', shape: 'linear' }] },
};

export async function gpuKeepCheck({ panel = null, keys = null, shape = 'round' } = {}) {
	const app = window.app, e = app.engine, device = e.stoneView.renderer?.backend?.device;
	if (!device) throw new Error('No WebGPU device: open the page with ?renderer=webgpu');
	const P = panel ?? app.doc.panels.find((p) => !p.removed && e.clothOf(p.id)?.piece)?.id, piece = e.clothOf(P)?.piece, edge = e.stoneCtx?.edge;
	if (!piece) throw new Error('No flattened piece');
	const K = new GpuKeep(device), out = ['stone', 'colour', 'finish'].map(() => null), cache = new Map();
	const ind = device.createBuffer({ size: 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.INDIRECT });
	let cap = 0;
	const results = [];
	for (const it of GALLERY_ITEMS.values()) {
		if (keys && !keys.includes(it.key)) continue;
		for (const [vn, v] of Object.entries(VARIANTS)) {
			const mods = [...(it.mods ?? []), ...(v.mods ?? [])].map((m, i) => newModifier(m.on, m.shape, m, 'm' + i));
			const gen = { id: 'chk', seed: 7, stone: 'Crystal AB', shape, on: { panel: P }, params: { layout: it.layout, preset: it.key, ...layoutDefaults(it.layout), ...it.params, ...v, mods } };
			const G = patternGpu(gen, piece, { cache, edge });
			if (!G) { results.push({ key: it.key, v: vn, skipped: true }); continue; }
			const cpu = keepPattern(gen, piece, { cache, edge, peaks: true }), n = G.statics.n;
			if (n > cap) {
				cap = Math.ceil(n * 1.25);
				out.forEach((b) => b?.destroy());
				for (let i = 0; i < 3; i++) out[i] = device.createBuffer({ size: cap * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
			}
			G.statics.palette ??= new Float32Array(Math.max(1, G.statics.names.length) * 8);
			K.setStatics(G.statics); K.setRasters(G.room, G.edges);
			K.run({ ...G.frame, edges: G.edges, flags: G.frame.flags | GPU_FLAGS.crystal }, [{ stone: out[0], colour: out[1], finish: out[2], ind, indexCount: 1 }]);
			const state = await K.readState(), drawn = new Uint32Array((await readF32(device, ind, 4)).buffer)[1], S = await readF32(device, out[0], Math.max(4, drawn * 4));
			// (the GPU packs the kept stones in any order: where they went, in 0.1 mm cells; a CPU stone is found if one lies within a
			// hundredth of a millimetre, float32 against float64)
			const at = new Map(), cellOf = (x, y) => Math.floor(x * 1e4) * 100003 + Math.floor(y * 1e4);
			for (let j = 0; j < drawn; j++) { const c = cellOf(S[j * 4], S[j * 4 + 1]); (at.get(c) ?? at.set(c, []).get(c)).push(j); }
			const found = (x, y) => {
				const cx = Math.floor(x * 1e4), cy = Math.floor(y * 1e4);
				for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const j of at.get((cx + a) * 100003 + cy + b) ?? []) if (Math.hypot(S[j * 4] - x, S[j * 4 + 1] - y) < 1e-5) return true;
				return false;
			};
			// kept by both, by one only; where the GPU put those both kept. The CPU's candidates by index when the GPU was given them;
			// a scatter the GPU drew itself numbers its own (and may have drawn a little more or less round the piece), so its stones
			// are matched by place, both ways
			let both = 0, onlyCpu = 0, onlyGpu = 0, far = 0;
			if (G.statics.gen) {
				const cpuAt = new Map();
				for (let j = 0; j < cpu.n; j++) { const c = cellOf(cpu.U[j], cpu.V[j]); (cpuAt.get(c) ?? cpuAt.set(c, []).get(c)).push(j); }
				const inCpu = (x, y) => {
					const cx = Math.floor(x * 1e4), cy = Math.floor(y * 1e4);
					for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const j of cpuAt.get((cx + a) * 100003 + cy + b) ?? []) if (Math.hypot(cpu.U[j] - x, cpu.V[j] - y) < 1e-5) return true;
					return false;
				};
				for (let j = 0; j < cpu.n; j++) if (found(cpu.U[j], cpu.V[j])) both++; else onlyCpu++;
				for (let j = 0; j < drawn; j++) if (!inCpu(S[j * 4], S[j * 4 + 1])) onlyGpu++;
			} else {
				const cpuKept = new Uint8Array(n);
				for (let j = 0; j < cpu.n; j++) cpuKept[cpu.I[j]] = 1;
				for (let i = 0; i < n; i++) {
					const g = state[i] === 1;
					if (g && cpuKept[i]) both++; else if (g) onlyGpu++; else if (cpuKept[i]) onlyCpu++;
				}
				for (let j = 0; j < cpu.n; j++) { const i = cpu.I[j]; if (state[i] === 1 && !found(cpu.U[j], cpu.V[j])) far++; }
			}
			results.push({ key: it.key, v: vn, n, cpu: cpu.n, drawn, both, onlyCpu, onlyGpu, far, rounds: K.rounds, unsettled: K.unsettled, gen: !!G.statics.gen });
		}
	}
	K.dispose(); out.forEach((b) => b?.destroy()); ind.destroy();
	const done = results.filter((r) => !r.skipped), diff = (r) => r.onlyCpu + r.onlyGpu;
	const worst = [...done].sort((a, b) => diff(b) / Math.max(1, b.cpu) - diff(a) / Math.max(1, a.cpu)).slice(0, 12);
	return {
		cases: results.length, skipped: results.length - done.length,
		summary: { drawnByGpu: done.filter((r) => r.gen).length, exact: done.filter((r) => !diff(r) && !r.far && r.drawn === r.cpu).length, miscounted: done.filter((r) => r.drawn !== r.cpu).length, differ: done.filter((r) => diff(r)).length, stones: done.reduce((a, r) => a + r.cpu, 0), mismatched: done.reduce((a, r) => a + diff(r), 0), misplaced: done.reduce((a, r) => a + r.far, 0), unsettled: done.filter((r) => r.unsettled).length, maxRounds: Math.max(...done.map((r) => r.rounds)) },
		worst,
	};
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
