---
type: Component
title: "The studio interface: stage, four task tabs, design library"
description: "How the designer app's interface is built since 2026-10-29: a light atelier layout (top bar, a rounded stage with a floating view bar, a panel of four task tabs: Shape, Fabric, Sparkle, Stage), a full-window design library with front-and-back pictures, canvas tools as modes started from their tab with a mode bar on the stage, wrapping picture grids instead of sideways-scrolling rows, the camera gliding to the element being changed, the mannequin always headless with a switch to hide it (the leotard drawn hollow, ghost-mannequin style), and every tile picture re-rendered as a close-up on the matte white mannequin (src/dev/thumbnails.js, render/pictures.js, materials/swatches.js swirlThumb). Files, behaviours and pitfalls."
tags: [app, ui, interface, thumbnails, mannequin, component]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-29T18:00:00Z }
sources:
  - id: code
    resource: "app/src/ui/ (Shell.jsx, Panel.jsx, ShapeTab.jsx, FabricTab.jsx, SparkleTab.jsx, StageTab.jsx, Library.jsx, kit.jsx, icons.jsx, camera.js, state.js, toolbar.js, tools.js, FlatView.jsx, styles.css), app/src/render/pictures.js, app/src/materials/swatches.js (swirlThumb), app/src/dev/thumbnails.js, app/src/render/engine.js (setBodyHidden), app/src/render/garment.js (setDoubleSided), app/src/doc/migrate-g9.js (migrateBody), app/src/doc/commands-core.js (body.set) on build/designer-app"
    title: Source
    author: claude-code/claude-opus-5-5
  - id: decision
    resource: /decisions/2026-10-29-mannequin-only-interface-overhaul.md
    title: Owner direction (mannequin only, close-up thumbnails, interface from first principles)
---

# Takeaway

The 3D mannequin is the canvas; everything else is a catalogue of choices about the leotard or
about how it is shown. The window is a **top bar**, the **stage** (the 3D view, rounded, inset in
a warm paper-grey room) and a **panel of four task tabs**: **Shape** (silhouette elements, drawn
lines and straps), **Fabric** (the pieces, each one's colour, gradient and material), **Sparkle**
(crystals, lettering) and **Stage** (mannequin, age and build, pose, studio, sparkle effects).
Choices are pictures in wrapping grids, segmented controls, switches and sliders: nothing in the
panel scrolls sideways, and no choice with a visual answer is a drop-down. Starting points,
finished designs and saves live in a full-window **library**. Supersedes the side-panel layout of
[side panel and presets](/engineering/app/side-panel-and-presets.md) and the rail and panes of
[building blocks and starting points](/engineering/app/building-blocks-and-starting-points.md)
(their commands and engine parts still apply).

# Layout (`ui/Shell.jsx`, `ui/styles.css`)

| Place | Contents |
|---|---|
| Top bar | Designs (opens the library), the design's name (serif, edit in place), its state (Saved / Unsaved changes / Not saved yet, `savedRev` against `app.revision`); undo, redo; Pattern (the pattern pieces beside the model), Export (the PDF pattern), Save; settings |
| Stage | the 3D view; with Pattern on, the flat pieces beside it (`ui/FlatView.jsx`); the **view bar** floating at the bottom (Front, ¾, Side, Back, lines on/off, mannequin on/off, fit); the **mode bar** at the top while a tool is on; a busy chip (top right) while a slow change runs; toasts; the frame-rate read-out |
| Panel | the four tabs (sliding underline); one vertical scroller per tab page |
| Library | over everything: Start fresh (the six starting points), Finished designs (`designs/b<n>-*`), Your designs (other saves); each a front-and-back picture |
| Settings popover | display (resolution, smooth edges, shadows as segments; lower resolution while turning, glow, contact shadows as switches), Working (the view turns to the part being changed), fabric fit (experimental, folded), performance |

Design tokens are CSS custom properties on `:root` (paper neutrals `--bg`, `--surface*`, `--tile`,
ink `--ink*`, radii, shadows, `--ease`); the display face is the system serif (`ui-serif`: New
York on iPad and Mac, Sitka on Windows) for names and titles, the system sans for everything else.
Touch targets are 36-44 px; hover lifts only where a pointer hovers (`@media (hover: hover)`), the
chrome cannot be text-selected by a long press, buttons skip the double-tap delay. Below 1180 px the
top bar drops its labels; below 820 px the panel moves under the stage and the grids take as many
columns as fit. `prefers-reduced-motion` stops the animations. Until the first part is chosen, a
hint on the stage says how to turn, zoom and pick a piece (`prefs.hintDone`).

# The tabs

- **Shape** (`ui/ShapeTab.jsx`): *Silhouette* is a list of the elements (neckline, back, sleeves,
  straps when sleeveless, armhole with sleeves, leg cut, front yoke, waist seam), each row showing
  its current option's picture; one row opens at a time (remembered, `prefs.shapeOpen`) into a
  3-column grid of close-up options. Opening a row glides the camera to that element
  (`ui/camera.js focusOn`, when `prefs.followCamera`). A pick dry-runs `block.set` and asks inline
  when it would take something away (the Ask card), as before; the change itself runs through
  `slow()` so the busy chip shows before the re-cut holds the page. *Lines and straps*: Draw a
  seam / Draw a strap (the pen and strap tools, their options inline), and the drawn lines
  (curves without a `block` key, not strap paths) and straps as rows. A selected line or strap gets
  its own page (back to Shape): kind, mirror, closed, finish as cross-section icon tiles (turned
  elastic, binding, raw; plain seam, piping, tape) with the binding's look, edge shape as icon
  tiles (plain, scallop, zigzag, wave), add a band; a strap's width, edges, stacking and look.
- **Fabric** (`ui/FabricTab.jsx`): the pieces as chips (colour dot, name; an opening dashed); the
  tab opens on the first piece (`ui/Panel.jsx pickTab`). For the chosen piece: its name (edit in
  place), Cut out; **colour** dots and a colour well, the second colour of a two-colour fabric,
  the foil / glitter / shift colour of fabrics that have one (now beside the colour, not under
  More); **gradient** (None / Fade, the far colour, direction); **material** (its defining controls
  first: sheerness for mesh, the satin's four, then the grid of every fabric in moodboard order and
  the scanned fabrics); *Fine-tune* (texture size, grain, effect, rainbow speed, gradient
  positions, print). `LookControls` (compact, 5 columns) serves straps and bindings.
- **Sparkle** (`ui/SparkleTab.jsx`): three modes as big buttons (Rows & fills, Single, Eraser);
  the crystal: colour as gem dots in the library's order with an AB switch, size as discs drawn to
  scale (ss3-ss48), cut as outline icons; rows-and-fills options; *On this design*: crystal groups
  (rows with counts) and counts by size and colour; *Lettering and logos* (font previews in each
  face, look as segments, colour, width, turn). A selected group gets its page (crystal, layout,
  release, delete, unknown parameters under Advanced); a selected logo its page, with Move it.
- **Stage** (`ui/StageTab.jsx`): the mannequin (Show switch, finish as round close-ups, colour),
  age and build (3 columns, one scale), pose (4 columns), studio (4 columns, brightness, turn the
  lights, behind the mannequin: plain colour or the studio room), sparkle effects (glow, crystal
  glare as star icons with size and strength).

Selecting a part on the model opens its tab (`ui/state.js TAB_OF`); leaving the Fabric tab
deselects a piece; a tool belonging to another tab stops when the tab changes. A chosen piece glows
briefly on the model (`GarmentView.flash`, its material's emissive for 0.65 s), so the eye finds
which piece the panel shows. Fabric tiles carry short names (`SHORT`; the full name stands beside
the Material heading); mannequin finishes are round close-ups without names (the chosen one's
name beside the heading). Older designs' block lines (no `block` key, named as the block names
them, `blockKeyOf`) count as the silhouette's, not as drawn lines.

# Tools as modes (`ui/toolbar.js`, `ui/tools.js`)

There is no tool rail. Select (`move`) is the default; the others start from their tab or key
(P seam, S strap, G rows and fills, 1 single, D eraser, L lettering) and show the mode bar: what
a click does, Finish (Enter) / Cancel or Done (Esc). On a touch screen one finger turns the view in
Select and draws or places in the other tools, two fingers turn and zoom (`controls.touches`). H
hides the lines, M the mannequin; Esc ends a tool, then clears the selection; a double click (tap)
in Select fits the leotard in view (with the mannequin hidden, Fit frames the leotard alone). A logo's page can
move it (`toolOptions.moveDecal`: the lettering tool's next click sets its `at`).

# The mannequin

`doc/migrate-g9.js migrateBody` opens every design on the headless mannequin (`head: 'none'`, the
realistic skin replaced by matte white fibreglass, `hair` and `mannequinHair` dropped);
`body.set` refuses `appearance`, `head`, `headFinish`, `expression`, `hair`, `mannequinHair` and
sets `headFinish` with `finish`. `render/presets.js MANNEQUIN` is the standard body of every
picture. **Hide the mannequin** (view bar, M, Stage switch; `hideMannequin`, not part of the
design): `Engine.setBodyHidden` hides the skin pieces, stand, cut caps and contact blob and draws
the garment double-sided (`GarmentView.setDoubleSided`), so the inside of the back shows through the
neckline as in a ghost-mannequin photo instead of the backdrop. The key's floor shadow stays.

# Tile pictures

`render/pictures.js` holds the standard picture setup (`PICTURE_SCENE`: white loft studio, plain
backdrop `#ebe9e4`, which tone-maps to the tiles' `--tile` `#e6e5e0`, glare off, glow 0.07) and
the framing helpers; `src/dev/thumbnails.js` renders every group with them (run it in a tab
nobody designs in: each group opens its own design; `all()` about 10-15 minutes on the GTX 1650):

| Group | Picture |
|---|---|
| designs, starts | 720 x 450 diptych: front and back, neck base + 7.5 cm to crotch - 7.5 cm, 20 degree lens, 4:5 each |
| blocks | 320 px squares: each element close up from its side (neckline from the front and a little above, back from behind, sleeves and armhole at three-quarter, straps from above the shoulders, leg cut at three-quarter from just under the crotch to 14 cm over the hip landmark, yoke and waist from the front), the plain tank in royal blue (yoke mesh, waist's lower piece wet look) |
| materials | 384 px squares from `materials/swatches.js swirlThumb`: a 34 cm sheet pinched at its centre and twisted (six logarithmic-spiral folds rising to the pinch, uneven heights), a radial mesh dense at the pinch, seen from above at 52 degrees, about 6.5 cm across; the softbox studio's reflection room (dim walls, bright boxes) so glossy fabric shows streaks, the white loft's room for mirror-like fabrics (`ROOM`); fine textures drawn larger than life (`ZOOM`) so they read at tile size; a sheer fabric shows the table |
| bodies | every age and build at one scale (the tallest fills the tile) |
| poses | the whole posed figure, three-quarter |
| environments | the torso in shiny royal blue, three-quarter, the studio room behind |
| mannequin | the shoulder, neck cap and upper arm in each finish |

`app.save` renders a save's library picture with `standardDiptych`: for the picture it shows the
mannequin, matte white, in the mannequin stance (a pose is undone for it: a re-fit of a few
seconds) in the picture studio, then puts the finish, pose, studio, hidden mannequin and camera
back, without a command or an undo step.

# Pitfalls

- The shadow-catching floor disc wrote depth, so the contact-shadow pass drew a faint line across
  the backdrop where the disc ends (radius 4 m), visible behind the figure at hip height in close
  views; `ShadowMaterial({ depthWrite: false })` in `render/viewport.js`.
- The swirl's sheet lies in x, y with z up and the studio rooms stand y up: without
  `scene.environmentRotation.x = -pi/2` the sheet mirrored a wall instead of the ceiling.
- A square grid shaded the folds near the pinch into a sawtooth; the radial mesh fixed it.
- The surface landmark `crotch` is not at the crotch on the Genesis 9 bodies (y 0.505 on the young
  adult): framings use `engine.body.crotch` and `hip-l`.
- Point-light intensities that suited the old 50 cm strip were three to four times too bright at
  the swirl's 15-25 cm and washed every colour out.
- Editing any app source while a thumbnail run is going reloads the page (Vite) and stops the run.
- The Browser pane's screenshots lag a frame after a click (and stop updating while the pane is
  hidden); a page that fades in can look blank. Check the DOM, or take a second screenshot.
- A console `import('/src/ui/state.js')` after hot updates can load a second copy of the module
  (the app's has a `?t=` stamp): setting its signals changes nothing on screen. Drive the UI by
  clicks, or `window.app` commands.
