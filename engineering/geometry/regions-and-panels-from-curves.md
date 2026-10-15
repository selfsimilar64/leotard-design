---
type: Technique
title: Regions and panels from curves
description: "Turn typed design curves into colour regions and pattern panels by inserting them into a working copy of the body mesh and labelling the cells (explicit arrangement), with winding numbers or signed distance as fallbacks; cut-outs, straps and edges are region and line types."
tags: [geometry, technique, panels, regions, cutting, garment-model]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: boolsurf
    resource: https://research.adobe.com/publication/boolsurf-boolean-operations-on-surfaces
    title: "Riso et al., BoolSurf: Boolean Operations on Surfaces, ACM TOG 41(6), 2022"
  - id: swn
    resource: https://github.com/nzfeng/SWN
    title: "Feng, Gillespie, Crane, Winding Numbers on Discrete Surfaces, ACM TOG 42(4), 2023 (code)"
  - id: shm
    resource: https://geometry-central.net/surface/algorithms/signed_heat_method/
    title: "geometry-central signed heat method (Feng & Crane, ACM TOG 43(4), 2024)"
    author: org:geometry-central
  - id: surfacepoint
    resource: https://geometry-central.net/surface/utilities/surface_point/
    title: geometry-central SurfacePoint
    author: org:geometry-central
  - id: intrinsic
    resource: https://geometry-central.net/surface/intrinsic_triangulations/common_subdivision/
    title: geometry-central intrinsic triangulations and common subdivision
    author: org:geometry-central
  - id: cgal-seam
    resource: https://doc.cgal.org/latest/Surface_mesh_parameterization/index.html
    title: CGAL surface mesh parameterization (Seam_mesh)
    author: org:cgal
  - id: g3sharp
    resource: https://github.com/gradientspace/geometry3Sharp
    title: gradientspace geometry3Sharp
    author: org:gradientspace
  - id: vsc
    resource: https://ri.cmu.edu/publications/variational-surface-cutting
    title: "Sharp & Crane, Variational Surface Cutting, ACM TOG 2018"
  - id: garmentcode
    resource: https://github.com/maria-korosteleva/GarmentCode
    title: "GarmentCode (Korosteleva & Sorkine-Hornung, SIGGRAPH Asia 2023)"
  - id: freesewing
    resource: https://codeberg.org/freesewing/freesewing
    title: FreeSewing (Codeberg)
    author: org:freesewing
  - id: chatgarment
    resource: https://arxiv.org/html/2412.17811v3
    title: "ChatGarment, CVPR 2025"
  - id: d2gc
    resource: https://cvpr.thecvf.com/virtual/2025/poster/33416
    title: "Design2GarmentCode, CVPR 2025"
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror), sections 2 and 3"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Panels are the regions bounded by seam and edge curves; obtain them by explicit arrangement — insert
every curve polyline into a working copy of the body mesh, flood-fill the faces between curves, label
the cells — and keep that cut mesh as a derived cache so the curves stay the editable truth.** Colour
regions and pattern pieces are two different partitions of the same surface, because printed colour
boundaries need no seam.[^gg-notes] Winding numbers or signed geodesic distance are fallbacks for
almost-closed regions.

# Line and region types **[INFERRED]**

| Type | Geometry | Becomes |
|---|---|---|
| Seam | closed or boundary-to-boundary curve | pattern-piece boundary |
| Edge | curve bounding a removed region | opening finished with elastic/binding |
| Print line | curve inside a piece | colour boundary only |
| Strap centreline + width | curve + width parameter | band region; a separate ribbon where it leaves the body |
| Removed region (cut-out, outside the neckline or leg line) | region flagged "removed" | its boundary curves are edges |
| Panel | cell of the seam/edge arrangement | pattern piece with a fabric assignment |
| Colour region | cell of the print-line arrangement | print or fabric colour |

Construction meaning of each type: [three ways to make a design line](/domain/construction/design-line-realisations.md).[^gg-notes]

# Methods

| Method | Use | Notes |
|---|---|---|
| Explicit insertion + flood fill | default | geometry3Sharp has `MeshInsertUVPolyCurve`, `MeshInsertPolygon`, `MeshInsertProjectedPolygon`, `MeshFacesFromLoop`, `MeshTrimLoop` and constrained remeshers (C#, Boost; long hiatus, .NET 8 update in progress)[^g3sharp] |
| BoolSurf[^boolsurf] | boolean set operations on shapes drawn on surfaces of any genus (including open boundaries) by computing and labelling the arrangement; flags inconsistent arrangements; interactive to 100k segments on 1M-triangle meshes | code/licence unconfirmed |
| Intrinsic triangulations / common subdivision[^intrinsic] | exact transfer between input mesh and a refined one; integer coordinates are robust (signposts are floating-point sensitive) | geometry-central |
| `SurfacePoint`[^surfacepoint] | a vertex, an edge + t, or a face + barycentrics, with interpolation helpers | the address type for curve vertices |
| CGAL `Seam_mesh`[^cgal-seam] | marks a cut graph and duplicates seam vertices virtually (UVs per halfedge) so a mesh is parameterised as a disk without physically cutting | GPL/commercial |
| Winding numbers on surfaces[^swn] | which curves bound regions despite gaps or self-intersections; integer labels and a completed curve; Poisson solve, or a sparse LP on non-trivial topology | MIT code but main branch needs commercial Gurobi (OR-Tools branch exists) |
| Signed heat method[^shm] | signed distance to oriented, possibly broken curves; level-set constraints; lazy shared precomputation | geometry-central `SignedHeatSolver` |
| Variational surface cutting[^vsc] | optimised cut curves not restricted to mesh edges | research |

All via the research note.[^gg-notes] A leotard surface with neck, arm and leg openings is not simply
connected, which is why the winding-number method would need its LP path there.[^gg-notes]

# Straps and cut-outs **[INFERRED]**

- A strap band is the set of points with |signed geodesic distance to its centreline| < w/2 (signed
  heat / fast marching), or an offset in a stroke parameterisation; where it leaves the body it becomes
  a separate ribbon mesh between anchor points.
- A cut-out is a removed region whose boundary is an edge line; its manufacturability checks are in
  [openings and straps](/domain/construction/rule-openings-and-straps.md).

# Document-model lesson from parametric pattern programs

GarmentCode (MIT; `pygarment` with Edge, Panel, Component, Interface types; JSON patterns; GUI
configurator; Warp-based draping; pygarment v2.0.0, 30 Aug 2024) and FreeSewing (MIT JavaScript; moved
to Codeberg, release 4.10.2 on 2026-09-13; "Onyx" covers leotards and unitards from ~20 measurements)
show that sewing patterns work well as programs with named components, interfaces and measurement
parameters serialised to JSON. ChatGarment and Design2GarmentCode (CVPR 2025) generate GarmentCode from
images, text and sketches.[^garmentcode][^freesewing][^chatgarment][^d2gc][^gg-notes]
**[INFERRED]** For this product: leotard = parametric base block (neckline depth, leg-line height, sleeve
length, back style) + design curves + embellishment generators, all re-evaluable per size.

[^boolsurf]: BoolSurf.
[^swn]: Surface winding numbers.
[^shm]: Signed heat method.
[^surfacepoint]: geometry-central SurfacePoint.
[^intrinsic]: Intrinsic triangulations.
[^cgal-seam]: CGAL Seam_mesh.
[^g3sharp]: geometry3Sharp.
[^vsc]: Variational Surface Cutting.
[^garmentcode]: GarmentCode.
[^freesewing]: FreeSewing.
[^chatgarment]: ChatGarment.
[^d2gc]: Design2GarmentCode.
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
