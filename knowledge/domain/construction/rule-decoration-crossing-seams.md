---
type: Design Rule
title: "Rule: decoration crossing seams"
description: "Because decoration is applied to flat pieces before the side, shoulder and crotch seams are closed, any print, appliqué or crystal motif crossing a seam must be split per piece or finished by hand after assembly."
tags: [construction, rule, seams, decoration, sublimation, crystals, applique]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: nam-2024
    resource: https://nam.org/small-manufacturer-shines-at-olympics-31672
    title: "NAM summary of Washington Post reporting, 30 Jul 2024"
    author: org:nam
  - id: nbc-2021
    resource: https://www.nbcsportsphiladelphia.com/tokyo-olympics/inside-the-creation-of-simone-biles-goat-leotard/186340/
    title: "NBC Sports, 24 Jul 2021"
    author: org:nbc-sports
  - id: gabe
    resource: https://gabeclothing.ca/pages/sublimation-program
    title: Gabe Clothing sublimation program
    author: org:gabe-clothing
  - id: preciosa
    resource: https://www.preciosa-eshop.com/user/related_files/preciosa-hotfix-application-manual-complete-en-2.pdf
    title: Preciosa Hotfix application manual (2019)
    author: org:preciosa
  - id: wolff-2019
    resource: https://history.siggraph.org/?p=100123
    title: "Wolff & Sorkine-Hornung, Wallpaper pattern alignment along garment seams, SIGGRAPH 2019"
  - id: pc-notes
    resource: /references/research/patternmaking-and-construction.md
    title: "Research notes: patternmaking and construction (in-bundle mirror), sections 4, 5, 7 and 10"
    author: claude-code/claude-opus-5-5
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror), section 4"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Decoration (print, appliqué, embroidery, crystals) is applied to flat pieces, and the side, shoulder
and crotch seams are closed last; so anything that crosses one of those seams must be split cleanly
between pieces or deferred to hand application after sewing, and the software must show the user where
that happens.**[^nam-2024][^nbc-2021][^pc-notes]

# What happens to each decoration type at a closing seam

| Decoration | At a closing seam | Basis |
|---|---|---|
| Sublimated print | Split into per-piece images; artwork must match across the seam after sewing (sewing operators align it on cut-and-sew garments) | sourced[^gabe][^pc-notes] |
| Appliqué | Split into per-piece appliqués, or applied after assembly by hand | **[INFERRED]** from process order[^pc-notes] |
| Machine crystal motif | Cannot span the seam (pressed before the seam exists); needs a deliberate break or hand-set stones after assembly | **[INFERRED]** from process order[^pc-notes] |
| Hand-set crystals | Possible after assembly, but hotfix stones on seams and layered material are a standard failure; pressing needs special care near seams | sourced[^preciosa][^pc-notes] |
| Embroidery | Before closing seams at GK; avoid crossing **[INFERRED]** | [^nam-2024] |

# Checks

| ID | Check | Default | Severity |
|---|---|---|---|
| DX-1 | Classify every seam as closing (side, shoulder, crotch, and any seam sewn after decoration) or construction (sewn before decoration, e.g. colour-block seams pieced first) | from the assembly order | — |
| DX-2 | Print regions crossing any seam are split into per-piece images with matching along the stitch line | automatic | info |
| DX-3 | Appliqué crossing a closing seam | split or mark "hand after assembly" | warning |
| DX-4 | Machine stone motif crossing a closing seam | split into per-piece motifs with a keep-out band, or mark stones "hand set after assembly" | warning |
| DX-5 | Report per design: count of hand-applied elements after assembly (cost driver) | always | info |

All checks **[INFERRED]** from the sourced process order.[^pc-notes]

# Seam matching for prints **[INFERRED]**

Sample both sides of a seam from the same continuous artwork along the stitch line, not the cut line,
and extend bleed over the allowance. Research on repeating prints aligns them across seams by
optimising piece placement on the fabric and slightly adjusting pieces (Wolff & Sorkine-Hornung 2019),
relevant to print-then-cut production.[^wolff-2019][^gg-notes]

[^nam-2024]: NAM, 30 Jul 2024.
[^nbc-2021]: NBC Sports, 24 Jul 2021.
[^gabe]: Gabe Clothing.
[^preciosa]: Preciosa Hotfix application manual.
[^wolff-2019]: Wolff & Sorkine-Hornung 2019.
[^pc-notes]: Research notes: patternmaking and construction (in-bundle mirror).
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
