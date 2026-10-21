---
type: Architecture
title: Genesis 9 as the canonical mesh (feasibility)
description: "Feasibility of replacing the MakeHuman mannequin (41,595 vertices) with Daz Genesis 9 subdivided once (99,688 vertices) as the canonical topology every design is anchored to: exactly symmetric, one piece, all quads, 116 joint correctives; removes the wrap; costs a one-time migration, ~2.4x triangles and a hard dependency on Daz Interactive Licenses. Recommendation: switch, after a performance spike."
tags: [architecture, canonical-mesh, daz, genesis-9, migration, licensing, feasibility]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-20T20:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-20 (Claude Code session)
    title: "Shared mesh vs per-cell models; owner willing to pay for licensing"
    author: human:mattj
  - id: g9-dsf
    resource: "C:/Users/Public/Documents/My DAZ 3D Library/data/DAZ 3D/Genesis 9/Base/Genesis9.dsf (owner's local library)"
    title: Genesis 9 base figure file
    author: org:daz3d
  - id: daz-script
    resource: ../../../pipeline/build_daz_bodies.py
    title: pipeline/build_daz_bodies.py (load_figure, catmull_clark)
    author: claude-code/claude-opus-5-5
  - id: daz-bodies
    resource: /engineering/pipeline/daz-bodies.md
    title: Daz Genesis 9 bodies
  - id: doc-model
    resource: /engineering/architecture/design-document-model.md
    title: Design document model
  - id: daz-eula
    resource: https://www.daz3d.com/eula
    title: Daz 3D EULA, Addendum 3.0 (Interactive License)
    author: org:daz3d
  - id: daz-il
    resource: https://www.daz3d.com/interactive-license-info
    title: Daz Interactive License information
    author: org:daz3d
  - id: growing-up
    resource: https://www.daz3d.com/growing-up-for-genesis-9
    title: "Growing Up for Genesis 9 (Zev0; $21.99; Interactive License add-on $35)"
    author: org:daz3d
---

# Summary (plain language)

**Done 2026-10-21:** the app now runs on Genesis 9 subdivided once; see
[Genesis 9 bodies](/engineering/pipeline/g9-bodies.md). The phases below were carried out with
two changes: bodies and poses are baked by Daz Studio itself (not by the Python morph evaluator),
and arm poses too (route (a) of section 4), so the app's own arm skinning is gone.

Making Daz's Genesis 9 body the app's foundation mesh is feasible and would remove the
"wrapping" step behind most recent fit iteration. Daz bodies, ages, poses and fitted garments
would then plug in exactly. The mesh checks out cleanly: perfectly mirror-symmetric, one
piece, and dense enough once smoothed one level. The costs are a one-time migration of the
app's body code and the 13 benchmark designs, a mesh about 2.4 times heavier (to be measured),
and the app depending on Daz licences for good. **Recommendation: switch, after a short
performance test on the heavier mesh.**

# Findings

## 1. Topology (measured from Genesis9.dsf)[^g9-dsf]

| Property | Value |
|---|---|
| Base cage | 25,182 vertices, 25,156 polygons, **all quads** |
| Materials (quads) | Arms 7,708 · Legs 6,386 · Head 5,466 · Body 3,668 · Fingernails 932 · Toenails 660 · Mouth Cavity 336 |
| Polygon groups | 56, named by bone (`pelvis`, `spine1-4`, `l_thigh`, `l_shoulder`, `l_pectoral`, …) |
| Connected components | **1** (nails and mouth are part of the same surface; eyes, lashes are separate figures, not in this file) |
| Boundary edges | 52 (all other edges shared by exactly 2 faces: manifold) |
| Mirror symmetry (x → −x) | **exact**: every vertex has a mirror twin within 1e-6 cm, the map is an involution, every face has a mirror face |

- The app's `mirrorSP` (`app/src/curves/points.js:78`) mirrors by geometry (closest point to the
  reflected position), so it works unchanged; an exact vertex mirror table is also available for free.
- The build script already drops `Mouth Cavity` (`load_figure`).[^daz-script] A body-only canonical
  mesh could also drop toenails/fingernails materials, or keep them (harmless).

## 2. Density (torso box: hip − 12 cm to shoulder joint, |x| < 20 cm; edge lengths scaled to 1.61 m)

| Mesh | Vertices | Triangles | Torso-box vertices | Torso edge median / p90 |
|---|---|---|---|---|
| MakeHuman (current) | 41,595 | 83,088 | 7,658 | 9.2 / 13.6 mm |
| G9 cage | 25,182 | 50,312 | 3,745 | 11.9 / 15.2 mm |
| **G9 subdivided once** | **99,688** | **198,560** | 14,989 | **5.9 / 7.6 mm** |

- The cage is slightly coarser than MakeHuman on the torso and is a subdivision cage (wrapping onto
  it showed facet creases[^daz-bodies]), so the canonical mesh should be **Catmull-Clark level 1**.
  Subdivision is a fixed linear map of cage positions, so every Daz morph and every Daz pose
  (cage positions) carries to level 1 exactly by one sparse matrix: no wrap, no fitting.
- Cost: ~2.4x triangles, ~2x torso vertices. Everything per-vertex scales with it: lift solve
  (`computeLift`, sparse least squares), contact occlusion, BVH picking, arrangement cutting,
  flattening, body file size (~1.2 MB per body vs ~0.5 MB). **[INFERRED]** likely fine on the
  GTX 1650 desktop; **not measured**, and the iPad target is the real question. Mitigations if
  needed: drop head (headless form), toes and fingers from the canonical mesh before subdividing.

## 3. What is tied to MakeHuman topology today

| Item | Where | Migration |
|---|---|---|
| Triangle list + 8 part weights per vertex | `shared.bin` (`pipeline/build_mannequins.py`), read in `app/src/body/mannequin.js:72-73` | Generate from G9: triangles of the level-1 quads; part weights = sums of G9 skin weights per bone group (`l_upperarm`, `l_forearm`, `l_shoulder`, `l_thigh`, `l_shin`, `head`, hands) |
| Rig landmarks per body | manifest `landmarks` | Already computed from G9 joints (`daz_landmarks`)[^daz-script] |
| Derived fields (`wArm`, `wHead`, `wLeg`, `armT`, keep/form fields, crotch, formLines) | `mannequin.js` | Recomputed from part weights + geometry; check thresholds |
| Egg head + neck extension (26 references) | `mannequin.js`, `render/engine.js` | **Removable**: G9 has a real head and neck; headless = cut under the chin |
| Arm-only pose skinning | `app/src/body/pose.js` | Keep for now (works from part weights); replace later with G9 skeleton (§4) |
| Skin landmarks, `projectFront`, region fields, reference surface | `body/landmarks.js`, `body/reference.js` | Geometric: rebuild automatically on the new reference body |
| Saved designs | 13 benchmarks `app/designs/b*.json`: ~1,330 raw `sp` anchors (face id + barycentrics); 6 POC designs have none | One-time conversion: MakeHuman `sp` → position on the wrapped `daz-young` body (which lies on the G9 surface, 0.4 mm p99 torso[^daz-bodies]) → closest point on G9 level 1. Add a mesh id to the document format (`"mesh": "g9-sd1"`) so old files are recognised and converted on load |
| MakeHuman bodies (child/teen/young/adult) | `app/public/mannequins/` | Replaced by G9 bodies; child/teen need Growing Up (§5) |
| Wrap machinery (most of `build_daz_bodies.py`: wrap, torso anchors, transfer, neck positions) | pipeline | **Deleted**: bodies become "evaluate morphs → subdivide → scale" |
| Tests | `app/test/body.test.js`, `pose.test.js`, `fields.test.js`, … | Re-baseline on the new mesh |

## 4. Posing

- Genesis 9 ships its skeleton and skin weights in the figure file (already read by `load_figure`)
  and **116 base joint corrective morphs** in `Morphs/Daz 3D/Base Correctives`, including exactly the
  leotard joints: `body_cbs_thigh_x115n/x90n/x35p/z90`, `body_cbs_pelvis_x25`, `body_cbs_shoulder_*`,
  `body_cbs_upperarm_*`, `body_cbs_spine1-3_*`. These are what keep the hip crease and armpit
  natural when bent.
- Two routes, not exclusive: **(a)** bake poses offline (Daz or the Python pipeline: skin + correctives
  evaluated → subdivide → position file per body × pose); exact, simple, grid-shaped. **(b)** in-app
  posing with the G9 skeleton, weights and correctives (spline formulas of joint angles), replacing
  `pose.js`; needed only if the designer poses freely. Start with (a).
- Daz-fitted garments (conforming or dForce, for fold detail) share the figure's topology and rig,
  so a posed plain leotard maps to our mesh by Daz's own correspondence, no transfer step.

## 5. Bodies and sizes

- Free Starter Essentials gives adult shapes only (current 4 Daz bodies).[^daz-bodies]
- **Growing Up for Genesis 9** (Zev0, $21.99) ages a figure from 5 years to adult, presets 5-6,
  9-10, young teen, older teen, adult; **Interactive License offered, $35**.[^growing-up]
- Because shapes are blendable morphs, a body can be solved to a size chart's chest/waist/hip/torso
  by optimising morph weights **[INFERRED]**, which suits per-maker size charts.

## 6. Licensing (applies with either canonical mesh)

- Each Daz product used in the app needs its own Interactive License; the product's creator decides
  whether one is offered at all.[^daz-il] G9 Starter Essentials $50, Growing Up $35; **check every
  pose pack before buying**.
- Content must "not be available to end users in their native formats" and be protected from
  theft; no distribution where it "can be separately exported, extracted, or de-compiled".[^daz-eula]
  Consequences: bundled body files must be obfuscated/encrypted; the app must **never offer a 3D
  mesh export** of a body or body-shaped garment. 2D pattern PDFs are 2D works, which the addendum
  allows **[INFERRED]**; confirm with Daz.
- Cloud delivery and post-install content updates are allowed below $1M annual revenue; above it
  only with Daz's written consent.[^daz-eula] A web-delivered app that downloads body files likely
  counts **[INFERRED]**.
- Wrapped bodies are already derived Daz content,[^daz-bodies] so keeping MakeHuman as the canonical
  mesh does **not** avoid these licences once Daz bodies ship; it only keeps a free fallback mesh.
- No mobile/iPad-specific terms found.

# Recommendation and phases

**Switch to Genesis 9 level 1 as the canonical mesh, after phase 0 confirms performance.**
Every week of building on MakeHuman topology adds benchmark anchors and body-specific code to migrate.

| Phase | Work | Done when |
|---|---|---|
| 0. Spike | Export G9 level 1 for `daz-young` with shared.bin-style part weights; load in the app behind a flag; time lift, cutting, flattening, frame cost | Frame and rebuild times within ~1.5x of today on the GTX 1650 |
| 1. Pipeline | New exporter: morphs → (pose) → subdivide → scale; part weights; landmarks; drop wrap code | All Daz bodies built without wrap |
| 2. App | Load G9 mesh; remove egg/neck special cases; re-tune field thresholds; re-baseline tests | Tests pass; headless and full forms render |
| 3. Designs | Convert 13 benchmarks; document `mesh` id + converter on load | Rehearsal screenshots match the MakeHuman versions |
| 4. Ages | Buy Growing Up (+ licence when shipping); child/teen bodies | Bodies match size-chart targets |
| 5. Poses | Offline baked poses with correctives (route a) | Leg-raised pose: clean hip crease |

Not yet verified: performance on level 1 (phase 0), iPad budget, Daz's view on 2D pattern export and
web delivery.

[^owner]: Product owner, 2026-10-20.
[^g9-dsf]: Measured by this agent from Genesis9.dsf in the owner's library, 2026-10-20.
[^daz-script]: pipeline/build_daz_bodies.py.
[^daz-bodies]: Daz Genesis 9 bodies.
[^doc-model]: Design document model.
[^daz-eula]: Daz 3D EULA, Addendum 3.0.
[^daz-il]: Daz Interactive License information page.
[^growing-up]: Growing Up for Genesis 9 store page.
