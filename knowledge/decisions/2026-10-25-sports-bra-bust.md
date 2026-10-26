---
type: Decision
title: "Sports-bra bust: Daz BreastsFlatten at 1 and In-Out at 0.5 on every body past childhood"
description: "Owner decision of 2026-10-25: the bodies' natural bust read wrong for an athlete in a sports bra or lined leotard. Every body from the young teen up is baked with body_ctrl_BreastsFlatten 1 and body_ctrl_BreastsIn-Out 0.5; only shape and pectoral controls, re-applied after each pose preset so they hold in all poses. Extending flatten past 1, the HyperionStudio shapes, lift and a procedural compression shape were compared and set aside for now."
tags: [decision, bodies, daz, genesis-9, bust, pose]
status: deprecated
superseded_by: /decisions/2026-10-25-sports-bra-cloth-bust.md
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-25T12:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-24 to 2026-10-25 (Claude Code session), reviewing comparison renders in app/captures/bust-flatten/ (git-ignored)
    title: Owner review of bust flattening, lift, in-out and custom compression renders
    author: human:mattj
  - id: bodies
    resource: ../../pipeline/daz/bodies.py
    title: pipeline/daz/bodies.py BUST and bake_bodies.dsa reshape()
    author: claude-code/claude-opus-5-5
---

# Decision

**Superseded** by the [sports-bra bust by taut cloth](/decisions/2026-10-25-sports-bra-cloth-bust.md) (built into the bodies 2026-10-26).

Every body past childhood (`teen`, `older-teen`, `petite`, `young`, `adult`, `broad`) is baked with
`body_ctrl_BreastsFlatten` 1 and `body_ctrl_BreastsIn-Out` 0.5 (`bodies.py BUST`); the children
are unchanged. Only changes that hold in every pose are used.[^owner]

# Context

The owner judged the natural Daz bust wrong for an athlete wearing a sports bra.[^owner] Before,
only `petite` had flatten (0.5), and it was lost in every Skillful Routine pose (below).

What was compared (young adult, A-pose, renders in `app/captures/bust-flatten/`):

| Tried | Result |
|---|---|
| `body_ctrl_BreastsFlatten` 0.5 / 0.75 / 1 | Bust brought back up to about 1 cm at the front (max surface change 2.2 cm); separate breasts and the under-bust crease stay. Owner: 100% "at least better" |
| Flatten above 1 | Clamped by Daz (channel `clamped`, max 1): 1.5 and 2 bake identical to 1. Extrapolated in Python (`cur + k * (f100 - cur)`): barely smaller, odd dents |
| `body_ctrl_BreastsUp-Down` (lift) | A few mm up; a pose control (pectoral bone rotation), not a shape |
| `body_ctrl_BreastsIn-Out` | Pose control: drives `l/r_pectoral` Y rotation (via `body_ctrl_l/rBreastSide-Side`, x10 degrees); at +1 the breasts swing about 0.4 cm toward the midline (max 1.5 cm) and 0.3 cm forward. Kept at 0.5 |
| `body_ctrl_BreastsHangForward` -0.5 | No effect (the control does not go below 0) |
| HyperionStudio breasts pack (PB_01, PB_02, NB, BB_01, BB_02) | Owner: too much uncompressed shape; set aside |
| Procedural compression (smoothing inside a bust mask, along normals, plus a press) | Closest to a sports bra (one merged bust, no crease) but left a seam at the mask edge, or the crease came back with a softer blend. Not pursued for now |

Add-ons with sports-bra pressure morphs exist (NG Cotton Bras Volume 2; JW Breast Control
Expansion's press morphs), not bought.

# Consequences / how to apply

- **Pose presets reset the bust.** Every Skillful Routine pose (all 30) writes 0 to
  `body_ctrl_BreastsFlatten`, its L/R shapes, HangForward, In-Out, Side-Side, Up-Down and the
  pectoral rotations. `bake_bodies.dsa` now calls `reshape()` (the job's morphs again) after each
  pose preset and the neutral face. The SR expressions touch none of them.
- The reference body `young` changed shape at the bust; designs are anchored to the shared
  topology, so lines move with it.
- Re-bake: `python pipeline/daz/bodies.py teen older-teen petite young adult broad` (stage 1, 2,
  convert).

# Revisit if

- The owner wants the crease and separation gone: a pressure-morph add-on, or the procedural shape
  with a membrane (outward-only bridging like the garment lift) instead of masked smoothing.
- A pose shows the in-out swing fighting the pose (the pectoral bones are posed by it).

[^owner]: Product owner, 2026-10-24/25: "Compression 100% is at least better"; "let's stick with just shape changes that way they translate properly to poses"; "Let's just go with 100% compression for now. Adding some in-out +0.5 or +1 would be nice if it carried along to poses by default."
