---
type: Domain Concept
title: Fit failures in wear
description: "How leotards fail on a moving body according to reviews and swimwear fit guides (seat ride-up, tight armholes, straps digging or slipping, leg line migrating, floating neckline) with the stated cause and pattern correction; torso length is the most-named root cause."
tags: [construction, fit, ride-up, armhole, torso, reviews, validation]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-05T12:00:00Z }
sources:
  - id: ellie-mac
    resource: https://ellieandmac.com/blogs/blog/full-bum-adjustment-do-i-need-it-how-to-perform-one
    title: Ellie and Mac, full bum adjustment
    author: org:ellie-and-mac
  - id: splash
    resource: https://splashswimwear.com.au/pages/why-does-my-one-piece-ride-up-give-me-a-wedgie
    title: Splash Swimwear, why a one-piece rides up
    author: org:splash-swimwear
  - id: beach2ocean
    resource: https://beach2ocean.com
    title: Beach2Ocean one-piece fit guide (2026-01-07)
    author: org:beach2ocean
  - id: jalie-sizing
    resource: https://jalie.com/blog/tutorial-sizing
    title: Jalie sizing tutorial (torso adjustment)
    author: org:jalie
  - id: reviews-2026-11-05
    resource: "Dick's Sporting Goods GK reviews, Jalie KATE 3901 review, Chalk Bucket forum search snippets; read 2026-11-05"
    title: Retailer and forum reviews of gymnastics leotards
---

# Takeaway

**Most wear failures trace back to torso length (the vertical fit), not girth.** A torso that is
too short pulls the back leg into the seat and loads the straps; one that is too long lets the
neckline float and the straps slip.[^splash][^beach2ocean][^jalie-sizing] These are the failures our
3D fit cannot feel but can partly show as strain, so they are a checklist for drafted blocks.
Evidence is reviews and swimwear guides, low to medium confidence. **[UNVERIFIED]** for any single row.

| Failure | Stated cause | Pattern correction | Sources |
|---|---|---|---|
| Seat rides up | Torso too short; high ("French") back leg cut, noted for GK competition cuts; seat too small; or leotard too big so leg openings creep | Long-torso size, or lengthen torso by half the difference on front and back at the waist; full-seat adjustment: slash across the back at the fullest seat, hinge at centre back, spread 0.5-1 in (13-25 mm), re-true the crotch; fuller back leg curve | [^splash][^ellie-mac][^jalie-sizing][^reviews-2026-11-05] |
| Armhole tight, underarm cuts in | Armhole too high or small; brand cut (GK "tight shoulders", Plum "tight around the armpit"; Jalie KATE "armholes ran high") | Lower the underarm point rather than enlarging the whole armhole; Jalie advises sizing up rather than altering armholes | [^reviews-2026-11-05][^jalie-sizing] |
| Straps dig in | Torso too short or bust too small, straps carry the vertical tension | Lengthen torso; wider straps | [^beach2ocean] |
| Straps slip or twist, armhole gapes | Torso too long or garment too big | Shorten torso or straps; size down | [^beach2ocean] |
| Leg line migrates | Weak leg elastic | Firmer elastic (see [edge finishing](/domain/construction/edge-finishing-elastic-and-binding.md)) | [^beach2ocean] |
| Neckline floats | Torso too long | Shorten torso | [^beach2ocean] |
| Seams tear | Garment too small | Size up | [^reviews-2026-11-05] |

Brand fit notes from reviews: GK "at least one size up"; Plum one size up from GK.[^reviews-2026-11-05]

# Implications **[INFERRED]**

- Check every drafted block's torso length against the [yardsticks](/domain/construction/real-leotard-yardsticks.md) first.
- The fit solver could flag high vertical strain at the shoulders and the back leg as a ride-up
  risk, and armhole strain at the underarm; whether to show such flags is an owner decision.
- See also [leg cut and seat](/domain/garment/leg-cut-and-seat.md) and [comfort pressure](/domain/construction/clothing-pressure-comfort.md).

[^ellie-mac]: Ellie and Mac, full bum adjustment.
[^splash]: Splash Swimwear, why a one-piece rides up.
[^beach2ocean]: Beach2Ocean fit guide.
[^jalie-sizing]: Jalie sizing tutorial.
[^reviews-2026-11-05]: Retailer and forum reviews, read 2026-11-05.
