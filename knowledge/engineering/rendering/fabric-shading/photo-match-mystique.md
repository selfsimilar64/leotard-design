---
type: Technique
title: "Photo match: mystique"
description: "Mystique audit of 2026-10-27 against product photos and a swatch sheet: the dots were a coarse mosaic of 2-3 px squares at every distance and never blended into a shimmer; fixed with sharper, flatter foil dots and a per-fabric blend that averages dot tilts by count far away (Toksvig), so a mystique leotard shows distinct, grainy-edged highlight patches over a deep base. Round 2 (close-ups, a swatch video): dots printed in winding maze-like chains, and two-tone (foil of one colour on knit of another) kept apart in the lighting so the knit colour shows where the foil faces away."
tags: [rendering, fabric, calibration, mystique, foil, sparkle]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-27T15:30:00Z }
sources:
  - id: owner-2026-10-27
    resource: conversation with the product owner, 2026-10-27 (Claude Code session)
    title: "Owner's check for mystique ('separate dots that sparkle as the light moves, blending into a shimmer from a distance') and four reference product photos: a green tank on a child, a GK blue tank from the back, a GK white long-sleeve with an opal effect, a gunmetal tank from the back; plus nktextile.com/mystique for swatch close-ups"
    author: human:mattj
  - id: swatches
    resource: moodboard/FABRIC_PAGE_-_Mystique_-_DESKTOP_-_V02.webp
    title: Mystique swatch sheet (33 colours, about 1 mm per pixel; moodboard folder, not tracked)
  - id: session-2026-10-27
    resource: renders and measurements in app/captures/material-eval (git-ignored), 2026-10-27 (Claude Code session)
    title: Mystique render series audit0 to final with grain-contrast and light-sweep statistics
    author: claude-code/claude-opus-5-5
  - id: glints
    resource: /engineering/rendering/sparkle/glitter-glint-models.md
    title: Glitter glint models (count-based glints converge to a smooth lobe at distance)
---

# Takeaway

**At body distance a real mystique leotard shows each studio light as its own bright, fairly
defined patch with grainy edges, over a deep, smooth base; the old shader showed a coarse
mosaic of square dots everywhere instead.**[^owner-2026-10-27][^session-2026-10-27] Sharper, flatter
foil dots plus averaging the dots' tilts by how many fall in a pixel now give that look. Glitter
and the other flake fabrics are unchanged. What is still missing is the lighting: the photos'
highlights are brighter and more sharply shaped because their softboxes are.

# What the references show

From the owner's four product photos and the swatch sheet:[^owner-2026-10-27][^swatches]

- Highlights are **separate patches**, one per light, each the light's shape blurred a little; the
  edges break up into fine grain (dots near the edge of the lobe fire or not).
- Between the patches the fabric is the **deep dyed colour**, nearly smooth.
- Highlights are a much lighter tint of the hue (green to mint); on the gunmetal tank, near white.
- The grain is fine, one pixel at about 1 mm per pixel, never blocky.
- The white long-sleeve has an extra opal (soft rainbow) film over the dots. Not attempted.

# Findings (before)

Test scene `app/src/dev/material-eval.js`, bloom off.[^session-2026-10-27]

1. **No blending with distance.** Grain contrast (std of luminance over a 6 px local mean) was
   0.19 at 45 cm, 0.19 at 1.35 m and 0.25 at 3.2 m: the sparkle got coarser further away. The far
   branch gives each cell of about 1.6-3.2 px one full-strength random tilt, whatever the number of
   dots it stands for, so at full-body distance it reads as a sequined mosaic.
2. **Blocky grain.** Those cells are visible as 2-3 px squares (crops at the swatch sheet's scale).
3. **Little twinkle.** Turning the room or the small light beside the camera by 5-10 degrees changed
   about 2-4% of pixels by more than 20/255. With a soft foil lobe (roughness 0.27) each dot's
   brightness changes slowly with the light, and the loft rig's only point light that can glint is
   the camera-side one (its key glint sits behind the figure).
4. **colorVar was not the cause**: setting it to 0 barely changed grain (0.188 to 0.179); tilt 0
   removed it (0.056). The grain is reflection, as it should be.

# Changes (`app/src/materials/fabric.js`)

- **`blend` flake field / `uBlend`** (1 for `mystique` and `ombremystique`, 0 elsewhere). In the far
  branch a cell holds `farDots = s0² · mix(1, 4, lf) · 1.155 · presence` dots; their tilt is scaled
  by `1/sqrt(farDots)` and the lost spread goes into the foil roughness
  (`alpha² += (1 - keep²) · tilt² · 2/3`, Toksvig, as in the [glint models](/engineering/rendering/sparkle/glitter-glint-models.md)
  that converge to a smooth lobe far away).[^glints] Blending fabrics also use 1 px far cells
  instead of 1.6 px, removing the mosaic. With `blend` 0 the code path is the old one exactly
  (glitter captures differ by 0.02/255).
- **Preset** (both mystiques): `tilt 0.22 -> 0.15`, `rough 0.27 -> 0.12`, `colorVar 0.3 -> 0.1`.
  Foil is a near-mirror; the width of each highlight patch comes from the spread of dot tilts.

**Rejected:** applying the averaging to every flake fabric. Glitter and glitter-grain foil turned
into smooth satin at 1.35-3.2 m; real glitter sparkles across a room (its flakes are sharp and
sparse in direction, so few fire per pixel). Also rejected: tilt 0.3, which with the averaging
gave one broad sheen instead of patches.

# Results (after)

| | Grain contrast 1.35 m | Grain contrast 3.2 m | Look |
|---|---|---|---|
| Before | 0.19 | 0.25 | coarse square mosaic at all distances |
| After, tilt 0.3 trial | 0.13 | 0.13 | smooth but one broad sheen |
| Swatch sheet, about 1 mm per pixel | 0.16 | - | fine grain |

Final captures `mystique-final-S-*` (Studio (soft), green `#0b7a3c`, closest to the owner's green
tank) and `mystique-final-W-*` (White loft, aqua `#0f8fa8`).[^session-2026-10-27]

# Round 2: close-ups, a swatch video, two-tone (2026-10-27)

Sources from the owner: five close-ups and product shots from nktextile.com/mystique (purple,
burgundy/teal "two tone", rose, green/violet, a blue/violet sports set) and an 18 s video of a
lavender swatch tilted under a light, then stretched.[^owner-2026-10-27] All tests now in the White
loft studio, the only kind of lighting left ([decision](/decisions/2026-10-27-hdri-lighting-only.md)).

What they show:
- **The dots are not on a lattice.** They run in winding chains about two dots apart, like a
  fingerprint or a maze, densest and clearest when the fabric is stretched (video, 14 s).
- **Two-tone is foil of one colour printed on knit dyed another**, not a hue shift of the foil:
  where the dots catch the light the garment is the foil's colour (teal), elsewhere the knit's
  (burgundy) with darker specks. The app's `duochrome` (one continuous foil whose colour turns
  with angle) is a different mechanism and looks different (tested: a burgundy-to-teal duochrome
  reads as glossy burgundy with pink highlights). Two-tone mystique is mystique with a custom foil
  colour ("Foil / second: Custom colour" in the panel), which the app already had.
- Off the highlight the dots read as dark specks over the knit; the 6 cm render showing darker
  dots was right.
- Stretching opens gaps between the chains and more knit shows; not modelled (needs strain,
  [stretch-dependent appearance](/engineering/rendering/fabric-shading/stretch-dependent-appearance.md)).

Changes (`app/src/materials/fabric.js`):
- **`maze` flake field / `uMaze`** (mystique, ombre mystique): in the near branch a lattice dot is
  kept only on evenly spaced lines two cells apart, warped by two octaves of value noise
  (`ph = (c.x + 14 vnoise(c .05) + 6 vnoise(c.yx .11 + 5.3)) / 2`), `MAZE_KEEP` = 0.6 of them; far
  coverage scaled by the same share. Rejected: contours of a noise field (blotchy, large bare
  islands); faster warp (.08 / .19: the hex lattice showed through as blocky clumps). Dot radius
  0.4 -> 0.46 to keep foil coverage (0.43) after the maze takes 40% of the dots.
- **`FOIL_FRAGMENT`** (after `lights_physical_fragment`, `uBlend` fabrics): where a pixel is part
  dots and part knit, the diffuse is the dye's alone (`diffuseContribution = gDye (1 - m)`) and
  the mirror the foil's alone (`diffuseColor = gFoil`, `specularColorBlended`). three's single
  mixed colour had tinted the knit with the foil, so the burgundy/teal test read teal all over.
  `gDye`, `gFoil`, `gFlake` are globals next to `gFilm` (the flake code runs in a nested scope).
  The same mixing bug exists for glitter and the other flake fabrics; left as is to keep them
  unchanged.

Result: in the White loft at 170 or 270 degrees, burgundy/teal reads as burgundy-mauve with teal
highlight patches, like the reference; at 0 and 90 degrees the loft's bright walls fill the
reflections and it reads teal everywhere.[^session-2026-10-27]

# Round 3: a crumpled test cloth, regular, two-tone and opal (2026-10-27)

The owner asked to nail regular, two-tone and opal mystique against the shop close-ups, testing
on a crumpled piece of cloth if easier, plus a check of the app's holographic look against an
"electric foiled spandex" close-up (pale, pastel rainbow bands along the folds).[^owner-2026-10-27]

**Test scene `app/src/dev/drape-eval.js`**: a 40 cm square of cloth swirled into folds round a
gathered centre, drawn by the real fabric shader in the open viewport (White loft, room at 170
degrees, bloom off, everything else hidden), captured as `captures/drape-eval/<fabric>-<tag>-<view>.png`
at `swatch` (about 20 cm across) and `close` (about 6 cm). `face: 'front'` (default) stands it
upright facing the room's front as a leotard front; `'up'` lays it flat on a table, mirroring
the loft's bright ceiling (the high-key light-table look of the holographic photo).
`d.shoot(fabric, { colour, colour2, second }, tag, views, tweak, face)`.

Findings and changes (`app/src/materials/fabric.js`):
- **Maze rebuilt**: the warped stripes made long zebra lines with wide bare gaps (owner: too much
  space). Now a sum of six waves of one wavelength in six directions, phases drifting with slow
  noise; dots within `MAZE_GAP` 0.3 cells of its zero lines are left out (`MAZE_K` 1.65, lines
  about 1.9 cells apart, `MAZE_KEEP` 0.72). Gives short, densely packed chains turning every way,
  as in the close-ups. Dot radius 0.42 (0.46 nearly touched within a chain).
- **Dot size 75% -> 133%** (`texScale`, about 1 mm between dots). From the swatch video (dots about
  1 mm apart against the gloved hands) and the close-ups; at 75% the far blend (`uBlend`) already
  smoothed the dots at swatch distance into a satin sheen. Reverses the owner's 75% pick of
  2026-10-24, flagged to the owner.
- **Opal mystique** (`opalmystique`, in the picker after mystique): mystique whose foil dots carry
  the soft angle rainbow (`holo` 0.35, `holoFreq` 3.2, `holoJit` 0.15). Rendering the rainbow in
  the knit instead (film tint) looked almost the same at swatch distance and differed only close
  up; the foil was chosen because a dyed knit cannot change colour with angle. **[INFERRED]**
- **Two-tone** needs no preset: mystique with a custom foil colour.
- **Liquid hologram (opal)** retuned to the electric-foil photo: film `tint` 0.32 -> 0.65 and a
  new `film.hue` [per swirl, per angle] = [0.3, 3.2] (was fixed 1.6, 0.45 in the shader, now
  `uFilmHue`): the rainbow now follows the folds instead of swirling across flat cloth. Its sparse
  sparkle flakes were removed (they read as dark specks on the pale foil). Rejected: a full-metal
  foil with the flake rainbow (dark and over-saturated; the photo's foil is pale everywhere).
- Material picker tiles (`public/thumbs/materials`) re-rendered in the White loft (the seamless
  studio they were lit by is gone); `dev/thumbnails.js materials(only)` renders a subset.

Remaining gap at swatch distance: in the shop photos the knit colour (burgundy, plum) fills the
folds that face away and the foil colour only the highlight bands; upright in the loft our cloth
reads darker and more foil-coloured overall, flat it reads foil-coloured and bright. The photos'
light (one strong key over the camera, dark surroundings) is not one of the loft's orientations.
Close up, dots, chains and the knit between them match well.

# Round 4: the dot screen from the shop close-up (2026-10-27)

Owner: the dot pattern still needed work; match the nktextile purple close-up. Enlarged crops of it
show: round dots of one size, about 0.8 of their spacing across, **packed evenly everywhere** (no
lanes or bare lines, unlike the maze), in **small patches of honeycomb rows** that run their own
way and curve a little, like pressed marbles; that is what reads as "wavy chains". Inside a
highlight neighbouring dots are about equally bright; off it the dots go dark and the knit shows
as a lighter mesh.[^owner-2026-10-27]

Changes (`app/src/materials/fabric.js`, near branch of the flake code):
- **Grains** replace the maze (`maze`/`uMaze`, `MAZE_*` removed): a jittered grid of grains
  `GRAIN` = 9 cells across, each with its own lattice turn (0-60 degrees) and shift; a point takes
  the dot under it from its two nearest grains, kept only if that dot's centre lies in the grain
  (no dots cut by a seam). `bend` (cells, `uBend`, `bendOf`) gently bends the lattice too (1);
  the offset to the dot centre goes back through the bend's Jacobian so dots stay round. GRAIN 6
  looked too fine; a displacement bend alone (2-4.5) made long straight rows or, stronger, bare
  stretched gaps.
- `presence` 0.97 -> 1 (no missing dots), `dotR` 0.42 -> 0.4.
- **Dots ignore the knit relief** (`nCloth`, the normal before the knit, for `uBlend` fabrics):
  the knit's ridges made vertical streaks across each dot.
- **Flatter, softer dots**: `tilt` 0.15 -> 0.1, `rough` 0.12 -> 0.14. At 0.15 neighbouring dots
  varied salt-and-pepper; at 0.07 the close-up matched best but the leotard lost the grain in its
  highlights that the owner's leotard photos show; 0.1 keeps both.
- `dev/drape-eval.js`: `macro` view (face on, about 12 px between dots, the close-up's scale) and
  a `relief` argument (the test cloth's pattern is mapped flat, so steep folds stretch it; use
  0.25 for dot checks).

Mystique, opal and ombre mystique picker tiles re-rendered.

# Rainbow speed (2026-10-27)

Owner: Opal mystique's colours changed too fast on the leotard (holoFreq 3.2 ringed the bust and
hips with rainbows; it was set on the 20 cm test cloth). Asked what rate is physically right and
for a per-panel control.

No maker, mill or shop publishes a grating period or film thickness for dancewear foils
([data gaps](/domain/fabrics/fabric-data-gaps.md)); a search found only 1990s rainbow-film patents
and spectroscopy gratings. The rate follows from the mechanism instead. **[INFERRED]**
- **Diffraction (holographic / rainbow / "electric" foil)**: first order sin(out) - sin(in) = lambda / d.
  With d about 1 um (the bundle's working value, [holographic diffraction](/engineering/rendering/fabric-shading/holographic-diffraction.md)),
  400-700 nm spans 0.3 in sine: one full rainbow per about 17 degrees of viewing direction, about
  9 degrees of surface tilt, and only where a bright light's diffracted order reaches the eye. In
  the shader's terms (`spectrum()` has period 1, phase = dot(reflection, hd) x rate) that is a rate
  of about 3.3. So Liquid hologram's `film.hue` 3.2 is about right for a diffraction foil.
- **Thin film (opal, pearl, iridescent foil)**: the reflected colour follows 2 n t cos(theta_t);
  for n 1.5, cos(theta_t) falls from 1 to 0.82 between face-on and 60 degrees, an 18% shift in
  wavelength: about half the visible spectrum for a first-order film, up to one and a half for
  second or third order (paler colours). Rate about 0.6-1.8. Opal mystique `holoFreq` 3.2 -> 1.
- Our rainbow direction `hd` is fixed, not computed from the lights, so both are approximations.

`rainbow` panel field (`panel.set { rainbow }`, 0.2-3, 1 = the fabric default) multiplies
`uHoloFreq` and `uFilmHue.y` (`render/garment.js applyMaterials`); "Rainbow speed" slider under
"Effect" for fabrics with `flake.holo` or `film.tint` (`ui/inspect-garment.jsx`). Panels only (not
straps or finished edges).

# Open

- **Lighting decides the look.** Under the (since removed) Studio (soft) rig the patches appeared;
  in the White loft HDRI the look depends on the room's turn (round 2). Highlights bright enough
  to reach mint/white as in the photos need a brighter key in the reflection.
- Close up (6 cm) the dots read darker than the knit in the loft (head-on they mirror the dim
  room behind the camera); the owner's close-ups show the same off the highlight, so unchanged.
- Twinkle under a moving light is still small in these rigs (see finding 3); a count-based glint
  lobe for point lights is the next step if the owner wants more.
- Opal-effect mystique (owner's third photo): a soft thin-film over the dots, not built.

Test tooling added: `sweep()` in `material-eval.js` (lights turned by given degrees between
captures; calls `placeHdriLights` itself because a hidden pane runs no frames) and a `full`
distance (3.2 m).

[^owner-2026-10-27]: Conversation with the product owner, 2026-10-27.
[^swatches]: Mystique swatch sheet in the moodboard folder.
[^session-2026-10-27]: Renders and measurements, app/captures/material-eval, 2026-10-27.
[^glints]: Glitter glint models.
