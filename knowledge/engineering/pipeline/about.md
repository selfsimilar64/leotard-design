---
type: Section
title: Asset pipeline
description: "Offline tooling that produces the POC's assets: the Blender + MPFB 2 script that bakes the shared-topology mannequin bodies from the CC0 MakeHuman base mesh."
tags: [pipeline, assets]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
---

Code lives in `pipeline/` at the project root; the portable Blender and add-on downloads it uses live in
`tools/`. Start with [mannequin pipeline](/engineering/pipeline/mannequin-pipeline.md). Asset choices
follow the [free/open assets decision](/decisions/2026-10-13-prefer-free-open-assets.md); body-model
alternatives are compared in [body models](/engineering/geometry/body-models.md).
