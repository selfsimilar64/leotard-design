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
- **Captures** (`captureFrame`): drawn into a render target and read back (rows come padded to 256 bytes). A WebGPU canvas
  only hands out what it last showed on screen, which is stale while the pane is hidden.
- **Frames outside the animation loop**: three re-renders a pass once per node frame, and only the animation loop advances
  the frame count; `NodePost.render` advances it on every call, or captures and benchmarks re-show an old frame.
- **GPU time**: three resolves only the last frame's timestamp queries, so `benchmarkFrames` samples up to 30 frames one by
  one (median) after timing the wall clock with tracking off. Matte torso at 1792 x 1344: 2.8 ms GPU, steady to 0.01 ms.

# State (2026-11-05)

| part | on WebGPU |
|---|---|
| renderer, camera, controls, studios, shadows, floor, lines | drawn |
| fabric | `materials/fabric-node.js`: the whole of FABRIC_FRAGMENT ported (pattern space, scans, print, checker, ombre, duochrome, film, knit, crinkle, flakes and foil, holo, mesh, decals, wrinkles, fit folds, seams, edge stitching), plus the garment surface, cut, lining clip, tapes and occlusion. Not yet: the lighting chunks (film thickness, foil specular, skin wrap, satin thread model). **Open bug**, see below |
| skin finish, skin pass | step 3 |
| post: MSAA, contact shadows, bloom, glare, outline | none yet (step 4) |
| pattern stones (`stones/gpu-view.js` atlas: four float targets and GLSL) | not drawn, a console note (step 5); WebGPU's default allows 32 bytes per sample across colour targets, the atlas writes 64 |
| photo colour sampling, swatch renders, the person figure's occlusion bake | WebGL only (step 6) |

# Open bug: fabrics far too bright on WebGPU (2026-11-05)

Matte, shiny, mystique, ombre, glitter, velvet and oil-slick come out light grey or white where WebGL shows the dark green;
hologram matches closely. What is known:[^run]
- Drawn unlit, every value the fabric function produces is right (colour, roughness 0.96, metalness 0, opacity 1).
- A stock MeshPhysicalNodeMaterial with the fabric's position node alone draws the right green; adding any one output of the
  fabric function (colour, normal, roughness, metalness, occlusion or opacity, even a metalness of 0) turns it grey. So
  evaluating the function changes the lighting itself.
- Not the cause, tested one at a time on the stock material: Discard, dFdx and fwidth, the geometry normal, the view
  direction, the view matrix, reflect, a loop, a struct, material colour/roughness/opacity reads, reference and
  per-object uniforms, a texture sample with bias.
- By sections (localStorage `fabricSkip`, read at load): grey with the scan, decal or duochrome/ombre/flake sections in,
  green with only wrinkles, folds and clip, green with only print. Colour uniforms fed as vec3 did not change it.
- Next to try: diff the generated WGSL of a green and a grey build (`renderer.debug.getShaderAsync`), especially the
  lighting part and the uniform struct; build the scan section alone; check whether a uniform count or a WGSL size limit
  is crossed.

Fixed on the way (each was a bug of the port, recorded so it is not made again): `customProgramCacheKey` on a node material
shares its node graph, and with it the first material's uniform objects, across materials; an empty `If` with an `Else` and
an int uniform compare let every decal slot through (now float compare, four unrolled slots of plain uniforms); nested
`Loop`s both named `i` in WGSL (now named); the derivatives' view position had the wrong sign; captures place the studio's
lights and exposure themselves (a page opened hidden never placed them). And WebGPU limits: 8 vertex buffers a draw (a
garment piece had 10: its fabric inputs now go in one interleaved copy per geometry, `syncFabricPacks`), one texture bound
to several slots lost its sampler (one placeholder per slot).

[^plan]: WebGPU renderer and one GPU stone engine (plan).
[^code]: WebGPU path code.
[^run]: Port checks, 2026-11-04/05.
