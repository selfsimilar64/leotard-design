---
type: Decision
title: "Sports-bra bust by taut cloth: flatten 25%, in-out 1, lift 2 cm, then a cloth drape baked into the skin"
description: "Owner decision of 2026-10-25: the bust is shaped by a procedural recipe that works on any body (Daz BreastsFlatten 0.25 and BreastsIn-Out 1.0, a 2 cm lift, then our own taut-membrane cloth drape over a bra band, the skin settled onto it), replacing flatten 1 / in-out 0.5. Prototype in pipeline/daz/bust_cloth/; not baked into the bodies yet."
tags: [decision, bodies, daz, genesis-9, bust, cloth, technique]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-25T23:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-25 (Claude Code session), reviewing renders in app/captures/bust-cloth/ (git-ignored)
    title: Owner review of the procedural sports-bra bust
    author: human:mattj
  - id: proto
    resource: ../../pipeline/daz/bust_cloth/README.md
    title: pipeline/daz/bust_cloth prototype
    author: claude-code/claude-opus-5-5
---

# Decision

Every body past childhood gets its sports-bra bust from one recipe, run on the body itself, so it
applies to any present or future body without a purchased per-character shape:[^owner][^proto]

1. Daz `body_ctrl_BreastsFlatten` 0.25 and `body_ctrl_BreastsIn-Out` 1.0 (owner: "25% compression and more lift and inward pull").
2. Lift 2 cm: a soft upward shift weighted by the pectoral skin weights spread over the mesh (`cloth_proto.prepare`).
3. A taut cloth over a bra band (`cloth_proto.band`: from 10 cm below to 4 cm above the breasts,
   110 degrees round from the front, soft 8 cm / 4 cm edges): our own position-based membrane
   (`cloth_pbd.drape`, shrink 0.5, 1500 iterations), colliding with the skin in 3D, held at the band's edge.
4. The band's skin settles onto the cloth and relaxes along it, faded in by the band weight (`cloth_pbd.transfer`).

It supersedes [flatten 1 and in-out 0.5](/decisions/2026-10-25-sports-bra-bust.md) once baked.

# Context

The owner wanted the fabric's job made easier by smoothing the body under it, after the fabric
bridging work at the chest and seat ([fabric bridging hollows](/engineering/geometry/fabric-bridging-hollows.md))
mostly failed, and preferred building to buying (GVP Chest Smoothing Morphs, fixed per character,
were the bought alternative). What was tried (young adult, A-pose):[^owner]

| Tried | Result |
|---|---|
| Height field seen from the front, then a cylinder around the torso: a membrane over the bust pressed towards a harmonic chest wall | Tears at the armpits and sides (back and side skin caught, a missed raster), then clean but far too flat. Owner: "quite bad"; asked for a cloth simulation like the GVP add-ons |
| Blender cloth, skin copy as cloth | Crumpled into the cleavage, through the breasts |
| Blender cloth, loose smoothed shell shrinking on | Breasts punched through (collision fails under shrink, even ramped over 45 frames) |
| Own membrane drape, 300 iterations | Sports-bra shape, fold and cleavage gone; but about 1 cm proud everywhere (unconverged; edge vertices moved with their fade weight), which showed as a shelf at the top in profile and lines at the band's edges |
| Own drape, held edges hard, 1500 iterations, start 1 cm off | Within ~2 mm of the skin where it rests; edges invisible, profile natural; slightly less merged |
| Tightness (shrink) 5-50% | Under 1 cm difference (99th percentile 0.2-0.5 cm): once taut, the shape is set by where it is held and what it rests on. Owner chose 50% |

# Consequences / how to apply

- Built in (2026-10-26, owner: "build both shapes into the bodies"): `pipeline/daz/shapes.py` at
  convert time, drawn on the A-pose and carried into every pose and arm pose (offsets turned with
  their neighbourhood, as Daz skins a morph) rather than a Daz morph file. Checked first in 12 Daz
  poses on teen, older teen, young and adult (normal shading, `app/captures/bust-cloth/bust-poses/`):
  no tears or creases; in inverted and lying poses Daz's breast bones still move the bust, so some
  separation returns there, as on the bodies before.
- Time: about 35 s per body (drape) on the development laptop.
- Levers that change the look: the Daz starting shape and the lift (strongest), the band's edges,
  a stronger pull across than along (not tried). Not tightness.

- Gap-filling experiment (2026-10-28, adult, today's starting shape, cloth only; owner: "a supported
  and filled gap look so that the individual breasts are less defined"; `bust_cloth/fill.py`,
  renders in `app/captures/bust-cloth/fill*/`). Midline skin brought forward (max, cm): today 0.94;
  bending as smoothing x10 0.99; bilaplacian bending 0.05-0.4 0.96; across 4x / 10x / only 1.09 /
  1.15 / 1.19; up-down 3x 0.86 (worse); band top +4 cm 0.97; fabric thickness 1 / 2 cm 0.95 / 1.03
  (3 cm tore). Cause: the cloth is cut from the skin's own mesh, so it carries the cleavage walls'
  material and its edges follow the mesh, not the chest; even with no up-down pull it dipped 1 cm
  between the breasts. Best: today's drape, then the seat's fresh grid cloth (`seat_proto.drape_grid`,
  seen from the front 10 degrees below) over the front: `two=True, theta=90, soft_t=40, above=8,
  soft_hi=12, grid=dict(along=0.25)`: 1.80, one forward-facing sweep across the bust in normal
  shading, no seam (a held top edge at 4 cm left a line). The grid alone on a 70-degree band sharpened
  the outer underside crease. Not baked; awaiting the owner.

# Revisit if

- Poses show the baked shape fighting the pectoral bones (in-out 1 rotates them 10 degrees).
- The owner wants the bust more merged: tension across rather than along, or a narrower band top.

[^owner]: Product owner, 2026-10-25: "No this looks quite bad. We should take a lesson from the GVP add-ons and run a cloth simulation over the bust"; "This is a huge improvement to our current appearance. I'd like to run with the final column as our settings for now on the bust."
[^proto]: `pipeline/daz/bust_cloth/` (prototype scripts and chosen settings).
