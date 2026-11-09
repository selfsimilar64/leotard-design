// The fabric's own lighting on the WebGPU renderer: three's PhysicalLightingModel with materials/fabric.js's lighting chunks
// on top, the node-code twin of fabric.js AO_FRAGMENT, SKIN_DIFFUSE, FILM_FRAGMENT (in fabric-node.js), FOIL_FRAGMENT
// (FabricNodeMaterial.setupVariants, fabric-node.js) and the satin thread model (MICRO_PARS, LIGHTS_MICRO, MICRO_FRAGMENT).
// A change to one is a change to both.
// The thread model is ported in the two configurations the app uses (fabric.js MICRO_SPEED): 'all4' (Satin) and 'duo'
// (Duotone satin, = all4 + MICRO_XNARROW). So: MICRO_LCULL, MICRO_K 6, MICRO_SEG 1, MICRO_KDENV with MICRO_LUT, MICRO_LANA
// with MICRO_LONE; MICRO_LLOOP and MICRO_DYN are compile-time devices of the GLSL with nothing to port (each light calls one
// WGSL function here). One difference: MICRO_MIP (nearest prefiltered level) is not ported, the lookups blend two levels as
// the full model does (2-4/255 brighter detail, measured on WebGL, 2026-10-28).
import { PhysicalLightingModel } from 'three/webgpu';
import {
	Fn, If, Loop, float, vec2, vec3, select, min, max, mix, clamp, abs, sqrt, exp, exp2, cos, sin, asin, atan, tanh, dot, cross, normalize,
	normalView, normalViewGeometry, positionViewDirection, tangentView, cameraWorldMatrix, pmremTexture, materialEnvIntensity, texture,
	diffuseContribution, specularColor, specularF90,
} from 'three/tsl';

const PI = Math.PI;

// --- MICRO_PARS's small functions (inline)
const microFresnel = (c, eta) => { // exact unpolarised dielectric reflectance
	const g2 = eta.mul(eta).sub(1).add(c.mul(c)), g = sqrt(max(g2, 0));
	const a = g.sub(c).div(g.add(c)), b = c.mul(g.add(c)).sub(1).div(c.mul(g.sub(c)).add(1));
	return select(g2.lessThan(0), float(1), a.mul(a).mul(b.mul(b).add(1)).mul(0.5));
};
const microGauss = (s, x) => exp(x.mul(x).negate().div(s.mul(s).mul(2))).div(s.mul(2.5066283));
// masking x reweighting for one incoming direction (eqs 7-13)
const microMP = (wi, n, bx, phi, phr, Mr, Pr) => {
	const phd = phi.sub(phr), u = exp(phd.mul(phd).negate().div(2 * 0.349 * 0.349));
	const Mi = max(cos(phi), 0), M = mix(Mi.mul(Mr), min(Mi, Mr), u);
	const wip = wi.sub(bx.mul(dot(wi, bx)));
	const Pi = max(dot(normalize(wip), n), 0);
	return M.mul(mix(Pi.mul(Pr), min(Pi, Pr), u));
};
// P(t, wr): the tangent's projected length toward the viewer (eq 11)
const microPr = (wr, n, bx) => max(dot(normalize(wr.sub(bx.mul(dot(wr, bx)))), n), 0);
// MICRO_LUT: where the view sits in a surface tangent's frame (t, n), as table coordinates
const microLutUV = (t, n, wr) => {
	const sr = clamp(dot(wr, t), -1, 1), pv = wr.sub(t.mul(sr)), bl = cross(t, n);
	return vec2(asin(sr), atan(dot(pv, bl), dot(pv, n))).div(PI).add(0.5);
};
// the unit Gaussian's cumulative distribution (a tanh fit; clamped, as the GLSL)
const microCdf = (x0) => { const x = clamp(x0, -5, 5); return tanh(x.add(x.mul(x).mul(x).mul(0.044715)).mul(0.7978846)).mul(0.5).add(0.5); };

// The thread model's functions for one material build. u: the fabric's uniforms as nodes ({ eta, T1, T2, A1, A2, R2, off,
// len, lut }); env: { texture: the scene's environment (or null), nodes: [] (each lookup's node, kept on the scene's
// environment by fabric-node.js syncFabricPacks) }; xn: MICRO_XNARROW.
function microModel(u, env, xn) {
	const off = (i) => u.off.element(i), len = (i) => u.len.element(i);
	// an environment lookup about view direction w, blurred to roughness r (fabric.js microEnv): a prefiltered-environment
	// node of its own per call site (a node takes the texture, not another environment node)
	const microEnv = (w, r) => {
		if (!env.texture) return vec3(0);
		const node = pmremTexture(env.texture, w.transformDirection(cameraWorldMatrix), r);
		env.nodes.push(node);
		return node.rgb;
	};

	// A narrow-lobed tangent (the floats; the cross threads under MICRO_XNARROW): its surface and volume lobes as deltas in
	// theta, K = 6 cone directions (MICRO_K)
	const microNarrow = Fn(([t, nl, bl, n, bx, wr, T, A, R]) => {
		const K = 6;
		const sr = clamp(dot(wr, t), -1, 1), cr = sqrt(max(float(1).sub(sr.mul(sr)), 0)), Pr = microPr(wr, n, bx);
		const pv = wr.sub(t.mul(sr));
		const phr = atan(dot(pv, bl), dot(pv, nl)), Mr = max(cos(phr), 0);
		const acc = vec3(0).toVar();
		If(Pr.greaterThan(0).and(Mr.greaterThan(0)), () => {
			Loop(K, ({ i: k }) => {
				const phi = float(k).add(0.5).div(K).sub(0.5).mul(PI);
				const wi = t.mul(sr.negate()).add(nl.mul(cos(phi)).add(bl.mul(sin(phi))).mul(cr));
				const mp = microMP(wi, n, bx, phi, phr, Mr, Pr);
				If(mp.greaterThan(0), () => {
					const c2 = cos(phi.sub(phr).mul(0.5)), Fr = microFresnel(cr.mul(c2), u.eta), Ft = float(1).sub(Fr);
					acc.addAssign(microEnv(wi, R.x).mul(Fr.mul(c2).mul(2)).add(microEnv(wi, R.y).mul(float(1).sub(T.z).mul(Ft).mul(Ft).div(max(cr, 1e-2))).mul(A)).mul(mp));
				});
			});
		});
		return acc.mul(PI / K);
	}).setLayout({ name: 'microNarrow', type: 'vec3', inputs: [
		{ name: 't', type: 'vec3' }, { name: 'nl', type: 'vec3' }, { name: 'bl', type: 'vec3' }, { name: 'n', type: 'vec3' }, { name: 'bx', type: 'vec3' },
		{ name: 'wr', type: 'vec3' }, { name: 'T', type: 'vec4' }, { name: 'A', type: 'vec3' }, { name: 'R', type: 'vec2' }] });

	// MICRO_FRAGMENT: the environment's light on the threads (n: the fabric's normal, T1 the floats, T2 the cross threads)
	const envLight = (n, T1, T2, wr) => {
		const bx1 = cross(n, T1), bx2 = cross(n, T2);
		const a1 = u.T1.w, a2 = u.T2.w;
		const acc1 = vec3(0).toVar(), sumP1 = float(0).toVar(), sumL1 = float(0).toVar();
		// the floats: one tangent sample per segment of their curve (MICRO_SEG 1), at its middle, four times the weight; each
		// lookup blurred to at least half the segment's spread
		Loop(7, ({ i: seg }) => {
			const w0 = len(seg), o0 = off(seg), o1 = off(seg.add(1));
			If(w0.greaterThan(0), () => {
				const w = w0.mul(4), o = mix(o0, o1, 0.5);
				const Rt = sqrt(min(max(u.T1.xy, vec2(abs(o1.sub(o0)).mul(0.5))).mul(1.84), vec2(1)));
				const ca = cos(o), sa = sin(o), t = T1.mul(ca).add(n.mul(sa)), nl = T1.mul(sa.negate()).add(n.mul(ca));
				const r = microNarrow(t, nl, cross(t, nl), n, bx1, wr, u.T1, u.A1, Rt);
				sumP1.addAssign(microPr(wr, n, bx1).mul(w)); sumL1.addAssign(w);
				acc1.addAssign(r.mul(w));
			});
		});
		// their kd share and the cross threads: one blurriest lookup about the normal times a kernel table by view angle
		// (MICRO_KDENV, MICRO_LUT)
		const lenK = float(0).toVar();
		Loop(7, ({ i: seg }) => { lenK.addAssign(len(seg)); });
		// zero where the view is behind the normal: the table only spans the front, and its edge texel over Q's 1e-3 floor
		// blew out to the dye's colour (twin: fabric.js MICRO_FRAGMENT's eN, which says more)
		const eN = select(dot(wr, n).greaterThan(0), microEnv(n, float(1)), vec3(0)).toVar();
		If(u.T1.z.greaterThan(0), () => { acc1.addAssign(eN.mul(texture(u.lut, microLutUV(T1, n, wr)).b).mul(u.A1).mul(lenK)); });
		const kc = texture(u.lut, microLutUV(T2, n, wr)).rg;
		const acc2 = eN.mul(kc.x.add(u.A2.mul(kc.y))).toVar(); // (MICRO_XNARROW: the table holds their kd share only)
		// MICRO_XNARROW (Duotone satin): the cross threads' narrow lobes as deltas in theta, at their own widths
		if (xn) acc2.addAssign(microNarrow(T2, n, cross(T2, n), n, bx2, wr, u.T2, u.A2, u.R2));
		const Pr2 = microPr(wr, n, bx2);
		const Q = a1.mul(sumP1).div(max(sumL1, 1e-4)).add(a2.mul(Pr2)).add(float(1).sub(a1).sub(a2).mul(max(dot(wr, n), 0)));
		return a1.mul(acc1).div(max(sumL1, 1e-4)).add(a2.mul(acc2)).div(max(Q, 1e-3)).mul(materialEnvIntensity);
	};

	// --- direct lights: the thread function lit by three's point, spot and directional lights
	// microFull: the thread function f (eqs 2-4) for one incoming direction, times masking x reweighting and cos theta_i
	const microFull = (t, nl, bl, n, bx, wi, wr, T, A, Pr) => {
		const si = clamp(dot(wi, t), -1, 1), sr = clamp(dot(wr, t), -1, 1);
		const ti = asin(si), tr = asin(sr), cti = cos(ti), cr = cos(tr);
		const pi = wi.sub(t.mul(si)), pv = wr.sub(t.mul(sr));
		const phi = atan(dot(pi, bl), dot(pi, nl)), phr = atan(dot(pv, bl), dot(pv, nl)), Mr = max(cos(phr), 0);
		const mp = microMP(wi, n, bx, phi, phr, Mr, Pr);
		const th = ti.add(tr).mul(0.5), ctd = cos(ti.sub(tr).mul(0.5)), c2 = cos(phi.sub(phr).mul(0.5));
		const Fr = microFresnel(ctd.mul(c2), u.eta), Ft = float(1).sub(Fr);
		const f = vec3(Fr.mul(c2).mul(microGauss(T.x, th))).add(A.mul(Ft.mul(Ft).mul(float(1).sub(T.z).mul(microGauss(T.y, th)).add(T.z)).div(max(cti.add(cr), 1e-2)))).div(max(ctd.mul(ctd), 1e-3));
		return select(Pr.greaterThan(0).and(Mr.greaterThan(0)).and(mp.greaterThan(0)), f.mul(mp.mul(cti)), vec3(0));
	};
	// microParts: microFull in parts, each Gaussian lobe left out: S, V the surface and volume terms per unit of their
	// Gaussian, K the kd term, th the half angle
	const microParts = (t, nl, bl, n, bx, wi, wr, T, A, Pr) => {
		const si = clamp(dot(wi, t), -1, 1), sr = clamp(dot(wr, t), -1, 1);
		const ti = asin(si), tr = asin(sr), cti = cos(ti), cr = cos(tr);
		const pi = wi.sub(t.mul(si)), pv = wr.sub(t.mul(sr));
		const phi = atan(dot(pi, bl), dot(pi, nl)), phr = atan(dot(pv, bl), dot(pv, nl)), Mr = max(cos(phr), 0);
		const mp = microMP(wi, n, bx, phi, phr, Mr, Pr);
		const ok = Pr.greaterThan(0).and(Mr.greaterThan(0)).and(mp.greaterThan(0));
		const ctd = cos(ti.sub(tr).mul(0.5)), c2 = cos(phi.sub(phr).mul(0.5));
		const Fr = microFresnel(ctd.mul(c2), u.eta), Ft = float(1).sub(Fr), k = mp.mul(cti).div(max(ctd.mul(ctd), 1e-3));
		const vol = A.mul(Ft.mul(Ft).div(max(cti.add(cr), 1e-2))).mul(k);
		return {
			th: select(ok, ti.add(tr).mul(0.5), float(0)),
			S: select(ok, Fr.mul(c2).mul(k), float(0)),
			V: select(ok, vol.mul(float(1).sub(T.z)), vec3(0)),
			K: select(ok, vol.mul(T.z), vec3(0)),
		};
	};
	// eq 15 for the view wr
	const microQ = (n, T1, T2, wr) => {
		const sumL = float(0).toVar();
		Loop(7, ({ i: seg }) => { sumL.addAssign(len(seg)); });
		const Pr1 = microPr(wr, n, cross(n, T1));
		return max(u.T1.w.mul(Pr1).mul(sumL).div(max(sumL, 1e-4)).add(u.T2.w.mul(microPr(wr, n, cross(n, T2)))).add(float(1).sub(u.T1.w).sub(u.T2.w).mul(max(dot(wr, n), 0))), 1e-3);
	};
	// microPointA (MICRO_LANA, MICRO_LONE, MICRO_LCULL): the floats' lobes integrated analytically about the offset o* that
	// meets the specular condition, every segment's from the one evaluation there; the cross threads exact
	const microPoint = Fn(([wi, wr, n, T1, T2]) => {
		const out = vec3(0).toVar();
		If(dot(wi, n).greaterThan(0), () => {
			const bx1 = cross(n, T1), bx2 = cross(n, T2), Pr1 = microPr(wr, n, bx1);
			const lenT = float(0).toVar(), oMin = float(1e9).toVar(), oMax = float(-1e9).toVar();
			Loop(7, ({ i: seg }) => {
				const w = len(seg), o0 = off(seg), o1 = off(seg.add(1));
				If(w.greaterThan(0), () => { lenT.addAssign(w); oMin.assign(min(oMin, min(o0, o1))); oMax.assign(max(oMax, max(o0, o1))); });
			});
			const h = wi.add(wr);
			const os = atan(dot(h, T1).negate(), dot(h, n)).toVar();
			os.addAssign(select(os.greaterThan(0.5 * PI), float(-PI), select(os.lessThan(-0.5 * PI), float(PI), float(0))));
			const oc = clamp(os, oMin, oMax), ca = cos(oc), sa = sin(oc);
			const t = T1.mul(ca).add(n.mul(sa)).toVar(), nl = T1.mul(sa.negate()).add(n.mul(ca)).toVar();
			const P = microParts(t, nl, cross(t, nl), n, bx1, wi, wr, u.T1, u.A1, Pr1);
			const S = P.S.toVar(), V = P.V.toVar(), K = P.K.toVar();
			const si = dot(wi, t), sr = dot(wr, t);
			const dth = max(abs(dot(wi, nl).div(max(sqrt(float(1).sub(si.mul(si))), 1e-3)).add(dot(wr, nl).div(max(sqrt(float(1).sub(sr.mul(sr))), 1e-3)))).mul(0.5), 1e-3).toVar();
			// each lobe a Gaussian of width gamma / dth in offset about o*, weighted by the curve's length per radian of offset,
			// summed over the sloped segments with the Gaussian's share inside each
			const sg = u.T1.xy.div(dth), rhoSV = vec2(0).toVar();
			Loop(7, ({ i: seg }) => {
				const o0 = off(seg), o1 = off(seg.add(1)), w = len(seg);
				If(o0.notEqual(o1).and(w.greaterThan(0)), () => {
					rhoSV.addAssign(microCdf(vec2(max(o0, o1)).sub(os).div(sg)).sub(microCdf(vec2(min(o0, o1)).sub(os).div(sg))).mul(w.div(abs(o1.sub(o0)))));
				});
			});
			const acc1 = vec3(S.mul(rhoSV.x)).add(V.mul(rhoSV.y)).div(dth).toVar();
			// MICRO_LONE: each constant segment's lobes from the same evaluation, its half angle linearised about o*, and the
			// whole curve's kd share at o*
			Loop(7, ({ i: seg }) => {
				const w = len(seg), o0 = off(seg);
				If(w.greaterThan(0).and(o0.equal(off(seg.add(1)))), () => {
					const d = dth.mul(o0.sub(os));
					acc1.addAssign(vec3(S.mul(microGauss(u.T1.x, d))).add(V.mul(microGauss(u.T1.y, d))).mul(w));
				});
			});
			acc1.addAssign(K.mul(lenT));
			const acc2 = microFull(T2, n, cross(T2, n), n, bx2, wi, wr, u.T2, u.A2, microPr(wr, n, bx2));
			out.assign(u.T1.w.mul(acc1).div(max(lenT, 1e-4)).add(u.T2.w.mul(acc2)).div(microQ(n, T1, T2, wr)));
		});
		return out;
	}).setLayout({ name: 'microPoint', type: 'vec3', inputs: [
		{ name: 'wi', type: 'vec3' }, { name: 'wr', type: 'vec3' }, { name: 'n', type: 'vec3' }, { name: 'T1', type: 'vec3' }, { name: 'T2', type: 'vec3' }] });

	return { envLight, microPoint };
}

// The lighting model of one fabric material build. f: { micro (the uniforms as nodes, or null: not a thread-model satin),
// xn, env ({ texture, nodes }, microModel), skin (the uSkin node, or null: not the dress form) }.
export class FabricLightingModel extends PhysicalLightingModel {
	constructor(material, f) {
		super(material.useClearcoat, material.useSheen, material.useIridescence, material.useAnisotropy, material.useTransmission, material.useDispersion, material.useRetroreflection);
		this.f = f;
		this.micro = f.micro ? microModel(f.micro, f.env, f.xn) : null;
	}

	start(builder) {
		if (this.micro) {
			// the thread model's frame (fabric.js FABRIC_FRAGMENT's end): the cross threads T2 round the body (the tangent), the
			// floats T1 across it; at the top level, before the lights read it
			const n = normalView;
			this.frame = { n: n.toVar('microN') };
			const t0 = tangentView;
			this.frame.T2 = normalize(t0.sub(n.mul(dot(t0, n)))).toVar('microT2');
			this.frame.T1 = cross(n, this.frame.T2).toVar('microT1');
			this.frame.V = positionViewDirection.toVar('microV');
		}
		super.start(builder);
	}

	direct(input, builder) {
		const { lightDirection, lightColor, reflectedLight } = input;
		if (this.micro) {
			// LIGHTS_MICRO: the thread model takes over three's direct lights
			const { n, T1, T2, V } = this.frame;
			reflectedLight.directSpecular.addAssign(this.micro.microPoint(lightDirection, V, n, T1, T2).mul(lightColor));
			return;
		}
		super.direct(input, builder);
		if (this.f.skin) {
			// SKIN_DIFFUSE (the dress form's skin): diffuse light wraps past the terminator, further in red than in blue
			const skin = this.f.skin;
			If(skin.greaterThan(0), () => { addWrappedDiffuse(reflectedLight, lightDirection, lightColor, vec3(0.5, 0.28, 0.22).mul(skin)); });
		}
	}

	directRectArea(input, builder) {
		if (this.micro) return; // the softboxes reach the satin through the reflection room only (fabric.js LIGHTS_MICRO)
		super.directRectArea(input, builder);
	}

	indirectSpecular(builder) {
		super.indirectSpecular(builder);
		if (this.micro && this.f.env.texture) {
			const { n, T1, T2, V } = this.frame;
			builder.context.reflectedLight.indirectSpecular.addAssign(this.micro.envLight(n, T1, T2, V));
		}
	}

	// AO_FRAGMENT: the fabric's occlusion on every term, by its own shares (it spans crevices, so is barely shaded)
	ambientOcclusion(builder) {
		const { ambientOcclusion: aoT, reflectedLight } = builder.context;
		reflectedLight.indirectDiffuse.mulAssign(aoT);
		reflectedLight.indirectSpecular.mulAssign(mix(1, aoT, 0.8));
		reflectedLight.directDiffuse.mulAssign(mix(1, aoT, 0.35));
		if (this.sheen === true) this.sheenSpecularIndirect.mulAssign(aoT);
		if (this.clearcoat === true) this.clearcoatSpecularIndirect.mulAssign(aoT);
	}
}

// Skin's diffuse wrapped past the terminator by w (per channel), in place of three's: its diffuse line (RE_Direct_Physical) is
// irradiance (N.L of the shaded normal) x Lambert x (1 - F); the wrap uses the geometry normal, clamp((N.L + w) / (1 + w)).
// Called after three's direct(), this adds the difference (fabric.js SKIN_DIFFUSE's twin, above).
function addWrappedDiffuse(reflectedLight, lightDirection, lightColor, w) {
	const wrapped = clamp(vec3(dot(normalViewGeometry, lightDirection)).add(w).div(w.add(1)), 0, 1).mul(lightColor);
	const plain = clamp(dot(normalView, lightDirection), 0, 1).mul(lightColor);
	const halfDir = lightDirection.add(positionViewDirection).normalize(), dotVH = clamp(dot(positionViewDirection, halfDir), 0, 1);
	const fresnel = exp2(dotVH.mul(-5.55473).sub(6.98316).mul(dotVH)); // (three's F_Schlick)
	const F = specularColor.mul(float(1).sub(fresnel)).add(vec3(specularF90).mul(fresnel));
	reflectedLight.directDiffuse.addAssign(wrapped.sub(plain).mul(diffuseContribution).mul(1 / PI).mul(vec3(1).sub(F)));
}
