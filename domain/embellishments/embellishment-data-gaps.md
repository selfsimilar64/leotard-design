---
type: Open Question
title: Embellishment data gaps
description: "What the embellishment research could not establish: stone geometry and optical constants, GK's grade and spangle definitions, maker stone sizes and spacing rules, stretch durability, machine formats, competitor tools and conflicting facet counts; with how to close each."
tags: [open-question, crystal, gap]
status: draft
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
  - id: report
    resource: /references/research/research-report.md
    title: "Research report: Borrow the engine, build the sparkle"
    author: claude-code/claude-opus-5-5
  - id: preciosa-maxima
    resource: https://www.preciosacomponents.com/maxima
    title: Preciosa MAXIMA page (Digital Assets download)
    author: org:preciosa
---

# Context

The embellishment research ran out of shared web-search budget part-way; about half was done by
direct page fetches, and several leads could not be checked.[^ecs] The gaps below are the ones that
change what the software can do or claim. "How to close" is a proposal. **[INFERRED]**

# Questions

| # | Question | Why it matters | How to close |
|---|---|---|---|
| Q1 | Stone geometry per size: table diameter, crown angles, height (only hobbyist heights exist) | Facet mesh and look-alike shader parameters are guesses | Preciosa MAXIMA "Digital Assets" download (not opened);[^preciosa-maxima][^srr] supplier CAD; measure sample stones |
| Q2 | Refractive index and Abbe number of Swarovski "Advanced Crystal" and Preciosa crystal; AB film thickness/IOR/composition | Dispersion ("fire") and AB tint are tuned by eye | Supplier data; photograph stones under a small lamp ([validation](/engineering/rendering/sparkle/sparkle-validation.md)) |
| Q3 | Conflicting facet counts: MAXIMA ss30+ 15 vs 18; XILION 2058/2038 count; an "8F" MAXIMA | Facet layout in the stone library | Manufacturer document or physical sample |
| Q4 | GK's own definitions: "Premium vs Standard" (4× facets claim is search-summary only), spanglez, sequinz, nailheads, "brilliance" vs "clear" crystals, "imprinting"; its colour list; J/T pattern parameterisation | Library labels and GK-compatible vocabulary | GK "Leotard Fabrics & Embellishments" article; ask a GK rep |
| Q5 | Which ss sizes, shapes and spacing WAG makers actually use; explicit spacing or size-ratio rules | Defaults for brushes and [placement rules](/domain/embellishments/stone-placement-rules.md) are retail/hobby-derived | Conversations with one or two manufacturers[^report] |
| Q6 | Stone-to-seam clearances and how layouts are carried across sizes | Rule thresholds; size grading of stone maps | Manufacturer conversations[^report] |
| Q7 | Hotfix durability on nylon/spandex under repeated stretch; spangle material/thickness/press settings | Stone-loss warnings; spangle export data | Czech thesis at dspace.tul.cz (not fetched); supplier data |
| Q8 | Setting-machine minimum stone gap, placement accuracy and file formats (CAMS/DSTECH class); GK's machines | Machine export and minimum pitch for machine-set fills | Vendor documentation or a machine owner |
| Q9 | Swarovski's 2026 reopening rests on one retailer; no Swarovski statement | Whether "Swarovski" is a live library option | Swarovski or a second distributor; recheck by 2027 |
| Q10 | Crystal counts for recreational, compulsory, optional and NCAA leotards; 2025/2026 Worlds counts | Tier budgets below Olympic level | Maker catalogues, NCAA vendors |
| Q11 | Any rule (FIG 2025–2028 WAG Code of Points attire article, USAG, NCAA) limiting crystals | Whether rules constrain embellishment at all | Retrieve the rule texts |
| Q12 | Competitor tools not examined: Digital Art Solutions, SmartCut, Easy Stone, OOBling Pro, R-Wear Studio, rStones, Illustrator plug-ins, Sure Cuts A Lot, Wilcom/Pulse/Tajima; whether CLO/Browzwear/Style3D have stone tools; makers Ozone, Destira, Quatro, Milano Pro-Sport, Alpha Factor, Christian Moreau, Agiva, Plum, Rebecca's Mom (terminology) | Competitive baseline | Hands-on trials |
| Q13 | Glue (Gem-Tac, E6000) cure times and washability on mesh/stretch; hand-stoning labour rates | Repair guidance; price estimates | Manufacturer data sheets, maker interviews |
| Q14 | Whether 2018 Swarovski shapes are still produced; full current Preciosa and Swarovski colour charts | [Shapes](/domain/embellishments/stone-shapes.md) and [colours](/domain/embellishments/stone-colour-libraries.md) may list discontinued items | 2027 MAXIMA colour card; current catalogues |
| Q15 | No goniometric/BRDF/luminance data for rhinestones, AB, sequins or spangles; no arena or TV lighting levels | "Accurate" sparkle cannot be checked against numbers | Photographed swatches ([validation](/engineering/rendering/sparkle/sparkle-validation.md)) |

Owner decision context: the rendering target is "appears correct" to the eye, not physical
correctness ([decision](/decisions/2026-10-13-appears-correct-not-physically-correct.md)), which
lowers the priority of Q1–Q2 and Q15 for the product but not for a credible stone library.

[^ecs]: Research notes: embellishments, crystals and sequins, Gaps subsections of every section (in-bundle mirror)
[^srr]: Research notes: real-time sparkle rendering, section 4 gaps (in-bundle mirror)
[^report]: Research report, gaps table (in-bundle mirror)
[^preciosa-maxima]: Preciosa MAXIMA page with Digital Assets link (cited in the sparkle note)
