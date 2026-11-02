"""How wrong is it to carry a standing fit into a pose, against solving the pattern again on that pose's surface?

Reads a pose's garment surface (dev/wrap-eval.js exportPose: solved for this block's own cover) and starts from the standing fit placed by host
triangles, which is what the app shows, then re-solves the same pattern, elastic and gathering on that surface. Poses are not symmetric, so
this solves both sides of the garment joined at the fold, where a standing fit solves one and mirrors it.
    python pipeline/pose_resolve.py <body key> <pose> ...
Spec: knowledge/engineering/app/fit-solver-realism-audit.md.
"""
import json
import os
import sys

import numpy as np

import wrap_block as W

CAPTURES = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'app', 'captures')
ITERS = 480
MIRROR = np.array([-1.0, 1.0, 1.0])


def percent(a):
	return f'{np.percentile(a, 2):.2f} / {np.median(a):.2f} / {np.percentile(a, 98):.2f}'


def principal(tris, rest, p):
	Dm = np.stack([rest[:, 1] - rest[:, 0], rest[:, 2] - rest[:, 0]], axis=2)
	Ds = np.stack([p[tris[:, 1]] - p[tris[:, 0]], p[tris[:, 2]] - p[tris[:, 0]]], axis=2)
	return np.linalg.svd(Ds @ np.linalg.inv(Dm), compute_uv=False)


def whole(G):
	"""The garment with both sides as one mesh, joined at the fold: which point each point mirrors to, and the mesh's arrays."""
	n = G['nw']
	twin = np.arange(n, 2 * n)
	twin[G['folds']] = G['folds']
	tris = np.vstack([G['tris'], twin[G['tris']][:, [0, 2, 1]]])
	rest = np.concatenate([G['rest'], G['rest'][:, [0, 2, 1]] * np.array([-1.0, 1.0])])
	e = G['elastic']
	elastic = np.vstack([e, np.column_stack([twin[e[:, 0].astype(int)], twin[e[:, 1].astype(int)], e[:, 2:]])])
	return twin, tris, rest, np.concatenate([G['facing'], G['facing']]), elastic, np.concatenate([G['on_sleeve'], G['on_sleeve']]), np.concatenate([G['tag'], G['tag']])


def run(G, pos, part_solve, key, poses):
	with open(os.path.join(CAPTURES, f'wrap-body-{key}.json'), encoding='utf-8') as f:
		body = json.load(f)
	P, idx, arm = np.array(body['P'], float).reshape(-1, 3), np.array(body['idx'], int), np.array(body['wArm'], float)
	standing = W.Surface(P, idx, arm)
	twin, tris, rest, facing, elastic, sleeve, tag = whole(G)
	used = np.unique(tris)
	remap = -np.ones(2 * G['nw'], int)
	remap[used] = np.arange(len(used))
	tris, elastic[:, 0], elastic[:, 1] = remap[tris], remap[elastic[:, 0].astype(int)], remap[elastic[:, 1].astype(int)]
	both = np.zeros((2 * G['nw'], 3))
	both[:G['nw']] = pos
	both[twin] = pos * MIRROR
	both, sleeve = both[used], sleeve[used]
	face, weight = standing.hosts(both, part=sleeve)
	torso = ~sleeve
	legs = {}
	for piece in ('front', 'back'):
		ids = G['welded'][G['offs'][piece] + np.array(G['pieces'][piece].edge['leg'])]
		legs[piece] = remap[np.concatenate([ids, twin[ids]])]
	t = tag != 'sleeve'
	out = {}
	for pose in poses:
		with open(os.path.join(CAPTURES, f'wrap-pose-{key}-{pose}.json'), encoding='utf-8') as f:
			Q = np.array(json.load(f)['P'], float).reshape(-1, 3)
		reused = (Q[face] * weight[:, :, None]).sum(1)
		surface = W.Surface(Q, idx, arm)
		solved, _ = W.solve(tris, rest, reused, np.zeros(0, int), surface, facing, part=sleeve, iters=ITERS, label=pose, elastic=elastic)
		d = np.linalg.norm(solved - reused, axis=1) * 1000
		a, b = principal(tris, rest, reused), principal(tris, rest, solved)
		print(f'\n== {pose}', flush=True)
		print(f'  re-solved against reused: mean {d.mean():.1f}, 95% {np.percentile(d, 95):.1f}, max {d.max():.1f} mm; torso mean {d[torso].mean():.1f}, 95% {np.percentile(d[torso], 95):.1f}', flush=True)
		print(f'  torso largest stretch 2% / median / 98%: reused {percent(a[t, 0])}; re-solved {percent(b[t, 0])}', flush=True)
		print(f'  torso least stretch: reused {percent(a[t, 1])}; re-solved {percent(b[t, 1])}', flush=True)
		print(f'  torso over 1.5 stretch: reused {100 * (a[t, 0] > 1.5).mean():.1f}%, re-solved {100 * (b[t, 0] > 1.5).mean():.1f}%', flush=True)
		for piece, ids in legs.items():
			m = np.linalg.norm(solved[ids] - reused[ids], axis=1) * 1000
			print(f'  {piece} leg line moved: mean {m.mean():.1f}, max {m.max():.1f} mm', flush=True)
		out[pose] = solved
	np.savez(os.path.join(CAPTURES, f'pose-resolve-{key}.npz'), **out)


def main():
	key, poses = sys.argv[1], sys.argv[2:]
	sys.argv = ['wrap_block.py', '--drafted', f'body-{key}', key]
	W.main(after=lambda **k: run(key=key, poses=poses, **k))


if __name__ == '__main__':
	main()
