"""Multi-level correction for the race's linear solves (solver race, stage 4, candidate 5): a V-cycle over the 7, 14 and 28 mm meshes of
the same pattern, used as the preconditioner of conjugate gradients inside Newton or the local/global step.
Coarse operators are Galerkin (P^T A P) from the fine matrix, rebuilt whenever it changes, with P the coarse meshes' prolongation by
flat position (make_case.prolong: P14 fine from 14 mm, P14to28 14 mm from 28 mm). Smoothing is damped block Jacobi, the same number of
sweeps before and after, and the coarsest level is a fixed number of sweeps, so the V-cycle is one fixed symmetric operator, as plain
conjugate gradients needs. Repeated coarse corrections, not a coarse start (plan): the speed baseline showed a coarse start gets close
fast and the fine solve then crawls out of the coarse mesh's own answer.
warp.sparse's products (bsr_mm) are used as they are; a WebGPU port must supply its own.
Spec: knowledge/engineering/app/solver-race-plan.md.
"""
import numpy as np
import warp as wp
import warp.optim.linear as wl
import warp.sparse as ws


@wp.kernel
def jacobi_k(Dinv: wp.array(dtype=wp.mat33), r: wp.array(dtype=wp.vec3), Az: wp.array(dtype=wp.vec3), omega: float, z: wp.array(dtype=wp.vec3)):
	i = wp.tid()
	z[i] = z[i] + omega * (Dinv[i] * (r[i] - Az[i]))


@wp.kernel
def inv_k(D: wp.array(dtype=wp.mat33)):
	# by eigenvalues: a point's block is about 300 along the body normal and down to 0.01 across it, and wp.inverse (cofactors, float32)
	# came back indefinite for some (smallest eigenvalue -5800), which made the V-cycle indefinite and conjugate gradients diverge
	i = wp.tid()
	A = D[i]
	A = 0.5 * (A + wp.transpose(A))
	Q, d = wp.eig3(A)
	inv = wp.vec3(1.0 / wp.max(d[0], 1.0e-6), 1.0 / wp.max(d[1], 1.0e-6), 1.0 / wp.max(d[2], 1.0e-6))
	D[i] = Q * wp.diag(inv) * wp.transpose(Q)


@wp.kernel
def combine_k(alpha: float, a: wp.array(dtype=wp.vec3), beta: float, b: wp.array(dtype=wp.vec3), out: wp.array(dtype=wp.vec3)):
	i = wp.tid()
	out[i] = alpha * a[i] + beta * b[i]


def prolongation(ij, w, n_fine, n_coarse, device):
	rows, cols = ij
	vals = np.zeros((len(w), 3, 3), np.float32)
	for k in range(3):
		vals[:, k, k] = w
	return ws.bsr_from_triplets(n_fine, n_coarse, wp.array(rows.astype(np.int32), dtype=wp.int32, device=device), wp.array(cols.astype(np.int32), dtype=wp.int32, device=device),
		wp.array(vals, dtype=wp.mat33, device=device))


class Hierarchy:
	def __init__(self, case, n, device='cuda:0', levels=2, sweeps=2, coarsest=10, omega=0.5):
		"""levels: 1 (7 and 14 mm) or 2 (7, 14 and 28 mm) below the fine mesh."""
		self.device, self.sweeps, self.coarsest, self.omega = device, sweeps, coarsest, omega
		n14, n28 = int(case['P14_n']), int(case['P28_n'])
		self.P = [prolongation(case['P14_ij'], case['P14_w'], n, n14, device)]
		if levels >= 2:
			self.P.append(prolongation(case['P14to28_ij'], case['P14to28_w'], n14, n28, device))
		self.Pt = [ws.bsr_transposed(P) for P in self.P]
		self.sizes = [n, n14, n28][:levels + 1]
		self.A = [None] * (levels + 1)
		self.work = [None] * levels
		self.Dinv = [wp.zeros(m, dtype=wp.mat33, device=device) for m in self.sizes]
		self.r = [wp.zeros(m, dtype=wp.vec3, device=device) for m in self.sizes]
		self.z = [wp.zeros(m, dtype=wp.vec3, device=device) for m in self.sizes]
		self.Az = [wp.zeros(m, dtype=wp.vec3, device=device) for m in self.sizes]
		self.AP = [None] * levels
		self.mm_work = [(ws.bsr_mm_work_arrays(), ws.bsr_mm_work_arrays()) for _ in range(levels)]

	def setup(self, A):
		"""Coarse operators for the fine matrix A (its values may have changed; its pattern may not)."""
		self.A[0] = A
		for l, (P, Pt) in enumerate(zip(self.P, self.Pt)):
			reuse = self.AP[l] is not None
			w1, w2 = self.mm_work[l]
			self.AP[l] = ws.bsr_mm(self.A[l], P, self.AP[l], work_arrays=w1, reuse_topology=reuse)
			self.A[l + 1] = ws.bsr_mm(Pt, self.AP[l], self.A[l + 1], work_arrays=w2, reuse_topology=reuse)
		for l, Al in enumerate(self.A):
			ws.bsr_get_diag(Al, out=self.Dinv[l])
			wp.launch(inv_k, self.sizes[l], [self.Dinv[l]], device=self.device)
		return self

	def smooth(self, l, sweeps):
		for _ in range(sweeps):
			ws.bsr_mv(self.A[l], self.z[l], self.Az[l])
			wp.launch(jacobi_k, self.sizes[l], [self.Dinv[l], self.r[l], self.Az[l], self.omega, self.z[l]], device=self.device)

	def cycle(self, l):
		"""z[l] ~ A[l]^-1 r[l], from zero."""
		self.z[l].zero_()
		if l == len(self.A) - 1:
			self.smooth(l, self.coarsest)
			return
		self.smooth(l, self.sweeps)
		ws.bsr_mv(self.A[l], self.z[l], self.Az[l])
		wp.launch(combine_k, self.sizes[l], [1.0, self.r[l], -1.0, self.Az[l], self.Az[l]], device=self.device)  # residual
		ws.bsr_mv(self.Pt[l], self.Az[l], self.r[l + 1])
		self.cycle(l + 1)
		ws.bsr_mv(self.P[l], self.z[l + 1], self.z[l], alpha=1.0, beta=1.0)
		self.smooth(l, self.sweeps)

	def operator(self, A):
		"""As warp.optim.linear's preconditioner(A): a LinearOperator applying one V-cycle."""
		self.setup(A)
		n = self.sizes[0]

		def matvec(x, y, z, alpha, beta):
			wp.copy(self.r[0], x)
			self.cycle(0)
			wp.launch(combine_k, n, [float(alpha), self.z[0], float(beta), y, z], device=self.device)

		return wl.LinearOperator(shape=(n, n), dtype=wp.vec3, device=self.device, matvec=matvec)
