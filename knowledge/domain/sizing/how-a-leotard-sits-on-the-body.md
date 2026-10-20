---
type: Domain Concept
title: How a leotard sits on the body
description: "Where a competition leotard's leg line, neckline, armholes, seams and edges sit on the body, which limits are rules and which are inferred typical placements, and how taut fabric visibly behaves (bridging concavities, compression, edge grooves)."
tags: [sizing, fit, leg-line, neckline, appearance]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: fit
    resource: /references/research/mannequins-and-leotard-fit.md
    title: "Research notes: mannequins and leotard fit (bundle mirror)"
  - id: gymcastic
    resource: https://gymcastic.com/will-i-lose-my-gold-medal-because-of-my-leotard-uncovering-elite-gymnastics-rules/
    title: GymCastic summary of WAG Code attire rules
  - id: chalkbucket-regs
    resource: https://chalkbucket.com/threads/leotard-regulations.40056/latest
    title: Chalkbucket forum reproduction of leotard regulations (search snippet)
  - id: fig-aerobic
    resource: https://www.fig-aerobic.com/3-1-DRESS-CODE_a1591.html
    title: FIG Aerobic Code of Points 3.1 dress code
    author: org:fig
  - id: capezio
    resource: https://www.capezio.com/pages/shop-ballet-leg-line-black-leotards
    title: Capezio ballet leg-line leotards
    author: org:capezio
  - id: sewing-numbers
    resource: https://sewingwithnumbers.substack.com/p/how-to-draft-high-cut-briefs
    title: Sewing With Numbers, how to draft high-cut briefs
  - id: peekaboo
    resource: https://peekaboopatternshop.com/our-blog/how-to-sew-a-leotard
    title: Peekaboo Pattern Shop / mybluprint leotard tutorials (search summary)
---

# Takeaway

Rules set the outer limits: the **leg opening rises no higher than the hip bone** at the side (the
aerobic code says the outside line runs **through the iliac crest**); the **front neckline stops at
mid-sternum or higher**; the **back neckline at the lower edge of the shoulder blades or
higher**.[^gymcastic][^fig-aerobic] Inside those limits, **no source gives numeric placements for
girls' sizes**; the placements below are the researchers' inference from the rules and typical GK
competition garments.[^fit] Taut fabric spans hollows rather than following them.

# Rules and cut (sourced)

- WAG wording via secondary summaries: neckline no further than half the sternum and the lower line
  of the shoulder blades; leg cut not beyond the hip bone; straps at least 2 cm; sleeves optional;
  leg length at most 2 cm below the base of the buttocks.[^gymcastic][^chalkbucket-regs] The 2025-28
  text was not retrieved; treat strap and leg-length figures as **[UNVERIFIED]** (see
  [FIG rules](/domain/rules/fig-attire-rules.md)).
- FIG Aerobic: leg cut may not rise above waist height; outside seam passes through the crest of
  the ilium; crotch fully covered; same neckline limits.[^fig-aerobic]
- Ballet "leg line" cuts sit higher on the hip to lengthen the leg.[^capezio]
- Drafting a high-cut brief: side seams angle in toward the waist; side-seam length is measured on
  the body between the top edge and the leg top.[^sewing-numbers]
- Leotards are traced from a fitted suit; 1/2 in seam allowance at crotch, sides and shoulders,
  1/4 in at neck and leg openings, which are finished with elastic.[^peekaboo]

# Typical placements [INFERRED]

| Feature | Typical placement |
|---|---|
| Side leg line | Peaks at or just below the iliac crest; side seam (underarm → leg opening) about 45-55% of armpit-to-crotch, ≈ 9-12 cm adult, 6-8 cm at age 8 |
| Front leg line | Runs from the side peak down and inward, crossing the inguinal crease about 2-4 cm above where it meets the crotch |
| Gusset | 5-6 cm wide adult, 4 cm child |
| Back leg line ("full back") | From side peak down to the gluteal fold about one-third of the way in from the side; covers most of the gluteus, lower outer buttock exposed; dance "cheeky" cuts expose more |
| Front scoop | 8-12 cm below the suprasternal notch (adult), well above mid-sternum |
| High round neck (long-sleeve competition) | About 1-2 cm below the neck base |
| Back scoop | At or above mid-scapula |
| Tank armhole | About 2-3 cm below the axilla; strap/shoulder edge 3-5 cm wide |
| Long-sleeve armhole | Follows the natural armscye |
| Seams | Side seams (sometimes replaced by princess/panel seams), shoulder seams, crotch/gusset seam, centre-back seam on some styles, set-in sleeve seams |
| Edges | Elastic turned under and coverstitched, about 8-10 mm wide, or bound (about 1 cm) |

All from the mannequins research note, marked there as inferred.[^fit]

**In the app (2026-10-20):** the block library's `competition` leg cut puts the side peak about
2 cm under the hip bone (20 cm above the crotch on the reference body; the crest line taken as
1 cm under the navel, since the line across the iliac crests sits at about L4, at or just below the
navel **[INFERRED]**). The owner chose it "to be more in line with a typical competition cut";
`standard` (12.8 cm) and `high` (16 cm) remain for designs matched to photos with lower cuts.
B2 uses it; see [build status](/engineering/app/build-status.md). Default presets the POC
used: side peak at iliac-crest height minus 1 cm, a "moderate" preset at the midpoint between crest
and crotch, neck scoop 10 cm below the sternal notch (scaled by height for the child), back scoop at
mid-scapula, tank strap 4 cm.[^fit]

# Visual behaviour of taut fabric [INFERRED]

No source found; this is general practice:[^fit]

- Fabric **bridges concavities**: the inter-gluteal cleft, spine groove, navel, under-bust fold and
  the hollow between the breasts are spanned flat.
- Soft tissue is compressed about 2-5 mm (more at bust and buttock); the bust becomes a single
  rounded "uni-bust".
- Elastic edges sit 1-2 mm into the skin, with a slight skin bulge just outside leg and arm
  openings on adults (little on children).
- Almost no wrinkles except small tension lines from shoulder toward crotch and a few horizontal
  folds at the lower back when arched.

How this is reproduced in the renderer belongs in [/engineering/geometry/](/engineering/geometry/about.md).
See [stretch and ease](/domain/sizing/stretch-and-negative-ease.md) and
[leg cut and seat](/domain/garment/leg-cut-and-seat.md).

[^fit]: Research notes: mannequins and leotard fit, bundle mirror, section 4.
[^gymcastic]: GymCastic summary of WAG attire rules (secondary).
[^chalkbucket-regs]: Chalkbucket forum reproduction (search snippet).
[^fig-aerobic]: FIG Aerobic Code 3.1.
[^capezio]: Capezio.
[^sewing-numbers]: Sewing With Numbers.
[^peekaboo]: Leotard sewing tutorials (search summary).
