"""How far a wrapped block's openings land from where the app's own build puts the same lines, on one body.

The app's build is the fit the owner accepts, so it is the reference for where a leg line belongs.
    python pipeline/compare_fit.py <wrap file, no extension> <body key>
Reads app/captures/<file>.json, wrap-seed-<key>.json, wrap-body-<key>.json. Spec: knowledge/engineering/app/fitting-a-block-like-the-app.md.
"""
import json
import os
import sys

import numpy as np
from scipy.spatial import cKDTree

HERE = os.path.dirname(os.path.abspath(__file__))
CAPTURES = os.path.join(HERE, '..', 'app', 'captures')


def load(name):
	with open(os.path.join(CAPTURES, name + '.json'), encoding='utf-8') as f:
		return json.load(f)


def app_line(seed, panel, line):
	"""The app's line on the +x side, in 3D, densely."""
	out = []
	for c in seed['pieces']:
		if c['panel'] != panel:
			continue
		P = np.array(c['P']).reshape(-1, 3)
		ids = [v for v, n in c['loop'] if n == line]
		out.append(P[ids])
	pts = np.vstack(out)
	return pts[pts[:, 0] > -0.001]


def block_edge(cell, G, idx_unused=None):
	"""The piece's free edges in 3D, each as a point pair, placed by the host triangles."""
	I = np.array(cell['I']).reshape(-1, 3)
	hi = np.array(cell['hostI']).reshape(-1, 3)
	hw = np.array(cell['hostW']).reshape(-1, 3)
	q = (G[hi] * hw[:, :, None]).sum(1)
	count = {}
	for t in I:
		for k in range(3):
			a, b = int(t[k]), int(t[(k + 1) % 3])
			e = (min(a, b), max(a, b))
			count[e] = count.get(e, 0) + 1
	free = np.array([e for e, n in count.items() if n == 1])
	return q, free


def main():
	file, key = sys.argv[1], sys.argv[2]
	data, seed, body = load(file), load(f'wrap-seed-{key}'), load(f'wrap-body-{key}')
	G = np.array(body['P'], float).reshape(-1, 3)
	centre = G[np.abs(G[:, 0]) < 0.002]
	crotch = float(np.min(np.array([p[1] for p in centre if abs(p[2] - np.median(centre[:, 2])) < 0.08])))
	for piece, panel in (('Front', 'Front'), ('Back', 'Back')):
		cell = next(c for c in data['cells'] if c['name'] == piece and c['half'] == 0)
		q, free = block_edge(cell, G)
		pts = q[np.unique(free)]
		side = 1 if pts[:, 0].mean() > 0 else -1
		target = app_line(seed, panel, 'Leg line') * np.array([1, 1, 1])
		if target[:, 0].mean() * side < 0:
			target = target * np.array([-1, 1, 1])
		# the block's leg line: the outline below the app's leg top, away from the fold
		low = pts[(pts[:, 1] < target[:, 1].max() + 0.01) & (np.abs(pts[:, 0]) > 0.012)]
		d_to_app, _ = cKDTree(target).query(low)
		d_from_app, _ = cKDTree(low).query(target)
		print(f'{piece}: block line to the app line, mean {d_to_app.mean() * 1000:.1f} mm, 95% {np.percentile(d_to_app, 95) * 1000:.1f} mm; app line to the block, mean {d_from_app.mean() * 1000:.1f} mm, 95% {np.percentile(d_from_app, 95) * 1000:.1f} mm')
		print(f'  lowest point: block {pts[:, 1].min() - crotch:+.4f} m, app {target[:, 1].min() - crotch:+.4f} m from the crotch; widest at the top: block x {np.abs(low[:, 0]).max():.3f}, app x {np.abs(target[:, 0]).max():.3f}')
		for h in (0.0, 0.02, 0.04, 0.07, 0.10, 0.14):
			y = crotch + h
			def half(a):
				m = np.abs(a[:, 1] - y) < 0.006
				return np.abs(a[m, 0]).max() if m.any() else float('nan')
			print(f'    {h * 100:4.0f} cm above the crotch: half width of the opening edge: block {half(low) * 1000:5.0f} mm, app {half(target) * 1000:5.0f} mm')


if __name__ == '__main__':
	main()
