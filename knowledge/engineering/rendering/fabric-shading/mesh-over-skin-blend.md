---
type: Technique
title: Mesh over skin in one shader
description: "Because a leotard is skin-tight, shade sheer mesh by compositing it over the skin or lining at the same point inside one shader, with view-angle-dependent coverage, instead of using sorted transparency; alpha-to-coverage or OIT are the fallbacks."
tags: [rendering, fabric, mesh, transparency]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-shade
    resource: /references/research/realtime-fabric-shading.md
    title: "Research notes: real-time fabric shading, questions 3, 7, 9 and 15"
    author: claude-code/claude-opus-5-5
  - id: report
    resource: /references/research/research-report.md
    title: "Research report, PBR table and gaps"
    author: claude-code/claude-opus-5-5
  - id: threejs-material
    resource: https://threejs.org/docs/pages/Material.html
    title: three.js Material docs
    author: org:threejs
  - id: hashed-alpha
    resource: https://research.nvidia.com/publication/2017-02_hashed-alpha-testing
    title: "Wyman and McGuire: Hashed Alpha Testing (I3D 2017)"
    author: team:wyman-mcguire
  - id: yuksel-alpha
    resource: http://www.cemyuksel.com/research/alphadistribution/
    title: "Yuksel: Alpha Distribution for Alpha Testing (I3D 2018)"
    author: team:yuksel
  - id: threejs-oit
    resource: https://github.com/mrdoob/three.js/pull/34253
    title: three.js PR 34253, weighted blended OIT (r186)
    author: org:threejs
  - id: babylon-transparency
    resource: https://doc.babylonjs.com/features/featuresDeepDive/materials/advanced/transparent_rendering
    title: Babylon.js transparent rendering
    author: org:babylonjs
  - id: khr-difftrans
    resource: https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_diffuse_transmission/README.md
    title: glTF KHR_materials_diffuse_transmission (Release Candidate)
    author: org:khronos
  - id: openpbr
    resource: https://academysoftwarefoundation.github.io/OpenPBR/
    title: OpenPBR Surface specification
    author: org:academy-software-foundation
---

# Takeaway

**Treat mesh as coverage over a known under-layer, not as blended glass: a leotard sits on the skin
with essentially no gap, so the mesh and the skin (or lining) beneath can be shaded at the same pixel
in one shader, with no sorting and no transparency pass.**[^notes-shade] This single-step blend is the
researchers' own design and has no published validation; it is one of the things the stress-test
prototype must prove.[^report] Domain fabric: [stretch mesh](/domain/fabrics/stretch-mesh-and-illusion.md);
layering: [fabric stack](/domain/fabrics/fabric-stack.md).

# Recipe (**[INFERRED]**, derived, not sourced)

- View-angle coverage, Beer-Lambert style, goes opaque at grazing angles as real mesh does:
  `α(θ) = 1 − (1 − α₀)^(1/max(cos θ, ε))`. Apply with the view angle for visibility and with the light
  angle for the shadow the mesh casts on what is beneath.
- Composite: `colour = α(θv)·L_mesh + (1 − α(θv))·(1 − α(θl))·L_under`, where `L_under` is the skin or
  lining BRDF at the same point. Cost: one extra BRDF evaluation (~1.5-2x), no extra passes.
- Two regimes, cross-faded by pixel footprint (`fwidth(uv)·textureSize`): holes larger than a pixel are
  a cut-out mask; sub-pixel holes are a homogeneous α. Coverage-preserving mips do this automatically if
  alpha-to-coverage or hashing (not a hard alphaTest) consumes the filtered value.
- Stretch-dependent show-through becomes a parameter change on α₀ (see
  [stretch](/engineering/rendering/fabric-shading/stretch-dependent-appearance.md)).
- Skin tone must be a colour-managed albedo because it feeds this composite; errors read as wrong
  fabric colour.

All from the notes.[^notes-shade]

# Fallbacks and when they are needed

| Method | Use | Notes |
|---|---|---|
| 4x MSAA + alpha-to-coverage (dithered/hashed for more than 5 levels) | Default for cut-out mesh | Writes depth, no sorting, handles sleeve-over-torso; three.js `alphaToCoverage` needs MSAA[^threejs-material] |
| Hashed alpha + temporal accumulation | Where MSAA is unavailable | Stable noise per Wyman and McGuire; grain needs TAA[^hashed-alpha] |
| Alpha distribution preprocessing | Keep coverage at coarse mips | No run-time change[^yuksel-alpha] |
| Weighted blended OIT | Genuinely floating sheers (skirts, overlays with air gaps) | In three.js r186 as `OITPassNode`, relies on WebGPURenderer features; mis-weights strongly coloured near-opaque layers (recalled limitation)[^threejs-oit] |
| Depth peeling | "Final quality" stills | Babylon.js: 5 passes for up to 10 layers, incompatible with AA post-processes[^babylon-transparency] |

Standards for thin sheets exist (glTF diffuse transmission, still Release Candidate; OpenPBR
thin-walled mode with `geometry_opacity`).[^khr-difftrans][^openpbr] Moiré at distance: anisotropic
filtering with coverage-preserving mips first; avoid periodic screen-door dithers.[^notes-shade]

**Gaps:** no measured angle-dependent transmittance for stretch mesh; no mesh open-area data, so α₀ is
a guess.[^notes-shade]

[^notes-shade]: Research notes: real-time fabric shading, Q3, Q7, Q9, Q15
[^report]: Research report, PBR table and gaps table
[^threejs-material]: three.js Material docs
[^hashed-alpha]: Wyman and McGuire 2017
[^yuksel-alpha]: Yuksel 2018
[^threejs-oit]: three.js PR 34253
[^babylon-transparency]: Babylon.js transparent rendering
[^khr-difftrans]: glTF KHR_materials_diffuse_transmission
[^openpbr]: OpenPBR Surface specification
