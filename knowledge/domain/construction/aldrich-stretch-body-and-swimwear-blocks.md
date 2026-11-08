---
type: Process
title: Aldrich's stretch body, bodyshaper and swimwear blocks
description: "What Aldrich's Women's Wear (5th ed., 2008) teaches for close-fitting stretch: a metric, measurement-driven leotard-shaped block (bodyshaper and swimwear) with fixed-centimetre reductions that work out to about 16-21% at the bust, 5-7% at the waist and 11-15% at the low waist, no length reduction, an ease ladder from negative to +4 cm, point grade rules, and a fault-to-correction table; restated in our own words with implied percentages."
tags: [construction, patternmaking, block, drafting, stretch, swimwear, negative-ease, grading, aldrich]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-07T23:30:00Z }
sources:
  - id: aldrich-women
    resource: "Winifred Aldrich, Metric Pattern Cutting for Women's Wear, 5th ed. (Blackwell, 2008), ISBN 9781405175678; owner's PDF assets/Metric Pattern Cutting for Women's Wear.pdf (git-ignored), PDF page = printed page + 3"
    title: Aldrich, Metric Pattern Cutting for Women's Wear (5th ed.)
    author: human:winifred-aldrich
  - id: calc
    resource: "Percentages computed by claude-code on 2026-11-07 from the drafts' centimetre offsets and the book's XS-XL chart (p. 12); arithmetic only"
    title: Implied reductions, our arithmetic
  - id: ref
    resource: /engineering/app/drafted-blocks.md
    title: Drafted blocks (REF reductions)
  - id: yard
    resource: /domain/construction/real-leotard-yardsticks.md
    title: Yardsticks from real leotards
---

# Takeaway

**Aldrich's chapter 11 contains a true leotard-shaped block: the "bodyshaper" and its tighter
variant, "swimwear: basic shape".** Both are drafted flat (front and back from one draft, differing
only at neck and leg) from seven tape measures, in centimetres, by numbered points. Stretch is
taken out as **fixed centimetre offsets**, not percentages.[^aldrich-women] Worked through the
book's own size chart, the swimwear block takes about **16-21% off the bust, 5-7% off the waist and
11-15% off the low waist, and nothing off the length**.[^calc] The bust figure agrees with our
drafter's reduction (16.6%, taken from the purchased block)[^ref] and the low end of GK resale
measurements (16-27%);[^yard] the zero length reduction does not (GK resale suggests 8-24%).

The owner's PDF is the **5th edition (2008)**; its stretch chapter is ch. 11 (pp. 163-170), not the
6th edition's ch. 13 that the [texts note](/domain/construction/patternmaking-texts-for-stretch.md)
listed. Diagrams are pictures in the PDF: read pp. 169-170 for the shapes.

# What the chapter contains (printed pages)

| Item | Pages | Use to us **[INFERRED]** |
|---|---|---|
| Close-fitting body block (top and sleeve), two stretch levels | 164-165 | Ease ladder; armhole raised for stretch |
| Leggings block, one piece with no side seam | 164-165 | Full-leg bodysuit (unitard) legs |
| Bodyshaper (long or short sleeve, sleeveless) with separate gusset | 168-169 | Long-sleeve leotard analogue |
| Swimwear basic shape (strap back, high leg) | 168, 170 | Closest to a competition leotard |
| Swimwear bra top; larger cup by slash and spread | 168, 170 | Front-only bust shaping |
| Grading by point rules | 171-176 | Size representation and export |
| Fitting faults and corrections | 177-190 | Fit diagnosis |
| CAD: parametric and made-to-measure | 203-205 | Confirms our parametric route |

# The blocks, restated

All three start from the same frame: centre back on the left, squared down from the nape. Size M
(bust 88, nape-waist 41, back width 34.4, neck 37, armscye depth 21, body rise 28) is the worked
example.[^aldrich-women]

**Close-fitting body block** (two levels; the second figure is for less stretchy jersey): waist at
nape-waist + 1 (+0.5); armhole raised 3 cm (1 cm) above the armscye depth; half back width less
2.5 (1); quarter bust less 3 (1); 3 (2) cm taken in at the side waist. Back and front identical
except the front neck. So the max-stretch block is 12 cm under the bust girth (about 14% at M),
the less-stretchy one 4 cm (about 5%).[^aldrich-women][^calc]

**Bodyshaper.** Waist line at nape-waist + 1; crotch line a full body rise below the waist (body
rise is taken seated, at the side). Armhole *lowered* 1.5 cm below armscye depth (a sleeve is set
in); half back width less 0.5; quarter bust less 1.5; side taken in 4.25 cm at the waist and 3 cm a
quarter of the rise below it. A separate gusset (CB fold) hangs below the crotch line, about an
eighth of the bust deep. Back leg curved out 0.5 cm, front leg in 1.75 cm. Sleeveless variant: cut
the armhole 2.5 cm in at the underarm and 4.5 cm at the shoulder.[^aldrich-women]

**Swimwear basic shape.** As the bodyshaper to the neck; then half back width less 4.5 (a strap,
not a shoulder); quarter bust less 4; side in 2 cm at the waist and 0.5 cm at the high hip. The
front leg rises to about a sixteenth of the bust (about 6 cm) above the crotch line with a crotch
half-width of 3.5 cm; the front carries the crotch about 6 cm past the crotch line, where it meets
the back; the back seat is curved out 0.5 cm and its bottom lowered 0.5 cm.[^aldrich-women] So
the swimwear block is cut **under the bust by 16 cm at every size**, and its waist and hip are
placed from the bust line, not from the body's own waist or hip.

**Bra top** (front only): mirror the front, swing a 10 cm dart from a point below the armhole,
close it in the cup's top section; larger cups add width through the lower cup by slash and spread
(example 1.5 cm) and open the dart by that plus 1 cm, keeping the two cup edges equal.[^aldrich-women]

# Implied reductions across sizes

Our arithmetic from the drafts and the XS-XL chart (bust, waist, low waist 6 cm below the
waist).[^calc]

| Size | Swim bust | Swim waist | Swim low waist | Bodyshaper bust | Bodyshaper waist | Close-fit max / less, bust |
|---|---|---|---|---|---|---|
| XS (76/56/68) | 21.1% | 7.1% | 14.7% | 7.9% | 5.4% | 15.8% / 5.3% |
| M (88/68/80) | 18.2% | 5.9% | 12.5% | 6.8% | 4.4% | 13.6% / 4.5% |
| XL (100/80/92) | 16.0% | 5.0% | 10.9% | 6.0% | 3.7% | 12.0% / 4.0% |

Three consequences **[INFERRED]**:

- **Fixed centimetres mean a smaller body is reduced more.** Laplace's law argues the opposite
  (smaller radius, less reduction for the same pressure; see
  [negative ease](/domain/construction/negative-ease.md)). The two models disagree most at child sizes.
- **Waist and hip follow the bust**, so a body whose waist-to-bust ratio departs from the chart's
  gets a different waist reduction. Our drafter reduces each girth from its own measure.
- **Length is not reduced** beyond the 1 cm the waist line is dropped. Whether this is right for
  four-way competition fabric is exactly what the [yardsticks](/domain/construction/real-leotard-yardsticks.md)
  must settle.

# Ease ladder (ch. 10-11)

One draft, several fits by bracketed figures: close-fitting stretch at minus 4 to minus 12 cm;
basic jersey at zero ease; easy tee at +2 cm; track suit at +4 cm. Jersey sleeves are drafted to a
separate, shorter "jersey sleeve length" (about 4 cm under the woven one).[^aldrich-women] For us
this is the fabric-class dimension: one block, a reduction per fabric class.

# Grading (ch. 12, 14)

A grade is an (x, y) shift per numbered point per size step, written in tenths of a millimetre,
x first; a zero rule marks points that do not move; the set of rules is copied between styles.
Manual practice: draft the smallest and largest sizes and step the rest off along lines through
corresponding points; nests are stacked on the armscye-depth line. Flat (stretch) blocks grade on
6 cm bust steps, e.g. 15 mm vertically at the hem per step.[^aldrich-women]

# Fitting faults (ch. 13)

Each fault has a visible symptom and a pattern operation, usually a slash at a named line and an
amount opened or overlapped, with the neighbouring seam re-trued so lengths still match. Examples:
upright or stooping figure (open or close across the front at bust or chest); square or sloping
shoulders (slash armhole to neck point, raise or lower the underarm to keep the armhole length);
back neck tight (widen the back neck, take the same off the outer shoulder); large buttocks or
abdomen (add length at centre back or front and at the crotch); sway back (shorten waist-to-hip at
centre back).[^aldrich-women] These are woven corrections; their stretch equivalents are untested.

# CAD (ch. 14, 2008)

Made-to-measure systems pick the nearest stored size, then apply a second layer of alteration rules
from the customer's measures; parametric systems define a pattern by dimensions and recompute it
when one changes. Aldrich reports 3D "wireframe" pattern generation succeeding for bras and some
athletic wear but unlikely for fashion.[^aldrich-women]

[^aldrich-women]: Aldrich, Women's Wear, 5th ed.: pp. 5-7, 149-176, 177-190, 203-205.
[^calc]: Implied reductions, our arithmetic.
[^ref]: Drafted blocks.
[^yard]: Yardsticks from real leotards.
