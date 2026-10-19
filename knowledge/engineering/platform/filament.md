---
type: Component
title: Google Filament
description: "Status NOT CHOSEN. Apache-2.0 PBR renderer (v1.78, Oct 2026) with the most fabric-specific built-in shading (cloth model, sheen, anisotropy, clear coat, iridescence since Sept 2026) on Windows, macOS, iOS/iPadOS, Android, Linux and WebGL 2; renderer only, offline material compiler, stale npm package."
tags: [platform, engine, filament, native, not-chosen]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
stale_after: 2027-04-15T00:00:00Z
sources:
  - id: notes-web
    resource: /references/research/web-engine-options.md
    title: "Research notes: web engine options (section 4)"
  - id: notes-native
    resource: /references/research/native-engine-options.md
    title: "Research notes: native engine options (section 4)"
  - id: report
    resource: /references/research/research-report.md
    title: "Research report: Borrow the engine, build the sparkle"
  - id: readme
    resource: https://github.com/google/filament
    title: Filament README
  - id: releases
    resource: https://github.com/google/filament/releases
    title: Filament releases
  - id: materials
    resource: https://google.github.io/filament/main/materials.html
    title: Filament materials guide
  - id: building
    resource: https://github.com/google/filament/blob/main/BUILDING.md
    title: Filament BUILDING.md
  - id: npm-versions
    resource: https://www.npmjs.com/package/filament?activeTab=versions
    title: npm, filament versions
  - id: pr-webgpu
    resource: https://github.com/google/filament/pull/9946
    title: Filament PR 9946 (initial WebGPU on Emscripten)
  - id: sceneview
    resource: https://github.com/SceneView/sceneview-android
    title: SceneView README
---

# Status

**NOT CHOSEN.** The report listed "a native app on a small rendering library such as Filament" as
the option that would win for a tablet-first, stylus-heavy product.[^report] The owner now targets
[native desktop plus iPad](/decisions/2026-10-13-native-desktop-and-ipad-target.md) but
[chose three.js](/decisions/2026-10-15-threejs-over-unreal.md); Filament remains the most relevant
**native** alternative if a packaged web runtime proves inadequate on iPad. **[INFERRED]**

# Facts (as of 2026-10-13)

- v1.78.0 (13 Oct 2026); releases every 1-3 weeks; Apache-2.0; ~20,600 stars; "not an officially
  supported Google product".[^releases][^readme]
- Platforms and backends: Android, iOS, Linux, macOS, Windows, WASM; OpenGL 4.1+/ES 3.0+, Metal,
  Vulkan, WebGPU (native), WebGL 2 (browser).[^readme]
- Shading models: lit, subsurface, **cloth** (adds sheen colour and subsurface colour, drops
  metallic; subsurface colour "should be used with care"), unlit. Lit: clear coat (roughly doubles
  specular cost), sheen, second specular lobe (v1.76), anisotropy, transmission/IOR/absorption/
  dispersion, **iridescence (v1.77, 15 Sep 2026; not with cloth)**.[^materials][^releases]
- Custom BRDF: `customSurfaceShading` implements `surfaceShading` per directional/spot/point light,
  lit model only; IBL interaction undocumented.[^materials]
- Transparency: blend modes plus two-pass modes; **no OIT**. No area lights or ray tracing listed.[^materials][^readme]
- Tooling: `matc` offline material compiler, `cmgen` IBL generator, `filagui` (Dear ImGui helper),
  glTF viewer.[^readme] Several recent releases require recompiling materials.[^releases]
- Web: only a WebGL WASM build is documented;[^building] npm `filament` last published 1.53.4 on 9 Aug
  2024 (~1,300 weekly downloads); WebGPU-on-web began landing 5 May 2026.[^npm-versions][^pr-webgpu]
- User example: SceneView uses Filament on Android and Filament.js in the browser.[^sceneview]

# Inferences

- **[INFERRED]** Closest stock match to the fabric requirements after Unreal Substrate and Unity's
  frozen HDRP; glints would be custom via `surfaceShading` (analytic lights only on the evidence).[^notes-native]
- **[INFERRED]** It is only a renderer: picking, painting, curves, gizmos, undo, docking UI, pen
  input and installers are all ours, normally with Qt, native UI or Dear ImGui; see
  [native small libraries](/engineering/platform/native-small-libraries.md).[^notes-native]
- **[INFERRED]** On the web it is effectively WebGL 2 only in Oct 2026, with a web community three
  to four orders of magnitude smaller than three.js's.[^notes-web]

[^notes-web]: Research notes, web engine options, section 4
[^notes-native]: Research notes, native engine options, section 4
[^report]: Research report, engine options table
[^readme]: Filament README
[^releases]: Filament releases
[^materials]: Filament materials guide
[^building]: BUILDING.md
[^npm-versions]: npm versions
[^pr-webgpu]: PR 9946
[^sceneview]: SceneView README
