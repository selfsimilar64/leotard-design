---
type: Decision
title: "Re-fits carry friction: fabric stays where it was unless pulled hard enough"
description: "Owner decision of 2026-11-03, replacing 'no friction for now': a re-fit (a pose, or an edit such as a cutout) starts from the fit already there and friction holds each point pressing on the body where it was until the fabric pulls it harder than Coulomb friction allows (mu 0.4, 1 mm of give). Frictionless, the garment's placement along the body never settled within the 5 s target; with friction a pose settles in about 1 s. A pose now shows the garment carried into the pose, not a fresh frictionless settle."
tags: [decision, fit, friction, poses, solver]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-03T20:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-03 (Claude Code session)
    title: "Yes please add a cheap stand-in for friction on re-fits"
    author: human:mattj
  - id: race
    resource: /engineering/app/solver-race-plan.md
    title: Solver race plan (stages 2-5, and friction)
  - id: skin
    resource: "S. Derler and L.-C. Gerhardt, Tribology of skin: review and analysis of experimental results for the friction coefficient of human skin, Tribology Letters 45 (2012) 1-27"
    title: Friction of human skin (review)
  - id: ipc
    resource: "M. Li et al., Incremental Potential Contact, ACM Transactions on Graphics 39(4) (2020)"
    title: Lagged, smoothed friction in an implicit solver
---

# Decision

A re-fit carries friction.[^owner] Every point pressing on the body resists sliding along it from where the re-fit found it, with Coulomb's force: mu times its contact force, after 1 mm of give. Fabric not pressing on the body (bridging a hollow) has none. Supersedes [no friction for now](/decisions/2026-11-02-no-friction-for-now.md).

Values: mu = 0.4, fabric on dry skin (about 0.5 in the skin review, polyamide fabrics lowest[^skin]); 1 mm give (`STICK`), the smoothing that keeps it solvable. The contact force and the body normal are held through each solver step from that step's start, as IPC does[^ipc]. Code: `pipeline/race/gpu.py` (`friction_k`, `pd_friction_k`; `MU`, `STICK`), twin `pipeline/race/energy.py` (`friction`), checked by `check_gpu.py`.

# Context

The solver race showed that without friction the garment slides along the body almost freely, so a pose's placement crept on for tens of seconds and different solvers settled 5-10 mm apart while agreeing on shape.[^race] With friction (young, local/global on the GTX 1650; corrected the same day for a bug that gave points resting on the body a random normal, and so extra grip): standing and cutouts settle within about 0.1 mm mean; poses end 1.2-2.2 mm mean from the reference after 20 s and keep sliding slowly, the sleeve turning round the upper arm most (frictionless: 1.8-11 mm). A first report of poses settling in about 1 s at 0.3-0.6 mm was that bug. Weaker friction (0.25) or 2 mm of give gave the same picture before the correction; not re-run since.

# Consequences / how to apply

- A pose shows the garment carried into it: the standing fit placed by surface coordinates, then relaxed only where tension beats friction. On back-arched it sits 2.5 mm mean from where it was placed (before the correction: 27 mm mean from the frictionless answer, not re-measured). Don't describe a pose as a fresh settle.
- A re-fit's answer depends on where it started (friction is history). Re-fitting from a different start can give a slightly different, equally valid fit.
- So that the same design and pose always show the same fit (owner, 2026-11-03): every pose starts from the standing fit of the same design, placed by surface coordinates, and a posed edit from the standing fit of the edited design, never from whatever was shown before; a run ends after a step count or a stop rule, never wall time. Bit-identical on one device; a different GPU can differ by a fraction of a millimetre ([re-fit in the app](/engineering/app/refit-in-the-app.md)).
- A fit from nothing (the first standing fit, `wrap_block.solve`) stays frictionless; nothing is there to hold.
- The race code and the app's WebGPU re-fit carry it (`app/src/fit/`, tuning page `/refit.html`); the app does not yet re-fit a live design.

# Revisit if

- Designers need riding-up or creep after movement (this has no path into the pose, only the one jump).
- Fit looks stuck wrong where real fabric would have shifted (lower mu or more give).

[^owner]: Owner's message, 2026-11-03
[^race]: Solver race plan
[^skin]: Derler and Gerhardt 2012
[^ipc]: Li et al. 2020
