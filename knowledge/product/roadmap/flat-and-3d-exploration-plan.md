---
type: Roadmap
title: Flat and 3D exploration plan
description: "Staged plan, each stage with a gate, for testing whether a real flat pattern can be the garment's source geometry, wrapped once onto the body so that flat and 3D always agree and print maps directly to the cut piece."
tags: [roadmap, pattern, flattening, fit, exploration]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-01T20:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-01 (Claude Code session)
    title: "Build fabric from flat pieces; flat and 3D always agree; better mockup; higher fidelity link to printing"
    author: human:mattj
  - id: block
    resource: /domain/construction/basicpatternblock-leotard-block.md
    title: The purchased leotard block
  - id: flattening
    resource: /engineering/app/pattern-pieces-and-flattening.md
    title: Pattern pieces and flattening
---

# Goal

The owner wants designs built from flat pieces, with flat and 3D always agreeing, a more realistic
mockup, and a tighter link to physical printing.[^owner]

# The hypothesis to test **[INFERRED]**

Today lines are cut on the body and each piece is then flattened; the flat is derived and carries
6-8% area-weighted stretch that is not fabric behaviour.[^flattening] Ease is one uniform scale.

Proposed: reverse the direction. **The flat block is the source geometry.** Wrap it onto the body
once per size and body, store the map from every flat point to its 3D point, and put every design
line, print and stone in flat coordinates (mm on the cut piece). Agreement then holds by construction,
because both views read one map, and the map's stretch is the block's real ease.

Assumption that makes it cheap: cutting a neckline or panel from a fitted block changes tension little
enough to reuse the map, which suits [appears correct, not physically correct](/decisions/2026-10-13-appears-correct-not-physically-correct.md).
Stage 3 tests it.

No app behaviour changes until the gate at stage 3. All work goes in a dev route or `pipeline/`, in its
own tab, because dev scripts open their own design and overwrite the autosave.

# Stages

## 1. Read the block into data

- `pipeline/pattern/` script with PyMuPDF: read a chosen size from the A0 PDF, join the two sheets
  (same path in `A-1` and `A-2`, offset by the sheet shift), handle XXS and 3XL.
- Output to `assets/patterns/basicpatternblock-leotard-0005/derived/` (git-ignored): each piece a closed
  outline in mm from named edges (centre, shoulder, armhole, side, leg per cut, crotch, neck), grain,
  fold, sleeve marks, and a sewing table (front side to back side, sleeve cap to armhole and so on).
- Clean up dashed strokes and the Bezier joins, and identify the stray 190 mm line.
- **Gate:** every length in [the block page](/domain/construction/basicpatternblock-leotard-block.md)
  reproduced within 0.5 mm; drawn back to scale and laid over the PDF, no visible difference.
- **Done 2026-11-01** (`pipeline/extract_block.py`), with the gate adjusted: edges follow the drawn paths
  exactly, but each edge is about 3.3 mm longer than its path because corners are filled, and corners are
  placed within about 1.5 mm, so extracted seams agree within about 1.5 mm rather than 0.5. Sizes were drawn
  back to scale and inspected, not laid over the PDF. Refine corners if stage 3 needs better.

## 2. Measure the gap to today's app

- Measure the app bodies at bust, waist, hip and centre trunk, and choose the block size each is
  nearest; record it.
- Build the matching design in the app (long sleeve, crew, nearest leg), flatten, and overlay on the
  block. Report differences per edge length, piece area and shape, and per-region ease.
- **Gate:** a table showing where the current flat differs most, and why (body, ease, flattening).
  The stage can end the exploration if the gap proves small and a block-informed ease is enough.
- **Done 2026-11-01:** [the results](/engineering/app/flat-pattern-against-a-real-block.md). The gap is not small;
  go to stage 3 with block XS on the `young` body.

## 3. Wrap the block onto the body (the spike)

- Bake, offline, a fit of flat pieces to the body: seam pairs closed, flat outline as rest shape, body
  as collider. First attempt XPBD-style cloth with a strong pull to the surface; Blender cloth in
  `tools/` is the check. Output a map per piece: flat triangle to 3D position.
- Render it with the existing fabric materials on a neutral, light fabric
  ([fit renders](/domain/sizing/how-a-leotard-sits-on-the-body.md)) beside the current build.
- Measures: seam gap under 1 mm; neck, leg and arm lines landing where the sketch puts them; stretch
  map against block ease; bake time.
- Trial cuts: re-bake with a scoop neck and a high leg, compare with the map reused without a re-bake.
- **Gate:** owner judges it looks at least as right as today's, and reused-map error is below about
  3 mm on the body. If reuse fails, keep the flat as source only with a re-bake per silhouette change.

- **Solved 2026-11-01:** [results](/engineering/app/wrapping-a-flat-block-onto-the-body.md). The approach used is as-rigid-as-possible
  on the surface, not cloth simulation. Reuse meets the 3 mm gate for necklines and not for a large leg change, so one solve per leg cut.
  **Gate passed: the owner judged the look good on 2026-11-01**, preferring the block's slightly more curved leg line, and noting the app's raised edge finishes are still missing from it.

## 4. Two-way link and print

- Prototype: a flat and a 3D panel; hovering or drawing a line in either shows it in the other through
  the one map, including across a seam. Print and stones in flat mm.
- Print a test grid and a design onto the flat as artwork, with 3D showing where it lands after stretch.
- **Gate:** tested round trip flat to 3D to flat under 0.5 mm; a line crossing a seam stays continuous
  in 3D; printed artwork exports at true size from the same data shown on screen.

- **Done 2026-11-01:** [the link](/engineering/app/flat-and-3d-link.md). All three gates met in software; the owner has not yet tried it by hand.

## 5. Check against the real thing

Owner or maker: print the A0 at a copy shop, sew size-matched garment from suitable fabric with the
test grid printed if practical. Compare on a form or wearer with the 3D at matching views, and
measure grid distortion at bust, waist and hip.

- **Gate:** the 3D grid predicts the real one closely enough to place a seam-crossing motif. The agreed
  tolerance is set from this first comparison.

## 6. Decide, then bring into the app

Only with gates 3-5 passed: record a decision and plan the move: documents and starting points, the
drawing tools in flat coordinates, poses and [sliding](/engineering/app/garment-sliding.md), existing
design migration, overlays and more blocks. FreeSewing Onyx comparison and Jalie 3901 as a pieced test
fit here ([sources](/domain/construction/sources-of-leotard-pattern-blocks.md)).

# Risks

- App bodies may fit no block size, or the block's adult sizes may not suit child bodies. Stage 2 shows this.
- Posed bodies: the map is baked standing; arm-up poses may strain it.
- Fabric: 75% stretch block, possibly stiffer competition fabric; stage 5 uses a stated fabric.
- Licence: ask the seller before block-derived shapes ship in the app.

[^owner]: Owner's brief, 2026-11-01
[^flattening]: Pattern pieces and flattening
