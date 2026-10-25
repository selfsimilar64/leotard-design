---
type: Decision
title: Simplify the app around building blocks and starting points
description: "Owner direction of 2026-10-23: strip the interface to what crafting a leotard needs (settings and rarely used controls go behind the settings panel or a disclosure); offer simple starting points (the plainest a tank with a gradient front, a solid back, a crew neck and no stones) beside the moodboard designs; abstract the common moodboard patterns into mix-and-match elements (neckline, back, sleeves, leg, front top, waist seam); picking an element changes only that element, asking first when it would take something away; materials ordered by how often the moodboard uses them; precise tools stay for the rest."
tags: [decision, ux, side-panel, building-blocks, presets, materials]
status: stable
generated: { by: claude-code/claude-fable-5-1, at: 2026-10-23T12:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-23 (Claude Code session)
    title: "Let's drastically simplify this application"
    author: human:mattj
---

# Decision

The owner asked to make the designer app drastically simpler, around how someone crafts a
leotard from scratch.[^owner]

1. **Remove or hide what is redundant or not central.** Settings and the like stay in the
   settings panel; powerful functions exist but are discovered as needed, not offered up front.
2. **Starting points.** Beside the preset designs (the moodboard rebuilds, which showcase what is
   possible), simple starting points that leave room for creativity. The simplest: a plain tank
   with a vertical gradient front, a solid back, a standard crew neck, no sequins or gemstones.
3. **Abstracted elements from the moodboard.** Re-examine the moodboard for common design patterns
   and expose them as the elements the app's tools and interface are organised around, so a
   designer recognises how real designs are represented: the neckline and the back, and the same
   kind of choice for the front (its top and its lower part).
4. **An element changes only itself.** Choosing a neckline, back, leg line and so on changes that
   element and never resets the leotard. If the choice would disrupt the design, ask the person
   and keep as much of their design as possible while still switching.
5. **Materials in order of likelihood**, the most popular first.
6. **Mix-and-match plus precise edits**, so the whole range of designs is reachable without
   slaving away with tools.

# Consequences

- The count the elements are drawn from: [moodboard common patterns](/domain/moodboard/common-patterns.md).
- Implementation: [building blocks and starting points](/engineering/app/building-blocks-and-starting-points.md);
  the earlier [side panel](/engineering/app/side-panel-and-presets.md) record describes what
  stays (model, scene, materials picker, thumbnails).
- Earlier decisions stand: a design or starting point changes only the leotard
  ([owner review of 2026-10-21](/decisions/2026-10-21-owner-review-presets-poses-stacy.md)),
  picture tiles instead of drop-downs ([visual panel](/decisions/2026-10-21-visual-panel-two-appearances.md)).

[^owner]: Product owner, 2026-10-23.
