"""The experiment list. Each run changes one thing against `baseline`, except the control runs, as named.
    python pipeline/reference/experiments.py <inputs dir> <output dir> [run names...]
A run whose .json already exists is skipped; delete it to run it again. Runs happen one after another (one GPU).
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SOFT, STIFF = 145.0, 319.0  # 2.2x, same geometric mean as the baseline's 215 N/m

RUNS = {
	'baseline': [],
	# one change at a time
	'mu0': ['mu=0'],
	'mu03': ['mu=0.3'],
	'mu07': ['mu=0.7'],
	'grain_a': [f'ku={SOFT}', f'kv={STIFF}'],  # stiffer along the body
	'grain_b': [f'ku={STIFF}', f'kv={SOFT}'],  # stiffer around the body
	'poisson': ['nu=0.3'],  # our kernel patch, not in the stock solver
	'k120': ['ku=120', 'kv=120'],
	'k385': ['ku=385', 'kv=385'],
	'ea3': ['ea=3'],
	'ea10': ['ea=10'],
	'ea0': ['ea=0'],
	'nograv': ['gravity=0'],
	'lifted': ['collider=lifted'],
	'gather': ['gather=0.5'],  # our kernel patch: our free-compression rule in place of the stock membrane
	'lowshear': ['ks_ratio=0.1'],
	# how far the state depends on the path and on the numbers
	'mu05_after_mu0': ['start=mu0'],  # friction switched on after a frictionless settle
	'baseline_more': ['start=baseline', 'seconds=10'],  # 10 more seconds from the baseline's end: drift
	'dt240': ['dt=0.0041666667', 'seconds=5'],  # half the step for half the simulated time
	# controls: our solver's physics in this solver, to see how much of any difference is the solver itself
	# ea 4.3 is wrap_block.py ELASTIC_WIDTH, 20 mm, at this baseline's 215 N/m
	'control_ours': ['mu=0', 'gravity=0', 'collider=lifted', 'gather=0.5', 'ea=4.3', 'two_sided=1', 'bend=1e-7'],  # one-sided contact remains the one physics difference
	'control_stock_skin': ['mu=0', 'gravity=0', 'gather=0.5', 'ea=4.3', 'two_sided=1', 'bend=1e-7'],  # the same on the plain skin: row 2 + row 10
}

if __name__ == '__main__':
	inputs, out = sys.argv[1:3]
	names = sys.argv[3:] or list(RUNS)
	for name in names:
		if os.path.exists(os.path.join(out, name + '.json')):
			print('skip', name, flush=True)
			continue
		print('run', name, RUNS[name], flush=True)
		with open(os.path.join(out, name + '.log'), 'w', encoding='utf-8') as log:
			r = subprocess.run([sys.executable, os.path.join(HERE, 'run.py'), inputs, out, name] + RUNS[name], stdout=log, stderr=subprocess.STDOUT)
		print('  exit', r.returncode, flush=True)
