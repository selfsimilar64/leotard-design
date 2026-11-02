---
type: Technique
title: Drafted blocks
description: "The project's own leotard blocks, November 2026: drawn from a body's tape measures in true curves with seam joins decided in advance. 17 blocks (six app bodies, eleven adult sizes), all but XXS passing 42 pattern checks; six fitted on their own bodies. Calibrated, unreviewed, not yet in the app."
tags: [pattern, block, drafting, sizing, children]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T10:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-01 (Claude Code session)
    title: "A custom adjustable block is acceptable; it must be air tight"
    author: human:mattj
  - id: code
    resource: "pipeline/draft_block.py, pipeline/check_pattern.py, pipeline/wrap_block.py --drafted, app/src/dev/wrap-eval.js measureBody; output assets/blocks/, app/captures/wrap-body-*.json (git-ignored)"
    title: Drafter and results
  - id: rules
    resource: /domain/construction/what-makes-a-pattern-true.md
    title: What makes a pattern true
  - id: ref
    resource: /domain/construction/basicpatternblock-leotard-block.md
    title: The purchased leotard block
---

# Takeaway

`pipeline/draft_block.py` turns tape measures into a block.[^code] The faults of the [bought block](/domain/construction/basicpatternblock-leotard-block.md) are designed out: at each seam the lines' angles are chosen first, so they run on when sewn;
sewn edges share a curve or a length. It covers child bodies, which the bought block could not. It is calibrated, not validated: no pattern maker has seen it and nothing has been sewn.

# How a block is drawn

- **Measures** come from a body's garment surface (`measureBody`): bust, waist, hip by a tape's hull; centre front and back; side levels; neck, shoulder; arm length, bicep, wrist. Adult chart sizes take the chart's four and scale the rest from the `young` body **[INFERRED]**.
- **`REF`** holds proportions and reductions measured from the bought block at XS against `young`: centre lengths, armpit heights, shoulder, reductions of 16.6% bust, 8.2% waist, 16.5% hip. Everything scales from there. Proportions derive from that block and its leg cuts are its own lines, scaled; whether that is allowed under its terms has not been reviewed.
- **Side seam** is one spline, shared by front and back.
- **Joins**: neck turned 18 degrees either way from square at the shoulder, armhole and leg square to the seam they leave.
- **Sleeve cap**: height solved for total length, crown position for sharing it between armholes. Cap is 2.5% longer than the armhole.
- **Shoulder** stops at 94% of the armpit's width, since a child's chest is narrow for its shoulders.
- **Leg cuts** are the purchased block's, stretched to each body; [never redrawn](/engineering/app/fitting-a-block-like-the-app.md).

# Results

Checks: the 42 block rules, including new ones for neck dips, S-bends, the armhole and the wrist.[^rules]

| Blocks | Result |
|---|---|
| Six bodies | 42 of 42 |
| XS to 6XL | 42 of 42 |
| XXS | 41 of 42: `front.leg` S-bend 26.1% against a 25% limit |
| Bought block at XS, for comparison | 34 of 42 under the same rules, including high leg at the side and leg at the crotch; its faceted curves also inflate the S-bend score |

Fits, each block on its own body, standing: inside-out 0.01-0.11%, zero seam gap, design outlines 12 of 12.

| Body | Bust front / back | Waist front / back | Hip front / back | Reuse, high leg, 95% |
|---|---|---|---|---|
| `young` | 1.31 / 1.12 | 1.14 / 1.09 | 1.22 / 1.25 | 4.6 mm |
| `adult` | 1.24 / 1.14 | 1.16 / 1.14 | 1.20 / 1.23 | 4.7 mm |
| `older-teen` | 1.35 / 1.21 | 1.13 / 1.09 | 1.24 / 1.27 | 5.7 mm |
| `teen` | 1.45 / 1.20 | 1.18 / 1.13 | 1.19 / 1.18 | 6.0 mm |
| `child` | not read | not read | not read | 4.9 mm |
| `child-6` | not read | not read | not read | 6.0 mm |

The stretch report uses fixed heights set for adults, so child figures are not meaningful and are left out: fix before relying on child fit.

# Known problems

**Superseded for the leg and crotch:** the results above predate [fitting a block like the app](/engineering/app/fitting-a-block-like-the-app.md), which took the leg cuts from the purchased block and added elastic; all 17 blocks now pass 38 rules, XXS included. Stretch and reuse figures here were not re-tabulated.

- **Crotch pucker**: the hole at the back of the crotch was the seam running down the inner thigh, not the body surface as first inferred; fixed in that page.
- **Bust is tight in front on teens** (1.45 local against about 1.20 intended): front and back share a side seam at equal width. A front share or body shaping is the likely fix.
- XXS as above. Sleeve crowns on children sit off centre, since their armholes are unequal.
- Limits and `REF` are unreviewed. Fit is geometric, in one fabric, with no stretch properties.
- Not in the app; `/wrap.html` still shows the bought block. Poses and cuts other than the high leg are not yet run on drafted blocks.

[^code]: Drafter and results
[^rules]: What makes a pattern true
