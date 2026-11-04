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
  - id: owner2
    resource: conversation with the product owner, 2026-11-04 (Claude Code session)
    title: "Do all three: the 2D + 3D views, the live re-fit case in the app, and the solver's settings"
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
  restored). Designs in the "shiny" fabric draw no garment at all, drawn or fitted, an untouched
  starting point included: its shader fails to link with "Too many attributes (aSeam)" (WebGL allows 16
  per vertex on this machine; adding `aFold` in commit 1600d71 pushed shiny's variant over). Not a
  minimised-window effect as first guessed; not fixed here.

# Re-fitted live in the app (2026-11-04)

The owner asked for the GPU re-fit, its settings and the 2D + 3D views in the real app.[^owner2]

- **Case built in the app.** `wrap_block.py` now also writes each fit's solver case into the fitted file (`case`: the whole
  garment joined at the fold, rest shape, elastic, sleeve points; per cell `cid`, per opening `ids`), built as
  `pose_resolve.whole` does (twins, cross-referenced). `fit/fitted-case.js` makes the rest from the live body: the start (every
  point by its hosts on the current garment surface), the torso and arm parts with pseudo-normals (`partGeometry`, twin of
  `gpu.part_geometry`).
- **When it runs.** After every body, pose or cover change (`body.onGarment`): the carried fit is drawn at once, then
  `FittedView.refit` runs `fit/refit.js` for the set step count (no early stop) and draws the last window's average. A change
  during a run runs it again on the new body. Without WebGPU the carried fit stays and the panel says why.
- **Speed** (GTX 1650, app rendering at the same time): a pose change 0.6-1.2 s to set up and 0.5-1.1 s for 150 steps once warm;
  the first after a reload about 1.6 + 1.4 s (programs compiled). Kept between runs (`cache`): the garment's constant matrix and
  gathers, the compiled programs, the body parts and edge pairing, the body trees (refitted to the new points, `refitBVH`, not
  rebuilt: same answers). Reading back drift every 10 steps cost about 0.6 s of 150, so the app reads once at the end.
- **Settings** (Settings, Fabric fit, kept per computer: `render/display.js` fit*): re-fit on or off, steps (20-750, default
  150), friction (0-1, default 0.4), fabric drawn off the body (0-5 mm, default 1.2 mm on top of the material's own 1.2 mm; the
  dev viewer's). The lift only redraws. The panel shows the last re-fit's steps and time.
- **Fabric off the body.** Positions are now the re-fit's points (or the carried ones) on the lifted garment surface plus the lift,
  with `aLift` zeroed, as the dev viewer drew them; the first in-app version used the app's own placement without the extra
  1.2 mm, which let the flat 7 mm triangles dip into the body (the peek-through the owner saw).
- **Seen:** `lunge-arms-up` re-fitted shows no skin at the leg opening or forearm where the carried fit did; `passe` on the high cut
  clean. A lighter fade at the lower front in `passe` was seen and not explained (lighting or material) **[UNVERIFIED]**.

# Views (2026-11-04)

- **Three layouts** in the top bar: 3D, Both, Pattern (`ui/Shell.jsx` LAYOUTS, `layout` 3d | split | flat). The 3D view stays alive
  in Pattern (narrowed to nothing), so switching back is instant. In Both a divider drags (or arrow keys; double-click centres);
  its place is kept (`prefs.split`, 20-80%).
- **The fitted garment's own pieces** in the flat view (`garment/fitted.js` fittedPieces: each piece once, its stitching line).
- **Piece focus:** double-click a piece: it alone, fitted to the view, with its size, a strip of the other pieces and All pieces or
  Esc to go back. Choosing a piece in either view chooses its panel (the Fabric tab follows). The 3D view does not yet highlight a
  fitted piece.

# Known limits **[INFERRED]**

- **Fitted on one body.** On other bodies the young standing fit is carried by surface coordinates and then re-fitted by the GPU
  re-fit, which settles it on that body but cannot grow or shrink the pattern: a child wears the young block.
- **Determinism:** every re-fit starts from the standing fit carried onto the body shown, so it does not depend on what was shown
  before; the body trees' layout does depend on the first body seen (the answers do not).
- Stones, ombre gradients and decals are placed by the drawn pieces' geometry: stones still sit where
  the drawn pieces are, an ombre front shows no gradient. Not adapted yet.
- No thumbnails yet for the two starting points.

[^owner]: Conversation with the product owner, 2026-11-03.
[^owner2]: Conversation with the product owner, 2026-11-04: do the views, the live case and the settings.
[^code]: Fitted garment code.
