---
type: Technique
title: Sparkle prior art, reusable code and the build-or-borrow map
description: "Public code exists for every glitter method and for web gem refraction, but nothing combines them into thousands of editable stones on a garment; fashion CAD (CLO, Browzwear, Style3D) treats glitter and gems as render-only or 2D print effects with no stone placement. Licences and what to port."
tags: [rendering, prior-art, code, competitor, licence]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: srr
    resource: /references/research/realtime-sparkle-rendering.md
    title: "Research notes: real-time sparkle rendering"
    author: claude-code/claude-opus-5-5
  - id: clo-material
    resource: https://support.clo3d.com/hc/en-us/articles/115015998728-Material-Type
    title: CLO Help, Material Type
    author: org:clo
  - id: clo-glitter
    resource: https://support.clo3d.com/hc/en-us/articles/360011005813-Express-Glitter-ver5-0-0
    title: CLO Help, Express Glitter
    author: org:clo
  - id: clo-objtrim
    resource: https://support.clo3d.com/hc/en-us/articles/13261774963737-OBJ-Trim
    title: CLO Help, OBJ Trim
    author: org:clo
  - id: bw-substance
    resource: https://help.browzwear.com/en/articles/13065724-substance-presets
    title: Browzwear Help, Substance Presets
    author: org:browzwear
  - id: bw-materials
    resource: https://help.browzwear.com/en/articles/13065661-creating-true-to-life-materials
    title: Browzwear Help, Creating True to Life Materials
    author: org:browzwear
  - id: bw-vray
    resource: https://help.browzwear.com/en/articles/13065277-v-ray-real-time-ray-trace-rendering
    title: Browzwear Help, V-Ray Real-Time Ray Trace
    author: org:browzwear
  - id: style3d
    resource: https://help.style3d.com/studio/en/
    title: Style3D Studio Help
    author: org:style3d
  - id: preciosa-maxima
    resource: https://www.preciosacomponents.com/maxima
    title: Preciosa MAXIMA page (Digital Assets)
    author: org:preciosa
---

# Takeaway

**Reusable public code exists for every glitter method and for web gem refraction, but nothing public
combines them into "thousands of editable stones on a garment".** Mainstream fashion CAD treats glitter
and gems as offline-render-only materials or 2D artwork effects and documents no rhinestone/sequin
placement or real-time sparkle — a clear gap this product can own.[^srr]

# Code inventory

From the research note[^srr] (URLs in [glint models](/engineering/rendering/sparkle/glitter-glint-models.md),
[coloured glitter](/engineering/rendering/sparkle/coloured-and-holographic-glitter.md),
[crystal optics](/engineering/rendering/sparkle/crystal-optics-look-alike.md)):

| Item | Form | Licence |
|---|---|---|
| Zirr & Kaplanyan 2016 | Shadertoy `ldVGRh` + shading.txt | not stated |
| Chermain et al. 2020 | OpenGL/GLSL repo, WebGL demo, dictionary generator | **MIT** |
| Deliot & Belcour 2023 | Standalone source, benchmark, HDRP demo (Google Drive) | **not stated** |
| Kneiphof & Klein 2024/2025 | Unity projects, modified HDRP 14.0.10 (`Glints2023/2024.hlsl`, IBL variants), prebuilt demos | **not stated** |
| Kemppinen et al. 2025 | Single fragment shader, Shadertoy `tcdGDl` | not stated |
| Bowles & Wang 2015 | Slides + RenderMonkey shader | – |
| three-mesh-bvh gem example; N8programs diamonds; drei `MeshRefractionMaterial` | JS/GLSL | **MIT** |
| iJewel3D / WebGi | Commercial (open-source Threepipe core) | commercial |
| Belcour–Barla thin film; glTF iridescence/dispersion reference GLSL; three.js `MeshPhysicalMaterial` | Code + spec | three.js MIT |
| Unreal Substrate glints (`r.Substrate.Glints=1`); Unity HDRP AxF car paint | Engine features | engine licences |

# Build-or-borrow map

**[INFERRED]**:[^srr]
- **Glitter**: port `Glints2023/2024.hlsl` (Deliot–Belcour + area lights) or the Kemppinen shader;
  because Deliot and Bonn licences are unstated, treat them as references and **re-implement from the
  papers**; Chermain is MIT. Legal reuse needs checking with the authors.
- **Stones close-up**: write the analytic convex tracer, using three-mesh-bvh/drei as a behavioural
  reference for bounce loop, fast-chroma dispersion and instancing.
- **AB/iridescence**: reuse the glTF/three.js Belcour–Barla implementation.
- **Bespoke**: lobe tables, LOD chain, sparkle layer, picking.

# Fashion CAD today

- **CLO**: material types include "Glitter (Render Only)" and "Gem (Render Only)"; previewing glitter
  needs the V-Ray Interactive Render (not the real-time window); glitter = colour, particle count,
  saturation variation; gem = absorption and Abbe; Iridescence Material Expression since v6.0; AxF
  import.[^clo-material][^clo-glitter] No help article about rhinestones, hotfix, crystals, sequins,
  beads, spangles or embellishment among 962 titles; embellishments would be OBJ trims, graphics or
  buttons.[^clo-objtrim][^srr]
- **Browzwear VStitcher/Lotta**: 3D trims (OBJ/FBX, with mass, need re-simulation), 2.5D trims,
  multi-layer fabrics; Substance presets Emboss, Embroidery, Foil Print, Glitter Print (flake size,
  randomness), High Density, Puff, Vintage; custom SBSAR; height effects only in ray-trace renders; V-Ray
  real-time ray-trace window; an Unreal-based enhanced display article exists (unread). No stone/sequin
  article among 965 titles.[^bw-substance][^bw-materials][^bw-vray][^srr]
- **Style3D Studio** (V10.0, Jul 2026): browsed tool sections show no rhinestone, sequin or bead tool;
  lights are area, sphere, directional, spot. A hot-fix tool elsewhere is an unconfirmed recollection.[^style3d][^srr]
- Stone makers are starting to supply digital assets (Preciosa MAXIMA "Digital Assets").[^preciosa-maxima]

**[INFERRED]** A tool showing editable, plausible sparkle at 60 fps from full body to macro would be
differentiated on exactly the axis the brief emphasises; Substance-style glitter bakes flakes into maps
and cannot twinkle with view/light changes.[^srr] Wider competitor survey:
[/references/research/existing-tools-and-ux-mechanics.md](/references/research/existing-tools-and-ux-mechanics.md);
2D rhinestone tools: [rhinestone layout software](/domain/embellishments/rhinestone-layout-software.md).

Not verified: Marvelous Designer, Substance 3D sequin/rhinestone generators, Fab/Asset Store assets,
Blender node set-ups, Shadertoy gem/sequin demos.[^srr]

[^srr]: Research notes: real-time sparkle rendering, section 9 (in-bundle mirror)
[^clo-material]: CLO Help, Material Type
[^clo-glitter]: CLO Help, Express Glitter
[^clo-objtrim]: CLO Help, OBJ Trim
[^bw-substance]: Browzwear Help, Substance Presets
[^bw-materials]: Browzwear Help, True to Life Materials
[^bw-vray]: Browzwear Help, V-Ray Real-Time Ray Trace
[^style3d]: Style3D Studio Help
[^preciosa-maxima]: Preciosa MAXIMA page
