// Draws the design's stones: one instanced mesh per cut (crystals share the POC's inner-reflection
// shader, now with per-stone colour and coating), plus pearls, spangles, holographic dots and
// nailheads. Stones sit on the garment surface of the body on show (lift, layer and strap height
// included), facing out, turned by their angle.
import * as THREE from 'three';
import { SHAPES, parseStone } from './library.js';
import { facetedGeometry, pearlGeometry, discGeometry, nailheadGeometry } from './shapes.js';

const ABOVE = 0.00145; // above the outermost fabric (fabric at 1.2 mm)

function crystalMaterial() {
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

export class StoneView {
	constructor(scene, man) {
		this.man = man;
		this.group = new THREE.Group();
		scene.add(this.group);
		this.geos = new Map();
		this.crystal = crystalMaterial();
		this.mats = FAMILY_MATS();
		this.meshes = [];
		this.count = 0;
		this.stones = [];
	}

	geometry(shape) {
		let g = this.geos.get(shape);
		if (!g) {
			const fam = SHAPES[shape]?.family ?? 'crystal';
			g = fam === 'pearl' ? pearlGeometry() : fam === 'spangle' ? discGeometry(0.06) : fam === 'holo-dot' ? discGeometry(0.02) : fam === 'nailhead' ? nailheadGeometry() : facetedGeometry(shape);
			this.geos.set(shape, g);
		}
		return g;
	}

	dispose() { for (const m of this.meshes) { this.group.remove(m); m.geometry.dispose(); m.dispose(); } this.meshes = []; }

	// stones: from runStones; heightAt(stone) -> extra metres above the garment surface for its layer
	set(stones, heightAt = () => 0) {
		this.stones = stones;
		this.build(heightAt);
	}

	build(heightAt = this.heightAt ?? (() => 0)) {
		this.heightAt = heightAt;
		this.dispose();
		const man = this.man;
		if (!man.garmentPos || !this.stones.length) { this.count = 0; return; }
		const G = man.garmentPos, N = man.aGNormal.array, idx = man.idx;
		const byShape = new Map();
		for (const s of this.stones) { const l = byShape.get(s.shape); if (l) l.push(s); else byShape.set(s.shape, [s]); }
		const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), n = new THREE.Vector3(), t0 = new THREE.Vector3(), b0 = new THREE.Vector3(), x = new THREE.Vector3(), y = new THREE.Vector3(), col = new THREE.Color();
		let rnd = 1;
		const R = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };
		for (const [shape, list] of byShape) {
			const fam = SHAPES[shape]?.family ?? 'crystal', aspect = SHAPES[shape]?.aspect ?? 1;
			const mat = fam === 'crystal' ? this.crystal : this.mats[fam];
			const mesh = new THREE.InstancedMesh(this.geometry(shape), mat, list.length);
			const finish = new Float32Array(list.length * 4);
			list.forEach((s, i) => {
				const sp = s.sp, b = [sp.b0, sp.b1, sp.b2];
				p.set(0, 0, 0); n.set(0, 0, 0);
				for (let k = 0; k < 3; k++) { const v = idx[sp.f * 3 + k] * 3; p.x += b[k] * G[v]; p.y += b[k] * G[v + 1]; p.z += b[k] * G[v + 2]; n.x += b[k] * N[v]; n.y += b[k] * N[v + 1]; n.z += b[k] * N[v + 2]; }
				n.normalize();
				// spangles never lie quite flat: a small random tilt makes them flash in turn
				if (fam === 'spangle') { n.x += (R() - 0.5) * 0.16; n.y += (R() - 0.5) * 0.16; n.z += (R() - 0.5) * 0.16; n.normalize(); }
				t0.set(0, 1, 0).cross(n); if (t0.lengthSq() < 1e-6) t0.set(1, 0, 0); t0.normalize();
				b0.crossVectors(n, t0);
				const a = s.angle ?? 0;
				x.copy(t0).multiplyScalar(Math.cos(a)).addScaledVector(b0, Math.sin(a));
				y.crossVectors(n, x);
				p.addScaledVector(n, ABOVE + (s.lift ?? 0) + heightAt(s));
				const d = s.size;
				m4.makeBasis(x.multiplyScalar(d), y.multiplyScalar(d * aspect), n.clone().multiplyScalar(d)).setPosition(p);
				mesh.setMatrixAt(i, m4);
				const st = parseStone(s.stone);
				col.set(st.colour);
				if (fam === 'crystal') col.multiplyScalar(0.88 + 0.12 * R());
				mesh.setColorAt(i, col);
				finish[i * 4] = st.coating === 'ab' ? 0.85 : st.coating === 'shimmer' ? 0.4 : 0;
				finish[i * 4 + 1] = st.coating === 'metallic' ? 1 : 0;
				finish[i * 4 + 2] = st.coating === 'opal' ? 1 : 0;
				finish[i * 4 + 3] = R();
			});
			mesh.geometry = mesh.geometry.clone(); // per-mesh instanced attribute
			mesh.geometry.setAttribute('aFinish', new THREE.InstancedBufferAttribute(finish, 4));
			mesh.frustumCulled = false;
			mesh.renderOrder = -8; // in front of everything: draw first and let depth reject what is behind
			mesh.userData = { shape, stones: list };
			this.group.add(mesh);
			this.meshes.push(mesh);
		}
		this.count = this.stones.length;
	}

	// counts by size (ss) and colour, for the live read-out
	stats() {
		const bySize = {}, byStone = {};
		for (const s of this.stones) {
			const mm = Math.round(s.size * 10000) / 10;
			bySize[mm] = (bySize[mm] ?? 0) + 1;
			byStone[s.stone] = (byStone[s.stone] ?? 0) + 1;
		}
		return { total: this.stones.length, bySize, byStone };
	}

	setVisible(v) { this.group.visible = v; }
}
