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
[plan](/product/roadmap/flat-and-3d-exploration-plan.md) needs. Standing body only so far.

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
exactly what `GarmentView` uses (`rec.hosts`). So `dev/wrap-eval.js` draws it with the real fabric materials. In principle it
follows any body and pose; that is **untested**, because the viewer places points on the reference surface for now (the app's lift
only covers its own pieces).

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

Difference between the whole block's map and a re-solve with the cut, on the same points:

| Cut | Mean | 95% | Max | Where |
|---|---|---|---|---|
| Scoop neck (90 mm front, 160 mm back) | 1.1 mm | 2.7 mm | 7.0 mm | Largest above the waist |
| `HIGH HIPS` leg from `THIGH` | 2.2 mm | 11.8 mm | 26.1 mm | Below hip 11 mm mean, waist to hip 4 mm, above waist under 1 mm |

**[INFERRED]** The plan's 3 mm gate is met for necklines, not for a big leg change: removing the fabric across the hips releases
tension there. So one solve per leg cut, then reuse for lines inside it. Panel seams, which remove no fabric, were not tested and should move less still.

# Known flaws

- Standing only; poses untested.
- Cut edges follow mesh triangles, so they are slightly rough; the back's crotch shows a notch. No finishes are drawn yet.
- The bust stretch is a strong local maximum (area up to about +60%); the block has no bust shaping, and a real stretch fabric would flatten the bust somewhat, which the surface does only partly.
- The block's `THIGH` leg is close to a boy-leg short on this body. The listing's "Brazilian" wording does not match.
- No flat-to-3D-and-back round trip yet (stage 4); fabric and stretch behaviour is not modelled, only length.

[^code]: Solver and viewer
