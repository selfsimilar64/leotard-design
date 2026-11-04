---
type: Component
title: The 3D view on WebGPU (port in progress)
description: "Progress of Phase 1 of the WebGPU plan: the second renderer path (?renderer=webgpu, render/webgpu.js), what draws on it so far, what is held back until its step, and what differs from the WebGL reference."
tags: [rendering, webgpu, webgl, port, parity]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-05T02:00:00Z }
sources:
  - id: plan
    resource: /product/roadmap/webgpu-and-stone-engine-plan.md
    title: WebGPU renderer and one GPU stone engine (plan), Phase 1
  - id: base
    resource: /engineering/rendering/webgl-baseline-captures.md
    title: WebGL baseline captures
  - id: code
    resource: "app/src/render/webgpu.js, app/src/render/viewport.js, app/src/render/lines.js, app/src/stones/gpu-view.js, app/src/dev/baseline.js"
    title: WebGPU path code
    author: claude-code/claude-opus-5-5
  - id: run
    resource: "Claude Code session of 2026-11-04/05 (test copy of the app on port 5177)"
    title: Port checks
    author: claude-code/claude-opus-5-5
---

# Takeaway

**The app opens on WebGPU with `?renderer=webgpu`** (or `localStorage['leotard.renderer'] = 'webgpu'`); without it the
WebGL renderer runs exactly as before (captures equal to the baseline within capture noise).[^code][^run] Step 1 of the
plan is in: renderer, camera and controls, environments (HDRI studios, the softbox studio's area lights), shadows, floor,
and every mesh drawn with three.js's own materials. The fabric's own shader code, the post effects and the pattern stones
are the next steps.[^plan]

# How it is built

- `render/webgpu.js`: the choice (`RENDERER`), `createWebGPU` (WebGPURenderer with timestamp queries, its own
  PMREMGenerator, `ready` = `renderer.init()`), `NodePost` (a RenderPipeline answering what the viewport asks of the
  EffectComposer), stand-ins for the WebGL passes not yet ported, area-light tables, and `benchmarkFrames` (frames back to
  back, `queue.onSubmittedWorkDone`, GPU time from timestamp queries).
- `render/viewport.js`: draws nothing until the device is ready (`isReady`); environments and HDRIs wait for it;
  `benchmark` is a Promise on WebGPU (GPU time per frame left in `lastGpuMs`); `samplePatch` (photo colour match) refuses
  on WebGPU for now. `app.benchmark()` is async for both.
- `render/lines.js`: Line2 / LineSegments2 / their material for either renderer (WebGPU: `Line2NodeMaterial`).
- `dev/baseline.js` times and describes either renderer (`b.all('webgpu')`).

# State (2026-11-05)

| part | on WebGPU |
|---|---|
| renderer, camera, controls, studios, shadows, floor, lines | drawn |
| fabric (`materials/fabric.js` onBeforeCompile) | three's MeshPhysicalMaterial only: no lift off the body, no zones, no cut, no procedural layers (step 2) |
| skin finish, skin pass | step 3 |
| post: MSAA, contact shadows, bloom, glare, outline | none yet (step 4) |
| pattern stones (`stones/gpu-view.js` atlas: four float targets and GLSL) | not drawn, a console note (step 5); WebGPU's default allows 32 bytes per sample across colour targets, the atlas writes 64 |
| photo colour sampling, swatch renders, the person figure's occlusion bake | WebGL only (step 6) |

[^plan]: WebGPU renderer and one GPU stone engine (plan).
[^code]: WebGPU path code.
[^run]: Port checks, 2026-11-04/05.
