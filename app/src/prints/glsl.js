// The shader code every printed pattern shares (prints/engine.js compiles one program a design): where a texel lies on
// the flat cloth and in the design's own space, the tools designs are written with (hashes, noise, folds, distances),
// the colours along a design's value (the ramp, from hard edges to a smooth blend), and how much ink where (a
// pattern's density modifiers). A design supplies `float field(vec2 p)`: its value at a place of its own space, in
// metres, 0..1 across its colours (prints/designs.js).
// Spec: knowledge/engineering/architecture/printed-patterns.md.

export const MAX_STOPS = 8, MAX_MODS = 4, D_FLOATS = 16, V_VECS = 40;

export const VERT = /* glsl */`#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0., 1.); }
`;

const HEAD = /* glsl */`#version 300 es
precision highp float;
precision highp int;
out vec4 fragColor;

uniform mat3 uPixToCloth;     // a texel's middle -> the flat cloth, metres (for crystals: -> the frame's own space)
uniform mat3 uClothToDesign;  // -> the design's own space (the inverse of stones/pattern.js patternMap)
uniform mat3 uClothToFrame;   // -> the frame the modifiers lie in (stones/pattern.js clothToFrame)
uniform float uPx;            // metres of the design's space one texel spans
uniform vec4 uBend0;          // twist, bulge, bulge radius squared, ripple height
uniform vec4 uBend1;          // ripple length, organic warp, warp size, the group's seed
uniform vec3 uSym;            // x: 1 = mirrored about the cloth's line u = y, the side z (+1 | -1) kept
uniform float uD[${D_FLOATS}];           // the design's own settings, in the order of its params
uniform vec4 uV[${V_VECS}];             // and what it packs for itself (a wallpaper group's operations)
uniform vec2 uSeed;           // what is random in it
uniform int uN;               // colours
uniform vec4 uStops[${MAX_STOPS}];       // each: OKLab L, a, b and how much of it covers the cloth (0: the cloth's own)
uniform vec4 uInk;            // soft (0 hard edges .. 1 one smooth blend), repeats, slide, balance (a power)
uniform vec4 uInk2;           // wrap (0 once, 1 round again, 2 there and back), spread, strength, 1 = tints the cloth
uniform vec3 uBase;           // the cloth's own colour, linear (what a tint multiplies)
uniform int uOut;             // 0: colour; 1: the band coordinate (crystals follow it: prints/field-stones.js)
uniform int uModN;
uniform vec4 uModA[${MAX_MODS}];         // x, y, cos, sin of its turn
uniform vec4 uModB[${MAX_MODS}];         // w, h, from, to
uniform vec4 uModC[${MAX_MODS}];         // shape, power, flags (1 clip, 2 reversed, 4 added), feather
uniform vec4 uModD[${MAX_MODS}];         // seed
uniform sampler2D uEdge;      // the piece: metres to its nearest edge (stones/pattern.js roomRaster)
uniform vec4 uEdgeBox;        // its raster: x0, y0, 1 / width, 1 / height
uniform sampler2D uDist;      // a drawn arrangement: metres to its nearest line or dot (prints/engine.js strokes)
uniform mat3 uClothToTex;     // the flat cloth -> that picture
uniform float uReach;         // how far that picture knows distances (metres)

const float PI = 3.14159265358979, TAU = 6.28318530717959;
vec2 gCloth;                  // where on the flat cloth this texel is
float gSoft;                  // the print's softness, for designs whose edges are their own (cells, tiles)
float gAlpha = 1.;            // a design of its own size: 0 past where it ends

// --- tools ---------------------------------------------------------------------------------------------
float sat(float x) { return clamp(x, 0., 1.); }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
// 0 at whole numbers, 1 halfway between
float tri(float x) { return 1. - abs(2. * fract(x) - 1.); }
float hash11(float n) { n = fract(n * .1031); n *= n + 33.33; n *= n + n; return fract(n); }
float hash21(vec2 p) { vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec2 hash22(vec2 p) { vec3 q = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz) * q.zy); }
// smooth noise, 0..1
float vnoise(vec2 p) {
	vec2 i = floor(p), f = fract(p), u = f * f * f * (f * (f * 6. - 15.) + 10.);
	return mix(mix(hash21(i), hash21(i + vec2(1., 0.)), u.x), mix(hash21(i + vec2(0., 1.)), hash21(i + vec2(1., 1.)), u.x), u.y);
}
// gradient noise, about -1..1
float gnoise(vec2 p) {
	vec2 i = floor(p), f = fract(p), u = f * f * f * (f * (f * 6. - 15.) + 10.);
	#define GRD(o) dot(normalize(hash22(i + o) - .5 + 1e-4), f - o)
	return 1.6 * mix(mix(GRD(vec2(0., 0.)), GRD(vec2(1., 0.)), u.x), mix(GRD(vec2(0., 1.)), GRD(vec2(1., 1.)), u.x), u.y);
}
// layered noise, about -1..1; oct: layers; gain: what each finer layer adds
float fbm(vec2 p, int oct, float gain) {
	float s = 0., a = 1., n = 0.;
	for (int k = 0; k < 8; k++) { if (k >= oct) break; s += a * gnoise(p); n += a; a *= gain; p = rot(.5) * p * 2.03 + 17.7; }
	return s / n;
}
float fbm(vec2 p, int oct) { return fbm(p, oct, .5); }
// the nearest jittered point of a unit lattice: xy from it to p, z its distance to the nearest cell border, w the cell's chance
vec4 voronoi(vec2 p, float jit) {
	vec2 n = floor(p), f = fract(p), mg, mr; float md = 8.;
	for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
		vec2 g = vec2(float(i), float(j)), o = .5 + jit * (hash22(n + g + uSeed) - .5), r = g + o - f; float d = dot(r, r);
		if (d < md) { md = d; mr = r; mg = g; }
	}
	md = 8.;
	for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
		vec2 g = mg + vec2(float(i), float(j)), o = .5 + jit * (hash22(n + g + uSeed) - .5), r = g + o - f;
		if (dot(mr - r, mr - r) > 1e-5) md = min(md, dot(.5 * (mr + r), normalize(r - mr)));
	}
	return vec4(-mr, md, hash21(n + mg + uSeed + 7.3));
}
// a point folded into one of the 2n wedges that n mirrors through the middle make: its angle in 0..pi/n
vec2 foldN(vec2 p, float n) {
	float a = atan(p.y, p.x), w = PI / n;
	a = abs(mod(a + w, 2. * w) - w);
	return length(p) * vec2(cos(a), sin(a));
}
float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * sat(dot(pa, ba) / dot(ba, ba))); }
float sdLine(vec2 p, vec2 a, vec2 b) { vec2 ba = normalize(b - a); return abs(dot(p - a, vec2(-ba.y, ba.x))); }
// a regular polygon's and a star's own radius along this direction (1 at a corner or a point)
float polyR(float a, float n) { float w = PI / n; return cos(w) / cos(mod(a + w, 2. * w) - w); }
float starR(float a, float n, float inset) {
	float w = PI / n, t = abs(mod(a + w, 2. * w) - w) / w; // 0 at a point, 1 in the notch between two
	vec2 A = vec2(1., 0.), B = inset * vec2(cos(w), sin(w)), d = vec2(cos(t * w), sin(t * w)), e = B - A;
	return (A.x * e.y - A.y * e.x) / (d.x * e.y - d.y * e.x);
}
float smin(float a, float b, float k) { float h = sat(.5 + .5 * (b - a) / k); return mix(b, a, h) - k * h * (1. - h); }
// an edge one texel soft: 0 inside (d < 0), 1 outside; wide: softer by the print's softness times this many metres
float edge(float d) { return smoothstep(-uPx, uPx, d); }
float edge(float d, float wide) { float w = uPx + gSoft * wide; return smoothstep(-w, w, d); }
float edgeDist() { return texture(uEdge, (gCloth - uEdgeBox.xy) * uEdgeBox.zw).r; }

// --- the stones' own noise (stones/fields.js hash2, noise2, fbm), so a clouds modifier masks ink where it thins crystals
float hashI(int i, int j, int s) {
	uint h = (uint(i) * 0x27d4eb2du) ^ (uint(j) * 0x165667b1u) ^ (uint(s) * 0x9e3779b1u);
	h = (h ^ (h >> 15u)) * 0x85ebca6bu; h = (h ^ (h >> 13u)) * 0xc2b2ae35u;
	return float(h ^ (h >> 16u)) / 4294967296.;
}
float gradI(int ix, int iy, int s, float dx, float dy) { float a = hashI(ix, iy, s) * TAU; return cos(a) * dx + sin(a) * dy; }
float noiseI(vec2 p, int s) {
	vec2 i = floor(p), f = p - i, u = f * f * f * (f * (f * 6. - 15.) + 10.); int ix = int(i.x), iy = int(i.y);
	float a = gradI(ix, iy, s, f.x, f.y), b = gradI(ix + 1, iy, s, f.x - 1., f.y), c = gradI(ix, iy + 1, s, f.x, f.y - 1.), d = gradI(ix + 1, iy + 1, s, f.x - 1., f.y - 1.);
	return (a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y) * 1.5;
}
float fbmI(vec2 p, int s, int oct) {
	float sum = 0., amp = 1., norm = 0.;
	for (int k = 0; k < 4; k++) { if (k >= oct) break; sum += amp * noiseI(p, s + k * 17); norm += amp; amp *= .5; p = p * 2. + vec2(11.3, 7.7); }
	return sum / norm;
}

// --- distortions: the design's space bent under the print (the same settings bend a crystal arrangement,
// stones/fields.js distortion, pushed the other way there) ----------------------------------------------
vec2 unbend(vec2 p) {
	float twist = uBend0.x, bulge = uBend0.y, waveA = uBend0.w, warp = uBend1.y; int seed = int(uBend1.w);
	if (twist != 0.) p = rot(-twist * length(p) / .1) * p;
	if (bulge != 0.) p /= 1. + bulge * exp(-dot(p, p) / uBend0.z);
	if (waveA != 0.) { vec2 q = p; p.x -= waveA * sin(TAU * q.y / uBend1.x); p.y -= waveA * .5 * sin(TAU * q.x / uBend1.x); }
	if (warp != 0.) { vec2 n = p / uBend1.z; p -= warp * vec2(fbmI(n, seed + 3, 2), fbmI(n + vec2(5.2, 1.3), seed + 5, 2)); }
	return p;
}

// --- colour -------------------------------------------------------------------------------------------
vec3 oklabToLinear(vec3 c) {
	float l = c.x + .3963377774 * c.y + .2158037573 * c.z, m = c.x - .1055613458 * c.y - .0638541728 * c.z, s = c.x - .0894841775 * c.y - 1.2914855480 * c.z;
	l = l * l * l; m = m * m * m; s = s * s * s;
	return vec3(4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.7076147010 * s);
}
// A value along the design, and how fast it changes a texel, as a colour and a band coordinate (colours meet at its
// whole numbers and a half). Soft 0: each colour a flat band, hard edged. Soft 1: one blend through them all.
vec4 inkOf(float t, float dt, out float e) {
	float soft = uInk.x, N = float(uN);
	int wrap = int(uInk2.x + .5); bool cyc = wrap == 1;
	float y = t * uInk.y + uInk.z; dt *= uInk.y;
	if (wrap == 2) y = 1. - abs(1. - 2. * fract(y));
	else if (wrap == 0) y = sat(y);
	if (uInk.w != 1.) y = cyc ? floor(y) + pow(fract(y), uInk.w) : pow(y, uInk.w);
	if (uN < 2) { e = 0.; return uStops[0]; }
	float sp = soft * uInk2.y;
	float a = cyc ? .5 / N : mix(.5 / N, 0., sp), d = cyc ? 1. / N : mix(1. / N, 1. / (N - 1.), sp);
	float u = (y - a) / d, i = floor(u);
	if (!cyc) i = clamp(i, 0., N - 2.);
	float f = u - i, s = max(soft, min(dt / d, .5)), w = sat((f - .5) / max(s, 1e-4) + .5);
	int i0 = cyc ? int(mod(i, N)) : int(i), i1 = cyc ? int(mod(i + 1., N)) : int(i) + 1;
	e = u;
	return mix(uStops[i0], uStops[i1], w);
}

// --- how much ink where: the pattern's density modifiers (stones/modifiers.js fieldOf, compileMods) ------------
float gIn;
float modField(int k, vec2 L) {
	vec2 o = uModA[k].xy, cs = uModA[k].zw, d = L - o; float w = max(uModB[k].x, 1e-4), h = max(uModB[k].y, 1e-4), least = min(w, h);
	float ax = d.x * cs.x + d.y * cs.y, ay = d.y * cs.x - d.x * cs.y; int shape = int(uModC[k].x + .5);
	gIn = 1e9;
	if (shape == 0) { gIn = min(w * .5 - abs(ax), h * .5 - abs(ay)); return ax / w + .5; }
	if (shape == 1) { gIn = min(w * .5 - abs(ax), h * .5 - abs(ay)); return abs(ax) / (w * .5); }
	if (shape == 2) { float r = length(d); gIn = w - r; return r / w; }
	if (shape == 3) { float t = length(vec2(ax / w, ay / h)); gIn = (1. - t) * least; return t; }
	if (shape == 4) { float t = abs(ax) / w + abs(ay) / h; gIn = (1. - t) * least; return t; }
	if (shape == 5) { float t = max(abs(ax) / w, abs(ay) / h); gIn = (1. - t) * least; return t; }
	if (shape == 6) { gIn = w - length(d); return fract(atan(ay, ax) / TAU); }
	if (shape == 7) return .5 + .5 * cos(atan(ay, ax) + TAU * length(d) / w);
	if (shape == 8) return .5 - .5 * cos(TAU * ax / w);
	if (shape == 9) return .5 - .5 * cos(TAU * length(d) / w);
	if (shape == 10) return fract(ax / w) < .5 ? 0. : 1.;
	if (shape == 11) return mod(floor(ax / w) + floor(ay / w), 2.);
	if (shape == 12) return .5 + .9 * fbmI(vec2(ax, ay) / w, int(uModD[k].x), 3);
	if (shape == 13) { float ed = edgeDist(); gIn = w - ed; return ed / w; }
	return 0.;
}
float coverage() {
	if (uModN == 0) return 1.;
	vec2 L = (uClothToFrame * vec3(gCloth, 1.)).xy; float d = 1.;
	for (int k = 0; k < ${MAX_MODS}; k++) {
		if (k >= uModN) break;
		float f = modField(k, L), val = 0.; int flags = int(uModC[k].z + .5); bool clip = (flags & 1) != 0;
		if (!clip || gIn >= 0.) {
			float q = pow(sat(f), uModC[k].y);
			if ((flags & 2) != 0) q = 1. - q;
			val = mix(uModB[k].z, uModB[k].w, q);
			if (clip && uModC[k].w > 0. && gIn < uModC[k].w) val *= gIn / uModC[k].w;
		}
		d = k == 0 ? val : (flags & 4) != 0 ? min(d + val, 1.) : d * val;
	}
	return sat(d);
}
`;

const MAIN = /* glsl */`
void main() {
	vec2 cloth = (uPixToCloth * vec3(gl_FragCoord.xy, 1.)).xy;
	if (uSym.x > .5) cloth.x = uSym.y + uSym.z * abs(cloth.x - uSym.y);
	gCloth = cloth; gSoft = uInk.x;
	float t = fieldAt(cloth), e;
	vec4 c = inkOf(t, fwidth(t), e);
	if (uOut == 1) { fragColor = vec4(e, t, gAlpha, 1.); return; }
	float a = c.a * uInk2.z * gAlpha * coverage();
	vec3 rgb = max(oklabToLinear(c.xyz), 0.);
	if (uInk2.w > .5) rgb *= uBase;
	fragColor = vec4(rgb * a, a);
}
`;

// A design's program: its field read in its own space, bent by the pattern's distortions.
export const fieldFragment = (body, defines = '') => `${HEAD}${defines}\n${body}\nfloat fieldAt(vec2 cloth) { return field(unbend((uClothToDesign * vec3(cloth, 1.)).xy)); }\n${MAIN}`;

// A drawn arrangement (a crystal pattern's lines and dots, prints/strokes.js) as ink: the distance to it along the colours,
// the first of them as wide as the line.
export const STROKE_FRAGMENT = `${HEAD}
float fieldAt(vec2 cloth) { return texture(uDist, (uClothToTex * vec3(cloth, 1.)).xy).r / uReach; }
${MAIN}`;

// --- the distance to an arrangement's lines and dots: each a capsule drawn as far out as the print reaches, the nearest
// kept by the depth test -----------------------------------------------------------------------------------
export const CAPSULE_VERT = /* glsl */`#version 300 es
precision highp float;
in vec2 aCorner;              // the quad: -1..1 along and across
in vec4 aSeg;                 // a stretch of line: x0, y0, x1, y1 (a dot: both ends the same), metres
in float aInset;              // a dot's radius less half the line's width: where its own first colour ends
uniform mat3 uToClip;         // that space -> clip space
uniform float uReach;
out vec2 vP;
flat out vec4 vSeg;
flat out float vInset;
void main() {
	vec2 a = aSeg.xy, d = aSeg.zw - a; float l = length(d), R = uReach + aInset;
	vec2 dir = l > 1e-9 ? d / l : vec2(1., 0.), n = vec2(-dir.y, dir.x);
	vec2 p = a + d * (aCorner.x * .5 + .5) + dir * aCorner.x * R + n * aCorner.y * R;
	vP = p; vSeg = aSeg; vInset = aInset;
	gl_Position = vec4((uToClip * vec3(p, 1.)).xy, 0., 1.);
}
`;
export const CAPSULE_FRAG = /* glsl */`#version 300 es
precision highp float;
in vec2 vP;
flat in vec4 vSeg;
flat in float vInset;
uniform float uReach;
out vec4 fragColor;
void main() {
	vec2 pa = vP - vSeg.xy, ba = vSeg.zw - vSeg.xy; float h = dot(ba, ba) > 1e-18 ? clamp(dot(pa, ba) / dot(ba, ba), 0., 1.) : 0.;
	float d = max(length(pa - ba * h) - vInset, 0.);
	if (d > uReach) discard;
	gl_FragDepth = d / uReach;
	fragColor = vec4(d, 0., 0., 1.);
}
`;

// What every layer was laid over: straight colour for the fabric shader's own blend (materials/fabric.js tPrint), the
// cloth's colour where nothing is printed so that a magnified edge has no dark fringe.
export const RESOLVE_FRAG = /* glsl */`#version 300 es
precision highp float;
uniform sampler2D uAcc;
uniform vec3 uBase;
out vec4 fragColor;
vec3 toSRGB(vec3 c) { c = clamp(c, 0., 1.); return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
void main() {
	vec4 c = texelFetch(uAcc, ivec2(gl_FragCoord.xy), 0);
	fragColor = vec4(toSRGB(c.a > .002 ? c.rgb / c.a : uBase), c.a);
}
`;
