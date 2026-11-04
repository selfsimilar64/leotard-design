// Draws the design's stones: one instanced mesh per cut (crystals share the POC's inner-reflection
// shader, now with per-stone colour and coating), plus pearls, spangles, holographic dots and
// nailheads. Stones sit on the garment surface of the body on show (lift, layer and strap height
// included), facing out, turned by their angle.
import * as THREE from 'three';
import { SHAPES, parseStone } from './library.js';
import { facetedGeometry, pearlGeometry, discGeometry, nailheadGeometry } from './shapes.js';
import { PackView } from './gpu-view.js';
import { RENDERER } from '../render/webgpu.js';
import { crystalNodeMaterial } from './stones-node.js';

const ABOVE = 0.00145; // above the outermost fabric (fabric at 1.2 mm)

// (WebGPU: its node twin, stones/stones-node.js crystalNodeMaterial)
function crystalMaterial() {
	if (RENDERER === 'webgpu') return crystalNodeMaterial();
	const u = { uInner: { value: 1.5 }, uGlint: { value: 7 }, uGlintPow: { value: 260 } };
	const m = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.12, metalness: 0, ior: 1.6, iridescence: 1, iridescenceIOR: 1.9, iridescenceThicknessRange: [200, 480] });
	m.userData.u = u;
	m.onBeforeCompile = (shader) => {
		Object.assign(shader.uniforms, u);
		shader.vertexShader = shader.vertexShader
			.replace('#include <common>', '#include <common>\nvarying vec3 vAxis;\nvarying vec4 vFinish;\nattribute vec4 aFinish;')
			.replace('#include <defaultnormal_vertex>', /* glsl */`#include <defaultnormal_vertex>
				#ifdef USE_INSTANCING
					vAxis = normalize( normalMatrix * ( mat3( instanceMatrix ) * vec3( 0., 0., 1. ) ) );
				#else
					vAxis = normalize( normalMatrix * vec3( 0., 0., 1. ) );
				#endif
				vFinish = aFinish;`);
		shader.fragmentShader = shader.fragmentShader
			.replace('#include <common>', '#include <common>\nvarying vec3 vAxis;\nvarying vec4 vFinish;\nuniform float uInner, uGlint, uGlintPow;')
			// per-stone coating: AB / shimmer drive the thin-film iridescence; metallic coats are mirrors
			.replace('#include <lights_physical_fragment>', /* glsl */`#include <lights_physical_fragment>
				#ifdef USE_IRIDESCENCE
					material.iridescence = vFinish.x * .6;
				#endif`)
			.replace('#include <lights_fragment_end>', /* glsl */`#include <lights_fragment_end>
			{
				// vFinish: x = AB (0..1), y = metallic coat, z = opal milkiness, w = random per stone
				vec3 V = normalize( vViewPosition );
				vec3 A = normalize( vAxis );
				vec3 Nx = normalize( mix( A, normal, .4 ) ); // light mostly leaves through the table
				// exaggerate each facet's lean: the contrast between bright and dark facets reads as crystal
				vec3 Nw = normalize( normal + ( normal - A * dot( normal, A ) ) * 1.1 );
				#ifdef USE_COLOR
					vec3 tint = vColor.rgb;
				#else
					vec3 tint = vec3( 1. );
				#endif
				float fres = .05 + .95 * pow( 1. - saturate( dot( normal, V ) ), 5. );
				vec3 inner = vec3( 0. );
				for ( int c = 0; c < 3; c ++ ) {
					float ior = c == 0 ? 1.57 : ( c == 1 ? 1.6 : 1.645 );
					vec3 dout = refract( reflect( refract( - V, Nw, 1. / ior ), A ), - Nx, ior );
					if ( dot( dout, dout ) < .5 ) dout = reflect( - V, A ); // total internal reflection
					float e = 0.;
					#ifdef ENVMAP_TYPE_CUBE_UV
						vec3 wd = envMapRotation * transformDirectionByInverseViewMatrix( dout, viewMatrix );
						e = textureCubeUV( envMap, wd, .04 )[ c ];
						e = ( e * e * 1.6 / ( e + .35 ) + textureCubeUV( envMap, wd, .6 )[ c ] * .45 ) * envMapIntensity;
					#endif
					#if NUM_POINT_LIGHTS > 0
						IncidentLight il;
						for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
							getPointLightInfo( pointLights[ i ], geometryPosition, il );
							e += il.color[ c ] * pow( saturate( dot( dout, il.direction ) ), uGlintPow ) * uGlint;
						}
					#endif
					inner[ c ] = e;
				}
				if ( vFinish.x > 0. ) {
					// Aurora Borealis: each facet takes a pastel hue that drifts with the view angle
					float ph = dot( normal, V ) * 1.9 + dot( normal, A ) * 1.3 + vFinish.w;
					inner *= mix( vec3( 1. ), .68 + .5 * cos( 6.2832 * ( ph + vec3( 0., .33, .67 ) ) ), vFinish.x );
				}
				float glass = 1. - vFinish.y;
				reflectedLight.indirectSpecular += inner * tint * ( 1. - fres ) * uInner * glass * ( 1. - .6 * vFinish.z );
				// metallic coat: a tinted mirror; opal: a milky glow of the tint
				reflectedLight.indirectSpecular += inner * tint * vFinish.y * 1.2;
				reflectedLight.indirectDiffuse += tint * vFinish.z * .35;
				// a glint is bright, never infinite: keep half-float targets (and the bloom) finite
				reflectedLight.indirectSpecular = min( reflectedLight.indirectSpecular, vec3( 60. ) );
				reflectedLight.directSpecular = min( reflectedLight.directSpecular, vec3( 60. ) );
			}`);
	};
	m.customProgramCacheKey = () => 'leotard-crystal-v2';
	return m;
}

const FAMILY_MATS = () => ({
	pearl: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.28, sheen: 0.6, sheenColor: new THREE.Color(0xfff2e6), clearcoat: 0.6, clearcoatRoughness: 0.2, iridescence: 0.35, iridescenceIOR: 1.5 }),
	spangle: new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.14, iridescenceIOR: 2.1, iridescenceThicknessRange: [300, 760] }),
	// a holographic film scatters light over a wide cone (a diffraction grating), so it reads bright
	// from most angles: rough metal, a little rainbow
	'holo-dot': new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.42, iridescence: 0.55, iridescenceIOR: 2.2, iridescenceThicknessRange: [250, 900] }),
	nailhead: new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.16 }),
});

// A stone's colour and coating, once per name.
const finishes = new Map();
const _col = new THREE.Color();
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

export class StoneView {
	constructor(scene, man) {
		this.man = man;
		this.group = new THREE.Group();
		scene.add(this.group);
		this.geos = new Map();
		this.crystal = crystalMaterial();
		this.mats = FAMILY_MATS();
		this.meshes = new Map(); // shape -> InstancedMesh, kept and refilled (grown when it must)
		this.count = 0;
		this.records = [];  // the stones laid on the CPU, drawn here
		this.packs = [];    // the patterns the GPU places (stones/gpu-view.js PackView)
		this.run = null;    // the run they came from: every stone as a record, when asked (stones)
		this.renderer = null; // (set by the engine: the GPU's patterns draw their atlases with it)
		this.placedDirty = false;
	}

	// Every stone as a record (picking, hover rings): the packs' made when first asked for.
	get stones() { return this.run ? this.run.stones : this.records; }

	newCrystal() { return crystalMaterial(); }

	geometry(shape) {
		let g = this.geos.get(shape);
		if (!g) {
			const fam = SHAPES[shape]?.family ?? 'crystal';
			g = fam === 'pearl' ? pearlGeometry() : fam === 'spangle' ? discGeometry(0.06) : fam === 'holo-dot' ? discGeometry(0.02) : fam === 'nailhead' ? nailheadGeometry() : facetedGeometry(shape);
			this.geos.set(shape, g);
		}
		return g;
	}

	meshFor(shape, n) {
		let mesh = this.meshes.get(shape);
		if (mesh && mesh.userData.cap >= n) return mesh;
		if (mesh) { this.group.remove(mesh); mesh.geometry.dispose(); mesh.dispose(); }
		const fam = SHAPES[shape]?.family ?? 'crystal', cap = Math.ceil(Math.max(n, 32) * 1.5);
		mesh = new THREE.InstancedMesh(this.geometry(shape), fam === 'crystal' ? this.crystal : this.mats[fam], cap);
		mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
		mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
		mesh.geometry = mesh.geometry.clone(); // per-mesh instanced attribute
		const finish = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
		finish.setUsage(THREE.DynamicDrawUsage);
		mesh.geometry.setAttribute('aFinish', finish);
		if (RENDERER === 'webgpu') {
			// the crystal's node twin reads its tint and table axis per stone (stones/stones-node.js)
			mesh.geometry.setAttribute('aColour', mesh.instanceColor);
			mesh.geometry.setAttribute('aAxis', new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage));
		}
		mesh.frustumCulled = false;
		mesh.renderOrder = -8; // in front of everything: draw first and let depth reject what is behind
		mesh.userData = { shape, cap };
		this.group.add(mesh);
		this.meshes.set(shape, mesh);
		return mesh;
	}

	// records: the CPU's stones; heightAt(stone) -> extra metres above the garment surface for its layer; packs: the patterns the
	// GPU places; run: their run (stones/generators.js runOf)
	set(records, heightAt = () => 0, packs = [], run = null) {
		this.records = records; this.packs = packs; this.run = run;
		this.build(heightAt, false);
		if (this.renderer && (packs.length || this.packView)) (this.packView ??= new PackView(this, this.renderer)).set(packs);
		this.count = this.man.garmentPos ? this.records.length + (this.packView?.count ?? 0) : 0;
	}

	// Where a stone sits on the body on show: position and normal, written to P and N.
	frameOf(s, fam, P, N) {
		// on a fitted garment's fabric where it lies (render/fitted.js frameAt), when the stone knows its fitted triangle
		if (s.fit && this.fitAt?.(s.fit, P, N)) {
			const up = ABOVE + (s.lift ?? 0) + this.heightAt(s);
			P[0] += N[0] * up; P[1] += N[1] * up; P[2] += N[2] * up;
			return;
		}
		const man = this.man, G = man.garmentPos, A = man.aGNormal.array, idx = man.idx, sp = s.sp, f = sp.f * 3, b0 = sp.b0, b1 = sp.b1, b2 = sp.b2;
		const v0 = idx[f] * 3, v1 = idx[f + 1] * 3, v2 = idx[f + 2] * 3;
		let nx = b0 * A[v0] + b1 * A[v1] + b2 * A[v2], ny = b0 * A[v0 + 1] + b1 * A[v1 + 1] + b2 * A[v2 + 1], nz = b0 * A[v0 + 2] + b1 * A[v1 + 2] + b2 * A[v2 + 2];
		let l = Math.hypot(nx, ny, nz) || 1;
		nx /= l; ny /= l; nz /= l;
		// spangles never lie quite flat: a small random tilt makes them flash in turn
		if (fam === 'spangle') { const r = s.r ?? 0.5; nx += (((r * 137.13) % 1) - 0.5) * 0.16; ny += (((r * 271.77) % 1) - 0.5) * 0.16; nz += (((r * 419.31) % 1) - 0.5) * 0.16; l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l; }
		const up = ABOVE + (s.lift ?? 0) + this.heightAt(s);
		P[0] = b0 * G[v0] + b1 * G[v1] + b2 * G[v2] + nx * up; P[1] = b0 * G[v0 + 1] + b1 * G[v1 + 1] + b2 * G[v2 + 1] + ny * up; P[2] = b0 * G[v0 + 2] + b1 * G[v1 + 2] + b2 * G[v2 + 2] + nz * up;
		N[0] = nx; N[1] = ny; N[2] = nz;
	}

	// again: the body has moved under them (a pose, a re-fit, the garment re-cut): the GPU's atlases too
	build(heightAt = this.heightAt ?? (() => 0), again = true) {
		this.heightAt = heightAt;
		this.placedDirty = true;
		if (again && this.packView) this.packView.again();
		const shown = new Set();
		if (this.man.garmentPos && this.records.length) {
			const byShape = new Map(), P = [0, 0, 0], N = [0, 0, 0];
			for (const s of this.records) { const l = byShape.get(s.shape); if (l) l.push(s); else byShape.set(s.shape, [s]); }
			for (const [shape, list] of byShape) {
				const fam = SHAPES[shape]?.family ?? 'crystal', aspect = SHAPES[shape]?.aspect ?? 1, n = list.length;
				const mesh = this.meshFor(shape, n), M = mesh.instanceMatrix.array, C = mesh.instanceColor.array, attr = mesh.geometry.attributes.aFinish, F = attr.array;
				const axis = mesh.geometry.attributes.aAxis, X = axis?.array; // (WebGPU: the table axis, n)
				for (let i = 0; i < n; i++) {
					const s = list[i], o = i * 16, d = s.size, a = s.angle ?? 0, ca = Math.cos(a), sa = Math.sin(a);
					this.frameOf(s, fam, P, N);
					const nx = N[0], ny = N[1], nz = N[2];
					// t0 = (0, 1, 0) x n, b0 = n x t0
					let tx = nz, tz = -nx, tl = Math.hypot(tx, tz);
					if (tl < 1e-3) { tx = 1; tz = 0; tl = 1; }
					tx /= tl; tz /= tl;
					const bx = ny * tz, by = nz * tx - nx * tz, bz = -ny * tx;
					const xx = tx * ca + bx * sa, xy = by * sa, xz = tz * ca + bz * sa;
					const yx = ny * xz - nz * xy, yy = nz * xx - nx * xz, yz = nx * xy - ny * xx, dy = d * aspect;
					M[o] = xx * d; M[o + 1] = xy * d; M[o + 2] = xz * d; M[o + 3] = 0;
					M[o + 4] = yx * dy; M[o + 5] = yy * dy; M[o + 6] = yz * dy; M[o + 7] = 0;
					M[o + 8] = nx * d; M[o + 9] = ny * d; M[o + 10] = nz * d; M[o + 11] = 0;
					M[o + 12] = P[0]; M[o + 13] = P[1]; M[o + 14] = P[2]; M[o + 15] = 1;
					if (X) { X[i * 3] = nx; X[i * 3 + 1] = ny; X[i * 3 + 2] = nz; }
					const f = finishOf(s.stone), r = s.r ?? 0.5, k = fam === 'crystal' ? 0.88 + 0.12 * ((r * 31.7) % 1) : 1;
					C[i * 3] = f.r * k; C[i * 3 + 1] = f.g * k; C[i * 3 + 2] = f.b * k;
					F[i * 4] = f.ab; F[i * 4 + 1] = f.metal; F[i * 4 + 2] = f.opal; F[i * 4 + 3] = r;
				}
				mesh.count = n;
				mesh.visible = true;
				mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; attr.needsUpdate = true;
				if (axis) axis.needsUpdate = true;
				shown.add(shape);
			}
		}
		for (const [shape, mesh] of this.meshes) if (!shown.has(shape)) { mesh.count = 0; mesh.visible = false; }
		this.count = this.man.garmentPos ? this.records.length + (this.packView?.count ?? 0) : 0;
	}

	// Each stone's place and normal as vectors, for picking and the hover rings: made when first asked
	// for after a change, not on every frame of a drag.
	ensurePlaced() {
		if (!this.placedDirty || !this.man.garmentPos) return;
		this.placedDirty = false;
		const P = [0, 0, 0], N = [0, 0, 0];
		for (const s of this.stones) {
			this.frameOf(s, SHAPES[s.shape]?.family ?? 'crystal', P, N);
			s.at = new THREE.Vector3(P[0], P[1], P[2]); s.up = new THREE.Vector3(N[0], N[1], N[2]);
		}
	}

	// counts by size (ss) and colour, for the live read-out
	stats() {
		const bySize = {}, byStone = {};
		let total = 0;
		const add = (size, stone, times) => {
			const mm = Math.round(size * 10000) / 10;
			bySize[mm] = (bySize[mm] ?? 0) + times;
			byStone[stone] = (byStone[stone] ?? 0) + times;
			total += times;
		};
		for (const s of this.records) add(s.size, s.stone, 1);
		for (const p of this.packs) { const k = p.k, t = (p.own ? 1 : 0) + (p.mirrored ? 1 : 0); for (let j = 0; j < k.n; j++) add(k.D[j], k.stone[j], t); }
		return { total, bySize, byStone };
	}

	setVisible(v) { this.group.visible = v; }
}
