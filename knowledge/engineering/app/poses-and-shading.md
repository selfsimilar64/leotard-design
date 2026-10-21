---
type: Component
title: Poses, shadows and surface folds (P7)
description: "How the designer app poses the mannequin to match a photo (arm presets, baked by Daz Studio on Genesis 9 since 2026-10-21; before, skinned with dual quaternions), the soft studio shadow and contact darkening, tension wrinkles, fold stamps (gathers, ruching, twist knots) and dynamic resolution; with measured costs and the shader pitfall found on Windows."
tags: [app, rendering, pose, shadows, component, p7]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-19T13:00:00Z }
sources:
  - id: code
    resource: "app/src/body/pose.js, body/mannequin.js (setBody, contactOcclusion), render/viewport.js (sun, dynamic resolution), render/engine.js (wrinkleZones), materials/fabric.js, render/decals.js; branch build/designer-app, commit 6b21456"
    title: P7 source
    author: claude-code/claude-opus-5-5
  - id: roadmap
    resource: /product/roadmap/moodboard-coverage-roadmap.md
    title: Moodboard coverage roadmap (P7, R4, R9, R11, T14)
---

# Takeaway

The mannequin now takes the photo's pose (arms down, hands in front, on the hips or thighs, one
arm raised, or any mix per arm) and everything on it follows; a soft studio shadow, contact
darkening where an arm meets the torso, tension folds and fold stamps add the photo's depth.
The three gate designs render posed as in their photos at 9.8-10.9 ms a frame at 1792x1344
(14 ms with the torso filling the frame), inside the 60 fps budget.[^code]

# Poses (`body/pose.js`)

**Since 2026-10-21 poses are baked by Daz Studio on Genesis 9** ([Genesis 9 bodies](/engineering/pipeline/g9-bodies.md)):
the dual-quaternion skinning of the MakeHuman arms below is gone, and Genesis 9's joint correctives
shape the shoulders and armpits. The preset names stayed, so photo-matched designs keep their pose.

- Pose = a preset (`a-pose`, `arms-down`, `hands-in-front`, `hands-on-hips`, `hands-on-thighs`,
  `left-hand-on-hip`, `right-hand-on-hip`, `left-arm-up`, `right-arm-up`) or `{ left, right }`
  with each arm `rest | down | front | thigh | hip | up`, or a whole-body Daz pose (`standing`,
  `split-leap`, ...). `body.set { pose }`. Explicit `{ upper, fore }` arm directions are no longer
  accepted (each arm preset is a bake).
- Each arm preset is baked one arm at a time, aimed in Daz at the body's own landmarks (crotch,
  waist, belly front, head top); the app adds both arms' changes to the A-pose.
- *Before Genesis 9 (history):* per arm, a rotation at the shoulder took the upper arm to its
  direction and one at the posed elbow the forearm, blended per vertex as dual quaternions on the
  baked MakeHuman part weights.
- A pose change re-runs the body pipeline (normals, lift, contact darkening, rims, straps,
  stones). The camera keeps its place; a Daz pose is framed whole.

# Shading

- Soft shadow (R4): a studio key is part area light, part directional light from the same
  direction with a variance shadow map (1024, radius 9). Variance shadow maps make every
  receiver a caster, so sheer panels neither take nor cast shadows (a lining under lace would
  otherwise go black). About +1.5 ms.
- Contact darkening: per body and pose, each torso vertex is darkened by the nearest arm vertex
  in front of it within 4.5 cm (and vice versa), multiplied into the baked AO.
- Tension wrinkles (R9): radial folds fanning out of the crotch and both armpits, on the
  reference body; a raised arm pulls its armpit smooth.
- Fold stamps (T14) are decal looks with no art: `gather` (folds into a knot), `ruche` (folds
  across a gathered line; `aspect` sets its height), `twist` (spiral knot). Placed and sized like
  a logo.
- Pitfall found: taking screen-space derivatives (the bump) inside a loop whose iterations
  branch per pixel is undefined on GPUs; on Windows it shaded whole wrinkle zones black. Flock,
  stamp, wrinkle and seam heights are now summed and bumped once, outside the loops.
- Dynamic resolution (R11): while the view is orbiting and frames come late (under 52 fps) the
  render scale steps down to 70%; full resolution as soon as the view is still. Each step resizes
  the canvas, which clears it: until 2026-10-21 the resize ran after the frame was drawn, so the
  cleared canvas was shown, the black flicker the owner saw about every second while orbiting.
  The step now takes effect before the frame is drawn (`Viewport.frame`, `wantScale`), and a
  resize from the page layout redraws at once. It can be switched off in the Display settings.

# Not done

- GTAO (screen-space AO for strap, band and stone contact): straps already have a contact
  shadow; stones none.
- The garment does not slide over the body when an arm is raised (the armhole moves with the
  shoulder).

[^code]: P7 source
[^roadmap]: Moodboard coverage roadmap
