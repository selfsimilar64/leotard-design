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

# Stage 2 (2026-11-05): conflicts and scatter candidates on the GPU

- **Neighbour grid instead of conflict lists.** The CPU no longer makes `conflictsOf`'s lists for a GPU pack (they cost 6-31 ms
  at ~28k candidates). It gives each candidate a standing key (`peaks.js standingKeys`: the rule's class, size class or P,
  x 2^18 + index, the same order as `conflictsOf`'s stable counting sort; `ruleOf` is shared by both) and the grid's size
  (cells >= the biggest stone x clear, so conflicts lie in the 3 x 3 cells round a candidate; at most ~1M cells). When the
  candidates change the GPU builds the grid: GCOUNT (atomic count per cell, each candidate's offset), GSCAN (one workgroup:
  each of 256 threads sums a stretch, thread 0 runs the 256 sums, each writes its stretch's starts), GPUT. ROUND searches the
  3 x 3 cells for candidates with a smaller key within `(d1 + d2) / 2 x clear` (the same relation as the lists).
- **A scatter's candidates drawn by the GPU** (`pattern.js scatterOnGpu`): for a scatter with no modifiers, distortion or
  stray (the stress design; pave, mixed sizes, pebbles), the CPU sends a table per tile point (~13 000 x 8 floats: its place
  in the tile after the seed's turns, direction, diameter, rank, chance, size class, colour index; rebuilt only when the
  seed, variety, size or crystal changes) and the tiles' range. SGEN marks each (tile point, row, column) slot that lands in
  the drawn box and region, SSCAN numbers them by a prefix sum (the CPU's index order: point, then row, then column), SPUT
  writes cand, aux and the standing key. Slots that land nowhere stay a candidate of size 0 (the buffer is cleared first),
  which the other kernels pass over, so `n` is the slot count (an upper bound) and nothing is read back. The drawn box is
  the CPU's (`drawnBox`, shared with `patternCandidates`, cached as `#gpucand`), so a move inside it draws nothing again.
- Twin check: still 660/660 exact (12 cases drawn by the GPU, matched by place both ways since the GPU numbers its own
  candidates).

## Timings after stage 2 (stress design, biggest group 92 376 slots / 36 139 kept)

Taken apart per edit step with the page's frame loop paused (`dev/stone-stress.js stressEngine`; its frames otherwise land in
the waits), GPU times by timestamp queries:

| edit | stone engine CPU | stone engine GPU | frame CPU | frame GPU |
|---|---|---|---|---|
| move | 1.0 ms | 1.4 ms | 5.2 ms | 19.7 ms |
| turn | 0.9 | 1.3 | 5.1 | 14.8 |
| density | 0.8 | 1.3 | 5.0 | 14.3 |
| spacing | 1.0 | 1.9 | 4.3 | 14.6 |
| stone size | 2.7 | 2.0 | 4.4 | 14.5 |

(Spacing before stage 2: 25-73 ms CPU.) The pattern engine now costs ~1-3 ms CPU and ~1.3-2 ms GPU for any edit at 107 543
stones; what is left of a frame is the scene, the crystals' drawing above all. Measuring pitfalls met: steps fired back to back
without waiting for the GPU make a "CPU" timing include waits for earlier frames (17 ms readings that were the GPU's); the
page's own frame loop renders between steps and lands in any wait for the GPU (a keep that looked 5-12 ms is 0.5 ms by
timestamp); a dev script's dynamic `import()` of an app module can be a second copy of it (set switches through a live
instance's constructor).

# After stage 2 (open)

1. Modifiers on the GPU (density, colour, size: `modifiers.js` fields in WGSL), so fades and gradients get GPU candidates
   too; other layouts' candidates (stamped copies, one-size runs in closed form, varying runs one invocation each).
2. The flat view on a WebGPU canvas on the same device, drawing from the same buffers (today it asks the CPU twin for `k`,
   so Pattern and Both layouts still pay the CPU's keep).
3. Blockers (patterns before on the piece), symmetric/side/erase groups, edge-field modifiers on the GPU.
4. Readers that need lists (picking, hover rings, export, bill of materials) stay on the CPU twin on demand.
5. The crystals' draw cost at 100 000 (above): options for the owner (a cheaper crystal for stones a few pixels across,
   fewer facets, impostors) before any change.

[^code]: `app/src/stones/gpu-keep.js`, `pattern.js patternGpu`, `gpu-view.js PackView`, `generators.js`; dev:
    `app/src/dev/gpu-keep-check.js`, `app/src/dev/stone-stress.js`.
