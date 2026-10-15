---
type: Catalog
title: Freely licensed 3D mannequin references
description: "CC0 and CC-BY 3D mannequin and dress-form models found online (itch.io, OpenGameArt, Sketchfab, Womp), their licences and usefulness as visual references; none downloaded."
tags: [mannequins, 3d-assets, licences, catalog]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: fit
    resource: /references/research/mannequins-and-leotard-fit.md
    title: "Research notes: mannequins and leotard fit (bundle mirror)"
  - id: burning-barb
    resource: https://burning-barb.itch.io/mannequin
    title: Prototyping Mannequin by burning_barb (itch.io)
  - id: oga-fem
    resource: https://opengameart.org/content/fem-mannequin
    title: Fem Mannequin by Teh_Bucket (OpenGameArt)
  - id: oga-male
    resource: https://opengameart.org/node/48394
    title: Mannequin Male by plaggy (OpenGameArt)
  - id: sketchfab-1900s
    resource: https://sketchfab.com/3d-models/mannequin-1900s-m-size-edce03ca9ee8410b8e0485504597389b
    title: Mannequin 1900s M size (Sketchfab)
  - id: sketchfab-red
    resource: https://sketchfab.com/3d-models/red-dress-0b795c17b7e84e94993b38ce509f01f7
    title: Red dress on mannequin (Sketchfab)
  - id: womp
    resource: https://flowerpecker.womp.com/assets/mannequin-2-9ww2jwhdd2/
    title: Womp Mannequin 2 / 4
---

# Takeaway

A handful of freely licensed mannequin models exist, mostly useful as **visual references**; none
was downloaded. Our geometry comes from **MakeHuman (CC0)**, so attribution only matters if geometry
is copied from a CC-BY model. The CC-BY Victorian dress form is the best reference for neck caps,
turned finials and stand proportions; the CC0 itch.io mannequin for a smooth abstract surface.[^fit]
**Re-check each licence on the page before use.**

| Name | Licence | Notes |
|---|---|---|
| [Prototyping Mannequin (burning_barb)](https://burning-barb.itch.io/mannequin) | CC0 | glTF + .blend, ~9.6k tris, unrigged (search summary)[^burning-barb] |
| [Fem Mannequin (Teh_Bucket)](https://opengameart.org/content/fem-mannequin) | CC0 | jointed female, ~50k tris, .blend 7.3 MB[^oga-fem] |
| [Mannequin Male (plaggy)](https://opengameart.org/node/48394) | CC0 | zip ~400 KB, male; only useful for base and joints[^oga-male] |
| [Mannequin 1900s M size](https://sketchfab.com/3d-models/mannequin-1900s-m-size-edce03ca9ee8410b8e0485504597389b) | CC-BY | scanned Victorian dress form; reference for neck cap and stand[^sketchfab-1900s] |
| [Red dress on mannequin](https://sketchfab.com/3d-models/red-dress-0b795c17b7e84e94993b38ce509f01f7) | CC-BY | dressed form, ~43k verts[^sketchfab-red] |
| [Womp Mannequin 2 / 4](https://flowerpecker.womp.com/assets/mannequin-2-9ww2jwhdd2/) | CC0 (view only, no download) | browser-only[^womp] |

No mannequin or dress form was found on Poly Haven or BlendSwap. Sketchfab was not filtered
systematically; next step is a manual "dress form" search with the Downloadable + CC0/CC-BY
filter.[^fit] The project [prefers free and open assets](/decisions/2026-10-13-prefer-free-open-assets.md). See
[/engineering/pipeline/mannequin-pipeline.md](/engineering/pipeline/mannequin-pipeline.md) for how
the MakeHuman bodies are built.

[^fit]: Research notes: mannequins and leotard fit, bundle mirror, section 5.
[^burning-barb]: itch.io, burning_barb.
[^oga-fem]: OpenGameArt, Teh_Bucket.
[^oga-male]: OpenGameArt, plaggy.
[^sketchfab-1900s]: Sketchfab, Mannequin 1900s.
[^sketchfab-red]: Sketchfab, Red dress.
[^womp]: Womp.
