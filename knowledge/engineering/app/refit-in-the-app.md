---
type: Technique
title: The re-fit in the app (WebGPU) and its tuning page
description: "November 2026: today's local/global method with friction, ported from the solver race to WebGPU in the app (app/src/fit/), with a dev tuning page at /refit.html to trade speed against accuracy. 2 ms per step on the GTX 1650 (Python's Warp version 6 ms); matches Python to 0.002 mm after a step. A stop rule by window-averaged drift ends cutouts in 30-90 steps; poses keep sliding slowly and run to the step limit (750 steps, about 1.7 s)."
tags: [fit, refit, gpu, webgpu, performance, friction, determinism]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-03T22:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-03 (Claude Code session)
    title: "Fit must be deterministic: poses start from the standing pose; put it in the app with settings to tune performance against accuracy; average the last few positions to tell chatter from travel"
    author: human:mattj
  - id: code
    resource: "app/src/fit/refit.js, app/src/fit/refit-wgsl.js, app/src/fit/bvh.js, app/src/dev/refit-lab.js, app/refit.html, app/test/refit-bvh.test.js; pipeline/race/export_app.py"
    title: Port, tuning page and exporter
  - id: race
    resource: /engineering/app/solver-race-plan.md
    title: Solver race plan (friction, corrected)
  - id: friction
    resource: /decisions/2026-11-03-friction-on-refits.md
    title: Re-fits carry friction
---

# Takeaway

The race's winner now runs in the app's browser on WebGPU, with friction, at about 2 ms per step on the GTX 1650 (10 conjugate-gradient iterations; Python's Warp version 5.8 ms).[^code] A re-fit of 750 steps, the default limit, takes about 1.7 s including the stop rule's checks. Cutouts settle by the stop rule in 30-90 steps; poses do not settle by it within 750 steps because a few percent of the garment keeps sliding (the sleeve turning round the arm most).[^race] Open `/refit.html` on the dev server to tune.

# The tuning page

`/refit.html` (dev server only, cases git-ignored): a case picker (the race's seven young cases), the stop rule (window, tolerance, which points, step limit), solver effort (CG iterations, damping), friction (strength, give, grip change), and the garment shown as the last step or the last window's average, coloured by distance from the settled fit or by drift. It reports steps, time, ms per step, distance from the race's 120 s Newton reference (mean / 95% / worst), and a drift-per-window chart. "Check against Python" compares one and 20 steps with Python's own run. `window.lab` (`open`, `set`, `run`, `check`, `refit`) drives it from the console.

Cases come from `pipeline/race/export_app.py` (`app/captures/refit/<body>-<case>.json|.bin`, about 21 MB each, mostly the body surface). The app does not yet build a case from a live design: pattern pieces, seams, elastic and the body's pseudo-normals still come from the Python pipeline.

# How it works

- **Kernels** (`refit-wgsl.js`): query (closest point on the body part by a bounding-volume tree, side by the closest feature's pseudo-normal, the open-edge plane rule; `gpu.surface_at`), local step per triangle (`pd_tri_k`), spans, right side per point with friction (`pd_rhs_k`, `pd_friction_k`), then preconditioned CG (Warp's `cg`), block Jacobi by each point's exact 3x3 inverse (the block is a I + c n n^T + w (I - n n^T), so its inverse is closed-form). Reductions run in a fixed tree order, no atomics.
- **Body tree** (`bvh.js`): median split, 4 triangles per leaf, ties by index (the same tree every time). Each query starts bounded by the last step's closest point (it lies on the surface, so the true one is no farther), nearer child first. Without the bound the query cost 29 ms per step; with it the whole step costs 1.9 ms, and every point's closest point is identical to an unbounded search.
- **Layout:** 8 storage buffers and one uniform (`refit.js`), within WebGPU's default limits, so it should run on an iPad's browser unchanged (not tried).
- **Stop rule** (owner's suggestion[^owner]): every `window` steps each point's average over the window is compared with the previous window's; done when the chosen statistic (every point, or a percentile) of that drift is under the tolerance. Chatter cancels in the average, travel does not: over 100 late steps on a cutout, 96 points jumped over 1 mm per step but only 15 ended over 1 mm from where they began.

# Results (young, defaults: 10 CG, mu 0.4, 1 mm give)

Distance from the race's reference, mm mean / 95% / worst, the last window's average:

| case | start | 750 steps (about 1.7 s) | stop at 99% under 0.2 mm per 10 steps |
|---|---|---|---|
| standing-front-side-cutout | 0.18 / 0.73 / 9.8 | 0.10 / 0.33 / 7.4 | 30 steps, 0.07 s: 0.10 / 0.31 / 7.1 |
| standing-back-keyhole | 0.13 / 0.58 / 5.4 | 0.07 / 0.28 / 6.9 | 90 steps, 0.17 s: 0.07 / 0.25 / 6.2 |
| back-arched | 2.49 / 9.39 / 54.6 | 1.33 / 4.98 / 17.0 | not met in 750 |
| passe | 4.81 / 18.8 / 56.0 | 2.11 / 6.72 / 15.0 | not met |
| lunge-arms-up | 2.12 / 8.71 / 53.1 | 0.98 / 3.89 / 11.8 | not met |
| back-arched-back-keyhole | 2.41 / 8.61 / 56.6 | 1.18 / 4.61 / 13.8 | not met |

- Stricter rules (every point, or 99% under 0.05 mm) are never met on any case in 750 steps; looser (95% under 0.2 mm) stop every case at 20 steps, too early on passe (3.1 mm mean).
- On poses the reference is not a clean target: with friction the answer depends on the path, Newton and local/global come to rest in different places, the passe reference itself still moved 1.85 mm mean in its last 30 s, and 20 steps of local/global can be nearer it than 750 (lunge 0.63 against 0.98 mm mean). The largest difference is the sleeve turned round the upper arm.
- Same numbers as Python's race at the same step counts, so these are the method's, not the port's.

# Determinism

- **One device:** the same start and settings give bit-identical positions (checked in Warp; the WebGPU kernels have no atomics and reduce in a fixed order).
- **Across devices:** not identical. From starts with no point within rounding of the body, the app and Python agree to 0.002 mm mean after one step but 0.2 mm mean (1 mm at 99%, 3-4 mm worst) after 20: rounding differences grow wherever a point switches between touching and not. A desktop and an iPad will show slightly different fits of the same design and pose.
- **Order of edits and poses** (owner[^owner]): every pose starts from the standing fit of the same design placed by surface coordinates, and a posed edit from the standing fit of the edited design, never from another pose (`make_case.py` parent `standing-<cut>`), so the fit does not depend on what was shown before. A fixed step count, not wall time, ends a run, so a slower device does not stop earlier.

# Known limits

- The 750-step default is a time budget, not convergence, on poses.
- Cases are exported from Python; the app cannot yet build one from a live design.
- iPad untried; WebGPU on Safari exists but speed and the 0.2 mm cross-device drift are unmeasured there.

[^owner]: Conversation with the product owner, 2026-11-03.
[^code]: Port, tuning page and exporter.
[^race]: Solver race plan (friction, corrected).
