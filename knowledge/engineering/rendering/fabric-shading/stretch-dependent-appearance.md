---
type: Technique
title: Stretch-dependent fabric appearance (open problem)
description: "Stretched knit lightens, shows the skin or lining, loses foil coverage and printed colour; there is no rendering literature or format support for this, so the proposal is an in-house model driven by per-triangle strain and fitted to swatches photographed at known stretch."
tags: [rendering, fabric, stretch, open-problem]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-shade
    resource: /references/research/realtime-fabric-shading.md
    title: "Research notes: real-time fabric shading, questions 3, 4, 13 and 15"
    author: claude-code/claude-opus-5-5
  - id: notes-fab
    resource: /references/research/fabrics-and-materials.md
    title: "Research notes: fabrics and materials, questions 4 and 5"
    author: claude-code/claude-opus-5-5
  - id: report
    resource: /references/research/research-report.md
    title: "Research report, PBR section"
    author: claude-code/claude-opus-5-5
  - id: madypg
    resource: https://visualcomputing.ist.ac.at/publications/2021/MADYPG/
    title: "Sperl, Narain, Wojtan: Mechanics-Aware Deformation of Yarn Pattern Geometry (SIGGRAPH 2021)"
    author: team:sperl-narain-wojtan
  - id: rtstitch
    resource: https://kuiwuchn.github.io/rtstitch.html
    title: "Real-Time Knit Deformation and Rendering (SIGGRAPH 2025)"
    author: team:huang-et-al
  - id: u3m
    resource: https://github.com/vizoogmbh/u3m/blob/master/u3m1.1/spec/u3m_schema.json
    title: U3M 1.1 JSON schema
    author: org:vizoo
  - id: style3d
    resource: https://www.style3d.com/blog/?p=11922
    title: Style3D blog on performance knits
    author: org:style3d
---

# Takeaway

**How fabric lightens and shows the skin as it stretches is central to leotards and has essentially
no published rendering method behind it; it is a design risk, not a solved problem.**[^report][^notes-shade]
Research handles stretch geometrically (yarn loops tightening), not as a material response, and the
apparel material format U3M 1.1 has no strain-dependent property.[^madypg][^rtstitch][^u3m] Style3D
says high-spandex knits need tension-recovery simulation and manual calibration against swatches but
does not describe appearance changing.[^style3d]

# Proposed model (**[INFERRED]**, un-sourced engineering proposal)

Inputs: per-triangle deformation from pattern space to the draped body, principal stretches λ1 ≥ λ2,
area ratio J = λ1·λ2 (from a drape solver, or in-shader from screen-space derivatives of position and
UV).[^notes-shade]

| Effect | Proposed term |
|---|---|
| Cover factor / show-through | `c = clamp(c0·J^(−k))`, k fitted in [0, 1]; opacity α = c at normal incidence; colour = α·fabric + (1−α)·T·underlayer |
| Knit relief | normal-map amplitude scaled by 1/λ along each principal direction |
| Highlight shape | anisotropy strength increased with λ1/λ2 − 1 along λ1 |
| Gloss | roughness reduced slightly as yarns straighten |
| Printed colour ("grin-through") | lerp printed colour toward the undyed core with strain, since sublimation dye sits on the fibre face |
| Foil dots | mask coverage scaled by about 1/J (dots do not stretch; gaps widen) |
| Velvet | pile thins; reuse the coverage term |

Because the under-layer is known (skin or lining at zero gap), show-through composites inside the
fabric shader ([mesh over skin](/engineering/rendering/fabric-shading/mesh-over-skin-blend.md)).[^notes-shade]

# What is needed to make it real

- Calibration data: photograph swatches clamped at known strains (e.g. 0, 25, 50, 75%) over black and
  skin-tone backings and fit every coefficient ([calibration](/engineering/rendering/fabric-shading/calibration-against-swatches.md)).[^notes-shade]
- A strain source: our garment is designed directly on the body with no cloth simulation
  ([/engineering/geometry/](/engineering/geometry/about.md)), so **[INFERRED]** strain must come from the
  body-to-pattern mapping or be approximated; how is open.
- Mill stretch curves (Carvico) give the strain range to calibrate over
  ([stretch properties](/domain/fabrics/stretch-properties.md)).[^notes-shade]

# Gaps

No source quantifies grin-through or opacity loss with strain;[^notes-fab] no textile-science literature
on cover factor was searched (search budget exhausted); whether CLO, Browzwear or Style3D feed strain
into materials is unverified (recalled: diagnostic heat maps only).[^notes-shade] The proof of concept
has no stretch response ([fabric shader](/engineering/poc/fabric-shader.md)).

[^notes-shade]: Research notes: real-time fabric shading, Q3 inferences and gaps, Q4, Q13, Q15
[^notes-fab]: Research notes: fabrics and materials, Q4 and Q5 gaps
[^report]: Research report, PBR section
[^madypg]: MADYPG project page
[^rtstitch]: Huang et al. 2025 project page
[^u3m]: U3M 1.1 schema
[^style3d]: Style3D blog
