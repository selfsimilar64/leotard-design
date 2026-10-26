# Artifact score for a seat result: creases and flips the change added to the skin.
import numpy as np
import bust_proto as B
from bust_proto import g9
import seat_proto as SP

KW = dict(along=0.25, front=-3.0, front_soft=3.0, w_lo=1.5, w_hi=4.5, w_soft=2.5, top_soft=6.0, leg_keep=0.3, embed=True, t_in=0.15, cling=0.002)

def edges():
	F = B.fig(); A = F['A'].tocoo(); m = A.row < A.col
	return A.row[m], A.col[m]

def score(P0, Q, thresh=20.0, verbose=False):
	"""P0: the body without the change, Q: with it (same pose). Edges whose vertex normals bend
	`thresh` degrees more than on P0, and triangles that flipped; restricted to vertices that moved."""
	F = B.fig(); T = F['tris']
	i, j = edges()
	N0 = g9.vertex_normals(P0, T); N1 = g9.vertex_normals(Q, T)
	a0 = np.degrees(np.arccos(np.clip((N0[i] * N0[j]).sum(1), -1, 1)))
	a1 = np.degrees(np.arccos(np.clip((N1[i] * N1[j]).sum(1), -1, 1)))
	mv = np.linalg.norm(Q - P0, axis=1) > 0.02
	e = (mv[i] | mv[j]) & (a1 - a0 > thresh)
	f0 = np.cross(P0[T[:, 1]] - P0[T[:, 0]], P0[T[:, 2]] - P0[T[:, 0]]); f1 = np.cross(Q[T[:, 1]] - Q[T[:, 0]], Q[T[:, 2]] - Q[T[:, 0]])
	fl = (np.einsum('ij,ij->i', f0, f1) < 0) & mv[T].any(1)
	sq = (np.linalg.norm(f1, axis=1) < 0.1 * np.linalg.norm(f0, axis=1)) & mv[T].any(1)
	bad_v = np.unique(np.concatenate([i[e], j[e], T[fl].ravel(), T[sq].ravel()]))
	return dict(crease=int(e.sum()), flip=int(fl.sum()), squash=int(sq.sum()), bad_v=bad_v)

def pose_mesh(body, pose):
	if pose == 'a-pose': return B.cage(body)
	return g9.read_pts(B.REPO + '/pipeline/daz/out/bodies/%s/%s.pts' % (body, pose))['Genesis9']


def closed(P0, Q, free, Xcloth=None):
	"""How much of the cleft the change closes: for band skin that started more than 5 mm behind
	the cleft's local surface (its walls and floor), the mean fraction of that depth removed."""
	from scipy.spatial import cKDTree
	m = free > 0.6
	# local surface: the outermost skin nearby (max over 2 cm along the band's outward direction)
	F = B.fig(); N = g9.vertex_normals(P0, F['tris'])
	n = -N[m].mean(0); n /= np.linalg.norm(n)   # into the body
	t = cKDTree(P0[m][:, :2])
	d0 = P0[m] @ n; d1 = Q[m] @ n
	nb = t.query_ball_point(P0[m][:, :2], 2.0)
	front = np.array([d0[k].min() for k in nb])
	depth = d0 - front
	deep = depth > 0.5
	return float(np.mean(np.clip((d0[deep] - d1[deep]) / depth[deep], 0, 1.5))) if deep.any() else 0.0
