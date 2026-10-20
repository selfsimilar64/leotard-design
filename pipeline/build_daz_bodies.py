# Builds Daz 3D Genesis 9 versions of the app's mannequin bodies, as extra bodies on the SAME mesh.
#
#   python pipeline/build_daz_bodies.py            (system Python 3 with numpy + scipy)
#
# Reads the owner's local Daz content library (free Genesis 9 Starter Essentials; set DAZ_LIBRARY
# if it is not in the default place) and writes app/public/mannequins-daz/. That folder is
# git-ignored: Daz content is licensed to the owner, and these files are derived from it, so they
# must not be pushed (shipping them in the app needs the Interactive License, see
# knowledge/engineering/pipeline/daz-bodies.md).
#
# Why "on the same mesh": every design in the app is anchored to the MakeHuman mannequin's
# triangles (surface points { f, b0, b1, b2 }, region fields on the reference body), so a body
# with a different mesh would orphan every design. Instead each Daz body is evaluated (shape
# sliders, arm stance), then the MakeHuman mannequin mesh is shrink-wrapped onto it. Vertex i stays
# the same anatomical point, so the app treats a Daz body exactly like its child/teen/adult bodies
# (pipeline/build_mannequins.py; mirrors its BODIES list, stance and output format).
#
# Steps per body:
#  1. Genesis 9 base mesh + the recipe's morph values, propagated through Daz's formula graph
#     (character controls drive body shapes, which drive proportion morphs and joint centres).
#     Only linear formulas are evaluated: the spline ones are pose-driven correctives, zero at rest.
#     Bone-scale controls (*_scl, Proportion*Scale) are ignored; the body is rescaled to the target
#     stature anyway.
#  2. Arms posed to the mannequin stance (same UPPER_DIR / ELBOW_BEND as build_mannequins.py) by
#     linear blend skinning with Genesis 9's own skin weights.
#  3. Uniform scale to the target stature, centimetres -> metres (Daz is already y up, +z front).
#  4. Wrap: the MakeHuman body of the same label is warped onto the Daz body by a thin-plate spline
#     through matching joints, then pulled onto the Daz surface (closest point with a compatible
#     normal) in rounds of smoothed displacement (a sparse least-squares solve). Egg head and hands
#     get no data term: they ride along with the neck and wrists (the mannequin keeps its egg head
#     and smoothed hands).
import json, math, os, glob, struct, sys, time
from collections import defaultdict
import numpy as np
from scipy.spatial import cKDTree
from scipy.interpolate import RBFInterpolator
import scipy.sparse as sp
import scipy.sparse.linalg as spl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.environ.get('DAZ_LIBRARY', r'C:/Users/Public/Documents/My DAZ 3D Library')
G9 = os.path.join(LIB, 'data', 'DAZ 3D', 'Genesis 9', 'Base')
MH = os.path.join(ROOT, 'app', 'public', 'mannequins')
OUT = os.path.join(ROOT, 'app', 'public', 'mannequins-daz')

# Recipes: Genesis 9 morph values (free Starter Essentials only). The free set has no age morphs
# ("Growing Up for Genesis 9" is a paid add-on): an adult shape scaled to a child's or a 13-year-
# old's stature still reads as a small woman (tried 2026-10-20), so there are no Daz child/teen
# bodies yet, only adults of different size and build. "Athletic" comes from the flexion morphs
# (glutes, quads, calves, hamstrings) at partial strength. `mh`: the MakeHuman body wrapped (the
# closest in size, which only matters as the wrap's starting point). `via`: instead of a wrap, take
# that already-built Daz body's fit through Daz's shared topology (see transfer(); built after it).
ATHLETIC = {'body_bs_FlexGluteClenchL': 0.35, 'body_bs_FlexGluteClenchR': 0.35, 'body_bs_FlexQuadL': 0.3,
	'body_bs_FlexQuadR': 0.3, 'body_bs_FlexCalfL': 0.3, 'body_bs_FlexCalfR': 0.3,
	'body_bs_FlexHamstringL': 0.2, 'body_bs_FlexHamstringR': 0.2}
BODIES = [
	dict(key='daz-petite', mh='teen', label='Daz · Petite athlete', years=18, stature=1.53,
		morphs={'BaseFeminine_body_bs_Body': 0.5, 'body_bs_ProportionShoulderWidth': -0.35, 'body_bs_ProportionChestWidth': -0.3,
			'body_ctrl_BreastsFlatten': 0.5, **ATHLETIC}),
	dict(key='daz-young', mh='young', label='Daz · Young adult, athletic (Kat)', years=18, stature=1.61,
		morphs={'Kat_body_bs_body': 1.0, **ATHLETIC}),
	dict(key='daz-adult', mh='young', via='daz-young', label='Daz · Adult (about 30)', years=30, stature=1.64,
		morphs={'BaseFeminine_body_bs_Body': 1.0, **{k: v * 0.8 for k, v in ATHLETIC.items()}}),
	dict(key='daz-broad', mh='young', via='daz-young', label='Daz · Adult, broader build (Amala)', years=30, stature=1.66,
		morphs={'Amala_body_bs_body': 1.0}),
]

# Mannequin stance, as in build_mannequins.py (there in Blender axes: z up, front -y).
UPPER_DIR = np.array([math.sin(math.radians(13)), -math.cos(math.radians(13)), 0.06])
UPPER_DIR /= np.linalg.norm(UPPER_DIR)
ELBOW_BEND = math.radians(14)

PARTS = ['shoulder', 'upperarm', 'forearm', 'upperleg', 'lowerleg', 'head', 'hand', 'spare']


# ---------------------------------------------------------------------------------------------
# Genesis 9 figure and morph library

def load_figure():
	d = json.load(open(os.path.join(G9, 'Genesis9.dsf'), encoding='utf-8'))
	g = d['geometry_library'][0]
	V = np.array(g['vertices']['values'], dtype=np.float64)
	mats = g['polygon_material_groups']['values']
	keep_mat = {i for i, m in enumerate(mats) if m != 'Mouth Cavity'}
	faces = [p[2:] for p in g['polylist']['values'] if p[1] in keep_mat]
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
	return V, faces, nodes, weights


def catmull_clark(V, faces):
	"""One level of Catmull-Clark subdivision on a mixed tri/quad mesh -> (vertices, quads).
	Genesis 9's base mesh is a subdivision cage (Daz Studio shows it subdivided); wrapping onto
	the cage itself leaves its facets as creases."""
	nV = len(V)
	fsz = np.array([len(f) for f in faces]); nF = len(faces)
	fid = np.repeat(np.arange(nF), fsz)
	cur = np.concatenate(faces).astype(np.int64)
	start = np.concatenate([[0], np.cumsum(fsz)[:-1]])
	pos = np.arange(len(cur)) - np.repeat(start, fsz)
	nxt = cur[np.repeat(start, fsz) + (pos + 1) % np.repeat(fsz, fsz)]
	prv = cur[np.repeat(start, fsz) + (pos - 1) % np.repeat(fsz, fsz)]
	FP = np.zeros((nF, 3)); np.add.at(FP, fid, V[cur]); FP /= fsz[:, None]
	ekey = np.sort(np.stack([cur, nxt], 1), 1)
	edges, einv = np.unique(ekey, axis=0, return_inverse=True)
	einv = einv.ravel(); nE = len(edges)
	ecount = np.bincount(einv, minlength=nE)
	efp = np.zeros((nE, 3)); np.add.at(efp, einv, FP[fid])
	mid = (V[edges[:, 0]] + V[edges[:, 1]]) / 2
	inner = ecount == 2
	EP = mid.copy()
	EP[inner] = (V[edges[inner, 0]] + V[edges[inner, 1]] + efp[inner]) / 4
	# vertices
	val = np.bincount(edges.ravel(), minlength=nV).astype(np.float64)
	Q = np.zeros((nV, 3)); nf = np.bincount(cur, minlength=nV).astype(np.float64)
	np.add.at(Q, cur, FP[fid]); Q /= np.maximum(nf, 1)[:, None]
	R = np.zeros((nV, 3)); np.add.at(R, edges[:, 0], mid); np.add.at(R, edges[:, 1], mid); R /= np.maximum(val, 1)[:, None]
	n = np.maximum(val, 3)[:, None]
	NV = (Q + 2 * R + (n - 3) * V) / n
	bnd = edges[~inner]
	onb = np.zeros(nV, bool); onb[bnd.ravel()] = True
	bsum = np.zeros((nV, 3)); np.add.at(bsum, bnd[:, 0], V[bnd[:, 1]]); np.add.at(bsum, bnd[:, 1], V[bnd[:, 0]])
	bcnt = np.bincount(bnd.ravel(), minlength=nV)
	ok = onb & (bcnt == 2)
	NV[ok] = (6 * V[ok] + bsum[ok]) / 8
	NV[onb & ~ok] = V[onb & ~ok]
	# new quads: corner vertex, edge(cur,nxt), face point, edge(prv,cur)
	eidx = lambda a, b: np.searchsorted(edges[:, 0] * (nV + 1) + edges[:, 1], np.minimum(a, b) * (nV + 1) + np.maximum(a, b))
	quads = np.stack([cur, nV + eidx(cur, nxt), nV + nE + fid, nV + eidx(prv, cur)], 1)
	return np.concatenate([NV, EP, FP]), quads


def triangles(quads):
	return np.concatenate([quads[:, [0, 1, 2]], quads[:, [0, 2, 3]]])


def parse_url(u):
	"""'Genesis9:/data/...dsf#Kat_body_bs_body?value' -> ('Kat_body_bs_body', 'value')"""
	tail = u.split('#')[-1]
	i, _, prop = tail.partition('?')
	return i, prop


def load_morphs():
	deltas, formulas = {}, []
	for f in glob.glob(os.path.join(G9, 'Morphs', '**', '*.dsf'), recursive=True):
		d = json.load(open(f, encoding='utf-8'))
		for m in d.get('modifier_library', []):
			if 'morph' in m:
				vals = m['morph']['deltas']['values']
				if vals:
					a = np.array(vals, dtype=np.float64)
					deltas[m['id']] = (a[:, 0].astype(np.int64), a[:, 1:4])
			for x in m.get('formulas', []):
				ops = x['operations']
				out = parse_url(x['output'])
				mult = x.get('stage') == 'mult'
				if len(ops) == 3 and [o['op'] for o in ops] == ['push', 'push', 'mult'] and 'url' in ops[0]:
					formulas.append((out, parse_url(ops[0]['url']), ops[1]['val'], mult))
				elif len(ops) == 1 and ops[0]['op'] == 'push' and 'url' in ops[0]:
					formulas.append((out, parse_url(ops[0]['url']), 1.0, mult))
				else:
					# spline_tcb / spline_linear: pose-driven correctives (bone rotation in), zero at rest.
					# Kept as a zero term so a 'mult' stage on the same output still multiplies zero.
					formulas.append((out, None, 0.0, mult))
	return deltas, formulas


def evaluate(settings, formulas):
	"""Morph values and joint-centre offsets for the given slider settings (linear formula graph)."""
	# Daz: value = (own setting + sum-stage formulas) * product of mult-stage formulas. Corrective
	# morphs are "spline(bone rotation) [sum] * character strength [mult]", so they stay 0 at rest.
	vals = dict(settings)
	for _ in range(30):
		new, prod = defaultdict(float, settings), {}
		for (oid, oprop), inp, k, mult in formulas:
			if oprop != 'value': continue
			v = vals.get(inp[0], 0.0) * k if inp and inp[1] == 'value' else 0.0
			if mult: prod[oid] = prod.get(oid, 1.0) * v
			else: new[oid] += v
		for oid, m in prod.items(): new[oid] *= m
		if all(abs(new.get(k, 0) - vals.get(k, 0)) < 1e-9 for k in set(new) | set(vals)): break
		vals = dict(new)
	joints = defaultdict(lambda: np.zeros(3))
	for (oid, oprop), inp, k, mult in formulas:
		if not inp or inp[1] != 'value' or mult or not oprop.startswith('center_point/'): continue
		v = vals.get(inp[0], 0.0)
		if v: joints[oid]['xyz'.index(oprop[-1])] += v * k
	return vals, joints


# ---------------------------------------------------------------------------------------------
# Posing: rotate each arm about its joints (linear blend skinning with the figure's weights)

def rot_between(a, b):
	a = a / np.linalg.norm(a); b = b / np.linalg.norm(b)
	v = np.cross(a, b); c = float(np.dot(a, b)); s = np.linalg.norm(v)
	if s < 1e-12: return np.eye(3)
	K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
	return np.eye(3) + K + K @ K * ((1 - c) / s ** 2)


def subtree(nodes, root):
	kids = defaultdict(list)
	for k, n in nodes.items():
		if n['parent']: kids[n['parent']].append(k)
	out, stack = [], [root]
	while stack:
		k = stack.pop(); out.append(k); stack += kids[k]
	return out


def pose_arms(V, C, nodes, weights):
	"""V: vertices, C: joint centres (dict) -> posed copies. Each joint gets an affine (R, t)."""
	xf = {}  # joint -> (R, t), x' = R x + t
	for side, sx in (('l', 1), ('r', -1)):
		S, E, W = C[side + '_upperarm'], C[side + '_forearm'], C[side + '_hand']
		target = UPPER_DIR * np.array([sx, 1, 1])
		R1 = rot_between(E - S, target)
		t1 = S - R1 @ S
		E1, W1 = R1 @ E + t1, R1 @ W + t1
		# forearm: the upper-arm direction bent forward (+z) about the elbow
		fwd = np.array([0, 0, 1.0]) - target * target[2]; fwd /= np.linalg.norm(fwd)
		fa = target * math.cos(ELBOW_BEND) + fwd * math.sin(ELBOW_BEND)
		R2 = rot_between(W1 - E1, fa)
		Rf, tf = R2 @ R1, R2 @ (t1 - E1) + E1
		fore = set(subtree(nodes, side + '_forearm'))
		for j in subtree(nodes, side + '_upperarm'):
			xf[j] = (Rf, tf) if j in fore else (R1, t1)
	P = np.zeros_like(V); wsum = np.zeros(len(V))
	for j, w in weights.items():
		R, t = xf.get(j, (np.eye(3), np.zeros(3)))
		m = w > 0
		P[m] += w[m, None] * (V[m] @ R.T + t); wsum[m] += w[m]
	rest = wsum < 1e-6
	P[~rest] /= wsum[~rest, None]; P[rest] = V[rest]
	Cp = {}
	for k, c in C.items():
		R, t = xf.get(k, (np.eye(3), np.zeros(3)))
		Cp[k] = R @ c + t
	return P, Cp


# ---------------------------------------------------------------------------------------------
# Geometry helpers

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


def laplacian(n, T):
	e = np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]])
	e = np.unique(np.sort(e, axis=1), axis=0)
	A = sp.coo_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(n, n)).tocsr()
	A = A + A.T
	return sp.diags(np.asarray(A.sum(1)).ravel()) - A


WRAP_ROUNDS = ((0.06, 4.0), (0.045, 2.0), (0.03, 1.0), (0.02, 0.5), (0.014, 0.25), (0.01, 0.12), (0.008, 0.06))
SLIDE = 0.3  # weight of the point-to-point term next to point-to-plane: low enough to let vertices slide off a crease, high enough that limbs (cylinders) cannot twist


def wrap(Q, T, data_mask, target_P, target_T, rounds=WRAP_ROUNDS):
	"""Pull Q (n x 3) onto the target surface (non-rigid ICP). Each round: closest target point with
	a compatible normal, then a displacement D minimising
	    lam * sum_edges |D_i - D_j|^2 + sum_i w_i [ (n_i . (Q_i + D_i - t_i))^2 + SLIDE |Q_i + D_i - t_i|^2 ].
	Point-to-plane lets vertices slide along the surface instead of piling up where it curves away
	(closest-point targets collapse there and leave a crease). data_mask: vertices with a data term."""
	n = len(Q)
	Lp = laplacian(n, T)
	L3 = sp.kron(Lp, sp.identity(3), format='csr')
	Nt = vertex_normals(target_P, target_T)
	S, SN = surface_samples(target_P, target_T, Nt, 0.002)
	tree = cKDTree(S)
	rows = np.repeat(np.arange(n) * 3, 9) + np.tile(np.repeat(np.arange(3), 3), n)
	cols = np.repeat(np.arange(n) * 3, 9) + np.tile(np.tile(np.arange(3), 3), n)
	for radius, lam in rounds:
		Nq = vertex_normals(Q, T)
		dist, nb = tree.query(Q, k=32, distance_upper_bound=radius)
		target = np.zeros_like(Q); tn = np.zeros_like(Q); ok = np.zeros(n, bool)
		for kk in range(nb.shape[1]):
			col = nb[:, kk]; good = (col < len(S)) & ~ok
			if not good.any(): break
			cand = np.where(good)[0]
			fit = np.einsum('ij,ij->i', SN[col[cand]], Nq[cand]) > 0.35
			sel = cand[fit]
			target[sel] = S[col[sel]]; tn[sel] = SN[col[sel]]; ok[sel] = True
		w = (ok & data_mask).astype(np.float64)
		M = w[:, None, None] * (tn[:, :, None] * tn[:, None, :] + SLIDE * np.eye(3))  # n x 3 x 3 data blocks
		A = sp.coo_matrix((M.ravel(), (rows, cols)), shape=(3 * n, 3 * n)).tocsr() + lam * L3 + 1e-6 * sp.identity(3 * n)
		rhs = np.einsum('nij,nj->ni', M, target - Q).ravel()
		D = spl.spsolve(A.tocsc(), rhs).reshape(n, 3)
		Q = Q + D
		res = np.abs(np.einsum('ij,ij->i', tn, Q - target))[w > 0]
		print('   wrap r=%.3f lam=%.2f matched %.1f%% move %.1f mm, plane residual p90 %.1f mm' % (radius, lam,
			100 * w.sum() / data_mask.sum(), 1000 * np.linalg.norm(D, axis=1).mean(), 1000 * np.percentile(res, 90)), flush=True)
	return Q


# ---------------------------------------------------------------------------------------------

def daz_landmarks(Cp, P, mh_lm):
	"""App landmarks (build_mannequins.py meanings) from the posed Genesis 9 joints."""
	L = {'neck_base': Cp['neck1'], 'head_base': Cp['head'], 'shoulder_l': Cp['l_upperarm'], 'elbow_l': Cp['l_forearm'],
		'wrist_l': Cp['l_hand'], 'hip_l': Cp['l_thigh'], 'knee_l': Cp['l_shin'], 'ankle_l': Cp['l_foot'], 'pelvis': Cp['hip']}
	L['head_top'] = np.array([0, P[:, 1].max(), Cp['head'][2]])
	# chest / waist: the MakeHuman spine joints sit at fixed fractions between pelvis and neck base
	spine = [Cp[k] for k in ('hip', 'spine1', 'spine2', 'spine3', 'spine4', 'neck1')]
	def along(frac):
		y = L['pelvis'][1] + frac * (L['neck_base'][1] - L['pelvis'][1])
		for a, b in zip(spine, spine[1:]):
			if a[1] <= y <= b[1]:
				t = (y - a[1]) / (b[1] - a[1]); return a + (b - a) * t
		return spine[-1]
	for k in ('chest', 'waist'):
		f = (mh_lm[k][1] - mh_lm['pelvis'][1]) / (mh_lm['neck_base'][1] - mh_lm['pelvis'][1])
		L[k] = along(f)
	return L


def daz_body(spec, fig, morphs, verbose=True):
	"""The posed, scaled Genesis 9 body of a recipe: cage, joints, subdivided surface (vertices,
	triangles). Every recipe gives the same triangles (Genesis 9 topology)."""
	V0, Tg, nodes, weights = fig
	deltas, formulas = morphs
	vals, joint_off = evaluate(spec['morphs'], formulas)
	V = V0.copy()
	used = []
	for k, v in vals.items():
		if v and k in deltas:
			idx, d = deltas[k]; V[idx] += v * d; used.append('%s=%.2f' % (k, v))
	C = {k: n['center'] + joint_off[k] if k in joint_off else n['center'].copy() for k, n in nodes.items()}
	if verbose: print('  morphs:', ', '.join(sorted(used)))
	P, Cp = pose_arms(V, C, nodes, weights)
	# cm -> m, feet on the ground, uniform scale to the stature
	ymin = P[:, 1].min()
	sc = spec['stature'] / (P[:, 1].max() - ymin)
	P = (P - [0, ymin, 0]) * sc
	Cp = {k: (c - [0, ymin, 0]) * sc for k, c in Cp.items()}
	S1, q1 = catmull_clark(P, Tg)
	S2, q2 = catmull_clark(S1, q1)
	return P, Cp, S2, triangles(q2)


def transfer(Q, src_S, T2, dst_S):
	"""Carry a mesh lying on one Genesis 9 shape onto another. Every recipe is the same Daz mesh, so a
	vertex stored as (triangle, barycentric weights, offset along the normal) on the source surface
	is the same anatomical point on the target. Off-surface parts (hands, egg) keep their offset."""
	Ns, Nd = vertex_normals(src_S, T2), vertex_normals(dst_S, T2)
	S, _, tri, bar = surface_samples(src_S, T2, Ns, 0.0015, ids=True)
	_, i = cKDTree(S).query(Q)
	t, b = T2[tri[i]], bar[i]
	p = np.einsum('nk,nkc->nc', b, src_S[t])
	n = np.einsum('nk,nkc->nc', b, Ns[t]); n /= np.linalg.norm(n, axis=1, keepdims=True)
	d = np.einsum('nc,nc->n', Q - p, n)
	pd = np.einsum('nk,nkc->nc', b, dst_S[t])
	nd = np.einsum('nk,nkc->nc', b, Nd[t]); nd /= np.linalg.norm(nd, axis=1, keepdims=True)
	return pd + d[:, None] * nd


def build(spec, fig, morphs, mh):
	P, Cp, S2, T2 = daz_body(spec, fig, morphs)
	src, T, pw, mh_lm = mh[spec['mh']]
	Ld = daz_landmarks(Cp, P, mh_lm)
	head, hand = pw[:, 5] / 255.0, pw[:, 6] / 255.0
	if spec.get('via'):
		# --- transfer from an already-built Daz body (its wrap is the reference fit) ------------------
		# Owner, 2026-10-20: the young adult's leg line sits cleanly in the creases; wrapping the fuller
		# bodies anew (even with crease points pinned) left the line kinked. Transferring through Daz's
		# own topology keeps the young adult's fit and follows Daz's anatomy for the new shape.
		via = next(b for b in BODIES if b['key'] == spec['via'])
		_, _, Sv, _ = daz_body(via, fig, morphs, verbose=False)
		Qv = np.fromfile(os.path.join(OUT, via['key'] + '.bin'), dtype='<f4').reshape(-1, 3).astype(np.float64)
		Q = transfer(Qv, Sv, T2, S2)
		# Hands: the mannequin's smoothed hands are not on the Daz hand surface, and point-by-point
		# transfer crumpled them onto Daz's fingers. Their displacement is instead the smooth
		# (harmonic) continuation of the forearm's.
		D, free = Q - Qv, hand > 0.15
		Lp = laplacian(len(Q), T).tocsr()
		Lff, Lfb = Lp[free][:, free], Lp[free][:, ~free]
		solve = spl.factorized(Lff.tocsc())
		for c in range(3): D[free, c] = solve(-(Lfb @ D[~free, c]))
		Q = Qv + D
		src = Qv  # the egg below follows the neck relative to the via body
		print('   transferred from', via['key'])
	else:
		# --- wrap the MakeHuman mannequin of the same label onto it -----------------------------------
		names = ['neck_base', 'shoulder_l', 'elbow_l', 'wrist_l', 'hip_l', 'knee_l', 'ankle_l', 'head_top']
		A, B = [], []
		for k in names:
			a, b = np.array(mh_lm[k]), np.array(Ld[k])
			A.append(a); B.append(b)
			if k.endswith('_l'): A.append(a * [-1, 1, 1]); B.append(b * [-1, 1, 1])
		A, B = np.array(A), np.array(B)
		tps = RBFInterpolator(A, B - A, kernel='thin_plate_spline', smoothing=1e-4, degree=1)
		Q = src + tps(src)
		data = (head < 0.3) & (hand < 0.15)
		Q = wrap(Q, T, data, S2, T2)
	# Egg head: the source egg moved as one piece by the neck's mean displacement (warping it with
	# the body tilted it), blended in over the neck by the head weight.
	neck = (head > 0.05) & (head < 0.5)
	t = (Q[neck] - src[neck]).mean(0)
	k = np.clip((head - 0.3) / 0.4, 0, 1)[:, None]; k = k * k * (3 - 2 * k)
	Q = Q * (1 - k) + (src + t) * k
	Ld['head_top'] = np.array([0, Q[:, 1].max(), Ld['head_top'][2]])
	return Q.astype(np.float32), {k: [round(float(c), 5) for c in v] for k, v in Ld.items()}


def main():
	t0 = time.time()
	man = json.load(open(os.path.join(MH, 'manifest.json')))
	shared = open(os.path.join(MH, 'shared.bin'), 'rb').read()
	I, N = man['indices'], man['vertices']
	T = np.frombuffer(shared, dtype='<u4', count=I).reshape(-1, 3).astype(np.int64)
	pw = np.frombuffer(shared, dtype=np.uint8, offset=I * 4, count=N * 8).reshape(-1, 8)
	mh = {}
	for b in man['bodies']:
		pos = np.fromfile(os.path.join(MH, b['file']), dtype='<f4').reshape(-1, 3).astype(np.float64)
		mh[b['key']] = (pos, T, pw, b['landmarks'])
	fig = load_figure()
	morphs = load_morphs()
	print('loaded Genesis 9 (%d verts) and %d morphs in %.1fs' % (len(fig[0]), len(morphs[0]), time.time() - t0), flush=True)
	only = sys.argv[1:]
	os.makedirs(OUT, exist_ok=True)
	out = {'source': 'Daz 3D Genesis 9 (owner-licensed, local only) wrapped with the MakeHuman mannequin mesh by pipeline/build_daz_bodies.py',
		'vertices': N, 'bodies': []}
	mp = os.path.join(OUT, 'manifest.json')
	keys = [b['key'] for b in BODIES]
	if only and os.path.exists(mp): out['bodies'] = [b for b in json.load(open(mp))['bodies'] if b['key'] not in only and b['key'] in keys]
	for spec in BODIES:
		if only and spec['key'] not in only: continue
		print('BUILD', spec['key'], flush=True)
		Q, lm = build(spec, fig, morphs, mh)
		Q.tofile(os.path.join(OUT, spec['key'] + '.bin'))
		out['bodies'].append({'key': spec['key'], 'label': spec['label'], 'years': spec['years'],
			'stature': round(float(Q[:, 1].max() - Q[:, 1].min()), 4), 'file': spec['key'] + '.bin', 'landmarks': lm})
	order = [b['key'] for b in BODIES]
	out['bodies'].sort(key=lambda b: order.index(b['key']))
	json.dump(out, open(mp, 'w'), indent=1)
	print('DONE %.1fs' % (time.time() - t0), OUT)


if __name__ == '__main__':
	main()
