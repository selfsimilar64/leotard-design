"""Read a purchased pattern block's PDF into named pieces and edges, one JSON per size.

The block's PDF has a layer per size and true-scale vector lines. Output goes beside the licensed
files, which stay out of git. Spec: knowledge/domain/construction/basicpatternblock-leotard-block.md.

Needs PyMuPDF (pip install pymupdf).
    python pipeline/extract_block.py [--check]

Each piece: millimetres, x from the fold (or the sleeve's cap top), y up with 0 at the piece's lowest
point. Most sizes draw each edge as its own path, XXS and 3XL draw one outline; both are chained into
one closed loop and split at its sharpest corners, so every size comes out the same way.
"""
import json
import math
import os
import sys

import pymupdf

ROOT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'patterns', 'basicpatternblock-leotard-0005')
PDF = os.path.join(ROOT, 'A0-PRINT_BODYSUIT_0005.pdf')
OUT = os.path.join(ROOT, 'derived')
SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL']
MM = 25.4 / 72
SHEET = 810.0  # sheet A-2 starts this far to the right of A-1 (the sleeve crosses them)
JOIN = 10.0  # mm; drawn edges stop short of their corners by up to about 8 (the sleeve's wrist)
BEZIER = 32

# Edges in order round each loop, starting at the top of the fold (or the sleeve's cap, front side).
EDGES = {
	'front': ['neck', 'shoulder', 'armhole', 'side', 'leg', 'crotch', 'centre'],
	'back': ['neck', 'shoulder', 'armhole', 'side', 'leg', 'crotch', 'centre'],
	'sleeve': ['cap', 'underarm_b', 'wrist', 'underarm_f'],
}
# What sews to what: [piece, edge, piece, edge]. A sleeve is cut twice; the cap takes both armholes.
SEAMS = [
	['front', 'shoulder', 'back', 'shoulder'],
	['front', 'side', 'back', 'side'],
	['front', 'crotch', 'back', 'crotch'],
	['sleeve', 'underarm_f', 'sleeve', 'underarm_b'],
]


def flatten(items):
	"""A PyMuPDF path's items -> polylines in mm on the sheet."""
	subs, cur = [], []
	for it in items:
		if it[0] == 'l':
			pts = [pymupdf.Point(it[1]), pymupdf.Point(it[2])]
		elif it[0] == 'c':
			p = [pymupdf.Point(it[i]) for i in range(1, 5)]
			pts = []
			for i in range(BEZIER + 1):
				t = i / BEZIER
				pts.append(p[0] * (1 - t) ** 3 + p[1] * 3 * t * (1 - t) ** 2 + p[2] * 3 * t * t * (1 - t) + p[3] * t ** 3)
		else:
			continue
		pts = [(q.x * MM, q.y * MM) for q in pts]
		if cur and math.dist(cur[-1], pts[0]) < 0.02:
			cur += pts[1:]
		else:
			if cur:
				subs.append(cur)
			cur = pts
	if cur:
		subs.append(cur)
	return subs


def length(p):
	return sum(math.dist(a, b) for a, b in zip(p, p[1:]))


def bbox(p):
	xs, ys = zip(*p)
	return min(xs), min(ys), max(xs), max(ys)


def read_layer(doc, size):
	"""All distinct polylines of a size, on A-1's coordinates."""
	out = []
	for page, dx in ((doc[0], 0.0), (doc[1], SHEET)):
		for d in page.get_drawings(extended=True):
			if d.get('layer') != size or not d.get('items') or d.get('type') == 'clip':
				continue
			for sub in flatten(d['items']):
				sub = [(x + dx, y) for x, y in sub]
				# the second sheet repeats whatever crosses onto it
				same = any(abs(length(p) - length(sub)) < 0.5 and math.dist(p[0], sub[0]) < 2 and math.dist(p[-1], sub[-1]) < 2 for p in out)
				if not same:
					out.append(sub)
	return out


def classify(paths):
	"""Sort a size's paths into the loops' lines and the extra lines marked on the pieces."""
	lines, high, level, hem, marks = [], [], [], [], []
	for p in paths:
		L, (x0, y0, x1, y1) = length(p), bbox(p)
		if L < 5:
			marks.append(p)
		elif L < 8:
			continue
		elif 555 < y0 < 600 and y1 - y0 > 150 and x1 < 640:
			high.append(p)  # a leg line that starts part way down the side seam
		elif y1 - y0 < 1 and x1 - x0 > 100 and y0 < 400 and x0 < 60:
			level.append(p)  # a level line on the Front only
		elif y1 - y0 < 20 and x1 - x0 > 150 and 195 < y0 < 225:
			hem.append(p)  # the short sleeve's hem
		else:
			lines.append(p)
	return lines, high, level, hem, marks


def chain(lines):
	"""Closed loops from lines that meet end to end."""
	rest, loops = [list(p) for p in lines], []
	while rest:
		loop = rest.pop(0)
		while rest and math.dist(loop[0], loop[-1]) > 0.02:
			best, bd, flip = None, JOIN, False
			for i, p in enumerate(rest):
				for f, q in ((False, p[0]), (True, p[-1])):
					d = math.dist(loop[-1], q)
					if d < bd:
						best, bd, flip = i, d, f
			if best is None:
				break
			p = rest.pop(best)
			loop += p[::-1] if flip else p
		if math.dist(loop[0], loop[-1]) > JOIN:
			raise ValueError(f'loop does not close: {math.dist(loop[0], loop[-1]):.1f} mm')
		if math.dist(loop[0], loop[-1]) < 1e-6:
			loop.pop()
		loops.append(loop)
	return loops


def resample(loop, step=0.5):
	"""Evenly spaced points round a closed loop."""
	closed = loop + [loop[0]]
	s, out, i, acc = 0.0, [], 0, 0.0
	total = length(closed)
	n = round(total / step)
	for k in range(n):
		d = k * total / n
		while acc + math.dist(closed[i], closed[i + 1]) < d:
			acc += math.dist(closed[i], closed[i + 1])
			i += 1
		seg = math.dist(closed[i], closed[i + 1]) or 1
		t = (d - acc) / seg
		out.append((closed[i][0] + (closed[i + 1][0] - closed[i][0]) * t, closed[i][1] + (closed[i + 1][1] - closed[i][1]) * t))
	return out


def corners(loop, count, reach=12, apart=15, step=0.5):
	"""Indices of the count sharpest corners: turning measured over reach mm either side."""
	n, k = len(loop), round(reach / step)
	turn = []
	for i in range(n):
		a, b, c = loop[i - k], loop[i], loop[(i + k) % n]
		u, v = (b[0] - a[0], b[1] - a[1]), (c[0] - b[0], c[1] - b[1])
		turn.append(abs(math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1])))
	found = []
	for i in sorted(range(n), key=lambda q: -turn[q]):
		if all(min(abs(i - j), n - abs(i - j)) * step > apart for j in found):
			found.append(i)
			if len(found) == count:
				break
	# the wide reach finds a corner but smears it: place it by the turn within a few millimetres
	near, fine = round(3 / step), []
	for i in found:
		def tight(q):
			a, b, c = loop[(q - near) % n], loop[q % n], loop[(q + near) % n]
			u, v = (b[0] - a[0], b[1] - a[1]), (c[0] - b[0], c[1] - b[1])
			return abs(math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]))
		fine.append(max(range(i - k, i + k + 1), key=tight) % n)
	return sorted(fine), turn


def split(loop, at):
	"""A loop cut at the corner indices -> open runs, each ending where the next begins."""
	n = len(loop)
	runs = []
	for a, b in zip(at, at[1:] + [at[0] + n]):
		runs.append([loop[i % n] for i in range(a, b + 1)])
	return runs


def signed_area(p):
	return sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(p, p[1:] + p[:1])) / 2


def piece_from(loop, name):
	"""Name a loop's edges by walking round from a known corner. Sheet y runs down."""
	count = len(EDGES[name])
	loop = resample(loop)
	if signed_area(loop) < 0:
		loop.reverse()
	at, _ = corners(loop, count)
	runs = split(loop, at)
	if name == 'sleeve':
		# the wrist is the lowest, straightest edge; the cap is opposite it. On the sheet (y down) a
		# positive area runs wrist left to right... walk so that the order is cap, side, wrist, side.
		w = max(range(4), key=lambda i: sum(y for _, y in runs[i]) / len(runs[i]))
		order = [runs[(w + 2 + i) % 4] for i in range(4)]
	else:
		# the fold is the longest straight edge, and the walk ends on it
		def straightness(r):
			return abs(bbox(r)[2] - bbox(r)[0])
		c = max(range(7), key=lambda i: length(runs[i]) if straightness(runs[i]) < 2 else -1)
		order = [runs[(c + 1 + i) % 7] for i in range(7)]
		# neck comes first going away from the fold's top: if the walk starts at the crotch, turn it round
		if bbox(order[0])[1] > bbox(order[-1])[1] + (bbox(order[-1])[3] - bbox(order[-1])[1]) * 0.5:
			order = [r[::-1] for r in reversed(order[:-1])] + [order[-1][::-1]]
	return dict(zip(EDGES[name], order))


def to_piece_frame(edges, name):
	"""Sheet mm -> the piece's own frame: x from the fold or cap top, y up from the lowest point."""
	pts = [q for e in edges.values() for q in e]
	y1 = max(y for _, y in pts)
	if name == 'sleeve':
		cap = edges['cap']
		x0 = min(cap, key=lambda q: q[1])[0]
		flip = 1
	else:
		x0 = sum(x for x, _ in edges['centre']) / len(edges['centre'])
		flip = 1 if sum(x for x, _ in edges['side']) / len(edges['side']) > x0 else -1
	return lambda q: (round((q[0] - x0) * flip, 3), round(y1 - q[1], 3))


def point_along(run, q):
	"""Nearest place on a run to q: (distance along it, distance away)."""
	best, at, s = math.inf, 0.0, 0.0
	for a, b in zip(run, run[1:]):
		dx, dy = b[0] - a[0], b[1] - a[1]
		l2 = dx * dx + dy * dy or 1e-9
		t = max(0, min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2))
		d = math.hypot(a[0] + dx * t - q[0], a[1] + dy * t - q[1])
		if d < best:
			best, at = d, s + math.sqrt(l2) * t
		s += math.sqrt(l2)
	return at, best


def extract(doc, size):
	paths = read_layer(doc, size)
	lines, high, level, hem, marks = classify(paths)
	loops = chain(lines)
	if len(loops) != 3:
		raise ValueError(f'{size}: {len(loops)} loops, expected 3')
	# the sleeve has the highest wrist-to-cap span to the right; the front is leftmost, the back next
	loops.sort(key=lambda l: bbox(l)[0])
	named = {'front': loops[0], 'back': loops[1], 'sleeve': loops[2]}
	pieces = {}
	for name, loop in named.items():
		edges = piece_from(loop, name)
		frame = to_piece_frame(edges, name)
		out = {'edges': {k: [frame(q) for q in v] for k, v in edges.items()}, 'marks': [], 'lengths': {}}
		for k, v in edges.items():
			out['lengths'][k] = round(length(v), 1)
		out['area_mm2'] = round(abs(signed_area([q for k in EDGES[name] for q in edges[k][:-1]])), 0)
		for m in marks:
			mid = ((m[0][0] + m[-1][0]) / 2, (m[0][1] + m[-1][1]) / 2)
			hits = [(point_along(v, mid), k) for k, v in edges.items()]
			(s, d), k = min(hits, key=lambda h: h[0][1])
			if d < 3 and length(m) < 3:
				out['marks'].append({'edge': k, 'at': round(s, 1), 'of': round(length(edges[k]), 1)})
		extra = {}
		if name in ('front', 'back'):
			# the deep leg: from the crotch to where it meets the side seam
			own = [p for p in high if (bbox(p)[0] < 345) == (name == 'front')]
			if len(own) != 1:
				raise ValueError(f'{size} {name}: {len(own)} high leg lines')
			leg = own[0]
			hit = max((leg[0], leg[-1]), key=lambda q: -q[1])
			at, away = point_along(edges['side'], hit)
			if leg[0] != hit:
				leg = leg[::-1]
			extra['high_hips'] = {'leg': [frame(q) for q in leg], 'length': round(length(leg), 1), 'side_to': round(at, 1), 'gap_to_side': round(away, 2)}
		if name == 'front' and level:
			extra['level_line'] = {'y': frame(level[0][0])[1], 'length': round(length(level[0]), 1)}
		if name == 'sleeve' and hem:
			extra['short_hem'] = {'line': [frame(q) for q in hem[0]], 'length': round(length(hem[0]), 1)}
		out['variants'] = extra
		pieces[name] = out
	return {'size': size, 'source': os.path.basename(PDF), 'units': 'mm', 'seam_allowance': 0, 'grain': 'vertical', 'cut': {'front': 'fold', 'back': 'fold', 'sleeve': 'two mirrored'}, 'seams': SEAMS, 'pieces': pieces}


# Measured by hand from the M layer's own paths (their ends stop short of the corners), for the gate.
M_EXPECT = {('front', 'centre'): 629.8, ('back', 'centre'): 749.6, ('front', 'side'): 436.5, ('back', 'side'): 436.8, ('front', 'shoulder'): 117.7, ('back', 'shoulder'): 118.1, ('front', 'neck'): 111.6, ('back', 'neck'): 63.6, ('front', 'armhole'): 196.7, ('back', 'armhole'): 180.3, ('front', 'crotch'): 25.6, ('back', 'crotch'): 25.6, ('front', 'leg'): 196.8, ('back', 'leg'): 224.2, ('sleeve', 'cap'): 392.9, ('sleeve', 'wrist'): 171.4}


def check(all_sizes):
	worst = 0.0
	m = all_sizes['M']['pieces']
	print('M against its drawn paths (the corner gaps add up to about 3.5 mm per edge):')
	for (p, e), want in M_EXPECT.items():
		got = m[p]['lengths'][e]
		worst = max(worst, abs(got - want))
		print(f'  {p:7}{e:12}{got:8.1f}{want:8.1f}{got - want:+7.1f}')
	print('worst', round(worst, 1))
	print('seams and cap by size (mm difference):')
	for s, d in all_sizes.items():
		P = d['pieces']
		diffs = [round(P[a]['lengths'][x] - P[b]['lengths'][y], 1) for a, x, b, y in SEAMS]
		cap = P['sleeve']['lengths']['cap'] - P['front']['lengths']['armhole'] - P['back']['lengths']['armhole']
		print(f'  {s:4} shoulder {diffs[0]:+.1f} side {diffs[1]:+.1f} crotch {diffs[2]:+.1f} underarm {diffs[3]:+.1f} cap-armholes {cap:+.1f}')


def overlay(doc, all_sizes, path):
	"""Prove the reading: the extracted edges of each size, in the piece's frame, redrawn on a blank sheet."""
	shape_doc = pymupdf.open()
	page = shape_doc.new_page(width=1300 / MM, height=1000 / MM)
	colours = [(0.8, 0, 0), (0, 0.5, 0), (0, 0, 0.8), (0.6, 0, 0.6), (0, 0.5, 0.6)]
	shape = page.new_shape()
	for i, s in enumerate(all_sizes):
		for n, (name, ox) in enumerate((('front', 40), ('back', 420), ('sleeve', 950))):
			for e, run in all_sizes[s]['pieces'][name]['edges'].items():
				shape.draw_polyline([pymupdf.Point((ox + x) / MM, (950 - y) / MM) for x, y in run])
				shape.finish(color=colours[i % 5], width=0.5, closePath=False)
	shape.commit()
	page.get_pixmap(dpi=35).save(path)


def main():
	doc = pymupdf.open(PDF)
	os.makedirs(OUT, exist_ok=True)
	all_sizes = {}
	for s in SIZES:
		all_sizes[s] = extract(doc, s)
		with open(os.path.join(OUT, f'{s}.json'), 'w', encoding='utf-8', newline='\n') as f:
			json.dump(all_sizes[s], f, separators=(',', ':'))
	check(all_sizes)
	overlay(doc, all_sizes, os.path.join(OUT, 'all-sizes.png'))
	print('wrote', OUT)


if __name__ == '__main__':
	main()
