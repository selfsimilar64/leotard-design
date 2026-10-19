---
type: Decision
title: "Rendering target: appears correct, not physically correct"
description: ""Accurate" lighting and materials means looking right to the eye; physical correctness is not required."
tags: [rendering, accuracy]
status: stable
decided: 2026-10-13
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T20:30:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-13 (Claude Code session)
    title: "Meaning of accurate rendering"
    author: human:mattj
---

# Decision

"Accurate" lighting and materials means **"appears correct" to the eye**. It does not have to be
physically correct.[^owner]

# Consequences / how to apply

- Prefer cheaper, artist-tunable visual techniques over physically rigorous ones.
- Do not propose ray tracing or measurement-driven validation as requirements. Photographed
  swatches remain useful as a visual reference, not as a pass/fail metric.
- See the techniques under [/engineering/rendering/](/engineering/rendering/about.md).

[^owner]: Product owner, 2026-10-13
