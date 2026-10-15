---
type: Component
title: Display stands (stand.js)
description: "poc-threejs/src/stand.js builds the display hardware around the mannequin: a glass base with a calf rod for the full body, and end caps, wooden neck cap, crotch pole and five-leg caster base for the dress form."
tags: [poc, component, presentation, mannequin]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: stand-js
    resource: ../../../poc-threejs/src/stand.js
    title: poc-threejs/src/stand.js
    author: claude-code/claude-opus-5-5
  - id: body-js
    resource: ../../../poc-threejs/src/body.js
    title: poc-threejs/src/body.js (cutLoops, crotch, landmark)
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Presentation only: `stand.js` rebuilds the stand geometry whenever the body or presentation mode
changes, using the current mesh, so it fits every body size.** It has no bearing on the garment model.[^stand-js]

# Two presentations

| Mode | Hardware | How it is fitted |
|---|---|---|
| Full body (`fullBodyStand`) | round tempered-glass base, 40.6 cm across (35 cm for the child, stature < 1.4 m), 8 mm thick, with an edge torus; chrome rod rising behind the heel into the back of the right calf | calf point found on the current mesh 55% of the way from ankle to knee landmark |
| Dress form (`dressFormStand`) | "3/4" swimwear-style form cut at neck, upper arms and mid-thigh; flat fan-triangulated end caps on each cut loop; turned wooden neck cap (disc ≈ 1.12–1.18 × neck radius, plus knob); chrome pole from the crotch with a height-adjust collar; five-leg caster base (legs 0.27 m) | cut loops from `body.cutLoops()` (the dress-form `keep` field); pole from `body.crotch` |

Sizes come from the mannequin research note; neck cap and base dimensions are estimates.[^stand-js]
The cuts themselves are defined in [body and regions](/engineering/poc/body-and-regions.md) (`FORM`:
neck 2.2 cm above the neck base, mid-thigh, arms at `armT` 0.1).[^body-js]

# Notes **[INFERRED]**

- The dress form matters for the professional tool's presentation: designers and factories think in
  dress forms and flat pieces, and the cut loops show where leg openings sit.
- End caps are fan-triangulated from the loop centroid, fine for convex-ish loops only.

[^stand-js]: poc-threejs/src/stand.js in the project repository.
[^body-js]: poc-threejs/src/body.js in the project repository.
