---
type: Section
title: Platform and engine options
description: "Every rendering engine and platform option evaluated in the research, its status after the owner's decisions (three.js chosen; native desktop plus iPad), and the browser, packaging and licence facts behind them."
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
---

Two owner decisions frame this section and override the research report where they differ:
the product is a [native desktop and iPad app](/decisions/2026-10-13-native-desktop-and-ipad-target.md),
and it is built on [three.js, not Unreal](/decisions/2026-10-15-threejs-over-unreal.md).
Each engine concept carries a **Status** line (chosen, fallback, not chosen, rejected). Engine
evaluations use the `Component` type: each describes a candidate rendering component.

Start with [three.js](/engineering/platform/threejs.md) and
[packaging for desktop and iPad](/engineering/platform/desktop-and-ipad-packaging.md).
