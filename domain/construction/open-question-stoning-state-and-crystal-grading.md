---
type: Open Question
title: "Open question: stoning state and crystal grading across sizes"
description: "Are stones applied to relaxed flat pieces or to stretched fabric, and how do makers carry a crystal layout across sizes (keep count or keep spacing)? Both decide which spacing check binds and how layouts grade."
tags: [construction, open-question, crystals, grading, stretch]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: nam-2024
    resource: https://nam.org/small-manufacturer-shines-at-olympics-31672
    title: "NAM, 30 Jul 2024"
    author: org:nam
  - id: porter-crystal
    resource: https://spandexsimplified.com/crystalling-on-spandex/
    title: "Spandex Simplified, Crystalling on Spandex, 28 Mar 2021"
    author: org:spandex-simplified
  - id: preciosa
    resource: https://www.preciosa-eshop.com/user/related_files/preciosa-hotfix-application-manual-complete-en-2.pdf
    title: Preciosa Hotfix application manual (2019)
    author: org:preciosa
  - id: pc-notes
    resource: /references/research/patternmaking-and-construction.md
    title: "Research notes: patternmaking and construction (in-bundle mirror), section 7"
    author: claude-code/claude-opus-5-5
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror), sections 4 and 7"
    author: claude-code/claude-opus-5-5
---

# The questions

1. **In what state is the fabric when stones are applied?** Factory reporting says crystal motifs are
   heat-pressed onto the still-flat pieces before the final seams;[^nam-2024][^pc-notes] the hotfix
   manual says stretch fabric should be secured *slightly stretched* on a pad;[^preciosa][^pc-notes]
   ateliers glue stones on the finished garment stretched to within an inch or two of the wearer's size
   on a board.[^porter-crystal][^pc-notes] How much pre-stretch factories use is unknown.[^gg-notes]
2. **How do makers grade crystal layouts across sizes?** Separate templates per size band, count
   reduction, or smaller stones on child sizes? No source was found.[^gg-notes]

# Why it matters

- Stones are rigid; with a 15–20% width reduction a layout at pitch *d* on the body sits at
  0.80–0.85·*d* on relaxed fabric. If stones are set relaxed, the relaxed state binds the minimum
  gap; if set stretched to worn size, the worn state does.[^gg-notes] See
  [two-state collision checks](/engineering/geometry/two-state-collision-checks.md).
- Stone templates are per pattern piece, so the template must be generated in the same state the
  factory presses in.
- Grading choice changes counts, cost and look per size: see
  [size and pose transfer](/engineering/geometry/size-and-pose-transfer.md).

# Interim position **[INFERRED]**

Run overlap checks in both states; offer both grading semantics (keep count / keep spacing) per stone
group with a per-size report of counts, collisions and cost; ask manufacturers (see
[factory pattern data](/domain/construction/open-question-factory-pattern-data.md)).

[^nam-2024]: NAM, 30 Jul 2024.
[^porter-crystal]: Spandex Simplified, Crystalling on Spandex.
[^preciosa]: Preciosa Hotfix application manual.
[^pc-notes]: Research notes: patternmaking and construction (in-bundle mirror).
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
