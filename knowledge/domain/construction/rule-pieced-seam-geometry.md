---
type: Design Rule
title: "Rule: pieced seam geometry"
description: "Lines realised as pieced seams must be straight or gently curved with no inside corners or L-insets, panels must be wider than their allowances, and seam count and seam placement in strain zones are limited; thresholds are factory-set defaults."
tags: [construction, rule, seams, panels, manufacturability]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: porter-colour
    resource: https://spandexsimplified.com/colour-blocking-for-spandex/
    title: "Spandex Simplified, Colour Blocking, 23 Mar 2021"
    author: org:spandex-simplified
  - id: babylock
    resource: https://babylock.com/gymnast-leotard
    title: "Baby Lock, Gymnast Leotard project"
    author: org:baby-lock
  - id: chalkbucket
    resource: https://chalkbucket.com/threads/tips-for-making-a-leotard.44234/
    title: "ChalkBucket, Tips for making a leotard, Jan-Feb 2014"
    author: org:chalkbucket
  - id: pc-notes
    resource: /references/research/patternmaking-and-construction.md
    title: "Research notes: patternmaking and construction (in-bundle mirror), sections 1 and 10"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**A line marked as a pieced seam must be straight or gently curved, must not turn a corner or form an
L-shaped inset, and must leave every panel wider than its two seam allowances; intricate shapes go to
appliqué or print instead.** The qualitative rules are sourced; every numeric threshold is a proposed
default because no manufacturer publishes minimum panel size, seam radius or seam count.[^porter-colour][^pc-notes]

# Checks

| ID | Check | Default (configurable) | Severity | Basis |
|---|---|---|---|---|
| PS-1 | Pieced line is a line or smooth curve | flag curvature radius below a minimum (no published value; factory sets it) | warning | sourced rule, numeric threshold **[INFERRED]**[^porter-colour] |
| PS-2 | No corner within a seam; no square edge set into an L-shaped opening | flag interior corners | error | sourced[^porter-colour] |
| PS-3 | V-points allowed but cost extra: stay-stitch ¼ in from the edge for about 3 in up from the point and clip into the V | flag as extra operation | info | sourced[^babylock] |
| PS-4 | Panel narrowest width > 2 × seam allowance + visible minimum | with 6 mm allowances, < ≈12 mm has no visible face | error below 12 mm, warning below factory minimum | **[INFERRED]** from 6 mm allowances[^porter-colour] |
| PS-5 | Two adjacent seams not closer than their combined allowances | 12 mm | error | **[INFERRED]** |
| PS-6 | Seam count per garment | cap configurable; each seam adds two allowance layers, reduces stretch across it and adds an operation | warning | **[INFERRED]** |
| PS-7 | Avoid pieced seams through the crotch point, under the arm, or across the centre of the seat | warning only | warning | **[INFERRED]**; consistent with friction/strain emphasis but no source states it |
| PS-8 | Sewing order exists: small pieces join into blocks first; pieces staggered at points so allowances cross on the seam line | plan check | info | sourced[^porter-colour] |
| PS-9 | Asymmetric design → full (unfolded) pattern pieces | automatic | — | sourced[^porter-colour] |

All via the research note.[^pc-notes]

# When a line fails

Offer the alternatives from [three ways to make a design line](/domain/construction/design-line-realisations.md):
re-realise as appliqué (any shape; extra layer) or as a print line (only on sublimation-compatible
fabric). Makers use the same decision rule: simple lines and curves are seamed and coverstitched flat;
swirly designs are overlaid and zigzagged.[^chalkbucket][^pc-notes]

# Geometry notes for implementation **[INFERRED]**

- "Gently curved" must be measured on the *flattened* piece edge and on the body; a geodesic that
  looks smooth on the body can still produce a tight curve after flattening near the bust or seat.
- Corner detection should treat the junction of three or more seams separately from a corner within
  one seam: T-junctions are normal, a seam that changes direction sharply is not.

[^porter-colour]: Spandex Simplified, Colour Blocking.
[^babylock]: Baby Lock, Gymnast Leotard project.
[^chalkbucket]: ChalkBucket forum thread.
[^pc-notes]: Research notes: patternmaking and construction (in-bundle mirror).
