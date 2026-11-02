"""Has a fit settled, and where is the surface forcing it? No physics changes: this only reads the solver.

Runs a fit on, watching its energy and how far it still moves; then reads what the fabric and elastic pull each point with. That pull's
part along the surface is what is left unbalanced. Its part across the surface is what the surface holds: into the body a real push, out of
the body a suction no real body could apply, which marks where fabric would lift off. Also where fabric has reached the gathering limit.
    python pipeline/fit_checks.py [body key] [iterations]
Spec: knowledge/engineering/app/fit-solver-realism-audit.md.
"""
import os
import sys
import time

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

import wrap_block as W

HERE = os.path.dirname(os.path.abspath(__file__))
FABRIC = 300.0  # N/m per unit strain, the published middle of 100-400, only to read pressures in real units; the fit itself does not depend on it
MMHG = 133.3
CHECKS = (240, 720, 2400)


def principal(G, p):
	tris, rest = G['tris'], G['rest']
	Dm = np.stack([rest[:, 1] - rest[:, 0], rest[:, 2] - rest[:, 0]], axis=2)
	Ds = np.stack([p[tris[:, 1]] - p[tris[:, 0]], p[tris[:, 2]] - p[tris[:, 0]]], axis=2)
	return np.linalg.svd(Ds @ np.linalg.inv(Dm), compute_uv=False)


def energy(G, p):
	"""The fit's own energy, per the same rule the solve uses, in units of the fabric's stiffness."""
	rest, s = G['rest'], principal(G, p)
	a = 0.5 * np.abs((rest[:, 1, 0] - rest[:, 0, 0]) * (rest[:, 2, 1] - rest[:, 0, 1]) - (rest[:, 2, 0] - rest[:, 0, 0]) * (rest[:, 1, 1] - rest[:, 0, 1]))
	over = (np.maximum(s - 1, 0) ** 2 + np.maximum(W.GATHER - s, 0) ** 2).sum(1)
	fabric = 0.5 * (a * over).sum()
	e = G['elastic']
	now = np.linalg.norm(p[e[:, 0].astype(int)] - p[e[:, 1].astype(int)], axis=1)
	return fabric, 0.5 * (e[:, 3] * np.maximum(now - e[:, 2], 0) ** 2).sum()


def areas(G):
	"""The flat area each point stands for."""
	rest, tris = G['rest'], G['tris']
	a = 0.5 * np.abs((rest[:, 1, 0] - rest[:, 0, 0]) * (rest[:, 2, 1] - rest[:, 0, 1]) - (rest[:, 2, 0] - rest[:, 0, 0]) * (rest[:, 1, 1] - rest[:, 0, 1]))
	out = np.zeros(G['nw'])
	for k in range(3):
		np.add.at(out, tris[:, k], a / 3)
	return out


def regions(G, p, crotch):
	"""Each point's piece and height, as named areas of the body."""
	piece = np.array([''] * G['nw'], dtype=object)
	for name, part in G['pieces'].items():
		piece[G['welded'][G['offs'][name]:G['offs'][name] + len(part.V)]] = name
	h = p[:, 1] - crotch
	centre = np.abs(p[:, 0]) < 0.03
	return {
		'crotch, within 4 cm': (piece != 'sleeve') & (h < 0.04),
		'seat cleft': (piece == 'back') & (h >= 0.04) & (h < 0.16) & centre,
		'seat, rest': (piece == 'back') & (h >= 0.04) & (h < 0.2) & ~centre,
		'small of back': (piece == 'back') & (h >= 0.27) & (h < 0.37) & centre,
		'back, waist': (piece == 'back') & (h >= 0.25) & (h < 0.35),
		'front, belly': (piece == 'front') & (h >= 0.1) & (h < 0.3),
		'bust': (piece == 'front') & (h >= 0.4) & (h < 0.55),
		'upper back': (piece == 'back') & (h >= 0.45) & (h < 0.65),
		'sleeve': piece == 'sleeve',
	}


def check(G, pos, part_solve, limit):
	every = np.ones(len(G['tris']), bool)
	ids = np.unique(G['tris'])
	p, done, spent = pos, 0, 0.0
	print(f"\nmesh: {G['nw']} points, {len(G['tris'])} triangles, {len(G['elastic'])} spans of elastic", flush=True)
	f, e = energy(G, p)
	print(f'as fitted: fabric energy {f * 1e6:.2f}, elastic {e * 1e6:.2f} (millionths)', flush=True)
	first = None
	for n in CHECKS:
		if n > limit:
			break
		t = time.perf_counter()
		q = part_solve(G, every, p, iters=n - done, label='settling')
		spent += time.perf_counter() - t
		d = np.linalg.norm(q[ids] - p[ids], axis=1) * 1000
		f, e = energy(G, q)
		print(f'{n:5} more iterations, {spent:6.0f} s: moved mean {d.mean():.3f}, 95% {np.percentile(d, 95):.3f}, max {d.max():.2f} mm since the last check; fabric energy {f * 1e6:.2f}, elastic {e * 1e6:.2f}', flush=True)
		p, done = q, n
		first = first if first is not None else q
	d = np.linalg.norm(p[ids] - first[ids], axis=1) * 1000
	print(f'{CHECKS[0]} iterations against {done}: mean {d.mean():.3f}, 95% {np.percentile(d, 95):.3f}, max {d.max():.2f} mm', flush=True)

	# the last solve's own forces, per point, with the fabric's stiffness as the unit
	force, normal, at = W.LAST['force'], W.LAST['normal'], W.LAST['at']
	along = (force * normal).sum(1)
	tangent = np.linalg.norm(force - along[:, None] * normal, axis=1)
	area = areas(G)
	pressure = -along / np.maximum(area, 1e-9) * FABRIC / MMHG  # into the body: positive
	folds = np.zeros(G['nw'], bool)
	folds[G['folds']] = True
	free = ~folds
	print(f'\nunbalanced along the surface, away from the folds: median {np.median(tangent[free]):.2e}, 95% {np.percentile(tangent[free], 95):.2e}; held across it: median {np.median(np.abs(along[free])):.2e}', flush=True)
	crotch = at[G['welded'][G['offs']['back'] + G['pieces']['back'].edge['crotch'][-1]], 1]
	s = principal(G, at)
	reg = regions(G, at, crotch)
	print(f"{'area':22}{'points':>7}{'pressure mmHg, median':>23}{'5%':>7}{'95%':>7}{'suction share':>15}{'least stretch':>15}{'at the limit':>14}", flush=True)
	vertex_least = np.full(G['nw'], 9.0)
	for k in range(3):
		np.minimum.at(vertex_least, G['tris'][:, k], s[:, 1])
	for name, m in reg.items():
		m = m & free
		if not m.any():
			continue
		x = pressure[m]
		print(f'{name:22}{m.sum():7}{np.median(x):23.2f}{np.percentile(x, 5):7.2f}{np.percentile(x, 95):7.2f}{100 * (x < -0.1).mean():14.1f}%{np.median(vertex_least[m]):15.2f}{100 * (vertex_least[m] <= W.GATHER + 0.02).mean():13.1f}%', flush=True)
	print(f'triangles at the gathering limit: {100 * (s[:, 1] <= W.GATHER + 0.02).mean():.2f}%; below 0.9: {100 * (s[:, 1] < 0.9).mean():.1f}%', flush=True)

	# on the flat pieces, where they can be read against the pattern
	fig, axes = plt.subplots(2, 2, figsize=(11, 15), dpi=110)
	flat = G['rest'].mean(1) * 1000
	tv = pressure[G['tris']].mean(1)
	for j, piece in enumerate(('front', 'back')):
		m = G['tag'] == piece
		a = axes[0, j].scatter(flat[m, 0], flat[m, 1], c=np.clip(tv[m], -5, 5), cmap='RdBu', s=5, vmin=-5, vmax=5)
		axes[0, j].set_title(f'{piece}: body pressure, mmHg. Red: surface pulling fabric in')
		plt.colorbar(a, ax=axes[0, j], shrink=.7)
		b = axes[1, j].scatter(flat[m, 0], flat[m, 1], c=s[m, 1], cmap='magma', s=5, vmin=W.GATHER, vmax=1.1)
		axes[1, j].set_title(f'{piece}: least stretch. Dark: gathered')
		plt.colorbar(b, ax=axes[1, j], shrink=.7)
		for ax in axes[:, j]:
			ax.set_aspect('equal')
			ax.set_xlabel('mm from the fold')
	fig.savefig(os.path.join(HERE, '..', 'app', 'captures', 'fit-checks.png'), bbox_inches='tight')


def main():
	key = sys.argv[1] if len(sys.argv) > 1 else 'young'
	limit = int(sys.argv[2]) if len(sys.argv) > 2 else CHECKS[-1]
	sys.argv = ['wrap_block.py', '--drafted', f'body-{key}', key]
	W.main(after=lambda **k: check(limit=limit, **k))


if __name__ == '__main__':
	main()
