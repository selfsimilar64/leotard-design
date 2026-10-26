---
type: Decision
title: "Seat: the gluteal cleft spanned by a taut grid cloth drawn on every pose's body"
description: "Owner decision of 2026-10-25/26: the body itself is smoothed at the seat, cleft only (the cheeks and the crease under them untouched), so the fabric fitting has less to do. A grid cloth across the cleft, pressed gently into it (a smooth dip, cheeks still separate), cut where other skin is in front, the skin slid onto it; drawn on each Daz pose's own body. Built into the bodies by pipeline/daz/shapes.py."
tags: [decision, bodies, daz, genesis-9, seat, cloth, technique]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-26T12:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-25 to 2026-10-26 (Claude Code session), reviewing renders in app/captures/bust-cloth/ (git-ignored), normal-shaded from the second review on
    title: Owner review of the seat cleft cloth
    author: human:mattj
  - id: proto
    resource: ../../pipeline/daz/bust_cloth/README.md
    title: pipeline/daz/bust_cloth prototype notes (seat sections)
    author: claude-code/claude-opus-5-5
---

# Decision

Every body (children included) has its gluteal cleft smoothed on the skin, the same way the
[bust](/decisions/2026-10-25-sports-bra-cloth-bust.md) is: our own cloth drape, the skin settled
onto it.[^owner] Cleft only (owner): the cheeks and the crease under them stay as they are, since a
high leg cut leaves them bare. Settings in `pipeline/daz/shapes.py SEAT`:[^proto]

1. **Band**: a strip along the cleft found per body (crotch point; the cleft's top where the
   midline sits 3 mm behind the cheeks), narrower at the bottom, ending 3 cm behind the crotch
   (`front=-3`: closer, the gusset skin was dragged back into spurs).
2. **Cloth**: a fresh regular grid laid on the skin as seen from behind and 30 degrees below (a
   copy of the skin's own mesh carried the cleft walls' extra material and sagged back in), held at
   the band's edge; cut where its depth jumps outside the cleft's core (a thigh or the other cheek
   in front, in twisted poses); pulled 4x harder across than along; pressed into the cleft by an
   even pressure along its own normal (0.001, the depth of the owner's chosen cling 0.002; a pull
   towards the nearest skin dragged it into the slot and made a midline line).
3. **Skin onto cloth**: one sparse solve, thin-plate smoothness plus a pull onto the cloth's
   surface only, so the wall skin slides along it instead of knotting.
4. **Per pose**: drawn on each Daz pose's own body (the posed mesh rigidly fitted to the A-pose
   pelvis first). Carrying the A-pose result pleated the cleft wherever a pose opens it.

# Context

Simulating skin-tight fabric to avoid shrink-wrap at the seat had mostly failed
([fabric bridging hollows](/engineering/geometry/fabric-bridging-hollows.md)). The owner judged the
look against moodboard back views: the fabric dips a little into the cleft on older models, very
smoothly, the buttocks still read as separate. Tightness changed little (a taut cloth's shape is
set by where it is held); strength blends looked half-done; the cling depth was the control.

# Consequences / how to apply

- Reviewed on all 8 bodies x 31 poses in normal shading: clean except a faint crease beside the
  cleft in the floor split (young, adult, petite) and a thin sliver in the 9-year-old's stag jump;
  the 6-year-old's cleft is too shallow to change much.
- Cost: about 20-25 s per body per pose, cached (`out/bodies/<key>/shaped/`).
- The app's own seat sheet and bridging still run on top of the smoothed body.

# Revisit if

- The floor-split crease or the stag-jump sliver shows in designs.
- A design needs the bare crease under the cheeks smoothed too (the owner chose cleft only).

[^owner]: Product owner: "Cleft only"; "Let's go with cling 002 for now"; "the normal shadings are the most readable"; "This look good to me!"; "build both shapes into the bodies so we can see them in-app" (2026-10-25/26).
[^proto]: `pipeline/daz/bust_cloth/seat_proto.py` and README (seat sections).
