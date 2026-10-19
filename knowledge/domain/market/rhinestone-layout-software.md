---
type: Domain Concept
title: Rhinestone and embellishment layout software
description: "Hotfix template software (Stitch Era / Hotfix Era, TRW Design Wizard) already offers area fills, manual single-stone placement, overlap solving and per-size template output; flat, 2D and cutter-oriented, with no 3D garment preview found."
tags: [market, rhinestones, software, embellishment]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-tools
    resource: /references/research/existing-tools-and-ux-mechanics.md
    title: "Research notes: existing tools and UX mechanics (section 6)"
  - id: stitch-era
    resource: https://edutechwiki.unige.ch/en/Stitch_Era_-_creating_hot_fix_designs
    title: "EduTech Wiki (University of Geneva): Stitch Era, creating hot fix designs (9 Jul 2019)"
  - id: wilcom
    resource: https://docs.wilcom.com/embroiderystudio/28/en/OnlineHelp/Mixed/beading/beading-1.htm
    title: Wilcom EmbroideryStudio beading docs (search snippet)
  - id: trw
    resource: https://www.therhinestoneworld.com/Make-Rhinestone-Templates-with-TRW-Design-Wizard-for-CricutCameo_b_306.html
    title: The Rhinestone World, TRW Design Wizard (search snippet)
---

# Takeaway

Production software for hotfix rhinestone templates already solves the 2D version of our stone
problem: convert a vector shape into stones by a chosen fill pattern, add or edit individual
stones by hand, flag and solve overlaps, and output one cutter template per stone size and
colour.[^stitch-era][^trw] It works on flat artwork for a vinyl cutter; no 3D garment preview was
found in the sources, and current (2026) products were not researched beyond a 2019 tutorial and
two snippets.[^notes-tools]

# What the tools do

| Capability | Stitch Era / Hotfix Era (2019 tutorial) | Others |
|---|---|---|
| Area fill | "single hotfix fill" or "assorted hotfix fill"; fill types Uniform, Flexible, Flat, Hexagonal and an inner-ring fill | — |
| Text | Fill along the stroke, inside the shape, or both | — |
| Single stones | "Manual Hotfix" adds individual stones; "Edit hotfix" moves and deletes | — |
| Overlaps | Flagged automatically; "Solve overlap" fixes them | — |
| Sizes and spacing | SS numbers ("SS6 = 2mm", "SS20 = 5mm"); at least 1 mm spacing recommended | — |
| Output | SVG/DXF for a cutter | TRW Design Wizard separates a design into one template per stone size and colour (snippet)[^trw] |
| Related | — | Wilcom EmbroideryStudio supports "up to eight (8) sequins and/or eight (8) beads per design" (snippet)[^wilcom] |

Source for the Stitch Era column.[^stitch-era]

# Why it matters

- **[INFERRED]** The fill vocabulary (uniform, hexagonal, flexible, ring), the manual/edit split,
  and automatic overlap solving are patterns 9, 6 and 12 in the
  [UX pattern library](/engineering/ux/ux-pattern-library.md). The 1 mm minimum spacing is a
  candidate default for the overlap check; see [/domain/embellishments/](/domain/embellishments/about.md).
- **[INFERRED]** "One template per stone size and colour" is the shape of a factory-facing stone
  output, relevant to the [seamstress view](/product/personas/seamstress.md) and to
  [/domain/construction/](/domain/construction/about.md).

# Gaps

Current rhinestone-design products, versions, 2026 features and any 3D preview were not
researched.[^notes-tools]

[^notes-tools]: Research notes, existing tools and UX mechanics, section 6
[^stitch-era]: EduTech Wiki, Stitch Era hotfix tutorial
[^wilcom]: Wilcom docs, search snippet
[^trw]: The Rhinestone World, search snippet
