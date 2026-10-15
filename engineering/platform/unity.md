---
type: Component
title: Unity
description: "Status NOT CHOSEN. HDRP has fabric, iridescence, anisotropy and ray tracing but is frozen and does not run on iPad; URP runs everywhere but lacks those materials; non-game firms above US$1M pay US$4,950/seat plus about 4% runtime fee; Unity 7 transition under way."
tags: [platform, engine, unity, not-chosen]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
stale_after: 2027-10-15T00:00:00Z
sources:
  - id: notes-native
    resource: /references/research/native-engine-options.md
    title: "Research notes: native engine options (section 2)"
  - id: notes-web
    resource: /references/research/web-engine-options.md
    title: "Research notes: web engine options (section 5)"
  - id: whatsnew65
    resource: https://docs.unity3d.com/6000.5/Documentation/Manual/WhatsNewUnity65.html
    title: New in Unity 6.5
  - id: whatsnew66
    resource: https://docs.unity3d.com/6000.6/Documentation/Manual/WhatsNewUnity66.html
    title: New in Unity 6.6
  - id: unity7
    resource: https://discussions.unity.com/t/unity-7-0-alpha-is-now-available/1738310
    title: Unity Discussions, Unity 7.0 alpha
  - id: strategy
    resource: https://unity.com/topics/render-pipelines-strategy-for-2026
    title: Unity, Render Pipelines strategy for 2026
  - id: comparison
    resource: https://docs.unity3d.com/Manual/render-pipelines-feature-comparison.html
    title: Unity render pipeline feature comparison
  - id: hdrp-req
    resource: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.3/manual/System-Requirements.html
    title: HDRP 17.3 system requirements
  - id: fabrics
    resource: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.3/manual/understand-fabrics.html
    title: HDRP 17.3, Understand fabrics
  - id: glints-paper
    resource: https://arxiv.org/abs/2306.05051
    title: Deliot, Belcour et al., real-time glinty appearances (HPG 2023)
  - id: ggx
    resource: https://ggx-research.github.io/
    title: GGX Research group page
  - id: custom-lighting
    resource: https://docs.unity3d.com/Packages/com.unity.shadergraph@17.3/manual/Shader-Graph-Sample-Custom-Lighting-Introduction.html
    title: Shader Graph 17.3 custom lighting sample
  - id: pen
    resource: https://docs.unity3d.com/Packages/com.unity.inputsystem@1.14/manual/Pen.html
    title: Unity Input System 1.14, Pen
  - id: ui-compare
    resource: https://docs.unity3d.com/6000.3/Documentation/Manual/UI-system-compare.html
    title: Unity 6.3 comparison of UI systems
  - id: pricing
    resource: https://unity.com/products/pricing-updates
    title: Unity pricing updates
  - id: industry
    resource: https://unity.com/products/unity-industry
    title: Unity Industry
  - id: webgpu66
    resource: https://docs.unity3d.com/6000.6/Documentation/Manual/WebGPU-limitations.html
    title: Unity 6.6 WebGPU limitations
---

# Status

**NOT CHOSEN.** Not recommended by the research and not part of the owner's decisions.[^notes-native]

# Facts

- Releases: 6.3 LTS; 6.5 deprecated the Built-In pipeline; 6.6 "Supported" (WebGPU no longer
  experimental; Intel Mac deprecated; Mono removal prep); Unity 7.0 alpha announced 5 Oct 2026.[^whatsnew65][^whatsnew66][^unity7]
- **HDRP frozen**: "no new features are planned for HDRP"; Unity "strongly encourage[s] using URP
  when starting any new project".[^strategy]
- **URP vs HDRP**: iOS/Android/WebGPU are URP-only; fabric/cloth, iridescence, anisotropy, SSS,
  real-time area lights, ray and path tracing are HDRP-only; URP custom lighting model "not
  supported".[^comparison] HDRP runs on Windows, consoles, macOS (Metal), Linux, **not iPad**.[^hdrp-req]
- HDRP fabrics: Cotton/Wool and Silk shaders with thread and fuzz maps.[^fabrics]
- Unity's real-time glints research (Deliot, Belcour et al., HPG 2023; 1.5-5x faster than prior art)
  is not documented as an engine feature; the team is now at Intel.[^glints-paper][^ggx]
- Shader Graph custom lighting only in Forward/Forward+; multiple lights need hand-written code.[^custom-lighting]
- Pen input: pressure, tilt, twist, eraser on Windows, macOS, iOS, Android; Apple Pencil double-tap
  not surfaced.[^pen] UI Toolkit is active; uGUI/IMGUI stable but infrequently updated.[^ui-compare]
- Web: WebGL 2 default; WebGPU opt-in with limits (no async compute, no synchronous readback).[^webgpu66][^notes-web]
- Pricing: Personal free to US$200,000; Pro US$2,310/seat/year; **Industry US$4,950/seat/year for
  non-game firms above US$1M "total finances"**, with runtime distribution "generally equivalent to
  4.0%" of product revenue.[^pricing][^industry]

**[INFERRED]** The two pipelines pull in opposite directions for this product: HDRP has the
materials but is frozen and desktop-only; URP reaches iPad but nearly every fabric lobe would be
custom. Platform churn (Built-In deprecated, HDRP frozen, Unity 7) is a schedule risk.[^notes-native]

[^notes-native]: Research notes, native engine options, section 2
[^notes-web]: Research notes, web engine options, section 5
[^whatsnew65]: New in Unity 6.5
[^whatsnew66]: New in Unity 6.6
[^unity7]: Unity 7.0 alpha thread
[^strategy]: Unity render pipelines strategy
[^comparison]: Feature comparison
[^hdrp-req]: HDRP system requirements
[^fabrics]: HDRP fabrics
[^glints-paper]: arXiv 2306.05051
[^ggx]: GGX Research
[^custom-lighting]: Shader Graph custom lighting
[^pen]: Input System Pen
[^ui-compare]: UI systems comparison
[^pricing]: Unity pricing updates
[^industry]: Unity Industry
[^webgpu66]: Unity 6.6 WebGPU limitations
