"""Wrap a flat block onto the body once and record where every flat point lands (exploration stage 3).

Half a garment is solved (front, back, one sleeve) with its seams welded and its folds held on the
centre plane: as-rigid-as-possible against the flat pieces, pulled onto the garment surface. Each cut
tried is the same mesh with triangles removed, so a re-solve can be compared point for point with the
map of the whole block.

Inputs, POSTed from the browser to app/captures/ (dev/wrap-eval.js, exportSeed):
  wrap-seed.json: the app's own pieces, used only to start the solve near the answer
  wrap-body.json: the garment surface
Output: app/captures/wrap-<size>-<cut>.json, read by dev/wrap-eval.js. Git-ignored, derived from licensed data.
    python pipeline/wrap_block.py [size]
Spec: knowledge/product/roadmap/flat-and-3d-exploration-plan.md.
"""
import json
import math
import os
import sys

import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import splu
from scipy.spatial import Delaunay, cKDTree

HERE = os.path.dirname(os.path.abspath(__file__))
DERIVED = os.path.join(HERE, '..', 'assets', 'patterns', 'basicpatternblock-leotard-0005', 'derived')
CAPTURES = os.path.join(HERE, '..', 'app', 'captures')
STEP = 7.0  # mm between mesh points
ITERS = 240
FACING = {'front': 1, 'back': -1, 'sleeve': -1}  # on the +x side of the body; the block lays a sleeve out with its front at +x
PLANE = 300.0  # how hard points keep to the surface's tangent plane, against the fabric's own shape
DAMP = 0.05  # how much each step stays where it was


def arclen(p):
	return np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(p, axis=0), axis=1))])


def resample(p, n):
	"""n + 1 points evenly along a polyline."""
	p = np.asarray(p, float)
	s = arclen(p)
	t = np.linspace(0, s[-1], n + 1)
	return np.stack([np.interp(t, s, p[:, i]) for i in range(p.shape[1])], axis=1)


def walk(edges, names):
	"""Edges in order, each turned to start where the last ended."""
	out = [np.array(edges[names[0]], float)]
	if abs(out[0][0, 0]) > abs(out[0][-1, 0]):
		out[0] = out[0][::-1]  # the neck starts on the fold
	for n in names[1:]:
		e = np.array(edges[n], float)
		out.append(e if np.linalg.norm(e[0] - out[-1][-1]) < np.linalg.norm(e[-1] - out[-1][-1]) else e[::-1])
	return dict(zip(names, out))


def inside(pts, poly):
	"""Which points lie inside a closed polygon (even-odd)."""
	x, y = pts[:, 0], pts[:, 1]
	x0, y0 = poly[:, 0], poly[:, 1]
	x1, y1 = np.roll(x0, -1), np.roll(y0, -1)
	hit = np.zeros(len(pts), bool)
	for a, b, c, d in zip(x0, y0, x1, y1):
		if b == d:
			continue
		cond = (b > y) != (d > y)
		hit ^= cond & (x < (c - a) * (y - b) / (d - b) + a)
	return hit


class Piece:
	"""A flat piece as a triangle mesh whose boundary points are known per edge."""

	def __init__(self, name, runs, extra_lines=()):
		self.name, self.runs = name, runs
		order = list(runs)
		pts, self.edge = [], {}
		for k in order:
			ids = list(range(len(pts), len(pts) + len(runs[k]) - 1))
			pts += [tuple(q) for q in runs[k][:-1]]
			self.edge[k] = ids + [(len(pts)) % sum(len(runs[q]) - 1 for q in order)]
		boundary = np.array(pts)
		self.n_boundary = len(boundary)
		extra = []
		self.line = {}
		for lname, line in extra_lines:
			keep = line[inside(line, boundary)]
			self.line[lname] = list(range(len(pts) + len(extra), len(pts) + len(extra) + len(keep)))
			extra += [tuple(q) for q in keep]
		x0, y0 = boundary.min(0)
		x1, y1 = boundary.max(0)
		gx, gy = np.meshgrid(np.arange(x0, x1, STEP), np.arange(y0, y1, STEP * 0.866))
		gx = gx + (np.arange(gx.shape[0]) % 2)[:, None] * STEP / 2
		grid = np.stack([gx.ravel(), gy.ravel()], axis=1)
		grid = grid[inside(grid, boundary)]
		fixed = np.vstack([boundary] + ([np.array(extra)] if extra else []))
		d, _ = cKDTree(fixed).query(grid)
		grid = grid[d > STEP * 0.6]
		self.V = np.vstack([fixed, grid])
		tri = Delaunay(self.V).simplices
		c = self.V[tri].mean(1)
		tri = tri[inside(c, boundary)]
		a = self.V[tri]
		area = 0.5 * ((a[:, 1, 0] - a[:, 0, 0]) * (a[:, 2, 1] - a[:, 0, 1]) - (a[:, 2, 0] - a[:, 0, 0]) * (a[:, 1, 1] - a[:, 0, 1]))
		tri[area < 0] = tri[area < 0][:, [0, 2, 1]]
		self.T = tri[np.abs(area) > 1e-3]
		self.check_boundary()

	def check_boundary(self):
		from collections import Counter
		c = Counter()
		for t in self.T:
			for i in range(3):
				a, b = int(t[i]), int(t[(i + 1) % 3])
				c[(min(a, b), max(a, b))] += 1
		free = [k for k, v in c.items() if v == 1]
		wrong = [k for k in free if not (k[0] < self.n_boundary and k[1] < self.n_boundary)]
		print(f'  {self.name}: {len(self.V)} points, {len(self.T)} triangles, {len(free)} free edges, {len(wrong)} off the outline')


def union_find(n):
	parent = list(range(n))

	def find(a):
		while parent[a] != a:
			parent[a] = parent[parent[a]]
			a = parent[a]
		return a

	def join(a, b):
		parent[find(a)] = find(b)
	return find, join


def chains(loop, P, keep_side):
	"""The seed piece's outline as contiguous runs [name, vertex ids], trimmed to this side of the body."""
	base = lambda s: s.replace('~m', '')
	n = len(loop)
	start = next((i for i in range(n) if loop[i][1] != loop[i - 1][1]), 0)
	runs = []
	for k in range(n):
		v, name = loop[(start + k) % n]
		if name == '':
			name = runs[-1][0] if runs else ''
		if not runs or runs[-1][0] != name:
			runs.append([name, []])
		runs[-1][1].append(v)
	# a run's last vertex is the next run's first
	for i, r in enumerate(runs):
		r[1].append(runs[(i + 1) % len(runs)][1][0])
	out = []
	for name, ids in runs:
		x = P[ids, 0] * keep_side
		if name.endswith('~m') or x.mean() < -0.02:
			continue
		# a line across the centre: only the side kept
		if x.min() < -0.002:
			inside_ids = [v for v, q in zip(ids, x) if q >= -0.002]
			ids = inside_ids
		out.append([base(name), ids])
	return out


def tps_fit(src, dst, reg=1.0):
	"""Thin-plate spline from 2D to 2D."""
	def U(d2):
		with np.errstate(divide='ignore', invalid='ignore'):
			v = d2 * np.log(d2)
		v[~np.isfinite(v)] = 0
		return v
	n = len(src)
	d2 = ((src[:, None] - src[None]) ** 2).sum(-1)
	K = U(d2) + np.eye(n) * reg
	P = np.hstack([np.ones((n, 1)), src])
	A = np.block([[K, P], [P.T, np.zeros((3, 3))]])
	b = np.vstack([dst, np.zeros((3, dst.shape[1]))])
	w = np.linalg.solve(A, b)

	def apply(q):
		d = ((q[:, None] - src[None]) ** 2).sum(-1)
		return U(d) @ w[:n] + np.hstack([np.ones((len(q), 1)), q]) @ w[n:]
	return apply


def locate(uv, I, q, P):
	"""Points q in the seed's flat piece -> their 3D places. Outside it, the nearest triangle's own
	mapping carries on: squeezing them onto its edge would leave folds the solve cannot undo."""
	tri = I.reshape(-1, 3)
	centre = uv[tri].mean(1)
	tree = cKDTree(centre)
	_, near = tree.query(q, k=12)
	out = np.zeros((len(q), 3))
	for i, cand in enumerate(near):
		best, bw = None, -1e9
		for f in cand:
			a, b, c = uv[tri[f]]
			m = np.array([[b[0] - a[0], c[0] - a[0]], [b[1] - a[1], c[1] - a[1]]])
			if abs(np.linalg.det(m)) < 1e-14:
				continue
			l1, l2 = np.linalg.solve(m, q[i] - a)
			w = np.array([1 - l1 - l2, l1, l2])
			if w.min() > bw:
				bw, best = w.min(), (f, w)
		f, w = best
		out[i] = (P[tri[f]] * w[:, None]).sum(0)
	return out


def seed_piece(piece, name, seed, zsign, side):
	"""Start positions for a piece: its outline matched edge by edge to the same edge of the app's piece."""
	title = {'front': 'Front', 'back': 'Back', 'sleeve': 'Sleeve'}[name]
	cells = [c for c in seed['pieces'] if c['panel'] == title]
	if name == 'sleeve':
		cells = [c for c in cells if np.array(c['P'])[::3].mean() * side > 0]
	c = cells[0]
	P, uv, I = np.array(c['P']).reshape(-1, 3), np.array(c['uv']).reshape(-1, 2), np.array(c['I'])
	runs = chains(c['loop'], P, side)
	src, dst = [], []

	def add(block_ids, seed_ids):
		if len(block_ids) < 2 or len(seed_ids) < 2:
			return
		b = piece.V[block_ids]
		s = uv[seed_ids]
		n = max(4, min(30, len(block_ids)))
		src.append(resample(b, n))
		dst.append(resample(s, n))

	if name == 'sleeve':
		cap = next(r for r in runs if r[0] == 'Sleeve seam')[1]
		cuff = next(r for r in runs if r[0] == 'Cuff')[1]
		unders = [r[1] for r in runs if r[0] == 'Underarm seam']
		# the seed's cap, from its back end to its front end
		if (P[cap[0], 2] - P[cap[-1], 2]) * zsign < 0:
			cap = cap[::-1]
		ends = {'back': cap[0], 'front': cap[-1]}

		def touching(v):
			return min(unders, key=lambda u: min(np.linalg.norm(P[u[0]] - P[v]), np.linalg.norm(P[u[-1]] - P[v])))
		ub, uf = touching(ends['back']), touching(ends['front'])
		if ub is uf:
			uf = unders[1] if ub is unders[0] else unders[0]
		ub = ub if np.linalg.norm(P[ub[0]] - P[cap[0]]) < np.linalg.norm(P[ub[-1]] - P[cap[0]]) else ub[::-1]
		uf = uf if np.linalg.norm(P[uf[0]] - P[cap[-1]]) < np.linalg.norm(P[uf[-1]] - P[cap[-1]]) else uf[::-1]
		cf = cuff if np.linalg.norm(P[cuff[0]] - P[uf[-1]]) < np.linalg.norm(P[cuff[-1]] - P[uf[-1]]) else cuff[::-1]
		add(piece.edge['cap'], cap)
		add(piece.edge['under_f'], uf)
		add(piece.edge['wrist'], cf)
		add(piece.edge['under_b'], ub[::-1])
	else:
		names = {'neck': 'Neckline', 'shoulder': 'Shoulder seam', 'armhole': 'Sleeve seam', 'side': 'Side seam', 'leg': 'Leg line', 'crotch': 'Crotch seam'}
		prev = None
		last = None
		# the seed is cut at the high leg: its side and leg match the block's high leg and that much side
		high = piece.line['high']
		if np.linalg.norm(piece.V[high[0]] - piece.V[piece.edge['crotch'][0]]) < np.linalg.norm(piece.V[high[-1]] - piece.V[piece.edge['crotch'][0]]):
			high = high[::-1]  # from the side seam to the crotch
		side_ids = piece.edge['side']
		cut = int(np.argmin(np.linalg.norm(piece.V[side_ids] - piece.V[high[0]], axis=1)))
		block_edge = {'neck': piece.edge['neck'], 'shoulder': piece.edge['shoulder'], 'armhole': piece.edge['armhole'], 'side': side_ids[:cut + 1], 'leg': high, 'crotch': piece.edge['crotch']}
		for k in ('neck', 'shoulder', 'armhole', 'side', 'leg', 'crotch'):
			ids = next(r for r in runs if r[0] == names[k])[1]
			if k == 'neck':
				ids = ids if abs(P[ids[0], 0]) < abs(P[ids[-1], 0]) else ids[::-1]
			else:
				ids = ids if np.linalg.norm(P[ids[0]] - P[last]) < np.linalg.norm(P[ids[-1]] - P[last]) else ids[::-1]
			add(block_edge[k], ids)
			last = ids[-1]
		# the fold: the seed's vertices on the centre line
		near = np.where(np.abs(P[:, 0]) < 0.004)[0]
		near = near[np.argsort(-P[near, 1])]
		top, bottom = near[0], near[-1]
		line = [v for v in near]
		add(piece.edge['centre'], line[::-1])
	src, dst = np.vstack(src), np.vstack(dst)
	warp = tps_fit(src / 100, dst, reg=1e-3)
	return locate(uv, I, warp(piece.V / 100), P)


class Surface:
	"""Closest-point queries on the garment surface, by vertex then tangent plane."""

	def __init__(self, P, idx, arm=None):
		self.P, self.idx = P, idx.reshape(-1, 3)
		e1, e2 = P[self.idx[:, 1]] - P[self.idx[:, 0]], P[self.idx[:, 2]] - P[self.idx[:, 0]]
		fn = np.cross(e1, e2)
		N = np.zeros_like(P)
		for k in range(3):
			np.add.at(N, self.idx[:, k], fn)
		self.N = N / (np.linalg.norm(N, axis=1, keepdims=True) + 1e-12)
		self.tree = cKDTree(P)
		# the inner arm nearly touches the ribs: points of each part look only at their own part
		self.parts = {}
		if arm is not None:
			for key, ids in (('torso', np.where(arm < 0.5)[0]), ('arm', np.where(arm > 0.15)[0])):
				self.parts[key] = (cKDTree(P[ids]), ids)
		order = np.argsort(self.idx.ravel())
		self.vf_faces = (order // 3)
		counts = np.bincount(self.idx.ravel(), minlength=len(P))
		self.vf_start = np.concatenate([[0], np.cumsum(counts)])

	def nearest(self, p, was=None, k=16, part=None):
		"""Nearest surface vertex to each point, not across to a surface facing the other way.
		part: per point True where it belongs to the sleeve."""
		if part is not None and self.parts:
			ids = np.zeros((len(p), k), int)
			for key, mask in (('arm', part), ('torso', ~part)):
				if mask.any():
					tree, map_ = self.parts[key]
					ids[mask] = map_[tree.query(p[mask], k=k)[1]]
		else:
			ids = self.tree.query(p, k=k)[1]
		if was is None:
			return ids[:, 0]
		ok = (self.N[ids] * was[:, None]).sum(-1) > 0.2
		pick = ok.argmax(1)
		pick[~ok.any(1)] = 0
		return ids[np.arange(len(p)), pick]

	def project(self, p, was=None, part=None):
		"""Points moved onto the surface; returns them with the surface normal there."""
		v = self.nearest(p, was, part=part)
		n = self.N[v]
		q = p - n * ((p - self.P[v]) * n).sum(1, keepdims=True)
		return q, n

	def hosts(self, p, was=None, part=None):
		"""Host triangle and weights for each point (the surface coordinates the app stores)."""
		v = self.nearest(p, was, part=part)
		faces, weights = np.zeros((len(p), 3), int), np.zeros((len(p), 3))
		for i, u in enumerate(v):
			# the fan round the vertex and one ring out
			fs = self.vf_faces[self.vf_start[u]:self.vf_start[u + 1]]
			ring = np.unique(self.idx[fs])
			fs2 = np.unique(np.concatenate([self.vf_faces[self.vf_start[r]:self.vf_start[r + 1]] for r in ring]))
			best, bd = None, 1e9
			for f in fs2:
				w, d = closest_on_triangle(p[i], self.P[self.idx[f]])
				if d < bd:
					best, bd = (f, w), d
			faces[i] = self.idx[best[0]]
			weights[i] = best[1]
		return faces, weights


def closest_on_triangle(p, tri):
	a, b, c = tri
	ab, ac, ap = b - a, c - a, p - a
	d00, d01, d11 = ab @ ab, ab @ ac, ac @ ac
	d20, d21 = ap @ ab, ap @ ac
	den = d00 * d11 - d01 * d01 or 1e-12
	v, w = (d11 * d20 - d01 * d21) / den, (d00 * d21 - d01 * d20) / den
	bary = np.clip(np.array([1 - v - w, v, w]), 0, 1)
	bary /= bary.sum()
	q = bary @ tri
	return bary, np.linalg.norm(q - p)


def solve(tris, rest, pos, folds, surface, facing, part=None, held=None, iters=ITERS, label=''):
	"""ARAP against the flat rest shapes. Each point keeps to the surface's tangent plane, free to slide
	along it, so the piece can settle (a pull towards the closest point holds it nearly still). Folds stay
	on x = 0. tris: welded vertex ids; rest: [tri, corner, 2] flat coordinates in metres; facing: +1 where
	the flat triangle's face looks outward from the body, -1 where a piece is laid out the other way up;
	part: per point True on the sleeve; held: points that do not move.
	"""
	n = len(pos)
	I, J, W, cots = [], [], [], []
	for t, a in zip(tris, rest):
		c = np.zeros(3)
		for k in range(3):
			u, v = a[(k + 1) % 3] - a[k], a[(k + 2) % 3] - a[k]
			c[k] = (u @ v) / (abs(u[0] * v[1] - u[1] * v[0]) + 1e-12)
		c = np.clip(c, 0.02, 6)
		cots.append(c)
		for k in range(3):
			i, j = t[(k + 1) % 3], t[(k + 2) % 3]
			w = c[k] / 2
			I += [i, j, i, j]
			J += [j, i, i, j]
			W += [-w, -w, w, w]
	L = coo_matrix((W, (I, J)), shape=(n, n)).tocoo()
	# the Laplacian on each of x, y, z
	li = np.concatenate([L.row * 3 + k for k in range(3)])
	lj = np.concatenate([L.col * 3 + k for k in range(3)])
	lv = np.concatenate([L.data] * 3)
	cots = np.array(cots)
	foldw = np.zeros(n)
	foldw[folds] = 1e4
	holdw = np.zeros(n)
	if held is not None:
		holdw[held] = 1e5
	normal = None
	p = pos.copy()
	hold_at = pos.copy()
	# rest edges per triangle corner: e[k] runs opposite corner k
	E = np.stack([rest[:, 2] - rest[:, 1], rest[:, 0] - rest[:, 2], rest[:, 1] - rest[:, 0]], axis=1)
	ids = np.arange(n) * 3
	rows = np.concatenate([ids + a for a in range(3) for _ in range(3)])
	cols = np.concatenate([ids + b for _ in range(3) for b in range(3)])
	for it in range(iters):
		target, normal = surface.project(p, normal, part)
		e3 = np.stack([p[tris[:, 2]] - p[tris[:, 1]], p[tris[:, 0]] - p[tris[:, 2]], p[tris[:, 1]] - p[tris[:, 0]]], axis=1)
		# per triangle the closest isometry from flat to 3D
		S = np.einsum('tk,tki,tkj->tij', cots, e3, E)
		U, _, Vt = np.linalg.svd(S, full_matrices=False)
		R = U @ Vt
		# a triangle must not turn inside out: ARAP alone would let it, since 2D into 3D has no handedness
		tn = normal[tris].sum(1)
		wrong = (np.cross(R[:, :, 0], R[:, :, 1]) * tn).sum(1) * facing < 0
		U[wrong, :, 1] *= -1
		R[wrong] = U[wrong] @ Vt[wrong]
		rot = np.einsum('tij,tkj->tki', R, E)
		b = np.zeros((n, 3))
		for k in range(3):
			i, j = tris[:, (k + 1) % 3], tris[:, (k + 2) % 3]
			w = (cots[:, k] / 2)[:, None] * rot[:, k]
			np.add.at(b, j, w)
			np.add.at(b, i, -w)
		# the plane through the closest point, as w n n' (p - q) = 0; a little damping towards where it was
		nn = np.einsum('ti,tj->tij', normal, normal) * PLANE
		nn[:, 0, 0] += foldw
		for a_ in range(3):
			nn[:, a_, a_] += DAMP
		for a_ in range(3):
			nn[:, a_, a_] += holdw
		b += np.einsum('tij,tj->ti', np.einsum('ti,tj->tij', normal, normal) * PLANE, target) + DAMP * p + holdw[:, None] * hold_at
		A = coo_matrix((np.concatenate([lv, nn.transpose(1, 2, 0).ravel()]), (np.concatenate([li, rows]), np.concatenate([lj, cols]))), shape=(3 * n, 3 * n)).tocsc()
		next_p = splu(A).solve(b.ravel()).reshape(-1, 3)
		move = np.linalg.norm(next_p - p, axis=1)
		p = next_p
		if it % 20 == 0 or it == iters - 1:
			across, along = stretch(tris, rest, p)
			print(f'    {label} iter {it}: max move {move.max() * 1000:.2f} mm, mean {move.mean() * 1000:.3f}; across {across.mean():.3f}, along {along.mean():.3f}; inside out {wrong.mean() * 100:.2f}%', flush=True)
	free = holdw == 0
	q, normal = surface.project(p, normal, part)
	p[free] = q[free]
	return p, normal


def stretch(tris, rest, p):
	"""Per triangle: stretch along x (across) and y (along the grain) of the flat piece."""
	a = rest
	Dm = np.stack([a[:, 1] - a[:, 0], a[:, 2] - a[:, 0]], axis=2)
	Ds = np.stack([p[tris[:, 1]] - p[tris[:, 0]], p[tris[:, 2]] - p[tris[:, 0]]], axis=2)
	F = Ds @ np.linalg.inv(Dm)
	return np.linalg.norm(F[:, :, 0], axis=1), np.linalg.norm(F[:, :, 1], axis=1)


def report(body, surface, base, tris, rest, tag, pieces, offs, welded):
	"""Where the block lands and how it stretches, at the block's own levels."""
	across, along = stretch(tris, rest, base)
	c = base[tris].mean(1)
	for name, lo, hi in (('hip', 0.84, 0.92), ('waist', 0.98, 1.06), ('bust', 1.14, 1.20)):
		for piece in ('front', 'back'):
			m = (tag == piece) & (c[:, 1] > lo) & (c[:, 1] < hi)
			print(f'{name:6}{piece:6} across {across[m].mean():.3f}, along {along[m].mean():.3f}')
	print('worst stretch: across', np.percentile(across, 99).round(2), 'along', np.percentile(along, 99).round(2), 'least: across', np.percentile(across, 1).round(2), 'along', np.percentile(along, 1).round(2))
	lm = body['refLm']
	key = 'l' if lm['shoulder_l'][0] > 0 else 'r'
	def at(piece, edge, i):
		return base[welded[offs[piece] + pieces[piece].edge[edge][i]]]
	print('neck at centre front', at('front', 'neck', 0).round(3), 'neck_base', np.round(lm['neck_base'], 3))
	print('shoulder end', at('front', 'shoulder', -1).round(3), 'shoulder landmark', np.round(lm['shoulder_' + key], 3))
	print('armpit (armhole end)', at('front', 'armhole', -1).round(3))
	print('wrist edge', at('sleeve', 'wrist', len(pieces['sleeve'].edge['wrist']) // 2).round(3), 'wrist landmark', np.round(lm['wrist_' + key], 3))
	print('crotch', at('front', 'crotch', 0).round(3))
	seam = [np.linalg.norm(at('front', 'side', i) - at('back', 'side', i)) for i in range(len(pieces['front'].edge['side']))]
	print('side seam gap, mm', round(max(seam) * 1000, 3), '(the two sides share their points)')


def main():
	size = sys.argv[1] if len(sys.argv) > 1 else 'XS'
	with open(os.path.join(DERIVED, size + '.json'), encoding='utf-8') as f:
		block = json.load(f)
	with open(os.path.join(CAPTURES, 'wrap-seed.json'), encoding='utf-8') as f:
		seed = json.load(f)
	with open(os.path.join(CAPTURES, 'wrap-body.json'), encoding='utf-8') as f:
		body = json.load(f)
	Gp = np.array(body['P'], float).reshape(-1, 3)
	idx = np.array(body['idx'], int)
	surface = Surface(Gp, idx, np.array(body['wArm'], float))
	fp = np.array(next(c for c in seed['pieces'] if c['panel'] == 'Front')['P']).reshape(-1, 3)
	bp = np.array(next(c for c in seed['pieces'] if c['panel'] == 'Back')['P']).reshape(-1, 3)
	zsign = np.sign(bp[:, 2].mean() - fp[:, 2].mean())  # +1: the back has the larger z
	sides = [c for c in seed['pieces'] if c['panel'] == 'Sleeve']
	loop_names = {n for _, n in sides[0]['loop']}
	s0 = np.array(sides[0]['P']).reshape(-1, 3)[:, 0].mean()
	side = 1 if (s0 > 0) == ('Cuff' in loop_names) else -1  # the side the unmirrored names lie on

	P = block['pieces']
	count = lambda *lens: max(2, round(sum(lens) / len(lens) / STEP))
	L = {(p, k): float(arclen(np.array(P[p]['edges'][k]))[-1]) for p in P for k in P[p]['edges']}
	n_sh = count(L['front', 'shoulder'], L['back', 'shoulder'])
	n_si = count(L['front', 'side'], L['back', 'side'])
	n_cr = count(L['front', 'crotch'], L['back', 'crotch'])
	n_af, n_ab = count(L['front', 'armhole']), count(L['back', 'armhole'])

	fw = walk(P['front']['edges'], ['neck', 'shoulder', 'armhole', 'side', 'leg', 'crotch', 'centre'])
	bw = walk(P['back']['edges'], ['neck', 'shoulder', 'armhole', 'side', 'leg', 'crotch', 'centre'])
	nums = {'shoulder': n_sh, 'side': n_si, 'crotch': n_cr}

	def runs_of(w, n_arm):
		out = {}
		for k, e in w.items():
			m = nums.get(k, n_arm if k == 'armhole' else count(float(arclen(e)[-1])))
			out[k] = resample(e, m)
		return out

	# the extra lines the cuts follow, so a cut lands on mesh points
	def high_leg(name):
		leg = np.array(P[name]['variants']['high_hips']['leg'], float)
		return resample(leg, max(4, round(float(arclen(leg)[-1]) / STEP)))

	def scoop(w, depth):
		neck = w['neck']
		end = neck[-1]
		c = np.array([0.0, neck[0, 1] - depth])
		pts = [c + np.array([end[0] * 0.98 * math.sin(t), (end[1] - 3 - c[1]) * (1 - math.cos(t))]) for t in np.linspace(0, math.pi / 2, 40)]
		return resample(np.array(pts), max(4, round(float(arclen(np.array(pts))[-1]) / STEP)))

	front = Piece('front', runs_of(fw, n_af), [('high', high_leg('front')), ('scoop', scoop(fw, 90))])
	back = Piece('back', runs_of(bw, n_ab), [('high', high_leg('back')), ('scoop', scoop(bw, 160))])

	# sleeve: back end of the cap (x < 0) -> top -> front end
	se = {k: np.array(v, float) for k, v in P['sleeve']['edges'].items()}
	cap = se['cap'] if se['cap'][0, 0] < se['cap'][-1, 0] else se['cap'][::-1]
	top = int(np.argmin(np.abs(cap[:, 0])))
	cap_b, cap_f = cap[:top + 1], cap[top:]
	sides_u = [se['underarm_b'], se['underarm_f']]
	under_f = max(sides_u, key=lambda e: e[:, 0].mean())
	under_b = min(sides_u, key=lambda e: e[:, 0].mean())
	under_f = under_f if under_f[0, 1] > under_f[-1, 1] else under_f[::-1]  # cap end to wrist
	under_b = under_b if under_b[0, 1] > under_b[-1, 1] else under_b[::-1]
	wrist = se['wrist'] if se['wrist'][0, 0] > se['wrist'][-1, 0] else se['wrist'][::-1]  # front side to back
	n_u = count(float(arclen(under_f)[-1]), float(arclen(under_b)[-1]))
	sr = {'cap': np.vstack([resample(cap_b, n_ab)[:-1], resample(cap_f, n_af)]), 'under_f': resample(under_f, n_u), 'wrist': resample(wrist, count(float(arclen(wrist)[-1]))), 'under_b': resample(under_b[::-1], n_u)}
	# a shorter sleeve: a straight line this far above the wrist, which is about where this body's wrist is
	cuff = np.column_stack([np.arange(-300.0, 300.0, STEP), np.full(len(np.arange(-300.0, 300.0, STEP)), wrist[:, 1].mean() + 45.0)])
	sleeve = Piece('sleeve', sr, [('cuff', cuff)])

	# weld: union-find over all pieces' points
	pieces = {'front': front, 'back': back, 'sleeve': sleeve}
	offs, total = {}, 0
	for k, q in pieces.items():
		offs[k] = total
		total += len(q.V)
	find, join = union_find(total)
	g = lambda name, i: offs[name] + i
	pair = lambda a, ea, b, eb, flip=False: [join(g(a, x), g(b, y)) for x, y in zip(pieces[a].edge[ea], (pieces[b].edge[eb][::-1] if flip else pieces[b].edge[eb]))]
	pair('front', 'shoulder', 'back', 'shoulder')
	pair('front', 'side', 'back', 'side')
	pair('front', 'crotch', 'back', 'crotch')
	cap_ids = sleeve.edge['cap']
	back_cap, front_cap = cap_ids[:n_ab + 1], cap_ids[n_ab:]
	for x, y in zip(back.edge['armhole'], back_cap[::-1]):  # back armhole runs shoulder to side; the cap's back half runs side to top
		join(g('back', x), g('sleeve', y))
	for x, y in zip(front.edge['armhole'], front_cap):
		join(g('front', x), g('sleeve', y))
	# the sleeve's two sides, cap end to wrist
	for x, y in zip(sleeve.edge['under_f'], sleeve.edge['under_b'][::-1]):
		join(g('sleeve', x), g('sleeve', y))
	roots = {}
	welded = np.zeros(total, int)
	for i in range(total):
		welded[i] = roots.setdefault(find(i), len(roots))
	nw = len(roots)
	print(f'welded {total} points to {nw}')

	starts = np.zeros((nw, 3))
	counts = np.zeros(nw)
	for name, piece in pieces.items():
		q = seed_piece(piece, name, seed, zsign, side)
		ids = welded[offs[name]:offs[name] + len(piece.V)]
		np.add.at(starts, ids, q)
		np.add.at(counts, ids, 1)
	starts /= counts[:, None]

	folds = np.unique(np.concatenate([welded[offs['front'] + np.array(front.edge['centre'])], welded[offs['back'] + np.array(back.edge['centre'])]]))

	def assemble(selectors=None):
		tt, rr, tag, face = [], [], [], []
		for name, piece in pieces.items():
			T = piece.T if not selectors or name not in selectors else piece.T[selectors[name]]
			tt.append(welded[offs[name] + T])
			rr.append(piece.V[T] / 1000)
			tag += [name] * len(T)
			face.append(np.full(len(T), FACING[name]))
		return np.vstack(tt), np.vstack(rr), np.array(tag), np.concatenate(face)

	def below(piece, line_ids, above=True):
		"""Triangles on the kept side of a cut line: above it (a leg) or below it (a neck)."""
		line = piece.V[line_ids]
		c = piece.V[piece.T].mean(1)
		xs = np.clip(c[:, 0], line[:, 0].min(), line[:, 0].max())
		order = np.argsort(line[:, 0])
		y = np.interp(xs, line[order, 0], line[order, 1])
		# beyond the line's outer end its height carries on: a leg line ends on the side seam, and what is below
		# that goes with the rest of the leg. A neck line ends on the shoulder seam, and what is beyond stays.
		return c[:, 1] > y if above else (c[:, 1] < y) | (c[:, 0] > line[:, 0].max())

	cuts = {
		'block': None,
		'high': {'front': below(front, front.line['high']), 'back': below(back, back.line['high'])},
		'scoop': {'front': below(front, front.line['scoop'], False), 'back': below(back, back.line['scoop'], False)},
		'cuff': {'sleeve': below(sleeve, sleeve.line['cuff'])},
	}
	cuts['high-cuff'] = {**cuts['high'], **cuts['cuff']}
	results = {}
	tris, rest, tag, facing = assemble()
	sleeve_points = np.zeros(nw, bool)
	sleeve_points[welded[offs['sleeve']:offs['sleeve'] + len(sleeve.V)]] = True
	ring = np.unique(welded[offs['sleeve'] + np.array(sleeve.edge['cap'])])
	sleeve_points[ring] = False  # the armhole belongs to the torso

	def part_solve(mask, tr_mask, held_ids=None, iters=ITERS, label='', start=None):
		used = np.unique(tris[tr_mask])
		remap = -np.ones(nw, int)
		remap[used] = np.arange(len(used))
		held_local = remap[np.intersect1d(held_ids, used)] if held_ids is not None else None
		q, _ = solve(remap[tris[tr_mask]], rest[tr_mask], start[used], remap[np.intersect1d(folds, used)], surface, facing[tr_mask], part=mask[used], held=held_local, iters=iters, label=label)
		out = start.copy()
		out[used] = q
		return out

	torso = tag != 'sleeve'
	print('solving the torso')
	p = part_solve(sleeve_points, torso, label='torso', start=starts)
	print('solving the sleeve onto that armhole')
	# the sleeve starts rolled round the arm: down its length from the shoulder, across it by angle. The
	# app's own sleeve is a poor start here: the block's head stands much taller and folds when squeezed into it.
	lm = body['refLm']
	key = 'l' if lm['shoulder_l'][0] > 0 else 'r'
	shoulder, wrist_at = np.array(lm['shoulder_' + key]), np.array(lm['wrist_' + key])
	axis = wrist_at - shoulder
	axis /= np.linalg.norm(axis)
	out = np.array([1.0, 0, 0]) - axis * axis[0]
	out /= np.linalg.norm(out)
	ahead = np.cross(out, axis)
	if ahead[2] * -zsign < 0:
		ahead = -ahead  # towards the front of the body
	sv = sleeve.V
	half = np.interp(sv[:, 1], *zip(*sorted((float(y), float(abs(x))) for x, y in sv[:sleeve.n_boundary])))
	top = sv[:, 1].max()
	rolled = shoulder + axis[None] * ((top - sv[:, 1])[:, None] / 1000 * 0.9) - axis[None] * 0.01
	angle = np.clip(sv[:, 0] / np.maximum(half, 1), -1, 1) * np.pi * 0.98
	rolled = rolled + (out[None] * np.cos(angle)[:, None] + ahead[None] * np.sin(angle)[:, None]) * 0.09
	rolled, _ = surface.project(rolled, None, np.ones(len(rolled), bool))
	own = welded[offs['sleeve']:offs['sleeve'] + len(sv)]
	loose = ~np.isin(own, ring)
	p[own[loose]] = rolled[loose]
	p = part_solve(sleeve_points, ~torso, held_ids=ring, label='sleeve', start=p)
	print('settling them together')
	p = part_solve(sleeve_points, np.ones(len(tris), bool), iters=60, label='all', start=p)
	results['block'] = p
	base = p
	for cut in ('high', 'scoop', 'cuff', 'high-cuff'):
		tr, re, ta, fa = assemble(cuts[cut])
		used = np.unique(tr)
		print('solving', cut)
		q = base.copy()
		remap = -np.ones(nw, int)
		remap[used] = np.arange(len(used))
		pos, nn = solve(remap[tr], re, q[used], remap[np.intersect1d(folds, used)], surface, fa, part=sleeve_points[used], iters=120, label=cut)
		results[cut] = (used, pos)
		d = np.linalg.norm(pos - base[used], axis=1) * 1000
		print(f'  reuse error, {cut}: mean {d.mean():.1f} mm, 95% {np.percentile(d, 95):.1f} mm, max {d.max():.1f} mm')
		y, on_sleeve = base[used, 1], sleeve_points[used]
		for name, m in (('sleeve', on_sleeve), ('above waist', ~on_sleeve & (y >= 1.03)), ('waist to hip', ~on_sleeve & (y < 1.03) & (y >= 0.88)), ('below hip', ~on_sleeve & (y < 0.88))):
			if m.any():
				print(f'    {name}: mean {d[m].mean():.1f} mm, 95% {np.percentile(d[m], 95):.1f} mm, max {d[m].max():.1f} mm')

	tag_all = tag
	along_all, across_all = stretch(tris, rest, base)[1], stretch(tris, rest, base)[0]
	for name in pieces:
		m = tag_all == name
		print(f'{name}: across mean {across_all[m].mean():.3f} [{np.percentile(across_all[m], 5):.2f}-{np.percentile(across_all[m], 95):.2f}], along mean {along_all[m].mean():.3f} [{np.percentile(along_all[m], 5):.2f}-{np.percentile(along_all[m], 95):.2f}]')

	# output: whole garment, each half mirrored, as host triangles the app can place on any body
	def export(cut, pts_all, selectors):
		cells = []
		normal_was = None
		for name, piece in pieces.items():
			T = piece.T if not selectors or name not in selectors else piece.T[selectors[name]]
			used = np.unique(T)
			remap = -np.ones(len(piece.V), int)
			remap[used] = np.arange(len(used))
			ids = welded[offs[name] + used]
			q = pts_all[ids]
			uv = piece.V[used] / 1000
			parts = sleeve_points[ids]
			def make(q, uv, flip, label):
				f, w = surface.hosts(q, part=parts)
				tri = remap[T]
				if flip != (FACING[name] < 0):
					tri = tri[:, [0, 2, 1]]
				return {'name': label, 'uv': uv.ravel().round(5).tolist(), 'I': tri.ravel().tolist(), 'hostI': f.ravel().tolist(), 'hostW': w.ravel().round(5).tolist()}
			mirrored = q * np.array([-1, 1, 1])
			muv = uv * np.array([-1, 1])
			if name == 'sleeve':
				cells.append(make(q, uv, False, 'Sleeve'))
				cells.append(make(mirrored, muv, True, 'Sleeve'))
			else:
				cells.append(make(q, uv, False, name.capitalize()))
				cells.append(make(mirrored, muv, True, name.capitalize()))
		with open(os.path.join(CAPTURES, f'wrap-{size}-{cut}.json'), 'w', encoding='utf-8') as f:
			json.dump({'size': size, 'cut': cut, 'side': side, 'cells': cells}, f, separators=(',', ':'))

	export('block', base, None)
	full = base.copy()
	for cut in ('high', 'scoop', 'cuff', 'high-cuff'):
		used, pos = results[cut]
		mix = full.copy()
		mix[used] = pos
		export(cut + '-resolved', mix, cuts[cut])
		export(cut + '-reused', full, cuts[cut])
	np.savez(os.path.join(DERIVED, f'wrap-{size}.npz'), base=base, tris=tris, rest=rest, tag=tag)
	report(body, surface, base, tris, rest, tag, pieces, offs, welded)
	# where the lines land, in the surface's metres
	info = {}
	for name, piece in pieces.items():
		for k, e in piece.edge.items():
			pts = base[welded[offs[name] + np.array(e)]]
			info[f'{name}.{k}'] = {'length3d': round(float(arclen(pts)[-1]) * 1000, 1), 'flat': round(float(arclen(piece.V[e])[-1]), 1), 'start': pts[0].round(3).tolist(), 'end': pts[-1].round(3).tolist(), 'mid': pts[len(pts) // 2].round(3).tolist()}
	print(json.dumps(info, indent=0)[:6000])
	print('landmarks', {k: [round(v, 3) for v in body['refLm'][k]] for k in list(body['refLm'])[:8]})


if __name__ == '__main__':
	main()
