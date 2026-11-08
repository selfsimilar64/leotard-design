"""Hybrid leotard block: Armstrong's leotard (draft_armstrong.py) with its crotch seam moved forward and its crotch narrowed.

Owner's read of the fits on `young` (2026-11-08): Armstrong best for torso, seat and sleeve; the purchased high cut and Aldrich's
bodyshaper best for the crotch. What those two share and Armstrong lacks: the crotch seam sits forward, the back running further
through the crotch than the front (Aldrich joins the gusset to the back). Here the book's own construction is run with its crotch
points moved: the front's crotch raised by SHIFT and the back's lowered by it, and every leg line (basic and high cut, front and
back) drawn to the moved point by the book's rules (draft_armstrong.leotard, shift / crotch_half). Torso, seat, sleeve: Armstrong's.

Two numbers are taken from the purchased block (XS) as targets; none of its lines (foundation-blocks-must-be-shippable):
- SHIFT, measured where front and back meet at the same body height, the armpit (top of the side seam, sewn front to back).
  Above the crotch, Armstrong's armpit is at the same height on both pieces (456 mm); the purchased block's is 58 mm higher on the
  back (481 / 539), Aldrich size 6's 158 mm (402 / 559). Moving the seam by SHIFT adds 2 x SHIFT, so SHIFT = 58 / 2 = 29 mm.
  (Centre lengths mislead: they carry the neck depths.)
- CROTCH_HALF: the purchased crotch is 29.3 mm half width on the stitching line; Armstrong's 1 3/4 in cutting line gives 34.9 mm,
  and Aldrich, Cole and Richardson all give 35-38 mm. 1 1/2 in on the cutting line gives 28.6 mm.

First version (same day) moved a strip from the front to the back instead and trimmed the legs; that cut away the steep rise of
the book's high front leg out of the crotch, and the fitted front leg line sat 8-17 mm wider each side than the purchased one.

    python pipeline/draft_hybrid.py      writes assets/blocks/hybrid-6.json (git-ignored, like the others)
Then fit: python pipeline/wrap_block.py --drafted hybrid-6 young
"""
import json
import os

from draft_armstrong import draft as armstrong, IN

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'blocks')
SHIFT = 29.0  # mm, front to back
CROTCH_HALF = 1.5  # in, cutting line (Armstrong: 1 3/4)


def draft():
	res = armstrong('6', 'young', shift=SHIFT / IN, crotch_half=CROTCH_HALF)
	res.update(source='draft_hybrid.py', size='hybrid-6', shift_mm=SHIFT, crotch_half_in=CROTCH_HALF,
		method=res['method'] + f'; crotch seam moved {SHIFT:g} mm forward and crotch half width {CROTCH_HALF:g} in, legs drawn to the moved points')
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
