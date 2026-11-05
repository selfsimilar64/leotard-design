// WGSL shared by the GPU stone engine (stones/gpu-lay.js, stones/gpu-keep.js): the hashes, noise and distortions of
// stones/fields.js, the modifiers of stones/modifiers.js, the sold sizes of stones/candidates.js, and fixed-point helpers that
// keep a rank's fraction as exact as the CPU twin's float64 (a float32 product of a rank by 61.8 loses five digits). Each
// function is the twin of the JS one named beside it: a change to one is a change to the other.

// A float64 constant in [0, 1) as 64 bits of fraction [hi, lo] (exactly: the CPU twin multiplies by the float64 itself).
function fix64(x) {
	const v = new DataView(new ArrayBuffer(8));
	v.setFloat64(0, x);
	const bits = v.getBigUint64(0), e = Number((bits >> 52n) & 0x7ffn), m = (bits & ((1n << 52n) - 1n)) | (1n << 52n);
	// x = m 2^(e - 1075); x 2^64 = m 2^(e - 1011)
	const s = BigInt(e - 1011), f = s >= 0n ? m << s : m >> -s;
	return [Number((f >> 32n) & 0xffffffffn), Number(f & 0xffffffffn)];
}
const fix32 = (x) => Math.round((x - Math.floor(x)) * 4294967296) >>> 0;
const [GOLD_HI, GOLD_LO] = fix64(0.6180339887498949);
export const u32 = (n) => (n >>> 0) + 'u';

// The modifier shapes as numbers (stones/modifiers.js MOD_SHAPES' keys, in order; anything else: 18).
export const MOD_SHAPE_IDS = ['linear', 'reflected', 'radial', 'oval', 'diamond', 'square', 'sweep', 'spiral', 'waves', 'ripple', 'stripes', 'checks', 'clouds', 'edge', 'along', 'family', 'random', 'bysize'];
// The modifiers buffer (array<vec4f>): 0 (density count, size count, colour count, palette count); 1 (palette weight total,
// sizes count); 2..5 the sold sizes (metres, ascending); 6.. the plain palette (weight, crystal index); then each modifier as five
// vec4 (density ones, then size, then colour: modsBuffer); then the colour stops (crystal indices, -1: keep), four a vec4.
export const MODS_HEAD = 6;

export const WGSL_COMMON = /* wgsl */ `
const PI = 3.141592653589793;
const TAU = 6.283185307179586;
const BIG = 3.0e38;
// stones/fields.js hash2: a number in [0, 1) from two integers and a seed
fn hashU(i: i32, j: i32, s: i32) -> u32 {
	var h = (bitcast<u32>(i) * 0x27d4eb2du) ^ (bitcast<u32>(j) * 0x165667b1u) ^ (bitcast<u32>(s) * 0x9e3779b1u);
	h = (h ^ (h >> 15u)) * 0x85ebca6bu;
	h = (h ^ (h >> 13u)) * 0xc2b2ae35u;
	return h ^ (h >> 16u);
}
fn hash2(i: i32, j: i32, s: i32) -> f32 { return f32(hashU(i, j, s) >> 8u) * (1.0 / 16777216.0); }
// JS Math.round
fn jround(x: f32) -> i32 { return i32(floor(x + 0.5)); }
// the high 32 bits of a 32 x 32 bit product
fn mulhi(a: u32, b: u32) -> u32 {
	let a0 = a & 0xffffu; let a1 = a >> 16u; let b0 = b & 0xffffu; let b1 = b >> 16u;
	let p00 = a0 * b0; let p01 = a0 * b1; let p10 = a1 * b0; let p11 = a1 * b1;
	let mid = (p00 >> 16u) + (p01 & 0xffffu) + (p10 & 0xffffu);
	return p11 + (p01 >> 16u) + (p10 >> 16u) + (mid >> 16u);
}
// a fraction kept in 32 bits, as a float32 rounded (as the CPU's Float32Array keeps a rank)
fn fxf(x: u32) -> f32 { let r = (x >> 8u) + ((x >> 7u) & 1u); return f32(r) * (1.0 / 16777216.0); }
// a float32 in [0, 1) as a 32-bit fraction (exact)
fn ffx(r: f32) -> u32 { return u32(clamp(r, 0.0, 0.99999994) * 4294967296.0); }
// frac(j x 0.6180339887498949 + hash): a line's j-th stone's rank (stones/candidates.js lineRank, runRank)
fn goldFx(j: u32) -> u32 { return j * ${u32(GOLD_HI)} + mulhi(j, ${u32(GOLD_LO)}); }
// frac(rank x 61.803398875 + 0.137): a stone's own random (stones/pattern.js, keepPattern's H; modifiers.js's H)
fn ownH(rank: f32) -> f32 { let r = ffx(rank); return fxf(r * 61u + mulhi(r, ${u32(fix32(61.803398875))}) + ${u32(fix32(0.137))}); }
// frac(rank x 97.13 + 0.71): which of two sold sizes a stone between them takes (stones/pattern.js ditherSize's h)
fn ditherH(rank: f32) -> f32 { let r = ffx(rank); return fxf(r * 97u + mulhi(r, ${u32(fix32(97.13))}) + ${u32(fix32(0.71))}); }

// stones/fields.js noise2, fbm
fn grad(ix: i32, iy: i32, s: i32, dx: f32, dy: f32) -> f32 { let a = hash2(ix, iy, s) * TAU; return cos(a) * dx + sin(a) * dy; }
fn ease(t: f32) -> f32 { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }
fn noise2(x: f32, y: f32, s: i32) -> f32 {
	let fx0 = floor(x); let fy0 = floor(y); let ix = i32(fx0); let iy = i32(fy0); let fx = x - fx0; let fy = y - fy0; let u = ease(fx); let v = ease(fy);
	let a = grad(ix, iy, s, fx, fy); let b = grad(ix + 1, iy, s, fx - 1.0, fy); let c = grad(ix, iy + 1, s, fx, fy - 1.0); let d = grad(ix + 1, iy + 1, s, fx - 1.0, fy - 1.0);
	return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 1.5;
}
fn fbm(x0: f32, y0: f32, s: i32, octaves: i32) -> f32 {
	var sum = 0.0; var amp = 1.0; var norm = 0.0; var x = x0; var y = y0;
	for (var k = 0; k < octaves; k++) { sum += amp * noise2(x, y, s + k * 17); norm += amp; amp *= 0.5; x = x * 2.0 + 11.3; y = y * 2.0 + 7.7; }
	return sum / norm;
}
`;

// The sold sizes and the modifiers, read from the modifiers buffer (binding: mods). Needs edgeD(u, v): the piece's edge distance
// at a place on the cloth (ClothPiece.edgeAt), defined by the kernel that includes this.
export const WGSL_MODS = /* wgsl */ `
fn nSizes() -> u32 { return u32(mods[1].y); }
fn soldSize(q: u32) -> f32 { return mods[2u + q / 4u][q % 4u]; }
// stones/candidates.js realSize: the nearest sold size
fn realSize(d: f32) -> f32 {
	let n = nSizes(); let s0 = soldSize(0u); let sl = soldSize(n - 1u);
	if (d <= s0) { return s0; }
	if (d >= sl) { return sl; }
	var lo = 0u; var hi = n - 1u;
	loop { if (lo >= hi) { break; } let m = (lo + hi) / 2u; if (soldSize(m) < d) { lo = m + 1u; } else { hi = m; } }
	let a = soldSize(lo - 1u); let b = soldSize(lo);
	return select(b, a, d - a < b - d);
}
// stones/pattern.js ditherSize: between two sold sizes, some of each
fn ditherSize(d: f32, h: f32) -> f32 {
	let n = nSizes(); let s0 = soldSize(0u); let sl = soldSize(n - 1u);
	if (d <= s0) { return s0; }
	if (d >= sl) { return sl; }
	var lo = 0u; var hi = n - 1u;
	loop { if (hi - lo <= 1u) { break; } let m = (lo + hi) / 2u; if (soldSize(m) <= d) { lo = m; } else { hi = m; } }
	return select(soldSize(lo), soldSize(hi), h < (d - soldSize(lo)) / (soldSize(hi) - soldSize(lo)));
}
// stones/peaks.js sizeClass: biggest first
fn sizeClass(d: f32) -> u32 { let n = nSizes(); var q = 0u; loop { if (q >= n - 1u || soldSize(q) >= d - 1e-7) { break; } q++; } return n - 1u - q; }

// what the fields read (stones/modifiers.js: LX, LY the frame's own place; U, V the cloth's; AT, CAT, KK, H)
struct ModAt { lx: f32, ly: f32, u: f32, v: f32, at: f32, cat: f32, kk: f32, h: f32 }
var<private> IN: f32;
fn modsAt() -> u32 { return ${MODS_HEAD}u + u32(mods[0].w); }
// stones/modifiers.js fieldOf: t, and how far inside its bounds (IN)
fn field(m: u32, C: ModAt) -> f32 {
	let v0 = mods[m]; let v1 = mods[m + 1u]; let v2 = mods[m + 2u];
	let ox = v1.x; let oy = v1.y; let c = v1.z; let s = v1.w;
	let w = v2.x; let h = v2.y; let hw = w * 0.5; let hh = h * 0.5; let least = min(w, h);
	let dx = C.lx - ox; let dy = C.ly - oy; let ax = dx * c + dy * s; let ay = dy * c - dx * s;
	switch (u32(v0.x)) {
		case 0u: { IN = min(hw - abs(ax), hh - abs(ay)); return ax / w + 0.5; }
		case 1u: { IN = min(hw - abs(ax), hh - abs(ay)); return abs(ax) / hw; }
		case 2u: { let r = length(vec2f(dx, dy)); IN = w - r; return r / w; }
		case 3u: { let t = length(vec2f(ax / w, ay / h)); IN = (1.0 - t) * least; return t; }
		case 4u: { let t = abs(ax) / w + abs(ay) / h; IN = (1.0 - t) * least; return t; }
		case 5u: { let t = max(abs(ax) / w, abs(ay) / h); IN = (1.0 - t) * least; return t; }
		case 6u: { IN = w - length(vec2f(dx, dy)); return fract(atan2(ay, ax) / TAU); }
		case 7u: { IN = BIG; return 0.5 + 0.5 * cos(atan2(ay, ax) + (TAU * length(vec2f(dx, dy))) / w); }
		case 8u: { IN = BIG; return 0.5 - 0.5 * cos((TAU * ax) / w); }
		case 9u: { IN = BIG; return 0.5 - 0.5 * cos((TAU * length(vec2f(dx, dy))) / w); }
		case 10u: { IN = BIG; return select(1.0, 0.0, fract(ax / w) < 0.5); }
		case 11u: { IN = BIG; return f32((i32(floor(ax / w)) + i32(floor(ay / w))) & 1); }
		case 12u: { IN = BIG; return 0.5 + 0.9 * fbm(ax / w, ay / w, i32(v2.z), 3); }
		case 13u: { let e = edgeD(C.u, C.v); IN = w - e; return e / w; }
		case 14u: { IN = BIG; return C.at; }
		case 15u: { IN = BIG; return f32(u32(C.cat) & 1u); }
		case 16u: { IN = BIG; return C.h; }
		case 17u: { IN = BIG; return 0.5 + log2(C.kk) / 2.0; }
		default: { IN = BIG; return 0.0; }
	}
}
fn curve(t0: f32, pw: f32, rev: bool) -> f32 {
	var t = clamp(t0, 0.0, 1.0);
	if (pw != 1.0) { t = select(0.0, pow(t, pw), t > 0.0); }
	return select(t, 1.0 - t, rev);
}
// stones/modifiers.js compileMods: density (a factor), size (a factor), colour (a palette index)
fn modDensity(C: ModAt) -> f32 {
	let n = u32(mods[0].x); var d = 1.0;
	for (var i = 0u; i < n; i++) {
		let m = modsAt() + i * 5u; let v0 = mods[m]; let v2 = mods[m + 2u]; let v3 = mods[m + 3u];
		let f = field(m, C); let clip = v0.y > 0.5; var val = 0.0;
		if (!clip || IN >= 0.0) {
			val = v3.x + (v3.y - v3.x) * curve(f, v0.z, v0.w > 0.5);
			if (clip && v2.w > 0.0 && IN < v2.w) { val *= IN / v2.w; }
		}
		if (i == 0u) { d = val; } else if (v3.z > 0.5) { d = min(d + val, 1.0); } else { d *= val; }
	}
	return d;
}
fn modSize(C: ModAt) -> f32 {
	let n = u32(mods[0].y); var g = 1.0;
	for (var i = 0u; i < n; i++) {
		let m = modsAt() + (u32(mods[0].x) + i) * 5u; let v0 = mods[m]; let v3 = mods[m + 3u];
		let f = field(m, C);
		if (v0.y > 0.5 && IN < 0.0) { continue; }
		let val = v3.x + (v3.y - v3.x) * curve(f, v0.z, v0.w > 0.5);
		if (i == 0u) { g = val; } else if (v3.z > 0.5) { g = g + val - 1.0; } else { g *= val; }
	}
	return max(g, 0.05);
}
fn stopAt(q: u32) -> f32 { let at = modsAt() + u32(mods[0].x + mods[0].y + mods[0].z) * 5u; return mods[at + q / 4u][q % 4u]; }
fn modColour(C: ModAt) -> u32 {
	let nc = u32(mods[0].z);
	if (nc == 0u) {
		// stones/pattern.js plainColour: one crystal, or by chance from the palette
		let np = u32(mods[0].w);
		if (np == 0u) { return 0u; }
		var r = C.h * mods[1].x;
		for (var p = 0u; p < np; p++) { r -= mods[${MODS_HEAD}u + p].x; if (r <= 0.0) { return u32(mods[${MODS_HEAD}u + p].y); } }
		return u32(mods[${MODS_HEAD}u + np - 1u].y);
	}
	var stone = 0u;
	for (var i = 0u; i < nc; i++) {
		let m = modsAt() + (u32(mods[0].x + mods[0].y) + i) * 5u; let v0 = mods[m]; let v3 = mods[m + 3u]; let v4 = mods[m + 4u];
		let n = u32(v4.x);
		if (n == 0u) { continue; }
		let f = field(m, C);
		if (v0.y > 0.5 && IN < 0.0) { continue; }
		var idx = 0u;
		let shape = u32(v0.x);
		if (shape == 15u) { idx = u32(C.cat) % n; }
		else if (shape == 16u) { idx = min(u32(floor(C.h * f32(n))), n - 1u); }
		else {
			let w = curve(f, v0.z, v0.w > 0.5) * f32(n - 1u) + (C.h - 0.5) * v3.w;
			idx = select(select(u32(floor(w + 0.5)), n - 1u, w >= f32(n - 1u)), 0u, w < 0.0);
		}
		let pick = stopAt(u32(v4.y) + idx);
		if (pick >= 0.0) { stone = u32(pick); }
	}
	return stone;
}
`;

// The modifiers buffer of a pattern (WGSL_MODS reads it): mods its modifiers (patternParams'), names the crystals (index 0 its
// own), pal: the group's palette or null. -> Float32Array; names grown with every crystal a modifier or the palette names.
export function modsBuffer(mods, names, pal, sizes) {
	const idx = (name) => { let q = names.indexOf(name); if (q < 0) { q = names.length; names.push(name); } return q; };
	const on = (k) => (mods ?? []).filter((m) => !m.off && m.on === k), D = on('density'), S = on('size'), C = on('colour'), all = [...D, ...S, ...C];
	const P = pal?.length ? pal : [];
	const stops = [];
	const recs = all.map((m) => {
		const a = ((m.a ?? 0) * Math.PI) / 180, w = Math.max(m.w ?? 0.1, 1e-4), h = Math.max(m.h ?? m.w ?? 0.1, 1e-4), sid = MOD_SHAPE_IDS.indexOf(m.shape);
		const from = m.from ?? 1, to = m.to ?? (m.on === 'density' ? 0 : 1), n = m.on === 'colour' ? m.stops?.length ?? 0 : 0, off = stops.length;
		if (n) for (const s of m.stops) stops.push(s ? idx(s) : -1);
		return [sid < 0 ? 18 : sid, m.clip ? 1 : 0, m.power ?? 1, m.reverse ? 1 : 0, m.x ?? 0, m.y ?? 0, Math.cos(a), Math.sin(a), w, h, m.seed ?? 0, Math.max(m.feather ?? 0, 0), from, to, m.blend === 'add' ? 1 : 0, m.mix ?? 1, n, off, 0, 0];
	});
	const total = P.reduce((s, p) => s + (p.weight ?? 1), 0);
	const out = new Float32Array((MODS_HEAD + P.length + recs.length * 5 + Math.ceil(stops.length / 4) + 1) * 4);
	out.set([D.length, S.length, C.length, P.length, total, sizes.length, 0, 0]);
	out.set(sizes, 8);
	P.forEach((p, i) => out.set([p.weight ?? 1, idx(p.stone)], (MODS_HEAD + i) * 4));
	recs.forEach((r, i) => out.set(r, (MODS_HEAD + P.length + i * 5) * 4));
	out.set(stops, (MODS_HEAD + P.length + recs.length * 5) * 4);
	return out;
}
