---
type: Technique
title: Glint models for glitter
description: "Procedural count-the-flakes-in-the-footprint glint BRDFs (Zirr-Kaplanyan 2016 to Kemppinen 2025) render glitter fabric in real time at about 0.2-1.1 ms extra per light at 1080p; methods, costs, limitations, code availability and the recommended approach."
tags: [rendering, glint, glitter, brdf]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: srr
    resource: /references/research/realtime-sparkle-rendering.md
    title: "Research notes: real-time sparkle rendering"
    author: claude-code/claude-opus-5-5
  - id: jakob2014
    resource: https://rgl.epfl.ch/publications/Jakob2014Discrete
    title: "Jakob et al., Discrete Stochastic Microfacet Models, SIGGRAPH 2014"
    author: org:epfl-rgl
  - id: yan2014
    resource: https://cseweb.ucsd.edu/~ravir/glints.pdf
    title: "Yan et al., Rendering Glints on High-Resolution Normal-Mapped Specular Surfaces, SIGGRAPH 2014"
    author: org:ucsd
  - id: zhu2022
    resource: https://link.springer.com/10.1007/s41095-022-0280-x
    title: "Zhu et al., Recent Advances in Glinty Appearance Rendering, CVM 2022"
    author: org:springer
  - id: bowles2015
    resource: https://advances.realtimerendering.com/s2015/index.html
    title: "Bowles & Wang, Sparkly but not too Sparkly, SIGGRAPH 2015 Advances course"
    author: org:advances-rtr
  - id: wang2016
    resource: https://hal.archives-ouvertes.fr/hal-01327604
    title: "Wang & Bowles, A Robust and Flexible Real-Time Sparkle Effect, EGSR 2016"
    author: org:hal
  - id: zirr2016
    resource: https://research.nvidia.com/publication/2016-02_real-time-rendering-procedural-multiscale-materials
    title: "Zirr & Kaplanyan, Real-time Rendering of Procedural Multiscale Materials, I3D 2016"
    author: org:nvidia-research
  - id: chermain2020
    resource: https://github.com/ASTex-ICube/real_time_glint
    title: "Chermain et al. 2020 reference implementation (MIT)"
    author: org:astex-icube
  - id: chermain2021
    resource: https://publis.icube.unistra.fr/docs/15022/Chermain2021RealTime.pdf
    title: "Chermain et al., Real-Time Geometric Glint Anti-Aliasing, I3D 2021"
    author: org:icube
  - id: deliot2023
    resource: https://ar5iv.labs.arxiv.org/html/2306.05051
    title: "Deliot & Belcour, Real-Time Rendering of Glinty Appearances using Distributed Binomial Laws on Anisotropic Grids, HPG 2023"
    author: org:unity-research
  - id: deliot2023-proj
    resource: https://ggx-research.github.io/publication/2023/06/09/publication-glints.html
    title: Deliot & Belcour project page
    author: org:unity-research
  - id: kk2024
    resource: https://arxiv.org/html/2408.13611v2
    title: "Kneiphof & Klein, Real-Time Rendering of Glints in the Presence of Area Lights, PG 2024"
    author: org:uni-bonn
  - id: kk2024-code
    resource: https://github.com/tomix1024/AreaLightGlintsUnityProject
    title: AreaLightGlintsUnityProject (GitHub)
    author: org:uni-bonn
  - id: kk2025
    resource: https://arxiv.org/html/2507.02674v1
    title: "Kneiphof & Klein, Real-time Image-based Lighting of Glints, EGSR 2025"
    author: org:uni-bonn
  - id: kk2025-code
    resource: https://github.com/tomix1024/IBLGlints-Demo
    title: IBLGlints-Demo (GitHub)
    author: org:uni-bonn
  - id: kemppinen2025
    resource: https://perso.telecom-paristech.fr/boubek/papers/Glinty/
    title: "Kemppinen et al., Evaluating and Sampling Glinty NDFs in Constant Time, SIGGRAPH Asia 2025"
    author: org:adobe-research
  - id: shah2024
    resource: https://diglib.eg.org/handle/10.1111/cgf15157
    title: "Shah et al., Neural Histogram-Based Glint Rendering, EGSR 2024"
    author: org:eurographics
  - id: xing2024
    resource: https://jcst.ict.ac.cn/en/article/doi/10.1007/s11390-024-4123-3
    title: "Xing et al., Tiny Example Based Procedural Model for Glints, JCST 2024"
    author: org:jcst
  - id: wu2025
    resource: https://arxiv.org/abs/2505.08985
    title: "Wu et al., Position-Normal Manifold for Efficient Glint Rendering, arXiv 2025"
    author: org:arxiv
  - id: zhao2025
    resource: https://www.sciopen.com/article/10.26599/CVM.2025.9450396
    title: "Zhao et al., A discrete microfacet model for transparent glints, CVM 2025"
    author: org:sciopen
  - id: ue-substrate
    resource: https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-substrate-materials-in-unreal-engine
    title: "Epic, Overview of Substrate Materials (UE 5.8)"
    author: org:epic-games
  - id: ue-substrate-2023
    resource: https://advances.realtimerendering.com/s2023/2023%20Siggraph%20-%20Substrate.pdf
    title: Epic SIGGRAPH 2023 Substrate talk
    author: org:epic-games
---

# Takeaway

Real-time glitter is **solved enough**: the procedural "count the flakes in the pixel footprint"
family (Zirr–Kaplanyan 2016 → Chermain 2020/2021 → Deliot–Belcour 2023 → Kneiphof–Klein 2024/2025 →
Kemppinen 2025) converges to an ordinary GGX/Beckmann highlight at distance and resolves individual
flakes up close, costs roughly **0.2–1.1 ms extra per light at 1080p** on a 2018-class discrete GPU,
and has public shader code for every step.[^srr] All are plain fragment-shader techniques (screen-space
derivatives, integer hashing, at most a small lookup texture) and run in WebGL2-class GLSL.[^srr]
Use for glitter fabric; spangles and crystals hand off to it at distance ([LOD](/engineering/rendering/sparkle/crystal-lod-chain.md)).

# Methods

| Method | Idea | Cost / limits | Code |
|---|---|---|---|
| Jakob et al. 2014 (offline) | Discrete distribution of mirror flakes counted in pixel footprint and direction cone[^jakob2014] | Offline target look | – |
| Yan et al. 2014/2016 (offline) | Integrate a high-res normal map's NDF over the footprint (P-NDF); 2016 position-normal Gaussians[^yan2014] | Accurate, hard to accelerate | – |
| Bowles & Wang 2015 / Wang & Bowles 2016 | Jittered 3D world-space grid of sparkle seeds; depth-dependent sparkle scale for stability; snow in a AAA title[^bowles2015][^wang2016] | Course talk / short paper | Slides + RenderMonkey shader |
| Zirr & Kaplanyan 2016 (I3D) | Biscale NDF, hierarchy of scales with footprint estimation; artist control[^zirr2016] | 0.93–5.03 ms in Deliot's benchmark | Shadertoy `ldVGRh` + shading.txt |
| Chermain et al. 2020 (PG) | Precomputed multiscale dictionary of 1D marginals, roughness-independent, <1 MiB[^chermain2020] | 1.01–5.90 ms in Deliot's benchmark | GLSL, **MIT**, WebGL port, dictionary generator |
| Chermain et al. 2021 (I3D) | First real-time geometric glint AA: on-the-fly slope filtering, slope-correlation factor, LEAN-compatible; removes most popping on curved animated surfaces[^chermain2021] | – | Paper |
| **Deliot & Belcour 2023 (HPG best paper)** | Project footprint to UV; pick cells on anisotropic grids; draw reflecting-flake count from a binomial via loop-free "gated Gaussian"; seeds interpolated on spatial/angular grids give each glint a lifespan; LODs blended on binomial parameters; 48 binomial evaluations per pixel; expected count = smooth NDF, variance p(1−p)/N[^deliot2023] | 0.67–1.63 ms vs baseline ≈0.49–0.53 ms (RTX 2080, 1080p, full screen); 1.5–5× faster than prior. Punctual lights only, linear in light count, not energy-conserving, not importance-sampleable, isotropic only, UV-discontinuity artefacts[^deliot2023] | Standalone source, benchmark, HDRP demo via Google Drive, **no licence stated**[^deliot2023-proj] |
| Kneiphof & Klein 2024 (PG) | LTC area-light integral + binomial counting; light opening angle γ replaces the ad-hoc ratio; small overhead over Deliot at 4K on RTX 4090 / 35 W RTX 4070 Mobile[^kk2024] | Artefacts when per-flake probability > 1 (large lights, low roughness); no textured lights, no visibility | Modified HDRP 14.0.10: `Glints2023.hlsl`, `Glints2024.hlsl`, `GlintsSubdivision.hlsl`[^kk2024-code] |
| Kneiphof & Klein 2025 (EGSR) | IBL: env map split into K = 4 or 8 log-spaced radiance levels, indicator functions NDF-prefiltered, hierarchical multinomial sampling (dual-gated Gaussian); per-frame prefilter feasible; 2× env memory, 16-bit channels suffice, 8-bit do not[^kk2025] | Brightness only (nearby coloured lights → white glints), no occlusion, single scattering, isotropic GGX, no angular lifetime | Unity project + Windows/Linux demos[^kk2025-code] |
| **Kemppinen et al. 2025 (SIGGRAPH Asia)** | Facets as a 4D point process on an implicit multiscale grid; converges to target GGX/Beckmann; no memory or precomputation; importance sampling; anisotropy; individually coloured particles[^kemppinen2025] | Timings not read (53 MB PDF) | Single fragment shader, Shadertoy `tcdGDl` |
| Others | Neural histogram NDFs with editable roughness (Shah 2024);[^shah2024] tiny-example procedural model (Xing 2024);[^xing2024] position-normal manifold, order-of-magnitude speed-up, real-time unstated (Wu 2025);[^wu2025] transparent glints (Zhao 2025)[^zhao2025] | – | – |

Survey: Zhu et al. 2022 classify and benchmark glint methods on one platform.[^zhu2022]

# Engine support

- **Unreal Engine 5.8**: Substrate Slab "Glint Density" (log micro-facet density) and "Glint UVs";
  needs `r.Substrate.Glints=1`; unsupported in Blendable GBuffer; alone in the "Complex Special"
  (most expensive) tier; Substrate pages still carry a Beta caution.[^ue-substrate] Epic's 2023 talk:
  opt-in, density over surface UVs, for car paint and snow.[^ue-substrate-2023]
- **Unity**: research forks of HDRP only, no documented product feature.[^srr]
- three.js, Babylon.js, Godot, Filament, EEVEE: **not confirmed** either way.[^srr]

# Recommended approach

**[INFERRED]**:[^srr]
- Deliot–Belcour-style binomial counting lobe as the specular term of glitter fabrics, with the
  Kneiphof–Klein 2024 area-light probability (so light angular size, not a fudge factor, sets sparkle
  frequency); add the 2025 radiance-level prefilter only if the environment must sparkle.
- Evaluate **Kemppinen 2025** as the forward-looking alternative: no noise texture, constant time,
  importance-sampleable, native per-flake colour, single shader.
- Port from the Unity HLSL to three.js TSL/WGSL; nothing needs compute or ray tracing; extra needs are
  an LTC texture pair and prefiltered env channels. Licences of the Deliot and Bonn code are unstated
  — re-implement from papers; Chermain's code is MIT.
- **Parameters to expose**: flake density (flakes/mm², stored as log as Unreal does); macro roughness α
  (spread of flake tilts = width of sparkling band); per-flake roughness / light angular size (how
  often and how long a flake fires); UV scale in millimetres; flake colour distribution.
- Use **pattern-space millimetre coordinates** as the glint UV set: distortion-free, and pattern seams
  coincide with real seams, sidestepping the method's UV sensitivity.
- Cost estimate: a leotard fills the screen only in close-ups; an integrated GPU ~10× slower than an
  RTX 2080 should hold 60 fps with 1–3 sparkle lights if the lobe is restricted to glitter materials
  — **needs measurement on target hardware**.
- Fitting to real glitter: count flake density/size from a calibrated macro photo; fit α from the
  angular width of the sparkling band under a small light; tune until rendered sparkle statistics
  match ([validation](/engineering/rendering/sparkle/sparkle-validation.md)).

Gaps: no measured glint timings on integrated GPUs or in browsers; Kemppinen timings/limits unread;
which paper Unreal follows unverified.[^srr]

[^srr]: Research notes: real-time sparkle rendering, section 1 (in-bundle mirror)
[^jakob2014]: Jakob et al. 2014, EPFL RGL page
[^yan2014]: Yan et al. 2014 paper PDF
[^zhu2022]: Zhu et al. 2022 survey
[^bowles2015]: Advances in RTR 2015 course page
[^wang2016]: Wang & Bowles 2016, HAL record
[^zirr2016]: Zirr & Kaplanyan 2016, NVIDIA Research page
[^chermain2020]: Chermain et al. 2020 GitHub repository
[^chermain2021]: Chermain et al. 2021 paper PDF
[^deliot2023]: Deliot & Belcour 2023, ar5iv HTML
[^deliot2023-proj]: Deliot & Belcour project page
[^kk2024]: Kneiphof & Klein 2024, arXiv HTML v2
[^kk2024-code]: AreaLightGlintsUnityProject
[^kk2025]: Kneiphof & Klein 2025, arXiv HTML
[^kk2025-code]: IBLGlints-Demo
[^kemppinen2025]: Kemppinen et al. 2025 project page
[^shah2024]: Shah et al. 2024, EG digital library
[^xing2024]: Xing et al. 2024, JCST
[^wu2025]: Wu et al. 2025, arXiv
[^zhao2025]: Zhao et al. 2025, SciOpen
[^ue-substrate]: Epic, Overview of Substrate Materials (UE 5.8)
[^ue-substrate-2023]: Epic SIGGRAPH 2023 Substrate slides
