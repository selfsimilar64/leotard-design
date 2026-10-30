// The maths a stone pattern is made of, all in two dimensions and free of the body: hashes, noise and
// the distortions that bend any arrangement. Spec: knowledge/engineering/architecture/procedural-stone-patterns.md.

export const TAU = Math.PI * 2;
export const frac = (x) => x - Math.floor(x);
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// A number in [0, 1) from two integers and a seed: the same stone keeps the same chance.
export function hash2(i, j = 0, s = 0) {
	let h = Math.imul(i | 0, 0x27d4eb2d) ^ Math.imul(j | 0, 0x165667b1) ^ Math.imul(s | 0, 0x9e3779b1);
	h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
	h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Low-discrepancy orders: any first share of a lattice (or of a row) is spread evenly, so a density
// below 1 thins it without clumps, and a stone that is kept at 40% is still kept at 60%.
export const rankOf2 = (i, j) => frac(i * 0.7548776662466927 + j * 0.5698402909980532);
export const rankOf1 = (i) => frac(i * 0.6180339887498949);

// Gradient noise on the integer lattice, about -1..1; `s` picks one of its endless variations.
function grad(ix, iy, s, dx, dy) {
	const a = hash2(ix, iy, s) * TAU;
	return Math.cos(a) * dx + Math.sin(a) * dy;
}
const ease = (t) => t * t * t * (t * (t * 6 - 15) + 10);
export function noise2(x, y, s = 0) {
	const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = ease(fx), v = ease(fy);
	const a = grad(ix, iy, s, fx, fy), b = grad(ix + 1, iy, s, fx - 1, fy), c = grad(ix, iy + 1, s, fx, fy - 1), d = grad(ix + 1, iy + 1, s, fx - 1, fy - 1);
	return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 1.5;
}
export function fbm(x, y, s = 0, octaves = 3) {
	let sum = 0, amp = 1, norm = 0;
	for (let k = 0; k < octaves; k++) { sum += amp * noise2(x, y, s + k * 17); norm += amp; amp *= 0.5; x = x * 2 + 11.3; y = y * 2 + 7.7; }
	return sum / norm;
}

// ---------------------------------------------------------------------------------------------
// Distortions: any arrangement bent as a whole, in the pattern's own space (metres, before the
// pattern's scale). -> (x, y, out) writing out.x, out.y; or null when nothing bends it. (Each stone's
// own stray, jitter, is the candidates' to add: it is not a bend of the plane.)
export const DISTORT_KEYS = ['twist', 'bulge', 'bulgeR', 'waveA', 'waveL', 'warp', 'warpL'];
export function distortion(P, seed) {
	const twist = P.twist ?? 0, bulge = P.bulge ?? 0, waveA = P.waveA ?? 0, warp = P.warp ?? 0;
	if (!twist && !bulge && !waveA && !warp) return null;
	const R2 = (P.bulgeR ?? 0.08) ** 2, waveL = P.waveL ?? 0.06, warpL = P.warpL ?? 0.08;
	return (x0, y0, out) => {
		let x = x0, y = y0;
		if (warp) { const nx = x / warpL, ny = y / warpL; x += warp * fbm(nx, ny, seed + 3, 2); y += warp * fbm(nx + 5.2, ny + 1.3, seed + 5, 2); }
		if (waveA) { const ox = x; x += waveA * Math.sin(TAU * y / waveL); y += waveA * 0.5 * Math.sin(TAU * ox / waveL); }
		if (bulge || twist) {
			const r2 = x * x + y * y;
			if (bulge) { const g = 1 + bulge * Math.exp(-r2 / R2); x *= g; y *= g; }
			if (twist) { const a = twist * Math.sqrt(r2) / 0.1, c = Math.cos(a), s = Math.sin(a), ox = x; x = c * ox - s * y; y = s * ox + c * y; }
		}
		out.x = x; out.y = y;
	};
}
// How far a distortion can carry a point (metres): the arrangement must reach this far past the piece.
export function distortionReach(P, r) {
	return (P.warp ?? 0) * 1.2 + (P.waveA ?? 0) + Math.abs(P.bulge ?? 0) * Math.min(r, P.bulgeR ?? 0.08);
}
