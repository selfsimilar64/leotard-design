---
type: Technique
title: Starting parameter values per fabric (guesses)
description: "Proposed roughness, anisotropy, sheen, coat, foil, thin-film and fuzz starting values per fabric family from the shading research, beside the values the proof of concept actually uses; all are unmeasured guesses to be tuned against swatches."
tags: [rendering, fabric, parameters]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-shade
    resource: /references/research/realtime-fabric-shading.md
    title: "Research notes: real-time fabric shading, questions 3-6, 9 and 15"
    author: claude-code/claude-opus-5-5
  - id: poc-fabric
    resource: "poc-threejs/src/fabric.js at the project root (read 2026-10-15)"
    title: Proof-of-concept fabric presets (FABRICS table, applyFabric)
    author: claude-code/claude-opus-5-5
  - id: khr-iri
    resource: https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_iridescence/README.md
    title: glTF KHR_materials_iridescence
    author: org:khronos
  - id: notes-fab
    resource: /references/research/fabrics-and-materials.md
    title: "Research notes: fabrics and materials, questions 3 and 9"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Every number here is a starting guess, not a measurement: the shading research proposed them "from
general shading experience", and no measured optical data exists for any leotard
fabric.**[^notes-shade][^notes-fab] Use them to seed presets, then tune by eye against swatches
([calibration](/engineering/rendering/fabric-shading/calibration-against-swatches.md)). Defaults are
not portable between renderers: Filament's own two documents disagree on the cloth `sheenColor`
default.[^notes-shade]

# Research proposals vs proof of concept

Roughness is perceptual (three.js convention). "PoC" values are from the `FABRICS` table in
`poc-threejs/src/fabric.js`.[^poc-fabric]

| Family | Research starting values[^notes-shade] | PoC preset[^poc-fabric] |
|---|---|---|
| Matte tricot | roughness 0.55-0.75; anisotropy 0-0.2; sheen 0.1-0.3 | roughness 0.8, sheen 0.4 (sheenRoughness 0.6), knit 1 |
| Shiny tricot | roughness 0.30-0.45; anisotropy 0.3-0.6 along wale/course; optional second lobe roughness ≈ 0.6, weight ≈ 0.3; little or no sheen | roughness 0.4, anisotropy 0.6, sheen 0.2 |
| Wet look | shiny base roughness 0.25-0.35; coat weight 0.6-1.0, coat roughness 0.05-0.15; smooth coat normal | roughness 0.36, clearcoat 1, clearcoatRoughness 0.1, anisotropy 0.3 |
| All-over foil | metalness 1, F0 = foil colour, roughness 0.2-0.35, crinkle normal | metalness 1, roughness 0.2, bump amp 0.45 at 2.8 mm |
| Foil dots (mystique) | foil roughness 0.2-0.35; own crinkle normal; dot-edge bevel | base roughness 0.62; flake pitch 0.75 mm, radius 0.4 cell, presence 0.97, tilt 0.22, foil roughness 0.27 |
| Hologram | grating period on the order of 1 µm; 4-8 orders | flake pitch 0.9 mm (dots) / 4.5 mm (shattered glass); holo share 0.6-0.9 |
| Pearlescent film | weight 0.2-0.5, thickness 250-400 nm with low-frequency noise, film IOR 1.3-1.5 | metalness 1, roughness 0.24, iridescence 1, **IOR 1.8**, thickness 200-520 nm |
| Colour-shift foil | full weight over metal, constant thickness about 300-600 nm, low roughness | — |
| Smooth velvet | dark diffuse; fuzz weight ≈ 1, roughness 0.3-0.5, sheen colour lighter than base; GGX roughness ≥ 0.8; no coat; pile lean k 0.2-0.6 | base colour x0.42, roughness 1, sheen 1, sheenRoughness 0.4, low bump; no pile direction |
| Crushed velvet | as velvet + flow map; lower fuzz roughness; slight anisotropic GGX | sheenRoughness 0.3, bump amp 0.7 at 7 mm |
| Sheer mesh | α₀ from coverage; view-angle correction (see mesh concept) | roughness 0.75, sheen 0.3; hole pitch 0.7 mm, hole radius 0.35 cell |
| Mannequin body | mid-grey or soft-white dielectric, roughness 0.5-0.6, no subsurface | (body shading is outside this concept) |

glTF iridescence defaults for comparison: IOR 1.3, thickness 100-400 nm.[^khr-iri] The PoC's film IOR
of 1.8 sits outside the research range; **[INFERRED]** probably tuned by eye for a stronger effect.

# Scales that are better grounded

- Knit normal-map pitch 0.2-0.4 mm, consistent with Carvico Vita's stitch density (wale pitch about
  0.38 mm, course pitch about 0.23 mm); the PoC uses 0.35 mm.[^notes-shade][^notes-fab][^poc-fabric]
- Minimum roughness clamp 0.045 (three.js and Filament).[^notes-shade]

[^notes-shade]: Research notes: real-time fabric shading (Q3-Q6 inferences, Q9, Q12, Q15 table and gaps)
[^poc-fabric]: poc-threejs/src/fabric.js, FABRICS and applyFabric
[^khr-iri]: glTF KHR_materials_iridescence
[^notes-fab]: Research notes: fabrics and materials, Q3 and Q9 stitch-density inference
