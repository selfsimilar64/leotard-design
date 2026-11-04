---
type: Roadmap
title: WebGPU renderer and one GPU stone engine (plan)
description: "Hand-off plan of 2026-11-04: fix the shiny fabric (too many vertex attributes) and take a WebGL baseline; make the parallel stone rule the default; move the 3D view to three.js's WebGPU renderer with visual parity; then lay every stone pattern with one GPU stone engine (compute) so every edit plus redraw holds 60 fps at 100 000 stones. Context, decisions, steps, gates, measurement rules."
tags: [roadmap, webgpu, rendering, stones, patterns, performance, plan, handoff]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T22:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-04 (Claude Code session)
    title: "Plan for approach B (WebGPU renderer first, then the stone steps on the GPU); target 100 000 stones as a stress test; fix the shiny material first to compare WebGL and WebGPU looks; write the plan so another agent can pick it up"
    author: human:mattj
  - id: engine
    resource: /engineering/architecture/stone-pattern-engine.md
    title: One stone engine for every pattern (proposal)
  - id: gpu
    resource: /engineering/architecture/gpu-stone-placement.md
    title: Stone patterns placed on the GPU
  - id: peaks
    resource: /engineering/architecture/parallel-stone-spacing.md
    title: Stones kept apart by a parallel rule
  - id: overlap
    resource: /decisions/2026-11-04-stones-may-overlap.md
    title: Stones may overlap; the live preview is the design
  - id: spec
    resource: /engineering/architecture/procedural-stone-patterns.md
    title: Procedural stone patterns
  - id: fitted
    resource: /engineering/app/fitted-garments-in-the-app.md
    title: Fitted garments in the app (where the shiny failure was found)
  - id: realism
    resource: /engineering/rendering/realism-upgrades-at-60fps.md
    title: Realism upgrades at 60 fps
  - id: refit
    resource: /engineering/app/refit-in-the-app.md
    title: The re-fit in the app (WebGPU compute already in use)
---

# Goal

Every stone-pattern edit (move, turn, scale, spacing and the layout's own sliders, size, density, colour, modifiers, preset
changes) **plus the redraw holds 60 fps at 100 000 stones** in the 3D view, the flat view and both, on the owner's laptop,
with the live preview equal to the result at every step. Route chosen by the owner: **B** (move the 3D renderer to
WebGPU first, then run the stone steps as GPU compute), with a fixed stress test of 100 000 stones.[^owner]

# Where things stand (end of 2026-11-04, branch `build/designer-app`)

Commits of the day, oldest first: `d451a97` (flat view stones on a WebGL canvas, the handle in Pattern-only layout),
`e936592` (no clearance check; scatters spaced by the ranked blue-noise tile), `f139c19` (candidates drawn in the pattern's
own frame, reused on a move or turn), `542d456` (keep test from piece rasters, packed arrays), `ee8d196` (pattern stones
placed on the GPU from per-piece atlases), `389cb3c` (flat view paints packed arrays; drawn area sized by move or turn),
`6defbab` (the parallel rule, behind `engine.stoneCtx.peaks`, off), knowledge commits after. Nothing pushed.

- **Pipeline today** (`app/src/stones/pattern.js`): `patternCandidates` draws a pattern's candidates on the CPU in its own
  frame through the sequential pen (`stones/candidates.js`), cached per group; `keepPattern` decides each candidate from
  two rasters (density, room, keep-out) into packed arrays; with `opts.peaks` the parallel rule (`stones/peaks.js`)
  resolves clashes; `stones/generators.js` packOfGroup hands a **pack** to `stones/gpu-view.js` PackView, which places
  each stone on the body in a WebGL vertex shader from a per-piece atlas (four float targets). Records per stone only when
  asked (`run.stones`). The flat view (`ui/FlatStones.jsx`) paints packs on its own WebGL2 canvas.
- **Measured** (Procedural Gem Test 3, flower of life on the front, Both layout; work per step, not frame gaps):

  | stones | move | spacing drag |
  |---|---|---|
  | 14-18 thousand | 8 ms | 23-39 ms |
  | 26-57 thousand | 15-19 ms | 58-166 ms |

  The 3D frame alone (`Viewport.benchmark`, GPU included) is 9-16 ms at the pane's size on this laptop (GTX 1650 4 GB, 4K
  display at 1.75 scale). A spacing step on Gem Test 3 = drawing 18-21 ms + conflict list 11 ms + keep 3 ms; the drawing
  is slow there because the design's old-format record carries a size modifier (`sizeTo`, "along", 1 -> 0.875), which turns
  off `Candidates.stamped`'s cell template (any `diam` does), so every circle is walked stone by stone (2.6 ms with it).
- **Shiny fabric draws nothing** (WebGL): its program fails to link, "Too many attributes (aSeam)". Found 2026-11-04,
  fixed the same day in Phase 0.1 (satin, duotone satin and wet were broken too).
- **WebGPU already in use**: the re-fit runs raw WGSL compute on its own `GPUDevice` (`app/src/fit/refit.js`,
  `fit/refit-wgsl.js`), separate from the WebGL renderer, reading back with `mapAsync`.

# Decisions this plan rests on

1. **Route B**: three.js `WebGPURenderer` (three 0.186 in `app/package.json`) for the 3D view, node materials (TSL)
   instead of `onBeforeCompile`, then the stone engine as compute on the same device.[^owner]
2. **100 000 stones** is the stress test for every gate below.[^owner]
3. **The parallel rule is the look** ("looks most like our older system, no overlaps, runs fast"): make it the default
   and record it as superseding [stones may overlap](/decisions/2026-11-04-stones-may-overlap.md) for patterns. The live
   preview stays the design (the rule runs every frame).[^owner]
4. **Drop the traced-contour family**: contours, Chladni (lines), wave interference (lines), labyrinth, ripples, flow
   lines, bubbles. Confirm two exceptions with the owner before deleting: the halftone variants of Chladni and wave
   interference (areas, shader-friendly) and the edge rows ("Rings along the edge", "Graded border": offsets of the piece
   outline, not tracing). Fractal layouts become point kernels (space-filling curves by index, fractal dust, quasicrystal
   vertices, Voronoi), not curves. One-off analytic curves (rings, rose, guilloche, spirals, string art, sunburst,
   mandala, whirl, nautilus, meteors) may stay CPU-built geometry fed to the GPU engine.[^owner]
5. **Sizes stay quantised per stone, never per grid cell**: a stone's size is the size field at its own place snapped to a
   sold size by its own random (`ditherSize`); spacing along a run follows the sizes (see Phase 3).[^owner]

# Phase 0: shiny fabric, WebGL baseline, parallel rule on

## 0.1 Fix "Too many attributes" (WebGL first, so the baseline is right)

**Done 2026-11-04**: packed to 8 attributes, not the 7 proposed (`aUV` and `aRim` stay unpacked: many CPU readers);
every fabric draws, drawn and fitted; see [the fabric's vertex attributes](/engineering/rendering/fabric-shading/fabric-vertex-attributes.md).

- Cause: `app/src/materials/fabric.js` PARS_VERTEX declares 13 custom attributes (aCover, aZone, aAO, aLift, aFold,
  aGNormal, aRef, aKeep, aForm, aRim, aUV, aGrad, aSeam); with position, normal and the variant's built-ins (shiny has
  `anisotropy: 0.6`, a scan normal map, `uv`) the program needs more than the 16 vertex attributes this GPU allows
  (`gl.getParameter(gl.MAX_VERTEX_ATTRIBS)`). Adding `aFold` (commit `1600d71`) pushed shiny over. **WebGPU's default
  `maxVertexAttributes` is also 16**, so the fix carries over.
- Fix: pack, do not drop. A proposal (check every reader): `aMisc = vec4(cover, ao, keep, grad)`, `aZoneForm =
  vec4(zone.xy, form.xy)`, `aRimUV = vec4(rim.xy, uv.xy)`, `aFold` as vec4 with the seam distance in `w`; aLift, aGNormal,
  aRef stay vec3. 13 -> 7. Writers to update together (2026-11-04 grep of literal `setAttribute('aX'` calls):
  `render/garment.js`, `render/fitted.js`, `render/straps.js`, `garment/trim.js`, `materials/swatches.js`,
  `dev/drape-eval.js`, `dev/wrap-eval.js`; plus `body/mannequin.js` (updateGarment writes aLift/aGNormal through
  variables, so read it, do not grep it) and `render/highlight.js` (repeats the fabric's displacement). Readers: the fabric shader's vertex and
  fragment code, any material sharing these attributes (`render/figure.js`, trims, decals: grep).
- Verify: every fabric in `FABRICS` (`materials/fabric.js`) draws on a drawn and on a fitted garment; no "Too many
  attributes" in the console; the other fabrics' captures unchanged (pixel diff below, owner's eye on shiny).

## 0.2 WebGL baseline captures (the reference for parity)

**Done 2026-11-04** (after 0.1 and 0.3, so every fabric draws and the stones use the rule): 170 shots with GPU and frame
timings; `app/src/dev/baseline.js`; list, settings and numbers in
[WebGL baseline captures](/engineering/rendering/webgl-baseline-captures.md).

- Fixed set, captured with the WebGL renderer before any port, kept under `app/captures/baseline-webgl/` (not committed
  if large; record the list and settings in the knowledge bundle):
  - every fabric through `app/src/dev/material-eval.js` (`shoot(fabric, colour, tag)`: torso, near, macro distances; the
    owner's comparison setup);
  - the starting-point designs and the three "Procedural Gem Test" designs (front, 3/4, back; drawn and fitted);
  - stones close up (crystal, pearl, spangle, holo dot, nailhead families; AB, metallic, opal coatings);
  - the studio presets (`render/presets.js` RIGS) and the post effects one at a time (MSAA scene, skin SSS, GTAO,
    bloom, glare) at one framing.
- Also record `Viewport.benchmark(60, { width: 1792, height: 1344 })` per scene (the realism gates' size).
- Note: dev scripts replace the open design and its autosave; run them only in the test tab (port 5176, its own
  storage), never in the owner's tab.

## 0.3 Parallel rule on

**Done 2026-11-04**: on by default; [decision](/decisions/2026-11-04-pattern-stones-kept-apart.md); conflict lists from
typed-array grids, per size class on mixed scatters (1.5-3.5x faster, same lists:
[parallel rule](/engineering/architecture/parallel-stone-spacing.md)). Found: density thins a scatter of many sizes much
less under the rule (95% of the stones kept at density 0.5), as the old check did; for the owner to look at.

- `render/engine.js` stoneCtx: `peaks: true`; decision record superseding the overlap decision for patterns; update
  `procedural-stone-patterns.md` pipeline step 4 and the tests that assert overlap (`app/test/patterns.test.js`: "a scatter
  under a size modifier thins...", "patterns are kept as laid..."; scatters go back to `gap` clearance under the rule).
- Speed up its conflict list now (it is 11-47 ms of a spacing step): replace the `Map` of arrays in `peaks.js`
  `conflictsOf` with a counting-sort grid in typed arrays; a grid per size class when a scatter mixes sizes (38 ms on
  `scatter-mixed`). The GPU version (Phase 3) replaces it anyway; keep it as the CPU twin.

# Phase 1: WebGPU renderer with visual parity

Approach: a second renderer path behind a switch (`?renderer=webgpu`, or a Settings toggle), the WebGL path untouched
until parity is signed off, so both can be compared on the same machine, scene and camera. `WebGPURenderer` can also run
its node materials on a WebGL2 backend: use that only as a check that a port is the material and not the API.

Inventory (2026-11-04) of what must move:

| area | files | WebGL today | WebGPU target |
|---|---|---|---|
| renderer, loop, resize, capture, benchmark | `render/viewport.js` | `WebGLRenderer`, `setAnimationLoop`, `readPixels` sync | `WebGPURenderer` (`await renderer.init()`), timestamp queries for GPU time |
| post | `render/postfx.js` (ScenePass MSAA, SkinPass, AOPass/GTAOPass), `UnrealBloomPass`, `render/glare.js` (GlarePass), `OutputPass` | `EffectComposer` | `PostProcessing` with TSL nodes (pass(), bloom, ao, custom skin and glare nodes) |
| fabric | `materials/fabric.js` (1 593 lines; procedural foil, holo, glitter, crinkle, knit, mesh, ombre, zones, seams, folds, clip, tapes) | `MeshPhysicalMaterial` + `onBeforeCompile` | `MeshPhysicalNodeMaterial` with TSL `positionNode`, `normalNode`, `colorNode`, etc.; the GLSL becomes TSL functions |
| person, skin | `render/figure.js` (skin finish, `bakeOcclusion`, ShaderMaterial) | onBeforeCompile, ShaderMaterial | node materials; SSS as a node pass |
| stones | `stones/view.js` crystalMaterial (inner reflection, AB, glints), `stones/gpu-view.js` (atlas, `placeStone`), `stones/stones.js` (legacy) | onBeforeCompile, RawShaderMaterial MRT | node material reading instance data from storage buffers (Phase 3 writes them) |
| hover outline | `render/highlight.js` OutlinePass | custom Pass, ShaderMaterial | node pass |
| lines, overlays | `three/addons/lines/*` (Line2, LineMaterial), `render/overlay.js`, `render/gizmo.js`, `render/rims.js` | LineMaterial | `Line2NodeMaterial` |
| environment | `RoomEnvironment`, `HDRLoader`, `GroundedSkybox`, `RectAreaLightUniformsLib`, `render/studio.js` | PMREM, RectAreaLight WebGL | PMREM nodes, `RectAreaLightTexturesLib` |
| the rest | `render/decals.js`, `straps.js`, `hardware.js`, `pictures.js`, `stand.js`, `garment.js`, `fitted.js`, flat view canvas (`ui/FlatStones.jsx`, WebGL2) | stock materials mostly | stock node materials; flat view: a WebGPU canvas on the same device (Phase 3) |

Progress: [the 3D view on WebGPU](/engineering/rendering/webgpu-port.md) (step 1 in, 2026-11-05).

Steps, each gated by the baseline (Phase 0.2) on the same capture and a pixel-difference report plus the owner's eye for
anything that differs; do not simplify a material's look to make a port easier (owner's rule during look-dev):

1. Renderer, camera, controls, environment, studio lights, floor, a stock material on the mannequin; capture, benchmark.
2. Fabric: port fabric.js layer by layer (zones and clip, lift and fold, seams, ombre, knit, mesh, crinkle, glitter,
   foil, holo), each against its material-eval captures.
3. Figure and skin, SkinPass.
4. Post: MSAA scene, GTAO, bloom, glare, output; then the outline pass and lines.
5. Stones (crystal and families) still placed by today's atlas path, ported to a node material reading the same data.
6. Captures and thumbnails (`dev/thumbnails.js`, `viewport.capture`), the photo-match and material tools.
7. Re-fit: move `fit/refit.js` onto the renderer's device (`renderer.backend.device`) so the fitted garment's points can
   stay on the GPU; keep its bit-for-bit checks (`dev/refit-lab.js`).
8. Platform (owner, 2026-11-04: no iPad testing): confirm WebGPU in the desktop shell; decide the fallback (WebGL2 backend
   of WebGPURenderer for drawing, the CPU twin of the stone engine for stones).

Gate to leave Phase 1: every baseline capture matches or the owner accepts the difference; frame cost at 1792 x 1344 no
worse than WebGL's; WebGL path then retired.

# Phase 2: the stone engine's geometry description (CPU side)

From [the proposal](/engineering/architecture/stone-pattern-engine.md): a layout only describes geometry, in the
pattern's own frame (`rigidOf`): **points** (position, t, family, size factor k, priority, direction), **runs** (chains of
line and arc pieces between stops; a stop may carry a keystone; a whole number of stones fills a run), **areas** (a field
plus a point source and a mapping), and **tiling** (one cell of any of these, lattice vectors, the wallpaper group's
operations; random choices per cell from a hash of the cell index).

1. Re-point the pen: `Candidates` (and `Drawing`, whose ops are already a recording) emits runs and points instead of
   stones, so every layout works unchanged on day one.
2. Stamped layouts (`E.stamped`: circles, scales, truchet, tenprint, tilings, motifs, wallpaper) emit one cell + the
   lattice instead of looping over cells; size modifiers no longer disable it (decision 5).
3. Per-class work: points by formula (scatters and fades via the tiled blue-noise tile, phyllotaxis, prime spirals,
   Ulam, galaxy, stardust, clusters, halftones), fractals as points (Hilbert, Peano, dragon and other L-system curves by
   index; fractal dust; quasicrystal vertices; Voronoi), analytic curves as CPU runs, the traced-contour family removed
   (decision 4; migrate or drop any saved design that uses them, after asking).
4. A JS reference of the engine's steps over typed arrays (the CPU twin): tests, the iPad fallback, and the check of
   the GPU's results.

# Phase 3: the stone engine as GPU compute

Every step one element per invocation (WGSL compute, or TSL compute nodes), data in storage buffers on the renderer's
device; nothing read back per frame except a few counts.

1. **Per run**: sample the size field along it (64 samples), running total of `length / (gap x size)`, stones =
   round(total); keystones at stops. Reserve slots per run for its most (smallest sizes).
2. **Per slot**: position where the running total reaches k/n; direction from the tangent; size snapped per stone;
   colour, density, angle from the modifiers (port `stones/modifiers.js` fields: linear, reflected, radial, oval, diamond,
   square, sweep, spiral, waves, ripple, stripes, checks, clouds (fbm), edge, along, family, random, bysize). Tiling:
   slot index -> (cell, item).
3. **Parallel rule**: neighbours by a GPU spatial hash (counting sort into cells) or, tiled, by cell offset; real sizes;
   Jacobi rounds until no slot changes (most presets 1-3, radial spokes up to ~25); then compaction of the kept stones
   (prefix sum) into the draw buffer and an indirect draw count.
4. **Piece**: the room and keep-out rasters (`keepPattern`'s, as textures), symmetric, side and erase filters.
5. **Body**: today's atlas (`stones/gpu-view.js`) as textures on the same device; the stone node material reads its
   instance from the compacted buffer (no CPU upload per frame).
6. **Readers**: counts and stats per frame (a few numbers, `mapAsync` without stalling the frame); the full stone list
   only on demand (picking, hover rings, export, bill of materials); the flat view draws from the same buffers on its own
   canvas.
7. Twin check: GPU against the JS reference on every gallery preset (counts equal, positions within float error), as a
   test that runs in the browser.

# Gates and measurement rules

- **Stress test**: 100 000 kept stones on one piece (the flower of life made dense: Gem Test 3 at `ss3` and small
  spacing reaches ~27 000 kept under the parallel rule on the front piece; reach 100 000 with a scatter or a dense tiling
  over several pieces, or a larger piece; record the exact design).
- **Pass**: for every edit kind above, in 3D, Pattern and Both layouts, the frame holds 60 fps (90th percentile frame
  under 16.7 ms) and the edit's result is on screen the same frame or the next.
- **Measure work, not frame gaps**: at 60 Hz a step that fits reads 16.7 ms whatever it costs. Report CPU time per step
  (the edit plus `Viewport.frame`, timed by a wrapper) and GPU time (timestamp queries), with medians and 90th
  percentiles. The script used on 2026-11-04: `app/test/stone-spacing-compare/bench-in-app.js` (paste into the test
  tab's console; one edit per animation frame in a gesture; work = the edit + `Viewport.frame`; GPU by `benchmark`).
- **Environment**: GTX 1650 4 GB, 4K display at 1.75 scale. The preview pane throttles when hidden: check
  `document.hidden` and that the tab is fronted before trusting any timing; a hidden pane's rAF stops entirely.
- Visual comparisons of stone spacing: `app/test/stone-spacing-compare/` (Node, three versions, contact sheet).

# Working notes for the agent

- Knowledge goes in `knowledge/` (OKF v0.2): update the notes above as phases land, `python knowledge/scripts/okf.py
  check` and `index`, a line in `knowledge/log.md`, commit with the knowledge.
- Commit messages from PowerShell break on double quotes: commit with `-F` from a file. Python patches on this machine:
  `newline=''` (CRLF files). Bash heredocs expand backticks (use the Write tool for JS template literals).
- The test tab: `leotard-designer-test` in `.claude/launch.json` (port 5176). After an edit the preview may not have
  reloaded: check the module URL's `?t=` or the page age; HMR can leave two copies of `ui/state.js` (import the one the
  page loaded: the `?t=` URL from `performance.getEntriesByType('resource')`).
- Show only finished states (no half-made garment or stones between steps); keep busy notes for slow steps.
- The owner judges realism by eye (works with gymnasts daily, visual arts background): their read beats metrics.

# Owner's answers (2026-11-04, evening)

1. **Patterns kept**: any pattern suitable for the shader approach stays (so the halftone variants and the edge rows, as
   areas and outline offsets, stay; the traced-contour line family goes as decision 4 says).[^owner]
2. **Patterns on one piece keep apart**, now: done (decision record above, "Patterns on one piece keep apart too").
3. **Stress test design**: any simple design with every piece fully covered by a generated pattern.
4. **Density on mixed scatters** under the rule: fine for now, revisit if more control is needed.
5. **No iPad testing**: Phase 1 step 8 drops the iPad check; the fallback question stays for the desktop shell only.

[^owner]: Conversation with the product owner, 2026-11-04.
