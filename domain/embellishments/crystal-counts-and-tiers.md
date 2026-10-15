---
type: Domain Concept
title: Crystal count as tier and price signal
description: "Crystal count is the clearest measure of a leotard's tier: US Olympic leotards went from 184 crystals (2008) to 6,359-10,000+ (2024); club leotards are sold in tiers of about 20, 640, 1,150 and 1,775+ crystals; proposed tier vocabulary for the app's count budget."
tags: [crystal, count, tier, price, market]
stale_after: 2027-10-15T00:00:00Z
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: ecs
    resource: /references/research/embellishments-crystals-sequins.md
    title: "Research notes: embellishments, crystals and sequins"
    author: claude-code/claude-opus-5-5
  - id: report
    resource: /references/research/research-report.md
    title: "Research report: Borrow the engine, build the sparkle"
    author: claude-code/claude-opus-5-5
  - id: ajc
    resource: https://www.ajc.com/news/the-news/p6zoageggen8SakMQLoxAJ/
    title: Atlanta Journal-Constitution, 18 Aug 2016
    author: org:ajc
  - id: jewelryjudge
    resource: https://jewelryjudge.thejewelerblog.com/u_s__gymnastics_team_leotards_radiate_with_4_000_swarovski_crystals.html
    title: Jewelry Judge blog, 17 Aug 2016
    author: org:jewelry-judge
  - id: mentalfloss
    resource: https://www.mentalfloss.com/sports/olympics/how-much-do-olympic-gymnastics-uniforms-cost
    title: Mental Floss, 11 Aug 2016
    author: org:mental-floss
  - id: nbcphl
    resource: https://www.nbcsportsphiladelphia.com/tokyo-olympics/inside-the-creation-of-simone-biles-goat-leotard/186340/
    title: NBC Sports Philadelphia, Tokyo cycle
    author: org:nbc
  - id: people
    resource: https://sg.news.yahoo.com/team-usa-gymnastics-goes-big-154156319.html
    title: People via Yahoo, Jul 2024
    author: org:people
  - id: usag-2024
    resource: https://usagym.org/a-fusion-of-fashion-performance-and-patriotism-gk-elite-and-usa-gymnastics-unveil-leotards-and-apparel-for-summer-olympics/
    title: USA Gymnastics, 10 Jul 2024
    author: org:usa-gymnastics
  - id: today
    resource: https://www.today.com/today/amp/rcna161080
    title: TODAY, 10 Jul 2024
    author: org:today
  - id: nbcdfw
    resource: https://nbcdfw.com/paris-2024-summer-olympics/us-womens-gymnastics-unveil-swarovski-crystals-covered-leotards/3603944
    title: NBC DFW, Jul 2024
    author: org:nbc
  - id: marieclaire
    resource: https://www.marieclaire.com/fashion/team-usa-olympic-gymnastics-leotards-swarovski-crystals/
    title: Marie Claire, Jul 2024
    author: org:marie-claire
  - id: sylviap-nia
    resource: https://www.sylviap.com.au/products/nia-dennis-leotard-3q-sleeve
    title: Sylvia P, Nia Dennis leotard (prices)
    author: org:sylvia-p
  - id: sylviap-riley
    resource: https://www.sylviap.com.au/products/riley-mccusker-leotard-3q-sleeve
    title: Sylvia P, Riley McCusker leotard
    author: org:sylvia-p
---

# Takeaway

**Crystal count is the clearest measure of a leotard's tier and price.**[^report] A live stone count
by size and colour, with a price band, is one of the most useful read-outs the software can show.[^report]
Prices here are time-sensitive (`stale_after` set); loose-stone prices are in
[stone and leotard prices](/domain/embellishments/stone-and-leotard-prices.md).

# US Olympic leotards (GK Elite, women)

| Games | Crystals per leotard | Notes |
|---|---|---|
| 2008 | 184 | Mostly hand-placed[^ajc][^ecs] |
| 2012 | 1,188 | [^ajc] |
| 2016 | 3,500–5,000 (another report: 4,000 for the team leotard) | Team-final leotard ≈US$1,200; eight competition leotards per athlete at US$700–1,200 depending on crystals; twelve practice leotards at US$60–200[^ajc][^jewelryjudge][^mentalfloss] |
| Tokyo (2020/21) | 7,600 on the July-4th leotard; NYT via People "just over 6,000" | [^nbcphl][^people] |
| Paris 2024 | 6,359 ("Star Spangled Shine", six colours, would retail ≈US$3,000) to >10,000 ("Luminous Legacy"); >47,000 across eight designs; "Freedom's Grace" ≈1,000 hand-placed pearls | Weigh about a pound because of the crystals[^usag-2024][^today][^nbcdfw][^people] |

Quotes: "The more crystals, the more impact, the more the leotards are talked about" (Jeanne Diaz);[^people]
athletes "love crystals—the more crystals, the better".[^marieclaire] Paris 2024 is the most recent
Olympic data; no 2025/2026 Worlds counts and no LA 2028 leotards found.[^ecs]

# Club/team tiers (Sylvia P, AUD)

"Nia Dennis" long-sleeve:[^sylviap-nia]

| Tier | Crystals | Standard | Swarovski |
|---|---|---|---|
| Logo Only | ≈20 Standard | $224.80 | – |
| Light | 640+ | $322.60 | $358.20 |
| Heavy | 1,156+ | $424.80 | $491.30 |
| Showpiece | 1,775+ | $492.50 | $595.50 |

**[UNVERIFIED]** (search summary) "Riley McCusker" Showpiece: 3,161+ crystals, AU$751.20 Standard /
AU$925.20 Swarovski.[^sylviap-riley]

**[INFERRED]** Marginal price to the customer ≈ AU$0.11–0.20 per added Standard crystal; Swarovski
upcharge ≈ AU$0.056–0.058 per stone — good defaults for a live price estimate.[^ecs]

# Proposed tier vocabulary for the app's count budget

**[INFERRED]**:[^ecs]

| Tier | Stones |
|---|---|
| Logo / accent | tens |
| Light | ≈500–700 |
| Heavy | ≈1,000–1,300 |
| Showpiece | ≈1,800–3,200 |
| Elite / Olympic | 5,000–10,000+ |

No sourced counts exist for recreational, compulsory, optional or NCAA leotards (NCAA coverage
describes layouts but never counts).[^ecs] Rendering scale implications:
[stone instancing at scale](/engineering/rendering/sparkle/stone-instancing-at-scale.md).

[^ecs]: Research notes: embellishments, crystals and sequins, section 8 (in-bundle mirror)
[^report]: Research report, crystals section (in-bundle mirror)
[^ajc]: Atlanta Journal-Constitution, 18 Aug 2016
[^jewelryjudge]: Jewelry Judge blog, 17 Aug 2016
[^mentalfloss]: Mental Floss, 11 Aug 2016
[^nbcphl]: NBC Sports Philadelphia
[^people]: People via Yahoo, Jul 2024
[^usag-2024]: USA Gymnastics, 10 Jul 2024
[^today]: TODAY, 10 Jul 2024
[^nbcdfw]: NBC DFW, Jul 2024
[^marieclaire]: Marie Claire, Jul 2024
[^sylviap-nia]: Sylvia P, Nia Dennis leotard (maker's page)
[^sylviap-riley]: Sylvia P, Riley McCusker (search summary only)
