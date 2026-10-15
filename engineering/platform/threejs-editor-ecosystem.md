---
type: Component
title: three.js editor ecosystem
description: "Libraries around three.js that an editor needs: three-mesh-bvh for picking and painting, three-gpu-pathtracer for a final-quality still mode, react-three-fiber and drei (WebGPU support still alpha), pmndrs postprocessing (WebGL-only stable), and model-viewer."
tags: [platform, threejs, ecosystem, picking]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
stale_after: 2027-04-15T00:00:00Z
sources:
  - id: notes-web
    resource: /references/research/web-engine-options.md
    title: "Research notes: web engine options (section 2)"
  - id: bvh-readme
    resource: https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.9.16/README.md
    title: three-mesh-bvh 0.9.16 README
  - id: bvh-dl
    resource: https://api.npmjs.org/downloads/point/last-week/three-mesh-bvh
    title: npm downloads, three-mesh-bvh
  - id: bvh-releases
    resource: https://github.com/gkjohnson/three-mesh-bvh/releases
    title: three-mesh-bvh releases
  - id: pathtracer
    resource: https://cdn.jsdelivr.net/npm/three-gpu-pathtracer@0.0.27/README.md
    title: three-gpu-pathtracer 0.0.27 README
  - id: r3f
    resource: https://github.com/pmndrs/react-three-fiber/releases
    title: react-three-fiber releases
  - id: drei
    resource: https://registry.npmjs.org/@react-three/drei
    title: npm registry, drei
  - id: postprocessing
    resource: https://github.com/pmndrs/postprocessing
    title: pmndrs postprocessing
  - id: heckel
    resource: https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/
    title: Maxime Heckel, Field Guide to TSL and WebGPU
  - id: wittens
    resource: https://acko.net/blog/use-gpu-goes-trad/
    title: Steven Wittens, Use.GPU Goes Trad (Jan 2023)
  - id: model-viewer
    resource: https://registry.npmjs.org/@google/model-viewer/latest
    title: npm registry, model-viewer
---

# Takeaway

An editor on three.js assembles picking, gizmos, post-processing and UI glue itself.[^notes-web]
The pieces exist and are MIT-licensed, but the React layer is mid-transition to WebGPU.

| Library | Version (Oct 2026) | What it gives us | Caveats |
|---|---|---|---|
| three-mesh-bvh | 0.9.16 (8 Oct 2026), MIT, ~4.9M weekly downloads | BVH raycasting and spatial queries; README claims 500 rays vs an 80,000-polygon model at 60 fps; sculpting, triangle-painting and lasso examples; worker BVH builds; `BatchedMesh` and skinned variants; WebGPU compute queries (`three-mesh-bvh/webgpu`)[^bvh-readme][^bvh-dl][^bvh-releases] | Static BVH (refit/rebuild after edits); parallel builder needs `SharedArrayBuffer`; older WGSL exports deprecated[^bvh-readme][^bvh-releases] |
| three-gpu-pathtracer | 0.0.27 (8 Oct 2026), MIT | WebGPU compute path tracer on three-mesh-bvh; standard/physical materials, area/spot/point lights, env maps, denoise, upscale[^pathtracer] | Requires WebGPU and three >= 0.185; progressive, not real-time[^pathtracer] |
| react-three-fiber | Stable 9.8.1 (React 19.3); v10 alpha.5 | v10 makes WebGPU/TSL first-class (`@react-three/fiber/webgpu`, TSL hooks, compute hooks, `useRenderPipeline`)[^r3f] | v10 experimental, no stable date; v9 + WebGPU needs async `gl` and `extend` workarounds[^r3f][^heckel] |
| drei | Stable 10.7.9; 11.0.0 alpha.7; ~4.39M weekly | R3F helpers[^drei] | Concrete editor helpers not verified[^notes-web] |
| pmndrs postprocessing | Stable 6.39.5; 7.0.0 beta.16; Zlib | Post effects[^postprocessing] | Stable is WebGLRenderer-only; use three's built-in TSL stack on WebGPU[^postprocessing][^notes-web] |
| model-viewer | 4.4.0 | Product/AR viewer built on three (^0.183)[^model-viewer] | Viewer, not an editor |

Older caution: Steven Wittens (2023) found application-building on R3F fragile because of how
change handling is defined.[^wittens]

# Inferences

- **[INFERRED]** three-mesh-bvh is the obvious picking and on-surface painting substrate for
  stone placement and seam drawing; its static BVH is fine for a fixed body per size but needs a
  refit when the body morphs.[^notes-web]
- **[INFERRED]** three-gpu-pathtracer offers an optional final-quality still render in the same
  scene graph, matching the "raster interactive + optional ray-traced beauty" pattern of
  professional tools ([case studies](/engineering/platform/pro-tool-build-case-studies.md)).[^notes-web]
- **[INFERRED]** Choosing R3F for a WebGPU-first editor means building on alpha APIs or integrating
  manually on v9. No undo/redo system ships with any engine; it is application-level.[^notes-web]

[^notes-web]: Research notes, web engine options, section 2
[^bvh-readme]: three-mesh-bvh README
[^bvh-dl]: npm downloads
[^bvh-releases]: three-mesh-bvh releases
[^pathtracer]: three-gpu-pathtracer README
[^r3f]: R3F releases
[^drei]: npm, drei
[^postprocessing]: pmndrs postprocessing
[^heckel]: Maxime Heckel
[^wittens]: Steven Wittens, 2023
[^model-viewer]: npm, model-viewer
