---
type: Technique
title: "Photo match: mystique"
description: "Mystique audit of 2026-10-27 against product photos and a swatch sheet: the dots were a coarse mosaic of 2-3 px squares at every distance and never blended into a shimmer; fixed with sharper, flatter foil dots and a per-fabric blend that averages dot tilts by count far away (Toksvig), so a mystique leotard shows distinct, grainy-edged highlight patches over a deep base. Twinkle under a moving light stays small; the remaining gap is the lighting, not the material."
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

# Open

- **Lighting decides the look.** Under Studio (soft) the patches appear; in the White loft HDRI,
  bright on every side, the foil reflects light everywhere and reads paler. Product-photo softbox
  rigs bright enough to push highlights to mint/white are realism item R1 in
  [realism upgrades](/engineering/rendering/realism-upgrades-at-60fps.md).
- **Close up (6 cm) the dots read slightly darker than the knit** in the loft: head-on they mirror
  the dim room behind the camera. Real swatch close-ups (nktextile.com) were not viewable in this
  session; check against them before changing anything.
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
