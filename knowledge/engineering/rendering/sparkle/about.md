---
type: Section
title: Sparkle rendering
description: "Techniques for rendering glitter, spangles and crystals in real time: glint models, crystal optics look-alike, the proposed four-level stone LOD, instancing at scale, lighting, observer/glare, tone mapping, temporal stability and validation."
tags: [rendering, sparkle, glint, crystal]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: srr
    resource: /references/research/realtime-sparkle-rendering.md
    title: "Research notes: real-time sparkle rendering"
    author: claude-code/claude-opus-5-5
---

Distilled from the real-time sparkle research note[^srr]. **Sparkle is three problems**: glitter
(millions of sub-pixel flakes, handled statistically — largely solved), spangles/sequins (flat
mirrors, instanced then folded into a glint lobe), and crystals (faceted stones, custom and unproven
at scale). The rendering target is "appears correct" to the eye, not physical correctness
([decision](/decisions/2026-10-13-appears-correct-not-physically-correct.md)); the engine is three.js
([decision](/decisions/2026-10-15-threejs-over-unreal.md)).

- Flakes: [glitter glint models](/engineering/rendering/sparkle/glitter-glint-models.md),
  [coloured and holographic glitter](/engineering/rendering/sparkle/coloured-and-holographic-glitter.md).
- Discrete elements: [spangle and sequin rendering](/engineering/rendering/sparkle/spangle-and-sequin-rendering.md),
  [crystal optics look-alike](/engineering/rendering/sparkle/crystal-optics-look-alike.md),
  [crystal LOD chain](/engineering/rendering/sparkle/crystal-lod-chain.md) (team's own, unvalidated),
  [stone instancing at scale](/engineering/rendering/sparkle/stone-instancing-at-scale.md).
- Image formation: [lighting for sparkle](/engineering/rendering/sparkle/sparkle-lighting.md),
  [temporal stability and HDR](/engineering/rendering/sparkle/sparkle-temporal-stability-and-hdr.md),
  [observer and glare model](/engineering/rendering/sparkle/observer-and-glare-model.md),
  [tone mapping](/engineering/rendering/sparkle/tone-mapping-pbr-neutral.md).
- Proof: [validation by sparkle statistics](/engineering/rendering/sparkle/sparkle-validation.md),
  [prior art and code](/engineering/rendering/sparkle/sparkle-prior-art-and-code.md).

Domain facts about the physical objects: [/domain/embellishments/](/domain/embellishments/about.md).
What the proof of concept does today: [/engineering/poc/stones.md](/engineering/poc/stones.md).

[^srr]: Research notes: real-time sparkle rendering (in-bundle mirror)
