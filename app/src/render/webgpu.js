// The 3D view on three.js's WebGPURenderer (knowledge/product/roadmap/webgpu-and-stone-engine-plan.md, Phase 1): a second
// renderer path beside WebGL, chosen per page (?renderer=webgpu, or localStorage 'leotard.renderer' = 'webgpu'), so the two
// can be compared on one machine, scene and camera. The WebGL path stays untouched until parity is signed off.
// Here: the renderer and its tools (capture, benchmark, area lights); the post chain is render/webgpu-post.js.
import { WebGPURenderer, PMREMGenerator, RectAreaLightNode, RenderTarget, UnsignedByteType } from 'three/webgpu';
import { RectAreaLightTexturesLib } from 'three/addons/lights/RectAreaLightTexturesLib.js';
import { Refit } from '../fit/refit.js';

export const RENDERER = (() => {
	if (typeof location === 'undefined') return 'webgl'; // (tests)
	const q = new URLSearchParams(location.search).get('renderer');
	if (q) return q === 'webgpu' ? 'webgpu' : 'webgl';
	try { return localStorage.getItem('leotard.renderer') === 'webgpu' ? 'webgpu' : 'webgl'; } catch { return 'webgl'; }
})();

// The renderer and what the viewport needs set up around it. -> { renderer, pmrem, ready: Promise }. On WebGPU the renderer is
// made on the page's one device (fit/refit.js Refit.device: the re-fit's too, plan Phase 1 step 7); without WebGPU three's own
// WebGL 2 backend draws (the fallback, step 8), and so does ?forcewebgl.
export function createWebGPU() {
	// ?forcewebgl: the same node renderer on its WebGL 2 backend (tells three's node code apart from the WebGPU backend/driver)
	const forceWebGL = typeof location !== 'undefined' && new URLSearchParams(location.search).has('forcewebgl');
	const renderer = new WebGPURenderer({ antialias: false, powerPreference: 'high-performance', trackTimestamp: true, forceWebGL });
	const pmrem = new PMREMGenerator(renderer);
	const ready = (async () => {
		if (!forceWebGL && navigator.gpu) { try { renderer.backend.parameters.device = await Refit.device(); } catch (e) { console.warn('WebGPU device:', e.message); } }
		await renderer.init();
	})();
	return { renderer, pmrem, ready };
}

// GPU time of the frames rendered since the last call, ms (timestamp queries), or null where the adapter has none.
export async function gpuTime(renderer) {
	if (!renderer.hasFeature('timestamp-query')) return null;
	return (await renderer.resolveTimestampsAsync('render')) ?? null;
}

// A frame drawn into its own target and read back, as a PNG blob (w x h): a WebGPU canvas hands out only what it last showed on
// screen, which is stale while the pane is hidden. render: draws one frame into the current render target.
export async function captureFrame(renderer, w, h, render) {
	const rt = new RenderTarget(w, h, { type: UnsignedByteType, depthBuffer: true });
	try {
		renderer.setRenderTarget(rt);
		render();
		renderer.setRenderTarget(null);
		const px = await readPixels(renderer, rt, 0, 0, w, h);
		const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
		const img = cv.getContext('2d').createImageData(w, h);
		img.data.set(px);
		cv.getContext('2d').putImageData(img, 0, 0);
		return await new Promise((resolve) => cv.toBlob(resolve, 'image/png'));
	} finally { renderer.setRenderTarget(null); rt.dispose(); }
}

// A render target's pixels read back (WebGPU), rows top first and unpadded (WebGPU pads each row to 256 bytes): x, y, w, h in
// pixels from the top left. -> Uint8Array or Float32Array, as the target's type.
export async function readPixels(renderer, rt, x, y, w, h) {
	const px = await renderer.readRenderTargetPixelsAsync(rt, x, y, w, h), row = w * 4;
	// (elements a padded row: the 256-byte rule; the buffer's last row is not padded, so its length does not tell)
	const per = Math.ceil(row * px.BYTES_PER_ELEMENT / 256) * 256 / px.BYTES_PER_ELEMENT;
	if (per === row) return px.length === row * h ? px : px.subarray(0, row * h);
	const out = new px.constructor(row * h);
	for (let j = 0; j < h; j++) out.set(px.subarray(j * per, j * per + row), j * row);
	return out;
}

// Rect area lights' lookup tables (the softbox studio), as RectAreaLightUniformsLib.init() is for WebGL.
let ltc = false;
export function initAreaLights() { if (!ltc) { RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init()); ltc = true; } }

// Renders n frames back to back and waits for the GPU to finish them: -> { ms (wall time per frame), gpuMs (median GPU time of a
// frame, timestamp queries, or null) }. render: one frame. The GPU time is sampled a frame at a time (three resolves the last
// frame's queries only, from a pool of 256), with tracking off while the wall time is taken. The WebGPU twin of
// Viewport.benchmark's loop (render/viewport.js).
export async function benchmarkFrames(renderer, n, render) {
	const device = renderer.backend.device, track = renderer.backend.trackTimestamp;
	const run = async () => { for (let i = 0; i < n; i++) render(); await device.queue.onSubmittedWorkDone(); };
	renderer.backend.trackTimestamp = false;
	let ms;
	try {
		await run(); // warm up: compiles any pipeline not yet seen
		const t = performance.now();
		await run();
		ms = (performance.now() - t) / n;
	} finally { renderer.backend.trackTimestamp = track; }
	const g = [];
	if (track && renderer.hasFeature('timestamp-query')) {
		await gpuTime(renderer); // (clears what was pending)
		for (let i = 0; i < Math.min(n, 30); i++) { render(); const v = await gpuTime(renderer); if (v > 0) g.push(v); }
		g.sort((a, b) => a - b);
	}
	return { ms, gpuMs: g.length ? g[g.length >> 1] : null };
}
