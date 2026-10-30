---
type: Design Note
title: The Mirror toggle and paired parts
description: "One toolbar toggle decides whether an edit reaches both sides of the body. Mirror off, an edit of a paired part splits the pair permanently; there is no per-part mirror control."
tags: [architecture, symmetry, mirror, editing, ux]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-30T12:50:00Z }
sources:
  - id: model
    resource: /engineering/architecture/design-document-model.md
    title: Design document model
  - id: zbrush
    resource: https://novedge.com/blogs/design-news/zbrush-tip-efficient-mirror-symmetry-workflows-in-zbrush
    title: "ZBrush tip: mirror symmetry workflows (X toggles symmetry)"
  - id: painter
    resource: https://experienceleague.adobe.com/en/docs/substance-3d-painter/using/painting/symmetry/symmetry
    title: "Substance 3D Painter: symmetry (a toolbar toggle)"
  - id: clo
    resource: https://support.clo3d.com/hc/en-us/articles/115012377688-Apply-Linked-Editing-Symmetry-Pattern-with-Sewing
    title: "CLO: linked editing of symmetric patterns, and removing the link"
---

# The Mirror toggle and paired parts

Owner's design, 2026-10-30. Code: `app/src/doc/symmetry.js`, `app/src/ui/tools.js`; test: `app/test/symmetry.test.js`.

## The rule

`doc.symmetry` (default true, saved with the design, no undo step, toggled from the top bar or `X`) decides whether an edit reaches both sides. Clicking the toggle changes nothing already on the leotard. There is no per-part mirror control or read-out anywhere: the only ways a part stops being paired are a one-sided edit (or undoing back past its creation).

Every interface edit goes through `sym.edit` (`app.edit`, `ui/state.js edit`). Scripts calling the plain commands are not affected.

- Mirror on: the edit reaches the pair.
- Mirror off, part paired: split it, then apply the edit to the clicked side, as one undo step. The notice "Split from its pair" appears.
- A rename never splits. A split is never re-paired by turning Mirror back on; undo is the way back. A silhouette option replaces both sides of a split block line and makes it one again.

## What a pair is

| Part | Paired when |
| --- | --- |
| Line, piece | one record, `mirror: 'both'` (its other side is derived) |
| Strap | through its path line |
| Stone group | `mirror: 'both'`; or on a paired line or piece with no `side`; or two records linked by `pair` |
| Lettering | two records linked by `pair` |
| Single stones | never linked: two stones; the eraser works by place, so it takes both when Mirror is on |

Split lines and pieces keep `twin`. It is not a pair: it only says where the mirror image of something attached now lives (`evaluateAll`, the scatter generator). `on: { curve, mirror: true }` therefore never needs rewriting.

## Decisions taken while building

- **The centre stays one part.** With Mirror on, a line that reaches or crosses the centre (within 6 mm, or with points on both sides), a stone on the centre, a piece that spans it, and lettering overlapping it are all one part. The preview shows no copy, so the rule is visible.
- **Lines across the centre edit symmetrically.** Mirror on, dragging a neckline point moves the point that is its mirror image (within 8 mm); a centre point stays on the centre. Adding, deleting and corner/smooth do the same.
- **Mirrored lettering stays readable.** Only its place and turn are mirrored: reversed text is never what a designer wants from a name or a logo.
- **A stone group on a line that splits stays linked.** The group was not edited, so it becomes two linked halves (mirrored offset) and still changes together with Mirror on.
- **Mirror off on a paired line or piece, a new stone group** covers only the clicked side (`side: left | right`, the wearer's).
- **Erasing never splits a group.** Erase marks are by place, so a one-sided gap leaves the group live.
- **The centre line** shows only with Mirror on while a placing tool is active or a line is selected, so it is not in the way when judging the look (H hides it too).
- **Split parts are named** "(left)" and "(right)", the wearer's.

## How other tools compare

A global on/off is the norm for painting and sculpting tools ([ZBrush](https://novedge.com/blogs/design-news/zbrush-tip-efficient-mirror-symmetry-workflows-in-zbrush), [Substance 3D Painter](https://experienceleague.adobe.com/en/docs/substance-3d-painter/using/painting/symmetry/symmetry)), and it only affects new work. Pattern tools link pieces instead, and breaking the link is an explicit menu action ([CLO](https://support.clo3d.com/hc/en-us/articles/115012377688-Apply-Linked-Editing-Symmetry-Pattern-with-Sewing)). This design combines them: one global toggle, with live links underneath, broken by the act of editing one side. The risk unique to it is an accidental split, which is why the notice and the single undo step matter.

## Known limits

- A gradient measured from a line uses that line alone once it is split: its twin is not yet consulted (`render/garment.js`).
- Hardware has no interface yet, so it does not follow the toggle.
