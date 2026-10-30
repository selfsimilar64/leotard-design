---
type: Architecture
title: Procedural stone patterns
description: "A stone group as a live procedure on the flat cloth of one piece: an arrangement (48, offered as 123 named starting points), a move/turn/scale frame with on-body handles, a gradient driving density, size and colour, and distortions; re-run in a few milliseconds per frame of a drag, with stones that stay put as the pattern thins."
tags: [architecture, stones, crystal, procedural, patterns, performance, handles]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-30T14:30:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-30 (Claude Code session)
    title: "Edit a gemstone group live: gradients, lattices, phyllotaxis, wallpaper groups, on-screen handles"
    author: human:mattj
  - id: code
    resource: "app/src/stones/ (pattern.js, cloth.js, candidates.js, fields.js, layouts*.js, generators.js, view.js), app/src/render/gizmo.js, app/src/render/engine.js, app/src/ui/PatternPanel.jsx, app/src/ui/tools.js; test: app/test/patterns.test.js"
    title: Stone pattern source
    author: claude-code/claude-opus-5-5
  - id: flatten
    resource: /engineering/app/pattern-pieces-and-flattening.md
    title: Pattern pieces and flattening
  - id: decision
    resource: /decisions/2026-10-30-procedural-stone-patterns.md
    title: Stone groups are live procedures on the flat cloth
  - id: rules
    resource: /domain/embellishments/stone-placement-rules.md
    title: Stone placement rules
  - id: debruijn
    resource: https://en.wikipedia.org/wiki/Penrose_tiling
    title: "Penrose tiling (de Bruijn's pentagrid)"
  - id: wallpaper
    resource: https://en.wikipedia.org/wiki/Wallpaper_group
    title: Wallpaper groups
  - id: vogel
    resource: https://en.wikipedia.org/wiki/Fermat%27s_spiral
    title: "Fermat's spiral (Vogel's model of phyllotaxis)"
---

# Takeaway

A stone group of kind `pattern` is a procedure, not a pile of stones. It lies on the **flat cloth** of
one piece, is re-run from its record whenever anything about it changes, and costs a few milliseconds:
dragging a handle or a slider moves the stones in the same frame, on the group's own undo step.[^owner]
Everything below serves two aims: it must be fast enough for every frame, and stones must not
shimmer (a stone kept at 40% density is still kept at 60%, in the same place).

| Stones | Before (`fill`, every group re-run) | Pattern (one group re-run) |
|---|---|---|
| about 6,300 (scatter, gradient handle) | about 300 ms per edit | 7 ms median |
| about 10,600 (hexagonal lattice, moving) | not measured | 8 ms median |
| about 10,900 (Penrose tiling, moving) | not measured | 8 ms median |
| about 12,000 | 610 ms per edit | |
| about 12,850 (p6m wallpaper, turning its motif) | not measured | 16 ms median |

Measured 2026-10-30 in the app on the owner's laptop (i7-9750H), warm, command plus stones plus instance
buffers, without the GPU's draw; p90 within a millisecond or two of the median. The panel's redraw adds
about 5 ms to a frame; the first opening of a gallery family 30 to 75 ms, once.

# The record

```jsonc
{ "id": "g1", "kind": "pattern", "on": { "panel": "p1" }, "name": "Linear fade", "seed": 13,
  "stone": "Crystal AB", "colourRamp": null, "shape": "round", "mirror": "none", // side, pair: doc/symmetry.js
  "params": {
    "layout": "scatter", "preset": "fade-linear", // the arrangement, its gallery entry, its own parameters
    "x": 0, "y": 0, "rotate": 0, "scale": 1, "flip": false, // on the flat piece: metres from its middle, degrees
    "symmetric": false,                     // keep the wearer's left half, mirror it (a piece across the centre)
    "gradient": "linear", "ga": [0, 0.2], "gb": [0, -0.2], "gpower": 1, "greverse": false, "gseed": 0,
    "densityFrom": 1, "densityTo": 0, "size": "ss12", "sizeTo": null, "sizeBy": "gradient",
    "colourBy": "gradient", "sizeB": null, "mix": 0.3,
    "twist": 0, "bulge": 0, "bulgeR": 0.08, "waveA": 0, "waveL": 0.06, "warp": 0, "warpL": 0.08, "jitter": 0,
    "gap": 1.2, "margin": 0, "keepOut": null, "turn": "follow", "stoneTurn": 0 } }
```

`ga`, `gb` are absent until a handle is dragged; then the default is worked out from the piece
(`defaultGradient`). The commands are the ordinary `stones.add` and `stones.set` (`params` merge, a
`gesture` id makes a drag one undo step), and `stones.release` freezes a pattern into single stones.

# Why the flat cloth

Stones are pressed on flat pieces before the garment is sewn,[^rules] and the piece's flat shape
already exists for the fabric's UVs: near-isometric, in metres, grain up +v, origin at the piece's
middle.[^flatten] It is the only space where a lattice stays a lattice wrapped round the side of the
body (the older `lattice` generator projects through a best-fit plane, which squeezes stones at the
sides). `stones/cloth.js ClothPiece` answers both ways, with no search of the body:

- flat point to surface point: a uniform grid over the piece's triangles, then barycentrics; about
  100 ns.
- `uvOf`, surface point to flat point: for the handles (one per pointer event).
- `angleOf`: a direction on the cloth as a stone's angle on the body (per-triangle Jacobian into the
  frame stones turn in, `generators.js angleAt`, `view.js`).
- `edgeAt`: distance on the cloth to the piece's nearest edge, seams and openings alike. A raster of
  exact distances to boundary segments (closest segment swept across it, 8SSEDT style), read
  bilinearly; built on first use. It keeps stones from straddling seams (rule R10[^rules]) and feeds
  the `edge` gradient and the `edgelines` layout.

A piece with `mirror: 'both'` carries a pattern on its seed's cell; the other side is that pattern's
mirror image. `mirrorFast` (`stones/cloth.js`) gives the same answer as `mirrorSP`
(`curves/points.js`), within 0.6 mm by test, in about 1 microsecond instead of a BVH search: the mirrored point is
walked to from the memoised mirror face of its face, or a neighbour's. Measured: the mesh is
symmetric to a mean of 0.1 mm per face, worst 3.4 mm, so a per-face table alone is not exact.

# The pipeline (`stones/pattern.js runPattern`)

Per candidate, cheapest test first:

1. **Candidates** (`stones/candidates.js`, flat typed arrays): position in the pattern's own space,
   `rank`, `angle`, `t` (how far along the pattern), `k` (size factor), `cat` (family). A line layout
   walks a pen that drops one stone every `pitch` (stone diameter x `gap`, divided by the pattern's
   scale so that stones stay the same distance apart at any scale). Layouts flagged `heavy` (Voronoi,
   quasicrystals, fields, flow, bubbles) keep their candidates between frames while only the frame
   changes and the box stays inside what was made.
2. **Distort** (`fields.js distortion`): twist, bulge, ripple, organic warp, jitter, in pattern space.
3. **Place** on the cloth: flip, scale, rotate, translate; off the piece's box: rejected.
4. **Density**: `rank < densityFrom + (densityTo - densityFrom) * t`, so thinning nests.
5. **Size**: from `size` to `sizeTo` along the gradient (or along the pattern), times `k`, snapped to the
   sizes stones are sold in (`library.js SS`). Stones never scale with the pattern.[^rules]
6. **Edge**: `edgeAt` against radius + `margin`; within 3 cm of an edge, also the trim's keep-out
   (`Engine.edgeKeepOut`, the same as every other stone).
7. **Dart** (layouts flagged `dart`): kept clear of those accepted before it, by a hash on the cloth;
   bigger stones go first so a mixed-size pavé keeps its room.
8. **Triangle**: the surface point, its reference position, its angle, its colour (a ramp is dithered
   between stops by a per-stone hash, so an ombre has no hard line; round stones take a hash turn so
   their facets differ, and keep it).

Scatter candidates come from a tile of points on the torus built once by dart throwing at radii
falling by root 2 (`layouts-lattice.js blueTile`): any first share of the tile is evenly spread, so
rank thins it evenly. Lattices rank by a low-discrepancy function of their indices (R2 sequence).

# Making the rest of the path live

- `generators.js runStones(doc, ctx, cache)`: each group's stones are kept against its JSON and a
  geometry revision. Editing one group costs that group and the final pass; nothing changed returns
  the last result. The final pass (on fabric, apart from earlier stones) uses a cell hash over typed
  arrays, probing only the cells a stone can reach given the biggest stone so far (the string-keyed
  `Map` over 27 cells it replaced was most of a `fill`'s time).
- `Engine.syncStones(doc, touched)`: `edgeKeepOut` and the geometry signature are rebuilt only when
  curves, panels, straps, trims or layers are touched. A gesture only flags the stones dirty; they run once per
  frame, in `viewport.onFrame`, before the draw.
- `StoneView`: an instanced mesh per cut, kept and refilled, not rebuilt: about 0.2 ms per 1,000 stones.
  Per-stone randomness (`s.r`) is a hash, not a sequence, so a stone keeps its sparkle when others come
  and go. `ensurePlaced` makes the picking vectors only when next asked for.
- A piece whose flat shape has not arrived yet (flattening runs in a worker, 0.2 s): the group waits in
  `Engine.stonePending`; `GarmentView.onFlat` sets the stones dirty.

# Handles (`render/gizmo.js`, `ui/tools.js`)

A chosen pattern, in Select, shows a ring on the cloth with a knob to move it, one to turn it (Shift: 15
degree steps) and one to scale it, and the gradient's two ends. Every gradient shape is set by the same two
points. Lines draw only where they lie on the piece; a knob whose point lies past the edge stays at the
edge, and dragging is relative to where it was grabbed so nothing jumps. Off the piece, the pointer is
carried on from its last good point by the cloth's screen Jacobian. On a pair, the mirror image's knobs show
dimmer and work too; with Mirror off the first move splits the group, as for any edit
([the Mirror toggle](/engineering/architecture/mirror-toggle.md)); `flipPatternParams` flips a pattern for
its other half when the two halves live on two pieces.

# The arrangements (`stones/layouts*.js`)

| Family | Arrangements |
|---|---|
| Scatter | pave (mixed sizes), clusters, meteor shower, stardust, galaxy |
| Lattices | grid, hexagonal, brick, diamond grid, trellis (2 to 6 directions, node stones), repeating motif |
| Lines | stripes, waves, chevrons, ogee, plaid, fish scales, interlocking circles (flower of life), Truchet maze, random diagonals, rings along the edge |
| Tilings | 11 edge tilings (windowpane, triangles, honeycomb, star of David, tumbling blocks, Cairo, octagons, harlequin, basket weave, herringbone, Greek key), quasicrystals by de Bruijn's multigrid (Penrose at 5, Ammann at 8, any fold)[^debruijn], star and strap by Hankin's polygons in contact, Voronoi |
| Symmetry | all 17 wallpaper groups with a choice of motif, its size, place and turn[^wallpaper]; a test proves each group is rigid and closed |
| Spirals | phyllotaxis by Vogel's model[^vogel], with prime, twin prime, square and Fibonacci-multiple seeds; Sacks prime spiral; Ulam primes; spiral arms (power opening, so Archimedean and Fermat); nautilus |
| Radial | rings, sunburst, rosette, rose curves, guilloche, string art, whirl |
| Fields | contour map, Chladni figures, wave interference (quasicrystal waves), labyrinth, two ripples, flow lines: lines of equal value by marching squares, chained and laid with the pen |
| Fractals | 10 grown curves (Hilbert, Moore, Peano, Gosper, dragon, Levy, Koch, arrowhead, terdragon, square), 5 dusts, Apollonian gasket, bubbles |

The gallery (`layouts.js GALLERY`) is 123 named starting points over these, each picture drawn by the
pattern's own code (`ui/PatternPanel.jsx thumbOf`). `cat` makes any of them two- or many-coloured with
"Colours follow: its families" (a checker on a grid, three colours on a hexagonal lattice, the sunflower's
spirals, the orbits of a wallpaper group).

Any arrangement takes any gradient and any distortion, so the families multiply: a hexagonal lattice with a
radial size gradient is a halftone; with a bulge, an op-art lens; a Penrose tiling can fade out in a spiral.

# Limits

- A pattern lies on one piece (and its mirror image): it does not run across a seam. Rule R10.[^rules]
- The flat map's stretch is about 6% mean (more at the extremes), so a stone's real neighbours can sit a
  little closer than laid out; the final pass (0.92 of touching) drops any that collide. Lattices tighter than
  about 1.1 x the stone's diameter show holes for this reason. A pattern with a `spacing` scales down only as far
  as its stones touch (`minScale`).
- A bright curved band in a dense scatter is the studio light catching crystals of one orientation, not
  a denser placement (checked 2026-10-30: stones per flat cell are uniform, the flat map symmetric).
- Candidates stop at 150,000 per group (`MAX_CANDIDATES`).
- Older kinds (`row`, `fill`, `scatter`, `lattice`, ...) stay as they were and now run per group; `fill` costs
  its own hundreds of milliseconds. The Rows & fills tool makes patterns for a piece. Rows along a line
  remain the older generator.

[^owner]: Owner's brief, 2026-10-30
[^code]: Stone pattern source
[^flatten]: Pattern pieces and flattening
[^decision]: Stone groups are live procedures on the flat cloth
[^rules]: Stone placement rules
[^debruijn]: Penrose tiling
[^wallpaper]: Wallpaper groups
[^vogel]: Fermat's spiral
