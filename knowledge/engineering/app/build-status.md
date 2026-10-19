---
type: Roadmap
title: Designer app build status
description: "Where the build of the designer app stands against the roadmap phases P0-P8: what each phase delivered, measured numbers, known gaps, how to run and test, and what comes next. Updated at the end of every phase."
tags: [app, status, roadmap]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-19T08:00:00Z }
sources:
  - id: roadmap
    resource: /product/roadmap/moodboard-coverage-roadmap.md
    title: Moodboard coverage roadmap
  - id: owner
    resource: conversation with the product owner, 2026-10-19 (Claude Code session)
    title: "Go-ahead to implement the whole plan"
    author: human:mattj
  - id: build
    resource: "app/ on branch build/designer-app (commits from 2026-10-19)"
    title: Designer app source and tests
    author: claude-code/claude-opus-5-5
---

# Takeaway

The owner gave the go-ahead to implement the whole plan on 2026-10-19.[^owner] Work happens on
branch `build/designer-app` (pushed to GitHub); `main` only changes when the owner is happy.
**P0, P1 core, P2, P6 core and the stone system (P4-P5 core) are done** (curves cut real panels, pieces flatten, cloth-space textures,
finished edges, printable pattern).[^build]

# How to run and test

- Dev server: `npm --prefix app run dev` (port 5174; `.claude/launch.json` entry
  `leotard-designer`). The app autosaves to localStorage; designs save to `app/designs/`.
- Unit tests: `npm --prefix app test` (vitest; 24 tests: document/undo, arrangement on a sphere
  and on the body, block options, flattening). Debug scripts in `app/test/debug/` run with
  `DEBUG_TESTS=1 npx vitest run test/debug/<file>`.
- Scripting: `window.app` in the browser, see [scripting surface](/engineering/app/scripting-surface.md).
  `app.capture(name, { view })` writes `app/captures/<name>.png` at 1600x1200 even when the
  browser pane is hidden.

# Phase status

| Phase | State | Delivered |
|---|---|---|
| P0 Foundation | done | Document schema v1, path primitives with exact inverses, command bus, undo/redo with drag coalescing, autosave, save/open, UI shell (top bar, tool rail, inspector, outliner, history), renderer ported; POC looks load from JSON |
| P1 Curves, panels, flat piece | core done | Surface splines, attachments, mirror, blocks with real seams, [garment cutting](/engineering/app/garment-cutting.md), [pieces and flattening](/engineering/app/pattern-pieces-and-flattening.md), cloth-space shader, pen/select/fabric/cut tools, finished edges and bindings, scanned (VMOD) textures, flat pattern view, tiled PDF pattern |
| P2 Layers, straps, edges | done | Layers (shell, overlays at +0.9 mm per step, linings), straps as surface ribbons with profile, topstitch and contact shadow, bands (edge offset into the opening), piping along seams, hardware (clear hook, hook-and-bar, zip pull), strap and edges tools |
| P6 Photo tracing | core done | Body landmarks, reference photos with pins, camera solve (lens prior, body-proportion scale, TPS warp for residuals), look-through overlay, compare sheets (photo / render / blend), photo point specs for curves (`{ref, px}`), `nearestOn` attach helper. B5's back rebuilt by tracing |
| P4-P5 Stones | core done | Stone library (ss sizes, ~50 colours, coatings, cuts), generators (row, fill random/contour, scatter, rays, motif, lattice, cluster), single stones and eraser marks, mirror, keep-out of edges, release-to-singles, instanced crystal shader with per-stone finish, stone tools and live counts |
| P3, P7, P8 | not started | |

# Measured (GTX 1650, 2026-10-19)

- P0 frame cost equals the POC within run-to-run noise (both 7.3-10 ms in the same pane; today's
  machine was slower than the 6.1 ms of 2026-10-18).
- Re-cut of the full block after a line edit: arrangement 110-180 ms in node, ~0.5 s end to end
  in the browser (arrangement, panel inheritance, pieces, meshes); flattening runs in a worker.
- Flattening: front piece 4,650 vertices, 6% mean area-weighted stretch, 0.2 s.
- Stones: 21,000 stones render at 8.4 ms a frame at 1792x1344; generating them takes 1.45 s
  (big pavé fills), small row generators are instant.

# Known gaps (P1)

- Gate "re-cut under 150 ms after a drag" not met in the browser (about 0.5 s); next step is
  caching per-curve walks and moving the arrangement to a worker.
- No 2D front/back drawing chart or photo underlay yet (tracing will come with the P6 camera solve).
- No landmark snapping in the pen; necklines are one symmetric loop (edits on one side are not
  mirrored to the other).
- KTX2 compression of scanned textures not done (PNG downsampled to 2048 on load).
- Gate rebuilds of B2, B3, B7 panelling not yet run.

# Known gaps (P2, P4-P6)

- Photo tracing: the mannequin's arms are in one pose, so photos with arms down or hands on hips
  align on the torso only (poses come in P7). Stone pick-up from photos and colour pick not built.
- Stones: large fills regenerate in about 1.5 s; no level of detail; no star-filter glare preset;
  fringe/drops and lettering not built.

[^owner]: Product owner, 2026-10-19
[^build]: build/designer-app branch
