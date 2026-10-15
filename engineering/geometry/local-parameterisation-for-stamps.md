---
type: Technique
title: Local parameterisation for stamps
description: "Place motifs, spirals and decals by defining them in the tangent plane at a centre point and pushing them to the surface with the exponential map; use a log map (Affine Heat Method, MMP) for the inverse; parameterise the region itself for large motifs."
tags: [geometry, technique, exponential-map, log-map, stamps, decals]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: schmidt-2006
    resource: https://doi.org/10.1145/1141911.1141930
    title: "Schmidt, Grimm, Wyvill, Interactive decal compositing with discrete exponential maps, ACM TOG 25(3), 2006 (bibliographic only)"
  - id: g3sharp
    resource: https://github.com/gradientspace/geometry3Sharp
    title: geometry3Sharp MeshLocalParam
    author: org:gradientspace
  - id: vhm
    resource: https://arxiv.org/pdf/1805.09170
    title: "Sharp, Soliman, Crane, The Vector Heat Method, ACM TOG 38(3), 2019"
  - id: ahm
    resource: https://diglib.eg.org/handle/10.1111/cgf70205
    title: "Soliman & Sharp, The Affine Heat Method, CGF 44(5), SGP 2025"
  - id: gc-vhm
    resource: https://geometry-central.net/surface/algorithms/vector_heat_method/
    title: geometry-central vector heat method / log map
    author: org:geometry-central
  - id: gc-geodesic
    resource: https://geometry-central.net/surface/algorithms/geodesic_distance/
    title: geometry-central geodesic distance (MMP getLog)
    author: org:geometry-central
  - id: ilogmap
    resource: https://arxiv.org/abs/2609.10503
    title: "Banduc, Pezzuto, Sahli Costabal, iLogMap, preprint 9 Sep 2026"
  - id: stripes
    resource: https://www.cs.cmu.edu/~kmcrane/Projects/StripePatterns/
    title: "Knöppel et al., Stripe Patterns on Surfaces, SIGGRAPH 2015"
  - id: ptex
    resource: https://github.com/wdas/ptex
    title: Ptex (Walt Disney Animation Studios)
  - id: meshcolors
    resource: http://www.cemyuksel.com/research/meshcolors/
    title: "Yuksel et al., Mesh Colors, ACM TOG 29(2), 2010"
  - id: painter
    resource: https://www.cgchannel.com/2023/06/adobe-releases-substance-3d-painter-9-0/
    title: "CG Channel, Substance 3D Painter 9.0, 21 Jun 2023"
    author: org:cg-channel
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror), section 5"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**For stamping motifs that follow the surface with minimal distortion, define the motif in the 2D tangent
plane at the stamp centre and push each element to the surface with the exponential map (trace a geodesic
from the centre in direction θ for length r).** It is exact along rays, costs only the triangles crossed,
needs no linear solve and ports easily to JS/WASM. Use a log map for the inverse direction (texture a
decal, find stones inside a footprint, drag a motif preserving layout).[^gg-notes]

# Methods

| Method | Notes |
|---|---|
| Discrete exponential maps (Schmidt et al. 2006) | Dijkstra-style propagated exp maps for decals (recalled; abstract not retrieved)[^schmidt-2006]; geometry3Sharp `MeshLocalParam` computes them around a point (Boost)[^g3sharp] |
| Vector Heat Method (2019) | parallel transport by short-time heat flow → log map, Karcher means, geodesic Voronoi[^vhm] |
| Affine Heat Method (SGP 2025 best paper) | log map with direction and distance together; one variant precomputes for fast repeats, the other resolves detail near the cut locus[^ahm] |
| geometry-central `computeLogMap` | strategies `VectorHeat` (fast, some distortion), `AffineLocal` (fast and highly accurate near source; may need intrinsic Delaunay), `AffineAdaptive` (highest quality, refactor per solve); arbitrary surface-point sources; intrinsic Delaunay makes log maps "dramatically more accurate"[^gc-vhm] |
| Exact MMP log maps | `getLog` in geometry-central[^gc-geodesic] |
| iLogMap (preprint Sep 2026) | magnetic-Laplacian eigenproblem; claims reduced metric distortion, anisotropic metrics; code unconfirmed[^ilogmap] |
| Stripe Patterns (2015) | evenly spaced stripes aligned to a direction field, controllable spacing, one sparse eigenproblem[^stripes] |

All via the research note.[^gg-notes]

# Distortion and scope **[INFERRED]**

- Geodesic polar maps are exact radially and distort circumferentially in proportion to enclosed Gaussian
  curvature: excellent for motifs small relative to body curvature, worse for large motifs wrapping bust
  or hip. For large fills parameterise the region itself (LSCM/ARAP patch, or a stripe/field-aligned
  parameterisation) and relax a few steps.
- Distortion magnitude for, say, a 10 cm spiral over a child's bust was not quantified.[^gg-notes]

# Raster painting is secondary **[INFERRED]**

Colour blocks and gradients are better stored as vector regions and procedural fills; imported artwork is
a decal resampled via the stable design atlas. Per-face schemes (Ptex: texture per face, BSD-3-style;
Mesh Colors: colours on vertices/edges/faces, no seams) solve seams offline but lack standard GPU
filtering in WebGL/WebGPU, so a conventional UV atlas with seam padding is the practical raster layer.[^ptex][^meshcolors][^gg-notes]
Substance 3D Painter's path tool (Bézier curves clicked on the model, editable stroke and brush,
symmetry, closed paths repeat seamlessly) is the closest UX precedent.[^painter][^gg-notes]

[^schmidt-2006]: Schmidt et al. 2006.
[^g3sharp]: geometry3Sharp.
[^vhm]: Vector Heat Method.
[^ahm]: Affine Heat Method.
[^gc-vhm]: geometry-central vector heat method.
[^gc-geodesic]: geometry-central geodesic distance.
[^ilogmap]: iLogMap preprint.
[^stripes]: Stripe Patterns on Surfaces.
[^ptex]: Ptex.
[^meshcolors]: Mesh Colors.
[^painter]: CG Channel on Substance 3D Painter 9.0.
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
