---
type: Component
title: Pattern stones kept on the GPU (Phase 3, stage 1)
description: "Since 2026-11-05, on the WebGPU view, which of a pattern's candidates become stones (density, room on the piece, the openings' keep-out, the parallel rule) and their instance data are worked out by WebGPU compute (stones/gpu-keep.js), written packed into three's vertex buffers and drawn by indirect draws; the CPU keeps only what a move does not change. Identical to the CPU twin on 660 preset cases (839 138 stones); at the 107 543-stone stress design a move, turn or density step costs the CPU 3-4.5 ms instead of 21-25 ms. What it does, how it is checked, the timings, and what stage 2 must do."
tags: [stones, patterns, gpu, webgpu, compute, performance, engine]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-05T18:00:00Z }
sources:
  - id: plan
    resource: /product/roadmap/webgpu-and-stone-engine-plan.md
    title: WebGPU renderer and one GPU stone engine (plan), Phase 3
  - id: geometry
    resource: /engineering/architecture/stone-geometry.md
    title: The stone engine's geometry (Phase 2)
  - id: peaks
    resource: /engineering/architecture/parallel-stone-spacing.md
    title: Stones kept apart by a parallel rule
  - id: owner
    resource: conversation with the product owner, 2026-11-05 (Claude Code session)
    title: "Continue to Phase 3; measure actual frame time, not fps (readings can be held to the screen's refresh)"
    author: human:mattj
  - id: code
    resource: "app/src/stones/gpu-keep.js (kernels, GpuKeep), app/src/stones/pattern.js patternGpu (the CPU's share; twin of keepPattern), app/src/stones/gpu-view.js PackView (room, set, gpuKeepOn), app/src/stones/generators.js packOfGroup, blockersOfLists; app/src/render/engine.js syncStones (ctx.gpuKeep); app/src/dev/gpu-keep-check.js (twin check), app/src/dev/stone-stress.js (stress design and timings)"
    title: GPU keep code
    author: claude-code/claude-opus-5-5
---

# Takeaway

On the WebGPU view (`?renderer=webgpu`) a pattern's per-stone work no longer runs on the CPU when it moves, turns or
thins: the GPU decides which candidates are kept, applies the parallel rule, and writes each kept stone's instance data
straight into the vertex buffers the stone material reads, packed, with the draw's instance count set by the GPU (indirect
draw). The CPU keeps only what a move leaves alone, per candidate set. Same stones as the CPU path to the last stone on
every preset. At ~107 000 stones the CPU work of a move/turn/density step falls from 21-25 ms to 3-4.5 ms. Spacing and size
steps (new candidates) are stage 2. The WebGL view, the tests and every CPU reader use the CPU twin (`keepPattern`).[^code]

# What runs where

| when | CPU (`pattern.js patternGpu`, cached) | GPU (`gpu-keep.js`, every run) |
|---|---|---|
| arrangement changes (spacing, size, layout, plane, distortion, size modifiers) | candidates and conflict lists (`patternCandidates`, `conflictsOf`) | |
| those, or density/colour modifiers, crystal, palette change | per candidate: rigid-frame place, direction, diameter, rank, the density modifiers' factor, colour index (`statics`) | upload |
| piece flattened / openings change | room and keep-out rasters | upload |
| every edit of the group (move, turn, flip, density, margin, keep-out, stone turn) | ~30 numbers (`frame`) | KEEP, ROUND x budget (+ NEXT), GATE, WRITE |

- Density and colour modifiers read the frame's own coordinates, which a rigid move leaves alone, so their values per
  candidate are worked out once. A modifier "From the edge" on density or colour reads the cloth: such a group stays on
  the CPU (`patternGpu` returns null). So do symmetric, one-side and erased groups (not packs at all) and a pattern with
  others before it on its piece (blockers).
- Kernels (raw WGSL compute on the renderer's device, `layout: 'auto'`, at most 8 storage buffers each):
  - KEEP per candidate: place on the cloth, `rank < overall x densityFactor`, room raster `>= d/2 + margin`, keep-out raster
    (as `keepPattern`): state 0 (undecided) or 2 (out).
  - ROUND per candidate, in place on one state buffer (atomics): in (1) once every conflict above it is out, out (2) once
    one is in. Monotone, so reading fresher states only settles sooner and the result is the order's unique one. NEXT (one
    thread) sets the next round's indirect dispatch to zero once nothing is open.
  - Round budget: an empty round still costs ~45 us a group on the GTX 1650 (0.22 ms for 5 groups); 48 always-dispatched
    rounds made a run of the 5 stress groups 11.5 ms. A run dispatches `need x 2 + 2` rounds (`need`: what this candidate
    set last took, read back), all 48 when not known. GATE (one thread per side): a run that did not settle writes nothing,
    so the last finished stones stay on show, and the read-back starts a run with every round (tested: rings-spokes needs
    15; forced to 4, nothing was written and the follow-up gave exactly the CPU's 3 729 stones). A full-budget run writes
    what settled. Most presets settle in 1-3 rounds; 22 at most over the gallery.
  - WRITE per kept candidate, per side (own, mirrored): `atomicAdd` on the side's indirect buffer word 1 gives its slot
    (packed, order varies) and is the draw's instance count; aStone (u, v, angle or spin, +-d), aColour, aFinish as
    `PackView.fill`. Word 5 of that buffer is GATE's flag.
- Hand-over to three: per GPU side, `StorageInstancedBufferAttribute`s (vec4) and an `IndirectStorageBufferAttribute` (8
  words) on the side's geometry (`geometry.setIndirect`); `renderer.backend.createStorageAttribute` /
  `createIndirectStorageAttribute`, then `renderer.backend.get(attr).buffer` is bound in the compute pass. Never set
  `needsUpdate` on them (three would upload the CPU array over the GPU's writes). Freed through
  `renderer._attributes.delete` when three has drawn with them.
- Count: `GpuKeep.count` from the own side's indirect word 1, read back with `mapAsync` (not waited for); a run while a
  read is under way is read after it. `pack.count`, `StoneView.count` (now a getter) and the read-out use it; it lags a
  frame or two. The kept stones as CPU arrays (`pack.k`) are made by the CPU twin only when asked (flat view, stats,
  picking, records, a later pattern's blockers).
- Pitfall found: `runStones` gathered every pattern's kept stones for the patterns after it on the piece, which asked
  each GPU pack for its CPU `k` every run (7.5 ms of the 7.9 ms sync). Now gathered only when a later pattern needs them
  (`blockersOfLists`).
- Pitfalls of WGSL here: no comma-separated `let`; with `layout: 'auto'` a binding the entry point never reads is not in
  the layout (GATE reads `u.n` to keep binding 0).

# Checks

- **Twin check** (`dev/gpu-keep-check.js`, plan Phase 3 step 7; run in the test tab on WebGPU): every gallery preset x
  {plain, moved and turned, flipped with a stone turn, thinned with a margin, radial density fade + linear colour} on a
  real piece of Gem Test 3 with the design's openings: 660 cases, 839 138 stones: the same candidates kept, every one
  drawn where the CPU puts it (within 0.01 mm; float32 against float64), the same counts, nothing unsettled. 5 cases
  skipped (the edge fade). Exact at every stage (before and after packing and the round budget).
- Renders: GPU keep and CPU keep pixel-identical on Gem Test 3 (800 x 600 capture).
- Unit tests: 230 pass; the 4 failing (poses, a fabric texture size) fail the same before this work.

# Timings (test tab, WebGPU, GTX 1650, pane 654 x 690)

Stress design (`dev/stone-stress.js`: Gem Test 3, its flower hidden, scatter ss4 gap 1.1 on all five pieces): 107 543
stones, biggest group 64 737 candidates / 36 139 kept. Work per step, not frame rate (owner: rates are held to the
screen's refresh): the edit and one `Viewport.frame` called directly, median of 24 steps of one gesture.

| step | GPU keep | CPU twin |
|---|---|---|
| idle frame | 2.7-5.8 ms | 15-21 ms |
| move | 3.4-4.7 ms | 20.7-24.7 ms |
| turn | 3.0-4.2 ms | 21-22.8 ms |
| density | 3.1-4.3 ms | 20.7-22.5 ms |
| spacing (stage 2) | 25-50 ms | 32-73 ms |

- GPU keep of all five groups, back to back, waited for: 2.99 ms a run (12.6 ms before the round budget).
- **The frame itself** (wall time per frame rendered back to back, waiting for the GPU; and the GPU's timestamp): 15.7-20.8
  ms wall, 14.7-19.3 ms GPU, against 5.1-5.5 ms with the stones hidden. Drawing ~107 000 faceted crystals costs ~11-14 ms
  of GPU at this pane size, the same whether they are kept on the GPU or the CPU (16.4 vs 17.0 ms once packed; 22.5 ms
  before packing, when the not-kept candidates were drawn as collapsed instances). **This alone breaks the 60 fps gate at
  100 000 stones**, whatever the pattern engine does; the crystal's look is the owner's call (no simplifying a material
  without asking).

# Stage 2 and after (open)

1. Candidates and conflict lists on the GPU, so spacing and size steps stop costing 25-50 ms: the SOURCE kernels (scatter
   first), stamped copies, one-size runs in closed form, varying runs one invocation each, and the conflict grid as a GPU
   counting sort; `statics` built on the GPU from them.
2. The flat view on a WebGPU canvas on the same device, drawing from the same buffers (today it asks the CPU twin for `k`,
   so Pattern and Both layouts still pay the CPU's keep).
3. Blockers (patterns before on the piece), symmetric/side/erase groups, edge-field modifiers on the GPU.
4. Readers that need lists (picking, hover rings, export, bill of materials) stay on the CPU twin on demand.
5. The crystals' draw cost at 100 000 (above): options for the owner (a cheaper crystal for stones a few pixels across,
   fewer facets, impostors) before any change.

[^code]: `app/src/stones/gpu-keep.js`, `pattern.js patternGpu`, `gpu-view.js PackView`, `generators.js`; dev:
    `app/src/dev/gpu-keep-check.js`, `app/src/dev/stone-stress.js`.
