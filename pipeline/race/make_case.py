"""The race's cases: each re-fit as plain arrays (solver race, stage 2).
    python pipeline/race/make_case.py [body] [--long]     (default young; high cut, whole garment)
Writes app/captures/race/case-<body>-<name>.npz (git-ignored, derived from licensed data), one per case:
  standing                    the standing fit, carried into the race's physics: the parent of the others, not itself a re-fit
  back-arched, passe, lunge-arms-up    a pose, from the standing fit placed by surface coordinates (what the app shows)
  standing-back-keyhole, standing-front-side-cutout    a cutout, from the uncut standing fit
  back-arched-back-keyhole    a cutout in a pose, from the standing cutout's fit placed by surface coordinates: every pose starts from
                              the standing fit of the same design, so the fit does not depend on the order of edits and poses
Poses exist for young only; another body gets the standing cases.
Each start here comes from today's solver. The race replaces it by its parent case's settled answer in the race's own physics
(`parent`, `remap`: race.py), since that is what the app would hold when the edit is made.
Also per case, for multi-level solvers (multilevel.py): P14, P28, the coarse meshes' prolongation (fine point = weights of a coarse
triangle, by flat position), and P14to28 between the two coarse meshes.
--long: also run today's solver 1440 iterations on each pose case and keep its iterates (alt_<k>; stage 1 used them).
Spec: knowledge/engineering/app/solver-race-plan.md (stage 2).
"""
import json
import os
import sys
import time

import numpy as np
from scipy.spatial import cKDTree

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import pose_resolve as PR  # noqa: E402
import speed_probe as SP  # noqa: E402  (works on copies of its inputs in a temporary folder)
import wrap_block as W  # noqa: E402
from refit_bench import CUTS  # noqa: E402

OUT = os.path.join(HERE, '..', '..', 'app', 'captures', 'race')
ITERS = 1440
CHECKS = (10, 20, 40, 80, 160, 240, 320, 480, 720, 1080, 1440)
POSES = ('back-arched', 'passe', 'lunge-arms-up')
STANDING_CUTS = ('back keyhole', 'front side cutout')
POSE_CUTS = (('back-arched', 'back keyhole'),)
COARSE = (14.0, 28.0)


def cut(G, name):
	"""G with a cutout's triangles taken away, as refit_bench (edges rough, no elastic on them); and which triangles stayed."""
	_, piece, x, y, rx, ry = next(c for c in CUTS if c[0] == name)
	centre = G['rest'].mean(1) * 1000
	keep = ~((G['tag'] == piece) & (((centre[:, 0] - x) / rx) ** 2 + ((centre[:, 1] - y) / ry) ** 2 < 1))
	out = dict(G)
	for k in ('tris', 'rest', 'tag', 'facing'):
		out[k] = G[k][keep]
	on = np.isin(G['elastic'][:, :2].astype(int), np.unique(out['tris'])).all(1)
	out['elastic'] = G['elastic'][on]
	return out, keep


def prolong(Gf, Gc, rf, tf, rc, tc, keep_c):
	"""Fine whole-garment points as weights of coarse whole-garment points: each fine point's flat position inside a coarse
	flat triangle of the same piece (outside every one, the nearest triangle's weights carry on, as wrap_block.locate).
	Seam points belong to two pieces: their rows are averaged."""
	rows, cols, vals = [], [], []
	seen = np.zeros(rf.max() + 1)
	orig_tag = np.concatenate([[name] * len(p.T) for name, p in Gc['pieces'].items()])
	for name, pf in Gf['pieces'].items():
		pc = Gc['pieces'][name]
		fid = Gf['welded'][Gf['offs'][name] + np.arange(len(pf.V))]
		cid = Gc['welded'][Gc['offs'][name] + np.arange(len(pc.V))]
		T = pc.T[keep_c[orig_tag == name]]
		tree = cKDTree(pc.V[T].mean(1))
		_, near = tree.query(pf.V, k=min(12, len(T)))
		a, b, c = (pc.V[T[near][..., k]] for k in range(3))
		m = np.stack([b - a, c - a], axis=-1)  # (n, k, 2, 2)
		det = m[..., 0, 0] * m[..., 1, 1] - m[..., 0, 1] * m[..., 1, 0]
		r = pf.V[:, None] - a
		l1 = (r[..., 0] * m[..., 1, 1] - r[..., 1] * m[..., 0, 1]) / det
		l2 = (m[..., 0, 0] * r[..., 1] - m[..., 1, 0] * r[..., 0]) / det
		w = np.stack([1 - l1 - l2, l1, l2], -1)
		best = w.min(-1).argmax(1)
		i = np.arange(len(pf.V))
		w, t = w[i, best], T[near[i, best]]
		for side in (0, 1):
			f = rf[fid] if side == 0 else rf[tf[fid]]
			cc = rc[cid] if side == 0 else rc[tc[cid]]
			ok = f >= 0
			for k in range(3):
				rows.append(f[ok])
				cols.append(cc[t[ok, k]])
				vals.append(w[ok, k])
			np.add.at(seen, f[ok], 1)
	rows, cols, vals = np.concatenate(rows), np.concatenate(cols), np.concatenate(vals)
	assert (cols >= 0).all() and (seen > 0).all()
	vals = vals / seen[rows]
	return np.stack([rows, cols]).astype(np.int32), vals


def main():
	args = [a for a in sys.argv[1:] if not a.startswith('--')]
	key = args[0] if args else 'young'
	long = '--long' in sys.argv
	os.makedirs(OUT, exist_ok=True)
	with open(os.path.join(PR.CAPTURES, f'wrap-body-{key}.json'), encoding='utf-8') as f:
		body = json.load(f)
	P, idx, arm = np.array(body['P'], float).reshape(-1, 3), np.array(body['idx'], int), np.array(body['wArm'], float)
	standing = W.Surface(P, idx, arm)
	coarse = {}
	for step in COARSE:
		coarse[step], _ = SP.fit(step, key)
	G, pos = SP.fit(7.0, key)
	W.STEP = 7.0
	surfaces = {'standing': P}
	if key == 'young':
		for pose in POSES:
			with open(os.path.join(PR.CAPTURES, f'wrap-pose-{key}-{pose}.json'), encoding='utf-8') as f:
				surfaces[pose] = np.array(json.load(f)['P'], float).reshape(-1, 3)
	jobs = [(s, None) for s in surfaces] + [('standing', c) for c in STANDING_CUTS] + ([pc for pc in POSE_CUTS] if key == 'young' else [])
	for surface_name, cut_name in jobs:
		Q = surfaces[surface_name]
		Gk, keep = cut(G, cut_name) if cut_name else (G, np.ones(len(G['tris']), bool))
		pr = SP.prepare(Gk, pos, standing, Q, idx, arm)
		name = surface_name + ('-' + cut_name.replace(' ', '-') if cut_name else '')
		parent = '' if name == 'standing' else ('standing-' + cut_name.replace(' ', '-') if cut_name and surface_name != 'standing' else 'standing')  # a posed cut starts from the standing cut, so a fit never depends on the order of edits and poses (owner, 2026-11-03)
		case = dict(tris=pr['tris'], rest=pr['rest'], facing=pr['facing'], elastic=pr['elastic'], sleeve=pr['sleeve'], tag=np.concatenate([Gk['tag'], Gk['tag']]),
			surface_P=Q, surface_idx=idx, surface_arm=arm, start=pr['reused'], plane=W.PLANE, gather=W.GATHER, damp=W.DAMP,
			remap=pr['remap'], parent=parent, body=key)
		levels = []
		for step, Gc in coarse.items():
			Gck, keep_c = cut(Gc, cut_name) if cut_name else (Gc, np.ones(len(Gc['tris']), bool))
			tc, tris_c, *_ = PR.whole(Gck)
			used = np.unique(tris_c)
			rc = -np.ones(2 * Gc['nw'], int)
			rc[used] = np.arange(len(used))
			ij, w = prolong(Gk, Gck, pr['remap'], pr['twin'], rc, tc, keep_c)
			case[f'P{int(step)}_ij'], case[f'P{int(step)}_w'], case[f'P{int(step)}_n'] = ij, w, len(used)
			levels.append((Gck, rc, tc, keep_c))
		(G14, r14, t14, _), (G28, r28, t28, k28) = levels
		case['P14to28_ij'], case['P14to28_w'] = prolong(G14, G28, r14, t14, r28, t28, k28)  # 14 mm points as weights of 28 mm points, for a V-cycle
		path = os.path.join(OUT, f'case-{key}-{name}.npz')
		if os.path.exists(path):
			old = dict(np.load(path))
			if old['tris'].shape == case['tris'].shape and (old['tris'] == case['tris']).all() and np.allclose(old['start'], case['start']):
				case.update({k: v for k, v in old.items() if k.startswith('alt_')})  # today's long run, from stage 1
		np.savez(path, **case)
		print('wrote', path, f'({len(pr["reused"])} points, {len(pr["tris"])} triangles; coarse', ', '.join(f'{case[f"P{int(s)}_n"]}' for s in COARSE), 'points)', flush=True)
		if long and surface_name in POSES and not cut_name and not any(k.startswith('alt_') for k in case):
			t = time.perf_counter()
			_, snaps, _, _ = SP.run(pr, pr['reused'], ITERS, how='mmd', checks=CHECKS)
			print(f'{ITERS} iterations of today\'s solver: {time.perf_counter() - t:.0f} s', flush=True)
			for k, (on_surface, _, raw) in snaps.items():
				case[f'alt_{k}'] = raw  # the iterate itself
				case[f'alt_{k}_on'] = on_surface  # moved onto the surface, as solve returns it
			np.savez(path, **case)


if __name__ == '__main__':
	main()
