// The maths a stone pattern is made of, all in two dimensions and free of the body: hashes, noise,
// the gradients that drive a pattern's density, size and colour, and the distortions that bend any
// arrangement. Spec: knowledge/engineering/architecture/procedural-stone-patterns.md.

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
// Gradients: where a point of the flat cloth falls between the gradient's two ends, 0..1. Every
// shape is set by two points, a and b, so every shape has the same two handles on the body.

export const GRADIENTS = {
	none: { label: 'None' },
	linear: { label: 'Linear', hint: 'Along the line from one handle to the other' },
	reflected: { label: 'Reflected', hint: 'Out both ways from the first handle' },
	radial: { label: 'Radial', hint: 'Out from the first handle; the second sets the radius' },
	oval: { label: 'Oval', hint: 'Radial, stretched along the handles' },
	diamond: { label: 'Diamond', hint: 'A diamond growing from the first handle' },
	square: { label: 'Square', hint: 'A square growing from the first handle' },
	angular: { label: 'Sweep', hint: 'Round the first handle, starting at the second' },
	spiral: { label: 'Spiral', hint: 'Sweeping round the first handle and winding outwards' },
	waves: { label: 'Waves', hint: 'Soft bands; the handles set their direction and width' },
	ripple: { label: 'Ripple', hint: 'Soft rings round the first handle' },
	stripes: { label: 'Stripes', hint: 'Hard bands, for two-colour stripes' },
	checks: { label: 'Checks', hint: 'Hard squares, for two-colour checks' },
	clouds: { label: 'Clouds', hint: 'Soft random patches; the handles set their size' },
	edge: { label: 'From the edge', hint: 'From the edge of the piece inwards; the handles set how far' },
};
export const GRADIENT_KINDS = Object.keys(GRADIENTS);

// P: the pattern's parameters (gradient, ga, gb, gpower, greverse, gseed); edgeAt(u, v): distance to
// the piece's edge. -> (u, v) => t in 0..1, or null when the pattern has no gradient.
export function gradientField(P, edgeAt) {
	const shape = P.gradient ?? 'none';
	if (shape === 'none' || !GRADIENTS[shape]) return null;
	const [ax, ay] = P.ga, [bx, by] = P.gb, dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-6, ux = dx / L, uy = dy / L, seed = P.gseed ?? 0;
	let f;
	switch (shape) {
		case 'linear': f = (u, v) => ((u - ax) * ux + (v - ay) * uy) / L; break;
		case 'reflected': f = (u, v) => Math.abs((u - ax) * ux + (v - ay) * uy) / L; break;
		case 'radial': f = (u, v) => Math.hypot(u - ax, v - ay) / L; break;
		case 'oval': { const r = 2.2; f = (u, v) => { const x = (u - ax) * ux + (v - ay) * uy, y = -(u - ax) * uy + (v - ay) * ux; return Math.hypot(x, y * r) / L; }; break; }
		case 'diamond': f = (u, v) => { const x = (u - ax) * ux + (v - ay) * uy, y = -(u - ax) * uy + (v - ay) * ux; return (Math.abs(x) + Math.abs(y)) / L; }; break;
		case 'square': f = (u, v) => { const x = (u - ax) * ux + (v - ay) * uy, y = -(u - ax) * uy + (v - ay) * ux; return Math.max(Math.abs(x), Math.abs(y)) / L; }; break;
		case 'angular': { const a0 = Math.atan2(dy, dx); f = (u, v) => frac((Math.atan2(v - ay, u - ax) - a0) / TAU); break; }
		case 'spiral': { const a0 = Math.atan2(dy, dx); f = (u, v) => 0.5 + 0.5 * Math.cos(Math.atan2(v - ay, u - ax) - a0 + (TAU * Math.hypot(u - ax, v - ay)) / L); break; }
		case 'waves': f = (u, v) => 0.5 + 0.5 * Math.cos(TAU * ((u - ax) * ux + (v - ay) * uy) / L); break;
		case 'ripple': f = (u, v) => 0.5 + 0.5 * Math.cos(TAU * Math.hypot(u - ax, v - ay) / L); break;
		case 'stripes': f = (u, v) => (frac(((u - ax) * ux + (v - ay) * uy) / L) < 0.5 ? 0 : 1); break;
		case 'checks': f = (u, v) => { const x = (u - ax) * ux + (v - ay) * uy, y = -(u - ax) * uy + (v - ay) * ux; return (Math.floor(x / L) + Math.floor(y / L)) & 1; }; break;
		case 'clouds': f = (u, v) => 0.5 + 0.9 * fbm((u - ax) / L, (v - ay) / L, seed, 3); break;
		case 'edge': f = (u, v) => (edgeAt ? edgeAt(u, v) : 0) / L; break;
	}
	const pw = P.gpower ?? 1, rev = !!P.greverse;
	return (u, v) => {
		let t = f(u, v);
		t = t < 0 ? 0 : t > 1 ? 1 : t;
		if (pw !== 1) t = Math.pow(t, pw);
		return rev ? 1 - t : t;
	};
}

// ---------------------------------------------------------------------------------------------
// Distortions: any arrangement bent as a whole, in the pattern's own space (metres, before the
// pattern's scale). -> (x, y, i, out) writing out.x, out.y; or null when nothing bends it.
export const DISTORT_KEYS = ['twist', 'bulge', 'bulgeR', 'waveA', 'waveL', 'warp', 'warpL', 'jitter'];
export function distortion(P, seed) {
	const twist = P.twist ?? 0, bulge = P.bulge ?? 0, waveA = P.waveA ?? 0, warp = P.warp ?? 0, jitter = P.jitter ?? 0;
	if (!twist && !bulge && !waveA && !warp && !jitter) return null;
	const R2 = (P.bulgeR ?? 0.08) ** 2, waveL = P.waveL ?? 0.06, warpL = P.warpL ?? 0.08;
	return (x0, y0, i, out) => {
		let x = x0, y = y0;
		if (warp) { const nx = x / warpL, ny = y / warpL; x += warp * fbm(nx, ny, seed + 3, 2); y += warp * fbm(nx + 5.2, ny + 1.3, seed + 5, 2); }
		if (waveA) { const ox = x; x += waveA * Math.sin(TAU * y / waveL); y += waveA * 0.5 * Math.sin(TAU * ox / waveL); }
		if (bulge || twist) {
			const r2 = x * x + y * y;
			if (bulge) { const g = 1 + bulge * Math.exp(-r2 / R2); x *= g; y *= g; }
			if (twist) { const a = twist * Math.sqrt(r2) / 0.1, c = Math.cos(a), s = Math.sin(a), ox = x; x = c * ox - s * y; y = s * ox + c * y; }
		}
		if (jitter) { x += jitter * (hash2(i, 1, seed) - 0.5) * 2; y += jitter * (hash2(i, 2, seed) - 0.5) * 2; }
		out.x = x; out.y = y;
	};
}
// How far a distortion can carry a point (metres): the arrangement must reach this far past the piece.
export function distortionReach(P, r) {
	return (P.warp ?? 0) * 1.2 + (P.waveA ?? 0) + (P.jitter ?? 0) + Math.abs(P.bulge ?? 0) * Math.min(r, P.bulgeR ?? 0.08);
}
