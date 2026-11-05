// The stone engine's stress test (knowledge/product/roadmap/webgpu-and-stone-engine-plan.md, gates): Procedural Gem Test 3 with
// its flower of life hidden and a scatter (ss4, gap 1.1, Crystal AB) on every flattened piece: about 107 000 stones on the
// WebGPU view (the sleeves are a pair: their stones count twice). Run in the test tab only (port 5176: it loads a design):
//   const S = await import('/src/dev/stone-stress.js'); await S.stressLoad(); await S.stressTime()
// stressTime measures the CPU's work per edit step (the edit and one Viewport.frame, synchronous: right whether or not the pane
// is shown), median and 90th percentile over 30 steps of one gesture, for the biggest group, with the GPU keep and with its CPU
// twin (window.__cpuKeep).

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
	return { panels, count: e.stoneCount(), groups: e.stoneRun.packs.map((p) => ({ gen: p.gen, gpu: !!p.gpu, candidates: p.gpu?.statics.n, count: p.count })) };
}

export async function stressTime({ modes = ['gpu', 'cpu'], steps = 30 } = {}) {
	const S = await state(), app = window.app, e = app.engine, vp = e.viewport;
	const big = [...e.stoneRun.packs].sort((a, b) => (b.gpu?.statics.n ?? b.k.n) - (a.gpu?.statics.n ?? a.k.n))[0], id = big.gen, g = app.doc.stones.find((x) => x.id === id);
	S.layout.value = '3d';
	const g0 = { ...g.params }; // (each gesture puts its value back as it was)
	const stats = (w) => { w.sort((p, q) => p - q); return { median: +w[w.length >> 1].toFixed(1), p90: +w[Math.floor(w.length * 0.9)].toFixed(1) }; };
	const gesture = (key, base, amp) => {
		const w = [];
		for (let i = 0; i < steps; i++) { const a = performance.now(); S.edit(app, { op: 'stones.set', id, params: { [key]: base + amp * Math.sin(i / 4) }, gesture: 'stress' }); vp.frame(); w.push(performance.now() - a); }
		app.endGesture(); S.edit(app, { op: 'stones.set', id, params: { [key]: g0[key] } }); vp.frame();
		return stats(w);
	};
	const out = { group: id, hidden: document.hidden };
	for (const mode of modes) {
		globalThis.__cpuKeep = mode === 'cpu'; e.stoneCache.gens = new Map(); e.syncStones(app.doc, null); vp.frame();
		const still = []; for (let i = 0; i < steps; i++) { const a = performance.now(); vp.frame(); still.push(performance.now() - a); }
		out[mode] = { frame: stats(still), move: gesture('x', g.params.x ?? 0, 0.01), turn: gesture('rotate', g.params.rotate ?? 0, 8), density: gesture('density', (g.params.density ?? 1) - 0.2, 0.15), spacing: gesture('gap', g.params.gap ?? 1.1, 0.02) };
	}
	globalThis.__cpuKeep = false; e.stoneCache.gens = new Map(); e.syncStones(app.doc, null);
	await wait(300);
	// the frame: wall time per frame rendered back to back, waiting for the GPU (not held to the screen's refresh), and the GPU's
	// own timer; then the GPU keep alone, every group run again back to back, waited for
	out.frameMs = await vp.benchmark(30); out.frameGpuMs = vp.lastGpuMs ?? null;
	const keepers = [...(e.stoneView.packView?.keepers.values() ?? [])].filter((K) => K.last), dev = vp.renderer.backend?.device;
	if (dev && keepers.length) {
		const t = performance.now();
		for (let i = 0; i < 20; i++) for (const K of keepers) K.run(K.last.p, K.last.out);
		await dev.queue.onSubmittedWorkDone();
		out.keepAllGroupsMs = +((performance.now() - t) / 20).toFixed(2);
	}
	out.count = e.stoneCount();
	return out;
}
