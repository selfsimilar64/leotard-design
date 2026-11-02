# Measured mechanics of stretch knit fabric and garment elastic, for judging a fit solver

Read this first. Evidence grades used below:
- **Read in full** means I read the source text or its data directly.
- **Snippet only** means the page blocked direct reading (HTTP 403 or 410, or a bot check) and the claim rests on a search result summary. Treat those as leads.
- Numbers marked "my calculation" are derived by me from the cited values and do not appear in the source.

No source I could read gives a full force-against-strain curve in both course and wale for an 80/20 tricot. Figures carrying those curves are published (for example Figure 5 and Figure 8 of PMC8401858) but I could read only the tables.

## 1. Stress-strain: linear or not, numbers, hysteresis, relaxation, isotropy

### Takeaway
Up to the 10-45% stretch a garment sees, stretch knit force is roughly linear: secant stiffness changes by about 0-60% across that range, which is less than the differences between fabrics (about 3x) and between loading and unloading (about 2x). Typical working stiffness is 100-400 N/m per unit strain, or 1-4 N/cm at 100% extrapolated. The one swimsuit fabric with published directional data differs by about 2-2.7x between its two axes, so isotropy is a coarse approximation, not a harmless one.

### Cited Findings

**Tricot force data (the best public numbers found; read in full).** Four nylon/elastane warp knit tricots, tested per EN 14704-1 with a 50 mm strip, 100 mm gauge, 500 mm/min, five cycles, on an Instron; conditioned at 21 C, 65% RH — [Predicting Compression Pressure of Knitted Fabric Using a Modified Laplace's Law](https://pmc.ncbi.nlm.nih.gov/articles/PMC8401858/). The paper does not state whether strips were cut course or wale, nor whether stress comes from the loading or unloading branch. The source gives stress in kPa. The N/m and N/cm columns are my calculation (stress x thickness), and they reproduce the paper's predicted pressures, which confirms the thickness was used this way.

| Fabric | Nylon/elastane | g/m2 | Thickness mm | Strain | Stress kPa | Force per width N/m (my calc) | N/cm (my calc) | Secant stiffness N/m (my calc) |
|---|---|---|---|---|---|---|---|---|
| LB single-face tricot | 74/26 | 150 | 0.29 | 0.111 | 46.0 | 13.3 | 0.13 | 120 |
| LB | | | | 0.249 | 162.0 | 47.0 | 0.47 | 189 |
| DB double-face tricot | 58/42 | 200 | 0.39 | 0.111 | 55.1 | 21.5 | 0.21 | 193 |
| DB | | | | 0.249 | 118.0 | 46.0 | 0.46 | 185 |
| DB | | | | 0.429 | 225.5 | 87.9 | 0.88 | 205 |
| SW tricot 1x1 | 75/25 | 247 | 0.58 | 0.111 | 35.8 | 20.7 | 0.21 | 187 |
| SW | | | | 0.249 | 102.4 | 59.4 | 0.59 | 238 |
| SW | | | | 0.429 | 184.6 | 107.1 | 1.07 | 250 |
| TL tricot with pillar | 65/35 | 310 | 0.55 | 0.111 | 77.6 | 42.7 | 0.43 | 385 |
| TL | | | | 0.249 | 139.1 | 76.5 | 0.77 | 307 |
| TL | | | | 0.429 | 224.0 | 123.2 | 1.23 | 287 |

- That paper fits stress with a cubic polynomial as "the best fit" but assumes Hooke's law for its simple pressure model — [same source](https://pmc.ncbi.nlm.nih.gov/articles/PMC8401858/). Its LB row at 0.429 strain was cut off in what I could read.

**Swimwear fabric, second-cycle load (read in full).** Swimwear-oriented knits with a polyolefin elastic fibre (not spandex) and 50-94% polyester, nylon or polypropylene; 10 x 5 cm specimens, two cycles lengthwise to 36 N on an Instron at 400 mm/min. Load to reach 40% on the second cycle was 133-506 cN across examples 5-10 (one outlier at 15 cN), and elongation was 141-264% (one at 420%) — [US8074295](https://patents.google.com/patent/US8074295). Per width that is 0.27-1.01 N/cm at 40% (my calculation), so secant stiffness of 66-253 N/m. Comparing the 36 N point (7.2 N/cm, my calculation) gives secant stiffness of about 270-470 N/m at 150-260%, assuming the reported elongation is at the 36 N peak, so stiffening of about 2-4x by that strain (my calculation). This is the fabric's lengthwise direction only.

**Weft-knit course against wale, with hysteresis (read in full).** Polyamide/elastane plated single jersey (a weft knit, not tricot), 200 x 50 mm specimens, 100 mm clamps, 20 C, 65% RH, five cycles from zero to elastic limit T. The paper describes the curve as linear from 0 to T, then nonlinear and elastoplastic — [Impact of the Elastane Percentage on the Elastic Properties of Knitted Fabrics under Cyclic Loading](https://pmc.ncbi.nlm.nih.gov/articles/PMC9570736/).

| Fabric | Elastane % | Wale limit strain % | Wale force N/50 mm | Course limit strain % | Course force N/50 mm | HYI wale | HYI course | Unrecovered strain % wale | Unrecovered strain % course |
|---|---|---|---|---|---|---|---|---|---|
| NE | 0 | 21.8 | 3.70 | 32.3 | 2.90 | 0.181 | 0.204 | 4.3 | 6.6 |
| WE14 | 14 | 58.2 | 6.58 | 50.8 | 3.23 | 0.382 | 0.507 | 13.8 | 5.5 |
| WE16 | 16 | 90.2 | 11.26 | 64.6 | 7.29 | 0.385 | 0.547 | 31.1 | 1.1 |
| WE17 | 17 | 105.2 | 9.20 | 73.4 | 6.57 | 0.477 | 0.653 | 17.8 | 6.3 |
| CE32 | 32 | 95.3 | 15.91 | 65.4 | 9.20 | 0.598 | 0.625 | 14.8 | 6.8 |
| CE38 | 38 | 107.0 | 11.23 | 77.1 | 8.22 | 0.411 | 0.536 | 29.9 | 8.8 |
| CE43 | 43 | 119.2 | 10.17 | 87.3 | 7.57 | 0.437 | 0.565 | 33.0 | 7.0 |

- HYI is unloading force divided by loading force on the fifth cycle at half the elastic limit, so lower means more energy lost — [same source](https://pmc.ncbi.nlm.nih.gov/articles/PMC9570736/). The paper finds elastane percentage does not significantly change it.
- Cycling here goes to the elastic limit (58-119%), which is much further than garment wear strain, so these unrecovered strains are an upper bound for wear.

**Directional data for a real swimsuit fabric (read in full; the most useful single dataset).** "White Swim Solid", 87% nylon, 13% spandex, 0.204 kg/m2, usage listed as swimsuit, residual fit error 1.57 mm — [Wang, O'Brien, Ramamoorthi 2011, Table 1](https://escholarship.org/content/qt7g35q2x7/qt7g35q2x7.pdf). Fitted values from the ARCSim library file, a [GitHub mirror](https://raw.githubusercontent.com/jiongchen/arcsim/master/materials/white-swim-solid.json) whose density matches Table 1:

| Sample | c11 | c12 | c22 | c33 |
|---|---|---|---|---|
| Rest (zero strain) | 47.97 | 6.83 | 104.62 | 60.77 |
| Stretch along 0 deg | 40.37 | 23.09 | 169.67 | -24.68 |
| 22.5 deg | 40.29 | 48.14 | 138.26 | 9.00 |
| 45 deg | 51.39 | -32.97 | 79.88 | 35.97 |
| 67.5 deg | 51.50 | 1.87 | 63.69 | -37.54 |
| Stretch along 90 deg | 68.62 | 40.13 | 124.47 | 36.20 |

- Row meaning comes from the ARCSim source. Row 0 is copied to all angles and the other five rows are the five angles at the outer strain sample — [conf.cpp](https://raw.githubusercontent.com/jiongchen/arcsim/master/src/conf.cpp). The lookup reaches the outer sample at a stretch of 1/6 (16.7%), clamps negative values to zero, then **doubles all values** — [dde.cpp](https://raw.githubusercontent.com/jiongchen/arcsim/master/src/dde.cpp). The paper describes the outer sample as a principal strain of 0.2 and does not mention the doubling — [Wang 2011, Section 3.1](https://escholarship.org/content/qt7g35q2x7/qt7g35q2x7.pdf).
- ARCSim's energy uses Green strain, face rest area, and these stiffnesses — [physics.cpp](https://raw.githubusercontent.com/jiongchen/arcsim/master/src/physics.cpp). The paper's stress is the stiffness times the strain, so these are secant values — [Wang 2011, Eq. 1-3](https://escholarship.org/content/qt7g35q2x7/qt7g35q2x7.pdf).
- Wang tested 400 x 400 mm samples with up to 600 g on one edge and 400 g on each side, described as the range clothing normally experiences — [Wang 2011, Section 4.1.1](https://escholarship.org/content/qt7g35q2x7/qt7g35q2x7.pdf). Clyde et al. characterise such earlier work as small loads under 15 N/m — [Clyde 2017](https://www.math.ucdavis.edu/~jteran/papers/CTT17.pdf). 600 g over 400 mm is 14.7 N/m (my calculation).
- The authors note that highly compliant materials including White Swim Solid match their photos "somewhat less well", which they attribute to cloth memory and edge curl — [Wang 2011, Section 6.1](https://escholarship.org/content/qt7g35q2x7/qt7g35q2x7.pdf).

**Other evidence on anisotropy and hardening.**
- A competitive swimwear study reports biaxial tests showing direction-dependent stiffness that hardens with stretch, modelled as anisotropic hyperelastic, but its abstract gives no numbers — [JSME 2012](https://doi.org/10.1299/jsmeshd.2012.89).
- Directional claims conflict for weft knits: one snippet has course direction with the highest modulus, another has more stretch along wale — [snippet only: Materials 15(19) 6512](https://doi.org/10.3390/ma15196512) and [snippet only: Modeling polyamide/elastane compression sportswear](https://www.researchgate.net/publication/281972660_Modeling_the_mechanical_and_compression_properties_of_PolyamideElastane_knitted_fabrics_used_in_compression_sportswear).
- Nine warp-knit swimwear fabrics give structure data only: 80/20 PA/EL at 172-217 g/m2 and 0.50-0.66 mm, loop density coefficient 0.57-1.20, tensile test values shown in figures only. After 200 h seawater, wale breaking force fell 16.5%. This is breaking data, not working-range data — [Seawater and Sunlight as Critical Ageing Factors](https://pmc.ncbi.nlm.nih.gov/articles/PMC12692783/).

**Relaxation, growth and wash loss.**
- Instantaneous growth after 24 h at 15% strain: 4-13% across the US8074295 examples — [US8074295](https://patents.google.com/patent/US8074295).
- Pressure loss after 15 washes on a cylinder: 1.7-20% at 10% stretch, 2.9-10% at 20%, 1.7-4% at 30% — [PMC8401858](https://pmc.ncbi.nlm.nih.gov/articles/PMC8401858/).
- Fixed-elongation stress relaxation of about 4% (3.97% wale, 3.91% course) for 31% elastane polyamide compression fabric — [snippet only: Discover Materials 2025](https://link.springer.com/article/10.1007/s43939-025-00498-y). Duration not known to me.
- Elastic bandage fabrics: force drops fast in the first minute, slowly to 15 minutes, and keeps relaxing for 12 h to 5 days — [snippet only, bandage not garment](https://doi.org/10.1177/1534734620912093).
- Heat-setting raised load capacity 24-47%, then laundering cut it 6-32% — [Journal of Fiber Bioengineering and Informatics abstract](https://ojs.global-sci.org/index.php/JFBI/article/view/13138).

### Inferences
- **Direct comparison of the two sources.** Using ARCSim's doubled values and ignoring the other direction's force, White Swim Solid carries about 10 N/m at 10% and 13 N/m at 16.7% along its soft axis, and about 22 and 37 N/m along its stiff axis (my calculation). This sits in the same range as the tricot table's 13-43 N/m at 11%. Undoubled values would be half of that and below the tricot range, which is weak evidence that doubled values are the physically correct ones. Stiffness units are not stated in the paper; N/m is inferred from the SI density and consistent loads.
- **Anisotropy ratio for that fabric:** about 2.2x at rest and about 2.7x at 16.7% stretch, using effective uniaxial stiffness c11-c12^2/c22 and the converse (my calculation). The paper does not say which axis is course or wale.
- **Linear in stretch is reasonable for fit** up to about 40%, since the DB fabric barely changes and SW and LB rise by 30-60%, while TL falls by 25% (which suggests a soft-over-hard start in some fabrics rather than the usual J curve). The stiffening matters mostly past about 100%, which a leotard should reach only near edges.
- **Which number to use.** The largest modelling uncertainty is which branch the worn garment sits on. HYI of 0.38-0.65 implies the force on the unloading branch at half the limit is about half the loading force, and worn garments sit on an unloading branch after donning. This uses weft jersey data cycled well past wear strain, so wear strain hysteresis is probably narrower, by an amount I could not source.
- **Suggested defaults if the solver needs one fabric.** Secant stiffness of 200 N/m in the softer direction and 300-400 N/m in the stiffer direction (from the tables above), with a fabric-to-fabric range of 100-400 N/m. Expressed per unit strain and per width. This is a judgement from the data above, not a published parameter set.
- **Judging isotropy.** A 2x difference moves strain between directions noticeably, so it will shift how a seat or hip panel loads, while total pressure changes less. It is the cheapest physics to add among those in this note, since it needs only two moduli and a grain angle per panel.

### Gaps
- No full force-against-strain curve found in both course and wale for an 80/20 PA or PES tricot. PMC8401858 has curves in figures but gives no direction.
- Manufacturer data sheets (Invista LYCRA, Carvico, Sportek) with force at elongation were not found. My results were vendor marketing or lists without forces.
- Hysteresis at wear strain (10-40%) for tricot not found.
- Which Wang axis is course or wale is not stated. The file also contains negative and noisy values (c33 goes from 60.8 to -37.5), so individual off-axis entries are not trustworthy.
- ARCSim's doubling factor is not explained in the code summary I read or in the paper.

## 2. Measurement methods and published parameter sets

### Takeaway
ARCSim's library, from Wang 2011, is the only public parameter set found that includes a real swimsuit fabric. It only covers low loads, about 15 N/m, which is below the 20-100 N/m a tight garment carries. The more rigorous Clyde protocol uses standard tests that anyone with a tensile tester could repeat, but it has been published for woven fabric only.

### Cited Findings
- **Wang 2011:** piecewise linear orthotropic model with 24 stretching and 15 bending parameters per fabric. Stiffness is sampled over strain angle and principal strain up to 0.2. Fit by matching photographed sample shape from 35 tests per sample (105 per fabric). Typical error 1-3 mm on a 400 mm sample. Linear isotropic is measurably worse than piecewise, and leaving out Poisson effects is also worse. Stated limitations include small deformation only, no cloth memory, no plasticity, and static parameters only — [Wang 2011](https://escholarship.org/content/qt7g35q2x7/qt7g35q2x7.pdf).
- **Database contents:** among the ten fabrics, stretch knits are White Swim Solid (87/13 nylon/spandex), Ivory Rib Knit (95/5 cotton/spandex), Navy Sparkle Sweat (96/4 polyester/spandex). Density 0.113-0.324 kg/m2 — [Wang 2011, Table 1](https://escholarship.org/content/qt7g35q2x7/qt7g35q2x7.pdf).
- **Clyde 2017:** orthotropic hyperelastic model with Ogden-like curves. ASTM D5035 strip tests with 50 mm wide strips at 300 mm/min on an Instron 5569, up to the breaking point. ASTM D1388 for bending and D3776, D1777 for density and thickness. Five fabrics, all woven: canvas, cotton, silk, wool, denim. Repeat tests vary by up to 20% at a fixed elongation. They ignore hysteresis and rate. They have no data for the Poisson term and set a12 to half the smaller of a11 and a22 — [Clyde, Teran, Tamstorf 2017](https://www.math.ucdavis.edu/~jteran/papers/CTT17.pdf).
- **Load ranges compared:** Clyde's text gives under 15 N/m for one earlier sparse set, typically under 200 N/m for Miguel 2012, and KES tests up to 500 N/m. It says higher strain occurs in everyday use near seams — [Clyde 2017, Section 2](https://www.math.ucdavis.edu/~jteran/papers/CTT17.pdf). Miguel 2012 fitted Wang's model and describes 39 parameters — [Miguel et al. 2012](https://cdfg.mit.edu/assets/files/DataDrivenCloth-EG2012.pdf) (search result description, paper not read).
- **Standards:** EN 14704-1 for stretch fabric, with a 50 mm strip and five cycles — [PMC8401858](https://pmc.ncbi.nlm.nih.gov/articles/PMC8401858/). ASTM D4964 for wide or narrow elastic fabric, using a loop and constant rate of extension — [InfinitaLab summary](https://infinitalab.com/blog/tension-elongation-of-elastic-fabric-by-astm-d4964/). A patent's use of D4964 gives one concrete protocol: 250 mm loop, 500 mm/min, cycled three times from 0 to 100 N, tension read from the third extension curve — [US11116337](https://patents.google.com/patent/US11116337).
- **KES-F parameters:** LT is linearity, G shear stiffness, B bending stiffness, 2HG and 2HB hysteresis — [snippet only: Scribd explainer](https://www.scribd.com/doc/54264731/2407) (low quality). A fabric testing patent notes that KES tests stretch and shear separately and so misses combined strain — [US11175276](https://patents.google.com/patent/US11175276). A white paper compares seven methods including KES, FAST, Fabric Touch Tester and CLO Fabric Kit 2.0 — [snippet only: IEEE IC white paper](https://research.hva.nl/en/publications/white-paper-ieee-industry-connections-ieee-ic-the-measurement-of-/). KES-F has been applied to warp-knits for hand values — [snippet only: PolyU](https://research.polyu.edu.hk/en/publications/a-statistical-analysis-of-low-stress-mechanical-properties-of-war/).
- **Tight garment FE work** uses anisotropic hyperelastic fitting from biaxial tests for competition swimwear — [JSME 2012](https://doi.org/10.1299/jsmeshd.2012.89).

### Inferences
- White Swim Solid is a reasonable starting point but must be extrapolated above about 15 N/m, so the tricot table in section 1 is a better guide at working load. Both give the same order of stiffness.
- Clyde's finding of up to 20% test-to-test variation sets a floor: solver agreement better than about 20% with any fabric's stiffness is meaningless unless that specific fabric was measured. The 3x spread among tricots matters more.

### Gaps
- No published KES-F values (LT, G, B) found for elastane warp knits. The Textile Research Journal warp-knit study and the Tekstilec 2022 swimsuit paper may have them; I could not read either.
- No public FMT or CLO Fabric Kit data for spandex tricot found. CLO fabric library values were not obtainable.
- No shear measurement found for tricot other than Wang's noisy c33.

## 3. Compression, buckling and bending

### Takeaway
Zero compressive stress is physically right: tension field theory assumes it, and thin fabric buckles at about 0.1% of working tension. What is missing from the solver is the geometry that compression implies, namely wrinkles and folds of about 1-2 cm, not any resisting force. Bending has a negligible force effect in taut regions (it acts on under 1 mm) and matters only where fabric goes slack.

### Cited Findings
- Tension field theory, from Wagner (1931) and Reissner (1938), allows only tensile stress in the membrane — [snippet only: LAJSS](https://www.lajss.org/index.php/LAJSS/article/download/128/124). It does not itself predict out-of-plane wrinkle shape — [same](https://lajss.org/index.php/LAJSS/article/view/128).
- A sheet with vanishing bending rigidity under finite stretch approaches this compression-free limit — [snippet only: Xin and Davidovitch 2021](https://link.springer.com/article/10.1140/epje/s10189-021-00088-9). They also report that wrinkling comes with collapse of transverse compressive stress, and that wavelength scales as (B/T)^(1/4) L^(1/2) with B bending modulus, T tension, L length (from Cerda and Mahadevan 2003) — [same, arXiv](https://arxiv.org/abs/2012.13051v1).
- A graphics paper uses this idea for draped cloth: coarse shape from tension field theory, with a separate wrinkle field for direction and frequency — [snippet only: graphics paper on draped cloth wrinkle fields](https://par.nsf.gov/servlets/purl/10333495).
- "We do not know of a test procedure for that strain regime because of cloth's typical tendency to buckle instead of undergoing any significant compression" — [Clyde 2017, Section 4](https://www.math.ucdavis.edu/~jteran/papers/CTT17.pdf). Clyde's minimum warp and weft strain is held at 0 for the same reason.
- ARCSim keeps stiffness under compression, using the rest-state row and not zero; it relies on buckling rather than a compression-free law — [dde.cpp](https://raw.githubusercontent.com/jiongchen/arcsim/master/src/dde.cpp).
- **Bending data for White Swim Solid:** coefficient k of 19-70 x 10^-6 N.m depending on bias angle and curvature, in the ARCSim file — [white-swim-solid.json](https://raw.githubusercontent.com/jiongchen/arcsim/master/materials/white-swim-solid.json). ARCSim's bending energy is k x (l^2/(2a)) x theta^2 / 4 — [physics.cpp](https://raw.githubusercontent.com/jiongchen/arcsim/master/src/physics.cpp). The paper calls this fabric especially likely to form small, sharp wrinkles because it is compliant in bending — [Wang 2011, Section 6.2](https://escholarship.org/content/qt7g35q2x7/qt7g35q2x7.pdf).
- The paper's measured bending test is 4 cm wide strips of fabric overhanging under self-weight at 0, 45 and 90 deg — [Wang 2011, Section 4.2](https://escholarship.org/content/qt7g35q2x7/qt7g35q2x7.pdf).

### Inferences
All numbers here are my calculations and order-of-magnitude.
- **Physical bending rigidity.** Matching ARCSim's hinge energy to continuum energy 1/2 B kappa^2 gives B = k/12, or about 2-6 uN.m (about 0.02-0.06 gf.cm2/cm) for the swim fabric. This derivation is mine, and the factor depends on the mesh-patch assumption.
- **Buckling force.** Euler load for a 5 cm span: pi^2 B / L^2 is about 0.02 N/m, against working tension of 20-100 N/m, or about 0.1%. Zero compression cost is therefore accurate to within measurement error.
- **Range of bending under tension:** sqrt(B/T) at B = 5 uN.m, T = 30 N/m is about 0.4 mm, which is below any practical mesh size. Omitting bending in taut regions is safe.
- **Range of bending in slack fabric:** (B/(rho g))^(1/3) is about 1.4 cm, with rho g = 2 N/m2. Slack regions (hollows under the seat, the small of the back, near elastic gathers) are shaped by bending at this scale, and a bending-free model cannot predict that shape.
- **Self-weight** of 2 N/m2 is about 1% of 200-500 Pa contact pressure, so gravity can be ignored while the fabric is taut, but not where slack.
- **Wrinkle wavelength** at T = 30 N/m and L = 10 cm: (B/T)^(1/4) L^(1/2) is about 6 mm, times a prefactor I recall as about 3.5 (unverified) gives about 2 cm.
- **The 50% floor.** No physical basis was found for a specific limit: real fabric accommodates excess length by folding at nearly no stress, so the force side is fine at any floor. The geometric side is the concern. A 50% in-plane compression in a real garment would be folds with about 0.5-1 cm amplitude at 2 cm wavelength (from (lambda/pi) x sqrt(strain)). A flat rendering of that surface is wrong, and two facts follow for the audit: triangles sitting at the floor should be reported as wrinkled or gathered rather than fit, and any triangle reaching the floor is a sign of too much fabric, not a limit reached by the material.
- **Elastic gathers.** Fabric gathered by elastic stretched to 75-100% ratio is compressed to about 75-100% and stands off the body, so ignoring thickness and fold height under-predicts its volume at edges.

### Gaps
- No direct measurement of in-plane compression or the wrinkling threshold for stretch knit found; Clyde explicitly says no test procedure is known.
- No knit-specific tension field work found.
- No published bending rigidity for tricot by KES or cantilever found other than Wang's fit. Warp knit bending anisotropy and curl (tricot curls at edges) have only qualitative support. A related arXiv paper covers curling morphology of knits, which I did not read — [arXiv 2410.13307](https://arxiv.org/pdf/2410.13307).
- Cerda and Mahadevan's exact prefactor was not verified against the [original PRL paper](https://softmath.seas.harvard.edu/publication/geometry-and-physics-of-wrinkling/).

## 4. Friction

### Takeaway
Dry textile on skin has a friction coefficient of about 0.3-0.7, rising substantially when wet, and polyamide is at the low end. Published sensitivity studies suggest friction barely changes garment normal pressure but strongly affects shear and slip; no study measured its effect on strain distribution in a tight garment.

### Cited Findings
- All friction values here are **snippet only**, as the full texts returned 403, 404 or 410.
- Mean friction between skin and a reference textile: 0.27-0.71, with large differences between subjects — snippet from the search on skin-textile friction, source identity uncertain (probably [Proc. IMechE Part H paper 10.1243/09544119JEIM313](https://doi.org/10.1243/09544119JEIM313)).
- Forearm static friction with nonwovens: about 0.3-0.5 on normal dry skin and 0.9-1.3 on over-hydrated skin. Friction varied between people but fabric rank order was similar — [Falloon, UCL PhD thesis](https://discovery.ucl.ac.uk/id/eprint/1458878/).
- Moisture raises skin-textile friction by a factor of 1.5-7 — [review in Lubricants 4(1) 6](https://mdpi.com/2075-4442/4/1/6) (attribution from search listing).
- Wool has highest friction and polyamide-based lowest among compared fabrics — [Fibres and Textiles 2017 review](https://yadda.icm.edu.pl/baztech/element/bwmeta1.element.baztech-6bd3ffba-21aa-4f63-9d69-89693e88b79a/c/19_ramamurthy_chellamani_dhurai_subramaniam_fibres_2017_2.pdf).
- Medical compression stockings on forearm (closest match to elastane knit): no significant dry differences between types; wet, composition changes lower friction 20-30% and base structure changes lower it 50-60% — [Tribology Letters 2015, In Vivo Measurement of Friction Between Human Skin and Different Medical Compression Stockings](https://doc.rero.ch/record/331602?ln=it).
- Skin friction rises with pressure at low pressure, then levels off — [Leyva-Mendivil 2017](https://eprints.soton.ac.uk/416751).
- **Effect on fit:** a five-factor FE design for compression sportswear finds hyperelastic properties, thickness and tensile strain dominate contact pressure, with interface friction less important — [PolyU, An optimized design of compression sportswear fabric](https://research.polyu.edu.hk/en/publications/an-optimized-design-of-compression-sportswear-fabric-using-numeri/). Against that: in a compression bandage model, skin-to-bandage friction is very sensitive — [arXiv 2009.02926](https://arxiv.org/pdf/2009.02926). A below-knee socket model finds friction very sensitive for pressure, shear and slip — [PolyU](https://research.polyu.edu.hk/en/publications/development-of-a-non-linear-finite-element-modelling-of-the-below/).

### Inferences
- The capstan relation (standard physics, not from these sources) is useful here: with friction 0.4 around a 90 deg wrap, tension can differ up to e^(0.63), or 1.9x, either side before the fabric slides. So friction can lock in large tension differences across the body, and the actual state depends on how the garment was pulled on.
- A frictionless solver gives the fully smoothed state, close to a wearer who has tugged and settled the garment. This is a reasonable reference for "correct" fit, but real garments can hold fabric tensions that differ by tens of percent from it at places such as the seat and hip where the surface wraps tightly.
- Friction will not change total pressure much, but it can change where edges sit (leg line, seat ride-up). Ride-up is a slip phenomenon that a frictionless solver cannot represent at all, in either direction: real garments resist it, and solver equilibrium may slide further.

### Gaps
- No direct measurement of friction for nylon/spandex tricot on skin found.
- No study found that reports strain distribution with and without friction on a tight garment.
- Dynamic and wet stick-slip for swim or gymnastics context not found.

## 5. Edge elastic and seams

### Takeaway
No public force-at-elongation data for 3/8 in (10 mm) swim or braided elastic was found even after trying terms such as narrow elastic tape, load elongation, modulus and ASTM D4964. Indirect evidence puts a 10 mm elastic at about 1-5 times the axial stiffness of a same-width fabric strip, with working tension of about 0.5-2 N. No seam stiffness numbers were found. This force is cheap to measure, and measuring it would resolve the largest open number.

### Cited Findings
- **Woven elastic tape data sheet (a heavy product, not swim elastic):** polyester, polyamide, spun rayon with elastane; about 60 N at 50% for the 70 mm width; maximum elongation in use 52%; test standard not stated — [JUMBO-Textil FlexiKlett](https://www.jumbo-textil.de/en/produkt/flexiklett-woven_elastic_tape_70mm_985070/). This is 8.6 N/cm at 50% (my calculation).
- **Natural rubber strip elastic in a panty leg:** bands about 0.25 in wide, 0.007 in thick; average overall leg-opening tension about 0.175 lb (0.78 N, my conversion), cited as most comfortable for most women — [US4031568](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/4031568) (snippet only).
- **Training pants:** leg-area target about 165-220 g, waist about 330-400 g, measured after stretching the opening to a set width and holding five minutes; inner elastic tighter by 4:3 to 3:2 — [US4646362](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/4646362) (snippet only). Converts to 1.6-2.2 N and 3.2-3.9 N (my conversion). Different product and possibly two strands; treat as scale only.
- **Power band patent with D4964 protocol:** tension values such as 3.5 lbf at 30%, 22 lbf at 50%, 7.2 lbf at 70%; ranges are claim language, internally inconsistent, and no width is given, so they cannot be converted to per-width values — [US11116337](https://patents.google.com/patent/US11116337).
- **Application ratio in practice:** swim leg elastic is stitched at about 1:1 in the front and 3/4 of the opening at the back — [Craft and Fabric Links](https://craftandfabriclinks.com/~craftand/TIPS/elastic_instructions.html) (snippet only). A second sewing guide recommends minimal tension on straight edges — [Yarnspirations](https://www.yarnspirations.com/mic-20180413-guide-to-sewing-swimwear-part-1.html) (snippet only). Those ratios match the solver's 75-100%.
- **Seams:** overlock had the best drying rate and the greatest thickness compared with flatlock and infused seam on super-stretch compression tricot, with seam stiffness and bursting measured — [snippet only: ITAA 2022](https://www.iastatedigitalpress.com/itaa/article/id/13532/) (full text blocked; numbers unavailable). Seam elongation depends mainly on thread and stitch type; high elastic threads raise it greatly — [Amann](https://www.amann.com/knowledgehub/amann-wiki/seam-quality-explained-criteria-characteristics-and-performance/seam-elongation/) (snippet only). Stitch length tunes flatlock stretch — [Canadian patent 2259359](https://brevets-patents.ic.gc.ca/opic-cipo/cpd/eng/patent/2259359/summary.html) (snippet only). Overstretching causes stitch cracking, and stiff fabric with stretchy thread and low stitch density raises seam grinning — [Uludag 2021](https://acikerisim.uludag.edu.tr/signposting/describedby/2fc3310c-e05d-45c4-87e3-91f01b0e1f0b) and [ITU study on ISO 514 seams](https://polen.itu.edu.tr/entities/publication/4f9d4b61-96f3-48a1-aef0-8ebff50b4747/full) (snippets only).
- **Seam test method:** strip test per ISO 13934-1 — [Amann](https://knowledgehub.amann.com/amann-wiki/seam-quality/seam-elongation). A Japanese-origin thread patent compares seamed and unseamed stress at 60% and 100% elongation — [US6514607](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/6514607) (snippet only).

### Inferences
All values below are my calculations, of order-of-magnitude quality.
- **Fabric baseline:** a 10 mm strip of tricot at 200-400 N/m has an axial stiffness of 2-4 N per unit strain, and carries 0.2-1.2 N over 10-40% strain.
- **Elastic estimates:** 0.78 N at about 25-33% implied stretch gives about 2.5-3 N per unit strain, similar to the fabric. The rubber strip's 1.13 mm2 cross-section with an assumed rubber modulus of 1-2 MPa (general knowledge, not sourced here) gives 1-2 N per unit strain, broadly consistent. Training-pant tensions imply about 5-7 N per unit strain, or about half that if two strands were measured. The heavy woven tape scaled to 10 mm is about 17 N per unit strain and should be taken as an upper bound.
- **Suggested prior for the solver:** 3-10 N per unit strain for 10 mm swim elastic, centred about 5, or about 1-5x the fabric strip and most likely 1-3x. Elastic and fabric sewn together act in parallel at the edge, so the elastic adds to the fabric rather than dominating it.
- **Line load check:** 1 N around a 9 cm radius thigh is 11 N/m of line load, or about 1.1 kPa (8 mmHg) under a 10 mm band. That is high compared with typical garment pressure of 1-4 mmHg, so edge elastic is likely the strongest local pressure on the garment.
- **Seams:** an overlock joins two plies plus thread along a narrow rib of about 6 mm. Doubling plies alone gives at least about 2x local stiffness along the seam, more with thread lock-up; across the seam the effect should be smaller. I consider 2-3x along the seam over about 6 mm a working guess, not data. Its total effect is equivalent to a 12-18 mm wide strip of extra fabric, which is similar to the elastic, so long seams along stretch direction are not negligible. Seams will also carry bending stiffness and a local thickness of two plies, relevant to showing through.

### Gaps
- **No force data for 3/8 in swim or braided elastic.** An earlier search of the project found the same. This covered "narrow elastic tape load elongation", "braided elastic", waistband and bra strap queries.
- A self-adjusting bra strap patent reportedly specifies no more than 25% under 0.6 lbf and at least 60% under 2.2 lbf. The search summary did not identify the patent, so I cannot source it and it should not be cited.
- A patent-listed stress decay test at 50% was also seen, without numbers.
- **How to close the gap cheaply:** make a 250 mm loop of the real elastic (per D4964 geometry), stretch it three times, then hang known weights such as 100, 200, 500, 1000 g and record length. Halve the force for a loop, since two strands carry it. Do the same for a 50 mm wide strip of fabric in each direction and a seamed strip. A kitchen scale and ruler give all the data the solver needs, and would be better than anything public.
- No numbers found for seam modulus against fabric on elastane knits. The ITAA 2022 paper probably has them; reading it needs library access.

## 6. Pressure and worn stretch

### Takeaway
Laplace's law P = T/r predicts measured pressure on a rigid cylinder well: within about 0.5 mmHg, up to about 17 mmHg at 43% strain. No measured swimsuit or leotard pressure was found. From tricot data and typical sewing reductions, a leotard should carry about 20-60 N/m tension and 1-4 mmHg pressure over most of the body, with strain of about 10-25% and higher at edges and tight curves.

### Cited Findings
- P = T/r = 2 pi T / C, and with Hooke's law P = E eps s 2 pi / C, plus a cubic stress fit — [PMC8401858, Eq. 1-9](https://pmc.ncbi.nlm.nih.gov/articles/PMC8401858/). Agreement generally under 0.5 mmHg; R2 reported as 99.5%.
- **Measured pressure on an 11 cm diameter rigid PVC cylinder with PicoPress (5 cm bladder, mean of five locations):** tubes 10, 20 and 30% smaller than the cylinder:

| Fabric | 11% strain mmHg | 25% strain mmHg | 43% strain mmHg |
|---|---|---|---|
| LB 74/26 | 2.0 | 6.0 | not read |
| DB 58/42 | 3.0 | 6.6 | 12.0 |
| SW 75/25 | 2.7 | 7.4 | 15.0 |
| TL 65/35 | 5.7 | 10.5 | 16.6 |

Source: [PMC8401858, Table 3](https://pmc.ncbi.nlm.nih.gov/articles/PMC8401858/). 1 mmHg = 133 Pa.
- Pressure sensor thickness overestimates reading on rigid bodies, requiring a correction factor — [TU Liberec thesis](https://dspace.tul.cz/handle/15240/152992) (snippet only).
- Laplace's law cannot give internal stress or clothing deformation, and treats only fabric elasticity and global curvature — [PolyU](https://ira.lib.polyu.edu.hk/handle/10397/86212) (snippet only). A sock FE study finds skin pressure depends on contact surface curvature and fabric stress — [PolyU](https://research.polyu.edu.hk/en/publications/computational-simulation-of-skin-and-sock-pressure-distributions/) (snippet only).
- **Competition swimwear** pressure was simulated on a cylinder and matched tests in the design range; abstract gives no numbers. It says pressure must balance performance and cardiac load — [JSME 2012](https://doi.org/10.1299/jsmeshd.2012.89).
- **Worn stretch:** for a typical 80/20 nylon or polyester 4-way swim fabric, a pattern at about 90% of body measure ("10% pattern reduction") — [Sew Daily](https://www.sewdaily.com/jump-into-sewing-swimwear-episode-18) (snippet only). This is 11% strain (my calculation). Recommended fabric stretch for a swimsuit pattern 60-80% — [Seamwork](https://www.seamwork.com/sewing-patterns/sew-the-maggie-swimsuit) (snippet only). Amount of negative ease grows with fabric stretch — [Cashmerette](https://blog.cashmerette.com/2019/02/what-is-negative-ease-and-how-does-it-work.html) (snippet only). A pillar-stitch paper is summarized as typical form-fitting end-use extension of 30% walewise and 60% coursewise, which I could not verify in the full text — [snippet only: Kyzymchuk and Melnyk 2018](https://journals.sagepub.com/doi/10.1177/1558925018820722).
- Elastic inlay yarn force should exceed 4 N for desired pressure at about 30% stretch in compression garments — [snippet only: PMC11397798](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11397798/).

### Inferences
My calculations:
- Using 200-300 N/m and strain of 11-25% gives T of 22-75 N/m (0.2-0.75 N/cm).
- **Pressure by location:** torso radius about 15 cm gives about 150-500 Pa (1-4 mmHg); thigh radius about 9 cm gives about 250-830 Pa (2-6 mmHg); hip curvature varies widely.
- **Use for audit:** a solver fit that shows torso tension several times above 75 N/m, or strain over about 40% across large areas, disagrees with ordinary negative ease and is worth examining. Tension under 10 N/m over large areas implies loose fit.
- **Simple solver check:** a tube test matching the table above. Build a tube of the stated reduction over an 11 cm cylinder in the solver at 200-400 N/m stiffness and verify Laplace pressure to within about 10%. This is an exact and cheap validation the audit could add.
- Laplace applies to the torso only roughly because the surface has two curvatures (P = T1/r1 + T2/r2) and is soft. Body surface compression will reduce strain slightly, and concave areas such as under the seat have no contact, which is where wrinkling occurs. The two-curvature form is standard membrane physics and was not in the sources read.

### Gaps
- No measured pressure for swimwear or leotards in kPa, mmHg or hPa found; closest are compression tubes on rigid cylinders.
- No measured strain field on a worn leotard (for example by DIC or a printed grid) found. A printed grid on the owner's sample could supply this.
- Swimwear reduction values rest on sewing guides, not measurement.
