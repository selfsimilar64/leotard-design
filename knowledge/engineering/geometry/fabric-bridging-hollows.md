---
type: Technique
title: Fabric bridging hollows
description: "Stretch fabric spans body concavities (sternum, under and between the bust, lower back, gluteal cleft, underarm, crotch) instead of following them; the POC models this with an outward-only membrane offset solved per body, which cannot span the gluteal cleft, so the app now defaults to a rolling-ball fit (morphological closing)."
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
  - id: app-2026-10-25
    resource: measurements of aLift in the running designer app, 2026-10-25 (Claude Code session)
    title: Lift against the bridging controls
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

# Viewing controls in the designer app (2026-10-25)

The app's copy (`computeLift` in `app/src/body/mannequin.js`) takes `Man.liftOpt = { taut, max, reach }`
(defaults `LIFT_DEFAULTS`: 1, 0.03 m, 1), set from three sliders in the settings popover's "Fabric fit"
section (`FabricFit` in `app/src/ui/Inspector.jsx`), stored per computer with the display settings
(`liftTaut`, `liftMax`, `liftReach` in `app/src/render/display.js`). They apply in every pose; a change
re-solves the body like the slide's Tension and Grip (`Engine.setSlide`'s third argument).[^app-2026-10-25]

- **Bridging** (`taut`, 0..1): h_i ← clamp(taut · mean …, 0, max). Below 1 each vertex keeps only part
  of its neighbours' span, so the bridge decays into the hollow (a screened diffusion). The response is
  steep near 1 (teen body, A-pose, starting design: total lift 5043 mm at 1, 3463 at 0.99, 1016 at 0.9,
  163 at 0.5), so the slider is logarithmic in 1 − taut (`tautOf`): 50% → taut 0.97, 44% of the volume.
- **Deepest bridge** (`max`, 0–50 mm): the cap formerly fixed as `LIFT_MAX`.
- **Bridge reach** (`reach`, 25–150%): cold-solve iterations = `LIFT_ITER · reach²`. 25% kept a third of
  the volume; 150% added 2% (the hollows had converged) and costs about 1.1 s against 0.8 s.
- Warm solves (garment edits) still run 40 iterations from the last solution.
- The **reference surface** (`app/src/body/reference.js`, where curves are stored) always uses
  `LIFT_DEFAULTS`, so the controls change the view and never move a saved design's lines.

# The membrane cannot span the gluteal cleft (2026-10-25)

Owner: the seat still sank far too low with every slider at its maximum. Measured on the teen body
(arms-down, B8): the membrane's lift along the cleft was **0 mm** over a cleft 22-53 mm deep, and the
fabric followed it all the way down. The cleft is not a bowl but two convex cheeks meeting in a slot:
every cheek vertex sees convex skin (h stays 0), and inside the slot the walls' normals face each
other (n.x ≈ ±0.99 at 1 mm from the midline), so a lift along the normal moves the fabric sideways,
never across. The two cheeks are neighbours only at the floor of the slot, so nothing can diffuse
from one cheek top to the other. The slide (`body/slide.js`) does not span it in a standing pose
either (grip 0: 24 of 25 mm still sunk at 6 cm). The same shape probably occurs wherever skin
touches itself (between the thighs, a closed cleavage); not measured.[^app-2026-10-25]

# Rolling-ball fit (`app/src/body/ball.js`, experiment, default since 2026-10-25)

The fabric lies on the surface a ball of radius R traces when rolled over the skin (a morphological
closing): the skin wherever the ball touches it, an arc across any fold narrower than the ball. It
is a geometric stand-in, not a cloth model: garment CAD (CLO, Marvelous Designer) simulates a sheet
under tension with collisions, which gives a nearly straight span; a big ball approximates that.
Owner chose it after that comparison. **[INFERRED]** for the tool comparison.

1. **Free balls**: centre = skin point + normal·R per vertex, kept when no skin vertex of the same
   part lies within R − 0.5 mm. Parts: trunk (torso and legs) and each arm, so a ball too big for
   the arm-to-side gap does not web the torso to the arm; the head is no obstacle. Cached per body,
   pose and R (independent of the garment).
2. **Projection**: a fabric vertex whose own ball is blocked moves to the nearest free ball's surface,
   G = c + (P − c)·R/|P − c|, unless within `SNAP` = 2 mm of it.
3. **Openings pinned**: the move fades in (smoothstep) over `PIN` = 3 cm of mesh distance from bare
   skin, as elastic holds an edge; then 8 smoothing passes of the move over the fabric.
4. **Untangling**: the vertices from the two walls of a fold land on the same arc and cross; the moved
   vertices relax 10 passes towards their neighbours' mean, never inwards of the fabric's own normal.

The lift is now a **vector** (`aLift`, 3 components: skin or slid fabric to garment surface) in the
app's mannequin, garment cells (`render/garment.js`), straps (`render/straps.js`) and the fabric
shader (`transformed += normal * uOffset + aLift * uGarment`); the membrane writes N·h into it. AO
uses its length. The POC (`poc-threejs`) keeps its scalar lift.

Measured (teen, arms-down, B8, R = 5 cm, before pinning and untangling): fabric sink at the midline,
2/4/6/10 cm above the crotch, 27/16/11/7 mm against the cleft's 53/32/25/22 mm; R = 10 cm
20/13/9/3 mm. Visually the cleft line is gone; a small dip stays where the leg openings meet (the
membrane has the same). Cost: a full refit 1.5 s with the slide (ball part about 1.3 s at R 5 cm,
1.8 s at 10 cm); a garment edit 0.55 s (the centres are cached).[^app-2026-10-25]

Tuning found on the way:
- Without pinning, the crotch gusset (a few cm between the leg openings) was pushed out below the
  leg line into a crumpled bulge.
- Smoothing 25 passes instead of 8 pulled the bridge back into the cleft near the leg openings.
- Untangling 40 passes pulled the fabric inside the cheeks (skin through); 0 left a faint crease
  down the midline where arcs from the two cheeks meet; 10 is clean.
- In a pose (split leap) the slid fabric sits a millimetre or two off its own ball everywhere; with
  a 0.5 mm snap those tiny moves were then shrunk into the body by the untangling (skin through the
  back and shoulders). Fixed by the 2 mm snap and the never-inwards clamp.
- Counting "flipped" triangles (garment against skin face normal) misleads here: across the cleft
  the surface legitimately turns about 90°. Judge by renders.

Controls: settings popover, Fabric fit, "How fabric spans hollows" (membrane / rolling ball) and
"Ball size" 0-150 mm (default 50); the membrane's three sliders show only for the membrane.

Open: per-region ball size (bust against seat), cost at large R, the closed-cleavage and inner-thigh
cases, and whether stored curves should eventually sit on a ball-fitted reference surface.

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
[^app-2026-10-25]: Measured in the running designer app, 2026-10-25 (teen body, A-pose, the design open at start-up).
