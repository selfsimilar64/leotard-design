# Reference simulator results

**How fabric treats compression is the largest physics effect measured, and friction's effect depends mostly on the starting state. Gravity does nothing.** These are all 20 queued runs plus the baseline, on one garment and one body. They compare models, not reality. Halving the time step (`dt240`) moved the result 0.38 mm mean, 0.60 mm at 95%, below the settling drift. Code, commands and versions: `pipeline/reference/README.md`. All tables: `out/tables.md` from `report.py`.

## What ran

Newton 1.7.0 `SolverStyle3D`, warp-lang 1.19.0, Python 3.13.3, GTX 1650. Whole garment, 13,602 vertices and 26,958 triangles, our mesh and flat points, started from our resolved fit. libuipc was not needed.

Baseline: raw skin, friction 0.5, 215 N/m in both axes, shear 108 N/m, 0.2 kg/m2, bending 5 uN.m, elastic 5 N per unit strain (tension only), gravity on, self-contact off, stock membrane that charges compression. 1/120 s step, 10 simulated seconds, 2-6 minutes per run.

Our patches, not stock Style3D: edge elastic (every run), Poisson term (`poisson`), our free-compression rule (`gather`, controls).

## Measured: effects against the baseline, largest stretch or line effect first

Displacements compare the same flat point. Leg is the largest half-width change at any level on either piece; low is the largest change of a lowest point; stretch is the largest change in a regional mean.

| Switch | Mean / 95% / max, mm | Leg, mm | Low, mm | Stretch |
|---|---|---|---|---|
| Free compression (`gather`), patch | 1.56 / 5.77 / 19.7 | 5.3 | 4.5 | 0.308 |
| Friction 0 (`mu0`) | 6.22 / 11.94 / 43.7 | 8.1 | 3.2 | 0.023 |
| Friction on after a frictionless settle (`mu05_after_mu0`) | 6.23 / 11.94 / 43.7 | 8.1 | 3.1 | 0.023 |
| Elastic off (`ea0`) | 1.35 / 4.85 / 23.3 | 6.2 | 10.9 | 0.036 |
| Low shear, 0.1 against 0.5 of stiffness (`lowshear`) | 2.16 / 4.63 / 17.5 | 5.8 | 2.8 | 0.020 |
| Narrowing, nu 0.3 (`poisson`), patch | 1.67 / 4.33 / 12.5 | 5.7 | 1.1 | 0.040 |
| Elastic 10 (`ea10`) | 0.60 / 2.23 / 13.4 | 4.0 | 2.1 | 0.014 |
| Fabric 120 (`k120`) | 0.66 / 1.96 / 13.8 | 3.9 | 2.2 | 0.012 |
| Friction 0.7 (`mu07`) | 0.49 / 1.71 / 8.4 | 3.6 | 1.4 | 0.002 |
| Lifted surface as collider (`lifted`) | 0.68 / 2.83 / 16.7 | 3.3 | 0.5 | 0.008 |
| Grain, stiffer around (`grain_b`) | 1.55 / 5.32 / 16.8 | 2.3 | 0.7 | 0.016 |
| Grain, stiffer along (`grain_a`) | 1.84 / 3.65 / 13.5 | 1.9 | 0.2 | 0.014 |
| Fabric 385 (`k385`) | 0.62 / 2.15 / 13.8 | 1.9 | 1.1 | 0.011 |
| Elastic 3 (`ea3`) | 0.46 / 1.40 / 15.3 | 1.7 | 0.9 | 0.009 |
| Friction 0.3 (`mu03`) | 0.48 / 0.89 / 10.8 | 1.0 | 0.3 | 0.004 |
| Gravity off (`nograv`) | 0.15 / 0.29 / 6.9 | 0.5 | 0.0 | 0.000 |
| *Drift: 10 more seconds, no change (`baseline_more`)* | *0.54 / 1.06 / 11.7* | *0.8* | *0.8* | *0.004* |

The drift row is the floor: an effect near it is not distinguishable from a run that is still settling. Friction 0.3 and 0.7 and elastic 3 are close to it on mean displacement.

## Measured: against our solver

| Run | vs ours, mean / 95% / max, mm | Back waist along | Back / front lowest, mm | Front half width at 7 / 10 cm, mm | Skin gap mean: small of back / cleft / crotch, mm |
|---|---|---|---|---|---|
| Ours | 0 | 0.759 | -5.2 / -3.6 | 71.8 / 102.9 | 4.12 / 8.72 / 1.12 |
| `gather` | 1.42 / 4.10 / 21.1 | 0.753 | -5.1 / -3.5 | 69.8 / 100.5 | 3.05 / 9.36 / 1.20 |
| `control_ours` (lifted surface) | 5.25 / 9.29 / 27.0 | 0.769 | -5.3 / -4.4 | 78.3 / 111.8 | 4.72 / 10.61 / 2.29 |
| `control_stock_skin` (same, plain skin) | 5.52 / 9.66 / 26.9 | 0.767 | -5.2 / -4.6 | 78.2 / 111.7 | 2.87 / 9.97 / 1.75 |
| `baseline` | 2.00 / 6.84 / 21.6 | 0.989 | -9.6 / -7.9 | 69.8 / 100.3 | 4.15 / 9.17 / 2.97 |
| `mu0` | 6.92 / 12.54 / 47.9 | 0.988 | -6.4 / -6.1 | 70.6 / 100.2 | 3.21 / 8.28 / 2.77 |

## Re-run from the final fit

The tables above started from the older fit (span-set elastic, 120 iterations). Three runs were repeated from the final fit (`ELASTIC_WIDTH` 20 mm, 360 iterations, wrist fixed): 10 simulated seconds each. `control_ours` here uses `ea=4.3`, matching 20 mm at 215 N/m, not the `ea=12` in `experiments.py`.

| Run | vs ours, mean / 95% / max, mm | Back half width 2 / 7 / 14 cm | Front half width 2 / 7 / 14 cm | Back / front lowest, mm | Back waist centre along |
|---|---|---|---|---|---|
| Ours | 0 | 60.0 / 102.8 / 143.2 | 29.8 / 66.2 / 136.2 | -3.8 / -3.5 | 0.598 |
| `control_ours` (our physics, frictionless) | 3.94 / 7.54 / 25.4 | 59.9 / 102.9 / 143.9 | 29.6 / 68.2 / 139.0 | -4.1 / -3.5 | 0.596 |
| `gather` (friction, gravity, free compression) | 1.16 / 3.84 / 20.5 | 60.0 / 103.0 / 143.6 | 29.6 / 66.5 / 136.5 | -3.8 / -3.3 | 0.600 |
| `baseline` (friction, gravity, compression charged) | 2.37 / 6.20 / 20.7 | 68.1 / 106.3 / 144.6 | 34.6 / 66.6 / 136.7 | -8.1 / -7.2 | 0.995 |

- **The fit is a real rest state of the same physics in another solver, at the lines.** With our physics, the back leg line agrees within 0.7 mm and the front within 3 mm, and the lowest points within 0.3 mm. The earlier 5-7 mm difference falls to 3.94 mm mean, and it is not at the lines; where it sits was not mapped. Both solvers share the same assumptions, so this checks the solving, not reality.
- **Compression stays the deciding unknown.** Charging for it moves the back line at 2 cm by 8 mm and doubles the lowest-point drop.

## Settling and trust

- **No run blew up.** Ending torso mean speed was 0.002-0.116 mm/s, at or below the 1 mm/s friction creep.
- **The baseline is not perfectly still.** Ten more seconds moved it 0.54 mm mean, 1.06 mm at 95%, and changed the small-of-back gap by 0.7 mm. Friction creep is the likely source.
- **Maximum displacements are not trustworthy.** Gravity off shows 0.15 mm mean but 6.9 mm max, and the drift run 11.7 mm max, so the max column contains local noise.
- **Runs to treat with caution:**
  - Both controls settled worst. `control_ours`: torso net force 2.20 mN at 95%, 250 mN max, torso 5.21 mm inside its collider. `control_stock_skin`: 2.97 mN at 95%, 165 mN max, torso 6.14 mm inside the skin. In both, the leg edge no longer reaches 14 cm.
  - `mu0` has torso points 3.07 mm inside the skin, location unknown.
  - `k385` and `ea10` have torso speeds up to 5.5 and 8.4 mm/s at isolated points.
  - `poisson` has a 1.0 mm left/right difference on the front leg.
- A net-force maximum of tens to hundreds of mN persists at isolated spots in most runs, which means local unsettled points. These spots were not located.

## Inferred

- **Compression decides the back waist and the lowest points.** Charging for it gives 0.99 along at the back waist; not charging gives 0.75. It also moves the lowest points by 4.5 mm and the crotch gap by 1.8 mm, and accounts for most of the difference from our solver. This holds with friction and without (`control_ours` 0.77). The model cannot say which is real: thin fabric should buckle at almost no force, and this mesh does not form real folds. Agreement between `gather` and ours is weak evidence on its own because friction holds a start that had no reason to move.
- **With friction, the end state remembers the start.** Switching friction on after a frictionless settle stays at the frictionless state (the two runs agree to 0.1 mm in the leg widths shown), and friction 0.3 against 0.7 barely matters. So friction selects among states rather than giving one answer, and how the garment was put on would matter.
- **Elastic strength over fabric stiffness is the number that matters, not either alone.** Fabric 120 matches elastic 10 (ratio about 0.04-0.05): lowest -8.1 / -5.7 against -7.7 / -5.8. Fabric 385 matches elastic 3 (ratio about 0.013): -10.4 / -9.0 against -10.2 / -8.8. This confirms the audit's claim that overall stiffness cancels on a rigid body. It is a consistent pattern across four runs, not a proof.
- **Both frictionless runs settle 5-7 mm mean from our frictionless fit.** So our fit may not have finished sliding along low-force directions, which is what audit step 1 asks about. Other differences in those runs could also cause it, and `control_ours` settled poorly, so this needs checking.
- **One-sided contact could not be isolated.** `gather` is the closest comparison, with 1.42 mm mean, but friction holds it near the start. `control_ours` differs by more but is confounded as above.
- **The precomputed surface barely affects leg lines or stretch here, and changes only the gap in hollows.** With no friction and our physics, swapping lifted surface for plain skin changed the leg half widths shown by at most 0.2 mm, the lowest points by at most 0.2 mm, and back-waist stretch by 0.002. It lowered the small-of-back gap by 1.85 mm and the crotch gap by 0.54 mm. This weakens the audit's expectation in row 2 that a tension-responsive surface is a leading candidate. Both controls started from our lifted fit and settled poorly, so the confidence is medium.
- **The seat cleft span looks physical in this model.** It stays 8-10 mm off plain skin in every run, including frictionless on bare skin (9.97 mm), against 8.7 mm in ours.
- **Shear stiffness matters as much as narrowing and has no usable data.** Lowering it moves the front leg 5.8 mm at 10 cm, almost the same move as narrowing (both 94.5 mm), so a stretch measurement alone would not separate them.

## Found along the way

- **Our resolved fit has a tangle at each wrist.** 34 triangles exceed 2x stretch, reaching about 5-6x, around x = 0.24-0.26, y = 0.85-0.87. The reference inherits it, so settling is judged on the torso. Since fixed: the sleeve's rolled start took its width from a table that included the wrist curve (`pipeline/wrap_block.py`, `half` in the sleeve start).
- Self-contact was off because, with it on, net forces reached about 11 N (about 1 N off), which I attributed to its untangling force reacting to our start state. Row 15 is untested.

## Limits

One body, one cut, one pose. Published fabric ranges, no measured fabric or elastic. Vertex-only contact on a 7 mm mesh. No real garment was involved, so nothing here says which model is right.
