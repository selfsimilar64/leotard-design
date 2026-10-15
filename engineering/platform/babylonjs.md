---
type: Component
title: Babylon.js
description: "Status FALLBACK (named by the research, not re-evaluated by the owner). Apache-2.0, 9.30 (Oct 2026), WebGPU labelled complete, no breaking changes flagged, more editor tools in core, Adobe-contributed OpenPBR; weaker for custom BRDFs (fragile shader injection) and for constantly edited instance sets."
tags: [platform, engine, babylonjs, fallback, webgpu]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
stale_after: 2027-04-15T00:00:00Z
sources:
  - id: notes-web
    resource: /references/research/web-engine-options.md
    title: "Research notes: web engine options (sections 1 and 3)"
  - id: report
    resource: /references/research/research-report.md
    title: "Research report: Borrow the engine, build the sparkle"
  - id: decision-engine
    resource: /decisions/2026-10-15-threejs-over-unreal.md
    title: Decision, three.js over Unreal
  - id: releases
    resource: https://github.com/BabylonJS/Babylon.js/releases
    title: Babylon.js releases
  - id: bjs9
    resource: https://blogs.windows.com/windowsdeveloper/2026/03/26/announcing-babylon-js-9-0/
    title: Babylon.js 9.0 announcement (26 Mar 2026)
  - id: bjs9-p2
    resource: https://blogs.windows.com/windowsdeveloper/2026/03/30/part-2-babylon-js-9-0-tooling-updates-and-new-geospatial-features/
    title: Babylon.js 9.0 Part 2 (30 Mar 2026)
  - id: bjs9-p3
    resource: https://blogs.windows.com/windowsdeveloper/2026/04/02/part-3-babylon-js-9-0-openpbr-and-additional-engine-updates/
    title: Babylon.js 9.0 Part 3 (2 Apr 2026)
  - id: bjs8
    resource: https://blogs.windows.com/windowsdeveloper/2025/03/27/announcing-babylon-js-8-0/
    title: Babylon.js 8.0 announcement (27 Mar 2025)
  - id: repo
    resource: https://github.com/BabylonJS/Babylon.js
    title: BabylonJS/Babylon.js repository
  - id: npm-dl
    resource: https://api.npmjs.org/downloads/point/last-week/@babylonjs/core
    title: npm downloads, @babylonjs/core
  - id: pbr-files
    resource: https://app.unpkg.com/@babylonjs/core@9.30.0/files/Materials/PBR
    title: "@babylonjs/core 9.30.0 PBR files"
  - id: openpbr-dts
    resource: https://app.unpkg.com/@babylonjs/core@9.30.0/files/Materials/PBR/openpbrMaterial.pure.d.ts
    title: openpbrMaterial.pure.d.ts 9.30.0
  - id: openpbr-docs
    resource: https://doc.babylonjs.com/features/featuresDeepDive/materials/using/OpenPBR/
    title: Babylon.js OpenPBR docs
  - id: openpbr-forum
    resource: https://forum.babylonjs.com/t/does-openpbrmaterial-now-support-rendering-light-shadows-now/60904
    title: Babylon.js forum on OpenPBRMaterial stability
  - id: plugins
    resource: https://doc.babylonjs.com/features/featuresDeepDive/materials/using/materialPlugins
    title: Babylon.js material plugins docs
  - id: transparency
    resource: https://doc.babylonjs.com/features/featuresDeepDive/materials/advanced/transparent_rendering
    title: Babylon.js transparent rendering docs
  - id: thin-instances
    resource: https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances
    title: Babylon.js thin instances docs
  - id: compute
    resource: https://app.unpkg.com/@babylonjs/core@9.30.0/files/Compute/computeShader.pure.d.ts
    title: "@babylonjs/core 9.30.0 ComputeShader typings"
  - id: gizmos
    resource: https://app.unpkg.com/@babylonjs/core@9.30.0/files/Gizmos/gizmoManager.d.ts
    title: "@babylonjs/core 9.30.0 gizmo manager"
  - id: webgpu-status
    resource: https://doc.babylonjs.com/setup/support/webGPU/webGPUStatus
    title: Babylon.js WebGPU status
  - id: cinevva
    resource: https://app.cinevva.com/blog/2026-06-09-web-game-engines-2026-comparison
    title: Cinevva comparison (competing vendor)
---

# Status

**FALLBACK.** The research report named Babylon.js the credible alternative if three.js's WebGPU
renderer proved too unstable, and proposed running the same stress scene in it next.[^report] The
owner's decision chose three.js over Unreal and did not revisit Babylon.js;[^decision-engine] it
would be packaged the same way as three.js.

# Facts (as of 2026-10-13)

| Area | Babylon.js 9.30 |
|---|---|
| Release | 9.30.0 on 2026-10-08; 9.0 on 26 Mar 2026; roughly weekly point releases; **no breaking changes flagged 9.23-9.30**[^releases][^bjs9] |
| Licence, community | Apache-2.0; ~26,200 stars;[^repo] 398,746 weekly downloads (vs ~21M for three.js)[^npm-dl] |
| Materials | PBR modules for sheen, clearcoat, anisotropy, iridescence, subsurface;[^pbr-files] `OpenPBRMaterial` (alpha from April 2026, Adobe contribution) exposes base, specular with anisotropy, coat with anisotropy, **fuzz**, thin-film, transmission with dispersion, subsurface[^bjs9-p3][^openpbr-dts] |
| OpenPBR caveats | Docs lag the shipped class; a maintainer advised staying on `PBRMaterial` until it stabilises[^openpbr-docs][^openpbr-forum] |
| Custom shading | Material plugins inject code at named points or by regex, need GLSL and WGSL, and **names are not guaranteed stable across versions**; Node Material Editor emits WGSL since 8.0[^plugins][^bjs8] |
| Transparency | Per-mesh sorting; OIT by dual depth peeling (default 5 passes, ~10 layers) is **beta**, incompatible with anti-aliasing and refraction textures[^transparency] |
| Instancing | Thin instances: one matrix per instance, custom attributes, all-or-nothing culling, costlier add/remove, **recommended for mostly static sets**[^thin-instances] |
| Compute | `ComputeShader`, `GPUPicker`; indirect-draw API not found (weak evidence)[^compute][^notes-web] |
| Editor tools in core | Gizmo manager, utility layer, GPU picker, selection outline, bounding boxes, GreasedLine, multi-canvas views;[^gizmos] Inspector v2 extensible (React); desktop Babylon.js Editor for Windows, macOS, Linux[^bjs9-p2] |
| Lighting | Area lights (8.0), textured (9.0); IBL shadows (Adobe, 8.0; dynamic 9.0); clustered lighting; volumetric lighting; Frame Graph v1 (40%+ GPU memory savings in some cases)[^bjs8][^bjs9] |
| WebGPU | "Complete" with near parity; gaps: non-unit point sizes, triangle fans/line loops, WebXR on WebGPU experimental; **async pipeline creation still planned**[^webgpu-status] |

Cinevva describes it as the all-in-one option with bundled physics and a free editor.[^cinevva]

# Inferences

- **[INFERRED]** The roadmap most aligned with fabric fidelity (OpenPBR fuzz, thin-film, coat
  anisotropy), with sustained Adobe investment.[^notes-web]
- **[INFERRED]** Weaknesses for this product: custom glint shading via injection points its docs
  warn may change; thin instances tuned for static sets while stone painting adds and removes
  constantly (needs pre-allocated updatable buffers); planned-not-done async pipeline creation
  suggests first-use shader stalls to measure.[^notes-web][^report]

[^notes-web]: Research notes, web engine options
[^report]: Research report, engine section
[^decision-engine]: Decision, three.js over Unreal
[^releases]: Babylon.js releases
[^bjs9]: Babylon.js 9.0 announcement
[^bjs9-p2]: Babylon.js 9.0 Part 2
[^bjs9-p3]: Babylon.js 9.0 Part 3
[^bjs8]: Babylon.js 8.0 announcement
[^repo]: Repository
[^npm-dl]: npm downloads
[^pbr-files]: PBR files
[^openpbr-dts]: OpenPBR typings
[^openpbr-docs]: OpenPBR docs
[^openpbr-forum]: Babylon.js forum
[^plugins]: Material plugins docs
[^transparency]: Transparent rendering docs
[^thin-instances]: Thin instances docs
[^compute]: ComputeShader typings
[^gizmos]: Gizmo manager typings
[^webgpu-status]: WebGPU status page
[^cinevva]: Cinevva comparison
