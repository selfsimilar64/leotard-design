---
type: Technique
title: Procedural, editable stone strokes with release to stones
description: "Store each brush stroke and its settings and derive the stones from them, so size, colour and spacing stay editable; a 'release' command converts a stroke to individual stones for hand finishing. Acceptance tests come from CLO's rhinestone defects."
tags: [ux, crystals, brushes, non-destructive, undo]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-tools
    resource: /references/research/existing-tools-and-ux-mechanics.md
    title: "Research notes: existing tools and UX mechanics (sections 1, 5, 6)"
  - id: report
    resource: /references/research/research-report.md
    title: "Research report: Borrow the engine, build the sparkle"
  - id: notes-geometry
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement"
  - id: painter
    resource: https://www.adobe.com/products/substance3d/apps/painter.html
    title: Adobe Substance 3D Painter
  - id: nomad
    resource: https://nomadsculpt.com/manual/tools.html
    title: Nomad Sculpt manual, tools
  - id: clo-rhinestone
    resource: https://support.clo3d.com/hc/en-us/community/posts/16324669191065-Rhinestone-placement
    title: "CLO community thread: Rhinestone placement (search snippet)"
  - id: stitch-era
    resource: https://edutechwiki.unige.ch/en/Stitch_Era_-_creating_hot_fix_designs
    title: EduTech Wiki, Stitch Era hotfix tutorial
  - id: allthings
    resource: https://allthings.how/?p=207842
    title: AllThings.How Dressmaker guide
---

# Takeaway

A stone brush should record **the stroke and its settings**, not just the stones it produced, and
derive the stones on demand. Changing size, colour, spacing or the path later re-flows the stones.
A **"release to stones"** command converts a stroke into individually editable stones for hand
finishing.[^report][^notes-geometry] This is Substance Painter's model ("Every action and stroke is
recorded and can be recomputed at any time")[^painter] applied to crystals, and the opposite of
Dressmaker's "no full undo for decoration".[^allthings]

# Model **[INFERRED]**

| Object | Holds | Editable later |
|---|---|---|
| Stroke | Path or region on the body, stroke type (line, curve, fill, scatter), spacing rule, stone size/colour/type, jitter, symmetry flag | Everything; stones re-derive |
| Released stones | Individual positions on the body surface | Each stone moves, recolours, deletes; no longer re-derives |

Every brush reduces to: a curve or region on the body, a rule for spacing points along or within
it, and a collision check that removes overlaps.[^report] Positions should be stored as addresses on
the body surface so stones ride along when the body changes size or pose; the geometry is the
subject of other concepts (see [/engineering/rendering/](/engineering/rendering/about.md) and the
geometry notes).[^notes-geometry]

# Acceptance tests from CLO's failures

CLO users placing rhinestones as a repeated topstitch object reported (snippet; thread blocked):[^clo-rhinestone]

1. Stones distort on curved or diagonal lines → **stones keep their shape and spacing on curves**.
2. The last stone in a row comes out much wider → **row ends never stretch**.
3. Mirror-pasted stones rotate sideways or upside down away from centre front → **mirrored stones
   keep correct orientation**; symmetry is a live parent (Nomad's "mirror repeater"),[^nomad] not a
   one-off copy.

Plus, from hotfix software: overlaps are flagged and solvable automatically;[^stitch-era] and from
the report: because stones are rigid and the fabric stretches, the overlap check must run both on
the body and on the relaxed, off-body garment.[^report]

# Role relevance

**[INFERRED]** A designer-authored stroke is also a natural unit for a coach to customise: a
template can expose a stroke's colour or stone size while locking its path. Released stones are a
designer-only operation. The seamstress output needs the final derived stones per piece and size
(see [/domain/construction/](/domain/construction/about.md)).

[^notes-tools]: Research notes, existing tools and UX mechanics
[^report]: Research report, geometry and Dressmaker sections
[^notes-geometry]: Research notes, garment geometry and placement
[^painter]: Adobe Substance 3D Painter page
[^nomad]: Nomad Sculpt manual
[^clo-rhinestone]: CLO community thread, snippet
[^stitch-era]: EduTech Wiki, Stitch Era
[^allthings]: AllThings.How
