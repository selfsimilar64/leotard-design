---
type: Decision
title: "No friction in the fit for now"
description: "Owner decision of 2026-11-02: the fit stays frictionless. A pose's fit is the garment settled in that pose (a fresh solve), not the garment just after moving into it, so the solver race runs without friction. Revisit later if needed."
tags: [decision, fit, friction, poses]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T23:59:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-02 (Claude Code session)
    title: "Let's skip friction for now. We can always rework it in or revisit it later if necessary"
    author: human:mattj
  - id: audit
    resource: /engineering/app/fit-solver-realism-audit.md
    title: Fit solver realism audit
---

# Decision

The fit stays frictionless for now.[^owner] What a pose shows is the garment settled in that pose: a fresh solve that depends only on the design, the body and the pose.

# Context

A frictionless re-solve moves the fabric 26-30 mm mean from the reused standing fit; real fabric lies somewhere between, since friction holds some of it back.[^audit] Published fabric-on-skin friction is roughly 0.3-0.6, higher on damp skin, and against the fit's 1-3.5 mmHg pressure the rough sizes of friction and of the tension differences that drive sliding are similar, so friction would move the result somewhat. Gymnasts' use of body adhesive and their adjusting of leotards after routines shows fabric both slides and stays slid. With friction a pose's fit depends on the path into the pose, which is arbitrary for a designer and costs time against the [5 s target](/decisions/2026-11-02-refit-under-five-seconds.md). Not measured: a moving-into-the-pose run in the reference simulator at several friction values was proposed and set aside.

# Consequences / how to apply

- The [solver race](/engineering/app/solver-race-plan.md) runs frictionless; no candidate needs to carry history from step to step.
- A pose fit is not "the garment just after moving"; don't describe it that way to users.

# Revisit if

- Designers need to see riding-up or creep after movement, or a pose's settled fit looks wrong where friction would plausibly have held the fabric.
- A later solver choice makes friction cheap (Vertex Block Descent handles it natively).

[^owner]: Owner's message, 2026-11-02
[^audit]: Fit solver realism audit
