"""How much does the weak hold (HOLD, gpu.py) decide the fit and the race? Back-arched, from the standing reference placed by surface
coordinates: per HOLD, Newton for a reference, then today's method on the GPU against it.
    <venv python> pipeline/race/hold_sensitivity.py [--ref SECONDS] [--budget SECONDS]
Needs race.py's young references (standing, back-arched). Spec: knowledge/engineering/app/solver-race-plan.md (stage 4, hold).
"""
import os
import sys

import numpy as np
import warp as wp

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import race as R  # noqa: E402
import solvers as S  # noqa: E402
from gpu import Problem  # noqa: E402

HOLDS = (1e-4, 1e-3, 1e-2, 1e-1)


def main():
	args = sys.argv[1:]
	opt = lambda k, d: float(args[args.index(k) + 1]) if k in args else d
	ref_s, budget = opt('--ref', 60), opt('--budget', 10)
	cases = {n: dict(np.load(os.path.join(R.CAP, f'case-young-{n}.npz'))) for n in ('standing', 'back-arched')}
	refs = {'standing': (np.load(os.path.join(R.CAP, 'ref-young-standing.npy')), cases['standing'])}
	case = cases['back-arched']
	start, _ = R.start_of(case, refs, 'young')
	base = np.load(os.path.join(R.CAP, 'ref-young-back-arched.npy'))
	for hold in HOLDS:
		pb = Problem(case, hold=hold)
		x0 = pb.array(start)
		S.newton(pb, x0, R.Clock(0.0), **R.REFERENCE)
		clock = R.Clock(ref_s)
		xr = S.newton(pb, x0, clock, **R.REFERENCE)
		clock.finish(xr)
		ref = xr.numpy().astype(np.float64)
		late = [m for m in clock.marks if m[0] >= 0.75 * clock.marks[-1][0]][0]
		p = pb.parts(xr)
		d = pb.d.numpy()
		print(f'\n== HOLD {hold:g}: reference energy {p["total"]:.6f}; off the body over 2 mm: {p["off_body"]} points, furthest {1000 * p["max_off"]:.1f} mm; '
			f'over 5 mm: {(d > 0.005).sum()}; jitter in its last quarter {R.errors(late[2].numpy(), ref)[0]:.2f} / {R.errors(late[2].numpy(), ref)[2]:.2f} mm (mean / max)', flush=True)
		print(f'  against the HOLD 1e-4 reference: mean {R.errors(ref, base)[0]:.2f}, 95% {R.errors(ref, base)[1]:.2f}, max {R.errors(ref, base)[2]:.2f} mm', flush=True)
		run = lambda x, rec: S.local_global(pb, x, rec, cg_iters=10)
		run(x0, R.Clock(0.0))
		clock = R.Clock(budget)
		x = run(x0, clock)
		clock.finish(x)
		for sec, it, xc, _ in clock.marks:
			if sec >= 0.9 and (sec < 1.1 or 1.9 < sec < 2.2 or 4.9 < sec < 5.6 or sec >= budget - 0.1):
				e = R.errors(xc.numpy().astype(np.float64), ref)
				print(f'  local-global, 10 CG at {sec:5.1f} s: mean {e[0]:.2f}, 95% {e[1]:.2f}, max {e[2]:.2f} mm; energy {pb.parts(xc)["total"]:.6f}', flush=True)
		wp.synchronize()


if __name__ == '__main__':
	main()
