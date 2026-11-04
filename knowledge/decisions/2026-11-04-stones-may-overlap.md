---
type: Decision
title: Stones may overlap; the live preview is the design
description: "Owner direction of 2026-11-04: stone patterns are never checked for stones touching, so what is shown during a drag is exactly the result; the designer spaces and sizes the stones. Opens the way to placing them on the GPU."
tags: [decision, stones, procedural, patterns, performance, gpu]
status: deprecated
superseded_by: /decisions/2026-11-04-pattern-stones-kept-apart.md
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T15:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-04 (Claude Code session)
    title: "Placing the stones using the GPU makes the most sense; we can just skip checking if the stones touch. Avoid showing something different after mouse up: the real live preview the whole time. Allow overlap and rely on the user to space and size accordingly."
    author: human:mattj
  - id: spec
    resource: /engineering/architecture/procedural-stone-patterns.md
    title: Procedural stone patterns
---

# Decision

**Superseded the same day for patterns** by [a pattern's stones are kept apart by the parallel rule](/decisions/2026-11-04-pattern-stones-kept-apart.md):
the owner chose the parallel rule as the look. The live preview stays the design, and two groups may still overlap.

Asked how to make pattern edits faster without band-aids, the owner chose placing the stones on the GPU and skipping
the check that stones do not touch.[^owner] Offered a fast preview during the drag with an exact tidy-up on release,
they declined: nothing may change after the mouse is released, the preview is the design the whole time. Overlap is
allowed, and the designer spaces and sizes the stones.[^owner] They also suggested making patterns that space
themselves (noise of a suitable kind, spacing following the stones' size).[^owner]

# Consequences

- No clearance check inside a pattern, nor between a pattern's stones and other groups' (see
  [the spec](/engineering/architecture/procedural-stone-patterns.md), pipeline step 4).[^spec]
- Spacing comes from how patterns are made: lines walk the stones' sizes, lattices draw at their spacing, scatters,
  clusters and galaxies take the first points of a ranked blue-noise tile, those spaced for their size.
- Each stone is kept or not on its own, so the same rule can run on the GPU, in 2D and 3D alike.
- Where a design asks for more than fits (big stones among small, crossing lines, squeezing distortions, two groups
  over each other), stones overlap on screen and in the counts, as designed.

[^owner]: Conversation with the product owner, 2026-11-04.
[^spec]: Procedural stone patterns.
