---
type: Domain Concept
title: Real-body proportions versus retail mannequins
description: "Retail display mannequins are about 180 cm and dress size 4-6, taller and slimmer than real women and far from children's bodies; the app's mannequins deliberately use real-body (MakeHuman) proportions at ages 8, 13, 18 and 30, styled to look like mannequins, and should say so in the UI."
tags: [mannequins, proportions, body, design-choice]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: fit
    resource: /references/research/mannequins-and-leotard-fit.md
    title: "Research notes: mannequins and leotard fit (bundle mirror)"
  - id: fashionunited
    resource: https://fashionunited.uk/news/fashion/mannequins-history-trends-and-key-figures/2016112522618
    title: FashionUnited, mannequins history and key figures
  - id: refinery29
    resource: https://refinery29.com/en-us/store-mannequins-womens-body-shape
    title: Refinery29 citing the Guardian on store mannequin proportions
  - id: pipeline
    resource: pipeline/README.md (project root), read 2026-10-15
    title: Mannequin pipeline README
    author: claude-code/claude-opus-5-5
---

# Takeaway

A retail display mannequin is **about 180 cm tall, dress size 4-6, 86-61-91 cm**, about 6 in taller
than the average woman, because thinner forms are easier to dress and clothes hang better on
them.[^fashionunited][^refinery29] A fit tool for gymnastics leotards needs the opposite: **real
bodies at the ages gymnasts actually are**. The app therefore builds its mannequins from
**real-body MakeHuman proportions** and only *styles* them as mannequins (egg head, smooth hands and
feet, matte finish, glass base). They will look shorter and fuller than shop mannequins; that is the
right choice for a fit tool, and the UI should note it.[^fit]

| | Retail display mannequin | Our mannequins |
|---|---|---|
| Height (adult) | ~180 cm | 163-165 cm (ages 18, 30) |
| Adult bust/waist/hip | ~86 / 61-64 / 91 cm | 84-87 / 65-67 / 89-91 cm |
| Children | Econoco City Kid 8: 129.5 cm, 63.5/55.9/68.6; City Kid 12: 154.9 cm, 76.2/62.2/81.3 | Age 8: 130 cm, 66/57/69; age 13: 155 cm, 78/64/83 |
| Build | Fashion-slim | Lean athletic ("gymnast-ish"), waist held 3-5 cm below dress-form values **[INFERRED]** |
| Head, hands, feet | Egg or abstract head; simplified hands; toeless feet | Same styling: egg replaces the head, hands smoothed, bust smoothed[^pipeline] |
| Pose | Numbered poses, weight on one leg | Near-A-pose: upper arm 13° from vertical, elbow bent 14°[^pipeline] |

Sources for our figures: [body targets by age](/domain/sizing/body-measurement-targets-by-age.md)
and the pipeline.[^fit][^pipeline]

**Why real proportions matter [INFERRED]:** anatomy-anchored lines (leg line at the hip bone,
neckline at the sternum, back at the shoulder blade) and the torso-loop size assignment only mean
something on realistic bodies; a 180 cm fashion form would put every line in the wrong place for an
8-year-old.

All four bodies share one mesh topology so a leotard designed once on the reference body is carried
to the others.[^pipeline] See [/engineering/pipeline/mannequin-pipeline.md](/engineering/pipeline/mannequin-pipeline.md),
[retail display mannequins](/domain/mannequins/retail-display-mannequins.md) and
[/product/vision.md](/product/vision.md).

[^fit]: Research notes: mannequins and leotard fit, bundle mirror, sections 1 and 2.
[^fashionunited]: FashionUnited.
[^refinery29]: Refinery29 citing the Guardian.
[^pipeline]: Mannequin pipeline README.
