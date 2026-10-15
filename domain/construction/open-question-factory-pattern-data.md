---
type: Open Question
title: "Open question: unpublished factory pattern data"
description: "No leotard manufacturer publishes its block, negative ease, garment measurements, seam and stitch spec, manufacturability thresholds, CAD system or file requirements; these must come from conversations with one or two target manufacturers."
tags: [construction, open-question, manufacturer, patternmaking]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: pc-notes
    resource: /references/research/patternmaking-and-construction.md
    title: "Research notes: patternmaking and construction (in-bundle mirror), Gaps blocks of sections 1-11"
    author: claude-code/claude-opus-5-5
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror), section 4 gaps"
    author: claude-code/claude-opus-5-5
  - id: report
    resource: /references/research/research-report.md
    title: "Research report (in-bundle mirror), gaps table"
    author: claude-code/claude-opus-5-5
---

# The question

**What numbers and formats does a real leotard factory use, so the tool's defaults and exports match
production?** Every manufacturability threshold in this section is a proposed default, because the
research found none published.[^pc-notes][^report] The report's recommended route is conversations with
one or two target manufacturers.[^report]

# What is missing

| Topic | Gap | Where it bites |
|---|---|---|
| Blocks and ease | No factory block or ease % from GK, Sylvia P, Quatro, Milano, Christian Moreau; no flat garment measurements per size for any brand (which would reveal real negative ease) | [negative ease](/domain/construction/negative-ease.md) |
| Fabric stretch | No numeric stretch for stretch velvet, Mystique/hologram or stretch mesh; no quantified stretch loss from foil printing, seams, appliqué, vinyl or stone coverage | [Watkins method](/domain/construction/watkins-stretch-reduction-method.md) |
| Sizing compensation | No correction for heavy stoning or foil overlays; no mesh-sleeve drafting rule | [stretch block drafting](/domain/construction/stretch-block-drafting.md) |
| Seams and stitches | No factory seam allowance, stitch spec, elastic tension, machine list; no evidence on metered elastic, binding folders or flatlock on leotards | [seams](/domain/construction/seams-stitches-and-allowances.md) |
| Thresholds | No minimum panel size, max seam count, min seam radius, crystal-to-seam distance, max crystal coverage, min appliqué feature size; no strap-strength data | the `rule-*` concepts |
| Markings | Seam-allowance corner conventions, notch placement for stretch sewing, label types/placement/content not researched or found | [pattern markings](/domain/construction/pattern-markings.md) |
| CAD and files | Which CAD system any leotard maker uses; Optitex/AccuMark/Modaris native formats; full ASTM D6673/AAMA texts; cutter-native formats | [DXF exchange](/domain/construction/dxf-pattern-exchange.md) |
| Print files | Required bleed width, file format, resolution; colour management (ICC/RIP); fabric shrinkage under sublimation; factory dwell time and pressure | [sublimation](/domain/construction/sublimation-production.md) |
| Cutting | Die cutting, ply counts, lay heights, cutter models, marker efficiency; single- vs low-ply laser at GK | [cutting](/domain/construction/cutting-and-marker-making.md) |
| Flattening accuracy | No published mm or % error for 3D-to-2D flattening of stretch garments (only an anecdotal 3.3 mm on a cube in CLO)[^gg-notes] | [pattern flattening](/engineering/geometry/pattern-flattening.md) |
| Rules | FIG 2025–2028 WAG Code of Points and USA Gymnastics attire text not retrieved | [/domain/rules/](/domain/rules/about.md) |
| Costs | No per-stage cost or standard-minute data; GK fees and price tiers unpublished | [custom orders](/domain/construction/custom-order-process-and-lead-times.md) |

All gaps as recorded in the research notes.[^pc-notes][^gg-notes]

# Questions to ask a manufacturer

1. Do you work from your own graded blocks? Would you accept designs mapped onto them, or new pieces?
2. Your width and length reduction per fabric (or how you derive it), and do you vary it by size?
3. Seam allowance, stitch types and densities, elastic width and length ratios per opening.
4. Minimum panel width, seam curvature, seam count; stone-to-seam and stone-to-edge distances.
5. Which CAD system, DXF flavour and layer map; one file per size or grade rules?
6. Print file format, resolution, bleed, colour profile; cut-then-press or print-then-cut?
7. Stone template format for your setters; are stones applied to flat relaxed pieces, or to the
   garment stretched?
8. Piece labels and bundle identifiers you need.

[^pc-notes]: Research notes: patternmaking and construction (in-bundle mirror).
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
[^report]: Research report (in-bundle mirror).
