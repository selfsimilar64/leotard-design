---
type: Decision
title: Soft body (fit realism stage 6) dropped
description: "Owner decision of 2026-11-11: 'the whole soft body thing is a wash, let's toss it'. The body's softness map, the soft contact in the GPU re-fit and its Python twins, the skin drawn pressed in (render/skin-dent.js) and its Settings face are removed; the body is rigid again. Kept from that work: the elastic spread over its 1 cm width, the band set on the fabric point by point, reloads keeping the view and the realistic skin."
tags: [decision, fit, soft-body, realism]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-11T23:30:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-11 (Claude Code session)
    title: "Yeah the whole soft body thing is a wash, let's toss it."
    author: human:mattj
  - id: plan
    resource: /engineering/app/fit-realism-plan.md
    title: Fit realism plan (stage 6 and its trials)
---

# Decision

The re-fit stands on a rigid body again and the skin is drawn as it is.[^owner] Removed:

- `body/mannequin.js soft` (the softness per canonical vertex) and the stage 6 compliance in the re-fit: `fit/refit-wgsl.js`
  (`Hit.k`, the body points' fourth value, `contact_k`), `fit/refit.js` (the body points' softness, `contacts()`),
  `fit/fitted-case.js buildCase` (`physics.soft`, `give`); the Python twins `pipeline/race/gpu.py`, `solvers.py`, `energy.py`,
  `export_app.py --give`, `check_energy.py`, `check_gpu.py`, `look_fit.py` (the commit that added them reversed whole).
- `render/skin-dent.js` (the pressed skin and its contact occlusion), `render/figure.js setDent`/`applyDentOcc`, `render/fitted.js`
  options `give` and `dent`, `redent`, `openingsInward`; `render/display.js` `fitGive` and `dent*` (a stored value is ignored); the
  Settings card's Pressed skin face (`ui/Studio.jsx PressedSkin`) and `CommitSlider`'s `def`/`log`; `dev/fit-stills.js`'s softness look.

Kept, as they stand without it:

- `fit/fitted-case.js elasticBand`: the elastic's pull spread over its 10 mm width (rows of points in from each opening), real elastic
  being the firm part of the band.
- `render/fitted.js fabricUnder`: a re-fitted band's profile set point by point on the fabric as drawn (no sawtooth where it crossed
  the fabric's flat triangles).
- `main.jsx keepView` and `doc/migrate-g9.js` keeping the realistic skin on load; the realistic skin finish itself.

# Context

Six versions of the pressed skin (2026-11-11) went from bumps per fit point to a groove of set cross-section, then to tuning bars in
the app; the owner judged the look by eye in their own configuration and found it not worth keeping. See the plan's stage 6
notes.[^plan]

[^owner]: Conversation with the product owner, 2026-11-11.
[^plan]: Fit realism plan, stage 6.
