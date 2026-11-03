---
type: Decision
title: "A re-fit takes under five seconds"
description: "Owner target of 2026-11-02: any given re-fit of the garment, after a structural edit or on a pose, comes in under 5 seconds, so it can happen several times in a design session without interrupting the design flow. The target for the fit solver's speed work."
tags: [decision, fit, performance, refit]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T23:59:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-02 (Claude Code session)
    title: "We want any given re-fit to come in under 5 seconds"
    author: human:mattj
  - id: baseline
    resource: /engineering/app/refitting-after-an-edit.md
    title: Refitting after an edit
---

# Decision

Any given re-fit comes in under 5 seconds. The owner's reasons: it may happen several times in a design session, and 5 seconds is close enough to instant that it neither interrupts the design flow nor causes friction.[^owner]

# Context

The fit solver's realism audit ended with no physics added, and found that carrying a standing fit into a pose is the largest error measured, so a realistic fit means a fresh solve per pose whenever the garment meaningfully changes. The speed baseline: a pose re-solve settles in about 480 iterations, 394 s in the offline Python solver, and a standing fit from nothing takes 260 s.[^baseline] The target is roughly 80 times faster than a pose re-solve today.

# Consequences / how to apply

- Speed work is judged against 5 s on the target hardware (desktop and iPad), not against the development machine's Python.
- Cheaper steps alone will not reach it: the baseline's larger cost is the number of iterations, so a solver that settles in fewer iterations, starting from the nearest fit already known, is needed as well.[^baseline]
- A re-fit means one pose: 5 s per pose, not for every pose a design shows.[^owner]
- Accuracy against a settled fit: mean 1 mm, 95% 3 mm, max 5 mm is accepted as the bar, and the owner would accept somewhat less if it is much faster: "I don't want to rule out techniques that are slightly less accurate but potentially much faster if they get the job done well enough."[^owner] So report time against accuracy as a curve, not only time to the bar.

# Revisit if

- The 5 s target is met only with an error a designer would notice, or the owner decides poses may fill in after the standing fit.

[^owner]: Owner's message, 2026-11-02
[^baseline]: Refitting after an edit
