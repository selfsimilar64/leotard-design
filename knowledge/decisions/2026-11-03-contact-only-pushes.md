---
type: Decision
title: "The body only pushes; slack fabric is held weakly"
description: "Owner decision of 2026-11-03 for the fit's contact: the body pushes fabric out but never pulls it in, so taut fabric bridges hollows (underarm, small of the back) as real fabric does; a weak hold (HOLD = 1e-4), standing in for the gravity and cling the model leaves out, keeps slack fabric settling onto the body. Replaces today's two-sided pull in the solver race's energy."
tags: [decision, fit, contact, solver]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-03T12:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-03 (Claude Code session)
    title: "Yes go with option 1, and proceed with stages 2-5 of the plan"
    author: human:mattj
  - id: plan
    resource: /engineering/app/solver-race-plan.md
    title: Solver race plan (stage 1, smooth surface term)
---

# Decision

Contact is one-sided: the body surface pushes fabric out of it and never pulls fabric onto it.[^owner] Fabric outside the body feels only a weak hold, `HOLD / 2 * d^2` per point with HOLD = 1e-4 (PLANE, the push, is 300). Option 1 of three put to the owner; the others were today's two-sided pull with an exact distance (more suction into hollows) and a distance built to copy today's accidental bridging.[^plan]

# Context

Stage 1 found that today's solver lets fabric bridge hollows only by accident: it measures distance to the tangent plane of a body vertex up to 20 mm away. An exact distance pulls that fabric into the hollow (92 points of the back-arched fit, underarm and back). Real stretch fabric under tension bridges hollows and contact only pushes, but the model has no gravity and no bending, so slack fabric with push-only contact would have nothing holding it to the body; the hold stands in for those.

HOLD's size: with the fabric's stretch modulus (300-1000 N/m, spandex jersey) as the energy's unit, 1 cm off the body the hold pulls a point with about 4-12 times the weight of the fabric it carries. A span across a 6 cm hollow at 10% stretch resists being pulled in about 90 times harder, so taut fabric bridges (sagging about 1% of the hollow's depth) and only slack fabric follows the hold. A modelling stand-in, not measured.

# Consequences / how to apply

- The race's energy (`pipeline/race/energy.py` contact='push', `gpu.py`) uses it; `wrap_block.solve`, the app's solver today, does not yet.
- Loose fabric has almost no stiffness, which slows every solver: Newton's reference keeps a dither of about 0.1 mm mean and 1-2 mm at a few spots ([solver race plan](/engineering/app/solver-race-plan.md), stage 3).
- Changing HOLD is a physics change for the owner, not a tuning knob for speed.

[^owner]: Owner's message, 2026-11-03
[^plan]: Solver race plan (stage 1)
