---
type: Technique
title: Why the re-fit does not span hollows on bare skin (diagnosis)
description: "Fit realism plan stage 1 step 1, 2026-11-10: on bare skin the GPU re-fit already spans the navel and the spine groove; they showed only because a fitted garment is shaded with the body's normals, not its own. The seat is a real sink in two parts: from 6 cm up friction holds the fabric in the groove where the start put it (a frictionless first phase lifts it out); in the lowest 4 cm the fabric lies 8-10 mm in the groove whatever the friction, start, hold, steps, elastic, pattern size, squeeze resistance or a thickness stand-in; the groove there ends in a 1-2 mm slit the fabric goes into."
tags: [fit, refit, bridging, seat, friction, shading, diagnosis]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-10T23:30:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-11-10 (Claude Code session)
    title: "Read fit-realism-plan.md and tackle point #1"
    author: human:mattj
  - id: plan
    resource: /engineering/app/fit-realism-plan.md
    title: Fit realism plan (stage 1, step 1)
  - id: bridging
    resource: /engineering/geometry/fabric-bridging-hollows.md
    title: Fabric bridging hollows (the 2026-11-08 measurements this corrects)
  - id: probe
    resource: "app/src/dev/bridge-probe.js run in the dev preview (port 5176), 2026-11-10: Hybrid leotard high cut (hybrid-6-high) on young, pose standing, 7 mm mesh; captures in app/captures/bridge-probe/ (git-ignored)"
    title: The bridge probe's runs and captures
    author: claude-code/claude-opus-5-5
---

# Takeaway

Asked to start the fit realism plan's stage 1,[^owner] whose first step is to find why the re-fit follows hollows on bare skin
before building anything.[^plan] Three separate causes, measured on the hybrid high cut on `young`, standing:[^probe]

1. **Navel and spine groove: shading, not fit.** On bare skin the re-fit keeps 0.84-0.92 of the bridged surface's lift over the
   navel and 0.86-1.0 over the spine groove. They showed on 2026-11-08[^bridging] because `render/fitted.js show()` takes each
   fitted point's `normal` and `aGNormal` from the body (`view.interpolate`), and the fabric shader shades with `aGNormal`: with
   bridging off that is the skin's normal, so the light follows the navel under fabric that spans it. Lit by its own points'
   normals the front is smooth (captures, row 3 against 4).
2. **Upper seat (6-14 cm above the crotch): friction.** With friction (`mu` 0.4, anchored at the start) the fabric stays in the
   groove where the start put it: 6/3/1 mm below the cheek-to-cheek chord at 6/10/14 cm. Without friction, or with the plan's two
   phases (150 frictionless steps, re-anchor, 150 with friction), 3-4/1/0 mm, as today's bridged fit (1/0/1).
3. **Lowest seat (2-4 cm, where it turns under into the gusset): unexplained.** The fabric lies 8-10 mm into the groove (today's
   bridged fit 3/1 mm) whatever is changed: friction 0, start on the bridged surface, hold 0, 750 steps, no elastic, the pattern
   8 or 15% narrower or 5-10% longer, squeezing charged (`gather` 0.8-1), the skin pushed out 1-3 mm as a stand-in for thickness.
   There the groove ends in a slit 1-2 mm wide and the fabric goes into it. Not tested: thickness in the contact query itself,
   bending, the elastic as a band, direction-dependent fabric.

# What was measured and how

`app/src/dev/bridge-probe.js` builds the re-fit case exactly as the app does (`fit/fitted-case.js buildCase`) but chooses the
collision body (the bare skin `man.aPos`, or today's bridged `man.garmentPos`), the start (`startOf` on either), the friction,
hold, steps, pattern size (`garmentArrays`), elastic strength (spring `k` scaled), the gather floor, and an optional frictionless
first phase. It runs `fit/refit.js` on the app's device and measures at **fixed places on the body**, so fabric that slides cannot
skew the result (a first version measured per fabric point and was misleading under sliding):[^probe]

- **Kept**, per region (navel, spine groove, seat): over every body vertex the bridged surface lifts more than 3 mm, the nearest
  fabric layer's height along the vertex normal, against that lift.
- **Seat dip**: a horizontal cross-section through the groove's floor at 2/4/6/10/14 cm above the crotch, seen along the seat's
  view direction; the outermost layer's depth at the floor below the chord between ±24 mm.
- Stretch per triangle (singular values against the rest shape), points inside the skin.

| Fit (150 steps unless said) | Seat dip mm, 2/4/6/10/14 cm | Kept: seat / spine / navel |
|---|---|---|
| Today: bridged surface | 3/1/1/0/1 | 0.60 / 1.09 / 0.92 |
| Bare skin | 9/8/6/3/1 | 0.06 / 0.86 / 0.92 |
| Bare skin, start on the bridged surface | 10/7/6/3/1 | 0.07 / 0.95 / 0.92 |
| Bare skin, `mu` 0 | 9/8/3/1/0 | 0.10 / 0.92 / 0.86 |
| Bare skin, hold 0 | 9/9/6/3/1 | 0.06 / 0.89 / 0.92 |
| Bare skin, 750 steps | 9/8/6/3/1 | 0.06 / 0.98 / 0.92 |
| Bare skin, `mu` 0, 750 steps | 10/9/6/2/1 | 0.10 / 1.01 / 0.87 |
| Bare skin, 150 frictionless then 150 with friction | 9/8/4/1/0 | 0.10 / 0.94 / 0.84 |
| Bare skin, no elastic | 8/8/6/3/1 | 0.06 / 0.86 / 0.92 |
| Bare skin, pattern 8% narrower | 7/7/5/2/1 | 0.08 / 0.99 / 0.81 |
| Bare skin, 8% narrower, 10% longer | 9/6/3/1/1 | 0.14 / 1.02 / 0.77 |
| Bare skin, 15% narrower, `mu` 0, no elastic, 750 steps | 9/7/7/9/3 | 0.06 / 1.09 / 0.83 |
| Bare skin, `gather` 1 (no free squeeze), 750 steps | 6/9/7/3/1 | 0.07 / 0.97 / 0.92 |
| Skin pushed out 2 mm (thickness stand-in) | 9/8/7/4/2 | 0.30 / 1.20 / 1.50 |
| Skin pushed out 3 mm, two phases | 10/7/4/1/0 | 0.49 / 1.47 / 1.68 |

With the skin pushed out, "kept" counts the push itself (it is measured from the bare skin), so above 1 is expected there.

Seat "kept" stays near 0.1 in every bare-skin row because most of the bridged surface's lift there is in the lowest rows.

# Why the lowest seat does not respond (what is known)

- The groove's shape (horizontal sections through the posed skin): at 6-14 cm an open V, about 30 mm wide at 6 mm depth and
  9-15 mm deep; at 2-4 cm it is lopsided in this pose and its deepest 3-6 mm is a slit whose walls are 1-2 mm apart. In the
  bare-skin fits the fabric at 4 cm reaches to within about 1 mm of the floor, so it goes down into the slit.
- Fabric thickness, emulated by pushing the collision skin out 1-3 mm along its normals (with and without the two phases): no
  change at 2-4 cm (9-11/7-9 mm). Not a fair test of the plan's step 4 (thickness in the closest-point query): the pushed-out
  surface folds over itself in tight creases and left 32-79 points 5-9 mm inside the real skin.
- On a high-cut leg no fabric runs round the body at that height: the back is a tongue between the two leg openings. The hip's
  pull does not reach it: with the pattern 15% narrower the across stretch on the lower cheeks stayed 4-7% (it rose to 18-38%
  above), while the fabric there is stretched 23-28% up and down. **[INFERRED]** that the up-and-down pull over the rounded bottom
  of the seat holds the fabric in the groove and nothing across holds it out; the seat sheet needed 4:1 tension across to span the
  same place.[^bridging]
- Friction-free and long runs change it by 1-2 mm, so it is not a start or settling effect.
- Whether a real high-cut leotard sits this far into the lower cleft is the owner's call on photos; today's bridged fit leaves
  a smaller V there.

# Side effects seen

- Without friction (either `mu` 0 or the two-phase start) the leg openings creep: in the low view from behind the high-cut line
  sits visibly higher on the cheeks (captures, row 4). The plan's stage 5 friction ramp would meet the same.
- Charging squeeze (`gather` 0.9-1) let more points inside the skin (11-14, deepest 1.3-1.8 mm; 0-5 otherwise).
- Timings from these runs are not reported: the preview pane was hidden for most of them.[^probe]

# Captures

`app/captures/bridge-probe/comparison.png` (git-ignored, light leotard; seat, seat from low behind, small of the back, front waist),
rows: today as the app draws it; bare skin as the app draws it; bare skin lit by its own shape; bare skin with a frictionless first
phase, own shape. `p.capture(tag)` and `p.show(X, own)` in the probe make more.

[^owner]: Conversation with the product owner, 2026-11-10.
[^plan]: Fit realism plan, stage 1.
[^bridging]: Fabric bridging hollows, "The fitted garments stand on it" (2026-11-08) and the seat sheet's tension (2026-10-25).
[^probe]: The bridge probe's runs and captures, 2026-11-10.
