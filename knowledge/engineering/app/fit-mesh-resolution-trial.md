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

# The mesh setting in the app (2026-11-10, dev only)

The owner asked for the finer meshes as options beside the re-fit's settings.[^owner] Settings, Fabric fit: **7 mm mesh / 5 mm mesh /
3.5 mm mesh** under "Re-fit it on the body shown" (`ui/Studio.jsx FittedFit`; `render/display.js fitMesh`, kept per computer;
`render/fitted.js FIT_DEFAULTS.mesh`, `FIT_MESHES`).

- **Dev only.** The finer files stay in `app/captures` (served at `/fitted-local/`, never shipped); `fitOptions` passes 7 outside dev and
  the row is hidden there.
- **Which file:** `fineFile` puts wrap_block's tag before the cut (`hybrid-6-block` to `wrap-hybrid-6-s5-block`). A garment without that
  file shows its 7 mm fit and the panel says so (the purchased block has none).
- **Changing it** (`FittedView.reload`) drops the garment and loads the other file with the view held on its last frame, then re-fits; stones
  re-lay on the new pieces.
- **Folds keep their reach.** A smoothing pass spreads about one edge, so `FOLD_SMOOTH` passes covered about 25 mm at 7 mm but only about
  12 mm at 3.5 mm. Passes now scale as 12 x (7 / spacing)^2 (24 at 5 mm, 48 at 3.5 mm): `fit/folds.js foldPasses`, twin
  `wrap_block.FOLD_PASSES` (7 mm unchanged; `test/folds.test.js` still passes).
- **Made for:** the hybrid (basic and high cut), Armstrong (basic and high cut), Aldrich's bodyshaper and Cole's stretch-knit leotard, at 5 and
  3.5 mm (`WRAP_STEP=5|3.5 python pipeline/wrap_block.py --drafted <block> young`).
- The card face still fits a 1024 x 768 window without scrolling (the explanation is a hover tip on each choice).
- **Checked in the app** (older-teen, passe, 150 steps, the app drawing meanwhile): all six garment choices load their finer fit and
  re-fit. 5 mm: 21.9-27.4k points, 0.45-0.57 s; 3.5 mm: 44.6-56.1k points (the bodyshaper the most), 0.83-1.05 s.

# Not checked

- **Looks** only at a glance: hybrid in passe on `older-teen`, 7 against 3.5 mm, both drawn cleanly (`app/captures/mesh-7-passe.png`,
  `mesh-3p5-passe.png`); the owner's judgement is the test.
- Distance from a common answer across resolutions (the meshes differ, so each is judged against itself).
- iPad, and the 3.5 mm file size (12.7 MB a garment against 3.4 MB).

[^owner]: Conversation with the product owner, 2026-11-10.
[^code]: Mesh spacing option and the timing bench.
[^refit]: The re-fit in the app.
