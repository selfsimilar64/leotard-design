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
import { laceTexture } from './lace.js';

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
attribute vec2 aUV;
varying vec2 vUV;
attribute float aGrad;     // panels: 0..1 position in the panel's colour gradient (render/garment.js)
varying float vGrad;
attribute float aSeam;     // panels: metres to the nearest seam (render/garment.js)
varying float vSeam;
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
vUV = aUV;
vGrad = aGrad;
vSeam = aSeam;
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

uniform int uZone;         // 0-2 POC zones, 3 skin, 4 finished edge, 5 panel (exact geometry, cloth-space UVs)
varying vec2 vUV;          // cloth-space coordinates of a panel, metres (garment/flatten.js)
uniform float uUV;         // 1 = pattern space is vUV rotated by uGrain, 0 = tri-planar object space
uniform float uGrain;      // grain angle on the panel, radians
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

uniform float uChecker;    // > 0: debug checker of this size (metres) in pattern space, for checking UVs
// Scanned fabric (materials/textures.js): maps tiled at their real size in pattern space
uniform float uTex;        // 1 = a texture set is bound
uniform sampler2D tBase; uniform sampler2D tNormal; uniform sampler2D tRough; uniform sampler2D tAlpha; uniform sampler2D tMtl; uniform sampler2D tMask;
uniform vec2 uTile;        // metres covered by one repeat of the maps
uniform float uTexRecolour; uniform vec3 uTexTint; uniform float uTexLum; // recolour: luminance x tint
uniform float uTexNormal;  // normal map strength (0 = off)
uniform vec4 uTexFlags;    // x roughness map, y alpha map, z metal mask, w colour masks
uniform vec4 uMaskOn; uniform vec3 uMaskCol0; uniform vec3 uMaskCol1; uniform vec3 uMaskCol2; uniform vec3 uMaskCol3;
// Tangent frame from screen-space derivatives of position and pattern coordinates (no tangent attribute needed).
mat3 cotangentFrame( vec3 N, vec3 p, vec2 uv ) {
	vec3 dp1 = dFdx( p ), dp2 = dFdy( p );
	vec2 duv1 = dFdx( uv ), duv2 = dFdy( uv );
	vec3 dp2perp = cross( dp2, N ), dp1perp = cross( N, dp1 );
	vec3 T = dp2perp * duv1.x + dp1perp * duv2.x, B = dp2perp * duv1.y + dp1perp * duv2.y;
	float invmax = inversesqrt( max( max( dot( T, T ), dot( B, B ) ), 1e-20 ) );
	return mat3( T * invmax, B * invmax, N );
}
uniform float uOmbre;      // 1 = POC fade up the reference body, 2 = along the panel's gradient (vGrad)
uniform vec3 uOmbreColor;
uniform vec2 uOmbreY;
varying float vGrad;

uniform float uSkin;       // > 0: athlete skin, wrap lighting (used in RE_Direct_Physical, see SKIN_DIFFUSE)
uniform float uSeam;       // 1 = vSeam is valid: seam groove and ridge, mesh doubled over the allowance
uniform float uClipShell;  // 1 = a lining: only where the shell has fabric (aCover carries the shell's cover)
uniform float uSeamAllow;  // seam allowance, metres (folded under the seam: mesh shows it as a darker band)
varying float vSeam;
uniform float uDuo;        // duochrome: share of uDuoColor at grazing angles
uniform vec3 uDuoColor;
uniform float uDuoPow;
uniform float uFilm;       // 1 = thin-film thickness varies over the cloth (oil-slick, liquid hologram)
uniform float uFilmScale;  // metres per swirl
uniform vec2 uFilmRange;   // film thickness, nm
uniform float uFilmWarp;   // how much the swirls fold over each other
uniform float uFilmTint;   // share of the film's colour shown in the cloth's own colour (hologram prints)
float gFilm = .5;
uniform float uLace;       // 1 = lace motifs (tLace: 0 net, ~.7 dense toile, 1 cord) over the mesh net
uniform sampler2D tLace;
uniform float uLaceSize;   // metres per repeat
uniform vec3 uLaceColor;   // colour of the motifs and cord (the fabric colour is the net's)
uniform float uPrint;      // 1 = sublimation print (tPrint, rgba) tiled in pattern space
uniform sampler2D tPrint;
uniform vec2 uPrintSize;   // metres per repeat
uniform vec2 uPrintOffset;
// Decals (logos, lettering): up to 4 per panel, planar projections on the reference body
uniform int uDecals;
uniform mat4 uDecalM[ 4 ];    // reference space -> decal box (x, y in -.5...5 across the art, z +-1 depth)
uniform vec4 uDecalRect[ 4 ]; // the art's rectangle in the atlas (x, y, w, h)
uniform vec4 uDecalLook[ 4 ]; // x look (0 print, 1 foil, 2 holo foil, 3 glitter, 4 flock), y roughness, z 1 = the art's own colours
uniform vec3 uDecalCol[ 4 ];
uniform sampler2D tDecal;
// Tension wrinkles (realism upgrade R9): radial folds round a few zones of the reference body
// (crotch, armpits); xyz centre + w radius, and the plane's normal + w strength (0 = off)
uniform vec4 uWrinkle[ 3 ];
uniform vec4 uWrinkleN[ 3 ];

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
	vec3 r = abs( det ) * n - g;
	return dot( r, r ) > 1e-30 ? normalize( r ) : n;
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
	// skin is not evenly glossy: a little roughness variation at the centimetre scale
	if ( uZone == 3 && uSkin > 0. ) roughnessFactor = clamp( roughnessFactor * ( .82 + .36 * vnoise( vObjPos.xy * 90. + vObjPos.z * 40. ) ), .3, .8 );

	// a lining never shows past the shell's openings
	if ( uClipShell > .5 && vCover < 0. ) discard;

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
	if ( uUV > .5 ) { float cg = cos( uGrain ), sg = sin( uGrain ); q = mat2( cg, sg, - sg, cg ) * vUV; }
	float fp = length( fwidth( vObjPos ) );
	vec3 viewDir = normalize( vViewPosition );

	if ( uTex > .5 ) {
		vec2 tuv = q / uTile;
		vec4 tb = texture2D( tBase, tuv );
		vec3 col = tb.rgb;
		if ( uTexRecolour > .5 ) col = uTexTint * ( dot( col, vec3( .2126, .7152, .0722 ) ) / max( uTexLum, 1e-3 ) );
		if ( uTexFlags.w > .5 ) {
			vec4 mk = texture2D( tMask, tuv ) * uMaskOn;
			float sh = dot( tb.rgb, vec3( .2126, .7152, .0722 ) ) / max( uTexLum, 1e-3 );
			col = mix( col, uMaskCol0 * sh, mk.x ); col = mix( col, uMaskCol1 * sh, mk.y );
			col = mix( col, uMaskCol2 * sh, mk.z ); col = mix( col, uMaskCol3 * sh, mk.w );
		}
		diffuseColor.rgb = col;
		if ( uTexFlags.x > .5 ) roughnessFactor = clamp( texture2D( tRough, tuv ).r, .04, 1. );
		if ( uTexFlags.z > .5 ) metalnessFactor = max( metalnessFactor, texture2D( tMtl, tuv ).r );
		if ( uTexFlags.y > .5 ) diffuseColor.a *= texture2D( tAlpha, tuv ).r;
		if ( uTexNormal > 0. ) {
			vec3 tn = texture2D( tNormal, tuv ).xyz * 2. - 1.;
			tn.xy *= uTexNormal;
			normal = normalize( cotangentFrame( normal, - vViewPosition, tuv ) * tn );
		}
	}
	if ( uPrint > .5 ) {
		vec4 pc = texture2D( tPrint, ( q - uPrintOffset ) / uPrintSize );
		diffuseColor.rgb = mix( diffuseColor.rgb, pc.rgb, pc.a );
	}
	if ( uChecker > 0. ) {
		vec2 cq = floor( q / uChecker );
		float ck = mod( cq.x + cq.y, 2. );
		vec2 fq = fract( q / uChecker );
		float arrow = step( abs( fq.x - .5 ), .06 ) * step( .2, fq.y ) * step( fq.y, .8 ); // grain line up each cell
		diffuseColor.rgb = mix( diffuseColor.rgb * mix( .55, 1., ck ), vec3( 1. ), arrow * .8 );
	}
	float ombre = 1.;
	if ( uOmbre > .5 ) {
		ombre = uOmbre > 1.5 ? 1. - smoothstep( 0., 1., vGrad ) // along a line or a direction (render/garment.js)
			: smoothstep( uOmbreY.x, uOmbreY.y, vRef.y + .025 * sin( vRef.x * 11. ) ); // reference body: the fade lands at the same place on every size
		diffuseColor.rgb = mix( uOmbreColor, diffuseColor.rgb, ombre );
	}
	// duochrome foil: the colour turns towards a second hue as the surface turns away
	if ( uDuo > 0. ) diffuseColor.rgb = mix( diffuseColor.rgb, uDuoColor, uDuo * pow( 1. - saturate( dot( normal, viewDir ) ), uDuoPow ) );
	// thin-film thickness swirls: folded value noise (oil-slick, liquid hologram), read in lights_physical_fragment
	if ( uFilm > 0. ) {
		vec2 fq = q / uFilmScale;
		vec2 wq = fq + ( vec2( vnoise( fq * .6 + 3.1 ), vnoise( fq * .6 + 8.7 ) ) - .5 ) * uFilmWarp;
		gFilm = clamp( vnoise( wq ) * .7 + vnoise( wq * 2.7 + 1.3 ) * .3, 0., 1. );
		// a hologram print shows its colours in the cloth itself, shifting as the surface turns
		if ( uFilmTint > 0. ) {
			vec3 hd = normalize( ( viewMatrix * vec4( uHoloDirW, 0. ) ).xyz );
			vec3 ft = spectrum( gFilm * 1.6 + dot( reflect( - viewDir, normal ), hd ) * .45 );
			diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * ( .62 + .5 * ft ), uFilmTint );
		}
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
		// sparse flakes stay sparse far away: only a coverage share of the pixel-sized cells carry one
		// (denser foils, coverage over 0.3, keep every cell sparkling as in the POC)
		float farOn = coverage > .3 ? coverage : step( fract( rvFar * 7.31 ), coverage );

		flakeMask = mix( nearMask, farOn, w );
		vec3 tilt = mix( nearTilt, farTilt, w );
		float rv = mix( rvNear, rvFar, w );

		vec3 nF = normalize( normal + ( tilt - normal * dot( tilt, normal ) ) * uTilt );
		// a sparse flake turned away from the camera would shade black: keep it facing us a little
		if ( coverage <= .3 ) { float fv = dot( nF, viewDir ); if ( fv < .2 ) nF = normalize( nF + viewDir * ( .2 - fv ) ); }
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
		normal = normalize( mix( normal, nF, mix( nearMask, coverage > .3 ? 1. : farOn, w ) ) );
	}

	if ( uMesh > .5 ) {
		float r = fp / uMeshPitch;
		vec4 hc = hexCell( q / uMeshPitch );
		float hole = 1. - smoothstep( uHoleR - r * .7, uHoleR + r * .7, length( hc.xy ) );
		// Holes foreshorten at glancing angles, so mesh reads more opaque towards the silhouette.
		float ndv = saturate( dot( normal, viewDir ) );
		float openK = 3.6276 * uHoleR * uHoleR * pow( ndv, .6 ); // share of light through the net
		float a = mix( 1. - hole, 1. - openK, smoothstep( .16, .45, r ) );
		// what is under the net is lit through it too: light crosses the net on the way in and
		// again on the way out, so skin or lining shows at openK^2 (a dark net darkens it twice)
		a = 1. - ( 1. - a ) * openK;
		// lace: dense toile and raised cord motifs over the net
		if ( uLace > .5 ) {
			float lm = texture2D( tLace, q / uLaceSize ).r;
			a = max( a, lm );
			normal = bumpN( normal, lm * .00025 );
			diffuseColor.rgb = mix( diffuseColor.rgb, uLaceColor, smoothstep( .3, .9, lm ) );
		}
		// two layers of mesh over the seam allowance
		if ( uSeam > .5 ) a = mix( 1. - ( 1. - a ) * ( 1. - a ), a, smoothstep( uSeamAllow - .0006, uSeamAllow + .0006, vSeam ) );
		diffuseColor.a *= max( a, flakeMask );
	}

	// Heights from flock, stamps, wrinkles and seams are summed and bumped once, after the loops:
	// screen-space derivatives inside loops with per-pixel branches are undefined on GPUs (on
	// Windows they shaded whole wrinkle zones black).
	float bumpH = 0.;

	// --- decals: logos and lettering as print, foil, holographic foil, glitter or flock
	for ( int i = 0; i < 4; i ++ ) {
		if ( i >= uDecals ) break;
		vec3 dp = ( uDecalM[ i ] * vec4( vRef, 1. ) ).xyz;
		vec4 rc = uDecalRect[ i ];
		vec4 tx = texture2D( tDecal, rc.xy + clamp( dp.xy + .5, 0., 1. ) * rc.zw );
		vec4 lk = uDecalLook[ i ];
		// stamps (look 5-7) have no art: their box is the mask
		float m = ( lk.x > 4.5 ? 1. : tx.a ) * step( abs( dp.x ), .5 ) * step( abs( dp.y ), .5 ) * step( abs( dp.z ), 1. );
		if ( m < .004 ) continue;
		vec3 col = lk.z > .5 ? tx.rgb : uDecalCol[ i ];
		float kind = lk.x, met = 0.;
		vec3 nD = normal;
		if ( kind > .5 && kind < 1.5 ) met = 1.;
		else if ( kind > 1.5 && kind < 2.5 ) {
			vec3 hd = normalize( ( viewMatrix * vec4( uHoloDirW, 0. ) ).xyz );
			col = mix( col, spectrum( dot( reflect( - viewDir, normal ), hd ) * 2. + dp.x * 3. ), .75 );
			met = 1.;
		} else if ( kind > 2.5 && kind < 3.5 ) {
			vec3 tl = hash32( floor( q / .0004 ) ) * 2. - 1.;
			nD = normalize( normal + ( tl - normal * dot( tl, normal ) ) * .45 );
			met = 1.;
		} else if ( kind > 3.5 && kind < 4.5 ) bumpH += m * .0003;
		else if ( kind > 4.5 ) {
			// surface stamps (T14): folds in the cloth itself, no colour of their own.
			// 5 gathers into a knot, 6 ruching across a gathered line, 7 a twist knot
			vec2 s = dp.xy; float r = length( s ), an = atan( s.y, s.x ), h, env;
			if ( kind < 5.5 ) { env = 1. - smoothstep( .3, .5, r ); h = sin( an * 14. ) * smoothstep( .03, .16, r ) * env + ( 1. - smoothstep( 0., .09, r ) ) * .8; }
			else if ( kind < 6.5 ) { env = ( 1. - smoothstep( .35, .5, abs( s.x ) ) ) * ( 1. - smoothstep( .42, .5, abs( s.y ) ) ); h = sin( s.y * 57. ) * ( 1. - abs( s.x ) * 1.6 ) * env; }
			else { env = 1. - smoothstep( .3, .5, r ); h = sin( an * 6. + r * 34. ) * smoothstep( .02, .12, r ) * env + ( 1. - smoothstep( 0., .07, r ) ) * .7; }
			bumpH += h * .0012 * env; // folds about a millimetre deep
			gTrimAO *= 1. - .22 * env * clamp( - h, 0., 1. );
			continue;
		}
		diffuseColor.rgb = mix( diffuseColor.rgb, col, m );
		metalnessFactor = mix( metalnessFactor, met, m );
		roughnessFactor = mix( roughnessFactor, lk.y, m );
		normal = normalize( mix( normal, nD, m ) );
		diffuseColor.a = max( diffuseColor.a, m );
	}

	// --- tension wrinkles: radial folds fanning out of the crotch and the armpits
	if ( uZone == 5 ) for ( int i = 0; i < 3; i ++ ) {
		vec4 Z = uWrinkle[ i ], ZN = uWrinkleN[ i ];
		if ( ZN.w <= 0. ) continue;
		vec3 d = vRef - Z.xyz;
		float rr = length( d );
		if ( rr > Z.w ) continue;
		vec3 ax = normalize( ZN.xyz ), u = normalize( cross( vec3( 0., 1., 0. ), ax ) ), v = cross( ax, u );
		float an = atan( dot( d, v ), dot( d, u ) );
		float env = smoothstep( .03, .065, rr ) * ( 1. - smoothstep( .45 * Z.w, Z.w, rr ) ) * ( 1. - smoothstep( .0015, .004, fp ) );
		float h = sin( an * 11. + sin( rr * 60. ) * .6 ) * env * ZN.w;
		bumpH += h * .00035;
		gTrimAO *= 1. - .1 * env * ZN.w * clamp( - h, 0., 1. );
	}

	// --- seams: a groove where the stitches pull the panels together, a soft ridge over the
	// allowance pressed to one side; the groove's shadow carries the line at a distance
	if ( uSeam > .5 ) {
		float d = vSeam, fx = max( fwidth( d ), 1e-6 ), fade = 1. - smoothstep( .0004, .0016, fx );
		bumpH += ( - .0003 * exp( - d * d / 4.9e-7 ) + .00012 * smoothstep( .0006, .003, d ) * ( 1. - smoothstep( .005, .01, d ) ) ) * fade;
		gTrimAO *= mix( .8, 1., smoothstep( 0., .0012 + fx, d ) );
	}
	if ( uZone == 5 ) normal = bumpN( normal, bumpH );

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

// Athlete skin: diffuse light wraps past the terminator, further in red than in blue (light
// scattered under the skin comes out a little way off), instead of three's plain N.L.
const DIFFUSE_LINE = 'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );';
const SKIN_DIFFUSE = /* glsl */`
	vec3 irradianceD = irradiance;
	if ( uSkin > 0. ) {
		vec3 wr = vec3( .5, .28, .22 ) * uSkin;
		irradianceD = clamp( ( dot( geometryNormal, directLight.direction ) + wr ) / ( 1. + wr ), 0., 1. ) * directLight.color;
	}
	reflectedLight.directDiffuse += irradianceD * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );`;
if (!THREE.ShaderChunk.lights_physical_pars_fragment.includes(DIFFUSE_LINE)) console.warn('fabric: three.js changed RE_Direct_Physical; skin wrap lighting is off');
const LIGHTS_PARS = THREE.ShaderChunk.lights_physical_pars_fragment.replace(DIFFUSE_LINE, SKIN_DIFFUSE);

// Thin-film thickness from the fabric's swirl field instead of one value (oil-slick, liquid hologram).
const FILM_FRAGMENT = /* glsl */`
#ifdef USE_IRIDESCENCE
	if ( uFilm > 0. ) material.iridescenceThickness = mix( uFilmRange.x, uFilmRange.y, gFilm );
#endif
`;

export function createFabricMaterial(zone) {
	const panel = zone === 5;
	const u = {
		uZone: { value: zone }, uSleeveSplit: { value: 0 }, uOffset: { value: panel ? 0.0012 : zone >= 3 ? 0 : 0.0012 + zone * 0.00015 },
		uGarment: { value: panel || zone < 3 ? 1 : 0 }, uClip: { value: 0 }, uTape: { value: 0 }, uUV: { value: panel ? 1 : 0 }, uGrain: { value: 0 },
		uTrimInset: { value: 0 }, uTrimWidth: { value: 0 }, uRows: { value: new THREE.Vector2() }, uThread: { value: new THREE.Color() },
		uTapeY: { value: new THREE.Vector4(1.04, 1.168, 0.83, 1.357) }, uTapeColor: { value: new THREE.Color(0x15151a) },
		uFlake: { value: 0 }, uPitch: { value: 0.001 }, uDotR: { value: 0.4 }, uPresence: { value: 1 }, uTilt: { value: 0.1 },
		uFoilRough: { value: 0.2 }, uColorVar: { value: 0 }, uFoilColor: { value: new THREE.Color(1, 1, 1) },
		uHolo: { value: 0 }, uHoloFreq: { value: 3 }, uHoloJit: { value: 0.2 }, uHoloDirW: { value: new THREE.Vector3(0.3, 1, 0.5).normalize() },
		uMesh: { value: 0 }, uMeshPitch: { value: 0.0007 }, uHoleR: { value: 0.34 },
		uBumpAmp: { value: 0 }, uBumpScale: { value: 0.003 }, uKnit: { value: 0 },
		uChecker: { value: 0 },
		uTex: { value: 0 }, tBase: { value: null }, tNormal: { value: null }, tRough: { value: null }, tAlpha: { value: null }, tMtl: { value: null }, tMask: { value: null },
		uTile: { value: new THREE.Vector2(0.1, 0.1) }, uTexRecolour: { value: 0 }, uTexTint: { value: new THREE.Color(1, 1, 1) }, uTexLum: { value: 1 }, uTexNormal: { value: 1 },
		uTexFlags: { value: new THREE.Vector4() }, uMaskOn: { value: new THREE.Vector4() },
		uMaskCol0: { value: new THREE.Color() }, uMaskCol1: { value: new THREE.Color() }, uMaskCol2: { value: new THREE.Color() }, uMaskCol3: { value: new THREE.Color() },
		uOmbre: { value: 0 }, uOmbreColor: { value: new THREE.Color(0, 0, 0) }, uOmbreY: { value: new THREE.Vector2(0.82, 1.32) },
		uSkin: { value: 0 }, uSeam: { value: 0 }, uSeamAllow: { value: 0.006 }, uClipShell: { value: 0 },
		uDuo: { value: 0 }, uDuoColor: { value: new THREE.Color() }, uDuoPow: { value: 2 },
		uFilm: { value: 0 }, uFilmScale: { value: 0.04 }, uFilmRange: { value: new THREE.Vector2(250, 700) }, uFilmWarp: { value: 1.5 }, uFilmTint: { value: 0 },
		uLace: { value: 0 }, tLace: { value: null }, uLaceSize: { value: 0.16 }, uLaceColor: { value: new THREE.Color() },
		uPrint: { value: 0 }, tPrint: { value: null }, uPrintSize: { value: new THREE.Vector2(0.2, 0.2) }, uPrintOffset: { value: new THREE.Vector2() },
		uDecals: { value: 0 }, uDecalM: { value: [0, 1, 2, 3].map(() => new THREE.Matrix4()) }, uDecalRect: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) },
		uDecalLook: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) }, uDecalCol: { value: [0, 1, 2, 3].map(() => new THREE.Color()) }, tDecal: { value: null },
		uWrinkle: { value: [0, 1, 2].map(() => new THREE.Vector4()) }, uWrinkleN: { value: [0, 1, 2].map(() => new THREE.Vector4()) },
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
			.replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' + AO_FRAGMENT)
			.replace('#include <lights_physical_pars_fragment>', LIGHTS_PARS)
			.replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n' + FILM_FRAGMENT);
	};
	m.customProgramCacheKey = () => 'leotard-fabric';
	return m;
}

// Sheen is left off the foil and glitter fabrics on purpose: it roughly doubles the cost of every
// light and is invisible next to the foil.
// Flake fields: pitch (m), dotR (cells), presence, tilt, rough, colorVar, holo, holoFreq, holoJit.
export const FABRICS = {
	matte: { label: 'Matte lycra', roughness: 0.8, sheen: 0.4, sheenRoughness: 0.6, knit: 1 },
	checker: { label: 'UV checker (debug)', roughness: 0.8, checker: 0.02 },
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
	// Moodboard looks added in P3 (realism upgrade R7b). film: thin-film swirls { scale m, range nm, warp };
	// duo: { pow } shift towards the second colour at grazing angles; lace: { size m per repeat }.
	liquidholo: { label: 'Liquid hologram (opal)', roughness: 0.3, metalness: 0.25, iridescence: 1, film: { scale: 0.08, range: [300, 820], warp: 2.5, tint: 0.32 },
		flake: { pitch: 0.0005, dotR: 0.45, presence: 0.025, tilt: 0.5, rough: 0.1, colorVar: 0.3, holo: 0.35, holoFreq: 2.5, holoJit: 1.2 } },
	oilslick: { label: 'Oil-slick foil', metalness: 1, roughness: 0.22, iridescence: 1, film: { scale: 0.05, range: [320, 980], warp: 1.6 }, bump: { amp: 0.3, scale: 0.004 } },
	duochrome: { label: 'Duochrome foil', metalness: 1, roughness: 0.24, duo: { pow: 2.2 }, bump: { amp: 0.3, scale: 0.0035 } },
	chrome: { label: 'Mirror chrome', metalness: 1, roughness: 0.06, bump: { amp: 0.12, scale: 0.02 } },
	glitterfoil: { label: 'Glitter-grain foil', metalness: 1, roughness: 0.3, flake: { pitch: 0.00035, dotR: 0.58, presence: 1, tilt: 0.35, rough: 0.18, colorVar: 0.25 } },
	lace: { label: 'Lace (floral, on net)', roughness: 0.7, sheen: 0.3, sheenRoughness: 0.6, mesh: { pitch: 0.0011, holeR: 0.28 }, lace: { size: 0.3 } },
	illusion: { label: 'Illusion mesh (very sheer)', roughness: 0.8, sheen: 0.2, sheenRoughness: 0.6, mesh: { pitch: 0.0006, holeR: 0.46 } },
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
// colour2: an explicit second colour (hex) for the foil, the ombre's far end or the duochrome
// shift, instead of the `second` choice.
export function applyFabric(m, key, colour, second, colour2 = null) {
	const f = FABRICS[key] ?? FABRICS.matte, u = m.userData.u, fl = f.flake, base = _c.set(colour).clone();
	const two = (forOmbre, out) => (colour2 ? out.set(colour2) : secondColour(base, second, forOmbre, out));
	m.color.copy(base).multiplyScalar(f.velvet ? 0.42 : 1);
	m.roughness = f.roughness ?? 0.7;
	m.metalness = f.metalness ?? 0;
	m.sheen = f.sheen ?? 0;
	m.sheenRoughness = f.sheenRoughness ?? 0.6;
	m.sheenColor.copy(base).lerp(_c.set(0xffffff), f.velvet ? 0.25 : 0.35); // a knit's sheen carries its own colour
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
		two(false, u.uFoilColor.value);
	}
	u.uDuo.value = f.duo ? 1 : 0;
	if (f.duo) {
		u.uDuoPow.value = f.duo.pow;
		if (colour2 || second !== 'Tone-on-tone') two(false, u.uDuoColor.value);
		else { base.getHSL(_hsl); u.uDuoColor.value.setHSL((_hsl.h + 0.22) % 1, Math.min(_hsl.s * 1.1, 1), _hsl.l); }
	}
	u.uFilm.value = f.film ? 1 : 0;
	if (f.film) { u.uFilmScale.value = f.film.scale; u.uFilmRange.value.fromArray(f.film.range); u.uFilmWarp.value = f.film.warp; u.uFilmTint.value = f.film.tint ?? 0; }
	u.uLace.value = f.lace ? 1 : 0;
	// lace: the second colour (custom) is the motifs' and cord's; otherwise a lighter tone of the net
	if (f.lace) { u.tLace.value = laceTexture(); u.uLaceSize.value = f.lace.size; if (colour2) u.uLaceColor.value.set(colour2); else u.uLaceColor.value.copy(base).multiplyScalar(1.12); }
	u.uMesh.value = f.mesh ? 1 : 0;
	if (f.mesh) { u.uMeshPitch.value = f.mesh.pitch; u.uHoleR.value = f.mesh.holeR; }
	u.uBumpAmp.value = f.bump?.amp ?? 0;
	if (f.bump) u.uBumpScale.value = f.bump.scale;
	u.uKnit.value = f.knit ?? 0;
	u.uChecker.value = f.checker ?? 0;
	u.uOmbre.value = f.ombre ? 1 : 0;
	if (f.ombre) two(true, u.uOmbreColor.value);
	// Opaque fabrics are drawn before the skin with alpha-to-coverage edges, so the skin beneath
	// them fails the depth test and is never shaded. Only sheer fabrics take the blended path.
	m.transparent = !!f.mesh;
	m.alphaToCoverage = !f.mesh;
	m.needsUpdate = true; // sheen / clearcoat / anisotropy / iridescence switch shader variants
}

// Bind a scanned texture set (materials/textures.js) to a fabric material, or unbind it (set = null).
// opts: { scale (tile multiplier), recolour (tint the luminance with `colour`), colour, masks: [colours],
//         normal (strength) }
export function applyTexture(m, set, opts = {}) {
	const u = m.userData.u;
	if (!set) { u.uTex.value = 0; return; }
	u.uTex.value = 1;
	u.tBase.value = set.base; u.tNormal.value = set.normal; u.tRough.value = set.rough; u.tAlpha.value = set.alpha; u.tMtl.value = set.mtl; u.tMask.value = set.mask;
	const k = opts.scale ?? 1;
	u.uTile.value.set(set.tile[0] * k, set.tile[1] * k);
	u.uTexRecolour.value = opts.recolour ? 1 : 0;
	u.uTexTint.value.set(opts.colour ?? '#ffffff');
	u.uTexLum.value = set.lum || 1;
	u.uTexNormal.value = set.normal ? (opts.normal ?? 1) : 0;
	const masks = (opts.masks ?? []).slice(0, set.maskCount);
	u.uTexFlags.value.set(set.rough ? 1 : 0, set.hasAlpha ? 1 : 0, set.hasMetal ? 1 : 0, masks.length && set.mask ? 1 : 0);
	u.uMaskOn.value.set(...[0, 1, 2, 3].map((i) => (masks[i] ? 1 : 0)));
	[u.uMaskCol0, u.uMaskCol1, u.uMaskCol2, u.uMaskCol3].forEach((c, i) => c.value.set(masks[i] ?? '#ffffff'));
	if (set.hasAlpha) { m.transparent = true; m.alphaToCoverage = false; m.depthWrite = true; }
	m.needsUpdate = true;
}
