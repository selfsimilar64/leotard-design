---
type: Decision
title: Only the high-cut fitted garments are offered
description: "Owner, 2026-11-10: the purchased thigh leg, textbook basic leg, bodyshaper, stretch-knit and hybrid basic leg are removed from the Garment row and the starting points; the purchased, textbook and hybrid high cuts stay. Older designs naming a removed one show their block's high cut, or the drawn pieces."
tags: [fit, garment, ui, decision]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-10T16:40:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-10 (Claude Code session)
    title: "Remove the Purchased Thigh Leg, Textbook Basic Leg, Bodyshaper, Stretch-Knit and Hybrid Basic Leg variants"
    author: human:mattj
  - id: code
    resource: "app/src/garment/fitted.js (FITTED, MOVED), app/src/garment/starts.js, pipeline/publish_fitted.py (OWNED), app/public/fitted/"
    title: Garment list, starting points and published fits
    author: claude-code/claude-opus-5-5
---

# Decision

Right after the [mesh resolution trial](/engineering/app/fit-mesh-resolution-trial.md) made clear that every garment needs its own fit at
each mesh spacing, the owner removed five fitted garments.[^owner] Left in the Garment row: Drawn, the purchased block's high cut (dev
only), the textbook (Armstrong) high cut and the hybrid high cut.

# Consequences

- `garment/fitted.js FITTED` lists the three high cuts; the starting points "Fitted: textbook leotard", "bodyshaper", "stretch-knit" and
  "hybrid leotard" are gone (the two high-cut ones stay).[^code]
- **Older designs** (`meta.fitted` of a removed one): `bought-XS`, `armstrong-6` and `hybrid-6` show their block's high cut (`MOVED`);
  `aldrich-6` and `cole-young` show the drawn pieces. The document keeps its key until the designer picks again. **[INFERRED]** that the
  same block's high cut is the nearest stand-in.
- `pipeline/publish_fitted.py OWNED` publishes only the two high cuts; the four removed files left `app/public/fitted/`. The drafts
  (`draft_aldrich.py`, `draft_cole.py`) and the blocks themselves stay: the high cuts are fitted from the same blocks, and
  [fitted garments in the app](/engineering/app/fitted-garments-in-the-app.md) keeps their history.
- The finer-mesh fits of the removed ones were deleted from `app/captures`; the high cuts keep theirs at 5 and 3.5 mm.

[^owner]: Conversation with the product owner, 2026-11-10.
[^code]: Garment list, starting points and published fits.
