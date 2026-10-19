---
type: Component
title: Pattern pieces and flattening
description: "How the app opens each cut cell into a flat pattern piece (slits along internal seams, automatic cuts for tubes), flattens it (cylinder unroll then ARAP with an envelope Cholesky solve), uses the result as cloth-space UVs and as the printable PDF pattern with ease and seam allowance."
tags: [app, geometry, flattening, pattern, component]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-19T08:00:00Z }
sources:
  - id: code
    resource: "app/src/garment/pieces.js, flatten.js, sparse.js, flattener.js, pattern.js, export/pdf.js (branch build/designer-app, 2026-10-19)"
    title: Flattening and pattern source
    author: claude-code/claude-opus-5-5
  - id: flatten
    resource: /engineering/geometry/pattern-flattening.md
    title: Pattern flattening
---

# Takeaway

Each panel cell becomes a pattern piece that is a topological disk, is flattened to near-isometric
UVs in metres, and those UVs drive both the fabric shader (weave, prints and scanned textures at
true scale, grain up the piece) and the printable pattern.[^code][^flatten]

# Pieces (`garment/pieces.js`)

- Constraint edges with the same cell on both sides are **slits** (an underarm seam opens a
  sleeve tube); edges inside a merged sliver are not.
- If boundary loops remain more than one (a band right round the body), the piece is cut along the
  shortest interior path between loops (Dijkstra) until one loop remains.
- Vertices are split per fan group across cut edges; the renderer and flattener share the piece,
  so UVs line up.

# Flattening (`garment/flatten.js`, `sparse.js`)

- **Why not LSCM alone**: on the front piece, CG on the LSCM normal equations with two pins did not
  converge (residual 1e-3 after 5,000 iterations) and conformal scale variation left about 30% mean
  stretch (protrusions such as the gusset shrink).
- **Start**: unroll about the best-fit cylinder of the piece's long axis (Kasa circle fit of the
  cross-section), else the best-fit plane.
- **Refine**: ARAP local/global, 30 iterations, cotangent Laplacian (clamped weights) plus a tiny
  diagonal, factored once by **envelope Cholesky with reverse Cuthill-McKee ordering**.
- Result on the default block: front 6.2% and back 6.7% area-weighted mean stretch, sleeves 8.4%;
  about 0.2 s per 4,600-vertex piece; inverted area under 0.2%.
- Rescaled to the 3D area, mirrored to face outwards, rotated so the body's vertical runs up +v.
- Runs in a Web Worker (`flatten.worker.js`), cached by a cell signature, so an edit only
  re-flattens the pieces it changed; panels draw tri-planar until their UVs arrive.

# Pattern (`garment/pattern.js`, `export/pdf.js`)

Outline = the piece's boundary in UV, scaled by negative ease (default -10% across, -5% along the
grain; `doc.meta.pattern` overrides), smoothed except at corners, simplified, then offset by the
seam allowance (default 6 mm) for the cut line. Mirrored panels print once as "Cut 2". The PDF tiles
A4 pages at 100% with a 50 mm check square, tile labels, cut (solid) and stitch (dashed) lines,
grain arrows and piece names (jsPDF). `app.exportPattern(name)` writes `app/exports/<name>.pdf`.

[^code]: Flattening and pattern source
[^flatten]: Pattern flattening
