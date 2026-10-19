// Camera solve for a reference photo: from pins (image pixel <-> 3D point on the body) to a
// pinhole camera (focal length, rotation, position) by Levenberg-Marquardt on the reprojection
// error, with the principal point at the centre of the photo's crop, square pixels, and an
// optional body-proportion correction: the body scaled about the pins' centre by sh across
// (x and z) and sv up (y), pulled towards 1, which absorbs a photographed body that is a little
// slimmer, broader or longer than the mannequin. Several starting directions are tried and the best kept.
// Spec: roadmap P6 (knowledge/product/roadmap/moodboard-coverage-roadmap.md).
import * as THREE from 'three';

// pins: [{ X: [x, y, z] (world metres), u: [px, py] (image pixels, y down) }]
// crop: [x0, y0, x1, y1] the part of the image this view occupies (default: all of it)
// -> camera { position, quaternion, f, fov, size, crop, scale: [sh, sv], pivot, error, errors }
export function solveCamera(pins, size, { fovGuess = 28, crop = null, fitScale = true } = {}) {
	if (pins.length < 4) throw new Error('Pin at least 4 landmarks to solve the camera (6-8 is better)');
	const cr = crop ?? [0, 0, size[0], size[1]];
	const W = cr[2] - cr[0], H = cr[3] - cr[1], cx = (cr[0] + cr[2]) / 2, cy = (cr[1] + cr[3]) / 2;
	const X = pins.map((p) => new THREE.Vector3(...p.X)), U = pins.map((p) => p.u);
	const c3 = X.reduce((a, v) => a.add(v), new THREE.Vector3()).divideScalar(X.length);
	const spread3 = Math.sqrt(X.reduce((a, v) => a + v.distanceToSquared(c3), 0) / X.length);
	const cu = U.reduce((a, u) => [a[0] + u[0] / U.length, a[1] + u[1] / U.length], [0, 0]);
	const spread2 = Math.sqrt(U.reduce((a, u) => a + (u[0] - cu[0]) ** 2 + (u[1] - cu[1]) ** 2, 0) / U.length) || 1;
	const f0 = H / 2 / Math.tan(THREE.MathUtils.degToRad(fovGuess) / 2);
	const dist0 = (f0 * spread3) / spread2;
	const useScale = fitScale && pins.length >= 5;
	const PRIOR = 25; // px of residual per unit of log-scale: a 10% scale change costs ~2.4 px
	// a weak pull towards a usual lens: pins on one side of a body are nearly flat, which leaves the
	// focal length free to run off to an orthographic camera kilometres away
	const PRIOR_F = 4;

	// params: [log f, rx, ry, rz (camera-to-world axis-angle), px, py, pz (camera position), log sh, log sv]
	const m = 2 * X.length + (useScale ? 2 : 0) + 1;
	const residuals = (q, out) => {
		const f = Math.exp(q[0]), rot = rotOf(q), pos = new THREE.Vector3(q[4], q[5], q[6]);
		const sh = useScale ? Math.exp(q[7]) : 1, sv = useScale ? Math.exp(q[8]) : 1;
		const Rt = rot.clone().transpose(); // world -> camera
		for (let i = 0; i < X.length; i++) {
			const w = X[i].clone().sub(c3).multiply(new THREE.Vector3(sh, sv, sh)).add(c3);
			const v = w.sub(pos).applyMatrix3(Rt);
			const z = Math.min(v.z, -1e-3); // in front of the camera (looking down -z)
			out[2 * i] = cx + (f * v.x) / -z - U[i][0];
			out[2 * i + 1] = cy - (f * v.y) / -z - U[i][1];
		}
		if (useScale) { out[2 * X.length] = PRIOR * q[7]; out[2 * X.length + 1] = PRIOR * q[8]; }
		out[m - 1] = PRIOR_F * (q[0] - Math.log(f0));
		return out;
	};
	let best = null;
	for (let k = 0; k < 8; k++) {
		const a = (k / 8) * Math.PI * 2, dir = new THREE.Vector3(Math.sin(a), 0.05, Math.cos(a)).normalize();
		const pos = c3.clone().addScaledVector(dir, dist0);
		const mm = new THREE.Matrix4().lookAt(pos, c3, new THREE.Vector3(0, 1, 0));
		const aa = axisAngle(new THREE.Matrix3().setFromMatrix4(mm));
		const q0 = [Math.log(f0), aa.x, aa.y, aa.z, pos.x, pos.y, pos.z, ...(useScale ? [0, 0] : [])];
		const r = lm(residuals, q0, m, 300);
		if (!best || r.cost < best.cost) best = r;
	}
	const q = best.q, f = Math.exp(q[0]);
	const rot = rotOf(q), quat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().setFromMatrix3(rot));
	const res = residuals(q, new Float64Array(m));
	const errors = pins.map((_, i) => Math.hypot(res[2 * i], res[2 * i + 1]));
	// what the camera cannot explain (a body shaped differently from the mannequin) is taken up by
	// a thin-plate spline from photo pixels to where the model projects: exact at the pins
	const warp = pins.length >= 4 ? fitWarp(U, U.map((u, i) => [res[2 * i], res[2 * i + 1]])) : null;
	return {
		position: [q[4], q[5], q[6]], quaternion: quat.toArray(), f,
		fov: THREE.MathUtils.radToDeg(2 * Math.atan(H / 2 / f)), size: [W, H], crop: cr,
		scale: useScale ? [Math.exp(q[7]), Math.exp(q[8])] : [1, 1], pivot: c3.toArray(), warp,
		error: Math.sqrt(errors.reduce((a, e) => a + e * e, 0) / errors.length), errors,
	};
}

// Thin-plate spline in image space: src points and the displacement to add at each.
// -> { src, w: [[wx, wy] per point], a: [[ax, ay] x 3] }
export function fitWarp(src, disp) {
	const n = src.length, N = n + 3;
	const U = (r2) => (r2 < 1e-12 ? 0 : r2 * Math.log(Math.sqrt(r2)));
	const A = Array.from({ length: N }, () => new Float64Array(N));
	for (let i = 0; i < n; i++) {
		for (let j = 0; j < n; j++) A[i][j] = U((src[i][0] - src[j][0]) ** 2 + (src[i][1] - src[j][1]) ** 2);
		A[i][i] += 1e-3; // a touch of smoothing: pins are not exact
		A[i][n] = A[n][i] = 1; A[i][n + 1] = A[n + 1][i] = src[i][0]; A[i][n + 2] = A[n + 2][i] = src[i][1];
	}
	const sol = [0, 1].map((c) => gauss(A.map((r) => Array.from(r)), [...disp.map((d) => d[c]), 0, 0, 0]));
	if (!sol[0] || !sol[1]) return null;
	return { src: src.map((s) => [...s]), w: src.map((_, i) => [sol[0][i], sol[1][i]]), a: [0, 1, 2].map((k) => [sol[0][n + k], sol[1][n + k]]) };
}
export function applyWarp(warp, px) {
	if (!warp) return px;
	let dx = warp.a[0][0] + warp.a[1][0] * px[0] + warp.a[2][0] * px[1], dy = warp.a[0][1] + warp.a[1][1] * px[0] + warp.a[2][1] * px[1];
	warp.src.forEach((s, i) => {
		const r2 = (px[0] - s[0]) ** 2 + (px[1] - s[1]) ** 2, u = r2 < 1e-12 ? 0 : r2 * Math.log(Math.sqrt(r2));
		dx += warp.w[i][0] * u; dy += warp.w[i][1] * u;
	});
	return [px[0] + dx, px[1] + dy];
}
function gauss(M, b) {
	const n = b.length;
	for (let i = 0; i < n; i++) M[i].push(b[i]);
	for (let c = 0; c < n; c++) {
		let p = c;
		for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
		if (Math.abs(M[p][c]) < 1e-14) return null;
		[M[c], M[p]] = [M[p], M[c]];
		for (let r = 0; r < n; r++) { if (r === c) continue; const k = M[r][c] / M[c][c]; for (let k2 = c; k2 <= n; k2++) M[r][k2] -= k * M[c][k2]; }
	}
	return M.map((row, i) => row[n] / row[i]);
}

const scaleOf = (cam) => new THREE.Vector3(cam.scale?.[0] ?? 1, cam.scale?.[1] ?? 1, cam.scale?.[0] ?? 1);
const pivotOf = (cam) => new THREE.Vector3(...(cam.pivot ?? [0, 0, 0]));
const rotMat = (cam) => new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion(...cam.quaternion)));
const centre = (cam) => { const c = cam.crop ?? [0, 0, cam.size[0], cam.size[1]]; return [(c[0] + c[2]) / 2, (c[1] + c[3]) / 2]; };

// Project a world point (on the body as modelled) with a solved camera -> [px, py] (image pixels).
export function projectWith(cam, p) {
	const S = scaleOf(cam), C = pivotOf(cam), [cx, cy] = centre(cam);
	const w = new THREE.Vector3(...p).sub(C).multiply(S).add(C);
	const v = w.sub(new THREE.Vector3(...cam.position)).applyMatrix3(rotMat(cam).transpose());
	return [cx + (cam.f * v.x) / -v.z, cy - (cam.f * v.y) / -v.z];
}

// Ray through an image pixel, expressed in the body's own (unscaled) space, for picking the body.
// The photo's warp (if solved) first moves the pixel to where the mannequin shows that spot.
export function rayThrough(cam, px0, { warp = true } = {}) {
	const px = warp ? applyWarp(cam.warp, px0) : px0;
	const [cx, cy] = centre(cam), S = scaleOf(cam), C = pivotOf(cam);
	const d = new THREE.Vector3((px[0] - cx) / cam.f, -(px[1] - cy) / cam.f, -1).applyMatrix3(rotMat(cam));
	// undo the body-proportion scaling: x' = (x - C) / S + C
	const o = new THREE.Vector3(...cam.position).sub(C).divide(S).add(C);
	return new THREE.Ray(o, d.divide(S).normalize());
}

function rotOf(q) {
	const v = new THREE.Vector3(q[1], q[2], q[3]), a = v.length();
	const m = new THREE.Matrix4();
	if (a > 1e-12) m.makeRotationAxis(v.clone().divideScalar(a), a);
	return new THREE.Matrix3().setFromMatrix4(m);
}
function axisAngle(m3) {
	const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().setFromMatrix3(m3));
	const a = 2 * Math.acos(Math.min(1, Math.max(-1, q.w))), s = Math.sqrt(Math.max(1 - q.w * q.w, 0));
	return s < 1e-9 ? new THREE.Vector3() : new THREE.Vector3(q.x / s, q.y / s, q.z / s).multiplyScalar(a);
}

// Levenberg-Marquardt with a forward-difference Jacobian.
function lm(fn, q0, m, iters) {
	const n = q0.length;
	let q = Float64Array.from(q0), r = fn(q, new Float64Array(m)), cost = dot(r, r), lambda = 1e-2;
	const J = new Float64Array(m * n), r2 = new Float64Array(m);
	for (let it = 0; it < iters; it++) {
		for (let j = 0; j < n; j++) {
			const h = j === 0 || j > 6 ? 1e-5 : j < 4 ? 1e-6 : 1e-6 * Math.max(1, Math.abs(q[j]));
			const qq = Float64Array.from(q); qq[j] += h;
			fn(qq, r2);
			for (let i = 0; i < m; i++) J[i * n + j] = (r2[i] - r[i]) / h;
		}
		const A = new Float64Array(n * n), g = new Float64Array(n);
		for (let i = 0; i < m; i++) for (let a = 0; a < n; a++) { g[a] += J[i * n + a] * r[i]; for (let b = 0; b < n; b++) A[a * n + b] += J[i * n + a] * J[i * n + b]; }
		let improved = false;
		for (let tries = 0; tries < 10; tries++) {
			const M = Float64Array.from(A);
			for (let a = 0; a < n; a++) M[a * n + a] *= 1 + lambda;
			const step = solve(M, g.map((x) => -x), n);
			if (!step) { lambda *= 10; continue; }
			const qn = q.map((x, k) => x + step[k]);
			const rn = fn(qn, new Float64Array(m)), cn = dot(rn, rn);
			if (cn < cost) { q = Float64Array.from(qn); r = rn; const dc = cost - cn; cost = cn; lambda = Math.max(lambda / 3, 1e-9); improved = true; if (dc < 1e-10 * cost) it = iters; break; }
			lambda *= 10;
		}
		if (!improved) break;
	}
	return { q, cost };
}
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
function solve(A, b, n) {
	const M = Array.from({ length: n }, (_, i) => [...A.slice(i * n, i * n + n), b[i]]);
	for (let c = 0; c < n; c++) {
		let p = c;
		for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
		if (Math.abs(M[p][c]) < 1e-14) return null;
		[M[c], M[p]] = [M[p], M[c]];
		for (let r = 0; r < n; r++) { if (r === c) continue; const k = M[r][c] / M[c][c]; for (let k2 = c; k2 <= n; k2++) M[r][k2] -= k * M[c][k2]; }
	}
	return M.map((row, i) => row[n] / row[i]);
}
