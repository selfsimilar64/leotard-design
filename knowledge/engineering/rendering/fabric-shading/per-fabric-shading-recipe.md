---
type: Technique
title: Per-fabric shading recipe
description: "One forward-shaded material built from a GGX base plus optional layers (sheen/fuzz, anisotropy, clear coat, thin film, diffraction, coverage) renders every leotard fabric family; which layers each family needs, which ship in three.js and which are custom."
tags: [rendering, fabric, pbr, shading]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-shade
    resource: /references/research/realtime-fabric-shading.md
    title: "Research notes: real-time fabric shading, questions 1, 2, 14 and 15"
    author: claude-code/claude-opus-5-5
  - id: report
    resource: /references/research/research-report.md
    title: "Research report, PBR section"
    author: claude-code/claude-opus-5-5
  - id: openpbr
    resource: https://academysoftwarefoundation.github.io/OpenPBR/
    title: OpenPBR Surface specification v1.1.1 (2026-04-17)
    author: org:academy-software-foundation
  - id: threejs-physical
    resource: https://threejs.org/docs/pages/MeshPhysicalMaterial.html
    title: three.js MeshPhysicalMaterial docs
    author: org:threejs
  - id: threejs-r186
    resource: https://github.com/mrdoob/three.js/releases/tag/r186
    title: three.js r186 release notes (24 Sep 2026)
    author: org:threejs
  - id: filament
    resource: https://google.github.io/filament/Filament.md.html
    title: Filament design document
    author: org:google
  - id: khr-sheen
    resource: https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_sheen/README.md
    title: glTF KHR_materials_sheen
    author: org:khronos
  - id: gltf-registry
    resource: https://github.com/KhronosGroup/glTF/blob/main/extensions/README.md
    title: glTF extensions registry
    author: org:khronos
  - id: chen-2024
    resource: https://arxiv.org/abs/2406.17782
    title: "Chen, Wang, Wang: Real-time Neural Woven Fabric Rendering (SIGGRAPH 2024)"
    author: team:chen-wang-wang
  - id: rtstitch
    resource: https://kuiwuchn.github.io/rtstitch.html
    title: "Real-Time Knit Deformation and Rendering (SIGGRAPH 2025)"
    author: team:huang-et-al
  - id: belcour
    resource: https://belcour.github.io/blog/research/publication/2017/05/01/brdf-thin-film.html
    title: "Belcour and Barla 2017, thin-film iridescence"
    author: team:belcour-barla
  - id: substrate
    resource: https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-substrate-materials-in-unreal-engine
    title: Unreal Substrate overview
    author: org:epic-games
  - id: hdrp-fabric
    resource: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/fabric-master-stack-reference.html
    title: Unity HDRP Fabric master stack
    author: org:unity
---

# Takeaway

**A standard GGX metallic-roughness base is the right foundation but not enough for cloth; each
fabric family adds one or two well-known layers, and all eleven families fit one forward-shaded
material at interactive rates without research cloth models, neural networks, ray tracing or
WebGPU-only features.**[^notes-shade][^report] That conclusion rests on counting lobes and texture
lookups, not on measurement.[^notes-shade] Under the owner's "appears correct" target
([decision](/decisions/2026-10-13-appears-correct-not-physically-correct.md)) the layers are a toolkit
for convincing looks, not a physics obligation.

# Why plain GGX fails for cloth

Seven ways (**[INFERRED]**, the researchers' analysis):[^notes-shade] (1) no grazing-angle fibre
scatter (needs sheen); (2) highlights tinted by dye rather than dielectric Fresnel; (3) rough
single-scatter GGX darkens matte fabric unless energy-compensated; (4) thread or pile direction makes
highlights anisotropic; (5) sheers need coverage and diffuse transmission; (6) sub-pixel yarn relief
aliases; (7) filament fabrics show a sharp highlight on a broad one. Smooth nylon/spandex tricot is
closer to a hard surface than the cotton/wool these cloth models target, so expect a GGX-dominant fit
with low sheen; velvet is the opposite.[^notes-shade]

# Layer stack

OpenPBR Surface v1.1.1 (April 2026) defines base, metal, coat, fuzz, thin film and thin-walled
transmission in one energy-consistent stack and is the safest authoring parameterisation.[^openpbr]
The glTF KHR extensions cover the same except diffuse transmission (still Release Candidate) and LTC
fuzz.[^gltf-registry] three.js `MeshPhysicalMaterial` (r186) ships sheen (Charlie distribution with
Neubelt visibility), anisotropy, clearcoat, iridescence, transmission, dispersion and new
retroreflectivity; each enabled effect adds per-pixel cost.[^threejs-physical][^threejs-r186][^khr-sheen]

# Recipe per family

| Fabric family | Layers | three.js status | Est. cost vs plain GGX+IBL |
|---|---|---|---|
| [Matte tricot](/domain/fabrics/matte-tricot.md) | GGX dielectric + multi-scatter compensation + low-weight sheen; knit normal/roughness at physical scale | Off the shelf | ~1.2x |
| [Shiny tricot](/domain/fabrics/shiny-tricot-and-wet-look.md) | Anisotropic GGX along the grain, optional second broader lobe; bent-normal IBL | Off the shelf (second lobe not in three.js) | ~1.3-1.6x |
| Wet look / cire | Shiny base + clear coat with its own smooth normal; coat darkening | Off the shelf | ~1.8x |
| [All-over foil](/domain/fabrics/solid-metallic-foil.md) | GGX conductor, crinkle normal, specular AA | Off the shelf | ~1x |
| [Mystique](/domain/fabrics/mystique-foil-dot.md) | Mask-driven mix of foil and dyed base; both lobes where the mask is fractional | Custom ([foil-dot mixing](/engineering/rendering/fabric-shading/foil-dot-mixing.md)) | 1x close, up to ~2x minified |
| [Hologram](/domain/fabrics/hologram-foils.md) | Foil + diffraction grating lobe with orientation/period maps | Custom ([diffraction](/engineering/rendering/fabric-shading/holographic-diffraction.md)) | ~2-3x |
| Iridescent / pearlescent film | Belcour-Barla thin film on dielectric or metal | Off the shelf (`iridescence`) | ~1.4x |
| [Smooth velvet](/domain/fabrics/stretch-velvet.md) | Dark diffuse + dominant fuzz with pile-tilted normal | Sheen off the shelf; tilt custom ([velvet pile](/engineering/rendering/fabric-shading/velvet-pile.md)) | ~1.3x; shells xN close-up |
| Crushed velvet | As above + flow map + slight anisotropic GGX | Custom | ~1.5x |
| [Sheer mesh](/domain/fabrics/stretch-mesh-and-illusion.md) | Coverage with angle correction, composited over skin in-shader | Custom ([mesh over skin](/engineering/rendering/fabric-shading/mesh-over-skin-blend.md)) | ~1.5-2x |
| [Sublimation print](/domain/fabrics/sublimation-printing.md) | Matte or shiny base with artwork as base colour; colour-managed; strain "grin" term | Off the shelf except strain term | ~1.2x |

Costs are engineering estimates, not measurements; they must be replaced by profiling on target
hardware.[^notes-shade] Published anchors: two BSDFs per pixel cost twice one (Substrate).[^substrate]
Precedents: Unity HDRP "Silk" is plain anisotropic GGX; "Cotton/Wool" is Charlie sheen.[^hdrp-fabric]
Starting numbers: [starting parameter values](/engineering/rendering/fabric-shading/starting-parameter-values.md).

# Custom work no engine provides

Two-lobe foil-dot mixing under minification; diffraction lobe and its IBL approximation; LTC fuzz and
pile-tilt/flow-map velvet; shells; strain-driven appearance; mesh-over-skin compositing;
variance-to-roughness mip baking; fluorescence gain for [neon](/engineering/rendering/fabric-shading/neon-colours.md).
All are fragment-shader arithmetic plus textures, so none forces WebGPU.[^notes-shade]

# Why not research cloth models

The best neural woven-fabric model runs about 60 fps at 1080p only on an RTX 3090 and excludes
knits;[^chen-2024] real-time yarn-level knit rendering takes 23.6 ms per frame on the same
card.[^rtstitch] No model or measurement specific to nylon/elastane warp-knit tricot was found
(**not found**, not "does not exist").[^notes-shade] **[INFERRED]** Tricot loops are sub-millimetre and
sub-pixel at garment distance, so they reduce to a mean anisotropic NDF plus a close-up detail map.[^notes-shade]

Other inputs: thin film per Belcour and Barla, the model behind glTF, OpenPBR and three.js
iridescence;[^belcour] Filament's cloth model (Charlie D, Neubelt V, F = sheenColor).[^filament]

[^notes-shade]: Research notes: real-time fabric shading, questions 1, 2, 14, 15
[^report]: Research report, "Physically based rendering is the right foundation"
[^openpbr]: OpenPBR Surface specification
[^threejs-physical]: three.js MeshPhysicalMaterial docs
[^threejs-r186]: three.js r186 release notes
[^filament]: Filament design document
[^khr-sheen]: glTF KHR_materials_sheen
[^gltf-registry]: glTF extensions registry
[^chen-2024]: Chen et al. 2024, arXiv:2406.17782
[^rtstitch]: Huang et al. 2025 project page
[^belcour]: Belcour and Barla 2017
[^substrate]: Unreal Substrate overview
[^hdrp-fabric]: Unity HDRP Fabric master stack
