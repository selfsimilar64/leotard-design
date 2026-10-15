---
type: Decision
title: "Engine: three.js, not Unreal"
description: "After building POCs in both, the owner chose three.js for lightness and fast iteration; the Unreal POC was removed."
tags: [engine, threejs]
status: stable
decided: 2026-10-15
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T20:30:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-15 (Claude Code session)
    title: "Engine choice after the two POCs"
    author: human:mattj
---

# Decision

After building both a three.js POC (`poc-threejs/`) and an Unreal POC, the owner picked
**three.js** "for the sake of keeping things lightweight and having fast iteration", and asked for
the Unreal POC to be removed.[^owner]

# Consequences / how to apply

- Do not propose Unreal again or keep Unreal-parity code.
- Engine trade-offs and three.js's known risks (renderer maturity, breaking releases) are recorded
  under [/engineering/platform/](/engineering/platform/about.md).

[^owner]: Product owner, 2026-10-15
