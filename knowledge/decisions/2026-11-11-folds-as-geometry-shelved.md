---
type: Decision
title: Folds as geometry (fit realism stage 2) shelved
description: "Owner decision of 2026-11-11: the trial of real folds in the fit (squeeze resistance, bending, a free-squeeze limit) is set aside; none of its looks was appealing, the arched back least of all. The code stays, off by default; revisit later if necessary. Owner's observations: on a regular garment folds appear only in very controlled, subtle form; the drawn garment has no ripples; the fitted blocks' ripples are less pronounced at 80% width and length."
tags: [decision, fit, folds, simulation]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-11T06:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-11 (Claude Code session)
    title: "The folds in general don't look good ... none of the arched back appearances is remotely appealing ... on a regular garment, folds typically only appear in very controlled and subtle form ... forget this Stage of the realism and let's revisit it later if necessary. We know the Drawn garment has no ripples at all. The other blocks ripples become less pronounced if the garment width and height are reduced to 80%."
    author: human:mattj
  - id: plan
    resource: /engineering/app/fit-realism-plan.md
    title: Fit realism plan, stage 2 and its sweeps
---

# Decision

Stage 2 of the [fit realism plan](/engineering/app/fit-realism-plan.md), folds as real geometry, is shelved; revisit later if
necessary.[^owner] The fit stays as it was before the trial: on the bare skin with a frictionless first phase, folds painted by the
fabric shader from the fit's squeeze ([the re-fit on the bare skin](/decisions/2026-11-10-fit-on-bare-skin.md)).

# Context

Three sweeps on the hybrid high cut at 3.5 mm (plan, stage 2): squeeze resistance alone gave no folds; at full strength the folds
were real but the garment read as loose; with squeeze free down to 85-90% of the length the standing fit stayed taut and folds fanned
from the armpit with the arm up, but the arched back still folded and rippled across the waist and seat. Owner: the folds in general
do not look good, none of the arched-back looks is remotely appealing; perhaps the settings, perhaps the garment does not fit the
body well at that size; on a regular garment folds appear only in very controlled and subtle form.[^owner][^plan]

Owner's observations to carry forward: the drawn garment has no ripples at all; the fitted blocks' ripples (the painted waves)
become less pronounced when the garment's width and length are reduced to 80%.[^owner]

# Consequences / how to apply

- Kept, off by default, so revisiting starts from working parts: `render/fitted.js` options `press` 0, `bend` 0, `jam` 1 (no
  control); the twins (`energy.py`, `gpu.py`, `solvers.py`, `refit-wgsl.js`, `refit.js hingesOf` with `app/test/hinges.test.js`);
  `export_app.py --press --bend --jam --tag`; `dev/fit-stills.js all(tag, { options, size })`. With these at their defaults the
  re-fit is the one before the trial (same kernels; `press` 0 leaves the target unchanged, `bend` 0 adds nothing to the matrix).
- No further work on the plan's stage 2 until the owner asks; the plan's later stages do not depend on it.
- How taut a garment looks is at least partly its size: a shorter pattern (95% length) already made standing visibly tauter.

# Revisit if

The owner asks for folds again, or a pose shows a fold the painted waves cannot suggest.

[^owner]: Conversation with the product owner, 2026-11-11.
[^plan]: Fit realism plan, stage 2 progress and sweeps (2026-11-10/11).
