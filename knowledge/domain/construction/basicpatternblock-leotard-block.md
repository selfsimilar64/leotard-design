---
type: Domain Concept
title: The purchased leotard block (BasicPatternBlock 0005)
description: "What the block bought on 2026-11-01 contains and measures: an unlocked true-scale vector PDF with a layer per size, three pieces, two leg cuts and two sleeve lengths, seams that match within 0.5 mm, and negative ease that varies by height and size."
tags: [construction, pattern, block, ease, sizing]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-01T20:00:00Z }
sources:
  - id: files
    resource: "assets/patterns/basicpatternblock-leotard-0005/ (git-ignored, licensed files; A0, A4, US Letter, projector, booklet)"
    title: BasicPatternBlock leotard block files
    author: org:basicpatternblock
  - id: listing
    resource: https://www.etsy.com/listing/1767222709/leotard-sewing-pattern-block-bodysuit
    title: Editable leotard block listing
    author: org:basicpatternblock
  - id: terms
    resource: https://www.etsy.com/listing/921208567/women-leotard-sewing-pattern-block-knit
    title: Licence line on the PDF version's listing
    author: org:basicpatternblock
---

# Takeaway

The block is good machine-readable ground truth: unlocked, vector, true scale, a layer per size, and
its seams agree within 0.5 mm.[^files] Its ease is **not uniform**: size M is about 15% smaller than
the body at bust and hip but only 8% at the waist, where the app applies one flat reduction. It
assumes at least 75% stretch, more than the 50-60% gymnastics patterns state.

# Files

Keep the files out of git: the licence bars redistributing them.[^terms] Only measurements live here.

| File | Use |
|---|---|
| `A0-PRINT_BODYSUIT_0005.pdf` | **Source for extraction.** Two sheets of 810 x 1158 mm; layers `A0`, `XXS` to `6XL`. Rulers measure exactly 50.0 mm and 76.2 mm, so the scale is true. The sleeve runs across both sheets |
| `A4-PRINTLEOTARD_0005.pdf`, `US_LETTER_PRINT_BODYSUIT_0005.pdf` | Tiled home printing, same layers |
| `PROJECTOR_FILE_LEOTARD.pdf` | Projecting onto fabric; one 4584 x 3710 mm page |
| `Booklet_WOMENS_BODYSUIT_SEWING_PATTERN_BLOCK.pdf` | Size chart, fabric advice, sketches, seam allowance link |

All PDFs open without a password. Each drawn line is a separate path on its size's layer; A0 sizes
XS to 2XL and 4XL to 6XL draw each edge alone, stopping about 3 mm short of its corners, while XXS and
3XL draw each piece as one outline. `pipeline/extract_block.py` reads all eleven sizes the same way into
`assets/patterns/basicpatternblock-leotard-0005/derived/` (git-ignored), with corners placed within
about 1.5 mm. Short marks (under 3 mm) on the edges are notches: side and armhole on the back, for example.

# Pieces

- **Front**, cut 1 on fold; **Back**, cut 1 on fold; **Sleeve**, cut 2 mirrored, with a short-sleeve
  line. Side and shoulder seams, a crotch seam, no gusset and no waist seam.
- Two leg lines on each body piece, labelled `HIGH HIPS` (deep) and `THIGH` (shallow). The listing and
  booklet call them "hips cut" and "thigh cut"; the sketches pair the deep leg with the long sleeve.
- Grainlines run vertically. Sleeve cap marks say FRONT and BACK; no other notches were read.
- No seam allowance is included, so the outlines are sewing lines.

# Size M measurements (mm, one half of the body)

| Line | Front | Back | Check |
|---|---|---|---|
| Centre, neck to crotch | 630 | 750 | |
| Side seam | 436.5 | 436.8 | Match within 0.3 |
| Shoulder | 117.7 | 118.1 | Match within 0.4 |
| Neck | 111.6 | 63.6 | Whole neckline 350 |
| Armhole | 196.7 | 180.3 | 377 against a 393 sleeve cap: 16 mm of cap ease |
| Crotch | 25.6 | 25.6 | Match |
| `THIGH` leg | 196.8 | 224.2 | Whole opening 421 |
| `HIGH HIPS` leg | 276.2 | 305.7 | Whole opening 582 |

Sleeve: underarm 449 and 450, wrist 171, short-sleeve hem 282. The two sides of the sleeve differ by
about 1 mm at M and grow apart with size, to about 7 mm at 6XL, so a maker eases them together. A 190 mm
level line crosses the Front at the same height in every size, with no match on the Back; its purpose
is not stated.

# Ease against the size chart

Pattern circumference is twice front plus back width, compared with the chart.[^files] "Underarm" is
measured at the top of the side seam, not at the bust point, so it only approximates bust ease.
"Hip" is the widest point below the waist, at the `THIGH` leg end. "Trunk" compares centre front plus
centre back with the chart's girth (midpoint of its range).

| Size | Underarm | Waist | Hip | Trunk |
|---|---|---|---|---|
| XS | -14% | -6% | -14% | -8% |
| S | -14% | -7% | -14% | -7% |
| **M** | **-15%** | **-8%** | **-15%** | **-10%** |
| L | -15% | -8% | -15% | -11% |
| XL | -14% | -8% | -14% | -12% |
| 2XL | -15% | -10% | -15% | -13% |
| 4XL | -18% | -13% | -17% | -15% |
| 5XL | -19% | -15% | -18% | -16% |
| 6XL | -19% | -16% | -19% | -17% |

- **[INFERRED]** The block is built on one consistent reduction up to about 2XL. Above that the chart
  grows 7 cm a size where the pattern grows about 4.5 cm, so its fit there is less certain.
- The app's default (-10% across, -5% along the grain; [pattern pieces](/engineering/app/pattern-pieces-and-flattening.md))
  is milder than this block and uniform.
- The side seam stays near 435 mm at every size, while the chart gives one height range (160-170 cm).

# Things to watch

- The booklet asks for at least 75% stretch with 5-10% or more elastane. Jalie's gymnastics patterns
  state [50-60%](/domain/construction/sources-of-leotard-pattern-blocks.md), so a lower-stretch
  fabric may need a larger size. Some booklet text says "catsuit", copied from another block.
- The inch size chart disagrees with the centimetres (M hip: 38.5 in against 100 cm, which is 39.4 in).
  Use centimetres.
- Commercial use is allowed; whether shapes built into a shipped app count as redistribution is
  still [to be asked](/domain/construction/sources-of-leotard-pattern-blocks.md).[^terms]

[^files]: Measured from the A0 PDF's vector paths on 2026-11-01; booklet size chart pages 8-10.
[^terms]: "For personal and commercial use. Redistribution or resale of the files is not permitted."
