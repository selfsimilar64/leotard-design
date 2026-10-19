---
type: Process
title: Cutting and marker making
description: "Factories spread and laser-cut layered stretch fabric and bundle by athlete size; ateliers cut single garments by hand; a one-colour leotard uses about 0.5-1.35 m of 150 cm fabric."
tags: [construction, cutting, marker, yield, process]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: nbc-2021
    resource: https://www.nbcsportsphiladelphia.com/tokyo-olympics/inside-the-creation-of-simone-biles-goat-leotard/186340/
    title: "NBC Sports, 24 Jul 2021"
    author: org:nbc-sports
  - id: nam-2024
    resource: https://nam.org/small-manufacturer-shines-at-olympics-31672
    title: "NAM, 30 Jul 2024"
    author: org:nam
  - id: gabe
    resource: https://gabeclothing.ca/pages/sublimation-program
    title: Gabe Clothing sublimation program
    author: org:gabe-clothing
  - id: zund
    resource: https://www.zund.com/en/applications/fashion
    title: Zünd fashion applications
    author: org:zund
  - id: zund-reg
    resource: https://www.zund.com/en/cutting-systems/registration-methods
    title: Zünd registration methods
    author: org:zund
  - id: wiki-lectra
    resource: https://en.wikipedia.org/wiki/Lectra
    title: "Wikipedia, Lectra"
    author: org:wikipedia
  - id: porter-cut
    resource: https://spandexsimplified.com/how-to-cut-spandex/
    title: "Spandex Simplified, How to Cut Spandex, 17 Jan 2021"
    author: org:spandex-simplified
  - id: jalie-2792
    resource: https://cdn.shopify.com/s/files/1/0267/4075/2568/files/product_sizes_2792.pdf
    title: Jalie 2792 envelope back
    author: org:jalie
  - id: jalie-3901
    resource: https://cdn.shopify.com/s/files/1/0267/4075/2568/files/product_sizes_3901.pdf?v=1605550698
    title: Jalie 3901 size/yardage sheet
    author: org:jalie
  - id: tukacad
    resource: https://tukatech.com/tukacad/
    title: Tukatech TUKAcad
    author: org:tukatech
  - id: pinecrest-k
    resource: https://pinecrestfabrics.com/blog/back-in-stock-kaleidoscope-foiled-stretch-tricot/
    title: "Pine Crest Fabrics, Kaleidoscope foiled stretch tricot"
    author: org:pine-crest-fabrics
  - id: pinecrest-m
    resource: https://pinecrestfabrics.com/blog/mesh-65-soft-weightless-and-stylish-inserts-for-your-activewear-collection/
    title: "Pine Crest Fabrics, Mesh 65"
    author: org:pine-crest-fabrics
  - id: pc-notes
    resource: /references/research/patternmaking-and-construction.md
    title: "Research notes: patternmaking and construction (in-bundle mirror), section 3"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**GK spreads four-way-stretch fabric in layers, laser-cuts it from a waste-minimising marker and
bundles pieces by athlete size and alteration; ateliers cut single garments with shears or a rotary
cutter, without pins.** A one-colour leotard needs roughly 0.5–1.35 m of 150 cm fabric. Team orders
in several fabrics and sizes produce many short markers, so piece labelling matters.[^pc-notes]

# Factory cutting

- GK (2021): fabric spread and laser cut, pieces bundled by athlete size and alteration; staff roles
  include spreaders and cutters. Appliqué shapes are laser-cut too.[^nbc-2021][^pc-notes]
- GK (2024): several layers cut from a pattern laid out to minimise waste; sublimation after cutting.[^nam-2024][^pc-notes]
- Other sublimated sportswear: print the roll first, then laser-cut the printed roll into panels and
  sew aligning the artwork.[^gabe][^pc-notes]
- Automated single-ply cutters (Zünd) offer pattern matching, feature recognition, auto feeding and
  sorting, and camera registration modules (ICC camera, Over Cutter Camera, UNDERCAM) that capture
  printed material before cutting; jersey is a listed material.[^zund][^zund-reg][^pc-notes]
- Multi-ply CNC: Lectra Vector line (since 1993); Gerber Technology (owned by Lectra since 2021).[^wiki-lectra][^pc-notes]
- Marker software for this sector advertises tighter nesting, buffers, blocking, stripe/plaid
  matching and yield/consumption reports.[^tukacad][^pc-notes]

# Atelier cutting (Porter)

Sharp spring-loaded shears; rotary cutter with ruler for strips and freehand appliqué; no pins (hold
by hand or weights); symmetric pieces cut on the fold and mirrored pairs through two layers, but
strips single-layer; a paper pattern can be stuck to the wrong side with repositionable spray
adhesive (also used to cut two mirror-image appliqués at once). Off-grain cutting is tolerable for
appliqué but twists structural pieces.[^porter-cut][^pc-notes]

# Fabric consumption (150 cm / 59–60 in width)

| Pattern | Item | Girls' sizes | Women's sizes |
|---|---|---|---|
| Jalie 2792[^jalie-2792] | One-colour sleeveless | 0.50–0.70 m | 0.90–1.10 m |
| | With long sleeves | 0.60–1.15 m | 1.20–1.35 m |
| | Crotch lining | 20 cm | 20 cm |
| | Contrast bands | 0.10 m | 0.10 m |
| Jalie 3901[^jalie-3901] | Main fabric | 0.45–0.75 m | 0.75–0.85 m |
| | Contrast yoke | 0.25–0.40 m | |
| | Yoke plus three-quarter sleeves | 0.35–0.75 m | |
| | Lining | 15 cm | 15 cm |

Purchase minimums constrain small custom colour runs: 15 yards per colour for a US-stocked foil
tricot; 220 yards for an overseas-stock mesh.[^pinecrest-k][^pinecrest-m][^pc-notes]

# Implications **[INFERRED]**

- Exported pieces need labels carrying style, size, fabric and athlete/alteration identifiers,
  mirroring GK's bundling (see [pattern markings](/domain/construction/pattern-markings.md)).
- Napped, directional-foil or one-way-printed fabrics forbid 180° rotation in nesting, which lowers
  marker efficiency and should feed the yield estimate.
- Colour-blocked designs raise piece count and lower yield; Jalie's contrast-yoke figures (an extra
  0.25–0.40 m) show how quickly secondary fabrics add consumption.
- Print-then-cut needs a nested print layout plus cut contours and registration marks for
  camera-guided cutters; see [sublimation production](/domain/construction/sublimation-production.md).

# Gaps

No source confirmed die cutting for leotards; no ply counts, lay heights, cutter models or
marker-efficiency figures were published; whether GK's laser cutting is single- or low-ply, and how
laser heat-sealing interacts with elastane edges, is undocumented.[^pc-notes]

[^nbc-2021]: NBC Sports, 24 Jul 2021.
[^nam-2024]: NAM, 30 Jul 2024.
[^gabe]: Gabe Clothing sublimation program.
[^zund]: Zünd fashion applications.
[^zund-reg]: Zünd registration methods.
[^wiki-lectra]: Wikipedia, Lectra.
[^porter-cut]: Spandex Simplified, How to Cut Spandex.
[^jalie-2792]: Jalie 2792 envelope back.
[^jalie-3901]: Jalie 3901 size/yardage sheet.
[^tukacad]: Tukatech TUKAcad.
[^pinecrest-k]: Pine Crest Fabrics, Kaleidoscope.
[^pinecrest-m]: Pine Crest Fabrics, Mesh 65.
[^pc-notes]: Research notes: patternmaking and construction (in-bundle mirror).
