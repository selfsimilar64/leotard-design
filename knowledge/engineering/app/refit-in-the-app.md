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

# Stop rule setting (owner, 2026-11-03)

The owner found every point under 1.75 mm per 10-step window stopping passe in 0.2 s, and 1.5 mm never stopping (its chatter sits above 1.5 mm), and proposed 1.75-2 mm globally.[^owner] Default set to 2 mm, every point, window 10, limit 750 kept as the backstop. On the seven young cases (last window's average; distance mean / 95% / worst, mm):

| case | steps at 1.5 / 1.75 / 2 mm | at 2 mm against 750 steps | at 2 mm against the reference (750 steps) |
|---|---|---|---|
| standing | 50 / 50 / 30 | 0.13 / 0.74 / 6.4 | 0.13 (0.05) |
| back-arched | 750 / 340 / 190 | 0.36 / 1.49 / 6.0 | 1.24 (1.33) |
| passe | 750 / 130 / 130 | 0.85 / 4.82 / 8.9 | 2.34 (2.11) |
| lunge-arms-up | 90 / 50 / 50 | 0.54 / 2.22 / 6.0 | 0.67 (0.98) |
| standing-back-keyhole | 170 / 130 / 70 | 0.03 / 0.14 / 2.2 | 0.07 (0.07) |
| standing-front-side-cutout | 30 / 30 / 30 | 0.04 / 0.16 / 4.8 | 0.10 (0.10) |
| back-arched-back-keyhole | 750 / 90 / 60 | 0.60 / 2.75 / 7.2 | 1.00 (1.18) |

- Every case stops by 340 steps (about 0.75 s on the GTX 1650), most by 130 (0.3 s). Standing and cutouts end within 0.13 mm mean of a full run; poses 0.3-0.85 mm, passe leaving 5% of the garment about 5 mm short of where 750 steps take it. Against the reference an early stop is as close as a full run, or closer (the slow late sliding does not head for it).
- The rule really means "stop once the worst chattering point calms under the threshold", so it is tuned to these cases' chatter. A design, body or mesh size with louder chatter runs to the step limit (slower, still bounded); the stop step also varies with noise (back-arched 340 at 1.75 mm, 190 at 2 mm). It allows up to 0.2 mm per step of real travel. The threshold is per window: changing the window changes its meaning.
- Percentile rules (99% under 0.3-0.5 mm) did no better: cutouts in 20-30 steps, but back-arched never stops and passe and the posed cutout take 240-530.

# The step count is the lever (owner, 2026-11-03)

The owner then dropped the threshold as the rule: some poses or designs may never get under any threshold, even averaged, while a step count always ends and trades accuracy for time.[^owner] Defaults now: 150 steps, early stop off (`tol` 0; it stays available). Distance from a 750-step run at each step count (last window's average, mm mean / 95%; about 2.2 ms per step):

| steps | time | standing | standing cutouts | lunge-arms-up | back-arched (and with keyhole) | passe |
|---|---|---|---|---|---|---|
| 30 | 0.07 s | 0.13 / 0.74 | 0.04 / 0.16-0.19 | 0.74 / 2.98 | 0.77-0.79 / 3.8-3.9 | 1.72 / 8.16 |
| 50 | 0.11 s | 0.09 / 0.46 | 0.03-0.04 / 0.14-0.16 | 0.54 / 2.22 | 0.62 / 2.9-3.0 | 1.37 / 7.20 |
| 100 | 0.22 s | 0.05 / 0.24 | 0.03 / 0.13-0.14 | 0.38 / 1.68 | 0.48-0.49 / 2.1-2.2 | 0.98 / 5.53 |
| 150 | 0.33 s | 0.04 / 0.20 | 0.03 / 0.11-0.13 | 0.32 / 1.39 | 0.40-0.42 / 1.7-1.8 | 0.77 / 4.31 |
| 300 | 0.66 s | 0.03 / 0.12 | 0.02-0.03 / 0.09-0.11 | 0.23 / 0.94 | 0.30-0.31 / 1.2 | 0.48 / 2.61 |
| 500 | 1.1 s | 0.02 / 0.07 | 0.02-0.03 / 0.08-0.10 | 0.15 / 0.51 | 0.19-0.20 / 0.7 | 0.28 / 1.12 |

- Standing and cutouts are done by 30-50 steps; poses keep closing on the 750-step run, passe slowest.
- The 750-step run is not an end point either (slow sliding goes on), and against the race's reference the best step count differs by pose: lunge is closest at 20-30 steps (0.61 mm mean, 0.98 at 750), back-arched at 30 (1.16, 1.33 at 750), passe keeps improving (3.68 at 10, 2.11 at 750).
- The window still sets how often drift is read back for the chart (each read is a short wait).

# Owner's first look (2026-11-03): skin through, folds, underarm seams

The owner saw skin showing through, fabric that seemed folded over itself, and underarm seams that curve where photographed leotards show a near-square cross of straight seams (side seam running on into the sleeve seam, the armhole crossing it).[^owner] `pipeline/race/look_fit.py` measures each; the page gained seams, colour by panel, a display lift and an underarm camera.

- **Skin through: the page's drawing, not the fit.** Points sit on the skin (at most 0.3-2 mm in) but a flat 7 mm triangle between them dips under a curved arm: 4-6% of triangle interiors are over 0.2 mm inside, the deepest 2.6-3.5 mm, and the page drew them unlifted on a coarse depth buffer, so the whole sleeve showed a lattice of skin. The app's viewer lifts the fabric (`wrap-eval.js`); the page now draws it 1 mm out along each triangle's outward side (`facing`) with a logarithmic depth buffer, display only.
- **Folding over itself: physics the model leaves out.** No bending stiffness, compression free down to GATHER (half size), and no fabric-on-fabric contact, so excess fabric crumples into sharp creases that can pass through each other: 176-178 edges folded past 120 degrees even standing (about 40% within 6 cm of an underarm), 280-320 on back-arched and passe; 3-46 triangles inside out.
- **Underarm seams.** Arms down (standing), the sleeve's extra underarm fabric (stretch sleeves are drafted for arms partly out) bunches: side seam and sleeve seam folded onto each other (32-35 degrees apart), armhole seams sagging 15-24% of their chord over 40 mm. Arms up (lunge-arms-up, passe), the side seam runs on into the sleeve seam within 3-15 degrees of straight and both stay straight (1-3% sag), and the armhole crosses at 75-88 degrees, as in the photos; but the armhole dips into a U at the underarm. Part of its curve is the loop round the arm (a 5 cm radius loop sags about 10% over 40 mm; measured 6-12%). The dip is the start: the standing fit is carried onto the posed skin, which stretches in the armpit, and friction keeps much of that shape. With friction off, 750 steps visibly flatten the U.
- **Not checked:** whether the armhole seam lies on the body's arm/torso split, where sleeve and bodice points see different body surfaces (a suspect for the crumpling at the junction).

# In the main app (2026-11-04)

The re-fit now runs in the main app for fitted garments, on a case built live from the body shown: see
[fitted garments in the app](/engineering/app/fitted-garments-in-the-app.md). `Refit` takes an optional `cache` so a new pose
rebuilds nothing that did not change (compiled programs, constant matrix, gathers; body trees refitted by `refitBVH`) and has
`destroy()` for its buffers. Drawn designs still have no case.

# Known limits

- The 750-step default is a time budget, not convergence, on poses.
- The tuning page's cases are exported from Python; the main app builds one live only for a fitted garment, not for drawn designs.
- iPad untried; WebGPU on Safari exists but speed and the 0.2 mm cross-device drift are unmeasured there.

[^owner]: Conversation with the product owner, 2026-11-03.
[^code]: Port, tuning page and exporter.
[^race]: Solver race plan (friction, corrected).
