---
type: Design Rule
title: "Rule family: sublimation artwork and ink palettes"
description: "Sublimation artwork is allowed only on polyester print bases; on a coloured base each base colour permits a short list of darker inks (GK grey takes black only); white in artwork means unprinted cloth."
tags: [fabric, sublimation, colour, rule]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: notes-fab
    resource: /references/research/fabrics-and-materials.md
    title: "Research notes: fabrics and materials, question 5"
    author: claude-code/claude-opus-5-5
  - id: gk-p130
    resource: https://secure.viewer.zmags.com/services/resource/pub/167be069/pg2358x2896/3/130?viewerID=448752a2
    title: GK Elite 2026-27 catalogue p.130 (page image)
    author: org:gk-elite
  - id: gk-p131
    resource: https://secure.viewer.zmags.com/services/resource/pub/167be069/pg2358x2896/3/131?viewerID=448752a2
    title: GK Elite 2026-27 catalogue p.131 (page image)
    author: org:gk-elite
  - id: gk-p132
    resource: https://secure.viewer.zmags.com/services/resource/pub/167be069/pg2358x2896/3/132?viewerID=448752a2
    title: GK Elite 2026-27 catalogue p.132 (page image)
    author: org:gk-elite
  - id: funki-bases
    resource: https://www.funkifabrics.com/page/print-base-guide
    title: Funki Fabrics print base guide
    author: org:funki-fabrics
  - id: quatro-p117
    resource: https://d30tgldqweej78.cloudfront.net/194707/img-8932809-8d27a18d4e7b97d4.jpg
    title: Quatro 2026/27 catalogue p.117 (page image)
    author: org:quatro-gymnastics
---

# Takeaway

**Three checks follow from sublimation chemistry: print only on polyester print bases, restrict inks
on a coloured base to that base's list, and treat white artwork as unprinted cloth.**[^notes-fab]
Process background: [sublimation printing](/domain/fabrics/sublimation-printing.md).

# Rules

| ID | Check | Severity | Basis |
|---|---|---|---|
| S1 | Sublimation artwork on a fabric not flagged as a polyester print base (e.g. nylon mystique, nylon matte) | Error | Process is for white polyester-based fabrics only[^funki-bases] |
| S2 | On a coloured base, an artwork colour not in that base's permitted ink list | Error (or snap to nearest permitted ink) | GK SoftLux "Sublimation on a colored fabric" with per-base ink lists[^gk-p130][^gk-p131] |
| S3 | White (or lighter-than-base) colour in artwork | Info: will render as base cloth | **[INFERRED]** no source lists a white ink[^notes-fab] |
| S4 | Engineered print with more colour zones than the print allows | Error | GK prints are "up to 2/3/4 color artwork" with lettered zones[^gk-p132] |
| S5 | Fine detail or exact placement near seams | Info: up to 10% colour and placement variation | Quatro: "an accepted industry tolerance"[^quatro-p117] |

# GK permitted inks on coloured SoftLux bases (examples read from the catalogue)

| Base | Permitted inks |
|---|---|
| 076 Grey | Y51 Black only |
| 152 Red | Black, Candy Apple |
| 080 Hunter Green | Black, Kelly |
| 11G Crimson | Black, Cardinal |
| 160 Royal | Black, Electric Blue, Purple |
| 148 Purple | Black, Purple, Royal, Electric Blue |
| 098 Light Pink | 17 inks |

Source: GK catalogue pp.130-131.[^gk-p130][^gk-p131] The full per-base lists for all 15 bases were not
transcribed; **gap** to fill from the page images.[^notes-fab] **[INFERRED]** The pattern is "darker,
hue-compatible inks only", which could serve as a fallback rule for makers without a published
list.[^notes-fab]

[^notes-fab]: Research notes: fabrics and materials, question 5 (findings and inferences)
[^gk-p130]: GK Elite catalogue p.130
[^gk-p131]: GK Elite catalogue p.131
[^gk-p132]: GK Elite catalogue p.132
[^funki-bases]: Funki print base guide
[^quatro-p117]: Quatro catalogue p.117
