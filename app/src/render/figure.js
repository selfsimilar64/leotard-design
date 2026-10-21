// A real person on show instead of the mannequin's skin (head type 'person'): Genesis 9 as Stacy
// (CaramelDream3D: her face, skin, eyes and lashes; Daz's mouth and brows, Eirgrid hair), for any
// body type, pose and expression. The leotard is unchanged: it lives on the canonical mesh, which is the same cage subdivided once.
//
// Everything is assembled from the cage the mannequin shows (body/mannequin.js cageOf):
//  - skin: the cage (plus the expression's change) subdivided twice (body/subdivide.js);
//  - eyes and mouth: their own cages for the pose (pipeline/daz/convert_bodies.py), subdivided once;
//  - lashes, brows and tear film: bound to the skin (triangle, barycentric weights, offset; Daz
//    moves them with the bones but not with the head's shape morphs, so they are re-attached);
//  - hair: baked per body and pose (arm poses use the A-pose's: the head does not move);
//  - expressions: the changes of the skin, eyes and mouth cages on the A-pose, turned with the
//    head's rotation in the pose.
//
// Shading is "appears correct" (knowledge: realism at 60 fps), not Iray: Daz's textures (colour,
// normal, roughness, translucency, cavity) on MeshPhysicalMaterial, with
//  - skin: diffuse light wrapped round the terminator per colour channel (red reaches furthest),
//    tinted by the translucency map: the cheap stand-in for subsurface scattering that keeps skin
//    from looking like painted plastic;
//  - a per-vertex occlusion bake (bakeOcclusion) from many directions: eye sockets, the eyeball
//    under the lids, nostrils, lips, ears and the mouth get the contact shadow a shadow map cannot
//    resolve. Without it the eyes and teeth glow, the main tell of a real-time face.
import * as THREE from 'three';
import { ccStencil, applyStencil, quadTriangles, readPolys } from '../body/subdivide.js';
import { vertexNormals } from '../body/mannequin.js';
import { markSkin } from './postfx.js';

const BASE = (import.meta.env?.BASE_URL ?? '/') + 'g9/';
const ORDER = { skin: 0, mouth: 0, eyes: 1, brows: 2, lashes: 3, tear: 4, dazhair: 6 };

export class FigureView {
	constructor(parent, renderer) {
		this.group = new THREE.Group();
		this.group.visible = false;
		parent.add(this.group);
		this.renderer = renderer;
		this.loader = new THREE.TextureLoader();
		this.textures = new Map();
		this.uPart = { value: 0 }; // skin: 0 all, 1 below the head, 2 the head (shared by every skin material)
		this.files = new Map(); // url -> Promise<ArrayBuffer>
		this.loaded = new Set(); // urls whose file has arrived
		this.state = null;      // what is shown: key of body, pose, expression
		this.queue = Promise.resolve();
	}

	// Show the person for opts = { man, body (manifest entry), cage, poseKey: the Daz pose whose
	// eyes, mouth and hair to use ('a-pose' for arm poses), shape: what the cage is (body and pose),
	// expression, part: 'all' | 'head' (the person's head on a mannequin body) |
	// 'body' (realistic skin under a mannequin head or none), keep: the mannequin's cut field (canonical mesh), cut: a
	// key for it }, or nothing (null). Resolves when the meshes are on show. The skin's parts are cut
	// per pixel at the head bone's skin weight one half, as the mannequin's (render/engine.js).
	show(opts) {
		if (!opts) { this.group.visible = false; this.state = null; return this.queue; }
		const key = [opts.shape, opts.poseKey, opts.expression, opts.part, opts.cut].join('|');
		if (key === this.state) { this.group.visible = true; return this.queue; }
		this.state = key;
		this.queue = this.queue.then(() => (this.state === key ? this.update(opts, key) : null)).catch((e) => console.error('figure', e));
		return this.queue;
	}

	file(path) {
		if (!this.files.has(path)) {
			const p = fetch(BASE + path).then((r) => { if (!r.ok) throw new Error(path + ': ' + r.status); return r.arrayBuffer(); });
			p.then(() => this.loaded.add(path), () => this.files.delete(path));
			this.files.set(path, p);
		}
		return this.files.get(path);
	}

	// The files the person needs for a body (manifest entry), a pose's figure files (poseKey as in
	// show) and an expression: whether they are all here, and loading them. The engine loads them
	// before it changes body or pose, so the person, the mannequin's surface and the garment change
	// in the same frame (update needs nothing else from the network).
	filesFor(body, poseKey, expression) {
		const pose = body.poses[poseKey] ? poseKey : 'a-pose';
		return ['figure.bin', body.poses[pose].figure, ...(expression && expression !== 'neutral' && body.expressions[expression] ? [body.expressions[expression]] : [])];
	}
	ready(body, poseKey, expression) { return this.filesFor(body, poseKey, expression).every((f) => this.loaded.has(f)); }
	prefetch(body, poseKey, expression) { return Promise.all(this.filesFor(body, poseKey, expression).map((f) => this.file(f))); }

	// Render topology (figure.bin), shared by every body; stencils for the skin's second level and
	// the eyes' and mouth's first.
	async topology(man) {
		if (this.topo) return this.topo;
		const F = man.manifest.figure, buf = await this.file('figure.bin');
		const S2 = ccStencil(man.vertices, new Uint8Array(man.quads.length / 4).fill(4), man.quads);
		const T2 = quadTriangles(S2.quads);
		const meshes = F.meshes.map((m) => {
			const rec = { ...m, map: new Uint32Array(buf, m.map.offset, m.map.count), uv: new Float32Array(buf, m.uv.offset, m.uv.count), index: new Uint32Array(buf, m.index.offset, m.index.count) };
			if (m.cage) { const c = readPolys(buf, m.cage); rec.stencil = ccStencil(m.cageVertices, c.sizes, c.ids); rec.tris = quadTriangles(rec.stencil.quads); }
			if (m.bind) rec.bind = { tri: new Uint32Array(buf, m.bind.tri.offset, m.bind.tri.count), bary: new Float32Array(buf, m.bind.bary.offset, m.bind.bary.count), offset: new Float32Array(buf, m.bind.offset.offset, m.bind.offset.count) };
			return rec;
		});
		return (this.topo = { S2, T2, meshes, F });
	}

	async update({ man, body, cage, poseKey, expression, shape, part = 'all', keep }, key) {
		const t0 = performance.now();
		const { S2, T2, meshes, F } = await this.topology(man);
		const pose = body.poses[poseKey] ? poseKey : 'a-pose';
		const [poseBuf, exprBuf] = await Promise.all([
			this.file(body.poses[pose].figure),
			expression && expression !== 'neutral' && body.expressions[expression] ? this.file(body.expressions[expression]) : null,
		]);
		if (this.state !== key) return;
		// per-pose positions: eyes cage, mouth cage, hair
		const moving = {};
		let o = 0;
		F.moving.forEach((part, i) => { const n = F.movingVertices[i] * 3; moving[part] = Float32Array.from(new Float32Array(poseBuf, o * 4, n)); o += n; });
		// expression: changes of the skin, eyes and mouth cages, turned with the head
		const skinCage = Float32Array.from(cage);
		if (exprBuf) {
			const q = new THREE.Quaternion().fromArray(body.poses[pose].head), v = new THREE.Vector3();
			const targets = { skin: skinCage, eyes: moving.eyes, mouth: moving.mouth };
			let e = 0;
			F.expression.forEach((part, i) => {
				const n = F.expressionVertices[i], A = targets[part], D = new Float32Array(exprBuf, e * 4, n * 3);
				for (let k = 0; k < n; k++) { v.fromArray(D, k * 3).applyQuaternion(q); A[k * 3] += v.x; A[k * 3 + 1] += v.y; A[k * 3 + 2] += v.z; }
				e += n * 3;
			});
		}
		const L1 = applyStencil(man.stencil, skinCage), L2 = applyStencil(S2, L1), N2 = new Float32Array(L2.length);
		vertexNormals(L2, T2, N2);
		// per skin vertex: the head bone's weight (where head and body part) and the mannequin's cut
		this.headW ??= applyStencil(S2, man.wHead, new Float32Array(S2.n), 1);
		const cutW = applyStencil(S2, part === 'head' || !keep ? new Float32Array(man.vertices).fill(1) : keep, new Float32Array(S2.n), 1);
		this.uPart.value = { all: 0, body: 1, head: 2 }[part];

		const mats = this.materials(body);
		const fresh = !this.meshes;
		this.meshes ??= meshes.map((m) => {
			const g = new THREE.BufferGeometry();
			g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(m.vertices * 3), 3));
			g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(m.vertices * 3), 3));
			g.setAttribute('uv', new THREE.BufferAttribute(m.uv, 2));
			g.setIndex(new THREE.BufferAttribute(m.index, 1));
			m.groups.forEach((gr, i) => g.addGroup(gr.start, gr.count, i));
			const mesh = new THREE.Mesh(g, []);
			mesh.name = m.name;
			mesh.castShadow = m.name !== 'tear' && m.name !== 'lashes';
			mesh.receiveShadow = true;
			mesh.frustumCulled = false;
			mesh.renderOrder = ORDER[m.name] ?? 0;
			return mesh;
		});
		meshes.forEach((m, i) => {
			const mesh = this.meshes[i], P = mesh.geometry.attributes.position.array, Nn = mesh.geometry.attributes.normal.array;
			let W, WN; // welded positions and normals of this part
			if (m.name === 'skin') {
				W = L2; WN = N2;
				const g = mesh.geometry;
				if (!g.attributes.aHead) {
					g.setAttribute('aHead', new THREE.BufferAttribute(Float32Array.from(m.map, (j) => this.headW[j]), 1));
					g.setAttribute('aCut', new THREE.BufferAttribute(new Float32Array(m.vertices), 1));
				}
				const C = g.attributes.aCut;
				for (let r = 0; r < m.vertices; r++) C.array[r] = cutW[m.map[r]];
				C.needsUpdate = true;
			}
			else if (m.stencil) { W = applyStencil(m.stencil, moving[m.name]); WN = new Float32Array(W.length); vertexNormals(W, m.tris, WN); }
			else if (m.bind) { W = bound(m.bind, L2, N2, T2); WN = weldedNormals(W, m); }
			else { W = moving[m.name]; WN = weldedNormals(W, m); }
			for (let r = 0; r < m.vertices; r++) {
				const j = m.map[r] * 3;
				P[r * 3] = W[j]; P[r * 3 + 1] = W[j + 1]; P[r * 3 + 2] = W[j + 2];
				Nn[r * 3] = WN[j]; Nn[r * 3 + 1] = WN[j + 1]; Nn[r * 3 + 2] = WN[j + 2];
			}
			mesh.geometry.attributes.position.needsUpdate = true; mesh.geometry.attributes.normal.needsUpdate = true;
			mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere();
			mesh.material = m.groups.map((gr) => mats[gr.material] ?? mats.fallback);
			mesh.visible = m.name === 'skin' || part !== 'body'; // eyes, mouth, lashes, brows, hair: with the head
		});
		if (fresh) for (const m of this.meshes) this.group.add(m);
		// a new expression on the same body and pose only changes the face
		const bake = shape + '|' + part;
		bakeOcclusion(this.renderer, this.meshes.filter((x) => x.visible), !fresh && this.baked === bake);
		this.baked = bake;
		if (this.state === key) this.group.visible = true;
		this.timing = performance.now() - t0;
	}

	// Centres of the eyes (for framing a face): the eyeball meshes' bounding-box centres.
	eyes() {
		const m = this.meshes?.find((x) => x.name === 'eyes');
		if (!m) return null;
		const P = m.geometry.attributes.position.array, l = new THREE.Box3(), r = new THREE.Box3(), v = new THREE.Vector3();
		for (let i = 0; i < P.length; i += 3) { v.fromArray(P, i); (v.x > 0 ? l : r).expandByPoint(v); }
		return { l: l.getCenter(new THREE.Vector3()), r: r.getCenter(new THREE.Vector3()) };
	}

	// The body's materials (built once per body): every body is baked wearing Stacy's skin, eyes and
	// lashes (pipeline/daz/bodies.py STACY), so they are used as baked.
	materials(body) {
		this.mats ??= new Map();
		if (!this.mats.has(body.key)) {
			const out = { fallback: new THREE.MeshStandardMaterial({ color: 0x888888 }) };
			for (const [id, m] of Object.entries(body.materials)) out[id] = this.material({ ...m, name: id.slice(id.indexOf(':') + 1) });
			this.mats.set(body.key, out);
		}
		return this.mats.get(body.key);
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

	// One app material from a converted Daz material ({ part, maps, values }, convert_bodies.py).
	material(m) {
		const M = m.maps, V = m.values, name = m.name ?? '';
		const T = (k, srgb = false) => (M[k] ? this.tex(M[k], srgb) : null);
		const part = m.part;
		if (part === 'lashes' || part === 'brows') {
			// Daz tints a light hair albedo by Diffuse Color under a strong glossy layer; without that
			// layer the same tint reads grey, so the colour is set directly: brows dark brown, lashes
			// near black.
			const mat = new THREE.MeshStandardMaterial({
				color: part === 'lashes' ? new THREE.Color(0.03, 0.024, 0.02) : new THREE.Color(0.045, 0.03, 0.022),
				alphaMap: T('alphaMap'), alphaTest: part === 'lashes' ? 0.25 : 0.04, alphaToCoverage: true,
				roughness: 0.6, side: THREE.DoubleSide,
				opacity: part === 'brows' ? 1.15 : 1.3, // > 1: thin strands keep their coverage at a distance (alpha to coverage)
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
		if (part === 'tear') {
			// the wet line along the lower lid: reflections only, added on top
			return new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.08, metalness: 0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, alphaMap: T('alphaMap'), specularIntensity: 1 });
		}
		if (part === 'eyes' && /Moisture/i.test(name)) return corneaMaterial();
		// (Daz's "Ambient Occlusion Weight" map, *_SO, is a specular-occlusion mask averaging 0.07,
		// not an AO map: as aoMap it removed nearly all ambient light. Occlusion comes from aOcc.)
		const mat = new THREE.MeshPhysicalMaterial({
			map: T('map', true),
			// (Stacy's skin puts a greyscale micro-detail roughness image in Daz's Detail Normal slot:
			// read as a normal map it covered her in bumps; her own normal map is used instead)
			normalMap: (/rough/i.test(M.detailNormalMap ?? '') ? null : T('detailNormalMap')) ?? T('normalMap'),
			roughnessMap: T('roughnessMap'),
			color: new THREE.Color(1, 1, 1),
		});
		const nm = V['Normal Map'];
		if (mat.normalMap) mat.normalScale.set(1, 1).multiplyScalar(typeof nm === 'number' && nm > 0 ? Math.min(nm, 1) : 1);
		if (part === 'skin') {
			// dual-lobe skin specular: mostly the sharper lobe (Daz: ratio 0.15 rough / 0.85 at 0.55x)
			mat.roughness = 0.7; mat.specularIntensity = 0.45;
			if (/Mouth Cavity/.test(name)) mat.color.setScalar(0.35);
			const skin = skinMaterial(mat, T('sssMap', true), V['Translucency Weight'] ?? 0.85, this.uPart);
			if (!/Mouth Cavity/.test(name)) markSkin(skin); // subsurface scattering pass (render/postfx.js)
			return skin;
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

// Followers bound to the skin: barycentric point of their skin triangle plus the offset along the
// interpolated normal.
function bound({ tri, bary, offset }, S, N, T) {
	const n = offset.length, out = new Float32Array(n * 3);
	for (let k = 0; k < n; k++) {
		const t = tri[k] * 3, a = T[t] * 3, b = T[t + 1] * 3, c = T[t + 2] * 3, w0 = bary[k * 3], w1 = bary[k * 3 + 1], w2 = bary[k * 3 + 2];
		let nx = w0 * N[a] + w1 * N[b] + w2 * N[c], ny = w0 * N[a + 1] + w1 * N[b + 1] + w2 * N[c + 1], nz = w0 * N[a + 2] + w1 * N[b + 2] + w2 * N[c + 2];
		const l = Math.hypot(nx, ny, nz) || 1, d = offset[k] / l;
		for (let i = 0; i < 3; i++) out[k * 3 + i] = w0 * S[a + i] + w1 * S[b + i] + w2 * S[c + i];
		out[k * 3] += nx * d; out[k * 3 + 1] += ny * d; out[k * 3 + 2] += nz * d;
	}
	return out;
}

// Normals of an unsubdivided part on its welded vertices (UV seams do not show): its render
// triangles mapped back to welded vertices.
function weldedNormals(W, m) {
	if (!m.welded) { m.welded = new Uint32Array(m.index.length); for (let i = 0; i < m.index.length; i++) m.welded[i] = m.map[m.index[i]]; }
	const out = new Float32Array(W.length);
	vertexNormals(W, m.welded, out);
	return out;
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
const DIFFUSE_LINE = 'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );';
function skinMaterial(mat, sssMap, weight, uPart) {
	if (!THREE.ShaderChunk.lights_physical_pars_fragment.includes(DIFFUSE_LINE)) console.warn('figure skin: three.js lighting chunk changed; subsurface wrap not applied');
	return withOcclusion(mat, 0.35, (sh) => {
		sh.uniforms.uSSS = { value: sssMap };
		sh.uniforms.uSSSWeight = { value: sssMap ? weight : 0 };
		sh.uniforms.uPart = uPart;
		sh.vertexShader = sh.vertexShader
			.replace('#include <common>', '#include <common>\nattribute float aHead;\nattribute float aCut;\nvarying float vHead;\nvarying float vCut;')
			.replace('#include <begin_vertex>', '#include <begin_vertex>\nvHead = aHead;\nvCut = aCut;');
		sh.fragmentShader = sh.fragmentShader
			.replace('#include <common>', '#include <common>\nuniform sampler2D uSSS;\nuniform float uSSSWeight;\nuniform float uPart;\nvarying float vHead;\nvarying float vCut;\nvec3 gSSS;')
			.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n\tif ( vCut < 0.0 || ( uPart == 1.0 && vHead > 0.5 ) || ( uPart == 2.0 && vHead < 0.5 ) ) discard;')
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

// --- occlusion bake --------------------------------------------------------------------------------
// For each of DIRS directions, the figure's depth seen from that direction (orthographic); a vertex
// is lit from there if nothing is in front of it. Occlusion = cosine-weighted share of lit
// directions over the hemisphere of its normal. Twice: the whole figure, then the head region at
// 10x the resolution (eye sockets and lips are millimetre-scale). headOnly: only the head pass (an
// expression changes nothing else); the other vertices keep their last values.
// Depth is packed into 8-bit RGBA (a quarter of the bytes of a float target to read back) and each
// pass only visits its own vertices: together about 3x faster than float depth over every vertex.
const DIRS = 96;

export function bakeOcclusion(renderer, meshes, headOnly = false) {
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
		uniforms: { uFar: { value: 1 } },
		vertexShader: 'varying float vZ; void main(){ vec4 p = modelViewMatrix * vec4(position,1.0); vZ = -p.z; gl_Position = projectionMatrix * p; }',
		// depth / far in [0, 1) packed base 255 into four bytes (0 = nothing there)
		fragmentShader: `uniform float uFar; varying float vZ; void main(){
			float d = clamp(vZ / uFar, 1e-6, 0.999999);
			vec4 e = fract(d * vec4(1.0, 255.0, 65025.0, 16581375.0));
			e -= e.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);
			gl_FragColor = e; }`,
		side: THREE.DoubleSide,
	});
	const scene = new THREE.Scene();
	// see-through parts cast nothing: the tear film, the lashes, and the eyes' clear cornea shell (the
	// additive groups of the eyes mesh). The shell sits about a millimetre in front of the iris, and
	// on Stacy's eyes that was beyond the bias: the iris baked black.
	const skip = new THREE.MeshBasicMaterial({ visible: false });
	const clones = meshes.filter((m) => m.name !== 'tear' && m.name !== 'lashes')
		.map((m) => new THREE.Mesh(m.geometry, Array.isArray(m.material) && m.geometry.groups.length ? m.material.map((x) => (x.blending === THREE.AdditiveBlending ? skip : depthMat)) : depthMat));
	for (const c of clones) scene.add(c);
	const radius = all.getBoundingSphere(new THREE.Sphere()).radius;
	const cam = new THREE.OrthographicCamera();
	const dirs = fibonacciSphere(DIRS);
	const prevTarget = renderer.getRenderTarget(), prevClear = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha();
	// each pass's vertices per mesh: the head box's vertices take the fine pass only
	const v = new THREE.Vector3();
	const lists = meshes.map((m) => {
		const P = m.geometry.attributes.position.array, k = P.length / 3, a = [], b = [];
		for (let i = 0; i < k; i++) { v.fromArray(P, i * 3); (passes[1]?.box.containsPoint(v) ? b : a).push(i); }
		return [Uint32Array.from(a), Uint32Array.from(b)];
	});
	const occ = meshes.map((m) => ({ lit: new Float32Array(m.geometry.attributes.position.count), w: new Float32Array(m.geometry.attributes.position.count) }));
	passes.forEach((pass, pi) => {
		if (headOnly && pi === 0) return;
		const rt = new THREE.WebGLRenderTarget(pass.res, pass.res, { type: THREE.UnsignedByteType, format: THREE.RGBAFormat, depthBuffer: true });
		const buf = new Uint8Array(pass.res * pass.res * 4);
		const pc = pass.box.getCenter(new THREE.Vector3()), half = pass.box.getSize(new THREE.Vector3()).length() / 2;
		renderer.setClearColor(0x000000, 0);
		for (const d of dirs) {
			cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half;
			cam.near = 0.01; cam.far = radius * 2 + half * 2 + 1;
			depthMat.uniforms.uFar.value = cam.far;
			cam.position.copy(pc).addScaledVector(d, radius + half + 0.5);
			cam.up.set(Math.abs(d.y) > 0.9 ? 1 : 0, Math.abs(d.y) > 0.9 ? 0 : 1, 0);
			cam.lookAt(pc); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
			renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, cam);
			renderer.readRenderTargetPixels(rt, 0, 0, pass.res, pass.res, buf);
			const e = cam.matrixWorldInverse.elements, R = pass.res, s2 = 0.5 / half, far = cam.far;
			meshes.forEach((m, mi) => {
				const P = m.geometry.attributes.position.array, N = m.geometry.attributes.normal.array, o = occ[mi], list = lists[mi][pi];
				for (let q = 0; q < list.length; q++) {
					const k = list[q], i = k * 3;
					const c = N[i] * d.x + N[i + 1] * d.y + N[i + 2] * d.z;
					if (c <= 0) continue;
					const x = P[i], y = P[i + 1], z0 = P[i + 2];
					const vx = e[0] * x + e[4] * y + e[8] * z0 + e[12], vy = e[1] * x + e[5] * y + e[9] * z0 + e[13], vz = e[2] * x + e[6] * y + e[10] * z0 + e[14];
					const px = Math.floor((vx * s2 + 0.5) * R), py = Math.floor((vy * s2 + 0.5) * R);
					if (px < 0 || py < 0 || px >= R || py >= R) continue;
					const t = (py * R + px) * 4;
					const z = (buf[t] + buf[t + 1] / 255 + buf[t + 2] / 65025 + buf[t + 3] / 16581375) / 255 * far;
					o.w[k] += c;
					if (z === 0 || -vz <= z + pass.bias * (1 + 1.5 * Math.sqrt(1 - c * c) / Math.max(c, 0.2))) o.lit[k] += c;
				}
			});
		}
		rt.dispose();
	});
	renderer.setRenderTarget(prevTarget); renderer.setClearColor(prevClear, prevAlpha);
	meshes.forEach((m, mi) => {
		const o = occ[mi], raw = m.userData.occRaw ??= new Float32Array(o.lit.length).fill(1);
		const update = (k) => { raw[k] = o.w[k] > 0 ? Math.min(1, o.lit[k] / o.w[k] * 1.08) : 1; };
		if (!headOnly) for (const k of lists[mi][0]) update(k);
		for (const k of lists[mi][1]) update(k);
		const a = Float32Array.from(raw);
		smoothOcclusion(m.geometry, a);
		m.geometry.setAttribute('aOcc', new THREE.BufferAttribute(a, 1));
	});
	depthMat.dispose();
	console.info(`figure occlusion bake${headOnly ? ' (head)' : ''} ${(performance.now() - t0).toFixed(0)} ms`);
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
