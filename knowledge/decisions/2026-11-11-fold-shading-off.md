---
type: Decision
title: Fold shading on fitted garments switched off
description: "Owner decision of 2026-11-11: the fold waves the fabric shader paints from the fit's squeeze are off for fitted garments ('causing more issues than anything'); the arched back's seat was covered in ripples. Measured why: the posed mannequin's lower back shortens about 24% and its skin under the seat is pulled long, narrowed and in the cleft crushed, and knit pulled long only narrows, which the painting read as spare fabric. The code stays behind a fit option; real folds as geometry are the plan's shelved stage 2."
tags: [decision, fit, folds, shading]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-11T14:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-11 (Claude Code session)
    title: "The back arched seat view is just horrendous ... covered in ripples everywhere ... can we just turn off this ripple shading for now? Clearly it's causing more issues than anything."
    author: human:mattj
  - id: folds-cut
    resource: /decisions/2026-11-11-folds-cut-length-and-dressing.md
    title: Fewer painted folds, blocks cut 12% shorter, poses fitted from a standing fit
  - id: shelved
    resource: /decisions/2026-11-11-folds-as-geometry-shelved.md
    title: Folds as geometry (fit realism stage 2) shelved
---

# Decision

Fitted garments show no painted fold waves: `render/fitted.js` option `folds` (false; no control) writes zero into the fold slot
instead of `fit/folds.js foldsOf`'s or the file's folds.[^owner] Everything else stays: `foldsOf`, its twin `wrap_block.folds_of`,
the take-up and wavelength of [the earlier decision](/decisions/2026-11-11-folds-cut-length-and-dressing.md),[^folds-cut] the
shaders' fold branch (it draws nothing where the slot is zero). `setOptions({ folds: true })` brings them back.

# Context: why the arched back's seat rippled (measured 2026-11-11)

Hybrid high cut, `young`, 7 mm, 88% length, back arch against standing, back of the body within 15 cm of the midline, bands by
height above the crotch on the reference body:

| Band | Skin, standing to arch: vertical / area | Fabric: across / along its pattern | Fabric painted (least stretch under 0.88) |
|---|---|---|---|
| 0-6 cm (under the seat, the cleft) | 1.61 / 1.19; a tenth of faces crushed to 0.09 one way | 0.83 / 1.40 | 61% |
| 6-12 cm | 0.89 / 0.88 | 1.00 / 1.18 | 45% |
| 12-18 cm | 0.85 / 0.83 | 1.04 / 1.09 | 39% |
| 18-26 cm (small of the back) | 0.76 / 0.75 | 1.04 / 0.82 | 69% |

No triangle there is slack both ways. Three causes: the lower back really shortens (skin creases there in life too; a real leotard
bunches a little in a deep arch, as two or three soft folds); under the seat the posed mannequin's skin is pulled long and narrow and
partly crushed, so the fabric held on it follows; knit pulled long narrows without wrinkling, which the painting read as spare width.
Counting expected narrowing (least under 0.88 x s1^-0.5) cut the painted share at 6-18 cm from 39-45% to 25-27% and barely changed
the small of the back or under the seat.

# Consequences / how to apply

- Fitted garments are smooth everywhere; any fold must come from geometry. That is the plan's stage 2 (squeeze resistance, bending,
  `jam`), built and off by default since its shelving.[^shelved] Revisiting it: the posed mannequin's seat in the back arch (crushed
  skin in the cleft) would shape real folds too, so look at it first.
- The drawn garment's own shading is unchanged (its tension wrinkles are already off).

[^owner]: Conversation with the product owner, 2026-11-11.
[^folds-cut]: Decision of 2026-11-11: fewer painted folds, blocks cut 12% shorter, poses fitted from a standing fit.
[^shelved]: Decision of 2026-11-11: folds as geometry shelved.
