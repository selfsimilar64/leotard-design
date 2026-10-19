---
type: Technique
title: Calibrating fabric materials against physical swatches
description: "Because no optical data exists for leotard fabrics, tune each preset by eye or optimisation against photographs and video of real swatches: flatbed scan, multi-light photos, backlit shots, shots at known stretch, a moving-light cylinder video and a colour target in every shot."
tags: [rendering, fabric, calibration, acquisition]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-shade
    resource: /references/research/realtime-fabric-shading.md
    title: "Research notes: real-time fabric shading, questions 2, 13 and 15"
    author: claude-code/claude-opus-5-5
  - id: notes-fab
    resource: /references/research/fabrics-and-materials.md
    title: "Research notes: fabrics and materials, question 9"
    author: claude-code/claude-opus-5-5
  - id: report
    resource: /references/research/research-report.md
    title: "Research report, introduction and gaps"
    author: claude-code/claude-opus-5-5
  - id: u3m
    resource: https://github.com/vizoogmbh/u3m
    title: U3M repository (Vizoo)
    author: org:vizoo
  - id: axf
    resource: https://www.xrite.com/axf
    title: X-Rite AxF
    author: org:x-rite
  - id: substance-sampler
    resource: https://www.adobe.com/products/substance3d/apps/sampler.html
    title: Adobe Substance 3D Sampler
    author: org:adobe
  - id: eurojersey-3d
    resource: https://www.sensitivefabrics.it/en/3d-digital-library/
    title: Eurojersey 3D Digital Library
    author: org:eurojersey
  - id: browzwear-fab
    resource: https://browzwear.com/products/fabric-analyzer
    title: Browzwear Fabric Analyzer
    author: org:browzwear
---

# Takeaway

**Every fabric setting is a guess until it is matched to a real swatch; the first thing to build is one
stress-test scene judged against physical fabric swatches.**[^report] Under the owner's "appears correct"
target ([decision](/decisions/2026-10-13-appears-correct-not-physically-correct.md)) the judge is the
eye, side by side with the swatch under the same light, not a measured BRDF. Swatches are cheap: GK free
up to 5, Snowflake $0.25 each, The Lineup free.[^notes-fab]

# Why commercial capture does not cover leotard fabrics

Industry digitisation (Vizoo xTex / U3M, X-Rite TAC7 / AxF, SEDDI Textura, Frontier.cool, Substance 3D
Sampler) outputs base colour, normal, roughness, displacement, alpha, sometimes metalness; mechanical
testers (Browzwear Fabric Analyzer) measure bend, thickness and stretch but nothing
optical.[^u3m][^axf][^substance-sampler][^browzwear-fab][^notes-shade] **[INFERRED]** Matte and shiny
solids, prints and (with backlit alpha) mesh map well; foil dots partly; holographic foil, iridescent
film, velvet pile direction and anything strain-dependent have no slot, so those need parametric presets
tuned to reference.[^notes-shade] Eurojersey publishes digital twins for CLO and Browzwear on request,
but leotard specialities (mystique, hologram, stretch velvet) cannot be assumed available.[^eurojersey-3d][^notes-shade]

# DIY capture for a small team (**[INFERRED]**, the researchers' proposal)

1. Flatbed scan at known dpi for base colour and scale (flat matte fabrics only).
2. Photometric stereo: fixed camera, 4-8 light directions, cross-polarised to separate diffuse and
   specular, for normal and roughness.
3. Backlit shot for mesh alpha/coverage.
4. Repeat 1-3 with the swatch clamped at known strains (e.g. 0, 25, 50, 75%) over black and skin-tone
   backings, for [stretch-dependent appearance](/engineering/rendering/fabric-shading/stretch-dependent-appearance.md).
5. Short video of the swatch on a cylinder under a moving point light, to fit anisotropy, sheen,
   thin-film or grating parameters by eye or optimisation.
6. A colour target in every shot. Then tile, de-light, and build roughness mips with normal variance.

All from the notes.[^notes-shade] Offline alternative: render a tricot swatch with a research knit model
and fit the real-time model's roughness, anisotropy, sheen and normal amplitude to it.[^notes-shade]

# Reference imagery already identified

Studio swatch photographs from Sylvia P (Matt Lycra, Mystique, Mesh, Fog Mesh, Wet Look, Diamond Mesh),
Quatro catalogue pp.118-119, GK catalogue pp.126-128, and garment shots from Quatro and GK p.117; URLs in
the research notes, question 9.[^notes-fab] Caveat from a maker: "Colors shown on the website are
representational only".[^notes-fab]

[^notes-shade]: Research notes: real-time fabric shading, Q2 inferences, Q13, Q15
[^notes-fab]: Research notes: fabrics and materials, Q9 findings and gaps
[^report]: Research report, introduction and gaps table
[^u3m]: U3M repository
[^axf]: X-Rite AxF
[^substance-sampler]: Adobe Substance 3D Sampler
[^eurojersey-3d]: Eurojersey 3D Digital Library
[^browzwear-fab]: Browzwear Fabric Analyzer
