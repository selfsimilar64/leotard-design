"""A design made from a block by pattern changes: a tank leotard (owner, 2026-11-11: "visualize this on a tank leo, so that we can see
the effect of the elastic on the neck and armholes and leg holes in the different poses").

The block's own front and back are recut and the sleeve left off; every other line (neck, side seams, high-cut legs, crotch) stays the
block's. wrap_block.py fits it from the block's fit, as it fits any cut:
    WRAP_REUSE_BASE=1 python pipeline/wrap_block.py --drafted hybrid-6 young --design tank
writes app/captures/wrap-hybrid-6-tank-resolved.json (git-ignored; shown in the app in dev only, garment/fitted.js LOCAL). A preview
for looking at turned elastic at every opening, not a drafted product.

Numbers, all in the block's flat frame (mm, stitching lines), as design_strappy.py takes them (the same recipe can be laid on another
block; none from a bought pattern):
- ARM_DROP 25.4: the side seam's top lowered 1 in. Armstrong's leotard raises the armpit 1 in for its set-in sleeve
  (draft_armstrong.leotard); without a sleeve it goes back to the bodice's armpit (as design_strappy.ARM_DROP).
- SHOULDER 50.8: the shoulder seam kept for 2 in from the neck: the tank's strap where it crosses the shoulder. [INFERRED] a common
  tank width, by eye; no source in the bundle gives one.
- The armholes: a curve from the strap's outer end to the new armpit, leaving the shoulder downwards and arriving across the side
  seam; the front cut deeper and rounder than the back, as a bodice's armholes are. [INFERRED], by eye.
- ELASTIC: armholes 0.9 of the edge, within the 75-100% the sources give (knowledge/domain/construction/edge-finishing-elastic-and-
  binding.md); the neck and legs keep the block's (neck 0.95, front leg 1:1, back leg 3/4). Turned elastic at every opening.
"""
import numpy as np

from design_strappy import arclen, at, trim, bezier

ARM_DROP = 25.4
SHOULDER = 50.8
# per piece: the curve's direction leaving the shoulder and arriving at the armpit, and its handles (shares of the chord)
ARMHOLE = {'front': ((0.15, -1), (1, -0.35), 0.45, 0.45), 'back': ((0.4, -1), (1, -0.55), 0.4, 0.4)}
ELASTIC = {('front', 'armhole'): 0.9, ('back', 'armhole'): 0.9}


def apply(raw):
	"""The block's front and back edges (wrap_block design(): each in order neck, shoulder, armhole, side, leg, crotch, centre) ->
	the tank's. The edge names keep their places round the piece."""
	out = {}
	for name in ('front', 'back'):
		w = {k: v.copy() for k, v in raw[name].items()}
		side = w['side']
		w['side'] = trim(side, ARM_DROP, float(arclen(side)[-1]))
		top = w['side'][0]  # the new armpit
		w['shoulder'] = trim(w['shoulder'], 0, SHOULDER)  # from the neck point outwards
		end = w['shoulder'][-1]
		t0, t1, a, b = ARMHOLE[name]
		d = float(np.linalg.norm(top - end))
		w['armhole'] = bezier(end, t0, a * d, top, t1, b * d)
		out[name] = w
	return out
