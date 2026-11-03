"""Where do two settled answers differ: along the body (sliding) or off it, and on which part? Today's method on the GPU after a set
time against the race's Newton reference, back-arched by default.
    <venv python> pipeline/race/sliding.py [case] [--seconds S]
Spec: knowledge/engineering/app/solver-race-plan.md (stage 4).
"""
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import race as R  # noqa: E402
import solvers as S  # noqa: E402
from gpu import Problem  # noqa: E402


def main():
	args = sys.argv[1:]
	name = args[0] if args and not args[0].startswith('--') else 'back-arched'
	secs = float(args[args.index('--seconds') + 1]) if '--seconds' in args else 10
	refs = {}
	for n in R.ORDER:
		f = os.path.join(R.CAP, f'ref-young-{n}.npy')
		if os.path.exists(f):
			refs[n] = (np.load(f), dict(np.load(os.path.join(R.CAP, f'case-young-{n}.npz'))))
	ref, case = refs[name]
	start, _ = R.start_of(case, refs, 'young')
	pb = Problem(case)
	x0 = pb.array(start)
	clock = R.Clock(secs)
	x = S.local_global(pb, x0, clock, cg_iters=10).numpy().astype(np.float64)
	pb.query(pb.array(ref))
	n = pb.gn.numpy().astype(np.float64)
	diff = x - ref
	normal = np.abs((diff * n).sum(1))
	along = np.linalg.norm(diff - (diff * n).sum(1, keepdims=True) * n, axis=1)
	total = np.linalg.norm(diff, axis=1)
	print(f'{name}, today\'s method after {secs:.0f} s against the reference (mm): all mean {1000 * total.mean():.2f}; along the body mean {1000 * along.mean():.2f}, '
		f'off it mean {1000 * normal.mean():.2f}; share of the squared difference along the body {100 * (along ** 2).sum() / (total ** 2).sum():.0f}%')
	tag = np.zeros(len(x), object)
	for t in np.unique(case['tag']):
		tag[np.unique(case['tris'][case['tag'] == t])] = t
	for t in np.unique(case['tag']):
		m = tag == t
		print(f'  {t:7}: mean {1000 * total[m].mean():5.2f}, along {1000 * along[m].mean():5.2f}, off {1000 * normal[m].mean():5.2f} mm; 95% {1000 * np.percentile(total[m], 95):5.2f}')
	# a coherent slide is a slide of whole regions: how alike are neighbouring points' differences?
	tris = case['tris']
	a, b = diff[tris[:, 0]], diff[tris[:, 1]]
	print(f'  neighbouring points\' differences: cosine median {np.median((a * b).sum(1) / (np.linalg.norm(a, axis=1) * np.linalg.norm(b, axis=1) + 1e-12)):.3f} (1: the region moved as one)')


if __name__ == '__main__':
	main()
