---
type: Technique
title: Crystal optics look-alike
description: "How to shade a flat-back crystal in real time: low-index faceted dome over a mirror, unfolded into a convex polyhedron for a cheap analytic tracer in close-up, dispersion and AB thin film as presets; web gem renderers (three-mesh-bvh, drei, iJewel3D) as references; the PoC's injected inner-reflection shader."
tags: [rendering, crystal, refraction, dispersion, thin-film]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: srr
    resource: /references/research/realtime-sparkle-rendering.md
    title: "Research notes: real-time sparkle rendering"
    author: claude-code/claude-opus-5-5
  - id: ecs
    resource: /references/research/embellishments-crystals-sequins.md
    title: "Research notes: embellishments, crystals and sequins"
    author: claude-code/claude-opus-5-5
  - id: preciosa-benchmark
    resource: https://img.preciosacomponents.com/files/landingpage/lp-4/downloads/Preciosa_Chaton_Rose_MAXIMA_Benchmark.pdf
    title: Preciosa MAXIMA benchmark sheet (PDF)
    author: org:preciosa
  - id: preciosa-faq
    resource: https://img.preciosacomponents.com/files/landingpage/lp-4/downloads/Preciosa_Chaton_Rose_MAXIMA_Frequently_Asked_Questions_EN.pdf
    title: Preciosa MAXIMA FAQ (PDF)
    author: org:preciosa
  - id: wiki-leadglass
    resource: https://en.wikipedia.org/wiki/Lead_glass
    title: Wikipedia, Lead glass
    author: org:wikipedia
  - id: wiki-diamondcut
    resource: https://en.wikipedia.org/wiki/Diamond_cut
    title: Wikipedia, Diamond cut
    author: org:wikipedia
  - id: wiki-dispersion
    resource: https://en.wikipedia.org/wiki/Dispersion_(optics)
    title: Wikipedia, Dispersion (optics)
    author: org:wikipedia
  - id: sasian2007
    resource: https://doi.org/10.1117/1.2769018
    title: "Sasian et al., Evaluation of brilliance, fire, and scintillation in round brilliant gemstones, 2007"
    author: org:spie
  - id: guy2004
    resource: https://maverick.inria.fr/Publications/2004/GS04/
    title: "Guy & Soler, Graphics Gems Revisited, SIGGRAPH 2004"
    author: org:inria
  - id: wyman2005
    resource: https://doi.org/10.1145/1073204.1073310
    title: "Wyman, An approximate image-space approach for interactive refraction, 2005"
    author: org:acm
  - id: mesh-bvh
    resource: https://github.com/gkjohnson/three-mesh-bvh/blob/master/example/diamond.js
    title: three-mesh-bvh gem refraction example (diamond.js)
    author: org:three-mesh-bvh
  - id: drei-refraction
    resource: https://drei.docs.pmnd.rs/shaders/mesh-refraction-material
    title: drei MeshRefractionMaterial docs
    author: org:pmndrs
  - id: n8-diamonds
    resource: https://github.com/N8python/diamonds
    title: N8python/diamonds (MIT)
    author: org:n8python
  - id: ijewel
    resource: https://docs.ijewel3d.com/playground/diamond-materials.html
    title: iJewel3D docs, Diamond Materials
    author: org:ijewel3d
  - id: ijewel-intro
    resource: https://docs.ijewel3d.com/introduction/ijewel.html
    title: iJewel3D docs, introduction
    author: org:ijewel3d
  - id: mdn-features
    resource: https://developer.mozilla.org/en-US/docs/Web/API/GPUSupportedFeatures
    title: MDN, GPUSupportedFeatures
    author: org:mdn
  - id: khr-dispersion
    resource: https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_dispersion/README.md
    title: glTF KHR_materials_dispersion
    author: org:khronos
  - id: three-physical
    resource: https://threejs.org/docs/pages/MeshPhysicalMaterial.html
    title: three.js MeshPhysicalMaterial docs
    author: org:threejs
  - id: belcour2017
    resource: https://belcour.github.io/blog/research/publication/2017/05/01/brdf-thin-film.html
    title: Belcour & Barla 2017
    author: org:belcour
  - id: clo-material
    resource: https://support.clo3d.com/hc/en-us/articles/115015998728-Material-Type
    title: CLO Help, Material Type
    author: org:clo
---

# Takeaway

A flat-back crystal is **optically much simpler than a diamond**: a low-index (≈1.5–1.7) dome of
8–18 facets plus a table over an opaque silver mirror, so light enters through the crown, reflects
once off the foil and leaves through the crown.[^srr][^preciosa-benchmark] Per-pixel tracing inside
the stone (the three-mesh-bvh/drei/iJewel approach) is proven in browsers for **hundreds** of gems and
is only needed in close-up; at 10,000+ stones distant stones must be shaded from a precomputed table
([LOD chain](/engineering/rendering/sparkle/crystal-lod-chain.md)).[^srr] Under the owner's "appears
correct" target ([decision](/decisions/2026-10-13-appears-correct-not-physically-correct.md)) a
look-alike shader is acceptable; the PoC uses one ([stones component](/engineering/poc/stones.md)).

# Physical inputs

- Glass n ≈ 1.5 (ordinary) to 1.7–1.8 (lead glass, higher dispersion).[^wiki-leadglass] Dispersion
  (nB − nG): diamond 0.044, flint glass 0.041, quartz 0.013; fire also depends on facet angles,
  lighting and viewing angle.[^wiki-dispersion]
- Cut vocabulary: table, crown, girdle, pavilion, culet; a rose cut has a flat base and faceted dome,
  no pavilion; brilliance relies on internal reflection (diamond critical angle 24.4°).[^wiki-diamondcut]
- Preciosa: MAXIMA 12–18 facets ss2–ss48; Swarovski Xirius/Xilion/Xero 8–16; genuine silver layer +
  DuraFoiling; "up to 264 unique reflected light rays" (marketing, no method).[^preciosa-benchmark][^preciosa-faq]
- Sasian et al. 2007 map brilliance, fire and scintillation for grading (abstract only verified).[^sasian2007]
- More: [flat-back crystal anatomy](/domain/embellishments/flat-back-crystal-anatomy.md),
  [coatings and AB](/domain/embellishments/crystal-coatings-and-ab.md).

# Existing real-time gem methods

| Method | What it does | Citation |
|---|---|---|
| Guy & Soler 2004 | Real-time faceted coloured gems with fragment programs, cube maps, float rendering | [^guy2004] |
| Wyman 2005 | Two-interface image-space refraction | [^wyman2005] |
| three-mesh-bvh "Gem Refraction" (MIT) | Refract into mesh, loop up to `bounces` (default 3, 1–10) with `bvhIntersectFirstHit` on a BVH in textures; TIR reflect else exit; IOR 2.4; dispersion by three IOR-scaled paths or "fast chroma" (offset green exit); equirect HDR; no Fresnel; hardware AA disabled (interpolated normals upset ray casts) | [^mesh-bvh] |
| drei `MeshRefractionMaterial` (from N8programs' MIT diamonds) | `bounces` (default 2), `ior` 2.4, `fresnel`, `aberrationStrength` (expensive), `fastChroma` true, `envMap`; `USE_INSTANCING` path supports instanced gems | [^drei-refraction][^n8-diamonds] |
| iJewel3D / WebGi (commercial, Threepipe core) | Ray-traced refraction + dispersion; IOR default 2.60, 4–5 bounces (up to 16), env rotation, per-material bloom, thin film; sparkle depends heavily on the HDRI; claims hundreds of diamonds, incl. mobile | [^ijewel][^ijewel-intro] |
| glTF `KHR_materials_dispersion` | dispersion = 20 / Abbe (diamond V=55 → 0.36; crown glass V=59 → 0.33; polycarbonate V=32 → 0.625); per-channel IOR spread | [^khr-dispersion] |
| three.js `MeshPhysicalMaterial` | `dispersion` (transmissive only), `ior` 1.0–2.333, `transmission`, `thickness`, `iridescence*`; most expensive built-in material | [^three-physical] |
| CLO "Gem (Render Only)" | Absorption + Abbe value; V-Ray only, not real-time | [^clo-material] |

WebGPU exposes **no ray-tracing feature**, so browser apps cannot use hardware RT.[^mdn-features]

# Proposed flat-back model

**[INFERRED]** (research-note proposal, unvalidated):[^srr]

- **Unfold the mirror**: reflecting the crown about the base plane gives a symmetric convex bi-pyramid
  (≈20–36 planes) through which light refracts in, travels, refracts out (or TIRs). No BVH: ray vs
  convex polyhedron is a loop over planes taking the nearest positive exit.
- At n ≈ 1.5–1.7 the critical angle is ≈36–42° (vs 24.4° diamond), so most rays exit after 1–2
  internal segments; a bounce cap of 3–4 loses little (jewellery viewers use 4–16 for diamond).
- Cost (close-up LOD only): ≈(20–36 planes) × (≤4 segments) plane tests × 1 (fast chroma) or 3 (true
  dispersion) ≈ 100–400 dot products per covered pixel, plus 2 thin-film evaluations if AB, 3 env/light
  lookups. Bounded by screen coverage, not stone count.
- **Dispersion**: expose index (1.50–1.70) and dispersion as per-product presets; lead-type crystal
  well above crown glass's 0.33 glTF value, ≈0.55–0.67 for a dense flint (Abbe in the 30s; textbook
  value not re-verified).
- **Fire needs small lights**: each exit facet fans white light into a spectrum; a pure colour is seen
  only if the source is angularly small and the pupil/aperture samples part of the fan; broad soft
  light gives brilliance without fire (prism optics; Sasian argument recalled, abstract only).
- **AB**: Belcour–Barla thin film replacing the Fresnel term at the crown (entry reflection, entry
  transmission, exit transmission);[^belcour2017] one film thickness per stone type + small per-stone
  jitter; complementary tint on transmitted light; metal-oxide absorption needs an extra factor. Coat
  ≈half the crown facets for AB, all for AB 2X.[^ecs]
- Give each stone a random rotation about its normal so neighbours do not flash in unison; let
  brightness exceed display white so bloom reads as sparkle.[^ecs]

# What the PoC does instead

`crystalMaterial()` in `poc-threejs/src/stones.js` injects into `MeshPhysicalMaterial` an "inner"
term: refract view ray in through an exaggerated facet normal, mirror off the stone axis (flat back),
refract out, look up environment (sharp + blurred) and point lights, once per colour channel with IOR
1.57/1.60/1.645 for fire; AB as a view-dependent cosine palette. No tracing, 32 triangles per stone.
Details: [stones component](/engineering/poc/stones.md).

Gaps: no manufacturer IOR, Abbe, facet angles or AB data; no per-stone timing for foiled low-index
stones; "back-face normal cube map" trick unverified.[^srr]

[^srr]: Research notes: real-time sparkle rendering, section 4 (in-bundle mirror)
[^ecs]: Research notes: embellishments, crystals and sequins, section 11 inferences (in-bundle mirror)
[^preciosa-benchmark]: Preciosa MAXIMA benchmark sheet (vendor-authored)
[^preciosa-faq]: Preciosa MAXIMA FAQ (vendor)
[^wiki-leadglass]: Wikipedia, Lead glass
[^wiki-diamondcut]: Wikipedia, Diamond cut
[^wiki-dispersion]: Wikipedia, Dispersion (optics)
[^sasian2007]: Sasian et al. 2007, DOI
[^guy2004]: Guy & Soler 2004, INRIA page
[^wyman2005]: Wyman 2005, DOI
[^mesh-bvh]: three-mesh-bvh diamond.js example
[^drei-refraction]: drei MeshRefractionMaterial docs
[^n8-diamonds]: N8python/diamonds
[^ijewel]: iJewel3D Diamond Materials docs
[^ijewel-intro]: iJewel3D introduction
[^mdn-features]: MDN GPUSupportedFeatures
[^khr-dispersion]: Khronos KHR_materials_dispersion README
[^three-physical]: three.js MeshPhysicalMaterial docs
[^belcour2017]: Belcour & Barla 2017
[^clo-material]: CLO Help, Material Type
