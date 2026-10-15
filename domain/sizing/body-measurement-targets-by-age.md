---
type: Catalog
title: Body measurement targets by age
description: "Target body measurements (height, chest, waist, hip, neck, cross-shoulder, back length) for girl/woman bodies at about 8, 13, 18 and 30 years, derived from vendor charts, and the leotard size each falls into."
tags: [sizing, body, measurements, mannequin, catalog]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: fit
    resource: /references/research/mannequins-and-leotard-fit.md
    title: "Research notes: mannequins and leotard fit (bundle mirror)"
  - id: pipeline
    resource: pipeline/README.md (project root), read 2026-10-15
    title: Mannequin pipeline README
    author: claude-code/claude-opus-5-5
---

# Takeaway

Vendor mannequin and dress-form charts agree within about 3 cm. Use these targets: **age 8 ≈ 130 cm,
64-69 / 56-62 / 68-72 cm (chest/waist/hip)**; **age 12-13 ≈ 152-155 cm, 76 / 62-66 / 81 cm**;
**age 14 ≈ 80 / 71 / 86 cm**; **adult size 4-6 form ≈ 86-90 / 67-72 / 92-95 cm**.[^fit] The four
target bodies below sit inside GK sizes `CM`/`CL` (child), `AXS` (teen) and `AS` (adult).[^fit]

# Target bodies (cm)

| Body | Height | Chest/bust | Waist | Hip | Neck | Cross-shoulder | Back neck→waist | Leotard size (torso loop) |
|---|---|---|---|---|---|---|---|---|
| child ~8 | 130 | 66 | 57 | 69 | 31 | 28 | 31 | `CM` (≈ 120) |
| teen ~13 | 155 | 78 | 64 | 83 | 34 | 31.5 | 34 | `AXS` (≈ 134) |
| young adult ~18 | 163 | 84 | 65 | 89 | 34 | 36 | 39 | `AS` (≈ 141) |
| adult ~30 | 165 | 87 | 67 | 91 | 35 | 38 | 41 | `AS`/`AM` (≈ 145) |

**[INFERRED blend]:** child and teen rows are the median of the vendor rows (see
[child and teen forms](/domain/mannequins/child-and-teen-form-measurements.md)), pulled slightly
toward the slimmer end for a "gymnast-ish" build. Adult rows sit between a size 4 dress form and the
display mannequin, with the waist held about 3-5 cm below the dress-form value for an athletic
build.[^fit]

The POC mannequin pipeline takes its body statures from these targets.[^pipeline] See
[/engineering/pipeline/mannequin-pipeline.md](/engineering/pipeline/mannequin-pipeline.md).

Vendor sizing for forms varies widely (a "size 8" waist ranges 67-75 cm across sources), so these
are targets for a plausible body, not a standard.[^fit] See also the
[GK size chart](/domain/sizing/gk-and-nike-size-chart.md).

[^fit]: Research notes: mannequins and leotard fit, bundle mirror, sections 2 and 4.
[^pipeline]: Mannequin pipeline README ("Body statures follow research_notes/mannequins_and_leotard_fit.md").
