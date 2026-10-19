---
type: Domain Concept
title: Fabric stack (outer fabric plus lining per panel)
description: "A competition leotard combines two to four fabrics, and each panel is a stack of an outer fabric over an optional lining or second layer; opacity and look come from the stack, not from one material."
tags: [fabric, lining, layering, data-model]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-fab
    resource: /references/research/fabrics-and-materials.md
    title: "Research notes: fabrics and materials, question 6"
    author: claude-code/claude-opus-5-5
  - id: gk-7659
    resource: https://gkelite.com/products/7659
    title: GK Elite Illuminated Competition Leotard, product 7659
    author: org:gk-elite
  - id: gk-3885
    resource: https://www.gkelite.com/products/3885
    title: GK Elite training leotard, product 3885
    author: org:gk-elite
  - id: gk-swatch
    resource: https://www.gkelite.com/collections/gk-swatches/products.json?limit=250
    title: GK Elite swatch store data (2026 listings)
    author: org:gk-elite
  - id: sp-design
    resource: https://teamwear.sylviap.com.au/pages/design-with-sylvia-p-teamwear
    title: Sylvia P design options
    author: org:sylvia-p
  - id: sp-difference
    resource: https://teamwear.sylviap.com.au/pages/the-sylvia-p-teamwear-difference
    title: The Sylvia P Teamwear difference
    author: org:sylvia-p
  - id: plum-faq
    resource: https://plumpracticewear.com/pages/faqs-1
    title: Plum Practicewear FAQs
    author: org:plum-practicewear
  - id: quatro-fabrics
    resource: https://quatrogymnastics.com/pages/tw-fabrics
    title: Quatro fabrics page
    author: org:quatro-gymnastics
  - id: lineup-solid
    resource: https://thelineup.com/pages/fabrics/solid-colors
    title: The Lineup solid colours
    author: org:the-lineup
  - id: lineup-mesh
    resource: https://thelineup.com/pages/fabrics/mesh
    title: The Lineup mesh fabrics
    author: org:the-lineup
  - id: dsi-mesh
    resource: https://dsi-london.com/shop/fabrics/stretch-fabrics/mesh/66
    title: DSI London mesh
    author: org:dsi-london
  - id: jalie-3901
    resource: https://cdn.shopify.com/s/files/1/0267/4075/2568/files/product_sizes_3901.pdf?v=1605550698
    title: Jalie 3901 yardage PDF
    author: org:jalie
---

# Takeaway

**Every panel of a leotard is a layer stack, not a single material.** A competition leotard is
typically two to four fabrics: a foil or printed body, a contrast matte or hologram panel or
binding, and sheer mesh for sleeves and yokes, with a nude or self-coloured lining under any mesh on
the bodice and a front lining as standard.[^notes-fab] **[INFERRED]** The data model needs per-panel
stacks (outer fabric, optional underlay of lining or a second mesh layer) with opacity computed from
the stack; "illusion" areas are sheer mesh over skin or over nude lining.[^notes-fab]

# Evidence of how makers combine fabrics

- GK codes each special-order style as a fabric set. Illuminated Competition Leotard ($268): A01 Red
  Mystique with Hot Red mesh and a **required** nude Shadowproof mesh bodice lining; A02 Ocean Pearl
  Mystique, Royal Primatex and White Opal Meshfoil; A03 Black Matte, Fluorescent Lime and Smoke Pearl
  Mystique.[^gk-7659][^notes-fab]
- A GK training style combines a seaglass Primatex body, seaglass Opalescence hologram trim, white
  Sparkle hologram and a black jacquard mesh overlay, labelled "Mesh overlay: 54% nylon/42% spandex"
  (figures as printed; they do not sum to 100%).[^gk-3885][^notes-fab]
- Stretch mesh is often used as a double-layer leotard base or a single-layer sleeve (dance
  practice).[^dsi-mesh][^notes-fab]

# Lining practice by maker

| Maker | Lining practice |
|---|---|
| GK Elite | Shadowproof liner may be required when mesh is on the main bodice, optional under mesh sleeves; for white or light fabrics a separate seamless liner garment is recommended[^gk-swatch][^gk-7659] |
| Sylvia P | All competitive leotards lined at no extra cost ("full front-lining"); "SP-Hydro Protect" in long and three-quarter sleeve competition leotards[^sp-design][^sp-difference] |
| Plum | "Front lining" in base price; "Full lining in back" costs extra[^plum-faq] |
| Quatro | Three nude tones for lining and mesh[^quatro-fabrics] |
| The Lineup | Nude lining (Mocha, Sable, Toffee, Chestnut, Cocoa) typically under nude or coloured mesh[^lineup-solid][^lineup-mesh] |

All rows also in the research notes.[^notes-fab] Nude tones are a small discrete set per maker (three
to five), so **[INFERRED]** skin-tone matching should be a swatch choice, not a free colour.[^notes-fab]

A home-sewing gymnastics pattern calls for only 15 cm (6 in) of lining.[^jalie-3901]
**[INFERRED]** That is probably a crotch gusset only, so full front lining is maker practice rather
than a structural necessity.[^notes-fab]

# Open points

- No maker publishes which panels are lined on a given style beyond "front lining" and "under mesh
  bodice".[^notes-fab]
- What "SP-Hydro Protect" physically is (fabric, finish or panel) is unexplained, and Sylvia P's pages
  disagree on whether it is in all competitive leotards or only sleeved ones.[^notes-fab]
- No source states a maximum number of fabrics per garment or the price effect of each added
  fabric.[^notes-fab]

Rules derived from this: [mesh lining and accent use](/domain/fabrics/rule-mesh-lining-and-accent-use.md),
[colour bleed](/domain/fabrics/rule-colour-bleed.md),
[stretch matching](/domain/fabrics/rule-stretch-matching.md). Rendering of the stack:
[mesh-over-skin blend](/engineering/rendering/fabric-shading/mesh-over-skin-blend.md). Construction
of panels: [/domain/construction/](/domain/construction/about.md).

[^notes-fab]: Research notes: fabrics and materials, question 6 (findings, inferences, gaps)
[^gk-7659]: GK Elite product 7659
[^gk-3885]: GK Elite product 3885
[^gk-swatch]: GK Elite swatch store data
[^sp-design]: Sylvia P design options page
[^sp-difference]: Sylvia P "difference" page
[^plum-faq]: Plum Practicewear FAQs
[^quatro-fabrics]: Quatro fabrics page
[^lineup-solid]: The Lineup solid colours page
[^lineup-mesh]: The Lineup mesh page
[^dsi-mesh]: DSI London mesh page
[^jalie-3901]: Jalie 3901 yardage PDF
