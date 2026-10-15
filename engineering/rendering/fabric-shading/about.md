---
type: Section
title: Fabric shading
description: "How each leotard fabric family is shaded in real time: a GGX base plus optional sheen, anisotropy, coat, thin-film, diffraction and coverage layers, the custom techniques (foil dots, diffraction, velvet pile, mesh over skin, stretch, neon), starting values and calibration."
tags: [rendering, fabric, shading]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-shade
    resource: /references/research/realtime-fabric-shading.md
    title: "Research notes: real-time fabric shading"
    author: claude-code/claude-opus-5-5
---

Rendering techniques for the fabrics described under [/domain/fabrics/](/domain/fabrics/about.md),
distilled from the October 2026 shading research.[^notes-shade] Start with the
[per-fabric shading recipe](/engineering/rendering/fabric-shading/per-fabric-shading-recipe.md).
The target is what the owner decided: the result must **appear** correct to the eye, not be physically
exact ([decision](/decisions/2026-10-13-appears-correct-not-physically-correct.md)), on three.js
([decision](/decisions/2026-10-15-threejs-over-unreal.md)). The proof of concept's implementation is
[fabric shader](/engineering/poc/fabric-shader.md). Glitter, sequins and crystals (discrete sparkle)
are a separate topic.

[^notes-shade]: Research notes: real-time fabric shading (sources read 2026-10-13)
