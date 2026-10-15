---
type: Section
title: Garment geometry
description: "Geometry techniques for designing a leotard directly on the body and turning it into production pattern pieces: surface layer instead of cloth simulation, body models, curves and panels on surfaces, flattening with stretch compensation, surface addresses, stone distribution, collision checks, size transfer and library options."
tags: [geometry, engineering, technique]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror)"
    author: claude-code/claude-opus-5-5
---

How the software should represent a skin-tight garment and its decoration, distilled from the garment
geometry research note.[^gg-notes] The proof of concept implements a much simpler model (analytic
region fields on a shared-topology body; see [body and regions](/engineering/poc/body-and-regions.md));
these concepts describe what the professional tool needs.

**The architecture in one paragraph [INFERRED].** The body is a fixed-topology parametric mesh. Design
curves are stored as surface points on a canonical reference body and evaluated as geodesic or
subdivision splines; panels are the regions those curves bound, extracted from a derived cut mesh;
each panel is flattened (conformal init + isometric refinement) and scaled by per-fabric stretch
factors to give a production pattern piece. Stones are anchored by face + barycentric coordinates on
the canonical mesh and generated non-destructively from strokes. No cloth simulation sits in the
interactive loop.

Reading order:

1. [Garment as a layer on the body surface](/engineering/geometry/garment-as-surface-layer.md)
2. [Fabric bridging hollows](/engineering/geometry/fabric-bridging-hollows.md)
3. [Body models](/engineering/geometry/body-models.md)
4. [Curves on surfaces](/engineering/geometry/curves-on-surfaces.md)
5. [Regions and panels from curves](/engineering/geometry/regions-and-panels-from-curves.md)
6. [Pattern flattening](/engineering/geometry/pattern-flattening.md)
7. [Stretch compensation](/engineering/geometry/stretch-compensation.md)
8. [Surface addressing and picking](/engineering/geometry/surface-addressing.md)
9. [Local parameterisation for stamps](/engineering/geometry/local-parameterisation-for-stamps.md)
10. [Stone distribution algorithms](/engineering/geometry/stone-distribution-algorithms.md)
11. [Two-state collision checks](/engineering/geometry/two-state-collision-checks.md)
12. [Size and pose transfer](/engineering/geometry/size-and-pose-transfer.md)
13. [Geometry libraries and porting cost](/engineering/geometry/geometry-libraries.md)

The construction facts these techniques must satisfy are in [/domain/construction/](/domain/construction/about.md).

[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror), sources read 2026-10-13.
