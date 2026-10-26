# Carry a shape change made in the a-pose into a baked Daz pose: each changed vertex's offset turns
# with the best-fit rotation of its mesh neighbourhood (as Daz skins a morph's offsets).
import numpy as np
import bust_proto as B
from bust_proto import g9

def carry(P_a, Q_a, P_pose, rings=2):
	F = B.fig(); A = F['A'].tocsr()
	D = Q_a - P_a
	mv = np.where(np.linalg.norm(D, axis=1) > 1e-4)[0]
	Ar = A.copy()
	for _ in range(rings - 1): Ar = Ar + Ar @ A
	Ar = Ar.tocsr()
	out = P_pose.copy()
	for i in mv:
		nb = Ar.indices[Ar.indptr[i]:Ar.indptr[i + 1]]
		nb = nb[nb != i]
		E0 = P_a[nb] - P_a[i]; E1 = P_pose[nb] - P_pose[i]
		U, s, Vt = np.linalg.svd(E1.T @ E0)
		R = U @ Vt
		if np.linalg.det(R) < 0: U[:, -1] *= -1; R = U @ Vt
		out[i] = P_pose[i] + R @ D[i]
	return out
