# Prototype: lift + squish the bust, then a cloth simulation (Blender) over it; the skin takes the
# settled cloth's shape. Works on a baked Genesis 9 cage (Daz cm, y up, +z front).
import os, json, subprocess, time
import numpy as np
import bust_proto as B
from bust_proto import g9, fig

S_DIR = os.path.dirname(os.path.abspath(__file__))


def diffuse(w, A, n):
	deg = np.asarray(A.sum(1)).ravel(); deg[deg == 0] = 1
	for _ in range(n): w = np.maximum(w, (A @ w) / deg)
	return w


def smooth(w, A, n, keep=None):
	deg = np.asarray(A.sum(1)).ravel() + 1
	for _ in range(n): w = (A @ w + w) / deg
	return w


def to_bl(P): return np.stack([P[:, 0], -P[:, 2], P[:, 1]], 1) * 0.01
def from_bl(Q): return np.stack([Q[:, 0], Q[:, 2], -Q[:, 1]], 1) * 100


def prepare(P, lift=1.0, squish=0.8):
	F = fig(); A = F['A']; T = F['tris']
	trunk = F['body'] & (F['arm'] < 0.5)
	wa = np.clip(1 - (F['arm'] - 0.15) / 0.25, 0, 1) * F['body']
	pec = F['pec'] * trunk
	# the breast and the skin around it, spread over the cleavage and below the fold
	region = smooth(diffuse(pec, A, 6), A, 10) * wa
	N = g9.vertex_normals(P, T)
	P = P.copy()
	# lift: a wide, soft field
	wl = smooth(diffuse(pec, A, 10), A, 25) * wa
	wl = np.clip(wl / max(wl.max(), 1e-9), 0, 1)
	P[:, 1] += lift * wl
	# squish: the breast pressed inwards along its normal
	ws = smooth(np.clip(pec / 0.4, 0, 1), A, 6) * wa
	N = g9.vertex_normals(P, T)
	P -= (squish * ws)[:, None] * N
	return P, region


def band(P, below=10.0, above=4.0, theta=110.0, soft_lo=8.0, soft_hi=4.0, soft_t=35.0):
	"""The bra's footprint: a band around the torso from `below` cm under the breasts to `above` cm
	over them, front and sides to `theta` degrees from the front. 1 = free cloth, 0 = held."""
	F = fig()
	trunk = F['body'] & (F['arm'] < 0.5)
	wa = np.clip(1 - (F['arm'] - 0.15) / 0.25, 0, 1) * F['body']
	pec = F['pec'] > 0.3
	ylo, yhi = P[pec, 1].min() - below, P[pec, 1].max() + above
	b = trunk & (P[:, 1] > P[pec, 1].min() - 2) & (P[:, 1] < P[pec, 1].max())
	zc = 0.5 * (P[b, 2].max() + P[b, 2].min())
	th = np.degrees(np.abs(np.arctan2(P[:, 0], P[:, 2] - zc)))
	fy = np.clip(np.minimum((P[:, 1] - ylo) / soft_lo, (yhi - P[:, 1]) / soft_hi), 0, 1)
	fy = fy * fy * (3 - 2 * fy)
	ft = np.clip((theta - th) / soft_t, 0, 1)
	inside = trunk & (P[:, 1] > ylo - 1) & (P[:, 1] < yhi + 1) & (th < theta + 5)
	return np.where(inside, fy * ft, 0) * wa, inside


_sub = None
def subdiv():
	global _sub
	if _sub is None:
		F = fig()
		S, quads, parent = g9.cc_stencil(len(F['V']), F['faces'])
		_sub = (S, quads)
	return _sub


def simulate(P, region, out_dir, off=1.5, frames=60, rmin=0.02, pin_w=0.12, smooth_n=40, **st):
	"""The cloth: the region's skin subdivided once, floated off by `off` cm (less towards its held
	border) and smoothed, so it starts as a loose shell with no cleavage; it shrinks onto the body.
	Then every skin vertex of the region is cast along its normal onto the settled cloth and moves
	out to it (never in)."""
	F = fig(); T = F['tris']
	S, quads = subdiv()
	PS = S @ P
	rs = S @ region
	keepq = (rs[quads] > rmin).all(1)
	CQ = quads[keepq]
	used = np.unique(CQ); remap = -np.ones(len(PS), int); remap[used] = np.arange(len(used))
	CF = remap[CQ]
	TS = np.concatenate([quads[:, [0, 1, 2]], quads[:, [0, 2, 3]]])
	NS = g9.vertex_normals(PS, TS)
	r = rs[used]
	pin = np.clip(1 - (r - rmin) / (pin_w - rmin), 0, 1)
	CV = PS[used] + (off * (1 - pin))[:, None] * NS[used]
	# smooth the shell (free vertices only) so it bridges the cleavage from the start
	nC = len(used)
	import scipy.sparse as sp
	rr, cc = [], []
	for q in CF:
		for i in range(4): rr += [q[i], q[(i + 1) % 4]]; cc += [q[(i + 1) % 4], q[i]]
	A = sp.csr_matrix((np.ones(len(rr)), (rr, cc)), shape=(nC, nC)); A.data[:] = 1
	deg = np.asarray(A.sum(1)).ravel()
	for _ in range(smooth_n):
		M = (A @ CV) / deg[:, None]
		CV += (1 - pin)[:, None] * 0.6 * (M - CV)
		# never inside the skin: push back out along the normal if it sank below the offset skin
		d = np.einsum('ij,ij->i', CV - PS[used], NS[used])
		low = d < 0.3 * (1 - pin)
		CV[low] += ((0.3 * (1 - pin) - d)[low])[:, None] * NS[used][low]
	patch = np.where(region > rmin)[0]
	N = g9.vertex_normals(P, T)
	settings = dict(body_thick=0.0015, cloth_dist=0.0015, frames=frames)
	settings.update(st)
	jin = os.path.join(out_dir, 'sim_in.json'); jout = os.path.join(out_dir, 'sim_out.json')
	body_faces = quads.tolist()
	Nb = np.stack([N[:, 0], -N[:, 2], N[:, 1]], 1)
	json.dump(dict(V=to_bl(PS).tolist(), faces=body_faces, CV=to_bl(CV).tolist(), CF=CF.tolist(), pin=pin.tolist(),
		Q=to_bl(P[patch]).tolist(), QN=Nb[patch].tolist(), settings=settings), open(jin, 'w'))
	t = time.time()
	if os.path.exists(jout): os.remove(jout)
	res = subprocess.run([B.BLENDER, '-b', '--factory-startup', '-P', S_DIR + '/cloth_sim.py', '--', jin, jout], capture_output=True, text=True)
	if res.returncode or not os.path.exists(jout): print(res.stdout[-3000:], res.stderr[-3000:]); raise SystemExit('sim failed')
	R = json.load(open(jout))
	print('sim %.1f s' % (time.time() - t))
	hits = np.array([np.nan if h is None else h * 100 for h in R['hits']])
	dist = np.where(np.isfinite(hits), np.maximum(hits, 0), 0)
	w = np.clip(1 - (region[patch] - rmin) / (pin_w - rmin), 0, 1)
	Q = P.copy()
	Q[patch] += ((1 - w) * dist)[:, None] * N[patch]
	return Q, dict(patch=patch, dist=dist, cloth=from_bl(np.array(R['CP'])), shell=CV, CF=CF)


def run(body, name, out_dir, lift=1.0, squish=0.8, **kw):
	P0 = B.cage(body)
	P1, region = prepare(P0, lift, squish)
	Q, info = simulate(P1, region, out_dir, **kw)
	return P0, P1, Q, info
