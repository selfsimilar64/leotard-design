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

The solver race showed that without friction the garment slides along the body almost freely, so a pose's placement crept on for tens of seconds and different solvers settled 5-10 mm apart while agreeing on shape.[^race] With friction (young, local/global on the GTX 1650): poses settle in about 1 s at 0.3-0.6 mm mean and under 2.5 mm for 95% of points from the reference; the worst few dozen points (wrist ends, neckline, fabric off the body) stay 7-15 mm off, mostly where the reference itself is not settled. Standing and cutouts reach the full bar in 0.05-0.2 s, one cutout case in 7.5 s by its worst point. Weaker friction (0.25) or 2 mm of give gives the same picture; the settled fits move about 0.45 mm mean between those settings.

# Consequences / how to apply

- A pose shows the garment carried into it: the standing fit placed by surface coordinates, then relaxed only where tension beats friction. On back-arched it sits 27 mm mean from the frictionless answer and 1.5 mm from where it was placed. Don't describe a pose as a fresh settle.
- A re-fit's answer depends on where it started (friction is history). Re-fitting from a different start can give a slightly different, equally valid fit.
- A fit from nothing (the first standing fit, `wrap_block.solve`) stays frictionless; nothing is there to hold.
- Only the race code carries it so far; the app has no re-fit yet.

# Revisit if

- Designers need riding-up or creep after movement (this has no path into the pose, only the one jump).
- Fit looks stuck wrong where real fabric would have shifted (lower mu or more give).

[^owner]: Owner's message, 2026-11-03
[^race]: Solver race plan
[^skin]: Derler and Gerhardt 2012
[^ipc]: Li et al. 2020
