---
type: Catalog
title: UX pattern library
description: "Seventeen interaction patterns synthesised from games, configurators, painting and sculpting tools, each with its evidence, its leotard application and the role views it most concerns."
tags: [ux, patterns, roles]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-tools
    resource: /references/research/existing-tools-and-ux-mechanics.md
    title: "Research notes: existing tools and UX mechanics (section 6, UX pattern library)"
  - id: owner-platform
    resource: /decisions/2026-10-13-native-desktop-and-ipad-target.md
    title: Decision, native desktop and iPad target
---

# Takeaway

The pattern table is the research's synthesis across all sections; each row names the evidence it
rests on (follow the links for sources).[^notes-tools] The "Roles" column is this bundle's
**[INFERRED]** reading against the three views in the [product vision](/product/vision.md)
(C = coach, D = designer, S = seamstress output).

| # | Pattern | Evidence | Leotard application | Roles |
|---|---|---|---|---|
| 1 | Catalogue of high-level pieces, swapped in place | [Dressmaker](/engineering/ux/dressmaker-build-loop.md) parts; Expivi "only valid ones snap together" ([configurators](/domain/market/teamwear-configurators.md)) | Neckline, back style, sleeve, leg line, inserts as swappable pieces that always join validly | C, D (D authors) |
| 2 | Draw seam lines on the body to create panels | CLO 2026.0, MD 3D Pencil ([sketching panels](/engineering/ux/sketch-panels-on-body.md)) | Free-form panel design without a pattern window | D |
| 3 | Per-panel material assignment, instant preview | Dressmaker per-panel fabric; Sylvia P zones; Animal Crossing per-panel canvases | Click a panel, pick fabric/mesh/print; drag a material between panels | C, D |
| 4 | What you arrange is what you get | Dressmaker print and grain carry through | Print scale/rotation/offset per panel shown as cut | D, S |
| 5 | A free rearrangement stage | Dressmaker: "Rearranging costs nothing at this stage" | The whole session is non-committal | all |
| 6 | Single-stone click that slides on the surface | Nomad Insert (Instance); Blender Drag Dot / Anchored | Click to drop, drag to slide, release | D |
| 7 | Spacing brush | Blender Space + Jitter | Evenly spaced rows; optional jitter scatter | D (C?) |
| 8 | Editable path of stones | Painter 3D paths; Blender Curve; Nomad Curve Repeater | Draw a curve; edit it later, stones re-flow | D |
| 9 | Area fill with pattern choice | Hotfix Era uniform/hexagonal/flexible ([rhinestone software](/domain/market/rhinestone-layout-software.md)); Painter filled paths | Outline region; choose pattern, density, stone size | D |
| 10 | Mirror symmetry as a parent | Nomad mirror repeater; CLO mirror-paste breakage | Live left/right symmetry on by default, correct orientation | D |
| 11 | Non-destructive, recomputable strokes | Painter recorded strokes ([procedural strokes](/engineering/ux/procedural-stone-strokes.md)) | Change stroke size/colour/spacing after the fact | D, C (exposed parameters) |
| 12 | Automatic overlap handling | Hotfix Era "Solve overlap" | Stones never overlap or cross seams unless forced | D, S |
| 13 | Live counts and cost band | Sylvia P crystal tiers ([price bands](/domain/market/price-bands.md)); Dressmaker budget bars | Running stone count by size/colour, indicative price tier | C, D, S |
| 14 | Lighting and photo studio | Dressmaker photo studio; Procreate Lighting Studio; Painter viewport | Arena-style lighting presets; one-click presentation shots | C, D |
| 15 | Share link and remix | Sylvia P "Copy Link"; Animal Crossing; Sims Gallery | Send a design; duplicate and vary | Deprioritised: share-by-link is not a priority[^owner-platform] |
| 16 | Start from a brief or template | Dressmaker commission card; configurator templates; Quatro price-point fitting | Start from team colours, budget band, base style; never a blank screen | C |
| 17 | Assist toggles for tedious precision | Dressmaker Sewing Assist; AutoSew mod | Snapping, auto-spacing, auto-symmetry on by default, each switchable | D |

# Cross-cutting rules

- **Direct manipulation alone is not enough for crystals**; see
  [single-stone versus brush](/engineering/ux/direct-manipulation-and-bulk-placement.md).[^notes-tools]
- **Presets first, parameters second**: Resnick's well-chosen parameters, the Sims 4 swatch
  decision and configurators' locked palettes all point to curated fabric and crystal palettes as
  the default with full control underneath ([principles](/engineering/ux/creativity-tool-principles.md)).[^notes-tools]
- **Live read-outs instead of after-the-fact scores**: crystal count, estimated price tier (and,
  once [un-deferred](/decisions/2026-10-13-defer-competition-rules-and-pain-points.md), rule
  compliance) shown while designing.[^notes-tools]

[^notes-tools]: Research notes, existing tools and UX mechanics, section 6
[^owner-platform]: Decision, native desktop and iPad target
