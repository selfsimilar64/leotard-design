---
type: Domain Concept
title: Stretch properties ("four-way stretch" is not equal stretch)
description: "Leotard warp knits are sold as 'four-way stretch' but mill tests show most stretch far more along the length (135-230%) than across the width (85-140%); Carvico's data sheets are the only published measurements."
tags: [fabric, stretch, mechanics, carvico]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-fab
    resource: /references/research/fabrics-and-materials.md
    title: "Research notes: fabrics and materials, questions 1, 3, 6, 8 and 9"
    author: claude-code/claude-opus-5-5
  - id: report
    resource: /references/research/research-report.md
    title: "Research report, fabric section"
    author: claude-code/claude-opus-5-5
  - id: carvico-vita
    resource: https://cdn.adoratorio.app/carvico/390-Vita_0126.pdf
    title: Carvico 390 Vita data sheet
    author: org:carvico
  - id: carvico-malaga
    resource: https://cdn.adoratorio.app/carvico/110-Malaga-Rec_0126.pdf
    title: Carvico 110 Malaga Rec data sheet
    author: org:carvico
  - id: carvico-sumatra
    resource: https://cdn.adoratorio.app/carvico/114-Sumatra-Rec_030226.pdf
    title: Carvico 114 Sumatra Rec data sheet
    author: org:carvico
  - id: carvico-beverly
    resource: https://cdn.adoratorio.app/carvico/503-Beverly_0126.pdf
    title: Carvico 503 Beverly data sheet
    author: org:carvico
  - id: carvico-panama
    resource: https://cdn.adoratorio.app/carvico/361-Panama_0126.pdf
    title: Carvico 361 Panama data sheet
    author: org:carvico
  - id: carvico-alicante
    resource: https://cdn.adoratorio.app/carvico/210-Alicante_0126.pdf
    title: Carvico 210 Alicante data sheet
    author: org:carvico
  - id: carvico-spider
    resource: https://cdn.adoratorio.app/carvico/700-Spider_0126.pdf
    title: Carvico 700 Spider data sheet
    author: org:carvico
  - id: carvico-siviglia
    resource: https://cdn.adoratorio.app/carvico/204-Siviglia_0126.pdf
    title: Carvico 204 Siviglia data sheet
    author: org:carvico
  - id: carvico-tobago
    resource: https://cdn.adoratorio.app/carvico/309-Tobago_0126.pdf
    title: Carvico 309 Tobago data sheet
    author: org:carvico
  - id: carvico-shiro
    resource: https://cdn.adoratorio.app/carvico/403-Revolutional-Shiro_0126.pdf
    title: Carvico 403 Revolutional Shiro data sheet
    author: org:carvico
  - id: jalie-3901
    resource: https://cdn.shopify.com/s/files/1/0267/4075/2568/files/product_sizes_3901.pdf?v=1605550698
    title: Jalie 3901 yardage PDF
    author: org:jalie
  - id: jalie-kate
    resource: https://jalie.com/products/kate-gymnastics-leotards-sewing-pattern
    title: Jalie KATE gymnastics leotard pattern
    author: org:jalie
  - id: snowflake-mystique
    resource: https://www.snowflakedesigns.com/fabric-swatches/mystique-fabric-swatches.html
    title: Snowflake Mystique swatches
    author: org:snowflake-designs
  - id: wiki-warp
    resource: https://en.wikipedia.org/wiki/Warp_knitting
    title: Wikipedia, Warp knitting
    author: org:wikipedia
---

# Takeaway

**"Four-way stretch" on a catalogue page does not mean equal stretch both ways.**[^report] Under the
same 3.6 kg load, Carvico's tricots stretch 135-230% along the length but only 85-140% across the
width; the Shiro print base and the Siviglia lining are the exceptions, stretching more across the
width.[^notes-fab] **[INFERRED]** A cloth simulation or fit model should treat stretch as anisotropic
per article, and the grain direction of each panel matters.[^notes-fab] See
[/engineering/geometry/](/engineering/geometry/about.md).

# Carvico technical data (all sheets dated January 2026; plain-dyed values)

Test method: Instron 3343, 3.6 kg load on a 100 x 50 mm strip; pilling Martindale ISO 12945-2 at 7000
rotations (fabric / wool, 5 best). All 70 m pieces; dimensional change max -3% to -5% at a 40 C wash
(Siviglia -8% in length). Each sheet warns "We recommend testing each dyebath before any treatment or
application other than cutting and sewing."[^carvico-vita][^carvico-siviglia]

| Article | Composition | g/m² | Width cm | Courses x wales /cm | Elongation W / L | Modulus at 40% W / L (g) | Hand elongation W / L | Pilling |
|---|---|---|---|---|---|---|---|---|
| 390 Vita (matte) | 78 PA / 22 EA | 190 | 150 | 44 x 26 | 85% / 145% | 150-290 / 130-230 | 90% / 150% | 5, 4/5[^carvico-vita] |
| 110 Malaga Rec (matte, provisional) | 80 PA / 20 EA | 190 | 150 | 46 x 26 | 110% / 195% | 105-195 / 75-145 | 115% / 200% | 5, 5[^carvico-malaga] |
| 114 Sumatra Rec (shiny, provisional) | 80 PA / 20 EA | 190 | 150 | 45 x 26 | 120% / 200% | 95-180 / 75-145 | 125% / 205% | 5, 5[^carvico-sumatra] |
| 503 Beverly (satin effect) | 79 PA / 21 EA | 180 | 150 | 42 x 26 | 90% / 135% | 145-270 / 140-260 | 95% / 140% | 4/5, 4[^carvico-beverly] |
| 361 Panama (velvet) | 85 PA / 15 EA | 220 | 140 | 44 x 25 | 140% / 230% | 80-150 / 80-180 | 150% / 240% | 4/5, 3/4[^carvico-panama] |
| 210 Alicante (mesh) | 80 PA / 20 EA | 65 | 152 | not given | 115% / 195% | 95-175 / 65-125 | 120% / 200% | 4/5, 4/5[^carvico-alicante] |
| 700 Spider (micro-mesh) | 80 PA / 20 EA | 150 | 150 | 44 x 23 | 115% / 185% | 120-220 / 50-100 | 120% / 190% | 5, 4/5[^carvico-spider] |
| 204 Siviglia (lining) | 90 PA / 10 EA | 85 | 165 | 37 x 20 | **215% / 120%** | 20-40 / 40-80 | 220% / 125% | 4, 3/4[^carvico-siviglia] |
| 309 Tobago (shiny PES print base) | 80 PES / 20 EA | 200 | 150 | 42 x 26 | 110% / 160% | 140-240 / 100-190 | 115% / 165% | 5, 4/5[^carvico-tobago] |
| 403 Revolutional Shiro (matte PES print base) | 80 PES / 20 EA | 190 | 152 | 55 x 31 | **145% / 95%** | 115-215 / 336-625 | 150% / 100% | 5, 4/5[^carvico-shiro] |

Vita "White for printing" stretches slightly less than dyed (80% / 140% against 85% / 145%).[^carvico-vita]
All values also in the notes.[^notes-fab]

# Other stretch facts

- Required minimum for leotard patterns: "50% MINIMUM STRETCH REQUIRED (WIDTH AND LENGTH)"; fabric
  "Knit with spandex with stretch across the width AND in the length (nylon+spandex,
  polyester+spandex, mystique)".[^jalie-3901][^jalie-kate]
- Foil adhesive tightens the cloth slightly: mystique "might feel slightly tighter until it is worn a
  few times".[^snowflake-mystique] No stretch percentages exist for foil fabrics.[^notes-fab]
- Velvet and lace are often 2-way; some "4-way" velvet notes "Widthwise stretch is more than
  lengthwise" (the opposite of Carvico's tricots).[^notes-fab]
- Heavy embellishment and appliqué reduce stretch (see [stretch matching](/domain/fabrics/rule-stretch-matching.md)).
- **[INFERRED]** Modulus at 40% is the best available proxy for compression and recovery force.[^notes-fab]

# Stitch density as texture scale

**[INFERRED]** Vita at 44 courses x 26 wales per cm means a wale pitch of about 0.38 mm and a course
pitch of about 0.23 mm; Shiro (55 x 31) is visibly finer; Siviglia (37 x 20) coarser.[^notes-fab] Tricot
face and back differ: "The right side of the fabric has fine lengthwise ribs while the reverse has
crosswise ribs."[^wiki-warp]

**Gaps:** no thickness (mm) is published by any maker, mill or wholesaler; no elongation figures exist
for foil, hologram, velvet (except Panama) or mesh (except Alicante and Spider).[^notes-fab]

[^notes-fab]: Research notes: fabrics and materials (Q1 inferences and gaps, Q3 table and inferences, Q9)
[^report]: Research report, fabric section
[^carvico-vita]: Carvico Vita data sheet PDF
[^carvico-malaga]: Carvico Malaga Rec data sheet PDF
[^carvico-sumatra]: Carvico Sumatra Rec data sheet PDF
[^carvico-beverly]: Carvico Beverly data sheet PDF
[^carvico-panama]: Carvico Panama data sheet PDF
[^carvico-alicante]: Carvico Alicante data sheet PDF
[^carvico-spider]: Carvico Spider data sheet PDF
[^carvico-siviglia]: Carvico Siviglia data sheet PDF
[^carvico-tobago]: Carvico Tobago data sheet PDF
[^carvico-shiro]: Carvico Revolutional Shiro data sheet PDF
[^jalie-3901]: Jalie 3901 yardage PDF
[^jalie-kate]: Jalie KATE pattern page
[^snowflake-mystique]: Snowflake Mystique swatches
[^wiki-warp]: Wikipedia, Warp knitting
