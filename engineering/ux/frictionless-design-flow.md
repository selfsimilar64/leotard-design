---
type: Requirement
title: Frictionless design flow for the designer tool
description: "How a designer gets from a blank or a reference photo to a finished leotard with the fewest decisions: start from a block, draw in 3D or on a synced 2D flat, smart context actions on whatever is clicked, generators that stay editable, mirror and snapping on by default, trace-over-photo, live counts and side-by-side compare."
tags: [ux, requirement, designer, tools]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-18T18:30:00Z }
sources:
  - id: patterns
    resource: /engineering/ux/ux-pattern-library.md
    title: UX pattern library
  - id: principles
    resource: /engineering/ux/creativity-tool-principles.md
    title: Principles for frictionless creative tools
  - id: sketch
    resource: /engineering/ux/sketch-panels-on-body.md
    title: Sketching panels directly on the body
  - id: strokes
    resource: /engineering/ux/procedural-stone-strokes.md
    title: Procedural, editable stone strokes
  - id: vocab
    resource: /domain/embellishments/placement-vocabulary.md
    title: Stone placement vocabulary
  - id: owner
    resource: conversation with the product owner, 2026-10-18 (Claude Code session)
    title: Moodboard brief (frictionless and intuitive design)
    author: human:mattj
---

# Takeaway

**[INFERRED]** Designers think in **lines on the body, then fills**: "a V yoke in mesh, a binding on
every edge, two rows of stones along the yoke seam, a fade down from the neckline". The tool should let
them say exactly that, in that order, with each step one gesture and every step editable afterwards.
This follows the principles of direct manipulation, low viscosity and well-chosen high-level
primitives,[^principles] and the owner's request that design be frictionless and intuitive.[^owner]

# The flow

1. **Start from a block, never a blank.** A visual gallery of base blocks (tank / cap / 3/4 / long;
   crew, scoop, V, mock neck, high neck with keyhole; standard and high leg; closed, scoop, V, keyhole
   and open backs). Each block is just a starter set of edge curves, fully editable.[^patterns]
2. **Two synced views.** The 3D body and a 2D *technical flat* (front and back side by side, like a
   designer's sketch). Draw in either; the line appears in both. On iPad, the pencil draws and the
   finger orbits.[^sketch]
3. **Draw a line, get a panel.** The pen tool draws a curve; ending on another curve or an edge snaps
   and closes a panel automatically. Mirror is on by default (one tap for asymmetric). Snapping to
   landmarks (centre front/back, side seam, bust apex, waist, hip bone, shoulder point) and to other
   curves is on by default and shown, with a modifier to free-draw. Shape modifiers turn any curve into
   a scallop, zigzag or wave.
4. **Click anything, get the right menu.** A panel offers fabrics (drag a swatch on it), mesh/lining,
   print, *cut out*. A curve offers seam / print line / edge, finish (elastic, contrast binding,
   piping), and stone actions: *outline it*, *two rows*, *fade from it*. An edge offers binding colour,
   band height (mock neck, collar, cuffs). A strap offers width, fabric, binding, stones along it.
5. **Straps by drawing.** Draw a strap from one edge to another (or to a junction); crossings,
   ladders and cages come from drawing several; widths and binding are inherited from the last strap.
6. **Stones by intent, not by dot.** Generators named in the trade's own words: outline, rows along,
   fill, gradient scatter ("fade from this line to that one"), lattice/trellis, fan between two curves,
   motif (library or imported SVG), lettering, fringe/drops, cluster, plus a single-stone brush that
   slides on the surface and an eraser.[^vocab] Every generator stays live (move the seam, the rows
   follow) until *released* into individual stones.[^strokes]
7. **Trace a photo.** Drop in a reference photo, pin 6-8 landmarks, and the camera and an overlay are
   solved; draw curves straight over the photo; pick colours from it; optionally pick up stone
   positions from it. Compare side by side or as a wipe at the photo's own camera and lighting.
8. **Always on: live read-outs and safety nets.** Stone count by size/colour, rough cost tier,
   undo/redo with a visible history, autosave, and gentle warnings (stones on elastic, overlap) that
   never block.[^patterns]

# Acceptance checks

- Any moodboard design's panel lines can be drawn in at most one curve per visible seam.
- A seam edit re-flows all stone rows bound to it within one frame of release.
- No modal dialogs in the draw → assign → decorate loop.
- Every action is reachable by click, by keyboard shortcut and by `app.exec` command.

[^patterns]: UX pattern library
[^principles]: Principles for frictionless creative tools
[^sketch]: Sketching panels directly on the body
[^strokes]: Procedural stone strokes
[^vocab]: Stone placement vocabulary
[^owner]: Product owner, 2026-10-18
