// Crystals and spangles: instanced geometry, their materials, and the placement patterns.
//
// A flat-back crystal is a faceted glass dome over a mirror. The material draws two things per
// facet: the ordinary surface reflection (stock three.js), and an "inner" reflection injected
// below: the view ray is refracted into the stone, mirrored off the flat back, refracted out
// and used to look up the environment and the point lights. Doing it once per colour channel
// with a slightly different refractive index gives the coloured fire. This is a look-alike, not
// a ray tracer: each stone costs three environment lookups and no geometry beyond 32 triangles.
import * as THREE from 'three';
import { swooshPoint, swooshHalfWidth, NECK_FRONT, REF } from './body.js';

// Stone sizes ("ss") to diameter in metres.
export const SS = { 6: 0.002, 10: 0.0028, 12: 0.0031, 16: 0.0039, 20: 0.0047, 30: 0.0064 };
const LIFT = 0.00145; // above the garment surface, just over the outermost fabric layer (uOffset in fabric.js)

function facetedGeometry(tris) {
	const pos = [], nrm = [];
	const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
	for (const t of tris) {
		a.fromArray(t[0]); b.fromArray(t[1]); c.fromArray(t[2]);
		n.subVectors(b, a).cross(c.clone().sub(a)).normalize();
		if (n.z < 0) { n.negate(); [b.x, b.y, b.z, c.x, c.y, c.z] = [c.x, c.y, c.z, b.x, b.y, b.z]; }
		pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
		for (let i = 0; i < 3; i++) nrm.push(n.x, n.y, n.z);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
	return g;
}

// Unit radius, axis +z: octagonal table, 8 upper facets, 16 lower facets down to a 16-gon girdle.
export function crystalGeometry() {
	const T = [], G = [], H = 0.74, TR = 0.52, tris = [];
	for (let i = 0; i < 8; i++) { const a = (2 * i + 1) * Math.PI / 8; T.push([TR * Math.cos(a), TR * Math.sin(a), H]); }
	for (let j = 0; j < 16; j++) { const a = j * Math.PI / 8; G.push([Math.cos(a), Math.sin(a), 0]); }
	for (let i = 0; i < 8; i++) {
		const t0 = T[i], t1 = T[(i + 1) % 8];
		tris.push([[0, 0, H], t0, t1]);
		tris.push([t0, G[2 * i], G[2 * i + 1]], [t0, G[2 * i + 1], G[(2 * i + 2) % 16]]);
		tris.push([t0, G[(2 * i + 2) % 16], t1]);
	}
	return facetedGeometry(tris);
}

export function spangleGeometry() {
	const tris = [], N = 14;
	for (let i = 0; i < N; i++) {
		const a0 = i * 2 * Math.PI / N, a1 = (i + 1) * 2 * Math.PI / N;
		tris.push([[0, 0, 0.04], [Math.cos(a0), Math.sin(a0), 0.04], [Math.cos(a1), Math.sin(a1), 0.04]]);
	}
	return facetedGeometry(tris);
}

function crystalMaterial() {
	const u = { uAB: { value: 0 }, uInner: { value: 1.5 }, uGlint: { value: 7 }, uGlintPow: { value: 260 } };
	const m = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.12, metalness: 0, ior: 1.6 });
	m.userData.u = u;
	m.onBeforeCompile = (shader) => {
		Object.assign(shader.uniforms, u);
		shader.vertexShader = shader.vertexShader
			.replace('#include <common>', '#include <common>\nvarying vec3 vAxis;\nvarying float vRnd;')
			.replace('#include <defaultnormal_vertex>', /* glsl */`#include <defaultnormal_vertex>
				#ifdef USE_INSTANCING
					vAxis = normalize( normalMatrix * ( mat3( instanceMatrix ) * vec3( 0., 0., 1. ) ) );
					vRnd = fract( sin( float( gl_InstanceID ) * 12.9898 ) * 43758.5453 );
				#else
					vAxis = normalize( normalMatrix * vec3( 0., 0., 1. ) );
					vRnd = 0.;
				#endif`);
		shader.fragmentShader = shader.fragmentShader
			.replace('#include <common>', '#include <common>\nvarying vec3 vAxis;\nvarying float vRnd;\nuniform float uAB, uInner, uGlint, uGlintPow;')
			.replace('#include <lights_fragment_end>', /* glsl */`#include <lights_fragment_end>
			{
				vec3 V = normalize( vViewPosition );
				vec3 A = normalize( vAxis );
				vec3 Nx = normalize( mix( A, normal, .4 ) ); // light mostly leaves through the table
				// Exaggerate each facet's lean so neighbouring facets look at very different parts of the
				// room: that contrast between bright and dark facets is what reads as "crystal".
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
						// Sharp mirror image plus a blurred copy: light that has bounced around inside
						// the stone, which is what keeps real crystals from having black facets.
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
				if ( uAB > 0. ) {
					// Aurora Borealis: each facet takes a pastel hue that drifts with the view angle.
					float ph = dot( normal, V ) * 1.9 + dot( normal, A ) * 1.3 + vRnd;
					inner *= mix( vec3( 1. ), .68 + .5 * cos( 6.2832 * ( ph + vec3( 0., .33, .67 ) ) ), uAB );
				}
				reflectedLight.indirectSpecular += inner * tint * ( 1. - fres ) * uInner;
			}`);
	};
	m.customProgramCacheKey = () => 'leotard-crystal';
	return m;
}

export const FINISHES = {
	'Crystal': { tint: 0xffffff },
	'Crystal AB': { tint: 0xffffff, ab: 0.85 },
	'Colour-matched': { tint: 'body' },
	'Colour-matched AB': { tint: 'body', ab: 0.6 },
	'Gold': { tint: 0xffc04a },
	'Jet': { tint: 0x2c2e36 },
	'Spangles, silver': { spangle: true, tint: 0xe9ebf2 },
	'Spangles, gold': { spangle: true, tint: 0xf2c060 },
	'Spangles, holographic': { spangle: true, tint: 0xf2f2f2, holo: 1 },
};

// ---------------------------------------------------------------------------------------------
// Placement. Every pattern returns [{ p, n, d }]: surface point, normal, stone diameter.
//
// Patterns are laid out in reference-body coordinates (body.js, REF) and resolved to surface
// points on that body, then evaluated on whichever body is shown: a motif sits in the same place
// on the child and the adult, scaled with the body, while the stones keep their real sizes.

function rng(seed) { // mulberry32
	return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// pt = body.point(...) result: { p, n, cover, keep }. Stones stay off the finished edges
// (body.edgeKeepOut, set from trim.js), as makers keep them off elastic.
const onFabric = (body, pt, margin = body.edgeKeepOut ?? 0.004) => pt.cover > margin && !(body.clip && pt.keep < 0.002);

// Walk a polyline of surface points and drop a stone every gapK * diameter of true distance on
// the current body: the "pen stroke".
function stroke(body, out, poly, size, gapK = 1.13) {
	let carry = 0, prev = null;
	for (const pt of poly) {
		if (!pt) { prev = null; carry = 0; continue; }
		if (prev) {
			const seg = prev.p.distanceTo(pt.p);
			let s = carry;
			while (s <= seg) {
				const t = seg > 0 ? s / seg : 0;
				const q = { p: prev.p.clone().lerp(pt.p, t), n: prev.n.clone().lerp(pt.n, t).normalize(), cover: prev.cover + (pt.cover - prev.cover) * t, keep: prev.keep + (pt.keep - prev.keep) * t };
				const d = typeof size === 'function' ? size(q) : size;
				if (onFabric(body, q)) out.push({ p: q.p, n: q.n, d });
				s += d * gapK;
			}
			carry = s - seg;
		}
		prev = pt;
	}
}

const resolve = (body, sp) => (sp ? body.point(sp) : null);
const front = (body, pts, back = false) => pts.map(([x, y]) => resolve(body, body.projectFront(x, y, back)));
// Current body's size relative to the reference body, for spacings laid out in reference metres.
const scaleOf = (body) => body.body.stature / body.bodies[REF].stature;

function edges(body, style) {
	// Two rows just inside the finished edge: offsets from the opening (roughly metres of the cover field).
	const out = [], N = NECK_FRONT, k = body.edgeKeepOut ?? 0.004, o1 = k + 0.0025, o2 = k + 0.0077;
	for (const [o, d] of [[o1, SS[16]], [o2, SS[10]]]) {
		const arc = [];
		for (let i = 0; i <= 500; i++) { const a = Math.PI * (1.02 + 0.96 * i / 500); arc.push([N.cx + (N.rx + o) * Math.cos(a), N.cy + (N.ry + o) * Math.sin(a)]); }
		stroke(body, out, front(body, arc), d);
	}
	// Cuff rows: the sleeve's cover field is (0.95 - armT) * 0.5 (regions() in body.js).
	if (style.sleeves === 'long') for (const side of [1, -1]) for (const [t, d] of [[0.95 - 2 * o1, SS[16]], [0.95 - 2 * o2, SS[10]]]) {
		stroke(body, out, body.armRing(side, t).map((sp) => resolve(body, sp)), d);
	}
	return out;
}

function swoosh(body) {
	const out = [];
	const edge = (sign, extra) => {
		const pts = [];
		for (let i = 0; i <= 700; i++) {
			const t = i / 700, c = swooshPoint(t), c2 = swooshPoint(Math.min(t + 0.002, 1)), c1 = swooshPoint(Math.max(t - 0.002, 0));
			const tx = c2[0] - c1[0], ty = c2[1] - c1[1], l = Math.hypot(tx, ty), o = (swooshHalfWidth(t) + extra) * sign;
			pts.push([c[0] - ty / l * o, c[1] + tx / l * o]);
		}
		return front(body, pts);
	};
	// A thick line built from three rows of graded size on one edge, a single row on the other.
	stroke(body, out, edge(1, 0.0036), SS[20]);
	stroke(body, out, edge(1, 0.0086), SS[12]);
	stroke(body, out, edge(1, 0.0124), SS[6]);
	stroke(body, out, edge(-1, 0.003), SS[12]);
	return out;
}

function starburst(body) {
	const out = [], cx = 0, cy = 1.222, rays = 36, lens = [0.17, 0.085, 0.125, 0.06], k = scaleOf(body);
	const c = resolve(body, body.projectFront(cx, cy));
	if (!c) return out;
	out.push({ p: c.p, n: c.n, d: SS[30] });
	for (let r0 = 0; r0 < rays; r0++) {
		const a = r0 / rays * Math.PI * 2 + 0.05, len = lens[r0 % 4], pts = [];
		for (let r = 0.0075 / k; r <= len; r += 0.001) pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
		stroke(body, out, front(body, pts), (q) => { const r = q.p.distanceTo(c.p) / k; return r < 0.03 ? SS[20] : r < 0.065 ? SS[16] : r < 0.11 ? SS[10] : SS[6]; }, 1.3);
	}
	return out;
}

function spirals(body) {
	const out = [], k = scaleOf(body);
	for (const [cx, cy, rmax, turns, size, dir] of [[-0.085, 0.972, 0.062, 3.2, SS[12], 1], [0.07, 1.237, 0.04, 2.6, SS[10], -1], [0.02, 1.087, 0.03, 2.2, SS[10], 1]]) {
		const pts = [], end = turns * Math.PI * 2;
		for (let th = 0.6; th <= end; th += 0.012) { const r = rmax * th / end; pts.push([cx + r * Math.cos(th * dir), cy + r * Math.sin(th * dir)]); }
		stroke(body, out, front(body, pts), size);
		const c = resolve(body, body.projectFront(cx, cy));
		if (c && onFabric(body, c)) out.push({ p: c.p, n: c.n, d: SS[20] });
	}
	// Sunflower (phyllotaxis) rosette: the classic even fill for a round motif. Spacing is in real
	// millimetres, so it is divided by the body scale before laying it out on the reference body.
	const gx = 0.1, gy = 0.917, golden = Math.PI * (3 - Math.sqrt(5));
	for (let i = 0; i < 150; i++) {
		const r = 0.0034 * Math.sqrt(i + 0.5) / k, p = resolve(body, body.projectFront(gx + r * Math.cos(i * golden), gy + r * Math.sin(i * golden)));
		if (p && onFabric(body, p)) out.push({ p: p.p, n: p.n, d: i < 1 ? SS[20] : i < 40 ? SS[12] : SS[10] });
	}
	return out;
}

// Dart throwing on the garment surface: random candidates, rejected if they touch an earlier
// stone. diameterAt(pt, rand) returns the stone diameter, or 0 to reject the candidate outright.
function scatter(body, seed, candidates, maxD, diameterAt, gapK = 1.12) {
	const rand = rng(seed), out = [], cell = maxD * gapK, grid = new Map(), pt = {};
	const key = (i, j, k) => (i + 2048) + (j + 2048) * 4096 + (k + 2048) * 16777216;
	for (let c = 0; c < candidates; c++) {
		body.sample(rand, pt);
		if (!onFabric(body, pt)) continue;
		const d = diameterAt(pt, rand), p = pt.p;
		if (!d) continue;
		const ci = Math.floor(p.x / cell), cj = Math.floor(p.y / cell), ck = Math.floor(p.z / cell);
		let ok = true;
		for (let i = ci - 1; ok && i <= ci + 1; i++) for (let j = cj - 1; ok && j <= cj + 1; j++) for (let k = ck - 1; ok && k <= ck + 1; k++) {
			const list = grid.get(key(i, j, k));
			if (list) for (const s of list) { const m = (s.d + d) * 0.5 * gapK; if (s.p.distanceToSquared(p) < m * m) { ok = false; break; } }
		}
		if (!ok) continue;
		const s = { p: p.clone(), n: pt.n.clone(), d };
		out.push(s);
		const kk = key(ci, cj, ck), list = grid.get(kk);
		if (list) list.push(s); else grid.set(kk, [s]);
	}
	return out;
}

function cascade(body) {
	// Dense at the shoulders and neckline, thinning to nothing at the waist (reference heights).
	return scatter(body, 7, 60000, SS[20], (pt, rand) => {
		const rho = 0.75 * Math.pow(THREE.MathUtils.smoothstep(pt.refY, 1.022, 1.362), 2.2);
		if (rand() > rho) return 0;
		const r = rand();
		return r < 0.12 ? SS[20] : r < 0.5 ? SS[16] : SS[10];
	}, 1.25);
}

const pave = (body, size) => scatter(body, 11, Math.round(body.area * 0.62 / (size * size) * 9), size, () => size, 1.1);

export const PATTERNS = {
	'None': () => [],
	'Neckline and cuffs': (b, s) => edges(b, s),
	'Swoosh line (pen stroke)': (b) => swoosh(b),
	'Cascade scatter': (b) => cascade(b),
	'Starburst': (b) => starburst(b),
	'Spirals and rosette': (b) => spirals(b),
	'Showpiece (edges + swoosh + cascade)': (b, s) => [...edges(b, s), ...swoosh(b), ...cascade(b)],
	'Stress: pavé ss16 all over': (b) => pave(b, SS[16]),
	'Stress: micro pavé ss6 all over': (b) => pave(b, SS[6]),
};

// ---------------------------------------------------------------------------------------------

export class Stones {
	constructor(scene) {
		this.scene = scene;
		this.crystalGeo = crystalGeometry();
		this.spangleGeo = spangleGeometry();
		this.crystalMat = crystalMaterial();
		this.spangleMat = new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.14, iridescenceIOR: 2.1, iridescenceThicknessRange: [300, 760] });
		this.mesh = null;
		this.count = 0;
		this.triangles = 0;
	}

	set(list, finishName, bodyColour) {
		if (this.mesh) { this.scene.remove(this.mesh); this.mesh.dispose(); this.mesh = null; }
		this.count = list.length; this.triangles = 0;
		if (!list.length) return;
		const f = FINISHES[finishName], spangle = !!f.spangle;
		const geo = spangle ? this.spangleGeo : this.crystalGeo, mat = spangle ? this.spangleMat : this.crystalMat;
		if (spangle) { mat.iridescence = f.holo ? 1 : 0; mat.needsUpdate = true; } else {
			mat.userData.u.uAB.value = f.ab ?? 0;
			mat.iridescence = f.ab ? 1 : 0; mat.iridescenceIOR = 1.9; mat.iridescenceThicknessRange = [200, 480]; mat.needsUpdate = true;
		}
		const tint = new THREE.Color(), white = new THREE.Color(1, 1, 1);
		if (f.tint === 'body') tint.set(bodyColour).lerp(white, 0.2); else tint.set(f.tint);

		const mesh = new THREE.InstancedMesh(geo, mat, list.length);
		const rand = rng(3), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), spin = new THREE.Quaternion();
		const z = new THREE.Vector3(0, 0, 1), s = new THREE.Vector3(), pos = new THREE.Vector3(), nn = new THREE.Vector3(), col = new THREE.Color();
		list.forEach((st, i) => {
			nn.copy(st.n);
			// Spangles never lie perfectly flat; the small random tilt is what makes them flash in turn.
			if (spangle) nn.x += (rand() - 0.5) * 0.16, nn.y += (rand() - 0.5) * 0.16, nn.z += (rand() - 0.5) * 0.16, nn.normalize();
			q.setFromUnitVectors(z, nn).multiply(spin.setFromAxisAngle(z, rand() * Math.PI * 2));
			pos.copy(st.p).addScaledVector(st.n, LIFT);
			m4.compose(pos, q, s.setScalar(st.d * 0.5));
			mesh.setMatrixAt(i, m4);
			mesh.setColorAt(i, col.copy(tint).multiplyScalar(0.88 + 0.12 * rand()));
		});
		mesh.frustumCulled = false;
		mesh.renderOrder = -4; // in front of everything, so draw first and let depth reject what is behind
		this.scene.add(mesh);
		this.mesh = mesh;
		this.triangles = list.length * geo.attributes.position.count / 3;
	}
}
