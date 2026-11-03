"""Where does a pose re-solve's time go, and which cheap changes actually help? The speed baseline before any optimising.
Same loop as wrap_block.solve (keep in step with it), with phase timers and a switchable linear solve. young, high cut, whole garment, back-arched.
Works on copies of its inputs in a temporary folder, so the fits it builds overwrite nothing in app/captures.
    python pipeline/speed_probe.py
Spec: knowledge/engineering/app/refitting-after-an-edit.md.
"""
import json
import os
import shutil
import sys
import tempfile
import time

import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import splu

import wrap_block as W
import pose_resolve as PR

CAP = tempfile.mkdtemp(prefix='speed-probe-')
for f in ('wrap-seed-young.json', 'wrap-body-young.json', 'wrap-pose-young-back-arched.json'):
	shutil.copy(os.path.join(W.CAPTURES, f), CAP)
W.CAPTURES = CAP
POSE = 'back-arched'
REF_ITERS = 720
CHECKS = (10, 20, 40, 80, 160)


def fit(step, key='young'):
	for f in (f'wrap-seed-{key}.json', f'wrap-body-{key}.json'):
		if not os.path.exists(os.path.join(CAP, f)):
			shutil.copy(os.path.join(PR.CAPTURES, f), CAP)
	W.STEP = step
	sys.argv = ['wrap_block.py', '--drafted', f'body-{key}', key]
	got = {}
	t = time.perf_counter()
	stdout = sys.stdout
	sys.stdout = open(os.devnull, 'w')
	try:
		W.main(after=lambda G, pos, part_solve: got.update(G=G, pos=pos))
	finally:
		sys.stdout = stdout
	print(f'standing fit from nothing at {step} mm: {time.perf_counter() - t:.0f} s, {got["G"]["nw"]} half-garment points', flush=True)
	return got['G'], got['pos']


def prepare(G, pos, standing, Q, idx, arm):
	twin, tris, rest, facing, elastic, sleeve, tag = PR.whole(G)
	used = np.unique(tris)
	remap = -np.ones(2 * G['nw'], int)
	remap[used] = np.arange(len(used))
	tris, elastic[:, 0], elastic[:, 1] = remap[tris], remap[elastic[:, 0].astype(int)], remap[elastic[:, 1].astype(int)]
	both = np.zeros((2 * G['nw'], 3))
	both[:G['nw']] = pos
	both[twin] = pos * PR.MIRROR
	both, sleeve = both[used], sleeve[used]
	face, weight = standing.hosts(both, part=sleeve)
	reused = (Q[face] * weight[:, :, None]).sum(1)
	return dict(G=G, twin=twin, remap=remap, tris=tris, rest=rest, facing=facing, elastic=elastic, sleeve=sleeve, reused=reused, surface=W.Surface(Q, idx, arm))


def factor(A, how):
	if how == 'colamd':
		return splu(A)
	if how == 'mmd':
		return splu(A, permc_spec='MMD_AT_PLUS_A', diag_pivot_thresh=0.0, options=dict(SymmetricMode=True))
	raise ValueError(how)


def pcg(A, b, x, M, tol):
	r = b - A @ x
	limit = tol * np.linalg.norm(b)
	if np.linalg.norm(r) <= limit:
		return x, 0
	z = M.solve(r)
	d = z.copy()
	rz = r @ z
	for i in range(1, 200):
		Ad = A @ d
		a = rz / (d @ Ad)
		x = x + a * d
		r = r - a * Ad
		if np.linalg.norm(r) <= limit:
			return x, i
		z = M.solve(r)
		rz2 = r @ z
		d = z + rz2 / rz * d
		rz = rz2
	return x, i


def run(pr, start, iters, how='mmd', stale=1, tol=1e-8, aa=0, checks=(), label=''):
	"""wrap_block.solve's loop for the case pose_resolve uses (no folds held, nothing held). Returns final points, snapshots, phase seconds."""
	tris, rest, facing, elastic, part, surface = pr['tris'], pr['rest'], pr['facing'], pr['elastic'], pr['sleeve'], pr['surface']
	n = len(start)
	T = dict(setup=0., project=0., svd=0., rhs=0., assemble=0., factor=0., solve=0., accel=0.)
	t0 = time.perf_counter()
	a0, a1, a2 = rest[:, 0], rest[:, 1], rest[:, 2]
	cots = np.zeros((len(tris), 3))
	for k in range(3):
		u, v = rest[:, (k + 1) % 3] - rest[:, k], rest[:, (k + 2) % 3] - rest[:, k]
		cots[:, k] = np.clip((u * v).sum(1) / (np.abs(u[:, 0] * v[:, 1] - u[:, 1] * v[:, 0]) + 1e-12), 0.02, 6)
	I, J, V = [], [], []
	for k in range(3):
		i, j, w = tris[:, (k + 1) % 3], tris[:, (k + 2) % 3], cots[:, k] / 2
		I += [i, j, i, j]
		J += [j, i, i, j]
		V += [-w, -w, w, w]
	si, sj = elastic[:, 0].astype(int), elastic[:, 1].astype(int)
	I += [si, sj, si, sj]
	J += [sj, si, si, sj]
	V += [-elastic[:, 3], -elastic[:, 3], elastic[:, 3], elastic[:, 3]]
	L = coo_matrix((np.concatenate(V), (np.concatenate(I), np.concatenate(J))), shape=(n, n)).tocoo()
	li = np.concatenate([L.row * 3 + k for k in range(3)])
	lj = np.concatenate([L.col * 3 + k for k in range(3)])
	lv = np.concatenate([L.data] * 3)
	E = np.stack([rest[:, 2] - rest[:, 1], rest[:, 0] - rest[:, 2], rest[:, 1] - rest[:, 0]], axis=1)
	flat_inv = np.linalg.inv(np.stack([rest[:, 1] - rest[:, 0], rest[:, 2] - rest[:, 0]], axis=2))
	ids = np.arange(n) * 3
	rows = np.concatenate([ids + a for a in range(3) for _ in range(3)])
	cols = np.concatenate([ids + b for _ in range(3) for b in range(3)])
	T['setup'] = time.perf_counter() - t0
	p, normal = start.copy(), None
	snaps, cg, M = {}, [], None
	dF, dG, fprev, gprev, fnorm = [], [], None, None, None
	clock = 0.
	for it in range(iters):
		t = time.perf_counter()
		target, normal = surface.project(p, normal, part)
		t1 = time.perf_counter(); T['project'] += t1 - t
		e3 = np.stack([p[tris[:, 2]] - p[tris[:, 1]], p[tris[:, 0]] - p[tris[:, 2]], p[tris[:, 1]] - p[tris[:, 0]]], axis=1)
		S = np.einsum('tk,tki,tkj->tij', cots, e3, E)
		U, _, Vt = np.linalg.svd(S, full_matrices=False)
		R = U @ Vt
		tn = normal[tris].sum(1)
		wrong = (np.cross(R[:, :, 0], R[:, :, 1]) * tn).sum(1) * facing < 0
		U[wrong, :, 1] *= -1
		keep = np.clip(np.linalg.svd(np.stack([p[tris[:, 1]] - p[tris[:, 0]], p[tris[:, 2]] - p[tris[:, 0]]], axis=2) @ flat_inv, compute_uv=False), W.GATHER, 1.0)
		R = U * keep[:, None, :] @ Vt
		t2 = time.perf_counter(); T['svd'] += t2 - t1
		rot = np.einsum('tij,tkj->tki', R, E)
		b = np.zeros((n, 3))
		for k in range(3):
			i, j = tris[:, (k + 1) % 3], tris[:, (k + 2) % 3]
			w = (cots[:, k] / 2)[:, None] * rot[:, k]
			np.add.at(b, j, w)
			np.add.at(b, i, -w)
		span = p[sj] - p[si]
		now = np.linalg.norm(span, axis=1, keepdims=True) + 1e-12
		w = elastic[:, 3:4] * np.minimum(elastic[:, 2:3], now) * span / now
		np.add.at(b, sj, w)
		np.add.at(b, si, -w)
		nn0 = np.einsum('ti,tj->tij', normal, normal) * W.PLANE
		b += np.einsum('tij,tj->ti', nn0, target) + W.DAMP * p
		t3 = time.perf_counter(); T['rhs'] += t3 - t2
		nn = nn0.copy()
		for a_ in range(3):
			nn[:, a_, a_] += W.DAMP
		A = coo_matrix((np.concatenate([lv, nn.transpose(1, 2, 0).ravel()]), (np.concatenate([li, rows]), np.concatenate([lj, cols]))), shape=(3 * n, 3 * n)).tocsc()
		t4 = time.perf_counter(); T['assemble'] += t4 - t3
		if M is None or stale == 1 or it % stale == 0:
			M = factor(A, how)
		t5 = time.perf_counter(); T['factor'] += t5 - t4
		if stale == 1:
			x = M.solve(b.ravel())
		else:
			x, c = pcg(A, b.ravel(), p.ravel(), M, tol)
			cg.append(c)
		g = x.reshape(-1, 3)
		t6 = time.perf_counter(); T['solve'] += t6 - t5
		if aa:
			xk, f = p.ravel(), x - p.ravel()
			nf = np.linalg.norm(f)
			if fnorm is not None and nf > 2 * fnorm:
				dF, dG = [], []  # the residual jumped: start the history again
			elif fprev is not None:
				dF.append(f - fprev)
				dG.append(x - gprev)
				dF, dG = dF[-aa:], dG[-aa:]
			fprev, gprev, fnorm = f, x, nf
			if dF:
				Fm, Gm = np.column_stack(dF), np.column_stack(dG)
				gamma = np.linalg.lstsq(Fm, f, rcond=None)[0]
				g = (x - Gm @ gamma).reshape(-1, 3)
		p = g
		t7 = time.perf_counter(); T['accel'] += t7 - t6
		clock = sum(T.values())
		if it + 1 in checks:
			q, _ = surface.project(p, normal, part)
			snaps[it + 1] = (q.copy(), clock, p.copy())  # on the surface, as solve returns; and the iterate itself
	q, _ = surface.project(p, normal, part)
	return q, snaps, T, cg


def versus(snaps, ref, label, extra=0.):
	for k, (q, c, _) in sorted(snaps.items()):
		d = np.linalg.norm(q - ref, axis=1) * 1000
		print(f'  {label:26} {k:4} iters {c + extra:7.1f} s: from settled mean {d.mean():6.2f}, 95% {np.percentile(d, 95):6.2f}, max {d.max():6.2f} mm', flush=True)


def lift(Gc, Gf, prc, prf, coarse):
	"""A coarse whole-garment answer placed on the fine mesh, piece by piece, by its flat coordinates."""
	out, seen = np.zeros((len(prf['reused']), 3)), np.zeros(len(prf['reused']))
	for name, piece in Gf['pieces'].items():
		pc = Gc['pieces'][name]
		cid = Gc['welded'][Gc['offs'][name]:Gc['offs'][name] + len(pc.V)]
		fid = Gf['welded'][Gf['offs'][name]:Gf['offs'][name] + len(piece.V)]
		for tw_c, tw_f in ((lambda v: v, lambda v: v), (lambda v: prc['twin'][v], lambda v: prf['twin'][v])):
			rc = prc['remap'][tw_c(cid)]
			at3d = np.zeros((len(pc.V), 3))
			at3d[rc >= 0] = coarse[rc[rc >= 0]]
			q = W.locate(pc.V, pc.T.ravel(), piece.V, at3d)
			rf = prf['remap'][tw_f(fid)]
			ok = rf >= 0
			np.add.at(out, rf[ok], q[ok])
			np.add.at(seen, rf[ok], 1)
	return out / seen[:, None]


def main():
	with open(os.path.join(CAP, 'wrap-body-young.json'), encoding='utf-8') as f:
		body = json.load(f)
	P, idx, arm = np.array(body['P'], float).reshape(-1, 3), np.array(body['idx'], int), np.array(body['wArm'], float)
	standing = W.Surface(P, idx, arm)
	with open(os.path.join(CAP, f'wrap-pose-young-{POSE}.json'), encoding='utf-8') as f:
		Q = np.array(json.load(f)['P'], float).reshape(-1, 3)
	print(f'body surface: {len(P)} points', flush=True)
	Gf, posf = fit(7.0)
	prf = prepare(Gf, posf, standing, Q, idx, arm)
	n = len(prf['reused'])
	print(f'whole garment: {n} points, {len(prf["tris"])} triangles', flush=True)

	print('\n== where the time goes, as the code stands (COLAMD ordering, refactor every step), 20 iterations', flush=True)
	_, _, T, _ = run(prf, prf['reused'], 20, how='colamd')
	total = sum(v for k, v in T.items() if k != 'setup')
	for k, v in sorted(T.items(), key=lambda kv: -kv[1]):
		print(f'  {k:10} {v:7.2f} s  {100 * v / total:5.1f}%  ({v / 20 * 1000:7.1f} ms per iteration)', flush=True)
	print('\n== the same with a symmetric ordering, 20 iterations', flush=True)
	_, _, T2, _ = run(prf, prf['reused'], 20, how='mmd')
	print(f'  factor {T2["factor"]:.2f} s, solve {T2["solve"]:.2f} s; COLAMD factor {T["factor"]:.2f} s, solve {T["solve"]:.2f} s', flush=True)
	how = 'mmd' if T2['factor'] + T2['solve'] < T['factor'] + T['solve'] else 'colamd'
	print('  using', how, flush=True)

	print(f'\n== reference and baseline: {REF_ITERS} iterations', flush=True)
	checks = tuple(CHECKS) + (240, 320, 480)
	ref, snaps, Tr, _ = run(prf, prf['reused'], REF_ITERS, how=how, checks=checks)
	d0 = np.linalg.norm(prf['reused'] - ref, axis=1) * 1000
	print(f'  no solve at all (reuse): mean {d0.mean():.2f}, 95% {np.percentile(d0, 95):.2f}, max {d0.max():.2f} mm', flush=True)
	versus(snaps, ref, 'baseline')

	print('\n== stale factorisation, conjugate gradients to a tight tolerance', flush=True)
	for stale in (10, 40):
		q, s, Tv, cg = run(prf, prf['reused'], 160, how=how, stale=stale, checks=CHECKS)
		versus(s, ref, f'refactor every {stale}')
		print(f'    CG iterations per step: mean {np.mean(cg):.1f}, max {max(cg)}; factor {Tv["factor"]:.1f} s, solve {Tv["solve"]:.1f} s, assemble {Tv["assemble"]:.1f} s', flush=True)

	print('\n== Anderson acceleration on the baseline', flush=True)
	for m in (5, 10):
		q, s, Tv, _ = run(prf, prf['reused'], 160, how=how, aa=m, checks=CHECKS)
		versus(s, ref, f'Anderson, window {m}')
		print(f'    acceleration itself {Tv["accel"]:.1f} s; worst stretch at the end {PR.principal(prf["tris"], prf["rest"], q)[:, 0].max():.2f} (reference {PR.principal(prf["tris"], prf["rest"], ref)[:, 0].max():.2f})', flush=True)

	print('\n== coarse first, at 14 mm', flush=True)
	Gc, posc = fit(14.0)
	W.STEP = 7.0
	prc = prepare(Gc, posc, standing, Q, idx, arm)
	print(f'  coarse whole garment: {len(prc["reused"])} points', flush=True)
	for iters in (40, 160):
		cq, _, Tc, _ = run(prc, prc['reused'], iters, how=how)
		t = time.perf_counter()
		start = lift(Gc, Gf, prc, prf, cq)
		cost = sum(Tc.values()) + time.perf_counter() - t
		d = np.linalg.norm(start - ref, axis=1) * 1000
		print(f'  {iters} coarse iterations, lifted, {cost:.1f} s: from settled mean {d.mean():.2f}, 95% {np.percentile(d, 95):.2f}, max {d.max():.2f} mm', flush=True)
		_, s, _, _ = run(prf, start, 80, how=how, checks=(10, 20, 40, 80))
		versus(s, ref, f'then fine, after {iters}', extra=cost)


if __name__ == '__main__':
	main()
