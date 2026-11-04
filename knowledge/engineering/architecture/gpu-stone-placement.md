---
type: Component
title: Stone patterns placed on the GPU
description: "Design and build plan for laying a stone pattern's stones on the GPU in both the 3D and flat views: candidates drawn on the CPU only when the drawing changes, everything a move or turn changes done per stone in a shader, and a CPU twin of the same rule for counts, picking and export."
tags: [stones, patterns, gpu, performance, webgl, design]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-04T15:30:00Z }
sources:
  - id: owner
    resource: /decisions/2026-11-04-stones-may-overlap.md
    title: Stones may overlap; the live preview is the design
  - id: spec
    resource: /engineering/architecture/procedural-stone-patterns.md
    title: Procedural stone patterns
  - id: code
    resource: "app/src/stones/pattern.js patternStones, app/src/stones/candidates.js, app/src/stones/view.js StoneView, app/src/stones/cloth.js ClothPiece, app/src/stones/fitted-cloth.js, app/src/render/fitted.js frameAt, app/src/ui/FlatStones.jsx paintStones"
    title: Stone pattern pipeline code
    author: claude-code/claude-opus-5-5
---

# Takeaway

With overlap allowed ([decision](/decisions/2026-11-04-stones-may-overlap.md)), each candidate stone is kept or not on its
own, so a pattern can be laid by the GPU. The CPU draws the pattern's candidates only when its drawing changes; a move,
turn or flip of the pattern, a density, and the body's pose cost the CPU nothing per stone. **[INFERRED]** design, built
in stages below.

# Where the time goes (measured 2026-11-04, Procedural Gem Test 3, ~17 800 stones, no clearance check)

A move step is ~39 ms in 3D, ~42 ms with the flat view: laying ~28 ms (layout drawing through the map, `piece.find`, the
surface point, fitted triangle and reference position per stone, ~3 objects a stone, mirroring by `mirrorFast`), then
`StoneView.build` writes an instance matrix per stone on the CPU, the flat view maps and uploads them again.

# What a move or turn changes, and what it does not

`patternMap` is frame (x, y, rotate, flip, scale S) after plane (px, py, pturn, pscale, sx, sy) after the distortion.
Split the frame's rigid part off: a candidate in **frame-local** coordinates `g = S * plane(bend(x, y))` lands on the
cloth at `(x, y) + R(rotate) (F g.x, g.y)` (F = -1 when flipped). Distances are kept, so:

- Lines walked on the cloth (`Candidates.step`, spacing `gap x` sizes) are the same walked in frame-local space.
- The modifiers' fields read `LX = g.x / S, LY = g.y / S` (stones/modifiers.js compileMods `at`): flip and turn drop out,
  so density, size and colour per candidate do not change under a move, turn or flip. **Except** a field of shape `edge`
  (distance to the piece's edge, `edgeAt(U, V)` on the cloth): that changes with the pattern's place.
- What changes: whether a candidate is on the piece, its room to the piece's edge (`edgeAt >= d/2 + margin`), the
  openings' keep-out, its place on the body, and its direction on the body.

A `flat` layout (drawn on the cloth against the piece, e.g. fields) has no rigid part: candidates are in cloth
coordinates and the transform is the identity.

# Pipeline

1. **Draw (CPU, cached).** `layout.make` into `Candidates` with the map minus the frame's rigid part, over a disc round
   the frame's origin that covers the piece (radius = farthest piece corner from the origin + the distortion's reach,
   rounded up to 5 cm so a move rarely redraws). Kept per group with a key of everything else (layout params, size,
   gap, S, plane, distortion, seed, size modifiers, jitter); the heavy layouts' `Drawing` replay stays.
2. **Per-candidate attributes (CPU, on a key change or a modifier/colour change).** Packed `Float32Array`s: frame-local
   `gx, gy`; direction `ga`; diameter `d` (size modifiers and `ditherSize` applied); `keep` = density modifiers x the
   scatter share `(d0 fine / d)^2`; `rank`; colour/finish index; `h` (the stone's own random). Groups with an `edge`
   field modifier recompute these every frame they move (no drawing: O(n) field evaluation).
3. **Per-piece textures (CPU raster, on a geometry change; GPU render, on a pose or re-fit):**
   - *Room*: signed distance to the piece's edge on the cloth (`ClothPiece.edgeAt` raster, negative off the piece by
     `find` at the nodes). Replaces `find` + `edgeAt` for the keep test.
   - *Keep-out*: distance to the openings minus each opening's keep (the trim's), and the raw distance (for a group's own
     `keepOut`), on the cloth at ~1.5 mm (today's `keepGrid` is 6 mm with an exact fallback).
   - *Atlas*: the piece's triangles drawn with their flat `uv` as position into float targets holding the posed position,
     normal and the body directions of flat +u, +v (from the triangle's Jacobian). A fitted garment's piece from the
     fitted points (`FittedView.shownP / shownN`); the drawn pieces' from `body.garmentPos` / `aGNormal`. A mirrored half
     (paired panel, `symmetric`, `mirror: both|only`) gets a second atlas: the other cell's triangles drawn at the seed
     piece's `uv` of their mirror points (per vertex once per geometry), coloured by their own posed positions.
4. **Keep test (GPU vertex shader, and its CPU twin).** For candidate i: cloth `(u, v)`; `rank < density x keep`;
   `room(u, v) >= d/2 + margin`; keep-out `>= d/2` where `room < 3 cm + keepOut`; `symmetric`: reference x >= 0 (atlas);
   `side`. A rejected instance collapses to a point (no fragments).
5. **Place (GPU vertex shader).** Position = atlas position + normal x (1.45 mm + lift + layer height); the stone's x axis
   = the body direction of `cos a (+u) + sin a (+v)` projected on the tangent plane (`a` = rotate + F-adjusted `ga` +
   stoneTurn, or `rotate` when upright); a round stone keeps its random spin `h pi` about the `(0, 1, 0) x n` basis as
   `StoneView.build`. Scale by `d` (and the shape's aspect). Same crystal material, `onBeforeCompile` adding the
   placement before `instanceMatrix` is read; a matching depth material for shadows.
6. **Flat view (GPU).** The same keep test in `ui/FlatStones.jsx`'s WebGL painter, positions from `(u, v)` through the
   piece's frame; no atlas.
7. **CPU twin (lazy).** The same keep test in JS over the same arrays and rasters (bilinear by hand on both sides, so
   they agree), run when counts, picking, hover, export or the stone list are asked for, and once a frame for the live
   count. Surface points (`find`, `spOf`, `fitOf`) only for the stones asked about. A test diffs the GPU's kept set
   (transform feedback readback) against the twin.

# What stays on the CPU path

Kinds other than `pattern`; groups with `erase` marks (until marks are uniforms); the legacy view. Scale, plane and the
layout's own grips redraw candidates on the CPU each step (stage 1's cost: about half of today's); a worker can take
that later.

# Stages

1. Done (2026-11-04): no clearance check; scatters spaced by the ranked tile. Commit e936592.
2. Done (2026-11-04): frame-local drawing, cached per group (`stones/pattern.js` rigidOf, patternCandidates). Drawn over
   the piece's box seen from the frame plus 2-4 cm (0.4 cm when the arrangement itself changed, heavy layouts always 2-4),
   reused while a move or turn stays inside. Gem Test 3 (~17 800 stones): move step 39 -> 23-27 ms (laying 28 -> 13-17),
   turn 25 ms, spacing drag unchanged (~37 ms). `isolines` floors its grid step on powers of two so a slightly bigger box
   draws the same lines.
3. Done (2026-11-04): `keepPattern` decides every candidate from two rasters (room: `ClothPiece.edgeAt`'s nodes signed
   by `find`; keep-out: K = edge(p) and B = edge(p, 0) at 2.5 mm, nodes off the piece placed on the nearest triangle
   carried on), packed arrays out, no body search. 2.1 ms for 17 700 candidates. `patternStones` builds records from it
   (find, or the nearest triangle for a stone the room raster keeps just past the last one). The keep set is now
   decided on the CPU only; the GPU will place, not decide (parity by construction).
4. Atlases and the 3D placement shader; StoneView draws pattern groups from them.
5. Flat view from the same arrays and rasters.
6. Diff test, measurements, owner check.
