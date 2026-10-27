---
type: Decision
title: "Lighting: photographed (HDRI) studios only; test materials in the White loft studio"
description: "Owner decision of 2026-10-27: the app offers only the five photographed HDRI studios (White loft, Window loft, Parquet sunlit, Green loft hall, Neon studio); the light-only and softbox rigs (Arena, Studio (soft), Single spotlight, White and Grey seamless, Gym) and the circling-lights switch are removed, and material realism is tested in the White loft studio."
tags: [decision, lighting, hdri, rendering]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-27T17:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-27 (Claude Code session)
    title: "Owner: 'Use the white studio HDRI for testing. In fact, remove any non-HDRI lighting options from the app'"
    author: human:mattj
---

# Decision

The Scene panel lists only the photographed studios, and new designs open in the **White loft
studio** (`DEFAULT_RIG` in `app/src/render/presets.js`). Material checks (the
[mystique photo match](/engineering/rendering/fabric-shading/photo-match-mystique.md) and later ones) use
that studio.[^owner]

# What changed in the app

- Gone: Arena (ring of small lights), Studio (soft), Single spotlight, White and Grey seamless
  (photo studio), Gym (overhead lights); the softbox area lights, seamless cyclorama, dark floor
  and per-rig reflection rooms that only they used (`render/studio.js` deleted); the "Circling
  lights" switch and `scene.rotateLights`.
- A design that names a removed rig opens in the White loft studio (`doc/schema.js migrate`).
  The sample designs under `app/designs/` still name the old rigs and rely on this.
- Earlier engineering notes about the removed rigs are kept as history
  ([studio rigs](/engineering/app/studio-and-fabric-looks.md)).

# Consequence for materials

**[INFERRED]** How foil reads now depends on where the room's bright walls sit relative to the
camera: in the White loft at the owner's 170 degree turn, two-tone mystique shows its knit colour
where the foil faces away; at 0 and 90 degrees the bright walls fill every reflection and the foil
colour covers the whole garment.

[^owner]: Conversation with the product owner, 2026-10-27.
