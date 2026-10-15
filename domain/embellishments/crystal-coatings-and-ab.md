---
type: Domain Concept
title: Crystal colour layers, coatings and Aurora Borealis
description: "Stone colour is three independent layers: glass body colour, back treatment (foil or lacquer) and an optional crown coating such as AB (vapour-deposited thin film on about half the crown), AB 2X, Shimmer or metallic effects."
tags: [crystal, colour, coating, ab, iridescence]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: ecs
    resource: /references/research/embellishments-crystals-sequins.md
    title: "Research notes: embellishments, crystals and sequins"
    author: claude-code/claude-opus-5-5
  - id: wiki-rhinestone
    resource: https://en.wikipedia.org/wiki/Rhinestone
    title: Wikipedia, Rhinestone (edited 15 Sep 2026)
    author: org:wikipedia
  - id: wiki-swarovski
    resource: https://en.wikipedia.org/wiki/Swarovski
    title: Wikipedia, Swarovski (edited 26 Sep 2026)
    author: org:wikipedia
  - id: ods-ab
    resource: https://www.odsjewellers.com/pages/swarovski-aurora-borealis-coating-guide
    title: "OD's Jewellers, Swarovski Aurora Borealis coating guide"
    author: org:ods-jewellers
  - id: ru-ab16
    resource: https://rhinestonesu.com/swarovski-2088-flatback-rhinestones-crystal-ab-16ss/
    title: Rhinestones Unlimited, Swarovski 2088 Crystal AB 16ss
    author: org:rhinestones-unlimited
  - id: cp-gym
    resource: https://crystalparade.co.uk/blogs/news/how-to-use-hotfix-rhinestones-for-gymnastics-leotards
    title: Crystal Parade, 24 Jul 2025, hotfix rhinestones for gymnastics leotards
    author: org:crystal-parade
  - id: ru-colour
    resource: https://rhinestonesu.com/blog/preciosa-chaton-rose-maxima-color-shine-and-size-consistency/
    title: "Rhinestones Unlimited, Preciosa MAXIMA colour, shine and size consistency"
    author: org:rhinestones-unlimited
  - id: preciosa-manual
    resource: https://www.preciosa-eshop.com/user/related_files/preciosa-hotfix-application-manual-complete-en-2.pdf
    title: Preciosa Hotfix Application Manual (PDF, 2019)
    author: org:preciosa
  - id: swarovski-2018
    resource: https://cdn.shopify.com/s/files/1/0086/3023/9295/files/Swarovski_Non_Hotfix_Collection.pdf?2186
    title: "Swarovski Collection 2018, Flat Backs No Hotfix (PDF)"
    author: org:swarovski
---

# Takeaway

A renderer must model stone colour as **three independent layers**: (a) glass body colour (clear,
transparent tint, milky opal), (b) back treatment (mirror foil, or opaque lacquer instead of foil),
and (c) an optional thin-film or metallic coating on the crown.[^ecs] Body colour is "light passing
through colored glass and reflecting off the foiled back".[^ru-colour] Clear crystal gets its
sparkle from the mirror backing; AB is the most popular colour for dance, sports and theatre
costumes and is said to stand out under stage lights.[^cp-gym]

# Aurora Borealis (AB)

- Introduced by Swarovski in 1956; an iridescent coating applied by vacuum metal deposition.[^wiki-rhinestone]
  Developed by Manfred Swarovski with Dior.[^ods-ab]
- A "micro-thin layer of metal vapour" deposited in a "high-vacuum chamber" (PVD); colour from
  thin-film interference; the film is "transflective".[^ods-ab]
- **Coverage**: AB covers "~50% of crystal surface" and leaves base colour visible; **AB 2X** covers
  the "entire 360° surface" for an "intense rainbow effect". **Shimmer** is a "softer, more subtle
  version of the AB effect".[^ods-ab] Double-coated variants are labelled "AB 2X", "Dorado 2X".[^wiki-swarovski]
  (OD's is a secondary retail source.)
- Appearance: on light stones soft pinks and blues; on dark stones (Jet, Emerald) a brighter
  metallic hue.[^ods-ab] AB is "an iridescent coating added over the base color", not a separate
  stone; it "throws a rainbow shimmer".[^ru-ab16]
- Named Swarovski coatings: Aurora Borealis, Crystal Transmission, Volcano, Aurum, Shimmer, Dorado;
  coatings may cover only part of the stone.[^wiki-swarovski]

# Other effect families

From the 2018 Swarovski chart:[^swarovski-2018] Crystal Effects – Transparent (e.g. Crystal AB,
Golden Shadow, Silver Shade, Volcano), Crystal Effects – Metallic (Dorado, Light Chrome, Rose Gold,
Rainbow Dark…), LacquerPRO Shiny and DeLite (listed without the foil suffix, i.e. opaque), Colour
Effects (AB and Shimmer on colours), Jet Hematite. Full lists in
[colour libraries](/domain/embellishments/stone-colour-libraries.md).

Retail families for Preciosa: Clear Crystal (mirrored foil), AB Crystal, Special Effects/Coatings
(metallic, iridescent, two-tone), Neon (MAXIMA only), Standard Colour (no coating).[^ecs]

# Durability

"Stones with coatings – use only gentle wash cycle (30 °C)" (uncoated hotfixed textiles tolerate
60 °C).[^preciosa-manual]

# Renderer model per stone

**[INFERRED]**:[^ecs]

| Layer | Model |
|---|---|
| Glass body | Clear dielectric with absorption tint (plain colours) or volumetric scattering (opals read milky) |
| Base | Mirror (foil) or diffuse coloured lacquer; lacquer stones read as solid opaque colour with a glassy top and little sparkle |
| Crown coating | Angle-dependent thin-film reflectance on ≈half the crown facets (AB), all facets (AB 2X), weaker (Shimmer); metallic effects (Dorado, Light Chrome, Hematite, Rose Gold) as near-opaque coloured metal on the crown |

Implementation: [crystal optics look-alike](/engineering/rendering/sparkle/crystal-optics-look-alike.md).

# Gaps

No manufacturer description of how Shimmer, opal, neon, LacquerPRO or metallic effects are made
(the retail claim that neon "glows in the dark" is **[UNVERIFIED]**); no spectral or angle-resolved
data and no film thickness/IOR for commercial AB.[^ecs]

[^ecs]: Research notes: embellishments, crystals and sequins, sections 4 and 11 (in-bundle mirror)
[^wiki-rhinestone]: Wikipedia, Rhinestone
[^wiki-swarovski]: Wikipedia, Swarovski
[^ods-ab]: OD's Jewellers AB guide (retail, secondary)
[^ru-ab16]: Rhinestones Unlimited, 2088 Crystal AB 16ss (retailer)
[^cp-gym]: Crystal Parade, 24 Jul 2025 (retailer)
[^ru-colour]: Rhinestones Unlimited, MAXIMA colour consistency (retailer)
[^preciosa-manual]: Preciosa Hotfix Application Manual (manufacturer)
[^swarovski-2018]: Swarovski 2018 flat-back collection PDF (manufacturer)
