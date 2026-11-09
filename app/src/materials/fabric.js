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
// (keep < 0 is discarded when uClip is on).
// On the WebGPU renderer its twin in node code is materials/fabric-node.js (createFabricMaterial hands over): change both.
import * as THREE from 'three';
import { RENDERER } from '../render/webgpu.js';
import { createFabricNodeMaterial } from './fabric-node.js';

const PARS_VERTEX = /* glsl */`
// the fabric's per-vertex inputs, packed to stay within 16 vertex attributes: materials/fabric-attributes.js (names, sizes, slots)
attribute vec4 aCoverZone; // x cover, y ambient occlusion, zw the garment-zone fields (body/mannequin.js)
attribute vec4 aKeepForm;  // x keep (< 0 cut away), yz the dress-form tape fields, w panels: 0..1 position in the panel's colour gradient (render/garment.js)
attribute vec3 aLift;      // skin (or slid fabric) to the garment surface (body/mannequin.js updateGarment)
attribute vec4 aFold;      // xyz folds where a fit leaves fabric gathered: height as twice-the-angle x, y and height, metres (pipeline/wrap_block.py folds); zero elsewhere. w panels: metres to the nearest seam (render/garment.js)
varying vec3 vFold;
attribute vec3 aGNormal;
attribute vec3 aRef;
attribute vec2 aRim;
varying vec2 vRim;
attribute vec2 aUV;
varying vec2 vUV;
varying float vGrad;
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
transformed += normal * uOffset + aLift * uGarment;
vFold = aFold.xyz;
vObjPos = position;
vObjNormal = normal;
vCover = aCoverZone.x;
vZone = aCoverZone.zw;
vAO = mix( aCoverZone.y, 1. - ( 1. - aCoverZone.y ) * .3, uGarment ); // fabric spans the crevice, so it is barely shaded
vRef = aRef;
vKeep = aKeepForm.x;
vForm = aKeepForm.yz;
vRim = aRim;
vUV = aUV;
vGrad = aKeepForm.w;
vSeam = aFold.w;
`;

const BEGIN_NORMAL = /* glsl */`
objectNormal = normalize( mix( objectNormal, aGNormal, uGarment ) );
`;

const PARS_FRAGMENT = /* glsl */`
varying vec3 vObjPos;
varying vec3 vRef;
varying float vKeep;
varying vec2 vForm;
uniform float uClip;       // 1 = dress form: discard everything outside the cut (keep < 0)
uniform float uTape;       // 1 = dress-form style tapes on the mannequin
uniform vec4 uTapeY;       // reference-body heights of the waist, bust, hip and neck tapes
uniform vec3 uTapeColor;
varying vec3 vObjNormal;
varying float vCover;
varying vec2 vZone;
varying float vAO;
varying vec3 vFold;

uniform int uZone;        // 0-2 POC zones, 3 skin, 4 finished edge, 5 panel (exact geometry, cloth-space UVs)
varying vec2 vUV;          // cloth-space coordinates of a panel, metres (garment/flatten.js)
uniform float uUV;         // 1 = pattern space is vUV rotated by uGrain, 0 = tri-planar object space
uniform float uGrain;      // grain angle on the panel, radians
uniform float uSleeveSplit;
uniform float uTrimInset;  // metres the fabric's cut is pulled back under the finished edge (hides the jagged cut)
uniform float uTrimWidth;  // finished edge width, for the contact shadow it casts on the fabric beside it
varying vec2 vRim;         // finished edge: x = distance from the edge (profile metres), y = metres along it
uniform vec2 uRows;        // topstitch rows, metres from the edge (0 = no row)
uniform float uZig;        // a zigzag stitch along the edge: half its width, metres (0 = none)
uniform vec3 uThread;
float gTrimAO = 1.;

uniform float uFlake;      // 1 = foil dots / glitter flakes on
uniform float uPitch;      // flake spacing, metres
uniform float uDotR;       // flake radius, in cells (0.577 fills the hex cell)
uniform float uPresence;   // fraction of cells that carry a flake
uniform float uTilt;       // random flake tilt (tangent of the typical angle)
uniform float uFoilRough;
uniform float uBlend;      // 1 = flat foil dots whose sparkle averages into a shimmer far away
uniform float uBend;       // cells the dot lattice is bent by (mystique: rows curving from patch to patch)
uniform float uColorVar;   // per-flake brightness variation
uniform float uGlint;      // > 0: the flakes are glossy yarn facets, not foil: dielectric, the dye's colour, glint strength
// Microcylinder satin (Sadeghi et al. 2013; knowledge/engineering/rendering/fabric-shading/
// microcylinder-cloth-model.md): the floats' reflection, traced into the environment (MICRO_FRAGMENT)
uniform float uMicro;      // 1 = on
uniform float uMicroEta;   // the threads' refractive index
uniform vec3 uMicroA1;     // the floats' (flat threads') albedo A, linear
uniform vec4 uMicroT1;     // the floats: x gamma_s, y gamma_v (radians), z kd, w coverage a
uniform vec3 uMicroA2;     // the cross (twisted) threads' albedo
uniform vec4 uMicroT2;     // the cross threads, as uMicroT1 (tangent curve: offset 0)
uniform vec2 uMicroR1;     // environment lookup roughness matching the floats' gamma_s, gamma_v
uniform vec2 uMicroR2;     // and the cross threads' (MICRO_XNARROW)
uniform float uMicroOff[ 8 ]; // the floats' tangent curve: offsets at its control points (radians)
uniform float uMicroLen[ 7 ]; // and the lengths of the segments between them
uniform sampler2D tMicroLut; // MICRO_LUT: the cross threads' and kd share's kernels by view angle (microLut)
uniform float uMicroKdW[ 7 ]; // MICRO_LANA: a constant segment's weight for the kd share (its length plus its nearest sloped segments')
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
uniform float uTexRoughRel; // > 0: the roughness map only varies the fabric's own roughness (divided by its mean, uTexRoughMean)
uniform float uTexRoughMean;
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
uniform float uClipShell;  // 1 = a lining: only where the shell has fabric (cover carries the shell's cover)
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
uniform vec2 uFilmHue;     // that colour's hue: x per unit of swirl, y per unit of the reflection's turn (the angle)
float gFilm = .5;
vec3 gMicroN = vec3( 0., 0., 1. ), gMicroT1 = vec3( 1., 0., 0. ), gMicroT2 = vec3( 0., 1., 0. ); // the thread model's frame (end of FABRIC_FRAGMENT)
vec3 gMicroLD[ 8 ], gMicroLC[ 8 ]; int gMicroLN = 0; // the direct lights, noted for one pass after the light loop (MICRO_LLOOP)
float gFlake = 0.;              // the flake mask, for FOIL_FRAGMENT
vec3 gDye = vec3( 0. ), gFoil = vec3( 0. ); // the knit's and the foil's own colours, for FOIL_FRAGMENT
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
// Mystique's dot screen (uBend): grains about GRAIN cells across, each its own turned honeycomb, bent
// by a slow displacement (cells, two octaves) so the rows also curve within a grain.
const float GRAIN = 9.;
vec2 bendOf( vec2 c ) {
	return ( vec2( vnoise( c * .045 ), vnoise( c * .045 + 19.7 ) ) - .5 ) * 2. * uBend
		+ ( vec2( vnoise( c * .11 + 3.3 ), vnoise( c * .11 + 8.1 ) ) - .5 ) * .7 * uBend;
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
		// One mip level blurrier than the GPU picks for the colour, roughness and relief: at its own
		// choice a knit's loop columns (one or two pixels at arm's length) still flicker. What the blur
		// removes from the relief comes back as roughness (Toksvig, below). The levels themselves are
		// Gaussian, not the GPU's boxes (textures.js mipChain).
		const float TB = 1.;
		vec4 tb = texture2D( tBase, tuv, TB );
		vec3 col = tb.rgb;
		if ( uTexRecolour > .5 ) col = uTexTint * ( dot( col, vec3( .2126, .7152, .0722 ) ) / max( uTexLum, 1e-3 ) );
		if ( uTexFlags.w > .5 ) {
			vec4 mk = texture2D( tMask, tuv ) * uMaskOn;
			float sh = dot( tb.rgb, vec3( .2126, .7152, .0722 ) ) / max( uTexLum, 1e-3 );
			col = mix( col, uMaskCol0 * sh, mk.x ); col = mix( col, uMaskCol1 * sh, mk.y );
			col = mix( col, uMaskCol2 * sh, mk.z ); col = mix( col, uMaskCol3 * sh, mk.w );
		}
		diffuseColor.rgb = col;
		if ( uTexFlags.x > .5 ) {
			float tr = texture2D( tRough, tuv, TB ).r;
			roughnessFactor = clamp( uTexRoughRel > .5 ? roughnessFactor * tr / max( uTexRoughMean, .05 ) : tr, .04, 1. );
		}
		if ( uTexFlags.z > .5 ) metalnessFactor = max( metalnessFactor, texture2D( tMtl, tuv ).r );
		if ( uTexFlags.y > .5 ) diffuseColor.a *= texture2D( tAlpha, tuv ).r;
		if ( uTexNormal > 0. ) {
			vec3 tn = texture2D( tNormal, tuv, TB ).xyz * 2. - 1.;
			// Toksvig: a texel seen from afar averages many directions (mipmaps), so its normal comes out
			// shorter than 1. That spread is relief too small to see, which the eye sees as a broader,
			// softer shine, not as a flat surface: it widens the GGX lobe (alpha^2 += 2 variance,
			// capped as Filament's specular anti-aliasing is).
			float tl = max( length( tn ), 1e-3 ), tv = min( ( 1. - tl ) / tl * uTexNormal * uTexNormal, .18 );
			float ta = roughnessFactor * roughnessFactor;
			roughnessFactor = sqrt( sqrt( min( ta * ta + 2. * max( tv, 0. ), 1. ) ) );
			tn.xy *= uTexNormal;
			normal = normalize( cotangentFrame( normal, - vViewPosition, tuv ) * tn );
		}
	}
#ifdef FAB_MICRO
	if ( uMicro > 0. ) diffuseColor.rgb = vec3( 0. ); // the thread model has no separate diffuse: all of its light is in MICRO_FRAGMENT
#endif
	if ( uPrint > .5 ) {
		vec4 pc = texture2D( tPrint, ( q - uPrintOffset ) / uPrintSize );
		diffuseColor.rgb = mix( diffuseColor.rgb, pc.rgb, pc.a );
	}
#ifdef FAB_CHECKER
	if ( uChecker > 0. ) {
		vec2 cq = floor( q / uChecker );
		float ck = mod( cq.x + cq.y, 2. );
		vec2 fq = fract( q / uChecker );
		float arrow = step( abs( fq.x - .5 ), .06 ) * step( .2, fq.y ) * step( fq.y, .8 ); // grain line up each cell
		diffuseColor.rgb = mix( diffuseColor.rgb * mix( .55, 1., ck ), vec3( 1. ), arrow * .8 );
	}
#endif
	float ombre = 1.;
	if ( uOmbre > .5 ) {
		ombre = uOmbre > 1.5 ? 1. - smoothstep( 0., 1., vGrad ) // along a line or a direction (render/garment.js)
			: smoothstep( uOmbreY.x, uOmbreY.y, vRef.y + .025 * sin( vRef.x * 11. ) ); // reference body: the fade lands at the same place on every size
		diffuseColor.rgb = mix( uOmbreColor, diffuseColor.rgb, ombre );
	}
	// duochrome foil: the colour turns towards a second hue as the surface turns away
#ifdef FAB_DUO
	if ( uDuo > 0. ) diffuseColor.rgb = mix( diffuseColor.rgb, uDuoColor, uDuo * pow( 1. - saturate( dot( normal, viewDir ) ), uDuoPow ) );
#endif
	// thin-film thickness swirls: folded value noise (oil-slick, liquid hologram), read in lights_physical_fragment
#ifdef FAB_FILM
	if ( uFilm > 0. ) {
		vec2 fq = q / uFilmScale;
		vec2 wq = fq + ( vec2( vnoise( fq * .6 + 3.1 ), vnoise( fq * .6 + 8.7 ) ) - .5 ) * uFilmWarp;
		gFilm = clamp( vnoise( wq ) * .7 + vnoise( wq * 2.7 + 1.3 ) * .3, 0., 1. );
		// a hologram print shows its colours in the cloth itself, shifting as the surface turns
		if ( uFilmTint > 0. ) {
			vec3 hd = normalize( ( viewMatrix * vec4( uHoloDirW, 0. ) ).xyz );
			vec3 ft = spectrum( gFilm * uFilmHue.x + dot( reflect( - viewDir, normal ), hd ) * uFilmHue.y );
			diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * ( .62 + .5 * ft ), uFilmTint );
		}
	}
#endif

	// --- knit: the technical face of a warp-knit tricot. Columns of V-shaped loops along the grain
	// (wales, ~26 per cm), stacked in courses (~44 per cm), the counts on Carvico's matte tricot data
	// sheets (knowledge/domain/fabrics/matte-tricot.md). Each scale fades on its own, to its average
	// so the colour at a distance does not change, once it is under about four pixels (fp, |dx| +
	// |dy|, runs about 1.5x a pixel; at two to three pixels the wale columns beat into diagonal
	// moire): the loop's two legs first, then the courses, then the wale columns. The grooves
	// between the wales are deeper than the gap between a loop's legs, and a little darker.
	// A scanned texture brings its own knit, so this one is off under a scan.
	vec3 nCloth = normal; // before the knit: what mystique's foil dots lie on (below)
#ifdef FAB_KNIT
	if ( uKnit > 0. && uTex < .5 ) {
		const vec2 kp = vec2( .00038, .00023 ); // wale, course pitch (m)
		float fw = 1. - smoothstep( .3, .5, fp / kp.x ), fc = 1. - smoothstep( .3, .5, fp / kp.y );
		float fl = 1. - smoothstep( .3, .5, fp / ( kp.x * .5 ) );
		if ( fw > 0. ) {
			vec2 k = q / kp;
			float wx = fract( k.x ) - .5, d = abs( wx ) - .25;
			float legs = mix( .667, max( 1. - 16. * d * d, 0. ), fl );          // the two legs of each loop; .667: their average
			float across = .6 * ( 1. - 4. * wx * wx ) + .4 * legs;               // the wale column round it (average .667)
			float cy = fract( k.y + abs( wx ) * .7 ) - .5;                       // legs lean into a V
			float along = mix( .79, 1. - 2.5 * cy * cy, fc );                    // .79: its average
			float loop = across * along;
			normal = bumpN( normal, loop * kp.x * .1 * uKnit * fw );
			diffuseColor.rgb *= 1. + ( loop - .53 ) * .1 * uKnit * fw;           // .53: the loop's average
		}
	}
#endif

#ifdef FAB_BUMP
	if ( uBumpAmp > 0. ) {
		float fade = 1. - smoothstep( .25, .6, fp / uBumpScale );
		if ( fade > 0. ) {
			vec2 b = q / uBumpScale;
			float hgt = vnoise( b ) + .5 * vnoise( b * 2.13 + 5.2 );
			normal = bumpN( normal, hgt * uBumpAmp * uBumpScale * fade );
		}
	}
#endif

	float flakeMask = 0.;
#ifdef FAB_FLAKE
	if ( uFlake > .5 ) {
		vec2 qc = q / uPitch;
		float r = fp / uPitch; // pixel size in cells

		float w = smoothstep( .22, .6, r ); // 0 = flakes resolved, 1 = flakes smaller than a pixel
		float nearMask = 0., rvNear = 0., rvFar = 0., farDots = 1.;
		vec3 nearTilt = vec3( 0. ), farTilt = vec3( 0. );

		// Near: resolve each flake as a disc in a hex cell with its own tilt. (The two branches
		// are skipped where they contribute nothing; most pixels only ever need one of them.)
		if ( w < 1. ) {
			// Mystique's dots are packed evenly, like marbles pressed together: in small patches they sit
			// in honeycomb rows, each patch's rows running their own way and curving a little, which reads
			// as short wavy chains (shop close-up, 2026-10-27). So: grains of about GRAIN cells (a jittered
			// grid), each with its own turned and shifted lattice; a point takes the dot under it from its two
			// nearest grains, each kept only if the dot's centre lies in that grain (dots are never cut by a
			// grain's edge). The lattice is looked up in gently bent coordinates (uBend), and the offset to
			// the dot's centre is taken back through the bend (its Jacobian) so the dots stay round.
			vec2 qn = qc, off = vec2( 9. ), did = vec2( 0. ); mat2 unbend = mat2( 1. );
#ifdef FAB_BEND
			if ( uBend > 0. ) {
				vec2 b0 = bendOf( qc );
				qn = qc + b0;
				unbend = inverse( mat2( 1. ) + mat2( bendOf( qc + vec2( .5, 0. ) ) - b0, bendOf( qc + vec2( 0., .5 ) ) - b0 ) * 2. );
				vec2 g = floor( qn / GRAIN ), c1 = vec2( 0. ), c2 = vec2( 0. ), k1 = vec2( 0. ), k2 = vec2( 0. );
				float d1 = 1e9, d2 = 1e9;
				for ( int j = - 1; j <= 1; j ++ ) for ( int i = - 1; i <= 1; i ++ ) {
					vec2 k = g + vec2( i, j ), c = ( k + .15 + .7 * hash32( k + 41.7 ).xy ) * GRAIN;
					float d = dot( qn - c, qn - c );
					if ( d < d1 ) { d2 = d1; c2 = c1; k2 = k1; d1 = d; c1 = c; k1 = k; } else if ( d < d2 ) { d2 = d; c2 = c; k2 = k; }
				}
				for ( int s = 0; s < 2; s ++ ) {
					vec2 c = s == 0 ? c1 : c2, o = s == 0 ? c2 : c1, k = s == 0 ? k1 : k2;
					vec3 h = hash32( k + 7.9 );
					float a = h.x * 1.0472, ca = cos( a ), sa = sin( a ); // any turn of a honeycomb is within 60 degrees
					mat2 rot = mat2( ca, sa, - sa, ca );
					vec4 hk = hexCell( rot * ( qn - c ) + h.yz * 9. );
					vec2 jit = ( hash32( hk.zw + k * 131.7 + 3.7 ).xy - .5 ) * 2. * max( .5 - uDotR, 0. );
					vec2 o2 = transpose( rot ) * ( hk.xy - jit ), cw = qn - o2; // offset from the dot, and its centre
					if ( dot( cw - c, cw - c ) <= dot( cw - o, cw - o ) && dot( o2, o2 ) < dot( off, off ) ) { off = o2; did = hk.zw + k * 131.7; }
				}
			} else
#endif
			{
				vec4 hc = hexCell( qc );
				// Nudge each flake off the lattice centre (it still fits its own cell): a perfect grid
				// beats against the pixel grid and shows moire at mid distance.
				off = hc.xy - ( hash32( hc.zw + 3.7 ).xy - .5 ) * 2. * max( .5 - uDotR, 0. );
				did = hc.zw;
			}
			vec3 rn = hash32( did );
			nearMask = ( 1. - smoothstep( uDotR - r * .7, uDotR + r * .7, length( unbend * off ) ) ) * step( rn.z, uPresence );
			nearTilt = hash32( did + 17.3 ) * 2. - 1.;
			rvNear = rn.x;
		}

		// Far: flakes are smaller than a pixel. Keep the sparkle by tilting cells that track the
		// pixel size (about 1.6 px; 1 px for blending foil dots, below, whose sparkle fades anyway;
		// blended across two octaves so they do not pop), and carry the foil coverage as a metal fraction.
		if ( w > 0. ) {
			float lod = max( log2( r * mix( 1.6, 1., uBlend ) ), 0. );
			float l0 = floor( lod ), lf = lod - l0, s0 = exp2( l0 );
			vec3 ta = hash32( floor( qc / s0 ) + l0 * 7.13 );
			vec3 tb = hash32( floor( qc / ( s0 * 2. ) ) + ( l0 + 1. ) * 7.13 );
			farTilt = mix( ta, tb, lf ) * 2. - 1.;
			rvFar = ta.z;
			farDots = s0 * s0 * mix( 1., 4., lf ) * 1.155 * uPresence; // flakes in a cell (1.155 per unit² on the hex lattice)
		}
		float coverage = min( 3.6276 * uDotR * uDotR, 1. ) * uPresence;
		// sparse flakes stay sparse far away: only a coverage share of the pixel-sized cells carry one
		// (denser foils, coverage over 0.3, keep every cell sparkling as in the POC)
		float farOn = coverage > .3 ? coverage : step( fract( rvFar * 7.31 ), coverage );

		// Yarn glints (uGlint) fade once they are smaller than a pixel: a shiny leotard shows no sparkle at
		// arm's length or more (Nike, GK cire product photos), only up close (swatch photos).
		float gw = uGlint > 0. ? 1. - .9 * w : 1.;
		flakeMask = mix( nearMask, farOn, w ) * gw;
		// Flat foil dots (uBlend: mystique): a cell holds several dots whose tilts average out (spread /
		// sqrt(n)), and the spread that is lost widens the foil's highlight instead (Toksvig: alpha² += 2
		// slope variance), so the sparkle blends into a smooth shimmer with distance, as in product photos.
		// Glitter keeps a full-strength tilt per cell: real glitter still sparkles across a room.
		float keep = mix( 1., inversesqrt( max( farDots, 1. ) ), w * uBlend );
		float foilA = uFoilRough * uFoilRough;
		float foilRough = sqrt( sqrt( foilA * foilA + ( 1. - keep * keep ) * uTilt * uTilt * .667 ) );
		vec3 tilt = mix( nearTilt, farTilt * keep, w );
		float rv = mix( rvNear, rvFar, w );

		// Flat foil dots (uBlend) bridge the knit's loops: a smooth disc each, not ridged by the knit
		vec3 nBase = uBlend > 0. ? nCloth : normal;
		vec3 nF = normalize( nBase + ( tilt - nBase * dot( tilt, nBase ) ) * uTilt );
		// a sparse flake turned away from the camera would shade black: keep it facing us a little
		if ( coverage <= .3 && uGlint <= 0. ) { float fv = dot( nF, viewDir ); if ( fv < .2 ) nF = normalize( nF + viewDir * ( .2 - fv ) ); }
		// On an ombre the foil is printed with the same gradient as the cloth under it.
		vec3 fc = mix( uOmbreColor * 1.8 + .05, uFoilColor, ombre ) * ( 1. + uColorVar * ( rv - .5 ) );
		if ( uHolo > 0. ) {
			vec3 hd = normalize( ( viewMatrix * vec4( uHoloDirW, 0. ) ).xyz );
			// Hue follows the smooth surface so rainbow bands sweep across the body as it turns;
			// each flake then departs from its band by a little (dots) or a lot (shards, glitter).
			float ph = dot( reflect( - viewDir, normal ), hd ) * uHoloFreq + ( rv - .5 ) * uHoloJit + dot( tilt, hd ) * uTilt * uHoloJit;
			fc = mix( fc, spectrum( ph ) * ( .75 + .5 * rv ), uHolo );
		}
		gDye = diffuseColor.rgb; gFoil = fc; gFlake = flakeMask;
		if ( uGlint > 0. ) gFoil = mix( diffuseColor.rgb, vec3( 1. ), .5 ) * ( 1. + uColorVar * ( rv - .5 ) ); // a yarn facet keeps the dye; its glint is part white (FOIL_FRAGMENT)
		else {
			diffuseColor.rgb = mix( diffuseColor.rgb, fc, flakeMask );
			metalnessFactor = mix( metalnessFactor, 1., flakeMask );
		}
		roughnessFactor = mix( roughnessFactor, foilRough, flakeMask );
		normal = normalize( mix( normal, nF, mix( nearMask, coverage > .3 ? 1. : farOn, w ) * gw ) );
	}
#endif

#ifdef FAB_MESH
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
		// two layers of mesh over the seam allowance
		if ( uSeam > .5 ) a = mix( 1. - ( 1. - a ) * ( 1. - a ), a, smoothstep( uSeamAllow - .0006, uSeamAllow + .0006, vSeam ) );
		diffuseColor.a *= max( a, flakeMask );
	}
#endif

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

	// --- folds a fit leaves: soft waves across the direction the fabric is squeezed, shorter than the garment and uneven, deeper where more length is spare.
	// 314 is 2 pi over the 20 mm wavelength in pipeline/wrap_block.py FOLD_WAVELENGTH. A bump can only shade a fold, and full height shades as hard stripes: .25 is by eye (TUNABLE)
	if ( uZone == 5 && vFold.z > .00005 ) {
		float fa = .5 * atan( vFold.y, vFold.x ); // fd has no true sign and flips where this wraps: every wave below is a cosine of an odd phase, so a flip changes nothing
		vec2 fd = vec2( cos( fa ), sin( fa ) ), fs = vec2( - fd.y, fd.x );
		float fu = dot( vUV, fd ), fv = dot( vUV, fs );
		float wave = cos( fu * 314. + sin( fv * 31. ) * 2.2 + sin( fv * 83. + fu * 40. ) * .7 );
		float runs = .55 + .45 * cos( fv * 47. + fu * 120. + sin( fu * 70. ) * 1.5 );
		float h = wave * wave * sign( wave ) * runs;
		float depth = smoothstep( .0002, .002, vFold.z ) * vFold.z;
		bumpH += h * depth * .25;
		gTrimAO *= 1. - clamp( depth * 45., 0., .16 ) * clamp( - h, 0., 1. );
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
			// (a flat tape's rows run either side of its line)
			float du = abs( abs( vRim.x ) - r ), along = fract( vRim.y / .003 + float( k ) * .37 );
			float dash = smoothstep( .02, .1, along ) * ( 1. - smoothstep( .86, .94, along ) );
			thread = max( thread, ( 1. - smoothstep( .00016 - fx, .00016 + fx, du ) ) * dash * fade );
			groove = max( groove, 1. - smoothstep( .0001, .0007 + fx, du ) );
		}
		if ( uZig > 0. ) {
			// one thread running from side to side of the edge, about 1.4 mm to the repeat
			float tri = abs( fract( vRim.y / .0014 ) * 2. - 1. ) * 2. - 1.;
			float slope = uZig * 4. / .0014, du = abs( vRim.x - tri * uZig ) / sqrt( 1. + slope * slope );
			thread = ( 1. - smoothstep( .00011 - fx, .00011 + fx, du ) ) * fade;
			groove = 1. - smoothstep( uZig * .9, uZig * 1.25, abs( vRim.x ) );
		}
		normal = bumpN( normal, ( thread * .00012 - groove * .00018 ) * fade );
		diffuseColor.rgb = mix( diffuseColor.rgb * ( 1. - groove * mix( .12, .3, fade ) ), uThread, thread );
		diffuseColor.a = max( diffuseColor.a, thread );
		metalnessFactor = mix( metalnessFactor, 0., thread );
		roughnessFactor = mix( roughnessFactor, .6, thread );
	}

	// the thread model's frame, for its environment light (MICRO_FRAGMENT) and direct lights (MICRO_PARS):
	// the cross threads T2 round the body (the tangent), the floats T1 across it
#if defined( USE_ANISOTROPY ) && defined( FAB_MICRO )
	if ( uMicro > 0. ) { gMicroN = normal; gMicroT2 = normalize( tbn[ 0 ] - normal * dot( tbn[ 0 ], normal ) ); gMicroT1 = cross( normal, gMicroT2 ); }
#endif
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
// The thread model (uMicro) takes over three's direct lights too (MICRO_PARS microPoint, microRect):
// point, spot and directional lights (with their shadows) and the softboxes' rectangular area lights.
const MICRO_DIRECT = (head, call) => {
	const re = new RegExp('void ' + head + '\\([^{]*\\{');
	if (!re.test(LIGHTS_PARS)) console.warn(`fabric: three.js changed ${head}; the thread model's direct light is off`);
	return (src) => src.replace(re, (m) => m + `
#ifdef FAB_MICRO
	if ( uMicro > 0. ) {
${call}
		return;
	}
#endif
`);
};
// The softboxes (microRect) are not hooked in: at the model's full sampling each box cost about
// 1,400 thread evaluations per pixel, six boxes froze the app for seconds a frame (2026-10-27).
// Waiting on the owner's choice of how to evaluate them; the satin takes no light from area lights
// meanwhile (the softboxes still reach it through the reflection room).
const LIGHTS_MICRO = [
	// MICRO_LLOOP: each light is only noted here and lit once after the light loop (MICRO_FRAGMENT), so
	// microPoint is compiled once instead of once per light
	MICRO_DIRECT('RE_Direct_Physical', '#ifdef MICRO_LLOOP\n\t\tif ( gMicroLN < 8 ) { gMicroLD[ gMicroLN ] = directLight.direction; gMicroLC[ gMicroLN ] = directLight.color; gMicroLN ++; }\n#else\n\t\treflectedLight.directSpecular += microPoint( directLight.direction, geometryViewDir ) * directLight.color;\n#endif'),
	MICRO_DIRECT('RE_Direct_RectArea_Physical', ''),
].reduce((src, f) => f(src), LIGHTS_PARS);

// Thin-film thickness from the fabric's swirl field instead of one value (oil-slick, liquid hologram).
const FILM_FRAGMENT = /* glsl */`
#if defined( USE_IRIDESCENCE ) && defined( FAB_FILM )
	if ( uFilm > 0. ) material.iridescenceThickness = mix( uFilmRange.x, uFilmRange.y, gFilm );
#endif
`;

// Microcylinder satin (uMicro; Sadeghi et al. 2013, eqs 2-4 and 10-15, Table II): the paper's model
// with its own parameters and no settings fitted by eye. Two thread sets: the floats (flat threads,
// tangent curve uMicroOff/uMicroLen) and the cross threads (twisted, offset 0), each with a surface
// lobe (Fresnel, uncoloured), a volume lobe (coloured by A) and an isotropic share kd; masking M and
// reweighting P (Ashikhmin's correlation, 20 degrees), coverage a1, a2, normalised by Q (eq 15). It
// is the material's only light: three's diffuse is zeroed (FABRIC_FRAGMENT) and its specular off.
// All light comes from the scene environment (the softbox studios' reflection room or an HDRI), the
// incoming integral evaluated numerically along each thread's reflection cone:
// - the floats' Gaussian lobes (2.5 and 5 degrees) as deltas in the longitudinal angle (their
//   integral, 2), each read through a prefiltered lookup blurred to that lobe's own width (uMicroR1);
// - every broad term (the cross threads' lobes, 30 and 60 degrees, and both sets' kd share) by
//   quadrature over the longitudinal angle and azimuth (MICRO_Q), the floats' kd share at
//   each tangent segment's centre (it has no peak along the curve).
// Not in the model: direct lights (studio area lights, an HDRI rig's key and glint lights) and
// occlusion; the paper's Ft(eta, wi) Ft(eta', wr) is taken as Ft at one angle, squared.
// MICRO_Q: the quadratures' sample counts, shared by the shader and its JS twin microFurnace (keep
// them in step): K cone directions on a narrow lobe; NT x NP nodes (theta, phi) for the cross
// threads' broad lobes (CROSS) and for the floats' kd share (KD), each node's lookup blurred to
// about the nodes' spacing (QR). The kd share is faint: 6 x 8 down to 2 x 3 nodes (QR 0.5 x
// sqrt(phi spacing / 15 degrees)) stayed within 1/255 of this and cut 13-26 ms a frame (knowledge
// note, 2026-10-28); kept at full until the owner picks a level.
const MICRO_Q = { K: 12, CROSS: { NT: 8, NP: 12, QR: 0.5 }, KD: { NT: 8, NP: 12, QR: 0.5 } };
// MICRO_SPEED: shader switches (material defines) a fabric's micro.speed turns on, measured against
// the full model (knowledge note, 2026-10-28; frame times at 1071 x 1274 on the GTX 1650):
// - MICRO_LCULL: lights behind the surface skipped (exactly zero by masking), -2.7 ms;
// - MICRO_LLOOP: direct lights lit in one loop after three's, compile 9.4 -> 7.1 s, -0.6 ms;
// - MICRO_DYN: loops not unrolled (bounds read a zero uniform), compile -1.2 s, +1.1 ms;
// - MICRO_MIP: environment lookups from the nearest prefiltered level, not a blend of two, -6.1 ms, 2-4/255;
// - MICRO_SLOPE3: three tangent samples per sloped segment (four), -3.4 ms, 1-2/255;
// - MICRO_KD: the floats' kd share at 2 x 3 nodes (QR 1), -31 ms, 1/255;
// - MICRO_K 6: six cone directions (12), -8.1 ms, contour stripes up to 28/255 (look-changing);
// - MICRO_CROSS: the cross threads at 2 x 3 nodes (8 x 12), -6.0 ms, up to 30/255 (look-changing).
// microFurnace keeps MICRO_Q (the full model's scale) for every speed.
// Round three: model simplifications (owner: bolder cuts are fine while the look holds; ideas from a
// Fable review, 2026-10-28). Kept:
// - MICRO_KDENV: the floats' kd share as one roughness-1 lookup about the normal times its kernel at
//   the mean tangent, no lookups inside the quadrature;
// - MICRO_SEG n: n tangent samples per sloped segment, each lookup blurred to the spacing.
// Uncorrelated masking, which darkened the sides, was removed.
// Round four (owner: close-ups must hold 60 fps; no resolution drop; third Fable review, 2026-10-28):
// - MICRO_LANA: direct lights' narrow lobes on the sloped segments integrated analytically about the
//   offset o* that meets the specular condition (microPointA); the constant segments stay exact, and the
//   sloped segments' kd share is folded into them (uMicroKdW);
// - MICRO_LONE: direct lights from one evaluation at o* per light, the constant segments' lobes by
//   their offset from it (needs MICRO_LANA);
// - MICRO_LUT: the cross threads and the kd share as one roughness-1 lookup about n times a kernel
//   table by view angle (microLut; needs MICRO_KDENV).
// Tried and scrapped (under 1 ms each): 3 or 4 cone directions on the sloped segments with blurred
// lookups (-0.6, -0.2 ms).
// The owner chose all of them, 'all4' (Satin; 2026-10-28). The full model (no switches) and each
// step's measurements are in the knowledge note.
const MICRO_SPEED = {
	all4: { MICRO_LCULL: '', MICRO_LLOOP: '', MICRO_DYN: '', MICRO_MIP: '', MICRO_SLOPE3: '', MICRO_KD: '', MICRO_K: 6, MICRO_CROSS: '',
		MICRO_KDENV: '', MICRO_SEG: 1, MICRO_LANA: '', MICRO_LONE: '', MICRO_LUT: '' },
};
// Duotone satin (owner, 2026-10-28): MICRO_XNARROW traces the cross threads' narrow lobes (see
// FABRICS.satinduo), on the full model ('duofull') and with all of Satin's speed-ups ('duo').
MICRO_SPEED.duofull = { MICRO_XNARROW: '' };
MICRO_SPEED.duo = { ...MICRO_SPEED.all4, MICRO_XNARROW: '' };
// A broad term by quadrature: the whole thread function (iso = 0), or only its kd share (iso = 1).
// Lookups are blurred to about the quadrature's spacing (QR), which prefilters the integrand.
// ENV false: the kernel alone, every lookup taken as 1 (MICRO_KDENV).
const MICRO_BROAD = (name, { NT, NP, QR, ENV = true }) => /* glsl */`
vec3 ${name}( vec3 t, vec3 nl, vec3 bl, vec3 n, vec3 bx, vec3 wr, vec4 T, vec3 A, float eta, float iso ) {
	float sr = clamp( dot( wr, t ), - 1., 1. ), tr = asin( sr ), cr = cos( tr ), Pr = microPr( wr, n, bx );
	vec3 pv = wr - t * sr;
	float phr = atan( dot( pv, bl ), dot( pv, nl ) ), Mr = max( cos( phr ), 0. );
	vec3 acc = vec3( 0. );
	if ( Pr <= 0. || Mr <= 0. ) return acc;
	float g = 1. - iso;
	for ( int j = 0; j < MICRO_N( ${NT} ); j ++ ) {
		float ti = ( ( float( j ) + .5 ) / ${NT}. - .5 ) * PI, cti = cos( ti ), sti = sin( ti );
		float th = .5 * ( ti + tr ), ctd = cos( .5 * ( ti - tr ) );
		float gs = g * microGauss( T.x, th ), gv = g * ( 1. - T.z ) * microGauss( T.y, th );
		for ( int k = 0; k < MICRO_N( ${NP} ); k ++ ) {
			float phi = ( ( float( k ) + .5 ) / ${NP}. - .5 ) * PI;
			vec3 wi = sti * t + cti * ( cos( phi ) * nl + sin( phi ) * bl );
			float mp = microMP( wi, n, bx, phi, phr, Mr, Pr );
			if ( mp <= 0. ) continue;
			float c2 = cos( .5 * ( phi - phr ) ), Fr = microFresnel( ctd * c2, eta ), Ft = 1. - Fr;
			vec3 f = ( vec3( gs * Fr * c2 ) + Ft * Ft * ( gv + T.z ) / max( cti + cr, 1e-2 ) * A ) / max( ctd * ctd, 1e-3 );
			acc += ${ENV ? `microEnv( wi, ${QR.toFixed(3)} ) * ` : ''}f * ( mp * cti * cti );
		}
	}
	return acc * ( PI / ${NT}. ) * ( PI / ${NP}. );
}
`;
const MICRO_PARS = /* glsl */`
#ifdef FAB_MICRO
#define MICRO_NT 8
#define MICRO_NP 12
// Speed-up switches (MICRO_SPEED, set per fabric as material defines)
#ifndef MICRO_K
#define MICRO_K ${MICRO_Q.K}
#endif
uniform float uMicroZero;
#ifdef MICRO_DYN
#define MICRO_N( x ) ( ( x ) + int( uMicroZero ) )
#else
#define MICRO_N( x ) ( x )
#endif
float microFresnel( float c, float eta ) { // exact unpolarised dielectric reflectance
	float g2 = eta * eta - 1. + c * c;
	if ( g2 < 0. ) return 1.;
	float g = sqrt( g2 ), a = ( g - c ) / ( g + c ), b = ( c * ( g + c ) - 1. ) / ( c * ( g - c ) + 1. );
	return .5 * a * a * ( 1. + b * b );
}
float microGauss( float s, float x ) { return exp( - x * x / ( 2. * s * s ) ) / ( 2.5066283 * s ); }
// masking x reweighting for one incoming direction (eqs 7-13)
float microMP( vec3 wi, vec3 n, vec3 bx, float phi, float phr, float Mr, float Pr ) {
	float phd = phi - phr, u = exp( - phd * phd / ( 2. * .349 * .349 ) );
	float Mi = max( cos( phi ), 0. ), M = mix( Mi * Mr, min( Mi, Mr ), u );
	vec3 wip = wi - bx * dot( wi, bx );
	float Pi = max( dot( normalize( wip ), n ), 0. );
	return M * mix( Pi * Pr, min( Pi, Pr ), u );
}
// P(t, wr): the tangent's projected length toward the viewer (eq 11)
float microPr( vec3 wr, vec3 n, vec3 bx ) { vec3 wp = wr - bx * dot( wr, bx ); return max( dot( normalize( wp ), n ), 0. ); }
#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
#ifdef MICRO_MIP
vec3 microEnv( vec3 w, float r ) { float mip = clamp( roughnessToMip( r ), cubeUV_m0, CUBEUV_MAX_MIP ); return bilinearCubeUV( envMap, envMapRotation * inverseTransformDirection( w, viewMatrix ), floor( mip + .5 ) ); }
#else
vec3 microEnv( vec3 w, float r ) { return textureCubeUV( envMap, envMapRotation * inverseTransformDirection( w, viewMatrix ), r ).rgb; }
#endif
// A narrow-lobed tangent (the floats): surface and volume Gaussians as deltas in theta
// MICRO_LUT: where the view sits in a surface tangent's frame (t, n): theta_r and phi_r as table coordinates
vec2 microLutUV( vec3 t, vec3 n, vec3 wr ) {
	float sr = clamp( dot( wr, t ), - 1., 1. );
	vec3 pv = wr - t * sr, bl = cross( t, n );
	return vec2( asin( sr ), atan( dot( pv, bl ), dot( pv, n ) ) ) / PI + .5;
}
vec3 microNarrow( vec3 t, vec3 nl, vec3 bl, vec3 n, vec3 bx, vec3 wr, vec4 T, vec3 A, vec2 R, float eta ) {
	const int K = MICRO_K;
	float sr = clamp( dot( wr, t ), - 1., 1. ), cr = sqrt( max( 1. - sr * sr, 0. ) ), Pr = microPr( wr, n, bx );
	vec3 pv = wr - t * sr;
	float phr = atan( dot( pv, bl ), dot( pv, nl ) ), Mr = max( cos( phr ), 0. );
	vec3 acc = vec3( 0. );
	if ( Pr <= 0. || Mr <= 0. ) return acc;
	for ( int k = 0; k < MICRO_N( K ); k ++ ) {
		float phi = ( ( float( k ) + .5 ) / float( K ) - .5 ) * PI;
		vec3 wi = - sr * t + cr * ( cos( phi ) * nl + sin( phi ) * bl );
		float mp = microMP( wi, n, bx, phi, phr, Mr, Pr );
		if ( mp <= 0. ) continue;
		float c2 = cos( .5 * ( phi - phr ) ), Fr = microFresnel( cr * c2, eta ), Ft = 1. - Fr;
		acc += ( microEnv( wi, R.x ) * ( 2. * Fr * c2 ) + microEnv( wi, R.y ) * ( ( 1. - T.z ) * Ft * Ft / max( cr, 1e-2 ) ) * A ) * mp;
	}
	return acc * ( PI / float( K ) );
}
#endif
// --- direct lights (MICRO_DIRECT): the same model lit by three's lights, as the other fabrics are
// The thread function f (eqs 2-4) for one incoming direction, times masking x reweighting and cos theta_i
vec3 microFull( vec3 t, vec3 nl, vec3 bl, vec3 n, vec3 bx, vec3 wi, vec3 wr, vec4 T, vec3 A, float eta, float Pr ) {
	float si = clamp( dot( wi, t ), - 1., 1. ), sr = clamp( dot( wr, t ), - 1., 1. );
	float ti = asin( si ), tr = asin( sr ), cti = cos( ti ), cr = cos( tr );
	vec3 pi = wi - t * si, pv = wr - t * sr;
	float phi = atan( dot( pi, bl ), dot( pi, nl ) ), phr = atan( dot( pv, bl ), dot( pv, nl ) ), Mr = max( cos( phr ), 0. );
	if ( Pr <= 0. || Mr <= 0. ) return vec3( 0. );
	float mp = microMP( wi, n, bx, phi, phr, Mr, Pr );
	if ( mp <= 0. ) return vec3( 0. );
	float th = .5 * ( ti + tr ), ctd = cos( .5 * ( ti - tr ) ), c2 = cos( .5 * ( phi - phr ) );
	float Fr = microFresnel( ctd * c2, eta ), Ft = 1. - Fr;
	vec3 f = ( vec3( Fr * c2 * microGauss( T.x, th ) ) + Ft * Ft * ( ( 1. - T.z ) * microGauss( T.y, th ) + T.z ) / max( cti + cr, 1e-2 ) * A ) / max( ctd * ctd, 1e-3 );
	return f * ( mp * cti );
}
// eq 15 for the view wr
float microQ( vec3 wr ) {
	vec3 n = gMicroN, bx1 = cross( n, gMicroT1 );
	float sumP = 0., sumL = 0.;
	for ( int seg = 0; seg < 7; seg ++ ) { float w = uMicroLen[ seg ]; sumP += microPr( wr, n, bx1 ) * w; sumL += w; }
	return max( uMicroT1.w * sumP / max( sumL, 1e-4 ) + uMicroT2.w * microPr( wr, n, cross( n, gMicroT2 ) ) + ( 1. - uMicroT1.w - uMicroT2.w ) * max( dot( wr, n ), 0. ), 1e-3 );
}
#ifdef MICRO_LANA
// the unit Gaussian's cumulative distribution (a tanh fit, within 2e-4)
vec2 microCdf( vec2 x ) { x = clamp( x, - 5., 5. ); return .5 + .5 * tanh( .7978846 * ( x + .044715 * x * x * x ) ); } // clamped: tanh of a large value can overflow on some drivers
// microFull in parts, each Gaussian lobe left out: S and V are the surface and volume terms per unit of
// their Gaussian, K the kd term, th the half angle
void microParts( vec3 t, vec3 nl, vec3 bl, vec3 n, vec3 bx, vec3 wi, vec3 wr, vec4 T, vec3 A, float eta, float Pr, out float th, out vec3 S, out vec3 V, out vec3 K ) {
	S = vec3( 0. ); V = vec3( 0. ); K = vec3( 0. ); th = 0.;
	float si = clamp( dot( wi, t ), - 1., 1. ), sr = clamp( dot( wr, t ), - 1., 1. );
	float ti = asin( si ), tr = asin( sr ), cti = cos( ti ), cr = cos( tr );
	vec3 pi = wi - t * si, pv = wr - t * sr;
	float phi = atan( dot( pi, bl ), dot( pi, nl ) ), phr = atan( dot( pv, bl ), dot( pv, nl ) ), Mr = max( cos( phr ), 0. );
	if ( Pr <= 0. || Mr <= 0. ) return;
	float mp = microMP( wi, n, bx, phi, phr, Mr, Pr );
	if ( mp <= 0. ) return;
	th = .5 * ( ti + tr );
	float ctd = cos( .5 * ( ti - tr ) ), c2 = cos( .5 * ( phi - phr ) );
	float Fr = microFresnel( ctd * c2, eta ), Ft = 1. - Fr, k = mp * cti / max( ctd * ctd, 1e-3 );
	S = vec3( Fr * c2 * k );
	vec3 vol = Ft * Ft / max( cti + cr, 1e-2 ) * A * k;
	V = ( 1. - T.z ) * vol; K = T.z * vol;
}
// microPoint with the floats' sloped segments integrated analytically (MICRO_LANA): their narrow lobes
// are non-zero only near the offset o* where the tangent meets the specular condition (wi + wr) . t = 0;
// along the curve a unit Gaussian in th then integrates to rho(o*) / |dth/do| (rho: curve length per
// radian of offset there), faded where o* runs off the curve's ends. The constant segments stay exact,
// carrying the sloped segments' kd share too (uMicroKdW: each one's length plus its nearest sloped ones').
vec3 microPointA( vec3 wi, vec3 wr ) {
	vec3 n = gMicroN, T1 = gMicroT1, T2 = gMicroT2, bx1 = cross( n, T1 ), bx2 = cross( n, T2 );
#ifdef MICRO_LCULL
	if ( dot( wi, n ) <= 0. ) return vec3( 0. );
#endif
	float Pr1 = microPr( wr, n, bx1 ), lenT = 0., oMin = 1e9, oMax = - 1e9, th;
	vec3 acc1 = vec3( 0. ), S, V, K;
	for ( int seg = 0; seg < 7; seg ++ ) {
		float w = uMicroLen[ seg ], o0 = uMicroOff[ seg ], o1 = uMicroOff[ seg + 1 ];
		if ( w <= 0. ) continue;
		lenT += w; oMin = min( oMin, min( o0, o1 ) ); oMax = max( oMax, max( o0, o1 ) );
#ifdef MICRO_LONE
		continue; // the constant segments too from the one evaluation at o* (below)
#endif
		if ( o0 != o1 ) continue;
		float ca = cos( o0 ), sa = sin( o0 );
		vec3 t = ca * T1 + sa * n, nl = - sa * T1 + ca * n;
		microParts( t, nl, cross( t, nl ), n, bx1, wi, wr, uMicroT1, uMicroA1, uMicroEta, Pr1, th, S, V, K );
		acc1 += ( S * microGauss( uMicroT1.x, th ) + V * microGauss( uMicroT1.y, th ) ) * w + K * uMicroKdW[ seg ];
	}
	vec3 h = wi + wr;
	float os = atan( - dot( h, T1 ), dot( h, n ) );
	os += os > .5 * PI ? - PI : os < - .5 * PI ? PI : 0.;
	float oc = clamp( os, oMin, oMax ), ca = cos( oc ), sa = sin( oc );
	vec3 t = ca * T1 + sa * n, nl = - sa * T1 + ca * n;
	microParts( t, nl, cross( t, nl ), n, bx1, wi, wr, uMicroT1, uMicroA1, uMicroEta, Pr1, th, S, V, K );
	float si = dot( wi, t ), sr = dot( wr, t );
	float dth = max( .5 * abs( dot( wi, nl ) / max( sqrt( 1. - si * si ), 1e-3 ) + dot( wr, nl ) / max( sqrt( 1. - sr * sr ), 1e-3 ) ), 1e-3 );
	// each lobe, a Gaussian of width gamma / dth in offset about o*, weighted by the curve's length per
	// radian of offset: summed over the sloped segments with the Gaussian's share inside each. (Taking the
	// density of the one segment holding o* drew a hard line in the highlight where the density jumps,
	// at the segments' joins: owner, 2026-10-28.) This also fades the lobes off the curve's ends.
	vec2 sg = uMicroT1.xy / dth, rhoSV = vec2( 0. );
	for ( int seg = 0; seg < 7; seg ++ ) {
		float o0 = uMicroOff[ seg ], o1 = uMicroOff[ seg + 1 ], w = uMicroLen[ seg ];
		if ( o0 == o1 || w <= 0. ) continue;
		rhoSV += w / abs( o1 - o0 ) * ( microCdf( ( vec2( max( o0, o1 ) ) - os ) / sg ) - microCdf( ( vec2( min( o0, o1 ) ) - os ) / sg ) );
	}
	acc1 += ( S * rhoSV.x + V * rhoSV.y ) / dth;
#ifdef MICRO_LONE
	// MICRO_LONE: each constant segment's lobes from the same evaluation, its half angle linearised about
	// o* (th = dth (o - o*)), and the whole curve's kd share at o*
	for ( int seg = 0; seg < 7; seg ++ ) {
		float w = uMicroLen[ seg ], o0 = uMicroOff[ seg ];
		if ( w <= 0. || o0 != uMicroOff[ seg + 1 ] ) continue;
		float d = dth * ( o0 - os );
		acc1 += ( S * microGauss( uMicroT1.x, d ) + V * microGauss( uMicroT1.y, d ) ) * w;
	}
	acc1 += K * lenT;
#endif
	vec3 acc2 = microFull( T2, n, cross( T2, n ), n, bx2, wi, wr, uMicroT2, uMicroA2, uMicroEta, microPr( wr, n, bx2 ) );
	return ( uMicroT1.w * acc1 / max( lenT, 1e-4 ) + uMicroT2.w * acc2 ) / microQ( wr );
}
#endif
// A point or directional light from wi: the full thread functions at every tangent sample
vec3 microPoint( vec3 wi, vec3 wr ) {
#ifdef MICRO_LANA
	return microPointA( wi, wr );
#endif
	vec3 n = gMicroN, T1 = gMicroT1, T2 = gMicroT2, bx1 = cross( n, T1 ), bx2 = cross( n, T2 );
#ifdef MICRO_LCULL
	if ( dot( wi, n ) <= 0. ) return vec3( 0. ); // a light behind the surface: masking makes every term zero
#endif
	vec3 acc1 = vec3( 0. ); float sumL = 0.;
	for ( int s = 0; s < MICRO_N( 28 ); s ++ ) { // a constant-offset segment once, at four times the weight (as MICRO_FRAGMENT)
		int seg = s / 4, j = s - seg * 4; float w = uMicroLen[ seg ], o0 = uMicroOff[ seg ], o1 = uMicroOff[ seg + 1 ];
		if ( w <= 0. || ( o0 == o1 && j > 0 ) ) continue;
		w *= o0 == o1 ? 4. : 1.;
		float off = mix( o0, o1, ( float( j ) + .5 ) / 4. ), ca = cos( off ), sa = sin( off );
		vec3 t = ca * T1 + sa * n, nl = - sa * T1 + ca * n;
		acc1 += microFull( t, nl, cross( t, nl ), n, bx1, wi, wr, uMicroT1, uMicroA1, uMicroEta, microPr( wr, n, bx1 ) ) * w; sumL += w;
	}
	vec3 acc2 = microFull( T2, n, cross( T2, n ), n, bx2, wi, wr, uMicroT2, uMicroA2, uMicroEta, microPr( wr, n, bx2 ) );
	return ( uMicroT1.w * acc1 / max( sumL, 1e-4 ) + uMicroT2.w * acc2 ) / microQ( wr );
}
#if NUM_RECT_AREA_LIGHTS > 0
// How much of a direction wi from p lands on a rectangular light, its edges softened by 'soft' (radians)
float microRectHit( vec3 p, vec3 wi, RectAreaLight L, float soft ) {
	vec3 nrm = normalize( cross( L.halfWidth, L.halfHeight ) );
	float den = dot( wi, nrm );
	if ( abs( den ) < 1e-5 ) return 0.;
	float d = dot( L.position - p, nrm ) / den;
	if ( d <= 0. ) return 0.;
	vec3 q = p + wi * d - L.position;
	float hw = length( L.halfWidth ), hh = length( L.halfHeight );
	float e = max( abs( dot( q, L.halfWidth ) / hw ) - hw, abs( dot( q, L.halfHeight ) / hh ) - hh ), sf = max( soft * d, 1e-4 );
	return 1. - smoothstep( - sf, sf, e );
}
// A softbox: integrated as the environment is (microNarrow, microBroad), each environment lookup
// replaced by whether that direction meets the box, softened by the lobe's width (narrow lobes)
// or the quadrature's spacing (broad terms)
vec3 microRectNarrow( vec3 t, vec3 nl, vec3 bl, vec3 n, vec3 bx, vec3 wr, vec3 p, RectAreaLight L ) {
	const int K = 12;
	float sr = clamp( dot( wr, t ), - 1., 1. ), cr = sqrt( max( 1. - sr * sr, 0. ) ), Pr = microPr( wr, n, bx );
	vec3 pv = wr - t * sr;
	float phr = atan( dot( pv, bl ), dot( pv, nl ) ), Mr = max( cos( phr ), 0. );
	vec3 acc = vec3( 0. );
	if ( Pr <= 0. || Mr <= 0. ) return acc;
	for ( int k = 0; k < K; k ++ ) {
		float phi = ( ( float( k ) + .5 ) / float( K ) - .5 ) * PI;
		vec3 wi = - sr * t + cr * ( cos( phi ) * nl + sin( phi ) * bl );
		float mp = microMP( wi, n, bx, phi, phr, Mr, Pr );
		if ( mp <= 0. ) continue;
		float c2 = cos( .5 * ( phi - phr ) ), Fr = microFresnel( cr * c2, uMicroEta ), Ft = 1. - Fr;
		acc += ( vec3( microRectHit( p, wi, L, 2. * uMicroT1.x ) * 2. * Fr * c2 ) + microRectHit( p, wi, L, 2. * uMicroT1.y ) * ( ( 1. - uMicroT1.z ) * Ft * Ft / max( cr, 1e-2 ) ) * uMicroA1 ) * mp;
	}
	return acc * ( PI / float( K ) );
}
vec3 microRectBroad( vec3 t, vec3 nl, vec3 bl, vec3 n, vec3 bx, vec3 wr, vec4 T, vec3 A, float iso, vec3 p, RectAreaLight L ) {
	float sr = clamp( dot( wr, t ), - 1., 1. ), tr = asin( sr ), cr = cos( tr ), Pr = microPr( wr, n, bx );
	vec3 pv = wr - t * sr;
	float phr = atan( dot( pv, bl ), dot( pv, nl ) ), Mr = max( cos( phr ), 0. );
	vec3 acc = vec3( 0. );
	if ( Pr <= 0. || Mr <= 0. ) return acc;
	float g = 1. - iso;
	for ( int j = 0; j < MICRO_NT; j ++ ) {
		float ti = ( ( float( j ) + .5 ) / float( MICRO_NT ) - .5 ) * PI, cti = cos( ti ), sti = sin( ti );
		float th = .5 * ( ti + tr ), ctd = cos( .5 * ( ti - tr ) );
		float gs = g * microGauss( T.x, th ), gv = g * ( 1. - T.z ) * microGauss( T.y, th );
		for ( int k = 0; k < MICRO_NP; k ++ ) {
			float phi = ( ( float( k ) + .5 ) / float( MICRO_NP ) - .5 ) * PI;
			vec3 wi = sti * t + cti * ( cos( phi ) * nl + sin( phi ) * bl );
			float mp = microMP( wi, n, bx, phi, phr, Mr, Pr );
			if ( mp <= 0. ) continue;
			float hit = microRectHit( p, wi, L, PI / float( MICRO_NP ) );
			if ( hit <= 0. ) continue;
			float c2 = cos( .5 * ( phi - phr ) ), Fr = microFresnel( ctd * c2, uMicroEta ), Ft = 1. - Fr;
			vec3 f = ( vec3( gs * Fr * c2 ) + Ft * Ft * ( gv + T.z ) / max( cti + cr, 1e-2 ) * A ) / max( ctd * ctd, 1e-3 );
			acc += f * ( hit * mp * cti * cti );
		}
	}
	return acc * ( PI / float( MICRO_NT ) ) * ( PI / float( MICRO_NP ) );
}
vec3 microRect( RectAreaLight L, vec3 p, vec3 wr ) {
	vec3 n = gMicroN, T1 = gMicroT1, T2 = gMicroT2, bx1 = cross( n, T1 ), bx2 = cross( n, T2 );
	vec3 acc1 = vec3( 0. ); float sumL = 0.;
	for ( int s = 0; s < 28; s ++ ) {
		int seg = s / 4; float w = uMicroLen[ seg ];
		if ( w <= 0. ) continue;
		float off = mix( uMicroOff[ seg ], uMicroOff[ seg + 1 ], ( float( s - seg * 4 ) + .5 ) / 4. ), ca = cos( off ), sa = sin( off );
		vec3 t = ca * T1 + sa * n, nl = - sa * T1 + ca * n;
		acc1 += microRectNarrow( t, nl, cross( t, nl ), n, bx1, wr, p, L ) * w; sumL += w;
	}
	for ( int seg = 0; seg < 7; seg ++ ) {
		float w = uMicroLen[ seg ];
		if ( w <= 0. || uMicroT1.z <= 0. ) continue;
		float off = .5 * ( uMicroOff[ seg ] + uMicroOff[ seg + 1 ] ), ca = cos( off ), sa = sin( off );
		vec3 t = ca * T1 + sa * n, nl = - sa * T1 + ca * n;
		acc1 += microRectBroad( t, nl, cross( t, nl ), n, bx1, wr, uMicroT1, uMicroA1, 1., p, L ) * w;
	}
	vec3 acc2 = microRectBroad( T2, n, cross( T2, n ), n, bx2, wr, uMicroT2, uMicroA2, 0., p, L );
	return L.color * ( uMicroT1.w * acc1 / max( sumL, 1e-4 ) + uMicroT2.w * acc2 ) / microQ( wr );
}
#endif
#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
#if !defined( MICRO_CROSS )
${MICRO_BROAD('microBroadCross', MICRO_Q.CROSS)}
#else
${MICRO_BROAD('microBroadCross', { NT: 2, NP: 3, QR: 1 })}
#endif
#if !defined( MICRO_KD )
${MICRO_BROAD('microBroadKd', MICRO_Q.KD)}
#else
${MICRO_BROAD('microBroadKd', { NT: 2, NP: 3, QR: 1 })}
#endif
#ifdef MICRO_KDENV
${MICRO_BROAD('microBroadKdK', { NT: 2, NP: 3, QR: 1, ENV: false })}
#endif
#endif
#endif
`;
const MICRO_FRAGMENT = /* glsl */`
#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV ) && defined( USE_ANISOTROPY ) && defined( FAB_MICRO )
	if ( uMicro > 0. ) {
		vec3 n = normal, wr = normalize( vViewPosition );
		vec3 T2 = normalize( tbn[ 0 ] - n * dot( tbn[ 0 ], n ) ), T1 = cross( n, T2 ); // T2 round the body; the floats T1 run across it
		vec3 bx1 = cross( n, T1 ), bx2 = cross( n, T2 );                             // normals to each set's (t, n) plane
		float eta = uMicroEta, a1 = uMicroT1.w, a2 = uMicroT2.w;
		vec3 acc1 = vec3( 0. ); float sumP1 = 0., sumL1 = 0.;
		// the floats: four tangent samples per segment of their curve; a segment of constant offset has
		// one tangent, taken once at four times the weight
#ifdef MICRO_XNARROW
		// one more pass for the cross threads' narrow lobes (Duotone satin): through this loop's one
		// microNarrow call, not a second call, which cost about 14 ms (two copies of the cone loop)
		vec3 accX = vec3( 0. );
		for ( int s = 0; s < MICRO_N( 29 ); s ++ ) {
			bool xs = s == 28;
			int seg = min( s / 4, 6 ), j = s - seg * 4; float w = xs ? 1. : uMicroLen[ seg ], o0 = xs ? 0. : uMicroOff[ seg ], o1 = xs ? 0. : uMicroOff[ seg + 1 ];
#else
		for ( int s = 0; s < MICRO_N( 28 ); s ++ ) {
			const bool xs = false;
			int seg = s / 4, j = s - seg * 4; float w = uMicroLen[ seg ], o0 = uMicroOff[ seg ], o1 = uMicroOff[ seg + 1 ];
#endif
			if ( w <= 0. || ( o0 == o1 && j > 0 && ! xs ) ) continue;
			vec2 Rt = uMicroR1;
#if defined( MICRO_SEG )
			// MICRO_SEG samples on a sloped segment, each lookup blurred to at least half their spacing
			if ( o0 != o1 && j >= MICRO_SEG ) continue;
			w *= o0 == o1 ? 4. : 4. / float( MICRO_SEG );
			float off = mix( o0, o1, ( float( j ) + .5 ) / float( MICRO_SEG ) );
			Rt = sqrt( min( 1.84 * max( uMicroT1.xy, vec2( .5 * abs( o1 - o0 ) / float( MICRO_SEG ) ) ), vec2( 1. ) ) );
#elif defined( MICRO_SLOPE3 )
			if ( o0 != o1 && j == 3 ) continue; // three samples on a sloped segment
			w *= o0 == o1 ? 4. : 4. / 3.;
			float off = mix( o0, o1, ( float( j ) + .5 ) / 3. );
#else
			w *= o0 == o1 ? 4. : 1.;
			float off = mix( o0, o1, ( float( j ) + .5 ) / 4. );
#endif
			float ca = cos( off ), sa = sin( off );
			vec3 t = ca * T1 + sa * n, nl = - sa * T1 + ca * n;
			// (xs: the cross threads' pass, with their own tangent, frame and lobes, through the same call)
			if ( xs ) { t = T2; nl = n; }
			vec3 r = microNarrow( t, nl, cross( t, nl ), n, xs ? bx2 : bx1, wr, xs ? uMicroT2 : uMicroT1, xs ? uMicroA2 : uMicroA1, xs ? uMicroR2 : Rt, eta );
#ifdef MICRO_XNARROW
			if ( xs ) { accX = r; continue; }
#endif
			sumP1 += microPr( wr, n, bx1 ) * w; sumL1 += w;
			acc1 += r * w;
		}
		// their kd share, at each segment's centre
#ifdef MICRO_KDENV
		// (MICRO_KDENV: one lookup about the normal times the kernel at the mean tangent, for every segment)
		float lenK = 0.;
		for ( int seg = 0; seg < 7; seg ++ ) lenK += uMicroLen[ seg ];
#if defined( MICRO_LUT )
		// MICRO_LUT: one blurriest lookup about the normal for the kd share and the cross threads. Zero where
		// the view is behind the shading normal (a fold turning away): the full model's masking is zero there
		// (Pr, Mr <= 0), but the table only spans the front (phi_r within 90 degrees) and its clamped edge
		// texel, over Q at its 1e-3 floor, blew out to the dye's colour (armpit fold, owner, 2026-11-08).
		// Twin: fabric-light.js envLight.
		vec3 eN = dot( wr, n ) > 0. ? microEnv( n, 1. ) : vec3( 0. );
		if ( uMicroT1.z > 0. ) acc1 += eN * texture2D( tMicroLut, microLutUV( T1, n, wr ) ).b * uMicroA1 * lenK;
#else
		if ( uMicroT1.z > 0. ) acc1 += microEnv( n, 1. ) * microBroadKdK( T1, n, cross( T1, n ), n, bx1, wr, uMicroT1, uMicroA1, eta, 1. ) * lenK;
#endif
#else
		for ( int seg = 0; seg < 7; seg ++ ) {
			float w = uMicroLen[ seg ];
			if ( w <= 0. || uMicroT1.z <= 0. ) continue;
			float off = .5 * ( uMicroOff[ seg ] + uMicroOff[ seg + 1 ] ), ca = cos( off ), sa = sin( off );
			vec3 t = ca * T1 + sa * n, nl = - sa * T1 + ca * n;
			acc1 += microBroadKd( t, nl, cross( t, nl ), n, bx1, wr, uMicroT1, uMicroA1, eta, 1. ) * w;
		}
#endif
		// the cross threads: one tangent, in the surface
#if defined( MICRO_LUT )
		vec2 kc = texture2D( tMicroLut, microLutUV( T2, n, wr ) ).rg;
		vec3 acc2 = eN * ( kc.x + kc.y * uMicroA2 ); // (MICRO_XNARROW: the table holds their kd share only)
#elif defined( MICRO_XNARROW )
		vec3 acc2 = microBroadCross( T2, n, cross( T2, n ), n, bx2, wr, uMicroT2, uMicroA2, eta, 1. ); // their kd share
#else
		vec3 acc2 = microBroadCross( T2, n, cross( T2, n ), n, bx2, wr, uMicroT2, uMicroA2, eta, 0. );
#endif
#ifdef MICRO_XNARROW
		// MICRO_XNARROW (Duotone satin): the cross threads' narrow lobes as deltas in theta, like a
		// constant segment of the floats, read at their own widths (uMicroR2; the floats' loop's last pass)
		acc2 += accX;
#endif
		float Pr2 = microPr( wr, n, bx2 );
		float Q = a1 * sumP1 / max( sumL1, 1e-4 ) + a2 * Pr2 + ( 1. - a1 - a2 ) * max( dot( wr, n ), 0. );
		vec3 Lr = ( a1 * acc1 / max( sumL1, 1e-4 ) + a2 * acc2 ) / max( Q, 1e-3 );
		reflectedLight.indirectSpecular += Lr * envMapIntensity;
	}
#endif
#ifdef MICRO_LLOOP
	if ( uMicro > 0. ) for ( int i = 0; i < 8; i ++ ) { if ( i >= gMicroLN ) break; reflectedLight.directSpecular += microPoint( gMicroLD[ i ], normalize( vViewPosition ) ) * gMicroLC[ i ]; }
#endif
`;

// Foil dots beside dyed knit (uBlend: mystique): where a pixel is part dots, part knit, the knit's
// diffuse comes from the dye alone and the mirror part from the foil alone. One mixed colour (three's
// metalness blend) tinted the knit with the foil, so a burgundy knit with teal dots read teal all
// over, not burgundy where the dots face away from the light (two-tone mystique, 2026-10-27).
const FOIL_FRAGMENT = /* glsl */`
#ifdef FAB_FLAKE
	if ( uGlint > 0. && gFlake > 0. ) {
		material.specularColorBlended = mix( material.specularColorBlended, gFoil, gFlake * uGlint ); // yarn glints: part-white specular, the diffuse stays the dye
		// A glint is one fibre facet, not the knit's grain: unstretched. Stretched at its low roughness it
		// drew every small light as a razor-thin line across the cloth (shiny swatch, 2026-10-27).
		#ifdef USE_ANISOTROPY
			material.anisotropy *= 1. - gFlake;
			material.alphaT = mix( pow2( material.roughness ), 1., pow2( material.anisotropy ) );
		#endif
	}
	if ( uBlend > 0. && gFlake > 0. ) {
		material.diffuseColor = gFoil;
		material.diffuseContribution = gDye * ( 1. - metalnessFactor );
		material.specularColorBlended = mix( material.specularColor, gFoil, metalnessFactor );
	}
#endif
`;

export function createFabricMaterial(zone) {
	const panel = zone === 5;
	const u = {
		uZone: { value: zone }, uSleeveSplit: { value: 0 }, uOffset: { value: panel ? 0.0012 : zone >= 3 ? 0 : 0.0012 + zone * 0.00015 },
		uGarment: { value: panel || zone < 3 ? 1 : 0 }, uClip: { value: 0 }, uTape: { value: 0 }, uUV: { value: panel ? 1 : 0 }, uGrain: { value: 0 },
		uTrimInset: { value: 0 }, uTrimWidth: { value: 0 }, uRows: { value: new THREE.Vector2() }, uZig: { value: 0 }, uThread: { value: new THREE.Color() },
		uTapeY: { value: new THREE.Vector4(1.04, 1.168, 0.83, 1.357) }, uTapeColor: { value: new THREE.Color(0x15151a) },
		uFlake: { value: 0 }, uPitch: { value: 0.001 }, uDotR: { value: 0.4 }, uPresence: { value: 1 }, uTilt: { value: 0.1 },
		uFoilRough: { value: 0.2 }, uGlint: { value: 0 },
		uMicro: { value: 0 }, uMicroZero: { value: 0 }, uMicroEta: { value: 1.5 }, uMicroA1: { value: new THREE.Color() }, uMicroT1: { value: new THREE.Vector4() }, uMicroA2: { value: new THREE.Color() }, uMicroT2: { value: new THREE.Vector4() }, uMicroR1: { value: new THREE.Vector2(0.3, 0.4) }, uMicroR2: { value: new THREE.Vector2(0.3, 0.4) }, uMicroOff: { value: new Array(8).fill(0) }, uMicroLen: { value: new Array(7).fill(0) }, uMicroKdW: { value: new Array(7).fill(0) }, tMicroLut: { value: null }, uBlend: { value: 0 }, uBend: { value: 0 }, uColorVar: { value: 0 }, uFoilColor: { value: new THREE.Color(1, 1, 1) },
		uHolo: { value: 0 }, uHoloFreq: { value: 3 }, uHoloJit: { value: 0.2 }, uHoloDirW: { value: new THREE.Vector3(0.3, 1, 0.5).normalize() },
		uMesh: { value: 0 }, uMeshPitch: { value: 0.0007 }, uHoleR: { value: 0.34 },
		uBumpAmp: { value: 0 }, uBumpScale: { value: 0.003 }, uKnit: { value: 0 },
		uChecker: { value: 0 },
		uTex: { value: 0 }, tBase: { value: null }, tNormal: { value: null }, tRough: { value: null }, tAlpha: { value: null }, tMtl: { value: null }, tMask: { value: null },
		uTile: { value: new THREE.Vector2(0.1, 0.1) }, uTexRecolour: { value: 0 }, uTexTint: { value: new THREE.Color(1, 1, 1) }, uTexLum: { value: 1 }, uTexNormal: { value: 1 }, uTexRoughRel: { value: 0 }, uTexRoughMean: { value: 1 },
		uTexFlags: { value: new THREE.Vector4() }, uMaskOn: { value: new THREE.Vector4() },
		uMaskCol0: { value: new THREE.Color() }, uMaskCol1: { value: new THREE.Color() }, uMaskCol2: { value: new THREE.Color() }, uMaskCol3: { value: new THREE.Color() },
		uOmbre: { value: 0 }, uOmbreColor: { value: new THREE.Color(0, 0, 0) }, uOmbreY: { value: new THREE.Vector2(0.82, 1.32) },
		uSkin: { value: 0 }, uSeam: { value: 0 }, uSeamAllow: { value: 0.006 }, uClipShell: { value: 0 },
		uDuo: { value: 0 }, uDuoColor: { value: new THREE.Color() }, uDuoPow: { value: 2 },
		uFilm: { value: 0 }, uFilmScale: { value: 0.04 }, uFilmRange: { value: new THREE.Vector2(250, 700) }, uFilmWarp: { value: 1.5 }, uFilmTint: { value: 0 }, uFilmHue: { value: new THREE.Vector2(1.6, 0.45) },
		uPrint: { value: 0 }, tPrint: { value: null }, uPrintSize: { value: new THREE.Vector2(0.2, 0.2) }, uPrintOffset: { value: new THREE.Vector2() },
		uDecals: { value: 0 }, uDecalM: { value: [0, 1, 2, 3].map(() => new THREE.Matrix4()) }, uDecalRect: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) },
		uDecalLook: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) }, uDecalCol: { value: [0, 1, 2, 3].map(() => new THREE.Color()) }, tDecal: { value: null },
		uWrinkle: { value: [0, 1, 2].map(() => new THREE.Vector4()) }, uWrinkleN: { value: [0, 1, 2].map(() => new THREE.Vector4()) },
	};
	if (RENDERER === 'webgpu') return createFabricNodeMaterial(zone, u); // its twin in node code (materials/fabric-node.js)
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
			.replace('#include <lights_physical_pars_fragment>', MICRO_PARS + LIGHTS_MICRO)
			.replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n' + FILM_FRAGMENT + FOIL_FRAGMENT)
			.replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' + MICRO_FRAGMENT);
	};
	m.customProgramCacheKey = () => 'leotard-fabric';
	return m;
}

// Sheen is left off the foil and glitter fabrics on purpose: it roughly doubles the cost of every
// light and is invisible next to the foil.
// Flake fields: pitch (m), dotR (cells), presence, tilt, rough, colorVar, holo, holoFreq, holoJit, blend
// (1: flat foil dots whose sparkle averages into a shimmer far away), bend (cells: the dot lattice's
// rows curve from patch to patch); blend and bend are mystique's, from its 2026-10-27 audit.
export const FABRICS = {
	// Matte lycra's sheen is low and close to its own colour: at 0.4 and a third white (the tint is
	// mixed in linear light, so a third white is nearly white on a dark colour) a dark green's
	// highlights lost a third of their saturation against a GK product photo; at 0.1 / 0.1 the
	// render matches it (dev/material-eval.js, 2026-10-24).
	// scan: the scanned texture the fabric shows by default (recoloured; scale: its tile size as a
	// multiple of the scan's own; normal: its relief's strength). TX-00001482 is a scuba knit whose face
	// stands in for matte tricot, scaled to tricot's 0.38 mm wale (owner's choice, 2026-10-24); without
	// the scan (the textures are never bundled) the procedural knit shows. A default scan's roughness map
	// only varies the fabric's own roughness (applyTexture, relative), so the same knit lies under every
	// rung of the gloss ladder: matte, shiny, satin, wet look (owner, 2026-10-27; knowledge/domain/
	// fabrics/stretch-tricot-family-names.md). Glossier rungs take less relief: glazing flattens the
	// knit, and on a gloss every small tilt breaks up the highlight.
	// glint: glossy yarn facets catching the light (flake fields, plus strength: share of the glint's
	// part-white colour in the specular). None on matte (dull yarn); a fine speckle over shiny tricot;
	// dense inside cire's highlights; sparse on satin, whose shine is smooth at body distance (owner's
	// reference photos, 2026-10-27). Its pitch is scaled by the texture size like the scan (1.85: about 0.4 mm).
	// texScale: the texture size a piece of this fabric starts at (the panel's texScale; owner's
	// review, 2026-10-24). A scanned fabric's is in SCAN_SCALE.
	matte: { label: 'Matte lycra', roughness: 0.8, sheen: 0.1, sheenRoughness: 0.6, sheenTint: 0.1, knit: 1, scan: { id: 'TX-00001482', scale: 0.81 }, texScale: 1.85 },
	checker: { label: 'UV checker (debug)', roughness: 0.8, checker: 0.02 },
	shiny: { label: 'Shiny tricot', roughness: 0.4, sheen: 0.2, sheenRoughness: 0.5, anisotropy: 0.6, knit: 1, scan: { id: 'TX-00001482', scale: 0.81, normal: 0.6 }, texScale: 1.85,
		glint: { pitch: 0.00022, dotR: 0.4, presence: 0.25, tilt: 0.3, rough: 0.1, colorVar: 0.5, strength: 1 } },
	// Satin: the microcylinder model (MICRO_FRAGMENT), the app's only satin since 2026-10-28 (owner: it
	// replaced Stretch satin and the speed trials, as the trial "Satin 4 all round four", MICRO_SPEED.all4).
	// The measured front of polyester satin charmeuse as published (Sadeghi et al.
	// 2013, Table II row c), nothing fitted by eye (owner: use the model as presented). Its albedos are
	// the dye colour x the table's factor: the table gives (1, 0.37, 0.3) x 0.035 for the floats and
	// x 0.2 for the cross threads, (1, 0.37, 0.3) being the sample's pink; here the piece's colour
	// (linear) takes its place. gamma in degrees.
	// The albedos' scale: the table's albedos are relative to the authors' own lights and exposure, so
	// their magnitude is set by energy (owner, 2026-10-27): in a uniformly white room (radiance 1, no
	// lights) the fabric in a white dye returns all the light reaching it. Measured there (float render
	// target, no tone mapping) at the table's values: 0.121 white surface shine plus 0.060 coloured
	// light at a normal view (0.115 + 0.059 at 30 degrees, 0.130 + 0.058 at 60, 0.178 + 0.051 at 75, 0.081 +
	// 0.048 at 60 across), so the coloured part scales by (1 - 0.121) / 0.060 = 14.6, the least of
	// the angles measured (none returns more than 1). The table's ratio between floats and cross threads stays.
	// It is computed per setting (microScale: the same white room at a normal view), so a panel's
	// satin controls (applyFabric's satin) keep a white dye at full brightness.
	// Defaults are the owner's dialled-in satin (2026-10-28, on Satin 4 all round four), not the table's
	// floats (kd 0.1, gs 2.5, gv 5): sharpness 0.75x (gs 10/3), glow 1.25x (gv 6.25), milkiness 25%, the
	// table's eta.
	satin: { label: 'Satin', roughness: 0.6, sheen: 0, knit: 1, scan: { id: 'TX-00001482', scale: 0.81, normal: 0.45 }, texScale: 1.85,
		micro: { eta: 1.539, speed: 'all4',
			flat: { A: 0.035, kd: 0.25, gs: 10 / 3, gv: 6.25, a: 0.9, offsets: [-32, -32, -18, 0, 0, 18, 32, 32], lengths: [1.33, 0.66, 2, 2, 2, 0.66, 1.33] },
			twisted: { A: 0.2, kd: 0.7, gs: 30, gv: 60, a: 0.1 } } },
	// Wet look is a cire tricot: the knit's own fibres glazed flat by hot rollers, not a rubber skin
	// over it, so its gloss is a softened, grain-streaked shine with the knit faintly under it. A
	// full mirror clear coat (1 at 0.1) read as latex, the step above it on the gloss ladder
	// (knowledge/domain/fabrics/shiny-tricot-and-wet-look.md; owner's review, 2026-10-24).
	wet: { label: 'Wet look (cire)', roughness: 0.32, sheen: 0.15, sheenRoughness: 0.5, clearcoat: 0.55, clearcoatRoughness: 0.2, anisotropy: 0.5, knit: 1, scan: { id: 'TX-00001482', scale: 0.81, normal: 0.15 }, texScale: 1.85,
		glint: { pitch: 0.0002, dotR: 0.42, presence: 0.5, tilt: 0.25, rough: 0.08, colorVar: 0.5, strength: 1 } },
	// Mystique's dots at 133%: about 1 mm apart, as in the owner's swatch video and shop close-ups
	// (2026-10-27); at 75% (the owner's 2026-10-24 pick) they blurred into a satin sheen at swatch distance.
	mystique: { label: 'Mystique (foil dots)', roughness: 0.62, knit: 1, flake: { pitch: 0.00075, dotR: 0.4, presence: 1, tilt: 0.1, rough: 0.14, colorVar: 0.1, blend: 1, bend: 1 }, texScale: 1.33 },
	// Opal mystique: the foil dots carry a soft rainbow that turns with the surface (an iridescent foil;
	// a dyed knit cannot change colour with the angle). Its rate is a thin film's: about half to one
	// and a half spectra from face on to 60 degrees, holoFreq ~0.6-1.8; 1 in the middle. (3.2, a
	// diffraction foil's rate, ringed the body with rainbows; owner, 2026-10-27.) Panels can scale it
	// (rainbow, render/garment.js).
	opalmystique: { label: 'Opal mystique', roughness: 0.62, knit: 1, flake: { pitch: 0.00075, dotR: 0.4, presence: 1, tilt: 0.1, rough: 0.14, colorVar: 0.1, blend: 1, bend: 1, holo: 0.35, holoFreq: 1, holoJit: 0.15 }, texScale: 1.33 },
	hologram: { label: 'Hologram foil dots', roughness: 0.62, knit: 1, flake: { pitch: 0.0009, dotR: 0.37, presence: 1, tilt: 0.22, rough: 0.22, colorVar: 0.3, holo: 0.6, holoFreq: 0.9, holoJit: 0.5 } },
	// The foils, film and velvets used to carry a value-noise "crinkle" bump (amp 0.1-0.7) from the
	// POC: crumpled foil, not foil on a knit pulled tight over a body. On skin-tight fabric tension
	// pulls that out; what is left is the knit under the foil (knit), and on crushed velvet a faint
	// pile crush (owner's review, 2026-10-24).
	foil: { label: 'Liquid metallic foil', metalness: 1, roughness: 0.2, knit: 1 },
	glitter: { label: 'Glitter', roughness: 0.6, flake: { pitch: 0.0003, dotR: 0.58, presence: 0.94, tilt: 0.5, rough: 0.15, colorVar: 0.6 } },
	hologlitter: { label: 'Holographic glitter', roughness: 0.6, flake: { pitch: 0.0003, dotR: 0.58, presence: 0.94, tilt: 0.5, rough: 0.15, colorVar: 0.5, holo: 0.7, holoFreq: 2.5, holoJit: 1.2 } },
	velvet: { label: 'Stretch velvet', roughness: 1, sheen: 1, sheenRoughness: 0.4, velvet: true },
	crushed: { label: 'Crushed velvet', roughness: 1, sheen: 1, sheenRoughness: 0.3, velvet: true, bump: { amp: 0.12, scale: 0.012 } },
	pearl: { label: 'Iridescent film', metalness: 1, roughness: 0.24, iridescence: 1, knit: 1 },
	mesh: { label: 'Stretch mesh (sheer)', roughness: 0.75, sheen: 0.3, sheenRoughness: 0.6, mesh: { pitch: 0.0007, holeR: 0.35 } },
	glittermesh: { label: 'Glitter mesh', roughness: 0.75, mesh: { pitch: 0.0007, holeR: 0.35 }, flake: { pitch: 0.0005, dotR: 0.5, presence: 0.1, tilt: 0.5, rough: 0.1, colorVar: 0.5 } },
	ombre: { label: 'Sublimated ombré', roughness: 0.74, sheen: 0.35, sheenRoughness: 0.6, knit: 1, ombre: true },
	ombremystique: { label: 'Ombré mystique', roughness: 0.62, knit: 1, ombre: true, flake: { pitch: 0.00075, dotR: 0.4, presence: 1, tilt: 0.1, rough: 0.14, colorVar: 0.1, blend: 1, bend: 1 } },
	// Moodboard looks added in P3 (realism upgrade R7b). film: thin-film swirls { scale m, range nm, warp,
	// tint: share of the film's colour in the cloth, hue: [per swirl, per angle] };
	// duo: { pow } shift towards the second colour at grazing angles.
	// Matched to an 'electric foiled spandex' close-up (owner, 2026-10-27): pale, high-key, pastel rainbow
	// bands that follow the folds (hue mostly from the angle, film.hue). Its sparse sparkle flakes
	// read as dark specks against the pale foil and were taken out.
	liquidholo: { label: 'Liquid hologram (opal)', roughness: 0.3, metalness: 0.25, iridescence: 1, film: { scale: 0.08, range: [300, 820], warp: 2.5, tint: 0.65, hue: [0.3, 3.2] }, texScale: 3.25 },
	oilslick: { label: 'Oil-slick foil', metalness: 1, roughness: 0.22, iridescence: 1, film: { scale: 0.05, range: [320, 980], warp: 1.6 }, knit: 1, texScale: 3.25 },
	duochrome: { label: 'Duochrome foil', metalness: 1, roughness: 0.24, duo: { pow: 2.2 }, knit: 1 },
	chrome: { label: 'Mirror chrome', metalness: 1, roughness: 0.06, knit: 1 },
	glitterfoil: { label: 'Glitter-grain foil', metalness: 1, roughness: 0.3, flake: { pitch: 0.00035, dotR: 0.58, presence: 1, tilt: 0.35, rough: 0.18, colorVar: 0.25 } },
	illusion: { label: 'Illusion mesh (very sheer)', roughness: 0.8, sheen: 0.2, sheenRoughness: 0.6, mesh: { pitch: 0.0006, holeR: 0.46 } },
};
// Duotone satin: Satin's floats with cross threads that catch the light themselves, so a second colour
// shows in its own bands (round the body) instead of a glow under the floats' (across it). In Satin
// the cross threads are the charmeuse's twisted threads (30 and 60 degree lobes, kd 0.7): an even glow
// that blends with the floats' colour into one hue everywhere (owner, 2026-10-28). Here they are the
// paper's shot silk (Table II row e) second direction: flat, gamma 5 and 10 degrees, kd 0.1, coverage
// 0.14 against the floats' 0.86, albedo 3 times the floats' factor (row e's 0.6 against 0.2).
// twoTone: the second colour is the fabric's point, so the picker shows it beside the first.
FABRICS.satinduo = { ...FABRICS.satin, label: 'Duotone satin', twoTone: true, micro: { ...FABRICS.satin.micro, speed: 'duo',
	flat: { ...FABRICS.satin.micro.flat, a: 0.86 }, twisted: { A: 0.105, kd: 0.1, gs: 5, gv: 10, a: 0.14 } } };

// The texture size a scanned fabric starts at (as FABRICS' texScale; owner's review, 2026-10-24):
// pink organza with glitter, pink oil-slick vegan leather.
export const SCAN_SCALE = { 'TX-00007116': 1.25, 'TX-00004730': 4 };
// A piece's texture size: its own, else its fabric's (or scan's) default.
export const texScaleOf = (look) => look.texScale ?? (look.texture ? SCAN_SCALE[look.texture] : FABRICS[look.fabric]?.texScale) ?? 1;

// Fabrics the owner took out of the app (review, 2026-10-24) and what a design that used one shows
// instead (doc/schema.js migrate): lace and shattered glass hologram. Retired scans are hidden from
// the picker and dropped from a design, which then shows its base fabric (textures.js baseFabricFor);
// TX-00001482 stays loadable, as matte lycra's own scan. Every satin try (2026-10-27) and the
// thread-model trials (2026-10-28) fall back to Satin, the one satin (owner, 2026-10-28; Stretch satin,
// the three.js satin that used the key before, went with them).
export const RETIRED_FABRICS = { lace: 'mesh', shattered: 'hologram', satin1: 'satin', satin2: 'satin', satinA: 'satin', satinB: 'satin', satinC: 'satin', satinD: 'satin', satinFC: 'satin', satinFE: 'satin',
	...Object.fromEntries(['satinmicro', 'satinfast', 'satinfastest', 'satin3', 'satin3all3', 'satin3all3m', 'satin3lana', 'satin3kdenv', 'satin3seg2', 'satin3seg1', 'satin3nocorr', 'satin4lana', 'satin4lone', 'satin4lut', 'satin4all4'].map((k) => [k, 'satin'])) };
export const RETIRED_SCANS = new Set(['TX-00006026', 'TX-00005344', 'TX-00004683', 'TX-00001482', 'TX-00003863']); // opal metallic double knit, black mesh tulle, green tricot with holofoil dots, royal blue scuba, pink glitter double knit

export const SECOND = ['Tone-on-tone', 'Silver', 'Gold', 'White', 'Black'];
// Whether a fabric has a second colour at all (applyFabric's `second`/`colour2`): its foil dots or
// glitter (flake), duochrome's shift (duo), Duotone satin's cross threads (twoTone), an ombré's far
// end. Every other fabric is one colour and offers none (owner, 2026-10-28); a glint's colour comes
// from the dye (FABRIC_FRAGMENT), and plain Satin's cross threads take the piece's colour.
export const hasSecondColour = (f) => !!(f && (f.flake || f.duo || f.twoTone || f.ombre));
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

// The thread model in a uniformly white room (radiance 1) at a normal view, for a white dye, as
// [white surface shine, coloured light per unit of the table's albedo factors]: a transliteration of
// MICRO_FRAGMENT (microNarrow, microBroad, Q) with every environment lookup 1, at the shader's own
// sample counts (MICRO_Q). Keep the two in step. Its scale is the
// satin scale (FABRICS comment): about 14.6 at the table's values.
const _dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const _cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const _comb = (...p) => [0, 1, 2].map((i) => p.reduce((s, [k, v]) => s + k * v[i], 0)); // sum of k * v
// The thread terms for a view wr (normal +z), shared by microFurnace and microLut
function microTerms(eta, wr) {
	const PI = Math.PI, d2r = PI / 180, n = [0, 0, 1];
	const fres = (c) => { const g2 = eta * eta - 1 + c * c; if (g2 < 0) return 1; const g = Math.sqrt(g2), a = (g - c) / (g + c), b = (c * (g + c) - 1) / (c * (g - c) + 1); return 0.5 * a * a * (1 + b * b); };
	const gauss = (s, x) => Math.exp(-x * x / (2 * s * s)) / (2.5066283 * s);
	const proj = (w, bx) => { const p = _comb([1, w], [-_dot(w, bx), bx]), l = Math.hypot(...p); return l > 0 ? Math.max(_dot(p, n) / l, 0) : 0; };
	const mp = (wi, bx, phi, phr, Mr, Pr) => {
		const phd = phi - phr, u = Math.exp(-phd * phd / (2 * 0.349 * 0.349)), Mi = Math.max(Math.cos(phi), 0), Pi = proj(wi, bx);
		const mix = (a, b) => a + (b - a) * u;
		return mix(Mi * Mr, Math.min(Mi, Mr)) * mix(Pi * Pr, Math.min(Pi, Pr));
	};
	const frame = (t, nl, bx) => {
		const bl = _cross(t, nl), sr = Math.max(-1, Math.min(1, _dot(wr, t))), pv = _comb([1, wr], [-sr, t]);
		const phr = Math.atan2(_dot(pv, bl), _dot(pv, nl));
		return { bl, sr, phr, Mr: Math.max(Math.cos(phr), 0), Pr: proj(wr, bx) };
	};
	const narrow = (t, nl, bx, T) => { // T: { kd }; returns [white, coloured]
		const { bl, sr, phr, Mr, Pr } = frame(t, nl, bx), cr = Math.sqrt(Math.max(1 - sr * sr, 0)), K = MICRO_Q.K;
		let w = 0, c = 0;
		if (Pr <= 0 || Mr <= 0) return [0, 0];
		for (let k = 0; k < K; k++) {
			const phi = ((k + 0.5) / K - 0.5) * PI, wi = _comb([-sr, t], [cr * Math.cos(phi), nl], [cr * Math.sin(phi), bl]);
			const m = mp(wi, bx, phi, phr, Mr, Pr);
			if (m <= 0) continue;
			const c2 = Math.cos(0.5 * (phi - phr)), Fr = fres(cr * c2), Ft = 1 - Fr;
			w += 2 * Fr * c2 * m; c += (1 - T.kd) * Ft * Ft / Math.max(cr, 1e-2) * m;
		}
		return [w * PI / K, c * PI / K];
	};
	const broad = (t, nl, bx, T, iso, { NT, NP }) => {
		const { bl, sr, phr, Mr, Pr } = frame(t, nl, bx), tr = Math.asin(sr), cr = Math.cos(tr), g = 1 - iso;
		let w = 0, c = 0;
		if (Pr <= 0 || Mr <= 0) return [0, 0];
		for (let j = 0; j < NT; j++) {
			const ti = ((j + 0.5) / NT - 0.5) * PI, cti = Math.cos(ti), sti = Math.sin(ti), th = 0.5 * (ti + tr), ctd = Math.cos(0.5 * (ti - tr));
			const gs = g * gauss(T.gs * d2r, th), gv = g * (1 - T.kd) * gauss(T.gv * d2r, th), d2 = Math.max(ctd * ctd, 1e-3);
			for (let k = 0; k < NP; k++) {
				const phi = ((k + 0.5) / NP - 0.5) * PI, wi = _comb([sti, t], [cti * Math.cos(phi), nl], [cti * Math.sin(phi), bl]);
				const m = mp(wi, bx, phi, phr, Mr, Pr);
				if (m <= 0) continue;
				const c2 = Math.cos(0.5 * (phi - phr)), Fr = fres(ctd * c2), Ft = 1 - Fr;
				w += gs * Fr * c2 / d2 * m * cti * cti; c += Ft * Ft * (gv + T.kd) / Math.max(cti + cr, 1e-2) / d2 * m * cti * cti;
			}
		}
		const q = (PI / NT) * (PI / NP);
		return [w * q, c * q];
	};
	return { proj, narrow, broad };
}
// xn (MICRO_XNARROW, Duotone satin): the cross threads' lobes as deltas (narrow) plus their kd share,
// as MICRO_FRAGMENT does then
function microFurnace(eta, F, W, xn = false) {
	const PI = Math.PI, d2r = PI / 180, n = [0, 0, 1], wr = n, T1 = [1, 0, 0], T2 = [0, 1, 0];
	const { proj, narrow, broad } = microTerms(eta, wr);
	const bx1 = _cross(n, T1), bx2 = _cross(n, T2), off = F.offsets.map((o) => o * d2r), len = F.lengths;
	let w1 = 0, c1 = 0, sumP = 0, sumL = 0;
	for (let s = 0; s < 28; s++) {
		const seg = s >> 2, l = len[seg];
		if (l <= 0) continue;
		const o = off[seg] + (off[seg + 1] - off[seg]) * ((s - seg * 4 + 0.5) / 4), ca = Math.cos(o), sa = Math.sin(o);
		const [w, c] = narrow(_comb([ca, T1], [sa, n]), _comb([-sa, T1], [ca, n]), bx1, F);
		sumP += proj(wr, bx1) * l; sumL += l; w1 += w * l; c1 += c * l;
	}
	for (let seg = 0; seg < 7; seg++) {
		const l = len[seg];
		if (l <= 0 || F.kd <= 0) continue;
		const o = 0.5 * (off[seg] + off[seg + 1]), ca = Math.cos(o), sa = Math.sin(o);
		const [w, c] = broad(_comb([ca, T1], [sa, n]), _comb([-sa, T1], [ca, n]), bx1, F, 1, MICRO_Q.KD);
		w1 += w * l; c1 += c * l;
	}
	const [w2, c2] = xn ? [narrow(T2, n, bx2, W), broad(T2, n, bx2, W, 1, MICRO_Q.CROSS)].reduce(([a, b], [x, y]) => [a + x, b + y]) : broad(T2, n, bx2, W, 0, MICRO_Q.CROSS);
	const Q = Math.max(F.a * sumP / Math.max(sumL, 1e-4) + W.a * proj(wr, bx2) + (1 - F.a - W.a) * 1, 1e-3);
	return [(F.a * w1 / Math.max(sumL, 1e-4) + W.a * w2) / Q, (F.a * c1 / Math.max(sumL, 1e-4) * F.A + W.a * c2 * W.A) / Q];
}
// MICRO_LUT's table: over the view's angles in a surface tangent's frame (texel centres at theta_r,
// phi_r = ((i + 0.5) / N - 0.5) pi, as microLutUV reads them), r, g = the cross threads' white and
// coloured kernel (MICRO_BROAD with every lookup 1, MICRO_CROSS's 2 x 3 nodes), b = the floats' kd
// kernel (MICRO_KDENV's microBroadKdK, 2 x 3). Half floats, linearly filtered; one per setting.
// xn (MICRO_XNARROW): the cross threads' kd share only in r, g (their narrow lobes are traced).
const MICRO_LUT_N = 32, _microLuts = new Map();
function microLut(eta, F, W, xn = false) {
	const key = JSON.stringify([eta, F.kd, W, xn]);
	if (_microLuts.has(key)) return _microLuts.get(key);
	const N = MICRO_LUT_N, PI = Math.PI, data = new Uint16Array(N * N * 4), t = [1, 0, 0], n = [0, 0, 1], bx = _cross(n, t), bl = _cross(t, n);
	for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
		const tr = ((i + 0.5) / N - 0.5) * PI, phr = ((j + 0.5) / N - 0.5) * PI;
		const wr = _comb([Math.sin(tr), t], [Math.cos(tr) * Math.cos(phr), n], [Math.cos(tr) * Math.sin(phr), bl]);
		const { broad } = microTerms(eta, wr), Q = { NT: 2, NP: 3 };
		const [w2, c2] = broad(t, n, bx, W, xn ? 1 : 0, Q), [, ck] = broad(t, n, bx, F, 1, Q), o = (j * N + i) * 4;
		data[o] = THREE.DataUtils.toHalfFloat(w2); data[o + 1] = THREE.DataUtils.toHalfFloat(c2); data[o + 2] = THREE.DataUtils.toHalfFloat(ck); data[o + 3] = THREE.DataUtils.toHalfFloat(1);
	}
	const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.HalfFloatType);
	tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.needsUpdate = true;
	_microLuts.set(key, tex);
	return tex;
}
const _microScales = new Map();
export function microScale(eta, F, W, xn = false) {
	const key = JSON.stringify([eta, F, W, xn]);
	if (!_microScales.has(key)) { const [w, c] = microFurnace(eta, F, W, xn); _microScales.set(key, (1 - w) / c); }
	return _microScales.get(key);
}
// A panel's satin controls (ui/FabricTab.jsx SatinControls), each the floats' own measured value until set:
// gs (highlight sharpness: the surface lobe's width, degrees), gv (colour glow width: the volume
// lobe's, degrees), kd (milkiness: the isotropic share of the coloured light), eta (sheen strength:
// the threads' refractive index, shared by both sets). The cross threads keep the table's values.
export const SATIN_DEFAULTS = (() => { const mc = FABRICS.satin.micro; return { gs: mc.flat.gs, gv: mc.flat.gv, kd: mc.flat.kd, eta: mc.eta }; })();

// A fabric's own effects as shader switches (material defines), so each fabric's shader holds only the code it uses (owner,
// 2026-11-09: shorter compiles; knowledge/engineering/app/startup-and-slow-changes.md). Each switch is on exactly when
// applyFabric gives its uniform a value that draws (uMicro, uFlake, uBend, uDuo, uFilm, uMesh, uBumpAmp, uKnit, uChecker), so no
// look changes. Smaller parts of an effect stay runtime switches inside it (a flake's glint, blend and holo; the film's tint),
// where a define would only split one variant into two. What any piece can take whatever its fabric (a scan, a print, decals,
// an ombre, seams, trims, wrinkles, folds) stays a runtime switch too, shared by every fabric's variant. A mannequin finish
// takes the same from its own fields (render/engine.js setFinish: knit).
// Twin: materials/fabric-node.js (WebGPU) is not specialised: its node graph is built before the fabric is known
// (createFabricNodeMaterial), and every effect is a runtime switch there.
export function fabricDefines(f) {
	const fl = f.flake ?? f.glint, d = { STANDARD: '', PHYSICAL: '', ...MICRO_SPEED[f.micro?.speed] }; // three's own, plus the satin's speed-ups
	if (f.micro) d.FAB_MICRO = '';
	if (fl) d.FAB_FLAKE = '';
	if (fl?.bend) d.FAB_BEND = '';
	if (f.duo) d.FAB_DUO = '';
	if (f.film) d.FAB_FILM = '';
	if (f.mesh) d.FAB_MESH = '';
	if (f.bump) d.FAB_BUMP = '';
	if (f.knit) d.FAB_KNIT = '';
	if (f.checker) d.FAB_CHECKER = '';
	return d;
}

const _c = new THREE.Color();
// colour2: an explicit second colour (hex) for the foil, the ombre's far end or the duochrome
// shift, instead of the `second` choice; on the thread-model satin, the cross threads' colour (a shot
// satin: Sadeghi et al. 2013's silk shot fabric dyes its two thread directions apart). scale: the
// size of the fabric's texture (glitter and foil dots, mesh holes, film swirls, crushed-velvet bump)
// as a multiple of its own, the panel's texScale (texScaleOf); a scanned texture takes the same
// multiple (applyTexture). satin: the thread-model satin's controls (SATIN_DEFAULTS), or null.
export function applyFabric(m, key, colour, second, colour2 = null, scale = 1, satin = null) {
	const f = FABRICS[key] ?? FABRICS.matte, u = m.userData.u, fl = f.flake ?? f.glint, base = _c.set(colour).clone();
	const two = (forOmbre, out) => (colour2 ? out.set(colour2) : secondColour(base, second, forOmbre, out));
	m.color.copy(base).multiplyScalar(f.velvet ? 0.42 : 1);
	m.roughness = f.roughness ?? 0.7;
	m.metalness = f.metalness ?? 0;
	m.sheen = f.sheen ?? 0;
	m.sheenRoughness = f.sheenRoughness ?? 0.6;
	m.sheenColor.copy(base).lerp(_c.set(0xffffff), f.sheenTint ?? (f.velvet ? 0.25 : 0.35)); // a knit's sheen carries its own colour; sheenTint: share of white
	m.clearcoat = f.clearcoat ?? 0;
	m.clearcoatRoughness = f.clearcoatRoughness ?? 0;
	m.anisotropy = f.anisotropy ?? 0;
	// micro: the microcylinder satin (MICRO_FRAGMENT) replaces three's diffuse and specular; its tangent
	// frame needs the anisotropy path on, so a token anisotropy keeps it compiled
	const mc = f.micro;
	m.specularIntensity = mc ? 0 : 1;
	u.uMicro.value = mc ? 1 : 0;
	m.defines = fabricDefines(f);
	if (mc) {
		m.anisotropy = 0.001;
		const d2r = Math.PI / 180, W = mc.twisted, o = satin ?? {};
		const F = { ...mc.flat, gs: o.gs ?? mc.flat.gs, gv: o.gv ?? mc.flat.gv, kd: o.kd ?? mc.flat.kd }, eta = o.eta ?? mc.eta, sp = MICRO_SPEED[mc.speed] ?? {}, xn = sp.MICRO_XNARROW !== undefined, k = microScale(eta, F, W, xn);
		// one colour, except on a two-tone satin whose panel picks a second (Tone-on-tone: the same dye both ways)
		const cross = f.twoTone && (colour2 || second !== 'Tone-on-tone') ? two(false, new THREE.Color()) : base;
		u.uMicroEta.value = eta;
		u.uMicroA1.value.copy(base).multiplyScalar(F.A * k); u.uMicroT1.value.set(F.gs * d2r, F.gv * d2r, F.kd, F.a);
		u.uMicroA2.value.copy(cross).multiplyScalar(W.A * k); u.uMicroT2.value.set(W.gs * d2r, W.gv * d2r, W.kd, W.a);
		// a prefiltered lookup's roughness r blurs like GGX at alpha = r^2, whose half-width at half maximum
		// (tan theta = 0.64 alpha) matches a Gaussian lobe of width gamma (1.177 gamma) at alpha = 1.84 gamma
		const r = (g) => Math.sqrt(Math.min(1.84 * g * d2r, 1));
		u.uMicroR1.value.set(r(F.gs), r(F.gv)); u.uMicroR2.value.set(r(W.gs), r(W.gv));
		u.uMicroOff.value = F.offsets.map((o) => o * d2r);
		u.uMicroLen.value = F.lengths;
		// MICRO_LANA: each sloped segment's kd share goes to the constant segment nearest its middle
		const off = F.offsets, flat = F.lengths.map((l, i) => off[i] === off[i + 1]), kdW = F.lengths.map((l, i) => (flat[i] ? l : 0));
		F.lengths.forEach((l, i) => {
			if (flat[i]) return;
			const mid = (off[i] + off[i + 1]) / 2;
			let best = -1;
			flat.forEach((f, q) => { if (f && (best < 0 || Math.abs(off[q] - mid) < Math.abs(off[best] - mid))) best = q; });
			if (best >= 0) kdW[best] += l;
		});
		u.uMicroKdW.value = kdW;
		if (sp.MICRO_LUT !== undefined) u.tMicroLut.value = microLut(eta, F, W, xn);
	}
	m.iridescence = f.iridescence ?? 0;
	m.iridescenceIOR = 1.8;
	m.iridescenceThicknessRange = [200, 520];

	u.uFlake.value = fl ? 1 : 0;
	if (fl) {
		u.uPitch.value = fl.pitch * scale; u.uDotR.value = fl.dotR; u.uPresence.value = fl.presence; u.uTilt.value = fl.tilt;
		u.uFoilRough.value = fl.rough; u.uGlint.value = f.glint ? fl.strength : 0; u.uBlend.value = fl.blend ?? 0; u.uBend.value = fl.bend ?? 0; u.uColorVar.value = fl.colorVar ?? 0; u.uHolo.value = fl.holo ?? 0; u.uHoloFreq.value = fl.holoFreq ?? 3; u.uHoloJit.value = fl.holoJit ?? 0.2;
		two(false, u.uFoilColor.value);
	}
	u.uDuo.value = f.duo ? 1 : 0;
	if (f.duo) {
		u.uDuoPow.value = f.duo.pow;
		if (colour2 || second !== 'Tone-on-tone') two(false, u.uDuoColor.value);
		else { base.getHSL(_hsl); u.uDuoColor.value.setHSL((_hsl.h + 0.22) % 1, Math.min(_hsl.s * 1.1, 1), _hsl.l); }
	}
	u.uFilm.value = f.film ? 1 : 0;
	if (f.film) { u.uFilmScale.value = f.film.scale * scale; u.uFilmRange.value.fromArray(f.film.range); u.uFilmWarp.value = f.film.warp; u.uFilmTint.value = f.film.tint ?? 0; u.uFilmHue.value.set(...(f.film.hue ?? [1.6, 0.45])); }
	u.uMesh.value = f.mesh ? 1 : 0;
	if (f.mesh) { u.uMeshPitch.value = f.mesh.pitch * scale; u.uHoleR.value = f.mesh.holeR; }
	u.uBumpAmp.value = f.bump?.amp ?? 0;
	if (f.bump) u.uBumpScale.value = f.bump.scale * scale;
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

// The scanned texture a look shows, as { id, opts } for TextureLibrary.get + applyTexture, or null:
// its own (look.texture), else its fabric's default scan, recoloured to its colour. look: a panel
// stack entry, a strap's fabric or a finished edge ({ fabric, colour, texture?, texMode?, texScale?,
// texNormal?, masks? }).
function scanOf(look) {
	if (look.texture) return { id: look.texture, opts: { scale: texScaleOf(look), recolour: look.texMode === 'recolour', colour: look.colour, masks: look.masks, normal: look.texNormal } };
	const d = FABRICS[look.fabric]?.scan;
	return d ? { id: d.id, opts: { scale: d.scale * texScaleOf(look), recolour: true, colour: look.colour, normal: look.texNormal ?? d.normal, relative: true } } : null;
}

// Bind a look's scan (scanOf) to a material once it has loaded, after applyFabric. Shared by panels,
// straps and finished edges so they agree. A scan that arrives after the look has changed is
// dropped; the scan already bound stays while the same one reloads with new options (no flash of
// the procedural knit on a colour change). textures: a TextureLibrary, or null for none.
export function bindScan(m, look, textures) {
	const s = textures ? scanOf(look) : null, key = s ? s.id + JSON.stringify(s.opts) : null;
	if (m.userData.scanId !== s?.id) applyTexture(m, null);
	m.userData.scan = key; m.userData.scanId = s?.id;
	if (s) textures.get(s.id).then((set) => { if (m.userData.scan === key) applyTexture(m, set, s.opts); }, (e) => console.warn('texture', s.id, e.message));
}

// Bind a scanned texture set (materials/textures.js) to a fabric material, or unbind it (set = null).
// opts: { scale (tile multiplier), recolour (tint the luminance with `colour`), colour, masks: [colours],
//         normal (strength), relative (the roughness map varies the fabric's roughness, not replaces it) }
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
	u.uTexRoughRel.value = opts.relative ? 1 : 0; u.uTexRoughMean.value = set.roughMean ?? 1;
	const masks = (opts.masks ?? []).slice(0, set.maskCount);
	u.uTexFlags.value.set(set.rough ? 1 : 0, set.hasAlpha ? 1 : 0, set.hasMetal ? 1 : 0, masks.length && set.mask ? 1 : 0);
	u.uMaskOn.value.set(...[0, 1, 2, 3].map((i) => (masks[i] ? 1 : 0)));
	[u.uMaskCol0, u.uMaskCol1, u.uMaskCol2, u.uMaskCol3].forEach((c, i) => c.value.set(masks[i] ?? '#ffffff'));
	if (set.hasAlpha) { m.transparent = true; m.alphaToCoverage = false; m.depthWrite = true; }
	m.needsUpdate = true;
}
