---
type: Product Vision
title: Product vision - one design, three professional views
description: "A professional leotard design tool where coaches customise ready-made designs, designers author garments from scratch, and seamstresses receive the flattened, measured pattern, all working on the same design."
tags: [vision, roles, product]
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

# Summary

The proof of concept showed that a leotard can be designed and shown convincingly on a 3D body
in real time. The next product turns that into a **professional tool used by three different
groups**: gym owners and coaches, professional designers, and seamstresses. Each group sees a
different slice of the same capabilities.[^owner] It runs as a native desktop and iPad app
([decision](/decisions/2026-10-13-native-desktop-and-ipad-target.md)) on three.js
([decision](/decisions/2026-10-15-threejs-over-unreal.md)).

# The three users

| User | What they want | What they get | Persona |
|---|---|---|---|
| Gym owner / coach | Design a team leotard quickly, without sewing knowledge | A limited set of controls that pick from pre-made assets and designs, still allowing significant customisation | [Coach and gym owner](/product/personas/coach-and-gym-owner.md) |
| Professional designer | Full creative control over the garment itself | Change the leotard's shape: new back patterns with hand-placed straps, cut-outs, mesh replacing sections, new necklines, and more | [Professional designer](/product/personas/professional-designer.md) |
| Seamstress | Make the garment | The final design as flattened components with measurements and markings | [Seamstress](/product/personas/seamstress.md) |

These statements are the owner's.[^owner] The capability split is detailed in the
[role capability matrix](/product/role-capabilities.md).

# Guiding principles

1. **One design, several views.** **[INFERRED]** All three groups work on the same underlying
   design. Restricting a role means hiding or locking controls, not maintaining a separate
   product or a separate file format. This keeps a coach's design manufacturable without
   re-entry, and a designer's change visible to the seamstress immediately.
2. **A leotard maker runs it; its clubs customise.** The pre-made designs coaches customise come
   from a leotard maker's catalogue ([decision](/decisions/2026-10-15-coach-designs-come-from-maker-catalogue.md)).
   The maker's designers author and publish them, choosing which parts a coach may change
   (colours, fabrics, stone pattern, sleeve length) and which are fixed (panel shapes, seams);
   the maker's seamstresses make the result. Designs travel between people as
   [files](/decisions/2026-10-15-design-files-for-handover.md).
3. **Everything ends as something a factory or seamstress can make.** The garment is produced as
   flat pieces, decorated flat, then sewn, so the design has to resolve into flat pattern pieces
   with stone maps and a material list.[^report] See [/domain/construction/](/domain/construction/about.md).
4. **Appears correct, not physically correct.** The picture must look right to the eye
   ([decision](/decisions/2026-10-13-appears-correct-not-physically-correct.md)).
5. **Frictionless editing.** Every change is undoable; strokes stay editable after the fact; a
   change on one size carries to all sizes. See [/engineering/ux/](/engineering/ux/about.md).

# What the POC already proves, and what it does not

Proven: real-time leotard fabrics (mystique, hologram, velvet, mesh, glitter, wet look),
thousands of rendered crystals, one design fitting four body sizes, mannequin and dress-form
presentation. Not yet possible: changing the garment's shape without writing code, any notion of
panels and seams, flat pattern output, saving a design, undo, and role-specific views. The gap is
analysed in [POC-to-product gap](/engineering/architecture/poc-to-product-gap.md).

# First release

Designer tools first, proven by pattern output: draw on the body, get a panel, see and print its
flat piece ([decision](/decisions/2026-10-15-designer-first-proven-by-patterns.md)). Seamstress
output is a printable PDF ([decision](/decisions/2026-10-15-printable-pdf-patterns.md)). The coach
view follows as a restricted mode over the maker's catalogue.

# Out of scope for now

Competition rule checks and pain-point research
([deferred](/decisions/2026-10-13-defer-competition-rules-and-pain-points.md)); share-by-link
([not a priority](/decisions/2026-10-13-native-desktop-and-ipad-target.md)).

[^owner]: Product owner, 2026-10-15
[^report]: Research report, factory production section
