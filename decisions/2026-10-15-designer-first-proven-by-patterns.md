---
type: Decision
title: "First release: designer tools, proven by pattern output"
description: "Build the editable garment model for the designer first, with flat pattern pieces as its first proof; the coach view follows as a restricted mode."
tags: [product, roles]
status: stable
decided: 2026-10-15
answers: /product/questions/which-role-first.md
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T22:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-15 (Claude Code session)
    title: Answers to the four product questions
    author: human:mattj
---

# Decision

The first professional release serves the **designer**: build the editable garment model (panels,
necklines, backs with straps, cut-outs, mesh sections) first, with "see the flat pattern piece" as
its first proof. The coach view follows as a restricted mode over published catalogue
designs.[^owner]

# Consequences / how to apply

- The next engineering milestone is the garment data model described in
  [POC-to-product gap](/engineering/architecture/poc-to-product-gap.md), driven end to end: draw a
  line on the body, get a panel, flatten it, print it.
- Seamstress PDF output ([decision](/decisions/2026-10-15-printable-pdf-patterns.md)) is part of the
  first release, not a later one.

[^owner]: Product owner, 2026-10-15
