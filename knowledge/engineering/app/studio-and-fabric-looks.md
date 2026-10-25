---
type: Component
title: Studio lighting and fabric looks (P3)
description: "How the designer app renders catalogue-photo realism: photo-studio light rigs, athlete skin, the moodboard's fabric looks (liquid hologram, oil-slick, duochrome, chrome, glitter foil, illusion mesh), sheerness, gradients, prints, logos, linings, seam shading, swatch thumbnails and matching a panel's colour to a photo. Includes the measured gate results and the pitfalls found."
tags: [app, rendering, fabric, lighting, component, p3]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-19T12:00:00Z }
sources:
  - id: code
    resource: "app/src/render/studio.js, render/presets.js, render/viewport.js, materials/fabric.js, materials/lace.js, materials/swatches.js, render/decals.js, garment/fields.js, render/garment.js, app.js (matchColour) on build/designer-app, commit 16b11da"
    title: P3 source
    author: claude-code/claude-opus-5-5
  - id: gate
    resource: "app/captures/p3-b4-side-by-side.png, p3-b8-side-by-side.png, p3-b12-side-by-side.png, p3-b12-back-side-by-side.png (not tracked; regenerate with app.sideBySide)"
    title: Gate comparison sheets
    author: claude-code/claude-opus-5-5
  - id: roadmap
    resource: /product/roadmap/moodboard-coverage-roadmap.md
    title: Moodboard coverage roadmap (P3, R1, R5-R8)
---

# Takeaway

Catalogue photos are white or grey seamless studios, so the app now has photo-studio light rigs;
with them, the new fabric looks and skin, the three P3 gate designs (B4 mesh and lining, B8 liquid
hologram, B12 lace over hologram) read close to their photos side by side, at 8.9-10.1 ms a frame
at 1792x1344 on the owner's GTX 1650 (gate: 14 ms).[^gate] The owner's review of those sheets is
the open part of the gate.[^roadmap]

# Studio rigs (`render/studio.js`, `RIGS` in `render/presets.js`)

- A studio rig is data: softboxes as `RectAreaLight`s (`areas`: position, size, aim, luminance),
  a seamless paper backdrop (`cyclorama()`, a floor sweeping up into the wall) in the backdrop
  colour with a little `glow`, a reflection room for the PMREM environment (`room`: brightness of
  each wall, the softboxes drawn in as emissive quads), extra quads seen only in reflections
  (`envLights`: a white card beside the camera), two small glint point lights at the softbox
  centres, `bloomK` 0.4 (catalogue photos show little glow), and `fixed` (studio lights do not
  turn).[^code]
- Rigs: White seamless, Grey seamless, Gym (overhead banks), plus the POC's Arena, Studio (soft)
  and Single spotlight.
- Pitfall found: `PMREMGenerator.fromScene` renders the room from the origin. With the room's
  floor at y = 0 the probe sat on the floor, half the view was clipped, and every downward
  reflection was black (flakes and crystals read as dark specks). The room is now shifted so the
  probe is at chest height (y 1.1); the environment strength was halved to compensate.
- The camera-side card is what foil, holographic spangles and the crystals' mirror backs
  reflect when they face the lens; a brighter photographer-side wall instead washed out
  everything (it also raises the diffuse fill).

# Skin

Athlete skin finishes (fair to deep) on the mannequin: diffuse light wraps past the terminator,
further in red than blue (`SKIN_DIFFUSE`, a replacement of three's `RE_Direct_Physical` diffuse
line, warned in the console if three changes it), slight roughness variation, a little clearcoat.

# Fabric looks (`FABRICS` in `materials/fabric.js`)

| Look | How |
|---|---|
| Liquid hologram (opal) | Thin-film iridescence whose thickness follows folded value noise in cloth space (`film`), part of the film colour tinted into the cloth (`film.tint`), sparse holographic flakes |
| Oil-slick foil | Metal with the same swirled film, no tint |
| Duochrome foil | Colour turns towards a second hue at grazing angles (`duo`) |
| Mirror chrome, glitter-grain foil | Metal at 0.06 roughness; metal with dense fine flakes |
| Illusion mesh | Very open mesh |

Owner's fabric review, 2026-10-24 ([decision](/decisions/2026-10-24-owner-fabric-review.md)):
- Lace and shattered glass hologram were removed (`materials/lace.js` and the shader's `uLace` with
  them); designs that used them open on stretch mesh and hologram foil dots (`RETIRED_FABRICS`,
  `doc/schema.js` `retireFabrics`). Five scans are hidden from the picker (`RETIRED_SCANS`).
- Default texture sizes: `FABRICS[k].texScale` and `SCAN_SCALE`, read through `texScaleOf(look)`.
  A piece's own `texScale` wins; `panel.set` with a new fabric or scan clears it.
- Wet look: clear coat 0.55 at 0.2 (was 1 at 0.1, a mirror that read as latex), base 0.32 with
  anisotropy 0.5, a little sheen and the procedural knit.
- Foil, oil-slick, duochrome, iridescent film and chrome: the value-noise crinkle bump (`bump`) is
  gone, the knit (`knit: 1`) stands in; stretch velvet has neither; crushed velvet keeps
  `bump { amp 0.12, scale 12 mm }` (was 0.7 at 7 mm). Before/after captures were made with
  `dev/material-eval.js` (tweak = the old fields).
- Pitfall: `render/rims.js` caches finished-edge materials by their look, so a live edit of
  `FABRICS` (material-eval's tweak) leaves the leg and arm bands on the old look until a reload.

Per-panel fields: `colour2` (foil, gradient end or duochrome shift), `effect`
(0-2, strength of hologram, film or duochrome), `sheer` (share of skin or lining seen through a
mesh or net, face on), `ombre` (a gradient `{ colour, curve | axis, start, end }`, computed per
vertex on the reference body, `garment/fields.js`), `print` (an image tiled in cloth space).

- Sparse flakes stay sparse far away (only their share of pixel-sized cells sparkle; dense foils
  keep the POC behaviour), and a sparse flake turned away from the camera is kept facing it a
  little (it would shade black).
- Sheer fabrics: light crosses the net on the way in and again on the way out, so what is under a
  net shows at the open share squared. Measured on B12: the geometric model let 35% of the skin
  through where the photo shows about 10%; with the double crossing and `sheer` the net reads as
  the photo's dark veil.

# Logos, linings, seams

- Logos and lettering (`render/decals.js`, `decal.*` commands, Logo tool): text in any installed
  font or an image, as print, foil, holographic foil, glitter or flock; up to 4 per layer in one
  atlas, projected onto the reference body through a box, so they cross seams like a heat
  transfer.
- Linings show only where the shell has fabric (the shell's cover field interpolated into the
  lining's panels; the shader discards outside it).
- Seam shading: per-vertex distance to the nearest seam (`seamDistance`, bucketed segments)
  drives a 0.3 mm groove, a soft ridge over the pressed allowance and a darker line; mesh panels
  show the allowance as a doubled band. Flat contrast tape over seams is a trim kind (`tape`).

# Swatches and colour matching

- The panel inspector's fabric picker shows every fabric as a rendered swatch in the panel's
  colour (`materials/swatches.js`: a rippled 17 cm cloth over skin, the real shader, the current
  rig's environment, tone-mapped on the CPU); about 9 ms each once shaders are compiled, drawn one
  per frame; resting the pointer rocks the cloth.
- `app.matchColour` (and the Pick button, while looking through a solved photo) fits
  render = k x colour + b per channel from two renders, solves for the photo's colour, refines
  once. Under the dark Arena rig, B5's foil could not reach the photo's brightness (the earlier
  ratio method ran off to white); under the white studio it matched. It now reports when the
  lights cannot reach the colour, and leaves the colour alone when the pixel is not on the panel.

# Known gaps

- The lining under B12's lace reads duller than the photo's bright metallic.
- Crystals at mid distance still read slightly dark on white (the P5 crystal studio read).
- No scanned lace; the procedural lace is one pattern. Prints are tiled per piece (they do not
  line up across seams).
- Swatch thumbnails take about 8 s the first time all fabrics' shaders compile.
- Decal placement is by command or click; no drag handle yet.

[^code]: P3 source
[^gate]: Gate comparison sheets
[^roadmap]: Moodboard coverage roadmap
