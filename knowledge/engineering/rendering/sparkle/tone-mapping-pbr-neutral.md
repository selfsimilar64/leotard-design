---
type: Technique
title: Tone mapping with Khronos PBR Neutral
description: "Use the Khronos PBR Neutral tone mapper (May 2024) so fabric and stone base colours reproduce 1:1 up to about 0.8 and only highlights compress; filmic ACES/AgX wash out saturated team colours; it holds under neutral white light, so ship a colour-check lighting preset."
tags: [rendering, tone-mapping, colour, hdr]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: rfs
    resource: /references/research/realtime-fabric-shading.md
    title: "Research notes: real-time fabric shading"
    author: claude-code/claude-opus-5-5
  - id: report
    resource: /references/research/research-report.md
    title: "Research report: Borrow the engine, build the sparkle"
    author: claude-code/claude-opus-5-5
  - id: srr
    resource: /references/research/realtime-sparkle-rendering.md
    title: "Research notes: real-time sparkle rendering"
    author: claude-code/claude-opus-5-5
  - id: khronos-press
    resource: https://www.khronos.org/news/press/khronos-pbr-neutral-tone-mapper-released-for-true-to-life-color-rendering-of-3d-products
    title: Khronos press release, PBR Neutral tone mapper (16 May 2024)
    author: org:khronos
  - id: khronos-spec
    resource: https://github.com/KhronosGroup/ToneMapping/blob/main/PBR_Neutral/README.md
    title: Khronos PBR Neutral specification
    author: org:khronos
---

# Takeaway

Use **Khronos PBR Neutral**: released 16 May 2024 for e-commerce, architecture and CAD, it reproduces
base colours 1:1 up to a set maximum and compresses only highlights — what matching a team's dye
colour requires — whereas ACES is documented to wash out saturated colours and AgX deliberately drives
bright colours toward white.[^khronos-press][^rfs][^report] It holds only under **neutral white
light**, so a plain colour-check lighting preset should sit beside the dramatic ones.[^report]
The PoC already uses it (`renderer.toneMapping = THREE.NeutralToneMapping` in `poc-threejs/src/main.js`).

# Specification

- 1:1 colour up to a maximum, remaining range for highlight compression, analytically invertible, 13
  lines of GLSL, sRGB output only; adopted in model-viewer, Babylon.js, Filament, three.js and the glTF
  Sample Viewer. Khronos guidance: no tone mapping without HDR lighting; filmic (ACES, AgX) for strongly
  HDR or artistic scenes; PBR Neutral for well-exposed photoreal PBR with accurate sRGB base colours.[^khronos-press][^rfs]
- Formula (with `F90 = 0.04`, `Ks = 0.8 − F90 = 0.76`, `Kd = 0.15`): `x = min(R,G,B)`;
  `f = x − x²/(4·F90)` if `x ≤ 2·F90` else `F90`; `p = max(R,G,B) − f`; if `p ≤ Ks` output `c − f`;
  else `pn = 1 − (1−Ks)²/(p + 1 − 2Ks)`, `g = 1/(Kd·(p − pn) + 1)`, output
  `(c − f)·(pn/p)·g + pn·(1 − g)`. Hue preserved; channels 0.08–0.8 map to themselves minus 0.04,
  exactly reproducing a shiny dielectric's base colour under unit white light; OCIO config and LUT
  provided.[^khronos-spec][^rfs]

# Interaction with sparkle

**[INFERRED]**: sparkle peaks (10^2–10^4 × diffuse white) fall in the compressed highlight range and
clip toward white by design; apply bloom/glare per channel **before** tone mapping so coloured fire
and AB flashes keep their hue ([temporal stability and HDR](/engineering/rendering/sparkle/sparkle-temporal-stability-and-hdr.md));
set exposure from the garment's diffuse level.[^srr] Observer presets may substitute their own tone
curve (phone, broadcast) — see [observer model](/engineering/rendering/sparkle/observer-and-glare-model.md).

Related colour issues (wide gamut, fluorescent neon fabrics outside reflectance RGB) live with fabric
shading: [/references/research/realtime-fabric-shading.md](/references/research/realtime-fabric-shading.md).[^rfs]

[^rfs]: Research notes: real-time fabric shading, colour section (in-bundle mirror)
[^report]: Research report, lighting and observer section (in-bundle mirror)
[^srr]: Research notes: real-time sparkle rendering, section 6 (in-bundle mirror)
[^khronos-press]: Khronos press release, 16 May 2024
[^khronos-spec]: Khronos PBR Neutral README
