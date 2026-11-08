// Folds where a fit leaves fabric smaller on the body than flat: the shader's aFold.xyz (materials/fabric.js), from the fit itself.
// Twin of folds_of in pipeline/wrap_block.py (which bakes them into a fitted file's cells): same constants, same steps. The app
// recomputes them after every re-fit (render/fitted.js show), so a pose, a body or the garment's size (meta.fitSize) moves them.
const FOLD_WAVELENGTH = 0.02; // wrap_block.FOLD_WAVELENGTH
const FOLD_MAX = 0.006;       // wrap_block.FOLD_MAX
const FOLD_SMOOTH = 12;       // wrap_block.FOLD_SMOOTH

// q: per cell point its position (xyz, metres); uv: per point its flat place (metres, at the pattern's size); tri: the cell's
// triangles. Returns per point [height * cos, height * sin, height] (twice the squeezed direction's angle on the flat piece).
export function foldsOf(q, uv, tri) {
	const m = uv.length / 2, total = new Float64Array(m * 3), weight = new Float64Array(m);
	for (let t = 0; t < tri.length; t += 3) {
		const a = tri[t], b = tri[t + 1], c = tri[t + 2];
		const d00 = uv[2 * b] - uv[2 * a], d10 = uv[2 * b + 1] - uv[2 * a + 1], d01 = uv[2 * c] - uv[2 * a], d11 = uv[2 * c + 1] - uv[2 * a + 1];
		const det = d00 * d11 - d01 * d10;
		if (Math.abs(det) <= 1e-9) continue;
		const i00 = d11 / det, i01 = -d01 / det, i10 = -d10 / det, i11 = d00 / det; // inv(Dm)
		let uu = 0, vv = 0, cr = 0;
		for (let k = 0; k < 3; k++) {
			const e1 = q[3 * b + k] - q[3 * a + k], e2 = q[3 * c + k] - q[3 * a + k];
			const f0 = e1 * i00 + e2 * i10, f1 = e1 * i01 + e2 * i11; // F = Ds inv(Dm), row k
			uu += f0 * f0; vv += f1 * f1; cr += f0 * f1;
		}
		const least = Math.sqrt(Math.max((uu + vv) / 2 - Math.hypot((uu - vv) / 2, cr), 1e-6));
		const h = Math.min(FOLD_WAVELENGTH / Math.PI * Math.sqrt(Math.max(1 / least - 1, 0)), FOLD_MAX);
		const ang = Math.atan2(cr, (uu - vv) / 2) + Math.PI, area = Math.abs(det) / 2;
		const vx = h * Math.cos(ang) * area, vy = h * Math.sin(ang) * area, vz = h * area;
		for (const p of [a, b, c]) { total[3 * p] += vx; total[3 * p + 1] += vy; total[3 * p + 2] += vz; weight[p] += area; }
	}
	let folds = new Float64Array(m * 3);
	for (let p = 0; p < m; p++) for (let k = 0; k < 3; k++) folds[3 * p + k] = total[3 * p + k] / Math.max(weight[p], 1e-12);
	// edges as wrap_block lists them: each triangle's three, so an inner edge counts twice, as there
	const count = new Float64Array(m);
	for (let t = 0; t < tri.length; t += 3) for (let k = 0; k < 3; k++) { count[tri[t + k]]++; count[tri[t + (k + 1) % 3]]++; }
	for (let p = 0; p < m; p++) count[p] = Math.max(count[p], 1);
	for (let s = 0; s < FOLD_SMOOTH; s++) {
		const around = new Float64Array(m * 3);
		for (let t = 0; t < tri.length; t += 3) for (let k = 0; k < 3; k++) {
			const i = tri[t + k], j = tri[t + (k + 1) % 3];
			for (let d = 0; d < 3; d++) { around[3 * i + d] += folds[3 * j + d]; around[3 * j + d] += folds[3 * i + d]; }
		}
		const next = new Float64Array(m * 3);
		for (let p = 0; p < m; p++) for (let d = 0; d < 3; d++) next[3 * p + d] = 0.5 * folds[3 * p + d] + 0.5 * around[3 * p + d] / count[p];
		folds = next;
	}
	const out = new Float32Array(m * 3);
	for (let p = 0; p < m; p++) { out[3 * p] = folds[3 * p]; out[3 * p + 1] = folds[3 * p + 1]; out[3 * p + 2] = Math.hypot(folds[3 * p], folds[3 * p + 1]); }
	return out;
}
