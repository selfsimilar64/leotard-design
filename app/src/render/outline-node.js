// The hover outline on the WebGPU renderer: the twin of render/highlight.js OutlinePass (its mask material and its edge), drawn
// by render/webgpu-post.js NodePost: the mask into a target of its own after the scene, the edge over the tone-mapped image.
// A change to one side is a change to the other.
import * as THREE from 'three';
import { NodeMaterial, RenderTarget } from 'three/webgpu';
import {
	Fn, If, Discard, Loop, attribute, reference, uniform, texture, uv, vec2, vec3, vec4, float, abs, cos, sin, max, mix, select,
	positionLocal, normalLocal, positionView, screenCoordinate, perspectiveDepthToViewZ,
} from 'three/tsl';

const CLEAR = 0.006, OUTLINE_PX = 1.5; // (highlight.js)
const COLOUR = vec3(1), DARK = vec3(0.03, 0.03, 0.05);

// highlight.js maskMaterial: R everywhere on the part, G where nothing stands closer than CLEAR in front of it
function maskMaterial(source, box, depth, U) {
	const u = source.userData.u, m = new NodeMaterial();
	m.side = THREE.DoubleSide; m.depthTest = m.depthWrite = false; m.transparent = true;
	m.blending = THREE.CustomBlending; m.blendEquation = THREE.MaxEquation; m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneFactor;
	const uOffset = reference('value', 'float', u.uOffset), uGarment = reference('value', 'float', u.uGarment), uClip = reference('value', 'float', u.uClip);
	// (the fabric's own displacement: position + normal * uOffset + aLift * uGarment, materials/fabric-node.js)
	m.positionNode = positionLocal.add(normalLocal.mul(uOffset)).add(attribute('aLift', 'vec3').mul(uGarment));
	const uBox = uniform(box ?? new THREE.Matrix4()), useBox = box ? 1 : 0;
	m.fragmentNode = Fn(() => {
		If(uClip.greaterThan(0.5).and(attribute('aKeepForm', 'vec4').x.lessThan(0)), () => { Discard(); });
		if (useBox) {
			const d = uBox.mul(vec4(attribute('aRef', 'vec3'), 1)).xyz;
			If(abs(d.x).greaterThan(0.5).or(abs(d.y).greaterThan(0.5)).or(abs(d.z).greaterThan(1)), () => { Discard(); });
		}
		const front = perspectiveDepthToViewZ(depth.sample(screenCoordinate.xy.div(U.res)).x, U.near, U.far).negate();
		return vec4(1, select(positionView.z.negate().sub(front).lessThan(CLEAR), float(1), float(0)), 0, 1);
	})();
	return m;
}

export class OutlineNode {
	constructor(viewport, isOn) {
		this.viewport = viewport; this.isOn = isOn;
		this.enabled = false;
		this.scene = new THREE.Scene();
		this.mask = new RenderTarget(1, 1, { samples: 4, depthBuffer: false });
		this.U = { res: uniform(new THREE.Vector2()), near: uniform(0.01), far: uniform(40), texel: uniform(new THREE.Vector2()), r: uniform(2), on: uniform(0) };
		this.depth = texture(new THREE.DataTexture(new Float32Array(4), 1, 1, THREE.RGBAFormat, THREE.FloatType)); // (pointed at the scene's depth by NodePost)
	}

	// parts: [{ mesh, box? }] (highlight.js OutlinePass.set)
	set(parts) {
		for (const p of [...this.scene.children]) { this.scene.remove(p); p.material.dispose(); }
		for (const { mesh, box } of parts) {
			const p = new THREE.Mesh(mesh.geometry, maskMaterial(mesh.material, box, this.depth, this.U));
			p.userData.source = mesh;
			p.matrixAutoUpdate = false; p.matrixWorldAutoUpdate = false; p.frustumCulled = false;
			this.scene.add(p);
		}
		this.enabled = parts.length > 0;
	}
	setSize() {}

	// the mask, drawn by NodePost after the scene (depth: the scene's depth texture, sampleable)
	drawMask(renderer, w, h, depthTexture) {
		const on = this.enabled && this.isOn(), cam = this.viewport.camera;
		this.U.on.value = on ? 1 : 0;
		if (!on) return;
		this.depth.value = depthTexture;
		if (this.mask.width !== w || this.mask.height !== h) this.mask.setSize(w, h);
		this.U.res.value.set(w, h); this.U.near.value = cam.near; this.U.far.value = cam.far;
		this.U.texel.value.set(1 / w, 1 / h); this.U.r.value = OUTLINE_PX * renderer.getPixelRatio();
		for (const p of this.scene.children) p.matrixWorld.copy(p.userData.source.matrixWorld);
		const clear = renderer.getClearColor(new THREE.Color()), alpha = renderer.getClearAlpha();
		renderer.setRenderTarget(this.mask); renderer.setClearColor(0x000000, 0); renderer.clear();
		renderer.render(this.scene, cam);
		renderer.setClearColor(clear, alpha);
	}

	// highlight.js OutlinePass's edge over the image c (tone-mapped, display colours)
	apply(c) {
		const U = this.U, M = texture(this.mask.texture);
		return Fn(() => {
			const col = c.rgb.toVar();
			If(U.on.greaterThan(0.5), () => {
				const m = M.sample(uv()).rg.toVar();
				const near = float(0).toVar(), far = float(0).toVar(), hid = float(0).toVar();
				If(m.y.lessThan(1), () => {
					Loop(16, ({ i }) => {
						const a = float(i).mul(0.3927), d = vec2(cos(a), sin(a)).mul(U.texel);
						const s0 = M.sample(uv().add(d.mul(U.r).mul(0.5))).rg, s1 = M.sample(uv().add(d.mul(U.r))).rg;
						near.assign(max(near, max(s0.y, s1.y)));
						far.assign(max(far, M.sample(uv().add(d.mul(U.r).mul(1.9))).g));
						hid.assign(max(hid, max(s0.x, s1.x)));
					});
				});
				const line = near.mul(float(1).sub(m.y));                                          // outside the shape as seen
				const halo = far.mul(float(1).sub(m.y)).mul(float(1).sub(line)).mul(0.5);           // so it shows on white cloth too
				const behind = hid.mul(float(1).sub(m.x)).mul(float(1).sub(near)).mul(0.4);         // the part that runs behind something: faint
				col.assign(mix(col, DARK, halo));
				col.assign(mix(col, COLOUR, max(line, behind)));
			});
			return vec4(col, 1);
		})();
	}

	dispose() { this.set([]); this.mask.dispose(); }
}
