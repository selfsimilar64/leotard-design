---
type: Component
title: The stone engine's geometry (Phase 2, built)
description: "Since 2026-11-05 every stone pattern draws its geometry as data (stones/geometry.js: points, joints, free lines, runs between stops, copies of a cell, in the pattern's own space, typed-array tables) and one engine (stones/candidates.js Candidates.lay) lays any geometry as candidates. Reproduces the old pen's candidates exactly on 568 preset cases except two old bugs fixed and an intended rank change; copies of a cell stay templates under a size modifier. Format, engine rules, verification, timings, open items for the GPU port."
tags: [stones, patterns, gpu, architecture, engine, webgpu, performance]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-05T12:00:00Z }
sources:
  - id: plan
    resource: /product/roadmap/webgpu-and-stone-engine-plan.md
    title: WebGPU renderer and one GPU stone engine (plan), Phase 2
  - id: proposal
    resource: /engineering/architecture/stone-pattern-engine.md
    title: One stone engine for every pattern (proposal)
  - id: owner
    resource: conversation with the product owner, 2026-11-05 (Claude Code session)
    title: "Phase 1 more or less finished; continue to Phase 2"
    author: human:mattj
  - id: code
    resource: "app/src/stones/geometry.js, app/src/stones/candidates.js (Candidates.lay and the laying methods), app/src/stones/pattern.js geometryOf, boxOver; app/test/patterns.test.js (the geometry engine tests)"
    title: Geometry and engine code
    author: claude-code/claude-opus-5-5
---

# Takeaway

A layout no longer lays stones. Its `make(P, G)` draws with the same pen calls as before (`add`, `key`, `move`/`to`,
`begin`/`to`/`corner`/`end`, `seg`, `arc`, `poly`, `stamped`) into a `Geometry`, which records them as typed-array
tables in the pattern's own space; nothing in it depends on the pattern's map, sizes, modifiers or piece. One engine,
`Candidates.lay(G)`, turns any geometry into candidates item by item. This is Phase 2 steps 1, 2 and 4 of the
[plan](/product/roadmap/webgpu-and-stone-engine-plan.md) (step 3 in part: the traced-contour family is gone). Phase 3
ports `lay`'s item kernels to GPU compute; the JS ones stay as the twin.[^plan][^code]

# The format (`stones/geometry.js`)

Items in drawing order (`kind: Uint8Array`, `idx: Int32Array`); the order is the candidates' order, which the parallel
rule's ties and the joints' first-one-wins go by. Tables are `Float64Array` with fixed strides:

| item | stride | fields |
|---|---|---|
| POINT | 9 | x, y, rank (as given: sizes dither by it), angle, t, k, cat, pri, unit (rank it is kept by when >= 0) |
| KEY (joint) | 8 | x, y, angle, t, k, cat, pri, rank (resolved at record time: unit, given, or `placeHash * 0.4`) |
| vertex | 6 | x, y, k, t, cat, unit (cat and unit read by free lines only) |
| LINE (free) | 3 | first vertex, vertex count, lineHash |
| RUN | 12 | first vertex, count, lineHash, keyA, jkA, jpA, keyB, jkB, jpB, closed, cat, unit (cat, unit and keyB's at close time) |
| STAMP (copy) | 6 | template id, x, y, t, cat, unit |

- A run item is appended when it closes (`corner`/`end`), a line when it ends (next `move`/`begin`, `finish`): the same
  moment the old pen laid them, so key order is unchanged. `corner` closes one run and opens the next at the last vertex
  with the state of the moment.
- `seg(..., jkB)` leaves `jk = jkB` set, as the pen did (layouts rely on it).
- Box culls (`add`, `key` ±2 mm, `seg`, `arc`) happen at record time in pattern space. Arcs are tessellated at record
  time (`stepA = min(0.21, 2 pitch / r)`).
- `stamped(draw)` draws the cell once into a template `Geometry(32)` about its origin (state `k`, `jk`, `jpri` from the
  parent; `t`, `cat`, `unit` zero/-1) and returns a function that appends one STAMP per copy. Copies are an explicit
  list, not a lattice descriptor: the per-copy `t`, `cat`, `unit` and the truchet's choice of template are layout code,
  and copies are ~10x fewer than stones, so a list is as good for the GPU (one buffer) and keeps layouts unchanged.
- Heavy layouts keep their `Geometry` per group in the pattern cache on an anchored box (`pattern.js geometryOf`,
  replacing `Drawing`); others draw into one scratch `Geometry`.

# The engine (`Candidates.lay`)

Per item, each on its own:

- POINT, KEY: place through the map, clip, (KEY: first at its rounded cloth place wins), push.
- LINE: the old free-line walk (`lineTo`/`lineStep`), stones every `gap x` size step, `rest` carried along the line.
- RUN: vertices through the map (a bent pattern's straight steps walked in up to 64 pieces), cumulative length, then the
  old `layRun`: all one size -> a whole number in closed form; sizes that vary -> walked stone by stone at the sizes
  asked, then stretched to fill. **Kept sequential per run** (parallel across runs): runs are short (a flower-of-life arc
  3-8 stones), and the walk is what keeps "never closer than the two real, dithered sizes ask". This refines Phase 3
  step 1 of the plan (its per-slot running total spaces by the continuous size, so a stone dithered one size up could
  crowd its neighbour and the parallel rule would then drop it, leaving gaps in lines; Gem Test 3 has `gap` 1).
- STAMP, nothing varying by place (no distortion, no size modifier): the template is laid once per `lay` about its origin
  through the map's linear part; each copy is its stones moved (`stampFast`, unchanged from the old pen).
- STAMP under a distortion or size modifier (**new**: the old pen drew every copy afresh): each copy lays the template's
  items moved (`layStamp`, stamp mode `this.h >= 0`). Ranks are a plain copy's (`stampRank`: the cell's rank, as
  `fround`, moved by the copy's `placeHash`; joints into the first 40%), so a size modifier changes sizes and spacing,
  not which stones a density keeps. Joints and stops use the plain copy's arithmetic (`cellPlace`: copy origin +
  `fround` of the cell place; a stop's hash from the cell vertex through the linear map), because joints shared between
  copies are merged by rounding their cloth place to 0.2 mm and a different sum rounds differently (scales: a stop at
  7.5 mm sits on a hash-cell half; truchet: shared joints).

# Verification

- **Golden comparison** (scratch script `golden.mjs`, not committed): `patternCandidates` of every gallery preset x
  {plain, size modifier linear 1 -> 0.6, twist 0.6 + waveA 4 mm with navette stones, moved/scaled/turned/stretched
  plane with navettes} = 568 cases, old tree (commit 9189ff3) against new, fresh cache per case. Identical (all nine
  arrays within 1e-7) except: (a) the size-modifier case of stamped layouts (rank semantics changed, so dithered sizes
  and counts differ by under 1%); (b) ranks only, under a twist, for stamped layouts (same reason); (c) quasicrystals:
  an old replay bug (below), confirmed by patching it in the old tree, after which they match.
- Tests (`app/test/patterns.test.js`, 122 passing): a geometry laid by two engines gives the same stones; copies under a
  size modifier that changes nothing give exactly the plain copies' stones, ranks and sizes (7 stamped presets; the
  pattern is put off round numbers with `px`, `py`, since stones exactly on the drawn box's edge go either way on float
  noise); a twisted pattern reaches every corner of the piece.
- In the app (test tab, Gem Test 3, 14 000 stones): no console errors; a move step 4.9 ms median, a spacing step 23.5 ms
  (edit + one `Viewport.frame`, synchronous: the pane was hidden), as before.

# Old bugs fixed on the way

1. **A twisted pattern lost its corners**: `pattern.js boxOver` took the pattern-space box of the piece's corners plus
   `distortionReach`, which has no term for a twist; a twist turns each ring by its own angle, so the preimage of the
   piece is the whole disc through its furthest corner. Now the box is that disc when `P.twist` is set.
2. **Heavy layouts' replay lost a joint size**: `Drawing.seg(..., jkB)` recorded the op but not `jk = jkB` in its own
   state tracker, so the next `E.jk = x` equal to the tracker's old value emitted no state op and the replay kept
   `jkB`. Only quasicrystal edges used `jkB` in a heavy layout (2-3 stones of ~9 500 differed). Gone with `Drawing`.

# Timings (node, flat piece, Gem Test 3's flower of life, `patternCandidates` only)

| case | old | new |
|---|---|---|
| plain, 25-38 k candidates | 1.5-1.7 ms | 1.4-1.9 ms (warm) |
| with its size modifier (`sizeTo` along), 28-41 k | 15.7-21.8 ms | 18.4-24.6 ms |

The size-modifier case is the stone-by-stone walk (`runSize` and the modifier stack, 3 size evaluations a stone), not
the drawing: the template removed the per-copy arc tessellation but the walk dominates. The GPU port (Phase 3) is where
this gets fast; on the CPU it is the twin.

# Open for Phase 3

- **Joint merging by rounding** (`fresh`: a `Set` of rounded cloth places) is sequential and order-dependent. On the GPU:
  joints owned by one copy (the template marks which stops it owns, e.g. by half-open cell bounds), or a hash of the
  rounded place with the lowest item index winning (an atomic min per slot).
- Points by formula (scatter's blue-noise tile, phyllotaxis, primes, halftones) are still explicit POINT lists drawn on
  the CPU; a source item (kernel id + parameters, expanded by index) is the GPU form. Fractals as points by index and
  the worker are not done.
- The edge rows (`edgelines`) still trace lines of equal distance by marching squares (kept by the owner); an outline
  offset is the GPU-friendly form.

[^plan]: [WebGPU renderer and one GPU stone engine](/product/roadmap/webgpu-and-stone-engine-plan.md), Phase 2.
[^code]: `app/src/stones/geometry.js`, `app/src/stones/candidates.js`, `app/src/stones/pattern.js`.
