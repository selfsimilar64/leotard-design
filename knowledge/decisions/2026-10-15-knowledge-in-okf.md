---
type: Decision
title: "Keep all project knowledge in Open Knowledge Format"
description: "All knowledge produced as the project proceeds is saved in an OKF v0.2 bundle in the knowledge/ subdirectory."
tags: [meta, okf]
status: stable
decided: 2026-10-15
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T20:30:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-15 (Claude Code session)
    title: "Instruction to use OKF"
    author: human:mattj
---

# Decision

"As we proceed, save all knowledge in this format": the Open Knowledge Format, instantiated as a
repository in its own subdirectory of the project.[^owner]

# Consequences / how to apply

- The bundle lives at `knowledge/` and is its own git repository. Its rules are in
  [bundle conventions](/bundle-conventions.md).
- Existing research notes and the report were distilled into the bundle on 2026-10-15; the
  originals stay in place and are mirrored under [/references/research/](/references/research/about.md).
- Agents' auto-memory (Claude Code's per-user memory) keeps only short pointers and working
  preferences; durable project knowledge goes here.

[^owner]: Product owner, 2026-10-15
