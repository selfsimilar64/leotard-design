---
type: Technique
title: Body models
description: "Anny (Apache-2.0 on CC0 MakeHuman assets, continuous child-to-adult) is the only verified commercially usable all-ages parametric body; SMPL-family models are non-commercial with licensing in flux; the POC uses MakeHuman via MPFB; fixed topology is the keystone."
tags: [geometry, technique, body-model, licensing, anny, smpl, makehuman]
stale_after: 2027-10-15T00:00:00Z
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: anny-arxiv
    resource: https://arxiv.org/abs/2511.03589
    title: "Brégier et al., Human Mesh Modeling for Anny Body, arXiv 2511.03589 (v3 29 Jul 2026, ECCV 2026)"
  - id: anny-gh
    resource: https://github.com/naver/anny
    title: github.com/naver/anny
    author: org:naver-labs-europe
  - id: anny-blog
    resource: https://europe.naverlabs.com/blog/anny-a-free-to-use-3d-human-parametric-model-for-all-ages/
    title: "NAVER LABS Europe blog on Anny, 6 Nov 2025"
    author: org:naver-labs-europe
  - id: smpl-licence
    resource: https://smpl.is.tue.mpg.de/modellicense.html
    title: SMPL model licence
    author: org:max-planck
  - id: smplx-licence
    resource: https://smpl-x.is.tue.mpg.de/modellicense.html
    title: SMPL-X model licence
    author: org:max-planck
  - id: meshcapade
    resource: https://meshcapade.com/assets/body-models
    title: Meshcapade body models (prices seen via search summaries only)
    author: org:meshcapade
  - id: gamesmarket
    resource: https://www.gamesmarket.global/epic-games-acquires-meshcapade-and-will-establish-a-presence-in-tubingen/
    title: "GamesMarket, 19 Feb 2026, Epic Games to acquire Meshcapade"
    author: org:gamesmarket
  - id: agora
    resource: https://arxiv.org/pdf/2104.14643
    title: AGORA paper, arXiv 2104.14643
  - id: bev
    resource: https://arxiv.org/abs/2112.08274
    title: "BEV / SMPL+A, Sun et al., CVPR 2022"
  - id: mhr
    resource: https://github.com/facebookresearch/MHR
    title: Meta MHR (Momentum Human Rig)
    author: org:meta
  - id: mh-licence
    resource: https://static.makehumancommunity.org/about/license.html
    title: MakeHuman licence page
    author: org:makehuman
  - id: mpfb-faq
    resource: https://static.makehumancommunity.org/mpfb/faq/can_i_sell_models.html
    title: MPFB FAQ, can I sell models
    author: org:makehuman
  - id: alvanon
    resource: https://www.just-style.com/excellence-awards/featured-company/just-style-excellence-awards-2023-alvanon/
    title: Just Style award profile 2023 (Alvanon)
    author: org:just-style
  - id: gcd
    resource: https://arxiv.org/abs/2405.17609
    title: "GarmentCodeData, ECCV 2024"
  - id: gg-notes
    resource: /references/research/garment-geometry-and-placement.md
    title: "Research notes: garment geometry and placement (in-bundle mirror), section 1"
    author: claude-code/claude-opus-5-5
  - id: free-assets
    resource: /decisions/2026-10-13-prefer-free-open-assets.md
    title: "Decision: prefer free, open assets"
    author: human:mattj
  - id: pipeline
    resource: ../../../pipeline/build_mannequins.py
    title: pipeline/build_mannequins.py
    author: claude-code/claude-opus-5-5
---

# Takeaway

**Build on an openly licensed, fixed-topology, all-ages body: Anny (NAVER LABS Europe; Apache-2.0
code on CC0 MakeHuman assets; continuous infant-to-elder age; rigged) is the only verified option that
is both commercially usable and continuous from child to adult.** The SMPL family is non-commercial by
default and its commercial licensing is in flux after Epic Games' announced acquisition of Meshcapade
(Feb 2026).[^gg-notes] The POC currently uses the CC0 MakeHuman base mesh baked through MPFB 2 (see
[mannequin pipeline](/engineering/pipeline/mannequin-pipeline.md)), consistent with the
[free/open assets decision](/decisions/2026-10-13-prefer-free-open-assets.md).[^pipeline][^free-assets]

# Options

| Model | Licence | Ages | Notes |
|---|---|---|---|
| **Anny**[^anny-arxiv][^anny-gh][^anny-blog] | Code Apache-2.0 (© 2025 NAVER); MakeHuman/MPFB2 assets CC0; "soma" topology Apache-2.0; **optional "smplx" topology non-commercial** | infant → elder, continuous | PyTorch, differentiable; phenotype params in [0,1] (gender, age, height, weight, muscle…), local shape [-1,1], facial blendshapes; WHO-calibrated; base mesh from MakeHuman, "over 13,000 vertices and 163 bones"; 564 blendshapes; default rig 104 bones (full 163 selectable); topologies `anny`, `anny-quads`, `anny-full`, `makehuman`, `smplx`, `smpl`, `soma`; v0.6 2026-08-06; no gated download |
| SMPL / SMPL-X[^smpl-licence][^smplx-licence] | non-commercial research/education/art only; commercial via Max Planck Innovation / Meshcapade | adults | Meshcapade prices conflict between its own pages (e.g. Micro €1,500 or €5,000/yr) **[UNVERIFIED]**[^meshcapade]; Epic to acquire Meshcapade, Max Planck Innovation to take over SMPL licensing directly (19 Feb 2026)[^gamesmarket] |
| SMIL, AGORA kids, SMPL+A[^agora][^bev] | research | infants; interpolated children | AGORA blends adult SMPL-X and SMIL templates with weight α; BEV criticises this and proposes age-aware SMPL+A (research release) |
| Meta MHR[^mhr] | Apache-2.0 | README silent on children | 45 shape, 204 pose, 72 expression params; 7 LODs; SMPL/SMPL-X converters |
| MakeHuman / MPFB[^mh-licence][^mpfb-faq] | core assets CC0 (no attribution); MPFB source GPL, MakeHuman AGPL; community assets own licences | child → adult via age slider | used by the POC pipeline |
| Commercial fit avatars (Alvanon)[^alvanon] | paid | children's range unconfirmed | work with Browzwear, CLO, Optitex, Style3D, Gerber |
| GarmentCodeData body[^gcd] | research | adults (CAESAR-based) | measurement parametrisation via GarmentMeasurements |

All via the research note.[^gg-notes]

# Design consequences **[INFERRED]**

- **Fixed topology is the keystone:** every size and pose is the same connectivity with different
  vertex positions, so anything anchored as (face id, barycentrics) transfers across sizes and poses
  for free. The POC already relies on this (its pipeline raises if topology differs).[^pipeline]
- **Measurement-driven morphing:** fit target measurements (height, chest, waist, hip, torso girth,
  inseam) offline by least squares over Anny's phenotype vector, measuring circumferences on the mesh;
  ship a "size → phenotype" table interpolated at runtime, no runtime optimiser.
- **Weight:** 564 blendshapes × ~13,000 vertices × 3 × 4 bytes ≈ 88 MB float32 dense — too heavy for a
  browser; exploit sparsity/quantisation, or bake fixed bodies per size and pose offline (what the POC does).
- **Gymnasts are not the general population:** WHO-calibrated defaults must be validated against leotard
  size charts ([/domain/sizing/](/domain/sizing/about.md)).
- **Factory fit forms** can be registered once to the canonical topology (non-rigid wrap) rather than
  used natively.
- **Minors:** neutral mannequin presentation (no skin detail, no facial realism) by default.

# Gaps

Exact vertex count of Anny's default topology, whether it is exactly bilaterally symmetric, MPFB's
current age-slider range, child anthropometric datasets (NIST AnthroKids etc.) and sizing standards
(ISO 8559-1, ASTM D6192, D5826) were not verified; post-acquisition SMPL terms are unresolved.[^gg-notes]

[^anny-arxiv]: Anny paper, arXiv 2511.03589.
[^anny-gh]: Anny repository.
[^anny-blog]: NAVER LABS Europe blog.
[^smpl-licence]: SMPL licence.
[^smplx-licence]: SMPL-X licence.
[^meshcapade]: Meshcapade pricing (indicative only).
[^gamesmarket]: GamesMarket, 19 Feb 2026.
[^agora]: AGORA.
[^bev]: BEV / SMPL+A.
[^mhr]: Meta MHR.
[^mh-licence]: MakeHuman licence.
[^mpfb-faq]: MPFB FAQ.
[^alvanon]: Alvanon profile.
[^gcd]: GarmentCodeData.
[^gg-notes]: Research notes: garment geometry and placement (in-bundle mirror).
[^free-assets]: Decision to prefer free, open assets.
[^pipeline]: pipeline/build_mannequins.py in the project repository.
