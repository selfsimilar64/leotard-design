---
type: Technique
title: Fitting a block like the app
description: "November 2026: why drafted blocks fitted badly at the seat and thighs. The drafter's leg cuts had left the purchased block; they are now its own lines scaled to each body, with named, tunable elastic in the fit, fabric that gathers rather than resisting compression, and finished edges. An edit tuned to the app's look and a hard crotch pin were rejected and removed."
tags: [pattern, block, fit, elastic, seat]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T22:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-02 (Claude Code session)
    title: "Purchased patterns are precious and pure; never assume what they ought to look like; give elastic a noted value that can be tuned"
    author: human:mattj
  - id: code
    resource: "pipeline/draft_block.py purchased_leg, pipeline/check_pattern.py, pipeline/wrap_block.py ELASTIC, ELASTIC_WIDTH, CUT_ITERS and GATHER, pipeline/compare_fit.py, app/src/dev/wrap-eval.js show and finish"
    title: Code and measurements
  - id: edges
    resource: /domain/construction/edge-finishing-elastic-and-binding.md
    title: Edge finishing
---

# Takeaway

**A purchased pattern is the authority.** Neither the owner nor the agent has leotard pattern experience, so no flat line is redrawn from an idea of what it ought to look like, nor tuned to match a 3D look.[^owner] When a fit looks wrong, first ask whether fabric behaviour rather than the pattern is responsible. The app's line is a comparison, not a target.

# What went wrong

The owner saw fabric running down the thighs and a wrong seat on a drafted block, compared with the app.[^owner]

| Fault | Cause | Now |
|---|---|---|
| Back cut too high | The drafter drew its own leg curves, leaving the block it was calibrated on: flat half width at 7 cm above the crotch on the high cut 34 mm, purchased XS 65 mm. It also shortened the side from a 435 mm drop to 412 mm | `purchased_leg` takes all four leg cuts from the purchased XS, stretched in width and height to each body; `REF` side 435 and side_high 278.5 are that block's |
| Irregular back line | `BACK_LEG`, an edit that matched the app's line with a bend no designer would draw (turned back 36-38 degrees, radius 26-29 mm). Rejected by the owner | Removed |
| Seam ends 16-20 mm down the inner thigh | The thighs nearly touch (gap about 20 mm, crotch seam 58 mm), and the fit resisted compression as hard as stretch, so the surplus could only run down the thigh | `GATHER`: fabric below flat size, down to a limit, costs nothing. A hard pin, `crotch_floor`, was tried first and removed at the owner's direction: it bent the elastic to 34 degrees at the crotch |
| No hold at openings | Free edges | `ELASTIC`, below |
| No finished edge | The app's rims follow the app's own cut | `finish` in `wrap-eval.js` sweeps the app's elastic profile along exported loops |
| Jagged edge in poses | A pose only slides and lifts the app's cover, and the purchased cut reaches past it | `show` always tells the body where the block's fabric is |

# Trial: pattern against tension

`young`, high cut, with the since-removed pin; half width of the opening at 7 / 10 cm above the crotch, mm (the app is 108 / 120).

| Pattern and elastic | 7 cm | 10 cm | Seat stretch, mean |
|---|---|---|---|
| Original drafted, none | 65 | 81 | 1.12 |
| Original drafted, K 8, back 85% | 71 | 94 | 1.17 |
| Original drafted, K 40, back 75% | 111 | 143 | 1.37 |
| Purchased XS, K 8, back 85% | 125 | 139 | 1.12 |

Tension moves the line a long way, so the owner's question was well founded, but the pattern was also wrong. The solver is geometric, not a cloth simulation: direction, not prediction.

# Trial: the crotch without a pin

The owner asked for realistic behaviour, with no hardcoded fixes unless necessary and specifically ordered.[^owner] All on `young`; the elastic's lowest point below the crotch, its sharpest turn near the crotch over 20 mm either side, mm and degrees.

| Fit | Lowest | Turn | Reading |
|---|---|---|---|
| Hard pin | 10.8 | 34.2 | Rejected |
| No pin | 20.5 | 18.1 | Elastic alone smooths the path but the seam runs down the thigh |
| No pin, even 87% elastic | 23.0 | 17.5 | No better |
| No pin, body pushes but cannot pull | 20.5 | 18.1 | No effect at all, so contact was not the cause; change reverted |
| No pin, elastic three times as strong | 18.5 | 17.8 | Barely helps, and pulls the back opening to 134 mm at 7 cm |
| `GATHER` 0.7 | 9.0 | 17.8 | |
| `GATHER` 0.5, chosen | 5.2 | 19.2 | Back line to the app's improves from 13.0 to 7.6 mm untuned |
| `GATHER` 0.3 | 4.9 | 20.3 | Little further change |

# Tunable values

These are named in `pipeline/wrap_block.py` so they can be tuned.

| Value | Setting | Basis |
|---|---|---|
| `ELASTIC` front leg | 1.0 | Spruce & Fjell, the one explicit published leg rule found[^edges] |
| `ELASTIC` back leg | 0.75 | Same rule; the whole opening comes to about 87%, near Treasurie's 85% start[^edges] |
| `ELASTIC` neck, wrist | 0.95 | Chosen within the sourced 75-100% |
| `ELASTIC_WIDTH` | 20 mm | **Estimate.** Replaces `ELASTIC_K`, which was per span and so depended on mesh size. Elastic now pulls only, with strength per unit length: the width of fabric it equals. Estimated 3-10 N per unit strain against fabric at 100-400 N/m gives 10-50 mm, most likely 10-30. A search on 2026-11-02 found no force data for 3/8 in swim elastic or nylon-spandex tricot. Across 10-50 mm the back half width at 7 cm runs 102-115 mm. Measuring a sample is the way to replace it |
| `GATHER` | 0.5 | **Chosen from the trial**, not measured: results barely change below it. Fabric's real gathering limit is unknown |
| `CUT_ITERS` | 360 | Measured: 120 left the fit moving (1.7 mm mean, 7 mm at most, in 240 more); at 360, 240 more move 0.22 mm mean. See the [audit](/engineering/app/fit-solver-realism-audit.md) |

# Results, high cut, each body's own block

All 17 blocks pass their 38 rules. The rule set replaced leg-shape rules with `leg is the purchased line` (within 1 mm of the purchased shape); those leg-shape rules were our assumptions, and the purchased block itself fails them. Refit with `ELASTIC_WIDTH` and `CUT_ITERS`. Block line to the app's, mean mm, and half width at 7 cm, block / app:

| Body | Front | Back | Back 7 cm | Back elastic lowest, mm | Inside out |
|---|---|---|---|---|---|
| `young` | 3.1 | 5.7 | 106 / 108 | 3.8 | 0.01% |
| `adult` | 3.9 | 10.4 | 99 / 109 | 2.9 | 0.01% |
| `older-teen` | 6.5 | 8.1 | 109 / 105 | 8.0 | 0.02% |
| `teen` | 5.8 | 8.6 | 109 / 101 | 9.3 | 0.06% |
| `child` | 3.1 | 6.2 | 95 / 88 | 10.4 | 0.06% |
| `child-6` | 5.3 | 7.7 | 97 / 86 | 10.8 | 0.12% |

The block covers more than the app at the back on four of six bodies. This is expected, and not a fault to tune away. Before `GATHER`, seat area stretch by pose on `young` had medians below 1 in most poses; it was not re-measured.

# Known limits

- **Licence:** the blocks now contain scaled purchased lines. The listing bars redistributing the files, and whether shapes built into a shipped app count is [still to be asked](/domain/construction/sources-of-leotard-pattern-blocks.md). Blocks stay git-ignored; ask the seller before shipping. Children's blocks are this adult shape scaled, not a children's pattern.
- **Other drafted lines still depart from the purchased block**, not changed here: back armhole up to 16.6 mm (190 against 176 mm long), front armhole 5.8 mm, sleeve cap 392 against 373 mm, sleeve underarm 401 against 451 mm (from the body's arm, so partly intended).
- **Crotch:** the nub is smaller, not gone: it still shows in `a-pose`, `lunge-arms-up`, `passe` and `one-knee`. `passe` still has a small tag with skin showing through, and `lunge-arms-up` dark marks on the fabric, both also in the pinned fit. The app's own fit shows a similar shape at the crotch, so the body surface may contribute; not tested.
- **Small of the back:** on `young` the back's length gathers to 71% at the waist (`adult` 87%, `older-teen` 84%), where the fabric's surplus now collects. The fit preview draws folds there from the fit; a printed design would still look squeezed. Real leotards may wrinkle there, but that is not verified.
- **Wrists:** the pucker was a tangle from the sleeve's rolled start, whose width table included the wrist curve. Fixed: no triangle on `young` now exceeds 2x stretch (worst 1.81).
- **Poses** place the standing fit on the app's slid surface; elastic and gathering are not re-solved per pose. Measured in the [audit](/engineering/app/fit-solver-realism-audit.md): a re-solve moves it 26-30 mm on average. `stag-jump` shows some cling into the cleft on the raised side.
- The garment surface is solved for the app's own cover when standing; the fit's starting surface is not re-solved for the block.
- Finished edges are dev-only. Nothing is reviewed by a pattern maker or sewn.

[^owner]: Conversation with the product owner.
[^code]: Code and measurements.
[^edges]: Edge finishing.
