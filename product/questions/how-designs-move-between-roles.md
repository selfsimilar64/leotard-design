---
type: Open Question
title: "How do designs move between roles?"
description: "A coach, a designer and a seamstress are usually different people; how a design passes between them (files, accounts, a shared server) is unsettled."
tags: [question, product]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T20:55:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-15 (Claude Code session)
    title: Direction for the post-POC phase
    author: human:mattj
---

# Question

A design must pass from coach to designer or maker, and on to the seamstress. Share-by-link was
[not a priority](/decisions/2026-10-13-native-desktop-and-ipad-target.md) on 2026-10-13, but the
[role-based direction](/decisions/2026-10-15-poc-complete-move-to-professional-tool.md) makes
hand-over between people inherent.

# Options

1. **Design files** exchanged by any means (email, drive): no server; each app opens the file in
   its role's view. Simplest; matches native desktop + iPad.
2. **Accounts and a shared workspace** (cloud sync): role permissions enforced server-side; needed
   for real access control and live collaboration; adds a backend.
3. **Single organisation install** (a maker's own team and its club customers).

# Recommendation **[INFERRED]**

Design the document format first (it is needed by every option), ship with files, and keep the
format sync-ready. Role restriction in a file-based product is a UI mode, not security.

# Answer

Answered 2026-10-15: see [Designs move between people as files](/decisions/2026-10-15-design-files-for-handover.md).[^owner]

[^owner]: Product owner, 2026-10-15
