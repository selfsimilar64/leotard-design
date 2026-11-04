---
type: Component
title: The flat view's Look appearance and stones
description: "The 2D pattern view's second appearance (Look): each piece in its colour, a faint tile of its fabric, its stones as laid in 3D, and the chosen stone pattern's handles, so a pattern is edited in 2D or 3D and both follow; with its limits."
tags: [app, ui, flat-view, pattern, stones, look]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T12:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-04 (Claude Code session)
    title: "A secondary appearance for the 2D view with each piece's colours and gemstones, maybe a texture hint for the material; gem patterns editable there too; two ways to edit the same design, always in sync"
    author: human:mattj
  - id: code
    resource: "app/src/ui/FlatView.jsx (LookPiece, Defs, flatLook), app/src/ui/FlatStones.jsx (StonesOn, PatternHandlesOn, frameOf), app/src/garment/pattern.js patternPieces (cell, layer, origin, easeUV; a mirrored panel shows its seed's cell), app/src/render/engine.js clothOfCell"
    title: Look appearance code
    author: claude-code/claude-opus-5-5
---

# Takeaway

**The flat view now has two appearances of the same pieces: Sewing (the sewing aid it was) and Look (how each piece will look,
with its stones), switched at the top of the view and remembered.** The owner wanted the 2D view useful beyond sewing: colours,
gemstones, perhaps a hint of the material, and gem patterns editable there, always in sync with 3D.[^owner]

# What Look shows

- **Colour:** the panel's first layer colour; an ombre as a fade from its colour to the ombre's, top to bottom of the piece
  **[INFERRED]** (the 3D fade runs by body height, so this is an approximation).
- **Fabric:** a faint tile of the fabric's own swatch picture (`public/thumbs/materials/<fabric>.jpg`), greyed and laid on with
  soft-light so it shows the surface and keeps the piece's colour. The owner was unsure materials matter in 2D; this is the
  lightest hint. Not tiled seamlessly (the swatches are a pinched sheet).
- **Stones:** every stone the engine laid (`engine.stoneRun`) on the piece it lies on, at its real size (diameter in mm) and its
  crystal's colour, with a highlight. A mirrored pair's piece also shows the other piece's stones mirrored onto it, dashed
  ("on the other piece of the pair"). Clicking a stone selects its group (or the placed stone), as in 3D.

# Editing a stone pattern in 2D

- A chosen stone **pattern** (kind `pattern`, on that piece's panel) shows the same handles as the 3D view: move, turn, scale,
  the layout's grips, the plane, modifiers, and the dots that switch between them (`stones/handles.js` patternHandles, whose
  handles are already in the piece's flat metres). A drag sends the same `stones.set` through the Mirror toggle as the 3D handles,
  as one undo step; the 3D view lays the stones again from it. Checked: a move drag moved the pattern's centre 99 mm along the
  piece, undo and redo restore it.
- The flat frame: `mm = uv * 1000 * (1 + ease) - origin` (patternPieces keeps `cell`, `layer`, `origin`, `easeUV`). A mirrored
  panel's piece is now its seed's cell, the one its stone patterns are measured on (`engine.clothOf`), so params and handles share
  one frame; the printed pattern takes that cell too (the same piece, cut twice).
- The pieces are laid out again only when lines, panels, layers, trims or meta change, not on stone or colour edits, so a drag
  stays light.

# Edges and speed (owner's review, 2026-11-04)

- **Why a pattern stopped short of the edges.** Stones keep off the elastic at the finished openings (neck, legs, wrists): on the
  fitted front they came within 1.6 mm of the seams but no nearer than 13 mm to an opening. In 3D the elastic is drawn over that
  strip; in 2D it was not, so it read as a gap. Look now draws each fitted piece's openings as the elastic band (its width, a shade
  of the piece's colour, lighter on dark colours). A drawn piece's Look outline is now its stitching line, not its cut line with
  the 6 mm seam allowance the stones never reach. Drawn pieces' elastic bands are not drawn in 2D yet.
- **Why 2D edits were slow.** Each pointer move sent an edit; each edit redrew about 13 000 SVG nodes (two circles a stone,
  about 55 ms), twice (once for the edit, once for the stones laid after it), and the fitted pieces' stones each searched the
  whole body for their surface point (about 20 ms of a 50 ms pattern run). Now: stones are a few paths per colour and kind (59
  nodes for the whole view), their paths rebuilt only when the stones or the selection change; a drag applies one edit a frame
  (the last always on release); a fitted stone's surface point is searched from the body face its corner is carried on.
  Measured on a 3345-stone lattice (background tab): laying 12-31 ms, the flat view's redraw 17-32 ms, against about 50 and
  2 x 55 ms before, plus queued moves.

# Limits **[INFERRED]**

- Only stone **patterns** have handles in 2D; rows, scatters, fills and the other kinds are drawn and selectable but are placed on
  the 3D body, with no flat coordinates to edit them by.
- A fitted garment's pieces show their pattern stones and handles (by each stone's fitted triangle: see
  [fitted garments](/engineering/app/fitted-garments-in-the-app.md)); other stone kinds on a fitted garment do not show in 2D.
- Stones are drawn round; shaped stones (navettes, pears) are not turned or stretched in 2D.
- Hundreds to a few thousand stones draw as SVG circles; much denser designs may slow the flat view.
- With the app's window not drawing, stones wait for the next frame (the engine lays them in its frame loop), so the flat view
  shows them only once frames run.

[^owner]: Conversation with the product owner, 2026-11-04.
[^code]: Look appearance code.
