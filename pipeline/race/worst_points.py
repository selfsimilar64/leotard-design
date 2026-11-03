"""Where a friction re-fit stays furthest from the reference (race.py --mu): the worst points, whether the body holds them (contact force,
so friction), how high off the body they are, and whether the reference itself still moves there.
    <venv python> pipeline/race/worst_points.py [body] [case] [--seconds S]
Runs local/global, 10 CG for S seconds (5) from the race's start, then Newton 20 s more from the reference.
Spec: knowledge/engineering/app/solver-race-plan.md.
"""
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gpu as G  # noqa: E402
import race as R  # noqa: E402
import solvers as S  # noqa: E402
from gpu import Problem  # noqa: E402


def main():
	args = sys.argv[1:]
	pos = [a for a in args if not a.startswith('--')]
	key = pos[0] if pos else 'young'
	name = pos[1] if len(pos) > 1 else 'back-arched'
	seconds = float(args[args.index('--seconds') + 1]) if '--seconds' in args else 5.0
	refs = {}
	for n in R.ORDER:
		f = os.path.join(R.CAP, f'case-{key}-{n}.npz')
		rf = os.path.join(R.CAP, f'ref-{key}-{n}-friction.npy')
		if os.path.exists(f) and os.path.exists(rf):
			refs[n] = (np.load(rf), dict(np.load(f)))
	ref, case = refs[name]
	start, _ = R.start_of(case, refs, key)
	pb = Problem(case, mu=G.MU)
	x0 = pb.array(start)
	pb.set_anchor(x0)
	run = lambda x, rec: S.local_global(pb, x, rec, cg_iters=10)
	run(x0, R.Clock(0.0))
	x = run(x0, R.Clock(seconds)).numpy().astype(np.float64)
	err = np.linalg.norm(x - ref, axis=1) * 1000
	pb.freeze(pb.array(ref))
	lam, d = pb.lam.numpy(), pb.d.numpy() * 1000
	# does the reference itself still move?
	S.newton(pb, pb.array(ref), R.Clock(0.0), **R.REFERENCE)
	more = S.newton(pb, pb.array(ref), R.Clock(20.0), **R.REFERENCE).numpy().astype(np.float64)
	moved = np.linalg.norm(more - ref, axis=1) * 1000
	sleeve = case['sleeve'].astype(bool)
	print(f'{name}: local/global {seconds:g} s against the reference: mean {err.mean():.2f}, 95% {np.percentile(err, 95):.2f}, max {err.max():.2f} mm; '
		f'the reference moves mean {moved.mean():.2f}, max {moved.max():.2f} mm in 20 s more')
	touch = lam > 0
	for label, keep in (('pressing on the body (friction holds it)', touch), ('not pressing (no friction)', ~touch)):
		print(f'  {label}: {keep.sum()} points, error mean {err[keep].mean():.2f}, 95% {np.percentile(err[keep], 95):.2f}, max {err[keep].max():.2f} mm')
	worst = np.argsort(-err)[:400]
	print(f'  worst 400 (from {err[worst[-1]]:.1f} mm): {touch[worst].mean() * 100:.0f}% pressing, {sleeve[worst].mean() * 100:.0f}% on the sleeve, '
		f'height off the body median {np.median(d[worst]):.1f} mm; the reference moves there median {np.median(moved[worst]):.2f}, max {moved[worst].max():.2f} mm')
	print(f'  points over 5 mm: {(err > 5).sum()}; of those the reference itself moves over 1 mm at {((err > 5) & (moved > 1)).sum()}')
	P = start[worst[:20]]
	print('  worst 20 at (x, y, z m):', ' '.join(f'({p[0]:.2f},{p[1]:.2f},{p[2]:.2f})' for p in P[:8]))


if __name__ == '__main__':
	main()
