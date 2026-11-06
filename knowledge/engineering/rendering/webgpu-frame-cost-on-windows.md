---
type: Environment
title: Why the WebGPU view costs more per frame than WebGL (Windows, 2026-11-06)
description: "Root-cause hunt for the WebGPU view's higher frame cost on the owner's laptop (GTX 1650, Windows, Chromium 152): the same three.js node shaders run as fast as the WebGL view through three's WebGL 2 backend, but 30-40% slower on the GPU through Chromium's WebGPU (Dawn, D3D12); Dawn's IEEE-strict shader compiling is ~7-10% of it; compiler (DXC/FXC), robustness, Dawn's D3D11 backend, GPU clocks, draw counts and the stones' storage-buffer path ruled out. three's WebGPU renderer also costs ~4.5 ms CPU a frame against <1 ms. Hybrid-GPU laptops can put WebGPU on the integrated GPU (10x slower). Method, numbers, tools."
tags: [rendering, webgpu, webgl, performance, dawn, d3d12, windows, gpu, investigation]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-06T22:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-06 (Claude Code session)
    title: "Find the root cause of WebGPU being slower than WebGL and remedy it, without making the WebGPU view do less work"
    author: human:mattj
  - id: run
    resource: "Claude Code session of 2026-11-06: the test app (port 5176) in the Claude desktop app's browser pane (Chromium 152) and in Microsoft Edge launched with a throwaway profile and switches (driven over the DevTools protocol)"
    title: Measurements
    author: claude-code/claude-opus-5-5
  - id: code
    resource: "app/src/dev/pass-times.js (passTimes, cpuTimes, round, sceneParts, sceneSplit, keepSplit, glFrame, cpuSplit)"
    title: Frame-timing dev tools
    author: claude-code/claude-opus-5-5
  - id: three
    resource: "app/node_modules/three (r186): src/nodes/lighting/ShadowNode.js VSMPassVertical/Horizontal; src/renderers/shaders/ShaderLib/vsm.glsl.js; src/renderers/webgpu/WebGPUBackend.js"
    title: three.js source
---

# Takeaway

**On this laptop the WebGPU view's GPU work costs about 30-40% more than the WebGL view's for the same picture, and the cause
is below our code and below three.js's shaders: Chromium's WebGPU path on Windows (WGSL translated by Tint to HLSL, compiled
for D3D12 by Dawn).** The same three.js node materials drawn through three's WebGL 2 backend (ANGLE, D3D11) cost what the WebGL
view costs.[^run] One part of it is a Dawn compile setting (IEEE strictness, ~7-10% of the frame), switchable only where we
control the browser's switches (a desktop shell); the rest has no switch we found. WebGPU's real gains for this app are compute
(the stone engine: an edit at 107 000 stones went from 21 ms to ~3 ms of CPU) and not drawing.[^run] The owner asked for the root
cause without making the WebGPU view do less work;[^owner] no change was made to the view.

# Evidence (Gem Test 3, 1792 x 1344, GTX 1650)

| test | result |
|---|---|
| GPU time per pass (`passTimes`: timestamp writes on every WebGPU pass; TIME_ELAPSED per WebGL composer pass) | post passes about equal (skin, contact shadows, glow, output); the scene pass and the shadow passes cost more on WebGPU |
| scene parts (`sceneParts`, each hidden in turn, paired with an all-shown timing) | garment (the 1 600-line fabric shader): 0.33 ms on both; mannequin skin 1.6 vs 1.3; stones 2.6 vs 1.4; shadows 1.2 vs 0.75 |
| same, at 64 x 48 (vertex work alone) | stones 1.77 vs 1.43, skin 0.79 vs 0.51: the vertex work too |
| three's node renderer on its WebGL 2 backend (`?renderer=webgpu&forcewebgl`, `glFrame`) | 5.4 ms a frame (3.1 without stones): as the WebGL view (5.6 / 3.6), against 8-9 on WebGPU. **Same node shaders, fast: the shaders are not the cause** |
| Edge on the NVIDIA GPU, switches (`edge-bench`), frame / GPU ms | WebGL 7-8.7 / 6.0-6.7; WebGPU default 10.4 / 9.1; `--enable-dawn-features=d3d_disable_ieee_strictness` 9.7 / 8.3 (a steady 7-10%); `use_dxc` forced 9.5-10.5 (DXC is already the default); FXC 11.4; `disable_robustness` 10.4 (no change); Dawn's D3D11 backend 11.5 (no GPU timer there) |
| GPU clocks (`nvidia-smi` every 100 ms) | 1 260 MHz under WebGPU against 1 370 under WebGL (P3): ~9%, not the 40-75% seen on the scene pass |
| stones drawn | the GPU's indirect count equals the WebGL count (14 047); three issues `drawIndirect` |
| stones kept on the GPU (storage-buffer instance data) against the CPU twin (instanced vertex attributes), on WebGPU (`keepSplit`) | GPU keep is the faster: scene 4.5 vs 5.6 ms |
| CPU per frame (`cpuTimes`, GPU drained before each frame) | WebGPU 2.8-4.5 ms, WebGL 0.6-1.0 ms; a frame issued and waited for: 10.3 vs 5.4 ms |
| CPU profile (Edge, DevTools Profiler, 300 frames) | spread over three's WebGPU renderer: `writeBuffer` 0.73 ms, `submit` 0.66 (about 21 command buffers a frame, one per render call), `_renderObjectDirect` 0.71, node and binding updates, `beginRenderPass` 0.41; our code ~0.3 ms (fabric pack sync) |

- Run to run the GPU's speed wanders by up to a third (heat, other work): compare only back-to-back runs, and park the browser
  pane on a static page while timing another browser (its idle 3D view keeps the GPU ~50% busy).
- Chrome quantises WebGPU timestamps to ~0.066 ms unless `--enable-webgpu-developer-features`.

# Smaller differences in three.js itself (found on the way)

- **VSM shadow blur**: the WebGL shader's sample count is a compile-time constant (`VSM_SAMPLES` define, the loop unrolled);
  three's node version reads `shadow.blurSamples` as a uniform (`ShadowNode.js` `VSMPassVertical`), a loop the compiler cannot
  unroll. Part of the shadows' 0.5 ms.
- **CPU**: three's WebGPU renderer writes each object's uniforms and submits a command buffer per render call; its WebGL
  renderer's CPU cost is a fifth of it. In a frame loop the CPU's work overlaps the GPU's previous frame, so here it adds latency
  (a frame issued and finished: 10 vs 5 ms) more than it lowers the frame rate.

# Hybrid-GPU laptops

Edge, asked for `powerPreference: 'high-performance'`, gave WebGPU the **Intel UHD 630** (79 ms a frame, against 10 ms on the
GTX 1650) until started with `--force_high_performance_gpu`; the Claude app's pane got the NVIDIA GPU. A desktop shell must
force the discrete GPU (that switch, or Windows' per-app graphics setting), or the app runs ten times slower on such laptops.

# What would remedy it, and what we did not do

1. **A desktop shell** (Electron or another Chromium shell we start ourselves) can pass `--force_high_performance_gpu` and
   `--enable-dawn-features=d3d_disable_ieee_strictness`: the GPU choice and ~7-10%. Not in a browser: a page cannot set Dawn's
   switches. (No shell exists yet: [desktop and iPad packaging](/engineering/platform/desktop-and-ipad-packaging.md).)
2. **Dawn's Vulkan backend** (listed for the GTX 1650 on edge://gpu; Tint writes SPIR-V there, no HLSL) could not be selected
   from Edge's command line (`--use-webgpu-adapter=vulkan` kept D3D12; with `--enable-features=Vulkan` the device was lost).
   Worth trying in a desktop shell.
3. **Upstream**: a small repro (one heavy node material, WebGPU against the WebGL 2 backend) for three.js / Dawn.
4. Not done, since they lower work or change looks (owner's rule): fewer post effects, cheaper crystals.
5. Not pursued: render bundles for static objects (would cut three's CPU work, not the GPU's).

[^owner]: Conversation with the product owner, 2026-11-06.
[^run]: Measurements, Claude Code session of 2026-11-06.
