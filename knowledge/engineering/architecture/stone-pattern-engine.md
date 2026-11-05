---
type: Component
title: One stone engine for every pattern (proposal)
description: "Proposal of 2026-11-04: split every stone pattern into a small description of its geometry (points, runs of line and arc pieces, areas, optionally tiled) and one shared, data-parallel stone engine (spacing by size along runs, per-stone fields, the parallel rule, piece and body). Classes of layout, what each costs, and the order to build it in."
tags: [stones, patterns, gpu, performance, architecture, proposal]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T21:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-04 (Claude Code session)
    title: "Model all patterns as shaders where it makes sense; a holistic system for artistic freedom, ease of use and performance across the board; slower or non-shader paths acceptable for classes unsuited to it; big picture first, then tuning"
    author: human:mattj
  - id: gpu
    resource: /engineering/architecture/gpu-stone-placement.md
    title: Stone patterns placed on the GPU
  - id: peaks
    resource: /engineering/architecture/parallel-stone-spacing.md
    title: Stones kept apart by a parallel rule
  - id: spec
    resource: /engineering/architecture/procedural-stone-patterns.md
    title: Procedural stone patterns
---

# Takeaway

**Built in part, 2026-11-05**: the geometry description and the engine (build order 1 and 2 below) are in, see
[the stone engine's geometry](/engineering/architecture/stone-geometry.md); the traced-contour family in the table below
was removed. What follows is the proposal as written.

Today each of the ~45 layouts both makes its geometry and lays its stones through one sequential pen (`stones/candidates.js`):
stone spacing, sizes, keystones and the parallel rule are entangled with each layout's drawing. Proposal: a layout only
**describes geometry**, in a small intermediate form; one **stone engine** turns any such description into stones with
per-element (shader-shaped) steps. Geometry is 10-100x smaller than the stones on it, so even where geometry stays on the
CPU, the per-stone work is shared, parallel and fast. **[INFERRED]** design, not built.[^owner]

# The geometry description (what a layout emits)

- **Points**: positions with attributes (t, family, own size factor k, priority, direction). One stone each.
- **Runs**: chains of pieces (line segment, circular arc; a polyline for general curves) between **stops**; a stop may carry
  a keystone (its own size factor, priority). Today's rule kept: a whole number of stones fills a run exactly.
- **Areas**: a scalar field over the cloth plus a point source (lattice or the ranked blue-noise tile) and a threshold or
  size mapping (halftone, fills, gradients).
- **Tiling** (wrapper): any of the above for one cell, plus lattice vectors (and, for wallpaper groups, the cell's symmetry
  operations). The engine tiles by index: slot -> (cell i, j, item) -> position. Random per-cell choices (truchet) come from
  a hash of the cell index.

All of it in the pattern's own frame (stones/pattern.js rigidOf), so moves and turns never touch it.

# The stone engine (every step per element, no element waits on another)

1. **Per run**: sample the size field along it (fixed count, e.g. 64), keep the running total of `length / (gap x size)`;
   stones = round(total) (keystones at stops counted).
2. **Per stone slot** (run, k): position where the running total reaches k/n of it; direction = the run's tangent; size =
   the field there, snapped to a sold size by the stone's own random (`ditherSize`); colour, density, angle from the
   modifiers (already per-stone pure functions, `stones/modifiers.js`). Points and area samples skip step 1.
3. **Parallel rule** (`stones/peaks.js`): neighbours by a spatial hash (or, tiled, by cell offset), real sizes; rounds until
   settled (1-3 for most presets, up to ~25 on radial spokes).
4. **Piece**: room and keep-out rasters (`keepPattern`), symmetric / side / erase filters.
5. **Body**: per-piece atlases (`stones/gpu-view.js`), already on the GPU.

Outputs per pattern: packed arrays (as `keepPattern` now), so counts, the stone list, the flat view and export read them.

# Layout classes (2026-11-04 survey of `stones/layouts-*.js`)

| class | layouts | geometry made | geometry change costs |
|---|---|---|---|
| Tiled | grid, hex, brick, diamonds, motifs, stripes, waves, chevrons, ogee, trellis, plaid, circles (flower of life), scales, truchet, tenprint, 11 tilings, 17 wallpaper groups, star tilings | one cell, CPU, tiny | ~nothing: the engine tiles |
| Point sets by formula | scatter and fades (tiled blue noise), clusters, galaxy, stardust, phyllotaxis, prime spirals, Ulam, fractal dust, halftones | per index, closed form | ~nothing |
| Finite analytic curves | rings, sunburst, mandala, rose, guilloche, string art, whirl, spirals, nautilus, meteors | CPU runs, hundreds to thousands of pieces | small |
| Recursive or aperiodic | grown curves (L-systems), Apollonian gasket, quasicrystals, Voronoi | CPU (worker), cached | moderate, once per change |
| Field contours, streamlines, packing | contours, Chladni, wave interference, labyrinth, ripples, edge lines, flow lines, bubbles | CPU tracing (worker); marching squares is parallel, chaining it into runs is not | slowest; accepted |

The tiled and point classes hold most presets (about 100 of ~140) and become near-free to reshape.

# Where the steps run

- The shape of every step is a shader's (one element, fixed inputs). Readers of the results (counts, bill of materials, the
  flat view, picking, export) are on the CPU, and WebGL2 has no compute shaders (each step a full-screen pass, prefix sums and
  compaction in several passes, readbacks that stall).
- Measured costs on the CPU are already small when the work is per element over typed arrays: drawing 104 000 candidates
  6 ms, the keep test 2-6 ms for 20-75 thousand. The slowness found was structural: per-stone records, body searches, a
  sequential pen falling back to per-cell drawing (a size modifier disables `stamped`), the conflict list in a `Map`.
- So: write the engine's steps as pure kernels over typed arrays, run them in a worker (the main thread only uploads), keep
  the body placement on the GPU. Move the kernels to GPU compute (WebGPU) when the renderer moves to it or counts pass
  ~200 000; the JS kernels stay as the reference twin for tests.

# What it opens

- Every modifier on every pattern, size gradients along any line with even packing, keystones anywhere a run stops.
- New geometry sources at no engine cost: lines the designer draws, imported outlines (SVG, lettering), motif libraries.
- Several geometries in one pattern (a tiling over a field, rings around motifs), one parallel rule across them, so groups
  stop overlapping each other too.
- Live preview equals the result at every step (decision of 2026-11-04 on the preview; the parallel rule chosen by look).

# Build order

1. The geometry description and the engine as JS kernels; the pen (`Candidates`) re-pointed to emit runs and points (its
   ops are close to this already: `Drawing` records them) so all layouts work on day one, unchanged.
2. Tiling as a wrapper: the stamped layouts emit one cell + lattice; check against today's stones (flower of life with and
   without its size modifier), measure the spacing slider.
3. Worker; per-class migration of the rest; heavy classes traced in the worker.
4. GPU compute port when warranted.

[^owner]: Conversation with the product owner, 2026-11-04.
