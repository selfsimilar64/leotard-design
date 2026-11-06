// GPU time of each step of one 3D frame, on either renderer, to find where the WebGPU view spends more than the WebGL one
// (knowledge/engineering/rendering/webgpu-port.md, "Frame cost against WebGL"). Run in the test tab (port 5176):
//   const T = await import('/src/dev/pass-times.js'); await T.passTimes()          // on whichever renderer the page runs
// WebGPU: every render and compute pass the frame encodes gets timestamp writes of its own (GPUCommandEncoder patched while
// measuring; three's own timestamp tracking off meanwhile), reported in order with its target (size, format, samples) and
// three's command-encoder label. WebGL: each composer pass (and the shadow maps, and the scene pass's copy) inside a
// TIME_ELAPSED query (EXT_disjoint_timer_query_webgl2; queries cannot nest, so a query is switched, not nested).
// Medians over `frames` frames at the gates' size (1792 x 1344), the GPU drained between frames.

// (SIZE may be changed from the console, e.g. SIZE.width = 64; SIZE.height = 48, to leave the vertex work alone)
const BENCH = { width: 1792, height: 1344 };
export const SIZE = { ...BENCH };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null; };

function atSize(vp, run) {
	const r = vp.renderer, cam = vp.camera, aspect = cam.aspect;
	r.setPixelRatio(1); r.setSize(SIZE.width, SIZE.height, false);
	if (!vp.webgpu) { vp.composer.setPixelRatio(1); vp.composer.setSize(SIZE.width, SIZE.height); vp.bloom.setSize(SIZE.width / 2, SIZE.height / 2); }
	cam.aspect = SIZE.width / SIZE.height; cam.updateProjectionMatrix();
	const done = () => { cam.aspect = aspect; vp.resize(); };
	return Promise.resolve().then(run).finally(done);
}

export async function passTimes(frames = 24) {
	const vp = window.app.engine.viewport;
	await vp.ready;
	if (document.hidden) console.warn('pass-times: the page is hidden; timings may be throttled');
	return vp.webgpu ? webgpuPasses(vp, frames) : webglPasses(vp, frames);
}

// The CPU's own time to issue one frame (Viewport.render, nothing waited for inside it), the GPU drained before each frame so
// no wait for earlier frames lands in it; and the wall time until that frame is finished. Medians, ms.
export async function cpuTimes(frames = 40) {
	const vp = window.app.engine.viewport;
	await vp.ready;
	const gl = vp.webgpu ? null : vp.renderer.getContext(), px = new Uint8Array(4);
	const drain = vp.webgpu ? () => vp.renderer.backend.device.queue.onSubmittedWorkDone() : () => { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
	const cpu = [], wall = [];
	await atSize(vp, async () => {
		for (let f = 0; f < frames + 5; f++) {
			await drain();
			const t0 = performance.now();
			vp.rig.rotation.y += 0.01;
			vp.render();
			const t1 = performance.now();
			await drain();
			const t2 = performance.now();
			if (f >= 5) { cpu.push(t1 - t0); wall.push(t2 - t0); }
		}
	});
	return { renderer: vp.webgpu ? 'webgpu' : 'webgl', cpu: +median(cpu).toFixed(2), wall: +median(wall).toFixed(2) };
}

// One round of the A/B: Gem Test 3 (or `design`) opened and settled, then Viewport.benchmark three times (wall per frame,
// frames back to back; GPU ms where the renderer reports it), cpuTimes and passTimes' total. Same calls on either renderer.
export async function round(design = 'Procedural Gem Test 3') {
	const app = window.app, vp = app.engine.viewport;
	await vp.ready;
	if (app.doc.meta.name !== design) { await app.open(design); await wait(8000); }
	const bench = [];
	for (let k = 0; k < 3; k++) {
		const ms = await vp.benchmark(60, BENCH);
		bench.push(+ms.toFixed(2));
	}
	const c = await cpuTimes(), p = await passTimes().catch(() => null); // (no timestamp queries: e.g. Dawn's D3D11 backend)
	return { renderer: c.renderer, hidden: document.hidden, bench, cpu: c.cpu, wallDrained: c.wall, gpuPassSum: p?.total ?? null, gpuMs: vp.lastGpuMs ?? null };
}

// The whole frame's GPU time where a GL context draws (the WebGL view, or the node renderer on its WebGL 2 backend: ?renderer=webgpu
// &forcewebgl), one TIME_ELAPSED query around Viewport.render; with the stones shown and hidden. Tells three's node shaders (TSL)
// apart from the WebGPU API and driver: the same node materials, drawn through ANGLE as the WebGL view is.
export async function glFrame(frames = 30) {
	const app = window.app, vp = app.engine.viewport, r = vp.renderer;
	await vp.ready;
	const gl = vp.webgpu ? r.backend.gl : r.getContext(), ext = gl?.getExtension('EXT_disjoint_timer_query_webgl2');
	if (!ext) throw new Error('no GL timer');
	const one = async () => {
		const out = [];
		await atSize(vp, async () => {
			for (let f = 0; f < frames + 4; f++) {
				const q = gl.createQuery();
				gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
				vp.rig.rotation.y += 0.01; vp.render();
				gl.endQuery(ext.TIME_ELAPSED_EXT);
				gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
				const t0 = performance.now();
				while (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE) && performance.now() - t0 < 2000) await wait(4);
				if (f >= 4 && !gl.getParameter(ext.GPU_DISJOINT_EXT)) out.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
				gl.deleteQuery(q);
			}
		});
		return +median(out).toFixed(3);
	};
	const S = await import(performance.getEntriesByType('resource').map((x) => x.name).find((n) => /ui\/state\.js/.test(n)).replace(location.origin, ''));
	const ids = app.doc.stones.filter((g) => !g.hidden).map((g) => g.id);
	const shown = await one();
	for (const id of ids) S.edit(app, { op: 'stones.set', id, hidden: true });
	await wait(1500);
	const hidden = await one();
	for (const id of ids) S.edit(app, { op: 'stones.set', id, hidden: false });
	await wait(1500);
	return { backend: vp.webgpu ? 'node renderer, WebGL 2 backend' : 'WebGL view', shown, hidden };
}

// The scene pass's GPU time with each part of the scene hidden in turn (each drawable child of the scene and of `world`, and the
// background), against all shown: what each part costs. -> { all, parts: [{ name, ms (the scene pass with it hidden), cost }] }
export async function sceneParts(frames = 20) {
	const vp = window.app.engine.viewport, sc = vp.scene;
	const scene = async () => { const o = await passTimes(frames); return o.renderer === 'webgpu' ? o.passes.reduce((m, p) => (p.ms > m.ms ? p : m)).ms : o.passes.find((p) => p.name === '0 ScenePass (rest)').ms; };
	const drawable = (o) => { let n = 0; o.traverse((c) => { if (c.isMesh || c.isPoints || c.isLine || c.isSprite) n++; }); return n; };
	const nameOf = (o) => {
		const mats = new Map();
		o.traverse((c) => { if (c.visible && c.material) { const t = (c.name ? c.name + ':' : '') + (c.material.name || c.material.type); mats.set(t, (mats.get(t) ?? 0) + 1); } });
		return (o.name || `${o.type}#${o.id}`) + ' [' + [...mats].slice(0, 5).map(([k, n]) => (n > 1 ? n + 'x ' : '') + k).join(', ') + ']';
	};
	const kids = [...sc.children.filter((c) => c !== vp.world), ...vp.world.children].filter((c) => c.visible && drawable(c));
	// each part's cost paired with an all-shown timing taken beside it, three times (the GPU's clock wanders between runs)
	const paired = async (hide, show) => {
		const d = [];
		for (let k = 0; k < 3; k++) { const a = await scene(); hide(); const b = await scene(); show(); d.push(a - b); }
		return +median(d).toFixed(3);
	};
	const parts = [];
	for (const k of kids) parts.push({ name: nameOf(k), meshes: drawable(k), cost: await paired(() => { k.visible = false; }, () => { k.visible = true; }) });
	const bg = sc.background;
	parts.push({ name: 'background', cost: await paired(() => { sc.background = null; }, () => { sc.background = bg; }) });
	return { renderer: vp.webgpu ? 'webgpu' : 'webgl', all: await scene(), parts };
}

// WebGPU: the frame with the stones kept on the GPU (their instance data read from storage buffers by instance index) against
// the CPU twin keeping them (the same stones as instanced vertex attributes, window.__cpuKeep), alternated `rounds` times.
export async function keepSplit(rounds = 2) {
	const app = window.app, e = app.engine, vp = e.viewport, out = [];
	const mode = async (cpu) => {
		globalThis.__cpuKeep = cpu; e.stoneCache.gens = new Map(); e.syncStones(app.doc, null); vp.frame();
		await wait(4000);
		const p = await passTimes(20), scene = p.passes.reduce((m, x) => (x.ms > m.ms ? x : m)).ms;
		return { keep: cpu ? 'cpu' : 'gpu', drawn: e.stoneCount?.(), total: p.total, scene, bench: +(await vp.benchmark(60, SIZE)).toFixed(2) };
	};
	try { for (let k = 0; k < rounds; k++) { out.push(await mode(false)); out.push(await mode(true)); } } finally { await mode(false); }
	return out;
}

// The scene pass's GPU time with each stone group shown and hidden (the design's other parts unchanged), to tell the stones'
// share from the rest. -> { shown, hidden } as passTimes' scene pass ms (WebGPU: pass 0; WebGL: ScenePass less its copy).
export async function sceneSplit(frames = 30) {
	const app = window.app, S = await import(performance.getEntriesByType('resource').map((r) => r.name).find((n) => /ui\/state\.js/.test(n)).replace(location.origin, ''));
	const scene = (o) => (o.renderer === 'webgpu' ? o.passes.reduce((m, p) => (p.ms > m.ms ? p : m)).ms : o.passes.find((p) => p.name === '0 ScenePass (rest)').ms);
	const ids = app.doc.stones.filter((g) => !g.hidden).map((g) => g.id);
	const shown = await passTimes(frames);
	for (const id of ids) S.edit(app, { op: 'stones.set', id, hidden: true });
	await wait(1500);
	const hidden = await passTimes(frames);
	for (const id of ids) S.edit(app, { op: 'stones.set', id, hidden: false });
	await wait(1500);
	return { renderer: shown.renderer, shown: scene(shown), hidden: scene(hidden), totalShown: shown.total, totalHidden: hidden.total };
}

// Where the CPU's time of a WebGPU frame goes: named functions wrapped with timers (self time is not separated: a wrapped
// function's time includes the wrapped ones it calls). -> { name: median ms a frame, calls a frame }
export async function cpuSplit(frames = 40) {
	const vp = window.app.engine.viewport, r = vp.renderer, post = vp.composer, be = r.backend;
	await vp.ready;
	const acc = new Map(), undo = [];
	const wrap = (obj, key, name) => {
		const f = obj?.[key];
		if (typeof f !== 'function') return;
		const own = Object.prototype.hasOwnProperty.call(obj, key);
		obj[key] = function (...a) { const t = performance.now(); try { return f.apply(this, a); } finally { const e = acc.get(name) ?? (acc.set(name, { ms: 0, n: 0 }), acc.get(name)); e.ms += performance.now() - t; e.n++; } };
		undo.push(() => { if (own) obj[key] = f; else delete obj[key]; });
	};
	wrap(vp, 'render', 'Viewport.render (all)');
	wrap(post, 'render', 'NodePost.render'); // (Viewport.render less this: syncFabricPacks and info.reset)
	wrap(r, 'render', 'renderer.render (scene + quads)');
	wrap(post.pipeline, 'render', 'RenderPipeline.render');
	wrap(r._nodes?.nodeFrame, 'update', 'nodeFrame.update');
	wrap(r, '_renderObjectDirect', 'renderer._renderObjectDirect');
	wrap(r, '_projectObject', 'renderer._projectObject');
	wrap(r._objects, 'get', 'renderObjects.get');
	wrap(r._nodes, 'updateForRender', 'nodes.updateForRender');
	wrap(r._nodes, 'updateBefore', 'nodes.updateBefore');
	wrap(r._nodes, 'updateAfter', 'nodes.updateAfter');
	wrap(r._bindings, 'updateForRender', 'bindings.updateForRender');
	wrap(r._pipelines, 'getForRender', 'pipelines.getForRender');
	wrap(r._geometries, 'updateForRender', 'geometries.updateForRender');
	wrap(be, 'draw', 'backend.draw');
	wrap(be, 'beginRender', 'backend.beginRender');
	wrap(be, 'finishRender', 'backend.finishRender');
	wrap(be, 'updateBinding', 'backend.updateBinding');
	wrap(be.device.queue, 'writeBuffer', 'queue.writeBuffer');
	wrap(be.device.queue, 'submit', 'queue.submit');
	wrap(r.shadowMap ?? {}, 'render', 'shadowMap.render');
	const per = [];
	try {
		await atSize(vp, async () => {
			for (let f = 0; f < frames + 5; f++) {
				await be.device.queue.onSubmittedWorkDone();
				acc.clear();
				vp.rig.rotation.y += 0.01;
				vp.render();
				if (f >= 5) per.push(new Map([...acc].map(([k, v]) => [k, { ...v }])));
			}
		});
	} finally { for (const u of undo.reverse()) u(); }
	const out = {};
	for (const k of new Set(per.flatMap((m) => [...m.keys()]))) out[k] = { ms: +median(per.map((m) => m.get(k)?.ms ?? 0)).toFixed(3), calls: median(per.map((m) => m.get(k)?.n ?? 0)) };
	return out;
}

async function webgpuPasses(vp, frames) {
	const r = vp.renderer, dev = r.backend.device, N = 4096, U = GPUBufferUsage;
	if (!dev.features.has('timestamp-query')) throw new Error('no timestamp-query');
	const qs = dev.createQuerySet({ type: 'timestamp', count: N });
	const res = dev.createBuffer({ size: N * 8, usage: U.QUERY_RESOLVE | U.COPY_SRC });
	const rd = dev.createBuffer({ size: N * 8, usage: U.MAP_READ | U.COPY_DST });
	// which texture a view is of (views made while measuring; three makes its attachment views each pass)
	const texOf = new WeakMap(), TP = GPUTexture.prototype, cv = TP.createView;
	TP.createView = function (d) { const v = cv.call(this, d); texOf.set(v, this); return v; };
	const E = GPUCommandEncoder.prototype, brp = E.beginRenderPass, bcp = E.beginComputePass;
	let rec = null;
	const slot = (desc) => { const i = rec.length; if (i * 2 + 2 > N) return null; rec.push(desc); return { querySet: qs, beginningOfPassWriteIndex: i * 2, endOfPassWriteIndex: i * 2 + 1 }; };
	E.beginRenderPass = function (d) {
		if (rec && !d.timestampWrites) {
			const a = d.colorAttachments?.[0], t = a?.view && texOf.get(a.view), z = d.depthStencilAttachment?.view && texOf.get(d.depthStencilAttachment.view);
			const tw = slot({ kind: 'render', enc: this.label, pass: d.label ?? '', target: t ? `${t.width}x${t.height} ${t.format}${t.sampleCount > 1 ? ' x' + t.sampleCount : ''}` : (a ? '(view ' + (a.view.label || '?') + ')' : 'none'),
				resolve: !!a?.resolveTarget, depth: z ? `${z.format}${z.sampleCount > 1 ? ' x' + z.sampleCount : ''}` : d.depthStencilAttachment ? '?' : '', load: a?.loadOp ?? '', n: d.colorAttachments?.length ?? 0 });
			if (tw) d = { ...d, timestampWrites: tw };
		}
		return brp.call(this, d);
	};
	E.beginComputePass = function (d = {}) {
		if (rec && !d.timestampWrites) { const tw = slot({ kind: 'compute', enc: this.label, pass: d.label ?? '' }); if (tw) d = { ...d, timestampWrites: tw }; }
		return bcp.call(this, d);
	};
	const track = r.backend.trackTimestamp;
	r.backend.trackTimestamp = false;
	const runs = [];
	try {
		await atSize(vp, async () => {
			for (let f = 0; f < frames + 4; f++) {
				rec = [];
				vp.rig.rotation.y += 0.01;
				vp.render();
				const list = rec; rec = null;
				const enc = dev.createCommandEncoder();
				if (list.length) { enc.resolveQuerySet(qs, 0, list.length * 2, res, 0); enc.copyBufferToBuffer(res, 0, rd, 0, list.length * 16); }
				dev.queue.submit([enc.finish()]);
				await rd.mapAsync(GPUMapMode.READ, 0, Math.max(16, list.length * 16));
				const T = new BigInt64Array(rd.getMappedRange(0, Math.max(16, list.length * 16)).slice(0));
				rd.unmap();
				if (f >= 4) runs.push(list.map((d, i) => ({ ...d, ms: Number(T[i * 2 + 1] - T[i * 2]) / 1e6, at: Number(T[i * 2] - T[0]) / 1e6 })));
			}
		});
	} finally {
		E.beginRenderPass = brp; E.beginComputePass = bcp; TP.createView = cv; r.backend.trackTimestamp = track;
		qs.destroy(); res.destroy(); rd.destroy();
	}
	// passes by their place in the frame (the sequence is the same frame to frame)
	const n = median(runs.map((x) => x.length)), same = runs.filter((x) => x.length === n);
	const passes = same[0].map((d, i) => ({ i, kind: d.kind, enc: d.enc, target: d.target, depth: d.depth, resolve: d.resolve, load: d.load, n: d.n,
		ms: +median(same.map((x) => x[i].ms)).toFixed(3), at: +median(same.map((x) => x[i].at)).toFixed(3) }));
	const span = median(same.map((x) => { const l = x[x.length - 1]; return l.at + l.ms; }));
	return { renderer: 'webgpu', frames: same.length, total: +passes.reduce((s, p) => s + p.ms, 0).toFixed(3), span: +span.toFixed(3), passes };
}

async function webglPasses(vp, frames) {
	const r = vp.renderer, gl = r.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
	if (!ext) throw new Error('no EXT_disjoint_timer_query_webgl2');
	let cur = null, list = null;
	const sw = (name) => {
		if (!list) return;
		if (cur) gl.endQuery(ext.TIME_ELAPSED_EXT);
		cur = name;
		if (name) { const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); list.push([name, q]); }
	};
	const undo = [];
	const wrap = (obj, key, name, after = null) => {
		const f = obj[key];
		obj[key] = function (...a) { const prev = cur; sw(name); const out = f.apply(this, a); if (after !== null) sw(after === true ? prev + ' (rest)' : after); return out; };
		undo.push(() => { obj[key] = f; });
	};
	vp.composer.passes.forEach((p, i) => { if (p.enabled) wrap(p, 'render', `${i} ${p.constructor.name}`); });
	wrap(r.shadowMap, 'render', 'shadow maps', true);
	if (vp.scenePass?.copy) wrap(vp.scenePass.copy, 'render', 'ScenePass copy');
	const runs = [];
	try {
		await atSize(vp, async () => {
			for (let f = 0; f < frames + 4; f++) {
				list = []; cur = null;
				vp.rig.rotation.y += 0.01;
				vp.render();
				sw(null);
				const mine = list; list = null;
				gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
				const t0 = performance.now();
				while (!gl.getQueryParameter(mine[mine.length - 1][1], gl.QUERY_RESULT_AVAILABLE) && performance.now() - t0 < 2000) await wait(4);
				const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
				const row = mine.map(([name, q]) => ({ name, ms: gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6 }));
				for (const [, q] of mine) gl.deleteQuery(q);
				if (f >= 4 && !disjoint) runs.push(row);
			}
		});
	} finally { for (const u of undo) u(); }
	const n = median(runs.map((x) => x.length)), same = runs.filter((x) => x.length === n);
	const passes = same[0].map((d, i) => ({ i, name: d.name, ms: +median(same.map((x) => x[i].ms)).toFixed(3) }));
	return { renderer: 'webgl', frames: same.length, total: +passes.reduce((s, p) => s + p.ms, 0).toFixed(3), passes };
}
