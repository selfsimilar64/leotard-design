---
type: Decision
title: Every shader compiled at the start; one kind of lighting; shadows off changes no shader
description: "Owner direction of 2026-11-09: every shader variant is compiled behind the start's curtain so nothing compiles once the designer is working, and nothing is done in the background. To keep that affordable the softbox studios are removed (the photographed studios share one set of variants) and Settings > Shadows Off draws no shadow without changing a shader."
tags: [decision, startup, shaders, lighting, shadows, performance]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-09T02:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-09 (Claude Code session)
    title: "Make sure all shader variants are compiled at startup, so the user pays a one-time wait on the loading screen and then everything just works, with nothing done in the background or for the first time when somebody clicks. Remove the softbox studios, keep shadows off."
    author: human:mattj
  - id: measured
    resource: /engineering/app/startup-and-slow-changes.md
    title: Start-up curtain, shader pre-compiling and slow changes (measurements of 2026-11-08 and 2026-11-09)
---

# Decision

Every shader the app can draw with is compiled at the start, behind the curtain (`render/warmup.js`, run by
`main.jsx reveal`), and nothing compiles in the background or on first use.[^owner] It replaced the background
pass of 2026-11-08 (`render/prewarm.js`, removed).

To make that a wait of seconds rather than minutes the variants were cut where they multiplied:[^measured]

- **The softbox studios are removed** ("Softbox studio" and "Softbox studio, key and fill"): each kind of lighting needs
  every variant again, and the six photographed studios already share one set. This supersedes
  [the softbox studio for satin](/decisions/2026-10-27-softbox-studio-for-satin.md). Its reflection room is kept in
  `render/studio.js` (`PRODUCT_ROOM`) only for re-rendering the fabric picker's thumbnails (`dev/thumbnails.js`).
- **Shadows off draws no shadow without changing a shader**: the key light keeps casting at shadow strength 0 and its
  map is no longer rendered (`Viewport.applyDisplay`). Soft and Detailed are unchanged. The owner's words were "keep
  shadows off", read as keeping the Off option; shadows stay on by default.

# Consequences

- The first start after a shader or the browser changed waits on the curtain while every variant compiles (149 s
  measured on the GTX 1650 with every shader's cache missed, the curtain lifting at 160 s on the dev server; most of
  it the fabric shader's size); every other start spends ~7 s here, each variant set up again from the browser's
  shader cache.
- Later the same day the owner asked for each fabric to hold only its own code (`materials/fabric.js fabricDefines`):
  more variants (104 programs, from 84) but each far smaller. With every cache missed the curtain lifts at 52-69 s; a
  warm start's warm-up is ~7.4 s, ~9.7 s on the starts where one program misses the cache. Looks unchanged (within
  1/765 on every fabric).
- `?quick` in the address compiles only what the design shows, for look-dev reloads after a shader change.
- The shader tour (`app/src/dev/shader-tour.js`) is the check: after the start it walks every option a designer can
  reach and lists any step that compiled. When the app gains a material, a mesh kind or a lighting change, the warm-up
  and the tour are updated together.

# Revisit if

A new studio or effect needs another kind of lighting (it multiplies the variants again), or the start's wait grows:
the ways left are listed in [start-up and slow changes](/engineering/app/startup-and-slow-changes.md) (Left to do).

[^owner]: Conversation with the product owner, 2026-11-09.
[^measured]: Start-up and slow changes, sections on variant costs and what splits a variant.
