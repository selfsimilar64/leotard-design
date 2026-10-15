---
type: Technique
title: Curves on surfaces
description: "Store design lines as control points on the body surface (face + barycentric) and evaluate them as geodesic or subdivision splines (flip geodesics, b/Surf, Mancinelli et al.); evaluate once on the reference body and carry to other sizes by barycentrics."
tags: [geometry, technique, curves, geodesic, splines, design-lines]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: flipout
    resource: https://par.nsf.gov/biblio/10216889
    title: "Sharp & Crane, You Can Find Geodesic Paths in Triangle Meshes by Just Flipping Edges, ACM TOG 39(6), 2020"
  - id: gc-flip
    resource: https://geometry-central.net/surface/algorithms/flip_geodesics/
    title: geometry-central flip geodesics
    author: org:geometry-central
  - id: ue-flip
    resource: https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/DynamicMesh/FDeformableEdgePath
    title: Unreal Engine FDeformableEdgePath (UE 5.8 docs)
    author: org:epic-games
  - id: bsurf
    resource: https://arxiv.org/abs/2102.05921
    title: "Mancinelli, Nazzaro, Pellacini, Puppo, b/Surf: Interactive Bézier Splines on Surface Meshes, IEEE TVCG 29(7), 2022"
  - id: straightedge
    resource: https://iris.unige.it/handle/11567/1087411
    title: "Mancinelli & Puppo, Vector Graphics on Surfaces Using Straightedge and Compass Constructions, C&G 2022"
  - id: stroke-param
    resource: https://doi.org/10.1111/cgf.12045
    title: "Schmidt, Stroke Parameterization, CGF 32(2), 2013 (bibliographic only)"
  - id: gc-geodesic
    resource: https://geometry-central.net/surface/algorithms/geodesic_distance/
    title: geometry-central geodesic distance
    author: org:geometry-central
  - id: heat
    resource: https://www.cs.cmu.edu/~kmcrane/Projects/HeatMethod/
    title: "Crane, Weischedel, Wardetzky, The Heat Method, CACM 60(11), 2017"
  - id: survey
    resource: https://arxiv.org/abs/2007.10430
    title: "Crane, Livesu, Puppo, Qin, A Survey of Algorithms for Geodesic Paths and Distances, 2020"
  - id: krita
    resource: https://docs.krita.org/en/reference_manual/tools/freehand_brush.html
    title: Krita manual, freehand brush (stabilisers)
    author: org:krita
  - id: one-euro
    resource: https://gery.casiez.net/1euro/
    title: "Casiez, Roussel, Vogel, 1€ filter, CHI 2012"
  - id: report
    resource: /references/research/research-report.md
    title: "Research report (in-bundle mirror)"
    author: claude-code/claude-opus-5-5
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror), sections 3 and 6"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Store each design line as ordered control points on the surface (canonical face id + barycentric
coordinates) and evaluate it to a polyline with a vertex on every mesh edge it crosses, using
piecewise geodesics (edge-flip / FlipOut) first and b/Surf-style Bézier subdivision for smooth pen-tool
curves.** Both are documented as interactive on meshes with millions of triangles, orders of magnitude
beyond a ~13k–100k-vertex body.[^flipout][^bsurf][^gg-notes] This is the representation a
[professional designer](/product/personas/professional-designer.md) needs to draw necklines, panel
lines and strap paths that wrap continuously from front to back.

# Methods

| Method | What it gives | Status |
|---|---|---|
| FlipOut (Sharp & Crane 2020)[^flipout] | Straightens an edge path into a locally shortest geodesic in the same isotopy class, no self-crossings, finite termination, a few ms on million-triangle meshes; closed loops, networks, geodesic Bézier curves | geometry-central `FlipEdgeNetwork`: Dijkstra init, piecewise paths through marked vertices, loops, networks, `iterativeShorten()`, `bezierSubdivide(nRounds)`, `delaunayRefine()`, output as `SurfacePoint`s or 3D polylines; manifold triangle mesh required; MIT demo[^gc-flip]. Unreal ships it as `FDeformableEdgePath` (no closed or multiple paths)[^ue-flip] |
| b/Surf (Mancinelli et al. 2022)[^bsurf] | Bézier splines on meshes: direct de Casteljau/Bernstein generalisations are fragile for large control polygons; subdivision schemes (recursive de Casteljau bisection, open-uniform Lane–Riesenfeld) are robust; tracing, point evaluation and insertion, ordinary 2D editing, mapping SVG drawings onto meshes; interactive on million-triangle meshes; tested on all watertight manifold Thingi10k models | code location and licence unconfirmed (builds on Yocto/GL, MIT, whose current README no longer lists a geodesic module) |
| Straightedge-and-compass on surfaces (Mancinelli & Puppo 2022)[^straightedge] | Circles, polygons etc. under the geodesic metric; not all Euclidean properties can be preserved at once | research |
| Stroke parameterisation (Schmidt 2013)[^stroke-param] | Band around a stroke (recalled, not read) | bibliographic only **[UNVERIFIED]** |
| Geodesic distance: MMP exact, Fast Marching (signed distance to curves), Heat Method (fastest for repeated solves after prefactorisation)[^gc-geodesic][^heat] | Distances, offsets, signed fields | geometry-central; survey[^survey] |

All via the research note.[^gg-notes] The report summarises this as: published methods trace smooth
pen-tool curves across a 3D surface interactively.[^report]

# Recommended curve model **[INFERRED]**

- **Evaluate on one reference body, transfer by barycentrics.** Geodesics differ slightly per size and
  pose; re-solving per size would make region topology size-dependent. Evaluate once on the reference
  shape and carry the polyline through the shared topology; allow optional per-size re-straightening
  where a truly shortest path matters (straps).
- **Corner rounding** on piecewise geodesics; tangent handles or a subdivision rule for smooth curves.
- **Mirror symmetry is topological:** precompute the left↔right map of the canonical mesh (face
  permutation + barycentric swap); stays exact in asymmetric poses; curves crossing the centre line need
  a "weld at mid-line" rule.
- **UV-space curves** let ordinary 2D Bézier tools, polygon booleans and rasterisation work unchanged,
  but straight UV lines are not geodesics, widths vary with parametric stretch, and curves crossing an
  atlas seam must be split. Use a stable front/back "technical flat" atlas as a view and input device
  that converts to surface points, not as storage.
- **Freehand input:** stabilise with a 1€ filter (speed-adaptive low-pass, two parameters) or a
  Krita-style trailing average, then fit the cleaned samples to an editable spline.[^one-euro][^krita][^gg-notes]

# Gaps

No quantitative comparison of surface-curve methods at body-mesh scale in WASM; libigl, CGAL, MeshLib
path functions and Unreal's intrinsic triangulation were not verified; how garment tools handle curves
crossing UV seams is undocumented.[^gg-notes]

[^flipout]: Sharp & Crane 2020.
[^gc-flip]: geometry-central flip geodesics.
[^ue-flip]: Unreal FDeformableEdgePath.
[^bsurf]: b/Surf.
[^straightedge]: Mancinelli & Puppo 2022.
[^stroke-param]: Schmidt 2013.
[^gc-geodesic]: geometry-central geodesic distance.
[^heat]: The Heat Method.
[^survey]: Geodesic survey.
[^krita]: Krita manual.
[^one-euro]: 1€ filter.
[^report]: Research report (in-bundle mirror).
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
