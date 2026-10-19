---
type: Component
title: Godot
description: "Status NOT CHOSEN. MIT, no fees, 4.7 (June 2026) with area lights, HDR output, a per-light custom BRDF hook, pen pressure and a proven tool UI (Material Maker, Pixelorama, Xogot on iPad); but no sheen or iridescence, no OIT, no documented ray tracing, and web export is WebGL 2 only."
tags: [platform, engine, godot, not-chosen]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
stale_after: 2027-10-15T00:00:00Z
sources:
  - id: notes-native
    resource: /references/research/native-engine-options.md
    title: "Research notes: native engine options (section 3)"
  - id: notes-web
    resource: /references/research/web-engine-options.md
    title: "Research notes: web engine options (section 5)"
  - id: blog
    resource: https://godotengine.org/blog/
    title: Godot blog
  - id: rel47
    resource: https://godotengine.org/releases/4.7/
    title: Godot 4.7 release page
  - id: rel46
    resource: https://godotengine.org/releases/4.6/
    title: Godot 4.6 release page
  - id: renderers
    resource: https://docs.godotengine.org/en/stable/tutorials/rendering/renderers.html
    title: Godot docs, renderers
  - id: stdmat
    resource: https://docs.godotengine.org/en/stable/tutorials/3d/standard_material_3d.html
    title: Godot docs, StandardMaterial3D
  - id: spatial
    resource: https://docs.godotengine.org/en/stable/tutorials/shaders/shader_reference/spatial_shader.html
    title: Godot docs, spatial shaders
  - id: limits
    resource: https://docs.godotengine.org/en/stable/tutorials/3d/3d_rendering_limitations.html
    title: Godot docs, 3D rendering limitations
  - id: multimesh
    resource: https://docs.godotengine.org/en/stable/classes/class_multimesh.html
    title: Godot docs, MultiMesh
  - id: pen
    resource: https://docs.godotengine.org/en/stable/classes/class_inputeventmousemotion.html
    title: Godot docs, InputEventMouseMotion
  - id: showcase
    resource: https://godotengine.org/showcase/
    title: Godot showcase
  - id: license
    resource: https://godotengine.org/license/
    title: Godot licence
  - id: web-export
    resource: https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html
    title: Godot docs, exporting for web
---

# Status

**NOT CHOSEN.** Not recommended by the research and not part of the owner's decisions.[^notes-native]

# Facts

- 4.7 (18 Jun 2026; 4.7.2 on 18 Aug); 4.8 in feature freeze.[^blog] 4.7 added `AreaLight3D`,
  energy-conserving clearcoat, HDR output (Windows, macOS, iOS, visionOS, Wayland) and
  `DrawableTexture2D` for drawing on textures.[^rel47] 4.6 added LibGodot (embed the engine in your
  own app) and D3D12 default.[^rel46]
- Renderers: Forward+ (desktop), Mobile, Compatibility (OpenGL); SSR, SSIL, SSS, SDFGI, TAA are
  Forward+ only; **ray tracing not mentioned**.[^renderers]
- StandardMaterial3D: clearcoat, anisotropy, rim, back lighting, screen-space refraction; **no
  sheen or iridescence**.[^stdmat] Custom BRDF via `light()` per light per pixel; transparent
  materials cannot cast shadows or appear in screen/depth textures.[^spatial]
- **No OIT** ("Godot currently doesn't provide this feature"); sorting by node position.[^limits]
- MultiMesh: per-instance transform, colour, 4-float custom data; one AABB, so every instance
  always renders when spread out.[^multimesh]
- Pen: pressure, tilt, eraser.[^pen] Shipped tools: Material Maker, Pixelorama, Dungeondraft, RPG in a
  Box, and **Xogot (Godot for iPad and iPhone)**.[^showcase]
- MIT; commercial and proprietary redistribution allowed with attribution.[^license]
- Web export: WebGL 2 Compatibility renderer only, no WebGPU, no C#.[^web-export]

**[INFERRED]** Godot's UI precedent is strongest for 2D/node-graph tools; no shipped Godot app with a
high-fidelity 3D material viewport like ours was found. Sheer mesh over skin hits the documented
transparency limits.[^notes-native]

[^notes-native]: Research notes, native engine options, section 3
[^notes-web]: Research notes, web engine options, section 5
[^blog]: Godot blog
[^rel47]: Godot 4.7 release
[^rel46]: Godot 4.6 release
[^renderers]: Renderers docs
[^stdmat]: StandardMaterial3D docs
[^spatial]: Spatial shaders docs
[^limits]: 3D rendering limitations
[^multimesh]: MultiMesh docs
[^pen]: InputEventMouseMotion docs
[^showcase]: Godot showcase
[^license]: Godot licence
[^web-export]: Exporting for web
