# Prototype: procedural sports-bra compression of the Genesis 9 bust, on a baked a-pose cage.
import os, sys, json, subprocess
import numpy as np
import scipy.sparse as sp
from scipy.ndimage import gaussian_filter, map_coordinates, binary_dilation

REPO = r'C:/Users/mattj/leotard-design'
sys.path.insert(0, REPO + '/pipeline')
import g9
S_DIR = os.path.dirname(os.path.abspath(__file__))
BLENDER = REPO + '/tools/blender-4.5.14-windows-x64/blender.exe'

_fig = None
def fig():
	global _fig
	if _fig is None:
		_fig = g9.load_figure()
		W = _fig['weights']
		arm = np.zeros(len(_fig['V']))
		for k, w in W.items():
			if any(t in k for t in ('upperarm', 'forearm', 'hand', 'thumb', 'index', 'mid', 'ring', 'pinky', 'carpal')): arm += w
		head = sum(w for k, w in W.items() if k in ('head', 'neck1', 'neck2') or 'eye' in k or 'jaw' in k or 'tongue' in k or 'lip' in k or 'brow' in k or 'cheek' in k or 'ear' in k or 'nose' in k)
		_fig['arm'] = arm; _fig['pec'] = W['l_pectoral'] + W['r_pectoral']; _fig['pecL'] = W['l_pectoral']; _fig['pecR'] = W['r_pectoral']
		_fig['tris'] = g9.triangles([f for f in _fig['faces']]) if False else tris_of(_fig['faces'])
		# neighbours
		r, c = [], []
		for f in _fig['faces']:
			n = len(f)
			for i in range(n): r += [f[i], f[(i + 1) % n]]; c += [f[(i + 1) % n], f[i]]
		A = sp.csr_matrix((np.ones(len(r)), (r, c)), shape=(len(_fig['V']),) * 2); A.data[:] = 1
		_fig['A'] = A
		_fig['body'] = np.zeros(len(_fig['V']), bool)
		for f, m in zip(_fig['faces'], _fig['fmat']):
			if m in ('Body', 'Arms', 'Legs', 'Head'): _fig['body'][f] = True
	return _fig


def tris_of(faces):
	T = []
	for f in faces:
		for i in range(1, len(f) - 1): T.append((f[0], f[i], f[i + 1]))
	return np.array(T)


def cage(body, pose='a-pose'):
	return g9.read_pts(f'{REPO}/pipeline/daz/out/bodies/{body}/{pose}.pts')['Genesis9']


def raster(P, T, vals, x0, y0, h, nx, ny):
	"""Front view (looking along -z): per cell the front-most z and interpolated vals."""
	s = np.full((ny, nx), -np.inf); out = np.zeros((ny, nx, vals.shape[1]))
	A, B, C = P[T[:, 0]], P[T[:, 1]], P[T[:, 2]]
	for t in range(len(T)):
		a, b, c = A[t], B[t], C[t]
		xs = np.array([a[0], b[0], c[0]]); ys = np.array([a[1], b[1], c[1]])
		i0 = max(int(np.floor((xs.min() - x0) / h)), 0); i1 = min(int(np.ceil((xs.max() - x0) / h)), nx - 1)
		j0 = max(int(np.floor((ys.min() - y0) / h)), 0); j1 = min(int(np.ceil((ys.max() - y0) / h)), ny - 1)
		if i1 < i0 or j1 < j0: continue
		gx, gy = np.meshgrid(x0 + h * np.arange(i0, i1 + 1), y0 + h * np.arange(j0, j1 + 1))
		d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
		if abs(d) < 1e-12: continue
		l1 = ((b[1] - c[1]) * (gx - c[0]) + (c[0] - b[0]) * (gy - c[1])) / d
		l2 = ((c[1] - a[1]) * (gx - c[0]) + (a[0] - c[0]) * (gy - c[1])) / d
		l3 = 1 - l1 - l2
		ins = (l1 >= -1e-6) & (l2 >= -1e-6) & (l3 >= -1e-6)
		if not ins.any(): continue
		z = l1 * a[2] + l2 * b[2] + l3 * c[2]
		sub = s[j0:j1 + 1, i0:i1 + 1]
		upd = ins & (z > sub)
		if not upd.any(): continue
		sub[upd] = z[upd]
		v = vals[T[t]]
		o = out[j0:j1 + 1, i0:i1 + 1]
		o[upd] = (l1[upd, None] * v[0] + l2[upd, None] * v[1] + l3[upd, None] * v[2])
	return s, out


def sample(G, x0, y0, h, X, Y, order=1):
	return map_coordinates(G, [(Y - y0) / h, (X - x0) / h], order=order, mode='nearest')


def _rb(shape):
	j, i = np.indices(shape); return ((i + j) % 2 == 0), ((i + j) % 2 == 1)


def membrane(s, free, iters=800, w=1.85, along=1.0, floor=True):
	"""Red-black SOR: tensioned membrane (tension along y = along x tension) where free, held = s
	elsewhere; floor: u >= s (cannot enter the body)."""
	u = s.copy(); tx, ty = 1.0, along
	red, black = _rb(s.shape)
	for _ in range(iters):
		for c in (red, black):
			avg = (tx * (np.roll(u, 1, 1) + np.roll(u, -1, 1)) + ty * (np.roll(u, 1, 0) + np.roll(u, -1, 0))) / (2 * tx + 2 * ty)
			un = u + w * (avg - u)
			if floor: un = np.maximum(un, s)
			m = free & c
			u[m] = un[m]
	return u


def harmonic(vals, free, iters=800, w=1.85):
	return membrane(vals, free, iters, w, floor=False)


def mesh_fill(D, known, A, region, iters=300):
	"""Unknown (region & ~known) rows of D become their neighbours' mean (Gauss-Seidel-ish Jacobi)."""
	deg = np.asarray(A.sum(1)).ravel(); deg[deg == 0] = 1
	unk = ~known
	for _ in range(iters):
		M = (A @ D) / deg[:, None]
		D[unk] = M[unk]
	return D


def compress(P, k=0.55, lift=1.2, h=0.25, relax=6, along=1.0, out_info=None, theta_max=115, lift_sigma=3.0, edge=0.3):
	"""Cylindrical height field around the torso's vertical axis: a = arc length (angle x R0), y,
	r = distance from the axis. The sheet spans cleavage and folds all around the ribcage."""
	F = fig(); T = F['tris']; pec = F['pec']
	P0 = P; P = P.copy()
	trunk = F['body'] & (F['arm'] < 0.5)
	pm = pec > 0.01
	lo, hi = P[pm].min(0), P[pm].max(0)
	band = trunk & (P[:, 1] > lo[1]) & (P[:, 1] < hi[1])
	zc = 0.5 * (P[band, 2].max() + P[band, 2].min())
	R0 = 0.5 * (P[band, 2].max() - P[band, 2].min())
	def cyl(P):
		dx, dz = P[:, 0], P[:, 2] - zc
		th = np.arctan2(dx, dz)
		return np.stack([th * R0, P[:, 1], np.hypot(dx, dz)], 1), th
	amax = np.radians(theta_max) * R0
	x0, y0 = -amax, lo[1] - 6; nx = int(2 * amax / h) + 1; ny = int((hi[1] + 4 - y0) / h) + 1
	Tb = T[(F['body'][T].all(1)) & trunk[T].any(1)]
	def foot(P):
		C, th = cyl(P)
		Tt = Tb[(np.abs(th[Tb]) < np.radians(theta_max + 10)).all(1)]
		Tt = Tt[np.ptp(C[Tt, 0], 1) < 8]
		s, o = raster(C, Tt, np.stack([F['pecL'], F['pecR']], 1), x0, y0, h, nx, ny)
		cov = np.isfinite(s)
		L = gaussian_filter(np.where(cov, o[..., 0], 0), 1.0 / h); R = gaussian_filter(np.where(cov, o[..., 1], 0), 1.0 / h)
		# between the breasts: each side's weight carried across, as the bra's centre panel
		# (left breast is +x = +a)
		Lm = np.maximum.accumulate(L[:, ::-1], 1)[:, ::-1]
		Rm = np.maximum.accumulate(R, 1)
		g = np.maximum(L + R, np.minimum(Lm, Rm))
		g = gaussian_filter(np.clip(g / 0.5, 0, 1), 1.5 / h)
		return C, s, cov, g
	def facing(P, C):
		N = g9.vertex_normals(P, T)
		dx, dz = P[:, 0], P[:, 2] - zc; rr = np.maximum(np.hypot(dx, dz), 1e-6)
		nr = (N[:, 0] * dx + N[:, 2] * dz) / rr
		return np.clip((nr - 0.15) / 0.45, 0, 1) ** 2
	tissue = trunk & (pec > 0.02)
	# 1. lift: the bust tissue moves up (a wide, soft field so the upper chest takes it smoothly)
	C, s, cov, g = foot(P)
	gl = gaussian_filter(g, lift_sigma / h)
	fz = facing(P, C)
	inb = lambda C: trunk & (C[:, 0] > x0) & (C[:, 0] < x0 + h * (nx - 1)) & (C[:, 1] > y0) & (C[:, 1] < y0 + h * (ny - 1))
	wl = sample(gl, x0, y0, h, C[:, 0], C[:, 1]) * inb(C) * np.maximum(fz, tissue * np.clip(pec / 0.1, 0, 1))
	P[:, 1] += lift * wl
	# 2. sheet across the cleavage and the folds, then pressed towards the chest wall
	C, s, cov, g = foot(P)
	free = (g > 0.05) & cov & ~binary_dilation(~cov, iterations=2)
	sf = np.where(cov, s, np.nanmin(np.where(cov, s, np.nan)))
	u = membrane(sf, free, along=along)
	base = harmonic(sf, free)
	uc = base + k * (u - base)
	uc = sf + np.clip(g / edge, 0, 1) * (uc - sf)
	# 3. move vertices radially: visible outward-facing ones onto uc, the breast's hidden ones follow
	fz = facing(P, C)
	inbox = inb(C)
	A_, Y_, Rr = C[:, 0], C[:, 1], C[:, 2]
	cv = sample(cov.astype(float), x0, y0, h, A_, Y_) > 0.999
	sv = sample(sf, x0, y0, h, A_, Y_); ucv = sample(uc, x0, y0, h, A_, Y_)
	vis = inbox & cv & (np.abs(Rr - sv) < 0.25) & (fz > 0)
	dR = np.zeros(len(P))
	dR[vis] = (ucv[vis] - Rr[vis]) * fz[vis]
	known = vis & (fz > 0.5) | ~(inbox & tissue)
	dR[~known] = 0
	dR = mesh_fill(dR[:, None], known, F['A'], None)[:, 0]
	def apply(P, C, r):
		dx, dz = P[:, 0], P[:, 2] - zc; rr = np.maximum(np.hypot(dx, dz), 1e-6)
		Q = P.copy(); Q[:, 0] = dx * r / rr; Q[:, 2] = zc + dz * r / rr
		return Q
	P2 = apply(P, C, C[:, 2] + dR)
	C2, _ = cyl(P2)
	ucv2 = sample(uc, x0, y0, h, C2[:, 0], C2[:, 1])
	fr = sample(free.astype(float), x0, y0, h, C2[:, 0], C2[:, 1]) > 0.999
	over = inbox & fr & (tissue | vis) & (C2[:, 2] > ucv2)
	P2[over] = apply(P2[over], C2[over], ucv2[over])
	# 4. relax crowding tangentially inside the footprint, re-projected onto uc
	deg = np.asarray(F['A'].sum(1)).ravel()
	for _ in range(relax):
		M = (F['A'] @ P2) / deg[:, None]
		C2, _ = cyl(P2)
		fz2 = facing(P2, C2)
		wv = np.clip(sample(g, x0, y0, h, C2[:, 0], C2[:, 1]) / edge, 0, 1) * inbox * fz2 * 0.5
		P2 += wv[:, None] * (M - P2)
		C2, _ = cyl(P2)
		zt = sample(uc, x0, y0, h, C2[:, 0], C2[:, 1])
		fr = sample(free.astype(float), x0, y0, h, C2[:, 0], C2[:, 1]) > 0.999
		front = inbox & fr & (fz2 > 0.3) & (np.abs(C2[:, 2] - zt) < 0.6)
		P2[front] = apply(P2[front], C2[front], zt[front])
	# keep the arms' skin where it was
	wa = np.clip(1 - (F['arm'] - 0.25) / 0.25, 0, 1)
	P2 = P0 + (P2 - P0) * wa[:, None]
	if out_info is not None: out_info.update(dict(s=sf, u=u, base=base, uc=uc, g=g, x0=x0, y0=y0, h=h))
	return P2


_st = None
def write_obj(P, path):
	global _st
	F = fig()
	if _st is None:
		keep = [i for i, m in enumerate(F['fmat']) if m in ('Body', 'Arms', 'Legs', 'Head', 'Fingernails', 'Toenails')]
		S, quads, parent = g9.cc_stencil(len(F['V']), F['faces'])
		_st = (S, quads[np.isin(parent, keep)])
	S, Q = _st
	V = S @ P
	with open(path, 'w') as f:
		f.write(''.join('v %.5f %.5f %.5f\n' % (x * .01, -z * .01, y * .01) for x, y, z in V))
		f.write(''.join('f %d %d %d %d\n' % tuple(q + 1) for q in Q))


def render(objs, outdir, views=('front', '34', 'side'), res=(520, 650), ortho=0.42):
	items = []
	for name, (P, path) in objs.items():
		pec = fig()['pec'] > 0.3
		c = P[pec].mean(0)
		tgt = [0.0, -c[2] * .01, (c[1] - 4) * .01]
		for v in views:
			items.append(dict(obj=path, out=f'{outdir}/{name}-{v}.png', target=tgt, view=v, ortho=ortho, dist=1.5))
	outdir = os.path.abspath(outdir); items = [dict(it, obj=os.path.abspath(it['obj']), out=os.path.abspath(it['out'])) for it in items]
	jf = outdir + '/jobs.json'; json.dump(dict(res=list(res), items=items), open(jf, 'w'))
	r = subprocess.run([BLENDER, '-b', '--factory-startup', '-P', S_DIR + '/render_blender.py', '--', jf], capture_output=True, text=True)
	if r.returncode: print(r.stdout[-3000:], r.stderr[-3000:]); raise SystemExit('blender failed')


def grid(rows, cols, outdir, title, out, labels=None):
	from PIL import Image, ImageDraw, ImageFont
	ims = [[Image.open(f'{outdir}/{c}-{r}.png') for c in cols] for r in rows]
	w, h = ims[0][0].size; L, Tp = 150, 110
	G = Image.new('RGB', (L + len(cols) * (w + 8), Tp + len(rows) * (h + 8)), (245, 245, 243))
	d = ImageDraw.Draw(G)
	try: fnt = ImageFont.truetype('arialbd.ttf', 22); ft = ImageFont.truetype('arialbd.ttf', 30)
	except Exception: fnt = ft = ImageFont.load_default()
	d.text((L, 15), title, fill=(20, 20, 20), font=ft)
	names = {'front': 'Front', '34': 'Three-quarter', 'side': 'Side'}
	for i, c in enumerate(cols):
		lab = (labels or {}).get(c, c)
		d.multiline_text((L + i * (w + 8) + w / 2, Tp - 10), lab, fill=(30, 30, 30), font=fnt, anchor='md', align='center')
	for j, r in enumerate(rows):
		d.text((L - 12, Tp + j * (h + 8) + h / 2), names.get(r, r), fill=(30, 30, 30), font=fnt, anchor='rm')
		for i in range(len(cols)): G.paste(ims[j][i], (L + i * (w + 8), Tp + j * (h + 8)))
	G.save(out)
