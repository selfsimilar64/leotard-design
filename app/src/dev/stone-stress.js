// The stone engine's stress test (knowledge/product/roadmap/webgpu-and-stone-engine-plan.md, gates): Procedural Gem Test 3 with
// its flower of life hidden and a scatter (ss4, gap 1.1, Crystal AB) on every flattened piece: about 107 000 stones on the
// WebGPU view (the sleeves are a pair: their stones count twice). Run in the test tab only (port 5176: it loads a design):
//   const S = await import('/src/dev/stone-stress.js'); await S.stressLoad(); await S.stressTime()
// stressTime measures each edit step (median and 90th percentile over the steps of one gesture, for the biggest group, with the
// GPU keep and with its CPU twin, window.__cpuKeep) two ways, neither held to the screen's refresh: cpu, the CPU's own work (the
// edit and one Viewport.frame, called directly, the GPU drained first); wall, until the GPU has finished that frame. Fired back
// to back without draining, the CPU waits for the GPU's earlier frames and a CPU timing silently becomes the GPU's.

const state = async () => {
	const u = performance.getEntriesByType('resource').map((r) => r.name).find((n) => /ui\/state\.js/.test(n));
	return import(u.replace(location.origin, ''));
};
// (with a frame of the page's own drawn while waiting: a hidden pane draws none, and pieces flatten and stones lay in frames)
const wait = (ms) => new Promise((r) => setTimeout(() => { window.app?.engine?.viewport?.frame?.(); r(); }, ms));

export async function stressLoad() {
	const S = await state(), app = window.app, e = app.engine;
	const d = await fetch('/designs/' + encodeURIComponent('Procedural Gem Test 3') + '.json').then((r) => r.json());
	app.load(d);
	for (let i = 0; i < 40 && (!e.stoneRun.packs?.length || e.stonePending.size); i++) await wait(500);
	S.edit(app, { op: 'stones.set', id: 'g13', hidden: true });
	const panels = app.doc.panels.filter((p) => !p.removed && e.clothOf(p.id)?.piece).map((p) => p.id);
	for (const id of panels) S.edit(app, { op: 'stones.add', kind: 'pattern', on: { panel: id }, params: { layout: 'scatter', size: 'ss4', gap: 1.1 }, stone: 'Crystal AB', name: 'stress' });
	// (a hidden group stays in the pending set: only the shown ones are waited for)
	const busy = () => [...e.stonePending].some((id) => !app.doc.stones.find((x) => x.id === id)?.hidden);
	for (let i = 0; i < 40 && busy(); i++) await wait(500);
	await wait(1500);
	return { panels, count: e.stoneCount(), groups: e.stoneRun.packs.map((p) => ({ gen: p.gen, gpu: !!p.gpu, candidates: p.gpu?.keeper?.cap, count: p.count })) };
}

// Each edit step taken apart, with the page's own frame loop paused (its frames would land in the waits): the stone engine's CPU
// time (syncStones), the GPU keep's own time (timestamp queries on its pass, all groups that ran), the frame's CPU time
// (Viewport.frame) and the frame's GPU time (three's timestamp queries). Medians over the steps, for the biggest group, on the
// GPU keep (WebGPU view). -> { [edit]: { stoneCpu, keepGpu, frameCpu, frameGpu } }
export async function stressEngine({ steps = 20 } = {}) {
	const S = await state(), app = window.app, e = app.engine, vp = e.viewport, R = vp.renderer, dev = R.backend?.device;
	if (!dev) throw new Error('WebGPU view only');
	// (the app's own class, through one of its keepers: a module imported from here can be a second copy of it)
	const GpuKeep = [...(e.stoneView.packView?.keepers.values() ?? [])][0]?.constructor;
	if (!GpuKeep) throw new Error('No pattern kept on the GPU');
	const { gpuTime } = await import(performance.getEntriesByType('resource').map((r) => r.name).find((n) => /render\/webgpu\.js/.test(n)).replace(location.origin, ''));
	const big = [...e.stoneRun.packs].sort((a, b) => (b.gpu?.keeper?.cap ?? 0) - (a.gpu?.keeper?.cap ?? 0))[0], id = big.gen, g = app.doc.stones.find((x) => x.id === id), g0 = { ...g.params };
	const med = (w) => { const s = w.filter((x) => x != null).sort((p, q) => p - q); return s.length ? +s[s.length >> 1].toFixed(2) : null; };
	const kinds = { move: ['x', g0.x ?? 0, 0.01], turn: ['rotate', g0.rotate ?? 0, 8], density: ['density', (g0.density ?? 1) - 0.2, 0.15], spacing: ['gap', g0.gap ?? 1.1, 0.02], size: ['size', null, 0] };
	const out = { group: id };
	R.setAnimationLoop(null); GpuKeep.timing = true;
	try {
		for (const [name, [key, base, amp]] of Object.entries(kinds)) {
			const cpu = [], keep = [], fcpu = [], fgpu = [];
			for (let i = 0; i < steps; i++) {
				await dev.queue.onSubmittedWorkDone();
				const val = key === 'size' ? (i & 1 ? 'ss4' : 'ss3') : base + amp * Math.sin(i / 4 + 0.3);
				S.edit(app, { op: 'stones.set', id, params: { [key]: val }, gesture: 'engine' });
				const keepers = e.stoneView.packView.keepers;
				for (const K of keepers.values()) K.gpuMs = null;
				let t = performance.now(); e.syncStones(app.doc, new Set(['stones'])); e.stonesDirty = false; cpu.push(performance.now() - t);
				await gpuTime(R); // (clears what three had pending)
				t = performance.now(); vp.frame(); fcpu.push(performance.now() - t);
				fgpu.push(await gpuTime(R));
				await dev.queue.onSubmittedWorkDone(); await wait(30);
				let k = 0, any = false;
				for (const K of keepers.values()) if (K.gpuMs != null) { k += K.gpuMs; any = true; }
				keep.push(any ? k : null);
			}
			app.endGesture(); S.edit(app, { op: 'stones.set', id, params: { [key]: g0[key] } }); e.syncStones(app.doc, new Set(['stones'])); e.stonesDirty = false;
			out[name] = { stoneCpu: med(cpu), keepGpu: med(keep), frameCpu: med(fcpu), frameGpu: med(fgpu) };
		}
	} finally { GpuKeep.timing = false; R.setAnimationLoop(() => vp.frame()); }
	out.count = e.stoneCount();
	return out;
}

export async function stressTime({ modes = ['gpu', 'cpu'], steps = 30 } = {}) {
	const S = await state(), app = window.app, e = app.engine, vp = e.viewport;
	const big = [...e.stoneRun.packs].sort((a, b) => (b.gpu?.keeper?.cap ?? b.k.n) - (a.gpu?.keeper?.cap ?? a.k.n))[0], id = big.gen, g = app.doc.stones.find((x) => x.id === id);
	S.layout.value = '3d';
	const g0 = { ...g.params }; // (each gesture puts its value back as it was)
	const stats = (w) => { w.sort((p, q) => p - q); return { median: +w[w.length >> 1].toFixed(1), p90: +w[Math.floor(w.length * 0.9)].toFixed(1) }; };
	// per step: cpu, the edit and one Viewport.frame (the GPU drained before it, so no waiting on earlier frames is counted);
	// wall, from the edit until the GPU has finished that frame (its compute and its drawing): the step's real time
	const device = vp.renderer.backend?.device, drained = () => device?.queue.onSubmittedWorkDone() ?? Promise.resolve();
	const gesture = async (key, base, amp) => {
		const cpu = [], wall = [];
		for (let i = 0; i < steps; i++) {
			await drained();
			const a = performance.now();
			S.edit(app, { op: 'stones.set', id, params: { [key]: base + amp * Math.sin(i / 4) }, gesture: 'stress' }); vp.frame();
			cpu.push(performance.now() - a);
			await drained();
			wall.push(performance.now() - a);
		}
		app.endGesture(); S.edit(app, { op: 'stones.set', id, params: { [key]: g0[key] } }); vp.frame();
		return { cpu: stats(cpu), wall: stats(wall) };
	};
	const out = { group: id, hidden: document.hidden };
	for (const mode of modes) {
		globalThis.__cpuKeep = mode === 'cpu'; e.stoneCache.gens = new Map(); e.syncStones(app.doc, null); vp.frame();
		const still = []; for (let i = 0; i < steps; i++) { await drained(); const a = performance.now(); vp.frame(); still.push(performance.now() - a); }
		out[mode] = { frame: stats(still), move: await gesture('x', g.params.x ?? 0, 0.01), turn: await gesture('rotate', g.params.rotate ?? 0, 8), density: await gesture('density', (g.params.density ?? 1) - 0.2, 0.15), spacing: await gesture('gap', g.params.gap ?? 1.1, 0.02) };
	}
	globalThis.__cpuKeep = false; e.stoneCache.gens = new Map(); e.syncStones(app.doc, null);
	await wait(300);
	// the frame: wall time per frame rendered back to back, waiting for the GPU (not held to the screen's refresh), and the GPU's
	// own timer; then the GPU keep alone, every group run again back to back, waited for
	out.frameMs = await vp.benchmark(30); out.frameGpuMs = vp.lastGpuMs ?? null;
	const keepers = [...(e.stoneView.packView?.keepers.values() ?? [])].filter((K) => K.last), dev = vp.renderer.backend?.device;
	if (dev && keepers.length) {
		const t = performance.now();
		for (let i = 0; i < 20; i++) for (const K of keepers) K.run(K.last.p, K.last.out, K.last.outCap);
		await dev.queue.onSubmittedWorkDone();
		out.keepAllGroupsMs = +((performance.now() - t) / 20).toFixed(2);
	}
	out.count = e.stoneCount();
	return out;
}
