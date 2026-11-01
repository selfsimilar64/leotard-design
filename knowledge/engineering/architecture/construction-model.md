---
type: Architecture
title: The construction model
description: "How a design records what is cut and how it is sewn: materials with synchronised looks, overlay pieces on their own layer, finishes with real widths, curvature-continuous lines, paired pieces, and what the pattern export reads from them."
tags: [architecture, materials, applique, seams, curves, pattern, export]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-31T18:00:00Z }
sources:
  - id: decision
    resource: /decisions/2026-10-31-construction-mirrors-real-sewing.md
    title: The design model mirrors how a leotard is really cut and sewn
  - id: code
    resource: app/src/doc/materials.js
    title: "Code: doc/materials.js, doc/commands-garment.js, garment/pattern.js, garment/trim.js, render/rims.js, curves/evaluate.js"
---

# Takeaway

**`doc.materials` is the source of truth for what a part is made of; each part keeps a synchronised copy of the
look, so the renderer and pattern read one place. An overlay piece lives on an overlay layer and never cuts the
shell. The pattern reports each piece's construction.** Why: [the decision](/decisions/2026-10-31-construction-mirrors-real-sewing.md).

# Materials

- A record is `{ id, name, ...LOOK }`. `LOOK` (`doc/materials.js`) lists the fields that make cloth the same cloth.
- A look holder is a panel's `stack[0]`, a strap's `fabric` or a trim's `fabric`; each has `material`. Writes go through
  `setLook`, which updates the material and every holder in one transaction, so one undo step and no drift. `test/materials.test.js`
  checks every holder equals its material after each kind of edit.
- Why copies and not lookups: every reader (render, rims, straps, pattern, the stones' signatures) already reads the
  look, and a piece cut from another (`inheritPanels`, `block.set`) inherits its material by cloning its stack.
- `panel.set` and `strap.set` route look fields to the material, so older scripts stay valid but now change everything
  sharing it. `panel.separate` first gives a part its own copy. With Mirror off, `sym.edit` does that automatically for
  a look edit that splits a pair.
- `migrateMaterials` groups identical looks when opening an older file. `adoptLooks` runs after every command that
  touches panels, straps or trims and gives any new look a material.

# Overlay pieces

- `overlay.add` draws a closed `edge` line on the overlay layer (created on first use), seeds a panel in the smallest
  unclaimed cell of that layer, records the line as `panel.outline`, and sets a `zigzag` finish. `overlay.remove` deletes all three.
- The shell's arrangement is untouched: the base stays one piece.
- A new piece gets its own material, a copy of the fabric under it (`overlayLook`, `auto: true`), so choosing its fabric cannot change its base. The copy goes if another material is chosen or the piece is deleted, unless it has been changed or renamed (`dropAutoMaterial`, `keepMaterial`).

## Using existing lines as edges

Owner, 2026-10-31: each chest plate is a quad, two drawn lines and two stretches of existing seams, and only the two lines should need drawing. How it feels to use: [one drawing grammar](/engineering/ux/one-drawing-grammar.md).

- With `at`, `overlay.add` takes `strokes`, lines each from one existing line to another or to an earlier stroke (`on.curve: strokeId(i)`), or one stroke as `points` and `mirror`. `strokeRegions` cuts the shell by its own lines and the strokes, without changing the document, and `at` picks the area.
- `pickableRegions` decides what can be picked, the same way for the tool's tints and for the command: an area with a stroke among its edges (`cellLines`, which ignores a line with the area on both sides) where the shell had fabric before the strokes (`panelAt` on the shell's own build). The piece's `seed` is a point well inside the area (`cellSeed`), not the click, and its pair is found from that seed, so a click close to a line cannot land across it. An area lying across the centre is one piece.
- The strokes among its edges become the piece's own lines, on a layer of its own; the shell lines among its edges become the layer's `bounds`. `overlayLines` lists a piece's own lines; `panel.outline` is the first of them and marks the piece as an overlay. Strokes not among its edges are dropped.
- `buildGarment` cuts a layer by its own lines plus its `bounds`. Free-drawn overlays share a separate layer without bounds. Two pieces at one height would fight in the render if they overlapped.
- Along its `bounds` a piece is **caught in that seam**: `render/rims.js` draws its stitched edge only on its own lines (`ownRuns`), and the pattern adds the seam allowance only there (`caughtEdges`, `offsetEdges`), dashed as a stitch line and listed as `caughtIn`.
- An overlay goes with any of its own lines or a line in its `bounds` (`dropOverlaysOn`), reported in the impact of a silhouette change. Splitting a bound line's pair with Mirror off adds the new line to `bounds`. Moving an end to another shell line (`curve.movePoint` with `on`) adds that line too.

# Finishes

- Kinds: `elastic`, `binding`, `piping`, `tape`, `zigzag`, `none`. `trim.width` scales the profile across the edge (`trimAtWidth`); only piping, being round, also grows in height.
- `zigzag` draws one thread side to side in the shader (`uZig`, half the width; repeat 1.4 mm), fading to a groove at a distance.
- The Shape tab asks `rims.loops` whether the line is really an opening and offers only finishes that can show on it.
- A loop of several lines takes the finish of its longest line that has one.

# Lines

- Control points are joined by a C2 spline on centripetal knots (`runTangents`); a corner splits it into separate runs.
  Catmull-Rom's bend jumped at each point.
- Each span first drops onto the body about every centimetre, along the normals of its two ends blended (`dropOnto`), and the fine
  samples carry those offsets. The local normal tilted on the bust and pushed the line sideways; the closest point could jump across a hollow.
- Fine samples use `projectSmooth`, which uses the interpolated normal so they do not collapse onto facet creases.
- A bow clicked with about 2 mm of hand error went from 15, 25 and 7 reversals of bend (4, 6 and 10 clicks) to 3, 5 and 7 (`test/curves.test.js`).

# Pairing

`inheritPanels` returns `{ pair: panelId }` when a piece that was cut kept the mirror image of a new cell: its off-centre seed was
inside one of two mirrored shapes. It then becomes the mirrored pair. New pieces get unique names (`Front 2`) because the pattern lists them by name.

# What the pattern reads

`patternPieces` returns per piece `construction` (`pieced`, `appliqué` or `lining`), `material`, `sewnOn`, `placement` (polylines on the base piece's flat shape, in
its millimetres); overall `fabrics` and `finishes` with total lengths. Appliqué has no allowance. `opts.surf` is needed for placements; `app.pattern` supplies it.

# Clean outlines

Owner's first cut pattern showed steps of about 5 mm on some flat outlines, though the 3D lines were smooth. Two causes, two fixes (2026-10-31):

- **Flattening stopped too early.** At 30 ARAP iterations the Back of a racer block still had its leg line folded over near the crotch, at 1.9 times its 3D length; the outline ran out and back. `garment/flatten.js` now runs up to 100 and stops when nothing moves 0.02 mm: worst 5 mm stretch of edge 1.05, with inverted triangles from 0.06% to about 0.003% of the area. It costs up to about 1.4 s for a 10,000-vertex piece, in the worker, cached per piece.
- **Thin triangles.** Where a line crosses the mesh it leaves thin triangles whose cotangent weights act as stiff rods, so weights are capped (`COT_CAP`). Mean stretch falls a little on every piece tried.
- **What remains is smoothed, not hidden.** Stretch on a body that cannot lie flat still leaves bumps of a millimetre or so. `garment/pattern.js` splits an outline at its true corners (`outlineCorners`: where it passes from one line to another, or where it turns sharply **in 3D**, since the flat shape's own bumps turn as sharply) and runs a smoothing spline along each stretch with its ends held (`smoothRun`, `cleanOutline`). A bump 10 mm long keeps 1% of its height; a 15 mm radius curve moves under half a millimetre. Placement lines get the same.

# Known gaps

- A piece's crotch edge flattens with a notch where the crotch seam bends on the body; a real pattern's is close to straight.

- A free-drawn overlay that merely touches a seam is not treated as caught in it; only a piece drawn from line to line is.
- A caught stretch uses the 6 mm seam allowance even along an elastic-finished opening such as the armhole, where a different catch may be right.
- Seam allowance is the same on every pieced edge. Bound edges really do keep about 6 mm, wrapped inside the binding; sleeve hems (about 2 cm), clasp folds (about 1.5 cm) and strap joins (1 cm) are the real errors ([2026-10-31 research](/references/research/techniques-and-workflow-report.md)).
- Stones are not yet tied to overlay deletion.
