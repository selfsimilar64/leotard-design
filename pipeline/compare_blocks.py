"""Compare drafted blocks' flat front and back pieces with the purchased block, by shape (knowledge: block-shape-comparison).

Every block is laid as the drafters lay it: the fold on x = 0, the crotch at y = 0, mm, stitching lines. Two measures per piece:
- true size: mean distance between the outlines (each way, averaged), the fold itself left out;
- shape only: the candidate stretched in x and y to the purchased piece's width and height first, so size and ease drop out and
  only the drawing is compared.
Also per region (neck/shoulder/armhole, side seam, leg/crotch) in shape-only terms, and a few plain dimensions.

    python pipeline/compare_blocks.py [reference size] [block ...]   writes app/captures/block-shape-compare.png and .json
Defaults: reference XS (the `young` body's size), blocks armstrong-6 body-young aldrich-6 aldrich-12 richardson-M.
"""
import json
import os
import sys

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from scipy.spatial import cKDTree

HERE = os.path.dirname(os.path.abspath(__file__))
BLOCKS = os.path.join(HERE, '..', 'assets', 'blocks')
DERIVED = os.path.join(HERE, '..', 'assets', 'patterns', 'basicpatternblock-leotard-0005', 'derived')
OUT = os.path.join(HERE, '..', 'app', 'captures')
REGIONS = {'top': ('neck', 'shoulder', 'armhole'), 'side': ('side',), 'leg': ('leg', 'crotch')}
NAMES = {'armstrong-6': 'Armstrong (size 6)', 'body-young': 'Our drafter (purchased proportions)', 'aldrich-6': 'Aldrich bodyshaper (6)',
	'aldrich-12': 'Aldrich bodyshaper (12)', 'richardson-M': 'Richardson leotard (M)', 'hybrid-6': 'Hybrid (Armstrong 6, seam forward)'}


def load(path, cut='standard'):
	"""A block's front and back edges; cut='high' takes the purchased block's high-cut leg (its side cut where that leg leaves it)."""
	with open(path, encoding='utf-8') as f:
		b = json.load(f)
	out = {}
	for n in ('front', 'back'):
		E = {k: np.asarray(v, float) for k, v in b['pieces'][n]['edges'].items()}
		if cut == 'high':
			H = b['pieces'][n]['variants']['high_hips']
			side = dense(E['side'], 0.5)
			s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(side, axis=0), axis=1))])
			E['side'] = side[s <= H['side_to']]
			E['leg'] = np.asarray(H['leg'], float)
		out[n] = E
	return out


def dense(e, step=1.0):
	s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(e, axis=0), axis=1))])
	t = np.arange(0, s[-1] + 1e-9, step)
	return np.column_stack([np.interp(t, s, e[:, 0]), np.interp(t, s, e[:, 1])])


def pts(E, keys=None):
	keys = keys or [k for k in E if k != 'centre']
	return np.vstack([dense(E[k]) for k in keys if k in E])


def box(E):
	p = pts(E)
	return p[:, 0].max(), p[:, 1].max() - p[:, 1].min()


def chamfer(a, b):
	return 0.5 * (cKDTree(b).query(a)[0].mean() + cKDTree(a).query(b)[0].mean())


def compare(ref, cand):
	out = {}
	for piece in ('front', 'back'):
		R, C = ref[piece], cand[piece]
		rw, rh = box(R)
		cw, ch = box(C)
		y0r, y0c = pts(R)[:, 1].min(), pts(C)[:, 1].min()
		scale = lambda E, y0, sx, sy: {k: np.column_stack([v[:, 0] * sx, (v[:, 1] - y0) * sy]) for k, v in E.items()}
		Rn, Cn = scale(R, y0r, 1, 1), scale(C, y0c, rw / cw, rh / ch)
		row = {'true_mm': chamfer(pts(R), pts(C)), 'shape_mm': chamfer(pts(Rn), pts(Cn)),
			'width_mm': cw, 'height_mm': ch, 'ref_width_mm': rw, 'ref_height_mm': rh}
		for reg, keys in REGIONS.items():
			row[f'shape_{reg}_mm'] = cKDTree(pts(Rn, keys)).query(pts(Cn, keys))[0].mean()
		side = C['side']
		row['leg_leaves_side_at'] = float((side[:, 1].min() - y0c) / ch)  # share of the height
		out[piece] = row
	return out


def main():
	args = sys.argv[1:]
	ref_size = args[0] if args else 'XS'
	names = args[1:] or ['armstrong-6', 'body-young', 'aldrich-6', 'aldrich-12', 'richardson-M']
	refs = {'standard': load(os.path.join(DERIVED, ref_size + '.json')), 'high': load(os.path.join(DERIVED, ref_size + '.json'), 'high')}
	res = {}
	fig, axes = plt.subplots(2, len(names), figsize=(3.6 * len(names), 12))
	for j, n in enumerate(names):
		cand = load(os.path.join(BLOCKS, n + '.json'))
		both = {c: compare(refs[c], cand) for c in refs}
		# each piece against the purchased leg it is nearer: the textbooks draw high legs, the purchased block offers both
		res[n] = {}
		for piece in ('front', 'back'):
			c = min(both, key=lambda c: both[c][piece]['shape_mm'])
			res[n][piece] = dict(both[c][piece], ref_cut=c)
		for i, piece in enumerate(('front', 'back')):
			ref = refs[res[n][piece]['ref_cut']]
			ax = axes[i, j]
			for E, col, lw in ((ref[piece], '#222222', 2.2), (cand[piece], '#d0342c', 1.4)):
				for k, e in E.items():
					ax.plot(e[:, 0], e[:, 1] - pts(E)[:, 1].min(), color=col, lw=lw)
			r = res[n][piece]
			ax.set_title(f"{NAMES.get(n, n)}\n{piece} vs {r['ref_cut']} leg: shape {r['shape_mm']:.0f} mm, true size {r['true_mm']:.0f} mm", fontsize=9)
			ax.set_aspect('equal')
			ax.grid(alpha=.25)
			ax.set_xlim(-10, 260)
			ax.set_ylim(-10, 860)
	fig.suptitle(f'Black: purchased block {ref_size}. Red: drafted block. Fold on the left, crotch at the bottom (mm).', fontsize=11)
	plt.tight_layout()
	os.makedirs(OUT, exist_ok=True)
	fig.savefig(os.path.join(OUT, 'block-shape-compare.png'), dpi=80)
	with open(os.path.join(OUT, 'block-shape-compare.json'), 'w', encoding='utf-8') as f:
		json.dump(res, f, indent=1)
	print(f"{'block':16} {'piece':6} {'vs':8} {'shape':>6} {'top':>5} {'side':>5} {'leg':>5} {'true':>6} {'w':>5} {'h':>5} {'legside':>7}")
	for n, r in res.items():
		for piece, x in r.items():
			print(f"{n:16} {piece:6} {x['ref_cut']:8} {x['shape_mm']:6.1f} {x['shape_top_mm']:5.1f} {x['shape_side_mm']:5.1f} {x['shape_leg_mm']:5.1f} {x['true_mm']:6.1f} {x['width_mm']:5.0f} {x['height_mm']:5.0f} {x['leg_leaves_side_at']:7.2f}")
	ref = refs['standard']
	for piece in ('front', 'back'):
		R = ref[piece]
		w, h = box(R)
		print(f"reference {ref_size} {piece}: width {w:.0f} height {h:.0f} leg leaves side at {(R['side'][:, 1].min() - pts(R)[:, 1].min()) / h:.2f}")


if __name__ == '__main__':
	main()
