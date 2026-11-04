---
type: Component
title: The 3D view on WebGPU (Phase 1)
description: "Phase 1 of the WebGPU plan: the second renderer path (?renderer=webgpu), every part of the WebGL view ported (fabric with its lighting, stones and their GPU placement, post effects, outline, captures, swatches, the re-fit's device), how each is built, the pitfalls met and the parity against the WebGL baseline."
tags: [rendering, webgpu, webgl, port, parity, tsl]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-05T12:00:00Z }
sources:
  - id: plan
    resource: /product/roadmap/webgpu-and-stone-engine-plan.md
    title: WebGPU renderer and one GPU stone engine (plan), Phase 1
  - id: base
    resource: /engineering/rendering/webgl-baseline-captures.md
    title: WebGL baseline captures
  - id: code
    resource: "app/src/render/webgpu.js, webgpu-post.js, outline-node.js, rings-node.js, viewport.js, lines.js; app/src/materials/fabric-node.js, fabric-light.js; app/src/stones/stones-node.js, gpu-view.js, view.js; app/src/dev/baseline.js, wgsl-scope-check.js; app/test/webgpu-parity/"
    title: WebGPU path code
    author: claude-code/claude-opus-5-5
  - id: run
    resource: "Claude Code session of 2026-11-04/05 (test copy of the app on port 5177)"
    title: Port checks and parity runs
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Everything the app shows draws on WebGPU** with `?renderer=webgpu` (or `localStorage['leotard.renderer'] = 'webgpu'`);
without it the WebGL renderer runs as before.[^code] Against the WebGL baseline (same captures, same machine) the fabrics,
stones, post effects and designs match within about one level of 255 on average; see Parity below.[^run] The WebGL path is
still the default: the plan retires it once the owner signs off the parity and the frame cost.[^plan]

# How it is built

| part | WebGL | WebGPU twin |
|---|---|---|
| renderer, capture, benchmark | `render/viewport.js` | `render/webgpu.js` (`createWebGPU`, `captureFrame`, `readPixels`, `benchmarkFrames`) |
| fabric surface and pattern | `materials/fabric.js` (GLSL) | `materials/fabric-node.js` (TSL, section for section) |
| fabric lighting (AO shares, skin wrap, film thickness, foil, satin thread model) | `fabric.js` AO_FRAGMENT, SKIN_DIFFUSE, FILM_FRAGMENT, FOIL_FRAGMENT, MICRO_* | `materials/fabric-light.js` (a `PhysicalLightingModel` subclass), FOIL and FILM in `fabric-node.js` |
| post: scene (MSAA), skin pass, contact shadows, glow, glare, output | `render/postfx.js`, `glare.js`, `UnrealBloomPass`, `OutputPass` | `render/webgpu-post.js` `NodePost` |
| hover outline, stone rings | `render/highlight.js` | `render/outline-node.js`, `render/rings-node.js` |
| crystals | `stones/view.js` crystalMaterial | `stones/stones-node.js` crystalNodeMaterial |
| pattern stones' GPU placement | `stones/gpu-view.js` Atlas (four float targets at once), `placed()` | `stones-node.js` AtlasNode (one target at a time), `placedNode()` |
| photo colour sampling, swatches | sync read-back | async (`samplePatch`, `swatch`, `swirlThumb` return Promises on WebGPU; callers await) |
| re-fit (`fit/refit.js`) | its own GPU device | the page's one device, the renderer's too (`Refit.device`, shared) |

Each twin carries a cross-reference to its other side; a change to one is a change to both. The satin's thread model is
ported in the two configurations the app uses (MICRO_SPEED 'all4' and 'duo'); its environment lookups blend two prefiltered
levels where the GLSL takes the nearest (MICRO_MIP), within 2-4/255.

## Pitfalls met (keep for the rest of the port)

1. **A shared value first used inside a branch** (the worst, twice): TSL writes a value used in several places into a
   variable once, at its first use; first used inside an `If` and read elsewhere, it is zero there when the branch did not
   run. Three's own `positionViewDirection` works the same way, and the lighting after the material reuses it: the fabric read
   it first inside rarely taken branches, so the lighting saw a zero view direction (Fresnel 1: every lit side white). Then the
   pixel footprint `fp`, first used under the bump: fabrics without bump saw pixels of size 0 (glitter too fine, mystique's
   foil never blending to a shimmer). Rule: make every value read in more than one branch a variable (`.toVar()`) where it is
   defined. Check: `dev/wgsl-scope-check.js` scans the generated WGSL of a mesh for reads no write covers (clean on every
   fabric, body, panel and edge).
2. **`cameraNear` / `cameraFar` in a full-screen pass** are the quad's own camera's: pass the scene camera's as uniforms
   (the skin pass blurred across the image in blocks).
3. **Intermediate textures (`rtt`) update once a frame in an order of their own**: a pass that must follow the scene is drawn
   into an explicit target in `NodePost.render`, as the WebGL composer did.
4. **A multisampled depth texture cannot be sampled**: one sample of it is copied into a float target for the passes.
5. **The prefiltered environment node takes the texture**, not another environment node (the satin's environment light came
   out black); lookups that must follow the scene's environment are re-pointed by `syncFabricPacks` each frame.
6. **WebGPU limits**: 8 vertex buffers a draw (fabric inputs in one interleaved copy per geometry); 32 bytes a sample across
   colour targets by default (the stone atlas renders its four targets one by one); points one pixel wide (rings as instanced
   quads); read-backs pad rows to 256 bytes and only async; a canvas hands out only its last shown frame (captures render to
   a target).
7. **Three starts its own initialisation when the animation loop is set**: the loop starts once the shared device is in, and
   the device asks for every adapter feature (three reads `core-features-and-limits` to tell a full device from a
   compatibility one).
8. Earlier, recorded in the plan's log: `customProgramCacheKey` shares a node material's graph across materials; nested
   loops need their own names in WGSL; the derivatives' view position sign; captures set the lights, exposure and glow
   themselves (a hidden page runs no frames).
9. A harmless warning stays: three's GTAO node hands a vec4 depth sample to a vec3 constructor (r186); three keeps its first
   component, the depth.

# Parity (2026-11-05)

Capture set `webgpu-s12` against the WebGL baseline (170 shots), mean difference per shot in levels of 255, all channels:

| group | shots | median | worst |
|---|---|---|---|
| fabrics (every fabric, torso, near, macro) | 75 | 0.3 | 0.8 (shiny, macro) |
| stones (every family, near, macro) | 20 | 0.4 | 0.6 (navette, AB, macro) |
| post effects (none, MSAA, skin, contact shadows, glow, glare, all) | 7 | 0.1 | 0.4 (all) |
| designs (starting points and gem tests, drawn and fitted, three views) | 60 | 0.4 | 2.5 (Gem Test 3, fitted) |
| studios | 8 | 6.0 | 59.3 (Green loft hall) |

- **Gem Test 3 (2.5)** is not the renderer: the baseline predates patterns on one piece keeping apart (decision of
  2026-11-04), so its upper front pattern now keeps stones the baseline did not show.
- **Studios**: the softbox studios, the small photo studio and the white loft match (0.3-0.8). Four photographed studios
  with a bright window (Green loft hall 59, Parquet sunlit 36, Window loft 29, Neon 11) differ in the glow round the window:
  on WebGL it reaches across the whole frame, on WebGPU less far. Open, for the owner's eye. What is known: two WebGL captures
  of Green loft hall, the baseline and one taken now, differ by 32 themselves; a fresh WebGL capture and WebGPU differ by 28.
  The glow shaders, kernel sizes, mip chain, resolution (a quarter of the image) and composite (UnrealBloomPass's 3 x
  strength, added times its own peak, ported in `webgpu-post.js`) are the same on both sides; the cause is not found.
- Not measured yet (the browser pane was hidden, which stops frames): frame cost at 1792 x 1344 against WebGL (the plan's
  gate), and a parity run on the WebGL 2 fallback.

Captures: `app/captures/baseline-<tag>/` (gitignored); `python app/test/webgpu-parity/report.py <tag>` and `compare.py` (side by
side sheets in `app/captures/parity-<tag>/`). Taken with `b.TIMINGS.on = false` (captures only); timings: below.

# Platform and fallback (plan step 8)

There is no desktop shell in the repository yet (the product decision is a native desktop app; Electron and Tauri both ship
Chromium-class WebGPU on Windows). The fallback where WebGPU is missing is three's own WebGL 2 backend of the same renderer
(`?renderer=webgpu&forcewebgl` forces it): it drew the scene earlier in the port (it was the cross-check that found the grey fabrics were not the WebGPU backend), and
it loads without errors with everything ported here (2026-11-05); its parity run is not taken yet. Where WebGPU is missing,
the re-fit (`fit/refit.js`, compute shaders) has no device: a fitted garment keeps its saved fit. The stone engine's CPU twin
(Phase 3) is the stones' fallback the plan names.

[^plan]: WebGPU renderer and one GPU stone engine (plan).
[^code]: WebGPU path code.
[^run]: Port checks and parity runs, 2026-11-04/05.
