---
type: Design Rule
title: "Rule: mesh use"
description: "Mesh panels need a lining or self-backing decision, colour-matched elastic and thread, a 1 in overlap where they back a cut-out, and warnings in contact and abrasion zones; mesh carries no durability guarantee at GK."
tags: [construction, rule, mesh, fabric, manufacturability]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: gk-care
    resource: https://www.gkelite.com/pages/gk-gym-care-instructions
    title: GK Elite care instructions
    author: org:gk-elite
  - id: sp-fabrics
    resource: https://teamwear.sylviap.com.au/pages/fabric-options
    title: Sylvia P Teamwear fabric options
    author: org:sylvia-p
  - id: porter-neck
    resource: https://spandexsimplified.com/neck-back-style-variations/
    title: "Spandex Simplified, Neck & Back Style Variations, 5 Nov 2021"
    author: org:spandex-simplified
  - id: porter-elastic
    resource: https://spandexsimplified.com/how-to-apply-elastic/
    title: "Spandex Simplified, How to Apply Elastic, 15 Apr 2022"
    author: org:spandex-simplified
  - id: porter-sew
    resource: https://spandexsimplified.com/how-to-sew-spandex/
    title: "Spandex Simplified, How to Sew Spandex, 30 Dec 2020"
    author: org:spandex-simplified
  - id: gk-blog-fabrics
    resource: https://blog.gkelite.com/leotard-fabrics-embellishments/
    title: "GK Elite blog, Leotard Fabrics & Embellishments, 29 Jan 2026"
    author: org:gk-elite
  - id: quatro-fabrics
    resource: https://quatrogymnastics.com/pages/tw-fabrics
    title: Quatro fabrics
    author: org:quatro
  - id: pc-notes
    resource: /references/research/patternmaking-and-construction.md
    title: "Research notes: patternmaking and construction (in-bundle mirror), sections 1, 2, 5 and 10"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Mesh is the usual sleeve and illusion fabric but is fragile and see-through: it is sold under waiver
at GK, can pull or tear on rough surfaces, shows its elastic and thread, and needs a 1 in overlap where
it backs a cut-out.**[^gk-care][^sp-fabrics][^porter-neck][^pc-notes]

# Checks

| ID | Check | Default | Severity | Basis |
|---|---|---|---|---|
| ME-1 | Mesh backing a cut-out or illusion neckline overlaps the bodice edge by 1 in (25 mm) | 25 mm | error | sourced[^porter-neck] |
| ME-2 | Elastic and thread under or through mesh colour-matched to the mesh / skin tone | required | warning | sourced[^porter-elastic][^porter-sew] |
| ME-3 | Mesh over the torso has a lining or self-backing decision recorded | required | warning | **[INFERRED]** |
| ME-4 | Mesh in contact or abrasion zones (where the body meets apparatus) | warn; durability waiver | warning | sourced: mesh can be damaged by contact during routines, no lifespan guarantee, signed waiver at GK[^gk-care]; pulls or tears on rough surfaces[^sp-fabrics] |
| ME-5 | Crystals on unsupported single-layer mesh | forbid unless test flag | warning | **[INFERRED]** |
| ME-6 | Mesh edge finish | turned elastic, or clear elastic on unlined mesh necklines | info | sourced[^porter-elastic] |

All via the research note.[^pc-notes]

# Context

- Mesh is the usual fabric for competition-leotard sleeves at GK.[^gk-blog-fabrics][^pc-notes]
- Quatro stocks three nude tones for lining and mesh; Sylvia P offers Mesh, Fog Mesh (mesh with
  metallic foil), Diamond Mesh and Sublimated Mesh.[^quatro-fabrics][^sp-fabrics][^pc-notes]
- No numeric rule was found for drafting mesh sleeves differently from lycra sleeves, and no stretch
  percentage for stretch mesh.[^pc-notes]
- Fabric properties: [/domain/fabrics/](/domain/fabrics/about.md).

[^gk-care]: GK Elite care instructions.
[^sp-fabrics]: Sylvia P fabric options.
[^porter-neck]: Spandex Simplified, Neck & Back Style Variations.
[^porter-elastic]: Spandex Simplified, How to Apply Elastic.
[^porter-sew]: Spandex Simplified, How to Sew Spandex.
[^gk-blog-fabrics]: GK Elite blog, Leotard Fabrics & Embellishments.
[^quatro-fabrics]: Quatro fabrics.
[^pc-notes]: Research notes: patternmaking and construction (in-bundle mirror).
