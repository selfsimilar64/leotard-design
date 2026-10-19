---
type: Technique
title: Four-level crystal LOD chain (proposed)
description: "The research team's own, unvalidated proposal for drawing 2,000-100,000 crystals: per-stone LOD by projected size (traced facets, table-shaded mesh, analytic quad, folded into a glint lobe) sharing one per-stone lobe set and seed so the same stone flashes at every level; precomputed per-cut exit-lobe tables."
tags: [rendering, crystal, lod, proposal]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: srr
    resource: /references/research/realtime-sparkle-rendering.md
    title: "Research notes: real-time sparkle rendering"
    author: claude-code/claude-opus-5-5
  - id: report
    resource: /references/research/research-report.md
    title: "Research report: Borrow the engine, build the sparkle"
    author: claude-code/claude-opus-5-5
  - id: preciosa-faq
    resource: https://img.preciosacomponents.com/files/landingpage/lp-4/downloads/Preciosa_Chaton_Rose_MAXIMA_Frequently_Asked_Questions_EN.pdf
    title: Preciosa MAXIMA FAQ (PDF)
    author: org:preciosa
  - id: ijewel-intro
    resource: https://docs.ijewel3d.com/introduction/ijewel.html
    title: iJewel3D docs, introduction
    author: org:ijewel3d
  - id: wiki-rhinestone
    resource: https://en.wikipedia.org/wiki/Rhinestone
    title: Wikipedia, Rhinestone
    author: org:wikipedia
---

# Status

**This scheme is the research team's own design. No public demonstration of anything like it was
found, and it is the single most important thing to prototype.**[^report][^srr] Everything below is
**[INFERRED]** unless cited. The PoC does not implement it (one LOD, 32 triangles per stone; see
[stones component](/engineering/poc/stones.md)).

# Why

Web jewellery viewers trace light through gems in real time but claim only hundreds of stones;[^ijewel-intro]
a leotard carries 2,000–10,000 (up to ~10^5 at full coverage).[^report] Projected size drives
everything: if a 1.5 m gymnast fills ≈85% of viewport height, one pixel ≈1.6 mm at 1080p and 0.8 mm
at 2160p, so an 8–10ss stone (2.3–2.8 mm[^wiki-rhinestone]) covers ≈1.4–1.7 px (1080p) or 2.8–3.4 px
(4K); facets are always sub-pixel at full-body distance. In an extreme close-up (5 cm across the
screen) a stone is 100–200 px wide and only a few hundred are in view.[^srr]

# The chain

Selected per instance by projected diameter d in pixels, with hysteresis and a cross-fade band:[^srr]

| LOD | d | Geometry | Shading |
|---|---|---|---|
| 0 | ≳32 px | Full facet mesh: table + crown + girdle bevel, ≈40–80 tris; MSAA on silhouettes | In-shader analytic tracing ([optics](/engineering/rendering/sparkle/crystal-optics-look-alike.md)), dispersion, thin film |
| 1 | 6–32 px | Reduced mesh ≈16–24 tris | Per-facet shading from the precomputed exit-lobe table; no tracing |
| 2 | 1–6 px | One quad / point sprite oriented to the fabric | Fragment shader evaluates the stone's lobes analytically; anti-aliased disc; below ≈1.5 px clamp splat size and scale radiance by area ratio (energy conserved) |
| 3 | <1 px or over instance budget | None | Folded into the fabric shader as a glint lobe driven by a stone-density/coverage texture in pattern space, same per-stone seeds ([glint models](/engineering/rendering/sparkle/glitter-glint-models.md)) |

**Invariant that makes transitions invisible**: every LOD draws from the same per-stone discrete lobe
set and seed, so the same stone flashes at the same light/view configuration with the same integrated
energy; only the spatial resolution of the flash changes.[^srr][^report]

# Exit-lobe tables

Per stone type (cut × index × coating), precompute offline or at load, for a grid of view directions
(e.g. 64×64 octahedral bins), the K strongest outgoing→incoming mappings, each a mirror-like "virtual
facet": incoming direction, projected-area × Fresnel weight, chromatic spread vector. Preciosa's "up to
264 distinct reflected rays"[^preciosa-faq] suggests the order of magnitude (hundreds over all views, a
dozen or so per view). Runtime: Σ weight × light(incoming dir) for analytic lights with an acceptance
cone equal to the light's angular radius, plus one env lookup per lobe at the mip matching the lobe's
solid angle. Storage ≈0.5 MB per stone type (16 lobes × 8 bytes per bin). Lighting-independent, so
light edits cost nothing; per-instance rotation rotates the lookup.[^srr]

# Budgets (estimates to validate)

- Full-body: everything LOD2/3; 10^5 stones ≈ 2×10^5 triangles.
- Worst mid-range (10^5 at LOD1): ≈2×10^6 triangles — fine on discrete GPUs, heavy on integrated;
  hence a per-frame instance budget pushing the smallest stones to LOD2.
- Close-up: a few hundred LOD0 stones, fill-rate bound.[^srr]
- Native hardware RT could trace instanced stone BLASes but is unavailable in browsers and impractical
  on integrated GPUs: optional quality tier at most.[^srr]

# Validation

LOD-invariance test: area-integrated radiance and sparkle counts of a stoned patch must agree across
LOD0–3 for a sweep of distances ([validation](/engineering/rendering/sparkle/sparkle-validation.md)).[^srr]
Instancing, culling and picking: [stone instancing at scale](/engineering/rendering/sparkle/stone-instancing-at-scale.md).

[^srr]: Research notes: real-time sparkle rendering, sections 4, 5 and 9 gaps (in-bundle mirror)
[^report]: Research report, sparkle section (in-bundle mirror)
[^preciosa-faq]: Preciosa MAXIMA FAQ (vendor claim, no method)
[^ijewel-intro]: iJewel3D introduction (vendor claim)
[^wiki-rhinestone]: Wikipedia, Rhinestone (8ss ≈ 2.3 mm, 10ss ≈ 2.8 mm)
