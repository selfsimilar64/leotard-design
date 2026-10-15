---
type: Technique
title: Garment as a layer on the body surface
description: "A skin-tight leotard can live on the body surface, as in Montes et al. (SIGGRAPH 2020), so no cloth simulation is needed in the interactive loop; simulation is reserved for parts that leave the skin and for background fit read-outs."
tags: [geometry, technique, garment, simulation, architecture]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: montes
    resource: https://history.siggraph.org/?p=104289
    title: "Montes Maestre, Thomaszewski, Mudur, Popa, Computational Design of Skintight Clothing, ACM TOG 39(4) art. 105, SIGGRAPH 2020, DOI 10.1145/3386569.3392477"
  - id: pietroni
    resource: https://arxiv.org/abs/2202.10272
    title: "Pietroni et al., Computational Pattern Making from 3D Garment Models, ACM TOG 41(4) art. 157, 2022"
  - id: wang-tang
    resource: https://doi.org/10.1016/j.cad.2009.02.018
    title: "Wang & Tang, Pattern computation for compression garment, SPM 2008 / CAD 42(2) 2010"
  - id: bartle
    resource: https://www.cs.ubc.ca/labs/imager/tr/2016/PhysicsDrivenPatternAdjustment
    title: "Bartle et al., Physics-driven Pattern Adjustment for Direct 3D Garment Editing, SIGGRAPH 2016"
  - id: kwok
    resource: https://archive.ymsc.tsinghua.edu.cn/pacm_paperurl/20160819153646437451267
    title: "Kwok et al., Styling Evolution for Tight-Fitting Garments, IEEE TVCG 22(5), 2016"
  - id: knit4d
    resource: https://cs-people.bu.edu/xjhan/4dknitting.html
    title: "Liu et al., Knitting 4D Garments with Elasticity Controlled for Body Motion, SIGGRAPH 2021"
  - id: wolff-2023
    resource: https://diglib.eg.org/handle/10.1111/cgf14728
    title: "Wolff et al., Designing Personalized Garments with Body Movement, CGF 42(1), 2023"
  - id: uspto-11969042
    resource: https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11969042
    title: USPTO 11,969,042 (tailored compression garment from T = p r)
  - id: clo-flatten
    resource: https://support.clo3d.com/hc/en-us/articles/115008890627-Flatten
    title: CLO Help Center, Flatten
    author: org:clo
  - id: browzwear
    resource: https://browzwear.com/products/v-stitcher
    title: Browzwear VStitcher
    author: org:browzwear
  - id: mueller-pubs
    resource: https://matthias-research.github.io/pages/publications/publications.html
    title: M. Müller publications page (PBD, XPBD, Small Steps, LRA, Strain Based Dynamics)
  - id: vbd
    resource: https://doi.org/10.1145/3658179
    title: "Chen et al., Vertex Block Descent, ACM TOG 43(4), 2024"
  - id: gaia
    resource: https://github.com/AnkaChan/Gaia
    title: Gaia reference engine
  - id: newton
    resource: https://github.com/newton-physics/newton
    title: Newton physics
  - id: ppf
    resource: https://github.com/st-tech/ppf-contact-solver
    title: ZOZO ppf-contact-solver
  - id: jolt
    resource: https://github.com/jrouwe/JoltPhysics
    title: Jolt Physics
  - id: xrtailor
    resource: https://xrtailor.readthedocs.io/
    title: XRTailor docs
  - id: report
    resource: /references/research/research-report.md
    title: "Research report (in-bundle mirror), 'designed directly on the body' section"
    author: claude-code/claude-opus-5-5
  - id: md-pencil
    resource: https://digitalproduction.com/2026/04/15/marvelous-designer-2026-0-adds-3d-pencil-and-lacing/
    title: "Digital Production, Marvelous Designer 2026.0 adds 3D Pencil and lacing, 15 Apr 2026"
    author: org:digital-production
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror), section 2"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Treat the leotard as a layer living on the body surface, not as simulated cloth.** The main
published method for skintight clothing (Montes et al., SIGGRAPH 2020) embeds the 2D cloth mesh in the
3D body surface precisely to eliminate contact handling, so a real-time design tool needs no cloth
simulation in its interactive loop.[^montes][^gg-notes] Simulation earns its cost only for parts that
leave the skin (straps over hollows, gaping cut-outs, skirts) and for optional fit read-outs run in the
background. Pattern-first simulation (CLO-style) is the heaviest route and unnecessary for the core
workflow.[^gg-notes][^report]

# Research precedent (tight garments)

| Work | What it does | Relevance |
|---|---|---|
| Montes et al. 2020[^montes] | 2D cloth mesh embedded in the 3D body ("Lagrangian-on-Lagrangian"), eliminating contact; sensitivity analysis computes patterns meeting body-shape, pressure and seam-traction objectives; personalised patterns, complex layouts | The core justification; also "level 3" stretch compensation |
| Pietroni et al. 2022[^pietroni] | Segments a 3D garment into patches and parameterises each into pattern pieces; anisotropic woven-fabric distortion measure; bounded cloth stress; seam symmetry, darts, grain; "fast enough to admit user input"; skintight and loose; multiple target poses | Panels-to-pattern pipeline |
| Wang & Tang 2008/2010[^wang-tang] | Pattern computation for compression garments (physical/geometric) | bibliographic only |
| Bartle et al. 2016[^bartle] | Designer edits in 3D; fixed-point loop adjusts 2D patterns until simulated drape matches the target; simulator as black box | Edit-in-3D precedent |
| Kwok et al. 2016[^kwok] | Evolutionary design of styling curves on wetsuits, rash guards, unitards; curves as streamlines on the body; regenerated for other bodies and poses | Curves on tight garments; transfer |
| Liu et al. 2021[^knit4d] | Varies knit elasticity across a tight garment by simulation to reduce pressure and sliding | Fit feedback |
| Wolff et al. 2023[^wolff-2023] | Designs directly on a scanned avatar without a starting pattern, alternating simulation and rest-shape adjustment across poses, then outputs a sewing or knitting pattern | Design-on-body precedent |
| Compression patent[^uspto-11969042] | Pattern width from body radius and target pressure, T = p·r (Laplace) | Pressure estimate without simulation |

All via the research note.[^gg-notes] The full texts of Montes and Pietroni were not read, so their
material models, numeric distortion bounds and runtimes are not recorded.[^gg-notes]

Commercial confirmation: CLO's 3D Pen + Flatten extracts closed shapes drawn on the avatar as 2D
patterns with automatic sewing (zero ease), and Marvelous Designer 2026's 3D Pencil also creates panels
from lines sketched on a body; Browzwear VStitcher shows tension and pressure maps.[^clo-flatten][^md-pencil][^browzwear][^report]

# Recommended representation **[INFERRED]**

Hybrid, with no simulation in the loop:[^gg-notes]

1. **Source of truth:** design curves and regions stored on the canonical body surface
   (see [curves on surfaces](/engineering/geometry/curves-on-surfaces.md)).
2. **Derived cache:** a garment mesh cut along those curves, for crisp seam rendering, region
   extraction and flattening, regenerated when curves change
   (see [regions and panels](/engineering/geometry/regions-and-panels-from-curves.md)).
3. **Rejected for the core:** pattern-first plus drape simulation — needs fabric parameters, a solver,
   collision handling and seconds-to-minutes of settling to recover a shape that for a leotard is
   already known (the body).

One refinement: real fabric bridges hollows; see [fabric bridging hollows](/engineering/geometry/fabric-bridging-hollows.md).

# Where simulation adds value (priority order) **[INFERRED]**

1. Straps and lattice backs: a tensioned strap follows a geodesic on convex regions but spans hollows
   as a chord — a 1D rod / geodesic-with-lift-off solve is far cheaper than cloth.
2. Cut-outs and keyholes gaping under tension.
3. Anything genuinely loose (attached skirts, drapes): real cloth simulation.
4. Fit feedback as pressure/strain maps; Laplace p = T/r gives a first-order estimate without simulation.

All four can run on demand or in a background worker.[^gg-notes]

# Simulation options if needed

| Option | Licence / platform | Note |
|---|---|---|
| PBD / XPBD / Small Steps / Long Range Attachments / Strain Based Dynamics[^mueller-pubs] | papers | XPBD is the pragmatic interactive choice **[INFERRED]**: simple, stable, strain limiting and LRA documented for tight cloth |
| Vertex Block Descent; Gaia engine[^vbd][^gaia] | Gaia Apache-2.0; TBB/Eigen/Embree; Windows-tested only | VBD and XPBD simulators |
| Newton[^newton] | Apache-2.0, Linux Foundation; Warp; Python 3.10+; CUDA needs NVIDIA, macOS CPU-only; API unstable | XPBD, VBD, Style3D cloth examples |
| ppf-contact-solver[^ppf] | Apache-2.0; GPU FEM; strict strain limits (1–10%/triangle); offline (minutes for hundreds of frames on an L4); Blender add-on May 2026 | offline validation, not interaction |
| Jolt Physics[^jolt] | MIT; soft bodies with edge, bend, volume, long-range constraints, skinned-vertex limits, pressure; WASM build | only verified permissive engine with soft bodies and WASM |
| XRTailor; Velvet[^xrtailor] | Apache-2.0 GPU cloth; Velvet licence unconfirmed | |

All via the research note.[^gg-notes] No verified real-time figures for XPBD cloth in WebGPU/WASM exist.[^gg-notes]

[^montes]: Montes et al. 2020.
[^pietroni]: Pietroni et al. 2022.
[^wang-tang]: Wang & Tang 2008/2010.
[^bartle]: Bartle et al. 2016.
[^kwok]: Kwok et al. 2016.
[^knit4d]: Liu et al. 2021.
[^wolff-2023]: Wolff et al. 2023.
[^uspto-11969042]: USPTO 11,969,042.
[^clo-flatten]: CLO Help Center, Flatten.
[^md-pencil]: Digital Production on Marvelous Designer 2026.0.
[^browzwear]: Browzwear VStitcher.
[^mueller-pubs]: M. Müller publications page.
[^vbd]: Vertex Block Descent.
[^gaia]: Gaia repository.
[^newton]: Newton repository.
[^ppf]: ppf-contact-solver repository.
[^jolt]: Jolt Physics repository.
[^xrtailor]: XRTailor docs.
[^report]: Research report (in-bundle mirror).
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
