---
type: Design Rule
title: Relaxed vs stretched stone spacing
description: "Stones are rigid and pressed on relaxed (or slightly stretched) flat pieces, so on the body centre-to-centre spacing grows with local fabric stretch while stone size stays fixed; layouts must be previewed and checked in the worn state."
tags: [crystal, stretch, spacing, rule]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-15T21:00:00Z }
sources:
  - id: ecs
    resource: /references/research/embellishments-crystals-sequins.md
    title: "Research notes: embellishments, crystals and sequins"
    author: claude-code/claude-opus-5-5
  - id: preciosa-manual
    resource: https://www.preciosa-eshop.com/user/related_files/preciosa-hotfix-application-manual-complete-en-2.pdf
    title: Preciosa Hotfix Application Manual (PDF, 2019)
    author: org:preciosa
  - id: cp-stretch
    resource: https://crystalparade.co.uk/blogs/news/how-to-embellish-stretch-fabric-with-rhinestones
    title: Crystal Parade, 19 Dec 2023
    author: org:crystal-parade
  - id: cgn-2026-02
    resource: https://collegegymnews.com/2026/02/18/leotard-rankings-week-7-7/
    title: College Gym News, 18 Feb 2026
    author: org:college-gym-news
  - id: report
    resource: /references/research/research-report.md
    title: "Research report: Borrow the engine, build the sparkle"
    author: claude-code/claude-opus-5-5
---

# Rule

**Design and check stone spacing in the worn (stretched) state, and map it back to the relaxed flat
piece for production.** A layout designed flat looks sparser on the body where fabric stretches
most; a layout designed on the body and naively flattened will be too dense (or overlapping) on the
pressed piece. **[INFERRED]**[^ecs]

# Why

- Stones are rigid and the glued footprint cannot stretch, so on the body centre-to-centre spacing
  grows with local fabric stretch while stone size stays fixed. **[INFERRED]**[^ecs]
- Leotard patterns are cut smaller than the body (negative ease) and stones are pressed on flat cut
  pieces before sewing, so the pressed state and the worn state always differ.[^report]
- Preciosa: "If stretch material is used for the hotfix application it is recommended to secure the
  material slightly stretched on a pad prior to the application" — a partial pre-compensation.[^preciosa-manual]
- Hand stoning practice: mount the garment on a torso-shaped "Dolly Board" so it is "flat but not over
  stretched" — pulled too hard the pattern goes askew, too little and it wrinkles.[^cp-stretch]
- Dense fills locally stiffen the garment. **[INFERRED]**[^ecs]
- Linear repeats (stripes, chevrons) are the layouts most sensitive to distortion on the body; an
  NCAA reviewer preferred "scattered rhinestones instead of linear designs".[^cgn-2026-02][^ecs]

# How to apply

1. Keep stone diameters fixed in millimetres; never scale stones with the garment.
2. Compute spacing checks (minimum gap, overlap) on the worn body *and* on the flattened piece; the
   flattened check uses the fabric's stretch at the press (relaxed or "slightly stretched").
3. Warn where stretch × stone coverage is high (stiffening and stone-loss risk).
4. Fabric stretch per fabric: [/domain/fabrics/](/domain/fabrics/about.md); body-to-piece mapping:
   [/engineering/geometry/](/engineering/geometry/about.md).

The proof of concept already keeps stones at real sizes while motifs scale with the body
([stones component](/engineering/poc/stones.md)), but it does not yet model stretch.

Related: whether makers stone relaxed or stretched pieces, and how layouts grade across sizes, is an
open question in [stoning state and crystal grading](/domain/construction/open-question-stoning-state-and-crystal-grading.md);
the flattening maths is in [stretch compensation](/engineering/geometry/stretch-compensation.md).

No source quantifies the effect or publishes how makers compensate; GK's stretch handling is not
public.[^ecs]

[^ecs]: Research notes: embellishments, crystals and sequins, sections 7 and 9 inferences (in-bundle mirror)
[^preciosa-manual]: Preciosa Hotfix Application Manual (manufacturer)
[^cp-stretch]: Crystal Parade, 19 Dec 2023 (retailer)
[^cgn-2026-02]: College Gym News, 18 Feb 2026
[^report]: Research report, construction section (in-bundle mirror)
