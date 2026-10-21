---
type: Data Model
title: Design document model (garment as data)
description: "The serialisable design file every tool edits: body and pose, a curve graph on the canonical body, panels derived from it with fabric stacks, straps, trims, decals and procedural stone generators; all edits are commands, everything derived is a rebuildable cache."
tags: [architecture, data-model, document, commands, garment-model]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-18T18:00:00Z }
sources:
  - id: gap
    resource: /engineering/architecture/poc-to-product-gap.md
    title: POC-to-product gap
  - id: regions
    resource: /engineering/geometry/regions-and-panels-from-curves.md
    title: Regions and panels from curves
  - id: addressing
    resource: /engineering/geometry/surface-addressing.md
    title: Surface addressing and picking
  - id: strokes
    resource: /engineering/ux/procedural-stone-strokes.md
    title: Procedural, editable stone strokes
  - id: moodboard
    resource: /domain/moodboard/design-space-taxonomy.md
    title: Moodboard design-space taxonomy
  - id: owner
    resource: conversation with the product owner, 2026-10-18 (Claude Code session)
    title: Moodboard brief and recreation test
    author: human:mattj
---

# Takeaway

**[INFERRED]** A design is a JSON document of *authored* objects (curves, panel assignments, straps,
trims, decals, stone generators, hand-placed stones) anchored to the canonical body mesh. Everything
else (cut garment mesh, panel UVs, flat pieces, stone instances, edge rims) is a **derived cache**
rebuilt from the document. Every change is a **command** (do / undo / serialise), which gives undo,
autosave, file hand-over and an agent-drivable API from one mechanism. This closes items 1, 2, 3, 5
and 6 of the [POC-to-product gap](/engineering/architecture/poc-to-product-gap.md).[^gap]

# Addresses

| Type | Fields | Notes |
|---|---|---|
| `SurfacePoint` | `f` (canonical face id), `b` (two barycentrics, third implied) | On the canonical mesh, Genesis 9 subdivided once (100,676 vertices; document `mesh: 'g9-sd1'`; before 2026-10-21 the MakeHuman topology, converted on load: [Genesis 9 bodies](/engineering/pipeline/g9-bodies.md)); evaluates on every size and pose.[^addressing] |
| `SurfaceFrame` | `SurfacePoint` + `angle` (radians from the canonical tangent field) | Orientation of shaped stones, decals, motif stamps. |
| `Side` | `L`, `R`, `both` | `both` = authored once, mirrored through the precomputed left/right face map. |

# Authored objects

```jsonc
{
  "format": "leotard-design", "version": 1,
  "meta": { "name": "", "author": "", "created": "", "notes": "" },
  "body": { "size": "young", "pose": "a-pose", "head": "mannequin", "expression": "neutral", "form": "full", "finish": "Athlete skin, light" },
  "layers": [ { "id": "L0", "kind": "shell" },        // shell = the garment itself
              { "id": "L1", "kind": "overlay", "z": 1 },  // wrap pieces, surplice, sash, appliqué
              { "id": "Lm", "kind": "lining", "z": -1 } ],// shapes seen through mesh (bandeau, crop)
  "curves": [ {                               // one curve graph per layer: every line on the garment
    "id": "c12", "layer": "L0", "role": "seam", // seam | edge | print | guide | strap-path | trim-path
    "points": [ { "sp": {"f":0,"b":[0.2,0.3]}, "kind": "smooth" } ], // smooth | corner
    "closed": false, "mirror": "both",
    "shape": { "mod": "none", "amp": 0, "period": 0 },  // none | scallop | zigzag | wave (applied along the curve)
    "constraints": [ { "type": "end-on", "curve": "c3" }, { "type": "snap", "landmark": "side-seam" } ]
  } ],
  "panels": [ {                                // assignment keyed by a seed point inside the cell
    "id": "p4", "seed": {"f":0,"b":[0.3,0.3]},
    "removed": false,                          // true = cut-out / outside the garment
    "stack": [ { "fabric": "mystique", "colour": "#2b1d6e", "second": "silver", "print": null,
                 "grain": 0, "nap": 0 },       // outer layer first
               { "fabric": "lining", "colour": "nude-2" } ]
  } ],
  "straps":  [ { "id": "s1", "path": "c20", "width": 0.012, "fabric": {}, "edge": "binding",
                 "layer": 2, "lift": "auto" } ],      // layer orders crossings; lift auto = bridge hollows
  "trims":   [ { "id": "t1", "on": ["c1","c2"], "kind": "binding", "width": 0.008, "fabric": {} } ],
  "bands":   [ { "id": "b1", "on": "c1", "kind": "mock-neck", "height": 0.035, "fabric": {} } ],
  "decals":  [ { "id": "d1", "frame": {}, "src": "logo.svg", "size": 0.06, "finish": "print-white" } ], // print | foil | embroidery | glitter-print
  "details": [ { "id": "r1", "kind": "gathers", "on": { "panel": "p4" }, "toward": {}, "strength": 0.6 } ], // gathers | twist-knot | wrinkles | emboss
  "hardware":[ { "id": "h1", "kind": "clear-hook", "at": {} } ],   // clear-hook | hook-and-bar | invisible-zip
  "stones":  [ {                               // generators, re-run on every relevant change
    "id": "g7", "kind": "row",                 // single | row | fill | scatter | lattice | motif | text | fringe | between
    "on": { "curve": "c12", "offset": 0.004, "side": "+" },
    "params": { "rows": 2, "rowGap": 0.0035, "sizes": ["ss16","ss10"], "gap": 1.13 },
    "palette": [ { "stone": "crystal-ab", "weight": 1 } ], "colourRamp": null, "sizeRamp": null,
    "seed": 7, "mirror": "both", "released": false
  } ],
  "placed":  [ { "id": "x1", "frame": {}, "stone": "sapphire", "size": "ss20" } ], // hand-set + released stones
  "reference": [ { "image": "ref.jpg", "view": "front", "pins": [], "camera": null, "opacity": 0.5 } ],
  "locks": { }                                 // later: which parts a coach may change
}
```

- **Panels are not authored geometry.** They are the cells of the curve arrangement (seams + edges);
  the document only stores which cell gets which fabric stack, keyed by a seed point, so a curve edit
  re-cuts the cells and assignments follow their seeds.[^regions]
- **Layers** exist because the moodboard has overlapping lace wrap pieces, surplice fronts, sashes,
  appliqué bands and lining shapes seen through mesh;[^moodboard] each layer is its own arrangement,
  drawn at its own offset, and a sheer layer shows the edges of the layer beneath.
- **Print curves** split colour regions inside one pattern piece (no seam), as the
  [region types](/engineering/geometry/regions-and-panels-from-curves.md) require.
- **Generators reference curves and panels by id**, so moving a seam re-flows the stone rows that
  follow it; `released: true` freezes a generator into `placed` stones for hand finishing.[^strokes]
- **Reference images and their camera solve live in the document**, so a traced design keeps its
  reference.

# Derived caches (never saved, always rebuildable)

| Cache | Built from | Rebuild trigger |
|---|---|---|
| Evaluated curve polylines (crossing points on canonical edges) | `curves` | curve edit |
| Cut garment mesh + panel labels + per-panel flattened UVs | polylines, `panels.removed` | seam/edge edit (on release; preview while dragging) |
| Lift (bridging) and garment normals | cut mesh, body, pose | body, pose or opening change (warm-started) |
| Edge rims, strap ribbons, bands | edge/strap curves, trims | curve or trim edit |
| Stone instance buffer | generators + `placed` | generator, curve or panel edit (dirty ranges) |
| Flat pattern pieces, PDF | cut mesh, UVs, trims, stones | export |

# Commands

Every tool emits commands of the form `{ op, target, before, after }`; the history stack stores them;
the same commands are exposed as `app.exec(cmd)` for scripts and agents, and the document is
`app.doc` (load/save JSON). Dragging produces one coalesced command per gesture. **[INFERRED]** The
owner's test of rebuilding a photographed leotard with the app's tools[^owner] is run through this same
command layer, so the agent uses exactly the tools a designer has.

[^gap]: POC-to-product gap
[^regions]: Regions and panels from curves
[^addressing]: Surface addressing and picking
[^strokes]: Procedural, editable stone strokes
[^owner]: Product owner, 2026-10-18
[^moodboard]: Moodboard design-space taxonomy, axis 4 (layers)
