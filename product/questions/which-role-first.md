---
type: Open Question
title: "Which role should the first professional release serve?"
description: "Ordering the designer, seamstress and coach views determines what is built first."
tags: [question, product]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T20:55:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-15 (Claude Code session)
    title: Direction for the post-POC phase
    author: human:mattj
---

# Question

# Options and dependencies **[INFERRED]**

- **Designer first:** the garment data model (panels, seams, openings, straps) is the foundation
  everything else reads; templates for coaches and patterns for seamstresses both come out of it.
- **Seamstress first:** proves flattening and pattern output on today's fixed POC shapes, but those
  shapes are code, so it would be throw-away until the data model exists.
- **Coach first:** closest to the POC (recolour plus presets), but would need templates that only
  the designer view can make well.

# Recommendation

Designer-side data model first, with the seamstress output as its first proof (draw a panel, see
its flat piece), then the coach view as a restricted mode over published designs.

# Answer

Answered 2026-10-15: see [First release: designer tools, proven by pattern output](/decisions/2026-10-15-designer-first-proven-by-patterns.md).[^owner]

[^owner]: Product owner, 2026-10-15
