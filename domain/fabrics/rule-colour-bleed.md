---
type: Design Rule
title: "Rule family: colour bleed between adjacent panels"
description: "Dark or bright fabrics (GK flags Navy, Berry, Merlot, Black, Red mystique and Rich Red velvet) next to white or light panels risk colour transfer; warn when a flagged colour touches a light one."
tags: [fabric, colour, rule]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-fab
    resource: /references/research/fabrics-and-materials.md
    title: "Research notes: fabrics and materials, questions 2, 6 and 7"
    author: claude-code/claude-opus-5-5
  - id: gk-p127
    resource: https://secure.viewer.zmags.com/services/resource/pub/167be069/pg2358x2896/3/127?viewerID=448752a2
    title: GK Elite 2026-27 catalogue p.127 (page image)
    author: org:gk-elite
  - id: gk-care
    resource: https://www.gkelite.com/pages/gk-gym-care-instructions
    title: GK Elite care instructions
    author: org:gk-elite
  - id: sp-care
    resource: https://teamwear.sylviap.com.au/pages/product-care-instructions
    title: Sylvia P product care instructions
    author: org:sylvia-p
---

# Takeaway

**Warn when a bleed-prone colour shares a seam with white or a light colour.** GK's catalogue marks
some mystique colours "High risk of color bleed when combined with white or light colors" and may
refuse returns on special orders in risky combinations.[^gk-p127][^gk-care] Sylvia P says colour
transfer may occur when light and dark colours sit next to each other.[^sp-care]

# Flagged colours (GK)

- Catalogue legend (star) read on: Navy, Berry, Merlot mystique.[^gk-p127] **[UNVERIFIED]** small legend
  symbols were read by eye from a page image and should be re-checked against the image.[^notes-fab]
- Care page: Berry, Black, Navy, Red and Merlot Mystique and Rich Red Velvet as higher risk.[^gk-care]

# Rule

| ID | Check | Default | Severity |
|---|---|---|---|
| B1 | A panel in a flagged colour is adjacent (shares a seam or overlaps) to a panel whose colour is light | "Light" = **CIELAB L\* above 80, adjustable**; flagged list per maker profile | Warning |
| B2 | Dark and light panels meet under the arm | Same | Warning, stronger wording: GK says deodorant and sweat cause bleed "especially under the arms where two colours meet"[^gk-care] |

**[INFERRED]** The L\* threshold and the adjacency definition are our placeholders; makers give only
named colours. Colour transfer also happens off the garment (light leotard under a dark warm-up, damp
garments in a bag) and cannot be fully prevented by washing,[^gk-care] which no design check can
address. All also in the notes.[^notes-fab]

[^notes-fab]: Research notes: fabrics and materials (Q2 legend reading, Q6, Q7)
[^gk-p127]: GK Elite catalogue p.127
[^gk-care]: GK Elite care instructions
[^sp-care]: Sylvia P product care instructions
