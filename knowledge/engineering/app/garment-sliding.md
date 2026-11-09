---
type: Component
title: Garment sliding over the posed body (experiment)
description: "Why a leotard painted on the skin's vertices goes wrong in deep poses (leg openings dragged down the inner thigh, seams warped at the armpit), and the experimental fix in app/src/body/slide.js: the garment slides over the posed body under tension, as-rigid-as-possible against its A-pose shape, with measured results on the low lunge and kneeling poses."
tags: [app, geometry, pose, garment, simulation, component, experiment]
status: deprecated
superseded_by: /decisions/2026-11-08-one-fit-simulation.md
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-21T23:00:00Z }
sources:
  - id: code
    resource: "app/src/body/slide.js, body/mannequin.js (slideFabric, updateGarment), render/garment.js (interpolate), render/straps.js; branch build/designer-app, uncommitted 2026-10-21"
    title: Sliding experiment source
    author: claude-code/claude-opus-5-5
  - id: surface-layer
    resource: /engineering/geometry/garment-as-surface-layer.md
    title: Garment as a surface layer (Montes et al. 2020 and the no-simulation decision)
---

# Takeaway

**Removed on 2026-11-08** (owner): the fitted garments' fits stand on the garment surface, and the slide moved a
fitted garment about 15 mm off its fit and held the page 1.3 s a pose; the fit sim is to carry the whole fit
([decision](/decisions/2026-11-08-one-fit-simulation.md)). `body/slide.js` and its test are deleted; what follows is the
record of the experiment.

Until 2026-10-21 the leotard was **painted on the skin**: every garment point sat on the same
canonical vertex in every pose, so wherever Daz's skinning moves the skin, the leotard went with
it. The owner saw the leg opening dragged down the inner thigh (low lunge, kneeling) and seams
warping at the armpit. The experiment lets the garment **slide over the posed body under
tension**; the leg openings then settle towards the hip crease and seams straighten. Standing
(A-pose) designs are untouched.[^code]

# Diagnosis (measured, B8, young body, all 30 poses)

- The leg openings keep their length in every pose (96-102% of the A-pose loop), but the skin
  under them stretches up to 2.6x (lunges, splits, cartwheels): the whole edge is carried with the
  skin, it is not distorted.
- Most groin skin is barely stretched (median 1.05x): it is carried along with the rotating thigh.
  So a slide that only keeps the fabric's shape (ARAP, no tension, a design-independent sheet
  pinned below mid-thigh) changed nothing visible: max 3.6 cm of slide, groin p99 area 3.7x to
  3.1-3.5x. **What holds a real leg opening in the crease is tension**: the leotard is smaller
  than the body and its openings are free edges.
- The extreme stretch figures (armpit 25-37x) come from sliver triangles inside the pinched A-pose
  armpit crease (rest edges 0.4-0.5 mm); they are a metric artefact, not visible.

# Method (`body/slide.js`)

- Unknowns: a position per canonical vertex of the garment, on the posed body's surface.
- Domain: the shell's cover (> 0) plus two rings past each edge (so the triangles across an edge
  move with it), head excluded. Edges to vertices outside it are ignored: openings are free edges.
- Energy: as-rigid-as-possible (Sorkine & Alexa 2007, uniform weights) against the body's own
  A-pose scaled by `shrink` (tension; 0.8 = the fabric's rest size is 80% of the body), plus `grip`
  (a weak spring back to the skin point it was painted on: friction), plus **one-sided contact**
  (since 2026-10-23): a stiff spring along the surface normal only for vertices resting on the
  skin (they slide freely along it), none for vertices tension has lifted off it. The body pushes
  the fabric out but never pulls it in, so over a crease the fabric bridges instead of following
  the skin down. Until 2026-10-23 every vertex was held on the skin (the surface-embedded cloth of
  Montes et al. 2020[^surface-layer]); see "Folds at creases" below for why that broke the trims.
- Solve: per outer pass, per-vertex rotations (Müller et al. 2016 quaternion extraction,
  warm-started), then one preconditioned CG solve (block-Jacobi with the per-vertex contact
  spring), then contact: each vertex's nearest skin point by walking from its previous face; a
  vertex inside the body (or within 0.1 mm of the skin) goes onto that point and rests there
  (spring on), one outside stays where the solve put it (spring off). A walk that goes round in
  a circle means the point is over a crease (each side's plane points across to the other) and
  counts as outside. A vertex off the skin it walked on is also checked against every skin face
  within 2 cm (`skinGrid`, faces bucketed in 2 cm cells, built per solve; `insideBody`, Ericson's
  closest point on a triangle): inside the body there (a pose presses the thigh onto the groin,
  and lifted fabric would end up inside the thigh), it goes onto that skin and rests there.
  `slideGarment` returns `off`, the vertices off the skin. Defaults
  `{ shrink: 0.75, grip: 0.002, iters: 30 }` (`man.slideOpt`, `render/display.js`), CG 40 passes:
  chosen by the owner with the sliders on the low lunge (2026-10-21; first tried 0.8 / 0.01).
- Wiring: `Mannequin.slideFabric()` runs at the start of `updateGarment` (body, pose or cover
  change) and sets `gPos` / `gNrm`; the lift, `garmentPos`, garment cells (`render/garment.js
  interpolate`) and straps read them. A-pose: `gPos` is the skin (the designer's ground truth).
  `man.slide = false` restores painting on the skin.
- Controls (2026-10-21; moved 2026-10-23 to the top bar's settings popover, "Fabric fit in poses",
  `FabricFit` in `ui/Inspector.jsx`; the popover rows need `minmax(0, 1fr)` or a long select widens
  every row past the popover and the sliders' right ends and readouts fall off-screen): "Fabric slides over the body" (on/off),
  Tension (60-100%, `shrink`, default 75%) and Grip (log slider 0..100 -> 0.001..1, 0 = none; default 0.002). They are this
  computer's settings, kept with the display settings (`render/display.js` `slide`,
  `slideTension`, `slideGrip`; applied to the mannequin in `main.jsx` before the first body) and
  applied on release through `Engine.setSlide(on, { shrink, grip })`, which re-runs `applyBody`.
  The panel shows the solve time; the page is held while it solves.

# Results

- Tension sweep, low lunge groin (`app/captures/tension-sweep-lunge.png`, shrink 1.0 to 0.7 in
  0.05 steps): **most of the fix comes from the free openings, not the tension**: already at 1.0
  (no tension, garment-only domain with free edges) the leg openings leave the inner thigh. Lower
  values raise and straighten the back leg's opening a little more each step; 0.85-0.8 look
  closest to a worn leotard, 0.7 starts cutting high. The earlier "tension is what holds the
  opening" reading came from comparing a pinned design-independent sheet against the tensioned
  garment-only solve, which changed two things at once.
- Low lunge, arms up: the leg openings pull up to the hip creases, the boxy "shorts" look and the
  hook at the bottom of the back leg's opening go (0.88 already helps, 0.8 is cleaner); raglan and
  side seams run straighter at the neckline and the armpit.
- Kneeling: the fabric no longer runs down between the legs; the openings sit higher on the seat.
  At 0.8 the back rides up slightly: about the upper limit for `shrink`.
- A-pose drift if the slide were applied there (shrink 0.88): median 1 mm, p99 6 mm, max 8 mm (back
  of the leg openings), so tension does not move a design meaningfully where it was drawn.
- Comparison captures (gitignored): `app/captures/compare-lunge-groin.png`,
  `compare-lunge-seams.png`, `compare-kneeling.png` (left: painted on the skin, right: sliding).

# Folds at creases (found and fixed 2026-10-23)

- Symptom (owner, low lunge, B-style red/navy design, tension 60%, grip 0): the leg-opening
  trim broke into flaps standing off the body at the crotch and did not follow one line.
- Cause, measured: with every vertex held on the skin, tension pulls the fabric across a crease
  the pose pinches shut; the nearest skin point to anything over the crease is the crease line,
  so the fabric from both sides piled onto it. 128 fabric triangles turned over; one leg
  opening's edge ran 10x its skin length (11.5 mm steps where the skin has 1 mm) and doubled
  back; the trim, swept along that edge (`render/rims.js`), twisted into flaps. With sliding off
  the trim was clean. About 1,000 vertex projections per solve went round in a circle at creases.
- Tried and dropped (post-fit repairs, all in `body/slide.js`, removed): refilling folded patches
  by surface Laplacian smoothing on the posed body, then on the A-pose body (the means fall back
  into the crease; folds stayed or grew); untangling on a Tutte map of the skin patch (patches
  were annuli or had tangled borders); refusing any step that folds a triangle (froze patches
  and sheared the edge: 16 back-steps); projecting along normals smoothed over a few cm (helped
  at grip 0.007, not at grip 0).
- Fix: one-sided contact (above). Low lunge, tension 60-100% x grip 0 / 0.002 / 0.05 / 1: both
  leg-opening edges have no back-steps and a longest step of 1.7-2.2 mm (the skin's own) in all
  16; grip 1 shows 3 sub-2.5 mm wiggles, as the painted skin does. How far the fabric slides is
  unchanged (median displacement 8.7 vs 8.8 mm at 60% / 0.007). Fabric off the skin: median
  1-7 mm, up to 4-7 cm at grip 0 where it bridges the gluteal cleft and the crotch, which is
  what a tensioned leotard does. Solve time unchanged (about 5 s with the pane hidden).
- Lifted fabric inside another part: without the every-face check, fabric bridging the crotch in
  the walkover sat up to 70 mm off the skin, inside the other thigh, and the trim vanished into it;
  with it, 14 mm. Fabric resting on skin that the posed body itself pushes inside another part
  (the thigh through the groin skin in the low lunge and walkover) is not caught: the edge tucks
  out of sight there, cleanly. Fix if it matters: a hip corrective for those poses (the base
  Genesis 9 correctives are already baked in; a third-party pack such as BioGearZ3D's DEX Alicia
  JCMs is locked to its own character).
- Trim in the deepest crease: the rim's profile bends to follow the fabric by its measured
  curvature, clamped to 30 /m; in the low lunge's groin the fabric curves tighter and rose through
  the rim's inner half (red over the navy binding). Clamp now 120 /m (`KAPPA_MAX` in
  `garment/trim.js`, used by `render/rims.js`); 300 looked the same.
- At tension 60% and grip 0 the seat rides up to a thong; that is the setting, not the contact
  (the old solve slid as far).
- All 30 Daz poses at 60% / grip 0.007: no leg or arm opening edge has a back-step; longest step
  1.7-3.1 mm.
- Test: `app/test/slide.test.js`, a synthetic V crease (flat rest sheet posed as z = 1.5 |x|,
  border pinned, tension 70%, grip 0): fabric lifts off over the crease, never goes below the
  skin, no triangle turns over. The skin-held solve fails it (nothing lifts); the synthetic crease
  is too open to reproduce the pile-up itself, which needs the body's pinched creases.
- Not built (option 2 of the owner's plan, solving along the pose path from standing in steps):
  contact alone fixed every pose, so it was not needed.

# Not done / open

- Speed: 4-13 s per solve in the browser, on the main thread, and it re-runs on every cover change
  in a pose. Needs a worker, a coarse-to-fine solve (cage level first) or baking per body x pose.
  Measured 2026-10-24 (low lunge arms up, young body, open-back start, 12,800 free vertices,
  GTX 1650 laptop; positions compared over the free vertices, in mm; "truth" = 80 outer x 80 CG,
  14 s): defaults (30 x 40) 2.8 s, p99 0.83 / max 7.0 from truth. Iterations 0 / 1 / 5: 37 /
  367 / 713 ms (the first outer iteration costs ~330 ms); CG passes take ~1.9 ms each, ~80% of
  the time. CG 20: 1.9 s, p99 0.32 / max 2.5 from the defaults; CG 10: 1.4 s, p50 1.2 mm (too
  loose); 15 outer: 1.5 s, p99 0.53; 15 x 20: 1.15 s, p99 1.07; 10 x 10: 0.7 s, p50 5 mm (wrong).
  So fewer CG passes per outer iteration is nearly free (the next outer iteration re-solves from
  the last result), fewer outer iterations is not.
  Applied 2026-10-25 (`body/slide.js`, `Mannequin.slideFabric`):
  - **CG 20** (`SLIDE.cg`, was 40).
  - **Compact solve, same results**: the CG vectors hold only the free vertices, each with its
    free neighbours listed by compact number; `matvec` / `precond` / `dot3` are module-level
    functions (as closures made per solve, every solve ran them unoptimised at first). Positions
    bit-identical to the old code (checked side by side); 6.9 -> 4.4 s at CG 40 on that run. Per
    phase at CG 20 (30 iterations, plain tank, 15k free vertices): CG ~1.2 s, contact ~1.0 s
    (walks and the inside-the-body checks), local rotations ~0.5 s, right-hand side ~0.15 s.
    `Math.hypot` -> `Math.sqrt` was tried and reverted: little gain, and the contact decisions
    are sensitive enough that one point moved 4.6 mm.
  - **Warm start for garment edits** (`opt.warm`, `SLIDE.warmIters` 10): starts from the last
    solve's positions, surface points, contact weights and rotations when the body and pose are
    the same (`setBody` clears `_slid`) and under 5% of the free vertices changed
    (`SLIDE_WARM`). New V neck in the low lunge (1.8% changed): 0.45-0.54 s against 1.6 s, p50
    0.09 / p99 0.55 / max 4.2 mm from a fresh solve. A starting point changes ~18% and solves
    afresh: warm there ended up to 8 mm off (max; fresh: 2.9 mm from an 80 x 80 solve). The
    result now depends a little on the edit history (undo does not return exactly the same
    fit). Test: `app/test/slide.test.js` (a warm start is no further from the settled fabric
    than a fresh one).
  - End to end in the app (person, bun-bangs hair, same machine, slower that day): pose change
    3.7-4.1 s (slide 1.5-1.9 s, rest of the body ~0.6 s, the person 1.3 s); starting point in a
    pose 2.7 s (was 5.5 s); small shape edit in a pose 1.2 s; a back change (over 5%) 2.3 s.
  Owner, 2026-10-25: no background solve (the design must load fitted) and no multithreading;
  target under 0.5 s per change. Done that day:
  - **Solved on the base cage** (`Mannequin.slideCage`, `slideCoarse` true by default; false
    keeps the canonical-mesh solve): Daz's cage (25,182 vertices, polygon edges as adjacency,
    fan triangles for contact; `cageMesh`) is the fabric's control net, sliding over the posed
    body's cage; the result is subdivided with the body's stencil (fabric resting on the skin
    cage subdivides to exactly the skin) and its normals recomputed; canonical vertices outside
    the free set stay on the skin. Cage free = canonical free at the same index (subdivision keeps
    the old vertices first) plus one cage ring. Low lunge, mesh-yoke tank: 0.8-0.9 s against 2.8 s
    cold; median 2.5 mm (p99 6.6, max 8.9 mm) from the canonical solve, which moves the fabric
    12 mm median, up to 116 mm; side-by-side renders of the crotch and leg openings look the same
    (a slightly different trim line at the crotch). It does not converge in fewer outer
    iterations than the fine mesh (10: p50 2.2 mm from its own 80 x 80; 30: 0.4 mm).
  - **warmIters 5** (was 10): same distance from a fresh solve as 10. Repeated warm edits do not
    drift further: over eight alternating necklines, median 0.2-0.5 mm, p99 1.2-4.2 mm, max
    1.8-9 mm from a fresh solve, the worst near the edited edge.
  - Per warm iteration the cage solve costs 40-75 ms (more than a cold iteration, ~28 ms):
    contact for fabric lifted off the skin. Fixed costs around it are small (cage normals 16 ms,
    subdivision 7 ms, canonical normals 15 ms).
  - Elsewhere in the same pass: `vertexNormals` without per-triangle arrays (same normals, ~4x),
    `contour` likewise (~5x), `makeBlock` memoised (block.set builds the current and the next
    block, ~0.1 s each), block.set hands its arrangement to the engine (`ctx.prebuilt`, was built
    twice, ~0.25 s), stones re-placed only when their inputs change (`Engine.syncStones`
    signature: a colour change re-ran 2,600 stones, ~0.45 s), the person poses only the parts on
    show (the hairs not chosen, ~0.3 s).
  - Result (same machine, timings noisy that day): pose change 1.9 s (was ~4 s; the body 1.2-1.3 s
    of which the slide 0.8-0.9 s, the person 0.55-0.65 s); starting point in a pose 1.3 s (2.7 s);
    small neckline edit in a pose on a design with 2,700 stones 0.75-1.3 s (stones 0.17-0.22 s,
    slide 0.15-0.24 s, the cut ~0.25 s, garment view 0.1-0.3 s, lift 0.05-0.14 s); colour change
    0.07 s (0.5 s). Not yet under 0.5 s.
- Elastic edges are not modelled separately (openings only feel the overall tension); no dForce
  cross-check yet; arms not verified from a good camera angle; one design (B8) and one body.
- No automated all-poses check yet (planned: fabric stretch and edge drift per body x pose x design).

[^code]: Sliding experiment source
[^surface-layer]: Garment as a surface layer
