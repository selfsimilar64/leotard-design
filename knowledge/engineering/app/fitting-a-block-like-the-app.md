---
type: Technique
title: Fitting a block like the app
description: "November 2026: why drafted blocks fitted badly at the seat and thighs. The drafter's leg cuts had left the purchased block; they are now its own lines scaled to each body, with named, tunable elastic in the fit, the crotch seam kept out of the inner thigh, and finished edges. An edit tuned to the app's look was rejected and removed."
tags: [pattern, block, fit, elastic, seat]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T22:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-02 (Claude Code session)
    title: "Purchased patterns are precious and pure; never assume what they ought to look like; give elastic a noted value that can be tuned"
    author: human:mattj
  - id: code
    resource: "pipeline/draft_block.py purchased_leg, pipeline/check_pattern.py, pipeline/wrap_block.py ELASTIC, ELASTIC_K and crotch_floor, pipeline/compare_fit.py, app/src/dev/wrap-eval.js show and finish"
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
| Seam ends 16-20 mm down the inner thigh | The thighs nearly touch: gap about 20 mm, crotch seam 58 mm | `crotch_floor` in the fit only; the pattern keeps its width |
| No hold at openings | Free edges | `ELASTIC`, below |
| No finished edge | The app's rims follow the app's own cut | `finish` in `wrap-eval.js` sweeps the app's elastic profile along exported loops |
| Jagged edge in poses | A pose only slides and lifts the app's cover, and the purchased cut reaches past it | `show` always tells the body where the block's fabric is |

# Trial: pattern against tension

`young`, high cut, with the crotch floor; half width of the opening at 7 / 10 cm above the crotch, mm (the app is 108 / 120).

| Pattern and elastic | 7 cm | 10 cm | Seat stretch, mean |
|---|---|---|---|
| Original drafted, none | 65 | 81 | 1.12 |
| Original drafted, K 8, back 85% | 71 | 94 | 1.17 |
| Original drafted, K 40, back 75% | 111 | 143 | 1.37 |
| Purchased XS, K 8, back 85% | 125 | 139 | 1.12 |

Tension moves the line a long way, so the owner's question was well founded, but the pattern was also wrong. The solver is geometric, not a cloth simulation: direction, not prediction.

# Elastic: tunable values

These are named in `pipeline/wrap_block.py` so they can be tuned.

| Value | Setting | Basis |
|---|---|---|
| `ELASTIC` front leg | 1.0 | Spruce & Fjell, the one explicit published leg rule found[^edges] |
| `ELASTIC` back leg | 0.75 | Same rule; the whole opening comes to about 87%, near Treasurie's 85% start[^edges] |
| `ELASTIC` neck, wrist | 0.95 | Chosen within the sourced 75-100% |
| `ELASTIC_K` | 8 | **Estimate.** A rough force estimate gave about 10 but used remembered, unverified figures. A search on 2026-11-02 found no force data for 3/8 in swim elastic or nylon-spandex tricot. Patents give only methods (load at 40% on the second cycle). Measuring a sample of each is the way to replace it |

# Results, high cut, each body's own block

All 17 blocks pass their 38 rules. The rule set replaced leg-shape rules with `leg is the purchased line` (within 1 mm of the purchased shape); those leg-shape rules were our assumptions, and the purchased block itself fails them. Block line to the app's, mean mm, and half width at 7 cm, block / app:

| Body | Front | Back | Back 7 cm | Inside out |
|---|---|---|---|---|
| `young` | 8.3 | 13.0 | 123 / 108 | 0.06% |
| `adult` | 7.1 | 10.2 | 122 / 109 | 0.04% |
| `older-teen` | 11.6 | 14.5 | 121 / 105 | 0.07% |
| `teen` | 10.3 | 13.3 | 118 / 101 | 0.07% |
| `child` | 7.9 | 11.3 | 104 / 88 | 0.14% |
| `child-6` | 10.2 | 12.5 | 102 / 86 | 0.13% |

The block now covers about 13-17 mm more than the app each side at the back. This is expected, and not a fault to tune away. Seat area stretch by pose on `young` (2% / median / 98%): `a-pose` 0.35 / 1.04 / 1.18, `lunge-arms-up` 0.47 / 0.97 / 1.34, `stag-jump` 0.22 / 0.86 / 1.01, `passe` 0.30 / 0.91 / 1.09, `kneeling` 0.27 / 0.90 / 1.06, `one-knee` 0.26 / 0.87 / 1.12. A pose's median below 1 means the fabric is shown compressed, which real tensioned fabric would not do.

# Known limits

- **Licence:** the blocks now contain scaled purchased lines. The listing bars redistributing the files, and whether shapes built into a shipped app count is [still to be asked](/domain/construction/sources-of-leotard-pattern-blocks.md). Blocks stay git-ignored; ask the seller before shipping. Children's blocks are this adult shape scaled, not a children's pattern.
- **Other drafted lines still depart from the purchased block**, not changed here: back armhole up to 16.6 mm (190 against 176 mm long), front armhole 5.8 mm, sleeve cap 392 against 373 mm, sleeve underarm 401 against 451 mm (from the body's arm, so partly intended).
- **Crotch:** a small nub shows below the crotch in `a-pose`, `lunge-arms-up` and `passe`, from the seam tucked by `crotch_floor`. Artwork squeezes there too.
- **Poses** place the standing fit on the app's slid surface; elastic is not re-solved per pose. `stag-jump` shows some cling into the cleft on the raised side.
- The garment surface is solved for the app's own cover when standing; the fit's starting surface is not re-solved for the block.
- Finished edges are dev-only. Nothing is reviewed by a pattern maker or sewn.

[^owner]: Conversation with the product owner.
[^code]: Code and measurements.
[^edges]: Edge finishing.
