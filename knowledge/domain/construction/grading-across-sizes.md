---
type: Domain Concept
title: Grading across sizes
description: "How leotard patterns change between sizes: torso (girth) grades about 3 in per child size and 0.5-3 in per adult size depending on brand, long/short torso is a one-size length grade, trims are graded too, and each manufacturer needs its own grade table."
tags: [construction, patternmaking, grading, sizing]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: gk-chart
    resource: https://gkelite.azureedge.net/images/static/sizecharts/size-charts-inches-womens-leos.pdf
    title: "GK size chart, inches, rev. March 2015"
    author: org:gk-elite
  - id: jalie-3901
    resource: https://cdn.shopify.com/s/files/1/0267/4075/2568/files/product_sizes_3901.pdf?v=1605550698
    title: Jalie 3901 size/yardage sheet
    author: org:jalie
  - id: jalie-2677
    resource: https://cdn.shopify.com/s/files/1/0267/4075/2568/files/2677NEW.pdf
    title: Jalie 2677 instructions
    author: org:jalie
  - id: porter-alter
    resource: https://spandexsimplified.com/basic-pattern-alterations/
    title: "Spandex Simplified, Basic Pattern Alterations, 16 Jan 2021"
    author: org:spandex-simplified
  - id: tukacad
    resource: https://tukatech.com/tukacad/
    title: Tukatech TUKAcad
    author: org:tukatech
  - id: chalkbucket
    resource: https://chalkbucket.com/threads/tips-for-making-a-leotard.44234/
    title: "ChalkBucket, Tips for making a leotard, Jan-Feb 2014"
    author: org:chalkbucket
  - id: vc-ultimate
    resource: https://ca.vcultimate.com/pages/sublimation
    title: VC Ultimate, Sublimation
    author: org:vc-ultimate
  - id: pc-notes
    resource: /references/research/patternmaking-and-construction.md
    title: "Research notes: patternmaking and construction (in-bundle mirror), sections 1 and 4"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Brands grade the torso (girth) about 3 in (7.5 cm) per size for girls; for women it varies from
about ½ in per size (Jalie) to 2–3 in (GK), so there is no single grade table and each manufacturer
must load its own.** Long and short torso are a one-size length grade without width change.[^pc-notes]
Size charts themselves are in [/domain/sizing/](/domain/sizing/about.md).

# Grading evidence

| Source | Grade increments |
|---|---|
| GK Elite chart[^gk-chart] | Torso 3 in per child size (CXS 40–42 → CL 49–51); 2–3 in per adult size. Each "long torso" equals the next size up's regular torso; each "short torso" the next size down's — a one-size length grade without width change (special order only). |
| Jalie 3901 (28 nested sizes F–GG)[^jalie-3901] | Girls' torso 5 cm per size (F–L), then about 4–5 cm; bust 1 in per size. Women's torso only about ½ in per size through S–Y and ½–1¼ in above, while bust and hip keep growing 1–1½ in. |
| Jalie 2677 trim[^jalie-2677] | Leg-elastic cut length 35.5 cm (size F) to 63.3 cm (size AA): 0.8 cm per size for small girls' sizes, about 1.5–1.6 cm per size above. |
| Commercial CAD[^tukacad] | TUKAcad advertises custom grade rules, automatic half-size grading and angle grading for lingerie and swim, plus made-to-measure alteration from imported customer measurements. |

All via the research note.[^pc-notes] Jalie nests 22–28 sizes in one pattern.[^jalie-3901]

# Atelier grading between sizes (Porter)

- Pick the largest size any measurement falls in, then blend freehand between size lines from chest
  to waist to hip.
- Change length by slash-and-spread (or fold) above the waist for upper-torso differences and below
  it for lower-torso differences; 1 in above the waist is a reasonable default.

Source: Porter, basic pattern alterations.[^porter-alter][^pc-notes]

# Brand-to-brand block differences

Home sewers report Jalie as slightly small to slightly large against its chart, Kwik Sew as running
large by one or more sizes, and several makers alter a master pattern (longer body, narrower width)
for competitive gymnasts.[^chalkbucket][^pc-notes]

# Grading decoration

All-over sublimation makers scale the design for each size.[^vc-ultimate][^pc-notes] How crystal
layouts are carried across sizes is unpublished; see
[stoning state and crystal grading](/domain/construction/open-question-stoning-state-and-crystal-grading.md)
and [size and pose transfer](/engineering/geometry/size-and-pose-transfer.md).

# Implications **[INFERRED]**

- Default grade rules can be derived from published charts, but the app must let each manufacturer
  load its own grade table rather than ship one.
- Long/short torso should be offered as a ±1-size length grade (about ±3 in / 7.5 cm of girth),
  matching GK's and k-Bee's charts.
- Trims (elastic, binding) must be graded with the pattern and exported per size in the bill of
  materials.
- Because grading changes piece shapes non-uniformly, each design element needs an explicit size
  behaviour: scales with the piece, keeps absolute size (logos, lettering), or is re-flowed.

[^gk-chart]: GK size chart, inches.
[^jalie-3901]: Jalie 3901 size/yardage sheet.
[^jalie-2677]: Jalie 2677 instructions.
[^porter-alter]: Spandex Simplified, Basic Pattern Alterations.
[^tukacad]: Tukatech TUKAcad.
[^chalkbucket]: ChalkBucket forum thread.
[^vc-ultimate]: VC Ultimate, Sublimation.
[^pc-notes]: Research notes: patternmaking and construction (in-bundle mirror).
