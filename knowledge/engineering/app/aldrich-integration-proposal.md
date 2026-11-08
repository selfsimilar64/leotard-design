---
type: Technique
title: Using Aldrich in our blocks and design model (proposal)
description: "Proposal of 2026-11-07, revised for the owner's rule that foundations must be shippable: draft Aldrich's bodyshaper as a second method-based block beside Armstrong's and use the girls' charts for child sizes; secondary ideas: a named measurement set with the vertical trunk, crotch arc and thigh, Aldrich's girls' charts as child proportions, a reduction model held per girth, size group and fabric class (with fixed-cm and percentage models side by side), a front-only bust share for teens, grade rules derived from parametric drafts for export, and a fault-to-correction table for fit diagnosis. Nothing built yet."
tags: [proposal, block, drafting, sizing, data-model, grading, fit, aldrich]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-07T23:30:00Z }
sources:
  - id: women
    resource: /domain/construction/aldrich-stretch-body-and-swimwear-blocks.md
    title: Aldrich's stretch body, bodyshaper and swimwear blocks
  - id: children
    resource: /domain/sizing/aldrich-childrens-size-charts.md
    title: Aldrich's children's size charts and measuring rules
  - id: drafted
    resource: /engineering/app/drafted-blocks.md
    title: Drafted blocks
  - id: owner-authority
    resource: "conversation with the product owner, 2026-11-02 (Claude Code session): purchased patterns are the authority; no band-aid fit fixes"
    title: Owner's rules on purchased patterns and fit fixes
  - id: owner-ship
    resource: "conversation with the product owner, 2026-11-07 (Claude Code session): a pattern we cannot ship is next to useless; the Armstrong-drafted block is the best so far; the bodyshaper is the only Aldrich shape close to a gymnastics leotard"
    title: Owner on shippable foundation blocks
---

# Takeaway

**Owner's direction (2026-11-07, restating 2026-11-03): foundations must be blocks we can ship,
drafted by us from published methods, as close to a gymnastics leotard as possible; bought blocks
are yardsticks only.**[^owner-ship] On that test Aldrich's **bodyshaper** is the useful part: a
second method we may follow (after Armstrong), metric, with a sleeve, a sleeveless variant and a
gusset, and the owner's pick as the shape nearest a gymnastics leotard. Its own looseness is not
disqualifying, since the reduction is a parameter set from the
[yardsticks](/domain/construction/real-leotard-yardsticks.md). The **girls' charts** supply the
child proportions any method needs to draft child sizes; measurements are facts, so they ship.
Sections 1-6 below are secondary; items aimed at made-to-measure (fault corrections, individual
measuring) matter little while studios sell fixed sizes. Every item is **[INFERRED]** design; none
is built.

# 1. A named measurement set

`measureBody` reads bust, waist, hip, centre front and back, side levels, neck, shoulder, arm,
bicep and wrist from the garment surface.[^drafted] Name the set after Aldrich's (BS EN 13402)
definitions and add the ones a leotard needs: **vertical trunk** (torso loop), **body rise**,
**scye depth**, **crotch arc**, **thigh girth**, **low waist** (6 cm below the waist), **underbust**.
One vocabulary then serves the body, the drafter, the size charts and the yardsticks, and every
chart value can be compared with a mannequin's measured value.

# 2. Child and teen proportions from the girls' charts

Child blocks now take bust, waist and hip and scale everything else from the `young` adult body.[^drafted]
Replace that scaling with Aldrich's girls' rows by height (across back, neck, shoulder, scye depth,
back neck-waist, waist-hip, body rise, crotch arc, thigh), and the developing-figure chart from
146 cm. First use: check the app's child and teen mannequins against those rows; the 13-year
target already looks about 3 cm short in the back.[^children]

# 3. Reduction as a model, not a constant

Today `REF` holds three percentages from the purchased block at XS.[^drafted] Aldrich takes a fixed
number of centimetres per size group; Watkins and Laplace argue for percentages that shrink on
small radii. Hold the reduction as a function of **girth location, size and fabric class**, keep
both models runnable side by side, and let the [yardsticks](/domain/construction/real-leotard-yardsticks.md)
choose. The choice matters most for children. Fabric class follows Aldrich's ladder (max stretch,
less stretch), which matches mystique and foil sizing sets. Length reduction stays an open
question: Aldrich takes none, GK resale suggests 8-24%.

# 4. A front-only bust share

Drafted teen blocks are tight across the front bust (1.45 against about 1.20) because front and
back share the side seam at equal width.[^drafted] Aldrich's developing-figure dart (stage A 2-3 cm,
stage B 4-5 cm) and its bra-top slash and spread give a sourced amount for a front-only addition.
In a dartless stretch piece it would be spread width and length on the front alone, re-trued to
the back at the side seam. Check against the purchased block before adopting.

# 5. Grade rules out of parametric drafts

We draft every size from measures, which Aldrich's CAD chapter calls the parametric route.
Factories and DXF-AAMA exchange speak grade rules: an (x, y) shift per named point per size step,
with a zero rule for fixed points.[^women] Name the drafter's control points stably and derive the
rules from neighbouring drafted sizes, per size group. That gives export a factory can read, and
a base for carrying panel lines across sizes ([open question](/domain/sizing/grading-designs-across-sizes.md)).

# 6. Fit diagnosis that edits the pattern

Aldrich lists each fitting fault as symptom, place and pattern operation (slash at a named line,
open or overlap, re-true the neighbour). Kept as a table, it lets a strain pattern seen in the fit
solver suggest a pattern change instead of a constraint on the fit, as the owner's no-band-aid rule
asks.[^owner-authority] The corrections are for woven fabric; each needs a stretch test first.

# What not to take

Woven form cutting, collars, tailoring, nightwear; the children's swimwear (too loose); Aldrich's
own leg lines as a fix to the purchased block. **First step instead:** draft the bodyshaper from
Aldrich's method in code beside `pipeline/draft_armstrong.py`, run it through the pattern checks,
and compare it with the Armstrong block and the purchased block as a yardstick; where two
independent methods agree, the foundation is stronger.

[^women]: Aldrich's stretch body, bodyshaper and swimwear blocks.
[^children]: Aldrich's children's size charts and measuring rules.
[^drafted]: Drafted blocks.
[^owner-authority]: Owner's rules on purchased patterns and fit fixes.
[^owner-ship]: Owner on shippable foundation blocks.
