// Unit motif outlines (about [-1, 1]) and tests against them: the shapes of the motif generator
// (stones/generators.js) and of the repeating-motif pattern (stones/layouts-lattice.js).
export function motifOutline(shape, points) {
	if (points?.length) return points;
	const out = [], N = 72;
	if (shape === 'star') {
		// five points, straight edges
		const corner = (k) => { const r = k % 2 ? 0.42 : 1, a = Math.PI / 2 + (k * Math.PI) / 5; return [r * Math.cos(a), r * Math.sin(a)]; };
		for (let k = 0; k < 10; k++) { const a = corner(k), b = corner(k + 1); for (let i = 0; i < 7; i++) out.push([a[0] + ((b[0] - a[0]) * i) / 7, a[1] + ((b[1] - a[1]) * i) / 7]); }
		return out;
	}
	for (let i = 0; i < N; i++) {
		const t = (i / N) * Math.PI * 2;
		switch (shape) {
			case 'circle': out.push([Math.cos(t), Math.sin(t)]); break;
			case 'diamond': out.push([Math.cos(t) * 0.7 * (Math.abs(Math.cos(t)) + Math.abs(Math.sin(t))) ** -1 * 1.4, Math.sin(t) * (Math.abs(Math.cos(t)) + Math.abs(Math.sin(t))) ** -1]); break;
			case 'flower': { const r = 0.6 + 0.4 * Math.cos(5 * t); out.push([r * Math.cos(t), r * Math.sin(t)]); break; }
			default: out.push([(16 * Math.sin(t) ** 3) / 17, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17]); // heart
		}
	}
	return out;
}
export function insidePoly(p, poly) {
	let inside = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const a = poly[i], b = poly[j];
		if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
	}
	return inside;
}
export function distPoly(p, poly) {
	let d = Infinity;
	for (let i = 0; i < poly.length; i++) {
		const a = poly[i], b = poly[(i + 1) % poly.length], bx = b[0] - a[0], by = b[1] - a[1], l2 = bx * bx + by * by;
		const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * bx + (p[1] - a[1]) * by) / l2)) : 0;
		d = Math.min(d, Math.hypot(p[0] - a[0] - bx * t, p[1] - a[1] - by * t));
	}
	return d;
}
