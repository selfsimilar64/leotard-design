"""Compare the app's flattened pattern with a purchased block (exploration stage 2).

Inputs: the block's derived JSON (pipeline/extract_block.py) and a capture of the app's pieces
(app/captures/block-compare-<leg>.json, POSTed from the browser console; see
knowledge/product/roadmap/flat-and-3d-exploration-plan.md).
    python pipeline/compare_block.py <block size> <leg: standard|high> [out.png]
Measures in millimetres, on half a body piece with the centre at x = 0 and the crotch at y = 0.
"""
import json
import math
import os
import sys

import pymupdf

HERE = os.path.dirname(os.path.abspath(__file__))
DERIVED = os.path.join(HERE, '..', 'assets', 'patterns', 'basicpatternblock-leotard-0005', 'derived')
CAPTURES = os.path.join(HERE, '..', 'app', 'captures')
MM = 25.4 / 72


def area(p):
	return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(p, p[1:] + p[:1]))) / 2


def perimeter(p):
	return sum(math.dist(a, b) for a, b in zip(p, p[1:] + p[:1]))


def block_outline(block, name, leg):
	"""A block piece's half outline. The deep leg cuts the side seam short."""
	P = block['pieces'][name]
	if name == 'sleeve':
		return [q for k in ('cap', 'underarm_b', 'wrist', 'underarm_f') for q in P['edges'][k][:-1]]
	side, legline = P['edges']['side'], P['edges']['leg']
	if leg == 'high':
		high = P['variants']['high_hips']
		s, kept = 0.0, [side[0]]
		for a, b in zip(side, side[1:]):
			s += math.dist(a, b)
			if s > high['side_to']:
				break
			kept.append(b)
		side, legline = kept, high['leg']
	return [q for run in (P['edges']['neck'], P['edges']['shoulder'], P['edges']['armhole'], side, legline, P['edges']['crotch'], P['edges']['centre']) for q in run]


def x_at(poly, y):
	"""The outermost x of a half outline at height y."""
	best = None
	for a, b in zip(poly, poly[1:] + poly[:1]):
		if (a[1] - y) * (b[1] - y) <= 0 and a[1] != b[1]:
			x = a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1])
			best = x if best is None else max(best, x)
	return best


def app_half(stitch):
	"""An app body piece is whole: fold it at its symmetry line; x from the centre, y up from the crotch."""
	xs = [p[0] for p in stitch]
	cx = (min(xs) + max(xs)) / 2
	ys = [p[1] for p in stitch]
	flip = 1
	return [((x - cx) * flip, y - min(ys)) for x, y in stitch], cx


def half_outline(whole):
	"""Right side of a whole, centred outline, closed along the centre."""
	n = len(whole)
	out = []
	for a, b in zip(whole, whole[1:] + whole[:1]):
		if a[0] >= 0:
			out.append(a)
		if (a[0] < 0) != (b[0] < 0):
			t = -a[0] / (b[0] - a[0])
			out.append((0.0, a[1] + (b[1] - a[1]) * t))
	return out


def measures(half):
	ys = [p[1] for p in half]
	h = max(ys) - min(ys)
	y0 = min(ys)
	cf = [p[1] for p in half if abs(p[0]) < 1.0]
	centre = max(cf) - min(cf)
	# underarm: widest in the band where the armhole's lowest point lies; waist: narrowest below it;
	# hip: widest below the waist, as far as this leg cut leaves fabric
	lv = [y0 + h * i / 200 for i in range(1, 200)]
	w = {y: x_at(half, y) or 0 for y in lv}
	arm_y = max((y for y in lv if y0 + h * 0.55 < y < y0 + h * 0.8), key=lambda y: w[y])
	waist_y = min((y for y in lv if y0 + h * 0.3 < y < arm_y - 40), key=lambda y: w[y])
	hip_y = max((y for y in lv if y0 + h * 0.1 < y < waist_y), key=lambda y: w[y])
	return dict(height=h, centre=centre, underarm=w[arm_y], underarm_at=arm_y - y0, waist=w[waist_y], waist_at=waist_y - y0, hip=w[hip_y], hip_at=hip_y - y0, area=area(half))


def sleeve_measures(p):
	ys = [q[1] for q in p]
	xs = [q[0] for q in p]
	y0, y1 = min(ys), max(ys)
	wid = {}
	for t, k in ((0.05, 'wrist'), (0.72, 'bicep')):
		y = y0 + (y1 - y0) * t
		cross = []
		for a, b in zip(p, p[1:] + p[:1]):
			if (a[1] - y) * (b[1] - y) <= 0 and a[1] != b[1]:
				cross.append(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]))
		wid[k] = max(cross) - min(cross) if cross else 0
	return dict(length=y1 - y0, width=max(xs) - min(xs), wrist=wid['wrist'], bicep=wid['bicep'], area=area(p), perimeter=perimeter(p))


def show(title, keys, rows):
	print(title)
	print('  ' + ' ' * 22 + ''.join(f'{k:>11}' for k in keys))
	for label, m, base in rows:
		print(f'  {label:22}' + ''.join(f'{m[k]:11.0f}' for k in keys))
		if base:
			print(f'  {"  vs block":22}' + ''.join(f'{100 * (m[k] / base[k] - 1):+10.1f}%' for k in keys))


def main():
	size, leg = sys.argv[1], sys.argv[2]
	out = sys.argv[3] if len(sys.argv) > 3 else None
	with open(os.path.join(DERIVED, size + '.json'), encoding='utf-8') as f:
		block = json.load(f)
	with open(os.path.join(CAPTURES, f'block-compare-{leg}.json'), encoding='utf-8') as f:
		app = json.load(f)
	drawn = {}
	for name, title in (('front', 'Front'), ('back', 'Back')):
		b = block_outline(block, name, leg)
		mb = measures(b)
		rows = [(f'block {size} ({leg})', mb, None)]
		for kind, label in (('raw', 'app, no ease'), ('def', 'app, default ease')):
			piece = next(p for p in app[kind] if p['name'] == title)
			whole, _ = app_half([tuple(q) for q in piece['stitch']])
			half = half_outline(whole)
			rows.append((label, measures(half), mb))
			drawn[(name, kind)] = half
		drawn[(name, 'block')] = b
		show(title + ' (half piece):', ['height', 'centre', 'underarm', 'waist', 'hip', 'underarm_at', 'waist_at', 'hip_at', 'area'], rows)
	sb = block_outline(block, 'sleeve', leg)
	msb = sleeve_measures(sb)
	rows = [(f'block {size}', msb, None)]
	for kind, label in (('raw', 'app, no ease'), ('def', 'app, default ease')):
		piece = next(p for p in app[kind] if p['name'] == 'Sleeve')
		rows.append((label, sleeve_measures([tuple(q) for q in piece['stitch']]), msb))
		xs, ys = zip(*piece['stitch'])
		drawn[('sleeve', kind)] = [(x - (min(xs) + max(xs)) / 2, y - min(ys)) for x, y in piece['stitch']]
	xs, ys = zip(*sb)
	drawn[('sleeve', 'block')] = [(x - (min(xs) + max(xs)) / 2, y - min(ys)) for x, y in sb]
	show('Sleeve:', ['length', 'width', 'wrist', 'bicep', 'perimeter', 'area'], rows)
	if out:
		doc = pymupdf.open()
		page = doc.new_page(width=1250 / MM, height=880 / MM)
		s = page.new_shape()
		colour = {'block': (0, 0, 0), 'raw': (0.85, 0.35, 0.1), 'def': (0.1, 0.35, 0.85)}
		for name, ox in (('front', 40), ('back', 400), ('sleeve', 950)):
			for kind in ('block', 'raw', 'def'):
				p = drawn[(name, kind)]
				s.draw_polyline([pymupdf.Point((ox + x) / MM, (840 - y) / MM) for x, y in p + p[:1]])
				s.finish(color=colour[kind], width=1.6 if kind == 'block' else 1.0, closePath=False)
		s.commit()
		page.get_pixmap(dpi=38).save(out)
		print('wrote', out)


if __name__ == '__main__':
	main()
