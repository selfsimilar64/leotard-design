---
type: Technique
title: Refitting after an edit
description: "November 2026: how fast and how accurately a fitted block re-settles after a structural edit such as a cutout, started from the fit already there. First measurement, on one body, of the owner's plan for updating the fit inside the app."
tags: [fit, performance, refit, cutouts]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T23:30:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-02 (Claude Code session)
    title: "Edits within the base design need no recalculation; structural edits re-fit automatically or from a button, and must not interrupt designing"
    author: human:mattj
  - id: code
    resource: "pipeline/refit_bench.py, pipeline/wrap_block.py"
    title: Benchmark and fit
---

# Takeaway

The owner's plan: edits within the base design reuse the fit; structural edits such as cutouts get a re-fit, automatic if fast enough, otherwise from a button.[^owner] Measured on `young`, high cut, in the offline Python solver (6,898 points, about 0.3 s per iteration, unoptimised):[^code] a whole-garment re-fit needs tens of seconds to settle, too slow for after every edit, acceptable in the background or behind a button. The first results are in the table below.

# Method

`pipeline/refit_bench.py` settles the fit, cuts triangles out, and re-solves from where the fabric was. Each run is judged against a 600-iteration solve of the same cut. Control: with no edit, 600 more iterations move the fit 0.29 mm mean, 3.9 mm at most, so differences smaller than that are not meaningful. A first run without settling overstated errors, since it counted the fit's own drift against each edit.

# Results

Mean / max displacement from the reference near the hole, mm (within 12 cm of its edge).

| Method | Time | Back keyhole | Large back opening | Front side cutout |
|---|---|---|---|---|
| Keep the old fit | 0 | 7.4 / 29.8 | 5.7 / 24.5 | 3.4 / 23.1 |
| Whole garment, 20 iterations | 6-13 s | 5.1 / 22.9 | 3.0 / 8.0 | 2.4 / 19.8 |
| Whole garment, 80 iterations | 21-31 s | 2.6 / 11.3 | 1.2 / 7.6 | 1.6 / 12.3 |
| Whole garment, 160 iterations | 41-54 s | 1.4 / 4.4 | 0.7 / 7.6 | 0.9 / 6.2 |
| Near the hole only, 160 iterations | 11-22 s | 4.6 / 11.7 | 3.2 / 8.6 | 2.2 / 20.9 |

A local re-fit improves at first and then stalls, since fabric beyond its limit stays wrong (elsewhere mean 1.9-2.8 mm, max 9-22 mm, unchanged). A cutout's effect reaches well beyond the hole.

# Where a re-solve's time goes

`pipeline/speed_probe.py`, `young`, high cut, whole garment (13,602 points) re-solved on the back-arched pose from the reused standing fit, against 720 iterations taken as settled. A standing fit from nothing takes 260 s at 7 mm, 58 s at 14 mm.

Per iteration, 0.82 s of about 1.1 s is factorising the linear system, which the code redoes every step because the surface normals in it change. SVDs 0.12 s, closest points 0.05 s, assembly 0.05 s, the right side 0.03 s, the solve itself 0.02 s. A symmetric ordering (`MMD_AT_PLUS_A`) cuts factorising by about a fifth with the same answer.

Iterations, not each iteration's cost, are the larger problem: mean / 95% from settled is 18.8 / 33.4 mm at 20 iterations, 9.5 / 17.4 at 80, 4.6 / 11.5 at 160, 1.5 / 5.9 at 320, 0.5 / 2.7 at 480 (394 s). Reuse with no solve is 26.6 / 48.7. The error falls slowly and evenly: the slow part is fabric sliding a long way over the body.

Tried and rejected:
- Factorising every 10 or 40 steps and conjugate gradients between: 150-190 inner iterations per step, three to four times slower. The normals change too much between steps for an old factor to precondition well.
- Anderson acceleration (window 5 or 10): better early (12.6 mm at 20 iterations against 18.8) but stalls (6-7 mm at 160 against 4.6).
- A 14 mm solve first, lifted onto the 7 mm mesh: 40 coarse iterations reach 6.2 mm mean in 13 s, which the 7 mm mesh needs about 130 iterations for, but fine iterations after it barely improve the mean and the worst point stays 19-33 mm. The coarse mesh settles to a different answer (about 4.6 mm mean apart) and the lift leaves local errors the fine solve then crawls out of.

Not yet tried here: a factorisation that keeps the fixed sparsity pattern and only redoes the numbers (sparse Cholesky with a reused symbolic analysis; no such library is installed), a closed-form 3x2 SVD, a stop rule in place of fixed counts.

On the GPU (2026-11-03, [solver race](/engineering/app/solver-race-plan.md), push-only contact): the same method with a few conjugate-gradient iterations per step in place of the factorisation takes 5 ms per step on the GTX 1650. Cutouts reach 1 / 3 / 5 mm from settled in 2-4 s; a pose's shape settles in 1-2 s but its placement along the body keeps sliding, since frictionless sliding is nearly free. Newton-type, L-BFGS, VBD and multigrid were slower. With friction on re-fits ([decision](/decisions/2026-11-03-friction-on-refits.md)), standing and cutouts reach the bar in 0.05-0.2 s (one cutout's worst point in 7.5 s) and poses settle in about 1 s to 0.3-0.6 mm mean, 95% under 2.5 mm; a few dozen points stay 7-15 mm off where the reference itself is unsettled.

# Known limits

- One body, one cut style. Holes are removed triangles with rough edges and no elastic; a finished cutout with elastic will differ.
- The reference is this solver's own answer, not reality.
- CPU timings are Python on the development machine, and include the fit's rebuild of its equations every iteration. Nothing has been ported into the app; the GPU numbers are Warp on the GTX 1650, not the app's speed either.
- The owner's target is under 5 s per re-fit ([decision](/decisions/2026-11-02-refit-under-five-seconds.md)); whether to run automatically, and what error a designer would notice, are undecided.

[^owner]: Conversation with the product owner.
[^code]: Benchmark and fit.
