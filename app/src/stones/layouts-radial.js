// Stone arrangements round a centre: rings, bursts, rosettes, curves, and the spirals, phyllotaxis
// among them. Their stones grow with the pattern: bigger outwards, bigger at a petal's tip, tapering along a
// ray, and the spacing follows, so the pattern stays packed. See stones/layouts-lattice.js for what a layout is.
import { TAU, hash2, rankOf1, clamp01 } from './fields.js';
import { mm, num, ratio, stoneRatio, reachOn, deg, pct, hidden, when, along, radius, point, overTile, TILE_R, varied, SMALLEST_VARIED } from './layouts-lattice.js';

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
// Which numbers a spiral keeps (set by its preset). -> (n) => boolean
function numberFilter(kind, count) {
	if (kind === 'prime') { const s = isPrimeTable(count + 2); return (n) => s[n] === 1; }
	if (kind === 'twin') { const s = isPrimeTable(count + 2); return (n) => s[n] === 1 && (s[n + 2] === 1 || (n >= 2 && s[n - 2] === 1)); }
	if (kind === 'fib') return (n) => n % 8 === 0 || n % 13 === 0; // the sunflower's own spirals: spokes
	if (kind === 'square') return (n) => { const r = Math.round(Math.sqrt(n)); return r * r === n || (r * (r + 1)) === n; };
	return () => true;
}
const isTwin = (s, n) => s[n] === 1 && (s[n + 2] === 1 || (n >= 2 && s[n - 2] === 1));

export const RADIAL_LAYOUTS = {
	// --- rings and bursts --------------------------------------------------------------------------
	rings: {
		label: 'Rings', own: true,
		params: [mm('spacing', 'Between rings', 0.012, 0.003, 0.06), { ...num('ringsOf', 'Rings (0: all)', 0, 0, 200), maxOf: (P, piece) => Math.ceil(reachOn(P, piece) / P.spacing) }, num('spokes', 'Spokes (0: none)', 0, 0, 48), when(deg('ringTurn', 'Turn per ring', 0, -30, 30, 0.5), (P) => P.spokes > 0), pct('grow', 'Grow outwards', 0, 0, 2), when(stoneRatio('nodeSize', 'Stones at the crossings', 1.3, 1, 3.5), (P) => P.spokes > 0), stoneRatio('centre', 'Stone in the middle', 1.4, 1, 4)],
		grips: [along('spacing', [1, 0], 'Between rings')],
		make(P, E) {
			const r = E.box.r, F = P.spokes, turn = (P.ringTurn * Math.PI) / 180;
			E.key(0, 0, 0, 0, P.centre, 0, 0);
			// with spokes, a web: each ring and each spoke runs from crossing to crossing, a stone on each
			const stopsAt = (a0) => Array.from({ length: F }, (_, q) => a0 + (q / F) * TAU);
			let R = P.spacing, last = 0, lastK = P.centre, lastA = 0;
			for (let k = 1; (P.ringsOf ? k <= P.ringsOf : last <= r) && k < 400; k++) {
				const f = 1 + (P.grow * R) / 0.2, a0 = k * turn;
				E.cat = k % 16; E.t = clamp01(R / 0.35); E.k = f; E.jk = f * (F ? P.nodeSize : 1);
				E.arc(0, 0, R, a0, a0 + TAU, F ? stopsAt(a0) : null);
				if (F) for (let q = 0; q < F; q++) {
					const a = a0 + (q / F) * TAU, b = lastA + (q / F) * TAU;
					E.jk = lastK; E.begin(last * Math.cos(b), last * Math.sin(b), true);
					E.to(R * Math.cos(a), R * Math.sin(a));
					E.jk = f * P.nodeSize; E.end(true);
				}
				last = R; lastK = f * P.nodeSize; lastA = a0;
				R += P.spacing * (1 + (P.grow * (R + P.spacing)) / 0.2);
			}
			E.k = 1;
		},
	},
	sunburst: {
		label: 'Sunburst', own: true,
		params: [num('rays', 'Rays', 36, 4, 180), mm('inner', 'Starts at', 0.012, 0, 0.1), mm('length', 'Length', 0.12, 0.02, 0.4), pct('alternate', 'Every other ray', 0.6), pct('taper', 'Taper', 0.5, -1, 0.9), stoneRatio('nodeSize', 'Stone at the root', 1.4, 1, 4)],
		grips: [radius('inner', 'Starts at', { angle: Math.PI / 2 }), point((P) => [P.inner + P.length, 0], (P, x, y) => ({ length: Math.max(0.02, Math.hypot(x, y) - P.inner) }), 'Length')],
		make(P, E) {
			E.jk = P.nodeSize;
			for (let k = 0; k < P.rays; k++) {
				const a = (k / P.rays) * TAU, c = Math.cos(a), s = Math.sin(a), L = P.length * (k & 1 ? P.alternate : 1);
				E.cat = k & 1; E.t = 0; E.k = 1; E.unit = rankOf1(k);
				E.begin(P.inner * c, P.inner * s, true);
				E.t = 1; E.k = Math.max(0.15, 1 - P.taper);
				E.to((P.inner + L) * c, (P.inner + L) * s);
				E.end(false);
			}
			E.unit = -1; E.k = 1;
		},
	},
	mandala: {
		label: 'Rosette', own: true,
		params: [num('fold', 'Petals', 8, 3, 24), num('layers', 'Layers', 5, 1, 16), mm('spacing', 'Between layers', 0.016, 0.004, 0.06), pct('depth', 'Petal depth', 0.3, 0, 0.9), pct('grow', 'Grow outwards', 0.3, 0, 1.5), stoneRatio('nodeSize', 'Stones at the tips', 1.5, 1, 4), stoneRatio('centre', 'Stone in the middle', 2, 1, 5)],
		grips: [along('spacing', [1, 0], 'Between layers', (P) => P.layers)],
		make(P, E) {
			const F = P.fold;
			E.key(0, 0, 0, 0, P.centre, 0, 0);
			for (let l = 1; l <= P.layers; l++) {
				const R = l * P.spacing, ph = (l & 1 ? 0 : Math.PI / F), d = P.depth / Math.sqrt(l), kl = 1 + (P.grow * (l - 1)) / Math.max(1, P.layers - 1);
				E.cat = l % 16; E.t = l / P.layers; E.k = kl; E.jk = kl * P.nodeSize; E.jpri = l;
				const steps = Math.max(6, Math.ceil(E.stepsFor((TAU * R * 1.5) / F, 300) / 2));
				// from tip to tip of the petals: a stone on each tip, a whole number between
				for (let q = 0; q < F; q++) {
					const a0 = (q * TAU - ph) / F, a1 = ((q + 1) * TAU - ph) / F;
					E.begin(R * (1 + d) * Math.cos(a0), R * (1 + d) * Math.sin(a0), true);
					for (let i = 1; i <= steps; i++) {
						const a = a0 + ((a1 - a0) * i) / steps, r = R * (1 + d * Math.cos(F * a + ph));
						E.to(r * Math.cos(a), r * Math.sin(a));
					}
					E.end(true);
				}
			}
			E.k = 1; E.jpri = 0;
		},
	},
	rose: {
		label: 'Rose curve', own: true,
		params: [mm('radius', 'Size', 0.1, 0.02, 0.4), num('petalsN', 'Petals', 5, 1, 16), num('petalsD', 'Weave', 1, 1, 9), num('nested', 'Nested', 1, 1, 6), pct('swell', 'Bigger towards the tips', 0.5), stoneRatio('nodeSize', 'Stones at the tips', 1.5, 1, 4)],
		grips: [radius('radius', 'Size')],
		make(P, E) {
			const n = P.petalsN, d = P.petalsD, k = n / d, turns = (n * d) % 2 ? d : 2 * d, tips = Math.round(turns * k);
			E.key(0, 0, 0, 0, 1, 0, 0);
			for (let l = 0; l < P.nested; l++) {
				const A = P.radius * (1 - l / P.nested), scaleK = 1 - (l / P.nested) * 0.4, steps = Math.max(10, Math.ceil(E.stepsFor(2.4 * A, 200) / 2));
				E.cat = l; E.jk = P.nodeSize * scaleK;
				const kOf = (r) => scaleK * (1 - P.swell * 0.6 + P.swell * 0.9 * Math.abs(r / A));
				// from one tip through the middle to the next
				for (let q = 0; q < tips; q++) {
					const a0 = (q * Math.PI) / k, a1 = ((q + 1) * Math.PI) / k, r0 = A * Math.cos(k * a0);
					E.t = q / tips; E.k = kOf(r0);
					E.begin(r0 * Math.cos(a0), r0 * Math.sin(a0), true);
					for (let i = 1; i <= steps; i++) {
						const a = a0 + ((a1 - a0) * i) / steps, r = A * Math.cos(k * a);
						E.k = kOf(r);
						E.to(r * Math.cos(a), r * Math.sin(a));
					}
					E.end(true);
				}
			}
			E.k = 1;
		},
	},
	guilloche: {
		label: 'Guilloché', own: true,
		params: [mm('radius', 'Size', 0.1, 0.02, 0.4), num('petals', 'Waves', 7.25, 2, 30, 0.25), num('turnsOf', 'Passes', 4, 1, 16), pct('depth', 'Depth', 0.32, 0.02, 0.8), pct('swell', 'Bigger outwards', 0.3)],
		grips: [radius('radius', 'Size')],
		make(P, E) {
			const A = P.radius, d = P.depth, p = P.petals, T = TAU * P.turnsOf, len = A * T * (1 + d * p * 0.6), steps = E.stepsFor(len, 12000);
			const xy = (t) => [A * ((1 - d) * Math.cos(t) + d * Math.cos(p * t)), A * ((1 - d) * Math.sin(t) - d * Math.sin(p * t))], kOf = (x, y) => 1 - P.swell * 0.5 + P.swell * (Math.hypot(x, y) / A);
			E.k = kOf(A, 0);
			E.move(A, 0);
			for (let i = 1; i <= steps; i++) {
				const [x, y] = xy((i / steps) * T);
				E.t = i / steps; E.k = kOf(x, y);
				E.to(x, y);
			}
			E.k = 1;
		},
	},
	stringart: {
		label: 'String art', own: true,
		params: [mm('radius', 'Size', 0.1, 0.02, 0.4), num('nails', 'Nails', 60, 12, 200), num('times', 'Multiply by', 2, 2, 30, 0.5), stoneRatio('nodeSize', 'Stones at the nails', 1.3, 1, 4)],
		grips: [radius('radius', 'Size')],
		make(P, E) {
			const R = P.radius, N = P.nails, nail = (a) => [R * Math.cos(a), R * Math.sin(a)];
			E.jk = P.nodeSize;
			for (let i = 0; i < N; i++) {
				const a = (i / N) * TAU, [x, y] = nail(a);
				E.key(x, y, a + Math.PI / 2, i / N, P.nodeSize, i & 1, 0);
			}
			for (let i = 0; i < N; i++) {
				const [x0, y0] = nail((i / N) * TAU), [x1, y1] = nail(((i * P.times) / N) * TAU);
				E.cat = i & 1; E.t = i / N;
				E.seg(x0, y0, x1, y1);
			}
		},
	},
	whirl: {
		label: 'Whirl', own: true,
		params: [num('fold', 'Sides', 6, 3, 12), num('layers', 'Layers', 16, 2, 50), mm('radius', 'Size', 0.14, 0.02, 0.4), deg('whirl', 'Turn per layer', 6, -30, 30), pct('taper', 'Smaller inwards', 0.5, 0, 0.8), stoneRatio('nodeSize', 'Stones at the corners', 1.2, 1, 3)],
		grips: [radius('radius', 'Size')],
		make(P, E) {
			const F = P.fold, st = (P.whirl * Math.PI) / 180, corners = [];
			for (let l = 0; l < P.layers; l++) {
				const R = P.radius * (1 - l / P.layers), a0 = l * st, f = l / P.layers;
				E.cat = l % 2; E.t = f; E.k = 1 - P.taper * f; E.jk = E.k * P.nodeSize; E.jpri = Math.min(l, 60);
				corners.length = 0;
				for (let k = 0; k < F; k++) { const a = a0 + (k / F) * TAU; corners.push([R * Math.cos(a), R * Math.sin(a)]); }
				E.poly(corners, true, 0.2);
			}
			E.k = 1; E.jpri = 0;
		},
	},

	// --- spirals -----------------------------------------------------------------------------------
	phyllotaxis: {
		points: true,
		label: 'Phyllotaxis', own: true,
		params: [
			mm('spacing', 'Spacing', 0.006, 0.002, 0.03), num('divergence', 'Angle', GOLDEN, 90, 180, 0.01, 'deg'), { ...mm('extent', 'Size', 0.24, 0.02, 0.9, 0.0005), maxOf: reachOn },
			hidden('numbers', 'all'), num('grow', 'Grow outwards', 0, -0.7, 3, 0.05, 'x'),
		],
		grips: [radius('extent', 'Size'), along('spacing', [0, 1], 'Spacing', () => 10)],
		make(P, E) {
			const c = P.spacing, a = (P.divergence * Math.PI) / 180, Rm = Math.min(P.extent, E.box.r), count = Math.ceil((Rm / c) ** 2) + 2, keep = numberFilter(P.numbers, count);
			// a growing seed asks for more room: the next seed's distance follows the size at this one
			let R2 = c * c;
			for (let n = 1; n <= 200000; n++) {
				const R = Math.sqrt(R2);
				if (R > Rm) break;
				const f = R / P.extent, K = Math.max(0.25, 1 + P.grow * f), th = n * a;
				if (keep(n)) { if (n === 1) E.key(R * Math.cos(th), R * Math.sin(th), th, f, K, n % 13, 0); else E.add(R * Math.cos(th), R * Math.sin(th), rankOf1(n), th, f, K, n % 13); }
				R2 += c * c * K * K;
			}
		},
	},
	sacks: {
		points: true,
		label: 'Prime spiral', own: true,
		params: [mm('spacing', 'Spacing', 0.0035, 0.002, 0.03), { ...mm('extent', 'Size', 0.3, 0.02, 0.9, 0.0005), maxOf: reachOn }, hidden('numbers', 'prime'), when(stoneRatio('accent', 'Twin primes', 1.5, 1, 3), (P) => P.numbers === 'prime')],
		grips: [radius('extent', 'Size'), along('spacing', [0, 1], 'Spacing', () => 10)],
		make(P, E) {
			const c = P.spacing, Rm = Math.min(P.extent, E.box.r), count = Math.ceil((Rm / c) ** 2) + 2, keep = numberFilter(P.numbers, count), s = isPrimeTable(count + 2);
			for (let n = 1; n <= count; n++) {
				if (!keep(n)) continue;
				const R = c * Math.sqrt(n), th = TAU * Math.sqrt(n), twin = P.numbers === 'prime' && isTwin(s, n);
				if (twin && P.accent > 1) E.key(R * Math.cos(th), R * Math.sin(th), th, R / P.extent, P.accent, n % 6, 1);
				else E.add(R * Math.cos(th), R * Math.sin(th), rankOf1(n), th, R / P.extent, 1, n % 6);
			}
		},
	},
	ulam: {
		points: true,
		label: 'Ulam primes', own: true,
		params: [mm('spacing', 'Spacing', 0.0035, 0.002, 0.03), { ...mm('extent', 'Size', 0.3, 0.02, 0.9, 0.0005), maxOf: reachOn }, hidden('numbers', 'prime'), when(stoneRatio('accent', 'Twin primes', 1.5, 1, 3), (P) => P.numbers === 'prime')],
		grips: [along('extent', [1, 0], 'Size'), along('spacing', [0, 1], 'Spacing', () => 10)],
		make(P, E) {
			const c = P.spacing, Rm = Math.min(P.extent, E.box.r * 1.5), count = Math.ceil(((2 * Rm) / c) ** 2) + 2, keep = numberFilter(P.numbers, count), s = isPrimeTable(count + 2);
			let x = 0, y = 0, dx = 1, dy = 0, run = 1, left = 1, turns = 0;
			for (let n = 1; n <= count; n++) {
				if (keep(n) && Math.abs(x * c) <= P.extent && Math.abs(y * c) <= P.extent) {
					const twin = P.numbers === 'prime' && isTwin(s, n), t = Math.max(Math.abs(x), Math.abs(y)) * (c / P.extent);
					if (twin && P.accent > 1) E.key(x * c, y * c, 0, t, P.accent, n % 6, 1);
					else E.add(x * c, y * c, rankOf1(n), 0, t, 1, n % 6);
				}
				x += dx; y += dy;
				if (--left === 0) { [dx, dy] = [-dy, dx]; if (++turns % 2 === 0) run++; left = run; }
			}
		},
	},
	spiral: {
		label: 'Spiral arms', own: true,
		params: [mm('spacing', 'Between arms', 0.012, 0.003, 0.06), num('arms', 'Arms', 1, 1, 16), ratio('power', 'Opening', 1, 0.4, 2), pct('grow', 'Grow outwards', 0, 0, 3)],
		grips: [along('spacing', [1, 0], 'Between arms')],
		make(P, E) {
			const A = P.arms, r = E.box.r, w = P.spacing * A, pw = P.power;
			for (let k = 0; k < A; k++) {
				const a0 = (k / A) * TAU;
				E.cat = k; E.t = 0; E.k = 1;
				E.move(0, 0);
				// wind until the arm leaves the piece: r = w (th / tau)^power
				let thMax = TAU * Math.pow(r / w, 1 / pw);
				// opening ever slower (a Fermat spiral): it ends where its turns would touch
				if (pw < 1) thMax = Math.min(thMax, TAU * Math.pow((pw * w) / (A * E.pitch * 1.15), 1 / (1 - pw)));
				let th = 0.02;
				while (th < thMax) {
					const R = w * Math.pow(th / TAU, pw), dR = (pw * R) / th, step = Math.min(E.pitch / 2 / Math.max(Math.hypot(R, dR), 1e-4), 0.5);
					E.t = clamp01(R / 0.35); E.k = 1 + (P.grow * R) / 0.2;
					E.to(R * Math.cos(th + a0), R * Math.sin(th + a0));
					th += step;
				}
			}
			E.k = 1;
		},
	},
	nautilus: {
		label: 'Nautilus', own: true,
		params: [num('arms', 'Arms', 3, 1, 16), ratio('growth', 'Growth each turn', 1.8, 1.1, 4), mm('inner', 'Starts at', 0.004, 0.001, 0.05), pct('grow', 'Stones grow with it', 0.6, 0, 1.2)],
		grips: [radius('inner', 'Starts at')],
		make(P, E) {
			const b = Math.log(P.growth) / TAU, r = E.box.r, kOf = (R) => Math.pow(R / 0.1, P.grow);
			for (let k = 0; k < P.arms; k++) {
				const a0 = (k / P.arms) * TAU, thMax = Math.log(r / P.inner) / b;
				E.cat = k; E.k = kOf(P.inner);
				let th = 0;
				E.move(P.inner * Math.cos(a0), P.inner * Math.sin(a0));
				while (th < thMax) {
					const R = P.inner * Math.exp(b * th);
					E.t = clamp01(R / 0.35); E.k = kOf(R);
					E.to(R * Math.cos(th + a0), R * Math.sin(th + a0));
					th += Math.min((E.pitch * 0.5 * Math.max(E.k, 0.5)) / (R * Math.hypot(1, b)), 0.3);
				}
			}
			E.k = 1;
		},
	},
	galaxy: {
		label: 'Galaxy', own: true,
		dart: true, random: true,
		fine: (P) => SMALLEST_VARIED(P.variety), meanK: (P) => 1 + 0.25 * P.variety,
		params: [num('arms', 'Arms', 3, 1, 8), mm('radius', 'Size', 0.16, 0.03, 0.5), ratio('wind', 'Wind', 2.2, 0.2, 6, 0.05), pct('spread', 'Spread', 0.28, 0.02, 1), pct('heart', 'Bigger at the core', 0.5), pct('variety', 'Variety of sizes', 0.2)],
		grips: [radius('radius', 'Size')],
		make(P, E) {
			const seed = E.seed, N = Math.min(14000, Math.round(((P.radius / (E.pitch * E.fine)) ** 2) * 3)), v = P.variety;
			for (let i = 0; i < N; i++) {
				const f = Math.pow(hash2(i, 1, seed), 0.65), arm = Math.floor(hash2(i, 2, seed) * P.arms);
				const gauss = (hash2(i, 3, seed) + hash2(i, 4, seed) + hash2(i, 5, seed) - 1.5) * 1.2;
				const a = (arm / P.arms) * TAU + P.wind * Math.log(1 + f * 6) + gauss * P.spread * (1.2 - f * 0.6), R = f * P.radius, g = 1 - f;
				E.add(R * Math.cos(a), R * Math.sin(a), rankOf1(i), hash2(i, 6, seed) * TAU, f, varied(hash2(i, 7, seed), v) * (1 + P.heart * 2 * g * g * g), arm);
			}
		},
	},
	stardust: {
		label: 'Stardust', own: true,
		dart: true, random: true,
		fine: (P) => SMALLEST_VARIED(P.variety), meanK: (P) => 1 + 0.25 * P.variety,
		params: [mm('radius', 'Size', 0.16, 0.02, 0.5), ratio('falloff', 'Fall-off', 2.2, 0.5, 6, 0.05), pct('heart', 'Bigger in the middle', 0.4), pct('variety', 'Variety of sizes', 0.3)],
		grips: [radius('radius', 'Size')],
		make(P, E) {
			const seed = E.seed, v = P.variety;
			overTile(E.box, (E.d0 * E.gap * E.fine) / TILE_R, seed, (x, y, k, rank) => {
				const f = Math.hypot(x, y) / P.radius;
				if (f >= 1) return;
				const g = 1 - f;
				E.add(x, y, 1 - (1 - rank) * Math.pow(g, P.falloff), hash2(k, 8, seed) * TAU, f, varied(hash2(k, 7, seed), v) * (1 + P.heart * 2 * g * g));
			});
		},
	},
};
