---
type: Requirement
title: One drawing grammar
description: "How every line tool behaves: a press shows where a point will land and lifting places it, lines snap visibly to seams and the centre, a line that touches the centre meets its mirror image, the areas lines enclose tint, a tap picks one, and existing seams count as edges without tracing."
tags: [ux, tools, requirement, overlay, mirror, touch]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-31T23:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-31 (Claude Code session)
    title: "Each chest plate is a quad: draw the two vertical lines, reuse the shared seams"
    author: human:mattj
  - id: report
    resource: /references/research/techniques-and-workflow-report.md
    title: "Research report: Draw first, decide how it sews"
  - id: precedents
    resource: /references/research/software-interaction-precedents.md
    title: "Research notes: software interaction precedents"
  - id: decision
    resource: /decisions/2026-10-31-draw-first-decide-how-it-sews.md
    title: "Decision: draw first, decide how it sews"
---

# Takeaway

**Lines land, the areas they enclose light up, a tap picks one.** Nothing is traced: a seam or edge that bounds the area
counts automatically, and the fabric stays whole until an area is picked. The owner's chest plate is two lines and one
tap with Mirror on.[^owner] The grammar is **[INFERRED]** from precedents in 2D illustration; no source has tried it on a
3D body.[^report] Why: [the decision](/decisions/2026-10-31-draw-first-decide-how-it-sews.md).

# The rules

1. **A press shows, a lift acts.** Touching down shows where the point will land or which area is meant; sliding adjusts it; lifting commits. A second finger arriving cancels the press, so two-finger turning never leaves a stray point.
2. **Snapping is visible before it happens.** A dot shows where a point will attach, on a line or on the centre.
3. **With Mirror on, a line is mirrored unless it really crosses the centre.** A point within 6 mm of the centre (or a few pixels on screen) snaps to it, and the line meets its own mirror image there. Only a line with points clearly on both sides, or lying along the centre, is one part.
4. **The overlay tool stays on.** A line started on a seam or edge ends on the next line it meets, and the tool waits. More lines may be drawn; a line can end on an earlier one.
5. **Areas tint.** Every area that a drawn line helps enclose and that has fabric gets a faint tint, the same on both sides; the one under the pointer and its mirror image are stronger. Tints replace hover on a touch screen.
6. **A tap picks.** While a line is being drawn a tap adds a point; a tap on a line starts one; a tap inside an area picks it and makes the piece.
7. **Fabric is what was there.** An area counts as fabric if the shell had fabric there before the lines were drawn, not by where a piece's anchor happens to fall.
8. **A pair is decided by the area, not the click.** The mirror image comes from a point well inside the area, so a click close to a line cannot land on the wrong side.
9. **Ends follow their line.** Dragging an attached end slides it along that line, or moves it to another line it comes near. It never silently detaches.
10. **A new plate has its own material.**

# What each tool does at its end

| Tool | A line ending on a line | Afterwards |
|---|---|---|
| Seam | cuts as it lands | stays in the tool, the line selected |
| Strap | ends the strap | stays in the tool |
| Overlay, begun on a line | waits for more lines or a pick | back to Select, the piece chosen |
| Overlay, begun in the open | runs on past lines; click the first point to close | back to Select, the piece chosen |

# Failure modes to guard against[^precedents]

- **A near miss leaves no area and no explanation** (SketchUp's worst reports): snap generously and say in the mode bar when a line has not closed.
- **Slivers:** absorb thin areas instead of offering them as picks.
- **Silent re-matching after an edit** (Onshape): a plate follows its seams when they move, and the app reports what it did when one goes.
- **Lines that begin in the open** have a second meaning for a tap: they are allowed only while no line has been drawn yet.

# Known limits

See [the construction model](/engineering/architecture/construction-model.md). Not yet built: picking several areas into one piece, a single Draw command, changing how a line is made after drawing.

[^owner]: Owner's message, 2026-10-31
[^report]: Research report, Draw first, decide how it sews
[^precedents]: Research notes, software interaction precedents
[^decision]: Decision, draw first
