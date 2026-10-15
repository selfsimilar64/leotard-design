---
type: Persona
title: Professional designer
description: Authors leotards with full control over the garment's shape - panels, necklines, backs with hand-placed straps, cut-outs, mesh sections - plus fabrics and stones.
tags: [persona, designer, roles]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T20:40:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-15 (Claude Code session)
    title: Direction for the post-POC phase
    author: human:mattj
  - id: report
    resource: /references/research/research-report.md
    title: "Research report: Borrow the engine, build the sparkle"
---

# Who they are

Professional leotard designers. They "may want to literally change the shape of the leotard,
create a new back pattern with hand-placed straps, cut out parts of the leotard or replace
sections with mesh, create a different neckline, etc."[^owner]

# Goals

- Create new garment shapes, not just recolour templates.[^owner]
- Place stones individually and with brushes, with everything editable afterwards.
- **[INFERRED]** Produce designs that a factory can make without redrawing, and publish designs
  for coaches to customise (see [who authors templates](/product/questions/who-authors-templates.md)).

# Required capabilities (from the owner's examples)

| Owner's example | What the software must support |
|---|---|
| Change the shape of the leotard | Garment outline and panel boundaries as editable curves on the body |
| New back pattern with hand-placed straps | Openings, plus straps drawn as paths with width, that may bridge skin |
| Cut out parts | Holes (cut-outs) of arbitrary shape, with finished edges |
| Replace sections with mesh | Any region re-assigned to a different fabric stack (mesh + nude lining) |
| A different neckline | Front and back neckline curves editable directly |

# Context from research

- Professional fashion CAD (CLO, Marvelous Designer, Browzwear) works pattern-first and takes
  weeks to learn; none has dedicated stone tooling.[^report] Drawing directly on the body,
  as CLO's avatar drawing and Marvelous Designer's 3D Pencil now do, confirms the direction.
- How a drawn line can be made physically (seam, appliqué or print) limits its shape; the tool
  should say which.[^report] See [/domain/construction/](/domain/construction/about.md).

[^owner]: Product owner, 2026-10-15
[^report]: Research report, tools and geometry sections
