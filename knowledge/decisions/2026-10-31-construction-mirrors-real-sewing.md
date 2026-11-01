---
type: Decision
title: The design model mirrors how a leotard is really cut and sewn
description: "Owner direction of 2026-10-31: fabric pieces and construction are modelled as accurately as possible, because a later export must correspond directly to pieces cut and sewn in real life; so designs are cut from named materials, a shape sewn on top is an overlay and not a seam, and each line says how it is sewn."
tags: [decision, construction, materials, applique, seams, export]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-31T18:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-31 (Claude Code session)
    title: "Rebuilding a moodboard leotard by hand; construction must translate to printing and sewing"
    author: human:mattj
  - id: realisations
    resource: /domain/construction/design-line-realisations.md
    title: Three ways to make a design line
  - id: applique
    resource: /domain/construction/applique-and-overlays.md
    title: Appliqué and overlays
---

# Decision

Rebuilding a moodboard leotard by hand, the owner found seams that came out irregular, mirrored pieces that
were not linked, and a colour that had to be changed piece by piece, and asked for materials that are created
once and assigned to pieces.[^owner] The design had thin edges on what looked like fabric sewn on top, which
the app had no way to make. The owner then set the rule behind all of it: "We definitely want to be modelling
fabric pieces and construction internally as accurately as possible", because a later export will output
pieces and measurements that "correspond directly to pieces that will be cut and sewn together in real life".[^owner]

# What was chosen, and why **[INFERRED]**

1. **A material is what is bought.** Pieces, straps and coloured finishes are cut from a named material; a
   change to it reaches them all, and the list is the design's bill of fabrics. Grain, gradient and print stay
   on the piece, because they depend on where the piece sits.
2. **An overlay is not a seam.** A shape sewn on top leaves the fabric under it whole at cutting (makers often trim beneath it afterwards: [refined](/decisions/2026-10-31-draw-first-decide-how-it-sews.md)). That is appliqué,[^applique]
   one of the three real ways to make a line,[^realisations] and it exports differently: its own cut piece
   with no seam allowance, and a placement line on the piece it is sewn onto.
3. **Only finishes a line can really take are offered.** Elastic and binding go on an opening; a line with
   fabric on both sides is a seam whatever it is called. A plain seam has no width control, because its stitching
   is inside; every visible finish has one, over a range that is a working assumption until a maker confirms it.
4. **The owner's reference design** was judged to be a mesh bodice with two satin plates appliquéd on
   it, not pieces joined edge to edge. That reading comes from a photo and is not confirmed by the maker.

Design and numbers: [The construction model](/engineering/architecture/construction-model.md).

[^owner]: Owner's brief, 2026-10-31
[^realisations]: Three ways to make a design line
[^applique]: Appliqué and overlays
