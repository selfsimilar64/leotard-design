---
type: Technique
title: Fitting a block like the app
description: "November 2026: why drafted blocks fitted worse than the app's own build at the seat and thighs, and the fix: a back leg of its own, elastic in the fit solve, the crotch seam kept out of the inner thigh, and finished edges drawn from the block's openings. Measured against the app's lines on six bodies."
tags: [pattern, block, fit, elastic, seat]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T18:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-02 (Claude Code session)
    title: "Fabric travels down the thighs and the seat fit is wrong, against the app's fit; elastic edges are needed"
    author: human:mattj
  - id: code
    resource: "pipeline/draft_block.py BACK_LEG, pipeline/wrap_block.py ELASTIC and crotch_floor, pipeline/compare_fit.py, app/src/dev/wrap-eval.js finish"
    title: Code and measurements
  - id: edges
    resource: /domain/construction/edge-finishing-elastic-and-binding.md
    title: Edge finishing
---

# Takeaway

The owner compared a drafted block against the app's build and saw fabric running down the thighs and a wrong seat.[^owner] Measured against the app's own lines (`pipeline/compare_fit.py`), both were real and neither was a matter of simulated tightness.[^code]

# What differed

Standing, the app simulates no tightness: its fabric sits where its lines are drawn on the body, on the garment surface. Its slide with tension runs only in poses. What the block lacked:

| Fault | Cause | Fix |
|---|---|---|
| Back covered about 47 mm less each side at 7 cm above the crotch (61 against 108 mm half width) | The drafter gave front and back the same leg curve. The bought block's back was fine, which is why an earlier seat comparison passed | `BACK_LEG`: a nearly straight back leg, rounded at each end so it still leaves square. Passes all block rules |
| Seam ends 16-20 mm below the crotch, on the inner thigh | The thighs nearly touch: the gap is about 20 mm wide, the crotch seam 58 mm. The surplus ran down the thigh | `crotch_floor`: the seam may not fall below the crotch within the gap, so its ends tuck in. The pattern keeps its real width; a production gusset should not be narrowed to suit the mesh |
| No hold at the openings | Free edges | `ELASTIC`: spans along each opening shorter than the edge: front leg 95%, back leg 85%, neck and wrist 95%, within the sourced 75-100%[^edges]; these values are chosen, not validated |
| No finished edge | The app's rims follow the app's own cut | `finish` in `wrap-eval.js` sweeps the app's turned-elastic profile along loops the fit now exports |

# Results, high leg, each body's own block, mm

Block line to the app's line, mean; lowest point below the crotch, block against app.

| Body | Front | Back | Front lowest | Back lowest |
|---|---|---|---|---|
| `young` | 4.0 | 2.5 | 0 / 1 | 8 / 10 |
| `adult` | 3.5 | 3.3 | 0 / 2 | 9 / 13 |
| `older-teen` | 5.0 | 3.4 | 0 / 4 | 6 / 15 |
| `teen` | 4.2 | 4.4 | 0 / 6 | 4 / 18 |
| `child` | 2.3 | 4.3 | 0 / 7 | 3 / 17 |
| `child-6` | 4.5 | 6.0 | 0 / 9 | 3 / 19 |

Before, on `young`: 6.7 front, 22.1 back; lowest 16 / 1 and 18 / 10. Blocks: 16 of 17 pass all 42 rules; XXS still misses the front leg S-bend at 26.1%. Inside out 0.04-0.12%.

# Owner's objection and a controlled trial

The owner rejected `BACK_LEG`: no designer would draw that irregular line, and the flat shapes are the link to reality, so ask first whether the pattern is the cause or whether real fabric would stretch and cling.[^owner] It is still in the code, pending the owner's decision. Trial on `young`, high cut, with the crotch floor (`wrap-trial-*`, git-ignored; half width of the opening at 7 / 10 cm above the crotch, mm; the app is 108 / 120):

| Pattern and elastic in the fit | 7 cm | 10 cm | Line to app, mean | Seat stretch, mean |
|---|---|---|---|---|
| Original drafted, no elastic | 65 | 81 | 22.3 | 1.12 |
| Original drafted, K 8, back leg 85% | 71 | 94 | 17.4 | 1.17 |
| Original drafted, K 40, back leg 75% | 111 | 143 | 14.9 | 1.37 |
| Bought XS, K 8, back leg 85% | 125 | 139 | 16.0 | 1.12 |

Flat half width of the back at 7 cm: original drafted high cut 34 mm, bought XS 65 mm. The bought high cut is a nearly straight diagonal; the drafter's is a deep scoop, a departure from the block it was calibrated on. **Reading:** tension moves the line a long way, so the owner's question is well founded, but matching needed the sourced limit of elastic, a stiffness picked for the trial, and overshot at 10 cm. The solver is not a cloth simulation and has no measured fabric properties, so these show direction, not a prediction. Bought XS is a chart size, not fitted to `young`.

# Known limits

- `BACK_LEG` adds a visible bend at the line's midpoint, where its two curves meet: on `young` the line turns back 36-38 degrees, tightest radius 26-29 mm, against one sweep of 87-116 mm before. It passes the block rules, but a pattern maker should not be expected to accept it. It gives the wanted cover but is not a finished line. Only the back leg moved in the block: up to 35 mm on the fullest cut and 45 mm on the high cut, adding 32 cm2 to the half piece.
- The app's line is the reference, not a verified truth; its back dips further under the cheek on teens and children (the app's line reaches 38-45 mm from the block's at worst there).
- High on the front the block runs wider than the app at 14 cm above the crotch (148 against 135 mm on `young`).
- Compressing 58 mm of seam into the gap squeezes artwork in the last centimetres near the crotch; it is out of sight, but a flat-to-3D map there is approximate.
- The garment surface is still solved for the app's own cover, not the block's. Elastic does not yet change a pose's slide: poses place the standing fit by host triangles.
- Finished edges are dev-only, not in the app.

[^owner]: Conversation with the product owner.
[^code]: Code and measurements.
[^edges]: Edge finishing.
