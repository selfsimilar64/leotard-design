---
type: Technique
title: Designs recut from a fitted block (strappy back preview)
description: "2026-11-10: the first design made on a fitted block instead of the drawn pieces: the owner's strappy-back illustration recut from the hybrid high cut as pattern changes (sleeve off, cut-in armholes, shallow neck, low straight back, thin straps as their own piece, 85% binding elastic), fitted offline from the block's fit and shown in the app in dev only with white binding and straps."
tags: [fit, block, design, straps, binding, preview]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-10T22:00:00Z }
sources:
  - id: owner
    resource: "conversation with the product owner, 2026-11-10 (Claude Code session): the strappy design re-created on the hybrid; new edges taut for a snug fit as in the photos; straps as drawn; not every design is for competition; create the preview look"
    title: Owner on the strappy-back preview
    author: human:mattj
  - id: code
    resource: "pipeline/design_strappy.py, pipeline/wrap_block.py (--design, WRAP_REUSE_BASE), app/src/garment/fitted.js (LOCAL hybrid-6-strappy, fittedTrimOf), app/src/render/fitted.js (dress, trimMaterial, finish), app/src/doc/commands-garment.js (fitted.trim), app/src/ui/ShapeCard.jsx (Garment)"
    title: Strappy design code
    author: claude-code/claude-opus-5-5
  - id: edges
    resource: /domain/construction/edge-finishing-elastic-and-binding.md
    title: Edge finishing, elastic and binding
  - id: straps
    resource: /domain/construction/back-strap-and-keyhole-formulas.md
    title: Back, strap and keyhole formulas
---

# Takeaway

**A design can be made on a fitted block by recutting the block's own flat pieces, as a pattern maker recuts a block, and fitting
the result from the block's fit.** The owner's strappy-back illustration was rebuilt this way on the
[hybrid high cut](/engineering/app/fitted-garments-in-the-app.md) as a preview.[^owner] The Silhouette options still only shape the
drawn pieces: this design is written by hand as pattern changes (`pipeline/design_strappy.py`) and fitted offline, not yet made in the
app.[^code]

# The design as pattern changes

Front and back keep the block's side seams, high-cut legs and crotch; everything above is recut, and the sleeve goes. Every number is
a proportion of the block's own landmarks read off the illustration, or a sourced rule; none is from a bought pattern.

| Change | Rule (`design_strappy.py`) |
|---|---|
| Sleeveless | Sleeve removed; side seam's top lowered 1 in (`ARM_DROP`), back to the bodice armpit Armstrong raises for the sleeve **[INFERRED]** |
| Strap | Its own piece, 3/8 in (9.5 mm) wide, the usual covered-elastic strap[^straps]; crosses the shoulder seam 20 mm from the neck point (`CROSS`); length measured on the flat block from foot to foot |
| Front | The strap's foot hangs straight below the crossing, a third of the way down to the armpit; a shallow neckline from it to centre front at 46% of that height; the armhole cut in from the foot to the new armpit |
| Back | Cut straight across at the new armpit; the strap's foot on that edge, its outer side 20% of the half width in from the side seam (`BACK_OUT`, as drawn: Porter's strappy backs keep 2 in from a side seam[^straps]) |
| Snug edges | Elastic in the neck, armhole and back-edge binding and along both strap edges at 85% of the edge (`TAUT`, Treasurie's starting rule within the sourced 75-100%[^edges]), tighter than the block's 95% neck at the owner's "taut"; legs as the block's |
| Finish | Neck (which runs on along the strap's inner edge to the back edge) and armholes (along its outer edge) marked `finish: binding`; legs turned elastic |

The strap's pattern: front end sewn to a 9.5 mm "shoulder" edge at the front's foot, back end to one on the back edge. It starts the
fit laid along its path over the block's own fitted front and back (`strap_flat`), facing as the back does (it runs downwards over the
front, `FACING`).

# Fitting it

`python pipeline/wrap_block.py --drafted hybrid-6 young --design strappy` fits the block as before (or takes it from the last run with
`WRAP_REUSE_BASE=1`, `wrap-<size>-base.npz` in `app/captures`), meshes the design's own exact lines and re-solves it for 360 iterations
from the block's fit, as every cut is fitted. Output `app/captures/wrap-hybrid-6-strappy-resolved.json`, served in dev at
`/fitted-local/`.

First fit on `young` (block taken from its own fit, 360 iterations, about 3 min on the CPU):

| | Value |
|---|---|
| Mesh | front 1487, back 1377, strap 93 points; outline within 0.53 mm of the exact lines |
| Settled, all pieces | across 1.159, along 1.064 (the hybrid high cut: 1.194 / 1.063); 0.00% inside out |
| Moved from the block's fit | mean 15.0 mm, 95% 32.8 mm; above the waist 21.3 / 34.8 (the top recut), below the hip 8.2 / 11.3 |
| In the app | GPU re-fit 300 steps (150 free on the skin, 150 with friction) in 0.6 s plus 0.4 s set-up |

Seen (front, side, back, back three-quarter on `young`, A-pose, red matte with white shiny binding): front neckline, cut-in armholes
and straps as drawn; the back edge lies flat and snug across the back at the armpits; seat and legs as the hybrid high cut, with its
faint crease at the small of the back.

**The straps slide out along the shoulder.** Each starts where the pattern puts it, beside the neck (74 mm from the centre), and ends
123 mm out (the shoulder landmark is at 147), 128 in the app; the drawing has them by the neck, the photos about mid-shoulder.
**[INFERRED]** cause: a taut strap takes the lower, shorter way over the sloping shoulder, and nothing holds it, since the offline fit
has no friction and the app's re-fit runs 150 frictionless steps before friction comes in. Porter's 2 in from the side seam for the
back foot, tried in its place, moved it in only 4 mm (119 mm), so the back foot is not the cause; the drawn position was kept. What
holds a real strap (friction against the skin, strap tension) is the thing to model next.

# In the app (dev only)

- **Strappy back (local)** in the Garment row (`garment/fitted.js` LOCAL, `bound: true`), beside the purchased block: a preview, so it
  is not shipped or offered as a starting point.
- Cells named Strap and openings marked `binding` take the design's binding look, `meta.fittedTrim` (op `fitted.trim`; default white
  shiny, the drawn edges' binding default); the Garment face shows its colour and fabric wells for a bound garment. Turned elastic stays
  in the front panel's look. The flat view lists the strap, cut 2, in the binding colour.
- The in-app GPU re-fit runs on it unchanged: the case carries its strap, seams and elastic.

# What this does not do yet

- Silhouette options do not reach a fitted block. For that, the app itself must recut, mesh and set up the fit (seams, elastic,
  straps) that `wrap_block.py` does here, with the changes written against named block points so one recipe fits every block
  **[INFERRED]**.
- Fitted on `young` only. The front and back keep the block's tension; only the edges were tightened.
- Choosing the strap in the flat view chooses the Front panel.

[^owner]: Owner on the strappy-back preview, 2026-11-10.
[^code]: Strappy design code.
[^edges]: Edge finishing, elastic and binding.
[^straps]: Back, strap and keyhole formulas.
