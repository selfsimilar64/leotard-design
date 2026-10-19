---
type: Decision
title: "Seamstress output: printable PDF patterns"
description: "Flattened pattern pieces are delivered as printable full-scale PDFs with markings and measurements; DXF and graded size runs are not required now."
tags: [product, roles]
status: stable
decided: 2026-10-15
answers: /product/questions/pattern-output-format.md
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T22:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-15 (Claude Code session)
    title: Answers to the four product questions
    author: human:mattj
---

# Decision

Seamstresses receive pattern pieces as **printable PDFs**: full scale, tiled for an ordinary
printer (and as a large single sheet for a copy shop), with markings and a measurements
table.[^owner] DXF export and graded multi-size output were offered and **not** selected.

# Consequences / how to apply

- One size per export (the size selected), unless the owner later asks for grading.
- Pattern markings follow [pattern markings](/domain/construction/pattern-markings.md); tiled
  sheets need alignment marks and a scale check square **[INFERRED]**.
- Keep the flattened geometry in a format-neutral internal form so DXF can be added later.

# Revisit if

A factory partner needs DXF for its CAD or cutting table, or makers ask for a size run.

[^owner]: Product owner, 2026-10-15
