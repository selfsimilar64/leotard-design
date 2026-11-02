---
type: Technique
title: Fit solver realism audit
description: "November 2026 audit of pipeline/wrap_block.py against public cloth simulators and skin-tight garment research, before any speed work: a sound geometric fit but not a realistic cloth simulation. Fifteen ranked differences, then first-hand results for steps 1-5: the fit settles and holds up on finer meshes and in a heavier simulator, no new physics earned its place, carrying a fit into a pose is the largest error measured, and wrinkles now come from the fit."
tags: [fit, simulation, audit, fabric, elastic]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-03T00:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-02 (Claude Code session)
    title: "Audit how realistic the solver is before optimising it"
    author: human:mattj
  - id: report
    resource: "reports/Tight garment fit solver audit.md, with notes in research_notes/Tight garment fit solver audit/"
    title: Full audit report and research notes, with sources
---

# Takeaway

The solver is a sound geometric fit, not a realistic cloth simulation.[^owner] Steps 1-5 below tested it: the standing fit is settled, independent of mesh size, and reproduced by a heavier simulator using the same physics. **The largest measured error is poses: carrying the standing fit moves the leg line 15-34 mm on average from what a re-solve finds.** Nothing has been checked against a real garment, and no audited public project validates a stretch fit against reality. Full table and citations are in the report.[^report]

# Differences, most impact first

The ranking is a judgement: no paper tests these one at a time on one garment.

1. Poses are not re-solved; the slide never sees pattern, elastic or gathering.
2. The garment surface is decided before the fit, for the app's cover and not the block.
3. Elastic strength is a guess, and depended on mesh size (since fixed).
4. Spare fabric shows as squeezed print; nothing forms a fold, and rendered wrinkles sat in fixed zones (now from the fit, in the preview).
5. Nothing selects where slack settles locally.
6. Rigid body.
7. Fabric is the same in every direction; grain is stored but never read.
8. No friction.
9. No narrowing when stretched.
10. Fabric is held to the surface both ways.
11. Seams have no stiffness. 12. The 7 mm mesh is unchecked. 13. No bending or gravity. 14. Linear stretch response. 15. No fabric-on-fabric contact.

# First-hand tests, `young`, high cut

- **Starting shape:** three starts ended 0.4-0.6 mm apart on average, 95% within 1.4 mm, 6.7-9.1 mm at worst; waist back along 0.75-0.76 in all. The overall fit is not set by the start, for this family of starts.
- **Double lift:** `show` in `app/src/dev/wrap-eval.js` placed fabric on the lifted surface and the shader added the lift again: 8.8-12.2 mm at most at the crotch. Fixed; earlier renders carried it. The nub remains without it. A 1.2 mm offset is still applied twice.

# Results of steps 1-5, `young`, high cut

Checks: `pipeline/fit_checks.py`, `pipeline/pose_resolve.py`, `pipeline/reference/` (results in `research_notes/Tight garment fit solver audit/reference_simulator_results.md`).

**1. Settling and forcing.** 120 iterations were too few (240 more moved 1.7 mm mean, 7 mm at most), so `CUT_ITERS` is 360: 240 more move 0.22 mm mean, 3.15 at most; 720 more 0.14 mean. Along-surface force is about 1000 times smaller than the force holding fabric to the surface. Pressure, mmHg, median: crotch 2.5, seat 2.5, back waist 3.5, belly 2.6, bust 1.1, upper back 0.25, sleeve 1.2, about the published 1-6. The surface holds fabric in by suction, not contact, on 47% of the small of the back, 30% of the cleft, 27% of the bust, 11% of the upper back. 3.7% of triangles sit at the gathering limit.

**2. Elastic and mesh.** Elastic now pulls only and has strength per unit length (`ELASTIC_WIDTH`, default 20 mm, range 10-50).

| Width | Back 7 cm half width | Front 7 cm | Leg loop | Lowest | Waist back along |
|---|---|---|---|---|---|
| 10 mm | 102 | 65 | 653 | -3.6 | 0.70 |
| 20 mm | 106 | 66 | 644 | -3.8 | 0.71 |
| 30 mm | 107 | 72 | 637 | -4.1 | 0.72 |
| 50 mm | 115 | 78 | 624 | -4.8 | 0.74 |

Mesh, 1440 iterations each, against 3.5 mm: 7 mm differs 1.32 mean, 2.78 at 95%; 5 mm 1.25, 2.32. So 7 mm is adequate. At 360 iterations a 3.5 mm mesh differs from itself at 1440 by 7.31 mean: fine meshes settle far more slowly, and the earlier apparent mesh dependence was this.

**3. Reference.** Newton's Style3D solver on the GPU, 20 runs. With our physics from the final fit, it holds the leg lines within 0.7 mm at the back and 3 mm at the front, 3.94 mm mean overall. Full physics with free compression: 1.16 mean. Largest effect: charging for compression, 0.60 to 0.995 along at the back waist centre, lowest point -3.8 to -8.1 mm, no data to say which is real. Friction preserves the start rather than choosing an answer; gravity does nothing; grain is small at the lines; narrowing and low shear each move the front leg about 6 mm, indistinguishably, with no data. **Decision: no physics added.** The reference compares models, so a change made from it would swap one unverified assumption for another.

**4. Poses.** Both sides joined, 480 iterations, a-pose as control.

| Pose | Moved, mean / 95%, mm | Leg line moved, front / back mean, mm | Torso over 1.5 stretch, reused / re-solved |
|---|---|---|---|
| `a-pose` (control) | 0.2 / 0.7 | 0.2 / 0.6 | 0 / 0 |
| `back-arched` | 26.2 / 48.5 | 34.1 / 32.2 | 7.9% / 2.4% |
| `passe` | 25.9 / 43.6 | 15.1 / 17.2 | 7.3% / 1.3% |
| `lunge-arms-up` | 30.0 / 46.8 | 16.6 / 31.9 | 6.6% / 0.5% |

Reuse overstates stretch at hot spots and misplaces the leg line by more than anything else measured. The re-solve has no friction, so it shows where fabric would settle if free to slide, an upper limit on real sliding; the true answer lies between. A half-garment plus fold cannot be used here: poses are asymmetric, and that first attempt gave invalid moves of 136 mm.

**5. Wrinkles.** `folds_of` turns where the fit leaves fabric smaller than flat into a height and direction (Cerda & Mahadevan: height = wavelength / pi x sqrt(flat / now - 1), wavelength 20 mm), smoothed over about 25 mm so that only squeeze with a common direction forms a fold. The fit preview draws them in place of fixed zones. Limits: dev preview only, since the app does not show the fit yet; shading only, geometry unchanged; poses carry the standing folds, because a carried fit's strain is not fit to draw from, so a pose has no folds of its own; `.25` shading strength is by eye; some blockiness remains in wide shots at the armpits and waist.

# Leave alone

The free-compression force rule, the solving family, flat pieces as rest shape, welded seams, the published leg elastic ratios, and solving half and mirroring. A public engine should not replace the solver as the product; GarmentCode's simulator fork and ARCSim also have non-commercial limits.

# Order of work

Real fabric and sewn garments are ruled out for now.[^owner] So fit cannot be validated against a garment: it is checked against published data, a heavier simulator and photos, and unmeasured values are treated as ranges.

Steps 1-5, above, are done: measures, elastic and mesh, reference and physics, poses, wrinkles.

6. Compare with photos of real leotards, especially printed or striped ones, as a judgement of appearance.
7. Speed work, using `pipeline/refit_bench.py` as baseline.

Hang-weight tests and a printed-grid garment remain the way to replace estimates if physical testing becomes possible.

[^owner]: Conversation with the product owner.
[^report]: Full audit report and research notes, with sources.
