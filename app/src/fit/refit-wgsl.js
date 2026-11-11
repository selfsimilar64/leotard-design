// The re-fit's GPU kernels in WGSL: today's local/global method with push-only contact and lagged friction, one step =
// query, tri, spring, rhs, then `cgIters` of preconditioned conjugate gradients warm-started from the positions.
// Twin of pipeline/race/gpu.py (surface_at, query_k, tri_state, friction_lam_k, pd_friction_k) and pipeline/race/solvers.py
// (pd_tri_k, pd_spring_k, pd_rhs_k, local_global) with Warp's cg; change both sides together. Stage 2 of the fit realism plan: press
// in tri (solvers.pd_tri_k), bending only in the constant matrix (refit.js hingesOf, energy.hinges). Checked against Python's iterates by
// the tuning page's check (app/src/dev/refit-lab.js). Sums gather over fixed lists and reductions run in a fixed order, so a run is
// bit-for-bit repeatable on one GPU.
//
// Buffers (refit.js lays them out):
//   topo  i32: triangles, sleeve flags, per-point gather lists, spring ends, the constant matrix's rows and columns
//   kon   f32: per triangle Dinv and area and facing, per spring rest length and stiffness, the constant matrix's values and diagonal
//   v     vec4: per point, in blocks of n: x, anchor, b, r, z, p, Ap, then the stop rule's window sum, last window average, drift
//   pt    vec4: per point, 3 each: (closest point, d), (body normal, friction's held contact force), (a, c, w, -) of its 3x3 block
//   loc   vec4: per triangle corner its local-step pull (3 per triangle), then per span its pull
//   red   f32: workgroup partial sums [0, 1024), then scalars
//   bodyI i32: per part the tree's triangle order and node links (2 each), then per face (i0, i1, i2, open-edge bits)
//   bodyF vec4: per part the tree's node boxes (2 each), per face (normal, edge pseudo-normals x3), per part per vertex (pseudo-normal,
//               open flag), the body's points

export const WG = 256;
export const RED = { RZ: 1024, ALPHA: 1025, BETA: 1026, FRESH: 1027, INV_WINDOW: 1028 };
export const BLOCK = { X: 0, A: 1, B: 2, R: 3, Z: 4, P: 5, AP: 6, SUM: 7, PREV: 8, DRIFT: 9 };

export const PARAMS = [
	'n', 'nt', 'ns', 'nwg',
	'off_tri', 'off_sleeve', 'off_vts', 'off_vtc',
	'off_vss', 'off_vsc', 'off_si', 'off_sj',
	'off_cp', 'off_cc', 'off_dinv', 'off_area',
	'off_facing', 'off_rest', 'off_k', 'off_cv',
	'off_lii', 'node0', 'node1', 'order0',
	'order1', 'face0', 'face1', 'off_fn',
	'vn0', 'vn1', 'off_pts', 'off_fi',
	'link0', 'link1', 'pad0', 'pad1',
];
export const FPARAMS = ['plane', 'hold', 'gather', 'turn', 'damp', 'mu', 'stick', 'grip', 'press', 'jam'];

export const WGSL = /* wgsl */ `
struct Params {
	${PARAMS.map((p) => `${p}: u32,`).join(' ')}
	${FPARAMS.map((p) => `${p}: f32,`).join(' ')}
}

@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read_write> topo: array<i32>;
@group(0) @binding(2) var<storage, read_write> kon: array<f32>;
@group(0) @binding(3) var<storage, read_write> v: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> pt: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read_write> loc: array<vec4<f32>>;
@group(0) @binding(6) var<storage, read_write> red: array<f32>;
@group(0) @binding(7) var<storage, read_write> bodyI: array<i32>;
@group(0) @binding(8) var<storage, read_write> bodyF: array<vec4<f32>>;

var<workgroup> sh: array<f32, ${WG}>;

fn X(i: u32) -> vec3<f32> { return v[${BLOCK.X}u * P.n + i].xyz; }

// Warp's normalize: the zero vector stays zero
fn nz(a: vec3<f32>) -> vec3<f32> {
	let l = length(a);
	if (l > 0.0) { return a / l; }
	return vec3<f32>(0.0);
}
fn nz2(a: vec2<f32>) -> vec2<f32> {
	let l = length(a);
	if (l > 0.0) { return a / l; }
	return vec2<f32>(0.0);
}

// ---- the body: closest point by the tree, side by pseudo-normal (gpu.surface_at) ---------------------------------------------

// Ericson 5.1.5: barycentric weights of the closest point on triangle abc
fn closest_bary(p: vec3<f32>, a: vec3<f32>, b: vec3<f32>, c: vec3<f32>) -> vec3<f32> {
	let ab = b - a; let ac = c - a; let ap = p - a;
	let d1 = dot(ab, ap); let d2 = dot(ac, ap);
	if (d1 <= 0.0 && d2 <= 0.0) { return vec3<f32>(1.0, 0.0, 0.0); }
	let bp = p - b; let d3 = dot(ab, bp); let d4 = dot(ac, bp);
	if (d3 >= 0.0 && d4 <= d3) { return vec3<f32>(0.0, 1.0, 0.0); }
	let vc = d1 * d4 - d3 * d2;
	if (vc <= 0.0 && d1 >= 0.0 && d3 <= 0.0) { let t = d1 / (d1 - d3); return vec3<f32>(1.0 - t, t, 0.0); }
	let cp = p - c; let d5 = dot(ab, cp); let d6 = dot(ac, cp);
	if (d6 >= 0.0 && d5 <= d6) { return vec3<f32>(0.0, 0.0, 1.0); }
	let vb = d5 * d2 - d1 * d6;
	if (vb <= 0.0 && d2 >= 0.0 && d6 <= 0.0) { let t = d2 / (d2 - d6); return vec3<f32>(1.0 - t, 0.0, t); }
	let va = d3 * d6 - d5 * d4;
	if (va <= 0.0 && d4 - d3 >= 0.0 && d5 - d6 >= 0.0) { let t = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return vec3<f32>(0.0, 1.0 - t, t); }
	let den = 1.0 / (va + vb + vc);
	let vv = vb * den; let ww = vc * den;
	return vec3<f32>(1.0 - vv - ww, vv, ww);
}

fn corner(f: u32, k: u32) -> u32 { return u32(bodyI[P.off_fi + 4u * f + k]); }
fn bp(i: u32) -> vec3<f32> { return bodyF[P.off_pts + i].xyz; }

struct Hit { q: vec3<f32>, d: f32, g: vec3<f32>, found: bool }

fn box_dist(id: u32, node0: u32, p: vec3<f32>) -> f32 {
	let o = max(max(bodyF[node0 + 2u * id].xyz - p, p - bodyF[node0 + 2u * id + 1u].xyz), vec3<f32>(0.0));
	return dot(o, o);
}

// bound: squared distance the closest point is known to be within (the last step's closest point is on the surface), so the walk
// skips all but the nearby boxes; exact, not an approximation
fn surface_at(p: vec3<f32>, part: u32, bound: f32) -> Hit {
	var node0 = P.node0; var link0 = P.link0; var order0 = P.order0; var face0 = P.face0; var vn0 = P.vn0;
	if (part != 0u) { node0 = P.node1; link0 = P.link1; order0 = P.order1; face0 = P.face1; vn0 = P.vn1; }
	var stack: array<i32, 64>;
	var top = 1;
	stack[0] = 0;
	var best = bound;
	var face = 0u;
	var bary = vec3<f32>(1.0, 0.0, 0.0);
	var found = false;
	loop {
		if (top == 0) { break; }
		top -= 1;
		let id = u32(stack[top]);
		if (box_dist(id, node0, p) > best) { continue; }
		let a = bodyI[link0 + 2u * id];
		let b = bodyI[link0 + 2u * id + 1u];
		if (a < 0) {
			let first = u32(-a - 1);
			for (var k = first; k < first + u32(b); k++) {
				let f = face0 + u32(bodyI[order0 + k]);
				let A = bp(corner(f, 0u)); let B = bp(corner(f, 1u)); let C = bp(corner(f, 2u));
				let w = closest_bary(p, A, B, C);
				let q = A * w.x + B * w.y + C * w.z;
				let dd = dot(q - p, q - p);
				if (dd < best || (!found && dd <= best)) { best = dd; face = f; bary = w; found = true; }
			}
		} else if (top < 62) {
			// nearer child on top, so it is searched first and the bound tightens sooner
			if (box_dist(u32(a), node0, p) < box_dist(u32(b), node0, p)) { stack[top] = b; stack[top + 1] = a; }
			else { stack[top] = a; stack[top + 1] = b; }
			top += 2;
		}
	}
	var h: Hit;
	h.d = 0.0; h.g = vec3<f32>(0.0, 1.0, 0.0); h.q = p; h.found = found;
	if (!found) { return h; }
	let f = face;
	let A = bp(corner(f, 0u)); let B = bp(corner(f, 1u)); let C = bp(corner(f, 2u));
	let c = A * bary.x + B * bary.y + C * bary.z;
	let eps = 1.0e-3;  // as gpu.surface_at
	var zeros = 0u;
	var k = -1;
	for (var j = 0; j < 3; j++) {
		if (bary[j] < eps) { zeros += 1u; }
		if (bary[j] > 1.0 - eps) { k = j; }
	}
	let fn_ = bodyF[P.off_fn + 4u * f].xyz;
	var n = fn_;
	var open_edge = 0;
	var vtx = -1;
	let bits = bodyI[P.off_fi + 4u * f + 3u];
	if (zeros == 1u) {
		for (var j = 0; j < 3; j++) { if (bary[j] < eps) { k = j; } }
		n = bodyF[P.off_fn + 4u * f + 1u + u32(k)].xyz;
		open_edge = (bits >> u32(k)) & 1;
	} else if (zeros >= 2u && k >= 0) {
		vtx = i32(corner(f, u32(k)));
		let vn = bodyF[vn0 + u32(vtx)];
		n = vn.xyz;
		open_edge = select(0, 1, vn.w > 0.5);
	}
	let r = p - c;
	h.q = c;
	if (open_edge != 0) {
		if (vtx >= 0) { h.d = dot(r, n); h.g = n; }
		else { h.d = dot(r, fn_); h.g = fn_; }
	} else {
		let dist = length(r);
		var s = 1.0;
		if (dot(r, n) < 0.0) { s = -1.0; }
		h.d = s * dist;
		if (dist > 1.0e-5) { h.g = r * (s / dist); } else { h.g = n; }  // gpu.SNAP: on the surface the direction to it is rounding noise
	}
	return h;
}

@compute @workgroup_size(${WG})
fn query(@builtin(global_invocation_id) gid: vec3<u32>) {
	let i = gid.x;
	if (i >= P.n) { return; }
	let x = X(i);
	let part = u32(topo[P.off_sleeve + i]);
	let fresh = red[${RED.FRESH}] > 0.5;
	var bound = 1.0e30;
	if (!fresh) {
		let r = length(x - pt[3u * i].xyz) * 1.0001 + 1.0e-7;  // the last step's closest point is on this part's surface
		bound = r * r;
	}
	var h = surface_at(x, part, bound);
	if (!h.found) { h = surface_at(x, part, 1.0e30); }  // nothing within the bound (rounding): look everywhere
	pt[3u * i] = vec4<f32>(h.q, h.d);
	// friction's held contact force (gpu.friction_lam_k): moved only grip of the way to the new one, all the way on a run's first step
	var blend = P.grip;
	if (fresh) { blend = 1.0; }
	let lam = (1.0 - blend) * pt[3u * i + 1u].w + blend * P.plane * max(-h.d, 0.0);
	pt[3u * i + 1u] = vec4<f32>(h.g, lam);
}

// ---- local step per triangle (solvers.pd_tri_k with gpu.tri_state's decomposition) ---------------------------------------------

fn dinv(t: u32) -> vec4<f32> {
	let o = P.off_dinv + 4u * t;
	return vec4<f32>(kon[o], kon[o + 1u], kon[o + 2u], kon[o + 3u]);  // [00, 01, 10, 11]
}
fn tri_b(D: vec4<f32>, a: u32) -> vec2<f32> {
	let b1 = vec2<f32>(D.x, D.y);
	let b2 = vec2<f32>(D.z, D.w);
	if (a == 1u) { return b1; }
	if (a == 2u) { return b2; }
	return -(b1 + b2);
}

@compute @workgroup_size(${WG})
fn tri(@builtin(global_invocation_id) gid: vec3<u32>) {
	let t = gid.x;
	if (t >= P.nt) { return; }
	let i0 = u32(topo[P.off_tri + 3u * t]); let i1 = u32(topo[P.off_tri + 3u * t + 1u]); let i2 = u32(topo[P.off_tri + 3u * t + 2u]);
	let D = dinv(t);
	let area = kon[P.off_area + t];
	let facing = kon[P.off_facing + t];
	let g = P.gather;
	let x0 = X(i0);
	let e1 = X(i1) - x0;
	let e2 = X(i2) - x0;
	let f0 = e1 * D.x + e2 * D.z;
	let f1 = e1 * D.y + e2 * D.w;
	let a = dot(f0, f0); let b = dot(f0, f1); let c = dot(f1, f1);
	let h = 0.5 * (a - c);
	let disc = sqrt(h * h + b * b);
	let l1 = 0.5 * (a + c) + disc;
	let l2 = max(0.5 * (a + c) - disc, 0.0);
	let va = vec2<f32>(b, l1 - a);
	let vb = vec2<f32>(l1 - c, b);
	var v1 = vec2<f32>(1.0, 0.0);
	if (dot(va, va) > dot(vb, vb)) {
		if (dot(va, va) > 1.0e-30) { v1 = nz2(va); }
	} else {
		if (dot(vb, vb) > 1.0e-30) { v1 = nz2(vb); }
	}
	let v2 = vec2<f32>(-v1.y, v1.x);
	let s1 = sqrt(l1);
	let s2 = sqrt(l2);
	var u1 = f0 * v1.x + f1 * v1.y;
	if (s1 > 1.0e-9) { u1 = u1 / s1; } else { u1 = vec3<f32>(1.0, 0.0, 0.0); }
	let tnn = nz(pt[3u * i0 + 1u].xyz + pt[3u * i1 + 1u].xyz + pt[3u * i2 + 1u].xyz);
	var u2 = f0 * v2.x + f1 * v2.y;
	if (s2 > 1.0e-5 * s1) { u2 = u2 / s2; } else { u2 = nz(cross(tnn, u1)); }
	let J = cross(f0, f1);
	let lj = length(J);
	var w = 0.0;
	if (lj > 1.0e-12) {
		let cc = dot(J / lj, tnn);
		let tt = clamp(-cc * facing / P.turn, 0.0, 1.0);
		w = tt * tt * (3.0 - 2.0 * tt);
	}
	var sg = 1.0;
	if (w > 0.5) { sg = -1.0; }
	// squeezed below jam, a singular value's target is moved press of the way back to jam, so squeezing beyond what the knit takes up
	// costs (fit realism plan stage 2; press 0: free)
	var c1 = clamp(s1, g, 1.0);
	var c2 = clamp(sg * s2, g, 1.0);
	if (c1 < P.jam) { c1 = c1 + P.press * (P.jam - c1); }
	if (c2 < P.jam) { c2 = c2 + P.press * (P.jam - c2); }
	for (var k = 0u; k < 3u; k++) {
		let bb = tri_b(D, k);
		loc[3u * t + k] = vec4<f32>(area * (u1 * (c1 * dot(v1, bb)) + u2 * (sg * c2 * dot(v2, bb))), 0.0);
	}
}

@compute @workgroup_size(${WG})
fn spring(@builtin(global_invocation_id) gid: vec3<u32>) {
	let s = gid.x;
	if (s >= P.ns) { return; }
	let span = X(u32(topo[P.off_sj + s])) - X(u32(topo[P.off_si + s]));
	let l = length(span) + 1.0e-12;
	let k = kon[P.off_k + s];
	loc[3u * P.nt + s] = vec4<f32>(span * (k * min(kon[P.off_rest + s], l) / l), 0.0);  // tension only: a slack span is its own target
}

fn contact_k(d: f32) -> f32 {
	if (d < 0.0) { return P.plane; }
	return P.hold;
}

// right side per point (pd_rhs_k, pd_friction_k), and the point's own 3x3 block: a I + c n n^T + w (I - n n^T)
@compute @workgroup_size(${WG})
fn rhs(@builtin(global_invocation_id) gid: vec3<u32>) {
	let i = gid.x;
	if (i >= P.n) { return; }
	let x = X(i);
	let q = pt[3u * i];
	let gn = pt[3u * i + 1u].xyz;
	let lam = pt[3u * i + 1u].w;
	let ck = contact_k(q.w);
	var acc = gn * (ck * dot(gn, q.xyz)) + P.damp * x;
	for (var c = topo[P.off_vts + i]; c < topo[P.off_vts + i + 1u]; c++) {
		acc += loc[u32(topo[P.off_vtc + u32(c)])].xyz;
	}
	for (var c = topo[P.off_vss + i]; c < topo[P.off_vss + i + 1u]; c++) {
		let s = topo[P.off_vsc + u32(c)];
		if (s >= 0) { acc += loc[3u * P.nt + u32(s)].xyz; } else { acc -= loc[3u * P.nt + u32(-s - 1)].xyz; }
	}
	var w = 0.0;
	// the anchor's 4th value: a point placed by hand keeps that much friction at least (refit.js reset; the race's gpu.py has none)
	let L = max(P.mu, v[${BLOCK.A}u * P.n + i].w) * lam;
	if (L > 0.0) {
		let anchor = v[${BLOCK.A}u * P.n + i].xyz;
		let dx = x - anchor;
		let u = dx - gn * dot(gn, dx);
		let r = length(u);
		let s = u * max(0.0, 1.0 - P.stick / max(r, 1.0e-12));
		w = L / P.stick;
		acc += (anchor - gn * dot(gn, anchor) + s) * w;
	}
	v[${BLOCK.B}u * P.n + i] = vec4<f32>(acc, 0.0);
	pt[3u * i + 2u] = vec4<f32>(kon[P.off_lii + i] + P.damp, ck, w, 0.0);
}

// ---- the global solve: preconditioned conjugate gradients (Warp's cg), block Jacobi by the blocks' exact inverse -------------

fn Av(blk: u32, i: u32) -> vec3<f32> {
	var acc = vec3<f32>(0.0);
	for (var c = topo[P.off_cp + i]; c < topo[P.off_cp + i + 1u]; c++) {
		acc += kon[P.off_cv + u32(c)] * v[blk * P.n + u32(topo[P.off_cc + u32(c)])].xyz;
	}
	let pi = v[blk * P.n + i].xyz;
	let n = pt[3u * i + 1u].xyz;
	let D = pt[3u * i + 2u];
	let pn = n * dot(n, pi);
	return acc + P.damp * pi + D.y * pn + D.z * (pi - pn);  // the constant part's diagonal is in the rows; damp, contact and friction here
}

fn Minv(i: u32, r: vec3<f32>) -> vec3<f32> {
	let n = pt[3u * i + 1u].xyz;
	let D = pt[3u * i + 2u];
	let rn = n * dot(n, r);
	return rn / (D.x + D.y) + (r - rn) / (D.x + D.z);
}

fn wg_sum(lid: u32, wid: u32, val: f32) {
	sh[lid] = val;
	workgroupBarrier();
	for (var s = ${WG / 2}u; s > 0u; s = s >> 1u) {
		if (lid < s) { sh[lid] += sh[lid + s]; }
		workgroupBarrier();
	}
	if (lid == 0u) { red[wid] = sh[0]; }
}

@compute @workgroup_size(${WG})
fn cg_init(@builtin(global_invocation_id) gid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) {
	let i = gid.x;
	var val = 0.0;
	if (i < P.n) {
		let r = v[${BLOCK.B}u * P.n + i].xyz - Av(${BLOCK.X}u, i);
		let z = Minv(i, r);
		v[${BLOCK.R}u * P.n + i] = vec4<f32>(r, 0.0);
		v[${BLOCK.Z}u * P.n + i] = vec4<f32>(z, 0.0);
		v[${BLOCK.P}u * P.n + i] = vec4<f32>(z, 0.0);
		val = dot(r, z);
	}
	wg_sum(lid.x, wid.x, val);
}

@compute @workgroup_size(${WG})
fn cg_ap(@builtin(global_invocation_id) gid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) {
	let i = gid.x;
	var val = 0.0;
	if (i < P.n) {
		let ap = Av(${BLOCK.P}u, i);
		v[${BLOCK.AP}u * P.n + i] = vec4<f32>(ap, 0.0);
		val = dot(v[${BLOCK.P}u * P.n + i].xyz, ap);
	}
	wg_sum(lid.x, wid.x, val);
}

@compute @workgroup_size(${WG})
fn cg_update(@builtin(global_invocation_id) gid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>, @builtin(workgroup_id) wid: vec3<u32>) {
	let i = gid.x;
	var val = 0.0;
	if (i < P.n) {
		let alpha = red[${RED.ALPHA}];
		let x = X(i) + alpha * v[${BLOCK.P}u * P.n + i].xyz;
		let r = v[${BLOCK.R}u * P.n + i].xyz - alpha * v[${BLOCK.AP}u * P.n + i].xyz;
		let z = Minv(i, r);
		v[${BLOCK.X}u * P.n + i] = vec4<f32>(x, 0.0);
		v[${BLOCK.R}u * P.n + i] = vec4<f32>(r, 0.0);
		v[${BLOCK.Z}u * P.n + i] = vec4<f32>(z, 0.0);
		val = dot(r, z);
	}
	wg_sum(lid.x, wid.x, val);
}

@compute @workgroup_size(${WG})
fn cg_dir(@builtin(global_invocation_id) gid: vec3<u32>) {
	let i = gid.x;
	if (i >= P.n) { return; }
	v[${BLOCK.P}u * P.n + i] = vec4<f32>(v[${BLOCK.Z}u * P.n + i].xyz + red[${RED.BETA}] * v[${BLOCK.P}u * P.n + i].xyz, 0.0);
}

// one workgroup: the partial sums in a fixed order, then the step's scalars
fn total(lid: u32) -> f32 {
	var acc = 0.0;
	for (var k = lid; k < P.nwg; k += ${WG}u) { acc += red[k]; }
	sh[lid] = acc;
	workgroupBarrier();
	for (var s = ${WG / 2}u; s > 0u; s = s >> 1u) {
		if (lid < s) { sh[lid] += sh[lid + s]; }
		workgroupBarrier();
	}
	return sh[0];
}

@compute @workgroup_size(${WG})
fn finish_rz0(@builtin(local_invocation_id) lid: vec3<u32>) {
	let s = total(lid.x);
	if (lid.x == 0u) { red[${RED.RZ}] = s; red[${RED.FRESH}] = 0.0; }
}

@compute @workgroup_size(${WG})
fn finish_alpha(@builtin(local_invocation_id) lid: vec3<u32>) {
	let s = total(lid.x);
	if (lid.x == 0u) {
		var a = 0.0;
		if (s != 0.0) { a = red[${RED.RZ}] / s; }
		red[${RED.ALPHA}] = a;
	}
}

@compute @workgroup_size(${WG})
fn finish_beta(@builtin(local_invocation_id) lid: vec3<u32>) {
	let s = total(lid.x);
	if (lid.x == 0u) {
		var b = 0.0;
		if (red[${RED.RZ}] != 0.0) { b = s / red[${RED.RZ}]; }
		red[${RED.BETA}] = b;
		red[${RED.RZ}] = s;
	}
}

// the stop rule's windows (refit.js run): add each step's positions; at a window's end the average, its move from the last window's
@compute @workgroup_size(${WG})
fn window_add(@builtin(global_invocation_id) gid: vec3<u32>) {
	let i = gid.x;
	if (i >= P.n) { return; }
	v[${BLOCK.SUM}u * P.n + i] = v[${BLOCK.SUM}u * P.n + i] + vec4<f32>(X(i), 0.0);
}

@compute @workgroup_size(${WG})
fn window_end(@builtin(global_invocation_id) gid: vec3<u32>) {
	let i = gid.x;
	if (i >= P.n) { return; }
	let avg = v[${BLOCK.SUM}u * P.n + i].xyz * red[${RED.INV_WINDOW}];
	v[${BLOCK.DRIFT}u * P.n + i] = vec4<f32>(length(avg - v[${BLOCK.PREV}u * P.n + i].xyz), 0.0, 0.0, 0.0);
	v[${BLOCK.PREV}u * P.n + i] = vec4<f32>(avg, 0.0);
	v[${BLOCK.SUM}u * P.n + i] = vec4<f32>(0.0);
}
`;
