---
type: Decision
title: The re-fit stands on the bare skin, settled without friction first; the older fit is kept
description: "Owner decision of 2026-11-10: a fitted garment's in-app re-fit runs on the bare skin with 150 frictionless steps before the usual 150 with friction (the look of the bridge probe's row 4), and is lit by its own shape; the older fit on the smoothed garment surface stays in the code to go back to, with no control for it. The fit realism plan's stage 0 baseline becomes in-app stills in a light matte lycra, no measurements and no reference photos."
tags: [decision, fit, refit, bridging, baseline]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-11T01:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-10 (Claude Code session)
    title: "Row 4 is the best-looking because the effect is less pronounced, which mimics real fabrics pretty closely ... we can put the row 4 fit into the app as long as we keep our old fit available at least in the backend ... You can just use camera angles and stills from in-app with a brighter matte lycra material"
    author: human:mattj
  - id: diagnosis
    resource: /engineering/app/hollows-on-bare-skin-diagnosis.md
    title: Why the re-fit does not span hollows on bare skin (diagnosis)
  - id: plan
    resource: /engineering/app/fit-realism-plan.md
    title: Fit realism plan
---

# Decision

The app's re-fit of a fitted garment stands on the **bare skin**, runs **150 steps without friction, then the usual steps with
friction anchored where it settled**, and is **lit by its own shape**. The older fit, on the drawn garment's smoothed surface
(skin plus the membrane's lift and the seat sheet), stays in the code to go back to; no control offers it.[^owner] Stage 0 of the
[fit realism plan](/engineering/app/fit-realism-plan.md) is in-app stills in a light matte lycra; there are no measurements and
no reference photos for it.[^owner]

# Context

The [diagnosis](/engineering/app/hollows-on-bare-skin-diagnosis.md) compared fits on captures of the hybrid high cut. The owner
judged row 4 (bare skin, frictionless first phase, own shading) the best-looking: the remaining dip at the bottom of the seat is
less pronounced and "mimics real fabrics pretty closely".[^owner][^diagnosis] The owner asked to keep the old fit "available at
least in the backend" in case of a revert, and set the baseline as in-app camera angles rather than measurements or photos.

# Consequences / how to apply

- `render/fitted.js`: `FIT_DEFAULTS.body` `'skin'` (default) or `'bridged'` (the older fit); `FREE_STEPS` = 150. A re-fit takes
  300 steps instead of 150: in the preview pane 1.8-2.9 s against 1.2-1.5 s for the older fit (wall time with the page drawing,
  not GPU time). Status reports both phases' steps.
- To go back: the display setting `fitBody: 'bridged'` (`render/display.js`, dev builds only) or
  `app.engine.fitted.setOptions({ body: 'bridged' })`. No control: Settings' Fabric fit face is exactly full at 1024 x 768 and
  no card may scroll ([interface principles](/decisions/2026-11-09-full-screen-stage-glass-interface.md)).
- The membrane, seat sheet and rolling ball still run: the drawn pieces stand on them, and the older fit needs them. Removing them
  for fitted garments (plan stage 1 step 7) waits until the older fit is no longer wanted.
- The fabric's contact shading (AO) still comes from the body's bridged lift; seam lines and trims are still placed along the
  body's normals.
- Stage 0 stills: `app/src/dev/fit-stills.js`, see the plan's stage 0.

# Revisit if

The owner, reviewing the fits in all poses, prefers the older fit somewhere; or the leg openings' creep up the cheeks (a side
effect of the frictionless phase) shows in a pose.

[^owner]: Conversation with the product owner, 2026-11-10.
[^diagnosis]: Why the re-fit does not span hollows on bare skin (diagnosis), captures and verdict.
