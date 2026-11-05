---
type: Process
title: Yardsticks from real leotards
description: "How we check that our own drafted blocks match real competition leotards without anyone's blocks: flat garment measurements (owner-measured and resale listings), construction evidence, fit failures in wear and comfort pressure; first resale numbers suggest about 16-27% chest and 8-24% length reduction on GK."
tags: [construction, block, validation, measurements, negative-ease, gk, resale]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-05T12:00:00Z }
sources:
  - id: owner-2026-11-05
    resource: conversation with the product owner, 2026-11-05 (Claude Code session)
    title: Target is the competition-gymnastics look, not dancewear; needs a yardstick; can measure gym leotards flat
    author: human:mattj
  - id: poshmark-2026-11-05
    resource: "Poshmark listings, https://poshmark.com/listing/<id>, 20 listings read 2026-11-05 (ids in the table)"
    title: Seller-measured flat dimensions of GK, Destira, Ozone, Plum, Motionwear, Under Armour, Adidas and Bold & Grit leotards
    author: org:poshmark-sellers
  - id: uk-retailer-sizing
    resource: https://gymnasticsleotards.co.uk/pages/sizing
    title: UK leotard retailer sizing page (garments smaller than body by design, no numbers)
  - id: measuring-log
    resource: https://claude.ai/artifact/TgfhYPiRnEXL5rd6Sf9stS
    title: Leotard Measuring Log (owner's phone form; db collection leotards)
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Armstrong gives us the mechanics; the competition-gymnastics look has to be measured from real
leotards.** The owner's target is a GK / Ozone / Sylvia P style competition leotard, not generic
dancewear.[^owner-2026-11-05] No brand publishes its blocks or its finished-garment
measurements,[^uk-retailer-sizing] so the yardstick is built from what can be observed: finished
garments measured flat, how they are pieced, how they fail in wear, and how tight they may be.
The loop is: draft with our own method, fit on the body, take **the same flat measurements on our
pattern**, compare, and correct the method's parameters (never the fit) where we are off.
**[INFERRED]**

# The four yardsticks

| Yardstick | What it fixes | Where it comes from | Note |
|---|---|---|---|
| Flat garment measurements | Negative ease by brand and size; leg-cut height; elastic ratios | Owner measuring gym leotards; resale listings | Below, and the [measuring log](https://claude.ai/artifact/TgfhYPiRnEXL5rd6Sf9stS)[^measuring-log] |
| Construction evidence | Which seams, panels and linings exist; sewing order | Factory coverage, inside-out photos | [Production and assembly order](/domain/construction/production-and-assembly-order.md) |
| Fit failures in wear | What a wrong pattern does on a body (ride-up, tight armhole) | Reviews, forums, swimwear fit guides | [Fit failures in wear](/domain/construction/fit-failures-in-wear.md) |
| Comfort pressure | "Too tight" from the fit solver's strain | Clothing-pressure research | [Clothing pressure and comfort](/domain/construction/clothing-pressure-comfort.md) |

# Owner measurements

The owner can measure leotards at the gym laid flat: mostly practice tanks, possibly some old
competition leotards; nothing on an athlete.[^owner-2026-11-05] Practice tanks from the competition
brands are still useful, since the same maker cuts both and the torso, crotch and leg line are
probably shared **[INFERRED]**; competition pieces then show what sleeves, backs and panels add.
Records arrive in the measuring log's `leotards` collection (read with the `ArtifactData` tool,
`collection: leotards`). Each record holds brand, style, kind, size label, sleeves, fabric,
lining, wear, unit (`in` or `cm`), `measures`, `seams` (booleans), `crotchSeam`, notes and photo
asset ids (served at `/_blob/<id>` on the artifact).

## The flat measurement set (same on garment and pattern)

Garment front up, relaxed, side seams aligned; widths are one layer across the flat garment. To
compare with a pattern: half-pattern widths × 2 for a front piece cut on the fold, measured on the
**stitching line** at the same landmark. **[INFERRED]**

| Code | Key | Measurement | Pattern equivalent |
|---|---|---|---|
| A | `chest` | Across at the armpits | Front width at underarm level, side to side |
| B | `waist` | Across the narrowest waist | Front width at its narrowest |
| C | `hip` | Across where the leg opening meets the side seam | Front width at the side-seam bottom |
| D | `crotchW` | Crotch width, narrowest | Crotch width |
| E | `shoulderCrotch` | Shoulder top straight down to crotch bottom | Vertical from shoulder high point to crotch line |
| F | `cfLength` | Neckline low point to crotch bottom (front) | Centre-front length |
| G | `cbLength` | Back opening low point to crotch bottom | Centre-back length below the opening |
| H | `sideLength` | Armpit to top of leg opening along the side | Side seam length (leg-cut height) |
| I1 / I2 | `legRelaxed` / `legStretched` | Leg opening loop, relaxed and stretched flat | I2 ≈ leg-edge length; I1/I2 ≈ elastic ratio |
| K1 / K2 | `armRelaxed` / `armStretched` | Armhole loop, relaxed and stretched flat | K2 ≈ armhole edge (front + back) |
| M | `strap` | Strap / shoulder width | Shoulder seam length |
| L | `neckDrop` | Shoulder line down to front neckline low point | Front neck depth |
| N | `backDrop` | Shoulder line down to back opening low point | Back neck or scoop depth |
| S1-S3 | `sleeveLen`, `upperArm`, `cuff` | Sleeve length, flat width at upper arm, cuff | Sleeve length, biceps/2, wrist/2 |

Relaxed edges are gathered by their elastic, so I1 and K1 under-read the fabric edge; I2 and K2
are the ones to compare with a pattern edge. **[INFERRED]**

# First numbers from resale listings

Seller-measured, flat, inches; pit-to-pit is one layer; "length" is usually shoulder or strap top
to crotch bottom, endpoints rarely stated. Amateur measurements: trust the clustering, not one row.[^poshmark-2026-11-05]

| Brand / style | Kind | Label | Pit-to-pit | Length | Other | Listing id ends |
|---|---|---|---|---|---|---|
| GK Elevate | tank | AS | 13 | 24 | "not stretched" | 382e14ec |
| GK Simone Biles | sleeveless | AM | 14.5 | – | | 9f593d18 |
| GK 1992 vintage, LS scoop | long sleeve | AM | 13.875 | 22.5 | flat | 90e60d04 |
| GK Nastia Liukin, V wide strap | comp | AL | 14.5 (17.5 stretched) | 25 | waist 11.5 (14.5); hip 12 (15) | 969fdb75 |
| GK sequin lips | practice | AXS | 12 | – | | 3fbdee1c3 |
| GK women's 82/18 | – | AXS | 13 | 23 | nearest inch | 28ee17651 |
| GK women's 82/18 | – | AS | 14 | 24 | nearest inch | 4b2446080ff |
| GK velvet LS | long sleeve | S | 12.5 (16.5 stretched) | 21.5 | | a7f4d599e0 |
| GK comp LS | comp | "Kids M" | 14 | 23 | sleeve 17 | cec34cb99e |
| GK Carly (Nastia) | comp | "Kids L" | 11 | 23 | | d12038e7c9e |
| GK Elevate, scoop | tank | CM | 11.5 | 20.5 | | 0477a79ee7 |
| Elite Sportswear GK 1990s LS | long sleeve | CL | 12 | 19 | sleeve 15 | 0487376aa517 |
| GK (label missing) | – | est. L | 12.5 | 22 | flat | 945ed99fc1d |
| Adidas/GK 2012 USAG sample | comp | AS | 17 | 25 | 21 mid-neck to crotch seam | f8f909de |
| Under Armour V-neck | – | girls M | 11.5 | 20.5 | | a30a72e88f |
| Destira keyhole | – | women's M | 15 | 26 | | fbdbc3 |
| Ozone | practice | AS | 12.5 | 22 | | db9420af9b3a46f9 |
| Plum | practice | AS | 13 | 23.5 | | 1ec7eccefe7 |
| Motionwear 90/10 | practice | AS | 14 | 25 | shoulders 9; "not stretched" | 21f58b50f816565 |
| Bold & Grit strappy back | – | AXS | 10.5 | 20 | | 9bfc6d1e8a621127ae |

## What they suggest against the GK body chart **[INFERRED]**

Against the middle of each size's ranges in the [GK size chart](/domain/sizing/gk-and-nike-size-chart.md):

- **Chest:** garment girth (2 × pit-to-pit) is about 73-84% of body chest for 8 of 10 GK rows,
  so about **16-27% negative ease**, in line with the high end of [negative ease](/domain/construction/negative-ease.md).
  The Adidas AS (100%) and the "Kids M" long sleeve are outliers (mislabelled, stretched, or a different cut).
- **Waist:** one row (Nastia AL), 81%.
- **Length:** 2 × shoulder-to-crotch against the GK torso loop is about 76-92%, so about
  **8-24% length reduction**, more than the 0-11% published length reductions. The endpoints are
  uncertain (crotch width and strap curve ignored), so this is the first check to run on our
  [drafted blocks](/engineering/app/drafted-blocks.md): 2 × pattern front length against the body's torso loop.

## Not yet covered

Measurements shown only in listing photos (five Under Armour/GK listings) were not read. No
Sylvia P rows. No brand inside-out photos; resale photos sometimes show the inside and are worth a
human look. eBay, Reddit and Chalk Bucket pages were closed to the research tools.

# Construction evidence found

GK Reading's order is pattern making, fabric choice and cutting; sublimation of cut pieces;
embroidery of hip logos; sewing and crystals, consistent with the
[production order](/domain/construction/production-and-assembly-order.md). The FloGymnastics
"How It's Made" tour of Alpha Factor (York, PA, 2016-06-07) is the most promising visual source
of cut pieces and seams but could not be watched by the tools; a human should. No Ozone, Sylvia P,
Destira or Plum production footage was found.

[^owner-2026-11-05]: Conversation with the product owner, 2026-11-05.
[^poshmark-2026-11-05]: Poshmark listings read 2026-11-05.
[^uk-retailer-sizing]: gymnasticsleotards.co.uk sizing page.
[^measuring-log]: Leotard Measuring Log artifact.
