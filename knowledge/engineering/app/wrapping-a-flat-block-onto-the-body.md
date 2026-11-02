---
type: Technique
title: Wrapping a flat block onto the body
description: "Stage 3 spike, 2026-11-01: a purchased block's flat pieces, seams welded, solved onto the garment surface in about four minutes for five solves. Under 0.1% inside out, zero seam gap, stretch close to the block's intended ease; a neckline cut can reuse the fit, a large leg cut should not. The map is host triangles the app's own renderer can use."
tags: [pattern, flattening, fit, exploration, geometry]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-01T23:30:00Z }
sources:
  - id: code
    resource: "pipeline/wrap_block.py, app/src/dev/wrap-eval.js; output app/captures/wrap-XS-*.json (git-ignored)"
    title: Solver and viewer
  - id: block
    resource: /domain/construction/basicpatternblock-leotard-block.md
    title: The purchased leotard block
  - id: plan
    resource: /product/roadmap/flat-and-3d-exploration-plan.md
    title: Flat and 3D exploration plan
---

# Takeaway

Solving from the flat pieces works: the block lands on the `young` body as a believable leotard with real seams and a
grid drawn on the flat pattern staying legible.[^code] Every flat point now has a 3D place, which is the map the
[plan](/product/roadmap/flat-and-3d-exploration-plan.md) needs. The owner passed the look on 2026-11-01, and one solve carries into every pose tried.

# Method (`pipeline/wrap_block.py`)

1. **Mesh.** Half a garment: front, back, one sleeve, 7 mm spacing, boundaries sampled so seam partners have equal point
   counts. Cut lines (`HIGH HIPS` leg, a trial scoop) are inserted as mesh points, so a cut is the same mesh with triangles removed.
2. **Weld.** Shoulder, side, crotch, underarm and armhole-to-cap points are one point, so **seam gap is zero by construction**.
   Sleeve cap: halves split at its top, each eased evenly into its armhole.
3. **Energy.** As-rigid-as-possible against the flat shape (the same family as `garment/flatten.js`, run the other way).
   Each point keeps to the surface's **tangent plane**, free to slide; fold edges stay on x = 0; a damping of 0.05.
   The surface is the lifted garment surface, so fabric bridges hollows.
4. **Stages.** Torso (240 iterations), sleeve onto that armhole with the armhole held (240), both together (60).

What was needed, in the order it failed:

- Pulling to the closest point holds points almost still; the tangent plane lets them settle.
- 2D into 3D has no handedness, so ARAP will happily turn triangles inside out. The rotation is reflected where it would
  (`FACING`: front +1, back and sleeve -1 on the +x side). Inside-out share fell to 0.08%.
- Seeding from the app's own pieces works for the torso when only shared edges correspond (its high leg to the block's) and
  points beyond extrapolate. For the sleeve it folds, because the block's head is much taller: the sleeve starts rolled round the arm by angle instead.
- The inner arm nearly touches the ribs, so torso and sleeve points each search only their own part of the surface (`wArm`).

Cost: about 255 s for five solves at this mesh on the owner's machine (CPU, Python). Not interactive.

# The map

Output per piece: flat `uv` in metres, triangles, and for each point a **host triangle and weights on the shared body mesh**,
exactly what `GarmentView` uses (`rec.hosts`). So `dev/wrap-eval.js` draws it with the real fabric materials, and it follows any
body and pose.

# Results, block XS with the `HIGH HIPS` leg's parent solve

| Check | Result |
|---|---|
| Converged | Mean move 0.019 mm per iteration at the end |
| Inside-out triangles | 0.08% |
| Seam gap | 0 |
| Across stretch, hip / waist / bust, front | 1.19 / 1.13 / 1.32 |
| Across stretch, hip / waist / bust, back | 1.22 / 1.08 / 1.09 |
| Along stretch | 0.93-1.04 at those levels |
| Worst 1% | across 1.37 and 0.84, along 1.17 and 0.89 |

Measured against the [block's intended reduction](/engineering/app/flat-pattern-against-a-real-block.md) (waist 8%, hip 14%,
bust about 18%, which correspond to 1.09, 1.16 and 1.22 stretch), these are similar, with more taken across the front at the bust and less on the back.

## Where lines land

- Neck at centre front is 6 mm below the `neck_base` landmark's height.
- Shoulder seam ends 15 mm outside the shoulder landmark in x, near the top of the arm.
- The wrist edge runs about 40 mm past the wrist landmark, onto the hand: the block's sleeve is longer than this body's arm, and bunches on the back of the hand. A real wearer would have the same excess or a shorter sleeve; this body's arm or the sleeve needs adjusting.

## Reusing the fit for a cut

**Superseded 2026-11-02:** cuts now have their own exact lines and mesh ([why](/domain/construction/what-makes-a-pattern-true.md)). With those, reuse at 95% of points is: scoop 3.5 mm (just over the 3 mm gate), `HIGH HIPS` 9.1 mm, cuff 7.7 mm (4.2 mm mean on the sleeve, under 2.7 mm at 95% below the waist). The table below is the earlier method.

Difference between the whole block's map and a re-solve with the cut, on the same points:

| Cut | Mean | 95% | Max | Where |
|---|---|---|---|---|
| Scoop neck (90 mm front, 160 mm back) | 1.1 mm | 2.7 mm | 7.0 mm | Largest above the waist |
| `HIGH HIPS` leg from `THIGH` | 2.2 mm | 11.8 mm | 26.1 mm | Below hip 11 mm mean, waist to hip 4 mm, above waist under 1 mm |

**[INFERRED]** The plan's 3 mm gate is met for necklines, not for a big leg change: removing the fabric across the hips releases
tension there. So one solve per leg cut, then reuse for lines inside it. Panel seams, which remove no fabric, were not tested and should move less still.

| Sleeve shortened 45 mm at a straight line | 2.1 mm | 7.7 mm | 13.7 mm | Sleeve 4.4 mm mean, 9.7 mm at 95%; torso under 1.7 mm below the waist, under 1.3 mm at 95% above it |

A shorter sleeve can be treated as a mask for the torso, and nearly so for the sleeve, whose remaining length relaxes because the
excess no longer compresses it.

# Poses and other bodies

One solve (block XS, `HIGH HIPS` leg, sleeve shortened 45 mm) placed by its host triangles, with **no re-solve** per pose or body.
`wrap-eval.js` tells the engine where this block's fabric is through `coverHooks`, so the body lifts and slides under it; without that, skin
showed through at the hip past the app's own cover. Run 2026-11-01; `app/captures/wrap-strain.json`, `wrap-sheet-poses.png`.

Median [2nd to 98th percentile] stretch against the flat piece:

| Pose | Front across | Front along | Back across | Back along | Sleeve along |
|---|---|---|---|---|---|
| Standing rest (`a-pose`) | 1.16 [1.00-1.40] | 1.00 [0.92-1.13] | 1.08 [0.92-1.23] | 0.99 [0.87-1.11] | 1.00 [0.92-1.11] |
| `standing` | 1.22 [0.71-1.77] | 1.06 [0.84-1.37] | 1.02 [0.67-1.23] | 0.92 [0.79-1.37] | 0.90 [0.67-1.38] |
| `passe` | 1.18 [0.57-1.69] | 1.08 [0.78-1.50] | 1.03 [0.44-1.39] | 0.95 [0.82-1.55] | 0.86 [0.48-1.66] |
| `lunge-arms-up` | 1.16 [0.58-1.46] | 1.05 [0.85-1.40] | 1.09 [0.65-1.61] | 0.99 [0.82-1.37] | 0.92 [0.54-1.39] |
| `stag-jump` | 1.19 [0.73-1.47] | 1.06 [0.84-1.30] | 1.06 [0.79-1.41] | 0.87 [0.67-1.12] | 0.90 [0.65-1.21] |
| `back-arched` | 1.26 [0.59-1.95] | 1.20 [0.91-1.62] | 0.99 [0.66-1.25] | 0.82 [0.62-1.38] | 0.90 [0.63-1.46] |

**[INFERRED]** It looks right in all five poses, and the medians are sensible. The ranges are the skin's own deformation carried onto the cloth, not cloth
behaviour: values well below 1 would wrinkle or slide on a real garment. It follows the app's "appears correct" rule, but a printed motif in a strong pose is only approximate.

The same map on other bodies, median stretch front across / front along / back across / back along:

| Body | Stretch | Reading |
|---|---|---|
| `young` (solved on) | 1.16 / 1.00 / 1.08 / 0.99 | Designed fit |
| `adult` | 1.13 / 1.03 / 1.07 / 1.00 | XS fits |
| `older-teen` | 1.16 / 1.03 / 1.09 / 0.99 | XS fits |
| `teen` | 1.12 / 0.99 / 1.04 / 0.96 | XS somewhat roomy; XXS likely |
| `child` | 0.93 / 0.83 / 0.87 / 0.81 | Too big: below flat size, so loose |
| `child-6` | 0.85 / 0.71 / 0.79 / 0.70 | Far too big |

These only transfer the map; a true fit on another body would be its own solve at its own size. No size other than XS has been solved.

# Known flaws

- Cut edges follow mesh triangles, so they are slightly rough; the back's crotch shows a notch. No finishes are drawn yet: the owner noticed the block lacks the app's raised edge finishes, so a block design must drive `render/rims.js` from its own openings.
- The bust stretch is a strong local maximum (area up to about +60%); the block has no bust shaping, and a real stretch fabric would flatten the bust somewhat, which the surface does only partly.
- The block's `THIGH` leg is close to a boy-leg short on this body. The listing's "Brazilian" wording does not match.
- No flat-to-3D-and-back round trip yet (stage 4); fabric and stretch behaviour is not modelled, only length.

[^code]: Solver and viewer
