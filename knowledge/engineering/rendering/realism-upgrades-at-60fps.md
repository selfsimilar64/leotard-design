---
type: Technique
title: Realism upgrades that fit in 60 fps
description: "Gap analysis of the POC render against the moodboard photos and a costed list of upgrades (photo-studio lighting with area lights and a matching environment, crystal studio read, glare presets, AO and soft shadow, skin, mesh over skin, lace and prints in cloth space, seams, tension wrinkles, idle refinement) inside a 14 ms frame on a GTX 1650."
tags: [rendering, realism, performance, lighting, sparkle, fabric]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-18T18:20:00Z }
sources:
  - id: bench
    resource: "measurement in the in-app browser pane, 2026-10-18: POC 6.1 ms/frame showpiece, 7.8 ms/frame with 16,148 stones at 1792x1344, GTX 1650"
    title: POC frame cost benchmark
    author: claude-code/claude-opus-5-5
  - id: shots
    resource: "screenshots of the POC (Ruby mystique close-up, Emerald glitter tank back, studio rig), 2026-10-18"
    title: POC render review
    author: claude-code/claude-opus-5-5
  - id: moodboard
    resource: /domain/moodboard/design-space-taxonomy.md
    title: Moodboard design-space taxonomy (photography conditions)
  - id: lighting
    resource: /engineering/rendering/sparkle/sparkle-lighting.md
    title: Lighting for sparkle
  - id: glare
    resource: /engineering/rendering/sparkle/observer-and-glare-model.md
    title: Observer and glare model
  - id: meshskin
    resource: /engineering/rendering/fabric-shading/mesh-over-skin-blend.md
    title: Mesh over skin in one shader
  - id: temporal
    resource: /engineering/rendering/sparkle/sparkle-temporal-stability-and-hdr.md
    title: Sparkle temporal stability and HDR
  - id: lod
    resource: /engineering/rendering/sparkle/crystal-lod-chain.md
    title: Four-level crystal LOD chain
  - id: fabric-poc
    resource: /engineering/poc/fabric-shader.md
    title: POC fabric shader, known shortcuts
---

# Takeaway

**[INFERRED]** The moodboard is mostly **studio product photography**: white or pale seamless
backgrounds, one large soft key, fill, often rim light, real skin, sometimes a camera star filter.[^moodboard]
The POC renders in a dark generic room with small point lights, on a white fibreglass mannequin,
which is why its crystals read grey and its shiny fabrics lack the broad, body-following highlights
in the photos.[^shots] The largest realism gains come from **matching the photographer's lighting and
the athlete's skin**, not from more expensive shading. All upgrades below fit a 14 ms budget at
2.4 MP on the owner's GTX 1650 (baseline 6.1 ms).[^bench]

# Gaps seen in the POC render[^shots]

1. Clear crystals read as flat grey discs at mid distance; in the photos they read as bright silvery
   points with dark facet contrast, because their mirror back reflects a large bright softbox.
2. Glare is round bloom blobs; many photos show 4-, 6- or 8-point star-filter flares instead.
3. No contact shadow or AO from arms, straps, bands and stones; the garment floats visually.
4. Mannequin only; most photos are on skin, and every mesh panel's colour is mesh over *skin*.
5. Pattern space is tri-planar object space: no grain, no lace or print, no panel-aware scale.[^fabric-poc]
6. No seams: real pieced seams read as a soft groove; seam allowances darken under mesh.
7. Perfectly smooth fabric: photos show tension wrinkles at crotch, hip crease, armpit and under straps.
8. The swoosh accent field is a frontal-plane function, so it also appears on the back.

# Upgrades, in priority order

| # | Upgrade | How | Est. cost |
|---|---|---|---|
| R1 | **Photo-studio rigs** (white seamless, grey seamless, gym, arena) | 2-3 `RectAreaLight` softboxes (LTC) for broad fabric highlights; the same boxes rendered into the PMREM environment so crystals and foil reflect them; 2-4 small point lights kept for glints; seamless cyclorama backdrop and floor. Rig = data, so a reference photo's setup can be matched | +1.0-1.5 ms |
| R2 | **Crystal studio read** | Per-cut exit lobes sampled from the studio environment; minimum lobe width per pixel; per-instance colour/finish so one layout mixes clear, AB, coloured and jet; spangles as tilted holo discs; pearls; shaped stones. Distant stones as single-quad impostors (LOD 2-3) to pay for close-up quality[^lod] | net ~0 |
| R3 | **Glare presets** | Bright-pass at quarter resolution; star streak kernel (4/6/8 rays, angle, length) plus the existing bloom; presets "plain photo", "star filter", "arena eye"[^glare] | +0.4 ms |
| R4 | **Ambient occlusion and one soft shadow** | Bake body AO per pose into a vertex attribute (free at runtime); GTAO at half resolution for strap/band/stone contact; one 2048 shadow map from the key softbox, PCF soft | +1.5 ms |
| R5 | **Athlete skin display** | Skin tones, pre-integrated wrap diffuse with red-shifted terminator, roughness variation; mannequin finishes stay as options | +0.3 ms |
| R6 | **Mesh over skin/lining in one shader** | Composite mesh over the skin or lining at the same point (Beer-Lambert view term), tint, openness rising with stretch (curvature proxy until strain exists), double-layer darkening along seams inside mesh panels[^meshskin] | +0.3 ms |
| R7 | **Cloth-space textures** | Lace (albedo, alpha, cord normal), prints (sublimation, printed lace, ombre along any curve), flocked or foil-printed mesh, all in per-panel flattened UVs with anisotropic filtering | +0.3 ms |
| R7b | **Missing fabric looks** from the moodboard | Duochrome foil (base hue at normal, shifted hue at the specular peak), oil-slick and chameleon thin-film foil (noise-modulated thickness, optionally print-masked), liquid/opal hologram (low-frequency noise-driven thin film), glitter-grain foil, crushed velvet (nap flow map), mirror chrome, lace with cord relief; all as layers of the existing uber material | +0.2 ms |
| R8 | **Seams and construction** | Seam groove + slight ridge from distance to the seam polyline; coverstitch at hems; piping as rims | +0.2 ms |
| R9 | **Tension wrinkles** | Procedural fold normals in authored zones (crotch, hip crease, armpit, strap ends), strength per pose | +0.1 ms |
| R10 | **Idle refinement** | When camera and lights are still, accumulate 16 jittered frames (supersampled, sparkle-stable) for compare and capture; interactive frames unchanged[^temporal] | 0 interactive |
| R12 | **Optional path-traced stills** (later) | When idle, hand the scene to a GPU path tracer (e.g. three-gpu-pathtracer) for presentation and photo-compare images; the owner has built one before and considers it a modest addition | 0 interactive |
| R11 | **Dynamic resolution** | Hold 16.6 ms by scaling 0.7-1.0, refine when idle | saves |

# Built 2026-10-21 (app/src/render/postfx.js)

- **Only the scene is multisampled** (`ScenePass`: its own 4x HDR target with depth and stencil as
  textures, copied into plain composer buffers). Before, the composer's own buffers were
  multisampled, so every post pass (bloom, glare, output) wrote and resolved 4x HDR buffers: B9 on
  the mannequin went from 35.2 to 23.3 ms a frame at 1792x1344 (GTX 1650), the glow pass from about
  12 ms to 1, the person in the A-pose from 38 to 28 ms.
- **Skin scattering** (`SkinPass`, Display "Soft skin"): skin materials write alpha 0.5 (`markSkin`:
  the person's skin, the athlete-skin finishes); two separable passes blur skin pixels only from
  skin pixels, by 1.5 mm turned into pixels by depth, red widest (sigma 1 : 0.3 : 0.18), not across
  depth steps; the second pass resets the alpha (left in, it washed the image towards white). A 3 mm
  kernel blurred freckles and pores away (waxy): the blur acts on texture and light together, so the
  green and blue kernels stay narrow. +0.7 ms.
- **Ambient occlusion** (`AOPass`, Display "Ambient occlusion"): three's GTAOPass on the scene pass's
  depth (normals from depth: a separate geometry pass would not see the garment's lift and
  thickness, done in its vertex shader), half resolution, radius 6 cm, 8 samples. +2 ms. Three r186
  fails when the depth texture is given to the constructor (worked around in `AOPass`).
- Not done yet: an HDRI studio environment (needs a downloaded file); better eye shading (owner:
  not wanted, 2026-10-21).

Estimated total ~10.5-11.5 ms at 2.4 MP. Every phase that adds an upgrade re-runs the POC's
"Measure frame cost" benchmark with the pane visible and must stay under 14 ms.

[^bench]: Benchmark run 2026-10-18
[^shots]: POC render review, 2026-10-18
[^moodboard]: Moodboard taxonomy, photography conditions
[^lighting]: Lighting for sparkle
[^glare]: Observer and glare model
[^meshskin]: Mesh over skin in one shader
[^temporal]: Sparkle temporal stability and HDR
[^lod]: Crystal LOD chain
[^fabric-poc]: POC fabric shader, known shortcuts
