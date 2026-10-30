// Stone arrangements round a centre: rings, bursts, rosettes, curves, and the spirals, phyllotaxis
// among them. See stones/layouts-lattice.js for what a layout is.
import { TAU, hash2, rankOf1 } from './fields.js';
import { mm, num, deg, pct, opt, overTile, TILE_R } from './layouts-lattice.js';

const GOLDEN = 137.50776405003785;

// Primes (and their friends) up to n, by sieve; kept and grown as needed.
let sieve = new Uint8Array(0);
export function isPrimeTable(n) {
	if (sieve.length > n) return sieve;
	const N = Math.max(n + 1, 4096), s = new Uint8Array(N).fill(1);
	s[0] = s[1] = 0;
	for (let i = 2; i * i < N; i++) if (s[i]) for (let j = i * i; j < N; j += i) s[j] = 0;
	return (sieve = s);
}
// Which numbers a spiral keeps. -> (n) => boolean
function numberFilter(kind, count) {
	if (kind === 'prime') { const s = isPrimeTable(count + 2); return (n) => s[n] === 1; }
	if (kind === 'twin') { const s = isPrimeTable(count + 2); return (n) => s[n] === 1 && (s[n + 2] === 1 || (n >= 2 && s[n - 2] === 1)); }
	if (kind === 'fib') return (n) => n % 8 === 0 || n % 13 === 0; // the sunflower's own spirals: spokes
	if (kind === 'square') return (n) => { const r = Math.round(Math.sqrt(n)); return r * r === n || (r * (r + 1)) === n; };
	return () => true;
}

export const RADIAL_LAYOUTS = {
	// --- rings and bursts --------------------------------------------------------------------------
	rings: {
		label: 'Rings',
		params: [mm('spacing', 'Between rings', 0.012, 0.003, 0.06), num('ringsOf', 'Rings (0: all)', 0, 0, 60), pct('stagger', 'Stagger', 0.5)],
		make(P, E) {
			const r = E.box.r, K = P.ringsOf > 0 ? P.ringsOf : Math.ceil(r / P.spacing);
			for (let k = 1; k <= K; k++) {
				const R = k * P.spacing, a0 = k * P.stagger * (E.pitch / R);
				E.cat = k % 16; E.t = k / K;
				E.arc(0, 0, R, a0, a0 + TAU);
			}
			E.add(0, 0, 0, 0, 0, 1, 0);
		},
	},
	sunburst: {
		label: 'Sunburst',
		params: [num('rays', 'Rays', 36, 4, 180), mm('inner', 'Starts at', 0.012, 0, 0.1), mm('length', 'Length', 0.12, 0.02, 0.4), pct('alternate', 'Every other ray', 0.6), pct('taper', 'Taper', 0.5)],
		make(P, E) {
			for (let k = 0; k < P.rays; k++) {
				const a = (k / P.rays) * TAU, c = Math.cos(a), s = Math.sin(a), L = P.length * (k & 1 ? P.alternate : 1), n = Math.max(1, Math.round(L / E.pitch));
				for (let i = 0; i <= n; i++) {
					const f = i / n, R = P.inner + L * f;
					E.add(R * c, R * s, rankOf1(k), a, f, 1 - P.taper * f, k & 1);
				}
			}
		},
	},
	mandala: {
		label: 'Rosette',
		params: [num('fold', 'Petals', 8, 3, 24), num('layers', 'Layers', 5, 1, 16), mm('spacing', 'Between layers', 0.016, 0.004, 0.06), pct('depth', 'Petal depth', 0.3, 0, 0.9)],
		make(P, E) {
			const F = P.fold;
			for (let l = 1; l <= P.layers; l++) {
				const R = l * P.spacing, ph = (l & 1 ? 0 : Math.PI / F), d = P.depth / Math.sqrt(l);
				E.cat = l % 16; E.t = l / P.layers;
				const steps = E.stepsFor(TAU * R * 1.5, 1500);
				E.move(R * (1 + d * Math.cos(ph)), 0);
				for (let i = 1; i <= steps; i++) {
					const a = (i / steps) * TAU, r = R * (1 + d * Math.cos(F * a + ph));
					E.to(r * Math.cos(a), r * Math.sin(a));
				}
				if (l & 1) for (let k = 0; k < F; k++) { const a = ((k + 0.5) / F) * TAU; E.add(R * (1 - d) * 0.86 * Math.cos(a), R * (1 - d) * 0.86 * Math.sin(a), rankOf1(k), a, l / P.layers, 1.3, 9); }
			}
			E.add(0, 0, 0, 0, 0, 1.5, 9);
		},
	},
	rose: {
		label: 'Rose curve',
		params: [mm('radius', 'Size', 0.1, 0.02, 0.4), num('petalsN', 'Petals', 5, 1, 16), num('petalsD', 'Weave', 1, 1, 9), num('nested', 'Nested', 1, 1, 6)],
		make(P, E) {
			const n = P.petalsN, d = P.petalsD, k = n / d, turns = (n * d) % 2 ? d : 2 * d;
			for (let l = 0; l < P.nested; l++) {
				const A = P.radius * (1 - l / P.nested);
				E.cat = l;
				const len = 4 * n * A, steps = E.stepsFor(len, 5000);
				E.move(A, 0);
				for (let i = 1; i <= steps; i++) {
					const a = (i / steps) * Math.PI * turns, r = A * Math.cos(k * a);
					E.t = i / steps;
					E.to(r * Math.cos(a), r * Math.sin(a));
				}
			}
		},
	},
	guilloche: {
		label: 'Guilloché',
		params: [mm('radius', 'Size', 0.1, 0.02, 0.4), num('petals', 'Waves', 7.25, 2, 30, 0.25), num('turnsOf', 'Passes', 4, 1, 16), pct('depth', 'Depth', 0.32, 0.02, 0.8)],
		make(P, E) {
			const A = P.radius, d = P.depth, p = P.petals, T = TAU * P.turnsOf, len = A * T * (1 + d * p * 0.6), steps = E.stepsFor(len, 12000);
			E.move(A, 0);
			for (let i = 1; i <= steps; i++) {
				const t = (i / steps) * T;
				E.t = i / steps;
				E.to(A * ((1 - d) * Math.cos(t) + d * Math.cos(p * t)), A * ((1 - d) * Math.sin(t) - d * Math.sin(p * t)));
			}
		},
	},
	stringart: {
		label: 'String art',
		params: [mm('radius', 'Size', 0.1, 0.02, 0.4), num('nails', 'Nails', 60, 12, 200), num('times', 'Multiply by', 2, 2, 30, 0.5)],
		make(P, E) {
			const R = P.radius, N = P.nails;
			for (let i = 0; i < N; i++) {
				const a = (i / N) * TAU, b = ((i * P.times) / N) * TAU;
				E.cat = i & 1; E.t = i / N;
				E.seg(R * Math.cos(a), R * Math.sin(a), R * Math.cos(b), R * Math.sin(b));
			}
		},
	},
	whirl: {
		label: 'Whirl',
		params: [num('fold', 'Sides', 6, 3, 12), num('layers', 'Layers', 16, 2, 50), mm('radius', 'Size', 0.14, 0.02, 0.4), deg('whirl', 'Turn per layer', 6, -30, 30)],
		make(P, E) {
			const F = P.fold, st = (P.whirl * Math.PI) / 180;
			for (let l = 0; l < P.layers; l++) {
				const R = P.radius * (1 - l / P.layers), a0 = l * st;
				E.cat = l % 2; E.t = l / P.layers;
				for (let k = 0; k < F; k++) {
					const a = a0 + (k / F) * TAU, b = a0 + ((k + 1) / F) * TAU;
					E.seg(R * Math.cos(a), R * Math.sin(a), R * Math.cos(b), R * Math.sin(b));
				}
			}
		},
	},

	// --- spirals -----------------------------------------------------------------------------------
	phyllotaxis: {
		points: true,
		label: 'Phyllotaxis',
		params: [
			mm('spacing', 'Spacing', 0.006, 0.002, 0.03), num('divergence', 'Angle', GOLDEN, 90, 180, 0.01, 'deg'), num('count', 'Stones', 1500, 10, 20000, 10),
			opt('numbers', 'Keep', 'all', [['all', 'Every seed'], ['prime', 'Prime seeds'], ['twin', 'Twin primes'], ['fib', 'Fibonacci multiples'], ['square', 'Squares']]),
			num('grow', 'Grow outwards', 0, -0.7, 2, 0.05, 'x'), num('arms', 'Colour spirals', 13, 2, 55),
		],
		make(P, E) {
			const c = P.spacing, a = (P.divergence * Math.PI) / 180, keep = numberFilter(P.numbers, P.count), Rm = c * Math.sqrt(P.count), r = E.box.r;
			for (let n = 1; n <= P.count; n++) {
				const R = c * Math.sqrt(n);
				if (R > r) break;
				if (!keep(n)) continue;
				const th = n * a, f = R / Rm;
				E.add(R * Math.cos(th), R * Math.sin(th), rankOf1(n), th, f, 1 + P.grow * f, n % P.arms);
			}
		},
	},
	sacks: {
		points: true,
		label: 'Prime spiral',
		params: [mm('spacing', 'Spacing', 0.0035, 0.002, 0.03), num('count', 'Numbers', 12000, 100, 60000, 100), opt('numbers', 'Keep', 'prime', [['prime', 'Primes'], ['twin', 'Twin primes'], ['square', 'Squares'], ['all', 'All']])],
		make(P, E) {
			const c = P.spacing, keep = numberFilter(P.numbers, P.count), r = E.box.r;
			for (let n = 1; n <= P.count; n++) {
				const R = c * Math.sqrt(n);
				if (R > r) break;
				if (!keep(n)) continue;
				const th = TAU * Math.sqrt(n);
				E.add(R * Math.cos(th), R * Math.sin(th), rankOf1(n), th, R / (c * Math.sqrt(P.count)), 1, n % 6);
			}
		},
	},
	ulam: {
		points: true,
		label: 'Ulam primes',
		params: [mm('spacing', 'Spacing', 0.0035, 0.002, 0.03), num('count', 'Numbers', 20000, 100, 60000, 100), opt('numbers', 'Keep', 'prime', [['prime', 'Primes'], ['twin', 'Twin primes'], ['all', 'All']])],
		make(P, E) {
			const c = P.spacing, keep = numberFilter(P.numbers, P.count);
			let x = 0, y = 0, dx = 1, dy = 0, run = 1, left = 1, turns = 0;
			for (let n = 1; n <= P.count; n++) {
				if (keep(n)) E.add(x * c, y * c, rankOf1(n), 0, n / P.count, 1, n % 6);
				x += dx; y += dy;
				if (--left === 0) { [dx, dy] = [-dy, dx]; if (++turns % 2 === 0) run++; left = run; }
			}
		},
	},
	spiral: {
		label: 'Spiral arms',
		params: [mm('spacing', 'Between arms', 0.012, 0.003, 0.06), num('arms', 'Arms', 1, 1, 16), num('power', 'Opening', 1, 0.4, 2, 0.01, 'x')],
		make(P, E) {
			const A = P.arms, r = E.box.r, w = P.spacing * A, pw = P.power;
			for (let k = 0; k < A; k++) {
				const a0 = (k / A) * TAU;
				E.cat = k;
				E.move(0, 0);
				// wind until the arm leaves the piece: r = w (th / tau)^power
				let thMax = TAU * Math.pow(r / w, 1 / pw);
				// opening ever slower (a Fermat spiral): it ends where its turns would touch
				if (pw < 1) thMax = Math.min(thMax, TAU * Math.pow((pw * w) / (A * E.pitch * 1.15), 1 / (1 - pw)));
				let th = 0.02;
				while (th < thMax) {
					const R = w * Math.pow(th / TAU, pw), dR = (pw * R) / th, step = Math.min(E.pitch / 2 / Math.max(Math.hypot(R, dR), 1e-4), 0.5);
					E.t = th / thMax;
					E.to(R * Math.cos(th + a0), R * Math.sin(th + a0));
					th += step;
				}
			}
		},
	},
	nautilus: {
		label: 'Nautilus',
		params: [num('arms', 'Arms', 3, 1, 16), num('growth', 'Growth each turn', 1.8, 1.1, 4, 0.01, 'x'), mm('inner', 'Starts at', 0.004, 0.001, 0.05)],
		make(P, E) {
			const b = Math.log(P.growth) / TAU, r = E.box.r;
			for (let k = 0; k < P.arms; k++) {
				const a0 = (k / P.arms) * TAU, thMax = Math.log(r / P.inner) / b;
				E.cat = k;
				let th = 0;
				E.move(P.inner * Math.cos(a0), P.inner * Math.sin(a0));
				while (th < thMax) {
					const R = P.inner * Math.exp(b * th);
					E.t = th / thMax;
					E.to(R * Math.cos(th + a0), R * Math.sin(th + a0));
					th += Math.min((E.pitch / 2) / (R * Math.hypot(1, b)), 0.3);
				}
			}
		},
	},
	galaxy: {
		label: 'Galaxy',
		dart: true, mixed: true,
		params: [num('arms', 'Arms', 3, 1, 8), mm('radius', 'Size', 0.16, 0.03, 0.5), num('wind', 'Wind', 2.2, 0.2, 6, 0.05, 'x'), pct('spread', 'Spread', 0.28, 0.02, 1)],
		make(P, E) {
			const seed = E.seed, N = Math.min(14000, Math.round(((P.radius / E.pitch) ** 2) * 3));
			for (let i = 0; i < N; i++) {
				const f = Math.pow(hash2(i, 1, seed), 0.65), arm = Math.floor(hash2(i, 2, seed) * P.arms);
				const gauss = (hash2(i, 3, seed) + hash2(i, 4, seed) + hash2(i, 5, seed) - 1.5) * 1.2;
				const a = (arm / P.arms) * TAU + P.wind * Math.log(1 + f * 6) + gauss * P.spread * (1.2 - f * 0.6), R = f * P.radius;
				E.add(R * Math.cos(a), R * Math.sin(a), rankOf1(i), hash2(i, 6, seed) * TAU, f, 1, hash2(i, 7, seed) < 0.12 * (1 - f) ? 1 : 0);
			}
		},
	},
	stardust: {
		label: 'Stardust',
		dart: true, mixed: true,
		params: [mm('radius', 'Size', 0.16, 0.02, 0.5), num('falloff', 'Fall-off', 2.2, 0.5, 6, 0.05, 'x')],
		make(P, E) {
			const seed = E.seed;
			overTile(E.box, E.pitch / TILE_R, seed, (x, y, k, rank) => {
				const f = Math.hypot(x, y) / P.radius;
				if (f >= 1) return;
				E.add(x, y, 1 - (1 - rank) * Math.pow(1 - f, P.falloff), hash2(k, 8, seed) * TAU, f, 1, hash2(k, 7, seed) < 0.12 ? 1 : 0);
			});
		},
	},
};
