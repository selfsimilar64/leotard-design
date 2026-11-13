// The printed designs: each a field over its own space (metres), written as a small shader, whose value runs 0..1
// along the print's colours (prints/glsl.js inkOf). A design is a pattern's arrangement like any other
// (stones/layouts.js LAYOUTS), so it has the same frame, handles, distortions and modifiers; made as crystals, they
// follow its colours (prints/field-stones.js).
//   label, params (the card's sliders: stones/layouts-lattice.js mm, num...; the shader reads each as P_<key>),
//   grips (its own handles), own (a design of its own size, laid where it is clicked), random (the seed matters),
//   flat (it follows the piece itself: no place of its own), angular (its colours go round a middle: they repeat in
//   whole numbers), reach(P): how far it spreads, for its picture; ink: what its colours start as (prints/ink.js);
//   glsl: `float field(vec2 p)`; pack(P, seed): what else its shader needs (uV).
// A setting's key must not be one of a pattern's own (stones/pattern.js: size is the crystal's, twist, turn, scale...): the
// names live side by side in the record (dsize, whirl, tilt here; test/prints.test.js holds them apart).
// A value outside 0..1 is as good as one inside: the colours can go round again (ink.wrap). gAlpha: where a design of
// its own size ends.
// Spec: knowledge/engineering/architecture/printed-patterns.md.
import { mm, num, ratio, deg, pct, opt, when, along, radius } from '../stones/layouts-lattice.js';
import { hash2 } from '../stones/fields.js';

const lmm = (k, l, d, min, max) => ({ ...mm(k, l, d, min, max), log: true });
const line = (d = 0.0025) => lmm('line', 'Line width', d, 0.0004, 0.02);
const LATTICE = [['hex', 'Staggered'], ['square', 'Square']];

// shared by the designs on a triangular lattice: where the nearest lattice point is, as the way to it
const HEX = /* glsl */`
vec2 hexOff(vec2 g) { vec2 s = vec2(1., 1.7320508), h = s * .5, a = mod(g, s) - h, b = mod(g - h, s) - h; return dot(a, a) < dot(b, b) ? a : b; }
`;

export const DESIGNS = {
	// --- blends ---------------------------------------------------------------------------------------------
	blend: {
		label: 'Blend', ink: { soft: 1 },
		params: [lmm('length', 'Length', 0.3, 0.02, 1.2), opt('form', 'Runs', 'one', [['one', 'One way'], ['both', 'Out from the middle']]), mm('arch', 'Arch', 0, -0.1, 0.1), mm('wavy', 'Wave height', 0, 0, 0.05), when(lmm('wavyL', 'Wave length', 0.08, 0.01, 0.4), (P) => !!P.wavy)],
		grips: [along('length', [0, 1], 'Length', () => 0.5)],
		glsl: /* glsl */`
float field(vec2 p) {
	float y = p.y - P_arch * (p.x * p.x) / .01 + P_wavy * sin(TAU * p.x / P_wavyL);
	return P_form < .5 ? .5 - y / P_length : abs(y) / (P_length * .5);
}`,
	},
	burst: {
		label: 'Burst', own: true, ink: { soft: 1 }, reach: (P) => P.dsize,
		params: [lmm('dsize', 'Radius', 0.12, 0.01, 0.6), opt('form', 'Shape', 'round', [['round', 'Round'], ['diamond', 'Diamond'], ['square', 'Square'], ['polygon', 'Polygon'], ['star', 'Star']]), when(num('sides', 'Points', 5, 3, 16), (P) => P.form === 'polygon' || P.form === 'star'), when(pct('inset', 'Star depth', 0.5, 0.1, 0.95), (P) => P.form === 'star'), { ...ratio('squash', 'Squash', 1, 0.25, 4), log: true }],
		grips: [radius('dsize', 'Radius')],
		glsl: /* glsl */`
float field(vec2 p) {
	vec2 q = vec2(p.x, p.y * P_squash); float r = length(q), a = atan(q.x, q.y), R = 1.; int f = int(P_form + .5);
	if (f == 1) R = 1. / (abs(cos(a)) + abs(sin(a)));
	else if (f == 2) R = 1. / max(abs(cos(a)), abs(sin(a)));
	else if (f == 3) R = polyR(a, P_sides);
	else if (f == 4) R = starR(a, P_sides, 1. - P_inset);
	return r / (P_dsize * R);
}`,
	},
	sweep: {
		label: 'Sweep', own: true, angular: true, ink: { soft: 1, wrap: 'repeat' }, reach: () => 0.07,
		params: [num('arms', 'Blades', 1, 1, 24), ratio('swirl', 'Swirl', 0, -4, 4)],
		glsl: /* glsl */`
float field(vec2 p) { return atan(p.x, p.y) / TAU * P_arms + P_swirl * log(max(length(p), 1e-4) / .05); }`,
	},
	edgefade: {
		label: 'From the edge', flat: true, random: (P) => !!P.wobble, ink: { soft: 1 },
		params: [lmm('depth', 'How far in', 0.05, 0.004, 0.3), mm('wobble', 'Wobble', 0, 0, 0.03), when(lmm('wobbleL', 'Wobble size', 0.04, 0.008, 0.2), (P) => !!P.wobble)],
		glsl: /* glsl */`
float field(vec2 p) { return (edgeDist() + P_wobble * fbm(gCloth / P_wobbleL + uSeed, 3)) / P_depth; }`,
	},

	// --- bands ----------------------------------------------------------------------------------------------
	stripes: {
		label: 'Stripes', ink: { wrap: 'mirror' },
		params: [lmm('period', 'Stripe repeat', 0.03, 0.003, 0.3), mm('wavy', 'Wave height', 0, 0, 0.05), when(lmm('wavyL', 'Wave length', 0.08, 0.01, 0.4), (P) => !!P.wavy || !!P.swell), pct('swell', 'Swell', 0)],
		grips: [along('period', [1, 0], 'Stripe repeat')],
		glsl: /* glsl */`
float field(vec2 p) {
	float x = (p.x + P_wavy * sin(TAU * p.y / P_wavyL)) / P_period;
	return x + P_swell * .22 * sin(TAU * p.y / (P_wavyL * 1.37) + 1.3) * sin(TAU * x);
}`,
	},
	chevron: {
		label: 'Chevrons', ink: { wrap: 'mirror' },
		params: [lmm('period', 'Stripe repeat', 0.03, 0.003, 0.3), lmm('zig', 'Zigzag width', 0.05, 0.006, 0.4), { ...ratio('steep', 'Steepness', 1, 0.1, 4), log: true }, pct('brk', 'Herringbone break', 0)],
		grips: [along('period', [0, 1], 'Stripe repeat'), along('zig', [1, 0], 'Zigzag width')],
		glsl: /* glsl */`
float field(vec2 p) {
	float y = p.y - P_steep * P_zig * .5 * tri(p.x / P_zig);
	return y / P_period + P_brk * mod(floor(2. * p.x / P_zig), 2.);
}`,
	},
	checks: {
		label: 'Checks',
		params: [lmm('dsize', 'Check size', 0.03, 0.003, 0.3), { ...ratio('stretch', 'Stretch', 1, 0.25, 4), log: true }, opt('kind', 'Weave', 'check', [['check', 'Checks'], ['gingham', 'Gingham'], ['basket', 'Basket']])],
		grips: [along('dsize', [1, 0], 'Check size')],
		glsl: /* glsl */`
float field(vec2 p) {
	vec2 g = vec2(p.x, p.y / P_stretch) / P_dsize; float sx = sin(PI * g.x), sy = sin(PI * g.y);
	if (P_kind < .5) return .5 + .5 * sx * sy;
	if (P_kind < 1.5) { float k = .04 + gSoft; return .5 + .25 * (1. + k) * (sx / (abs(sx) + k) + sy / (abs(sy) + k)); }
	return tri(mod(floor(g.x) + floor(g.y), 2.) < .5 ? g.y * 2. : g.x * 2.);
}`,
	},
	plaid: {
		label: 'Tartan',
		params: [lmm('dsize', 'Sett', 0.08, 0.02, 0.4), pct('wide', 'Wide bands', 0.55), pct('lines', 'Fine lines', 0.6)],
		grips: [along('dsize', [1, 0], 'Sett')],
		glsl: /* glsl */`
float bx(float x, float a, float b, float w) { return smoothstep(a - w, a + w, x) - smoothstep(b - w, b + w, x); }
float sett(float x, float w) {
	x = fract(x);
	return P_wide * bx(x, .06, .44, w) + .45 * bx(x, .58, .68, w) + .45 * P_lines * (bx(x, .78, .805, w) + bx(x, .9, .925, w));
}
float field(vec2 p) { float w = uPx / P_dsize + gSoft * .03; return .5 * (sett(p.x / P_dsize, w) + sett(p.y / P_dsize, w)); }`,
	},
	argyle: {
		label: 'Argyle',
		params: [lmm('dsize', 'Diamond width', 0.05, 0.01, 0.3), { ...ratio('tall', 'Height', 1.6, 0.5, 3), log: true }, mm('stitch', 'Stitch lines', 0.0012, 0, 0.005)],
		grips: [along('dsize', [1, 0], 'Diamond width')],
		glsl: /* glsl */`
float field(vec2 p) {
	vec2 g = vec2(p.x / P_dsize, p.y / (P_dsize * P_tall)); float u = g.x + g.y, v = g.x - g.y, c = sin(PI * u) * sin(PI * v);
	float t = .5 + .5 * c / (abs(c) + .03 + gSoft) * (1.03 + gSoft);
	float l = min(abs(fract(u) - .5), abs(fract(v) - .5)) * P_dsize * .7;
	return mix(.5, t, edge(l - P_stitch * .5));
}`,
	},
	houndstooth: {
		label: 'Houndstooth',
		params: [lmm('dsize', 'Size', 0.025, 0.004, 0.2)],
		grips: [along('dsize', [1, 0], 'Size')],
		glsl: /* glsl */`
float sq(float x, float w) { float f = fract(x); return smoothstep(-w, w, f) * (1. - smoothstep(.5 - w, .5 + w, f)) + smoothstep(1. - w, 1. + w, f); }
float field(vec2 p) {
	vec2 g = p / P_dsize; float w = 2. * uPx / P_dsize + gSoft * .12;
	return mix(sq(g.y, w), sq(g.x, w), sq((g.x - g.y) * 2., w * 2.));
}`,
	},
	dots: {
		label: 'Dots', random: (P) => !!P.stray, ink: { stops: ['#f4f4f2', null] },
		params: [lmm('spacing', 'Between dots', 0.03, 0.004, 0.3), pct('fill', 'Dot size', 0.5, 0.05, 1.2), opt('lattice', 'Lattice', 'hex', LATTICE), pct('stray', 'Stray', 0), pct('vary', 'Variety of sizes', 0)],
		grips: [along('spacing', [1, 0], 'Between dots')],
		glsl: HEX + /* glsl */`
float field(vec2 p) {
	vec2 g = p / P_spacing, q = P_lattice < .5 ? hexOff(g) : fract(g) - .5, id = g - q;
	q -= P_stray * .35 * (hash22(id + uSeed) - .5);
	float r = P_fill * .5 * mix(1., .35 + .65 * hash21(id + uSeed + 4.7), P_vary);
	return .5 * length(q) / max(r, 1e-3);
}`,
	},
	scales: {
		label: 'Scales', ink: { wrap: 'repeat' },
		params: [lmm('dsize', 'Scale width', 0.035, 0.006, 0.3), pct('tall', 'Row height', 0.5, 0.25, 1), { ...ratio('lap', 'Overlap', 1, 0.75, 1.6), log: true }],
		grips: [along('dsize', [1, 0], 'Scale width')],
		glsl: /* glsl */`
float field(vec2 p) {
	float w = P_dsize, h = w * .5 * P_tall, R = max(w * .5 * P_lap, length(vec2(w * .5, h)) * 1.001), base = floor(p.y / h);
	// rows from below: the lowest whose circle holds this place lies on top
	for (int k = -4; k <= 1; k++) {
		float r = base + float(k), off = .5 * mod(r, 2.), cx = (floor(p.x / w - off + .5) + off) * w, d = length(p - vec2(cx, r * h));
		if (d < R) return d / R;
	}
	return 1.;
}`,
	},
	circles: {
		label: 'Interlocking circles', ink: { stops: ['#e6bf58', null] },
		params: [lmm('dsize', 'Circle size', 0.04, 0.008, 0.3), { ...ratio('lap', 'Overlap', 1, 0.5, 1.5), log: true }, opt('lattice', 'Lattice', 'hex', LATTICE), line(0.002)],
		grips: [radius('dsize', 'Circle size', { half: true })],
		glsl: /* glsl */`
float field(vec2 p) {
	float R = P_dsize * .5, sp = R / P_lap, d = 1e9; vec2 g = p / sp;
	if (P_lattice < .5) {
		float v = g.y / .8660254, u = g.x - .5 * v; vec2 b = floor(vec2(u, v));
		for (int j = -2; j <= 3; j++) for (int i = -2; i <= 3; i++) { vec2 c = b + vec2(float(i), float(j)); d = min(d, abs(length(g - vec2(c.x + .5 * c.y, c.y * .8660254)) - P_lap)); }
	} else {
		vec2 b = floor(g);
		for (int j = -2; j <= 3; j++) for (int i = -2; i <= 3; i++) d = min(d, abs(length(g - b - vec2(float(i), float(j))) - P_lap));
	}
	return d * sp / P_line;
}`,
	},
	weave: {
		label: 'Mirror lines', ink: { stops: ['#e6bf58', null] },
		params: [lmm('dsize', 'Cell', 0.04, 0.008, 0.3), opt('sym', 'Symmetry', 'hex', [['hex', 'Sixfold'], ['square', 'Fourfold']]), opt('lines', 'Lines', 'asanoha', [['asanoha', 'Hemp leaf'], ['tri', 'Grid'], ['honey', 'Cells'], ['star', 'Stars'], ['kagome', 'Basket'], ['all', 'Every mirror']]), line(0.0018)],
		grips: [along('dsize', [1, 0], 'Cell')],
		glsl: HEX + /* glsl */`
float field(vec2 p) {
	vec2 g = p / P_dsize; float a, b, c, k; int L = int(P_lines + .5);
	if (P_sym < .5) {
		vec2 q = foldN(hexOff(g), 6.);
		a = abs(q.y); b = abs(q.x - .5); c = abs(-.5 * q.x + .8660254 * q.y); k = abs(dot(q - vec2(.5, 0.), vec2(.8660254, .5)));
	} else {
		vec2 q = abs(fract(g) - .5); if (q.y > q.x) q = q.yx;
		a = q.y; b = abs(q.x - .5); c = abs(q.x - q.y) * .7071068; k = abs(q.x + q.y - .5) * .7071068;
	}
	float d = L == 0 ? min(a, c) : L == 1 ? a : L == 2 ? b : L == 3 ? min(b, c) : L == 4 ? k : min(a, min(b, c));
	return d * P_dsize / P_line;
}`,
	},

	// --- mandalas -------------------------------------------------------------------------------------------
	kaleido: {
		label: 'Kaleidoscope', own: true, random: true, ink: { soft: 0.35 }, reach: () => 0.075,
		params: [num('folds', 'Mirrors', 6, 2, 24), lmm('zoom', 'Detail size', 0.05, 0.008, 0.3), opt('source', 'Looks at', 'clouds', [['clouds', 'Clouds'], ['waves', 'Waves'], ['cells', 'Crystals'], ['ribbons', 'Ribbons']]), mm('slideX', 'Slide across', 0.03, -0.3, 0.3, 0.0005), mm('slideY', 'Slide up', 0.02, -0.3, 0.3, 0.0005), deg('spin', 'Spin', 0)],
		glsl: /* glsl */`
float field(vec2 p) {
	vec2 q = rot(radians(P_spin)) * foldN(p, P_folds) + vec2(P_slideX, P_slideY), g = q / P_zoom + uSeed; int s = int(P_source + .5);
	if (s == 0) return .5 + .7 * fbm(g, 4);
	if (s == 1) return .5 + .25 * (sin(g.x * 3. + 2. * sin(g.y * 1.7)) + sin(g.y * 2.3 + 1.5 * sin(g.x * 1.3)));
	if (s == 2) return sat(voronoi(g, 1.).z * 2.2);
	return tri(g.x + .6 * sin(g.y * 2.));
}`,
	},
	mandala: {
		label: 'Mandala', own: true, ink: { wrap: 'repeat', repeat: 6, soft: 0.5 }, reach: (P) => P.ring * P.rings,
		params: [lmm('ring', 'Ring width', 0.012, 0.003, 0.1), num('rings', 'Rings', 6, 1, 24), num('petals', 'Petals', 12, 2, 48), num('more', 'More each ring', 0, 0, 8), ratio('depth', 'Petal depth', -0.7, -1.2, 1.2), { ...ratio('sharp', 'Pointedness', 0.7, 0.3, 4), log: true }, deg('ringTurn', 'Turn each ring', 0, -45, 45)],
		grips: [along('ring', [1, 0], 'Ring width')],
		glsl: /* glsl */`
float field(vec2 p) {
	float r = length(p) / P_ring, a = atan(p.x, p.y), k = floor(r + .5), n = P_petals + P_more * k;
	// (the scallops die away halfway between two ring edges, where the count and the stagger change)
	float env = cos(PI * r); env *= env;
	float pet = pow(abs(cos(.5 * n * (a + radians(P_ringTurn) * k) + .5 * PI * k)), P_sharp);
	float rr = r + P_depth * .5 * env * (pet - .5);
	gAlpha = 1. - edge((rr - P_rings) * P_ring);
	return rr / P_rings;
}`,
	},
	lotus: {
		label: 'Lotus', own: true, ink: { soft: 0.6, wrap: 'repeat', repeat: 3 }, reach: (P) => P.dsize,
		params: [lmm('dsize', 'Size', 0.07, 0.01, 0.5), num('petals', 'Petals', 8, 3, 32), num('layers', 'Layers', 3, 1, 6), pct('depth', 'Petal depth', 0.45, 0, 0.9), { ...ratio('sharp', 'Roundness', 1.2, 0.3, 4), log: true }, pct('shrink', 'Each layer smaller', 0.3, 0.05, 0.6), pct('stagger', 'Layers staggered', 1)],
		grips: [radius('dsize', 'Size')],
		glsl: /* glsl */`
float field(vec2 p) {
	float r = length(p) / P_dsize, a = atan(p.x, p.y), L = P_layers;
	// from the innermost: the first that holds this place shows
	float aOut = 0.;
	for (int l = 0; l < 6; l++) {
		float fl = float(l); if (fl >= L) break;
		float R = pow(1. - P_shrink, L - 1. - fl), sh = 1. - P_depth + P_depth * pow(abs(cos(.5 * P_petals * a + .5 * PI * fl * P_stagger)), P_sharp), q = r / (R * sh);
		if (fl == L - 1.) aOut = 1. - edge((q - 1.) * P_dsize * sh);
		if (q < 1.) { gAlpha = fl < L - 1. ? 1. : aOut; return (fl + q) / L; }
	}
	gAlpha = aOut;
	return 1.;
}`,
	},
	sunburst: {
		label: 'Sunburst', own: true, angular: true, ink: { wrap: 'mirror' }, reach: () => 0.075,
		params: [num('rays', 'Rays', 16, 2, 96), ratio('swirl', 'Swirl', 0, -3, 3), mm('hub', 'Hub', 0.008, 0, 0.2, 0.0005), pct('uneven', 'Every other shorter', 0), pct('taper', 'Taper', 0)],
		glsl: /* glsl */`
float field(vec2 p) {
	float r = length(p), x = atan(p.x, p.y) / TAU * P_rays + P_swirl * log(max(r, 1e-4) / .05), t = tri(x);
	t += P_uneven * .5 * (tri(x * .5 + .25) - .5) + P_taper * .7 * (.5 - exp(-r / .08));
	return mix(0., sat(t), edge(r - P_hub));
}`,
	},
	spiral: {
		label: 'Spiral', own: true, angular: true, ink: { wrap: 'mirror' }, reach: () => 0.075,
		params: [num('arms', 'Arms', 2, 1, 16), opt('kind', 'Opens', 'even', [['even', 'Evenly'], ['grow', 'Wider outwards']]), when(lmm('pitch', 'Between turns', 0.03, 0.004, 0.3), (P) => P.kind !== 'grow'), when({ ...ratio('grow', 'Opening rate', 0.3, 0.05, 1.5), log: true }, (P) => P.kind === 'grow')],
		grips: [{ ...along('pitch', [1, 0], 'Between turns'), when: (P) => P.kind !== 'grow' }],
		glsl: /* glsl */`
float field(vec2 p) {
	float r = length(p);
	return (P_kind < .5 ? r / P_pitch : log(max(r, 1e-4) / .01) / P_grow) + atan(p.y, p.x) / TAU * P_arms;
}`,
	},
	rosace: {
		label: 'Rose window', own: true, ink: { stops: ['#e6bf58', null] }, reach: (P) => P.dsize,
		params: [lmm('dsize', 'Size', 0.07, 0.01, 0.5), num('count', 'Circles', 8, 2, 24), pct('orbit', 'How far out', 0.5), pct('radius', 'Circle size', 0.5, 0.05, 1.2), line(0.002), opt('rim', 'Rim', 'both', [['both', 'Outer and inner'], ['outer', 'Outer'], ['none', 'None']])],
		grips: [radius('dsize', 'Size')],
		glsl: /* glsl */`
float field(vec2 p) {
	vec2 q = p / P_dsize; float d = 1e9, r = length(q);
	for (int k = 0; k < 24; k++) { float fk = float(k); if (fk >= P_count) break; float a = TAU * fk / P_count; d = min(d, abs(length(q - P_orbit * vec2(sin(a), cos(a))) - P_radius * P_orbit * 1.2)); }
	if (P_rim < 1.5) d = min(d, abs(r - 1.));
	if (P_rim < .5) d = min(d, abs(r - max(P_orbit * (1. - 1.2 * P_radius), .04)));
	gAlpha = 1. - edge((r - 1.) * P_dsize - P_line * 2.);
	return d * P_dsize / P_line;
}`,
	},
	guilloche: {
		label: 'Engraved rosette', own: true, ink: { wrap: 'mirror', stops: ['#e6bf58', null] }, reach: (P) => P.dsize,
		params: [lmm('dsize', 'Size', 0.07, 0.01, 0.5), num('lobes', 'Lobes', 12, 2, 48), num('lobes2', 'Second wave', 5, 0, 48), pct('depth', 'Depth', 0.5), lmm('pitch', 'Line spacing', 0.005, 0.001, 0.05), ratio('whirl', 'Twist', 0, -3, 3)],
		grips: [radius('dsize', 'Size')],
		glsl: /* glsl */`
float field(vec2 p) {
	float r = length(p), a = atan(p.y, p.x), tw = P_whirl * r / P_dsize * TAU;
	float w = P_depth * P_dsize * .2 * (sin(P_lobes * a + tw) + .6 * sin(P_lobes2 * a - 2. * tw)) * smoothstep(0., .3, r / P_dsize);
	gAlpha = 1. - edge(r + w - P_dsize);
	return (r + w) / P_pitch;
}`,
	},
	snowflake: {
		label: 'Snowflake', own: true, ink: { stops: ['#f4f4f2', null] }, reach: (P) => P.dsize,
		params: [lmm('dsize', 'Size', 0.06, 0.01, 0.4), num('arms', 'Arms', 6, 3, 16), num('twigs', 'Branches', 3, 0, 6), pct('twigLen', 'Branch length', 0.5), deg('twigA', 'Branch angle', 60, 15, 85), line(0.003), pct('taper', 'Taper', 0.5)],
		grips: [radius('dsize', 'Size')],
		glsl: /* glsl */`
float field(vec2 p) {
	vec2 q = foldN(p, P_arms) / P_dsize, dir = vec2(cos(radians(P_twigA)), sin(radians(P_twigA)));
	float d = sdSeg(q, vec2(0.), vec2(1., 0.));
	for (int k = 0; k < 6; k++) {
		float fk = float(k); if (fk >= P_twigs) break;
		float x = (fk + 1.) / (P_twigs + 1.);
		d = min(d, sdSeg(q, vec2(x, 0.), vec2(x, 0.) + dir * P_twigLen * (1. - x * .6) * .6));
	}
	d *= 1. + P_taper * 2. * length(q);
	return d * P_dsize / P_line;
}`,
	},
	polar: {
		label: 'Vortex', own: true, angular: true, reach: () => 0.075,
		params: [num('sectors', 'Sectors', 12, 2, 48), { ...ratio('rings', 'Rings each doubling', 3, 0.5, 12), log: true }, ratio('whirl', 'Twist', 0, -4, 4), opt('kind', 'Draws', 'check', [['check', 'Checks'], ['petal', 'Petals'], ['fan', 'Fans']])],
		glsl: /* glsl */`
float field(vec2 p) {
	float lr = log2(max(length(p), 1e-4) / .05), u = atan(p.y, p.x) / TAU * P_sectors + P_whirl * lr, v = lr * P_rings;
	if (P_kind < .5) return .5 + .5 * sin(TAU * u) * sin(TAU * v);
	if (P_kind < 1.5) return tri(v + .5 * tri(u));
	return .5 * tri(u) + .5 * tri(v);
}`,
	},
	hyper: {
		label: 'Circle limit', own: true, ink: { stops: ['#0c0c10', '#e6bf58', '#16205c'] }, reach: (P) => P.dsize,
		params: [lmm('dsize', 'Size', 0.09, 0.02, 0.5), num('p', 'Sides of a tile', 5, 3, 12), num('q', 'Tiles at a corner', 4, 3, 12), opt('shade', 'Shows', 'tiles', [['tiles', 'Tiles'], ['net', 'Net'], ['petals', 'Petals']]), when(line(0.0012), (P) => P.shade !== 'petals'), num('depth', 'Depth', 28, 4, 40)],
		grips: [radius('dsize', 'Size')],
		glsl: /* glsl */`
float field(vec2 p) {
	vec2 z = p / P_dsize; float r = length(z);
	gAlpha = 1. - smoothstep(.975, .995, r);
	if (r >= 1.) return 0.;
	// the tiling by regular polygons of the hyperbolic plane, drawn in a disc: three mirrors (two through the middle, one a
	// circle that meets the rim squarely), a place folded across them until it lies in the triangle between
	float P = P_p, Q = max(P_q, floor(2. * P / (P - 2.)) + 1.), s = sin(PI / P), c = cos(PI / Q), cx = c / sqrt(c * c - s * s), rho = cx * s / c, cnt = 0.;
	for (int k = 0; k < 40; k++) {
		if (float(k) >= P_depth) break;
		z = foldN(z, P);
		vec2 d = z - vec2(cx, 0.); float d2 = dot(d, d);
		if (d2 >= rho * rho) break;
		z = vec2(cx, 0.) + d * rho * rho / d2; cnt += 1.;
	}
	z = foldN(z, P);
	int sh = int(P_shade + .5);
	if (sh == 2) return length(z) / (cx - rho);
	float v = length(z - vec2(cx, 0.)) - rho;
	if (sh == 1) v = min(v, min(z.y, dot(z, vec2(s, -cos(PI / P)))));
	// (how far that is on the cloth: the value over how fast it changes)
	float dist = v / max(length(vec2(dFdx(v), dFdy(v))), 1e-6) * uPx, m = edge(dist - P_line * .5);
	return sh == 1 ? dist / P_line : mix(0., .5 + .5 * mod(cnt, 2.), m);
}`,
	},

	// --- symmetry -------------------------------------------------------------------------------------------
	wallpaper: {
		label: 'Wallpaper', random: true, ink: { soft: 0.3 },
		params: [opt('group', 'Symmetry', 'p6m', [['p1', 'p1'], ['p2', 'p2'], ['pm', 'pm'], ['pg', 'pg'], ['cm', 'cm'], ['pmm', 'pmm'], ['pmg', 'pmg'], ['pgg', 'pgg'], ['cmm', 'cmm'], ['p4', 'p4'], ['p4m', 'p4m'], ['p4g', 'p4g'], ['p3', 'p3'], ['p3m1', 'p3m1'], ['p31m', 'p31m'], ['p6', 'p6'], ['p6m', 'p6m']]),
			lmm('cell', 'Repeat', 0.07, 0.01, 0.5), num('waves', 'Richness', 4, 1, 6), num('fine', 'Fineness', 2, 1, 4), ratio('contrast', 'Contrast', 1, 0.2, 4)],
		grips: [along('cell', [1, 0], 'Repeat')],
		pack: packWallpaper,
		glsl: /* glsl */`
float field(vec2 p) {
	int nOps = int(uV[0].x + .5), nW = int(uV[0].y + .5);
	vec2 u = mat2(uV[1].xy, uV[1].zw) * p / P_cell; float s = 0.;
	for (int i = 0; i < 12; i++) {
		if (i >= nOps) break;
		vec2 q = mat2(uV[2 + i].xy, uV[2 + i].zw) * u + uV[14 + i].xy;
		for (int k = 0; k < 6; k++) { if (k >= nW) break; vec4 w = uV[26 + k]; s += w.z * cos(TAU * dot(w.xy, q) + w.w); }
	}
	return .5 + .5 * P_contrast * s * uV[0].z;
}`,
	},
	quasi: {
		label: 'Wave crystal',
		params: [num('fold', 'Directions', 5, 2, 12), lmm('wave', 'Wavelength', 0.02, 0.003, 0.2), pct('phase', 'Shift', 0), ratio('contrast', 'Contrast', 1.4, 0.3, 4)],
		grips: [along('wave', [1, 0], 'Wavelength')],
		glsl: /* glsl */`
float field(vec2 p) {
	float s = 0.;
	for (int k = 0; k < 12; k++) { float fk = float(k); if (fk >= P_fold) break; float a = PI * fk / P_fold; s += cos(TAU * dot(p, vec2(cos(a), sin(a))) / P_wave + TAU * P_phase * (fk + 1.) * .618); }
	return .5 + .5 * P_contrast * s / P_fold;
}`,
	},
	chladni: {
		label: 'Chladni plate',
		params: [num('n', 'Across', 3, 1, 12), num('m', 'Up', 5, 1, 12), lmm('dsize', 'Plate', 0.2, 0.03, 0.8)],
		grips: [along('dsize', [1, 0], 'Plate', () => 0.5)],
		glsl: /* glsl */`
float field(vec2 p) { vec2 g = PI * p / P_dsize; return .5 + .25 * (cos(P_n * g.x) * cos(P_m * g.y) - cos(P_m * g.x) * cos(P_n * g.y)); }`,
	},
	moire: {
		label: 'Ripples', own: true, reach: (P) => Math.max(0.075, P.apart),
		params: [lmm('wave', 'Wavelength', 0.012, 0.002, 0.1), mm('apart', 'Apart', 0.06, 0, 0.3, 0.0005), num('sources', 'Centres', 2, 1, 6)],
		grips: [along('apart', [1, 0], 'Apart', () => 0.5)],
		glsl: /* glsl */`
float field(vec2 p) {
	float s = 0.;
	for (int k = 0; k < 6; k++) { float fk = float(k); if (fk >= P_sources) break; float a = TAU * fk / P_sources; s += cos(TAU * length(p - .5 * P_apart * vec2(cos(a), sin(a))) / P_wave); }
	return .5 + .5 * s / P_sources;
}`,
	},

	// --- tiles ----------------------------------------------------------------------------------------------
	tiles: {
		label: 'Tiles', random: true, ink: { stops: ['#0c0c10', '#16205c', '#1b3fb5', '#8cc6ec'] },
		params: [lmm('cell', 'Tile', 0.03, 0.005, 0.3), opt('kind', 'Tile', 'hex', [['hex', 'Honeycomb'], ['cubes', 'Tumbling blocks'], ['facets', 'Facets'], ['bricks', 'Bricks']]), mm('grout', 'Grout', 0.001, 0, 0.006), when(pct('mixed', 'Shuffled', 1), (P) => P.kind !== 'cubes'), when(lmm('drift', 'Colours drift over', 0.12, 0.02, 0.6), (P) => P.kind !== 'cubes' && P.mixed < 1)],
		grips: [along('cell', [1, 0], 'Tile')],
		glsl: HEX + /* glsl */`
float tone(vec2 id, vec2 at) { return mix(vnoise(at * P_cell / P_drift + uSeed), hash21(id + uSeed), P_mixed); }
float field(vec2 p) {
	vec2 g = p / P_cell; int kind = int(P_kind + .5); float t, e;
	if (kind <= 1) {
		vec2 q = hexOff(g), id = g - q; e = .5 - max(abs(q.x), dot(abs(q), vec2(.5, .8660254)));
		if (kind == 0) t = tone(id, id);
		else { float a = atan(q.y, q.x) - PI * .5, s = floor(mod(a / TAU * 3., 3.)), f = abs(fract(a / TAU * 3.) - .5); t = s * .5; e = min(e, (.5 - f) * length(q) * 2.); }
	} else if (kind == 2) {
		float v = g.y / .8660254, u = g.x - .5 * v; vec2 c = floor(vec2(u, v)), f = fract(vec2(u, v)); bool up = f.x + f.y > 1.;
		vec2 id = c * 2. + (up ? 1. : 0.); t = tone(id, vec2(c.x + .5 * c.y + (up ? .66 : .33), (c.y + (up ? .66 : .33)) * .866));
		e = min(min(f.x, f.y), abs(f.x + f.y - 1.)) * .8; if (up) e = min(min(1. - f.x, 1. - f.y), abs(f.x + f.y - 1.)) * .8;
	} else {
		float row = floor(g.y * 2.), x = g.x + .5 * mod(row, 2.); vec2 id = vec2(floor(x), row), f = vec2(fract(x), fract(g.y * 2.));
		t = tone(id, id * vec2(1., .5)); e = min(min(f.x, 1. - f.x), .5 * min(f.y, 1. - f.y));
	}
	return mix(0., kind == 1 ? .25 + .75 * t : .2 + .8 * t, edge(e * P_cell - P_grout * .5, .15 * P_cell));
}`,
	},
	voronoi: {
		label: 'Stained glass', random: true, ink: { stops: ['#0c0c10', '#5b2a86', '#b3122e', '#e6bf58', '#0b7d7a'] },
		params: [lmm('cell', 'Cell size', 0.03, 0.005, 0.3), pct('jit', 'Irregular', 1), { ...ratio('stretch', 'Stretch', 1, 0.25, 4), log: true }, opt('shade', 'Shows', 'glass', [['glass', 'Each its own colour'], ['depth', 'From the edges in'], ['centre', 'From the middles out']]), when(mm('lead', 'Leading', 0.0016, 0, 0.01), (P) => P.shade === 'glass')],
		grips: [along('cell', [0, 1], 'Cell size')],
		glsl: /* glsl */`
float field(vec2 p) {
	vec4 v = voronoi(vec2(p.x / P_stretch, p.y) / P_cell, P_jit); float e = v.z * P_cell;
	if (P_shade < .5) return mix(0., .2 + .8 * v.w, edge(e - P_lead * .5, .12 * P_cell));
	if (P_shade < 1.5) return e / (P_cell * .4);
	return length(v.xy) / .75;
}`,
	},
	truchet: {
		label: 'Truchet', random: true, ink: { stops: ['#e6bf58', null] },
		params: [lmm('cell', 'Tile', 0.03, 0.006, 0.3), opt('kind', 'Tile', 'arcs', [['arcs', 'Arcs'], ['lines', 'Diagonals']]), line(0.005)],
		grips: [along('cell', [1, 0], 'Tile')],
		glsl: /* glsl */`
float field(vec2 p) {
	vec2 g = p / P_cell, c = floor(g), f = fract(g); float h = hash21(c + uSeed), d;
	if (h < .5) f.x = 1. - f.x;
	if (P_kind > .5) d = abs(f.x + f.y - 1.) * .7071068;
	else d = min(abs(length(f) - .5), abs(length(f - 1.) - .5));
	return d * P_cell / P_line;
}`,
	},
	quasitile: {
		label: 'Quasi tiles', random: true, ink: { stops: ['#0c0c10', '#16205c', '#1b3fb5', '#8cc6ec', '#f4f4f2'] },
		params: [num('fold', 'Symmetry', 5, 3, 9), lmm('cell', 'Tile', 0.03, 0.006, 0.3), mm('lead', 'Leading', 0.0012, 0, 0.006)],
		grips: [along('cell', [1, 0], 'Tile')],
		glsl: /* glsl */`
float field(vec2 p) {
	float n = P_fold, sum = 0., dmin = 1.;
	for (int k = 0; k < 9; k++) {
		float fk = float(k); if (fk >= n) break;
		float a = TAU * fk / n, x = dot(p, vec2(cos(a), sin(a))) / P_cell + fract(.137 * fk + .31 + uSeed.x * .01), f = fract(x);
		sum += floor(x); dmin = min(dmin, min(f, 1. - f));
	}
	return mix(0., (1. + mod(sum, n)) / n, edge(dmin * P_cell - P_lead * .5, .1 * P_cell));
}`,
	},
	motifs: {
		label: 'Motifs', random: (P) => !!P.toss, ink: { stops: ['#f4f4f2', null] },
		params: [lmm('spacing', 'Between motifs', 0.05, 0.008, 0.4), lmm('dsize', 'Motif size', 0.03, 0.004, 0.3), opt('motif', 'Motif', 'star', [['star', 'Star'], ['heart', 'Heart'], ['flower', 'Flower'], ['moon', 'Moon'], ['diamond', 'Diamond'], ['cross', 'Cross']]), when(num('points', 'Points', 5, 3, 12), (P) => P.motif === 'star' || P.motif === 'flower'), opt('lattice', 'Lattice', 'hex', LATTICE), deg('tilt', 'Turn', 0), pct('toss', 'Tossed', 0)],
		grips: [along('spacing', [1, 0], 'Between motifs')],
		glsl: HEX + /* glsl */`
float sdHeart(vec2 p) {
	p.x = abs(p.x);
	if (p.y + p.x > 1.) return length(p - vec2(.25, .75)) - .3535534;
	return sqrt(min(dot(p - vec2(0., 1.), p - vec2(0., 1.)), dot(p - .5 * max(p.x + p.y, 0.), p - .5 * max(p.x + p.y, 0.)))) * sign(p.x - p.y);
}
float field(vec2 p) {
	vec2 g = p / P_spacing, q = P_lattice < .5 ? hexOff(g) : fract(g) - .5, id = g - q;
	q = rot(radians(P_tilt) + P_toss * TAU * hash21(id + uSeed)) * q * P_spacing / (P_dsize * .5);
	float r = length(q), a = atan(q.x, q.y), sd; int m = int(P_motif + .5);
	if (m == 0) sd = (r - starR(a, P_points, .45)) * .7;
	else if (m == 1) sd = sdHeart(q * .62 + vec2(0., .58)) / .62;
	else if (m == 2) sd = (r - (.5 + .5 * pow(abs(cos(.5 * P_points * a)), .7))) * .8;
	else if (m == 3) sd = max(r - 1., .78 - length(q - vec2(.5, .12)));
	else if (m == 4) sd = (abs(q.x) / .68 + abs(q.y) - 1.) * .56;
	else sd = min(max(abs(q.x) - .3, abs(q.y) - 1.), max(abs(q.x) - 1., abs(q.y) - .3));
	return .5 + .5 * sd;
}`,
	},

	// --- organic --------------------------------------------------------------------------------------------
	clouds: {
		label: 'Clouds', random: true, ink: { soft: 1 },
		params: [lmm('dsize', 'Size', 0.06, 0.008, 0.5), num('detail', 'Detail', 4, 1, 7), { ...ratio('stretch', 'Stretch', 1, 0.2, 5), log: true }, opt('kind', 'Kind', 'soft', [['soft', 'Billows'], ['ridge', 'Ridges'], ['cells', 'Bubbles']]), when(pct('rough', 'Roughness', 0.5, 0.2, 0.8), (P) => P.kind !== 'cells')],
		grips: [along('dsize', [0, 1], 'Size')],
		glsl: /* glsl */`
float field(vec2 p) {
	vec2 g = vec2(p.x / P_stretch, p.y) / P_dsize + uSeed; int oct = int(P_detail + .5);
	if (P_kind < .5) return .5 + .7 * fbm(g, oct, P_rough);
	if (P_kind > 1.5) return length(voronoi(g, 1.).xy) * 1.25;
	float s = 0., a = 1., n = 0.;
	for (int k = 0; k < 7; k++) { if (k >= oct) break; float r = 1. - abs(gnoise(g)); s += a * r * r; n += a; a *= P_rough; g = rot(.5) * g * 2.03 + 17.7; }
	return s / n * 1.15 - .1;
}`,
	},
	marble: {
		label: 'Veins', random: true,
		params: [lmm('vein', 'Vein spacing', 0.03, 0.004, 0.3), lmm('dsize', 'Swirl size', 0.08, 0.01, 0.5), ratio('turb', 'Turbulence', 1, 0, 4), pct('pinch', 'Breaks', 0), num('detail', 'Detail', 4, 1, 6)],
		grips: [along('vein', [1, 0], 'Vein spacing')],
		glsl: /* glsl */`
float field(vec2 p) {
	vec2 g = p / P_dsize + uSeed; float n = fbm(g, int(P_detail + .5));
	return tri((p.x + P_turb * P_dsize * .6 * n) / P_vein) + P_pinch * .7 * gnoise(g * 2.3 + 4.1);
}`,
	},
	swirl: {
		label: 'Liquid', random: true, ink: { soft: 0.8 },
		params: [lmm('dsize', 'Size', 0.1, 0.015, 0.6), ratio('flow', 'Flow', 1, 0, 3), num('detail', 'Detail', 4, 1, 6), { ...ratio('stretch', 'Stretch', 1, 0.2, 5), log: true }],
		grips: [along('dsize', [0, 1], 'Size')],
		glsl: /* glsl */`
float field(vec2 p) {
	vec2 g = vec2(p.x / P_stretch, p.y) / P_dsize + uSeed; int o = int(P_detail + .5); float k = 2. * P_flow;
	vec2 q = vec2(fbm(g, o), fbm(g + vec2(5.2, 1.3), o)), r = vec2(fbm(g + k * q + vec2(1.7, 9.2), o), fbm(g + k * q + vec2(8.3, 2.8), o));
	return .5 + .8 * fbm(g + k * r, o);
}`,
	},
	agate: {
		label: 'Agate', random: true, ink: { wrap: 'mirror', soft: 0.4 },
		params: [lmm('band', 'Band width', 0.008, 0.001, 0.08), lmm('dsize', 'Size', 0.08, 0.01, 0.5), ratio('turb', 'Wobble', 1, 0, 4), num('eyes', 'Centres', 1, 1, 5)],
		grips: [along('band', [1, 0], 'Band width')],
		glsl: /* glsl */`
float field(vec2 p) {
	vec2 g = p / P_dsize; float n = fbm(g * 1.3 + uSeed, 4), d = 1e9;
	for (int k = 0; k < 5; k++) { float fk = float(k); if (fk >= P_eyes) break; d = smin(d, length(g - (hash22(vec2(fk, 3.) + uSeed) - .5) * (P_eyes > 1.5 ? 2.2 : 0.)), .35); }
	return (d + P_turb * .35 * n) * P_dsize / P_band;
}`,
	},
	flames: {
		label: 'Flames', random: true, ink: { soft: 0.5, stops: [null, '#b3122e', '#f07a2a', '#e6bf58'] },
		params: [lmm('height', 'Height', 0.25, 0.03, 1), lmm('dsize', 'Tongue size', 0.05, 0.008, 0.3), ratio('turb', 'Flicker', 1, 0, 3), ratio('lean', 'Lean', 0, -1, 1)],
		grips: [along('height', [0, 1], 'Height', () => 0.5)],
		glsl: /* glsl */`
float field(vec2 p) {
	vec2 g = vec2(p.x + P_lean * p.y, p.y);
	float n = fbm(vec2(g.x / P_dsize, g.y / (P_dsize * 2.6)) + uSeed, 4), r = 1. - abs(gnoise(vec2(g.x / P_dsize * 1.7, g.y / (P_dsize * 3.)) + uSeed + 9.));
	return .5 - p.y / P_height + P_turb * (.3 * n + .25 * (r - .6));
}`,
	},
	leopard: {
		label: 'Leopard', random: true, ink: { stops: ['#d2a48a', '#f07a2a', '#0c0c10'] },
		params: [lmm('dsize', 'Spot spacing', 0.03, 0.006, 0.2), pct('ring', 'Ring', 0.55, 0.1, 1), pct('open', 'Broken', 0.45), pct('jit', 'Irregular', 0.9)],
		grips: [along('dsize', [1, 0], 'Spot spacing')],
		glsl: /* glsl */`
float field(vec2 p) {
	vec2 g = p / P_dsize; g += .18 * vec2(gnoise(g * 1.7 + uSeed), gnoise(g * 1.7 + uSeed + 5.3));
	vec4 v = voronoi(g, P_jit); float d = length(v.xy), sz = .2 + .14 * v.w, a = atan(v.y, v.x);
	float brk = gnoise(vec2(cos(a), sin(a)) * 1.6 + v.w * 40. + uSeed);
	float ring = (1. - edge((abs(d - sz) - sz * .42 * P_ring) * P_dsize, .002)) * smoothstep(-.08, .08, brk - mix(-1.3, .45, P_open));
	return mix(.5 * (1. - edge((d - sz) * P_dsize, .002)), 1., ring);
}`,
	},
	galaxy: {
		label: 'Galaxy', own: true, random: true, ink: { soft: 1, stops: [null, '#16205c', '#5b2a86', '#ff4f8b', '#f4f4f2'] }, reach: (P) => P.dsize,
		params: [lmm('dsize', 'Size', 0.1, 0.02, 0.6), num('arms', 'Arms', 2, 1, 6), ratio('wind', 'Winding', 1.2, 0, 4), pct('dust', 'Dust', 0.6)],
		grips: [radius('dsize', 'Size')],
		glsl: /* glsl */`
float field(vec2 p) {
	float r = length(p) / P_dsize, a = atan(p.y, p.x);
	float arm = .5 + .5 * cos(P_arms * (a - 2. * P_wind * log(max(r, 1e-3)))), n = fbm(p / (P_dsize * .25) + uSeed, 5);
	return exp(-r * r * 9.) + (.25 + .6 * arm) * exp(-r * 1.8) * (1. + P_dust * 1.2 * n);
}`,
	},
	blobs: {
		label: 'Lava', random: true,
		params: [lmm('dsize', 'Size', 0.05, 0.008, 0.4), pct('fill', 'Fullness', 0.5), pct('vary', 'Variety', 0.6)],
		grips: [along('dsize', [1, 0], 'Size')],
		glsl: /* glsl */`
float field(vec2 p) {
	vec2 g = p / P_dsize, n = floor(g), f = fract(g); float s = 0.;
	for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
		vec2 o = vec2(float(i), float(j)), d = o + hash22(n + o + uSeed) - f; float rr = .55 * mix(1., .35 + 1.3 * hash21(n + o + uSeed + 3.1), P_vary);
		s += exp(-2.2 * dot(d, d) / (rr * rr));
	}
	return s * (.35 + .9 * P_fill);
}`,
	},
	dunes: {
		label: 'Layered waves', random: (P) => !!P.rough, ink: { wrap: 'repeat', soft: 0.6 },
		params: [lmm('height', 'Layer height', 0.035, 0.005, 0.3), lmm('wave', 'Wave length', 0.12, 0.02, 0.8), mm('amp', 'Wave height', 0.012, 0, 0.1, 0.0005), pct('rough', 'Roughness', 0.3), pct('drift', 'Drift', 0.37)],
		grips: [along('height', [0, 1], 'Layer height')],
		glsl: /* glsl */`
float field(vec2 p) {
	float base = floor(p.y / P_height);
	// each layer's crest; from below, the first whose crest is above this place lies in front
	for (int k = -4; k <= 4; k++) {
		float fk = base + float(k), crest = fk * P_height + P_amp * (sin(TAU * (p.x / P_wave + fk * P_drift)) + 2. * P_rough * gnoise(vec2(p.x / P_wave * 2.3, fk * 7.31) + uSeed));
		if (p.y < crest) return fk + .999 * sat((crest - p.y) / P_height);
	}
	return base;
}`,
	},

	// --- fractals -------------------------------------------------------------------------------------------
	julia: {
		label: 'Julia set', own: true, ink: { soft: 0.7, wrap: 'mirror', repeat: 3, stops: ['#0c0c10', '#5b2a86', '#ff4f8b', '#e6bf58'] }, reach: (P) => P.dsize * 0.8,
		params: [lmm('dsize', 'Size', 0.1, 0.02, 0.6), num('power', 'Symmetry', 2, 2, 8), pct('cr', 'Shape', 0.63, 0, 1), deg('ca', 'Character', 169), num('iter', 'Depth', 40, 8, 80)],
		grips: [radius('dsize', 'Size')],
		glsl: /* glsl */`
float field(vec2 p) {
	vec2 z = p / (P_dsize * .5), c = P_cr * 1.3 * vec2(cos(radians(P_ca)), sin(radians(P_ca))); float n = P_power, i = 0., m2 = 0.;
	for (int k = 0; k < 80; k++) {
		if (float(k) >= P_iter) break;
		float r = length(z), a = atan(z.y, z.x);
		z = pow(r, n) * vec2(cos(n * a), sin(n * a)) + c; m2 = dot(z, z);
		if (m2 > 4096.) break;
		i += 1.;
	}
	return m2 > 4096. ? sqrt(max(i + 1. - log(log(sqrt(m2)) / log(64.)) / log(n), 0.) / P_iter) : 1.;
}`,
	},
	newton: {
		label: 'Newton flower', own: true, ink: { soft: 0.5, wrap: 'repeat', repeat: 3 }, reach: (P) => P.dsize * 0.5,
		params: [lmm('dsize', 'Size', 0.15, 0.02, 0.8), num('roots', 'Symmetry', 3, 3, 8), num('iter', 'Depth', 24, 4, 40), ratio('relax', 'Relaxation', 1, 0.5, 1.9)],
		grips: [radius('dsize', 'Size', { half: true })],
		glsl: /* glsl */`
float field(vec2 p) {
	vec2 z = p / (P_dsize * .5); float n = P_roots, i = 0.;
	for (int k = 0; k < 40; k++) {
		if (float(k) >= P_iter) break;
		float r = length(z), a = atan(z.y, z.x); if (r < 1e-6) break;
		vec2 z1 = pow(r, n - 1.) * vec2(cos((n - 1.) * a), sin((n - 1.) * a)), zn = vec2(z1.x * z.x - z1.y * z.y, z1.x * z.y + z1.y * z.x) - vec2(1., 0.), den = n * z1;
		vec2 q = vec2(zn.x * den.x + zn.y * den.y, zn.y * den.x - zn.x * den.y) / dot(den, den);
		z -= P_relax * q; if (dot(q, q) < 1e-7) break;
		i += 1.;
	}
	return (floor(mod(atan(z.y, z.x) / TAU * n + .5, n)) + .9 * i / P_iter) / n;
}`,
	},
	lace: {
		label: 'Lace', ink: { stops: ['#f4f4f2', null] },
		params: [lmm('cell', 'Repeat', 0.08, 0.02, 0.5), { ...ratio('tight', 'Tightness', 1.2, 1.02, 1.7), log: true }, num('depth', 'Depth', 6, 2, 9), line(0.0014)],
		grips: [along('cell', [1, 0], 'Repeat')],
		glsl: /* glsl */`
float field(vec2 p) {
	vec2 q = p / (P_cell * .5); float scale = 1.;
	for (int k = 0; k < 9; k++) { if (float(k) >= P_depth) break; q = -1. + 2. * fract(.5 * q + .5); float f = P_tight / dot(q, q); q *= f; scale *= f; }
	return .25 * abs(q.y) / scale * P_cell * .5 / P_line;
}`,
	},
};

// --- the wallpaper groups as what the shader sums: the group's operations on the cell's own coordinates (International
// Tables' general positions), and a few waves of the cell's lattice. Any wave averaged over the group's operations has the
// group's symmetry, so every reshuffle is another design of that symmetry (Farris, Creating Symmetry).
const I = [1, 0, 0, 1], R2 = [-1, 0, 0, -1], MX = [-1, 0, 0, 1], MY = [1, 0, 0, -1], R4 = [0, 1, -1, 0], R4b = [0, -1, 1, 0], DG = [0, 1, 1, 0], DGb = [0, -1, -1, 0];
// (hexagonal coordinates: (x, y) -> (-y, x - y) -> (-x + y, -x), as columns)
const H3 = [0, 1, -1, -1], H3b = [-1, -1, 1, 0], HM1 = [0, -1, -1, 0], HM2 = [-1, 0, 1, 1], HM3 = [1, 1, 0, -1], HN1 = [0, 1, 1, 0], HN2 = [1, 0, -1, -1], HN3 = [-1, -1, 0, 1], H6a = [0, -1, 1, 1], H6b = [1, 1, -1, 0];
const op = (m, t = [0, 0]) => ({ m, t }), centred = (ops) => [...ops, ...ops.map((o) => op(o.m, [o.t[0] + 0.5, o.t[1] + 0.5]))];
const RECT = [1, 0, 0, 1.4], SQUARE = [1, 0, 0, 1], HEXL = [1, 0, -0.5, 0.8660254], OBLIQUE = [1, 0, 0.35, 0.9];
export const WALLPAPER = {
	p1: { basis: OBLIQUE, ops: [op(I)] },
	p2: { basis: OBLIQUE, ops: [op(I), op(R2)] },
	pm: { basis: RECT, ops: [op(I), op(MX)] },
	pg: { basis: RECT, ops: [op(I), op(MX, [0, 0.5])] },
	cm: { basis: RECT, ops: centred([op(I), op(MX)]) },
	pmm: { basis: RECT, ops: [op(I), op(R2), op(MX), op(MY)] },
	pmg: { basis: RECT, ops: [op(I), op(R2), op(MX, [0.5, 0]), op(MY, [0.5, 0])] },
	pgg: { basis: RECT, ops: [op(I), op(R2), op(MX, [0.5, 0.5]), op(MY, [0.5, 0.5])] },
	cmm: { basis: RECT, ops: centred([op(I), op(R2), op(MX), op(MY)]) },
	p4: { basis: SQUARE, ops: [op(I), op(R2), op(R4), op(R4b)] },
	p4m: { basis: SQUARE, ops: [op(I), op(R2), op(R4), op(R4b), op(MX), op(MY), op(DG), op(DGb)] },
	p4g: { basis: SQUARE, ops: [op(I), op(R2), op(R4), op(R4b), op(MX, [0.5, 0.5]), op(MY, [0.5, 0.5]), op(DG, [0.5, 0.5]), op(DGb, [0.5, 0.5])] },
	p3: { basis: HEXL, ops: [op(I), op(H3), op(H3b)] },
	p3m1: { basis: HEXL, ops: [op(I), op(H3), op(H3b), op(HM1), op(HM2), op(HM3)] },
	p31m: { basis: HEXL, ops: [op(I), op(H3), op(H3b), op(HN1), op(HN2), op(HN3)] },
	p6: { basis: HEXL, ops: [op(I), op(H3), op(H3b), op(R2), op(H6a), op(H6b)] },
	p6m: { basis: HEXL, ops: [op(I), op(H3), op(H3b), op(R2), op(H6a), op(H6b), op(HM1), op(HM2), op(HM3), op(HN1), op(HN2), op(HN3)] },
};
function packWallpaper(P, seed) {
	const G = WALLPAPER[P.group] ?? WALLPAPER.p6m, V = new Float32Array(160), [ax, ay, bx, by] = G.basis, det = ax * by - ay * bx;
	const nW = Math.max(1, Math.min(6, Math.round(P.waves ?? 3))), fine = Math.max(1, Math.round(P.fine ?? 2));
	// the plane -> the cell's own coordinates (the inverse of the matrix whose columns are the cell's sides)
	V.set([by / det, -ay / det, -bx / det, ax / det], 4);
	G.ops.forEach((o, i) => { V.set(o.m, (2 + i) * 4); V.set(o.t, (14 + i) * 4); });
	let sum = 0;
	const taken = new Set();
	for (let k = 0; k < nW; k++) {
		// a wave of the cell's lattice: (n, m) whole numbers, neither nought for the first ones (a wave along one side alone is a
		// stripe), no wave twice
		let n = 0, m = 0;
		for (let tries = 0; tries < 12; tries++) {
			n = Math.round((hash2(seed, k * 3 + tries * 31, 11) * 2 - 1) * fine); m = Math.round((hash2(seed, k * 3 + 1 + tries * 31, 12) * 2 - 1) * fine);
			if ((k < 2 ? n && m : n || m) && !taken.has(n + ',' + m) && !taken.has(-n + ',' + -m)) break;
			n = 0; m = 0;
		}
		if (!n && !m) { n = 1 + (k % fine); m = k % 2 ? -1 : 1; }
		taken.add(n + ',' + m);
		const amp = 1 / Math.sqrt(Math.abs(n) + Math.abs(m));
		V.set([n, m, amp, hash2(seed, k * 3 + 2, 13) * Math.PI * 2], (26 + k) * 4);
		sum += amp * amp;
	}
	V[0] = G.ops.length; V[1] = nW; V[2] = 1.6 / (Math.sqrt(sum) * Math.sqrt(G.ops.length));
	return V;
}

export const DESIGN_KEYS = Object.keys(DESIGNS);
// A design as a pattern's arrangement is named 'print-<key>' (stones/layouts.js LAYOUTS: the crystal arrangements have the plain
// names, several the same as a design's).
export const PREFIX = 'print-';
export const designOf = (layout) => (typeof layout === 'string' && layout.startsWith(PREFIX) ? DESIGNS[layout.slice(PREFIX.length)] ?? null : null);
export const isDesign = (layout) => !!designOf(layout);
// What a pattern is made as: crystals, print, or both. A crystal arrangement starts as crystals (so does every record from
// before prints), a printed design as print.
export const AS = ['stones', 'print', 'both'];
export const madeAs = (P) => (AS.includes(P?.as) ? P.as : isDesign(P?.layout) ? 'print' : 'stones');
export const printsInk = (P) => madeAs(P) !== 'stones';
export const laysStones = (P) => madeAs(P) !== 'print';
// what a design's shader reads its settings as: P_<key> is uD[i] (a choice: its place in the list)
export const definesOf = (D) => D.params.map((p, i) => `#define P_${p.k} uD[${i}]`).join('\n');
export function designFloats(D, P, out = new Float32Array(16)) {
	D.params.forEach((p, i) => { const v = P[p.k] ?? p.d; out[i] = p.options ? Math.max(0, p.options.findIndex((o) => o[0] === v)) : Number(v) || 0; });
	return out;
}
