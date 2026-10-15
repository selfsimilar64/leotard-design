---
type: Domain Concept
title: Watkins stretch-reduction method
description: "The one published quantitative method for turning measured fabric stretch into separate width and length pattern scale factors, with its quad-load stretch test; the documented default for per-fabric negative ease."
tags: [construction, patternmaking, ease, stretch, algorithm]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: watkins
    resource: http://nopr.niscpr.res.in/bitstream/123456789/13231/1/IJFTR%2036%284%29%20366-379.pdf
    title: "Watkins 2011, Indian J. Fibre & Textile Research 36:366-379"
  - id: modapalavra
    resource: https://www.revistas.udesc.br/index.php/modapalavra/article/view/19654
    title: ModaPalavra study of Watkins' method
  - id: us4894919
    resource: https://patents.google.com/patent/US4894919
    title: US patent 4,894,919 (reductions from course- and wale-direction stretch)
  - id: pc-notes
    resource: /references/research/patternmaking-and-construction.md
    title: "Research notes: patternmaking and construction (in-bundle mirror), section 1"
    author: claude-code/claude-opus-5-5
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror), section 4"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Watkins (2011) gives a complete, encodable recipe: measure stretch in four directions under a
250 g load, split the usable stretch 60:40 between girth and length, damp it for small bodies, and
convert to scale factors SRF = 100 / (100 + SR).** It is the best candidate for the tool's default
per-fabric [negative ease](/domain/construction/negative-ease.md); manufacturers override it.[^watkins][^pc-notes]

# The quad-load stretch test

Designed for pattern reduction (the formal standards BS 4952:1992, BS EN 14704-1:2005 and
ASTM D 4964-96 are QA/QC tests Watkins judges unsuited to deriving pattern geometry):[^watkins][^pc-notes]

1. Cut 5 × 20 cm strips in course, wale, 45° bias and 135° bias.
2. Mark benchmarks 10 cm apart; fold 2.5 cm at each end for hanger bars.
3. Hang a 250 g weight; wait one minute.
4. Stretch % = extended benchmark length in mm − 100.

Other literature uses different specimens and loads (20 × 20 cm at 500 g, Ziegert & Keil; 7.5 × 25 cm
at about 1 kg/cm, Murden), so stretch figures are only comparable at a stated load.[^watkins][^pc-notes]
Some fabrics stretch differently on the two biases (e.g. 39% vs 35%), which produced visible
left/right fit differences in test garments.[^watkins] In wear, garments use only the lower part of
the stretch curve (roughly up to 30–40%).[^watkins][^pc-notes]

# The reduction algorithm

| Step | Operation |
|---|---|
| 1 | Measure stretch % in course *c*, wale *w* and bias *b* |
| 2 | Course-bias vector cb = (c + b) / 2; wale-bias vector wb = (w + b) / 2 |
| 3 | Allocate with an axis ratio: adults 60% to girth, 40% to length |
| 4 | Multiply by the tension release factor: 1.0 adult … 0.5 small child |
| 5 | Stretch reduction SR% = vector × axis ratio / 100 |
| 6 | Stretch reduction factor SRF = 100 / (100 + SR) |

Worked example: c = 56, w = 20, b = 40 → cb = 48, wb = 30 → SR = 28.8 (X) and 12.0 (Y) →
SRF = 0.78 (X, width) and 0.89 (Y, length).[^watkins][^pc-notes]

Fit classes by proximity: form fit (no pressure), cling fit, action fit (most stretch sportswear),
power fit (compressive). More of the available stretch is reserved (left unused by the reduction)
for length than for girth, because body length changes more in movement.[^watkins][^pc-notes]

Supporting evidence that reduction should follow measured per-direction stretch: a US patent applies
length and width reductions from course and wale stretch of the specific knit, and Watkins' method has
been analysed in later literature.[^us4894919][^modapalavra][^gg-notes]

# Encoding notes **[INFERRED]**

- Inputs per fabric: c, w, b45, b135 (%), load (g), specimen size; per garment: fit class, axis
  ratio, tension release factor (a function of size/age).
- Course direction = around the body (see [grain and nap rule](/domain/construction/rule-grain-nap-and-fabric-assignment.md)),
  so SRF_X applies across the body and SRF_Y along it.
- Treat the result as a default and store the manufacturer's override alongside it, with the source
  of each number.

[^watkins]: Watkins 2011.
[^modapalavra]: ModaPalavra analysis of Watkins' method.
[^us4894919]: US4894919.
[^pc-notes]: Research notes: patternmaking and construction (in-bundle mirror).
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
