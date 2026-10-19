---
type: Domain Concept
title: Consumer garment creators in games and apps
description: "Four structures (whole-item assembly, template recolour, painting panels, auto-fitting 3D items) and what makes the fluid ones work: few meaningful choices, result always on a body, cheap experimentation, a brief, and a remix loop."
tags: [ux, games, reference, presets]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-tools
    resource: /references/research/existing-tools-and-ux-mechanics.md
    title: "Research notes: existing tools and UX mechanics (section 2)"
  - id: dti
    resource: https://en.wikipedia.org/wiki/Dress_to_Impress_(video_game)
    title: "Wikipedia: Dress to Impress"
  - id: roblox-layered
    resource: https://create.roblox.com/docs/art/accessories/layered-clothing
    title: Roblox Creator Docs, layered clothing
  - id: fashion-dreamer
    resource: https://en.wikipedia.org/wiki/Fashion_Dreamer
    title: "Wikipedia: Fashion Dreamer"
  - id: style-savvy
    resource: https://en.wikipedia.org/wiki/Style_Savvy
    title: "Wikipedia: Style Savvy"
  - id: style-savvy-ff
    resource: https://en.wikipedia.org/wiki/Style_Savvy:_Fashion_Forward
    title: "Wikipedia: Style Savvy, Fashion Forward"
  - id: nikki
    resource: https://en.wikipedia.org/wiki/Infinity_Nikki
    title: "Wikipedia: Infinity Nikki"
  - id: acnh
    resource: https://nookipedia.com/wiki/Custom_design
    title: Nookipedia, custom design
  - id: sims4
    resource: https://en.wikipedia.org/wiki/The_Sims_4
    title: "Wikipedia: The Sims 4"
  - id: inzoi
    resource: https://en.wikipedia.org/wiki/Inzoi
    title: "Wikipedia: inZOI"
  - id: tiny-glade
    resource: https://en.wikipedia.org/wiki/Tiny_Glade
    title: "Wikipedia: Tiny Glade"
---

# Takeaway

Consumer garment creators fall into four structures: **whole-item assembly** (Dress to Impress,
Style Savvy, Infinity Nikki), **recolouring fixed templates** (Fashion Dreamer, The Sims),
**painting unwrapped garment panels** (Animal Crossing pro designs) and **3D items that auto-fit
any body** (Roblox layered clothing). The ones praised for fluidity pair a few high-level
primitives with instant on-body preview and a sharing loop; the ones criticised have too
restricted a design system.[^notes-tools]

# Examples

| Title | Structure | Facts |
|---|---|---|
| Dress to Impress (Roblox, Nov 2023) | Whole items | Theme plus "360 seconds"; up to 18 items; colours modifiable; others rate 1-5 stars; freeplay without timer; 651k concurrent (Aug 2024); "jankiness" (clipping) part of the appeal[^dti] |
| Roblox layered clothing | Auto-fit 3D items | Inner and outer **cage meshes** let items "stretch and fit" any avatar and layer over each other; authored externally as .fbx/.gltf[^roblox-layered] |
| Fashion Dreamer (Switch, Nov 2023) | Template recolour | Item Creator recolours unlocked patterns; "Likes" collect others' designs; criticised as "restricted"; Metacritic 62; ~500k copies, below forecast; online ended March 2026[^fashion-dreamer] |
| Style Savvy (DS, 2008-09) | Whole items, shop sim | Touch-screen; Fashion Forward sold 1 million[^style-savvy][^style-savvy-ff] |
| Infinity Nikki (2024; macOS 2026) | Whole items by attribute | Gacha clothing; Unreal Engine 5 with emphasis on fabric textures; 20M+ downloads[^nikki] |
| Animal Crossing: New Horizons | Painting panels | 32x32-pixel designs, up to 15 colours; **pro designs give separate canvases for left sleeve, right sleeve, front and back**; up to 130 shared uploads[^acnh] |
| The Sims 4 | Direct manipulation + presets | Body adjusted "by directly selecting and manipulating the respective area"; the Sims 3 "Create-a-Style" colour/pattern system was **dropped**; Gallery sharing[^sims4] |
| inZOI (2025) | Generative AI | AI patterns and objects; 470k+ Canvas uploads; negative reviews after the AI announcement[^inzoi] |
| Tiny Glade (2024) | Frictionless builder (not garments) | No tasks or story; custom Bevy (Rust) engine; "a small slice of flow state"; bundled with Dressmaker on Steam[^tiny-glade] |

# What makes them feel fluid

**[INFERRED]** from the comparison:[^notes-tools]

- A short list of meaningful choices rather than open-ended parameters.
- The result always visible on a body.
- Direct manipulation of the thing itself (Sims 4 push-and-pull instead of sliders).
- Cheap experimentation: freeplay modes, no fail state.
- A remix loop: copy and alter other people's work (Animal Crossing, Fashion Dreamer, Sims Gallery, inZOI).
- **A brief focuses creativity**: theme plus timer, customer preferences, commission card. A
  professional tool can start a design from team colours, level/age group and budget band.

# Lessons for role-restricted views

- **[INFERRED]** Template-plus-recolour is exactly what brand configurators do and draws the same
  "restricted" complaint ([brand design studios](/domain/market/brand-design-studios.md)). The
  Sims 3 to 4 change cuts both ways: removing free colour control simplified the tool but was a
  noted loss. **Presets should be the fast path, not the only path**; this matters for how far
  the [coach view](/product/personas/coach-and-gym-owner.md) is locked down.[^notes-tools]
- **[INFERRED]** Animal Crossing's per-panel canvases are the closest consumer analogue to "a
  garment made of panels, each with its own surface".[^notes-tools]
- **[INFERRED]** Roblox's cage approach shows how one garment fits many bodies without
  re-authoring, relevant to previewing a design across sizes.[^notes-tools]
- Share-and-remix loops are a consumer pattern; share-by-link is
  [not a priority](/decisions/2026-10-13-native-desktop-and-ipad-target.md) for this product.

# Gaps

Infinity Nikki dye system, Style Savvy design features, Sims 3 Create-a-Style details, Animal
Crossing editor tools (mirror, fill), and dedicated consumer fashion-design apps were not covered.[^notes-tools]

[^notes-tools]: Research notes, existing tools and UX mechanics, section 2
[^dti]: Wikipedia, Dress to Impress
[^roblox-layered]: Roblox Creator Docs
[^fashion-dreamer]: Wikipedia, Fashion Dreamer
[^style-savvy]: Wikipedia, Style Savvy
[^style-savvy-ff]: Wikipedia, Fashion Forward
[^nikki]: Wikipedia, Infinity Nikki
[^acnh]: Nookipedia
[^sims4]: Wikipedia, The Sims 4
[^inzoi]: Wikipedia, inZOI
[^tiny-glade]: Wikipedia, Tiny Glade
