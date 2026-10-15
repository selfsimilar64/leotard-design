---
type: Design Rule
title: "Rule family: mesh lining and accent-only use"
description: "Mesh on the bodice needs a lining layer, mesh should be an accent rather than the main body, and mesh designs carry a fragility waiver at GK; checks with adjustable defaults."
tags: [fabric, mesh, lining, rule]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-fab
    resource: /references/research/fabrics-and-materials.md
    title: "Research notes: fabrics and materials, questions 2, 6 and 7"
    author: claude-code/claude-opus-5-5
  - id: gk-swatch
    resource: https://www.gkelite.com/collections/gk-swatches/products.json?limit=250
    title: GK Elite swatch store data (2026 listings)
    author: org:gk-elite
  - id: gk-care
    resource: https://www.gkelite.com/pages/gk-gym-care-instructions
    title: GK Elite care instructions
    author: org:gk-elite
  - id: gk-7659
    resource: https://gkelite.com/products/7659
    title: GK Elite product 7659
    author: org:gk-elite
  - id: lineup-novelty
    resource: https://thelineup.com/pages/fabrics/novelty
    title: The Lineup novelty fabrics
    author: org:the-lineup
---

# Takeaway

**When a panel's outer fabric is mesh, check where it is: on the bodice it needs a lining layer; as
more than an accent it should raise a durability warning.** The rules come from GK Elite and are the
most explicit any maker publishes; other makers line the front of every competitive leotard anyway
(see [fabric stack](/domain/fabrics/fabric-stack.md)).[^notes-fab]

# Rules

| ID | Check | Default severity | Basis |
|---|---|---|---|
| M1 | Mesh (incl. mesh foil, novelty mesh) on the main bodice with no lining layer beneath | Error (blocking for GK-style production) | GK: Shadowproof liner "may be required" when mesh is on the main bodice; the A01 fabric set makes the nude bodice lining **required**[^gk-swatch][^gk-7659] |
| M2 | Mesh on sleeves without lining | Allowed (lining optional) | GK: optional under mesh sleeves[^gk-swatch] |
| M3 | Mesh share of total garment area above a threshold | Warning; **default threshold 30% of outer area, adjustable** | GK: "We recommend Mesh only be used as accents within a design."; "Mesh is a fragile fabric, not a durable fabric."[^gk-swatch] |
| M4 | Any mesh in a design for GK-style ordering | Info: signed waiver required | GK: use of mesh requires a signed waiver; lifespan not guaranteed[^gk-care] |
| M5 | Mesh, lace or soft-shell in a high-friction/partner-contact routine | Info | GK: close athlete contact can damage mesh; The Lineup advises alternatives for high-friction choreography[^gk-care][^lineup-novelty] |
| M6 | White or light outer fabric | Info: suggest a separate seamless liner garment | GK recommendation[^gk-7659] |

**[INFERRED]** The 30% threshold in M3 is our placeholder; no maker states a number. Severities are
our proposal, to be confirmed with the owner and target manufacturers.[^notes-fab] Rules are
per-maker policy, so the app should store them as a maker profile, not as universal law.

[^notes-fab]: Research notes: fabrics and materials (Q2 GK mesh rules, Q6 inferences, Q7)
[^gk-swatch]: GK Elite swatch store data
[^gk-care]: GK Elite care instructions
[^gk-7659]: GK Elite product 7659
[^lineup-novelty]: The Lineup novelty fabrics
