---
type: Roadmap
title: Fit realism plan
description: "Plan of 2026-11-10 for making the fit simulation the one realistic fit: a baseline, then hollows bridged by the fit's own tension on the bare skin, folds as real geometry (the owner's priority), elastic as a band, direction-dependent fabric, a friction ramp for poses with a per-body standing fit, and a soft body. Each stage has its code touchpoints, twins, gate and expected cost; nothing is built yet."
tags: [roadmap, fit, simulation, folds, elastic, bridging, performance]
status: draft
generated: { by: claude-code/claude-fable-5-2, at: 2026-11-10T20:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-10 (Claude Code session)
    title: "How can we make the fit simulation more realistic; folds are really important to get right; hesitant to solve poses by interpolating from standing; write a cohesive plan"
    author: human:mattj
  - id: one-sim
    resource: /decisions/2026-11-08-one-fit-simulation.md
    title: One fit simulation carries the whole fit
  - id: audit
    resource: /engineering/app/fit-solver-realism-audit.md
    title: Fit solver realism audit
  - id: bridging
    resource: /engineering/geometry/fabric-bridging-hollows.md
    title: Fabric bridging hollows
  - id: mesh
    resource: /engineering/app/fit-mesh-resolution-trial.md
    title: Fit mesh resolution trial
  - id: refit
    resource: /engineering/app/refit-in-the-app.md
    title: The re-fit in the app
  - id: block-fit
    resource: /engineering/app/fitting-a-block-like-the-app.md
    title: Fitting a block like the app
  - id: code
    resource: "app/src/fit/refit.js, refit-wgsl.js, fitted-case.js, folds.js; app/src/render/fitted.js; app/src/materials/fabric.js, fabric-node.js; pipeline/race/gpu.py, solvers.py, energy.py; pipeline/wrap_block.py (read 2026-11-10)"
    title: The fit's code as read for this plan
  - id: diagnosis
    resource: /engineering/app/hollows-on-bare-skin-diagnosis.md
    title: Why the re-fit does not span hollows on bare skin (diagnosis)
  - id: shelved
    resource: /decisions/2026-11-11-folds-as-geometry-shelved.md
    title: Folds as geometry (fit realism stage 2) shelved
  - id: folds-cut
    resource: /decisions/2026-11-11-folds-cut-length-and-dressing.md
    title: Fewer painted folds, blocks cut 12% shorter, poses fitted from a standing fit
  - id: bare-skin
    resource: /decisions/2026-11-10-fit-on-bare-skin.md
    title: The re-fit stands on the bare skin, settled without friction first; the older fit is kept
---

# Takeaway

Six stages after a baseline, in the order agreed with the owner: **(1) hollows bridged by the fit itself, (2) folds as real
geometry, (3) elastic as a band, (4) fabric that differs along and across, (5) poses by a friction ramp plus a standing fit per
body, (6) a soft body.**[^owner] Folds are the owner's priority and the largest unknown, so their trial comes second, as soon as
stage 1 gives fabric room to leave the body. Poses are **not** solved by stepping from standing: the owner is hesitant about the
work and the compute, and a friction ramp is the cheaper route.[^owner] Nothing here is built; every number marked as expected is
an estimate **[INFERRED]** from measured per-step costs.[^mesh][^refit]

# Where the fit stands (read 2026-11-10)

- **Solver:** local/global (projective dynamics) on WebGPU, `app/src/fit/refit.js` + `refit-wgsl.js`, twin `pipeline/race/gpu.py`,
  `solvers.py`, `energy.py`. One step: `query` (closest body point per fabric point), `tri` (local step), `spring` (elastic), `rhs`,
  then `cgIters` = 10 conjugate-gradient iterations on a constant matrix (`constantMatrix`) plus per-point contact and friction.[^code]
- **Fabric:** per triangle the two singular values of the deformation gradient are clamped to [`gather` 0.5, 1]: stretch is charged,
  linearly and the same in every direction; **shrinking to half size is free**. No bending, no fabric-on-fabric contact.[^code]
- **Contact:** push only (`plane` 300) with a weak hold (`HOLD` 1e-4) and friction (`mu` 0.4, `stick` 1 mm) from the start's
  positions (`BLOCK.A`), against **the lifted garment surface** (`man.garmentPos`: skin + membrane + seat sheet), not the skin.[^bridging]
- **Elastic:** tension-only springs along each opening's edge (`si`, `sj`, `k`, `rest_len`), front leg 1.0, back leg 0.75, neck and
  wrist 0.95, strength from `ELASTIC_WIDTH` 20 mm, an estimate.[^block-fit]
- **Start:** the standing fit made offline on `young` by `pipeline/wrap_block.py` (CPU, two-sided contact, frictionless), carried to
  the body shown by surface coordinates (`startOf`), then 150 steps.[^refit]
- **Folds:** place, direction and depth from the fit (`fit/folds.js foldsOf`); the ridges are a 20 mm wave in the fabric shader's bump
  (`materials/fabric.js`, `fabric-node.js`, strength `.25` by eye). The surface stays smooth.[^code]
- **Cost (GTX 1650, 150 steps):** 0.26 s at 7 mm (11.8k points), 0.43 s at 5 mm, 0.73 s at 3.5 mm (47k); setup per pose 0.25-0.3 s
  warm.[^mesh]

# Rules for every stage

- **Twins change together:** `refit-wgsl.js` with `gpu.py` / `solvers.py` / `energy.py` (checked by the tuning page's "Check against
  Python" and `check_gpu.py`); `fit/folds.js` with `wrap_block.folds_of` (`test/folds.test.js`); `fitted-case.js` constants with
  `gpu.py`. A new term gets a finite-difference gradient check in `energy.py` first, as the solver race did.
- **Trial on the tuning page first** (`/refit.html`, `app/src/dev/refit-lab.js`), behind a setting; into the main app only after
  the owner's review. Dev scripts open their own design: never in the owner's tab.
- **Deterministic:** fixed step counts per phase, starts that depend only on design, body and pose.
- **Shown only once fitted**, with the busy note, as now.
- **No band-aids:** a stage that only works with a region-specific fix is reported to the owner, not patched.
- **Judged by the owner's eye** on captures in a light leotard and a striped print, beside photos of real leotards; no physical
  testing. Measures support the judgement, they do not replace it.
- **After each stage:** this plan's results section, the affected concepts, `okf.py check` / `index`, the log, a commit.

# Stage 0: baseline

So every later stage has a "before". Also closes the audit's open step 6 (photo comparison).[^audit]

- A dev capture script (own design, hybrid high cut): bodies `young`, `older-teen`, `child`; poses standing, `back-arched`, `passe`,
  `lunge-arms-up`; views seat, small of the back, front, underarm, leg opening close-up; light leotard and a striped print; 7 and
  3.5 mm mesh.
- Measures per case: fabric sink at the midline over the cleft at 2/4/6/10/14 cm above the crotch, at the navel and the spine
  groove; leg opening half width at 7 and 10 cm, its lowest point below the crotch and sharpest turn; folded area per piece; points
  inside the body; re-fit time and setup time (page visible, GPU drained).
- The owner picks reference photos (moodboard) for seat, back waist, underarm and leg opening.
- **Gate:** captures and a table recorded here; the owner has seen them.

**Changed by the owner (2026-11-10):** no measurements and no reference photos; the baseline is in-app stills in a light matte
lycra.[^bare-skin] Owner, on the first set: only the body the garment is sized for (the hybrid is drafted for `young`; on other
bodies the stills show a wrong size, not the fit), and a blue-teal, not an off-white (white fabric on the white mannequin and
backdrop was unreadable).[^owner] **Taken 2026-11-10** with `app/src/dev/fit-stills.js` (resumable; keeps and restores the
page's autosave): hybrid high cut at 7 mm, matte lycra `#2a9db0`, body `young`; poses standing, `back-arched`, `passe`,
`lunge-arms-up`; views seat, small of the back, front, underarm (wearer's left), left leg opening; both fits (on the skin, and
the older fit). 40 stills in `app/captures/fit-stills/2026-11-10-teal/<fit>/young-<pose>-<view>.png` with a record per case and
`sheet-young.png` (git-ignored; the first, off-white set with `older-teen` and `child` is beside it and superseded). Seen on them:
- On the skin, the painted fold waves at the small of the back and over the seat are much fainter than in the older fit
  (standing, passe, lunge); in the back arch both fits show heavy waves there. Measured over the whole garment, the share of
  points marked folded more than 1 mm is lower on the skin in every pose (standing 27% against 37%; back arch 39% against 48%).
- The back arch's small-of-the-back view is partly blocked by the body; arms-down poses hide the underarm.

# Stage 1: hollows bridged by the fit

Goal: the collision body is the bare skin; the membrane, seat sheet and rolling ball no longer shape a fitted garment.[^one-sim]

1. **Find out why bare skin fails today.** On bare skin the fabric follows the navel, spine groove and cleft even at 750 steps and
   without friction.[^bridging] Test one at a time: start on the skin against start on today's bridged surface; `mu` 0; `HOLD` 0;
   the fabric's stretch at those spots (slack fabric cannot bridge); whether `FittedView.show` draws the fit relative to
   `garmentPos`. Record the cause before building anything.
2. **Dressing start.** The fabric starts off the body and settles on. Two candidates, chosen by trial: (a) points placed on today's
   bridged surface, used as a start only; (b) the skin pushed out along smoothed normals by 10-20 mm. (a) is cheap and exists but
   keeps the membrane code as an initialiser; (b) removes it but may tangle where skin faces skin.
3. **Two phases in a re-fit.** Phase A without friction (fabric finds its tension balance), then re-anchor and phase B with
   friction. `Refit` gains `reanchor()` (copy block `X` to block `A`, clear the held contact force) and takes steps per phase;
   `render/fitted.js refit` runs both. Twin: `gpu.Problem`. Stage 5 reuses this.
4. **Fabric thickness in contact.** `query` treats the body as `thick` (1-2 mm) larger, a new float parameter, so slots narrower
   than twice that close; the display's extra lift (`options.lift`, 1.2 mm) shrinks by the same amount. Check the groin crease in
   `lunge-arms-up` and the armpit, where skin presses on skin.
5. **Body passed to the fit:** `buildCase` gets the skin (`man.gPos`), not `man.garmentPos`; the cover hook that tells the body
   where fitted fabric is stays for shading only.
6. **Shipped fits redone.** `wrap_block.py` fits against the garment's own surface with two-sided contact. Until stage 5 makes the
   standing fit in the app, its result is only the start, so it need not change; confirm the app's fit no longer depends on which
   surface the offline fit used (two offline fits, same in-app result within 1 mm mean).
7. **Remove** for fitted garments: the seat sheet (`body/seat.js`), the ball (`body/ball.js`), their settings. **The drawn garment
   still stands on the membrane** and its stored curves on the reference surface (`body/reference.js`, `LIFT_DEFAULTS`), so
   `computeLift` stays while Drawn is offered: an owner decision, not part of this stage.

**Progress (2026-11-10): step 1 done**, recorded in [the diagnosis](/engineering/app/hollows-on-bare-skin-diagnosis.md)
(hybrid high cut, `young`, standing; `app/src/dev/bridge-probe.js`).[^diagnosis] What it changes in the steps below:
- **A new step before the others: shade a fitted garment by its own points' normals. Done 2026-11-10** (owner: "go ahead"):
  `render/fitted.js show()` writes `normal` and `aGNormal` from the solved points (`FittedView.ownNormals`) for a re-fitted
  garment; a carried fit keeps the body's. The navel and spine groove are already spanned on bare skin (0.84-1.0 of the bridged
  lift kept); they showed because the body's normals were used. This also answers stage 2 step 4.
- **Owner's verdict on the captures (2026-11-10):** the bare-skin fit with a frictionless first phase (comparison row 4) is the
  best-looking: "the effect is less pronounced, which mimics real fabrics pretty closely". So the lowest seat's remaining dip is
  accepted as realistic for now, and steps 3 and 5 are the direction.[^owner]
- **Steps 3 and 5 in the app, 2026-11-10** ([decision](/decisions/2026-11-10-fit-on-bare-skin.md)):[^bare-skin] the re-fit stands
  on the bare skin with `FREE_STEPS` (150) frictionless steps first, by default; the older fit (`body: 'bridged'`) is kept with no
  control. Done without a new `reanchor()`: `Refit.reset(positions)` already re-anchors and clears the held forces, so the
  Python twin is unchanged. Steps 2 (dressing start) and 4 (thickness) not built; step 6 (shipped fits) and 7 (removing the
  membrane and seat sheet) wait while the older fit is kept.
- **Step 2 (dressing start) not needed for what was measured:** starting on the bridged surface gave the same fit as starting on
  the skin, with and without friction.
- **Step 3 (two phases) confirmed** for the seat from 6 cm up (6/3/1 mm below the cheek-to-cheek chord at 6/10/14 cm with friction
  from the start, 4/1/0 with a frictionless first phase; today 1/0/1); it also lets the leg openings creep up the cheeks.
- **The lowest 4 cm of the seat stays 8-10 mm in the groove (today 3/1 mm)** under every change tried, including a stand-in for
  step 4's thickness that was not a fair test. The gate's number fails there, but the owner judged the look (row 4) closest to
  real fabric, so the owner's eye stands in for that number.
- The gate's numbers came from a different body and measure; the like-for-like reference is today's bridged re-fit in the probe
  (seat dip 3/1/1/0/1 mm at 2/4/6/10/14 cm).

- **Gate:** midline sink over the cleft no worse than the seat sheet's (46/23/11/6/3 mm at 2/4/6/10/14 cm, teen, arms-down)[^bridging];
  navel and spine groove spanned; no skin through; the V into the gusset judged by the owner; no region-specific code.
- **Fallback (already decided):** if the fit cannot span the cleft without a band-aid, the bridged surface stays as the collision
  body, recorded as such.[^one-sim]
- **Expected cost:** phase A adds 100-200 steps to a standing fit (0.2-0.4 s at 7 mm); the membrane's warm solve (0.05-0.14 s) and
  the seat sheet (0.12-0.32 s) go from fitted garments' updates. Roughly neutral. Loose fabric has almost no stiffness and may slow
  settling; measure.

# Stage 2: folds as geometry (trial first)

**Since 2026-11-11 the painted fold waves are off** ([decision](/decisions/2026-11-11-fold-shading-off.md)), so a fitted garment shows a fold only if this stage makes one in the geometry. **Shelved 2026-11-11** ([decision](/decisions/2026-11-11-folds-as-geometry-shelved.md)):[^shelved] after the sweeps below the owner
found none of the fold looks appealing (the arched back least) and set the stage aside, to revisit if necessary. Its code stays, off
by default.

Goal: spare fabric buckles into real folds the silhouette, shadows, prints and stones follow; the painted waves remain only for
wrinkles finer than the mesh.[^owner]

1. **Fabric resists being squeezed.** In `tri`, a singular value s below 1 takes the target `mix(s, 1, press)` in place of s itself
   (a new float parameter; 0 is today's free gathering, 1 is as stiff as stretch). Start at 0.05-0.2. `gather` stays as the floor.
   **[INFERRED]** that a blended target acts as a stiffness of `press` times the stretch weight; check against `energy.py`.
2. **Bending.** A quadratic bending term (Bergou et al.'s isometric bending: one hinge stencil per inner edge, cotangent weights
   from each triangle's flat rest shape, rest curvature zero) added to the constant matrix in `constantMatrix` and its Python twin.
   No local step. Rows grow from about 7 to about 19 entries, so `cg_ap` costs more. Stiffness as a range, set so folds come out
   10-20 mm wide, then by the owner's eye; no measured value for tricot is in the bundle.
3. **Mesh:** 3.5 mm (about six points across a 20 mm fold); also try 5 mm.
4. **Drawing.** Confirm the fitted pieces' normals come from the solved points (else real folds will not shade). `foldsOf` keeps
   running on the result: where geometry has buckled the remaining squeeze is small, so the shader's waves fade there by themselves.
5. **Left out at first:** fabric-on-fabric contact. Count crossing and inside-out triangles (`look_fit.py`); add contact only if the
   underarm shows it.
- **Risks to measure:** surplus running down the thigh again (the reason `GATHER` exists: elastic's lowest point 20.5 mm below the
  crotch without it, 5.2 mm with)[^block-fit]; that was under two-sided contact, where fabric could not buckle. Slow settling:
  buckling may need more steps or more CG iterations.
- **Gate:** owner's judgement of folds at the small of the back, the underarm and a bent hip against photos; the crotch measures no
  worse than stage 0; time recorded. If a re-fit passes about 1.5 s the cost is put to the owner before going on.
- **Expected cost:** 0.73 s for 150 steps at 3.5 mm today; bending about 1.5-2 times per step; more steps unknown. Guess 1.5-3 s
  before tuning.

**Progress (2026-11-10, owner: "we can proceed"): steps 1 and 2 built, as a trial behind options; first sweep.**
- **Twins, Python first.** `energy.py`: `phi` with `press` (from GATHER to 1 `press (1 - s)^2`, below GATHER continued with the
  target `mix(GATHER, 1, press)`: the energy whose stationary points the local step's blended target reaches; the plan's
  [INFERRED] that the blend acts as stiffness `press` times stretch's holds this way), and `hinges` + bending (Bergou et al.
  2006: per inside edge `bend / 2 * 3 / (A0 + A1) * |K . X|^2`, cotangent weights from each triangle's own flat shape, so seams and
  the garment's mirrored halves bend like the cloth). `check_energy.py <pose> quick`: gradients against finite differences 1e-7 to
  1e-6 relative with either or both on; every hinge laid flat gives `K . X` = 0 except 108 seam hinges whose sewn edges differ in
  length (up to 3e-4 against a 7e-3 edge). `gpu.py`: `phi`/`dphi`/`ddphi` take `press`; `Problem(press, bend)` puts the hinges'
  4 x 4 blocks in the matrix pattern (constant, filled once) and bending in the energy and gradient (`bend_k`); `check_gpu.py
  --press --bend`: bending 8.033263e-3 numpy / 8.033272e-3 GPU; the other loose figures there are as they were with both off.
  `solvers.local_global`: target `mix(clamp(s), 1, press)`, matrix with bending's blocks; VBD left at the old physics (noted).
  `export_app.py --press --bend --tag`: cases `young-<case>-s2` (press 0.15, bend 1e-6) beside the plain ones.
- **App.** `refit-wgsl.js` `tri`: the same blended target (`P.press`); `refit.js hingesOf` (twin of `energy.hinges`, same order;
  `app/test/hinges.test.js` diffs them on 600 triangles of a race case) and bending in `constantMatrix` (the cached matrix is
  rebuilt when `bend` changes). `fitted-case.js buildCase(..., { press, bend })` writes them into the case head; `render/fitted.js`
  options `press`, `bend` (default 0: today's fit; no control); `dev/fit-stills.js all(tag, { options })` runs stills with them.
  Port check against Python (`young-*-s2`, 10 CG): after 20 steps 0.08-0.21 mm mean, 1.4-3.7 mm worst, as the plain cases
  (0.19-0.23 mean, 3.6-4.2 worst): the rounding spread already recorded in [the re-fit in the app](/engineering/app/refit-in-the-app.md).
- **First sweep** (hybrid high cut, `young`, 3.5 mm, on the skin, standing and back arch, seat and small of the back; stills
  `app/captures/fit-stills/s2-*`, sheets `s2-sweep-1.png`, `s2-sweep-2.png`, git-ignored): press 0.1 with bend 1e-7 to 1e-5 shows
  no folds in the shape (the fabric squeezes instead; the painted waves stay). **Press 1** (squeezing as costly as stretching, as
  knit that buckles rather than shortens) gives real horizontal folds at the arched back's waist and a soft one at the standing
  small of the back, and the painted waves fade there by themselves (little squeeze left); bend 1e-7 sharper and narrower, 1e-6
  broader and softer. At the arched seat the fabric looks looser. Re-fit in the preview pane (wall time with the page drawing)
  2.5-2.7 s against 2.3-2.4 s for 3.5 mm without them: over the gate's 1.5 s, as 3.5 mm already is.
- Not yet: the owner's judgement, other poses and the underarm, the crotch measures, `bend` between 1e-7 and 1e-6, more steps.

**Owner on the first sweep (2026-11-11):** realistic folds, but the garment reads much looser; it should be taut in most places and
fold only where there is considerable extra fabric (the shoulder with the arm up).[^owner] Measured on today's fit (3.5 mm, on the
skin; share of triangles whose smaller stretch is under 0.95 / under 0.85): standing front 0 / 0%, seat 15 / 12%, back waist 16 / 8%,
shoulders 44 / 34%, sleeve 30 / 29%; back arch back waist 49 / 35%, seat 45 / 41%; lunge with arms up shoulders 54 / 44%. So press 1
turned the many small squeezes into folds. **`jam` added** (all twins, as press: `energy.py`, `gpu.py`, `solvers.pd_tri_k`,
`refit-wgsl.js`, `fitted-case.js`, `render/fitted.js` option, `export_app.py --jam`, `check_gpu.py --jam`): squeezing is free down to
`jam` of the length (the knit's loops and wrinkles finer than the mesh, which the painted waves still show) and costs `press` beyond;
the same everywhere, a property of the fabric. Gradient check 6.4e-7 (press 1, bend 1e-6, jam 0.88). Port check on `young-*-s3`
(press 1, bend 3e-7, jam 0.88): one step as the plain cases (0.04-0.11 mm mean); 20 steps 0.10-0.35 mm mean, worst 4.7-7.0 mm,
wider than plain: once fabric can buckle, rounding picks where.
- **Sweep 2** (`s3-*`, sheet `app/captures/fit-stills/s3-sweep.png`): press 1 with jam 0.9 or 0.85, bend 1e-7 or 3e-7; standing,
  back arch, lunge with arms up. Standing seat and small of the back taut and smooth, as today; with the arm up real folds fan from
  the armpit; the back arch still folds and ripples across the waist and seat. Re-fit 3.2-3.7 s in the pane (one 7.1 s), against
  2.3-2.4 s for 3.5 mm without them.
- **Pattern length** (`s3-length.png`, `fitted.size` length 0.95 through `fit-stills.js all(..., { size })`): today's seat is barely
  stretched up and down standing (median 1.03); 5% shorter makes standing visibly tauter, the small of the back smooth with folds on
  or off; the back arch still folds at the waist and seat, a little less. **[INFERRED]** that the back arch's folds are the spare
  length a back loses when it arches, and that the remaining looseness standing is the pattern's length, not the fold physics.

# Stage 3: elastic as a band

1. **Cheap stage (springs kept).**
   - A stretch ratio per section of each opening (front leg, crotch, under the seat, back leg; neck; wrist), from
     [edge finishing](/domain/construction/edge-finishing-elastic-and-binding.md), written into the case by `wrap_block.py` and scaled
     with the pattern as now (`spanLengths`).
   - Second-neighbour springs along each loop, acting both ways, so the edge resists kinking in its own line (the spring kernel is
     tension-only today: a flag per span).
   - Grip: a per-point friction factor (elastic's rubber on skin), read in `rhs` beside `mu`.
   - **Elastic firmness** as a live setting (scales `k`; the cached matrix is rebuilt, as a size change does).
2. **Full band (needs stage 4's per-triangle direction weights).** Triangles within the elastic's width of an opening (10 mm, 3/8
   in) are stiffer along the edge and shorter at rest along it by the section's ratio (their rest shape scaled along the edge's
   direction). At 3.5 mm that is about three rows, so no re-meshing. The edge springs then go.
- **Gate:** leg line smooth (sharpest turn near the crotch no more than today's 19 degrees)[^block-fit]; half widths inside the
  range the firmness sweep gave (102-115 mm at 7 cm)[^audit]; with stage 2 on, puckers radiate from the openings; the gusset's V.
- **Expected cost:** cheap stage negligible; the band perhaps 10-20% more steps (a stiff strip beside soft fabric).

**Progress (2026-11-11, owner: "move on to stage 3 ... keep width at 100% and height at 85-90%"): the cheap stage's band and
firmness built as a trial behind options; stills at 88% length.**[^owner]
- **Built (all twins):** `kink` and `firm`. `firm` scales every elastic span's `k`. `kink` adds, at each point where exactly two
  spans meet, a span between their far ends at rest the two rests' sum, stiffness `kink` times theirs in series, that **only
  pushes**: the band will not shorten along its line, so a slack edge stays a smooth line instead of crumpling. Its tension is left
  to the spans as they were (a both-ways span would also have stiffened the elastic's pull). Python: `energy.springs` (used by
  `Energy`, `gpu.Problem(kink, firm)`, `spring_k` with `npull`, `solvers.pd_spring_k`); `check_energy.py` section 1c (gradient
  4e-7 to 2e-5 relative, 252 band spans on the young case, 31 pushing as given, 63 squeezed); `check_gpu.py --kink --firm` (elastic
  energy identical numpy / GPU; the other loose figures as without); `export_app.py --kink --firm` (cases `young-*-e3`, kink 2,
  firm 1.5). App: `refit.js elasticSprings` (twin, `app/test/springs.test.js` diffs them), the uniform's `pad0` is now `npull`,
  `refit-wgsl.js spring` pushes from `npull` on; `fitted-case.js buildCase(..., { kink, firm })`; `render/fitted.js` options `kink`
  0, `firm` 1 (no control). Port check, 20 steps: 0.03-0.23 mm mean, 2.9-4.6 mm worst, as the plain cases (0.03-0.24, 3.6-4.8).
  VBD left at the old physics (reads every span as pull only).
- **Not built, and why:** per-section ratios: the sources give front leg 1:1 and back leg 3/4 and nothing finer
  ([edge finishing](/domain/construction/edge-finishing-elastic-and-binding.md)), which the case already has. Grip: turned elastic is
  folded inside the hem, so fabric, not rubber, touches the skin; its extra hold is its pressure, which the fit already has. A grip
  factor would be a band-aid. The full band waits for stage 4.
- **Gotcha:** `target` is a reserved word in WGSL. The shader failed to compile, nothing reported it, and every re-fit silently
  stood still (port check 1.2 mm mean after one step: the start itself). Check `getCompilationInfo()` when a port check jumps.
- **Stills** (`app/captures/fit-stills/e3-L88-*`, sheets `e3-leg-seat.png`, `e3-back-front.png`, git-ignored; hybrid high cut,
  7 mm, `young`, pattern width 1, length 0.88): today's fit, 88% length, 88% with `kink` 1, 88% with `kink` 1 and `firm` 1.5.
  88% length is the visible change: the standing small of the back and seat lose their painted waves, the leg line sits higher;
  the back arch still ripples across the waist and seat; the underarm with the arm up still folds. The band barely shows: without it
  the edge is squeezed to 0.66 of the elastic's length at 52 band spans (standing and back arch), with it to 0.99; edge points move
  1 mm median (0.3 in the back arch), 6-8 mm at most. A small crumple at the back arch's leg opening (by the crotch) stays with it.
- **Cost:** none measured: re-fit 0.7-1.0 s at 88% without, 0.8-1.0 s with the band, 0.6-1.1 s firm 1.5 (pane wall time, 300 steps
  with the frictionless phase).
- Not yet: the owner's judgement; the gate's leg-line turn and half widths.
- **Owner on these stills (2026-11-11):** 88% length looks better in most poses (the standing back smooth), but the lunge's seat rode up; the band and firmness looked the same as without. Asked what removes the many pronounced ripples (raised arm, arched back, seat) without the ride-up. **Built, all on by default** ([decision](/decisions/2026-11-11-folds-cut-length-and-dressing.md)):[^folds-cut] painted folds only beyond the knit's take-up (88%) and 30 mm broad; Armstrong's block and the hybrid cut at 88% length; poses fitted from the garment's own standing fit with 50 steps of slip (stage 5 steps 1 and 2, below).

# Stage 4: fabric that differs along and across

1. **Local step rewritten per direction.** The flat rest shape's x is across the grain and y along it (as `meta.fitSize` assumes).
   Energy per triangle: stretch along each axis charged separately (`kx`, `ky`), shear between them (`ks`); targets per axis and a
   rotation target for shear; the constant matrix becomes `area * (kx bx bx^T + ky by by^T + ks (...))`. Inside-out handling
   (`turn`, `facing`) must survive. Prototype in `energy.py` with a gradient check before any kernel.
2. **Per panel values** from the panel's fabric ([stretch properties](/domain/fabrics/stretch-properties.md)): per-triangle `kx`,
   `ky`, `ks`; a fabric change rebuilds the matrix and re-fits. Values are published ranges; none measured.
3. **Optional, only if captures ask:** narrowing when pulled (the cross target reduced by a factor of the main stretch); a stiff cap
   on stretch. The audit could not tell narrowing from low shear.[^audit]
- **Gate:** the seat spans without the sheet's 4:1 tension setting[^bridging]; folds at the back waist run across the body; a mesh
  sleeve and a tricot body visibly differ; twins agree.
- **Expected cost:** per step unchanged; perhaps 20-50% more steps from the stiffness contrast.

# Stage 5: poses and bodies

1. **Friction ramp for poses.** A pose re-fit runs stage 1's two phases: a share of its steps with low friction, the rest at full.
   One setting, "fabric slip in poses" (the share), tuned by the owner between carried (about 2.5 mm moved) and free (about
   26 mm).[^audit] No stepping through intermediate poses: kept as a fallback for single poses that still look wrong.[^owner]
2. **Standing fit per body in the app.** The dressing start of stage 1 run on each body (a few hundred steps, about 1 s), kept until
   the design, size or body changes; poses start from it. Replaces carrying `young`'s fit. The pattern is still `young`'s: a block
   per body needs the drafters run per body offline, or ported; not in this plan.
- **Gate:** the armhole's U at the underarm flattens in arms-up poses without the leg openings creeping; same design and pose give
  the same fit every time.
- **Expected cost:** the ramp none; the per-body fit about 1 s once per body and design, then cached.

**Progress (2026-11-11): steps 1 and 2 built** with the folds and cut length above ([decision](/decisions/2026-11-11-folds-cut-length-and-dressing.md)). Standing fit per body: on the bare skin a pose is fitted from the same body's `standing` fit (cached), carried by each point's host motion; slip: `slip` steps without friction (50) before 150 with. Lunge leg openings stay at their standing height (97 mm above the crotch on the body against 103-106 free); the back arch at slip 0 pulls one side up, at 50 looks as before. The gate's armhole check not yet made.

# Stage 6: soft body

1. A softness value per canonical body vertex (soft seat, bust, thigh, belly; firm ribs, hip bones, shoulders), carried in the free
   fourth component of the body points and read at the closest point in `surface_at`; contact stiffness is `plane` divided by it.
2. The skin drawn pressed in by the fabric's depth (fit points' depth spread to their host vertices, smoothed), so it does not show
   through. No bulge beside the elastic at first.
- **Gate:** elastic visibly dips at the leg opening; no skin through; the owner's eye.
- **Expected cost:** almost none.

# Open for the owner

- May the membrane stay as a start-only step if candidate (a) wins stage 1?
- The time a re-fit with real folds may take (stage 2's gate).
- Whether Drawn garments keep the membrane or follow the fitted path later.

[^owner]: Conversation with the product owner, 2026-11-10.
[^one-sim]: One fit simulation carries the whole fit.
[^audit]: Fit solver realism audit.
[^bridging]: Fabric bridging hollows.
[^mesh]: Fit mesh resolution trial.
[^refit]: The re-fit in the app.
[^block-fit]: Fitting a block like the app.
[^code]: The fit's code as read for this plan.
[^diagnosis]: Why the re-fit does not span hollows on bare skin (diagnosis), 2026-11-10.
[^shelved]: Decision of 2026-11-11: folds as geometry shelved.
[^folds-cut]: Decision of 2026-11-11: fewer painted folds, blocks cut 12% shorter, poses fitted from a standing fit.
[^bare-skin]: Decision of 2026-11-10: the re-fit stands on the bare skin; the older fit is kept; stage 0 as in-app stills.
