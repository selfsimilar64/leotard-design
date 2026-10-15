---
type: Technique
title: Stone distribution algorithms
description: "Every stone brush is a curve or region on the surface, a sampler (arc-length, hex or square lattice, Poisson disk, Fermat spiral, contour-parallel) and a collision pass; formulas, defaults and non-destructive generator design."
tags: [geometry, technique, stones, sampling, poisson-disk, hex-packing, spiral]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: bridson
    resource: https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph07-poissondisk.pdf
    title: "Bridson, Fast Poisson Disk Sampling in Arbitrary Dimensions, SIGGRAPH 2007"
  - id: gc-sampling
    resource: https://geometry-central.net/surface/algorithms/surface_sampling/
    title: geometry-central surface sampling (PoissonDiskSampler)
    author: org:geometry-central
  - id: yuksel
    resource: http://www.cemyuksel.com/research/sampleelimination/
    title: "Yuksel, Sample Elimination for Generating Poisson Disk Sample Sets, CGF 34(2), 2015"
  - id: corsini
    resource: http://vcg.isti.cnr.it/publication/2012/CCS12/
    title: "Corsini et al., Efficient and Flexible Sampling with Blue Noise Properties of Triangular Meshes, TVCG 2012"
  - id: blender-distribute
    resource: https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/point/distribute_points_on_faces.html
    title: Blender manual, Distribute Points on Faces
    author: org:blender
  - id: houdini-scatter
    resource: https://www.sidefx.com/docs/houdini/nodes/sop/scatter.html
    title: Houdini Scatter SOP
    author: org:sidefx
  - id: circle-packing
    resource: https://en.wikipedia.org/wiki/Circle_packing
    title: "Wikipedia, Circle packing"
    author: org:wikipedia
  - id: fermat
    resource: https://en.wikipedia.org/wiki/Fermat%27s_spiral
    title: "Wikipedia, Fermat's spiral (Vogel 1979)"
    author: org:wikipedia
  - id: schiftner
    resource: https://www.geometrie.tugraz.at/wallner/packing.pdf
    title: "Schiftner et al., Packing circles and spheres on surfaces, c. 2009"
  - id: instant-meshes
    resource: https://igl.ethz.ch/projects/instant-meshes/
    title: "Jakob et al., Instant Field-Aligned Meshes, SIGGRAPH Asia 2015"
  - id: gcvt
    resource: https://geometry-central.net/surface/algorithms/geodesic_voronoi_tessellations/
    title: geometry-central geodesic centroidal Voronoi tessellation
    author: org:geometry-central
  - id: stripes
    resource: https://www.cs.cmu.edu/~kmcrane/Projects/StripePatterns/
    title: "Knöppel et al., Stripe Patterns on Surfaces, 2015"
  - id: painter
    resource: https://www.cgchannel.com/2023/06/adobe-releases-substance-3d-painter-9-0/
    title: "CG Channel, Substance 3D Painter 9.0"
    author: org:cg-channel
  - id: jewelcraft
    resource: https://github.com/mrachinskiy/jewelcraft
    title: JewelCraft (Blender add-on, GPL-3.0)
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror), sections 6 and 10"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Every brush reduces to three steps: (1) a curve or region on the surface, (2) a sampler — 1D arc-length,
a 2D lattice or blue-noise set in a local parameterisation — and (3) collision culling plus optional
relaxation.** All building blocks are published and cheap. Store the stroke and parameters, derive stones
(non-destructive), with an explicit "expand to stones" command for hand finishing.[^gg-notes]
How jewellery pavé tools or rhinestone-template packages pack stones could not be verified.

# Building blocks (sourced)

| Block | Key facts |
|---|---|
| Bridson Poisson disk[^bridson] | grid cell r/√n (≤ 1 sample per cell); active list; up to k (typically 30) candidates in the annulus r–2r; accept if > r from all; O(N) |
| geometry-central `PoissonDiskSampler`[^gc-sampling] | Bridson on surfaces: `minDist`, `kCandidates` (30), `pointsToAvoid` + `minDistAvoidance`, 3D-ball or geodesic-ball avoidance; spacing in 3D distance (large radii can suppress samples across thin parts); `SurfacePoint` output; manifold only |
| Sample elimination (Yuksel 2015)[^yuksel] | weighted elimination from an oversampled set to a target count; no radius; any domain incl. surfaces; progressive/adaptive ordering |
| Blue-noise mesh sampling (Corsini et al. 2012)[^corsini] | surface blue noise |
| Blender Distribute Points on Faces[^blender-distribute] | Random or Poisson Disk (Distance Min, Density Max × density attribute); transfers attributes incl. UVs; outputs normal and rotation |
| Houdini Scatter[^houdini-scatter] | density attributes, exact counts, relaxation toward blue noise (tangent-plane repel then re-project), max relax radius, per-primitive seeds for stability, texture-space mode, persistent ids |
| Hex packing[^circle-packing] | densest equal-circle packing π/(2√3) ≈ 0.9069; two sizes cannot beat it when radius ratio > 0.742 |
| Vogel phyllotaxis[^fermat] | r = c·√n, θ = n·137.508° (golden angle) |
| Circle-packing meshes[^schiftner] | hexagon-like packings on freeform surfaces by optimisation |
| Instant Field-Aligned Meshes[^instant-meshes] | orientation then position field → near-isotropic lattice aligned to strokes; < 1 s on hundreds of thousands of faces |
| Stripe patterns; geodesic CVT[^stripes][^gcvt] | evenly spaced aligned stripes; Lloyd-type relaxation (`nSites`, 50 iterations default) |
| Non-destructive precedent[^painter][^jewelcraft] | Substance Painter path tool keeps curve and brush editable; JewelCraft manages gem distances and a colour-coded gem map |

All via the research note.[^gg-notes]

# Recommended algorithms **[INFERRED]**

Derived stones are a pure function of stroke + parameters + seed.[^gg-notes]

- **Along a curve:** cumulative arc-length table of the surface polyline; emit at s₀ + k·d. Closed
  curves: d′ = L / round(L/d). Open curves: "fit to ends" or "fixed pitch" (remainder at the end).
  Orientation = curve tangent projected to the surface.
- **Thick strokes:** rows are offset curves at ±k·h, each re-sampled by its own arc length (a straight
  lattice mapped onto the curve bunches on the inside of bends). Square: h = d, same phase. Hex:
  h = d·√3/2, alternate rows shifted d/2. Cull where offsets self-intersect at tight bends.
- **Spirals:** Archimedean r = b·θ, pitch 2πb = row spacing, steps Δθ ≈ d / (b·√(θ²+1)) (large θ:
  θₖ ≈ √(2kd/b)). Phyllotaxis with c ≈ 0.525·d matches a hex lattice's areal density
  (π·c² = (√3/2)·d²); its minimum neighbour distance is a little below d, so add a safety factor or a
  collision pass. Map to the surface with the [exponential map](/engineering/geometry/local-parameterisation-for-stamps.md).
- **Region fills:** (a) lattice in a 2D parameterisation of the region, rotated to a user direction,
  culled against the boundary inset by stone radius + edge clearance, lightly relaxed — hex count
  ≈ 2/(√3·d²) per unit area; (b) contour-parallel: iso-lines of geodesic distance to the boundary at
  d/2 + k·h, each arc-length sampled; (c) scatter: Bridson on the surface, weighted elimination for
  gradients; (d) field-aligned for large curved regions (stripes / Instant-Meshes position field).
- **Gradation:** drive density or size by a scalar field; quantise to available stone sizes; pack
  largest-first with per-size radii.
- **Overlap:** spatial hash, cell ≈ largest diameter; 3D distance is adequate since stone radii are tiny
  relative to limb thickness; check worn and relaxed states ([two-state checks](/engineering/geometry/two-state-collision-checks.md)).
- **Relaxation:** a few tangent-plane repel + re-project iterations; geodesic CVT for "tidy up" only.
- **Snapping, symmetry:** snap to the nearest design curve via a BVH over curve segments (optional
  offset); mirror through the canonical symmetry map.
- **Non-destructive vs baked:** generators are primary document objects; sparse per-stone overrides
  keyed by a stable index (row, ordinal); "expand to stones" bakes. Seed stability (counts reshuffle
  unless seeds are pinned) is the main pitfall.
- **Performance:** generate in a worker/WASM, append to instance buffers with partial uploads, cap
  emission per frame, defer relaxation and both-state checks to stroke end.

Domain-side constraints (keep-outs, machine limits): [crystal keep-outs](/domain/construction/rule-crystal-keep-outs.md);
stone sizes: [/domain/embellishments/](/domain/embellishments/about.md).

[^bridson]: Bridson 2007.
[^gc-sampling]: geometry-central surface sampling.
[^yuksel]: Yuksel 2015.
[^corsini]: Corsini et al. 2012.
[^blender-distribute]: Blender, Distribute Points on Faces.
[^houdini-scatter]: Houdini Scatter SOP.
[^circle-packing]: Wikipedia, Circle packing.
[^fermat]: Wikipedia, Fermat's spiral.
[^schiftner]: Schiftner et al.
[^instant-meshes]: Instant Field-Aligned Meshes.
[^gcvt]: geometry-central GCVT.
[^stripes]: Stripe Patterns on Surfaces.
[^painter]: CG Channel on Substance 3D Painter.
[^jewelcraft]: JewelCraft.
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
