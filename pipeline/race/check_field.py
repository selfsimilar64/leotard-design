"""Stage 1, second part: the smooth distance field in place of today's nearest-vertex plane. Is it accurate, is its gradient right, does today's
settled answer stay put under it, and can a line-search method (L-BFGS) now run on the energy?
    python pipeline/race/check_field.py [pose]
Reads app/captures/race/case-young-<pose>.npz (make_case.py). Spec: knowledge/engineering/app/solver-race-plan.md.
"""
import os
import sys
import time

import numpy as np
from scipy.optimize import minimize
from scipy.spatial import cKDTree

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from energy import Energy, alternating_residual  # noqa: E402

CAP = os.path.join(HERE, '..', '..', 'app', 'captures', 'race')


def mm(d):
	d = np.asarray(d) * 1000
	return f'mean {d.mean():6.3f}, 95% {np.percentile(d, 95):6.3f}, max {d.max():6.3f} mm'


def lbfgs(En, xs, iters, label, ref=None, away=None):
	trace = []
	f = lambda z: (lambda e, g, _: (e, g.ravel()))(*En(z.reshape(-1, 3)))
	t = time.perf_counter()
	res = minimize(f, xs.ravel(), jac=True, method='L-BFGS-B', callback=lambda z: trace.append(z.reshape(-1, 3).copy()), options=dict(maxiter=iters, maxcor=20, ftol=1e-15, gtol=1e-10))
	xe = res.x.reshape(-1, 3)
	e, g, p = En(xe)
	print(f'  {label}: {res.nit} iterations, {res.nfev} evaluations, {time.perf_counter() - t:.0f} s CPU ({res.message})')
	print(f'    E {e:.6e}; gradient rms {np.sqrt((g ** 2).sum(1).mean()):.2e}, max {np.linalg.norm(g, axis=1).max():.2e}; ' + ', '.join(f'{k} {v:.4g}' for k, v in p.items()))
	if ref is not None:
		for k in (10, 20, 40, 80, 160, 320, 640, 1280, 2560):
			if k <= len(trace):
				d = np.linalg.norm(trace[k - 1] - ref, axis=1)
				print(f'    after {k:4} iterations, from the reference: all {mm(d)}; away from the unsettled spots {mm(d[away])}')
	return xe


def main():
	pose = sys.argv[1] if len(sys.argv) > 1 else 'back-arched'
	case = dict(np.load(os.path.join(CAP, f'case-young-{pose}.npz')))
	x0, last, last_on = case['start'], case['alt_1440'], case['alt_1440_on']
	rng = np.random.default_rng(2)

	print('== 1. building the field')
	t = time.perf_counter()
	Ef = Energy(case, surface='field')
	print(f'  {time.perf_counter() - t:.1f} s on the CPU')
	F, sleeve = Ef.field, Ef.part

	print('\n== 2. accuracy')
	P, arm = case['surface_P'], case['surface_arm']
	for name, ids, field in (('torso', np.where(arm < 0.5)[0], F.torso), ('arm', np.where(arm > 0.15)[0], F.arm)):
		pick = rng.choice(ids, min(20000, len(ids)), replace=False)
		d, g, ok = field(P[pick])
		print(f'  {name} surface vertices: |d| {mm(np.abs(d[ok]))}; outside the band {(~ok).sum()}')
		n = Ef.surface.N[pick]
		for off in (-0.003, 0.003, 0.008):
			d, g, ok = field(P[pick] + off * n)
			print(f'    moved {off * 1000:+.0f} mm along the normal: d - offset {mm(np.abs(d[ok] - off))}; gradient length {np.linalg.norm(g[ok], axis=1).mean():.4f}; outside the band {(~ok).sum()}')
	d, g, ok = F(last_on, sleeve)
	print(f'  today\'s settled answer, put on its tangent planes: |d| {mm(np.abs(d))}')
	d_last, _, _ = F(last, sleeve)
	En = Energy(case)
	En(case['alt_1080'])
	v = En.surface.nearest(last, En.was, part=sleeve)
	d_old = ((last - En.surface.P[v]) * En.surface.N[v]).sum(1)
	print(f'  today\'s settled answer itself: field d against today\'s plane distance, difference {mm(np.abs(d_last - d_old))}')

	print('\n== 3. gradient against finite differences')
	x = last + rng.normal(0, 1e-3, last.shape)
	_, g, _ = Ef(x)
	worst = 0.0
	for _ in range(20):
		u = rng.normal(0, 1, x.shape)
		u /= np.linalg.norm(u)
		h = 1e-7
		fd = (Ef(x + h * u)[0] - Ef(x - h * u)[0]) / (2 * h)
		worst = max(worst, abs(fd - (g * u).sum()) / max(abs(fd), 1e-12))
	print(f'  worst relative difference over 20 directions: {worst:.2e}')

	# the spots today's solver never settles, and everything over 3 cm from them
	r = np.linalg.norm(alternating_residual(case, last, En.was), axis=1)
	hot = np.where(r > 0.01)[0]
	away = cKDTree(last[hot]).query(last)[0] > 0.03
	print(f'\n  unsettled points under today\'s solver: {len(hot)}; points over 3 cm from them: {away.sum()} of {len(last)}')

	print('\n== 4. L-BFGS on the field energy, from today\'s settled answer: does it stay put?')
	settled = lbfgs(Ef, last, 4000, 'from today\'s settled answer')
	d = np.linalg.norm(settled - last, axis=1)
	print(f'  moved: all {mm(d)}; away from the unsettled spots {mm(d[away])}')
	np.save(os.path.join(CAP, f'field-settled-young-{pose}.npy'), settled)

	print('\n== 5. L-BFGS on the field energy, from the start: does a line-search method now run?')
	lbfgs(Ef, x0, 4000, 'from the start', ref=settled, away=away)


if __name__ == '__main__':
	main()
