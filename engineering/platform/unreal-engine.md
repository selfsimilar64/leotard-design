---
type: Component
title: Unreal Engine
description: "Status REJECTED by the owner after a proof of concept; do not re-propose. Unreal 5.8 ships the richest ready-made picture (Substrate fuzz, anisotropy, thin-film, glints; Lumen; path tracer) but glints are not rendered on mobile, editor tools cannot ship in a product, there is no browser runtime, and sold apps owe 5% above US$1M."
tags: [platform, engine, unreal, rejected]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
stale_after: 2027-10-15T00:00:00Z
sources:
  - id: decision-engine
    resource: /decisions/2026-10-15-threejs-over-unreal.md
    title: Decision, three.js over Unreal
  - id: notes-native
    resource: /references/research/native-engine-options.md
    title: "Research notes: native engine options (sections 1, 9, 10)"
  - id: notes-web
    resource: /references/research/web-engine-options.md
    title: "Research notes: web engine options (section 5)"
  - id: ue57
    resource: https://www.unrealengine.com/news/unreal-engine-5-7-is-now-available
    title: Epic, Unreal Engine 5.7 is now available (12 Nov 2025)
  - id: ue58
    resource: https://www.unrealengine.com/news/unreal-engine-5-8-is-now-available
    title: Epic, Unreal Engine 5.8 is now available (23 Jun 2026)
  - id: ue58-notes
    resource: https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-5-8-release-notes
    title: UE 5.8 release notes
  - id: substrate
    resource: https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-substrate-materials-in-unreal-engine
    title: Epic, Substrate Materials Overview
  - id: lumen
    resource: https://dev.epicgames.com/documentation/en-us/unreal-engine/lumen-technical-details-in-unreal-engine
    title: Epic, Lumen Technical Details
  - id: hw-spec
    resource: https://dev.epicgames.com/documentation/en-us/unreal-engine/hardware-and-software-specifications-for-unreal-engine
    title: Epic, Hardware and Software Specifications
  - id: pathtracer
    resource: https://dev.epicgames.com/documentation/en-us/unreal-engine/path-tracer-in-unreal-engine
    title: Epic, Path Tracer
  - id: macos
    resource: https://dev.epicgames.com/documentation/en-us/unreal-engine/macos-development-requirements-for-unreal-engine
    title: Epic, macOS Development Requirements
  - id: ios
    resource: https://dev.epicgames.com/documentation/en-us/unreal-engine/ios-ipados-and-tvos-development-requirements-for-unreal-engine
    title: Epic, iOS/iPadOS/tvOS Development Requirements
  - id: nanite
    resource: https://dev.epicgames.com/documentation/en-us/unreal-engine/nanite-virtualized-geometry-in-unreal-engine
    title: Epic, Nanite
  - id: ism
    resource: https://dev.epicgames.com/documentation/en-us/unreal-engine/instanced-static-mesh-component-in-unreal-engine
    title: Epic, Instanced Static Mesh Component
  - id: geometry-scripting
    resource: https://dev.epicgames.com/documentation/en-us/unreal-engine/geometry-scripting-users-guide-in-unreal-engine
    title: Epic, Geometry Scripting Users Guide
  - id: slate
    resource: https://dev.epicgames.com/documentation/en-us/unreal-engine/slate-overview-for-unreal-engine
    title: Epic, Slate Overview
  - id: eula
    resource: https://www.unrealengine.com/eula/unreal
    title: Unreal Engine EULA
  - id: license
    resource: https://www.unrealengine.com/license
    title: Epic, Licensing
  - id: pixel-streaming
    resource: https://dev.epicgames.com/documentation/en-us/unreal-engine/pixel-streaming-in-unreal-engine
    title: Epic, Pixel Streaming
  - id: wnhub
    resource: https://wnhub.io/news/engines/item-51157
    title: WN Hub on UE 5.8 as last UE5 feature release
  - id: twinmotion
    resource: https://www.unrealengine.com/blog/twinmotion-breaks-out-of-the-box-with-a-bridge-to-ue4
    title: Epic blog on Twinmotion (16 Jan 2019)
---

# Status

**REJECTED.** The owner built proofs of concept in both Unreal and three.js and chose three.js for
lightweight, fast iteration. **Unreal must not be re-proposed.**[^decision-engine] This concept
records what the research found so the reasoning is not repeated.

# What Unreal 5.8 offers

- Current release 5.8 (23 Jun 2026): MegaLights production-ready, Lumen Lite (beta), experimental
  Substrate toon shader, Chaos Cloth production-ready; iOS/iPadOS gain keyboard/mouse and
  experimental SM6 on A15+.[^ue58][^ue58-notes] Reportedly the last UE5 feature release, UE6 previews
  "late 2027ish".[^wnhub]
- **Substrate** (production-ready since 5.7): Slab with anisotropy, second (hazy) specular lobe,
  **fuzz** for fabric, thin-film helper, specular profiles and a **glint lobe** (`r.Substrate.Glints=1`).[^ue57][^substrate]
- Lumen GI, hardware ray tracing (RTX-2000 / RX-6000+), a progressive **path tracer** (Windows DX12, RTX-class).[^lumen][^pathtracer]
- Nanite up to 16 million instances (opaque/masked only); ISM with per-instance custom floats.[^nanite][^ism]
- Slate UI with docking.[^slate]

# Why it was a poor fit (research findings)

| Issue | Evidence |
|---|---|
| Glints not on tablets | Glints need the Adaptive GBuffer (consoles, SM6 desktop); on the Blendable fallback used on mobile they "are not rendered"[^substrate] |
| High hardware floor | Docs target consoles and "high-end PCs"; recommended 32 GB RAM, 8 GB+ VRAM;[^hw-spec] Mac: Nanite "Beta", hardware RT "Experimental" on M2+[^macos] |
| Substrate maturity | 5.8 docs: "Platform support and testing is currently incomplete"; Mac and DX11 issues[^substrate] |
| Editor tools cannot ship | EULA §4(d): products including "Engine Tools" (editor modules) may only be distributed via Fab or Epic's GitHub; Mesh Paint is an editor mode; runtime Geometry Scripting is Beta[^eula][^geometry-scripting] |
| No browser runtime | Only Pixel Streaming: a GPU server per user streaming video over WebRTC; pen input not mentioned[^pixel-streaming][^notes-web] |
| Licence | Apps licensed to third parties pay 5% of lifetime gross above US$1M; otherwise US$1,850/seat/year for companies over US$1M[^license][^eula] |
| iPad | iPadOS 17+ supported, but with a different feature set[^ios][^notes-native] |

Precedent on the other side: Twinmotion moved from its own engine onto Unreal after a decade.[^twinmotion]

[^decision-engine]: Decision, three.js over Unreal
[^notes-native]: Research notes, native engine options, section 1
[^notes-web]: Research notes, web engine options, section 5
[^ue57]: Epic, UE 5.7 post
[^ue58]: Epic, UE 5.8 post
[^ue58-notes]: UE 5.8 release notes
[^substrate]: Substrate overview
[^lumen]: Lumen technical details
[^hw-spec]: Hardware specifications
[^pathtracer]: Path Tracer
[^macos]: macOS requirements
[^ios]: iOS/iPadOS requirements
[^nanite]: Nanite
[^ism]: ISM component
[^geometry-scripting]: Geometry Scripting
[^slate]: Slate overview
[^eula]: Unreal EULA
[^license]: Epic licensing
[^pixel-streaming]: Pixel Streaming
[^wnhub]: WN Hub
[^twinmotion]: Epic blog, Twinmotion
