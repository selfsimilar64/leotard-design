---
type: Component
title: Body and garment regions (body.js)
description: "poc-threejs/src/body.js: loads the shared-topology mannequins, evaluates hard-coded analytic region fields (necklines, backs, leg line, sleeves, swoosh) on the reference body, solves the fabric lift over hollows, and provides surface points, front projection, arm rings and dress-form cuts; no panels, seams or flattening."
tags: [poc, component, body, regions, garment, geometry]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: body-js
    resource: ../../../poc-threejs/src/body.js
    title: poc-threejs/src/body.js
    author: claude-code/claude-opus-5-5
  - id: manifest
    resource: ../../../poc-threejs/public/mannequins/manifest.json
    title: poc-threejs/public/mannequins/manifest.json (vertex and index counts, statures)
    author: process:build-mannequins
  - id: pipeline-readme
    resource: ../../../pipeline/README.md
    title: pipeline/README.md
    author: claude-code/claude-opus-5-5
  - id: stones-js
    resource: ../../../poc-threejs/src/stones.js
    title: poc-threejs/src/stones.js (consumer of surface points, projectFront, armRing, sample)
    author: claude-code/claude-opus-5-5
---

# Takeaway

**The POC's leotard is not geometry and not data: it is the body surface pushed outward, with a handful
of hard-coded analytic "region fields" (written in reference-body metres) deciding where fabric exists.**
That made it fast to build and lets one design fit all four bodies through shared topology, but it has no
panels, seams, allowances or 2D pattern, and every garment shape is code. The professional tool must
replace the region fields with editable surface curves and panels
([curves](/engineering/geometry/curves-on-surfaces.md), [regions and panels](/engineering/geometry/regions-and-panels-from-curves.md),
[flattening](/engineering/geometry/pattern-flattening.md)) while keeping the shared-topology and
surface-point ideas.[^body-js]

# What it does

## Mannequins and the reference body

- `loadMannequins()` fetches `manifest.json`, `shared.bin` (Uint32 indices + 8 bytes of part weights
  per vertex) and one `<key>.bin` of Float32 positions per body from `public/mannequins/`.[^body-js]
- Four bodies — child (1.29 m), teen (1.53), young (1.61), adult (1.64) — share one mesh of 41,595
  vertices and 83,088 triangles, so vertex *i* is the same anatomical point on every body.[^manifest][^pipeline-readme]
- `REF = 'young'`: every region field is evaluated on the reference position of each vertex (attribute
  `aRef`) and the result carried to whichever body is shown. Built by the
  [mannequin pipeline](/engineering/pipeline/mannequin-pipeline.md).[^body-js]
- Part weights from the rig's skinning: `wArm` = upper arm + forearm + hand, `wLeg` = upper + lower leg,
  `wHead` = egg head. A CSR vertex adjacency is built for the lift solve.[^body-js]

## Static reference fields (`buildRefFields`)

| Field | Definition |
|---|---|
| `zMid(y)` | front/back mid-plane per 1 cm torso slice (arms and head excluded); `zr = z − zMid(y)` is "front vs back" and the side-seam distance |
| `armT` | arm parameter 0 (shoulder) … 1 (wrist) along the shoulder–elbow–wrist landmark polyline (left side; right mirrored by \|x\|) |
| `armF` (armhole seam) | where `wArm` crosses 0.5, divided by the smoothed weight gradient so it reads as metres from the seam, clamped ±0.08 m |
| `keep` (dress form) | > 0 kept: neck cut 2.2 cm above the neck base, legs at crotch − 0.13 m (mid-thigh), arms at `armT` 0.1 (`FORM`) |
| `form` | dress-form tape fields: side-seam distance (`zr`) and a princess-line distance (bust x 0.075 m, waist y 1.04 m, bust y 1.168 m) |
| `formLines` | waist 1.04, bust 1.168, hip crotch + 0.06, neck base + 0.005 (reference metres) |

## Garment region fields (`regions(v, style, out)`)

Every field is "positive inside, roughly in metres", evaluated in the reference body's **frontal plane
(x, y)** with front/back blended by `smoothstep(-0.03, 0.015, zr)`.[^body-js]

| Region | Hard-coded shape (reference metres) |
|---|---|
| Front neck | ellipse centre (0, 1.422), radii 0.085 × 0.14; bottom at 1.282, about a third of the way from neck base (1.352) to bust line (1.168) |
| Back: scoop | ellipse (0, 1.422), 0.085 × 0.21 |
| Back: keyhole | union of ellipse (0, 1.442) 0.066 × 0.085 and keyhole ellipse (0, 1.232) 0.04 × 0.075 |
| Back: strappy | open area (two ellipses) plus two crossed straps, half-width 6.5 mm, from (±0.082, 1.357) to (∓0.09, 1.092) |
| Neck top | no fabric above y = 1.47 |
| Leg line | front: y = 0.765 + 1.5·max(\|x\| − 0.03, 0) (straight diagonal to just under the hip bone); back: y = 0.765 + 0.195·min(\|x\|/0.16, 1.3)^2.3 (fuller seat); 1.5 cm gusset margin; guarded so it does not slice the arms |
| Sleeves | long: fabric to `armT` 0.95; tank: armhole offset 1.8 cm inside the armhole seam |
| Accent "swoosh" | tapering band (half-width 4 cm → 1.1 cm) around a cubic Bézier in the frontal plane, (0.105, 1.367) → (−0.18, 0.937), left shoulder to right hip; also exported (`swooshPoint`, `swooshHalfWidth`) for stones |

`setStyle(style)` (style = `{ sleeves: 'long'|'tank', back: 'scoop'|'keyhole'|'strappy' }`) writes
`aCover` (fabric exists) and `aZone` (sleeve field, accent field) per vertex; the fabric shader
thresholds them per pixel (see [fabric shader](/engineering/poc/fabric-shader.md)).[^body-js]

## Per-body work (`setBody`)

1. Copy positions, compute area-weighted normals.
2. Solve the lift membrane (`computeLift`: outward-only Jacobi, `LIFT_MAX` 3 cm, 220 iterations; see
   [fabric bridging hollows](/engineering/geometry/fabric-bridging-hollows.md)); garment positions
   P + N·h and garment normals (flat across bridges).
3. Tangent = up × normal, i.e. horizontal around the body — "the direction of greatest stretch", used
   for tricot highlight anisotropy.
4. AO from lift depth; area-weighted triangle CDF on the garment surface; crotch point.[^body-js]

## Surface-point API (used by stones)

| Method | What it returns |
|---|---|
| `point({f, b0, b1, b2})` | position and normal on the current garment surface, plus interpolated `cover`, `keep`, `refY` (so stones only land on fabric) |
| `projectFront(x, y, back)` | orthographic projection of a reference frontal-plane point onto the front (or back) torso via a 4 mm raster (160 × 280 cells, x from −0.32, y from 0.45; arms and head excluded) → surface point |
| `armRing(side, t)` | the iso-line `armT = t` (a cuff) as surface points ordered by angle around the arm |
| `sample(rand)` | area-weighted random surface point |
| `cutLoops()` | boundary loops of the `keep` field on the current body, for the dress-form end caps (same interpolation as the per-pixel discard) |

Consumers: [stones](/engineering/poc/stones.md) and [stands](/engineering/poc/stands.md).[^stones-js]

# Limits for the professional tool **[INFERRED]**

| Limit | Consequence |
|---|---|
| Garment shape is code, not data: necklines, backs, leg line and swoosh are constants and formulas in reference-body metres | A designer cannot draw or edit a line; every new style is a code change; changing the reference body moves every line (pipeline README says to re-check them)[^pipeline-readme] |
| Fields are functions of frontal-plane (x, y) with a front/back blend | Lines are planar projections, not curves on the surface; shapes wrapping the side, over the shoulder or under the arm are distorted or impossible; no geodesic straps |
| Per-vertex fields thresholded per pixel | Edge position depends on mesh resolution and linear interpolation of a non-linear field; no exact curve to measure, offset or export |
| No panels, seams, line types, fabric assignment per panel | Cannot express pieced vs appliqué vs print lines, closing seams or lining; "cover" and two zones only |
| No 2D flattening, allowances, markings, stretch compensation, grading tables | No pattern output for a [seamstress](/product/personas/seamstress.md) or factory |
| Side seam is a computed mid-plane, armhole seam a skinning-weight iso-line | Construction seams are artefacts of the body model, not designer choices |
| Lift is a geometric heuristic per body | Not tied to fabric, panel or elastic tension |

**Worth keeping:** shared topology across sizes; surface points `{f, b0, b1, b2}` found on the reference
body and evaluated per body; the circumferential tangent field (grain direction); the front-projection
raster as a precursor of a technical-flat input view; iso-line extraction (`armRing`, `cutLoops`) as a
way to turn fields into curves; the lift solve as a starting point for the garment surface.

[^body-js]: poc-threejs/src/body.js in the project repository.
[^manifest]: poc-threejs/public/mannequins/manifest.json in the project repository.
[^pipeline-readme]: pipeline/README.md in the project repository.
[^stones-js]: poc-threejs/src/stones.js in the project repository.
