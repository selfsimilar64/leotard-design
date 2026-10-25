# Fits Character Creator hair-card hairs (the owner's free downloads, knowledge: free-character-assets)
# to the bare Genesis 9 head, so convert_bodies.py can carry them like a Daz hair (bodies.py HAIRS).
#
#   python pipeline/daz/fit_hair.py [keys]
#
# Each download ships the hair on the Character Creator head it was made for. Per hair:
#  1. unpack the .blend from the zip (7-Zip for .rar) and have Blender write the hair, the CC head and
#     the CC eyes as one OBJ with the hair's maps (blend_to_obj.py);
#  2. align the CC head to the bare Genesis 9 head (bodies/bare/zero.pts, Daz cm): a similarity
#     (rotation, uniform scale, translation) started from the eye centres and refined by ICP on the
#     cranium above the eyes;
#  3. the heads still differ in shape: every CC head vertex is moved to its nearest point on the Genesis 9
#     skin, and each hair vertex takes the Gaussian-weighted move of the CC head vertices near it (the
#     weights widen with distance, so a bun far from the scalp moves as one piece);
#  4. hair vertices left under the skin (or too close: 0.3 mm for the scalp cap, 1 mm for the cards)
#     are pushed out along the skin normal.
# Out: pipeline/daz/out/hairs/<key>/hair.obj (Daz cm, the bare figure's frame), materials.json (maps per
# material, convert_bodies.py body_materials), the maps. Git-ignored: derived from the downloads.
import json, os, shutil, subprocess, sys, zipfile
import numpy as np
from scipy.spatial import cKDTree

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.dirname(HERE))
import g9
import bodies as B

BLENDER = os.path.join(ROOT, 'tools', 'blender-4.5.14-windows-x64', 'blender.exe')
SEVENZIP = os.environ.get('SEVENZIP', r'C:/Program Files/7-Zip/7z.exe')
OUT = os.path.join(HERE, 'out', 'hairs')
MIN_GAP = {'scalp': 0.03, 'cards': 0.1}  # cm


def unpack(h, work):
	"""The hair's .blend, from the download zip (the .blend is itself zipped or rar'd inside)."""
	blend = os.path.join(work, 'src.blend')
	if os.path.exists(blend): return blend
	with zipfile.ZipFile(h['zip']) as z:
		inner = z.extract(h['blend_archive'], work)
	if inner.lower().endswith('.rar'): subprocess.run([SEVENZIP, 'x', '-y', '-o' + work, inner], check=True, stdout=subprocess.DEVNULL)
	else: zipfile.ZipFile(inner).extractall(work)
	found = [os.path.join(dp, f) for dp, _, fs in os.walk(work) for f in fs if f.endswith('.blend')]
	os.replace(found[0], blend)
	os.remove(inner)
	return blend


def read_parts(path, h):
	"""scene.obj -> hair (V, faces with uv ids and materials), CC head vertices, eye centres (l, r)."""
	V, VT, faces, _, _ = g9.read_obj(path)
	hair_f = [f for f in faces if f[2] in h['materials']]
	head = np.unique(np.concatenate([f[0] for f in faces if f[2] == h['head']]))
	eye = np.unique(np.concatenate([f[0] for f in faces if f[2] in h['eyes']]))
	E = V[eye]
	return V, VT, hair_f, V[head], (E[E[:, 0] > 0].mean(0), E[E[:, 0] < 0].mean(0))


def umeyama(X, Y):
	"""Similarity (s, R, t) minimising |s R X + t - Y|."""
	mx, my = X.mean(0), Y.mean(0)
	A, Bm = X - mx, Y - my
	U, D, Vt = np.linalg.svd(Bm.T @ A / len(X))
	S = np.eye(3); S[2, 2] = np.sign(np.linalg.det(U @ Vt))
	R = U @ S @ Vt
	s = (D * np.diag(S)).sum() / (A ** 2).sum(1).mean()
	return s, R, my - s * R @ mx


def g9_head():
	"""Bare Genesis 9 skin (Daz cm): dense samples with normals of the head and neck, eye centres."""
	pts = g9.read_pts(B.body_dir('bare') + 'zero.pts')
	fig = B.figure()
	P = pts['Genesis9']
	T = np.array([t for f in fig['faces'] for t in ([f[0], f[1], f[2]], [f[0], f[2], f[3]])[:len(f) - 2]])
	w = fig['weights']
	head = sum(w[b] for b in B.subtree(fig['nodes'], 'head') if b in w) + w.get('neck2', 0) + w.get('neck1', 0)
	T = T[(head[T] > 0.2).any(1)]
	X, N = g9.surface_samples(P, T, g9.vertex_normals(P, T), 0.15)
	E = pts['Genesis9Eyes']
	return X, N, (E[E[:, 0] > 0].mean(0), E[E[:, 0] < 0].mean(0))


def fit(h, verbose=True):
	work = os.path.join(OUT, h['key'])
	os.makedirs(work, exist_ok=True)
	blend = unpack(h, work)
	exp = os.path.join(work, 'cc')
	if not os.path.exists(os.path.join(exp, 'scene.obj')):
		subprocess.run([BLENDER, '-b', blend, '--python', os.path.join(HERE, 'blend_to_obj.py'), '--', exp, *h['objects']],
			check=True, stdout=subprocess.DEVNULL)
	V, VT, hair_f, H, (el, er) = read_parts(os.path.join(exp, 'scene.obj'), h)
	X, N, (gl, gr) = g9_head()
	tree = cKDTree(X)

	# 2. similarity: eye centres, then ICP on the cranium (CC head vertices above the eyes)
	s = np.linalg.norm(gl - gr) / np.linalg.norm(el - er)
	R, t = np.eye(3), (gl + gr) / 2 - s * (el + er) / 2
	cran = H[H[:, 1] > (el[1] + er[1]) / 2 + 1.0]
	for _ in range(40):
		Y = s * cran @ R.T + t
		_, j = tree.query(Y)
		s, R, t = umeyama(cran, X[j])
	A = lambda P: s * P @ R.T + t
	Ha = A(H)
	d, j = tree.query(A(cran))
	if verbose: print('  %s: scale %.3f, cranium fit rms %.2f mm, max %.1f mm' % (h['key'], s, np.sqrt((d ** 2).mean()) * 10, d.max() * 10))

	# 3. carry the remaining head-shape difference to the hair
	ids = np.unique(np.concatenate([f[0] for f in hair_f]))
	P = A(V[ids])
	_, jh = tree.query(Ha)
	move = X[jh] - Ha
	dist, nb = cKDTree(Ha).query(P, k=16)
	sig = np.maximum(1.5, 0.5 * dist[:, :1])
	wts = np.exp(-(dist / sig) ** 2)
	wts /= wts.sum(1, keepdims=True)
	P = P + np.einsum('nk,nkc->nc', wts, move[nb])

	# 4. clearance from the skin
	scalp = np.zeros(len(V), bool)
	for f in hair_f:
		if f[2] in h['scalp']: scalp[f[0]] = True
	gap = np.where(scalp[ids], MIN_GAP['scalp'], MIN_GAP['cards'])
	pushed = 0
	for _ in range(3):
		_, k = tree.query(P)
		sd = np.einsum('nc,nc->n', P - X[k], N[k])
		bad = (sd < gap) & (np.linalg.norm(P - X[k], axis=1) < 2.0)
		P[bad] += (gap[bad] - sd[bad])[:, None] * N[k[bad]]
		pushed = max(pushed, int(bad.sum()))
	if verbose: print('  %s: %d hair vertices, %d faces; up to %d pushed out of the skin' % (h['key'], len(ids), len(hair_f), pushed))

	# write: hair.obj (only the hair's vertices and uvs, renumbered), materials.json, maps
	vmap = np.full(len(V), -1); vmap[ids] = np.arange(len(ids))
	tids = np.unique(np.concatenate([f[1] for f in hair_f]))
	tmap = np.full(len(VT), -1); tmap[tids] = np.arange(len(tids))
	with open(os.path.join(work, 'hair.obj'), 'w') as f:
		f.write('# %s\n' % h['node'])
		f.writelines('v %.5f %.5f %.5f\n' % tuple(p) for p in P)
		f.writelines('vt %.6f %.6f\n' % tuple(u) for u in VT[tids])
		cur = None
		for vs, ts, m in hair_f:
			name = h['materials'][m]
			if name != cur: f.write('usemtl %s\n' % name.replace(' ', '_')); cur = name
			f.write('f ' + ' '.join('%d/%d' % (vmap[a] + 1, tmap[b] + 1) for a, b in zip(vs, ts)) + '\n')
	maps = json.load(open(os.path.join(exp, 'maps.json')))
	mats = {}
	for m, name in h['materials'].items():
		r = maps.get(m, {})
		mp = lambda k: os.path.join(exp, r[k]).replace('\\', '/') if k in r else None
		# in Daz terms, so convert_bodies.material reads them like a Daz hair's
		mats[name] = {'Diffuse Color': {'v': h.get('tint', [1, 1, 1]), 'map': None if h.get('plain') else mp('diffuse')},
			'Cutout Opacity': {'v': 1, 'map': mp('alpha')}, 'Bump Strength': {'v': 1, 'map': mp('bump')}}
	json.dump({'node': h['node'], 'materials': mats}, open(os.path.join(work, 'materials.json'), 'w'), indent=1)
	return os.path.join(work, 'hair.obj')


def main():
	keys = sys.argv[1:]
	for h in B.HAIRS:
		if h.get('zip') and (not keys or h['key'] in keys): print('hair', h['key'], '->', fit(h), flush=True)


if __name__ == '__main__':
	main()
