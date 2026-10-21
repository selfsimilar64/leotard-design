---
type: Component
title: Genesis 9 bodies, poses, expressions and heads (pipeline/daz/bodies.py)
description: "The app's canonical mesh is Daz Genesis 9's cage subdivided once (100,676 vertices); Daz Studio bakes 8 body types in the A-pose, 8 Skillful Routine poses and 5 one-arm presets per side, plus 4 expressions; the app combines body, pose, expression and head (none, mannequin, person) at run time. Replaces the MakeHuman mannequin and the wrapped Daz bodies."
tags: [pipeline, component, daz, genesis-9, canonical-mesh, pose, expression, head, migration]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-21T08:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-21 (Claude Code session)
    title: "Migrate to Genesis 9 first; pose, body, expression and head as separate selections"
    author: human:mattj
  - id: bodies
    resource: ../../../pipeline/daz/bodies.py
    title: pipeline/daz/bodies.py, bake_bodies.dsa, convert_bodies.py, pipeline/g9.py
    author: claude-code/claude-opus-5-5
  - id: app
    resource: ../../../app/src/body/mannequin.js
    title: app/src/body/mannequin.js, pose.js, subdivide.js; app/src/render/figure.js; app/src/doc/migrate-g9.js
    author: claude-code/claude-opus-5-5
  - id: feasibility
    resource: /engineering/architecture/genesis9-as-canonical-mesh.md
    title: Genesis 9 as the canonical mesh (feasibility)
---

# Takeaway

Since 2026-10-21 every body in the app is **Daz Genesis 9**, and the mesh every design is anchored
to is Genesis 9's base cage subdivided once (Catmull-Clark): **100,676 vertices, 201,248
triangles**. The owner asked for this migration before anything else, and asked that pose, body
type, expression and head be separate choices.[^owner] Because every body, pose and expression is
the same mesh, the app combines them at run time: Daz Studio bakes each body type in each pose
(with Genesis 9's joint correctives), and the app only subdivides cages and adds changes.[^bodies]
The MakeHuman mannequin and the wrapped Daz bodies are gone; designs saved on them are converted
on load. All output is derived from the owner's licensed Daz content and stays local (git-ignored).

# Choices (document `body` section)

| Field | Values | Notes |
|---|---|---|
| `size` (body type) | `child-6`, `child`, `teen`, `older-teen`, `petite`, `young` (reference), `adult`, `broad` | Growing Up ages and character controllers; scaled to a stature |
| `pose` | arm poses (`a-pose`, `arms-down`, `hands-on-hips`, … or `{ left, right }` of `rest/down/front/thigh/hip/up`), Daz poses (`standing`, `arms-outstretched`, `one-arm-up`, `passe`, `releve-arms-up`, `split-leap`, `stag-jump`, `kneeling`) | arm poses keep the old names, so photo-matched designs keep their pose |
| `head` | `none` (cut flat under the chin), `mannequin` (bald head, smoothed), `person` (face, eyes, mouth, lashes, brows, Eirgrid hair) | replaces `form: 'headless'` and the `fig-*` scene bodies |
| `expression` | `neutral`, `smile` (SR 13, teeth), `soft-smile` (SR 26), `focused` (SR 16) | person only |
| `form` | `full`, `torso` (dress form) | |

Old documents (no `mesh` field) are migrated by `doc/migrate-g9.js`: `form: 'headless'` becomes
`head: 'none'`, `daz-*` sizes their new keys, `fig-*` the young adult with `head: 'person'`.

# Pipeline (pipeline/daz/)

1. **Stage 1** (`bodies.py --stage1`, `bake_bodies.dsa`, one Daz Studio launch, ~1 min a body):
   per body, Genesis 9 with its skin MAT, Growing Up age or character controller, morphs and the
   Eirgrid hair; then each pose: zero pose, the pose preset, the neutral face (Skillful Routine
   poses carry their own face), then arm aims. Written as `.pts` (raw cached-geometry positions,
   cm, every figure) and `.bones.json` (joint origins, ends, world rotations). **Pitfall:** a bone
   turned by Daz Script (`setValue` on a rotation control) moves the joints at once but not the
   cached mesh; a pose preset does refresh it. Without `getObject().forceCacheUpdate(node)` before
   reading `getCachedGeom()` every aimed arm came out in Genesis 9's default stance. Each expression on
   the A-pose (face figures only). The **bare** figure (no shape, default pose) once, with the OBJ
   export: topology, UVs, and where lashes, brows, tear film and hair roots sit on an unshaped skin.
2. **Arm aiming** (`aimArm` in the DSA): upper arm Front-Back, Bend and Twist plus forearm Bend,
   solved together by damped Gauss-Newton with numerical derivatives (limits lifted; a tiny pull
   keeps twist small), so the upper arm points along a direction and the forearm along a direction
   or at a point. The **A-pose** is the old mannequin stance (upper arm 13 degrees from vertical,
   slightly forward; elbow bent 14 degrees forward). Residual about 0.01 (direction units).
3. **Stage 2** (`--stage2`): the arm presets of the old `pose.js` (down, front, thigh, hip, up),
   aimed at each body's own landmarks measured on its stage-1 A-pose (crotch, waist, belly front,
   head top); one arm at a time, the other in the A-pose. 'up' lifts the collarbone 25 degrees
   first. Residuals 0.02-0.07 (a few degrees; 'down' is the loosest).
4. **Convert** (`convert_bodies.py` -> `app/public/g9/`): cages scaled to the stature (metres,
   feet at 0); canonical triangles and part weights (Genesis 9 skin weights summed per app part:
   shoulder = collar, upper arm incl. twist bones, forearm, upper leg, lower leg incl. foot, head =
   the head bone's subtree, hand); landmarks from the joints; the headless cut plane per body
   (`neck_plane`: under the chin at the front, base of the skull at the back); the person's render
   topology; per pose the eyes and mouth cages and the hair re-attached to the scene's skin
   (`hair_shift`); expression changes; materials and textures; the MakeHuman migration map and the
   design frame (below).

# In the app

- **Subdivision**: `body/subdivide.js` builds the Catmull-Clark stencil (sparse matrix) from the
  cage polygons; it is the twin of `pipeline/g9.py cc_stencil` and must give the same vertex order
  and positions: `Mannequin` checks the triangles against `topology.bin` at load and
  `test/subdivide.test.js` the positions (Python writes a check copy). Cage to canonical: 134 ms to
  build, 11 ms to apply; canonical to the person's skin (402,600 vertices): 520 ms, 41 ms.
- **Poses** (`body/pose.js`, `Mannequin.cageOf`): a Daz pose is its cage; an arm pose is the A-pose
  plus each posed arm's change from its own bake, so every left/right mix works without a bake per
  combination (the torso's change from one arm is tiny; checked by `test/pose.test.js`).
- **Mannequin head** (`sculptHead`): 30 Taubin passes over the head bone's skin weights (fading
  in from the neck), softening eyes, lips, nostrils and ears into a sculpted head.
- **Person** (`render/figure.js`): skin = cage plus the expression's change (turned by the head's
  rotation in the pose) subdivided twice; eyes and mouth from their per-pose cages, subdivided once;
  lashes, brows and tear film bound to the skin (Daz moves them with bones but not with head shape
  morphs, see [figure scenes](/engineering/pipeline/daz-figures.md)); hair per pose (arm poses use
  the A-pose's). The occlusion bake runs on every change.
- **Design frame** (`man.design`): each canonical vertex's position on the old MakeHuman reference
  body, through the same correspondence the wrapped Daz bodies were fitted with (the MakeHuman mesh
  wrapped onto the same Kat body). Block fields (`garment/blocks.js`), the POC's region fields, the
  dress-form tape lines, the POC's stone patterns (`refY`) and the `{ p }` / `{ front }` / `{ back }`
  point specs are evaluated there, so their numbers (measured on MakeHuman) still draw the same
  lines; the rig landmarks and the measured `formLines` (bust, natural waist) are the Genesis 9
  body's own.
- **Migrating designs** (`doc/migrate-g9.js`): every surface point `{ f, b }` of a document without
  `mesh` is evaluated on the MakeHuman vertices' positions on the reference body and replaced by the
  closest point of the reference body's own surface; the document gets `mesh: 'g9-sd1'`. Runs on
  load (the autosave too, once the bodies are loaded).

- **The head is not garment**: Genesis 9's head is one surface with the neck (MakeHuman's egg head
  was a separate piece, a border every cell stopped at). `body/reference.js` lists the edges between
  head and neck faces (head bone skin weight 0.5) as `surface.barrier`, and `buildArrangement` adds
  them as constraints of no curve. Without it B5's high back panel covered the whole head.

# Cost (GTX 1650, 1792x1344, B9 crystal rain, 2026-10-21)

| Measure | Before (MakeHuman, same machine and session) | Genesis 9 |
|---|---|---|
| Frame, white seamless rig | 33.9 ms | 35.2 ms |
| Frame, arena rig | 30.3 ms | 32.5 ms |
| Frame, arena, no glow (bloom) | 17.7 ms | 18.0 ms |

The canonical mesh costs 1-2 ms a frame; the glow pass alone is about 12 ms (switchable in the
Display settings). Earlier numbers in these notes (9.8-15 ms) were measured in another session and
are not comparable. Body or pose change: about 1.8 s (lift 0.5 s; contact darkening was 3.4 s on
the denser mesh until it searched only the other side's cells: 0.1 s). Person: first show about
5-7 s, new expression about 2.5 s (occlusion bake: depth packed into bytes, only the head re-baked).
Data: about 560 MB in `app/public/g9/` (per pose 5 MB for the hair).

# Open

- Hair: only Eirgrid (long braids) is installed with an Interactive License option unknown; a
  competition bun or ponytail needs a purchase ([figure scenes](/engineering/pipeline/daz-figures.md)).
- Arm-pose aims are a few degrees off their targets ('down' worst); tighten if a photo match needs it.

[^owner]: Product owner, 2026-10-21.
[^bodies]: pipeline/daz/bodies.py and its stages.
[^app]: The app's body and figure modules.
[^feasibility]: Genesis 9 as the canonical mesh (feasibility).
