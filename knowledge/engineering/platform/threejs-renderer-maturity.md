---
type: Component
title: three.js WebGPU renderer maturity and upgrade risk
description: "three.js's own manual calls WebGPURenderer experimental, nearly every release has breaking changes and deprecations last 10 releases; Spline v2 nonetheless ships on it with a WebGL build alongside. Mitigation: pin versions, upgrade in steps, keep a WebGL 2 path."
tags: [platform, threejs, risk, webgpu, upgrades]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
stale_after: 2027-04-15T00:00:00Z
sources:
  - id: notes-web
    resource: /references/research/web-engine-options.md
    title: "Research notes: web engine options (sections 1 and 2)"
  - id: manual
    resource: https://threejs.org/manual/pages/webgpurenderer.html
    title: three.js WebGPURenderer manual
  - id: migration
    resource: https://github.com/mrdoob/three.js/wiki/Migration-Guide
    title: three.js Migration Guide
  - id: gh-releases
    resource: https://github.com/mrdoob/three.js/releases
    title: three.js GitHub releases
  - id: utsubo
    resource: https://www.utsubo.com/blog/threejs-2026-what-changed
    title: Utsubo, three.js 2026 what changed (studio selling three.js work)
  - id: examples
    resource: https://threejs.org/examples/files.json
    title: three.js examples index
  - id: forum-2026
    resource: https://discourse.threejs.org/t/webgpu-renderer-vanilla-three-js-vs-r3f-maturity-and-pitfalls/89661
    title: three.js forum reply, 6 Feb 2026 (community member)
  - id: heckel
    resource: https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/
    title: Maxime Heckel, Field Guide to TSL and WebGPU (14 Oct 2025)
  - id: buildmvp
    resource: https://www.buildmvpfast.com/blog/threejs-webgl-to-webgpu-renderer-migration-2026
    title: BuildMVPFast migration guide (2026)
  - id: spline-runtime
    resource: https://app.unpkg.com/@splinetool/runtime@2.0.79/files/build
    title: "@splinetool/runtime 2.0.79 build files"
  - id: spline-v2
    resource: https://alternativeto.net/news/2026/8/spline-v2-launches-with-rebuilt-3d-editor-ai-agents-webgpu-and-new-desktop-app/
    title: AlternativeTo on Spline v2 (Aug 2026)
  - id: tsl-wiki
    resource: https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language
    title: Three.js Shading Language wiki
---

# Takeaway

As of r186 the official manual still calls WebGPURenderer "experimental" (though much matured) and
says some applications will meet missing features or better performance on WebGLRenderer.[^manual]
Yet its surface is large (230 official WebGPU examples versus 298 WebGL)[^examples] and at least
one commercial design tool, Spline v2, ships its runtime on it.[^spline-runtime] **Adopting it means
TSL for all custom shading, breaking changes in nearly every release, and a mid-transition
ecosystem.**[^notes-web]

# Evidence

- **Breaking changes are routine.** The migration guide has a section for every release r176-r187.
  Heaviest recent: 184 to 185 (premultiplied alpha in WebGPURenderer, TSL renames, removals) and
  185 to 186. r183 renamed `PostProcessing` to `RenderPipeline`; r181 deprecated async
  render/compute; r186 removed `PCFSoftShadowMap` from WebGPURenderer; r187 (dev) rebuilds PMREM
  and changes custom-light registration.[^migration]
- **Deprecations last 10 releases**, so upgrade in steps of 10 or fewer.[^utsubo]
- **WebGLRenderer** stays maintained but gets no larger new features; r184 added a NodeMaterial
  compatibility layer for it.[^manual][^gh-releases]
- **Parity gaps** stated officially: no `ShaderMaterial`/`RawShaderMaterial`/`onBeforeCompile`, no
  `EffectComposer`. Init is async (`await renderer.init()` or `setAnimationLoop`).[^manual]
- **2026 WebGPU progress**: r184 non-blocking `compileAsync` and 3x faster TSL compile, async
  readback, reversed depth; r185 WebXR on WebGPU, `ClusteredLighting`; r186 `compileComputeAsync`,
  MSAA for WebXR.[^gh-releases]
- **Community advice is split**: a Feb 2026 forum reply (one community member) recommends
  WebGLRenderer for stability and says materials and post are not at parity.[^forum-2026] Maxime
  Heckel found TSL's node system the selling point but its syntax less legible, with undocumented
  gotchas.[^heckel] A migration write-up reports a black canvas on Firefox/Linux and a silent black
  canvas when async init is skipped.[^buildmvp] The TSL page on threejs.org returned 404; the wiki
  copy was used.[^tsl-wiki]
- **Performance**: no official benchmarks; a studio says WebGPU is not faster everywhere and advises
  profiling before migrating for speed.[^utsubo]
- **Shipped precedent**: Spline v2 (20 Aug 2026) rebuilt on a TSL WebGPU renderer with WebGL fallback
  and a new macOS/Windows desktop app; its runtime 2.0.79 bundles three.js WebGPU identifiers.[^spline-v2][^spline-runtime]
  Segments.ai migrated a point-cloud labeller; an Expo 2025 installation ran about one million particles (studio-reported).[^utsubo]

# Mitigation **[INFERRED]**

Pin one three.js version; budget a migration slot per upgrade; upgrade at most 10 releases at a
time; keep a WebGL 2 build path working (TSL makes most shading portable, but compute-driven
features need a CPU or reduced fallback).[^notes-web] Because the packaged app controls its
runtime (e.g. Electron's fixed Chromium), browser variance shrinks, but iPad WebKit remains a
moving target; see [WebGPU availability](/engineering/platform/webgpu-availability.md).

If instability blocks progress, the report's next test was the same scene in
[Babylon.js](/engineering/platform/babylonjs.md).

[^notes-web]: Research notes, web engine options, sections 1-2
[^manual]: WebGPURenderer manual
[^migration]: Migration Guide
[^gh-releases]: GitHub releases
[^utsubo]: Utsubo
[^examples]: Examples index
[^forum-2026]: three.js forum, 6 Feb 2026
[^heckel]: Maxime Heckel
[^buildmvp]: BuildMVPFast
[^spline-runtime]: Spline runtime package
[^spline-v2]: AlternativeTo, Spline v2
[^tsl-wiki]: TSL wiki
