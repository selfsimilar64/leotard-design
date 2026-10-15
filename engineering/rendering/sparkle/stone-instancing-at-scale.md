---
type: Technique
title: Stone instancing at scale
description: "Raw instance count is not the bottleneck (10^5 stones at 32 bytes = 3.2 MB); design for 10^3-2x10^5 instances with a 32-byte edit-in-place record, cluster/GPU culling, dirty-range uploads while painting, ID-buffer picking; WebGL2, WebGPU and three.js specifics."
tags: [rendering, instancing, performance, webgpu, picking]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: srr
    resource: /references/research/realtime-sparkle-rendering.md
    title: "Research notes: real-time sparkle rendering"
    author: claude-code/claude-opus-5-5
  - id: mdn-limits
    resource: https://developer.mozilla.org/en-US/docs/Web/API/GPUSupportedLimits
    title: MDN, GPUSupportedLimits
    author: org:mdn
  - id: mdn-features
    resource: https://developer.mozilla.org/en-US/docs/Web/API/GPUSupportedFeatures
    title: MDN, GPUSupportedFeatures
    author: org:mdn
  - id: gpuweb-status
    resource: https://github.com/gpuweb/gpuweb/wiki/Implementation-Status
    title: gpuweb Implementation Status wiki
    author: org:gpuweb
  - id: chrome-131
    resource: https://developer.chrome.com/blog/new-in-webgpu-131
    title: "Chrome, What's new in WebGPU 131"
    author: org:google
  - id: toji-bundles
    resource: https://toji.dev/webgpu-best-practices/render-bundles.html
    title: "Toji, Render bundle best practices"
    author: org:toji
  - id: toji-indirect
    resource: https://toji.dev/webgpu-best-practices/indirect-draws.html
    title: "Toji, Indirect draw best practices"
    author: org:toji
  - id: toji-buffers
    resource: https://toji.dev/webgpu-best-practices/buffer-uploads.html
    title: "Toji, Buffer upload best practices"
    author: org:toji
  - id: wgf-opt
    resource: https://webgpufundamentals.org/webgpu/lessons/webgpu-optimization.html
    title: "WebGPU Fundamentals, Optimization"
    author: org:webgpufundamentals
  - id: mdn-webgl-bp
    resource: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
    title: MDN, WebGL best practices
    author: org:mdn
  - id: mdn-multidraw
    resource: https://developer.mozilla.org/en-US/docs/Web/API/WEBGL_multi_draw
    title: MDN, WEBGL_multi_draw
    author: org:mdn
  - id: three-batched
    resource: https://threejs.org/docs/pages/BatchedMesh.html
    title: three.js BatchedMesh docs
    author: org:threejs
  - id: three-indirect
    resource: https://threejs.org/docs/pages/IndirectStorageBufferAttribute.html
    title: three.js IndirectStorageBufferAttribute docs
    author: org:threejs
  - id: babylon-thin
    resource: https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances
    title: Babylon.js thin instances
    author: org:babylonjs
  - id: haar2015
    resource: https://advances.realtimerendering.com/s2015/index.html
    title: "Haar & Aaltonen, GPU-Driven Rendering Pipelines, SIGGRAPH 2015"
    author: org:advances-rtr
  - id: webgl2-picking
    resource: https://webgl2fundamentals.org/webgl/lessons/webgl-picking.html
    title: "WebGL2 Fundamentals, Picking"
    author: org:webgl2fundamentals
---

# Takeaway

**Raw instance count is not the bottleneck**: a million 32-byte instances is 32 MB, inside WebGPU's
default limits, and a garment physically holds at most ≈10^5 stones or sequins — the million-element
case is glitter, which belongs in the BRDF, not in instances.[^srr] What matters is the
[LOD chain](/engineering/rendering/sparkle/crystal-lod-chain.md) driven by projected size, culling,
sub-range buffer updates while painting, and an ID-buffer pick. Design for **10^3–2×10^5** instances;
treat 10^6 as a stress test. **[INFERRED]**[^srr]

# Platform facts

- WebGPU default limits: `maxBufferSize` 256 MB, `maxStorageBufferBindingSize` 128 MB,
  `maxUniformBufferBindingSize` 64 KB, 8 vertex buffers, 16 vertex attributes, 2048-byte stride, 8192
  max 2D texture, 256 array layers, 8 storage buffers per stage, 8 colour attachments; higher on
  request.[^mdn-limits]
- WebGPU shipping (Oct 2026): Chrome Windows/macOS/ChromeOS since 113, Android 12+ since 121, Linux
  from 144 (Intel Gen12+)/147 (NVIDIA Wayland); Firefox 141 Windows, 145/147 macOS, Linux/Android
  during 2026; Safari 26 on macOS/iOS/iPadOS/visionOS.[^gpuweb-status]
- Core WebGPU has single indirect draws; multi-draw indirect only behind Chrome's unsafe flag
  (`chromium-experimental-multi-draw-indirect`, Chrome 131);[^chrome-131] non-zero `firstInstance` in
  indirect draws needs `indirect-first-instance`.[^mdn-features]
- GPU-driven pattern: compute pass tests visibility, writes surviving indices, bumps instance count in
  indirect args; vertex shader looks up by instance index.[^toji-bundles] Keep all indirect args in
  **one buffer**: Dawn/D3D12 validation costs ≈3 ms for 412 draws across buffers vs ≈10 µs combined.[^toji-indirect]
- `queue.writeBuffer()` with offset is the recommended default for partial updates.[^toji-buffers]
- One draw per object: ≈8,000 cubes at 75 fps on an M1 (≈15,000 optimised); instance once you draw
  hundreds of copies.[^wgf-opt]
- WebGL2: batch draws; ≥4096 textures and 16 attributes everywhere; avoid `getError`/sync
  `readPixels`; async readback via `PIXEL_PACK_BUFFER` + `fenceSync`.[^mdn-webgl-bp] `WEBGL_multi_draw`
  has limited availability.[^mdn-multidraw]
- three.js: `BatchedMesh` (multi-draw, per-object frustum culling, per-instance matrix/colour/
  visibility, add/delete, `optimize()`, fixed resizable capacity);[^three-batched]
  `IndirectStorageBufferAttribute` for compute-driven draws, WebGPURenderer only.[^three-indirect]
- Babylon thin instances: 16 floats/instance + custom attributes, no per-instance culling.[^babylon-thin]
- Native precedent: GPU-driven pipelines in Assassin's Creed Unity.[^haar2015]
- GPU picking: render IDs as flat colour, read pixel under cursor; RGBA8 encodes ≈4 billion IDs; a
  1×1 sub-frustum avoids drawing the whole screen.[^webgl2-picking]

# Proposed design

**[INFERRED]** (research-note proposal):[^srr]

**Per-instance record (32 bytes, edit in place)**: surface anchor (triangle or pattern-piece id +
barycentric/UV so stones follow drape and can be re-projected) or baked float3 position; octahedral
normal + in-plane rotation (3×16-bit); size class and cut id (2×8-bit → mesh/LOD and lobe table);
colour/coating id (16-bit → palette row with tint, index, dispersion, film thickness); seed (8–16-bit);
flags (selected, hovered, hidden, locked). 10^5 stones = 3.2 MB; 10^6 = 32 MB. WebGL2: same records in
instanced attributes or an RGBA32F/integer data texture by `gl_InstanceID` (4096² = 16.7 M texels).

**Culling**: per-stone back-face (stone normal vs view) removes ≈half; per-cluster frustum culling
(256–1024 stones per pattern piece/cell) on the CPU; in WebGPU a compute pass for frustum +
normal-cone + depth-pyramid occlusion feeding one indirect draw per LOD (four draws, one buffer). In
WebGL2, CPU cluster culling and degenerate triangles for back-facing/out-of-LOD instances.

**Painting/editing**: CPU array is the source of truth; append new stones, swap-remove deletes, upload
only the dirty range each frame (`writeBuffer` / `bufferSubData`); a stroke adding tens of stones per
frame is a few hundred bytes; grow buffers 2× when full; undo/redo = log of record edits.

**Picking**: render stone IDs (index + 1) into R32Uint (WebGPU) or RGBA8 (WebGL2) using the LOD2 quad
for all stones with a minimum pick radius of a few pixels; read back async one frame late; 1×1
frustum for clicks; low-res full ID buffer or a compute pass for brush/lasso.

**Memory**: instances ≤32–64 MB worst case; stone meshes KB; lobe tables ≈0.5 MB/type; glint/LTC
textures <1 MB; ID buffer 4 B/pixel — negligible next to HDR targets.

**Projected size**: at 1080p a full-body gymnast gives ≈1.6 mm per pixel, so an ss10 stone is ≈1.7 px.

The PoC rebuilds one `THREE.InstancedMesh` per pattern change with `frustumCulled = false` and no
culling, LOD, picking or partial update ([stones component](/engineering/poc/stones.md)). Whether
re-anchoring stones to simulated cloth is affordable depends on the cloth design
([/engineering/geometry/](/engineering/geometry/about.md)).

Gaps: no verified benchmark of instance throughput at 60 fps on integrated GPUs in WebGL2/WebGPU.[^srr]

[^srr]: Research notes: real-time sparkle rendering, section 5 (in-bundle mirror)
[^mdn-limits]: MDN GPUSupportedLimits
[^mdn-features]: MDN GPUSupportedFeatures
[^gpuweb-status]: gpuweb Implementation Status
[^chrome-131]: Chrome WebGPU 131 notes
[^toji-bundles]: Toji, render bundles
[^toji-indirect]: Toji, indirect draws
[^toji-buffers]: Toji, buffer uploads
[^wgf-opt]: WebGPU Fundamentals, optimisation
[^mdn-webgl-bp]: MDN WebGL best practices
[^mdn-multidraw]: MDN WEBGL_multi_draw
[^three-batched]: three.js BatchedMesh
[^three-indirect]: three.js IndirectStorageBufferAttribute
[^babylon-thin]: Babylon.js thin instances
[^haar2015]: Haar & Aaltonen 2015
[^webgl2-picking]: WebGL2 Fundamentals, picking
