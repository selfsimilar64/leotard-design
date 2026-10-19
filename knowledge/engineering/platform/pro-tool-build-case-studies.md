---
type: Domain Concept
title: How professional creative tools were built
description: "Case studies of what comparable tools render with: proprietary engines for narrow deep competencies and tablet-first tools (Procreate, Nomad, Shapr3D, ZBrush, KeyShot), three.js for general 3D editors (Plasticity, Spline v2), game engines (Twinmotion), and DCC layers (JewelCraft on Blender, MatrixGold on Rhino)."
tags: [platform, case-studies, precedent]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-native
    resource: /references/research/native-engine-options.md
    title: "Research notes: native engine options (sections 8 and 9)"
  - id: notes-web
    resource: /references/research/web-engine-options.md
    title: "Research notes: web engine options (section 7)"
  - id: plasticity
    resource: https://raw.githubusercontent.com/nkallen/plasticity/master/package.json
    title: Plasticity package.json
  - id: spline-runtime
    resource: https://app.unpkg.com/@splinetool/runtime@2.0.79/files/build
    title: "@splinetool/runtime 2.0.79 build files"
  - id: spline-v2
    resource: https://createwith.com/tool/spline/updates/spline-v2-rebuilds-the-browser-3d-editor-around-ai-agents
    title: Create With on Spline v2
  - id: figma-2025
    resource: https://www.figma.com/blog/figma-rendering-powered-by-webgpu/
    title: Figma, rendering powered by WebGPU
  - id: onshape
    resource: https://www.onshape.com/en/blog/how-does-onshape-really-work
    title: Onshape, how does Onshape really work
  - id: womp
    resource: https://womp.com/
    title: Womp
  - id: vectary
    resource: https://www.vectary.com/
    title: Vectary
  - id: osgjs
    resource: https://github.com/cedricpinson/osgjs
    title: OSG.JS repository (archived)
  - id: twinmotion-aec
    resource: https://aecmag.com/visualisation/twinmotion-a-new-chapter/
    title: AEC Magazine on Twinmotion (2 Dec 2025)
  - id: stager
    resource: https://www.adobe.com/products/substance3d/apps/stager.html
    title: Adobe Substance 3D Stager
  - id: keyshot-gpu
    resource: https://manual.keyshot.com/manual/gpu-mode/
    title: KeyShot manual, GPU mode
  - id: keyshot-wiki
    resource: https://en.wikipedia.org/wiki/Keyshot
    title: "Wikipedia: KeyShot"
  - id: blender-license
    resource: https://www.blender.org/about/license/
    title: Blender licence
  - id: blender-apptemplates
    resource: https://docs.blender.org/manual/en/latest/advanced/app_templates.html
    title: Blender manual, application templates
  - id: eevee-limits
    resource: https://docs.blender.org/manual/en/latest/render/eevee/limitations/limitations.html
    title: Blender manual, EEVEE limitations
  - id: principled
    resource: https://docs.blender.org/manual/en/latest/render/shader_nodes/shader/principled.html
    title: Blender manual, Principled BSDF
  - id: jewelcraft
    resource: https://github.com/mrachinskiy/jewelcraft
    title: JewelCraft repository
  - id: zbrush
    resource: https://en.wikipedia.org/wiki/ZBrush
    title: "Wikipedia: ZBrush"
  - id: nomad
    resource: https://nomadsculpt.com/
    title: Nomad Sculpt
  - id: shapr3d-wiki
    resource: https://en.wikipedia.org/wiki/Shapr3D
    title: "Wikipedia: Shapr3D"
  - id: procreate-wiki
    resource: https://en.wikipedia.org/wiki/Procreate_(software)
    title: "Wikipedia: Procreate"
  - id: matrixgold
    resource: https://gemvision.com/matrixgold
    title: Gemvision MatrixGold
  - id: threedesign
    resource: https://3design.com/
    title: 3DESIGN
---

# Takeaway

Three delivery architectures recur: (1) a **proprietary engine**, often with a real-time mode plus
an optional ray-traced mode in the same viewport; (2) an **application on a general engine**; (3)
a **vertical tool layered on a general DCC**.[^notes-native] General 3D editors on the web chose
three.js (Plasticity, Spline v2); tools whose value *is* the renderer or kernel built their own
(Figma, Onshape); every iPad-first professional tool examined runs a proprietary engine.[^notes-web][^notes-native]

# Cases

| Tool | Built on | Facts |
|---|---|---|
| Plasticity (CAD) | Electron + three.js + Preact + c3d kernel | Public repo manifest: Electron ^17, three ^0.140; LGPL v3[^plasticity] |
| Spline v2 (3D design) | three.js WebGPURenderer + WebGL fallback | Rebuilt Aug 2026 with PBR/HDR, SSR (WebGPU-only), GPU instancing, desktop app[^spline-v2][^spline-runtime] |
| Figma | Custom C++ to WebAssembly; WebGL then WebGPU (Dawn natively) | Live WebGPU-to-WebGL fallback[^figma-2025] |
| Onshape | Server geometry (Parasolid) + custom WebGL/OpenGL clients | Server tessellation streamed as triangles[^onshape] |
| Womp, Vectary | Not disclosed | Both advertise iridescent/holographic, thin-film, clearcoat materials in the browser[^womp][^vectary] |
| Sketchfab | Unknown today; OSG.JS (associated) archived 2020[^osgjs] | — |
| Twinmotion | Own engine for 10+ years, then Unreal; now runs as an instance inside the Unreal editor; cloud version pixel-streams[^twinmotion-aec] | — |
| Substance 3D Stager | Adobe Mercury: switch between real-time and path tracing[^stager] | — |
| KeyShot | CPU ray tracer; optional NVIDIA OptiX GPU mode (RTX, 8 GB+); dedicated Gem material[^keyshot-gpu][^keyshot-wiki] | — |
| JewelCraft | Blender add-on (GPL-3.0), jewellery gems/prongs/cutters[^jewelcraft] | Blender add-ons must be GPL-compatible;[^blender-license] app templates can rebrand Blender;[^blender-apptemplates] EEVEE has no ray-triangle tracing, thin film and anisotropy are Cycles-only[^eevee-limits][^principled] |
| MatrixGold / 3DESIGN | Rhino 8 layer ($5,995 with Rhino) / own engine on Mac and PC[^matrixgold][^threedesign] | — |
| ZBrush | Proprietary "pixol"; iPad version Sept 2024[^zbrush] | — |
| Nomad Sculpt | Proprietary; iPad, Android, Windows, macOS, web demo; ~$35 desktop; author wrote SculptGL (WebGL)[^nomad] | — |
| Shapr3D | iPad Pro first (2016), macOS and Windows 2021; Parasolid kernel; ~100 staff by 2021[^shapr3d-wiki] | — |
| Procreate | Proprietary Valkyrie engine (2019)[^procreate-wiki] | — |

# Lessons **[INFERRED]**

- Keep a WebGL fallback and plan for mid-session device loss (Figma); put heavy deterministic work
  where it is cheapest (Onshape).[^notes-web]
- A commercial 3D design tool can ship on three.js's WebGPU renderer if a WebGL build is kept
  alongside (Spline), and a desktop 3D tool can ship as Electron + three.js (Plasticity), which
  supports the owner's [three.js decision](/decisions/2026-10-15-threejs-over-unreal.md) for desktop.
- Pair a raster interactive mode with an optional ray-traced "beauty" mode on capable hardware;
  making ray tracing a baseline would exclude iPad and integrated GPUs.[^notes-native]
- No iPad professional creative tool built on Unreal or Unity was found (absence of evidence).[^notes-native]
- Blender suits a prototype or pipeline tool (it is already in our pipeline), not a proprietary
  end-user product, because of GPL add-ons and EEVEE limits.[^notes-native]

[^notes-native]: Research notes, native engine options, sections 8-9
[^notes-web]: Research notes, web engine options, section 7
[^plasticity]: Plasticity package.json
[^spline-runtime]: Spline runtime package
[^spline-v2]: Create With, Spline v2
[^figma-2025]: Figma, 2025
[^onshape]: Onshape
[^womp]: Womp
[^vectary]: Vectary
[^osgjs]: OSG.JS
[^twinmotion-aec]: AEC Magazine
[^stager]: Adobe Stager
[^keyshot-gpu]: KeyShot manual
[^keyshot-wiki]: Wikipedia, KeyShot
[^blender-license]: Blender licence
[^blender-apptemplates]: Blender app templates
[^eevee-limits]: EEVEE limitations
[^principled]: Principled BSDF
[^jewelcraft]: JewelCraft
[^zbrush]: Wikipedia, ZBrush
[^nomad]: Nomad Sculpt
[^shapr3d-wiki]: Wikipedia, Shapr3D
[^procreate-wiki]: Wikipedia, Procreate
[^matrixgold]: Gemvision MatrixGold
[^threedesign]: 3DESIGN
