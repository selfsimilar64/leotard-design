# Our leotard fit solver: inventory of what it models

All sources are files in the repository (root `C:\Users\mattj\leotard-design`); link targets are repo-relative paths, with `#L` line numbers as of commit f585520 plus the working tree on 2026-11-02. "wb" below is short for `pipeline/wrap_block.py`. Everything here was read from code or the project's knowledge pages; the only things run were two read-only measurements on existing capture files, labelled "measured here". No judgement of realism is made.

**Layers, to keep apart.** There are four distinct stages, and they are often conflated:

| # | Stage | When | Code | Solves against |
|---|---|---|---|---|
| 0 | Body shaping: offline taut-cloth drapes baked into the skin (bust, cleft) | Body bake | `pipeline/daz/shapes.py`, `pipeline/daz/bust_cloth/` | Daz skin |
| 1 | Garment surface: membrane lift plus seat sheet (or rolling ball) on the body mesh | In app, on any body, pose or cover change | `mannequin.js` `computeLift`, `seat.js`, `ball.js` | Skin, app or block cover |
| 2 | **The fit**: flat block solved onto surface 1, stored as host triangles | Offline, once per block, body and cut | `pipeline/wrap_block.py` `solve` | Flat pattern |
| 3 | Pose slide: body mesh's fabric slides over posed skin | In app, per pose | `slide.js` via `mannequin.js` `slideFabric` | Body's own A-pose scaled by 0.75, **not** the flat pattern |

## What energy or objective is minimised, and what is the material model?

### Takeaway
The fit (stage 2) is a quasi-static local/global as-rigid-as-possible solve per flat triangle, modified so compression costs nothing between 50% and 100% of flat size, plus line springs for elastic and a stiff per-point tangent-plane penalty. It is one isotropic, unitless, length-only material: no bending, grain, thickness, density, or measured fabric properties. The project's own page says "The solver is geometric, not a cloth simulation: direction, not prediction".

### Cited Findings

**Objective (assembled from the code; the code never writes it as one formula)**

E(p) = sum_tri [ 1/2 sum_k (cot_k / 2) |(p_i - p_j) - R_t E_k|^2 ] + sum_span 1/2 ELASTIC_K (|p_j - p_i| - r L)^2 + sum_pt 1/2 PLANE (n_i . (p_i - q_i))^2 + sum_pt 1/2 DAMP |p_i - p_i^prev|^2 + sum_fold 1/2 1e4 x_i^2 + sum_held 1/2 1e5 |p_i - p_i^0|^2

- Each iteration alternates a per-triangle local step (SVD of a cot-weighted covariance, flat to 3D) and one global sparse linear solve (`splu` factorised afresh every iteration) — [wb:418-420](pipeline/wrap_block.py#L418), [wb:451-452](pipeline/wrap_block.py#L451).
- Cotangent weights are computed per flat triangle and clipped to [0.02, 6] — [wb:376-388](pipeline/wrap_block.py#L376).
- Rest shape is the flat piece in metres: `rest: [tri, corner, 2]` — [wb:369](pipeline/wrap_block.py#L369), [wb:633](pipeline/wrap_block.py#L633).
- `DAMP = 0.05`: "how much each step stays where it was", a pull towards the previous iterate, not a velocity term — [wb:32](pipeline/wrap_block.py#L32), [wb:450](pipeline/wrap_block.py#L450).

**Stretch and compression response**
- `GATHER = 0.5` ("TUNABLE, not measured"): "How far fabric may be compressed at no cost, as its size over flat: fabric resists stretch but gathers when pushed" — [wb:33](pipeline/wrap_block.py#L33).
- Implementation: the singular values of each triangle's deformation gradient F are clipped to [GATHER, 1], and the local-step target becomes U diag(clipped) V^T instead of the rotation U V^T: "a triangle already smaller than flat, down to GATHER, is left at that size: only stretch pulls back" — [wb:426-429](pipeline/wrap_block.py#L426).
- Reflection guard: 2D into 3D has no handedness, so a rotation that would turn a triangle inside out relative to the surface normal has one column flipped, per `FACING` (front +1, back -1, sleeve -1) — [wb:30](pipeline/wrap_block.py#L30), [wb:421-425](pipeline/wrap_block.py#L421).

**What is absent from the material**
- No bending or dihedral term appears anywhere in `solve`; the only per-triangle terms are the local-step targets — [wb:366-461](pipeline/wrap_block.py#L366).
- No anisotropy: one energy for all directions. `across` and `along` (x and y of the flat piece) exist only in the reporting function `stretch` — [wb:464-470](pipeline/wrap_block.py#L464). Blocks record `'grain': 'vertical'` but the solver does not read it — [draft_block.py:196](pipeline/draft_block.py#L196). A grep of `pipeline/*.py` for gravity, density, bending, thickness, friction, self-collision, Poisson, anisotropy and modulus found nothing in `wrap_block.py` or `refit_bench.py`.
- "fabric and stretch behaviour is not modelled, only length" — [wrapping-a-flat-block-onto-the-body.md:132](knowledge/engineering/app/wrapping-a-flat-block-onto-the-body.md#L132). "Fit is geometric, in one fabric, with no stretch properties" — [drafted-blocks.md:70](knowledge/engineering/app/drafted-blocks.md#L70).
- Fabric thickness is not in the solve. It exists only as a render offset of 1.2 mm — see the export question.

### Inferences
- By the identity that cot-weighted edges reproduce the Dirichlet energy on a triangle, each triangle's ARAP term is about 1/2 A sum_i phi(sigma_i), with phi = (sigma-1)^2 for sigma > 1, 0 for sigma in [0.5, 1], and (sigma-0.5)^2 for sigma < 0.5. This holds exactly only where cotangents are not clipped. That is a linear (Hookean in principal stretch) response with a modulus normalised to 1, and a dead zone in compression.
- Each principal stretch is treated independently with no coupling term, so the model has no Poisson effect: stretching across does not by itself demand narrowing along (equivalent to Poisson's ratio 0 in the small-strain limit). Hand derivation, not tested.
- No shear modulus separate from stretch; shear is only what shows up in the singular values.
- Local/global with a proximal term makes this the projective-dynamics family of solvers run to a static state, though the code does not name it so.
- Only ratios among the weights matter; no value is in force units.

### Gaps
- Whether the true stationary point satisfies a single energy: the normals, nearest vertices, and clip region change between iterations, so the iteration is not strictly descent on one fixed function. No energy value is computed or logged.

## How is the body treated, what surface does fabric lie on, how is it built, and is the lift solved for the app's cover or for the block? Any self-contact, collision or friction?

### Takeaway
In the fit the body is a rigid, frozen triangle mesh, and fabric is held to it by a two-sided penalty to the tangent plane at the nearest vertex. The surface is the Genesis 9 body plus a heuristic lift, exported once in the A-pose using **the app's own design cover (crew neck, high leg, long sleeves), not the block's**. The fit has no one-sided contact, self-contact or friction; the separate pose slide has one-sided contact and a weak "grip" spring.

### Cited Findings

**Body mesh**
- Daz Genesis 9 base cage, subdivided once by Catmull-Clark, 100,676 vertices; same topology on every body and pose — [mannequin.js:3-8](app/src/body/mannequin.js#L3).
- Measured here on `app/captures/wrap-body-young.json`: 100,676 vertices, 201,248 triangles; edge length 5/50/95th percentile 0.61 / 2.96 / 8.75 mm over the whole mesh, 3.01 / 6.45 / 9.95 mm on the trunk (y 0.75-1.4 m, wArm < 0.15). The comment says "~6 mm each" — [mannequin.js:44](app/src/body/mannequin.js#L44).
- Stage 0, baked into the skin at conversion: "the sports-bra bust and the smoothed gluteal cleft, as if under tight fabric", both offline taut-cloth drapes; bust drape `shrink=0.5, iters=1500, stiff=1.0`, then a second grid cloth with `along=0.25` (4x harder across); seat drawn per pose — [shapes.py:1-30](pipeline/daz/shapes.py#L1), wired at [convert_bodies.py:39](pipeline/daz/convert_bodies.py#L39), [convert_bodies.py:430-431](pipeline/daz/convert_bodies.py#L430). So body shape already contains a fixed fabric-like compression, independent of the garment. It is a position-based cloth, separate from the fit: [cloth_pbd.py:1-2](pipeline/daz/bust_cloth/cloth_pbd.py#L1). (The decisions index still says the bust is "not baked into the bodies yet" — [decisions/index.md:25](knowledge/decisions/index.md#L25); the converter's code contradicts this, and I did not inspect the shipped bodies.)

**Garment surface (stage 1)**
- `exportSeed` runs `start('high','long',...)` then `block.apply` with neck crew, back crew, sleeves long, leg high, armhole set-in; then posts `man.garmentPos` as `wrap-body*.json` — [wrap-eval.js:15-22](app/src/dev/wrap-eval.js#L15), [wrap-eval.js:41-44](app/src/dev/wrap-eval.js#L41). Pose is `a-pose`, where `gPos` is the skin itself (no slide) — [mannequin.js:479-480](app/src/body/mannequin.js#L479).
- "The garment surface is solved for the app's own cover when standing; the fit's starting surface is not re-solved for the block" — [fitting-a-block-like-the-app.md:101](knowledge/engineering/app/fitting-a-block-like-the-app.md#L101).
- Membrane lift: `h_i = clamp(taut * mean_j <P_j + h_j N_j - P_i, N_i>, 0, max)`, Jacobi, uniform neighbour weights; bare skin, head and past the wrist pinned at 0 (which "pins every opening to the body the way its elastic does"). Defaults taut 1, max 0.03 m, 220 iterations (40 when warm) — [mannequin.js:546-578](app/src/body/mannequin.js#L546), [mannequin.js:45](app/src/body/mannequin.js#L45), [mannequin.js:52](app/src/body/mannequin.js#L52). Displacement is along the vertex normal.
- The project's own description: "a geometric heuristic, not a tension model: bridge shape does not depend on fabric stiffness, panel boundaries or seams" — [fabric-bridging-hollows.md:285](knowledge/engineering/geometry/fabric-bridging-hollows.md#L285). Measured: 0 mm of lift over a 22-53 mm gluteal cleft — [fabric-bridging-hollows.md:89-90](knowledge/engineering/geometry/fabric-bridging-hollows.md#L89).
- Seat sheet (default on): a height field seen from behind, `Tx u_xx + Ty u_yy = 0` with `u <= s` (obstacle problem), projected SOR, 2.5 mm cells, 600 passes, omega 1.8, tension ratio ky = `seatAlong` 0.25; held on bare skin, grid border and body outline. Vertices are moved along the view axis up to 0.12 m onto it, faded at the region's edges, with in-between vertices blended by 200 Gauss-Seidel passes — [seat.js:7-19](app/src/body/seat.js#L7), [seat.js:29-39](app/src/body/seat.js#L29), [seat.js:113-120](app/src/body/seat.js#L113), [seat.js:181-186](app/src/body/seat.js#L181). "The walls' material is still crushed into a narrow strip on the sheet" — [fabric-bridging-hollows.md:227-229](knowledge/engineering/geometry/fabric-bridging-hollows.md#L227). "a height field (one view) cannot describe fabric that turns under" — [fabric-bridging-hollows.md:269](knowledge/engineering/geometry/fabric-bridging-hollows.md#L269).
- Rolling ball: a selectable alternative (`method: 'ball'`, radius 0.05 m, morphological closing), not the default; owner review said it "does not solve the seat" — [ball.js:1-17](app/src/body/ball.js#L1), [mannequin.js:52](app/src/body/mannequin.js#L52), [fabric-bridging-hollows.md:147-150](knowledge/engineering/geometry/fabric-bridging-hollows.md#L147).

**How the fit holds to the surface**
- `Surface.nearest` takes 16 nearest *vertices* and picks the first whose normal agrees with the point's last normal (dot > 0.2); no triangle query during the solve — [wb:309-325](pipeline/wrap_block.py#L309). `project` gives the tangent plane at that vertex — [wb:327-332](pipeline/wrap_block.py#L327).
- The penalty is a bilateral plane spring (`w n n' (p - q) = 0`), `PLANE = 300`, and it acts equally inwards and outwards — [wb:31](pipeline/wrap_block.py#L31), [wb:443-450](pipeline/wrap_block.py#L443).
- "No pin, body pushes but cannot pull" was trialled: "No effect at all, so contact was not the cause; change reverted" — [fitting-a-block-like-the-app.md:60](knowledge/engineering/app/fitting-a-block-like-the-app.md#L60).
- Torso and sleeve points look only at their own part of the surface, because "the inner arm nearly touches the ribs"; torso uses `wArm < 0.5`, arm uses `wArm > 0.15`, armhole points count as torso — [wb:299-303](pipeline/wrap_block.py#L299), [wb:637-640](pipeline/wrap_block.py#L637). This is the only cross-part handling in the fit.
- Not in the fit: self-collision between garment triangles, or fabric-on-fabric; friction (sliding along the plane is free; "free to slide along it" — [wb:367](pipeline/wrap_block.py#L367)); skin deformation; lift-off from the surface. Friction, gravity and collision words do not occur in the file. "Inside out" is measured and logged but is a percentage of reflected rotations, not a collision response — [wb:457](pipeline/wrap_block.py#L457).

**Pose slide (stage 3) does differ on contact**
- "one-sided contact: the body pushes the fabric out but never pulls it in"; spring `stiff` 60 along the normal only for points resting on skin, weight 0 when lifted (> 0.1 mm off) — [slide.js:13-18](app/src/body/slide.js#L13), [slide.js:233](app/src/body/slide.js#L233), [slide.js:213-231](app/src/body/slide.js#L213).
- "grip" (friction stand-in): `0.002`, a weak spring to the painted skin point, not Coulomb friction — [slide.js:19](app/src/body/slide.js#L19), [slide.js:31](app/src/body/slide.js#L31), [slide.js:133](app/src/body/slide.js#L133).
- Lifted points are tested against every skin face within 2 cm (`insideBody`) and put on it if inside the body; skin pressed into other skin is not caught — [slide.js:214-218](app/src/body/slide.js#L214), [garment-sliding.md:122-126](knowledge/engineering/app/garment-sliding.md#L122).

### Inferences
- Hand estimate of how hard the plane penalty is: at 20% strain over 50 mm radius on a 7 mm mesh, normal force per vertex is about 2e-4 in solver units, which against PLANE 300 gives a sub-micron offset. So fabric sits effectively exactly on the plane, the fit is effectively surface-embedded, and fabric cannot form its own out-of-surface shape in the solve.
- The surface fabric lies on is not responsive to the garment's tension: it does not change with pattern, elastic or GATHER. The lift's height and the seat's ky are set independently of the fit's stretch.
- Surfaces for fit and display differ: the fit uses the app-cover lift, while `show` re-lifts on the union of the app's cover and the block's hosts (`cover`, `engine.updateCover`, then `setCover`, then `updateGarment(true)`, warm lift) — [wrap-eval.js:52-57](app/src/dev/wrap-eval.js#L52), [engine.js:373-382](app/src/render/engine.js#L373), [mannequin.js:310-315](app/src/body/mannequin.js#L310). Where the block reaches past the app's cover, the fit saw lift pinned at 0 at the app's opening, and the render sees lift continuing. The size of that difference has not been measured in the sources I read.

### Gaps
- Nothing quantifies soft-tissue compression. The bust and cleft shaping are fixed recipes chosen by eye; no pressure from garment to body exists anywhere. Pressure is never computed.
- The size of the error from using vertex tangent planes rather than true closest-point on triangles was not found.

## Seams, elastic, gravity, pre-tension, dynamics, iteration count and convergence measure?

### Takeaway
Seams are welded points with zero gap by construction. Elastic is a two-sided line spring per mesh span on leg, neck and wrist. No gravity or dynamics. Pre-tension is implicit in the pattern's smaller size, and three further unrelated tension numbers exist in other stages. Iteration counts are fixed with no stopping test; convergence is only logged.

### Cited Findings

**Seams and symmetry**
- Half a garment (front, back, one sleeve) is solved; shoulder, side, crotch, both armhole-to-cap runs and underarm are welded by union-find, each sewn pair resampled to equal point counts — [wb:3-4](pipeline/wrap_block.py#L3), [wb:591-605](pipeline/wrap_block.py#L591), [wb:612-629](pipeline/wrap_block.py#L612). "Seam gap is zero by construction" — [wrapping-a-flat-block-onto-the-body.md:30](knowledge/engineering/app/wrapping-a-flat-block-onto-the-body.md#L30).
- Sleeve cap: halves split at the crown and paired by index with the armholes, so cap length excess is spread evenly along the seam — [wb:602-605](pipeline/wrap_block.py#L602), [wb:617-622](pipeline/wrap_block.py#L617). Drafted cap ease 2.5% — [draft_block.py:31](pipeline/draft_block.py#L31). Each piece's triangles keep their own flat rest shape, so ease shows only as conflict in the ARAP term.
- No seam allowance (`seam_allowance: 0`), no seam stiffness, thread stretch, or added bulk — [draft_block.py:196](pipeline/draft_block.py#L196).
- Centre folds: soft penalty 1e4 on x only, target x = 0, so fold points may slide in y and z — [wb:400-401](pipeline/wrap_block.py#L400), [wb:445](pipeline/wrap_block.py#L445).
- The second half is mirrored at export (`q * [-1,1,1]`) and hosts are found afresh on the mirror-side surface — [wb:743-747](pipeline/wrap_block.py#L743). Measured here on `wrap-body-young.json`: mirrored vertex to nearest vertex 0.01 / 0.52 / 2.58 mm (median / 95% / max), so the body is close to symmetric. Left and right are therefore not independently solved.
- No hard crotch pin now: "A hard pin, `crotch_floor`, was tried first and removed at the owner's direction" — [fitting-a-block-like-the-app.md:33](knowledge/engineering/app/fitting-a-block-like-the-app.md#L33).

**Elastic**
- Ratio of elastic length to edge length, by edge: `front leg 1.0, back leg 0.75, front/back neck 0.95, wrist 0.95` — [wb:37](pipeline/wrap_block.py#L37). No other edge has elastic: cutout edges in the refit bench carry none.
- `ELASTIC_K = 8.0` per span: "An estimate: no force data for this elastic or fabric was found" — [wb:38](pipeline/wrap_block.py#L38).
- One span per mesh edge along the opening, rest length = ratio x that segment's flat length — [wb:641-645](pipeline/wrap_block.py#L641).
- Spring form: fixed-length target along the current span direction, added to the Laplacian and right-hand side; **it resists being shorter than its rest length as well as longer** — [wb:389-393](pipeline/wrap_block.py#L389), [wb:437-442](pipeline/wrap_block.py#L437).
- No width, thickness or cross-section in the solve; `finish` sweeps a cosmetic rim profile along exported loops at display — [wrap-eval.js:188-220](app/src/dev/wrap-eval.js#L188).
- Trials: elastic changed the leg line strongly: original drafted pattern half-width at 7 cm 65 mm with none, 71 mm at K 8 and back 85%, 111 mm at K 40 and back 75% — [fitting-a-block-like-the-app.md:44-47](knowledge/engineering/app/fitting-a-block-like-the-app.md#L44).

**Gravity, inertia, dynamics**
- None. No gravity, no mass, no density, no velocity, no timestep in `solve`. It is a static fixed-point iteration from a start shape — [wb:366-461](pipeline/wrap_block.py#L366).

**Pre-tension**
- In the fit: only from the block being smaller than the body plus elastic ratios. Drafted reductions out of body girth: bust 16.6%, waist 8.2%, hip 16.5% — [draft_block.py:32](pipeline/draft_block.py#L32).
- Stretches obtained, drafted `young`: bust 1.31 / 1.12 (front / back), waist 1.14 / 1.09, hip 1.22 / 1.25 — [drafted-blocks.md:54](knowledge/engineering/app/drafted-blocks.md#L54). These predate elastic and GATHER and were not re-tabulated — [drafted-blocks.md:65](knowledge/engineering/app/drafted-blocks.md#L65).
- Separate stages have their own tension values unrelated to the pattern: `shrink` 0.75 in the slide, `seatAlong` 0.25 in the seat sheet, drape `shrink` 0.5 in the baked bust — [slide.js:31](app/src/body/slide.js#L31), [mannequin.js:52](app/src/body/mannequin.js#L52), [shapes.py:22](pipeline/daz/shapes.py#L22).

**Start shape and iteration**
- Start: thin-plate spline from each block edge to the same edge of the app's own flattened piece, then `locate` onto the app's 3D piece, extrapolating outside it — [wb:192-213](pipeline/wrap_block.py#L192), [wb:216-284](pipeline/wrap_block.py#L216). Sleeve: rolled round the arm axis by angle at radius 0.09 m and projected, because the seed "folds" — [wb:677-699](pipeline/wrap_block.py#L677).
- Whole block: torso 240 iterations, sleeve onto held armhole (hold weight 1e5) 240, all together 60 — [wb:29](pipeline/wrap_block.py#L29), [wb:673-702](pipeline/wrap_block.py#L673), [wb:404](pipeline/wrap_block.py#L404). Cuts: 120 from the block's fit — [wb:792-797](pipeline/wrap_block.py#L792).
- No stopping test: fixed `iters`. Logged every 20 iterations: max and mean per-point move, mean across and along stretch, inside-out share — [wb:453-457](pipeline/wrap_block.py#L453).
- Reported: mean move 0.019 mm per iteration at the end, for the XS block — [wrapping-a-flat-block-onto-the-body.md:58](knowledge/engineering/app/wrapping-a-flat-block-onto-the-body.md#L58).
- Settling after that continues: 600 more iterations with no edit move a settled fit 0.29 mm mean, 3.9 mm max — [refitting-after-an-edit.md:24](knowledge/engineering/app/refitting-after-an-edit.md#L24), [refit_bench.py:32-37](pipeline/refit_bench.py#L32). A first bench run counted "the fit's own drift" against edits until an extra settling step was added.
- Reference for accuracy is the solver's own 600-iteration answer: "The reference is this solver's own answer, not reality" — [refit_bench.py:15](pipeline/refit_bench.py#L15), [refitting-after-an-edit.md:43](knowledge/engineering/app/refitting-after-an-edit.md#L43).
- Cost: about 0.3 s per iteration at 6,898 points; about 255 s for five solves on the first XS run. Python on CPU; not in the app — [refitting-after-an-edit.md:20](knowledge/engineering/app/refitting-after-an-edit.md#L20), [wrapping-a-flat-block-onto-the-body.md:46](knowledge/engineering/app/wrapping-a-flat-block-onto-the-body.md#L46).
- Refit after a cutout on `young`: whole-garment 160 iterations 41-54 s gives 0.7-1.4 mm mean / 4.4-7.6 mm max near the hole against that reference; keeping the old fit 3.4-7.4 / 23-30 mm; holes in that bench are removed triangles with no elastic — [refitting-after-an-edit.md:30-36](knowledge/engineering/app/refitting-after-an-edit.md#L30), [refitting-after-an-edit.md:42](knowledge/engineering/app/refitting-after-an-edit.md#L42).

### Inferences
- Because K applies per span while span length follows `STEP`, elastic line stiffness depends on mesh size. At 7 mm spans, K x L is about 0.04-0.056 in the solver's units, which is roughly equal to the fabric's own resistance in a 40-56 mm wide strip at the same strain (hand derivation from the energy above). Similarly PLANE acts per point, not per area.
- Being two-sided, the elastic spring also pushes apart spans that are shorter than the rest length, unlike the fabric's GATHER dead zone; so at leg openings (rest length 75-100%), the fabric may gather while the elastic does not.
- The back leg elastic at 75% is a per-segment uniform ratio, not a distributed profile.
- The result can depend on the path (start shape and stage order) because the problem is non-convex and only local iteration is used; no test of this was found.

### Gaps
- No residual, force-balance or energy-based convergence measure is computed. The strain state at equilibrium has not been checked against a force balance.
- No sensitivity study of PLANE, DAMP, fold or hold weights was found.

## How are poses handled, and is elastic or gathering re-solved per pose?

### Takeaway
Poses do not re-solve the fit: the flat-to-3D map is frozen as host triangles from the standing fit and evaluated on a surface that is slid and lifted per pose by a solver that knows nothing of the pattern, GATHER or elastic.

### Cited Findings
- "Poses place the standing fit on the app's slid surface; elastic and gathering are not re-solved per pose" — [fitting-a-block-like-the-app.md:100](knowledge/engineering/app/fitting-a-block-like-the-app.md#L100). "no re-solve per pose or body" — [wrapping-a-flat-block-onto-the-body.md:96](knowledge/engineering/app/wrapping-a-flat-block-onto-the-body.md#L96).
- Pipeline: pose change runs `updateGarment`: `slideFabric`, then lift on the slid positions, then seat sheet; result `garmentPos` — [mannequin.js:415-446](app/src/body/mannequin.js#L415). Bodies themselves are Daz bakes per body and pose, with joint correctives; arm poses are added one arm at a time — [mannequin.js:9-11](app/src/body/mannequin.js#L9).
- Slide energy: per-vertex ARAP with uniform weights against the body's own A-pose scaled by `shrink`, on the body mesh's topology — [slide.js:10-20](app/src/body/slide.js#L10), [slide.js:126-130](app/src/body/slide.js#L126), [garment-sliding.md:45-47](knowledge/engineering/app/garment-sliding.md#L45).
- Slide constants: `iters 30, warmIters 5, cg 20, grip 0.002, stiff 60, shrink 0.75` — [slide.js:31](app/src/body/slide.js#L31). Default solves on the coarse cage (25,182 vertices) then subdivides with the body's stencil, median 2.5 mm, p99 6.6 mm, max 8.9 mm from the fine solve — [mannequin.js:163](app/src/body/mannequin.js#L163), [mannequin.js:506-528](app/src/body/mannequin.js#L506), [garment-sliding.md:178-188](knowledge/engineering/app/garment-sliding.md#L178).
- Domain: cover plus two rings (plus one cage ring), head excluded, openings free edges; `show` adds all block hosts to the cover — [mannequin.js:481-487](app/src/body/mannequin.js#L481), [wrap-eval.js:52-57](app/src/dev/wrap-eval.js#L52).
- "Elastic edges are not modelled separately (openings only feel the overall tension)" in the slide — [garment-sliding.md:206](knowledge/engineering/app/garment-sliding.md#L206).
- A-pose has no slide: `gPos` is the skin — [mannequin.js:480](app/src/body/mannequin.js#L480).
- Seat sheet re-solves per pose, frame from the posed seat — [seat.js:26](app/src/body/seat.js#L26), [mannequin.js:433](app/src/body/mannequin.js#L433).
- Shrink was chosen by the owner with sliders on the low lunge; a sweep found 0.85-0.8 "closest to a worn leotard", 0.7 "starts cutting high", yet default is 0.75 — [garment-sliding.md:64-65](knowledge/engineering/app/garment-sliding.md#L64), [garment-sliding.md:81-87](knowledge/engineering/app/garment-sliding.md#L81).
- Stretch against the flat piece across poses, XS block, before elastic and GATHER: median [2-98 pct] front across 1.16 [1.00-1.40] at rest; 1.26 [0.59-1.95] in `back-arched`; back across 1.03 [0.44-1.39] in `passe`. "The ranges are the skin's own deformation carried onto the cloth, not cloth behaviour" — [wrapping-a-flat-block-onto-the-body.md:102-112](knowledge/engineering/app/wrapping-a-flat-block-onto-the-body.md#L102).
- Known pose symptoms: nub at the crotch in `a-pose`, `lunge-arms-up`, `passe`, `one-knee`; `stag-jump` cling into the cleft on the raised side — [fitting-a-block-like-the-app.md:97](knowledge/engineering/app/fitting-a-block-like-the-app.md#L97), [fitting-a-block-like-the-app.md:100](knowledge/engineering/app/fitting-a-block-like-the-app.md#L100).
- Other bodies: the same map can be transferred, "a true fit on another body would be its own solve at its own size"; drafted blocks are fitted on their own bodies, standing — [wrapping-a-flat-block-onto-the-body.md:125](knowledge/engineering/app/wrapping-a-flat-block-onto-the-body.md#L125), [drafted-blocks.md:50](knowledge/engineering/app/drafted-blocks.md#L50).
- Slide's own result depends slightly on edit history through warm starts: "undo does not return exactly the same fit" — [garment-sliding.md:169-171](knowledge/engineering/app/garment-sliding.md#L169).

### Inferences
- In a pose, flat-pattern stretch is an output not a constraint: nothing in stage 3 sees the flat pieces, so per-point stretch against flat is whatever skin, slide and lift produce.
- The pose's fabric moves as the body mesh's vertices move, so a block point cannot slide relative to its host vertex at all after the fit; the relative sliding is entirely the host mesh's.
- Rest size in the slide (75% of skin, uniformly) is independent of the block's reductions (8-17%) and the two are not reconciled.
- Elastic and gather results frozen in hosts travel into poses only as a fixed surface mapping, so opening positions in poses reflect the standing elastic solution.

### Gaps
- Seat-area stretch by pose "was not re-measured" after GATHER — [fitting-a-block-like-the-app.md:91](knowledge/engineering/app/fitting-a-block-like-the-app.md#L91). No pose table for drafted blocks; "Poses and cuts other than the high leg are not yet run on drafted blocks" ([drafted-blocks.md:71](knowledge/engineering/app/drafted-blocks.md#L71)) has since been partly overtaken by pose checks noted in the fit page.

## Mesh resolution, representable feature size, what is stored, and what is lost on export?

### Takeaway
A 7 mm triangle mesh, whose every point is finally put back on the surface and stored as a host triangle plus barycentric weights on the body mesh. So nothing normal to the body survives export, and no solver in the chain can produce a wrinkle. All wrinkles seen in the render are a shader bump at three fixed zones. Compression is stored only as squeezed flat coordinates.

### Cited Findings

**Mesh**
- `STEP = 7.0` mm; hexagonal grid in the interior (row spacing 0.866 x STEP), boundary points sampled per edge at about STEP, then Delaunay and an inside filter; interior points within 0.6 STEP of the outline dropped — [wb:28](pipeline/wrap_block.py#L28), [wb:97-113](pipeline/wrap_block.py#L97).
- 6,898 welded points on `young` high cut — [refitting-after-an-edit.md:20](knowledge/engineering/app/refitting-after-an-edit.md#L20). Measured here, `wrap-body-young-high-resolved.json`: Front 2,082 points / 3,934 triangles, Back 2,444 / 4,642, Sleeve 2,548 / 4,903, per half.
- A cut has its own exact outline and mesh, since "taking triangles out of a bigger mesh is what left a jagged crotch" — [wb:528-529](pipeline/wrap_block.py#L528). Lines hold at 0.5 mm source spacing — [wb:784](pipeline/wrap_block.py#L784), [draft_block.py:34](pipeline/draft_block.py#L34).

**End of solve and export**
- Final step moves non-held points onto the tangent plane — [wb:458-460](pipeline/wrap_block.py#L458).
- `Surface.hosts`: nearest vertex (no normal gate on export, `was` is None), then scans the triangles of that vertex's 2-ring for closest point; stores three vertex ids and weights rounded to 5 decimals — [wb:334-350](pipeline/wrap_block.py#L334), [wb:736-740](pipeline/wrap_block.py#L736). Any remaining distance from the surface is discarded.
- `closest_on_triangle` clamps and renormalises barycentrics rather than computing the true closest edge point — [wb:353-363](pipeline/wrap_block.py#L353).
- Cell record: flat `uv` (metres), triangles `I`, `hostI`, `hostW`, piece id, half, welded ids, exact `outline` — [wb:740](pipeline/wrap_block.py#L740). Openings: loop hosts plus a second host set 6 mm into the fabric, for finishing direction — [wb:755-759](pipeline/wrap_block.py#L755).
- Written to `app/captures/wrap-<size>-<cut>.json`, git-ignored — [wb:11](pipeline/wrap_block.py#L11), [wb:772-773](pipeline/wrap_block.py#L772).

**Not stored**
- The solver's normals, stresses, per-triangle R or stretch, elastic strain or contact state. Stretch is recomputed later from positions and `uv` — [wrap-eval.js:96-112](app/src/dev/wrap-eval.js#L96), [wrap-eval.js:167-186](app/src/dev/wrap-eval.js#L167).
- For the bought block only, `base` positions are also saved as `.npz` — [wb:788-789](pipeline/wrap_block.py#L788).

**Display**
- `show` interpolates the hosts, then writes `Pos = sum(w G) + n * 0.0012` ("on the garment surface, clear of the skin") — [wrap-eval.js:144-151](app/src/dev/wrap-eval.js#L144).
- The block is evaluated on whatever surface exists at display time, so the map is host-relative — [wrap-eval.js:116-117](app/src/dev/wrap-eval.js#L116).
- Render wrinkles are fragment bump "radial folds fanning out of the crotch and the armpits", in zones set on the reference body, unrelated to solved stretch — [engine.js:337-355](app/src/render/engine.js#L337), [fabric.js:183](app/src/materials/fabric.js#L183), [fabric.js:549](app/src/materials/fabric.js#L549).
- Recorded result: at the small of the back on `young`, length gathers to 75%: "The render has no wrinkles there, and a printed design would look squeezed" — [fitting-a-block-like-the-app.md:98](knowledge/engineering/app/fitting-a-block-like-the-app.md#L98). Wrists "look puckered at the edge in `a-pose`" — [fitting-a-block-like-the-app.md:99](knowledge/engineering/app/fitting-a-block-like-the-app.md#L99).
- Cut edges are triangle-following on removed-triangle holes in the refit bench — [refitting-after-an-edit.md:42](knowledge/engineering/app/refitting-after-an-edit.md#L42).

**Possible double offset in `fabric` display mode (code reading only, not run)**
- `show` writes `position` as G + 1.2 mm along the normal, and G already includes the lift — [wrap-eval.js:146-151](app/src/dev/wrap-eval.js#L146), [mannequin.js:438](app/src/body/mannequin.js#L438).
- `interpolate` has also filled `aLift` — [garment.js:227](app/src/render/garment.js#L227).
- In `fabric` mode the material is `view.material`, i.e. `createFabricMaterial(5)`, where `zone === 5` means `panel` is true, so `uGarment = 1` and `uOffset = 0.0012` — [garment.js:121-124](app/src/render/garment.js#L121), [fabric.js:1146-1150](app/src/materials/fabric.js#L1146).
- The vertex shader then adds `normal * uOffset + aLift * uGarment` on top — [fabric.js:44](app/src/materials/fabric.js#L44).
- As read, a `fabric`-mode block is drawn with the lift and the offset applied twice; `grid` and `stretch` modes use plain `MeshStandardMaterial`, so only once, and `strain()` reads the attribute, not the shader's result. I did not verify this at runtime, because dev scripts overwrite the owner's autosave.

### Inferences
- By sampling, a 7 mm mesh could at most represent wavelengths of about 14 mm, realistically 3-5 edges per wave (about 20-35 mm). Yet that limit is not the binding one: with no bending term, with the point held on a surface whose own edges are about 6.5 mm on the trunk, and with final projection, no out-of-surface wrinkle exists regardless of mesh size.
- Compressed regions (sigma in 0.5-1) are stored as a shrunk map: flat `uv` spread over less surface. The surplus material that real fabric would form into folds is represented only as print compression.
- The surface between 7 mm block points is linearly interpolated over 7 mm triangles, while each vertex is on a finer body mesh, so the rendered surface chords the body at about that scale.
- Host coordinates tie the block to the body mesh's parametrisation, so anything that stretches the host triangles differently per pose moves block points with it.

### Gaps
- No measurement of how far points were from the surface before final projection was found, or of how much stretch the final projection and host snapping add.
- Whether the double offset above is real at runtime, and its size at the seat, is unverified.

## Which values are measured, and which are guesses?

### Takeaway
Pattern geometry comes from a purchased block and is measured; elastic ratios are one published rule; every stiffness and fabric-behaviour value is an estimate, a choice from a trial or a slider, or undocumented. No fabric or elastic has been physically tested, and "Nothing is reviewed by a pattern maker or sewn."

### Cited Findings

| Value | Setting | Status per source | Source |
|---|---|---|---|
| Leg cut lines | Purchased XS, stretched to each body | Purchased pattern as authority | [draft_block.py:73-82](pipeline/draft_block.py#L73), [fitting-a-block-like-the-app.md:23](knowledge/engineering/app/fitting-a-block-like-the-app.md#L23) |
| `REF` proportions, reductions (r_bust 0.166, r_waist 0.082, r_hip 0.165, cap_ease 0.025) | | Measured from purchased block at XS against `young`; "Limits and `REF` are unreviewed"; adult chart sizes "[INFERRED]" | [draft_block.py:24-33](pipeline/draft_block.py#L24), [drafted-blocks.md:31-32](knowledge/engineering/app/drafted-blocks.md#L31), [drafted-blocks.md:70](knowledge/engineering/app/drafted-blocks.md#L70) |
| Other drafted lines | | Depart from the purchased block: back armhole up to 16.6 mm, cap 392 vs 373 mm, underarm 401 vs 451 mm | [fitting-a-block-like-the-app.md:96](knowledge/engineering/app/fitting-a-block-like-the-app.md#L96) |
| Body tape measures | Tape along hull of the garment surface | Computed from the mesh, so they contain the lift | [wrap-eval.js:230](app/src/dev/wrap-eval.js#L230), [drafted-blocks.md:31](knowledge/engineering/app/drafted-blocks.md#L31) |
| `ELASTIC` front/back leg | 1.0 / 0.75 | Published rule (Spruce & Fjell), whole opening 87%, near Treasurie's 85%; marked TUNABLE, not measured | [wb:34-37](pipeline/wrap_block.py#L34), [fitting-a-block-like-the-app.md:72-73](knowledge/engineering/app/fitting-a-block-like-the-app.md#L72) |
| `ELASTIC` neck, wrist | 0.95 | "Chosen within the sourced 75-100%" | [fitting-a-block-like-the-app.md:74](knowledge/engineering/app/fitting-a-block-like-the-app.md#L74) |
| `ELASTIC_K` | 8 | "**Estimate.**" Rough estimate about 10 from "remembered, unverified figures"; search found no force data | [fitting-a-block-like-the-app.md:75](knowledge/engineering/app/fitting-a-block-like-the-app.md#L75) |
| `GATHER` | 0.5 | "**Chosen from the trial**, not measured"; "Fabric's real gathering limit is unknown". Trial: elastic lowest point 20.5 mm unpinned, 9.0 at 0.7, 5.2 at 0.5, 4.9 at 0.3 | [fitting-a-block-like-the-app.md:58-64](knowledge/engineering/app/fitting-a-block-like-the-app.md#L58), [fitting-a-block-like-the-app.md:76](knowledge/engineering/app/fitting-a-block-like-the-app.md#L76) |
| `PLANE` 300, `DAMP` 0.05, fold 1e4, hold 1e5, cot clip [0.02, 6], normal gate 0.2, `STEP` 7 | | No basis stated beyond a comment; solver-design choices | [wb:28-32](pipeline/wrap_block.py#L28), [wb:322](pipeline/wrap_block.py#L322), [wb:381](pipeline/wrap_block.py#L381), [wb:401-404](pipeline/wrap_block.py#L401) |
| `LIFT_MAX` 0.03, `LIFT_ITER` 220 | | Heuristic, tuned | [mannequin.js:45](app/src/body/mannequin.js#L45) |
| `seatAlong` 0.25 (4x), `CELL` 2.5 mm, thresholds | | Chosen by renders, owner review; "Leotards are stretched far harder around the hips than up the seat" is stated, without a measurement | [fabric-bridging-hollows.md:208-211](knowledge/engineering/geometry/fabric-bridging-hollows.md#L208), [seat.js:29-39](app/src/body/seat.js#L29) |
| `shrink` 0.75, `grip` 0.002 | | "chosen by the owner with the sliders on the low lunge" | [garment-sliding.md:64-65](knowledge/engineering/app/garment-sliding.md#L64) |
| Bust and seat drapes in body | | Owner's choices 2026-10-25/26 | [shapes.py:21-30](pipeline/daz/shapes.py#L21) |
| `FACING`, parts | | Geometric necessity found by failure | [wrapping-a-flat-block-onto-the-body.md:37-44](knowledge/engineering/app/wrapping-a-flat-block-onto-the-body.md#L37) |

**Validation criteria in use**
- Judged by the owner on look, seam gap, and comparison with the app's own line and the block's intended reduction — [wrapping-a-flat-block-onto-the-body.md:24](knowledge/engineering/app/wrapping-a-flat-block-onto-the-body.md#L24), [wrapping-a-flat-block-onto-the-body.md:66-67](knowledge/engineering/app/wrapping-a-flat-block-onto-the-body.md#L66). "The app's line is a comparison, not a target" — [fitting-a-block-like-the-app.md:23](knowledge/engineering/app/fitting-a-block-like-the-app.md#L23).
- Results on six bodies: inside out 0.03-0.15%; elastic lowest 4.4-12.6 mm below crotch; turn at crotch 19-29 degrees; back 7 cm half width block / app 116/108 on `young` — [fitting-a-block-like-the-app.md:82-89](knowledge/engineering/app/fitting-a-block-like-the-app.md#L82).
- Not physically validated: "Finished edges are dev-only. Nothing is reviewed by a pattern maker or sewn." — [fitting-a-block-like-the-app.md:102](knowledge/engineering/app/fitting-a-block-like-the-app.md#L102). No photo or worn-garment comparison was found in the pages read.
- Status in product: not in the app — "Not in the app; `/wrap.html` still shows the bought block" — [drafted-blocks.md:71](knowledge/engineering/app/drafted-blocks.md#L71).

### Inferences
- Parameters that most change the outcome per the project's own trials (elastic stiffness and ratio, GATHER) are exactly the unmeasured ones.
- The GATHER trial was optimised against a line and crotch-seam symptom, with results judged partly by agreement with the app's line (13.0 to 7.6 mm), although the page says lines are not tuned to the app; the agreement is reported as "untuned".

### Gaps
- No lab data: no tensile curves, biaxial data, compression or wrinkling thresholds, elastic force-extension, friction coefficient, areal density or bending length for any fabric used. Patents give only methods — [fitting-a-block-like-the-app.md:75](knowledge/engineering/app/fitting-a-block-like-the-app.md#L75).
- No sensitivity study covering STEP, PLANE or DAMP, and no comparison against a cloth simulator was found ("no dForce cross-check yet" — [garment-sliding.md:207](knowledge/engineering/app/garment-sliding.md#L207)).
