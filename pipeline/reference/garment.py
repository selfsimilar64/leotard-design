"""The young body's high-cut leotard as a whole garment, plus the fit measures every run is judged by.

Read-only with respect to our solver: everything comes from the files our solver wrote (the resolved
cells: flat uv, triangles, host triangles, welded ids), so the mesh and the flat point of every vertex are
the same as ours, and a displacement is "this flat point here against this flat point there".

Twins, deliberately not imported (wrap_block.py is being edited by others and imports are not stable):
  - the crotch height and half-width-at-level idea: pipeline/compare_fit.py main(). Same crotch formula.
  - the band limits in BANDS: pipeline/wrap_block.py report().
  - the "high" cut lines: wrap_block.py design(), read back from the block's variants.high_hips.
"""
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ELASTIC = {('Front', 'leg'): 1.0, ('Back', 'leg'): 0.75, ('Front', 'neck'): 0.95, ('Back', 'neck'): 0.95, ('Sleeve', 'wrist'): 0.95}  # the task's ratios; also wrap_block.py ELASTIC
BANDS = {'waist': (0.98, 1.06), 'hip': (0.84, 0.92)}  # wrap_block.py report()
LEVELS_CM = (2, 4, 7, 10, 14)  # compare_fit.py


def _json(path):
	with open(path, encoding='utf-8') as f:
		return json.load(f)


def raw_skin():
	"""The plain body: the young a-pose cage through the same Catmull-Clark stencil the app uses (mannequin.js restOf). Same vertex order as wrap-body."""
	sys.path.insert(0, os.path.join(ROOT, 'pipeline'))
	from g9 import cc_stencil  # read-only use; twin of app/src/body/subdivide.js
	base = os.path.join(ROOT, 'app', 'public', 'g9')
	man = _json(os.path.join(base, 'manifest.json'))
	topo = open(os.path.join(base, 'topology.bin'), 'rb').read()
	T = man['topology']
	sizes = np.frombuffer(topo, np.uint8 if T['cage']['sizes']['count'] * 4 > T['cage']['ids']['offset'] else np.uint32, T['cage']['sizes']['count'], T['cage']['sizes']['offset'])
	ids = np.frombuffer(topo, np.uint32, T['cage']['ids']['count'], T['cage']['ids']['offset'])
	faces, at = [], 0
	for s in sizes.tolist():
		faces.append(ids[at:at + s].tolist())
		at += s
	cage = np.fromfile(os.path.join(base, 'bodies', 'young', 'a-pose.bin'), np.float32).reshape(-1, 3)
	out = cc_stencil(man['cage'], faces)
	S = out[0]
	return np.asarray(S @ cage.astype(np.float64))


def _free_edges(I):
	n = {}
	for t in I:
		for k in range(3):
			a, b = int(t[k]), int(t[(k + 1) % 3])
			e = (min(a, b), max(a, b))
			n[e] = n.get(e, 0) + 1
	return [e for e, c in n.items() if c == 1]


def _dist_to_poly(p, poly):
	"""Distance of each point in p to a polyline."""
	a, b = poly[:-1], poly[1:]
	ab = b - a
	t = ((p[:, None] - a[None]) * ab[None]).sum(-1) / ((ab * ab).sum(-1) + 1e-18)
	t = np.clip(t, 0, 1)
	q = a[None] + t[..., None] * ab[None]
	return np.linalg.norm(p[:, None] - q, axis=-1).min(1)


def _chain(edges):
	"""Free edges of one line as an ordered path of vertex ids."""
	nb = {}
	for a, b in edges:
		nb.setdefault(a, []).append(b)
		nb.setdefault(b, []).append(a)
	ends = [v for v, l in nb.items() if len(l) == 1]
	if not ends:
		raise ValueError('closed or empty chain')
	path, prev = [ends[0]], None
	while True:
		nxt = [v for v in nb[path[-1]] if v != prev]
		if not nxt:
			break
		prev = path[-1]
		path.append(nxt[0])
	if len(path) != len(nb):
		raise ValueError(f'chain broken: {len(path)} of {len(nb)}')
	return path


class Garment:
	"""The whole garment. Vertex ids: half 0 welded ids as written by our solver; half 1 the same plus an offset, fold points shared."""

	def __init__(self, inputs_dir):
		self.block = _json(os.path.join(inputs_dir, 'body-young.json'))
		self.body = _json(os.path.join(inputs_dir, 'wrap-body-young.json'))
		fit = _json(os.path.join(inputs_dir, 'wrap-body-young-high-resolved.json'))
		self.G = np.array(self.body['P'], float).reshape(-1, 3)
		self.body_idx = np.array(self.body['idx'], int)
		self.landmarks = self.body['refLm']
		cells = fit['cells']
		half0 = [c for c in cells if c['half'] == 0]
		nw = 1 + max(max(c['wid']) for c in half0)
		# a fold point is one that sits on x = 0 in the flat front or back
		on_fold = np.zeros(nw, bool)
		for c in half0:
			if c['name'] in ('Front', 'Back'):
				uv = np.array(c['uv']).reshape(-1, 2)
				on_fold[np.array(c['wid'])[np.abs(uv[:, 0]) < 1e-5]] = True
		other = np.arange(nw) + nw
		other[on_fold] = np.where(on_fold)[0]
		self.fold_count = int(on_fold.sum())

		tris, puv, ptris, tag, half, x_sum, x_n, lines = [], [], [], [], [], np.zeros((2 * nw, 3)), np.zeros(2 * nw), []
		offset = 0
		for c in cells:
			wid = np.array(c['wid'])
			ids = wid if c['half'] == 0 else other[wid]
			uv = np.array(c['uv']).reshape(-1, 2)
			I = np.array(c['I']).reshape(-1, 3)
			hi, hw = np.array(c['hostI']).reshape(-1, 3), np.array(c['hostW']).reshape(-1, 3)
			q = (self.G[hi] * hw[:, :, None]).sum(1)
			np.add.at(x_sum, ids, q)
			np.add.at(x_n, ids, 1)
			# the solver needs flat triangles of positive area with the 3D winding kept (outward on every cell). Mirroring
			# a whole flat piece changes neither |Fu|, |Fv| nor the sign-free shear energy, and keeps u = across, v = along.
			a = uv[I]
			area = 0.5 * ((a[:, 1, 0] - a[:, 0, 0]) * (a[:, 2, 1] - a[:, 0, 1]) - (a[:, 2, 0] - a[:, 0, 0]) * (a[:, 1, 1] - a[:, 0, 1]))
			if not ((area > 0).all() or (area < 0).all()):
				raise ValueError(f'{c["name"]} half {c["half"]}: flat triangles of mixed orientation')
			flat = uv * (np.array([1.0, 1.0]) if area[0] > 0 else np.array([-1.0, 1.0]))
			tris.append(ids[I])
			ptris.append(I + offset)
			puv.append(flat)
			offset += len(uv)
			tag += [c['name']] * len(I)
			half += [c['half']] * len(I)
			# the opening lines of this cell, in the block's frame (the second half's flat is mirrored)
			frame = uv * np.array([1.0 if c['half'] == 0 else -1.0, 1.0]) * 1000
			free = _free_edges(I)
			mids = 0.5 * (frame[[e[0] for e in free]] + frame[[e[1] for e in free]])
			piece = self.block['pieces'][c['name'].lower()]
			want = {'Front': ('leg', 'neck'), 'Back': ('leg', 'neck'), 'Sleeve': ('wrist',)}[c['name']]
			for line in want:
				poly = np.array(piece['variants']['high_hips']['leg'] if line == 'leg' else piece['edges'][line], float)
				near = _dist_to_poly(mids, poly) < 0.6
				path = _chain([e for e, m in zip(free, near) if m])
				flat_len = np.linalg.norm(np.diff(frame[path], axis=0), axis=1)
				lines.append({'piece': c['name'], 'line': line, 'half': c['half'], 'ids': ids[path], 'flat': flat_len / 1000, 'ratio': ELASTIC[(c['name'], line)], 'block_mm': float(np.linalg.norm(np.diff(poly, axis=0), axis=1).sum())})
		used = np.where(x_n > 0)[0]
		remap = -np.ones(2 * nw, int)
		remap[used] = np.arange(len(used))
		self.x_ours = x_sum[used] / x_n[used][:, None]
		self.tris = remap[np.vstack(tris)]
		self.panel_tris = np.vstack(ptris)
		self.panel_uv = np.vstack(puv)
		self.tag = np.array(tag)
		self.half = np.array(half)
		self.lines = [dict(l, ids=remap[l['ids']]) for l in lines]
		self.n = len(used)
		a = self.panel_uv[self.panel_tris]
		self.area = 0.5 * ((a[:, 1, 0] - a[:, 0, 0]) * (a[:, 2, 1] - a[:, 0, 1]) - (a[:, 2, 0] - a[:, 0, 0]) * (a[:, 1, 1] - a[:, 0, 1]))
		self.Dm_inv = np.linalg.inv(np.stack([a[:, 1] - a[:, 0], a[:, 2] - a[:, 0]], axis=2))
		# per vertex, which piece holds it (a seam vertex: the piece seen first)
		self.vtag = np.array([''] * self.n, dtype=object)
		for name in ('Sleeve', 'Back', 'Front'):
			self.vtag[np.unique(self.tris[self.tag == name])] = name
		# the crotch height as compare_fit.py computes it, on the garment surface
		centre = self.G[np.abs(self.G[:, 0]) < 0.002]
		self.crotch = float(np.min(centre[np.abs(centre[:, 2] - np.median(centre[:, 2])) < 0.08, 1]))
		self._fix_regions()

	def spans(self, ep_scale=1.0):
		"""Every span of elastic: (i, j, flat length, ratio)."""
		out = []
		for l in self.lines:
			for a, b, f in zip(l['ids'][:-1], l['ids'][1:], l['flat']):
				out.append((int(a), int(b), float(f), l['ratio']))
		return out

	def _fix_regions(self):
		"""Regions are chosen once, on our solver's result, then stay the same flat triangles and points in every run."""
		x = self.x_ours
		c = x[self.tris].mean(1)
		y = c[:, 1]
		t = self.tag
		ctr = self.crotch
		wl, wh = BANDS['waist']
		hl, hh = BANDS['hip']
		self.tri_regions = {
			'back waist': (t == 'Back') & (y > wl) & (y < wh),
			'back waist centre': (t == 'Back') & (y > wl) & (y < wh) & (np.abs(c[:, 0]) < 0.05),
			'front waist': (t == 'Front') & (y > wl) & (y < wh),
			'hip front': (t == 'Front') & (y > hl) & (y < hh),
			'hip back': (t == 'Back') & (y > hl) & (y < hh),
			'seat': (t == 'Back') & (y > ctr + 0.03) & (y < ctr + 0.13) & (np.abs(c[:, 0]) > 0.015),
		}
		vx = x[:, 0]
		vy = x[:, 1]
		back, front = self.vtag == 'Back', self.vtag == 'Front'
		self.vert_regions = {
			'small of back': back & (np.abs(vx) < 0.03) & (vy > wl) & (vy < wh),
			'seat cleft': back & (np.abs(vx) < 0.015) & (vy > ctr + 0.02) & (vy < ctr + 0.14),
			'crotch': (back | front) & (np.abs(vx) < 0.025) & (vy < ctr + 0.025),
			'front waist': front & (np.abs(vx) < 0.05) & (vy > wl) & (vy < wh),
			'whole garment': np.ones(self.n, bool),
		}

	def stretch(self, x):
		"""Per triangle: stretch across (flat x) and along (flat y)."""
		p = x[self.tris]
		Ds = np.stack([p[:, 1] - p[:, 0], p[:, 2] - p[:, 0]], axis=2)
		F = Ds @ self.Dm_inv
		return np.linalg.norm(F[:, :, 0], axis=1), np.linalg.norm(F[:, :, 1], axis=1)

	def edge_lengths(self, x):
		"""Stretched length over flat length, each opening."""
		return [(l['piece'], l['line'], l['half'], float(np.linalg.norm(np.diff(x[l['ids']], axis=0), axis=1).sum() / l['flat'].sum())) for l in self.lines]

	def half_width(self, x, piece, level):
		"""Half width of the leg opening at a height: the crossing furthest from the centre, mean of the two sides, and their difference."""
		out = []
		for l in self.lines:
			if l['line'] != 'leg' or l['piece'] != piece:
				continue
			p = x[l['ids']]
			y = p[:, 1] - level
			cross = np.where(y[:-1] * y[1:] <= 0)[0]
			if len(cross) == 0:
				out.append(np.nan)
				continue
			t = y[cross] / (y[cross] - y[cross + 1] + 1e-15)
			out.append(float(np.abs(p[cross, 0] + t * (p[cross + 1, 0] - p[cross, 0])).max()))
		return float(np.nanmean(out)) if not np.all(np.isnan(out)) else float('nan'), float(abs(out[0] - out[1]))

	def measures(self, x, dist_raw, dist_lifted, reference=None):
		"""All fit measures of one state, in mm and stretch ratios."""
		m = {}
		for name, base in (('vs_ours', self.x_ours), ('vs_ref', reference)):
			if base is None:
				continue
			d = np.linalg.norm(x - base, axis=1) * 1000
			m[name] = {'mean': float(d.mean()), 'p95': float(np.percentile(d, 95)), 'max': float(d.max())}
		legs = {}
		for piece in ('Back', 'Front'):
			e = {}
			for h in LEVELS_CM:
				w, asym = self.half_width(x, piece, self.crotch + h / 100)
				e[f'w{h}'] = w * 1000
				e[f'asym{h}'] = asym * 1000
			lows = [float(x[l['ids'], 1].min()) for l in self.lines if l['line'] == 'leg' and l['piece'] == piece]
			e['lowest'] = (np.mean(lows) - self.crotch) * 1000
			e['lowest_asym'] = abs(lows[0] - lows[1]) * 1000
			legs[piece] = e
		m['leg'] = legs
		across, along = self.stretch(x)
		m['stretch'] = {k: {'across': float(across[r].mean()), 'along': float(along[r].mean())} for k, r in self.tri_regions.items()}
		m['stretch_range'] = {'across_p1': float(np.percentile(across, 1)), 'across_p99': float(np.percentile(across, 99)), 'along_p1': float(np.percentile(along, 1)), 'along_p99': float(np.percentile(along, 99))}
		m['openings'] = {f'{p} {l}': v for p, l, h, v in self.edge_lengths(x) if h == 0}
		lift = {}
		for k, r in self.vert_regions.items():
			lift[k] = {'skin_mean': float(dist_raw[r].mean() * 1000), 'skin_p95': float(np.percentile(dist_raw[r], 95) * 1000), 'skin_max': float(dist_raw[r].max() * 1000), 'lifted_mean': float(dist_lifted[r].mean() * 1000), 'lifted_p95': float(np.percentile(dist_lifted[r], 95) * 1000)}
		m['lift'] = lift
		m['penetration'] = {'skin_min_mm': float(dist_raw.min() * 1000), 'skin_below_0p5mm': int((dist_raw < -0.0005).sum()), 'lifted_min_mm': float(dist_lifted.min() * 1000), 'lifted_below_0p5mm': int((dist_lifted < -0.0005).sum())}
		return m


if __name__ == '__main__':
	g = Garment(sys.argv[1])
	print('vertices', g.n, 'triangles', len(g.tris), 'fold points', g.fold_count)
	print('crotch y', g.crotch, 'flat area m2', g.area.sum())
	for l in g.lines:
		print(l['piece'], l['line'], l['half'], 'points', len(l['ids']), 'flat mm', round(l['flat'].sum() * 1000, 1), 'block mm', round(l['block_mm'], 1), 'ratio', l['ratio'])
	for k, r in g.tri_regions.items():
		print('tri region', k, int(r.sum()))
	for k, r in g.vert_regions.items():
		print('vert region', k, int(r.sum()))
	print('ours: half widths back', [round(g.half_width(g.x_ours, 'Back', g.crotch + h / 100)[0] * 1000, 1) for h in LEVELS_CM])
	print('ours: half widths front', [round(g.half_width(g.x_ours, 'Front', g.crotch + h / 100)[0] * 1000, 1) for h in LEVELS_CM])
	across, along = g.stretch(g.x_ours)
	for k, r in g.tri_regions.items():
		print(k, 'across', round(across[r].mean(), 3), 'along', round(along[r].mean(), 3))
	R = raw_skin()
	d = np.linalg.norm(R - g.G, axis=1) * 1000
	print('raw vs lifted surface, per vertex mm: mean', d.mean().round(2), '95%', np.percentile(d, 95).round(2), 'max', d.max().round(2), 'unchanged (<0.05 mm)', float((d < 0.05).mean()).__round__(3))
	np.save(os.path.join(sys.argv[1], 'raw_skin.npy'), R)
