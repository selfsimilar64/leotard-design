"""Draft a leotard block by Joseph-Armstrong's textbook method (knowledge/domain/construction/armstrong-leotard-foundation-draft.md).

Owned outright: every number comes from the book's method and its standard measurement chart, or from the body's own arm, never
from a bought pattern. Chain: basic back bodice draft (book p. 48-49) -> leotard foundation (p. 756-758), with its basic and
high-cut leg -> Lycra sleeve (p. 750). The book's freehand curves ("draw a curved line through...") are our own cubic curves
through the book's named points; that rule is ours, not the book's.

The book's draft includes 3/8 in seams on every edge but the fold. The fit solver wants stitching lines, so each outline is
inset by 3/8 in (except the centre fold) after drafting. [INFERRED: see the knowledge note.]

    python pipeline/draft_armstrong.py [size] [body]     writes assets/blocks/armstrong-<size>.json (git-ignored, like the others)
Default size 6 (the chart size nearest the `young` body: bust 34 in / 86.4 cm), body young (for the arm).
Then fit: python pipeline/wrap_block.py --drafted armstrong-6 young
"""
import json
import math
import os
import sys

import numpy as np
from scipy.interpolate import CubicSpline

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'blocks')
MEASURES = os.path.join(HERE, '..', 'app', 'captures', 'wrap-measures.json')
IN = 25.4  # mm
SEAM = 3 / 8  # in, included in the book's leotard draft
STEP = 0.5 / IN  # in between stored points

# The book's Standard Measurement Chart (p. 40) and Sleeve Measurement Chart (p. 62), inches, ease not included.
# Only the entries the leotard chain uses. Keys are the chart's numbers.
CHART = {
	'6': {'5b': 16.25, '6b': 16.75, '7b': 16 + 5 / 16, '11': 8.125, '12': 2.625, '13': 5.125, '14b': 7.75, '16': 6.75, '18': 8.125,
		'19f': 6.5, '19b': 6.125, '23f': 8.625, '28': 24.5, 'sleeve': 21.5, 'cap': 5.5, 'height_in': 66.0},
	'8': {'5b': 16.5, '6b': 17.125, '7b': 16.625, '11': 8.25, '12': 2.875, '13': 5 + 3 / 16, '14b': 7.875, '16': 6.875, '18': 8.375,
		'19f': 6.75, '19b': 6.375, '23f': 8.875, '28': 25.25, 'sleeve': 21.75, 'cap': 5.625, 'height_in': 66.0},
	'10': {'5b': 16.75, '6b': 17.5, '7b': 17.0, '11': 8.375, '12': 3.0, '13': 5.25, '14b': 8.0, '16': 7.0, '18': 8.625,
		'19f': 7.0, '19b': 6.625, '23f': 9.125, '28': 26.0, 'sleeve': 22.0, 'cap': 5.75, 'height_in': 66.0},
}


def norm(v):
	v = np.asarray(v, float)
	return v / (np.linalg.norm(v) or 1)


def even(line, step=STEP):
	line = np.asarray(line, float)
	s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(line, axis=0), axis=1))])
	t = np.linspace(0, s[-1], max(2, int(s[-1] / step) + 1))
	return np.column_stack([np.interp(t, s, line[:, 0]), np.interp(t, s, line[:, 1])])


def length(p):
	return float(np.linalg.norm(np.diff(p, axis=0), axis=1).sum())


def bezier(p0, t0, a, p3, t3, b):
	p0, p3 = np.asarray(p0, float), np.asarray(p3, float)
	c1, c2 = p0 + norm(t0) * a, p3 - norm(t3) * b
	u = np.linspace(0, 1, 400)[:, None]
	return even((1 - u) ** 3 * p0 + 3 * u * (1 - u) ** 2 * c1 + 3 * u * u * (1 - u) * c2 + u ** 3 * p3)


def through(p0, t0, p3, t3, target, scale):
	"""A cubic p0 -> p3 with given end directions whose handles (both scale * chord * k) are chosen so it passes nearest target."""
	chord = np.linalg.norm(np.asarray(p3) - np.asarray(p0))
	best = None
	for k in np.linspace(0.05, 0.95, 91):
		c = bezier(p0, t0, k * chord * scale[0], p3, t3, k * chord * scale[1])
		d = np.linalg.norm(c - target, axis=1).min()
		if best is None or d < best[0]:
			best = (d, c)
	return best[1]


def spline(points, start_dir=None, end_dir=None):
	"""A smooth curve through points (by chord length), optionally leaving / arriving along given directions."""
	P = np.asarray(points, float)
	s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
	if start_dir is None and end_dir is None:
		bc = 'natural'
	else:
		L = s[-1]
		a = norm(start_dir) if start_dir is not None else None
		b = norm(end_dir) if end_dir is not None else None
		bc = ((1, a) if a is not None else (2, np.zeros(2)), (1, b) if b is not None else (2, np.zeros(2)))
	f = CubicSpline(s, P, bc_type=bc)
	return even(f(np.linspace(0, s[-1], 600)))


# ---- inset: from cutting line to stitching line ------------------------------------------------------------------------
def offset(e, d):
	"""A polyline moved d to the right of its direction of travel (the inside, for this block's clockwise outlines)."""
	t = np.gradient(e, axis=0)
	t /= np.linalg.norm(t, axis=1, keepdims=True)
	return e + d * np.column_stack([t[:, 1], -t[:, 0]])


def seg_hit(a0, a1, b0, b1):
	r, s = a1 - a0, b1 - b0
	den = r[0] * s[1] - r[1] * s[0]
	if abs(den) < 1e-12:
		return None
	q = b0 - a0
	t = (q[0] * s[1] - q[1] * s[0]) / den
	u = (q[0] * r[1] - q[1] * r[0]) / den
	return t, u


def join(e1, e2):
	"""Trim or extend e1's end and e2's start to where they cross."""
	n1, n2 = len(e1), len(e2)
	for i in range(n1 - 2, max(-1, n1 - 2 - n1 // 2), -1):  # from e1's end back, e2's start on
		for j in range(0, min(n2 - 1, n2 // 2)):
			h = seg_hit(e1[i], e1[i + 1], e2[j], e2[j + 1])
			if h and 0 <= h[0] <= 1 and 0 <= h[1] <= 1:
				p = e1[i] + h[0] * (e1[i + 1] - e1[i])
				return np.vstack([e1[:i + 1], p]), np.vstack([p, e2[j + 1:]])
	h = seg_hit(e1[-2], e1[-1], e2[0], e2[1])  # no crossing: extend the end tangents
	p = e1[-2] + h[0] * (e1[-1] - e1[-2])
	return np.vstack([e1[:-1], p]), np.vstack([p, e2[1:]])


def inset(edges, order, d, keep=('centre',)):
	E = {k: (edges[k].copy() if k in keep else offset(edges[k], d)) for k in order}
	for a, b in zip(order, order[1:] + order[:1]):
		E[a], E[b] = join(E[a], E[b])
	return {k: even(v) for k, v in E.items()}


# ---- the drafts ------------------------------------------------------------------------------------------------------------
def back_bodice(c):
	"""Basic back bodice (book p. 48-49), centre back on x = 0, centre back waist at the origin, inches.
	The shoulder dart is left out, the shoulder kept at its own length (13): the leotard folds that dart away (p. 756, fig. 1a)."""
	A, D = np.array([0, c['6b']]), np.array([0, c['5b']])
	Cx = c['14b']
	E = np.array([c['18'] + 0.75, 0])
	F = np.array([c['12'] + 1 / 8, c['6b']])
	sl = c['7b'] + 1 / 8  # B to G = shoulder slope + 1/8, G on the line squared down from C
	G = np.array([Cx, math.sqrt(sl * sl - Cx * Cx)])
	H = F + c['13'] * norm(G - F)  # shoulder tip, dart folded out
	M_y = -3 / 16
	Mx = c['19b'] + 1.5 + 0.25  # B to J = waist arc + dart intake + ease; M squared down from J
	N = np.array([E[0], M_y + math.sqrt(c['11'] ** 2 - (E[0] - Mx) ** 2)])  # M to N = side length, N on the line up from E
	S_y = D[1] - D[1] / 4
	T = np.array([c['16'] + 0.25, S_y])
	corner = np.array([F[0], D[1]])
	angle = corner + np.array([-1, 1]) * (3 / 8) / math.sqrt(2)
	return dict(D=D, F=F, H=H, T=T, N=N, angle=angle)


def leotard(c, cut='basic', shift=0.0, crotch_half=1.75):
	"""shift (in): the crotch seam moved forward, the front's crotch raised and the back's lowered by it, legs drawn to the moved
	points by the same rules; crotch_half (in): the crotch's half width. Defaults are the book's (draft_hybrid.py sets both)."""
	b = back_bodice(c)
	sh = lambda p: np.asarray(p, float) - np.array([SEAM, 0])  # back pattern laid 3/8 in past the centre line
	D_, F, H, T, Nb = (sh(b[k]) for k in ('D', 'F', 'H', 'T', 'N'))
	angle = sh(b['angle'])
	C = np.array([0.0, 1.5])  # waist raised 1 1/2 in
	Dw = np.array([c['19f'] - 0.5, C[1]])  # C to D = front waist arc - 1/2
	# the bodice armhole as drafted (p. 49, fig. 10: through H and T, level at the armpit N)
	along = norm(H - F)
	down = np.array([along[1], -along[0]])  # square to the shoulder, into the armhole
	if down[1] > 0:
		down = -down
	old = np.vstack([bezier(H, down, 0.4 * np.linalg.norm(T - H), T, (0, -1), 0.35 * np.linalg.norm(T - H)),
		bezier(T, (0, -1), 0.5 * np.linalg.norm(Nb - T), Nb, (1, 0), 0.5 * np.linalg.norm(Nb - T))[1:]])
	# p. 757 fig. 3: the side line from D ends 1 in above the old armpit, on the old armhole (dashed there), which is blended to
	# it: the armhole is raised 1 in. (Read from the figure; the text says "1 inch past B".)
	cut_at = int(np.argmin(np.abs(old[:, 1] - (Nb[1] + 1.0)) + 1e3 * (old[:, 1] > T[1])))  # on the armhole's lower part, below T
	B2 = old[cut_at]
	E = np.array([0.0, C[1] - (c['28'] / 2 - 1.25)])  # C to E = half crotch length - 1 1/4
	Fh = np.array([0.0, E[1] + (C[1] - E[1]) / 2 + 1])  # hip level
	G = np.array([c['23f'] - 0.5, Fh[1]])  # F to G = front hip arc - 1/2
	Hc = np.array([crotch_half, E[1]])  # crotch half width
	up = -down  # the neck arrives square to the shoulder
	pieces = {}
	side_dir = norm(Dw - B2)
	inward = np.array([side_dir[1], -side_dir[0]])
	if inward[0] > 0:
		inward = -inward  # towards the fold
	armhole = even(old[:cut_at + 1])  # the old armhole, ending at the raised armpit
	shoulder = even(np.vstack([F, H]))

	Gx = G + np.array([-SEAM, 0.5])  # crossmark 3/8 in and up 1/2 in from G: where the basic leg leaves the side

	for name in ('front', 'back'):
		dy = shift if name == 'front' else -shift
		I, Ec = Hc + np.array([0, dy]), E + np.array([0, dy])  # this piece's crotch point and crotch on the fold
		# side seam: armpit -> waist (front bowed in 3/16 in, back straight) -> hip -> leg end
		if name == 'front':
			mid = (B2 + Dw) / 2 + 3 / 16 * inward
			pts = [B2, mid, Dw]
		else:
			pts = [B2, (B2 + Dw) / 2, Dw]
		side = spline(pts + [Gx], start_dir=side_dir)
		if cut == 'basic':
			leg_end = Gx
		else:  # high cut (p. 758): G at the midpoint of the side hip, on this same side seam
			leg_end = side[np.argmin(np.abs(side[:, 1] - (Dw[1] + G[1]) / 2))]
		if name == 'front':
			if cut == 'basic':
				corner = np.array([I[0], Fh[1]])
				target = corner + np.array([1, -1]) * 1.375 / math.sqrt(2)
				low = I + np.array([0, 2.0])
				t0 = norm(np.array([-1.0, -0.6]))
				curve = through(leg_end, t0, low, (0, -1), target, (1.0, 1.0))
				leg = even(np.vstack([curve, I]))
			else:
				t0 = norm(I - leg_end) + np.array([0, -0.6])
				leg = bezier(leg_end, t0, 0.45 * np.linalg.norm(I - leg_end), I, (0, -1), 0.5 * np.linalg.norm(I - leg_end))
		else:
			Iq = I + np.array([0, SEAM])
			chord = Iq - leg_end
			n = norm(np.array([chord[1], -chord[0]]))
			if n[0] < 0:  # out towards the leg, away from the piece
				n = -n
			K = (leg_end + Iq) / 2 + n * (1.0 if cut == 'basic' else 0.25)
			leg = spline([leg_end, K, Iq, I], start_dir=norm(chord), end_dir=(0, -1))
		crotch = even(np.vstack([I, Ec]))
		centre_top = D_[1] if name == 'back' else D_[1] - 1.5  # front neckline 1 1/2 in below the back's
		start = np.array([0.0, centre_top])
		if name == 'back':
			neck = through(start, (1, 0), F, up, angle, (1.0, 1.0))
		else:
			neck = bezier(start, (1, 0), 0.55 * F[0], F, up, 0.35 * (F[1] - start[1]))
		centre = even(np.vstack([Ec, start]))
		pieces[name] = {'neck': neck, 'shoulder': shoulder, 'armhole': armhole, 'side': side, 'leg': leg, 'crotch': crotch, 'centre': centre}
	return pieces


def sleeve(c, armhole_len, arm_mm, wrist_mm, height_mm):
	"""Lycra sleeve (p. 750), on the fold: both cap halves from the same armhole measurement. Inches."""
	L = c['sleeve'] * (height_mm / IN) / c['height_in'] - 0.5  # the chart's length, scaled to this body's height; less the 1/2 in hem
	cap = 0.75 * c['cap']
	A, Cb = np.array([0.0, L]), L - cap
	Ex = math.sqrt(armhole_len ** 2 - cap ** 2)
	E = np.array([Ex, Cb])
	ch = E - A
	nrm = norm(np.array([ch[1], -ch[0]]))
	if nrm[1] < 0:
		nrm = -nrm  # out of the sleeve, up
	p1, p2 = A + ch / 3 + nrm * 0.5, A + 2 * ch / 3 - nrm * 0.25
	wrist_m = wrist_mm / IN + 0.75
	G = np.array([wrist_m / 2 + 0.5, 0.0])
	half_cap = spline([A, p1, p2, E], start_dir=(1, 0))
	elbow_y = Cb / 2
	el = E + (G - E) * ((E[1] - elbow_y) / (E[1] - G[1]))
	under = spline([E, el - np.array([0.5, 0]), G])
	m = np.array([-1.0, 1.0])
	capfull = np.vstack([(half_cap * m)[::-1], half_cap[1:]])
	wrist = even(np.vstack([G, G * m]))
	return {'cap': capfull, 'underarm_f': under, 'wrist': wrist, 'underarm_b': (under * m)[::-1]}


ORDER = ['neck', 'shoulder', 'armhole', 'side', 'leg', 'crotch', 'centre']
SLEEVE_ORDER = ['cap', 'underarm_f', 'wrist', 'underarm_b']


def arclen(p):
	return np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(p, axis=0), axis=1))])


def draft(size='6', body='young', shift=0.0, crotch_half=1.75):
	c = CHART[size]
	with open(MEASURES, encoding='utf-8') as f:
		m = json.load(f)[body]
	basic, high = leotard(c, 'basic', shift, crotch_half), leotard(c, 'high', shift, crotch_half)
	pieces = {}
	for name in ('front', 'back'):
		b = inset(basic[name], ORDER, SEAM)
		h = inset(high[name], ORDER, SEAM)
		y0 = b['crotch'][:, 1].min()  # crotch at y = 0
		shift = lambda e: (e - np.array([0, y0])) * IN
		edges = {k: shift(v) for k, v in b.items()}
		hl = shift(h['leg'])
		# the fitter cuts the basic side at side_to and starts the high leg there
		s = arclen(edges['side'])
		side_to = float(s[np.argmin(np.linalg.norm(edges['side'] - hl[0], axis=1))])
		pieces[name] = {'edges': edges, 'high': {'leg': hl, 'side_to': side_to}}
	arm_len = length(basic['back']['armhole'])  # measured on the drafted pattern (cutting line), as the book does
	sl = sleeve(c, arm_len, m['armLength'], m['wrist'], m['height'])
	sl = inset({k: v for k, v in sl.items()}, SLEEVE_ORDER, SEAM, keep=())
	pieces['sleeve'] = {'edges': {k: v * IN for k, v in sl.items()}}
	res = {'source': 'draft_armstrong.py', 'method': 'Joseph-Armstrong 5/e: back bodice p.48-49, leotard p.756-758, Lycra sleeve p.750',
		'size': f'armstrong-{size}', 'chart_size': size, 'arm_from': body, 'units': 'mm', 'seam_allowance': 0, 'grain': 'vertical',
		'cut': {'front': 'fold', 'back': 'fold', 'sleeve': 'two mirrored'},
		'seams': [['front', 'shoulder', 'back', 'shoulder'], ['front', 'side', 'back', 'side'], ['front', 'crotch', 'back', 'crotch'], ['sleeve', 'underarm_f', 'sleeve', 'underarm_b']], 'pieces': {}}
	for name, p in pieces.items():
		E = {k: np.round(v, 3).tolist() for k, v in p['edges'].items()}
		V = {'high_hips': {'leg': np.round(p['high']['leg'], 3).tolist(), 'side_to': round(p['high']['side_to'], 2), 'length': round(length(p['high']['leg']), 1)}} if 'high' in p else {}
		res['pieces'][name] = {'edges': E, 'variants': V, 'marks': [], 'lengths': {k: round(length(np.asarray(v)), 1) for k, v in p['edges'].items()}}
	return res


def main():
	size = sys.argv[1] if len(sys.argv) > 1 else '6'
	body = sys.argv[2] if len(sys.argv) > 2 else 'young'
	res = draft(size, body)
	os.makedirs(OUT, exist_ok=True)
	path = os.path.join(OUT, f'armstrong-{size}.json')
	with open(path, 'w', encoding='utf-8', newline='\n') as f:
		json.dump(res, f, separators=(',', ':'))
	for n, p in res['pieces'].items():
		print(n, p['lengths'])
	print('wrote', path)


if __name__ == '__main__':
	main()
