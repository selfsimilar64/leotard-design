---
type: Decision
title: "The moodboard is the designer tool's acceptance set"
description: "Any design in the owner's 138-photo moodboard must be achievable with in-app tools; the owner will test the finished tool by handing over one leotard photo to rebuild, judged on form and appearance."
tags: [scope, designer, moodboard, acceptance]
status: stable
decided: 2026-10-18
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-18T20:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-18 (Claude Code session)
    title: Moodboard brief and recreation test
    author: human:mattj
---

# Decision

The designer-facing app is to be built so that **any one of the designs in `moodboard/` can be
achieved with in-app tools**. The owner asked for the tool space, the supporting mechanisms, the
frictionless design flow, realism upgrades within 60 fps and a plan, and said **not to execute the
plan yet**. After it has been executed, the owner will hand over one specific leotard image to be
recreated with the app's tools, judged on how accurately it is recreated in **form and visual
appearance**.[^owner]

# Test conditions (owner, 2026-10-18)

- The owner supplies **front and back photos** of one leotard; the agent may analyse and describe
  them in any way to turn them into tool uses.
- The result may be shown **on the mannequin**; more realistic bodies are wanted eventually, not for
  the test.
- **No time limit.**
- The agent may **drive the app through its command interface** (`app.exec`) rather than the mouse.[^owner]

# Context

The owner stressed the degree of variation between designs: unique stone patterns, fabric
sectioning and back strap designs.[^owner] The teardown is in [/domain/moodboard/](/domain/moodboard/about.md).

# Consequences / how to apply

- The [roadmap](/product/roadmap/moodboard-coverage-roadmap.md) gates every phase on rebuilding
  moodboard benchmark designs, and ends with a rehearsal using the same protocol as the test.
- Every tool is drivable through the same command layer as the UI
  ([document model](/engineering/architecture/design-document-model.md)), so the test is run with the
  designer's own tools.
- Execution waits for the owner's go-ahead.

# Revisit if

The owner changes the acceptance set, or the test conditions (one photo or several views, mannequin
or athlete body) turn out different from what the plan assumes.

[^owner]: Product owner, 2026-10-18
