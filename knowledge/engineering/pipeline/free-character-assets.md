---
type: Reference
title: Free character assets added 2026-10-21 (Stacy, breasts pack, two hairs)
description: "What the owner's free downloads of 2026-10-21 are and how they could be used: Stacy (CaramelDream3D) and a breasts pack (HyperionStudio) are Genesis 9 morphs installed in the Daz library; the two hairs are Character Creator hair-card exports, not Daz content, and need refitting to Genesis 9 first. Stacy's face and skin are the app's person on every body since 2026-10-21 (Genesis 9 bodies); the rest is not wired into the pipeline yet."
tags: [daz, genesis9, morphs, hair, assets, pipeline]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-21T13:30:00Z }
sources:
  - id: inspection
    resource: "zips in C:/Users/mattj/Downloads (stacy for genesis 9.zip, breasts pack for g9.zip, female hair.zip, next-gen 3d female bun bangs hairstyle pbr real-time ready.zip, corset 1 for genesis 9.zip), inspected and installed by a Claude Code subagent 2026-10-21"
    title: Inspection of the downloaded packages
    author: claude-code/claude-opus-5-5
  - id: owner
    resource: conversation with the product owner, 2026-10-21
    title: Owner's note that the petite options may suit the non-child bodies
    author: human:mattj
---

# Takeaway

Two of the four downloads are ready for the bake pipeline (`pipeline/daz/bodies.py`); neither
changes the Genesis 9 topology the app relies on (25,182-vertex cage, no geografts, no HD morphs).
The two hairs need manual refitting before they can replace Eirgrid. Nothing is baked yet. Licence
terms are not stated in any of the packages: keep derived output local and git-ignored until each
store page is checked.

# Installed (Daz library `C:/Users/Public/Documents/My DAZ 3D Library/`, the base of `P9`)

| Package | Content | Use |
|---|---|---|
| Breasts pack (HyperionStudio, 5 files) | `data/DAZ 3D/Genesis 9/Base/Morphs/HyperionStudio/Breasts pack/{PB_01,PB_02,NB,BB_01,BB_02}.dsf`: chest-only shape sliders, -1..1, addressed by plain name | Effect at 1.0 at the bust apex: PB_01 -0.27 cm forward, PB_02 -0.55 cm (the "petite" pair: smaller, flatter); NB +1.5 cm; BB_01/02 +4-5 cm. Owner idea: petite options on the non-child bodies. **[INFERRED]** start values: teen PB_01 0.6, older-teen PB_01 0.8, petite PB_02 1.0 (with BreastsFlatten lowered); not on `young`, the reference body every design's measured lines come from |
| Stacy (CaramelDream3D, 110 files) | morphs `CD Stacy Body` (full body, 0..1, with joint formulas) and `CD Stacy Head` (face); presets `People/Genesis 9/Characters/CaramelDream3D/Stacy/`; `MATERIAL/Stacy Skin.duf` (same 7 surfaces and shader as the G9 Feminine skins, 4K maps), eye, lash, lip and make-up presets | A slim, small-busted adult (chest 23 cm wide vs 27 cm Base Feminine). **Used since 2026-10-21** (owner's choice): her face (`CD Stacy Head` 1), skin, eyes and lashes on every body, not her body morph ([Genesis 9 bodies](/engineering/pipeline/g9-bodies.md)). Her skin puts a micro-detail roughness map in Detail Normal: check the head shading |

# Not installed

- **Two hairs** (a short style with a small high bun, ~5.4k vertices; a high bun with bangs,
  ~52k vertices of hair cards): Reallusion Character Creator exports (Maya, Blender, FBX, OBJ,
  Unreal), placed on a Character Creator head, no rigging, no Daz files. To use one: fit it to the
  bare Genesis 9 head in Blender, then either make it a Daz wearable (Transfer Utility, head bone)
  and list it instead of `EIRGRID`, or attach it in `convert_bodies.py` with the head bone's rigid
  move per pose plus `hair_shift`. Either is 1-10 % of Eirgrid's 428k vertices. The app draws every
  `dazhair` mesh today, so more than one hair needs a hair choice keyed by node.
- **Corset 1 for Genesis 9** (DigitalDrift clothing) was also in Downloads; the owner did not list
  it, so it was left alone.
