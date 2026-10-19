---
type: Design Rule
title: "Rule: openings and straps"
description: "Checks for necklines, keyholes, cut-outs and strap layouts: Porter's spacing and width formulas, step-in size and closure, elastic or binding on every opening, and dress-code limits."
tags: [construction, rule, openings, straps, keyhole, manufacturability]
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

**Every opening needs an edge finish, every keyhole needs room for two elastic finishes and a way in,
and strap layouts must satisfy minimum shoulder width and clearance formulas.** Values are from one
atelier author (Porter) and should ship as adjustable defaults; formulas are in
[back, strap and keyhole formulas](/domain/construction/back-strap-and-keyhole-formulas.md).[^porter-neck][^pc-notes]

# Checks

| ID | Check | Default (configurable) | Severity | Basis |
|---|---|---|---|---|
| OS-1 | Every unbound opening edge carries an elastic spec (width, ratio) | required | error | **[INFERRED]** from universal practice; see [edge finishing](/domain/construction/edge-finishing-elastic-and-binding.md) |
| OS-2 | Neckline to top of keyhole | > 1.5 in (38 mm) | error | sourced[^porter-neck] |
| OS-3 | Step-in check: neck opening + back opening large enough to step into, else a closure is required | require closure or pass a perimeter check | error | sourced rule[^porter-neck]; perimeter threshold **[INFERRED]** |
| OS-4 | Keyhole extended ½–1 in for closure adjustment; closure type set (back-neck clasp, butterfly clasp) | required when a clasp is used | warning | sourced[^porter-neck] |
| OS-5 | Shoulder width carrying straps ≥ 2 × elastic width + n × strap width | formula | error | sourced[^porter-neck] |
| OS-6 | Side seam to nearest strap | ≥ 2 in (51 mm) | error | sourced[^porter-neck] |
| OS-7 | Centre back to nearest strap | ≥ 1.5 in (38 mm) | error | sourced[^porter-neck] |
| OS-8 | Strap width vs elastic width; narrower elastic stretches out more | factory minimum | warning | sourced qualitatively[^porter-straps]; no strength data |
| OS-9 | Elastic-finished scoop: about ¾ in of fabric lost to the finish is accounted for | automatic | info | sourced[^porter-neck] |
| OS-10 | Boat neck has a shelf-bra lining | required | warning | sourced[^porter-neck] |
| OS-11 | Crossover back | flag as unusual for competition | info | sourced[^porter-neck] |
| OS-12 | Dress code: leg line not above hip bone, no bare midriff, no "backless" opening, no racerback or spaghetti straps | per competition rule set | warning | GK blog summary, unattributed **[UNVERIFIED]** vs rule texts[^gk-dress-code] |

All via the research note.[^pc-notes] Competition rule sets belong in [/domain/rules/](/domain/rules/about.md).

# Implementation notes **[INFERRED]**

- OS-5 to OS-7 are distances on the body surface between strap centrelines, side seam and centre back;
  measure them geodesically on the reference body and re-check per size, because clearances shrink on
  small sizes if straps keep their absolute width.
- A strap that spans a hollow leaves the skin (see [fabric bridging hollows](/engineering/geometry/fabric-bridging-hollows.md));
  its length for cutting is the chord, not the skin path.

[^porter-neck]: Spandex Simplified, Neck & Back Style Variations.
[^porter-straps]: Spandex Simplified, How to Make Elastic Straps.
[^gk-dress-code]: GK Elite blog, Gymnastics Dress Code.
[^pc-notes]: Research notes: patternmaking and construction (in-bundle mirror).
