---
type: Component
title: PlayCanvas
description: "Status NOT CHOSEN. MIT engine 2.23 (Oct 2026), WebGL2-first with WebGPU labelled beta; glTF-level materials, strong editor classes (picker, gizmos, outline), but custom shading needs paired GLSL and WGSL chunk overrides, compute and indirect draws are WebGPU-only, and its 2026 focus is Gaussian splats."
tags: [platform, engine, playcanvas, not-chosen]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
stale_after: 2027-04-15T00:00:00Z
sources:
  - id: notes-web
    resource: /references/research/web-engine-options.md
    title: "Research notes: web engine options (sections 1 and 3)"
  - id: releases
    resource: https://github.com/playcanvas/engine/releases
    title: PlayCanvas engine releases
  - id: repo
    resource: https://github.com/playcanvas/engine
    title: playcanvas/engine repository
  - id: npm-dl
    resource: https://api.npmjs.org/downloads/point/last-week/playcanvas
    title: npm downloads, playcanvas
  - id: dts
    resource: https://app.unpkg.com/playcanvas@2.23.2/files/build/playcanvas.d.ts
    title: playcanvas.d.ts 2.23.2
  - id: stdmat
    resource: https://api.playcanvas.com/engine/classes/StandardMaterial.html
    title: PlayCanvas StandardMaterial API
  - id: shader-migrations
    resource: https://developer.playcanvas.com/user-manual/graphics/shaders/migrations/
    title: PlayCanvas shader migrations docs
  - id: indirect
    resource: https://developer.playcanvas.com/user-manual/graphics/advanced-rendering/indirect-drawing/
    title: PlayCanvas indirect drawing docs
  - id: graphics-manual
    resource: https://developer.playcanvas.com/user-manual/graphics/
    title: PlayCanvas graphics manual
  - id: plans
    resource: https://playcanvas.com/plans
    title: PlayCanvas plans
  - id: build-files
    resource: https://app.unpkg.com/playcanvas@2.23.2/files/build
    title: playcanvas 2.23.2 build files
---

# Status

**NOT CHOSEN.** Not recommended by the research (its own WebGPU label is the most cautious of the
three web engines) and not part of the owner's decisions.[^notes-web]

# Facts (as of 2026-10-13)

- v2.23.2 (9 Oct 2026); 2.24 betas daily; MIT; ~17,000 stars; 118,672 weekly downloads; users named
  include Arm, BMW, Disney, Samsung, Snap.[^releases][^repo][^npm-dl] Minified ES module 2,491 KB.[^build-files]
- Materials: sheen, clearcoat, anisotropy (GGX), thin-film iridescence, refraction with optional
  grab-pass, dispersion; transparency by blending, `opacityDither`, alpha-to-coverage; **no OIT**.[^stdmat][^dts]
- Custom shading: replace shader chunks or write `ShaderMaterial`, in **both GLSL and WGSL** for both
  backends; chunk API constants are versioned (`CHUNKAPI_1_51` to `CHUNKAPI_2_8`), so overrides are
  periodically invalidated; the `LitMaterial` front/back split is internal.[^stdmat][^dts][^shader-migrations]
- Compute, storage buffers and indirect draws are WebGPU-only; indirect draws cap at 1,024 per frame
  by default.[^indirect][^dts] 2.23 added persistent instance-matrix storage and partial uploads on WebGPU.[^releases]
- Editor classes in core: `Picker` (ID render with async queries and depth), translate/rotate/scale
  gizmos with snapping, `ViewCube`, `OutlineRenderer`, `SceneDepthReader`, wide lines, glTF/USDZ
  exporters.[^dts]
- Lighting: rect/disk/sphere area lights, clustered lighting, `CameraFrame` post stack, HDR display
  output (WebGPU only).[^graphics-manual]
- WebGPU **beta**; WebGL 2 the mature backend.[^graphics-manual] Much of the 2.22-2.23 changelog is
  Gaussian-splat work.[^releases]
- Optional hosted Editor: Free (1 GB), Personal $15/month, Organization $50 per seat/month.[^plans]

**[INFERRED]** It ships the most editor-oriented core classes for its size, but its material model
is glTF-PBR level and its engineering emphasis is elsewhere.[^notes-web]

[^notes-web]: Research notes, web engine options
[^releases]: PlayCanvas releases
[^repo]: Repository
[^npm-dl]: npm downloads
[^dts]: playcanvas.d.ts
[^stdmat]: StandardMaterial API
[^shader-migrations]: Shader migrations docs
[^indirect]: Indirect drawing docs
[^graphics-manual]: Graphics manual
[^plans]: PlayCanvas plans
[^build-files]: Build files
