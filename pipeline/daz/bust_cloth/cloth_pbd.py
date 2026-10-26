# Our own taut-membrane drape (position-based): a stretch fabric shrunk onto the body, colliding
# with the skin in 3D, pinned at the bra band's edges; then the skin is moved out onto it.
import time
import numpy as np
import scipy.sparse as sp
from scipy.spatial import cKDTree
import bust_proto as B
from bust_proto import g9, fig
import cloth_proto as C


def adjacency(n, faces):
	r, c = [], []
	for q in faces:
		k = len(q)
		for i in range(k): r += [q[i], q[(i + 1) % k]]; c += [q[(i + 1) % k], q[i]]
	A = sp.csr_matrix((np.ones(len(r)), (r, c)), shape=(n, n)); A.data[:] = 1
	return A


def drape(P, free, shrink=0.3, off=2.0, iters=300, thick=0.15, smooth_n=40, stiff=0.5, relax=0.05, verbose=True, hard_pin=False, start=None, along=1.0):
	"""P: cage (cm). free: per cage vertex 0..1 (0 held on the skin, > 0 inside the bra band).
	Returns the cloth (positions, quads) on the subdivided patch."""
	t0 = time.time()
	S, quads = C.subdiv()
	PS = S @ P
	fs = S @ free
	TS = g9.triangles(quads)
	NS = g9.vertex_normals(PS, TS)
	keep = (fs[quads] > 1e-3).all(1)
	used = np.unique(quads[keep]); remap = -np.ones(len(PS), int); remap[used] = np.arange(len(used))
	CF = remap[quads[keep]]
	n = len(used)
	w = np.clip(fs[used] / 0.25, 0, 1)  # how freely each cloth vertex moves (0: held on the skin)
	X0 = PS[used]
	X = X0 + (off * w)[:, None] * NS[used] if start is None else start(PS[used], NS[used], w)
	A = adjacency(n, CF); deg = np.asarray(A.sum(1)).ravel()
	for _ in range(smooth_n):
		X += (w * 0.6)[:, None] * ((A @ X) / deg[:, None] - X)
	# springs: quad edges and both diagonals; rest = skin length shortened (tension only)
	E = np.concatenate([CF[:, [0, 1]], CF[:, [1, 2]], CF[:, [2, 3]], CF[:, [3, 0]], CF[:, [0, 2]], CF[:, [1, 3]]])
	E = np.unique(np.sort(E, 1), axis=0)
	L0 = np.linalg.norm(X0[E[:, 0]] - X0[E[:, 1]], axis=1) * (1 - shrink)
	# along < 1: the fabric pulls harder across (x) than along (y, z): per-edge stiffness by direction
	ed = X0[E[:, 1]] - X0[E[:, 0]]
	c2 = ed[:, 0] ** 2 / np.maximum((ed ** 2).sum(1), 1e-12)
	ke = c2 + along * (1 - c2)
	# collider: the body's surface near the patch (trunk and arms), as dense samples with normals
	lo, hi = X.min(0) - 5, X.max(0) + 5
	tsel = ((PS[TS] > lo) & (PS[TS] < hi)).all(2).all(1)
	BP, BN = g9.surface_samples(PS, TS[tsel], NS, 0.2)
	tree = cKDTree(BP)
	inv = np.where(w > 0.02, 1.0, 0.0) if hard_pin else w
	cnt = np.zeros(n)
	for it in range(iters):
		# stretch constraints (Jacobi, averaged)
		d = X[E[:, 1]] - X[E[:, 0]]; L = np.linalg.norm(d, axis=1)
		over = L > L0
		corr = np.zeros_like(d)
		corr[over] = (d[over] * (ke[over] * (L[over] - L0[over]) / np.maximum(L[over], 1e-9))[:, None])
		wa, wb = inv[E[:, 0]], inv[E[:, 1]]; ws = np.maximum(wa + wb, 1e-9)
		dX = np.zeros_like(X); cnt[:] = 0
		np.add.at(dX, E[:, 0], corr * (wa / ws)[:, None]); np.add.at(dX, E[:, 1], -corr * (wb / ws)[:, None])
		np.add.at(cnt, E[:, 0], over); np.add.at(cnt, E[:, 1], over)
		X += stiff * dX / np.maximum(cnt, 1)[:, None]
		# a little smoothing keeps it from rippling
		X += (relax * w)[:, None] * ((A @ X) / deg[:, None] - X)
		# collision with the skin
		_, j = tree.query(X)
		dd = np.einsum('ij,ij->i', X - BP[j], BN[j])
		pen = dd < thick
		X[pen] += ((thick - dd[pen]) * (inv[pen] > 0))[:, None] * BN[j[pen]]
	if verbose:
		d = X[E[:, 1]] - X[E[:, 0]]; L = np.linalg.norm(d, axis=1)
		gap, _ = tree.query(X)
		print('drape %.1f s: strain mean %.3f, gap max %.2f median %.2f cm' % (time.time() - t0, np.mean(L / (L0 / (1 - shrink)) - 1), gap.max(), np.median(gap)))
	return X, CF, used


def transfer(P, free, X, CF, thick=0.1, relax=30, step=0.5, fade=0.7):
	"""The band's skin settles onto the cloth: every band vertex goes to the nearest point of the
	cloth (less a hair's thickness), then relaxes along it so the crushed fold spreads out; faded
	in from the band's held edge by its free weight."""
	F = fig()
	TC = g9.triangles(CF)
	NC = g9.vertex_normals(X, TC)
	CP, CN = g9.surface_samples(X, TC, NC, 0.12)
	tree = cKDTree(CP)
	f = np.clip(free / fade, 0, 1); wv = f * f * (3 - 2 * f)
	m = free > 1e-3
	def proj(Y):
		_, j = tree.query(Y)
		return CP[j] - thick * CN[j], np.einsum('ij,ij->i', CP[j] - Y, CN[j])
	Q = P.copy()
	tgt, gap = proj(P[m])
	Q[m] = P[m] + wv[m, None] * (tgt - P[m])
	A = F['A']; deg = np.maximum(np.asarray(A.sum(1)).ravel(), 1)
	for _ in range(relax):
		M = (A @ Q) / deg[:, None]
		Y = Q[m] + step * (M[m] - Q[m])
		t2, _ = proj(Y)
		Q[m] = P[m] + wv[m, None] * (t2 - P[m])
	return Q, gap
