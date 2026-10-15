---
type: Domain Concept
title: Pattern markings
description: "What a leotard pattern piece must carry besides its outline: cut and sew lines, notches (and their types), grain/stretch line, fold/mirror line, internal lines, cut-outs, drill holes, piece labels, and how each maps to DXF layers in the two known conventions."
tags: [construction, pattern, markings, notches, grain, dxf]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: valentina
    resource: https://gitlab.com/smart-pattern/valentina/-/raw/develop/src/libs/vdxf/vdxfengine.cpp
    title: Valentina source, vdxfengine.cpp
    author: org:valentina
  - id: seamly-src
    resource: https://raw.githubusercontent.com/FashionFreedom/Seamly2D/develop/src/libs/vdxf/vdxfengine.cpp
    title: Seamly2D source, vdxfengine.cpp
    author: org:fashionfreedom
  - id: browzwear-layers
    resource: https://help.browzwear.com/hc/en-us/articles/4921417374617
    title: "Browzwear Help, DXF layers"
    author: org:browzwear
  - id: clo-dxf
    resource: https://support.clo3d.com/hc/en-us/articles/115000493067-2D-Pattern-DXF-Import-Export
    title: "CLO Help Center, 2D Pattern (DXF) Import/Export"
    author: org:clo
  - id: clo-pen
    resource: https://support.clo3d.com/hc/en-us/articles/360000344167
    title: "CLO Help Center, 3D Pen (Avatar)"
    author: org:clo
  - id: porter-colour
    resource: https://spandexsimplified.com/colour-blocking-for-spandex/
    title: "Spandex Simplified, Colour Blocking, 23 Mar 2021"
    author: org:spandex-simplified
  - id: porter-cut
    resource: https://spandexsimplified.com/how-to-cut-spandex/
    title: "Spandex Simplified, How to Cut Spandex, 17 Jan 2021"
    author: org:spandex-simplified
  - id: porter-sleeves
    resource: https://spandexsimplified.com/how-to-sew-sleeves/
    title: "Spandex Simplified, How to Sew Sleeves, 26 Apr 2024"
    author: org:spandex-simplified
  - id: elastic-quarter
    resource: https://spandexsimplified.com/how-to-apply-elastic/
    title: "Spandex Simplified, How to Apply Elastic, 15 Apr 2022"
    author: org:spandex-simplified
  - id: nbc-2021
    resource: https://www.nbcsportsphiladelphia.com/tokyo-olympics/inside-the-creation-of-simone-biles-goat-leotard/186340/
    title: "NBC Sports, 24 Jul 2021"
    author: org:nbc-sports
  - id: pc-notes
    resource: /references/research/patternmaking-and-construction.md
    title: "Research notes: patternmaking and construction (in-bundle mirror), sections 1, 2, 3, 5 and 9"
    author: claude-code/claude-opus-5-5
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror), section 4"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Each exported piece needs, besides its cut outline: the sew line, notches, a grain line defined as
"greatest stretch across", a fold/mirror line where cut on the fold, internal lines (appliqué and print
placement), internal cut-outs, drill holes, and a label carrying style, size, fabric and athlete or
alteration.** The research covers the DXF layer conventions for these; it does not cover seam-allowance
corner conventions or notch-placement rules for stretch sewing, which remain a gap.[^gg-notes][^pc-notes]

# Markings and their meaning

| Marking | Leotard convention | Source |
|---|---|---|
| Cut line | Outer boundary including allowance | [^valentina][^pc-notes] |
| Sew (stitch) line | 6 mm inside the cut line on seams; export explicitly on its own layer **[INFERRED]** | [^clo-dxf][^pc-notes] |
| Grain line | Greatest stretch runs around the body; grain lines are parallel and perpendicular to the factory edge; atelier colour blocking marks a grain guide parallel to centre front on every piece | [^porter-cut][^porter-colour][^pc-notes] |
| Directional lock | Napped, one-way-printed or directional-foil fabrics: all pieces face the same way (no 180° rotation) **[INFERRED]** as a marking from the cutting rule | [^porter-cut][^pc-notes] |
| Fold / mirror line | Symmetric pieces cut on the fold; asymmetric designs need a full unfolded piece | [^porter-cut][^porter-colour][^pc-notes] |
| Notches | Match points between mating edges, e.g. sleeve cap midpoint to shoulder seam; elastic and opening are quartered and matched | [^porter-sleeves][^elastic-quarter][^pc-notes] |
| Straight-edge flag | CLO lets a drawn line flatten as a straight edge (e.g. centre front/back) | [^clo-pen][^gg-notes] |
| Internal lines | Appliqué placement outlines, print reference lines | [^valentina][^pc-notes] |
| Internal cut-outs | Keyholes and cut-outs inside a piece | [^valentina][^pc-notes] |
| Drill holes | Point markings inside a piece (leotard use, e.g. stone or appliqué reference points, is **[INFERRED]**) | [^valentina][^pc-notes] |
| Piece label | Style, size, fabric and athlete/alteration, mirroring GK's bundling by athlete size and alteration **[INFERRED]** | [^nbc-2021][^pc-notes] |

# DXF layer conventions (two incompatible numberings)

| Content | AAMA / Valentina-style | Lectra-style (Browzwear doc) |
|---|---|---|
| Piece boundary (cut line) and piece text | 1 | 1 contour (must contain external cut line) |
| Turn points / end points | 2 | 2 |
| Curve points | 3 | — |
| Notches | 4 | 3 |
| Grading lines / mirror axis | 6 mirror line | 5 |
| Lines to plot | — | 7 |
| Grain line | 7 | 9–10 grain and cross lines |
| Internal lines | 8 | 8 internal lines to plot |
| Internal cut-outs | 11 | 11 internal lines to cut |
| Drill holes | 13 | 13 |
| Sew line | 14 | 14 seam lines |
| Annotation text | 15 (ASTM) or 19 (AAMA) | 19 |
| ASTM-only notch types | 80–83: T, castle, check and U notches | — |
| ASTM-only validation curves | 84–87 | — |

Each piece is a DXF BLOCK placed by an INSERT.[^valentina][^browzwear-layers][^pc-notes] Seamly2D's AAMA
exporter writes outline on 1, seam line and internal paths on 8, cut-outs on 11, notches on 4, grain
on 7, using POLYLINE (LWPOLYLINE in newer DXF), LINE, TEXT, BLOCK and INSERT.[^seamly-src][^pc-notes]
Note the disagreement on where the sew line goes (14 versus 8), one reason the layer map must be a
per-receiver preset (see [DXF exchange](/domain/construction/dxf-pattern-exchange.md)).

# Gaps

Seam-allowance corner conventions (mitred, squared, mirrored), notch placement rules for stretch
sewing, and label content or placement rules for leotards were not researched or found.[^gg-notes][^pc-notes]
These need a pattern-maker's input; see [open question](/domain/construction/open-question-factory-pattern-data.md).

[^valentina]: Valentina source, vdxfengine.cpp.
[^seamly-src]: Seamly2D source, vdxfengine.cpp.
[^browzwear-layers]: Browzwear Help, DXF layers.
[^clo-dxf]: CLO Help Center, DXF import/export.
[^clo-pen]: CLO Help Center, 3D Pen (Avatar).
[^porter-colour]: Spandex Simplified, Colour Blocking.
[^porter-cut]: Spandex Simplified, How to Cut Spandex.
[^porter-sleeves]: Spandex Simplified, How to Sew Sleeves.
[^elastic-quarter]: Spandex Simplified, How to Apply Elastic.
[^nbc-2021]: NBC Sports, 24 Jul 2021.
[^pc-notes]: Research notes: patternmaking and construction (in-bundle mirror).
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
