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


def view_basis(tilt, dvec=None):
	"""View frame: d into the body, e1 sideways (close to x), e2 up the view. Default: from behind,
	`tilt` degrees below; dvec: a given direction into the body (then tilted the same way)."""
	t = np.radians(tilt)
	if dvec is None:
		d = np.array([0, np.sin(t), np.cos(t)])
	else:
		b = np.asarray(dvec, float); b /= np.linalg.norm(b)
		up = np.array([0, 1.0, 0]) - b[1] * b; up /= np.linalg.norm(up)
		d = b * np.cos(t) + up * np.sin(t)
	e1 = np.array([1.0, 0, 0]) - d[0] * d; e1 /= np.linalg.norm(e1)
	e2 = np.cross(d, e1)
	if e2[1] < 0: e2 = -e2
	return d, e1, e2


def drape_grid(P, free, tilt=30.0, h=0.3, off=1.0, shrink=0.3, iters=1500, stiff=1.0, along=1.0, thick=0.15, relax=0.01, verbose=True, node_all=False, fill=0, cling=0.0, dvec=None, jump=None, cling_mode='skin', cut_mode='leg', cut_core=0.5):
	"""A fresh cloth: a regular grid over the seat as seen from behind and a little below, laid on the
	skin's envelope from that view (so no extra material sits in the cleft), held where the band's
	free weight is ~0, then pulled taut (tension-only springs, stronger across than along when
	along < 1) with 3D collision against the skin."""
	import time
	from scipy.spatial import cKDTree
	t0 = time.time()
	S, quads = D.C.subdiv(); PS = S @ P; fs = S @ free
	TS = g9.triangles(quads); NS = g9.vertex_normals(PS, TS)
	d, e1, e2 = view_basis(tilt, dvec)
	to_v = lambda Q: np.stack([Q @ e1, Q @ e2, -(Q @ d)], 1)
	from_v = lambda V: np.outer(V[:, 0], e1) + np.outer(V[:, 1], e2) - np.outer(V[:, 2], d)
	reg = fs > 1e-3
	Vr = to_v(PS[reg])
	x0, y0 = Vr[:, 0].min(), Vr[:, 1].min()
	nx = int((Vr[:, 0].max() - x0) / h) + 1; ny = int((Vr[:, 1].max() - y0) / h) + 1
	lo, hi = PS[reg].min(0) - 6, PS[reg].max(0) + 6
	sel = ((PS[TS] > lo) & (PS[TS] < hi)).all(2).all(1)
	# the starting view sees the seat itself: thigh skin away from the band cannot hide it
	lws = S @ leg_weight()
	vis = sel & ~((lws[TS] > 0.6) & (fs[TS] < 1e-3)).all(1)
	Vall = to_v(PS)
	s, o = B.raster(Vall, TS[vis], np.stack([fs, lws], 1), x0, y0, h, nx, ny)
	lgrid = o[..., 1]
	cov = np.isfinite(s)
	wgrid = np.where(cov, o[..., 0], 0)
	from scipy.ndimage import binary_dilation
	node = cov & (wgrid > 1e-3) if node_all else cov & binary_dilation(wgrid > 0.02, iterations=2)
	# keep the nodes and the quads between them
	idx = -np.ones(node.shape, int); idx[node] = np.arange(node.sum())
	q = []; cut = set()
	for j in range(ny - 1):
		for i in range(nx - 1):
			a, b, c, e = idx[j, i], idx[j, i + 1], idx[j + 1, i + 1], idx[j + 1, i]
			if min(a, b, c, e) >= 0:
				zz = (s[j, i], s[j, i + 1], s[j + 1, i + 1], s[j + 1, i])
				ll = (lgrid[j, i], lgrid[j, i + 1], lgrid[j + 1, i + 1], lgrid[j + 1, i])
				ww = (wgrid[j, i], wgrid[j, i + 1], wgrid[j + 1, i + 1], wgrid[j + 1, i])
				edge = (max(ll) > 0.5) if cut_mode == 'leg' else (min(ww) < cut_core)
				if jump is not None and max(zz) - min(zz) > jump and edge:
					cut.update((a, b, c, e)); continue  # a depth jump (one surface in front of another)
				q.append((a, e, c, b))
	CF = np.array(q)
	TCtri = g9.triangles(CF)
	jj, ii = np.nonzero(node)
	V = np.stack([x0 + ii * h, y0 + jj * h, s[node]], 1)
	w = np.clip(wgrid[node] / 0.25, 0, 1)
	X0 = from_v(V)
	X = from_v(V + np.outer(off * w, [0, 0, 1]))
	n = len(X)
	inv = np.where(w > 0.02, 1.0, 0.0)
	if cut: inv[list(cut)] = 0.0  # the cloth's cut edge is held on the skin
	E = np.concatenate([CF[:, [0, 1]], CF[:, [1, 2]], CF[:, [2, 3]], CF[:, [3, 0]], CF[:, [0, 2]], CF[:, [1, 3]]])
	E = np.unique(np.sort(E, 1), axis=0)
	ed = X0[E[:, 1]] - X0[E[:, 0]]
	L0 = np.sqrt(((V[E[:, 1], 0] - V[E[:, 0], 0]) ** 2) + ((V[E[:, 1], 1] - V[E[:, 0], 1]) ** 2)) * (1 - shrink)  # grid lengths (flat)
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
		if cling > 0 and cling_mode == 'pressure':
			# an even pressure on the fabric towards the body, along its own (smooth) normal:
			# against the tension it sags smoothly into hollows, never into a narrow groove
			TCg = CFt if 'CFt' in dir() else None
			Nc = g9.vertex_normals(X, TCtri)
			tow = BP[j] - X
			sgn = np.sign(np.einsum('ij,ij->i', Nc, tow) + 1e-12)
			gl = np.linalg.norm(tow, axis=1)
			pull = (gl > thick) & (inv > 0)
			X[pull] += cling * (sgn[pull, None] * Nc[pull])
			_, j = tree.query(X)
		elif cling > 0:
			# cling: the fabric is drawn onto the skin (cut to the body, gripping it); against the
			# tension this lets it dip smoothly into hollows, deeper where they are wider
			tow = BP[j] - X; gl = np.linalg.norm(tow, axis=1)
			pull = (gl > thick) & (inv > 0)
			X[pull] += (cling * np.minimum(1.0, (gl[pull] - thick) / 0.2) / gl[pull])[:, None] * tow[pull]
			_, j = tree.query(X)
		dd = np.einsum('ij,ij->i', X - BP[j], BN[j])
		pen = (dd < thick) & (inv > 0)
		X[pen] += (thick - dd[pen])[:, None] * BN[j[pen]]
	# fill narrow dents (cloth points that slipped into the slot's opening): in the view, the cloth
	# may only come towards the camera, to its neighbours' mean, never go back
	for _ in range(fill):
		VW = to_v(X)
		M = (A @ VW) / deg[:, None]
		up = (M[:, 2] > VW[:, 2]) & (inv > 0)
		VW[up, 2] = M[up, 2]
		X = from_v(VW)
	if verbose:
		gap, _ = tree.query(X)
		print('grid drape %.1f s: %d nodes, gap max %.2f median %.2f cm' % (time.time() - t0, n, gap.max(), np.median(gap)))
	return X, CF


def run_grid(P, **kw):
	L = landmarks(P)
	free, inside = region(P, L, **{k: v for k, v in kw.items() if k in ('w_lo', 'w_hi', 'w_soft', 'top_soft', 'front_soft', 'front', 'bot', 'bot_soft')})
	lc = kw.get('leg_cloth')
	if lc is not None:
		# the cloth itself stays off the thighs: held softly along the crease where thigh skin begins
		free = free * (1 - sstep((leg_weight() - lc) / kw.get('leg_soft', 0.4)))
	free = np.where(inside, 0.002 + free, 0)
	X, CF = drape_grid(P, free, **{k: v for k, v in kw.items() if k in ('tilt', 'h', 'off', 'shrink', 'iters', 'stiff', 'along', 'thick', 'relax', 'node_all', 'fill', 'cling', 'jump', 'cling_mode', 'cut_mode', 'cut_core')})
	dip = kw.get('dip', 0.0)
	if dip > 0:
		# a soft valley: the cloth sinks back towards the skin under it by `dip` of the gap,
		# the gap blurred over the cloth so the valley is wide and smooth
		from scipy.spatial import cKDTree
		S, quads = D.C.subdiv(); PS = S @ P
		TS = g9.triangles(quads)
		BP, _ = g9.surface_samples(PS, TS, g9.vertex_normals(PS, TS), 0.2)
		gap, j = cKDTree(BP).query(X)
		dirn = BP[j] - X; dirn /= np.maximum(np.linalg.norm(dirn, axis=1, keepdims=True), 1e-9)
		A = D.adjacency(len(X), CF); deg = np.maximum(np.asarray(A.sum(1)).ravel(), 1)
		g = gap.copy(); dv = dirn * gap[:, None]
		for _ in range(kw.get('dip_blur', 60)):
			g = (A @ g + g) / (deg + 1); dv = (A @ dv + dv) / (deg + 1)[:, None]
		dvn = dv / np.maximum(np.linalg.norm(dv, axis=1, keepdims=True), 1e-9)
		X = X + (dip * g)[:, None] * dvn
	lw = kw.get('leg_keep')
	ft = free if lw is None else free * (1 - sstep((leg_weight() - lw) / 0.4))
	Q, _ = D.transfer(P, ft, X, CF, relax=kw.get('relax_t', 30), step=kw.get('step_t', 0.5))
	if kw.get('embed'): Q = embed(P, Q, X, CF, ft, tilt=kw.get('tilt', 30.0), t_in=kw.get('t_in', 0.3))
	if kw.get('untangle'): Q, _ = untangle(P, Q, X, CF, ft, tilt=kw.get('untangle_tilt', 0.0), spread=kw.get('spread', True))
	return Q, dict(L=L, free=free, X=X, CF=CF)


def untangle(P, Q, X, CF, free, tilt=30.0, hidden=0.3, floor=0.35, iters=2000, h=0.15, spread_min=0.05, keep_height=True, spread=True):
	"""The cleft's two walls must not cross at the midline (their overlap is the hairline). Wall
	vertices (band skin that lay well behind the cloth) get a new sideways position solved as a
	harmonic function over the mesh: fixed at 0 along the cleft's floor (|x| small) and at their
	settled x where the wall meets the cheek, so each wall unrolls in order onto its own half. Then
	each goes onto the cloth at that place, seen from the tilted back view."""
	from scipy.spatial import cKDTree
	F = fig(); A = F['A']; deg = np.maximum(np.asarray(A.sum(1)).ravel(), 1)
	t = np.radians(tilt)
	d = np.array([0, np.sin(t), np.cos(t)]); e2 = np.array([0, np.cos(t), -np.sin(t)])
	to_v = lambda R: np.stack([R[:, 0], R @ e2, -(R @ d)], 1)
	from_v = lambda V: np.outer(V[:, 0], [1, 0, 0]) + np.outer(V[:, 1], e2) - np.outer(V[:, 2], d)
	# how far each band vertex lay behind the cloth (seen from the view)
	TC = g9.triangles(CF)
	VX = to_v(X)
	x0, y0 = VX[:, 0].min() - 1, VX[:, 1].min() - 1
	nx = int((VX[:, 0].max() + 1 - x0) / h) + 1; ny = int((VX[:, 1].max() + 1 - y0) / h) + 1
	cz, _ = B.raster(VX, TC, np.zeros((len(VX), 1)), x0, y0, h, nx, ny)
	ok = np.isfinite(cz)
	from scipy.ndimage import distance_transform_edt
	if (~ok).any():
		_, (iy, ix) = distance_transform_edt(~ok, return_indices=True); cz = cz[iy, ix]
	VP = to_v(P)
	czP = B.sample(cz, x0, y0, h, VP[:, 0], VP[:, 1])
	behind = czP - VP[:, 2]
	wall = (free > 0.5) & (behind > hidden)
	xs = Q[:, 0].copy()
	fix_floor = wall & (np.abs(P[:, 0]) < floor)
	xs[fix_floor] = 0.0
	# spread: every band vertex with real freedom is solved, so the walls share the band's width
	band = ((free > spread_min) & F['body']) if spread else np.zeros(len(P), bool)
	unk = (band | wall) & ~fix_floor
	wall = unk | fix_floor
	for _ in range(iters):
		M = (A @ xs) / deg
		xs[unk] = M[unk]
	# keep each side on its side
	sgn = np.sign(P[:, 0]); xs[unk] = sgn[unk] * np.maximum(sgn[unk] * xs[unk], 0)
	R = Q.copy()
	VQ = to_v(Q)
	VQ[wall, 0] = xs[wall]
	if keep_height: VQ[wall, 1] = VP[wall, 1]
	# onto the cloth where the cloth is in front; faded by the free weight like the transfer
	wt = np.clip(free / 0.7, 0, 1); wt = wt * wt * (3 - 2 * wt); wt[fix_floor] = 1
	tz = B.sample(cz, x0, y0, h, VQ[wall, 0], VQ[wall, 1]) - 0.1
	VQ[wall, 2] = np.where(wt[wall] > 0, tz, VQ[wall, 2])
	R[wall] = Q[wall] + wt[wall, None] * (from_v(VQ[wall]) - Q[wall])
	return R, wall


def embed(P, Q, X, CF, free, tilt=30.0, t_in=0.3, h=0.15, thick=0.1, dvec=None):
	"""Fold-free layout of the band's skin on the cloth (a Tutte embedding): in the view plane
	(behind, `tilt` below), every band vertex with free >= t_in sits at the mean of its mesh
	neighbours, the rest stay where the transfer put them (the fixed boundary). A layout made
	this way cannot fold over itself, so the cleft walls spread out instead of crossing at the
	midline. Then each goes onto the cloth along the view direction."""
	import scipy.sparse as sps
	from scipy.sparse.linalg import spsolve
	from scipy.ndimage import distance_transform_edt
	F = fig(); A = F['A'].tocsr()
	d, e1, e2 = view_basis(tilt, dvec)
	to_v = lambda R: np.stack([R @ e1, R @ e2, -(R @ d)], 1)
	from_v = lambda V: np.outer(V[:, 0], e1) + np.outer(V[:, 1], e2) - np.outer(V[:, 2], d)
	VX = to_v(X); TC = g9.triangles(CF)
	x0, y0 = VX[:, 0].min() - 1, VX[:, 1].min() - 1
	nx = int((VX[:, 0].max() + 1 - x0) / h) + 1; ny = int((VX[:, 1].max() + 1 - y0) / h) + 1
	cz, _ = B.raster(VX, TC, np.zeros((len(VX), 1)), x0, y0, h, nx, ny)
	ok = np.isfinite(cz)
	if (~ok).any():
		_, (iy, ix) = distance_transform_edt(~ok, return_indices=True); cz = cz[iy, ix]
	inner = (free >= t_in) & F['body']
	idx = np.where(inner)[0]; pos = -np.ones(len(P), int); pos[idx] = np.arange(len(idx))
	VQ = to_v(Q)
	Ai = A[idx]
	deg = np.asarray(Ai.sum(1)).ravel()
	# L u = 0 on the inner vertices: deg_i u_i - sum_inner u_j = sum_boundary u_j
	coo = Ai.tocoo()
	jin = pos[coo.col] >= 0
	M = sps.csr_matrix((-np.ones(jin.sum()), (coo.row[jin], pos[coo.col[jin]])), shape=(len(idx), len(idx))) + sps.diags(deg)
	bnd = sps.csr_matrix((np.ones((~jin).sum()), (coo.row[~jin], coo.col[~jin])), shape=(len(idx), len(P)))
	R = Q.copy(); VR = VQ.copy()
	for c in (0, 1):
		VR[idx, c] = spsolve(M.tocsc(), bnd @ VQ[:, c])
	VR[idx, 2] = B.sample(cz, x0, y0, h, VR[idx, 0], VR[idx, 1]) - thick
	R[idx] = from_v(VR[idx])
	return R


def kabsch(Pfrom, Pto, w=None):
	"""Rigid transform (R, t) with R @ p + t mapping Pfrom onto Pto (least squares, weights w)."""
	w = np.ones(len(Pfrom)) if w is None else w
	ca = (Pfrom * w[:, None]).sum(0) / w.sum(); cb = (Pto * w[:, None]).sum(0) / w.sum()
	H = ((Pfrom - ca) * w[:, None]).T @ (Pto - cb)
	U, s, Vt = np.linalg.svd(H)
	dd = np.sign(np.linalg.det(Vt.T @ U.T))
	R = Vt.T @ np.diag([1, 1, dd]) @ U.T
	return R, cb - R @ ca


LAST = {}


def run_posed(P_a, P_pose, **kw):
	"""The cleft cloth on a posed body: the band is the a-pose's (same vertices), the posed mesh is
	turned into the a-pose's frame by the best rigid fit of the pelvis region, draped, turned back."""
	L = landmarks(P_a)
	free, inside = region(P_a, L, **{k: v for k, v in kw.items() if k in ('w_lo', 'w_hi', 'w_soft', 'top_soft', 'front_soft', 'front', 'bot', 'bot_soft')})
	lc = kw.get('leg_cloth')
	if lc is not None: free = free * (1 - sstep((leg_weight() - lc) / kw.get('leg_soft', 0.4)))
	free = np.where(inside, 0.002 + free, 0)
	F = fig()
	W = F['weights']
	pel = sum(W[k] for k in ('pelvis', 'hip') if k in W)
	sel = (pel > 0.5) | (free > 0.01)
	R, t = kabsch(P_pose[sel], P_a[sel], pel[sel] + free[sel])
	Pal = P_pose @ R.T + t
	dvec = None
	if kw.get('follow'):
		# look at the seat along its own direction in this pose (minus its mean outward normal)
		N = g9.vertex_normals(Pal, F['tris'])
		m = free > 0.3
		dvec = -(N[m] * free[m, None]).sum(0)
	X, CF = drape_grid(Pal, free, dvec=dvec, **{k: v for k, v in kw.items() if k in ('tilt', 'h', 'off', 'shrink', 'iters', 'stiff', 'along', 'thick', 'relax', 'node_all', 'fill', 'cling', 'jump', 'cling_mode', 'cut_mode', 'cut_core')})
	lw = kw.get('leg_keep')
	ft = free if lw is None else free * (1 - sstep((leg_weight() - lw) / kw.get('leg_keep_soft', 0.4)))
	md = kw.get('max_depth')
	if md is not None:
		# deep skin (far under the cloth, where the cleft turns under) is pulled out less
		from scipy.spatial import cKDTree
		TC = g9.triangles(CF)
		CPs, _ = g9.surface_samples(X, TC, g9.vertex_normals(X, TC), 0.2)
		gap, _ = cKDTree(CPs).query(Pal)
		ft = ft * sstep((md - gap) / kw.get('depth_soft', 1.5))
	Q, _ = D.transfer(Pal, ft, X, CF)
	if kw.get('smooth_settle'):
		if kw.get('embed_first'): Q = embed(Pal, Q, X, CF, ft, tilt=kw.get('tilt', 30.0), t_in=kw.get('t_in', 0.15), dvec=dvec)
		if kw.get('slide'): Q = settle_slide(Pal, X, CF, ft, lam=kw.get('lam', 5.0), outer=kw.get('outer', 6), Q0=Q, mu=kw.get('mu', 0.0))
		else: Q = settle_smooth(Pal, X, CF, ft, lam=kw.get('lam', 5.0), outer=kw.get('outer', 4), Q0=Q)
		LAST.update(X=(X - t) @ R, CF=CF, ft=ft)
		return (Q - t) @ R
	edv = dvec
	if kw.get('embed_follow'):
		# lay the skin out as seen along the cloth's own mean direction in this pose
		TC = g9.triangles(CF); NC = g9.vertex_normals(X, TC)
		mc = NC.mean(0); edv = -mc if mc @ (X.mean(0) - Pal[free > 0.3].mean(0)) >= 0 else mc
		edv = edv / np.linalg.norm(edv)
	if kw.get('embed'): Q = embed(Pal, Q, X, CF, ft, tilt=kw.get('embed_tilt', kw.get('tilt', 30.0)), t_in=kw.get('t_in', 0.15), dvec=edv)
	LAST.update(X=(X - t) @ R, CF=CF, ft=ft)
	return (Q - t) @ R


def run_hybrid(P_a, P_pose, Q_a=None, **kw):
	"""The a-pose result carried into the pose (fold-free layout, as Daz skins a morph), then the
	band's skin pressed onto the cloth draped on the posed body (nearest point, faded in)."""
	import posecarry as PC
	if Q_a is None: Q_a = run_posed(P_a, P_a, **kw)
	Qc = PC.carry(P_a, Q_a, P_pose)
	_ = run_posed(P_a, P_pose, **kw)
	X, CF, ft = LAST['X'], LAST['CF'], LAST['ft']
	from scipy.spatial import cKDTree
	TC = g9.triangles(CF); NC = g9.vertex_normals(X, TC)
	CPs, CNs = g9.surface_samples(X, TC, NC, 0.1)
	tree = cKDTree(CPs)
	f = np.clip(ft / kw.get('press_fade', 0.7), 0, 1); wv = f * f * (3 - 2 * f)
	m = wv > 0
	_, j = tree.query(Qc[m])
	sgn = np.sign(np.einsum('ij,ij->i', CNs[j], CPs[j] - P_pose[m]) + 1e-9)  # orient the cloth normal outward
	tgt = CPs[j] - 0.1 * CNs[j] * sgn[:, None]
	out = Qc.copy()
	out[m] = Qc[m] + wv[m, None] * (tgt - Qc[m])
	# a light relaxation along the cloth (keeps the pressed skin evenly spread)
	A = fig()['A']; deg = np.maximum(np.asarray(A.sum(1)).ravel(), 1)
	for _ in range(kw.get('press_relax', 10)):
		M = (A @ out) / deg[:, None]
		Y = out[m] + 0.5 * (M[m] - out[m])
		_, j = tree.query(Y)
		t2 = CPs[j] - 0.1 * CNs[j] * sgn[:, None]
		out[m] = Qc[m] + wv[m, None] * (t2 - Qc[m])
	return out


def settle_smooth(P, X, CF, ft, lam=5.0, outer=4, thick=0.1, Q0=None):
	"""The band's skin settles onto the cloth as one smooth sheet: minimise |L Q|^2 (thin-plate
	smoothness, uniform mesh Laplacian) + lam * ft * |Q - T|^2, T the nearest cloth points (updated
	each outer pass), the rest of the body held. Smoothness is part of the solution, so the wall
	skin spreads out instead of knotting."""
	import scipy.sparse as sps
	from scipy.sparse.linalg import factorized
	from scipy.spatial import cKDTree
	F = fig(); A = F['A'].tocsr(); n = len(P)
	deg = np.maximum(np.asarray(A.sum(1)).ravel(), 1)
	Lp = sps.identity(n) - sps.diags(1 / deg) @ A
	f = np.clip(ft / 0.7, 0, 1); wv = f * f * (3 - 2 * f)
	U = np.where(ft > 1e-3)[0]
	# grow one ring so the sheet blends into the held body
	ring = np.unique(A[U].indices); U = np.union1d(U, ring)
	Fx = np.setdiff1d(np.arange(n), U)
	TC = g9.triangles(CF); NC = g9.vertex_normals(X, TC)
	CPs, CNs = g9.surface_samples(X, TC, NC, 0.1)
	tree = cKDTree(CPs)
	M = (Lp.T @ Lp).tocsr()
	Q = (P if Q0 is None else Q0).copy()
	MUU = M[U][:, U]; MUF = M[U][:, Fx]
	lamv = lam * wv[U]
	solve = factorized((MUU + sps.diags(lamv)).tocsc())
	for _ in range(outer):
		_, j = tree.query(Q[U])
		sgn = np.sign(np.einsum('ij,ij->i', CNs[j], CPs[j] - P[U]) + 1e-9)
		T = CPs[j] - thick * CNs[j] * sgn[:, None]
		for c in range(3):
			rhs = lamv * T[:, c] - MUF @ P[Fx, c]
			Q[U, c] = solve(rhs)
	return Q


def settle_slide(P, X, CF, ft, lam=5.0, outer=6, thick=0.1, Q0=None, mu=0.0):
	"""Like settle_smooth, but the cloth only holds the skin against its surface (point-to-plane:
	lam * ft * (n . (Q - T))^2), so the skin slides freely along the cloth and the thin-plate
	smoothness alone decides how it spreads. mu: a weak point-to-point pull that keeps it in place."""
	import scipy.sparse as sps
	from scipy.sparse.linalg import spsolve
	from scipy.spatial import cKDTree
	F = fig(); A = F['A'].tocsr(); n = len(P)
	deg = np.maximum(np.asarray(A.sum(1)).ravel(), 1)
	Lp = sps.identity(n) - sps.diags(1 / deg) @ A
	f = np.clip(ft / 0.7, 0, 1); wv = f * f * (3 - 2 * f)
	U = np.where(ft > 1e-3)[0]
	U = np.union1d(U, np.unique(A[U].indices))
	Fx = np.setdiff1d(np.arange(n), U)
	TC = g9.triangles(CF); NC = g9.vertex_normals(X, TC)
	CPs, CNs = g9.surface_samples(X, TC, NC, 0.1)
	tree = cKDTree(CPs)
	M = (Lp.T @ Lp).tocsr()
	MUU = M[U][:, U]; MUF = M[U][:, Fx]
	k = len(U)
	big = sps.kron(MUU, sps.identity(3)).tocsr()
	rhs0 = -np.stack([MUF @ P[Fx, c] for c in range(3)], 1)
	Q = (P if Q0 is None else Q0).copy()
	lamv = lam * wv[U]
	for _ in range(outer):
		_, j = tree.query(Q[U])
		nn = CNs[j] * np.sign(np.einsum('ij,ij->i', CNs[j], CPs[j] - P[U]) + 1e-9)[:, None]
		T = CPs[j] - thick * nn
		rows, cols, vals = [], [], []
		for a in range(3):
			for b in range(3):
				rows.append(np.arange(k) * 3 + a); cols.append(np.arange(k) * 3 + b)
				vals.append(lamv * nn[:, a] * nn[:, b] + (mu * wv[U] if a == b else 0))
		Bm = sps.csr_matrix((np.concatenate(vals), (np.concatenate(rows), np.concatenate(cols))), shape=(3 * k, 3 * k))
		r = rhs0 + (lamv * np.einsum('ij,ij->i', nn, T))[:, None] * nn + (mu * wv[U])[:, None] * T
		sol = spsolve((big + Bm).tocsc(), r.ravel())
		Q[U] = sol.reshape(k, 3)
	return Q
