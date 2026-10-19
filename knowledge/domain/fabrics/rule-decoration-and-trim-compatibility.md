---
type: Design Rule
title: "Rule family: decoration and trim compatibility by fabric"
description: "Some fabrics cannot take heat-applied Spanglez or imprinting (velvet, mesh, mesh foil, novelty mesh, rib), only some can be binding or piping, and heat-set stones dull foil; per-fabric compatibility flags."
tags: [fabric, embellishment, binding, rule]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-fab
    resource: /references/research/fabrics-and-materials.md
    title: "Research notes: fabrics and materials, questions 2, 4 and 6"
    author: claude-code/claude-opus-5-5
  - id: report
    resource: /references/research/research-report.md
    title: "Research report, fabric section"
    author: claude-code/claude-opus-5-5
  - id: gk-p117
    resource: https://secure.viewer.zmags.com/services/resource/pub/167be069/pg2358x2896/3/117?viewerID=448752a2
    title: GK Elite 2026-27 catalogue p.117 (page image)
    author: org:gk-elite
  - id: gk-p126
    resource: https://secure.viewer.zmags.com/services/resource/pub/167be069/pg2358x2896/3/126?viewerID=448752a2
    title: GK Elite 2026-27 catalogue p.126 (page image)
    author: org:gk-elite
  - id: gk-p127
    resource: https://secure.viewer.zmags.com/services/resource/pub/167be069/pg2358x2896/3/127?viewerID=448752a2
    title: GK Elite 2026-27 catalogue p.127 (page image)
    author: org:gk-elite
  - id: gk-p128
    resource: https://secure.viewer.zmags.com/services/resource/pub/167be069/pg2358x2896/3/128?viewerID=448752a2
    title: GK Elite 2026-27 catalogue p.128 (page image)
    author: org:gk-elite
  - id: gk-p129
    resource: https://secure.viewer.zmags.com/services/resource/pub/167be069/pg2358x2896/3/129?viewerID=448752a2
    title: GK Elite 2026-27 catalogue p.129 (page image)
    author: org:gk-elite
  - id: gk-swatch
    resource: https://www.gkelite.com/collections/gk-swatches/products.json?limit=250
    title: GK Elite swatch store data (2026 listings)
    author: org:gk-elite
  - id: gk-qxli
    resource: https://www.gkelite.com/products/qxli
    title: GK Elite product qxli (via the research report)
    author: org:gk-elite
  - id: sp-fabric
    resource: https://teamwear.sylviap.com.au/pages/fabric-options
    title: Sylvia P fabric options
    author: org:sylvia-p
  - id: lineup-mesh
    resource: https://thelineup.com/pages/fabrics/mesh
    title: The Lineup mesh fabrics
    author: org:the-lineup
---

# Takeaway

**Each fabric needs compatibility flags for heat-applied decoration and for use as trim, because
makers refuse certain combinations outright.** The published restrictions are GK's; treat them as a
maker profile.[^notes-fab]

# Heat-applied decoration (Spanglez, imprinting)

"Spanglez cannot be applied to velvet, mesh, mesh foil, novelty mesh, or novelty rib."[^gk-p117]
Imprinting is also barred on velvet and novelty rib.[^gk-p129][^gk-p128]

| Fabric | Spanglez | Imprinting |
|---|---|---|
| Velvet | No | No |
| Mesh | No | not stated |
| Mesh foil | No | not stated |
| Novelty mesh (jacquard, smocked) | No | not stated |
| Novelty rib | No | No |
| Tricots, mystique, hologram | Yes | Yes |

Rule **D1**: placing a heat-applied decoration type on a fabric flagged "No" is an **error**.

# Heat-set stones on foil

GK says foil and hologram fabrics dull slightly wherever stones are heat-pressed onto them;[^gk-qxli][^report]
Sylvia P says crystal areas on Mystique may dull slightly from heat;[^sp-fabric] heat-pressing
rhinestones onto metallic mesh dulls its shine.[^lineup-mesh] Rule **D2**: stones on foil, hologram or
metallic mesh raise an **info** note (and, **[INFERRED]**, could drive a slight local dulling in the
render).

# Binding and piping availability (GK)

| Fabric | Binding | Piping |
|---|---|---|
| Cire, Mystique, Techmesh, Primatex, Hologram, Shadowproof | Yes | Yes |
| Stretch Satin, Velvet | Yes | No |
| Mesh, Jacquard Mesh, Mesh Foil | No | No |

Sources: GK catalogue pp.126-129 and swatch store.[^gk-p126][^gk-p127][^gk-p128][^gk-p129][^gk-swatch]
Rule **D3**: choosing a fabric for a binding or piping element it is not offered in is an **error**
for GK-style production, a **warning** otherwise.

Severities are our proposal **[INFERRED]**; the facts are GK's. All also in the notes.[^notes-fab]
Decoration types themselves: [/domain/embellishments/](/domain/embellishments/about.md).

[^notes-fab]: Research notes: fabrics and materials (Q2 GK restrictions, Q4 heat, Q6 binding and decoration)
[^report]: Research report, fabric section
[^gk-p117]: GK Elite catalogue p.117
[^gk-p126]: GK Elite catalogue p.126
[^gk-p127]: GK Elite catalogue p.127
[^gk-p128]: GK Elite catalogue p.128
[^gk-p129]: GK Elite catalogue p.129
[^gk-swatch]: GK Elite swatch store data
[^gk-qxli]: GK Elite product qxli
[^sp-fabric]: Sylvia P fabric options
[^lineup-mesh]: The Lineup mesh fabrics
