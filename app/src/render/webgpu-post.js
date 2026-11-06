// The post chain on the WebGPU renderer (knowledge/product/roadmap/webgpu-and-stone-engine-plan.md Phase 1 step 4): the twin of
// the WebGL composer in render/viewport.js, pass for pass and in the same order: the scene (multisampled on request,
// render/postfx.js ScenePass), skin scattering (postfx.js SkinPass), contact shadows (postfx.js AOPass, three's GTAO), glow
// (UnrealBloomPass), star glare (render/glare.js GlarePass) and the output (tone mapping, sRGB: the renderer's, as OutputPass).
// A change to a pass on one side is a change to its twin here.
// NodePost answers what viewport.js asks of the EffectComposer and its passes (scenePass.setSamples / keepSkinMark,
// skinPass.enabled, aoPass.enabled, bloom.strength / enabled / setSize, glare.setPreset, addPass for the hover outline).
import * as THREE from 'three';
import { RenderPipeline, RenderTarget, QuadMesh, NodeMaterial } from 'three/webgpu';
import {
	Fn, If, Loop, uniform, uv, vec2, vec3, vec4, float, abs, exp, max, mix, perspectiveDepthToViewZ,
	convertToTexture, rtt, renderOutput, ivec2, screenCoordinate, texture, textureLoad,
} from 'three/tsl';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { denoise } from 'three/addons/tsl/display/DenoiseNode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { SKIN_ALPHA } from './postfx.js';
import { GLARE } from './glare.js';

// --- postfx.js SkinPass's blur (blurShader), one direction: skin pixels (alpha SKIN_ALPHA) blurred from skin pixels only, red
// widest, not across depth steps; `last` clears the skin mark
function skinBlur(src, depth, dir, last, U) {
	return Fn(() => {
		const st = uv();
		const c0 = src.sample(st).toVar();
		const out = vec4(c0.rgb, last ? float(1) : c0.a).toVar();
		const isSkin = (a) => abs(a.sub(SKIN_ALPHA)).lessThan(0.02);
		// (the scene camera's near and far as uniforms, as the WebGL pass: in a full-screen pass cameraNear / cameraFar are the
		// quad's own camera's)
		const viewZ = (p) => perspectiveDepthToViewZ(depth.sample(p).x, U.near, U.far).negate();
		If(isSkin(c0.a), () => {
			const z0 = viewZ(st).toVar();
			const r = U.width.mul(U.pxPerM).div(max(z0, 1e-3)).toVar(); // kernel radius in pixels: uWidth metres at this depth
			If(r.greaterThanEqual(0.6), () => {
				const sigma = vec3(1, 0.3, 0.18).mul(r).toVar();
				const sum = c0.rgb.toVar(), wsum = vec3(1).toVar();
				Loop({ start: -4, end: 4, condition: '<=', name: 'k' }, ({ k }) => {
					If(k.notEqual(0), () => {
						const t = float(k).div(4).mul(2).mul(r);
						const p = st.add(dir.mul(U.texel).mul(t));
						const c = src.sample(p);
						If(isSkin(c.a), () => {
							const dz = abs(viewZ(p).sub(z0));
							const wz = exp(dz.mul(dz).negate().div(U.width.mul(U.width).mul(4)));
							const w = exp(vec3(t.mul(t).mul(-0.5)).div(sigma.mul(sigma))).mul(wz);
							sum.addAssign(c.rgb.mul(w)); wsum.addAssign(w);
						});
					});
				});
				out.assign(vec4(mix(c0.rgb, sum.div(wsum), U.strength), out.a));
			});
		});
		return out;
	})();
}

// --- glare.js GlarePass: the brightest glints at quarter resolution, streaked along the preset's rays (two Kawase passes each)
const glareBright = (src, U) => Fn(() => {
	const st = uv(), t = U.texel, at = (x, y) => src.sample(st.add(t.mul(vec2(x, y)))).rgb;
	const c0 = max(max(at(-1, -1), at(1, -1)), max(at(-1, 1), at(1, 1)));
	const ring = at(-6, 0).add(at(6, 0)).add(at(0, -6)).add(at(0, 6)).mul(0.25);
	const c = max(c0.sub(ring.mul(1.1)), 0).toVar();
	const l = max(c.r, max(c.g, c.b));
	return vec4(c.mul(max(l.sub(U.threshold), 0)).div(max(l, 1e-4)), 1);
})();
const glareStreak = (src, dir, b, atten) => Fn(() => {
	const s = vec3(0).toVar(), ws = float(0).toVar();
	for (let i = 0; i < 6; i++) { const w = Math.pow(atten, b * i); s.addAssign(src.sample(uv().add(dir.mul(b * i))).rgb.mul(w)); ws.addAssign(w); }
	return vec4(s.div(ws), 1);
})();

export class NodePost {
	constructor(renderer, scene, camera) {
		this.renderer = renderer; this.scene = scene; this.camera = camera;
		this.pipeline = new RenderPipeline(renderer);
		this.passes = [];
		this.samples = 0;
		this.U = { texel: uniform(new THREE.Vector2()), pxPerM: uniform(1), width: uniform(0.0015), strength: uniform(0.6), near: uniform(0.01), far: uniform(40) };
		this.bloomStrength = uniform(0.18);
		this.glareU = { texel: uniform(new THREE.Vector2()), threshold: uniform(2), strength: uniform(0), dirs: [] };
		const post = this, dirty = () => { post.dirty = true; };
		// the passes' switches, as viewport.js sets them on the WebGL passes
		this.scenePass = { setSamples(n) { if (post.samples !== n) { post.samples = n; dirty(); } }, set keepSkinMark(v) { /* (the skin pass clears the mark) */ } };
		this.skinPass = { _on: true, get enabled() { return this._on; }, set enabled(v) { if (this._on !== v) { this._on = v; dirty(); } } };
		this.aoPass = { _on: true, get enabled() { return this._on; }, set enabled(v) { if (this._on !== v) { this._on = v; dirty(); } } };
		this.bloom = { strength: 0.18, _on: true, get enabled() { return this._on; }, set enabled(v) { if (this._on !== v) { this._on = v; dirty(); } }, setSize() {} };
		this.glare = { preset: null, size: 1, strength: 1,
			setPreset(name, { size = 1, strength = 1 } = {}) { const p = GLARE[name] ?? null; if (p !== this.preset || (strength > 0) !== (this.strength > 0)) dirty(); this.preset = p; this.size = size; this.strength = strength; },
			get enabled() { return !!this.preset && this.strength > 0; } };
		this.dirty = true;
	}

	addPass(p) { this.passes.push(p); this.dirty = true; } // (the hover outline: render/outline-node.js, after the tone mapping)
	setPixelRatio() {}
	setSize() {}

	// The scene, its resolved depth and the skin pass are drawn here into targets of their own, in order (as the WebGL
	// EffectComposer's passes): three's intermediate-texture nodes render once a frame in an order of their own, and the skin
	// pass's first half, so made, blurred an old frame. The node chain (contact shadows, glow, glare, output) then reads them.
	// It is rebuilt when a pass is switched on or off, MSAA changes or the glare preset does.
	build() {
		this.dirty = false;
		const { camera, U } = this;
		const T = this.targets ??= this.makeTargets();
		T.scene.samples = this.samples; T.scene.dispose();
		const colour = texture(T.scene.texture), depth = this.samples > 0 ? texture(T.depth.texture) : texture(T.scene.depthTexture);
		T.resolve.fragmentNode = this.samples > 0 ? Fn(() => vec4(textureLoad(texture(T.scene.depthTexture), ivec2(screenCoordinate.xy)).x, 0, 0, 1))() : vec4(0);
		T.resolve.needsUpdate = true;
		T.skinH.fragmentNode = skinBlur(colour, depth, vec2(1, 0), false, U); T.skinH.needsUpdate = true;
		T.skinV.fragmentNode = skinBlur(texture(T.h.texture), depth, vec2(0, 1), true, U); T.skinV.needsUpdate = true;
		const img = this.skinPass.enabled ? texture(T.v.texture) : colour;
		let col = vec4(img.rgb, 1);
		if (this.aoPass.enabled) {
			// GTAO on the scene's depth at half resolution, Poisson-denoised, multiplied in at 0.85 (postfx.js AOPass)
			const a = this.aoNode = ao(depth, null, camera);
			a.resolutionScale = 0.5;
			a.radius.value = 0.06; a.distanceExponent.value = 1.5; a.thickness.value = 0.6; a.scale.value = 1; a.samples.value = 8;
			const d = denoise(a.getTextureNode(), depth, null, camera);
			d.lumaPhi.value = 10; d.depthPhi.value = 2; d.normalPhi.value = 3; d.radius.value = 4;
			// denoised into a half-resolution target of its own, as the WebGL GTAOPass's denoise pass is: inline, the denoise ran
			// per full-resolution pixel and again for every node that read col (glow, glare, output): 9.4 ms of GPU against 4.4
			const dn = rtt(d, null, null, { type: THREE.HalfFloatType, resolutionScale: 0.5 });
			col = vec4(col.rgb.mul(mix(vec3(1), vec3(dn.sample(uv()).r), 0.85)), 1);
		}
		if (this.bloom.enabled) {
			// UnrealBloomPass(strength, radius 0.1, threshold 1.6), added
			const b = bloom(col, this.bloomStrength, 0.1, 1.6);
			// at a quarter of the image: viewport.js sizes the UnrealBloomPass to half the image, and that pass works at half its
			// size again (the glow's reach in screen space follows)
			b.setResolutionScale(0.25);
			// added as UnrealBloomPass adds it: its composite is 3 x strength x the blurs (three's "backwards compatibility"), with
			// alpha its brightest channel, blended additively with the source alpha as factor; so the glow comes in times its own
			// peak, and a bright window blooms far more than in proportion. BloomNode returns strength x the blurs, added plainly.
			const g = b.rgb.mul(3).toVar();
			col = vec4(col.rgb.add(g.mul(max(g.r, max(g.g, g.b)))), 1);
		}
		const P = this.glare.preset;
		if (P && this.glare.strength > 0) {
			const G = this.glareU, srcTex = convertToTexture(col);
			const bright = rtt(glareBright(srcTex, G), null, null, { resolutionScale: 0.25 });
			G.dirs = [];
			let star = vec3(0);
			for (let r = 0; r < P.rays; r++) {
				const dir = uniform(new THREE.Vector2()); G.dirs.push(dir);
				let src = bright;
				for (let k = 0; k < 2; k++) src = rtt(glareStreak(src, dir, Math.pow(6, k), P.atten), null, null, { resolutionScale: 0.25 });
				star = star.add(src.sample(uv()).rgb);
			}
			col = vec4(srcTex.sample(uv()).rgb.add(star.mul(G.strength)), 1);
		}
		// the output (tone mapping, sRGB: the renderer's), then the hover outline over it (highlight.js: after OutputPass)
		const outline = this.passes.find((p) => p.apply);
		this.pipeline.outputColorTransform = !outline;
		this.pipeline.outputNode = outline ? outline.apply(renderOutput(col)) : col;
		this.pipeline.needsUpdate = true;
	}

	makeTargets() {
		const half = { type: THREE.HalfFloatType, depthBuffer: false };
		const scene = new RenderTarget(1, 1, { type: THREE.HalfFloatType, samples: this.samples });
		scene.depthTexture = new THREE.DepthTexture(1, 1);
		const quad = () => { const m = new NodeMaterial(); m.depthTest = m.depthWrite = false; m.toneMapped = false; return m; };
		const T = { scene, depth: new RenderTarget(1, 1, { type: THREE.FloatType, depthBuffer: false }), h: new RenderTarget(1, 1, half), v: new RenderTarget(1, 1, half),
			resolve: quad(), skinH: quad(), skinV: quad() };
		T.quad = new QuadMesh();
		return T;
	}

	// every call a new frame: passes re-render once per frame, and the frame count advances only in the animation loop, which
	// captures and benchmarks run outside of (and which stops while the pane is hidden)
	render() {
		if (this.dirty) this.build();
		const r = this.renderer, size = r.getDrawingBufferSize(new THREE.Vector2()), target = r.getRenderTarget();
		const w = target ? target.width : size.x, h = target ? target.height : size.y;
		this.U.texel.value.set(1 / w, 1 / h);
		this.U.pxPerM.value = h / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2));
		this.U.near.value = this.camera.near; this.U.far.value = this.camera.far;
		this.bloomStrength.value = this.bloom.strength;
		const P = this.glare.preset, G = this.glareU;
		if (P) {
			const qw = Math.max(1, Math.round(w / 4)), qh = Math.max(1, Math.round(h / 4));
			G.texel.value.set(1 / w, 1 / h); G.threshold.value = P.threshold; G.strength.value = P.strength * this.glare.strength;
			G.dirs.forEach((d, i) => { const ang = P.angle + (i / P.rays) * Math.PI * 2; d.value.set(Math.cos(ang) / qw * this.glare.size, Math.sin(ang) / qh * this.glare.size); });
		}
		r._nodes.nodeFrame.update();
		// the scene (and its depth, resolved), then the skin pass's two halves, then the node chain into the target in use
		const T = this.targets, q = T.quad;
		for (const t of [T.scene, T.depth, T.h, T.v]) if (t.width !== w || t.height !== h) t.setSize(w, h);
		r.setRenderTarget(T.scene); r.render(this.scene, this.camera);
		if (this.samples > 0) { q.material = T.resolve; r.setRenderTarget(T.depth); q.render(r); }
		if (this.skinPass.enabled) { q.material = T.skinH; r.setRenderTarget(T.h); q.render(r); q.material = T.skinV; r.setRenderTarget(T.v); q.render(r); }
		for (const p of this.passes) p.drawMask?.(r, w, h, this.samples > 0 ? T.depth.texture : T.scene.depthTexture);
		r.setRenderTarget(target);
		this.pipeline.render();
	}
}
