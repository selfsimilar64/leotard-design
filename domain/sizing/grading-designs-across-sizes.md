---
type: Open Question
title: Grading designs across sizes
description: "Unknown: how brands carry panel lines, sublimated artwork, lettering and crystal patterns from one size to the next in a team order; what the evidence hints and what the software would need to decide."
tags: [sizing, grading, open-question, crystals]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: styles
    resource: /references/research/leotard-styles-and-rules.md
    title: "Research notes: leotard styles and rules (bundle mirror)"
  - id: report
    resource: /references/research/research-report.md
    title: Research report (bundle mirror)
  - id: sylviap-cat
    resource: https://teamwear.sylviap.net/collections/2026-27-womens-competition-catalog
    title: Sylvia P 2026-27 women's competition catalogue
    author: org:sylvia-p
  - id: destira-rsc
    resource: https://destira.com/pages/readysetcustom
    title: Destira ReadySetCustom
    author: org:destira
  - id: ncaa-rules
    resource: https://nawgj.org/wp-content/uploads/2026/08/2026-27_WomensGym-Rules-Mod-FINAL.pdf
    title: NCAA 2026-27 Women's Gymnastics Rules Modifications
    author: org:ncaa
---

# Question

A team orders one design in many sizes (a club may span `CS` to `AL`). **How are panel lines,
sublimated artwork, lettering and crystal patterns graded between sizes?** No brand or designer
source describes it.[^styles][^report]

# Hints

- Catalogue crystal counts are quoted once per design (with a long-sleeve vs three-quarter
  difference), not per size.[^sylviap-cat] That suggests either a fixed stone count laid on a scaled
  template, or counts quoted for a reference size **[INFERRED]**.[^styles]
- Destira's budget programme scales lettering by character count (8-9 letters per row), not by
  garment size.[^destira-rsc]
- Team-identity rules (NCAA identical uniforms; FIG identical leotards, unverified for 2025-2028)
  require designs to *read* the same across sizes.[^ncaa-rules]
- Anatomy-based rule lines (hip bone, sternum, shoulder blade) move with body size, so compliance
  would need checking per size **[INFERRED]**.[^styles]

# Options the software would need to choose between [INFERRED]

| Element | Option A | Option B |
|---|---|---|
| Crystals | Scale spacing, keep count | Keep spacing (stone size fixed), vary count |
| Panel lines | Scale with the pattern (proportional) | Anchor to body landmarks (e.g. waist line follows the waist) |
| Sublimated artwork | Scale the print | Keep print scale, re-crop |
| Lettering / logos | Fixed physical size (logo area limits) | Scale with size |

Report counts per size either way.[^styles] The POC carries one design across four bodies by
sharing mesh topology (vertex i = same anatomical point), which is effectively landmark-anchored
grading; see [/engineering/pipeline/mannequin-pipeline.md](/engineering/pipeline/mannequin-pipeline.md).
Construction-side grading of pattern pieces belongs in [/domain/construction/](/domain/construction/about.md).

# How to resolve

Ask a production designer (see [professional designer persona](/product/personas/professional-designer.md)
and [seamstress persona](/product/personas/seamstress.md)), or examine a physical size run of one
team design.

[^styles]: Research notes: leotard styles and rules, bundle mirror, section 10.
[^report]: Research report, bundle mirror.
[^sylviap-cat]: Sylvia P 2026-27 catalogue.
[^destira-rsc]: Destira ReadySetCustom.
[^ncaa-rules]: NCAA 2026-27 Rules Modifications, Rule 1.10.
