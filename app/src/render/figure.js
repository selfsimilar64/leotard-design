// A real person on show instead of the mannequin: a Genesis 9 figure (skin, eyes, mouth, lashes,
// brows, hair) baked by Daz Studio for one age, pose and expression (pipeline/daz/bake.py). The
// mannequin mesh is still there, carried onto the same posed body (the body's file), so the leotard
// fits it exactly as it fits any body; only the mannequin's own skin and stand are hidden.
//
// Shading is "appears correct" (knowledge: realism at 60 fps), not Iray: Daz's textures (colour,
// normal, roughness, translucency, cavity) on MeshPhysicalMaterial, with
//  - skin: diffuse light wrapped round the terminator per colour channel (red reaches furthest),
//    tinted by the translucency map: the cheap stand-in for subsurface scattering that keeps skin
//    from looking like painted plastic;
//  - a per-vertex occlusion bake (bakeOcclusion) from many directions at load: eye sockets, the
//    eyeball under the lids, nostrils, lips, ears and the mouth get the contact shadow a shadow map
//    cannot resolve. Without it the eyes and teeth glow, the main tell of a real-time face.
import * as THREE from 'three';

const BASE = (import.meta.env?.BASE_URL ?? '/') + 'figures-daz/';
// vertex attributes a figure mesh may carry (convert.py / hair.py) and their sizes
const ATTRS = { position: 3, normal: 3, uv: 2, uv1: 2, tangent: 4, fade: 1 };

export class FigureView {
	constructor(parent, renderer) {
		this.group = new THREE.Group();
		this.group.visible = false;
		parent.add(this.group);
		this.renderer = renderer;
		this.loader = new THREE.TextureLoader();
		this.textures = new Map();
		this.key = null;
		this.loading = null;
	}

	// Show the figure of body b (manifest entry with `figure`), or nothing (b without one).
	async show(b) {
		const key = b?.figure ?? null;
		if (key === this.key) { this.group.visible = !!key; return this.loading; }
		this.key = key;
		this.clear();
		if (!key) { this.group.visible = false; return; }
		this.loading = this.load(key).then(() => { this.group.visible = this.key === key; });
		return this.loading;
	}

	clear() {
		for (const m of [...this.group.children]) { m.geometry?.dispose(); this.group.remove(m); }
	}

	async load(key) {
		const [spec, bin] = await Promise.all([
			fetch(BASE + key).then((r) => r.json()),
			fetch(BASE + key.replace(/\.json$/, '.bin')).then((r) => r.arrayBuffer()),
		]);
		const mats = {}, hc = spec.materials['hair:shell']?.values.colour;
		this.hairColour = hc ? new THREE.Color().fromArray(hc) : null;
		for (const [id, m] of Object.entries(spec.materials)) mats[id] = this.material({ ...m, name: id.slice(id.indexOf(':') + 1) });
		const meshes = [];
		for (const ms of spec.meshes) {
			const g = new THREE.BufferGeometry();
			for (const [f, n] of Object.entries(ATTRS)) if (ms[f + 'Offset'] != null) g.setAttribute(f === 'fade' ? 'aFade' : f, new THREE.BufferAttribute(new Float32Array(bin, ms[f + 'Offset'], ms.vertices * n), n));
			g.setIndex(new THREE.BufferAttribute(new Uint32Array(bin, ms.indexOffset, ms.indices), 1));
			const list = [];
			ms.groups.forEach((gr, i) => { g.addGroup(gr.start, gr.count, i); list.push(mats[gr.material]); });
			const mesh = new THREE.Mesh(g, list);
			mesh.name = ms.name;
			mesh.castShadow = ms.name !== 'tear' && ms.name !== 'lashes';
			mesh.receiveShadow = true;
			mesh.frustumCulled = false;
			mesh.renderOrder = { skin: 0, mouth: 0, eyes: 1, brows: 2, lashes: 3, tear: 4, hair: 5, bun: 5, tie: 5, dazhair: 6, strands: 7 }[ms.name] ?? 0;
			meshes.push(mesh);
		}
		bakeOcclusion(this.renderer, meshes);
		const skin = meshes.find((m) => m.name === 'skin'), hair = meshes.find((m) => m.name === 'hair');
		if (skin) skin.geometry.setAttribute('aScalp', new THREE.BufferAttribute(scalpUnderHair(skin.geometry, hair?.geometry), 1));
		for (const m of meshes) this.group.add(m);
		this.spec = spec;
	}

	tex(path, srgb) {
		const k = path + (srgb ? '|s' : '');
		if (!this.textures.has(k)) {
			const t = this.loader.load(BASE + path);
			t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
			t.anisotropy = 8;
			this.textures.set(k, t);
		}
		return this.textures.get(k);
	}

	// One app material from a converted Daz material ({ part, maps, values }, convert.py).
	material(m) {
		const M = m.maps, V = m.values, name = m.name ?? '';
		const T = (k, srgb = false) => (M[k] ? this.tex(M[k], srgb) : null);
		const part = m.part;
		if (part === 'lashes' || part === 'brows') {
			// Daz tints a light hair albedo by Diffuse Color under a strong glossy layer; without that
			// layer the same tint reads grey, so the colour is set directly: brows a little darker
			// than the scene's hair, lashes near black.
			const brow = this.hairColour ? this.hairColour.clone().multiplyScalar(0.75) : new THREE.Color(0.045, 0.03, 0.022);
			const mat = new THREE.MeshStandardMaterial({
				color: part === 'lashes' ? new THREE.Color(0.03, 0.024, 0.02) : brow,
				alphaMap: T('alphaMap'), alphaTest: part === 'lashes' ? 0.25 : 0.04, alphaToCoverage: true,
				roughness: 0.6, side: THREE.DoubleSide,
				opacity: part === 'brows' ? 1.15 : 1.3, // > 1: thin strands keep their coverage at a distance (alpha to coverage)
			});
			return withOcclusion(mat, 0.6);
		}
		if (part === 'hair') return hairMaterial(T, V);
		if (part === 'strands') {
			// Daz strand hair (the Pixie cut) as thin ribbons (hair.py strand_ribbons): soft across the
			// ribbon and fading at the tip (alpha to coverage), highlight stretched across the strands
			const c = new THREE.Color().setRGB(...(V.colour ?? [0.31, 0.235, 0.2]), THREE.SRGBColorSpace);
			const mat = new THREE.MeshPhysicalMaterial({
				color: c, alphaMap: strandAlpha(), alphaTest: 0.02, alphaToCoverage: true, side: THREE.DoubleSide,
				roughness: 0.42, specularIntensity: 0.6, anisotropy: 0.8, anisotropyRotation: Math.PI / 2,
				sheen: 0.5, sheenRoughness: 0.45, sheenColor: new THREE.Color().setRGB(...(V.glossy ?? [0.67, 0.58, 0.5]), THREE.SRGBColorSpace).multiplyScalar(0.5),
			});
			return withOcclusion(mat, 0.6);
		}
		if (part === 'dazhair') {
			// a Daz hair mesh (cards / braids): its colour and cut-out maps, both sides, coverage from alpha
			const tint = V['Diffuse Color'] ? new THREE.Color().setRGB(...V['Diffuse Color'], THREE.SRGBColorSpace) : new THREE.Color(1, 1, 1);
			const mat = new THREE.MeshPhysicalMaterial({
				color: tint, map: T('map', true), alphaMap: T('alphaMap'), normalMap: T('normalMap'), bumpMap: T('bumpMap'), bumpScale: 1.5,
				alphaTest: 0.05, alphaToCoverage: true, side: THREE.DoubleSide,
				roughness: 0.5, specularIntensity: 0.5, sheen: 0.4, sheenRoughness: 0.45, sheenColor: tint.clone().multiplyScalar(0.6),
			});
			return withOcclusion(mat, 0.5);
		}
		if (part === 'tie') {
			const c = new THREE.Color().fromArray(V.colour ?? [0.05, 0.05, 0.06]);
			return withOcclusion(new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.75, sheen: 1, sheenColor: c.clone().lerp(new THREE.Color(1, 1, 1), 0.35), sheenRoughness: 0.45 }), 0.5);
		}
		if (part === 'tear') {
			// the wet line along the lower lid: reflections only, added on top
			const mat = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.08, metalness: 0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, alphaMap: T('alphaMap'), specularIntensity: 1 });
			return mat;
		}
		if (part === 'eyes' && /Moisture/i.test(m.name ?? '')) return corneaMaterial();
		// (Daz's "Ambient Occlusion Weight" map, *_SO, is a specular-occlusion mask averaging 0.07,
		// not an AO map: as aoMap it removed nearly all ambient light. Occlusion comes from aOcc.)
		const mat = new THREE.MeshPhysicalMaterial({
			map: T('map', true),
			normalMap: T('detailNormalMap') ?? T('normalMap'),
			roughnessMap: T('roughnessMap'),
			color: new THREE.Color(1, 1, 1),
		});
		const nm = V['Normal Map'];
		if (mat.normalMap) mat.normalScale.set(1, 1).multiplyScalar(typeof nm === 'number' && nm > 0 ? Math.min(nm, 1) : 1);
		if (part === 'skin') {
			// dual-lobe skin specular: mostly the sharper lobe (Daz: ratio 0.15 rough / 0.85 at 0.55x)
			mat.roughness = 0.7; mat.specularIntensity = 0.45;
			if (/Mouth Cavity/.test(name)) mat.color.setScalar(0.35);
			return skinMaterial(mat, T('sssMap', true), V['Translucency Weight'] ?? 0.85, this.hairColour);
		}
		if (part === 'eyes') {
			mat.roughness = 0.45; mat.specularIntensity = 0.2;
			// mark where the eyeball is visible: the cornea film is drawn only there (corneaMaterial)
			Object.assign(mat, { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp });
			return withOcclusion(mat, 1);
		}
		if (part === 'mouth') {
			mat.roughness = 0.55; mat.specularIntensity = 0.8;
			if (/Teeth/i.test(name)) { mat.color.setScalar(0.92); mat.clearcoat = 0.4; mat.clearcoatRoughness = 0.2; }
			return withOcclusion(mat, 1);
		}
		return mat;
	}
}

// The clear outer shell of the eye: a mirror-like film that only adds reflections (the catchlights
// that make eyes look alive); everything else shows through. Drawn only where the eyeball itself
// is the visible surface (stencil 1, written by the eye material): the shell sits a fraction of a
// millimetre outside the eyeball and, with the lids smoothed, poked through them as a glassy bubble.
function corneaMaterial() {
	return new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.03, metalness: 0, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.02,
		transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, envMapIntensity: 1.3,
		stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc, stencilZPass: THREE.KeepStencilOp, stencilWriteMask: 0 });
}

// Slicked-back hair (pipeline/daz/hair.py): a shell combed towards the bun. The look is in the
// shading: fine streaks (map, normalMap; uv.x runs along the strands), an anisotropic highlight
// stretched across the strands as on real hair (tangent = combing direction, rotated a quarter
// turn), a soft sheen, and at the hairline the shell breaks up strand by strand (aFade, 0 at the
// edge) so skin shows between the first hairs instead of a hard cap edge.
function hairMaterial(T, V) {
	const c = new THREE.Color().fromArray(V.colour ?? [0.085, 0.052, 0.032]);
	const map = T('map', true), nrm = T('normalMap');
	for (const t of [map, nrm]) if (t) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
	const mat = new THREE.MeshPhysicalMaterial({
		color: c, map, normalMap: nrm, normalScale: new THREE.Vector2(0.6, 0.6),
		roughness: 0.34, specularIntensity: 0.8, anisotropy: 0.85, anisotropyRotation: Math.PI / 2,
		sheen: 0.35, sheenRoughness: 0.4, sheenColor: c.clone().lerp(new THREE.Color(1, 0.9, 0.8), 0.25),
		alphaToCoverage: !!V.fadeEdge, transparent: false,
	});
	if (!V.fadeEdge) return withOcclusion(mat, 0.6);
	return withOcclusion(mat, 0.6, (sh) => {
		sh.vertexShader = sh.vertexShader
			.replace('#include <common>', '#include <common>\nattribute float aFade;\nvarying float vFade;')
			.replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = aFade;');
		sh.fragmentShader = sh.fragmentShader
			.replace('#include <common>', '#include <common>\nvarying float vFade;')
			.replace('#include <alphatest_fragment>', `#include <alphatest_fragment>
				{
					// strand-wise break-up of the hairline: streak brightness across the strands
					float st = texture2D( map, vec2( vMapUv.x * 0.15, vMapUv.y * 3.0 ) ).r;
					diffuseColor.a *= smoothstep( 0.0, 0.6, vFade * 1.2 + ( st - 0.8 ) * 0.6 );
					// thin hair near the edge is darker and duller (bright strand ends read as a fringe)
					diffuseColor.rgb *= mix( 0.55, 1.0, smoothstep( 0.0, 0.6, vFade ) );
				}`)
			.replace('#include <aomap_fragment>', `#include <aomap_fragment>
				reflectedLight.directSpecular *= smoothstep( 0.0, 0.7, vFade );
				reflectedLight.indirectSpecular *= mix( 0.3, 1.0, smoothstep( 0.0, 0.7, vFade ) );`);
	});
}

// Coverage across a strand ribbon (u, soft edges) and along it (v, thinning to the tip).
let _strandAlpha = null;
function strandAlpha() {
	if (_strandAlpha) return _strandAlpha;
	const W = 32, Hh = 64, d = new Uint8Array(W * Hh * 4);
	for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
		const u = (x + 0.5) / W * 2 - 1, v = (y + 0.5) / Hh, a = Math.max(0, 1 - u * u) * (1 - Math.pow(v, 3) * 0.85);
		const i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = Math.round(a * 255); d[i + 3] = 255;
	}
	_strandAlpha = new THREE.DataTexture(d, W, Hh); _strandAlpha.needsUpdate = true;
	_strandAlpha.magFilter = _strandAlpha.minFilter = THREE.LinearFilter;
	return _strandAlpha;
}

// Per-vertex occlusion (attribute aOcc, from bakeOcclusion) darkens indirect light fully and direct
// light by `direct` (eyes and teeth 1: the lids and lips shade them; skin less: shadow maps do most).
function withOcclusion(mat, direct, extra) {
	mat.onBeforeCompile = (sh) => {
		sh.uniforms.uOccDirect = { value: direct };
		sh.vertexShader = sh.vertexShader
			.replace('#include <common>', '#include <common>\nattribute float aOcc;\nvarying float vOcc;')
			.replace('#include <begin_vertex>', '#include <begin_vertex>\nvOcc = aOcc;');
		sh.fragmentShader = sh.fragmentShader
			.replace('#include <common>', '#include <common>\nvarying float vOcc;\nuniform float uOccDirect;')
			.replace('#include <aomap_fragment>', `#include <aomap_fragment>
				reflectedLight.indirectDiffuse *= vOcc;
				reflectedLight.indirectSpecular *= vOcc * vOcc;
				reflectedLight.directDiffuse *= mix(1.0, vOcc, uOccDirect);
				reflectedLight.directSpecular *= mix(1.0, vOcc * vOcc, uOccDirect);`);
		extra?.(sh);
	};
	mat.customProgramCacheKey = () => 'occ' + direct + (extra ? 'x' : '');
	return mat;
}

// Skin: diffuse light wrapped past the terminator per channel (red scatters furthest), tinted by
// Daz's translucency map, so the shadow edge glows warm instead of cutting off grey.
// The punctual-light diffuse line lives in the lights_physical_pars_fragment chunk, so the chunk is
// inlined and patched (a replace on the material's own shader text would not find it; three r186).
// Also: under the hair (aScalp, from scalpUnderHair) the skin takes the hair colour, as dense roots
// would: Daz paints the scalp pale, and it showed through the hairline's thin edge as a light band.
const DIFFUSE_LINE = 'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );';
function skinMaterial(mat, sssMap, weight, hairColour) {
	if (!THREE.ShaderChunk.lights_physical_pars_fragment.includes(DIFFUSE_LINE)) console.warn('figure skin: three.js lighting chunk changed; subsurface wrap not applied');
	return withOcclusion(mat, 0.35, (sh) => {
		sh.uniforms.uSSS = { value: sssMap };
		sh.uniforms.uSSSWeight = { value: sssMap ? weight : 0 };
		sh.uniforms.uHair = { value: hairColour ?? new THREE.Color(0, 0, 0) };
		sh.uniforms.uHairOn = { value: hairColour ? 1 : 0 };
		sh.vertexShader = sh.vertexShader
			.replace('#include <common>', '#include <common>\nattribute float aScalp;\nvarying float vScalp;')
			.replace('#include <begin_vertex>', '#include <begin_vertex>\nvScalp = aScalp;');
		sh.fragmentShader = sh.fragmentShader
			.replace('#include <common>', '#include <common>\nuniform sampler2D uSSS;\nuniform float uSSSWeight;\nuniform vec3 uHair;\nuniform float uHairOn;\nvarying float vScalp;\nvec3 gSSS;')
			.replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = mix( diffuseColor.rgb, uHair * 0.9, vScalp * uHairOn * 0.92 );')
			.replace('#include <lights_fragment_begin>', 'gSSS = texture2D(uSSS, vMapUv).rgb * uSSSWeight;\n#include <lights_fragment_begin>')
			.replace('#include <lights_physical_pars_fragment>', THREE.ShaderChunk.lights_physical_pars_fragment.replace(DIFFUSE_LINE,
				`{
					float ndl = dot( geometryNormal, directLight.direction );
					vec3 w = vec3( 0.55, 0.22, 0.12 ) * gSSS;
					vec3 wrapped = clamp( ( vec3( ndl ) + w ) / ( 1.0 + w ), 0.0, 1.0 );
					reflectedLight.directDiffuse += wrapped * directLight.color * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
				}`));
	});
}

// Per skin vertex: how much hair lies over it, from the nearest hair-shell vertex's fade: rising
// where the first hairs become visible (fade 0.08-0.35; the pale scalp showed through there, while
// a tint reaching the bare edge read as a painted shadow line), only for skin right under the shell
// (within 4-6 mm), 0 elsewhere or without hair.
function scalpUnderHair(skin, hair) {
	const n = skin.attributes.position.count, out = new Float32Array(n);
	if (!hair) return out;
	const H = hair.attributes.position.array, F = hair.attributes.aFade.array, cell = 0.008, grid = new Map();
	for (let i = 0, k = 0; i < H.length; i += 3, k++) {
		const key = Math.floor(H[i] / cell) + ',' + Math.floor(H[i + 1] / cell) + ',' + Math.floor(H[i + 2] / cell);
		if (!grid.has(key)) grid.set(key, []);
		grid.get(key).push(k);
	}
	const P = skin.attributes.position.array;
	for (let i = 0, k = 0; i < P.length; i += 3, k++) {
		const cx = Math.floor(P[i] / cell), cy = Math.floor(P[i + 1] / cell), cz = Math.floor(P[i + 2] / cell);
		let best = cell * cell, f = 0;
		for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
			for (const j of grid.get((cx + a) + ',' + (cy + b) + ',' + (cz + c)) ?? []) {
				const dx = H[j * 3] - P[i], dy = H[j * 3 + 1] - P[i + 1], dz = H[j * 3 + 2] - P[i + 2], d = dx * dx + dy * dy + dz * dz;
				if (d < best) { best = d; f = F[j]; }
			}
		}
		out[k] = best < cell * cell ? THREE.MathUtils.smoothstep(f, 0.08, 0.35) * (1 - THREE.MathUtils.smoothstep(Math.sqrt(best), 0.004, 0.006)) : 0;
	}
	return out;
}

// --- occlusion bake --------------------------------------------------------------------------------
// For each of DIRS directions, the figure's depth seen from that direction (orthographic); a vertex
// is lit from there if nothing is in front of it. Occlusion = cosine-weighted share of lit
// directions over the hemisphere of its normal. Twice: the whole figure, then the head region at
// 10x the resolution (eye sockets and lips are millimetre-scale).
const DIRS = 96;

export function bakeOcclusion(renderer, meshes) {
	const t0 = performance.now();
	const all = new THREE.Box3();
	for (const m of meshes) { m.geometry.computeBoundingBox(); all.union(m.geometry.boundingBox); }
	const head = meshes.find((m) => m.name === 'eyes')?.geometry.boundingBox;
	const passes = [{ box: all, res: 1024, bias: 0.006 }];
	if (head) {
		const c = head.getCenter(new THREE.Vector3());
		passes.push({ box: new THREE.Box3().setFromCenterAndSize(c.clone().add(new THREE.Vector3(0, -0.01, -0.02)), new THREE.Vector3(0.26, 0.3, 0.28)), res: 1024, bias: 0.0012 });
	}
	const depthMat = new THREE.ShaderMaterial({
		vertexShader: 'varying float vZ; void main(){ vec4 p = modelViewMatrix * vec4(position,1.0); vZ = -p.z; gl_Position = projectionMatrix * p; }',
		fragmentShader: 'varying float vZ; void main(){ gl_FragColor = vec4(vZ, 0.0, 0.0, 1.0); }',
		side: THREE.DoubleSide,
	});
	const scene = new THREE.Scene();
	const clones = meshes.filter((m) => m.name !== 'tear' && m.name !== 'lashes').map((m) => new THREE.Mesh(m.geometry, depthMat));
	for (const c of clones) scene.add(c);
	const radius = all.getBoundingSphere(new THREE.Sphere()).radius;
	const centre = all.getCenter(new THREE.Vector3());
	const cam = new THREE.OrthographicCamera();
	const dirs = fibonacciSphere(DIRS);
	const occ = meshes.map((m) => ({ lit: new Float32Array(m.geometry.attributes.position.count), w: new Float32Array(m.geometry.attributes.position.count) }));
	const prevTarget = renderer.getRenderTarget(), prevClear = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha();
	// which pass each vertex belongs to: the head box's vertices take the fine pass only
	const v = new THREE.Vector3();
	const mask = meshes.map((m) => {
		const P = m.geometry.attributes.position.array, k = P.length / 3, a = new Uint8Array(k), b = new Uint8Array(k);
		for (let i = 0; i < k; i++) { v.fromArray(P, i * 3); const h = passes[1]?.box.containsPoint(v); a[i] = h ? 0 : 1; b[i] = h ? 1 : 0; }
		return [a, b];
	});
	for (const pass of passes) {
		const rt = new THREE.WebGLRenderTarget(pass.res, pass.res, { type: THREE.FloatType, format: THREE.RGBAFormat, depthBuffer: true });
		const buf = new Float32Array(pass.res * pass.res * 4);
		const pc = pass.box.getCenter(new THREE.Vector3()), half = pass.box.getSize(new THREE.Vector3()).length() / 2;
		renderer.setClearColor(0x000000, 0);
		for (const d of dirs) {
			cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half;
			cam.near = 0.01; cam.far = radius * 2 + half * 2 + 1;
			cam.position.copy(pc).addScaledVector(d, radius + half + 0.5);
			cam.up.set(Math.abs(d.y) > 0.9 ? 1 : 0, Math.abs(d.y) > 0.9 ? 0 : 1, 0);
			cam.lookAt(pc); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
			renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, cam);
			renderer.readRenderTargetPixels(rt, 0, 0, pass.res, pass.res, buf);
			const e = cam.matrixWorldInverse.elements, R = pass.res, s2 = 0.5 / half;
			meshes.forEach((m, mi) => {
				const P = m.geometry.attributes.position.array, N = m.geometry.attributes.normal.array, o = occ[mi], ok = mask[mi][passes.indexOf(pass)];
				for (let i = 0, k = 0; i < P.length; i += 3, k++) {
					if (!ok[k]) continue;
					const c = N[i] * d.x + N[i + 1] * d.y + N[i + 2] * d.z;
					if (c <= 0) continue;
					const x = P[i], y = P[i + 1], z0 = P[i + 2];
					const vx = e[0] * x + e[4] * y + e[8] * z0 + e[12], vy = e[1] * x + e[5] * y + e[9] * z0 + e[13], vz = e[2] * x + e[6] * y + e[10] * z0 + e[14];
					const px = Math.floor((vx * s2 + 0.5) * R), py = Math.floor((vy * s2 + 0.5) * R);
					if (px < 0 || py < 0 || px >= R || py >= R) continue;
					const z = buf[(py * R + px) * 4];
					o.w[k] += c;
					if (z === 0 || -vz <= z + pass.bias * (1 + 1.5 * Math.sqrt(1 - c * c) / Math.max(c, 0.2))) o.lit[k] += c;
				}
			});
		}
		rt.dispose();
	}
	renderer.setRenderTarget(prevTarget); renderer.setClearColor(prevClear, prevAlpha);
	meshes.forEach((m, mi) => {
		const o = occ[mi], a = new Float32Array(o.lit.length);
		for (let k = 0; k < a.length; k++) a[k] = o.w[k] > 0 ? Math.min(1, o.lit[k] / o.w[k] * 1.08) : 1;
		smoothOcclusion(m.geometry, a);
		m.geometry.setAttribute('aOcc', new THREE.BufferAttribute(a, 1));
	});
	depthMat.dispose();
	console.info(`figure occlusion bake ${(performance.now() - t0).toFixed(0)} ms`);
}

// Average over welded neighbours twice (removes speckle from the depth-map lookups).
function smoothOcclusion(g, a) {
	const idx = g.index.array, sum = new Float32Array(a.length), cnt = new Float32Array(a.length);
	for (let it = 0; it < 2; it++) {
		sum.set(a); cnt.fill(1);
		for (let t = 0; t < idx.length; t += 3) for (let e = 0; e < 3; e++) { const i = idx[t + e], j = idx[t + (e + 1) % 3]; sum[i] += a[j]; cnt[i]++; sum[j] += a[i]; cnt[j]++; }
		for (let k = 0; k < a.length; k++) a[k] = sum[k] / cnt[k];
	}
}

function fibonacciSphere(n) {
	const out = [], g = Math.PI * (3 - Math.sqrt(5));
	for (let i = 0; i < n; i++) {
		const y = 1 - (i + 0.5) / n * 2, r = Math.sqrt(1 - y * y), t = g * i;
		out.push(new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r));
	}
	return out;
}
