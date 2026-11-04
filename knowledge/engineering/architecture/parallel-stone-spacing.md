---
type: Experiment
title: Stones kept apart by a parallel rule
description: "Experiment of 2026-11-04: instead of letting a pattern's stones overlap, resolve conflicts between candidates by a fixed order in parallel rounds (a shader's way). Same stones as the old one-by-one check, zero overlaps, moves as fast as the overlap version. Behind a switch, off."
tags: [stones, patterns, gpu, performance, experiment, spacing]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T19:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-04 (Claude Code session)
    title: "Try the parallelized maximum approach; compare visually and for speed against the current overlap version and the one before; on patterns a shader approach can capture, like the flower of life"
    author: human:mattj
  - id: gpu
    resource: /engineering/architecture/gpu-stone-placement.md
    title: Stone patterns placed on the GPU
  - id: code
    resource: "app/src/stones/peaks.js, app/src/stones/pattern.js keepPattern (opts.peaks, opts.parallel), app/src/render/engine.js stoneCtx.peaks"
    title: Parallel rule code
    author: claude-code/claude-opus-5-5
---

# Takeaway

A pattern's stones can be kept apart without the one-by-one check and without giving up the live preview: work out once,
when the candidates are drawn, which candidates conflict (closer than their sizes allow), give every candidate a fixed
standing (the old check's order: joints and nodes first, a scatter's big stones first), and keep a candidate when no kept
candidate above it conflicts with it. Resolved in parallel rounds (each candidate decided from the last round's states:
in once all its blockers are out, out once one is in) it ends with exactly the stones the sequential check kept. On 25
presets it reproduces the stones of the version before 2026-11-04 (commit d451a97) with zero overlaps, and a move costs
what the overlap version costs. **Off** (`engine.stoneCtx.peaks = false`) until the owner chooses.[^owner]

# How

- `stones/peaks.js` conflictsOf: for a candidate set (cached with it, keyed by its arrays, so moves and turns reuse it):
  the order (stones/pattern.js used it before 2026-11-04: a `dart` layout by size, biggest first, else by `P`, then as
  drawn), a cell grid as big as the biggest reach, and per candidate a CSR list of the candidates above it closer than
  `((d1 + d2) / 2) x clear` (0.92, or `gap` for dart layouts). Distances in the frame's own space, which a rigid move keeps.
- `keepPattern(..., { peaks: true })`: the keep test (density, room, keep-out) marks candidates alive (no scatter share
  thinning: the conflicts space a scatter, as before), then `resolvePeaks` keeps them: down the order once, or with
  `parallel: true` in rounds (the GPU form; `resolvePeaks.rounds`).
- Rounds needed: 1 where nothing conflicts, 2-3 on flower of life, circles, scales, tilings, wallpaper, guilloche; 8 on a
  mixed scatter; 15 on rings with spokes and 23 on sunburst (chains of stones each blocking the next along a spoke).

# Results (2026-11-04)

Offline, flat 0.4 x 0.6 m piece, 25 presets (`scratchpad compare.mjs`, old code from `git archive d451a97`):
stone counts of the parallel rule equal the old version's on all but wallpaper p6m (13 840 against 13 842), overlapping
pairs 0 everywhere (overlap version: flower of life 3 636, circles 8 880, scales 1 554, wallpaper p6m 2 726, guilloche
755, scatter-mixed 1 256, a few on ogee, trihex, stars, rose, sunburst, rings). Move per step (keep test only): flower of
life old 6.0 ms, overlap 1.13, parallel 1.03 (rounds 1.23); redraw after a spacing change: old 7.0, overlap 2.8, parallel
9.7 (the conflict grid, 6-7 ms more; 38 ms on scatter-mixed, whose big stones make the grid's cells big).

In the app, Gem Test 3 (flower of life on the drawn front), one edit a frame, median (90th percentile) ms:

| | old (d451a97) | overlap | parallel |
|---|---|---|---|
| stones | 14 148 | 17 706 | 14 048 |
| move, 3D | 36.5 (61.8) | 16.6 (18.1) | 16.7 (17.6) |
| move, Both | 36.6 (42.1) | 16.6 (18.9) | 17.6 (27.6) |
| turn, Both | 41.9 (61.0) | 17.7 (23.7) | 17.6 (25.0) |
| spacing, Both | 37.5 (42.8) | 37.5 (42.1) | 47.5 (56.0) |

(14 048 against 14 148: the keep-out by raster, `gpu-stone-placement.md` stage 3, not the parallel rule.) Contact sheet of
flower of life, circles, scales, wallpaper p6m, guilloche and a mixed scatter in the three versions: `screenshots/
spacing-compare.png` (not committed).

# At higher stone counts (2026-11-04, later)

The table above is in frames (one edit a frame, the time between frames), so anything under one 60 Hz frame reads 16.7 ms.
Measured again as main-thread work per step (the edit, plus `Viewport.frame` timed by a wrapper: stones laid, both views
painted, the 3D frame submitted), Gem Test 3 in Both, the flower of life made denser (stone size, spacing), median ms:

| size, spacing | stones old / overlap / parallel | move old / overlap / parallel | spacing drag old / overlap / parallel |
|---|---|---|---|
| ss4, 37 mm | 14 148 / 17 706 / 14 048 | 28 / 8 / 8 | 29 / 23 / 39 |
| ss4, 24 mm | 19 548 / 25 547 / 19 416 | 40 / 11 / 10 | 40 / 39 / 59 |
| ss3, 16 mm | 26 240 / 40 022 / 26 029 | 61 / 14 / 15 | 78 / 58 / 108 |
| ss3, 11 mm | 27 798 / 57 277 / 27 604 | 136 / 19 / 16 | 102 / 86 / 128 |
| ss3, 8 mm | 26 246 / 56 275 / 26 057 | 127 / 17 / 16 | 133 / 122 / 166 |

- Moves: the overlap and parallel versions stay at 8-19 ms of work up to the densest; the old one-by-one path grows to
  ~130 ms (7 fps). The parallel rule's per-frame step stays negligible.
- Kept stones level off near 27 000 with the old check and the parallel rule (the lines cannot hold more without
  touching); the overlap version keeps piling them on (57 000), the candidates still growing underneath.
- Arrangement changes (the spacing drag) grow with the candidates in every version; the parallel rule is the slowest
  (its conflict list built each time: +16 to +50 ms over the overlap version). The candidates' drawing is the cost to cut
  next (a worker, or lattice layouts generated on the GPU), with a faster conflict grid.
- The 3D frame itself (`Viewport.benchmark(10)`, GPU included, whole scene at the pane's size) was 9-16 ms at every
  density: stones barely move it, and it is what holds dense moves at 40-60 fps.

# Open

- The conflict grid makes arrangement changes ~7-10 ms slower (38 ms on a mixed scatter): a grid per size class, or a
  sort-based grid, would cut it.
- On the GPU, the rounds would be one pass each over a fixed conflict list; at these sizes the CPU's single pass
  (well under a millisecond) is quicker than a GPU round trip, so it stays on the CPU unless counts grow by tens of times.
- Choosing it would supersede [stones may overlap](/decisions/2026-11-04-stones-may-overlap.md) for patterns (the
  preview stays the design: the rule runs every frame).

[^owner]: Conversation with the product owner, 2026-11-04.
