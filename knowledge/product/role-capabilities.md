---
type: Requirement
title: Role capability matrix
description: Which capabilities each role (coach, designer, seamstress) can see and change, as a starting proposal derived from the owner's description.
tags: [roles, permissions, requirements]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T20:45:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-15 (Claude Code session)
    title: Direction for the post-POC phase
    author: human:mattj
  - id: dec-pdf
    resource: /decisions/2026-10-15-printable-pdf-patterns.md
    title: "Decision: printable PDF patterns"
  - id: dec-cat
    resource: /decisions/2026-10-15-coach-designs-come-from-maker-catalogue.md
    title: "Decision: coach designs come from a leotard maker's catalogue"
---

# Takeaway

"Not every aspect of functionality would be exposed to all users."[^owner] The rows in **bold**
come straight from the owner's description; the rest is a **[INFERRED]** proposal to be confirmed.

Legend: **Edit** = can change, **Template** = can change only what the design's author unlocked,
**View** = read-only, blank = hidden.

| Capability | Coach / gym | Designer | Seamstress |
|---|---|---|---|
| **Start from pre-made designs and assets** | Edit | Edit | |
| Colours and fabrics per zone | Template | Edit | View |
| Stone patterns, coverage, colours | Template | Edit | View |
| Place and brush individual stones | | Edit | View |
| **Change the leotard's outline / shape** | | Edit | |
| **New back pattern with hand-placed straps** | | Edit | |
| **Cut-outs** | | Edit | |
| **Replace sections with mesh** | Template | Edit | |
| **Different neckline** | Template (pick from set) | Edit (draw) | |
| Lock / unlock parts for template users | | Edit | |
| Size range and body selection | Edit | Edit | View |
| **Flattened pattern pieces** | | View | View |
| **Measurements and markings** | | View | View |
| Stone map and count per piece | Count only | View | View |
| Material list / spec sheet | | View | View |
| **Sewing / construction components** | hidden[^owner] | View | View |
| Print pattern PDF (one size)[^dec-pdf] | | Edit | Edit |
| Publish design to the maker's catalogue[^dec-cat] | | Edit | |
| Price / tier estimate | View | View | |

# Notes

- Whether the seamstress may adjust production parameters (seam allowance, negative ease per
  fabric) is open. Research says negative ease is the maker's knowledge, so it plausibly belongs
  to the seamstress view. See [/domain/construction/](/domain/construction/about.md).
- Designs move as files, so for now roles are app modes, not enforced security; see
  [design files for hand-over](/decisions/2026-10-15-design-files-for-handover.md).

[^owner]: Product owner, 2026-10-15
[^dec-pdf]: Decision: printable PDF patterns, 2026-10-15
[^dec-cat]: Decision: coach designs come from a leotard maker's catalogue, 2026-10-15
