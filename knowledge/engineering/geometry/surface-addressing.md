---
type: Technique
title: Surface addressing and picking
description: "Anchor every stone and curve point as canonical face id + barycentric coordinates (attribute interpolation, as in Houdini and Blender), with a stable-UV fallback address; pick the body by BVH or a face-id GPU pass, and stones by an ID buffer."
tags: [geometry, technique, anchors, barycentric, picking, stones]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: houdini-scatter
    resource: https://www.sidefx.com/docs/houdini/nodes/sop/scatter.html
    title: Houdini Scatter SOP
    author: org:sidefx
  - id: houdini-interp
    resource: https://www.sidefx.com/docs/houdini/nodes/sop/attribinterpolate.html
    title: Houdini Attribute Interpolate SOP
    author: org:sidefx
  - id: houdini-copy
    resource: https://www.sidefx.com/docs/houdini/nodes/sop/copytopoints.html
    title: Houdini Copy to Points SOP
    author: org:sidefx
  - id: blender-deform
    resource: https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/curve/operations/deform_curves_on_surface.html
    title: Blender manual, Deform Curves on Surface
    author: org:blender
  - id: blender-uvsample
    resource: https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/mesh/sample/sample_uv_surface.html
    title: Blender manual, Sample UV Surface
    author: org:blender
  - id: surfacepoint
    resource: https://geometry-central.net/surface/utilities/surface_point/
    title: geometry-central SurfacePoint
    author: org:geometry-central
  - id: usd
    resource: https://openusd.org/release/api/class_usd_geom_point_instancer.html
    title: OpenUSD UsdGeomPointInstancer
    author: org:openusd
  - id: bvh
    resource: https://github.com/gkjohnson/three-mesh-bvh
    title: three-mesh-bvh
  - id: webgl-picking
    resource: https://webglfundamentals.org/webgl/lessons/webgl-picking.html
    title: "WebGL Fundamentals, picking"
    author: org:webglfundamentals
  - id: teschner
    resource: https://matthias-research.github.io/pages/publications/publications.html
    title: "Teschner et al., Optimized Spatial Hashing for Collision Detection of Deformable Objects, VMV 2003"
  - id: body-js
    resource: ../../../poc-threejs/src/body.js
    title: "poc-threejs/src/body.js (point, projectFront, sample)"
    author: claude-code/claude-opus-5-5
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror), sections 7 and 8"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**The production-proven anchor is "source face + parametric coordinates", re-evaluated on the deformed
mesh (Houdini Scatter → Attribute Interpolate; Blender curves-on-surface), and its documented weakness is
that it works only while topology does not change.** So anchor to the canonical body mesh, which is never
re-cut, and store a second, topology-independent address (stable-atlas UV or rest position) from day one.[^houdini-scatter][^houdini-interp][^gg-notes]
The POC already does the first half: its surface points are `{ f, b0, b1, b2 }` found on the reference
body and evaluated on whichever body is shown.[^body-js]

# Evidence

- Houdini Scatter records source primitive and parametric (u,v,w) per point; Attribute Interpolate moves
  points onto the deforming surface; "this works only if the topology does not change". Texture-space
  scattering survives cuts, subdivision or higher-resolution replacement "provided texture coordinates
  correspond".[^houdini-scatter][^houdini-interp]
- Blender attaches hair curves with a per-curve `surface_uv_coordinate` and uses `rest_position` for
  tangents so rotation follows the surface; subdivision with UV smoothing can break the attachment;
  Sample UV Surface needs non-overlapping UVs.[^blender-deform][^blender-uvsample]
- geometry-central `SurfacePoint` (vertex / edge + t / face + barycentrics) is the general address.[^surfacepoint]
- Houdini Copy to Points derives each instance transform from point attributes (`pscale`, orientation);
  USD PointInstancer carries 64-bit `ids` plus `inactiveIds`/`invisibleIds`, 32 bytes per instance vs 64
  for a 4×4 matrix.[^houdini-copy][^usd]

All via the research note.[^gg-notes]

# Recommended anchor record **[INFERRED]**

| Field | Purpose |
|---|---|
| canonical face id + barycentric (u, v) | primary address |
| in-plane rotation relative to a canonical tangent field | essential for navettes, pears, baguettes, sequins |
| stone type/size id | |
| stable instance id | identity across edits, undo, collaboration |
| stable-atlas UV (redundant) | migration if the canonical mesh changes |

World transform = barycentric position on the current body, interpolated normal, tangent from the
canonical field rotated by the stored angle — computable in a vertex shader or tight CPU/WASM loop for
100k+ stones. About 24 bytes per stone, ~2.4 MB per 100k.[^gg-notes]

- **Re-cutting never touches anchors** when stones reference the canonical body and the cut garment mesh
  is a derived cache. After a line edit, re-test affected anchors' region membership and flag stones now
  in a cut-out, across a seam allowance or under an elastic edge.
- **If the canonical mesh changes** (new body model version, subdivision level, avatar), migrate by
  stable UV or closest-point projection on the rest shape — a batch job, not data loss.

# Picking **[INFERRED]** from cited capabilities

| Need | Mechanism |
|---|---|
| Brush centre on the body | BVH raycast on the current posed mesh, refit after pose/size change; three-mesh-bvh (MIT) advertises 500 rays vs an 80k-polygon model at 60 fps, refit, `SkinnedMeshBVH`, worker builds, GPU traversal, WebGPU API[^bvh] |
| Address under cursor without a CPU BVH | GPU pass writing face id + barycentrics returns a ready-made anchor |
| Single stone | GPU ID buffer: unique ID as flat colour (32 bits RGBA ≈ 4 billion IDs, 0 = none), depth resolves occlusion, read back a small window for 3–5 mm stones; optimisation: render only a 1×1 frustum[^webgl-picking] |
| Box/lasso | read the ID target over the rectangle (visible only) or project centres on the CPU (select-through; 100k point-in-polygon tests are a few ms in WASM) |
| Brush footprint | uniform spatial hash (Teschner et al.) with cell ≈ largest stone; for large brushes on thin parts compare normals or use geodesic distance[^teschner] |

All via the research note.[^gg-notes]

# Gaps

Robustness of barycentric anchoring under extreme pose deformation (candy-wrapper shoulders) and GPU
ID-readback latency in WebGPU were not investigated.[^gg-notes]

[^houdini-scatter]: Houdini Scatter SOP.
[^houdini-interp]: Houdini Attribute Interpolate.
[^houdini-copy]: Houdini Copy to Points.
[^blender-deform]: Blender, Deform Curves on Surface.
[^blender-uvsample]: Blender, Sample UV Surface.
[^surfacepoint]: geometry-central SurfacePoint.
[^usd]: OpenUSD PointInstancer.
[^bvh]: three-mesh-bvh.
[^webgl-picking]: WebGL Fundamentals, picking.
[^teschner]: Teschner et al. 2003.
[^body-js]: poc-threejs/src/body.js in the project repository.
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
