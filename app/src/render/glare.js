// Star-filter glare (realism upgrade R3): the brightest glints (crystals, foil highlights) pulled
// out at quarter resolution, streaked along a few rays (Kawase streak filter: each pass sums 6
// taps a growing distance apart, so 2 passes reach about 35 texels), and added back to the HDR
// image before tone mapping. Presets as photographers use them: a 4-point cross screen, a 6-point,
// and the "arena eye" 8-point star with more length.
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

export const GLARE = {
	plain: null,
	star: { rays: 4, angle: Math.PI / 4, strength: 0.9, threshold: 2.4, atten: 0.9 },
	star6: { rays: 6, angle: Math.PI / 2, strength: 0.85, threshold: 2.4, atten: 0.9 },
	arena: { rays: 8, angle: 0.2, strength: 1.15, threshold: 0.9, atten: 0.92 },
};

// Defaults of scene.glareSize and scene.glareStrength: the presets at full strength read as a lens
// effect, not as sparkle (owner, 2026-10-21), so the rays start shorter and fainter.
export const GLARE_SIZE = 0.6, GLARE_STRENGTH = 0.35;

const VERT = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`;

export class GlarePass extends Pass {
	constructor() {
		super();
		this.preset = null;
		const rt = () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
		this.bright = rt(); this.a = rt(); this.b = rt(); this.sum = rt();
		this.brightM = new THREE.ShaderMaterial({
			uniforms: { tDiffuse: { value: null }, texel: { value: new THREE.Vector2() }, threshold: { value: 2 } }, vertexShader: VERT,
			// the max of four bilinear taps keeps glints only a pixel or two wide; only point-like
			// glints star (much brighter than a ring round them), not a broad foil highlight
			fragmentShader: /* glsl */`uniform sampler2D tDiffuse; uniform vec2 texel; uniform float threshold; varying vec2 vUv;
				void main() {
					vec3 c = max( max( texture2D( tDiffuse, vUv + texel * vec2( -1., -1. ) ).rgb, texture2D( tDiffuse, vUv + texel * vec2( 1., -1. ) ).rgb ),
						max( texture2D( tDiffuse, vUv + texel * vec2( -1., 1. ) ).rgb, texture2D( tDiffuse, vUv + texel * vec2( 1., 1. ) ).rgb ) );
					vec3 ring = ( texture2D( tDiffuse, vUv + texel * vec2( -6., 0. ) ).rgb + texture2D( tDiffuse, vUv + texel * vec2( 6., 0. ) ).rgb
						+ texture2D( tDiffuse, vUv + texel * vec2( 0., -6. ) ).rgb + texture2D( tDiffuse, vUv + texel * vec2( 0., 6. ) ).rgb ) * .25;
					c = max( c - ring * 1.1, 0. );
					float l = max( c.r, max( c.g, c.b ) );
					gl_FragColor = vec4( c * max( l - threshold, 0. ) / max( l, 1e-4 ), 1. );
				}`,
		});
		this.streakM = new THREE.ShaderMaterial({
			uniforms: { tSrc: { value: null }, dir: { value: new THREE.Vector2() }, b: { value: 1 }, atten: { value: 0.93 } }, vertexShader: VERT,
			fragmentShader: /* glsl */`uniform sampler2D tSrc; uniform vec2 dir; uniform float b; uniform float atten; varying vec2 vUv;
				void main() {
					vec3 s = vec3( 0. ); float ws = 0.;
					for ( int i = 0; i < 6; i ++ ) { float w = pow( atten, b * float( i ) ); s += w * texture2D( tSrc, vUv + dir * b * float( i ) ).rgb; ws += w; }
					gl_FragColor = vec4( s / ws, 1. );
				}`,
		});
		this.addM = new THREE.ShaderMaterial({
			uniforms: { tSrc: { value: null } }, vertexShader: VERT, blending: THREE.AdditiveBlending, transparent: true, depthTest: false, depthWrite: false,
			fragmentShader: /* glsl */`uniform sampler2D tSrc; varying vec2 vUv; void main() { gl_FragColor = vec4( texture2D( tSrc, vUv ).rgb, 1. ); }`,
		});
		this.compM = new THREE.ShaderMaterial({
			uniforms: { tDiffuse: { value: null }, tStar: { value: null }, strength: { value: 0.5 } }, vertexShader: VERT,
			fragmentShader: /* glsl */`uniform sampler2D tDiffuse; uniform sampler2D tStar; uniform float strength; varying vec2 vUv;
				void main() { vec4 c = texture2D( tDiffuse, vUv ); gl_FragColor = vec4( c.rgb + strength * texture2D( tStar, vUv ).rgb, c.a ); }`,
		});
		this.quad = new FullScreenQuad(null);
		this.enabled = false;
	}

	// size: the rays' length and strength: their brightness, both as multiples of the preset's
	// (scene.glareSize, scene.glareStrength)
	setPreset(name, { size = 1, strength = 1 } = {}) {
		this.preset = GLARE[name] ?? null;
		this.size = size; this.strength = strength;
		this.enabled = !!this.preset && strength > 0;
	}

	setSize(w, h) {
		const qw = Math.max(1, Math.round(w / 4)), qh = Math.max(1, Math.round(h / 4));
		for (const t of [this.bright, this.a, this.b, this.sum]) t.setSize(qw, qh);
		this.brightM.uniforms.texel.value.set(1 / w, 1 / h);
		this.q = [qw, qh];
	}

	// (uniformsNeedUpdate: three skips re-uploading uniforms between draws with the same material)
	draw(renderer, material, target) { material.uniformsNeedUpdate = true; this.quad.material = material; renderer.setRenderTarget(target); this.quad.render(renderer); }

	render(renderer, writeBuffer, readBuffer) {
		const P = this.preset, [qw, qh] = this.q ?? [1, 1], autoClear = renderer.autoClear;
		renderer.autoClear = false; // the rays add up in one target
		this.brightM.uniforms.tDiffuse.value = readBuffer.texture;
		this.brightM.uniforms.threshold.value = P.threshold;
		this.draw(renderer, this.brightM, this.bright);
		renderer.setRenderTarget(this.sum); renderer.setClearColor(0x000000, 0); renderer.clear();
		const S = this.streakM.uniforms;
		S.atten.value = P.atten;
		for (let r = 0; r < P.rays; r++) {
			const ang = P.angle + (r / P.rays) * Math.PI * 2;
			S.dir.value.set(Math.cos(ang) / qw * this.size, Math.sin(ang) / qh * this.size);
			let src = this.bright, dst = this.a;
			for (let pass = 0; pass < 2; pass++) {
				S.tSrc.value = src.texture; S.b.value = Math.pow(6, pass);
				this.draw(renderer, this.streakM, dst);
				src = dst; dst = dst === this.a ? this.b : this.a;
			}
			this.addM.uniforms.tSrc.value = src.texture;
			this.draw(renderer, this.addM, this.sum);
		}
		const C = this.compM.uniforms;
		C.tDiffuse.value = readBuffer.texture; C.tStar.value = this.sum.texture; C.strength.value = P.strength * this.strength;
		this.draw(renderer, this.compM, this.renderToScreen ? null : writeBuffer);
		renderer.autoClear = autoClear;
	}
}
