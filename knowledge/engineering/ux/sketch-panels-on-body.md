---
type: Technique
title: Sketching panels directly on the body
description: "CLO 2026.0 and Marvelous Designer's 3D Pencil turn lines drawn on an avatar into pattern pieces; for a skin-tight leotard this is the natural way to design panels without a pattern window, prioritising how the designer wants it to look over what a cloth solver says."
tags: [ux, panels, seams, drawing]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-tools
    resource: /references/research/existing-tools-and-ux-mechanics.md
    title: "Research notes: existing tools and UX mechanics (section 5)"
  - id: report
    resource: /references/research/research-report.md
    title: "Research report: Borrow the engine, build the sparkle"
  - id: dp-md
    resource: https://digitalproduction.com/2026/04/15/marvelous-designer-2026-0-adds-3d-pencil-and-lacing/
    title: Digital Production on Marvelous Designer 2026.0
  - id: clo-news
    resource: https://clo3d.com/en/resources/notices/1374
    title: CLO 2026.0 notice (search snippet)
  - id: clo-flatten
    resource: https://support.clo3d.com/hc/en-us/articles/115008890627-Flatten
    title: CLO Flatten article (cited in report)
  - id: eighty-lv
    resource: https://80.lv/articles/new-marvelous-designer-update-lets-artists-rip-pinch-shape-fabric-like-never-before/
    title: 80.lv on Marvelous Designer 2026.1
---

# Takeaway

Drawing style lines on the body and letting the software turn the enclosed regions into panels is
the natural way to "assemble a leotard from pieces" without touching a pattern window.[^notes-tools]
Two professional tools added exactly this in 2026, and because a leotard is skin-tight the report
recommends designing directly on the body with no cloth simulation in the interactive loop.[^report]

# Evidence

- CLO 2026.0 lists sketching garments on the avatar and converting them to patterns (snippet).[^clo-news]
  CLO's flatten tool is cited by the report for the same direction.[^clo-flatten]
- Marvelous Designer 3D Pencil: "Sketching is a click and drag action on the avatar"; the view locks
  to front or back; sketches become editable 3D pen lines; sketching front and back then flattening
  sews the sides together automatically.[^dp-md]
- MD's Lacing tool shows a compact interaction grammar: click a sequence of holes, finish with
  double-click or Enter; Backspace undoes one step, Esc or Ctrl+Z the whole creation.[^dp-md]
- Philosophy: simulation answers "how fabric would behave", but artists need "How does the artist
  want it to behave?"[^eighty-lv] This matches the owner's "appears correct"
  [decision](/decisions/2026-10-13-appears-correct-not-physically-correct.md).

# Notes

- **[INFERRED]** This is a [designer-view](/product/personas/professional-designer.md) tool. The
  coach view swaps whole catalogue pieces instead (Dressmaker's part catalogue; Expivi's "only
  valid ones snap together").[^notes-tools]
- Flattening drawn panels into pattern pieces and how much to shrink them for stretch are covered
  under [/domain/construction/](/domain/construction/about.md); the report flags stretch reduction
  as factory knowledge and bridging of body hollows (sternum, lower back) as needing a prototype.[^report]

[^notes-tools]: Research notes, existing tools and UX mechanics, section 5
[^report]: Research report, "designed directly on the body" section
[^dp-md]: Digital Production, 15 Apr 2026
[^clo-news]: CLO notice, snippet
[^clo-flatten]: CLO Flatten article
[^eighty-lv]: 80.lv, 24 Aug 2026
