# Numerical and modelling limits of our garment fit solver, compared with accepted methods

Evidence labels used on findings:
- **[PROVED]** a theorem or derivation stated in the source.
- **[TESTED]** the source reports a measurement or simulation comparison.
- **[ASSERTED]** the source states it without proof or a reported test, or the claim comes from its discussion.

**How the solver was read.** `pipeline/wrap_block.py`, `solve()`, lines 366-461, read directly on 2026-11-02. It matches the brief, with these details the brief omits:
- Constants: `STEP=7`, `ITERS=240`, `PLANE=300`, `DAMP=0.05`, `GATHER=0.5`.
- Local step (line 428-429): the target is `U diag(clip(sigma, 0.5, 1)) Vt`.
- The contact term is two-sided: `w n n'(p-q)` (line 444-450).
- A triangle that would invert has its rotation reflected (line 423-425).
- All free points are snapped to the surface after the last iteration, with no re-solve (line 459-460).
- The interior mesh is a staggered, near-equilateral grid passed through Delaunay (line 99-107).

**Citation problems in the brief.** The report writer should not repeat these.
- "Wrinkled flames and cellular patterns" is a **fire simulation** paper (Hong, Shinar, Fedkiw 2007), and has nothing to do with membranes: [PDF](https://www.cs.ucr.edu/~shinar/papers/2007_wrinkled_flames.pdf). The intended Chen paper is probably "Fine Wrinkling on Coarsely Meshed Thin Shells" (Chen, Chen, Kaufman, Skouras, Vouga, TOG 2021), whose code is named [WrinkledTensionFields](https://github.com/zhenchen-jay/WrinkledTensionFields).
- "Isometric tension fields" did not turn up as a title. The nearest is Chen, Kry and Vouga, "[Locking-free Simulation of Isometric Thin Plates](https://ar5iv.labs.arxiv.org/html/1911.05204)", which is about locking, not tension fields.
- Skouras 2014 is "[Designing Inflatable Structures](https://studios.disneyresearch.com/wp-content/uploads/2019/03/Designing-Inflatable-Structures.pdf)".
- "Larsson and Sigmund" on wrinkling: no such work found in one targeted search.
- "Bartels": no matching cloth-validation source was found. It may mean Bartle et al., but that is unverified.

## What does ARAP minimise, how does it relate to StVK / neo-Hookean / membrane models, and does local-global reach true equilibrium?

### Takeaway
ARAP is a legitimate elastic energy: the squared distance of the deformation gradient from a rotation, which amounts to a zero-Poisson, stiffness-only material. Local-global on a fixed energy of this kind does converge, at a linear rate. What is lost is material behaviour (Poisson coupling, nonlinearity, anisotropy), and our solver also departs from the conditions under which the convergence guarantee was stated.

### Cited Findings
- **[PROVED, by the framework's construction]** With the constraint set M = SO(3), the Projective Dynamics energy measures local deviation from rigid motion and is "identical" to the Chao et al. 2010 deformation model. With M = matrices with bounded singular values, it gives isotropic strain limiting. So our clamp is a member of this published family — [Bouaziz et al. 2014, Sec. 5](https://users.cs.utah.edu/~ladislav/bouaziz14projective/bouaziz14projective.pdf).
- **[ASSERTED]** Chao et al. describe the model as measuring the deformation's distance from the rotation group, and say standard Lamé parameters follow from it — [SIGGRAPH record](https://history.siggraph.org/?p=105477). Only the abstract was read.
- **[ASSERTED]** Projective Dynamics covers ARAP-type models and only the corotated subclass with λ = 0. Neo-Hookean is not supported directly. Corotated and neo-Hookean are both Valanis-Landel materials — [Liu, Bouaziz, Kavan](https://ar5iv.labs.arxiv.org/html/1604.07378).
- **[PROVED]** "The objective is bounded below and … both local and global steps are guaranteed to weakly decrease it, even for non-convex sets. Consequently, the optimization converges" — [Bouaziz 2014, Sec. 3](https://users.cs.utah.edu/~ladislav/bouaziz14projective/bouaziz14projective.pdf). Strictly, this argument gives a converging objective value. It does not show convergence to a unique position or to the global minimum.
- **[TESTED]** Local-global has linear convergence, against Newton's quadratic convergence (Figure 12 in the same paper). About 10 iterations look "visually similar" to the converged Newton result, and the authors recommend the method "where high accuracy is not the main focus" — [Bouaziz 2014, Sec. 7.3](https://users.cs.utah.edu/~ladislav/bouaziz14projective/bouaziz14projective.pdf). The accuracy claim is visual, not metric.
- **[TESTED]** Unlike Position Based Dynamics, apparent stiffness stays consistent across iteration counts. Bouaziz says its solver "converges to a true implicit Euler solution", whereas PBD's stiffness depends on iteration count — [Bouaziz 2014, Sec. 2, Fig. 4](https://users.cs.utah.edu/~ladislav/bouaziz14projective/bouaziz14projective.pdf).
- **[PROVED]** One local-global iteration equals a quasi-Newton step with the constant Hessian M/h² + L and unit step — [Liu et al.](https://ar5iv.labs.arxiv.org/html/1604.07378).
- **[TESTED]** Among constant-Hessian methods, "classical Projective Dynamics converges slowest". Relative error is measured against Newton iterated to convergence — [Liu et al.](https://ar5iv.labs.arxiv.org/html/1604.07378). That same convention gives a verification template.
- **[ASSERTED]** Liu et al. say ghost forces vanish only in a converged solution, which needs "a prohibitively high number of iterations" — [Liu et al.](https://ar5iv.labs.arxiv.org/html/1604.07378).
- **[PROVED for affine constraints; TESTED otherwise]** Projective Dynamics is exactly ADMM with w_i² = k_i when constraint manifolds are affine. With rotations the proof does not apply, but the two take "nearly the same steps" in a test — [Narain, Overby, Brown 2016, Sec. 4.1](https://diglib7.eg.org/bitstream/handle/10.2312/sca20161219/021-028.pdf).
- **[ASSERTED]** ADMM's cited rate is O(1/n). "Using a small fixed number of iterations is generally sufficient" for *interactive* use. Primal and dual residuals are offered when progress must be measured. Figure 4 of that paper contrasts ADMM's strain limiting with Projective Dynamics, which it says models it only softly — [Narain et al. 2016](https://diglib7.eg.org/bitstream/handle/10.2312/sca20161219/021-028.pdf).
- **[PROVED, as an analysis; abstract read]** Minimising squared distance to tangent planes at closest points is a Gauss-Newton iteration, with local quadratic convergence on a zero-residual problem. Closest-point ICP is only linear — [Pottmann et al. 2006](https://cs.utexas.edu/~huangqx/ijcv06_conv.pdf). This independently explains the project's finding that the tangent plane settles where a closest-point pull does not ([wrap note](../../knowledge/engineering/app/wrapping-a-flat-block-onto-the-body.md)). That theorem is for rigid registration. Applying it here is an analogy.
- **[ASSERTED]** Most cloth simulators use linear, isotropic models with hand-picked stiffness. Wang et al. propose a measured piecewise-linear anisotropic model instead — [Wang, O'Brien, Ramamoorthi 2011](https://history.siggraph.org/?p=114658). Miguel et al. describe that model as having 39 parameters — [Miguel et al. 2012](https://cdfg.mit.edu/assets/files/DataDrivenCloth-EG2012.pdf). Knits show high deformability and anisotropy — [Sperl et al. 2020](https://research-explorer.ista.ac.at/record/8385).

### Inferences
- **Our exact energy (my derivation).** The code's term Σ (cot_k/2)‖e_k − T E_k‖² equals A‖F − T‖²_F, using the triangle identity Σ cot_k E_k E_kᵀ = 2A·I (checked on a right triangle). Therefore the energy per unit flat area, per principal stretch σ, is:
  - (σ−1)² for σ > 1
  - 0 for 0.5 ≤ σ ≤ 1
  - (0.5−σ)² for σ < 0.5
- **Against other materials (my arithmetic, matched at small strain, uniaxial, ν = 0).** ARAP's nominal stress is 2μ(s−1). StVK's is 2μ·s·(s²−1)/2.
  - At stretch 1.2: 0.40μ against 0.528μ, so StVK is 32% higher.
  - At stretch 1.4: 0.80μ against 1.344μ, so StVK is 68% higher.
  - A J-shaped elastane curve would differ again.
- **What is lost.**
  - No Poisson coupling (λ = 0).
  - No stiffening at high stretch.
  - No difference between grain and cross-grain.
  - No bending or gravity.
- **What is not lost.** On a rigid surface with no external load, a single overall stiffness scale cancels, since only ratios enter (elastic to fabric, plane penalty to fabric). The shape therefore does not depend on a modulus we do not know. Its errors come from *variation* in stiffness and from the missing Poisson effect, not from the number itself.
- **Poisson bound (my estimate).** A free uniaxial incompressible strip at stretch 1.2 narrows to 1/√1.2 = 0.913, about 9% shorter in the crossing direction. Ours predicts 1.00. At ν = 0.3 the figure is about 6%. Over a 500 mm torso that is up to about 30-45 mm of *potential* length change. A leotard anchored at shoulder and crotch cannot shorten, so it should mostly appear as extra lengthwise tension, not as movement. This is an upper-bound reasoning only, and no knit Poisson ratio was sourced.
- **Our solver is not strictly Bouaziz's.** Three things break the fixed-energy premise, so the weak-decrease guarantee is not established for it:
  - the plane and its target are re-derived each iteration;
  - reflected rotations are not the closest projection;
  - the final snap to the surface changes strain without re-solving.
  None of these has been shown to do harm. `DAMP` is a proximal term and does not move a fixed point.
- **The "Converged" row in the wrap note is not valid evidence alone.** A mean move of 0.019 mm per iteration says little unless the rate is known. If the rate is ρ, the remaining distance is roughly move × ρ/(1−ρ). That is 0.019 mm at ρ = 0.5 and 19 mm at ρ = 0.999. The accepted test is a force or energy residual, or comparison to a Newton-converged reference as in Liu et al.

### Gaps
- Bouaziz's Figure 12 values were not extracted from the plot. I found no source giving a general iteration count needed for a stated position accuracy.
- Whether the real garment at 240 iterations is near its fixed point has not been measured. Doubling or 10× the iterations on the real solver would answer it directly.
- The Chao et al. paper and Liu et al. 2013 full texts were not read.

## Is one-sided (tension-only) stretching a recognised model, how does it behave without friction, and does compression collect in one area as an artefact?

### Takeaway
Yes: it is tension field theory (Pipkin's relaxed energy), an accepted model that predicts coarse shape and has been used for skin-tight clothing. But accepted uses keep something that selects a solution (external loads, bending, friction, or lift-off). Ours has none, so where slack sits is not determined by the physics in the model. My toy test confirms it stays wherever the starting shape put it.

### Cited Findings
- **[PROVED as a construction]** The relaxed energy equals the parent in taut regions, is zero where slack, and in between uses a compressive stretch at its energy-minimising "natural width" — [Venkata et al. 2024](https://arxiv.org/pdf/2406.13442); [Skouras et al. 2014, Eq. 4-5](https://studios.disneyresearch.com/wp-content/uploads/2019/03/Designing-Inflatable-Structures.pdf). Origin credited to Pipkin 1986 and Steigmann 1990 in both. Pipkin's own paper was not obtainable and was read through these.
- **[PROVED, for a stated setting]** Existence theorems exist for inflated wrinkled membranes — [arXiv math/0611035](https://arxiv.org/pdf/math/0611035). Relaxed energy for anisotropic membranes exists and is unique (Epstein), though applying Pipkin's route still has open issues — [Ligaro and Valvo](https://docenti.ing.unipi.it/paolovalvo/papers/2000-IASS-IACM-Ligaro_Valvo-paper.pdf).
- **[ASSERTED]** The parent energy "is not convex in the presence of compressions, jeopardizing the uniqueness and existence of solutions", and the relaxed form removes indefiniteness and needs fewer elements — [Skouras 2014, Sec. 4.2](https://studios.disneyresearch.com/wp-content/uploads/2019/03/Designing-Inflatable-Structures.pdf).
- **[TESTED, qualitatively]** The compression field gave strong indications of wrinkle location and direction, in "very good correspondence" with a high-resolution simulation and fabricated prototypes — [Skouras 2014, Sec. 4.2, Fig. 5](https://studios.disneyresearch.com/wp-content/uploads/2019/03/Designing-Inflatable-Structures.pdf).
- **[ASSERTED, with qualitative tests]** Tension field theory "minimizes a convex elastic energy which accurately predicts a surface's coarse-scale shape even when the simulation mesh has few degrees of freedom". It suits tension-dominated shells such as garments hung against gravity, and compression-dominated cases are out of scope — [Chen et al. 2021, Sec. 1 and 4.1](https://par.nsf.gov/servlets/purl/10333495).
- **Solution selection in that paper:** the base surface is solved with tension field theory *plus* a bending energy and external loads — [Chen et al. 2021, Sec. 4.1](https://par.nsf.gov/servlets/purl/10333495).
- **[TESTED by simulation]** Fully wrinkled stretched sheets approach a compression-free limit described by tension field theory — [Xin and Davidovitch 2021](https://ar5iv.labs.arxiv.org/html/2012.13051).
- **[ASSERTED]** Tension field theory assumes zero bending stiffness and no compressive stress, so "the detailed wrinkles cannot be captured", though regions and directions can be identified. A zero residual stiffness "would lead to convergence problems even in the case of temporary local slackening"; that paper keeps η = 10⁻⁴ — [arXiv 2403.13746](https://arxiv.org/html/2403.13746v2). Ours is η = 0 in the band.
- **[ASSERTED]** "The convexity of TFT was also exploited" to design skin-tight clothing (Montes et al. 2020); Choi and Ko 2002 and others weaken compression similarly — [Chen et al. 2021, Sec. 2](https://par.nsf.gov/servlets/purl/10333495).
- **[ASSERTED, with a physical test on force only]** Vechev et al. do not penalise compression "but allow cloth to lift off", because fully constrained elements gave "spurious deformation patterns" under unresolved wrinkling. They have no explicit friction model and "cannot account for stick-slip" — [Vechev et al. 2022](https://ar5iv.labs.arxiv.org/html/2204.09996).
- **Friction, measured:** skin-textile friction depends on yarn orientation, hydration, contact force and fabric pre-stretch, beyond simple Coulomb — [JKU](https://fodok.jku.at/fodok/vortrag.xsql?V_ID=22822). Skin friction rises with load and speed, with stick-slip — [J. Bionic Eng. record](https://katalog.hcu-hamburg.de/vufind/Search2Record/SPR038456532). In a tight-sleeve FE study, friction, modulus and initial gap strongly affect interface shear — [eScholarship](https://escholarship.org/uc/item/2261g74g).
- **Caution:** capstan equations should not be used to derive skin-fabric friction, because soft tissue inflates the apparent coefficient — [arXiv 2101.07210](https://export.arxiv.org/abs/2101.07210v1).

### Inferences
- **Ours is exactly a relaxed energy.** Relaxing the parent (σ₁−1)² + (σ₂−1)² by minimising over the compressive stretch gives natural width 1 and energy (σ₁−1)². So our clamp is Pipkin's relaxation of a zero-Poisson ARAP, with an extra floor at 0.5. The floor is a project choice marked as unmeasured in code; I found no source for it. Skouras's figure happens to display compression from 0.5 to 1, which is only a colour scale.
- **Convex is not unique.** The energy has a flat valley, so positions within it are all equally minimal. Convexity removes bad local minima, but it does not choose among equals. Chen's bending and loads do choose, and so do lift-off and friction in other work. In ours only the seed and `DAMP` choose.
- **Frictionless consequences (my reasoning from force balance, not a cited theorem).**
  - Along a closed hoop with no friction, tension must be constant, so strain equalises around the whole loop. That is what the model does: it cannot represent real tension varying around the body.
  - Tension cannot end inside the fabric, so tension paths must run to seams, openings or elastic. Slack pockets exist where no such path passes.
  - Real fit with friction is path-dependent and has many valid equilibria, so a "true" unique answer does not exist either. Any test should use a tolerance, or compare with how the garment was put on.

**Own test (not from literature).** A closed tube on a rigid cylinder of radius 100 mm, running the same iteration as `solve()`: cotangent Laplacian, same clamp, `PLANE=300`, `DAMP=0.05`, near-equilateral 7 mm mesh, free top and bottom edges, frictionless, and no reflection logic. Stretch values are 1st to 99th percentile.

| Case | Result | Reading |
|---|---|---|
| A. Taut, stretch 1.2, uneven start, ARAP | Hoop 1.200 everywhere by iteration 120 | Fast and correct |
| A'. Same, one-sided | Hoop 1.200 by 120; axial 0.994-0.998 at 960 | Correct where taut |
| B. Net stretch 1.02, uneven start | Hoop 0.998-1.028 at 120, 1.020 at 240 | Near-zero tension needs more iterations, still within 240 |
| C. Net slack hoop 0.90, start with sine amplitude 0.5 | Settles at hoop **0.524**-1.000, move 0.0000 mm | Compression stays bunched |
| C. Amplitude 0.25 | Settles at hoop **0.676**-1.000 | Different answer, same energy |
| C. Amplitude 0 | Settles at hoop **0.900** everywhere | Different answer, same energy |
| D. Axial seed 0.8, hoop 1.2, one-sided | Axial stays **0.800** forever; height 33.6 mm, move 0.0000 | Starting shape is preserved |
| D. Same, ARAP | Axial 1.000 by 120; height 42.0 mm | The clamp is the cause |
| E. 300 mm tube, net 1.05, uneven start | Hoop 1.049-1.051 at 120 | 240 enough for this mode at this length |

Reading of the test:
- This is a real finding: **in slack, the solver converges fully (zero movement) to a seed-dependent answer.** A convergence test would pass and the answer would still be arbitrary. This is the bias the brief asked about, and it comes from the model rather than from too few iterations.
- Compression collected in one area is therefore an artefact wherever it is inherited from the seed. In the real solver the seed comes from the app's own pieces and a rolled sleeve (wrap note), so that distribution can pass through.
- In tension, 240 iterations look ample on this simple geometry.
- Separate observation from the first version of the test, on right-triangle meshes: `np.clip(c, 0.02, 6)` (line 381) makes right angles carry a false weight, so S is no longer proportional to F. This produced a slow creep, with mean axial stretch only 0.835 at iteration 240 and 0.896 at 960 on a 300 mm tube, at 0.005 mm mean move per iteration. The real interior mesh is near-equilateral, so this matters only for boundary triangles if they have such angles (not measured). It also shows how a small move per iteration can hide a large remaining error.
- Limits of the test: a cylinder is developable and of constant curvature; real curvature, seams, elastic and welded sleeves are absent. It says nothing of the rate on the real garment, whose reported final mean move of 0.019 mm is about 100× the 0.0002 mm or smaller that the tube reached at 240.

### Gaps
- Pipkin 1986, Steigmann 1990 and Montes et al. 2020 full texts were not obtained. For Montes I read only the [abstract](https://history.siggraph.org/?p=104289) and citing descriptions.
- I found no published study of tension-only membranes with friction absent that characterises where slack goes. The frictionless reasoning above is mine.
- No measured skin-to-knit friction coefficient suitable for leotards was found, so no value is given.
- The seed-dependence has not been tested on the real solver. The test is to solve the same block from two different seeds and compare.

## Contact: is tangent-plane attraction a fair stand-in for true non-penetration and friction, and is a precomputed lifted surface valid?

### Takeaway
Staying on a body surface has a direct precedent in skin-tight clothing design, so it is not invalid. The weakness is that our surface can pull as well as push, and its shape does not know the fabric's stresses. In hollows that decides the answer, and accepted methods let fabric lift off instead.

### Cited Findings
- **[ASSERTED, abstract]** Montes et al. model the flat cloth as embedded in the body surface, which "avoids explicit contact handling", and optimise for pressure and seam traction — [SIGGRAPH record](https://history.siggraph.org/?p=104289).
- **[TESTED, force only]** Vechev et al. add lift-off as an extra degree of freedom, with a one-sided penalty on a smooth implicit body: "taut material over the inner elbow lifts off under tension". Measured against simulated force: 5.5 vs 5.4 N and 10.8 vs 9.9 N, stated as within 10% (2D test, 10% deformation). Sliding is smooth because the body is smooth — [Vechev et al. 2022](https://ar5iv.labs.arxiv.org/html/2204.09996).
- **[TESTED, by the authors' stress tests]** IPC keeps trajectories free of intersection and inversion regardless of material parameters, step size, or deformation severity, up to 2.3M tetrahedra, with friction as a smoothed approximation that can be arbitrarily close to static friction — [Li et al. 2020 abstract](https://par.nsf.gov/servlets/purl/10170679); [supplement](https://cims.nyu.edu/gcl/papers/2020-IPC-A-Technical.pdf).
- **[ASSERTED]** Learned garment methods also use soft penalties: HOOD uses a cubic penalty below a distance threshold and a tangential friction term — [HOOD Sec. 3.3](https://arxiv.org/html/2212.07242v3). So a penalty is not by itself unusual outside IPC.
- **[TESTED]** Laplace's law gives pressure but not body or cloth deformation — [PolyU thesis](https://theses.lib.polyu.edu.hk/handle/200/6473?mode=full). In 23 patient arm scans, average maximum subgarment pressure was 5100 Pa against 2500 Pa intended — van Loon et al. 2018, seen only in a search summary; the link is the likely record and was not opened: [Swansea record](https://cronfa.swansea.ac.uk/Record/cronfa47969/Details). FEM with a compressible limb analogue beat Laplace predictions — [J. Wound Care](https://ro.uow.edu.au/test2021/11111); simulated stocking pressure agreed with measurements — [Ye et al. 2023](https://doaj.org/article/83deeff9228e43648e5eeb842ca78c61). Abstract-level reads only; metrics not verified.
- **Project context:** the lift surface is a one-off outward-only membrane offset solved per body, with `LIFT_MAX = 0.03` m; the note observes that published skintight summaries do not address bridging — [fabric-bridging note](../../knowledge/engineering/geometry/fabric-bridging-hollows.md).

### Inferences
- **The constraint is two-sided.** `w n n'(p−q)` pulls fabric onto the plane from either side. Contact can only push, so where the solved tensions want to lift off, the model applies suction instead. This is not a true-contact model.
- **Free test available now.** The normal force at each point is `PLANE·n·(p−q)` before the final snap. Its sign shows where fabric is being pulled onto the surface, which would mark where the surface is wrong for that garment. This needs no new physics.
- **Expected errors by location (reasoning, not measured).** In an unsupported span there is no pressure, so T₁κ₁ + T₂κ₂ = 0 (standard membrane balance). So a true bridge's shape depends on the *ratio* of the two tensions and where the span is anchored, and not on overall tension for a rigid body.
  - **Small of the back:** curvature is strongly unequal in the two directions, so the shape and the lift-off line should shift with the across-to-along stress ratio, which varies with size and cut.
  - **Seat cleft and inner thigh:** spans are narrow and the fabric's stresses can be strongly directional, so a surface computed without them is at most an estimate. Whether the span bridges at all depends on whether cross-tension exists; a slack cross direction in the real garment would allow the fabric to dip.
  - **Between the two thighs and around the crotch:** both tension paths are short and a friction-free solve can slide fabric along them, so error should be largest here. The elastic edge's forces are also estimates (`ELASTIC_K`, per the code comment).
- **Validity of the precomputed surface.** It is defensible as an approximation where tension is similar in all directions and the body is firm, for example over bone. It is not valid in principle where one direction is slack or the pattern changes the ratio markedly: then fit depends on the surface and not the pattern. Its effect is that different patterns may give similar shape in hollows when real fabric would differ.
- **Soft tissue.** A rigid surface ignores flesh compressing, which a real leotard does (the arm-scan and limb-analogue work above shows the pressure and shape effects). The size for a leotard was not sourced.
- IPC would remove penetration and give a defined friction law. For shape accuracy of a tight garment, the first-order gains are likely one-sided contact, lift-off and friction, not IPC's guarantees as such. This is a judgement, not a measured result.

### Gaps
- No published error figure was found for a precomputed lifted surface against a tension-coupled solve, or for any concavity specifically (small of back, cleft, inner thigh). This is the project's own question to measure.
- Codimensional IPC for thin shells (the version relevant to cloth) was not read. Its thickness treatment is not reported here.
- No size of soft-tissue indentation under leotard-level tension was found.

## Mesh resolution: what wrinkle or feature size does 7 mm resolve, and what do locking and mesh dependence do?

### Takeaway
7 mm cannot show fine wrinkles and may produce false coarse ones, but a tension-only model is built not to need them. Locking should be mild because compression is free, though it can still act where fabric is taut in both directions. Mesh refinement is the only way to learn how much this matters for us.

### Cited Findings
- **[ASSERTED, with figures]** "If a shell would wrinkle at a frequency higher than can be resolved by the tessellation, the coarse-resolution simulated shell will buckle, but at an aliased frequency much coarser than the physically-correct wrinkle features"; meshes "with hundreds of thousands of vertices can be required" for accurate wrinkles — [Chen et al. 2021, Sec. 1, Fig. 2](https://par.nsf.gov/servlets/purl/10333495).
- **[ASSERTED]** Since the tension-field solution holds only low-frequency features, "it remains accurate even for very coarse discretizations" — [Chen et al. 2021, Sec. 4.1](https://par.nsf.gov/servlets/purl/10333495). They show about 1.4k degrees of freedom for a dress; their accuracy comparison is described as qualitative.
- **[ASSERTED]** Buckling models need fine meshes, as the wrinkle scale "is frequently inconsistent with that of a finite element, leading to a mesh-dependent solution" — [arXiv 2403.13746](https://arxiv.org/html/2403.13746v2).
- **[PROVED as constraint counting]** Membrane locking is "artificial stiffening of bending modes due to the inability of discrete kinematics to reproduce exact isometries". Edge constraints number about 3|V| against 3|V| degrees of freedom. "An irregular mesh with inextensible edges will not bend no matter how fine" — so the effect does not disappear with refinement for edge-length models — [Chen, Kry, Vouga](https://ar5iv.labs.arxiv.org/html/1911.05204).
- **[ASSERTED]** Triangle-based strain limiting locks unless the material is "sufficiently compliant when under the strain limit". "There is no free lunch between excessive in-plane strain, and membrane locking" — [Chen, Kry, Vouga](https://ar5iv.labs.arxiv.org/html/1911.05204).
- **[ASSERTED]** Weakening compression offers "alleviation of membrane locking" — [Chen et al. 2021, Sec. 2](https://par.nsf.gov/servlets/purl/10333495). Secondary reports: English and Bridson's midpoint attachment avoids locking but adds spurious modes — [arXiv 1911.05204](https://arxiv.org/pdf/1911.05204); B-spline elements reduce locking without removing it — [arXiv 2506.18867](https://arxiv.org/pdf/2506.18867).
- **[PROVED as a scaling; TESTED with revision]** Cerda-Mahadevan wavelength: λ ~ (Y/T)^(1/4) L^(1/2) t^(1/2). Simulations support the B/T dependence; the length exponent may change for long sheets — [Xin and Davidovitch 2021](https://ar5iv.labs.arxiv.org/html/2012.13051).
- **[ASSERTED]** Bouaziz's continuum element claims better independence from tessellation than PBD edge constraints (Fig. 5, qualitative) — [Bouaziz 2014](https://users.cs.utah.edu/~ladislav/bouaziz14projective/bouaziz14projective.pdf).

### Inferences
- **Hard limit (sampling, my reasoning).** Spacing of 7 mm cannot represent any wave shorter than 14 mm. A practical rule of about 4-6 elements per wave means features under about 30-40 mm are poorly shaped. The surface in hollows has the same limit: a seat cleft narrower than about 14 mm cannot exist in the mesh's contact. Our cut edges are also limited, as the wrap note records.
- **Wrinkle size (rough estimate).** With L = 100 mm, t = 0.5 mm and strain 0.1, the scaling gives about 13 mm times an unknown prefactor of order one to a few. So 7 mm is at or below what is needed for those wrinkles. The formula assumes a thin isotropic sheet; knit bending stiffness is not Y t², so treat this as order-of-magnitude.
- **Curvature error (my arithmetic).** An edge of length h on radius r reads short by about h²/(24r²). At h = 8.4 mm (7 mm at 1.2 stretch): r = 100 mm gives 0.03%, r = 30 mm gives 0.33%, r = 10 mm gives about 3%. So stretch figures are unaffected by faceting except at the tightest curves, such as the underarm.
- **Locking in our setting.**
  - Compression at no cost should reduce locking wherever one direction is slack.
  - Where both directions are at or above 1, as much of a leotard is, triangles have little freedom, and Chen, Kry and Vouga's reasoning applies. The fabric is being asked to match a doubly curved surface, so locking appears as stretch spread unevenly along mesh lines rather than as resisted bending.
  - Because the stiffness is a fit value on a rigid surface, its visible effect is mesh-direction patterns in stretch. These can be seen by re-solving with a rotated or jittered mesh.
- **No aliased buckling in our solver.** With points held to the surface there is no out-of-plane freedom, so false coarse folds in Chen's sense cannot form. The price is no wrinkles at all, and slack shows only as a compressed value.
- **Test.** Solve at 7, 5 and 3.5 mm, and with a rotated grid. If stretch and positions change by less than the project's gate (3 mm at 95%), 7 mm is adequate for coarse fit.

### Gaps
- The Cerda-Mahadevan prefactor could not be confirmed from primary text. Thin-sheet results may not suit a knit.
- I found no study of locking specifically for one-sided ARAP on near-equilateral meshes, or a measured grid-independence result for skin-tight membrane fit.
- English and Bridson 2008 and Thomaszewski 2009 were read only through citing papers.

## Poses: reusing a rest-pose fit via skinned or surface coordinates against re-solving

### Takeaway
Reuse is the accepted baseline for tight clothing and the accepted way to get fast results, but published work treats it as a starting point and adds a correction. No paper measures our exact scheme (host-triangle coordinates) against a re-solve. Our own numbers show the strain that it carries is the skin's, not the fabric's.

### Cited Findings
- **[ASSERTED]** Skinning alone assumes cloth moves with the body: "a practical but clearly over-simplifying assumption" — [TailorNet](https://ar5iv.labs.arxiv.org/html/2003.04583).
- **[TESTED against simulation]** Learned pose-dependent displacement: mean per-vertex error 10.1 mm for a tight fit and 14.5 mm for a loose fit (MLP, Table 2). Across 20 models the mean is 8.04 mm, with 6.56-14.50 mm range — [TailorNet](https://ar5iv.labs.arxiv.org/html/2003.04583). These errors are against a simulator, not against real garments.
- **[TESTED]** Accurate predictions in that sense can still be "overly smooth lacking realism" — [TailorNet](https://ar5iv.labs.arxiv.org/html/2003.04583). So a low millimetre figure does not mean visually correct.
- **[ASSERTED; perceptual test]** HOOD uses StVK, bending, a body-collision penalty and friction. Skinning-based learning is limited for loose garments, and SNUG is limited to tight fits. In a perceptual study (30 participants, 8 sequences) HOOD was usually preferred to SNUG and SSCH, and about equal against ARCSim. It gives no numerical error against SNUG — [HOOD](https://arxiv.org/html/2212.07242v3).
- **[ASSERTED]** SNUG trains on physics terms without ground truth, reporting two orders of magnitude faster training and qualitative parity — [SNUG abstract](https://arxiv.org/abs/2204.02219v1). The StVK and tight-garment detail come from a [secondary review](https://liner.com/review/snug-selfsupervised-neural-dynamic-garments) and HOOD.
- **[TESTED against simulation; different garments and motions]** Mean vertex error 2.93 cm for SSCH and 2.69 cm for a later method — [Neural Garment Dynamics](https://arxiv.org/pdf/2407.06101).

**Project's own data** — [wrap note](../../knowledge/engineering/app/wrapping-a-flat-block-onto-the-body.md), run 2026-11-01:
- Standing rest pose: front across, median 1.16, 2nd-98th percentile 1.00-1.40.
- Back-arched pose: front across 1.26 [0.59-1.95].
- Passé pose: back across 1.03 [0.44-1.39].
- The note itself says these ranges are "the skin's own deformation carried onto the cloth, not cloth behaviour".
- Re-solve differences for cuts: scoop 3.5 mm, `HIGH HIPS` 9.1 mm, cuff 7.7 mm at 95%.

### Inferences
- Surface coordinates give no sliding by construction, so fabric strain equals skin strain in every pose. Real fabric slides and redistributes tension, so the error is greatest at flexing joints: hip fold, armpit, and groin in passé or lunge.
- **Likely size (judgement, not measurement).** The published learned methods, after training, still have about 7-15 mm error against simulation. Raw reuse without correction cannot be expected to do better. The project's re-solve differences for cuts (up to about 9 mm at 95%) are the same order. A pose difference is plausibly equal or larger.
- Values such as 0.44 and 1.95 are outside what the model's own clamp allows and what fabric would hold. They can be read as a flag marking where a pose re-solve is needed.
- A re-solve would be subject to every limit above, including seed dependence. The rest fit is a good seed, but it passes on its own slack.
- The millimetre test is incomplete on its own: TailorNet shows lower error does not ensure looks right, so a pose check should compare strain and pattern lines as well.

### Gaps
- No published direct comparison of body-surface coordinates against a re-solve on tight garments was found. **The project can run this:** re-solve at `back-arched` and `passe`, seeded from reuse, and report position and stretch differences.
- No published error for skinning alone was found in the abstract-level or section-level material read. HOOD's and SNUG's own tables for tight garments were not obtained.

## Verification practice: standard benchmarks and validation for cloth simulators

### Takeaway
There is no accepted single benchmark for skin-tight garment fit. Common drape tests measure bending and loose drape, and say little about stretch. What applies to us is analytic membrane cases, measured tensile curves, interface pressure, and measured strain on a worn garment. A grid drawn on a real garment is likely to be the most direct test.

### Cited Findings
- **[ASSERTED, with the method's design]** The Cusick drape test correlates weakly with stretch properties, so Ju et al. take stretch parameters from tag information and only bending from drape — [Ju et al. 2024](https://diglib.eg.org/handle/10.1111/cgf15027). This makes it a weak check for a tight, stretch-driven garment.
- **[TESTED, visual]** Commercial tools are checked by simulated against real Cusick drapes, by images: [CLO3D study](https://proc.3dbody.tech/papers/2019/19126psikuta-abs.pdf); [VStitcher study](https://sciforum.net/paper/view/17880).
- **[TESTED]** A Kawabata-based mass-spring model against stereo capture of real cloth gave a best average error of 2.3-3.5 mm, about 1.5% of patch size — [Bottino et al. 2001](https://cgvg.polito.it/vdrape.html).
- **[TESTED]** Fabric drape is highly variable, with no single configuration to target, and methods of evaluation against a specific drape "have not been developed" — [Kenkare and Lamar 2008](https://mae.ncsu.edu/wp-content/uploads/sites/17/2016/08/JTIPart12008.pdf). This is useful in setting a realistic tolerance, as real fabric does not repeat exactly.
- **[TESTED, against analytic and experimental results]** Membrane wrinkling benchmarks:
  - pre-tensioned membrane in in-plane bending vs the Stein-Hedgepeth analytic solution;
  - square membrane under corner loads vs Wong and Pellegrino's experiments;
  - square airbag inflation;
  - hanging blanket.
  All used in [arXiv 2403.13746 Sec. 5](https://arxiv.org/html/2403.13746v2).
- **[TESTED, qualitative]** Chen et al. compare to physics experiments and full shell solvers, claiming qualitative agreement — [Chen et al. 2021](https://par.nsf.gov/servlets/purl/10333495).
- **[TESTED, force]** Vechev et al. compare measured and simulated force on a garment sample, within 10% — [Vechev et al. 2022](https://ar5iv.labs.arxiv.org/html/2204.09996).
- **[TESTED, data quality only]** GarmentCodeData filters drapes, but does not validate them against real garments in the sections read. It uses an XPBD simulator (Warp), a 5-minute and 2400-frame limit, a failure if static equilibrium is not reached, and counts of cloth-body and self-collision edge intersections. About 72% of samples pass — [GarmentCodeData Sec. 3.4](https://arxiv.org/pdf/2405.17609v3). Material values were "chosen manually".
- **[TESTED, a robotics context]** RGBench pairs measured real garments with a sim-to-real protocol and reports 20% lower error than other simulators — [Hu et al.](https://arxiv.org/html/2511.06434). Treated as adjacent evidence only.
- **Learned methods' "truth"** is typically another simulator; see the TailorNet and HOOD entries in the previous section.

### Inferences
Fitted to our solver, a realistic ladder from cheapest upward (my proposal):
1. **Internal convergence.** Run ×10 iterations, and report force residual and energy, not move size. Compare positions to the 240-iteration result.
2. **Seed independence.** Solve from two seeds. This directly measures the slack problem found in the toy.
3. **Analytic cases.** A tube on a cylinder at known stretch (done here, passes in tension). Add a cone and a sphere cap, where tension field solutions exist, or the Stein-Hedgepeth case for wrinkled-region extent.
4. **Grid and mesh independence.** 7, 5 and 3.5 mm, and a rotated grid.
5. **Reference solver.** Compare to a converged simulator with true contact and friction on the same body and pattern, such as a Newton solver, ARCSim or IPC, as in Liu's and Chen's practice. This would measure the friction and lift-off error.
6. **Physical test.** Print a grid on a real leotard, photograph it on a person in several poses, and compare strain and line position. Add tensile-test curves for the fabric, and optionally interface pressure sensors, which the compression-garment work uses. This is the only step that tests reality, and the only one that could rate the 0.5 floor or the across/along differences.

Overall judgement for the writer:
- This method class should give a credible **coarse fit in regions taut in at least one direction**: positions and stretch to perhaps several millimetres to a centimetre, judged by the project's own re-solve differences and neighbouring published error levels. This is an estimate, not a demonstrated bound.
- It cannot be relied on for:
  - the location and amount of slack;
  - shape in hollows governed by the precomputed surface;
  - pressure or absolute tension;
  - pose strain.
- These limits come from the model. More iterations will not remove them. They can be improved through solution selection (weak bending, gravity or a small residual stiffness), one-sided contact with lift-off, and friction.

### Gaps
- Numeric simulator-against-measurement errors for tight garments specifically were not found. Most published comparisons are visual or concern draped fabric.
- Kawabata measurements were found only as parameter inputs. No study was found using them as an accuracy benchmark for stretch garments. Clyde, Teran and Tamstorf's woven-fabric work did not surface in search and was not read.
- I could not identify the "Bartels" reference in the brief.
- GarmentCodeData's Sec. 4 onward was only keyword-searched. It might contain further checks.
