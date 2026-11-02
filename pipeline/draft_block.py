"""Draft a leotard block from body measurements (knowledge/engineering/app/drafted-blocks.md).

Every line is a smooth curve, and every place two lines meet across a seam is decided before the curve is drawn: each
leaves the seam square to it, so sewn together they run straight on. Sewn edges are the same curve or the same length, by
construction. Proportions and reductions are calibrated against one reference block at XS on the `young` body; the figures in
REF are measurements of it, and everything scales from a body's own tape measures. No outline is copied.

    python pipeline/draft_block.py      writes assets/blocks/body-<key>.json and size-<name>.json (git-ignored)
Needs app/captures/wrap-measures.json (dev/wrap-eval.js exportBodies). Check with pipeline/check_pattern.py --dir assets/blocks.
"""
import json
import math
import os

import numpy as np
from scipy.interpolate import CubicSpline

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'blocks')
MEASURES = os.path.join(HERE, '..', 'app', 'captures', 'wrap-measures.json')

# Reference proportions, mm, for the `young` body. Girth reductions are the share taken out of the body's girth.
REF = dict(
	cf=618.0, cb=734.0,                         # neck to crotch on the fold
	neck_x=59.0, drop_f=75.0, drop_b=16.0,      # the neck's width on the piece, how far it falls below the shoulder
	shoulder_x=169.0, shoulder_drop=43.0,
	arm_y_f=481.0, arm_y_b=539.0,               # height of the armpit on each piece
	side=412.0, side_waist=220.0, side_hip=370.0, side_high=282.0,
	crotch_x=29.0, sleeve_over=1.123, cap_ease=0.025, bicep_k=1.055, wrist_k=1.035,
	r_bust=0.166, r_waist=0.082, r_hip=0.165, end_flare=11.0,
)
STEP = 0.5  # mm between stored points of a curve
NECK_TURN = 18.0  # degrees either way from square, at the shoulder seam
BACK_LEG = (0.26, 0.08)  # the back leg's handles at its ends and its middle, over its chord


def norm(v):
	v = np.asarray(v, float)
	return v / (np.linalg.norm(v) or 1)


def bezier(p0, t0, a, p3, t3, b):
	"""A cubic from p0 leaving along t0 to p3 arriving along t3, with handles a and b long, sampled at STEP."""
	p0, p3 = np.asarray(p0, float), np.asarray(p3, float)
	c1, c2 = p0 + norm(t0) * a, p3 - norm(t3) * b
	u = np.linspace(0, 1, 400)[:, None]
	line = (1 - u) ** 3 * p0 + 3 * u * (1 - u) ** 2 * c1 + 3 * u * u * (1 - u) * c2 + u ** 3 * p3
	return even(line)


def even(line):
	s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(line, axis=0), axis=1))])
	t = np.linspace(0, s[-1], max(2, int(s[-1] / STEP) + 1))
	return np.column_stack([np.interp(t, s, line[:, 0]), np.interp(t, s, line[:, 1])])


def length(p):
	return float(np.linalg.norm(np.diff(p, axis=0), axis=1).sum())


def fit_length(make, target, lo=0.05, hi=2.0):
	"""The handle k that makes a curve the target length."""
	for _ in range(50):
		mid = (lo + hi) / 2
		if length(make(mid)) < target:
			lo = mid
		else:
			hi = mid
	return make((lo + hi) / 2)


def draft(m, base):
	"""m: tape measures; base: the same for the reference body."""
	v = (m['front']['neck'] + m['back']['neck']) / (base['front']['neck'] + base['back']['neck'])  # length of the trunk
	shoulder_k = m['shoulderX'] / base['shoulderX']
	neck_k = m['neckHalfWidth'] / base['neckHalfWidth']
	side_k = m['side']['crotch'] / base['side']['crotch']
	cf, cb = REF['cf'] * v, REF['cb'] * v
	nx, sx = REF['neck_x'] * neck_k, REF['shoulder_x'] * shoulder_k
	sdrop = REF['shoulder_drop'] * v
	arm_x = m['bust'] * (1 - REF['r_bust']) / 4
	sx = min(sx, arm_x * 0.94)  # a shoulder stops short of the armpit's width, or the armhole has to double back (a child's chest is narrow for its shoulders)

	# the side seam is one curve, shared: x by distance down from the armpit
	d_w, d_h, d_e = REF['side_waist'] * m['side']['waist'] / base['side']['waist'], REF['side_hip'] * m['side']['hip'] / base['side']['hip'], REF['side'] * side_k
	x_w, x_h = m['waist'] * (1 - REF['r_waist']) / 4, m['hip'] * (1 - REF['r_hip']) / 4
	x_h = max(x_h, x_w + 1)
	curve = CubicSpline([0, d_w, d_h, d_e], [arm_x, x_w, x_h, x_h + REF['end_flare'] * side_k], bc_type='natural')
	ds = np.arange(0, d_e + STEP, STEP)
	ds[-1] = d_e
	side_x = curve(ds)
	high_d = REF['side_high'] * side_k
	pieces = {}
	for name, centre, drop, arm_y in (('front', cf, REF['drop_f'], REF['arm_y_f'] * v), ('back', cb, REF['drop_b'], REF['arm_y_b'] * v)):
		top = centre + drop
		neck_pt, tip = np.array([nx, top]), np.array([sx, top - sdrop])
		along = norm(tip - neck_pt)
		# square to the shoulder seam: across it, front and back carry straight on
		up = np.array([-along[1], along[0]])
		if up[1] < 0:
			up = -up
		# ...turned together, front one way and back the other, so they still run straight on across it: a front neck
		# climbs steeply, a back neck hardly rises, and each now arrives along the way it was already going
		turn = math.radians(NECK_TURN) * (1 if name == 'front' else -1)
		arrive = np.array([up[0] * math.cos(turn) - up[1] * math.sin(turn), up[0] * math.sin(turn) + up[1] * math.cos(turn)])
		start = np.array([0.0, centre])
		dist = np.linalg.norm(neck_pt - start)
		# (the handle at the shoulder stays short enough that the neck cannot dip below where it starts)
		neck = bezier(start, (1, 0), 0.5 * dist, neck_pt, arrive, min(0.4 * dist, 0.9 * (neck_pt[1] - start[1]) / max(arrive[1], 0.05)))
		shoulder = even(np.vstack([neck_pt, tip]))
		armpit = np.array([arm_x, arm_y])
		tan_side = norm((curve(STEP) - curve(0), -STEP))  # down the side from the armpit
		out = np.array([-tan_side[1], tan_side[0]])
		if out[0] < 0:
			out = -out
		chord = np.linalg.norm(armpit - tip)
		arm = bezier(tip, -up, (0.38 if name == 'front' else 0.34) * chord, armpit, out, 0.4 * chord)
		side = np.column_stack([side_x, arm_y - ds])

		def leg_line(end_d):
			e = np.array([curve(end_d), arm_y - end_d])
			t = norm((curve(end_d + STEP) - curve(end_d), -STEP))
			inward = np.array([t[1], -t[0]])
			if inward[0] > 0:
				inward = -inward
			c = np.array([REF['crotch_x'] * (m['hip'] / base['hip']) ** 0.5, 0.0])
			gap = np.linalg.norm(e - c)
			# leaves the side square and arrives square to the crotch seam, with handles balanced so it sweeps in one bend
			# (and it never climbs above the side seam on the way: a low leg has little height to work with)
			if name == 'front':
				return even(bezier(e, inward, 0.3 * gap, c, (0, -1), min(0.42 * gap, 0.9 * (e[1] - c[1])))), c
			# A back leg runs nearly straight, to keep the cheek covered (sweeping it in like a front took 45 mm off the cover each side):
			# two curves meeting on the chord, along it, each rounding one end so that it still leaves square
			mid, along = (e + c) / 2, norm(c - e)
			end, middle = BACK_LEG[0] * gap, BACK_LEG[1] * gap
			return even(np.vstack([bezier(e, inward, end, mid, along, middle), bezier(mid, along, middle, c, (0, -1), min(end, 0.9 * (e[1] - c[1])))[1:]])), c
		leg, c = leg_line(d_e)
		crotch = even(np.vstack([c, [0.0, 0.0]]))
		fold = even(np.vstack([[0.0, 0.0], start]))
		high, _ = leg_line(high_d)
		e = {'neck': neck, 'shoulder': shoulder, 'armhole': arm, 'side': side, 'leg': leg, 'crotch': crotch, 'centre': fold}
		pieces[name] = {'edges': e, 'variants': {'high_hips': {'leg': high, 'side_to': float(np.interp(high_d, ds, np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(side, axis=0), axis=1))]))), 'length': length(high)}}}

	# the sleeve: the cap's two halves are exactly the two armholes plus the ease
	af, ab = length(pieces['front']['edges']['armhole']), length(pieces['back']['edges']['armhole'])
	top_y = m['armLength'] * REF['sleeve_over']
	bw, ww = m['bicep'] * REF['bicep_k'] / 2, m['wrist'] * REF['wrist_k'] / 2
	mirror = np.array([-1.0, 1.0])

	def half(k, h, top_x, sign):
		# from the crown, level, out to the cap's end, square to the underarm seam
		yb_ = top_y - h
		t = norm((ww - bw, -yb_))
		out = np.array([-t[1], t[0]])
		if out[0] < 0:
			out = -out
		top, end = np.array([top_x, top_y]), np.array([sign * bw, yb_])
		gap = np.linalg.norm(end - top)
		return bezier(top, (sign, 0), k * gap, end, out * np.array([sign, 1]), 0.5 * gap)
	# The cap's height sets its whole length; where its crown sits shares that between the two armholes, so neither half has
	# to be bent to fit. (On a set height a big armhole forced a tight bend, and a child's unequal armholes a lopsided cap.)
	want_f, want_b = af * (1 + REF['cap_ease']), ab * (1 + REF['cap_ease'])
	cap_h, top_x = 60.0, 0.0
	for _ in range(6):
		lo, hi = 20.0, top_y * 0.6
		for _ in range(30):
			mid = (lo + hi) / 2
			if length(half(0.5, mid, top_x, 1)) + length(half(0.5, mid, top_x, -1)) < want_f + want_b:
				lo = mid
			else:
				hi = mid
		cap_h = (lo + hi) / 2
		lo, hi = -bw * 0.5, bw * 0.5
		for _ in range(30):
			mid = (lo + hi) / 2
			if length(half(0.5, cap_h, mid, 1)) - length(half(0.5, cap_h, mid, -1)) > want_f - want_b:
				lo = mid
			else:
				hi = mid
		top_x = (lo + hi) / 2
	yb = top_y - cap_h
	tan_under = norm((ww - bw, -yb))  # down the +x side
	cap_f = fit_length(lambda k: half(k, cap_h, top_x, 1), want_f)
	cap_b = fit_length(lambda k: half(k, cap_h, top_x, -1), want_b)
	under_f = even(np.vstack([[bw, yb], [ww, 0.0]]))
	under_b = under_f * mirror
	gap = 2 * ww
	wrist_in = np.array([tan_under[1], -tan_under[0]])
	if wrist_in[0] > 0:
		wrist_in = -wrist_in
	wrist = bezier((ww, 0.0), wrist_in, gap / 3, (-ww, 0.0), wrist_in * mirror * np.array([-1, -1]), gap / 3)
	cap = np.vstack([cap_b[::-1], cap_f[1:]])
	pieces['sleeve'] = {'edges': {'cap': cap, 'underarm_f': under_f, 'wrist': wrist, 'underarm_b': under_b[::-1]}, 'variants': {}}
	result = {'source': 'draft_block.py', 'units': 'mm', 'seam_allowance': 0, 'grain': 'vertical', 'cut': {'front': 'fold', 'back': 'fold', 'sleeve': 'two mirrored'},
		'seams': [['front', 'shoulder', 'back', 'shoulder'], ['front', 'side', 'back', 'side'], ['front', 'crotch', 'back', 'crotch'], ['sleeve', 'underarm_f', 'sleeve', 'underarm_b']], 'pieces': {}}
	for name, p in pieces.items():
		E = {k: np.round(v, 3).tolist() for k, v in p['edges'].items()}
		V = {k: {**q, 'leg': np.round(q['leg'], 3).tolist()} for k, q in p['variants'].items()}
		result['pieces'][name] = {'edges': E, 'variants': V, 'marks': [], 'lengths': {k: round(length(v), 1) for k, v in p['edges'].items()}}
	return result


# Adult sizes: the chart gives bust, waist, hip and girth (cm); the rest follows the reference body.
CHART = {'XXS': (79, 61, 86, 138), 'XS': (83, 65, 90, 144.5), 'S': (88, 70, 95, 147.5), 'M': (93, 75, 100, 152.5), 'L': (98, 80, 105, 157.5), 'XL': (103, 85, 110, 162.5), '2XL': (110, 92, 117, 167.5), '3XL': (117, 99, 124, 171.5), '4XL': (124, 106, 131, 175.5), '5XL': (131, 113, 138, 180.5), '6XL': (138, 120, 145, 185.5)}


def from_chart(base, bust, waist, hip, girth):
	k = (bust * 10 / base['bust']) ** 0.5
	v = 1 + 0.5 * (girth / CHART['XS'][3] - 1)
	m = json.loads(json.dumps(base))
	m.update(bust=bust * 10, waist=waist * 10, hip=hip * 10, neck=base['neck'] * k, neckHalfWidth=base['neckHalfWidth'] * k, shoulderX=base['shoulderX'] * k, bicep=base['bicep'] * bust * 10 / base['bust'], wrist=base['wrist'] * k)
	for s in ('front', 'back'):
		m[s]['neck'] *= v
	return m


def main():
	with open(MEASURES, encoding='utf-8') as f:
		bodies = json.load(f)
	base = bodies['young']
	os.makedirs(OUT, exist_ok=True)
	made = {}
	for key, m in bodies.items():
		made[f'body-{key}'] = draft(m, base)
	for size, row in CHART.items():
		made[f'size-{size}'] = draft(from_chart(base, *row), base)
	for name, block in made.items():
		block['size'] = name
		with open(os.path.join(OUT, name + '.json'), 'w', encoding='utf-8', newline='\n') as f:
			json.dump(block, f, separators=(',', ':'))
	print('wrote', len(made), 'blocks to', OUT)


if __name__ == '__main__':
	main()
