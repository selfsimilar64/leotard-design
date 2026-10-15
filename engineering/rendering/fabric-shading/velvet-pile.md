---
type: Technique
title: Velvet pile shading
description: "Shade velvet with a dominant sheen/fuzz lobe over a dark base, tilt that lobe by a per-panel nap direction so the fabric reads lighter or darker with the pile, drive the direction with a flow map for crushed velvet, and reserve shell rendering for close-ups."
tags: [rendering, fabric, velvet, sheen]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-shade
    resource: /references/research/realtime-fabric-shading.md
    title: "Research notes: real-time fabric shading, questions 1 and 6"
    author: claude-code/claude-opus-5-5
  - id: estevez-kulla
    resource: https://blog.selfshadow.com/publications/s2017-shading-course/imageworks/s2017_pbs_imageworks_sheen.pdf
    title: "Estevez and Kulla: Production Friendly Microfacet Sheen BRDF (SIGGRAPH 2017 course)"
    author: team:estevez-kulla
  - id: zeltner
    resource: https://tizianzeltner.com/projects/Zeltner2022Practical/
    title: "Zeltner, Burley, Chiang: Practical Multiple-Scattering Sheen Using LTCs (SIGGRAPH 2022 Talks)"
    author: team:zeltner-burley-chiang
  - id: ltc-sheen
    resource: https://github.com/tizian/ltc-sheen
    title: tizian/ltc-sheen (Apache-2.0)
    author: team:zeltner
  - id: openpbr
    resource: https://academysoftwarefoundation.github.io/OpenPBR/
    title: OpenPBR Surface specification
    author: org:academy-software-foundation
  - id: filament
    resource: https://google.github.io/filament/Filament.md.html
    title: Filament design document
    author: org:google
  - id: lengyel
    resource: https://hhoppe.com/proj/fur/
    title: "Lengyel, Praun, Finkelstein, Hoppe: Real-time fur over arbitrary surfaces (I3D 2001)"
    author: team:lengyel-et-al
  - id: babylon-fur
    resource: https://doc.babylonjs.com/toolsAndResources/assetLibraries/materialsLibrary/furMat
    title: Babylon.js Fur material
    author: org:babylonjs
  - id: hdrp-fabric-src
    resource: https://github.com/Unity-Technologies/Graphics/blob/master/Packages/com.unity.render-pipelines.high-definition/Runtime/Material/Fabric/Fabric.hlsl
    title: Unity HDRP Fabric.hlsl
    author: org:unity
---

# Takeaway

**Velvet is the one family where the sheen/fuzz lobe carries the appearance and GGX is secondary:
strong fuzz over a dark base, tilted by the nap direction, is what makes it read as velvet.**[^notes-shade]
The fuzz lobe is off the shelf (three.js sheen); pile direction, crushed-velvet flow and close-up shells
are custom.[^notes-shade] Domain fabric: [stretch velvet](/domain/fabrics/stretch-velvet.md).

# Published lobes

- Estevez-Kulla "Charlie" sheen targets velvet-like fibres oriented along the normal, giving back-scatter
  and a soft grazing highlight; D(m) = (2 + 1/r)·sin^(1/r)θ / (2π); layered by albedo scaling.[^estevez-kulla]
- Zeltner et al. 2022 LTC sheen adds the multiple and backward scattering the earlier model lacked; low
  roughness = fuzzy, high = dusty; tables and fitting code Apache-2.0.[^zeltner][^ltc-sheen] It is
  OpenPBR's recommended fuzz.[^openpbr] No web engine was confirmed to ship it; it would be a custom
  port.[^notes-shade]
- Filament's cloth model descends from Ashikhmin's velvet distribution, with a `sheenColor` for two-tone
  fabric and wrap-diffuse "subsurface colour".[^filament] Unity HDRP fits a Charlie LTC so the lobe works
  under area lights.[^hdrp-fabric-src]

# Recipe (**[INFERRED]**, the researchers' proposal; tilt and flow are game-art practice, unsourced)

1. Smooth velvet: diffuse at dye colour kept dark; fuzz weight near 1, roughness 0.3-0.5, sheen colour
   lighter than base; weak rough GGX (roughness ≥ 0.8); no clear coat.
2. Nap: evaluate the fuzz with a tilted normal `n' = normalize(n + k·p)`, p = pile direction in the
   tangent plane, k = lean about 0.2-0.6. The fabric then reads lighter or darker with or against the
   nap, and a designer can flip nap per pattern piece (matching the trade rule that all velvet pieces
   are cut the same way up).
3. Crushed velvet: replace constant p with a flow map (RG direction, B lean) of patchy high-contrast
   direction changes (domain-warped noise or painted); lower fuzz roughness; a little anisotropic GGX for
   glassy streaks.
4. Close-up shells: 8-16 shells over a sub-millimetre pile with an alpha-tested fibre-density texture,
   enabled only within a distance threshold and only on velvet panels; cap about 8 on integrated
   graphics or use parallax occlusion; fins only at silhouettes.[^lengyel][^babylon-fur]
5. Stretch thins the pile; reuse the [stretch](/engineering/rendering/fabric-shading/stretch-dependent-appearance.md)
   coverage term.

Cost: sheen and tilted normals trivial in WebGL2/WebGPU (~1.3x); shells are the most fill-rate-hungry
technique in the survey.[^notes-shade]

**Gaps:** no peer-reviewed real-time model for crushed velvet or pile direction; no shell-rendering
timings on integrated GPUs; no measured velvet pile height.[^notes-shade]

[^notes-shade]: Research notes: real-time fabric shading, Q1 and Q6
[^estevez-kulla]: Estevez and Kulla 2017 paper PDF
[^zeltner]: Zeltner et al. 2022 project page
[^ltc-sheen]: tizian/ltc-sheen repository
[^openpbr]: OpenPBR Surface specification
[^filament]: Filament design document
[^lengyel]: Lengyel et al. 2001 project page
[^babylon-fur]: Babylon.js Fur material docs
[^hdrp-fabric-src]: Unity HDRP Fabric.hlsl
