# Gap-filling levers on the bust cloth (2026-10-28): the shipped recipe (shapes.BUST) against variants
# that should bridge the cleavage more, on today's starting shape (no extra flattening).
#   python fill.py <body> <out> "<name>: dict(...)" ...   keys: relax (cloth's resistance to curving, as
#   smoothing per step), bend (bending stiffness, bilaplacian), along (pull along vs across, < 1 = harder across), above / soft_hi (band top), fade, pad (fabric thickness, cm),
#   grid (dict of seat_proto.drape_grid settings: a fresh grid cloth seen from the front instead of the skin's mesh), theta / soft_t (band width),
#   hull (0..1: grid rows pulled perfectly taut, straight across hollows), hull_smooth,
#   two (True: run on today's result instead of the bare body)
import sys, os, time, json
import numpy as np
import bust_proto as B, cloth_proto as C, cloth_pbd as D
sys.path.insert(0, os.path.dirname(B.S_DIR)); import shapes

body, out = sys.argv[1], sys.argv[2]
runs = [('today', {})] + [(a.split(':', 1)[0].strip(), eval(a.split(':', 1)[1])) for a in sys.argv[3:]]
os.makedirs(out, exist_ok=True)
F = B.fig()
P0 = B.cage(body)
P1, _ = C.prepare(P0, lift=shapes.BUST['lift'], squish=0.0)
pec = F['pec'] > 0.3
ylo, yhi = P1[pec, 1].min(), P1[pec, 1].max()
crease = F['body'] & (np.abs(P1[:, 0]) > 4) & (np.abs(P1[:, 0]) < 14) & (P1[:, 1] > ylo - 2) & (P1[:, 1] < ylo + 4) & (P1[:, 2] > P1[pec, 2].mean() - 6)
mid = F['body'] & (np.abs(P1[:, 0]) < 1.0) & (P1[:, 1] > ylo) & (P1[:, 1] < yhi) & (P1[:, 2] > P1[pec, 2].mean() - 6)
objs, cols, stats = {}, [], {}
Qtoday = None
for name, kw in runs:
	t = time.time()
	Pin = Qtoday if kw.get('two') else P1  # two: the grid cloth over today's result (sides and underside from today)
	fr, inside = C.band(Pin, **{k: kw[k] for k in ('above', 'soft_hi', 'below', 'soft_lo', 'theta', 'soft_t') if k in kw})
	free = np.where(inside, 0.002 + fr, 0)
	dk = dict(shapes.BUST['drape']); dk.update({k: kw[k] for k in ('relax', 'along', 'shrink', 'iters', 'bend') if k in kw})
	tk = {k: kw[k] for k in ('fade',) if k in kw}
	if 'pad' in kw: dk['thick'] = tk['thick'] = kw['pad']  # fabric thickness: cloth rests pad cm off the skin, skin comes up to its inner face
	if 'grid' in kw:
		# a fresh regular grid cloth laid on the bust's envelope seen from the front (seat_proto.drape_grid,
		# as the seat cleft): no cleavage-wall material in it, tension along the grid's own rows
		import seat_proto as SP
		gk = dict(dvec=(0, 0, -1), tilt=10.0, shrink=dk['shrink'], iters=dk['iters'], stiff=dk['stiff'], off=dk['off'], verbose=False)
		gk.update(kw['grid'])
		X, CF = SP.drape_grid(Pin, free, **gk)
		if kw.get('hull'):
			# rows pulled perfectly taut (the limit of tension across only): each grid row becomes the upper
			# hull of its points seen from the view, i.e. straight across every hollow; blended in by the
			# free weight and the result's offset smoothed (forward only) so neighbouring rows agree
			g = SP.drape_grid.last; d, e1, e2 = g['basis']
			u, z = X @ e1, -(X @ d)
			dz = np.zeros(len(X))
			for j in np.unique(g['jj']):
				k = np.where(g['jj'] == j)[0]; k = k[np.argsort(u[k])]
				hull = []
				for i in k:
					while len(hull) >= 2:
						a, b = hull[-2], hull[-1]
						if (u[b] - u[a]) * (z[i] - z[a]) - (z[b] - z[a]) * (u[i] - u[a]) >= 0: hull.pop()
						else: break
					hull.append(i)
				dz[k] = np.interp(u[k], u[hull], z[hull]) - z[k]
			dz *= np.clip(g['w'], 0, 1) ** kw.get('hull_w', 1.0) * kw['hull']
			A = D.adjacency(len(X), CF); deg = np.maximum(np.asarray(A.sum(1)).ravel(), 1)
			for _ in range(kw.get('hull_smooth', 10)): dz = 0.5 * dz + 0.5 * np.maximum((A @ dz) / deg, 0)
			X = X - np.outer(dz, d)
	else:
		X, CF, _ = D.drape(P1, free, verbose=False, **dk)
	Q, _ = D.transfer(Pin, free, X, CF, **tk)
	if name == 'today': Qtoday = Q
	# fill: how far the skin on the midline between the breasts moved forward onto the cloth
	dz = (Q - P1)[mid, 2]
	dc = np.linalg.norm((Q - P1)[crease], axis=1)
	# dip: on rows through the bust, how far the midline sits behind a straight line between the two
	# breasts' front-most points (0 = bridged straight)
	dips = []
	for y in np.arange(ylo, yhi, 1.0):
		r = F['body'] & (np.abs(Q[:, 1] - y) < 0.5) & (Q[:, 2] > P1[pec, 2].mean() - 6)
		L, R, M = r & (Q[:, 0] > 2), r & (Q[:, 0] < -2), r & (np.abs(Q[:, 0]) < 0.7)
		if L.any() and R.any() and M.any():
			iL, iR = np.where(L)[0][Q[L, 2].argmax()], np.where(R)[0][Q[R, 2].argmax()]
			zl = Q[iL, 2] + (Q[iR, 2] - Q[iL, 2]) * (0 - Q[iL, 0]) / (Q[iR, 0] - Q[iL, 0])
			dips.append(zl - Q[M, 2].max())
	stats[name] = dict(dip_max=round(float(max(dips)), 2), dip_mean=round(float(np.mean(dips)), 2), fill_max=round(float(dz.max()), 2), fill_mean=round(float(dz.mean()), 2), crease_max=round(float(dc.max()), 2), crease_mean=round(float(dc.mean()), 2), secs=round(time.time() - t))
	print(name, stats[name], flush=True)
	np.save('%s/%s.npy' % (out, name), Q)
	p = os.path.abspath('%s/%s.obj' % (out, name)); B.write_obj(Q, p); objs[name] = (Q, p); cols.append(name)
json.dump(stats, open(out + '/stats.json', 'w'), indent=1)
# views: front, three-quarter, side, and from above-front (looking down into the cleavage)
c = P1[pec].mean(0); tgt = [0.0, -c[2] * .01, (c[1] - 1) * .01]
items = []
for name, (Q, p) in objs.items():
	for v, extra in (('front', {}), ('34', {}), ('side', {}), ('high', dict(az=0, elev=35))):
		items.append(dict(obj=p, out=os.path.abspath('%s/%s-%s.png' % (out, name, v)), target=tgt, view=v if v != 'high' else 'front', ortho=0.30, dist=1.5, **extra))
jf = os.path.abspath(out + '/jobs.json'); json.dump(dict(res=[520, 600], items=items), open(jf, 'w'))
import subprocess
r = subprocess.run([B.BLENDER, '-b', '--factory-startup', '-P', B.S_DIR + '/render_blender.py', '--', jf], capture_output=True, text=True)
if r.returncode: print(r.stdout[-2000:], r.stderr[-2000:]); raise SystemExit('blender failed')
