---
type: Decision
title: "Full-screen stage, frosted-glass panes, nothing in a scrolling list"
description: "Owner direction of 2026-11-09: redesign the interface from scratch for frictionless interaction; the canvas full-screen with every panel a frosted-glass overlay; capability exposed in intuitive, context-specific, minimalist form; no category dumped into a vertically scrolling pane; dead simple, efficient, gorgeous, clever; iPad as well as desktop; a powerful artistic design tool treated as one."
tags: [decision, ux, interface, glass, ipad, layout]
status: stable
generated: { by: claude-code/claude-fable-5-2, at: 2026-11-09T22:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-09 (Claude Code session)
    title: "Redesign this application's UI/UX from scratch"
    author: human:mattj
---

# Decision

The owner asked for the interface to be redesigned from scratch.[^owner] In their words:

1. "The goal is frictionless interaction, powerful capability exposed in intuitive,
   context-specific, minimalist form."
2. "Make the canvas full-screen, with all UI panels as frosted glass overlays."
3. "Sticking everything in a category into a vertical-scrolling pane is lazy and forces the user to
   search for what they want."
4. "We want dead simple usage, efficient but gorgeous layout, sleek, and unapologetically clever."
5. "Keep in mind that we are targeting iPad as well as desktop."
6. "This is a powerful artistic design tool - treat it like one."

# What was taken from it **[INFERRED]**

These are the rules the build follows; they are our reading, not the owner's words.

- **The leotard is the interface.** With nothing in hand the window holds the stage and four small
  panes of glass. Touching a part of the leotard is how its controls are found; nothing has to be
  looked for in a list first.
- **One card, for what is in hand.** A single pane at the right shows the part chosen, else the tool
  that is on, else the kind of work picked. It is there only while it is needed.
- **No card scrolls.** What can be changed about a part is split into two to six faces, each small
  enough to fit an iPad on its side (1024 x 768). Only lists of what the designer has made (pieces,
  lines, crystal groups, saved designs) may scroll: they have no limit.
- **Places on the body are shown on the body.** The cut's elements are named beside the mannequin
  with leaders to where they are, as on a garment's spec sheet.
- **The model never moves unless the designer or a close-up they asked for moves it.** Opening or
  closing a card does not slide the figure.
- **The glass gets out of the way.** A slider being dragged clears its own card away; one key (or
  the eye on the view chip) puts all of it away.
- **One vocabulary kept.** Shape, Fabric, Sparkle and Stage stay as the four kinds of work
  ([2026-10-29](/decisions/2026-10-29-mannequin-only-interface-overhaul.md)), and every earlier
  control keeps a home.

# Consequences

- Implementation: [the glass studio interface](/engineering/app/glass-studio-interface.md).
- Supersedes the layout of [the studio interface](/engineering/app/studio-interface.md) (top bar,
  inset stage, panel of four scrolling tabs) and replaces
  [the one-screen proposal](/engineering/ux/one-screen-interface-proposal.md), whose faces it adopts.
- Earlier decisions stand: pictures instead of drop-downs, an element changes only itself and asks
  first when it would take something away
  ([2026-10-23](/decisions/2026-10-23-simplify-around-building-blocks.md)), the mannequin only
  ([2026-10-29](/decisions/2026-10-29-mannequin-only-interface-overhaul.md)), the busy note for slow
  changes.

# Revisit if

- The owner finds a face too crowded or a control too many taps away once they work with it.
- Blurred glass costs frames on the iPad (not measurable in the desktop app's preview pane, which
  draws at 30 frames a second whatever the load).

[^owner]: Product owner, 2026-11-09.
