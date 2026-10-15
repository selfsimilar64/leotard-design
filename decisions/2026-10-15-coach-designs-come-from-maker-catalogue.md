---
type: Decision
title: "Coach designs come from a leotard maker's catalogue"
description: "The tool is used by a leotard maker; its club customers (coaches, gym owners) customise designs from that maker's catalogue."
tags: [product, roles]
status: stable
decided: 2026-10-15
answers: /product/questions/who-authors-templates.md
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T22:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-15 (Claude Code session)
    title: Answers to the four product questions
    author: human:mattj
---

# Decision

The pre-made designs coaches customise come from **a leotard maker's catalogue**. The maker uses
the tool in-house (designers author, seamstresses produce) and gives its club customers the coach
view over its own designs, the model GK, Sylvia P and Quatro already run with their web
studios.[^owner] See [brand design studios](/domain/market/brand-design-studios.md).

# Consequences / how to apply

- **[INFERRED]** The designer view must be able to publish a design into a catalogue and set which
  parameters are open to coaches (colours, fabrics, stone pattern, sleeve/neckline choice from a
  set) and which are locked (panel shapes, seams).
- **[INFERRED]** A catalogue belongs to one maker, so branding, fabric list and stone list in the
  coach view are the maker's, not a global library.
- Designs coaches return must still be manufacturable by that maker without re-entry.

# Revisit if

Independent designers or gyms without a maker become a target market.

[^owner]: Product owner, 2026-10-15
