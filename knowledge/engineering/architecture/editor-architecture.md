---
type: Architecture
title: Editor architecture for the designer tool
description: "Module layout and core algorithms for turning the POC into the designer tool: command-driven document, projected surface splines, explicit curve insertion into the canonical mesh, per-panel flattening for cloth-space UVs, swept rims and straps, generator-driven stones, and the frame budget."
tags: [architecture, editor, geometry, rendering, performance]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-18T18:10:00Z }
sources:
  - id: doc-model
    resource: /engineering/architecture/design-document-model.md
    title: Design document model
  - id: body-js
    resource: poc-threejs/src/body.js in the project folder
    title: POC body, lift solve, surface points, contour
  - id: fabric-js
    resource: poc-threejs/src/fabric.js in the project folder
    title: POC fabric shader
  - id: curves
    resource: /engineering/geometry/curves-on-surfaces.md
    title: Curves on surfaces
  - id: regions
    resource: /engineering/geometry/regions-and-panels-from-curves.md
    title: Regions and panels from curves
  - id: flatten
    resource: /engineering/geometry/pattern-flattening.md
    title: Pattern flattening
  - id: addressing
    resource: /engineering/geometry/surface-addressing.md
    title: Surface addressing and picking
  - id: bench
    resource: "measurement in the in-app browser pane, 2026-10-18: POC 'Showpiece' look 6.1 ms/frame, 16,148-stone pave 7.8 ms/frame at 1792x1344 on a GTX 1650 (document.hidden false)"
    title: POC frame cost benchmark
    author: claude-code/claude-opus-5-5
---

# Takeaway

**[INFERRED]** Keep the POC's renderer, bodies, lift solve and stone shader; replace its hard-coded
`regions()` with a **curve graph inserted into a working copy of the canonical mesh**, so every panel
becomes its own sub-mesh with exact boundaries and its own flattened (cloth-space) UVs. Exact
boundaries are what thin straps (5-10 mm), piping (2-3 mm) and stone rows hugging seams need; the
POC's per-vertex fields on ~6 mm triangles cannot draw them crisply.[^body-js] Cloth-space UVs are
what grain, nap, lace, prints and the flat pattern all need.[^fabric-js][^flatten]

# Modules (new `app/` alongside the frozen `poc-threejs/`)

| Module | Responsibility | Reuses |
|---|---|---|
| `doc/` | Schema, load/save, migrations, command bus, undo/redo, `app.exec` | new |
| `body/` | Mannequins, sizes, poses (skinning applied on the CPU per pose), skin display, landmarks, mirror map, BVH | `body.js` loading, lift, `projectFront` |
| `curves/` | Surface splines, constraints, snapping, shape modifiers, offsets | new |
| `garment/` | Curve insertion, cell labelling, panel meshes, flattening, rims, straps, bands | `contour`, `edgeLoops`, `trim.js` sweep |
| `materials/` | Fabric library, uber fabric material, prints, lace, mesh-over-skin, skin | `fabric.js` |
| `stones/` | Generators, stone library, instancing with dirty ranges, LOD, picking | `stones.js` shader, `stroke`, `scatter` |
| `render/` | Lighting rigs and photo studios, AO, shadows, glare presets, idle refinement, capture | `main.js` composer |
| `tools/` | One tool per interaction (draw curve, edit points, assign fabric, strap, stone brushes, trace) | new |
| `ui/` | Panels, palettes, outliner, history, 2D flat view, reference compare | new (replaces lil-gui) |
| `export/` | Flat pieces, printable PDF, stone map, bill of materials | new |

UI: a small component framework (Preact + signals) inside Vite, so the panel-heavy UI stays
manageable and packs into Tauri later; the 3D view stays plain three.js.

# Core algorithms

1. **Surface spline (curves v1).** Control points are `SurfacePoint`s. Evaluate a centripetal
   Catmull-Rom spline (corner points break tangents) through their positions on the *lifted
   reference garment surface*, sample every 1.5 mm, and project each sample to the closest point on
   that surface (three-mesh-bvh). Shape modifiers (scallop, zigzag, wave) displace samples along the
   in-surface normal of the curve. Reason for not starting with geodesic FlipOut: it needs
   geometry-central compiled to WASM; projected splines look right on a skin-tight torso and can be
   swapped later behind the same interface.[^curves]
2. **2D flat views as input devices.** Front and back orthographic charts of the reference torso
   (the POC's `projectFront`, extended to sleeves) plus a side-seam hand-over, so a curve drawn off
   the front chart continues on the back. Storage is always surface points.[^curves]
3. **Arrangement.** Insert every seam and edge polyline into a copy of the canonical mesh by splitting
   the triangles it crosses (crossings within 0.3 mm of a vertex snap to it; curve-curve intersections
   become shared vertices), then flood-fill faces into cells, bounded by inserted edges. Each cell
   maps to a panel by its seed point; a cell containing no seed inherits from the last assignment
   that covered its area, else the default body fabric.[^regions] Target: under 150 ms on release of
   a drag; during a drag only the curve overlay and stone rows update.
4. **Per-panel flattening.** LSCM with two pinned points, sparse conjugate gradients on the normal
   equations (panels are at most ~10k vertices), oriented so the grain arrow is the piece's vertical.
   Gives cloth-space UVs in metres for every shader pattern and the first-release flat piece.[^flatten]
5. **Lift.** The POC's outward membrane solve, warm-started from the previous solution (30
   iterations instead of 220) when only openings change; the full solve only on body or pose change.
6. **Straps.** A strap is a path curve plus width: a ribbon swept along the lifted surface at a layer
   offset (0.7 mm per layer), with the strap's fabric, its own edge finish and contact AO on the skin.
   Where the path leaves the garment it lies on skin; crossings are ordered by `layer`.
7. **Rims and bands.** The POC's swept-profile rims run on every edge curve; contrast binding, piping
   on seams (a narrow rim straddling the seam) and mock-neck bands (a tall profile) are profiles.
8. **Stones.** Generators produce `SurfaceFrame`s; instance buffer of 32 bytes per stone
   (position on canonical face, size, stone id, rotation, seed) with per-instance colour and finish
   in one draw; keep-outs from edges, seams and strap ribbons; overlap solve; ID-buffer picking.
9. **Mirror.** Precomputed left/right canonical face map; mirrored curves and generators are
   evaluated, not copied.

# Frame budget **[INFERRED]** (to be verified per phase)

Baseline measured 6.1 ms/frame (showpiece look) and 7.8 ms with 16,148 pave stones at 1792x1344
on the owner's GTX 1650.[^bench] Budget for the designer tool: **14 ms at that resolution**, with a
dynamic resolution scaler (0.7-1.0) holding 60 fps on larger panes. Planned additions and estimates
are in [realism at 60 fps](/engineering/rendering/realism-upgrades-at-60fps.md). Panels add no fill
cost (same total area, one draw each); the cut mesh adds about 10-20% vertices.

[^body-js]: `poc-threejs/src/body.js`, `regions()` and `computeLift`
[^fabric-js]: `poc-threejs/src/fabric.js`, tri-planar pattern space
[^curves]: Curves on surfaces
[^regions]: Regions and panels from curves
[^flatten]: Pattern flattening
[^bench]: Benchmark run 2026-10-18
