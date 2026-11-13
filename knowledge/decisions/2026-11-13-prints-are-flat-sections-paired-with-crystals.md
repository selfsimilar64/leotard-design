---
type: Decision
title: Prints are flat sections of at most three colours, each paired with a crystal pattern
description: "Owner direction of 2026-11-13, after seeing the first 175 printed presets: keep only eighteen named ones and whatever corresponds one to one to a gemstone pattern; from now on a printed pattern exists only as the pair of a gemstone pattern; prints are discrete parts with no gradients; at most three colours (a background that is the fabric's own, and two accents that start as shades of the fabric), each of which can be transparent; the mandalas redone to the detail of real ones in that flat form."
tags: [decision, prints, patterns, stones, crystal, mandala, ink, colour]
status: stable
generated: { by: claude-code/claude-fable-5-2, at: 2026-11-13T18:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-13 (Claude Code session, second message)
    title: "Narrow these selections down to only the most beautiful; printed patterns paired with gemstone patterns; discrete parts, no gradients, at most 3 colours; craft mandala shaders"
    author: human:mattj
  - id: first
    resource: /decisions/2026-11-13-printed-patterns-one-feature-with-crystals.md
    title: Printed patterns and crystal patterns are one feature
  - id: design
    resource: /engineering/architecture/printed-patterns.md
    title: Printed patterns
---

# Decision

Having seen the first printed designs (45 designs, 175 presets), the owner narrowed them the same day:[^owner]

1. **Only the most beautiful stay.** "Wavy Steps, Star Burst, Diamond Steps, Facet Steps, Scales, Sea Waves, Peacock,
   Interlocking Circles, Lotus, Star Flower, Tumbling Blocks, Stars, Hearts, Flowers, Moons, Layered Waves, Hills, Julia
   Set. These are the only ones that are remotely interesting to me. Any other should only stay if it is a 1-to-1
   correspondent to a pre-existing gemstone pattern."
2. **Pairs only, from now on.** "Moving forward, we should only ever have a printed pattern if [it] corresponds directly
   to a gemstone pattern. They will be paired."
3. **Discrete parts.** "Printed patterns should really only be made up of discrete parts, with no gradients, for now."
4. **At most three colours.** "1 being the 'background' color which should inherit from the fabric (this could just be
   thought of as being transparent), 2 and 3 being accents. I imagine most patterns could suffice with a single accent
   color. Accent colors should also inherit the fabric color by default, but with some adjustment so that it actually
   stands out against the background color. These 3 'sections' of the pattern should each have a color choice which
   includes transparent."
5. **Mandalas.** "The mandala attempts are lacking. Lotus is the best one. Take a look at actual mandalas and craft
   shaders that achieve their level of detail in a way that translates well to this discrete format."

This replaces points 2 (halftones of a design) and 4 (the Softness slider) of the first decision;[^first] its points 1,
3, 5 and 6 stand.

# How it was carried out **[INFERRED]**

- **What "paired" is taken to mean.** Every printed design is, by construction, also a crystal pattern: its crystals
  run along the edges of its shapes or fill its sections, read from the same shader. Every crystal layout prints as its
  own lines and dots. So no print exists without its crystal twin. The gallery is one list again (no switch between
  "colour designs" and "lines and dots"); a design from it is laid as print with crystals by the Sparkle tool, as print
  by a piece's Print face.
- **Removed**: 35 designs (all blends, sweeps, stripes, checks, tartan, argyle, houndstooth, dots, mirror lines,
  kaleidoscope, sunburst, spiral, rose window, engraved rosette, snowflake, vortex, hyperbolic disc, the 17 wallpaper
  groups, wave crystal, Chladni, ripples, honeycomb, facets, bricks, stained glass, truchet, quasi tiles, clouds, veins,
  liquid, agate, flames, leopard, galaxy, lava, Newton, lace) and the "Jewelled" family. None was kept as a
  "correspondent": where a crystal layout of the same idea exists (stripes, chevrons, truchet, spiral, sunburst...) it
  already prints as itself.
- **Three sections in the shader, not a ramp.** A design paints shapes into the ground, the accent or the second accent;
  the shader keeps two distances (to the edge of what is printed, to the edge of the second accent) and nothing else. An
  edge is one texel soft. Softness, colour ramps, repeats, balance, strength, tint and outline colours are gone.
- **A section's colour**: clear (the fabric's own), a shade of the fabric (lighter or darker in OKLab lightness; to begin
  with chosen automatically: lighter on a dark fabric, darker on a light one, the second accent further than the first), or
  a colour. A shade follows the fabric when its colour changes. Presets name no colours.
- **Mandalas**: one new design drawn the way mandalas are drawn by hand: rings round a small flower, each ring a row of one
  motif (pointed petals with an inner line, a seed and a dot off the tip, a second row showing between them; bands of
  pearls; scallops; rays; chains of circles; bands of teeth), widening outwards, every other ring turned half a step, inner
  rings lying over outer ones. Five ring orders and a shuffled one; drawn as line art, filled, every other ring filled, or
  solid. No reference pictures were looked at in the session (the browser pane could not show images at the time): the
  construction is from what is generally known of mandala drawing. **[UNVERIFIED against references]**

Design and numbers: [Printed patterns](/engineering/architecture/printed-patterns.md).[^design]

# Consequences

- A record of a removed design goes on as Steps (the old blend) or Tumbling blocks (the old tiles), otherwise as plain
  pavé crystals.
- A record with the old colour ramp prints its first two printed colours as its accents.
- Crystals "sized by tone" are gone with the gradients they followed.

# Revisit if

The owner asks for gradients again ("for now"), for more than two accents, or names further designs to pair.

[^owner]: Conversation with the product owner, 2026-11-13, second message.
[^first]: Printed patterns and crystal patterns are one feature.
[^design]: Printed patterns.
