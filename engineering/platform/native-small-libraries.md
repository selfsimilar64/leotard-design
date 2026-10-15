---
type: Component
title: Native graphics libraries and application frameworks
description: "Status NOT CHOSEN; reference for a native fallback. The middle ground between an engine and raw graphics APIs: bgfx, Diligent, The Forge, Dawn, wgpu and Bevy for rendering; Qt (and Qt Quick 3D), Dear ImGui and egui for the application shell; plus web thin layers (TypeGPU, luma.gl)."
tags: [platform, native, libraries, qt, rust, not-chosen]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
stale_after: 2027-10-15T00:00:00Z
sources:
  - id: notes-native
    resource: /references/research/native-engine-options.md
    title: "Research notes: native engine options (sections 5 and 7)"
  - id: notes-web
    resource: /references/research/web-engine-options.md
    title: "Research notes: web engine options (section 6)"
  - id: bgfx
    resource: https://github.com/bkaradzic/bgfx
    title: bgfx README
  - id: diligent
    resource: https://github.com/DiligentGraphics/DiligentEngine
    title: Diligent Engine README
  - id: forge
    resource: https://github.com/ConfettiFX/The-Forge
    title: The Forge README
  - id: dawn
    resource: https://github.com/google/dawn
    title: Dawn README
  - id: wgpu
    resource: https://github.com/gfx-rs/wgpu/releases
    title: wgpu releases
  - id: bevy-intro
    resource: https://bevy.org/learn/quick-start/introduction/
    title: Bevy introduction
  - id: bevy-news
    resource: https://bevy.org/news/
    title: Bevy news
  - id: bevy-020
    resource: https://bevy.org/news/bevy-0-20/
    title: Bevy 0.20 release notes
  - id: bevy-019
    resource: https://bevy.org/news/bevy-0-19/
    title: Bevy 0.19 release notes
  - id: bevy-stdmat
    resource: https://docs.rs/bevy/latest/bevy/pbr/struct.StandardMaterial.html
    title: docs.rs, Bevy 0.20 StandardMaterial
  - id: egui
    resource: https://github.com/emilk/egui
    title: egui README
  - id: rerun
    resource: https://github.com/rerun-io/rerun
    title: Rerun README
  - id: qt3d
    resource: https://doc.qt.io/qt-6/qtquick3d-index.html
    title: Qt Quick 3D (Qt 6.12)
  - id: qt-custommat
    resource: https://doc.qt.io/qt-6/qml-qtquick3d-custommaterial.html
    title: Qt Quick 3D CustomMaterial
  - id: qt-principled
    resource: https://doc.qt.io/qt-6/qml-qtquick3d-principledmaterial.html
    title: Qt Quick 3D PrincipledMaterial
  - id: qt-tablet
    resource: https://doc.qt.io/qt-6/qtabletevent.html
    title: Qt QTabletEvent
  - id: vfx-platform
    resource: https://vfxplatform.com/
    title: VFX Reference Platform
  - id: imgui
    resource: https://github.com/ocornut/imgui
    title: Dear ImGui README
  - id: typegpu
    resource: https://www.npmjs.com/package/typegpu
    title: npm, typegpu
  - id: lumagl
    resource: https://github.com/visgl/luma.gl
    title: luma.gl
---

# Status

**NOT CHOSEN.** Reference for the [hand-rolled](/engineering/platform/hand-rolled-renderer.md)
or [Filament](/engineering/platform/filament.md) fallback routes, should packaging three.js
for iPad fail.

# Takeaway

"Hand-rolled" is a spectrum: raw Vulkan/D3D12/Metal; one abstraction (WebGPU-style, bgfx, Diligent)
with a custom renderer; or a renderer library (Filament, Qt Quick 3D) with custom materials. Each
step down trades control for less code; the difference is how much of the editor, UI and
distribution layer comes free (Qt: most; ImGui: tool-grade only; bare APIs: none).[^notes-native] **[INFERRED]**

# Rendering layers

| Library | Backends / platforms | Licence | Notes |
|---|---|---|---|
| bgfx | D3D11/12, Metal, GL/ES, Vulkan, WebGL 2, WebGPU (Dawn); Windows, macOS, iOS/iPadOS, Android, Linux, Wasm | BSD-2 | "Bring Your Own Engine"; 17.6k stars[^bgfx] |
| Diligent Engine | D3D11/12, Vulkan, GL, WebGPU, Metal | Apache 2.0, **Metal backend commercial** (MoltenVK the open path) | Ray tracing, mesh shaders; DiligentFX PBR; users incl. Bentley LumenRT[^diligent] |
| The Forge | DX12, Metal, Vulkan, consoles | Apache 2.0 on open platforms | Public development moved in-house/Codeberg; last dated release 1.63 (Mar 2025)[^forge] |
| Dawn | D3D12, Metal, Vulkan, GL | BSD-3 | Chromium's WebGPU; `webgpu.h` + Tint; used natively by Figma[^dawn][^notes-web] |
| wgpu (Rust) | Vulkan, Metal, DX12, GLES, WebGPU | MIT/Apache | v30.0.1 (Aug 2026); HDR surfaces and ray-tracing structures arriving; **three breaking majors in ~7 months**[^wgpu] |
| Bevy (Rust) | via wgpu | MIT/Apache | 0.20 (8 Oct 2026); "Important features are missing"; breaking release ~every 3 months; StandardMaterial has **no sheen or thin-film**; editor "upcoming"; Solari path tracing experimental; HDR output "What's Next"[^bevy-intro][^bevy-news][^bevy-020][^bevy-stdmat] |

Bevy 0.19 added LTC rectangular area lights (no shadows yet) and moved more culling to the GPU
(`many_cubes` 49.47 ms to 18.77 ms).[^bevy-019]

# Application shells

| Framework | Fit | Caveats |
|---|---|---|
| Qt 6 | Desktop/tablet shell, docking; DCC baseline (VFX Reference Platform specifies Qt 6.8 for CY2026-27)[^vfx-platform] | Tablet events give pressure, tilt, rotation incl. Apple Pencil; on Windows "currently requires the WACOM windows driver"[^qt-tablet] |
| Qt Quick 3D | Mid-level renderer; `CustomMaterial` overrides directional/point/spot/ambient/specular light and `IBL_PROBE`; per-instance data[^qt-custommat] | **GPLv3 or commercial** (not LGPL);[^qt3d] PrincipledMaterial lacks sheen, iridescence, anisotropy[^qt-principled] |
| Dear ImGui | Fast tool UIs; docking branch | For programmers' tools, not "the average end-user"; no full i18n or accessibility[^imgui] |
| egui (Rust) | "The easiest to use GUI library" | Not native-looking; "New releases will have breaking changes"[^egui] |

Shipped Rust example: Rerun (robotics visualisation), which warns of breaking changes and slowdowns
with very many entities.[^rerun]

# Web thin layers

TypeGPU 0.12.7 (MIT, pre-1.0, ~286k weekly) and luma.gl 9.4.2 (~1.05M weekly) sit between
JavaScript and WebGPU; regl, twgl.js and OGL are WebGL-era.[^typegpu][^lumagl]

# Licence traps **[INFERRED]**

Qt Quick 3D is GPLv3-or-commercial, Diligent's native Metal backend is commercial, The Forge's
public development has moved in-house.[^notes-native]

[^notes-native]: Research notes, native engine options, sections 5 and 7
[^notes-web]: Research notes, web engine options, section 6
[^bgfx]: bgfx README
[^diligent]: Diligent Engine README
[^forge]: The Forge README
[^dawn]: Dawn README
[^wgpu]: wgpu releases
[^bevy-intro]: Bevy introduction
[^bevy-news]: Bevy news
[^bevy-020]: Bevy 0.20
[^bevy-019]: Bevy 0.19
[^bevy-stdmat]: Bevy StandardMaterial
[^egui]: egui README
[^rerun]: Rerun README
[^qt3d]: Qt Quick 3D
[^qt-custommat]: Qt CustomMaterial
[^qt-principled]: Qt PrincipledMaterial
[^qt-tablet]: Qt QTabletEvent
[^vfx-platform]: VFX Reference Platform
[^imgui]: Dear ImGui README
[^typegpu]: npm, typegpu
[^lumagl]: luma.gl
