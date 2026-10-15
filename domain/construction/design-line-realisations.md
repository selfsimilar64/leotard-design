---
type: Domain Concept
title: Three ways to make a design line
description: "Every line a designer draws becomes a pieced seam (straight or gentle curves, 6 mm allowances), a stitched appliqué overlay (any shape, extra layer), or a sublimated print boundary (no seam); the choice sets the line's shape limits and cost."
tags: [construction, design-line, seam, applique, sublimation, panels]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: porter-colour
    resource: https://spandexsimplified.com/colour-blocking-for-spandex/
    title: "Spandex Simplified, Colour Blocking, 23 Mar 2021"
    author: org:spandex-simplified
  - id: chalkbucket
    resource: https://chalkbucket.com/threads/tips-for-making-a-leotard.44234/
    title: "ChalkBucket, Tips for making a leotard, Jan-Feb 2014"
    author: org:chalkbucket
  - id: babylock
    resource: https://babylock.com/gymnast-leotard
    title: "Baby Lock, Gymnast Leotard project"
    author: org:baby-lock
  - id: jalie-3901
    resource: https://cdn.shopify.com/s/files/1/0267/4075/2568/files/product_sizes_3901.pdf?v=1605550698
    title: Jalie 3901 size/yardage sheet
    author: org:jalie
  - id: gk-sublimation
    resource: https://www.gkelite.com/pages/about-sublimation
    title: GK About Sublimation
    author: org:gk-elite
  - id: porter-neck
    resource: https://spandexsimplified.com/neck-back-style-variations/
    title: "Spandex Simplified, Neck & Back Style Variations, 5 Nov 2021"
    author: org:spandex-simplified
  - id: pc-notes
    resource: /references/research/patternmaking-and-construction.md
    title: "Research notes: patternmaking and construction (in-bundle mirror), sections 1, 6 and 10"
    author: claude-code/claude-opus-5-5
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror), section 2"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**A colour or fabric boundary on a leotard is physically made in one of three ways, and the choice
limits the line's shape.** Pieced seams take only straight or gently curved lines; appliqué takes any
shape at the cost of an extra layer and lost stretch; sublimation takes anything but only on white
polyester-based fabric. Makers apply the rule "simple curves are seamed, swirls are appliquéd".[^porter-colour][^chalkbucket][^pc-notes]
The tool should store the intended realisation per line and validate geometry against it.

# Comparison

| | Pieced seam | Appliqué / stitched overlay | Sublimated print |
|---|---|---|---|
| What it is | Two fabrics cut apart and sewn edge to edge | A shape of a second fabric laid on top and stitched round its edge | Dye transferred into the fabric; colour boundary inside one piece |
| Shape limits | Straight or gently curved; no corners within a seam, no L-shaped insets; V-points possible with extra work | Any shape (laser cutting removes the cutting limit); stitchability is the practical limit | Any shape |
| Allowance | ¼ in (6 mm) each side, added only to new edges | none on the appliqué; placement outline on the base piece | none; print bleeds past the cut line |
| Layers | one (two allowances under the seam) | two in the overlay area | one |
| Stretch effect | seam reduces stretch across it **[INFERRED]** | overlay and its stitched perimeter locally reduce stretch **[INFERRED]** | white base can show when stretched hard |
| Extra operations | sewing, planning order; V needs stay-stitch and clip | glue placement, edge stitching | press test, per-piece artwork |
| Fabric constraint | any | appliqué stretch direction must match the base | white polyester-based fabric only |

Sources: Porter, ChalkBucket, Baby Lock, GK.[^porter-colour][^chalkbucket][^babylock][^gk-sublimation][^pc-notes]
Details: [appliqué and overlays](/domain/construction/applique-and-overlays.md),
[sublimation production](/domain/construction/sublimation-production.md),
[seams and allowances](/domain/construction/seams-stitches-and-allowances.md).

Specific facts:

- A V-shaped inset seam needs stay-stitching ¼ in from the edge for about 3 in up from the point and
  clipping into the V before sewing.[^babylock][^pc-notes]
- Jalie's 3901 gymnastics pattern combines both: inverted-V seaming front and back plus optional
  appliqués at waist and neck, with about 30 cm of contrast fabric allowed for the appliqués.[^jalie-3901][^pc-notes]
- Illusion necklines are a fourth hybrid: the bodice is cut to the false neckline and backed with mesh
  overlapping 1 in, finished as appliqué.[^porter-neck][^pc-notes]

# Line types the software needs **[INFERRED]**

Because dye-sublimated leotards decouple artwork from construction, colour regions and pattern pieces
are two different partitions of the same surface.[^gg-notes] Proposed line types:

| Line type | Becomes |
|---|---|
| Seam (pieced) | pattern-piece boundary with allowance on both sides |
| Closing seam (side, shoulder, crotch, centre back) | piece boundary; sewn last, decoration may not cross by machine |
| Edge | garment opening (neckline, leg line, armhole, cut-out) finished with elastic or binding |
| Appliqué outline | separate cut piece plus placement line on the base piece |
| Print line | colour boundary inside a printed piece; no cut |
| Strap centreline | strap piece (width parameter) |

Validation per type: lines marked "pieced" are checked against
[pieced seam geometry](/domain/construction/rule-pieced-seam-geometry.md); a line that fails can be
offered as appliqué or print instead. How lines become regions on the body is covered in
[regions and panels from curves](/engineering/geometry/regions-and-panels-from-curves.md).

[^porter-colour]: Spandex Simplified, Colour Blocking.
[^chalkbucket]: ChalkBucket forum thread.
[^babylock]: Baby Lock, Gymnast Leotard project.
[^jalie-3901]: Jalie 3901 size/yardage sheet.
[^gk-sublimation]: GK About Sublimation.
[^porter-neck]: Spandex Simplified, Neck & Back Style Variations.
[^pc-notes]: Research notes: patternmaking and construction (in-bundle mirror).
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
