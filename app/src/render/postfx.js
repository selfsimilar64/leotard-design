// The scene pass and the screen-space quality passes that fit the frame budget (knowledge: realism
// upgrades at 60 fps):
//  - ScenePass: the scene drawn into its own multisampled target (anti-aliasing, depth and stencil
//    as textures for the passes below), then copied into the composer's plain buffers. Only the
//    scene is multisampled: with the composer's own buffers multisampled (as before 2026-10-21)
//    every post pass wrote and resolved 4x HDR buffers, 38 ms a frame at 1792x1344 against 14.
//  - SkinPass: subsurface scattering of skin. Light entering skin comes out a little way off,
//    reddest furthest: the lit image is blurred across skin pixels, red wider than green and blue,
//    by a width in millimetres turned into pixels by the depth (so it is the same on the skin at
//    any distance), and not across depth steps (nose, ears, silhouettes). Skin pixels are those
//    whose material writes alpha SKIN_ALPHA (markSkin: render/figure.js skin, the mannequin's
//    athlete-skin finishes; everything else writes 1); only they are blurred, only from each other
//    (no garment colour bleeds in), and every other pixel leaves at once.
//  - AOPass: ground-truth ambient occlusion (three's GTAOPass) on the scene's own depth: straps,
//    bands, stones and folds darken where they meet; the garment's lift and thickness are done in
//    its vertex shader, so a separate geometry pass (GTAOPass's default) would see the bare body.
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

export const SKIN_ALPHA = 0.5;

// Make a material mark its pixels as skin (alpha SKIN_ALPHA), or stop (on = false). Chains onto the
// material's own onBeforeCompile.
export function markSkin(mat, on = true) {
	if (!!mat.userData.skinMark === on) return;
	mat.userData.skinMark = on;
	if (!mat.userData.baseCompile) mat.userData.baseCompile = mat.onBeforeCompile ?? (() => {});
	const base = mat.userData.baseCompile, key = mat.customProgramCacheKey?.bind(mat);
	mat.onBeforeCompile = on ? (sh, r) => {
		base(sh, r);
		sh.fragmentShader = sh.fragmentShader.replace(/}\s*$/, '\tgl_FragColor.a = ' + SKIN_ALPHA.toFixed(2) + ';\n}');
	} : base;
	if (!mat.userData.baseKey) mat.userData.baseKey = key ?? (() => '');
	const bk = mat.userData.baseKey;
	mat.customProgramCacheKey = () => bk() + (mat.userData.skinMark ? '|skin' : '');
	mat.needsUpdate = true;
}
export class ScenePass extends Pass {
	constructor(scene, camera) {
		super();
		this.scene = scene; this.camera = camera;
		this.needsSwap = false;
		const depthTexture = new THREE.DepthTexture(1, 1);
		depthTexture.format = THREE.DepthStencilFormat; depthTexture.type = THREE.UnsignedInt248Type;
		// stencil: a figure's eye film is masked to the visible eyeball (render/figure.js)
		this.target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4, stencilBuffer: true, depthTexture });
		this.copy = new FullScreenQuad(new THREE.ShaderMaterial({
			uniforms: { tDiffuse: { value: null }, uKeepMark: { value: 1 } },
			vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
			// the skin mark (alpha) stays for SkinPass, which clears it; without that pass it goes here
			// (left in the image it washed the picture out towards white)
			fragmentShader: 'uniform sampler2D tDiffuse; uniform float uKeepMark; varying vec2 vUv; void main() { vec4 c = texture2D(tDiffuse, vUv); gl_FragColor = vec4(c.rgb, uKeepMark > 0.5 ? c.a : 1.0); }',
			depthTest: false, depthWrite: false, blending: THREE.NoBlending,
		}));
	}
	get depthTexture() { return this.target.depthTexture; }
	setSamples(n) { if (this.target.samples !== n) { this.target.samples = n; this.target.dispose(); } }
	setSize(w, h) { this.target.setSize(w, h); }
	render(renderer, writeBuffer, readBuffer) {
		this.copy.material.uniforms.uKeepMark.value = this.keepSkinMark ? 1 : 0;
		renderer.setRenderTarget(this.target);
		renderer.render(this.scene, this.camera);
		this.copy.material.uniforms.tDiffuse.value = this.target.texture;
		renderer.setRenderTarget(readBuffer);
		this.copy.render(renderer);
	}
	dispose() { this.target.dispose(); this.copy.dispose(); }
}

const blurShader = (dir) => ({
	uniforms: {
		tDiffuse: { value: null }, tDepth: { value: null },
		uTexel: { value: new THREE.Vector2() }, uPxPerM: { value: 1 }, uNear: { value: 0.01 }, uFar: { value: 40 },
		uWidth: { value: 0.0015 }, uStrength: { value: 0.6 }, uLast: { value: 0 },
	},
	vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
	fragmentShader: `
		#include <packing>
		uniform sampler2D tDiffuse; uniform sampler2D tDepth;
		uniform vec2 uTexel; uniform float uPxPerM, uNear, uFar, uWidth, uStrength, uLast;
		varying vec2 vUv;
		float viewZ(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, uNear, uFar); }
		bool skin(float a) { return abs(a - ${SKIN_ALPHA.toFixed(2)}) < 0.02; }
		void main() {
			vec4 c0 = texture2D(tDiffuse, vUv);
			float a = uLast > 0.5 ? 1.0 : c0.a; // the second half clears the skin mark
			if (!skin(c0.a)) { gl_FragColor = vec4(c0.rgb, a); return; }
			float z0 = viewZ(vUv);
			// kernel radius in pixels: uWidth metres at this depth
			float r = uWidth * uPxPerM / max(z0, 1e-3);
			if (r < 0.6) { gl_FragColor = vec4(c0.rgb, a); return; }
			vec3 sigma = vec3(1.0, 0.3, 0.18) * r; // red scatters furthest; green and blue keep the texture detail
			vec3 sum = c0.rgb, wsum = vec3(1.0);
			for (int i = -4; i <= 4; i++) {
				if (i == 0) continue;
				float t = float(i) / 4.0 * 2.0 * r; // samples out to two radii
				vec2 uv = vUv + ${dir} * uTexel * t;
				vec4 c = texture2D(tDiffuse, uv);
				if (!skin(c.a)) continue; // only from skin
				float dz = abs(viewZ(uv) - z0);
				float wz = exp(-dz * dz / (uWidth * uWidth * 4.0)); // not across depth steps
				vec3 w = exp(-0.5 * (t * t) / (sigma * sigma)) * wz;
				sum += c.rgb * w; wsum += w;
			}
			gl_FragColor = vec4(mix(c0.rgb, sum / wsum, uStrength), a);
		}`,
	depthTest: false, depthWrite: false,
});

export class SkinPass extends Pass {
	constructor(camera, scenePass) {
		super();
		this.camera = camera; this.scenePass = scenePass;
		this.needsSwap = false;
		this.h = new THREE.ShaderMaterial(blurShader('vec2(1.0, 0.0)'));
		this.v = new THREE.ShaderMaterial(blurShader('vec2(0.0, 1.0)'));
		this.v.uniforms.uLast.value = 1;
		this.quad = new FullScreenQuad(null);
	}

	render(renderer, writeBuffer, readBuffer) {
		const cam = this.camera, pxPerM = readBuffer.height / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2));
		for (const m of [this.h, this.v]) {
			const u = m.uniforms;
			u.tDepth.value = this.scenePass.depthTexture; u.uTexel.value.set(1 / readBuffer.width, 1 / readBuffer.height);
			u.uPxPerM.value = pxPerM; u.uNear.value = cam.near; u.uFar.value = cam.far;
		}
		// across: read -> write; down: write -> read (the pass does not swap)
		this.h.uniforms.tDiffuse.value = readBuffer.texture;
		this.quad.material = this.h;
		renderer.setRenderTarget(writeBuffer); this.quad.render(renderer);
		this.v.uniforms.tDiffuse.value = writeBuffer.texture;
		this.quad.material = this.v;
		const auto = renderer.autoClear;
		renderer.autoClear = false; // (the fixed pixels are only drawn over; a clear would wipe them)
		renderer.setRenderTarget(readBuffer); this.quad.render(renderer);
		renderer.autoClear = auto;
	}

	dispose() { this.h.dispose(); this.v.dispose(); this.quad.dispose(); }
}

// GTAO on the depth the scene pass wrote.
export class AOPass extends GTAOPass {
	constructor(scene, camera, depthTexture) {
		// (three r186: passing depthTexture to the constructor fails, setGBuffer reads the normal
		// target it has not made yet; made first, then replaced)
		super(scene, camera, 1, 1);
		this.setGBuffer(depthTexture);
		this.updateGtaoMaterial({ radius: 0.06, distanceExponent: 1.5, thickness: 0.6, scale: 1, samples: 8 });
		this.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, rings: 2, samples: 8 });
		this.blendIntensity = 0.85;
	}

	// at half resolution: occlusion is soft, and full resolution cost ~27 ms a frame at 1792x1344
	setSize(width, height) { super.setSize(Math.max(1, width >> 1), Math.max(1, height >> 1)); }

}
