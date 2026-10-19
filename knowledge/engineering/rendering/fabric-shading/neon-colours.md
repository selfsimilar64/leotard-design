---
type: Technique
title: Neon and fluorescent fabric colours
description: "Fluorescent leotard colours are physically brighter than any reflectance-only RGB albedo allows; emulate with a lighting-responsive fluorescence gain, a wide-gamut working space and Display P3 output, under a colour-preserving tone mapper (Khronos PBR Neutral)."
tags: [rendering, colour, neon, tone-mapping]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-shade
    resource: /references/research/realtime-fabric-shading.md
    title: "Research notes: real-time fabric shading, question 11"
    author: claude-code/claude-opus-5-5
  - id: notes-fab
    resource: /references/research/fabrics-and-materials.md
    title: "Research notes: fabrics and materials, question 9"
    author: claude-code/claude-opus-5-5
  - id: report
    resource: /references/research/research-report.md
    title: "Research report, PBR section"
    author: claude-code/claude-opus-5-5
  - id: jung-2019
    resource: https://rgl.epfl.ch/publications/Jung2019Wide
    title: "Jung et al.: Wide Gamut Spectral Upsampling with Fluorescence (EGSR 2019)"
    author: team:jung-wilkie-hanika-jakob-dachsbacher
  - id: khronos-neutral
    resource: https://www.khronos.org/news/press/khronos-pbr-neutral-tone-mapper-released-for-true-to-life-color-rendering-of-3d-products
    title: Khronos PBR Neutral tone mapper press release (16 May 2024)
    author: org:khronos
  - id: neutral-spec
    resource: https://github.com/KhronosGroup/ToneMapping/blob/main/PBR_Neutral/README.md
    title: Khronos PBR Neutral specification
    author: org:khronos
  - id: mdn-p3
    resource: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawingBufferColorSpace
    title: MDN WebGL drawingBufferColorSpace
    author: org:mdn
  - id: mdn-webgpu-configure
    resource: https://developer.mozilla.org/en-US/docs/Web/API/GPUCanvasContext/configure
    title: MDN GPUCanvasContext.configure
    author: org:mdn
  - id: sp-fabric
    resource: https://teamwear.sylviap.com.au/pages/fabric-options
    title: Sylvia P fabric options (New Fluro Colours)
    author: org:sylvia-p
  - id: sw-21269
    resource: https://www.spandexworld.com/c3/catalog/product/21269
    title: Spandex World Liquid Mystique (Black Light Reactive)
    author: org:spandex-world
---

# Takeaway

**Neon fabrics are common in the catalogues and physically impossible for a normal material to show:
the gamut of valid reflectance spectra is smaller than what fluorescent dyes achieve, because
fluorescence re-emits absorbed light.**[^jung-2019][^report] Fluorescent and UV-reactive options exist
for plain and foil fabrics (GK Fluorescent Lime and Pink mystique, fluorescent Primatex; Sylvia P "New
Fluro Colours"; "(Black Light Reactive)" Liquid Mystique).[^notes-fab][^sp-fabric][^sw-21269] No source
quantifies how far textile neons fall outside sRGB or Display P3.[^notes-shade]

# Recipe (**[INFERRED]**, the researchers' proposal)

1. Wide-gamut working space; output Display P3 where supported (WebGL `drawingBufferColorSpace` accepts
   `display-p3`, Baseline since October 2024; WebGPU canvases accept `display-p3` and an `extended` HDR
   tone-mapping mode, shipped in Chrome 129), with explicit gamut mapping for sRGB screens.[^mdn-p3][^mdn-webgpu-configure][^notes-shade]
2. A **fluorescence gain** term: an albedo-like colour allowed above the energy-conserving limit in the
   emission band, or emission proportional to incident irradiance. Not a fixed emissive, so it still
   responds to lighting.[^notes-shade]
3. SDR displays compress the result; HDR-capable WebGPU canvases can show the extra luminance directly.

# Tone mapping that preserves product colour

Khronos PBR Neutral (May 2024, for e-commerce and CAD) reproduces base colours 1:1 up to about 0.8 and
only compresses highlights; every channel between 0.08 and 0.8 maps to itself minus 0.04; hue is
preserved; ACES washes out bright yellow, green and cyan; AgX drives bright colours toward
white.[^khronos-neutral][^neutral-spec] Proposed default: linear working space, PBR Neutral, exposure set
so a white diffuse surface under the reference environment lands near 0.8, plus a neutral "colour
check" lighting preset; AgX as a "photographic" option; bloom off in accurate mode.[^notes-shade]

**Open design point:** PBR Neutral is specified for sRGB/Rec.709 SDR only, so the wide-gamut and HDR
paths need a different or extended operator.[^notes-shade] Safari and Firefox support for P3 and
extended canvases was not confirmed.[^notes-shade]

[^notes-shade]: Research notes: real-time fabric shading, Q11 findings, inferences and gaps
[^notes-fab]: Research notes: fabrics and materials, Q9 fluorescent finding
[^report]: Research report, PBR section
[^jung-2019]: Jung et al. 2019 paper page
[^khronos-neutral]: Khronos PBR Neutral press release
[^neutral-spec]: PBR Neutral specification
[^mdn-p3]: MDN drawingBufferColorSpace
[^mdn-webgpu-configure]: MDN GPUCanvasContext.configure
[^sp-fabric]: Sylvia P fabric options
[^sw-21269]: Spandex World product 21269
