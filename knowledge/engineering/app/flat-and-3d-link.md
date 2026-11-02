---
type: Technique
title: The flat and 3D link
description: "Stage 4 prototype, 2026-11-01: artwork lives on one canvas per cut piece, the garment wears those canvases and the PDF prints them. Round trip exact, seam crossings continuous, export true to scale. Dev-only at /wrap.html; not in the app, and unproven on real fabric."
tags: [pattern, print, exploration, prototype, stones]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T03:00:00Z }
sources:
  - id: code
    resource: "app/src/dev/flat-link.js, app/src/dev/wrap-link.js, app/wrap.html, app/test/flat-link.test.js; results app/captures/wrap-link-eval.json, app/exports/flat-and-3d.pdf (git-ignored)"
    title: Link, prototype and tests
  - id: wrap
    resource: /engineering/app/wrapping-a-flat-block-onto-the-body.md
    title: Wrapping a flat block onto the body
---

# Takeaway

Flat and 3D agree because there is only one set of artwork: a canvas per cut piece, at exactly 2.5 pixels per millimetre.
The 3D garment wears it as its texture and the export prints it.[^code] It runs on the [wrapped block](/engineering/app/wrapping-a-flat-block-onto-the-body.md),
block XS on the `young` body with the `HIGH HIPS` leg and a sleeve 45 mm shorter. Open `/wrap.html` on the dev server (port 5176 in testing).

# What it does

- **Hover** on either side marks the same place on the other.
- **Draw line / Draw stones**, on the body or on a flat piece. A line drawn on the body is split at seams and carried to the true crossing, interpolated between sewn mesh points.
  A line drawn on a flat piece stays on that piece. Only Look turns the view.
- **Stones** sit at an even 8 mm on the flat cloth, so on the body they spread where the cloth stretches.
- **Project** a design or image from the current view onto the pieces: each piece gets the shape that reads straight on the body.
- **Poses**: artwork and stones follow, with nothing repainted.
- **Export** one true-size PDF page a piece: artwork, dashed sewing line, solid 6 mm cut line, 50 mm check square.

# Data

`pipeline/wrap_block.py` adds per cell `piece`, `half` and `wid` (welded id). Two points of one half with one `wid` are sewn. `FlatLink` holds flat-to-body and body-to-flat lookup and seams, in plain arrays.
A front is two mirrored cells of one piece; a sleeve is one cell per sleeve, since a print need not mirror.

# Results against the gate

| Gate | Result |
|---|---|
| Flat to 3D to flat under 0.5 mm | Under 0.001 mm for all of about 1,300 random points on the garment per pose, in 5 poses, none landing on another piece |
| Line across a seam continuous | Sewn points 0 mm apart in all 5 poses (346 pairs). A ring at waist height crosses both side seams with no jump, within 0.11 mm of the ring's height |
| Export at true size | Read back with PyMuPDF: 2.500 px/mm on all pieces, check square 50.0 mm, cut line outside the sewing line |

**[INFERRED]** These prove internal consistency, and the exact figures follow from one shared mesh. They do not show that a printed garment matches: that is [stage 5](/product/roadmap/flat-and-3d-exploration-plan.md).
Two bugs were found only by reading the PDF back: the cut line was inside the sewing line on three pieces, and rounding the canvas size put artwork about 0.07% off scale.

# Known gaps

- Drawing was exercised by simulated pointer strokes and the browser tool's coarse drag, not by hand. The tool's drag sends too few positions to cross a seam, so a stroke in dense steps tested that.
- A jump across air (chest to a hanging arm) ends the stroke rather than carrying over.
- Projection has no occlusion: it paints through to what the arm hides, and stops with a rough edge where the surface turns away from the view.
- No bleed: artwork stops at the sewing line, so the 6 mm allowance prints blank where a design runs off a seam. A printer will need it extended.
- The cut line uses a simple offset, so its corners are approximate. Hems and elastic edges get the same 6 mm.
- Prints use a plain material, not the app's fabric shaders; finishes are still not drawn.
- Stones are placed at the standing fit's flat point and are not checked for spacing or colliding, and printed texture resolution is 2.5 px/mm (about 64 dpi): enough to test placement, low for production.

[^code]: Link, prototype and tests
