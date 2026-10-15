---
type: Component
title: three.js (chosen engine)
description: "Status CHOSEN. MIT-licensed web renderer, r186 (Sept 2026), ~21M weekly npm downloads; glTF-level advanced materials, a subclassable TSL LightingModel for custom BRDFs on WebGPU and WebGL 2, instancing and BatchedMesh, area lights and a TSL post stack; editor tools come from add-ons."
tags: [platform, engine, threejs, chosen, webgpu]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
stale_after: 2027-04-15T00:00:00Z
sources:
  - id: notes-web
    resource: /references/research/web-engine-options.md
    title: "Research notes: web engine options (sections 1, 2, 9)"
  - id: decision-engine
    resource: /decisions/2026-10-15-threejs-over-unreal.md
    title: Decision, three.js over Unreal
  - id: decision-platform
    resource: /decisions/2026-10-13-native-desktop-and-ipad-target.md
    title: Decision, native desktop and iPad target
  - id: npm-versions
    resource: https://www.npmjs.com/package/three?activeTab=versions
    title: npm, three versions
  - id: gh-releases
    resource: https://github.com/mrdoob/three.js/releases
    title: three.js GitHub releases
  - id: gh-repo
    resource: https://github.com/mrdoob/three.js
    title: mrdoob/three.js repository
  - id: npm-dl
    resource: https://api.npmjs.org/downloads/point/last-week/three
    title: npm downloads API, three (5-11 Oct 2026)
  - id: physical-material
    resource: https://threejs.org/docs/pages/MeshPhysicalMaterial.html
    title: three.js MeshPhysicalMaterial docs
  - id: tsl-wiki
    resource: https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language
    title: Three.js Shading Language wiki
  - id: lighting-model
    resource: https://github.com/mrdoob/three.js/blob/r186/src/nodes/core/LightingModel.js
    title: LightingModel.js (r186)
  - id: lights-custom
    resource: https://github.com/mrdoob/three.js/blob/r186/examples/webgpu_lights_custom.html
    title: webgpu_lights_custom example (r186)
  - id: oit
    resource: https://github.com/mrdoob/three.js/blob/r186/examples/webgpu_oit.html
    title: webgpu_oit example (r186)
  - id: instanced
    resource: https://github.com/mrdoob/three.js/blob/r186/src/objects/InstancedMesh.js
    title: InstancedMesh.js (r186)
  - id: batched
    resource: https://github.com/mrdoob/three.js/blob/r186/src/objects/BatchedMesh.js
    title: BatchedMesh.js (r186)
  - id: bufferattr
    resource: https://github.com/mrdoob/three.js/blob/r186/src/core/BufferAttribute.js
    title: BufferAttribute.js (r186)
  - id: examples
    resource: https://threejs.org/examples/files.json
    title: three.js examples index
  - id: drawindirect
    resource: https://github.com/mrdoob/three.js/blob/r186/examples/webgpu_struct_drawindirect.html
    title: webgpu_struct_drawindirect (r186)
  - id: forum-compute
    resource: https://discourse.threejs.org/t/tsl-and-webgl2-vs-webgpu/87974
    title: three.js forum, Mugen87 on compute and WebGL 2 (7 Nov 2025)
  - id: controls
    resource: https://github.com/mrdoob/three.js/tree/r186/examples/jsm/controls
    title: three.js r186 controls add-ons
  - id: tsl-display
    resource: https://github.com/mrdoob/three.js/tree/r186/examples/jsm/tsl/display
    title: three.js r186 TSL display (post-processing) add-ons
  - id: loaders
    resource: https://github.com/mrdoob/three.js/tree/r186/examples/jsm/loaders
    title: three.js r186 loaders
  - id: constants
    resource: https://github.com/mrdoob/three.js/blob/r186/src/constants.js
    title: three.js constants.js (r186)
  - id: hdr-example
    resource: https://github.com/mrdoob/three.js/blob/r186/examples/webgpu_hdr.html
    title: webgpu_hdr example (r186)
  - id: multicanvas
    resource: https://github.com/mrdoob/three.js/blob/r186/examples/webgpu_multiple_canvas.html
    title: webgpu_multiple_canvas example (r186)
  - id: build-files
    resource: https://app.unpkg.com/three@0.186.1/files/build
    title: three 0.186.1 build files
  - id: ts-types
    resource: https://github.com/three-types/three-ts-types/releases
    title: three-ts-types releases
  - id: cinevva
    resource: https://app.cinevva.com/blog/2026-06-09-web-game-engines-2026-comparison
    title: Cinevva web engine comparison (vendor of competing platform)
---

# Status

**CHOSEN.** The owner chose three.js over Unreal after building proofs of concept in both, for
lightweight, fast iteration; Unreal is not to be re-proposed.[^decision-engine] The research report
had recommended three.js for a browser product; the owner's target is instead a
[native desktop and iPad app](/decisions/2026-10-13-native-desktop-and-ipad-target.md), with
browser prototyping acceptable,[^decision-platform] so three.js ships inside a packaged web runtime
(see [desktop and iPad packaging](/engineering/platform/desktop-and-ipad-packaging.md)).

# Facts (as of 2026-10-13)

| Area | three.js r186 |
|---|---|
| Release | npm `three` 0.186.0 on 2026-09-08, 0.186.1 on 2026-09-24; 2026 releases r183 (Feb), r184 (Apr), r185 (Jul), r186 (Sep), i.e. every 2-3 months; r187 in development[^npm-versions][^gh-releases] |
| Licence, community | MIT; about 116,300 GitHub stars;[^gh-repo] 21,082,279 npm downloads in the week 5-11 Oct 2026 (counts include CI)[^npm-dl] |
| Materials | `MeshPhysicalMaterial`: anisotropy, clearcoat (own roughness/normal), iridescence, sheen, transmission with thickness/attenuation/dispersion, specular colour, retroreflectivity (r186)[^physical-material] |
| Custom shading | WebGPURenderer needs TSL node materials (no `ShaderMaterial`/`onBeforeCompile`); node slots incl. `colorNode`, `normalNode`, `lightsNode`;[^tsl-wiki] abstract `LightingModel` with hooks `start`, `finish`, `direct`, `directRectArea`, `indirect`, `ambientOcclusion`, subclassed in an official example.[^lighting-model][^lights-custom] TSL compiles to WGSL or GLSL, so one BRDF serves both backends[^notes-web] |
| Transparency | Weighted-blended OIT via `OITPassNode` example, plus alpha hash[^oit] |
| Instancing | `InstancedMesh` (`setMatrixAt`, `setColorAt`, `raycast`); partial uploads via `addUpdateRange`; `BatchedMesh` with per-object culling, `addInstance`/`deleteInstance`, per-instance opacity (r183)[^instanced][^bufferattr][^batched] |
| GPU compute | 17 `webgpu_compute_*` examples; compute-written indirect draws;[^examples][^drawindirect] compute, indirect draws and atomics are **WebGPU-only**; not fully compatible with WebGL 2[^forum-compute] |
| Editor primitives | Add-ons: `TransformControls`, `OrbitControls`, `DragControls`, `SelectionBox`, `ViewHelper`, `OutlineNode`; **no GPU picker, no texture-painting or BVH example** in core[^controls][^examples] |
| Lighting and post | Rect area lights, IES, clustered lights, cascaded/variance/contact shadows; TSL post nodes incl. Bloom, GTAO, SSGI, SSR, SSS, TRAA, FXAA/SMAA, DoF, Outline, Lut3D, OIT;[^examples][^tsl-display] loaders HDR, EXR, UltraHDR, KTX2, IES, Draco[^loaders] |
| Tone mapping, HDR | Linear, Reinhard, Cineon, ACES Filmic, AgX, Neutral, Custom;[^constants] HDR-display example (Extended sRGB)[^hdr-example] |
| Multi-view | One `WebGPURenderer` can drive several canvases (`CanvasTarget`); async `ReadbackBuffer` (r184)[^multicanvas][^gh-releases] |
| Size | Unminified: `three.core.js` 1,424 KB + `three.module.js` 647 KB (WebGL) or `three.webgpu.js` 2,231 KB[^build-files] |
| Types | Separate `three-types/three-ts-types` project[^ts-types] |

Cinevva (a competing vendor) characterises three.js as a rendering library, not an engine: largest
web-3D community, no bundled editor, physics or entity system.[^cinevva]

# What we must build on top **[INFERRED]**

No engine ships a glint/glitter or diffraction BRDF; three.js's `LightingModel` hook is the most
direct documented way to add one while keeping the light loop, shadows and IBL.[^notes-web] Picking
(three-mesh-bvh), gizmos (add-ons), post (built-in TSL stack) and UI glue are assembled by us; see
[three.js editor ecosystem](/engineering/platform/threejs-editor-ecosystem.md). Rendering
techniques live under [/engineering/rendering/](/engineering/rendering/about.md).

Risks: [renderer maturity and upgrade risk](/engineering/platform/threejs-renderer-maturity.md).
Fallbacks: [Babylon.js](/engineering/platform/babylonjs.md) (same packaging), then a
[hand-rolled renderer](/engineering/platform/hand-rolled-renderer.md).

[^notes-web]: Research notes, web engine options
[^decision-engine]: Decision, three.js over Unreal
[^decision-platform]: Decision, native desktop and iPad target
[^npm-versions]: npm versions
[^gh-releases]: GitHub releases
[^gh-repo]: GitHub repository
[^npm-dl]: npm downloads API
[^physical-material]: MeshPhysicalMaterial docs
[^tsl-wiki]: TSL wiki
[^lighting-model]: LightingModel.js
[^lights-custom]: webgpu_lights_custom
[^oit]: webgpu_oit
[^instanced]: InstancedMesh.js
[^batched]: BatchedMesh.js
[^bufferattr]: BufferAttribute.js
[^examples]: Examples index
[^drawindirect]: webgpu_struct_drawindirect
[^forum-compute]: three.js forum, 7 Nov 2025
[^controls]: Controls add-ons
[^tsl-display]: TSL display add-ons
[^loaders]: Loaders
[^constants]: constants.js
[^hdr-example]: webgpu_hdr
[^multicanvas]: webgpu_multiple_canvas
[^build-files]: unpkg build files
[^ts-types]: three-ts-types
[^cinevva]: Cinevva comparison
