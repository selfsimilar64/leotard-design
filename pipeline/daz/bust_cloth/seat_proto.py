# Prototype: the gluteal cleft spanned by our taut cloth (cleft only: the cheeks and the crease
# under them are left alone). Same drape and transfer as the bust (cloth_pbd).
import os, json, subprocess
import numpy as np
import bust_proto as B
from bust_proto import g9, fig
import cloth_pbd as D

def sstep(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)

def landmarks(P):
	F = fig(); body = F['body'] & (F['arm'] < 0.5)
	H = P[:, 1].max() - P[:, 1].min()
	mid = body & (np.abs(P[:, 0]) < 0.6) & (P[:, 1] > 0.25 * H) & (P[:, 1] < 0.7 * H)
	i = np.where(mid)[0][np.argmin(P[mid, 1])]
	cy, cz = P[i, 1], P[i, 2]
	top = cy
	for y in np.arange(cy + 1, cy + 30, 0.5):
		band = body & (np.abs(P[:, 1] - y) < 0.7) & (P[:, 2] < cz)
		m = band & (np.abs(P[:, 0]) < 0.5); c = band & (np.abs(P[:, 0]) > 3) & (np.abs(P[:, 0]) < 7)
		if m.any() and c.any() and P[m, 2].min() - P[c, 2].min() > 0.3: top = y
		elif y > cy + 6: break
	return dict(cy=cy, cz=cz, top=top)

def region(P, L, w_lo=3.0, w_hi=4.5, w_soft=3.0, top_soft=4.0, front_soft=3.0, front=-1.0, bot=-1.5, bot_soft=0.01):
	"""Free weight of the cloth: a strip along the cleft, |x| within w (narrower at the bottom, so the
	crease under the cheeks is not bridged), from the crotch to above the cleft's top, back of the
	crotch only."""
	F = fig(); body = F['body'] & (F['arm'] < 0.5) | (F['body'] & (F['arm'] < 0.5))
	X, Y, Z = P[:, 0], P[:, 1], P[:, 2]
	t = np.clip((Y - L['cy']) / 6.0, 0, 1)
	w = w_lo + (w_hi - w_lo) * t
	fx = sstep((w + w_soft - np.abs(X)) / w_soft)
	fy = sstep((L['top'] + 1 - Y) / top_soft) * sstep((Y - L['cy'] - bot) / bot_soft)
	fz = sstep((L['cz'] + front - Z) / front_soft)
	r = fx * fy * fz * body
	inside = body & (np.abs(X) < w_hi + w_soft + 0.5) & (Y > L['cy'] - 1.5) & (Y < L['top'] + 2) & (Z < L['cz'] + front + 0.5)
	return np.where(inside, r, 0), inside

def envelope_start(P, tilt=30.0, off=1.0, h=0.25):
	"""Start the cloth outside the cleft: every cloth vertex lifted to the skin seen from behind and
	a little below (the slot's walls are hidden there), plus `off` cm, then smoothed by drape."""
	F = fig()
	t = np.radians(tilt)
	d = np.array([0, np.sin(t), np.cos(t)])          # into the body, from a camera behind and below
	e2 = np.array([0, np.cos(t), -np.sin(t)])
	def to_v(Q): return np.stack([Q[:, 0], Q @ e2, -(Q @ d)], 1)
	def from_v(V): return np.outer(V[:, 0], [1, 0, 0]) + np.outer(V[:, 1], e2) - np.outer(V[:, 2], d)
	def start(PS, NS, w):
		S, quads = D.C.subdiv()
		PSall = S @ P
		TS = g9.triangles(quads)
		Vall = to_v(PSall)
		lo, hi = PS.min(0) - 6, PS.max(0) + 6
		sel = ((PSall[TS] > lo) & (PSall[TS] < hi)).all(2).all(1)
		V = to_v(PS)
		x0, y0 = V[:, 0].min() - 2, V[:, 1].min() - 2
		nx = int((V[:, 0].max() + 2 - x0) / h) + 1; ny = int((V[:, 1].max() + 2 - y0) / h) + 1
		s, _ = B.raster(Vall, TS[sel], np.zeros((len(Vall), 1)), x0, y0, h, nx, ny)
		s = np.where(np.isfinite(s), s, -1e9)
		sv = B.sample(s, x0, y0, h, V[:, 0], V[:, 1], order=0)
		V2 = V.copy(); V2[:, 2] = np.maximum(V[:, 2], sv) + off * w
		return np.where(w[:, None] > 0, from_v(V2), PS)
	return start

def render(objs, out, P_ref, views=('back', 'low', 'back34', 'side'), res=(520, 650), ortho=0.36):
	L = landmarks(P_ref)
	c = np.array([0.0, L['cy'] + 7, -8.0])
	tgt = [0.0, -c[2] * .01, c[1] * .01]
	items = [dict(obj=os.path.abspath(p), out=os.path.abspath(f'{out}/{n}-{v}.png'), target=tgt, view=v, ortho=ortho, dist=1.5)
		for n, (_, p) in objs.items() for v in views]
	jf = os.path.abspath(out + '/jobs.json'); json.dump(dict(res=list(res), items=items), open(jf, 'w'))
	r = subprocess.run([B.BLENDER, '-b', '--factory-startup', '-P', B.S_DIR + '/render_blender.py', '--', jf], capture_output=True, text=True)
	if r.returncode: print(r.stdout[-2000:], r.stderr[-2000:]); raise SystemExit('render failed')

def run(P, **kw):
	L = landmarks(P)
	free, inside = region(P, L, **{k: v for k, v in kw.items() if k in ('w_lo', 'w_hi', 'w_soft', 'top_soft', 'front_soft', 'front', 'bot', 'bot_soft')})
	free = np.where(inside, 0.002 + free, 0)
	dk = {k: v for k, v in kw.items() if k in ('shrink', 'iters', 'stiff', 'thick', 'along', 'relax')}
	X, CF, used = D.drape(P, free, hard_pin=True, start=envelope_start(P, kw.get('tilt', 30), kw.get('off', 1.0)), **{'shrink': 0.5, 'iters': 1500, 'stiff': 1.0, **dk})
	Q, _ = D.transfer(P, free, X, CF)
	return Q, dict(L=L, free=free, X=X, CF=CF)


_legw = None
def leg_weight():
	global _legw
	if _legw is None:
		import sys; sys.path.insert(0, B.REPO + '/pipeline/daz'); import bodies
		w = bodies.part_weights(bodies.figure()); _legw = w['upperleg'] + w['lowerleg']
	return _legw


def drape_grid(P, free, tilt=30.0, h=0.3, off=1.0, shrink=0.3, iters=1500, stiff=1.0, along=1.0, thick=0.15, relax=0.01, verbose=True):
	"""A fresh cloth: a regular grid over the seat as seen from behind and a little below, laid on the
	skin's envelope from that view (so no extra material sits in the cleft), held where the band's
	free weight is ~0, then pulled taut (tension-only springs, stronger across than along when
	along < 1) with 3D collision against the skin."""
	import time
	from scipy.spatial import cKDTree
	t0 = time.time()
	S, quads = D.C.subdiv(); PS = S @ P; fs = S @ free
	TS = g9.triangles(quads); NS = g9.vertex_normals(PS, TS)
	t = np.radians(tilt)
	d = np.array([0, np.sin(t), np.cos(t)]); e2 = np.array([0, np.cos(t), -np.sin(t)])
	to_v = lambda Q: np.stack([Q[:, 0], Q @ e2, -(Q @ d)], 1)
	from_v = lambda V: np.outer(V[:, 0], [1, 0, 0]) + np.outer(V[:, 1], e2) - np.outer(V[:, 2], d)
	reg = fs > 1e-3
	Vr = to_v(PS[reg])
	x0, y0 = Vr[:, 0].min(), Vr[:, 1].min()
	nx = int((Vr[:, 0].max() - x0) / h) + 1; ny = int((Vr[:, 1].max() - y0) / h) + 1
	lo, hi = PS[reg].min(0) - 6, PS[reg].max(0) + 6
	sel = ((PS[TS] > lo) & (PS[TS] < hi)).all(2).all(1)
	Vall = to_v(PS)
	s, o = B.raster(Vall, TS[sel], fs[:, None], x0, y0, h, nx, ny)
	cov = np.isfinite(s)
	wgrid = np.where(cov, o[..., 0], 0)
	from scipy.ndimage import binary_dilation
	node = cov & binary_dilation(wgrid > 0.02, iterations=2)
	# keep the nodes and the quads between them
	idx = -np.ones(node.shape, int); idx[node] = np.arange(node.sum())
	q = []
	for j in range(ny - 1):
		for i in range(nx - 1):
			a, b, c, e = idx[j, i], idx[j, i + 1], idx[j + 1, i + 1], idx[j + 1, i]
			if min(a, b, c, e) >= 0: q.append((a, e, c, b))
	CF = np.array(q)
	jj, ii = np.nonzero(node)
	V = np.stack([x0 + ii * h, y0 + jj * h, s[node]], 1)
	w = np.clip(wgrid[node] / 0.25, 0, 1)
	X0 = from_v(V)
	X = from_v(V + np.outer(off * w, [0, 0, 1]))
	n = len(X)
	inv = np.where(w > 0.02, 1.0, 0.0)
	E = np.concatenate([CF[:, [0, 1]], CF[:, [1, 2]], CF[:, [2, 3]], CF[:, [3, 0]], CF[:, [0, 2]], CF[:, [1, 3]]])
	E = np.unique(np.sort(E, 1), axis=0)
	ed = X0[E[:, 1]] - X0[E[:, 0]]
	L0 = np.sqrt((ed[:, 0] ** 2) + ((V[E[:, 1], 1] - V[E[:, 0], 1]) ** 2)) * (1 - shrink)  # grid lengths (flat)
	c2 = ed[:, 0] ** 2 / np.maximum((ed ** 2).sum(1), 1e-12)
	ke = c2 + along * (1 - c2)
	import scipy.sparse as sps
	A = D.adjacency(n, CF); deg = np.maximum(np.asarray(A.sum(1)).ravel(), 1)
	BP, BN = g9.surface_samples(PS, TS[sel], NS, 0.2)
	tree = cKDTree(BP)
	cnt = np.zeros(n)
	for it in range(iters):
		dd_ = X[E[:, 1]] - X[E[:, 0]]; Ln = np.linalg.norm(dd_, axis=1)
		over = Ln > L0
		corr = np.zeros_like(dd_)
		corr[over] = dd_[over] * (ke[over] * (Ln[over] - L0[over]) / np.maximum(Ln[over], 1e-9))[:, None]
		wa, wb = inv[E[:, 0]], inv[E[:, 1]]; ws = np.maximum(wa + wb, 1e-9)
		dX = np.zeros_like(X); cnt[:] = 0
		np.add.at(dX, E[:, 0], corr * (wa / ws)[:, None]); np.add.at(dX, E[:, 1], -corr * (wb / ws)[:, None])
		np.add.at(cnt, E[:, 0], over); np.add.at(cnt, E[:, 1], over)
		X += stiff * dX / np.maximum(cnt, 1)[:, None]
		X += (relax * inv)[:, None] * ((A @ X) / deg[:, None] - X)
		_, j = tree.query(X)
		dd = np.einsum('ij,ij->i', X - BP[j], BN[j])
		pen = (dd < thick) & (inv > 0)
		X[pen] += (thick - dd[pen])[:, None] * BN[j[pen]]
	if verbose:
		gap, _ = tree.query(X)
		print('grid drape %.1f s: %d nodes, gap max %.2f median %.2f cm' % (time.time() - t0, n, gap.max(), np.median(gap)))
	return X, CF


def run_grid(P, **kw):
	L = landmarks(P)
	free, inside = region(P, L, **{k: v for k, v in kw.items() if k in ('w_lo', 'w_hi', 'w_soft', 'top_soft', 'front_soft', 'front', 'bot', 'bot_soft')})
	free = np.where(inside, 0.002 + free, 0)
	X, CF = drape_grid(P, free, **{k: v for k, v in kw.items() if k in ('tilt', 'h', 'off', 'shrink', 'iters', 'stiff', 'along', 'thick', 'relax')})
	lw = kw.get('leg_keep')
	ft = free if lw is None else free * (1 - sstep((leg_weight() - lw) / 0.4))
	Q, _ = D.transfer(P, ft, X, CF)
	return Q, dict(L=L, free=free, X=X, CF=CF)
