---
type: Technique
title: "Photo match: the tricot gloss ladder (matte, shiny, satin, wet look)"
description: "Matte, shiny, stretch satin and wet look now share the scuba scan (its roughness map scaled to each fabric's own roughness, its relief weaker on glossier rungs) and differ by roughness, anisotropy, ior, clear coat and a new yarn-glint layer that shows up close and fades at body distance; satin is new; the drape test cloth gained the tangent anisotropic fabrics need."
tags: [rendering, fabric, tricot, satin, wet-look, glint, photo-match]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-27T22:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-27 (Claude Code session)
    title: "Owner's go-ahead: scuba scan under every gloss rung, sparkle grain, satin; wet look already good"
    author: human:mattj
  - id: refs
    resource: /domain/fabrics/stretch-tricot-family-names.md
    title: "Lycra, spandex, tricot: owner's reference photos and the proposed gloss ladder"
    author: claude-code/claude-opus-5-5
---

# Takeaway

**The four plain tricot fabrics are one cloth at four gloss levels.** They share the scuba knit
scan TX-00001482 (the owner's preferred knit) and differ only in how light leaves the
surface.[^owner][^refs] All values live in `FABRICS` in `app/src/materials/fabric.js`.

| Fabric | Roughness | Stretch (anisotropy) | Other | Scan relief | Glints (presence) |
|---|---|---|---|---|---|
| `matte` Matte lycra | 0.8 | 0 | sheen 0.1 | 1 | none |
| `shiny` Shiny tricot | 0.4 | 0.6 | sheen 0.2 | 0.6 | 0.25 |
| `satin` Stretch satin (new) | 0.2 | 0.5 | ior 1.6, sheen 0.1 | 0.45 | 0.06 |
| `wet` Wet look (cire) | 0.32 | 0.5 | clear coat 0.55 at 0.2 | 0.15 | 0.5 |

# What changed in the shader

- **Relative scan roughness** (`uTexRoughRel`, `uTexRoughMean`). A fabric's *default* scan
  (`FABRICS[k].scan`, `scanOf`) now only varies the fabric's own roughness: roughness × map /
  map mean (TX-00001482: mean 0.766, ±9%). Before, the map replaced it, so the scan would have
  made every rung as dull as scuba. A scan the user picks from the scan library still replaces
  roughness (it defines the fabric). Matte barely moves (0.8 against the map's 0.766).
- **Per-fabric relief** (`scan.normal`): 1 on matte down to 0.15 on wet look. On a gloss every
  small tilt breaks up the highlight, and at 0.3 wet look looked mottled at body distance.
- **Yarn glints** (`glint` fields, `uGlint`): the flake machinery reused as glossy fibre facets.
  Dielectric, the diffuse stays the dye, the specular is part white (`FOIL_FRAGMENT`). Two fixes
  were needed:
  1. Glints carry no anisotropy. Stretched at their low roughness, every small light became a
     razor-thin dotted line across the cloth.
  2. Glints fade to 10% once smaller than a pixel (`gw`). At full strength a shiny red leotard
     read as glitter fabric at body distance; the Nike and GK photos show no sparkle there.
- **`ior` per fabric** (`m.ior`, default 1.5): satin's long floats reflect more.

# Satin tuning

Navy on the plain tank against a frame of GK's turntable video. Anisotropy 0.85-0.9, or ior 2
and above, smeared the loft's bright ceiling over the whole chest as a grey haze. Roughness 0.2,
anisotropy 0.5 and ior 1.6 keep distinct bands over deep navy. **[INFERRED]** It is still softer
and less contrasty than GK's photo, which was lit by a frontal studio light the White loft does
not have; revisit if a frontal-key studio is added.

# Test cloth fix

`app/src/dev/drape-eval.js`'s cloth had no `tangent` attribute, so every anisotropic fabric
(shiny, wet, satin) rendered black on it. That was the case before this work too, so earlier
drape-eval swatches of those fabrics were invalid. It now carries a tangent along x. The
garment and finished edges always had tangents.

# Evidence

Captures in `app/captures/drape-eval/*-ladder*`, `app/captures/material-eval/*-ref-*`, `-v2-` and
`satin-[A-E]-torso`. Picker tiles re-rendered: `public/thumbs/materials/{shiny,satin,wet}.jpg`.

[^owner]: Owner's go-ahead, 2026-10-27
[^refs]: Owner's reference photos and the gloss ladder proposal
