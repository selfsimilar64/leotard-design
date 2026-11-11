"""A design made from a block by pattern changes: the strappy-back leotard (owner's illustration, 2026-11-10).

The block's own front and back are recut as a pattern maker recuts a block, and a strap is added as a piece of its own; every
other line (side seams, high-cut legs, crotch) stays the block's. wrap_block.py fits it from the block's fit, as it fits any cut:
    python pipeline/wrap_block.py --drafted hybrid-6 young --design strappy
writes app/captures/wrap-hybrid-6-strappy-resolved.json (git-ignored; shown in the app in dev only, garment/fitted.js LOCAL).

What the illustration shows (front and back flat sketches; the photos of a similar leotard only for how it sits):
- sleeveless; a thin strap each side, bound in the same white as the edges and running on from them;
- front: a high, shallow neckline from strap to strap; armholes cut in from the strap's foot to the side seam;
- back: open above a straight edge across the back at the top of the side seams; each strap runs from the shoulder, close to
  the neck, down and inwards to that edge near centre back (the curves outside the straps in the back view are the front's
  armholes seen from behind; first read as the straps reaching the edge near the side);
- white binding on the neckline, armholes and back edge; the legs (the block's high cut) unbound.
The owner (2026-11-10): new edges taut, for a snug fit as in the photos; straps as drawn.

Numbers, all in the block's flat frame (mm, stitching lines). Read off the illustration as proportions of the block's own
landmarks, so the same recipe can be laid on another block; none from a bought pattern:
- STRAP_W 9.5: the strap is 3/8 in elastic covered in fabric (Porter, knowledge/domain/construction/back-strap-and-keyhole-
  formulas.md: straps are fabric-covered elastic, 3/8 in the usual width); about the drawn strap's width against the body.
- ARM_DROP 25.4: the side seam's top lowered 1 in. Armstrong's leotard raises the armpit 1 in for its set-in sleeve
  (draft_armstrong.leotard); without a sleeve it goes back to the bodice's armpit. [INFERRED] The drawn armholes end at the
  same height as the back edge, at the top of the side seams.
- CROSS 20: where the strap crosses the shoulder seam, mm along it from the neck point: the drawn straps leave the shoulder
  close to the neck (front: about half the half-width at the armpit from centre front).
- FRONT_FOOT 1/3, FRONT_NECK 0.46: the strap's foot in front, and the neckline at centre front, as shares of the height from
  the shoulder crossing down to the new armpit (drawing: 40 / 120 and 55 / 120).
- BACK_IN 38.1: the back strap's inner edge 1 1/2 in from centre back, Porter's least clearance from centre back for strappy
  backs (knowledge/domain/construction/back-strap-and-keyhole-formulas.md). The drawing puts the feet a little closer (inner
  edge about 10% of the back's half width from the centre, about 16 mm here); owner, 2026-11-10: the straps should reach closer to
  the centre, as drawn, not run out under the armpit.
  History: first placed near the side as misread from the drawing (outer edge 20% of the half width in from the side seam, then
  Porter's 2 in from a side seam). The fit then slid each strap about 5 cm out along the shoulder (74 to 123 mm from the centre)
  until the straps were held by friction (wrap_block.MU on the strap's points).
- ELASTIC: binding and strap elastic cut to 85% of the edge, Treasurie's starting rule (knowledge/domain/construction/edge-
  finishing-elastic-and-binding.md: 75-100% across sources), at the owner's "taut, snug" rather than the looser 95% the block's
  neck has. The legs keep the block's (front 1:1, back 3/4).
"""
import numpy as np

STRAP_W = 9.5
ARM_DROP = 25.4
CROSS = 20.0
FRONT_FOOT = 1 / 3
FRONT_NECK = 0.46
BACK_IN = 38.1
# the front armhole, from the strap's foot to the new armpit: its direction leaving each end and its handles (shares of the chord).
# Owner, 2026-11-10, on the first fit: "a little more of the bust should be covered, further towards the armpit". The first curve,
# (0.1, -1) / (1, -0.3) / (0.5, 0.45), dropped straight from the foot and swept out low; this one leaves it outwards and arrives
# rising, 16-19 mm wider each side 60-100 mm above the armpit (front half width 114 / 124 mm at y 460 / 440, was 98 / 105).
ARM_START, ARM_END, ARM_HANDLES = (0.3, -1), (1, -0.7), (0.35, 0.35)
TAUT = 0.85
ELASTIC = {('front', 'neck'): TAUT, ('back', 'neck'): TAUT, ('front', 'armhole'): TAUT, ('back', 'armhole'): TAUT,
	('strap', 'inner'): TAUT, ('strap', 'outer'): TAUT}
BOUND = ('neck', 'armhole')  # the openings finished with the white binding (the legs keep turned elastic)


def arclen(p):
	return np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(p, axis=0), axis=1))])


def at(poly, d):
	s = arclen(poly)
	return np.array([np.interp(d, s, poly[:, i]) for i in range(2)])


def trim(poly, a, b):
	s = arclen(poly)
	keep = (s > a) & (s < b)
	return np.vstack([at(poly, a), poly[keep], at(poly, b)])


def even(line, step=0.5):
	line = np.asarray(line, float)
	s = arclen(line)
	t = np.linspace(0, s[-1], max(2, int(s[-1] / step) + 1))
	return np.column_stack([np.interp(t, s, line[:, 0]), np.interp(t, s, line[:, 1])])


def norm(v):
	v = np.asarray(v, float)
	return v / (np.linalg.norm(v) or 1)


def bezier(p0, t0, a, p3, t3, b):
	p0, p3 = np.asarray(p0, float), np.asarray(p3, float)
	c1, c2 = p0 + norm(t0) * a, p3 - norm(t3) * b
	u = np.linspace(0, 1, 400)[:, None]
	return even((1 - u) ** 3 * p0 + 3 * u * (1 - u) ** 2 * c1 + 3 * u * u * (1 - u) * c2 + u ** 3 * p3)


def line(a, b):
	return even(np.vstack([a, b]))


def apply(raw):
	"""The block's front and back edges (wrap_block design(): each in order neck, shoulder, armhole, side, leg, crotch, centre,
	the neck starting on the fold) -> the strappy design's, plus the strap. The edge names keep their places round the piece:
	neck runs from the fold to the strap, shoulder is where the strap is sewn on, armhole runs from the strap to the side seam.
	Returns (raw, path): path is where the strap lies on the block, for its start (wrap_block from_block)."""
	f, b = raw['front'], raw['back']
	out, path = {}, {}
	for name, w in (('front', f), ('back', b)):
		w = {k: v.copy() for k, v in w.items()}
		side = w['side']
		w['side'] = trim(side, ARM_DROP, float(arclen(side)[-1]))
		top = w['side'][0]  # the new armpit
		cross = at(w['shoulder'], CROSS)  # the strap over the shoulder seam (front and back shoulders are sewn point to point)
		if name == 'front':
			drop = cross[1] - top[1]
			foot = np.array([cross[0], cross[1] - FRONT_FOOT * drop])  # the strap hangs straight down in front
			inner, outer = foot - [STRAP_W / 2, 0], foot + [STRAP_W / 2, 0]
			cf = np.array([0.0, cross[1] - FRONT_NECK * drop])
			w['neck'] = bezier(cf, (1, 0), 0.55 * inner[0], inner, (0.35, 1), 0.6 * (inner[1] - cf[1]))
			d = np.linalg.norm(top - outer)
			w['armhole'] = bezier(outer, ARM_START, ARM_HANDLES[0] * d, top, ARM_END, ARM_HANDLES[1] * d)
		else:
			y = top[1]
			inner = np.array([BACK_IN, y])
			outer = inner + [STRAP_W, 0]
			cf = np.array([0.0, y])
			foot = (inner + outer) / 2
			w['neck'] = line(cf, inner)
			w['armhole'] = line(outer, top)
		w['shoulder'] = line(inner, outer)
		w['centre'] = line(w['centre'][0], cf)
		out[name] = w
		path[name] = (cross, foot)
	# the strap: its length the path over the block from foot to foot, through the shoulder crossing, measured on the flat pattern
	# as a pattern maker measures it; its elastic (ELASTIC) is what makes it snug. Laid out with x across (0 at the neck side) and
	# y along, from the back's foot (0) to the front's (L): over the front it runs downwards, so it faces as the back does.
	L = sum(float(np.linalg.norm(c - ft)) for c, ft in path.values())
	W = STRAP_W
	out['strap'] = {'front_end': line([0, L], [W, L]), 'outer': line([W, L], [W, 0]), 'back_end': line([W, 0], [0, 0]), 'inner': line([0, 0], [0, L])}
	return out, path


def strap_flat(V, path):
	"""Each strap point (its flat x, y) -> (piece, point in that piece's flat frame) on the block: along the path from the back's foot
	up to the shoulder crossing on the back, then from the crossing down to the front's foot on the front, offset across it."""
	(cb, fb), (cf, ff) = path['back'], path['front']
	lb, lf = float(np.linalg.norm(cb - fb)), float(np.linalg.norm(cf - ff))
	L = float(V[:, 1].max())
	out = []
	for x, y in V:
		s = y / L * (lb + lf)
		if s <= lb:
			piece, a, c, t = 'back', fb, cb, s / lb
		else:
			piece, a, c, t = 'front', cf, ff, (s - lb) / lf
		d = norm(c - a)
		n = np.array([d[1], -d[0]])
		if n[0] < 0:
			n = -n  # outwards, away from the fold
		out.append((piece, a + (c - a) * t + n * (x - STRAP_W / 2)))
	return out
