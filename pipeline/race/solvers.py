"""The race's candidate solvers, on the GPU (solver race, stage 4). Each minimises gpu.Problem's energy from a start and calls
rec(x) after every iteration, which keeps a copy of the iterate on the GPU and the time it was reached; race.py scores the copies after.
  newton      projected Newton: projected Hessian, preconditioned conjugate gradients, backtracking line search on the energy
  local_global  today's method on the GPU: per-triangle best fit, then one linear solve (conjugate gradients, warm-started) per step
  lbfgs       L-BFGS, the per-point Hessian blocks as its starting estimate, backtracking line search
  vbd         Vertex Block Descent: each point a 3x3 Newton step on its own energy, points of one colour at once
Multi-level variants pass a hierarchy (multilevel.py) as the linear solver's preconditioner.
Spec: knowledge/engineering/app/solver-race-plan.md.
"""
import time

import numpy as np
import warp as wp
import warp.optim.linear as wl
import warp.sparse as ws

import gpu as G


class Recorder:
	"""Iterates and their times, excluding the recording itself. Stops a solver once its time budget is spent."""

	def __init__(self, budget, every=1):
		self.budget, self.every = budget, every
		self.t0 = None
		self.lost = 0.0
		self.marks = []  # (seconds, iteration, x copy on the GPU, info)
		self.it = 0

	def start(self):
		wp.synchronize()
		self.t0 = time.perf_counter()

	def __call__(self, x, info=None):
		wp.synchronize()
		t = time.perf_counter()
		self.it += 1
		if self.it % self.every == 0:
			self.marks.append((t - self.t0 - self.lost, self.it, wp.clone(x), info))
		wp.synchronize()
		self.lost += time.perf_counter() - t
		return t - self.t0 - self.lost < self.budget

	@property
	def elapsed(self):
		return time.perf_counter() - self.t0 - self.lost


@wp.kernel
def max_norm_k(p: wp.array(dtype=wp.vec3), out: wp.array(dtype=float)):
	i = wp.tid()
	out[i] = wp.length(p[i])


@wp.kernel
def clamp_k(p: wp.array(dtype=wp.vec3), limit: float):
	i = wp.tid()
	m = wp.length(p[i])
	if m > limit:
		p[i] = p[i] * (limit / m)


def max_len(pb, p):
	wp.launch(max_norm_k, pb.n, [p, pb.tmp_n], device=pb.device)
	return float(np.max(pb.tmp_n.numpy()))


NOISE = 2e-6  # float32 rounding in the energy of a whole garment: positions near 1 m carry about 6e-8 m, which the stiff surface term turns
# into about 2e-8 per point (PLANE * d * 6e-8 at d = 1 mm), about 2e-6 over 13,600 points. Smaller energy changes cannot be seen.


def line_search(pb, x, p, slope, trial, alpha=1.0, c=1e-4, shrink=0.5, tries=20):
	"""Backtracking on the energy along p. pb.e must hold the energy at x. Accepts a step that lowers the energy enough (Armijo) or,
	where the change is below float32's noise, one where the energy is still going down along p (its slope there, from the gradient,
	is accurate where the energy itself is not). Contact and inside-out are held as at the last pb.freeze. Returns the step (0: none
	found) and the change."""
	pb.save_energy()
	for _ in range(tries):
		pb.axpy(alpha, p, x, trial)
		pb.evaluate(trial, 1, held=True)
		dE = pb.delta()
		if dE <= c * alpha * slope or (dE < NOISE and pb.dot(pb.grad, p) <= 0):
			return alpha, dE
		alpha *= shrink
	return 0.0, 0.0


def newton(pb, x0, rec, reg=1e-4, max_move=0.01, cg_iters=400, eta=0.5, tol=1e-9, M_type='block_jacobi_direct', precond=None, per_point=False):
	"""Projected Newton. reg: added to every point's Hessian block (the gather band has no curvature: it would be singular there).
	max_move: the longest step any point takes in one iteration, m: the contact is a tangent plane through a step, good only for a few
	millimetres on a curved body. per_point: cut each point's step to max_move on its own, not the whole step in proportion, so a few
	far-moving points (slack fabric, held only by HOLD) do not slow the rest. eta: the linear solve stops at
	eta * min(1, sqrt(|g| / |g0|)) relative residual."""
	x = wp.clone(x0)
	trial = wp.zeros_like(x)
	p = wp.zeros_like(x)
	b = wp.zeros_like(x)
	g0 = None
	rec.start()
	while True:
		pb.freeze(x)
		pb.evaluate(x, 2, reg, held=True)
		gnorm = np.sqrt(pb.dot(pb.grad, pb.grad))
		g0 = g0 or gnorm
		wp.launch(G.scale_k, pb.n, [-1.0, pb.grad, b], device=pb.device)
		p.zero_()
		M = precond(pb.A) if precond else wl.preconditioner(pb.A, M_type)
		rel = eta * min(1.0, np.sqrt(gnorm / g0))
		iters, err, _ = wl.cg(pb.A, b, p, tol=rel, maxiter=cg_iters, M=M, check_every=10, use_cuda_graph=precond is None)
		slope = pb.dot(pb.grad, p)
		if slope >= 0:  # not a descent direction (should not happen with a positive definite system): fall back to the gradient
			wp.copy(p, b)
			slope = -gnorm ** 2
		if per_point:
			wp.launch(clamp_k, pb.n, [p, max_move], device=pb.device)
			slope = pb.dot(pb.grad, p)
		m = max_len(pb, p)
		alpha0 = min(1.0, max_move / max(m, 1e-12))
		pb.evaluate(x, 0, held=True)
		alpha, dE = line_search(pb, x, p, slope, trial, alpha0)
		if alpha > 0:
			x, trial = trial, x
		info = dict(g=gnorm, cg=int(iters), alpha=alpha, dE=dE, move=alpha * m)
		if not rec(x, info) or alpha == 0 or (alpha * m < tol):
			return x


def lbfgs(pb, x0, rec, history=10, reg=1e-4, max_move=0.01):
	"""L-BFGS with the per-point 3x3 Hessian blocks (projected, plus reg) as the starting inverse estimate."""
	x = wp.clone(x0)
	trial = wp.zeros_like(x)
	p = wp.zeros_like(x)
	S, Y, rho = [], [], []
	g_old = wp.zeros_like(x)
	diag = wp.zeros(pb.n, dtype=wp.mat33, device=pb.device)
	rec.start()
	pb.freeze(x)
	pb.evaluate(x, 2, reg, held=True)
	while True:
		ws.bsr_get_diag(pb.A, out=diag)
		wp.launch(inv_blocks_k, pb.n, [diag], device=pb.device)
		# two-loop recursion: p = -H g
		wp.launch(G.scale_k, pb.n, [-1.0, pb.grad, p], device=pb.device)
		alphas = []
		for s, y, r in reversed(list(zip(S, Y, rho))):
			a = r * pb.dot(s, p)
			alphas.append(a)
			pb.axpy(-a, y, p, p)
		wp.launch(block_mv_k, pb.n, [diag, p], device=pb.device)
		for (s, y, r), a in zip(zip(S, Y, rho), reversed(alphas)):
			bta = r * pb.dot(y, p)
			pb.axpy(a - bta, s, p, p)
		slope = pb.dot(pb.grad, p)
		if slope >= 0:
			S, Y, rho = [], [], []
			wp.launch(G.scale_k, pb.n, [-1.0, pb.grad, p], device=pb.device)
			slope = pb.dot(pb.grad, p)
		m = max_len(pb, p)
		alpha0 = min(1.0, max_move / max(m, 1e-12))
		wp.copy(g_old, pb.grad)
		pb.evaluate(x, 0, held=True)
		alpha, dE = line_search(pb, x, p, slope, trial, alpha0)
		if alpha > 0:
			s = wp.zeros_like(x)
			pb.axpy(-1.0, x, trial, s)
			x, trial = trial, x
		pb.freeze(x)
		pb.evaluate(x, 2, reg, held=True)
		if alpha > 0:
			y = wp.zeros_like(x)
			pb.axpy(-1.0, g_old, pb.grad, y)
			sy = pb.dot(s, y)
			if sy > 1e-30:
				S.append(s)
				Y.append(y)
				rho.append(1.0 / sy)
				S, Y, rho = S[-history:], Y[-history:], rho[-history:]
		info = dict(alpha=alpha, dE=dE, move=alpha * m)
		if not rec(x, info) or alpha == 0:
			return x


@wp.kernel
def inv_blocks_k(D: wp.array(dtype=wp.mat33)):
	i = wp.tid()
	D[i] = wp.inverse(D[i])


@wp.kernel
def block_mv_k(D: wp.array(dtype=wp.mat33), p: wp.array(dtype=wp.vec3)):
	i = wp.tid()
	p[i] = D[i] * p[i]


# ---- today's method on the GPU: local step per triangle, then one linear solve ------------------------------------------------------

@wp.kernel
def pd_tri_k(x: wp.array(dtype=wp.vec3), tris: wp.array(dtype=wp.vec3i), Dinv: wp.array(dtype=wp.mat22), area: wp.array(dtype=float),
		facing: wp.array(dtype=float), gn: wp.array(dtype=wp.vec3), gather: float, turn: float, press: float, jam: float, rhs: wp.array(dtype=wp.vec3)):
	"""Local step: each triangle's nearest allowed shape R (singular values clamped to [GATHER, 1], turned the body's way round where
	it is mostly inside out, as wrap_block.solve's wrong), and its pull on its corners, area * R b_a. press, jam (stage 2): a singular
	value squeezed below jam has its target moved press of the way back to jam, so squeezing beyond jam costs (energy.Energy.phi).
	Twin: tri in app/src/fit/refit-wgsl.js."""
	t = wp.tid()
	i = tris[t]
	Di = Dinv[t]
	T = G.tri_state(x[i[0]], x[i[1]], x[i[2]], Di, area[t], gn[i[0]] + gn[i[1]] + gn[i[2]], facing[t], gather, turn, press, jam)
	sg = 1.0
	if T.flip == 1:
		sg = -1.0
	c1 = wp.clamp(T.s1, gather, 1.0)
	c2 = wp.clamp(sg * T.s2, gather, 1.0)
	if c1 < jam:
		c1 = c1 + press * (jam - c1)
	if c2 < jam:
		c2 = c2 + press * (jam - c2)
	for a in range(3):
		b = G.tri_b(Di, a)
		rhs[t * 3 + a] = area[t] * (T.u1 * (c1 * wp.dot(T.v1, b)) + T.u2 * (sg * c2 * wp.dot(T.v2, b)))


@wp.kernel
def pd_tri_matrix_k(tris: wp.array(dtype=wp.vec3i), Dinv: wp.array(dtype=wp.mat22), area: wp.array(dtype=float), Ht: wp.array(dtype=wp.mat33)):
	t = wp.tid()
	Di = Dinv[t]
	for a in range(3):
		for b in range(3):
			Ht[t * 9 + a * 3 + b] = area[t] * wp.dot(G.tri_b(Di, a), G.tri_b(Di, b)) * wp.identity(n=3, dtype=float)


@wp.kernel
def pd_spring_k(x: wp.array(dtype=wp.vec3), si: wp.array(dtype=wp.int32), sj: wp.array(dtype=wp.int32), rest: wp.array(dtype=float), k: wp.array(dtype=float),
		gs: wp.array(dtype=wp.vec3), Hs: wp.array(dtype=wp.mat33)):
	s = wp.tid()
	span = x[sj[s]] - x[si[s]]
	l = wp.length(span) + 1.0e-12
	gs[s] = span * (k[s] * wp.min(rest[s], l) / l)  # tension only: a slack span is its own target
	K = k[s] * wp.identity(n=3, dtype=float)
	Hs[s * 4 + 0] = K
	Hs[s * 4 + 1] = K
	Hs[s * 4 + 2] = -K
	Hs[s * 4 + 3] = -K


@wp.kernel
def pd_rhs_k(x: wp.array(dtype=wp.vec3), vt_start: wp.array(dtype=wp.int32), vt_src: wp.array(dtype=wp.int32), gt: wp.array(dtype=wp.vec3),
		vs_start: wp.array(dtype=wp.int32), vs_src: wp.array(dtype=wp.int32), gs: wp.array(dtype=wp.vec3),
		d: wp.array(dtype=float), gn: wp.array(dtype=wp.vec3), q: wp.array(dtype=wp.vec3), plane: float, hold: float, damp: float, rhs: wp.array(dtype=wp.vec3)):
	v = wp.tid()
	acc = gn[v] * (G.contact_k(d[v], plane, hold) * wp.dot(gn[v], q[v])) + damp * x[v]
	for c in range(vt_start[v], vt_start[v + 1]):
		acc += gt[vt_src[c]]
	for c in range(vs_start[v], vs_start[v + 1]):
		s = vs_src[c]
		if s >= 0:
			acc += gs[s]
		else:
			acc -= gs[-s - 1]
	rhs[v] = acc


def local_global(pb, x0, rec, cg_iters=20, damp=G.DAMP, precond=None):
	"""Today's alternating method (wrap_block.solve) on the GPU, on the race's energy: local step per triangle (pd_tri_k), per span and
	per point (the body's tangent plane, push only), then the global solve, by cg_iters of preconditioned conjugate gradients
	warm-started from the last positions, where today's solver factorises. Its matrix changes only in the points' own blocks.
	With pb.mu, friction is one more per-point constraint (gpu.pd_friction_k). With pb.bend, bending is a constant part of the matrix
	(quadratic, rest curvature zero: nothing on the right side)."""
	x = wp.clone(x0)
	A = ws.bsr_copy(pb.A)
	H = wp.clone(pb.H)  # bending's constant blocks come with it (gpu.Problem); every other part is written below
	wp.launch(pd_tri_matrix_k, pb.nt, [pb.tris, pb.Dinv, pb.area, H], device=pb.device)
	rhs = wp.zeros_like(x)
	rec.start()
	while True:
		pb.freeze(x)
		wp.launch(pd_tri_k, pb.nt, [x, pb.tris, pb.Dinv, pb.area, pb.facing, pb.gn, pb.gather, pb.turn, pb.press, pb.jam, pb.gt], device=pb.device)
		wp.launch(pd_spring_k, pb.ns, [x, pb.si, pb.sj, pb.rest_len, pb.k, pb.gs, H[pb.off_s:]], device=pb.device)
		wp.launch(pd_rhs_k, pb.n, [x, pb.vt_start, pb.vt_src, pb.gt, pb.vs_start, pb.vs_src, pb.gs, pb.d, pb.gn, pb.q, pb.plane, pb.hold, damp, rhs], device=pb.device)
		wp.launch(G.surface_hess_k, pb.n, [pb.d, pb.gn, pb.plane, pb.hold, damp, H, pb.off_v], device=pb.device)
		if pb.mu > 0:
			wp.launch(G.pd_friction_k, pb.n, [x, pb.anchor, pb.fn, pb.lam, pb.mu, pb.stick, rhs, H, pb.off_v], device=pb.device)
		wp.launch(G.fill_bsr_k, pb.nnz, [pb.blk_start, pb.blk_src, H, A.values], device=pb.device)
		M = precond(A) if precond else wl.preconditioner(A, 'block_jacobi_direct')
		wl.cg(A, rhs, x, tol=1e-12, maxiter=cg_iters, M=M, check_every=cg_iters, use_cuda_graph=precond is None)
		if not rec(x):
			return x


# ---- Vertex Block Descent -----------------------------------------------------------------------------------------------------------

@wp.kernel
def vbd_k(x: wp.array(dtype=wp.vec3), ids: wp.array(dtype=wp.int32), vt_start: wp.array(dtype=wp.int32), vt_src: wp.array(dtype=wp.int32),
		tris: wp.array(dtype=wp.vec3i), Dinv: wp.array(dtype=wp.mat22), area: wp.array(dtype=float), facing: wp.array(dtype=float),
		gn: wp.array(dtype=wp.vec3), q: wp.array(dtype=wp.vec3), gather: float, turn: float, plane: float, hold: float,
		vs_start: wp.array(dtype=wp.int32), vs_src: wp.array(dtype=wp.int32), si: wp.array(dtype=wp.int32), sj: wp.array(dtype=wp.int32),
		rest: wp.array(dtype=float), k: wp.array(dtype=float), reg: float, max_move: float):
	"""One point's 3x3 Newton step on the energy of its own triangles, spans and contact, the others held where they are."""
	v = ids[wp.tid()]
	g = wp.vec3(0.0)
	H = wp.mat33(0.0)
	for c in range(vt_start[v], vt_start[v + 1]):
		src = vt_src[c]
		t = src // 3
		a = src - 3 * t
		i = tris[t]
		Di = Dinv[t]
		T = G.tri_state(x[i[0]], x[i[1]], x[i[2]], Di, area[t], gn[i[0]] + gn[i[1]] + gn[i[2]], facing[t], gather, turn, 0.0, 1.0)
		b = G.tri_b(Di, a)
		g += G.tri_grad(T, area[t], b)
		H += G.tri_hess(T, G.tri_lambdas(T, gather), area[t], b, b)
	for c in range(vs_start[v], vs_start[v + 1]):
		s = vs_src[c]
		sgn = 1.0
		if s < 0:
			s = -s - 1
			sgn = -1.0
		span = x[sj[s]] - x[si[s]]
		l = wp.length(span) + 1.0e-12
		ext = l - rest[s]
		if ext > 0.0:
			u = span / l
			g += span * (sgn * k[s] * ext / l)
			H += k[s] * ((1.0 - rest[s] / l) * wp.identity(n=3, dtype=float) + (rest[s] / l) * wp.outer(u, u))
	d = wp.dot(x[v] - q[v], gn[v])
	kc = G.contact_k(d, plane, hold)
	g += gn[v] * (kc * d)
	H += kc * wp.outer(gn[v], gn[v]) + reg * wp.identity(n=3, dtype=float)
	dx = -(wp.inverse(H) * g)
	m = wp.length(dx)
	if m > max_move:
		dx = dx * (max_move / m)
	x[v] = x[v] + dx


def colour(pb):
	"""Greedy colouring of the points: no two of one colour share a triangle or a span. Set-up, timed separately."""
	nb = [set() for _ in range(pb.n)]
	for t in pb.tris_np:
		for a in range(3):
			nb[t[a]].update((t[(a + 1) % 3], t[(a + 2) % 3]))
	for i, j in zip(pb.si_np, pb.sj_np):
		nb[i].add(j)
		nb[j].add(i)
	col = -np.ones(pb.n, int)
	for v in np.argsort([-len(s) for s in nb], kind='stable'):
		used = {col[u] for u in nb[v]}
		c = 0
		while c in used:
			c += 1
		col[v] = c
	return [wp.array(np.where(col == c)[0].astype(np.int32), dtype=wp.int32, device=pb.device) for c in range(col.max() + 1)]


def vbd(pb, x0, rec, colours, reg=1e-3, max_move=0.002):
	"""Vertex Block Descent (Chen et al. 2024), quasi-static: no inertia, reg on each point's block in its place (a point in the
	gather band, slack, has almost no curvature). One iteration: look up the contact, then every colour once.
	Without stage 2's press and bending (pb.press, pb.bend): it is not the app's method, so it was left at the physics before them."""
	x = wp.clone(x0)
	rec.start()
	while True:
		pb.freeze(x)
		for ids in colours:
			wp.launch(vbd_k, ids.shape[0], [x, ids, pb.vt_start, pb.vt_src, pb.tris, pb.Dinv, pb.area, pb.facing, pb.gn, pb.q, pb.gather, pb.turn,
				pb.plane, pb.hold, pb.vs_start, pb.vs_src, pb.si, pb.sj, pb.rest_len, pb.k, reg, max_move], device=pb.device)
		if not rec(x):
			return x
