---
type: Requirement
title: The ideas the construction model needs
description: "About seven general properties (a layer stack with show-through, a join type on every line, lining as its own pieces, free-edged layers, fullness as a seam property, straps with real ends, thread and show-through) cover nearly every real technique the app cannot yet record, ranked here by moodboard reach."
tags: [requirement, construction, layers, straps, lining, gaps, moodboard]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-31T23:00:00Z }
sources:
  - id: report
    resource: /references/research/techniques-and-workflow-report.md
    title: "Research report: Draw first, decide how it sews"
  - id: gap
    resource: /references/research/moodboard-vs-app-gap-map.md
    title: "Research notes: moodboard against the app (read from code at 2e72750, not run)"
  - id: tech
    resource: /references/research/leotard-construction-techniques.md
    title: "Research notes: leotard construction techniques"
  - id: trades
    resource: /references/research/adjacent-costume-trades.md
    title: "Research notes: adjacent costume trades"
---

# Takeaway

**[INFERRED]** The question is not which tools are missing but which few properties a design has to hold. The app treats
a leotard as a surface divided into areas; a real leotard is a stack of layers with a chosen join on every line.[^report]
Our reading of the moodboard is that the app can usually be made to look right already, so the gaps that matter are
**truth** (renders right, records wrongly), and **effort** (possible, but needs hidden knowledge).[^gap]

# The ideas

| Idea | Unlocks | State of the app (from code, 2e72750)[^gap] |
|---|---|---|
| A stack of layers with a rule for what shows through | Plate under mesh, shaped lining under a mesh shell, lace over lining | Layers exist; the lining is clipped to fabric, so it cannot show through an opening. Under-mesh by script only |
| A way of joining on every line: seam, enclosed seam, stitched plate edge, print boundary, applied strip | Belts in four builds, accent strips, printed fake seams | Decided before drawing and fixed; a print line still cuts; a strip must be a seam, a strap or a traced outline |
| Lining as its own pieces | Front and crotch lining, shelf lining, lining that stops at a yoke | Script only; not labelled in the export; no crotch lining generated |
| A layer with its own free edge | True wrap fronts (surplice), second necklines | Pieces meet edge to edge |
| Fullness as a property of a seam | Gathers, ruching, pinch fronts, twists | A stamp under Lettering; nothing in the cut |
| Straps with real ends, crossings and a link to their edge | Eight documented end joins, a binding that runs on to become a strap | Renders well; path not editable after drawing; absent from the pattern |
| Thread and show-through | Mesh-coloured seams with a second line in the fabric colour, trimmed edges under sheer | No notion of seam thread |

Plain omissions outside these: closures (no button, no opening in a collar, not in the pattern) and collars and cuffs
(fixed height, no back opening).[^gap] Brand words `overlay`, `underlay` and `double layer` each name several builds, so
they should never become single features.[^tech]

# What can wait

Picot and lettuce edges, raw or laser-cut edges, pleats, skirts, sewn fringe, ruffles, peplums and godets get no mentions
in the copy of five brands. **[INFERRED]** They matter only if rhythmic or dance users come into scope.[^report] Techniques
from neighbouring trades that the notes do not cover in depth yet (appliqué overlap lips and tabs, bordered appliqué,
stopping appliqué short of a closing seam, paper-on-form stone templates, stretch paint, gather ratios, power mesh
tensioning, cups, raw-edge bonding) are listed in the [adjacent trades notes](/references/research/adjacent-costume-trades.md).[^trades]

# Ranked by moodboard garments touched (of about 106, estimates, overlapping)[^report]

| Gap | Garments | Blocks |
|---|---|---|
| Every export: no notches or fold lines, no list of what joins what, default elastic unlisted, no lining pieces, one allowance on every edge | ~106 | Truth |
| Shaped mesh has only two builds | up to ~60 | Truth |
| No half-line mirrored to the centre | ~50 | Effort |
| Collars and cuffs | ~50 | Effort, truth |
| Yoke and waist cover the front only | ~36 | Effort |
| No parallel copy of a line | ~30-45 | Effort |
| Straps and strips missing from the pattern | ~30 | Truth |
| Plate flow | ~23 | Effort |
| Holes in a piece gain a slit in the flat outline (read from code) | 17 of 30 backs, plus ~5 | Truth |
| Closures | ≥17 | Look, truth |
| Finishes set one line at a time, not located in the export | ~35 | Effort, truth |
| Strap paths cannot be edited; rows on straps by script only | ~12-30 | Look, effort |
| Printed fake seams cut the piece | 7-15 | Truth |
| True overlap | ~10 | Truth, look |
| Lining | ~5 visible, every garment once exported | Look, truth |
| Gathers | ~4 | Truth |

# Build order **[INFERRED]**

1. One line behaviour ([the drawing grammar](/engineering/ux/one-drawing-grammar.md)).
2. Parallel copy, apply to several lines, duplicate, continue across the side seam.
3. "How is this made?": strips and print lines that do not cut, backed windows, plates under mesh, enclosed seams, an "under" setting, all changeable without redrawing.
4. Buttons for what only scripts reach: lining, closures, stones on a strap, reference photos.
5. Pattern truth: straps and strips as pieces, finishes located on their lines, real hem and clasp allowances, notches and folds, lining pieces, no false slits, what joins what.
6. Free-edged layers, crossing order, gathers with real fullness, thread and show-through.

# A test of construction truth

The owner's acceptance test judges form and appearance, which the app can pass while recording the wrong garment.
**[INFERRED]** Jalie's leotard patterns publish complete cut lists, so rebuilding Kate, Jade and Lillie in the app and
comparing its export against those lists measures truth directly.[^report]

[^report]: Research report, Draw first, decide how it sews
[^gap]: Research notes, moodboard against the app
[^tech]: Research notes, leotard construction techniques
[^trades]: Research notes, adjacent costume trades
