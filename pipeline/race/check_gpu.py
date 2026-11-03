"""Does the GPU energy (gpu.py) compute the race's energy? Against the numpy one (energy.py) and against its own finite differences.
    <venv python> pipeline/race/check_gpu.py [case]       (default case-young-back-arched)
Spec: knowledge/engineering/app/solver-race-plan.md (stage 3).
"""
import os
import sys
import time

import numpy as np
import warp as wp
import warp.sparse as ws

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from energy import Energy  # noqa: E402
from gpu import Problem  # noqa: E402

CAP = os.path.join(HERE, '..', '..', 'app', 'captures', 'race')


def main():
	name = sys.argv[1] if len(sys.argv) > 1 else 'case-young-back-arched'
	case = dict(np.load(os.path.join(CAP, name + '.npz')))
	t = time.perf_counter()
	pb = Problem(case)
	print(f'GPU problem set up in {time.perf_counter() - t:.2f} s: {pb.n} points, {pb.nt} triangles, {pb.ns} spans, {pb.nnz} Hessian blocks', flush=True)
	rng = np.random.default_rng(0)
	states = [('start', case['start'])] + ([('today, 1440 iterations', case['alt_1440'])] if 'alt_1440' in case else [])

	print('\n== against the numpy energy (surface by grid there, exact here: expect the surface part to differ slightly)', flush=True)
	En = Energy(case, surface='field', contact='push') if '--no-numpy' not in sys.argv else None
	for label, x in (states if En else ()):
		E, g, parts = En(x)
		X = pb.array(x)
		pb.evaluate(X, 1)
		gp = pb.parts(X)
		pb.evaluate(X, 1)
		gg = pb.grad.numpy().astype(np.float64)
		print(f'  {label}: membrane {parts["membrane"]:.6e} / {gp["membrane"]:.6e}; elastic {parts["elastic"]:.6e} / {gp["elastic"]:.6e}; surface {parts["surface"]:.6e} / {gp["surface"]:.6e}; inside out {parts["inside_out"]} / {gp["inside_out"]}', flush=True)
		rel = np.linalg.norm(g - gg, axis=1) / (np.linalg.norm(g, axis=1).mean() + 1e-30)
		print(f'    gradient: numpy against GPU, per point relative to the mean size: median {np.median(rel):.2e}, 99% {np.percentile(rel, 99):.2e}, max {rel.max():.2e}', flush=True)

	print('\n== GPU gradient and Hessian against its own finite differences (float32)', flush=True)
	for label, x in states:
		X = pb.array(x)
		pb.evaluate(X, 2)
		g0 = pb.grad.numpy().astype(np.float64)
		pb.save_energy()
		worst = 0
		for _ in range(6):
			v = rng.normal(size=x.shape)  # each coordinate moves about h: float32 holds positions near 1 m to about 6e-8 m
			h = 1e-5
			Xp, Xm = pb.array(x + h * v), pb.array(x - h * v)
			pb.evaluate(Xp, 0)
			ep = pb.delta()
			pb.evaluate(Xm, 0)
			em = pb.delta()
			fd = (ep - em) / (2 * h)
			worst = max(worst, abs(fd - (g0 * v).sum()) / (np.abs(g0 * v).sum() + 1e-30))
		print(f'  {label}: gradient, worst relative difference over 6 directions {worst:.2e}', flush=True)
		pb.evaluate(X, 2)
		psd = []
		for _ in range(4):
			v = rng.normal(size=x.shape)
			V = pb.array(v)
			Av = ws.bsr_mv(pb.A, V).numpy().astype(np.float64)
			psd.append((v * Av).sum() / (v * v).sum())
		print(f'  {label}: v.Hv / v.v over random v: min {min(psd):.3e} (projected Hessian: never below 0)', flush=True)
	# The Hessian is exact only where nothing is projected: the garment blown up 1.25 times (every triangle and span stretched), surface off
	x = case['start']
	x = x.mean(0) + 1.25 * (x - x.mean(0))
	plane, hold = pb.plane, pb.hold
	pb.plane = pb.hold = 0.0
	X = pb.array(x)
	pb.evaluate(X, 2)
	tri_s = pb.parts(X)
	worst = []
	for _ in range(4):
		v = rng.normal(size=x.shape)
		h = 1e-5
		pb.evaluate(pb.array(x + h * v), 1)
		gp_ = pb.grad.numpy().astype(np.float64)
		pb.evaluate(pb.array(x - h * v), 1)
		gm_ = pb.grad.numpy().astype(np.float64)
		pb.evaluate(X, 2)
		Av = ws.bsr_mv(pb.A, pb.array(v)).numpy().astype(np.float64)
		fd = (gp_ - gm_) / (2 * h)
		worst.append(np.linalg.norm(Av - fd) / np.linalg.norm(fd))
	print(f'  blown up 1.25x, surface off ({tri_s["inside_out"]} inside out): |Hv - FD| / |FD| worst over 4 directions {max(worst):.2e}', flush=True)
	pb.plane, pb.hold = plane, hold


if __name__ == '__main__':
	main()
