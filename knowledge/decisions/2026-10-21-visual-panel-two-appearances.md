---
type: Decision
title: Visual side panel, two body appearances, one skin tone on every body
description: "Owner decisions of 2026-10-21: the side panel becomes picture tiles (no drop-downs where a choice can be shown), the moodboard designs B1-B13 are the presets and the POC looks are retired, the body is shown either as a headless plastic mannequin or as a realistic person, and the person keeps one skin tone at every age and build (a tone picker is fine because it re-bakes nothing)."
tags: [decision, ux, side-panel, body, skin, presets]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-21T13:00:00Z }
sources:
  - id: owner-2026-10-21
    resource: conversation with the product owner, 2026-10-21 (Claude Code session)
    title: Owner's request to revamp the side panel and simplify the body choices
    author: human:mattj
---

# Decision

The owner asked to turn the designer app from a proof of concept into a complete tool, starting
with the right-hand panel.[^owner-2026-10-21]

1. **Visual choices.** "In almost all cases we don't need a drop-down": anything that can be shown
   is a rounded square tile with a picture (pre-rendered or rendered on the spot) and its name
   underneath, in rows that scroll sideways.
2. **Presets are the moodboard designs.** The 13 rebuilt moodboard designs (B1-B13,
   `app/designs/`) load from the panel. The six proof-of-concept looks ("boring") are removed, and
   so is everything in the interface that says POC or looks unpolished.
3. **Two appearances only.** *Mannequin*: the same body shape, no head, a plastic finish.
   *Realistic*: the whole person with face, hair and realistic skin. Dress form, mannequin head,
   athlete-skin finishes and the other combinations leave the interface.
4. **The character is consistent across age and build.** Skin may be changeable later "if it does
   not expand the baked render grid"; otherwise stay with a light (Caucasian) skin for now.
   **[INFERRED]** Skin is a texture set laid over Genesis 9's shared UVs, not baked into a body, so
   a tone picker costs nothing to bake: the app offers Light (default), Medium, Tan and Deep.
   *Superseded the same day*: the person is Stacy in her own skin, with no tone picker
   ([owner review](/decisions/2026-10-21-owner-review-presets-poses-stacy.md)).
5. Realism (does the character, lighting, environment and material look real?) stays an active,
   ongoing goal; the owner added five studio HDRIs for it.

# Consequences

- Implementation: [side panel and presets](/engineering/app/side-panel-and-presets.md).
- The interface no longer offers the dress form, the mannequin head or the athlete skins; the
  engine and the command surface still support them, so older design files open unchanged.
- Body type, pose and expression remain choices (tiles); they are part of "who wears it", not of
  the appearance.
