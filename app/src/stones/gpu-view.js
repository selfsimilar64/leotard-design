// A stone pattern's stones placed on the GPU (knowledge/engineering/architecture/gpu-stone-placement.md). The CPU decides which
// stones are kept and where on the flat cloth (stones/pattern.js keepPattern: packed arrays); the GPU puts each on the body.
// Per piece, an atlas: the piece's flat triangles drawn with their flat place as position into four float targets holding,
// per texel, where that point of the flat piece is on the body on show (lifted off it as StoneView.frameOf lifts a stone), its
// normal, and the body directions of flat +u and +v. A stone's vertex shader reads its four nearest texels (those on the
// piece only) and builds its frame there, as StoneView.build does on the CPU. A pattern's mirrored half (a paired piece, a
// group mirrored to both sides) has its own atlas: the same flat triangles, their corners at their mirror points.
// Twin of the CPU path: stones/view.js StoneView.build / frameOf; keep the two frames alike.
import * as THREE from 'three';
import { SHAPES, parseStone } from './library.js';
import { RENDERER } from '../render/webgpu.js';
import { AtlasNode, placedNode, nodeTwin } from './stones-node.js';
import { StorageInstancedBufferAttribute, IndirectStorageBufferAttribute } from 'three/webgpu';
import { GpuKeep, GPU_FLAGS } from './gpu-keep.js';

// Whether patterns can be kept on the GPU here (stones/gpu-keep.js): the WebGPU view with its device up. A page can turn it off
// to compare with the CPU twin (window.__cpuKeep = true).
// Called after every GPU keep run, those the keeper starts by itself too (laid again bigger, every round): the flat view paints from
// the same buffers (ui/FlatView.jsx Stack).
export const keptHooks = new Set();
export function gpuKeepOn(renderer) { return RENDERER === 'webgpu' && !!renderer?.backend?.device && !globalThis.__cpuKeep; }

// The texel: a millimetre, coarser only on a piece over a metre across (1024 texels at most).
const TEXEL = 0.001, MAX_TEXELS = 1024;

const ATLAS_VS = /* glsl */ `
precision highp float;
in vec2 aFlat; in vec3 aPos, aNrm, aTu, aTv;
uniform vec4 uBox; // x0, y0, 1 / width, 1 / height (metres)
out vec3 vP, vN, vU, vV;
void main() {
	vP = aPos; vN = aNrm; vU = aTu; vV = aTv;
	gl_Position = vec4((aFlat - uBox.xy) * uBox.zw * 2. - 1., 0., 1.);
}`;
const ATLAS_FS = /* glsl */ `
precision highp float;
in vec3 vP, vN, vU, vV;
layout(location = 0) out vec4 oP;
layout(location = 1) out vec4 oN;
layout(location = 2) out vec4 oU;
layout(location = 3) out vec4 oV;
void main() { oP = vec4(vP, 1.); oN = vec4(vN, 1.); oU = vec4(vU, 1.); oV = vec4(vV, 1.); }`;

// What a stone's vertex shader adds: its frame from the atlas. aStone: u, v (flat metres), its angle (a direction on the flat
// cloth, or a round stone's spin about StoneView's basis), its diameter (less than nothing: a round stone).
const PLACE_VS = /* glsl */ `
uniform highp sampler2D uAtP, uAtN, uAtU, uAtV;
uniform vec3 uAt; // the atlas's x0, y0 (flat metres), texels a metre
uniform float uAspect;
attribute vec4 aStone;
attribute vec3 aColour;
mat4 stoneM;
void placeStone() {
	ivec2 sz = textureSize(uAtP, 0);
	vec2 f = (aStone.xy - uAt.xy) * uAt.z - 0.5;
	ivec2 i0 = clamp(ivec2(floor(f)), ivec2(0), sz - 2);
	vec2 w = clamp(f - vec2(i0), 0., 1.);
	vec4 P = vec4(0.), N = vec4(0.), U = vec4(0.), V = vec4(0.);
	float K = 0.;
	for (int k = 0; k < 4; k++) {
		ivec2 o = ivec2(k & 1, k >> 1), q = i0 + o;
		vec4 p = texelFetch(uAtP, q, 0);
		// (bilinear over the texels on the piece only: one off its edge holds nothing)
		float wt = ((o.x == 1 ? w.x : 1. - w.x) * (o.y == 1 ? w.y : 1. - w.y) + 1e-4) * p.w;
		P += wt * p; N += wt * texelFetch(uAtN, q, 0); U += wt * texelFetch(uAtU, q, 0); V += wt * texelFetch(uAtV, q, 0); K += wt;
	}
	if (K <= 0.) { stoneM = mat4(0.); return; } // (no part of the piece here: not drawn)
	vec3 p = P.xyz / K, n = normalize(N.xyz), x;
	float d = abs(aStone.w), a = aStone.z;
	if (aStone.w < 0.) {
		// a round stone: its spin about t0 = (0, 1, 0) x n, b0 = n x t0, as StoneView.build
		vec3 t = vec3(n.z, 0., -n.x);
		float tl = length(t);
		t = tl < 1e-3 ? vec3(1., 0., 0.) : t / tl;
		x = t * cos(a) + cross(n, t) * sin(a);
	} else {
		vec3 D = cos(a) * U.xyz + sin(a) * V.xyz;
		x = normalize(D - n * dot(n, D));
	}
	vec3 y = cross(n, x);
	stoneM = mat4(vec4(x * d, 0.), vec4(y * d * uAspect, 0.), vec4(n * d, 0.), vec4(p, 1.));
}`;

// A material that places its stones from the atlas: the same look (its onBeforeCompile first), instanceMatrix's part done by
// stoneM, the colour per stone from aColour. (Also compiled at the start for every stone family: render/warmup.js, a twin
// of PackView.side's set-up.)
export function placed(material, uniforms) {
	const was = material.onBeforeCompile;
	material.onBeforeCompile = (shader, r) => {
		was?.call(material, shader, r);
		Object.assign(shader.uniforms, uniforms);
		shader.vertexShader = shader.vertexShader
			.replace('#include <common>', '#include <common>\n' + PLACE_VS)
			.replace('#include <beginnormal_vertex>', `placeStone();
				#include <beginnormal_vertex>
				{ mat3 im = mat3( stoneM ); objectNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) ); objectNormal = im * objectNormal; }`)
			.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = ( stoneM * vec4( transformed, 1. ) ).xyz;')
			.replace('#include <color_vertex>', '#include <color_vertex>\nvColor.rgb = aColour;')
			// (the crystal's table axis: stones/view.js crystalMaterial)
			.replace('vAxis = normalize( normalMatrix * vec3( 0., 0., 1. ) );', 'vAxis = normalize( normalMatrix * ( mat3( stoneM ) * vec3( 0., 0., 1. ) ) );');
	};
	material.defines = { ...(material.defines ?? {}), USE_COLOR: '' };
	const key = material.customProgramCacheKey?.() ?? '';
	material.customProgramCacheKey = () => 'placed-stone|' + key;
	return material;
}

// A piece's atlas, for one side: corner(q, w1, w2, P, N) puts a point of triangle q on the body, as a stone there would sit.
export class Atlas {
	constructor(renderer) {
		this.renderer = renderer;
		this.rt = null;
		// WebGPU: rendered by its twin, stones/stones-node.js AtlasNode (one target at a time); placed stones read it there
		this.node = RENDERER === 'webgpu' ? new AtlasNode(renderer) : null;
		this.mat = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: ATLAS_VS, fragmentShader: ATLAS_FS, uniforms: { uBox: { value: new THREE.Vector4() } }, side: THREE.DoubleSide, depthTest: false, depthWrite: false });
		this.geo = new THREE.BufferGeometry();
		this.mesh = new THREE.Mesh(this.geo, this.mat);
		this.mesh.frustumCulled = false;
		this.scene = new THREE.Scene();
		this.scene.add(this.mesh);
		this.cam = new THREE.OrthographicCamera();
		this.uniforms = { uAtP: { value: null }, uAtN: { value: null }, uAtU: { value: null }, uAtV: { value: null }, uAt: { value: new THREE.Vector3() } };
	}

	build(piece, corner) {
		const I = piece.piece.I, uv = piece.uv, n = piece.n;
		const F = new Float32Array(n * 6), Pp = new Float32Array(n * 9), Nn = new Float32Array(n * 9), Tu = new Float32Array(n * 9), Tv = new Float32Array(n * 9);
		const P = [0, 0, 0], N = [0, 0, 0], W = [[0, 0], [1, 0], [0, 1]];
		let m = 0;
		for (let q = 0; q < n; q++) {
			if (Number.isNaN(piece.inv[q * 6])) continue; // (a triangle with no flat area: ClothPiece marks it so)
			const o3 = m * 9;
			let ok = true;
			for (let c = 0; c < 3; c++) {
				const l = I[q * 3 + c];
				F[m * 6 + c * 2] = uv[l * 2]; F[m * 6 + c * 2 + 1] = uv[l * 2 + 1];
				if (!corner(q, W[c][0], W[c][1], P, N)) { ok = false; break; }
				Pp.set(P, o3 + c * 3); Nn.set(N, o3 + c * 3);
			}
			if (!ok) continue;
			// the body directions of flat +u and +v on this triangle: [e1 e2] = [Tu Tv] [f1 f2]
			const f1u = F[m * 6 + 2] - F[m * 6], f1v = F[m * 6 + 3] - F[m * 6 + 1], f2u = F[m * 6 + 4] - F[m * 6], f2v = F[m * 6 + 5] - F[m * 6 + 1], det = f1u * f2v - f2u * f1v || 1e-20;
			for (let k = 0; k < 3; k++) {
				const e1 = Pp[o3 + 3 + k] - Pp[o3 + k], e2 = Pp[o3 + 6 + k] - Pp[o3 + k], tu = (e1 * f2v - e2 * f1v) / det, tv = (e2 * f1u - e1 * f2u) / det;
				for (let c = 0; c < 3; c++) { Tu[o3 + c * 3 + k] = tu; Tv[o3 + c * 3 + k] = tv; }
			}
			m++;
		}
		const geo = this.geo;
		geo.setAttribute('aFlat', new THREE.BufferAttribute(F.subarray(0, m * 6), 2));
		geo.setAttribute('aPos', new THREE.BufferAttribute(Pp.subarray(0, m * 9), 3));
		geo.setAttribute('aNrm', new THREE.BufferAttribute(Nn.subarray(0, m * 9), 3));
		geo.setAttribute('aTu', new THREE.BufferAttribute(Tu.subarray(0, m * 9), 3));
		geo.setAttribute('aTv', new THREE.BufferAttribute(Tv.subarray(0, m * 9), 3));
		geo.setDrawRange(0, m * 3);
		// the target: the piece's box and two texels round it
		const span = Math.max(piece.x1 - piece.x0, piece.y1 - piece.y0), t = Math.max(TEXEL, span / (MAX_TEXELS - 4));
		const x0 = piece.x0 - 2 * t, y0 = piece.y0 - 2 * t, w = Math.ceil((piece.x1 - piece.x0) / t) + 4, h = Math.ceil((piece.y1 - piece.y0) / t) + 4;
		if (this.node) { this.node.render({ aFlat: geo.attributes.aFlat, aPos: geo.attributes.aPos, aNrm: geo.attributes.aNrm, aTu: geo.attributes.aTu, aTv: geo.attributes.aTv }, { x0, y0, w, h, t }); return; }
		if (!this.rt || this.rt.width !== w || this.rt.height !== h) {
			this.rt?.dispose();
			this.rt = new THREE.WebGLRenderTarget(w, h, { count: 4, type: THREE.FloatType, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false, generateMipmaps: false });
		}
		this.mat.uniforms.uBox.value.set(x0, y0, 1 / (w * t), 1 / (h * t));
		const r = this.renderer, was = r.getRenderTarget(), col = r.getClearColor(new THREE.Color()), alpha = r.getClearAlpha();
		r.setRenderTarget(this.rt);
		r.setClearColor(0x000000, 0);
		r.clear(true, false, false);
		r.render(this.scene, this.cam);
		r.setRenderTarget(was);
		r.setClearColor(col, alpha);
		const T = this.rt.textures, U = this.uniforms;
		U.uAtP.value = T[0]; U.uAtN.value = T[1]; U.uAtU.value = T[2]; U.uAtV.value = T[3];
		U.uAt.value.set(x0, y0, 1 / t);
	}

	dispose() { this.rt?.dispose(); this.geo.dispose(); this.mat.dispose(); this.node?.dispose(); }
}

// A stone's colour and coating, once per name (StoneView's finishOf, same numbers).
const finishes = new Map(), _col = new THREE.Color();
function finishOf(name) {
	let f = finishes.get(name);
	if (!f) {
		const st = parseStone(name);
		_col.set(st.colour);
		f = { r: _col.r, g: _col.g, b: _col.b, ab: st.coating === 'ab' ? 0.85 : st.coating === 'shimmer' ? 0.4 : 0, metal: st.coating === 'metallic' ? 1 : 0, opal: st.coating === 'opal' ? 1 : 0 };
		finishes.set(name, f);
	}
	return f;
}

// The stones of the packed pattern groups (stones/generators.js: a pattern's kept stones, packed), drawn from their atlases.
// view: the StoneView (its geometries, its materials' recipes, frameOf for the atlases' corners).
export class PackView {
	constructor(view, renderer) {
		this.view = view;
		this.renderer = renderer;
		this.group = new THREE.Group();
		view.group.add(this.group);
		this.sides = new Map(); // pack id + side -> { atlas, mesh, piece, geoRev }
		this.keepers = new Map(); // pack id -> its GpuKeep (stones/gpu-keep.js), for the packs kept on the GPU
		this.packs = [];
	}

	// packs: [{ id, gen, shape, layer, piece, k: { n, U, V, A, D, H, stone }, own, mirrored, mirrorSP(sp), mirrorFit(fit) }]; a pack
	// kept on the GPU has gpu (stones/pattern.js patternGpu) instead, and its k only when something on the CPU asks for it
	set(packs) {
		this.packs = packs;
		const used = new Set(), kept = new Set();
		for (const p of packs) {
			const gpu = p.gpu && this.renderer.backend?.device ? p.gpu : null;
			for (const side of [p.own ? 'own' : null, p.mirrored ? 'mirror' : null]) {
				if (!side) continue;
				const key = p.gen + '|' + side;
				used.add(key);
				let S = this.sides.get(key);
				if (!S || S.shape !== p.shape || S.gpu !== !!gpu) { if (S) this.drop(key); S = this.side(key, p.shape, !!gpu); }
				if (S.piece !== p.piece) { S.piece = p.piece; S.stale = true; }
				S.pack = p;
				if (S.stale) this.atlas(S, side === 'mirror');
				if (!gpu) this.fill(S, p, side === 'mirror');
			}
			if (gpu && (p.own || p.mirrored)) { kept.add(p.gen); this.keep(p); }
		}
		for (const key of [...this.sides.keys()]) if (!used.has(key)) this.drop(key);
		for (const [gen, K] of this.keepers) if (!kept.has(gen)) { K.dispose(); this.keepers.delete(gen); }
	}
	// A pack kept on the GPU (stones/gpu-keep.js): its keeper given what changed, its sides' buffers sized to what it lays, run. Run
	// again by the keeper when it must lay again bigger, or with every round (again).
	keep(p) {
		const gpu = p.gpu;
		let K = this.keepers.get(p.gen);
		if (!K) this.keepers.set(p.gen, (K = new GpuKeep(this.renderer.backend.device)));
		gpu.keeper = K;
		// (and the patterns after it on its piece, which keep clear of its stones)
		K.again = () => {
			if (!this.packs.includes(p) || this.keepers.get(p.gen) !== K) return;
			this.keep(p);
			for (const q of this.packs.slice(this.packs.indexOf(p) + 1)) if (q.gpu && q.piece === p.piece && q.gpu.blockers) this.keep(q);
		};
		gpu.mods.palette ??= paletteOf(gpu.mods.names);
		K.setLay(gpu.lay); K.setMods(gpu.mods); K.setRasters(gpu.room, gpu.D, gpu.edges);
		// a group made symmetric, cut to one side or erased: the cut (stones/generators.js packOfGroup's filter)
		const f = p.filter;
		if (f) {
			const marks = f.marks ? (f.marksF ??= Float32Array.from(f.marks.flatMap((q) => [q.p.x, q.p.y, q.p.z, q.r]))) : null;
			K.setFilter({ flags: (f.sym ? 1 : 0) | (f.side === 'left' ? 2 : f.side === 'right' ? 4 : 0), ras: f.rasters(), marks });
		} else K.setFilter(null);
		K.setBlockers(...this.blockersOf(gpu.blockers));
		const out = [];
		for (const side of [p.own ? 'own' : null, p.mirrored ? 'mirror' : null]) if (side) out.push({ ...this.room(this.sides.get(p.gen + '|' + side), K.cap), mirror: side === 'mirror' });
		const fam = SHAPES[p.shape]?.family ?? 'crystal';
		K.run({ ...gpu.frame, edges: gpu.edges, flags: gpu.frame.flags | (fam === 'crystal' ? GPU_FLAGS.crystal : 0) }, out);
		for (const f of keptHooks) f();
	}

	// The patterns before this one on its piece (stones/generators.js blockersFrom), as the GPU keep's blockers: one kept on the GPU
	// from its own side's buffers (laid before this one, in this frame's order), the rest's stones from the CPU (ownFlat). -> [sources, cpu]
	blockersOf(B) {
		if (!B) return [null, null];
		const src = [], cpu = [], be = this.renderer.backend;
		for (const l of B.lists) {
			const S = l.pack && l.gpu && this.keepers.has(l.gen) ? this.sides.get(l.gen + '|own') ?? this.sides.get(l.gen + '|mirror') : null;
			if (S?.gpu && S.ind && S.geo.attributes.aStone) { src.push({ buf: be.get(S.geo.attributes.aStone).buffer, ind: be.get(S.ind).buffer, cap: S.cap }); continue; }
			const o = B.flat(l);
			for (let j = 0; j < o.U.length; j++) cpu.push(o.U[j], o.V[j], o.D[j], 0);
		}
		return [src, cpu.length ? Float32Array.from(cpu) : null];
	}

	// A GPU-kept side's instance buffers, room for n candidates, as three's vertex buffers the GPU keep writes the kept stones
	// into, packed, and its indirect draw, whose instance count the GPU keep sets. -> { stone, colour, finish, ind, indexCount }
	room(S, n) {
		const geo = S.geo, be = this.renderer.backend;
		if (!S.ind) {
			S.ind = new IndirectStorageBufferAttribute(new Uint32Array(8), 8); // (the draw's five words, then word 5: the GPU keep's gate)
			geo.setIndirect(S.ind);
			be.createIndirectStorageAttribute(S.ind);
		}
		if (S.cap < n) {
			S.cap = Math.ceil(Math.max(n, 32) * 1.25);
			for (const name of ['aStone', 'aColour', 'aFinish']) {
				const old = geo.attributes[name];
				const a = new StorageInstancedBufferAttribute(new Float32Array(S.cap * 4), 4);
				geo.setAttribute(name, a);
				be.createStorageAttribute(a);
				if (old) this.freeAttribute(old);
			}
		}
		geo.instanceCount = n;
		S.mesh.visible = n > 0;
		const A = geo.attributes;
		return { stone: be.get(A.aStone).buffer, colour: be.get(A.aColour).buffer, finish: be.get(A.aFinish).buffer, ind: be.get(S.ind).buffer, indexCount: geo.index ? geo.index.count : A.position.count };
	}
	// a GPU-kept side's storage attribute's buffer, given back (three's record of it too, if it drew with it)
	freeAttribute(a) {
		if (!a?.isStorageInstancedBufferAttribute && !a?.isIndirectStorageBufferAttribute) return;
		const R = this.renderer._attributes;
		if (R?.has?.(a)) R.delete(a); else this.renderer.backend.destroyAttribute?.(a);
	}

	// The body has moved (a pose, a re-fit, a new garment): every atlas again.
	again() {
		for (const S of this.sides.values()) if (S.pack) this.atlas(S, S.mirror);
	}

	// (render/warmup.js builds the same material and geometry once per stone family at the start: change both)
	side(key, shape, gpu = false) {
		const fam = SHAPES[shape]?.family ?? 'crystal', base = this.view.geometry(shape), geo = new THREE.InstancedBufferGeometry();
		geo.index = base.index;
		for (const [name, a] of Object.entries(base.attributes)) geo.setAttribute(name, a);
		const atlas = new Atlas(this.renderer), uniforms = { ...atlas.uniforms, uAspect: { value: SHAPES[shape]?.aspect ?? 1 } };
		const material = atlas.node
			? placedNode(fam === 'crystal' ? this.view.newCrystal() : nodeTwin(this.view.mats[fam].clone()), atlas.node, SHAPES[shape]?.aspect ?? 1)
			: placed(fam === 'crystal' ? this.view.newCrystal() : this.view.mats[fam].clone(), uniforms);
		const mesh = new THREE.Mesh(geo, material);
		mesh.frustumCulled = false;
		mesh.renderOrder = -8; // (as StoneView's: in front of everything)
		this.group.add(mesh);
		const S = { key, shape, fam, atlas, mesh, geo, cap: 0, piece: null, stale: true, mirror: false, gpu };
		this.sides.set(key, S);
		return S;
	}

	drop(key) {
		const S = this.sides.get(key);
		if (!S) return;
		this.group.remove(S.mesh);
		S.mesh.material.dispose();
		for (const n of ['aStone', 'aColour', 'aFinish']) { this.freeAttribute(S.geo.attributes[n]); S.geo.deleteAttribute(n); }
		if (S.ind) this.freeAttribute(S.ind);
		S.atlas.dispose();
		this.sides.delete(key);
	}

	atlas(S, mirror) {
		const p = S.pack, view = this.view, st = { sp: null, fit: undefined, lift: 0, layer: p.layer };
		S.mirror = mirror;
		S.atlas.build(p.piece, (q, w1, w2, P, N) => {
			let sp = p.piece.spOf(q, w1, w2), fit = p.piece.fitOf?.(q, w1, w2);
			if (mirror) { sp = p.mirrorSP(sp); fit = fit ? p.mirrorFit?.(fit) ?? undefined : undefined; }
			st.sp = sp; st.fit = fit;
			view.frameOf(st, 'crystal', P, N);
			return Number.isFinite(P[0]);
		});
		S.stale = false;
	}

	fill(S, p, mirror) {
		const k = p.k, n = k.n, geo = S.geo;
		if (S.cap < n) {
			S.cap = Math.ceil(Math.max(n, 32) * 1.5);
			geo.setAttribute('aStone', new THREE.InstancedBufferAttribute(new Float32Array(S.cap * 4), 4).setUsage(THREE.DynamicDrawUsage));
			geo.setAttribute('aColour', new THREE.InstancedBufferAttribute(new Float32Array(S.cap * 3), 3).setUsage(THREE.DynamicDrawUsage));
			geo.setAttribute('aFinish', new THREE.InstancedBufferAttribute(new Float32Array(S.cap * 4), 4).setUsage(THREE.DynamicDrawUsage));
		}
		const A = geo.attributes.aStone.array, C = geo.attributes.aColour.array, F = geo.attributes.aFinish.array, crystal = S.fam === 'crystal';
		for (let j = 0; j < n; j++) {
			// a mirrored copy's own random and spin, as stones/generators.js mirrored
			const h = k.H[j], r = mirror ? (h * 7.13 + 0.37) % 1 : h, round = Number.isNaN(k.A[j]);
			A[j * 4] = k.U[j]; A[j * 4 + 1] = k.V[j];
			A[j * 4 + 2] = round ? (mirror ? Math.PI - h * Math.PI : h * Math.PI) : k.A[j];
			A[j * 4 + 3] = round ? -k.D[j] : k.D[j];
			const f = finishOf(k.stone[j]), g = crystal ? 0.88 + 0.12 * ((r * 31.7) % 1) : 1;
			C[j * 3] = f.r * g; C[j * 3 + 1] = f.g * g; C[j * 3 + 2] = f.b * g;
			F[j * 4] = f.ab; F[j * 4 + 1] = f.metal; F[j * 4 + 2] = f.opal; F[j * 4 + 3] = r;
		}
		for (const name of ['aStone', 'aColour', 'aFinish']) { const a = geo.attributes[name]; a.clearUpdateRanges(); a.addUpdateRange(0, n * a.itemSize); a.needsUpdate = true; }
		geo.instanceCount = n;
		S.mesh.visible = n > 0;
	}

	// (a GPU-kept pack's count is the GPU's, read back a frame or so late: stones/generators.js packOfGroup)
	get count() { let c = 0; for (const p of this.packs) c += p.count; return c; }
}

// A pack's crystals as the GPU keep's palette (stones/gpu-keep.js WRITE): per name r, g, b, AB; metallic, opal, 0, 0.
function paletteOf(names) {
	const out = new Float32Array(Math.max(1, names.length) * 8);
	names.forEach((name, i) => { const f = finishOf(name); out.set([f.r, f.g, f.b, f.ab, f.metal, f.opal, 0, 0], i * 8); });
	return out;
}
