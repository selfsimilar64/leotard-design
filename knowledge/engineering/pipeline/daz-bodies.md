---
type: Component
title: Daz Genesis 9 bodies (build_daz_bodies.py)
description: "pipeline/build_daz_bodies.py evaluates Daz 3D Genesis 9 shapes from the owner's local Daz library (morph formula graph, arm stance by linear blend skinning, two Catmull-Clark levels) and shrink-wraps the MakeHuman mannequin mesh onto them, so the app gets Daz-shaped bodies on its existing topology; output is git-ignored."
tags: [pipeline, component, mannequin, daz, genesis-9, wrap, licensing]
status: deprecated
superseded_by: /engineering/pipeline/g9-bodies.md
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

**Superseded 2026-10-21** by [Genesis 9 bodies](/engineering/pipeline/g9-bodies.md): the app's mesh is
Genesis 9 itself, so nothing is wrapped any more. `build_daz_bodies.py` is kept only because the
wrapped young adult it builds is the bridge that converts MakeHuman-era designs
(`pipeline/daz/convert_bodies.py migration_map`). The findings below remain the record of why the
wrap was hard.

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
6a. **Two fits, blended** (2026-10-20). The *groin fit* is the wrap above (thin-plate spline on
   the joints, hip joint included): its crotch and inner leg line are the ones the owner approved.
   Alone it puts the leg opening's apex at the hip ~13 mm high (141-145 mm above the crotch on every
   Daz body vs 128 on MakeHuman young: the two rigs place the hip joint differently; owner: "too high
   cut at the hip"). The *hip fit* replaces the hip joint with surface anchors (`torso_anchors`):
   the crotch, the natural waist (narrowest torso, 12-45 cm above the crotch) and, at 25/50/75/100%
   of the crotch-to-waist height, the front and back mid-line points and the **side-seam point**
   (outermost point at mid-depth). The widest point was tried first: on the Daz hips it sits ~2 cm
   forward of mid-depth (on MakeHuman at mid-depth), which sheared the side and left a bump where
   the front and back of a leg opening meet at the hip (owner); the side-seam definition removed it.
   Alone, the hip fit widened the crotch and flattened the front of the leg line (owner: "the groin
   looks wrong again"). So both fits are computed and blended by distance from the mid-line on the
   source body (`BLEND_X` = 3-15 cm, smoothstep; a 6-13 cm blend left an S-wave in the front leg
   line), then settled back onto the Daz surface (two short ICP rounds). Result: apex 126-129 mm on
   young/adult/broad (petite 142), crotch as approved. **Trade-off, owner to choose (2026-10-20):**
   with the apex lower, the front diagonal from crotch to hip is gentler than the approved version's;
   the line now follows the design as drawn on MakeHuman.
6b. **Transfer through Daz topology** (`transfer()`, recipes with `via`): only the reference fits
   are wrapped (`daz-young` from MakeHuman `young`, `daz-petite` from `teen`); `daz-adult` and
   `daz-broad` take the young adult's wrapped mesh and carry it over: each vertex stored as
   (triangle, barycentric weights, offset along the normal) on the subdivided Daz young surface
   and re-evaluated on the target Daz surface. Every recipe is the same Genesis 9 mesh, so this is
   Daz's own anatomical correspondence: the leg line sits on the fuller body exactly where it sits
   on the young adult. Hands (mannequin hands are off the Daz surface; point-wise transfer
   crumpled them onto Daz's fingers) take the harmonic continuation of the forearm displacement;
   the egg head moves rigidly with the neck as before. **New Daz shapes (age packs, body packs)
   should use `via` from a well-fitted body rather than a fresh wrap.**
   *History (2026-10-20):* fresh wraps of the fuller bodies left the leg opening on the upper
   thigh (groin slid 16-17 mm p90: the wrap knew only joints). Pinning crease points found from
   silhouette concavity (crotch, hip crease, seat fold, seat; weight 200) put the line on the
   crease but kinked it between pins (owner: "jagged"), and made the young adult and petite worse;
   pins were removed and replaced by the transfer, which the owner's comparison asked for.
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
- New body form **`headless`** (`body.set { form: 'headless' }`, Inspector "Full body, no head"),
  at the owner's request (the egg head distracted from the body proportions). The mannequin mesh
  has no neck above the egg's opening (throat ~3 cm above the neck base at the front, base of the
  skull at the back), so the egg's 4,402 vertices are reused as the rest of the neck:
  - **Daz bodies:** `neck_positions` in the build script lays them onto the Daz body's real neck,
    from the opening up to a flat cut where the neck meets the head, closed flat. The cut plane
    is tilted: just under the chin at the front (`chin_height`: where the front mid-line profile
    jumps forward) and at the base of the skull at the back (`skull_base_height`: top of the
    nape's flat stretch, 54-60 mm above the throat), level from side to side. Written as
    `<key>.neck.bin` with `neckPlane` [a, b] (y = a + b z) in the manifest; in the app
    `neckExtension` swaps them in and sets the keep field to `a + b z - y`. A level cut at chin
    height (first try) took ~4 cm of real neck off the back and left mock-neck collars standing
    above it. Owner: "take the full Daz body with the head and cut it flat at the top of the neck".
  - Finished edges (rims) are cut too: their materials now get `uClip` from `body.clip` when they
    are rebuilt (before, bindings floated above the dress-form and headless cuts).
  - **MakeHuman bodies:** a tube continuing the opening's outline up to a near-level line under the
    jaw, flat top (`neckExtension`, procedural; the egg is parameterised along its own tilted axis).
  - Tried and dropped: a flat cut at the opening's lowest point (a 2-3 cm stub); a wooden disc and
    knob on the cap ("looks like part of a mannequin"); straightening the top of the neck into a
    cylinder (the section at the neck-base joint still includes the shoulders on Genesis 9, so the
    neck came out shoulder-wide).[^owner]

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
| `daz-adult` | Adult (about 30) | 1.64 m | BaseFeminine 1, athletic flex × 0.8 (transferred from `daz-young`) |
| `daz-broad` | Adult, broader build (Amala) | 1.66 m | Amala character body (broader shoulders, fuller chest; transferred from `daz-young`) |

"Athletic flex" = the flexion morphs (glute clench 0.35, quads 0.3, calves 0.3, hamstrings 0.2).

# Open

- Child and teen Daz bodies: *Growing Up for Genesis 9* was bought on 2026-10-20 and is used by the
  [figure scenes](/engineering/pipeline/daz-figures.md) (ages 5-6 to adult, baked by Daz Studio, the
  mannequin mesh carried over by `transfer()`); mannequin-only Daz child/teen bodies can be made the
  same way. `load_morphs` reads only `Morphs/Daz 3D` (Growing Up's compressed files and neutralizer
  formulas would change these recipes).
- Feet: exclude toes from the data term or replace the mannequin feet.
- The Daz bodies keep a natural bust; a sports-bra compression look is one slider
  (`body_ctrl_BreastsFlatten`) away.
- B2's back strap is drawn high on the neck and floats above the headless cap on every body.

[^script]: pipeline/build_daz_bodies.py
[^owner]: Product owner, 2026-10-20
[^daz-eula]: Daz 3D EULA
[^daz-il]: Daz Interactive License information
[^g9se]: Genesis 9 Starter Essentials product page
