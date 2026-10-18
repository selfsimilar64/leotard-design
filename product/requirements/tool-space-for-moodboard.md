---
type: Requirement
title: Tool space needed to build every moodboard design
description: "The complete set of designer tools (T1-T14) and supporting mechanisms (M1-M10) required for any leotard in the moodboard to be built in the app, each with the moodboard features it serves and its acceptance check."
tags: [requirement, tools, designer, moodboard, scope]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-18T18:50:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-18 (Claude Code session)
    title: "Moodboard brief: any moodboard design must be achievable with in-app tools"
    author: human:mattj
  - id: taxonomy
    resource: /domain/moodboard/design-space-taxonomy.md
    title: Moodboard design-space taxonomy
  - id: catalogue
    resource: /domain/moodboard/moodboard-catalogue.md
    title: Moodboard catalogue (per-image teardown)
  - id: doc-model
    resource: /engineering/architecture/design-document-model.md
    title: Design document model
  - id: dist
    resource: /engineering/geometry/stone-distribution-algorithms.md
    title: Stone distribution algorithms
  - id: vocab
    resource: /domain/embellishments/placement-vocabulary.md
    title: Stone placement vocabulary
---

# Takeaway

The owner's goal is that **any design in `moodboard/` can be achieved with in-app tools**.[^owner]
The teardown of all 138 images[^catalogue] reduces to fourteen tools and ten supporting mechanisms. The
grouping is **[INFERRED]**; the feature list each serves comes from the
[taxonomy](/domain/moodboard/design-space-taxonomy.md).[^taxonomy]

# Tools

| ID | Tool | Serves (moodboard features) | Acceptance check |
|---|---|---|---|
| T1 | **Block library** | Base silhouette: sleeve length per side, neckline, back neckline, leg cut, mock neck/collar band | All silhouettes in the taxonomy reachable by picking a block and dragging at most 3 handles |
| T2 | **Pen on body / on flat** | Every seam, panel line, yoke, V, sweetheart, raglan, princess, wrap-around, asymmetric diagonal, side inset; shape modifiers (scallop, zigzag, wave) | Any visible seam drawn as one curve; front-to-back continuity through the side seam |
| T3 | **Curve editing** | Point drag sliding on surface, insert/delete, corner/smooth, mirror toggle, offset copy, snap to landmarks and curves | Edits re-cut panels on release under 150 ms |
| T4 | **Panel fabric and stack** | Per-panel fabric, colour, second colour, mesh with lining or skin under, lace, print, grain/nap; drag-drop swatches; the full fabric range (matte, satin, wet look, mystique, solid/glitter-grain/duochrome/oil-slick foils, hologram fine/shattered/liquid-opal, glitter tricot, velvet and crushed velvet, lace, flocked mesh, mirror chrome); foil-print masks (holo dots, chameleon leopard); one-click colourway swap | Each moodboard material combination expressible |
| T5 | **Cut-out** | Keyholes, open backs, side waist cut-outs, cage backs (open area between straps) | Removing a cell gives a finished edge all round |
| T6 | **Strap tool** | Single, crossed, ladder, cage, wrap-around straps, straps over mesh or skin, junctions, layer order | All strap backs in the catalogue drawable with one stroke per strap |
| T7 | **Edges, trims and bands** | Self elastic, contrast binding, piping on seams, bands over seams with their own material, mock-neck, stand and collar bands, cuffs, topstitching; hardware (clear hook, metal hook-and-bar, invisible zip) | Click an edge or seam → finish applied along its whole length |
| T8 | **Prints and decals** | Sublimation art, ombre along any direction or curve, printed lace, logos and lettering as print/foil/embroidery | Image or SVG placed per panel or projected across panels |
| T9 | **Stone generators** | Rows along curves (1-n, graded sizes, one-sided or both), outline, fill (hex, grid, contour-parallel with colour by contour depth), gradient scatter (by distance to seams, edges, cuffs or a point; paintable density), rays and fans (from a point, a curve, converging; size/spacing ramps), curtain between two curves, rain and chandelier drops, lattice/trellis/seigaiha tiles with node motifs, motif from SVG or the ornament library, lettering, fringe/drops, comet brush with flow-aligned shaped stones, cluster, burst; colour and size ramps; guides can be seams, edges, straps or print outlines; mirror[^vocab][^dist] | Each stone layout in the catalogue reproducible by at most 4 generators plus hand edits |
| T10 | **Single stone and eraser** | Accent stones, clean-up, shaped stones (navette, pear, oval, bugle) with rotation, pearls, spangles, flat holo dots | Click to place, drag to slide, brush to erase |
| T11 | **Reference tracing** | Any photographed design: landmark pins, camera solve, overlay, trace, colour pick, stone pick-up | Traced seams land within 5 mm of the photo's lines at the solved camera |
| T12 | **Look and presentation** | Studio/gym/arena rigs, glare presets, body display (athlete or mannequin), pose, compare view, capture | Render at a photo's camera beside the photo |
| T13 | **Layers and overlays** | Overlay pieces drawn over the shell (lace wrap pieces, surplice fronts, sash, appliqué bands and mosaics), lining shapes visible under mesh (bandeau, crop), layer order, under-layer edges showing through sheer layers | DAPHNE back and the TREILLE lining reproduced |
| T14 | **Surface detail** | Ruching, gathers converging to a knot, twist-knot bandeau, tension wrinkles, embossed strap texture, as normal/AO/small-displacement stamps along a path or in a region | Gathered and twisted moodboard bodices read correctly at the photo camera |

# Mechanisms the tools depend on

| ID | Mechanism | Why |
|---|---|---|
| M1 | Design document + commands + undo/redo + `app.exec`[^doc-model] | Save, hand-over, history, scripting and agent operation |
| M2 | Surface addressing on the canonical body | Designs survive size and pose changes |
| M3 | Curve graph → arrangement → panel meshes | Exact boundaries, real panels |
| M4 | Per-panel flattening | Cloth-space textures now, flat pattern for the seamstress |
| M5 | Live generators with dependencies | Seam edits re-flow stones and trims |
| M6 | Mirror map | Symmetric design by default, asymmetry by choice |
| M7 | Keep-outs and overlap solve | Stones avoid edges, seams and straps; never overlap |
| M8 | Size and pose transfer | One design on every body and in the photo's pose |
| M9 | Live counts and cost tier | Decisions while designing |
| M10 | Benchmark harness | Each moodboard benchmark design rebuilt and compared at its photo camera |

[^owner]: Product owner, 2026-10-18
[^taxonomy]: Moodboard design-space taxonomy
[^catalogue]: Moodboard catalogue
[^doc-model]: Design document model
[^dist]: Stone distribution algorithms
[^vocab]: Stone placement vocabulary
