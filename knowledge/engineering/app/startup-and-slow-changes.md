---
type: Technique
title: Start-up curtain, shader pre-compiling and slow changes
description: "Why the app's first start took ~55 s on a cold shader cache (the ~145k-character fabric shader compiled per variant, twice over) and how it now starts: a curtain drawn by index.html before any script, frames held until the studio, the fit and every shader are in, shaders compiled off the page with KHR_parallel_shader_compile into the scene pass's target (Viewport.prepare, also every frame a new variant appears), and slow changes (pose, body, studio, garment) showing the pick at once and a stage note until the result is on show (Engine.settled). Measurements of 2026-11-08 and what is left to speed up."
tags: [app, startup, loading, shaders, webgl, performance, ux, component]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-08T18:00:00Z }
sources:
  - id: code
    resource: "app/index.html (#curtain), app/src/ui/curtain.js, app/src/main.jsx (start, reveal), app/src/render/viewport.js (prepare, checkShaders, mayDraw, envReady), app/src/render/engine.js (settled), app/src/render/fitted.js (loading), app/src/ui/state.js (slow, settle, compiling), app/src/ui/Shell.jsx (Busy), app/src/ui/StageTab.jsx, app/src/ui/ShapeTab.jsx (Garment) on build/designer-app"
    title: Source
    author: claude-code/claude-opus-5-5
  - id: owner-2026-11-08
    resource: conversation with the product owner, 2026-11-08 (Claude Code session)
    title: Owner asked why a cold start is so slow, for a classy loading screen that echoes a leotard, and for feedback on loads such as pose and body changes
    author: human:mattj
  - id: measured-2026-11-08
    resource: "measurements in the dev server's preview (port 5176), GTX 1650, Chrome 152 ANGLE/D3D11: a temporary probe page that timed WebGL links, KHR_parallel_shader_compile completion and main-thread stalls; ?cold appended a nonce to every shader source so the GPU process's shader cache missed"
    title: Start-up and compile measurements
    author: claude-code/claude-opus-5-5
---

# Takeaway

A slow start was shader compiling, not loading: the fabric shader (`materials/fabric.js`) is about
145,000 characters of GLSL, every fabric kind on show is a variant of it, and on ANGLE/D3D11 each
variant takes roughly 6-14 s to compile when the GPU process's shader cache misses (the first start
after the shader changed: every look-dev edit).[^measured-2026-11-08] The old start drew frames as
parts arrived, so it compiled the fabric for the stand-in lighting, then again for the studio's
once its photograph loaded: ~55 s on a cold cache, ~9 s warm. Now nothing is drawn until the first
finished frame, shaders are compiled off the page, and a curtain covers the start.[^code]

# The start (`main.jsx` start, reveal)

1. `index.html` draws the curtain before any script: a garnet satin leotard (a CSS mask of its
   silhouette) with a sheen running over it and five crystals at the neckline glinting after it,
   the app's name, the step under way, and a thread that fills. Everything that moves is
   transform or opacity, so the compositor keeps it moving while the page's thread builds the
   garment. Reduced motion stops the sheen and glints.[^owner-2026-11-08]
2. The viewport is made with a `'startup'` hold (no frames, no resize draws: `mayDraw`), and the
   design's studio starts loading beside the bodies (`applyScene` before the engine exists).
3. Steps, each a `performance.mark('start: …')` and a curtain step (`ui/curtain.js`): Dressing the
   mannequin (bodies, engine, design) → Lighting the studio (`viewport.envReady`) → Fitting the
   leotard (a fitted garment's file and re-fit) → Finishing the fabric (`viewport.prepare()`; after
   3 s the curtain adds that a first start after an update takes longer) → the hold is let go,
   two frames, the curtain lifts.

# Compiling off the page (`Viewport.prepare`, `checkShaders`)

- three's `compile()` per visible mesh, then each program's `isReady()`
  (KHR_parallel_shader_compile's COMPLETION_STATUS, a query that does not wait) polled every 30 ms;
  meanwhile the `'shaders'` hold keeps the last frame and the stage note says "Preparing the
  materials…" (`compiling` signal).
- **Into the scene pass's target.** A variant drawn into a render target differs from one drawn to
  the screen (tone mapping, output colour space). `compileAsync` for the screen left the 9 s stall
  in place; the same call with `scenePass.target` set left a 27 ms first frame.[^measured-2026-11-08]
- Every frame `checkShaders` hashes the visible materials' ids and versions, the environment and
  the lights (microseconds); a change runs `prepare` (~0.6 ms when everything is a cache hit).
  So a fabric kind not shown before, a new studio or crystals laid after the start compile the same
  way. No `prepare` ran while idle or orbiting (checked).
- WebGPU: not covered (`prepare` returns at once); its pipelines compile their own way.

| Measured 2026-11-08 (GTX 1650) | Before | After |
|---|---|---|
| Cold start to a finished frame | ~55 s (fabric compiled 4-5 times) | ~24 s (twice), no stall while compiling |
| Warm start, dev server | frames from ~4 s, stutters to ~9 s, garment fitted after | curtain lifts at ~12 s on the finished design |
| A new fabric variant mid-session, cold | page frozen 9.6 s | 9.5 s with the note up, longest stall 2 ms |

The warm start's ~12 s on the dev server: bodies ~2.1 s, engine ~1.8 s, applying the design
~2.2 s, the fitted garment ~5.2 s (its fit ~1 s; the rest is set-up around it: WebGPU device,
cover and lift re-solve, building), shaders ~0.5 s.[^measured-2026-11-08]

# Slow changes (`ui/state.js` slow, `Engine.settled`)

- A pose, body, studio, garment, silhouette option or design opened runs through `slow(text, fn)`:
  the pick shows at once (the tile chosen, with a spinner: `Tiles busyKey`; the Garment row's
  segment), the stage note appears top centre with the curtain's sheen along its foot, and it stays
  until `Engine.settled()`: no body waiting for files, no fitted garment loading, no studio
  loading, no hold (a re-fit, shaders). Overlapping changes show the latest.
- Before: the note ended when the command returned, the tile lit only after the ~1 s re-solve, and
  the studio and garment loads said nothing. The note's class was `.busy`, which also matched busy
  tiles and library cards and threw them out of place; it is `.stage-busy` now.
- Where a pose or body change's time goes (hybrid high cut on `young`): ~1.0-1.1 s on the page
  (`Man.setBody`, of which `computeLift` ~0.6 s and the fitted garment's placing ~0.2 s; rims
  ~0.05 s), then ~0.45 s of GPU re-fit. With the drawn garment ~0.6 s.[^measured-2026-11-08]

# What a variant's compile costs (measured 2026-11-08)

Each variant compiled alone on a cold cache (a nonce define; `renderer.compile` into the scene pass's
target, then a blocking `LINK_STATUS`), GTX 1650, ANGLE/D3D11:[^measured-2026-11-08]

| Variant | Cold compile |
|---|---|
| three's own MeshPhysicalMaterial, same lights and target (plain; + sheen; + anisotropy; + clearcoat, sheen and anisotropy) | 0.16; 0.22; 0.18; 0.32 s (80k characters) |
| Matte, Satin (its speed-ups), Mystique, Foil, Velvet, Mesh, Iridescent, Liquid holo | 4.1-4.7 s each (141-142k characters) |
| Duotone satin | 5.0 s |
| Shiny tricot; Wet look | 9.6 s; 10.1 s |
| Shiny tricot with anisotropy off; with Satin's speed-up switches | 4.3 s; 4.8 s |

- About 95% of every variant's compile is the fabric code, which each variant carries whole: every
  effect (foil dots, mesh, film, holo, ombre, prints, decals, scans and their masks, wrinkles) is a
  runtime switch, compiled whether the piece uses it or not.
- The satin thread model (`MICRO_FRAGMENT`) is compiled into any fabric with anisotropy
  (`#if ... USE_ANISOTROPY`): Shiny tricot and Wet look carry it, never run it (`uMicro` 0), and get
  it without Satin's speed-up switches (`MICRO_SPEED` is set only for satin), so it doubles their
  compile. A satin-only define around it would bring them to ~4.3 s with no change to any look.
  Its twin in `materials/fabric-node.js` (WebGPU) would need the same treatment.
- Variants are three's feature switches (sheen, clearcoat, anisotropy, iridescence, transparency)
  plus the satin's `MICRO_SPEED` defines: one per distinct combination on show.

# Left to do [INFERRED]

- Shorter compiles: gate the satin model to satin (above); then specialise the fabric code by the
  effects a piece uses (compile-time switches per effect group, parameters staying uniforms), so a
  plain knit compiles little more than three's own 0.2-0.3 s, at the price of more, smaller
  variants (compiled ahead off the page: `Viewport.prepare`). Pre-compile the catalogue's variants in
  the background after the start so a fabric picked later is instant. In a desktop shell, measure
  ANGLE's OpenGL or Vulkan backends against D3D11's FXC compiler. The fabric code is look-dev, so the
  owner decides when (memory: no simplifying during look-dev; the specialising cuts nothing a look uses).
- Cache the lift per body and pose (an instant switch back), or solve it in a worker so a pose
  change never holds the page.
- Start the WebGPU device for the re-fit at the very start, beside the bodies.
- The 4K studio photograph (25 MB) is parsed on the page; a 2K copy would light the same
  (the prefiltered environment is far smaller) but the room backdrop would be softer: the owner's call.

[^code]: Source files listed in the frontmatter.
[^owner-2026-11-08]: Conversation with the product owner, 2026-11-08.
[^measured-2026-11-08]: Measurements of 2026-11-08 in the dev preview.
