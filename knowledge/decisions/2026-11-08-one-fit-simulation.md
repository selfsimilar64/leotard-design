---
type: Decision
title: One fit simulation carries the whole fit; the pose slide is removed
description: "Owner direction of 2026-11-08: the fit sim is to become the one simulation responsible for the total fit, as realistic and robust as it can be made. Now: the pose slide (body/slide.js) is removed; the hollow-bridging membrane and the seat sheet stay, because the fitted garments' fits stand on them, until the fit sim spans hollows by its own tension."
tags: [decision, fit, simulation, garment, bridging]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-08T21:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-08 (Claude Code session)
    title: "We can go ahead and remove the slides over the body, and we'll keep the other two older versions. But I definitely in the future want to work towards making that part of the fit sim, so we can have one centralized simulation that is responsible for the total fit, as realistic or robust as possible."
    author: human:mattj
  - id: measured
    resource: /engineering/geometry/fabric-bridging-hollows.md
    title: The fitted garments stand on the bridged surface (measurements of 2026-11-08)
---

# Decision

The fit sim is to become the one simulation responsible for the whole fit: how the fabric sits, slides, spans hollows
and settles on any body and pose, made as realistic and robust as possible.[^owner] The older geometric techniques of
the drawn garment go as the fit sim takes over what they do.

Now: **the pose slide is removed** ("fabric slides over the body in poses": `body/slide.js`, its tension and grip,
`Man.slideFabric`). It moved a fitted garment about 15 mm off its fit on average and held the page 1.3 s a pose.[^measured]
**The membrane bridge and the seat sheet stay** ("how fabric spans hollows", "taut across the seat"): the fitted
garments' fits, the shipped ones and the in-app re-fit, stand on that surface, and without it the fabric sinks into
the navel, the spine groove and the seat cleft, which the fit sim does not yet span by itself.[^measured]

# Consequences

- The garment surface (`Man.gPos`) is the skin in every pose; the drawn garment is painted on the posed skin plus the
  lift, as it was before the slide (2026-10-21), so its leg openings can drag in deep poses: the fitted garments are
  the realistic path.
- `Engine.setSlide` became `Engine.setLift`; the display settings `slide`, `slideTension`, `slideGrip` are gone (a stored
  value is ignored); Settings › Fabric fit lost its slide switch and sliders.
- Next, when the owner calls for it: the fit sim spans hollows by its own tension on the bare skin (the pattern's
  reduction, the solver's contact and friction), every shipped fit is redone on the bare skin, and then the membrane,
  the seat sheet and the rolling ball are removed.

# Revisit if

The fit sim cannot span hollows without a band-aid; then the bridged surface stays as its collision body, recorded as such.

[^owner]: Conversation with the product owner, 2026-11-08.
[^measured]: Fabric bridging hollows, section "The fitted garments stand on it", measured 2026-11-08.
