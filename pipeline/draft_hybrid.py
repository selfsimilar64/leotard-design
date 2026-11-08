"""Hybrid leotard block: Armstrong's leotard (draft_armstrong.py) with its crotch seam moved forward, under the body.

Owner's read of the fits on `young` (2026-11-08): Armstrong best for torso, seat and sleeve; the purchased high cut and Aldrich's
bodyshaper best for the crotch. What those two share and Armstrong lacks: the crotch seam sits forward, the back running further
through the crotch than the front. Aldrich gets it by joining the gusset to the back (draft_aldrich.py), which is the method used
here: a strip is cut off the bottom of Armstrong's front, square across at height SHIFT above the crotch line, and joined to the
bottom of the back along the old crotch seam (turned over it, so the lines run on). Torso, seat, sleeve and leg lines elsewhere
are Armstrong's, unchanged.

SHIFT: measured where front and back meet at the same body height, the armpit (top of the side seam, which is sewn front to
back). Above the crotch, Armstrong's armpit is at the same height on both pieces (456 mm); the purchased block's (XS) is 58 mm
higher on the back (481 / 539), Aldrich size 6's 158 mm (402 / 559). Moving the seam by SHIFT adds 2 x SHIFT to that difference,
so SHIFT = 58 / 2 = 29 mm. (Centre lengths mislead: they carry the neck depths.) Only that one number is taken from the bought
pattern, as a target; none of its lines (foundation-blocks-must-be-shippable).

Armstrong's basic front leg is vertical (x = 34.9 mm) for its last 50 mm, so the strip is a plain rectangle and the crotch seam
keeps Armstrong's width. The high-cut front leg flares there (about 38 mm half width at 29 mm up, against 34.9); the crotch edge is shared by both
legs, so the high front leg is re-blended over its last LEG_BLEND mm to arrive square on the new seam at the basic width, and
the back's high leg runs on through the same moved strip. [INFERRED: our rule, not a book's.]

    python pipeline/draft_hybrid.py      writes assets/blocks/hybrid-6.json (git-ignored, like the others)
Then fit: python pipeline/wrap_block.py --drafted hybrid-6 young
"""
import json
import os

import numpy as np

from draft_armstrong import draft as armstrong, length

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'blocks')
SHIFT = 29.0  # mm, front to back
LEG_BLEND = 45.0  # mm above the new seam over which the high front leg is redrawn
STEP = 0.5  # mm between stored points


def even(line, step=STEP):
	line = np.asarray(line, float)
	s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(line, axis=0), axis=1))])
	t = np.linspace(0, s[-1], max(2, int(s[-1] / step) + 1))
	return np.column_stack([np.interp(t, s, line[:, 0]), np.interp(t, s, line[:, 1])])


def cut_at(leg, y):
	"""A leg (running down to the crotch) split where it first falls to height y: (above, below), both ending exactly there."""
	i = int(np.argmax(leg[:, 1] < y))
	a, b = leg[i - 1], leg[i]
	p = a + (b - a) * (a[1] - y) / (a[1] - b[1])
	return np.vstack([leg[:i], p]), np.vstack([p, leg[i:]])


def blend_down(leg, end, over):
	"""Redraw a leg's lower part: keep it above end + over, then a cubic to `end` arriving straight down."""
	keep, _ = cut_at(leg, end[1] + over)
	p0 = keep[-1]
	t0 = keep[-1] - keep[-4]
	t0 /= np.linalg.norm(t0)
	h = np.linalg.norm(end - p0) * 0.4
	c1, c2 = p0 + t0 * h, end + np.array([0.0, 1.0]) * h
	u = np.linspace(0, 1, 400)[:, None]
	curve = (1 - u) ** 3 * p0 + 3 * u * (1 - u) ** 2 * c1 + 3 * u * u * (1 - u) * c2 + u ** 3 * end
	return even(np.vstack([keep[:-1], curve]))


def draft():
	res = armstrong('6', 'young')
	F, B = res['pieces']['front'], res['pieces']['back']
	fe = {k: np.array(v, float) for k, v in F['edges'].items()}
	be = {k: np.array(v, float) for k, v in B['edges'].items()}
	fh, bh = np.array(F['variants']['high_hips']['leg'], float), np.array(B['variants']['high_hips']['leg'], float)
	for e in (fe['leg'], be['leg']):
		assert abs(e[-1, 1]) < 1e-6, 'legs end on the crotch line'

	# front: the strip below SHIFT comes off
	leg_f, strip = cut_at(fe['leg'], SHIFT)
	xd = leg_f[-1, 0]
	turned = (strip * [1, -1])[::-1]  # the strip turned over the old crotch line, running on from the back leg's end
	turned = turned - turned[0] + be['leg'][-1]  # exact join at the old crotch point
	high_f = blend_down(fh, np.array([xd, SHIFT]), LEG_BLEND)

	front = dict(fe, leg=even(leg_f), crotch=even(np.array([[xd, SHIFT], [0.0, SHIFT]])), centre=even(np.vstack([[0.0, SHIFT], fe['centre'][fe['centre'][:, 1] > SHIFT]])))
	back = dict(be, leg=even(np.vstack([be['leg'], turned[1:]])), crotch=even(np.array([[xd, -SHIFT], [0.0, -SHIFT]])), centre=even(np.vstack([[0.0, -SHIFT], be['centre']])))
	high_b = even(np.vstack([bh, turned[1:]]))

	# each piece with its own crotch at y = 0, as the other blocks
	for edges, high, var, dy in ((front, high_f, F['variants']['high_hips'], -SHIFT), (back, high_b, B['variants']['high_hips'], SHIFT)):
		for k in edges:
			edges[k] = edges[k] + [0, dy]
		high = high + [0, dy]
		var['leg'] = np.round(high, 3).tolist()
		var['length'] = round(length(high), 1)
	for p, edges in ((F, front), (B, back)):
		p['edges'] = {k: np.round(v, 3).tolist() for k, v in edges.items()}
		p['lengths'] = {k: round(length(v), 1) for k, v in edges.items()}
	res.update(source='draft_hybrid.py', size='hybrid-6', shift_mm=SHIFT,
		method=res['method'] + f'; crotch seam moved {SHIFT:g} mm forward (front strip joined to the back, as Aldrich joins the gusset)')
	return res


def main():
	res = draft()
	os.makedirs(OUT, exist_ok=True)
	path = os.path.join(OUT, 'hybrid-6.json')
	with open(path, 'w', encoding='utf-8', newline='\n') as f:
		json.dump(res, f, separators=(',', ':'))
	for n, p in res['pieces'].items():
		print(n, p['lengths'])
	print('wrote', path)


if __name__ == '__main__':
	main()
