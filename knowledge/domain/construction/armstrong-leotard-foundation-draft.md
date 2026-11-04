---
type: Process
title: Armstrong leotard and bodysuit foundation drafts
description: "Joseph-Armstrong's textbook method for drafting a stretch leotard (and full bodysuit) foundation from a basic back bodice plus three to six body measurements; the candidate route to blocks the project owns outright."
tags: [construction, patternmaking, block, drafting, armstrong, measurements, negative-ease]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T01:00:00Z }
sources:
  - id: armstrong-ch29
    resource: "Helen Joseph-Armstrong, Patternmaking for Fashion Design, 5th ed. (Pearson/Prentice Hall, 2010), ch. 29 Activewear for Dance and Exercise, printed pp. 746-765 (owner's local PDF assets/, PDF pages 753-772)"
    title: "Patternmaking for Fashion Design 5/e, ch. 29"
    author: human:helen-joseph-armstrong
  - id: armstrong-ch2
    resource: "Helen Joseph-Armstrong, Patternmaking for Fashion Design, 5th ed., ch. 2-3 Form Measurements; Drafting the Basic Pattern Set, printed pp. 37-40, 46-49, 62 (PDF pages 44-47, 53-56, 69)"
    title: "Patternmaking for Fashion Design 5/e, measurement chart and basic bodice"
    author: human:helen-joseph-armstrong
  - id: armstrong-ch28
    resource: "Helen Joseph-Armstrong, Patternmaking for Fashion Design, 5th ed., ch. 28 Knit Top Foundations, printed pp. 737-743 (PDF pages 744-750)"
    title: "Patternmaking for Fashion Design 5/e, ch. 28"
    author: human:helen-joseph-armstrong
  - id: owner-2026-11-03
    resource: conversation with the product owner, 2026-11-03 (Claude Code session)
    title: Owner wants foundation blocks the app can ship; Etsy block licences forbid distribution
    author: human:mattj
---

# Takeaway

**Armstrong drafts the leotard foundation by arithmetic, not by eye: start from a basic back bodice,
then place the waist, side seam, crotch and leg line with a handful of body measurements and fixed
reductions for stretch.** Every step is a distance or a square-off from a named point, so the whole
draft can be written as a parametric function of the measurements.**[INFERRED]** A drafting method
can be followed freely, so blocks we draft this way are ours to ship, unlike the bought
[BasicPatternBlock block](/domain/construction/basicpatternblock-leotard-block.md), whose licence
forbids redistribution (see [sources of blocks](/domain/construction/sources-of-leotard-pattern-blocks.md)).[^owner-2026-11-03]

This note restates the method in our own words. Units are the book's inches (1 in = 25.4 mm).
Page numbers are the printed ones; the owner's PDF runs 7 pages ahead.

# The chain of drafts

The leotard is not drafted from scratch. It sits at the end of a chain:[^armstrong-ch29]

1. **Basic back bodice** (woven), drafted from the book's measurement chart (pp. 48-49, below). Either
   the dartless knit foundation or the torso foundation may stand in.
2. **Leotard foundation** (pp. 756-758), or **bodysuit foundation** (pp. 747-749) for the full-leg
   version, drafted from (1).
3. **Variations** traced off (2): all-in-one (no side seam), colour-blocked, raglan, tank (pp. 759-763).

Every step is now coded: `pipeline/draft_armstrong.py` (see *Our implementation*).

# Basic back bodice (pp. 48-49)

Centre back on the left, centre-back waist B at the origin. Chart numbers in brackets.[^armstrong-ch2]

| Step | What to do |
|---|---|
| Frame | A to B = back full length (6); A to C = across shoulder (14), square 3 in down from C; B to D = centre back length (5), square out 4 in; B to E = back arc (18) + ¾ in, square up from E. |
| Neck and shoulder | A to F = back neck (12) + ⅛ in. B to G = shoulder slope (7) + ⅛ in, G on the line down from C. F to H = shoulder length (13) + ½ in, through G (the extra ½ in is the shoulder dart). |
| Waist | B to I = dart placement (20); B to J = waist arc (19) + 1½ in dart + ¼ in ease; dart I to K 1½ in. J to M: square down 3/16 in. M to N = side length (11), N on the line up from E. |
| Armhole | D to S = a quarter of D to B; S to T = across back (16) + ¼ in. Armhole curved through H, T and N, level at N. |
| Neckline | A 3/8 in angle line in from the corner; curve from F through it to D. |

# Standard measurement chart, size 6 (p. 40, inches)

The leotard chain needs only these: back full length 16¾, back centre length 16¼, back shoulder slope
16 5/16, side length 8⅛, back neck 2⅝, shoulder length 5⅛, back across shoulder 7¾, across back 6¾,
back arc 8⅛, waist arc front 6½ / back 6⅛, front hip arc 8⅝, crotch length 24½. Bust 34, waist 25½,
hip 35½ (ease not included). Sleeve chart (p. 62): length 21½, cap height 5½.[^armstrong-ch2]

# Fabric assumed

Two-way or four-way stretch knits with 30-100% stretch and recovery (nylon or cotton with spandex
or latex). The base reductions below are for two-way stretch. For four-way "milliskin", take a
further 1½ in off each waist and hip arc.[^armstrong-ch29]

# Leotard foundation (pp. 756-758)

**Measurements:** front waist arc, front hip arc, crotch length (the book's chart numbers 19, 23 and
28). Front and back are drafted together on one outline and separated at the end. Centre front and
back are cut on the fold, so the centre carries no seam allowance; all other edges include 3/8 in
(about 10 mm).[^armstrong-ch29]

| Step | What to do |
|---|---|
| Centre line | Draw a vertical line. Lay the basic back bodice 3/8 in past it (this removes the centre allowance). Fold out any shoulder dart toward the armhole. Trace from the neck point (A) round the shoulder to the armhole (B). Mark the waist (C). |
| Raise the waist | Move C up 1½ in on the centre line. |
| Waist and side seam | C to D = front waist arc − ½ in. Raise the underarm: the side line from D ends 1 in above the old armpit B, on the old armhole, which is blended to it (the figure shows the old armhole dashed below; the text reads "1 inch past B"). Curve the front side seam slightly inward (about 3/16 in at its deepest). Drop the front neckline 1½ in below A. Measure and record the armhole. |
| Crotch length | C to E (down the centre) = half the crotch length − 1¼ in. |
| Hip line | Hip level F sits above E by half of E-C plus 1 in. From F square out F to G = front hip arc − ½ in. |
| Crotch width | From E square out 1¾ in to H (1/8 in less below size 10, 1/8 in more above size 12). Square up 3/8 in to fix I on the crotch end. |
| Leg guide | Halve F-G, and at the inner corner draw a 1⅜ in diagonal as a depth guide for the leg curve. |
| Front leg | Crossmark 3/8 in in from G and ½ in up; mark a point 2 in up the crotch end; draw the leg opening as a curve through these (it need not touch the diagonal). |
| Back leg | Draw a line through the crossmarks at G and I; at its midpoint square out 1 in to K; draw the back leg curve through K and the crossmarks. This gives the back its fuller seat. |
| Separate | Trace off the back outline; trim the front to the front neckline and front leg. On the back, straighten the side seam (remove its curve). A closer-fitting back copy takes in about ¼ in at the upper back, waist and seat. |
| Grain | Mark the direction of greatest stretch across the body (perpendicular to the centre line). |

**High-cut leg** (p. 758): take G at the midpoint of the side hip instead. Back: line from G to I,
crossmarks 3/8 in in from each, square out only ¼ in at the centre K, curve through. Front: one
inward curve from G to I. Check the crotch seams match with a 3/8 in seam.[^armstrong-ch29]

**Fitting** (p. 758): slash lines run the length (X) and across the waist (Y); spread or overlap
them to correct the fit. Check length from crotch to shoulder first. Pin out looseness, but not so
much that the fibres are over-stressed. If tight, spread in 3/8 in steps.[^armstrong-ch29]

# Bodysuit foundation, for comparison (pp. 747-749)

Same opening steps (back pattern laid ¼ in past the line, waist raised 1½ in, C to D = front waist arc
− ½ in, armhole lowered 1 in, neck dropped 1½ in), then:[^armstrong-ch29]

- **Crotch depth instead of crotch length:** C to E = crotch depth − 1¼ in; E to F = front hip arc − ½ in.
- **Crotch extension:** one third of E-F out from the crotch, curved to the hip.
- **Leg:** the centre of the leg is squared down from midway along the extension; waist to ankle − 3 in
  sets the ankle; the knee is halfway; half the knee and half the ankle girth, each plus ¼ in ease,
  are set out either side.
- Front and back legs are drafted on the same outline; the back crotch gets ¾ in more at its point.

# Stretch sleeve (p. 750)

Measurements: sleeve length (with ½ in hem), cap height, armhole, wrist + ¾ in. Sleeve length down
a fold; the biceps line at three quarters of the cap height; the elbow halfway between biceps and
wrist; the cap drawn from a line equal to the armhole measurement, divided in thirds; the wrist half
= half the wrist measurement + ½ in; an inward-curved underseam. Test fit and correct. In the knit-top
chapter the cap is set ½ in longer than the armhole in total.[^armstrong-ch29][^armstrong-ch28]

# Ease the method builds in **[INFERRED]**

- Each quarter arc loses ½ in at waist and hip, so about 2 in of negative ease round the body in
  two-way stretch, and about 8 in for four-way (the extra 1½ in per arc).
- The vertical loop loses 2 × 1¼ in = 2½ in through the crotch length, plus whatever the raised waist
  and lowered underarm change.
- These are fixed amounts, not percentages of the fabric's stretch. That differs from the
  percentage reductions in the [Watkins method](/domain/construction/watkins-stretch-reduction-method.md)
  and the project's [negative ease](/domain/construction/negative-ease.md) notes, and is worth
  checking against the bought block before relying on it for small children's sizes.

# Implications for the app **[INFERRED]**

- The draft is a short list of point placements, so it can be coded as a function from
  measurements to an outline, with the bought block used only as a private fit benchmark.
- Other sizes need Armstrong's measurement list mapped onto the size charts the app uses
  (see [/domain/sizing/](/domain/sizing/about.md)); sizes 8 and 10 are coded, children's are not in the book's chart.
- Shown in the app as a fitted garment: [fitted garments in the app](/engineering/app/fitted-garments-in-the-app.md).
- The book's curves ("draw a curved line through…") are freehand; we will need our own curve rule
  (e.g. a spline through the named points) and should record it as our own design.

# Our implementation (`pipeline/draft_armstrong.py`) **[INFERRED]**

Choices the book leaves open, made by us and open to correction:

- **Size 6 on the `young` body.** The chart's size 6 (bust 34 in / 86.4 cm, waist 64.8, hip 90.2) is the
  nearest size to `young` (86.4 / 66.7 / 88.4 cm), so the torso uses the chart, not the body.
- **Armhole raised, not lowered,** as read from p. 757 fig. 3 (above). Read first as lowered, it gave a
  low, wide underarm and a sleeve 36 cm round at the biceps.
- **Shoulder dart folded away:** the shoulder is kept at its own length (13), not 13 + ½ in.
- **Seams:** the book's leotard outline includes 3/8 in seams, so every edge but the fold is inset by
  3/8 in to give the stitching line the fit solver wants. Neck and leg are inset too (the elastic
  turned once takes about that much).
- **Curves:** the book draws by hand through its named points; ours are cubic curves through the
  same points, with the neck and armhole square to the shoulder. The front basic leg is drawn to pass
  1⅜ in from the corner along the book's guide line; the back leg through the 1 in (high cut ¼ in)
  point square to its chord.
- **Sleeve:** length = the chart's 21½ in scaled by the body's height against 66 in (the chart has no
  height; 66 in assumed for the missy form), less the ½ in hem; wrist = the body's wrist + ¾ in, as
  the measurement list asks; armhole measured on the drafted (cutting) line.

Result, size 6 (stitching lines, mm): armholes 144 each (the bought block 176-188), sleeve cap 291
(the two armholes 288), front centre 615, back centre 653 (bought 618 / 734), basic leg leaving the
side about 7 cm below the waist. The style is closer and higher-cut than the bought block.

[^armstrong-ch29]: Joseph-Armstrong, Patternmaking for Fashion Design 5/e, ch. 29.
[^armstrong-ch28]: Joseph-Armstrong, Patternmaking for Fashion Design 5/e, ch. 28.
[^armstrong-ch2]: Joseph-Armstrong, Patternmaking for Fashion Design 5/e, measurement chart and basic bodice.
[^owner-2026-11-03]: Conversation with the product owner, 2026-11-03.
