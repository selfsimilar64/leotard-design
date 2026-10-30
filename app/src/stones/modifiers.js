// A pattern's modifiers: what changes its crystals' density, size or colour from place to place. Each is
// { id, on: density | size | colour, shape, ... }: a field over the piece (or over the pattern itself)
// giving a stone a value t in 0..1, and what t does to the crystal. They stack: several can act on the
// same thing, each on what the ones before it left. A modifier lies in the pattern's frame (the place on
// the piece that moving, turning and scaling the whole pattern changes), so it goes where the pattern goes.
//   x, y      its middle, in the frame (metres before the frame's scale)
//   a         which way it runs (degrees, in the frame)
//   w, h      its size: along and across (a box's whole length and width; a round shape's two radii;
//             the period of a repeating shape)
//   from, to  density (0..1) or size (a factor of the crystal's size) at t = 0 and t = 1
//   stops     colour: stone names along t; null keeps what the stone already has
//   power     how t falls off; reverse: t runs the other way
//   clip      nothing outside its bounds: no stones for density, no change for size and colour
//   feather   a density's bounds fade over this distance
//   blend     mul | add: how it joins the ones before it on the same thing
//   mix       colour: how far neighbouring stops mingle, 0 (hard lines) to 1
//   off       switched off for now; preset: came with the preset, and goes when the preset changes
// Spec: knowledge/engineering/architecture/procedural-stone-patterns.md.
import { TAU, frac, fbm } from './fields.js';

export const MOD_TARGETS = {
	density: { label: 'Density', hint: 'How many crystals: thin them out from place to place' },
	size: { label: 'Size', hint: 'How big the crystals are, from place to place' },
	colour: { label: 'Colour', hint: 'Which crystal goes where' },
};
export const MOD_TARGET_KINDS = Object.keys(MOD_TARGETS);

// class: what its handles are and which sizes it has. box: a length and a width; round: two radii;
// ring: one radius; period: a repeat length; follow: not a place on the piece at all.
export const MOD_SHAPES = {
	linear: { label: 'Linear', cls: 'box', bounds: true, hint: 'From one end of its box to the other' },
	reflected: { label: 'Reflected', cls: 'box', bounds: true, hint: 'From the middle of its box out to both ends' },
	radial: { label: 'Radial', cls: 'ring', bounds: true, hint: 'From its middle out to its circle' },
	oval: { label: 'Oval', cls: 'round', bounds: true, hint: 'From its middle out to its oval' },
	diamond: { label: 'Diamond', cls: 'round', bounds: true, hint: 'From its middle out to its diamond' },
	square: { label: 'Square', cls: 'round', bounds: true, hint: 'From its middle out to its rectangle' },
	sweep: { label: 'Sweep', cls: 'dial', bounds: true, hint: 'Round its middle, starting at its handle' },
	spiral: { label: 'Spiral', cls: 'period', hint: 'Sweeping round its middle and winding outwards' },
	waves: { label: 'Waves', cls: 'period', hint: 'Soft bands across the piece' },
	ripple: { label: 'Ripple', cls: 'period', turnless: true, hint: 'Soft rings round its middle' },
	stripes: { label: 'Stripes', cls: 'period', hint: 'Hard bands' },
	checks: { label: 'Checks', cls: 'period', hint: 'Hard squares' },
	clouds: { label: 'Clouds', cls: 'period', hint: 'Soft random patches' },
	edge: { label: 'From the edge', cls: 'edge', hint: 'From the edge of the piece inwards' },
	along: { label: 'Along the pattern', cls: 'follow', hint: "Follows the pattern's own order: out along a spiral, ring by ring" },
	family: { label: 'By family', cls: 'follow', hint: "Each of the pattern's families in turn: rings, arms, the squares of a check" },
	random: { label: 'At random', cls: 'follow', hint: 'Each crystal by chance' },
	bysize: { label: 'By crystal size', cls: 'follow', hint: "Follows the sizes the pattern itself gives its crystals" },
};
export const SPATIAL_SHAPES = Object.keys(MOD_SHAPES).filter((k) => MOD_SHAPES[k].cls !== 'follow');
export const isSpatial = (shape) => MOD_SHAPES[shape]?.cls !== 'follow';

const inFrame = (piece, S) => {
	const W = (piece?.x1 ?? 0.2) - (piece?.x0 ?? -0.2), H = (piece?.y1 ?? 0.3) - (piece?.y0 ?? -0.3);
	return { W: W / S, H: H / S, m: Math.min(W, H) / S };
};
// What a new modifier of this shape starts as, for a piece and a frame's scale S. Round shapes reach most of
// the way across the piece, box shapes cover it from top to bottom.
export function modGeometry(shape, piece, S = 1) {
	const { W, H, m } = inFrame(piece, S);
	switch (shape) {
		case 'linear': return { x: 0, y: 0, a: -90, w: H, h: W };
		case 'reflected': return { x: 0, y: 0, a: -90, w: H, h: W };
		case 'radial': case 'sweep': return { x: 0, y: 0, a: -90, w: m * 0.48, h: m * 0.48 };
		case 'oval': return { x: 0, y: 0, a: -90, w: m * 0.62, h: m * 0.36 };
		case 'diamond': case 'square': return { x: 0, y: 0, a: 0, w: m * 0.48, h: m * 0.48 };
		case 'spiral': return { x: 0, y: 0, a: -90, w: 0.09 / S, h: 0.09 / S };
		case 'waves': case 'stripes': return { x: 0, y: 0, a: -90, w: 0.06 / S, h: 0.06 / S };
		case 'ripple': return { x: 0, y: 0, a: -90, w: 0.05 / S, h: 0.05 / S };
		case 'checks': return { x: 0, y: 0, a: 0, w: 0.04 / S, h: 0.04 / S };
		case 'clouds': return { x: 0, y: 0, a: 0, w: 0.08 / S, h: 0.08 / S };
		case 'edge': return { x: 0, y: 0, a: 0, w: m * 0.2, h: m * 0.2 };
		default: return { x: 0, y: 0, a: 0, w: 0.1, h: 0.1 };
	}
}
// A new modifier: on what, which shape; the rest is what it starts as, or its geometry fills in as needed.
export function newModifier(on, shape = 'linear', more = {}, id = null) {
	const base = { id: id ?? 'm' + Math.floor(Math.random() * 1e7), on, shape };
	if (on === 'density') { base.from = 1; base.to = 0; if (MOD_SHAPES[shape]?.bounds) base.clip = true; }
	if (on === 'size') { base.from = 1; base.to = 0.5; }
	if (on === 'colour') { base.stops = [null, 'Sapphire']; }
	return { ...base, ...more };
}
// What a modifier has not been given starts as it would on this piece at the pattern's first scale; from there
// it scales with the pattern.
export function modWithGeometry(m, piece) {
	return isSpatial(m.shape) ? { ...modGeometry(m.shape, piece), ...m } : m;
}
// The next free id of a list.
export function nextModId(mods = []) {
	let n = 1;
	while (mods.some((m) => m.id === 'm' + n)) n++;
	return 'm' + n;
}
// A preset's modifiers as a group's own: its shapes, with their starting places left to the piece.
export function presetMods(item, others = []) {
	const out = [];
	for (const m of item.mods ?? []) out.push(newModifier(m.on, m.shape, { ...m, preset: true }, nextModId([...others, ...out])));
	return out;
}

// Each stone's place and what it is, while the fields are asked: the fields read these.
let U = 0, V = 0, LX = 0, LY = 0, AT = 0, CAT = 0, KK = 1, H = 0, IN = Infinity;

function fieldOf(m, edgeAt) {
	const a = ((m.a ?? 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), ox = m.x ?? 0, oy = m.y ?? 0, w = Math.max(m.w ?? 0.1, 1e-4), h = Math.max(m.h ?? m.w ?? 0.1, 1e-4), hw = w / 2, hh = h / 2, least = Math.min(w, h), seed = m.seed ?? 0;
	switch (m.shape) {
		case 'linear': return () => { const dx = LX - ox, dy = LY - oy, ax = dx * c + dy * s, ay = dy * c - dx * s; IN = Math.min(hw - Math.abs(ax), hh - Math.abs(ay)); return ax / w + 0.5; };
		case 'reflected': return () => { const dx = LX - ox, dy = LY - oy, ax = dx * c + dy * s, ay = dy * c - dx * s; IN = Math.min(hw - Math.abs(ax), hh - Math.abs(ay)); return Math.abs(ax) / hw; };
		case 'radial': return () => { const r = Math.hypot(LX - ox, LY - oy); IN = w - r; return r / w; };
		case 'oval': return () => { const dx = LX - ox, dy = LY - oy, t = Math.hypot((dx * c + dy * s) / w, (dy * c - dx * s) / h); IN = (1 - t) * least; return t; };
		case 'diamond': return () => { const dx = LX - ox, dy = LY - oy, t = Math.abs(dx * c + dy * s) / w + Math.abs(dy * c - dx * s) / h; IN = (1 - t) * least; return t; };
		case 'square': return () => { const dx = LX - ox, dy = LY - oy, ax = Math.abs(dx * c + dy * s) / w, ay = Math.abs(dy * c - dx * s) / h, t = ax > ay ? ax : ay; IN = (1 - t) * least; return t; };
		case 'sweep': return () => { const dx = LX - ox, dy = LY - oy; IN = w - Math.hypot(dx, dy); return frac(Math.atan2(dy * c - dx * s, dx * c + dy * s) / TAU); };
		case 'spiral': return () => { const dx = LX - ox, dy = LY - oy; IN = Infinity; return 0.5 + 0.5 * Math.cos(Math.atan2(dy * c - dx * s, dx * c + dy * s) + (TAU * Math.hypot(dx, dy)) / w); };
		case 'waves': return () => { IN = Infinity; return 0.5 - 0.5 * Math.cos((TAU * ((LX - ox) * c + (LY - oy) * s)) / w); };
		case 'ripple': return () => { IN = Infinity; return 0.5 - 0.5 * Math.cos((TAU * Math.hypot(LX - ox, LY - oy)) / w); };
		case 'stripes': return () => { IN = Infinity; return frac(((LX - ox) * c + (LY - oy) * s) / w) < 0.5 ? 0 : 1; };
		case 'checks': return () => { const dx = LX - ox, dy = LY - oy; IN = Infinity; return (Math.floor((dx * c + dy * s) / w) + Math.floor((dy * c - dx * s) / w)) & 1; };
		case 'clouds': return () => { const dx = LX - ox, dy = LY - oy; IN = Infinity; return 0.5 + 0.9 * fbm((dx * c + dy * s) / w, (dy * c - dx * s) / w, seed, 3); };
		case 'edge': return () => { const e = edgeAt ? edgeAt(U, V) : 0; IN = w - e; return e / w; };
		case 'along': return () => { IN = Infinity; return AT; };
		case 'family': return () => { IN = Infinity; return CAT & 1; };
		case 'random': return () => { IN = Infinity; return H; };
		case 'bysize': return () => { IN = Infinity; return 0.5 + Math.log2(KK) / 2; };
		default: return () => { IN = Infinity; return 0; };
	}
}
// How far a point of the flat cloth lies inside a modifier's bounds (metres on the cloth, below 0 outside):
// what its handles draw as its outline.
export function modBounds(m, frame, edgeAt) {
	const f = fieldOf(m, edgeAt), { x, y, c, s, S, F } = frame;
	return (u, v) => { U = u; V = v; const du = u - x, dv = v - y; LX = ((c * du + s * dv) / S) * F; LY = (c * dv - s * du) / S; f(); return IN === Infinity ? 1 : IN * S; };
}
// t in 0..1 after its fall-off and direction
const curve = (t, pw, rev) => {
	t = t < 0 ? 0 : t > 1 ? 1 : t;
	if (pw !== 1) t = Math.pow(t, pw);
	return rev ? 1 - t : t;
};

// The frame a pattern's modifiers lie in, as flat cloth seen from them: frame { x, y, c, s, S, F }.
// mods: the group's. -> { density, size, colour }: each (u, v, k, t, cat, rank) -> its answer, or null when
// nothing acts on that. baseStone: the crystal's colour.
export function compileMods(mods, frame, edgeAt, baseStone) {
	const dens = [], siz = [], col = [];
	let spatial = false;
	for (const m of mods ?? []) {
		if (m.off) continue;
		const rec = {
			f: fieldOf(m, edgeAt), clip: !!m.clip, pw: m.power ?? 1, rev: !!m.reverse, from: m.from ?? 1, to: m.to ?? (m.on === 'density' ? 0 : 1), add: m.blend === 'add',
			feather: Math.max(m.feather ?? 0, 0), stops: m.stops, mix: m.mix ?? 1, follow: m.shape,
		};
		if (isSpatial(m.shape)) spatial = true;
		(m.on === 'density' ? dens : m.on === 'size' ? siz : col).push(rec);
	}
	const { x: fx, y: fy, c: fc, s: fs, S: fS, F: fF } = frame ?? { x: 0, y: 0, c: 1, s: 0, S: 1, F: 1 };
	const at = (u, v, k, t, cat, rank) => {
		U = u; V = v; AT = t; CAT = cat; KK = k; H = frac(rank * 61.803398875 + 0.137);
		if (spatial) { const du = u - fx, dv = v - fy; LX = ((fc * du + fs * dv) / fS) * fF; LY = (fc * dv - fs * du) / fS; }
	};
	return {
		density: !dens.length ? null : (u, v, k, t, cat, rank) => {
			at(u, v, k, t, cat, rank);
			let d = 1;
			for (let i = 0; i < dens.length; i++) {
				const r = dens[i], f = r.f();
				let val = 0;
				if (!r.clip || IN >= 0) {
					const q = curve(f, r.pw, r.rev);
					val = r.from + (r.to - r.from) * q;
					if (r.clip && r.feather > 0 && IN < r.feather) val *= IN / r.feather;
				}
				d = i === 0 ? val : r.add ? (d + val > 1 ? 1 : d + val) : d * val;
			}
			return d;
		},
		size: !siz.length ? null : (u, v, k, t, cat, rank) => {
			at(u, v, k, t, cat, rank);
			let g = 1;
			for (let i = 0; i < siz.length; i++) {
				const r = siz[i], f = r.f();
				if (r.clip && IN < 0) continue;
				const q = curve(f, r.pw, r.rev), val = r.from + (r.to - r.from) * q;
				g = i === 0 ? val : r.add ? g + val - 1 : g * val;
			}
			return g > 0.05 ? g : 0.05;
		},
		colour: !col.length ? null : (u, v, k, t, cat, rank) => {
			at(u, v, k, t, cat, rank);
			let stone = baseStone;
			for (let i = 0; i < col.length; i++) {
				const r = col[i], n = r.stops?.length ?? 0;
				if (!n) continue;
				const f = r.f();
				if (r.clip && IN < 0) continue;
				let idx;
				if (r.follow === 'family') idx = cat % n;
				else if (r.follow === 'random') idx = Math.floor(H * n);
				else {
					const q = curve(f, r.pw, r.rev), w = q * (n - 1) + (H - 0.5) * r.mix;
					idx = w < 0 ? 0 : w >= n - 1 ? n - 1 : Math.round(w);
				}
				const pick = r.stops[idx];
				if (pick) stone = pick;
			}
			return stone;
		},
	};
}

// The size factors modifiers can reach: the smallest and the largest (for how fine a scatter must draw).
export function sizeRange(mods) {
	let lo = 1, hi = 1;
	for (const m of mods ?? []) {
		if (m.off || m.on !== 'size') continue;
		const a = m.from ?? 1, b = m.to ?? 1, mn = Math.min(a, b, m.clip ? 1 : Infinity), mx = Math.max(a, b, m.clip ? 1 : 0);
		if (m.blend === 'add') { lo += mn - 1; hi += mx - 1; } else { lo *= mn; hi *= mx; }
	}
	return [Math.max(lo, 0.05), hi];
}

// Old records: a pattern's one gradient, its size and colour along it, as modifiers. ga, gb were two points on
// the cloth; local(u, v) brings a point into the frame.
export function modsFromOld(P, gen, local, sizeOf) {
	const mods = [], g = P.gradient === 'angular' ? 'sweep' : P.gradient;
	let geo = null;
	if (g && g !== 'none' && MOD_SHAPES[g] && P.ga && P.gb) {
		const [ax, ay] = local(P.ga[0], P.ga[1]), [bx, by] = local(P.gb[0], P.gb[1]), L = Math.hypot(bx - ax, by - ay) || 0.05, a = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
		geo = MOD_SHAPES[g].cls === 'box' ? { x: (ax + bx) / 2, y: (ay + by) / 2, a, w: L, h: 4 } : { x: ax, y: ay, a, w: L, h: g === 'oval' ? L / 2.2 : L };
		if (g === 'reflected') { geo.x = ax; geo.y = ay; geo.w = 2 * L; }
	}
	const common = { ...(geo ?? {}), power: P.gpower ?? 1, reverse: !!P.greverse, seed: P.gseed ?? 0 };
	if (geo && (P.densityFrom !== undefined || P.densityTo !== undefined) && !(P.densityFrom === 1 && P.densityTo === 1)) mods.push({ id: 'm1', on: 'density', shape: g, from: P.densityFrom ?? 1, to: P.densityTo ?? 1, ...common });
	if (P.sizeTo) {
		const factor = sizeOf(P.sizeTo) / sizeOf(P.size ?? 'ss12');
		if (P.sizeBy === 'along' || !geo) mods.push({ id: 'm2', on: 'size', shape: 'along', from: 1, to: factor });
		else mods.push({ id: 'm2', on: 'size', shape: g, from: 1, to: factor, ...common });
	}
	if (gen?.colourRamp?.length > 1) {
		const by = P.colourBy ?? 'gradient';
		if (by === 'family') mods.push({ id: 'm3', on: 'colour', shape: 'family', stops: gen.colourRamp });
		else if (by === 'along' || !geo) mods.push({ id: 'm3', on: 'colour', shape: 'along', stops: gen.colourRamp });
		else mods.push({ id: 'm3', on: 'colour', shape: g, stops: gen.colourRamp, ...common });
	}
	return mods;
}
