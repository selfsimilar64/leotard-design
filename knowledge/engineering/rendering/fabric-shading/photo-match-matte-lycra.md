---
type: Technique
title: "Photo match: matte lycra"
description: "First fabric checked against a real photo in a fixed test scene (White loft studio, arms outstretched, three to four distances, bloom off): the old preset's sheen and the scene's bloom washed a dark green out; with sheen 0.1 (tinted 10% white) and no bloom the render matches a GK product photo's contrast and saturation, and a rebuilt tricot knit shows at hand's length."
tags: [rendering, fabric, calibration, matte, knit, bloom]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-24T13:10:00Z }
sources:
  - id: owner-2026-10-24
    resource: conversation with the product owner, 2026-10-24 (Claude Code session)
    title: "Owner's test setup (White loft studio, room turned 160-180 degrees, Arms Outstretched) and reference images: a GK Elite plain tank product photo, Sylvia P matt lycra swatches, a RenderHub twill texture and the Poly Haven Scuba Suede texture"
    author: human:mattj
  - id: session-2026-10-24
    resource: renders and measurements in app/captures/material-eval (git-ignored), 2026-10-24 (Claude Code session)
    title: Matte lycra render series base to v6 with luminance and saturation statistics
    author: claude-code/claude-opus-5-5
  - id: matte-tricot
    resource: /domain/fabrics/matte-tricot.md
    title: Matte tricot (Carvico data sheets, 44 courses x 26 wales per cm)
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Judge a fabric against a photo only in a fixed scene with bloom off, and measure it.** For matte
lycra two things, not the material model itself, made the render look unlike the real fabric: the
preset's sheen (0.4, tinted a third of the way to white) and the scene's bloom. With the sheen at
0.1 tinted 10% white, and no bloom, a dark green tank matches a GK product photo's contrast and
saturation to within a few hundredths.[^session-2026-10-24] The knit was rebuilt to the real
tricot structure and now shows close up instead of fading to a flat surface at a few centimetres.

# The test scene

`app/src/dev/material-eval.js`, run from the app's console:
`const m = await import('/src/dev/material-eval.js'); await m.shoot('matte', '#1f4542', 'tag')`.
It applies the plain-tank starting point in one fabric and colour on the headless mannequin, in
the owner's comparison setup (White loft studio, room turned 170 degrees, Arms Outstretched),[^owner-2026-10-24]
and writes PNGs to `app/captures/material-eval/<fabric>-<tag>-<distance>.png`:

| Distance | Camera to fabric | What it checks |
|---|---|---|
| `torso` | ~1.35 m | Product-photo framing: overall contrast, saturation, falloff at the sides |
| `near` | ~45 cm | Hand's length: the yarn's faint streaks |
| `macro` | ~17 cm | Wale columns start to resolve (about 3 px each at 900x700) |
| `micro` | ~6 cm | The loops themselves, as a swatch close-up shows them |

The camera aims off the posed sternum's normal, because the pose turns the torso away from the
room's front. Options: `tweak` (fabric fields for one round, e.g. `{ sheen: 0 }`) and `bloom`
(keep the scene's bloom, to show what the app draws).

Pitfalls met building it:
- **Never `import('/src/instance.js')` from the console after a hot reload.** It can load a
  fresh copy of the module, which builds a second, engine-less `App` and overwrites `window.app`.
  The script uses `window.app`; navigate to a fresh URL after editing files.
- **A console import of `fabric.js` after an edit is a different copy** from the app's
  (the app's carries a `?t=` timestamp), so editing its `FABRICS` does nothing; `shoot` finds the
  app's copy through `performance.getEntriesByType('resource')`.
- `scene.envRotation` is radians (the panel shows degrees); `bloom.strength` is set every
  animation frame from the settings, so a capture zeroes it around the render.

Measurement: luminance percentiles and mean saturation (`(max - min) / max`) of the fabric's pixels
(green-dominant mask), in the darkest 10%, the middle and the brightest 10%.[^session-2026-10-24]

# Results

GK Elite plain tank photo against the render (`#1f4542`, torso view):[^session-2026-10-24]

| | Bright/dark (98th/2nd pct) | Saturation mid | Saturation brightest 10% |
|---|---|---|---|
| GK photo | 3.46 | 0.61 | 0.36 |
| Old preset, bloom on (as the app drew it) | 4.05 | 0.41 | 0.21 |
| New preset, bloom on | 3.84 | 0.51 | 0.27 |
| New preset, bloom off | 3.71 | 0.63 | 0.35 |

- **Sheen tint is mixed in linear light**, so "a third white" is nearly white on a dark colour:
  the sheen colour of a dark green at 35% was a light grey. At sheen 0.1 / tint 0.1 the result is
  indistinguishable from no sheen; the old 0.4 / 0.35 cost 0.12 of mid saturation even without
  bloom. Preset: `matte: { roughness: 0.8, sheen: 0.1, sheenRoughness: 0.6, sheenTint: 0.1, knit: 1 }`
  in `app/src/materials/fabric.js` (`sheenTint` is new; other fabrics keep 0.35, velvet 0.25).
- **Bloom laid a pale veil over the whole leotard** in the loft HDRI: at its low default
  (0.18 x the rig's `bloomK` 0.4) it took 0.12 more of mid saturation, because the studio's walls
  are bright enough to bloom across the figure. A product photo has no such veil. **[INFERRED]**
  The app's default bloom on HDRI rigs is therefore a realism problem for every dark fabric; not
  changed yet (owner to decide).
- **Lowering the reflection (`specularIntensity` 0.25) looked right with bloom on, but was
  compensating for the bloom**; with bloom off the standard reflection matches the photo, so it
  was reverted. Roughness 0.65 made the highlights greyer, not truer; 0.8 stays.
- The default white seamless rig looked much flatter than the photo (bright/dark 1.5); skin
  contrast was similar in both images, which wrongly suggested the fabric was at fault. The owner's
  HDRI view settled it: lighting first, then the material.

# The knit (`uKnit` in `FABRIC_FRAGMENT`)

The old knit was a sine across the grain at 0.35 mm that faded to nothing at about 0.07 mm per
pixel, so the fabric was perfectly smooth beyond a few centimetres. The new one follows a warp-knit
tricot's technical face at the Carvico counts (wale 0.38 mm, course 0.23 mm):[^matte-tricot] V-shaped
loops of two legs, deeper grooves between the wale columns, and the yarn's height drifting in
streaks about four wales wide. Each scale fades to its own average (so the colour at a distance
does not change) once it is under about four pixels: legs, then courses, then wale columns, then
the drift. At two to three pixels the wale columns beat into a diagonal moire, which the
debug checker fabric showed was not the grain (the grain runs straight up the body). Result:
faint vertical streaks at 17-45 cm, loops at 6 cm, smooth beyond about a metre. Shared by every
fabric with `knit` (shiny tricot, mystique, hologram, the ombres) and the linen dress-form
mannequin finish (`render/engine.js`); shiny and mystique checked, unchanged at body distance.

# Reference images

The GK Elite product photo is the right reference at body distance; the Sylvia P swatch sheet
for the near-smooth surface up close. Neither offered texture fits: the RenderHub texture is a
twill weave (suiting, not a knit) and Poly Haven's Scuba Suede is a brushed, fuzzy face.[^owner-2026-10-24]
The GK photo is retouched, so its numbers are a target, not a measurement.

# Next

- Stretch lightening (the knit opening over the bust and seat): designed in
  [stretch-dependent appearance](/engineering/rendering/fabric-shading/stretch-dependent-appearance.md),
  needs per-triangle stretch passed to the shader.
- Bloom on HDRI rigs (above).
- The same procedure for shiny tricot, stretch mesh, metallic foil, mystique and stretch velvet,
  the owner's first batch.

Related: [calibration against swatches](/engineering/rendering/fabric-shading/calibration-against-swatches.md),
[starting parameter values](/engineering/rendering/fabric-shading/starting-parameter-values.md).

[^owner-2026-10-24]: Conversation with the product owner, 2026-10-24.
[^session-2026-10-24]: Renders and measurements, app/captures/material-eval, 2026-10-24.
[^matte-tricot]: Matte tricot concept (Carvico data sheets).
