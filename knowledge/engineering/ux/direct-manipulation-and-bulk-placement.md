---
type: Technique
title: Single-stone versus brush placement
description: "Direct manipulation suits accents but is slow for many objects (NN/g), so stone placement splits into single-click placement that slides on the surface and brushes, paths and fills for volume; a heavy design is 1,500-2,000 stones."
tags: [ux, crystals, placement, brushes]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-tools
    resource: /references/research/existing-tools-and-ux-mechanics.md
    title: "Research notes: existing tools and UX mechanics (sections 3 and 6)"
  - id: report
    resource: /references/research/research-report.md
    title: "Research report: Borrow the engine, build the sparkle"
  - id: nngroup
    resource: https://www.nngroup.com/articles/direct-manipulation/
    title: Nielsen Norman Group, direct manipulation
  - id: nomad
    resource: https://nomadsculpt.com/manual/tools.html
    title: Nomad Sculpt manual, tools
  - id: blender-stroke
    resource: https://docs.blender.org/manual/en/latest/sculpt_paint/brush/stroke.html
    title: Blender manual, brush stroke methods
  - id: sylviap-nylah
    resource: https://teamwear.sylviap.com.au/products/nylah-leotard-full-sleeve
    title: Sylvia P Nylah product page
---

# Takeaway

Direct manipulation's documented weakness is bulk work: "If the user needs to perform many
actions on many objects, using direct manipulation takes a lot longer".[^nngroup] A heavy club
design carries 1,500-2,000+ stones (Sylvia P's own tiers: heavy = 1,823+),[^sylviap-nylah] which is
exactly that case. So stone placement splits in two, as the owner's brief ("one at a time or with
brushes") already proposed:[^notes-tools][^report]

| Mode | For | Interaction model | Evidence |
|---|---|---|---|
| **Single stone** | Accents, focal stones, hand finishing | Click to drop, drag to slide over the body before release; size copied from the last stone so many same-size stones are quick | Nomad Insert in Instance mode: "dragging will create and slide a new instance over the surface";[^nomad] Blender Drag Dot / Anchored[^blender-stroke] |
| **Brush / path / fill** | Volume: lines, borders, gradients, filled regions | A stroke, curve or region plus a spacing rule; stones derived from it | Blender Space, Line, Curve strokes; Hotfix Era area fills; Substance Painter paths. See [painting and sculpting tool models](/engineering/ux/painting-and-sculpting-tool-models.md) |

# Rules that follow

- **[INFERRED]** Both modes must stay editable and undoable; brush output should remain a
  procedural stroke until the user explicitly releases it to individual stones
  ([procedural stone strokes](/engineering/ux/procedural-stone-strokes.md)).[^report]
- **[INFERRED]** Symmetry on by default for both modes, live, with correct mirrored orientation.[^notes-tools]
- **[INFERRED]** Rendering and picking must comfortably handle several thousand stone instances;
  see [/engineering/rendering/](/engineering/rendering/about.md).[^notes-tools]
- **[INFERRED]** Role split: the coach view may only need coverage-level or template-stroke
  choices (as brand studios sell "logo / light / heavy"); single-stone and free brush tools belong
  to the [designer view](/product/personas/professional-designer.md). Whether coaches get any
  brush at all is a product question. See [/domain/embellishments/](/domain/embellishments/about.md).

[^notes-tools]: Research notes, existing tools and UX mechanics, sections 3 and 6
[^report]: Research report, Dressmaker and geometry sections
[^nngroup]: Nielsen Norman Group
[^nomad]: Nomad Sculpt manual
[^blender-stroke]: Blender manual
[^sylviap-nylah]: Sylvia P Nylah product page
