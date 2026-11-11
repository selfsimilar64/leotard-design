---
type: Component
title: Fitted garments in the app
description: "How a block drafted by pattern-making rules and fitted by the fit solver is shown in the main app as a design choice beside the drawn pieces: meta.fitted, render/fitted.js, the Garment row of the Shape tab and starting points; the textbook (Armstrong) leotard, since 2026-11-07 Aldrich's bodyshaper leotard, and since 2026-11-08 the hybrid (Armstrong with the crotch seam forward)."
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
  - id: owner3
    resource: "conversation with the product owner, 2026-11-07 (Claude Code session): offer the bodyshaper as its own block, sizing at Claude's discretion; avoid swimwear"
    title: Owner on the bodyshaper block
    author: human:mattj
  - id: code
    resource: "app/src/render/fitted.js, app/src/garment/fitted.js, app/src/render/engine.js (fitted), app/src/doc/commands-garment.js (fitted.set), app/src/garment/starts.js, app/src/ui/ShapeTab.jsx (Garment), pipeline/draft_armstrong.py, pipeline/draft_aldrich.py, pipeline/draft_hybrid.py, pipeline/publish_fitted.py"
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
- The body is told where the fitted fabric is (a cover hook), so the lift (and, until 2026-11-08, the pose's slide) treat it
  as fabric; the re-fit stood on that lifted surface ([fabric bridging hollows](/engineering/geometry/fabric-bridging-hollows.md)) until 2026-11-10, and now stands on the bare skin, settled without friction first, lit by its own shape ([decision](/decisions/2026-11-10-fit-on-bare-skin.md)); the app's own pieces, edge finishes and fixed wrinkle zones are hidden; folds come from the
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
  minimised-window effect as first guessed. **Fixed later that day** by packing the fabric's attributes
  ([the fabric's vertex attributes](/engineering/rendering/fabric-shading/fabric-vertex-attributes.md)); satin, duotone satin and
  wet failed the same way.

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

# Shown only once fitted; seams (2026-11-04, owner's review)

- **Never the unfitted state.** The owner never wants to see the garment carried into a new pose before its re-fit finishes.
  With re-fit on, a body or pose change holds the 3D view on its last frame (`viewport.holds`) until the re-fit is drawn, fails,
  or 8 s pass; a steps or friction change keeps the current fit on show until the new one is in. Turning re-fit off shows the
  carried fit. While held the view does not turn either.
- **Telling the designer.** "Fitting the leotard…" shows in the stage's busy pill while a re-fit runs, beside the existing
  "Posing…"; the owner asked that every fit or pose calculation that can take seconds says so.
- **Seams in 3D.** The fitted pieces carried no seam distance, so the fabric's seam groove never showed and, once the drawn
  lines were hidden, no seam lines either. Now each point's distance to the nearest sewn edge (from the case: edges whose two
  triangles sit apart in the flat pattern) feeds `aSeam`, and the garment's seams (yellow) and openings (blue) are drawn as
  overlay lines 2.2 mm over the fabric, following the lines button.

# Stones on a fitted garment (2026-11-04)

The owner saw a stone pattern sink below the fitted fabric in places and no stones in the flat view: stones were still laid on
the hidden drawn pieces and drawn on the body's surface, where the fitted fabric does not lie.

- **Laid on the fitted pieces.** With a fitted garment on, `Engine.clothOf` gives each panel the fitted piece of its name as flat
  cloth (`stones/fitted-cloth.js` FittedCloth: the drafted piece's own flat shape, the front and back each both halves joined at
  the fold, a sleeve one of the pair; origin at its points' mean, as a drawn piece's). It answers what a drawn ClothPiece answers,
  so stone patterns and their handles work unchanged.
- **Drawn on the fitted fabric.** Each pattern stone carries `fit` (its fitted triangle's whole-garment points and weights); the
  stone view places it at those points as drawn now (`FittedView.frameAt`: after every re-fit and lift change) plus the usual
  1.45 mm. Mirrored stones (the other sleeve) take the mirror points (`mirrorFit`). Stones keep off the fitted garment's own
  openings, not the drawn pieces'.
- **In the flat view** the fitted pieces show their stones by the same `fit` and take the pattern handles; a drag edits both views.
- Checked on a copy of the owner's design (a lattice on the high-cut front, in `lunge-arms-up`): 3345 stones, every one on the
  fitted fabric in 3D and on the front piece in 2D; a 2D move drag and its undo.
- Still on the body surface: stone kinds other than patterns (rows, scatters, fills) on a fitted garment.

# Views (2026-11-04)

- **Three layouts** in the top bar: 3D, Both, Pattern (`ui/Shell.jsx` LAYOUTS, `layout` 3d | split | flat). The 3D view stays alive
  in Pattern (narrowed to nothing), so switching back is instant. In Both a divider drags (or arrow keys; double-click centres);
  its place is kept (`prefs.split`, 20-80%).
- **The fitted garment's own pieces** in the flat view (`garment/fitted.js` fittedPieces: each piece once, its stitching line).
- **Piece focus:** double-click a piece: it alone, fitted to the view, with its size, a strip of the other pieces and All pieces or
  Esc to go back. Choosing a piece in either view chooses its panel (the Fabric tab follows). The 3D view does not yet highlight a
  fitted piece.

# Second block: Aldrich's bodyshaper, size 6 (2026-11-07)

The owner asked for Aldrich's bodyshaper as its own block, sizing left to us and swimwear kept out.[^owner3]
Drafted by `pipeline/draft_aldrich.py` ([the method and our choices](/domain/construction/aldrich-stretch-body-and-swimwear-blocks.md)),
fitted with `wrap_block.py --drafted aldrich-6 young`, published as `aldrich-6-block`. Offered as **Bodyshaper leotard** in the
Garment row and as the starting point "Fitted: bodyshaper leotard". It has no high-cut variant; `wrap_block.py` and
`check_pattern.py` now skip the high leg when a block has none (the seed then matches the block's own leg).

**Size chosen for tension.** Fitted on `young`, median stretch round the torso after the torso solve:

| Chart size (bust) | Torso across / along | Settled, all pieces | Back waist, along |
|---|---|---|---|
| 12 (88 cm) | 1.005 / 0.983 | 0.954 / 0.965 | 0.825 |
| 8 (80 cm) | 1.075 / 1.007 | 1.011 / 0.981 | not read |
| **6 (76 cm), offered** | 1.117 / 1.019 | 1.044 / 0.984 | 0.669 |
| Armstrong 6, for comparison | 1.14 / 1.11 | 1.20 / 1.06 | not read |

Size 12 lies on the body unstretched and ripples across the back; size 6 is taut in front, nearest the Armstrong block's tension.

**Seen in the app (port 5176):** the front smooth and close; the back gathers into a band of folds at the small of the back
(the fabric there about 33% shorter than flat), far more than the Armstrong block's faint crease. Cause **[INFERRED]**: the book
takes no length out for stretch, and with the gusset joined the bodyshaper's centre lines run about 7 cm longer front plus back
than Armstrong's (size 6: back about 77 cm with the gusset, front about 57 cm), so the spare length gathers where the fabric bridges
the lumbar hollow. A length reduction for four-way fabric is the fix to source (Cole ch. 5 reduces two-way foundations to four-way
stretch), not to invent. The sleeve ends about 1 cm short of the wrist landmark and lies about 7% wider than the arm (settled across
0.93): the book's sleeve is roomy.

# Third block: Cole's stretch-knit leotard (2026-11-08)

At the owner's request, after comparing Jalie patterns: [Cole's one-piece](/domain/construction/cole-leotard-block.md),
drafted by `pipeline/draft_cole.py` from the `young` body's measures, fitted with `wrap_block.py --drafted cole-young young`,
published as `cole-young-block`, offered as **Stretch-knit leotard** and the starting point "Fitted: stretch-knit leotard".

| Stage | Across | Along | Inside out |
|---|---|---|---|
| Torso alone, 240 iterations | 1.123 | 1.179 | 0.00% |
| Sleeve alone, 240 iterations | 1.283 | 1.000 | 0.75% |
| Settled together, 60 iterations | 1.184 | 1.104 | 0.10% |

Close to the Armstrong block's tension (1.20 / 1.06), tighter lengthwise (the four-way length reductions on a short torso).
Seen in the app (port 5176): front and back smooth, no fold at the small of the back, a high-cut leg; the cuff ends about
1 cm short of the wrist landmark.

# The purchased block, local only (2026-11-08)

The owner asked to see the [purchased block](/domain/construction/basicpatternblock-leotard-block.md) fitted in the app, as the
yardstick beside the drafted blocks. Its licence bars redistribution, so it never ships: `wrap_block.py XS` refits it on `young`
into the git-ignored `app/captures/`; the dev server serves `wrap-*.json` from there at `/fitted-local/` (`vite.config.js`, beside
the other never-bundled routes); `garment/fitted.js` lists **Purchased block (local)** and **Purchased block, high cut (local)** only
when `import.meta.env.DEV`; `render/fitted.js` loads entries marked `local` from that route. A release build has neither the
entries nor the files. A Vite config change restarts the dev server once per save; a second quick save can be missed (restart it).

| Stage | Across | Along | Inside out |
|---|---|---|---|
| Torso alone, 240 iterations | 1.114 | 1.005 | 0.00% |
| Sleeve alone, 240 iterations | 1.042 | 0.929 | 0.25% |
| Settled together, 60 iterations | 1.090 | 0.972 | 0.07% |

Back waist along 0.719: the purchased block also gathers lengthwise at the small of the back on `young`, as Aldrich's did (0.669)
and Armstrong's far less; some of that fold is the body and the fit, not only the patterns. Its sleeve is wide and long (0.93 along).

# Hybrid block: Armstrong with the crotch seam forward (2026-11-08)

Owner's read of the fits on `young`: crotch best on the purchased high cut and the bodyshaper; seat best on the purchased block and
Armstrong; sleeve best on the purchased block and Armstrong; torso best on Armstrong. Asked to combine them into one block.
Armstrong already carries torso, seat and sleeve, and is ours, so it is the base. What the two best crotches share and Armstrong
lacks is a seam placed forward, under the body (the back runs further through the crotch, as Aldrich's gusset joined to the back).
`pipeline/draft_hybrid.py` runs Armstrong size 6 with two options added to `draft_armstrong.leotard` / `draft` (defaults keep the
book's block byte-identical): `shift`, the front's crotch point raised and the back's lowered by it, every leg line (basic and high,
front and back) drawn to the moved point by the book's own rules; and `crotch_half`, the crotch's half width.

Two numbers come from the purchased block as targets; none of its lines:
- **SHIFT = 29 mm**, from the armpit heights above the crotch (side seams are sewn front to back, so they are the fair reference):
  Armstrong 456 / 456 mm front / back, purchased XS 481 / 539 (58 mm), Aldrich 6 402 / 559 (158 mm). Half the purchased difference.
  Centre lengths mislead (they carry the neck depths; they gave 39 mm at first).
- **Crotch half width 1 1/2 in** on the cutting line (28.6 mm stitched; purchased 29.3). Armstrong's 1 3/4 in gives 34.9; Aldrich,
  Cole and Richardson give 35-38 mm, so no book gives the narrower crotch.

First version (owner: "the crotch still doesn't fit the same as the purchased block"): a strip cut off the front and joined to the
back, legs trimmed, crotch at Armstrong's width. Trimming cut away the steep, narrow rise of the book's high front leg out of the
crotch; on the body its front leg line sat 8-17 mm wider each side than the purchased one. Redrawn as above.

Checks: 31 of 42, the same failures as Armstrong's own draft, none new; fitted outlines 12 of 12. High-cut front leg half width on
the pattern at 40 / 80 mm above the crotch: purchased 32 / 42, hybrid 36 / 59 (first version 51 / 81). Fit
(`wrap_block.py --drafted hybrid-6 young`), high cut settled 1.194 across, 1.063 along.

On the body (`young`, fitted), front crotch seam position (+ towards the body's front, mean of its points) and the leg line's
inner-most distance from the midline at heights above the body's crotch, mm:

| Fit | Seam | Front leg at 10 / 30 / 50 / 80 / 120 | Back leg at 10 / 30 / 50 / 80 / 120 |
|---|---|---|---|
| Purchased high cut | -24 | 18 / 34 / 52 / 78 / 120 | 45 / - / 85 / 107 / 131 |
| Hybrid high cut | -9 | 16 / 34 / 57 / 82 / 130 | 45 / 68 / 91 / 112 / 132 |
| Armstrong high cut | -38 | 21 / 42 / 62 / 96 / 136 | 40 / 63 / 86 / 110 / 131 |
| Hybrid basic leg | -21 | 14 / 32 / 39 / 59 / 149 | 73 / 108 / 125 / 140 / 153 |

Purchased thigh leg seam +4, Aldrich 6 +37.

Offered as **Hybrid leotard** and **Hybrid leotard, high cut** (Garment row; starting points `fitted-hybrid`, `fitted-hybrid-high`),
published by `publish_fitted.py` as `hybrid-6-block`, `hybrid-6-high-resolved`.

# Pattern size, and folds from every re-fit (2026-11-08)

Owner: "Can we also edit the size of the whole garment? That way we could control how taut the fabric sits and then potentially
remove the bumps and folds."

- **Size.** `meta.fitSize` `{ width, length }` (op `fitted.size`, 0.8-1.1, null = 1 x 1; a starting point resets it, picking another
  fitted garment keeps it): the pattern scaled across (x) and along (y, the grain) before the GPU re-fit. `fit/fitted-case.js
  garmentArrays(data, size)` scales the case's flat rest shape, and each elastic span's rest length by its own flat direction (the
  edge of a triangle holding both ends). `render/fitted.js sync` rebuilds the garment arrays on a size change, drops only the cached
  constant matrix (`cache.matrix`, made from the rest shape; body parts and trees stay) and re-fits (view held). Shape tab, Garment:
  Width and Length sliders (CommitSlider: applied on release, each change re-fits). The flat view keeps the drafted outlines (the
  stones' frames are laid in them) and says "cut at W% wide, L% long" on each piece's label.
- **Folds follow the re-fit.** Before, a fitted garment always drew its file's folds (`cells[].fold`, from the standing fit on
  `young`), whatever the body, pose or size. Now `show()` recomputes them from the re-fit's points (`fit/folds.js foldsOf`, twin of
  `wrap_block.folds_of`, checked by `test/folds.test.js` against a fixture the Python made) at the scaled pattern; without a re-fit
  (off, no WebGPU, none run yet) the file's folds are drawn as before. On `young` in the A-pose at 1 x 1 the live folds equal the
  file's (folded area back 15%, front 4%, sleeve 28% both ways). Other bodies and poses now show their own: the hybrid high cut on
  `teen` standing, back 50% / front 18%; `lunge-arms-up` back 57% / front 32%.

Hybrid high cut on `young`, A-pose, share of each piece's points with a fold over 1 mm (mean height):

| Size (width x length) | Back | Front | Sleeve |
|---|---|---|---|
| 100 x 100 | 15% (0.47 mm) | 4% | 28% (1.22) |
| 95 x 95 | 9% | 4% | 26% |
| 95 x 90 | 7% (0.27) | 4% | 25% (1.01) |
| 90 x 90 | 6% | 3% | 25% |

The crease across the small of the back at 100% is gone at 95 x 90 (seen in the app, back view). Sleeve folds barely move with size
(they are not spare length). On `teen` standing, 95 x 90 halves the back's (50% to 25%). A re-fit of 150 steps takes about 0.6 s.

# Only the high cuts since 2026-11-10

The owner removed the purchased thigh leg, the textbook and hybrid basic legs, the bodyshaper and the stretch-knit leotard from the
Garment row and the starting points ([decision](/decisions/2026-11-10-high-cut-fitted-garments-only.md)). The sections above keep
their history; a design naming one shows its block's high cut, or the drawn pieces.

# A design recut from the hybrid (2026-11-10)

The owner's strappy-back illustration, recut from the hybrid high cut as pattern changes and fitted from the block's fit, is listed in
dev only as **Strappy back (local)**: [designs recut from a fitted block](/engineering/app/designs-recut-from-a-block.md). Openings a
file marks `finish: binding` and cells named Strap take the design's binding look (`meta.fittedTrim`).

# Known limits **[INFERRED]**

- **Fitted on one body.** On other bodies the young standing fit is carried by surface coordinates and then re-fitted by the GPU
  re-fit, which settles it on that body but cannot grow or shrink the pattern: a child wears the young block.
- **Determinism:** every re-fit starts from the standing fit carried onto the body shown, so it does not depend on what was shown
  before; the body trees' layout does depend on the first body seen (the answers do not).
- Ombre gradients and decals are placed by the drawn pieces' geometry (an ombre front shows no gradient), and so are stone
  kinds other than patterns. Not adapted yet.
- No thumbnails yet for the two starting points.

[^owner]: Conversation with the product owner, 2026-11-03.
[^owner2]: Conversation with the product owner, 2026-11-04: do the views, the live case and the settings.
[^code]: Fitted garment code.
[^owner3]: Owner on the bodyshaper block, 2026-11-07.
