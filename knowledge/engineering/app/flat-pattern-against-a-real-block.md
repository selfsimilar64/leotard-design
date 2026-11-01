---
type: Technique
title: The app's flat pattern against a real block
description: "Measured on 2026-11-01: the young body is nearest block size XS. Total trunk length matches, but the app's flattened pieces follow body bumps, shift the shoulder seam, have a much shorter sleeve with a lower sleeve head, and one uniform ease that is too tight at the waist and too loose at bust and hip."
tags: [pattern, flattening, ease, exploration, measurement]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-01T22:00:00Z }
sources:
  - id: block
    resource: /domain/construction/basicpatternblock-leotard-block.md
    title: The purchased leotard block
  - id: scripts
    resource: "pipeline/extract_block.py, pipeline/compare_block.py; capture app/captures/block-compare-{standard,high}.json, app 1818faf"
    title: Extraction and comparison scripts
  - id: plan
    resource: /product/roadmap/flat-and-3d-exploration-plan.md
    title: Flat and 3D exploration plan
---

# Takeaway

The gap is large enough to justify [stage 3](/product/roadmap/flat-and-3d-exploration-plan.md): better ease
numbers alone would not close it. Flat area and trunk length are close, but the shapes differ: a real
block's lines are smooth, while the app's copy every body bump into the cut piece.[^scripts]

# Method

Design: `block.apply` with crew neck and back, long sleeves, set-in armhole, on the `young` body in A-pose.
`app.pattern` was captured with no ease and with the default ease, no seam allowance, and compared with
block XS, half pieces with the centre at x = 0 and the crotch at y = 0. App pieces were halved at their
bounding box centre. The `high` leg was compared with `HIGH HIPS`, the closest pair. Run in a test tab on
port 5176, never the owner's tab.

Limits: necklines differ, so centre lengths and areas include that; the app's "standard" leg is much higher
than the block's `THIGH`, so it is not like for like. Body girths use the convex hull of a level slice of the
A-pose rest mesh, like a tape, with bust only approximate because the arms sit close.

# Nearest size

| Body | Stature | Bust | Waist | Hip | Nearest block size |
|---|---|---|---|---|---|
| `young` | 161 cm | about 87 | 66.6 | 90.5 | **XS** (83, 65, 90), bust nearer S (88) |
| `adult` | 164 cm | about 86 | 64.7 | 92 | XS |
| `older-teen` | 160 cm | about 86 | 68.6 | 87.8 | XS |
| `teen` | 155 cm | about 82 | 66.5 | 83.8 | XXS to XS, below the block's stated height |
| `child`, `child-6` | 133, 117 cm | about 68, 59 | 56.8, 52.8 | 70, 63 | **None: smaller than XXS** (79, 61, 86) |

# Differences (block XS with `HIGH HIPS` leg)

| Measure, mm | Block | App, no ease | App, default ease |
|---|---|---|---|
| Centre front + centre back | 1339 | 1337 | 1269 (-5%) |
| Centre front / centre back alone | 612 / 727 | 662 / 675 | 628 / 641 |
| Circumference at underarm | 714 | 832 | 750 (+5%) |
| Circumference at waist | 612 | 644 | 580 (-5%) |
| Half front + back area, mm2 | 188,622 | 206,082 | 176,214 (-7%) |
| Sleeve length | 557 | 480 | 456 (-18%) |
| Sleeve wrist / bicep | 168 / 263 | 152 / 271 | 137 / 244 |
| Sleeve area, mm2 | 111,547 | 99,234 | 84,845 (-24%) |

Block against body: waist -8%, hip -14%, underarm against bust about -18%. The default ease is -10% everywhere.

# What the differences mean **[INFERRED]**

1. **Body bumps in the outline.** The app's side seams and sleeve edges wobble where the body does; the block's
   are smooth. A flattened surface records anatomy, while a pattern relies on stretch to meet it.
2. **Ease varies.** A real block takes more from bust and hip than waist, and on this body nothing from trunk
   length, since the block's length equals the body's with no reduction. The app's along-grain -5% then cuts it short.
3. **Seam placement.** The app's shoulder seam sits further back than the block's, so front is long and back short,
   with the same total. Its armhole also has a different shape.
4. **The sleeve differs most.** The block's sleeve head rises far higher than the app's, and the block's sleeve
   is 16% longer than the app's with no ease, 22% with default ease.
5. **Child bodies are out of range.** This block cannot be ground truth for them, so grading rules or another block
   are needed there. Children are a main audience for gymnastics.

# Consequence

Stage 3 starts from block XS on the `young` body. The first check there is whether the block's taller sleeve
head and smoother side seams land where the sketch puts them, since an A-pose body may not show it fairly.

[^scripts]: Extraction and comparison scripts
