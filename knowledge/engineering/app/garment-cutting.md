---
type: Component
title: Garment cutting from curves (arrangement)
description: "How app/src/garment/ turns the document's curves into panels: projected surface splines, attached end points, insertion of every polyline into the canonical mesh, per-face planar subdivision, pruning, sliver merging, cells and panel seeds, with the tolerances and failure fallbacks that make it robust."
tags: [app, geometry, arrangement, component]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-21T18:00:00Z }
sources:
  - id: code
    resource: "app/src/curves/evaluate.js, curves/points.js, garment/arrangement.js, garment/build.js, garment/blocks.js (branch build/designer-app, 2026-10-19)"
    title: Garment cutting source
    author: claude-code/claude-opus-5-5
  - id: arch
    resource: /engineering/architecture/editor-architecture.md
    title: Editor architecture
---

# Takeaway

Every line of a design is a curve of surface points on the canonical MakeHuman mesh; the garment
is the canonical mesh **cut along every seam, edge and print line**, and each resulting cell is a
panel (or an opening).[^code] New vertices are themselves surface points, so the cut garment follows
every body size (and later pose) by barycentric interpolation, as planned.[^arch]

# Pipeline

1. **Reference garment surface** (`body/reference.js`): the reference body with fabric bridging
   its hollows everywhere a leotard can reach (the POC lift solve with full cover); curves live on it.
2. **Curve evaluation** (`curves/evaluate.js`): centripetal Catmull-Rom through control positions,
   1.5 mm samples, each projected back by a face walk from the previous sample (stays on the same
   sheet; global BVH closest point only as a fallback). Corner points reflect the phantom
   neighbour. Shape modifiers (scallop, zigzag, wave) offset across the curve with whole periods on
   closed curves. **Since 2026-10-21 the sampling runs on `surface.open`**: the reference body
   with both arms raised (the baked `up` arm poses, `body/reference.js openSurface`); the samples
   are surface points of the same mesh, so they are then placed on the reference surface
   unchanged. Reason: in the A-pose the inner arm nearly touches the side of the chest, so a line
   through the armpit (raglan, underarm, armhole, yokes, bandeau tops) projected some samples onto
   the arm; on a posed body they flew off with it, the "spike from the armhole up the arm" the owner
   reported on several designs. Measured on all 13 moodboard designs in the arms-outstretched pose:
   largest step between neighbouring samples 4-25 cm before, under 2 cm after, except the 2 cm
   crotch seam (4 cm, the gusset stretching between spread legs, not a jump). Lines away from the
   armpit sample exactly as before (the torso is the same in both poses).
3. **Attachments**: a control point may carry `on: { curve, t, mirror? }`; it then sits exactly on
   a sample of that curve, evaluated after it (topological order), so T-junctions are exact and
   follow edits. The mirror image of an attached point uses the target's mirror image, or for a
   self-symmetric loop (a neckline) the target sample nearest the mirrored point.
4. **Mirror**: `mirror: 'both'` evaluates a second polyline from mirrored control points
   (closest point to x -> -x); keys `id` and `id~m`.
5. **Arrangement** (`garment/arrangement.js`): (A) walk each polyline across faces, crossing
   points snap to a vertex within 0.3 mm, crossings of one edge within 0.22 mm merge; a failed
   straight walk falls back to a shortest edge path. (B) points within 0.15 mm merge per face
   (never two vertices, never points on different edges). (C) segment intersections and
   T-junctions per face. (D) dangling chains are pruned (a line ending mid-panel cuts nothing).
   (E) each touched face is triangulated as the planar subdivision of its split boundary and
   segments (half-edge face cycles, collinear-safe ear clipping, earcut only for holes). (F) cells by
   union-find over non-constraint edges, cell areas and adjacency; cells under 1.5 cm2 join the
   neighbour they share most boundary with.
6. **Panels** (`garment/build.js`): each panel's seed (and its mirror) claims the cell it lands
   in; unclaimed cells are openings. When a curve edit splits a panel, a hook adds panels for the
   new cells inheriting the parent's fabric stack (a cell and its mirror image become one mirrored
   panel), in the same undo step.

# Blocks

`garment/blocks.js` builds necklines (crew, scoop, V, high ring, boat; back crew, scoop, low, V,
keyhole, open), leg lines (standard, high), tank armholes or sleeve seams with cuffs (cap, short,
three-quarter, long) as zero contours of fields on the reference body, resampled to editable
control points, plus **shoulder, side, crotch and underarm seams** attached to them, so the block
cuts into front, back and sleeve pieces that each lie flat. The mannequin's egg head is a separate
mesh component (its own cell).

# Numbers

Default block on the young-adult body: about 1,200 faces touched, arrangement 110-180 ms in node.
Unit tests cover synthetic rings, crossings, chords, coincident and through-vertex curves, a
zigzag, every block option warning-free.

[^code]: Garment cutting source
[^arch]: Editor architecture
