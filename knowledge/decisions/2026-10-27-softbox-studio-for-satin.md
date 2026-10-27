---
type: Decision
title: "A softbox studio lit by analytic area lights, added back to test satin"
description: "Owner decision of 2026-10-27, hours after removing every non-HDRI rig: add one analytic studio (Softbox studio) with many large, bright softboxes over white seamless paper, to test the microcylinder satin under exact light shapes before making it work in the HDRI studios."
tags: [decision, lighting, studio, satin, rendering]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-27T21:30:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-27 (Claude Code session)
    title: "Owner: if we need analytic lights rather than HDRIs, do that to test the satin; make a new studio scene with lots of bright, large area lights, so it looks lit in a real studio"
    author: human:mattj
---

# Decision

The Scene panel gains **Softbox studio**, the one analytic studio alongside the five HDRI
studios. It exists to test the
[microcylinder satin](/engineering/rendering/fabric-shading/microcylinder-cloth-model.md); if that
approach is kept, it is then made to work in the HDRI studios.[^owner] It partly reverses
[HDRI studios only](/decisions/2026-10-27-hdri-lighting-only.md); the five HDRI studios and the
White loft default are unchanged.

# What it is

- `RIGS['Softbox studio']` in `app/src/render/presets.js`: six rectangular area lights (a 1.5 m
  key octabox front left, a tall fill front right, two strip boxes behind for the rims, an overhead
  scrim and a low front bounce), a bounce card beside the camera seen only in reflections, and a
  directional light carrying part of the key for a soft shadow.
- `app/src/render/studio.js` (restored from before the removal): the reflection room (dim walls
  round very bright softbox quads, so a softbox is about ten times its surroundings, as in a real
  studio; near-white walls left glossy fabric with no highlights) and the seamless paper, now a
  **round infinity cove** so it reads as a studio from any camera angle (a one-sided sweep showed a
  hard horizon from behind).
- `viewport.js showStudio / placeStudioLights`: "Turn the room" turns the lights, the reflection
  room and the key's shadow together; the paper stays.

# Consequences

- The studio is lit from every side, high-key. **[INFERRED]** That leaves little shading on light
  colours (pink read flat even on matte), so a more directional variant may be needed to judge
  satin on light colours.
- Lights are placed for a figure facing the front (+z). A posed figure turned away is lit from
  behind until the room is turned (tests used 228°).

[^owner]: Conversation with the product owner, 2026-10-27
