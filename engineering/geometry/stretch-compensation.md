---
type: Technique
title: Stretch compensation
description: "Turning a zero-ease flattened panel into a production piece: level 1 anisotropic per-fabric scaling (industry-equivalent), level 2 flattening against a target stretch tensor, level 3 physics-based optimisation; plus the tension criterion, Laplace pressure and print pre-distortion."
tags: [geometry, technique, stretch, ease, flattening, print]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: mueller
    resource: https://www.muellerundsohn.com/en/allgemein/cutting-technique-body-fashion-for-day-and-night
    title: "M. Müller & Sohn, Pattern Cutting for Body Fashion, E. Küpper, 12 Jun 2022"
    author: org:mueller-und-sohn
  - id: us4894919
    resource: https://patents.google.com/patent/US4894919
    title: US patent 4,894,919
  - id: koreascience
    resource: https://www.koreascience.or.kr/article/JAKO199811919992435.page
    title: Korean knit-bodice reduction study
  - id: montes
    resource: https://history.siggraph.org/?p=104289
    title: "Montes et al., Computational Design of Skintight Clothing, SIGGRAPH 2020"
  - id: bartle
    resource: https://www.cs.ubc.ca/labs/imager/tr/2016/PhysicsDrivenPatternAdjustment
    title: "Bartle et al., Physics-driven Pattern Adjustment, SIGGRAPH 2016"
  - id: pietroni
    resource: https://arxiv.org/abs/2202.10272
    title: "Pietroni et al., Computational Pattern Making from 3D Garment Models, 2022"
  - id: clo-ease
    resource: https://support.clo3d.com/hc/ja/community/posts/360051917533-How-To-Flatten-A-Pattern-With-Ease-Already-Incorporated
    title: "CLO community, flatten with ease"
    author: org:clo
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror), section 4"
    author: claude-code/claude-opus-5-5
  - id: pc-notes
    resource: /references/research/patternmaking-and-construction.md
    title: "Research notes: patternmaking and construction (in-bundle mirror), sections 1 and 4"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Ship level 1 first: scale each flattened piece anisotropically along the fabric's course and wale axes
by that fabric's measured factors (e.g. ×0.80–0.85 width, ×0.95–1.0 length), exposed as per-fabric
presets the manufacturer can override.** This matches what pattern cutters do today. Levels 2 and 3
distribute strain more cleverly but depend on a material model nobody has published for leotard fabrics.
The dominant error source is the material model and chosen ease, not the flattening algorithm.[^gg-notes]

# Why compensation is needed

Flattening the body surface yields a zero-ease piece (CLO users add ease by slash-and-spread or by
modifying the avatar).[^clo-ease][^gg-notes] Stretch pieces must be smaller than the body by an
anisotropic negative ease; trade guidance for four-way stretch: deduct 15–20% of width and 0–5% of
length, scale width and length separately, verify per material, and for mixed materials reduce each
piece by its own fabric's factor.[^mueller][^gg-notes] Reductions dictated by measured course/wale
stretch are also found in a US patent and a Korean knit-bodice study.[^us4894919][^koreascience][^gg-notes]
Domain detail: [negative ease](/domain/construction/negative-ease.md),
[Watkins method](/domain/construction/watkins-stretch-reduction-method.md).

# Three levels **[INFERRED]**

| Level | Method | When |
|---|---|---|
| 1 Industry-equivalent | Scale the flattened piece by per-fabric X (around body) and Y (along body) factors; re-true mating seam lengths | first release |
| 2 Target stretch tensor | Flatten against a target metric instead of the identity: ARAP/SLIM with the rest metric pre-scaled, so the solver distributes strain while respecting seams | when level 1 distorts curved panels visibly |
| 3 Physics-based | Optimise patterns for pressure and seam-traction objectives in the spirit of Montes et al.; Bartle et al.'s fixed-point pattern adjustment against a simulator is the black-box variant | offline "premium pattern-making" output |

Sources for the research precedents: Montes, Bartle, Pietroni.[^montes][^bartle][^pietroni][^gg-notes]

# Criteria specific to stretch fabric **[INFERRED]**

- Fabric must be in tension everywhere (strain > 0, or it wrinkles) and below a comfortable maximum,
  in each knit direction — unlike woven tailoring's "minimise distortion".
- Double curvature (bust, seat) is absorbed by stretch, not darts: a few percent of residual geometric
  distortion is immaterial next to the roughly 18–25% working strain implied by a 15–20% width reduction
  (1/0.85 − 1 to 1/0.80 − 1).
- By Laplace (p = T/r) a uniform percentage gives higher pressure on small radii (arms, small children's
  torsos); ease may need to vary by size and region — validate with manufacturers. Watkins' tension
  release factor (1.0 adult … 0.5 small child) is the published version of this.[^pc-notes]

All three points from the research note's reasoning.[^gg-notes]

# Print pre-distortion falls out of the mapping **[INFERRED]**

Artwork authored on the body is resampled through (pattern piece → body surface) into the smaller
unstretched piece; printing it flat and stretching it on the wearer restores the intended look, exactly
to the extent that the assumed strain field matches reality. With a 15–20% width reduction a circle drawn
on the body prints as an ellipse about 0.80–0.85× as wide.[^gg-notes] Per-fabric, per-axis press
shrinkage compensation is a separate manufacturer-set factor (see
[sublimation production](/domain/construction/sublimation-production.md)).[^pc-notes]

# Stones and stretch

Stones are rigid: positions compress on the relaxed piece while diameters do not; see
[two-state collision checks](/engineering/geometry/two-state-collision-checks.md).

# Gaps

No source describes how commercial tools pre-distort sublimation artwork for stretch; no fabric-specific
reduction values for Mystique, velvet or mesh.[^gg-notes][^pc-notes]

[^mueller]: Müller & Sohn, Pattern Cutting for Body Fashion.
[^us4894919]: US4894919.
[^koreascience]: KoreaScience knit-bodice study.
[^montes]: Montes et al. 2020.
[^bartle]: Bartle et al. 2016.
[^pietroni]: Pietroni et al. 2022.
[^clo-ease]: CLO community, flatten with ease.
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
[^pc-notes]: Research notes: patternmaking and construction (in-bundle mirror).
