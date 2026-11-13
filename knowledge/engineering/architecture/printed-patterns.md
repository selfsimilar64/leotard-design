---
type: Architecture
title: Printed patterns
description: "A pattern is made as crystals, as print on the fabric, or as both: 45 printed designs written as small shaders (about 175 presets), every crystal layout printable as line art, crystals that follow a print by reading it back, one colour ramp from hard edges to a smooth blend, drawn into a picture per piece that the fabric's existing print slot shows on either renderer."
tags: [architecture, prints, patterns, shaders, stones, crystal, procedural, ink]
status: draft
generated: { by: claude-code/claude-fable-5-2, at: 2026-11-13T12:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-13 (Claude Code session)
    title: "Shaders for colour designs on the fabric; the same as gemstones where applicable; smoothness down to hard edges; one cohesive feature; expand the selections; expose every artistic parameter"
    author: human:mattj
  - id: code
    resource: "app/src/prints/ (designs.js, glsl.js, engine.js, ink.js, gallery.js, strokes.js, field-stones.js, picture.js), app/src/render/prints.js, app/src/stones/pattern.js (layout.local, patternStrokes), app/src/stones/layouts.js, app/src/ui/PatternCard.jsx, app/src/ui/PieceCard.jsx (Prints), app/src/ui/FlatView.jsx (PrintOn); dev: app/prints.html, app/src/dev/print-gallery.js; test: app/test/prints.test.js"
    title: Printed patterns source
    author: claude-code/claude-fable-5-2
  - id: run
    resource: "Claude Code session of 2026-11-13 (test copy of the app on port 5176, GTX 1650)"
    title: Checks and timings in the app
    author: claude-code/claude-fable-5-2
  - id: decision
    resource: /decisions/2026-11-13-printed-patterns-one-feature-with-crystals.md
    title: Printed patterns and crystal patterns are one feature
  - id: stones
    resource: /engineering/architecture/procedural-stone-patterns.md
    title: Procedural stone patterns
  - id: farris
    resource: "Frank A. Farris, Creating Symmetry: The Artful Mathematics of Wallpaper Patterns (Princeton University Press, 2015)"
    title: Wallpaper functions as symmetrised waves
  - id: sublimation
    resource: /domain/fabrics/sublimation-printing.md
    title: Sublimation printing on polyester-elastane
---

# Takeaway

A pattern (a `doc.stones` record of kind `pattern`) is **made as** crystals, print, or both (`params.as`).[^owner][^decision]
It keeps everything a crystal pattern had: one piece's flat cloth, a frame with handles, a plane under it, distortions,
modifiers, presets.[^stones] What is new:[^code]

- **Printed designs**: 45 designs of colour, each a small shader giving a value over its own space, in seven families
  (blends, bands, mandalas, symmetry, tiles, organic, fractals), offered as 159 presets.
- **Every crystal layout prints** as line art: its lines as ink of a chosen width, its single crystals as dots.
- **Crystals follow a print**: along the edges where two colours meet, scattered over chosen colours, or as a halftone
  of the design. They are read from the print's own shader, so they lie on it exactly. Sixteen "Jewelled" presets start
  as both.
- **One ink**: colours along the design, and **Softness** from hard edges (0) to one smooth blend (1).

Both renderers show it, with no change to the fabric shader and nothing new to compile in it.[^run]

# The record

```jsonc
{ "id": "g7", "kind": "pattern", "on": { "panel": "p1" }, "name": "Jewelled mandala", "seed": 13, "stone": "Crystal AB",
  "params": {
    "layout": "print-mandala", "preset": "p-j-mandala",   // a design is the layout 'print-<key>' (prints/designs.js PREFIX)
    "as": "both",                                         // stones | print | both; absent: a design is print, a layout crystals
    "ring": 0.014, "rings": 5, "petals": 12,              // the design's own settings (the card's Design face)
    "ink": { "stops": ["#2a0a3d", "#6b0f22", "#b3122e", "#ff4f8b"],  // null: the fabric's own, nothing printed there
             "soft": 0.25, "wrap": "repeat", "repeat": 5, "shift": 0, "balance": 0, "strength": 1, "tint": false,
             "outline": 0, "outlineColour": "#0c0c10", "wobble": 0, "wobbleL": 0.03,
             "width": 0.002, "dot": 1.5 },                // (a crystal layout's line and dots)
    "gems": { "mode": "edges", "every": 2 },              // how a design's crystals follow it: edges | fill (on: [...]) | tone
    "x": 0, "y": 0.08, "rotate": 0, "scale": 1, "size": "ss12", "gap": 1.15, "mods": [] } }
```

`params.ink` is merged over the design's own starting ink over `INK_DEFAULTS` (`prints/ink.js inkOf`). A design's
setting must not share a name with one of a pattern's own (`size` is the crystal's; a design's size is `dsize`): the two
live side by side in `params`, and `test/prints.test.js` holds them apart. **[INFERRED]** design throughout.

# How a print reaches the leotard (`render/prints.js PrintView`)

Per piece, every pattern on it that prints is a layer, in the list's order, of one picture of the piece's flat cloth:

1. `prints/engine.js PrintEngine` owns a WebGL 2 context of its own. The app draws on WebGL or WebGPU, a design is
   written once in GLSL, and the fabric shader has a twin per renderer; a context of its own keeps designs out of both.
2. A layer is drawn over the last into a half-float target (premultiplied, linear), then resolved to straight sRGB
   colour and cover (cover 0 takes the cloth's colour, so a magnified edge has no dark fringe) and read back.
3. The pixels are a `THREE.DataTexture` on the fabric's existing print slot (`tPrint`, `uPrintSize`, `uPrintOffset`:
   the slot the piece's "print image" used). The fabric mixes it over its own colour by its cover, so foil dots, the
   piece's fade and everything after it still apply.
4. The picture lies in the fabric's pattern space: the mesh's flat metres turned by the piece's grain. A fitted piece's
   flat metres are its file's (`FittedCloth.shift`).

Size: a texel is 0.25 mm at the finest, the longer side at most 2048 texels (1024 while a drag runs, refined 220 ms
after the last change). Measured on the test front piece (1173 x 2049): 16 to 20 ms a picture, 6 to 10 ms while
dragging, most of it the read-back, which also waits for the 3D view's own frame.[^run]

A fitted garment's piece with no panel of its own (a sleeve on a design with only Front and Back) borrowed the
front's material; it now takes `GarmentView.plainMaterial`, the same look without the front's print, since a print is a
picture of one piece's flat shape.

# The ink (`prints/glsl.js inkOf`, `prints/ink.js`)

A design returns a value `t`; the ink turns it into colour:

- **Softness** `s`: with N colours, at 0 each owns a flat band 1/N wide with hard edges; at 1 the colours sit evenly
  from 0 to 1 and blend straight through. Between, a blend of width `s` of a band sits on each meeting of two colours.
  Blends are in OKLab, so the middle of a blend is not muddy. An edge is never harder than one texel.
- **How they run**: once, round again (after the last colour the first: needed by anything that goes round a middle),
  or there and back; times over; slid along; balance (a power, more of the first or the last colours).
- **Edges**: an outline of its own colour and width where two colours meet; wandering edges (noise added to `t`,
  as a share of one band).
- A stop that is `null` is the fabric's own: the ink takes its neighbour's colour at no cover, so it fades out without
  changing hue. Strength scales the cover; "dyes the fabric" multiplies the fabric's colour instead of covering it.
- **Modifiers**: a pattern's density modifiers are how much ink where (the same fourteen shapes, ported from
  `stones/modifiers.js fieldOf`, clouds included bit for bit), so a radial one leaves a soft-edged disc of the design.

`bandsOf`, `stopAt` and `rampCss` are the JavaScript twins of the ramp, for the card's bar and for crystals.

# The designs (`prints/designs.js`)

`float field(vec2 p)`: a value at a place of the design's own space, in metres. A setting `k` is read as `P_k`.
What a design is written with is in `glsl.js`: hashes, noise, Voronoi, folds across mirrors, distances, an edge one
texel soft. `gAlpha` ends a design of its own size.

| Family | Designs |
|---|---|
| Blends | blend (one way or both, arched, wavy), burst (round, diamond, square, polygon, star), sweep, from the piece's edge |
| Bands | stripes, chevrons and herringbone, checks, gingham, basket, tartan, argyle, houndstooth, dots, scales, interlocking circles, mirror lines (hemp leaf, kagome...) |
| Mandalas | kaleidoscope, mandala, lotus, sunburst, spiral, rose window, engraved rosette, snowflake, vortex, hyperbolic tiling in a disc |
| Symmetry | all 17 wallpaper groups, wave crystal (quasi-periodic), Chladni plate, ripples |
| Tiles | honeycomb, tumbling blocks, facets, bricks, stained glass, truchet, quasi tiles, motifs (star, heart, flower...) |
| Organic | clouds, veins (marble, zebra, tiger), liquid, agate, flames, leopard, galaxy, lava, layered waves |
| Fractals | Julia sets of any symmetry, Newton flowers, lace (an Apollonian fold) |

The wallpaper design sums a few waves of the cell's lattice over the group's operations: any such sum has the group's
symmetry, so each reshuffle is another design of it.[^farris] A test proves each of the 17 tables is a group.

Distortions bend a design by pulling its space the other way under the print (`unbend`): close to, not exactly, what the
same settings do to a crystal layout. It does not matter: a design's crystals come from the print itself.

# Crystals on a print (`prints/field-stones.js`)

A design is a layout with `local: true`: its crystals are drawn in the frame's own space (rigid part removed), where
the print's map and distortions are already in the picture. `make` asks the engine for the design's **band coordinate**
over the box (the same program, `uOut = 1`, read back as floats on a grid anchored to the frame's origin), then:

- **edges**: isolines at every whole number and a half (`stones/layouts-curves.js isolines`, now with a mask for designs
  of their own size), laid as runs: spacing, keystones and the parallel rule as for any line;
- **fill**: the blue-noise tile's points over the colours chosen;
- **tone**: a hexagonal lattice, each crystal's own size by the value.

The drawing depends on how the ink's colours fall (softness, repeats, wrap...) but not on the colours themselves
(`pattern.js candidateKey`). On WebGPU the geometry goes to the GPU stone engine like any other: the same 799 crystals
on the test lotus on both renderers.[^run] Without a GPU (the tests) a design lays nothing.

# A crystal layout as print (`prints/strokes.js`, `pattern.js patternStrokes`)

Its geometry's lines and runs become short stretches mapped exactly as the stone engine maps them (distortion, then the
pattern's map), kept in the frame's own space so a move draws nothing again. Its single crystals print as dots where
they are kept. The engine draws each stretch as a capsule into a distance picture (nearest wins by the depth test), and
the ramp runs along the distance: the first colour is the line, each further colour a ring half a line wide.

# Interface

- A pattern's card: the made-as switch under its name; faces Preset, Design or Arrange, Colours, Crystal, Place (the
  distortions moved here as "Bend it"), Modify.
- The gallery: "Colour designs" and "Lines & dots", then families.
- A piece's card has a Print face: its printed patterns, or the gallery; a pick lays it on that piece as print.
- The pattern view shows the print on the piece. Every face fits at 1024 x 768 (`dev/ui-audit.js`).[^run]

# Limits

- A print stops at a seam: it lies on one piece.
- On a mirrored pair the print shows on both pieces (they share a material); a pattern cut to one side still prints on
  both.
- A satin of the thread model has no diffuse colour of its own, so a print on it reads wrongly.[^sublimation]
- The printable PDF does not carry prints. The eraser removes crystals, not ink.
- A hard edge is as sharp as a texel (0.25 to 0.35 mm on a front piece).

[^owner]: Owner's brief, 2026-11-13
[^code]: Printed patterns source
[^run]: Checks and timings in the app
[^decision]: Printed patterns and crystal patterns are one feature
[^stones]: Procedural stone patterns
[^farris]: Wallpaper functions as symmetrised waves
[^sublimation]: Sublimation printing on polyester-elastane
