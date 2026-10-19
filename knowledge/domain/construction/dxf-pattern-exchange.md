---
type: Domain Concept
title: DXF pattern exchange
description: "DXF-AAMA (often R10/R12-style) is the practical pattern interchange format in 2026, DXF-ASTM (ASTM D6673, withdrawn 2019) is supported but loosely defined, and imports break on layers, notches, seam-allowance/cut-line confusion and units."
tags: [construction, export, dxf, cad, interchange]
stale_after: 2027-10-15T00:00:00Z
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: astm-d6673
    resource: https://store.astm.org/d6673-10.html
    title: ASTM D6673-10 store page
    author: org:astm
  - id: clo-dxf
    resource: https://support.clo3d.com/hc/en-us/articles/115000493067-2D-Pattern-DXF-Import-Export
    title: "CLO Help Center, 2D Pattern (DXF) Import/Export, updated Oct 2026"
    author: org:clo
  - id: seamly-fwd
    resource: https://forum.seamly.io/t/exporting-dxf-pattern-to-be-imported-into-lectra/17010
    title: "Seamly forum, export to Lectra, Mar-Apr 2026"
    author: org:seamly
  - id: seamly-sa
    resource: https://forum.seamly.io/t/now-we-cant-export-dxf-file-without-seam-allowance/11760
    title: "Seamly forum, DXF without seam allowance, Jan-Feb 2025"
    author: org:seamly
  - id: minerva-aama
    resource: https://minervapatterns.com/blog/dxf-aama-vs-dxf-astm
    title: "Minerva Patterns, DXF AAMA vs ASTM"
    author: org:minerva-patterns
  - id: minerva-layers
    resource: https://minervapatterns.com/blog/dxf-layers-and-entities-what-is-inside-a-pattern-file
    title: "Minerva Patterns, DXF layers and entities"
    author: org:minerva-patterns
  - id: wiki-lectra
    resource: https://en.wikipedia.org/wiki/Lectra
    title: "Wikipedia, Lectra"
    author: org:wikipedia
  - id: wiki-gerber
    resource: https://en.wikipedia.org/wiki/Gerber_Scientific
    title: "Wikipedia, Gerber Scientific"
    author: org:wikipedia
  - id: tukacad
    resource: https://tukatech.com/tukacad/
    title: Tukatech TUKAcad
    author: org:tukatech
  - id: seamly2d
    resource: https://github.com/FashionFreedom/Seamly2D
    title: Seamly2D on GitHub
    author: org:fashionfreedom
  - id: zund
    resource: https://www.zund.com/en/applications/fashion
    title: Zünd fashion applications
    author: org:zund
  - id: pc-notes
    resource: /references/research/patternmaking-and-construction.md
    title: "Research notes: patternmaking and construction (in-bundle mirror), section 9"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Export DXF-AAMA (with an R10/R12-style polyline option) as the primary pattern format and DXF-ASTM as
a second flavour, with the layer map as an editable preset per receiving system and a round-trip test
piece.** ASTM D6673 was withdrawn in 2019 without replacement, and real-world imports fail silently on
notches, grain lines, seam allowance and units.[^pc-notes] Layer numbers are in
[pattern markings](/domain/construction/pattern-markings.md).

# The landscape

- **ASTM D6673** ("Sewn Products Pattern Data Interchange — Data Format"): 2D pattern pieces as DXF
  following the AutoCAD Release 13 spec plus a separate ASCII grade-rule-table file; explicitly
  excludes cutter/plotter instructions, marker information and 3D relationships; the 2010 edition is
  marked withdrawn in 2019 with no replacement.[^astm-d6673][^pc-notes]
- **CLO** exchanges patterns by DXF with Yuka, Gerber, Lectra, StyleCAD, Optitex and PAD System.
  Import: Standard DXF, DXF-AAMA, DXF-ASTM (user picks the flavour; formerly auto-detected), with
  options for unit scale, rotation, annotations, tracing baselines as internal lines, swapping cutting
  and sewing lines, where notches land (seam allowance, outline or both), curve-point optimisation,
  and removing non-grading points on AAMA; since 2026.1 DXF seam allowances are read as locked custom
  allowances. Export: DXF-AAMA (= former "Gerber" option), DXF-ASTM or Standard DXF, one grading size
  group per file, grading embedded or as a separate rule file (= former "Lectra rule file"), options
  for base size only, no baselines, duplicate notches onto the allowance, swap cut/sew lines, bounding
  boxes for Illustrator/Photoshop.[^clo-dxf][^pc-notes]
- **Systems:** Lectra (Modaris pattern software since 1984, Vector cutters) acquired Gerber Technology
  in 2021, so AccuMark and Modaris have one owner; Tukatech TUKAcad covers drafting, grading (incl.
  angle grading for lingerie and swim), marker making and made-to-measure, with import/export in paid
  tiers from $199/month; Seamly2D (GPLv3+) and Valentina are open-source parametric pattern programs
  with DXF exporters; Zünd cutting-room software includes Cut Center, Design Center, PreCut Center,
  PrimeCenter and Mind.[^wiki-lectra][^wiki-gerber][^tukacad][^seamly2d][^zund][^pc-notes]

# Field reports (2025–2026)

- An R10 "AAMA" DXF was the variant that imported into Lectra Modaris and the only one a VStitcher
  user could open, with notches and grain lines sometimes lost.[^seamly-fwd][^pc-notes]
- A Seamly developer called DXF-ASTM too loosely defined to be very useful.[^seamly-fwd][^pc-notes]
- A CLO user found R10 curves arrived as many points (slow) while a 2013 AAMA export arrived with few
  points and notches intact; seam-allowance visibility had to be set per piece.[^seamly-sa][^pc-notes]
- Typical silent failures listed by a pattern vendor: vanished notches, grain line imported as an
  ordinary line, seam allowance fused into the cut line, mm/inch mismatch, curves faceted into
  micro-segments. Advice: match the receiver's flavour from a sample file and spot-check one graded
  size.[^minerva-aama][^minerva-layers][^pc-notes]

# Implications **[INFERRED]**

- Ship receiver presets (AAMA/Valentina-style, Lectra-style) and let the factory edit the layer map.
- Write cut line and sew line on separate layers always; never rely on the receiver computing allowance.
- Prefer one file per size over a grade-rule file until a receiver's rule import is proven.
- Gaps: Optitex, AccuMark and Modaris native formats, the full ASTM D6673 / AAMA texts and grade-rule
  record structure, and cutter-native formats were not verified.[^pc-notes]

[^astm-d6673]: ASTM D6673-10 store page.
[^clo-dxf]: CLO Help Center, DXF import/export.
[^seamly-fwd]: Seamly forum, export to Lectra.
[^seamly-sa]: Seamly forum, DXF without seam allowance.
[^minerva-aama]: Minerva Patterns, DXF AAMA vs ASTM.
[^minerva-layers]: Minerva Patterns, DXF layers and entities.
[^wiki-lectra]: Wikipedia, Lectra.
[^wiki-gerber]: Wikipedia, Gerber Scientific.
[^tukacad]: Tukatech TUKAcad.
[^seamly2d]: Seamly2D repository.
[^zund]: Zünd fashion applications.
[^pc-notes]: Research notes: patternmaking and construction (in-bundle mirror).
