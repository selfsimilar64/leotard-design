"""The race's re-fit cases for the app's tuning page (app/refit.html, app/src/fit/): plain little-endian arrays the WebGPU solver reads.
    <venv python> pipeline/race/export_app.py [body]
Per case writes app/captures/refit/<body>-<case>.json (sizes, settings, the Python run to compare against) and .bin (the arrays, in the
order the JSON lists them). Git-ignored: the body surfaces come from licensed data.
Everything the solver needs is computed here exactly as gpu.Problem does (the body's pseudo-normals by gpu.part_geometry), so the port
has one source; the app builds only its bounding-volume tree. Also stored: the start (race.start_of), the reference with friction, and
Python's local/global (10 CG, friction) after 1 and 20 iterations, for checking the port step by step.
Spec: knowledge/engineering/app/solver-race-plan.md (app port).
"""
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))
import gpu as G  # noqa: E402
import race as R  # noqa: E402
import solvers as S  # noqa: E402

OUT = os.path.join(HERE, '..', '..', 'app', 'captures', 'refit')


class Keep(S.Recorder):
	def __init__(self, its):
		super().__init__(1e9)
		self.its, self.xs = set(its), {}

	def __call__(self, x, info=None):
		self.it += 1
		if self.it in self.its:
			self.xs[self.it] = x.numpy()
		return self.it < max(self.its)


def main():
	key = sys.argv[1] if len(sys.argv) > 1 else 'young'
	os.makedirs(OUT, exist_ok=True)
	refs = {}
	results = json.load(open(os.path.join(R.CAP, f'results-{key}-friction.json')))
	listed = []
	for name in R.ORDER:
		f = os.path.join(R.CAP, f'case-{key}-{name}.npz')
		rf = os.path.join(R.CAP, f'ref-{key}-{name}-friction.npy')
		if not (os.path.exists(f) and os.path.exists(rf)):
			continue
		case = dict(np.load(f))
		ref = np.load(rf)
		refs[name] = (ref, case)
		start, came = R.start_of(case, refs, key)
		pb = G.Problem(case, mu=G.MU)
		# Python's own run, for the port's step-by-step check
		x0 = pb.array(start)
		pb.set_anchor(x0)
		keep = Keep((1, 20))
		S.local_global(pb, x0, keep, cg_iters=10)
		arrays = []

		def put(label, a, dtype):
			arrays.append((label, np.ascontiguousarray(a, dtype=dtype)))

		tris = pb.tris_np
		Dm = np.stack([case['rest'][:, 1] - case['rest'][:, 0], case['rest'][:, 2] - case['rest'][:, 0]], axis=2)
		put('tris', tris, np.int32)
		put('Dinv', np.linalg.inv(Dm).reshape(-1, 4), np.float32)  # row-major [00, 01, 10, 11], as gpu.tri_b reads it
		put('area', pb.area_np, np.float32)
		put('facing', case['facing'], np.float32)
		el = case['elastic']
		put('si', el[:, 0], np.int32)
		put('sj', el[:, 1], np.int32)
		put('rest_len', el[:, 2], np.float32)
		put('k', el[:, 3], np.float32)
		put('sleeve', pb.sleeve_np, np.int32)
		put('start', start, np.float32)
		put('reference', ref, np.float32)
		put('python_1', keep.xs[1], np.float32)
		put('python_20', keep.xs[20], np.float32)
		Q, idx, arm = case['surface_P'], case['surface_idx'].reshape(-1, 3), case['surface_arm']
		put('body', Q, np.float32)
		part_sizes = []
		for label, sel in (('torso', arm < 0.5), ('arm', arm > 0.15)):  # as gpu.Problem
			t = idx[sel[idx].all(1)].astype(np.int32)
			fn, en, eb, vn, vb = G.part_geometry(Q, t)
			put(label + '_tris', t, np.int32)
			put(label + '_fn', fn, np.float32)
			put(label + '_en', en, np.float32)  # per face, the edge opposite each corner
			put(label + '_eb', eb, np.int32)
			put(label + '_vn', vn, np.float32)
			put(label + '_vb', vb, np.int32)
			part_sizes.append(len(t))
		run = results.get(name, {}).get('runs', {}).get('local-global, 10 CG')
		head = dict(case=name, body=key, start=came, n=pb.n, nt=pb.nt, ns=pb.ns, body_points=len(Q), part_faces=part_sizes,
			plane=pb.plane, gather=pb.gather, hold=pb.hold, turn=pb.turn, damp=G.DAMP, mu=G.MU, stick=G.STICK,
			python_curve=run['curve'] if run else None, python_ms_per_iteration=run['per_iteration_ms'] if run else None, arrays=[])
		offset = 0
		with open(os.path.join(OUT, f'{key}-{name}.bin'), 'wb') as f:
			for label, a in arrays:
				f.write(a.tobytes())
				head['arrays'].append(dict(name=label, type='i32' if a.dtype == np.int32 else 'f32', offset=offset, length=int(a.size), shape=list(a.shape)))
				offset += a.nbytes
		with open(os.path.join(OUT, f'{key}-{name}.json'), 'w') as f:
			json.dump(head, f, indent=1)
		listed.append(name)
		print(f'wrote {key}-{name}: {pb.n} points, {offset / 1e6:.1f} MB; start: {came}', flush=True)
	with open(os.path.join(OUT, f'{key}-cases.json'), 'w') as f:
		json.dump(listed, f)


if __name__ == '__main__':
	main()
