---
type: Technique
title: Coloured, iridescent and holographic glitter
description: "Per-flake colour (Kemppinen 2025), thin-film iridescence (Belcour-Barla 2017, glTF KHR_materials_iridescence, three.js), diffraction-grating holographic flakes (no validated real-time glint method) and car-paint flake precedents."
tags: [rendering, glint, iridescence, holographic, thin-film]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: srr
    resource: /references/research/realtime-sparkle-rendering.md
    title: "Research notes: real-time sparkle rendering"
    author: claude-code/claude-opus-5-5
  - id: kemppinen2025
    resource: https://perso.telecom-paristech.fr/boubek/papers/Glinty/
    title: "Kemppinen et al., Evaluating and Sampling Glinty NDFs in Constant Time, 2025"
    author: org:adobe-research
  - id: kk2025
    resource: https://arxiv.org/html/2507.02674v1
    title: "Kneiphof & Klein, Real-time Image-based Lighting of Glints, 2025"
    author: org:uni-bonn
  - id: kk2024
    resource: https://arxiv.org/html/2408.13611v2
    title: "Kneiphof & Klein, Glints with Area Lights, 2024"
    author: org:uni-bonn
  - id: belcour2017
    resource: https://belcour.github.io/blog/research/publication/2017/05/01/brdf-thin-film.html
    title: "Belcour & Barla, A Practical Extension to Microfacet Theory for Varying Iridescence, SIGGRAPH 2017"
    author: org:belcour
  - id: khr-iridescence
    resource: https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_iridescence/README.md
    title: glTF KHR_materials_iridescence
    author: org:khronos
  - id: three-physical
    resource: https://threejs.org/docs/pages/MeshPhysicalMaterial.html
    title: three.js MeshPhysicalMaterial docs
    author: org:threejs
  - id: stam1999
    resource: https://doi.org/10.1145/311535.311546
    title: "Stam, Diffraction shaders, SIGGRAPH 1999"
    author: org:acm
  - id: toisoul2017
    resource: https://doi.org/10.1145/3012001
    title: "Toisoul & Ghosh, Practical Acquisition and Rendering of Diffraction Effects, TOG 2017"
    author: org:acm
  - id: unity-axf
    resource: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@14.0/manual/AxF-Shader.html
    title: Unity HDRP AxF Shader manual
    author: org:unity
  - id: ue58-notes
    resource: https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-5-8-release-notes
    title: Unreal Engine 5.8 release notes
    author: org:epic-games
  - id: clo-glitter
    resource: https://support.clo3d.com/hc/en-us/articles/360011005813-Express-Glitter-ver5-0-0
    title: CLO Help, Express Glitter
    author: org:clo
  - id: bw-substance
    resource: https://help.browzwear.com/en/articles/13065724-substance-presets
    title: Browzwear Help, Substance Presets
    author: org:browzwear
---

# Takeaway

Per-flake colour is now first-class (**Kemppinen 2025**, the only verified method that colours flakes
by construction);[^kemppinen2025] thin-film iridescence has a standard real-time model (**Belcour &
Barla 2017**) adopted by Unity HDRP, glTF and three.js;[^belcour2017][^khr-iridescence][^three-physical]
true holographic (diffraction-grating) glitter has peer-reviewed models (Stam 1999; Toisoul & Ghosh
2017) but **no confirmed combination with a real-time glint BRDF**.[^stam1999][^toisoul2017][^srr]

# Facts

- Kneiphof–Klein 2025 IBL glints model brightness only: nearby coloured lights give white glints;
  their 2024 paper lists glints × iridescence as future work.[^kk2025][^kk2024]
- glTF `KHR_materials_iridescence` (ratified, Belcour–Barla): iridescence factor, thin-film IOR
  (default 1.3), thickness range (default 100–400 nm, optionally textured); two Schlick interfaces,
  phase shift from optical path difference, analytic Fourier-space spectral integration → Rec.709.[^khr-iridescence]
- three.js `MeshPhysicalMaterial`: `iridescence`, `iridescenceIOR` (1.3), `iridescenceThicknessRange`
  ([100, 400]).[^three-physical] (The PoC uses it for AB and holographic spangles:
  [stones component](/engineering/poc/stones.md).)
- Car-paint precedent: Unity HDRP AxF Car Paint = tinted diffuse + Cook–Torrance lobes + a flakes
  term from a measured BTF (Texture2DArray of angular slices via a "ThetaFI slice LUT"), angle-dependent
  colour table, optional clearcoat; fixed half-vector angles for indirect light; flake BTF cannot be
  authored in Unity, only imported.[^unity-axf] UE 5.8 imports X-Rite AxF into Substrate.[^ue58-notes]
- Fashion CAD today: CLO "Glitter (Render Only)" exposes colour, particle count, saturation variation;[^clo-glitter]
  Browzwear Substance "Glitter Print" exposes flake size and randomness (0 = grid), plus "Foil Print".[^bw-substance]

# Recommended constructions

**[INFERRED]** (research-note proposals):[^srr]
- **Coloured glitter**: seeded colour per flake (hue/saturation variation like CLO, or a discrete
  "confetti" palette); with a counting model split the per-pixel count into colour classes
  (multinomial) or hash a colour per grid cell.
- **Iridescent ("AB"/"mystique") flakes**: multiply each flake's Fresnel by Belcour–Barla thin-film
  reflectance at the flake's half-vector angle, with per-flake thickness jitter (tens of nm); one extra
  thin-film evaluation per glint lobe.
- **Holographic flakes** are gratings, not thin films: first-order condition d·(sin θi + sin θo) = mλ;
  per-flake random grating orientation plus a 1D wavelength→RGB lookup gives hard rainbow flashes.
  The researcher's own synthesis — **unvalidated**.
- Prefer procedural statistics over measured AxF slices: designers need continuous control over
  flake size, density and colour; measured slices cannot be edited.
- Because IBL glints lose light colour, represent coloured show lights as explicit lights for the
  sparkle term ([lighting](/engineering/rendering/sparkle/sparkle-lighting.md)).
- Substance-style "Glitter Print" bakes flakes into textures, so it cannot twinkle with view/light
  changes — a demonstrable quality difference for our product.

Holographic fabric shading generally: [/domain/fabrics/](/domain/fabrics/about.md) and
[/references/research/realtime-fabric-shading.md](/references/research/realtime-fabric-shading.md).

[^srr]: Research notes: real-time sparkle rendering, sections 2 and 9 (in-bundle mirror)
[^kemppinen2025]: Kemppinen et al. 2025 project page
[^kk2025]: Kneiphof & Klein 2025
[^kk2024]: Kneiphof & Klein 2024
[^belcour2017]: Belcour & Barla 2017 author page
[^khr-iridescence]: Khronos KHR_materials_iridescence README
[^three-physical]: three.js MeshPhysicalMaterial docs
[^stam1999]: Stam 1999, DOI
[^toisoul2017]: Toisoul & Ghosh 2017, DOI
[^unity-axf]: Unity HDRP AxF manual
[^ue58-notes]: UE 5.8 release notes
[^clo-glitter]: CLO Help, Express Glitter
[^bw-substance]: Browzwear Help, Substance Presets
