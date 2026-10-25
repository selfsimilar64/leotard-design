---
type: Decision
title: "Owner fabric review: default texture sizes, softer wet look, smooth foils, seven fabrics removed"
description: "Owner review of 2026-10-24: per-fabric default texture sizes (matte lycra 185%, mystique 75%, liquid hologram and oil-slick foil 325%, pink organza 125%, pink oil-slick vegan leather 400%); wet look toned down from latex to cire; the foils, film, chrome and velvets lose their crinkle bump; lace, shattered glass hologram and five scanned fabrics leave the picker, with old designs falling back to a stand-in."
tags: [decision, fabric, materials, wet-look, texture-size]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-24T22:30:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-24 (Claude Code session, relayed by the parent session)
    title: Owner review of the app's fabrics
    author: human:mattj
  - id: cire
    resource: https://www.dictionary.com/browse/cire
    title: "Dictionary.com: cire"
    author: org:dictionary-com
  - id: glazing
    resource: https://www.encyclopedia.com/fashion/encyclopedias-almanacs-transcripts-and-maps/glazing
    title: "Encyclopedia.com: glazing (cire on thermoplastic fibres)"
    author: org:encyclopedia-com
---

# Decision

The owner reviewed every fabric in the material picker and asked for four changes.[^owner]

1. **Default texture size per fabric** (the piece's Texture size slider starts here): matte lycra
   185%, mystique 75%, liquid hologram 325%, oil-slick foil 325%, pink organza with glitter (scan
   TX-00007116) 125%, pink oil-slick iridescent vegan leather (scan TX-00004730) 400%. Every other
   fabric stays at 100%.
2. **Wet look looked like latex.** Cire is a wax, heat and calender finish: hot rollers glaze the
   fabric's own (thermoplastic) fibres flat, so the gloss is in the knit, not in a rubber skin over
   it.[^cire][^glazing] The bundle's gloss ladder already puts the latex-like coated "Liquid" one
   step above wet look ([shiny tricot and wet look](/domain/fabrics/shiny-tricot-and-wet-look.md)).
   The render's full mirror clear coat (1 at roughness 0.1) reflected the room as latex does, so it
   was toned down to a softer, grain-streaked shine with the knit faintly under it.
3. **Liquid metallic foil, stretch velvet, oil-slick foil, duochrome foil, iridescent film, mirror
   chrome and crushed velvet were far too bumpy.** None of them has a scanned texture: all seven
   carried the POC's procedural value-noise "crinkle" bump (amplitudes 0.1-0.7, cells 3-20 mm),
   which modelled crumpled foil and crushed pile rather than fabric stretched tight over a body. On
   the metals every small tilt shows as a broken reflection, which made the effect worse. The bump
   is gone from all but crushed velvet, which keeps a faint crush (amplitude 0.7 to 0.12, 7 to 12 mm
   cells); the foils, film and chrome take the fine tricot knit instead (the knit under the foil).
4. **Removed from the app:** Opal metallic double knit (TX-00006026), Lace (app fabric), Black mesh
   tulle (TX-00005344), Green tricot with holofoil dots (TX-00004683), Royal blue scuba
   (TX-00001482), Pink glitter double knit (TX-00003863), Shattered glass hologram (app fabric).

# Consequences

- `FABRICS[k].texScale` and `SCAN_SCALE` in `app/src/materials/fabric.js` hold the defaults;
  `texScaleOf(look)` is the one reader (panels, straps, finished edges, picker tiles, the slider).
  Changing a piece's fabric or scan clears its own texture size so the new default applies.
- A design that names a removed fabric opens with a stand-in (`RETIRED_FABRICS`: lace to stretch
  mesh, shattered glass to hologram foil dots); a removed scan is dropped and the piece shows its
  base fabric (`doc/schema.js` `retireFabrics`). B1 and B12 were resaved on stretch mesh.
- TX-00001482 leaves the picker but stays loadable: it is matte lycra's own default scan
  ([photo match: matte lycra](/engineering/rendering/fabric-shading/photo-match-matte-lycra.md)).
- Implementation notes: [studio and fabric looks](/engineering/app/studio-and-fabric-looks.md).

[^owner]: Owner's fabric review, 2026-10-24
[^cire]: Dictionary.com, "cire": a glazed surface from wax, heat and calendering
[^glazing]: Encyclopedia.com, "glazing": cire uses very hot friction-calender rollers; thermoplastic fibres partly fuse and flatten, making it permanent
