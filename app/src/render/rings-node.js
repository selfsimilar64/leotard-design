// The stones' hover rings on the WebGPU renderer: the twin of render/highlight.js HoverHighlight's ring material (WebGPU draws
// points one pixel wide, so each ring is an instanced quad: three's PointsNodeMaterial on a Sprite). A change to one side is a
// change to the other.
import * as THREE from 'three';
import { PointsNodeMaterial } from 'three/webgpu';
import { Fn, If, Discard, instancedBufferAttribute, uniform, uv, vec3, vec4, float, max, mix, abs, length, smoothstep, select, positionView, varyingProperty } from 'three/tsl';

const COLOUR = vec3(1), DARK = vec3(0.03, 0.03, 0.05); // (highlight.js)

// pos, size, strong: the InstancedBufferAttributes highlight.js setStones fills (position, aSize, aStrong); U: { px, pr } as its
// uniforms uPx (pixels per unit of depth) and uPr (pixel ratio)
export function ringSprite(pos, size, strong, U) {
	const m = new PointsNodeMaterial({ transparent: true, depthWrite: false, sizeAttenuation: false });
	// the image's alpha stays: it marks skin for the skin pass (render/postfx.js)
	Object.assign(m, { blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });
	const aSize = instancedBufferAttribute(size), aStrong = instancedBufferAttribute(strong);
	const vR = varyingProperty('float', 'vRingR'), vBox = varyingProperty('float', 'vRingBox');
	m.positionNode = instancedBufferAttribute(pos);
	// highlight.js's vertex shader: the ring's diameter in device pixels, then the quad's (CSS pixels: three multiplies by the
	// pixel ratio)
	m.sizeNode = Fn(() => {
		const d0 = aSize.mul(1.3).mul(U.px).div(positionView.z.negate());
		const d = select(aStrong.greaterThan(0.5), max(d0.mul(1.15), U.pr.mul(11)), max(d0, U.pr.mul(3)));
		vR.assign(d.mul(0.5));
		vBox.assign(d.add(U.pr.mul(6)));
		return vBox.div(U.pr);
	})();
	m.fragmentNode = Fn(() => {
		const r = length(uv().sub(0.5)).mul(vBox);
		const strongF = aStrong.toVarying('vRingStrong');
		const c = vec4(0).toVar();
		If(vR.lessThan(U.pr.mul(3.5)).and(strongF.lessThan(0.5)), () => {
			// too small on screen for a ring
			c.assign(vec4(COLOUR, float(1).sub(smoothstep(vR.sub(1), vR, r)).mul(0.6)));
		}).Else(() => {
			const w = select(strongF.greaterThan(0.5), float(1.1), float(0.7)).mul(U.pr);
			const line = float(1).sub(smoothstep(w.sub(0.7), w.add(0.7), abs(r.sub(vR))));
			const halo = float(1).sub(smoothstep(w.sub(0.7), w.add(0.7), abs(r.sub(vR).sub(w.mul(1.6)).sub(0.6)))).mul(0.55);
			c.assign(vec4(mix(DARK, COLOUR, line), max(line, halo)));
		});
		If(c.a.lessThan(0.01), () => { Discard(); });
		return c;
	})();
	const sprite = new THREE.Sprite(m);
	sprite.count = pos.count;
	return sprite;
}
