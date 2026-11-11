"""The race's energy on the GPU (NVIDIA Warp): what every candidate solver shares (solver race, stage 3).
Same energy as energy.Energy(case, surface='field', contact='push'), except the surface distance: here it is exact, the closest point on the
part's surface triangles found through a BVH (wp.Mesh), where energy.py interpolates it from a grid (surface_field.py, 0.07 mm apart on the
surface). Inside or outside comes from the closest feature's pseudo-normal (surface_at), not the interpolated vertex normal surface_field.Field
uses: that one swapped sign a few millimetres off sharp edges and beside the wrist's open end (28 points of the settled back-arched fit).
Per triangle, per elastic span and per point: energy, gradient, and the Hessian projected to positive semi-definite (membrane by the
analytic eigen-system of a singular-value energy, Smith et al. 2019, extended to a 3x2 deformation gradient; surface by Gauss-Newton).
Written for a later WebGPU port (plan, stage 3): sums per point gather over precomputed lists, no float atomics in our kernels, float32.
Warp's own reductions (array_sum) and sparse products (warp.sparse) are used as they are; a port must replace them.
Spec: knowledge/engineering/app/solver-race-plan.md.
"""
import numpy as np
import warp as wp
import warp.sparse as ws

wp.config.quiet = True

HOLD = 1.0e-4  # race physics (owner, 2026-11-03): contact only pushes; slack fabric is held to the body this weakly. See energy.py.
TURN = 0.3  # inside-out charge fully on once a triangle has turned over by asin(0.3), 17 degrees past square to the body (tri_state)
DAMP = 0.05  # today's step regulariser (wrap_block.DAMP); only the local/global candidate uses it
MU = 0.4  # friction on re-fits (owner, 2026-11-03): fabric on dry skin, about 0.5 in Derler and Gerhardt's review (Tribol. Lett. 2012), polyamide lowest. Twin: energy.MU
STICK = 1.0e-3  # m a point gives before it slides: friction's spring part, the smoothing a lagged friction needs (friction_k). Twin: energy.STICK
SNAP = 1.0e-5  # m: closer to the body than this, a point's surface normal is the feature's pseudo-normal, not the direction to it (surface_at). Twin: refit-wgsl.js


# The membrane's energy density per singular value s: stretch above 1; squeezing free down to j (jam), from there to g (gather) it
# costs p (press) times as much as stretch (0: free, today's), below g the target stops at mix(g, j, p). Twin: energy.Energy.phi
# (and the local step's target, solvers.pd_tri_k).
@wp.func
def phi(s: float, g: float, p: float, j: float):
	if s > 1.0:
		return (s - 1.0) * (s - 1.0)
	if s < g:
		return p * (j - g) * (j - g) + (s - g) * (s - g) - 2.0 * p * (j - g) * (s - g)
	if s < j:
		return p * (j - s) * (j - s)
	return 0.0


@wp.func
def dphi(s: float, g: float, p: float, j: float):
	if s > 1.0:
		return 2.0 * (s - 1.0)
	if s < g:
		return 2.0 * (s - g) - 2.0 * p * (j - g)
	if s < j:
		return -2.0 * p * (j - s)
	return 0.0


@wp.func
def ddphi(s: float, g: float, p: float, j: float):
	if s > 1.0 or s < g:
		return 2.0
	if s < j:
		return 2.0 * p
	return 0.0


@wp.struct
class Hit:
	d: float  # signed distance, + on the side the surface's normals face
	g: wp.vec3  # its gradient: the unit direction away from the closest point
	q: wp.vec3  # the closest point
	c: float  # the body's compliance there (1: firm; fit realism plan stage 6, a soft body): the contact's stiffness is PLANE / c


@wp.func
def surface_at(p: wp.vec3, mid: wp.uint64, fn: wp.array(dtype=wp.vec3), en: wp.array(dtype=wp.vec3), eb: wp.array(dtype=wp.int32),
		vn: wp.array(dtype=wp.vec3), vb: wp.array(dtype=wp.int32), comp: wp.array(dtype=float)):
	"""Signed distance to a part's surface. Inside or outside by the angle-weighted pseudo-normal of the closest feature (face, edge or vertex;
	Baerentzen and Aanaes 2005), which is right for any point near a closed surface; an interpolated normal is not, at sharp edges.
	Past an open edge of the part (the wrist end, the line where torso and arm parts stop) the surface carries on as its tangent plane
	there, as today's solver's plane rule does: d is the height over that plane, so it does not swap sign beside the edge."""
	h = Hit()
	h.d = 0.0
	h.g = wp.vec3(0.0, 1.0, 0.0)
	h.q = p
	h.c = 1.0
	r = wp.mesh_query_point_no_sign(mid, p, 10.0)
	if r.result:
		f = r.face
		c = wp.mesh_eval_position(mid, f, r.u, r.v)
		w = wp.vec3(r.u, r.v, 1.0 - r.u - r.v)
		# the compliance at the closest point, from its face's corners (each at least 1), as refit-wgsl.js surface_at
		h.c = wp.max(w[0] * wp.max(comp[wp.mesh_get_index(mid, f * 3)], 1.0) + w[1] * wp.max(comp[wp.mesh_get_index(mid, f * 3 + 1)], 1.0)
			+ w[2] * wp.max(comp[wp.mesh_get_index(mid, f * 3 + 2)], 1.0), 1.0)
		eps = 1.0e-3  # float32 barycentrics: a closest point on an edge can come back up to about 1e-4 inside the face. Wider is safe: a point
		# whose closest point is that near an edge gets the same distance and side from the edge rule as from the face rule
		zeros = 0
		k = -1  # vertex region: its vertex; edge region: the vertex the edge is opposite
		for j in range(3):
			if w[j] < eps:
				zeros += 1
			if w[j] > 1.0 - eps:
				k = j
		n = fn[f]
		open_edge = 0
		vtx = -1
		if zeros == 1:
			for j in range(3):
				if w[j] < eps:
					k = j
			n = en[f * 3 + k]
			open_edge = eb[f * 3 + k]
		elif zeros >= 2 and k >= 0:
			vtx = wp.mesh_get_index(mid, f * 3 + k)
			n = vn[vtx]
			open_edge = vb[vtx]
		v = p - c
		h.q = c
		if open_edge != 0:
			if vtx >= 0:
				h.d = wp.dot(v, n)  # the closest point stays at the vertex: d's gradient is n
				h.g = n
			else:
				h.d = wp.dot(v, fn[f])  # sliding along the edge, which lies in the face: the gradient is the face normal
				h.g = fn[f]
		else:
			dist = wp.length(v)
			s = 1.0
			if wp.dot(v, n) < 0.0:
				s = -1.0
			h.d = s * dist
			if dist > SNAP:
				h.g = v * (s / dist)
			else:
				h.g = n  # on the surface: v is float32 rounding, its direction noise (it flipped 42 points of a placed pose start)
	return h


@wp.func
def contact_k(d: float, plane: float, hold: float):
	if d < 0.0:
		return plane
	return hold


@wp.struct
class Part:
	mesh: wp.uint64
	fn: wp.array(dtype=wp.vec3)  # face normals
	en: wp.array(dtype=wp.vec3)  # per face, per edge (opposite each corner): the edge's pseudo-normal
	eb: wp.array(dtype=wp.int32)  # 1 where that edge is open
	vn: wp.array(dtype=wp.vec3)  # per surface vertex: angle-weighted normal over this part's faces
	vb: wp.array(dtype=wp.int32)  # 1 on an open edge
	comp: wp.array(dtype=float)  # per surface vertex: its compliance, 1 or more (Problem: 1 + (give - 1) surface_soft)


@wp.func
def part_at(p: wp.vec3, sleeve: int, torso: Part, arm: Part):
	if sleeve != 0:
		return surface_at(p, arm.mesh, arm.fn, arm.en, arm.eb, arm.vn, arm.vb, arm.comp)
	return surface_at(p, torso.mesh, torso.fn, torso.en, torso.eb, torso.vn, torso.vb, torso.comp)


@wp.kernel
def query_k(x: wp.array(dtype=wp.vec3), sleeve: wp.array(dtype=wp.int32), torso: Part, arm: Part,
		plane: float, hold: float, d_out: wp.array(dtype=float), g_out: wp.array(dtype=wp.vec3), q_out: wp.array(dtype=wp.vec3),
		e_out: wp.array(dtype=float), e_off: int, kc_out: wp.array(dtype=float)):
	i = wp.tid()
	h = part_at(x[i], sleeve[i], torso, arm)
	d_out[i] = h.d
	g_out[i] = h.g
	q_out[i] = h.q
	kc = plane / h.c  # the contact's stiffness here, held with the closest point (plane_k, gather_grad_k, surface_hess_k, friction_lam_k)
	kc_out[i] = kc
	e_out[e_off + i] = 0.5 * contact_k(h.d, kc, hold) * h.d * h.d


@wp.struct
class Tri:
	e: float
	u1: wp.vec3
	u2: wp.vec3
	u3: wp.vec3
	v1: wp.vec2
	v2: wp.vec2
	s1: float
	s2: float
	dp1: float  # d energy density / d s1
	dp2: float  # d energy density / d s2, the inside-out blend included
	dd1: float
	dd2: float
	gc0: wp.vec3  # the blend's own gradient, against the two columns of F
	gc1: wp.vec3
	flip: int  # mostly inside out (blend over half): for reports


@wp.func
def tri_state(x0: wp.vec3, x1: wp.vec3, x2: wp.vec3, Di: wp.mat22, area: float, tn: wp.vec3, facing: float, g: float, turn: float, p: float, j: float):
	"""The membrane term of one triangle. Inside out (today's `wrong` in wrap_block.solve): the triangle's facing c = cos of the angle
	between its normal and the body's (times `facing`) is below 0. Today's solver then charges phi(-s2) instead of phi(s2), which
	jumps where the triangle stands square to the body (c = 0, s2 not small), and a jump never settles (Newton: thousands of points
	kept moving, stage 3 record). Here the charge blends smoothly, phi(s2) at c >= 0 to phi(-s2) at c <= -turn (smoothstep), so it is
	today's rule away from that edge and continuous across it. At s2 = 0 both charges agree, so a triangle collapsing to a line
	and opening the other way round is continuous too."""
	T = Tri()
	e1 = x1 - x0
	e2 = x2 - x0
	f0 = e1 * Di[0, 0] + e2 * Di[1, 0]
	f1 = e1 * Di[0, 1] + e2 * Di[1, 1]
	a = wp.dot(f0, f0)
	b = wp.dot(f0, f1)
	c = wp.dot(f1, f1)
	h = 0.5 * (a - c)
	disc = wp.sqrt(h * h + b * b)
	l1 = 0.5 * (a + c) + disc
	l2 = wp.max(0.5 * (a + c) - disc, 0.0)
	va = wp.vec2(b, l1 - a)
	vb = wp.vec2(l1 - c, b)
	v1 = wp.vec2(1.0, 0.0)
	if wp.length_sq(va) > wp.length_sq(vb):
		if wp.length_sq(va) > 1.0e-30:
			v1 = wp.normalize(va)
	else:
		if wp.length_sq(vb) > 1.0e-30:
			v1 = wp.normalize(vb)
	v2 = wp.vec2(-v1[1], v1[0])
	s1 = wp.sqrt(l1)
	s2 = wp.sqrt(l2)
	u1 = f0 * v1[0] + f1 * v1[1]
	if s1 > 1.0e-9:
		u1 = u1 / s1
	else:
		u1 = wp.vec3(1.0, 0.0, 0.0)
	tnn = wp.normalize(tn)
	u2 = f0 * v2[0] + f1 * v2[1]
	if s2 > 1.0e-5 * s1:
		u2 = u2 / s2
	else:
		u2 = wp.normalize(wp.cross(tnn, u1))
	# how inside out: w from 0 (facing the body's way, or square to it) to 1 (turned over by asin(turn) or more)
	J = wp.cross(f0, f1)
	lj = wp.length(J)
	w = 0.0
	dw = 0.0  # dw / dc
	gc0 = wp.vec3(0.0)
	gc1 = wp.vec3(0.0)
	if lj > 1.0e-12:
		jh = J / lj
		c = wp.dot(jh, tnn)
		t = wp.clamp(-c * facing / turn, 0.0, 1.0)
		w = t * t * (3.0 - 2.0 * t)
		if t > 0.0 and t < 1.0:
			dw = -6.0 * t * (1.0 - t) * facing / turn
			m = tnn - c * jh
			gc0 = wp.cross(f1, m) / lj  # dc / df0
			gc1 = wp.cross(m, f0) / lj  # dc / df1
	jump = phi(-s2, g, p, j) - phi(s2, g, p, j)
	T.e = 0.5 * area * (phi(s1, g, p, j) + (1.0 - w) * phi(s2, g, p, j) + w * phi(-s2, g, p, j))
	T.u1 = u1
	T.u2 = u2
	T.u3 = wp.cross(u1, u2)
	T.v1 = v1
	T.v2 = v2
	T.s1 = s1
	T.s2 = s2
	T.dp1 = dphi(s1, g, p, j)
	T.dp2 = (1.0 - w) * dphi(s2, g, p, j) - w * dphi(-s2, g, p, j)
	T.dd1 = ddphi(s1, g, p, j)
	T.dd2 = (1.0 - w) * ddphi(s2, g, p, j) + w * ddphi(-s2, g, p, j)
	T.gc0 = gc0 * (jump * dw)
	T.gc1 = gc1 * (jump * dw)
	T.flip = 0
	if w > 0.5:
		T.flip = 1
	return T


@wp.func
def tri_b(Di: wp.mat22, a: int):
	# dF/dx_a = outer(I, b_a): F = sum_a x_a b_a^T
	b1 = wp.vec2(Di[0, 0], Di[0, 1])
	b2 = wp.vec2(Di[1, 0], Di[1, 1])
	if a == 1:
		return b1
	if a == 2:
		return b2
	return -(b1 + b2)


@wp.func
def tri_grad(T: Tri, area: float, b: wp.vec2):
	return 0.5 * area * (T.u1 * (T.dp1 * wp.dot(T.v1, b)) + T.u2 * (T.dp2 * wp.dot(T.v2, b)) + T.gc0 * b[0] + T.gc1 * b[1])


@wp.func
def tri_lambdas(T: Tri, g: float):
	"""The six curvatures of the membrane term along its eigen-directions (Smith et al. 2019; the in-plane pair as Teran et al. 2005
	for a density f1(s1) + f2(s2)), each clamped at zero (projection to PSD). The inside-out blend's own curvature is left out."""
	l1 = T.dd1
	l2 = T.dd2
	den = T.s1 + T.s2
	lt = 0.0
	if wp.abs(den) > 1.0e-8:
		lt = (T.dp1 + T.dp2) / den
	diff = T.s1 - T.s2
	lf = wp.max(l1, l2)
	if wp.abs(diff) > 1.0e-4:
		lf = (T.dp1 - T.dp2) / diff
	lo1 = 0.0
	if T.s1 > 1.0e-8:
		lo1 = T.dp1 / T.s1
	lo2 = 0.0
	if wp.abs(T.s2) > 1.0e-8:
		lo2 = T.dp2 / T.s2
	return wp.spatial_vector(wp.max(l1, 0.0), wp.max(l2, 0.0), wp.max(lt, 0.0), wp.max(lf, 0.0), wp.max(lo1, 0.0), wp.max(lo2, 0.0))


@wp.func
def tri_hess(T: Tri, L: wp.spatial_vector, area: float, ba: wp.vec2, bb: wp.vec2):
	a1 = wp.dot(T.v1, ba)
	a2 = wp.dot(T.v2, ba)
	c1 = wp.dot(T.v1, bb)
	c2 = wp.dot(T.v2, bb)
	r = 0.70710678
	H = L[0] * a1 * c1 * wp.outer(T.u1, T.u1) + L[1] * a2 * c2 * wp.outer(T.u2, T.u2)
	H += L[2] * wp.outer((T.u1 * a2 - T.u2 * a1) * r, (T.u1 * c2 - T.u2 * c1) * r)
	H += L[3] * wp.outer((T.u1 * a2 + T.u2 * a1) * r, (T.u1 * c2 + T.u2 * c1) * r)
	H += (L[4] * a1 * c1 + L[5] * a2 * c2) * wp.outer(T.u3, T.u3)
	return 0.5 * area * H


@wp.kernel
def tri_k(x: wp.array(dtype=wp.vec3), tris: wp.array(dtype=wp.vec3i), Dinv: wp.array(dtype=wp.mat22), area: wp.array(dtype=float),
		facing: wp.array(dtype=float), gn: wp.array(dtype=wp.vec3), gather: float, turn: float, press: float, jam: float, mode: int,
		e_out: wp.array(dtype=float), gt: wp.array(dtype=wp.vec3), Ht: wp.array(dtype=wp.mat33), flip: wp.array(dtype=wp.int32)):
	"""mode 0: energy; 1: and gradient; 2: and Hessian blocks."""
	t = wp.tid()
	i = tris[t]
	Di = Dinv[t]
	T = tri_state(x[i[0]], x[i[1]], x[i[2]], Di, area[t], gn[i[0]] + gn[i[1]] + gn[i[2]], facing[t], gather, turn, press, jam)
	e_out[t] = T.e
	flip[t] = T.flip
	if mode >= 1:
		for a in range(3):
			gt[t * 3 + a] = tri_grad(T, area[t], tri_b(Di, a))
	if mode >= 2:
		L = tri_lambdas(T, gather)
		for a in range(3):
			for b in range(3):
				Ht[t * 9 + a * 3 + b] = tri_hess(T, L, area[t], tri_b(Di, a), tri_b(Di, b))


@wp.kernel
def spring_k(x: wp.array(dtype=wp.vec3), si: wp.array(dtype=wp.int32), sj: wp.array(dtype=wp.int32), rest: wp.array(dtype=float), k: wp.array(dtype=float),
		npull: int, mode: int, e_out: wp.array(dtype=float), e_off: int, gs: wp.array(dtype=wp.vec3), Hs: wp.array(dtype=wp.mat33)):
	"""Spans below npull pull only (the elastic), the rest push only (fit realism plan stage 3's kink spans; energy.springs)."""
	s = wp.tid()
	span = x[sj[s]] - x[si[s]]
	l = wp.length(span) + 1.0e-12
	ext = l - rest[s]
	if s < npull:
		ext = wp.max(ext, 0.0)
	else:
		ext = wp.min(ext, 0.0)
	e_out[e_off + s] = 0.5 * k[s] * ext * ext
	if mode >= 1:
		gs[s] = span * (k[s] * ext / l)
	if mode >= 2:
		K = wp.mat33(0.0)
		if ext != 0.0:
			u = span / l
			# projected: a squeezed span's sideways part (1 - rest / l < 0) left out
			K = k[s] * (wp.max(1.0 - rest[s] / l, 0.0) * wp.identity(n=3, dtype=float) + (rest[s] / l) * wp.outer(u, u))
		Hs[s * 4 + 0] = K
		Hs[s * 4 + 1] = K
		Hs[s * 4 + 2] = -K
		Hs[s * 4 + 3] = -K


@wp.kernel
def plane_k(x: wp.array(dtype=wp.vec3), q: wp.array(dtype=wp.vec3), gn: wp.array(dtype=wp.vec3), kc: wp.array(dtype=float), hold: float,
		d_out: wp.array(dtype=float), e_out: wp.array(dtype=float), e_off: int):
	"""The surface held through a step: height over the tangent plane at the closest point found at the step's start (Problem.freeze)."""
	i = wp.tid()
	d = wp.dot(x[i] - q[i], gn[i])
	d_out[i] = d
	e_out[e_off + i] = 0.5 * contact_k(d, kc[i], hold) * d * d


@wp.kernel
def gather_grad_k(vt_start: wp.array(dtype=wp.int32), vt_src: wp.array(dtype=wp.int32), gt: wp.array(dtype=wp.vec3),
		vs_start: wp.array(dtype=wp.int32), vs_src: wp.array(dtype=wp.int32), gs: wp.array(dtype=wp.vec3),
		d: wp.array(dtype=float), gn: wp.array(dtype=wp.vec3), kc: wp.array(dtype=float), hold: float, grad: wp.array(dtype=wp.vec3)):
	v = wp.tid()
	acc = gn[v] * (contact_k(d[v], kc[v], hold) * d[v])
	for c in range(vt_start[v], vt_start[v + 1]):
		acc += gt[vt_src[c]]
	for c in range(vs_start[v], vs_start[v + 1]):
		s = vs_src[c]
		if s >= 0:
			acc += gs[s]
		else:
			acc -= gs[-s - 1]
	grad[v] = acc


@wp.kernel
def surface_hess_k(d: wp.array(dtype=float), gn: wp.array(dtype=wp.vec3), kc: wp.array(dtype=float), hold: float, reg: float, H: wp.array(dtype=wp.mat33), off: int):
	v = wp.tid()
	H[off + v] = contact_k(d[v], kc[v], hold) * wp.outer(gn[v], gn[v]) + reg * wp.identity(n=3, dtype=float)


@wp.kernel
def friction_k(x: wp.array(dtype=wp.vec3), anchor: wp.array(dtype=wp.vec3), fn: wp.array(dtype=wp.vec3), lam: wp.array(dtype=float),
		mu: float, stick: float, mode: int, e_out: wp.array(dtype=float), e_off: int, grad: wp.array(dtype=wp.vec3), H: wp.array(dtype=wp.mat33), off: int):
	"""Lagged friction (Problem.freeze): per point, mu * lam * f(r), r the slide along the body since the re-fit began (x - anchor in the
	tangent plane of fn), f(r) = r^2 / (2 stick) up to stick, r - stick / 2 beyond. Its force is Coulomb's mu * lam once the point has slid
	stick, a spring before. Twin: energy.friction. Its energy in its own slot per point; added onto the point's gradient and Hessian block (projected: (mu lam / r)(P - u u^T) once sliding)."""
	i = wp.tid()
	L = mu * lam[i]
	e_out[e_off + i] = 0.0
	if L <= 0.0:
		return
	n = fn[i]
	P = wp.identity(n=3, dtype=float) - wp.outer(n, n)
	u = P * (x[i] - anchor[i])
	r = wp.length(u)
	if r <= stick:
		e_out[e_off + i] = L * r * r / (2.0 * stick)
		if mode >= 1:
			grad[i] += u * (L / stick)
		if mode >= 2:
			H[off + i] += P * (L / stick)
	else:
		e_out[e_off + i] = L * (r - 0.5 * stick)
		if mode >= 1:
			grad[i] += u * (L / r)
		if mode >= 2:
			uh = u / r
			H[off + i] += (P - wp.outer(uh, uh)) * (L / r)


@wp.kernel
def friction_lam_k(d: wp.array(dtype=float), gn: wp.array(dtype=wp.vec3), kc: wp.array(dtype=float), blend: float, lam: wp.array(dtype=float), fn: wp.array(dtype=wp.vec3)):
	"""The contact force each point presses on the body with (the push-only surface term's, PLANE * depth) and its normal, held for a step.
	blend < 1 moves the held force only that far toward the new one each step (Problem.grip)."""
	i = wp.tid()
	lam[i] = (1.0 - blend) * lam[i] + blend * kc[i] * wp.max(-d[i], 0.0)
	fn[i] = gn[i]


@wp.kernel
def pd_friction_k(x: wp.array(dtype=wp.vec3), anchor: wp.array(dtype=wp.vec3), fn: wp.array(dtype=wp.vec3), lam: wp.array(dtype=float),
		mu: float, stick: float, rhs: wp.array(dtype=wp.vec3), H: wp.array(dtype=wp.mat33), off: int):
	"""friction_k as a local/global constraint: a spring of mu lam / stick along the body towards the anchor, whose target slides with the
	point once it is stick away (the same energy: the Huber function is min over s of (|u - s|^2 / stick + 2|s|) mu lam / 2)."""
	i = wp.tid()
	L = mu * lam[i]
	if L <= 0.0:
		return
	n = fn[i]
	P = wp.identity(n=3, dtype=float) - wp.outer(n, n)
	u = P * (x[i] - anchor[i])
	r = wp.length(u)
	s = u * wp.max(0.0, 1.0 - stick / wp.max(r, 1.0e-12))
	w = L / stick
	rhs[i] += (P * anchor[i] + s) * w
	H[off + i] += P * w


@wp.kernel
def bend_k(x: wp.array(dtype=wp.vec3), ids: wp.array(dtype=wp.vec4i), K: wp.array(dtype=wp.vec4), c: wp.array(dtype=float), bend: float,
		mode: int, e_out: wp.array(dtype=float), e_off: int, grad: wp.array(dtype=wp.vec3)):
	"""Bending per hinge (energy.hinges): bend / 2 * c |K . X|^2, its gradient added onto the four points (after gather_grad_k; atomics,
	so not bit-for-bit repeatable: the race's other solvers only). Its Hessian is constant: Problem fills its blocks once."""
	h = wp.tid()
	i = ids[h]
	k = K[h]
	kx = x[i[0]] * k[0] + x[i[1]] * k[1] + x[i[2]] * k[2] + x[i[3]] * k[3]
	e_out[e_off + h] = 0.5 * bend * c[h] * wp.dot(kx, kx)
	if mode >= 1:
		for a in range(4):
			wp.atomic_add(grad, i[a], kx * (bend * c[h] * k[a]))


@wp.kernel
def fill_bsr_k(start: wp.array(dtype=wp.int32), src: wp.array(dtype=wp.int32), H: wp.array(dtype=wp.mat33), values: wp.array(dtype=wp.mat33)):
	e = wp.tid()
	acc = wp.mat33(0.0)
	for c in range(start[e], start[e + 1]):
		acc += H[src[c]]
	values[e] = acc


@wp.kernel
def diff_k(a: wp.array(dtype=float), b: wp.array(dtype=float), out: wp.array(dtype=float)):
	i = wp.tid()
	out[i] = a[i] - b[i]


@wp.kernel
def dot_k(a: wp.array(dtype=wp.vec3), b: wp.array(dtype=wp.vec3), out: wp.array(dtype=float)):
	i = wp.tid()
	out[i] = wp.dot(a[i], b[i])


@wp.kernel
def axpy_k(alpha: float, x: wp.array(dtype=wp.vec3), y: wp.array(dtype=wp.vec3), out: wp.array(dtype=wp.vec3)):
	i = wp.tid()
	out[i] = alpha * x[i] + y[i]


@wp.kernel
def scale_k(alpha: float, x: wp.array(dtype=wp.vec3), out: wp.array(dtype=wp.vec3)):
	i = wp.tid()
	out[i] = alpha * x[i]


def part_geometry(P, t):
	"""Face normals, edge and angle-weighted vertex pseudo-normals, and open edges and vertices, of one part's triangles t (surface_at).
	Twin: partGeometry in app/src/fit/fitted-case.js (the app's live re-fit case); keep them in step."""
	unit = lambda a: a / (np.linalg.norm(a, axis=-1, keepdims=True) + 1e-30)
	fn = unit(np.cross(P[t[:, 1]] - P[t[:, 0]], P[t[:, 2]] - P[t[:, 0]]))
	vn = np.zeros_like(P)
	for k in range(3):
		a, b = P[t[:, (k + 1) % 3]] - P[t[:, k]], P[t[:, (k + 2) % 3]] - P[t[:, k]]
		angle = np.arccos(np.clip((unit(a) * unit(b)).sum(1), -1, 1))
		np.add.at(vn, t[:, k], angle[:, None] * fn)
	ends = np.sort(np.stack([t[:, [1, 2]], t[:, [2, 0]], t[:, [0, 1]]], axis=1), axis=2)  # edge opposite corner k
	key = ends[..., 0].astype(np.int64) * len(P) + ends[..., 1]
	_, inv, count = np.unique(key.ravel(), return_inverse=True, return_counts=True)
	en = np.zeros((inv.max() + 1, 3))
	np.add.at(en, inv, np.repeat(fn, 3, axis=0))
	eb = (count[inv] == 1).astype(np.int32)
	vb = np.zeros(len(P), np.int32)
	vb[ends.reshape(-1, 2)[eb == 1].ravel()] = 1
	return fn, unit(en[inv]), eb, unit(vn), vb


def csr(keys, n):
	"""Group 0..len(keys)-1 by key: start offsets (n + 1) and the members in key order."""
	order = np.argsort(keys, kind='stable')
	start = np.concatenate([[0], np.cumsum(np.bincount(keys, minlength=n))])
	return start.astype(np.int32), order.astype(np.int32)


class Problem:
	"""One case on the GPU: the garment, the body surface, and the shared evaluation (energy, gradient, projected Hessian)."""

	def __init__(self, case, hold=HOLD, turn=TURN, mu=0.0, stick=STICK, grip=1.0, press=0.0, bend=0.0, jam=1.0, kink=0.0, firm=1.0, snug=1.0, give=1.0, device='cuda:0'):
		"""press, bend, jam: squeeze resistance, bending stiffness, the squeeze taken up free (fit realism plan stage 2; press 0 and bend 0:
		the physics before it). kink, firm, snug: the elastic's push-only spans along its line, its firmness and how short it is cut
		(stage 3; 0, 1 and 1: before it). give: a soft body (stage 6; 1: rigid): with case['surface_soft'] (0-1 per surface vertex) each
		vertex's compliance is 1 + (give - 1) soft, and the contact's stiffness PLANE over it (app: fitted-case.js buildCase, refit-wgsl.js).
		energy.py."""
		wp.init()
		self.device = device
		dev = device
		tris = case['tris'].astype(np.int32)
		rest = case['rest']
		self.n, self.nt = int(tris.max()) + 1, len(tris)
		n, nt = self.n, self.nt
		Dm = np.stack([rest[:, 1] - rest[:, 0], rest[:, 2] - rest[:, 0]], axis=2)
		self.plane, self.gather, self.hold, self.turn = float(case['plane']), float(case['gather']), float(hold), float(turn)
		self.press, self.bend, self.jam = float(press), float(bend), float(jam)
		from energy import hinges
		hid, hK, hc = hinges(tris, rest) if self.bend else (np.zeros((0, 4), np.int32), np.zeros((0, 4)), np.zeros(0))
		self.nh = nh = len(hid)
		self.hinge_ids = wp.array(hid.astype(np.int32), dtype=wp.vec4i, device=dev)
		self.hinge_K = wp.array(np.ascontiguousarray(hK, np.float32), dtype=wp.vec4, device=dev)
		self.hinge_c = wp.array(np.ascontiguousarray(hc, np.float32), dtype=float, device=dev)
		self.mu, self.stick = float(mu), float(stick)  # mu 0: frictionless, the race's first physics; a re-fit's is MU (set_anchor)
		self.grip = float(grip)  # how far each freeze moves friction's held contact force to the new one (1: all the way)
		self.fresh = True
		from energy import springs
		si, sj, rest_len, k, self.npull = springs(case['elastic'], kink, firm, snug)
		si, sj = si.astype(np.int32), sj.astype(np.int32)
		self.ns = ns = len(si)
		self.tris_np, self.si_np, self.sj_np = tris, si, sj
		f32 = lambda a, dt=float: wp.array(np.ascontiguousarray(a, dtype=np.float32), dtype=dt, device=dev)
		self.tris = wp.array(tris, dtype=wp.vec3i, device=dev)
		self.Dinv = f32(np.linalg.inv(Dm), wp.mat22)
		self.area_np = 0.5 * np.abs(np.linalg.det(Dm))
		self.area = f32(self.area_np)
		self.facing = f32(case['facing'])
		self.si, self.sj = wp.array(si, dtype=wp.int32, device=dev), wp.array(sj, dtype=wp.int32, device=dev)
		self.rest_len, self.k = f32(rest_len), f32(k)
		self.sleeve_np = case['sleeve'].astype(np.int32)
		self.sleeve = wp.array(self.sleeve_np, dtype=wp.int32, device=dev)
		# the body surface, one mesh per part as Surface.parts / surface_field.PartFields
		Q, idx, arm = case['surface_P'], case['surface_idx'].reshape(-1, 3), case['surface_arm']
		self.Qpts = f32(Q, wp.vec3)
		self.give = float(give)
		soft = case.get('surface_soft')
		self.comp_np = (1 + (self.give - 1) * np.asarray(soft, np.float64)) if soft is not None and self.give != 1 else np.ones(len(Q))
		self.comp = f32(self.comp_np)
		self.meshes, self.parts_ = [], []
		for keep in (arm < 0.5, arm > 0.15):
			t = idx[keep[idx].all(1)].astype(np.int32)
			m = wp.Mesh(points=self.Qpts, indices=wp.array(t.ravel(), dtype=wp.int32, device=dev))
			fn, en, eb, vn, vb = part_geometry(Q, t)
			part = Part()
			part.mesh, part.fn, part.en, part.vn = m.id, f32(fn, wp.vec3), f32(en, wp.vec3), f32(vn, wp.vec3)
			part.eb, part.vb = wp.array(eb, dtype=wp.int32, device=dev), wp.array(vb, dtype=wp.int32, device=dev)
			part.comp = self.comp
			self.meshes.append(m)
			self.parts_.append(part)
		self.torso_part, self.arm_part = self.parts_
		# per-point gathers: its triangle corners, its spans (+s+1 as the far end j, -(s+1) as the near end i, as gs is the force on j)
		self.vt_start, vt = csr(tris.ravel(), n)
		self.vt_src = wp.array(vt, dtype=wp.int32, device=dev)  # index t*3+a, which is the flat position itself
		self.vt_start = wp.array(self.vt_start, dtype=wp.int32, device=dev)
		ends = np.concatenate([sj, si])
		signed = np.concatenate([np.arange(ns), -np.arange(ns) - 1]).astype(np.int32)
		vs_start, order = csr(ends, n)
		self.vs_start = wp.array(vs_start, dtype=wp.int32, device=dev)
		self.vs_src = wp.array(signed[order], dtype=wp.int32, device=dev)
		# the Hessian's block pattern and, per block, which per-element blocks sum into it
		keys, srcs = [], []
		ta = np.repeat(np.arange(3), 3)
		tb = np.tile(np.arange(3), 3)
		keys.append((tris[:, ta].astype(np.int64) * n + tris[:, tb]).ravel())
		srcs.append(np.arange(nt * 9))
		self.off_s = nt * 9
		for slot, (r, c) in enumerate(((si, si), (sj, sj), (si, sj), (sj, si))):
			keys.append(r.astype(np.int64) * n + c)
			srcs.append(self.off_s + np.arange(ns) * 4 + slot)
		self.off_b = self.off_s + ns * 4  # bending: per hinge its 4 x 4 blocks, constant (filled below)
		for a in range(4):
			for b in range(4):
				keys.append(hid[:, a].astype(np.int64) * n + hid[:, b])
				srcs.append(self.off_b + np.arange(nh) * 16 + a * 4 + b)
		self.off_v = self.off_b + nh * 16
		keys.append(np.arange(n, dtype=np.int64) * n + np.arange(n))
		srcs.append(self.off_v + np.arange(n))
		keys, srcs = np.concatenate(keys), np.concatenate(srcs)
		order = np.argsort(keys, kind='stable')
		keys, srcs = keys[order], srcs[order]
		ukeys, first = np.unique(keys, return_index=True)
		self.nnz = len(ukeys)
		self.blk_start = wp.array(np.concatenate([first, [len(keys)]]).astype(np.int32), dtype=wp.int32, device=dev)
		self.blk_src = wp.array(srcs.astype(np.int32), dtype=wp.int32, device=dev)
		rows, cols = (ukeys // n).astype(np.int32), (ukeys % n).astype(np.int32)
		self.pattern = (rows, cols)
		self.A = ws.bsr_from_triplets(n, n, wp.array(rows, dtype=wp.int32, device=dev), wp.array(cols, dtype=wp.int32, device=dev),
			wp.zeros(self.nnz, dtype=wp.mat33, device=dev), prune_numerical_zeros=False)
		got = self.A.offsets.numpy()[:n + 1], self.A.columns.numpy()[:self.nnz]
		assert self.A.nnz == self.nnz and (got[1] == cols).all() and (np.diff(got[0]) == np.bincount(rows, minlength=n)).all(), 'BSR block order differs'
		# work arrays
		self.ne = nt + ns + 2 * n + nh
		self.e = wp.zeros(self.ne, dtype=float, device=dev)  # per element: triangles, spans, points' surface, points' friction, hinges
		self.off_f = nt + ns + n
		self.off_eb = nt + ns + 2 * n
		self.e_base = wp.zeros(self.ne, dtype=float, device=dev)
		self.e_tmp = wp.zeros(self.ne, dtype=float, device=dev)
		self.d = wp.zeros(n, dtype=float, device=dev)
		self.gn = wp.zeros(n, dtype=wp.vec3, device=dev)
		self.q = wp.zeros(n, dtype=wp.vec3, device=dev)
		self.gt = wp.zeros(nt * 3, dtype=wp.vec3, device=dev)
		self.gs = wp.zeros(ns, dtype=wp.vec3, device=dev)
		Hn = np.zeros((self.off_v + n, 3, 3), np.float32)
		if nh:  # bending's constant blocks: bend * c * K_a K_b * I
			w = (self.bend * hc[:, None, None] * hK[:, :, None] * hK[:, None, :]).reshape(-1)
			Hn[self.off_b:self.off_v] = w[:, None, None] * np.eye(3, dtype=np.float32)
		self.H = wp.array(Hn, dtype=wp.mat33, device=dev)
		self.flip = wp.zeros(nt, dtype=wp.int32, device=dev)
		self.grad = wp.zeros(n, dtype=wp.vec3, device=dev)
		self.tmp_n = wp.zeros(n, dtype=float, device=dev)
		self.anchor = wp.zeros(n, dtype=wp.vec3, device=dev)  # where each point was when the re-fit began
		self.lam = wp.zeros(n, dtype=float, device=dev)  # its contact force at the last freeze
		self.fn = wp.zeros(n, dtype=wp.vec3, device=dev)  # and the body's normal there
		self.kc = wp.zeros(n, dtype=float, device=dev)  # per point the contact's stiffness at its closest point (query_k)

	def array(self, x):
		return wp.array(np.ascontiguousarray(x, dtype=np.float32), dtype=wp.vec3, device=self.device)

	def query(self, x):
		wp.launch(query_k, self.n, [x, self.sleeve, self.torso_part, self.arm_part, self.plane, self.hold, self.d, self.gn, self.q, self.e, self.nt + self.ns, self.kc], device=self.device)

	def set_anchor(self, x):
		"""Friction holds each point to where it is now: call with the re-fit's start, before the solve."""
		wp.copy(self.anchor, x)
		self.fresh = True

	def freeze(self, x):
		"""Hold the contact at x through the step that follows (evaluate(held=True)): the closest point and its normal, so the surface term
		is the height over that tangent plane, and the body normal the inside-out blend measures against. Exact, inside or outside is
		ambiguous where the posed surface folds into itself (one point at the back-arched wrist swapped side for a 0.03 mm move), and
		a jump stops any line search. Held, the energy is smooth through the step; the next step looks again. Today's solver works the
		same way (each local step re-matches). At a fixed point the held energy's gradient is the true one.
		Friction's contact force is held the same way, from the depth here (lagged friction, as IPC's; Li et al. 2020)."""
		self.query(x)
		if self.mu > 0:
			wp.launch(friction_lam_k, self.n, [self.d, self.gn, self.kc, 1.0 if self.fresh else self.grip, self.lam, self.fn], device=self.device)
			self.fresh = False

	def evaluate(self, x, mode=1, reg=0.0, held=False):
		"""mode 0: per-element energies into self.e; 1: and the gradient into self.grad; 2: and the projected Hessian into self.A.
		held: contact and inside-out as at the last freeze."""
		if held:
			wp.launch(plane_k, self.n, [x, self.q, self.gn, self.kc, self.hold, self.d, self.e, self.nt + self.ns], device=self.device)
		else:
			self.query(x)
		wp.launch(tri_k, self.nt, [x, self.tris, self.Dinv, self.area, self.facing, self.gn, self.gather, self.turn, self.press, self.jam, mode, self.e, self.gt, self.H, self.flip], device=self.device)
		wp.launch(spring_k, self.ns, [x, self.si, self.sj, self.rest_len, self.k, self.npull, mode, self.e, self.nt, self.gs, self.H[self.off_s:]], device=self.device)
		if mode >= 1:
			wp.launch(gather_grad_k, self.n, [self.vt_start, self.vt_src, self.gt, self.vs_start, self.vs_src, self.gs, self.d, self.gn, self.kc, self.hold, self.grad], device=self.device)
		if self.nh:
			wp.launch(bend_k, self.nh, [x, self.hinge_ids, self.hinge_K, self.hinge_c, self.bend, mode, self.e, self.off_eb, self.grad], device=self.device)
		if mode >= 2:
			wp.launch(surface_hess_k, self.n, [self.d, self.gn, self.kc, self.hold, reg, self.H, self.off_v], device=self.device)
		if self.mu > 0:
			wp.launch(friction_k, self.n, [x, self.anchor, self.fn, self.lam, self.mu, self.stick, mode, self.e, self.off_f, self.grad, self.H, self.off_v], device=self.device)
		if mode >= 2:
			wp.launch(fill_bsr_k, self.nnz, [self.blk_start, self.blk_src, self.H, self.A.values], device=self.device)

	def energy(self):
		return float(wp.utils.array_sum(self.e))

	def save_energy(self):
		wp.copy(self.e_base, self.e)

	def delta(self):
		"""Energy now minus at the last save_energy, summed per element so float32 does not lose it against the total."""
		wp.launch(diff_k, self.ne, [self.e, self.e_base, self.e_tmp], device=self.device)
		return float(wp.utils.array_sum(self.e_tmp))

	def dot(self, a, b):
		wp.launch(dot_k, self.n, [a, b, self.tmp_n], device=self.device)
		return float(wp.utils.array_sum(self.tmp_n))

	def axpy(self, alpha, x, y, out):
		wp.launch(axpy_k, self.n, [float(alpha), x, y, out], device=self.device)

	def parts(self, x):
		"""Energy split as energy.Energy's parts, on the host (for reports, not inside a timed loop)."""
		self.fresh = True  # the contact force at x itself; and the next solve starts afresh
		self.freeze(x)
		self.fresh = True
		self.evaluate(x, 0, held=True)
		e = self.e.numpy().astype(np.float64)
		tri, spr, pt, fr, bd = e[:self.nt], e[self.nt:self.nt + self.ns], e[self.nt + self.ns:self.off_f], e[self.off_f:self.off_eb], e[self.off_eb:]
		d = self.d.numpy()
		return dict(total=e.sum(), membrane=tri.sum(), surface=pt.sum(), elastic=spr.sum(), friction=fr.sum(), bending=bd.sum(), inside_out=int(self.flip.numpy().sum()),
			inside_body=int((d < -0.0005).sum()), off_body=int((d > 0.002).sum()), max_inside=float(-d.min()), max_off=float(d.max()))
