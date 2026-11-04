// The 3D view on three.js's WebGPURenderer (knowledge/product/roadmap/webgpu-and-stone-engine-plan.md, Phase 1): a second
// renderer path beside WebGL, chosen per page (?renderer=webgpu, or localStorage 'leotard.renderer' = 'webgpu'), so the two
// can be compared on one machine, scene and camera. The WebGL path stays untouched until parity is signed off.
// Here: the renderer, its post chain (RenderPipeline) and stand-ins for the WebGL passes the rest of the app talks to
// (render/viewport.js: composer, scenePass, skinPass, aoPass, bloom, glare), filled in step by step as each is ported.
import { WebGPURenderer, RenderPipeline, PMREMGenerator, RectAreaLightNode, RenderTarget, UnsignedByteType } from 'three/webgpu';
import { RectAreaLightTexturesLib } from 'three/addons/lights/RectAreaLightTexturesLib.js';
import { pass } from 'three/tsl';

export const RENDERER = (() => {
	if (typeof location === 'undefined') return 'webgl'; // (tests)
	const q = new URLSearchParams(location.search).get('renderer');
	if (q) return q === 'webgpu' ? 'webgpu' : 'webgl';
	try { return localStorage.getItem('leotard.renderer') === 'webgpu' ? 'webgpu' : 'webgl'; } catch { return 'webgl'; }
})();

// The renderer and what the viewport needs set up around it. -> { renderer, pmrem, ready: Promise }
export function createWebGPU() {
	const renderer = new WebGPURenderer({ antialias: false, powerPreference: 'high-performance', trackTimestamp: true });
	const pmrem = new PMREMGenerator(renderer);
	return { renderer, pmrem, ready: renderer.init() };
}

// The post chain: the scene pass, then (as ported) skin, contact shadows, bloom and glare; tone mapping and the output
// colour space at the end (the renderer's toneMapping, as OutputPass did). Answers what viewport.js asks of the
// EffectComposer.
export class NodePost {
	constructor(renderer, scene, camera) {
		this.renderer = renderer;
		this.pipeline = new RenderPipeline(renderer);
		this.scenePass = pass(scene, camera);
		this.pipeline.outputNode = this.scenePass;
		this.passes = [];
	}
	addPass(p) { this.passes.push(p); } // (the hover outline: not ported yet)
	setPixelRatio() {}
	setSize() {}
	// every call a new frame: passes re-render once per frame, and the frame count advances only in the animation loop, which
	// captures and benchmarks run outside of (and which stops while the pane is hidden)
	render() { this.renderer._nodes.nodeFrame.update(); this.pipeline.render(); }
}

// Stand-ins for the WebGL passes not yet ported: the settings land on them and do nothing.
export const stubPasses = () => ({
	scenePass: { setSamples() {}, keepSkinMark: false },
	skinPass: { enabled: false },
	aoPass: { enabled: false },
	bloom: { strength: 0, enabled: false, setSize() {} },
	glare: { setPreset() {} },
});

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
		const px = await renderer.readRenderTargetPixelsAsync(rt, 0, 0, w, h), row = w * 4;
		const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
		const img = cv.getContext('2d').createImageData(w, h), stride = Math.ceil(row / 256) * 256; // (rows come padded to 256 bytes)
		for (let y = 0; y < h; y++) img.data.set(px.subarray(y * stride, y * stride + row), y * row);
		cv.getContext('2d').putImageData(img, 0, 0);
		return await new Promise((resolve) => cv.toBlob(resolve, 'image/png'));
	} finally { renderer.setRenderTarget(null); rt.dispose(); }
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
