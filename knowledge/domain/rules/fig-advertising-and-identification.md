---
type: Design Rule
title: FIG clothing, emblem and advertising rules
description: "FIG Rules for Competition Clothing and Advertising (valid from May 2024): uniform-not-costume, permitted marks only, national identification at least 30 sq cm, one manufacturer logo up to 30 sq cm, advertising spaces of 90 or 130 sq cm, technology mark up to 10 sq cm, head coverings, enforcement."
tags: [rules, fig, advertising, emblem, logo]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: styles
    resource: /references/research/leotard-styles-and-rules.md
    title: "Research notes: leotard styles and rules (bundle mirror)"
  - id: fig-clothing
    resource: https://www.gymnastics.sport/publicdir/rules/files/en_Advertising%20Rules%20Competition%20Clothing%20-%20valid%20from%20May%202024.pdf
    title: FIG Rules for Competition Clothing and Advertising (valid from May 2024; appendix pages headed 2025-2028)
    author: org:fig
---

# Takeaway

> Deferred: rule checking is out of scope since 2026-10-13
> ([decision](/decisions/2026-10-13-defer-competition-rules-and-pain-points.md)).

FIG treats a leotard as a **sports uniform, not a costume**. Only five kinds of mark may appear:
national identification, the manufacturer's logo, product-technology identification, advertising
and the bib number. **No athlete name, no political slogans or signs, no motivational words or
logos, no war, violence, sexual or religious themes.**[^fig-clothing] Every mark has an area limit,
which makes these rules checkable as area measurements on the design.[^styles]

# Rules

| Item | Article | Rule |
|---|---|---|
| Design | Introduction | Compatible with a sports uniform, not a costume; only the permitted marks may appear; prohibited themes as above[^fig-clothing] |
| National identification | Art. 5 | Required: flag in official colours and/or country name (full or FIG three-letter code); **minimum total area 30 sq cm**; at least once, no maximum; placement free on a women's leotard or unitard; national emblem or crest may be added; uniform may be in national colours; athlete's name may not appear; identical for all team members; does not count as advertising[^fig-clothing] |
| Manufacturer's logo | Art. 4, Appendix D | **One per piece of clothing, maximum 30 sq cm**, ideally in its usual retail position (upper back allowed if that is retail placement); a unitard counts as one piece; irregular logos measured by their bounding rectangle[^fig-clothing] |
| Advertising | Art. 1.3, Art. 3 | At most **three** advertising spaces on the athlete, each a different sponsor. On the leotard/unitard: **two spaces up to 90 sq cm each** (background included) **at least 3 cm apart**, or **one space up to 130 sq cm**. On shorts or tights: one space up to 90 sq cm. Not integrated into the overall design (the leotard cannot be a billboard). Team members show the same sponsor[^fig-clothing] |
| Product technology mark | Art. 6 | One per garment, **maximum 10 sq cm**[^fig-clothing] |
| Head coverings | Appendix E | Permitted in all disciplines if tight-fitting, face fully exposed, no safety risk; same colour(s) as the leotard; attached, unattached or part of the leotard; no advertising, country mark, technology mark or logo[^fig-clothing] |
| Enforcement | Art. 4.1, Art. 8 | President of the Superior Jury (or designee) checks before and during competition and applies Code of Points penalties; refusal can mean exclusion from that phase; special manufacturer designs can be sent to FIG for review two weeks ahead. At the Olympic Games IOC guidelines prevail over FIG clothing rules, but Code deductions still apply[^fig-clothing] |

# Checkable as geometry [INFERRED]

Emblem area at least 30 sq cm; logo bounding box at most 30 sq cm; advertising areas and 3 cm
separation; technology mark at most 10 sq cm; text elements validated against the prohibited list.
Areas depend on garment size, so checks must run per graded size.[^styles] See
[geometric checks](/domain/rules/geometric-rule-checks.md) and
[rule conflicts](/domain/rules/rule-conflicts.md) (NCAA allows names).

[^styles]: Research notes: leotard styles and rules, bundle mirror, section 9.
[^fig-clothing]: FIG Rules for Competition Clothing and Advertising, valid from May 2024.
