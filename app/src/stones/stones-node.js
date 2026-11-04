// The stones on the WebGPU renderer: node-code twins of stones/view.js crystalMaterial (the crystal's inner reflection, its
// glints from the point lights, AB, metallic and opal coats) and of stones/gpu-view.js's GPU placement (the Atlas, rendered
// one target at a time instead of four at once, and placed(): a stone's frame built in its vertex shader from the atlas).
// A change to one side is a change to the other.
import * as THREE from 'three';
import { MeshPhysicalNodeMaterial, PhysicalLightingModel, NodeMaterial, RenderTarget } from 'three/webgpu';
import {
	Fn, If, attribute, reference, uniform, texture, varyingProperty, vec2, vec3, vec4, float, ivec2,
	min, max, mix, clamp, abs, cos, sin, pow, dot, cross, normalize, length, reflect, refract, saturate, floor, select,
	positionLocal, normalLocal, normalView, positionViewDirection, cameraViewMatrix, cameraWorldMatrix, modelWorldMatrix, materialEnvIntensity,
	materialColor, pmremTexture,
} from 'three/tsl';

// --- crystalMaterial's lighting (stones/view.js, the block after lights_fragment_end), as a lighting model
class CrystalLightingModel extends PhysicalLightingModel {
	constructor(m) {
		super(!!m.useClearcoat, !!m.useSheen, !!m.useIridescence, !!m.useAnisotropy, false, false, false);
		this.m = m;
	}
	start(builder) {
		// at the top level, before the lights read it: the three channels' exit directions and the environment seen along them
		const m = this.m, u = m.crystal, V = positionViewDirection.toVar('crystalV'), n = normalView;
		const A = normalize(cameraViewMatrix.mul(modelWorldMatrix.mul(vec4(m.axisNode, 0))).xyz).toVar('crystalA');
		const Nx = normalize(mix(A, n, 0.4)), Nw = normalize(n.add(n.sub(A.mul(dot(n, A))).mul(1.1))).toVar('crystalNw');
		const env = (w, r) => {
			if (!m.envFollow.texture) return vec3(0);
			const node = pmremTexture(m.envFollow.texture, w.transformDirection(cameraWorldMatrix), float(r));
			m.envFollow.nodes.push(node);
			return node.rgb;
		};
		this.dout = [1.57, 1.6, 1.645].map((ior, c) => {
			const d = refract(reflect(refract(V.negate(), Nw, 1 / ior), A), Nx.negate(), ior).toVar('crystalOut' + c);
			If(dot(d, d).lessThan(0.5), () => { d.assign(reflect(V.negate(), A)); }); // total internal reflection
			return d;
		});
		const ch = ['x', 'y', 'z'].map((k, c) => {
			const e = env(this.dout[c], 0.04)[k].toVar();
			return e.mul(e).mul(1.6).div(e.add(0.35)).add(env(this.dout[c], 0.6)[k].mul(0.45)).mul(materialEnvIntensity);
		});
		this.inner = vec3(ch[0], ch[1], ch[2]).toVar('crystalInner');
		this.tint = m.tintNode.toVar('crystalTint');
		this.fres = float(0.05).add(pow(float(1).sub(saturate(dot(n, V))), 5).mul(0.95)).toVar('crystalFres');
		this.V = V; this.A = A;
		super.start(builder);
	}
	direct(input, builder) {
		super.direct(input, builder);
		// glints: each point light seen along the exit directions
		if (input.lightNode?.light?.isPointLight) {
			const u = this.m.crystal;
			const g = ['x', 'y', 'z'].map((k, c) => input.lightColor[k].mul(pow(saturate(dot(this.dout[c], input.lightDirection)), u.glintPow)).mul(u.glint));
			this.inner.addAssign(vec3(g[0], g[1], g[2]));
		}
	}
	indirect(builder) {
		super.indirect(builder);
		const { reflectedLight } = builder.context, f = this.m.finishNode, n = normalView, u = this.m.crystal;
		// finish: x = AB (0..1), y = metallic coat, z = opal milkiness, w = random per stone
		If(f.x.greaterThan(0), () => {
			// Aurora Borealis: each facet takes a pastel hue that drifts with the view angle
			const ph = dot(n, this.V).mul(1.9).add(dot(n, this.A).mul(1.3)).add(f.w);
			this.inner.mulAssign(mix(vec3(1), cos(vec3(ph).add(vec3(0, 0.33, 0.67)).mul(6.2832)).mul(0.5).add(0.68), f.x));
		});
		const glass = float(1).sub(f.y);
		reflectedLight.indirectSpecular.addAssign(this.inner.mul(this.tint).mul(float(1).sub(this.fres)).mul(u.inner).mul(glass).mul(float(1).sub(f.z.mul(0.6))));
		// metallic coat: a tinted mirror; opal: a milky glow of the tint
		reflectedLight.indirectSpecular.addAssign(this.inner.mul(this.tint).mul(f.y).mul(1.2));
		reflectedLight.indirectDiffuse.addAssign(this.tint.mul(f.z).mul(0.35));
		// a glint is bright, never infinite: keep half-float targets (and the bloom) finite
		reflectedLight.indirectSpecular.assign(min(reflectedLight.indirectSpecular, vec3(60)));
		reflectedLight.directSpecular.assign(min(reflectedLight.directSpecular, vec3(60)));
	}
}

class CrystalNodeMaterial extends MeshPhysicalNodeMaterial {
	setupLightingModel() { return new CrystalLightingModel(this); }
}
CrystalNodeMaterial.prototype.isCrystalNode = true;

// stones/view.js crystalMaterial's twin. axis: the table axis in object space (null: attribute aAxis, per instance), tint: the
// stone's colour (null: attribute aColour). Its uniforms are m.userData.u (uInner, uGlint, uGlintPow), as the WebGL one's.
export function crystalNodeMaterial({ axis = null, tint = null } = {}) {
	const u = { uInner: { value: 1.5 }, uGlint: { value: 7 }, uGlintPow: { value: 260 } };
	const m = new CrystalNodeMaterial({ color: 0x000000, roughness: 0.12, metalness: 0, ior: 1.6, iridescence: 1, iridescenceIOR: 1.9, iridescenceThicknessRange: [200, 480] });
	m.userData.u = u;
	m.crystal = { inner: reference('value', 'float', u.uInner), glint: reference('value', 'float', u.uGlint), glintPow: reference('value', 'float', u.uGlintPow) };
	m.axisNode = axis ?? attribute('aAxis', 'vec3');
	m.tintNode = tint ?? attribute('aColour', 'vec3');
	m.finishNode = attribute('aFinish', 'vec4');
	m.iridescenceNode = m.finishNode.x.mul(0.6); // per-stone coating: AB / shimmer drive the thin film
	m.envFollow = { texture: null, nodes: [] }; // (kept on the scene's environment: materials/fabric-node.js syncFabricPacks)
	const setup = m.setupLightingModel.bind(m);
	m.setupLightingModel = (builder) => {
		const e = m.envNode ?? builder.environmentNode;
		m.envFollow = { texture: e?.isTextureNode ? e.value : null, nodes: [] };
		return setup(builder);
	};
	return m;
}

// --- gpu-view.js Atlas: four targets, one render each (WebGPU's default allows 32 bytes per sample across colour targets; four
// float targets need 64). Rows: WebGPU's row 0 is the top, so the flat v is flipped on the way in and the lookups below read
// the same texel as WebGL's.
export class AtlasNode {
	constructor(renderer) {
		this.renderer = renderer;
		this.rts = null;
		this.box = uniform(new THREE.Vector4());
		this.geo = new THREE.BufferGeometry();
		this.mats = ['aPos', 'aNrm', 'aTu', 'aTv'].map((name) => {
			const m = new NodeMaterial();
			m.side = THREE.DoubleSide; m.depthTest = m.depthWrite = false; m.toneMapped = false;
			const f = attribute('aFlat', 'vec2').sub(this.box.xy).mul(this.box.zw).mul(2).sub(1);
			m.vertexNode = vec4(f.x, f.y.negate(), 0, 1);
			m.fragmentNode = vec4(attribute(name, 'vec3'), 1);
			return m;
		});
		this.mesh = new THREE.Mesh(this.geo, this.mats[0]);
		this.mesh.frustumCulled = false;
		this.scene = new THREE.Scene();
		this.scene.add(this.mesh);
		this.cam = new THREE.OrthographicCamera();
		// what a placed stone reads (placedNode)
		this.tex = [0, 1, 2, 3].map(() => texture(new THREE.DataTexture(new Float32Array(4), 1, 1, THREE.RGBAFormat, THREE.FloatType)));
		this.at = uniform(new THREE.Vector3());
	}

	// geometry: the flat triangles as gpu-view.js Atlas.build makes them (aFlat, aPos, aNrm, aTu, aTv); box: x0, y0, w, h, t
	render(attributes, { x0, y0, w, h, t }) {
		for (const [k, a] of Object.entries(attributes)) this.geo.setAttribute(k, a);
		this.geo.setDrawRange(0, attributes.aFlat.count);
		if (!this.rts || this.rts[0].width !== w || this.rts[0].height !== h) {
			this.rts?.forEach((r) => r.dispose());
			this.rts = [0, 1, 2, 3].map(() => new RenderTarget(w, h, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false, generateMipmaps: false }));
		}
		this.box.value.set(x0, y0, 1 / (w * t), 1 / (h * t));
		const r = this.renderer, was = r.getRenderTarget(), col = r.getClearColor(new THREE.Color()), alpha = r.getClearAlpha();
		r.setClearColor(0x000000, 0);
		this.mats.forEach((m, i) => {
			this.mesh.material = m;
			r.setRenderTarget(this.rts[i]); r.clear(true, false, false); r.render(this.scene, this.cam);
			this.tex[i].value = this.rts[i].texture;
		});
		r.setRenderTarget(was); r.setClearColor(col, alpha);
		this.at.value.set(x0, y0, 1 / t);
	}

	dispose() { this.rts?.forEach((r) => r.dispose()); this.geo.dispose(); this.mats.forEach((m) => m.dispose()); }
}

// gpu-view.js placed()'s twin: a material that places its stones from the atlas. aStone: u, v (flat metres), angle, diameter
// (less than nothing: a round stone). Sets the material's positionNode (and the crystal's axis), its colour from aColour.
export function placedNode(material, atlas, aspect) {
	const [tP, tN, tU, tV] = atlas.tex, at = atlas.at;
	const vAxis = varyingProperty('vec3', 'vStoneAxis');
	material.positionNode = Fn(() => {
		const S = attribute('aStone', 'vec4');
		const size = ivec2(tP.size(0));
		const f = S.xy.sub(at.xy).mul(at.z).sub(0.5);
		const i0 = clamp(ivec2(floor(f)), ivec2(0), size.sub(2)).toVar();
		const w = clamp(f.sub(vec2(i0)), 0, 1).toVar();
		const P = vec4(0).toVar(), N = vec4(0).toVar(), U = vec4(0).toVar(), V = vec4(0).toVar(), K = float(0).toVar();
		for (let k = 0; k < 4; k++) {
			const ox = k & 1, oy = k >> 1, q = i0.add(ivec2(ox, oy));
			const p = tP.load(q).toVar();
			// (bilinear over the texels on the piece only: one off its edge holds nothing)
			const wt = (ox ? w.x : float(1).sub(w.x)).mul(oy ? w.y : float(1).sub(w.y)).add(1e-4).mul(p.w);
			P.addAssign(p.mul(wt)); N.addAssign(tN.load(q).mul(wt)); U.addAssign(tU.load(q).mul(wt)); V.addAssign(tV.load(q).mul(wt)); K.addAssign(wt);
		}
		const p = P.xyz.div(max(K, 1e-12)), n = normalize(N.xyz).toVar(), x = vec3(0).toVar();
		const d = abs(S.w), a = S.z;
		If(S.w.lessThan(0), () => {
			// a round stone: its spin about t0 = (0, 1, 0) x n, b0 = n x t0, as StoneView.build
			const t0 = vec3(n.z, 0, n.x.negate()), tl = length(t0);
			const t = select(tl.lessThan(1e-3), vec3(1, 0, 0), t0.div(max(tl, 1e-6)));
			x.assign(t.mul(cos(a)).add(cross(n, t).mul(sin(a))));
		}).Else(() => {
			const D = U.xyz.mul(cos(a)).add(V.xyz.mul(sin(a)));
			x.assign(normalize(D.sub(n.mul(dot(n, D)))));
		});
		const y = cross(n, x);
		// (no part of the piece here: collapsed, not drawn)
		const on = select(K.greaterThan(0), float(1), float(0));
		const X = x.mul(d).mul(on), Y = y.mul(d).mul(aspect).mul(on), Z = n.mul(d).mul(on);
		vAxis.assign(n);
		// the normal through the frame's inverse scale (gpu-view.js beginnormal_vertex)
		const nl = normalLocal;
		normalLocal.assign(normalize(x.mul(nl.x).add(y.mul(nl.y.div(aspect))).add(n.mul(nl.z))));
		return X.mul(positionLocal.x).add(Y.mul(positionLocal.y)).add(Z.mul(positionLocal.z)).add(p.mul(on));
	})();
	if (material.isCrystalNode) material.axisNode = vAxis;
	else material.colorNode = materialColor.mul(attribute('aColour', 'vec3'));
	return material;
}

// A family's stock material (pearl, spangle, holographic dot, nailhead) as its node twin, for placedNode.
export function nodeTwin(mat) {
	const n = new MeshPhysicalNodeMaterial();
	for (const key in mat) n[key] = mat[key]; // (as three's NodeLibrary.fromMaterial)
	n.onBeforeCompile = () => {};
	return n;
}
