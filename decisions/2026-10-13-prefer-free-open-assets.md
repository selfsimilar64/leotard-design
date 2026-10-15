---
type: Decision
title: "Prefer free and openly licensed assets"
description: "Work from free, openly licensed data and tools (CC0, MIT, Apache, unencumbered GPL output) rather than buying assets."
tags: [assets, licensing]
status: stable
decided: 2026-10-13
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T20:30:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-13 (Claude Code session)
    title: "Choice of free sources over a paid pattern and body scan"
    author: human:mattj
---

# Decision

Offered a CA$19 commercial leotard pattern versus drafting from free sources, the owner chose to
"use any free resources you have access to to come to the most accurate possible design". They
also picked the open-licence MakeHuman body over MetaHuman or a paid scan, and approved the
portable Blender 4.5.14 LTS and MPFB 2.0.18 tooling.[^owner]

# Consequences / how to apply

- Default to free, openly licensed data and tools. Mention a paid option only when it clearly
  beats the free route, and ask before buying anything.
- This is one answer during the POC stage, interpreted as a preference, not a permanent rule.
  A commercial product may need to revisit licences (see
  [/engineering/geometry/](/engineering/geometry/about.md) for body-model licensing).

[^owner]: Product owner, 2026-10-13
