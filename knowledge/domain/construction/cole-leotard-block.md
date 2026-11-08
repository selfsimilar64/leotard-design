---
type: Process
title: Cole's stretch-knit leotard block
description: "Cole's method (Patternmaking with Stretch Knit Fabrics, 2016) restated and drafted in pipeline/draft_cole.py: two-way top and hip foundations from measurements, graded to super stretchy and reduced for four-way stretch, joined at the waist with her leg-line panty legs and a set-in sleeve whose cap equals the armhole; offered in the app as Stretch-knit leotard. The second-closest method to the purchased block's shape (10 mm), with the closest front (9.9 mm)."
tags: [construction, patternmaking, block, drafting, stretch, four-way, cole]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-08T01:00:00Z }
sources:
  - id: cole
    resource: "Julie Cole, Patternmaking with Stretch Knit Fabrics (Fairchild/Bloomsbury, 2016), ISBN 9781501305047; owner's scan assets/Patternmaking with Stretch Knit Fabrics.pdf (git-ignored): ch. 5 pp. 66-95, ch. 6 pp. 100-111, ch. 11 pp. 364-367, ch. 12 pp. 410-417"
    title: Cole, Patternmaking with Stretch Knit Fabrics
    author: human:julie-cole
  - id: owner
    resource: "conversation with the product owner, 2026-11-07 (Claude Code session): after comparing Jalie patterns, Cole's leotard could be decent; add it as an option in the app"
    title: Owner's request
    author: human:mattj
  - id: code
    resource: "pipeline/draft_cole.py, pipeline/compare_blocks.py, pipeline/wrap_block.py --drafted cole-young young"
    title: Drafter, comparison and fit
---

# Takeaway

**Cole drafts a leotard by joining two general stretch foundations at the waist**, a top and a panty,
each reduced for four-way stretch and graded by the fabric's stretch category, with a set-in sleeve whose
cap equals the armhole (knits take no cap ease).[^cole] The owner judged it close to Jalie's gymnastics
patterns and asked for it in the app.[^owner] Our draft passes 32 of 35 pattern checks and is the second
closest method to the purchased block by shape, with the closest front of all ([comparison](/engineering/app/block-shape-comparison.md)).[^code]

# The method, restated

1. **Measure** (p. 70): top of form to front neck, to bust, to waist (down the centre front), shoulder,
   across chest, apex, bust, waist, hip, waist to hip; the arm from shoulder over the bent elbow to the wrist.
2. **Two-way top foundation** (pp. 81-83): a box a quarter bust wide; a guideline 1 1/4 in below the top;
   the side neck point 2 3/8 in out on it; back neck 1/2 in below it; shoulder sloped to a guide mark 2 in
   lower; armhole depth 6 3/4 in below that mark; across-chest point midway; a straight side seam from the
   underarm to a quarter waist. Front and back share the outline; the back armhole passes 1/4 in outside the
   front's at mid armhole.
3. **Grade and reduce** (pp. 85-94): stretch categories step 1/2 in a quarter (2 in a garment): minimal,
   moderate, very, super. The very-stretchy foundation is shortened for four-way stretch by folds of 1/2 in
   between shoulder and underarm and 1 in between underarm and waist, then graded once more to super stretchy.
   In all: shoulder tip and mid armhole 3/4 in in, side 1 1/2 in in, length 1 1/2 in shorter.
4. **Hip foundation** (pp. 73-80): a quarter hip wide, waist-to-hip deep, the side from 5/8 in above the
   waist to 1 in above the hip line; graded 1 1/2 in narrower and shortened 1 in.
5. **Leg-line panty** (pp. 365-366): leg point B 5 3/4 in below the waist, 1/2 in in and 1/2 in up; front leg
   through quarter marks raised 1/2 and 3/8 in, then 1 3/8, 1 1/8 and 1 1/2 in from the centre front at
   thirds of the way to the crotch (crotch depth 10 1/4 in for size 10); back leg bowed out 5/8 in.
6. **One-piece** (pp. 411-413): top over panty at the waist; side seam from the underarm, in 3/8 in two inches
   above the waist, to the leg point; the back's 1 in crotch section moved to the front.
7. **Sleeve** (pp. 100-111): cap drawn on the armhole traced against a fold (shoulder tip less 1 1/4 in, a
   point 3/4 in beyond the armhole halfway down, half bicep), sleeve length to the wrist; four-way: 1/2 in out
   of the cap; cap length made equal to the armhole.

# Our choices **[INFERRED]**

- **Measurements from the `young` body** for girths, levels and arm; shoulder (4.8 in) and across chest
  from Aldrich's women's chart, size 12, since the body's neck slice catches the trapezius; Cole's own size-10
  figures for crotch depth, half bicep, half wrist and A-C1.
- **Armhole depth in proportion** to the nape-to-waist length (21:41, the chart's ratio) rather than Cole's
  fixed 6 3/4 in: the `young` torso is short (as the Aldrich fit also showed) and the fixed depth left no room
  between underarm and waist. On an average torso it gives Cole's figure.
- **Front neck 1 1/2 in below the back neck**: the body's reading put the front neck level with the back.
- **Curves**: necks and armholes square at their ends; the side seam one smooth curve through Cole's points;
  the back leg drawn B-C-T, square to the crotch (her 1/4 in marks A and K read as guides).
- **Crotch**: the moved 1 in section kept at the crotch's width, so the front and back crotch edges match.
- **Sleeve width** found so the cap equals the armhole (her rule), the wrist scaled with it.

[^cole]: Cole, Patternmaking with Stretch Knit Fabrics.
[^owner]: Owner's request.
[^code]: Drafter, comparison and fit.
