---
type: Technique
title: Two-state collision checks
description: "Stones are rigid but the fabric is not: a layout spaced on the stretched (worn) body sits 15-20% closer on the relaxed pattern piece, so overlap and spacing checks must run in both states, mapped through the per-panel stretch factors."
tags: [geometry, technique, stones, collision, stretch]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: teschner
    resource: https://matthias-research.github.io/pages/publications/publications.html
    title: "Teschner et al., Optimized Spatial Hashing for Collision Detection of Deformable Objects, VMV 2003"
  - id: porter-crystal
    resource: https://spandexsimplified.com/crystalling-on-spandex/
    title: "Spandex Simplified, Crystalling on Spandex, 28 Mar 2021"
    author: org:spandex-simplified
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror), sections 4, 6 and 8"
    author: claude-code/claude-opus-5-5
  - id: pc-notes
    resource: /references/research/patternmaking-and-construction.md
    title: "Research notes: patternmaking and construction (in-bundle mirror), section 7"
    author: claude-code/claude-opus-5-5
  - id: report
    resource: /references/research/research-report.md
    title: "Research report (in-bundle mirror)"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Run every stone spacing and overlap check twice: on the worn (stretched) body and on the relaxed
pattern piece.** With a 15–20% width reduction, stones designed at pitch *d* on the body sit at
0.80–0.85·*d* on the relaxed fabric while their diameters do not change, so a layout that looks evenly
spaced when worn can touch or overlap off the body.[^gg-notes][^report]

# The arithmetic

- Relaxed pitch = worn pitch × SRF in that direction (SRF ≈ 0.80–0.85 across the body, ≈ 0.95–1.0 along it).
- A layout overlaps relaxed when worn gap < (1 − SRF) × worn pitch: roughly 15–20% of the pitch, about
  18–25% of the stone diameter, in the stretch direction.[^gg-notes]
- Glue footprints must also stay separate (dots, never touching), adding a glue margin to the minimum
  centre spacing.[^porter-crystal][^pc-notes]

# Which state binds **[INFERRED]**

It depends on how stones are applied: factory motifs are pressed on flat relaxed pieces (relaxed state
binds, plus any slight pre-stretch on the pad); ateliers glue on a garment stretched to near worn size
(worn state binds).[^pc-notes] Unknown in practice — see
[open question](/domain/construction/open-question-stoning-state-and-crystal-grading.md).

# Implementation **[INFERRED]**

1. Worn state: positions from barycentric anchors on the current body; spatial hash (Teschner et al.)
   with cell ≈ largest stone diameter; 3D distance.[^teschner][^gg-notes]
2. Relaxed state: map each stone through its panel's flattening (surface → pattern piece, including
   stretch compensation) and run the same test in 2D per piece; stones near a seam test against both
   pieces only after the seam keep-out is applied.
3. Defer the relaxed-state pass to stroke end or idle time; report collisions per size, since spacing
   changes with size.

Related: [stretch compensation](/engineering/geometry/stretch-compensation.md),
[crystal keep-outs](/domain/construction/rule-crystal-keep-outs.md).

[^teschner]: Teschner et al. 2003.
[^porter-crystal]: Spandex Simplified, Crystalling on Spandex.
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
[^pc-notes]: Research notes: patternmaking and construction (in-bundle mirror).
[^report]: Research report (in-bundle mirror).
