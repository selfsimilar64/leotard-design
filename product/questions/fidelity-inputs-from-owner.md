---
type: Open Question
title: "What could the owner provide to raise fidelity?"
description: "Ranked list of real-world inputs (swatch photo sets, stone grids, a studio lighting capture, artwork files, real patterns, matched photo sets, body measurements) that would replace guessed rendering and shape parameters with measured ones."
tags: [question, fidelity, calibration, inputs]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-18T18:40:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-18 (Claude Code session)
    title: "Question: what could I provide to bring fidelity to the next level?"
    author: human:mattj
  - id: calib
    resource: /engineering/rendering/fabric-shading/calibration-against-swatches.md
    title: Calibrating fabric materials against physical swatches
  - id: sparkval
    resource: /engineering/rendering/sparkle/sparkle-validation.md
    title: Validating sparkle by statistics
  - id: gaps
    resource: /domain/fabrics/fabric-data-gaps.md
    title: Fabric data nobody publishes
  - id: embgaps
    resource: /domain/embellishments/embellishment-data-gaps.md
    title: Embellishment data gaps
---

# Question

The owner asked what they could provide to take the app's fidelity further.[^owner] Every fabric,
stone and lighting parameter today is an unmeasured guess,[^gaps][^embgaps] so the answer is
measured inputs, ranked by how much each moves the result.

# Ranked inputs **[INFERRED]**

| # | Input | What it unlocks | Effort for the owner |
|---|---|---|---|
| 1 | **Swatch photo sets** for the maker's real fabrics (mystique in 3-4 colours, each hologram type, mesh in nude/black/tinted, lace, velvet, wet look, matte, foil): flat under even light with a colour checker, one small-lamp raking shot, a short video turning the swatch under one lamp, backlit for mesh and lace, one shot stretched ~30%[^calib] | Calibrated fabric presets, real dot pitch and mesh openness, real lace textures | 1-2 hours with a phone and a lamp |
| 2 | **Stone grids**: a strip of each size (ss6-ss30) in clear, AB and 2-3 colours, plus spangles and pearls, photographed the same way[^sparkval] | Calibrated crystal brightness, AB colour, sparkle statistics | 30 minutes |
| 3 | **The studio setup** the maker photographs leotards in: a phone photo of the lights from the model's position and a 360 photo (or chrome-ball photo) from the same spot | A matching virtual studio, so renders and catalogue photos agree | 15 minutes |
| 4 | **Matched photo sets** of 3-5 real leotards: front, back, side and close-ups in that studio, ideally on a dress form | Ground truth for side-by-side scoring and rehearsal before the test | 1 hour |
| 5 | **Artwork files**: lace scans, sublimation prints, logos and lettering as SVG/PNG | Exact prints and motifs instead of look-alikes | Export from existing files |
| 6 | **Two or three real pattern sets** (PDF or DXF) with the fabrics they were cut from | Validates panel shapes, negative ease and the flat-pattern output | Export from existing files |
| 7 | **The maker's palettes**: fabric colour cards and the stone colours actually stocked | Curated swatch palettes in the UI | Existing catalogue |
| 8 | **Body reference**: the dress form or size chart the maker grades on, or a phone 3D scan of a dress form | Mannequins that match their fit model | 30 minutes |

# Recommendation

Items 1-4 first: they change what every render looks like and give the test a fair, measurable
comparison. Items 5-8 matter for production accuracy more than for appearance.

# Answer

Open.

[^owner]: Product owner, 2026-10-18
[^calib]: Calibrating fabric materials against physical swatches
[^sparkval]: Validating sparkle by statistics
[^gaps]: Fabric data gaps
[^embgaps]: Embellishment data gaps
