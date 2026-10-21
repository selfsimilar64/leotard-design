---
type: Decision
title: "Owner review of the panel: presets change only the leotard, all Daz poses, Stacy as the person"
description: "Owner feedback of 2026-10-21 on the revamped panel: a design preset changes only the leotard (never the pose, body or lighting); HDRI studios show a plain backdrop unless the photographed room is wanted, with its floor projection adjustable; glare much weaker by default with size and strength settings; lights never circle by default; material tiles pre-rendered on twisted cloth in one row; a texture-size setting for every material; all 30 Skillful Routine poses, and none of the arm-only poses in the picker; the person is Stacy (her face and skin on every age and build), with no skin-tone choice."
tags: [decision, ux, side-panel, presets, poses, hdri, glare, materials, stacy, skin]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-21T18:00:00Z }
sources:
  - id: owner-2026-10-21b
    resource: conversation with the product owner, 2026-10-21 (Claude Code session), with three screenshots of broken lines at the armpit
    title: Owner's review list for the designer app and the Stacy request
    author: human:mattj
---

# Decision

The owner reviewed the revamped side panel and asked for these changes.[^owner-2026-10-21b]

1. **A design preset changes only the leotard.** Picking a design keeps the pose, body, appearance,
   expression, lighting and environment (and the camera).
2. **HDRI backdrop.** The photographed room projected onto a floor "looks awful". The owner offered
   a dome-style projection with an adjustable seam, or a plain colour behind the figure with the
   HDRI only lighting it. **[INFERRED]** Both: plain colour is the default; the room stays an option
   with its floor-seam height and room size as sliders (the app already used three.js's grounded
   skybox, which is that dome).
3. **Broken lines.** Lines jumped from the torso onto the arm when the arm moved (screenshots of
   three designs). A bug, fixed: see [garment cutting](/engineering/app/garment-cutting.md).
4. **Pose change shows the bare body.** The leotard moved to the new pose before the person did:
   "unacceptable for the end product". Fixed: both change in the same frame.
5. **Glare** is too strong by default; size and opacity settings.
6. **Lights never circle by default.**
7. **Material tiles are pre-rendered**, all in one row, on a piece of cloth that is scrunched or
   twisted rather than a ball.
8. **Every material has a texture-size setting.**
9. **All poses of the Daz resource pack** (Skillful Routine, 30) are selectable; the arm-only poses
   between the mannequin stance and "Standing, presenting" leave the picker.
10. **The person is Stacy** (CaramelDream3D, a free Genesis 9 character the owner downloaded). Asked
    how, the owner chose: Stacy's face and skin on every age and build (the bodies keep their own
    shapes), and Stacy's skin only, so the skin-tone picker goes. This replaces item 4 of
    [the earlier panel decision](/decisions/2026-10-21-visual-panel-two-appearances.md) (a tone
    picker).

# Consequences

- Implementation: [side panel and presets](/engineering/app/side-panel-and-presets.md),
  [Genesis 9 bodies](/engineering/pipeline/g9-bodies.md).
- The arm-only poses (`arms-down`, `hands-on-hips`, ...) stay in the command surface and in saved
  designs; only the picker no longer lists them.

[^owner-2026-10-21b]: Product owner, 2026-10-21.
