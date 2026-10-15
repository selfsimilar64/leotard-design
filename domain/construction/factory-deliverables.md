---
type: Domain Concept
title: Factory deliverables
description: "What a design must become for a factory or seamstress to act on it: DXF pattern pieces with markings, plot files, per-piece print images, per-piece stone maps and counts, appliqué pieces, and a tech pack with BOM, graded spec and construction notes."
tags: [construction, export, dxf, tech-pack, bom, seamstress]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: clo-dxf
    resource: https://support.clo3d.com/hc/en-us/articles/115000493067-2D-Pattern-DXF-Import-Export
    title: "CLO Help Center, 2D Pattern (DXF) Import/Export, updated Oct 2026"
    author: org:clo
  - id: minerva-aama
    resource: https://minervapatterns.com/blog/dxf-aama-vs-dxf-astm
    title: "Minerva Patterns, DXF AAMA vs ASTM"
    author: org:minerva-patterns
  - id: techpacker
    resource: https://techpacker.com/blog/design/what-is-a-tech-pack/
    title: "Techpacker, What is a tech pack"
    author: org:techpacker
  - id: jalie-2792
    resource: https://cdn.shopify.com/s/files/1/0267/4075/2568/files/product_sizes_2792.pdf
    title: Jalie 2792 envelope back
    author: org:jalie
  - id: jalie-3901
    resource: https://cdn.shopify.com/s/files/1/0267/4075/2568/files/product_sizes_3901.pdf?v=1605550698
    title: Jalie 3901 size/yardage sheet
    author: org:jalie
  - id: coldesi-cams
    resource: https://coldesi.com/automatic-rhinestone-setting-machines/
    title: "ColDesi, CAMS automatic rhinestone setting machines"
    author: org:coldesi
  - id: wiki-hpgl
    resource: https://en.wikipedia.org/wiki/HP-GL
    title: "Wikipedia, HP-GL"
    author: org:wikipedia
  - id: jewelcraft
    resource: https://github.com/mrachinskiy/jewelcraft
    title: JewelCraft (Blender add-on)
    author: org:jewelcraft
  - id: pc-notes
    resource: /references/research/patternmaking-and-construction.md
    title: "Research notes: patternmaking and construction (in-bundle mirror), sections 4, 6, 7 and 9"
    author: claude-code/claude-opus-5-5
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror), sections 4 and 10"
    author: claude-code/claude-opus-5-5
  - id: report
    resource: /references/research/research-report.md
    title: "Research report (in-bundle mirror), section on factories"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**To be useful to a factory, a design has to arrive as things it can act on: pattern pieces in DXF
(the format garment CAD systems exchange), a print image for each piece, a stone map and count for
each piece, and a specification sheet (tech pack).**[^report][^pc-notes] Which CAD system any leotard
maker uses is not public, so exports must be configurable per receiver. This is what the
[seamstress persona](/product/personas/seamstress.md) receives.

# The deliverable set

| # | Deliverable | Content | Detail |
|---|---|---|---|
| 1 | Pattern pieces, DXF-AAMA | One BLOCK per piece; cut line and sew line on separate layers; notches, grain line, internal lines, cut-outs, drill holes, labels; selectable units; R12-style polyline option and a "true curves" option | [DXF exchange](/domain/construction/dxf-pattern-exchange.md), [markings](/domain/construction/pattern-markings.md) |
| 2 | Pattern pieces, DXF-ASTM | same content | CLO and others import it, but the standard is withdrawn |
| 3 | Grading | separate grade-rule file, or one file per size (nested sizes are safer than relying on rule import) **[INFERRED]** | [grading](/domain/construction/grading-across-sizes.md) |
| 4 | Plot / print files | tiled and full-size PDF; HPGL/PLT (25 µm units, 40 per mm)[^wiki-hpgl] | a pattern vendor ships every pattern as DXF-AAMA + PLT + PDF[^minerva-aama] |
| 5 | Per-piece print images | mirrored, with bleed past the cut line, same coordinate frame as the cut line, per size | [sublimation production](/domain/construction/sublimation-production.md) |
| 6 | Appliqué pieces | cut contour (no allowance), placement outline on the base piece, layer order, edge stitch | [appliqué](/domain/construction/applique-and-overlays.md) |
| 7 | Stone maps and lists | per piece; each stone a centre point + size + colour code; motifs tiled to the setter's field (400 × 400 mm, ≤ 6 size/colour classes per pass on CAMS machines, which take jobs by SD card, USB or LAN from HotFix Era software)[^coldesi-cams]; colour-coded legend with counts by size and colour (jewellery "gem map" precedent)[^jewelcraft][^gg-notes] | [/domain/embellishments/](/domain/embellishments/about.md) |
| 8 | Tech pack (PDF) | see below | |

Rows 1–7 are the research note's minimum viable export set **[INFERRED]** from the cited formats.[^pc-notes]

# Tech-pack contents

A complete tech pack comprises:[^techpacker][^pc-notes]

- Cover / style page: style name and number, season, date, version, colourways.
- Technical flat sketches front, back and side with call-outs for seams, closures, hardware and label placement.
- Bill of materials: every fabric, trim, thread, label and tag with colour references, supplier codes and units.
- Point-of-measure spec for the base size with tolerances, plus grading rules.
- Construction notes: seam types, stitches per inch, thread colour, finishing.
- Cost sheet: materials, cut-make-trim labour, target price.
- Revision log.

It is traditionally built in Illustrator and Excel and sent as a PDF.[^techpacker]

Leotard-specific BOM lines evidenced by pattern envelopes: main fabric, contrast fabric(s), lining
(15–20 cm), ⅜ in elastic by total length, stretch binding by length, one back-neck clasp, contrast
appliqué fabric.[^jalie-2792][^jalie-3901][^pc-notes]

# Where a dedicated tool beats generic CAD **[INFERRED]**

Elastic lengths per opening and size, stone counts by size and colour, thread colours, lining lengths
and print areas are all computable from the design, so the BOM and stone report can be generated per
size automatically. Exporting both stitch and cut lines explicitly, on separate layers, avoids the
commonest import confusion (CLO offers a "swap cutting and sewing lines" option because receivers
disagree).[^clo-dxf][^pc-notes]

# Gaps

Only one tech-pack reference was read; no leotard- or swimwear-specific template with stone or print
placement pages was found; required bleed widths, file formats and resolutions for print files, and
template formats accepted by rhinestone setters, were not found; no evidence of which CAD system GK
or any leotard maker uses.[^pc-notes]

[^clo-dxf]: CLO Help Center, DXF import/export.
[^minerva-aama]: Minerva Patterns, DXF AAMA vs ASTM.
[^techpacker]: Techpacker, What is a tech pack.
[^jalie-2792]: Jalie 2792 envelope back.
[^jalie-3901]: Jalie 3901 size/yardage sheet.
[^coldesi-cams]: ColDesi, CAMS machines.
[^wiki-hpgl]: Wikipedia, HP-GL.
[^jewelcraft]: JewelCraft repository.
[^pc-notes]: Research notes: patternmaking and construction (in-bundle mirror).
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
[^report]: Research report (in-bundle mirror).
