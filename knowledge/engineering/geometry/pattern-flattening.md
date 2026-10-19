---
type: Technique
title: Pattern flattening
description: "Flattening a leotard panel to a pattern piece is a solved, fast computation: cut to a disk, conformal initialisation (LSCM or BFF), isometric refinement (ARAP or SLIM), then stretch compensation, seam-length reconciliation, allowance offset and markings; keep a stable design atlas separate from the production atlas."
tags: [geometry, technique, flattening, parameterisation, pattern, export]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: lscm
    resource: https://doi.org/10.1145/566654.566590
    title: "Lévy et al., Least squares conformal maps, ACM TOG 21(3), 2002"
  - id: abf
    resource: https://doi.org/10.1145/1061347.1061354
    title: "Sheffer et al., ABF++, ACM TOG 24(2), 2005"
  - id: arap
    resource: https://doi.org/10.1111/j.1467-8659.2008.01290.x
    title: "Liu et al., A Local/Global Approach to Mesh Parameterization, CGF 27(5), 2008"
  - id: smith-schaefer
    resource: https://doi.org/10.1145/2766947
    title: "Smith & Schaefer, Bijective parameterization with free boundaries, ACM TOG 34(4), 2015"
  - id: slim
    resource: https://igl.ethz.ch/projects/slim/
    title: "Rabinovich et al., SLIM, ACM TOG 2017"
  - id: blender-slim
    resource: https://docs.blender.org/manual/en/4.3/modeling/meshes/editing/uv.html
    title: Blender 4.3 manual, UV operators (Minimum Stretch / SLIM)
    author: org:blender
  - id: bff
    resource: https://github.com/GeometryCollective/boundary-first-flattening
    title: "Sawhney & Crane, Boundary First Flattening, ACM TOG 37(1), 2017 (MIT app)"
  - id: gc-param
    resource: https://geometry-central.net/surface/algorithms/parameterization/
    title: geometry-central parameterization
    author: org:geometry-central
  - id: cgal-param
    resource: https://doc.cgal.org/latest/Surface_mesh_parameterization/index.html
    title: CGAL surface mesh parameterization
    author: org:cgal
  - id: autocuts
    resource: https://doi.org/10.1145/3130800.3130845
    title: "Poranne et al., AutoCuts, ACM TOG 36(6), 2017"
  - id: optcuts
    resource: https://www.cs.ubc.ca/labs/imager/tr/2018/OptCuts/
    title: "Li et al., OptCuts, ACM TOG 37(6), 2018"
  - id: uvat
    resource: https://perso.liris.cnrs.fr/david.coeurjolly/publication/uv-at/
    title: "UV-AT, Weill-Duflos et al., 2023"
  - id: pietroni
    resource: https://arxiv.org/abs/2202.10272
    title: "Pietroni et al., Computational Pattern Making from 3D Garment Models, 2022"
  - id: clo-flatten
    resource: https://support.clo3d.com/hc/en-us/articles/115008890627-Flatten
    title: CLO Help Center, Flatten
    author: org:clo
  - id: clo-offset
    resource: https://support.clo3d.com/hc/ja/community/posts/360039878693-Flatten-tool-offset
    title: "CLO community, Flatten tool offset (3.3 mm cube test)"
    author: org:clo
  - id: clipper2
    resource: https://github.com/AngusJohnson/Clipper2
    title: Clipper2
  - id: browzwear
    resource: https://browzwear.com/products/v-stitcher
    title: Browzwear VStitcher
    author: org:browzwear
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror), sections 4 and 9"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Flattening a leotard panel is a solved, fast computation — cut to a disk, initialise with a linear
conformal map (LSCM or Boundary First Flattening), refine with an isometric energy (ARAP or SLIM) — and
it is interactive at garment-piece scale.** What generic geometry processing does not solve is the
stretch-fabric part (negative ease), covered in [stretch compensation](/engineering/geometry/stretch-compensation.md).
No published accuracy figures exist for leotard-class patterns.[^gg-notes]

# Methods

| Method | Property | Source |
|---|---|---|
| LSCM | linear conformal, one sparse least-squares solve; free boundary; ≥ 2 pinned vertices; no bijectivity guarantee | [^lscm][^cgal-param] |
| ABF++ | angle-based flattening, fast and robust | [^abf] |
| ARAP | local/global isometric; λ balances angle vs shape; flips possible | [^arap][^cgal-param] |
| SLIM | optimises flip-preventing energies (symmetric Dirichlet, from Smith & Schaefer) by proxy problems extending ARAP; about 40 iterations each a sparse solve; starts locally injective and guarantees no inverted elements; scales to millions of faces; libigl `igl/slim.h`. Blender 4.3 "Minimum Stretch" unwrap uses it (5 iterations already beat older methods; little change beyond ~50; vertex group can weight relative area) | [^slim][^smith-schaefer][^blender-slim] |
| Boundary First Flattening | linear conformal with direct control of boundary lengths *or* corner angles; automatic minimal-area-distortion mode; cones; "interactive editing of meshes with millions of triangles"; MIT app v1.6 (May 2023, SuiteSparse); also in geometry-central (disk topology, intrinsic geometry) | [^bff][^gc-param] |
| CGAL menu | fixed-border Tutte, Floater mean-value, discrete conformal, discrete authalic (bijective with convex border), iterative authalic, LSCM, ARAP, orbifold Tutte | [^cgal-param] |
| Cut optimisation | AutoCuts (distortion and cuts jointly, best with a user in the loop); OptCuts (minimises seam length under a distortion bound, globally bijective, honours seam preferences); later work reports joint methods slow and prone to long-cut local minima | [^autocuts][^optcuts][^uvat] |
| Garment-specific | Pietroni et al. 2022: woven-fabric anisotropic distortion, bounded stress, seam symmetry, darts, grain | [^pietroni] |

All via the research note.[^gg-notes] For a leotard the cuts are not optimised: they are the designer's
seams. Cut optimisation is relevant only as a suggestion tool.

Commercial reference: CLO Flatten yields zero-ease patterns, lets a drawn line flatten as a straight
edge (e.g. centre front/back); one user measured about 3.3 mm discrepancy between a source cube face and
its flattened pattern.[^clo-flatten][^clo-offset][^gg-notes]

# Recommended pipeline per pattern piece **[INFERRED]**

All steps sub-second for 10³–10⁴-triangle pieces, by extrapolation from the cited scalability claims:[^gg-notes]

1. Take the region bounded by seam and edge lines from the cut mesh
   ([regions and panels](/engineering/geometry/regions-and-panels-from-curves.md)).
2. Conformal initialisation — LSCM or BFF.
3. Isometric refinement — ARAP, or SLIM when flip-freedom must be guaranteed.
4. Stretch compensation ([stretch compensation](/engineering/geometry/stretch-compensation.md)).
5. Seam-length reconciliation between mating edges (stretch factors differ per panel fabric).
6. Seam allowance by 2D polygon offset (Clipper2: Boost licence; WASM, TypeScript and Rust ports)[^clipper2],
   notches and grain line ([pattern markings](/domain/construction/pattern-markings.md)).
7. Export ([factory deliverables](/domain/construction/factory-deliverables.md)).

Grain alignment: rotate each flattened piece so the fabric's greatest-stretch axis (around the body) is
horizontal; the body's circumferential tangent field defines it.

# Two parameterisations, kept separate **[INFERRED]**

- **Stable design atlas:** fixed for the canonical body topology, independent of any design; used for
  raster artwork storage, the 2D technical-flat view and anchor fallbacks.
- **Production atlas:** the flattened, stretch-compensated pattern pieces, regenerated whenever seams change.

Artwork moves between them by resampling through the 3D surface.[^gg-notes]

# Alternative route: map onto the factory's graded blocks **[INFERRED]**

Instead of inventing piece shapes, parameterise each body region so its boundary matches a factory
block's outline (BFF's boundary-length/angle control, or a fixed-boundary map), then resample artwork and
stone positions into the block's coordinates. This keeps proven fit and grading with the factory and may
be the more realistic first integration.[^gg-notes]

# Views

Professional fashion CAD is dual-view (2D pattern window + 3D window in sync: CLO, Browzwear); research
pushes toward editing in 3D with patterns derived automatically. **[INFERRED]** Recommended: 3D-primary
editing with a synchronised technical flat (front/back, from the design atlas, fully editable) and a
pattern-piece view mainly for inspection and production annotations. All views write the same
surface-anchored records, so they cannot drift.[^browzwear][^clo-flatten][^gg-notes]

# Gaps

No mm or % accuracy for 3D-to-2D flattening of stretch garments; seam-allowance corner conventions and
notch placement for stretch sewing not researched.[^gg-notes]

[^lscm]: LSCM, Lévy et al. 2002.
[^abf]: ABF++, Sheffer et al. 2005.
[^arap]: ARAP parameterisation, Liu et al. 2008.
[^smith-schaefer]: Smith & Schaefer 2015.
[^slim]: SLIM project page.
[^blender-slim]: Blender 4.3 manual.
[^bff]: Boundary First Flattening.
[^gc-param]: geometry-central parameterization.
[^cgal-param]: CGAL surface mesh parameterization.
[^autocuts]: AutoCuts.
[^optcuts]: OptCuts.
[^uvat]: UV-AT.
[^pietroni]: Pietroni et al. 2022.
[^clo-flatten]: CLO Help Center, Flatten.
[^clo-offset]: CLO community, Flatten tool offset.
[^clipper2]: Clipper2.
[^browzwear]: Browzwear VStitcher.
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
