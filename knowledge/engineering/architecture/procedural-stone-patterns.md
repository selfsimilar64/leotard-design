---
type: Architecture
title: Procedural stone patterns
description: "A stone group as a live procedure on the flat cloth of one piece: an arrangement (48, offered as about 150 presets) with its own sizing, a frame that moves the whole of it, a stack of modifiers on density, size and colour, distortions, handles over the view specific to each kind; what the design hangs on is placed first, and everything re-runs within a frame of a drag."
tags: [architecture, stones, crystal, procedural, patterns, performance, handles, modifiers]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-30T14:30:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-30 (Claude Code session)
    title: "Edit a gemstone group live: gradients, lattices, phyllotaxis, wallpaper groups, on-screen handles"
    author: human:mattj
  - id: tuning
    resource: conversation with the product owner, 2026-10-30, second round (Claude Code session)
    title: "Tune it: dead sliders, handles not visible, move the mask not the stones, modifiers, built-in sizing, gaps at corners"
    author: human:mattj
  - id: code
    resource: "app/src/stones/ (pattern.js, modifiers.js, handles.js, candidates.js, cloth.js, fields.js, layouts*.js, generators.js, view.js), app/src/render/gizmo.js, app/src/render/engine.js, app/src/ui/PatternPanel.jsx, app/src/ui/tools.js, app/src/ui/kit.jsx; dev: app/src/dev/pattern-eval.js; test: app/test/patterns.test.js"
    title: Stone pattern source
    author: claude-code/claude-opus-5-5
  - id: flatten
    resource: /engineering/app/pattern-pieces-and-flattening.md
    title: Pattern pieces and flattening
  - id: decision
    resource: /decisions/2026-10-30-procedural-stone-patterns.md
    title: Stone groups are live procedures on the flat cloth
  - id: decision2
    resource: /decisions/2026-10-30-stone-pattern-modifiers-and-keystones.md
    title: Patterns have a frame, stacked modifiers and keystones
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
What it is made of:

- an **arrangement** (`layout`, its parameters), which gives its stones their own sizes where that serves the
  design, and puts a stone on whatever the design hangs on (corners, centres, crossings);
- a **frame** (`x, y, rotate, scale, flip`): where the whole of it lies. Moving the frame moves the stones and
  everything on them, rigidly;
- **modifiers** (`mods`): a stack, each a field over the piece or over the pattern, each acting on density, size or
  colour, each in the frame with its own place, size and handles;
- the arrangement's **plane** inside the frame (`px, py, pturn, pscale, sx, sy`), last in the panel: this shifts the
  crystals under the modifiers, which stay;
- **distortions** of the whole arrangement, and the crystal itself.

Three rules hold it together: it must be fast enough for every frame; a stone must not shimmer (kept at 40%
density, it is still kept at 60%, in the same place; a moved pattern's stones move rigidly); and every control
visible must do something, which a test checks for every preset.

| Stones | Before patterns (`fill`, every group re-run) | Pattern (one group re-run) |
|---|---|---|
| about 4,500 (linear fade) | about 280 ms per edit | 9 to 15 ms |
| about 5,300 (Penrose) | not measured | 11 to 17 ms |
| about 6,500 (hexagonal lattice) | not measured | 9 to 12 ms |
| about 8,100 (pave) | about 300 ms | 13 to 18 ms |
| about 13,500 (p6m wallpaper) | 610 ms at 12,000 | 21 to 28 ms |
| about 15,400 (flower of life) | not measured | 25 to 35 ms |

Medians over repeated runs on 2026-10-30 in the app on the owner's laptop (i7-9750H), warm, command plus stones plus
instance buffers, without the GPU's draw, and spread by what else the machine was doing. The first version of patterns
did about 8 ms at 10,000 stones: spacing stones on the cloth, placing keystones first and checking every pattern
for clearance cost up to about half as much again. The handles' own layout and projection add 2 to 5 ms; the panel's
redraw about 5 ms to a frame; the first opening of a gallery family 30 to 75 ms, once. `dev/pattern-eval.js` repeats these.

# The record

```jsonc
{ "id": "g1", "kind": "pattern", "on": { "panel": "p1" }, "name": "Linear fade", "seed": 13,
  "stone": "Crystal AB", "shape": "round", "mirror": "none", // side, pair: doc/symmetry.js
  "params": {
    "layout": "scatter", "preset": "fade-linear", // the arrangement, the preset it started from, and its own parameters
    "x": 0, "y": 0, "rotate": 0, "scale": 1, "flip": false, // the frame, on the flat piece; x, y absent: the piece's middle
    "symmetric": false,                     // keep the wearer's left half, mirror it (a piece across the centre)
    "px": 0, "py": 0, "pturn": 0, "pscale": 1, "sx": 1, "sy": 1, // the plane inside the frame
    "mods": [ { "id": "m1", "on": "density", "shape": "linear", "from": 1, "to": 0, "clip": true, "preset": true,
                "x": 0, "y": 0, "a": -90, "w": 0.5, "h": 0.4, "power": 1, "reverse": false, "feather": 0, "blend": "mul" } ],
    "size": "ss12", "gap": 1.15, "density": 1,  // the crystal
    "twist": 0, "bulge": 0, "bulgeR": 0.08, "waveA": 0, "waveL": 0.06, "warp": 0, "warpL": 0.08, "jitter": 0,
    "margin": 0, "keepOut": null, "turn": "follow", "stoneTurn": 0 } }
```

The commands are the ordinary `stones.add` and `stones.set` (`params` merge, `undefined` removes one, a `gesture` id
makes a drag one undo step), and `stones.release` freezes a pattern into single stones. A record from the first
version (`gradient, ga, gb, densityFrom, sizeTo, sizeBy, colourBy`, `colourRamp`) is read as modifiers
(`modifiers.js modsFromOld`), until an edit writes its `mods`.

**Presets** (`layouts.js GALLERY`): `pattern.js presetPatch` makes every parameter of the arrangement the preset's own,
so nothing lies over from the last one. It keeps where the pattern lies, the crystal (unless the last preset chose
that size, or this one does) and modifiers added by hand; those that came with a preset (`preset: true`) go with it.

# Why the flat cloth

Stones are pressed on flat pieces before the garment is sewn,[^rules] and the piece's flat shape
already exists for the fabric's UVs: near-isometric, in metres, grain up +v, origin at the piece's
middle.[^flatten] It is the only space where a lattice stays a lattice wrapped round the side of the
body. `stones/cloth.js ClothPiece` answers both ways, with no search of the body:

- flat point to surface point: a uniform grid over the piece's triangles, then barycentrics; about
  100 ns.
- `uvOf`, surface point to flat point: for the handles (one per pointer event).
- `angleOf`: a direction on the cloth as a stone's angle on the body.
- `edgeAt`: distance on the cloth to the piece's nearest edge, seams and openings alike. A raster of
  exact distances to boundary segments, read bilinearly; built on first use. It keeps stones from straddling
  seams (rule R10[^rules]) and feeds the `edge` modifier and the `edgelines` layout.

A piece with `mirror: 'both'` carries a pattern on its seed's cell; the other side is that pattern's
mirror image (`mirrorFast`, the same answer as `mirrorSP` within 0.6 mm by test, about 1 microsecond).

# Placement that keeps a pattern's essence

Why stones used to go missing at corners, centres and crossings, as measured on 2026-10-30:[^tuning]

| Cause | What it did | Now |
|---|---|---|
| Line stones sat between joints, none on them | A star's points and a tile's corners had no stone at all | A stop has its own stone (`key`, `begin(x, y, true)`, `corner`, `end`) |
| What the design hangs on was added last (a rosette's centre, a trellis's crossing, a tile's joint) | It collided with stones already there and was dropped, so "Stones at the crossings" did almost nothing | Candidates carry a priority (`pri`): keys first, coarser before finer, then lines, then fill |
| Collisions were judged on the body, at 0.92 of touching | The flat map shrinks by more than 8% over 5 to 15% of a piece (edge ratios measured per piece: p5 0.84 to 0.94), so at tight spacing every other stone of a line went | A pattern's own stones are kept apart on the flat cloth they are pressed on. On the body they are checked only against other groups and their own mirror side |
| A stretch's stones were rounded to the nearest whole number | Spacing could shrink to 0.75 of what was asked, so they collided | Rounded down, then spread to fill the stretch exactly |
| A pen walked a polyline with no regard to corners | A stone landed anywhere near a turn; another just past it collided | A run between two stops (`layRun`) |
| Crossing lines (trellis, plaid, flower of life) met at random phase, first come first served | One line kept its stones, the other lost a few, unevenly | The crossings are computed, each has a stone, and each stretch between is a whole number. A flower of life is regular: a half turn about a centre maps stones onto stones, by test |
| Distortions moved stones after they were spaced | A bulge pulled a line's stones apart here and into each other there | A line is walked on the cloth, through the distortion (`Candidates.step`) |

Two more things follow from the same changes. A whole motif (a heart, a ray) thins as one (`E.unit`), and what the
design hangs on thins last (a key's rank is below 0.4). And nothing crawls: a layout anchors its lines to whole periods
from the pattern's own origin (`ribbons`, `isolines`), so moving a pattern keeps each stone's place on it; a test moves
every preset and finds at least 97% of stones away from the edges exactly where they should be.

# The pipeline (`stones/pattern.js patternStones`)

1. **Draw, then lay** (since 2026-11-05, [the stone engine's geometry](/engineering/architecture/stone-geometry.md)): a
   layout's `make(P, G)` draws its geometry in the pattern's own space into a `Geometry` (`stones/geometry.js`: points,
   joints, free lines, runs between stops, copies of a cell), and one engine (`stones/candidates.js Candidates.lay`) lays
   it on the cloth, through `patternMap` (frame after plane, with the distortion). Each candidate has `X, Y`,
   `rank`, `A` (direction on the cloth), `T` (how far along the pattern), `K` (the pattern's own size), `D` (its real
   diameter), `C` (family), `P` (priority). Spacing along a line is `gap x (d1 + d2) / 2` for the two stones' real sizes
   at their places, so a tapering line, a size modifier or a stretch keep it packed. Layouts flagged `heavy` (Voronoi,
   quasicrystals, the field halftones) keep their geometry on an anchored box between frames and lay it again.
2. **Density**: `rank < density x modifiers`, so thinning nests. A `dart` layout's (scatter, clusters, stardust, galaxy)
   candidates come from the ranked blue-noise tile, spaced for its smallest stones (`fine`); a stone of diameter `d`
   keeps the first `(d0 x fine / d)^2` of them, those the tile spaced for its size (with the parallel rule off only: step 4).
3. **Edge**: `edgeAt` against radius + `margin`.
4. **Kept apart by the parallel rule (owner, 2026-11-04,
   [decision](/decisions/2026-11-04-pattern-stones-kept-apart.md)).** Every candidate that passes 1-3 is alive; a
   candidate is kept when no kept candidate above it in a fixed order conflicts with it (closer than 0.92 of touching, or
   `gap` for dart layouts), in rounds a shader can run, ending with the stones the old one-by-one check kept
   ([parallel rule](/engineering/architecture/parallel-stone-spacing.md)). The order: a dart layout by size, biggest
   first; otherwise by what the design hangs on (`P`: joints, nodes), then as drawn. The conflict lists are worked out when
   the candidates are drawn (a typed-array grid, one per size class on a mixed scatter), so a move or turn only re-runs the
   rounds, and the live preview during a drag is still the design. Patterns on one piece keep apart too: in the list's order, a later pattern's candidates
   that come within 0.92 of touching an earlier one's stones drop out before its own rule runs (`runStones`). Spacing still comes first from how layouts are made (lines walk `gap x` the stones' sizes,
   lattices draw at the spacing, scatters, clusters and galaxies take the blue-noise tile's first points); with the rule
   off (`opts.peaks: false`, tests and comparisons only) a dart layout's stone of diameter `d` keeps the first
   `(d0 x fine / d)^2` of the tile's points instead, and stones may overlap
   ([superseded decision](/decisions/2026-11-04-stones-may-overlap.md)).
5. **Triangle**: the surface point, its reference position, within 3 cm of an edge the trim's keep-out; its angle; its
   colour. Randomness (a round stone's spin, dithering, sparkle) comes from the rank, so it stays with the stone.

A size between two that are sold, from a modifier, is dithered between them (`ditherSize`), so a gradient has no hard
line; the pattern's own `K` snaps to the nearest (`realSize`).

Scatter candidates come from a tile of points on the torus built once by dart throwing at radii falling by root 2
(`blueTile`): any first share is evenly spread, so rank thins it evenly. Lattices rank by a low-discrepancy function of
their indices (R2 sequence); a run's stones by a golden-ratio sequence from a hash of where the run starts.

# Modifiers (`stones/modifiers.js`)

A modifier is a field giving a stone a value `t` in 0..1, and what `t` does:

| On | Does | Several |
|---|---|---|
| density | `from + (to - from) t`; with `clip`, no stones outside its bounds; `feather` fades the bounds | multiply, or add |
| size | a factor of the crystal's size, `from` to `to` (so the crystal's own size slider always matters); `clip`: no change outside | multiply, or add |
| colour | `stops` along `t`, dithered by `mix`; a `null` stop keeps what the stone has, so one can tint part of another | later over earlier |

The fields: linear and reflected (a box: `w` long, `h` wide, turned by `a`), radial, oval, diamond, square, sweep
(round shapes), spiral, waves, ripple, stripes, checks, clouds (a repeat length), from the edge (a depth on the piece),
and those that follow the pattern and have no place on the piece: along the pattern (`T`), by family (`C`), at random,
by crystal size (`K`). So a size can follow a linear ramp and a radial one together, colours can go ring by ring, and a
uniform thinning is a density at random.

A modifier lies in the frame, so it moves, turns and scales with the pattern. What has not been given a place starts
from the piece at the pattern's first scale (`modGeometry`). `flipPatternParams` only flips the frame: on a pair the
plane and the modifiers come along.

# The pattern's own sizes

The arrangements have sizes of their own, not only what a gradient lays over them. The candidates' `E.k` and the joints'
`E.jk` carry them, and the pen's spacing follows.

| Family | What drives size |
|---|---|
| Scatter | variety of sizes (few big, many small, big first); clusters, stardust and galaxies bigger at the heart; a meteor's taper and head |
| Lattices | every other (third) stone another size; a stone in a motif's middle, at its corners; crossings of a trellis |
| Lines | swell along a line, or on its crests; outer rows smaller; points of a chevron; joints |
| Radial | rings and rosettes that grow outwards; petals bigger towards the tip; rays that taper; polygons smaller inwards |
| Spirals | a sunflower's seeds grow and take the room they need (the next seed's distance follows the size here); a nautilus's stones grow with its radius; twin primes bigger |
| Tilings | joints; a Penrose corner by how many rhombs meet there; a star's points; a gem in each Voronoi cell, as big as the cell has room for |
| Wallpaper | taper along the motif, stones at its ends |
| Fields | a field as a halftone, a stone's size its strength |
| Fractals | the turns of a grown curve by the generation that made them; a dust's stones at every level, the first biggest; a gasket's stones the size of their circles |

# Making the rest of the path live

- `generators.js runStones(doc, ctx, cache)`: each group's stones are kept against its JSON and a
  geometry revision. Editing one group costs that group and the final pass; nothing changed returns
  the last result. The final pass (on fabric, apart from others) uses a cell hash over typed arrays; a pattern's
  stones skip it (kept as laid, neither giving way nor making others give way).
- `Engine.syncStones(doc, touched)`: `edgeKeepOut` and the geometry signature are rebuilt only when
  curves, panels, straps, trims or layers are touched. A gesture only flags the stones dirty; they run once per
  frame, in `viewport.onFrame`, before the draw; the handles are laid out right after them.
- `StoneView`: an instanced mesh per cut, kept and refilled, not rebuilt.
- A piece whose flat shape has not arrived yet: the group waits in `Engine.stonePending`.

# Handles (`stones/handles.js`, `render/gizmo.js`, `ui/tools.js`)

Handles are an SVG layer over the canvas, not part of the 3D scene: always on top of the crystals, untouched by bloom and
tone mapping, sharp, and with hit areas big enough for a finger. They do not hide with the editing lines (H), which is how
they had been lost; the view bar has its own switch for them. Each frame only what moved is projected; what faces away
from the camera does not show; knobs that would overlap are eased apart. `patternHandles(gen, piece, { focus, pxPerM })`
is pure: every knob has a `drag({ u, v, u0, v0, shift, alt })` returning the change to the record, and a `read` for the
bubble shown while it is held.

The drawing is regular shapes, not projected onto the body, at the owner's request: laid over the cloth, circles came out
as irregular loops. Each shape lies on a flat sheet (`gizmo.sheetOf`) that touches the cloth at the shape's middle, along
the cloth's two directions there, a metre of cloth being a metre on the sheet. So a circle is an ellipse from an angle and
a line edge-on from the side. A box's sheet also turns about the way the box runs, to face the view
(`gizmo.aim`), so it reads as a rectangle from anywhere round that line and squashes only when looked at along it.
A sheet more than a little past edge-on does not show. The outlines therefore no longer stop at the piece's edge or say
exactly where the crystals end on a curved body. The exception is From the edge (`cloth: true`), whose line only means
something on the piece. A drag goes by the sheet too, through a pixel-to-cloth map frozen when the knob is grabbed
(`gizmo.dragMap`); only Move knobs still go by the cloth under the pointer, because a shape's middle lies on it.

What shows depends on the focus (`ui/state.js patternFocus`; the panel's cards and Pattern positioning set it, and a dot
on the body picks a modifier):

| Focus | Handles |
|---|---|
| The whole pattern | A dial: move (drawn to the piece's middle line, Alt not), turn (Shift: 15 degrees), scale. And the arrangement's own grips (`layout.grips`): `along` (a spacing, as many spacings out as it takes to be easy to grab, with a tick for each), `radius` (a real circle, such as a rose's size), `point` (a fractal's square, a wallpaper motif dragged about in its cell) |
| A box modifier (linear, reflected) | Its rectangle (not cut off at its sides: solid ends, dashed sides); an arrow for its direction; start and end (each moves alone, the other stays; Alt: both), two sides, turn |
| A round one | Its outline, centre; one radius (radial) or two and a turn (oval, diamond, square); sweep: one knob for size and start |
| A repeat (waves, stripes, ripple, checks, clouds, spiral) | Centre, and one knob for its length and direction, out at as many repeats as it takes |
| From the edge | The line at its depth, and a knob on it |
| Pattern positioning | The plane's own dial: move, turn, scale, stretch |

An outline with bounds is a contour of `min(inside its bounds, inside the piece)` on a grid kept with the piece
(`handles.js contour`): where bounds run past the piece they follow its edge, so what shows is the shape the crystals fill.

Off the piece, the pointer is carried on from its last good point by the cloth's screen Jacobian
(`tools.js carryOn`). On a pair, the mirror image's knobs show dimmer and work too; with Mirror off the first move splits
the group, as for any edit ([the Mirror toggle](/engineering/architecture/mirror-toggle.md)).

# The arrangements (`stones/layouts*.js`)

| Family | Arrangements |
|---|---|
| Scatter | pave, clusters, meteor shower, stardust, galaxy |
| Lattices | grid, hexagonal, brick, diamond grid, trellis (2 to 6 directions), repeating motif |
| Lines | stripes, waves, chevrons, ogee, plaid, fish scales, interlocking circles (flower of life), Truchet maze, random diagonals, rings along the edge |
| Tilings | 11 edge tilings, quasicrystals by de Bruijn's multigrid (Penrose at 5, Ammann at 8, any fold)[^debruijn], star and strap by Hankin's polygons in contact, Voronoi |
| Symmetry | all 17 wallpaper groups with a choice of motif, its size, place and turn[^wallpaper]; a test proves each group is rigid and closed |
| Spirals | phyllotaxis by Vogel's model[^vogel], Sacks prime spiral, Ulam primes (which numbers they keep is the preset's: prime, twin prime, Fibonacci multiples), spiral arms, nautilus |
| Radial | rings (with spokes, a web), sunburst, rosette, rose curves, guilloche, string art, whirl |
| Fields | Chladni figures, wave interference, two ripples, each as a halftone (their traced lines, the contour map, labyrinth, flow lines and bubbles were dropped on 2026-11-05: decision 4 of the [WebGPU and stone engine plan](/product/roadmap/webgpu-and-stone-engine-plan.md)) |
| Fractals | 10 grown curves, 5 dusts, Apollonian gasket |

Each picture in the gallery is the real pipeline on a square of cloth (`ui/PatternPanel.jsx thumbOf`).

# Limits

- A pattern lies on one piece (and its mirror image): it does not run across a seam. Rule R10.[^rules]
- Where the flat map shrinks, stones laid touching on the flat cloth overlap a little on the render (up to about 15% at
  the worst 5%). They are pressed flat, so this is what the map does, not what the fabric would. A pattern with a
  `spacing` scales down only as far as its stones touch (`minScale`).
- Crossings are exact where the arrangement knows them. Free curves that cross themselves (guilloche, rose weaves, string
  art) still settle by first come, first served.
- A bright curved band in a dense scatter is the studio light catching crystals of one orientation, not
  a denser placement.
- Candidates stop at 150,000 per group (`MAX_CANDIDATES`).
- Older kinds (`row`, `fill`, `scatter`, `lattice`, ...) stay as they were and now run per group. The Rows & fills tool
  makes patterns for a piece. Rows along a line remain the older generator.

[^owner]: Owner's brief, 2026-10-30
[^tuning]: Owner's tuning notes, 2026-10-30
[^code]: Stone pattern source
[^flatten]: Pattern pieces and flattening
[^decision]: Stone groups are live procedures on the flat cloth
[^decision2]: Patterns have a frame, stacked modifiers and keystones
[^rules]: Stone placement rules
[^debruijn]: Penrose tiling
[^wallpaper]: Wallpaper groups
[^vogel]: Fermat's spiral
