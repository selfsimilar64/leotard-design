---
type: Design Rule
title: "Rule: crystal keep-outs and machine limits"
description: "Manufacturability checks for stones: keep-out bands at seams, elastic edges and layered areas, underarm exclusion, small stones on straps, separate glue footprints, setter field and hopper limits, and test flags for foil and metallic bases."
tags: [construction, rule, crystals, keep-out, manufacturability]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: preciosa
    resource: https://www.preciosa-eshop.com/user/related_files/preciosa-hotfix-application-manual-complete-en-2.pdf
    title: Preciosa Hotfix application manual (2019)
    author: org:preciosa
  - id: porter-crystal
    resource: https://spandexsimplified.com/crystalling-on-spandex/
    title: "Spandex Simplified, Crystalling on Spandex, 28 Mar 2021"
    author: org:spandex-simplified
  - id: porter-rhinestones
    resource: https://spandexsimplified.com/crystalling-spandex
    title: "Spandex Simplified, Everything You Need to Know about Rhinestones, 2 Mar 2021"
    author: org:spandex-simplified
  - id: coldesi-cams
    resource: https://coldesi.com/automatic-rhinestone-setting-machines/
    title: "ColDesi, CAMS automatic rhinestone setting machines"
    author: org:coldesi
  - id: sp-fabrics
    resource: https://teamwear.sylviap.com.au/pages/fabric-options
    title: Sylvia P Teamwear fabric options
    author: org:sylvia-p
  - id: quatro-stones
    resource: https://quatrogymnastics.com/pages/tw-stones
    title: Quatro stones
    author: org:quatro
  - id: pc-notes
    resource: /references/research/patternmaking-and-construction.md
    title: "Research notes: patternmaking and construction (in-bundle mirror), sections 7 and 10"
    author: claude-code/claude-opus-5-5
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror), section 4"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Stones fail on seams, layered material and friction zones, rigid stones crowd when the fabric
relaxes, and machine motifs have hard size and colour limits; none of the distances is published, so
every keep-out width is a factory setting.**[^pc-notes] This file is the construction-side rule family;
stone sizes, placement vocabulary and press parameters are in [/domain/embellishments/](/domain/embellishments/about.md),
and the two-state spacing check in [two-state collision checks](/engineering/geometry/two-state-collision-checks.md).

# Checks

| ID | Check | Default (configurable) | Severity | Basis |
|---|---|---|---|---|
| CK-1 | Keep-out band along seam lines and seam allowances | width configurable (no published mm) | warning | sourced: stones failing on seams/layered material is a standard fault; pressure near seams needs special care[^preciosa] |
| CK-2 | Keep-out band along turned-elastic edges | width configurable | warning | **[INFERRED]** from layered-material fault[^preciosa] |
| CK-3 | Multi-layer overlaps (appliqué, lining seams) | warn | warning | sourced fault class[^preciosa] |
| CK-4 | Underarm friction zone | exclude or small low-profile stones only | warning | sourced[^porter-rhinestones] |
| CK-5 | Elastic straps: smaller stones only | max size configurable | warning | sourced[^porter-rhinestones] |
| CK-6 | Large stones detach more easily and are sewn as well as glued | flag above a size | info | sourced[^porter-rhinestones] |
| CK-7 | Glue footprints stay separate (dots, never lines or touching clusters) → minimum centre spacing > stone diameter + glue margin | margin configurable | error | sourced qualitatively[^porter-crystal]; numbers **[INFERRED]** |
| CK-8 | Spacing checked in both worn and relaxed states | both | error | **[INFERRED]**[^gg-notes] |
| CK-9 | Machine motif tile ≤ 400 × 400 mm; ≤ 6 size/colour classes per pass; stones 2–5 mm | CAMS limits | warning | sourced[^coldesi-cams] |
| CK-10 | Stones > ss16 or mixed-size motifs pressed from the reverse with more pressure; > 5 mm outside machine range (hand set) | flag and cost | info | sourced[^preciosa][^coldesi-cams] |
| CK-11 | Base must withstand ≥ 120 °C and absorb glue; Teflon, water-repellent, softener/easy-care finishes, metal-pigment dyes and smooth leather-like surfaces unsuitable | block or test flag | warning | sourced[^preciosa] |
| CK-12 | Crystals on foil (Mystique) or metallic finishes | "test required" flag; crystal areas on Mystique may dull from heat | warning | sourced[^sp-fabrics][^preciosa] |
| CK-13 | Crystals on unsupported single-layer mesh | forbid unless test flag set | warning | **[INFERRED]** |
| CK-14 | Stone coverage per region (stretch loss) | warn above a configurable coverage | warning | **[INFERRED]**; brands state stones loosen as the garment stretches in wear[^quatro-stones] |

All via the research note.[^pc-notes]

# The relaxed-state trap

With a 15–20% width reduction, stones designed at pitch *d* on the body sit at 0.80–0.85·*d* on the
relaxed fabric; any design whose as-worn gap is under roughly 15–20% of the as-worn pitch (about 18–25%
of the stone diameter) in the stretch direction will touch or overlap off the body.[^gg-notes] Which
state is binding depends on whether stones are applied relaxed (factory: flat pieces) or stretched
(atelier: garment stretched on a board to within an inch or two of worn size).[^porter-crystal][^pc-notes]
See [open question](/domain/construction/open-question-stoning-state-and-crystal-grading.md).

[^preciosa]: Preciosa Hotfix application manual.
[^porter-crystal]: Spandex Simplified, Crystalling on Spandex.
[^porter-rhinestones]: Spandex Simplified, rhinestone guide.
[^coldesi-cams]: ColDesi, CAMS machines.
[^sp-fabrics]: Sylvia P fabric options.
[^quatro-stones]: Quatro stones.
[^pc-notes]: Research notes: patternmaking and construction (in-bundle mirror).
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
