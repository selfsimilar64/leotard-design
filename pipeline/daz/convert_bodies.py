# Stage 3 of pipeline/daz/bodies.py: the Daz Studio bakes -> app/public/g9/, the files the app reads.
#
# The canonical mesh is Genesis 9's base cage subdivided once (Catmull-Clark, g9.cc_stencil): every
# body, pose and design lives on it. The app subdivides the cage itself (app/src/body/subdivide.js, the
# twin of g9.cc_stencil), so a body in a pose is just its cage (25,182 vertices).
#
# Out (git-ignored: derived from the owner's licensed Daz content):
#   manifest.json        bodies (each with its poses, arm poses, expressions, landmarks, neck cut),
#                        pose and expression lists, file offsets of topology.bin and figure.bin
#   topology.bin         cage polygons, canonical triangles (subdivided once), body-part weights
#   bodies/<body>/<pose>.bin          cage positions, metres (Float32 xyz)
#   bodies/<body>/arm-<l|r>-<arm>.bin cage with one arm posed, the other in the a-pose
#   figure.bin           the person's render meshes: skin (subdivided twice), eyes and mouth (once),
#                        lashes, brows, tear film (bound to the skin), hair (Eirgrid)
#   figure/<body>/<pose>.bin          eyes cage, mouth cage, hair positions (a-pose and Daz poses)
#   figure/<body>/expr-<key>.bin      expression changes of the skin, eyes and mouth cages (metres,
#                        a-pose frame; the app turns them with the head's rotation in a pose)
#   textures/*.jpg       Daz maps, resized
#   migrate.bin          the MakeHuman mannequin's vertices on the reference body, for designs saved
#                        before Genesis 9 (doc/migrate-g9.js); and the design frame: every canonical
#                        vertex's position on the MakeHuman reference body (body/mannequin.js)
import json, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.dirname(HERE))
import g9
import bodies as B

SRC = B.OUT
OUT = os.path.join(ROOT, 'app', 'public', 'g9')
TEX = os.path.join(OUT, 'textures')
MESH = 'g9-sd1'

# Daz figure (node name) -> render part and its subdivision levels
PARTS = {'Genesis9': ('skin', 2), 'Genesis9Eyes': ('eyes', 1), 'Genesis9Mouth': ('mouth', 1),
	'Genesis9Eyelashes': ('lashes', 0), 'G9EyebrowCards': ('brows', 0), 'Genesis9Tear': ('tear', 0)}
BOUND = ('lashes', 'brows', 'tear')  # re-attached to the skin in the app (they do not follow head shapes in Daz)


class Blob:
	"""Concatenated little-endian arrays, 4-byte aligned; add() returns { offset, count }."""
	def __init__(self): self.parts, self.size = [], 0
	def add(self, arr, dtype):
		b = np.ascontiguousarray(arr, dtype=dtype).tobytes()
		off = self.size
		self.parts.append(b); self.size += len(b)
		pad = (-len(b)) % 4
		if pad: self.parts.append(b'\0' * pad); self.size += pad
		return {'offset': off, 'count': int(np.asarray(arr).size)}
	def write(self, path): open(path, 'wb').write(b''.join(self.parts))


def polys(blob, faces):
	"""Polygons as sizes (Uint8) + flat vertex ids (Uint32)."""
	return {'sizes': blob.add([len(f) for f in faces], '<u1'), 'ids': blob.add(np.concatenate(faces), '<u4')}


def scene_topology():
	"""Every figure of the bare bake: faces, face-corner UVs (UDIM tiles folded to 0-1), materials,
	and its positions (metres). Checks the dump (.pts) has the OBJ's vertex order."""
	d = B.body_dir('bare')
	V, VT, faces, starts, _ = g9.read_obj(d + 'scene.obj')
	pts = g9.read_pts(d + 'zero.pts')
	order = sorted(starts.items(), key=lambda kv: kv[1]) + [('', len(V))]
	out = {}
	for (nm, a), (_, b) in zip(order, order[1:]):
		name = next((k for k in pts if k.replace(' ', '_') == nm), None)
		assert name is not None, 'OBJ node %s not in the dump' % nm
		assert np.abs(pts[name] - V[a:b]).max() < 2e-3, 'dump order differs from the OBJ for ' + name
		fs = [f for f in faces if a <= f[0][0] < b]
		F = [np.array(f[0]) - a for f in fs]
		FUV = [VT[f[1]] for f in fs]
		FUV = [u - np.floor(u.mean(0)) for u in FUV]
		out[name] = dict(faces=F, fuv=FUV, mats=[f[2].replace('_', ' ') for f in fs], P=pts[name] / 100.0)
	return out


def render_topology(faces, fuv, mats, levels, nV):
	"""Subdivide `levels` times (stencils and quads, UVs per face), triangulate, unweld by (vertex, uv).
	Returns the stencils, the subdivided vertex of each render vertex (map), uvs, triangles grouped
	by material, groups [(material, start, count)], and the subdivided triangles (welded)."""
	F, U, M, n, stencils = [list(f) for f in faces], [np.asarray(u, dtype=np.float64) for u in fuv], np.array(mats), nV, []
	for _ in range(levels):
		S, q, fid = g9.cc_stencil(n, F)
		U = list(g9.subdivide_uv(F, U)); F = list(q); M = M[fid]; n = S.shape[0]; stencils.append(S)
	T, TU, TM = [], [], []
	for f, u, m in zip(F, U, M):
		f = list(f)
		if len(f) == 3: T.append(f); TU.append(u); TM.append(m)
		else:
			for a, b, c in ((0, 1, 2), (0, 2, 3)): T.append([f[a], f[b], f[c]]); TU.append(np.asarray(u)[[a, b, c]]); TM.append(m)
	T, TU, TM = np.array(T), np.array(TU), np.array(TM)
	key = np.concatenate([T.reshape(-1, 1).astype(np.float64), np.round(TU.reshape(-1, 2) * 1e6)], 1)
	uniq, inv = np.unique(key, axis=0, return_inverse=True)
	vmap, uv, idx = uniq[:, 0].astype(np.int64), uniq[:, 1:] / 1e6, inv.reshape(-1, 3)
	o = np.argsort(TM, kind='stable')
	idx, TM2 = idx[o], TM[o]
	groups, s = [], 0
	for m in dict.fromkeys(TM2):
		c = int((TM2 == m).sum()); groups.append((m, s * 3, c * 3)); s += c
	return dict(stencils=stencils, n=n, map=vmap, uv=uv, idx=idx, groups=groups, quads=F)


# --- textures and materials (as in the figure scenes: knowledge daz-figures) ------------------------

MAPS = {'map': 'Diffuse Color', 'normalMap': 'Normal Map', 'detailNormalMap': 'Detail Normal Map',
	'roughnessMap': 'Specular Lobe 1 Roughness', 'sssMap': 'Translucency Color', 'aoMap': 'Ambient Occlusion Weight',
	'alphaMap': 'Cutout Opacity', 'specWeightMap': 'Dual Lobe Specular Weight', 'glossyMap': 'Glossy Color', 'bumpMap': 'Bump Strength'}
VALUES = ['Diffuse Color', 'Translucency Weight', 'Dual Lobe Specular Weight', 'Dual Lobe Specular Reflectivity',
	'Specular Lobe 1 Roughness', 'Specular Lobe 2 Roughness Mult', 'Dual Lobe Specular Ratio', 'Glossy Layered Weight',
	'Glossy Roughness', 'Glossy Color', 'Refraction Weight', 'Cutout Opacity', 'Normal Map', 'Top Coat Weight',
	'Top Coat Roughness', 'SSS Color', 'Transmitted Color', 'Diffuse Roughness', 'Glossy Reflectivity']
_done = set()


def texture(path, size):
	from PIL import Image
	name = os.path.splitext(os.path.basename(path))[0].replace(' ', '_') + '_%d.jpg' % size
	dst = os.path.join(TEX, name)
	if name not in _done and not os.path.exists(dst):
		im = Image.open(path)
		im = im.convert('RGB') if im.mode not in ('L', 'RGB') else im
		if max(im.size) > size: im = im.resize((size, size * im.size[1] // im.size[0]), Image.LANCZOS)
		im.save(dst, quality=92)
	_done.add(name)
	return 'textures/' + name


def material(props, part, name):
	big = part == 'skin' and name == 'Head'
	out = {'part': part, 'maps': {}, 'values': {}}
	for k, prop in MAPS.items():
		e = props.get(prop)
		if e and e.get('map') and os.path.exists(e['map']):
			out['maps'][k] = texture(e['map'], 4096 if big and k in ('map', 'normalMap', 'detailNormalMap') else 2048)
	for prop in VALUES:
		if prop in props: out['values'][prop] = props[prop]['v']
	return out


def body_materials(key, parts):
	"""Material of every render group, from the body's own materials.json (its skin set)."""
	mats = json.load(open(B.body_dir(key) + 'materials.json'))
	bare = json.load(open(B.body_dir('bare') + 'materials.json'))  # the hair's (the same preset on every body)
	out = {}
	for node, (part, groups) in parts.items():
		mm = (mats.get(node) or bare[node])['materials']
		for m in groups:
			props = mm.get(m) or mm.get(m.replace(' ', '_')) or next((v for k, v in mm.items() if m.startswith(k + ' ')), {})
			out[part + ':' + m] = material(props, part, m)
	return out


# --- landmarks, head, neck --------------------------------------------------------------------------

def landmarks(bones, cage, s, y0):
	"""App landmarks from the joints (metres): same meanings as the MakeHuman rig's."""
	o = lambda n: (np.array(bones[n]['o']) - [0, y0, 0]) * s
	L = {'neck_base': o('neck1'), 'head_base': o('head'), 'shoulder_l': o('l_upperarm'), 'elbow_l': o('l_forearm'),
		'wrist_l': o('l_hand'), 'hip_l': o('l_thigh'), 'knee_l': o('l_shin'), 'ankle_l': o('l_foot'), 'pelvis': o('hip')}
	L['head_top'] = np.array([L['head_base'][0], (cage[:, 1].max() - y0) * s, L['head_base'][2]])
	spine = [o(k) for k in ('hip', 'spine1', 'spine2', 'spine3', 'spine4', 'neck1')]
	def along(f):
		y = L['pelvis'][1] + f * (L['neck_base'][1] - L['pelvis'][1])
		for a, b in zip(spine, spine[1:]):
			if a[1] <= y <= b[1]: return a + (b - a) * (y - a[1]) / (b[1] - a[1])
		return spine[-1]
	L['chest'], L['waist'] = along(B.CHEST_F), along(B.WAIST_F)
	return {k: [round(float(c), 5) for c in v] for k, v in L.items()}


def qmul(a, b):
	ax, ay, az, aw = a; bx, by, bz, bw = b
	return [aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx,
		aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz]


def head_turn(bones, rest):
	"""Rotation of the head from the a-pose to this pose (quaternion x, y, z, w)."""
	q, r = bones['head']['q'], rest['head']['q']
	return [round(c, 6) for c in qmul(q, [-r[0], -r[1], -r[2], r[3]])]


def qrot(q, v):
	"""Vector v turned by the unit quaternion q (x, y, z, w)."""
	r = qmul(qmul(q, [v[0], v[1], v[2], 0.0]), [-q[0], -q[1], -q[2], q[3]])
	return np.array(r[:3])


def seat_eyes(P, bones, bare_P, bare_bones):
	"""Genesis 9's eyes follow a head shape only through an eye morph made for it (Daz's characters
	ship one; Stacy, bodies.py STACY, does not): her face moves the eye bones (about 1 cm down on the
	young adult) while the eyeballs stay where the unshaped face has them, the irises hidden under
	the upper lids. Each eye (the bare figure's vertices with x > 0 are the left) is moved rigidly
	back onto its bone, at the offset it has from that bone on the bare figure, turned with the bone.
	Daz centimetres in and out; a figure whose eyes already follow its face moves by ~0."""
	out = P.copy()
	for side, sel in (('l', bare_P[:, 0] > 0), ('r', bare_P[:, 0] <= 0)):
		b0, b = bare_bones[side + '_eye'], bones[side + '_eye']
		d0 = qrot([-b0['q'][0], -b0['q'][1], -b0['q'][2], b0['q'][3]], bare_P[sel].mean(0) - np.array(b0['o']))
		out[sel] += np.array(b['o']) + qrot(b['q'], d0) - P[sel].mean(0)
	return out


def chin_height(S, lo, hi):
	"""Underside of the chin on the front mid-line: where the front profile jumps forward fastest."""
	m = (np.abs(S[:, 0]) < 0.003) & (S[:, 1] > lo) & (S[:, 1] < hi)
	ys = np.arange(lo, hi, 0.002); z = np.full(len(ys), np.nan)
	for k, zz in zip(((S[m, 1] - lo) / 0.002).astype(int), S[m, 2]):
		if k < len(ys) and (np.isnan(z[k]) or zz > z[k]): z[k] = zz
	ok = ~np.isnan(z); z = np.interp(ys, ys[ok], z[ok])
	z = np.convolve(np.pad(z, 3, mode='edge'), np.ones(7) / 7, mode='valid')
	return ys[int(np.argmax(np.gradient(z)))]


def skull_base(S, lo, hi, z_behind):
	"""Where the back of the neck meets the head: top of the nape's flat stretch. Returns (y, z)."""
	m = (np.abs(S[:, 0]) < 0.003) & (S[:, 1] > lo) & (S[:, 1] < hi) & (S[:, 2] < z_behind)
	ys = np.arange(lo, hi, 0.002); z = np.full(len(ys), np.nan)
	for k, zz in zip(((S[m, 1] - lo) / 0.002).astype(int), S[m, 2]):
		if k < len(ys) and (np.isnan(z[k]) or zz < z[k]): z[k] = zz
	ok = ~np.isnan(z); z = np.interp(ys, ys[ok], z[ok])
	z = np.convolve(np.pad(z, 3, mode='edge'), np.ones(7) / 7, mode='valid')
	top = np.where(z >= z.max() - 0.0015)[0].max()
	return ys[top] - 0.005, z[top]


def neck_plane(S2, T2, lm, stature):
	"""The headless cut: a plane through the underside of the chin (front) and the base of the skull
	(back), level from side to side: y = a + b z, on the a-pose (knowledge: daz-bodies)."""
	Ss, _ = g9.surface_samples(S2, T2, g9.vertex_normals(S2, T2), 0.0015)
	sc = stature / 1.61
	y_f = chin_height(Ss, lm['neck_base'][1], lm['head_base'][1] + 0.08 * sc) - 0.004 * sc
	m = (np.abs(Ss[:, 0]) < 0.003) & (np.abs(Ss[:, 1] - y_f) < 0.002)
	z_f = Ss[m, 2].max()
	y_b, z_b = skull_base(Ss, lm['head_base'][1] - 0.05 * sc, lm['head_base'][1] + 0.04 * sc, lm['head_base'][2])
	b = (y_b - y_f) / (z_b - z_f)
	return [round(float(y_f - b * z_f), 5), round(float(b), 5)]


# --- hair --------------------------------------------------------------------------------------------

def hair_shift(root_bind, roots, Vs, S2, T2):
	"""Daz hairs follow the bones but not the head's shape morphs: the hair's roots (bound to the bare
	figure's skin) are carried onto this skin; every other vertex moves rigidly with its nearest root."""
	from scipy.spatial import cKDTree
	moved = g9.bound_positions(root_bind, S2, T2)
	shift = moved - Vs[roots]
	_, j = cKDTree(Vs[roots]).query(Vs)
	return Vs + shift[j]


def near(T, S, Q, pad=0.03):
	"""Triangles of T (ids) inside Q's bounding box grown by pad: binding a follower only needs the
	skin round it (sampling the whole body at 1.5 mm is slow)."""
	lo, hi = Q.min(0) - pad, Q.max(0) + pad
	return np.nonzero(np.all((S[T].min(1) > lo) & (S[T].max(1) < hi), axis=1))[0]


def bind_near(Q, S, T):
	ids = near(T, S, Q)
	t, b, d = g9.bind(Q, S, T[ids])
	return ids[t], b, d


# --- MakeHuman designs ------------------------------------------------------------------------------

def migration_map(cage_ref, S1, q1):
	"""The MakeHuman mannequin's vertices on the new reference body: through the wrapped Daz young adult
	(the MakeHuman mesh shrink-wrapped onto the same Kat body, app/public/mannequins-daz/daz-young.bin),
	whose surface is Genesis 9's, so each vertex is carried by Daz's own correspondence (g9.transfer)."""
	sys.path.insert(0, os.path.join(ROOT, 'pipeline'))
	import build_daz_bodies as bdb
	fig = bdb.load_figure()
	spec = next(b for b in bdb.BODIES if b['key'] == 'daz-young')
	P, _, _, _, _ = bdb.daz_body(spec, fig, bdb.load_morphs(), verbose=False)
	S2, q2, _ = g9.cc_stencil(S1.shape[0], list(q1))
	T2 = g9.triangles(q2)
	src = S2 @ (S1 @ P)
	dst = S2 @ (S1 @ cage_ref)
	Q = np.fromfile(os.path.join(ROOT, 'app', 'public', 'mannequins-daz', 'daz-young.bin'), dtype='<f4').reshape(-1, 3).astype(np.float64)
	X = g9.transfer(Q, src, T2, dst)
	shared = open(os.path.join(ROOT, 'app', 'public', 'mannequins', 'shared.bin'), 'rb').read()
	mh = json.load(open(os.path.join(ROOT, 'app', 'public', 'mannequins', 'manifest.json')))
	n = mh['vertices']; I = mh['indices']
	idx = np.frombuffer(shared, dtype='<u4', count=I).reshape(-1, 3).astype(np.int64)
	# the design frame: each canonical vertex's place on the MakeHuman reference body (young), through
	# the same correspondence. Blocks, the POC's region fields and { front: [x, y] } points were
	# written in those coordinates.
	young = np.fromfile(os.path.join(ROOT, 'app', 'public', 'mannequins', 'young.bin'), dtype='<f4').reshape(-1, 3).astype(np.float64)
	R1 = S1 @ cage_ref
	t, b, _ = g9.bind(R1, X, idx, spacing=0.001)
	design = np.einsum('nk,nkc->nc', b, young[idx[t]])
	return X, idx.ravel(), n, design


def run(keys=None):
	os.makedirs(TEX, exist_ok=True)
	fig = B.figure()
	scene = scene_topology()
	cage = scene['Genesis9']
	assert len(cage['faces']) == len(fig['faces']) and all((a == np.array(b)).all() for a, b in zip(cage['faces'][:500], fig['faces'][:500])), 'Genesis 9 faces differ from Genesis9.dsf'
	nC = len(fig['V'])
	S1, q1, fid1 = g9.cc_stencil(nC, cage['faces'])
	T1 = g9.triangles(q1)
	N1 = S1.shape[0]
	print('canonical mesh: %d vertices, %d triangles' % (N1, len(T1)), flush=True)

	topo = Blob()
	pw = B.part_weights(fig)
	W = np.stack([S1 @ pw[p] for p in B.PARTS], 1)
	manifest = {'source': 'Daz 3D Genesis 9 (owner-licensed, local only): pipeline/daz/bodies.py', 'mesh': MESH,
		'cage': nC, 'vertices': N1, 'indices': int(T1.size), 'parts': B.PARTS, 'ref': B.REF,
		'topology': {'cage': polys(topo, cage['faces']), 'index': topo.add(T1.ravel(), '<u4'),
			'parts': topo.add(np.clip(np.round(W * 255), 0, 255), '<u1')}}
	# the reference body's A-pose subdivided by Python: app/test/subdivide.test.js checks the app's own
	# subdivision (body/subdivide.js, the twin of g9.cc_stencil) against it
	ref_a = g9.read_pts(B.body_dir(B.REF) + 'a-pose.pts')['Genesis9']
	ry0 = ref_a[:, 1].min(); rs = next(b for b in B.BODIES if b['key'] == B.REF)['stature'] / (ref_a[:, 1].max() - ry0)
	manifest['topology']['check'] = topo.add(S1 @ ((ref_a - [0, ry0, 0]) * rs), '<f4')
	topo.write(os.path.join(OUT, 'topology.bin'))

	# the person's render meshes (topology shared by every body)
	figb, fmeshes = Blob(), []
	skin = render_topology(cage['faces'], cage['fuv'], cage['mats'], 2, nC)
	bare = {k: v['P'] for k, v in scene.items()}
	bare_S2 = skin['stencils'][1] @ (S1 @ bare['Genesis9'])
	# the skin's triangles in the app's order (body/subdivide.js quadTriangles: every quad's first
	# triangle, then every second one): bindings name triangles by index
	T2 = g9.triangles(np.array(skin['quads']))
	parts = {}
	for name, sc in scene.items():
		part, levels = PARTS.get(name, ('dazhair', 0))
		r = render_topology(sc['faces'], sc['fuv'], sc['mats'], levels, len(sc['P'])) if part != 'skin' else skin
		rec = {'name': part, 'node': name, 'vertices': len(r['map']), 'map': figb.add(r['map'], '<u4'), 'uv': figb.add(r['uv'], '<f4'),
			'index': figb.add(r['idx'].ravel(), '<u4'), 'groups': [{'material': part + ':' + m, 'start': s, 'count': c} for m, s, c in r['groups']]}
		if part in ('eyes', 'mouth'): rec['cage'] = polys(figb, sc['faces']); rec['cageVertices'] = len(sc['P'])
		if part in BOUND:
			t, b, d = bind_near(sc['P'], bare_S2, T2)
			rec['bind'] = {'tri': figb.add(t, '<u4'), 'bary': figb.add(b, '<f4'), 'offset': figb.add(d, '<f4')}
		if part == 'dazhair':
			from scipy.spatial import cKDTree
			dist, _ = cKDTree(bare_S2[np.unique(T2[near(T2, bare_S2, sc['P'])])]).query(sc['P'])
			roots = np.nonzero(dist < 0.006)[0]
			sc['roots'] = roots; sc['root_bind'] = bind_near(sc['P'][roots], bare_S2, T2)
			rec['vertices'] = len(r['map'])
		parts[name] = (part, [g[0] for g in r['groups']])
		fmeshes.append(rec)
		print('   %-8s %7d render vertices %8d triangles' % (part, len(r['map']), len(r['idx'])), flush=True)
	figb.write(os.path.join(OUT, 'figure.bin'))
	moving = [n for n, (p, _) in parts.items() if p in ('eyes', 'mouth', 'dazhair')]  # positions per pose

	bodies = [b for b in B.BODIES if not keys or b['key'] in keys]
	manifest['bodies'] = []
	bare_eyes = g9.read_pts(B.body_dir('bare') + 'zero.pts')['Genesis9Eyes']  # seat_eyes
	bare_bones = json.load(open(B.body_dir('bare') + 'zero.bones.json'))
	ref_cage = None
	for b in bodies:
		key, d = b['key'], B.body_dir(b['key'])
		print('BODY', key, flush=True)
		rest = g9.read_pts(d + 'a-pose.pts')
		rbones = json.load(open(d + 'a-pose.bones.json'))
		C0 = rest['Genesis9']
		y0 = C0[:, 1].min()
		s = b['stature'] / (C0[:, 1].max() - y0)  # Daz cm -> app metres, scaled to the stature
		M = lambda P: (P - [0, y0, 0]) * s
		os.makedirs(os.path.join(OUT, 'bodies', key), exist_ok=True)
		os.makedirs(os.path.join(OUT, 'figure', key), exist_ok=True)
		entry = {'key': key, 'label': b['label'], 'years': b['years'], 'stature': b['stature'], 'poses': {}, 'arms': {}, 'expressions': {}}
		for p in [{'key': 'a-pose'}] + B.POSES:
			pk = p['key']
			pts = rest if pk == 'a-pose' else g9.read_pts(d + pk + '.pts')
			bones = rbones if pk == 'a-pose' else json.load(open(d + pk + '.bones.json'))
			C = M(pts['Genesis9'])
			C.astype('<f4').tofile(os.path.join(OUT, 'bodies', key, pk + '.bin'))
			entry['poses'][pk] = {'file': 'bodies/%s/%s.bin' % (key, pk), 'landmarks': landmarks(bones, pts['Genesis9'], s, y0),
				'head': head_turn(bones, rbones), 'figure': 'figure/%s/%s.bin' % (key, pk)}
			# the person: eyes and mouth cages, hair (re-attached to this skin)
			S2 = skin['stencils'][1] @ (S1 @ C)
			out = []
			for name in moving:
				V = M(seat_eyes(pts[name], bones, bare_eyes, bare_bones) if name == 'Genesis9Eyes' else pts[name])
				if parts[name][0] == 'dazhair': V = hair_shift(scene[name]['root_bind'], scene[name]['roots'], V, S2, T2)
				out.append(V)
			np.concatenate(out).astype('<f4').tofile(os.path.join(OUT, 'figure', key, pk + '.bin'))
			if pk == 'a-pose':
				entry['landmarks'] = entry['poses'][pk]['landmarks']
				entry['neck'] = neck_plane(S2, T2, entry['landmarks'], b['stature'])
				if key == B.REF: ref_cage = C
		for side in 'lr':
			for a in B.ARMS:
				f = d + 'arm-%s-%s.pts' % (side, a)
				if not os.path.exists(f): print('   missing', f); continue
				ak = '%s-%s' % (side, a)
				M(g9.read_pts(f)['Genesis9']).astype('<f4').tofile(os.path.join(OUT, 'bodies', key, 'arm-' + ak + '.bin'))
				entry['arms'][ak] = 'bodies/%s/arm-%s.bin' % (key, ak)
		base = g9.read_pts(d + 'expr-neutral.pts')
		for e in B.EXPRESSIONS:
			if e['key'] == 'neutral': continue
			x = g9.read_pts(d + 'expr-%s.pts' % e['key'])
			delta = np.concatenate([(x[n] - base[n]) * s for n in ('Genesis9', 'Genesis9Eyes', 'Genesis9Mouth')])
			delta.astype('<f4').tofile(os.path.join(OUT, 'figure', key, 'expr-%s.bin' % e['key']))
			entry['expressions'][e['key']] = 'figure/%s/expr-%s.bin' % (key, e['key'])
		entry['materials'] = body_materials(key, parts)
		manifest['bodies'].append(entry)

	manifest['poses'] = [{'key': 'a-pose', 'label': 'Mannequin stance (A-pose)'}] + [{'key': p['key'], 'label': p['label']} for p in B.POSES]
	manifest['arms'] = B.ARMS
	manifest['expressions'] = [{'key': e['key'], 'label': e['label']} for e in B.EXPRESSIONS]
	manifest['figure'] = {'meshes': fmeshes, 'moving': [parts[n][0] for n in moving],
		'movingVertices': [len(scene[n]['P']) for n in moving], 'expression': ['skin', 'eyes', 'mouth'],
		'expressionVertices': [nC, len(scene['Genesis9Eyes']['P']), len(scene['Genesis9Mouth']['P'])]}
	if ref_cage is not None:
		try:
			X, idx, n, design = migration_map(ref_cage, S1, q1)
			mb = Blob()
			manifest['migrate'] = {'from': 'makehuman', 'vertices': n, 'positions': mb.add(X, '<f4'), 'index': mb.add(idx, '<u4'),
				'design': mb.add(design, '<f4')}
			mb.write(os.path.join(OUT, 'migrate.bin'))
		except Exception as ex: print('   no MakeHuman migration map:', ex)
	json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
	print('DONE', OUT)


if __name__ == '__main__':
	run([a for a in sys.argv[1:] if not a.startswith('--')] or None)
