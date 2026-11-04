---
type: Reference
title: WebGL baseline captures (the parity reference)
description: "The fixed set of captures and frame timings taken with the WebGL renderer on 2026-11-04 before the WebGPU port: what is in it, the exact settings, how to take it again (dev/baseline.js), where it lives (app/captures/baseline-webgl/, not committed), the frame costs measured, and what not to compare pixel for pixel."
tags: [rendering, webgl, webgpu, baseline, parity, captures, performance]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-05T00:30:00Z }
sources:
  - id: plan
    resource: /product/roadmap/webgpu-and-stone-engine-plan.md
    title: WebGPU renderer and one GPU stone engine (plan), Phase 0.2
  - id: code
    resource: "app/src/dev/baseline.js, app/src/dev/material-eval.js (prepare, views), app/captures/baseline-webgl/manifest.json"
    title: Baseline script and its manifest
    author: claude-code/claude-opus-5-5
  - id: run
    resource: "Claude Code session of 2026-11-04 (test copy of the app on port 5177, its own storage): baseline run and checks"
    title: Baseline run
    author: claude-code/claude-opus-5-5
  - id: attrs
    resource: /engineering/rendering/fabric-shading/fabric-vertex-attributes.md
    title: The fabric's vertex attributes (packed)
---

# Takeaway

**The WebGL renderer's reference set is taken**: 170 pictures with their frame cost, after the fabric fix (every fabric
draws)[^attrs] and with the parallel stone rule on, so the WebGPU port can be compared shot for shot on the same machine,
scene and camera.[^plan][^run] The pictures are in `app/captures/baseline-webgl/` (not committed: about 90 MB); the list,
cameras and settings of every shot are in its `manifest.json`. `dev/baseline.js` takes the same set again: run it with
another tag on the WebGPU path and compare the two folders.[^code]

# What is in it

| group | shots | what |
|---|---|---|
| fabrics | 75 | every fabric in `FABRICS` (25) on the plain tank in `#0f3b37`, material-eval's comparison setup (headless matte mannequin, arms outstretched, White loft studio turned 170 degrees, exposure 1): torso (774 x 940), near and macro (900 x 700); bloom off |
| stones | 20 | one hex pattern (11 mm, ss16) on the plain tank's front in matte `#2b2d42`: round Crystal, Crystal AB, Sapphire Shimmer, Jet Hematite, Pacific Opal; navette Siam AB; pearl White Opal; spangle Silver; holo dot Crystal AB; nailhead Gold. Near and macro, bloom off |
| studios | 8 | every studio preset (`RIGS`), the plain tank in shiny `#1b3fb5`, room backdrop, the whole figure (900 x 1100) |
| post | 7 | mystique `#1b3fb5` on the plain tank, Athlete skin (light) mannequin, scene bloom 0.18, torso framing: no post effects, then MSAA 4x, skin, contact shadows (GTAO), bloom, glare (star) one at a time, then all |
| designs | 60 | the six drawn starting points (drawn, then on the fitted textbook leotard), the two fitted starting points, and Procedural Gem Test 1-3 (drawn and fitted, each in its own body, pose and studio): the whole figure from the front, three-quarter and back (900 x 1200) |

Every shot records its camera, size, body, pose, studio, bloom and glare, the design and whether it is fitted, and two
frame costs at 1792 x 1344 (the realism gates' size):[^code]

- `frameMs`: `Viewport.benchmark(60)`, each frame waited for by a one-pixel read (GPU included). Other work on the same
  GPU moves it a lot (10-39 ms within one minute in one state, 2026-11-04).
- `gpuMs`: the median GPU time of the same 60 frames from timer queries (`EXT_disjoint_timer_query_webgl2`): the number to
  set against the WebGPU port's timestamp queries.

# Frame costs (2026-11-04, GTX 1650, 1792 x 1344, median per group)

GPU time from timer queries (`gpuMs`), then the frame with its sync (`frameMs`), ms; median (lowest-highest):

| group | gpuMs | frameMs | notes |
|---|---|---|---|
| fabrics | 7.3 (4.7-31.4) | 9.5 (6.3-33.2) | satin and duotone satin up close are the costliest by far: 22-31 ms GPU at near and macro (the microcylinder model on every pixel); everything else 4.7-13 |
| stones | 8.7 (7.0-9.8) | 10.4 (8.8-13.3) | one hex pattern (11 mm spacing) close up |
| studios | 4.2 (3.9-12.6) | 5.7 (5.5-14.4) | Softbox studio 12.6, Softbox key and fill 7.6 (area lights); the HDRI studios about 4 |
| post | 4.1 (3.5-7.3) | 5.6 (4.8-9.5) | none 3.5; MSAA 4x +1.4, contact shadows +0.9, glare +0.6, skin +0.6, bloom +0.3; all 7.3 |
| designs | 3.8 (2.9-5.3) | 5.8 (5.0-28.3) | the whole figure, small on screen; Gem Test 3 (23 000 stones) 4.8-5.3 |

Taken with the browser pane sometimes hidden (`document.hidden` stayed false, so every shot has timings); one `frameMs` of
28 ms among the designs is the noise described above.

# How to take it again

1. Start the test copy of the app (`leotard-designer-test` in `.claude/launch.json`; it may land on another port when
   5176 is busy) and keep its pane in front: a hidden pane records no timings.
2. Open it on a drawn design (opening on a fitted design leaves the edge finishes hidden after switching to a drawn one:
   a bug found on 2026-11-04, not fixed).
3. In its console (a group taken alone replaces only its own shots in the manifest; `all` starts a fresh one): `const b = await import('/src/dev/baseline.js'); await b.all('webgpu')` (about 20 minutes); groups run
   alone too (`b.fabrics(tag)`, `b.stones(tag)`, ...). It replaces the open design and its autosave.[^code]

# What not to compare pixel for pixel

- **Order matters for state the designs do not save**: a saved design carries no backdrop, so it shows whatever the view
  had; the studios group puts the plain backdrop back when it ends. Stones are laid on the view's ticks, which stop while
  the pane is hidden; the script lays them itself before each picture (the first run caught Gem Test 3 drawn without its
  stones; stones, designs and post were taken again).

- **Hologram, holographic glitter, opal mystique and liquid hologram** change by 30-65% of pixels between two captures
  in a row with the same code and state; compare them by eye.[^attrs]
- Elsewhere two captures of one state differ in a few edge pixels (under 0.2% of pixels by more than 8/255): use that
  as the noise floor of a pixel difference.[^run]
- Fitted designs are re-fitted on the GPU before each shot; points move a little between runs, which shows as sparkle
  noise on glittery fabrics.

[^plan]: WebGPU renderer and one GPU stone engine (plan).
[^code]: Baseline script and its manifest.
[^run]: Baseline run, 2026-11-04.
[^attrs]: The fabric's vertex attributes (packed).
