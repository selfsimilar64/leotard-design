---
type: Domain Concept
title: Moodboard design-space taxonomy
description: "Synthesis of the 138-image moodboard teardown into the axes along which the designs vary (silhouette, panelling, openings and straps, layers, fabrics, prints, trims, stones, decals, photography), with rough frequencies and the rare features that set the tool's ceiling."
tags: [moodboard, taxonomy, design-space, requirements-input]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-18T19:45:00Z }
sources:
  - id: p1
    resource: /domain/moodboard/catalogue-part-1.md
    title: Moodboard catalogue part 1
  - id: p2
    resource: /domain/moodboard/catalogue-part-2.md
    title: Moodboard catalogue part 2
  - id: p3
    resource: /domain/moodboard/catalogue-part-3.md
    title: Moodboard catalogue part 3
  - id: p4
    resource: /domain/moodboard/catalogue-part-4.md
    title: Moodboard catalogue part 4
  - id: p5
    resource: /domain/moodboard/catalogue-part-5.md
    title: Moodboard catalogue part 5
  - id: p6
    resource: /domain/moodboard/catalogue-part-6.md
    title: Moodboard catalogue part 6
  - id: p7
    resource: /domain/moodboard/catalogue-part-7.md
    title: Moodboard catalogue part 7
  - id: owner
    resource: conversation with the product owner, 2026-10-18 (Claude Code session)
    title: "Moodboard brief: note the degree of variation (sequin patterns, fabric sectioning, back straps)"
    author: human:mattj
---

# Takeaway

The 138 photos (about 105 distinct garments; several front/back pairs and multi-view sets) vary on
**ten independent axes**. Three of them carry most of the uniqueness the owner pointed at:[^owner]
**panel lines** (almost every garment has its own), **stone layout** (almost every garment has its
own), and **backs** (every back view differs). Everything else is drawn from a fairly small, repeated
vocabulary that presets can cover. Frequencies below are rough, from the seven catalogue parts.[^p1][^p2][^p3][^p4][^p5][^p6][^p7]
**[INFERRED]** where it generalises.

# The axes

| # | Axis | Common vocabulary (rough share of garments) | Ceiling cases (rare but must be possible) |
|---|---|---|---|
| 1 | **Silhouette** | Long or 3/4 sleeves (~75%), raglan very common; crew or mock/high neck (~70%); high or medium-high leg | Asymmetric sleeves (one mesh, one opaque; ~6 garments); one-shoulder illusion; halter and racer cut-ins; stand/mandarin collar with notch; cuffs as bands |
| 2 | **Panel lines** | Mesh yoke to a sweetheart, V or shallow-V edge (~50%); straight or Λ/V waist seam (~70%); waist chevrons; side lens/hourglass insets; raglan seams | S-curve flames ending in points; nested offset chevrons; off-centre radial sunburst panels; asymmetric diagonal swooshes and blades; corset dividers; crossover X bands; vesicas; scalloped and print-following edges; panels wrapping front to back |
| 3 | **Openings and straps** | Round, teardrop or tombstone back keyhole with a CB clasp; scoop/V backs | Strap cages (Y spine, H, double-X lattice in a circular opening, 6-strap fan, ladder of 5); ladder backs with filled cells; floating straps that become applied bands; wrap-back edges that become straps over side cut-outs; midriff arch cut-out that leaves the bodice joined only at the sides; stacked keyholes with bridges |
| 4 | **Layers** | Mesh over skin (~85% of garments use mesh somewhere, 30-95% show-through) | Mesh over a visible lining shape (bandeau/crop); overlapping lace wrap pieces with the under-layer's edges visible; surplice/crossover panels; sash or appliqué band over panels; ruching, gathers and a twist-knot |
| 5 | **Fabrics** | Matte tricot, shiny/satin tricot, wet look, mystique foil-dot, solid metallic foil, tinted mesh | Hologram (fine, shattered, liquid/opal pearl), duochrome and oil-slick foils, chameleon foil print, glitter-grain foil, glitter-coated tricot, velvet and crushed velvet, lace and printed lace on mesh, flocked/patterned mesh, mirror-chrome appliqué mosaic |
| 6 | **Prints** | Ombre (vertical, along the sleeve, diagonal, multi-stop) on a panel or across panels | Geometric shard prints; damask and floral; woven-ribbon illusion; line-art; printed rhinestone illusion; glitter print; foil print masks (holographic dots, leopard) |
| 7 | **Trims** | Self or contrast binding on every edge (~1 cm); mock-neck bands; cuffs | Contrast piping on every seam; bands over seams with their own material (silver X); topstitching; hardware (clear hook, metal hook-and-bar, invisible zip) |
| 8 | **Stone layout** | Rows on seams and edges (single, double, 3-5-row bands, one-sided), gradient scatter anchored to a seam, edge or cuff (~80%), neckline/collar bands, sparse sleeve scatter, cuff bands | Rays and fans (from a point, a curve or converging), size and spacing ramps along a ray, curtains between two curves, rain and chandelier drops, lattices and trellises with node motifs, seigaiha tiling, concentric contour fills coloured by depth, line-art motifs (bow, lotus, filigree, paisley, scrolls), comet sweeps with flow-aligned shaped stones, fringe drops with pear stones, lettering |
| 9 | **Stones** | Clear and AB round ss6-ss20, mixed sizes | Coloured (sapphire, siam, rose, amethyst, gold, peridot, jet, hematite) and colour ramps along a line or by distance; navette, pear, oval, bugle shapes oriented along a flow; spangles and flat holo dots; pearls |
| 10 | **Decals** | Hip logo (print, foil print or crystal) on nearly every product shot | Embroidered logos; crystal script lettering and monograms |

# Photography (for renderer calibration)

Mostly studio product shots: white, light-grey or pink seamless, one large soft key, crystals as
pinpoint glints with AB fire and no flare. Minorities: brand shots with a post-processed star filter
(4-, 6-, 8-point), arena and competition lighting (strong starbursts), gym fluorescent (subdued
sparkle), domestic phone light and flash, and low-key single-spot editorials. Nearly all are worn by
athletes (skin visible through mesh), often with hands on hips. Shiny fabric bridges flat across the
cleavage, mesh darkens at grazing angles and seams show as faint lines.[^p2][^p6][^p7]

# Consequences for the tool **[INFERRED]**

- The **curve tool and the stone generators are the product.** They must be free-form; presets help
  but cannot carry these axes.
- **Layers are a real axis, not an edge case:** mesh over skin or lining, overlays, appliqué bands.
- **Stones must be colourable and shapeable per stone and per generator**, and generators must be
  able to read prints, seams and edges as their guides.
- **Photo-matched lighting and athlete skin** decide how close a render can look to these photos.

The tool list derived from this is in [tool space](/product/requirements/tool-space-for-moodboard.md);
the per-image detail is in catalogue parts [1](/domain/moodboard/catalogue-part-1.md),
[2](/domain/moodboard/catalogue-part-2.md), [3](/domain/moodboard/catalogue-part-3.md),
[4](/domain/moodboard/catalogue-part-4.md), [5](/domain/moodboard/catalogue-part-5.md),
[6](/domain/moodboard/catalogue-part-6.md) and [7](/domain/moodboard/catalogue-part-7.md).

[^owner]: Product owner, 2026-10-18
[^p1]: Catalogue part 1
[^p2]: Catalogue part 2
[^p3]: Catalogue part 3
[^p4]: Catalogue part 4
[^p5]: Catalogue part 5
[^p6]: Catalogue part 6
[^p7]: Catalogue part 7
