---
type: Decision
title: "Shoulder straps: an element the neckline, back and armhole start from"
description: "Owner decision of 2026-10-24: the app's tank strap (10-12.5 cm across the shoulder, whatever was left between the neck and the armhole) was far wider than real tank leotards (about 1-4 cm). Sleeveless designs get a Straps element with four options (tank about 5 cm, narrow about 3 cm, thin about 1 cm, racer); the neckline and back run between the straps' inner edges and the armhole from their outer edge, so they always match; necklines and backs a strap cannot hold are greyed out; the Straps row shows only on a tank design."
tags: [decision, blocks, straps, neckline, back, armhole, ui]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-24T23:30:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-24 (Claude Code session), with six product photos (GK lace camisole front and back, two racer-cut rhinestone leotards, Quatro green front and back)
    title: Owner question on strap widths and the reply accepting the proposal
    author: human:mattj
  - id: patterns
    resource: /domain/moodboard/common-patterns.md
    title: Moodboard common patterns (sleeveless tank, straps 2.5-7 cm)
---

# Context

The owner showed six tank leotards: two with ordinary shoulder straps much thinner than the app's
tank (Quatro, about 3-4 cm) and four with straps even thinner, close to spaghetti straps (GK
camisole, about 1 cm binding straps; two racer cuts with the strap running from a high neck).
They asked how to bring this into the design language alongside the neckline and back presets,
noting that the three are almost inseparable.[^owner]

Measured in the app: the tank had no strap of its own; it was the fabric left between the neck
opening and the armhole, 10.2-12.5 cm along the shoulder seam depending on the neckline and back.
Every neckline or back pick changed it.

# Decision

Proposed and accepted:[^owner]

1. **Straps are an element** (sleeveless only): Tank (about 5 cm), Narrow (about 3 cm, set out
   towards the shoulder), Thin (about 1 cm, camisole), Racer (cut in towards the neck). "Those four
   options are good for now."
2. **The strap is the anchor.** The neckline and back run between the straps' inner edges; the
   armhole runs from the outer edge down to the armpit. A neckline or back change never moves the
   strap.
3. **Square** neckline and back added (the commonest shape in the photos).
4. **Conflicting necklines and backs are greyed out** (owner's choice over switching silently).
   Thin and narrow straps allow square, scoop and V necks and square, scoop, low, V and open backs;
   racer allows crew and high necks and crew and keyhole backs. Picking a strap that the current
   neckline or back does not fit changes it to one that does.
5. **The Straps row shows only on a tank design.**

Implementation: [building blocks and starting points](/engineering/app/building-blocks-and-starting-points.md#shoulder-straps).

[^owner]: Conversation with the product owner, 2026-10-24.
