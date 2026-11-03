"""Stage 1 checks: is energy.py's gradient right, is it today's physics, and does today's alternating solver actually minimise it?
    python pipeline/race/check_energy.py [pose]
Reads app/captures/race/case-young-<pose>.npz (make_case.py). Spec: knowledge/engineering/app/solver-race-plan.md.
"""
import os
import sys
import time

import numpy as np
from scipy.optimize import minimize

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from energy import Energy, alternating_residual  # noqa: E402

CAP = os.path.join(HERE, '..', '..', 'app', 'captures', 'race')


def mm(a, b):
	d = np.linalg.norm(a - b, axis=1) * 1000
	return f'mean {d.mean():6.2f}, 95% {np.percentile(d, 95):6.2f}, max {d.max():6.2f} mm'


def size(g):
	r = np.linalg.norm(g, axis=1)
	return f'rms {np.sqrt((r ** 2).mean()):.3e}, 95% {np.percentile(r, 95):.3e}, max {r.max():.3e}'


def main():
	pose = sys.argv[1] if len(sys.argv) > 1 else 'back-arched'
	case = dict(np.load(os.path.join(CAP, f'case-young-{pose}.npz')))
	x0 = case['start']
	rng = np.random.default_rng(1)

	print('== 1. the gradient against finite differences, near the start')
	En = Energy(case)
	En(x0)
	x = x0 + rng.normal(0, 1e-3, x0.shape)
	En(x)  # fixes the normals used for matching
	_, g, _ = En(x, keep_normals=False)
	worst = 0.0
	for _ in range(20):
		d = rng.normal(0, 1, x.shape)
		d /= np.linalg.norm(d)
		h = 1e-7
		fd = (En(x + h * d, False)[0] - En(x - h * d, False)[0]) / (2 * h)
		worst = max(worst, abs(fd - (g * d).sum()) / max(abs(fd), 1e-12))
	print(f'  worst relative difference over 20 directions: {worst:.2e}')

	print('\n== 2. how much the written energy differs from what the alternating solver balances')
	rest = case['rest']
	cots = np.zeros((len(rest), 3))
	for k in range(3):
		u, v = rest[:, (k + 1) % 3] - rest[:, k], rest[:, (k + 2) % 3] - rest[:, k]
		cots[:, k] = (u * v).sum(1) / (np.abs(u[:, 0] * v[:, 1] - u[:, 1] * v[:, 0]) + 1e-12)
	clipped = ((cots < 0.02) | (cots > 6)).any(1)
	print(f'  triangles whose cotangent weights solve clips: {clipped.sum()} of {len(rest)} ({100 * clipped.mean():.2f}%)')
	_, g, parts = En(x, keep_normals=False)
	r = alternating_residual(case, x, En.was)
	print(f'  at a perturbed start: written gradient {size(g)}; alternating residual {size(r)}; difference {size(g - r)}')
	print(f'  energy parts: ' + ', '.join(f'{k} {v:.4g}' for k, v in parts.items()))

	keys = sorted(int(k[4:]) for k in case if k.startswith('alt_') and not k.endswith('_on'))
	if not keys:
		print('\n(no long solve in the case yet: run make_case.py to the end for checks 3 and 4)')
		return
	ref = case[f'alt_{keys[-1]}']

	print('\n== 3. today\'s solver, step by step: energy, the written gradient, its own residual')
	En = Energy(case)
	e, g, p = En(x0)
	print(f'  start (reuse)  E {e:.6e}  gradient {size(g)}  from the last iterate {mm(x0, ref)}')
	for k in keys:
		xk = case[f'alt_{k}']
		e, g, p = En(xk)
		r = alternating_residual(case, xk, En.was)
		print(f'  {k:5} iters    E {e:.6e}  gradient {size(g)}  own residual {size(r)}  from the last iterate {mm(xk, ref)}  inside out {p["inside_out"]}')
	print('  parts at the last iterate: ' + ', '.join(f'{k} {v:.4g}' for k, v in p.items()))

	print('\n== 4. minimising the written energy directly (L-BFGS on the CPU), from the last iterate and from the start')
	for label, xs, iters in (('from the last iterate', ref, 3000), ('from the start', x0, 3000)):
		En = Energy(case)
		En(xs)
		trace = []

		def f(z):
			e, g, _ = En(z.reshape(-1, 3))
			return e, g.ravel()

		def cb(z):
			trace.append(z.reshape(-1, 3).copy())
		t = time.perf_counter()
		res = minimize(f, xs.ravel(), jac=True, method='L-BFGS-B', callback=cb, options=dict(maxiter=iters, maxcor=20, ftol=1e-15, gtol=1e-12))
		xe = res.x.reshape(-1, 3)
		e, g, p = En(xe)
		e_ref = Energy(case)(ref)[0]
		print(f'  {label}: {res.nit} iterations, {res.nfev} evaluations, {time.perf_counter() - t:.0f} s CPU ({res.message})')
		print(f'    E {e:.6e} against today\'s last iterate {e_ref:.6e} ({100 * (e - e_ref) / e_ref:+.3f}%); gradient {size(g)}; inside out {p["inside_out"]}')
		print(f'    moved from the start of this run {mm(xs, xe)}; from today\'s last iterate {mm(ref, xe)}')
		for k in (10, 20, 40, 80, 160, 320, 640, 1280, 2560):
			if k <= len(trace):
				print(f'    after {k:4} iterations: from today\'s last iterate {mm(trace[k - 1], ref)}')
		np.save(os.path.join(CAP, f'lbfgs-young-{pose}-{"ref" if xs is ref else "start"}.npy'), xe)


if __name__ == '__main__':
	main()
