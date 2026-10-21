---
type: Component
title: Side panel, presets, appearances and HDRI studios
description: "How the designer app's right-hand panel works since 2026-10-21: picture-tile rows (ui/Gallery.jsx) for designs (which change only the leotard), appearance, age and build, pose (mannequin stance plus the 30 Daz poses), expression, environment and starting shape; the material picker for a clicked garment piece (one row of app fabrics and VMOD scans, pre-rendered on twisted cloth) with a texture size; thumbnails rendered by src/dev/thumbnails.js; HDRI studios with a plain backdrop or the room as a grounded skybox, and a key light found in the image; glare size and strength. Includes pitfalls."
tags: [app, ui, side-panel, presets, skin, hdri, component]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-21T18:00:00Z }
sources:
  - id: code
    resource: "app/src/ui/Inspector.jsx, ui/Gallery.jsx, ui/FabricPicker.jsx, ui/inspect-garment.jsx (PanelInspector), ui/Shell.jsx, ui/tools.js (orbit click), src/dev/thumbnails.js, render/presets.js (APPEARANCES, SKIN_TONES, HDRI rigs), render/figure.js (materials), render/viewport.js (hdri, showHdri, keyDirection), materials/textures.js (baseFabricFor), app.js (thumbnail, open, STARTER), vite.config.js on build/designer-app"
    title: Source
    author: claude-code/claude-opus-5-5
  - id: decision
    resource: /decisions/2026-10-21-visual-panel-two-appearances.md
    title: Owner decision on the visual panel and two appearances
  - id: review
    resource: /decisions/2026-10-21-owner-review-presets-poses-stacy.md
    title: Owner review (presets, poses, backdrop, glare, materials, Stacy)
---

# Takeaway

The side panel is a stack of **panes** of **picture tiles** that scroll sideways. With nothing
selected it shows the design gallery, the model (appearance, age and build, pose,
expression), the environment and the starting shape; clicking a garment piece in the 3D view
(Orbit tool, a click without dragging) shows that piece's materials and colours. Tile pictures are
pre-rendered JPEGs in `app/public/thumbs/<group>/` (and `app/designs/thumbs/` for designs).

# Panel layout (`ui/Inspector.jsx`)

| Pane | Tiles | Command |
|---|---|---|
| Designs | every `designs/*.json`, moodboard `b<n>-` files first in order, then saves; label from the file name | `app.open(file, doc.body, doc.scene)`: only the leotard changes; body, pose, expression, lighting, environment and camera stay |
| Model | Realistic / Mannequin; age and build (8); pose (the mannequin stance, then the 30 Daz poses in `bodies.py POSES` order); expression (realistic only) | `body.set { appearance }`, `{ size }`, `{ pose }`, `{ expression }` |
| Environment | every `RIGS` entry (11: six built-in rigs, five HDRI studios); Brightness, Turn the room; HDRI studios: Background (plain colour + swatches, or the photographed room + Floor seam height, Room size); More: sparkle glow, crystal glare chips, glare size and strength (when a glare is on), circling lights (rotating rigs only, off by default) | `scene.set` |
| Start from a basic shape | collapsed; a strip per block group (neckline, back, sleeves, leg, armhole) | `block.apply` |
| Stones (counts) / Parts of this design | collapsed lists | selection |

Display quality and performance (frame-rate read-out, Measure) moved to the top bar's settings
popover (`ui/Shell.jsx` Settings). Removed from the interface: the POC look menu and POC garment
panes, the History list (undo/redo buttons and Ctrl+Z/Y remain), the Open dialog (the Designs row
replaces it), object ids in the parts list.

## Garment piece (`ui/inspect-garment.jsx` PanelInspector, `ui/FabricPicker.jsx` MaterialPicker)

- **Material** row (one row since 2026-10-21): every app fabric except the UV checker, then the
  VMOD scans (`assets/textures/vmod/manifest.json`). Every tile is a pre-rendered picture of the
  material on a twisted, gathered piece of cloth (`materials/swatches.js clothThumb`, run by
  `src/dev/thumbnails.js materials`): app fabrics in a showcase colour each (`MATERIAL_COLOURS`)
  into `public/thumbs/materials/<key>.jpg`; scans as scanned into
  `assets/textures/vmod/thumbs/cloth/<id>.jpg` (renders of licensed scans stay with them, written
  through the bridge's `/__fs/scanthumbs/`, served at `/textures/vmod/thumbs/cloth/`, never
  bundled). Before, the fabric tiles were rendered live in the piece's colour, one per frame, which
  was too slow. Picking a scan sets `texture` and a base fabric (`materials/textures.js
  baseFabricFor`: satin, taffeta and leather on shiny tricot, everything else on matte lycra).
- **Texture size** (`panel.set { texScale }`, 25-400 %): for a scan the tile size of its maps; for
  an app fabric the size of its glitter and foil dots, mesh holes, lace repeat, film swirls and
  foil crinkle (`materials/fabric.js applyFabric(..., scale)`). Replaces "Scan scale".
- **Colour**: 17 swatches plus a custom well; on a scan a colour switches the scan to recolour and
  "As scanned" switches back.
- More settings: name, cut out / fill, colour from a photo, foil / second colour, effect,
  sheerness, gradient, print, grain.

# Appearances and skin (`render/presets.js`, `render/figure.js`)

`APPEARANCES.mannequin = { form: 'full', head: 'none', finish: 'Matte white fibreglass' }`,
`APPEARANCES.realistic = { form: 'full', head: 'person', finish: 'Realistic skin (Daz)' }`;
`appearanceOf(body)` gives the one a design matches (or null for older combinations).

The realistic person is **Stacy** (CaramelDream3D) on every body since 2026-10-21: every body is
baked with her face morph, skin, eyes and lashes (`pipeline/daz/bodies.py STACY`, see
[Genesis 9 bodies](/engineering/pipeline/g9-bodies.md)), and `FigureView.materials(body)` uses the
baked materials as they are. The skin-tone picker, `SKIN_TONES` and the remapping of each body's
`G9FeminineNN_` maps onto one tone (the bodies had been baked with four different Daz skins) are
gone; an old document's `body.skin` is ignored.

**Changing body or pose with the person on show** (`render/engine.js applyBody`): the engine first
loads the person's files for the new body and pose (`FigureView.filesFor / ready / prefetch`: the
pose's figure file, the expression's, `figure.bin`), and only then changes the mannequin surface,
the garment and the person, in one task, so they change in the same frame. Before, the garment
moved at once and the person followed 1-2 s later, bare where the leotard had been. Not for the
first body (nothing on show yet). Checked by logging, per frame, the garment's pose and the
person's: never different.

# HDRI studios (`render/viewport.js`)

Rigs with `hdri` (`presets.js hdriRig`): White loft studio, Window loft studio, Parquet studio
sunlit, Green loft hall, Neon studio (Poly Haven 4K `.hdr` files in `assets/hdri`, served at
`/hdri` by the dev file bridge). On first use: `HDRLoader` (half float) -> PMREM for lighting;
behind the figure (`scene.backdrop`): **`plain`** (the default since 2026-10-21): a flat colour
(`backdropColour`, default `#d9d8d4`), the HDRI only lighting; or **`room`**: the equirect shown
through three.js's `GroundedSkybox`, a dome whose lower part is flattened into the floor the figure
stands on (`roomHeight`: the camera height the projection assumes, default the rig's 1.6 m;
`roomSize`: the dome's radius, default 14 m, at most 35). Where the flattened floor meets the walls
the photo is stretched (the owner: "looks awful"); the two sliders move that seam. One dome per
studio, rebuilt when its shape changes. A `ShadowMaterial` disc catches the key's shadow either way. The key direction is the
luminance x solid-angle weighted mean of the brightest 0.5 % of the **upper** hemisphere
(`keyDirection`; a sunlit floor patch would otherwise point the key from below); the shadowing
directional light and a glint point light sit along it, a second glint beside the camera. The
skybox, environment rotation and key all turn with Turn the room (`envRotation` + the rig's `turn`).

# Glare (`render/glare.js`)

The crystal glare presets (4-point, 6-point, arena star) are scaled by `scene.glareSize` (ray
length, default 0.6) and `scene.glareStrength` (brightness, default 0.35): the presets at full
strength read as a lens effect, not sparkle (owner, 2026-10-21). Sliders under More when a glare
is on.

# Thumbnails (`src/dev/thumbnails.js`)

Run in the app's console: `const t = await import('/src/dev/thumbnails.js'); await t.all()` (or one
group). Each group opens the starter design (`STARTER`, B2) in the realistic look on the white
seamless rig, waits for the figure, textures and HDRI, and calls `app.thumbnail(url, { view })`:
render at twice the size, downscale to a JPEG, PUT through the bridge (`/__fs/thumbs/...` writes
`public/thumbs`). `app.save` writes the saved design's tile the same way. The `materials` group
renders the material picker's tiles (above) without the figure; about 80 s. A full run takes about
half an hour on the GTX 1650 (the realistic figure rebuilds per body and pose).

# Start-up

No autosave, or an autosaved first-generation (`legacy`) design: the app opens `STARTER` once the
bodies have loaded (`main.jsx`). New documents default to the realistic appearance and the white
seamless rig, lights not circling (`doc/schema.js`; the saved designs too).

# Pitfalls

- `GroundedSkybox` larger than the camera's far plane (40 m) is clipped: the sky above the horizon
  showed black at radius 40.
- The Bash tool expands backticks even inside a quoted heredoc: JSX with template literals must be
  written with the editor tools, not `python - <<'EOF'`. A JSX fragment (`<>`) inside such a
  heredoc also breaks the command.
- `Box3.setFromObject(mesh)` of a rotated mesh is the loose box of its transformed bounding box;
  framing the cloth thumbnail with it left the cloth tiny. Pass `precise: true`.
