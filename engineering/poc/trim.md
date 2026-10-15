---
type: Component
title: Finished edges (trim.js)
description: "poc-threejs/src/trim.js: sweeps a raised elastic or binding profile with coverstitching along every garment opening, hides the jagged per-pixel cut beneath it, and keeps stones off it."
tags: [poc, component, edges, elastic, binding, rendering]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T23:30:00Z }
sources:
  - id: trim-js
    resource: ../../../poc-threejs/src/trim.js
    title: poc-threejs/src/trim.js
    author: claude-code/claude-opus-5-5
  - id: owner
    resource: conversation with the product owner, 2026-10-15 (Claude Code session)
    title: "Request: fabric edges need the distinct finished appearance real openings have"
    author: human:mattj
  - id: edge-finishing
    resource: /domain/construction/edge-finishing-elastic-and-binding.md
    title: "Edge finishing: elastic and binding"
---

# Takeaway

Real leotard openings are never raw: they are finished with about 1 cm of elastic turned under and
coverstitched, or wrapped in a binding strip.[^edge-finishing] The owner pointed out the POC's
openings had no such "end piece".[^owner] `trim.js` adds it as real geometry: a cross-section profile
swept along every opening (neck, armholes, legs, wrist cuffs, strap edges), drawn with the adjacent
fabric's material plus twin-needle topstitching.[^trim-js]

# How it works

1. **Edges.** `body.edgeLoops()` returns the zero line of the `cover` field on the garment surface as
   closed loops (see [body and regions](/engineering/poc/body-and-regions.md)).
2. **Resample and smooth.** Each loop is resampled every 1.5 mm and box-filtered (positions ±4.5 mm,
   normals ±6 mm, curvature ±12 mm), removing the per-vertex jaggies of the field.
3. **Frame.** Per sample: surface normal n, tangent t along the edge, inward direction d = n × t
   (flipped to point into the fabric), and the surface curvature across the edge κ, so the profile is
   bent down by κu²/2 and follows the body instead of floating off it.
4. **Width cap.** The cover field is looked up inward (inverse-distance from nearby vertices); where it
   peaks before the full width (a narrow strap) the profile is narrowed (to ≥35%), so a strap
   becomes a fully bound tube instead of two overlapping rims.
5. **Sweep.** The profile `[u, v, ao]` (u = metres in from the edge, v = height above the garment
   surface; the fabric sits at 1.2 mm) is swept into a mesh. Attributes: `aRim` = (profile u, metres
   along the edge) for stitching; `aAO` contact darkening where the lip rolls under; `aKeep` so the
   dress-form cut applies.
6. **Fabric under it.** Fabric layers pull their cut back 4 mm under the rim (`uTrimInset`) and get a
   soft contact shadow beside it (`uTrimWidth`); see [fabric shader](/engineering/poc/fabric-shader.md).
7. **Stones** keep `width + 1.5 mm` off every edge (`body.edgeKeepOut`, read by `onFabric` and the
   neckline/cuff rows in `stones.js`), matching the maker rule of no stones on elastic.

# Finishes

| Finish | Width | Height above fabric | Topstitch rows (from edge) | Material |
|---|---|---|---|---|
| Turned elastic (default) | 10 mm | ~1.3 mm | 8.5 mm and 4.5 mm (twin needle) | Adjacent zone's fabric (body, or sleeve at the cuffs) |
| Binding | 8 mm | ~1.5 mm | 6.4 mm | Its own fabric and colour (GUI folder "Binding") |

Thread is the fabric colour at 80% brightness, slightly glossier; stitches are 3 mm dashes in a
groove and fade to the groove's average darkening when smaller than a few pixels.

# Cost and limits

- Build ~35–80 ms per body or style change; ~13 k vertices for a long-sleeve design.
- Profiles are hand-tuned look-alikes ([appears correct](/decisions/2026-10-13-appears-correct-not-physically-correct.md)),
  not measured. **[INFERRED]**
- One finish for all openings; real designs mix (e.g. binding at the neck, elastic at the legs).
- Edges come from the POC's analytic `cover` field; in the professional tool they would come from the
  panel model's opening curves, with the finish a per-edge property.
- No gathering ripple from elastic tension.

[^trim-js]: `poc-threejs/src/trim.js`
[^owner]: Product owner, 2026-10-15
[^edge-finishing]: Edge finishing: elastic and binding
