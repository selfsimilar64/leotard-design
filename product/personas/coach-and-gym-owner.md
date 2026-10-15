---
type: Persona
title: Coach and gym owner
description: Designs team leotards by customising ready-made designs and assets; never sees sewing or pattern components.
tags: [persona, coach, gym, roles]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T20:40:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-15 (Claude Code session)
    title: Direction for the post-POC phase
    author: human:mattj
  - id: report
    resource: /references/research/research-report.md
    title: "Research report: Borrow the engine, build the sparkle"
---

# Who they are

Gym owners and coaches who order leotards for their teams. They "do not need access to the
sewing components - they just want to design a leotard", and "might need a much more limited
set of controls which select from pre-made assets or designs but still allow for significant
customization".[^owner]

# Goals

- Produce a distinctive team design quickly, without garment-construction knowledge.
- **[INFERRED]** Know what the design will cost: the research found crystal count is the clearest
  driver of a leotard's tier and price, and brand studios already sell crystals by coverage
  tier.[^report] See [/domain/embellishments/](/domain/embellishments/about.md).
- **[INFERRED]** Hand the design to a maker with confidence that it can be produced as shown.

# What they see and can change

- Start from a pre-made design or a catalogue of pre-made parts (back styles, necklines, sleeve
  options).[^owner]
- Customise: colours, fabrics per zone, stone patterns and coverage, and whatever else the
  template allows. The designs come from their leotard maker's catalogue, and the maker's
  designers decide which controls are open
  ([decision](/decisions/2026-10-15-coach-designs-come-from-maker-catalogue.md)).
- Not shown: pattern pieces, seam allowances, measurements, markings, free-form shape editing.

# Context from research

- Today's brand studios (GK UDesign, Sylvia P StudioSP, Quatro's builder) let clubs recolour
  fixed templates zone by zone and pick a crystal tier; none lets a user draw a line or place a
  single stone.[^report] See [/domain/market/](/domain/market/about.md).
- Rule checks for competition legality would matter most to this user, but are
  [deferred](/decisions/2026-10-13-defer-competition-rules-and-pain-points.md).
- First-hand coach interviews were never done; demand evidence is indirect.[^report]

[^owner]: Product owner, 2026-10-15
[^report]: Research report, market and embellishment sections
