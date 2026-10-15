---
type: Domain Concept
title: Base cloth plus surface finish
description: "Every catalogued leotard fabric is one of about eight base constructions carrying one of about seven surface finishes, with base colour and finish colour as independent settings; this is the shape of the fabric library."
tags: [fabric, material-library, data-model]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-fab
    resource: /references/research/fabrics-and-materials.md
    title: "Research notes: fabrics and materials, questions 1, 2 and 4"
    author: claude-code/claude-opus-5-5
  - id: report
    resource: /references/research/research-report.md
    title: "Research report, section: Eight base cloths and seven surface finishes"
    author: claude-code/claude-opus-5-5
  - id: lineup-novelty
    resource: https://thelineup.com/pages/fabrics/novelty
    title: The Lineup novelty fabrics
    author: org:the-lineup
  - id: funki-foilme
    resource: https://www.funkifabrics.com/page/foilme-guide
    title: Funki Fabrics FoilMe guide
    author: org:funki-fabrics
  - id: sw-mystique
    resource: https://www.spandexworld.com/c3/catalog/browse/180
    title: Spandex World Mystique category
    author: org:spandex-world
  - id: sw-5910
    resource: https://www.spandexworld.com/c3/catalog/product/5910
    title: Spandex World Shattered Glass (White/Silver), product 5910
    author: org:spandex-world
  - id: sw-11233
    resource: https://www.spandexworld.com/c3/catalog/product/11233
    title: Spandex World Cracked Ice Fabric, product 11233
    author: org:spandex-world
  - id: snowflake-cracked
    resource: https://www.snowflakedesigns.com/fabric-swatches/cracked-ice-hologram-fabric-swatch.html
    title: Snowflake Cracked Ice Hologram swatches
    author: org:snowflake-designs
  - id: gk-swatch
    resource: https://www.gkelite.com/collections/gk-swatches/products.json?limit=250
    title: GK Elite swatch store data (2026 listings)
    author: org:gk-elite
  - id: sw-21593
    resource: https://www.spandexworld.com/c3/catalog/product/21593
    title: Spandex World Stretch Lace, product 21593
    author: org:spandex-world
  - id: sw-21650
    resource: https://www.spandexworld.com/c3/catalog/product/21650
    title: Spandex World Stretch Sequins Velvet, product 21650
    author: org:spandex-world
  - id: gk-p128
    resource: https://secure.viewer.zmags.com/services/resource/pub/167be069/pg2358x2896/3/128?viewerID=448752a2
    title: GK Elite 2026-27 catalogue p.128 (page image)
    author: org:gk-elite
---

# Takeaway

**Model the fabric library as "choose the cloth, then choose the finish".** Fifteen-plus fabric
families appear in live 2026 catalogues, but almost all are a warp-knit tricot of roughly 78-87%
nylon or polyester with 13-25% elastane at 180-250 g/m², differentiated only by surface treatment;
light meshes (65-115 g/m²) and linings (85-95 g/m²) form a second group.[^notes-fab][^report]
Every catalogued fabric fits one of about eight bases plus one of about seven finishes, with base
colour and finish (foil) colour stored separately.[^notes-fab] **[INFERRED]** (the researchers'
synthesis, consistent with every fabric found, not a published taxonomy).

# The two axes

| Base construction | Finishes seen on it |
|---|---|
| Nylon-elastane tricot ([matte](/domain/fabrics/matte-tricot.md), [shiny](/domain/fabrics/shiny-tricot-and-wet-look.md)) | dyed matte, dyed shiny, coating (cire, "liquid"), [foil-dot](/domain/fabrics/mystique-foil-dot.md), [hologram foil](/domain/fabrics/hologram-foils.md), [continuous foil](/domain/fabrics/solid-metallic-foil.md), [glitter](/domain/fabrics/glitter-coated-tricot.md) |
| Polyester-elastane tricot ([print base](/domain/fabrics/polyester-print-base.md)) | [sublimation print](/domain/fabrics/sublimation-printing.md), printable foil-dot and hologram, matte foil |
| [Stretch velvet](/domain/fabrics/stretch-velvet.md) | plain pile, crushed, burnout, foil on pile, sequins, sublimation (white crushed) |
| Fine [stretch mesh](/domain/fabrics/stretch-mesh-and-illusion.md) | dyed, nude, sublimated, [foil or glitter](/domain/fabrics/foil-and-glitter-mesh.md) |
| Structured / power mesh | dyed |
| Stretch lace | dyed |
| Rib / textured knit | dyed, sublimation (white rib) |
| [Lining](/domain/fabrics/linings.md) | dyed nude, white, black, brown |

The seven finishes: dye (matte or shiny), adhesive-bonded foil dots, holographic foil, continuous
foil, glitter, coating, and sublimation print; pile and sewn sequins are construction-level
variants.[^notes-fab]

# Families outside the main concepts

These appear in catalogues but are minor for competition leotards:

| Family | Composition | Weight | Stretch | Use |
|---|---|---|---|---|
| Stretch lace | 92% PES / 8% EA | 118 g/m² | 2-way | Sleeves, yokes[^sw-21593][^notes-fab] |
| Sequin yardage (on spandex, mesh, velvet) | 80% PA / 20% EA or 95% PES / 5% EA base | 170-320 g/m² | 2- or 4-way | Accents; e.g. 6 mm sequins sewn on stretch velvet, 320 g/m²[^sw-21650][^notes-fab] |
| Rib / textured knit (GK Novelty Rib, new) | 72% PA / 28% EA; white rib 79% PES / 21% EA | not published | 4-way | Bodies, trims[^gk-p128][^notes-fab] |
| Structured / power mesh | 80-88% PA / 12-20% EA | 150-175 g/m² | 4-way, firmer | Support panels, built-in bra[^notes-fab] |

The Lineup says of its lace "Durable with a delicate look and full stretch" but advises
alternatives to mesh, lace and soft-shell materials for high-friction choreography.[^lineup-novelty][^notes-fab]

# Colour is two parameters

- Foil fabrics are sold as base/foil pairs ("Silver shattered glass hologram on white nylon
  spandex"; Mint/Silver, Hot Pink/Orange, White/Pearl, Black/Black).[^sw-5910][^sw-mystique][^notes-fab]
- At the converter the dot (glue) pattern and the foil are separate choices: Funki's custom
  foiling offers "37 GLUE PATTERNS / 5 HOLOGRAM & 11 METALLIC FOIL COLOURS".[^funki-foilme][^notes-fab]
- Colour names are maker-specific: the same two-tone foil is "Royal/Navy" at Sylvia P, "Navy Royal"
  at Quatro and "Navy/Royal" at Snowflake. **[INFERRED]** The app should store base colour and foil
  colour separately and map maker names onto them.[^notes-fab]

# Naming collisions

Trade names are not reliable identifiers. Spandex World's "Cracked Ice Fabric" is 100% polyester
interlock with PU and glitter, 286 g/m², "Mechanical Stretch" only, so not a leotard body fabric,
while Snowflake sells a "Cracked Ice Hologram" swatch family for competition leotards with no
composition stated.[^sw-11233][^snowflake-cracked][^notes-fab] Mystique is also sold as "Myst",
"Jewels", "Fog", "Mist" and "Dual Activator".[^notes-fab]

Related: [fabric stack](/domain/fabrics/fabric-stack.md),
[per-fabric shading recipe](/engineering/rendering/fabric-shading/per-fabric-shading-recipe.md).

[^notes-fab]: Research notes: fabrics and materials (Q1 summary table and inferences; Q2 inferences; Q4)
[^report]: Research report, "Eight base cloths and seven surface finishes cover every catalogued fabric"
[^lineup-novelty]: The Lineup novelty fabrics page
[^funki-foilme]: Funki Fabrics FoilMe custom foiling guide
[^sw-mystique]: Spandex World Mystique category
[^sw-5910]: Spandex World product 5910
[^sw-11233]: Spandex World product 11233 (Cracked Ice Fabric)
[^snowflake-cracked]: Snowflake Cracked Ice Hologram swatches
[^gk-swatch]: GK Elite swatch store data
[^sw-21593]: Spandex World product 21593 (stretch lace)
[^sw-21650]: Spandex World product 21650 (stretch sequins velvet)
[^gk-p128]: GK Elite 2026-27 catalogue p.128
