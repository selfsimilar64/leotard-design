// The fabric on the WebGPU renderer (render/webgpu.js): materials/fabric.js's shader, rewritten as three.js node code (TSL) on
// a MeshPhysicalNodeMaterial (knowledge/engineering/rendering/webgpu-port.md). Twin of fabric.js PARS_VERTEX, BEGIN_VERTEX,
// BEGIN_NORMAL, PARS_FRAGMENT, FABRIC_FRAGMENT and AO_FRAGMENT, section for section and in the same order: a change to one is
// a change to both. The uniforms are fabric.js's own objects (createFabricMaterial's `u`, read here by reference; textures and
// arrays through setters), so applyFabric, bindScan, applyTexture and every caller that sets m.userData.u.uX.value work on
// either renderer unchanged.
// OPEN BUG (2026-11-05): with the scan, decal, duochrome or flake sections in the shader, scanned and plain fabrics light far too
// bright (a dark green panel shows light grey); the values going in are right when drawn unlit. See the port note.
// Not ported yet: zones 0-2 (the legacy painted garment, not shown by the app), the lighting chunks (FILM_FRAGMENT,
// FOIL_FRAGMENT, SKIN_DIFFUSE, the satin thread model MICRO_*), and AO_FRAGMENT's share on direct light (aoNode darkens
// indirect light only).
import * as THREE from 'three';
import { MeshPhysicalNodeMaterial } from 'three/webgpu';
import { FABRIC_ATTRIBUTES } from './fabric-attributes.js';
import {
	Fn, If, Loop, Discard, struct, select, attribute, reference, texture, uniform, uniformArray,
	diffuseColor, positionLocal, positionGeometry, positionView, normalLocal, normalGeometry, normalViewGeometry, positionViewDirection, cameraViewMatrix,
	materialColor, materialRoughness, materialMetalness, materialOpacity,
	float, int, vec2, vec3, vec4, mat2, abs, min, max, mix, clamp, saturate, step, smoothstep, fract, floor, sin, cos, atan, exp, exp2, log2, pow, sqrt,
	inverseSqrt, length, dot, cross, normalize, reflect, sign, mod, transpose, dFdx, dFdy, fwidth,
} from 'three/tsl';
import * as TSL from 'three/tsl'; // (m.userData.nodes.tsl: for trying node changes from the console)

// a white texel for an empty texture slot: one per slot (one texture bound to several slots lost its sampler in WGSL)
const blankTexture = () => { const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t; };

// --- PARS_FRAGMENT's functions
const hash32 = (p) => { const p3 = fract(vec3(p.x, p.y, p.x).mul(vec3(0.1031, 0.1030, 0.0973))).toVar(); p3.addAssign(dot(p3, p3.yxz.add(33.33))); return fract(p3.xxy.add(p3.yzz).mul(p3.zyx)); };
const hash21 = (p) => { const p3 = fract(vec3(p.x, p.y, p.x).mul(0.1031)).toVar(); p3.addAssign(dot(p3, p3.yzx.add(33.33))); return fract(p3.x.add(p3.y).mul(p3.z)); };
const vnoise = Fn(([p]) => {
	const i = floor(p), f0 = fract(p), f = f0.mul(f0).mul(float(3).sub(f0.mul(2)));
	return mix(mix(hash21(i), hash21(i.add(vec2(1, 0))), f.x), mix(hash21(i.add(vec2(0, 1))), hash21(i.add(1)), f.x), f.y);
});
const GRAIN = 9;
const bendOf = (c, uBend) => vec2(vnoise(c.mul(0.045)), vnoise(c.mul(0.045).add(19.7))).sub(0.5).mul(2).mul(uBend)
	.add(vec2(vnoise(c.mul(0.11).add(3.3)), vnoise(c.mul(0.11).add(8.1))).sub(0.5).mul(0.7).mul(uBend));
// xy = offset from the cell centre, zw = cell id; centres 1 apart
const hexCell = Fn(([p]) => {
	const s = vec2(1, 1.7320508);
	const c = floor(vec4(p, p.sub(vec2(0.5, 1))).div(vec4(s, s))).add(0.5);
	const h = vec4(p.sub(c.xy.mul(s)), p.sub(c.zw.add(0.5).mul(s)));
	return select(dot(h.xy, h.xy).lessThan(dot(h.zw, h.zw)), vec4(h.xy, c.xy), vec4(h.zw, c.zw.add(0.5)));
});
const spectrum = (h) => { const c = clamp(abs(fract(vec3(h).add(vec3(0, 2 / 3, 1 / 3))).mul(6).sub(3)).sub(1), 0, 1); return c.mul(c).mul(float(3).sub(c.mul(2))); };
// tilt the (view-space) normal by the screen-space gradient of a height (metres)
const bumpN = (n, hgt) => {
	const dpdx = dFdx(positionView), dpdy = dFdy(positionView); // (GLSL: dFdx( - vViewPosition ), vViewPosition = - mvPosition)
	const r1 = cross(dpdy, n), r2 = cross(n, dpdx), det = dot(dpdx, r1);
	const g = sign(det).mul(dFdx(hgt).mul(r1).add(dFdy(hgt).mul(r2)));
	const r = abs(det).mul(n).sub(g);
	return select(dot(r, r).greaterThan(1e-30), normalize(r), n);
};
// tangent frame from screen-space derivatives of position and pattern coordinates
const cotangentApply = (N, p, uv, v) => {
	const dp1 = dFdx(p), dp2 = dFdy(p), duv1 = dFdx(uv), duv2 = dFdy(uv);
	const dp2perp = cross(dp2, N), dp1perp = cross(N, dp1);
	const T = dp2perp.mul(duv1.x).add(dp1perp.mul(duv2.x)), B = dp2perp.mul(duv1.y).add(dp1perp.mul(duv2.y));
	const invmax = inverseSqrt(max(max(dot(T, T), dot(B, B)), 1e-20));
	return T.mul(invmax).mul(v.x).add(B.mul(invmax).mul(v.y)).add(N.mul(v.z));
};

// --- One vertex buffer for the fabric's inputs. A WebGPU draw takes at most 8 vertex buffers (this GTX 1650's adapter allows no
// more) and three binds each attribute as its own; a garment piece carries 10. So each fabric geometry gets an interleaved copy
// of its fabric attributes (materials/fabric-attributes.js FABRIC_ATTRIBUTES, 25 floats a vertex) under names prefixed 'p',
// repacked from the CPU's own arrays whenever one changes (their version), and the shader reads those: position, normal,
// tangent and the pack, 4 buffers. The CPU writers stay as they are. A missing source reads as zeros.
const PACK = (() => { let off = 0; return Object.entries(FABRIC_ATTRIBUTES).map(([name, size]) => { const e = { name, size, off }; off += size; return e; }); })();
const STRIDE = PACK.reduce((a, e) => a + e.size, 0);
const packs = new WeakMap(); // geometry -> { n, ib, src: {name: attribute}, ver: {name: version} }
function syncPack(geo) {
	const n = geo.getAttribute('position')?.count ?? 0;
	let p = packs.get(geo);
	if (!p || p.n !== n) {
		const ib = new THREE.InterleavedBuffer(new Float32Array(Math.max(n, 1) * STRIDE), STRIDE);
		for (const e of PACK) geo.setAttribute('p' + e.name, new THREE.InterleavedBufferAttribute(ib, e.size, e.off));
		p = { n, ib, src: {}, ver: {} };
		packs.set(geo, p);
	}
	let dirty = false;
	const D = p.ib.array;
	for (const e of PACK) {
		const a = geo.getAttribute(e.name) ?? null;
		if (p.src[e.name] === a && (!a || p.ver[e.name] === a.version)) continue;
		p.src[e.name] = a; p.ver[e.name] = a?.version; dirty = true;
		const S = a && !a.isInterleavedBufferAttribute && a.itemSize === e.size ? a.array : null;
		for (let i = 0; i < n; i++) for (let q = 0; q < e.size; q++) D[i * STRIDE + e.off + q] = S ? S[i * e.size + q] : 0;
	}
	if (dirty) p.ib.needsUpdate = true;
}
// Before each WebGPU frame (render/viewport.js): every visible fabric mesh's pack up to date.
export function syncFabricPacks(root) {
	root.traverseVisible((o) => { if (o.isMesh && o.material?.isFabricNode) syncPack(o.geometry); });
}

// The fabric's colour goes in through the diffuse set-up, not colorNode: three's shadow pass reads a material's colorNode (its
// alpha) and would pull the whole fabric function into every shadow draw.
class FabricNodeMaterial extends MeshPhysicalNodeMaterial {
	setupDiffuseColor(builder) {
		super.setupDiffuseColor(builder);
		if (this.fabricColor) diffuseColor.assign(vec4(this.fabricColor, diffuseColor.a));
	}
}
FabricNodeMaterial.prototype.isFabricNode = true;

// Debugging (open bug, knowledge/engineering/rendering/webgpu-port.md): sections to leave out of the fabric function, a JSON list in
// localStorage 'fabricSkip' (scan, knit, bump, flake, mesh, seam, bumpH, film, ombre, duo, checker, print, micro, decals,
// wrinkles, folds, clip), read once at load: a material's shader is rebuilt only when its nodes change.
const SKIP = (() => { try { return new Set(JSON.parse(localStorage.getItem('fabricSkip') ?? '[]')); } catch { return new Set(); } })();
const skip = (k) => SKIP.has(k);
const FabricOut = struct({ col: 'vec3', alpha: 'float', n: 'vec3', rough: 'float', metal: 'float', ao: 'float', flake: 'float', foil: 'vec3', dye: 'vec3', film: 'float' }, 'FabricOut');

export function createFabricNodeMaterial(zone, u) {
	const m = new FabricNodeMaterial({ transparent: zone !== 3 });
	m.userData.u = u;
	const U = (name, type = 'float') => (type === 'color' ? C(name) : reference('value', type, u[name]));
	// a colour as a plain vec3 uniform, refreshed per object (colour-typed reference uniforms among this many others turned the
	// panels grey; cause not pinned down)
	const C = (name) => { const v = new THREE.Vector3(); return uniform(v).onObjectUpdate(() => { const c = u[name].value; return v.set(c.r, c.g, c.b); }); };
	// a texture uniform: a node whose texture follows u[name].value (null: a white texel)
	const T = (name) => {
		const blank = blankTexture(), node = texture(u[name].value ?? blank);
		let v = u[name].value;
		Object.defineProperty(u[name], 'value', { get: () => v, set: (x) => { v = x; node.value = x ?? blank; }, configurable: true });
		return node;
	};
	// an array uniform: its node takes over whatever array u[name].value is set to
	const A = (name, type) => {
		const node = uniformArray(u[name].value, type);
		let v = u[name].value;
		Object.defineProperty(u[name], 'value', { get: () => v, set: (x) => { v = x; node.array = x; }, configurable: true });
		return node;
	};

	// the packed vertex inputs (materials/fabric-attributes.js)
	const aCoverZone = attribute('paCoverZone', 'vec4'), aKeepForm = attribute('paKeepForm', 'vec4'), aFold = attribute('paFold', 'vec4');
	const aLift = attribute('paLift', 'vec3'), aGNormal = attribute('paGNormal', 'vec3'), aRef = attribute('paRef', 'vec3');
	const aUV = attribute('paUV', 'vec2'), aRim = attribute('paRim', 'vec2');
	const uOffset = U('uOffset'), uGarment = U('uGarment');

	// --- BEGIN_VERTEX, BEGIN_NORMAL: the garment surface is the skin pushed out by the lift (and the fabric's offset)
	const normal0 = normalLocal.toVar();
	m.positionNode = Fn(() => {
		normalLocal.assign(normalize(mix(normal0, aGNormal, uGarment)));
		return positionLocal.add(normal0.mul(uOffset)).add(aLift.mul(uGarment));
	})();

	const tBase = T('tBase'), tNormal = T('tNormal'), tRough = T('tRough'), tAlpha = T('tAlpha'), tMtl = T('tMtl'), tMask = T('tMask'), tPrint = T('tPrint'), tDecal = T('tDecal');
	// decals: four slots of plain uniforms, each read from the arrays applyDecals hands over (render/garment.js) every frame
	// (uniform arrays of matrices and colours in a fabric's shader turned every panel grey on this GPU, cause not found)
	const slot = (name, k, init) => uniform(init).onObjectUpdate(() => u[name].value?.[k] ?? init);
	const colSlot = (name, k) => { const v = new THREE.Vector3(); return uniform(v).onObjectUpdate(() => { const c = u[name].value?.[k]; return c ? v.set(c.r, c.g, c.b) : v.set(1, 1, 1); }); };
	const decal = [0, 1, 2, 3].map((k) => ({ M: slot('uDecalM', k, new THREE.Matrix4()), rect: slot('uDecalRect', k, new THREE.Vector4()), look: slot('uDecalLook', k, new THREE.Vector4()), col: colSlot('uDecalCol', k) }));
	const uWrinkle = A('uWrinkle', 'vec4'), uWrinkleN = A('uWrinkleN', 'vec4');

	// --- FABRIC_FRAGMENT
	const fabric = Fn(() => {
		const cover = aCoverZone.x, keep = aKeepForm.x, form = aKeepForm.yz, vRef = aRef, vGrad = aKeepForm.w, vFold = aFold.xyz, vSeam = aFold.w;
		if (!skip('clip')) If(U('uClip').greaterThan(0.5).and(keep.lessThan(0)), () => { Discard(); });
		const col = materialColor.rgb.toVar(), alpha = materialOpacity.toVar(), rough = materialRoughness.toVar(), metal = materialMetalness.toVar();
		const normal = normalize(normalViewGeometry).toVar(), trimAO = float(1).toVar();
		const film = float(0.5).toVar(), flakeMask = float(0).toVar(), dye = vec3(0).toVar(), foil = vec3(0).toVar();

		// dress-form tapes
		if (zone === 3) {
			const tapeY = U('uTapeY', 'vec4');
			If(U('uTape').greaterThan(0.5), () => {
				const d = min(abs(vRef.x), abs(form.x)).toVar();
				If(vRef.y.greaterThan(tapeY.z).and(vRef.y.lessThan(tapeY.w.sub(0.03))), () => { d.assign(min(d, abs(form.y))); });
				d.assign(min(d, min(abs(vRef.y.sub(tapeY.x)), min(abs(vRef.y.sub(tapeY.y)), abs(vRef.y.sub(tapeY.z))))));
				const aa = max(fwidth(d), 1e-5), w = float(0.0028);
				col.assign(mix(col, U('uTapeColor', 'color'), float(1).sub(smoothstep(w.sub(aa), w.add(aa), d))));
			});
			If(U('uSkin').greaterThan(0), () => {
				rough.assign(clamp(rough.mul(float(0.82).add(vnoise(positionGeometry.xy.mul(90).add(positionGeometry.z.mul(40))).mul(0.36))), 0.3, 0.8));
			});
		}
		// a lining never shows past the shell's openings
		if (!skip('clip')) If(U('uClipShell').greaterThan(0.5).and(cover.lessThan(0)), () => { Discard(); });

		// pattern space: the plane the surface faces most (object space), or the panel's cloth coordinates turned by the grain
		const an = abs(normalize(normalGeometry));
		const q = select(an.z.greaterThanEqual(an.x).and(an.z.greaterThanEqual(an.y)), positionGeometry.xy, select(an.x.greaterThanEqual(an.y), positionGeometry.zy, positionGeometry.xz)).toVar();
		If(U('uUV').greaterThan(0.5), () => { const g = U('uGrain'), cg = cos(g), sg = sin(g); q.assign(mat2(cg, sg, sg.negate(), cg).mul(aUV)); });
		const fp = length(fwidth(positionGeometry));
		// Evaluated here, at the top level, on purpose: three writes its shared `positionViewDirection` variable once, at the
		// first place the shader reads it, and the lighting after this function reuses that variable. Read first inside an If,
		// the write sat in a branch most fabrics never take, so lighting saw a zero view direction (Fresnel 1: every lit side
		// white). See knowledge/engineering/rendering/webgpu-port.md.
		const viewDir = positionViewDirection.toVar('viewDir');
		const lum = vec3(0.2126, 0.7152, 0.0722);

		// scanned fabric
		const uTex = U('uTex');
		if (!skip('scan')) If(uTex.greaterThan(0.5), () => {
			const tuv = q.div(U('uTile', 'vec2')), TB = 1;
			const tb = tBase.sample(tuv).bias(TB);
			const c = tb.rgb.toVar(), texLum = max(U('uTexLum'), 1e-3);
			If(U('uTexRecolour').greaterThan(0.5), () => { c.assign(U('uTexTint', 'color').mul(dot(c, lum).div(texLum))); });
			const flags = U('uTexFlags', 'vec4');
			If(flags.w.greaterThan(0.5), () => {
				const mk = tMask.sample(tuv).mul(U('uMaskOn', 'vec4')), sh = dot(tb.rgb, lum).div(texLum);
				c.assign(mix(c, U('uMaskCol0', 'color').mul(sh), mk.x)); c.assign(mix(c, U('uMaskCol1', 'color').mul(sh), mk.y));
				c.assign(mix(c, U('uMaskCol2', 'color').mul(sh), mk.z)); c.assign(mix(c, U('uMaskCol3', 'color').mul(sh), mk.w));
			});
			col.assign(c);
			If(flags.x.greaterThan(0.5), () => {
				const tr = tRough.sample(tuv).bias(TB).r;
				rough.assign(clamp(select(U('uTexRoughRel').greaterThan(0.5), rough.mul(tr).div(max(U('uTexRoughMean'), 0.05)), tr), 0.04, 1));
			});
			If(flags.z.greaterThan(0.5), () => { metal.assign(max(metal, tMtl.sample(tuv).r)); });
			If(flags.y.greaterThan(0.5), () => { alpha.mulAssign(tAlpha.sample(tuv).r); });
			const uTexNormal = U('uTexNormal');
			If(uTexNormal.greaterThan(0), () => {
				const tn = tNormal.sample(tuv).bias(TB).xyz.mul(2).sub(1).toVar();
				// Toksvig: a short averaged normal is relief too small to see: it widens the GGX lobe
				const tl = max(length(tn), 1e-3), tv = min(float(1).sub(tl).div(tl).mul(uTexNormal).mul(uTexNormal), 0.18);
				const ta = rough.mul(rough);
				rough.assign(sqrt(sqrt(min(ta.mul(ta).add(max(tv, 0).mul(2)), 1))));
				tn.assign(vec3(tn.xy.mul(uTexNormal), tn.z));
				normal.assign(normalize(cotangentApply(normal, positionView, tuv, tn)));
			});
		});
		if (!skip('micro')) If(U('uMicro').greaterThan(0), () => { col.assign(vec3(0)); }); // the thread model's light is all its own (MICRO_FRAGMENT)
		if (!skip('print')) If(U('uPrint').greaterThan(0.5), () => {
			const pc = tPrint.sample(q.sub(U('uPrintOffset', 'vec2')).div(U('uPrintSize', 'vec2')));
			col.assign(mix(col, pc.rgb, pc.a));
		});
		const uChecker = U('uChecker');
		if (!skip('checker')) If(uChecker.greaterThan(0), () => {
			const cq = floor(q.div(uChecker)), ck = mod(cq.x.add(cq.y), 2), fq = fract(q.div(uChecker));
			const arrow = step(abs(fq.x.sub(0.5)), 0.06).mul(step(0.2, fq.y)).mul(step(fq.y, 0.8));
			col.assign(mix(col.mul(mix(0.55, 1, ck)), vec3(1), arrow.mul(0.8)));
		});
		const ombre = float(1).toVar(), uOmbre = U('uOmbre'), uOmbreY = U('uOmbreY', 'vec2'), uOmbreColor = U('uOmbreColor', 'color');
		if (!skip('ombre')) If(uOmbre.greaterThan(0.5), () => {
			ombre.assign(select(uOmbre.greaterThan(1.5), float(1).sub(smoothstep(0, 1, vGrad)), smoothstep(uOmbreY.x, uOmbreY.y, vRef.y.add(sin(vRef.x.mul(11)).mul(0.025)))));
			col.assign(mix(uOmbreColor, col, ombre));
		});
		const uDuo = U('uDuo');
		if (!skip('duo')) If(uDuo.greaterThan(0), () => { col.assign(mix(col, U('uDuoColor', 'color'), uDuo.mul(pow(float(1).sub(saturate(dot(normal, viewDir))), U('uDuoPow'))))); });
		const hd = normalize(cameraViewMatrix.mul(vec4(U('uHoloDirW', 'vec3'), 0)).xyz);
		if (!skip('film')) If(U('uFilm').greaterThan(0), () => {
			const fq = q.div(U('uFilmScale')), wq = fq.add(vec2(vnoise(fq.mul(0.6).add(3.1)), vnoise(fq.mul(0.6).add(8.7))).sub(0.5).mul(U('uFilmWarp')));
			film.assign(clamp(vnoise(wq).mul(0.7).add(vnoise(wq.mul(2.7).add(1.3)).mul(0.3)), 0, 1));
			const tint = U('uFilmTint');
			If(tint.greaterThan(0), () => {
				const hue = U('uFilmHue', 'vec2'), ft = spectrum(film.mul(hue.x).add(dot(reflect(viewDir.negate(), normal), hd).mul(hue.y)));
				col.assign(mix(col, col.mul(ft.mul(0.5).add(0.62)), tint));
			});
		});

		// knit: the technical face of a warp-knit tricot (wales ~26/cm, courses ~44/cm), each scale fading to its average
		const nCloth = normal.toVar();
		const uKnit = U('uKnit');
		if (!skip('knit')) If(uKnit.greaterThan(0).and(uTex.lessThan(0.5)), () => {
			const kp = vec2(0.00038, 0.00023);
			const fw = float(1).sub(smoothstep(0.3, 0.5, fp.div(kp.x))), fc = float(1).sub(smoothstep(0.3, 0.5, fp.div(kp.y)));
			const fl = float(1).sub(smoothstep(0.3, 0.5, fp.div(kp.x.mul(0.5))));
			If(fw.greaterThan(0), () => {
				const k = q.div(kp), wx = fract(k.x).sub(0.5), d = abs(wx).sub(0.25);
				const legs = mix(0.667, max(float(1).sub(d.mul(d).mul(16)), 0), fl);
				const across = float(1).sub(wx.mul(wx).mul(4)).mul(0.6).add(legs.mul(0.4));
				const cy = fract(k.y.add(abs(wx).mul(0.7))).sub(0.5);
				const along = mix(0.79, float(1).sub(cy.mul(cy).mul(2.5)), fc);
				const loop = across.mul(along);
				normal.assign(bumpN(normal, loop.mul(kp.x).mul(0.1).mul(uKnit).mul(fw)));
				col.mulAssign(loop.sub(0.53).mul(0.1).mul(uKnit).mul(fw).add(1));
			});
		});
		const uBumpAmp = U('uBumpAmp'), uBumpScale = U('uBumpScale');
		if (!skip('bump')) If(uBumpAmp.greaterThan(0), () => {
			const fade = float(1).sub(smoothstep(0.25, 0.6, fp.div(uBumpScale)));
			If(fade.greaterThan(0), () => {
				const b = q.div(uBumpScale), hgt = vnoise(b).add(vnoise(b.mul(2.13).add(5.2)).mul(0.5));
				normal.assign(bumpN(normal, hgt.mul(uBumpAmp).mul(uBumpScale).mul(fade)));
			});
		});

		// flakes: foil dots and glitter (near: a disc per hex cell with its own tilt; far: pixel-sized tilted cells)
		const uFlake = U('uFlake');
		if (!skip('flake')) If(uFlake.greaterThan(0.5), () => {
			const uPitch = U('uPitch'), uDotR = U('uDotR'), uPresence = U('uPresence'), uTilt = U('uTilt'), uBend = U('uBend'), uBlend = U('uBlend'), uGlint = U('uGlint');
			const qc = q.div(uPitch), r = fp.div(uPitch);
			const w = smoothstep(0.22, 0.6, r);
			const nearMask = float(0).toVar(), rvNear = float(0).toVar(), rvFar = float(0).toVar(), farDots = float(1).toVar();
			const nearTilt = vec3(0).toVar(), farTilt = vec3(0).toVar();
			If(w.lessThan(1), () => {
				const qn = qc.toVar(), off = vec2(9).toVar(), did = vec2(0).toVar(), unbend = mat2(1, 0, 0, 1).toVar();
				If(uBend.greaterThan(0), () => {
					const b0 = bendOf(qc, uBend);
					qn.assign(qc.add(b0));
					const ex = bendOf(qc.add(vec2(0.5, 0)), uBend).sub(b0), ey = bendOf(qc.add(vec2(0, 0.5)), uBend).sub(b0);
					// the inverse of the bend's Jacobian, I + 2 (ex, ey) (WGSL has no inverse())
					const ja = ex.x.mul(2).add(1), jb = ex.y.mul(2), jc = ey.x.mul(2), jd = ey.y.mul(2).add(1), det = ja.mul(jd).sub(jb.mul(jc));
					unbend.assign(mat2(jd.div(det), jb.negate().div(det), jc.negate().div(det), ja.div(det)));
					const g = floor(qn.div(GRAIN)), c1 = vec2(0).toVar(), c2 = vec2(0).toVar(), k1 = vec2(0).toVar(), k2 = vec2(0).toVar(), d1 = float(1e9).toVar(), d2 = float(1e9).toVar();
					// (named loops: two nested loops both declared `i` in WGSL, the inner hiding the outer)
					Loop({ start: -1, end: 1, condition: '<=', name: 'gj' }, ({ gj }) => {
						Loop({ start: -1, end: 1, condition: '<=', name: 'gi' }, ({ gi }) => {
							const k = g.add(vec2(float(gi), float(gj))), c = k.add(0.15).add(hash32(k.add(41.7)).xy.mul(0.7)).mul(GRAIN);
							const d = dot(qn.sub(c), qn.sub(c));
							If(d.lessThan(d1), () => { d2.assign(d1); c2.assign(c1); k2.assign(k1); d1.assign(d); c1.assign(c); k1.assign(k); })
								.ElseIf(d.lessThan(d2), () => { d2.assign(d); c2.assign(c); k2.assign(k); });
						});
					});
					Loop(2, ({ i: s }) => {
						const first = s.equal(0), c = select(first, c1, c2), o = select(first, c2, c1), k = select(first, k1, k2);
						const h = hash32(k.add(7.9)), a = h.x.mul(1.0472), ca = cos(a), sa = sin(a);
						const rot = mat2(ca, sa, sa.negate(), ca);
						const hk = hexCell(rot.mul(qn.sub(c)).add(h.yz.mul(9)));
						const jit = hash32(hk.zw.add(k.mul(131.7)).add(3.7)).xy.sub(0.5).mul(2).mul(max(float(0.5).sub(uDotR), 0));
						const o2 = transpose(rot).mul(hk.xy.sub(jit)), cw = qn.sub(o2);
						If(dot(cw.sub(c), cw.sub(c)).lessThanEqual(dot(cw.sub(o), cw.sub(o))).and(dot(o2, o2).lessThan(dot(off, off))), () => { off.assign(o2); did.assign(hk.zw.add(k.mul(131.7))); });
					});
				}).Else(() => {
					const hc = hexCell(qc);
					off.assign(hc.xy.sub(hash32(hc.zw.add(3.7)).xy.sub(0.5).mul(2).mul(max(float(0.5).sub(uDotR), 0))));
					did.assign(hc.zw);
				});
				const rn = hash32(did);
				nearMask.assign(float(1).sub(smoothstep(uDotR.sub(r.mul(0.7)), uDotR.add(r.mul(0.7)), length(unbend.mul(off)))).mul(step(rn.z, uPresence)));
				nearTilt.assign(hash32(did.add(17.3)).mul(2).sub(1));
				rvNear.assign(rn.x);
			});
			If(w.greaterThan(0), () => {
				const lod = max(log2(r.mul(mix(1.6, 1, uBlend))), 0), l0 = floor(lod), lf = lod.sub(l0), s0 = exp2(l0);
				const ta = hash32(floor(qc.div(s0)).add(l0.mul(7.13))), tb = hash32(floor(qc.div(s0.mul(2))).add(l0.add(1).mul(7.13)));
				farTilt.assign(mix(ta, tb, lf).mul(2).sub(1));
				rvFar.assign(ta.z);
				farDots.assign(s0.mul(s0).mul(mix(1, 4, lf)).mul(1.155).mul(uPresence));
			});
			const coverage = min(uDotR.mul(uDotR).mul(3.6276), 1).mul(uPresence);
			const farOn = select(coverage.greaterThan(0.3), coverage, step(fract(rvFar.mul(7.31)), coverage));
			const gw = select(uGlint.greaterThan(0), float(1).sub(w.mul(0.9)), float(1));
			flakeMask.assign(mix(nearMask, farOn, w).mul(gw));
			const keepT = mix(1, inverseSqrt(max(farDots, 1)), w.mul(uBlend));
			const foilA = U('uFoilRough').mul(U('uFoilRough'));
			const foilRough = sqrt(sqrt(foilA.mul(foilA).add(float(1).sub(keepT.mul(keepT)).mul(uTilt).mul(uTilt).mul(0.667))));
			const tilt = mix(nearTilt, farTilt.mul(keepT), w), rv = mix(rvNear, rvFar, w);
			const nBase = select(uBlend.greaterThan(0), nCloth, normal);
			const nF = normalize(nBase.add(tilt.sub(nBase.mul(dot(tilt, nBase))).mul(uTilt))).toVar();
			If(coverage.lessThanEqual(0.3).and(uGlint.lessThanEqual(0)), () => {
				const fv = dot(nF, viewDir);
				If(fv.lessThan(0.2), () => { nF.assign(normalize(nF.add(viewDir.mul(float(0.2).sub(fv))))); });
			});
			const fcol = mix(uOmbreColor.mul(1.8).add(0.05), U('uFoilColor', 'color'), ombre).mul(rv.sub(0.5).mul(U('uColorVar')).add(1)).toVar();
			const uHolo = U('uHolo');
			If(uHolo.greaterThan(0), () => {
				const ph = dot(reflect(viewDir.negate(), normal), hd).mul(U('uHoloFreq')).add(rv.sub(0.5).mul(U('uHoloJit'))).add(dot(tilt, hd).mul(uTilt).mul(U('uHoloJit')));
				fcol.assign(mix(fcol, spectrum(ph).mul(rv.mul(0.5).add(0.75)), uHolo));
			});
			dye.assign(col); foil.assign(fcol);
			If(uGlint.greaterThan(0), () => { foil.assign(mix(col, vec3(1), 0.5).mul(rv.sub(0.5).mul(U('uColorVar')).add(1))); })
				.Else(() => { col.assign(mix(col, fcol, flakeMask)); metal.assign(mix(metal, 1, flakeMask)); });
			rough.assign(mix(rough, foilRough, flakeMask));
			normal.assign(normalize(mix(normal, nF, mix(nearMask, select(coverage.greaterThan(0.3), float(1), farOn), w).mul(gw))));
		});

		// sheer mesh
		if (!skip('mesh')) If(U('uMesh').greaterThan(0.5), () => {
			const uMeshPitch = U('uMeshPitch'), uHoleR = U('uHoleR'), r = fp.div(uMeshPitch), hc = hexCell(q.div(uMeshPitch));
			const hole = float(1).sub(smoothstep(uHoleR.sub(r.mul(0.7)), uHoleR.add(r.mul(0.7)), length(hc.xy)));
			const ndv = saturate(dot(normal, viewDir)), openK = uHoleR.mul(uHoleR).mul(3.6276).mul(pow(ndv, 0.6));
			const a = float(1).sub(float(1).sub(mix(float(1).sub(hole), float(1).sub(openK), smoothstep(0.16, 0.45, r))).mul(openK)).toVar();
			If(U('uSeam').greaterThan(0.5), () => {
				const allow = U('uSeamAllow');
				a.assign(mix(float(1).sub(float(1).sub(a).mul(float(1).sub(a))), a, smoothstep(allow.sub(0.0006), allow.add(0.0006), vSeam)));
			});
			alpha.mulAssign(max(a, flakeMask));
		});

		// heights summed and bumped once, after the loops (derivatives inside branching loops are undefined)
		const bumpH = float(0).toVar();
		// decals: logos and lettering as print, foil, holographic foil, glitter or flock; stamps
		const uDecals = U('uDecals');
		if (!skip('decals')) for (let i = 0; i < 4; i++) {
			If(float(i).lessThan(uDecals), () => {
				const dp = decal[i].M.mul(vec4(vRef, 1)).xyz, rc = decal[i].rect, lk = decal[i].look;
				const tx = tDecal.sample(rc.xy.add(clamp(dp.xy.add(0.5), 0, 1).mul(rc.zw)));
				const mk = select(lk.x.greaterThan(4.5), float(1), tx.a).mul(step(abs(dp.x), 0.5)).mul(step(abs(dp.y), 0.5)).mul(step(abs(dp.z), 1));
				If(mk.greaterThanEqual(0.004), () => {
					const kind = lk.x;
					If(kind.greaterThan(4.5), () => {
						// surface stamps: folds in the cloth itself, no colour of their own (5 knot, 6 ruching, 7 twist knot)
						const s = dp.xy, rr = length(s), ang = atan(s.y, s.x), h = float(0).toVar(), env = float(0).toVar();
						If(kind.lessThan(5.5), () => { env.assign(float(1).sub(smoothstep(0.3, 0.5, rr))); h.assign(sin(ang.mul(14)).mul(smoothstep(0.03, 0.16, rr)).mul(env).add(float(1).sub(smoothstep(0, 0.09, rr)).mul(0.8))); })
							.ElseIf(kind.lessThan(6.5), () => { env.assign(float(1).sub(smoothstep(0.35, 0.5, abs(s.x))).mul(float(1).sub(smoothstep(0.42, 0.5, abs(s.y))))); h.assign(sin(s.y.mul(57)).mul(float(1).sub(abs(s.x).mul(1.6))).mul(env)); })
							.Else(() => { env.assign(float(1).sub(smoothstep(0.3, 0.5, rr))); h.assign(sin(ang.mul(6).add(rr.mul(34))).mul(smoothstep(0.02, 0.12, rr)).mul(env).add(float(1).sub(smoothstep(0, 0.07, rr)).mul(0.7))); });
						bumpH.addAssign(h.mul(0.0012).mul(env));
						trimAO.mulAssign(float(1).sub(env.mul(0.22).mul(clamp(h.negate(), 0, 1))));
					}).Else(() => {
						const dcol = select(lk.z.greaterThan(0.5), tx.rgb, decal[i].col).toVar(), met = float(0).toVar(), nD = normal.toVar();
						If(kind.greaterThan(0.5).and(kind.lessThan(1.5)), () => { met.assign(1); })
							.ElseIf(kind.greaterThan(1.5).and(kind.lessThan(2.5)), () => { dcol.assign(mix(dcol, spectrum(dot(reflect(viewDir.negate(), normal), hd).mul(2).add(dp.x.mul(3))), 0.75)); met.assign(1); })
							.ElseIf(kind.greaterThan(2.5).and(kind.lessThan(3.5)), () => { const tl = hash32(floor(q.div(0.0004))).mul(2).sub(1); nD.assign(normalize(normal.add(tl.sub(normal.mul(dot(tl, normal))).mul(0.45)))); met.assign(1); })
							.ElseIf(kind.greaterThan(3.5), () => { bumpH.addAssign(mk.mul(0.0003)); });
						col.assign(mix(col, dcol, mk)); metal.assign(mix(metal, met, mk)); rough.assign(mix(rough, lk.y, mk));
						normal.assign(normalize(mix(normal, nD, mk))); alpha.assign(max(alpha, mk));
					});
				});
			});
		}

		if (zone === 5) {
			// tension wrinkles: radial folds fanning out of the crotch and the armpits
			if (!skip('wrinkles')) Loop(3, ({ i }) => {
				const Z = uWrinkle.element(i), ZN = uWrinkleN.element(i), d = vRef.sub(Z.xyz), rr = length(d);
				If(ZN.w.greaterThan(0).and(rr.lessThanEqual(Z.w)), () => {
					const ax = normalize(ZN.xyz), uu = normalize(cross(vec3(0, 1, 0), ax)), vv = cross(ax, uu);
					const ang = atan(dot(d, vv), dot(d, uu));
					const env = smoothstep(0.03, 0.065, rr).mul(float(1).sub(smoothstep(Z.w.mul(0.45), Z.w, rr))).mul(float(1).sub(smoothstep(0.0015, 0.004, fp)));
					const h = sin(ang.mul(11).add(sin(rr.mul(60)).mul(0.6))).mul(env).mul(ZN.w);
					bumpH.addAssign(h.mul(0.00035));
					trimAO.mulAssign(float(1).sub(env.mul(0.1).mul(ZN.w).mul(clamp(h.negate(), 0, 1))));
				});
			});
			// folds a fit leaves (pipeline/wrap_block.py; 314 = 2 pi / 20 mm; .25 by eye)
			if (!skip('folds')) If(vFold.z.greaterThan(0.00005), () => {
				const fa = atan(vFold.y, vFold.x).mul(0.5), fd = vec2(cos(fa), sin(fa)), fs = vec2(fd.y.negate(), fd.x);
				const fu = dot(aUV, fd), fv = dot(aUV, fs);
				const wave = cos(fu.mul(314).add(sin(fv.mul(31)).mul(2.2)).add(sin(fv.mul(83).add(fu.mul(40))).mul(0.7)));
				const runs = cos(fv.mul(47).add(fu.mul(120)).add(sin(fu.mul(70)).mul(1.5))).mul(0.45).add(0.55);
				const h = wave.mul(wave).mul(sign(wave)).mul(runs), depth = smoothstep(0.0002, 0.002, vFold.z).mul(vFold.z);
				bumpH.addAssign(h.mul(depth).mul(0.25));
				trimAO.mulAssign(float(1).sub(clamp(depth.mul(45), 0, 0.16).mul(clamp(h.negate(), 0, 1))));
			});
		}
		// seams: a groove where the stitches pull the panels together, a soft ridge over the allowance
		if (!skip('seam')) If(U('uSeam').greaterThan(0.5), () => {
			const d = vSeam, fx = max(fwidth(d), 1e-6), fade = float(1).sub(smoothstep(0.0004, 0.0016, fx));
			bumpH.addAssign(exp(d.mul(d).negate().div(4.9e-7)).mul(-0.0003).add(smoothstep(0.0006, 0.003, d).mul(float(1).sub(smoothstep(0.005, 0.01, d))).mul(0.00012)).mul(fade));
			trimAO.mulAssign(mix(0.8, 1, smoothstep(0, fx.add(0.0012), d)));
		});
		if (zone === 5 && !skip('bumpH')) normal.assign(bumpN(normal, bumpH));

		// topstitching on a finished edge: coverstitch rows, or a zigzag
		if (zone === 4) {
			const fx = max(fwidth(aRim.x), 1e-6), fade = float(1).sub(smoothstep(0.00012, 0.0004, fx));
			const thread = float(0).toVar(), groove = float(0).toVar(), rows = U('uRows', 'vec2'), uZig = U('uZig');
			for (let k = 0; k < 2; k++) {
				const r = k === 0 ? rows.x : rows.y;
				If(r.greaterThan(0), () => {
					const du = abs(abs(aRim.x).sub(r)), along = fract(aRim.y.div(0.003).add(k * 0.37));
					const dash = smoothstep(0.02, 0.1, along).mul(float(1).sub(smoothstep(0.86, 0.94, along)));
					thread.assign(max(thread, float(1).sub(smoothstep(float(0.00016).sub(fx), fx.add(0.00016), du)).mul(dash).mul(fade)));
					groove.assign(max(groove, float(1).sub(smoothstep(0.0001, fx.add(0.0007), du))));
				});
			}
			If(uZig.greaterThan(0), () => {
				const tri = abs(fract(aRim.y.div(0.0014)).mul(2).sub(1)).mul(2).sub(1);
				const slope = uZig.mul(4).div(0.0014), du = abs(aRim.x.sub(tri.mul(uZig))).div(sqrt(slope.mul(slope).add(1)));
				thread.assign(float(1).sub(smoothstep(float(0.00011).sub(fx), fx.add(0.00011), du)).mul(fade));
				groove.assign(float(1).sub(smoothstep(uZig.mul(0.9), uZig.mul(1.25), abs(aRim.x))));
			});
			normal.assign(bumpN(normal, thread.mul(0.00012).sub(groove.mul(0.00018)).mul(fade)));
			col.assign(mix(col.mul(float(1).sub(groove.mul(mix(0.12, 0.3, fade)))), U('uThread', 'color'), thread));
			alpha.assign(max(alpha, thread)); metal.assign(mix(metal, 0, thread)); rough.assign(mix(rough, 0.6, thread));
		}

		// AO_FRAGMENT's occlusion (fabric spans the crevice, so it is barely shaded), with the trims' and folds' contact shading
		const ao = aCoverZone.y, vAO = mix(ao, float(1).sub(float(1).sub(ao).mul(0.3)), uGarment);
		return FabricOut(col, alpha, normal, rough, metal, vAO.mul(trimAO), flakeMask, foil, dye, film);
	});
	const out = fabric();
	m.colorNode = out.get('col'); // (TODO: the shadow pass reads colorNode's alpha and so runs the fabric function too)
	m.opacityNode = out.get('alpha');
	m.normalNode = out.get('n');
	m.roughnessNode = out.get('rough');
	m.metalnessNode = out.get('metal');
	m.aoNode = out.get('ao');
	m.userData.nodes = { out, tsl: TSL }; // (debugging: m.colorNode = out.get('ao'), m.needsUpdate = true)
	// (no customProgramCacheKey: in WebGPU it would share the node graph, and with it the first material's uniform objects,
	// between every material of the zone; WGSL that comes out the same is shared by three anyway)
	return m;
}
