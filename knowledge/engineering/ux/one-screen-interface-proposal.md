---
type: Requirement
title: One-screen interface proposal (no scrolling)
description: "Proposal of 2026-11-08, awaiting the owner's review: the panel always shows one part of the leotard (the cut, a piece, a line or edge, a crystal group, lettering, the stage) named in a header with its own actions, and splits what can be changed about it into 2-5 faces (a segmented bar), each fitting one screen at 1400 x 850 and 1180 x 820; every current control mapped to a new home; four open questions. A clickable prototype is published as a private artifact."
tags: [ux, interface, panel, layout, proposal, scrolling]
status: deprecated
superseded_by: /engineering/app/glass-studio-interface.md
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-08T19:30:00Z }
sources:
  - id: owner-2026-11-08
    resource: conversation with the product owner, 2026-11-08 (Claude Code session)
    title: "Owner: scrolling is one of the worst experiences; design a UI that exposes the app's capability without complicated navigation, around what the user is trying to do"
    author: human:mattj
  - id: prototype
    resource: https://claude.ai/artifact/CrCSuHkDQb1MURdfBY6HFG
    title: One-Screen Leotard Designer (proposal and clickable prototype, private artifact)
    author: claude-code/claude-opus-5-5
  - id: code
    resource: "app/src/ui/ (Shell.jsx, Panel.jsx, ShapeTab.jsx, FabricTab.jsx, SparkleTab.jsx, PatternPanel.jsx, StageTab.jsx, kit.jsx) on build/designer-app, read for the inventory"
    title: The interface as it stands
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Superseded on 2026-11-09** by [the glass studio interface](/engineering/app/glass-studio-interface.md),
built to [the owner's direction of that day](/decisions/2026-11-09-full-screen-stage-glass-interface.md).
The faces proposed here were adopted there; the open questions below were settled by building (a
click where crystals lie chooses the crystals; Fabric fit stays in Settings; faces remember the last
one per kind of card; counts are a face of the Sparkle card).

The owner asked for an interface without scrolling, built around what the designer is trying to do
at each moment.[^owner-2026-11-08] The proposal: the designer repeats one loop (look, pick one part,
change it, look again), and the part is always one of six things, so the panel answers only "what am
I changing" (a header naming the part, with its delete, release or cut-out) and "what can I change
about it" (2-5 **faces** in a segmented bar, each fitting the screen).[^prototype] Nothing is removed;
a table in the prototype maps every current control to its new home. **[INFERRED]** design, not yet
reviewed by the owner.

# The faces

| Part | Faces |
|---|---|
| The cut (Shape) | Silhouette (all elements as small cards with their choice; the picked one's options below), Garment, Lines & straps |
| A line or edge | Finish, Look (binding, piping, tape only), Edge shape |
| A piece (Fabric) | Colour & fabric, Gradient, Details (only the settings that fabric has), Material; pieces stepped through with arrows in the header plus a list |
| Sparkle | Add crystals, On this design, Lettering |
| A crystal pattern | Arrangement (preset gallery paged, not grown), Crystal, Place (the pattern / the crystals under it), Modifiers (each with Effect, Shape, Place and size), Distort |
| Rows or a fill | Crystal, Layout |
| Stage | Figure (build and pose together), Mannequin, Studio, Effects |
| Settings | Display, Working, Fabric fit (Fitted garment / Drawn pieces in poses) |

Rules shown working in the prototype: the first face is the most used; clicking the model opens the
right part on the face last used for that kind; places on the body (a pattern's position, a gradient's
ends, a modifier's reach) are handles on the model first, sliders for exact values; picture grids are
sized to fit and long preset lists page with arrows. The prototype's `window.__audit()` renders every
face and variant at 1400 x 850 and 1180 x 820 and reported no overflow.[^prototype]

# Open questions for the owner

1. A click on the yoke where crystals lie: crystals in Sparkle, the fabric piece elsewhere (as built), or always the crystals?
2. Should Fabric fit move from Settings to Shape › Garment once it settles? (Today both halves show whatever the garment, which confused the owner on 2026-11-08: the re-fit half applies only to fitted garments, the slide and bridging half only to the drawn pieces.)
3. Faces remember the last one per kind of part (as built), or always open on the first?
4. Counts by size and colour also in Export, as an order list for the maker?

Without an obvious home: the raw "Advanced" parameters of non-pattern crystal groups (put under Group › Layout).

[^owner-2026-11-08]: Conversation with the product owner, 2026-11-08.
[^prototype]: The published prototype (private artifact).
[^code]: The interface source read for the inventory.
