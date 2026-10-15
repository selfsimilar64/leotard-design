---
type: Component
title: Mannequin pipeline (build_mannequins.py)
description: "pipeline/build_mannequins.py runs headless in the portable Blender 4.5 with MPFB 2 to bake four same-topology mannequin bodies from the CC0 MakeHuman base mesh into manifest.json, shared.bin and per-body position files; it fails if any body's triangle list differs."
tags: [pipeline, component, mannequin, makehuman, mpfb, blender]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: script
    resource: ../../../pipeline/build_mannequins.py
    title: pipeline/build_mannequins.py
    author: claude-code/claude-opus-5-5
  - id: readme
    resource: ../../../pipeline/README.md
    title: pipeline/README.md
    author: claude-code/claude-opus-5-5
  - id: manifest
    resource: ../../../poc-threejs/public/mannequins/manifest.json
    title: poc-threejs/public/mannequins/manifest.json
    author: process:build-mannequins
  - id: tools
    resource: tools/ directory in the project repository (blender-4.5.14-windows-x64, downloads/add-on-mpfb-v2.0.18.zip)
    title: Portable Blender and MPFB add-on
  - id: mh-licence
    resource: https://static.makehumancommunity.org/about/license.html
    title: MakeHuman licence page (core assets CC0)
    author: org:makehuman
---

# Takeaway

**One headless Blender run (about 10 s) bakes four mannequin bodies that are the same mesh with different
vertex positions, so vertex *i* is the same anatomical point on the child and the adult; the app relies on
this to define the leotard once on the reference body.** The script raises if any body's triangle list
differs from the first.[^script][^readme]

# How to run

```bash
cd tools/blender-4.5.14-windows-x64
./blender.exe -b --python ../../pipeline/build_mannequins.py
```

Prints one `BUILT` line per body, then `DONE`. Output goes to `poc-threejs/public/mannequins/`
(about 3.3 MB, committed so the app runs without Blender).[^readme] Tooling in `tools/`: portable
Blender 4.5.14 (Windows x64) with the MPFB 2 extension (`add-on-mpfb-v2.0.18.zip` in `tools/downloads/`).[^tools]
The MakeHuman core assets are CC0.[^mh-licence]

# Bodies (`BODIES`)

| key | label | years | stature (m) | muscle | weight | cup |
|---|---|---|---|---|---|---|
| child | Child (about 8) | 8 | 1.29 | 0.60 | 0.42 | 0.0 |
| teen | Teen (about 13) | 13 | 1.53 | 0.62 | 0.44 | 0.3 |
| young (reference) | Young adult (about 18) | 18 | 1.61 | 0.62 | 0.45 | 0.45 |
| adult | Adult (about 30) | 30 | 1.64 | 0.58 | 0.50 | 0.55 |

Statures follow children's/junior mannequin and dress-form charts (~130/155/163/165 cm) shaved a little
because competitive gymnasts run short; build is lean and somewhat muscular.[^script] Output mesh: 41,595
vertices, 83,088 triangles.[^manifest]

# Steps per body

1. `HumanService.create_human` with MakeHuman macros: female (`gender` 0), age mapped onto MakeHuman's
   slider breakpoints (0 = 1 yr, 0.1875 = 11, 0.5 = 25, 1 = 90), `muscle`, `weight`, `proportions` 1,
   `height` 0.5 (height slider also reshapes, so stature is set by uniform scale later), `cupsize`,
   `firmness` 0.4; targets baked to a plain mesh.
2. Add the `default` rig; pose arms to a mannequin stance: upper arm 13° from vertical and slightly
   forward (`UPPER_DIR`), elbow bent 14° forward (`ELBOW_BEND`).
3. Apply modifiers: mask (drops helper geometry: eyes, teeth, tights/skirt helpers) then armature
   (bakes the pose). Record landmarks (rig joint heads/tails): neck_base, head_base, head_top,
   shoulder_l, elbow_l, wrist_l, hip_l, knee_l, ankle_l, pelvis, chest, waist.
4. Part weights per vertex from skinning groups: shoulder, upperarm, forearm, upperleg, lowerleg, head,
   hand, spare.
5. "Mannequinise": delete head-bone vertices and add an egg head (`egg_sphere` 40 × 28, built vertex by
   vertex so ordering is identical every run; width from the inner 80% of head vertices; tilted 14°);
   smooth hands (6 passes); replace each bust within 3 cm of the apex by a fitted quadratic dome
   (area- and distance-weighted least squares), blending out by 5.5 cm, because MakeHuman's dense nipple
   ring survives ordinary smoothing; three Taubin passes (0.5 / −0.53) over the body.
6. One Catmull-Clark level, then split quads on a fixed diagonal — Blender's triangulator picks
   diagonals by shape and gave each body a different triangle list; do not use it.
7. Uniform scale to `stature`; convert Blender z-up, −y-front to three.js y-up, +z-front; write files.

Source: script and README.[^script][^readme]

# Output format

| File | Content |
|---|---|
| `manifest.json` | source note, `parts`, vertex and index counts, per body: key, label, years, measured stature, file, landmarks (metres, three.js axes) |
| `shared.bin` | Uint32 triangle indices, then 8 bytes per vertex of part weights 0–255 in `parts` order |
| `<key>.bin` | Float32 xyz per vertex |

`body.js` uses the part weights for the armhole seam, the arm parameter, the dress-form cuts and the lift
solve (see [body and regions](/engineering/poc/body-and-regions.md)).[^readme]

# The same-topology invariant

The script compares every body's index list with the first and raises `topology differs for <key>`.[^script]
Anything that changes topology (subdivision level, egg resolution, what gets deleted) changes every vertex
index; region fields re-evaluate automatically, but the reference-body constants in `body.js` (necklines,
leg line, swoosh, dress-form tape heights) assume the current reference shape and may need re-tuning.
Changing the reference body (`young`) moves every design line.[^readme]

# Adding a body

Add an entry to `BODIES` (key, label, years, stature, muscle, weight, cup) and rebuild; the app lists
bodies from the manifest, so no app change is needed.[^readme]

# Toward the professional tool **[INFERRED]**

- Sizes, not ages: a size run would add one body per size (and long/short torso variants), ideally fitted
  to size-chart measurements rather than chosen by age; see [body models](/engineering/geometry/body-models.md)
  and [grading](/domain/construction/grading-across-sizes.md).
- Surface-anchored designs stored against this mesh must be migrated if topology ever changes; store a
  topology-independent fallback address (see [surface addressing](/engineering/geometry/surface-addressing.md)).
- A left↔right vertex symmetry map is not produced yet; mirror tools would need one.

[^script]: pipeline/build_mannequins.py in the project repository.
[^readme]: pipeline/README.md in the project repository.
[^manifest]: poc-threejs/public/mannequins/manifest.json in the project repository.
[^tools]: tools/ directory in the project repository.
[^mh-licence]: MakeHuman licence page.
