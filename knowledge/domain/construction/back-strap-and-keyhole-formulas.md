---
type: Domain Concept
title: Back, strap and keyhole formulas
description: "Encodable atelier formulas for strappy backs, keyholes, strap cut widths and banded collars, in inches with metric equivalents, plus the dress-code limits that constrain backs."
tags: [construction, patternmaking, backs, straps, keyhole, formulas]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: porter-neck
    resource: https://spandexsimplified.com/neck-back-style-variations/
    title: "Spandex Simplified, Neck & Back Style Variations, 5 Nov 2021"
    author: org:spandex-simplified
  - id: porter-straps
    resource: https://spandexsimplified.com/how-to-make-elastic-straps/
    title: "Spandex Simplified, How to Make Elastic Straps, 24 Mar 2022"
    author: org:spandex-simplified
  - id: jalie-2792
    resource: https://cdn.shopify.com/s/files/1/0267/4075/2568/files/product_sizes_2792.pdf
    title: Jalie 2792 envelope back
    author: org:jalie
  - id: gk-dress-code
    resource: https://blog.gkelite.com/gymnastics-dress-code-what-to-wear-to-gymnastics-competitions/
    title: "GK Elite blog, Gymnastics Dress Code, 5 Sep 2026"
    author: org:gk-elite
  - id: pc-notes
    resource: /references/research/patternmaking-and-construction.md
    title: "Research notes: patternmaking and construction (in-bundle mirror), sections 1, 5 and 10"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Strap and keyhole layouts follow simple published formulas based on elastic width, strap width and
fixed clearances (2 in from a side seam, 1.5 in from centre back, more than 1.5 in between neckline
and keyhole).** They come from one leotard-specialist author (Marie Porter, *Spandex Simplified*) and
are directly encodable as minimum-width and minimum-spacing checks; treat them as adjustable defaults,
not industry standards.[^porter-neck][^pc-notes] The checks themselves are in
[openings and straps](/domain/construction/rule-openings-and-straps.md).

# Formulas

| Quantity | Formula | Example |
|---|---|---|
| Shoulder width carrying straps | 2 × elastic width + (number of straps × strap width) | three ⅜ in straps, ⅜ in elastic → 1⅞ in (≈ 48 mm) |
| Single-strap shoulder | tapers to strap width + 2 × elastic width | ⅜ in strap, ⅜ in elastic → 1⅛ in (≈ 29 mm) **[INFERRED]** arithmetic |
| Side seam → nearest strap | ≥ 2 in (≈ 51 mm) | |
| Centre back → nearest strap | ≥ 1.5 in (≈ 38 mm) | |
| Neckline → top of keyhole | > 1.5 in (≈ 38 mm), room for two elastic finishes | |
| Keyhole size | neck + hole must be large enough to step into; extend ½–1 in (13–25 mm) for closure adjustment | |
| Turned strap, cut width | 2 × (elastic width + seam allowance) | ⅜ in elastic, ¼ in allowances → 1¼ in (≈ 32 mm) |
| Rolled strap, cut width | about 4 × elastic width | about 2 in quoted (≈ 51 mm) |
| Banded collar strip | width = 2 × (finished height + ¼ in); length = neckline − 1 to 2 in | |
| Choker collar | length = neck measurement + 2 in | |
| Elastic-finished scoop | allow about ¾ in (≈ 19 mm) of fabric lost to the finish | |

Sources: Porter on necks, backs and straps.[^porter-neck][^porter-straps][^pc-notes] Metric
conversions are ours (1 in = 25.4 mm).

# Construction facts behind the formulas

- Straps are fabric-covered elastic. Narrower elastic stretches out more; elastic sewn into the seam
  (turned strap) is the more stable construction.[^porter-straps][^pc-notes]
- Straps are cut with the greatest stretch **along** their length, an exception to the
  "stretch around the body" rule.[^porter-straps][^pc-notes]
- Crossover backs are described as unusual for competition suits.[^porter-neck][^pc-notes]
- Closures: back-neck clasp on keyhole and banded necklines (one clasp per garment in Jalie 2792);
  butterfly clasps on hole backs and halters; invisible zips and snaps on other bodysuits.[^jalie-2792][^porter-neck][^pc-notes]

# Dress-code limits on backs

GK's own blog summary of competition dress codes says leg openings may not be cut above the hip bone,
bare midriffs and "backless" openings are not allowed, and racerback and spaghetti-strap leotards are
prohibited; it does not attribute each rule to a governing body.[^gk-dress-code][^pc-notes]
**[UNVERIFIED]** against the FIG and USA Gymnastics rule texts, which were not retrieved; see
[/domain/rules/](/domain/rules/about.md).

# Implications **[INFERRED]**

- Strap width, strap count and elastic width are parameters of a back design; the minimum shoulder
  width and clearances follow automatically and can be checked live as the designer places straps.
- No strap-strength test data or standard was found, so a minimum strap width beyond the formula is a
  factory setting.[^pc-notes]

[^porter-neck]: Spandex Simplified, Neck & Back Style Variations.
[^porter-straps]: Spandex Simplified, How to Make Elastic Straps.
[^jalie-2792]: Jalie 2792 envelope back.
[^gk-dress-code]: GK Elite blog, Gymnastics Dress Code.
[^pc-notes]: Research notes: patternmaking and construction (in-bundle mirror).
