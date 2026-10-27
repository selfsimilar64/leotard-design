---
type: Domain Concept
title: "Lycra, spandex, tricot, shiny tricot: what the names mean"
description: "Lycra/spandex/elastane is the stretch fibre and tricot is the warp-knit construction; the many plain 'leotard fabrics' differ by yarn lustre (bright vs dull), knit face (plain, satin-look, rib, embossed, brushed), finish (cire, coating) and nylon vs polyester; a five-rung gloss ladder covers the family for rendering."
tags: [fabric, tricot, shiny, matte, naming, rendering]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-27T20:00:00Z }
stale_after: 2027-10-27T00:00:00Z
sources:
  - id: ebi-leotard
    resource: https://ebifabrics.com/collections/leotard/products.json?limit=250
    title: EBI Fabrics "Leotard" collection (17 products, read 2026-10-27)
    author: org:ebi-fabrics
  - id: ebi-photos
    resource: https://cdn.shopify.com/s/files/1/0696/9212/9395/files/
    title: "EBI product photos: NTL1 Steel Blue, NTL2 Aubergine, HK490R Champagne, HK450 Neon Lime (viewed 2026-10-27)"
    author: org:ebi-fabrics
  - id: wiki-delustrant
    resource: https://en.wikipedia.org/wiki/Delustrant
    title: "Wikipedia: Delustrant"
    author: org:wikipedia
  - id: wiki-luster
    resource: https://en.wikipedia.org/wiki/Luster_(textiles)
    title: "Wikipedia: Luster (textiles)"
    author: org:wikipedia
  - id: wiki-spandex
    resource: https://en.wikipedia.org/wiki/Spandex
    title: "Wikipedia: Spandex"
    author: org:wikipedia
  - id: owner
    resource: conversation with the product owner, 2026-10-27 (Claude Code session)
    title: Owner asks which fabrics are representative before tuning shiny tricot
    author: human:mattj
---

# Takeaway

**The plain-colour "leotard fabric" world is one cloth with a few switches, not dozens of
materials.** Lycra, spandex and elastane are names for the same stretch fibre (Lycra is a
trademark; "spandex" is the North American generic, "elastane" the European).[^wiki-spandex]
Tricot is the knit: a warp knit, the construction of nearly every leotard body fabric. A "nylon
spandex tricot" at 80/20, about 200 g/m², is the shared base; what a shop sells as Legacy,
Milliskin, Primatex, Chic, Venom or Stretch Satin differs in four ways that matter to the
eye:[^ebi-leotard]

1. **Yarn lustre.** Nylon comes out of the spinneret glossy and clear; titanium dioxide (up to
   about 2%) is added to dull it. Trade grades run bright, semi-dull, dull, full-dull.[^wiki-delustrant][^wiki-luster]
   **[INFERRED]** Matte tricot is dull yarn, shiny tricot is bright yarn: EBI's shiny NTL2 is the
   same content, weight and width as its matte NTL1 and credits the difference to "Shiny Nylon
   yarn".[^ebi-leotard]
2. **Knit face.** Plain tricot; satin-look (EBI HK490R, "satin-like appearance … without being a
   true satin"); rib (HK424, EL6000); embossed patterns (AT221E droplet, AT222E zigzag); brushed
   (AT128).[^ebi-leotard] **[INFERRED]** Satin-look tricot gets its directional sheen from
   longer yarn floats on the face.
3. **Finish.** Glazed (cire) or coated "liquid" surfaces sit on top of the shiny yarn; see
   [shiny tricot and wet look](/domain/fabrics/shiny-tricot-and-wet-look.md).
4. **Fibre.** Nylon for dyed solids; polyester when it will be sublimation-printed ("prepared for
   printing", AT246, AT228R, AT257) or for wicking activewear.[^ebi-leotard] See
   [polyester print base](/domain/fabrics/polyester-print-base.md).

Spandex share (15-28%) and weight (200-280 g/m²) also vary, but they change fit and compression,
not the look. **[INFERRED]**

# The EBI "Leotard" collection, sorted

EBI is a general spandex wholesaler (swim, active, dance); its "Leotard" collection is 17 fabrics,
most of which are activewear cloth rather than gymnastics competition fabric. Foils (mystique,
hologram), mesh and velvet are not in it.[^ebi-leotard]

| Group | EBI articles | Content | g/m² | Competition-leotard relevance |
|---|---|---|---|---|
| Matte nylon tricot | NTL1 Legacy (200 colours), NTL1R Eco Legacy, AT220R Eco Move | 72-82% nylon / 18-28% spandex | 200-230 | Core ([matte tricot](/domain/fabrics/matte-tricot.md)) |
| Shiny nylon tricot | NTL2 Chic (72 colours) | 82/18 | 200 | Core |
| Satin-look tricot | HK490R Stretch Satin | 73/27 | 200 | Accent; GK's Stretch Satin is new for 2026-27 |
| Liquid / high-gloss tricot | HK450 Venom | 82/18 | 225 | Accent, wet-look rung |
| Polyester tricot (print base, solids) | AT246 Takeoff, AT228R Next Gen, HK460R Flexfit, AT257 Base | 74-82% PES / 18-26% EA | 200-250 | Core for sublimation |
| Textured knits | HK424 Rib, EL6000 Wide Rib, AT221E/AT222E embossed, HK420W terry-look, AT128 brushed, HK426W double knit | various | 210-280 | Minor; GK sells a Novelty Rib |

Retail is $13.50-20.00 per yard; EBI sells swatch cards.[^ebi-leotard]

# What the photos show (same shop, same photo style)

Observed in EBI's swirl photos of four rungs of the gloss ladder.[^ebi-photos] **[INFERRED]**
readings of product photos, not measurements:

| Fabric | What the light does |
|---|---|
| NTL1 matte (steel blue) | No visible highlight anywhere; form comes only from soft shading. Colour stays the same hue into the shadows. |
| NTL2 shiny (aubergine) | Soft, low-contrast sheen on fold crests, with a fine **granular glimmer**: tiny scattered sparkles across lit areas (EBI: "subtle sparkle that beautifully glimmers"). |
| HK490R stretch satin (champagne) | Broad bright sheen bands running along the folds; fine diagonal knit lines visible; lit and unlit sides of a fold differ strongly. Clearly directional. |
| HK450 Venom liquid look (neon lime) | Bright, high-contrast highlights with the same glimmer grain inside them; highlights are still soft-edged, not a mirror reflection of the room. |

Two consequences for rendering: the shiny rungs share a **glint grain** that the matte rung lacks,
and even the glossiest plain tricot does not mirror the room (only the coated "Liquid" and foils do).

# Proposed representative set (for the owner to confirm)

**[INFERRED]** Proposal, not an owner decision. The owner asked for a selection that represents
gymnastics leotards rather than every variant.[^owner] Treat matte, shiny, satin and wet look as
**points on one gloss ladder of the same cloth**, tuned together, rather than unrelated
materials:

| Rung | App fabric today | Look to hit |
|---|---|---|
| Matte | `matte` | Broad diffuse, faint grazing sheen, no glints |
| Shiny | `shiny` | Soft sheen stretched across the knit direction plus sparse fine glints |
| Satin-look | none | Stronger, broader directional sheen; dark-to-bright flip as the surface turns |
| Wet look (cire) | `wet` | Bright soft highlights with glints, high lit/unlit contrast, no room reflection |
| Liquid (coated) | none; `foil`/`chrome` are metals | Latex-like glossy coat; optional, rare in gymnastics |

Beyond the ladder, the families that represent competition leotards are mystique, hologram foil,
sublimated print, stretch mesh / illusion and stretch velvet, already in the app; textured knits
(rib, embossed) are low priority.

Reference swatches: one swatch card each of EBI NTL1, NTL2, HK490R and HK450 would give the four
rungs from one mill, same base and photographed the same way, which is the controlled comparison
[calibration against swatches](/engineering/rendering/fabric-shading/calibration-against-swatches.md)
asks for.

[^ebi-leotard]: EBI Fabrics "Leotard" collection product data, 2026-10-27
[^ebi-photos]: EBI product photos of NTL1, NTL2, HK490R and HK450
[^wiki-delustrant]: Wikipedia, "Delustrant": nylon is glossy as extruded; TiO2 up to about 2%
[^wiki-luster]: Wikipedia, "Luster (textiles)": lustre grade terms
[^wiki-spandex]: Wikipedia, "Spandex": Lycra trademark, spandex and elastane as one fibre
[^owner]: Owner's request, 2026-10-27
