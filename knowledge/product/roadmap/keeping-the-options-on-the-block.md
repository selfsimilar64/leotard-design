---
type: Roadmap
title: Keeping the app's options on a real block
description: "Proposal of 2026-11-01: every shape option becomes a way of cutting one fitted block, rather than being dropped. An audit found all options lie on block XS except for up to 1.9% at a high neck; options are sorted by how much they disturb the fit."
tags: [roadmap, pattern, architecture, options, proposal]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-02T04:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-01 (Claude Code session)
    title: "Value comes from designing for production; only offer options with this internal representation; physical print-and-sew step set aside"
    author: human:mattj
  - id: audit
    resource: "app/captures/block-coverage-audit.json (git-ignored): each option of BLOCK_OPTIONS applied alone to a crew, long-sleeve, high-leg base on the young body, compared with block XS at 12 mm tolerance"
    title: Option coverage audit, 2026-11-01
  - id: wrap
    resource: /engineering/app/wrapping-a-flat-block-onto-the-body.md
    title: Wrapping a flat block onto the body
---

# Proposal **[INFERRED]**

The owner's rule stands: only offer what has a real cloth representation.[^owner] It need not cost the options, because they are cuts of one
fitted block. Lines stay drawn on the body as now (`curves/`, arrangement, cells); what changes is where a piece's flat shape comes from:
from the block's map instead of `garment/flatten.js`. Structural block seams (side, shoulder, armhole, crotch, underarm) are always among a design's lines. Stage 5 of the
[exploration](/product/roadmap/flat-and-3d-exploration-plan.md) is set aside by the owner; no fit has been checked on real cloth.

# Audit

"Outside" is the share of the option's fabric that the block lacks; "removed" the share of the block's cloth it leaves out. The base removes 11.5% (mostly the `THIGH` leg's extra) and 0.4% lies outside, at the top of the back of the neck.[^audit]

| Option | Outside | Removed |
|---|---|---|
| Yokes, waist seams | 0.4% | 11.5-11.6%: nothing more than the base |
| Necks | 0-1.9% (`high`) | 11.3-12.3% |
| Backs | 0.4-0.5% | 12.2-17.7% (`open`) |
| Legs | 0.4% | 9.3-14.9% |
| Raglan | 0.4% | 11.6% |
| Sleeve lengths | 0.4-0.7% | 18.1% to 41.7% (`tank`) |
| Straps, sleeveless | 0-0.7% | 39.7-52.2% (`thin`) |

Area alone does not give the fit's change: it says where to test. Only one size on one body was audited.

# Kinds of option

| Kind | Options | Treatment | Evidence |
|---|---|---|---|
| Split | Yokes, waist seams, panels | Divide a flat piece; fit unchanged | No fabric removed; untested |
| Mask | Necks, keyholes, sleeve length | Remove cloth on the existing fit | Scoop 2.7 mm at 95%; sleeve torso under 1.7 mm |
| Refit | Legs, low and open backs, sleeveless, straps | Show from the existing fit, refine in the background | `HIGH HIPS` 11.8 mm at 95%; others untested |
| Redraft | Raglan, high neck, straps as own pieces, overlays | Altered or added pieces | None |

# Next, in order

1. Refit test of the hardest shapes (open back, tank, thin strap, competition leg, racer): error from masking, time to refit.
2. Dev flag: build a design's pieces from the block's map instead of flattening, on the starting designs; compare.
3. Faster fits: warm-started solve in a worker at a coarser mesh.
4. Finishes from block edges, then raglan and high neck as redrafts.
5. Other sizes and bodies; children need a block of their own.

# Open for the owner

- Whether a bought block can underlie a shipped product at all, or the seller's terms need asking, or we draft our own parametric block with this one as reference. Children's sizes need that draft anyway.
- Whether a plain, unprinted test garment is worth sewing, since no fit figure has met real cloth.

[^owner]: Owner's direction, 2026-11-01
[^audit]: Option coverage audit
