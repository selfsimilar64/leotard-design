---
type: Technique
title: Validating sparkle by statistics against photographed swatches
description: "No measured optical data exists for leotard fabrics or stones, so accuracy is established by photographing swatches and stone grids under one small lamp at fixed angles, reproducing the set-up, and comparing sparkle statistics (spots per cm2, intensity, colour, lifetime), plus internal LOD and convergence tests."
tags: [rendering, validation, sparkle, measurement]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: srr
    resource: /references/research/realtime-sparkle-rendering.md
    title: "Research notes: real-time sparkle rendering"
    author: claude-code/claude-opus-5-5
  - id: report
    resource: /references/research/research-report.md
    title: "Research report: Borrow the engine, build the sparkle"
    author: claude-code/claude-opus-5-5
  - id: kirchner2007
    resource: https://doi.org/10.1002/col.20328
    title: "Kirchner et al., Observation of visual texture of metallic and pearlescent materials, 2007"
    author: org:wiley
  - id: xrite
    resource: https://www.xrite.com/categories/portable-spectrophotometers/ma-t-family/ma-t12
    title: X-Rite MA-T12
    author: org:x-rite
  - id: unity-axf
    resource: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@14.0/manual/AxF-Shader.html
    title: Unity HDRP AxF Shader manual
    author: org:unity
  - id: ue58-notes
    resource: https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-5-8-release-notes
    title: UE 5.8 release notes
    author: org:epic-games
  - id: bonn-btf
    resource: https://cg.cs.uni-bonn.de/data/btfdbb-btf-database-bonn-and-measurement-lab
    title: Univ. Bonn BTF database
    author: org:uni-bonn
  - id: kk2025
    resource: https://arxiv.org/html/2507.02674v1
    title: "Kneiphof & Klein 2025 (Mitsuba 3 references)"
    author: org:uni-bonn
  - id: zhu2022
    resource: https://link.springer.com/10.1007/s41095-022-0280-x
    title: "Zhu et al. 2022 glint survey"
    author: org:springer
  - id: preciosa-faq
    resource: https://img.preciosacomponents.com/files/landingpage/lp-4/downloads/Preciosa_Chaton_Rose_MAXIMA_Frequently_Asked_Questions_EN.pdf
    title: Preciosa MAXIMA FAQ (PDF)
    author: org:preciosa
---

# Takeaway

Because **no measured optical data exists for any leotard fabric or stone**, accuracy has to be
established by comparison: photograph physical swatches and stone grids under one small lamp at a few
fixed angles, reproduce the set-up in the software, and **compare sparkle statistics** (bright points
per cm², brightness, colours) instead of pixels.[^report] The paint and coatings industry already
measures sparkle this way with dedicated instruments.[^xrite][^report] Under the owner's "appears
correct" target ([decision](/decisions/2026-10-13-appears-correct-not-physically-correct.md)) the
statistics are the yardstick for "looks like the real swatch", not a physics certification.

# Facts

- Kirchner et al. 2007: two texture parameters for effect coatings — **Diffuse Coarseness** (diffuse
  light) and **Glint Impression** (directional light) — with standard observation procedures and good
  repeatability; the two conditions must be characterised separately.[^kirchner2007]
- X-Rite MA-T12: 12 spectral angles (6 illuminations × 2 pick-ups) plus an RGB camera at 40 px/mm;
  reports Sparkle Grade, Colour Sparkle and Diffuse Coarseness at 15°/30°/45°/80° aspecular and
  diffuse; cites ASTM E2194, E308, E1164, D2244, DIN 6175.[^xrite]
- Measured flake appearance is used in production real-time rendering: Unity HDRP AxF car paint;[^unity-axf]
  UE 5.8 AxF import into Substrate.[^ue58-notes]
- Bonn BTF database: UBO2014 151 × 151 view/light directions (cameras ≈15° apart), 5 × 5 cm samples at
  512² texels; no glitter, sequin or flake samples (closest: two metallic paints, a silver-yarn fabric).[^bonn-btf]
- Research practice: compare against offline ground truth (Mitsuba 3);[^kk2025] benchmark on a unified
  platform.[^zhu2022]
- Preciosa cites third-party light-return testing without publishing method or data.[^preciosa-faq]

# Proposed protocol

**[INFERRED]** (research-note proposal):[^srr]
1. **Reference set**: swatches of target fabrics with glitter, sequins and stone grids (several sizes,
   Crystal and AB).
2. **Capture**: linear raw, calibrated camera, one small light at standard geometries (light 15°, 45°,
   75° from normal, camera on the normal, mirroring effect-coating practice), plus diffuse light and a
   slow rotation sequence.
3. **Reproduce** virtually: same light size and distance, lens, aperture/PSF, exposure.
4. **Compare statistics**: spots per cm² above a contrast threshold; intensity histogram; spot size
   distribution after the PSF; colour distribution (AB/holographic); mean and angular falloff of
   area-averaged reflectance (checks far-field NDF); sparkle lifetime from the rotation sequence
   (temporal autocorrelation). Pass criteria as tolerances.
5. Map to industry terms: sparkle grade/glint impression ↔ spot count × intensity under directional
   light; diffuse coarseness ↔ low-contrast texture under diffuse light; colour sparkle ↔ chromatic
   spread. An effect-coating instrument reading of the glitter fabrics would give vendor-neutral numbers.

# Internal consistency tests (no physical data needed)

1. **LOD invariance**: integrated radiance and sparkle counts of a stoned patch agree across LOD0–3
   for a distance sweep ([LOD chain](/engineering/rendering/sparkle/crystal-lod-chain.md)).
2. **Far-field convergence**: glint lobe matches smooth GGX/Beckmann when flakes per pixel are many.
3. **Energy** per stone vs an offline path-traced render of the same cut (white-furnace style; note
   Deliot–Belcour is admittedly not energy-conserving).
4. **Temporal**: no single-frame flashes above a threshold during a standard orbit.[^srr]

BTF data are angularly far too sparse (≈15°) for sparkle features ≤1° wide; useful only for the smooth
fabric base.[^srr]

Gaps: BYK instrument details, CIE/EMPIR sparkle scales and any sparkle ASTM standard unverified; no
dataset with sequin or glitter-fabric samples; no just-noticeable-difference data for sparkle.[^srr]

[^srr]: Research notes: real-time sparkle rendering, section 8 (in-bundle mirror)
[^report]: Research report, lighting and observer section (in-bundle mirror)
[^kirchner2007]: Kirchner et al. 2007, DOI
[^xrite]: X-Rite MA-T12 product page
[^unity-axf]: Unity HDRP AxF manual
[^ue58-notes]: UE 5.8 release notes
[^bonn-btf]: Univ. Bonn BTF database
[^kk2025]: Kneiphof & Klein 2025
[^zhu2022]: Zhu et al. 2022
[^preciosa-faq]: Preciosa MAXIMA FAQ
