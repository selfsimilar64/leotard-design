"""Charts and a table from a race's results (race.py): distance from the reference against wall time, per case and candidate.
    python pipeline/race/report.py [body]
Writes app/captures/race/race-<body>.png and prints a table (time to the bar, and the error at 1, 2, 5 and 20 s).
Spec: knowledge/engineering/app/solver-race-plan.md.
"""
import json
import os
import sys

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
CAP = os.path.join(HERE, '..', '..', 'app', 'captures', 'race')
BAR = (1.0, 3.0, 5.0)


def at(curve, t, key):
	"""The error at time t: the last iterate kept at or before it."""
	got = [c[key] for c in curve if c['t'] <= t + 1e-9]
	return got[-1] if got else None


def main():
	key = sys.argv[1] if len(sys.argv) > 1 else 'young'
	res = json.load(open(os.path.join(CAP, f'results-{key}.json')))
	cases = [c for c in res if res[c].get('runs')]
	names = list(next(iter(res[c]['runs'] for c in cases)))
	fig, axes = plt.subplots(len(cases), 2, figsize=(14, 3.6 * len(cases)), squeeze=False)
	colours = plt.cm.tab10(np.arange(len(names)))
	for row, case in enumerate(cases):
		r = res[case]
		for col, metric in enumerate(('mean', 'h_mean')):
			ax = axes[row, col]
			for name, c in zip(names, colours):
				run = r['runs'].get(name)
				if not run:
					continue
				cv = run['curve']
				ax.plot([p['t'] for p in cv], [max(p[metric], 1e-2) for p in cv], '-o', ms=2.5, color=c, label=name)
			ax.axhline(BAR[0], color='k', lw=0.8, ls='--')
			ax.axvline(5, color='r', lw=0.8, ls=':')
			ax.set_xscale('log')
			ax.set_yscale('log')
			ax.set_title(f'{case}: ' + ('mean distance from the reference (mm)' if metric == 'mean' else 'shape: mean height-off-body difference (mm)'), fontsize=9)
			ax.set_xlabel('seconds on the GTX 1650', fontsize=8)
			if row == 0 and col == 1:
				ax.legend(fontsize=7)
	fig.tight_layout()
	out = os.path.join(CAP, f'race-{key}.png')
	fig.savefig(out, dpi=90)
	print('wrote', out)
	for case in cases:
		r = res[case]
		ref = r.get('reference', {})
		print(f'\n{case}: start {r["start_error"][0]:.1f} / {r["start_error"][1]:.1f} / {r["start_error"][2]:.1f} mm (mean / 95% / max) from the reference; '
			f'reference {ref.get("iterations", "?")} Newton iterations, moved {ref.get("jitter", [0, 0, 0])[0]:.2f} / {ref.get("jitter", [0, 0, 0])[2]:.2f} mm (mean / max) in its last quarter')
		print(f'  {"candidate":42} {"ms/it":>6} {"to bar":>7} {"shape":>6}   {"at 1 s":>27} {"at 2 s":>27} {"at 5 s":>27} {"at 20 s":>27}')
		print(f'  {"":42} {"":>6} {"":>7} {"":>6}   ' + ' '.join(f'{"pos mean/max shape mean/max gap%":>27}' for _ in range(4)))
		for name in names:
			run = r['runs'].get(name)
			if not run:
				continue
			cv = run['curve']
			cells = []
			for t in (1, 2, 5, 20):
				m, x, hm, hx, g = (at(cv, t, k) for k in ('mean', 'max', 'h_mean', 'h_max', 'gap'))
				cells.append(f'{m:4.1f}/{x:4.1f} {hm:5.2f}/{hx:4.1f} {g:5.1f}' if hm is not None else ' ' * 27)
			hit = f'{run["to_bar"]:.2f}' if run['to_bar'] else '-'
			sh = f'{run["shape_to_bar"]:.2f}' if run.get('shape_to_bar') else '-'
			print(f'  {name:42} {run["per_iteration_ms"]:6.1f} {hit:>7} {sh:>6}   ' + ' '.join(cells))


if __name__ == '__main__':
	main()
