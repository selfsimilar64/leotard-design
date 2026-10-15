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
- Head vertices and arm vertices beyond the wrist (`armT > 1`) are fixed at 0.
- The garment surface is P + N·h; its own normals (flat across bridges) are used for shading; ambient
  occlusion is derived from h (`1 − 16h`, clamped 0.4–1), since crevices are where the lift is large.

Source: `poc-threejs/src/body.js`.[^body-js] Component details: [body and regions](/engineering/poc/body-and-regions.md).

# Limits and open issues **[INFERRED]**

- It is a geometric heuristic, not a tension model: bridge shape does not depend on fabric stiffness,
  panel boundaries, seams or elastic edges (an elastic leg line pulls fabric into the crease; a free
  bridge would not).
- Bridged area is fabric that does not touch the body; flattening the *garment* surface (lifted) rather
  than the skin gives different piece lengths across hollows. Which one to flatten is a decision for
  the pattern pipeline; the lifted surface is closer to what the fabric does.
- Straps spanning hollows should become separate ribbons between anchor points
  (see [garment as a surface layer](/engineering/geometry/garment-as-surface-layer.md)).

[^body-js]: poc-threejs/src/body.js in the project repository.
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
[^report]: Research report (in-bundle mirror).
