---
type: Component
title: NVIDIA Omniverse and OpenUSD
description: "Status REJECTED on hardware grounds. Omniverse Kit gives turn-key RTX path tracing and is free for production since May 2026, but requires a GeForce RTX 3070 on Windows or Ubuntu with no macOS or iPad; OpenUSD remains plausible as an export format."
tags: [platform, engine, omniverse, usd, rejected]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
stale_after: 2027-10-15T00:00:00Z
sources:
  - id: notes-native
    resource: /references/research/native-engine-options.md
    title: "Research notes: native engine options (section 6)"
  - id: decision-platform
    resource: /decisions/2026-10-13-native-desktop-and-ipad-target.md
    title: Decision, native desktop and iPad target
  - id: kit-template
    resource: https://github.com/NVIDIA-Omniverse/kit-app-template
    title: Omniverse Kit App Template README
  - id: tech-req
    resource: https://docs.omniverse.nvidia.com/dev-guide/latest/common/technical-requirements.html
    title: Omniverse technical requirements (updated 13 Oct 2026)
  - id: licensing
    resource: https://docs.omniverse.nvidia.com/dev-guide/latest/common/NVIDIA_Omniverse_License_Agreement.html
    title: Omniverse licensing
  - id: usd-releases
    resource: https://github.com/PixarAnimationStudios/OpenUSD/releases
    title: OpenUSD releases
  - id: usd-readme
    resource: https://github.com/PixarAnimationStudios/OpenUSD
    title: OpenUSD README
  - id: diligent
    resource: https://github.com/DiligentGraphics/DiligentEngine
    title: Diligent Engine README (Hydrogent)
---

# Status

**REJECTED** on hardware grounds: its floor excludes macOS and iPad, which the owner's
[platform decision](/decisions/2026-10-13-native-desktop-and-ipad-target.md) requires.[^decision-platform][^tech-req]

# Facts

- Kit SDK builds GPU-accelerated OpenUSD apps in Python or C++; templates include USD Composer and a
  streaming USD Viewer.[^kit-template]
- Requirements: x86_64 Windows 11 or Ubuntu 22.04/24.04 (arm64 Ubuntu only); **minimum GeForce RTX
  3070**, 16 GB RAM; older architectures unsupported; non-RTX "without any support guarantees";
  macOS and Apple silicon not mentioned.[^tech-req]
- Licence (as of May 2026): "freely available for both development and production use" and
  freely redistributable; optional paid enterprise support.[^licensing]
- Streaming deployment is first-class (Kit App Streaming, NVIDIA Cloud Functions).[^kit-template]
- OpenUSD 26.08 (20 Jul 2026); supported on Linux, macOS, Windows; libraries embeddable in iOS and
  visionOS apps (no Python there).[^usd-releases][^usd-readme] Diligent's "Hydrogent" implements Hydra.[^diligent]

**[INFERRED]** USD is plausible as an interchange/export format regardless of renderer; adopting
Hydra as the viewport architecture would be a larger commitment that still needs custom fabric
lobes.[^notes-native]

[^notes-native]: Research notes, native engine options, section 6
[^decision-platform]: Decision, native desktop and iPad target
[^kit-template]: Kit App Template README
[^tech-req]: Omniverse technical requirements
[^licensing]: Omniverse licensing
[^usd-releases]: OpenUSD releases
[^usd-readme]: OpenUSD README
[^diligent]: Diligent Engine README
