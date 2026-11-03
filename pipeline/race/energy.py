"""The fit's energy, written out: the one function every solver in the race minimises (solver race, stage 1).
Today's solver (wrap_block.solve, alternating local and global steps) minimises it only implicitly; this is the same physics as one function of
the points alone, so any method can be pointed at it. CPU reference in numpy; the GPU kernels are to match it.

E = membrane + surface + elastic, frictionless, no gravity, metres.
- membrane, per triangle: area / 2 * (phi(s1) + phi(s2)), s the two singular values of the 3x2 deformation gradient F from the flat triangle,
  phi(s) = (s - 1)^2 above 1, 0 from GATHER to 1, (GATHER - s)^2 below: stretch costs, gathering down to GATHER is free. s2 counts negative
  where the triangle has turned inside out against the surface under it (the role of `wrong` in solve).
  The local step's clamped rotation minimises |F - R|^2 over the allowed R, and solve's cot-weighted edge form is area * |F - R|^2.
- surface, per point: PLANE / 2 * d^2. surface='field' (the race's): d the signed distance to the garment surface on the point's own part,
  interpolated from a grid (surface_field.py), a smooth function of the point alone. surface='nearest' (today's): d the distance to the
  tangent plane at the nearest surface vertex, filtered by the last normals; it jumps where the nearest vertex changes and depends on history,
  which stops line-search methods (stage 1 results).
  contact='push' (the race's physics, owner's choice 2026-11-03): the body only pushes. PLANE / 2 * d^2 inside it (d < 0); outside it a weak
  HOLD / 2 * d^2, standing in for the gravity and cling the model leaves out, so slack fabric still settles onto the body while fabric
  under tension bridges hollows as real fabric does. contact='both' is stage 1's: PLANE either side, which pulls fabric into hollows.
  HOLD = 1e-4: with the fabric's stretch modulus 300-1000 N/m (spandex jersey) as the energy's unit, 1 cm off the body it pulls a point with
  about 4-12 times the weight of the fabric it carries (0.2 kg/m^2 over 42 mm^2 at 7 mm). A span across a 6 cm hollow at 10% stretch resists
  being pulled in about 90 times harder (8 T A / (HOLD L^2)), so taut fabric bridges, sagging about 1% of the hollow's depth; only slack fabric
  follows the hold. A modelling stand-in, not measured: sensitivity in the race record.
- elastic, per span: k / 2 * max(length - rest, 0)^2, tension only.
Not in it: DAMP, which only slows each step and is gone once nothing moves; fold pins (a race case is the whole garment).
Twin: wrap_block.solve (see its docstring). Spec: knowledge/engineering/app/solver-race-plan.md.
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import wrap_block as W  # noqa: E402


HOLD = 1.0e-4  # twin: gpu.HOLD


class Energy:
	def __init__(self, case, surface='nearest', contact='both', hold=HOLD):
		self.contact, self.hold = contact, hold
		self.tris = case['tris']
		rest = case['rest']
		Dm = np.stack([rest[:, 1] - rest[:, 0], rest[:, 2] - rest[:, 0]], axis=2)
		self.Dm_inv = np.linalg.inv(Dm)
		self.area = 0.5 * np.abs(np.linalg.det(Dm))
		self.facing = case['facing']
		self.gather, self.plane = float(case['gather']), float(case['plane'])
		el = case['elastic']
		self.si, self.sj, self.rest_len, self.k = el[:, 0].astype(int), el[:, 1].astype(int), el[:, 2], el[:, 3]
		self.part = case['sleeve'].astype(bool)
		self.surface = W.Surface(case['surface_P'], case['surface_idx'], case['surface_arm'])
		self.was = None  # the last normals, so a point is not matched across to a surface facing the other way (as solve)
		self.field = None
		if surface == 'field':
			from surface_field import PartFields
			self.field = PartFields(case['surface_P'], case['surface_idx'], case['surface_arm'])

	def phi(self, s):
		g = self.gather
		return np.where(s > 1, (s - 1) ** 2, np.where(s < g, (g - s) ** 2, 0.0))

	def dphi(self, s):
		g = self.gather
		return np.where(s > 1, 2 * (s - 1), np.where(s < g, -2 * (g - s), 0.0))

	def __call__(self, x, keep_normals=True):
		"""Energy, gradient (n, 3) and the parts {membrane, stretch, squeeze, surface, elastic, inside_out, off_field}."""
		tris = self.tris
		grad = np.zeros_like(x)
		# surface
		off = 0
		if self.field is not None:
			d, gd, ok = self.field(x, self.part)
			off = int((~ok).sum())  # beyond the field's band: no pull back, so a solver must not go there
			n = gd / (np.linalg.norm(gd, axis=1, keepdims=True) + 1e-12)
		else:
			v = self.surface.nearest(x, self.was, part=self.part)
			n = self.surface.N[v]
			gd = n
			d = ((x - self.surface.P[v]) * n).sum(1)
			if keep_normals:
				self.was = n
		kd = np.where(d < 0, self.plane, self.hold) if self.contact == 'push' else np.full(len(d), self.plane)
		grad += (kd * d)[:, None] * gd
		e_surface = 0.5 * (kd * d ** 2).sum()
		# membrane
		Ds = np.stack([x[tris[:, 1]] - x[tris[:, 0]], x[tris[:, 2]] - x[tris[:, 0]]], axis=2)
		F = Ds @ self.Dm_inv
		U, s, Vt = np.linalg.svd(F, full_matrices=False)
		flip = (np.cross(F[:, :, 0], F[:, :, 1]) * n[tris].sum(1)).sum(1) * self.facing < 0
		sign = np.where(flip, -1.0, 1.0)
		s2 = s[:, 1] * sign
		p1, p2 = self.phi(s[:, 0]), self.phi(s2)
		e_stretch = 0.5 * (self.area * (np.where(s[:, 0] > 1, p1, 0) + np.where(s2 > 1, p2, 0))).sum()
		e_membrane = 0.5 * (self.area * (p1 + p2)).sum()
		dF = 0.5 * self.area[:, None, None] * (U * np.stack([self.dphi(s[:, 0]), sign * self.dphi(s2)], axis=1)[:, None, :]) @ Vt
		H = dF @ self.Dm_inv.transpose(0, 2, 1)
		np.add.at(grad, tris[:, 1], H[:, :, 0])
		np.add.at(grad, tris[:, 2], H[:, :, 1])
		np.add.at(grad, tris[:, 0], -H[:, :, 0] - H[:, :, 1])
		# elastic
		span = x[self.sj] - x[self.si]
		now = np.linalg.norm(span, axis=1) + 1e-12
		ext = np.maximum(now - self.rest_len, 0)
		e_elastic = 0.5 * (self.k * ext ** 2).sum()
		f = (self.k * ext / now)[:, None] * span
		np.add.at(grad, self.sj, f)
		np.add.at(grad, self.si, -f)
		parts = dict(membrane=e_membrane, stretch=e_stretch, squeeze=e_membrane - e_stretch, surface=e_surface, elastic=e_elastic, inside_out=int(flip.sum()), off_field=off)
		return e_membrane + e_surface + e_elastic, grad, parts


def alternating_residual(case, x, was):
	"""What today's solver itself sees at x: the out-of-balance force of its global step, with its own local step (cot-weighted fit, clipped cotangents)
	and the given normals. Zero where it has stopped moving. Same arithmetic as wrap_block.solve; DAMP cancels at a stopped point."""
	tris, rest, facing = case['tris'], case['rest'], case['facing']
	surface = W.Surface(case['surface_P'], case['surface_idx'], case['surface_arm'])
	target, normal = surface.project(x, was, case['sleeve'].astype(bool))
	cots = np.zeros((len(tris), 3))
	for k in range(3):
		u, v = rest[:, (k + 1) % 3] - rest[:, k], rest[:, (k + 2) % 3] - rest[:, k]
		cots[:, k] = np.clip((u * v).sum(1) / (np.abs(u[:, 0] * v[:, 1] - u[:, 1] * v[:, 0]) + 1e-12), 0.02, 6)
	E = np.stack([rest[:, 2] - rest[:, 1], rest[:, 0] - rest[:, 2], rest[:, 1] - rest[:, 0]], axis=1)
	e3 = np.stack([x[tris[:, 2]] - x[tris[:, 1]], x[tris[:, 0]] - x[tris[:, 2]], x[tris[:, 1]] - x[tris[:, 0]]], axis=1)
	U, _, Vt = np.linalg.svd(np.einsum('tk,tki,tkj->tij', cots, e3, E), full_matrices=False)
	R = U @ Vt
	wrong = (np.cross(R[:, :, 0], R[:, :, 1]) * normal[tris].sum(1)).sum(1) * facing < 0
	U[wrong, :, 1] *= -1
	flat_inv = np.linalg.inv(np.stack([rest[:, 1] - rest[:, 0], rest[:, 2] - rest[:, 0]], axis=2))
	keep = np.clip(np.linalg.svd(np.stack([x[tris[:, 1]] - x[tris[:, 0]], x[tris[:, 2]] - x[tris[:, 0]]], axis=2) @ flat_inv, compute_uv=False), float(case['gather']), 1.0)
	R = U * keep[:, None, :] @ Vt
	rot = np.einsum('tij,tkj->tki', R, E)
	r = np.zeros_like(x)
	for k in range(3):
		i, j = tris[:, (k + 1) % 3], tris[:, (k + 2) % 3]
		w = (cots[:, k] / 2)[:, None] * ((x[j] - x[i]) - rot[:, k])
		np.add.at(r, j, w)
		np.add.at(r, i, -w)
	el = case['elastic']
	si, sj, L, kk = el[:, 0].astype(int), el[:, 1].astype(int), el[:, 2], el[:, 3]
	span = x[sj] - x[si]
	now = np.linalg.norm(span, axis=1, keepdims=True) + 1e-12
	f = kk[:, None] * (span - np.minimum(L[:, None], now) * span / now)
	np.add.at(r, sj, f)
	np.add.at(r, si, -f)
	r += float(case['plane']) * normal * ((x - target) * normal).sum(1, keepdims=True)
	return r
