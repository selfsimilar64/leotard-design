---
type: Technique
title: Size and pose transfer
description: "Carry a design across sizes and poses through the shared body topology: curves and anchors ride by barycentrics; stone groups offer keep-count (pitch scales with the body) or keep-spacing (count scales ~s or ~s^2) semantics, with a per-size report."
tags: [geometry, technique, grading, sizes, pose, stones]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: kwok
    resource: https://archive.ymsc.tsinghua.edu.cn/pacm_paperurl/20160819153646437451267
    title: "Kwok et al., Styling Evolution for Tight-Fitting Garments, 2016"
  - id: brouet
    resource: https://doi.org/10.1145/2185520.2185532
    title: "Brouet et al., Design Preserving Garment Transfer, ACM TOG 31(4), 2012 (bibliographic only)"
  - id: houdini-scatter
    resource: https://www.sidefx.com/docs/houdini/nodes/sop/scatter.html
    title: Houdini Scatter SOP (seed stability)
    author: org:sidefx
  - id: body-js
    resource: ../../../poc-threejs/src/body.js
    title: "poc-threejs/src/body.js (REF, aRef, setBody)"
    author: claude-code/claude-opus-5-5
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror), sections 1, 3 and 7"
    author: claude-code/claude-opus-5-5
  - id: report
    resource: /references/research/research-report.md
    title: "Research report (in-bundle mirror)"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Design once on a reference body and carry everything to other sizes and poses through the shared
topology; for stones, offer two semantics per group — keep count (spacing shrinks on small sizes) or keep
spacing (count changes) — and report counts, collisions and cost per size.** No source says how
manufacturers grade crystal layouts.[^gg-notes][^report] The POC already designs once on `REF = 'young'`
and evaluates region fields on reference positions for every body.[^body-js]

# What transfers how **[INFERRED]**

| Object | Transfer |
|---|---|
| Curves | evaluate once on the reference body; carry polyline vertices by barycentrics; optional per-size re-straightening for straps |
| Regions / panels | follow their curves; region topology stays identical across sizes |
| Pattern pieces | re-flattened per size from the carried panels, then checked against the factory's grade rules ([grading](/domain/construction/grading-across-sizes.md)) |
| Print artwork | per element: scales with the piece, keeps absolute size (logos, lettering), or re-flows |
| Baked stones | anchors ride the mesh (keep count) |
| Stone generators | re-run per size (keep spacing) or anchor-carry (keep count) |

Research on transferring designs: styling curves regenerated for different bodies and poses (Kwok et
al. 2016); design-preserving garment transfer between bodies (Brouet et al. 2012, not read).[^kwok][^brouet][^gg-notes]

# Stone semantics **[INFERRED]**

- **(A) Keep count, scale spacing:** same anchors on a smaller body; stones keep physical size, so gaps
  shrink; for a linear body scale *s* the pitch scales by *s*. Preserves the exact motif; the only option
  for baked stones; can collide on small sizes.
- **(B) Keep spacing, change count:** re-run the generator per size; counts scale ~*s* for lines and
  ~*s*² for fills (s = 0.7 → about half the stones in a fill). Preserves sparkle density, avoids
  collisions; free for non-destructive generators.
- Default: (B) for fills and scatters, (A) for outlines and counted motifs; optional stone-size
  substitution per size band (e.g. one size smaller on child sizes).
- Seed stability matters: changing counts reshuffles points unless seeds are pinned (Houdini's note).[^houdini-scatter]

All from the research note's reasoning.[^gg-notes]

# Poses

Anchors ride the skinned mesh; stones near joints converge or diverge visibly, a truthful preview of the
real garment. Robustness under extreme deformation (candy-wrapper shoulders) was not investigated.[^gg-notes]

[^kwok]: Kwok et al. 2016.
[^brouet]: Brouet et al. 2012.
[^houdini-scatter]: Houdini Scatter SOP.
[^body-js]: poc-threejs/src/body.js in the project repository.
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
[^report]: Research report (in-bundle mirror).
