---
type: Component
title: Building blocks and starting points (the simplified panel)
description: "How the designer app is organised since 2026-10-23 (shoulder straps added 2026-10-24: tank, narrow, thin, racer, with the neckline and back running between them): a leotard is built from elements (neckline, back, sleeves, leg, front top, waist seam) picked one at a time, each change keeping the rest of the design (block.set, with a dry run that lists what a change would take away so the panel asks first); six code-defined starting points (start.apply) beside the moodboard designs; the Move tool (orbit, select, drag a point) and a five-tool rail; the piece pane with material, colour, gradient and cut-out up front; materials ordered by moodboard frequency; settings and rare controls behind the settings popover and More disclosures. Includes the reconciliation rules and pitfalls."
tags: [app, ui, side-panel, building-blocks, presets, blocks, component]
status: draft
generated: { by: claude-code/claude-fable-5-1, at: 2026-10-23T16:00:00Z }
sources:
  - id: code
    resource: "app/src/garment/blocks.js (BLOCK_OPTIONS, ELEMENT_CURVES, makeBlock yoke/waist, blockFabric), app/src/garment/starts.js, app/src/doc/commands-garment.js (block.apply, block.set, start.apply), app/src/doc/store.js (dryRun), app/src/ui/Inspector.jsx, ui/inspect-garment.jsx, ui/FabricPicker.jsx, ui/tools.js, ui/toolbar.js, ui/Shell.jsx, app/test/blocks.test.js, src/dev/thumbnails.js on build/designer-app"
    title: Source
    author: claude-code/claude-fable-5-1
  - id: decision
    resource: /decisions/2026-10-23-simplify-around-building-blocks.md
    title: Owner direction (simplify around building blocks and starting points)
  - id: patterns
    resource: /domain/moodboard/common-patterns.md
    title: Moodboard common patterns (the counts the elements and starting points follow)
---

# Takeaway

A designer starts from a **starting point** (the plain tank by default: crew neck, closed back,
a gradient front, a solid back, no stones) or a moodboard design, then changes the leotard one
**element** at a time: neckline, back, sleeves, leg, front top (a yoke seam), waist seam (and,
under More, the armhole). Each pick regenerates only that element's lines and keeps every other
line, piece, material, gradient, stone and strap; when it would take something the designer added
away, the panel says what and asks first. Clicking a piece gives its material, colour, gradient
and a Cut out button; the rarer controls sit behind *More settings*; display quality, fabric fit
and performance live in the top bar's settings popover. Everything is still a command
(`app.exec`), so scripts and agents use the same building blocks.

# What the interface offers now

| Place | Contents |
|---|---|
| Top bar | design name, New (the plain tank on the model and scene on show), Save, undo, redo; Pattern (shows the pattern pieces beside the model, with the Pattern PDF button on that view); settings |
| Tool rail | Move, Draw line, Strap; Stones, One stone, Eraser; Logo / text; then a Hide lines toggle (key H, `hideOverlay` in `ui/state.js`) that hides the editing overlay (all lines and control points) to preview the look; Draw line and Strap show it regardless. Gone: Orbit and Select (merged into Move), Fabric (click the piece instead), Cut out (a button on the piece), Edges (click the line), Trace photo (never built) |
| Panel, nothing selected | **Start from**: starting points, then the designs (both change only the leotard). **Shape**: one tile row per element; More: armhole. **Model**: appearance, age and build, pose; More: expression. **Scene**: lighting rig, brightness; More: turn the room, background, sparkle glow, crystal glare, circling lights. Stone counts (collapsed), parts (collapsed) |
| Piece pane | material row (ordered by moodboard frequency), colour swatches, Gradient (None / Fade to a colour; Down, Across, Diagonal), sheerness for a mesh, Cut out; More: texture size, name, colour from photo, foil / second, effect, gradient positions, print, grain |
| Settings popover | display quality, **fabric fit in poses** (the sliding experiment's toggle, tension and grip), performance |

Materials in the picker (`ui/FabricPicker.jsx ORDER`): matte, shiny, mystique, wet look, mesh,
foil, hologram, glitter, velvet, lace, illusion mesh, then the rare finishes; then the VMOD scans.
The sublimated-ombre fabrics and the debug checker are hidden (a gradient is a setting of any
piece; old designs that use them still render).

# Elements (`garment/blocks.js`)

`BLOCK_OPTIONS` gained two front elements, drawn as open seams in the design frame with their
ends attached to a block line (the right end on its mirror image):

| Element | Options | Line | Ends on | Panels |
|---|---|---|---|---|
| yoke (front top) | none, sweetheart (corner at the sternum), v, straight, round | `yoke` "Yoke seam" | the armhole / sleeve seam, or the front raglan seam | `yoke` "Yoke" (new: mesh in the front's colour, 35 % sheer) |
| waist | none, straight (1.04 m in the design frame), v (chevron down to 0.995), peak (up to 1.095) | `waist` "Waist seam" | the side seam | `lower` "Lower front" (copies the front's look); the `front` panel's seed moves up to (0.07, 1.12) |

Every block line and panel now carries its **block key** (`curve.block`, `panel.block`: neck,
keyhole1, leg, arm, cuff, side, shoulder, crotch, underarm, ragF, ragB, yoke, waist; front, back,
sleeve, yoke, lower). Designs saved before get the key from the line's or panel's name
(`blockKeyOf`), so B1-B13 work unchanged. `ELEMENT_CURVES` says which keys each element owns;
construction seams that end on an element's line are regenerated with it, because their attachment
parameter would otherwise land elsewhere on the new line. `makeBlock` also returns `fabric(sp)`,
the block's opening fields tested at a surface point (`blockFabric` gives it for any options).

# Shoulder straps

Since 2026-10-24 ([decision](/decisions/2026-10-24-shoulder-straps-as-anchor.md)) a sleeveless
block has a **strap** element (`BLOCK_OPTIONS.strap`: tank, narrow, thin, racer, plus `wide`, the
tank before straps, about 11 cm, which designs saved without a strap keep: `blockOf(doc)` reads a
saved `meta.block` with no `strap` as `wide`, a new document as `tank`). The Shape pane shows the
Straps row only when the sleeves are Tank and never offers `wide`. Neckline and back gained
**square**.

How the fields use it (`STRAPS` in `garment/blocks.js`, design frame, where the neck's side is at
|x| about 0.06, the shoulder point at (0.178, 1.31), the armpit at (0.136, 1.205), the shoulder top
at y 1.33-1.37):

| Strap | Inner / outer edge (|x|) | Armhole beyond the strap | Measured shoulder seam |
|---|---|---|---|
| tank | the neckline's own edge (square: 0.085) / 0.13 | down the strap to y 1.30, then out 0.55 m per m down | 4-6.5 cm |
| narrow | 0.108 / 0.138 | to 1.27 front, 1.26 back, then 0.5 | about 3 cm |
| thin | 0.104 / 0.116 | to 1.255 / 1.25, then nearly straight across (0.15 / 0.2): the camisole edge | about 1.2 cm |
| racer | no band: the neck keeps the strap | cut in along x0 + b t + q t^2, t = max(1.34 - y, 0); front (0.10, 0.29, 0.73), back (0.10, -1.2, 10): bows in to 6.4 cm from the spine | 2.5-4.5 cm |

- Between narrow or thin straps the neckline and back are **profiles clipped to the strap's inner
  edge** (`between`: height at the centre, height at the strap, curved or straight V): front
  square 1.26, scoop 1.22 to 1.28, V 1.18 to 1.29; back square 1.25, scoop 1.19 to 1.27, low 1.10 to
  1.25, V 1.10 to 1.28, open 1.02 to 1.24. Tank keeps the earlier oval necklines (square: 1.28 to
  the strap at 0.085, back 1.26).
- The cut beyond the strap is smooth-min'd (`smin`, 1.2 cm) with the old armhole field (1.8 cm in
  from the arm seam), so it closes round the armpit as before. It does not depend on the neckline,
  so a neckline or back change leaves the armhole line alone.
- `fitToStrap(opts, asked)` (`STRAP_ALLOWS`, `STRAP_FALLBACK`): narrow and thin allow square, scoop
  and V necks and square, scoop, low, V and open backs; racer allows crew and high necks and crew
  and keyhole backs. `makeBlock`, `blockFabric` and `block.apply` fit silently; `block.set`
  changes a neckline or back that was not asked for (a strap change on a crew neck makes it square)
  and throws when an asked-for one does not fit. `blockAllows(opts, key, option)` greys the
  Shape pane's tiles (`Strip` items take `disabled`). With sleeves, every neckline is allowed; the
  strap is kept in `meta.block` and comes back with a tank (the neckline fitted then).
- `ELEMENT_CURVES.strap`: neck, keyholes, arm, shoulder, side, yoke.
- **The yoke seam keeps 3.5 cm below the neckline** (a square neck between thin straps sits at the
  yokes' own height): its heights shift down by what is missing at the centre and at the middle
  point, and the yoke piece is seeded half-way between the seam and the neckline (at most 1.3).
  Before, the seed at (0.07, 1.3) fell inside a low neck opening and filled it with fabric.

# Changing one element: `block.set { neck: 'v' }`

1. **Lines.** For the keys the changed elements own: an existing line with that key gets the new
   points (same id, so trims, stones and straps on it survive; its role, closed and mirror
   follow; a block name such as "Armhole" becomes "Sleeve seam"); a key the old block had and the
   new lacks is removed with what hung on it; a new key is inserted. Drawn lines attached to a
   replaced line are **re-attached by position**: the nearest place on the new line to where
   they were drawn (`reattach`).
2. **Block panels** of the changed elements are re-seated (same id) or added.
3. **Reconciliation** on the re-cut shell (one `buildGarment` inside the transaction): a cell the
   new block opens where the old had fabric loses its panel (a cell that was already an opening
   keeps whatever the designer put there); a fabric cell without a panel gets the panel that was
   there before (re-seated, keeping its id), a copy of it when the old panel still claims another
   cell (a split), or its biggest neighbour's fabric when the block newly covers it (a smaller
   neck). Panels left without a cell are removed.
4. `meta.block` records the options. The inherit hook is skipped (`tx.noInherit`): it would have
   filled a new keyhole with the back's fabric.

The command returns an **impact** `{ lines, pieces, stones, straps }`: drawn lines that came loose,
the designer's own pieces removed (the block's own, such as a sleeve, go quietly), stone
generators and straps removed. `store.exec(cmd, { dryRun: true })` runs a command and rolls it
back, returning its result; the Shape pane dry-runs every pick and, when the impact is not empty,
shows the question under the tile row ("Changing the back to Crew takes away the stones (Waist
rows). Everything else stays." Change it / Keep as is). A pick on a design with no lines yet
applies the whole block.

Measured on B2 (11 lines, 8 pieces, 3 generators): the dry run 0.4 s, the real change about 5 s
including the engine's re-cut, flattening and stone rebuild (the same as any line edit).

# Starting points (`garment/starts.js`, `start.apply { key }`)

Code-defined recipes (block options, one fabric, per-piece material patches by block key, at most
one stone treatment), applied as one undo step; they replace the leotard and keep the model and
scene. `app.new()` applies the default (plain tank) on the current model, and a first start shows
it instead of B2.

| Key | Recipe | Moodboard basis |
|---|---|---|
| plain-tank | crew, crew back, tank, high leg; matte navy, front royal fading down to navy | the owner's simplest case |
| mesh-yoke-tank | crew, scoop back, tank; sweetheart mesh yoke, straight waist seam, wet-look brief, one teal | Quatro-style sleeveless (second suggested preset) |
| long-sleeve-illusion | crew, keyhole, long raglan mesh sleeves, sweetheart mesh yoke, navy mystique; stones fading from the yoke | the modal competition leotard |
| mock-neck-chevron | high neck, keyhole, 3/4 raglan mesh sleeves, chevron waist seam with two stone rows, plum satin over a black wet-look brief | mock-neck colour block |
| ombre-long-sleeve | crew, keyhole, long set-in black mesh sleeves, pink front fading to black | print or ombre bodice over a dark lower |
| open-back | scoop, open back, tank, competition leg, red satin | open and wrap backs |

The showcase presets (B1-B13) stay in the designs row. Tile pictures: `public/thumbs/starts/`
(`thumbnails.js starts`), the element tiles in `public/thumbs/blocks/` (`blocks`, now rendered on
the plain tank's shape in one colour so a tile shows only its own element).

# The Move tool (`ui/tools.js`)

Left-drag orbits; a click without a drag selects the line under it, else the piece (or clears);
over a control point of the selected line the orbit controls are switched off on hover, so the
press drags the point (one undo step, re-cut on release); Alt-click on the selected line adds a
point; C and Delete as before. The other tools keep right-drag orbit and middle-drag pan.

# Tests

`blocks.test.js` *shoulder straps*: each strap's width along the shoulder seam whatever the
neckline (thin 0.8-2 cm, narrow 2.5-4 cm, tank 4-6.5 cm, racer under 5 cm, wide over 11 cm); a
strap change makes a crew neck square and keeps the pieces, an asked-for crew neck with thin
straps throws, sleeves and back keep the strap; `blockOf` reads an old design as `wide`.

`app/test/blocks.test.js`: the front elements cut the front into yoke, front and lower pieces;
the fabric test follows the openings; `block.set` opens a keyhole without a panel inside, adds
and removes sleeves keeping panel ids and a stone row, closes the keyhole, undoes in one step;
a waist seam splits the front keeping its gradient and a drawn line re-attaches to a new V neck;
a dry run reports and changes nothing; every starting point applies as one undo step.

# Pitfalls

- A strap cut nearly parallel to the old armhole (the first tank: 1.2 m out per m down) made
  the smooth-min'd edge wander between the two along the arm field's noise: a scalloped armhole.
  Let the cut cross the armhole at a clear angle (tank now 0.55).

- A block panel seeded where the new block opens must be dropped, but a *designer's* panel in a
  cell that was already an opening (a mesh-filled keyhole) must stay: compare the old block's
  fabric test with the new one at each cell, never the new one alone.
- The inherit hook (`app.js inheritHook`) adds panels for cells that were fabric in the previous
  build: left on, it refilled a new keyhole. `block.set` sets `tx.noInherit`.
- Construction seams and drawn lines attach by a parameter along the line; a regenerated loop
  starts elsewhere, so attachments must be re-made by position, not kept by parameter.
- The torso is narrower than 12 cm at the waist in the design frame: `projectFront(0.12, 1.04)`
  finds no torso; the waist seam's end target steps inwards until it lands.
- A removed line's own attached points (the underarm seam on a removed cuff) must not be reported
  as "coming loose": pass the whole set of lines being removed.
- A dry run's rollback re-sets `meta/block`, so the object changes identity although nothing
  changed; a panel effect keyed on that object withdrew the question at once. Key such effects on
  the document revision (`rev`), which a dry run never bumps.
- Vite kept a stale module graph after the command file gained an import mid-edit ("STARTS is not
  defined" in the console after HMR); a full reload cleared it.
