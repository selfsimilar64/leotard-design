---
type: Technique
title: Fit mesh resolution trial (7, 5, 3.5 mm)
description: "November 2026: the hybrid leotard (long sleeves) meshed at 7, 5 and 3.5 mm and re-fitted on the GPU on the older-teen body (about 16) in back-arched and passe. Four times the points costs 2.8 times per step (1.65 to 4.7 ms on the GTX 1650); 150 steps take 0.26, 0.43 and 0.73 s; finer meshes needed no more steps to come as close to their own long run."
tags: [fit, refit, gpu, webgpu, performance, mesh, resolution]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-10T15:40:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-10 (Claude Code session)
    title: "Experiment with higher garment mesh resolution; time a long-sleeve fit on a posed age-16 body at several resolutions"
    author: human:mattj
  - id: code
    resource: "pipeline/wrap_block.py (WRAP_STEP, STEP_TAG); app/src/fit/fitted-case.js, app/src/fit/refit.js; bench run from the browser console on the dev server (port 5176)"
    title: Mesh spacing option and the timing bench
    author: claude-code/claude-opus-5-5
  - id: refit
    resource: /engineering/app/refit-in-the-app.md
    title: The re-fit in the app
---

# Takeaway

The owner asked whether a finer garment mesh can still fit in acceptable time.[^owner] On the GTX 1650 the GPU re-fit's cost per
step grows more slowly than the mesh: twice the points costs 1.7 times, four times the points 2.8 times. At the app's 150 steps a
3.5 mm mesh (47k points) re-fits in about 0.73 s against 0.26 s at today's 7 mm. The finer meshes came as close to their own long
run in the same number of steps, so the step count need not grow with resolution on these poses.[^code]

# How it was run

- `pipeline/wrap_block.py` takes the mesh spacing from the environment: `WRAP_STEP=5 python pipeline/wrap_block.py --drafted hybrid-6 young`
  writes `app/captures/wrap-hybrid-6-s5-block.json` (`-s3p5` for 3.5 mm: the dev server's `/fitted-local/` route takes no dots).
  Unset, the spacing is 7 mm and the names are unchanged. Offline fit time to the basic-leg file (CPU; 5 and 3.5 mm
  ran at the same time, sharing it): about 3 min at 7 mm, 4.7 min at 5 mm, 11 min at 3.5 mm; the high cut follows in the same run.
- In the app (dev server, design with the hybrid leotard, body `older-teen`, pose set), each file was re-fitted as
  `render/fitted.js refit` does: `buildCase` on the live body, `Refit` with friction 0.4, no early stop, all but the last
  window in one run and the last window averaged. Timed from the run's start to the positions read back (GPU drained), the app
  drawing at the same time; the page was visible throughout (`document.hidden` false).
- **Distance left** is from the same mesh's own 1500-step run (mean / 95%, mm): how much the fabric would still move, not distance
  from a true answer. **Travel** is how far that 1500-step run moved from the carried start.

# Results (hybrid leotard, basic leg, long sleeves; older-teen)

| Mesh | Points | ms per step | 150 steps | 750 steps | Setup per pose (warm / first) |
|---|---|---|---|---|---|
| 7 mm (today) | 11,756 | 1.65 | 0.26 s | 1.24 s | 0.27 / 1.3 s |
| 5 mm | 22,994 | 2.8 | 0.43 s | 2.05-2.12 s | 0.25-0.28 / 1.4-1.5 s |
| 3.5 mm | 46,963 | 4.7 | 0.73 s | 3.45-3.57 s | 0.26-0.31 / 1.3-1.6 s |

Distance left from the 1500-step run, mean / 95% mm:

| Pose, mesh | travel | 50 steps | 150 | 300 | 750 |
|---|---|---|---|---|---|
| back-arched 7 mm | 5.9 / 20.8 | 2.12 / 8.4 | 1.31 / 5.4 | 0.84 / 3.5 | 0.39 / 1.5 |
| back-arched 5 mm | 4.1 / 16.1 | 1.29 / 5.3 | 0.70 / 2.8 | 0.51 / 2.0 | 0.28 / 1.1 |
| back-arched 3.5 mm | 3.9 / 20.0 | 1.44 / 8.8 | 0.77 / 4.5 | 0.54 / 2.9 | 0.26 / 1.3 |
| passe 7 mm | (not read) | 3.33 / 14.3 | 1.85 / 9.0 | 1.39 / 7.1 | 0.66 / 2.9 |
| passe 5 mm | (not read) | 2.38 / 10.5 | 1.31 / 6.7 | 0.85 / 3.6 | 0.48 / 2.2 |
| passe 3.5 mm | 5.3 / 26.9 | 2.37 / 12.1 | 1.30 / 6.3 | 0.87 / 4.0 | 0.42 / 2.0 |

(The 7 mm passe row and the 5 mm passe row come from the first version of the bench, which did not read travel; same method otherwise.)

- **Per step** grows sub-linearly: the GTX 1650 is not saturated at 12k points (fixed per-dispatch costs dominate), so 4x the points
  costs 2.8x.
- **Steps needed** did not grow: the finer meshes are as close to their long runs at 150 steps as 7 mm is, or closer. The usual worry
  (corrections cross a finer mesh one ring per iteration) does not show here, likely because the carried start is already close and the
  conjugate-gradient solve moves the whole garment each step **[INFERRED]**.
- **Setup per pose** (case built on the new body, trees refitted) stayed about 0.25-0.3 s at every resolution; the first fit after a
  load about 1.3-1.6 s.

# Not checked

- **Looks:** no render compared side by side; the finer fits are not listed in the app's Garment row (only loadable from the console).
- Distance from a common answer across resolutions (the meshes differ, so each is judged against itself).
- `FOLD_SMOOTH` (12 passes, "about 25 mm at 7 mm") smooths a shorter distance on a finer mesh, so the drawn folds would change
  character; not rescaled **[INFERRED]**. Elastic stiffness is already mesh-independent by construction.
- iPad, and the 3.5 mm file size (12.7 MB a garment against 3.4 MB).

[^owner]: Conversation with the product owner, 2026-11-10.
[^code]: Mesh spacing option and the timing bench.
[^refit]: The re-fit in the app.
