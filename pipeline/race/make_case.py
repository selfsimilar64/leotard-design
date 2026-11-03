"""A race case: one pose re-fit as plain arrays, and today's solver's answer to it run long.
    python pipeline/race/make_case.py [pose]          (default back-arched; young body, high cut, whole garment)
Writes app/captures/race/case-young-<pose>.npz: the problem first, then again with today's iterates added once the long solve ends.
Git-ignored, derived from licensed data. Spec: knowledge/engineering/app/solver-race-plan.md (stages 1-2).
"""
import os
import shutil
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import json  # noqa: E402

import speed_probe as SP  # noqa: E402  (works on copies of its inputs in a temporary folder)
import wrap_block as W  # noqa: E402

OUT = os.path.join(HERE, '..', '..', 'app', 'captures', 'race')
ITERS = 1440
CHECKS = (10, 20, 40, 80, 160, 240, 320, 480, 720, 1080, 1440)


def main():
	pose = sys.argv[1] if len(sys.argv) > 1 else 'back-arched'
	src = os.path.join(HERE, '..', '..', 'app', 'captures', f'wrap-pose-young-{pose}.json')
	shutil.copy(src, SP.CAP)
	os.makedirs(OUT, exist_ok=True)
	with open(os.path.join(SP.CAP, 'wrap-body-young.json'), encoding='utf-8') as f:
		body = json.load(f)
	P, idx, arm = np.array(body['P'], float).reshape(-1, 3), np.array(body['idx'], int), np.array(body['wArm'], float)
	with open(os.path.join(SP.CAP, f'wrap-pose-young-{pose}.json'), encoding='utf-8') as f:
		Q = np.array(json.load(f)['P'], float).reshape(-1, 3)
	G, pos = SP.fit(7.0)
	pr = SP.prepare(G, pos, W.Surface(P, idx, arm), Q, idx, arm)
	case = dict(tris=pr['tris'], rest=pr['rest'], facing=pr['facing'], elastic=pr['elastic'], sleeve=pr['sleeve'], tag=np.concatenate([G['tag'], G['tag']]),
		surface_P=Q, surface_idx=idx, surface_arm=arm, start=pr['reused'], plane=W.PLANE, gather=W.GATHER, damp=W.DAMP)
	path = os.path.join(OUT, f'case-young-{pose}.npz')
	np.savez(path, **case)
	print('wrote', path, f'({len(pr["reused"])} points, {len(pr["tris"])} triangles)', flush=True)
	t = time.perf_counter()
	q, snaps, _, _ = SP.run(pr, pr['reused'], ITERS, how='mmd', checks=CHECKS)
	print(f'{ITERS} iterations of today\'s solver: {time.perf_counter() - t:.0f} s', flush=True)
	for k, (on_surface, _, raw) in snaps.items():
		case[f'alt_{k}'] = raw  # the iterate itself
		case[f'alt_{k}_on'] = on_surface  # moved onto the surface, as solve returns it
	np.savez(path, **case)
	print('wrote', path, 'with iterates at', CHECKS, flush=True)


if __name__ == '__main__':
	main()
