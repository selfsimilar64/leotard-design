"""Would a pattern maker accept this? Checks a block's derived pieces, or any outline the app makes from them.

A flaw in a pattern is rarely visible as an error anywhere else: the fit solves and the 3D looks fine. So every rule is here
as a number with a limit, and the script fails if one is broken.
    python pipeline/check_pattern.py [size ...]        (exit 1 on a failure)
Spec: knowledge/domain/construction/what-makes-a-pattern-true.md.
"""
import json
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
DERIVED = os.path.join(HERE, '..', 'assets', 'patterns', 'basicpatternblock-leotard-0005', 'derived')
SEAM_MM = 1.5      # sewn edges may differ by this much (more is a mistake, or deliberate ease to report)
FOLD_DEG = 6.0     # a line must meet a fold square, or mirrored it dips or peaks at the centre
JOIN_DEG = 12.0    # lines running across a sewn seam (neck, leg, armhole, hem) must carry on without a kink
WOBBLE_MM = 0.25   # an edge may not stray this far from its own smoothed self
LOOK_MM = 6.0      # how far along a line its direction is read


def arc(p):
	return np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(p, axis=0), axis=1))])


def at_length(p, d):
	s = arc(p)
	return np.array([np.interp(d, s, p[:, 0]), np.interp(d, s, p[:, 1])])


def direction(p, end):
	"""Unit direction of a line leaving one of its ends, read a few millimetres in, skipping the drawn corner's own 1.76 mm."""
	q = p if end == 0 else p[::-1]
	v = at_length(q, LOOK_MM) - at_length(q, 2.0)
	return v / (np.linalg.norm(v) or 1)


def wobble(p):
	"""Largest distance from a line to its moving average over 10 mm, away from its ends: jags and steps show, real curves do not."""
	s = arc(p)
	if s[-1] < 30:
		return 0.0
	t = np.arange(5, s[-1] - 5, 0.5)
	q = np.stack([np.interp(t, s, p[:, i]) for i in range(2)], axis=1)
	k = 21
	c = np.stack([np.convolve(q[:, i], np.ones(k) / k, mode='valid') for i in range(2)], axis=1)
	d = q[k // 2:-(k // 2)] - c
	# remove what a smooth curve leaves anyway: the second difference of a wide average
	wide = np.stack([np.convolve(c[:, i], np.ones(k) / k, mode='valid') for i in range(2)], axis=1)
	return float(np.max(np.linalg.norm(d[k // 2:-(k // 2)] - (c[k // 2:-(k // 2)] - wide), axis=1))) if len(wide) else 0.0


def angle(u, v):
	return math.degrees(math.acos(max(-1.0, min(1.0, float(u @ v)))))


def check(block):
	P = {k: {e: np.array(r, float) for e, r in v['edges'].items()} for k, v in block['pieces'].items()}
	L = {(k, e): float(arc(r)[-1]) for k, v in P.items() for e, r in v.items()}
	rows = []

	def add(rule, name, value, limit, unit):
		rows.append((rule, name, value, limit, unit, value <= limit))

	for a, x, b, y in block['seams']:
		add('seam lengths', f'{a}.{x} / {b}.{y}', abs(L[a, x] - L[b, y]), SEAM_MM, 'mm')
	for piece in ('front', 'back'):
		E = P[piece]
		for edge in ('neck', 'crotch'):
			r = E[edge]
			fold_end = 0 if abs(r[0, 0]) < abs(r[-1, 0]) else -1
			d = direction(r, fold_end)
			add('square at the fold', f'{piece}.{edge}', abs(math.degrees(math.atan2(d[1], abs(d[0])))), FOLD_DEG, 'deg')
		high = np.array(block['pieces'][piece]['variants']['high_hips']['leg'], float)
		E['leg_high'] = high

	def join(name, a, b):
		"""Two pieces laid edge to edge: a and b are (line, its end at the seam, the seam line, its end at that point)."""
		(l1, e1, s1, g1), (l2, e2, s2, g2) = a, b
		# measure each line against its seam, and compare: sewn, the seam's two sides lie together
		u1, t1 = direction(l1, e1), direction(s1, g1)
		u2, t2 = direction(l2, e2), direction(s2, g2)
		a1 = math.degrees(math.atan2(t1[0] * u1[1] - t1[1] * u1[0], t1 @ u1))
		a2 = math.degrees(math.atan2(t2[0] * u2[1] - t2[1] * u2[0], t2 @ u2))
		add('smooth across a seam', name, abs(abs(a1) + abs(a2) - 180), JOIN_DEG, 'deg')

	F, B, S = P['front'], P['back'], P['sleeve']
	def end_near(r, q):
		return 0 if np.linalg.norm(r[0] - q) < np.linalg.norm(r[-1] - q) else -1
	def pair(piece, line, seam):
		E = P[piece]
		l, s = E[line], E[seam]
		d = [(np.linalg.norm(l[i] - s[j]), i, j) for i in (0, -1) for j in (0, -1)]
		_, i, j = min(d)
		return (l, i, s, j)
	join('neck over the shoulder', pair('front', 'neck', 'shoulder'), pair('back', 'neck', 'shoulder'))
	join('leg over the side (thigh)', pair('front', 'leg', 'side'), pair('back', 'leg', 'side'))
	join('leg over the crotch (thigh)', pair('front', 'leg', 'crotch'), pair('back', 'leg', 'crotch'))
	join('high leg over the crotch', pair('front', 'leg_high', 'crotch'), pair('back', 'leg_high', 'crotch'))
	# a high leg meets the side part way down: both pieces must arrive at the same place on it
	hf, hb = block['pieces']['front']['variants']['high_hips'], block['pieces']['back']['variants']['high_hips']
	add('high leg meets the side level', 'front / back', abs(hf['side_to'] - hb['side_to']), SEAM_MM, 'mm')
	angles = []
	for piece, H in (('front', hf), ('back', hb)):
		leg = np.array(H['leg'], float)
		side = P[piece]['side']
		s = arc(side)
		a_, b_ = at_length(side, H['side_to']), at_length(side, H['side_to'] - 4)
		t = (b_ - a_) / np.linalg.norm(b_ - a_)
		u = direction(leg, 0)
		angles.append(abs(math.degrees(math.atan2(t[0] * u[1] - t[1] * u[0], t @ u))))
	add('smooth across a seam', 'high leg over the side', abs(sum(angles) - 180), JOIN_DEG, 'deg')
	for name, E in P.items():
		for e, r in E.items():
			add('no wobble', f'{name}.{e}', wobble(r), WOBBLE_MM, 'mm')
	return rows


def corners_of(line, reach=4.0, sharp=20.0):
	"""Places a closed outline (mm) really turns: the turn over a few millimetres either side, counted once per corner."""
	closed = np.vstack([line, line[0]])
	s = arc(closed)
	total = s[-1]
	t = np.arange(0, total, 0.5)
	q = np.stack([np.interp(t, s, closed[:, i]) for i in range(2)], axis=1)
	k = int(reach / 0.5)
	u, v = q - np.roll(q, k, axis=0), np.roll(q, -k, axis=0) - q
	turn = np.degrees(np.abs(np.arctan2(u[:, 0] * v[:, 1] - u[:, 1] * v[:, 0], (u * v).sum(1))))
	found, i, n = [], 0, len(q)
	hot = turn > sharp
	start = int(np.argmin(hot)) if hot.any() and not hot.all() else 0
	while i < n:
		j = (start + i) % n
		if hot[j]:
			run = []
			while i < n and hot[(start + i) % n]:
				run.append((start + i) % n)
				i += 1
			best = max(run, key=lambda r: turn[r])
			found.append((q[best], float(turn[best])))
		else:
			i += 1
	return found


def on_line(points, line):
	"""Largest distance from points to a closed polyline."""
	a = line
	b = np.roll(line, -1, axis=0)
	d = b - a
	l2 = (d * d).sum(1) + 1e-12
	worst = 0.0
	for p in points:
		t = np.clip(((p - a) * d).sum(1) / l2, 0, 1)
		worst = max(worst, float(np.min(np.linalg.norm(a + d * t[:, None] - p, axis=1))))
	return worst


def check_design(path):
	"""A design's pieces as the app shows and prints them: the outline has only the corners a pattern should, the mesh lies on it."""
	with open(path, encoding='utf-8') as f:
		data = json.load(f)
	rows, seen = [], set()
	expected = {'front': 10, 'back': 10, 'sleeve-a': 4, 'sleeve-b': 4}
	for c in data['cells']:
		line = np.array(c['outline'], float) * 1000
		piece = c['piece']
		uv = np.array(c['uv'], float).reshape(-1, 2) * 1000
		I = np.array(c['I']).reshape(-1, 3)
		from collections import Counter
		count = Counter(tuple(sorted(e)) for t in I for e in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])))
		rim = np.array(sorted({v for e, n in count.items() if n == 1 for v in e}))
		# (a halved piece's fold is inside the whole piece's outline)
		edge = uv[rim] if piece not in ('front', 'back') else uv[rim][np.abs(uv[rim][:, 0]) > 0.5]
		off = on_line(edge, line)
		rows.append(('mesh on the outline', f'{piece}/{c["half"]}', off, 0.3, 'mm', off <= 0.3))
		if piece in seen:
			continue
		seen.add(piece)
		corners = corners_of(line)
		n = len(corners)
		rows.append(('expected corners', piece, abs(n - expected[piece]), 0, f'off ({n} found)', n == expected[piece]))
		if piece in ('front', 'back'):
			fold = [q for q, _ in corners if abs(q[0]) < 3]
			rows.append(('no corner at the fold', piece, len(fold), 0, 'corners', not fold))
	return rows


def main():
	sizes = sys.argv[1:] or ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL']
	bad = 0
	for size in sizes:
		with open(os.path.join(DERIVED, size + '.json'), encoding='utf-8') as f:
			rows = check(json.load(f))
		fails = [r for r in rows if not r[5]]
		bad += len(fails)
		print(f'{size}: {len(rows) - len(fails)} of {len(rows)} pass')
		for rule, name, value, limit, unit, _ in fails:
			print(f'   FAIL {rule:28} {name:32} {value:7.2f} {unit} (limit {limit})')
	captures = os.path.join(HERE, '..', 'app', 'captures')
	for name in sorted(os.listdir(captures)):
		if name.startswith('wrap-') and name.endswith('.json') and ('resolved' in name or name.endswith('-block.json')):
			rows = check_design(os.path.join(captures, name))
			fails = [r for r in rows if not r[5]]
			bad += len(fails)
			print(f'{name}: {len(rows) - len(fails)} of {len(rows)} pass')
			for rule, piece, value, limit, unit, _ in fails:
				print(f'   FAIL {rule:28} {piece:32} {value:7.2f} {unit} (limit {limit})')
	sys.exit(1 if bad else 0)


if __name__ == '__main__':
	main()
