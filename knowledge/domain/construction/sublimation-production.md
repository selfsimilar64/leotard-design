---
type: Process
title: Sublimation production
description: "Sublimated artwork is engineered per pattern piece and per size, printed mirrored on paper and transferred at about 190-230 C for 30-60 s, either onto cut pieces (GK) or onto the roll before laser cutting; what this means for per-piece print files."
tags: [construction, sublimation, print, process]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: nam-2024
    resource: https://nam.org/small-manufacturer-shines-at-olympics-31672
    title: "NAM summary of Washington Post reporting, 30 Jul 2024"
    author: org:nam
  - id: nbc-2021
    resource: https://www.nbcsportsphiladelphia.com/tokyo-olympics/inside-the-creation-of-simone-biles-goat-leotard/186340/
    title: "NBC Sports, 24 Jul 2021"
    author: org:nbc-sports
  - id: vc-ultimate
    resource: https://ca.vcultimate.com/pages/sublimation
    title: VC Ultimate, Sublimation
    author: org:vc-ultimate
  - id: lat
    resource: https://www.latapparel.com/img/pdfs/LAT-Apparel-SublimationPrintingTips-TMv2.pdf
    title: LAT Apparel sublimation tip sheet, 2026
    author: org:lat-apparel
  - id: coldesi-q
    resource: https://shop.coldesi.com/a/answers/4057706/What-is-the-time-and-temperature-to-press-a-polyester-shirt-using-sublimation
    title: ColDesi Q&A, sublimation time and temperature
    author: org:coldesi
  - id: wiki-sub
    resource: https://en.wikipedia.org/wiki/Dye-sublimation_printing
    title: "Wikipedia, Dye-sublimation printing"
    author: org:wikipedia
  - id: us10189245
    resource: https://patents.google.com/patent/US10189245
    title: SPGPrints patent US 10,189,245
  - id: us12179505
    resource: https://patents.google.com/patent/US12179505
    title: Avient patent US 12,179,505
  - id: klieverik-sp
    resource: https://www.klieverik.com/dye-sublimation-fixation-calender/singlepiecesublimation/
    title: Klieverik single-piece sublimation calenders
    author: org:klieverik
  - id: klieverik-r2r
    resource: https://www.klieverik.com/dye-sublimation-fixation-calender/sublimationroll2roll/
    title: Klieverik roll-to-roll calenders
    author: org:klieverik
  - id: exapro
    resource: https://www.exapro.com/transmatic-italiia-7360-sport-p260602209/
    title: Transmatic 7360 Sport calender listing, 2023
    author: org:exapro
  - id: printable-press
    resource: https://www.printablepress.com/how-to-heat-press-on-spandex/
    title: "Printable Press, How to Heat Press on Spandex, 27 Jul 2026"
    author: org:printable-press
  - id: us4226594
    resource: https://patents.google.com/patent/US4226594
    title: "US4226594, Renaut, 1980"
  - id: us7531481
    resource: https://patents.google.com/patent/US7531481
    title: US7531481, Kolbo
  - id: gabe
    resource: https://gabeclothing.ca/pages/sublimation-program
    title: Gabe Clothing sublimation program
    author: org:gabe-clothing
  - id: gk-sublimation
    resource: https://www.gkelite.com/pages/about-sublimation
    title: GK About Sublimation
    author: org:gk-elite
  - id: sp-fabrics
    resource: https://teamwear.sylviap.com.au/pages/fabric-options
    title: Sylvia P Teamwear fabric options
    author: org:sylvia-p
  - id: porter-types
    resource: https://spandexsimplified.com/types-of-stretch-fabric/
    title: "Spandex Simplified, Types of Stretch Fabric, 17 May 2022"
    author: org:spandex-simplified
  - id: pc-notes
    resource: /references/research/patternmaking-and-construction.md
    title: "Research notes: patternmaking and construction (in-bundle mirror), section 4"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Sublimation is done flat, before assembly, on white polyester-elastane: artwork is engineered per
pattern piece and per size, printed mirrored on transfer paper, and transferred at about 190–230 °C
for 30–60 s.** GK presses onto cut pieces; other makers print the roll and laser-cut afterwards. No
shrinkage figure for the fabric was found, and colour is controlled by press tests.[^pc-notes]

# Two production orders

| Order | Who | Needs from the designer **[INFERRED]** |
|---|---|---|
| Cut, then press | GK (cut fabric layers → print designs on paper → heat-transfer at 450 °F ≈ 232 °C → glue, sew, embroider → crystals → final seams)[^nam-2024][^nbc-2021]; "single-piece" calenders take blank cut parts laid on printed paper[^klieverik-sp] | One print image per piece per size, mirrored, with bleed beyond the cut line, in the cut piece's coordinates |
| Print, then cut | Cut-and-sew sublimated sportswear (print paper → transfer onto fabric rolls → laser-cut panels → sew aligning artwork)[^gabe]; roll-to-roll calenders with low-tension unwinding for stretch fabric[^klieverik-r2r] | Nested print layout plus matching cut contours and registration marks for camera-guided cutters |

A sportswear maker's step list for all-over sublimation: press test to match colours; set up artwork
for all panels so it covers every edge; scale the design for each size; add names/numbers; print
panels; press; sew.[^vc-ultimate][^pc-notes] Aligning artwork across seams is done by sewing operators
on cut-and-sew garments.[^gabe][^pc-notes]

# Published transfer settings

| Source (type) | Temperature | Time | Notes |
|---|---|---|---|
| GK via Washington Post/NAM, 2024 (factory)[^nam-2024] | 450 °F (≈232 °C) | not stated | Olympic leotards; single journalist-reported figure |
| LAT Apparel, 2026 (flat press)[^lat] | 390 °F (≈199 °C) | 35 s | medium pressure; pre-press; presses differ, so test |
| ColDesi (flat press)[^coldesi-q] | 380 °F (193 °C) | 60 s | polyester shirt |
| Wikipedia[^wiki-sub] | 380–420 °F (195–215 °C); dyes activate ≈350 °F (175 °C) | — | general |
| SPGPrints US 10,189,245 (calender)[^us10189245] | ≈170–230 °C; down to ≈170 °C for thin fabrics | 30–60 s | Klieverik GTC 111 / TC 141, 1.0–11.0 m/min |
| Avient US 12,179,505[^us12179505] | 180–230 °C | 30–60 s preferred | examples at 2 bar |
| Transmatic 7360 Sport (calender)[^exapro] | up to 220 °C | 40 s (0.53 m/min) | 20 cm oil-heated drum, 160 cm width, cut pieces or roll |
| Printable Press, 2026[^printable-press] | 380–400 °F | — | needs 65%+ polyester |

Conflict: the Printable Press article also warns that ≥320 °F permanently relaxes spandex and 20–30 s
holds degrade elasticity, yet manufacturers sublimate poly-elastane leotard fabric at the higher
temperatures above.[^printable-press][^pc-notes]

Calender capacities: single-piece 59–369 m²/h, roll-to-roll 69–1,075 m²/h at 30 s dwell, widths
1,650–3,200 mm, drums 195–1,070 mm.[^klieverik-sp][^klieverik-r2r][^pc-notes]

# Substrate, distortion and colour

- Dyes bond to polyester (polyamide partly; cotton and viscose weakly). GK's sublimation bases are
  white (SubFuse, Rib, Holotek, white Opalescence); Sylvia P sells Sublimated Mesh.[^us10189245][^gk-sublimation][^sp-fabrics][^pc-notes]
- Printed poly-spandex is coloured on the face only, so the white base shows when stretched hard.[^porter-types][^pc-notes]
- Dimensional change: only paper figures found — a 1.60 m web shrinks about 4 mm at 200 °C and narrows
  about 1.6 mm more under tension.[^us4226594][^pc-notes] Substrate movement during pressing distorts
  or doubles images on elastomeric sheet; one patent pre-heats ≥20 s at 360–410 °F before a 45–90 s
  transfer at 0.5–5 psi.[^us7531481][^pc-notes] An in-line print-and-calender design claims 0.1 mm
  registration.[^us10189245]
- Small colour discrepancies, dust spots and ghosting are inherent; plastic trims must stay out of the
  press and prints must stop short of them.[^vc-ultimate][^lat][^pc-notes]
- GK's 2026 programme tiers: Engineered (four silhouettes, 35 prints recoloured to team colours),
  SoftLux (10 prints on 15 base colours, training) and Custom (any print).[^gk-sublimation][^pc-notes]

# Implications for export **[INFERRED]**

- One print image per piece per size, mirrored, with bleed covering the seam allowance so white never
  shows at needle holes; seam matching guaranteed geometrically by sampling both sides of a seam from
  continuous artwork along the stitch line, not the cut line.
- A per-fabric, per-axis shrink compensation factor set by the manufacturer from its own press test
  (paper figures suggest about 0.25–0.35% in width; fabric relaxation may be larger).
- Cut contour and print must share one coordinate system in both production orders.
- Warn when dark artwork sits on high-strain zones (seat, underarm, across the back).
- Gaps: no factory dwell time or pressure, no fabric shrinkage figure, no colour-management practice
  (ICC/RIP), no required bleed width, file format or resolution was found.[^pc-notes]

[^nam-2024]: NAM, 30 Jul 2024.
[^nbc-2021]: NBC Sports, 24 Jul 2021.
[^vc-ultimate]: VC Ultimate, Sublimation.
[^lat]: LAT Apparel tip sheet.
[^coldesi-q]: ColDesi Q&A.
[^wiki-sub]: Wikipedia, Dye-sublimation printing.
[^us10189245]: US 10,189,245.
[^us12179505]: US 12,179,505.
[^klieverik-sp]: Klieverik single-piece calenders.
[^klieverik-r2r]: Klieverik roll-to-roll calenders.
[^exapro]: Exapro machine listing.
[^printable-press]: Printable Press, 2026.
[^us4226594]: US4226594.
[^us7531481]: US7531481.
[^gabe]: Gabe Clothing.
[^gk-sublimation]: GK About Sublimation.
[^sp-fabrics]: Sylvia P fabric options.
[^porter-types]: Spandex Simplified, Types of Stretch Fabric.
[^pc-notes]: Research notes: patternmaking and construction (in-bundle mirror).
