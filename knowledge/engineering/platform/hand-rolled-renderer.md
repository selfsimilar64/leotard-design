---
type: Component
title: Hand-rolled renderer (and when it becomes justified)
description: "Status NOT NOW; second fallback. Writing our own WebGPU/native renderer buys total control of the lighting loop, transparency and bundle size, but means rebuilding infrastructure engines already ship (pipeline caching, device loss, fallbacks); justified only if an engine demonstrably blocks the sparkle pipeline or speed target."
tags: [platform, renderer, webgpu, fallback, risk]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-web
    resource: /references/research/web-engine-options.md
    title: "Research notes: web engine options (sections 6 and 7)"
  - id: notes-native
    resource: /references/research/native-engine-options.md
    title: "Research notes: native engine options (sections 7 and 10)"
  - id: report
    resource: /references/research/research-report.md
    title: "Research report: Borrow the engine, build the sparkle"
  - id: decision-engine
    resource: /decisions/2026-10-15-threejs-over-unreal.md
    title: Decision, three.js over Unreal
  - id: toji
    resource: https://toji.dev/webgpu-gltf-case-study/
    title: toji.dev, efficiently rendering glTF with WebGPU (updated 29 Feb 2024)
  - id: figma-2025
    resource: https://www.figma.com/blog/figma-rendering-powered-by-webgpu/
    title: Figma, rendering powered by WebGPU (18 Sep 2025)
  - id: figma-2015
    resource: https://www.figma.com/blog/building-a-professional-design-tool-on-the-web/
    title: Figma, building a professional design tool on the web (2015)
  - id: onshape
    resource: https://www.onshape.com/en/blog/how-does-onshape-really-work
    title: Onshape, how does Onshape really work (28 Jun 2018)
  - id: wittens
    resource: https://acko.net/blog/use-gpu-goes-trad/
    title: Steven Wittens, Use.GPU Goes Trad (14 Jan 2023)
  - id: shapr3d
    resource: https://www.shapr3d.com/blog/brief-history-of-shapr3d
    title: Shapr3D, brief history (28 Jul 2025)
  - id: twinmotion
    resource: https://www.unrealengine.com/blog/twinmotion-breaks-out-of-the-box-with-a-bridge-to-ue4
    title: Epic blog on Twinmotion (16 Jan 2019)
  - id: bjs8
    resource: https://blogs.windows.com/windowsdeveloper/2025/03/27/announcing-babylon-js-8-0/
    title: Babylon.js 8.0 announcement
  - id: procreate-verge
    resource: https://www.theverge.com/2019/9/6/20847944/procreate-5-valkyrie-photoshop-brushes-color-profiles-cmyk
    title: The Verge on Procreate's Valkyrie engine (6 Sep 2019)
---

# Status

**NOT NOW; second fallback** after three.js (chosen) and Babylon.js.[^decision-engine][^report]

# Takeaway

The demanding web design tools that hand-rolled (Figma's C++/WebAssembly renderer; Onshape's custom
WebGL renderers) show that the infrastructure beneath any material work is itself a multi-phase
project.[^notes-web] No source gives a person-month figure for a PBR-grade renderer; the one dated
data point is Shapr3D: "took three years to establish solid foundations".[^shapr3d] Every
leotard-specific effect found is shading code of the kind engines' extension points accept.[^report]

# What it would take

Work list to reach the engines' baseline **[INFERRED]**: glTF and KTX2/Basis loading; PBR with IBL
prefiltering; shadows; post chain (bloom, AO, temporal AA, tone mapping); GPU or BVH picking;
instancing with partial updates; a transparency strategy; gizmos and outlines; shader-variant and
pipeline caching with async compilation; device-loss recovery; and either a WebGL 2 fallback or an
explicit WebGPU-only stance.[^notes-web]

Evidence of the cost:

- Pipeline creation is expensive and hitches mid-render; drivers need not remove redundant state;
  transparency sorting left unsolved in a reference walkthrough.[^toji]
- Figma (2025) moved its renderer to WebGPU by making draw arguments explicit, batching uniforms,
  writing a GLSL-to-WGSL shader processor (via naga), handling async-only readback, caching bind
  groups; WebGPU can fail mid-session, so it built a **live mid-session fallback to WebGL** and a
  device blocklist; results improved on some devices, neutral on others, numbers unpublished.[^figma-2025]
- Figma (2015) hand-rolled because HTML/SVG/canvas were too slow for its 2D vector documents, and
  hit browser limits on memory, fonts, clipboard, pinch-zoom and high-DPI cursors.[^figma-2015]
- Onshape renders server-tessellated CAD triangles with custom WebGL/OpenGL renderers.[^onshape]
- Use.GPU found WebGPU leaves "limitations and quirks" to app developers.[^wittens]
- Engines' own effort: three.js's WebGPU renderer still "experimental"; Babylon.js hand-wrote WGSL
  for its core shaders to drop a 3 MB+ converter.[^bjs8][^notes-web]
- Reverse case: Twinmotion abandoned its own engine after a decade for Unreal.[^twinmotion]

# When it becomes justified

The report's three conditions, which must hold **together**:[^report]

1. A stress test shows the engine's fixed frame assembly preventing the sparkle pipeline or missing
   the speed target.
2. The product is confirmed long-lived and single-purpose (one garment, one body, few lights is far
   narrower than a general engine).
3. An engineer who has built a renderer before is on the team.

Even then: a thin layer over WebGPU (or a native abstraction; see
[native small libraries](/engineering/platform/native-small-libraries.md)), not a start from
nothing. The tablet-first tools examined (Procreate's Valkyrie, Nomad, Shapr3D, ZBrush for iPad)
all run proprietary engines, which is the strongest argument for this path on iPad.[^procreate-verge][^notes-native]

**[INFERRED]** Benefits specific to us: full control of the light loop (bespoke glint BRDF), a
compute-culled stone pass, exact sheer-mesh transparency, minimal bundle, no upstream breakage.
Risks: long time to first good pixel, browser/driver bugs engines already absorbed, key-person
dependency, smaller hiring pool.[^notes-web]

[^notes-web]: Research notes, web engine options, sections 6-7
[^notes-native]: Research notes, native engine options, sections 7-8
[^report]: Research report, engine section
[^decision-engine]: Decision, three.js over Unreal
[^toji]: toji.dev glTF case study
[^figma-2025]: Figma, 2025
[^figma-2015]: Figma, 2015
[^onshape]: Onshape
[^wittens]: Steven Wittens
[^shapr3d]: Shapr3D brief history
[^twinmotion]: Epic blog, Twinmotion
[^bjs8]: Babylon.js 8.0 announcement
[^procreate-verge]: The Verge, 2019
