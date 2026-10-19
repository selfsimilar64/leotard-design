---
type: Design Rule
title: "Rule: lining"
description: "Competition leotards are front-lined or fully lined and always crotch-lined; lining is bonded to the shell and sewn as one layer, in nude tones, and is required under light, sublimated white-base and revealing fabrics."
tags: [construction, rule, lining, modesty]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: sp-difference
    resource: https://teamwear.sylviap.com.au/pages/the-sylvia-p-teamwear-difference
    title: "Sylvia P, The Teamwear Difference"
    author: org:sylvia-p
  - id: quatro-fabrics
    resource: https://quatrogymnastics.com/pages/tw-fabrics
    title: Quatro fabrics
    author: org:quatro
  - id: jalie-2792
    resource: https://cdn.shopify.com/s/files/1/0267/4075/2568/files/product_sizes_2792.pdf
    title: Jalie 2792 envelope back
    author: org:jalie
  - id: jalie-3901
    resource: https://cdn.shopify.com/s/files/1/0267/4075/2568/files/product_sizes_3901.pdf?v=1605550698
    title: Jalie 3901 size/yardage sheet
    author: org:jalie
  - id: porter-bodysuit
    resource: https://spandexsimplified.com/basic-bodysuit/
    title: "Spandex Simplified, Basic Bodysuit, 2 May 2024"
    author: org:spandex-simplified
  - id: porter-neck
    resource: https://spandexsimplified.com/neck-back-style-variations/
    title: "Spandex Simplified, Neck & Back Style Variations, 5 Nov 2021"
    author: org:spandex-simplified
  - id: babylock
    resource: https://babylock.com/gymnast-leotard
    title: "Baby Lock, Gymnast Leotard project"
    author: org:baby-lock
  - id: chalkbucket
    resource: https://chalkbucket.com/threads/tips-for-making-a-leotard.44234/
    title: "ChalkBucket, Tips for making a leotard, Jan-Feb 2014"
    author: org:chalkbucket
  - id: porter-types
    resource: https://spandexsimplified.com/types-of-stretch-fabric/
    title: "Spandex Simplified, Types of Stretch Fabric, 17 May 2022"
    author: org:spandex-simplified
  - id: pc-notes
    resource: /references/research/patternmaking-and-construction.md
    title: "Research notes: patternmaking and construction (in-bundle mirror), sections 5 and 10"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Default every competition style to a full front lining plus a crotch lining, and require lining under
light, sublimated white-base and revealing fabrics.** Sylvia P lines all competitive leotards at no
extra charge with full front lining as standard; pattern companies always include a crotch lining;
makers line revealing fabrics even when opaque.[^sp-difference][^jalie-2792][^chalkbucket][^pc-notes]

# Practice

- **Sylvia P:** all competitive leotards lined free; full front lining standard.[^sp-difference]
- **Quatro:** three nude tones for lining and mesh.[^quatro-fabrics]
- **Jalie:** gymnastics patterns include a crotch lining (15–20 cm of lining fabric).[^jalie-2792][^jalie-3901]
- **Atelier (Porter):** full lining made by bonding shell to lining with temporary spray adhesive and
  sewing as one layer; boat necklines get a shelf-bra lining, with 1 in elastic under the bust for
  fuller chests.[^porter-bodysuit][^porter-neck]
- **Home (Baby Lock):** lining cut from the unaltered pattern (before colour-block piecing), joined at
  centre back and shoulders, basted to the shell and sewn as one.[^babylock]

All via the research note.[^pc-notes]

# Checks

| ID | Check | Default | Severity | Basis |
|---|---|---|---|---|
| LI-1 | Competition style has full front lining | on | warning if off | sourced practice[^sp-difference] |
| LI-2 | Crotch lining present | always | error if off | sourced[^jalie-2792] |
| LI-3 | Lining under light fabrics and under sublimated white-base fabric (white shows when stretched) | required | warning | **[INFERRED]** from[^porter-types] |
| LI-4 | Boat neck has a shelf-bra lining | required | warning | sourced[^porter-neck] |
| LI-5 | Lining colour from a nude-tone set | default | info | sourced[^quatro-fabrics] |

# Pattern consequence **[INFERRED]**

A lining is a copy of the shell piece (or of the unaltered block when the shell is colour-blocked),
cut in lining fabric and treated as one layer with the shell; export it as its own piece with its own
fabric code in the BOM rather than drafting it independently.

[^sp-difference]: Sylvia P, The Teamwear Difference.
[^quatro-fabrics]: Quatro fabrics.
[^jalie-2792]: Jalie 2792 envelope back.
[^jalie-3901]: Jalie 3901 size/yardage sheet.
[^porter-bodysuit]: Spandex Simplified, Basic Bodysuit.
[^porter-neck]: Spandex Simplified, Neck & Back Style Variations.
[^babylock]: Baby Lock, Gymnast Leotard project.
[^chalkbucket]: ChalkBucket forum thread.
[^porter-types]: Spandex Simplified, Types of Stretch Fabric.
[^pc-notes]: Research notes: patternmaking and construction (in-bundle mirror).
