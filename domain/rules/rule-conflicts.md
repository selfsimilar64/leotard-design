---
type: Design Rule
title: Rule conflicts between FIG, USA Gymnastics and NCAA
description: "Where the three rulebooks disagree (names and slogans, sleeve lengths, back depth versus width) and the consequence that a design needs a ruleset setting and must satisfy the stricter limit when it targets more than one."
tags: [rules, conflicts, ruleset]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: styles
    resource: /references/research/leotard-styles-and-rules.md
    title: "Research notes: leotard styles and rules (bundle mirror)"
  - id: fig-clothing
    resource: https://www.gymnastics.sport/publicdir/rules/files/en_Advertising%20Rules%20Competition%20Clothing%20-%20valid%20from%20May%202024.pdf
    title: FIG Rules for Competition Clothing and Advertising
    author: org:fig
  - id: usag-rp
    resource: https://static.usagym.org/PDFs/Women/Rules/rp/rulespolicies.pdf
    title: USA Gymnastics 2026-2027 Rules & Policies
    author: org:usa-gymnastics
  - id: usag-elite
    resource: https://static.usagym.org/PDFs/Women/Rules/rp/rp_elite.pdf
    title: USA Gymnastics Elite Program Rules & Policies (FIG neckline rule)
    author: org:usa-gymnastics
  - id: ncaa-rules
    resource: https://nawgj.org/wp-content/uploads/2026/08/2026-27_WomensGym-Rules-Mod-FINAL.pdf
    title: NCAA 2026-27 Women's Gymnastics Rules Modifications
    author: org:ncaa
  - id: cgn-2026
    resource: https://collegegymnews.com/2026/05/06/4-leotard-trends-that-shaped-2026-and-whats-coming-in-2027/
    title: College Gym News, 4 leotard trends of 2026 (6 May 2026)
  - id: sylviap-us
    resource: https://teamwear.sylviap.net/collections/all
    title: Sylvia P Teamwear US storefront
    author: org:sylvia-p
---

# Takeaway

> Deferred: rule checking is out of scope since 2026-10-13
> ([decision](/decisions/2026-10-13-defer-competition-rules-and-pain-points.md)).

The three rulebooks conflict, so **a design made for one context can be illegal in another**. A
design tool would need a **ruleset setting per design** and, for a design targeting several
contexts, should apply the stricter limit of each **[INFERRED]**.[^styles]

| Topic | FIG | USA Gymnastics (Dev/Xcel) | NCAA | Consequence |
|---|---|---|---|---|
| Athlete names, words | Athlete name prohibited; no slogans or motivational words[^fig-clothing] | not addressed | Name and/or number allowed in a team-wide font; no nicknames or other words[^ncaa-rules] | NCAA designs with names (on collars, cuffs, backs[^cgn-2026]) are illegal at FIG events. NCAA's "no other words" also sits awkwardly with the slogans NCAA teams print[^cgn-2026] |
| Sleeve length | Any (sleeves optional) | Full-sleeve and sleeveless named | Long sleeve or sleeveless tank only[^ncaa-rules] | Three-quarter sleeve, 63% of US club listings,[^sylviap-us] is named by no rule text |
| Back limit | Back neckline no lower than the lower line of the shoulder blades[^usag-elite] | Opening may reach about 2 in below the bottom of the shoulder blade, but no wider than the shoulder blade's vertical midpoint; mesh fill exempts[^usag-rp] | Not stated | USA Gymnastics is slightly more permissive in depth than FIG but adds a width limit; a dual-use back satisfies both **[INFERRED]**[^styles] |
| Leg coverage | Unitard; leg coverings in the leotard's colour | Tights capri or longer, shorts; black, matching or skin tone | Shorts or leggings matching the uniform | Colour rules for overlays differ |
| Team identity | Identical leotards (unverified for 2025-2028); identical national identification | No uniformity rule found | Identical uniforms | – |
| Deduction | 0.30 / 1.00 **[UNVERIFIED]** | 0.20 after warning | 0.2 team or individual | – |

See [FIG](/domain/rules/fig-attire-rules.md),
[FIG advertising](/domain/rules/fig-advertising-and-identification.md),
[USA Gymnastics](/domain/rules/usa-gymnastics-attire-rules.md) and
[NCAA](/domain/rules/ncaa-attire-rules.md).

[^styles]: Research notes: leotard styles and rules, bundle mirror, section 9 (inferences).
[^fig-clothing]: FIG Rules for Competition Clothing and Advertising.
[^usag-rp]: USA Gymnastics 2026-2027 Rules & Policies, Ch. 2 B.4 p. 2.
[^usag-elite]: USA Gymnastics Elite Rules & Policies, Competition Rules 4.e.
[^ncaa-rules]: NCAA 2026-27 Rules Modifications, Rule 1.10.
[^cgn-2026]: College Gym News, 6 May 2026.
[^sylviap-us]: Sylvia P Teamwear US storefront.
