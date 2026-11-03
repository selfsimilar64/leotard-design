"""The solver race on the GPU (solver race, stages 2-4): for each case, a reference answer, then every candidate from the same start,
scored on how far it is from the reference against wall time: by position (mean / 95% / max), and by shape, each point's
height off the body against the reference's, which sliding along the body hardly changes (frictionless, the garment slides almost
freely; 97% of two solvers' disagreement on back-arched was such sliding, sliding.py).
    <venv python> pipeline/race/race.py [body] [--ref SECONDS] [--budget SECONDS] [--only 'name|name'] [--cases name,name]
Starts chain as the app's would (make_case.py): the standing case's reference becomes the standing fit; a pose starts from it placed by
surface coordinates; a cutout starts from its uncut parent's reference.
Writes app/captures/race/ref-<body>-<case>.npy and results-<body>.json (git-ignored, derived from licensed data).
Spec: knowledge/engineering/app/solver-race-plan.md.
"""
import json
import os
import sys
import time

import numpy as np
import warp as wp

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))
import solvers as S  # noqa: E402
import wrap_block as W  # noqa: E402
from gpu import Problem  # noqa: E402
from multilevel import Hierarchy  # noqa: E402

CAP = os.path.join(HERE, '..', '..', 'app', 'captures', 'race')
ORDER = ('standing', 'back-arched', 'passe', 'lunge-arms-up', 'standing-back-keyhole', 'standing-front-side-cutout', 'back-arched-back-keyhole')
BAR = (1.0, 3.0, 5.0)  # mm from the reference: mean, 95%, max (owner accepted, 2026-11-02)
TIMES = (0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 7.5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240)
REFERENCE = dict(reg=0.01, max_move=0.003, eta=1e-3, cg_iters=3000)


class Clock(S.Recorder):
	"""Keeps an iterate at each of TIMES, so a fast solver's thousands of iterations do not fill the GPU."""

	def __init__(self, budget):
		super().__init__(budget)
		self.next = 0

	def __call__(self, x, info=None):
		wp.synchronize()
		t = time.perf_counter()
		self.it += 1
		now = t - self.t0 - self.lost
		if self.next < len(TIMES) and now >= TIMES[self.next]:
			self.marks.append((now, self.it, wp.clone(x), info))
			while self.next < len(TIMES) and now >= TIMES[self.next]:
				self.next += 1
		wp.synchronize()
		self.lost += time.perf_counter() - t
		return now < self.budget

	def finish(self, x):
		self.marks.append((self.elapsed, self.it, wp.clone(x), None))


def candidates(pb, case):
	"""name -> (set-up function returning the run function, what it is)."""
	def ml(levels=2):
		return lambda: Hierarchy(case, pb.n, levels=levels)

	def make(kind, **kw):
		def setup():
			extra = {}
			if kind == 'vbd':
				extra['colours'] = S.colour(pb)
			if 'mg' in kw:
				h = kw.pop('mg')()
				extra['precond'] = h.operator
			fn = dict(newton=S.newton, local_global=S.local_global, lbfgs=S.lbfgs, vbd=S.vbd)[kind]
			return lambda x0, rec: fn(pb, x0, rec, **extra, **kw)
		return setup
	return {
		'local-global, 10 CG': make('local_global', cg_iters=10),
		'local-global, 30 CG': make('local_global', cg_iters=30),
		'local-global, multi-level, 3 CG': make('local_global', cg_iters=3, mg=ml()),
		'Newton, block Jacobi': make('newton', reg=0.01, max_move=0.003, eta=1e-2, cg_iters=500),
		'Newton, block Jacobi, step cut per point': make('newton', reg=0.01, max_move=0.003, eta=1e-2, cg_iters=500, per_point=True),
		'Newton, multi-level': make('newton', reg=0.01, max_move=0.003, eta=1e-2, cg_iters=100, mg=ml()),
		'L-BFGS': make('lbfgs', history=10, reg=0.01, max_move=0.003),
		'VBD': make('vbd', reg=1e-3, max_move=0.002),
	}


def errors(x, ref):
	d = np.linalg.norm(x - ref, axis=1) * 1000
	return float(d.mean()), float(np.percentile(d, 95)), float(d.max())


def start_of(case, refs, key):
	"""The start the app would have: the parent case's reference, carried over (see make_case.py)."""
	parent = str(case['parent'])
	if not parent:
		return case['start'], 'today\'s standing fit'
	pref, pcase = refs[parent]
	start = case['start'].copy()
	remap, premap = case['remap'], pcase['remap']
	both = (remap >= 0) & (premap >= 0)
	if parent == 'standing' and not np.array_equal(case['surface_P'], pcase['surface_P']):
		standing = W.Surface(pcase['surface_P'], pcase['surface_idx'], pcase['surface_arm'])
		face, weight = standing.hosts(pref, part=pcase['sleeve'].astype(bool))
		placed = (case['surface_P'][face] * weight[:, :, None]).sum(1)
		start[remap[both]] = placed[premap[both]]
		return start, 'the standing reference placed by surface coordinates'
	start[remap[both]] = pref[premap[both]]
	return start, f'the {parent} reference'


def main():
	args = sys.argv[1:]
	opt = lambda k, d: args[args.index(k) + 1] if k in args else d
	key = args[0] if args and not args[0].startswith('--') else 'young'
	ref_s, budget = float(opt('--ref', 120)), float(opt('--budget', 30))
	only = opt('--only', None)
	names = [c for c in opt('--cases', ','.join(ORDER)).split(',')]
	path = os.path.join(CAP, f'results-{key}.json')
	results = json.load(open(path)) if os.path.exists(path) else {}
	refs = {}
	for name in ORDER:
		f = os.path.join(CAP, f'case-{key}-{name}.npz')
		if not os.path.exists(f):
			continue
		case = dict(np.load(f))
		rf = os.path.join(CAP, f'ref-{key}-{name}.npy')
		if name not in names:
			if os.path.exists(rf):
				refs[name] = (np.load(rf), case)
			continue
		start, came = start_of(case, refs, key)
		t = time.perf_counter()
		pb = Problem(case)
		wp.synchronize()
		setup = time.perf_counter() - t
		x0 = pb.array(start)
		print(f'\n== {name}: {pb.n} points, {pb.nt} triangles; start: {came}; problem set-up {setup:.2f} s', flush=True)
		res = results.get(name, {})
		res.update(points=pb.n, start=came, setup=setup)
		# reference
		if os.path.exists(rf) and '--redo-ref' not in args and res.get('start_hash') == float(np.abs(start).sum()):
			ref = np.load(rf)
		else:
			S.newton(pb, x0, Clock(0.0), **REFERENCE)
			clock = Clock(ref_s)
			xr = S.newton(pb, x0, clock, **REFERENCE)
			clock.finish(xr)
			ref = xr.numpy().astype(np.float64)
			late = [m for m in clock.marks if m[0] >= 0.75 * clock.marks[-1][0]][0]
			res['reference'] = dict(seconds=clock.marks[-1][0], iterations=clock.it, jitter=errors(late[2].numpy(), ref), parts=pb.parts(xr), **REFERENCE)
			res['start_hash'] = float(np.abs(start).sum())
			np.save(rf, ref)
			print(f'  reference: Newton {clock.it} iterations, {clock.marks[-1][0]:.0f} s; moved in its last quarter: mean {res["reference"]["jitter"][0]:.2f}, 95% {res["reference"]["jitter"][1]:.2f}, max {res["reference"]["jitter"][2]:.2f} mm', flush=True)
		refs[name] = (ref, case)
		res['start_error'] = errors(start, ref)
		print(f'  start against reference: mean {res["start_error"][0]:.2f}, 95% {res["start_error"][1]:.2f}, max {res["start_error"][2]:.2f} mm', flush=True)
		pb.parts(pb.array(ref))
		ref_d = pb.d.numpy().astype(np.float64)  # each point's height off the body: the shape, which sliding along the body hardly changes
		ref_e = res['reference']['parts']['total'] if 'reference' in res else pb.parts(pb.array(ref))['total']
		runs = res.setdefault('runs', {})
		for cname, make in candidates(pb, case).items():
			if only and cname not in only.split('|'):
				continue
			t = time.perf_counter()
			run = make()
			wp.synchronize()
			cset = time.perf_counter() - t
			run(x0, Clock(0.0))  # compile and warm up
			clock = Clock(budget)
			x = run(x0, clock)
			clock.finish(x)
			curve = []
			for sec, it, xc, _ in clock.marks:
				e = errors(xc.numpy().astype(np.float64), ref)
				p = pb.parts(xc)
				h = np.abs(pb.d.numpy().astype(np.float64) - ref_d) * 1000
				curve.append(dict(t=sec, it=it, mean=e[0], p95=e[1], max=e[2], energy=p['total'], gap=100 * (p['total'] - ref_e) / ref_e,
					h_mean=float(h.mean()), h_p95=float(np.percentile(h, 95)), h_max=float(h.max()), inside_out=p['inside_out'], inside_body=p['inside_body']))
			hit = next((c['t'] for c in curve if c['mean'] <= BAR[0] and c['p95'] <= BAR[1] and c['max'] <= BAR[2]), None)
			shape = next((c['t'] for c in curve if c['h_mean'] <= BAR[0] and c['h_p95'] <= BAR[1] and c['h_max'] <= BAR[2]), None)
			runs[cname] = dict(setup=cset, iterations=clock.it, per_iteration_ms=1000 * clock.marks[-1][0] / max(clock.it, 1), to_bar=hit, shape_to_bar=shape, curve=curve)
			end = curve[-1]
			print(f'  {cname:34} set-up {cset:5.2f} s, {1000 * clock.marks[-1][0] / max(clock.it, 1):7.2f} ms per iteration; to the bar: {"%.2f s" % hit if hit else "not in %.0f s" % budget}, its shape: {"%.2f s" % shape if shape else "not"}; '
				f'at the end mean {end["mean"]:.2f} 95% {end["p95"]:.2f} max {end["max"]:.2f} mm, energy {end["energy"]:.6f}', flush=True)
			del clock
		results[name] = res
		with open(path, 'w') as f:
			json.dump(results, f, indent=1)


if __name__ == '__main__':
	main()
