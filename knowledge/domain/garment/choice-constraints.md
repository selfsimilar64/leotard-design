---
type: Domain Concept
title: Constraints between design choices
description: "How leotard choices force or rule out each other: high neck forces keyhole and clasp, torso mesh forces lining, sleeve length changes crystal count, strap width and back openings meet rule limits, and ruleset choice restricts sleeves and lettering."
tags: [garment, constraints, coupling]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: styles
    resource: /references/research/leotard-styles-and-rules.md
    title: "Research notes: leotard styles and rules (bundle mirror)"
  - id: gk-special
    resource: https://www.gkelite.com/collections/gym-leotards-competition-special-order
    title: GK Elite special-order competition collection
    author: org:gk-elite
  - id: sylviap-cat
    resource: https://teamwear.sylviap.net/collections/2026-27-womens-competition-catalog
    title: Sylvia P 2026-27 women's competition catalogue
    author: org:sylvia-p
  - id: quatro-ls
    resource: https://us.quatrogymnastics.com/collections/long-sleeve-leotards
    title: Quatro US long sleeve leotards
    author: org:quatro
  - id: usag-rp
    resource: https://static.usagym.org/PDFs/Women/Rules/rp/rulespolicies.pdf
    title: USA Gymnastics 2026-2027 Rules & Policies
    author: org:usa-gymnastics
  - id: ncaa-rules
    resource: https://nawgj.org/wp-content/uploads/2026/08/2026-27_WomensGym-Rules-Mod-FINAL.pdf
    title: NCAA 2026-27 Women's Gymnastics Rules Modifications
    author: org:ncaa
  - id: fig-clothing
    resource: https://www.gymnastics.sport/publicdir/rules/files/en_Advertising%20Rules%20Competition%20Clothing%20-%20valid%20from%20May%202024.pdf
    title: FIG Rules for Competition Clothing and Advertising (valid from May 2024)
    author: org:fig
  - id: gk-sizing-set
    resource: https://gkelite.azureedge.net/images/static/sizecharts/gymnastics-sizing-set-reference-guide.pdf
    title: GK Elite sizing set reference guide (2015)
    author: org:gk-elite
  - id: snowflake-training
    resource: https://www.snowflakedesigns.com/gymnastics-leotards.html
    title: Snowflake Designs training leotards page
    author: org:snowflake-designs
---

# Takeaway

Leotard choices are not independent. The strongest coupling is **neckline → back → closure**: a
high, mock or halter-high neck cannot pass the head, so it forces a back opening (keyhole) and a
closure (back-neck hook clasp or invisible zip).[^styles][^gk-special] Other couplings come from
lining practice, crystal budgets, fabric stretch and the chosen rulebook. Items marked
**[INFERRED]** are the researchers' reasoning from catalogue patterns, not stated by a brand.

| If you choose | It forces or changes | Basis |
|---|---|---|
| High / mock / halter-high neck | A back keyhole (or other opening) plus a closure: hook clasp at back neck, or invisible centre-back zip | **[INFERRED]** from catalogue pattern: GK `High back with keyhole cutout and hook clasp closure`; Quatro `20mm back clasp` securing a high collar; Quatro Treille zip below a high neck[^gk-special][^quatro-ls][^styles] |
| Scoop, V or open back | No closure (pull-on) | [^styles] |
| Any mesh zone on the torso | A skin-tone lining layer behind it, in a chosen nude tone | Sylvia P, GK, Quatro practice[^sylviap-cat][^gk-special] |
| Light body colour | Lower back or whole back lined; GK suggests a separate liner | [^sylviap-cat][^gk-special] |
| Mesh sleeves | Normally unlined | [^sylviap-cat][^quatro-ls] |
| Sleeve length change | Crystal count changes (Sylvia P: about 340-390 fewer stones from full to three-quarter) | [^sylviap-cat] |
| Strappy back | Straps anchored at the back-neck clasp or armhole binding; spotting hazard | [^gk-special][^snowflake-training] |
| Open or deep back (USA Gymnastics) | Must stay within the backless limit or be filled with mesh / flesh-coloured fabric | [^usag-rp] |
| Thin straps (USA Gymnastics) | Spaghetti straps not allowed | [^usag-rp] |
| Primary fabric family | Different fit/sizing set (foil vs plain) | [^gk-sizing-set] |
| Ruleset NCAA | Sleeve must be long or sleeveless; names/numbers allowed | [^ncaa-rules] |
| Ruleset FIG | No athlete name, slogans or motivational words; emblem and logo area limits | [^fig-clothing] |

See [rule conflicts](/domain/rules/rule-conflicts.md) and
[geometric checks](/domain/rules/geometric-rule-checks.md).

**[INFERRED] for the software:** offer these as automatic consequences (e.g. picking a high neck
inserts a keyhole and clasp) rather than validation errors, and let the user override where brands
do (e.g. zip instead of clasp).

[^styles]: Research notes: leotard styles and rules, bundle mirror, sections 3-5 and 7.
[^gk-special]: GK special-order collection.
[^sylviap-cat]: Sylvia P 2026-27 catalogue.
[^quatro-ls]: Quatro US long sleeve leotards.
[^usag-rp]: USA Gymnastics 2026-2027 Rules & Policies, Ch. 2 B.4 p. 2.
[^ncaa-rules]: NCAA 2026-27 Rules Modifications, Rule 1.10.
[^fig-clothing]: FIG Rules for Competition Clothing and Advertising.
[^gk-sizing-set]: GK sizing set reference guide.
[^snowflake-training]: Snowflake Designs training leotards page.
