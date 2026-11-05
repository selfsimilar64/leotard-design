---
type: Component
title: Pattern stones laid and kept on the GPU (Phase 3)
description: "On the WebGPU view a pattern's stones are laid (every kind of geometry), thinned by its modifiers, kept on the piece, kept apart, kept clear of the patterns before it, cut (symmetric, one side, erased) and written into three's vertex buffers by WebGPU compute (stones/gpu-lay.js, stones/gpu-keep.js); the 3D and flat views draw from those buffers. The CPU describes the geometry and builds per-piece rasters. Twin check: 1 192 of 1 197 preset cases identical to the CPU twin (14 of 1.76 million stones differ at float32 edges). Stages, kernels, checks, timings, and what still runs on the CPU and why."
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
    resource: "app/src/stones/gpu-lay.js (laying kernels, layData, variants), app/src/stones/gpu-wgsl.js (hashes, noise, distortions, modifiers, sizes in WGSL), app/src/stones/gpu-keep.js (keep kernels, blockers, the cut, GpuKeep), app/src/stones/pattern.js patternGpu, posRasters (the CPU's share; twins of patternCandidates and keepPattern), app/src/stones/gpu-view.js PackView (room, keep, blockersOf, keptHooks), app/src/stones/generators.js packOfGroup, blockersFrom; app/src/ui/FlatStones.jsx paintGpu; app/src/render/engine.js syncStones (ctx.gpuKeep, layReady); app/src/dev/gpu-keep-check.js (gpuKeepCheck, gpuPackCheck), app/src/dev/stone-stress.js (stress design and timings)"
    title: GPU keep code
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Stage 3 (2026-11-05, latest):** every pattern is laid on the GPU too, not only scatters; modifiers (density, size, colour, from the
edge) are evaluated on the GPU; a pattern keeps clear of the patterns before it on its piece and is cut (symmetric, one side,
erased) on the GPU; the flat view paints from the same buffers. What the CPU still does, and why, is under "What stays on the CPU".
The stage-1 text below is kept as the history of how it got here.

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

# Stage 3 (2026-11-05): the whole engine on the GPU

- **Laying** (`stones/gpu-lay.js`, the WGSL twin of `stones/candidates.js` `Candidates.lay`; a change to one is a change to the other):
  the CPU packs the geometry a layout drew (`layData`: items, points, joints, vertices, lines, runs, copies, each cell's tables, and
  for copies laid alike everywhere the cell's stones about its origin as `Candidates.stampStones` lays them) and bounds the buffers.
  Per item (IVCOUNT, a prefix sum, IVERT) the runs' vertices are placed on the cloth; per item (ISLOT counting, a prefix sum, ISLOT
  laying) its slots are laid in the CPU's order, a slot of size 0 where the CPU lays none; a scatter's points by formula one slot per
  invocation (SEMIT); joints (`fresh`) deduped by a hash table, the first slot winning (DEDUP1, DEDUP2). Runs whose sizes vary walk
  stone by stone, twice (count, then lay). Too small a buffer is read back and the pattern laid again bigger, nothing shown meanwhile.
- **Compile time** (Windows, D3D): one kernel holding every path took 15 to over 20 s to compile (every helper inlined at each call).
  Restructured so each heavy step has one call site (one `layOne`, one `runSize`, one `runStone`, one `stopStone` ...), and
  specialised by override constants (`KINDS`: a scatter alone or any geometry; `DIAM`: size modifiers; `BEND`: a distortion): the
  common variants 0.4-0.8 s (compiled when the GPU keep starts, `layWarm`), with size modifiers or a distortion 1.5-3 s, compiled
  the first time a pattern needs them while the CPU twin keeps it (`variantReady`, `layKit.onReady` lays every group again).
- **Modifiers** (`stones/gpu-wgsl.js`, twin of `stones/modifiers.js`): all 18 shapes, stacking, clip and feather, colour stops and the
  plain palette by chance; "From the edge" reads the piece's edge raster (`ClothPiece.edgeAt`'s). Density and colour are worked out
  every run in KEEP (colour in the state's upper bits), so a modifier edit uploads a small table and costs no CPU per stone; size in
  the lay. Ranks' fractions (`frac(rank x 61.8 + 0.137)` and the like) in 32-bit fixed point, as exact as the CPU's float64.
- **Rule and grid on the GPU**: RULE (the candidates' extremes by workgroup reduction), GRIDP (the grid over them and the rule:
  `stones/peaks.js ruleOf`), KEYS (standing: class << 22 | slot).
- **Blockers** (patterns before this one on its piece): each earlier pattern kept on the GPU read from its own side's `aStone` buffer
  and indirect count, others' stones uploaded; a grid built every run (BMAX, BGRIDP, BCOUNT, BSCAN, BPUT) and `blocked()` in KEEP
  (`stones/peaks.js blocked`). A keeper's own follow-up run re-runs the patterns after it on the piece.
- **The cut** (FILTER, `stones/generators.js packOfGroup`'s `filter`): symmetric (the wearer's left, mirrored), one side, the eraser's
  marks; per kept stone its place on the body and its mirror image's from a raster of the piece (`stones/pattern.js posRasters`, made
  once a piece, read bilinearly): two bits hide it on its own side or its mirrored side (WRITE). Each side's count read back.
- **Flat view** (`ui/FlatStones.jsx` `paintGpu`): on the WebGPU view the stones are painted on the renderer's device; a pack kept on the
  GPU is drawn straight from its instance buffers (as many as its indirect count says); its colour taken back from the 3D view's
  (linear, with a crystal's own shade) to the swatch's. Pixel-identical to the same painting fed by the CPU twin (0 of 517 024 pixels).
  Picking builds a pack's arrays from the CPU twin only when a stone is picked.
- **CPU twin fixes found by the twin check**: a joint on a round number read in two copies (0.11249999 and 0.11250000) became two
  stones, and a stop's chance and a stone's stray could fall either side of a rounding: their cells now start `OFF` (1/pi of a cell)
  off the round numbers (and the binary fractions fractal curves land on); a stone's stray is keyed by its place, not its rank; the
  size dither reads the rank as kept (float32); a cell laid once for its copies no longer dedupes joints in its own frame (each copy
  does, where it lies).
- **Checks**: `dev/gpu-keep-check.js gpuKeepCheck`: 133 presets x 9 variants (plain, moved, flipped, thinned, a radial fade with a
  colour ramp, an edge fade with clouds, a size modifier, a distortion, a stray): 1 192 of 1 197 identical, 14 of 1 758 496 stones
  differ (strays and one distortion on a float32 edge). `gpuPackCheck`: the design on show end to end, each side as the GPU wrote it
  against the CPU twin's records: a pattern kept clear of an earlier one, erased, cut to one side (on a pair too), symmetric: all
  equal but one stone on the centre line of the symmetric one (the raster). The WebGL view (CPU twin throughout) gives the same counts.
- **Timings** (stress design, before the owner started a game on the same GPU; no timings after): the pattern engine ~0.7-1.5 ms CPU
  and ~1.6-3 ms GPU for a move, turn, density, spacing or stone-size step, in the 3D and in the Both layout. Drawing the 107 000
  crystals is the frame's cost, the same whether they were kept on the GPU or the CPU.

# What stays on the CPU, and why

1. **Describing the geometry** (a layout's `make`, `stones/geometry.js`): on an edit that changes the arrangement (spacing, size, a
   layout's own settings), not on a move, turn, density, margin or modifier edit. It is each layout's own code (40-odd layouts); the
   result is data the GPU lays. Linear in the geometry's items: for most layouts runs and copies (cheap), but the point-by-point
   ones (halftones, lattices of single stones, phyllotaxis, Ulam, clusters, fractal dust) record a point per stone. Those could
   become point sources like the scatter (a WGSL kernel each); not done: each would be a second copy of its layout's maths. The
   edge rows trace contours of the piece's edge distance here too. Heavy layouts are cached between edits.
2. **Per-piece rasters**, made when a piece is flattened or its openings change: room (edge distance), keep-out (asks the body's
   finished openings), body positions for cut groups.
3. **Readers, on demand**: picking (3D and flat), the stone list, export and bill of materials, stats by colour, and a CPU-kept
   pattern's blockers: the CPU twin (`pack.k`, `records()`), only when asked.
4. **The WebGL view**: no compute shaders; the CPU twin throughout (the fallback).
5. **Stones that are not patterns**: single placed stones, rows along a line (the Rows tool walks the 3D body surface), and the
   keep-apart pass between them: few stones, geometry on the body mesh.
6. **Fitted garments, flat view**: a mirrored pattern shown on the other sleeve of a pair is placed there by its fitted triangles,
   from the CPU twin's records (the 3D view draws it from the GPU's buffers).
7. **Compiling** a pattern kind's kernels the first time (above): the CPU twin keeps that pattern for those 0.4-3 s.

# Open

1. Point-by-point layouts as GPU point sources (see "What stays on the CPU", 1), if the owner wants arrangement edits of those free
   of CPU work too.
2. The fitted-sleeve case of the flat view (above, 6).
3. The crystals' draw cost at 100 000 stones: options for the owner (a cheaper crystal for stones a few pixels across, fewer facets,
   impostors) before any change; the owner's word (2026-11-05): the stress test is deliberately extreme, no change for now.
4. A browser test that runs the twin check (today a dev script run in the test tab).

[^code]: `app/src/stones/gpu-keep.js`, `pattern.js patternGpu`, `gpu-view.js PackView`, `generators.js`; dev:
    `app/src/dev/gpu-keep-check.js`, `app/src/dev/stone-stress.js`.
