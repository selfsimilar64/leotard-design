"""Draft the leotard sloper by Richardson's method (Designing and Patternmaking for Stretch Fabrics, ch. 13, pp. 395-406).

A method we follow and restate; the numbers are the book's four-way-stretch tables (already reduced by 10% across and along,
p. 396) for its sizes XXS-XXL, in inches. Front and back come from one draft (as the book's catsuit-derived sloper does): they
differ at the neck, the armhole (the front's 1/2 in inside the back's, p. 399) and the leg (p. 401-402, 406).
Torso only: the book's leotard takes the catsuit sleeve or the ch. 8 sleeve, which we do not have.

Our readings where the book says "as illustrated" or "blend", marked [INFERRED] in the knowledge note:
- Necks and armholes are our cubic curves through the book's points, square for 1/2 in at their ends as the book asks.
- The front armhole is the back's moved in up to 1/2 in at its middle, meeting it at G and K.
- The hip curve (French curve from the waist to Q) is a spline from R arriving vertical at Q; the leg leaves it at P.
- Front leg: through the book's points 1-5 (P; first quarter mark raised 1/2 in; second quarter mark; the end of the 1 3/8 in bias
  line from the corner of the upper-hip line and the crotch guideline; then down that guideline) to the crotch.
- Back leg: from P to the crotch guideline at Q's level, bowed out at its middle by the book's medium seat (1 in), then down the
  guideline to the crotch.

    python pipeline/draft_richardson.py [size]     writes assets/blocks/richardson-<size>.json; default M (bust 34.4 in unreduced,
                                                   nearest the `young` body's 34 in)
"""
import json
import math
import os
import sys

import numpy as np

from draft_armstrong import even, length, norm, spline

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'blocks')
IN = 25.4

# p. 396-400, inches, already reduced for four-way stretch. nape-waist, back neck, back neck rise, shoulder pitch, shoulder,
# across back, quarter bust, crotch depth, quarter hip, quarter waist.
SIZES = {
	'XXS': (14.125, 2.375, 0.75, 1.375, 5.125, 7.0, 7.125, 9.0, 7.75, 5.25),
	'XS': (14.25, 2.375, 0.75, 1.5, 5.25, 7.125, 7.375, 9.125, 8.0, 5.5),
	'S': (15.375, 2.5, 0.875, 1.5, 5.5, 7.25, 7.5, 9.25, 8.25, 5.75),
	'M': (15.5, 2.5, 0.875, 1.5, 5.75, 7.375, 7.75, 9.375, 8.5, 6.0),
	'L': (15.75, 2.5, 0.875, 1.5, 6.0, 7.5, 8.0, 9.5, 8.625, 6.25),
	'XL': (16.0, 2.5, 0.875, 1.5, 6.25, 7.625, 8.375, 9.625, 9.0, 6.5),
	'XXL': (16.25, 2.5, 0.875, 1.5, 6.5, 7.75, 8.625, 9.625, 9.375, 6.875),
}
SEAT = 1.0  # p. 406: 1/2 in small, 1 in medium, 1 1/2 in large buttocks
CROTCH = 1.5  # p. 401: guideline 1 1/2 in from the centre front, the crotch's half width


def draft(size='M'):
	nw, bn, rise, pitch, sh, ab, qb, cd, qh, qw = SIZES[size]
	# frame: x out from the fold, y DOWN from line A (inches)
	yF, yC, yB = pitch, nw / 2, nw
	E = np.array([bn, -rise])
	G = np.array([bn + math.sqrt(sh * sh - (pitch + rise) ** 2), yF])  # E-G = shoulder, G on line F
	sdir = norm(G - E)
	H = np.array([ab, yC])
	J = np.array([qb, yC])
	K = H + 0.5 * norm(np.array([1.0, -1.0]))  # H-K 1/2 in on the bias, into the armhole
	up = np.array([sdir[1], -sdir[0]]) if sdir[1] > 0 else np.array([-sdir[1], sdir[0]])
	if up[1] > 0:
		up = -up  # square to the shoulder, rising (y is down)
	into = -up
	# side: J to the waist R, then the hip curve to Q (arriving vertical); the leg leaves it at P
	R = np.array([qw, yB])
	yP, yQ = yB + cd / 3, yB + 2 * cd / 3
	Q = np.array([qh, yQ])
	side_full = spline([J, R, Q], end_dir=(0, 1))
	iP = int(np.argmin(np.abs(side_full[:, 1] - yP)))
	side = even(side_full[:iP + 1])
	P = side[-1]
	side_dir = norm(side[1] - side[0])
	sq_side = np.array([side_dir[1], -side_dir[0]])
	if sq_side[0] < 0:
		sq_side = -sq_side  # the armhole arrives at J heading out, square to the side
	# G, down by the across-back line, K, J: the book puts J only 3/8 in beyond H, so the curve is left free at J (squaring it there
	# for 1/2 in, as the book asks, hooks it back on itself) [INFERRED]
	mid_y = yF + 0.55 * (yC - yF)
	back_arm = spline([G, G + 0.5 * into, np.array([ab, mid_y]), K, J], start_dir=into)
	front_arm = spline([G, G + 0.5 * into, np.array([ab - 0.5, mid_y]), K, J], start_dir=into)
	shoulder = even(np.vstack([E, G]))
	yM = yB + cd
	crotch = even(np.vstack([[CROTCH, yM], [0.0, yM]]))
	# front leg, points 1-5 (p. 402)
	quarter = (P[0] - CROTCH) / 4
	p2 = np.array([P[0] - quarter, yP - 0.5])
	p3 = np.array([P[0] - 2 * quarter, yP])
	p4 = np.array([CROTCH, yP]) + 1.375 * norm(np.array([1.0, 1.0]))
	p5 = np.array([CROTCH, yP + 1.375 + 0.75])
	front_leg = spline([P, p2, p3, p4, p5, [CROTCH, yM]], end_dir=(0, 1))
	# back leg (p. 406): chord P to the crotch guideline at Q's level, bowed out at its middle by the seat allowance
	a, b = P, np.array([CROTCH, yQ])
	bulge = (a + b) / 2 + SEAT * norm(np.array([1.0, 1.0]))
	back_leg = spline([P, bulge, b, [CROTCH, yM]], end_dir=(0, 1))
	pieces = {}
	for name in ('front', 'back'):
		if name == 'back':
			start = np.array([0.0, 0.0])  # the back neck squares out from A for 1/2 in
			neck = spline([start, start + [0.5, 0], E + 0.5 * into, E], start_dir=(1, 0), end_dir=up)
			arm, leg = back_arm, back_leg
		else:
			start = np.array([0.0, yF])  # the front neck squares out from F (p. 397)
			neck = spline([start, start + [0.5, 0], np.array([bn * 0.75, yF - 0.6 * (yF + rise)]), E + 0.5 * into, E], start_dir=(1, 0), end_dir=up)
			arm, leg = front_arm, front_leg
		centre = even(np.vstack([[0.0, yM], start]))
		E_ = {'neck': neck, 'shoulder': shoulder, 'armhole': arm, 'side': side, 'leg': leg, 'crotch': crotch, 'centre': centre}
		E_ = {k: even(np.asarray(v, float) * np.array([IN, -IN]) - np.array([0, -yM * IN]), 0.5) for k, v in E_.items()}
		pieces[name] = {'edges': {k: np.round(v, 3).tolist() for k, v in E_.items()}, 'variants': {}, 'marks': [], 'lengths': {k: round(length(v), 1) for k, v in E_.items()}}
	return {'source': 'draft_richardson.py', 'method': 'Richardson, Designing and Patternmaking for Stretch Fabrics, ch. 13 pp. 395-406',
		'size': f'richardson-{size}', 'units': 'mm', 'seam_allowance': 0, 'grain': 'vertical', 'cut': {'front': 'fold', 'back': 'fold'},
		'seams': [['front', 'shoulder', 'back', 'shoulder'], ['front', 'side', 'back', 'side'], ['front', 'crotch', 'back', 'crotch']], 'pieces': pieces}


def main():
	size = sys.argv[1] if len(sys.argv) > 1 else 'M'
	res = draft(size)
	os.makedirs(OUT, exist_ok=True)
	path = os.path.join(OUT, f'richardson-{size}.json')
	with open(path, 'w', encoding='utf-8', newline='\n') as f:
		json.dump(res, f, separators=(',', ':'))
	for n, p in res['pieces'].items():
		print(n, p['lengths'])
	print('wrote', path)


if __name__ == '__main__':
	main()
