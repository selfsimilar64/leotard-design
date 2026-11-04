---
type: Component
title: Fitted garments in the app
description: "How a block drafted by pattern-making rules and fitted by the fit solver is shown in the main app as a design choice beside the drawn pieces: meta.fitted, render/fitted.js, the Garment row of the Shape tab and two starting points; first the textbook (Armstrong) leotard."
tags: [app, fit, block, armstrong, garment, ui]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T01:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-03 (Claude Code session)
    title: "Draft a new design and integrate sim-fitted designs into the real app, as separate designs or design choices, keeping the non-block choices for now"
    author: human:mattj
  - id: code
    resource: "app/src/render/fitted.js, app/src/garment/fitted.js, app/src/render/engine.js (fitted), app/src/doc/commands-garment.js (fitted.set), app/src/garment/starts.js, app/src/ui/ShapeTab.jsx (Garment), pipeline/draft_armstrong.py, pipeline/publish_fitted.py"
    title: Fitted garment code
    author: claude-code/claude-opus-5-5
---

# Takeaway

**A design can now show a fitted garment instead of its drawn pieces.** The owner asked for the
solver-fitted designs in the real app beside the existing choices, not replacing them.[^owner] The
first is the [textbook leotard](/domain/construction/armstrong-leotard-foundation-draft.md), drafted by
Joseph-Armstrong's method at size 6 and fitted on the `young` body, offered with its basic and its
high-cut leg. Only blocks the project owns are shipped; fits of the [bought block](/domain/construction/basicpatternblock-leotard-block.md) stay dev-only.[^code]

# How a designer gets one

- **Shape tab, Garment row:** Drawn, Textbook leotard, Textbook leotard high cut. Picking one runs
  `fitted.set { key }` (undoable) and sets `meta.fitted`; Drawn sets it to null.
- **Starting points:** "Fitted: textbook leotard" and "Fitted: textbook, high cut" (`garment/starts.js`,
  `fitted` key); every other starting point clears `meta.fitted`.
- The drawn pieces stay in the design, hidden. Their panels named Front, Back and Sleeve lend their
  fabric, colour, print and finish to the fitted piece of the same name (Front when one is missing), so
  the Fabric tab works on a fitted garment unchanged. The Silhouette options keep shaping the drawn
  pieces only; the Garment row says so.

# How it is drawn

- `pipeline/draft_armstrong.py` drafts the block; `pipeline/wrap_block.py --drafted armstrong-6 young`
  fits it (CPU, minutes); `pipeline/publish_fitted.py` copies the owned fits into `app/public/fitted/`,
  which ships with the app. Its `OWNED` list and `FITTED` in `garment/fitted.js` are twins.
- Each fitted point is a host triangle and weights on the body's canonical surface, as the app's own
  pieces are, so `GarmentView.interpolate` places it on any body and pose (`render/fitted.js`
  `FittedView.place`, run on every `body.onGarment`).
- The body is told where the fitted fabric is (a cover hook), so the lift and the pose's slide treat it
  as fabric; the app's own pieces, edge finishes and fixed wrinkle zones are hidden; folds come from the
  fit (`aFold`); openings get the elastic finish from the fit's loops, in the Front panel's look.
- It grew out of the dev viewer `dev/wrap-eval.js` (`show`, `cover`, `finish`); each names the other.

# First fit: textbook leotard, size 6, on `young` (2026-11-04)

From `wrap_block.py --drafted armstrong-6 young` (median stretch over flat size):

| Stage | Across | Along | Inside out |
|---|---|---|---|
| Torso alone, 240 iterations | 1.14 | 1.11 | 0.00% |
| Sleeve alone, 240 iterations | 1.30 | 0.99 | 0.33% |
| Settled together, 60 iterations | 1.20 | 1.06 | 0.06% |
| High cut re-solved, 360 iterations | 1.19 | 1.07 | 0.04% |

- The book's sleeve is narrow (about 30% stretch round the arm against the torso's 14-20%) and ends
  about 25 mm past the wrist landmark: the cuff bunches in the render. The shoulder seam ends about 27 mm
  beyond the shoulder landmark. High cut: reusing the basic fit lands 4.8 mm mean (95% 11 mm) from
  re-solving it.
- Seen in the app: a smooth body, the waist crease at the small of the back that the earlier drafted
  block also shows, a small light speck under each arm, and in `lunge-arms-up` a few specks at one leg
  opening and a forearm (the carried standing fit).
- Checked in the app on port 5176: start points, the Garment row, undo and redo, a reload keeping the
  choice, recolouring through the panels, pose following, back to Drawn (pieces, edges and wrinkle zones
  restored). **[UNVERIFIED]** With the app's window minimised, designs in the "shiny" fabric drew no
  garment at all, drawn or fitted, an untouched starting point included; mystique drew. Most likely its
  shader had not compiled in a hidden window; check with the window in view.

# Known limits **[INFERRED]**

- **Fitted on one body.** On other bodies the young fit is carried by surface coordinates, not refitted.
  Refitting per body (CPU minutes, or the [GPU re-fit](/engineering/app/refit-in-the-app.md) once the app
  can build a case) is the next step.
- **Poses** slide the standing fit, as for the drawn pieces; no re-solve per pose yet.
- Stones, ombre gradients and decals are placed by the drawn pieces' geometry: stones still sit where
  the drawn pieces are, an ombre front shows no gradient. Not adapted yet.
- The flat (pattern) view still shows the drawn pieces.
- No thumbnails yet for the two starting points.

[^owner]: Conversation with the product owner, 2026-11-03.
[^code]: Fitted garment code.
