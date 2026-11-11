---
type: Technique
title: Designs recut from a fitted block (strappy back preview)
description: "2026-11-10: the first design made on a fitted block instead of the drawn pieces: the owner's strappy-back illustration recut from the hybrid high cut as pattern changes (sleeve off, cut-in armholes, shallow neck, low straight back, thin straps as their own piece angled in to near centre back, 85% binding elastic), fitted offline from the block's fit with friction holding the straps where they are put, and shown in the app in dev only with white binding and straps."
tags: [fit, block, design, straps, binding, preview]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-10T22:00:00Z }
sources:
  - id: owner
    resource: "conversation with the product owner, 2026-11-10 (Claude Code session): the strappy design re-created on the hybrid; new edges taut for a snug fit as in the photos; straps as drawn; not every design is for competition; create the preview look"
    title: Owner on the strappy-back preview
    author: human:mattj
  - id: owner2
    resource: "conversation with the product owner, 2026-11-10 (Claude Code session): the straps need to be closer in, and a little more of the bust covered, further towards the armpit"
    title: Owner on the first strappy fit
    author: human:mattj
  - id: owner3
    resource: "conversation with the product owner, 2026-11-10 (Claude Code session): the straps still seem too far under the armpit; in the reference images they go straight down to the back, and in the illustration they reach closer to the center"
    title: Owner on the second strappy fit
    author: human:mattj
  - id: owner4
    resource: "conversation with the product owner, 2026-11-10 (Claude Code session): a little further outward still; neither the illustration nor the photos have a jagged upward point where the straps meet the back piece, like two fangs facing upwards"
    title: Owner on the third strappy fit
    author: human:mattj
  - id: code
    resource: "pipeline/design_strappy.py, pipeline/wrap_block.py (--design, WRAP_REUSE_BASE, solve mu, case placed), app/src/fit/fitted-case.js (placed), app/src/fit/refit.js (reset), app/src/fit/refit-wgsl.js (rhs), app/src/garment/fitted.js (LOCAL hybrid-6-strappy, fittedTrimOf), app/src/render/fitted.js (dress, trimMaterial, finish), app/src/doc/commands-garment.js (fitted.trim), app/src/ui/ShapeCard.jsx (Garment)"
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
| Front | The strap's foot hangs straight below the crossing, a third of the way down to the armpit; a shallow neckline from it to centre front at 46% of that height; the armhole cut in from the foot to the new armpit (made fuller in the second fit, below) |
| Back | Cut straight across at the new armpit; the strap's foot on that edge, its inner side 3 in from centre back (`BACK_IN`; first 1 1/2 in, Porter's least clearance from centre back[^straps], then twice 3/4 in further out at the owner's eye; the drawing has it closer). Until the third fit, misread from the drawing, the foot sat near the side seam (below) |
| Snug edges | Elastic in the neck, armhole and back-edge binding and along both strap edges at 85% of the edge (`TAUT`, Treasurie's starting rule within the sourced 75-100%[^edges]), tighter than the block's 95% neck at the owner's "taut"; legs as the block's |
| Finish | Bound in two open runs from strap to strap: the front neck, and one band round both front armholes and straight across the back; the strap's own edges are openings with `finish: none` (the strap is the binding); legs turned elastic. Until the fourth fit the neck and armholes were closed loops running up the strap's edges |

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

**The straps slid out along the shoulder** in that first fit. Each starts where the pattern puts it, beside the neck (74 mm from
the centre), and ended 123 mm out (the shoulder landmark is at 147), 128 in the app; the drawing has them by the neck. Cause
**[INFERRED]**: a taut strap takes the lower, shorter way over the sloping shoulder, and nothing held it, since the offline fit had no
friction and the app's re-fit runs 150 frictionless steps before friction comes in. Porter's 2 in from the side seam for the back foot
moved it in only 4 mm (119 mm), so the drawn position was kept.

# Second fit: straps held, more bust covered (2026-11-10)

Owner on the first fit: the straps need to be closer in, and a little more of the bust covered, further towards the armpit.[^owner2]

- **Front armhole** (`ARM_START`, `ARM_END`, `ARM_HANDLES`): it now leaves the strap's foot heading outwards and reaches the armpit
  rising, in place of dropping straight down and sweeping out low: 16-19 mm more front each side 60-100 mm above the armpit (front
  half width 114 / 124 mm at 460 / 440 mm on the pattern, was 98 / 105).
- **Straps held where they are put.** A strap is placed by hand when dressing, and skin friction holds it there (a strap bent over the
  shoulder presses hard on it). `wrap_block.solve` takes friction, the GPU re-fit's model (mu 0.4 times the contact force, 1 mm of
  give, anchored at the start; [friction on re-fits](/decisions/2026-11-03-friction-on-refits.md)), per point: on the strap only; the
  rest of the design settles frictionless from the block's fit as before. The fitted file's case lists the strap's points
  (`placed`); the app's re-fit gives them mu 0.4 at least through its frictionless first phase (`fit/refit.js reset`: the anchor's 4th
  value; `refit-wgsl.js rhs`: `max(P.mu, anchor.w)`). The race's `gpu.py` twin has no such points.
- **Friction on every point was tried first:** the straps stayed, but the recut neck, armholes and back edge barely moved from the
  block's fit (0.8 mm mean, 21% of points still sliding after 360 iterations), so the snug edges never pulled in.

| | First fit | Second fit |
|---|---|---|
| Strap over the shoulder, from the centre | 123 mm (app 128) | 92 mm (app 93) |
| Settled, all pieces | 1.159 / 1.064 | 1.162 / 1.078 |
| Moved from the block's fit, above the waist (mean / 95%) | 21.3 / 34.8 mm | 13.7 / 22.9 mm |
| Strap points with friction | none | 93: 82% pressing, none sliding |
| App re-fit (300 steps) | 0.6 s | 1.8 s with the page drawing |

Seen: the straps rise from the neckline's corners close to the neck and spread apart down the back to the back edge, as drawn; the
front covers more towards the armpits.

# Third fit: back straps near centre back (2026-11-10)

Owner on the second fit: the straps still sat too far under the armpit; in the photos they go straight down the back, and in the
illustration they reach closer to the centre.[^owner3] Read again, the illustration's back straps run from the shoulders inwards to the
back edge near centre back; the curves outside them are the front's armholes seen from behind, which the first reading took for the
straps. The back foot now has its inner edge 38.1 mm (1 1/2 in) from centre back.

- The strap crosses the shoulder 80 mm from the centre (app 81) and meets the back edge 49-60 mm from it: seen from behind it runs
  from beside the neck nearly straight down, angling slightly in, as drawn.
- Not fully settled after 360 iterations: three quarters of the strap's points were still sliding against their friction (last
  iteration's largest move 0.82 mm, mean 0.015 mm), the strap easing in towards its shorter way. The app's re-fit runs on from there.
- Above the waist the design moved 12.6 mm mean from the block's fit (95% 22.5); settled 1.161 across, 1.087 along.
- Owner on that fit: "a little further outwards". The foot moved 3/4 in out (inner edge 57.2 mm from centre back): the strap now
  crosses the shoulder 82 mm from the centre (app 84) and meets the back edge 73-83 mm from it, straight down from behind, as in the
  photos; settled within the 360 iterations (last mean move 0.005 mm).

# Fourth fit: straps further out, no fangs (2026-11-10)

Owner: the straps a little further out still; and neither the illustration nor the photos have the jagged upward point where a strap
meets the back piece, "like two fangs facing upwards".[^owner4]

- **Back foot** 3 in from centre back (was 2 1/4): the strap crosses the shoulder 85 mm from the centre and meets the back edge
  77-107 mm from it.
- **The fangs were mostly the binding.** The neck and armhole openings were closed loops running up each strap's edges, so the
  binding turned up into the strap with a rounded corner on both sides of its foot. The fabric itself rose only 3.5 mm there (back
  edge height at the foot over the line between the edge 25 mm either side). Now the binding is laid as the drawing's construction:
  open runs from strap to strap (`open: true`; `render/fitted.js finish()` resamples and smooths them without wrapping, `resampleOpen`,
  `smoothOpen`), the back band straight across with the straps on it, and its elastic continuous under each strap's foot
  (`design_strappy.ELASTIC` `('back', 'shoulder')`). The fabric's own rise stayed 3.8 mm: a slight swell, no point.
- Seen: the band runs straight across the back, the straps meeting it square; a few pixels of the red back show above the band beside
  each foot.

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
[^owner2]: Owner on the first strappy fit, 2026-11-10.
[^owner3]: Owner on the second strappy fit, 2026-11-10.
[^owner4]: Owner on the third strappy fit, 2026-11-10.
[^code]: Strappy design code.
[^edges]: Edge finishing, elastic and binding.
[^straps]: Back, strap and keyhole formulas.
