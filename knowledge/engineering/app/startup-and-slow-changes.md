---
type: Technique
title: Start-up curtain, shader pre-compiling and slow changes
description: "Why the app's first start took ~55 s on a cold shader cache (the ~145k-character fabric shader compiled per variant, twice over) and how it now starts: a curtain drawn by index.html before any script, frames held until the studio, the fit and every shader are in, shaders compiled off the page with KHR_parallel_shader_compile into the scene pass's target (Viewport.prepare, also every frame a new variant appears), and slow changes (pose, body, studio, garment) showing the pick at once and a stage note until the result is on show (Engine.settled). Since 2026-11-09 every shader is compiled behind the curtain (render/warmup.js) and each fabric's shader holds only its own effects (fabricDefines): curtain at 52-69 s on a cold cache (was 160 s), ~14.5 s warm, with where that time goes and what is left to speed up."
tags: [app, startup, loading, shaders, webgl, performance, ux, component]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-08T18:00:00Z }
sources:
  - id: code
    resource: "app/index.html (#curtain), app/src/ui/curtain.js, app/src/main.jsx (start, reveal), app/src/render/viewport.js (prepare, checkShaders, mayDraw, envReady), app/src/render/engine.js (settled), app/src/render/fitted.js (loading), app/src/ui/state.js (slow, settle, compiling), app/src/ui/Shell.jsx (Busy), app/src/ui/StageTab.jsx, app/src/ui/ShapeTab.jsx (Garment), app/src/render/warmup.js, app/src/materials/fabric.js (fabricDefines), app/src/render/engine.js (setFinish) on build/designer-app"
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
   leotard (a fitted garment's file and re-fit) → Preparing every fabric (`render/warmup.js` since
   2026-11-09, below; `viewport.prepare()` with `?quick`; after 4 s the curtain adds that this happens
   once after an update) → the hold is let go, two frames, the curtain lifts.

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

As the shader was on 2026-11-08 (since 2026-11-09 each fabric holds only its own code: [below](#each-fabric-holds-only-its-own-code-fabricdefines-2026-11-09)):

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

# Every shader at the start (`render/warmup.js`, 2026-11-09)

The owner chose to compile every variant behind the curtain, so nothing compiles once the designer is working and
nothing runs in the background ([decision](/decisions/2026-11-09-every-shader-at-start.md)). It replaced the
background pass of 2026-11-08 (`render/prewarm.js`, which compiled the fabrics after the curtain lifted; removed).
`main.jsx reveal` runs `warmUp` at the curtain step "Preparing every fabric", its thread filling job by job; after
4 s the curtain adds that this happens once after an update. `?quick` in the address skips it (only what the design
shows is compiled, `Viewport.prepare`), for look-dev reloads.

Jobs, each compiled into the scene pass's target and waited for before the next (the GPU process compiles one at a
time), the objects kept so their programs stay in three's cache:

- the scene itself, hidden parts too (the studio room's dome, the floor's shadow catcher, a stand, the overlays);
- every fabric in `FABRICS` (not the checker), on one side and on both (the mannequin hidden draws the leotard from
  inside, `GarmentView.setDoubleSided`), and Matte and Shiny sheer too when scans are installed (a sheer scan,
  `applyTexture`); on a stand-in with position, normal and tangent (the custom attributes never change a shader);
- every mannequin finish in `MANNEQUIN_FINISHES`, not only those the picker offers (saved designs carry the athlete
  skins, marked for the skin pass), on the skin (fabric shader, both sides) and on the caps (both sides, as
  `stand.js` sets them);
- every crystal family (crystal, pearl, spangle, holo dot, nailhead) two ways: instanced as `StoneView.meshFor` builds
  them and placed by the GPU as `PackView.side` does (`placed`, now exported), with the atlas's own material;
- hardware and stand materials (`hardware.js MATS`, `stand.js STAND_MATERIALS`), fat lines solid and dashed;
- what editing shows, on position-only stand-ins as theirs are: the overlay tool's areas (RGBA colours), the mirror's
  centre line, a flashed piece, hovered crystals' rings;
- one frame drawn with glow, contact shadows, skin and crystal glare on and a piece hovered (the outline's mask and
  quad), then everything as it was; one outline mask is kept (each hover makes its own and frees the last).

Twins: each stand-in mirrors where the app makes that material (notes on both sides: `stones/view.js meshFor`,
`stones/gpu-view.js side`, `render/overlay.js`, `render/highlight.js`, `render/stand.js`). The shader tour
(`dev/shader-tour.js`) is the check that ties them: every option a designer can reach, after the start, listing any
step that compiled.

Measured 2026-11-09 (dev server, GTX 1650): a warm start's warm-up 7.3 s (84 programs; the curtain lifts at ~15 s,
against ~12 s before); with every shader's cache missed (a nonce on each source) 149 s, the curtain lifting at 160 s.
Shadows Off is pixel-identical to the old Off (sun not casting; largest difference 2/765) with no new program. Found and fixed with the tour: the caps drawn
from both sides, saved designs' athlete skins, the outline mask freed after each hover, overlay stand-ins that carried
normals.

# Each fabric holds only its own code (`fabricDefines`, 2026-11-09)

The owner asked for each fabric to compile only its own code. `materials/fabric.js fabricDefines(f)` turns a fabric's
own fields into material defines, and the shader's sections for them sit inside `#ifdef`s:[^code]

| Define | Fabric field | Sections |
|---|---|---|
| `FAB_MICRO` | `micro` (Satin, Duotone satin) | `MICRO_PARS`, the direct-light hooks (`MICRO_DIRECT`), `MICRO_FRAGMENT`, the zeroed diffuse, the thread frame |
| `FAB_FLAKE` | `flake` or `glint` | the flake block, `FOIL_FRAGMENT` |
| `FAB_BEND` | `flake.bend` (the mystiques) | the bent grain lattice inside the flake block |
| `FAB_DUO`, `FAB_FILM`, `FAB_MESH`, `FAB_BUMP`, `FAB_KNIT`, `FAB_CHECKER` | `duo`, `film`, `mesh`, `bump`, `knit`, `checker` | their blocks (`FAB_FILM` also `FILM_FRAGMENT`) |

- Each define is on exactly when `applyFabric` gives its uniform a value that draws (`uMicro`, `uFlake`, `uBend`, `uDuo`,
  `uFilm`, `uMesh`, `uBumpAmp`, `uKnit`, `uChecker`); the uniforms and their runtime `if`s stay inside, so nothing a look
  uses changed. A mannequin finish takes the same from its own fields (`render/engine.js setFinish`: the linen's knit).
- Kept as runtime switches: small parts of an effect (a flake's glint, blend and holo, the film's tint), where a define
  would split one variant into two for a few lines; and everything any piece can take whatever its fabric (a scan and
  its masks, a print, decals, an ombre, seams, trims and topstitching, wrinkles, folds, the dress-form tapes), which
  would otherwise multiply every fabric's variants.
- Twin: `materials/fabric-node.js` (WebGPU) is not specialised (its graph is built before the fabric is known); a
  note on both sides says so.
- Fabrics now fall into 19 distinct variants (from 9 families): Opal mystique and Ombré mystique share Mystique's, Holo
  glitter and Glitter-grain foil share Glitter's, Ombré shares Matte's, Mirror chrome shares Liquid foil's, Illusion
  mesh shares Stretch mesh's. The start compiles 104 programs (45 of them the fabric shader), against 84.

Checked (dev server, GTX 1650):[^measured-2026-11-08]

- **Looks unchanged.** On b6, every fabric (all 25) on every piece, edge and strap, drawn as specialised and again with
  every `FAB_` define on (the old code), in one page: no pixel differs by more than 1/765 (rounding). The crystals were
  hidden for it: their sparkle changes from frame to frame (two draws of the same state differed in up to 260 pixels
  with them shown). Mannequin finishes Linen dress form, Athlete skin and Flocked velvet: within 5/765, no pixel over 6.
- **Nothing compiles after the start**: the shader tour ran 194 steps with nothing compiled.
- **Cold** (a nonce on every shader source): the warm-up took 59.7 s and then 44.6 s, the curtain lifting at 69 s and
  52 s, against 149 s and 160 s. The first run likely also paid the graphics driver's own compile of the new code (the
  nonce misses the browser's cache, not the driver's) **[INFERRED]**. Per fabric job (its two sides) in the first run:
  Satin 7.1 s, Duotone satin 6.0 s, Mystique 3.5 s, Wet look 3.1 s, Matte 3.0 s, Shiny 2.5 s, the rest 1.5-2.5 s. So
  a fabric variant is ~0.75-1.75 s cold (was 4.1-4.7 s; Shiny and Wet 9.6-10.1 s), Satin's ~3.5 s.
- **Warm**: with every program from the cache the warm-up takes 7.4 s (fabrics 5.0 s, ~0.06-0.12 s a variant against
  0.31-0.58 s; finishes 0.7 s; the effects frame 0.65 s; crystals 0.5 s; the scene 0.35 s), the curtain lifting at
  14.4-15.5 s.

**One fabric misses the cache on most warm starts.** In four of six warm starts one fabric job took 2.2-3.2 s, a full
compile: a different fabric each time (Satin twice, Shiny, Crushed velvet; Satin moved to the end then loaded in 0.6 s
and the miss moved to Shiny). In the two starts whose warm-up began later (5 s held back; a tracing run) nothing
missed, and the scene's job fell from ~1.5 s to 0.35 s. Over that window the page sent no other GPU work (traced GL and
WebGPU calls) and its main thread was idle, so the GPU process was compiling. Cause not found: the browser's shader
cache still being read in, or its size limit **[INFERRED]**.

# Where a start's time goes (measured 2026-11-09)

A warm start on the dev server, curtain at ~14.4 s:[^measured-2026-11-08]

| Step | Time | What |
|---|---|---|
| Page and modules | 0.45 s | 154 modules from the dev server (a build would bundle them) |
| Bodies | 1.7-1.9 s | the 4.9 MB body topology arrives in 1.2 s, then parsing; the 25 MB studio photograph arrives in 0.24 s beside it |
| Engine | ~1.0 s | |
| The design | ~1.5 s | the garment ~0.6 s (its arrangement 0.2 s), crystals laid (938 in 66 ms), straps, edges |
| Studio lit, garment fitted | ~0 s | done beside the steps above |
| Warm-up | 7.4 s, ~9.7 s with the one cache miss | above |

Main-thread long tasks: 0.7 s at 0.7 s and 2.8 s from 1.7 s (modules, bodies, the studio photograph's parsing and the
engine, not split further), 0.5 s for the effects frame at the end. A cold start spends the same ~4.8 s, then 45-60 s
compiling: fabrics 34-47 s (Satin's two variants ~7 s, Duotone satin's ~6 s), finishes ~4.4 s, the scene 2-5 s,
crystals and hardware ~2.6 s, effects ~1.1 s.

`render/warmup.js` marks each job (`performance.mark('warm-up: …')`) beside the curtain's steps, so a start's timeline
can be read from the page (`performance.getEntriesByType('mark')`).

# Could every variant compile at the start? (measured 2026-11-09)

The owner asked for every shader variant to be compiled at the start, behind the curtain, so nothing compiles later.
What that costs, measured on the GTX 1650 (Chrome 152, ANGLE/D3D11):[^measured-2026-11-08]

- **No parallel compiling.** Four fabric variants issued at once took 18.8 s, one alone 4.7-6.1 s: the GPU process
  compiles one shader at a time here (12 CPU threads). The first-run wait is the sum of every variant.
- **A cached variant still costs every launch.** Re-creating a fabric variant whose compiled shader is in the disk
  cache took 0.31-0.58 s (the 141k-character GLSL is translated again; only the driver's compile is skipped). Three's
  own material takes 0.16-0.32 s even cold.
- **The tour** (`dev/shader-tour.js`: designs b6 and b12, every fabric, crystal cut and stone, lettering look,
  selection, studio and backdrop, shadow setting, glare, post effect, mannequin finish, pose, body and fitted
  garment, 178 steps) found 125 programs compiled for the first time after today's start and background pass. The
  biggest sources: a studio of another kind (photographed, softbox of six lights, softbox of two: 15-18 each) and
  shadows off (13-14 each), which recompile everything on show; opening a design with straps, bindings and hardware
  (29); then the special crystal cuts (pearl, spangle, holo dot), glare (4), mannequin finishes (2 each), fitted
  garments (1 each). Every fabric on every kind of mesh in every lighting multiplies: roughly 150 fabric-shader
  variants in all **[INFERRED]** from the tour's counts.

What splits a fabric variant (three's program keys decoded, 2026-11-09): the fabric's own features (about nine
families: sheen; sheen + anisotropy; satin's switches; duotone satin's; clearcoat + sheen + anisotropy; none;
iridescence; sheer with sheen; sheer without), the mannequin's finish (its skin is the fabric shader, `|skin`), the
lights (photographed studios: one directional sun with shadow, the HDRI's prefiltered size 4096, so all six
share one set; each softbox studio adds its own count of rect area lights and its own smaller environment), and
whether the sun casts shadows (Settings › Shadows Off; Soft and Detailed only change the map's size). A piece, an
edge and a strap in the same fabric share one program (compared directly on b6): the mesh kind does not split them.
"Contact shadows" is the AO post pass and does not touch the fabric shader.

So with the shader as it was, all of them at the start would have been about ten minutes the first time and most of a
minute added to every launch **[INFERRED]**; the owner then removed the softbox studios and kept shadows off as a
no-shadow draw (above). Ways down, none changing a look: shadows off drawn as an empty shadow map
(no variant), the two-light softbox padded to six dark lights, one attribute set for every fabric mesh, satin's
model only in satin, and the fabric code specialised per fabric. **[INFERRED]** estimates in the owner's report.

# Both sides always, and the decals' share of a compile (measured 2026-11-09)

The owner asked what drawing every fabric on both sides would cost per frame, and what the decals (lettering and the
surface stamps) cost per compile, before choosing.[^measured-2026-11-08] Test tab (port 5176), design "B12 lace over
hologram", mannequin shown, GTX 1650; nothing in the app changed (materials patched in the page, then reloaded).

**Why the inside doubles the variants.** three puts `material.side` in the program key (`parameters.doubleSided` /
`DOUBLE_SIDED`: `normal_fragment_begin` flips the normal and TBN by `faceDirection` for back faces). For front faces
`faceDirection` is 1, so a `DoubleSide` program draws the outside exactly as a `FrontSide` one; the only change is that
back faces are no longer culled.

**Frame cost** (`dev/pass-times.js passTimes`, 1792 x 1344, 20 frames a reading, F / D / DC alternated, 16-18 readings
each, medians; `document.hidden` false throughout):

| Garment drawn | Scene pass | Whole frame |
|---|---|---|
| `FrontSide` (now) | 2.01 ms | 5.05 ms |
| `DoubleSide` | 2.30 ms (+0.29) | 5.37 ms |
| `DoubleSide`, back faces discarded first thing in the fragment shader (`if ( uCullBack > .5 && ! gl_FrontFacing ) discard;` before the `uClip` discard), on while the mannequin shows | 2.14 ms (+0.12) | 5.21 ms |

- The +0.29 ms is the back half of the garment shaded in full: garment meshes draw before the body
  (`render/garment.js` `renderOrder = -1 - z`, so the body under them fails the depth test), so the back faces behind
  the body are not rejected early. The shader already discards (`uClip`, `uClipShell`, edges), so the extra discard
  costs no early-depth behaviour it had.
- Shadow maps: no difference measurable (0.53-0.98 ms in every mode, noise).
- **Looks**: `DoubleSide` + discard against `FrontSide`, stones hidden, full canvas (1144 x 1207): identical at the
  front view and turned 0.8, 3.14 and 4.4 rad; turned 1.6 rad, 5,311 pixels within 3/765 (the shadow map drawn from
  both sides; `shadowSide = BackSide` gave the same order of difference at the front view, so left at null). Without
  the discard one pixel differed (114/765), the inside glimpsed at an opening.

**Compile cost of the decals** (cold: each compile carries a live uniform of its own, `gl_FragColor.r += uNonceN * 1e-9`,
so neither the browser's nor the driver's cache can match; one-sided stand-in compiled into the scene pass's target as
`render/warmup.js` does; 4 rounds alternated, ms):

| Fabric | Whole shader | Without the stamps (gathers, ruching, twist knot) | Without the decal loop (lettering and stamps) |
|---|---|---|---|
| Matte (141.7k characters) | 950-1020 | 714-761 (-0.24 s) | 557-570 (-0.40 s, -41%) |
| Satin (142.0k) | 2670-2760 | 2479-2539 (-0.20 s) | 2136-2413 (-0.55 s, -20%) |

- The stamps are ~0.9k characters of the 2.3k loop but ~half its cost (`atan`, `sin` and their height fed to `bumpN`'s
  derivatives).
- The loop is not copied per slot: the loop bound set to 1, 2 or 4 slots compiles in the same ~0.95 s on Matte.
- Over the start's fabric programs (45, plus the finishes on the skin, which carry the loop too) that is ~18-25 s of a
  cold start **[INFERRED]**; a lettering pass of its own would add its own program(s) back. Warm starts read cached
  binaries (~0.06-0.12 s a fabric variant) and would gain little **[INFERRED]**.

# Left to do [INFERRED]

Ways to shorten the start now (put to the owner 2026-11-09; estimates from the measurements above):

- Compile beside the loading: the fabric, finish and crystal jobs need only the studio (lit within ~1-2 s), not the
  bodies or the design, so they could start while those load: ~3 s off every start, if the early cache misses do not
  grow.
- One side per fabric: the inside of the leotard (mannequin hidden) doubles every fabric variant. Drawing it another
  way (always both sides, or the inside in a plain material) halves them: ~17-23 s off a cold start, ~2.5 s off a warm
  one. Measured (above): always both sides, back faces discarded while the mannequin shows, costs +0.12 ms a frame and
  draws the same picture; the owner's call.
- Decals (lettering and stamps) are 20-41% of a fabric variant's cold compile (above); drawn in a pass of their own
  they would leave every variant (a rewrite: their own surface following fit and pose, their own lighting and fold
  bumps, the stamps staying in the cloth, see-through fabrics, outline and picking).
- In a desktop shell: measure ANGLE's OpenGL or Vulkan backends against D3D11's FXC compiler, and the shell's control
  of the shader cache (the warm starts' one miss).
- A build instead of the dev server: one bundle instead of 154 modules, compressed body files (part of the ~4.8 s before
  the warm-up).
- Find why one program misses the cache on most warm starts (~2-3 s).
- Cache the lift per body and pose (an instant switch back), or solve it in a worker so a pose
  change never holds the page.
- Start the WebGPU device for the re-fit at the very start, beside the bodies.
- The 4K studio photograph (25 MB) is parsed on the page; a 2K copy would light the same
  (the prefiltered environment is far smaller) but the room backdrop would be softer: the owner's call.

[^code]: Source files listed in the frontmatter.
[^owner-2026-11-08]: Conversation with the product owner, 2026-11-08.
[^measured-2026-11-08]: Measurements of 2026-11-08 and 2026-11-09 in the dev preview.
