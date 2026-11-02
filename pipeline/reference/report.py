"""Tables from the finished runs, and two pictures of the baseline.
    python pipeline/reference/report.py <inputs dir> <output dir> [--images]
Writes <output>/tables.md and <output>/ours.json; with --images, app/captures/reference-baseline-{front,back}.png.
"""
import json
import os
import sys

import numpy as np
import warp as wp

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from garment import Garment, LEVELS_CM  # noqa: E402
from run import Distances  # noqa: E402
from experiments import RUNS  # noqa: E402

SKIN_REGIONS = ('small of back', 'seat cleft', 'crotch', 'front waist', 'whole garment')
STRETCH = ('back waist', 'back waist centre', 'front waist', 'hip front', 'hip back', 'seat')


def load(out, name):
	p = os.path.join(out, name + '.json')
	if not os.path.exists(p):
		return None
	with open(p, encoding='utf-8') as f:
		return json.load(f)


def settled(m):
	"""Motion at the end, over the last saved interval."""
	h = m['history'][-1]
	return h


def f(v, n=1):
	return 'n/a' if v is None or (isinstance(v, float) and np.isnan(v)) else f'{v:.{n}f}'


def main():
	inputs, out = sys.argv[1:3]
	wp.init()
	g = Garment(inputs)
	skin = np.load(os.path.join(inputs, 'raw_skin.npy'))
	dist = Distances(skin, g.G, g.body_idx, 'cuda:0')
	base_x = np.load(os.path.join(out, 'baseline.npz'))['x']
	ours = g.measures(g.x_ours, dist(g.x_ours, 'skin'), dist(g.x_ours, 'lifted'), base_x)
	with open(os.path.join(out, 'ours.json'), 'w', encoding='utf-8') as fh:
		json.dump(ours, fh, indent=1)
	runs = {n: load(out, n) for n in RUNS}
	runs = {n: m for n, m in runs.items() if m}
	L = []
	L.append('## Settling and cost\n')
	L.append('| Run | Sim s | Wall s | Torso speed mean / 95% / max, mm/s | Torso net force 95% / max, mN | Sleeve-included max speed, mm/s; force, mN | Torso min dist to collider, mm | All min, mm |')
	L.append('|---|---|---|---|---|---|---|---|')
	for n, m in runs.items():
		h = settled(m)
		L.append(f"| {n} | {h['t']:.0f} | {m['wall_s']:.0f} | {h['torso_v_mean']:.3f} / {h['torso_v_p95']:.3f} / {h['torso_v_max']:.2f} | {h['torso_f_p95'] * 1000:.2f} / {h['torso_f_max'] * 1000:.1f} | {h['v_max']:.1f}; {h['f_max'] * 1000:.0f} | {h['torso_pen_min_mm']:.2f} | {h['pen_min_mm']:.2f} |")
	L.append('\n## Whole garment displacement, mm (same flat point)\n')
	L.append('| Run | vs baseline mean / 95% / max | vs ours mean / 95% / max |')
	L.append('|---|---|---|')
	for n, m in runs.items():
		b = m.get('vs_ref')
		o = m['vs_ours']
		L.append(f"| {n} | {('%.2f / %.2f / %.1f' % (b['mean'], b['p95'], b['max'])) if b else '-'} | {o['mean']:.2f} / {o['p95']:.2f} / {o['max']:.1f} |")
	b = ours['vs_ref']
	L.append(f"| ours | {b['mean']:.2f} / {b['p95']:.2f} / {b['max']:.1f} | 0 |")
	for piece in ('Back', 'Front'):
		L.append(f'\n## {piece} leg edge: half width at height above the crotch, mm; lowest point relative to the crotch, mm\n')
		L.append('| Run | ' + ' | '.join(f'{h} cm' for h in LEVELS_CM) + ' | Lowest | Largest left/right difference |')
		L.append('|---|' + '---|' * (len(LEVELS_CM) + 2))
		for n, m in list(runs.items()) + [('ours', ours)]:
			e = m['leg'][piece]
			asym = max(e[f'asym{h}'] for h in LEVELS_CM if not np.isnan(e[f'asym{h}']))
			L.append(f'| {n} | ' + ' | '.join(f(e[f'w{h}']) for h in LEVELS_CM) + f" | {f(e['lowest'])} | {f(asym)} |")
	L.append('\n## Stretch, across / along\n')
	L.append('| Run | ' + ' | '.join(STRETCH) + ' |')
	L.append('|---|' + '---|' * len(STRETCH))
	for n, m in list(runs.items()) + [('ours', ours)]:
		L.append(f'| {n} | ' + ' | '.join(f"{m['stretch'][k]['across']:.3f} / {m['stretch'][k]['along']:.3f}" for k in STRETCH) + ' |')
	L.append('\n## Distance from the plain skin, mm: mean / 95% / max\n')
	L.append('| Run | ' + ' | '.join(SKIN_REGIONS) + ' |')
	L.append('|---|' + '---|' * len(SKIN_REGIONS))
	for n, m in list(runs.items()) + [('ours', ours)]:
		L.append(f'| {n} | ' + ' | '.join(f"{m['lift'][k]['skin_mean']:.2f} / {m['lift'][k]['skin_p95']:.2f} / {m['lift'][k]['skin_max']:.1f}" for k in SKIN_REGIONS) + ' |')
	L.append('\n## Opening length over flat length (half 0)\n')
	names = list(ours['openings'])
	L.append('| Run | ' + ' | '.join(names) + ' |')
	L.append('|---|' + '---|' * len(names))
	for n, m in list(runs.items()) + [('ours', ours)]:
		L.append(f'| {n} | ' + ' | '.join(f"{m['openings'][k]:.3f}" for k in names) + ' |')
	L.append('\n## Stretch range, 1% to 99%\n')
	L.append('| Run | across | along |')
	L.append('|---|---|---|')
	for n, m in list(runs.items()) + [('ours', ours)]:
		r = m['stretch_range']
		L.append(f"| {n} | {r['across_p1']:.2f} to {r['across_p99']:.2f} | {r['along_p1']:.2f} to {r['along_p99']:.2f} |")
	# effects against the baseline, the largest first
	L.append('\n## Effect of each switch against the baseline\n')
	L.append('Leg: largest change in half width at any level, either piece (mm). Low: largest change of a lowest point (mm). Stretch: largest change in any regional mean (ratio).\n')
	L.append('| Run | Mean / 95% / max, mm | Leg, mm | Low, mm | Stretch | Skin gap change: small of back / cleft / crotch, mean mm |')
	L.append('|---|---|---|---|---|---|')
	B = runs['baseline']
	rows = []
	for n, m in runs.items():
		if n == 'baseline':
			continue
		dl = max(abs(m['leg'][p][f'w{h}'] - B['leg'][p][f'w{h}']) for p in ('Back', 'Front') for h in LEVELS_CM)
		dlow = max(abs(m['leg'][p]['lowest'] - B['leg'][p]['lowest']) for p in ('Back', 'Front'))
		ds = max(abs(m['stretch'][k][a] - B['stretch'][k][a]) for k in STRETCH for a in ('across', 'along'))
		gap = [m['lift'][k]['skin_mean'] - B['lift'][k]['skin_mean'] for k in ('small of back', 'seat cleft', 'crotch')]
		rows.append((m['vs_ref']['mean'], f"| {n} | {m['vs_ref']['mean']:.2f} / {m['vs_ref']['p95']:.2f} / {m['vs_ref']['max']:.1f} | {dl:.1f} | {dlow:.1f} | {ds:.3f} | {gap[0]:+.2f} / {gap[1]:+.2f} / {gap[2]:+.2f} |"))
	for _, r in sorted(rows, key=lambda t: -t[0]):
		L.append(r)
	with open(os.path.join(out, 'tables.md'), 'w', encoding='utf-8') as fh:
		fh.write('\n'.join(L) + '\n')
	print('\n'.join(L))
	if '--images' in sys.argv:
		images(g, skin, base_x, dist)


def images(g, skin, x, dist):
	"""Stretch and gap from the skin, front and back, as flat-shaded triangles."""
	import matplotlib
	matplotlib.use('Agg')
	import matplotlib.pyplot as plt
	from matplotlib.collections import PolyCollection
	across, along = g.stretch(x)
	gap = dist(x, 'skin') * 1000
	tri_gap = gap[g.tris].mean(1)
	body = (np.abs(skin[:, 0]) < 0.32) & (skin[:, 1] > 0.6) & (skin[:, 1] < 1.45)
	for view, sign in (('front', 1), ('back', -1)):
		fig, axes = plt.subplots(1, 3, figsize=(15, 7), dpi=110)
		for ax, (title, val, lim, cmap) in zip(axes, (('Stretch along (flat y)', along, (0.7, 1.3), 'RdBu_r'), ('Stretch across (flat x)', across, (0.7, 1.3), 'RdBu_r'), ('Distance from plain skin, mm', tri_gap, (0, 8), 'viridis'))):
			ax.scatter(skin[body, 0] * sign, skin[body, 1], s=0.05, c='0.8', rasterized=True)
			# the side of the garment facing the viewer
			n = np.cross(x[g.tris[:, 1]] - x[g.tris[:, 0]], x[g.tris[:, 2]] - x[g.tris[:, 0]])
			keep = n[:, 2] * sign > 0
			order = np.argsort(x[g.tris[keep]][:, :, 2].mean(1) * sign)
			poly = x[g.tris[keep]][order][:, :, :2] * np.array([sign, 1])
			pc = PolyCollection(poly, array=val[keep][order], cmap=cmap, clim=lim, linewidths=0, antialiaseds=False)
			ax.add_collection(pc)
			ax.set_aspect('equal')
			ax.set_xlim(-0.32, 0.32)
			ax.set_ylim(0.65, 1.42)
			ax.set_title(f'{title} ({view})')
			fig.colorbar(pc, ax=ax, fraction=0.04)
			ax.axis('off')
		fig.suptitle('Reference baseline in Newton Style3D: a model result, not a measurement of a real garment')
		fig.tight_layout()
		fig.savefig(os.path.join(HERE, '..', '..', 'app', 'captures', f'reference-baseline-{view}.png'))
		plt.close(fig)


if __name__ == '__main__':
	main()
