---
type: Technique
title: Fabric bridging hollows
description: "Stretch fabric spans body concavities (sternum, under and between the bust, lower back, gluteal cleft, underarm, crotch) instead of following them; the POC models this with an outward-only membrane offset solved per body."
tags: [geometry, technique, garment, offset, poc]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: body-js
    resource: ../../../poc-threejs/src/body.js
    title: "poc-threejs/src/body.js (computeLift, LIFT_MAX, LIFT_ITER)"
    author: claude-code/claude-opus-5-5
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror), section 2"
    author: claude-code/claude-opus-5-5
  - id: fix-2026-10-15
    resource: measurements of aLift in the running POC, 2026-10-15 (Claude Code session)
    title: Lift before and after pinning bare skin
    author: claude-code/claude-opus-5-5
  - id: report
    resource: /references/research/research-report.md
    title: "Research report (in-bundle mirror), 'designed directly on the body' section"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**A leotard is not an offset of the skin: tensioned stretch fabric spans hollows (sternum, under and
between the bust, lower back, gluteal cleft, underarm, crotch) instead of dipping into them.** None of
the published skintight methods' summaries addresses this, so it was flagged as a design assumption to
prototype.[^gg-notes][^report] The proof of concept now implements one version: an outward-only
membrane offset, solved once per body.[^body-js]

# Recommended approach (research note) **[INFERRED]**

A one-off "shrink-wrap" per body: smooth the body mesh while constraining it to stay outside the body
(a tensioned envelope). Because all bodies share topology, it can be precomputed per size and pose.[^gg-notes]

# The POC implementation (`computeLift` in `poc-threejs/src/body.js`)

Per vertex *i* with position P_i and normal N_i, iterate (Jacobi):

h_i ← clamp( mean over neighbours j of ⟨P_j + h_j·N_j − P_i, N_i⟩ , 0, LIFT_MAX )

- On convex skin the neighbours lie below the tangent plane, so h stays 0 and the fabric hugs the body;
  in a hollow they lie above it, and the fabric spans across.
- Circumferential curvature wins at the waist, so the leotard still follows the waist in.
- `LIFT_MAX = 0.03` m caps the span; `LIFT_ITER = 220` iterations set how far a bridge can reach
  (roughly √iterations edges, about 6 mm each).
- Head vertices, arm vertices beyond the wrist (`armT > 1`) and **bare skin (`cover <= 0`)** are fixed
  at 0. Pinning bare skin (added 2026-10-15) does two things: fabric only bridges where fabric exists,
  and every opening is held to the skin the way its elastic holds it. Before it, the membrane was
  solved as if the whole body were covered, so the tank's shoulder strap "bridged" towards the bare
  neck hollow and floated off the shoulder (median 5.5 mm, max 14 mm), and openings floated up to
  14 mm. After: shoulder median 0.7 mm / max 2.6 mm; within 1 cm of an opening max 2.1 mm; waist
  (spine-groove bridge) unchanged at max 13 mm, as intended.[^fix-2026-10-15]
- Because the fixed set depends on the style, the solve reruns when sleeves or back change
  (`updateGarment`, about 0.7 s on the development laptop), not only when the body changes.
- The garment surface is P + N·h; its own normals (flat across bridges) are used for shading; ambient
  occlusion is derived from h (`1 − 16h`, clamped 0.4–1), since crevices are where the lift is large.

Source: `poc-threejs/src/body.js`.[^body-js] Component details: [body and regions](/engineering/poc/body-and-regions.md).

# Limits and open issues **[INFERRED]**

- It is a geometric heuristic, not a tension model: bridge shape does not depend on fabric stiffness,
  panel boundaries or seams. Openings are now pinned (above), which approximates elastic pulling the
  edge into a crease, but the pin is all-or-nothing rather than a tension.
- **Cloth simulation is not needed to fix fit gaps.** The owner asked on 2026-10-15 whether to simulate
  cloth per body; the visible gap at the shoulder was a bug in this heuristic, not missing physics
  (see [garment as a surface layer](/engineering/geometry/garment-as-surface-layer.md)). A tension-aware
  refinement, if ever needed, is a per-body precomputation from the flattened pattern's strain, not a
  real-time simulation. **[INFERRED]**
- Bridged area is fabric that does not touch the body; flattening the *garment* surface (lifted) rather
  than the skin gives different piece lengths across hollows. Which one to flatten is a decision for
  the pattern pipeline; the lifted surface is closer to what the fabric does.
- Straps spanning hollows should become separate ribbons between anchor points
  (see [garment as a surface layer](/engineering/geometry/garment-as-surface-layer.md)).

[^body-js]: poc-threejs/src/body.js in the project repository.
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
[^report]: Research report (in-bundle mirror).
[^fix-2026-10-15]: Measured in the running POC before and after the change, 2026-10-15 (young-adult body, tank, scoop back).
