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
- The drawing tool (`ui/tools.js`, tool `overlay`) keeps going past a line it meets, where the seam tool ends on one.

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

# Known gaps

- **The flat outlines of some pieces have small jagged steps** (seen near the armhole of a mesh Front on a racer block, about 5 mm). The 3D lines there are clean, so the cause is in flattening or outline cleanup. This must be fixed before an outline is cut from. Close-ups also show fabric texture distortion in patches on a flattened overlay, possibly the same cause.
- A plate edge caught in the armhole or waist seam still draws its zigzag along that stretch and its export does not add the allowance needed to catch it.
- Seam allowance is the same on every pieced edge; an elastic-finished or bound edge needs a different one ([seams and allowances](/domain/construction/seams-stitches-and-allowances.md)).
- Stones are not yet tied to overlay deletion.
