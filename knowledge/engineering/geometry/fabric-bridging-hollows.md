---
type: Technique
title: Fabric bridging hollows
description: "Stretch fabric spans body concavities (sternum, under and between the bust, lower back, gluteal cleft, underarm, crotch) instead of following them; the POC models this with an outward-only membrane offset solved per body, which cannot span the gluteal cleft; the app adds a taut sheet across the seat (an anisotropic membrane at rest solved as seen from behind) on top of the membrane, a rolling-ball fit stays selectable."
tags: [geometry, technique, garment, offset, poc]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: body-js
    resource: ../../../poc-threejs/src/body.js
    title: "poc-threejs/src/body.js (computeLift, LIFT_MAX, LIFT_ITER)"
    author: claude-code/claude-opus-5-5
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror), section 2"
    author: claude-code/claude-opus-5-5
  - id: fix-2026-10-15
    resource: measurements of aLift in the running POC, 2026-10-15 (Claude Code session)
    title: Lift before and after pinning bare skin
    author: claude-code/claude-opus-5-5
  - id: app-2026-10-25
    resource: measurements of aLift in the running designer app, 2026-10-25 (Claude Code session)
    title: Lift against the bridging controls
    author: claude-code/claude-opus-5-5
  - id: report
    resource: /references/research/research-report.md
    title: "Research report (in-bundle mirror), 'designed directly on the body' section"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**A leotard is not an offset of the skin: tensioned stretch fabric spans hollows (sternum, under and
between the bust, lower back, gluteal cleft, underarm, crotch) instead of dipping into them.** None of
the published skintight methods' summaries addresses this, so it was flagged as a design assumption to
prototype.[^gg-notes][^report] The proof of concept now implements one version: an outward-only
membrane offset, solved once per body.[^body-js]

# Recommended approach (research note) **[INFERRED]**

A one-off "shrink-wrap" per body: smooth the body mesh while constraining it to stay outside the body
(a tensioned envelope). Because all bodies share topology, it can be precomputed per size and pose.[^gg-notes]

# The POC implementation (`computeLift` in `poc-threejs/src/body.js`)

Per vertex *i* with position P_i and normal N_i, iterate (Jacobi):

h_i ← clamp( mean over neighbours j of ⟨P_j + h_j·N_j − P_i, N_i⟩ , 0, LIFT_MAX )

- On convex skin the neighbours lie below the tangent plane, so h stays 0 and the fabric hugs the body;
  in a hollow they lie above it, and the fabric spans across.
- Circumferential curvature wins at the waist, so the leotard still follows the waist in.
- `LIFT_MAX = 0.03` m caps the span; `LIFT_ITER = 220` iterations set how far a bridge can reach
  (roughly √iterations edges, about 6 mm each).
- Head vertices, arm vertices beyond the wrist (`armT > 1`) and **bare skin (`cover <= 0`)** are fixed
  at 0. Pinning bare skin (added 2026-10-15) does two things: fabric only bridges where fabric exists,
  and every opening is held to the skin the way its elastic holds it. Before it, the membrane was
  solved as if the whole body were covered, so the tank's shoulder strap "bridged" towards the bare
  neck hollow and floated off the shoulder (median 5.5 mm, max 14 mm), and openings floated up to
  14 mm. After: shoulder median 0.7 mm / max 2.6 mm; within 1 cm of an opening max 2.1 mm; waist
  (spine-groove bridge) unchanged at max 13 mm, as intended.[^fix-2026-10-15]
- Because the fixed set depends on the style, the solve reruns when sleeves or back change
  (`updateGarment`, about 0.7 s on the development laptop), not only when the body changes.
- The garment surface is P + N·h; its own normals (flat across bridges) are used for shading; ambient
  occlusion is derived from h (`1 − 16h`, clamped 0.4–1), since crevices are where the lift is large.

Source: `poc-threejs/src/body.js`.[^body-js] Component details: [body and regions](/engineering/poc/body-and-regions.md).

# Viewing controls in the designer app (2026-10-25)

The app's copy (`computeLift` in `app/src/body/mannequin.js`) takes `Man.liftOpt = { taut, max, reach }`
(defaults `LIFT_DEFAULTS`: 1, 0.03 m, 1), set from three sliders in the settings popover's "Fabric fit"
section (`FabricFit` in `app/src/ui/Inspector.jsx`), stored per computer with the display settings
(`liftTaut`, `liftMax`, `liftReach` in `app/src/render/display.js`). They apply in every pose; a change
re-solves the body like the slide's Tension and Grip (`Engine.setSlide`'s third argument).[^app-2026-10-25]

- **Bridging** (`taut`, 0..1): h_i ← clamp(taut · mean …, 0, max). Below 1 each vertex keeps only part
  of its neighbours' span, so the bridge decays into the hollow (a screened diffusion). The response is
  steep near 1 (teen body, A-pose, starting design: total lift 5043 mm at 1, 3463 at 0.99, 1016 at 0.9,
  163 at 0.5), so the slider is logarithmic in 1 − taut (`tautOf`): 50% → taut 0.97, 44% of the volume.
- **Deepest bridge** (`max`, 0–50 mm): the cap formerly fixed as `LIFT_MAX`.
- **Bridge reach** (`reach`, 25–150%): cold-solve iterations = `LIFT_ITER · reach²`. 25% kept a third of
  the volume; 150% added 2% (the hollows had converged) and costs about 1.1 s against 0.8 s.
- Warm solves (garment edits) still run 40 iterations from the last solution.
- The **reference surface** (`app/src/body/reference.js`, where curves are stored) always uses
  `LIFT_DEFAULTS`, so the controls change the view and never move a saved design's lines.

# The membrane cannot span the gluteal cleft (2026-10-25)

Owner: the seat still sank far too low with every slider at its maximum. Measured on the teen body
(arms-down, B8): the membrane's lift along the cleft was **0 mm** over a cleft 22-53 mm deep, and the
fabric followed it all the way down. The cleft is not a bowl but two convex cheeks meeting in a slot:
every cheek vertex sees convex skin (h stays 0), and inside the slot the walls' normals face each
other (n.x ≈ ±0.99 at 1 mm from the midline), so a lift along the normal moves the fabric sideways,
never across. The two cheeks are neighbours only at the floor of the slot, so nothing can diffuse
from one cheek top to the other. The slide (`body/slide.js`) does not span it in a standing pose
either (grip 0: 24 of 25 mm still sunk at 6 cm). The same shape probably occurs wherever skin
touches itself (between the thighs, a closed cleavage); not measured.[^app-2026-10-25]

# Rolling-ball fit (`app/src/body/ball.js`, experiment, default since 2026-10-25)

The fabric lies on the surface a ball of radius R traces when rolled over the skin (a morphological
closing): the skin wherever the ball touches it, an arc across any fold narrower than the ball. It
is a geometric stand-in, not a cloth model: garment CAD (CLO, Marvelous Designer) simulates a sheet
under tension with collisions, which gives a nearly straight span; a big ball approximates that.
Owner chose it after that comparison. **[INFERRED]** for the tool comparison.

1. **Free balls**: centre = skin point + normal·R per vertex, kept when no skin vertex of the same
   part lies within R − 0.5 mm. Parts: trunk (torso and legs) and each arm, so a ball too big for
   the arm-to-side gap does not web the torso to the arm; the head is no obstacle. Cached per body,
   pose and R (independent of the garment).
2. **Projection**: a fabric vertex whose own ball is blocked moves to the nearest free ball's surface,
   G = c + (P − c)·R/|P − c|, unless within `SNAP` = 2 mm of it.
3. **Openings pinned**: the move fades in (smoothstep) over `PIN` = 3 cm of mesh distance from bare
   skin, as elastic holds an edge; then 8 smoothing passes of the move over the fabric.
4. **Untangling**: the vertices from the two walls of a fold land on the same arc and cross; the moved
   vertices relax 10 passes towards their neighbours' mean, never inwards of the fabric's own normal.

The lift is now a **vector** (`aLift`, 3 components: skin or slid fabric to garment surface) in the
app's mannequin, garment cells (`render/garment.js`), straps (`render/straps.js`) and the fabric
shader (`transformed += normal * uOffset + aLift * uGarment`); the membrane writes N·h into it. AO
uses its length. The POC (`poc-threejs`) keeps its scalar lift.

Measured (teen, arms-down, B8, R = 5 cm, before pinning and untangling): fabric sink at the midline,
2/4/6/10 cm above the crotch, 27/16/11/7 mm against the cleft's 53/32/25/22 mm; R = 10 cm
20/13/9/3 mm. Visually the cleft line is gone; a small dip stays where the leg openings meet (the
membrane has the same). Cost: a full refit 1.5 s with the slide (ball part about 1.3 s at R 5 cm,
1.8 s at 10 cm); a garment edit 0.55 s (the centres are cached).[^app-2026-10-25]

Tuning found on the way:
- Without pinning, the crotch gusset (a few cm between the leg openings) was pushed out below the
  leg line into a crumpled bulge.
- Smoothing 25 passes instead of 8 pulled the bridge back into the cleft near the leg openings.
- Untangling 40 passes pulled the fabric inside the cheeks (skin through); 0 left a faint crease
  down the midline where arcs from the two cheeks meet; 10 is clean.
- In a pose (split leap) the slid fabric sits a millimetre or two off its own ball everywhere; with
  a 0.5 mm snap those tiny moves were then shrunk into the body by the untangling (skin through the
  back and shoulders). Fixed by the 2 mm snap and the never-inwards clamp.
- Counting "flipped" triangles (garment against skin face normal) misleads here: across the cleft
  the surface legitimately turns about 90°. Judge by renders.

Controls: settings popover, Fabric fit, "How fabric spans hollows" (membrane / rolling ball) and
"Ball size" 0-150 mm (default 50); the membrane's three sliders show only for the membrane.

Open: per-region ball size (bust against seat), cost at large R, the closed-cleavage and inner-thigh
cases, and whether stored curves should eventually sit on a ball-fitted reference surface.

**Owner review (2026-10-25): the rolling ball does not solve the seat.** It helps a little at first;
from a ball of about 90 mm artifacts form and the crevice gets no shallower (likely the 3 cm pin at
the leg openings plus smoothing pulling the arc back in, and big balls blocked by the thighs; not
measured). The default went back to the membrane; the ball stays selectable.

# Taut sheet across the seat (`app/src/body/seat.js`, on by default since 2026-10-25)

Owner chose a targeted physics approach ("option 1": the fabric in the cleft much shorter than the
skin) after asking how complex a seat- or bust-specific simulation would be. Why the existing slide
does not do it: it is as-rigid-as-possible, so it keeps the fabric's rest shape, fold included. A
membrane (stretch only, no bending stiffness) under tension pulls straight across a gap. The catch
on the skin's own mesh: the cleft's walls are several cm² of material real fabric does not have;
pulled taut it would bunch along the midline.

The sheet is solved at rest (what a cloth simulation settles to), seen from behind, which removes
that material: from behind the walls have no width.

1. **Frame** from the posed seat: d = minus its mean skin normal (into the body), e1 from the left
   half's centroid to the right half's, e2 = d × e1. Follows the pelvis in a pose.
2. **Skin seen from behind**: the trunk's triangles (no head, no arms) rasterised into a 2.5 mm grid
   over the seat's extent + 2 cm, keeping the nearest: depth s and cover.
3. **Sheet**: depth u with Tx·u_xx + Ty·u_yy = 0 where free (a tensioned membrane with nothing
   pressing on it), u ≤ s (cannot enter the body): projected SOR, 600 passes, ω 1.8. Free over
   fabric; held on bare skin (the leg openings' elastic), on the grid's border and along the body's
   outline (cells next to one off the body: hips, the gap between the legs).
4. **Fabric onto the sheet** over the seat region (reference body: 3 cm below to 25 cm above the
   crotch, |x| < 16 cm, front and back), per fabric vertex, from its depth z against the skin s and
   the sheet u in its cell:
   - z − s > 10 cm (the front of the body): keeps its lift;
   - 0.5 mm < z − s ≤ 10 cm (hidden a little: deep in the bottom of the cleft, the start of the
     gusset, under a cheek), or the sheet steeper than 45° there: **blended**;
   - sheet off the skin (> 0.5 mm) and the vertex is the skin seen there: moves along −d onto the
     sheet (≤ 12 cm), faded out over the region's top (15-25 cm) and sides (11-16 cm);
   - otherwise (the sheet rests on it): keeps its lift.
   Blended vertices, and bare skin next to fabric (the triangles across an opening's edge), take the
   mean of their neighbours' displacement (200 Gauss-Seidel passes), so the seat blends into the
   gusset. It replaces the membrane's or ball's lift there.
5. **Shading**: moved vertices use the sheet's own normal (−d + u_a·e1 + u_b·e2, weighted by the
   fade) instead of their triangles', and AO from the sheet's span over the skin (s − u) instead of
   how far the vertex moved; blended vertices interpolate the AO depth.

Measured, first version (teen, arms-down, B8; equal tension, back half only; fabric dip at the
midline against the cheeks at 2/4/6/10/14 cm above the crotch): membrane 46/36/29/22/10 mm, with the
sheet 46/23/11/6/3 mm. Cost now about 0.12-0.32 s per garment update.[^app-2026-10-25]

Tuning found on the way:
- Stopping the move dead at the region's top left a step (a highlight line) across the small of the
  back, because the sheet also spans the spine's groove: hence the fade.

## Owner review and second version (2026-10-25)

Owner: the first version "produces artifacts and leaves a hole still going deep into the seat".
Judged from renders in a light colour (owner: always render seat tests on a light leotard, so the
shading of the seat's shape shows), older-teen body, arms-down, A-pose, lunge and split leap. Causes
found, each fixed in steps 3-5 above:[^app-2026-10-25]

- **The hole**: at the bottom the cleft is up to 10 cm deep (to the perineum) and its walls reach
  forward of the side seam (form > 0). The region was the back half only, so those walls never
  moved and left a pocket. Now the whole trunk in the region, sorted by visibility.
- **Spikes at the lower edge**: free cells at the outline had no neighbour beyond, so the sheet
  floated off (up to 8 cm behind the crotch) and dragged the fabric there back. Now held.
- **A groove down the lower cleft** (lunge): not a bug. With equal tension a membrane spanning a gap
  over a rounded seat must form a saddle (u_xx = −u_yy). Leotards are stretched far harder around
  the hips than up the seat; tension across 4× along pulled it straight across (row 3 cm up, lunge:
  sheet 16 mm below the cheek-to-cheek line at 1:1, 5 mm at 4:1, none at 10:1).
- **Crumpled fabric where the cleft meets the gusset**: first one row moved 5 cm and the next not at
  all (a visibility cut-off); then, with blending, neighbours 1 mm apart landed 2 cm apart where the
  sheet drops steeply to its held edge. Fixed by the blending, the 45° rule and the sheet normals.

Tried and dropped (judged by renders):
- A facing test (held where the skin seen turns from the view): also held the cleft's own walls
  (they face sideways), dimples in the sheet; in the split leap the lower half stayed open.
- The outline free across only (a taut line from cheek to cheek along the bottom), or fully free: a
  ledge of fabric floating off under the seat in the lunge.
- Spreading the moved vertices over the sheet (relaxing their place across it, so the walls'
  material is not crushed into a strip): folded the fabric into flaps down the cleft.
- Skin facing down (the gusset seen edge-on) blended instead of moved: tried only with the free
  outline, dropped with it.

What remains: a small smooth V where the seat turns under into the gusset (as on real leotards),
and in extreme close-ups under the crotch a faint line where the seat meets the gusset. The walls'
material is still crushed into a narrow strip on the sheet: shading hides it, a print would show a
seam-like jump down the cleft.

Controls: settings popover, Fabric fit, "Taut across the seat" (on by default) and "Stretch across
the seat" 1-30× (default 4×; `liftSeatAcross` in `render/display.js`, passed to the mannequin as
`liftOpt.seatAlong` = 1 / it). The range was 1-10× until the owner asked for more (2026-10-25);
30× renders cleanly (one-arm-up pose, no streaks) and differs little from 10×: the small V at the
bottom comes from the sheet's held edge there, not from the tension.

### The V into the gusset (investigated 2026-10-25, not changed)

Owner asked to make the V where the seat turns under into the gusset shallower. Findings (older
teen, arms-down, light leotard):[^app-2026-10-25]
- The V comes from the sheet's held outline at the two corners where the gap between the thighs
  begins, not from its bottom edge: holding the hips firmly and releasing only the bottom edge made
  no difference; releasing the outline within 8 cm of the midline removed the V from the seat.
- But then the two leg openings' edges, which run down into the bottom of the cleft to meet the
  gusset, stay behind: their trim (`render/rims.js`) stretches into a vertical fin. Partial release
  (a spring pulling the outline towards the skin, strengths 0.1-1) gave a V plus a fin. Reverted.
- So a shallower V needs the openings' elastic edges at the gusset to lift out of the cleft with
  the seat (and the trim to follow them), as real elastic under tension does. Not done.
- Releasing every outline cell (hips too) floated the seat off the hips.

Second round (owner: "continue in the direction you think is best", 2026-10-25), all reverted,
judged on renders in standing, lunge, split leap and stag jump:[^app-2026-10-25]
- Gusset zone (6 cm either side of the crotch, 5 cm up, seen from behind) with the sheet free over
  everything there: V gone, but the fabric at the bottom of the cleft lies about 10 cm forward of
  the cheeks; pulled back onto the sheet, vertices past the 12 cm move cap stayed put and tore into
  a fin. Blending those instead gave a smooth ramp, but the sheet, floating past the seat's real
  lower edge, laid the gusset's underside flat onto it: a tab hanging below the seat. Blending skin
  facing down in the zone removed the tab; a spike stayed where the leg trim meets the gusset (from
  the rule lifting hidden sideways walls) and the leg-opening edge on the gusset turned ragged
  (blended gusset slid back into the thigh). Keeping the downward-facing gusset in place instead
  creased the lower cleft again. In standing the best variant left a curled glassy piece at the
  gusset, worse than the V.
- A second sheet seen from below, for the cleft's fabric to drop onto: it saw the feet under the
  thighs (or an artificial edge where the thighs were cut off) and hung a strip down between the
  legs.
- A local 3D relaxation in the zone (each vertex towards its neighbours' mean, pushed out of the
  skin along the nearest skin vertex's normal): the leg-opening edges slid along the skin into
  scallops, and the V hardly changed in standing.
Conclusion: a height field (one view) cannot describe fabric that turns under, and the patches
interact. A real fix is likely a small cloth relaxation of the crotch region with the leg
openings' edges kept from sliding (edge length or pattern rest lengths) and proper collision,
started from the sheet's result.

Also seen: in the stag jump a strip down the upper cleft is not spanned (a crease). The leaning
cleft makes its walls count as hidden (more than 5 mm behind the skin seen), so they are blended,
not lifted, and about 1,200 vertices fall under the 45° rule. Lifting hidden walls that face
sideways did not visibly fix it, and a view direction from the cheeks only made no difference.
Not fixed.

Not yet done: the bust (the fold under it is the same kind of problem; the same code with another
region and frame), bodies other than the teen and older teen checked by eye.

# Limits and open issues **[INFERRED]**

- It is a geometric heuristic, not a tension model: bridge shape does not depend on fabric stiffness,
  panel boundaries or seams. Openings are now pinned (above), which approximates elastic pulling the
  edge into a crease, but the pin is all-or-nothing rather than a tension.
- **Cloth simulation is not needed to fix fit gaps.** The owner asked on 2026-10-15 whether to simulate
  cloth per body; the visible gap at the shoulder was a bug in this heuristic, not missing physics
  (see [garment as a surface layer](/engineering/geometry/garment-as-surface-layer.md)). A tension-aware
  refinement, if ever needed, is a per-body precomputation from the flattened pattern's strain, not a
  real-time simulation. **[INFERRED]**
- Bridged area is fabric that does not touch the body; flattening the *garment* surface (lifted) rather
  than the skin gives different piece lengths across hollows. Which one to flatten is a decision for
  the pattern pipeline; the lifted surface is closer to what the fabric does.
- Straps spanning hollows should become separate ribbons between anchor points
  (see [garment as a surface layer](/engineering/geometry/garment-as-surface-layer.md)).

[^body-js]: poc-threejs/src/body.js in the project repository.
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
[^report]: Research report (in-bundle mirror).
[^fix-2026-10-15]: Measured in the running POC before and after the change, 2026-10-15 (young-adult body, tank, scoop back).
[^app-2026-10-25]: Measured in the running designer app, 2026-10-25 (teen body, A-pose, the design open at start-up).
