---
type: Technique
title: Lighting for sparkle
description: "Sparkle depends on light size as much as on the material: use an HDRI for the smooth lobe and gem refraction plus a bounded set of explicit small area lamps (with true angular size, exposed as the user's main sparkle dial) for glints; keep all precomputation lighting-independent."
tags: [rendering, lighting, sparkle, hdri, area-light]
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
  - id: report
    resource: /references/research/research-report.md
    title: "Research report: Borrow the engine, build the sparkle"
    author: claude-code/claude-opus-5-5
  - id: deliot2023
    resource: https://ar5iv.labs.arxiv.org/html/2306.05051
    title: "Deliot & Belcour, HPG 2023"
    author: org:unity-research
  - id: kk2024
    resource: https://arxiv.org/html/2408.13611v2
    title: "Kneiphof & Klein, Glints with Area Lights, 2024"
    author: org:uni-bonn
  - id: kk2025
    resource: https://arxiv.org/html/2507.02674v1
    title: "Kneiphof & Klein, IBL of Glints, 2025"
    author: org:uni-bonn
  - id: kemppinen2025
    resource: https://perso.telecom-paristech.fr/boubek/papers/Glinty/
    title: "Kemppinen et al. 2025"
    author: org:adobe-research
  - id: debevec2005
    resource: https://doi.org/10.1145/1186954.1187029
    title: "Debevec, A median cut algorithm for light probe sampling, 2005"
    author: org:acm
  - id: ijewel
    resource: https://docs.ijewel3d.com/playground/diamond-materials.html
    title: iJewel3D docs, Diamond Materials
    author: org:ijewel3d
  - id: unity-axf
    resource: https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@14.0/manual/AxF-Shader.html
    title: Unity HDRP AxF Shader manual
    author: org:unity
  - id: gamboa2018
    resource: https://arxiv.org/html/2507.02674v1
    title: "Gamboa et al. 2018, via Kneiphof & Klein 2025 reference list"
    author: org:uni-bonn
---

# Takeaway

**Stones and glitter flash only under small, intense lights**; under very diffuse light a stone looks
like a flat mirror of the ceiling.[^ecs][^report] Every verified glint method started with point
lights; area lights and environments were handled properly only in 2024–2025, with residual limits on
colour and occlusion.[^srr] Recommended rig: an **HDRI** for ambient/smooth reflections and gem
refraction (rotatable at no cost) **plus a bounded set of explicit small area lamps** for the sparkle,
with **lamp size offered as a control because it is the main sparkle dial**.[^report][^srr]

# Facts

- Deliot–Belcour: punctual lights only, cost linear in light count.[^deliot2023]
- Kneiphof–Klein 2024: area lights via LTC; light opening angle is a physical parameter; earlier code
  evaluated glints only for the mean light direction; no visibility, no textured lights.[^kk2024]
- Kneiphof–Klein 2025: env map split into K = 4 or 8 log-spaced radiance levels (dimmest zeroed below
  horizon), NDF-prefiltered; K = 4 differs visibly for very high dynamic range; per-frame prefilter
  possible; no occlusion; nearby coloured sources → white glints.[^kk2025]
- Kemppinen 2025 supports importance sampling and shows IBL.[^kemppinen2025]
- Offline reference for glints under complex lighting: Gamboa et al. 2018.[^gamboa2018]
- Extracting discrete lights from an HDRI: Debevec's median cut (2005).[^debevec2005]
- Gem sparkle and fire depend heavily on the HDRI and its rotation (iJewel3D exposes several rotation
  controls).[^ijewel]
- Unity AxF car paint uses a fixed half-vector angle for flakes under probes because the true angle is
  unknown.[^unity-axf]

# Recipe

**[INFERRED]** (research-note proposals):[^srr]
1. **Lamp size**: model show lighting as small sphere/disc area lights with physically meaningful
   angular size (a 1 m luminaire at 20 m ≈3°; a bare LED far less). Angular size sets how often and
   how long each facet fires and whether fire is visible. Expose it directly.
2. **Hybrid HDRI**: at load, extract the HDRI's brightest emitters (median cut or thresholded
   connected components) into explicit area lights and remove them from the map used for the smooth
   lobe (no double counting). Gives coloured, occludable, shadow-casting sparkle sources. Cap at the
   8–16 strongest so glint cost per light stays predictable.
3. **Precomputation stays lighting-independent**: per-cut exit-lobe tables, glint noise/dictionaries,
   LTC tables never change with lighting; only env prefiltering and light extraction are redone,
   amortised over a few frames with a cross-fade.
4. **Occlusion** comes from shadow maps per light applied to the sparkle term; stones on the shadowed
   side must not sparkle.
5. Per-stone env lookups use the prefiltered mip matching each lobe's solid angle; extracted lights
   give hard "scintillation", the residual map soft "brilliance".
6. Presets: arrays of discrete arena fixtures, not only an environment dome;[^ecs] plus a plain
   neutral colour-check preset for [tone mapping](/engineering/rendering/sparkle/tone-mapping-pbr-neutral.md).[^report]

The PoC already pairs an environment map with point lights and uses a `uGlintPow` exponent (260) as a
stand-in for lamp size ([stones component](/engineering/poc/stones.md)).

Gaps: no data on real arena or broadcast lighting (luminaire sizes, counts, distances, levels); IBL
dispersion sampling through a gem untested.[^srr][^report]

[^srr]: Research notes: real-time sparkle rendering, section 7 (in-bundle mirror)
[^ecs]: Research notes: embellishments, crystals and sequins, section 11 inferences (in-bundle mirror)
[^report]: Research report, lighting and observer section (in-bundle mirror)
[^deliot2023]: Deliot & Belcour 2023
[^kk2024]: Kneiphof & Klein 2024
[^kk2025]: Kneiphof & Klein 2025
[^kemppinen2025]: Kemppinen et al. 2025
[^debevec2005]: Debevec 2005, DOI
[^ijewel]: iJewel3D Diamond Materials
[^unity-axf]: Unity HDRP AxF manual
[^gamboa2018]: Gamboa et al. 2018 (reference list)
