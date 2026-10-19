---
type: Environment
title: WebGPU versus WebGL 2 availability
description: "Where WebGPU is on by default in Oct 2026 (Chromium on Windows/macOS/ChromeOS/Android 12+, Safari 26 incl. iPadOS 26, Firefox on Windows/macOS), the 83% survey figure, device limits, and the web features a painting tool wants that are Chromium-only."
tags: [platform, webgpu, webgl, browsers, ipad]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
stale_after: 2027-04-15T00:00:00Z
sources:
  - id: notes-web
    resource: /references/research/web-engine-options.md
    title: "Research notes: web engine options (section 8)"
  - id: gpuweb
    resource: https://github.com/gpuweb/gpuweb/wiki/Implementation-Status
    title: gpuweb implementation status (edited 2 Oct 2026)
  - id: webdev
    resource: https://web.dev/blog/webgpu-supported-major-browsers
    title: web.dev, WebGPU supported in major browsers
  - id: webkit26
    resource: https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
    title: WebKit, Safari 26.0 features
  - id: mdn-gpu
    resource: https://github.com/mdn/browser-compat-data/blob/main/api/GPU.json
    title: MDN browser-compat-data, GPU
  - id: chrome-news
    resource: https://developer.chrome.com/docs/web-platform/webgpu/news
    title: Chrome WebGPU news
  - id: survey
    resource: https://web3dsurvey.com/webgpu
    title: Web3D Survey, WebGPU
  - id: pqina
    resource: https://pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit/
    title: PQINA on Safari canvas memory (Jan 2022)
  - id: figma-2025
    resource: https://www.figma.com/blog/figma-rendering-powered-by-webgpu/
    title: Figma, rendering powered by WebGPU
  - id: chrome129
    resource: https://developer.chrome.com/blog/new-in-webgpu-129
    title: Chrome, new in WebGPU 129
  - id: mdn-canvasctx
    resource: https://github.com/mdn/browser-compat-data/blob/main/api/GPUCanvasContext.json
    title: MDN browser-compat-data, GPUCanvasContext
  - id: mdn-pointer
    resource: https://github.com/mdn/browser-compat-data/blob/main/api/PointerEvent.json
    title: MDN browser-compat-data, PointerEvent
  - id: mdn-canvas
    resource: https://github.com/mdn/browser-compat-data/blob/main/api/HTMLCanvasElement.json
    title: MDN browser-compat-data, HTMLCanvasElement
  - id: mdn-offscreen
    resource: https://github.com/mdn/browser-compat-data/blob/main/api/OffscreenCanvas.json
    title: MDN browser-compat-data, OffscreenCanvas
  - id: forum-compute
    resource: https://discourse.threejs.org/t/tsl-and-webgl2-vs-webgpu/87974
    title: three.js forum on compute and WebGL 2
---

# Takeaway

WebGPU is on by default in Chrome and Edge on Windows, macOS and ChromeOS (since 113) and Android
12+ (since 121); in **Safari 26 on macOS, iOS and iPadOS 26**; and in Firefox on Windows (141) and
macOS (145/147). It is not yet default in Firefox on Linux or Android, on some Android GPUs, or in
Chrome on Windows-on-ARM.[^gpuweb][^webkit26] One survey reports a working adapter in **83%** of
sessions.[^survey] For this product the binding constraints are iPad memory and the iPadOS 26
floor, not texture sizes. **[INFERRED]**

# Availability detail

| Platform | WebGPU default |
|---|---|
| Chromium Windows x86/x64, macOS, ChromeOS | Since 113[^gpuweb] |
| Chromium Android 12+ (ARM/Qualcomm/Intel) | Since 121; Imagination (Android 16+) since 139; Samsung Xclipse TBD[^gpuweb] |
| Chromium Linux | Intel Gen12+ (144); NVIDIA on Wayland with recent driver (147); else flag[^gpuweb] |
| Chromium Windows on ARM64 | Behind a flag[^gpuweb] |
| Firefox | Windows 141; macOS 26 in 145, all macOS in 147; Linux Nightly only; Android behind flag[^gpuweb][^webdev] |
| Safari | Safari 26 on macOS Tahoe, iOS, **iPadOS 26**, visionOS (announced 15 Sep 2025); WebKit says WebGPU supersedes WebGL there[^webkit26] |

MDN compat data agrees; some secondary pages give conflicting Safari dates and should be ignored.[^mdn-gpu][^gpuweb]
Chrome 146 added a compatibility mode on OpenGL ES 3.1 for older Android.[^chrome-news]

Survey by OS: ChromeOS 92%, macOS 90%, Windows 88%, iOS 86%, Android 73%, Linux 18% (date range not stated).[^survey]

# Limits and features

- Texture: `maxTextureDimension2D` >= 8192 in 100%, >= 16384 in 99%; `maxBufferSize` >= 1 GiB in 97%;
  storage binding >= 1 GiB in 91%.[^survey]
- Optional features: float32-filterable 91%, shader-f16 94%, timestamp-query 99%, BC compression 87%,
  ETC2 47%, ASTC 47%.[^survey]
- Memory: a 2022 write-up reports a 384 MB total canvas-memory cap on iOS 15 and 4096x4096 max canvas
  in Safari (2D canvas, probably device-specific).[^pqina] No current iPad WebGPU memory ceiling was found.[^notes-web]
- No synchronous GPU readback in WebGPU (affects ID-buffer picking); Figma saw async readback add
  hundreds of milliseconds to start-up tests.[^figma-2025]
- Compute, indirect draws and atomics are WebGPU-only in three.js.[^forum-compute]

# Chromium-only niceties

| Feature | Support |
|---|---|
| HDR canvas output (`toneMapping: extended`, rgba16float) | Chrome 129+; Chromium only[^chrome129][^mdn-canvasctx] |
| `getCoalescedEvents` / `getPredictedEvents` | Chrome, Firefox, **Safari 18.2+**[^mdn-pointer] |
| `pointerrawupdate` | Chrome 77, Firefox 148, **not Safari**[^mdn-pointer] |
| Low-latency `desynchronized` canvas | Chrome on ChromeOS/Windows/Android; not Firefox or Safari[^mdn-canvas] |
| WebGPU on `OffscreenCanvas` | Chrome, Safari 26, Firefox 141 (Windows)[^mdn-offscreen] |

# Inferences for our targets

- **[INFERRED]** Apple Pencil on iPad gets WebGPU only on iPadOS 26+, with coalesced and predicted
  events but no raw updates or desynchronised canvas, so stroke latency is bounded by the normal
  compositor path.[^notes-web]
- **[INFERRED]** 8K paint layers (256 MB uncompressed each) are desktop-class; plan 4K or tiled
  textures on tablets.[^notes-web]
- **[INFERRED]** Ship textures as KTX2/Basis with runtime transcoding (BC ~87%, ASTC/ETC2 ~47%).[^notes-web]
- **[INFERRED]** Dropping WebGL 2 would exclude about one browser session in six, but a packaged
  desktop app with a fixed Chromium removes most of that variance; iPad remains WebKit-bound. See
  [desktop and iPad packaging](/engineering/platform/desktop-and-ipad-packaging.md).

[^notes-web]: Research notes, web engine options, section 8
[^gpuweb]: gpuweb implementation status
[^webdev]: web.dev
[^webkit26]: WebKit, Safari 26.0
[^mdn-gpu]: MDN, GPU
[^chrome-news]: Chrome WebGPU news
[^survey]: Web3D Survey
[^pqina]: PQINA, 2022
[^figma-2025]: Figma, 2025
[^chrome129]: Chrome, WebGPU 129
[^mdn-canvasctx]: MDN, GPUCanvasContext
[^mdn-pointer]: MDN, PointerEvent
[^mdn-canvas]: MDN, HTMLCanvasElement
[^mdn-offscreen]: MDN, OffscreenCanvas
[^forum-compute]: three.js forum, Nov 2025
