---
type: Catalog
title: Engine licence and running costs
description: "Licence terms per option (three.js and the web stack free and permissive; Unreal 5% royalty; Unity US$2,310-4,950 per seat plus ~4% for Industry; Omniverse free; Qt Quick 3D GPLv3 or commercial) and the backend a design tool implies; the real cost difference is engineering time."
tags: [platform, licensing, costs]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
stale_after: 2027-10-15T00:00:00Z
sources:
  - id: notes-web
    resource: /references/research/web-engine-options.md
    title: "Research notes: web engine options (section 9)"
  - id: notes-native
    resource: /references/research/native-engine-options.md
    title: "Research notes: native engine options (section 10)"
  - id: npm-three
    resource: https://registry.npmjs.org/three/latest
    title: npm registry, three
  - id: npm-babylon
    resource: https://registry.npmjs.org/@babylonjs/core/latest
    title: npm registry, @babylonjs/core
  - id: npm-playcanvas
    resource: https://registry.npmjs.org/playcanvas/latest
    title: npm registry, playcanvas
  - id: playcanvas-plans
    resource: https://playcanvas.com/plans
    title: PlayCanvas plans
  - id: unreal-license
    resource: https://www.unrealengine.com/license
    title: Epic licensing
  - id: unity-pricing
    resource: https://unity.com/products/pricing-updates
    title: Unity pricing updates
  - id: unity-industry
    resource: https://unity.com/products/unity-industry
    title: Unity Industry
  - id: godot-license
    resource: https://godotengine.org/license/
    title: Godot licence
  - id: filament
    resource: https://github.com/google/filament
    title: Filament README
  - id: omniverse
    resource: https://docs.omniverse.nvidia.com/dev-guide/latest/common/NVIDIA_Omniverse_License_Agreement.html
    title: Omniverse licensing
  - id: qt3d
    resource: https://doc.qt.io/qt-6/qtquick3d-index.html
    title: Qt Quick 3D licensing
  - id: blender-license
    resource: https://www.blender.org/about/license/
    title: Blender licence
  - id: r2
    resource: https://developers.cloudflare.com/r2/pricing/
    title: Cloudflare R2 pricing
---

# Takeaway

For the chosen stack (three.js and its MIT ecosystem) the licence cost is zero; the money goes into
engineering time.[^notes-web] Licence and royalty costs only bite on the rejected or unchosen
engines.

| Option | Licence | Cost |
|---|---|---|
| three.js, R3F, drei, three-mesh-bvh, three-gpu-pathtracer | MIT[^npm-three] | Free |
| pmndrs postprocessing | Zlib | Free |
| Babylon.js | Apache-2.0[^npm-babylon] | Free |
| PlayCanvas engine | MIT[^npm-playcanvas] | Free; optional Editor $0 / $15 per month / $50 per seat per month[^playcanvas-plans] |
| Filament | Apache-2.0[^filament] | Free |
| Godot | MIT, attribution[^godot-license] | Free |
| Bevy, wgpu, egui, bgfx, Dawn, Dear ImGui | MIT/Apache, BSD | Free[^notes-native] |
| Omniverse | Free for development and production (May 2026)[^omniverse] | Free; RTX hardware only |
| Qt Quick 3D | GPLv3 or commercial[^qt3d] | Commercial price not retrieved |
| Blender (as platform) | GPL; published add-ons GPL-compatible[^blender-license] | Free |
| Unreal (rejected) | Royalty for apps licensed to third parties | 5% of lifetime gross above US$1M; else US$1,850 per seat per year above US$1M revenue[^unreal-license] |
| Unity | Proprietary | Personal free to US$200k; Pro US$2,310 per seat per year; Industry US$4,950 per seat per year above US$1M plus ~4% runtime fee[^unity-pricing][^unity-industry] |

Illustrative arithmetic for five developers (research's own): Unity Pro US$11,550/year; Unity
Industry US$24,750/year plus ~4% of revenue; Unreal US$50,000 on US$2M lifetime gross.[^notes-native]

# Backend implied **[INFERRED]**

A client-rendered app is static files; delivery cost per user is near zero on a zero-egress object
store (Cloudflare R2: US$0.015 per GB-month, no egress, 10 GB free).[^r2][^notes-web] The product
still implies accounts, a design store (parametric data plus painted texture layers that are tens
to hundreds of MB uncompressed at 4K-8K, so compress or tile), an asset CDN for HDRIs and KTX2
materials, and optional workers for high-res or path-traced exports and tech packs.[^notes-web]
With a packaged desktop/iPad app and no link sharing, local-first storage is plausible.

[^notes-web]: Research notes, web engine options, section 9
[^notes-native]: Research notes, native engine options, section 10
[^npm-three]: npm, three
[^npm-babylon]: npm, Babylon.js
[^npm-playcanvas]: npm, PlayCanvas
[^playcanvas-plans]: PlayCanvas plans
[^unreal-license]: Epic licensing
[^unity-pricing]: Unity pricing
[^unity-industry]: Unity Industry
[^godot-license]: Godot licence
[^filament]: Filament README
[^omniverse]: Omniverse licensing
[^qt3d]: Qt Quick 3D
[^blender-license]: Blender licence
[^r2]: Cloudflare R2
