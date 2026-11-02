---
type: Design Rule
title: What makes a pattern true
description: "The checks every block and design must pass before its flat pieces are trusted, why the mesh may never be the source of an outline, and what the first run found: the owner's three visible defects were our processing, while the bought block has faults of its own at the high leg, crotch, sleeve and curve resolution."
tags: [construction, pattern, block, quality, rule]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T06:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-01 (Claude Code session)
    title: "The block is the foundation and must be air tight; defects seen by eye on the flat pieces"
    author: human:mattj
  - id: code
    resource: "pipeline/check_pattern.py, pipeline/extract_block.py, pipeline/wrap_block.py; app/captures/pattern-after-fix.png (git-ignored)"
    title: Checks and the code they hold to account
  - id: block
    resource: /domain/construction/basicpatternblock-leotard-block.md
    title: The purchased leotard block
---

# Takeaway

A pattern fault raises no error: the fit solves and the 3D looks fine, as these did. So each rule is a number with a limit in `pipeline/check_pattern.py`, which fails the run.[^code]
The owner found the first faults by eye;[^owner] no check existed then. **[INFERRED]** The limits are working values from general pattern-making reasoning, not reviewed by a pattern maker.

# Principles **[INFERRED]**

1. **The design's lines are the source.** A piece's outline comes from exact curves. Mesh, 3D and export all follow them; an outline is never read back from a mesh.
2. **A cut is new geometry.** A piece gets its own outline and mesh, not triangles removed from a bigger one.
3. **Check at the seam, as sewn.** A piece can look fine alone and be wrong against its partner, so joins are measured with the two pieces together.

# Rules

| Rule | Limit | Why |
|---|---|---|
| Sewn edges the same length | 1.5 mm | Otherwise a maker has to ease or trim |
| A line meets a fold square | 6 degrees | Otherwise mirrored it dips or peaks at the centre |
| A line runs smoothly across a seam (neck, leg, hem) | 12 degrees | Otherwise the sewn opening has a point |
| A cut meets a seam at the same place on both pieces | 1.5 mm | Otherwise a step at the seam |
| No wobble against an edge's own smoothed self | 0.25 mm | Catches jags and steps |
| Only the corners the piece should have | Exact count | Front and back 10, sleeve 4, none at a fold |
| Mesh rim on the outline | 0.3 mm | The 3D and flat views show the same edge |

# What the owner saw

| Seen | Cause | Whose | Now |
|---|---|---|---|
| Jagged bottom of the back | A cut by removing triangles, including at the crotch | Ours | Gone |
| Spikes at the top of the leg | The same cut, ragged on the side seam | Ours; a real corner remains, below | Rag gone |
| Dip at the centre of the neck | The extractor skipped the PDF's corner marks and chamfered every corner | Ours | Gone |

Fixing the chamfers also brought seams from about 1-2 mm of error to 0.3-0.4 mm at the shoulder and side, in all sizes, and neck-over-shoulder, leg-over-side (`THIGH`), folds and the high leg's level all pass, apart from `back.neck` at 6XL (6.2 degrees).

# Faults of the bought block

| Fault | Measure | Sizes |
|---|---|---|
| `HIGH HIPS` leg comes to a point at the side seam | 60-80 degrees from smooth | All; XS 75 |
| Leg lines turn at the crotch seam | `THIGH` 47-70 degrees, `HIGH HIPS` 23-66 | All; XS 62 and 26 |
| Sleeve's two sides differ | Within limit to M, 1.9 mm at L, 7.3 mm at 6XL | L and up |
| Curves are short straight runs, so faceted when enlarged | Runs of several mm; about 0.5 mm of waver in the back neck at the fold | All |

Whether elastic hides the first two was not assessed. **[INFERRED]** A custom block should be drawn so they cannot arise: smooth curves across seams, in true splines.

# Coverage

Designs checked: the whole block and the high, scoop, cuff and high-cuff cuts at XS, all 12 of 12. Blocks: all eleven sizes. The app's own `garment/pattern.js` outlines are not yet checked: they do not come from this system.

[^owner]: Owner's inspection, 2026-11-01
[^code]: Checks and code
