---
type: Roadmap
title: Bringing the block-first garment into the app
description: "Plan and capability map of 2026-11-03: the app's design options re-made as cuts, splits and redrafts of one fitted block, fitted by the GPU re-fit; a flat view beside the 3D view, each switchable, with a focus on one piece; what studios are known to do. For deciding direction, not yet started."
tags: [roadmap, pattern, architecture, options, ux, block, refit]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-03T23:30:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-03 (Claude Code session)
    title: "Integrate into the real app: 2D beside 3D, either toggled off, focus on one piece; account for every design capability and how to achieve it from the block; what do studios like GK do"
    author: human:mattj
  - id: options
    resource: /product/roadmap/keeping-the-options-on-the-block.md
    title: Keeping the app's options on a real block (option coverage audit)
  - id: refit
    resource: /engineering/app/refit-in-the-app.md
    title: The re-fit in the app
  - id: drafting
    resource: /domain/construction/stretch-block-drafting.md
    title: Stretch block drafting (Porter, Watkins)
  - id: designers
    resource: /domain/garment/how-leotard-designers-work.md
    title: How leotard designers work
  - id: menus
    resource: /domain/garment/brand-option-menus.md
    title: Brand option menus
---

# Goal

The owner wants the block-first garment (flat pieces from a real block, fitted onto any body in any pose by the [GPU re-fit](/engineering/app/refit-in-the-app.md)) in the real app, with a flat view and a 3D view that can each be shown or hidden, and a way to focus the flat view on one piece to edit it.[^owner] Before building, every design option the app has must be accounted for: how it is made from the block, and whether that needs custom edits or new bought blocks. Not started; this is the map.

# What studios are known to do

From the bundle's sources (details and citations in the linked pages):

- **One fitted block, altered.** Every sourced procedure (Porter, home and atelier patterns, ChalkBucket makers) starts from one fitted block per size: lengths by slash-and-spread, then neck and back drawn on a traced copy, colour blocks cut apart last with allowance added only on the new edges ([drafting](/domain/construction/stretch-block-drafting.md)). Commercial blocks carry variants as lines on one piece (BasicPatternBlock: two leg lines, a short-sleeve line; Jalie: back variants as views of one pattern).
- **Brand menus look modular:** GK's Infinite Possibilities picks a back, then any neckline, with a traditional or modified leg on every style; GK's engineered sublimation puts 35 prints on four silhouettes ([menus](/domain/garment/brand-option-menus.md)).
- **Designers draw flat; pattern rooms own fit.** GK's named design tools are Illustrator and Photoshop; a line drawing and paperwork go to a pattern department that owns fit and cutting; pieces are cut, sublimated flat, embellished, then closed at sides, shoulders and crotch ([designers](/domain/garment/how-leotard-designers-work.md)). No source shows GK designers mapping artwork onto flat pieces themselves, nor GK's blocks, CAD or grade rules ([open question](/domain/construction/open-question-factory-pattern-data.md)).
- **[INFERRED]** A factory most likely holds a small set of proven base patterns per size range (a sleeved body, a sleeveless body, set-in and raglan sleeves, perhaps a separate mock-neck band) and draws every neckline, back, leg and panel line on them, as general apparel CAD (style patterns built from blocks, piece libraries) works. Designers who know the block design the look; pattern makers turn it into pieces. Not confirmed for any leotard maker.

# Capability map

Every shape option in `garment/blocks.js` `BLOCK_OPTIONS`, plus the free tools, against the bought block XS (front, back, sleeve; [audit](/product/roadmap/keeping-the-options-on-the-block.md): all options lie on the block but up to 1.9% at a high neck). Kinds: **split** (divide a piece, fit unchanged), **cut** (remove cloth inside the block, then re-fit), **redraft** (fabric or a seam the block lacks: a new or altered piece).

| Option | Choices | Kind | How, on the flat pieces | Fit concern |
|---|---|---|---|---|
| Neckline | crew, scoop, V, boat, square | cut | redraw the front (and back) neck below or wider than the block's | elastic finish loses about 3/4 in (Porter); deep scoops gape without it |
| Neckline | high (mock) | redraft | a separate neck band (Porter's banded-collar strip) or the neck extended up; 1.9% outside the block | band length sets how it hugs the neck |
| Back | scoop, low, V, square, keyhole, open | cut | redraw the back neck; keyhole as a hole in the back piece (more than 1.5 in below the neckline, big enough to step in, Porter) | low and open backs change how the whole garment hangs: re-fit; may need the back taken in or elastic to stop gaping |
| Sleeves | long, three-quarter, short, cap | cut | one line across the sleeve piece (the block already carries a short-sleeve line) | almost none |
| Sleeves | tank (none) | cut | drop the sleeve; redraw the armhole on front and back | the shoulder loses its anchor: re-fit |
| Straps | tank, narrow, racer | cut | redraw shoulders and armholes on front and back (`STRAPS` widths and shoulder-width rule) | re-fit; strap tension |
| Straps | thin (spaghetti) | redraft | separate strap strips | needs strip pieces |
| Armhole | set-in | block | as bought | none |
| Armhole | raglan | redraft | a raglan sleeve and re-cut front and back (sleeve seam from underarm to neckline); a standard drafting change, or a bought raglan pattern | new seam layout |
| Leg | standard, high, competition | cut | redraw the leg line on front and back (the block carries HIGH HIPS and THIGH lines); keep the back leg's seat coverage (Porter redraws it outward 1-2 in) | re-fit; leg elastic |
| Yoke | sweetheart, V, straight, round | split | a seam across the front piece | none (seam allowance only) |
| Waist seam | straight, V, peak | split | a seam across the front piece | none |
| Drawn seams, panels | any | split | a seam on any piece, drawn on the body or the flat piece | none; keep seams straight or gently curved, swirls become appliqué (Porter) |
| Cut-out | any | cut | a hole in a piece, or a mesh window (split + sheer fabric) | re-fit (the race's cutout cases: 30-50 steps) |
| Strap tool, overlays | any | redraft | separate strips or a piece laid on another | the fit has no layered pieces yet |
| Asymmetric designs | any | split or cut | full (unfolded) pieces, which the fit already uses | none |

Also outside the shape options:

- **Bodies and sizes.** The project's [drafted blocks](/engineering/app/drafted-blocks.md) give a parametric block per body and size (proportions from block XS; whether that is allowed under its terms is not reviewed). Each needs a first fit from nothing, which only exists on the CPU (minutes), not yet timed on the GPU; a per-body-and-size first fit could be precomputed.
- **Poses:** done (the standing fit carried, then re-fit).
- **Building a case from a live design** (pieces, seams, elastic, the body's surface data) is still Python (`pipeline/race/export_app.py`, `wrap_block.py`); the app needs it in JavaScript.

# Blocks: one per design, or one altered?

**[INFERRED]** One block per design is not needed. About 80% of the options are cuts or splits of the bought sleeved block, the way studios and patterns do it. A few base variants cover the rest. In line with [purchased patterns being the authority](/engineering/app/fitting-a-block-like-the-app.md), buy rather than invent where a variant is a real drafting change:

1. **Sleeved body with set-in sleeve:** the current block. Covers necklines but high, backs, sleeve lengths, legs, yokes, waist, panels, cut-outs.
2. **Sleeveless body (tank or camisole leotard):** the tank armhole and strap shoulders can be cut from block 1, but a bought sleeveless leotard would show how pros shape that armhole and its ease. Worth buying.
3. **Raglan sleeve and body:** a different seam layout. Buy a raglan leotard or bodysuit pattern, or derive it from block 1 by the standard set-in-to-raglan change (and check it against a bought one).
4. **Separate small pieces:** mock-neck band, spaghetti straps, binding: simple strips from formulas (Porter), no purchase.

# The views

- **One stage, three layouts:** 3D only, flat only, side by side (a divider to resize), switched from the top bar (today's Pattern button grows into this). Selection is shared: a piece picked in either view is picked in both.
- **Focus on a piece:** double-click a piece in the flat view (or "Edit this piece" on a picked piece) to give the flat view to that piece alone: zoomed to fit, at true scale, with its seams, notches, grain line and the lines on it editable; the other pieces hidden or ghosted, a strip of piece thumbnails to switch, Esc or "All pieces" to go back. The 3D view keeps showing the whole garment and highlights the piece.
- **Edits re-fit:** a change to a piece's outline re-fits from the standing fit (150 steps, about 0.3 s on the GTX 1650; cuts and seams 30-50 steps), then the pose. A split needs no re-fit.

# Order, if the owner goes ahead

1. Account for the options in the app as they are today: which `BLOCK_OPTIONS` choices map to which cut or split of block XS (draw each on the flat pieces), and which are redrafts.
2. The views: the three layouts and piece focus on today's flat view, before anything changes underneath.
3. Build a case from a live design in JavaScript (the Python export's job), with block XS on `young`; one option kind at a time (splits, then cuts with re-fit).
4. Buy the sleeveless and raglan patterns; read them into data as block XS was.
5. Other bodies and sizes: first fits per drafted block, timed on the GPU.

# Open for the owner

- Whether to start with the views (step 2) or the options on the block (step 1).
- Buying a sleeveless and a raglan leotard pattern, and whether the drafted blocks may be derived from the bought one under its terms.
- Asking a maker how their blocks are organised (the eight questions in the [open question](/domain/construction/open-question-factory-pattern-data.md)).

[^owner]: Owner's message, 2026-11-03
