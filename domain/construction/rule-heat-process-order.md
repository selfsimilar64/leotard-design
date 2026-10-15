---
type: Design Rule
title: "Rule: heat-process order"
description: "Recommended heat order is sublimation (about 190-230 C), then vinyl or foil transfers (about 130-160 C), then hotfix crystals (about 160-170 C); the bands overlap, so flag any process that would exceed the tolerance of a layer already applied."
tags: [construction, rule, heat, sublimation, hotfix, vinyl]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: nam-2024
    resource: https://nam.org/small-manufacturer-shines-at-olympics-31672
    title: "NAM, 30 Jul 2024"
    author: org:nam
  - id: preciosa
    resource: https://www.preciosa-eshop.com/user/related_files/preciosa-hotfix-application-manual-complete-en-2.pdf
    title: Preciosa Hotfix application manual (2019)
    author: org:preciosa
  - id: siser
    resource: https://www.siserna.com/easyweed-stretch/
    title: "Siser North America, EasyWeed Stretch"
    author: org:siser
  - id: printable-press
    resource: https://www.printablepress.com/how-to-heat-press-on-spandex/
    title: "Printable Press, How to Heat Press on Spandex, 27 Jul 2026"
    author: org:printable-press
  - id: lat
    resource: https://www.latapparel.com/img/pdfs/LAT-Apparel-SublimationPrintingTips-TMv2.pdf
    title: LAT Apparel sublimation tip sheet
    author: org:lat-apparel
  - id: sp-fabrics
    resource: https://teamwear.sylviap.com.au/pages/fabric-options
    title: Sylvia P Teamwear fabric options
    author: org:sylvia-p
  - id: pc-notes
    resource: /references/research/patternmaking-and-construction.md
    title: "Research notes: patternmaking and construction (in-bundle mirror), sections 4, 6, 7 and 10"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Sublimation always comes first; the research note then recommends stretch vinyl or foil transfers,
then hotfix crystals, and says to flag any design that would need a hotter process after a cooler,
heat-sensitive layer is in place.** The bands overlap: hotfix at 160–170 °C is hotter than a vinyl
applied at 130–150 °C, so crystals on or beside vinyl need a test. The temperature bands are sourced; the ordering rule is the research note's
inference from them and from GK's factory order (sublimate → appliqué → embroider → crystals).[^nam-2024][^pc-notes]

# Temperature bands

| Process | Typical setting | Source |
|---|---|---|
| Sublimation | about 190–230 °C, 30–60 s (GK reported 450 °F ≈ 232 °C) | see [sublimation production](/domain/construction/sublimation-production.md)[^nam-2024] |
| Stretch heat-transfer vinyl | 160 °C, 20 s, firm (Siser EasyWeed Stretch); 270–305 °F (≈130–150 °C), 10–15 s, cold peel (2026 guide) | [^siser][^printable-press] |
| Hotfix crystals on PES/lycra | glue range 120–200 °C; motifs 25 s at 160 °C or 18 s at 170 °C, medium pressure; re-press about 15 s | [^preciosa] |

All via the research note.[^pc-notes]

# Checks

| ID | Check | Severity | Basis |
|---|---|---|---|
| HP-1 | Sublimation precedes every other heat process on the piece | error | **[INFERRED]**[^pc-notes] |
| HP-1b | No later process exceeds the heat tolerance of a layer already applied (e.g. hotfix over or beside stretch vinyl) | warning, "test required" | **[INFERRED]**[^pc-notes] |
| HP-2 | Plastic trims kept out of the sublimation press; prints stop short of them | error | sourced[^lat] |
| HP-3 | Heat-applied decoration on foil fabric flagged (crystal areas on Mystique may dull) | warning | sourced[^sp-fabrics] |
| HP-4 | Note: ≥ 320 °F may permanently relax spandex (one blog); conflicting with industrial practice | info | sourced, conflicting[^printable-press] |

[^nam-2024]: NAM, 30 Jul 2024.
[^preciosa]: Preciosa Hotfix application manual.
[^siser]: Siser North America.
[^printable-press]: Printable Press, 2026.
[^lat]: LAT Apparel tip sheet.
[^sp-fabrics]: Sylvia P fabric options.
[^pc-notes]: Research notes: patternmaking and construction (in-bundle mirror).
