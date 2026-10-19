// Fabric materials: three.js MeshPhysicalMaterial (sheen, clearcoat, anisotropy, iridescence)
// plus an injected procedural layer for what the stock material lacks: foil dots (mystique),
// holographic foil, glitter flakes, crinkle/crushed bump, knit texture, sheer mesh and ombre.
//
// Each garment zone (0 body, 1 sleeves, 2 accent) is its own draw of the shared body geometry
// with its own material; the shader discards pixels outside the zone using the region fields
// from body.js, and draws the zone on the garment surface (body pushed out by aLift, where the
// fabric bridges hollows, plus the fabric thickness). Zone 3 means "no mask" and is the mannequin
// itself, which can also carry dress-form style tapes. Zone 4 is a finished edge (trim.js): its
// own geometry, already placed, carrying topstitching. Every zone honours the dress-form cut
// (aKeep < 0 is discarded when uClip is on).
import * as THREE from 'three';

const PARS_VERTEX = /* glsl */`
attribute float aCover;
attribute vec2 aZone;
attribute float aAO;
attribute float aLift;
attribute vec3 aGNormal;
attribute vec3 aRef;
attribute float aKeep;
attribute vec2 aForm;
attribute vec2 aRim;
varying vec2 vRim;
uniform float uOffset;
uniform float uGarment;
varying vec3 vObjPos;
varying vec3 vRef;
varying float vKeep;
varying vec2 vForm;
varying vec3 vObjNormal;
varying float vCover;
varying vec2 vZone;
varying float vAO;
`;

const BEGIN_VERTEX = /* glsl */`
transformed += normal * ( uOffset + aLift * uGarment );
vObjPos = position;
vObjNormal = normal;
vCover = aCover;
vZone = aZone;
vAO = mix( aAO, 1. - ( 1. - aAO ) * .3, uGarment ); // fabric spans the crevice, so it is barely shaded
vRef = aRef;
vKeep = aKeep;
vForm = aForm;
vRim = aRim;
`;

const BEGIN_NORMAL = /* glsl */`
objectNormal = normalize( mix( objectNormal, aGNormal, uGarment ) );
`;

const PARS_FRAGMENT = /* glsl */`
varying vec3 vObjPos;
varying vec3 vRef;
varying float vKeep;
varying vec2 vForm;
uniform float uClip;       // 1 = dress form: discard everything outside the cut (aKeep < 0)
uniform float uTape;       // 1 = dress-form style tapes on the mannequin
uniform vec4 uTapeY;       // reference-body heights of the waist, bust, hip and neck tapes
uniform vec3 uTapeColor;
varying vec3 vObjNormal;
varying float vCover;
varying vec2 vZone;
varying float vAO;

uniform int uZone;
uniform float uSleeveSplit;
uniform float uTrimInset;  // metres the fabric's cut is pulled back under the finished edge (hides the jagged cut)
uniform float uTrimWidth;  // finished edge width, for the contact shadow it casts on the fabric beside it
varying vec2 vRim;         // finished edge: x = distance from the edge (profile metres), y = metres along it
uniform vec2 uRows;        // topstitch rows, metres from the edge (0 = no row)
uniform vec3 uThread;
float gTrimAO = 1.;

uniform float uFlake;      // 1 = foil dots / glitter flakes on
uniform float uPitch;      // flake spacing, metres
uniform float uDotR;       // flake radius, in cells (0.577 fills the hex cell)
uniform float uPresence;   // fraction of cells that carry a flake
uniform float uTilt;       // random flake tilt (tangent of the typical angle)
uniform float uFoilRough;
uniform float uColorVar;   // per-flake brightness variation
uniform vec3 uFoilColor;
uniform float uHolo;       // 0..1 share of rainbow in the foil colour
uniform float uHoloFreq;
uniform float uHoloJit;   // how much each flake departs from the smooth rainbow band
uniform vec3 uHoloDirW;    // world-space direction the rainbow is anchored to (the key light)

uniform float uMesh;       // 1 = sheer mesh
uniform float uMeshPitch;
uniform float uHoleR;

uniform float uBumpAmp;    // crinkle / crushed-pile bump
uniform float uBumpScale;
uniform float uKnit;

uniform float uOmbre;
uniform vec3 uOmbreColor;
uniform vec2 uOmbreY;

vec3 hash32( vec2 p ) {
	vec3 p3 = fract( vec3( p.xyx ) * vec3( .1031, .1030, .0973 ) );
	p3 += dot( p3, p3.yxz + 33.33 );
	return fract( ( p3.xxy + p3.yzz ) * p3.zyx );
}
float hash21( vec2 p ) {
	vec3 p3 = fract( vec3( p.xyx ) * .1031 );
	p3 += dot( p3, p3.yzx + 33.33 );
	return fract( ( p3.x + p3.y ) * p3.z );
}
float vnoise( vec2 p ) {
	vec2 i = floor( p ), f = fract( p );
	f = f * f * ( 3. - 2. * f );
	return mix( mix( hash21( i ), hash21( i + vec2( 1, 0 ) ), f.x ),
		mix( hash21( i + vec2( 0, 1 ) ), hash21( i + 1. ), f.x ), f.y );
}
// xy = offset from the cell centre, zw = cell id. Centres are 1 apart.
vec4 hexCell( vec2 p ) {
	const vec2 s = vec2( 1., 1.7320508 );
	vec4 c = floor( vec4( p, p - vec2( .5, 1. ) ) / s.xyxy ) + .5;
	vec4 h = vec4( p - c.xy * s, p - ( c.zw + .5 ) * s );
	return dot( h.xy, h.xy ) < dot( h.zw, h.zw ) ? vec4( h.xy, c.xy ) : vec4( h.zw, c.zw + .5 );
}
vec3 spectrum( float h ) {
	vec3 c = clamp( abs( fract( h + vec3( 0., 2. / 3., 1. / 3. ) ) * 6. - 3. ) - 1., 0., 1. );
	return c * c * ( 3. - 2. * c );
}
// Tilt the normal by the screen-space gradient of a height (metres).
vec3 bumpN( vec3 n, float hgt ) {
	vec3 dpdx = dFdx( - vViewPosition ), dpdy = dFdy( - vViewPosition );
	vec3 r1 = cross( dpdy, n ), r2 = cross( n, dpdx );
	float det = dot( dpdx, r1 );
	vec3 g = sign( det ) * ( dFdx( hgt ) * r1 + dFdy( hgt ) * r2 );
	return normalize( abs( det ) * n - g );
}
`;

const FABRIC_FRAGMENT = /* glsl */`
{
	if ( uClip > .5 && vKeep < 0. ) discard;

	// --- dress-form style tapes: centre front/back, side seams, princess lines, waist, bust, hip
	if ( uZone == 3 && uTape > .5 ) {
		float d = abs( vRef.x );
		d = min( d, abs( vForm.x ) );
		if ( vRef.y > uTapeY.z && vRef.y < uTapeY.w - .03 ) d = min( d, abs( vForm.y ) );
		d = min( d, min( abs( vRef.y - uTapeY.x ), min( abs( vRef.y - uTapeY.y ), abs( vRef.y - uTapeY.z ) ) ) );
		float aa = max( fwidth( d ), 1e-5 ), w = .0028;
		diffuseColor.rgb = mix( diffuseColor.rgb, uTapeColor, 1. - smoothstep( w - aa, w + aa, d ) );
	}

	// --- which pixels belong to this zone
	if ( uZone < 3 ) {
		float m = vCover - uTrimInset;
		if ( uTrimWidth > 0. ) gTrimAO = mix( .72, 1., smoothstep( uTrimWidth - .0005, uTrimWidth + .003, vCover ) );
		if ( uZone == 0 ) { if ( uSleeveSplit > .5 ) m = min( m, .003 - vZone.x ); }
		else if ( uZone == 1 ) m = min( m, vZone.x );
		else m = min( m, min( vZone.y, - vZone.x ) );
		float aa = max( fwidth( m ), 1e-6 );
		float edge = smoothstep( - aa, aa, m );
		if ( edge < .004 ) discard;
		diffuseColor.a *= edge;
	}

	// --- pattern space: project object position onto the plane the surface faces most.
	// Patterns are random at the scale of a millimetre, so the hard switch between planes is
	// not visible. fp is the size of one pixel on the surface, in metres.
	vec3 an = abs( normalize( vObjNormal ) );
	vec2 q = ( an.z >= an.x && an.z >= an.y ) ? vObjPos.xy : ( an.x >= an.y ? vObjPos.zy : vObjPos.xz );
	float fp = length( fwidth( vObjPos ) );
	vec3 viewDir = normalize( vViewPosition );

	float ombre = 1.;
	if ( uOmbre > .5 ) {
		ombre = smoothstep( uOmbreY.x, uOmbreY.y, vRef.y + .025 * sin( vRef.x * 11. ) ); // reference body: the fade lands at the same place on every size
		diffuseColor.rgb = mix( uOmbreColor, diffuseColor.rgb, ombre );
	}

	if ( uKnit > 0. ) {
		const float kp = .00035;
		float fade = 1. - smoothstep( .2, .5, fp / kp );
		if ( fade > 0. ) {
			float w = sin( q.x / kp * 6.2832 ) * ( .65 + .35 * sin( q.y / kp * 3.7 + q.x / kp * 3.1416 ) );
			normal = bumpN( normal, w * kp * .07 * uKnit * fade );
		}
	}

	if ( uBumpAmp > 0. ) {
		float fade = 1. - smoothstep( .25, .6, fp / uBumpScale );
		if ( fade > 0. ) {
			vec2 b = q / uBumpScale;
			float hgt = vnoise( b ) + .5 * vnoise( b * 2.13 + 5.2 );
			normal = bumpN( normal, hgt * uBumpAmp * uBumpScale * fade );
		}
	}

	float flakeMask = 0.;
	if ( uFlake > .5 ) {
		vec2 qc = q / uPitch;
		float r = fp / uPitch; // pixel size in cells

		float w = smoothstep( .22, .6, r ); // 0 = flakes resolved, 1 = flakes smaller than a pixel
		float nearMask = 0., rvNear = 0., rvFar = 0.;
		vec3 nearTilt = vec3( 0. ), farTilt = vec3( 0. );

		// Near: resolve each flake as a disc in a hex cell with its own tilt. (The two branches
		// are skipped where they contribute nothing; most pixels only ever need one of them.)
		if ( w < 1. ) {
			vec4 hc = hexCell( qc );
			vec3 rn = hash32( hc.zw );
			// Nudge each flake off the lattice centre (it still fits its own cell): a perfect grid
			// beats against the pixel grid and shows moire at mid distance.
			vec2 jit = ( hash32( hc.zw + 3.7 ).xy - .5 ) * 2. * max( .5 - uDotR, 0. );
			nearMask = ( 1. - smoothstep( uDotR - r * .7, uDotR + r * .7, length( hc.xy - jit ) ) ) * step( rn.z, uPresence );
			nearTilt = hash32( hc.zw + 17.3 ) * 2. - 1.;
			rvNear = rn.x;
		}

		// Far: flakes are smaller than a pixel. Keep the sparkle by tilting cells that track the
		// pixel size (about 1.6 px, blended across two octaves so they do not pop), and carry
		// the foil coverage as a metal fraction.
		if ( w > 0. ) {
			float lod = max( log2( r * 1.6 ), 0. );
			float l0 = floor( lod ), lf = lod - l0, s0 = exp2( l0 );
			vec3 ta = hash32( floor( qc / s0 ) + l0 * 7.13 );
			vec3 tb = hash32( floor( qc / ( s0 * 2. ) ) + ( l0 + 1. ) * 7.13 );
			farTilt = mix( ta, tb, lf ) * 2. - 1.;
			rvFar = ta.z;
		}
		float coverage = min( 3.6276 * uDotR * uDotR, 1. ) * uPresence;

		flakeMask = mix( nearMask, coverage, w );
		vec3 tilt = mix( nearTilt, farTilt, w );
		float rv = mix( rvNear, rvFar, w );

		vec3 nF = normalize( normal + ( tilt - normal * dot( tilt, normal ) ) * uTilt );
		// On an ombre the foil is printed with the same gradient as the cloth under it.
		vec3 fc = mix( uOmbreColor * 1.8 + .05, uFoilColor, ombre ) * ( 1. + uColorVar * ( rv - .5 ) );
		if ( uHolo > 0. ) {
			vec3 hd = normalize( ( viewMatrix * vec4( uHoloDirW, 0. ) ).xyz );
			// Hue follows the smooth surface so rainbow bands sweep across the body as it turns;
			// each flake then departs from its band by a little (dots) or a lot (shards, glitter).
			float ph = dot( reflect( - viewDir, normal ), hd ) * uHoloFreq + ( rv - .5 ) * uHoloJit + dot( tilt, hd ) * uTilt * uHoloJit;
			fc = mix( fc, spectrum( ph ) * ( .75 + .5 * rv ), uHolo );
		}
		diffuseColor.rgb = mix( diffuseColor.rgb, fc, flakeMask );
		metalnessFactor = mix( metalnessFactor, 1., flakeMask );
		roughnessFactor = mix( roughnessFactor, uFoilRough, flakeMask );
		normal = normalize( mix( normal, nF, mix( nearMask, 1., w ) ) );
	}

	if ( uMesh > .5 ) {
		float r = fp / uMeshPitch;
		vec4 hc = hexCell( q / uMeshPitch );
		float hole = 1. - smoothstep( uHoleR - r * .7, uHoleR + r * .7, length( hc.xy ) );
		// Holes foreshorten at glancing angles, so mesh reads more opaque towards the silhouette.
		float ndv = saturate( dot( normal, viewDir ) );
		float farAlpha = 1. - 3.6276 * uHoleR * uHoleR * pow( ndv, .6 );
		float a = mix( 1. - hole, farAlpha, smoothstep( .16, .45, r ) );
		diffuseColor.a *= max( a, flakeMask );
	}

	// --- topstitching on a finished edge: coverstitch rows of ~3 mm straight stitches, each
	// thread sitting in a slight groove where it pulls the layers together. Fades to the groove's
	// average darkening once a stitch is smaller than a few pixels.
	if ( uZone == 4 ) {
		float fx = max( fwidth( vRim.x ), 1e-6 ), fade = 1. - smoothstep( .00012, .0004, fx );
		float thread = 0., groove = 0.;
		for ( int k = 0; k < 2; k ++ ) {
			float r = k == 0 ? uRows.x : uRows.y;
			if ( r <= 0. ) continue;
			float du = abs( vRim.x - r ), along = fract( vRim.y / .003 + float( k ) * .37 );
			float dash = smoothstep( .02, .1, along ) * ( 1. - smoothstep( .86, .94, along ) );
			thread = max( thread, ( 1. - smoothstep( .00016 - fx, .00016 + fx, du ) ) * dash * fade );
			groove = max( groove, 1. - smoothstep( .0001, .0007 + fx, du ) );
		}
		normal = bumpN( normal, ( thread * .00012 - groove * .00018 ) * fade );
		diffuseColor.rgb = mix( diffuseColor.rgb * ( 1. - groove * mix( .12, .3, fade ) ), uThread, thread );
		diffuseColor.a = max( diffuseColor.a, thread );
		metalnessFactor = mix( metalnessFactor, 0., thread );
		roughnessFactor = mix( roughnessFactor, .6, thread );
	}
}
`;

const AO_FRAGMENT = /* glsl */`
float aoT = vAO * gTrimAO;
reflectedLight.indirectDiffuse *= aoT;
reflectedLight.indirectSpecular *= mix( 1., aoT, .8 );
reflectedLight.directDiffuse *= mix( 1., aoT, .35 );
#ifdef USE_SHEEN
	sheenSpecularIndirect *= aoT;
#endif
#ifdef USE_CLEARCOAT
	clearcoatSpecularIndirect *= aoT;
#endif
`;

export function createFabricMaterial(zone) {
	const u = {
		uZone: { value: zone }, uSleeveSplit: { value: 0 }, uOffset: { value: zone >= 3 ? 0 : 0.0012 + zone * 0.00015 },
		uGarment: { value: zone >= 3 ? 0 : 1 }, uClip: { value: 0 }, uTape: { value: 0 },
		uTrimInset: { value: 0 }, uTrimWidth: { value: 0 }, uRows: { value: new THREE.Vector2() }, uThread: { value: new THREE.Color() },
		uTapeY: { value: new THREE.Vector4(1.04, 1.168, 0.83, 1.357) }, uTapeColor: { value: new THREE.Color(0x15151a) },
		uFlake: { value: 0 }, uPitch: { value: 0.001 }, uDotR: { value: 0.4 }, uPresence: { value: 1 }, uTilt: { value: 0.1 },
		uFoilRough: { value: 0.2 }, uColorVar: { value: 0 }, uFoilColor: { value: new THREE.Color(1, 1, 1) },
		uHolo: { value: 0 }, uHoloFreq: { value: 3 }, uHoloJit: { value: 0.2 }, uHoloDirW: { value: new THREE.Vector3(0.3, 1, 0.5).normalize() },
		uMesh: { value: 0 }, uMeshPitch: { value: 0.0007 }, uHoleR: { value: 0.34 },
		uBumpAmp: { value: 0 }, uBumpScale: { value: 0.003 }, uKnit: { value: 0 },
		uOmbre: { value: 0 }, uOmbreColor: { value: new THREE.Color(0, 0, 0) }, uOmbreY: { value: new THREE.Vector2(0.82, 1.32) },
	};
	const m = new THREE.MeshPhysicalMaterial({ transparent: zone !== 3 });
	m.userData.u = u;
	m.onBeforeCompile = (shader) => {
		Object.assign(shader.uniforms, u);
		shader.vertexShader = shader.vertexShader
			.replace('#include <common>', '#include <common>\n' + PARS_VERTEX)
			.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n' + BEGIN_NORMAL)
			.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + BEGIN_VERTEX);
		shader.fragmentShader = shader.fragmentShader
			.replace('#include <common>', '#include <common>\n' + PARS_FRAGMENT)
			.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + FABRIC_FRAGMENT)
			.replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' + AO_FRAGMENT);
	};
	m.customProgramCacheKey = () => 'leotard-fabric';
	return m;
}

// Sheen is left off the foil and glitter fabrics on purpose: it roughly doubles the cost of every
// light and is invisible next to the foil.
// Flake fields: pitch (m), dotR (cells), presence, tilt, rough, colorVar, holo, holoFreq, holoJit.
export const FABRICS = {
	matte: { label: 'Matte lycra', roughness: 0.8, sheen: 0.4, sheenRoughness: 0.6, knit: 1 },
	shiny: { label: 'Shiny tricot', roughness: 0.4, sheen: 0.2, sheenRoughness: 0.5, anisotropy: 0.6, knit: 1 },
	wet: { label: 'Wet look (cire)', roughness: 0.36, clearcoat: 1, clearcoatRoughness: 0.1, anisotropy: 0.3 },
	mystique: { label: 'Mystique (foil dots)', roughness: 0.62, knit: 1, flake: { pitch: 0.00075, dotR: 0.4, presence: 0.97, tilt: 0.22, rough: 0.27, colorVar: 0.3 } },
	hologram: { label: 'Hologram foil dots', roughness: 0.62, knit: 1, flake: { pitch: 0.0009, dotR: 0.37, presence: 1, tilt: 0.22, rough: 0.22, colorVar: 0.3, holo: 0.6, holoFreq: 0.9, holoJit: 0.5 } },
	shattered: { label: 'Shattered glass hologram', roughness: 0.5, flake: { pitch: 0.0045, dotR: 0.6, presence: 1, tilt: 0.3, rough: 0.12, colorVar: 0.5, holo: 0.9, holoFreq: 1.8, holoJit: 1.4 } },
	foil: { label: 'Liquid metallic foil', metalness: 1, roughness: 0.2, bump: { amp: 0.45, scale: 0.0028 } },
	glitter: { label: 'Glitter', roughness: 0.6, flake: { pitch: 0.0003, dotR: 0.58, presence: 0.94, tilt: 0.5, rough: 0.15, colorVar: 0.6 } },
	hologlitter: { label: 'Holographic glitter', roughness: 0.6, flake: { pitch: 0.0003, dotR: 0.58, presence: 0.94, tilt: 0.5, rough: 0.15, colorVar: 0.5, holo: 0.7, holoFreq: 2.5, holoJit: 1.2 } },
	velvet: { label: 'Stretch velvet', roughness: 1, sheen: 1, sheenRoughness: 0.4, velvet: true, bump: { amp: 0.1, scale: 0.012 } },
	crushed: { label: 'Crushed velvet', roughness: 1, sheen: 1, sheenRoughness: 0.3, velvet: true, bump: { amp: 0.7, scale: 0.007 } },
	pearl: { label: 'Iridescent film', metalness: 1, roughness: 0.24, iridescence: 1, bump: { amp: 0.25, scale: 0.004 } },
	mesh: { label: 'Stretch mesh (sheer)', roughness: 0.75, sheen: 0.3, sheenRoughness: 0.6, mesh: { pitch: 0.0007, holeR: 0.35 } },
	glittermesh: { label: 'Glitter mesh', roughness: 0.75, mesh: { pitch: 0.0007, holeR: 0.35 }, flake: { pitch: 0.0005, dotR: 0.5, presence: 0.1, tilt: 0.5, rough: 0.1, colorVar: 0.5 } },
	ombre: { label: 'Sublimated ombré', roughness: 0.74, sheen: 0.35, sheenRoughness: 0.6, knit: 1, ombre: true },
	ombremystique: { label: 'Ombré mystique', roughness: 0.62, knit: 1, ombre: true, flake: { pitch: 0.00075, dotR: 0.4, presence: 0.97, tilt: 0.22, rough: 0.27, colorVar: 0.3 } },
};

export const SECOND = ['Tone-on-tone', 'Silver', 'Gold', 'White', 'Black'];
const _hsl = {};
function secondColour(base, mode, forOmbre, out) {
	if (mode === 'Silver') return out.set(0xe6e8ee);
	if (mode === 'Gold') return out.set(0xf0c264);
	if (mode === 'White') return out.set(0xffffff);
	if (mode === 'Black') return out.set(0x050506);
	base.getHSL(_hsl);
	// Tone-on-tone: a brighter foil of the same hue, or a deeper neighbouring hue for an ombre.
	return forOmbre
		? out.setHSL((_hsl.h + 0.09) % 1, _hsl.s, _hsl.l * 0.3)
		: out.setHSL(_hsl.h, _hsl.s, Math.min(_hsl.l * 1.1 + 0.1, 0.72));
}

const _c = new THREE.Color();
export function applyFabric(m, key, colour, second) {
	const f = FABRICS[key], u = m.userData.u, fl = f.flake, base = _c.set(colour).clone();
	m.color.copy(base).multiplyScalar(f.velvet ? 0.42 : 1);
	m.roughness = f.roughness ?? 0.7;
	m.metalness = f.metalness ?? 0;
	m.sheen = f.sheen ?? 0;
	m.sheenRoughness = f.sheenRoughness ?? 0.6;
	m.sheenColor.copy(base).lerp(_c.set(0xffffff), f.velvet ? 0.25 : 0.6);
	m.clearcoat = f.clearcoat ?? 0;
	m.clearcoatRoughness = f.clearcoatRoughness ?? 0;
	m.anisotropy = f.anisotropy ?? 0;
	m.iridescence = f.iridescence ?? 0;
	m.iridescenceIOR = 1.8;
	m.iridescenceThicknessRange = [200, 520];

	u.uFlake.value = fl ? 1 : 0;
	if (fl) {
		u.uPitch.value = fl.pitch; u.uDotR.value = fl.dotR; u.uPresence.value = fl.presence; u.uTilt.value = fl.tilt;
		u.uFoilRough.value = fl.rough; u.uColorVar.value = fl.colorVar ?? 0; u.uHolo.value = fl.holo ?? 0; u.uHoloFreq.value = fl.holoFreq ?? 3; u.uHoloJit.value = fl.holoJit ?? 0.2;
		secondColour(base, second, false, u.uFoilColor.value);
	}
	u.uMesh.value = f.mesh ? 1 : 0;
	if (f.mesh) { u.uMeshPitch.value = f.mesh.pitch; u.uHoleR.value = f.mesh.holeR; }
	u.uBumpAmp.value = f.bump?.amp ?? 0;
	if (f.bump) u.uBumpScale.value = f.bump.scale;
	u.uKnit.value = f.knit ?? 0;
	u.uOmbre.value = f.ombre ? 1 : 0;
	if (f.ombre) secondColour(base, second, true, u.uOmbreColor.value);
	// Opaque fabrics are drawn before the skin with alpha-to-coverage edges, so the skin beneath
	// them fails the depth test and is never shaded. Only sheer fabrics take the blended path.
	m.transparent = !!f.mesh;
	m.alphaToCoverage = !f.mesh;
	m.needsUpdate = true; // sheen / clearcoat / anisotropy / iridescence switch shader variants
}
