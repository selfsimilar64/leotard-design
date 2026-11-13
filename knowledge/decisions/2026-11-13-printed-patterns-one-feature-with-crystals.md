---
type: Decision
title: Printed patterns and crystal patterns are one feature
description: "Owner direction of 2026-11-13: shaders draw colour designs directly on the fabric as they generate gemstone patterns; where applicable the same pattern is offered as gemstones, since stones are placed to accentuate a print; a control runs from hard edges to smooth gradients; prints and gemstone patterns are one cohesive feature; the selection is widened and every artistic parameter exposed."
tags: [decision, prints, patterns, stones, crystal, shaders, ink]
status: stable
generated: { by: claude-code/claude-fable-5-2, at: 2026-11-13T12:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-13 (Claude Code session)
    title: "Allow shaders to be used for color designs directly on the fabric; offer the same as gemstones; control how smooth print gradients are; one cohesive feature"
    author: human:mattj
  - id: design
    resource: /engineering/architecture/printed-patterns.md
    title: Printed patterns
  - id: stones
    resource: /decisions/2026-10-30-procedural-stone-patterns.md
    title: Stone groups are live procedures on the flat cloth
---

# Decision

**Narrowed the same day**: gradients, the Softness slider, halftones and all but eighteen presets were withdrawn by
[Prints are flat sections of at most three colours, each paired with a crystal pattern](/decisions/2026-11-13-prints-are-flat-sections-paired-with-crystals.md).
Points 1, 3, 5 and 6 below stand.

The owner asked that "the same way we use shaders to generate gemstone patterns, we should allow shaders to be used for
color designs directly on the fabric as well", and that "for applicable patterns, we should offer the same as
gemstones, as sometimes gemstones are placed to accentuate a printed pattern". Further: "parameters that control how
smooth print gradients are, with the lower end being hard edges"; "both gemstone patterns and printed patterns to be one
cohesive feature"; "expand on the available selections, exploring all sorts of symmetries, mandalas, any kind of
beautiful 2D patterns"; "expose any and all parameters relevant to artistic control". The owner also left the codebase
free to be refactored or reinvented where that serves the app.[^owner]

# What was chosen, and why **[INFERRED]**

1. **One record, made three ways.** A pattern is made as crystals, print or both (`params.as`), instead of a second
   kind of object for prints. So a print has the frame, handles, presets, distortions and modifiers a crystal pattern
   already had,[^stones] and "both" needs no linking of two things.
2. **Both directions.** A printed design can lay crystals (along its colours' edges, over chosen colours, as a
   halftone); a crystal layout can print (its lines and dots as ink). Read as: "applicable" is every design and every
   layout, since both work from what the pattern already is.
3. **Crystals are read from the print**, not computed beside it, so they cannot drift from it.
4. **Softness is one slider on the colours**, from flat hard-edged bands to one blend, the same for every design.
5. **The fabric shader is left alone.** A print is drawn into a picture per piece and shown through the print slot the
   fabric already had. Every fabric's shader is compiled at the start and kept in two renderers' versions; adding
   designs to it would have multiplied both.
6. **Sublimation's limits are not enforced**: any ink on any fabric and colour, as the rest of the app treats rules
   (deferred).

Design, numbers and limits: [Printed patterns](/engineering/architecture/printed-patterns.md).[^design]

# Consequences

- The Sparkle card's Pattern tool and a piece's new Print face both lay the same thing. A pattern that is only print
  belongs to its piece (Fabric); one with crystals to Sparkle.
- The pattern card's Distort face became "Bend it" under Place, to make room for Colours.
- A piece's older "print image" (Details) still works where no pattern prints on the piece.

# Revisit if

Prints must run across seams, or the owner wants a print's hard edges sharper than a texel of the piece's picture
(about a third of a millimetre on a front piece).

[^owner]: Conversation with the product owner, 2026-11-13.
[^design]: Printed patterns.
[^stones]: Stone groups are live procedures on the flat cloth.
