"""Draft a long-sleeved leotard by Cole's method (Patternmaking with Stretch Knit Fabrics, 2016): her one-piece "leg-line swimsuit"
sloper, which ch. 12 also names as the base for a leotard (p. 410, 450), with the set-in sleeve of ch. 6.

Cole's chain, followed here (knowledge: cole-leotard-block):
1. Two-way stretch top foundation from measurements (ch. 5 pp. 81-83): a box a quarter bust wide and top-of-form-to-waist long;
   front and back differ at the neck and the armhole (the back passes 1/4 in outside the front at mid armhole, C3).
2. Graded to "very stretchy" (shoulder tip and mid armhole 1/2 in in, side 1 in in), reduced to four-way stretch (folds of 1/2 in
   between shoulder and underarm and 1 in between underarm and waist, pp. 92-93), graded to "super stretchy" (a further 1/4 in at
   the shoulder tip and mid armhole, 1/2 in at the side, p. 94).
3. Hip foundation (pp. 73-80): a quarter hip wide, waist-to-hip deep; side seam from 5/8 in above the waist to 1 in above the hip
   line; graded 1 1/2 in narrower (super stretchy) and reduced 1 in in length (four-way).
4. Leg-line panty from it (pp. 365-366): leg points B, F, R, O, N, T on the front; B, A, C, K, T on the back.
5. Swimsuit (pp. 411-413): top over panty at the waist; the side seam redrawn underarm to the leg (B-I-D), in 3/8 in two inches
   above the waist; the back's 1 in crotch section moved to the front.
6. Sleeve (pp. 100-111): cap drawn on the front armhole (X-S1 1 1/4 in, A-C1 3/4 in, half bicep), length to the wrist; cap length
   made equal to the armhole (her rule: knits take no cap ease).

Measurements: Cole drafts from the dress form's or person's own. Girths (bust, waist, hip), the vertical levels and the arm come
from the body (app/captures/wrap-measures.json, wrap-body-<body>.json); the body's neck and shoulder readings are not usable (the
neck slice catches the trapezius), so shoulder length and across chest are from Aldrich's women's chart, size 12 (bust 88), and
the book's own size-10 figures give crotch depth, half bicep, half wrist and A-C1. [INFERRED] choices are listed in the knowledge note.

    python pipeline/draft_cole.py [body]     writes assets/blocks/cole-<body>.json; then python pipeline/wrap_block.py --drafted cole-young young
"""
import json
import math
import os
import sys

import numpy as np

from draft_armstrong import even, length, norm, spline, through
from draft_aldrich import sleeve_length

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'blocks')
CAPTURES = os.path.join(HERE, '..', 'app', 'captures')
IN = 25.4

CHART = {'shoulder': 12.2 / 2.54, 'half_across_chest': 32.4 / 2 / 2.54}  # Aldrich, Women's Wear p. 12, size 12 (bust 88)
SIZE10 = {'crotch_depth': 10.25, 'half_bicep': 5.5, 'half_wrist': 3.75, 'a_c1': 0.75}  # Cole pp. 101, 365, size 10
SUPER = {'shoulder_in': 0.75, 'side_in': 1.5, 'hip_side_in': 1.5}  # very stretchy then super stretchy, per quarter (pp. 88, 94, 76-80)


def body_measures(body):
	"""Cole's form measurements (inches) from a body: girths, top-of-form to waist, to front neck, to bust, waist to hip."""
	with open(os.path.join(CAPTURES, 'wrap-measures.json'), encoding='utf-8') as f:
		m = json.load(f)[body]
	with open(os.path.join(CAPTURES, f'wrap-body-{body}.json'), encoding='utf-8') as f:
		b = json.load(f)
	P = np.array(b['P'], float).reshape(-1, 3)
	lv = m['levels']
	# "top of form": 1 1/4 in above the side neck point (Cole's guideline, p. 81), the side neck point being the top of the shoulder
	# beside the neck
	near = (np.abs(P[:, 0] - m['neckHalfWidth'] / 1000) < 0.004) & (np.abs(P[:, 2]) < 0.05)
	side_neck = float(P[near, 1].max())
	top = side_neck + 1.25 * IN / 1000
	# measurements 1-3 are taken down the centre front over the body (p. 70): the front centre line's length
	c = P[(np.abs(P[:, 0]) < 0.004) & (P[:, 2] > 0)]
	ys = np.arange(top, lv['waist'], -0.002)
	z = np.array([c[np.abs(c[:, 1] - y) < 0.003, 2].max() if np.any(np.abs(c[:, 1] - y) < 0.003) else np.nan for y in ys])
	ok = ~np.isnan(z)
	z = np.interp(ys, ys[ok][::-1], z[ok][::-1])  # rows with no surface point near the centre line: bridged
	arc = lambda y0, y1: float(np.sum(np.hypot(np.diff(ys[(ys <= y0) & (ys >= y1)]), np.diff(z[(ys <= y0) & (ys >= y1)])))) * 1000 / IN
	return {'bust': m['bust'] / IN, 'waist': m['waist'] / IN, 'hip': m['hip'] / IN, 'top_waist': arc(top, lv['waist']),
		'top_neck': (top - lv['neck']) * 1000 / IN, 'top_bust': arc(top, lv['bust']), 'waist_hip': (lv['waist'] - lv['hip']) * 1000 / IN,
		'arm': sleeve_length(body) / 2.54}


def top_foundation(M):
	"""Four-way super-stretchy front and back top foundations (inches; x out from the fold, y DOWN from the top of form)."""
	qb, qw = M['bust'] / 4, M['waist'] / 4
	yG = 1.25  # guideline
	yM = yG + 2.0  # guide mark
	yW = M['top_waist']
	# armhole depth: Cole's 6 3/4 in below the guide mark is her form's. On a person it is taken in proportion to the nape-to-waist
	# length, as the chart's armscye depth runs (Aldrich size 12: 21 of 41 cm), from the back neck 1 3/4 in below the top [INFERRED];
	# on an average torso this gives Cole's own figure
	nape_waist = yW - (yG + 0.5)
	yU = (yG + 0.5) + 21.0 / 41.0 * nape_waist
	yY = (yM + yU) / 2  # chest line
	S1 = np.array([2.375, yG])  # N1-N2 2 3/8 in, squared up to the guideline
	S = S1 + np.array([math.sqrt(CHART['shoulder'] ** 2 - (yM - yG) ** 2), yM - yG])
	C = np.array([CHART['half_across_chest'], yY])
	C3 = C + np.array([0.25, 0])
	U = np.array([qb, yU])
	W1 = np.array([qw, yW + 0.375])
	# grade: shoulder tip and mid armhole in, side (underarm, waist) in
	sh, sd = SUPER['shoulder_in'], SUPER['side_in']
	S, C, C3 = S - [sh, 0], C - [sh, 0], C3 - [sh, 0]
	U, W1 = U - [sd, 0], W1 - [sd, 0]
	# four-way length reduction: 1/2 in between shoulder and underarm, 1 in between underarm and waist; points below a fold move up
	g1, g2 = (yG + yU) / 2, (yU + yW) / 2
	lift = lambda p: np.asarray(p, float) - [0, (0.5 if p[1] > g1 else 0) + (1.0 if p[1] > g2 else 0)]
	S, C, C3, U, W1 = (lift(p) for p in (S, C, C3, U, W1))
	yW -= 1.5
	sdir = norm(S - S1)
	up = np.array([sdir[1], -sdir[0]]) if sdir[1] > 0 else np.array([-sdir[1], sdir[0]])
	if up[1] > 0:
		up = -up
	into = -up
	shoulder = even(np.vstack([S1, S]))
	front_arm = spline([S, S + 0.25 * into, C, U - [0.25, 0], U], start_dir=into, end_dir=(1, 0))  # 1/4 in squared at S and U
	back_arm = spline([S, S + 0.25 * into, C3, U - [0.25, 0], U], start_dir=into, end_dir=(1, 0))
	N = np.array([0.0, yG + 0.5])  # back neck depth, 1/2 in below the guideline
	# front base of neck: the body's reading puts it level with the back neck (the mannequin's neck slice), which no neckline does;
	# a crew neck's usual 1 1/2 in below the back neck is used instead [INFERRED]
	N1 = np.array([0.0, max(M['top_neck'], N[1] + 1.5)])
	front_neck = through(N1, (1, 0), S1, up, np.array([0.7 * S1[0], N1[1] - 0.45 * (N1[1] - S1[1])]), (1.0, 1.0))
	back_neck = spline([N, N + [0.75, 0], np.array([0.75 * S1[0], N[1] - 0.3 * (N[1] - S1[1])]), S1 - 0.2 * up, S1], start_dir=(1, 0), end_dir=up)
	return {'S1': S1, 'S': S, 'U': U, 'yW': yW, 'shoulder': shoulder, 'front_arm': front_arm, 'back_arm': back_arm,
		'front_neck': front_neck, 'back_neck': back_neck, 'N1': N1, 'N': N}


def panty(M, yW):
	"""Four-way super-stretchy leg-line panty legs and side point (inches, same frame; the waist at yW)."""
	qh, qw = M['hip'] / 4, M['waist'] / 4
	hip_depth = M['waist_hip'] - 1.0  # four-way: 1 in taken out between waist and hip
	x_side_hip = qh - SUPER['hip_side_in'] - 0.125  # 1/8 in off the side at H1 after the fold (p. 79)
	yS = yW + 5.75
	# the hip foundation's side at S's level: from W1 (5/8 in above the waist) to 1 in above the hip line, a hip curve
	W1 = np.array([qw - SUPER['hip_side_in'], yW - 0.625])
	Yh = np.array([x_side_hip, yW + hip_depth - 1.0])
	side = spline([W1, Yh, [x_side_hip, yW + hip_depth]], end_dir=(0, 1))
	X = side[np.argmin(np.abs(side[:, 1] - yS))]
	B = X + np.array([-0.5, -0.5])  # X-B 1/2 in in, then squared up 1/2 in
	D = yW + SIZE10['crotch_depth']
	Sx = 0.0
	quarter = (B[0] - Sx) / 4
	F = np.array([B[0] - quarter, yS - 0.5])
	R = np.array([B[0] - 2 * quarter, yS - 0.375])
	third = (D - yS) / 3
	L, Mm = yS + third, yS + 2 * third
	O = np.array([1.375, L])
	Nn = np.array([1.125, Mm])
	T = np.array([1.5, D])
	front_leg = spline([B, F, R, O, Nn, T])
	# back: B-T guideline, C 5/8 in out at its middle, A and K 1/4 in off at the ends
	chord = T - B
	out = np.array([chord[1], -chord[0]])
	out = norm(out if out[1] > 0 else -out)  # towards the seat (down and out)
	# A and K (1/4 in marks near B and T, p. 366) are read as guides the curve passes inside of; the curve is drawn B-C-T, arriving
	# square to the crotch [INFERRED]
	Cc = (B + T) / 2 + out * 0.625
	back_leg = spline([B, Cc, T - [0, 0.4], T], end_dir=(0, 1))
	return {'B': B, 'D': D, 'T': T, 'front_leg': front_leg, 'back_leg': back_leg, 'front_pts': [B, F, R, O, Nn, T]}


def draft(body='young'):
	M = body_measures(body)
	t = top_foundation(M)
	p = panty(M, t['yW'])
	U, B, yW = t['U'], p['B'], t['yW']
	# side seam (p. 413): 3 in down from the underarm, in 3/8 in on a guideline 2 in above the waist, out to the leg point
	I = np.array([U[0] - 0.375, yW - 2.0])
	# x as one smooth curve of y (leaving the underarm straight down) through the 3 in mark, I and the leg point: the "curved shape at
	# the bust level" and the hip curves blended into one line [INFERRED]
	from scipy.interpolate import CubicSpline
	knots = sorted([(U[1], U[0]), (U[1] + 3.0, U[0] - 0.05), (I[1], I[0]), (B[1], B[0])])
	f = CubicSpline([k[0] for k in knots], [k[1] for k in knots], bc_type=((1, 0.0), (2, 0.0)))
	ys = np.linspace(U[1], B[1], 400)
	side = even(np.column_stack([f(ys), ys]))
	pieces = {}
	ext = 1.0  # the back's 1 in crotch section, moved to the front (p. 413)
	for name in ('front', 'back'):
		if name == 'front':
			neck, arm, top = t['front_neck'], t['front_arm'], t['N1']
			leg = spline(list(p['front_pts']) + [p['T'] + [0, ext]], end_dir=(0, 1))
			yC = p['D'] + ext
		else:
			neck, arm, top = t['back_neck'], t['back_arm'], t['N']
			leg = p['back_leg']
			yC = p['D']
		crotch = even(np.vstack([[1.5, yC], [0.0, yC]]))
		centre = even(np.vstack([[0.0, yC], top]))
		E = {'neck': neck, 'shoulder': t['shoulder'], 'armhole': arm, 'side': side, 'leg': leg, 'crotch': crotch, 'centre': centre}
		E = {k: even(np.asarray(v, float) * np.array([IN, -IN]) + np.array([0, yC * IN]), 0.5) for k, v in E.items()}
		pieces[name] = {'edges': {k: np.round(v, 3).tolist() for k, v in E.items()}, 'variants': {}, 'marks': [], 'lengths': {k: round(length(v), 1) for k, v in E.items()}}
	# sleeve (ch. 6): cap from the front armhole; its height from the shoulder tip's level to the underarm, less X-S1
	S, U = t['S'], t['U']
	# the sleeve paper's fold lies on the top's side line (U on the fold); X is level with the shoulder tip, S1 1 1/4 in below it
	cap_h = (U[1] - S[1]) - 1.25
	A_y = 0.5 * (U[1] - S[1])  # A halfway X-U
	fa = t['front_arm']
	x_at_A = fa[np.argmin(np.abs(fa[:, 1] - (S[1] + A_y))), 0]
	C1x = (U[0] - x_at_A) + SIZE10['a_c1']  # the traced armhole at A, then A-C1 3/4 in beyond it
	arm_len = length(t['front_arm'])
	wrist_half = SIZE10['half_wrist']
	L = M['arm']

	def cap_for(half_bicep):
		S1s = np.array([0.0, 1.25])
		Ac = np.array([C1x, A_y])
		U1 = np.array([half_bicep, 1.25 + cap_h])
		return spline([S1s, S1s + [0.25, 0], Ac, U1 - norm(U1 - Ac) * 0.25, U1], start_dir=(1, 0)), U1
	lo, hi = 2.0, 8.0
	for _ in range(50):
		hb = (lo + hi) / 2
		if length(cap_for(hb)[0]) < arm_len:
			lo = hb
		else:
			hi = hb
	half_cap, U1 = cap_for(hb)
	scale = hb / SIZE10['half_bicep']
	W1 = np.array([wrist_half * scale, 1.25 + L - 0.5])  # four-way: 1/2 in out of the cap (p. 110), so out of the whole length
	under = spline([U1, U1 + 0.6 * (W1 - U1) + np.array([-0.15, 0]), W1], end_dir=(0, 1))
	mirror = np.array([-1.0, 1.0])
	Sl = {'cap': np.vstack([(half_cap * mirror)[::-1], half_cap[1:]]), 'underarm_f': under, 'wrist': even(np.vstack([W1, W1 * mirror])), 'underarm_b': (under * mirror)[::-1]}
	y_w = W1[1]
	Sl = {k: even(np.asarray(v, float) * np.array([IN, -IN]) + np.array([0, y_w * IN]), 0.5) for k, v in Sl.items()}
	pieces['sleeve'] = {'edges': {k: np.round(v, 3).tolist() for k, v in Sl.items()}, 'variants': {}, 'marks': [], 'lengths': {k: round(length(v), 1) for k, v in Sl.items()}}
	return {'source': 'draft_cole.py', 'method': 'Cole, Patternmaking with Stretch Knit Fabrics: ch. 5 foundations, ch. 11 leg-line panty, ch. 12 one-piece, ch. 6 sleeve',
		'size': f'cole-{body}', 'measures_in': {k: round(v, 2) for k, v in M.items()}, 'sleeve_half_bicep_in': round(hb, 2), 'units': 'mm', 'seam_allowance': 0,
		'grain': 'vertical', 'cut': {'front': 'fold', 'back': 'fold', 'sleeve': 'two mirrored'},
		'seams': [['front', 'shoulder', 'back', 'shoulder'], ['front', 'side', 'back', 'side'], ['front', 'crotch', 'back', 'crotch'], ['sleeve', 'underarm_f', 'sleeve', 'underarm_b']], 'pieces': pieces}


def main():
	body = sys.argv[1] if len(sys.argv) > 1 else 'young'
	res = draft(body)
	os.makedirs(OUT, exist_ok=True)
	path = os.path.join(OUT, f'cole-{body}.json')
	with open(path, 'w', encoding='utf-8', newline='\n') as f:
		json.dump(res, f, separators=(',', ':'))
	print('measures (in)', res['measures_in'], 'half bicep', res['sleeve_half_bicep_in'])
	for n, p in res['pieces'].items():
		print(n, p['lengths'])
	print('wrote', path)


if __name__ == '__main__':
	main()
