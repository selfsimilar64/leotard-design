---
type: Component
title: The fabric's vertex attributes (packed)
description: "Why the fabric shader's own per-vertex inputs are packed four to an attribute (13 separate ones broke shiny, satin, duotone satin and wet: 'Too many attributes', nothing drawn), the layout (materials/fabric-attributes.js), who writes and reads it, and how the fix was checked against before-and-after captures of every fabric."
tags: [rendering, fabric, shader, webgl, webgpu, attributes]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T23:30:00Z }
sources:
  - id: plan
    resource: /product/roadmap/webgpu-and-stone-engine-plan.md
    title: WebGPU renderer and one GPU stone engine (plan), Phase 0.1
  - id: fitted
    resource: /engineering/app/fitted-garments-in-the-app.md
    title: Fitted garments in the app (where the failure was found)
  - id: code
    resource: "app/src/materials/fabric-attributes.js, app/src/materials/fabric.js (PARS_VERTEX, BEGIN_VERTEX), app/test/fabric-attributes.test.js"
    title: Fabric attribute code
    author: claude-code/claude-opus-5-5
  - id: run
    resource: "Claude Code session of 2026-11-04 (test copy of the app on port 5177): material-eval captures of every fabric before and after, fitted captures, pixel differences"
    title: Before-and-after captures
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Every fabric now draws.** The fabric shader declared 13 attributes of its own; with three.js's position, normal,
tangent and uv that is 17, over the 16 vertex attributes this laptop's GPU allows (WebGL `MAX_VERTEX_ATTRIBS` = 16 on
the GTX 1650; WebGPU's default `maxVertexAttributes` is also 16). The anisotropic fabrics, whose programs use the
tangent and a scan normal map, failed to link ("Too many attributes (aSeam)") and drew nothing, drawn or fitted:
**shiny, satin, duotone satin and wet**, not shiny alone as first reported.[^fitted][^run] The inputs are now packed
into 8 attributes (12 in all), so 4 stay free for the WebGPU port.[^plan][^code]

# Layout (`materials/fabric-attributes.js`)

| attribute | x | y | z | w |
|---|---|---|---|---|
| `aCoverZone` | cover (> 0 fabric; a lining: the shell's cover) | ambient occlusion | zone field 1 | zone field 2 |
| `aKeepForm` | keep (< 0 cut away) | dress-form tape field 1 | tape field 2 | panel's gradient position (0..1) |
| `aFold` | fold x (twice the angle) | fold y | fold height, m | metres to the nearest seam |
| `aLift`, `aGNormal`, `aRef` | vec3 as before | | | |
| `aUV`, `aRim` | vec2 as before (the cloth coordinates stay unpacked: many CPU readers) | | | |

`FABRIC_SLOTS` names each channel (`cover`, `ao`, `zone`, `keep`, `form`, `grad`, `fold`, `seam`); `setFabricSlot(geo,
slot, array | number)` writes one, adding the packed attribute (zeroed) if missing; `addFabricAttributes(geo, n)` adds all
eight. A missing vec4 attribute reads (0, 0, 0, 1) in a shader, so a geometry without `aFold` reads a seam distance of 1;
only panels use it (`uSeam`), and they write it.[^code]

# Who writes and reads it

- **Readers**: the fabric shader's vertex code (`fabric.js` PARS_VERTEX, BEGIN_VERTEX: varyings unchanged, so the
  fragment code is untouched) and the hover outline's mask (`render/highlight.js`, keep). `test/fabric-attributes.test.js`
  checks that the shader declares exactly `FABRIC_ATTRIBUTES` and reads each varying from its slot.
- **The body** (`body/mannequin.js`) keeps cover, AO, zone, keep and form as plain arrays (`aCover`, `aAO`, `aZone`,
  `keep`, `form`; the lift and seat solvers read them) and copies them into its geometry's packed attributes wherever they
  change (setStyle, setCover, updateGarment, applyCut). The skin pieces (`render/engine.js`) share the body's attributes
  but carry their own `aKeepForm` (each its own keep).
- **Garments**: `render/garment.js` (panels; interpolation writes the slots), `render/fitted.js`, `dev/wrap-eval.js`,
  `render/straps.js`, `garment/trim.js` (edge finishes and rims), `materials/swatches.js`, `dev/drape-eval.js`.

# How it was checked (2026-11-04)

- In a test copy of the app (its own storage), every fabric in `FABRICS` through `dev/material-eval.js` (`#0f3b37`, torso,
  near, macro) before and after, and five fabrics on the fitted textbook leotard (torso, near). No program fails to link.[^run]
- Shiny, satin, duotone satin and wet: blank before, drawn after (on drawn and fitted garments).
- Every other fabric: the after captures differ from the before ones by no more than two after captures differ from
  each other (a few edge pixels, under 0.2% of pixels over 8/255).
- **Capture noise to know about**: hologram, holographic glitter, opal mystique and liquid hologram differ by 30-65% of
  pixels between two captures in a row with the same code and page state. Cause not found; our guess: their rainbow
  follows the view and light direction so closely that the camera's settling between shots moves it. Compare them by eye, not by pixel difference.[^run]

[^plan]: WebGPU renderer and one GPU stone engine (plan).
[^fitted]: Fitted garments in the app.
[^code]: Fabric attribute code.
[^run]: Before-and-after captures, 2026-11-04.
