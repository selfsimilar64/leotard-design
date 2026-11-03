---
type: Roadmap
title: Solver race plan
description: "Plan (2026-11-02) and results (2026-11-03) for choosing the fit solver that meets the owner's 5-second re-fit target. Raced on the GTX 1650 in NVIDIA Warp: today's local/global method on the GPU won (5 ms per step against 820 ms on the CPU; cutouts to the accuracy bar in 2-4 s, pose shapes settled in 1-2 s); Newton, L-BFGS, VBD and a multi-level V-cycle lost. Frictionless, the garment's placement along the body is nearly free and no solver pins it within 5 s: a physics question for the owner."
tags: [roadmap, fit, performance, gpu, solver]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-03T12:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-02 (Claude Code session)
    title: "Run it on the GPU; Newton-type or multi-level solvers, or both; don't just port the CPU winner"
    author: human:mattj
  - id: target
    resource: /decisions/2026-11-02-refit-under-five-seconds.md
    title: A re-fit takes under five seconds
  - id: friction
    resource: /decisions/2026-11-02-no-friction-for-now.md
    title: No friction in the fit for now
  - id: baseline
    resource: /engineering/app/refitting-after-an-edit.md
    title: Refitting after an edit (speed baseline)
  - id: audit
    resource: /engineering/app/fit-solver-realism-audit.md
    title: Fit solver realism audit
---

# Goal

Pick the solver that brings a re-fit under 5 s on the target hardware without changing the physics.[^target] Judge on the GPU, not the CPU: the owner pointed out the CPU winner need not be the GPU winner, and the methods differ most in how parallel they are.[^owner] Frictionless.[^friction]

Baseline to beat (CPU, `pipeline/speed_probe.py`, young, high cut, whole garment, back-arched): 480 iterations, 394 s to reach 0.5 / 2.7 / 4.2 mm mean / 95% / max from settled.[^baseline]

# Stage 1: one energy, written down

Today's solver minimises an energy only implicitly (local/global). Every candidate must minimise the same explicit function, so write it once and check it against `wrap_block.solve`:

- **Membrane:** per triangle, `area * sum_i phi(sigma_i)` over the two singular values of the 3x2 deformation gradient F against the flat rest triangle, with `phi(s) = (s - 1)^2` for s > 1, 0 for GATHER <= s <= 1, `(GATHER - s)^2` for s < GATHER. This is what the clamped ARAP local step minimises: the cot-weighted edge form equals `area * ||F - R||^2`. Check the factor against the Laplacian's `cot/2` weights.
- **Surface:** `PLANE * d(x)^2` per vertex (not area-weighted, as today), d the distance to the garment surface, on its own part (arm/torso, `Surface.parts`), not across to a surface facing the other way. The tangent plane in today's code is this term's linearisation.
- **Elastic:** per span, `k/2 * max(len - rest, 0)^2`, k = ELASTIC_WIDTH / rest length (tension only, as `solve`).
- **Not in the energy:** DAMP (an iteration regulariser), fold pins (the race solves the whole garment, as `pose_resolve.py`).
- **Inside-out triangles:** today's local step flips the rotation when it disagrees with the surface normal (`wrong` in `solve`). With an explicit energy this needs an equivalent (signed second singular value against the surface normal). Decide and test it in Stage 1; it is the likeliest place for candidates to disagree.
- **Gate:** at the CPU 720-iteration answer, the energy's gradient is near zero (compare with its size at the reused start), and a plain line-search descent from that answer barely lowers the energy. If not, the written energy is not today's physics; fix it before anything else.
- Stage numbers match the five stages given to the owner.

## Stage 1 results (2026-11-02, young, back-arched)

Code: `pipeline/race/energy.py` (the energy, its gradient, and `alternating_residual`, what `solve` itself balances), `make_case.py` (the case, and today's solver run 1440 iterations), `check_energy.py`. The case: 13,602 points, 26,958 triangles.

- **Gradient:** matches finite differences to 2e-6 relative.
- **Membrane and elastic are today's physics.** The written gradient and today's residual agree to 0.06% rms at a perturbed state; the difference is the 2.1% of triangles whose cotangent weights `solve` clips to [0.02, 6].
- **Today's solver settles 99% of the garment.** Residual median 0, 99th percentile 0.0026, against 0.03 rms at the start. From the 1440-iteration answer: 0.91 / 5.05 / 8.33 mm (mean / 95% / max) at 480 iterations, 0.44 / 2.37 / 4.49 at 720, 0.17 / 0.94 / 2.43 at 1080.
- **86 points never settle** (residual over 0.01, max 0.82, unchanged from 480 to 1440 iterations), in three spots: one side of the front and back near the crotch and leg opening (around x -0.1, y 0.44-0.52 in this pose), the sleeve near the wrist (x 0.31-0.37, y 0.52-0.61), and the back at x 0.39-0.40. 42 are within 2 cm of an elastic opening. 85 triangles there are inside out against the surface, and the 20 worst points sit 1-2.7 mm off the surface, holding 79% of the remaining surface energy. They carry most of the total energy, which therefore does not fall steadily: 0.023 at 40 iterations, 0.037 at 160, 0.027 at 1440. Not yet known: whether these are real folds of spare fabric that the model (no bending, no self-contact) can only show by turning triangles over, or artefacts. Look at them rendered before deciding anything.
- **The surface term, as defined today, is not a proper function of the points.** Today's match (nearest surface vertex, filtered by the previous step's normals, then its tangent plane) jumps when the nearest vertex changes and depends on history: the same final points score 0.027 with the solver's own history and 0.052 with the start's. Alternating steps tolerate this, since each step re-matches. Direct minimisation does not: L-BFGS (scipy, CPU) stopped with a line-search failure after 13-16 iterations from both the start and the settled answer, with history fixed or not. From the settled answer it lowered the energy 35% by moving only the unsettled spots (max 2.3 mm, mean 0.01 mm).
- **Consequence:** before Newton-type candidates can run, the surface term needs a smooth, history-free definition, e.g. a signed distance field to the garment surface on a 3D grid, interpolated (also natural on a GPU, as a 3D texture). Gate: today's settled answer moves under about 1 mm mean with it, outside the unsettled spots.

### Smooth surface term (owner approved trying it, 2026-11-02)

`pipeline/race/surface_field.py`: signed distance to the garment surface, exact closest point on its triangles, sampled on a 2 mm grid within 12 mm of the surface, one field per part as `Surface.parts` (torso: triangles with every vertex arm < 0.5; arm: > 0.15), trilinear between grid points. `energy.Energy(case, surface='field')` uses it; `'nearest'` keeps today's. Built in 68 s on the CPU (4.75 M + 1.13 M grid points). `check_field.py` tests it.

- **Accuracy on the surface:** |d| at surface vertices 0.07 mm mean, 0.25 at 95%, under 1 mm at most. 3 mm off along the normal: 0.3 mm mean error, but 1.6-2.4 mm at 95%, where another sheet of the surface is near (creases) or the normal of the vertex is not the surface's.
- **Gradient:** matches finite differences to 1.3e-4 (trilinear has kinks at grid faces).
- **Today's settled answer under it:** |d| 0.08 mm mean, 0.19 at 95%. L-BFGS from it moved 0.09 mm mean, 0.21 at 95%, before stopping (line-search failure after 86 iterations, likely the 13 points beyond the band, where the field has no value and the force drops to zero).
- **Where the two measures disagree: fabric bridging hollows.** 92 points (52 back, 39 sleeve, 1 front; 42 on an elastic edge) lie 6-20 mm from the nearest surface vertex while today's plane distance is about 0: they sit on the tangent plane of a vertex up to 20 mm away, across a hollow (the underarm, and on the back). Today's rule lets fabric bridge there, as an accident of extending a vertex's plane; a true distance pulls it into the hollow. This is a physics choice, not a numerical one: real fabric under tension bridges hollows, and contact only pushes (one-sided), but with no gravity or bending, slack fabric with one-sided contact has nothing holding it to the body. Options put to the owner: one-sided contact with a weak hold for slack fabric; today's two-sided pull with the field (more suction into hollows); or a field that reproduces today's bridging.
- **L-BFGS from the start barely moves** (26.8 to 26.6 mm mean from the settled answer in 160 iterations, against 4.6 mm for today's solver in 160): the surface term per point (PLANE 300) is about 10^6 times stiffer than a triangle's membrane term (area about 2e-5 m^2), so a method without the system's curvature is hopeless here. For the race: unpreconditioned first-order methods are out; quasi-Newton needs a preconditioner (e.g. today's global matrix, as Liu, Bouaziz and Kavan 2017), and VBD and Newton use the curvature directly.
- **The unsettled spots, seen in 3D** (`spots_page.py`, a three.js page in app/captures/race/): both underarms, where the sleeve meets the front and back, and one leg opening, where the stretched band at the elastic edge rolls over (inside-out strip along the edge). Whether they are real folds was not settled from the pictures.

## Contact chosen (owner, 2026-11-03)

Option 1: the body only pushes; outside it a weak hold, HOLD = 1e-4 ([decision](/decisions/2026-11-03-contact-only-pushes.md)). `energy.py` contact='push', `gpu.py`.

# Stages 2-5 as run (2026-11-03)

Code, all in `pipeline/race/`: `make_case.py` (cases), `gpu.py` (the energy in Warp), `solvers.py` (candidates), `multilevel.py` (V-cycle), `race.py` (runner), `report.py` (chart `app/captures/race/race-young.png`, table), `check_gpu.py`, `hold_sensitivity.py`, `sliding.py`. Run with the reference venv's Python (Warp 1.19, GTX 1650).

## Stage 2: cases and references

- **Cases (young, high cut, whole garment, 7 mm mesh, 13,096-13,602 points):** `standing` (today's standing fit carried into the race physics: the parent, not itself scored as a re-fit), poses `back-arched`, `passe`, `lunge-arms-up` (start: the standing reference placed by surface coordinates), `standing-back-keyhole`, `standing-front-side-cutout` (start: the standing reference, triangles cut as `refit_bench.CUTS`), `back-arched-back-keyhole` (start: the back-arched reference). Each case also carries the 14 and 28 mm meshes' prolongations (P14, P28, P14to28) for multi-level. Case (e), a standing fit from the seed, was not built: it is not a re-fit and `wrap_block.main` does not expose that start.
- **Reference:** projected Newton (below), 120 s on the GPU, float32. It is not a clean minimum: on passe it kept moving (1.0 mm mean, 18 mm max in its last quarter) and other candidates found lower energies (by up to 13%); on the other cases it stopped moving. Today's CPU answer is no longer comparable (different contact physics).

## Stage 3: what the GPU energy needed

Each item was found by a solver stalling, and each is in the code's comments.

- **Distance by BVH closest point** (`wp.Mesh`), not the grid field: exact, no band. Inside or outside by the closest feature's angle-weighted pseudo-normal; past an open edge of a part (the wrist end, the torso/arm part boundary) the height over that face's plane. The interpolated vertex normal (stage 1's field) swapped side for 28 points of the settled back-arched fit under 0.03 mm nudges; the barycentric edge test needs a 1e-3 tolerance in float32.
- **Contact held through a step** (`Problem.freeze`): the closest point and normal fixed per step, the surface term the height over that tangent plane. Exact contact still jumps where the posed surface folds into itself (one point at the back-arched wrist). As today's solver re-matches each step. At a fixed point the gradient is the true one.
- **Inside-out rule made continuous** (`TURN` = 0.3, `gpu.tri_state`): today's charge phi(-s2) for a triangle turned against the body jumps where the triangle stands square to the body. Newton with the hard rule never settled (4,176 points still moving over 0.5 mm after 2,400 iterations, 915 triangles toggling). Without the rule it settled but 912 triangles (196 cm2, mostly back and sleeve) ended inside out. The charge now blends phi(s2) to phi(-s2) by smoothstep over 0 to -0.3 in the facing cosine: today's rule except within 17 degrees past square. A physics refinement made without asking the owner, on today's intent.
- **float32 energy noise:** positions near 1 m carry 6e-8 m, which the stiff surface term turns into about 2e-6 of energy over the garment; line searches accept a step whose energy change is below that if the slope (from the gradient, accurate) is still downhill.
- **Step limit:** the held tangent plane is good for a few mm on a curved body; Newton with 10 mm steps bounced (true energy 0.018-0.031). 3 mm per step, cut per point, not the whole step in proportion.
- **Checks:** membrane and elastic gradient against numpy to 2e-6 median; the inside-out blend against float64 differences to 1e-6; projected Hessian exact where nothing is clamped (1e-6 median per point), positive semi-definite. Float32 finite differences of the GPU energy are useless at this scale (position rounding); check against numpy in float64.
- **Port notes:** our kernels gather (no float atomics). Warp's `array_sum`, `bsr_mm`, `bsr_mv` and `cg` are used as they are and a WebGPU port must supply them. Block inverses by `wp.inverse` in float32 came back indefinite (blocks span 0.01 to 300); use an eigen-decomposition.

## Stage 4: race results (young, 20 s per candidate)

Milliseconds per iteration, and what each reached. Position: mean / max mm from the reference. Shape: each point's height off the body against the reference's (mean mm). Energy gap: % above the reference.

| candidate | ms/it | standing cutouts and standing | poses (back-arched, passe, lunge) and pose cutout |
|---|---|---|---|
| local/global (today's method), 10 CG per step | 5 | bar (1/3/5 mm) in 2-4 s; shape 0.03 | best at 1-2 s: 1.8-11 mm mean; shape 0.2-0.4; energy 5-15% above; then drifts along the body |
| local/global, 30 CG | 7 | bar in 3-4 s | as 10 CG |
| local/global, 3 CG with V-cycle | 23-29 | bar in 15-20 s | slower than plain |
| Newton, block-Jacobi CG, step cut per point | 10 | not in 20 s (1.4-2.7 mm mean) | 13-20 mm mean at 5 s; 3-8 mm at 20 s |
| Newton with V-cycle | 66-71 | not in 20 s | slower than plain |
| L-BFGS (block-diagonal start) | 10-12 | barely moves | barely moves (stiffness) |
| VBD (6 colours) | 1 | position close (0.3-0.9 mm mean at 5 s) but energy 100-200% above: fabric left inside the body | same |

- **Sliding is the slow, ill-defined part.** On back-arched, 97% of the squared difference between today's method at 10 s and the reference lies along the body, in coherent regions (neighbouring points' differences have cosine 0.997); off the body they agree to 0.64 mm mean. Frictionless, the garment slides almost freely; solvers pass the reference's placement and keep going (the V-shaped curves in the chart), and good solvers settle 5-10 mm apart with energies within 5-10%. The 1/3/5 mm position bar is not met on any pose case by any candidate within 20 s, and is partly not well-defined.
- **The hold does not decide it.** Back-arched with HOLD 1e-4, 1e-3, 1e-2, 1e-1: today's method still ends 7-10 mm (mean) from Newton's answer at 10 s with energies 4-10% apart; HOLD only changes how much fabric lifts (748 points over 2 mm at 1e-4, 185 at 1e-1) and moves the answer 0.8-6.7 mm mean.
- **Why each lost:** Newton is held to a few mm per step by the tangent-plane contact, so it needs hundreds of steps to slide 30 mm into a pose; L-BFGS and the block-diagonal start cannot bridge the surface term's stiffness (PLANE per point against the membrane's soft sliding modes); VBD is fast per sweep but leaves points inside the body against a stiff, one-sided contact; the V-cycle as built (Galerkin, damped block Jacobi) makes each CG solve 4-6 times shorter in iterations but costs 3-6 times more per step in rebuilding the coarse operators, and sliding is limited by the contact linearisation, not the linear solve.
- **Another body (adult, standing, two cutouts; leaders only, 10 s):** the same order. Today's method gets the shape (height off the body) to the bar in 0.05-0.5 s and positions to 0.4-1.2 mm mean at 1-2 s (standing to the full bar in 0.75 s), then slides on to 2-4 mm by 20 s; Newton 2-4.5 mm and not improving in 10 s; VBD's energy 165-255% above.
- **Not measured:** float32 against float64 (no float64 run); GPU memory.

## Stage 5: recommendation

- **Port today's local/global method to the GPU** (WebGPU/Metal): 5 ms per step on the GTX 1650 against 820 ms on the CPU (about 160x), the simplest kernels (one per triangle, one per point, a few CG iterations on a fixed sparse pattern), and the fastest of the race at every time up to 5 s on every case. Cutouts reach the accuracy bar in 2-4 s; on poses the shape is settled in 1-2 s and the placement along the body is not.
- **What is left for 5 s on poses is a physics question, not a solver one:** without friction the garment's placement along the body is nearly free. Owner's options: accept placement settling over a few more seconds (or never exactly); add static friction or its cheap stand-in (a weak pull toward where each point was, which is what friction does for a garment already on); or judge the bar by shape and energy, not position. The [no-friction decision](/decisions/2026-11-02-no-friction-for-now.md) was made before this was known.
- **iPad (estimate only):** recent iPad GPUs are within about 1-2x of a GTX 1650 in raw throughput; WebGPU adds per-dispatch cost. Expect 1-3x the GTX 1650 times. The real number comes after the port.
- Newton, L-BFGS, VBD and the V-cycle stay in `solvers.py` for later physics (friction, bending); none is worth porting now.

# Stage 2: problem files and the reference (plan as written)

- Export from Python to `.npz` per case: rest triangles, welded ids, elastic spans, the garment surface (points, triangles, arm weights), start positions, and a CPU answer. Reuse `pose_resolve.whole` and `refit_bench.CUTS`.
- **Cases:** (a) back-arched from the reused standing fit, the hard one; (b) passe and lunge-arms-up likewise; (c) standing re-fit after a back keyhole and after a front side cutout, from the uncut fit; (d) a pose re-fit after a cutout, from that pose's previous fit (the warm start the app would have); (e) standing fit from the seed, secondary, not held to 5 s. young first; one other body at the end.
- **Reference per case:** the slowest trusted method run to convergence on the GPU with the shared surface query, in float32, then checked against the CPU answer (expect within about 1 mm mean, the mesh-noise level). If the GPU surface query (closest point on triangles) and today's (nearest vertex then tangent plane) differ by more, record by how much and use the GPU one for all candidates.

# Stage 3: shared GPU pieces (Warp, in the reference venv)

Warp 1.19 and Newton 1.7 are already installed in the reference venv and run on the GTX 1650 (`pipeline/reference/README.md`). New code goes in `pipeline/race/`.

- Per-triangle energy, gradient and 3x3 vertex Hessian blocks (projected to positive semi-definite); elastic likewise; surface term and closest-point query (`wp.Mesh` query to start).
- **Write for the port:** WebGPU has no float atomics and no float64. So sum per vertex by gathering over a precomputed vertex-to-triangle list, not by atomic scatter; float32 throughout; no CUDA-only features. Note any place this costs speed.
- Timing: CUDA events around whole re-fits, after warm-up; the GTX 1650 runs other work only if the owner is using it. Report setup separately (graph colouring, hierarchy, factor patterns), because after a structural edit the mesh changes and setup counts against the 5 s.

# Stage 4: candidates

1. **Today's local/global on the GPU.** Local step per triangle; global solve by conjugate gradients warm-started from the last step, optionally Chebyshev-accelerated. The fair baseline: same method, GPU hardware.
2. **Projected Newton.** Assemble the projected Hessian each step; solve with preconditioned CG (block-Jacobi to start); backtracking line search on the energy. The gather band (zero curvature between GATHER and 1) leaves the Hessian singular there: add a small regulariser and record it.
3. **L-BFGS.** History 5-20; block-diagonal Hessian as its starting estimate (GPU-friendly), line search on the energy.
4. **Vertex Block Descent.** Each vertex takes a 3x3 Newton step on its own incident energy; vertices of one colour together. Quasi-static: no inertia term, or a small one as a regulariser. Newton's `SolverVBD` (`newton/_src/solvers/vbd/`) is a time-stepping solver with its own fabric model, so it is a guide to the kernel layout and colouring, not a drop-in; write our energy into the same structure.
5. **Multi-level, added to the best one or two.** Meshes at 14 and 28 mm from the same pattern lines (`wrap_block.Piece` at another STEP), used as repeated coarse corrections (V-cycles, or a coarse solve of the residual), not as a one-off coarse start: the speed baseline showed a coarse start gets close fast, then the fine solve crawls out of the coarse mesh's different answer.[^baseline]

# Stage 4, continued: the race

- **Score:** wall time on the GPU to reach the accuracy bar, per case, plus the curve of error against time.
- **Proposed accuracy bar** (not yet agreed by the owner): mean 1 mm, 95% 3 mm, max 5 mm from the reference, and energy within 0.1% of it. About the CPU 480-iteration level, and near the 7 mm mesh's own noise (1.3 mm mean against 3.5 mm).
- **Also report:** worst stretch, inside-out triangles, leg-line positions, settled energy (lower than the reference means a different, possibly better or wrongly tangled, minimum; inspect), GPU memory, and float32 versus float64 on one case.
- **CPU filter, light:** before writing a candidate's kernels, a numpy version on case (a) checks it reaches the reference's minimum and does not tangle. Hardware-independent only: iterations and accuracy, never timings.

# Stage 5: decision and report

- Recommend one solver (or one hybrid) to port, with its time per case on the GTX 1650 and what is left to reach 5 s.
- The GTX 1650 is not the target hardware. State the iPad estimate as an estimate only; the real number comes after the port (Metal/WebGPU), which is separate work.
- Write results into this concept and `refitting-after-an-edit.md`; the owner's version in plain language.

# Owner's answers

- One re-fit is one pose.
- The accuracy bar is accepted, and slightly less accurate but much faster methods are not ruled out: score each candidate by its whole time-against-error curve, not only by time to the bar.[^owner]

# Risks

- The written energy may not match today's answers exactly (inside-out handling, surface query). Stages 1 and 2 gate this.
- Newton-type steps on a non-smooth energy (gather band edges, surface query switching faces) can stall in line search; VBD and local/global are more forgiving.
- Wrinkles as real shape (owner, later) need a finer mesh or a displacement layer: prefer solvers whose cost grows close to linearly with mesh size.

[^owner]: Owner's messages, 2026-11-02
[^target]: A re-fit takes under five seconds
[^friction]: No friction in the fit for now
[^baseline]: Refitting after an edit (speed baseline)
[^audit]: Fit solver realism audit
