---
type: Decision
title: "Defer competition-rule checks and pain-point research"
description: "FIG / USA Gymnastics / NCAA attire checks and coach/parent pain-point research are out of scope for now."
tags: [scope, rules]
status: stable
decided: 2026-10-13
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T20:30:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-13 (Claude Code session)
    title: "Scope answer after the research report"
    author: human:mattj
---

# Decision

Competition attire-rule checking (FIG, USA Gymnastics, NCAA) and research into coach and parent
pain points are **deferred**: "don't worry about" them for now.[^owner]

# Consequences / how to apply

- Do not add rule-checking features unless asked. The rule knowledge is kept in
  [/domain/rules/](/domain/rules/about.md) for later.
- The role-based product direction of 2026-10-15 makes coaches a named user group, so this
  deferral is worth re-confirming before designing the coach experience (see
  [open questions](/product/questions/about.md)).

# Revisit if

Coaches or gyms become the first users to ship to; a live "legal to compete" indicator was one of
the research report's strongest selling points for them.

[^owner]: Product owner, 2026-10-13
