---
type: Technique
title: Holographic foil diffraction
description: "Hologram foil is a spatially varying 1D diffraction grating; shade it as a foil lobe plus a first-order grating term (Stam 2004) driven by per-texel groove orientation and period, with a multi-tap environment approximation; hue-ramp tricks are a low-end fallback."
tags: [rendering, fabric, hologram, diffraction]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-shade
    resource: /references/research/realtime-fabric-shading.md
    title: "Research notes: real-time fabric shading, questions 4, 5 and 15"
    author: claude-code/claude-opus-5-5
  - id: toisoul-2018
    resource: https://wp.doc.ic.ac.uk/rgi/project/acquiring-spatially-varying-appearance-of-printed-holographic-surfaces/
    title: "Toisoul, Dhillon, Ghosh: Acquiring Spatially Varying Appearance of Printed Holographic Surfaces (SIGGRAPH Asia 2018)"
    author: team:toisoul-dhillon-ghosh
  - id: toisoul-2017
    resource: https://wp.doc.ic.ac.uk/rgi/project/practical-acquisition-and-rendering-of-diffraction-effects-in-surface-reflectance/
    title: "Toisoul, Ghosh: Practical acquisition and rendering of diffraction effects (ACM TOG 2017)"
    author: team:toisoul-ghosh
  - id: stam
    resource: https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-8-simulating-diffraction
    title: "Stam, Simulating Diffraction, GPU Gems (2004)"
    author: team:stam
  - id: zucconi
    resource: https://www.alanzucconi.com/2017/07/15/cd-rom-shader-1/
    title: Zucconi, CD-ROM shader tutorial (2017)
    author: team:zucconi
  - id: khr-aniso
    resource: https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_anisotropy/README.md
    title: glTF KHR_materials_anisotropy
    author: org:khronos
  - id: belcour
    resource: https://belcour.github.io/blog/research/publication/2017/05/01/brdf-thin-film.html
    title: "Belcour and Barla 2017, thin-film iridescence"
    author: team:belcour-barla
  - id: notes-fab
    resource: /references/research/fabrics-and-materials.md
    title: "Research notes: fabrics and materials, questions 4 and 9"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Holographic foil is a one-dimensional diffraction grating whose groove direction and spacing vary
across the surface; the classic first-order diffraction shader is cheap enough for WebGL2, and
peer-reviewed work shows such surfaces can be captured as orientation and period maps and rendered in
real time.**[^notes-shade][^toisoul-2018][^stam] It is custom work in every engine, and the published
basis covers rigid planar samples only (clothing is mentioned just as an example category).[^notes-shade]
Domain fabric: [hologram foils](/domain/fabrics/hologram-foils.md).

# Published basis

- Toisoul et al. 2018: holographic surfaces (gift bags, holographic paper, clothing, security
  holograms) are 1D gratings with varying period and orientation; 1-5 flash photos (repeated tile) or
  ≥ 4 polarisation images recover per-point orientation and relative period, reproduced in real time
  including under environment light.[^toisoul-2018]
- Toisoul and Ghosh 2017: first-order Huygens-Fresnel approximation with one precomputed diffraction
  lookup table measured from a flash photo.[^toisoul-2017]
- Stam 2004: for grating spacing d, groove tangent T and un-normalised half vector H = L + V,
  reinforced wavelengths are λ = d·|u|/n with u = T·H; sum a three-bump "rainbow" over about 7-8 orders;
  add an anisotropic Ward-style highlight at u = 0.[^stam]
- Zucconi 2017 (game tutorial, ad hoc): same grating equation d·|sinθL − sinθV| = n·λ, orders 1-8,
  cheap fitted spectral colour added to standard PBR.[^zucconi]
- A per-texel direction field already has a standard encoding: glTF anisotropy texture RG = direction,
  B = strength.[^khr-aniso]

# Recipe (**[INFERRED]**, the researchers' proposal)

1. Start from the foil lobe (as in [foil-dot mixing](/engineering/rendering/fabric-shading/foil-dot-mixing.md)).
2. Per-texel grating orientation (RG) and period (B or a constant on the order of 1 µm).
3. Analytic lights: Stam's sum over 4-8 orders.
4. Environment light: for K wavelength samples and orders ±1, perturb the reflection direction along
   the grating tangent by about ±λ/d and sample the prefiltered environment there, with spectral
   weights; K = 3-6 gives 6-12 extra cube-map taps (this IBL shortcut is the researchers' own
   approximation).
5. "Shattered glass" and similar: a cell tessellation with a random grating orientation per cell,
   generated procedurally (cell noise) in the same RG encoding.
6. Cost class: medium for analytic lights, medium-high with the multi-tap IBL term (~2-3x a plain
   material); feasible in WebGL2 and WebGPU.[^notes-shade]

# Cheap look-alikes and the "appears correct" target

A hue ramp indexed by N·V or T·H plus noise is not physically based; the research rejected it as more
than a low-end fallback because it "will not respond correctly when the user moves lights".[^notes-shade]
The owner has since set the target as **appearing** correct
([decision](/decisions/2026-10-13-appears-correct-not-physically-correct.md)), which **[INFERRED]**
reopens cheaper approximations, provided the colour still sweeps plausibly when lights or the body
move. The proof of concept uses such a ramp anchored to the key-light direction
([fabric shader](/engineering/poc/fabric-shader.md)); whether it reads as correct is for the owner to
judge against real swatches.

Related: thin-film iridescence (pearlescent, "opalescence") uses Belcour-Barla, ships in three.js and
gives broad pastel bands; true multilayer dichroic films with narrow saturated bands exceed a
single-film model.[^belcour][^notes-shade] Observed in swatches: GK "Opalescence" looks smoother and
pearlescent than "Sparkle", which looks like coarse multicoloured flakes.[^notes-fab]

**Gaps:** no measurement or model specific to holographic stretch textiles; no frame-time figures for
diffraction shading on integrated GPUs; Stam's 1999 "Diffraction Shaders" and Werner et al. 2017 are
recalled, unverified.[^notes-shade]

[^notes-shade]: Research notes: real-time fabric shading, Q4 and Q5 findings, inferences and gaps
[^toisoul-2018]: Toisoul et al. 2018 project page
[^toisoul-2017]: Toisoul and Ghosh 2017 project page
[^stam]: Stam, GPU Gems chapter 8
[^zucconi]: Zucconi CD-ROM shader, part 1
[^khr-aniso]: glTF KHR_materials_anisotropy
[^belcour]: Belcour and Barla 2017
[^notes-fab]: Research notes: fabrics and materials, Q9 observed swatches
