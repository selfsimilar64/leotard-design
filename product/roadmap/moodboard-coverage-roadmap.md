---
type: Roadmap
title: Roadmap - from POC to a tool that can build the whole moodboard
description: "Nine phases (P0-P8), each ending in a measurable gate, that take the three.js POC to a designer tool able to rebuild any moodboard leotard from a photo at 60 fps; with the benchmark set, the rehearsal protocol for the owner's recreation test and the frame budget per phase."
tags: [roadmap, plan, moodboard, designer, phases]
status: draft
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-18T19:00:00Z }
sources:
  - id: owner
    resource: conversation with the product owner, 2026-10-18 (Claude Code session)
    title: "Moodboard brief, plan request and recreation test"
    author: human:mattj
  - id: tools
    resource: /product/requirements/tool-space-for-moodboard.md
    title: Tool space needed to build every moodboard design
  - id: arch
    resource: /engineering/architecture/editor-architecture.md
    title: Editor architecture
  - id: doc
    resource: /engineering/architecture/design-document-model.md
    title: Design document model
  - id: render
    resource: /engineering/rendering/realism-upgrades-at-60fps.md
    title: Realism upgrades that fit in 60 fps
  - id: ux
    resource: /engineering/ux/frictionless-design-flow.md
    title: Frictionless design flow
  - id: taxonomy
    resource: /domain/moodboard/design-space-taxonomy.md
    title: Moodboard design-space taxonomy
  - id: first
    resource: /decisions/2026-10-15-designer-first-proven-by-patterns.md
    title: "Decision: designer first, proven by pattern output"
---

# Takeaway

**[INFERRED]** Build in this order: **document and commands → curves and panels → openings, straps
and trims → materials and studio realism → stone generators → motifs and crystal realism → photo
tracing and compare → poses → rehearsal.** Geometry comes first because every fabric, stone and
trim is anchored to panels and curves; photo tracing comes late in full but a simple photo underlay
arrives with the 2D flat view in P1, so benchmark designs can be traced from the start. Each phase
ends in a gate measured against the [benchmark set](#benchmark-set) drawn from the moodboard, at
14 ms/frame or less on the owner's GTX 1650.[^owner][^render] The owner will judge the finished tool
by handing over one photographed leotard to rebuild with the app's own tools.[^owner]

Specifications the phases implement: [tool space](/product/requirements/tool-space-for-moodboard.md),[^tools]
[document model](/engineering/architecture/design-document-model.md),[^doc]
[editor architecture](/engineering/architecture/editor-architecture.md),[^arch]
[design flow](/engineering/ux/frictionless-design-flow.md),[^ux]
[realism upgrades](/engineering/rendering/realism-upgrades-at-60fps.md).[^render]

# Benchmark set

Thirteen moodboard designs chosen so that together they touch every axis of the
[taxonomy](/domain/moodboard/design-space-taxonomy.md), favouring sharp images and front/back
sets.[^taxonomy] Every gate below names which of them it rebuilds. **[INFERRED]** selection.

| # | Design (files in `moodboard/`) | What it exercises |
|---|---|---|
| B1 | `DAPHNE_FRONT.jpg` + `DAPHNE_BACK.jpg` | Overlapping lace wrap pieces, crossed bound edges becoming straps over side cut-outs, V shield panel, bow line-art motif with a dark→light→clear stone ramp, printed signature logo |
| B2 | `Anika-Leotard-Light-01_...jpg` | Raglan, mock neck, ombre print, crossover X bands with mesh triangles, rays with size and spacing ramps, best-resolution crystal facets |
| B3 | `N3_DSC1064.jpg` | Tone-on-tone mesh and opaque panels, S-curve mesh band, multi-row seam outlines, uniform scatter, cuff stripe rows, real-room lighting |
| B4 | `TREILLE_20OCEAN_20Front.jpg` + `TREILLE_OCEAN_BACK.jpg` | Mesh shell over a visible lining shape, invisible zip, trellis lattice with node motifs, fringe drops, sleeve gradient |
| B5 | `Nejahkaki_10.png` | Open strap-network back (Y spine, V straps, bridge band), stones inline on straps, liquid metallic foil, chevron band |
| B6 | `Sparkle_DreamTurnpakjeEllaZwartLangeMouw-Mystic.png` + `..._4203a97d-....png` | Six-strap fan over an open U and mesh, clear clasp, lotus line-art motif in mixed colours, wet look |
| B7 | `Screenshot 2026-06-07 104228.png` | Full asymmetry (diagonal mesh wedge, one mesh and one opaque sleeve), double-row borders, cuff density band, star-filter glare |
| B8 | `Screenshot 2026-06-27 205248.png` + `205412.png` | Liquid/opal hologram, tombstone keyhole with a ladder of filled cells, red stone rows on straps, mirrored filigree |
| B9 | `Screenshot 2026-06-05 113858.png` + `113907.png` | Mesh yoke into the sleeve caps, crystal rain, AB → sapphire colour ramp by distance, wrap-round to the back |
| B10 | `14a709479b4f93e8e2ebad6a451f4f7a.jpg` | ~4,000 stones, contour fill coloured by depth, jet on ultra-matte black, deep mesh plunge |
| B11 | `Screenshot_20260711_115458_Instagram.jpg` | Converging fan of rows, royal mystique in an indoor environment, hands-on-hips pose |
| B12 | `It-Was-All-A-Dream-Leotard-01/02/03.jpg` | Printed lace over hologram mesh, holographic spangle gradient band, mock neck, print logo |
| B13 | `IMG_4141.PNG` | Midriff arch cut-out (bodice joined to the brief only at the sides), vesica mesh insert, diagonal ombre, child body, gym lighting |

# Phases

Size: S ≈ a few sessions, M ≈ a week of sessions, L ≈ two or more. P3, P4 and P6 can run in
parallel once P1 lands (different modules, shared document).

## P0 - Foundation (M)

- New `app/` Vite project beside the frozen `poc-threejs/`; port renderer, bodies, lift, fabric and
  stone shaders as modules ([editor architecture](/engineering/architecture/editor-architecture.md)).
- Document schema v1, load/save JSON, autosave, command bus, undo/redo, `app.exec`, `app.doc`.
- UI shell (Preact): viewport, tool rail, inspector, outliner, history, top bar; lil-gui retired.
- Test setup: vitest for pure modules; a screenshot harness that renders a document at named
  cameras in the browser pane and stores PNGs; the POC benchmark kept as `app.benchmark()`.
- **Gate:** the six POC looks load from JSON and render indistinguishably from the POC; every command
  undoes and redoes; frame cost within 0.5 ms of the POC.

## P1 - Curves, panels and the flat piece (L)

- BVH picking; surface splines with corner/smooth points; shape modifiers; offsets; landmark and
  curve snapping; mirror map; 2D front/back flat view synced with 3D; reference photo underlay in
  the flat view (4-point affine alignment).
- Arrangement by curve insertion, cell labelling, panel meshes, per-panel LSCM UVs; fabric shader
  moved from tri-planar to cloth-space UVs with per-panel grain; one draw per panel.
- Texture import (owner's scanned fabrics, e.g. VMOD): Blender-package extraction, PBR map sets at a
  stated real-world size, KTX2 compression, texture slots in the fabric material; first three
  owner samples (lace, glitter, foil) shown on panels
  ([pipeline](/engineering/rendering/fabric-shading/texture-import-pipeline.md)).
- Lift warm start; POC rims re-hosted on edge curves.
- Block library (tank, cap, 3/4, long; crew, scoop, V, mock, high neck; standard/high leg; closed,
  scoop, V, keyhole backs).
- Flat-piece view per panel and a printable full-scale PDF of the pieces (first-release proof).[^first]
- **Gate:** panelling (no stones) of B2, B3 and B7 rebuilt by tracing; panels re-cut under
  150 ms after a drag; unit tests for arrangement (synthetic loops, intersections, near-vertex
  crossings), mirror symmetry and flattening distortion.

## P2 - Openings, straps, trims and bands (M)

- Cut-out tool; strap tool (draw edge-to-edge or to junctions, width, fabric, binding, layer order,
  ribbons with contact AO; floating over an opening then applied on fabric); contrast binding,
  piping and bands over seams; mock-neck, stand and cuff bands; hardware (clear hook, hook-and-bar,
  invisible zip).
- Layers (T13): overlay pieces and lining shapes as their own arrangements at their own offsets.
- **Gate:** the backs and layers of B1, B5, B6, B8 and B13 rebuilt; trims follow curve edits.

## P3 - Materials and studio realism (M)

- Fabric library as base cloth x finish x colours, covering the taxonomy's fabric axis (including
  duochrome, oil-slick and glitter-grain foils, liquid/opal hologram, crushed velvet, mirror chrome);
  foil-print masks; colourway swap; swatch previews in the fabric picker (a rippled or
  pinched-and-twisted cloth shape made once in Blender, rendered to cached thumbnails per fabric and
  colour, slowly turning on hover so sparkle and colour shift show); iridescence variation maps for
  oil-slick/opal fabrics, tuned by eye against the source's preview; lining stacks; mesh over skin/lining in one shader; lace,
  printed lace, flocked/foil mesh, sublimation prints, ombre along any curve; decals (logo,
  lettering) as print/foil/embroidery looks; seams in the shader.
- Photo-studio rigs with area lights and matching environment; athlete skin display.
  (Upgrades R1, R5-R8.)
- **Gate:** fabrics of B4, B8 and B12 side by side with their photos, reviewed by the owner;
  frame cost ≤ 14 ms.

## P4 - Stone generators I (M)

- Stone library (cut, size, shape incl. navette/pear/oval/bugle, colour = glass + backing +
  coating, spangle, flat holo dot, pearl); one instanced draw
  with per-instance finish; dirty-range updates; ID-buffer picking.
- Generators: single, eraser, row(s) along a curve with graded sizes, outline, region fill,
  gradient scatter between curves or edges, cluster; keep-outs, overlap solve, live counts and cost
  tier; release to stones.
- **Gate:** stone layouts of B3, B7 and B9 rebuilt; B10's ~4,000 stones and a 20,000-stone stress
  test at ≤ 14 ms; a seam drag re-flows bound rows within one frame of release.

## P5 - Motifs and crystal realism (M)

- Generators: lattice/trellis/seigaiha with node motifs, rays and fans with ramps, curtain between
  two curves, rain and chandelier drops, contour fill coloured by depth, motif from SVG or the
  ornament library (stroke-to-stones and fill), lettering from fonts, fringe/drops, comet brush with
  flow-aligned shaped stones, burst; guides from print outlines; colour and size ramps; mirror.
- Crystal studio read, per-cut lobes, LOD impostors; glare presets (star filter).
  (Upgrades R2, R3.)
- **Gate:** stone work of B1, B2, B4, B6, B10 and B11 rebuilt; glare preset matches each benchmark
  photo's flare.

## P6 - Reference tracing and compare (M)

- Photo import; 6-8 landmark pins; camera solve (DLT initialisation + Levenberg-Marquardt on focal
  length and pose); thin-plate warp for body-shape mismatch; trace curves straight over the photo;
  colour pick corrected for the matched lighting; stone pick-up (bright-blob detection in a chosen
  area, projected to the body as candidate stones to accept or clean up).
- Compare views (side by side, wipe, onion skin) at the solved camera; idle refinement for stills
  (R10); benchmark harness that rebuilds every benchmark document and writes compare sheets.
- **Gate:** traced lines within 5 mm of the photo at the solved camera on all benchmarks.

## P7 - Body, pose and realism II (M)

- Poses from the MakeHuman rig through the pipeline (arms down, A-pose, hands on hips, one arm
  raised), CPU skinning per pose, stones and curves following by surface address; athlete
  proportions; baked AO per pose, GTAO, one soft shadow, tension wrinkles, dynamic resolution
  (R4, R9, R11); surface detail stamps (T14: ruching, gathers to a knot, twist-knot, emboss).
- **Gate:** every benchmark rendered in its photo's pose at 60 fps.

## P8 - Rehearsal and hardening (M)

- Rebuild every benchmark end to end from its photo using only the app's tools, following the
  [rehearsal protocol](#rehearsal-protocol); the owner scores each against the photo; fix the gaps.
- Coverage audit: every feature of all 138 moodboard images mapped to a tool, none unmapped.
- **Gate:** owner sign-off; then the recreation test.

# Rehearsal protocol

The same steps are used for the owner's test.[^owner] **[INFERRED]**

1. Import the front and back photos (the owner's test supplies both); pin landmarks and solve a
   camera for each; choose body size and pose to match. The test may use the mannequin (owner,
   2026-10-18); use a skin-tone finish so mesh panels read as they do over skin.
2. Pick the nearest block; trace edges, seams and print lines; mirror unless asymmetric.
3. Assign fabric stacks; pick colours from the photo; set prints and lace.
4. Cut-outs, straps, trims, bands.
5. Stones zone by zone: rows on seams first, then fills and scatters, then motifs; use stone
   pick-up only as a starting point, then match counts and sizes by eye.
6. Match the photo's lighting rig, exposure and glare preset.
7. Compare at the solved camera; iterate at least three rounds on the largest visible differences;
   deliver renders at the photo camera plus front, back and side, and the design file.

[^owner]: Product owner, 2026-10-18
[^tools]: Tool space requirement
[^doc]: Design document model
[^arch]: Editor architecture
[^render]: Realism upgrades at 60 fps
[^ux]: Frictionless design flow
[^taxonomy]: Moodboard taxonomy
[^first]: Decision, designer first proven by patterns
