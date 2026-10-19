---
type: Technique
title: Painting and sculpting tool models for stone placement
description: "Reference interaction models for brushes: Substance Painter's recorded, recomputable strokes and 3D paths; Blender's stroke vocabulary (space, drag dot, anchored, airbrush, line, curve, jitter, stabilise); Nomad Sculpt's slide-on-surface insert, curve repeater and mirror repeater; Procreate and Figma Draw."
tags: [ux, brushes, painting, sculpting, reference]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-tools
    resource: /references/research/existing-tools-and-ux-mechanics.md
    title: "Research notes: existing tools and UX mechanics (section 6)"
  - id: report
    resource: /references/research/research-report.md
    title: "Research report: Borrow the engine, build the sparkle"
  - id: painter
    resource: https://www.adobe.com/products/substance3d/apps/painter.html
    title: Adobe Substance 3D Painter
  - id: cgchannel-painter
    resource: https://www.cgchannel.com/2023/06/adobe-releases-substance-3d-painter-9-0/
    title: CG Channel on Substance 3D Painter 9.0 (cited in the report)
  - id: procreate
    resource: https://help.procreate.com/procreate/handbook/3d-painting
    title: Procreate Handbook, 3D painting
  - id: blender-stroke
    resource: https://docs.blender.org/manual/en/latest/sculpt_paint/brush/stroke.html
    title: Blender 5.2 manual, brush stroke methods
  - id: nomad
    resource: https://nomadsculpt.com/manual/tools.html
    title: Nomad Sculpt manual, tools
  - id: figma-draw
    resource: https://www.figma.com/draw/
    title: Figma Draw
---

# Takeaway

The best references for crystal brushes come from 3D painting (non-destructive strokes that can be
recomputed, editable paths on the model) and sculpting (click-drag insertion of instances that
slide over a surface, objects repeated along a curve, mirroring as a live parent).[^notes-tools]
Dressmaker has none of these; see [Dressmaker build loop](/engineering/ux/dressmaker-build-loop.md).

# Substance 3D Painter

- "Painter is non-destructive." "Every action and stroke is recorded and can be recomputed at any
  time."[^painter]
- Dynamic brushes, projection, particles, Photoshop brush presets; real-time viewport with lighting
  and shadows; v11.0 added "filled 3D paths and enhanced control of 3D path creation and
  manipulation"; US$59.99/month in the Substance 3D Collection.[^painter]
- Its path tool lets an artist click a curve onto a 3D model and keep editing both curve and brush
  afterwards (report, citing the 9.0 release coverage).[^cgchannel-painter][^report]
- **[UNVERIFIED]** leads: mirror and radial symmetry; Illustrator scatter/pattern brushes and
  "Objects on Path" (Adobe docs returned 403).[^notes-tools]

# Blender stroke methods (5.2 LTS manual): a ready vocabulary

| Method | Behaviour | Stone-brush use [INFERRED] |
|---|---|---|
| Space | Dots at a fixed Spacing | Evenly spaced row of stones |
| Drag Dot | One dab placed by dragging | Single stone that slides before release |
| Anchored | One dab, resized by dragging | Single stone sized by drag |
| Airbrush | Flow continues while held, at a Rate | Scatter / density spray |
| Line | Straight line of dabs; Alt snaps 45 degrees | Straight borders |
| Curve | Dabs follow an editable Bézier "Paint Curve", reusable | Editable path of stones |
| Jitter | Random offset per dab | Organic scatter |
| Stabilize Stroke | Stroke trails the cursor to smooth it | Clean lines by hand or pen |

Source: Blender manual.[^blender-stroke]

# Nomad Sculpt

- Insert: "Place an object on the surface of another." In Instance mode "dragging will create and
  slide a new instance over the surface"; size copied from the first shape so "you can place many
  same-sized instances". Instances are linked.[^nomad]
- Tube: draw a curve; convert to a "Curve Repeater"; option to "add a mirror repeater as a parent
  of this curve". Stamp: drag sets size and rotation (suits rivets).[^nomad]

# Others

- Procreate paints directly on imported 3D models "without affecting the original textures",
  separates layers into colour, metallic and roughness, has a "Lighting Studio" and AR view.[^procreate]
- Figma Draw: vector brushes, dynamic and variable-width strokes, text on a path, repeat/transform
  tools for patterns from one element, multi-vector editing and lasso.[^figma-draw]

# What carries over

**[INFERRED]** Recorded strokes (Painter), the stroke vocabulary (Blender), slide-before-release and
mirror-as-parent (Nomad), and a lighting studio for judging sparkle (Procreate, Painter) feed
patterns 6-11 and 14 of the [UX pattern library](/engineering/ux/ux-pattern-library.md) and the
[procedural stone strokes](/engineering/ux/procedural-stone-strokes.md) design.[^notes-tools]

# Gaps

ZBrush Insert Multi Mesh / curve mode (help site redirected), Procreate symmetry in 3D, Figma's
vector networks.[^notes-tools]

[^notes-tools]: Research notes, existing tools and UX mechanics, section 6
[^report]: Research report, Dressmaker section
[^painter]: Adobe Substance 3D Painter page
[^cgchannel-painter]: CG Channel, Painter 9.0
[^procreate]: Procreate Handbook
[^blender-stroke]: Blender manual
[^nomad]: Nomad Sculpt manual
[^figma-draw]: Figma Draw
