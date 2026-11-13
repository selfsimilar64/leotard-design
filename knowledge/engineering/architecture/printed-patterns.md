---
type: Architecture
title: Printed patterns
description: "A pattern is made as crystals, as print on the fabric, or as both. A print is flat sections of at most three colours (the fabric's own ground and two accents that start as shades of the fabric), with no gradients: ten designs written as small shaders (26 presets, eight of them mandalas), every crystal layout printable as line art, crystals that follow a print's edges by reading it back, drawn into a picture per piece that the fabric's existing print slot shows on either renderer."
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
  - id: flat
    resource: /decisions/2026-11-13-prints-are-flat-sections-paired-with-crystals.md
    title: Prints are flat sections of at most three colours, each paired with a crystal pattern
  - id: stones
    resource: /engineering/architecture/procedural-stone-patterns.md
    title: Procedural stone patterns
  - id: sublimation
    resource: /domain/fabrics/sublimation-printing.md
    title: Sublimation printing on polyester-elastane
---

# Takeaway

A pattern (a `doc.stones` record of kind `pattern`) is **made as** crystals, print, or both (`params.as`).[^owner][^decision]
It keeps everything a crystal pattern had: one piece's flat cloth, a frame with handles, a plane under it, distortions,
modifiers, presets.[^stones] Since the owner's second direction of 2026-11-13 a print is **flat sections, no
gradients, at most three colours, and always the pair of a crystal pattern**:[^flat][^code]

- **Three sections**: the ground (to begin with the fabric's own: nothing printed), an accent and a second accent (to
  begin with shades of the fabric's colour that stand out from it). Each is clear, a shade of the fabric, or a colour.
- **Ten printed designs** as 26 presets in three families: Mandalas (8 of the new mandala, Lotus, Star flower), Motifs
  (stars, hearts, flowers, moons), Shapes (wavy steps, star burst, diamond and facet steps, scales, sea waves, peacock,
  interlocking circles, tumbling blocks, layered waves, hills, Julia set).
- **Every crystal layout prints** as line art: its lines as the accent at a chosen width, its single crystals as dots.
- **Crystals follow a print**: along the edges of its shapes, or scattered over chosen sections. They are read from the
  print's own shader, so they lie on it exactly. This is what makes every design a pair.

Both renderers show it, with no change to the fabric shader and nothing new to compile in it.[^run]

# The record

```jsonc
{ "id": "g14", "kind": "pattern", "on": { "panel": "p1" }, "name": "Lotus mandala", "seed": 13, "stone": "Crystal AB",
  "params": {
    "layout": "print-mandala", "preset": "p-m-lotus",     // a design is the layout 'print-<key>' (prints/designs.js PREFIX)
    "as": "both",                                         // stones | print | both; absent: a design is print, a layout crystals
    "style": "lotus", "folds": 8, "rings": 5,             // the design's own settings (the card's Design face)
    "ink": { "ground": null,                              // each section: null (the fabric's own), 'auto' or a number
             "accent": "auto", "accent2": 0.3,            //   (a shade of the fabric: OKLab lightness added), or '#rrggbb'
             "wobble": 0, "wobbleL": 0.03,                // edges made to wander: how far and how big, metres
             "width": 0.002, "dot": 1.5 },                // (a crystal layout's line and dots)
    "gems": { "mode": "edges", "edges": "all" },          // crystals: edges (all | outer | inner) or fill (on: [ground, accent, accent2])
    "x": 0, "y": 0.08, "rotate": 0, "scale": 1, "size": "ss6", "gap": 1.15, "mods": [] } }
```

`params.ink` is merged over `INK_DEFAULTS` (`prints/ink.js inkOf`); a preset names no colours. A design's setting must
not share a name with one of a pattern's own (`size` is the crystal's; a design's size is `dsize`): the two live side by
side in `params`, and `test/prints.test.js` holds them apart. A record of a removed design goes on as `print-steps` (the
old blend), `print-cubes` (the old tiles) or pavé (`stones/pattern.js RENAMED`); one with the old `ink.stops` prints its
first two printed colours as its accents. **[INFERRED]** design throughout.

# How a print reaches the leotard (`render/prints.js PrintView`)

Per piece, every pattern on it that prints is a layer, in the list's order, of one picture of the piece's flat cloth:

1. `prints/engine.js PrintEngine` owns a WebGL 2 context of its own. The app draws on WebGL or WebGPU, a design is
   written once in GLSL, and the fabric shader has a twin per renderer; a context of its own keeps designs out of both.
2. A layer is drawn over the last into a half-float target (premultiplied, linear), then resolved to straight sRGB
   colour and cover (cover 0 takes the cloth's colour, so a magnified edge has no dark fringe) and read back. A
   section that is clear is cover 0.
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

# The sections (`prints/glsl.js paint`, `prints/ink.js`)

A design does not return a value to colour. It **paints**: the shader keeps two distances in metres, `gInk` to the edge
of what is printed in an accent and `gTwo` to the edge of the second accent (negative inside), and

- `paint(sd, c)` lays a shape (its signed distance) of section `c` over what is there: union into its own section,
  cut out of the others. Later shapes lie on top, so a design is written as a painter works.
- `bands(u, m, n)` is bands in turn along `u`: ground, accent (n 2), second accent (n 3), round again.
  `rimBands` is the same for a thing that lies over others (a scale, a petal, a wave), whose rim is an edge only against
  what it covers.

The colour is `mix(ground, mix(accent, second, inside gTwo), inside gInk)`, each edge one texel soft. Nothing else
blends. A section's colour is resolved in JavaScript against the piece's fabric colour (`sectionColour`): a shade is the
fabric's colour with its OKLab lightness moved; `auto` moves it 0.2 (the accent) or 0.36 (the second) towards where
there is room: lighter below a lightness of 0.6, darker above. The picture's key includes the fabric's colour, so a
shade follows it.

- **Wandering edges**: the design's space pushed about by noise (how far, how big), so every edge strays alike.
- **Modifiers**: a pattern's density modifiers are how much ink where (the same fourteen shapes, ported from
  `stones/modifiers.js fieldOf`, clouds included bit for bit). These do fade ink; they are the designer's own.

# The designs (`prints/designs.js`)

`void design(vec2 p)` paints at a place of the design's own space, in metres. A setting `k` is read as `P_k`. `two(P)`
says whether it has a second accent (the card then shows three sections, otherwise two); `parts` splits a design's
settings over two parts of the card's Design face. `gAlpha` ends a design of its own size (its ground, if coloured, ends
there too).

| Design | What it paints | Presets |
|---|---|---|
| steps | bands along a wave or an arch, one accent or two in turn | Wavy steps |
| burst | bands out from a middle: round, diamond, square, polygon, star | Star burst, Diamond steps, Facet steps |
| scales | rows of overlapping discs, arcs from the rim in | Scales, Sea waves, Peacock |
| circles | interlocking circle lines | Interlocking circles |
| dunes | layered wave crests, bands from each crest down | Layered waves, Hills |
| cubes | three rhombi a block: ground, accent, second accent | Tumbling blocks |
| motifs | star, heart, flower, moon, diamond, cross on a lattice; a second accent inside | Stars, Hearts, Flowers, Moons |
| lotus | layers of petals, bands from each rim in | Lotus, Star flower |
| mandala | rings of motifs round a small flower (below) | Lotus, Sun, Lace, Temple, Dahlia, Henna, Stencil, Shuffled |
| julia | a band for every few steps a place takes to fly off | Julia set |

**The mandala.** Up to eight rings between a middle flower and the rim, their heights growing by a factor outwards.
Each ring is a row of one motif in the wedges of its symmetry, drawn with exact distances in the wedge: pointed petals
(two arcs, their ends rounded by a setting) with an inner contour, a seed, a dot off the tip, a stem line and a second
row behind showing between them as Detail rises; a band of pearls; scallops with an inner arch and a dot; rays with an
inner ray; a chain of circles; a band of teeth. A ring has more petals where its own would be wider than tall; every
other ring is turned half a step; the outermost is drawn first and each inner one over it, as petals overlap. Five ring
orders (lotus, sun, lace, temple, bloom) and a shuffled one by seed. Drawn as line art (lines the accent, details the
second accent), filled, every other ring filled, or solid (bodies the accent, with gaps of ground between). Built from
what is generally known of how mandalas are drawn; no reference pictures were looked at.[^flat]

Distortions bend a design by pulling its space the other way under the print (`unbend`).

# Crystals on a print (`prints/field-stones.js`)

A design is a layout with `local: true`: its crystals are drawn in the frame's own space (rigid part removed), where
the print's map and distortions are already in the picture. `make` asks the engine for the two distances over the box
(the same program, `uOut = 1`, read back as floats on a grid anchored to the frame's origin), then:

- **edges**: the lines where a distance is nought (`stones/layouts-curves.js isolines`, with a mask), laid as runs:
  spacing, keystones and the parallel rule as for any line. Every edge, only the outline of what is printed, or only the
  second accent's; where the second accent meets the ground the edge is the outline's, laid once.
- **fill**: the blue-noise tile's points over the sections chosen.

The drawing depends on nothing of the ink but the wander of its edges (`pattern.js candidateKey`). On WebGPU the
geometry goes to the GPU stone engine like any other. Without a GPU (the tests) a design lays nothing. Known rough
spot: along a line thinner than a crystal the two edges' rows compete, so the row reads a little uneven.[^run]

# A crystal layout as print (`prints/strokes.js`, `pattern.js patternStrokes`)

Its geometry's lines and runs become short stretches mapped exactly as the stone engine maps them (distortion, then the
pattern's map), kept in the frame's own space so a move draws nothing again. Its single crystals print as dots where
they are kept. The engine draws each stretch as a capsule into a distance picture (nearest wins by the depth test); the
accent is where that distance is under half the line's width. One accent on the ground: no second.

# Interface

- A pattern's card: the made-as switch under its name; faces Preset, Design or Arrange, Colours, Crystal, Place (the
  distortions are "Bend it" there), Modify.
- Colours: the sections as a switch (Background, Accent, Second accent where the design has one), then for the one
  chosen: Clear, Fabric shade (a slider, lighter or darker; at its own start it is automatic) or Colour (the palette);
  wandering edges; for a crystal layout its line width and dots.
- Crystal, for a design: along the edges (every edge, outlines, second accent) or filling chosen sections.
- The gallery is one list of thirteen families: the ten of crystal layouts, then Mandalas, Motifs, Shapes.
- A piece's card has a Print face: its printed patterns, or the gallery opened on Mandalas; a pick lays it as print.
- The mandala's Design face is in two parts (Rings; Petals and lines). Every face fits at 1024 x 768
  (`dev/ui-audit.js`: 138 faces, none over).[^run]

# Limits

- A print stops at a seam: it lies on one piece.
- On a mirrored pair the print shows on both pieces (they share a material); a pattern cut to one side still prints on
  both.
- A satin of the thread model has no diffuse colour of its own, so a print on it reads wrongly.[^sublimation]
- The printable PDF does not carry prints. The eraser removes crystals, not ink.
- An edge is as sharp as a texel (0.25 to 0.35 mm on a front piece); a mandala's finest lines (0.6 mm) are two texels.

[^owner]: Owner's brief, 2026-11-13
[^code]: Printed patterns source
[^run]: Checks and timings in the app
[^decision]: Printed patterns and crystal patterns are one feature
[^flat]: Prints are flat sections of at most three colours, each paired with a crystal pattern
[^stones]: Procedural stone patterns
[^sublimation]: Sublimation printing on polyester-elastane
