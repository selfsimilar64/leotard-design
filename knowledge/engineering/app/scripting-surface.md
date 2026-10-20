---
type: Component
title: Scripting surface (window.app)
description: "The designer app's command API, window.app: every designer action as an undoable command (app.exec), point specs for naming places on the body, reference photos and colour matching, saving, capturing and comparing; the surface an agent uses to rebuild a photographed leotard with the designer's own tools."
tags: [app, api, commands, component, recreation-test]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-19T12:00:00Z }
sources:
  - id: code
    resource: "app/src/app.js, doc/store.js, doc/commands-*.js, curves/points.js (branch build/designer-app, 2026-10-19)"
    title: App scripting source
    author: claude-code/claude-opus-5-5
  - id: test
    resource: /decisions/2026-10-18-moodboard-is-the-acceptance-set.md
    title: "Decision: the moodboard is the acceptance set (test conditions)"
---

# Takeaway

Everything a designer can do is a command, so the owner's recreation test can be driven through
`window.app` with exactly the designer's tools.[^test] `app.commands()` lists every command and
its arguments at runtime (the same text as below); this concept is the guide.[^code]

# Calls

| Call | Does |
|---|---|
| `app.exec(cmd)` / `app.exec([cmd, ...])` | Run one command, or a list as one undo step; returns the command's result (new ids). Throws with a readable message and changes nothing on bad input; check each result before the next step that depends on it. |
| `app.undo()`, `app.redo()`, `app.history()`, `app.endGesture()` | History; end a drag-style run of commands (re-cuts the garment) |
| `app.doc` | The design (read only; change it with commands) |
| `app.save(name)`, `app.open(name)`, `app.designs()`, `app.new(name)` | `app/designs/<name>.json` |
| `app.view('front' \| 'back' \| 'left' \| 'right' \| 'three-quarter' \| 'back-three-quarter' \| { position, target, fov })` | Camera |
| `app.capture(name, { view, width, height, overlay })` | PNG to `app/captures/` (editing lines hidden unless `overlay: true`) |
| `app.sideBySide(name, { src, crop, view, height })` | A photo (or crop) beside a render, no camera solve needed: for judging fabric and colour |
| `app.swatchSheet(name, { colour, second, colour2, fabrics })` | Contact sheet of fabric swatches |
| `app.addReference(src, opts)`, `app.landmarks()`, `app.lookThrough(id, { opacity, mode })`, `app.compare(id, name)` | Reference photos: add, the pinnable landmarks, look through the solved camera, photo / render / blend sheet |
| `app.pickColour(refId, [x, y])` | The photo's colour there (median of a 9 px square) |
| `app.pickStones(refId, { region: [x0, y0, x1, y1], size: 'ss8' \| 'auto', stone: name \| 'auto', threshold, minDist })` | Rhinestones picked off a solved photo: highlights detected and placed as single stones (on straps where they fall on one), one undo step; returns `{ found, placed, skipped }` |
| `app.matchColour({ panel, ref, px, layer })` | Set a panel's colour so its render matches the photo at that pixel under the current lights (needs a solved camera); returns `{ colour, photo, rendered, note? }`; `note` explains when the lights cannot reach the photo's colour or the pixel is not on the panel |
| `app.nearestOn(curveId, spec)`, `app.curveByName(name)` | Where a point falls on a line (for attaching); a line's id from its name |
| `app.pattern()`, `app.exportPattern(name)` | Pattern pieces (mm) and the tiled PDF in `app/exports/` |
| `app.benchmark(n, { width, height })`, `app.stats()`, `app.stoneStats()`, `app.debug.cells()` | Frame cost (gates at 1792x1344), timings, stone counts, cell colours |

# Point specs (anywhere a command takes a point)

`{ sp: { f, b: [b1, b2] } }` exact surface point; `{ p: [x, y, z] }` reference-body metres (y up,
+z front) to the closest point; `{ front: [x, y] }` / `{ back: [x, y] }` frontal-plane position on
the front or back of the torso; `{ lm: name, d: [dx, dy, dz] }` a rig joint (`shoulder_l`,
`waist`, ...) or a skin landmark (`navel`, `cf-neck`, `cb-waist`, `waist-l`, `bust-l`,
`underarm-l`, `hip-l`, ...; `app.landmarks()`); `{ curve: id, t }` a point along a line;
`{ mirror: spec }`; `{ photo: { ref, px: [x, y], part } }` the body under a pixel of a solved
reference photo. Control points accept `{ at: spec, kind: 'smooth' | 'corner', on: { curve, t,
mirror? } }` (attached ends follow their line).

# Commands (2026-10-19)

- Design: `meta.set`, `body.set { size: child|teen|young|adult (+ daz-petite|daz-young|daz-adult|daz-broad when [built locally](/engineering/pipeline/daz-bodies.md)), form: full|headless|torso, finish, pose }`
  (finishes include athlete skin tones; poses in [poses and shading](/engineering/app/poses-and-shading.md)), `scene.set { rig, exposure, bloom, envRotation,
  rotateLights, glare: plain|star|star6|arena }` (rigs include white and grey seamless photo studios and a gym).
- Garment: `block.apply { neck, back, sleeves, leg, armhole: set-in|raglan, fabric, colour, second }`;
  `curve.add { points, role: seam|edge|print|guide|strap-path|trim-path, closed, mirror, shape, layer }`;
  `curve.set`, `curve.points`, `curve.movePoint { id, i, to }`, `curve.insertPoint`,
  `curve.removePoint`, `curve.setKind`, `curve.remove`.
- Panels: `panel.set { id | at, fabric, colour, second, colour2, effect, sheer, grain, ombre,
  print, texture, texMode, texScale, masks, name, layer }`, `panel.cut`, `panel.restore`,
  `panel.add { at, ..., layer }`. See [studio and fabric looks](/engineering/app/studio-and-fabric-looks.md)
  for what the fabric fields do.
- Layers: `layer.add { kind: overlay|lining }`, `layer.remove`. A lining's panels show only where
  the shell has fabric.
- Edges and construction: `trim.set { on, kind: elastic|binding (edges) | piping|tape (seams) | none, fabric }`,
  `band.add { on, height, fabric, colour }`, `strap.add`, `strap.set`, `strap.remove`,
  `hardware.add { kind: clear-hook|hook-and-bar|zip-pull, at }`, `hardware.remove`.
- Logos, lettering and fold stamps: `decal.add { at, text | src, font, weight, size, aspect, rotate,
  colour, look: print|foil|holo|glitter|flock | gather|ruche|twist, layer }`, `decal.set`, `decal.remove`.
- Stones: `stones.add { kind: row|fill|scatter|rays|motif|lattice|cluster|fringe|lettering, on, at, params, stone |
  palette | colourRamp, shape, mirror }` (fringe: `{ lengths | random, min, max, spacing, sizeFrom, sizeTo,
  direction: down|away }`; lettering: `{ text, font, height, stoneSize, mode: fill|outline|both, angle }`), `stones.set`, `stones.remove`, `stones.erase`,
  `stone.place`, `stone.remove`, `stones.release`.
- Reference photos: `reference.add`, `reference.pin { id, lm, px }`, `reference.unpin`,
  `reference.solve`, `reference.set`, `reference.remove`.
- POC looks: `legacy.look`, `legacy.set`, `legacy.clear`. Raw: `doc.set`, `doc.insert`, `doc.remove`.

[^code]: App scripting source
[^test]: Recreation test conditions
