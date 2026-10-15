---
type: Process
title: Production and assembly order
description: "Factories cut, print, appliqué, embroider and stone flat pieces, then close side, shoulder and crotch seams last; ateliers and home makers follow related but different sewing orders."
tags: [construction, process, factory, assembly]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: nbc-2021
    resource: https://www.nbcsportsphiladelphia.com/tokyo-olympics/inside-the-creation-of-simone-biles-goat-leotard/186340/
    title: "NBC Sports, Inside the creation of Simone Biles' GOAT leotard, 24 Jul 2021"
    author: org:nbc-sports
  - id: nam-2024
    resource: https://nam.org/small-manufacturer-shines-at-olympics-31672
    title: "NAM, Small manufacturer shines at Olympics (summary of Washington Post reporting), 30 Jul 2024"
    author: org:nam
  - id: cgn-2019
    resource: https://collegegymnews.com/?p=28471
    title: "College Gym News, 12 Dec 2019"
    author: org:college-gym-news
  - id: porter-bodysuit
    resource: https://spandexsimplified.com/basic-bodysuit/
    title: "Spandex Simplified, Basic Bodysuit, 2 May 2024"
    author: org:spandex-simplified
  - id: porter-sleeves
    resource: https://spandexsimplified.com/how-to-sew-sleeves/
    title: "Spandex Simplified, How to Sew Sleeves, 26 Apr 2024"
    author: org:spandex-simplified
  - id: treasurie
    resource: https://blog.treasurie.com/how-to-make-a-leotard/
    title: Treasurie leotard sew-along
    author: org:treasurie
  - id: babylock
    resource: https://babylock.com/gymnast-leotard
    title: "Baby Lock, Gymnast Leotard project"
    author: org:baby-lock
  - id: pc-notes
    resource: /references/research/patternmaking-and-construction.md
    title: "Research notes: patternmaking and construction (in-bundle mirror), sections 5, 8 and 10"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Everything decorative happens on flat pieces; the structural seams that close the garment into a
tube (sides, shoulders, crotch) are sewn last.** This single fact drives much of the software: a
design drawn continuously around the body must be split into per-piece artwork, per-piece stone
templates and per-piece appliqué placements, and anything crossing a closing seam must be split or
finished by hand (see [decoration crossing seams](/domain/construction/rule-decoration-crossing-seams.md)).

# Factory order (GK Elite, competition leotards)

Reported from inside GK's Reading, Pennsylvania plant in 2021 and 2024:[^nbc-2021][^nam-2024][^pc-notes]

| # | Step | Detail |
|---|---|---|
| 1 | Spread and cut | Four-way-stretch fabric spread in several layers, laser cut from a marker laid out to minimise waste |
| 2 | Bundle | Pieces bundled by athlete size and alteration |
| 3 | Sublimate | Artwork printed on transfer paper and heat-transferred onto the *cut* pieces at 450 °F (≈232 °C) |
| 4 | Appliqué | Laser-cut appliqués placed by hand with temporary glue, position checked, then stitched (one Tokyo 2021 leotard had 76 appliqué stars) |
| 5 | Embroider | Team logos embroidered (one-time set-up fee) |
| 6 | Crystals | Machine-built crystal motifs on transfer film heat-pressed onto the flat pieces; extra and fill-in stones set by hand (tweezers) |
| 7 | Close | Front and back sewn together at sides, shoulders and crotch; pieces may be held with temporary glue before sewing |
| 8 | Finish | Finishing on the sewing floor (elastic, edges) |
| 9 | Inspect | Quality inspection |

Labour content: at least 37 employees cut, sew or attach some element of every GK leotard by hand,
working at individual stations rather than on a conventional line.[^cgn-2019][^pc-notes]

Other cut-and-sew sublimation makers reverse steps 1 and 3 (print the roll, then laser-cut); see
[sublimation production](/domain/construction/sublimation-production.md).

# Atelier and home sewing orders

| Maker | Sequence |
|---|---|
| Atelier, lined bodysuit (Porter)[^porter-bodysuit][^pc-notes] | Alter pattern, add neck/back changes and colour blocking → cut outer with greatest stretch across → spray-bond each outer piece to lining and cut lining to match, then treat the pair as one layer → centre-back seam → side, crotch and shoulder seams → elastic at legs, armholes and neck, flipped and zigzagged |
| Atelier, with sleeves (Porter)[^porter-bodysuit][^porter-sleeves][^pc-notes] | Shoulders only → set sleeve in flat (cap midpoint matched to shoulder seam) → one continuous seam from wrist through underarm to leg opening → hem cuffs. Set-in insertion is also used. |
| Home (Treasurie)[^treasurie][^pc-notes] | Shoulders → sleeves in flat → sleeve hems → side seams and crotch → neck and leg elastic |
| Home (Baby Lock, Jalie-based, pieced front with lining)[^babylock][^pc-notes] | Piece and topstitch the front design → centre back and shoulders → sleeves → sides → join brief to bodice → hem sleeves → elastic. Lining cut from the unaltered pattern, joined at centre back and shoulders, basted wrong sides together to the shell, then sewn as one. |

# What this means for the software

- **[INFERRED]** Export must be organised per piece: cut contour, print image, appliqué placements
  and stone template for each piece, in one shared coordinate frame.
- **[INFERRED]** Side, shoulder and crotch seams are "closing seams" with special status: they are
  the last operations, so no machine-applied decoration may cross them.
- **[INFERRED]** The atelier sequence (bond lining to shell, sew as one layer) means a lined panel
  is one pattern piece cut twice, not two independently shaped pieces; the tool can emit the lining
  as a copy of the shell piece (or of the unaltered block, as in the Baby Lock project).
- Sewing order constrains piecing: a seam that must turn a corner or set into an L-shaped opening is
  hard to sew (see [pieced seam geometry](/domain/construction/rule-pieced-seam-geometry.md)).

[^nbc-2021]: NBC Sports, 24 Jul 2021 — spreading, laser cutting, bundling, appliqué, crystal motifs, inspection.
[^nam-2024]: NAM summary of Washington Post reporting, 30 Jul 2024 — order of cut, sublimate, glue, sew, embroider, stone, final seams.
[^cgn-2019]: College Gym News, 12 Dec 2019 — 37 employees per leotard; individual stations.
[^porter-bodysuit]: Spandex Simplified, Basic Bodysuit.
[^porter-sleeves]: Spandex Simplified, How to Sew Sleeves.
[^treasurie]: Treasurie leotard sew-along.
[^babylock]: Baby Lock, Gymnast Leotard project.
[^pc-notes]: Research notes: patternmaking and construction (in-bundle mirror).
