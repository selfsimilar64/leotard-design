---
type: Decision
title: "Target platform: native desktop and iPad"
description: "The product ships as a native desktop app plus iPad/tablet app; browser prototyping is acceptable and share-by-link is not a priority."
tags: [platform, ipad]
status: stable
decided: 2026-10-13
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T20:30:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-13 (Claude Code session)
    title: "Platform answer after the research report"
    author: human:mattj
---

# Decision

The eventual product is a **native desktop application plus an iPad / tablet application**.
Prototyping in the browser is fine. Sharing designs by link is not a priority.[^owner]

# Context

The research report recommended three.js in the browser on the assumption that coaches and
clubs would open a shared link on ordinary laptops (see the
[research report](/references/research/research-report.md)). The owner's answer replaced that
assumption: iPad viability, not browser reach, decides technical questions.

# Consequences / how to apply

- Treat iPad performance and Apple Pencil feel as a first-class test target for every prototype.
- Web technology remains acceptable as long as it can be packaged natively (see
  [/engineering/platform/](/engineering/platform/about.md)).
- Do not build link-sharing features unless asked. Note that the 2026-10-15
  [professional-tool direction](/decisions/2026-10-15-poc-complete-move-to-professional-tool.md)
  implies designs must move between people in different roles; how (files, accounts, a server)
  is an [open question](/product/questions/how-designs-move-between-roles.md).

# Revisit if

The user base turns out to be mostly people who will not install an app.

[^owner]: Product owner, 2026-10-13
