---
type: Component
title: Poses, shadows and surface folds (P7)
description: "How the designer app poses the mannequin to match a photo (arm presets skinned with dual quaternions on the baked part weights), the soft studio shadow and contact darkening, tension wrinkles, fold stamps (gathers, ruching, twist knots) and dynamic resolution; with measured costs and the shader pitfall found on Windows."
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

- Pose = a preset (`a-pose`, `arms-down`, `hands-in-front`, `hands-on-hips`, `hands-on-thighs`,
  `left-hand-on-hip`, `right-hand-on-hip`, `left-arm-up`, `right-arm-up`) or `{ left, right }`
  with each arm `rest | down | front | thigh | hip | up` or explicit `{ upper: [x, y, z], fore:
  [x, y, z] | { to: [x, y, z] } }`. `body.set { pose }`.
- The rest (A) pose already has arms only 13 degrees from vertical; what photos need is hands on
  hips, hands in front, an arm raised.
- Skinning: per arm, a rotation at the shoulder takes the upper arm to its direction, one at the
  posed elbow takes the forearm to its direction or target; the shoulder part gets half the
  shoulder rotation. Each vertex blends its part weights' transforms (manifest parts: shoulder,
  upper arm, forearm, hand) as dual quaternions, so the elbow bends without the collapse linear
  blending gives. Torso vertices are untouched (tested).
- Hand targets come from the rest body (crotch height, waist height, front of the belly), so
  presets fit every size.
- A pose change re-runs the body pipeline (normals, lift, contact darkening, rims, straps,
  stones): about 0.3-1.6 s. The camera keeps its place.

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
  render scale steps down to 70%; full resolution as soon as the view is still.

# Not done

- GTAO (screen-space AO for strap, band and stone contact): straps already have a contact
  shadow; stones none.
- Skinning of the legs and head (no pose needs them yet); garment does not slide over the body
  when an arm is raised (the armhole moves with the shoulder).

[^code]: P7 source
[^roadmap]: Moodboard coverage roadmap
