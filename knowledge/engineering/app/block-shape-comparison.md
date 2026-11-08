---
type: Technique
title: Block shapes compared with the purchased block
description: "2026-11-07: every block drafted so far (Armstrong 6, Aldrich bodyshaper 6 and 12, Richardson's leotard sloper M, and our purchased-proportion drafter) overlaid on the purchased block XS by flat shape. Armstrong is closest of the methods we can ship (mean 8 mm after scaling to the same size), then Aldrich 6 (11 mm), Richardson (12 mm); the purchased block is a general women's leotard block, not a gymnastics one, and its back runs about 6 cm longer than its front."
tags: [block, pattern, comparison, armstrong, aldrich, richardson, purchased]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-07T23:59:00Z }
sources:
  - id: code
    resource: "pipeline/compare_blocks.py, pipeline/draft_richardson.py; output app/captures/block-shape-compare.png and .json (git-ignored)"
    title: Comparison and Richardson drafter
  - id: owner
    resource: "conversation with the product owner, 2026-11-07 (Claude Code session): compare all built blocks' 2D shapes against the purchased block, which is most likely the correct shape"
    title: Owner's request
    author: human:mattj
  - id: richardson
    resource: "Keith Richardson, Designing and Patternmaking for Stretch Fabrics, ch. 13 pp. 395-411 (owner's photographs, assets/Designing and Patternmaking for Stretch Fabrics/1-17.jpg, git-ignored)"
    title: Richardson, ch. 13 Bodysuits, Leotards, and One- and Two-Piece Swimsuits
    author: human:keith-richardson
  - id: bpb
    resource: /domain/construction/basicpatternblock-leotard-block.md
    title: The purchased leotard block
---

# Takeaway

**Of the blocks we may ship, Armstrong's is the closest in shape to the purchased block,** as the owner
also judged from the fits.[^owner] Measured on the flat front and back pieces against purchased XS, after
stretching each piece to the purchased one's width and height so only the drawing is compared:[^code]

| Block | Front | Back | Mean | Top (neck, shoulder, armhole) | Side | Leg and crotch | True size, mean |
|---|---|---|---|---|---|---|---|
| Armstrong 6 | 10.2 | 6.3 | **8.3** | 6.2 | 9.0 | 16.1 | 20.6 |
| Aldrich bodyshaper 6 | 11.2 | 9.9 | 10.6 | 6.4 | 12.3 | 18.5 | 20.4 |
| Richardson leotard M | 10.3 | 13.3 | 11.8 | 10.3 | 16.9 | 15.6 | 24.0 |
| Aldrich bodyshaper 12 | 11.2 | 12.5 | 11.9 | 8.4 | 9.4 | 21.8 | 24.9 |
| Our drafter (`body-young`) | 3.8 | 2.2 | 3.0 | 4.3 | 3.4 | 0.2 | 2.4 |

Mean outline distance in mm. Each piece is scored against whichever purchased leg is nearer (its
standard `THIGH` leg or its `HIGH HIPS` leg); all the textbook fronts and the Aldrich and Richardson backs
are nearer the high cut. The last row is not an independent method: our drafter takes its proportions and
its legs from the purchased block, so it matches by construction and cannot be shipped as it stands
([drafted blocks](/engineering/app/drafted-blocks.md)).

# What the overlays show **[INFERRED]**

- **The purchased block is a general women's leotard and bodysuit block** sold on Etsy, not a gymnastics
  pattern; its booklet even says "catsuit" in places.[^bpb] It is a yardstick for a real, sewn pattern,
  not proof of the gymnastics look.
- **Its back is about 57 mm longer than its front** (750 against 693 mm at XS): the crotch seam sits forward
  under the body. Armstrong and Richardson draw front and back the same length; only Aldrich's (gusset joined
  to the back) is longer at the back, and by too much.
- **Leg lines differ most.** The purchased standard leg leaves the side seam about 5-10 cm above the crotch;
  the textbooks' legs leave it about a quarter of the piece's height up (Armstrong, Richardson) or higher
  (Aldrich's back), which is why every method scores worst on the leg.
- **Richardson** sets its underarm low and wide (a quarter of the reduced bust, only 3/8 in beyond the across
  back) and its shoulder wide, so its armhole is shallow; its high-cut front leg is the closest leg of all
  (10 mm).

# Richardson's leotard sloper, as drafted (`pipeline/draft_richardson.py`)

Richardson ch. 13 drafts a leotard sloper (for leotards, bodysuits and one-piece swimsuits) from four-way
stretch measurements reduced 10% across and 10% along, sizes XXS-XXL in inches, or from the catsuit sloper.[^richardson]
One draft gives front and back, differing at the neck, the armhole (front 1/2 in inside the back) and the
leg; the back leg is bowed out 1/2, 1 or 1 1/2 in for small, medium or large seats; elastic is cut 1 in
under the front and back leg openings each, 2 in under the neckline, and not reduced at the armhole.
Torso only: the sleeve comes from the catsuit or ch. 8, which we do not have. Our readings of "as
illustrated" are marked in the script's header.

[^code]: Comparison and Richardson drafter.
[^owner]: Owner's request.
[^richardson]: Richardson, ch. 13.
[^bpb]: The purchased leotard block.
