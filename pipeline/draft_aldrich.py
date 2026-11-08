"""Draft a long-sleeved leotard block by Aldrich's bodyshaper method (knowledge/domain/construction/aldrich-stretch-body-and-swimwear-blocks.md).

Owned outright, like pipeline/draft_armstrong.py (its twin in form): every number comes from the book's method and its size charts,
or from the body's own arm, never from a bought pattern. Source: Aldrich, Metric Pattern Cutting for Women's Wear, 5th ed. (2008),
"Bodyshapers", pp. 168-169, numbered points 0-35; the girls' charts from Aldrich, Children's Wear, 4th ed. (2009), pp. 37, 348.

The book draws one draft for back and front (they differ at the neck and the leg) and a separate gusset; its blocks carry no seam
allowance, so its lines are already stitching lines (no inset, unlike Armstrong). Our choices, marked [INFERRED] in the knowledge note:
- The book's bodyshaper is shapewear with a fastened crotch: the gusset's end (19-20) overlaps a short front tab (23-24-25) by 2 cm.
  A leotard is sewn shut, so the gusset end is sewn to the front's crotch end, both overlaps dropped, and the front's crotch end is
  widened from the book's 2 cm to the gusset's 3.5 cm (half widths) so the two edges of that seam are equal.
- The gusset is joined to the back as one piece (the fit solver sews front, back and sleeve), so the back's leg runs on down the
  gusset's side to the crotch seam in one smooth curve through point 21.
- Widths are the bodyshaper's as printed (about 7% off the bust, 4% off the waist, 12% a quarter of the rise below it, at size 12).
  The owner asked to keep swimwear out of the foundation (2026-11-07), so the book's tighter swimwear widths are not used. How tight
  the block is cut stays a parameter to set from real leotards (knowledge: real-leotard-yardsticks).
- The side seam leaves the underarm vertically, so the armhole can meet it square without a hook (girls have little waist shaping).
- Lines meet the fold square, the neck and armhole leave the shoulder square and the armhole meets the side square. The leg keeps the
  book's lines, including the angle where front and back legs meet at the side (point 17) [the bought block has one there too].
- Freehand curves ("draw in", "curve the line ... 0.5 cm") are our cubic splines through the book's points and offsets.

    python pipeline/draft_aldrich.py [size] [body]   writes assets/blocks/aldrich-<size>.json (git-ignored, like the others)
Sizes: women's 6-16 (p. 12; 12 = M, the book's worked example) or girls' heights g98-g164 (Children's Wear p. 37; g146-g164 take the
developing-figure chart, p. 348). The sleeve takes the body's own arm (book: personal measurements may replace the chart's, p. 178).
The app offers size 6 on `young` (bust 86 cm): chosen for tension, as a maker sizes down for a close fit. Fitted on `young`, size 12
lies on the body unstretched (median 1.005 round the torso), size 8 at 1.075, size 6 at 1.117 (the Armstrong block: 1.14).
Then fit: python pipeline/wrap_block.py --drafted aldrich-6 young
"""
import json
import math
import os
import sys

import numpy as np

from draft_armstrong import even, length, norm, spline, through

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'blocks')
MEASURES = os.path.join(HERE, '..', 'app', 'captures', 'wrap-measures.json')
CAPTURES = os.path.join(HERE, '..', 'app', 'captures')

# The book's charts, cm. bust, nape to waist, armscye depth, back width, neck size, body rise. Women's Wear p. 12 (High-street, young women
# 160-172 cm); girls' rows from Children's Wear p. 37 (chest, back neck-waist, scye depth, across back, neck, body rise) and, from 146 cm,
# the developing-figure chart p. 348 (bust and the rest).
WOMEN = {
	'6': (76, 39.8, 19.8, 31.4, 34, 25.9), '8': (80, 40.2, 20.2, 32.4, 35, 26.6), '10': (84, 40.6, 20.6, 33.4, 36, 27.3),
	'12': (88, 41.0, 21.0, 34.4, 37, 28.0), '14': (92, 41.4, 21.4, 35.4, 38, 28.7), '16': (96, 41.8, 21.8, 36.4, 39, 29.4),
}
# Girls also carry waist, hip, waist to hip, arm length and wrist (the same pages).
GIRLS = {
	'g98': (55, 24.2, 13.2, 22.8, 26.6, 16.8, 52, 56, 12.3, 34, 12.8), 'g104': (57, 25.4, 13.8, 23.6, 27.2, 17.6, 54, 59, 12.9, 36.5, 13),
	'g110': (59, 26.6, 14.4, 24.4, 27.8, 18.4, 56, 62, 13.5, 39, 13.2), 'g116': (61, 27.8, 15.0, 25.2, 28.4, 19.2, 58, 65, 14.1, 41.5, 13.4),
	'g122': (63, 29.0, 15.6, 26.0, 29.0, 20.0, 60, 68, 14.7, 44, 13.6), 'g128': (66, 30.4, 16.3, 27.1, 30.0, 21.0, 61, 71, 15.4, 46, 13.9),
	'g134': (69, 31.8, 17.0, 28.2, 31.0, 22.0, 62, 74, 16.1, 48, 14.2), 'g140': (72, 33.2, 17.7, 29.3, 32.0, 23.0, 63, 77, 16.8, 50, 14.5),
	'g146': (78, 35.2, 18.3, 31.0, 33.0, 24.0, 63, 83, 17.6, 54, 15.0), 'g152': (81, 36.6, 19.0, 32.2, 34.0, 25.0, 65, 86, 18.4, 56, 15.3),
	'g158': (84, 38.0, 19.7, 33.4, 35.0, 26.0, 67, 89, 19.2, 58, 15.6), 'g164': (87, 39.4, 20.4, 34.6, 36.0, 27.0, 69, 92, 20.0, 60, 15.9),
}
GIRL_KEYS = ('bust', 'nw', 'ad', 'bw', 'neck', 'rise', 'waist', 'hip', 'wh', 'arm', 'wrist')
# The book's figures are fixed centimetres for women; on a child they take far too much (about 40% off a 3-year-old's waist). For girls
# the same shares of girth are taken as the book takes at size 12 (bust 88, waist 68, low waist 80), from each girl's own chest, waist and
# girth a quarter of the rise below the waist; fixed lengths at the crotch scale with the chest [INFERRED, see the knowledge note].
REF12 = (88.0, 68.0, 80.0)
# Side seam, cm in from the quarter bust: at the underarm (12: 3-12 quarter bust - 1.5), the waist (18: 13-18 4.25 more) and a quarter of
# the rise below the waist (17: 16-17 3 more).
WIDTHS = (1.5, 1.5 + 4.25, 1.5 + 3.0)
GUSSET_END = 3.5  # 19-20, half width at the crotch seam; the front's crotch end is widened to match [INFERRED]


def chart(size):
	if size in WOMEN:
		return dict(zip(('bust', 'nw', 'ad', 'bw', 'neck', 'rise'), WOMEN[size]))
	if size in GIRLS:
		return dict(zip(GIRL_KEYS, GIRLS[size]))
	raise SystemExit(f'unknown size {size}: {sorted(WOMEN) + sorted(GIRLS)}')


def sleeve_length(body):
	"""The book's sleeve length on a body (p. 179: shoulder bone over the elbow to the wrist bone), cm: from the top of the shoulder
	above the shoulder joint, by the elbow, to the wrist landmark. (wrap-measures armLength starts at the joint itself, about 6 cm lower.)"""
	with open(os.path.join(CAPTURES, f'wrap-body-{body}.json'), encoding='utf-8') as f:
		b = json.load(f)
	P = np.array(b['P'], float).reshape(-1, 3)
	s, e, w = (np.array(b['refLm'][k + '_l'], float) for k in ('shoulder', 'elbow', 'wrist'))
	near = (np.abs(P[:, 0] - (s[0] + 0.02)) < 0.03) & (np.abs(P[:, 2] - s[2]) < 0.04) & (P[:, 1] > s[1])
	top = P[near][np.argmax(P[near][:, 1])]
	return float(np.linalg.norm(e - top) + np.linalg.norm(w - e)) * 100


def perp(d, towards):
	"""The unit normal of direction d that points towards a direction (both in the draft's frame)."""
	n = norm(np.array([-d[1], d[0]]))
	return n if n @ np.asarray(towards, float) >= 0 else -n


def bowed(a, b, off, side):
	"""The point off cm from the middle of chord a-b, on the side of the given direction."""
	a, b = np.asarray(a, float), np.asarray(b, float)
	return (a + b) / 2 + off * perp(b - a, side)


def bodyshaper(c):
	"""Back and front of the bodyshaper, book frame: x out from the fold, y DOWN from the nape line (point 0), cm."""
	under, waist_in, hip_in = WIDTHS
	y1 = c['nw'] + 1  # 0-1 neck to waist + 1
	y2 = y1 + c['rise']  # 1-2 body rise
	k = 1.0
	if 'waist' in c:  # a girl: widths as shares of her own girths, the shares the book takes at size 12
		b12, w12, h12 = REF12
		share = lambda off_in, girth12: 1 - 4 * (b12 / 4 - off_in) / girth12
		at_hip = c['waist'] + (c['rise'] / 4) / c['wh'] * (c['hip'] - c['waist'])
		qb = c['bust'] / 4
		under = qb - c['bust'] / 4 * (1 - share(under, b12))
		waist_in = qb - c['waist'] / 4 * (1 - share(waist_in, w12))
		hip_in = qb - at_hip / 4 * (1 - share(hip_in, h12))
		k = c['bust'] / b12
	y3 = c['ad'] + 1.5  # 0-3 armscye depth + 1.5
	y4 = y3 / 2
	y5 = y4 / 5
	p7 = np.array([c['neck'] / 6, -1.5])  # 0-6 sixth neck, 6-7 1.5 up
	x8 = c['bw'] / 2 - 0.5
	p9, p11 = np.array([x8, y4]), np.array([x8 + 1, y5])  # 10-11 1 cm
	x12 = c['bust'] / 4 - under
	p12 = np.array([x12, y3])
	p18 = np.array([x12 - (waist_in - under), y1])
	y15 = y1 + c['rise'] / 4
	p17 = np.array([x12 - (hip_in - under), y15])
	p19 = np.array([0.0, y2 + c['bust'] / 8 + 1])  # 2-19 eighth bust + 1
	p20 = np.array([GUSSET_END * k, p19[1]])
	p21 = np.array([6.0 * k, y2])  # 2-21 6 cm, the gusset line
	p22 = np.array([0.0, c['neck'] / 6 - 1])  # front neck
	y23 = y2 - (p19[1] - y2) / 2  # 2-23 half 2-19, upwards
	p24 = np.array([GUSSET_END * k, y23])  # the front's crotch end, widened [INFERRED]

	shoulder_dir = norm(p11 - p7)
	up_at_7 = perp(shoulder_dir, (0, -1))  # square to the shoulder, rising
	into_arm = perp(shoulder_dir, (0, 1))  # square to the shoulder, down into the armhole
	shoulder = even(np.vstack([p7, p11]) * 1.0)
	side = spline([p12, p18, p17], start_dir=(0, 1))
	side_dir = norm(side[1] - side[0])
	square = perp(side_dir, (1, 0))  # the armhole meets the side seam square, over its last half centimetre (a pattern maker's truing)
	armhole = spline([p11, p9, p12 - 0.5 * square, p12], start_dir=into_arm, end_dir=square)
	pieces = {}
	for name in ('back', 'front'):
		if name == 'back':
			# flat from the fold, rising to 7 and square to the shoulder over its last half centimetre (the truing done at the underarm)
			neck = spline([np.array([0.0, 0.0]), np.array([0.55 * p7[0], -0.1]), p7 - 0.5 * up_at_7, p7], start_dir=(1, 0), end_dir=up_at_7)
			k1 = bowed(p17, p21, 0.5 * k, (1, 1))  # 21-17 outwards 0.5
			k2 = bowed(p21, p20, 0.3 * k, (-1, 0))  # 20-21 inwards 0.3
			leg = spline([p17, k1, p21, k2, p20], end_dir=(0, 1))
			crotch = even(np.vstack([p20, p19]))
			fold_end = p19
		else:
			# square to the fold and to the shoulder, each over its last half centimetre; between, the book's "draw in front neck curve"
			mid = np.array([0.62 * p7[0], p22[1] - 0.35 * (p22[1] - p7[1])])
			neck = spline([p22, p22 + np.array([0.5, 0]), mid, p7 - 0.5 * up_at_7, p7], start_dir=(1, 0), end_dir=up_at_7)
			k26 = bowed(p17, p24, 1.75 * k, (-1, -1))  # 26: inwards 1.75 at the middle of 25-17
			leg = through(p17, norm(k26 - p17), p24, (0, 1), k26, (1.0, 1.0))  # one bend, arriving square to the crotch seam
			crotch = even(np.vstack([p24, np.array([0.0, y23])]))
			fold_end = np.array([0.0, y23])
		top = neck[0]
		centre = even(np.vstack([fold_end, top]))
		pieces[name] = {'neck': neck, 'shoulder': shoulder, 'armhole': armhole, 'side': side, 'leg': leg, 'crotch': crotch, 'centre': centre}
	return pieces, {'p11': p11, 'p12': p12, 'y3': y3, 'armhole': length(armhole)}


def sleeve(c, P, sleeve_len, wrist):
	"""The bodyshaper sleeve (27-32), on its centre fold; both cap halves from the one armhole. Book frame, cm."""
	cap = (P['y3']) / 2 + 1  # 27-28 half 0-3 + 1
	L = sleeve_len + 3  # 27-29 jersey sleeve length + 3
	p27 = np.array([0.0, 0.0])

	def head(D):
		p30 = np.array([math.sqrt(max(D * D - cap * cap, 1e-6)), cap])
		p31 = p30 + (p27 - p30) / 3
		h = bowed(p30, p31, 0.6, (0, 1))  # hollow 0.6
		r = bowed(p31, p27, 2.0, (0, -1))  # raise 2
		return spline([p27, r, p31, h, p30], start_dir=(1, 0)), p30
	# 27-30: the book takes the diagonal 11-12 + 0.5 cm, a stand-in for its freehand armhole; we true the head to our armhole as drawn
	# (each half the armhole's length) [INFERRED]
	lo, hi = cap + 0.1, 3 * P['armhole']
	for _ in range(50):
		D = (lo + hi) / 2
		if length(head(D)[0]) < P['armhole']:
			lo = D
		else:
			hi = D
	half_cap, p30 = head(D)
	p32 = np.array([wrist / 2 + 0.5, L])  # 29-32 half wrist + 0.5
	# 30-32 nearly straight; squared to the wrist over its last few centimetres, as a hem is
	under = spline([p30, p30 + 0.8 * (p32 - p30), p32], end_dir=(0, 1))
	return half_cap, under, p32


EDGES = ['neck', 'shoulder', 'armhole', 'side', 'leg', 'crotch', 'centre']


def to_mm(e):
	"""Book frame (cm, y down) to the block's (mm, y up)."""
	return np.asarray(e, float) * np.array([10.0, -10.0])


def draft(size='6', body='young'):
	c = chart(size)
	with open(MEASURES, encoding='utf-8') as f:
		m = json.load(f)[body]
	torso, P = bodyshaper(c)
	res = {'source': 'draft_aldrich.py', 'method': "Aldrich, Women's Wear 5/e: bodyshaper pp. 168-169; girls' sizes from Children's Wear 4/e pp. 37, 348",
		'size': f'aldrich-{size}', 'chart_size': size, 'arm_from': body, 'units': 'mm', 'seam_allowance': 0, 'grain': 'vertical',
		'cut': {'front': 'fold', 'back': 'fold, gusset joined', 'sleeve': 'two mirrored'},
		'seams': [['front', 'shoulder', 'back', 'shoulder'], ['front', 'side', 'back', 'side'], ['front', 'crotch', 'back', 'crotch'], ['sleeve', 'underarm_f', 'sleeve', 'underarm_b']], 'pieces': {}}
	for name, E in torso.items():
		E = {k: to_mm(v) for k, v in E.items()}
		y0 = E['crotch'][:, 1].min()  # crotch at y = 0
		E = {k: even(v - np.array([0, y0]), 0.5) for k, v in E.items()}  # 0.5 mm apart, as the other blocks
		res['pieces'][name] = {'edges': {k: np.round(v, 3).tolist() for k, v in E.items()}, 'variants': {}, 'marks': [], 'lengths': {k: round(length(v), 1) for k, v in E.items()}}
	# sleeve length: the body's own (the book's personal measurement); jersey length = sleeve - 4 (chart, p. 12)
	if 'arm' in c:  # a girl: her chart's arm; the children's book's close-fitting sleeve is the arm less 2 cm (p. 97)
		half_cap, under, p32 = sleeve(c, P, c['arm'] - 2, c['wrist'])
		res['arm_from'] = 'chart'
	else:
		half_cap, under, p32 = sleeve(c, P, sleeve_length(body) - 4, m['wrist'] / 10)
	mirror = np.array([-1.0, 1.0])
	S = {'cap': np.vstack([(half_cap * mirror)[::-1], half_cap[1:]]), 'underarm_f': under, 'wrist': even(np.vstack([p32, p32 * mirror])), 'underarm_b': (under * mirror)[::-1]}
	S = {k: to_mm(v) for k, v in S.items()}
	y0 = S['wrist'][:, 1].min()
	S = {k: even(v - np.array([0, y0]), 0.5) for k, v in S.items()}
	res['pieces']['sleeve'] = {'edges': {k: np.round(v, 3).tolist() for k, v in S.items()}, 'variants': {}, 'marks': [], 'lengths': {k: round(length(v), 1) for k, v in S.items()}}
	return res


def main():
	size = sys.argv[1] if len(sys.argv) > 1 else '6'
	body = sys.argv[2] if len(sys.argv) > 2 else 'young'
	res = draft(size, body)
	os.makedirs(OUT, exist_ok=True)
	path = os.path.join(OUT, f'aldrich-{size}.json')
	with open(path, 'w', encoding='utf-8', newline='\n') as f:
		json.dump(res, f, separators=(',', ':'))
	for n, p in res['pieces'].items():
		print(n, p['lengths'])
	print('wrote', path)


if __name__ == '__main__':
	main()
