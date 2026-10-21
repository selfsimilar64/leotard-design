---
type: Component
title: Daz figure scenes (real person renders)
description: "pipeline/daz/bake.py has Daz Studio 6 itself apply Genesis 9 skin, Growing Up age, Skillful Routine pose and expression (scripted, unattended), exports the posed figures as OBJ, and convert.py turns them into app render meshes (skin, eyes, mouth, lashes, brows) plus procedural competition hair (slicked back into a bun with a scrunchie); the mannequin mesh is carried onto the posed body so every leotard design fits it unchanged."
tags: [pipeline, component, daz, genesis-9, figure, head, face, hair, pose, age, licensing]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-21T02:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-20 (Claude Code session)
    title: "Daz pose and age packs bought; try heads and faces that are not uncanny; bun or ponytail; blank or smiling"
    author: human:mattj
  - id: bake
    resource: ../../../pipeline/daz/bake.py
    title: pipeline/daz/bake.py, bake_scenes.dsa, convert.py, hair.py
    author: claude-code/claude-opus-5-5
  - id: figure
    resource: ../../../app/src/render/figure.js
    title: app/src/render/figure.js (FigureView)
    author: claude-code/claude-opus-5-5
  - id: daz-bodies
    resource: /engineering/pipeline/daz-bodies.md
    title: Daz Genesis 9 bodies
  - id: daz-eula
    resource: https://www.daz3d.com/eula
    title: Daz 3D EULA, Addendum 3.0 (Interactive License)
    author: org:daz3d
---

# Takeaway

The app can show a **real person** wearing the leotard: a Genesis 9 figure with a textured face,
eyes, teeth, lashes and brows, an age from 6 to adult, a gymnastics pose and a smiling or neutral
expression, with competition hair slicked back into a bun. Daz Studio does everything Daz-specific
(shaping, ages, poses, expressions, joint correctives, fitting the eyes, mouth, lashes and brows),
scripted and unattended; our code only converts and renders.[^bake] The leotard is the app's own:
the mannequin mesh is carried onto the posed Daz body through Genesis 9's shared topology, so every
design fits without change.[^daz-bodies] Output is local only (git-ignored), as for the Daz bodies.

# Pipeline (pipeline/daz/)

1. **bake.py** writes `out/jobs.json` (one job per scene in `SCENES`) and runs
   `DAZStudio.exe -noPrompt -scriptArg jobs.json bake_scenes.dsa` (Daz Studio 6.25, ~45 s a scene,
   one launch for all jobs; it opens its window and quits by itself).
2. **bake_scenes.dsa** per job: clear scene, load `People/Genesis 9/Genesis 9.duf` (figure plus
   eyes, mouth, lashes, card brows, tear film), apply the presets in order with Genesis 9 selected
   (skin MAT, Growing Up age, pose, expression, Pixie hair), drop unwanted nodes (`remove`: the Pixie
   strands), set morphs/controllers by name (`Kat_figure_ctrl_Character`, `facs_ctrl_MouthSmile`),
   set every figure to base resolution, export `scene.obj` (cm, all figures, one vertex block per
   node marked `# <node>`), `materials.json` (every Iray material property with its map path; maps
   Daz composites into its temp folder, the eyes' colour, are copied beside the scene first, since
   the next job overwrites them) and `bones.json` (joint origins).
3. **convert.py**: splits the OBJ by node, checks Genesis 9's face list against `Genesis9.dsf`
   (vertex order), and writes `app/public/figures-daz/`:
   - `<key>/body.bin`: the mannequin mesh moved from the wrapped young adult (`daz-young.bin` on its
     Daz surface) onto this scene's subdivided Daz surface by `transfer()` (build_daz_bodies.py).
   - `<key>/figure.json/.bin`: render meshes. Skin Catmull-Clark twice (~805k triangles), eyes and
     mouth once, lashes, brows and tear as they are; UVs subdivided linearly per face (UV seams
     stay seams), UDIM tiles folded back to 0-1, normals from the welded mesh.
   - `textures/`: Daz maps resized (head colour and normal 4096 px, the rest 2048).
   - `manifest.json`: each scene as a body (`fig-<key>`) with `figure`, landmarks from the bones.
4. **hair.py**: competition hair (below).

**Followers re-attached (convert.py `follower_positions`).** Daz Studio moves the brows, lashes,
tear film and the hair cap with the bones but **not with the head's shape morphs** (Growing Up,
characters), at least in a scripted base-resolution export: measured against the scene's skin, the
brows sat 4 mm under it on the 9-year-old (invisible), up to 9 mm off on the 6-year-old, half buried
on the young teen (sparse, dotted brows); the cap 3-11 mm inside the scalp. A `rest` scene (bare
Genesis 9 plus the cap, no presets) is baked first; each follower vertex is bound to the rest skin
and carried to the scene's skin with `transfer()` (shared Genesis 9 topology), only over the skin
within 3 cm of it. The eyes and mouth follow their bones correctly and are left as Daz exports them.

# Hair (hair.py)

**Owner's verdict (2026-10-21): "the custom hair genuinely looks so bad"; try the built-in Daz hair
presets instead.** The procedural hair below is kept as a record of what was tried, not as the
direction. Scenes can now load Daz's own hair (`daz_hair` in bake.py: Eirgrid, the Pixie cut);
see *Daz hair* below.

No installed Daz hair is a bun or ponytail (Eirgrid: long braids; Pixie: short; Charm and Basic Hair
are Genesis 2). Gelled competition hair is close to a shell over the scalp, which real-time
rendering does well, so it was built:
- **Base:** the G9 Pixie hair's scalp cap (Starter Essentials), loaded in the bake with its strands
  removed, re-attached to the scene's skin like the other followers (below). The cap file carries a
  few unused vertices (one behind the shoulders): use only face vertices.
- **Shell:** cap subdivided twice, raised 0.2-3.4 mm (hugging the skin near the hairline: a thicker
  edge read as a fringe). The Pixie cap's front is a
  fringe line, so the hairline is re-cut in the head frame: ~5.6 cm above the eyes at the centre,
  a temple corner at ~58 degrees, then straight down in front of the ear to just below eye level
  (azimuths about the middle of the cranium; about the head joint, which sits at the skull base,
  the temples counted as forehead and went bald). `fade` (0 at the hairline over 16 mm) breaks the
  edge up strand by strand in the shader.
- **Bun** on the crown, 35 degrees behind the top (a high bun), a slightly twisted dome; **scrunchie**
  round its base (colour per scene). Strand direction (tangent) combs everything towards the bun.
- Head scale from the eye spacing (62 mm adult). Colours per scene (`HAIR`, `TIE` in bake.py).

# Daz hair (built-in presets)

`daz_hair` in a scene loads a Daz hair figure (and its material preset, applied to that node:
presets may be `[path, node name part]`). convert.py renders any figure it does not know as
`dazhair` (Daz colour, cut-out and bump maps; alpha to coverage, both sides). Tried 2026-10-21:
- **Pixie cut** (G9 Starter Essentials, dForce strand hair): exported as 43,510 polylines (`l` lines
  in the OBJ); `hair.strand_ribbons` turns each into a ribbon 0.7 -> 0.2 mm wide lying along the head
  (~610k triangles), strand material `strands` (anisotropic highlight across the strands, alpha
  across the ribbon and at the tip). Its scalp cap renders as `dazhair` under the strands. Reads as
  real hair. Not a competition style.
- **Eirgrid** (AprilYSH, long braids, 428k vertices, 521k triangles): good on the adult (Amala).
  On the young teen (Growing Up + Kat) the braids sank into the scalp: Daz hairs follow the bones but
  not the head's shape, like the other followers. `hair_shift`: the hair's vertices within 6 mm of
  the bare figure's skin (roots) are carried to the scene's skin; every other vertex moves rigidly
  with its nearest root. Needs the hair in the `rest` bake.
- Daz colour values are display (sRGB) values: convert with `setRGB(..., SRGBColorSpace)`.
- OBJ material names get the node's name appended when a surface name repeats another figure's
  (`Head` on the cap -> `Head_dForce_Pixie_Hair_Cap`): match by prefix.
- **Competition styles need a purchase**: no installed hair is a bun or ponytail. A Genesis 9
  bun or high-ponytail hair (polygon cards, not dForce strands, for size) with an Interactive License
  option would drop into this pipeline as one more `daz_hair` preset.

# Rendering (app/src/render/figure.js)

`FigureView` loads a scene when the body has `figure`; the engine hides the mannequin's skin and
stand (the leotard, stones and trims are drawn as on any body).[^figure]
- **Skin:** MeshPhysicalMaterial with Daz colour, normal (`Detail Normal Map` on the head) and
  roughness maps (roughness x0.7, specular 0.45: Daz's sharper lobe dominates). Diffuse light
  is wrapped round the terminator per colour channel (red furthest), weighted by Daz's
  translucency map: a cheap subsurface stand-in (three r186 keeps that line inside the
  `lights_physical_pars_fragment` chunk, so the chunk is inlined and patched; a replace on the
  material's own shader text silently missed it). Under the hair (`aScalp`, nearest hair-shell vertex)
  the skin takes the hair colour, 0.45 already at the hair's edge: Daz paints the scalp pale and it
  showed through the thin hairline as a light band. **Not** Daz's `*_SO` map: it is a specular-occlusion
  mask averaging 0.07; used as aoMap it removed nearly all ambient light (skin looked like dark
  glossy plastic).
- **Occlusion bake** at load (~3.5 s): depth maps from 96 directions, whole figure then the head at
  10x resolution; per-vertex `aOcc` darkens ambient light, and direct light too on eyes, teeth and
  lashes (lids and lips shade them; a 1024 px shadow map cannot). Without it eyes and teeth glow.
- **Eyes:** the clear outer film adds reflections only (additive) and is drawn only where the eyeball
  is the visible surface (stencil written by the eyeball; the composer target has a stencil buffer):
  it poked through the smoothed lids as a glassy bubble.
- **Lashes and brows:** alpha to coverage with opacity > 1 (thin strands keep coverage at a
  distance); brows take the scene's hair colour x0.6 (Daz's tint reads grey without its glossy layer).
- **Hair:** streak texture along the combing direction, anisotropic highlight across the strands,
  sheen, hairline break-up from `fade`.

# Cost (GTX 1650, 1792x1344, design B8, 2026-10-21)

| Body | ms / frame |
|---|---|
| Daz mannequin (daz-young) | 28.9 |
| Figure, face, procedural hair (~1M triangles) | 29.9 |
| Figure + Pixie strands (+610k triangles) | 34.5 |
| Figure + Eirgrid (+521k triangles, alpha cards) | 46.3 |

The face costs almost nothing; hair dominates (Eirgrid's overlapping cut-out cards most of all).
Load: textures ~260 MB of JPEG for six scenes; occlusion bake 3.5 s (more with a hair mesh).

# Presets: what to use

- **Expressions** (Skillful Routine): 13 *Smiling* shows teeth (a competition smile); 26 and 29 are
  closed-mouth smiles; 27 *Soft Smile* **closes the eyes** (looks asleep); `0 Expression` is neutral.
  Poses carry their own face (pose 05 opens the mouth): apply the expression after the pose.
- **Characters** by controller morph: the character presets (`Characters/*.duf`) open an "apply to
  selected?" dialog even with `-noPrompt`, which ends the unattended run.
- **Growing Up** ages: 5-6, 9-10, young teen, older teen, adult; its assist morphs reference
  *Genesis 9 Body Morphs* (not installed): warnings only.
- `build_daz_bodies.py` reads only `Morphs/Daz 3D` (Growing Up's compressed files and neutralizer
  formulas would change the existing recipes).

# Licensing

As for the [Daz bodies](/engineering/pipeline/daz-bodies.md): shipping needs an Interactive License
per product used (Genesis 9 Starter Essentials, Growing Up, Skillful Routine poses), content
protected from extraction, no mesh export.[^daz-eula] Until then everything stays local.

[^owner]: Product owner, 2026-10-20
[^bake]: pipeline/daz/
[^figure]: app/src/render/figure.js
[^daz-bodies]: Daz Genesis 9 bodies
[^daz-eula]: Daz 3D EULA
