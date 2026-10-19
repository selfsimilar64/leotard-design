---
type: Design Rule
title: Stone placement rules
description: "Manufacturability checks for stones: keep off seams, elastic and layered areas; hand-set anything above about 5 mm; split layouts into machine-field tiles of up to 6 size/colour hoppers; minimum spacing; fabric restrictions (velvet, foil, mesh). Thresholds ship as adjustable defaults."
tags: [crystal, rule, manufacturability, placement]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: ecs
    resource: /references/research/embellishments-crystals-sequins.md
    title: "Research notes: embellishments, crystals and sequins"
    author: claude-code/claude-opus-5-5
  - id: report
    resource: /references/research/research-report.md
    title: "Research report: Borrow the engine, build the sparkle"
    author: claude-code/claude-opus-5-5
  - id: preciosa-manual
    resource: https://www.preciosa-eshop.com/user/related_files/preciosa-hotfix-application-manual-complete-en-2.pdf
    title: Preciosa Hotfix Application Manual (PDF, 2019)
    author: org:preciosa
  - id: coldesi-cams
    resource: https://shop.coldesi.com/products/cams-1v-6p-cams-1v-6p
    title: ColDesi CAMS 1V-6P
    author: org:coldesi
  - id: foley
    resource: https://foley.com/?p=108824
    title: Foley & Lardner, 14 Aug 2024
    author: org:foley-lardner
  - id: gk-resilient
    resource: https://www.gkelite.com/products/qxli
    title: "GK Resilient Competition Leotard #4947S"
    author: org:gk-elite
  - id: gk-care
    resource: https://www.gkelite.com/pages/gk-gym-care-instructions
    title: GK care instructions
    author: org:gk-elite
  - id: gk-illuminated
    resource: https://www.gkelite.com/products/real
    title: "GK Illuminated Competition Leotard #7659"
    author: org:gk-elite
  - id: gk-cat-117
    resource: https://secure.viewer.zmags.com/services/resource/pub/167be069/pg2358x2896/3/117?viewerID=448752a2
    title: GK Elite 2026-27 catalogue p.117
    author: org:gk-elite
  - id: edutech-stitchera
    resource: https://edutechwiki.unige.ch/en/Stitch_Era_-_creating_hot_fix_designs
    title: EduTech Wiki, Stitch Era hotfix designs
    author: org:edutech-wiki
  - id: edutech-inkstitch
    resource: https://edutechwiki.unige.ch/en/InkStitch_-_hotfix
    title: EduTech Wiki, Ink/Stitch hotfix
    author: org:edutech-wiki
  - id: cp-stretch
    resource: https://crystalparade.co.uk/blogs/news/how-to-embellish-stretch-fabric-with-rhinestones
    title: Crystal Parade, 19 Dec 2023
    author: org:crystal-parade
---

# Rule summary

The app checks these as the user places stones. **No manufacturer publishes the thresholds as hard
numbers, so every number below ships as an adjustable default that each factory tunes.**[^report]

| # | Rule | Default | Basis |
|---|---|---|---|
| R1 | Warn on stones that straddle a seam or sit on elastic casings, bindings or layered areas; support a keep-out offset from seams | keep-out offset: factory setting (no published value) | Preciosa lists stones not holding "on seams or layered materials" as a fault and asks for "special attention … near buttons, zippers, seams and other protrusions"[^preciosa-manual]; **[INFERRED]** keep-out and straddle check[^ecs] |
| R2 | Stones larger than ~5 mm (above ss20) are hand-set accents, not machine fill | 5 mm | Setting machine handles "2mm - 5mm" jewels[^coldesi-cams]; GK "applied larger crystals by hand using tweezers"[^foley]; report rule[^report] |
| R3 | Split machine-set layouts into tiles no larger than the machine field, each using ≤6 size/colour combinations | 400 × 400 mm; 6 hoppers | CAMS 1V-6P field and cup count[^coldesi-cams][^report] |
| R4 | Separate large/mixed-height stones from the machine-set field (or flag reverse-side press with compensation pad) | above ss16 | Preciosa: mixed sizes or stones >ss16 on reverse side with increased pressure; compensation pad for different heights[^preciosa-manual]; **[INFERRED]** reason production separates hand-set accents[^ecs] |
| R5 | Minimum centre-to-centre pitch | stone ø + 0.5–1.0 mm (ss16: 4.4–4.9 mm) | **[INFERRED]** from template hole margin ≈+0.3 mm radius and ≥1 mm web[^edutech-stitchera][^ecs]; contour rows ≥4.4 mm for 4 mm stones, 4.6–5 mm rows for ss16[^edutech-inkstitch]. Machine pick-and-place has no web constraint, but no source gives its minimum gap |
| R6 | Check spacing in the worn (stretched) state, not only relaxed | – | [Relaxed vs stretched spacing](/domain/embellishments/stretch-spacing-trap.md) |
| R7 | No heat-applied spangles/sequinz on velvet (GK also excludes mesh, mesh foil, novelty mesh, rib for spanglez) | – | "Sequinz cannot be applied to Velvet"[^gk-resilient]; catalogue p.117[^gk-cat-117][^report] |
| R8 | Warn that foil (Mystique) and hologram fabric dulls under pressed stones; DryTech may shrink with heat | – | GK product page[^gk-resilient] |
| R9 | Mesh under stones needs a lining (GK: nude shadow-proof lining under mesh bodices) and a release sheet during pressing; large stones on unlined mesh are a durability risk; mesh needs a signed waiver at GK | – | [^gk-illuminated][^gk-care]; **[INFERRED]** release sheet and risk[^ecs] |
| R10 | Stones crossing side/shoulder/crotch seams must be split between pieces or marked for hand finishing after sewing | – | Stones are pressed on flat panels before seaming[^report]; **[INFERRED]**[^ecs] |
| R11 | Big stones not on fabric that moves under pressure | – | "Materials that bend or move easily under application pressure are not suitable for applying big stones"[^preciosa-manual] |

Base fabric must tolerate ≥120 °C and accept glue (no silicone/Teflon/water-repellent finishes):
see [press parameters](/domain/embellishments/hotfix-press-parameters.md).[^preciosa-manual]

# Notes

- Stone loss on stretch garments is "not unusual",[^cp-stretch] which supports conservative defaults.
- Dense fills locally stiffen the garment. **[INFERRED]**[^ecs] GK warns heavy embellishment and
  appliqué reduce stretch so a sizing sample will not fit like the finished garment.[^report]
- Overlapping rule set written from the construction research (keep-out bands, underarm exclusion,
  straps, glue footprints, setter limits): [crystal keep-outs and machine limits](/domain/construction/rule-crystal-keep-outs.md).
  Keep the two consistent; this file is the embellishment-trade view.
- Seam geometry, elastic widths and construction live in [/domain/construction/](/domain/construction/about.md);
  surface placement algorithms in [/engineering/geometry/](/engineering/geometry/about.md).

[^ecs]: Research notes: embellishments, crystals and sequins, section 7 inferences (in-bundle mirror)
[^report]: Research report, crystals and construction sections (in-bundle mirror)
[^preciosa-manual]: Preciosa Hotfix Application Manual (manufacturer)
[^coldesi-cams]: ColDesi CAMS 1V-6P (retailer)
[^foley]: Foley & Lardner, 14 Aug 2024
[^gk-resilient]: GK Resilient #4947S
[^gk-care]: GK care instructions
[^gk-illuminated]: GK Illuminated #7659
[^gk-cat-117]: GK catalogue p.117 (cited in the report)
[^edutech-stitchera]: EduTech Wiki, Stitch Era hotfix (hobbyist)
[^edutech-inkstitch]: EduTech Wiki, Ink/Stitch hotfix (hobbyist)
[^cp-stretch]: Crystal Parade, 19 Dec 2023 (retailer)
