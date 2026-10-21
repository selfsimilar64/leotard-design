# Competition hair for the Daz figure scenes (pipeline/daz/convert.py): hair slicked back from the
# hairline into a high bun, as gymnasts wear it to compete.
#
# No installed Daz hair is a bun or a ponytail (Eirgrid: long braids; Pixie: a short cut; Charm and
# Basic: Genesis 2), so the hair is built here, on the one thing a Daz hair does give for free: the
# Pixie hair's scalp cap, which Daz Studio fits to the head of every age, shape and pose (bake.py
# loads the Pixie hair and drops its strands). Slicked hair is close to a shell over the scalp, which
# is exactly what a real-time renderer does well; the strand look comes from the shading (fine
# streaks and an anisotropic highlight along the combing direction), not from strands.
#
# Parts (each a render mesh with position, normal, uv, uv1, tangent, fade):
#   hair  the shell: the cap subdivided once, raised 0.6-4 mm (thin at the hairline), combed towards
#         the bun. uv = (along the strands, around the bun) for the streak texture; uv1 = the cap's
#         own UVs; fade = 0 at the hairline rising to 1 over FADE m (soft, broken hairline in the app).
#   bun   a wrapped coil on the crown, strands running round it in a slow spiral.
#   tie   a gathered scrunchie round the bun's base (style['tie'] colour, or none).
import math, os
import numpy as np
import scipy.sparse as sp
from scipy.sparse.csgraph import dijkstra

FADE = 0.016          # hairline softening width (m)
SHELL = (0.0002, 0.0034)  # shell thickness at the hairline, and fully inside (m)
STYLE = {'colour': [0.085, 0.052, 0.032], 'bun': 'high', 'tie': [0.05, 0.05, 0.06]}

unit = lambda v: v / np.linalg.norm(v, axis=-1, keepdims=True)


def head_frame(bones):
	"""Head centre, eye midpoint and axes. The head bone's origin is at the base of the skull, so
	'up' is the neck's direction (neck1 -> head), squared to the eye line; forward follows."""
	H, L, R, N1 = (np.asarray(bones[k], dtype=np.float64) for k in ('head', 'l_eye', 'r_eye', 'neck1'))
	right = unit(L - R); mid = (L + R) / 2
	up = unit(H - N1); up = unit(up - right * (up @ right)); fwd = np.cross(right, up)
	if fwd @ (mid - H) < 0: fwd = -fwd
	return H, mid, right, up, fwd, float(np.linalg.norm(L - R))


def tri_normals(P, T):
	N = np.zeros_like(P)
	fn = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]])
	for k in range(3): np.add.at(N, T[:, k], fn)
	return unit(N + 1e-30)


def quads_to_tris(Q):
	Q = np.asarray(Q)
	return np.concatenate([Q[:, [0, 1, 2]], Q[:, [0, 2, 3]]])


def strand_tangents(P, N, A):
	"""Unit direction from each point towards A, in the surface (the combing direction)."""
	g = A - P
	g = g - N * np.einsum('ij,ij->i', g, N)[:, None]
	return unit(g + 1e-12)


def unweld(P, N, Tn, T, cornerUV, cornerUV1, fade):
	"""GPU vertices per (vertex, uv, uv1) corner combination. T: (n, 3) vertex ids; cornerUV(1):
	(n, 3, 2). Returns attrs, idx."""
	key = np.concatenate([T.reshape(-1, 1).astype(np.float64), np.round(cornerUV.reshape(-1, 2) * 1e5), np.round(cornerUV1.reshape(-1, 2) * 1e5)], 1)
	uniq, inv = np.unique(key, axis=0, return_inverse=True)
	v = uniq[:, 0].astype(np.int64)
	tan = np.concatenate([Tn[v], np.ones((len(v), 1))], 1)
	attrs = [('position', P[v]), ('normal', N[v]), ('uv', uniq[:, 1:3] / 1e5), ('uv1', uniq[:, 3:5] / 1e5), ('tangent', tan), ('fade', fade[v])]
	return attrs, inv.reshape(-1, 3).astype(np.uint32)


def shell(Vc, Fc, FUVc, frame, A, s):
	import convert
	P, quads, QU, _ = convert.subdivide(Vc, [np.asarray(f) for f in Fc], [np.asarray(u) for u in FUVc])
	P, quads, QU, _ = convert.subdivide(P, list(quads), list(QU))  # twice: a smooth trimmed hairline
	T = quads_to_tris(quads)
	TU1 = np.concatenate([QU[:, [0, 1, 2]], QU[:, [0, 2, 3]]])
	N = tri_normals(P, T)
	# distance from the cap's edge (the hairline) along the surface
	E = np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]])
	E = np.sort(E, 1)
	ue, cnt = np.unique(E, axis=0, return_counts=True)
	bnd = np.unique(ue[cnt == 1].ravel())
	w = np.linalg.norm(P[ue[:, 0]] - P[ue[:, 1]], axis=1)
	G = sp.coo_matrix((w, (ue[:, 0], ue[:, 1])), shape=(len(P), len(P))).tocsr()
	d = dijkstra(G, directed=False, indices=bnd, min_only=True)
	# The Pixie cap's front edge is a fringe line, low and straight across the forehead, with long
	# sideburns: hair pulled back starts at the natural hairline. Signed height above a hairline
	# curve in the head's frame: ~6.6 cm above the eyes at the centre, curving down to the temples,
	# and no hair below eye level in front of the ears.
	H, mid, right, up, fwd, _ = frame
	cranium = mid - fwd * 0.075 * s + up * 0.02 * s  # azimuths about the middle of the skull, not the skull-base joint
	q = P - cranium
	az = np.degrees(np.arctan2(q @ right, q @ fwd))  # 0 = front, +-90 = above the ears
	yl = (P - mid) @ up                             # height above the eyes
	a = np.abs(az)
	# forehead (rounded), temple corner (~60 deg, still high), then straight down in front of the ear to the
	# sideburn's end below eye level; a slight wobble so the line is not ruled
	line = (np.interp(a, [0, 25, 45, 60, 72, 100], [0.050, 0.049, 0.046, 0.040, 0.004, -0.012]) + 0.0025 * np.sin(np.radians(az) * 9)) * s
	front = np.where(a < 100, yl - line, 1.0)
	d = np.minimum(d, front)
	fade = np.clip(d / FADE, 0, 1)
	h = SHELL[0] + (SHELL[1] - SHELL[0]) * np.clip(d / (FADE * 4), 0, 1) ** 1.3  # hugs the skin near the hairline (no lip)
	P = P + N * (h * s)[:, None]
	N = tri_normals(P, T)
	Tn = strand_tangents(P, N, A)
	# streak coordinates: along = distance to the bun, around = azimuth about the bun's axis (seam at
	# the back, where the strands rise from the nape; the texture repeats a whole number of times)
	H, mid, right, up, fwd, _ = frame
	ax = unit(A - H)
	e1 = unit(fwd - ax * (fwd @ ax)); e2 = np.cross(ax, e1)
	q = P - A
	az = np.arctan2(q @ e2, q @ e1)
	along = np.linalg.norm(q, axis=1) / (0.06 * s)
	K = 7
	cu = np.stack([along[T], az[T] / (2 * math.pi) * K], -1)
	# triangles straddling the seam: unwrap their azimuths
	span = cu[:, :, 1].max(1) - cu[:, :, 1].min(1)
	fix = span > K / 2
	cu[fix, :, 1] = np.where(cu[fix, :, 1] < 0, cu[fix, :, 1] + K, cu[fix, :, 1])
	keep = fade[T].max(1) > 0  # triangles wholly outside the trimmed hairline
	return unweld(P, N, Tn, T[keep], cu[keep], TU1[keep], fade)


def bun(frame, A, nA, s, tie):
	H, mid, right, up, fwd, _ = frame
	axis = unit(nA * 0.55 + unit(A - H) * 0.45)
	e1 = unit(np.cross(axis, right)); e1 = unit(e1 - axis * (e1 @ axis)); e2 = np.cross(axis, e1)
	R, Hb = 0.031 * s, 0.026 * s
	C = A - axis * 0.006 * s
	nphi, nth, thmax = 96, 36, 0.66 * math.pi
	phi = np.linspace(0, 2 * math.pi, nphi + 1)
	th = np.linspace(0.02, thmax, nth)
	F, TH = np.meshgrid(phi, th, indexing='ij')
	# twisted coil: spiral ridges round the bun, a slight wobble so it is not a perfect dome
	r = R * np.sin(TH) ** 0.7 * (1 + 0.012 * np.sin(3 * F - 7 * TH) + 0.015 * np.sin(2 * F + 1.3))
	z = 0.42 * Hb + Hb * np.cos(TH) * (1 + 0.01 * np.sin(3 * F - 7 * TH))
	P = C + z[..., None] * axis + r[..., None] * (np.cos(F)[..., None] * e1 + np.sin(F)[..., None] * e2)
	# top cap: close the pole
	P = P.reshape(-1, 3)
	idx = lambda i, j: i * nth + j
	tris = []
	for i in range(nphi):
		for j in range(nth - 1):
			a, b, c, d = idx(i, j), idx(i + 1, j), idx(i + 1, j + 1), idx(i, j + 1)
			tris += [(a, d, c), (a, c, b)]
	pole = len(P); P = np.vstack([P, C + (0.42 * Hb + Hb) * axis])
	for i in range(nphi): tris.append((pole, idx(i, 0), idx(i + 1, 0)))
	T = np.array(tris)
	N = tri_normals(P, T)
	# strands run round the bun in a slow spiral
	dphi = np.cross(axis, P - C); dphi = unit(dphi - N * np.einsum('ij,ij->i', dphi, N)[:, None] + 1e-12)
	Tn = dphi
	u = np.concatenate([(F / (2 * math.pi) * 5 + TH * 0.9).ravel(), [0]])
	v = np.concatenate([(TH / thmax * 2.2).ravel(), [0]])
	cu = np.stack([u[T], v[T]], -1)
	one = np.ones(len(P))
	out = [('bun',) + unweld(P, N, Tn, T, cu, np.zeros_like(cu), one) + ([('hair:bun', 0, T.size)],)]
	if tie is not None:
		# scrunchie: a gathered fabric tube round the base
		nu, nv = 160, 20
		U, Vv = np.meshgrid(np.linspace(0, 2 * math.pi, nu + 1), np.linspace(0, 2 * math.pi, nv + 1), indexing='ij')
		rr = 0.0068 * s * (1 + 0.13 * np.sin(17 * U) * (0.7 + 0.3 * np.cos(Vv)) + 0.05 * np.sin(5 * U + 0.7))
		Rm = R * 0.93
		zc = 0.42 * Hb + Hb * math.cos(thmax * 0.86) - 0.002 * s
		ring = np.cos(U)[..., None] * e1 + np.sin(U)[..., None] * e2
		Pt = C + zc * axis + (Rm + rr * np.cos(Vv))[..., None] * ring + (rr * np.sin(Vv))[..., None] * axis
		Pt = Pt.reshape(-1, 3)
		k = lambda i, j: i * (nv + 1) + j
		tt = []
		for i in range(nu):
			for j in range(nv):
				a, b, c, d = k(i, j), k(i + 1, j), k(i + 1, j + 1), k(i, j + 1)
				tt += [(a, b, c), (a, c, d)]
		Tt = np.array(tt)
		Nt = tri_normals(Pt, Tt)
		Tnt = unit(np.cross(axis, Pt - C) + 1e-12)
		cut = np.stack([np.stack([U.ravel() / (2 * math.pi) * 8, Vv.ravel() / (2 * math.pi)], -1)[Tt[:, q]] for q in range(3)], 1)
		out.append(('tie',) + unweld(Pt, Nt, Tnt, Tt, cut, np.zeros_like(cut), np.ones(len(Pt))) + ([('tie:scrunchie', 0, Tt.size)],))
	return out


def strand_textures(tex_dir):
	"""Streak albedo variation and its normal map (x along the strands, y across), shared."""
	from PIL import Image
	a, n = os.path.join(tex_dir, 'hair_streaks.jpg'), os.path.join(tex_dir, 'hair_streaks_n.jpg')
	if os.path.exists(a) and os.path.exists(n): return
	rng = np.random.default_rng(7)
	W, Hh = 1024, 1024
	y = np.arange(Hh)
	v = np.zeros(Hh)
	for octave, amp in ((256, 0.5), (96, 0.35), (32, 0.3), (9, 0.25), (3, 0.2)):
		k = rng.normal(size=Hh // octave + 3)
		v += amp * np.interp(y / octave, np.arange(len(k)), k)
	v = (v - v.min()) / (v.max() - v.min())
	# streaks drift slowly along their length and break up a little
	img = np.zeros((Hh, W))
	for x0 in range(0, W, 64):
		shift = rng.normal() * 3
		seg = np.roll(v, int(shift))
		img[:, x0:x0 + 64] = seg[:, None]
	from scipy.ndimage import gaussian_filter
	img = gaussian_filter(img, (0.6, 18), mode='wrap')
	img = 0.62 + 0.38 * img
	Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).convert('RGB').save(a, quality=92)
	gy = np.gradient(gaussian_filter(img, (1.0, 18), mode='wrap'), axis=0) * 6
	nm = np.stack([np.zeros_like(gy), -gy, np.ones_like(gy)], -1)
	nm /= np.linalg.norm(nm, axis=-1, keepdims=True)
	Image.fromarray(((nm * 0.5 + 0.5) * 255).astype(np.uint8)).save(n, quality=95)


def build(Vc, Fc, FUVc, bones, style, hairline_map, tex_dir):
	"""Yields (part, attrs, idx, groups, material defs) for the shell, the bun and the tie."""
	st = dict(STYLE, **(style if isinstance(style, dict) else {}))
	strand_textures(tex_dir)
	frame = head_frame(bones)
	H, mid, right, up, fwd, ipd = frame
	s = ipd / 0.062  # head scale (eye spacing: 62 mm adult)
	Vc = np.asarray(Vc, dtype=np.float64)
	# bun anchor: the cap point furthest along the crown direction (high bun: 35 degrees behind the
	# top), among vertices the cap's faces use (the file carries a few stray unused vertices)
	used = np.unique(np.concatenate([np.asarray(f) for f in Fc]))
	dirn = unit(math.cos(math.radians(35)) * up - math.sin(math.radians(35)) * fwd)
	i = int(used[np.argmax((Vc[used] - H) @ dirn)])
	T0 = []
	for f in Fc: T0 += [(f[0], f[k], f[k + 1]) for k in range(1, len(f) - 1)]
	Nc = tri_normals(Vc, np.array(T0))
	A, nA = Vc[i] + Nc[i] * SHELL[1] * s, Nc[i]
	attrs, idx = shell(Vc, Fc, FUVc, frame, A, s)
	col = list(map(float, st['colour']))
	mdefs = {
		'hair:shell': {'part': 'hair', 'maps': {'map': 'textures/hair_streaks.jpg', 'normalMap': 'textures/hair_streaks_n.jpg'}, 'values': {'colour': col, 'fadeEdge': True}},
		'hair:bun': {'part': 'hair', 'maps': {'map': 'textures/hair_streaks.jpg', 'normalMap': 'textures/hair_streaks_n.jpg'}, 'values': {'colour': col}},
	}
	if st.get('tie') is not None: mdefs['tie:scrunchie'] = {'part': 'tie', 'maps': {}, 'values': {'colour': list(map(float, st['tie']))}}
	yield ('hair', attrs, idx, [('hair:shell', 0, idx.size)], mdefs)
	for part, a2, i2, groups in bun(frame, A, nA, s, st.get('tie')):
		yield (part, a2, i2, groups, {})


# --- Daz strand hair as ribbons ------------------------------------------------------------------
# The Pixie cut (G9 Starter Essentials) is dForce strand hair: Daz Studio exports it as polylines
# (43,510 strands of ~8 points). Each becomes a thin ribbon lying along the head (its width across
# the strand and the direction out from the middle of the skull), 0.7 mm wide at the root tapering to
# 0.2 mm (Daz's line widths: 0.5 -> 0.2 mm), normals pointing out from the skull (soft hair lighting),
# tangent along the strand (anisotropic highlight), uv = (across 0-1, along 0-1).
def strand_ribbons(Q, strands, bones, mats):
	H, mid, right, up, fwd, ipd = head_frame(bones)
	s = ipd / 0.062
	C = mid - fwd * 0.075 * s + up * 0.02 * s
	strands = [st for st in strands if len(st) >= 2]
	n = np.array([len(st) for st in strands])
	idx = np.concatenate(strands)
	P = Q[idx]
	start = np.concatenate([[0], np.cumsum(n)[:-1]])
	k = np.arange(len(P)) - np.repeat(start, n)          # point index within its strand
	last = np.repeat(n - 1, n)
	nxt = np.where(k < last, np.arange(len(P)) + 1, np.arange(len(P)))
	prv = np.where(k > 0, np.arange(len(P)) - 1, np.arange(len(P)))
	t = unit(P[nxt] - P[prv] + 1e-12)
	out = unit(P - C)
	side = np.cross(t, out)
	bad = np.linalg.norm(side, axis=1) < 1e-6
	side[bad] = np.cross(t[bad], up)
	side = unit(side + 1e-12)
	f = k / np.maximum(last, 1)
	w = (0.0007 + (0.0002 - 0.0007) * f) * s
	A = P - side * (w / 2)[:, None]; B = P + side * (w / 2)[:, None]
	pos = np.empty((len(P) * 2, 3)); pos[0::2] = A; pos[1::2] = B
	nrm = np.repeat(out, 2, axis=0)
	tan = np.concatenate([np.repeat(t, 2, axis=0), np.ones((len(P) * 2, 1))], 1)
	uv = np.stack([np.tile([0.0, 1.0], len(P)), np.repeat(f, 2)], 1)
	seg = np.nonzero(k < last)[0]
	a, b = seg * 2, (seg + 1) * 2
	tris = np.concatenate([np.stack([a, a + 1, b + 1], 1), np.stack([a, b + 1, b], 1)]).astype(np.uint32)
	props = next(iter(mats.values()), {})
	col = props.get('Diffuse Color', {}).get('v', [0.31, 0.235, 0.2])
	gl = props.get('Glossy Color', {}).get('v', [0.67, 0.58, 0.5])
	attrs = [('position', pos), ('normal', nrm), ('uv', uv), ('tangent', tan)]
	return attrs, tris, {'strands:hair': {'part': 'strands', 'maps': {}, 'values': {'colour': col, 'glossy': gl}}}
