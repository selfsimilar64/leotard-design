---
type: Open Question
title: Fabric data nobody publishes
description: "No measured optical data (gloss, sparkle, foil-dot size, mesh openness, pile height), no thickness, no foil stretch figures and several maker contradictions; every fabric setting is a starting guess until physical swatches are measured."
tags: [fabric, gap, open-question]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-fab
    resource: /references/research/fabrics-and-materials.md
    title: "Research notes: fabrics and materials, gaps sections of questions 1-9"
    author: claude-code/claude-opus-5-5
  - id: notes-shade
    resource: /references/research/realtime-fabric-shading.md
    title: "Research notes: real-time fabric shading, gaps"
    author: claude-code/claude-opus-5-5
  - id: report
    resource: /references/research/research-report.md
    title: "Research report, What this research could not establish"
    author: claude-code/claude-opus-5-5
  - id: gk-swatch
    resource: https://www.gkelite.com/collections/gk-swatches/products.json?limit=250
    title: GK Elite swatch store data (free swatches)
    author: org:gk-elite
  - id: snowflake-swatches
    resource: https://www.snowflakedesigns.com/fabric-swatches.html
    title: Snowflake fabric swatches ($0.25 each)
    author: org:snowflake-designs
---

# Question

**What do leotard fabrics actually measure, optically and physically?** Nobody publishes thickness,
gloss, sparkle, foil-dot size or mesh openness for any of these fabrics, so realistic materials have to
be calibrated against physical swatches.[^report] The practical route is swatch cards: GK free up to 5
(20 for clubs), Snowflake $0.25 each, The Lineup free; none were obtained during research.[^gk-swatch][^snowflake-swatches][^notes-fab]
Method: [calibration against swatches](/engineering/rendering/fabric-shading/calibration-against-swatches.md).

# Missing data

| Gap | Affects |
|---|---|
| Fabric thickness (mm): published by no maker, mill or wholesaler | Garment offset, simulation |
| Stretch percentages for foil, hologram, most velvet and mesh fabrics | [Stretch matching](/domain/fabrics/rule-stretch-matching.md), simulation |
| Foil dot diameter, spacing or coverage %; hologram grating period | [Foil-dot](/engineering/rendering/fabric-shading/foil-dot-mixing.md) and [diffraction](/engineering/rendering/fabric-shading/holographic-diffraction.md) shading |
| Mesh open-area %, denier, hole pitch for fine nets | [Mesh-over-skin](/engineering/rendering/fabric-shading/mesh-over-skin-blend.md) |
| Velvet pile height | [Velvet pile](/engineering/rendering/fabric-shading/velvet-pile.md) |
| Gloss units, BRDF, sparkle density, colour-flop | All shading |
| Appearance change with stretch (lightening, show-through, "grin-through") | [Stretch-dependent appearance](/engineering/rendering/fabric-shading/stretch-dependent-appearance.md) |
| Sublimation gamut; whether white can be printed | [Sublimation rules](/domain/fabrics/rule-sublimation-ink-on-coloured-base.md) |
| Colourfastness grades; service life; foil abrasion on bars; chalk effects | [Durability](/domain/fabrics/durability-and-care.md) |
| Foil factory process and foil composition | [Mystique](/domain/fabrics/mystique-foil-dot.md) |
| Weights for any GK, Sylvia P, Quatro or Snowflake fabric; SubFuse, Holotek, Rib composition | Library defaults |
| Which mill supplies GK, Sylvia P or Quatro | Sourcing |
| Which panels are lined on a given style; max fabrics per garment; per-fabric upcharges | [Fabric stack](/domain/fabrics/fabric-stack.md), pricing |
| Per-style fabric-zone restrictions in GK UDesign (WebGL picker not exercised) | Rules |
| Brand ranges for Alpha Factor, Dreamlight, K-Bee, Milano Pro Sport, Christian Moreau, Agiva, The Zone, Ozone (unreachable or password-protected) | Catalogues |

All from the notes' gap lists.[^notes-fab][^notes-shade] No peer-reviewed BRDF for nylon/spandex
warp-knit tricot, relaxed or stretched, was found either.[^notes-shade]

# Contradictions found in sources

- GK Shadowproof lining: print catalogue 94% PES / 6% spandex vs web store 81/19 nylon or 78/22 PES.[^notes-fab]
- GK jacquard mesh: 58% nylon / 42% spandex (catalogue) vs "54% nylon/42% spandex" (product label).[^notes-fab]
- Chrisanne Clover stretch net: 87/13 vs 94.5/5.5 (both via search summary).[^notes-fab]
- Plum minimum order: 12 (FAQ) vs 50 (older PDF).[^notes-fab]
- Spandex World ounce and gram weights that do not convert (e.g. 6.5 oz/yd² beside 184 g/m²).[^notes-fab]
- Care: hand vs machine wash, tumble dry vs never (see [durability and care](/domain/fabrics/durability-and-care.md)).

[^notes-fab]: Research notes: fabrics and materials, gaps and inferences of questions 1-9
[^notes-shade]: Research notes: real-time fabric shading, gaps of questions 2, 3, 15
[^report]: Research report, gaps table
[^gk-swatch]: GK Elite swatch store data
[^snowflake-swatches]: Snowflake fabric swatches
