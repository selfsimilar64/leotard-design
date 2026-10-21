# Stage 2 of pipeline/daz/bake.py: a Daz Studio scene bake -> files the app reads.
#
# In: pipeline/daz/out/<key>/scene.obj (every Genesis 9 figure at base resolution, posed, cm),
#     materials.json, bones.json (bake_scenes.dsa).
# Out: app/public/figures-daz/
#   manifest.json          bodies for the app (same format as mannequins-daz/manifest.json), each
#                          with `figure`: the scene's figure.json
#   <key>/body.bin         the MakeHuman mannequin mesh carried onto the posed Daz body (Float32 xyz,
#                          41,595 vertices): the app fits the leotard to it as to any body
#   <key>/figure.json/.bin render meshes (skin subdivided twice, eyes and mouth once; lashes, brows,
#                          tear as they are) with UVs, normals and material groups, in metres
#   textures/*.jpg         the Daz maps, resized (shared by every scene)
#
# Why the mannequin mesh is carried over rather than the app using Genesis 9 directly: every design
# is anchored to the mannequin's triangles (see pipeline/build_daz_bodies.py). Every Genesis 9 scene
# has Genesis 9's topology, so transfer() moves the mannequin mesh from the wrapped young adult
# (daz-young.bin) onto any age, shape or pose exactly, by Daz's own vertex correspondence.
import json, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.dirname(HERE))
import build_daz_bodies as bdb
import hair

OUT = os.path.join(ROOT, 'app', 'public', 'figures-daz')
TEX = os.path.join(OUT, 'textures')
MH = os.path.join(ROOT, 'app', 'public', 'mannequins')
DAZ_BODIES = os.path.join(ROOT, 'app', 'public', 'mannequins-daz')
CACHE = os.path.join(HERE, 'out', 'cache')

# Figure name in Daz -> render part. sub: Catmull-Clark levels for rendering.
PARTS = {'Genesis9': ('skin', 2), 'Genesis9Eyes': ('eyes', 1), 'Genesis9Mouth': ('mouth', 1),
	'Genesis9Eyelashes': ('lashes', 0), 'G9EyebrowCards': ('brows', 0), 'Genesis9Tear': ('tear', 0)}


# --- OBJ -----------------------------------------------------------------------------------------

def read_obj(path):
	"""Vertices, UVs, faces (vertex ids, uv ids, material), each node's first vertex (Daz Studio
	writes '# <node name>' before each node's block, spaces as underscores) and strands (polylines:
	vertex ids, material)."""
	V, VT, faces, starts, lines = [], [], [], {}, []
	mat = None
	with open(path, encoding='utf-8', errors='replace') as f:
		for line in f:
			if line.startswith('# ') and not line.startswith('# Exported'): starts[line[2:].strip()] = len(V)
			elif line.startswith('v '): V.append(line.split()[1:4])
			elif line.startswith('vt '): VT.append(line.split()[1:3])
			elif line.startswith('usemtl '): mat = line[7:].strip()
			elif line.startswith('f '):
				vs, ts = [], []
				for c in line.split()[1:]:
					a = c.split('/'); vs.append(int(a[0]) - 1); ts.append(int(a[1]) - 1 if len(a) > 1 and a[1] else -1)
				faces.append((vs, ts, mat))
			elif line.startswith('l '):  # strand hair (dForce): one polyline per strand
				lines.append(([int(c.split('/')[0]) - 1 for c in line.split()[1:]], mat))
	return np.array(V, dtype=np.float64), np.array(VT, dtype=np.float64), faces, starts, lines


# --- subdivision with face-varying UVs ----------------------------------------------------------

def subdivide(V, faces, fuv):
	"""One Catmull-Clark level (positions, bdb.catmull_clark) with UVs subdivided linearly per face
	(face-varying, so UV seams stay seams). faces: list of index lists; fuv: list of (k, 2) arrays.
	Returns positions, quads (n, 4), quad UVs (n, 4, 2), parent face of each quad."""
	P, quads = bdb.catmull_clark(V, faces)
	fsz = np.array([len(f) for f in faces])
	start = np.concatenate([[0], np.cumsum(fsz)[:-1]])
	U = np.concatenate(fuv)
	pos = np.arange(len(U)) - np.repeat(start, fsz)
	nxt = np.repeat(start, fsz) + (pos + 1) % np.repeat(fsz, fsz)
	prv = np.repeat(start, fsz) + (pos - 1) % np.repeat(fsz, fsz)
	fid = np.repeat(np.arange(len(faces)), fsz)
	FU = np.zeros((len(faces), 2)); np.add.at(FU, fid, U); FU /= fsz[:, None]
	QU = np.stack([U, (U + U[nxt]) / 2, FU[fid], (U + U[prv]) / 2], 1)
	return P, quads, QU, fid


def render_mesh(V, faces, fuv, mats, levels):
	"""Subdivide `levels` times, then unweld by (vertex, uv) for the GPU. Returns positions, normals
	(area-weighted on the welded mesh, so UV seams do not show), uvs, triangle indices grouped by
	material, and the groups [(material, start, count)]."""
	F, FUV, M = [list(f) for f in faces], [np.asarray(u, dtype=np.float64) for u in fuv], np.array(mats)
	for _ in range(levels):
		V, q, qu, parent = subdivide(V, F, FUV)
		F, FUV, M = list(q), list(qu), M[parent]
	quads = [f for f in F if len(f) == 4]
	tris = [f for f in F if len(f) == 3]
	# triangulate (quads split along 0-2), keeping corner UVs
	T, TU, TM = [], [], []
	for f, u, m in zip(F, FUV, M):
		if len(f) == 3: T.append(f); TU.append(u); TM.append(m)
		else:
			for a, b, c in ((0, 1, 2), (0, 2, 3)): T.append([f[a], f[b], f[c]]); TU.append(u[[a, b, c]]); TM.append(m)
	T, TU, TM = np.array(T), np.array(TU), np.array(TM)
	N = bdb.vertex_normals(V, T)
	# unweld: one GPU vertex per (vertex, uv rounded to 1e-6)
	key = np.concatenate([T.reshape(-1, 1).astype(np.float64), np.round(TU.reshape(-1, 2) * 1e6)], 1)
	uniq, inv = np.unique(key, axis=0, return_inverse=True)
	vid = uniq[:, 0].astype(np.int64)
	pos, nrm, uv = V[vid], N[vid], uniq[:, 1:] / 1e6
	idx = inv.reshape(-1, 3)
	order = np.argsort(TM, kind='stable')
	idx, TM = idx[order], TM[order]
	groups, s = [], 0
	for m in dict.fromkeys(TM):
		c = int((TM == m).sum()); groups.append((m, s * 3, c * 3)); s += c
	return pos, nrm, uv, idx, groups


# --- textures ------------------------------------------------------------------------------------

def texture(path, size, done):
	"""Library map -> textures/<name>.jpg at most `size` px; returns the app-relative path."""
	from PIL import Image
	name = os.path.splitext(os.path.basename(path))[0].replace(' ', '_') + '_%d.jpg' % size
	dst = os.path.join(TEX, name)
	if name not in done and not os.path.exists(dst):
		im = Image.open(path)
		im = im.convert('RGB') if im.mode not in ('L', 'RGB') else im
		if max(im.size) > size: im = im.resize((size, size * im.size[1] // im.size[0]), Image.LANCZOS)
		im.save(dst, quality=92)
	done.add(name)
	return 'textures/' + name


# Which Daz properties feed which map of the app's materials, and at what size.
MAPS = {'map': 'Diffuse Color', 'normalMap': 'Normal Map', 'detailNormalMap': 'Detail Normal Map',
	'roughnessMap': 'Specular Lobe 1 Roughness', 'sssMap': 'Translucency Color', 'aoMap': 'Ambient Occlusion Weight',
	'alphaMap': 'Cutout Opacity', 'specWeightMap': 'Dual Lobe Specular Weight', 'glossyMap': 'Glossy Color', 'bumpMap': 'Bump Strength'}
VALUES = ['Diffuse Color', 'Translucency Weight', 'Dual Lobe Specular Weight', 'Dual Lobe Specular Reflectivity',
	'Specular Lobe 1 Roughness', 'Specular Lobe 2 Roughness Mult', 'Dual Lobe Specular Ratio', 'Glossy Layered Weight',
	'Glossy Roughness', 'Glossy Color', 'Refraction Weight', 'Cutout Opacity', 'Normal Map', 'Top Coat Weight',
	'Top Coat Roughness', 'SSS Color', 'Transmitted Color', 'Diffuse Roughness', 'Glossy Reflectivity']


def material(props, part, name, done):
	big = part == 'skin' and name == 'Head'
	out = {'part': part, 'maps': {}, 'values': {}}
	for k, prop in MAPS.items():
		e = props.get(prop)
		if e and e.get('map') and os.path.exists(e['map']):
			out['maps'][k] = texture(e['map'], 4096 if big and k in ('map', 'normalMap', 'detailNormalMap') else 2048, done)
	for prop in VALUES:
		if prop in props: out['values'][prop] = props[prop]['v']
	return out


# --- followers re-attached to the skin -----------------------------------------------------------
# Daz Studio moves the brows, lashes, tear film and hair cap with the bones but not with the head's
# shape morphs (Growing Up, characters): on the child heads the brows sat 4 mm under the skin (only
# the lash tips showed), on the young teen they were half buried (sparse, dotted brows), the cap
# 3-11 mm inside the scalp. Instead each follower vertex is bound to the bare figure's skin (the
# 'rest' bake: no shape, pose or expression) and carried to the scene's skin by Genesis 9's shared
# topology, the same transfer() that carries the mannequin mesh.
FOLLOW = ('G9EyebrowCards', 'Genesis9Eyelashes', 'Genesis9Tear')


def load_rest(out_root, Tg):
	V, _, _, starts, _ = read_obj(os.path.join(out_root, 'rest', 'scene.obj'))
	V /= 100.0
	order = sorted(starts.items(), key=lambda kv: kv[1]) + [('', len(V))]
	ranges = {nm: (a, b) for (nm, a), (_, b) in zip(order, order[1:])}
	S1, q1 = bdb.catmull_clark(V[ranges['Genesis9'][0]:ranges['Genesis9'][1]], Tg)
	S2, _ = bdb.catmull_clark(S1, q1)
	return V, ranges, S2


def follower_positions(rest, name, S2, T2):
	V, ranges, S2r = rest
	a, b = ranges[name.replace(' ', '_')]
	Q = V[a:b]
	# only the skin round the follower (sampling the whole body finely is slow)
	lo, hi = Q.min(0) - 0.03, Q.max(0) + 0.03
	T = T2[np.all((S2r[T2].min(1) > lo) & (S2r[T2].max(1) < hi), axis=1)]
	return bdb.transfer(Q, S2r, T, S2)


def hair_shift(rest, name, Vs, S2, T2, touch=0.006):
	"""Per-vertex correction for a Daz hair mesh (same problem as the followers: it follows the bones
	but not the head's shape). The hair's vertices within `touch` of the bare figure's skin (its scalp
	surface, roots) are carried to the scene's skin like the followers; every other vertex (braids,
	strands away from the head) moves with its nearest such root, rigidly, so the hair keeps its shape.
	Vs: the hair as exported in the scene. Returns corrected positions."""
	from scipy.spatial import cKDTree
	V, ranges, S2r = rest
	key = name.replace(' ', '_')
	if key not in ranges: return Vs
	a, b = ranges[key]
	Q = V[a:b]
	lo, hi = Q.min(0) - 0.03, Q.max(0) + 0.03
	T = T2[np.all((S2r[T2].min(1) > lo) & (S2r[T2].max(1) < hi), axis=1)]
	d, _ = cKDTree(S2r[np.unique(T)]).query(Q)
	roots = np.nonzero(d < touch)[0]
	moved = bdb.transfer(Q[roots], S2r, T, S2)
	shift = moved - Vs[roots]
	_, j = cKDTree(Vs[roots]).query(Vs)
	return Vs + shift[j]


# --- the mannequin mesh on the posed body --------------------------------------------------------

def young_surface(fig, morphs):
	"""Subdivided Genesis 9 surface of the wrapped young adult (cached: the morph graph is slow)."""
	f = os.path.join(CACHE, 'daz-young-S2.npy')
	if os.path.exists(f): return np.load(f)
	spec = next(b for b in bdb.BODIES if b['key'] == 'daz-young')
	_, _, S2, _, _ = bdb.daz_body(spec, fig, morphs, verbose=False)
	os.makedirs(CACHE, exist_ok=True); np.save(f, S2)
	return S2


def run(scenes, out_root):
	os.makedirs(TEX, exist_ok=True)
	fig = bdb.load_figure()
	_, Tg, _, _ = fig
	morphs = None
	if not os.path.exists(os.path.join(CACHE, 'daz-young-S2.npy')): morphs = bdb.load_morphs()
	Sv = young_surface(fig, morphs)
	Qv = np.fromfile(os.path.join(DAZ_BODIES, 'daz-young.bin'), dtype='<f4').reshape(-1, 3).astype(np.float64)
	man = json.load(open(os.path.join(MH, 'manifest.json')))
	mh_lm = next(b for b in man['bodies'] if b['key'] == 'young')['landmarks']
	mp = os.path.join(OUT, 'manifest.json')
	manifest = json.load(open(mp)) if os.path.exists(mp) else {'source': 'Daz 3D Genesis 9 scenes baked by Daz Studio (owner-licensed, local only): pipeline/daz/bake.py', 'vertices': man['vertices'], 'bodies': []}
	done = set()
	rest = None
	for s in scenes:
		key = s['key']
		if s.get('rest'): continue  # the bare figure is only the binding source (follower_positions)
		if rest is None: rest = load_rest(out_root, Tg)
		src = os.path.join(out_root, key)
		print('CONVERT', key, flush=True)
		V, VT, faces, starts, lines = read_obj(os.path.join(src, 'scene.obj'))
		V /= 100.0  # cm -> m (Daz axes are the app's: y up, +z front, +x the figure's left)
		mats = json.load(open(os.path.join(src, 'materials.json')))
		bones = {k: np.array(b['o']) / 100.0 for k, b in json.load(open(os.path.join(src, 'bones.json'))).items()}
		# vertex ranges per figure: one block each, marked in the OBJ (the counts in materials.json are
		# the figures' displayed meshes, subdivided for some, e.g. the hair cap)
		order = sorted(starts.items(), key=lambda kv: kv[1]) + [('', len(V))]
		ranges = {}
		for (nm, a), (_, b) in zip(order, order[1:]):
			node = next((k for k in mats if k.replace(' ', '_') == nm), None)
			assert node, 'OBJ node %s not in materials.json' % nm
			ranges[node] = (a, b)
		dkey = os.path.join(OUT, key); os.makedirs(dkey, exist_ok=True)

		# Genesis 9 order check: the body's faces must be the figure file's faces
		a, b = ranges['Genesis9']
		g9 = [f[0] for f in faces if a <= f[0][0] < b and f[2] != 'Mouth_Cavity']
		assert len(g9) == len(Tg) and all(list(np.array(x) - a) == list(y) for x, y in zip(g9[:200], Tg[:200])), 'Genesis 9 vertex order differs from Genesis9.dsf'

		# mannequin mesh on the posed body
		P = V[a:b]
		S1, q1 = bdb.catmull_clark(P, Tg)
		S2, q2 = bdb.catmull_clark(S1, q1)
		T2 = bdb.triangles(q2)
		Q = bdb.transfer(Qv, Sv, T2, S2)
		Q.astype('<f4').tofile(os.path.join(dkey, 'body.bin'))
		Cp = {k: v for k, v in bones.items()}
		lm = bdb.daz_landmarks(Cp, P, mh_lm)
		lm['head_top'] = np.array([lm['head_base'][0], P[:, 1].max(), lm['head_base'][2]])

		# render meshes
		meshes, materials, blobs = [], {}, []
		def add(part, attrs, idx, groups):
			"""attrs: [(field, array)] float32 vertex attributes; groups: [(material id, start, count)]."""
			rec = {'name': part, 'vertices': len(attrs[0][1]), 'indices': int(idx.size), 'groups': []}
			for field, arr, kind in [(f, a, '<f4') for f, a in attrs] + [('index', idx.ravel(), '<u4')]:
				bts = np.ascontiguousarray(arr, dtype=kind).tobytes()
				rec[field + 'Offset'] = sum(len(b) for b in blobs); blobs.append(bts)
			rec['groups'] = [{'material': m, 'start': st, 'count': cnt} for m, st, cnt in groups]
			meshes.append(rec)
			print('   %-6s %7d verts %8d tris' % (part, rec['vertices'], idx.size // 3), flush=True)
		shift = None  # per-vertex correction of a re-attached hair cap (its strands follow it)
		for name, (lo, hi) in ranges.items():
			part, levels = PARTS.get(name, ('dazhair', 0))  # anything else: a Daz hair
			fs = [f for f in faces if lo <= f[0][0] < hi]
			ls = [l for l in lines if lo <= l[0][0] < hi]
			if ls:
				# strand hair (the Pixie cut): ribbons; moved with the cap's correction, strand by strand
				Q = V[lo:hi].copy()
				if shift is not None:
					from scipy.spatial import cKDTree
					_, j = cKDTree(shift[0]).query(Q[[l[0][0] - lo for l in ls]])
					for (l, _), jj in zip(ls, j): Q[np.array(l) - lo] += shift[1][jj]
				a2, i2, mdefs = hair.strand_ribbons(Q, [np.array(l) - lo for l, _ in ls], bones, mats[name]['materials'])
				add('strands', a2, i2, [('strands:hair', 0, i2.size)]); materials.update(mdefs)
				continue
			if not fs: continue
			Vn = V[lo:hi]
			if part == 'dazhair' and 'Cap' not in name: Vn = hair_shift(rest, name, Vn, S2, T2)
			if name in FOLLOW or 'Cap' in name:
				Vn = follower_positions(rest, name, S2, T2)
				if 'Cap' in name: shift = (V[lo:hi], Vn - V[lo:hi])
			F = [np.array(f[0]) - lo for f in fs]
			FUV = [VT[f[1]] for f in fs]
			M = [f[2].replace('_', ' ') for f in fs]
			# UDIM tiles: each material's UVs back into 0..1
			for i, m in enumerate(M):
				FUV[i] = FUV[i] - np.floor(FUV[i].mean(0))
			if 'Cap' in name and s.get('hair'):
				# the Pixie hair's fitted scalp cap: base of the procedural competition hair (hair.py)
				props = next(iter(mats[name]['materials'].values()), {})
				hl = props.get('Cutout Opacity', {}).get('map')
				for part2, attrs, idx, groups, mdefs in hair.build(Vn, F, FUV, bones, s.get('hair'), hl, TEX):
					add(part2, attrs, idx, groups); materials.update(mdefs)
				continue
			pos, nrm, uv, idx, groups = render_mesh(Vn, F, FUV, M, levels)
			add(part, [('position', pos), ('normal', nrm), ('uv', uv)], idx, [(part + ':' + m, st, cnt) for m, st, cnt in groups])
			for m, st, cnt in groups:
				# OBJ material names get the node's name appended when a surface name repeats another
				# figure's ("Head" on the hair cap -> "Head_dForce_Pixie_Hair_Cap")
				mm = mats[name]['materials']
				props = mm.get(m) or mm.get(m.replace(' ', '_')) or next((v for k, v in mm.items() if m.startswith(k + ' ')), {})
				materials[part + ':' + m] = material(props, part, m, done)
		open(os.path.join(dkey, 'figure.bin'), 'wb').write(b''.join(blobs))
		json.dump({'meshes': meshes, 'materials': materials, 'bones': {k: [round(float(c), 5) for c in v] for k, v in bones.items()}},
			open(os.path.join(dkey, 'figure.json'), 'w'), indent=1)
		body = {'key': 'fig-' + key, 'label': 'Figure · ' + s['label'], 'years': s.get('years', 13),
			'stature': round(float(P[:, 1].max() - min(P[:, 1].min(), 0)), 4), 'file': key + '/body.bin',
			'figure': key + '/figure.json', 'landmarks': {k: [round(float(c), 5) for c in v] for k, v in lm.items()}}
		manifest['bodies'] = [x for x in manifest['bodies'] if x['key'] != body['key']] + [body]
	json.dump(manifest, open(mp, 'w'), indent=1)
	print('DONE', OUT)
