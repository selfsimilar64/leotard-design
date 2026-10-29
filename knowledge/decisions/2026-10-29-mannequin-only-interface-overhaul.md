---
type: Decision
title: "Mannequin only, close-up thumbnails, and an interface rebuilt from first principles"
description: "Owner direction of 2026-10-29: drop the realistic person and every head (always the headless mannequin, with a switch to hide it so the leotard floats); re-render every tile picture on the matte white mannequin in the mannequin stance, each a close-up of what it shows (designs and starting points as front-and-back diptychs from the neckline to just under the crotch, leg cuts at three-quarter, fabrics filling the frame as a pinched-and-twisted sheet seen from above); square tiles except the landscape design diptychs; no horizontally scrolling lists inside the vertically scrolling panel; drop-downs only where nothing visual fits; redesign the whole interface for what the app is for, then polish it, in the manner of iPad fashion and art tools."
tags: [decision, ux, interface, thumbnails, mannequin, ipad]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-29T18:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-29 (Claude Code session)
    title: "This app UI/UX needs a major visual overhaul"
    author: human:mattj
---

# Decision

The owner asked for a major visual overhaul of the designer app.[^owner]

1. **Mannequin only.** "We are moving away from supporting the realistic skin appearance and
   displaying the head at all." The choice between a realistic person and the mannequin goes;
   the body is always the headless mannequin. A toggle may hide the mannequin, "leaving the
   leotard design floating in space".
2. **Every thumbnail re-rendered** on a mannequin in matte white plastic, in the mannequin pose.
   - Designs and starting points: **diptychs, front and back**, close-ups "from neckline to just
     under crotch", like the moodboard's photos; these may be landscape.
   - **Leg cut height**: close-ups of the leg hole at a three-quarter angle, "from just below
     crotch to just above hip".
   - **Fabrics**: close-ups that fill the whole frame, close enough to see the texture, lit and
     arranged to show the material's properties: as fabric shops show them, the camera pitched
     down onto a flat sheet pinched in the centre and twisted (or folded over itself into
     ripples).
   - Every other thumbnail is **square**, and in general a close-up of the element it shows.
3. **No scroll battles.** The right side was full of sideways-scrolling rows inside a panel that
   itself scrolls vertically, so scroll gestures fought each other.
4. **Drop-downs only** where no simple selector or thumbnail represents the choices.
5. **First principles, then polish.** "Don't think 'the app is a certain way already, so I'll
   adjust it'. Instead think 'what does this application want to be?'" Then a polishing pass
   (spacing, icons, hover states, animations), taking inspiration from fashion and art design
   tools, especially iPad ones. "Leave no aspect of the current interface untouched."

# What the app was taken to be **[INFERRED]**

One garment, one canvas: the 3D mannequin is the canvas and everything else is a catalogue of
choices about the leotard (its cut, its pieces' fabrics, its sparkle) or about how it is shown
(body, pose, studio). From that: the stage takes most of the window; the panel is organised by
the kind of work (Shape, Fabric, Sparkle, Stage), not by data type; the canvas tools became
modes started from the tab they belong to (the left tool rail went, the decision of
[2026-10-23](/decisions/2026-10-23-simplify-around-building-blocks.md) asked for powerful
functions "discovered as needed"); file-level choices (starting points, finished designs, saves)
moved to a full-window library; every choice is a wrapping grid of pictures, a segmented
control, a switch or a slider; the view turns to the element being changed.

# Consequences

- Implementation: [the studio interface](/engineering/app/studio-interface.md).
- Supersedes item 3 of the [visual panel decision](/decisions/2026-10-21-visual-panel-two-appearances.md)
  (two appearances) and the Stacy items of the
  [2026-10-21 owner review](/decisions/2026-10-21-owner-review-presets-poses-stacy.md); designs
  saved with the person, her skin, a mannequin head or hair open on the matte white mannequin.
- The engine's realistic-person code (`render/figure.js`) and its baked assets stay on disk,
  unused (no design can ask for them); removing them is a separate clean-up.

# Revisit if

- The owner wants a realistic preview again (a final check on a gymnast), or heads on the
  mannequin.

[^owner]: Product owner, 2026-10-29.
