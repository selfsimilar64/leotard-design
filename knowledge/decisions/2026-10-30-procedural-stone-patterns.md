---
type: Decision
title: Stone groups are live procedures on the flat cloth
description: "Owner direction of 2026-10-30: gemstone groups are edited live, without removing and redrawing them, and procedural placement is opened to a broad class of designs, each adjustable inside its piece of fabric with on-screen handles to move, turn and scale."
tags: [decision, stones, crystal, procedural, patterns, handles]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-30T14:30:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-30 (Claude Code session)
    title: "Edit a gemstone group live; expose many forms of procedural placement"
    author: human:mattj
  - id: flatten
    resource: /engineering/app/pattern-pieces-and-flattening.md
    title: Pattern pieces and flattening
  - id: rules
    resource: /domain/embellishments/stone-placement-rules.md
    title: Stone placement rules
---

# Decision

The owner asked for groups of gemstones to be placed and edited in real time: a gradient fill whose
direction and size change "without removing the original gemstone group and having to draw another",
the effect taking place immediately.[^owner] And for the door this opens to be walked through: "We also
want to expose many different forms of placement", naming linear and radial gradients, grids and lattices,
"prime spiral phyllotaxis" and "2D wallpaper group designs", with "Don't hold back on the breadth of designs
possible". "Any design should be adjustable within its respective piece of fabric, using on-screen handles
to translate, rotate, or scale."[^owner]

# What was chosen, and why **[INFERRED]**

1. **A pattern lies on one piece's flat cloth**, not projected onto the body. The flat shape exists already
   for the fabric,[^flatten] stones are pressed on flat pieces,[^rules] and it is the one space where a lattice
   stays a lattice round the side of the body. A pattern therefore stops at a seam: "within its respective
   piece of fabric".
2. **Stability over perfect packing.** Random placement that restarts on every change would shimmer as a
   handle moves, however fast it ran. Candidates are fixed and ranked; density only switches them on and off.
   A very dense area is a little less tightly packed than dart throwing from scratch would make it.
3. **One gradient drives density, size and colour**, set by two points, so every shape of gradient has the
   same two handles. Stones step through the sizes that are sold.
4. **Patterns are one new kind of group**, not a rewrite: older groups keep working and gain per-group
   caching. The Rows & fills tool now lays a pattern when it is clicked on a piece.

Design and numbers: [Procedural stone patterns](/engineering/architecture/procedural-stone-patterns.md).

[^owner]: Owner's brief, 2026-10-30
[^flatten]: Pattern pieces and flattening
[^rules]: Stone placement rules
