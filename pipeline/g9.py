# Genesis 9 helpers shared by the body pipeline (pipeline/daz/bodies.py): the figure file, Catmull-
# Clark subdivision as a sparse matrix (stencil), triangles, normals, surface sampling and the
# shared-topology transfer. Genesis 9 is the app's canonical mesh: its base cage subdivided once
# (knowledge: engineering/architecture/genesis9-as-canonical-mesh.md).
import gzip, json, os
import numpy as np
import scipy.sparse as sp
from scipy.spatial import cKDTree

LIB = os.environ.get('DAZ_LIBRARY', r'C:/Users/Public/Documents/My DAZ 3D Library').replace('\\', '/').rstrip('/') + '/'
G9 = os.path.join(LIB, 'data', 'DAZ 3D', 'Genesis 9', 'Base')


def read_dsf(f):
	"""A .dsf file, plain or gzip-compressed (add-on products such as Growing Up ship compressed)."""
	raw = open(f, 'rb').read()
	if raw[:2] == b'\x1f\x8b': raw = gzip.decompress(raw)
	return json.loads(raw.decode('utf-8'))


def load_figure():
	"""Genesis 9's base cage: vertices (cm), every polygon (all materials, Mouth Cavity included: the
	figure render shows it), polygon material names, joint centres and skin weights."""
	d = read_dsf(os.path.join(G9, 'Genesis9.dsf'))
	g = d['geometry_library'][0]
	V = np.array(g['vertices']['values'], dtype=np.float64)
	mats = g['polygon_material_groups']['values']
	faces = [p[2:] for p in g['polylist']['values']]
	fmat = [mats[p[1]] for p in g['polylist']['values']]
	nodes = {}
	for n in d['node_library']:
		cp = {c['id']: c['value'] for c in n.get('center_point', [])}
		nodes[n['id']] = dict(parent=n.get('parent', '').split('#')[-1] or None,
			center=np.array([cp.get('x', 0), cp.get('y', 0), cp.get('z', 0)], dtype=np.float64))
	skin = d['modifier_library'][0]['skin']
	weights = {}
	for j in skin['joints']:
		w = np.zeros(len(V))
		for vi, wt in j['node_weights']['values']: w[vi] = wt
		weights[j['id']] = w
	return dict(V=V, faces=faces, fmat=fmat, nodes=nodes, weights=weights)


def cc_stencil(nV, faces):
	"""One level of Catmull-Clark subdivision as a sparse matrix: new positions = S @ old positions.
	Mixed tri/quad faces; open boundaries keep a cubic B-spline curve (corners and boundary
	vertices with other than two boundary edges stay put). Returns (S (csr, n_new x nV), quads
	(n, 4) of new vertex ids: corner, edge(cur, next), face point, edge(prev, cur); parent face of
	each quad). New vertex order: old vertices, edge points, face points.
	Twin: app/src/body/subdivide.js ccStencil (the app subdivides cages itself); keep the rules and
	the vertex order identical (app/test/subdivide.test.js checks against topology.bin)."""
	fsz = np.array([len(f) for f in faces]); nF = len(faces)
	fid = np.repeat(np.arange(nF), fsz)
	cur = np.concatenate(faces).astype(np.int64)
	start = np.concatenate([[0], np.cumsum(fsz)[:-1]])
	pos = np.arange(len(cur)) - np.repeat(start, fsz)
	nxt = cur[np.repeat(start, fsz) + (pos + 1) % np.repeat(fsz, fsz)]
	prv = cur[np.repeat(start, fsz) + (pos - 1) % np.repeat(fsz, fsz)]
	# face points: mean of the face's corners
	Fm = sp.csr_matrix((1.0 / fsz[fid], (fid, cur)), shape=(nF, nV))
	ekey = np.sort(np.stack([cur, nxt], 1), 1)
	edges, einv = np.unique(ekey, axis=0, return_inverse=True)
	einv = einv.ravel(); nE = len(edges)
	ecount = np.bincount(einv, minlength=nE)
	inner = ecount == 2
	ei = np.arange(nE)
	# edge points: inner (a + b + fa + fb) / 4, boundary (a + b) / 2
	Ends = sp.csr_matrix((np.ones(2 * nE), (np.repeat(ei, 2), edges.ravel())), shape=(nE, nV))
	EF = sp.csr_matrix((np.ones(len(einv)), (einv, fid)), shape=(nE, nF))
	scale = np.where(inner, 0.25, 0.5)
	Em = sp.diags(scale) @ Ends + sp.diags(np.where(inner, 0.25, 0.0)) @ (EF @ Fm)
	# vertices: (Q + 2R + (n - 3) V) / n, Q = mean of adjacent face points, R = mean of edge midpoints
	val = np.bincount(edges.ravel(), minlength=nV).astype(np.float64)
	nf = np.bincount(cur, minlength=nV).astype(np.float64)
	VF = sp.csr_matrix((np.ones(len(cur)), (cur, fid)), shape=(nV, nF))
	Q = sp.diags(1 / np.maximum(nf, 1)) @ VF @ Fm
	VE = sp.csr_matrix((np.ones(2 * nE), (edges.ravel(), np.repeat(ei, 2))), shape=(nV, nE))
	R = sp.diags(1 / np.maximum(val, 1)) @ VE @ (0.5 * Ends)
	n = np.maximum(val, 3)
	Vm = sp.diags(1 / n) @ Q + sp.diags(2 / n) @ R + sp.diags((n - 3) / n)
	Vm = Vm.tolil()
	bnd = edges[~inner]
	onb = np.zeros(nV, bool); onb[bnd.ravel()] = True
	bcnt = np.bincount(bnd.ravel(), minlength=nV)
	nb = [[] for _ in range(nV)]
	for a, b in bnd: nb[a].append(b); nb[b].append(a)
	for v in np.nonzero(onb)[0]:
		Vm.rows[v] = []; Vm.data[v] = []
		if bcnt[v] == 2:
			Vm[v, v] = 0.75; Vm[v, nb[v][0]] = 0.125; Vm[v, nb[v][1]] = 0.125
		else: Vm[v, v] = 1.0
	S = sp.vstack([Vm.tocsr(), Em, Fm]).tocsr()
	eidx = lambda a, b: np.searchsorted(edges[:, 0] * (nV + 1) + edges[:, 1], np.minimum(a, b) * (nV + 1) + np.maximum(a, b))
	quads = np.stack([cur, nV + eidx(cur, nxt), nV + nE + fid, nV + eidx(prv, cur)], 1)
	S.sum_duplicates(); S.eliminate_zeros()
	return S, quads, fid


def subdivide_uv(faces, fuv):
	"""UVs of one subdivision level, linear per face (face-varying: UV seams stay seams). fuv: one
	(k, 2) array per face, in the face's corner order. Returns (n_quads, 4, 2) in cc_stencil's quad order."""
	fsz = np.array([len(f) for f in faces])
	start = np.concatenate([[0], np.cumsum(fsz)[:-1]])
	U = np.concatenate(fuv)
	pos = np.arange(len(U)) - np.repeat(start, fsz)
	nxt = np.repeat(start, fsz) + (pos + 1) % np.repeat(fsz, fsz)
	prv = np.repeat(start, fsz) + (pos - 1) % np.repeat(fsz, fsz)
	fid = np.repeat(np.arange(len(faces)), fsz)
	FU = np.zeros((len(faces), 2)); np.add.at(FU, fid, U); FU /= fsz[:, None]
	return np.stack([U, (U + U[nxt]) / 2, FU[fid], (U + U[prv]) / 2], 1)


def triangles(quads):
	"""Quads split along their 0-2 diagonal: first triangles (0, 1, 2) of every quad, then (0, 2, 3)."""
	return np.concatenate([quads[:, [0, 1, 2]], quads[:, [0, 2, 3]]])


def vertex_normals(P, T):
	n = np.zeros_like(P)
	fn = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]])
	for k in range(3): np.add.at(n, T[:, k], fn)
	return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)


def surface_samples(P, T, N, spacing, ids=False):
	"""Points (and interpolated normals) on the surface, about `spacing` apart. ids: also return
	each sample's triangle and barycentric weights."""
	a, b, c = P[T[:, 0]], P[T[:, 1]], P[T[:, 2]]
	area = np.linalg.norm(np.cross(b - a, c - a), axis=1) / 2
	nt = np.arange(len(T))
	pts, nrm = [a, b, c], [N[T[:, 0]], N[T[:, 1]], N[T[:, 2]]]
	tri, bar = [nt, nt, nt], [np.tile(e, (len(T), 1)) for e in np.eye(3)]
	k = np.maximum(1, np.ceil(np.sqrt(area / (spacing * spacing * 0.5)))).astype(int)
	for n in np.unique(k):
		sel = np.where(k == n)[0]
		for i in range(n + 1):
			for j in range(n + 1 - i):
				u, v = i / n, j / n; w = 1 - u - v
				pts.append(a[sel] * w + b[sel] * u + c[sel] * v)
				nrm.append(N[T[sel, 0]] * w + N[T[sel, 1]] * u + N[T[sel, 2]] * v)
				tri.append(sel); bar.append(np.tile([w, u, v], (len(sel), 1)))
	pts, nrm = np.concatenate(pts), np.concatenate(nrm)
	nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-12)
	return (pts, nrm, np.concatenate(tri), np.concatenate(bar)) if ids else (pts, nrm)


def bind(Q, S, T, spacing=0.0015):
	"""Bind points Q to the surface (S, T): per point (triangle, barycentric weights, offset along the
	interpolated normal) at the nearest surface sample. Evaluate with bound_positions."""
	N = vertex_normals(S, T)
	X, _, tri, bar = surface_samples(S, T, N, spacing, ids=True)
	_, i = cKDTree(X).query(Q)
	t, b = tri[i], bar[i]
	p = np.einsum('nk,nkc->nc', b, S[T[t]])
	n = np.einsum('nk,nkc->nc', b, N[T[t]]); n /= np.linalg.norm(n, axis=1, keepdims=True)
	return t, b, np.einsum('nc,nc->n', Q - p, n)


def bound_positions(binding, S, T):
	t, b, d = binding
	N = vertex_normals(S, T)
	p = np.einsum('nk,nkc->nc', b, S[T[t]])
	n = np.einsum('nk,nkc->nc', b, N[T[t]]); n /= np.linalg.norm(n, axis=1, keepdims=True)
	return p + d[:, None] * n


def transfer(Q, src_S, T, dst_S, spacing=0.0015):
	"""Carry points lying on one Genesis 9 shape onto another (same topology T): each point is the
	same anatomical spot on the target (triangle, barycentric weights, offset along the normal)."""
	return bound_positions(bind(Q, src_S, T, spacing), dst_S, T)


def read_pts(path):
	"""bake_bodies.dsa output -> {node name: (n, 3) float64 positions, cm}."""
	out, cur, rows = {}, None, []
	with open(path) as f:
		data = f.read().split('\n')
	i = 0
	while i < len(data):
		line = data[i]
		if line.startswith('#node '):
			_, name, n = line.split(' ')
			n = int(n)
			out[name] = np.array(' '.join(data[i + 1:i + 1 + n]).split(), dtype=np.float64).reshape(n, 3)
			i += 1 + n
		else: i += 1
	return out


def read_obj(path):
	"""Vertices, UVs, faces (vertex ids, uv ids, material), each node's first vertex (Daz Studio writes
	'# <node name>' before each node's block, spaces as underscores) and strands (polylines)."""
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
			elif line.startswith('l '):
				lines.append(([int(c.split('/')[0]) - 1 for c in line.split()[1:]], mat))
	return np.array(V, dtype=np.float64), np.array(VT, dtype=np.float64), faces, starts, lines
