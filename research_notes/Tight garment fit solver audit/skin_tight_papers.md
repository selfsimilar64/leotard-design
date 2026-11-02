# Simulating and designing skin-tight stretch garments: what the literature says must be modelled

Evidence tags used on every finding. Access: **[FT]** full text read directly; **[FT-S]** full text read through an automated page summariser, so numbers are likely right but were not checked against the page by eye; **[ABS]** abstract or repository record only; **[SN]** search-result snippet only; **[SEC]** secondary report of the paper. Claim type: **(tested)** measured or simulated result in the paper; **(asserted)** the authors' statement with no supporting measurement in the paper. "My calculation" and "my observation" mark anything I derived rather than read.

## What must be modelled to get a tight garment's fit right, and how much does each thing matter?

### Takeaway
The only quantified effect sizes come from pressure and tissue-displacement studies, not from fit-error studies: treating the body as rigid gave 33% pressure error against about 9% with region-tuned soft skin (one abstract), and tissue moves 6 to 9 mm at the hip but under 1 mm at the calf. No paper ablates all the factors on one garment, so the ranking below is my synthesis. No paper reports geometric fit error against a scanned tight garment on a real body in general form.

### Cited findings
- Soft versus rigid skin, pressure-prediction error against sensors: rigid 33.20%, flexible uniform 17.72%, flexible with region-specific retention factors 8.92% (tested; [ABS], experimental set-up not visible) — [Tao, Zhu, Li 2026, IJCST](https://www.emerald.com/ijcst/article/doi/10.1108/IJCST-08-2025-0135/1359836/A-virtual-skin-for-in-depth-modeling-of-body)
- Regional tissue displacement under compression leggings: hip up to 9.43 mm, calf 0.76 mm; pressure runs the other way, calf about 2158 Pa, lower hip about 1050 Pa (tested in simulation; [SEC], a PolyU digest of Li et al. 2026, J. Bionic Eng.; the digest describes no validation) — [PolyU digest](https://www.polyu.edu.hk/publications/innovationdigest/issue/202608/highlight/more-than-just-a-tight-fit)
- Within a soft leg, tissue stiffness changed displacement but not pressure: no significant pressure difference across 0.0014 to 0.0030 MPa (Sig. > 0.05; ΔP vs stiffness ρ = −0.19), while displacement fell with stiffness (ρ = −0.53) and rose with compression class (ρ = 0.46); three subjects, stockings only (tested; [FT-S]) — [Frontiers 2024](https://www.frontiersin.org/journals/bioengineering-and-biotechnology/articles/10.3389/fbioe.2024.1418047/full)
- Seam stiffening visibly changes shape: the same patterns simulated with stiff seams "exhibit clearly visible deformations around the seams" on a sphere; re-optimising with seam stiffness recovers the target. Figure only, no number (tested in simulation; [FT]) — [Montes et al. 2020](https://users.encs.concordia.ca/~stpopa/res/img/publications_info/2020/Skintightclothing/Runway_SIGGRAPH2020_New.pdf)
- Fabric data sets the error in CAD pressure. CLO3D overestimated pressure by up to 10 kPa above 15% strain on eight knits, mainly plaited structures (tested; [SN]) — [Applied Sciences 2024](https://www.mdpi.com/2076-3417/14/22/10697). CLO3D underestimated by over 9 kPa at the chest on a swimsuit, and gave identical values for nylon and polyester, which the authors blame on missing material data (tested; [FT-S]) — [PLoS One 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12588493/)
- Realistic fit prediction "requires accurate material properties of both garments and the human body," and these distributions cannot be reconstructed from imaging alone (asserted; [FT]) — [Harrison et al. 2018 (VitalFit)](https://proc.3dbody.tech/papers/2018/18184harrison.pdf)
- Montes et al. name the required ingredients as large nonlinear deformation, tight cloth-body contact and body deformation (asserted; [FT]) — [Montes et al. 2020](https://users.encs.concordia.ca/~stpopa/res/img/publications_info/2020/Skintightclothing/Runway_SIGGRAPH2020_New.pdf)

### Inferences
My ranking for a tight-garment fit solver judged on appearance, from the evidence in this file. Not a ranking any paper gives.
1. **Compression-free membrane with real rest shape and in-plane stiffness.** Every credible method has it, and it is what produces taut, wrinkled and slack states at all.
2. **Soft tissue at the hip, thigh, buttock and bust.** Moves the silhouette by several millimetres and creates bulges at garment edges. Calf and ankle could stay rigid at the 1 mm level.
3. **Tangential sliding with friction.** Montes finds the pelvis is where tangential forces concentrate.
4. **Seam stiffness.** Visible near seams, unquantified.
5. **Per-pose solving.** Required for any pose other than the design pose, unquantified.
6. **Anisotropy.** Not ablated by anything I read. Montes uses isotropic cloth and lists anisotropy as an extension, while real elastane knits are direction dependent, so this is a known omission rather than a measured small effect.

### Gaps
- No paper removes these factors one at a time on one garment.
- I found no quantified anisotropy effect on tight-garment shape, though I did not search it specifically.

## What methods exist?

### Takeaway
Four families exist: graphics pattern optimisers (Montes 2020 is the only one that couples cloth to a deformable body), engineering FE studies of limbs, bras and leggings, commercial CAD with rigid or undisclosed soft avatars, and analytic Laplace or Boussinesq models. Graphics papers rarely validate physically; engineering papers validate pressure at a few points but rarely shape.

### Cited findings
- **Montes et al. 2020.** Cloth is a StVK membrane on constant-strain triangles, relaxed by tension field theory, embedded in the surface of a tetrahedral neo-Hookean body, so there is no collision handling and the cloth slides on a Loop subdivision surface. Solved with Newton, optimised with adjoint sensitivity and L-BFGS over boundary control parameters. Objectives cover shape, stretch range, pressure (Young-Laplace), seam traction and multi-pose sliding ([FT]) — [paper](https://users.encs.concordia.ca/~stpopa/res/img/publications_info/2020/Skintightclothing/Runway_SIGGRAPH2020_New.pdf)
- **Earlier tight-garment design, as Montes characterises it.** Kwok et al. 2016 search patch layouts by a heuristic distortion measure; Wang et al. 2008 and 2010 optimise patterns for prescribed pressure. Montes says its model differs by including body deformation and seam motion (asserted; [FT]) — [paper](https://users.encs.concordia.ca/~stpopa/res/img/publications_info/2020/Skintightclothing/Runway_SIGGRAPH2020_New.pdf). I could not reach the Wang and Tang full text — [record](https://bibsonomy.org/bibtex/0b35ccab4f6cc6cddeb4c43695710e00)
- **Vechev et al. 2022 (kinesthetic garments).** Compressible neo-Hookean relaxed membrane against an implicit STAR/SMPL body surface, with a one-sided penalty so the cloth can lift off, quasi-static L-BFGS, topology optimisation of reinforcement ([FT-S]) — [paper](https://ar5iv.labs.arxiv.org/html/2204.09996). The follow-up active-garment paper uses the same style of body as prescribed geometry and contrasts its lift-off with Montes ([FT-S]) — [Vechev et al. UIST 2022](https://ar5iv.labs.arxiv.org/html/2210.07689)
- **VitalFit.** Tetrahedral soft avatar with a "Sliding Thick Skin" layer in a non-linear hyperelastic (generalised Rivlin) material, elastically coupled to a sliding inner body, two-way coupled to the garment by minimising combined energy under contact constraints. Commercial authors, funded with lululemon's support ([FT]) — [Harrison et al. 2018](https://proc.3dbody.tech/papers/2018/18184harrison.pdf). The tissue model comes from [Pai et al. 2018](https://www.cs.ubc.ca/research/HumanTouch/HumanTouchSIGGRAPH2018.pdf) (download unreadable; only abstract-level information)
- **Dress Anyone 2024.** XPBD differentiable draping on a static A-pose body, Green-coordinate cage on the pattern, works on tight and loose. Soft tissue and multi-pose are listed as future work ([FT]) — [Chen et al. 2024](https://arxiv.org/pdf/2405.19148)
- **Wolff et al. 2023.** Alternates mass-spring-style simulation with rest-shape updates driven by stretch, cycling through 1 to 5 scanned poses; woven garments, not stretch ([FT-S]) — [arXiv 2102.05462](https://ar5iv.labs.arxiv.org/html/2102.05462)
- **Bra FE.** Sun et al. 2019: rigid torso, Mooney-Rivlin breasts from a 3D scan, contact FE including simulated donning ([ABS]) — [record](https://ira.lib.polyu.edu.hk/handle/10397/81580?mode=full). Liang et al. 2020: FE plus neural network surrogate for static contact pressure ([ABS]) — [record](https://ira.lib.polyu.edu.hk/handle/10397/94195?mode=full). Schmidt and Kyosev 2023: 4D scans with and without bra, three meshing approaches, solid mesh best captured deformation ([SN]; fetch returned 503) — [LS-DYNA paper](https://www.dynalook.com/conferences/14th-european-ls-dyna-conference-2023/composites-textiles/schmidt_tu_dresden.pdf)
- **Compression limb FE.** Frontiers 2024: LS-DYNA explicit, neo-Hookean incompressible leg, orthotropic elastic shell garment, friction 0.2, garment mesh 8 mm, leg mesh 7 mm ([FT-S]) — [paper](https://www.frontiersin.org/journals/bioengineering-and-biotechnology/articles/10.3389/fbioe.2024.1418047/full). Li et al. 2026: subject-specific MRI model with skin, bones and nine muscle groups, stiffness from in vivo indentation at hip, thigh and calf ([SEC]) — [PolyU digest](https://www.polyu.edu.hk/publications/innovationdigest/issue/202608/highlight/more-than-just-a-tight-fit)
- **Analytic.** Ye et al. 2025 predict leggings tissue deformation with Boussinesq elastic theory ([FT-S]) — [paper](https://www.frontiersin.org/journals/bioengineering-and-biotechnology/articles/10.3389/fbioe.2025.1632806/full). Laplace's law is the clinical default but cannot capture internal stress or clothing deformation (asserted; [SN]) — [PolyU thesis 2011](https://theses.lib.polyu.edu.hk/handle/200/5503)
- **Blender-level soft avatars.** Spring-mass soft body with dimensionless parameters, which the authors say cannot carry physical moduli (asserted; [FT]) — [Brake et al. 2022](https://cdatp.journals.qucosa.de/cdatp/article/download/82/55). A later add-on calibrates an Ogden model from 4D scans ([FT]) — [Brake et al. 2023](https://proc.3dbody.tech/papers/2023/2359brake.pdf)

### Inferences
- Montes' embedding is the closest published analogue to "cloth pinned to a body surface." Its strength is no contact handling; its documented cost is wrong behaviour in concave regions, covered below. A crotch is concave, so this applies directly to leotards.

### Gaps
- I found no published method that runs differentiable pattern optimisation on a soft body after Montes. Dress Anyone lists it as future work. My search for this was narrow, so absence is weak evidence.

## What did each study model, validate against, and how accurate was it?

### Takeaway
Montes, the reference method, has no physical validation at all. The best validated numbers are pointwise pressure errors of about 7 to 10% on limbs and bras. Commercial CAD pressure fails on absolute values, ranging from biased to no correlation with real wearers. Shape validation against scans exists but on one subject.

### Cited findings

| Study | Body | Garment | Validated against | Result | Tag |
|---|---|---|---|---|---|
| [Montes 2020](https://users.encs.concordia.ca/~stpopa/res/img/publications_info/2020/Skintightclothing/Runway_SIGGRAPH2020_New.pdf) | Tet neo-Hookean, E = 24.78 kPa, ν = 0.49 | t = 0.1 mm, E = 5.4 MPa pants, 30 MPa mask, ν = 0.33; one isotropic material | No sewn garment, sensor or scan. Pressure formula checked against analytic cylinder only (visually under the 15% colour clamp) | Objective reductions; seam traction force density improved 13%; "good accuracy" for shape is a visual claim | FT, simulation |
| [Frontiers 2024](https://www.frontiersin.org/journals/bioengineering-and-biotechnology/articles/10.3389/fbioe.2024.1418047/full) | Soft neo-Hookean plus rigid PLA legs, n = 3 | Stockings class I and III, linear orthotropic | PicoPress (±3 mmHg) on printed legs, 4 points | Mean deviation 7.45%; class I ρ = 0.73, class III ρ = 0.93. Prior FE studies 5.9% to 21.4% | FT-S |
| [Sun 2019](https://ira.lib.polyu.edu.hk/handle/10397/81580?mode=full) | Rigid torso, Mooney-Rivlin breasts | Underwire and wireless bra | Fitting experiment on underwire bra | Deformation and pressure relative error under 10%; wireless effect on deformation 3/5 of underwire | ABS |
| [Liang 2020](https://ira.lib.polyu.edu.hk/handle/10397/94195?mode=full) | Female subject FE | Sports bras | Skin pressure sensors | Numbers not in the record | ABS |
| [Ye 2025](https://www.frontiersin.org/journals/bioengineering-and-biotechnology/articles/10.3389/fbioe.2025.1632806/full) | Boussinesq analytic, n = 1 | 5 leggings | 3dMD scan | Overall deviation 1.15 mm static, 2.36 mm dynamic; rank order of garments differs between predicted and measured | FT-S |
| [Vechev 2022](https://ar5iv.labs.arxiv.org/html/2204.09996) | STAR surface | E = 0.5 MPa cloth, 5.7 MPa reinforced | Flat 2D force tests, not on body | 5.5 N vs 5.4 (2%); 10.8 N vs 9.9 (8%) | FT-S |
| [Vuruşkan and Ashdown 2024](https://gcris.ieu.edu.tr/entities/publication/807ba37d-13d3-4dbe-bfcd-3cd56a17c66e/full) | Scanned avatars | Cycling wear, 2 types, 4 sizes, 4 poses | Pressure on human subjects, 32 cases | "No correlation" actual vs virtual; useful for visual comparison only | ABS |
| [PLoS One 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12588493/) | CLO3D avatars | One-piece swimsuit, 80/20 blends | Mannequin with air-pack sensor, hourglass, 3 poses | CLO lower everywhere, chest gap over 9 kPa; relative pattern preserved | FT-S |
| [Applied Sciences 2024](https://www.mdpi.com/2076-3417/14/22/10697) | Scanned manikin | 8 knits at 5 to 20% strain | Sensors, 0.13 to 2.59 kPa | CLO overestimates, up to 10 kPa above 15% strain; analytic CP model within 1.9 kPa | SN; direct fetch 403 |
| [Thermal Science 2020](https://thermalscience.vinca.rs/pdfs/papers-2020/TSCI2004357Z.pdf) | Arm | Compression sleeve | Experiment | "Good agreement," no number seen | SN |
| [UOW limb analogue](https://ro.uow.edu.au/test2021/11111) | Compressible limb analogue | Compression bands | Measured pressure and deformation | FEM better than Young-Laplace and analytic; no number seen | SN |
| [Chen 2024 (Dress Anyone)](https://arxiv.org/pdf/2405.19148) | Rigid A-pose | Includes tight suit; the sewn test was a non-stretch T-shirt | Visual, one real shirt on scanned person | Mesh quality min 0.264 and average 0.944; no fit error given | FT |
| [Wolff 2023](https://ar5iv.labs.arxiv.org/html/2102.05462) | Rigid scan per pose | Sewn woven garments | Tailor-sewn, 6-user study | Fit rating M = 6.4 of 7; no geometric error | FT-S |
| [Harrison 2018](https://proc.3dbody.tech/papers/2018/18184harrison.pdf) | STS soft avatar | Sports bra | None shown | Rigid vs soft images only | FT |

- Frontiers 2024 reports conflicting tissue values between its Table 2 (S1 0.002040, S2 0.002976, S3 0.002750 MPa) and Section 2.5 (0.0034, 0.0050, 0.0046 MPa), as the summariser flagged ([FT-S]) — [paper](https://www.frontiersin.org/journals/bioengineering-and-biotechnology/articles/10.3389/fbioe.2024.1418047/full)
- Ye 2025's dynamic table reports sections 3 to 6 identical to prediction in one measured set, which should be checked before relying on it ([FT-S]) — [paper](https://www.frontiersin.org/journals/bioengineering-and-biotechnology/articles/10.3389/fbioe.2025.1632806/full)

### Inferences
- The swimsuit paper's mannequin readings of 20 to 46 kPa look implausible for real garment pressure. By my conversion 44 kPa is about 330 mmHg, whereas class III stockings measure about 20 mmHg (2.7 kPa) and leggings about 1 to 2 kPa. The authors label CLO's output "virtual kPa." Treat only its relative pose and region patterns as usable.
- The CLO3D bias has opposite signs across the two studies, consistent with a material-data problem rather than a fixed offset. CLO's own documentation warns its pressure is inside the fabric, not on the skin ([SN]) — [CLO docs](https://support.clo3d.com/hc/en-us/article_attachments/360083925513)
- Montes' tissue modulus of 24.78 kPa is roughly ten times the Frontiers 2024 values, which are 1.4 to 5 kPa. The two may parameterise differently, but a solver borrowing either should treat body stiffness as uncalibrated.

### Gaps
- No study I could read validates a full leotard, bodysuit or swimsuit shape against a scan of the worn garment.
- MDPI, Liang, Sun and Tao full texts were not accessible, so their conditions are limited to the above.

## Soft body: how much does flesh deform, how is it modelled, and what error comes from assuming rigid?

### Takeaway
Local surface movement under leggings is about 6 to 9 mm at the hip, 2 to 8 mm at the thigh and under 1 mm at the calf, but girth barely changes because tissue is incompressible and relocates. Rigid-body error is 33% vs 9% in pressure (one abstract), about 1% in girth (an unvalidated Blender test). I found no measured millimetre figures for crotch or bust, and none for rigid-body shape error against a real body.

### Cited findings
- **Hip.** Up to 9.43 mm under compression leggings, the largest of hip, thigh and calf; deformation falls from hip to ankle (FE, [SEC]) — [PolyU digest](https://www.polyu.edu.hk/publications/innovationdigest/issue/202608/highlight/more-than-just-a-tight-fit)
- **Hip, analytic.** Predicted about 6.4 mm at the high hip (Type 1); Ye et al. say sections 1 and 2 (hip) differ notably from measured, while sections 3 to 6 agree better ([FT-S]) — [Ye 2025](https://www.frontiersin.org/journals/bioengineering-and-biotechnology/articles/10.3389/fbioe.2025.1632806/full)
- **Thigh, measured by scan on one subject, Type 4 leggings, section 4 (predicted / measured, mm).** Posterior 5.23 / 8.24, anterior 4.31 / 5.60, lateral 4.7 / 5.73, medial 4.88 / 7.07. Six-section measured averages by garment 3.31 to 4.82 mm ([FT-S]) — [Ye 2025](https://www.frontiersin.org/journals/bioengineering-and-biotechnology/articles/10.3389/fbioe.2025.1632806/full)
- **Calf.** 0.76 mm in FE ([SEC]) — [PolyU digest](https://www.polyu.edu.hk/publications/innovationdigest/issue/202608/highlight/more-than-just-a-tight-fit). About 0.95 mm predicted ([FT-S]) — [Ye 2025](https://www.frontiersin.org/journals/bioengineering-and-biotechnology/articles/10.3389/fbioe.2025.1632806/full)
- **Stocking leg, circumferential displacement.** 3.61 ± 0.26 mm (class I, stiff) to 11.06 ± 1.36 mm (class III, soft) ([FT-S]) — [Frontiers 2024](https://www.frontiersin.org/journals/bioengineering-and-biotechnology/articles/10.3389/fbioe.2024.1418047/full)
- **Dynamic.** 60 Hz vibration on a platform as a proxy for running raised deformation to 14 to 16 mm at hip sections against about 6 mm at calf (Type 4, n = 1) ([FT-S]) — [Ye 2025](https://www.frontiersin.org/journals/bioengineering-and-biotechnology/articles/10.3389/fbioe.2025.1632806/full)
- **Real calf girth, 4D scan, one woman.** Natural vs −30% ease: 26.56 to 26.34 cm, 31.10 to 31.02 cm, 35.15 to 34.81 cm, 36.53 to 36.40 cm. At −10% and −20% some sections rose slightly. Authors attribute the rises to incompressible tissue moving, and warn water balance can change calf girth by centimetres, which exceeds the signal (tested; [FT]) — [Brake et al. 2023](https://proc.3dbody.tech/papers/2023/2359brake.pdf). Its simulation falls steadily where reality went up and down. Its Table 2 λ values of about 2.0 do not match its stated method of dividing circumferences (my observation)
- **Commercial soft avatar, no real comparison, VStitcher plus-size "Sofia," "soft" setting.** Hip 127.07 to 126.99 cm at −50% ease; thigh 71.83 to 72.59 cm; waist 100.83 to 102.73 cm at −30%; knee 43.44 to 42.76 cm at −50%. Tissue pushed up at the waist forms bulges. Cross-sections show "angular" glute and thigh deformation unlike real flesh. Model and parameters are undisclosed (tested in simulation; [FT]) — [Brake et al. 2024](https://cdatp.journals.qucosa.de/cdatp/article/download/126/116/1204)
- **Rigid vs soft on an identical pattern, Blender, leggings flattened from body with 20% width reduction.** Solid vs soft hip measures 910 vs 898 mm and 949 vs 940 mm; girth 90.204 vs 89.69 cm, 0.57%. Authors conclude the fabric stretches 1.3% and 0.8% further on the solid avatar, and that soft "gives a better result," with no real garment to back the latter; parameters are dimensionless ([FT]) — [Brake et al. 2022](https://cdatp.journals.qucosa.de/cdatp/article/download/82/55). The published 0.86% does not reproduce from 9 mm over 949 mm (my calculation gives 0.95%)
- **Rigid-body stress.** Rigid-avatar garment stress "may be less accurate since they do not account for the change in body shape," and rigid fit "can fail to predict the shape of the breast" under a tight sports bra. Shown by images, no numbers (asserted; [FT]) — [Harrison et al. 2018](https://proc.3dbody.tech/papers/2018/18184harrison.pdf)
- **Textile elongation on rigid avatars.** Textile shows higher elongation in fit check than in reality (asserted, citing Kaiser 2019; [FT]) — [Brake et al. 2022](https://cdatp.journals.qucosa.de/cdatp/article/download/82/55)
- **Tangential skin motion.** Skin and soft tissue are thin in many regions "with significant sliding behavior," modelled in STS as a volumetric layer sliding on the inner body ([FT]) — [Harrison et al. 2018](https://proc.3dbody.tech/papers/2018/18184harrison.pdf)
- **Models in use.** Neo-Hookean (Montes; Frontiers 2024), Mooney-Rivlin (Sun 2019), generalised Rivlin (VitalFit), Ogden (Brake 2023), linear elastic with rigid bones (Kaiser, cited in Brake 2022). Rigid torso with soft breast only is common in bra FE ([ABS]) — [Sun 2019](https://ira.lib.polyu.edu.hk/handle/10397/81580?mode=full)
- **Body shaping limit.** Montes: physically feasible body deformations are "fairly constrained," volume change cannot be achieved, and small silhouette changes need large pattern changes (tested in simulation, shown in figures, Fig. 4 shapewear pants; [FT]) — [Montes et al. 2020](https://users.encs.concordia.ca/~stpopa/res/img/publications_info/2020/Skintightclothing/Runway_SIGGRAPH2020_New.pdf)
- **Region-specific tissue tethering matters.** Moving from uniform to region-specific retention halves error, 17.72% to 8.92% ([ABS]) — [Tao et al. 2026](https://www.emerald.com/ijcst/article/doi/10.1108/IJCST-08-2025-0135/1359836/A-virtual-skin-for-in-depth-modeling-of-body)
- **Soft-avatar accuracy unknown.** Brake et al. report CLO3D and VStitcher soft avatars have unknown mechanics and "angular and unnatural deformations under strong pressure" ([FT]) — [Brake et al. 2023](https://proc.3dbody.tech/papers/2023/2359brake.pdf)

### Inferences
- **Size of the strain error.** By my calculation, a real 5 mm mean inward move around a 900 mm hip would be about 31 mm of girth, or 3.5% strain. Against 30% design stretch that is a modest but visible error. Peak figures such as 9.43 mm are not uniform, and the girth data above say tissue mostly relocates, so 3.5% is an upper-end case. Real girth change may be near 1%.
- **Local vs global.** The evidence separates two quantities that are easily conflated. Local surface displacement is several millimetres at the hip, but girth change is about 1% or less. A rigid body might therefore get average fabric strain roughly right while getting the local silhouette, garment-edge bulges and strain distribution wrong.
- **Pressure and displacement are not interchangeable.** Pressure peaks at low-radius, stiff regions (calf); displacement peaks at high-radius, soft regions (hip), consistent with Laplace's law plus tissue compliance. A rigid-body pressure map cannot be converted into shape correction without region-dependent stiffness.
- **The pressure findings can be reconciled.** Frontiers 2024 finds pressure insensitive to stiffness, while Tao finds it very sensitive to rigid vs soft. The first varies stiffness over a narrow range on a limb; the second compares rigid against soft on the torso or a broader setting. I could not confirm Tao's setting.

### Gaps
- **Crotch:** no mm figures, no rigid-vs-soft error, no validated model. The PolyU model's stated indentation sites are hip, thigh and calf.
- **Buttock specifically:** Ye 2025 has no buttock section; the closest is the posterior thigh section. Li et al. 2026 full text is not read and might have gluteal data.
- **Bust:** Sun gives relative error only; no mm displacement found in what I could access.
- **Rigid vs soft against a real worn-garment scan:** none found. The Brake rigid-vs-soft figures are simulation against simulation.
- Regional stiffness numbers from Pai et al. 2018 could not be read: the downloaded PDF was invalid.

## Pre-tension and rest shape: how is negative ease handled, and how does strain compare with geometric flattening?

### Takeaway
Negative ease is not a separate parameter. It emerges from a rest pattern smaller than the body, usually starting as a uniformly scaled geometric flattening which physics then corrects. Published design strain is about 30% circumferential with a 10 to 40% spread. I found no paper that compares strain from ARAP or similar flattening with FE strain on the same tight garment.

### Cited findings
- Montes starts every result from patterns "computed with a geometric flattening method" (ABF++) and scaled down, specifically to avoid slack elements at the start. Rest state is then just the 2D pattern ([FT]) — [Montes et al. 2020](https://users.encs.concordia.ca/~stpopa/res/img/publications_info/2020/Skintightclothing/Runway_SIGGRAPH2020_New.pdf)
- Montes targets: pants start at "about 30% stretch along the circumference"; running pants prescribe 30% circumferential; wetsuit uses 30% target on four bodies with a 10 to 40% stretch colour scale, with λmin and λmax as a penalty band and the λmin bound used in all examples ([FT]) — [same paper](https://users.encs.concordia.ca/~stpopa/res/img/publications_info/2020/Skintightclothing/Runway_SIGGRAPH2020_New.pdf)
- Dressing is not modelled. Montes states it bounds stretch once worn but does not consider deformation while donning, which it says can matter for tight stiff fabrics (asserted; [FT]) — [same paper](https://users.encs.concordia.ca/~stpopa/res/img/publications_info/2020/Skintightclothing/Runway_SIGGRAPH2020_New.pdf). Sun 2019 by contrast simulates closing straps and band then adjusting by "virtual hands" ([ABS]) — [record](https://ira.lib.polyu.edu.hk/handle/10397/81580?mode=full)
- Engineering practice: LSCM flattening of the body with near-zero compression, then the pattern reduced in warp by −10, −20, −30%, verified in CLO3D at 5 mm particle distance with seams ignored. The authors claim flattening "effectively guarantees a uniform distribution of pressure" (asserted, checked only in CAD; [FT]) — [Brake et al. 2023](https://proc.3dbody.tech/papers/2023/2359brake.pdf)
- Uniform reduction gives non-uniform result: with −10, −30, −50% ease on a leggings pattern on a rigid avatar, the white-shell preview looks fitted, while the fit maps redden with ease and show areas the authors call too tight or "about to tear"; the maps show nothing about cutting into tissue ([FT]) — [Brake et al. 2024](https://cdatp.journals.qucosa.de/cdatp/article/download/126/116/1204)
- Kosel-type flattening gives a more even enclosure of the body than conventional drafting, in 3D simulation only ([SN]) — [Kosel 2020](https://www.proc.3dbody.tech/papers/2020/2014kosel.pdf). Uniform ease from a body scan was found inappropriate in a 2013 flattening study ([SN]) — [Iowa State ITAA](https://iastatedigitalpress.com/itaa/article/17527/galley/15780/view). Grainline and anisotropy matter and are ignored by isotropic flattening (asserted; [SN]) — [Thai JERMUTT paper](https://ph01.tci-thaijo.org/index.php/jermutt/article/download/241992/164535)
- ARAP in practice: Wolff clips singular values above 1 + δ, δ = 0.1, then re-stitches modified rest triangles with as-rigid-as-possible, while compression is always allowed. This is for woven loose garments, so it removes tension rather than creating it ([FT-S]) — [Wolff et al.](https://ar5iv.labs.arxiv.org/html/2102.05462)
- Vechev: rest positions are copied from the body, giving zero energy at a chosen rest pose and no separate pre-stretch parameter ([FT-S]) — [Vechev et al. 2022](https://ar5iv.labs.arxiv.org/html/2204.09996)
- Dress Anyone: draped 3D meshes do not provide accurate rest shape because they already contain stretching and sag, and direct optimisation of pattern vertices gives noisy results ([FT]) — [Chen et al. 2024](https://arxiv.org/pdf/2405.19148)
- Montes on 2D pattern shape: seam traction optimisation while maintaining the initial stretch gives helical seams and a 13% traction force density improvement ([FT]) — [Montes et al. 2020](https://users.encs.concordia.ca/~stpopa/res/img/publications_info/2020/Skintightclothing/Runway_SIGGRAPH2020_New.pdf)

### Inferences
- The helical-seam result suggests very different patterns can reach similar stretch, so stretch alone may not pin down a pattern. This is my reading.
- From Montes' constitutive setup, with E = 5.4 MPa and t = 0.1 mm, membrane stiffness is about 540 N/m (my calculation). A solver can compare this directly with its own fabric values.
- Since all these start from flattening and then correct it, flattening appears to be accepted as initial guess rather than as a strain predictor. No paper says this outright.
- A uniform scale of a flattening cannot in principle produce the equilibrium strain field, because body curvature and tissue compliance vary by region, which is what the Brake 2024 tension maps show on rigid. That is my reasoning, not a tested comparison.

### Gaps
- No paper found directly compares ARAP, LSCM or ABF flattening strain with FE strain or measured strain (for example digital image correlation) on a tight garment. This is the clearest gap for this audit. A targeted search for digital image correlation on knit garments was not run.
- No validation of the "30%" design target against real garment strain was found.

## Where do wrinkles or slack appear on tight garments, and how do papers explain them?

### Takeaway
The accepted mechanical explanation is tension field theory: wrinkles appear when an element is taut in one direction yet compressed relative to its Poisson-equilibrium width. Slack is compression in both directions. Spatial evidence is thin and all simulated: concave regions, the pelvis under motion, near seams and edges. I found no study mapping wrinkles on real worn tight garments.

### Cited findings
- Three regimes in Montes: **slack** when λ2 ≤ λ1 < 1, energy vanishes; **wrinkled** when λ1 ≥ 1 and λ2 < λ̂2(λ1), stress in the minimum-stretch direction vanishes; **taut** otherwise. Here λ are squared principal stretches and λ̂2(λ1) = (2λ + 2μ − λ·λ1)/(λ + 2μ), using Lamé λ and μ ([FT]) — [Montes et al. 2020](https://users.encs.concordia.ca/~stpopa/res/img/publications_info/2020/Skintightclothing/Runway_SIGGRAPH2020_New.pdf)
- Rationale: fabric gives "very little resistance to compression and instead wrinkle immediately," and standard models wrongly resist compression equally. Slack elements also cause Hessian ill-conditioning. Montes calls wrinkles "design flaws" in tight clothing and uses a minimum-stretch objective to prevent them (asserted, then used; [FT]) — [same paper](https://users.encs.concordia.ca/~stpopa/res/img/publications_info/2020/Skintightclothing/Runway_SIGGRAPH2020_New.pdf)
- Concave regions: real cloth lifts off; Montes' embedded model instead pulls the body out, showing as negative pressure around the neck on the mask, remaining at the temples and cheek hollows after optimisation. "Not all cases can be resolved." Proposed fix is switching to a conventional cloth model where the cloth separates (tested in simulation; [FT]) — [same paper](https://users.encs.concordia.ca/~stpopa/res/img/publications_info/2020/Skintightclothing/Runway_SIGGRAPH2020_New.pdf)
- Vechev's model differs here: a one-sided penalty allows tight contact and lift-off, which it names as a difference from Montes, while citing Montes for the relaxed energy ([FT-S]) — [Vechev et al. 2022](https://ar5iv.labs.arxiv.org/html/2204.09996)
- Pelvis under motion: pants at 30% stretch with μ = 0.3, four running poses, show "substantial tangential forces" concentrated in the pelvic area, up to about 0.2 N on the scale, read as sliding rather than wrinkles; optimisation greatly reduces them ([FT]) — [Montes et al. 2020](https://users.encs.concordia.ca/~stpopa/res/img/publications_info/2020/Skintightclothing/Runway_SIGGRAPH2020_New.pdf)
- Convex underside: Wolff suggest draping could matter "in convex areas such as under the breasts," and report folds increasing with distance from initial pose (asserted; woven garments; [FT-S]) — [Wolff et al.](https://ar5iv.labs.arxiv.org/html/2102.05462)
- Garment edges: strong negative ease incises fabric, with bulges above the waistband at −30 and −50% ([FT]) — [Brake et al. 2024](https://cdatp.journals.qucosa.de/cdatp/article/download/126/116/1204)
- Crotch and inner hip: Brake 2024's tension maps show a distinct low-tension patch across the crotch and upper inner thigh that persists at −10, −30 and −50% ease on a rigid avatar. This is my observation from their Figs 1 and 2; the paper does not discuss it ([FT]) — [Brake et al. 2024](https://cdatp.journals.qucosa.de/cdatp/article/download/126/116/1204)

### Inferences
- Taken together, a persistent low-tension crotch zone fits the concave-region explanation: fabric bridges rather than presses into a saddle region, so increasing ease does not obviously clear it. This is my reading, on one rigid-avatar commercial simulation.
- Since λ̂2 depends on λ1, higher pull in one direction raises the transverse stretch needed to stay taut. So a strongly pulled leotard panel could wrinkle transversely despite being "tight," and more negative ease does not guarantee no wrinkles. This follows from Montes' equation, not a tested claim.
- A relaxed membrane predicts where wrinkling occurs but not the wrinkle geometry, unless the mesh and bending resolve them. None of the tight-garment papers read validates wrinkle shape.

### Gaps
- No physical wrinkle map on a real worn tight garment found, including at crotch, under bust, armhole or small of back.
- My one targeted wrinkle search returned nothing tight-garment-specific, so the lack is partly search limit.

## Fit across poses: do methods re-solve per pose, and how large is the error from reusing a standing fit?

### Takeaway
Methods that care about pose re-solve or adapt per pose, and Montes handles motion with a neutral-pose solution and a friction check. I found no paper reporting the error of reusing a standing fit. Indirect evidence says the changes are large: about 9% skin girth change at the knee and up to threefold simulated pressure change between poses at one region.

### Cited findings
- Montes' multi-pose objective solves one equilibrium at neutral pose, holds the resulting local coordinates s0, computes cloth positions in each target pose, then penalises tangential forces above the Coulomb limit. It does not re-equilibrate sliding per pose; it is a sliding penalty, not a fit prediction ([FT]) — [Montes et al. 2020](https://users.encs.concordia.ca/~stpopa/res/img/publications_info/2020/Skintightclothing/Runway_SIGGRAPH2020_New.pdf)
- Vechev: quasi-static equilibrium solved per pose over motions, with optimisation on one target pose and evaluation over sequence; the UIST version runs all poses in parallel on GPU ([FT-S]) — [Vechev et al. 2022](https://ar5iv.labs.arxiv.org/html/2204.09996); [UIST 2022](https://ar5iv.labs.arxiv.org/html/2210.07689)
- Wolff: cycles 1 to 5 scanned poses with direct mesh interpolation, specifically to capture soft-tissue and volumetric change. "The more poses the garment needs to fit tightly in, the less the garment can fit each individual pose," and the result depends on the pose sequence and initial pose. No numeric single-pose error (asserted; [FT-S]) — [Wolff et al.](https://ar5iv.labs.arxiv.org/html/2102.05462)
- VitalFit animates an inner body with the soft layer responding to the garment, re-simulating dynamics; only qualitative images ([FT]) — [Harrison et al. 2018](https://proc.3dbody.tech/papers/2018/18184harrison.pdf)
- Dress Anyone optimises only in A-pose, then animates, and lists multi-pose loss as future work ([FT]) — [Chen et al. 2024](https://arxiv.org/pdf/2405.19148)
- Simulated pose effect in CLO3D, swimsuit, kPa (virtual, relative only): triangle body abdomen T-pose 12.68, forward bend 38.12; apple abdomen overhead 26.28, forward bend 41.96; inverted triangle back T-pose 19.08, flutter 37.82; posture main effect F = 93.18. Mannequin hourglass back T-pose 19.80, overhead 32.60 ([FT-S]) — [PLoS One 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12588493/)
- Skin change with pose: yoga pants study, knee circumference about 9.1% with bending, calf and thigh 2.4 to 3.8%, waist and hip within about ±6% ([SN]) — [J. Eng. Fibers and Fabrics, doi 10.1177/1558925021990503, mirror](https://https-sage-cnpereading-com-443.webvpn1.xju.edu.cn/doi/10.1177/1558925021990503). Largest horizontal skin-length change at hip and thigh in 18 men across 4 postures ([SN]) — [JFBI](https://ojs.global-sci.org/index.php/JFBI/article/view/13033)
- CAD across poses: no correlation between virtual and real pressure in standing and cycling poses, 32 cases ([ABS]) — [Vuruşkan and Ashdown 2024](https://gcris.ieu.edu.tr/entities/publication/807ba37d-13d3-4dbe-bfcd-3cd56a17c66e/full)

### Inferences
- Montes reuses a neutral-pose solution only to detect sliding; so even the method closest to reuse does not claim the worn shape in another pose is correct.
- A skin change of about 6 to 9% is a sizable fraction of a 30% design stretch, so reusing a standing fit would misstate strain at moving regions by roughly a quarter, on my calculation. That is order-of-magnitude reasoning, not a measured error.

### Gaps
- No study quantifying standing-fit reuse error for a tight garment was found. This is the main unanswered item in this section.
- The Cornell lower-body surface-change data ([record](https://www.bodyscan.human.cornell.edu/current5.html)) and the Applied Ergonomics 2014 knee-flexion study ([record](https://www.peeref.com/works/119758)) were seen as snippets only; they could give leotard-relevant region numbers. A hip-flexion buttock strain figure is at [PMC figure](https://pmc.ncbi.nlm.nih.gov/articles/PMC2861146/figure/F4), not read.

## Fast or incremental re-fit after pattern edits: stated accuracy trade-offs

### Takeaway
Runtime is reported often and accuracy trade-off almost never. I found no paper that measures the accuracy lost by warm-starting or partial re-solving after a pattern edit. Only the coarse picture exists: full coupled optimisation takes hours, drape-based refit takes minutes per iteration, and fast commercial soft avatars show shape artefacts.

### Cited findings
- Montes: 4.66 to 22.3 s per iteration at 346 to 4160 iterations on an i7-5820K with 8 GB, per Table 1, convergence 10⁻⁶ unbalanced force and 10⁻³ objective gradient ([FT]) — [Montes et al. 2020](https://users.encs.concordia.ca/~stpopa/res/img/publications_info/2020/Skintightclothing/Runway_SIGGRAPH2020_New.pdf). By my calculation, wetsuit 1629 × 5.84 s ≈ 2.6 h; seam-traction pants 4160 × 5.87 s ≈ 6.8 h
- Dress Anyone: 1 to 5 minutes per iteration on a Threadripper PRO CPU, total typically stated as 5 to 30 minutes depending on mesh resolution. XPBD chosen for "fast and stable results," with no accuracy comparison. Body fixed in A-pose ([FT]) — [Chen et al. 2024](https://arxiv.org/pdf/2405.19148). The per-iteration and total figures imply very few iterations; treat them cautiously (my observation)
- Wolff: 1.70 to 7.82 fps; adapting a dress to two extra poses took about 2.8 minutes; omits cloth-cloth collision and friction, and cloth parameters are not measured ([FT-S]) — [Wolff et al.](https://ar5iv.labs.arxiv.org/html/2102.05462)
- Brake 2023: FEM "would be very time-consuming and cost-intensive" for clothing, and clothing tolerates minor deviations from reality, unlike medical or automotive (asserted; [FT]) — [Brake et al. 2023](https://proc.3dbody.tech/papers/2023/2359brake.pdf)
- Brake 2024: VStitcher soft avatar "computed very quickly," but produced angular shape errors and unknown physics ([FT]) — [Brake et al. 2024](https://cdatp.journals.qucosa.de/cdatp/article/download/126/116/1204)
- Liang 2020: 625 FE cases reduced to 25 by Taguchi to train a neural surrogate, "only a small difference" between FE and network by RMSE, static contact pressure only; number not in record ([ABS]) — [record](https://ira.lib.polyu.edu.hk/handle/10397/94195?mode=full)
- Wang 2018 argues techniques had not achieved both precision and efficiency and solves pattern adjustment as a single nonlinear optimisation; metrics not obtained ([ABS]) — [Wang 2018](https://history.siggraph.org/?p=100712)
- Umetani et al. 2011 use sensitivity analysis to predict the change in equilibrium under pattern edits, as summarised by Montes ([FT], secondary mention) — [Montes et al. 2020](https://users.encs.concordia.ca/~stpopa/res/img/publications_info/2020/Skintightclothing/Runway_SIGGRAPH2020_New.pdf). VitalFit claims fit is recomputed in "a few mouse clicks" after a pattern edit, no timing given (asserted; [FT]) — [Harrison et al. 2018](https://proc.3dbody.tech/papers/2018/18184harrison.pdf)

### Inferences
- Montes' adjoint formula needs the same matrix as the forward solve, so first-order prediction of a pattern edit's effect is available at the cost of one linear solve. That is an implication of its equations, not an accuracy result.

### Gaps
- No accuracy-versus-speed curve for incremental re-fit on tight garments was found. Umetani 2011 and Wang 2018 full texts were not read and may state some.
