---
type: Component
title: Daz Genesis 9 bodies (build_daz_bodies.py)
description: "pipeline/build_daz_bodies.py evaluates Daz 3D Genesis 9 shapes from the owner's local Daz library (morph formula graph, arm stance by linear blend skinning, two Catmull-Clark levels) and shrink-wraps the MakeHuman mannequin mesh onto them, so the app gets Daz-shaped bodies on its existing topology; output is git-ignored."
tags: [pipeline, component, mannequin, daz, genesis-9, wrap, licensing]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-20T13:30:00Z }
sources:
  - id: script
    resource: ../../../pipeline/build_daz_bodies.py
    title: pipeline/build_daz_bodies.py
    author: claude-code/claude-opus-5-5
  - id: owner
    resource: conversation with the product owner, 2026-10-20 (Claude Code session)
    title: "Daz direction, trial bodies, remove the head"
    author: human:mattj
  - id: daz-eula
    resource: https://www.daz3d.com/eula
    title: Daz 3D EULA, Addendum 3.0 (Interactive License)
    author: org:daz3d
  - id: daz-il
    resource: https://www.daz3d.com/interactive-license-info
    title: Daz Interactive License information
    author: org:daz3d
  - id: g9se
    resource: https://www.daz3d.com/genesis-9-starter-essentials
    title: Genesis 9 Starter Essentials (free; Interactive License add-on $50)
    author: org:daz3d
---

# Takeaway

The app can show **Daz 3D Genesis 9 body shapes on its own mannequin mesh**: each Daz body is
evaluated from the owner's local Daz library, then the MakeHuman mannequin mesh is wrapped onto it,
so vertex i stays the same anatomical point and every design (surface points, region fields,
poses) works on the Daz bodies unchanged.[^script] Four adult builds exist (keys `daz-petite`,
`daz-young`, `daz-adult`, `daz-broad`); the free Daz content has **no age morphs**, so there are no
Daz child or teen bodies (an adult shape scaled to 1.29 m / 1.53 m still read as a small woman,
tried 2026-10-20).[^owner] The output folder `app/public/mannequins-daz/` is git-ignored: it is
derived from Daz content licensed to the owner.

# How it works (pipeline/build_daz_bodies.py)

1. **Read the figure**: `data/DAZ 3D/Genesis 9/Base/Genesis9.dsf` (plain JSON): 25,182 cage
   vertices (cm, y up, +z front, +x = figure's left: same axes as three.js), polygons minus the
   `Mouth Cavity` material, joint centres, skin weights (`SkinBinding` → `node_weights`). Library
   path from `DAZ_LIBRARY`, default `C:/Users/Public/Documents/My DAZ 3D Library`.
2. **Morphs**: every `.dsf` under `Base/Morphs` (737 with deltas). Formulas are evaluated as a
   linear graph: `value = (own setting + sum-stage formulas) × product of mult-stage formulas`.
   The `stage: "mult"` handling matters: corrective morphs (`*_cbs_*`) are "spline(bone rotation)
   [sum] × character strength [mult]" and must stay 0 at rest; ignoring the stage switched them on.
   Spline formulas (pose-driven) are treated as 0. Joint centres follow `center_point/x|y|z`
   formulas. Bone-scale controls (`*_scl`, `Proportion*Scale`) are ignored (the body is rescaled
   to stature anyway).
3. **Arm stance**: the mannequin stance of `build_mannequins.py` (upper arm 13° from vertical,
   slightly forward; elbow bent 14° forward) by linear blend skinning with Genesis 9's weights
   (upper-arm subtree rotated about `*_upperarm`, forearm subtree also about `*_forearm`).
4. **Scale** uniformly to the target stature, feet at y = 0, cm → m.
5. **Subdivide** the posed cage twice (Catmull-Clark, `catmull_clark()`). Wrapping onto the bare
   cage left its facets as creases (visible around the bust).
6. **Wrap** (`wrap()`): the MakeHuman body named by the recipe's `mh` is warped by a thin-plate
   spline through matching joints (neck base, shoulder, elbow, wrist, hip, knee, ankle, head top,
   both sides), then non-rigid ICP in 7 rounds: closest surface sample (2 mm spacing) with a
   normal within ~70°, then a sparse solve for the displacement minimising
   `lam·Σ|Di−Dj|² + Σ w[(n·(Q+D−t))² + SLIDE·|Q+D−t|²]` (point-to-plane plus 0.3 point-to-point;
   radius 6 → 0.8 cm, lam 4 → 0.06). Point-to-plane lets vertices slide off creases; the 0.3
   point-to-point term stops limbs twisting about their axis. Hands (part weight > 0.15) and the
   egg head get no data term; the egg is then moved rigidly by the neck's mean displacement.
   The small Tikhonov term must act on D alone: putting it in the data block pulled every
   unmatched vertex towards the origin (the egg drifted 0.5 m before this was fixed).
6b. **Leotard fit points** (`fit_points`, added 2026-10-20 after the owner saw leg openings
   creeping onto the upper thigh of the fuller bodies): joints alone left the groin up to 16-17 mm
   off (p90 tangential slide), so the leg line sat where MakeHuman's crease was, not on the Daz
   body's. Now found on both bodies from their shape and pinned (`PIN_W` = 200; misses < 0.05 mm):
   the crotch (lowest mid-plane torso point), the front hip crease (greatest concavity of the
   front silhouette, on planes 10/20/30% across the thigh measured 4 cm below the crotch), the
   fold under the seat (back silhouette, planes 15/30/45%), and the seat's most posterior point.
   Planes are thigh-relative because the two rigs place the hip joint 6-15 mm apart. Survey
   (2026-10-20): the smooth MakeHuman mannequin's creases fade beyond ~30% (front) / ~45% (back)
   across the thigh, where the search hits its window edge, so points weaker than `MIN_CONCAVITY`
   (7 /m) or on the window edge on either body are not pinned (petite: 13 of 15 pinned). The
   points also join the thin-plate-spline warp. `daz-adult` and `daz-broad` now start from the
   MakeHuman `young` body (the `adult` mannequin's seat fold is too faint to read). Result: leg
   openings follow each Daz body's own crease (before/after captures in `app/captures/beforeafter-*`).
7. **Landmarks** for the manifest come from the posed Daz joints (`neck1`, `l_upperarm`, …);
   `chest`/`waist` sit at the same fractions between pelvis and neck base as on the MakeHuman body.

Run: `python pipeline/build_daz_bodies.py [keys…]` (system Python with numpy, scipy), about 25 s a
body. Measured fit (2026-10-20): torso and arms within 0.4 mm at p99 (max 1.6-2.5 mm); feet
differ by up to ~2 cm (the mannequin's smoothed feet against Daz toes).

# In the app

- `loadMannequins` (`app/src/body/mannequin.js`) also reads `../mannequins-daz/manifest.json`
  when present (same vertex count required) and appends its bodies; `bodyKeys` feeds the
  `body.set` size check (`app/src/doc/commands-core.js`). The reference body stays MakeHuman
  `young`, so region fields and design anchors are unchanged.
- New body form **`headless`** (`body.set { form: 'headless' }`, Inspector "Full body, no head"):
  the full body cut just under the egg head's opening (`keepHeadless`, swapped into the shared
  keep array by `setCut`), capped with the dress form's neck cap. Added at the owner's request: the
  egg head distracted from the body proportions.[^owner]

# Licensing (summary, 2026-10-20)

Using Daz content inside a shipped app needs the per-product **Interactive License** add-on
(one-time, no subscription): $50 for Genesis 9 Starter Essentials, about $35-50 for other
products, each shape/pose/character product separately.[^g9se][^daz-il] Conditions: the 3D content
must not be available to users in native formats (protect it, e.g. encryption), no separate sale
of the content without written consent, and post-install content delivery needs consent above
$1M annual revenue.[^daz-eula] Wrapping our mesh onto a Daz shape is still derived content
**[INFERRED]**, so these bodies need the base-figure licence (plus any shape products used) before
they ship. Until then the files stay local (git-ignored).

# Recipes (BODIES)

| Key | Label | Stature | Morphs |
|---|---|---|---|
| `daz-petite` | Petite athlete | 1.53 m | BaseFeminine 0.5, shoulders −0.35, chest width −0.3, breasts flatten 0.5, athletic flex |
| `daz-young` | Young adult, athletic (Kat) | 1.61 m | Kat character body (BaseFeminine 0.75, longer legs), athletic flex |
| `daz-adult` | Adult (about 30) | 1.64 m | BaseFeminine 1, athletic flex × 0.8 |
| `daz-broad` | Adult, broader build (Amala) | 1.66 m | Amala character body (broader shoulders, fuller chest) |

"Athletic flex" = the flexion morphs (glute clench 0.35, quads 0.3, calves 0.3, hamstrings 0.2).

# Open

- Child and teen Daz bodies need *Growing Up for Genesis 9* (paid, plus its Interactive License).
- Feet: exclude toes from the data term or replace the mannequin feet.
- The Daz bodies keep a natural bust; a sports-bra compression look is one slider
  (`body_ctrl_BreastsFlatten`) away.
- B2's back strap is drawn high on the neck and floats above the headless cap on every body.

[^script]: pipeline/build_daz_bodies.py
[^owner]: Product owner, 2026-10-20
[^daz-eula]: Daz 3D EULA
[^daz-il]: Daz Interactive License information
[^g9se]: Genesis 9 Starter Essentials product page
