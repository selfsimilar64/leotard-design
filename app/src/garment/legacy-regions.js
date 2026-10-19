// Legacy garment regions from the POC (analytic fields on the reference body), kept so the
// POC's six looks still render for comparison. Designs made in the app use the curve graph
// instead (garment/arrangement.js). Same code as poc-threejs/src/body.js regions().
const abs = Math.abs, min = Math.min, max = Math.max, sq = Math.sqrt;
const clamp = (x, a, b) => min(max(x, a), b);
const mix = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------------------------------------
// Garment regions, evaluated on reference-body coordinates. Every field is "positive inside,
// roughly in metres".

const ellOut = (x, y, cx, cy, rx, ry) => (sq(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2) - 1) * min(rx, ry);
function segDist(x, y, a, b) {
	const bx = b[0] - a[0], by = b[1] - a[1], px = x - a[0], py = y - a[1];
	const t = clamp((px * bx + py * by) / (bx * bx + by * by), 0, 1);
	return Math.hypot(px - bx * t, py - by * t);
}

// Accent "swoosh": a tapering band around a cubic Bezier in the frontal plane, from the wearer's
// left shoulder down across the waist to the right hip.
const SW = [[0.105, 1.367], [0.15, 1.142], [-0.03, 1.042], [-0.18, 0.937]];
export function swooshPoint(t) {
	const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
	return [a * SW[0][0] + b * SW[1][0] + c * SW[2][0] + d * SW[3][0], a * SW[0][1] + b * SW[1][1] + c * SW[2][1] + d * SW[3][1]];
}
export const swooshHalfWidth = (t) => mix(0.04, 0.011, t);
const SW_TABLE = Array.from({ length: 65 }, (_, i) => swooshPoint(i / 64));
function accentField(x, y) {
	let best = 1e9, bi = 0;
	for (let i = 0; i < 64; i++) {
		const d = segDist(x, y, SW_TABLE[i], SW_TABLE[i + 1]);
		if (d < best) { best = d; bi = i; }
	}
	return swooshHalfWidth((bi + 0.5) / 64) - best;
}

// Front scoop: bottom at 1.282, about a third of the way from the neck base (1.352) to the bust
// line (1.168); the gymnastics code allows down to mid-sternum.
export const NECK_FRONT = { cx: 0, cy: 1.422, rx: 0.085, ry: 0.14 };
const NECK_TOP = 1.47; // no fabric above this (the neck itself is inside both scoops)

// style = { sleeves: 'long' | 'tank', back: 'scoop' | 'keyhole' | 'strappy' }
// v = { x, y, z (reference body), zr (z relative to the body's mid-plane at that height),
//       arm (> 0 on the arm side of the armhole seam), armT (0 shoulder .. 1 wrist), head }
// out = [cover, sleeveField, accentField]
export function regions(v, style, out) {
	const { x, y, zr, arm: a, armT } = v, ax = abs(x);
	const front = smoothstep(-0.03, 0.015, zr);

	const nf = ellOut(x, y, NECK_FRONT.cx, NECK_FRONT.cy, NECK_FRONT.rx, NECK_FRONT.ry);
	let nb;
	if (style.back === 'keyhole') {
		nb = min(ellOut(x, y, 0, 1.442, 0.066, 0.085), ellOut(x, y, 0, 1.232, 0.04, 0.075));
	} else if (style.back === 'strappy') {
		const open = min(ellOut(x, y, 0, 1.422, 0.085, 0.12), ellOut(x, y, 0, 1.187, 0.098, 0.15));
		const s1 = 0.0065 - segDist(x, y, [0.082, 1.357], [-0.09, 1.092]);
		const s2 = 0.0065 - segDist(x, y, [-0.082, 1.357], [0.09, 1.092]);
		nb = max(open, s1, s2);
	} else {
		nb = ellOut(x, y, 0, 1.422, 0.085, 0.21);
	}
	const fNeck = min(mix(nb, nf, front), NECK_TOP - y);

	// High-cut leg line: straight diagonal at the front rising to just under the hip bone at the
	// side, fuller curve over the seat at the back. Starts at the crotch (1.5 cm gusset margin).
	const yFront = 0.765 + 1.5 * max(ax - 0.03, 0);
	const yBack = 0.765 + 0.195 * Math.pow(min(ax / 0.16, 1.3), 2.3);
	// (the leg line only cuts the torso; without the arm guard it would also slice the forearms)
	const fLeg = mix((y - mix(yBack, yFront, smoothstep(-0.02, 0.035, zr))) * 0.6, 1, smoothstep(0, 0.02, a));

	const long = style.sleeves === 'long';
	// (edges() in stones.js inverts the cuff term to place its cuff rows; keep the two in step)
	const fArm = long ? mix(1, (0.95 - armT) * 0.5, smoothstep(0, 0.02, a)) : -a - 0.018;

	out[0] = v.head > 0.5 ? -1 : min(fNeck, fLeg, fArm);
	out[1] = long ? a : -1;
	out[2] = accentField(x, y);
	return out;
}

