---
type: Catalog
title: Hotfix press parameters
description: "Manufacturer and retail heat-fix recipes: Preciosa time-vs-temperature tables by fabric class and side, transfer press settings (160-170 C, 15-25 s, medium pressure), Swarovski range, fabric suitability and correct-bond criteria."
tags: [hotfix, production, catalog, heat-press]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: ecs
    resource: /references/research/embellishments-crystals-sequins.md
    title: "Research notes: embellishments, crystals and sequins"
    author: claude-code/claude-opus-5-5
  - id: preciosa-manual
    resource: https://www.preciosa-eshop.com/user/related_files/preciosa-hotfix-application-manual-complete-en-2.pdf
    title: Preciosa Hotfix Application Manual (PDF, 2019)
    author: org:preciosa
  - id: edutech-hotfix
    resource: https://edutechwiki.unige.ch/en/Hotfix_stone
    title: EduTech Wiki, Hotfix stone
    author: org:edutech-wiki
  - id: ru-methods
    resource: https://rhinestonesu.com/blog/how-to-apply-hotfix-rhinestones-3-methods-compared/
    title: Rhinestones Unlimited, hotfix methods compared
    author: org:rhinestones-unlimited
  - id: wiki-rhinestone
    resource: https://en.wikipedia.org/wiki/Rhinestone
    title: Wikipedia, Rhinestone
    author: org:wikipedia
  - id: trw-dmc
    resource: https://www.therhinestoneworld.com/dmc-hotfix-ss10-rhinestones
    title: The Rhinestone World, DMC SS10
    author: org:the-rhinestone-world
---

# Takeaway

For leotard fabric (polyester/nylon with elastane) the manufacturer recipe for hotfix **transfers**
is **160–170 °C, 15–25 s, medium pressure** (PES/lycra: 25 s at 160 °C or 18 s at 170 °C), fabric
held slightly stretched, then cool ~5 min and cure 24 h before handling or washing.[^preciosa-manual]
These numbers matter to the app only as export metadata and as the reason behind the
[placement rules](/domain/embellishments/stone-placement-rules.md) (seams, mixed heights, mesh).
**[INFERRED]**

# Preciosa single-stone tables (ss10, seconds)

Temperatures 120/130/140/150/160/170/180/190/200 °C.[^preciosa-manual][^ecs]

| Fabric class (g/m²) | Heat through stone (front) | Heat through fabric (back) |
|---|---|---|
| Cotton/silk/linen (50–200) | 48/40/34/28/22/16/12/10/8 | 15/13/10/9/7/5/4/4/3 |
| Wool/cashmere (200–300) | 55/45/35/30/25/20/16/13/10 | 24/22/17/14/11/7/6/6/5 |
| "PES, lycra" (150–250) | 52/44/48*/32/25/18/15/12/9 | 20/18/15/12/9/6/5/5/4 |
| Suede/embroidery/denim (250–400) | 60/50/42/34/26/20/16/13/10 | 25/23/20/15/11/7/6/6/5 |

\* 48 s at 140 °C is as printed; looks like a typo.

Time grows with stone size: on cotton at 160 °C from the front ≈15 s (ss4), 22 s (ss10), 60 s (ss48)
— read from a chart with partly garbled labels.[^preciosa-manual][^ecs]

# Transfer press (Preciosa)

- "Adjust the Heat-press to 160-170°C … Start with 160°C first, 20 second"; "Press for 15-20 seconds
  with medium pressure"; PES/lycra 25 s @160 °C or 18 s @170 °C.
- Stones loose → raise 3–4 °C and 3–4 s. After peeling, cover with cotton and press a further 15 s.
- Transfer film "is made of PVC" and deforms without a cloth or Teflon cover.
- Mixed sizes or stones larger than ss16: apply on the reverse side (stones facing down) with
  increased pressure; use a silicone-foam compensation pad when stones of different heights sit
  side by side.
- Stretch material: "secure the material slightly stretched on a pad prior to the application".
- Other methods: ultrasound; hand applicator with an adapter per stone size; iron at 150 °C / 300 °F.
  — all [^preciosa-manual]

# Fabric suitability (Preciosa)

Base fabric must withstand ≥120 °C / 250 °F and be absorbent (water-drop test); minimum surface
tension 38 mN/m. Unsuitable: Teflon, water-repellent, silicone, fluorocarbon, softener and
dirt-resistant finishes, metal-pigment dyes, smooth leather. Washing before application can remove
softener residue.[^preciosa-manual]

# Correct bond criteria

- Thin fabric: correct when "the glue soaks a little through the base material and is visible on the
  reverse side"; put Teflon or silicone foil inside the garment so front and back do not stick.
- "a tiny amount of glue extrudes around the stone … not visible to the eye unless viewed under a
  magnifying glass"; too much heat/pressure gives a visible glue ring and a weak bond.
- Listed faults: stones not holding "on seams or layered materials"; "Materials that bend or move
  easily under application pressure are not suitable for applying big stones". — [^preciosa-manual]

# Other published settings

| Source | Setting |
|---|---|
| Swarovski hotfix manual via EduTech | 120–170 °C; max 20 s at 160 °C or 60 s at 120 °C from the front[^edutech-hotfix] |
| Rhinestones Unlimited (retail) | 320 °F (160 °C) 15–20 s medium; polyester/lycra 285–300 °F (140–150 °C) 25–32 s; preheat 10–15 min; 24 h before washing; wand (BeJeweler Pro, 8 tips 6ss–34ss) hold 2–3 s until glue looks shiny, then press 10–15 s[^ru-methods] |
| Wikipedia | "Standard transfers require temperatures of up to 180–200 °C (350–400 °F)"[^wiki-rhinestone] |
| Korean/DMC (retail) | **[UNVERIFIED]** 325 °F for 15 s, medium/firm[^trw-dmc] |
| Hobby practice | 200 °C ≈20 s (ss16), 30 s (ss34); repeat pressings "may dilute the glue"[^edutech-hotfix] |

[^ecs]: Research notes: embellishments, crystals and sequins, section 7 (in-bundle mirror)
[^preciosa-manual]: Preciosa Hotfix Application Manual (manufacturer, 2019)
[^edutech-hotfix]: EduTech Wiki, Hotfix stone (hobbyist relaying the Swarovski manual)
[^ru-methods]: Rhinestones Unlimited, three methods compared (retailer)
[^wiki-rhinestone]: Wikipedia, Rhinestone
[^trw-dmc]: The Rhinestone World, DMC SS10 (search summary only)
