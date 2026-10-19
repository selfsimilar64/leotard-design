---
type: Domain Concept
title: Stretch and negative ease
description: "Leotards are cut smaller than the body: about 90% of body girth for 80/20 nylon-spandex (10% pattern reduction), with finished swim and athletic suits at 20-30% negative ease; stretch is measured per direction and differs by fabric family."
tags: [sizing, ease, stretch, fit]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: fit
    resource: /references/research/mannequins-and-leotard-fit.md
    title: "Research notes: mannequins and leotard fit (bundle mirror)"
  - id: styles
    resource: /references/research/leotard-styles-and-rules.md
    title: "Research notes: leotard styles and rules (bundle mirror)"
  - id: seamwork
    resource: https://www.seamwork.com/articles/sew-the-maggie-swimsuit
    title: Seamwork and swim-sewing guides (search summary)
  - id: cashmerette
    resource: https://blog.cashmerette.com/2019/02/what-is-negative-ease-and-how-does-it-work.html
    title: Cashmerette / Threads on negative ease (search summary)
  - id: seamly
    resource: https://forum.seamly.io/t/swimsuit-lingerie-patterns/16915
    title: Seamly forum on swimsuit and lingerie patterns
  - id: gl-uk
    resource: https://www.gymnasticsleotards.co.uk/pages/sizing
    title: gymnasticsleotards.co.uk sizing page
  - id: chalkbucket-sizing
    resource: https://chalkbucket.com/threads/alpha-factor-vs-gk-sizing.67723
    title: Chalkbucket forum, Alpha Factor vs GK sizing (search summary)
  - id: gk-sizing-set
    resource: https://gkelite.azureedge.net/images/static/sizecharts/gymnastics-sizing-set-reference-guide.pdf
    title: GK Elite sizing set reference guide (2015)
    author: org:gk-elite
---

# Takeaway

Leotards are deliberately **negative ease**: "snug, close-fitting, supportive".[^gl-uk] A typical
80/20 nylon-spandex 4-way stretch is cut to about **90% of the body measurement** (a "10% pattern
reduction"; worked example 28 in waist → 25¼ in pattern).[^seamwork] Finished swimsuits run
**20-25% negative ease**, athletic suits (Speedo/Nike) up to **30%**.[^cashmerette]

| Fact | Value | Source |
|---|---|---|
| Pattern reduction, 80/20 nylon-spandex | ≈ 10% (cut to 90% of body) | [^seamwork] |
| Finished swimsuit negative ease | 20-25% | [^cashmerette] |
| Athletic suits (Speedo/Nike) | up to 30% | [^cashmerette] |
| Stretch direction | Horizontal and vertical stretch ratios can be measured separately | [^seamly] |
| Competition vs practice | Competition leos often a size smaller than practice ones | [^chalkbucket-sizing] |
| Fabric family | GK uses different sizing sets for plain vs foil (`Mystique`, `Hologram`, `FoilTek`) fabrics | [^gk-sizing-set] |

**[INFERRED] for the fit solve:** shrink the garment to 90% of body girth horizontally and about
92-95% vertically, project onto the body with a 0.6-0.8 mm fabric offset, smooth over concave
regions, compress the body 2-3 mm under fabric (4-5 mm at adult bust and buttocks, 1-2 mm on the
child), and add a 1-1.5 mm, ~8 mm-wide groove under each elastic edge.[^fit] Implementation lives in
[/engineering/geometry/](/engineering/geometry/about.md); the product aims for a garment that
[appears correct, not one that is physically simulated](/decisions/2026-10-13-appears-correct-not-physically-correct.md).

Per-fabric stretch values are not in the research; see [/domain/fabrics/](/domain/fabrics/about.md)
and [sizing sets](/domain/sizing/torso-variants-and-sizing-sets.md).[^styles]

[^fit]: Research notes: mannequins and leotard fit, bundle mirror, section 4.
[^styles]: Research notes: leotard styles and rules, bundle mirror, section 10.
[^seamwork]: Swim-sewing guides (search summary).
[^cashmerette]: Cashmerette / Threads (search summary).
[^seamly]: Seamly forum.
[^gl-uk]: gymnasticsleotards.co.uk sizing.
[^chalkbucket-sizing]: Chalkbucket forum (search summary).
[^gk-sizing-set]: GK sizing set reference guide.
