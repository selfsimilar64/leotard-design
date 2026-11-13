---
type: Component
title: "The glass studio interface: full-screen stage, spine, one card, callouts"
description: "How the designer app's interface is built since 2026-11-09: the stage fills the window and everything else is frosted glass over it (two chips at the top, a spine of the four kinds of work at the left, the view chip at the foot, one inspector card at the right that is there only while something is in hand); every card is split into faces that fit without scrolling at 1024 x 768; the cut's elements are named beside the body with leaders; a dragged slider clears its card away; the glass turns dark over a dark backdrop. Files, the map of every control, behaviours, sizes checked and pitfalls."
tags: [app, ui, interface, glass, ipad, layout, component]
status: draft
generated: { by: claude-code/claude-fable-5-2, at: 2026-11-09T22:00:00Z }
sources:
  - id: code
    resource: "app/src/ui/ (Studio.jsx, Inspector.jsx, Callouts.jsx, kit.jsx, ShapeCard.jsx, PieceCard.jsx, SparkleCard.jsx, PatternCard.jsx, StageCard.jsx, Library.jsx, camera.js clearOfCard, state.js, styles.css) on build/designer-app"
    title: Source
    author: claude-code/claude-fable-5-2
  - id: decision
    resource: /decisions/2026-11-09-full-screen-stage-glass-interface.md
    title: Owner direction (full-screen canvas, frosted-glass panes, no scrolling category panes)
  - id: checked-2026-11-09
    resource: "the dev server's preview (port 5176), design B12 lace over hologram with a pattern and a modifier of each kind added: app/src/dev/ui-audit.js clicked through 82 faces of every card and compared each card body's content height with its room, at 1180 x 820, 1024 x 768, 1366 x 1024, 820 x 1180 and 1024 x 700"
    title: Fit audit of every face
    author: claude-code/claude-fable-5-2
---

# Takeaway

The 3D stage is the whole window. Over it float a few panes of frosted glass: the **title chip**
(top left: designs library, the design's name, saved or not), the **action chip** (top right: undo,
redo, mirror, 3D / Both / Pattern, export, save, settings), the **spine** (left edge: Shape, Fabric,
Sparkle, Stage), the **view chip** (foot: front, three-quarter, side, back, lines, mannequin, a
pattern's handles, fit, tools away) and the crystal count. One **inspector card** at the right shows
what is in hand and is absent otherwise. No card scrolls: each is split into **faces**. Built to the
owner's direction of 2026-11-09.[^decision] It replaces the top bar, inset stage and panel of four
scrolling tabs of [the studio interface](/engineering/app/studio-interface.md); that record's
sections on tools as modes, the mannequin, tile pictures and hover in Select still hold.

# Files

| File | Holds |
|---|---|
| `ui/Studio.jsx` | the layout, the chips, the spine, settings, the prompter (a tool's instructions), busy note, toast, first-run hint, the glass's tone (`toneOf`), keyboard shortcuts |
| `ui/Inspector.jsx` | which card shows (`which`), `openWork`, `pickWork` (the spine's toggle) |
| `ui/kit.jsx` | `Card` (title, back, actions, faces), `useFacet` / `showFacet`, `closeCard`, bar `Slider`, `Tiles`, `Paged`, `Segmented`, `Swatches`, `Well` + `Flyout`, `Switch`, `Stepper`, `PartRow` |
| `ui/Callouts.jsx` | the cut's elements named on the body |
| `ui/ShapeCard.jsx` | `ShapeCard`, `LineCard`, `StrapCard`, `openElement` |
| `ui/PieceCard.jsx` | `PieceCard`, `FabricHome`, `MaterialChoice`, `ColourFields`, `FabricBook`, `LookWells` |
| `ui/SparkleCard.jsx` | `SparkleCard`, `GroupCard`, `LetteringCard`, `CrystalPicker` |
| `ui/PatternCard.jsx` | `PatternCard`, its modifier card, `PatternGallery` |
| `ui/StageCard.jsx` | `StageCard` |
| `ui/Library.jsx` | the designs library: a glass sheet, three shelves |
| `ui/styles.css` | tokens, glass, every rule |
| `dev/ui-audit.js` | the check that no face overflows (see Sizes checked) |

Removed: `Shell.jsx`, `Panel.jsx`, `ShapeTab.jsx`, `FabricTab.jsx`, `SparkleTab.jsx`, `StageTab.jsx`,
`PatternPanel.jsx` (their logic moved into the files above).

# Which card shows (`Inspector.jsx which`)

In this order: the part chosen (`selection`: a line, a strap, a piece, a crystal pattern or group,
lettering); else the lettering tool's card (the next lettering); else the kind of work open (`tab`:
`shape`, `fabric`, `sparkle`, `stage`); else none. `tab` may be `null`: the leotard alone. Choosing
a part on the model sets its kind (`state.js TAB_OF`). The spine's button for the open kind steps
back from a chosen part to the kind's own card, then closes. Esc steps out: tool, part, card. The
card's cross (`closeCard`) puts everything away. A card with a parent has a back arrow (a line back
to Shape, a pattern back to Sparkle, a modifier back to its pattern, a piece back to Fabric's list).

# Every control's home

| Card | Faces | Holds |
|---|---|---|
| Shape | Silhouette | strip of the cut's elements (round pictures of the present choice); the open one's options as tiles; the question when a change would take something away replaces the tiles |
| | Draw | Seam, Strap, Overlay piece (modes); the pen's kind; the next strap's width, colour and fabric (wells); the lines and straps drawn (list) |
| | Garment | Drawn or a fitted garment (two columns), its width and length |
| A line | Edge or Seam finish | finish tiles, width, material and look (wells) for binding, piping, tape; add a band |
| | Edge shape | plain, scallop, zigzag, wave; depth, repeat |
| | Line | kind, closed loop, how to edit its points |
| A strap | Strap, Colour, Fabric | width, edges, stacking; material and colour; swatch book |
| Fabric | (none) | every piece, to pick one (also by tapping it) |
| A piece | Colour | the material it is cut from (chips, shared by how many, Separate, New, name, Tidy unused); colour; second colour or foil / glitter / shift colour |
| | Fabric | swatch book of every fabric and scan (six across, names on hover and above); sheerness for mesh; the satin's four |
| | Fade | one colour or a fade; far colour; down, across, diagonal or out from a line (flyout); starts at, full colour at |
| | Print | the piece's printed patterns (list, add another), or with none the pattern gallery opened on Colour designs: a pick lays it on this piece as print ([printed patterns](/engineering/architecture/printed-patterns.md), 2026-11-13) |
| | Details | texture size, grain, effect strength, rainbow speed, print image and repeat |
| Sparkle | tool strip | Pattern, Rows / fill, Single, Eraser, Lettering |
| | (the tool's) | the pattern gallery; rows, distance, spacing, fill; eraser size |
| | Crystal | colour gems with AB, size ladder, cut |
| | On design, Counts | crystal groups and lettering (list); counts by size and colour |
| A pattern | (under its name) | what it is made as: Crystals, Print, Print + crystals |
| | Preset | gallery: Colour designs or Lines & dots, then the families as a block of words, twelve pictures a page |
| | Arrange (a design: Design) | density, spacing, the arrangement's own settings, reshuffle, reset |
| | Colours (when printed) | the ramp, Softness; Colours (stops, the fabric's own, swap ends; a layout's line width and dots), Edges (outline, wandering edges), How they run (once, round again, there and back; times, slide, balance, strength, dyes the fabric) |
| | Crystal (when crystals) | as above; for a design also Where they go: along the edges, filling colours, sized by tone |
| | Place | the whole pattern (across, up, turn, scale, flip, mirror, clear of edges), what is under it (shift, turn, scale, stretch, which way crystals point) or Bend it (twist, bulge, ripple, warp, jitter: the Distort face until 2026-11-13); the choice also sets what the handles work on (`patternFocus`) |
| | Modify | the modifiers (open, switch off, remove); add one of density, size, colour (a pattern that is only print: ink coverage) |
| A modifier | Effect, Shape | from / to or colour stops, fall-off, mingling, swap, blend; eighteen shapes, bounds, soft edge, place and size |
| Rows or a fill | Crystal, Layout | crystal; rows, distance, spacing, fill, reshuffle, other parameters |
| Lettering | Text, Look, Size | text, font, bold; material, colour; width, turn, image, move |
| Stage | Body, Pose, Studio, Effects | age and build, mannequin finish, colour, show; pose; studio, brightness, turn, backdrop; glow, glare |
| Settings | Display, Working, Fabric fit | as before |

# Behaviours worth knowing

- **Callouts** (`Callouts.jsx`): shown while the Shape card is on Silhouette with nothing chosen and
  no tool on. Each element's place is a blend of body landmarks (`PLACE`; two-sided ones take the
  side in view, nearer the panes), projected each drawn frame (`viewport.onFrame`) and written
  straight to the DOM. Panes keep a right-aligned column left of the leftmost place, in screen order,
  never overlapping; a leader is dashed to a place on the far side. Close in, where the column would
  lie over the leotard, the panes fold to their pictures (`.callouts.compact`); a place out of view
  is not named.
- **Close-ups clear of the card** (`camera.js clearOfCard`): a view the interface turns to
  (`focusOn`) is slid sideways so its subject lands in the middle of the stage between spine and
  card. The view chip's views and Fit stay centred in the window. Nothing else moves the model.
- **X-ray scrub** (`kit.jsx SliderView`, `.xray`): from the first value change of a drag until the
  pointer lifts, the bar's card (or flyout) loses its glass and every element that is neither the
  bar nor an ancestor of it fades out.
- **Bar sliders**: the native range input lies invisible over the whole row; the value at the right
  is a button for typing one; a changed value shows a reset arrow; double click resets.
- **Tone** (`Studio.jsx toneOf`): `.tone-dark` when the plain backdrop's luminance is under 0.32 or
  the neon studio's room is shown, in the 3D layout only (the pattern sheet is paper). All colours
  come from tokens, so the dark tone is the same rules with other values.
- **Tools away**: the `\` key or the view chip's eye sets `zen`; a small "Show the tools" pane
  brings them back (an iPad has no keyboard). Tab is left to move the keyboard's focus through the
  controls.
- **Layouts**: Both and Pattern put the pattern sheet beside or in place of the 3D view as before;
  the sheet keeps clear of the chips and the card (`.has-card`).
- **Upright or narrow window** (under 900 px wide or taller than wide): the card sits low at the
  right, over the legs, at most 54% of the height.

# Sizes checked

Every face of every card fits without scrolling at 1180 x 820, 1024 x 768, 1366 x 1024 and
820 x 1180 (82 faces, none over).[^checked-2026-11-09] Rows tighten under 800 px of height. At
1024 x 700 (an iPad's browser with its bars) nine faces overflow by 11 to 44 px; the card body then
scrolls (thin scrollbar). The tallest cards are the crystal picker (608 px at 768) and a density
modifier's Shape (630 to 640 px).

To check again after a change, in the page at the window size wanted:
`(await import('/src/dev/ui-audit.js')).audit()`. It returns the faces that overflow and the
tallest cards, and edits nothing. A design with a crystal pattern carrying a modifier of each kind,
a drawn line and a strap reaches the most faces.

# Not verified

- Frame cost of the blurred glass. The preview pane draws 30 frames a second whatever the load (a
  3D frame costs 7.4 ms there), and the rate was the same with the blur switched off, so the test
  shows no drop but cannot show a small cost.[^checked-2026-11-09]
- A real iPad: touch was checked only through pointer events and window sizes.

# Pitfalls

- `@preact/signals` also skips a component that has hook state (`useState`) and unchanged props,
  not only one that reads a signal. A sub-editor that takes a record edited in place (`doc.scene`,
  a panel's stack) stayed on its old values after an edit. Each one reads `rev.value`.
- A pane inside a glass pane cannot blur the stage: the outer pane's `backdrop-filter` makes it the
  inner one's backdrop. Settings is therefore a card of its own in the chrome, and flyouts are drawn
  in `#flyouts`, not inside the chip or card they open from.
- `render/gizmo.js` sets `position: relative` on the 3D view's element. Placed absolutely with
  `inset: 0`, the view kept the height of its canvas and never followed the window; it is a grid
  item of `.view3d-cell`.
- A portal's content is not in the page when the component's layout effect runs; the flyout is
  placed from its element's ref callback.
- `Card` takes its body as a function of the face; pass one child only.
- In the preview pane a real click leaves later screenshots cropped to the pane instead of scaled;
  clicks sent from page script (`element.click()`, synthetic `PointerEvent` on the canvas) do not.
- The fitted starting points have no library pictures (`public/thumbs/starts` holds six); they show
  as blank cards, as before this change.

[^decision]: Owner direction, 2026-11-09.
[^checked-2026-11-09]: Fit audit and frame-rate check in the preview, 2026-11-09.
