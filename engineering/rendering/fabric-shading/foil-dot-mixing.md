---
type: Technique
title: Foil-dot (mystique) mixing
description: "Shade mystique as a pattern-space dot mask that mixes a metal foil BRDF with the dyed-fabric BRDF; when dots shrink below a pixel, sum both lobes by coverage rather than averaging their parameters, and lower coverage under stretch."
tags: [rendering, fabric, foil, mystique]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-shade
    resource: /references/research/realtime-fabric-shading.md
    title: "Research notes: real-time fabric shading, questions 4 and 15"
    author: claude-code/claude-opus-5-5
  - id: notes-fab
    resource: /references/research/fabrics-and-materials.md
    title: "Research notes: fabrics and materials, questions 4 and 9"
    author: claude-code/claude-opus-5-5
  - id: openpbr
    resource: https://academysoftwarefoundation.github.io/OpenPBR/
    title: OpenPBR Surface specification
    author: org:academy-software-foundation
  - id: substrate
    resource: https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-substrate-materials-in-unreal-engine
    title: Unreal Substrate overview
    author: org:epic-games
  - id: lean
    resource: https://userpages.cs.umbc.edu/olano/papers/lean/
    title: LEAN Mapping (Olano and Baker, I3D 2010)
    author: team:olano-baker
  - id: castano
    resource: https://www.ludicon.com/castano/blog/articles/computing-alpha-mipmaps/
    title: Castaño, Computing Alpha Mipmaps (2010)
    author: team:castano
---

# Takeaway

**Mystique is a spatial mix of two materials, foil metal and dyed knit, driven by a dot mask; the mix
itself is standard, the hard part is what happens when dots get smaller than a pixel.**[^notes-shade]
The domain fabric: [mystique](/domain/fabrics/mystique-foil-dot.md).

# Standard part

OpenPBR's base is a statistical mix of dielectric and metal weighted by `base_metalness`, so a metalness
mask texture is the standard representation of a patterned metal layer;[^openpbr] Unreal Substrate's
Horizontal Blend mixes two slabs by a mask, each additional BSDF per pixel adding proportional
cost.[^substrate]

# Recipe (**[INFERRED]**, the researchers' proposal)

1. Dot mask M in pattern space (not mesh UVs), with coverage-preserving mips.[^notes-shade][^castano]
2. `material = mix(dyed fabric BRDF, foil BRDF, M)`; foil = metalness 1, F0 = foil colour, roughness
   0.2-0.35, its own fine crinkle normal map; a small bevel in the normal at dot edges.[^notes-shade]
3. Close-up the mask is binary, so one lobe set is evaluated per pixel. When dots minify the filtered
   mask becomes fractional and the correct result is a **weighted sum of both lobes** (two specular
   evaluations), not one lobe with averaged roughness and metalness. Cost: about one extra specular
   lobe and one extra environment lookup where 0 < M < 1.[^notes-shade]
4. LEAN-style filtering of foil micro-wrinkles and dot edges turns sub-pixel ridges into anisotropic
   highlights instead of aliasing.[^lean]
5. Base and foil colours are independent parameters (two-tone colourways read as one hue in shadow and
   another in highlight).[^notes-fab]

# Behaviour under stretch and wear

Dots are flat foil on a stretch base: under strain the gaps widen and coverage drops, roughly a mask
coverage scale of 1/J (J = area stretch ratio), with optional crack masks for all-over foil.[^notes-shade]
Sources describe dulling and loss, never cracking, and none quantifies the change.[^notes-fab] A "worn"
preset could lower flake reflectance and coverage at underarms, over heat-set crystals and where fabric
rubs.[^notes-fab] See [stretch-dependent appearance](/engineering/rendering/fabric-shading/stretch-dependent-appearance.md).

# Unknowns

No dot diameter, pitch or coverage is published for any mystique; values must be fitted from swatch
photographs.[^notes-fab] The proof of concept takes a different far-field shortcut (single lobe with
averaged parameters plus pixel-sized tilted cells to keep sparkle); see
[fabric shader](/engineering/poc/fabric-shader.md).

[^notes-shade]: Research notes: real-time fabric shading, Q4 inferences and Q15 table
[^notes-fab]: Research notes: fabrics and materials, Q4 inferences and gaps, Q9
[^openpbr]: OpenPBR Surface specification
[^substrate]: Unreal Substrate overview
[^lean]: LEAN Mapping page
[^castano]: Castaño, Computing Alpha Mipmaps
