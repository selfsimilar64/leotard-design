---
type: Technique
title: Sparkle temporal stability, anti-aliasing and HDR pipeline
description: "Filter sub-pixel highlights at the source (widen the lobe to the pixel and time footprint, keep the energy) instead of in image space; keep sparkle out of TAA history clamping; 16-bit float HDR; threshold-free bloom before tone mapping; progressive accumulation when idle."
tags: [rendering, antialiasing, taa, hdr, bloom, sparkle]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: srr
    resource: /references/research/realtime-sparkle-rendering.md
    title: "Research notes: real-time sparkle rendering"
    author: claude-code/claude-opus-5-5
  - id: report
    resource: /references/research/research-report.md
    title: "Research report: Borrow the engine, build the sparkle"
    author: claude-code/claude-opus-5-5
  - id: kaplanyan2016
    resource: https://research.nvidia.com/publication/2016-06_filtering-distributions-normals-shading-antialiasing
    title: "Kaplanyan et al., Filtering Distributions of Normals for Shading Antialiasing, HPG 2016"
    author: org:nvidia-research
  - id: tokuyoshi2019
    resource: https://www.jp.square-enix.com/tech/publications.html
    title: "Tokuyoshi & Kaplanyan, Improved Geometric Specular Antialiasing, I3D 2019"
    author: org:square-enix
  - id: chermain2021
    resource: https://publis.icube.unistra.fr/docs/15022/Chermain2021RealTime.pdf
    title: "Chermain et al., Real-Time Geometric Glint Anti-Aliasing, 2021"
    author: org:icube
  - id: deliot2023
    resource: https://ar5iv.labs.arxiv.org/html/2306.05051
    title: "Deliot & Belcour, HPG 2023"
    author: org:unity-research
  - id: kk2025
    resource: https://arxiv.org/html/2507.02674v1
    title: "Kneiphof & Klein 2025"
    author: org:uni-bonn
  - id: karis2014
    resource: https://advances.realtimerendering.com/s2014/index.html
    title: "Karis, High-Quality Temporal Supersampling, SIGGRAPH 2014 Advances"
    author: org:advances-rtr
  - id: yang2020
    resource: https://doi.org/10.1111/cgf.14018
    title: "Yang, Liu, Salvi, A Survey of Temporal Antialiasing Techniques, CGF 2020"
    author: org:wiley
  - id: karis-tonemap
    resource: http://graphicrants.blogspot.com/2013/12/tone-mapping.html
    title: "Karis, Graphic Rants, Tone mapping"
    author: org:graphic-rants
  - id: jimenez2014
    resource: https://www.iryoku.com/next-generation-post-processing-in-call-of-duty-advanced-warfare
    title: "Jimenez, Next Generation Post Processing in Call of Duty: Advanced Warfare, 2014"
    author: org:iryoku
  - id: learnopengl-bloom
    resource: https://learnopengl.com/Guest-Articles/2022/Phys.-Based-Bloom
    title: "LearnOpenGL, Physically Based Bloom"
    author: org:learnopengl
  - id: ue-bloom
    resource: https://dev.epicgames.com/documentation/en-us/unreal-engine/bloom-in-unreal-engine
    title: "Epic, Bloom (UE 5.8)"
    author: org:epic-games
  - id: chrome-129
    resource: https://developer.chrome.com/blog/new-in-webgpu-129
    title: "Chrome, What's new in WebGPU 129"
    author: org:google
  - id: mdn-features
    resource: https://developer.mozilla.org/en-US/docs/Web/API/GPUSupportedFeatures
    title: MDN, GPUSupportedFeatures
    author: org:mdn
  - id: mesh-bvh
    resource: https://github.com/gkjohnson/three-mesh-bvh/blob/master/example/diamond.js
    title: three-mesh-bvh diamond.js
    author: org:three-mesh-bvh
  - id: pathtracer
    resource: https://github.com/gkjohnson/three-gpu-pathtracer
    title: three-gpu-pathtracer
    author: org:three-gpu-pathtracer
---

# Takeaway

Sub-pixel highlights must be **filtered at the source** — widen the lobe to the pixel/time footprint
and keep the energy — because image-space fixes (TAA history clamping, luminance-weighted resolves,
bloom firefly suppression) either flicker or throw away exactly the energy that makes sparkle.[^srr]
For flawless stills, refine the image over a second or so whenever the camera stops.[^report]

# Facts

- Kaplanyan et al. 2016 (HPG best paper): glossy highlights on curved surfaces are small but energetic
  and alias; filter the NDF over a half-vector region estimated from the pixel footprint; temporally
  stable, deferred-compatible.[^kaplanyan2016] Follow-up: Tokuyoshi & Kaplanyan 2019.[^tokuyoshi2019]
- Glint-specific AA: Chermain 2021 removes most popping on curved animated surfaces;[^chermain2021]
  Deliot–Belcour interpolate seeds on spatial/angular grids (glint "lifespan") and blend LODs on
  binomial parameters (temporal claims qualitative);[^deliot2023] Kneiphof–Klein 2025 do not model
  angular lifetime.[^kk2025]
- TAA: Karis 2014 (UE4 TAA, HDR, ghosting, flicker fixes);[^karis2014] Yang et al. 2020 survey
  (accumulation vs history validation).[^yang2020]
- Luminance weighting 1/(1 + luma) stops one bright sample dominating a filter.[^karis-tonemap]
- Bloom: Jimenez 2014 pyramidal down/up-sample, no bright-pass threshold under PBR, blend ≈0.04;[^jimenez2014]
  re-implementation documents 13-tap downsample, 3×3 tent upsample, `mix(hdr, bloom, ~0.04)`,
  R11G11B10F chain, and that the "Karis average" firefly fix weakens bloom.[^learnopengl-bloom]
- Unreal: standard (Gaussian sum, not energy-conserving) vs convolution bloom (FFT with a kernel image
  of camera/eye scatter; energy-conserving, costly); streaks and lens flares not covered.[^ue-bloom]
- HDR in browsers: WebGPU canvas `rgba16float` + `toneMapping: { mode: "extended" }` shows values
  above SDR white on HDR screens (Chrome 129);[^chrome-129] `rg11b10ufloat` renderable and float32
  filterable are optional features.[^mdn-features]
- Gem tracers that depend on interpolated normals break with MSAA (three-mesh-bvh disables AA).[^mesh-bvh]
- Optional offline-quality path tracing in the browser: three-gpu-pathtracer.[^pathtracer][^report]

# Recommendations

**[INFERRED]** (research-note proposals):[^srr]
1. **Minimum lobe width** for instanced stones/sequins = max of (a) light angular radius, (b)
   half-vector variation across the stone's pixel footprint (Kaplanyan-style), (c) half-vector change
   per frame at current camera/light angular velocity; renormalise so the integral is unchanged. (c)
   makes each flash last a few frames at constant energy.
2. **Separate HDR "sparkle" target** excluded from TAA neighbourhood clamping (clamping treats an
   isolated HDR pixel as an outlier: flicker or dimming); MSAA 4× for geometry, analytic coverage for
   stone splats; composite sparkle after TAA/TSR if used.
3. **Idle refinement**: when camera, lights and garment are still, progressive jittered accumulation
   without clamping (16–64 frames to a reference-quality still).
4. **Energy-preserving clamps only**: minimum splat size with area-scaled radiance, minimum lobe
   width; confine luminance weighting/firefly suppression to the first bloom downsample.
5. **HDR**: linear scene-referred 16-bit float (or R11G11B10F); sparkle peaks reach 10^2–10^4 × diffuse
   white with small lights, so 8-bit or clamped intermediates destroy the effect.
6. **Bloom/glare before tone mapping, per channel**, or coloured fire desaturates to white halos.
   Threshold-free bloom for the veil; star/streak glare in the
   [observer model](/engineering/rendering/sparkle/observer-and-glare-model.md).
7. **Exposure** from the garment's diffuse level (sparkles are meant to clip); auto-exposure must
   ignore the sparkle layer or it pumps.

The PoC renders to a 4× MSAA half-float target with bloom (strength 0.18) and Neutral tone mapping,
no TAA and no separate sparkle layer ([stones component](/engineering/poc/stones.md)).

Gaps: no quantification of real rhinestone radiance vs diffuse white under arena light; Kawase streak
filter unverified.[^srr]

[^srr]: Research notes: real-time sparkle rendering, section 6 (in-bundle mirror)
[^report]: Research report, lighting and observer section (in-bundle mirror)
[^kaplanyan2016]: Kaplanyan et al. 2016
[^tokuyoshi2019]: Tokuyoshi & Kaplanyan 2019
[^chermain2021]: Chermain et al. 2021
[^deliot2023]: Deliot & Belcour 2023
[^kk2025]: Kneiphof & Klein 2025
[^karis2014]: Karis 2014
[^yang2020]: Yang et al. 2020
[^karis-tonemap]: Karis, Graphic Rants
[^jimenez2014]: Jimenez 2014
[^learnopengl-bloom]: LearnOpenGL bloom article
[^ue-bloom]: Epic bloom docs
[^chrome-129]: Chrome WebGPU 129 notes
[^mdn-features]: MDN GPUSupportedFeatures
[^mesh-bvh]: three-mesh-bvh diamond.js
[^pathtracer]: three-gpu-pathtracer (cited in the report)
