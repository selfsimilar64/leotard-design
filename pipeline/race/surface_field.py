"""A smooth "distance from the body" for the fit energy: signed distance to the garment surface, sampled on a grid near it and
interpolated between grid points, one field per part (torso, arm) as Surface.parts. It replaces solve's nearest-vertex tangent plane in the
race's energy: the same measure, but a plain smooth function of where a point is, with no jumps when the nearest vertex changes and no
memory of the last step (solver race, stage 1). On a GPU the grid is a 3D texture.
Grid points are kept only within BAND of their part's surface and stored as sorted integer keys, so a point is looked up by binary search;
outside the band the field has no value (`inside` is False there).
"""
import numpy as np
from scipy.ndimage import binary_dilation
from scipy.spatial import cKDTree

H = 0.002  # grid spacing, m
BAND = 0.012  # how far from the surface the field is sampled, m
CHUNK = 200000


def closest_points(p, a, b, c):
	"""Barycentric weights of the closest point on each triangle (a, b, c) to each p (Ericson, Real-Time Collision Detection 5.1.5)."""
	ab, ac = b - a, c - a
	dot = lambda u, v: (u * v).sum(-1)
	ap, bp, cp = p - a, p - b, p - c
	d1, d2, d3, d4, d5, d6 = dot(ab, ap), dot(ac, ap), dot(ab, bp), dot(ac, bp), dot(ab, cp), dot(ac, cp)
	va, vb, vc = d3 * d6 - d5 * d4, d5 * d2 - d1 * d6, d1 * d4 - d3 * d2
	den = va + vb + vc
	den = np.where(np.abs(den) < 1e-30, 1e-30, den)
	v, w = vb / den, vc / den
	W = np.stack([1 - v - w, v, w], axis=-1)  # inside the face; regions below overwrite, last = highest priority
	with np.errstate(divide='ignore', invalid='ignore'):
		t = (d4 - d3) / ((d4 - d3) + (d5 - d6))
		m = (va <= 0) & (d4 - d3 >= 0) & (d5 - d6 >= 0)
		W[m] = np.stack([0 * t, 1 - t, t], -1)[m]
		t = d2 / (d2 - d6)
		m = (vb <= 0) & (d2 >= 0) & (d6 <= 0)
		W[m] = np.stack([1 - t, 0 * t, t], -1)[m]
		m = (d6 >= 0) & (d5 <= d6)
		W[m] = [0, 0, 1]
		t = d1 / (d1 - d3)
		m = (vc <= 0) & (d1 >= 0) & (d3 <= 0)
		W[m] = np.stack([1 - t, t, 0 * t], -1)[m]
		m = (d3 >= 0) & (d4 <= d3)
		W[m] = [0, 1, 0]
		m = (d1 <= 0) & (d2 <= 0)
		W[m] = [1, 0, 0]
	return W


class Field:
	"""Signed distance to one part of the garment surface: positive on the side its normals face."""

	def __init__(self, P, idx, N, keep, h=H, band=BAND):
		tri = idx.reshape(-1, 3)
		tri = tri[keep[tri].all(1)]
		used = np.unique(tri)
		self.h = h
		lo, hi = P[used].min(0) - band - 2 * h, P[used].max(0) + band + 2 * h
		self.origin = lo
		self.dims = np.ceil((hi - lo) / h).astype(np.int64) + 1
		# vertex -> its triangles, padded
		order = np.argsort(tri.ravel(), kind='stable')
		owner = (order // 3)
		counts = np.bincount(tri.ravel(), minlength=len(P))
		start = np.concatenate([[0], np.cumsum(counts)])
		width = int(counts.max())
		ring = np.full((len(P), width), -1, np.int64)
		for k in range(width):
			has = counts > k
			ring[has, k] = owner[start[:-1][has] + k]
		ring[ring < 0] = np.broadcast_to(ring[:, :1], ring.shape)[ring < 0]
		# grid points within the band: the cells surface points fall in, grown by the band, then trimmed by distance to the nearest vertex
		tree = cKDTree(P[used])
		occ = np.zeros(self.dims, bool)
		samples = np.vstack([P[used], P[tri].mean(1), (P[tri] + P[tri][:, [1, 2, 0]]).reshape(-1, 3) / 2])  # vertices, triangle centres, edge midpoints
		c = np.floor((samples - lo) / h).astype(np.int64)
		occ[c[:, 0], c[:, 1], c[:, 2]] = True
		occ = binary_dilation(occ, structure=np.ones((3, 3, 3), bool), iterations=int(np.ceil(band / h)) + 1)
		keys = self.key(np.argwhere(occ).astype(np.int64))
		del occ
		g = self.node(keys)
		dist, near = tree.query(g, distance_upper_bound=band + 2 * h)
		ok = np.isfinite(dist)
		keys, g, near = keys[ok], g[ok], used[near[ok]]
		vals = np.empty(len(keys), np.float64)
		for s in range(0, len(keys), CHUNK):
			p, v = g[s:s + CHUNK], near[s:s + CHUNK]
			cand = tri[ring[v]]  # (n, width, 3)
			W = closest_points(p[:, None], P[cand[..., 0]], P[cand[..., 1]], P[cand[..., 2]])
			q = (W[..., None] * P[cand]).sum(-2)
			d2 = ((q - p[:, None]) ** 2).sum(-1)
			best = d2.argmin(1)
			r = np.arange(len(p))
			q, w, c = q[r, best], W[r, best], cand[r, best]
			n = (w[:, :, None] * N[c]).sum(1)  # the surface's own smooth normal at the closest point
			vals[s:s + CHUNK] = np.sign(((p - q) * n).sum(1) + 1e-15) * np.sqrt(d2[r, best])
		self.keys, self.vals = keys, vals
		print(f'    field: {len(keys)} grid points, {len(tri)} triangles, {h * 1000:.1f} mm grid, {band * 1000:.0f} mm band', flush=True)

	def key(self, ijk):
		ny, nz = self.dims[1], self.dims[2]
		return (ijk[..., 0] * ny + ijk[..., 1]) * nz + ijk[..., 2]

	def node(self, keys):
		ny, nz = self.dims[1], self.dims[2]
		return self.origin + np.stack([keys // (ny * nz), (keys // nz) % ny, keys % nz], -1) * self.h

	def __call__(self, x):
		"""Distance, its gradient, and whether all eight surrounding grid points exist (trilinear)."""
		g = (x - self.origin) / self.h
		i = np.floor(g).astype(np.int64)
		f = g - i
		d = np.zeros(len(x))
		grad = np.zeros((len(x), 3))
		inside = np.ones(len(x), bool)
		for c in range(8):
			o = np.array([(c >> 2) & 1, (c >> 1) & 1, c & 1])
			k = self.key(i + o)
			at = np.minimum(np.searchsorted(self.keys, k), len(self.keys) - 1)
			hit = self.keys[at] == k
			inside &= hit
			v = np.where(hit, self.vals[at], 0.0)
			wx = np.where(o, f, 1 - f)  # per axis weight
			sx = np.where(o, 1.0, -1.0)
			d += v * wx.prod(1)
			grad[:, 0] += v * sx[0] * wx[:, 1] * wx[:, 2]
			grad[:, 1] += v * sx[1] * wx[:, 0] * wx[:, 2]
			grad[:, 2] += v * sx[2] * wx[:, 0] * wx[:, 1]
		return d, grad / self.h, inside


class PartFields:
	"""One field per part, as wrap_block.Surface.parts: torso points see only the torso, sleeve points only the arm."""

	def __init__(self, P, idx, arm, h=H, band=BAND):
		tri = idx.reshape(-1, 3)
		e1, e2 = P[tri[:, 1]] - P[tri[:, 0]], P[tri[:, 2]] - P[tri[:, 0]]
		fn = np.cross(e1, e2)
		N = np.zeros_like(P)
		for k in range(3):
			np.add.at(N, tri[:, k], fn)
		N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-12
		self.torso = Field(P, idx, N, arm < 0.5, h, band)  # the same split as Surface.parts
		self.arm = Field(P, idx, N, arm > 0.15, h, band)

	def __call__(self, x, sleeve):
		d, g, ok = np.zeros(len(x)), np.zeros((len(x), 3)), np.ones(len(x), bool)
		for field, m in ((self.arm, sleeve), (self.torso, ~sleeve)):
			if m.any():
				d[m], g[m], ok[m] = field(x[m])
		return d, g, ok
