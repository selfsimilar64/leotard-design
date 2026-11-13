// The printed designs: each made of flat sections of colour, no blends (the ground, an accent, sometimes a second
// accent: prints/ink.js), written as a small shader that paints its shapes over its own space (metres). A design is a
// pattern's arrangement like any other (stones/layouts.js LAYOUTS), so it has the same frame, handles, distortions and
// modifiers, and it is paired with crystals: made as crystals, they run along the edges of its sections or fill them
// (prints/field-stones.js), read from the same shader.
//   label, params (the card's sliders: stones/layouts-lattice.js mm, num...; the shader reads each as P_<key>),
//   grips (its own handles), own (a design of its own size, laid where it is clicked), random (the seed matters),
//   two(P): it has a second accent, reach(P): how far it spreads, for its picture; ink: what its sections start as;
//   parts: [[key, label]...] where its settings are too many for one face of the card (a setting's `part`, or the first);
//   glsl: `void design(vec2 p)`, which paints (prints/glsl.js paint, bands, rimBands).
// A setting's key must not be one of a pattern's own (stones/pattern.js: size is the crystal's, twist, turn, scale...): the
// names live side by side in the record (dsize, tilt here; test/prints.test.js holds them apart).
// gAlpha: where a design of its own size ends (its ground, if that is given a colour, ends there too).
// Spec: knowledge/engineering/architecture/printed-patterns.md.
import { mm, num, ratio, deg, pct, opt, when, along, radius } from '../stones/layouts-lattice.js';

const lmm = (k, l, d, min, max) => ({ ...mm(k, l, d, min, max), log: true });
const LATTICE = [['hex', 'Staggered'], ['square', 'Square']];
// one accent on the ground, or two in turn (the shader: 2. + P_tones colours)
const tones = (d = 'one') => opt('tones', 'Accents', d, [['one', 'One'], ['two', 'Two']]);
const twoTones = (P) => P.tones === 'two';
const fine = (spec) => ({ ...spec, part: 'fine' });

// shared by the designs on a triangular lattice: where the nearest lattice point is, as the way to it
const HEX = /* glsl */`
vec2 hexOff(vec2 g) { vec2 s = vec2(1., 1.7320508), h = s * .5, a = mod(g, s) - h, b = mod(g - h, s) - h; return dot(a, a) < dot(b, b) ? a : b; }
`;

export const DESIGNS = {
	// --- bands ----------------------------------------------------------------------------------------------
	steps: {
		label: 'Steps', two: twoTones,
		params: [lmm('band', 'Step width', 0.03, 0.004, 0.3), tones(), mm('wavy', 'Wave height', 0.012, 0, 0.05), when(lmm('wavyL', 'Wave length', 0.08, 0.01, 0.4), (P) => !!P.wavy), mm('arch', 'Arch', 0, -0.1, 0.1)],
		grips: [along('band', [0, 1], 'Step width')],
		glsl: /* glsl */`
void design(vec2 p) {
	float y = p.y - P_arch * (p.x * p.x) / .01 + P_wavy * sin(TAU * p.x / P_wavyL);
	bands(y / P_band, P_band, 2. + P_tones);
}`,
	},
	burst: {
		label: 'Burst', own: true, two: twoTones, reach: (P) => P.dsize,
		params: [lmm('dsize', 'Radius', 0.1, 0.01, 0.6), opt('form', 'Shape', 'star', [['round', 'Round'], ['diamond', 'Diamond'], ['square', 'Square'], ['polygon', 'Polygon'], ['star', 'Star']]), when(num('sides', 'Points', 5, 3, 16), (P) => P.form === 'polygon' || P.form === 'star'), when(pct('inset', 'Star depth', 0.5, 0.1, 0.95), (P) => P.form === 'star'), num('steps', 'Steps', 5, 1, 16), tones(), { ...ratio('squash', 'Squash', 1, 0.25, 4), log: true }],
		grips: [radius('dsize', 'Radius')],
		glsl: /* glsl */`
void design(vec2 p) {
	vec2 q = vec2(p.x, p.y * P_squash); float r = length(q), a = atan(q.x, q.y), R = 1.; int f = int(P_form + .5);
	if (f == 1) R = 1. / (abs(cos(a)) + abs(sin(a)));
	else if (f == 2) R = 1. / max(abs(cos(a)), abs(sin(a)));
	else if (f == 3) R = polyR(a, P_sides);
	else if (f == 4) R = starR(a, P_sides, 1. - P_inset);
	// from the middle out: the accent first; past the last step, the ground
	float m = P_dsize * R / P_steps, u = r / m;
	bands(u + 1., m, 2. + P_tones);
	paint((P_steps - u) * m, 0);
}`,
	},
	scales: {
		label: 'Scales', two: twoTones,
		params: [lmm('dsize', 'Scale width', 0.035, 0.006, 0.3), pct('tall', 'Row height', 0.5, 0.25, 1), { ...ratio('lap', 'Overlap', 1, 0.75, 1.6), log: true }, num('arcs', 'Arcs a scale', 2, 1, 8), tones()],
		grips: [along('dsize', [1, 0], 'Scale width')],
		glsl: /* glsl */`
void design(vec2 p) {
	float w = P_dsize, h = w * .5 * P_tall, R = max(w * .5 * P_lap, length(vec2(w * .5, h)) * 1.001), base = floor(p.y / h);
	// rows from below: the lowest whose circle holds this place lies on top; its arcs from the rim in, the accent first
	for (int k = -4; k <= 1; k++) {
		float r = base + float(k), off = .5 * mod(r, 2.), cx = (floor(p.x / w - off + .5) + off) * w, d = length(p - vec2(cx, r * h));
		if (d < R) { rimBands((1. - d / R) * P_arcs + 1., R / P_arcs, 2. + P_tones); return; }
	}
}`,
	},
	circles: {
		label: 'Interlocking circles',
		params: [lmm('dsize', 'Circle size', 0.04, 0.008, 0.3), { ...ratio('lap', 'Overlap', 1, 0.5, 1.5), log: true }, opt('lattice', 'Lattice', 'hex', LATTICE), lmm('line', 'Line width', 0.002, 0.0004, 0.02)],
		grips: [radius('dsize', 'Circle size', { half: true })],
		glsl: /* glsl */`
void design(vec2 p) {
	float R = P_dsize * .5, sp = R / P_lap, d = 1e9; vec2 g = p / sp;
	if (P_lattice < .5) {
		float v = g.y / .8660254, u = g.x - .5 * v; vec2 b = floor(vec2(u, v));
		for (int j = -2; j <= 3; j++) for (int i = -2; i <= 3; i++) { vec2 c = b + vec2(float(i), float(j)); d = min(d, abs(length(g - vec2(c.x + .5 * c.y, c.y * .8660254)) - P_lap)); }
	} else {
		vec2 b = floor(g);
		for (int j = -2; j <= 3; j++) for (int i = -2; i <= 3; i++) d = min(d, abs(length(g - b - vec2(float(i), float(j))) - P_lap));
	}
	paint(d * sp - P_line * .5, 1);
}`,
	},
	dunes: {
		label: 'Layered waves', random: (P) => !!P.rough, two: twoTones,
		params: [lmm('height', 'Layer height', 0.035, 0.005, 0.3), lmm('wave', 'Wave length', 0.12, 0.02, 0.8), mm('amp', 'Wave height', 0.012, 0, 0.1, 0.0005), pct('rough', 'Roughness', 0.3), pct('drift', 'Drift', 0.37), num('arcs', 'Bands a layer', 2, 1, 8), tones()],
		grips: [along('height', [0, 1], 'Layer height')],
		glsl: /* glsl */`
void design(vec2 p) {
	float base = floor(p.y / P_height);
	// each layer's crest; from below, the first whose crest is above this place lies in front; its bands from the crest down
	for (int k = -4; k <= 4; k++) {
		float fk = base + float(k), crest = fk * P_height + P_amp * (sin(TAU * (p.x / P_wave + fk * P_drift)) + 2. * P_rough * gnoise(vec2(p.x / P_wave * 2.3, fk * 7.31) + uSeed));
		if (p.y < crest) { rimBands((crest - p.y) / P_height * P_arcs + 1., P_height / P_arcs, 2. + P_tones); return; }
	}
}`,
	},

	// --- tiles ----------------------------------------------------------------------------------------------
	cubes: {
		label: 'Tumbling blocks', two: twoTones,
		params: [lmm('cell', 'Block', 0.03, 0.005, 0.3), tones('two')],
		grips: [along('cell', [1, 0], 'Block')],
		glsl: HEX + /* glsl */`
float ndot(vec2 a, vec2 b) { return a.x * b.x - a.y * b.y; }
float sdRhombus(vec2 p, vec2 b) {
	p = abs(p); float h = clamp(ndot(b - 2. * p, b) / dot(b, b), -1., 1.), d = length(p - .5 * b * vec2(1. - h, 1. + h));
	return d * sign(p.x * b.y + p.y * b.x - b.x * b.y);
}
// the nearest of every block's face that looks the way ang (a block: three rhombi round a corner), in blocks
float faces(vec2 g, float ang) {
	vec2 c0 = g - hexOff(g), dir = vec2(cos(ang), sin(ang)); float d = 1e9;
	for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
		vec2 q = g - c0 - vec2(float(i) + .5 * float(j), .8660254 * float(j)) - dir * .2886751;
		d = min(d, sdRhombus(vec2(dot(q, dir), dot(q, vec2(-dir.y, dir.x))), vec2(.2886751, .5)));
	}
	return d;
}
void design(vec2 p) {
	vec2 g = p / P_cell;
	// the faces that look up are the ground, those to the right the second accent, the rest the accent
	gInk = -faces(g, PI * .5) * P_cell;
	gTwo = P_tones > .5 ? faces(g, -PI / 6.) * P_cell : 1e9;
}`,
	},
	motifs: {
		label: 'Motifs', random: (P) => !!P.toss, two: (P) => P.inner > 0,
		params: [lmm('spacing', 'Between motifs', 0.05, 0.008, 0.4), lmm('dsize', 'Motif size', 0.03, 0.004, 0.3), opt('motif', 'Motif', 'star', [['star', 'Star'], ['heart', 'Heart'], ['flower', 'Flower'], ['moon', 'Moon'], ['diamond', 'Diamond'], ['cross', 'Cross']]), when(num('points', 'Points', 5, 3, 12), (P) => P.motif === 'star' || P.motif === 'flower'), opt('lattice', 'Lattice', 'hex', LATTICE), deg('tilt', 'Turn', 0), pct('toss', 'Tossed', 0), pct('inner', 'Second accent inside', 0, 0, 0.9)],
		grips: [along('spacing', [1, 0], 'Between motifs')],
		glsl: HEX + /* glsl */`
float sdHeart(vec2 p) {
	p.x = abs(p.x);
	if (p.y + p.x > 1.) return length(p - vec2(.25, .75)) - .3535534;
	return sqrt(min(dot(p - vec2(0., 1.), p - vec2(0., 1.)), dot(p - .5 * max(p.x + p.y, 0.), p - .5 * max(p.x + p.y, 0.)))) * sign(p.x - p.y);
}
void design(vec2 p) {
	vec2 g = p / P_spacing, q = P_lattice < .5 ? hexOff(g) : fract(g) - .5, id = g - q;
	q = rot(radians(P_tilt) + P_toss * TAU * hash21(id + uSeed)) * q * P_spacing / (P_dsize * .5);
	float r = length(q), a = atan(q.x, q.y), sd; int m = int(P_motif + .5);
	if (m == 0) sd = (r - starR(a, P_points, .45)) * .7;
	else if (m == 1) sd = sdHeart(q * .62 + vec2(0., .58)) / .62;
	else if (m == 2) sd = (r - (.5 + .5 * pow(abs(cos(.5 * P_points * a)), .7))) * .8;
	else if (m == 3) sd = max(r - 1., .78 - length(q - vec2(.5, .12)));
	else if (m == 4) sd = (abs(q.x) / .68 + abs(q.y) - 1.) * .56;
	else sd = min(max(abs(q.x) - .3, abs(q.y) - 1.), max(abs(q.x) - 1., abs(q.y) - .3));
	paint(sd * P_dsize * .5, 1);
	if (P_inner > 0.) paint((sd + (1. - P_inner) * .6) * P_dsize * .5, 2);
}`,
	},

	// --- mandalas -------------------------------------------------------------------------------------------
	lotus: {
		label: 'Lotus', own: true, two: twoTones, reach: (P) => P.dsize,
		params: [lmm('dsize', 'Size', 0.07, 0.01, 0.5), num('petals', 'Petals', 8, 3, 32), num('layers', 'Layers', 3, 1, 6), pct('depth', 'Petal depth', 0.45, 0, 0.9), { ...ratio('sharp', 'Roundness', 1.2, 0.3, 4), log: true }, pct('shrink', 'Each layer smaller', 0.3, 0.05, 0.6), pct('stagger', 'Layers staggered', 1), num('arcs', 'Bands a layer', 2, 1, 8), tones()],
		grips: [radius('dsize', 'Size')],
		glsl: /* glsl */`
void design(vec2 p) {
	float r = length(p) / P_dsize, a = atan(p.x, p.y), L = P_layers, q = 2., m = P_dsize;
	// from the innermost: the first that holds this place shows; its bands from its rim in, the accent first, as many as
	// P_arcs across what shows of it past the layer inside
	for (int l = 0; l < 6; l++) {
		float fl = float(l); if (fl >= L) break;
		float R = pow(1. - P_shrink, L - 1. - fl), sh = 1. - P_depth + P_depth * pow(abs(cos(.5 * P_petals * a + .5 * PI * fl * P_stagger)), P_sharp);
		q = r / (R * sh); m = R * sh * P_dsize;
		if (q < 1.) { rimBands(min((1. - q) / P_shrink * P_arcs, P_arcs - .5) + 1., m * P_shrink / P_arcs, 2. + P_tones); return; }
	}
	gInk = (q - 1.) * m;
}`,
	},
	// A mandala as they are drawn by hand: rings round a small flower, each ring a row of one motif (pointed petals with an
	// inner line, a seed and a dot off the tip; a band of pearls; scallops; rays; a chain of circles; a band of teeth), the
	// rings widening outwards, every other one turned half a step, each lying over the one outside it.
	mandala: {
		label: 'Mandala', own: true, random: (P) => P.style === 'wild', two: () => true, reach: (P) => P.dsize * 1.06, parts: [['rings', 'Rings'], ['fine', 'Petals and lines']],
		params: [lmm('dsize', 'Size', 0.085, 0.02, 0.5), opt('style', 'Rings', 'lotus', [['lotus', 'Lotus'], ['sun', 'Sun'], ['lace', 'Lace'], ['temple', 'Temple'], ['bloom', 'Bloom'], ['wild', 'Shuffled']]), num('folds', 'Symmetry', 8, 3, 24), num('rings', 'Rings', 5, 1, 8),
			opt('drawn', 'Drawn as', 'line', [['line', 'Line art'], ['filled', 'Filled'], ['alt', 'Every other filled'], ['solid', 'Solid']]), 
			fine({ ...ratio('grow', 'Rings widen', 1.25, 0.7, 2), log: true }), fine(lmm('line', 'Line width', 0.0009, 0.0003, 0.005)), fine(pct('detail', 'Detail', 0.8)), fine(pct('pointed', 'Pointed petals', 0.85)), fine(pct('full', 'Petal width', 0.5))],
		grips: [radius('dsize', 'Size')],
		glsl: /* glsl */`
const int PETAL = 0, BEADS = 1, SCALLOP = 2, RAYS = 3, CHAIN = 4, TEETH = 5;
// the rings of each style, from the middle out
const int RECIPE[40] = int[40](
	0, 1, 0, 0, 1, 0, 2, 0,
	3, 1, 0, 3, 4, 3, 1, 3,
	2, 5, 0, 2, 1, 2, 0, 2,
	0, 5, 3, 1, 0, 4, 0, 2,
	0, 0, 0, 0, 0, 0, 0, 0);
float mLw;
// a pointed oval along y, w half across and b half along (two arcs); pointed 0: its ends rounded
float sdVesica(vec2 p, float w, float b) {
	w = min(w, b * .999); float r = .5 * (w + b * b / w), d = r - w;
	p = abs(p);
	return (p.y - b) * d > p.x * b ? length(p - vec2(0., b)) : length(p - vec2(-d, 0.)) - r;
}
float sdPetal(vec2 p, float w, float b, float pointed) { float ro = (1. - pointed) * w * .7; return sdVesica(p, w - ro, b - ro) - ro; }
// a place in the one of n wedges round the middle it lies in: x across the wedge, y out from the middle
vec2 wedge(vec2 p, float n, float turn) { float w = PI / n, a = mod(atan(p.x, p.y) + turn * w + w, 2. * w) - w; return length(p) * vec2(sin(a), cos(a)); }
// a body: a line of one section round a fill of another
void body(float sd, int cl, int cf) { paint(sd, cl); paint(sd + mLw, cf); }
// One ring, r0 to r1, of n motifs (turn 1: half a step round). cl, cf, ch: the sections of its lines, its bodies and its details.
void ring(int kind, vec2 p, float r0, float r1, float n, float turn, int cl, int cf, int ch) {
	float h = r1 - r0, r = length(p), rm = .5 * (r0 + r1), lw = mLw, D = P_detail;
	if (kind == BEADS || kind == TEETH) {
		float sd = abs(r - rm) - h * .5;
		body(sd, cl, cf);
		if (kind == BEADS) { float m = n * max(1., floor(TAU * rm / (h * 1.15) / n + .5)); vec2 q = wedge(p, m, turn); paint(length(q - vec2(0., rm)) - (h * .5 - lw) * .62, ch); }
		else {
			float m = n * max(1., floor(TAU * rm / (h * 1.1) / n + .5)), wm = PI * rm / m, hh = h - 2. * lw; vec2 q = wedge(p, m, turn); float y = q.y - r0 - lw;
			paint(max((abs(q.x) * hh + y * wm - wm * hh) / length(vec2(hh, wm)), -y), ch);
		}
		return;
	}
	if (kind == CHAIN) {
		float m = n * max(1., floor(TAU * rm / h / n + .5)), rad = min(rm * tan(PI / m), h * .5); vec2 q = wedge(p, m, turn); float sd = length(q - vec2(0., rm)) - rad;
		body(sd, cl, cf);
		if (D > .3) paint(sd + rad * .6, ch);
		return;
	}
	if (kind == SCALLOP) {
		float m = n * max(1., floor(PI * r0 / (h * .92) / n + .5)), rad = min(r0 * tan(PI / m), h); vec2 q = wedge(p, m, turn); float sd = length(q - vec2(0., r0)) - rad;
		body(sd, cl, cf);
		if (D > .3 && rad > lw * 8.) paint(abs(sd + rad * .3) - lw * .5, cl);
		if (D > .55) paint(length(q - vec2(0., r0 + rad * .36)) - rad * .14, ch);
		return;
	}
	vec2 q = wedge(p, n, turn); q.x = abs(q.x);
	float wd = r0 * tan(PI / n);
	if (kind == RAYS) {
		float w = wd * 1.02, sd = (q.x * h + (q.y - r0) * w - w * h) / length(vec2(h, w));
		body(sd, cl, cf);
		if (D > .4 && w > lw * 6.) paint(sd + max(lw * 3., w * .36), ch);
		if (D > .7) paint(length(q - vec2(0., r1 + lw * 2.2)) - lw * 1.4, ch);
		return;
	}
	float w = min(wd * (.7 + .8 * P_full), h * .95), sd = sdPetal(q - vec2(0., r0), w, h, P_pointed);
	// (behind them, a row turned half a step: its tips show between these)
	if (D > .6) { vec2 qb = wedge(p, n, turn + 1.); body(sdPetal(vec2(abs(qb.x), qb.y - r0), w * .92, h * .97, P_pointed), cl, cf); }
	body(sd, cl, cf);
	if (D > .2 && w > lw * 9.) paint(abs(sd + lw * 3.5) - lw * .5, cl);
	if (D > .45 && w > lw * 7.) paint(sdPetal(q - vec2(0., r0 + h * .5), w * .3, h * .28, 1.), ch);
	if (D > .7) paint(length(q - vec2(0., r1 + lw * 2.2)) - lw * 1.4, ch);
	if (D > .9 && w > lw * 12.) paint(max(abs(q.x) - lw * .4, abs(q.y - r0 - h * .11) - h * .09), cl);
}
void design(vec2 p) {
	int N = int(clamp(P_rings, 1., 8.) + .5), style = int(P_style + .5), drawn = int(P_drawn + .5);
	int kd[8]; float hg[8]; float tot = 0., g = 1.;
	mLw = P_line;
	for (int i = 0; i < N; i++) {
		int k = style < 5 ? RECIPE[style * 8 + i] : int(hash11(float(i) * 7.31 + uSeed.x) * 5.999);
		// (the outermost ring is one with a silhouette of its own)
		if (i == N - 1 && (k == BEADS || k == CHAIN || k == TEETH)) k = PETAL;
		kd[i] = k; hg[i] = (k == BEADS || k == TEETH ? .34 : k == CHAIN ? .46 : k == SCALLOP ? .6 : 1.) * g; tot += hg[i]; g *= P_grow;
	}
	float R = P_dsize, c0 = R * .11, sc = (R - c0) / tot, r1 = R, rad = length(p);
	gAlpha = 1. - edge(rad - R * 1.05);
	for (int i = N - 1; i >= 0; i--) {
		float r0 = r1 - hg[i] * sc, n = P_folds; int k = kd[i];
		// more petals on a ring whose own would be wider than they are tall
		if (k == PETAL || k == RAYS) n *= exp2(clamp(floor(log2(PI * r0 / P_folds / (hg[i] * sc * (.3 + .5 * P_full))) + .5), 0., 3.));
		bool fill = drawn == 1 || (drawn == 2 && (i & 1) == 1);
		if (drawn == 3) ring(k, p, r0, r1, n, float(i & 1), 0, 1, 2);
		else if (fill) ring(k, p, r0, r1, n, float(i & 1), 1, 2, 1);
		else ring(k, p, r0, r1, n, float(i & 1), 1, 0, 2);
		r1 = r0;
	}
	// the middle: a small flower in a disc, a dot in it
	float nc = P_folds > 12.5 ? floor(P_folds * .5) : P_folds;
	body(rad - c0, drawn == 3 ? 0 : 1, drawn == 3 ? 1 : drawn == 1 ? 2 : 0);
	if (drawn == 3) ring(PETAL, p, c0 * .3, c0 * .9, nc, 0., 1, 0, 2);
	else ring(PETAL, p, c0 * .3, c0 * .9, nc, 0., 1, drawn == 1 ? 0 : 2, 1);
	body(rad - c0 * .3, drawn == 3 ? 0 : 1, 2);
}`,
	},

	// --- fractals -------------------------------------------------------------------------------------------
	julia: {
		label: 'Julia set', own: true, two: twoTones, reach: (P) => P.dsize * 0.8,
		params: [lmm('dsize', 'Size', 0.1, 0.02, 0.6), num('power', 'Symmetry', 2, 2, 8), pct('cr', 'Shape', 0.63, 0, 1), deg('ca', 'Character', 169), num('iter', 'Depth', 40, 8, 80), { ...ratio('per', 'Steps a band', 1, 0.25, 8), log: true }, tones()],
		grips: [radius('dsize', 'Size')],
		glsl: /* glsl */`
void design(vec2 p) {
	vec2 z = p / (P_dsize * .5), c = P_cr * 1.3 * vec2(cos(radians(P_ca)), sin(radians(P_ca))); float n = P_power, i = 0., m2 = 0.;
	for (int k = 0; k < 80; k++) {
		if (float(k) >= P_iter) break;
		float r = length(z), a = atan(z.y, z.x);
		z = pow(r, n) * vec2(cos(n * a), sin(n * a)) + c; m2 = dot(z, z);
		if (m2 > 4096.) break;
		i += 1.;
	}
	// a band for every few steps a place takes to fly off; what never does is the set itself: the last accent
	float u = m2 > 4096. ? max(i + 1. - log(log(sqrt(m2)) / log(64.)) / log(n), 0.) / P_per : 0., fw = fwidth(u);
	if (m2 > 4096.) bands(u, uPx / max(fw, 1e-4), 2. + P_tones);
	else { gInk = -1.; gTwo = P_tones > .5 ? -1. : 1e9; }
}`,
	},
};

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
