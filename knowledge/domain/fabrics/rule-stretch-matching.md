---
type: Design Rule
title: "Rule family: stretch matching and fit-changing combinations"
description: "Fabrics joined in one garment should have similar stretch, and heavy embellishment, metallic, lined and mesh areas change fit; warn when panel stretch differs beyond a default threshold or a fit-changing combination is used."
tags: [fabric, stretch, fit, rule]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-fab
    resource: /references/research/fabrics-and-materials.md
    title: "Research notes: fabrics and materials, questions 3, 6 and 8"
    author: claude-code/claude-opus-5-5
  - id: evoli-guide
    resource: https://evoli-shop.com/en/the-ulimate-cuide-to-proffesional.html
    title: Evoli fabric guide (commercial, untested)
    author: org:evoli
  - id: gk-p137
    resource: https://secure.viewer.zmags.com/services/resource/pub/167be069/pg2358x2896/3/137?viewerID=448752a2
    title: GK Elite 2026-27 catalogue p.137 (page image)
    author: org:gk-elite
  - id: garland
    resource: https://garlandactivewear.com/pages/custom-design-information
    title: Garland Activewear custom order FAQ
    author: org:garland-activewear
  - id: jalie-3901
    resource: https://cdn.shopify.com/s/files/1/0267/4075/2568/files/product_sizes_3901.pdf?v=1605550698
    title: Jalie 3901 yardage PDF
    author: org:jalie
  - id: buzzfeed-2012
    resource: https://www.buzzfeed.com/amyodell/everything-you-ever-wanted-to-know-about-team-usa
    title: BuzzFeed on Team USA leotards (1 Aug 2012)
    author: org:buzzfeed
---

# Takeaway

**Mixing fabrics changes fit, so the app should warn when panel fabrics stretch very differently or
when heavy decoration stiffens an area.** Evidence is thin but consistent: a reseller says different
lycras can be mixed provided their stretch is similar (commercial, untested);[^evoli-guide] GK says
"The fit and feel of a garment will vary significantly based on the fabric type and embellishments
used ... Heavy embellishments and appliques reduce the stretch so the sizing sample may not fit or
feel like the garment ordered";[^gk-p137] Garland says metallic, lined and mesh garments may fit
differently;[^garland] the 2012 US Olympic team engineered patterns per fabric because "every fabric
we use reacts differently".[^buzzfeed-2012]

# Rules

| ID | Check | Default (adjustable) | Severity |
|---|---|---|---|
| F1 | Any panel fabric below the minimum stretch | **50% in both width and length** (Jalie's stated minimum)[^jalie-3901] | Error |
| F2 | Two seamed panels whose elongation in the same direction differs by more than a threshold | **40 percentage points** (e.g. Vita 145% length vs Panama velvet 230%) | Warning |
| F3 | Heavy embellishment or appliqué coverage on a panel | **coverage threshold: placeholder, to be set with the embellishment model** | Info: sizing sample will not fit like the finished garment |
| F4 | Metallic foil, lined or mesh areas | none | Info: fit may differ |

**[INFERRED]** The F2 and F3 thresholds are our placeholders; no source gives numbers. F2 needs
per-article elongation, which only Carvico publishes (see
[stretch properties](/domain/fabrics/stretch-properties.md)); for other fabrics use family defaults.
All also in the notes.[^notes-fab] Embellishment coverage: [/domain/embellishments/](/domain/embellishments/about.md).

[^notes-fab]: Research notes: fabrics and materials (Q3 Carvico table, Q6 fit findings, Q8 stretch requirement)
[^evoli-guide]: Evoli fabric guide
[^gk-p137]: GK Elite catalogue p.137
[^garland]: Garland Activewear FAQ
[^jalie-3901]: Jalie 3901 yardage PDF
[^buzzfeed-2012]: BuzzFeed, 1 Aug 2012
