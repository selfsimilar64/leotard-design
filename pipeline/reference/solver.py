"""Newton's SolverStyle3D with the three things this garment needs and it does not have.

SPDX note: step() and _precompute() are adapted from newton/_src/solvers/style3d/solver_style3d.py and
builder use (Newton 1.7.0, Copyright (c) 2025 The Newton Developers, Apache-2.0).

Stock Style3D (kept as it is unless a flag below is set): Baraff-Witkin membrane
    E = A/2 [ku (|Fu|-1)^2 + kv (|Fv|-1)^2 + ks (Fu.Fv)^2], compression charged like stretch, no Poisson term,
Crouzeix-Raviart bending, penalty contact with regularised Coulomb friction, penalty self-contact.

Added here, none of it in the stock solver:
  elastic    edge springs. Stock Style3D ignores model springs entirely (no spring kernel in its step). Tension only
             by default, because real elastic buckles when shorter than its rest length.
  poisson    a coupling term kuv = nu sqrt(ku kv), E += A kuv (|Fu|-1)(|Fv|-1). Optional.
  gather     replaces the membrane with ours: an isotropic energy on the triangle's principal stretches with no
             cost between 0.5 and 1 (twin of wrap_block.py solve(): GATHER = 0.5). Optional, for the control runs.
"""
import numpy as np
import warp as wp

from newton._src.solvers.style3d.builder import PDMatrixBuilder
from newton._src.solvers.style3d.kernels import (
	eval_bend_kernel,
	init_rhs_kernel,
	init_step_kernel,
	nonlinear_step_kernel,
	prepare_jacobi_preconditioner_kernel,
	update_velocity,
)
from newton._src.solvers.style3d.solver_style3d import SolverStyle3D
from newton._src.solvers.style3d.kernels import deactivate_zero_mass_particles_kernel


@wp.kernel
def eval_stretch_ext_kernel(
	pos: wp.array[wp.vec3],
	face_areas: wp.array[float],
	inv_dms: wp.array[wp.mat22],
	faces: wp.array2d[wp.int32],
	aniso_ke: wp.array[wp.vec3],
	nu: float,
	forces: wp.array[wp.vec3],
):
	"""eval_stretch_kernel plus the Poisson coupling. With nu = 0 it is the stock force."""
	fid = wp.tid()
	inv_dm = inv_dms[fid]
	face_area = face_areas[fid]
	face = wp.vec3i(faces[fid, 0], faces[fid, 1], faces[fid, 2])
	x01 = pos[face[1]] - pos[face[0]]
	x02 = pos[face[2]] - pos[face[0]]
	Fu = x01 * inv_dm[0, 0] + x02 * inv_dm[1, 0]
	Fv = x01 * inv_dm[0, 1] + x02 * inv_dm[1, 1]
	len_Fu = wp.length(Fu)
	len_Fv = wp.length(Fv)
	Fu = wp.normalize(Fu) if (len_Fu > 1e-6) else wp.vec3(0.0)
	Fv = wp.normalize(Fv) if (len_Fv > 1e-6) else wp.vec3(0.0)
	dFu_dx = wp.vec3(-inv_dm[0, 0] - inv_dm[1, 0], inv_dm[0, 0], inv_dm[1, 0])
	dFv_dx = wp.vec3(-inv_dm[0, 1] - inv_dm[1, 1], inv_dm[0, 1], inv_dm[1, 1])
	ku = aniso_ke[fid][0]
	kv = aniso_ke[fid][1]
	ks = aniso_ke[fid][2]
	kuv = nu * wp.sqrt(ku * kv)
	su = ku * (len_Fu - 1.0) + kuv * (len_Fv - 1.0)
	sv = kv * (len_Fv - 1.0) + kuv * (len_Fu - 1.0)
	for i in range(3):
		force = -face_area * (su * dFu_dx[i] * Fu + sv * dFv_dx[i] * Fv + ks * wp.dot(Fu, Fv) * (Fu * dFv_dx[i] + Fv * dFu_dx[i]))
		wp.atomic_add(forces, face[i], force)


@wp.func
def _gather_excess(s: float, floor: float) -> float:
	"""How far a principal stretch lies outside the free range [floor, 1]."""
	if s > 1.0:
		return s - 1.0
	if s < floor:
		return s - floor
	return 0.0


@wp.kernel
def eval_gather_kernel(
	pos: wp.array[wp.vec3],
	face_areas: wp.array[float],
	inv_dms: wp.array[wp.mat22],
	faces: wp.array2d[wp.int32],
	aniso_ke: wp.array[wp.vec3],
	floor: float,
	forces: wp.array[wp.vec3],
):
	"""E = A k/2 sum (s_i - clip(s_i, floor, 1))^2, s_i the principal stretches. Twin of wrap_block.py solve()'s clipped rotation target.
	Force on node i: -A k U diag(excess) V^T grad N_i, written as F V diag(excess/s) V^T grad N_i."""
	fid = wp.tid()
	inv_dm = inv_dms[fid]
	face_area = face_areas[fid]
	face = wp.vec3i(faces[fid, 0], faces[fid, 1], faces[fid, 2])
	x01 = pos[face[1]] - pos[face[0]]
	x02 = pos[face[2]] - pos[face[0]]
	Fu = x01 * inv_dm[0, 0] + x02 * inv_dm[1, 0]
	Fv = x01 * inv_dm[0, 1] + x02 * inv_dm[1, 1]
	a = wp.dot(Fu, Fu)
	b = wp.dot(Fu, Fv)
	c = wp.dot(Fv, Fv)
	# eigen of C = [[a, b], [b, c]]
	mid = 0.5 * (a + c)
	rad = wp.sqrt(0.25 * (a - c) * (a - c) + b * b)
	l1 = mid + rad
	l2 = wp.max(mid - rad, 1e-10)
	s1 = wp.sqrt(l1)
	s2 = wp.sqrt(l2)
	if rad > 1e-10:
		v1 = wp.normalize(wp.vec2(b, l1 - a)) if wp.abs(b) > 1e-12 else (wp.vec2(1.0, 0.0) if a >= c else wp.vec2(0.0, 1.0))
	else:
		v1 = wp.vec2(1.0, 0.0)
	v2 = wp.vec2(-v1[1], v1[0])
	g1 = _gather_excess(s1, floor) / s1
	g2 = _gather_excess(s2, floor) / s2
	# S = V diag(g) V^T
	s00 = g1 * v1[0] * v1[0] + g2 * v2[0] * v2[0]
	s01 = g1 * v1[0] * v1[1] + g2 * v2[0] * v2[1]
	s11 = g1 * v1[1] * v1[1] + g2 * v2[1] * v2[1]
	Pu = Fu * s00 + Fv * s01
	Pv = Fu * s01 + Fv * s11
	dFu_dx = wp.vec3(-inv_dm[0, 0] - inv_dm[1, 0], inv_dm[0, 0], inv_dm[1, 0])
	dFv_dx = wp.vec3(-inv_dm[0, 1] - inv_dm[1, 1], inv_dm[0, 1], inv_dm[1, 1])
	k = aniso_ke[fid][0]
	for i in range(3):
		wp.atomic_add(forces, face[i], -face_area * k * (Pu * dFu_dx[i] + Pv * dFv_dx[i]))


@wp.kernel
def eval_elastic_kernel(
	pos: wp.array[wp.vec3],
	ends: wp.array[wp.vec2i],
	rest: wp.array[float],
	stiff: wp.array[float],
	two_sided: int,
	forces: wp.array[wp.vec3],
):
	"""A span of elastic: force = stiff (L - rest) along it, stiff = EA / rest. Slack when shorter unless two_sided."""
	sid = wp.tid()
	e = ends[sid]
	d = pos[e[1]] - pos[e[0]]
	L = wp.length(d)
	x = L - rest[sid]
	if x <= 0.0 and two_sided == 0:
		return
	if L < 1e-9:
		return
	f = (d / L) * (stiff[sid] * x)
	wp.atomic_add(forces, e[0], f)
	wp.atomic_add(forces, e[1], -f)


class FitSolver(SolverStyle3D):
	def __init__(self, model, *, iterations, linear_iterations, spans=None, ea=0.0, two_sided=False, nu=0.0, gather=None):
		"""spans: (i, j, flat length, ratio). ea: elastic strength, N per unit strain. gather: free compression floor, or None for stock."""
		self._spans = spans if ea > 0 else None
		self._ea = ea
		self.two_sided = 1 if two_sided else 0
		self.nu = nu
		self.gather = gather
		super().__init__(model, iterations=iterations, linear_iterations=linear_iterations)
		if self._spans:
			d = self.device
			self.el_ends = wp.array([wp.vec2i(a, b) for a, b, _, _ in spans], dtype=wp.vec2i, device=d)
			rest = np.array([f * r for _, _, f, r in spans], np.float32)
			self.el_rest = wp.array(rest, dtype=float, device=d)
			self.el_stiff = wp.array(ea / rest, dtype=float, device=d)
		self.last_rhs = None
		self.want_rhs = False

	def _precompute(self, model):
		"""As the stock, with the elastic in the (constant) system matrix so that it stays a good preconditioner."""
		b = PDMatrixBuilder(model.particle_count)
		b.add_stretch_constraints(model.tri_indices.numpy().tolist(), model.tri_poses.numpy().tolist(), model.style3d.tri_aniso_ke.numpy().tolist(), model.tri_areas.numpy().tolist())
		b.add_bend_constraints(model.edge_indices.numpy().tolist(), model.edge_bending_properties.numpy().tolist(), model.style3d.edge_rest_area.numpy().tolist(), model.style3d.edge_bending_cot.numpy().tolist())
		if self._spans:
			diags, vals, nbrs, counts = b.diags.numpy(), b.values.numpy(), b.neighbors.numpy(), b.counts.numpy()
			for i, j, f, r in self._spans:
				k = self._ea / (f * r)
				for p, q in ((i, j), (j, i)):
					diags[p] += k
					slot = next((s for s in range(counts[p]) if nbrs[p, s] == q), None)
					if slot is None:
						slot = counts[p]
						nbrs[p, slot] = q
						counts[p] += 1
					vals[p, slot] -= k
			# .numpy() on a CPU array shares memory, so the builder sees these writes
		self.pd_diags, self.pd_non_diags.num_nz, self.pd_non_diags.nz_ell = b.finalize(self.device)

	def step(self, state_in, state_out, control, contacts, dt, *, observables=None):
		"""Stock SolverStyle3D.step() with the stretch kernel swapped and the elastic added; mouse dragging dropped."""
		m, d = self.model, self.device
		wp.copy(self._particle_flags, m.particle_flags)
		wp.launch(deactivate_zero_mass_particles_kernel, dim=m.particle_count, inputs=[m.particle_mass], outputs=[self._particle_flags], device=d)
		self.collision.frame_begin(state_in.particle_q, state_in.particle_qd, dt)
		wp.launch(init_step_kernel, dim=m.particle_count, inputs=[dt, m.gravity, m.particle_world, state_in.particle_f, state_in.particle_qd, state_in.particle_q, self.x_prev, self.pd_diags, m.particle_mass, self._particle_flags], outputs=[self.x_inertia, self.static_A_diags, self.dx], device=d)
		for it in range(self.nonlinear_iterations):
			wp.launch(init_rhs_kernel, dim=m.particle_count, inputs=[dt, state_in.particle_q, self.x_inertia, m.particle_mass], outputs=[self.rhs], device=d)
			if self.gather is None:
				wp.launch(eval_stretch_ext_kernel, dim=len(m.tri_areas), inputs=[state_in.particle_q, m.tri_areas, m.tri_poses, m.tri_indices, self.style3d.tri_aniso_ke, self.nu], outputs=[self.rhs], device=d)
			else:
				wp.launch(eval_gather_kernel, dim=len(m.tri_areas), inputs=[state_in.particle_q, m.tri_areas, m.tri_poses, m.tri_indices, self.style3d.tri_aniso_ke, self.gather], outputs=[self.rhs], device=d)
			wp.launch(eval_bend_kernel, dim=len(self.style3d.edge_rest_area), inputs=[state_in.particle_q, self.style3d.edge_rest_area, self.style3d.edge_bending_cot, m.edge_indices, m.edge_bending_properties], outputs=[self.rhs], device=d)
			if self._spans:
				wp.launch(eval_elastic_kernel, dim=len(self._spans), inputs=[state_in.particle_q, self.el_ends, self.el_rest, self.el_stiff, self.two_sided], outputs=[self.rhs], device=d)
			self.collision.accumulate_contact_force(dt, it, state_in, state_out, contacts, self.rhs, self.x_prev, self.static_A_diags)
			wp.launch(prepare_jacobi_preconditioner_kernel, dim=m.particle_count, inputs=[self.static_A_diags, self.collision.contact_hessian_diagonal(), self._particle_flags], outputs=[self.inv_A_diags], device=d)
			if self.want_rhs and it == self.nonlinear_iterations - 1:
				# the net force on each particle: the right-hand side without its inertial part, gravity put back in
				x = state_in.particle_q.numpy()
				mass = m.particle_mass.numpy()[:, None]
				g = m.gravity.numpy()[0]
				self.last_rhs = self.rhs.numpy() - (self.x_inertia.numpy() - x) * mass / (dt * dt) + mass * g
			self.linear_solver.solve(self.pd_non_diags, self.static_A_diags, self.dx if it == 0 else None, self.rhs, self.inv_A_diags, self.dx, self.linear_iterations, self.collision.hessian_multiply)
			self.collision.linear_iteration_end(self.dx)
			wp.launch(nonlinear_step_kernel, dim=m.particle_count, inputs=[state_in.particle_q], outputs=[state_out.particle_q, self.dx], device=d)
			state_in.particle_q.assign(state_out.particle_q)
		wp.launch(update_velocity, dim=m.particle_count, inputs=[dt, self.x_prev, state_out.particle_q], outputs=[state_out.particle_qd], device=d)
		self.collision.frame_end(state_out.particle_q, state_out.particle_qd, dt)
