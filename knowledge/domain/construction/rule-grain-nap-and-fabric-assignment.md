---
type: Design Rule
title: "Rule: grain, nap and fabric assignment"
description: "Greatest stretch runs around the body on every structural piece (straps and long narrow appliqués excepted), napped and one-way fabrics are cut one way, and low-stretch fabrics are flagged on structural panels."
tags: [construction, rule, grain, stretch, nap, fabric]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: porter-cut
    resource: https://spandexsimplified.com/how-to-cut-spandex/
    title: "Spandex Simplified, How to Cut Spandex, 17 Jan 2021"
    author: org:spandex-simplified
  - id: watkins
    resource: http://nopr.niscpr.res.in/bitstream/123456789/13231/1/IJFTR%2036%284%29%20366-379.pdf
    title: "Watkins 2011, Indian J. Fibre & Textile Research 36:366-379"
  - id: porter-types
    resource: https://spandexsimplified.com/types-of-stretch-fabric/
    title: "Spandex Simplified, Types of Stretch Fabric, 17 May 2022"
    author: org:spandex-simplified
  - id: porter-straps
    resource: https://spandexsimplified.com/how-to-make-elastic-straps/
    title: "Spandex Simplified, How to Make Elastic Straps, 24 Mar 2022"
    author: org:spandex-simplified
  - id: porter-padded
    resource: https://spandexsimplified.com/padded-applique/
    title: "Spandex Simplified, Padded Applique, 27 Apr 2022"
    author: org:spandex-simplified
  - id: mueller
    resource: https://www.muellerundsohn.com/en/wp-json/wp/v2/posts/204
    title: "Müller & Sohn, Pattern Cutting for Body Fashion"
    author: org:mueller-und-sohn
  - id: chalkbucket
    resource: https://chalkbucket.com/threads/tips-for-making-a-leotard.44234/
    title: "ChalkBucket, Tips for making a leotard, Jan-Feb 2014"
    author: org:chalkbucket
  - id: gk-care
    resource: https://www.gkelite.com/pages/gk-gym-care-instructions
    title: GK Elite care instructions
    author: org:gk-elite
  - id: porter-applique
    resource: https://spandexsimplified.com/how-to-applique-spandex/
    title: "Spandex Simplified, How to Applique Spandex, 29 Dec 2020"
    author: org:spandex-simplified
  - id: pc-notes
    resource: /references/research/patternmaking-and-construction.md
    title: "Research notes: patternmaking and construction (in-bundle mirror), sections 2 and 10"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Lay every structural piece so the fabric's direction of greatest stretch runs around the body, never
swapping it to suit a print, or the garment will not fit.** Straps are the exception (stretch along
their length). Velvet and one-way prints are cut with all pieces facing one way. The direction of
greatest stretch is the knit's course direction: within the working range of wear it offers the least
resistance in every fabric tested.[^porter-cut][^watkins][^pc-notes]

# Checks

| ID | Check | Default | Severity | Basis |
|---|---|---|---|---|
| GN-1 | Every structural piece's grain line puts the fabric's greatest-stretch direction around the body | required | error | sourced[^porter-cut] |
| GN-2 | Strap pieces have greatest stretch along the strap length | required | error | sourced[^porter-straps] |
| GN-3 | Long narrow appliqués may run stretch lengthwise; appliqué and padding share the base's stretch direction | required for padding | warning | sourced[^porter-padded] |
| GN-4 | Napped (velvet, including straps) and one-way-printed fabrics: all pieces same direction; Porter lays velvet nap smoothing downward | required | error | sourced[^porter-cut] |
| GN-5 | Directional foil prints treated like one-way prints | configurable | warning | **[INFERRED]**; no source gives a foil nap rule |
| GN-6 | Low-stretch fabric (two-way foil print, illusion/glistenette, panne velvet) on a structural body panel | warn | warning | **[INFERRED]** from Porter's fabric notes and practitioner reports[^porter-types][^chalkbucket] |
| GN-7 | Fabric's stretch is known (tested) before a reduction factor is applied | required | warning | sourced: verify per material, some fabrics lose length when stretched in width[^mueller] |
| GN-8 | Colour-bleed adjacency: dark Mystique colours or red velvet next to light fabrics | warn | warning | sourced[^gk-care] |
| GN-9 | Off-grain cutting allowed for appliqué only; structural pieces off-grain twist | info | — | sourced[^porter-cut] |

All via the research note.[^pc-notes]

# Supporting facts

- "Four-way" fabrics stretch unequally: a good four-way spandex differed by about 1 in of extension on
  a roughly 5 in sample between its two directions; two-way means stretch in one direction only.[^porter-types][^pc-notes]
- Wale stretches more than course only at very high loads, outside wear.[^watkins][^pc-notes]
- Foil and PVC surfaces drag under the presser foot (Teflon foot fix) — a sewing-cost note for foil
  panels.[^porter-applique][^pc-notes]
- Fabric families and their stretch class are described in [/domain/fabrics/](/domain/fabrics/about.md).

# Software consequences **[INFERRED]**

- The exported grain line means "greatest stretch across"; pieces are locked against 180° rotation
  when the fabric is napped, one-way or directionally foiled, and this feeds the yield estimate.
- A fabric record needs: stretch % per direction, which direction is greatest, nap/one-way flag,
  printable-side flag, sublimation compatibility, fragility class.
- In the POC the per-vertex tangent already runs horizontally around the body as "the direction of
  greatest stretch" for shading (see [body and regions](/engineering/poc/body-and-regions.md)); a
  pattern tool needs the same field to orient grain lines on flattened pieces.

[^porter-cut]: Spandex Simplified, How to Cut Spandex.
[^watkins]: Watkins 2011.
[^porter-types]: Spandex Simplified, Types of Stretch Fabric.
[^porter-straps]: Spandex Simplified, How to Make Elastic Straps.
[^porter-padded]: Spandex Simplified, Padded Applique.
[^mueller]: Müller & Sohn.
[^chalkbucket]: ChalkBucket forum thread.
[^gk-care]: GK Elite care instructions.
[^porter-applique]: Spandex Simplified, How to Applique Spandex.
[^pc-notes]: Research notes: patternmaking and construction (in-bundle mirror).
