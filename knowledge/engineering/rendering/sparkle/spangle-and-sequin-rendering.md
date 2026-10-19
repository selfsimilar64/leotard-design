---
type: Technique
title: Spangle and sequin rendering
description: "Treat a spangle or sequin as a very large, slightly rough flake: instanced tilted discs up close, handing off to a glint lobe built from the same per-sequin tilts at distance; tilt spread is the main appearance parameter; whole areas flash together."
tags: [rendering, spangle, sequin, instancing, glint]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: srr
    resource: /references/research/realtime-sparkle-rendering.md
    title: "Research notes: real-time sparkle rendering"
    author: claude-code/claude-opus-5-5
  - id: ecs
    resource: /references/research/embellishments-crystals-sequins.md
    title: "Research notes: embellishments, crystals and sequins"
    author: claude-code/claude-opus-5-5
  - id: wiki-sequin
    resource: https://en.wikipedia.org/wiki/Sequin
    title: Wikipedia, Sequin
    author: org:wikipedia
  - id: deliot2023
    resource: https://ar5iv.labs.arxiv.org/html/2306.05051
    title: "Deliot & Belcour, HPG 2023"
    author: org:unity-research
  - id: kemppinen2025
    resource: https://perso.telecom-paristech.fr/boubek/papers/Glinty/
    title: "Kemppinen et al. 2025"
    author: org:adobe-research
  - id: chermain2021
    resource: https://publis.icube.unistra.fr/docs/15022/Chermain2021RealTime.pdf
    title: "Chermain et al., Real-Time Geometric Glint Anti-Aliasing, 2021"
    author: org:icube
  - id: kk2025
    resource: https://arxiv.org/html/2507.02674v1
    title: "Kneiphof & Klein 2025 (Walking Dress test asset)"
    author: org:uni-bonn
  - id: disney
    resource: https://disneyanimation.com/publications/
    title: Disney Animation publications index
    author: org:disney-animation
  - id: clo-help
    resource: https://support.clo3d.com/hc/en-us
    title: CLO Help Center
    author: org:clo
  - id: bw-help
    resource: https://help.browzwear.com/en/
    title: Browzwear Help Center
    author: org:browzwear
  - id: coldesi-prospangle
    resource: https://shop.coldesi.com/products/prospangle-spangle-transfer-machine-prospangle
    title: ColDesi ProSpangle
    author: org:coldesi
---

# Takeaway

No verifiable sequin-rendering publication was found. The defensible design is to treat a sequin or
spangle as **a very large, slightly rough flake**: instanced tilted discs up close, handing off to a
glint BRDF whose discrete normal set is the same per-sequin tilts.[^srr] The glint literature
guarantees the far-field limit (expected count = smooth NDF, variance p(1−p)/N; convergence to the
target GGX/Beckmann), which is what makes the hand-off consistent.[^deliot2023][^kemppinen2025]
A heat-applied spangle has one specular lobe along the mirror direction of the local fabric normal,
so **whole areas flash together** as the body turns — a "sheet" flash, unlike a crystal's pin-point
twinkle; holographic finishes add rainbow diffraction over a wider angle.[^ecs]

# Facts

- Sequins: discs, centre hole (costume usage), some faceted for reflectivity, stitched flat or at one
  point so they dangle and catch more light.[^wiki-sequin] Hotfix spangles are hole-less and bonded
  flat (see [spangles and sequins](/domain/embellishments/spangles-and-sequins.md)). Trade equivalence:
  5 mm spangle ≈ ss20 rhinestone in visual impact.[^coldesi-prospangle]
- Glints on curved animated surfaces flicker unless filtered for curvature; Chermain 2021 addresses
  this.[^chermain2021]
- Real-time glint research already shows garments (a "Walking Dress" asset in Kneiphof–Klein 2025).[^kk2025]
- Disney's embroidery talks (Frozen 2, Encanto) never mention sequins; its publication index has no
  sequin/glitter/glint/crystal/bead title.[^disney]
- CLO (962 article titles) and Browzwear (965) help centres have no sequin, bead, rhinestone, hotfix,
  crystal or spangle article (scan 13 Oct 2026).[^clo-help][^bw-help]

# Proposed design

**[INFERRED]** (research-note proposals, unvalidated):[^srr]

| Aspect | Proposal |
|---|---|
| Geometry LODs | Flat disc with hole: 12–16-gon annulus (24–32 tris) or one alpha-tested quad; cupped: one extra vertex ring (moving hot-spot); faceted: 6–8 flat facets |
| Tilt | Hotfix spangle normal = fabric normal + 1–2° random tilt (adhesive, fabric texture). Sewn/hanging sequins pivot about the stitch: larger tilt, gravity- and motion-dependent when animated |
| Main parameter | **Tilt spread** (degrees, seeded per sequin): a sequin fires when its normal meets the half-vector within the light's angular radius |
| Fish-scale rows | Rows at < 1 diameter pitch with consistent tilt about the row axis; opaque discs, depth test, no blending |
| Representations | (1) instanced geometry with per-instance transform, tilt, colour, seed — editable, close-ups; (2) procedural texture-space sequins (cell lookup in pattern UV with per-cell tilt and disc mask) — all-over sequin fabric, not editable; (3) point/quad impostors with analytic specular — mid-range |
| Distance hand-off | Below ≈2 px per sequin switch to a glint lobe with flake density = sequins/mm², macro roughness = tilt spread, per-flake roughness = sequin roughness, **same seeds**; regular layouts give deterministic count per footprint (area ÷ pitch²); average diffuse/body colour coverage-weighted so brightness does not jump |
| Count | ≈40–60k sequins for full coverage at 4 mm pitch on 0.6–0.9 m² (assumed area), ≈2× with half-overlap — within instancing range |

The PoC implements representation (1) for spangles: a 14-gon disc, metal roughness 0.14, ±0.08
random normal jitter ([stones component](/engineering/poc/stones.md)).

Gaps: no measured sequin/spangle dimensions, cup depths or tilt distributions on stretch fabric; no
public sequin shader verified.[^srr]

[^srr]: Research notes: real-time sparkle rendering, section 3 (in-bundle mirror)
[^ecs]: Research notes: embellishments, crystals and sequins, section 11 inferences (in-bundle mirror)
[^wiki-sequin]: Wikipedia, Sequin
[^deliot2023]: Deliot & Belcour 2023
[^kemppinen2025]: Kemppinen et al. 2025
[^chermain2021]: Chermain et al. 2021
[^kk2025]: Kneiphof & Klein 2025, acknowledgments
[^disney]: Disney Animation publications
[^clo-help]: CLO Help Center title scan
[^bw-help]: Browzwear Help Center title scan
[^coldesi-prospangle]: ColDesi ProSpangle (retailer)
