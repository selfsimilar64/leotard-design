// In-app timing of stone-pattern edits (2026-11-04). Paste into the console of the test tab (port 5176, its own storage:
// it loads a design and edits it), with the preview pane shown and this tab in front (a hidden tab's frames stop).
// Measures WORK per step, not the gap between frames (at 60 Hz any step that fits reads 16.7 ms): the edit's own time plus
// Viewport.frame, timed by a wrapper (stones laid, both views painted, the 3D frame submitted). GPU time is separate:
// Viewport.benchmark(n) renders back to back and waits for the GPU each time.
//
//   await benchLoad('Procedural Gem Test 3');
//   const r = await benchScale([['ss4', 0.037], ['ss3', 0.016], ['ss3', 0.011]]);   // [size, spacing] of group g13
//   app.engine.stoneCtx.peaks = true; app.engine.stoneCache.gens = new Map(); app.engine.syncStones(app.doc, null);
window.benchLoad = async (name) => {
	const d = await fetch('/designs/' + encodeURIComponent(name) + '.json').then((r) => r.json());
	app.load(d);
	await new Promise((r) => setTimeout(r, 7000));
};
window.benchScale = async (levels, group = 'g13') => {
	// the page's own copy of the UI state (after a hot reload a plain import can give a second one)
	const u = performance.getEntriesByType('resource').map((r) => r.name).find((n) => /ui\/state\.js/.test(n));
	const S = await import(u.replace(location.origin, ''));
	const e = app.engine, vp = e.viewport, raf = () => new Promise((r) => requestAnimationFrame(r)), frames = async (n) => { for (let i = 0; i < n; i++) await raf(); };
	if (!vp.__wrapped) { const f0 = vp.frame.bind(vp); vp.frame = () => { const t = performance.now(); f0(); vp.__last = performance.now() - t; }; vp.__wrapped = true; }
	S.selection.value = { kind: 'stones', id: group };
	const g = app.doc.stones.find((x) => x.id === group), P0 = { size: g.params.size, spacing: g.params.spacing, x: g.params.x };
	const med = (a) => { const s = [...a].sort((p, q) => p - q); return +s[s.length >> 1].toFixed(1); };
	const p90 = (a) => { const s = [...a].sort((p, q) => p - q); return +s[Math.floor(s.length * 0.9)].toFixed(1); };
	// one edit a frame inside one gesture, as a handle drag sends them
	const drag = async (key, amp, base, n = 20) => {
		const work = [], gaps = [];
		let t = performance.now();
		for (let i = 0; i < n; i++) {
			const a = performance.now();
			S.edit(app, { op: 'stones.set', id: group, params: { [key]: base + amp * Math.sin(i / 4) }, gesture: 'bench' });
			const ed = performance.now() - a;
			await raf();
			work.push(ed + (vp.__last ?? 0));
			const now = performance.now(); gaps.push(now - t); t = now;
		}
		app.endGesture();
		S.edit(app, { op: 'stones.set', id: group, params: { [key]: base } });
		await frames(5);
		return { work: med(work), work90: p90(work), fps: +(1000 / med(gaps)).toFixed(0) };
	};
	const out = [];
	for (const [size, spacing] of levels) {
		S.edit(app, { op: 'stones.set', id: group, params: { size, spacing } });
		S.layout.value = '3d'; await frames(40);
		const count = e.stoneRun.count ?? e.stoneRun.stones.length, gpuFrame = +vp.benchmark(10).toFixed(1);
		S.layout.value = 'split'; await frames(30);
		out.push({ size, spacing, count, gpuFrame, move: await drag('x', 0.01, P0.x), spacing_: await drag('spacing', spacing * 0.02, spacing) });
	}
	S.edit(app, { op: 'stones.set', id: group, params: P0 });
	await frames(10);
	return { hidden: document.hidden, out };
};
