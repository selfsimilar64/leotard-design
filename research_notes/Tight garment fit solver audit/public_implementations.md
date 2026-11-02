# Public cloth simulation implementations, audited against our tight-garment fit solver

Our solver, for reference: quasi-static ARAP on flat pattern rest shapes, attraction to the tangent plane of a rigid body, no friction, no gravity, isotropic, no bending, a no-cost compression allowance down to 50% of flat size, elastic edges as springs.

Evidence tags used below:
- **[SRC]** I read the code in the public repository this session.
- **[DOC]** Official docs or a repository README.
- **[PAPER]** The authors' paper, read as text. This is what the authors report, not something I reran.
- **[CLAIM]** Vendor or secondary claim, not verified.
- Nothing was built or run. Every statement about behaviour comes from reading, not testing.

## What physics does each implementation actually use?

### Takeaway
All audited solvers are dynamic or relax to rest through dynamics, except that C-IPC exposes a static-solve argument. All include friction, gravity and bending by default, and all audited contact models except our attraction are one-sided. None ships a pre-tension or elastic-band feature aimed at stretch garments; rest-length scaling exists only in Blender and Vellum. The no-cost compression idea has real precedents (ShapeOp strain ranges, Blender and Vellum compression stiffness, and possibly NvCloth), but no audited FEM-style garment solver uses it. The closest public relative to our edge springs is GarmentCodeData, which verifiably uses isotropic edge springs only under XPBD.

### Cited Findings

#### GarmentCode / GarmentCodeData, with NvidiaWarp-GarmentCode
- [SRC] GarmentCode selects `wp.sim.XPBDIntegrator()`, with the semi-implicit integrator commented out — [garment.py lines 82-83](https://github.com/maria-korosteleva/GarmentCode/blob/main/pygarment/meshgen/garment.py).
- [SRC] **The membrane is edge springs only.** `add_cloth_mesh_sewing_spring` creates one spring per triangle edge when `add_springs=True` — [model.py line 3846 on](https://github.com/maria-korosteleva/NvidiaWarp-GarmentCode/blob/main/warp/sim/model.py). The XPBD integrator contains `solve_springs` and `bending_constraint` but has no reference to `tri_ke` or `tri_materials` and no triangle membrane kernel — [integrator_xpbd.py](https://github.com/maria-korosteleva/NvidiaWarp-GarmentCode/blob/main/warp/sim/integrator_xpbd.py).
- [SRC] The springs are two-sided: the constraint is `c = l - rest`, so compression costs the same as stretch, with no allowance — [integrator_xpbd.py lines 484-548](https://github.com/maria-korosteleva/NvidiaWarp-GarmentCode/blob/main/warp/sim/integrator_xpbd.py).
- [SRC] Defaults: `spring_ke` 50000, `spring_kd` 10, `garment_edge_ke` 1.0 ("Very soft fabric"), `body_friction` 0.5, `fabric_friction` 0.5, `body_collision_thickness` 0.25, `attachment_frames` 400, `max_sim_steps` 2400 — [default_sim_props.yaml](https://github.com/maria-korosteleva/GarmentCode/blob/main/assets/Sim_props/default_sim_props.yaml). The same file sets `garment_tri_ke` and `garment_tri_ka` to 10000.
- [SRC] The neo-Hookean triangle force exists only in the Euler integrator, which GarmentCode has commented out — [integrator_euler.py line 171 on](https://github.com/maria-korosteleva/NvidiaWarp-GarmentCode/blob/main/warp/sim/integrator_euler.py).
- [PAPER] "We fix the stiffness across all samples to have minimal stretching"; only bending varies, across three manually chosen levels — [GarmentCodeData](https://arxiv.org/pdf/2405.17609). The authors say more work is needed to model materials from real fabric properties (same source).
- [SRC + PAPER] **Seams:** panels are merged into one "box mesh" and stitched by supplying original edge lengths, which collapses the edges elongated by merging — [GarmentCodeData](https://arxiv.org/pdf/2405.17609); [model.py `add_sewing_spring` branch](https://github.com/maria-korosteleva/NvidiaWarp-GarmentCode/blob/main/warp/sim/model.py). The first few frames run without gravity to help stitching (paper).
- [SRC] **Body and contact:** rigid static body mesh with Coulomb-style friction limited by `mu * lambda_n` — [integrator_xpbd.py `solve_particle_shape_contacts`](https://github.com/maria-korosteleva/NvidiaWarp-GarmentCode/blob/main/warp/sim/integrator_xpbd.py). The fork adds a push-out of cloth found inside the body and a drag of intersecting panels toward their body part — [fork README](https://github.com/maria-korosteleva/NvidiaWarp-GarmentCode).
- [SRC] **Waistband handling:** one-sided half-space attachment (the constraint applies only when `err < 0`) holding the waist above the waist level for a set number of frames, then released — [integrator_xpbd.py lines 2131-2178](https://github.com/maria-korosteleva/NvidiaWarp-GarmentCode/blob/main/warp/sim/integrator_xpbd.py); [paper](https://arxiv.org/pdf/2405.17609). `FittedWB` and `StraightWB` are garment geometry classes — [bands.py](https://github.com/maria-korosteleva/GarmentCode/blob/main/assets/garment_programs/bands.py). I found no elastic band or pre-tension: a code search for "elastic" returned only `sim_config.py` and the legacy `qualothwrapper.py`, which I did not open beyond that hit.
- [SRC] **Dynamic relaxation:** the run stops when 1.5% or fewer of vertices still move above the threshold — [default_sim_props.yaml](https://github.com/maria-korosteleva/GarmentCode/blob/main/assets/Sim_props/default_sim_props.yaml); [paper](https://arxiv.org/pdf/2405.17609). Config uses 60 fps and 10 substeps — [sim_config.py](https://github.com/maria-korosteleva/GarmentCode/blob/main/pygarment/meshgen/sim_config.py).

#### NVIDIA Warp and Newton
- [DOC] `warp.sim` was deprecated and then removed from Warp, superseded by Newton — [Warp CHANGELOG](https://github.com/NVIDIA/warp/blob/main/CHANGELOG.md). The GarmentCode fork stays pinned to v1.0.0-beta.6 — [fork README](https://github.com/maria-korosteleva/NvidiaWarp-GarmentCode).
- [SRC] Newton VBD uses a neo-Hookean membrane, `psi = (mu/2)(I_c - 2) + (lambda/2)(J_s - alpha)^2` — [particle_vbd_kernels.py line 535 on](https://github.com/newton-physics/newton/blob/main/newton/_src/solvers/vbd/particle_vbd_kernels.py). The docs mark `SolverVBD` experimental — [vbd.rst](https://github.com/newton-physics/newton/blob/main/docs/solvers/vbd.rst).

#### Style3D's published solver (`SolverStyle3D` in Newton)
This repository code is Style3D-named, but its link to Style3D's commercial product is not established. My search of Style3D's own pages found only marketing, with no open-source statement.
- [SRC] Docstring: "Projective dynamics based cloth solver", citing Baraff-Witkin and Liu et al. It is implicit Euler with a constant PD-approximated Hessian and a PCG solve — [solver_style3d.py](https://github.com/newton-physics/newton/blob/main/newton/_src/solvers/style3d/solver_style3d.py).
- [SRC] **Stretch is Baraff-Witkin, not ARAP:** force terms `ku(|Fu|-1)`, `kv(|Fv|-1)` and shear `ks(Fu·Fv)`. It is orthotropic with weft, warp and shear stiffness, linear, and two-sided, with no compression allowance — [kernels.py lines 28-68](https://github.com/newton-physics/newton/blob/main/newton/_src/solvers/style3d/kernels.py).
- [SRC] **Bending:** Crouzeix-Raviart isometric model — [kernels.py line 71 on](https://github.com/newton-physics/newton/blob/main/newton/_src/solvers/style3d/kernels.py).
- [SRC] **Flat pattern rest shapes are first-class:** `panel_verts` and `panel_indices` are separate from 3D `vertices` and `indices`, and rest data is computed from 2D panel coordinates — [cloth.py](https://github.com/newton-physics/newton/blob/main/newton/_src/solvers/style3d/cloth.py). The example loads the rest shape from garment UVs (× 1e-3) and uses an avatar mesh, skirt/T-shirt/sweatshirt garments, 10 substeps, 4 iterations, `tri_aniso_ke` (100, 100, 10) — [example_cloth_style3d.py](https://github.com/newton-physics/newton/blob/main/newton/examples/cloth/example_cloth_style3d.py).
- [SRC] **Contact:** penalty with friction (`friction_mu`, `friction_epsilon`) reusing the VBD body-particle contact, plus penalty vertex-triangle and edge-edge self-contact — [collision/kernels.py](https://github.com/newton-physics/newton/blob/main/newton/_src/solvers/style3d/collision/kernels.py).

#### Codim-IPC (C-IPC)
- [SRC] **Membrane:** `Compute_Membrane_Energy` has two branches behind `useNH`: neo-Hookean with a log-J term, and StVK-style `lambda/2 tr(M)^2 + mu tr(M^2)` — [MEMBRANE.h](https://github.com/ipc-sim/Codim-IPC/blob/main/Library/FEM/Shell/MEMBRANE.h).
- [SRC] **Strain limiting** is a log barrier on triangle singular values, with upper and lower forms — [INEXT.h](https://github.com/ipc-sim/Codim-IPC/blob/main/Library/FEM/Shell/INEXT.h). There is also an anisotropic version — [ANISO_INEXT.h](https://github.com/ipc-sim/Codim-IPC/blob/main/Library/FEM/Shell/ANISO_INEXT.h).
- [SRC] **Fabric presets**, isotropic: E base 0.821e6, 0.170e6, 0.076e6, 0.478e6, 3e9; strain limits 1.0608, 1.085, 1.134, 1.0646, 1.005 — [FEMDiscreteShellBase.py](https://github.com/ipc-sim/Codim-IPC/blob/main/Python/Drivers/FEMDiscreteShellBase.py).
- [SRC] **Garment scene:** loads a rest shape, a separate `drape.obj` initial state, a mannequin driven as a moving boundary, `dt` 0.04, `k_stitch` 1000, friction `mu` 0.2, membrane stiffness × 0.01, `kappa_s` (1e3, 0) and strain limit `cloth_SL_iso` — [5_garments.py](https://github.com/ipc-sim/Codim-IPC/blob/main/Projects/FEMShell/5_garments.py).
- [SRC] **Seams** are zero-rest-length penalty springs from a vertex to a point on an edge, `k/2 |x0 - lerp(x1,x2)|^2` — [STITCH.h](https://github.com/ipc-sim/Codim-IPC/blob/main/Library/FEM/Shell/STITCH.h).
- [PAPER] The flat pattern is staged around the mannequin, then draped by stepping with stitching springs at a large step to static equilibrium — [C-IPC paper §6.7](https://ipc-sim.github.io/C-IPC/file/paper.pdf). `staticSolve` is an argument in the solver's [IMPLICIT_EULER.h](https://github.com/ipc-sim/Codim-IPC/blob/main/Library/FEM/Shell/IMPLICIT_EULER.h) [SRC], but I did not trace how it is used.
- [PAPER] Softening stiffness to 0.01× is described as necessary to avoid membrane-locking artifacts, with strain limits then supplying the stiffness — [C-IPC paper Fig. 16](https://ipc-sim.github.io/C-IPC/file/paper.pdf).

#### libuipc
- [DOC] Implicit Newton incremental potential with frictional contact, CCD line search, GPU PCG — [README](https://github.com/spiriMirror/libuipc).
- [SRC] Constitution headers include `neo_hookean_shell`, `baraff_witkin_shell`, `hookean_spring`, `arap`, `discrete_shell_bending` — [include/uipc/constitution](https://github.com/spiriMirror/libuipc/tree/main/include/uipc/constitution). I did not read `arap.h`, so whether it applies to shells is unknown.
- [DOC] `StrainLimitingBaraffWitkinShell` has `phi(s) = (s-1)^2 + eta max(s-1,0)^3`. Compression is penalised quadratically, extension gets an extra cubic term, and there are separate Ka, Kb and Kg. Fibre directions are fixed to the rest-frame X and Y, with no UV or arbitrary fibre orientation input — [spec](https://github.com/spiriMirror/libuipc/blob/main/docs/specification/constitutions/strain_limiting_baraff_witkin_shell.md). This is the nearest public analogue to a measured asymmetric curve, but it still charges for compression.
- [DOC] **Seams:** `SoftVertexStitch` is `kappa/2 |x0-x1|^2`, or a spring with a rest length — [spec](https://github.com/spiriMirror/libuipc/blob/main/docs/specification/constitutions/soft_vertex_stitch.md). Vertex-edge and vertex-triangle variants exist in the same folder.
- [SRC] **Sewing-pattern sample:** two T-shirt panel OBJs plus a stitch JSON and `body.obj`. It uses `StrainLimitingBaraffWitkinShell` (stretch E 5e4, shear E 1e1, nu 0.49, thickness 0.001, `strain_rate` 100), `DiscreteShellBending`, `SoftVertexStitch`, gravity -9.8, `dt` 1/60, `default_model(0.01, 1e9)` — [24_sewing_pattern/main.py](https://github.com/spiriMirror/libuipc-samples/blob/main/examples/24_sewing_pattern/main.py).

#### ARCSim
- [SRC] **StVK-form energy with strain-dependent stiffness.** Green strain G feeds a lookup of measured data on a 30×30×30 grid with `G00` and `G11` starting at -0.25 and `G01` at 0 (grid step 1/30), so the model is nonlinear and anisotropic — [physics.cpp lines 69-79](https://github.com/jiongchen/arcsim/blob/master/src/physics.cpp); [dde.cpp lines 34-93](https://github.com/jiongchen/arcsim/blob/master/src/dde.cpp). This repository is a third-party copy, chosen for reading. The [official page](https://graphics.berkeley.edu/resources/ARCSim/index.html) lists v0.2.1 and v0.3.1, and I did not diff them.
- [SRC] **Ships measured stretch-fabric data:** `white-swim-solid` (swimsuit, 87% nylon 13% spandex), `ivory-rib-knit` (underwear, 95% cotton 5% spandex) and `navy-sparkle-sweat` (sweater, 96% polyester 4% spandex), from Wang, Ramamoorthi and O'Brien — [materials/README](https://github.com/jiongchen/arcsim/blob/master/materials/README); [white-swim-solid.json](https://github.com/jiongchen/arcsim/blob/master/materials/white-swim-solid.json).
- [SRC] **Strain limiting** uses per-material `strain_min` and `strain_max`, applied through singular values — [strainlimiting.cpp](https://github.com/jiongchen/arcsim/blob/master/src/strainlimiting.cpp); [cloth.hpp](https://github.com/jiongchen/arcsim/blob/master/src/cloth.hpp).
- [SRC] **Contact:** friction `mu` and `mu_obs` per constraint, repulsion thickness, `collision_stiffness` — [proximity.cpp](https://github.com/jiongchen/arcsim/blob/master/src/proximity.cpp). The dress scene uses gravity, a motion-driven body and remeshing, with step 0.04/8 — [dress-blue.json](https://github.com/jiongchen/arcsim/blob/master/conf/dress-blue.json).
- [PAPER, third party] C-IPC's authors report ARCSim's limits at [0.9, 1.1] are not fully satisfied, and that their complex stitched garments "can not be simulated in the ARGUS and ARCSim codes" — [C-IPC paper](https://ipc-sim.github.io/C-IPC/file/paper.pdf). This is a competitor's statement.

#### DiffCloth
- [SRC] Projective Dynamics triangle energy: `0.5 k area |F - proj(F)|^2`. The projection is **Gram-Schmidt on F, not an SVD closest rotation**, so it is ARAP-like, not strict ARAP — [Triangle.cpp](https://github.com/omegaiota/DiffCloth/blob/main/src/code/simulation/Triangle.cpp). A Green-strain branch also exists (same file). Two-sided, no allowance.
- [SRC] **Dry friction** from Ly et al. 2020 ("LY 20"); self-contact hard-coded to `clothFrictionalCoeff = 0.1`; a `sock` demo using capsules for foot and leg sets `sockLeg.mu = 0` — [Simulation.cpp](https://github.com/omegaiota/DiffCloth/blob/main/src/code/simulation/Simulation.cpp). The sock is the nearest thing to a tight-garment test in this repository, though I did not check its setup in detail.

#### DiffXPBD
- [PAPER] Differentiable XPBD, Stuyck and Chen — [arXiv 2301.01396](https://arxiv.org/pdf/2301.01396). My search found no official repository. GitHub has only unaffiliated repositories, [Xia-JW/DiffXPBD-Phys4DRT](https://github.com/Xia-JW/DiffXPBD-Phys4DRT) and [Cuberkk/3D_2nd_order_DiffXPBD_warp](https://github.com/Cuberkk/3D_2nd_order_DiffXPBD_warp), neither of which I read.

#### Blender cloth
- [SRC] Implicit mass-spring. **Tension and compression have separate stiffness.** With neither `resist_compress` nor `new_compress` set, a spring shorter than rest applies no force. `new_compress` uses a bending-style force — [implicit_blender.cc lines 1769-1830](https://github.com/blender/blender/blob/main/source/blender/simulation/intern/implicit_blender.cc); [SIM_mass_spring.cc lines 396-430](https://github.com/blender/blender/blob/main/source/blender/simulation/intern/SIM_mass_spring.cc).
- [SRC] **Rest-length shrink is built in.** `shrink_min`, `shrink_max` and a per-vertex group scale structural, shear, bending and internal springs but not sewing springs — [cloth.cc lines 707-714 and 1209-1220](https://github.com/blender/blender/blob/main/source/blender/blenkernel/intern/cloth.cc).
- [SRC] **Seams:** loose edges become sewing springs, with force clamped by `max_sewing` so they do not tunnel — [cloth.cc line 1612 on](https://github.com/blender/blender/blob/main/source/blender/blenkernel/intern/cloth.cc); [SIM_mass_spring.cc](https://github.com/blender/blender/blob/main/source/blender/simulation/intern/SIM_mass_spring.cc). `collider_friction` exists in the solver (same file).

#### Houdini Vellum (docs only, closed source)
- [DOC] Cloth is distance-on-edge plus bend constraints. Stretch type is Distance Along Edges or Triangle Stretch, the latter without warp/weft anisotropy — [Vellum Constraints](https://www.sidefx.com/docs/houdini/nodes/sop/vellumconstraints.html).
- [DOC] **Separate Compression Stiffness**, which can be lowered so stiff low-resolution cloth "collapse"s and regains fluidity. Also **Rest Length Scale** (0 collapses points) and stretch plasticity (same page).
- [DOC] Weld Points fuse points for the solve, Stitch Points use distance constraints, and Attach to Geometry has Tangent Stiffness, for example to hold up a belt (same page). For paneling, seams use Rest Length Scale 0 — [Paneling and draping](https://www.sidefx.com/docs/houdini/vellum/paneling_draping.html). Attach-with-tangent-stiffness is the nearest documented cousin to our tangent-plane attraction.

#### NvCloth
- [SRC] Each phase has `mStiffness`, `mStiffnessMultiplier`, `mCompressionLimit` and `mStretchLimit` — [PhaseConfig.h](https://github.com/NVIDIAGameWorks/NvCloth/blob/master/NvCloth/include/NvCloth/PhaseConfig.h). The field names suggest a no-cost or reduced-cost band, but I did not read the solver code that uses them.
- [DOC] A realtime solver for games; depends on PhysX and PxShared — [README](https://github.com/NVIDIAGameWorks/NvCloth). Docs cover tethers, distance/motion constraints, sphere/capsule collision and a friction impulse — [docs](https://github.com/NVIDIAGameWorks/NvCloth/tree/master/NvCloth/docs/documentation). Not a pattern-based tool.

#### Learned: HOOD, ContourCraft, SNUG (physics as training losses)
- [SRC] SNUG uses StVK: Green strain with `S = mu G + 0.5 lambda tr(G) I`, plus bending, gravity, inertia and collision penalty — [losses/physics.py](https://github.com/isantesteban/snug/blob/main/losses/physics.py). Correct Lamé values are `mu=2.36e4`, `lambda=4.44e4`, correcting the paper — [README](https://github.com/isantesteban/snug).
- [SRC] HOOD ranges: `lame_mu` 15909 to 63636, `lame_lambda` 3535 to 93334, friction `mu` 0.5, collision weight ramping 5e3 to 5e5, `pinned_verts: True` — [postcvpr.yaml](https://github.com/Dolorousrtur/HOOD/blob/main/configs/postcvpr.yaml). The body is a posed SMPL obstacle (same file).
- [PAPER] HOOD emulates tighter and looser fits by randomly resizing templates by U(0.9, 1.1) — [HOOD](https://arxiv.org/pdf/2212.07242). This is the only rest-shape scaling found among the learned methods.
- [SRC] ContourCraft's fine-tuning stretch term uses Green strain with `lame_mu` 63636, `lame_lambda` 93333 — [criterions/ft/stretching.py](https://github.com/Dolorousrtur/ContourCraft/blob/main/criterions/ft/stretching.py). It adds intersection-resolving losses — [criterions/ccraft](https://github.com/Dolorousrtur/ContourCraft/tree/main/criterions/ccraft).

#### Projective Dynamics implementations
- [SRC] **ShapeOp** has `EdgeStrainConstraint` with `rangeMin` and `rangeMax` for a target range of lengths, and a `TriangleStrain` constraint — [Constraint.h](https://github.com/EPFL-LGG/ShapeOp/blob/master/libShapeOp/src/Constraint.h). Strain ranges are the most direct public precedent for a no-cost compression band in a local/global solver. This repository describes itself as a copy from shapeop.org, not an official source. I confirmed the range on edges but did not read the triangle constraint's range handling.

#### Browser
- [SRC] three.js compute cloth: "Simple cloth simulation with a verlet system", with springs, a sphere collider and wind — [webgpu_compute_cloth.html](https://github.com/mrdoob/three.js/blob/dev/examples/webgpu_compute_cloth.html).
- [DOC] ccincotti3's simulator is XPBD with small steps; the file listing includes `Constraint.ts` and `Collison.ts`. A search result summary describes distance and bending constraints — [repository](https://github.com/ccincotti3/webgpu_cloth_simulator). jspdown's is XPBD on the GPU per the same search — [repository](https://github.com/jspdown/cloth). I did not read their source.

### Summary table

| Implementation | Membrane | Compression | Bend | Friction | Rest shape from flat pattern | Solver |
|---|---|---|---|---|---|---|
| **Ours** | ARAP + edge springs | Free to 50% | None | None | Yes | Quasi-static |
| GarmentCodeData | Edge springs (isotropic) | Same as stretch | Yes | 0.5 | Yes, box mesh | XPBD dynamic, relaxes to rest |
| Newton Style3D | Baraff-Witkin (weft, warp, shear) | Same as stretch | Yes | Yes | Yes, panels | PD-style implicit, dynamic |
| C-IPC | Neo-Hookean or StVK plus strain barrier | Penalised, optional lower limit | Yes | 0.2 in scene | Yes, staged | Newton, drapes to equilibrium |
| libuipc | Neo-Hookean or BW plus cubic limit | Quadratic | Yes | Yes | Yes, panels in sample | Newton, GPU |
| ARCSim | StVK form, measured nonlinear | Measured, clamped lookup | Yes | Yes | Not verified | Implicit |
| DiffCloth | PD (Gram-Schmidt) or Green | Same as stretch | Yes | Dry friction | Not verified | PD dynamic |
| Blender | Springs | Selectable, can be zero | Yes | Yes | Mesh plus sewing springs | Implicit |
| Vellum | Distance or triangle stretch | Separate stiffness | Yes | Not read | Via panels and welds | Not confirmed |
| SNUG / HOOD | StVK loss | Penalised | Yes | SNUG none found; HOOD 0.5 | Template mesh | Learned |

### Inferences
- Our edge-spring treatment is not an outlier: GarmentCodeData's membrane under XPBD is edge springs only, and `tri_ke`/`tri_ka` in its YAML appear to do nothing under that integrator. The real difference is that they tune for "minimal stretching", so they model something close to inextensible fabric, not stretch.
- No-cost compression has precedents in reduced-order and game-style solvers (ShapeOp, Blender, Vellum, possibly NvCloth), but all the FEM-style solvers audited charge for compression. Removing compression cost is a known way to avoid buckling and locking trouble, as C-IPC's softening to 0.01× suggests from another direction, but it also removes the forces that form wrinkles.
- Our missing friction and gravity differ from every audited solver. For a garment in net tension against the body, friction could still change how strain distributes along the body, since every public solver can hold cloth against a slip that ours permits. This needs testing rather than assuming either way.
- A two-sided attraction to the body is not used by any audited solver as its primary contact. They all use one-sided contact, which permits cloth to bridge concavities. Vellum's attach with tangent stiffness is the closest match, but it is a user-placed constraint.
- The most useful borrowable ideas: libuipc's asymmetric stretch curve, ARCSim's measured swim and rib-knit curves, Blender's per-vertex shrink as a model for elastic bands, and Style3D's panel-rest API shape.

### Gaps
- The default of `useNH` in C-IPC was not confirmed, so which membrane branch the garment scene uses is unverified.
- `XPBDIntegrator` default iteration count in the GarmentCode fork was not checked, and XPBD effective stiffness depends on it.
- How `new_compress` and `resist_compress` map to Blender UI settings was not traced.
- Vellum's solver type: the Vellum pages I read do not mention XPBD, so I cannot confirm it from them.
- NvCloth's compression limit behaviour, ShapeOp's triangle range handling and libuipc's `arap.h` were not read.
- ARCSim's rest shape source (OBJ UVs presumably) and seam handling were not verified in source. Whether Newton's Style3D has a rest-scale input was not fully checked, since my grep output was cut off.

## Do they handle tight garments, with documented failures, run times and mesh sizes?

### Takeaway
No audited project reports a validated stretch-garment fit: no negative-ease, pressure or strain comparison against reality turned up. GarmentCodeData comes closest with a fitted jumpsuit, judged by eye. Its failures are mostly about loose garments and initial placement. Runtimes are tens of seconds on a strong GPU for about 30k triangles, far above an interactive budget, though the workload (full dynamic dressing with self-collision) differs from ours.

### Cited Findings
- [PAPER] GarmentCodeData uses a fitted jumpsuit "to evaluate the quality of tight fit". It reports garments follow the body "without excessive wrinkling or balance line distortions", which is a visual judgement across extreme body shapes — [paper](https://arxiv.org/pdf/2405.17609).
- [PAPER] Its success rate is about 72%, including mesh generation and quality control. Failures are sliding off for bulky or heavy designs with no grip, self-intersection during attachment, and dressing misalignment such as cuffs sticking out, a skirt caught in the feet and wrong-side pull — [paper](https://arxiv.org/pdf/2405.17609). None is specific to tight fit. The authors call for better body-cloth collision resolution from the initial placement.
- [PAPER] GarmentCodeData cost: 30 s per sample on an RTX 3090, about 30k garment triangles against a 47.5k-triangle body, capped at 5 minutes and 2400 frames — [paper](https://arxiv.org/pdf/2405.17609). The config in the repository sets `max_sim_time: 600` — [default_sim_props.yaml](https://github.com/maria-korosteleva/GarmentCode/blob/main/assets/Sim_props/default_sim_props.yaml) — so the code and paper differ on this limit.
- [PAPER, secondary] ChatGarment reports 33.9 s for its Warp-based stitching stage on an A100 — [ChatGarment](https://arxiv.org/pdf/2412.17811), from a search summary only.
- [PAPER] C-IPC garments: yellow dress 15.7K nodes on a 12.8K-node mannequin; test rows with 12.8K to 43.3K nodes at `dt` 0.04 with strain limit 1.134 and friction 0.2 — [C-IPC paper Fig. 20](https://ipc-sim.github.io/C-IPC/file/paper.pdf). These examples are a pleated dress and layered skirt, not tight garments. I could not recover the column headers for that table, so I am not quoting its timing column.
- [PAPER] ContourCraft: 3.66 to 10.49 fps for outfits of 12K to 36.5K nodes at a 1/30 s time step — [ContourCraft Table 2](https://arxiv.org/pdf/2405.09522).
- [PAPER] HOOD's authors describe SNUG as "limited to tight-fitting garments" and unable to generalize to new garments, and say skinning-based methods work well on tight-fitting garments but struggle on loose ones — [HOOD](https://arxiv.org/pdf/2212.07242). In that literature "tight" usually means the easy case that follows the body, not fabric in tension.
- [DOC] libuipc warns that IPC non-penetration guarantees depend on valid initial geometry and successful solves — [README](https://github.com/spiriMirror/libuipc). This matters for tight garments because a pattern smaller than the body must start somewhere intersection-free.
- [PAPER, secondary] D-Garment used a projective-dynamics simulator for speed at some cost to accuracy, and manually removed simulation failures — [D-Garment](https://arxiv.org/pdf/2504.03468), from a search summary only.
- [CLAIM] A Style3D blog says body-hugging knits often fail when avatar skin offset is too tight for garment thickness and collision padding. It came through search, and I did not open the post to confirm which one — [post 13459](https://www.style3d.com/blog/wp-json/wp/v2/posts/13459) or [post 17479](https://www.style3d.com/blog/wp-json/wp/v2/posts/17479). The same marketing cites 45+ FPS at about 50k vertices for its proprietary plugin — [Style3D blog](https://www.style3d.com/blog/?p=3339).
- [CLAIM] CLO3D forum: a user's self-drafted patterns drape as tight; the moderator blames the crotch shape, not the simulator — [thread](https://support.clo3d.com/hc/ko/community/posts/360042687334-Clothing-always-simulates-very-tight).
- [SRC] GitHub issue searches for "tight", "tightness", "skin-tight" and "tight fitting" on HOOD, ContourCraft, GarmentCode and Codim-IPC returned nothing. On libuipc and Newton they returned only unrelated items — [GitHub search](https://github.com/search?type=issues&q=repo%3Amaria-korosteleva%2FGarmentCode+tight). Absence of issues is weak evidence: these projects simply are not used this way.

### Inferences
- There is no public benchmark we can validate against for tight stretch fit. A dedicated test would need to be built from measured data; that is outside this note's scope.
- The cost gap with our solver is mainly because these systems solve a harder problem: dressing from flat, self-collision and dynamics. Their timings do not transfer directly to a fit-only solver.
- Two practical failure sources appear to apply to any tight garment: initial placement and contact thickness. Both GarmentCodeData and the Style3D claim point there.

### Gaps
- I found no public report of a leotard, swimsuit or leggings fit validated against reality in these projects. HOOD's and ContourCraft's body-fit errors were not extracted.
- Runtime for Newton's Style3D solver on a garment and for libuipc's sewing sample: no reported numbers found, and nothing was run.
- SNUG's mesh size and speed were not extracted.

## Is the code public, under which licence, and does it run in a browser or need a GPU?

### Takeaway
Licensing has one trap: GarmentCode is MIT but its simulator fork is non-commercial. For commercial use, Newton (Apache-2.0) and libuipc (Apache-2.0) are the strongest candidates, and both need a server or native install rather than a browser. No audited browser cloth simulator handles sewing patterns.

### Cited Findings

| Project | Public? | Licence | Hardware / platform |
|---|---|---|---|
| [GarmentCode](https://github.com/maria-korosteleva/GarmentCode) | Yes | MIT [DOC] | Requires the fork below |
| [NvidiaWarp-GarmentCode](https://github.com/maria-korosteleva/NvidiaWarp-GarmentCode) | Yes | NVIDIA Source Code License, "only non-commercial use" [DOC] | Warp; paper used RTX 3090; builds without CUDA if `CUDA_PATH` is unset, but I did not confirm the simulator works usefully on CPU |
| [NVIDIA Warp](https://github.com/NVIDIA/warp) | Yes | Apache-2.0 (GitHub API) | `warp.sim` removed, so cloth now lives in Newton |
| [Newton, including Style3D and VBD](https://github.com/newton-physics/newton) | Yes | Apache-2.0 (GitHub API) | Warp-based; described as GPU-accelerated |
| [Codim-IPC](https://github.com/ipc-sim/Codim-IPC) | Yes | Apache-2.0 [DOC] | Builds on Ubuntu and macOS; paper's timings used Intel MKL. README states no GPU requirement |
| [libuipc](https://github.com/spiriMirror/libuipc) | Yes, active (pushed 2026-10-29) | Apache-2.0 (API); [samples](https://github.com/spiriMirror/libuipc-samples) Apache-2.0 | **Needs CUDA** ≥ 12.4 for source builds; Linux and Windows wheels |
| [ARCSim](https://graphics.berkeley.edu/resources/ARCSim/index.html) | Yes | Educational, research, not-for-profit — [LICENSE copy](https://github.com/jiongchen/arcsim/blob/master/LICENSE) | C++; no GPU code noticed, not checked fully |
| [DiffCloth](https://github.com/omegaiota/DiffCloth) | Yes | MIT (API) | Ubuntu 22.04 and Mac OS 12 per README |
| DiffXPBD | No official repo found | n/a | n/a |
| Style3D commercial simulator | Closed | Proprietary | Marketing only |
| [Blender](https://github.com/blender/blender) | Yes | API reports NOASSERTION; not read this session | CPU cloth solver |
| Houdini Vellum | Closed | Commercial | Docs only |
| [NvCloth](https://github.com/NVIDIAGameWorks/NvCloth) | Source visible | Header text refers to a separate NVIDIA licence agreement; no SPDX licence in API; last pushed 2024-01 | CPU, CUDA and DX11 factories [DOC] |
| [HOOD](https://github.com/Dolorousrtur/HOOD) | Yes | MIT (API) | Python, torch; SMPL model has its own separate licence |
| [ContourCraft](https://github.com/Dolorousrtur/ContourCraft) | Yes | MIT (API) | Python, torch |
| [SNUG](https://github.com/isantesteban/snug) | Yes | "Other" (API); I did not read the terms | TensorFlow 2.7 |
| [ShapeOp copy](https://github.com/EPFL-LGG/ShapeOp) | Yes, unofficial copy | No SPDX licence in API | C++ |
| [three.js compute cloth](https://github.com/mrdoob/three.js/blob/dev/examples/webgpu_compute_cloth.html) | Yes | MIT (API) | **Browser**, WebGPU |
| [webgpu_cloth_simulator](https://github.com/ccincotti3/webgpu_cloth_simulator) | Yes | No licence detected (API); last pushed 2024-05 | **Browser**, WebGPU |
| [jspdown/cloth](https://github.com/jspdown/cloth) | Yes | MIT (API); last pushed 2023-05 | **Browser**, WebGPU |
| [Costumy](https://github.com/zalo/Costumy) (fork of cdrinmatane/Costumy) | Yes | GPL-3.0 (API) | Python prototype: pattern, fit, drape. Not a browser tool per its README usage |

- [SRC] Costumy turns 2D patterns into draped 3D garments and was first built for NeuralTailor's synthetic data — [README](https://github.com/zalo/Costumy). I did not establish its underlying simulator.
- [PAPER/DOC] The GarmentCodeData authors chose Warp because it is one of very few open-source GPU simulators — [paper](https://arxiv.org/pdf/2405.17609).
- My two searches for browser garment simulation found no open-source browser tool that drapes sewing patterns on a body. The nearest browser cloth code is the WebGPU list above — [search-surfaced examples](https://github.com/ccincotti3/webgpu_cloth_simulator).

### Inferences
- Our JavaScript and three.js solver seems to occupy a niche with no direct public competitor: pattern-based fit in a browser or native desktop setting. This rests on two searches, so it is suggestive only.
- Licences matter for anything we would copy. GarmentCode's simulator fork, ARCSim and any SMPL-based training setup are unsafe to borrow from for a commercial product without separate permission. Ideas and formulas are a different question from code; legal review is out of scope here.
- If we want a heavyweight offline reference to check our solver against, libuipc's sewing sample or Newton's Style3D solver would be the natural starting points. libuipc needs CUDA and the owner's GTX 1650 has only 4 GB, so this may limit mesh size. That memory limit is untested.

### Gaps
- Exact Blender licence text, NvCloth's licence terms, ShapeOp's licence and SNUG's terms were not confirmed.
- Whether Newton's Style3D solver runs usefully on CPU was not tested.
- Whether any of these solvers compiles to WebAssembly was not investigated.
- `erik2810/webgpu-spring-mesh` and the `threejs-particle-fluids` cloth module surfaced in search, but I did not audit them.
