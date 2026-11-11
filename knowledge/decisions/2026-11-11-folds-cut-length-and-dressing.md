---
type: Decision
title: Fewer painted folds, blocks cut 12% shorter, poses fitted from a standing fit
description: "Owner decision of 2026-11-11, against the many pronounced ripples at the raised arm, the arched back and the seat: the painted folds start only beyond the squeeze a knit takes up (88% of flat length) and are broader (30 mm); Armstrong's block and the hybrid are cut at 88% length by default; a pose is fitted from the garment's own standing fit carried by the body, with 50 steps of slip before friction, so the shorter pattern does not ride up."
tags: [decision, fit, folds, size, poses, friction]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-11T13:30:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-11 (Claude Code session)
    title: "What is going to get rid of the very pronounced and numerous ripples and folds by the shoulder with the arms up, in the back arch on the small of the back and the seat ... we need to increase the tension, but then we get the ride up ... let's build all three of those."
    author: human:mattj
  - id: plan
    resource: /engineering/app/fit-realism-plan.md
    title: Fit realism plan, stages 3 and 5
  - id: yardsticks
    resource: /domain/construction/real-leotard-yardsticks.md
    title: Real leotard yardsticks (length 8-24% under the body's torso loop)
  - id: code
    resource: "pipeline/wrap_block.py (FOLD_*), app/src/fit/folds.js, materials/fabric.js, fabric-node.js; app/src/garment/fitted.js (CUT, fitSizeDefault), doc/commands-garment.js fitted.size; app/src/render/fitted.js (DRESS_POSE, slip, fitOn), body/mannequin.js positionsIn"
    title: The code as changed
---

# Decision

Three changes together, all on by default (owner: "let's build all three").[^owner]

1. **Painted folds only beyond the knit's take-up, broader.** The fold waves the fabric shader paints from the fit (`fit/folds.js
   foldsOf`, twin `wrap_block.folds_of`) used height = wavelength / pi * sqrt(flat / now - 1): any squeeze, even 5%, painted a
   visible ripple every 20 mm over the whole squeezed area. Now height = wavelength / pi * sqrt(0.88 * flat / now - 1)
   (`FOLD_TAKE_UP` 0.88: the first 12% of squeeze is taken up unseen in the knit's loops, the same idea as the re-fit's `jam`;
   [INFERRED], no measured value, by eye) and the wavelength is 30 mm (Cerda and Mahadevan's formula at the low tension, about
   10 N/m, where fabric has spare length; 20 mm was at 50 N/m). Shaders' 314 became 209.
2. **Blocks cut at 88% length.** Armstrong's block and the hybrid take almost no length out for stretch (the seat about 3%
   stretched up and down standing); real leotards are cut about 8-24% shorter than the body.[^yardsticks] `garment/fitted.js`
   gives them `size: { width: 1, length: 0.88 }` (`CUT`), the default `fitSizeOf` returns while `meta.fitSize` is unset; the
   Length slider shows 88% and `fitted.size` stores a size only when it differs from the garment's default. **Changed the same day to
   90%** (owner: 90-95%, so the leg is not cut so high and rides up the seat less; 95% compared in `g-hybrid-L95`). The purchased block
   (a comparison) stays at 1 x 1.
3. **Poses fitted from the garment's standing fit (plan stage 5 steps 1-2).** A pose used to start from the file's fit carried
   onto the posed body and slide without friction for 150 steps, so a shorter pattern rode up. Now, on the bare skin, a fit in any
   pose but `standing` first fits the garment on the same body in `standing` (`body/mannequin.js positionsIn`; 150 free + 150 with
   friction; kept until body, head, size, mesh, garment or a fit setting change), carries it into the pose by the body's motion
   (each point moved as its file host moved: `startOf(Q) + X_standing - startOf(Q_standing)`) and fits there with `slip` (50)
   steps without friction, then 150 with.

# Measured (hybrid high cut, `young`, 7 mm, 88% length)

Leg openings' mean height on the body above the crotch (each opening point's nearest skin vertex, its reference height): standing
91-97 mm. Lunge with arms up: slip 0 97-98, slip 50 97, slip 150 (as before) 103-106. Back arch: slip 0 90 and 102 (one side
pulled up, strong diagonal folds over the seat), slip 50 95 and 100 (looks as before), slip 150 95 and 107. Re-fit in a pose 150-200
steps, 0.5-0.65 s in the pane once dressed (300 steps, 0.5-1.0 s before); the first pose after a change adds the standing fit
(about 0.5-0.7 s). Stills `app/captures/fit-stills/f3-*`, sheets `f3-leg-seat.png`, `f3-back-front.png` (git-ignored).

Seen: the standing back and seat smooth; the passe underarm's ripples mostly gone; the arms-up underarm still fans from the armpit
(over 12% squeezed there), softer; the back arch at slip 50 much as before. Not yet: the owner's judgement.

# Consequences / how to apply

- The shipped fitted files' baked folds (`cells[].fold`, drawn only when no re-fit runs) still follow the old rule until the files
  are next exported by `wrap_block.py`.
- `fit-stills.js` and other dev scripts now fit poses this way; `slip` is a fit option with no control (`setOptions({ slip })`).
- The older fit (`body: 'bridged'`) keeps the old path: no dressing, no slip phase.

[^owner]: Conversation with the product owner, 2026-11-11.
[^yardsticks]: Real leotard yardsticks.
