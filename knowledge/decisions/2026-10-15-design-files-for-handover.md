---
type: Decision
title: "Designs move between people as files"
description: "For now a design passes between roles as a saved file; no accounts or server. The format should allow sync later."
tags: [product, roles]
status: stable
decided: 2026-10-15
answers: /product/questions/how-designs-move-between-roles.md
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T22:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-15 (Claude Code session)
    title: Answers to the four product questions
    author: human:mattj
---

# Decision

Designs pass from coach to maker to seamstress as **design files**, sent by any means; each person
opens the file in their own view. No accounts or server for now.[^owner]

# Consequences / how to apply

- The design document format is a first-class deliverable: versioned schema, forward-compatible,
  self-contained (or with referenced catalogue assets resolvable by the maker's install).
- **[INFERRED]** Role restriction in a file-based product is a UI mode, not security. A determined
  user could open a file in a fuller view; that is acceptable at this stage.
- Keep the format sync-ready (stable IDs, append-friendly structure) so cloud sync can be added.

# Revisit if

Makers need enforced permissions, live collaboration, or order tracking.

[^owner]: Product owner, 2026-10-15
