---
type: Component
title: Scripting surface (window.app)
description: "The designer app's command API, window.app: every designer action as an undoable command (app.exec), point specs for naming places on the body, saving and capturing; the surface an agent uses to rebuild a photographed leotard with the designer's own tools."
tags: [app, api, commands, component, recreation-test]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-19T08:00:00Z }
sources:
  - id: code
    resource: "app/src/app.js, doc/store.js, doc/commands-core.js, doc/commands-garment.js, curves/points.js (branch build/designer-app, 2026-10-19)"
    title: App scripting source
    author: claude-code/claude-opus-5-5
  - id: test
    resource: /decisions/2026-10-18-moodboard-is-the-acceptance-set.md
    title: "Decision: the moodboard is the acceptance set (test conditions)"
---

# Takeaway

Everything a designer can do is a command, so the owner's recreation test can be driven through
`window.app` with exactly the designer's tools.[^test] `app.commands()` lists every command and
its arguments at runtime; this concept is the guide.[^code]

# Calls

| Call | Does |
|---|---|
| `app.exec(cmd)` / `app.exec([cmd, ...])` | Run one command, or a list as one undo step; returns the command's result (new ids). Throws with a readable message and changes nothing on bad input. |
| `app.undo()`, `app.redo()`, `app.history()` | History |
| `app.doc` | The design (read only; change it with commands) |
| `app.save(name)`, `app.open(name)`, `app.designs()`, `app.new()` | `app/designs/<name>.json` |
| `app.view('front' \| 'back' \| 'left' \| 'right' \| 'three-quarter' \| 'back-three-quarter' \| { position, target, fov })` | Camera |
| `app.capture(name, { view, width, height })` | PNG to `app/captures/` |
| `app.pattern()`, `app.exportPattern(name)` | Pattern pieces (mm) and the tiled PDF in `app/exports/` |
| `app.benchmark()`, `app.stats()`, `app.debug.cells()` | Frame cost, timings, cell colours |

# Point specs (anywhere a command takes a point)

`{ sp: { f, b: [b1, b2] } }` exact surface point; `{ p: [x, y, z] }` reference-body metres (y up,
+z front) to the closest point; `{ front: [x, y] }` / `{ back: [x, y] }` frontal-plane position on
the front or back of the torso; `{ lm: 'shoulder_l', d: [dx, dy, dz] }` rig landmark; `{ curve: id,
t }` a point along a line; `{ mirror: spec }`. Control points accept `{ at: spec, kind:
'smooth' | 'corner', on: { curve, t, mirror? } }` (attached ends follow their line).

# Commands (2026-10-19)

- Design: `meta.set`, `body.set { size, form, finish, pose }`, `scene.set { rig, exposure, bloom, envRotation, rotateLights }`.
- Garment: `block.apply { neck, back, sleeves, leg, fabric, colour, second }`;
  `curve.add { points, role: seam|edge|print|guide|strap-path|trim-path, closed, mirror: none|both, shape }`;
  `curve.set`, `curve.points`, `curve.movePoint { id, i, to }`, `curve.insertPoint`,
  `curve.removePoint`, `curve.setKind`, `curve.remove`.
- Panels: `panel.set { id | at, fabric, colour, second, grain, texture, texMode, texScale, masks, name }`,
  `panel.cut`, `panel.restore`, `panel.add { at, ... }`.
- Edges: `trim.set { on: curveId(s), kind: elastic|binding|none, fabric }`.
- POC looks: `legacy.look`, `legacy.set`, `legacy.clear`. Raw: `doc.set`, `doc.insert`, `doc.remove`.

[^code]: App scripting source
[^test]: Recreation test conditions
