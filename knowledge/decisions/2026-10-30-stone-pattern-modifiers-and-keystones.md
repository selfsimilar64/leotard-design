---
type: Decision
title: Patterns have a frame, stacked modifiers and keystones
description: "Owner's tuning notes of 2026-10-30 on the first version of stone patterns: placing moves the whole pattern with its mask, gradients become stacked modifiers on density, size and colour, arrangements give their stones their own sizes, what a design hangs on is placed first, handles are specific to each kind of pattern and always visible, and every control must do something."
tags: [decision, stones, crystal, procedural, patterns, handles, modifiers]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-30T18:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-30 (Claude Code session)
    title: "Tune it until it is maximally powerful and has the highest fidelity"
    author: human:mattj
  - id: first
    resource: /decisions/2026-10-30-procedural-stone-patterns.md
    title: Stone groups are live procedures on the flat cloth
  - id: design
    resource: /engineering/architecture/procedural-stone-patterns.md
    title: Procedural stone patterns
---

# Decision

After a first try of the patterns the owner asked to "tune it until it is maximally powerful and has the highest
fidelity",[^owner] with these notes:

- Some sliders had no effect, and the handles on the viewport could not be seen.
- "Place on the piece" moved the stones inside their mask; it should move "the entire pattern/mask itself". A radial
  gradient's across and up change its centre; any gradient can go "wherever I want on the fabric and in whichever
  direction". The old behaviour stays as a "Pattern positioning", last in the menu.
- Handles are "specific to each pattern or class of pattern": a linear gradient has "rectangular bounds which are
  visible and can be adjusted".
- The total crystal count is prominent, and told apart from the count of the pattern being edited.
- Sizing baked into the pattern, as in Bubbles, is wanted in many patterns, "especially for the fractal patterns".
- Size, density and possibly colour have their own modifiers, added at the end of the menu ("Add Modifier +"), several
  on one thing if wanted ("a linear gradient on size plus a radial gradient on size").
- Crystal colour and size just under the arrangement's parameters. Presets labelled as such, in at most two rows, with a
  way to see them all. Sliders can be reset, and take a typed value. A preset updates every slider. The spirals' Keep
  control goes.
- Stones missing at positions "crucial to the design, like corners, centers": why, and how to make placement robust so
  that it "preserves the pattern's essence".

# What was chosen, and why **[INFERRED]**

1. **A frame and a plane.** The frame (`x, y, rotate, scale, flip`) carries the arrangement and its modifiers. The plane
   (`px, py, pturn, pscale, sx, sy`) is the old behaviour. A pattern starts on the piece's middle; a design of its own
   size (a rose, a gasket) where it was clicked.
2. **Modifiers replace the one gradient.** A modifier is a field and what it acts on. Size is a factor of the crystal's
   size rather than two absolute sizes, so that the crystal's own size slider never goes dead and two can stack by
   multiplying. Fields that follow the pattern (along it, by family, at random, by crystal size) are the same kind of
   thing, which removed "Size follows", "Colours follow" and the mixed second size as separate controls. Colour is
   a list of stops where one may be "the crystal's own", so that colour modifiers layer.
3. **Bounds cut by default on density only.** A density modifier with bounds is the mask the owner describes. Size and
   colour outside bounds are left alone.
4. **Keystones, and the flat cloth as the judge.** Corners, centres and crossings have their own stones, placed first;
   each stretch between holds a whole number, spread to fit. A pattern's own stones are kept apart on the flat cloth,
   where they are pressed, not on the body, whose flat map shrinks by up to 15% in places. The price: stones laid touching
   can overlap slightly on the render where the map shrinks. The gain: lines no longer lose every other stone.
5. **Stones are spaced on the cloth.** Layouts draw through the pattern's map, so scale, stretch and distortion leave a
   line's stones evenly spaced, and sizes that change along a line carry the spacing with them. This needs a cached
   drawing of pen moves instead of cached candidates for the heavy layouts.
6. **Handles left the 3D scene.** An SVG layer over the canvas cannot be hidden by stones, bloom or the H key.
7. **A test holds every control to account**: every slider of every preset, over its range, must change the stones;
   Reshuffle shows only where the seed matters. Controls that do nothing in the current state hide (`when`).

Design and numbers: [Procedural stone patterns](/engineering/architecture/procedural-stone-patterns.md). It builds
on [the first decision](/decisions/2026-10-30-procedural-stone-patterns.md), whose third point (one gradient drives
density, size and colour) this replaces.

[^owner]: Owner's tuning notes, 2026-10-30
[^first]: Stone groups are live procedures on the flat cloth
[^design]: Procedural stone patterns
