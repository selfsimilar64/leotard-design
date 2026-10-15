---
type: Catalog
title: Stone coverage density
description: "Stones per square inch, per linear inch and per square centimetre by size (square and hex packing), the area and line rules, and the error in the retail 30ss figure; used for stone-count estimates and price read-outs."
tags: [crystal, density, catalog, estimate]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: ecs
    resource: /references/research/embellishments-crystals-sequins.md
    title: "Research notes: embellishments, crystals and sequins"
    author: claude-code/claude-opus-5-5
  - id: srr
    resource: /references/research/realtime-sparkle-rendering.md
    title: "Research notes: real-time sparkle rendering"
    author: claude-code/claude-opus-5-5
  - id: ru-chart
    resource: https://rhinestonesu.com/blog/rhinestone-size-chart-ss-mm-inches/
    title: Rhinestones Unlimited size chart
    author: org:rhinestones-unlimited
  - id: ru-whatsize
    resource: https://rhinestonesu.com/blog/rhinestones-101-what-size-rhinestone-do-i-need/
    title: "Rhinestones Unlimited, What size rhinestone do I need"
    author: org:rhinestones-unlimited
  - id: edutech-hotfix
    resource: https://edutechwiki.unige.ch/en/Hotfix_stone
    title: EduTech Wiki, Hotfix stone
    author: org:edutech-wiki
---

# Takeaway

Stone count ≈ area ÷ (stone diameter)² for touching square packing,[^edutech-hotfix] about 15% more
for hex packing; a line holds length ÷ diameter stones.[^ru-chart] These give the live stone-count
and price estimate while the user paints (see [counts and tiers](/domain/embellishments/crystal-counts-and-tiers.md)).

# Retail figures

| Size | Per sq in[^ru-chart] | Per linear in[^ru-chart] | Per linear in (second chart)[^ru-whatsize] |
|---|---|---|---|
| 12ss | ≈68 | 8 | ≈9 |
| 16ss | ≈43 | 7 | ≈7 |
| 20ss | ≈30 | 5 | ≈5⅔ |
| 30ss | ≈12 (likely error) | 4 | ≈4½ |
| 34ss | ≈13 | 3–4 | – |

Line rule: 100 mm of 16ss ≈ 26 stones.[^ru-chart]

# Reference densities (stones touching)

**[INFERRED]** The retail per-square-inch figures equal square packing with stones touching
((25.4 ÷ d)²); the 30ss figure (12) is inconsistent (theory ≈15.8). Hex packing gives ≈15% more.[^ecs]

| Size | Square /cm² | Hex /cm² |
|---|---|---|
| ss6 | 25 | 28.9 |
| ss10 | 12.8 | 14.7 |
| ss16 | 6.6 | 7.6 |
| ss20 | 4.5 | 5.2 |
| ss30 | 2.4 | 2.8 |

With a 0.5 mm gap, ss16 falls to 5.2 (square) / 6.0 (hex) per cm².[^ecs]

# Whole-garment scale

**[INFERRED]** Assuming 0.6–0.9 m² of garment surface (unsourced assumption), full hex coverage holds
on the order of 10^5 stones at ss10 and a few 10^4 at larger sizes; a 4 mm-pitch sequin layout ≈
40–60 thousand, about double with half-overlapped rows.[^srr] Real competition leotards carry
hundreds to ~10,000 stones.[^ecs]

[^ecs]: Research notes: embellishments, crystals and sequins, section 8 (in-bundle mirror)
[^srr]: Research notes: real-time sparkle rendering, sections 3 and 5 (in-bundle mirror)
[^ru-chart]: Rhinestones Unlimited size chart (retailer)
[^ru-whatsize]: Rhinestones Unlimited, what size (retailer)
[^edutech-hotfix]: EduTech Wiki, Hotfix stone (hobbyist)
