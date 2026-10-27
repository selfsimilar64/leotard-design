---
type: Roadmap
title: "Plan: the thread-model satin in the photographed (HDRI) studios"
description: "Plan agreed with the owner on 2026-10-27 to make the microcylinder satin hold up in the HDRI studios: calibrate its energy (a white-furnace test) so no studio-specific gain is needed, re-tune by eye at full quality, add occlusion and the HDRI rigs' direct lights, then compare against GK photos in every studio; fidelity first, optimisation only afterwards with the owner's go-ahead."
tags: [plan, rendering, satin, hdri, microcylinder]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-27T23:50:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-27 (Claude Code session)
    title: "Owner: put the full compute back; plan how to adapt the new satin to HDRI"
    author: human:mattj
  - id: model
    resource: /engineering/rendering/fabric-shading/microcylinder-cloth-model.md
    title: Microcylinder cloth model and its in-app version
    author: claude-code/claude-opus-5-5
---

# Where it stands

`satinmicro` runs unchanged in the HDRI studios, because it already takes its light from the scene
environment. There it washes navy out to pale periwinkle (White loft, Green loft hall,
2026-10-27). Its sampling is the full version again (28 tangent samples × 12 cone directions,
roughness 0.2, about 35 ms a frame at 1280 × 1000 on the GTX 1650), stripes included, on the
owner's instruction: no simplification while the look is being set.[^owner][^model]

**[INFERRED]** Root cause of the wash-out: A = 2 and gain = 1.5 were tuned by eye in the Softbox
studio, whose reflection room is dark except for the boxes. They let the fabric return more light
than reaches it. That stays hidden in a dark room, but in a photographed room that is bright in
most directions the surplus spreads over the whole panel.

**Update (owner, same day):** there is to be no tuning by eye or toward reference photos; the
model is used as published, and the owner prompts any changes. Steps 1-2 below are superseded by
the [paper-exact version](/engineering/rendering/fabric-shading/microcylinder-cloth-model.md),
which runs consistently in the HDRI studios. Steps 3-6 remain open questions for the owner.

# Steps

1. **Energy check (white furnace).** Render the satin inside a uniform white environment
   (radiance 1, no lights). A physically sound fabric is at most white there, and stays in its own
   colour. Instrument it (probe pixels via `vp.capture`) and find the A and gain that keep the total
   at or below 1 for every view angle. Expected: A ≤ 1 in the volume term, gain 1, the diffuse
   share chosen so diffuse plus shine stays at or below 1. Output: settings that need no
   per-studio correction.
2. **Re-tune by eye inside those limits, full quality,** in the Softbox studio and the two-light
   studio: navy against GK's turntable video and gym photo, plus a light colour (pink). The owner
   reviews. If the limits cost the blue bands, the fix is in the model (for example the colour
   share of the shine), not a larger gain.
3. **Occlusion.** The environment lookups see the whole room even under the arms and in the seat,
   so occluded satin still reflects the bright room. Darken the traced reflection by the fabric's
   ambient occlusion (`vAO`, contact AO), as three does for its own reflections (`AO_FRAGMENT`).
   Matters far more in bright HDRI rooms than in the dark softbox room.
4. **The HDRI rigs' direct lights.** HDRI studios add a shadow-casting key along the image's
   brightest direction (`sun`) and two small glint lights. The satin's shine ignores direct lights
   (three's specular is off for it), so the key's highlight comes only from the image, and in the
   key's shadow the reflection does not darken. Decide by comparison whether the satin needs (a)
   its thread terms evaluated for the directional and point lights, and (b) the key's shadow
   applied to the reflected light from that direction.
5. **Compare in every studio** (five HDRI, two softbox), navy and a light colour, against the GK
   photos. Owner review; tune only parameters with a physical meaning.
6. **Stripes without losing fidelity (owner's call, later).** The stripes come from discrete
   sharp lookups. Options, none to be applied without the owner: denser sampling where the
   environment is sharp (higher cost); integrating each tangent segment's reflections continuously
   rather than at points; temporal accumulation with jittered samples (needs a still camera or
   history reprojection). Optimisation (the blurred 7 × 6 variant measured 16.2 ms; see the model
   note) waits until the look is final.

# Open questions for the owner

- Which HDRI studio should be the reference for satin (where GK-like lighting is closest)?
- Is a still-camera refinement acceptable for stripe-free quality (sharpens when the view stops
  moving), or must every frame be final quality?

[^owner]: Owner, 2026-10-27
[^model]: Microcylinder cloth model note
