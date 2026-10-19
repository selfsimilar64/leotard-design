---
type: Persona
title: Seamstress
description: Makes the garment; needs the final design as flattened pattern pieces with measurements and markings, read-only on the design itself.
tags: [persona, seamstress, production, roles]
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

# Who they are

The person (or factory) who cuts, decorates and sews the leotard. "Seamstresses will want to see
the final design output as its flattened components with measurements and markings."[^owner]

# What they need to receive

From the owner: the flattened components (pattern pieces), measurements and markings.[^owner]
The research adds what a factory needs to act on a design:[^report]

- Pattern pieces as a **printable full-scale PDF**, one size per export
  ([decision](/decisions/2026-10-15-printable-pdf-patterns.md)). Factories commonly exchange DXF;
  that was not selected for now.
- A print image per piece for sublimated designs.
- A stone map and count per piece (size and colour), split where motifs cross seams.
- A specification sheet: fabrics and linings per piece, finishing (elastic, binding), closures.
- **[INFERRED]** Standard markings on each piece: grain/stretch direction, notches, seam
  allowance, piece name, size, cut quantity and fabric. See [/domain/construction/](/domain/construction/about.md).

# Constraints from research

- Factories decorate flat pieces before closing side seams, so anything crossing a seam must be
  split or finished by hand.[^report]
- Negative ease (cutting smaller than the body) has no industry standard and is set per fabric
  by the maker; the tool should hold stretch as a fabric property and leave final reduction to
  the manufacturer.[^report]
- Nothing published explains how designs are graded across sizes.[^report]

[^owner]: Product owner, 2026-10-15
[^report]: Research report, construction section
